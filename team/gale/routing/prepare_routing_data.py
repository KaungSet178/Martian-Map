"""Build the committed Gale routing crops and checksum manifest.

This script reads the authentic numeric G4 source rasters from an ignored
``output/g4/raw`` directory, extracts the audited Gale windows, writes compact
GeoTIFFs under ``data/routing/gale/``, and records measured provenance.

It never overwrites or modifies the source rasters.  Rendered PNG tiles are not
read; only numeric elevation bands are used.

Usage (from the repository root)::

    python -m team.gale.routing.prepare_routing_data \
        --source-dir "D:/martian-map-gale-terrain/output/g4/raw"
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import rasterio
from rasterio.windows import Window

from .datasets import (
    COARSE_DATASET_ID,
    DATA_DIR,
    MANIFEST_PATH,
    PRIMARY_DATASET_ID,
    SPECS,
)
from .grid import load_grid
from .terrain import MARS_RADIUS_M

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_SOURCE_DIR = ROOT / "output" / "g4" / "raw"
HRSC_FILENAME = "hrsc_km09_h1938_h1927_h1916-dtm-mosaic.tif"
USGS_FILENAME = "usgs_hrsc_mola_200m_gale.tif"

# Gale overview bounds from regions/gale/config.ts.  A 1 km buffer is added so
# every edge of the overview has a complete Horn 3x3 neighbourhood.
GALE_OVERVIEW_BOUNDS = {
    "west_east": 137.3442352329006,
    "east_east": 137.4579431096443,
    "south_latitude": -4.822361175063087,
    "north_latitude": -4.580605407446296,
}
BUFFER_M = 1000.0


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _md5(path: Path) -> str:
    digest = hashlib.md5()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _write_window(
    source_path: Path,
    destination: Path,
    window: Window | None,
    *,
    compress: str = "deflate",
) -> dict[str, Any]:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(source_path) as source:
        if window is None:
            data = source.read(1)
            transform = source.transform
            profile = source.profile.copy()
            width, height = source.width, source.height
        else:
            data = source.read(1, window=window)
            transform = source.window_transform(window)
            profile = source.profile.copy()
            width, height = int(window.width), int(window.height)
        tiled = width >= 256 and height >= 256
        profile.update(
            driver="GTiff",
            width=width,
            height=height,
            count=1,
            transform=transform,
            compress=compress,
            predictor=3 if data.dtype.kind == "f" else 2,
            zlevel=9,
            tiled=tiled,
        )
        if tiled:
            profile.update(blockxsize=256, blockysize=256)
        else:
            profile.pop("blockxsize", None)
            profile.pop("blockysize", None)
        # Preserve nodata and CRS exactly.
        with rasterio.open(destination, "w", **profile) as target:
            target.write(data, 1)
    return {
        "width": width,
        "height": height,
        "dtype": str(data.dtype),
        "transform": list(transform)[:6],
    }


def _extract_hrsc(source_dir: Path) -> tuple[Path, dict[str, Any]]:
    source_path = source_dir / HRSC_FILENAME
    if not source_path.is_file():
        raise FileNotFoundError(f"missing HRSC source: {source_path}")
    destination = DATA_DIR / SPECS[PRIMARY_DATASET_ID].filename

    buffer_deg = BUFFER_M / MARS_RADIUS_M * (180.0 / math.pi)
    west = GALE_OVERVIEW_BOUNDS["west_east"] - buffer_deg
    east = GALE_OVERVIEW_BOUNDS["east_east"] + buffer_deg
    south = GALE_OVERVIEW_BOUNDS["south_latitude"] - buffer_deg
    north = GALE_OVERVIEW_BOUNDS["north_latitude"] + buffer_deg

    with rasterio.open(source_path) as source:
        transform = source.transform
        x_west = MARS_RADIUS_M * math.radians(west)
        x_east = MARS_RADIUS_M * math.radians(east)
        y_south = MARS_RADIUS_M * math.radians(south)
        y_north = MARS_RADIUS_M * math.radians(north)
        col_start = int(math.floor((x_west - transform.c) / transform.a))
        col_end = int(math.ceil((x_east - transform.c) / transform.a))
        row_start = int(math.floor((transform.f - y_north) / (-transform.e)))
        row_end = int(math.ceil((transform.f - y_south) / (-transform.e)))
        window = Window(
            col_start,
            row_start,
            col_end - col_start,
            row_end - row_start,
        )
        info = _write_window(source_path, destination, window)
        info["cropWindow"] = [
            int(window.col_off),
            int(window.row_off),
            int(window.width),
            int(window.height),
        ]
        info["sourceWidth"] = source.width
        info["sourceHeight"] = source.height

    return destination, info


def _extract_usgs(source_dir: Path) -> tuple[Path, dict[str, Any]]:
    source_path = source_dir / USGS_FILENAME
    if not source_path.is_file():
        raise FileNotFoundError(f"missing USGS HRSC-MOLA source: {source_path}")
    destination = DATA_DIR / SPECS[COARSE_DATASET_ID].filename
    info = _write_window(source_path, destination, None)
    info["cropWindow"] = [0, 0, info["width"], info["height"]]
    info["sourceWidth"] = info["width"]
    info["sourceHeight"] = info["height"]
    return destination, info


def _dataset_entry(
    dataset_id: str,
    path: Path,
    extraction: dict[str, Any],
    source_path: Path,
) -> dict[str, Any]:
    spec = SPECS[dataset_id]
    grid = load_grid(path, dataset_id, metadata=spec.as_metadata())
    stats = grid.stats()
    return {
        "datasetId": dataset_id,
        "title": spec.title,
        "role": spec.role,
        "path": str(path.relative_to(ROOT)).replace("\\", "/"),
        "sha256": grid.sha256,
        "bytes": path.stat().st_size,
        "width": grid.width,
        "height": grid.height,
        "dtype": extraction["dtype"],
        "crs": grid.crs_name,
        "crsWkt": grid.crs_wkt,
        "transform": extraction["transform"],
        "nodata": grid.nodata,
        "nominalPostingMeters": spec.nominal_posting_m,
        "slopeDerivative": "Horn 3x3",
        "slopeSupportMeters": spec.slope_support_m,
        "validPosts": int(grid.valid_elevation.sum()),
        "validRouteCells": stats["validRouteCells"],
        "totalCells": stats["totalCells"],
        "validFraction": stats["validFraction"],
        "groundAreaKm2": stats["validAreaKm2"],
        "extentWsen": list(grid.extent_wsen),
        "elevationM": stats["elevationM"],
        "slopeDegrees": stats["slopeDegrees"],
        "verticalDatum": "MOLA areoid, metres positive up",
        "horizontalDatum": (
            "Mars 2000 sphere R=3,396,190 m; planetocentric latitude; "
            "east-positive longitude 0-360"
        ),
        "source": {
            "path": source_path.name,
            "bytes": source_path.stat().st_size,
            "sha256": _sha256(source_path),
            "md5": _md5(source_path),
            "product": spec.product,
            "publisher": spec.publisher,
            "citation": spec.citation,
            "url": spec.source_url,
        },
        "crop": {
            "method": (
                "Gale overview bounds plus 1 km derivative buffer"
                if dataset_id == PRIMARY_DATASET_ID
                else "Pre-extracted Gale regional window"
            ),
            "window": extraction["cropWindow"],
            "sourceDimensions": [
                extraction["sourceWidth"],
                extraction["sourceHeight"],
            ],
            "overviewBounds": GALE_OVERVIEW_BOUNDS,
        },
        "processing": {
            "slope": "Horn 3x3 finite difference with per-row cos(latitude) east spacing",
            "nodataPolicy": (
                "Nonfinite posts and the product nodata value are invalid. "
                "A cell is routeable only when all nine 3x3 elevation posts are "
                "valid. No filling, interpolation, or smoothing across gaps."
            ),
            "distanceModel": (
                "Mars 2000 sphere R=3,396,190 m; per-row east ground spacing "
                "and 8-connected diagonal hypot"
            ),
            "displayTilesUsedAsData": False,
        },
        "registration": {
            "status": "UNVERIFIED",
            "reason": (
                "Precise local DEM-to-CTX co-registration is not certified. "
                "Published coordinates are retained; no shift was fitted."
            ),
            "reference": "team/gale/G3_2_REPORT.md; G4_TERRAIN_AUDIT.json",
        },
        "limitations": list(spec.limitations),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source-dir",
        type=Path,
        default=DEFAULT_SOURCE_DIR,
        help="Directory containing the authentic G4 raw GeoTIFFs.",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=DATA_DIR,
        help="Destination for compact routing GeoTIFFs and the manifest.",
    )
    parser.add_argument(
        "--skip-source-hashes",
        action="store_true",
        help="Skip full-file source MD5/SHA-256 hashing (faster).",
    )
    args = parser.parse_args()

    source_dir = args.source_dir.resolve()
    out_dir = args.out_dir.resolve()
    if source_dir == out_dir:
        raise SystemExit("refusing to overwrite the source raster directory")
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Source directory: {source_dir}")
    print(f"Destination:      {out_dir}")

    hrsc_path, hrsc_info = _extract_hrsc(source_dir)
    usgs_path, usgs_info = _extract_usgs(source_dir)

    entries: dict[str, Any] = {}
    for dataset_id, path, extraction, source_name in (
        (PRIMARY_DATASET_ID, hrsc_path, hrsc_info, HRSC_FILENAME),
        (COARSE_DATASET_ID, usgs_path, usgs_info, USGS_FILENAME),
    ):
        source_path = source_dir / source_name
        print(f"Auditing {dataset_id} ...")
        entry = _dataset_entry(dataset_id, path, extraction, source_path)
        if args.skip_source_hashes:
            entry["source"].pop("sha256", None)
            entry["source"].pop("md5", None)
        entries[dataset_id] = entry
        print(
            f"  {entry['width']}x{entry['height']}  "
            f"valid route cells={entry['validRouteCells']}  "
            f"area={entry['groundAreaKm2']:.3f} km2  "
            f"sha256={entry['sha256'][:16]}..."
        )

    manifest = {
        "schemaVersion": "gale-routing-datasets-v1",
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "regionId": "gale",
        "reference": {
            "body": "Mars",
            "sphereRadiusM": MARS_RADIUS_M,
            "latitudeType": "planetocentric",
            "longitudeDirection": "east",
            "longitudeRange": "0-360",
            "verticalDatum": "MOLA areoid, metres positive up",
        },
        "productsAreNotBlended": (
            "The 30 m HRSC and 200 m HRSC-MOLA crops are distinct products. "
            "They are never averaged, resampled together, or presented as one "
            "uniform high-resolution DEM."
        ),
        "datasets": entries,
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Wrote {MANIFEST_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
