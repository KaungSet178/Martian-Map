"""Bounded USGS processed-color display pyramid; no registration correction.

Only source-authored factor-8 and coarser overviews are downloaded (under 16 MiB).
The native source and mask remain audited by audit.py. Offline replay is default.
"""
import argparse
from hashlib import sha256
from io import BytesIO
import json
import math
from pathlib import Path
import time

import numpy as np
from PIL import Image
import rasterio
from rasterio.io import MemoryFile
from scipy.sparse import csr_matrix
from urllib3.exceptions import HTTPError

import audit

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT = ROOT / "team/gale/sources/g5/audit.json"
DEST = ROOT / "public/maps/gale/usgs-color"
MIN_ZOOM, MAX_ZOOM, SIZE = 5, 15, 256


def tile_edges(z, x, y):
    """Inverse of the reviewed XYZ angular display encoding, pixel EDGES."""
    scale = SIZE * 2**z
    lon = (x*SIZE + np.arange(SIZE+1))/scale*360 - 180
    lat = np.degrees(np.arctan(np.sinh(math.pi*(1-2*(y*SIZE+np.arange(SIZE+1))/scale))))
    return lon, lat


def source_edges(transform, z, x, y):
    lon, lat = tile_edges(z, x, y)
    a, b, c, d, e, f = transform
    if b != 0 or d != 0 or a <= 0 or e >= 0:
        raise ValueError("Unsupported source affine")
    return (audit.RADIUS*np.radians(lon)-c)/a, (audit.RADIUS*np.radians(lat)-f)/e


def tile_centers(z, x, y):
    scale = SIZE * 2**z
    lon = (x*SIZE + np.arange(SIZE)+.5)/scale*360 - 180
    lat = np.degrees(np.arctan(np.sinh(math.pi*(1-2*(y*SIZE+np.arange(SIZE)+.5)/scale))))
    return lon, lat


def tiles_for_bounds(z, bounds):
    west, south, east, north = bounds
    n = 2**z
    def tx(lon):
        return (lon+180)/360*n
    def ty(lat):
        return (1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*n
    for x in range(math.floor(tx(west)), math.ceil(tx(east))):
        for y in range(math.floor(ty(north)), math.ceil(ty(south))):
            yield x, y


def weights(edges, length):
    """Exact source-cell overlap weights, including fractional source edges."""
    rows, cols, values = [], [], []
    for row, (left, right) in enumerate(zip(edges[:-1], edges[1:])):
        if right <= left:
            raise ValueError("Non-increasing source pixel edges")
        cells = np.arange(max(0, math.floor(left)), min(length, math.ceil(right)))
        overlap = np.maximum(0, np.minimum(cells+1, right)-np.maximum(cells, left))
        rows.extend([row]*len(cells))
        cols.extend(cells)
        values.extend(overlap/(right-left))
    return csr_matrix((values, (rows, cols)), shape=(len(edges)-1, length))


def resample(rgb, mask, columns, rows):
    """Area average genuine valid overview support; never use black as NoData."""
    wx, wy = weights(columns, rgb.shape[1]), weights(rows, rgb.shape[0])
    valid = mask.astype(np.float64)/255
    coverage = (wy @ valid) @ wx.T
    result = np.zeros((len(rows)-1, len(columns)-1, 4), dtype=np.uint8)
    for band in range(3):
        total = (wy @ (rgb[..., band]*valid)) @ wx.T
        result[..., band] = np.clip(np.rint(np.divide(total, coverage, out=np.zeros_like(total), where=coverage > 0)), 0, 255)
    result[..., 3] = np.clip(np.rint(coverage*255), 0, 255)
    return result


def encode_tile(rgba):
    out = BytesIO()
    # Lossless avoids adding another generation of JPEG losses to the source.
    Image.fromarray(rgba).save(out, format="WEBP", lossless=True, method=6, exact=True)
    return out.getvalue()


def load_overview(download=False):
    snapshot = json.loads(SNAPSHOT.read_text())
    meta = snapshot["sources"]["color"]
    audit.check_crs(meta["crs_wkt"])
    source = audit.Ranges("color", download, audit.Budget(32*1024**2))
    tiff = audit.Tiff(source)
    observed = tiff.metadata()
    if any(observed[k] != meta[k] for k in ("width", "height", "bands", "transform", "crs_wkt")):
        raise ValueError("Source metadata differs from reviewed audit")
    image = tiff.ifds[4]
    mask = tiff.ifds[12]
    if image[256] != [4500] or image[257] != [9500] or image[258] != [8, 8, 8] or mask[254] != [5]:
        raise ValueError("Unsupported source overview layout")
    # Reconstruct ONLY the source prefix containing factor-8 and coarser data.
    # Rasterio is explicitly opened at overview 2, never the native image.
    start = min(min(t[324]) for t in tiff.ifds[4:10] + tiff.ifds[12:])
    end = max(o+n for t in (image, mask) for o, n in zip(t[324], t[325]))
    if end > 16*1024**2:
        raise ValueError("Source prefix exceeds 16 MiB footprint budget")
    prefix = bytearray(end)
    for offset, data in source.segments:
        prefix[offset:offset+len(data)] = data
    chunks = [(offset, min(256*1024, end-offset)) for offset in range(start, end, 256*1024)]
    # Persist each small batch before the next. Interrupted downloads resume
    # from authenticated receipts rather than discarding out-of-order work.
    for first in range(0, len(chunks), 4):
        for attempt in range(3):
            try:
                payloads = source.read_many(chunks[first:first+4])
                break
            except (audit.requests.RequestException, HTTPError, OSError) as error:
                if attempt == 2:
                    raise
                print(f"Retrying bounded batch {first}: {type(error).__name__}", flush=True)
        for offset, data in payloads.items():
            prefix[offset:offset+len(data)] = data
        print(f"Overview ranges: {min(first+4, len(chunks))}/{len(chunks)}", flush=True)
    with MemoryFile(bytes(prefix)) as memory, memory.open(overview_level=2) as ds:
        if (ds.width, ds.height, ds.count) != (4500, 9500, 3):
            raise ValueError("Wrong source overview selected")
        rgb = ds.read().transpose(1, 2, 0)
        validity = ds.dataset_mask()
        transform = list(ds.transform)[:6]
    return rgb, validity, transform, source, snapshot


def generate(download=False, destination=DEST):
    began = time.perf_counter()
    rgb, mask, transform, source, snapshot = load_overview(download)
    bounds = snapshot["bounds_wsen"]
    # Check AOI against the actual source-specific grid, not just mask percent.
    window = audit.fractional_window(transform, bounds)
    if min(window[:2]) < 0 or window[2] > rgb.shape[1] or window[3] > rgb.shape[0]:
        raise ValueError("Requested footprint outside source")
    receipts = {}
    count, total = 0, 0
    for z in range(MIN_ZOOM, MAX_ZOOM+1):
        for x, y in tiles_for_bounds(z, bounds):
            columns, rows = source_edges(transform, z, x, y)
            # Only read the bounded source support needed by this tile.
            x0, x1 = max(0, math.floor(columns[0])), min(rgb.shape[1], math.ceil(columns[-1]))
            y0, y1 = max(0, math.floor(rows[0])), min(rgb.shape[0], math.ceil(rows[-1]))
            rgba = resample(rgb[y0:y1, x0:x1], mask[y0:y1, x0:x1], columns-x0, rows-y0)
            # Clip at the SAME overview, evaluating destination pixel centers.
            lc, bc = tile_centers(z, x, y)
            inside = ((bc >= bounds[1]) & (bc <= bounds[3]))[:, None] & ((lc >= bounds[0]) & (lc <= bounds[2]))[None, :]
            rgba[~inside] = 0
            data = encode_tile(rgba)
            relative = f"{z}/{x}/{y}.webp"
            path = destination / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            receipts[relative] = sha256(data).hexdigest()
            count += 1
            total += len(data)
        print(f"z{z}: cumulative {count} tiles / {total} bytes", flush=True)
    manifest = {
        "source_url": audit.URLS["color"], "source_identity": snapshot["sources"]["color"]["http"],
        "registration": "Georeferenced but alignment unverified",
        "bounds_wsen": bounds, "minzoom": MIN_ZOOM, "maxzoom": MAX_ZOOM, "tile_size": SIZE,
        "source_grid_spacing_m": .25, "source_overview_factor": 8, "working_grid_spacing_m": 2,
        "finest_display_spacing_m_approx": 2*math.pi*audit.RADIUS/(SIZE*2**MAX_ZOOM),
        "effective_source_resolution": "Spatially variable and unmeasured; RGB contribution footprints unavailable",
        "resampling": "Separable exact source-cell area overlaps in source equirectangular coordinates; valid-support normalized RGB and area-weighted alpha; output centers clipped to reviewed extent",
        "encoding": "Lossless RGB/RGBA WebP; no local stretch, sharpening or color fabrication",
        "source_processing": "Author color balance, blending, LRGB fusion, unsharp mask and JPEG COG encoding",
        "source_affine": snapshot["sources"]["color"]["transform"], "working_affine": transform,
        "tile_count": count, "tile_bytes": total, "tile_sha256": receipts,
        "range_receipts": source.receipts, "source_bytes_read_or_replayed": source.budget.used,
        "software": {"rasterio": rasterio.__version__, "gdal": rasterio.__gdal_version__, "pillow": Image.__version__, "numpy": np.__version__},
    }
    if total > 24*1024**2:
        raise ValueError("Generated imagery exceeds 24 MiB release budget")
    (destination / "manifest.json").write_text(json.dumps(manifest, indent=2)+"\n")
    print(json.dumps({"tiles": count, "bytes": total, "seconds": time.perf_counter()-began}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true")
    args = parser.parse_args()
    generate(args.download)
