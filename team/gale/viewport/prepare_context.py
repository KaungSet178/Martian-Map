"""Broader display crop of the existing Gale CTX WMTS product, never a new dataset.

Reuses G1 angular source sampling, alpha and planetocentric display convention.
No source values, georeferencing, detailed mission tiles or science tiles change.
Run from repo root: python team/gale/viewport/prepare_context.py
"""
import hashlib
import json
import math
import sys
from pathlib import Path
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "team/gale"))
from prepare_g1 import mosaic, sample, download, WMTS, CACHE, RADIUS

BOUNDS = [136.4, -5.6, 138.4, -3.8]
OUT = ROOT / "public/maps/gale/context-tiles"
REPORT = ROOT / "team/gale/viewport/context-report.json"


def main():
    metadata = download("context-capabilities.xml", WMTS + "WMTSCapabilities.xml")
    ns = {"o": "http://www.opengis.net/ows/1.1"}
    xml = ET.parse(metadata)
    bbox = xml.find(".//o:BoundingBox", ns)
    lower = [float(v) for v in bbox.find("o:LowerCorner", ns).text.split()]
    upper = [float(v) for v in bbox.find("o:UpperCorner", ns).text.split()]
    assert lower[0] <= BOUNDS[0] < BOUNDS[2] <= upper[0]
    assert lower[1] <= BOUNDS[1] < BOUNDS[3] <= upper[1]
    hashes, levels, validity = {}, [], []
    for z in range(5, 12):
        image, x0, y0, size = mosaic(z - 1, BOUNDS)
        west, south, east, north = BOUNDS
        n = 2**z
        ty = lambda lat: math.floor((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)
        xmin, xmax = [math.floor((v + 180) / 360 * n) for v in (west, east)]
        top, bottom = ty(north), ty(south)
        valid_count, inside_count = 0, 0
        for x in range(xmin, xmax + 1):
            for y in range(top, bottom + 1):
                lon = (x + (np.arange(256) + .5) / 256) / n * 360 - 180
                lat = np.degrees(np.arctan(np.sinh(math.pi * (1 - 2 * (y + (np.arange(256) + .5) / 256) / n))))
                lon, lat = np.meshgrid(lon, lat)
                rgba = sample(image, lon, lat, x0, y0, size).copy()
                inside = (lon >= west) & (lon <= east) & (lat >= south) & (lat <= north)
                rgba[~inside] = 0
                inside_count += int(inside.sum())
                valid_count += int(np.count_nonzero(rgba[:, :, 3]))
                path = OUT / str(z) / str(x) / f"{y}.png"
                path.parent.mkdir(parents=True, exist_ok=True)
                Image.fromarray(rgba).save(path, optimize=True)
                hashes[path.relative_to(OUT).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
        levels.append({"z": z, "source_level": z - 1, "xMin": xmin, "xMax": xmax, "yTop": top, "yBottom": bottom})
        validity.append({"z": z, "inside_crop_pixels": inside_count, "valid_alpha_pixels": valid_count})
        print(f"z{z}: {len(hashes)} context tiles", flush=True)
    source_hashes = {p.relative_to(CACHE).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
                     for p in sorted((CACHE / "wmts").rglob("*.png"))}
    report = {"product": "Gale_CTX_BlockAdj_dd", "source": WMTS,
              "source_capabilities_sha256": hashlib.sha256(metadata.read_bytes()).hexdigest(),
              "published_source_bounds": lower + upper, "application_bounds_wsen": BOUNDS,
              "source_crs": "WMTS angular equirectangular grid, origin -180/90; ambiguous EPSG::104905 identifier; G1 independently supported planetocentric/east convention retained, no ellipsoid conversion or fitted shifts",
              "source_pixel_dimensions": "WMTS 256x256 tiles; global matrix L has 2^(L+1) columns and 2^L rows; native mosaic dimensions unspecified",
              "max_zoom_equatorial_posting_m": 2 * math.pi * RADIUS / (256 * 2**11),
              "sampling": "XYZ output pixel centers inverse-Mercator -> nearest angular WMTS source L=z-1; original RGBA retained inside selected crop; outside transparent",
              "limitations": ["Context is coarser than mission CTX (z11 vs z13); not a resolution or positional accuracy claim", "Finite display crop, not entire CTX product or global Mars", "Source alpha gaps retained; no radiometric edits or gap filling", "Same product and coordinate convention as existing CTX; independent absolute positional uncertainty remains unquantified"],
              "tile_ranges": levels, "validity": validity, "tiles_written": len(hashes),
              "source_tile_sha256": source_hashes, "output_sha256": hashes}
    REPORT.write_text(json.dumps(report, indent=2) + "\n", newline="\n")


if __name__ == "__main__":
    main()
