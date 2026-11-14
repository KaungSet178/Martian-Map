#!/usr/bin/env python3
"""Oxia Planum colorized CTX basemap (pan-sharpened display tiles).

Prep-only script, not part of the app build. Requires Python 3 + Pillow +
numpy (used here: Python 3.14.6, Pillow 12.3.0, numpy 2.5.3). Run from the
repository root after prepare_ctx_basemap.mjs has built the gray CTX tiles:

    python team/oxia/basemap/prepare_ctx_color.py

Inputs (both NASA JPL Mars Trek, Space Apps 2026 challenge resources):
  Detail / brightness: public/maps/oxia/ctx-tiles/{z}/{x}/{y}.png, the gray
      CTX tiles from Mars Trek layer CTX_beta01_uncontrolled_5m_Caltech.
  Colour: Mars Trek layer Mars_Viking_MDIM21_ClrMosaic_global_232m
      ("Viking VIS, Global Color Mosaic"). Tiling from its
      WMTSCapabilities.xml: EPSG::104905 (Mars 2000 sphere, geographic),
      TopLeftCorner -180/90, 256 px RGB JPEG tiles, level L has
      2^(L+1) x 2^L tiles (tile span 180/2^L degrees); levels 0-7, level 8
      returns 404, so level 7 (~0.0055 deg, ~326 m per pixel) is the
      finest served; the product is nominally 232 m.
Method (pan-sharpening by luminance swap, display only):
  1. For every pixel of every CTX output tile (same extent and zooms,
     z5-12), compute its longitude/latitude from the Web-Mercator grid and
     sample the Viking colour bilinearly at source level min(z - 1, 7).
  2. Convert the Viking RGB to YCbCr (JPEG/ITU-R BT.601 full range) and
     keep only its chroma (Cb, Cr).
  3. Scale the chroma by SATURATION (0.8) so the colour stays moderate.
  4. Use the CTX gray value as the luminance Y and convert back to RGB.
  No other radiometric adjustment (no stretch, sharpening or colour
  balance). CTX pixels are unchanged in brightness; Viking supplies only
  hue and saturation.
Output: public/maps/oxia/ctx-color-tiles/{z}/{x}/{y}.jpg (JPEG quality 85,
  256 px Web-Mercator XYZ, z5-12) and team/oxia/basemap/color_build_report.json.
"""

import io
import json
import math
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

import numpy as np
from PIL import Image

CTX_ROOT = "public/maps/oxia/ctx-tiles"
OUT_ROOT = "public/maps/oxia/ctx-color-tiles"
VIKING_LAYER = "Mars_Viking_MDIM21_ClrMosaic_global_232m"
VIKING = f"https://trek.nasa.gov/tiles/Mars/EQ/{VIKING_LAYER}/1.0.0//default/default028mm"
MAX_VIKING_LEVEL = 7
SATURATION = 0.8
JPEG_QUALITY = 85
TILE = 256

cache = {}
viking_missing = 0


def viking_tile(level, row, col):
    """Returns a float32 (256, 256, 3) array, or None if the tile is missing."""
    global viking_missing
    key = (level, row, col)
    if key in cache:
        return cache[key]
    arr = None
    url = f"{VIKING}/{level}/{row}/{col}.jpg"
    for attempt in range(1, 6):
        try:
            with urllib.request.urlopen(url, timeout=60) as res:
                arr = np.asarray(Image.open(io.BytesIO(res.read())).convert("RGB"), dtype=np.float32)
            break
        except urllib.error.HTTPError as e:
            if e.code == 404:
                break
            print(f"  viking {key} attempt {attempt}: HTTP {e.code}", file=sys.stderr)
        except Exception as e:  # network hiccup; retry
            print(f"  viking {key} attempt {attempt}: {e}", file=sys.stderr)
        time.sleep(min(30, 3 * 2 ** (attempt - 1)))
    if arr is None:
        viking_missing += 1
    cache[key] = arr
    return arr


def sample_viking(level, lon, lat):
    """Bilinear Viking RGB at arrays of display lon/lat (degrees)."""
    res = 180 / 2**level / TILE  # degrees per source pixel
    # continuous source pixel coordinates, centred on pixel centres
    gx = (lon + 180) / res - 0.5
    gy = (90 - lat) / res - 0.5
    x0 = np.floor(gx).astype(np.int64)
    y0 = np.floor(gy).astype(np.int64)
    fx = (gx - x0)[..., None]
    fy = (gy - y0)[..., None]

    # Build a mosaic covering the needed source pixels.
    xmin, xmax = int(x0.min()), int(x0.max()) + 1
    ymin, ymax = int(y0.min()), int(y0.max()) + 1
    c0, c1 = xmin // TILE, xmax // TILE
    r0, r1 = ymin // TILE, ymax // TILE
    mosaic = np.zeros(((r1 - r0 + 1) * TILE, (c1 - c0 + 1) * TILE, 3), dtype=np.float32)
    for r in range(r0, r1 + 1):
        for c in range(c0, c1 + 1):
            t = viking_tile(level, r, c)
            if t is None:
                raise RuntimeError(f"missing Viking tile {level}/{r}/{c}")
            mosaic[(r - r0) * TILE:(r - r0 + 1) * TILE, (c - c0) * TILE:(c - c0 + 1) * TILE] = t
    ox, oy = c0 * TILE, r0 * TILE

    def px(yy, xx):
        return mosaic[yy - oy, xx - ox]

    top = px(y0, x0) * (1 - fx) + px(y0, x0 + 1) * fx
    bottom = px(y0 + 1, x0) * (1 - fx) + px(y0 + 1, x0 + 1) * fx
    return top * (1 - fy) + bottom * fy


def tile_lonlat(z, x, y):
    n = 2**z
    i = (np.arange(TILE, dtype=np.float64) + 0.5) / TILE
    lon = (x + i) / n * 360 - 180
    lat = np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * (y + i) / n))))
    return np.meshgrid(lon, lat)


def colorize(gray, rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    cb = (-0.168736 * r - 0.331264 * g + 0.5 * b) * SATURATION
    cr = (0.5 * r - 0.418688 * g - 0.081312 * b) * SATURATION
    yv = gray.astype(np.float32)
    out = np.stack(
        [yv + 1.402 * cr, yv - 0.344136 * cb - 0.714136 * cr, yv + 1.772 * cb], axis=-1
    )
    return np.clip(np.rint(out), 0, 255).astype(np.uint8)


def main():
    tiles = written = bytes_out = 0
    levels = set()
    chroma_sum = 0.0
    for z in sorted(int(d) for d in os.listdir(CTX_ROOT)):
        level = min(z - 1, MAX_VIKING_LEVEL)
        levels.add(level)
        for x in sorted(int(d) for d in os.listdir(os.path.join(CTX_ROOT, str(z)))):
            for f in sorted(os.listdir(os.path.join(CTX_ROOT, str(z), str(x)))):
                y = int(f.split(".")[0])
                gray = np.asarray(Image.open(os.path.join(CTX_ROOT, str(z), str(x), f)).convert("L"))
                lon, lat = tile_lonlat(z, x, y)
                rgb = sample_viking(level, lon, lat)
                out = colorize(gray, rgb)
                chroma_sum += float(np.abs(out.astype(np.int16) - gray[..., None]).mean())
                path = os.path.join(OUT_ROOT, str(z), str(x), f"{y}.jpg")
                os.makedirs(os.path.dirname(path), exist_ok=True)
                Image.fromarray(out, "RGB").save(path, "JPEG", quality=JPEG_QUALITY, optimize=True)
                tiles += 1
                written += 1
                bytes_out += os.path.getsize(path)
        print(f"z{z}: done (Viking level {level})")

    report = {
        "detail_source": f"{CTX_ROOT} (Mars Trek CTX_beta01_uncontrolled_5m_Caltech)",
        "colour_source_layer": VIKING_LAYER,
        "colour_source": VIKING,
        "credit": "NASA/JPL/MSSS/Caltech Murray Lab CTX; NASA Viking Orbiter MDIM 2.1 colour mosaic; both via NASA JPL Mars Trek",
        "method": "luminance swap in YCbCr (BT.601 full range): Y from CTX gray, Cb/Cr from bilinear Viking colour scaled by saturation; no other radiometric change",
        "saturation": SATURATION,
        "tools": f"Python {sys.version.split()[0]}, Pillow {Image.__version__}, numpy {np.__version__}",
        "output": OUT_ROOT,
        "output_format": f"JPEG quality {JPEG_QUALITY}, 256 px Web-Mercator XYZ",
        "viking_levels_used": sorted(levels),
        "viking_tiles_fetched_ok": sum(1 for v in cache.values() if v is not None),
        "viking_tiles_missing": viking_missing,
        "output_tiles_written": written,
        "output_bytes": bytes_out,
        "mean_abs_channel_offset_from_gray": round(chroma_sum / max(tiles, 1), 2),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "color_build_report.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)
        fh.write("\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
