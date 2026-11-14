"""Registry for the two distinct, non-blended Gale routing DEM products.

* ``gale-hrsc-30m`` - regional HRSC 30 m DTM crop, primary routing product.
* ``gale-hrsc-mola-200m`` - USGS HRSC-MOLA blended 200 m crop, coarse
  regional comparison only.

The two products are never averaged, resampled into one another, or presented
as a uniform high-resolution surface.  Each route names exactly one dataset.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from .grid import RoutingGrid, load_grid

ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT / "data" / "routing" / "gale"
MANIFEST_PATH = DATA_DIR / "dataset-manifest.json"

PRIMARY_DATASET_ID = "gale-hrsc-30m"
COARSE_DATASET_ID = "gale-hrsc-mola-200m"

REGISTRATION_REFERENCE = (
    "team/gale/G3_2_REPORT.md and team/gale/REGISTRATION_INVESTIGATION.md; "
    "G4_TERRAIN_AUDIT.json registration gate"
)


@dataclass(frozen=True)
class DatasetSpec:
    dataset_id: str
    title: str
    role: str
    filename: str
    nominal_posting_m: int
    slope_support_m: dict[str, Any]
    product: str
    publisher: str
    citation: str
    source_url: str
    limitations: tuple[str, ...]
    source_verified: bool = True

    def as_metadata(self) -> dict[str, Any]:
        return {
            "datasetId": self.dataset_id,
            "title": self.title,
            "role": self.role,
            "nominalPostingMeters": self.nominal_posting_m,
            "slopeDerivative": "Horn 3x3",
            "slopeSupportMeters": self.slope_support_m,
            "product": self.product,
            "publisher": self.publisher,
            "citation": self.citation,
            "sourceUrl": self.source_url,
            "verticalDatum": "MOLA areoid, metres positive up",
            "horizontalDatum": (
                "Mars 2000 sphere R=3,396,190 m; planetocentric latitude; "
                "east-positive longitude 0-360"
            ),
            "registrationReference": REGISTRATION_REFERENCE,
            "sourceVerified": self.source_verified,
            "limitations": list(self.limitations),
        }


SPECS: dict[str, DatasetSpec] = {
    PRIMARY_DATASET_ID: DatasetSpec(
        dataset_id=PRIMARY_DATASET_ID,
        title="Gale HRSC 30 m DTM routing crop",
        role="primary",
        filename="gale-hrsc-30m-routing.tif",
        nominal_posting_m=30,
        slope_support_m={
            "northMeters": 90.0,
            "eastMeters": 89.7,
            "note": (
                "Horn 3x3 support: three 30 m north steps; east support is "
                "three ground steps corrected by cos(planetocentric latitude), "
                "about 89.7 m at 4.7 deg S."
            ),
        },
        product="hrsc_km09_h1938_h1927_h1916-dtm-mosaic",
        publisher="ESA / DLR / Freie Universitat Berlin / NASA JPL",
        citation=(
            "Persaud et al. (2021), 30 m HRSC DTM mosaic of Gale Crater, "
            "DOI 10.5281/zenodo.5808354"
        ),
        source_url=(
            "https://zenodo.org/records/5808354/files/"
            "hrsc_km09_h1938_h1927_h1916-dtm-mosaic.tif"
        ),
        limitations=(
            "30 m posting is a grid spacing, not a guaranteed 30 m effective "
            "resolving power.",
            "Horn 3x3 slopes have approximately 90 m support and smooth out "
            "boulders, small scarps, sand traps, and suit-scale obstacles.",
            "Absolute horizontal/vertical accuracy and slope error are not "
            "quantitatively certified.",
            "CTX optical co-registration is unverified locally; no shift was "
            "applied.",
            "The crop covers the audited Gale exploration footprint plus a "
            "1 km derivative buffer, not all of Gale Crater.",
            "No roughness, obstacle, trafficability, or hazard dataset is "
            "included.",
        ),
    ),
    COARSE_DATASET_ID: DatasetSpec(
        dataset_id=COARSE_DATASET_ID,
        title="Gale HRSC-MOLA 200 m blended DEM routing crop",
        role="coarse-regional-comparison",
        filename="gale-hrsc-mola-200m-routing.tif",
        nominal_posting_m=200,
        slope_support_m={
            "northMeters": 600.0,
            "eastMeters": 598.0,
            "note": (
                "Horn 3x3 support: three 200 m north steps; east support is "
                "about 598 m at 4.7 deg S."
            ),
        },
        product="Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2",
        publisher="USGS Astrogeology Science Center / NASA / ESA",
        citation="Fergason, Hare, and Laura (2018), USGS HRSC-MOLA blended DEM",
        source_url=(
            "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/"
            "HRSC_MOLA_Blend/Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif"
        ),
        limitations=(
            "200 m posting and approximately 600 m gradient support are far "
            "too coarse for suit-scale or rover-scale hazard assessment.",
            "The product blends HRSC and MOLA observations; local source "
            "quality and seams are not mapped per pixel.",
            "CTX optical co-registration is unverified locally.",
            "This crop is a regional comparison product, not a replacement "
            "for the 30 m primary routing grid.",
            "No roughness, obstacle, trafficability, or hazard dataset is "
            "included.",
        ),
    ),
}


def dataset_manifest() -> dict[str, Any]:
    """Return the committed dataset manifest (checksums and measured stats)."""
    if not MANIFEST_PATH.is_file():
        raise FileNotFoundError(
            f"routing dataset manifest is missing: {MANIFEST_PATH}"
        )
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def dataset_specs() -> list[dict[str, Any]]:
    """Return serialisable metadata for both registered products."""
    manifest = dataset_manifest().get("datasets", {})
    result = []
    for dataset_id, spec in SPECS.items():
        entry = {
            **spec.as_metadata(),
            "path": str((DATA_DIR / spec.filename).relative_to(ROOT)).replace(
                "\\", "/"
            ),
        }
        measured = manifest.get(dataset_id, {})
        for key in (
            "sha256",
            "bytes",
            "width",
            "height",
            "validPosts",
            "validRouteCells",
            "totalCells",
            "extentWsen",
            "groundAreaKm2",
            "elevationM",
            "slopeDegrees",
        ):
            if key in measured:
                entry[key] = measured[key]
        result.append(entry)
    return result


@lru_cache(maxsize=4)
def _load_cached(dataset_id: str, manifest_mtime_ns: int) -> RoutingGrid:
    del manifest_mtime_ns
    if dataset_id not in SPECS:
        raise ValueError(
            f"unknown Gale routing dataset {dataset_id!r}; "
            f"choose one of {sorted(SPECS)}"
        )
    spec = SPECS[dataset_id]
    manifest = dataset_manifest()
    entry = manifest.get("datasets", {}).get(dataset_id)
    if not entry:
        raise ValueError(
            f"dataset {dataset_id!r} is absent from {MANIFEST_PATH.name}"
        )
    expected_sha = entry.get("sha256")
    if not expected_sha:
        raise ValueError(f"dataset {dataset_id!r} has no checksum in the manifest")
    return load_grid(
        DATA_DIR / spec.filename,
        dataset_id,
        expected_sha256=expected_sha,
        metadata=spec.as_metadata(),
    )


def load_dataset(dataset_id: str = PRIMARY_DATASET_ID) -> RoutingGrid:
    """Load and checksum-verify one numeric routing dataset."""
    mtime = MANIFEST_PATH.stat().st_mtime_ns if MANIFEST_PATH.is_file() else 0
    return _load_cached(dataset_id, mtime)


def clear_cache() -> None:
    """Clear the in-process dataset cache (used by tests)."""
    _load_cached.cache_clear()
