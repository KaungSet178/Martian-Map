"""Bounded independent audit of the actual global TIFF and cached Gale subset.

Reads 1 MiB of header prefix plus three 358-byte native row segments; no full
global DEM download. Default replay is offline and SHA-pinned.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
import json
from pathlib import Path
import sys

import numpy as np
import rasterio
from rasterio.io import MemoryFile
import requests

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/gale-basemap'))
from audit import Tiff, validate_response

URL = 'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/HRSC_MOLA_Blend/Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif'
CACHE = ROOT / 'output/integration-science/global-ranges'
REPORT = ROOT / 'team/gale/sources/integration/global-source-check.json'


def main(download=False, repair_subset=False):
    CACHE.mkdir(parents=True, exist_ok=True)
    identity_path = CACHE / 'identity.json'
    identity = json.loads(identity_path.read_text()) if identity_path.exists() else {}
    def read(start, size):
        if size > 65536:
            raise ValueError('Unbounded range refused')
        path = CACHE / f'{start}-{size}.bin'
        receipt = path.with_suffix('.json')
        if path.exists() and receipt.exists():
            data = path.read_bytes()
            if len(data) != size or sha256(data).hexdigest() != json.loads(receipt.read_text())['sha256']:
                raise ValueError('Cached source bytes changed')
            return data
        if not download:
            raise ValueError('Missing pinned range; rerun with --download')
        headers = {'Range': f'bytes={start}-{start+size-1}', 'Accept-Encoding': 'identity'}
        if identity:
            headers['If-Match'] = identity['etag']
        for attempt in range(3):
            try:
                with requests.get(URL, headers=headers, stream=True, timeout=(15, 45)) as response:
                    total = validate_response(response, start, size, identity.get('total'), identity.get('etag'))
                    if int(response.headers.get('Content-Length', -1)) != size:
                        raise ValueError('Unexpected range length')
                    if not identity:
                        identity.update({'url': URL, 'total': total, 'etag': response.headers['ETag'], 'last_modified': response.headers.get('Last-Modified')})
                        identity_path.write_text(json.dumps(identity, indent=2)+'\n')
                    data = response.raw.read(size)
                    if len(data) != size:
                        raise ValueError('Truncated source range')
                path.write_bytes(data)
                receipt.write_text(json.dumps({'start': start, 'length': size, 'sha256': sha256(data).hexdigest()})+'\n')
                return data
            except (requests.RequestException, OSError):
                if attempt == 2:
                    raise
    # Pin the object before parallel independent reads.
    read(0, 65536)
    with ThreadPoolExecutor(max_workers=8) as pool:
        chunks = list(pool.map(lambda offset: read(offset, 65536), range(0, 1024**2, 65536)))
    prefix = b''.join(chunks)
    class Header:
        def read(self, offset, size):
            if offset+size > len(prefix):
                raise ValueError('TIFF metadata outside bounded prefix')
            return prefix[offset:offset+size]
    tiff = Tiff(Header())
    tags = tiff.ifds[0]
    if tags[259] != [1] or tags[258] != [16] or tags[339] != [2] or tags[278] != [1]:
        raise ValueError('Unreviewed global source encoding')
    with MemoryFile(prefix) as memory, memory.open() as original, rasterio.open(ROOT/'output/g4/raw/usgs_hrsc_mola_200m_gale.tif') as subset:
        import pyproj
        crs = pyproj.CRS.from_wkt(original.crs.to_wkt())
        if not crs.is_geographic or crs.ellipsoid.semi_major_metre != 3396190 or crs.ellipsoid.semi_minor_metre != 3396190:
            raise ValueError('Unexpected global planetary CRS')
        if original.nodata != subset.nodata or original.dtypes != subset.dtypes:
            raise ValueError('Subset type/NoData differs from original')
        # Preserve G4's documented integer extraction window and DN values.
        # Its old metadata used 360/width instead of the actual TIFF affine.
        legacy_step = 360/original.width
        col0, row0 = int(np.floor((137.1+180)/legacy_step)), int(np.floor((90+4.3)/legacy_step))
        corrected = original.transform * rasterio.Affine.translation(col0, row0)
        legacy = rasterio.Affine(legacy_step, 0, -180+col0*legacy_step, 0, -legacy_step, 90-row0*legacy_step)
        if not np.allclose(list(subset.transform)[:6], list(corrected)[:6], rtol=0, atol=1e-12):
            np.testing.assert_allclose(list(subset.transform)[:6], list(legacy)[:6], rtol=0, atol=1e-12)
            if not repair_subset:
                raise ValueError('Legacy affine is incorrect; --repair-subset restores actual source metadata after DN verification')
        original_dn_hash = sha256(subset.read(1).tobytes()).hexdigest()
        samples = []
        for local_row in [0, subset.height//2, subset.height-1]:
            row = row0+local_row
            start = tags[273][row] + col0*2
            data = read(start, subset.width*2)
            values = np.frombuffer(data, dtype=tiff.order+'i2')
            np.testing.assert_array_equal(values, subset.read(1, window=((local_row, local_row+1), (0, subset.width)))[0])
            samples.append({'subset_row': local_row, 'original_row': row, 'native_values_compared': subset.width, 'range_sha256': sha256(data).hexdigest()})
        report = {'source': identity, 'header_sha256': sha256(prefix).hexdigest(), 'source_crs_wkt': original.crs.to_wkt(),
                  'source_affine': list(original.transform)[:6], 'source_shape': list(original.shape), 'source_nodata': original.nodata,
                  'source_dtype': list(original.dtypes), 'subset_col_row': [col0, row0], 'samples': samples,
                  'legacy_subset_affine': list(legacy)[:6], 'corrected_subset_affine': list(corrected)[:6],
                  'subset_native_dn_sha256': original_dn_hash,
                  'correction_reason': 'Restore the original TIFF affine for the documented integer source window; no feature fit, image translation or source DN changes.',
                  'unique_range_bytes': 1024**2+sum(s['native_values_compared']*2 for s in samples),
                  'interpretation': 'Original-file encoding, affine and sampled DN correspondence verified; not independent optical co-registration or positional accuracy.'}
    subset_path = ROOT/'output/g4/raw/usgs_hrsc_mola_200m_gale.tif'
    if repair_subset:
        with rasterio.open(subset_path, 'r+') as subset:
            subset.transform = corrected
    with rasterio.open(subset_path) as subset:
        np.testing.assert_allclose(list(subset.transform)[:6], list(corrected)[:6], rtol=0, atol=1e-12)
        if sha256(subset.read(1).tobytes()).hexdigest() != original_dn_hash:
            raise ValueError('Native DN values changed during metadata repair')
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--download', action='store_true')
    parser.add_argument('--repair-subset', action='store_true')
    args = parser.parse_args()
    main(args.download, args.repair_subset)
