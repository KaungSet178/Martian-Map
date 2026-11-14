"""Gale route construction and the integration-ready route output contract.

The engine accepts ordered ``[longitude, latitude]`` waypoints, snaps each one
to a valid numeric-DEM cell within an explicit tolerance, routes each segment
with A*, and reports distance, ascent/descent, slope statistics, evidence, and
uncertainty.  It never replaces a failed segment with a straight line.
"""

from __future__ import annotations

import hashlib
import json
import math
from typing import Any, Sequence

from .cost import CostModel
from .grid import MAX_SNAP_TOLERANCE_M, RoutingGrid, SnapResult
from .search import PathResult, Preference, astar
from .terrain import haversine_m, normalize_longitude

SCHEMA_VERSION = "gale-route-v1"
ALTERNATIVES_SCHEMA_VERSION = "gale-route-alternatives-v1"

WAYPOINT_LIMIT = 64
DEFAULT_MAX_SNAP_M = 100.0

NOT_A_SAFETY_MODEL = (
    "A computed path is a lower-terrain-cost path through the declared DEM "
    "model. It is not an astronaut traversability, hazard, trafficability, or "
    "safety certification."
)
REGISTRATION_WARNING = (
    "DEM-to-CTX optical co-registration is unverified. Preserve published "
    "coordinates and do not use this route for fine-feature matching or "
    "operational navigation."
)
NO_ROUGHNESS_WARNING = (
    "No verified Gale roughness, sand, rock-abundance, boulder, or obstacle "
    "dataset was available. The route avoids slope and elevation cost only; "
    "unmapped physical hazards are not represented."
)
NO_PHYSIOLOGY_WARNING = (
    "Cost weights are documented algorithmic preferences, not validated EVA "
    "physiology, metabolic rate, oxygen use, battery drain, or safety "
    "thresholds."
)
ASCENT_WARNING = (
    "Ascent and descent are raw sums of 30 m DEM elevation differences and "
    "include DEM noise; they are not surveyed rover-odometry values."
)
UNVERIFIED_STATUS_NOTE = (
    "status is 'unverified': the graph search is deterministic and the source "
    "DEM provenance is verified, but local CTX co-registration is not."
)


def _stable_hash(payload: Any, length: int = 16) -> str:
    text = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:length]


def _finite_coordinate(value: Sequence[float]) -> tuple[float, float]:
    if not isinstance(value, (list, tuple)) or len(value) != 2:
        raise ValueError("each waypoint must be [longitude, latitude]")
    lon, lat = float(value[0]), float(value[1])
    if not math.isfinite(lon) or not math.isfinite(lat):
        raise ValueError("waypoint coordinates must be finite")
    if not (-90.0 <= lat <= 90.0):
        raise ValueError("latitude must be in [-90, 90]")
    return normalize_longitude(lon), lat


def _grid_summary(grid: RoutingGrid) -> dict[str, Any]:
    stats = grid.stats()
    spec = grid.metadata
    return {
        "datasetId": grid.dataset_id,
        "nominalPostingMeters": spec.get("nominalPostingMeters"),
        "slopeDerivative": spec.get("slopeDerivative", "Horn 3x3"),
        "slopeSupportMeters": spec.get("slopeSupportMeters"),
        "width": grid.width,
        "height": grid.height,
        "crs": grid.crs_name,
        "verticalDatum": spec.get(
            "verticalDatum", "MOLA areoid, metres positive up"
        ),
        "horizontalDatum": spec.get(
            "horizontalDatum",
            "Mars 2000 sphere, R=3,396,190 m, planetocentric latitude, "
            "east-positive longitude 0-360",
        ),
        "nodata": grid.nodata,
        "checksumSha256": grid.sha256,
        "extentWsen": list(grid.extent_wsen),
        "validRouteCells": stats["validRouteCells"],
        "totalCells": stats["totalCells"],
        "validFraction": stats["validFraction"],
        "validAreaKm2": stats["validAreaKm2"],
    }


def _coverage_summary(grid: RoutingGrid) -> dict[str, Any]:
    stats = grid.stats()
    return {
        "status": "partial",
        "datasetId": grid.dataset_id,
        "validRouteCells": stats["validRouteCells"],
        "totalCells": stats["totalCells"],
        "validFraction": stats["validFraction"],
        "validAreaKm2": stats["validAreaKm2"],
        "extentWsen": list(grid.extent_wsen),
        "missingTerrain": (
            "No numeric DEM is available outside the declared crop. Cells "
            "outside it are not treated as traversable."
        ),
        "nodataPolicy": (
            "Nodata and cells without a complete valid 3x3 slope neighbourhood "
            "are blocked. No interpolation, gap filling, or synthetic surface "
            "is used."
        ),
        "routeWithinValidCoverage": True,
        "note": (
            "Coverage applies only to the audited regional crop for this "
            "dataset; it is not a claim of whole-Gale coverage."
        ),
    }


def _evidence(grid: RoutingGrid, processing_verified: bool) -> dict[str, Any]:
    spec = grid.metadata
    return {
        "source": {
            "status": "VERIFIED" if spec.get("sourceVerified", True) else "INVALID",
            "datasetId": grid.dataset_id,
            "product": spec.get("product"),
            "publisher": spec.get("publisher"),
            "citation": spec.get("citation"),
            "sourceUrl": spec.get("sourceUrl"),
            "checksumSha256": grid.sha256,
            "units": "metres relative to MOLA areoid, positive up",
            "note": (
                "Numeric elevation band was read directly. Display colours "
                "and rendered PNGs were not used as terrain data."
            ),
        },
        "processing": {
            "status": "VERIFIED" if processing_verified else "INVALID",
            "slopeMethod": "Horn 3x3 finite difference",
            "slopeSupportMeters": spec.get("slopeSupportMeters"),
            "distanceModel": (
                "Mars 2000 sphere R=3,396,190 m, per-row cos(latitude) east "
                "spacing, 8-connected graph"
            ),
            "pathfinder": "A* with admissible great-circle heuristic",
            "note": (
                "Slope, validity, distances, and pathfinding are covered by "
                "synthetic mathematical tests and authentic-DEM tests."
            ),
        },
        "registration": {
            "status": "UNVERIFIED",
            "reason": (
                "Precise local DEM-to-CTX co-registration is not certified. "
                "The DEM retains its published MOLA/Mars 2000 frame; no shift "
                "was fitted to the optical basemap."
            ),
            "source": spec.get("registrationReference"),
        },
        "hazards": {
            "status": "NOT_EVALUATED",
            "reason": NO_ROUGHNESS_WARNING,
        },
        "resource_model": {
            "status": "NOT_EVALUATED",
            "reason": NO_PHYSIOLOGY_WARNING,
        },
    }


def _warnings_for(grid: RoutingGrid, preference: Preference) -> list[str]:
    warnings = [
        NOT_A_SAFETY_MODEL,
        REGISTRATION_WARNING,
        NO_ROUGHNESS_WARNING,
        NO_PHYSIOLOGY_WARNING,
        ASCENT_WARNING,
    ]
    if grid.dataset_id == "gale-hrsc-mola-200m":
        warnings.append(
            "This route uses the 200 m HRSC-MOLA blended regional DEM with "
            "approximately 600 m gradient support. It is a coarse regional "
            "comparison, not a local traverse."
        )
    else:
        warnings.append(
            "This route uses the 30 m HRSC regional DEM with approximately "
            "90 m Horn gradient support. Boulders, small scarps, sand traps, "
            "and suit-scale obstacles are unresolved."
        )
    if preference == "shortest":
        warnings.append(
            "The shortest objective ignores terrain penalties and is expected "
            "to cross steeper ground when that reduces distance."
        )
    return warnings


def _failure_result(
    grid: RoutingGrid,
    waypoints: list[tuple[float, float]],
    preference: Preference,
    code: str,
    message: str,
    *,
    segment_index: int | None = None,
    warnings: list[str] | None = None,
    cost_model: CostModel | None = None,
    request_id: str | None = None,
    waypoint_records: list[dict[str, Any]] | None = None,
    segments: list[dict[str, Any]] | None = None,
    max_snap_m: float = DEFAULT_MAX_SNAP_M,
) -> dict[str, Any]:
    request_payload = {
        "datasetId": grid.dataset_id,
        "waypoints": [[round(lon, 7), round(lat, 7)] for lon, lat in waypoints],
        "maxSnapMeters": max_snap_m,
    }
    return {
        "schemaVersion": SCHEMA_VERSION,
        "regionId": "gale",
        "status": "unavailable",
        "preference": preference,
        "coordinates": [],
        "distanceMeters": None,
        "ascentMeters": None,
        "descentMeters": None,
        "maximumSlopeDegrees": None,
        "meanSlopeDegrees": None,
        "sourceDatasetIds": [grid.dataset_id],
        "sourceVerified": bool(grid.metadata.get("sourceVerified", True)),
        "processingVerified": True,
        "registrationVerified": False,
        "warnings": (warnings or _warnings_for(grid, preference)) + [message],
        "routeId": None,
        "requestId": request_id or _stable_hash(request_payload),
        "requestedWaypoints": [
            [round(lon, 7), round(lat, 7)] for lon, lat in waypoints
        ],
        "snappedWaypoints": [
            record["snapped"]
            for record in (waypoint_records or [])
            if record.get("snapped") is not None
        ],
        "waypoints": waypoint_records or [],
        "segments": segments or [],
        "algorithm": {
            "name": "A*",
            "preference": preference,
            "heuristic": (
                "great-circle ground distance; admissible and consistent "
                "because every edge cost is at least its ground distance"
            ),
            "neighbours": 8,
            "deterministic": True,
        },
        "costModel": (cost_model or CostModel()).describe(),
        "grid": _grid_summary(grid),
        "samples": {
            "coordinateCount": 0,
            "edgeCount": 0,
            "expandedNodes": 0,
            "heapPushes": 0,
        },
        "coverage": _coverage_summary(grid),
        "evidence": _evidence(grid, processing_verified=True),
        "failure": {
            "code": code,
            "message": message,
            "segmentIndex": segment_index,
        },
        "limitations": list(grid.metadata.get("limitations", [])),
        "straightLineDistanceMeters": None,
        "detourRatio": None,
        "totalTerrainCostMeters": None,
        "meanTerrainPenalty": None,
        "startElevationMeters": None,
        "endElevationMeters": None,
        "minimumElevationMeters": None,
        "maximumElevationMeters": None,
        "netElevationChangeMeters": None,
    }


def _segment_record(
    index: int,
    grid: RoutingGrid,
    start_snap: SnapResult,
    end_snap: SnapResult,
    path: PathResult,
    preference: Preference,
) -> dict[str, Any]:
    assert start_snap.row is not None and start_snap.col is not None
    assert end_snap.row is not None and end_snap.col is not None
    coordinates = path.coordinates(grid) if path.found else []
    straight = haversine_m(
        start_snap.snapped_lon or start_snap.requested_lon,
        start_snap.snapped_lat or start_snap.requested_lat,
        end_snap.snapped_lon or end_snap.requested_lon,
        end_snap.snapped_lat or end_snap.requested_lat,
    )
    return {
        "segmentId": f"seg-{index + 1}",
        "fromWaypointIndex": index,
        "toWaypointIndex": index + 1,
        "status": "computed" if path.found else "unavailable",
        "coordinates": coordinates,
        "distanceMeters": path.distance_m if path.found else None,
        "ascentMeters": path.ascent_m if path.found else None,
        "descentMeters": path.descent_m if path.found else None,
        "maximumSlopeDegrees": path.max_grade_deg if path.found else None,
        "meanSlopeDegrees": path.mean_grade_deg if path.found else None,
        "maximumCellSlopeDegrees": path.max_cell_slope_deg if path.found else None,
        "meanCellSlopeDegrees": path.mean_cell_slope_deg if path.found else None,
        "netElevationChangeMeters": path.net_elevation_m if path.found else None,
        "straightLineDistanceMeters": straight,
        "detourRatio": (
            path.distance_m / straight
            if path.found and straight > 0.0
            else None
        ),
        "totalTerrainCostMeters": path.total_cost_m if path.found else None,
        "expandedNodes": path.expanded_nodes,
        "heapPushes": path.heap_pushes,
        "failure": (
            None
            if path.found
            else {
                "code": path.failure or "routing_failed",
                "message": (
                    "No supported terrain path exists between these snapped "
                    "cells in the declared routing graph."
                ),
            }
        ),
        "preference": preference,
    }


def route(
    grid: RoutingGrid,
    waypoints: Sequence[Sequence[float]],
    preference: Preference = "lower-terrain-cost",
    *,
    max_snap_m: float = DEFAULT_MAX_SNAP_M,
    cost_model: CostModel | None = None,
) -> dict[str, Any]:
    """Compute one route through ordered waypoints.

    Coordinates are ``[longitude_east, latitude_planetocentric]``.  At least a
    start and a destination are required; intermediate waypoints are routed in
    the order supplied.
    """
    if preference not in ("shortest", "lower-terrain-cost"):
        raise ValueError(f"unsupported preference: {preference}")
    if not math.isfinite(max_snap_m) or max_snap_m <= 0.0:
        raise ValueError("max_snap_m must be finite and positive")
    if max_snap_m > MAX_SNAP_TOLERANCE_M:
        raise ValueError(
            f"max_snap_m must not exceed {MAX_SNAP_TOLERANCE_M:.0f} m"
        )
    model = cost_model or CostModel()
    if len(waypoints) < 2:
        raise ValueError("at least a start and destination are required")
    if len(waypoints) > WAYPOINT_LIMIT:
        raise ValueError(f"no more than {WAYPOINT_LIMIT} waypoints are allowed")

    parsed: list[tuple[float, float]] = []
    for value in waypoints:
        parsed.append(_finite_coordinate(value))

    request_payload = {
        "datasetId": grid.dataset_id,
        "waypoints": [[round(lon, 7), round(lat, 7)] for lon, lat in parsed],
        "maxSnapMeters": max_snap_m,
        "costModel": model.describe(),
    }
    request_id = _stable_hash(request_payload)
    route_payload = dict(request_payload, preference=preference)
    route_id = _stable_hash(route_payload)

    snaps: list[SnapResult] = [
        grid.nearest_valid(lon, lat, max_snap_m) for lon, lat in parsed
    ]
    waypoint_records: list[dict[str, Any]] = []
    for index, (snap, (lon, lat)) in enumerate(zip(snaps, parsed)):
        waypoint_records.append(
            {
                "index": index,
                "role": (
                    "start"
                    if index == 0
                    else ("destination" if index == len(parsed) - 1 else "via")
                ),
                "requested": [round(lon, 7), round(lat, 7)],
                "snapped": (
                    [round(snap.snapped_lon, 7), round(snap.snapped_lat, 7)]
                    if snap.snapped_lon is not None
                    else None
                ),
                "snapDistanceMeters": snap.distance_m,
                "snapReason": snap.reason,
                "insideDeclaredExtent": snap.inside_extent,
                "gridCell": (
                    [snap.row, snap.col] if snap.row is not None else None
                ),
                "ok": snap.ok,
            }
        )

    snap_failure = next(
        (index for index, snap in enumerate(snaps) if not snap.ok), None
    )
    if snap_failure is not None:
        snap = snaps[snap_failure]
        code = snap.reason
        message = (
            f"Waypoint {snap_failure} could not be placed on a valid numeric-DEM "
            f"cell within {max_snap_m:.0f} m ({snap.reason})."
        )
        return _failure_result(
            grid,
            parsed,
            preference,
            code,
            message,
            segment_index=max(0, snap_failure - 1),
            cost_model=model,
            request_id=request_id,
            waypoint_records=waypoint_records,
            max_snap_m=max_snap_m,
        )

    segments: list[dict[str, Any]] = []
    paths: list[PathResult] = []
    for index in range(len(snaps) - 1):
        start = snaps[index]
        end = snaps[index + 1]
        assert start.row is not None and start.col is not None
        assert end.row is not None and end.col is not None
        path = astar(
            grid,
            (start.row, start.col),
            (end.row, end.col),
            preference=preference,
            cost_model=model,
        )
        paths.append(path)
        segments.append(
            _segment_record(index, grid, start, end, path, preference)
        )

    failed_segment = next(
        (index for index, path in enumerate(paths) if not path.found), None
    )
    if failed_segment is not None:
        path = paths[failed_segment]
        return _failure_result(
            grid,
            parsed,
            preference,
            path.failure or "unreachable",
            (
                f"Segment {failed_segment + 1} could not be calculated from "
                "valid terrain evidence. No straight-line substitute was made."
            ),
            segment_index=failed_segment,
            cost_model=model,
            request_id=request_id,
            waypoint_records=waypoint_records,
            segments=segments,
            max_snap_m=max_snap_m,
        )

    # Concatenate actual graph geometry, removing the duplicated join cell.
    coordinates: list[list[float]] = []
    for index, path in enumerate(paths):
        segment_coordinates = path.coordinates(grid)
        if index > 0 and coordinates and segment_coordinates:
            segment_coordinates = segment_coordinates[1:]
        coordinates.extend(segment_coordinates)

    distance = sum(path.distance_m for path in paths)
    ascent = sum(path.ascent_m for path in paths)
    descent = sum(path.descent_m for path in paths)
    total_cost = sum(path.total_cost_m for path in paths)
    max_slope = max((path.max_grade_deg for path in paths), default=0.0)
    mean_slope = (
        sum(path.mean_grade_deg * path.distance_m for path in paths) / distance
        if distance > 0.0
        else 0.0
    )
    max_cell_slope = max(
        (path.max_cell_slope_deg for path in paths), default=0.0
    )
    mean_cell_slope = (
        sum(path.mean_cell_slope_deg * path.distance_m for path in paths)
        / distance
        if distance > 0.0
        else 0.0
    )
    straight_total = sum(
        segment["straightLineDistanceMeters"] or 0.0 for segment in segments
    )
    # Use the actual endpoint nodes for start/end elevation.
    first_index = paths[0].nodes[0]
    last_index = paths[-1].nodes[-1]
    start_row, start_col = grid.row_col(first_index)
    end_row, end_col = grid.row_col(last_index)
    start_elevation = float(grid.elevation[start_row, start_col])
    end_elevation = float(grid.elevation[end_row, end_col])
    minimum_elevation = min(
        path.min_elevation_m
        for path in paths
        if path.min_elevation_m is not None
    )
    maximum_elevation = max(
        path.max_elevation_m
        for path in paths
        if path.max_elevation_m is not None
    )

    warnings = _warnings_for(grid, preference)
    if straight_total > 0.0 and distance / straight_total > 1.5:
        warnings.append(
            f"The route is {distance / straight_total:.2f} times the summed "
            "straight-line waypoint distance because terrain cost or valid-"
            "coverage boundaries forced a detour."
        )
    warnings.append(UNVERIFIED_STATUS_NOTE)

    return {
        "schemaVersion": SCHEMA_VERSION,
        "regionId": "gale",
        "status": "unverified",
        "preference": preference,
        "coordinates": coordinates,
        "distanceMeters": distance,
        "ascentMeters": ascent,
        "descentMeters": descent,
        "maximumSlopeDegrees": max_slope,
        "meanSlopeDegrees": mean_slope,
        "sourceDatasetIds": [grid.dataset_id],
        "sourceVerified": bool(grid.metadata.get("sourceVerified", True)),
        "processingVerified": True,
        "registrationVerified": False,
        "warnings": warnings,
        "routeId": route_id,
        "requestId": request_id,
        "requestedWaypoints": [
            [round(lon, 7), round(lat, 7)] for lon, lat in parsed
        ],
        "snappedWaypoints": [
            [round(snap.snapped_lon, 7), round(snap.snapped_lat, 7)]
            for snap in snaps
            if snap.snapped_lon is not None
        ],
        "waypoints": waypoint_records,
        "segments": segments,
        "algorithm": {
            "name": "A*",
            "preference": preference,
            "heuristic": (
                "great-circle ground distance; admissible and consistent "
                "because every edge cost is at least its ground distance"
            ),
            "neighbours": 8,
            "diagonalCost": "hypot(east_ground_step, north_ground_step)",
            "tieBreak": "f-score, then heuristic, then row-major cell index",
            "deterministic": True,
        },
        "costModel": model.describe(),
        "grid": _grid_summary(grid),
        "samples": {
            "coordinateCount": len(coordinates),
            "edgeCount": max(0, len(coordinates) - 1),
            "expandedNodes": sum(path.expanded_nodes for path in paths),
            "heapPushes": sum(path.heap_pushes for path in paths),
        },
        "coverage": _coverage_summary(grid),
        "evidence": _evidence(grid, processing_verified=True),
        "failure": None,
        "limitations": list(grid.metadata.get("limitations", [])),
        "straightLineDistanceMeters": straight_total,
        "detourRatio": (
            distance / straight_total if straight_total > 0.0 else None
        ),
        "totalTerrainCostMeters": total_cost,
        "meanTerrainPenalty": total_cost / distance if distance > 0.0 else None,
        "startElevationMeters": start_elevation,
        "endElevationMeters": end_elevation,
        "minimumElevationMeters": minimum_elevation,
        "maximumElevationMeters": maximum_elevation,
        "netElevationChangeMeters": end_elevation - start_elevation,
        "maximumCellSlopeDegrees": max_cell_slope,
        "meanCellSlopeDegrees": mean_cell_slope,
    }


def route_alternatives(
    grid: RoutingGrid,
    waypoints: Sequence[Sequence[float]],
    *,
    max_snap_m: float = DEFAULT_MAX_SNAP_M,
    cost_model: CostModel | None = None,
) -> dict[str, Any]:
    """Compute shortest-distance and lower-terrain-cost alternatives."""
    model = cost_model or CostModel()
    shortest = route(
        grid,
        waypoints,
        "shortest",
        max_snap_m=max_snap_m,
        cost_model=model,
    )
    lower = route(
        grid,
        waypoints,
        "lower-terrain-cost",
        max_snap_m=max_snap_m,
        cost_model=model,
    )

    both_available = shortest["status"] != "unavailable" and lower["status"] != "unavailable"
    equivalent = bool(
        both_available and shortest["coordinates"] == lower["coordinates"]
    )

    if both_available:
        distance_delta = lower["distanceMeters"] - shortest["distanceMeters"]
        ascent_delta = lower["ascentMeters"] - shortest["ascentMeters"]
        descent_delta = lower["descentMeters"] - shortest["descentMeters"]
        slope_delta = (
            lower["maximumSlopeDegrees"] - shortest["maximumSlopeDegrees"]
        )
        cost_delta = (
            lower["totalTerrainCostMeters"] - shortest["totalTerrainCostMeters"]
        )
        if equivalent:
            explanation = (
                "Both objectives selected the same graph path. On this request "
                "the terrain penalty did not produce a distinct lower-cost "
                "alternative; no artificial offset route was manufactured."
            )
        else:
            explanation = (
                "The lower-terrain-cost objective selected a different graph "
                f"path: {distance_delta:+.1f} m distance, {ascent_delta:+.1f} m "
                f"ascent, {slope_delta:+.2f} deg maximum edge grade relative to "
                "shortest. Both are actual A* searches on the same graph."
            )
        comparison = {
            "equivalent": equivalent,
            "explanation": explanation,
            "distanceDeltaMeters": distance_delta,
            "ascentDeltaMeters": ascent_delta,
            "descentDeltaMeters": descent_delta,
            "maximumSlopeDeltaDegrees": slope_delta,
            "terrainCostDeltaMeters": cost_delta,
        }
    else:
        comparison = {
            "equivalent": False,
            "explanation": (
                "At least one objective could not be computed on valid terrain; "
                "no alternative was fabricated."
            ),
            "distanceDeltaMeters": None,
            "ascentDeltaMeters": None,
            "descentDeltaMeters": None,
            "maximumSlopeDeltaDegrees": None,
            "terrainCostDeltaMeters": None,
        }

    request = {
        "regionId": "gale",
        "datasetId": grid.dataset_id,
        "waypoints": [
            [round(float(lon), 7), round(float(lat), 7)] for lon, lat in waypoints
        ],
        "maxSnapMeters": max_snap_m,
        "costModel": model.describe(),
    }

    return {
        "schemaVersion": ALTERNATIVES_SCHEMA_VERSION,
        "regionId": "gale",
        "datasetId": grid.dataset_id,
        "request": request,
        "alternatives": {
            "shortest": shortest,
            "lower-terrain-cost": lower,
        },
        "comparison": comparison,
        "evidence": _evidence(grid, processing_verified=True),
        "warnings": [
            NOT_A_SAFETY_MODEL,
            REGISTRATION_WARNING,
            (
                "The two alternatives share the same DEM, graph, snapping "
                "tolerance, and validity mask; only the objective differs."
            ),
        ],
    }
