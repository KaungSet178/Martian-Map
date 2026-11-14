"""Reproduce georeferenced Gale terrain; local optical alignment is unverified.

Generates:
- Regional HRSC 30 m terrain tiles (elevation, hillshade, slope)
- Global HRSC-MOLA 200 m terrain tiles (elevation, hillshade, slope)
- Coverage polygons in GeoJSON format
- Cryptographic processing audit in team/gale/G4_TERRAIN_AUDIT.json
"""
from pathlib import Path
import math
import json
import hashlib
from hashlib import sha256
import numpy as np
from PIL import Image
import rasterio
import pyproj
from rasterio.windows import Window
import sys

sys.dont_write_bytecode = True
from dem_math import terrain_fields

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "output/g4/raw"
REGIONAL_ASSETS = ROOT / "public/maps/gale/terrain-regional"
GLOBAL_ASSETS = ROOT / "public/maps/gale/terrain-global"
AUDIT_FILE = ROOT / "team/gale/G4_TERRAIN_AUDIT.json"

MARS_RADIUS_M = 3396190.0

# Gale Overview Bounds from regions/gale/config.ts
GALE_OVERVIEW_BOUNDS = {
    "west_east": 137.3442352329006,
    "east_east": 137.4579431096443,
    "south_latitude": -4.822361175063087,
    "north_latitude": -4.580605407446296,
}

ELEVATION_BREAKS = [-4400, -4200, -3900, -3500]
ELEVATION_COLORS = ["#425A78", "#587E91", "#87A39D", "#BCB29C", "#C8A97E"]
SLOPE_BREAKS = [5, 10, 15, 20]
SLOPE_COLORS = ["#526B82", "#71989E", "#AAA7BD", "#B49A88", "#C9BDA0"]

def rgb_table(hex_list):
    return np.array([[int(c[i:i+2], 16) for i in (1, 3, 5)] for c in hex_list], dtype=np.uint8)

def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")

def coverage_overview(valid, extent):
    """Exact spherical area of valid cell footprints intersecting the overview."""
    west, south, east, north = extent
    b = GALE_OVERVIEW_BOUNDS
    h, w = valid.shape
    xs = np.linspace(west, east, w+1)
    ys = np.linspace(north, south, h+1)
    wx = np.radians(np.maximum(0, np.minimum(xs[1:], b['east_east'])-np.maximum(xs[:-1], b['west_east'])))
    top, bottom = np.minimum(ys[:-1], b['north_latitude']), np.maximum(ys[1:], b['south_latitude'])
    wy = np.where(top > bottom, np.sin(np.radians(top))-np.sin(np.radians(bottom)), 0)
    total = math.radians(b['east_east']-b['west_east'])*(math.sin(math.radians(b['north_latitude']))-math.sin(math.radians(b['south_latitude'])))
    measured = float(wy @ valid.astype(float) @ wx)/total*100
    if abs(measured-100) < 1e-9:
        measured = 100.
    return {"valid_percent": min(100., measured), "overview_area_m2": total*MARS_RADIUS_M**2,
            "method": "Spherical cell-footprint overlap; fractional AOI edges; actual validity mask"}

def source_metadata(src, projected):
    crs = pyproj.CRS.from_wkt(src.crs.to_wkt())
    if crs.ellipsoid.semi_major_metre != MARS_RADIUS_M or crs.ellipsoid.semi_minor_metre != MARS_RADIUS_M:
        raise ValueError("Unsupported planetary surface")
    if crs.prime_meridian.longitude != 0:
        raise ValueError("Unsupported source prime meridian")
    t = src.transform
    if t.b != 0 or t.d != 0 or t.a <= 0 or t.e >= 0 or not math.isclose(t.a, -t.e):
        raise ValueError("Unsupported source affine")
    if projected:
        params = crs.to_dict()
        if any(params.get(k) != v for k,v in {"proj":"eqc", "lat_ts":0, "lat_0":0, "lon_0":0, "x_0":0, "y_0":0, "units":"m"}.items()) or t.a != 30:
            raise ValueError("Unsupported regional projection/grid")
    elif not crs.is_geographic:
        raise ValueError("Expected actual Mars angular global grid")
    return {"crs_wkt": src.crs.to_wkt(), "affine": list(t)[:6], "nodata": src.nodata,
            "grid_shape": list(src.shape), "mask_flags": [[f.name for f in flags] for flags in src.mask_flag_enums]}

def render_tiles(dest_dir, extent_wsen, grid_data, zoom_range=(5, 14)):
    """Render Web Mercator display tiles using direct inverse coordinate sampling.
    
    grid_data: dict of kind -> {
        'data': 2D array, 
        'valid': 2D bool mask, 
        'extent': [west, south, east, north],
        'colors': uint8 RGBA colormap func or lookup
    }
    """
    tile_hashes = {}
    dest_dir.mkdir(parents=True, exist_ok=True)
    west, south, east, north = extent_wsen

    for zoom in range(zoom_range[0], zoom_range[1]):
        n = 2 ** zoom
        tx = lambda lon: (lon + 180.0) / 360.0 * n
        ty = lambda lat: (1.0 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2.0 * n

        x_min = math.floor(tx(west))
        x_max = math.floor(tx(east))
        y_min = math.floor(ty(north))
        y_max = math.floor(ty(south))

        for x in range(x_min, x_max + 1):
            for y in range(y_min, y_max + 1):
                # 256 pixel centers in tile
                px = (x + (np.arange(256) + 0.5) / 256.0) / n * 360.0 - 180.0
                py = np.degrees(np.arctan(np.sinh(math.pi * (1.0 - 2.0 * (y + (np.arange(256) + 0.5) / 256.0) / n))))

                for kind, product in grid_data.items():
                    data = product["data"]
                    support = product["valid"]
                    p_w, p_s, p_e, p_n = product["extent"]
                    h, w = data.shape

                    # Map px (lons) and py (lats) into product pixel rows and cols
                    cols = np.floor((px[None, :] - p_w) / (p_e - p_w) * w).astype(int)
                    rows = np.floor((p_n - py[:, None]) / (p_n - p_s) * h).astype(int)

                    inside = (rows >= 0) & (rows < h) & (cols >= 0) & (cols < w)
                    r_clip = np.clip(rows, 0, h - 1)
                    c_clip = np.clip(cols, 0, w - 1)

                    valid_mask = inside & support[r_clip, c_clip]

                    rgba = np.zeros((256, 256, 4), dtype=np.uint8)
                    if valid_mask.any():
                        colored = product["colorize"](data[r_clip, c_clip])
                        rgba[:, :, :3] = colored
                        rgba[:, :, 3] = np.where(valid_mask, 255, 0)
                        rgba[~valid_mask, :3] = 0

                    tile_path = dest_dir / kind / str(zoom) / str(x) / f"{y}.png"
                    tile_path.parent.mkdir(parents=True, exist_ok=True)
                    Image.fromarray(rgba).save(tile_path, optimize=True)

                    rel_path = str(tile_path.relative_to(ROOT)).replace("\\", "/")
                    tile_bytes = tile_path.read_bytes()
                    tile_hashes[rel_path] = {
                        "sha256": sha256(tile_bytes).hexdigest(),
                        "bytes": len(tile_bytes)
                    }

    return tile_hashes

def process_hrsc_30m():
    raw_path = RAW_DIR / "hrsc_km09_h1938_h1927_h1916-dtm-mosaic.tif"
    assert raw_path.exists(), f"Missing {raw_path}"
    print("Processing Regional HRSC 30 m DTM...")

    gw = GALE_OVERVIEW_BOUNDS["west_east"]
    ge = GALE_OVERVIEW_BOUNDS["east_east"]
    gs = GALE_OVERVIEW_BOUNDS["south_latitude"]
    gn = GALE_OVERVIEW_BOUNDS["north_latitude"]

    # Add 1 km buffer around overview bounds for 3x3 derivative support
    buf_deg = 1000.0 / MARS_RADIUS_M * (180.0 / math.pi)
    ew = gw - buf_deg
    ee = ge + buf_deg
    es = gs - buf_deg
    en = gn + buf_deg

    with rasterio.open(raw_path) as src:
        metadata = source_metadata(src, projected=True)
        # Source transform is equirectangular metres
        # [30.0, 0, 8054872.4, 0, -30.0, -176868.3]
        x_w, x_e = MARS_RADIUS_M * math.radians(ew), MARS_RADIUS_M * math.radians(ee)
        y_s, y_n = MARS_RADIUS_M * math.radians(es), MARS_RADIUS_M * math.radians(en)

        col_start = int(np.floor((x_w - src.transform[2]) / src.transform[0]))
        col_end = int(np.ceil((x_e - src.transform[2]) / src.transform[0]))
        row_start = int(np.floor((src.transform[5] - y_n) / (-src.transform[4])))
        row_end = int(np.ceil((src.transform[5] - y_s) / (-src.transform[4])))

        win = Window(col_start, row_start, col_end - col_start, row_end - row_start)
        z = src.read(1, window=win).astype(np.float64)
        valid_raw = (src.read_masks(1, window=win) > 0) & np.isfinite(z)

        # Actual extent of window in degrees
        actual_x_w = src.transform[2] + col_start * src.transform[0]
        actual_x_e = src.transform[2] + col_end * src.transform[0]
        actual_y_n = src.transform[5] + row_start * src.transform[4]
        actual_y_s = src.transform[5] + row_end * src.transform[4]

        extent_wsen = [
            math.degrees(actual_x_w / MARS_RADIUS_M),
            math.degrees(actual_y_s / MARS_RADIUS_M),
            math.degrees(actual_x_e / MARS_RADIUS_M),
            math.degrees(actual_y_n / MARS_RADIUS_M)
        ]

    print(f"HRSC Raw Window shape: {z.shape}, valid posts: {valid_raw.sum()} / {valid_raw.size} ({valid_raw.sum()/valid_raw.size*100:.2f}%)")

    # Latitude of each row in window
    row_indices = np.arange(z.shape[0])
    row_y = actual_y_n - (row_indices + 0.5) * 30.0
    latitudes_deg = np.degrees(row_y / MARS_RADIUS_M)

    step_m = 30.0
    slope, hillshade, support = terrain_fields(z, valid_raw, step_m, latitudes_deg, azimuth_deg=315, altitude_deg=45)

    # Elevation trimmed to inner supported cells (matching Horn 1-cell border omission)
    elev_inner = z[1:-1, 1:-1]
    extent_inner = [
        math.degrees((actual_x_w + step_m) / MARS_RADIUS_M),
        math.degrees((actual_y_s + step_m) / MARS_RADIUS_M),
        math.degrees((actual_x_e - step_m) / MARS_RADIUS_M),
        math.degrees((actual_y_n - step_m) / MARS_RADIUS_M),
    ]

    elevation_lut = rgb_table(ELEVATION_COLORS)
    slope_lut = rgb_table(SLOPE_COLORS)

    grid_data = {
        "elevation": {
            "data": elev_inner,
            "valid": support,
            "extent": extent_inner,
            "colorize": lambda arr: elevation_lut[np.digitize(arr, ELEVATION_BREAKS)]
        },
        "slope": {
            "data": slope,
            "valid": support,
            "extent": extent_inner,
            "colorize": lambda arr: slope_lut[np.digitize(arr, SLOPE_BREAKS)]
        },
        "hillshade": {
            "data": hillshade,
            "valid": support,
            "extent": extent_inner,
            "colorize": lambda arr: np.repeat(np.rint(np.clip(arr, 0, 1) * 255).astype(np.uint8)[:, :, None], 3, axis=2)
        }
    }

    print("Rendering regional HRSC 30 m tiles...")
    tiles = render_tiles(REGIONAL_ASSETS, extent_inner, grid_data, zoom_range=(5, 14))

    # Coverage GeoJSON
    w, s, e, n = extent_inner
    coverage = {
        "type": "FeatureCollection",
        "marswalk_reference": {
            "body": "Mars",
            "latitude_type": "planetocentric",
            "longitude_direction": "east",
            "resolution_m": 30.0,
            "dataset": "Gale HRSC 30 m DTM Mosaic (Persaud et al., 2021; DOI: 10.5281/zenodo.5808354)"
        },
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "source": "Gale HRSC 30 m DTM Mosaic",
                    "coverage_percent_overview": coverage_overview(support, extent_inner)['valid_percent'],
                    "resolution_m": 30,
                    "vertical_datum": "Metres relative to MOLA areoid, positive up",
                    "disclaimer": "CTX alignment unverified locally. Not for astronaut hazard or safety routing."
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[w, s], [e, s], [e, n], [w, n], [w, s]]]
                }
            }
        ]
    }
    write_json(REGIONAL_ASSETS / "coverage.geojson", coverage)

    return {
        "product_id": "hrsc_km09_h1938_h1927_h1916-dtm-mosaic",
        "source_metadata": metadata,
        "source_sha256": sha256(raw_path.read_bytes()).hexdigest(),
        "source_md5": hashlib.md5(raw_path.read_bytes()).hexdigest(),
        "native_valid_coverage": coverage_overview(valid_raw, extent_wsen),
        "derived_valid_coverage": coverage_overview(support, extent_inner),
        "spatial_resolution_m": 30,
        "extent_wsen": extent_inner,
        "valid_analysis_cells": int(support.sum()),
        "total_analysis_cells": int(support.size),
        "elevation_m": {
            "min": float(elev_inner[support].min()),
            "max": float(elev_inner[support].max()),
            "mean": float(elev_inner[support].mean()),
            "percentiles_5_50_95": np.percentile(elev_inner[support], [5, 50, 95]).tolist()
        },
        "slope_deg": {
            "min": float(slope[support].min()),
            "max": float(slope[support].max()),
            "mean": float(slope[support].mean()),
            "percentiles_5_50_95": np.percentile(slope[support], [5, 50, 95]).tolist()
        },
        "hillshade": {
            "min": float(hillshade[support].min()),
            "max": float(hillshade[support].max()),
            "mean": float(hillshade[support].mean()),
        },
        "tile_count": len(tiles),
        "tile_bytes": sum(t["bytes"] for t in tiles.values()),
        "tiles": tiles,
        "coverage_sha256": sha256((REGIONAL_ASSETS / "coverage.geojson").read_bytes()).hexdigest()
    }

def process_usgs_200m():
    raw_path = RAW_DIR / "usgs_hrsc_mola_200m_gale.tif"
    assert raw_path.exists(), f"Missing {raw_path}"
    print("Processing Global HRSC-MOLA 200 m DEM...")

    with rasterio.open(raw_path) as src:
        metadata = source_metadata(src, projected=False)
        z = src.read(1).astype(np.float64)
        transform = src.transform
        extent_wsen = [src.bounds.left, src.bounds.bottom, src.bounds.right, src.bounds.top]
        nodata = src.nodata
        valid_raw = (src.read_masks(1) > 0) & np.isfinite(z)

    print(f"USGS Raw Window shape: {z.shape}, valid posts: {valid_raw.sum()} / {valid_raw.size} ({valid_raw.sum()/valid_raw.size*100:.2f}%)")

    # Latitude of each row
    rows = np.arange(z.shape[0])
    latitudes_deg = transform[5] + (rows + 0.5) * transform[4]
    step_m = MARS_RADIUS_M * math.radians(transform[0])

    slope, hillshade, support = terrain_fields(z, valid_raw, step_m, latitudes_deg, azimuth_deg=315, altitude_deg=45)

    elev_inner = z[1:-1, 1:-1]
    extent_inner = [
        extent_wsen[0] + transform[0],
        extent_wsen[1] - transform[4],
        extent_wsen[2] - transform[0],
        extent_wsen[3] + transform[4]
    ]

    elevation_lut = rgb_table(ELEVATION_COLORS)
    slope_lut = rgb_table(SLOPE_COLORS)

    grid_data = {
        "elevation": {
            "data": elev_inner,
            "valid": support,
            "extent": extent_inner,
            "colorize": lambda arr: elevation_lut[np.digitize(arr, ELEVATION_BREAKS)]
        },
        "slope": {
            "data": slope,
            "valid": support,
            "extent": extent_inner,
            "colorize": lambda arr: slope_lut[np.digitize(arr, SLOPE_BREAKS)]
        },
        "hillshade": {
            "data": hillshade,
            "valid": support,
            "extent": extent_inner,
            "colorize": lambda arr: np.repeat(np.rint(np.clip(arr, 0, 1) * 255).astype(np.uint8)[:, :, None], 3, axis=2)
        }
    }

    print("Rendering global HRSC-MOLA 200 m tiles...")
    tiles = render_tiles(GLOBAL_ASSETS, extent_inner, grid_data, zoom_range=(5, 14))

    w, s, e, n = extent_inner
    coverage = {
        "type": "FeatureCollection",
        "marswalk_reference": {
            "body": "Mars",
            "latitude_type": "planetocentric",
            "longitude_direction": "east",
            "resolution_m": 200.0,
            "dataset": "USGS HRSC-MOLA Blended DEM Global 200m v2 (Fergason et al., 2018)"
        },
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "source": "USGS HRSC-MOLA Blended DEM Global 200m",
                    "coverage_percent_overview": coverage_overview(support, extent_inner)['valid_percent'],
                    "resolution_m": 200,
                    "vertical_datum": "Metres relative to MOLA areoid, positive up",
                    "disclaimer": "CTX alignment unverified. Broad 200 m baseline does not resolve hazards or traversability."
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[w, s], [e, s], [e, n], [w, n], [w, s]]]
                }
            }
        ]
    }
    write_json(GLOBAL_ASSETS / "coverage.geojson", coverage)

    return {
        "product_id": "Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2",
        "source_metadata": metadata,
        "source_sha256": sha256(raw_path.read_bytes()).hexdigest(),
        "native_valid_coverage": coverage_overview(valid_raw, extent_wsen),
        "derived_valid_coverage": coverage_overview(support, extent_inner),
        "spatial_resolution_m": 200,
        "extent_wsen": extent_inner,
        "valid_analysis_cells": int(support.sum()),
        "total_analysis_cells": int(support.size),
        "elevation_m": {
            "min": float(elev_inner[support].min()),
            "max": float(elev_inner[support].max()),
            "mean": float(elev_inner[support].mean()),
            "percentiles_5_50_95": np.percentile(elev_inner[support], [5, 50, 95]).tolist()
        },
        "slope_deg": {
            "min": float(slope[support].min()),
            "max": float(slope[support].max()),
            "mean": float(slope[support].mean()),
            "percentiles_5_50_95": np.percentile(slope[support], [5, 50, 95]).tolist()
        },
        "hillshade": {
            "min": float(hillshade[support].min()),
            "max": float(hillshade[support].max()),
            "mean": float(hillshade[support].mean()),
        },
        "tile_count": len(tiles),
        "tile_bytes": sum(t["bytes"] for t in tiles.values()),
        "tiles": tiles,
        "coverage_sha256": sha256((GLOBAL_ASSETS / "coverage.geojson").read_bytes()).hexdigest()
    }

def main():
    print("=== GALE TERRAIN PREPARATION (G4) ===")
    hrsc_audit = process_hrsc_30m()
    usgs_audit = process_usgs_200m()
    local_polygon = json.loads((ROOT/'public/maps/gale/dem/coverage.geojson').read_text())['features'][0]['geometry']['coordinates'][0]
    local_x, local_y = zip(*local_polygon)
    local_coverage = coverage_overview(np.ones((1, 1), dtype=bool), [min(local_x), min(local_y), max(local_x), max(local_y)])

    audit = {
        "milestone": "G4",
        "title": "Gale Regional Terrain Coverage Expansion Audit",
        "marswalk_reference": {
            "body": "Mars",
            "sphere_radius_m": MARS_RADIUS_M,
            "latitude_type": "planetocentric",
            "longitude_direction": "east",
            "longitude_range": "0-360"
        },
        "overview_footprint": GALE_OVERVIEW_BOUNDS,
        "coverage_evaluation": {
            "local_pds_1m_coverage_pct": round(local_coverage['valid_percent'], 2),
            "local_pds_precise_valid_footprint_pct": local_coverage['valid_percent'],
            "regional_hrsc_30m_coverage_pct": hrsc_audit['native_valid_coverage']['valid_percent'],
            "global_usgs_200m_coverage_pct": usgs_audit['native_valid_coverage']['valid_percent'],
            "combined_real_data_coverage_pct": max(hrsc_audit['derived_valid_coverage']['valid_percent'], usgs_audit['derived_valid_coverage']['valid_percent']),
            "combined_metric": "At least the larger independently measured valid coverage; both sources cover the full overview",
            "added_gap_filling": False,
            "display_resampling": "Inverse XYZ pixel centers sampled nearest-neighbor from the native-derived grid, with nearest GPU texture resampling. Display pixels can repeat a source cell; they are not independent observations. Source-authored stereo reconstruction/blending/interpolation retained; no new gap filling by this pipeline."
        },
        "regional_hrsc_30m": hrsc_audit,
        "global_usgs_200m": usgs_audit,
        "registration_gate": {
            "decision": "Visualization allowed with explicit scientific caveats; pixel-level CTX co-registration NOT verified.",
            "operational_routing_allowed": False,
            "hazard_assessment_certified": False,
            "rationale": "Sources report MOLA-referenced terrain heights on the declared Mars sphere. Coordinate compatibility is not independent CTX/USGS-color registration or measured local positional accuracy; the cause of residual image differences remains unestablished."
        }
    }

    write_json(AUDIT_FILE, audit)
    print(f"\nAudit report written to {AUDIT_FILE}")
    print(f"Regional tiles: {hrsc_audit['tile_count']} tiles ({hrsc_audit['tile_bytes'] / 1024:.1f} KB)")
    print(f"Global tiles: {usgs_audit['tile_count']} tiles ({usgs_audit['tile_bytes'] / 1024:.1f} KB)")
    print("Preparation complete.")

if __name__ == "__main__":
    main()
