#!/usr/bin/env python3
"""Oxia Planum regional hillshade display tiles (Oxia region owner tool).

Prep-only script, not part of the app build. Requires Python 3 + Pillow
(used here: Python 3.14.6, Pillow 12.3.0). Run from the repository root:

    python team/oxia/terrain/prepare_hillshade.py public/maps/oxia/hillshade-tiles

Source : NASA JPL Mars Trek layer "MGS MOLA and Mars Express HRSC,
         Hillshade Blend", Mars_MOLA_blend200ppx_HRSC_Shade_clon0dd_200mpp_lzw.
         Tiling from its WMTSCapabilities.xml (TileMatrixSet default028mm):
         EPSG::104905 (Mars 2000 sphere, geographic), TopLeftCorner -180/90,
         256 px grayscale JPEG tiles, level L has 2^(L+1) x 2^L tiles (tile
         span 180/2^L degrees). Levels 0-8 are listed; level 9 returns 404
         over Oxia, so level 8 (~0.00275 deg = ~163 m per pixel) is the
         finest; the product itself is 200 m per pixel.
Output : <outRoot>/{z}/{x}/{y}.png, 256 px Web-Mercator XYZ, 8-bit
         grayscale PNG, zooms 5-9 (z9 display pixels ~163 m match source
         level 8; closer zooms over-zoom z9).
Extent : the Oxia team-chosen display box, 17.11-19.15 N, 334.60-336.60 E.
Method : nearest-neighbour; for output zoom z the source level is
         min(z - 1, 8). Gray values copied unchanged (shaded relief, no
         elevation values).
"""

import json
import math
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from io import BytesIO

from PIL import Image

LAYER = "Mars_MOLA_blend200ppx_HRSC_Shade_clon0dd_200mpp_lzw"
SERVICE = f"https://trek.nasa.gov/tiles/Mars/EQ/{LAYER}/1.0.0//default/default028mm"
MIN_Z, MAX_Z = 5, 9
MAX_SOURCE_LEVEL = 8
SRC_PX = 256
TILE_PX = 256

EXTENT_EAST_0_360 = {"west": 334.6, "east": 336.6, "south": 17.11, "north": 19.15}


def to_display_lon(lon):
    return lon - 360 if lon > 180 else lon


EXTENT = {
    "west": to_display_lon(EXTENT_EAST_0_360["west"]),
    "east": to_display_lon(EXTENT_EAST_0_360["east"]),
    "south": EXTENT_EAST_0_360["south"],
    "north": EXTENT_EAST_0_360["north"],
}

cache = {}
missing = 0


def fetch_tile(level, row, col):
    global missing
    key = (level, row, col)
    if key in cache:
        return cache[key]
    tile = None
    url = f"{SERVICE}/{level}/{row}/{col}.jpg"
    for attempt in range(1, 4):
        try:
            with urllib.request.urlopen(url, timeout=60) as res:
                im = Image.open(BytesIO(res.read()))
                tile = im.convert("L").load() if im.mode != "L" else im.load()
            break
        except urllib.error.HTTPError as e:
            if e.code == 404:
                break
            print(f"  {key} attempt {attempt}: HTTP {e.code}", file=sys.stderr)
        except Exception as e:  # network hiccup; retry
            print(f"  {key} attempt {attempt}: {e}", file=sys.stderr)
        time.sleep(attempt)
    if tile is None:
        missing += 1
    cache[key] = tile
    return tile


def lon_at(z, x, fx):
    return (x + fx) / 2**z * 360 - 180


def lat_at(z, y, fy):
    return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + fy) / 2**z))))


def y_index(z, lat):
    return math.floor((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * 2**z)


def x_index(z, lon):
    return math.floor((lon + 180) / 360 * 2**z)


def main():
    if len(sys.argv) != 2:
        print("usage: python prepare_hillshade.py <outputTileRoot>", file=sys.stderr)
        sys.exit(1)
    out_root = sys.argv[1]
    tiles_written = bytes_written = samples = no_source = 0
    levels = set()
    for z in range(MIN_Z, MAX_Z + 1):
        level = min(z - 1, MAX_SOURCE_LEVEL)
        levels.add(level)
        span = 180 / 2**level
        x_min, x_max = x_index(z, EXTENT["west"]), x_index(z, EXTENT["east"])
        y_top, y_bottom = y_index(z, EXTENT["north"]), y_index(z, EXTENT["south"])
        for x in range(x_min, x_max + 1):
            for y in range(y_top, y_bottom + 1):
                out = Image.new("L", (TILE_PX, TILE_PX), 0)
                px_out = out.load()
                for py in range(TILE_PX):
                    lat = lat_at(z, y, (py + 0.5) / TILE_PX)
                    ey = (90 - lat) / span
                    row = math.floor(ey)
                    sy = min(SRC_PX - 1, math.floor((ey - row) * SRC_PX))
                    for px in range(TILE_PX):
                        lon = lon_at(z, x, (px + 0.5) / TILE_PX)
                        ex = (lon + 180) / span
                        col = math.floor(ex)
                        samples += 1
                        tile = fetch_tile(level, row, col)
                        if tile is None:
                            no_source += 1
                            continue
                        sx = min(SRC_PX - 1, math.floor((ex - col) * SRC_PX))
                        px_out[px, py] = tile[sx, sy]
                path = os.path.join(out_root, str(z), str(x), f"{y}.png")
                os.makedirs(os.path.dirname(path), exist_ok=True)
                out.save(path, format="PNG", optimize=True)
                tiles_written += 1
                bytes_written += os.path.getsize(path)
        print(f"z{z}: x {x_min}-{x_max}, y {y_top}-{y_bottom} (source level L{level})")

    report = {
        "source_layer": LAYER,
        "source": SERVICE,
        "credit": "NASA MGS MOLA and ESA Mars Express HRSC blend; via NASA JPL Mars Trek",
        "tools": f"Python {sys.version.split()[0]}, Pillow {Image.__version__}",
        "output_scheme": "Web-Mercator XYZ, 256 px 8-bit grayscale PNG",
        "zoom_range": [MIN_Z, MAX_Z],
        "source_levels_used": sorted(levels),
        "output_tiles_written": tiles_written,
        "output_bytes": bytes_written,
        "source_tiles_fetched_ok": sum(1 for v in cache.values() if v is not None),
        "source_tiles_missing": missing,
        "output_samples": samples,
        "samples_without_source": no_source,
        "reprojection": "nearest-neighbour from the equirectangular source grid; gray values unchanged",
        "extent_east_0_360": EXTENT_EAST_0_360,
        "extent_display_lon": EXTENT,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    report_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
        f.write("\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
