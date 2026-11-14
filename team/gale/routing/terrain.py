"""Terrain mathematics for the Gale terrain-aware routing engine.

All horizontal quantities are metres on the PDS Mars 2000 reference sphere
(R = 3,396,190 m).  Vertical quantities are metres relative to the MOLA
areoid, positive up.

This module deliberately contains no Earth assumptions: no WGS84 radius, no
ellipsoidal geodesy, and no degrees-to-metres shortcut.  Equirectangular
raster spacing is converted to ground distance with the local
``cos(planetocentric_latitude)`` factor, and every route distance is checked
against a spherical haversine calculation.
"""

from __future__ import annotations

import math
from typing import Iterable

import numpy as np

MARS_RADIUS_M = 3_396_190.0
DEG_TO_RAD = math.pi / 180.0
RAD_TO_DEG = 180.0 / math.pi


def normalize_longitude(longitude: float) -> float:
    """Normalise an east-positive longitude to the project's [0, 360) range."""
    value = float(longitude) % 360.0
    if value < 0.0:
        value += 360.0
    if value >= 360.0:
        value = 0.0
    return value


def haversine_m(
    lon1: float,
    lat1: float,
    lon2: float,
    lat2: float,
    radius_m: float = MARS_RADIUS_M,
) -> float:
    """Great-circle surface distance between two Mars coordinates, in metres."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = phi2 - phi1
    dlambda = math.radians(normalize_longitude(lon2) - normalize_longitude(lon1))
    # Avoid the antipodal rounding problem by using the haversine form.
    h = (
        math.sin(dphi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    )
    h = min(1.0, max(0.0, h))
    return 2.0 * radius_m * math.asin(math.sqrt(h))


def initial_bearing_deg(
    lon1: float, lat1: float, lon2: float, lat2: float
) -> float:
    """Initial great-circle bearing in degrees clockwise from north."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dlambda = math.radians(normalize_longitude(lon2) - normalize_longitude(lon1))
    y = math.sin(dlambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(
        dlambda
    )
    return (math.degrees(math.atan2(y, x)) + 360.0) % 360.0


def horn_slope(
    elevation: np.ndarray,
    valid: np.ndarray,
    east_step_m: np.ndarray,
    north_step_m: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    """Compute Horn 3x3 slope magnitude with per-row metric spacing.

    Parameters
    ----------
    elevation:
        2-D elevation array in metres (MOLA areoid).
    valid:
        Boolean array marking finite, non-nodata elevation posts.
    east_step_m:
        Ground distance in metres between adjacent column centres for each row.
        On an equirectangular Mars grid this is approximately
        ``pixel_size * cos(planetocentric_latitude)``.
    north_step_m:
        Ground distance in metres between adjacent row centres for each row.

    Returns
    -------
    slope_deg, support:
        Slope magnitude in degrees and the boolean mask of cells whose full
        3x3 neighbourhood is valid.  Cells outside the supported interior are
        ``NaN``/``False``; no value is interpolated or filled.
    """
    z = np.asarray(elevation, dtype=np.float64)
    valid = np.asarray(valid, dtype=bool)
    east = np.asarray(east_step_m, dtype=np.float64)
    north = np.asarray(north_step_m, dtype=np.float64)

    if z.ndim != 2:
        raise ValueError("elevation must be 2-D")
    height, width = z.shape
    if valid.shape != z.shape:
        raise ValueError("valid mask must match elevation shape")
    if east.shape != (height,) or north.shape != (height,):
        raise ValueError("row spacing arrays must have one value per row")
    if height < 3 or width < 3:
        raise ValueError("Horn 3x3 slope requires at least a 3x3 grid")
    if np.any(~np.isfinite(east)) or np.any(east <= 0.0):
        raise ValueError("east spacing must be finite and positive")
    if np.any(~np.isfinite(north)) or np.any(north <= 0.0):
        raise ValueError("north spacing must be finite and positive")

    filled = np.where(valid, z, 0.0)

    # A cell is supported only when all nine posts are valid.  This is the
    # same strict no-fill policy used by the Gale G3.2/G4 terrain products.
    support_inner = np.ones((height - 2, width - 2), dtype=bool)
    for row_offset in range(3):
        for col_offset in range(3):
            support_inner &= valid[
                row_offset : row_offset + height - 2,
                col_offset : col_offset + width - 2,
            ]

    dx = east[1:-1, None]
    dy = north[1:-1, None]

    # Horn (1981) finite difference.  Raster rows run southward, so the north
    # derivative subtracts the southern row window from the northern one.
    p = (
        filled[:-2, 2:]
        + 2.0 * filled[1:-1, 2:]
        + filled[2:, 2:]
        - filled[:-2, :-2]
        - 2.0 * filled[1:-1, :-2]
        - filled[2:, :-2]
    ) / (8.0 * dx)
    q = (
        filled[:-2, :-2]
        + 2.0 * filled[:-2, 1:-1]
        + filled[:-2, 2:]
        - filled[2:, :-2]
        - 2.0 * filled[2:, 1:-1]
        - filled[2:, 2:]
    ) / (8.0 * dy)

    slope = np.full((height, width), np.nan, dtype=np.float64)
    with np.errstate(invalid="ignore"):
        magnitude = np.degrees(np.arctan(np.hypot(p, q)))
    slope[1:-1, 1:-1] = np.where(support_inner, magnitude, np.nan)
    support = np.zeros((height, width), dtype=bool)
    support[1:-1, 1:-1] = support_inner
    return slope, support


def horizontal_step_m(
    lon1: float,
    lat1: float,
    lon2: float,
    lat2: float,
) -> float:
    """Alias for the great-circle step used in edge accounting."""
    return haversine_m(lon1, lat1, lon2, lat2)


def directional_grade_deg(dz_m: float, horizontal_m: float) -> float:
    """Signed slope angle of a traversed edge, in degrees.

    Positive values are uphill in the direction of travel; negative values are
    downhill.  This is the local edge grade, not the Horn 3x3 cell slope.
    """
    if horizontal_m <= 0.0:
        raise ValueError("horizontal distance must be positive")
    return math.degrees(math.atan2(dz_m, horizontal_m))


def percentile_summary(values: Iterable[float]) -> dict[str, float]:
    """Small helper used by audits and tests to keep output stable."""
    array = np.asarray(list(values), dtype=np.float64)
    array = array[np.isfinite(array)]
    if array.size == 0:
        raise ValueError("no finite values")
    p05, p50, p95 = np.percentile(array, [5.0, 50.0, 95.0])
    return {
        "min": float(array.min()),
        "max": float(array.max()),
        "mean": float(array.mean()),
        "p05": float(p05),
        "p50": float(p50),
        "p95": float(p95),
    }
