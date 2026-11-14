"""Verify all Gale public assets by HTTP and both G4/G5 published tile receipts."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
import json
from pathlib import Path
import threading
import math
import numpy as np
from PIL import Image
import requests

ROOT = Path(__file__).resolve().parents[1]


def alpha_coverage(folder, zoom, bounds):
    west,south,east,north=bounds
    total=math.radians(east-west)*(math.sin(math.radians(north))-math.sin(math.radians(south)))
    covered=0.
    scale=256*2**zoom
    for path in (folder/str(zoom)).glob('*/*'):
        x,y=int(path.parent.name),int(path.stem)
        lon=(x*256+np.arange(257))/scale*360-180
        lat=np.degrees(np.arctan(np.sinh(math.pi*(1-2*(y*256+np.arange(257))/scale))))
        wx=np.radians(np.maximum(0,np.minimum(lon[1:],east)-np.maximum(lon[:-1],west)))
        top,bottom=np.minimum(lat[:-1],north),np.maximum(lat[1:],south)
        wy=np.where(top>bottom,np.sin(np.radians(top))-np.sin(np.radians(bottom)),0)
        if not wx.any() or not wy.any():
            continue
        alpha=np.array(Image.open(path).convert('RGBA'))[...,3]/255.
        covered+=float(wy @ alpha @ wx)
    result=covered/total*100
    return 100. if abs(result-100)<1e-8 else result


def main(base_url):
    if not base_url.startswith('http://127.0.0.1:'):
        raise ValueError('Expected isolated local production server')
    g4 = json.loads((ROOT/'team/gale/G4_TERRAIN_AUDIT.json').read_text())
    g5 = json.loads((ROOT/'public/maps/gale/usgs-color/manifest.json').read_text())
    expected = {}
    for key in ['regional_hrsc_30m', 'global_usgs_200m']:
        expected.update({path: record['sha256'] for path, record in g4[key]['tiles'].items()})
    expected.update({'public/maps/gale/usgs-color/'+path: digest for path, digest in g5['tile_sha256'].items()})
    all_files = sorted(path for folder in ['public/maps/gale','public/photos/gale'] for path in (ROOT/folder).rglob('*') if path.is_file())
    # Next intentionally refuses dotfiles; .gitattributes is Git control data,
    # not a referenced runtime asset.
    files = [path for path in all_files if not any(part.startswith('.') for part in path.relative_to(ROOT/'public').parts)]
    workers = threading.local()
    def check(path):
        relative = path.relative_to(ROOT).as_posix()
        data = path.read_bytes()
        digest = sha256(data).hexdigest()
        if relative in expected and digest != expected[relative]:
            raise ValueError('Published hash mismatch: '+relative)
        if not hasattr(workers, 'session'):
            workers.session = requests.Session()
        response = workers.session.get(base_url+'/'+relative.removeprefix('public/'), timeout=20)
        if response.status_code != 200 or sha256(response.content).hexdigest() != digest:
            raise ValueError('HTTP bytes/status mismatch: '+relative)
        return relative, digest, len(data)
    with ThreadPoolExecutor(max_workers=8) as pool:
        receipts = list(pool.map(check, files))
    if not set(expected).issubset(path for path, _, _ in receipts):
        raise ValueError('Missing published tiles')
    bounds=g5['bounds_wsen']
    coverage={f'{source}/{kind}':alpha_coverage(ROOT/f'public/maps/gale/{source}/{kind}',13,bounds)
              for source in ['terrain-regional','terrain-global'] for kind in ['elevation','hillshade','slope']}
    coverage['usgs-color']=alpha_coverage(ROOT/'public/maps/gale/usgs-color',15,bounds)
    report = {'http_origin': base_url, 'http_verified_files': len(receipts), 'http_verified_bytes': sum(size for _, _, size in receipts),
              'g4_tiles': sum(g4[key]['tile_count'] for key in ['regional_hrsc_30m', 'global_usgs_200m']),
              'g4_tile_bytes': sum(g4[key]['tile_bytes'] for key in ['regional_hrsc_30m', 'global_usgs_200m']),
              'g5_tiles': g5['tile_count'], 'g5_tile_bytes': g5['tile_bytes'],
              'sorted_path_sha256_size_receipts_digest': sha256(json.dumps(receipts, separators=(',', ':')).encode()).hexdigest(),
              'non_runtime_git_control_files': [path.relative_to(ROOT).as_posix() for path in all_files if path not in files],
              'finest_prepared_tile_alpha_coverage_overview_pct': coverage,
              'alpha_metric': 'Exact spherical-area overlap of tile alpha cell footprints with overview; finest prepared levels, before GPU resampling. Color clips destination centers, so boundary quantization may leave fractional edge slivers despite 100% native source-mask validity.',
              'failures': [], 'runtime_uses_ignored_source_cache': False}
    destination = ROOT/'team/gale/sources/integration/runtime-assets.json'
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:3124')
    main(parser.parse_args().base_url)
