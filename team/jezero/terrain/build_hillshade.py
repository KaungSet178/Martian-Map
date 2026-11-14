"""Jezero-only, reproducible numeric DEM hillshade. See --help and report.

Dependencies: numpy, rasterio, Pillow. Source is never modified. No Earth CRS.
"""
import argparse
import hashlib
import json
import math
import struct
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image

PRODUCT = "JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40"
RADIUS = 3396190.0
RAD = math.pi / 180
AZIMUTH = 315.0
ALTITUDE = 45.0
MISSION = [77.186786, 18.401964, 77.493133, 18.519663]


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as stream:
        for block in iter(lambda: stream.read(8 * 1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def illumination(east_gradient, north_gradient, azimuth=AZIMUTH, altitude=ALTITUDE):
    """Lambertian dot(normal, light); north-positive gradients, clockwise azimuth.

    0..1 intensity, no ambient component, contrast stretch or cast shadows.
    """
    az, alt = azimuth * RAD, altitude * RAD
    return np.clip((math.sin(alt) - math.cos(alt) * (
        east_gradient * math.sin(az) + north_gradient * math.cos(az)
    )) / np.sqrt(1 + east_gradient**2 + north_gradient**2), 0, 1)


def bilinear(data, col, row, nodata):
    """Coordinates are center-indexed. All four supporting posts must be valid."""
    c, r = np.floor(col).astype(np.int64), np.floor(row).astype(np.int64)
    valid = (c >= 0) & (r >= 0) & (c + 1 < data.shape[1]) & (r + 1 < data.shape[0])
    cc, rr = np.clip(c, 0, data.shape[1] - 2), np.clip(r, 0, data.shape[0] - 2)
    values = [data[rr, cc], data[rr, cc + 1], data[rr + 1, cc], data[rr + 1, cc + 1]]
    for value in values:
        valid &= np.isfinite(value) & (value != nodata)
    # Promote before arithmetic so huge nodata sentinels cannot overflow float32.
    a, b, cval, d = [v.astype(np.float64) for v in values]
    dx, dy = col - c, row - r
    result = (a * (1 - dx) + b * dx) * (1 - dy) + (cval * (1 - dx) + d * dx) * dy
    return np.where(valid, result, np.nan)


def tile_rgba(data, nodata, transform, z, x, y, size=256):
    # Global pixel centers ensure neighboring tiles use exactly the same grid.
    lon = ((x * size + np.arange(size) + .5) / (size * 2**z)) * 360 - 180
    lat = np.arctan(np.sinh(math.pi * (1 - 2 * (
        y * size + np.arange(size) + .5) / (size * 2**z)))) / RAD
    col, row = np.meshgrid((lon * RADIUS * RAD - transform.c) / transform.a - .5,
                          (lat * RADIUS * RAD - transform.f) / transform.e - .5)
    center = bilinear(data, col, row, nodata)
    west, east = [bilinear(data, col + offset, row, nodata) for offset in (-1, 1)]
    north, south = [bilinear(data, col, row + offset, nodata) for offset in (-1, 1)]
    # Equirectangular latTs=0: map X spacing corresponds to cos(lat) ground spacing.
    dzde = (east - west) / (2 * transform.a * np.cos(lat[:, None] * RAD))
    dzdn = (north - south) / (2 * abs(transform.e))
    valid = np.isfinite(center) & np.isfinite(dzde) & np.isfinite(dzdn)
    intensity = illumination(dzde, dzdn)
    gray = np.floor(np.nan_to_num(intensity) * 255 + .5).astype(np.uint8)
    rgba = np.zeros((size, size, 4), dtype=np.uint8)
    rgba[:, :, :3] = np.where(valid, gray, 0)[:, :, None]
    rgba[:, :, 3] = valid.astype(np.uint8) * 255
    return rgba


def tile_ranges(bounds, z):
    west, south, east, north = bounds
    yindex = lambda lat: math.floor((1 - math.asinh(math.tan(lat * RAD)) / math.pi) / 2 * 2**z)
    return (math.floor((west + 180) / 360 * 2**z),
            math.floor((east + 180) / 360 * 2**z), yindex(north), yindex(south))


def open_numeric_source(path):
    """Fail closed on the actual source layout, rather than guessing TIFF offsets."""
    with rasterio.open(path) as ds:
        if (ds.width, ds.height, ds.count, ds.dtypes[0]) != (21400, 21488, 1, "float32"):
            raise ValueError("Unexpected DEM dimensions/type")
        expected = (1, 0, 4577366, 0, -1, 1106618)
        if tuple(ds.transform)[:6] != expected:
            raise ValueError("Unexpected DEM affine")
        crs = ds.crs.to_dict()
        if crs.get("proj") != "eqc" or crs.get("lat_ts", 0) != 0 or crs.get("lon_0", 0) != 0:
            raise ValueError("Unexpected DEM projection")
        if abs(float(crs.get("R", crs.get("a", 0))) - RADIUS) > .001:
            raise ValueError("Unexpected Mars reference radius")
        transform, nodata, wkt = ds.transform, ds.nodata, ds.crs.to_wkt()
    # The authenticated source is uncompressed classic little-endian TIFF with
    # contiguous float32 scanlines. Inspect all relevant tags before memory mapping.
    with open(path, "rb") as stream:
        header = stream.read(8)
        if header[:4] != b"II*\x00":
            raise ValueError("Expected classic little-endian TIFF")
        stream.seek(struct.unpack("<I", header[4:])[0])
        count = struct.unpack("<H", stream.read(2))[0]
        entries = [struct.unpack("<HHII", stream.read(12)) for _ in range(count)]
        tags = {}
        for tag, kind, n, value in entries:
            if tag not in (259, 273, 278, 279):
                continue
            if kind not in (3, 4):
                raise ValueError("Unexpected TIFF strip tag type")
            fmt = "H" if kind == 3 else "I"
            length = n * (2 if kind == 3 else 4)
            if length <= 4:
                raw = struct.pack("<I", value)[:length]
            else:
                stream.seek(value)
                raw = stream.read(length)
            tags[tag] = struct.unpack("<" + fmt * n, raw)
        if tags[259] != (1,) or tags[278] != (1,):
            raise ValueError("Expected uncompressed one-row strips")
        offsets, counts = tags[273], tags[279]
        if len(offsets) != 21488 or any(n != 21400 * 4 for n in counts):
            raise ValueError("Unexpected strip counts")
        if any(off != offsets[0] + i * 21400 * 4 for i, off in enumerate(offsets)):
            raise ValueError("Noncontiguous source strips")
    data = np.memmap(path, mode="r", dtype="<f4", offset=offsets[0], shape=(21488, 21400))
    return data, transform, nodata, wkt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dem", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--max-zoom", type=int, default=14, choices=range(5, 15))
    parser.add_argument("--summary", type=Path, default=Path("regions/jezero/terrain-summary.json"))
    args = parser.parse_args()
    data, transform, nodata, wkt = open_numeric_source(args.dem)
    bounds = [transform.c / (RADIUS * RAD),
              (transform.f + data.shape[0] * transform.e) / (RADIUS * RAD),
              (transform.c + data.shape[1] * transform.a) / (RADIUS * RAD),
              transform.f / (RADIUS * RAD)]
    # Exact native extrema/counts, not sampled estimates from the legacy audit.
    minimum, maximum, valid_count = math.inf, -math.inf, 0
    mission_min, mission_max = math.inf, -math.inf
    mask = np.zeros(data.shape, dtype=np.uint8)
    for start in range(0, data.shape[0], 256):
        block = data[start:start + 256]
        valid = np.isfinite(block) & (block != nodata)
        mask[start:start + len(block)] = valid
        values = block[valid]
        if values.size:
            minimum, maximum = min(minimum, float(values.min())), max(maximum, float(values.max()))
            valid_count += int(values.size)
        lat = (transform.f + (start + np.arange(len(block)) + .5) * transform.e) / (RADIUS * RAD)
        lon = (transform.c + (np.arange(data.shape[1]) + .5) * transform.a) / (RADIUS * RAD)
        inside = valid & ((lat >= MISSION[1]) & (lat <= MISSION[3]))[:, None] & ((lon >= MISSION[0]) & (lon <= MISSION[2]))[None, :]
        values = block[inside]
        if values.size:
            mission_min, mission_max = min(mission_min, float(values.min())), max(mission_max, float(values.max()))
    # Exact DEM nodata mask in its native affine, no rectangle substituted for validity.
    import rasterio.features
    features = []
    geographic = rasterio.Affine(transform.a / (RADIUS * RAD), 0, bounds[0],
                                0, transform.e / (RADIUS * RAD), bounds[3])
    for geometry, value in rasterio.features.shapes(mask, mask=mask.astype(bool), transform=geographic):
        if value == 1:
            features.append({"type": "Feature", "properties": {"mask": "native valid DEM; hillshade requires additional gradient support"}, "geometry": geometry})
    footprint_path = args.report.with_name("dem-valid-footprint.geojson")
    footprint_path.write_text(json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")) + "\n", newline="\n")
    del mask
    # Include the legacy mission tile margin as transparent padding to the west
    # of source coverage. Padding never creates valid DEM or illumination data.
    tiling_bounds = [min(bounds[0], MISSION[0] - .01), bounds[1],
                     max(bounds[2], MISSION[2] + .01), bounds[3]]
    hashes, ranges = {}, []
    for z in range(5, args.max_zoom + 1):
        xmin, xmax, top, bottom = tile_ranges(tiling_bounds, z)
        ranges.append({"z": z, "xMin": xmin, "xMax": xmax, "yTop": top, "yBottom": bottom})
        for x in range(xmin, xmax + 1):
            for y in range(top, bottom + 1):
                rgba = tile_rgba(data, nodata, transform, z, x, y)
                path = args.output / str(z) / str(x) / f"{y}.png"
                path.parent.mkdir(parents=True, exist_ok=True)
                Image.fromarray(rgba).save(path, compress_level=9)
                hashes[f"{z}/{x}/{y}.png"] = sha256(path)
        print(f"z{z} complete", flush=True)
    report = {"product": PRODUCT, "doi": "https://doi.org/10.5066/P9REJ9JN",
              "source_sha256": sha256(args.dem), "source_bytes": args.dem.stat().st_size,
              "source_crs_wkt": wkt, "source_affine": list(transform)[:6],
              "source_posting_m": 1, "nodata": nodata,
              "source_bounds": bounds, "tiling_bounds": tiling_bounds, "source_valid_cells": valid_count,
              "source_exact_range_m": [minimum, maximum], "mission_exact_range_m": [mission_min, mission_max],
              "valid_footprint": footprint_path.name, "valid_footprint_sha256": sha256(footprint_path),
              "azimuth_deg": AZIMUTH, "illumination_elevation_deg": ALTITUDE,
              "method": "Lambertian surface-normal dot light; central differences at +/-1 native post after strict bilinear DEM sampling; east spacing=1m*cos(planetocentric latitude), north spacing=1m; pixel-center affine",
              "gradient_support": "2m cardinal baseline plus bilinear interpolation support; strictly transparent if any supporting DEM post is nodata",
              "display_semantics": "uint8 round(255*clamp(dot(normal, artificial light),0,1)); grayscale; alpha=valid; no cast shadows, smoothing, ambient illumination or contrast stretch",
              "limitations": ["Artificial illumination, not actual sunlight, temperature or terrain safety", "Fine relief may alias at coarse zoom; no averaging or terrain generalization", "Strict interpolation/gradient support erodes native nodata boundaries; no gap filling", "Registration is not independently certified"],
              "software": {"numpy": np.__version__, "rasterio": rasterio.__version__, "pillow": Image.__version__},
              "tile_ranges": ranges, "tiles_written": len(hashes), "tile_sha256": hashes}
    args.report.write_text(json.dumps(report, indent=2) + "\n", newline="\n")
    args.summary.write_text(json.dumps({key: report[key] for key in (
        "product", "source_sha256", "source_exact_range_m", "mission_exact_range_m",
        "source_bounds", "source_valid_cells", "nodata")}, indent=2) + "\n", newline="\n")


if __name__ == "__main__":
    main()
