#!/usr/bin/env python3
"""
Marswalk Planner — Jezero Crater Authentic Routing Grid Builder

Derives a verified, authentic 25-meter computational routing cost grid from the
official USGS Mars 2020 TRN HiRISE DTM mosaic:
JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40
(DOI 10.5066/P9REJ9JN).

Outputs:
  data/routing/jezero/jezero_routing_grid.json
  data/routing/jezero/jezero_routing_metadata.json

Scientific safeguards:
- Requires exact SHA256 match for source GeoTIFF.
- No invented elevations or gap filling.
- Strict nodata propagation on cells and gradient support.
- Mars spherical metric distances (R = 3,396,190.0 m, Equirectangular latTs0=0).
- Does NOT claim certified human traversability or EVA safety.
"""

import hashlib
import json
import math
import sys
from pathlib import Path
import numpy as np
import rasterio
from rasterio.windows import Window

EXPECTED_SHA256 = "44c3819caa33922b06f7a8228534d1e32ab4087aca85144136d825c371c747d8"
EXPECTED_BYTES = 1839545409
MARS_RADIUS = 3396190.0
DEG_TO_RAD = math.pi / 180.0
RAD_TO_DEG = 180.0 / math.pi
NODATA_SENTINEL = -9999.0

# Computational resolution: 25 meters posting (25 native DTM pixels)
BLOCK_SIZE = 25
GRID_SPACING_METERS = 25.0

# Geographic window covering Perseverance mission exploration area
# Bounds in native DTM pixel coordinates (col_min, row_min, n_cols, n_rows)
# Derived to span 77.225E - 77.480E and 18.405N - 18.495N
COL_START = 125  # corresponds to ~77.22502 deg E
ROW_START = 10332  # corresponds to ~18.49479 deg N
N_BLOCKS_X = 604  # 604 * 25 = 15,100 px (~14.3 km easting)
N_BLOCKS_Y = 213  # 213 * 25 = 5,325 px (~5.3 km northing)


def verify_sha256(file_path: Path) -> str:
    print(f"Calculating SHA256 of {file_path}...")
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(16 * 1024 * 1024), b""):
            h.update(chunk)
    digest = h.hexdigest()
    if digest != EXPECTED_SHA256:
        raise ValueError(
            f"SHA256 mismatch! Expected {EXPECTED_SHA256}, got {digest}"
        )
    print(f"SHA256 verified: {digest}")
    return digest


def build_grid(
    source_path: Path, out_grid_path: Path, out_meta_path: Path
):
    source_sha = verify_sha256(source_path)

    with rasterio.open(source_path) as src:
        ul_x, ul_y = src.transform.c, src.transform.f
        nodata = src.nodata

        # Compute exact bounding coordinates for the routing grid
        # Upper-left corner of the grid
        grid_ul_easting = ul_x + COL_START * src.transform.a
        grid_ul_northing = ul_y + ROW_START * src.transform.e

        grid_width_meters = N_BLOCKS_X * BLOCK_SIZE * src.transform.a
        grid_height_meters = abs(N_BLOCKS_Y * BLOCK_SIZE * src.transform.e)

        west_lon = (grid_ul_easting / MARS_RADIUS) * RAD_TO_DEG
        east_lon = ((grid_ul_easting + grid_width_meters) / MARS_RADIUS) * RAD_TO_DEG
        north_lat = (grid_ul_northing / MARS_RADIUS) * RAD_TO_DEG
        south_lat = ((grid_ul_northing - grid_height_meters) / MARS_RADIUS) * RAD_TO_DEG
        center_lat = (north_lat + south_lat) / 2.0

        print(f"Routing grid bounds: Lon [{west_lon:.6f}, {east_lon:.6f}] E, Lat [{south_lat:.6f}, {north_lat:.6f}] N")
        print(f"Grid dimensions: {N_BLOCKS_X} cols x {N_BLOCKS_Y} rows ({N_BLOCKS_X * N_BLOCKS_Y} cells)")
        print(f"Nominal resolution: {GRID_SPACING_METERS} m")

        # Read native 1m DTM window
        window = Window(
            COL_START, ROW_START, N_BLOCKS_X * BLOCK_SIZE, N_BLOCKS_Y * BLOCK_SIZE
        )
        print("Reading native 1m DTM raster window...")
        data = src.read(1, window=window)

    print("Downsampling to 25m posting with strict nodata handling...")
    # Reshape data into (N_BLOCKS_Y, BLOCK_SIZE, N_BLOCKS_X, BLOCK_SIZE)
    reshaped = data.reshape(
        N_BLOCKS_Y, BLOCK_SIZE, N_BLOCKS_X, BLOCK_SIZE
    ).swapaxes(1, 2)

    valid_mask = (reshaped != nodata) & np.isfinite(reshaped)
    valid_counts = np.sum(valid_mask, axis=(2, 3))

    # Strict rule: at least 90% of the 25x25 kernel (562/625 posts) must be valid
    cell_valid = valid_counts >= (BLOCK_SIZE * BLOCK_SIZE * 0.90)

    # Compute mean elevation of valid posts per block
    sum_elev = np.sum(np.where(valid_mask, reshaped, 0.0), axis=(2, 3))
    with np.errstate(divide="ignore", invalid="ignore"):
        mean_elev = np.where(cell_valid, sum_elev / valid_counts, NODATA_SENTINEL)

    # Round elevations to 0.1 m precision
    elev_grid = np.where(
        cell_valid, np.round(mean_elev, 1), NODATA_SENTINEL
    )

    print("Deriving slope grid using central differences on Mars sphere...")
    cos_lat = math.cos(center_lat * DEG_TO_RAD)
    dx_meters = GRID_SPACING_METERS * cos_lat
    dy_meters = GRID_SPACING_METERS

    slope_grid = np.full((N_BLOCKS_Y, N_BLOCKS_X), NODATA_SENTINEL, dtype=np.float32)

    # Interior central difference: 1 <= r < H-1, 1 <= c < W-1
    for r in range(1, N_BLOCKS_Y - 1):
        for c in range(1, N_BLOCKS_X - 1):
            if not cell_valid[r, c]:
                continue
            # Check 4-cardinal neighbors for strict derivative support
            if (
                not cell_valid[r, c - 1]
                or not cell_valid[r, c + 1]
                or not cell_valid[r - 1, c]
                or not cell_valid[r + 1, c]
            ):
                # Boundary neighbor missing; fallback to single-sided difference if valid, else nodata
                dz_de = None
                if cell_valid[r, c + 1] and cell_valid[r, c]:
                    dz_de = (elev_grid[r, c + 1] - elev_grid[r, c]) / dx_meters
                elif cell_valid[r, c] and cell_valid[r, c - 1]:
                    dz_de = (elev_grid[r, c] - elev_grid[r, c - 1]) / dx_meters

                dz_dn = None
                if cell_valid[r - 1, c] and cell_valid[r, c]:
                    dz_dn = (elev_grid[r - 1, c] - elev_grid[r, c]) / dy_meters
                elif cell_valid[r, c] and cell_valid[r + 1, c]:
                    dz_dn = (elev_grid[r, c] - elev_grid[r + 1, c]) / dy_meters

                if dz_de is not None and dz_dn is not None:
                    mag = math.hypot(dz_de, dz_dn)
                    slope_deg = math.atan(mag) * RAD_TO_DEG
                    slope_grid[r, c] = round(slope_deg, 1)
                continue

            # Central differences
            dz_de = (elev_grid[r, c + 1] - elev_grid[r, c - 1]) / (2.0 * dx_meters)
            dz_dn = (elev_grid[r - 1, c] - elev_grid[r + 1, c]) / (2.0 * dy_meters)
            mag = math.hypot(dz_de, dz_dn)
            slope_deg = math.atan(mag) * RAD_TO_DEG
            slope_grid[r, c] = round(slope_deg, 1)

    # Mask cells that have valid elevation but no slope
    cell_valid = cell_valid & (slope_grid != NODATA_SENTINEL)
    elev_grid[~cell_valid] = NODATA_SENTINEL
    slope_grid[~cell_valid] = NODATA_SENTINEL

    valid_cells = int(np.sum(cell_valid))
    total_cells = N_BLOCKS_X * N_BLOCKS_Y
    valid_share = valid_cells / total_cells

    valid_elevs = elev_grid[cell_valid]
    valid_slopes = slope_grid[cell_valid]

    elev_min = float(np.min(valid_elevs))
    elev_max = float(np.max(valid_elevs))
    slope_min = float(np.min(valid_slopes))
    slope_max = float(np.max(valid_slopes))
    slope_p50 = float(np.percentile(valid_slopes, 50))
    slope_p90 = float(np.percentile(valid_slopes, 90))
    slope_p98 = float(np.percentile(valid_slopes, 98))

    print(f"Valid cells: {valid_cells}/{total_cells} ({valid_share:.1%})")
    print(f"Elevation range: [{elev_min:.1f}, {elev_max:.1f}] m")
    print(f"Slope range: [{slope_min:.1f}, {slope_max:.1f}] deg (p50: {slope_p50:.1f}, p90: {slope_p90:.1f}, p98: {slope_p98:.1f})")

    metadata = {
        "datasetId": "jezero-usgs-trn-dtm-routing-25m",
        "sourceProduct": "JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40",
        "doi": "https://doi.org/10.5066/P9REJ9JN",
        "crs": "PROJCS[\"Equirectangular Mars 2000 Sphere IAU\"]",
        "projection": "Equirectangular",
        "marsRadiusMeters": MARS_RADIUS,
        "standardParallelDegrees": 0.0,
        "centerLongitudeDegrees": 0.0,
        "gridSpacingMeters": GRID_SPACING_METERS,
        "width": N_BLOCKS_X,
        "height": N_BLOCKS_Y,
        "bounds": {
            "west": round(west_lon, 6),
            "east": round(east_lon, 6),
            "south": round(south_lat, 6),
            "north": round(north_lat, 6),
        },
        "elevationRangeMeters": [elev_min, elev_max],
        "slopeRangeDegrees": [slope_min, slope_max],
        "slopePercentiles": {
            "p50": slope_p50,
            "p90": slope_p90,
            "p98": slope_p98,
        },
        "nodataValue": NODATA_SENTINEL,
        "sourceSha256": source_sha,
        "sourceBytes": EXPECTED_BYTES,
        "totalCells": total_cells,
        "validCells": valid_cells,
        "validFraction": round(valid_share, 4),
        "derivationMethod": "Block mean of authentic 1m DTM posts; slope via central differences with Mars spherical scale cos(latitude).",
        "scientificCaveats": [
            "Derived computational grid for pathfinding; not a substitute for full 1m DTM posts.",
            "Slope is an algorithmic traversal penalty, NOT a certified EVA or astronaut safety limit.",
            "Nodata cells outside valid DEM coverage are strictly impassable.",
            "Registration accuracy reflects USGS TRN HiRISE baseline; absolute horizontal registration is UNVERIFIED."
        ]
    }

    out_meta_path.parent.mkdir(parents=True, exist_ok=True)
    out_meta_path.write_text(json.dumps(metadata, indent=2) + "\n")
    print(f"Wrote metadata to {out_meta_path}")

    # Write compact routing grid JSON
    grid_payload = {
        "metadata": metadata,
        "elevations": elev_grid.flatten().tolist(),
        "slopes": slope_grid.flatten().tolist(),
        "validMask": cell_valid.astype(int).flatten().tolist(),
    }

    out_grid_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_grid_path, "w", encoding="utf-8") as f:
        json.dump(grid_payload, f, separators=(",", ":"))

    grid_bytes = out_grid_path.stat().st_size
    print(f"Wrote routing grid to {out_grid_path} ({grid_bytes / 1024 / 1024:.2f} MB)")


if __name__ == "__main__":
    src = Path("team/jezero/terrain/source/jezero-dtm.tif")
    out_grid = Path("data/routing/jezero/jezero_routing_grid.json")
    out_meta = Path("data/routing/jezero/jezero_routing_metadata.json")

    if not src.exists():
        print(f"Source file {src} not found!")
        sys.exit(1)

    build_grid(src, out_grid, out_meta)
