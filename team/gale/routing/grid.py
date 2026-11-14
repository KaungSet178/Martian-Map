"""Raster loading, Mars coordinate conversion, and bounded waypoint snapping.

The routing grid is derived from authentic numeric Gale DEM crops.  Display
tiles (PNG colours) are never sampled or decoded as terrain data.

Key guarantees
--------------
* Nodata and unsupported derivative cells are blocked; nothing is filled.
* Distances use the Mars 2000 sphere (R = 3,396,190 m), not Earth geodesy.
* Longitude is east-positive and normalised to [0, 360).
* Snapping is bounded and explicit; it never silently moves a waypoint by
  hundreds of metres.
"""

from __future__ import annotations

import hashlib
import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
import rasterio
from pyproj import CRS, Transformer
from rasterio.transform import Affine

from .terrain import (
    MARS_RADIUS_M,
    haversine_m,
    horn_slope,
    normalize_longitude,
)

MARS_GEOGRAPHIC_PROJ4 = f"+proj=longlat +R={MARS_RADIUS_M} +no_defs"
MAX_SNAP_TOLERANCE_M = 250.0


@dataclass(frozen=True)
class SnapResult:
    """Explicit result of mapping a requested coordinate onto the routing grid."""

    ok: bool
    requested_lon: float
    requested_lat: float
    snapped_lon: float | None
    snapped_lat: float | None
    distance_m: float | None
    row: int | None
    col: int | None
    reason: str
    inside_extent: bool
    searched_cells: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "requested": [self.requested_lon, self.requested_lat],
            "snapped": (
                [self.snapped_lon, self.snapped_lat]
                if self.snapped_lon is not None
                else None
            ),
            "snapDistanceMeters": self.distance_m,
            "reason": self.reason,
            "insideDeclaredExtent": self.inside_extent,
            "searchedCells": self.searched_cells,
            "ok": self.ok,
        }


@dataclass(frozen=True)
class RoutingGrid:
    """An immutable, metric, 8-connected routing grid."""

    dataset_id: str
    path: Path
    sha256: str
    elevation: np.ndarray
    valid_elevation: np.ndarray
    slope_deg: np.ndarray
    valid: np.ndarray
    lon_centers: np.ndarray
    lat_centers: np.ndarray
    east_step_m: np.ndarray
    north_step_m: np.ndarray
    diagonal_step_m: np.ndarray
    cell_area_m2: np.ndarray
    transform: Affine
    crs_wkt: str
    crs_name: str
    nodata: float | None
    width: int
    height: int
    extent_wsen: tuple[float, float, float, float]
    metadata: dict[str, Any] = field(default_factory=dict)

    def index(self, row: int, col: int) -> int:
        return row * self.width + col

    def row_col(self, index: int) -> tuple[int, int]:
        return divmod(int(index), self.width)

    def lonlat(self, row: int, col: int) -> tuple[float, float]:
        return (
            float(self.lon_centers[col]),
            float(self.lat_centers[row]),
        )

    def to_fractional(
        self, longitude: float, latitude: float
    ) -> tuple[float, float, bool]:
        """Map a Mars coordinate to fractional (row, column) cell indices.

        A cell centre is at integer row/column coordinates.  The valid
        half-open interior is [-0.5, size-0.5).
        """
        lon = normalize_longitude(longitude)
        lat = float(latitude)
        if not (math.isfinite(lat) and -90.0 <= lat <= 90.0):
            raise ValueError("latitude must be finite and in [-90, 90]")

        # Both supported products are equirectangular and separable.  The
        # loader has already verified that lon depends only on column and lat
        # only on row, so a direct index interpolation is exact and avoids an
        # inverse projection call per waypoint.
        col = (lon - float(self.lon_centers[0])) / (
            float(self.lon_centers[-1] - self.lon_centers[0])
            / max(1, self.width - 1)
        ) if self.width > 1 else 0.0
        row = (lat - float(self.lat_centers[0])) / (
            float(self.lat_centers[-1] - self.lat_centers[0])
            / max(1, self.height - 1)
        ) if self.height > 1 else 0.0

        inside = (
            -0.5 <= col < self.width - 0.5
            and -0.5 <= row < self.height - 0.5
        )
        return row, col, inside

    def lonlat_to_fractional(
        self, longitude: float, latitude: float
    ) -> tuple[float, float, bool]:
        """Alias with a more explicit name for external callers."""
        return self.to_fractional(longitude, latitude)

    def nearest_valid(
        self,
        longitude: float,
        latitude: float,
        max_snap_m: float = 100.0,
    ) -> SnapResult:
        """Find the nearest routeable cell within an explicit distance bound."""
        if not math.isfinite(max_snap_m) or max_snap_m <= 0.0:
            raise ValueError("max_snap_m must be finite and positive")
        if max_snap_m > MAX_SNAP_TOLERANCE_M:
            raise ValueError(
                f"max_snap_m must not exceed {MAX_SNAP_TOLERANCE_M:.0f} m; "
                "waypoints may not be moved hundreds of metres"
            )

        lon = normalize_longitude(longitude)
        lat = float(latitude)
        row_f, col_f, inside = self.to_fractional(lon, lat)
        row0 = int(min(self.height - 1, max(0, round(row_f))))
        col0 = int(min(self.width - 1, max(0, round(col_f))))

        if self.valid[row0, col0]:
            snapped_lon, snapped_lat = self.lonlat(row0, col0)
            distance = haversine_m(lon, lat, snapped_lon, snapped_lat)
            return SnapResult(
                ok=True,
                requested_lon=lon,
                requested_lat=lat,
                snapped_lon=snapped_lon,
                snapped_lat=snapped_lat,
                distance_m=distance,
                row=row0,
                col=col0,
                reason=(
                    "requested_point_maps_to_valid_cell"
                    if distance <= 1e-6
                    else "nearest_valid_cell"
                ),
                inside_extent=inside,
                searched_cells=1,
            )

        # Bounded ring search around the clamped cell.  The minimum step is a
        # conservative lower bound, so the ring count is sufficient.
        min_step = float(min(np.min(self.east_step_m), np.min(self.north_step_m)))
        if not math.isfinite(min_step) or min_step <= 0.0:
            min_step = 1.0
        max_rings = int(math.ceil(max_snap_m / min_step)) + 1

        best: tuple[float, int, int] | None = None
        searched = 0
        for ring in range(0, max_rings + 1):
            if ring == 0:
                cells = [(row0, col0)]
            else:
                cells = []
                row_lo = max(0, row0 - ring)
                row_hi = min(self.height - 1, row0 + ring)
                col_lo = max(0, col0 - ring)
                col_hi = min(self.width - 1, col0 + ring)
                for r in range(row_lo, row_hi + 1):
                    for c in range(col_lo, col_hi + 1):
                        if abs(r - row0) == ring or abs(c - col0) == ring:
                            cells.append((r, c))
            for r, c in cells:
                searched += 1
                if not self.valid[r, c]:
                    continue
                cell_lon, cell_lat = self.lonlat(r, c)
                distance = haversine_m(lon, lat, cell_lon, cell_lat)
                candidate = (distance, r, c)
                if best is None or candidate < best:
                    best = candidate

        if best is not None and best[0] <= max_snap_m:
            distance, r, c = best
            snapped_lon, snapped_lat = self.lonlat(r, c)
            return SnapResult(
                ok=True,
                requested_lon=lon,
                requested_lat=lat,
                snapped_lon=snapped_lon,
                snapped_lat=snapped_lat,
                distance_m=distance,
                row=r,
                col=c,
                reason=(
                    "nearest_valid_cell"
                    if inside
                    else "nearest_valid_cell_beyond_declared_extent"
                ),
                inside_extent=inside,
                searched_cells=searched,
            )

        return SnapResult(
            ok=False,
            requested_lon=lon,
            requested_lat=lat,
            snapped_lon=None,
            snapped_lat=None,
            distance_m=None,
            row=None,
            col=None,
            reason=(
                "requested_coordinate_outside_dataset_extent"
                if not inside
                else "no_valid_terrain_within_snap_tolerance"
            ),
            inside_extent=inside,
            searched_cells=searched,
        )

    def stats(self) -> dict[str, Any]:
        """Measured statistics for the routeable support of this grid."""
        valid_cells = int(self.valid.sum())
        total_cells = int(self.valid.size)
        elevation = self.elevation[self.valid]
        slope = self.slope_deg[self.valid]
        area_m2 = float(self.cell_area_m2[self.valid].sum())
        return {
            "width": self.width,
            "height": self.height,
            "totalCells": total_cells,
            "validRouteCells": valid_cells,
            "validFraction": valid_cells / total_cells if total_cells else 0.0,
            "validAreaKm2": area_m2 / 1_000_000.0,
            "extentWsen": list(self.extent_wsen),
            "elevationM": _summary(elevation),
            "slopeDegrees": _summary(slope),
        }


def _summary(values: np.ndarray) -> dict[str, float]:
    finite = np.asarray(values, dtype=np.float64)
    finite = finite[np.isfinite(finite)]
    if finite.size == 0:
        return {"min": math.nan, "max": math.nan, "mean": math.nan}
    p05, p50, p95 = np.percentile(finite, [5.0, 50.0, 95.0])
    return {
        "min": float(finite.min()),
        "max": float(finite.max()),
        "mean": float(finite.mean()),
        "p05": float(p05),
        "p50": float(p50),
        "p95": float(p95),
    }


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _mars_radius_m(crs: CRS) -> float | None:
    try:
        ellipsoid = crs.ellipsoid
        if ellipsoid is not None and ellipsoid.radius is not None:
            return float(ellipsoid.radius)
    except Exception:
        pass
    # Fall back to parsing the WKT for the sphere radius.
    wkt = crs.to_wkt()
    if "3396190" in wkt:
        return MARS_RADIUS_M
    return None


def _build_geo_transformer(crs: CRS) -> Transformer:
    return Transformer.from_crs(
        crs,
        CRS.from_proj4(MARS_GEOGRAPHIC_PROJ4),
        always_xy=True,
    )


def load_grid(
    path: Path | str,
    dataset_id: str,
    *,
    expected_sha256: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> RoutingGrid:
    """Load a numeric DEM crop and build its metric routing grid.

    Raises
    ------
    ValueError
        If the raster is missing, has no numeric band, uses a non-Mars CRS,
        has a rotated/unsupported transform, or contains no routeable cells.
    """
    raster_path = Path(path)
    if not raster_path.is_file():
        raise ValueError(f"DEM raster does not exist: {raster_path}")

    actual_sha = _sha256_file(raster_path)
    if expected_sha256 is not None and actual_sha.lower() != expected_sha256.lower():
        raise ValueError(
            f"DEM checksum mismatch for {dataset_id}: "
            f"expected {expected_sha256}, got {actual_sha}"
        )

    with rasterio.open(raster_path) as source:
        if source.count < 1:
            raise ValueError(f"DEM {dataset_id} has no numeric bands")
        raw_crs = source.crs
        if raw_crs is None:
            raise ValueError(f"DEM {dataset_id} has no coordinate reference system")
        crs = CRS.from_user_input(raw_crs)
        radius = _mars_radius_m(crs)
        if radius is None or abs(radius - MARS_RADIUS_M) > 1.0:
            raise ValueError(
                f"DEM {dataset_id} is not on the Mars 2000 sphere "
                f"(R={MARS_RADIUS_M}); got radius={radius}"
            )

        transform = source.transform
        if abs(transform.b) > 1e-12 or abs(transform.d) > 1e-12:
            raise ValueError(
                f"DEM {dataset_id} has a rotated affine transform, which this "
                "routing engine does not support"
            )
        if transform.a == 0.0 or transform.e == 0.0:
            raise ValueError(f"DEM {dataset_id} has zero pixel spacing")

        height = int(source.height)
        width = int(source.width)
        if height < 3 or width < 3:
            raise ValueError(f"DEM {dataset_id} is too small for Horn 3x3 slopes")

        elevation = source.read(1).astype(np.float64)
        mask = source.read_masks(1)
        valid_elevation = np.isfinite(elevation) & (mask > 0)
        if source.nodata is not None and math.isfinite(float(source.nodata)):
            valid_elevation &= elevation != float(source.nodata)
        nodata = float(source.nodata) if source.nodata is not None else None
        crs_wkt = crs.to_wkt()
        crs_name = crs.name or ""
        if not crs_name or crs_name.lower() in ("unnamed", "unknown"):
            crs_name = (
                f"Mars equidistant cylindrical (R={MARS_RADIUS_M:,.0f} m)"
                if crs.is_projected
                else f"Mars geographic sphere (R={MARS_RADIUS_M:,.0f} m)"
            )

        # Cell-centre coordinates in the source CRS.
        cols = np.arange(width, dtype=np.float64) + 0.5
        rows = np.arange(height, dtype=np.float64) + 0.5
        x_centers = transform.c + cols * transform.a
        y_centers = transform.f + rows * transform.e
        xx, yy = np.meshgrid(x_centers, y_centers)

        to_geo = _build_geo_transformer(crs)
        lon_grid, lat_grid = to_geo.transform(xx, yy)
        lon_grid = np.mod(np.asarray(lon_grid, dtype=np.float64), 360.0)
        lat_grid = np.asarray(lat_grid, dtype=np.float64)

        # The supported products are separable equirectangular grids.  Reject
        # anything else rather than silently assuming a projection.
        if not np.allclose(lon_grid, lon_grid[0:1, :], atol=1e-10, rtol=0.0):
            raise ValueError(
                f"DEM {dataset_id} longitude varies with row; only separable "
                "equirectangular grids are supported"
            )
        if not np.allclose(lat_grid, lat_grid[:, 0:1], atol=1e-10, rtol=0.0):
            raise ValueError(
                f"DEM {dataset_id} latitude varies with column; only separable "
                "equirectangular grids are supported"
            )

        lon_centers = lon_grid[0, :].copy()
        lat_centers = lat_grid[:, 0].copy()
        if not np.all(np.diff(lon_centers) > 0.0):
            raise ValueError(f"DEM {dataset_id} longitude is not increasing")
        lat_diffs = np.diff(lat_centers)
        if not (np.all(lat_diffs > 0.0) or np.all(lat_diffs < 0.0)):
            raise ValueError(
                f"DEM {dataset_id} latitude is not strictly monotonic"
            )

        # Ground spacing per row on the Mars sphere.
        east_step = np.empty(height, dtype=np.float64)
        for r in range(height):
            east_step[r] = haversine_m(
                lon_centers[0], lat_centers[r], lon_centers[1], lat_centers[r]
            )
        north_step = np.empty(height, dtype=np.float64)
        for r in range(height - 1):
            north_step[r] = haversine_m(
                lon_centers[0], lat_centers[r], lon_centers[0], lat_centers[r + 1]
            )
        north_step[-1] = north_step[-2]
        # Exact great-circle distance to the north-east diagonal neighbour.
        # Using hypot(east, north) would be a flat-grid approximation; the
        # sphere gives a slightly shorter true arc, so measure it directly.
        diagonal_step = np.empty(height, dtype=np.float64)
        for r in range(height - 1):
            diagonal_step[r] = haversine_m(
                lon_centers[0], lat_centers[r], lon_centers[1], lat_centers[r + 1]
            )
        diagonal_step[-1] = diagonal_step[-2]
        if (
            np.any(east_step <= 0.0)
            or np.any(north_step <= 0.0)
            or np.any(diagonal_step <= 0.0)
        ):
            raise ValueError(f"DEM {dataset_id} has non-positive ground spacing")

        slope, support = horn_slope(
            elevation, valid_elevation, east_step, north_step
        )

        # Extent from the raster corners, transformed to lon/lat.  For a
        # projected equirectangular product this is the published footprint.
        corners_x = np.array(
            [transform.c, transform.c + width * transform.a], dtype=np.float64
        )
        corners_y = np.array(
            [transform.f, transform.f + height * transform.e], dtype=np.float64
        )
        cxx, cyy = np.meshgrid(corners_x, corners_y)
        clon, clat = to_geo.transform(cxx, cyy)
        clon = np.mod(np.asarray(clon, dtype=np.float64), 360.0)
        clat = np.asarray(clat, dtype=np.float64)
        extent_wsen = (
            float(np.min(clon)),
            float(np.min(clat)),
            float(np.max(clon)),
            float(np.max(clat)),
        )

        area = np.broadcast_to(
            (east_step * north_step)[:, None], (height, width)
        ).copy()

        return RoutingGrid(
            dataset_id=dataset_id,
            path=raster_path,
            sha256=actual_sha,
            elevation=elevation,
            valid_elevation=valid_elevation,
            slope_deg=slope,
            valid=support,
            lon_centers=lon_centers,
            lat_centers=lat_centers,
            east_step_m=east_step,
            north_step_m=north_step,
            diagonal_step_m=diagonal_step,
            cell_area_m2=area,
            transform=transform,
            crs_wkt=crs_wkt,
            crs_name=crs_name,
            nodata=nodata,
            width=width,
            height=height,
            extent_wsen=extent_wsen,
            metadata=dict(metadata or {}),
        )


def read_manifest(path: Path | str) -> dict[str, Any]:
    """Read the committed routing dataset manifest."""
    return json.loads(Path(path).read_text(encoding="utf-8"))
