"""Tests for the Gale terrain-aware routing engine.

Synthetic grids verify graph-search mathematics, cost behaviour, failure
handling, snapping, and geodesy.  The authentic Gale DEM tests then exercise the
same engine on the committed numeric HRSC 30 m and HRSC-MOLA 200 m crops.

Synthetic terrain is used only as an algorithm oracle and is never presented as
Martian data.
"""

from __future__ import annotations

import json
import math
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np
import rasterio
from pyproj import CRS
from rasterio.transform import Affine, from_origin

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from team.gale.routing.cost import DISTANCE_ONLY, CostModel
from team.gale.routing.datasets import (
    COARSE_DATASET_ID,
    DATA_DIR,
    PRIMARY_DATASET_ID,
    dataset_manifest,
    dataset_specs,
    load_dataset,
)
from team.gale.routing.engine import route, route_alternatives
from team.gale.routing.grid import MAX_SNAP_TOLERANCE_M, RoutingGrid, load_grid
from team.gale.routing.search import PathResult, astar
from team.gale.routing.terrain import (
    MARS_RADIUS_M,
    haversine_m,
    horn_slope,
    normalize_longitude,
)

DEMO_START = (137.4416330, -4.5894670)
DEMO_VIA = (137.4010487, -4.6347708)
DEMO_END = (137.3891532, -4.8256778)


def synthetic_grid(
    elevation: np.ndarray,
    valid: np.ndarray | None = None,
    *,
    spacing_m: float = 30.0,
    lon0: float = 137.4,
    lat0: float = -4.7,
    dataset_id: str = "synthetic-test-grid",
) -> RoutingGrid:
    """Build a small metric routing grid from a synthetic elevation array."""
    z = np.asarray(elevation, dtype=np.float64)
    height, width = z.shape
    if valid is None:
        valid = np.ones(z.shape, dtype=bool)
    valid = np.asarray(valid, dtype=bool)
    if valid.shape != z.shape:
        raise ValueError("valid mask must match elevation")

    dlat = spacing_m / MARS_RADIUS_M * (180.0 / math.pi)
    lat_centers = lat0 - np.arange(height, dtype=np.float64) * dlat
    dlon = (
        spacing_m
        / (MARS_RADIUS_M * math.cos(math.radians(lat0)))
        * (180.0 / math.pi)
    )
    lon_centers = lon0 + np.arange(width, dtype=np.float64) * dlon

    east = np.array(
        [
            haversine_m(lon_centers[0], lat_centers[r], lon_centers[1], lat_centers[r])
            for r in range(height)
        ],
        dtype=np.float64,
    )
    north = np.full(height, np.nan, dtype=np.float64)
    for r in range(height - 1):
        north[r] = haversine_m(
            lon_centers[0], lat_centers[r], lon_centers[0], lat_centers[r + 1]
        )
    north[-1] = north[-2]
    diagonal = np.full(height, np.nan, dtype=np.float64)
    for r in range(height - 1):
        diagonal[r] = haversine_m(
            lon_centers[0], lat_centers[r], lon_centers[1], lat_centers[r + 1]
        )
    diagonal[-1] = diagonal[-2]

    slope, support = horn_slope(z, valid, east, north)
    routeable = support & valid
    area = np.broadcast_to((east * north)[:, None], (height, width)).copy()

    return RoutingGrid(
        dataset_id=dataset_id,
        path=Path("synthetic.tif"),
        sha256="0" * 64,
        elevation=z,
        valid_elevation=valid,
        slope_deg=slope,
        valid=routeable,
        lon_centers=lon_centers,
        lat_centers=lat_centers,
        east_step_m=east,
        north_step_m=north,
        diagonal_step_m=diagonal,
        cell_area_m2=area,
        transform=Affine.identity(),
        crs_wkt="synthetic",
        crs_name="synthetic Mars metric test grid",
        nodata=None,
        width=width,
        height=height,
        extent_wsen=(
            float(lon_centers[0]),
            float(lat_centers[-1]),
            float(lon_centers[-1]),
            float(lat_centers[0]),
        ),
        metadata={
            "sourceVerified": False,
            "nominalPostingMeters": spacing_m,
            "limitations": ["Synthetic algorithm-test grid, not Mars data."],
        },
    )


def edge_distance(grid: RoutingGrid, a: tuple[int, int], b: tuple[int, int]) -> float:
    row_a, col_a = a
    row_b, col_b = b
    if row_a == row_b:
        return float(grid.east_step_m[row_a])
    if col_a == col_b:
        return float(grid.north_step_m[min(row_a, row_b)])
    return float(grid.diagonal_step_m[min(row_a, row_b)])


def path_cost(grid: RoutingGrid, path: PathResult, model: CostModel) -> float:
    total = 0.0
    for index_a, index_b in zip(path.nodes, path.nodes[1:]):
        a = grid.row_col(index_a)
        b = grid.row_col(index_b)
        total += model.edge(
            edge_distance(grid, a, b),
            float(grid.elevation[b] - grid.elevation[a]),
            float(grid.slope_deg[a]),
            float(grid.slope_deg[b]),
        ).cost_m
    return total


def manual_distance(grid: RoutingGrid, path: PathResult) -> float:
    total = 0.0
    for index_a, index_b in zip(path.nodes, path.nodes[1:]):
        a = grid.row_col(index_a)
        b = grid.row_col(index_b)
        total += haversine_m(
            grid.lon_centers[a[1]],
            grid.lat_centers[a[0]],
            grid.lon_centers[b[1]],
            grid.lat_centers[b[0]],
        )
    return total


def manual_ascent_descent(
    grid: RoutingGrid, path: PathResult
) -> tuple[float, float]:
    ascent = 0.0
    descent = 0.0
    for index_a, index_b in zip(path.nodes, path.nodes[1:]):
        dz = float(
            grid.elevation[grid.row_col(index_b)] - grid.elevation[grid.row_col(index_a)]
        )
        ascent += max(dz, 0.0)
        descent += max(-dz, 0.0)
    return ascent, descent


class TerrainMathematicsTests(unittest.TestCase):
    def test_mars_haversine_and_longitude_normalisation(self):
        # One degree of arc on the Mars 2000 sphere.
        one_degree = MARS_RADIUS_M * math.radians(1.0)
        self.assertAlmostEqual(
            haversine_m(0.0, 0.0, 1.0, 0.0), one_degree, places=6
        )
        # East spacing shrinks with cos(planetocentric latitude).
        at_equator = haversine_m(137.0, 0.0, 137.001, 0.0)
        at_five_south = haversine_m(137.0, -5.0, 137.001, -5.0)
        self.assertAlmostEqual(
            at_five_south / at_equator,
            math.cos(math.radians(5.0)),
            places=9,
        )
        self.assertAlmostEqual(normalize_longitude(-1.0), 359.0, places=12)
        self.assertAlmostEqual(normalize_longitude(360.0), 0.0, places=12)

    def test_horn_slope_on_synthetic_tilted_plane(self):
        spacing = 30.0
        rows, cols = 7, 7
        # 3 m rise per 30 m southward step = 5.7106 degrees.
        elevation = np.arange(rows)[:, None] * 3.0 + np.zeros((rows, cols))
        grid = synthetic_grid(elevation, spacing_m=spacing)
        support = grid.valid
        self.assertFalse(support[0, :].any())
        self.assertFalse(support[:, 0].any())
        expected = math.degrees(math.atan(3.0 / spacing))
        self.assertAlmostEqual(
            float(grid.slope_deg[3, 3]), expected, places=5
        )
        self.assertTrue(np.all(np.isfinite(grid.slope_deg[support])))

    def test_horn_slope_requires_nine_valid_posts(self):
        elevation = np.zeros((7, 7), dtype=np.float64)
        valid = np.ones((7, 7), dtype=bool)
        valid[3, 3] = False
        grid = synthetic_grid(elevation, valid)
        self.assertFalse(grid.valid[3, 3])
        self.assertFalse(grid.valid[2, 2])
        self.assertFalse(grid.valid[4, 4])
        self.assertTrue(grid.valid[1, 1])
        self.assertTrue(np.isnan(grid.slope_deg[3, 3]))


class CostModelTests(unittest.TestCase):
    def test_nonnegative_validation_and_zero_weights(self):
        with self.assertRaises(ValueError):
            CostModel(uphill_weight=-0.1)
        with self.assertRaises(ValueError):
            CostModel(slope_reference_deg=0.0)
        with self.assertRaises(ValueError):
            CostModel(max_grade_tangent=float("nan"))

        flat = DISTANCE_ONLY.edge(30.0, 15.0, 10.0, 20.0)
        self.assertEqual(flat.cost_m, 30.0)
        self.assertEqual(flat.penalty, 1.0)

    def test_uphill_downhill_and_cross_slope_ordering(self):
        model = CostModel()
        flat = model.edge(30.0, 0.0, 0.0, 0.0)
        uphill = model.edge(30.0, 3.0, 5.0, 5.0)
        downhill = model.edge(30.0, -3.0, 5.0, 5.0)
        steeper_cross = model.edge(30.0, 0.0, 15.0, 15.0)

        self.assertGreater(flat.penalty, 0.0)
        self.assertGreater(uphill.penalty, flat.penalty)
        self.assertGreater(downhill.penalty, flat.penalty)
        self.assertLess(downhill.penalty, uphill.penalty)
        self.assertGreater(steeper_cross.penalty, flat.penalty)
        for edge in (flat, uphill, downhill, steeper_cross):
            self.assertGreaterEqual(edge.cost_m, edge.distance_m)
            self.assertTrue(math.isfinite(edge.cost_m))

    def test_grade_clamping_is_documented(self):
        model = CostModel(
            uphill_weight=3.0,
            downhill_weight=0.75,
            cross_slope_weight=0.0,
            max_grade_tangent=3.0,
        )
        edge = model.edge(30.0, 300.0, 0.0, 0.0)  # tangent 10, clamped to 3
        self.assertAlmostEqual(edge.penalty, 1.0 + 3.0 * 3.0, places=9)
        self.assertEqual(edge.grade_deg, math.degrees(math.atan(10.0)))

    def test_cost_model_description_is_serialisable(self):
        described = CostModel().describe()
        self.assertEqual(described["name"], "gale-terrain-penalty-v1")
        self.assertEqual(described["units"], "equivalent horizontal metres")
        self.assertIn("not astronaut physiology", described["interpretation"])


class SyntheticSearchTests(unittest.TestCase):
    def test_flat_terrain_diagonal_shortest_path(self):
        grid = synthetic_grid(np.zeros((12, 12), dtype=np.float64))
        start, goal = (2, 2), (7, 7)
        result = astar(grid, start, goal, preference="shortest")
        self.assertTrue(result.found)
        self.assertEqual(len(result.nodes), 6)
        expected = sum(
            float(grid.diagonal_step_m[r])
            for r in range(2, 7)
        )
        self.assertAlmostEqual(result.distance_m, expected, places=9)
        self.assertEqual(result.ascent_m, 0.0)
        self.assertEqual(result.descent_m, 0.0)
        for index in result.nodes:
            row, col = grid.row_col(index)
            self.assertEqual((row, col), (index // 12, index % 12))
        # Every step must be diagonal (both axes change).
        cells = [grid.row_col(index) for index in result.nodes]
        for (row_a, col_a), (row_b, col_b) in zip(cells, cells[1:]):
            self.assertEqual(abs(row_b - row_a), 1)
            self.assertEqual(abs(col_b - col_a), 1)

    def test_uphill_and_downhill_statistics(self):
        rows, cols = 8, 5
        elevation = np.arange(rows)[:, None] * 3.0 + np.zeros((rows, cols))
        grid = synthetic_grid(elevation)

        uphill = astar(grid, (2, 2), (5, 2), "lower-terrain-cost", CostModel())
        downhill = astar(grid, (5, 2), (2, 2), "lower-terrain-cost", CostModel())
        self.assertTrue(uphill.found)
        self.assertTrue(downhill.found)
        self.assertAlmostEqual(uphill.ascent_m, 9.0, places=9)
        self.assertAlmostEqual(uphill.descent_m, 0.0, places=9)
        self.assertAlmostEqual(downhill.descent_m, 9.0, places=9)
        self.assertAlmostEqual(downhill.ascent_m, 0.0, places=9)
        self.assertAlmostEqual(uphill.net_elevation_m, 9.0, places=9)
        self.assertAlmostEqual(downhill.net_elevation_m, -9.0, places=9)
        self.assertLess(downhill.total_cost_m, uphill.total_cost_m)

    def test_steep_hill_penalty_produces_a_real_detour(self):
        rows, cols = 7, 21
        elevation = np.zeros((rows, cols), dtype=np.float64)
        hill = np.zeros((rows, cols), dtype=bool)
        hill[2:5, 9:12] = True
        elevation[hill] = 60.0
        grid = synthetic_grid(elevation)

        shortest = astar(grid, (3, 1), (3, 19), "shortest")
        lower = astar(
            grid, (3, 1), (3, 19), "lower-terrain-cost", CostModel()
        )
        self.assertTrue(shortest.found)
        self.assertTrue(lower.found)

        shortest_cells = {grid.row_col(index) for index in shortest.nodes}
        lower_cells = {grid.row_col(index) for index in lower.nodes}
        hill_cells = {
            (row, col)
            for row in range(2, 5)
            for col in range(9, 12)
        }
        self.assertTrue(shortest_cells & hill_cells)
        self.assertFalse(lower_cells & hill_cells)
        self.assertGreater(lower.distance_m, shortest.distance_m)

        # The detour must be cheaper under the documented terrain model.
        model = CostModel()
        self.assertLess(
            path_cost(grid, lower, model), path_cost(grid, shortest, model)
        )

    def test_valid_detour_around_nodata_barrier(self):
        rows, cols = 9, 9
        elevation = np.zeros((rows, cols), dtype=np.float64)
        valid = np.ones((rows, cols), dtype=bool)
        valid[2:5, 4] = False  # partial vertical barrier with a gap
        grid = synthetic_grid(elevation, valid)

        result = astar(grid, (3, 1), (3, 7), "shortest")
        self.assertTrue(result.found)
        cells = [grid.row_col(index) for index in result.nodes]
        self.assertFalse(any(cell in {(2, 4), (3, 4), (4, 4)} for cell in cells))
        for row, col in cells:
            self.assertTrue(grid.valid[row, col])
        straight = haversine_m(
            grid.lon_centers[1],
            grid.lat_centers[3],
            grid.lon_centers[7],
            grid.lat_centers[3],
        )
        self.assertGreater(result.distance_m, straight)

    def test_nodata_barrier_makes_goal_unreachable(self):
        rows, cols = 9, 9
        elevation = np.zeros((rows, cols), dtype=np.float64)
        valid = np.ones((rows, cols), dtype=bool)
        valid[:, 4] = False  # solid vertical barrier
        grid = synthetic_grid(elevation, valid)

        result = astar(grid, (4, 1), (4, 7), "lower-terrain-cost", CostModel())
        self.assertFalse(result.found)
        self.assertEqual(result.failure, "unreachable")
        self.assertEqual(result.nodes, ())
        self.assertEqual(result.distance_m, 0.0)

    def test_enclosed_goal_is_unreachable(self):
        rows, cols = 11, 11
        valid = np.zeros((rows, cols), dtype=bool)
        valid[2:5, 1:4] = True  # start island
        valid[2:5, 7:10] = True  # goal island, separated by invalid columns
        grid = synthetic_grid(np.zeros((rows, cols)), valid)

        result = astar(grid, (3, 2), (3, 8), "shortest")
        self.assertFalse(result.found)
        self.assertEqual(result.failure, "unreachable")

    def test_deterministic_and_dijkstra_equivalent(self):
        rows, cols = 9, 15
        elevation = np.zeros((rows, cols), dtype=np.float64)
        elevation[3:6, 6:9] = 40.0
        grid = synthetic_grid(elevation)

        first = astar(grid, (4, 1), (4, 13), "lower-terrain-cost", CostModel())
        second = astar(grid, (4, 1), (4, 13), "lower-terrain-cost", CostModel())
        self.assertEqual(first.nodes, second.nodes)
        self.assertEqual(first.distance_m, second.distance_m)
        self.assertEqual(first.expanded_nodes, second.expanded_nodes)

        heuristic = astar(grid, (4, 1), (4, 13), "lower-terrain-cost", CostModel())
        dijkstra = astar(
            grid,
            (4, 1),
            (4, 13),
            "lower-terrain-cost",
            CostModel(),
            use_heuristic=False,
        )
        self.assertTrue(dijkstra.found)
        self.assertAlmostEqual(
            heuristic.total_cost_m, dijkstra.total_cost_m, places=6
        )
        # A* must not expand more nodes than Dijkstra on this graph.
        self.assertLessEqual(heuristic.expanded_nodes, dijkstra.expanded_nodes)

    def test_preferences_are_distinct_objectives(self):
        rows, cols = 7, 21
        elevation = np.zeros((rows, cols), dtype=np.float64)
        elevation[2:5, 9:12] = 60.0
        grid = synthetic_grid(elevation)

        shortest = astar(grid, (3, 1), (3, 19), "shortest")
        lower = astar(grid, (3, 1), (3, 19), "lower-terrain-cost", CostModel())
        self.assertNotEqual(shortest.nodes, lower.nodes)
        self.assertEqual(shortest.total_cost_m, shortest.distance_m)
        self.assertGreater(lower.total_cost_m, lower.distance_m)

    def test_max_expansion_limit_returns_structured_failure(self):
        grid = synthetic_grid(np.zeros((20, 20), dtype=np.float64))
        result = astar(
            grid,
            (2, 2),
            (16, 16),
            "shortest",
            max_expansions=5,
        )
        self.assertFalse(result.found)
        self.assertEqual(result.failure, "expansion_limit")

    def test_invalid_endpoint_cells_fail_explicitly(self):
        valid = np.ones((9, 9), dtype=bool)
        valid[4, 4] = False
        grid = synthetic_grid(np.zeros((9, 9)), valid)
        self.assertEqual(
            astar(grid, (4, 4), (5, 5), "shortest").failure,
            "start_cell_invalid",
        )
        self.assertEqual(
            astar(grid, (6, 6), (4, 4), "shortest").failure,
            "goal_cell_invalid",
        )
        self.assertEqual(
            astar(grid, (-1, 0), (6, 6), "shortest").failure,
            "start_out_of_bounds",
        )

    def test_same_cell_route_is_valid_and_zero_length(self):
        grid = synthetic_grid(np.zeros((7, 7)))
        result = astar(grid, (3, 3), (3, 3), "lower-terrain-cost", CostModel())
        self.assertTrue(result.found)
        self.assertEqual(len(result.nodes), 1)
        self.assertEqual(result.distance_m, 0.0)


class SyntheticEngineTests(unittest.TestCase):
    def test_distance_ascent_and_descent_are_measured(self):
        rows, cols = 8, 6
        elevation = np.arange(rows)[:, None] * 2.0 + np.zeros((rows, cols))
        grid = synthetic_grid(elevation)
        waypoints = [
            grid.lonlat(6, 4),
            grid.lonlat(4, 2),
            grid.lonlat(2, 1),
        ]
        result = route(grid, waypoints, "lower-terrain-cost")
        self.assertEqual(result["status"], "unverified")
        self.assertIsNone(result["failure"])
        self.assertEqual(len(result["segments"]), 2)

        total_distance = 0.0
        total_ascent = 0.0
        total_descent = 0.0
        for index in range(len(waypoints) - 1):
            segment = result["segments"][index]
            a = grid.nearest_valid(*waypoints[index])
            b = grid.nearest_valid(*waypoints[index + 1])
            path = astar(
                grid,
                (a.row, a.col),
                (b.row, b.col),
                "lower-terrain-cost",
                CostModel(),
            )
            self.assertAlmostEqual(
                segment["distanceMeters"], manual_distance(grid, path), places=6
            )
            ascent, descent = manual_ascent_descent(grid, path)
            self.assertAlmostEqual(segment["ascentMeters"], ascent, places=9)
            self.assertAlmostEqual(segment["descentMeters"], descent, places=9)
            total_distance += segment["distanceMeters"]
            total_ascent += segment["ascentMeters"]
            total_descent += segment["descentMeters"]

        self.assertAlmostEqual(result["distanceMeters"], total_distance, places=6)
        self.assertAlmostEqual(result["ascentMeters"], total_ascent, places=9)
        self.assertAlmostEqual(result["descentMeters"], total_descent, places=9)

    def test_multiple_ordered_waypoints_preserve_order(self):
        grid = synthetic_grid(np.zeros((10, 12)))
        start = grid.lonlat(1, 1)
        via = grid.lonlat(1, 9)
        end = grid.lonlat(8, 9)
        result = route(grid, [start, via, end], "shortest")
        self.assertEqual(len(result["segments"]), 2)
        self.assertEqual(
            [waypoint["role"] for waypoint in result["waypoints"]],
            ["start", "via", "destination"],
        )
        self.assertEqual(
            result["requestedWaypoints"],
            [
                [round(coordinate[0], 7), round(coordinate[1], 7)]
                for coordinate in (start, via, end)
            ],
        )
        # The concatenated geometry must visit the via cell before the end cell.
        via_index = result["coordinates"].index(
            [round(via[0], 7), round(via[1], 7)]
        )
        end_index = result["coordinates"].index(
            [round(end[0], 7), round(end[1], 7)]
        )
        self.assertLess(via_index, end_index)
        self.assertAlmostEqual(
            result["distanceMeters"],
            sum(segment["distanceMeters"] for segment in result["segments"]),
            places=6,
        )

    def test_waypoint_snapping_is_bounded_and_explicit(self):
        grid = synthetic_grid(np.zeros((9, 9)))
        target = grid.lonlat(4, 4)
        offset_lon = target[0] + 0.0001  # roughly 11 m east
        result = route(grid, [(offset_lon, target[1]), grid.lonlat(2, 2)], "shortest")
        self.assertNotEqual(result["status"], "unavailable")
        waypoint = result["waypoints"][0]
        self.assertEqual(waypoint["requested"], [round(offset_lon, 7), round(target[1], 7)])
        self.assertIsNotNone(waypoint["snapped"])
        self.assertLessEqual(waypoint["snapDistanceMeters"], 100.0)
        self.assertGreaterEqual(waypoint["snapDistanceMeters"], 0.0)
        self.assertTrue(waypoint["snapReason"])

    def test_snap_tolerance_is_enforced(self):
        with self.assertRaises(ValueError):
            route(
                synthetic_grid(np.zeros((9, 9))),
                [(137.4, -4.7), (137.401, -4.7)],
                "shortest",
                max_snap_m=MAX_SNAP_TOLERANCE_M + 1.0,
            )
        with self.assertRaises(ValueError):
            route(
                synthetic_grid(np.zeros((9, 9))),
                [(137.4, -4.7), (137.401, -4.7)],
                "shortest",
                max_snap_m=0.0,
            )

    def test_no_valid_cell_within_tolerance_fails_cleanly(self):
        # Only one isolated valid post, far from the requested endpoints.
        valid = np.zeros((21, 21), dtype=bool)
        valid[1, 1] = True
        grid = synthetic_grid(np.zeros((21, 21)), valid)
        result = route(
            grid,
            [grid.lonlat(10, 10), grid.lonlat(12, 12)],
            "shortest",
            max_snap_m=100.0,
        )
        self.assertEqual(result["status"], "unavailable")
        self.assertEqual(result["coordinates"], [])
        self.assertEqual(result["distanceMeters"], None)
        self.assertEqual(
            result["failure"]["code"], "no_valid_terrain_within_snap_tolerance"
        )

    def test_out_of_coverage_waypoint_is_reported_without_straight_line(self):
        grid = synthetic_grid(np.zeros((9, 9)))
        result = route(
            grid,
            [(10.0, 20.0), grid.lonlat(2, 2)],
            "lower-terrain-cost",
        )
        self.assertEqual(result["status"], "unavailable")
        self.assertEqual(result["coordinates"], [])
        self.assertIsNone(result["straightLineDistanceMeters"])
        self.assertEqual(
            result["failure"]["code"],
            "requested_coordinate_outside_dataset_extent",
        )
        self.assertFalse(result["waypoints"][0]["insideDeclaredExtent"])
        self.assertTrue(
            any(
                "could not be placed" in message
                for message in result["warnings"]
            )
        )

    def test_failed_segment_does_not_substitute_straight_geometry(self):
        rows, cols = 9, 13
        valid = np.ones((rows, cols), dtype=bool)
        valid[:, 6] = False
        grid = synthetic_grid(np.zeros((rows, cols)), valid)
        start = grid.lonlat(4, 2)
        via = grid.lonlat(4, 10)
        end = grid.lonlat(4, 11)
        result = route(grid, [start, via, end], "shortest")
        self.assertEqual(result["status"], "unavailable")
        self.assertEqual(result["coordinates"], [])
        self.assertEqual(result["failure"]["segmentIndex"], 0)
        self.assertEqual(result["segments"][0]["status"], "unavailable")
        self.assertEqual(result["segments"][0]["coordinates"], [])
        self.assertIsNone(result["segments"][0]["distanceMeters"])
        self.assertIsNone(result["straightLineDistanceMeters"])
        self.assertTrue(
            any(
                "No straight-line substitute was made." in message
                for message in result["warnings"]
            )
        )

    def test_invalid_coordinates_and_waypoint_count_are_rejected(self):
        grid = synthetic_grid(np.zeros((9, 9)))
        with self.assertRaises(ValueError):
            route(grid, [(137.4, -4.7)], "shortest")
        with self.assertRaises(ValueError):
            route(grid, [(float("nan"), -4.7), (137.4, -4.7)], "shortest")
        with self.assertRaises(ValueError):
            route(grid, [(137.4, -95.0), (137.4, -4.7)], "shortest")
        with self.assertRaises(ValueError):
            route(grid, [(137.4, -4.7), (137.4, -4.7)], "unsupported")  # type: ignore[arg-type]

    def test_alternatives_identical_on_flat_terrain_are_explained(self):
        grid = synthetic_grid(np.zeros((12, 12)))
        start = grid.lonlat(2, 2)
        end = grid.lonlat(9, 9)
        alternatives = route_alternatives(grid, [start, end])
        comparison = alternatives["comparison"]
        self.assertTrue(comparison["equivalent"])
        self.assertIn("same graph path", comparison["explanation"])
        self.assertEqual(
            alternatives["alternatives"]["shortest"]["coordinates"],
            alternatives["alternatives"]["lower-terrain-cost"]["coordinates"],
        )
        self.assertFalse(comparison["equivalent"] is None)

    def test_route_metadata_is_separate_and_not_overclaimed(self):
        grid = synthetic_grid(np.zeros((9, 9)))
        result = route(grid, [grid.lonlat(1, 1), grid.lonlat(7, 7)], "shortest")
        self.assertEqual(result["status"], "unverified")
        self.assertFalse(result["sourceVerified"])  # synthetic grid is not a source
        self.assertTrue(result["processingVerified"])
        self.assertFalse(result["registrationVerified"])
        self.assertEqual(result["evidence"]["source"]["status"], "INVALID")
        self.assertEqual(result["evidence"]["processing"]["status"], "VERIFIED")
        self.assertEqual(result["evidence"]["registration"]["status"], "UNVERIFIED")
        self.assertEqual(result["evidence"]["hazards"]["status"], "NOT_EVALUATED")
        self.assertEqual(
            result["evidence"]["resource_model"]["status"], "NOT_EVALUATED"
        )


class AuthenticGaleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.manifest = dataset_manifest()
        cls.grid = load_dataset(PRIMARY_DATASET_ID)
        cls.coarse = load_dataset(COARSE_DATASET_ID)

    def test_manifest_and_committed_rasters_are_consistent(self):
        datasets = self.manifest["datasets"]
        self.assertEqual(set(datasets), {PRIMARY_DATASET_ID, COARSE_DATASET_ID})
        self.assertIn(
            "never averaged", self.manifest["productsAreNotBlended"]
        )
        for dataset_id, entry in datasets.items():
            path = DATA_DIR / Path(entry["path"]).name
            self.assertTrue(path.is_file())
            self.assertEqual(path.stat().st_size, entry["bytes"])
            self.assertRegex(entry["sha256"], r"^[0-9a-f]{64}$")

        specs = {spec["datasetId"]: spec for spec in dataset_specs()}
        self.assertEqual(specs[PRIMARY_DATASET_ID]["nominalPostingMeters"], 30)
        self.assertEqual(specs[COARSE_DATASET_ID]["nominalPostingMeters"], 200)
        self.assertEqual(
            specs[PRIMARY_DATASET_ID]["role"], "primary"
        )
        self.assertEqual(
            specs[COARSE_DATASET_ID]["role"], "coarse-regional-comparison"
        )

    def test_primary_grid_matches_audited_statistics(self):
        grid = self.grid
        self.assertEqual((grid.width, grid.height), (293, 545))
        self.assertEqual(int(grid.valid.sum()), 158013)
        self.assertEqual(int(grid.valid_elevation.sum()), 159685)
        stats = grid.stats()
        self.assertAlmostEqual(stats["validAreaKm2"], 141.733, places=3)
        self.assertAlmostEqual(stats["elevationM"]["max"], -2641.22, places=2)
        self.assertGreater(stats["slopeDegrees"]["max"], 27.0)
        self.assertLess(stats["slopeDegrees"]["max"], 28.0)
        self.assertEqual(grid.metadata["nominalPostingMeters"], 30)
        # Approximately 90 m north support (3 x 30 m) at this latitude.
        self.assertAlmostEqual(grid.north_step_m[100] * 3.0, 90.0, places=1)
        self.assertLess(grid.east_step_m[100], grid.north_step_m[100])
        self.assertEqual(grid.nodata, -32768.0)

    def test_real_gale_route_uses_numeric_dem_and_reports_uncertainty(self):
        result = route(
            self.grid,
            [DEMO_START, DEMO_VIA],
            "lower-terrain-cost",
        )
        self.assertEqual(result["status"], "unverified")
        self.assertIsNone(result["failure"])
        self.assertEqual(result["sourceDatasetIds"], [PRIMARY_DATASET_ID])
        self.assertTrue(result["sourceVerified"])
        self.assertTrue(result["processingVerified"])
        self.assertFalse(result["registrationVerified"])
        self.assertEqual(result["evidence"]["source"]["status"], "VERIFIED")
        self.assertEqual(result["evidence"]["processing"]["status"], "VERIFIED")
        self.assertEqual(result["evidence"]["registration"]["status"], "UNVERIFIED")
        self.assertEqual(result["grid"]["nominalPostingMeters"], 30)
        self.assertGreater(len(result["coordinates"]), 50)
        self.assertGreater(result["distanceMeters"], 3000.0)
        self.assertLess(result["distanceMeters"], 4500.0)
        self.assertGreater(result["ascentMeters"], 20.0)
        self.assertGreater(result["maximumSlopeDegrees"], 0.0)
        self.assertLess(result["maximumSlopeDegrees"], 90.0)
        self.assertGreater(result["meanTerrainPenalty"], 1.0)
        for warning in (
            "not an astronaut traversability",
            "co-registration is unverified",
            "No verified Gale roughness",
            "not validated EVA",
        ):
            self.assertTrue(
                any(warning in message for message in result["warnings"]),
                f"missing warning containing {warning!r}",
            )
        # Every coordinate must lie inside the declared valid coverage.
        west, south, east, north = result["grid"]["extentWsen"]
        for longitude, latitude in result["coordinates"]:
            self.assertGreaterEqual(longitude, west)
            self.assertLessEqual(longitude, east)
            self.assertGreaterEqual(latitude, south)
            self.assertLessEqual(latitude, north)

    def test_real_gale_alternatives_are_genuine(self):
        alternatives = route_alternatives(
            self.grid, [DEMO_START, DEMO_VIA]
        )
        shortest = alternatives["alternatives"]["shortest"]
        lower = alternatives["alternatives"]["lower-terrain-cost"]
        for result in (shortest, lower):
            self.assertEqual(result["status"], "unverified")
            self.assertGreater(len(result["coordinates"]), 50)
            self.assertEqual(result["requestedWaypoints"][0], list(DEMO_START))
        self.assertEqual(shortest["preference"], "shortest")
        self.assertEqual(lower["preference"], "lower-terrain-cost")
        self.assertEqual(
            alternatives["comparison"]["equivalent"],
            shortest["coordinates"] == lower["coordinates"],
        )
        self.assertGreater(len(alternatives["comparison"]["explanation"]), 20)
        if not alternatives["comparison"]["equivalent"]:
            self.assertNotEqual(
                shortest["coordinates"], lower["coordinates"]
            )
        # The lower-terrain-cost route must not cost more under its own model.
        self.assertGreaterEqual(
            lower["totalTerrainCostMeters"], lower["distanceMeters"]
        )
        self.assertAlmostEqual(
            shortest["totalTerrainCostMeters"], shortest["distanceMeters"], places=6
        )
        self.assertAlmostEqual(
            lower["distanceMeters"]
            - shortest["distanceMeters"],
            alternatives["comparison"]["distanceDeltaMeters"],
            places=6,
        )

    def test_real_route_is_deterministic(self):
        first = route(self.grid, [DEMO_START, DEMO_VIA], "shortest")
        second = route(self.grid, [DEMO_START, DEMO_VIA], "shortest")
        self.assertEqual(first["coordinates"], second["coordinates"])
        self.assertEqual(first["distanceMeters"], second["distanceMeters"])
        self.assertEqual(
            first["samples"]["expandedNodes"],
            second["samples"]["expandedNodes"],
        )

    def test_shortest_matches_dijkstra_on_real_grid(self):
        start_snap = self.grid.nearest_valid(*DEMO_START)
        end_snap = self.grid.nearest_valid(*DEMO_VIA)
        self.assertTrue(start_snap.ok and end_snap.ok)
        assert start_snap.row is not None and start_snap.col is not None
        assert end_snap.row is not None and end_snap.col is not None
        heuristic = astar(
            self.grid,
            (start_snap.row, start_snap.col),
            (end_snap.row, end_snap.col),
            "shortest",
        )
        dijkstra = astar(
            self.grid,
            (start_snap.row, start_snap.col),
            (end_snap.row, end_snap.col),
            "shortest",
            use_heuristic=False,
        )
        self.assertTrue(heuristic.found and dijkstra.found)
        self.assertAlmostEqual(
            heuristic.distance_m, dijkstra.distance_m, places=6
        )
        self.assertLessEqual(heuristic.expanded_nodes, dijkstra.expanded_nodes)

    def test_coarse_product_is_separate_and_far_too_coarse_for_hazards(self):
        self.assertEqual(self.coarse.metadata["nominalPostingMeters"], 200)
        self.assertEqual(int(self.coarse.valid.sum()), 41772)
        stats = self.coarse.stats()
        self.assertAlmostEqual(stats["validAreaKm2"], 1665.266, places=3)
        result = route(
            self.coarse,
            [(137.44, -4.59), (137.40, -4.75)],
            "lower-terrain-cost",
        )
        self.assertEqual(result["status"], "unverified")
        self.assertEqual(result["sourceDatasetIds"], [COARSE_DATASET_ID])
        self.assertEqual(result["grid"]["nominalPostingMeters"], 200)
        self.assertTrue(
            any("200 m HRSC-MOLA" in warning for warning in result["warnings"])
        )
        self.assertTrue(
            any("600 m gradient support" in warning for warning in result["warnings"])
        )

    def test_demo_examples_are_committed_with_evidence(self):
        examples = DATA_DIR / "examples"
        for name in (
            "gale-demo-route-shortest.json",
            "gale-demo-route-lower-terrain-cost.json",
            "gale-demo-alternatives.json",
        ):
            payload = json.loads((examples / name).read_text(encoding="utf-8"))
            self.assertEqual(payload["regionId"], "gale")
            if payload["schemaVersion"] == "gale-route-v1":
                self.assertEqual(payload["status"], "unverified")
                self.assertFalse(payload["registrationVerified"])
                self.assertIn("demonstrationNote", payload)
            else:
                self.assertEqual(
                    payload["schemaVersion"], "gale-route-alternatives-v1"
                )
                self.assertEqual(len(payload["request"]["waypoints"]), 3)
                for result in payload["alternatives"].values():
                    self.assertEqual(result["status"], "unverified")
                    self.assertFalse(result["registrationVerified"])

    def test_out_of_coverage_on_real_grid_is_structured(self):
        result = route(self.grid, [(0.0, 0.0), DEMO_VIA], "shortest")
        self.assertEqual(result["status"], "unavailable")
        self.assertEqual(result["failure"]["code"], "requested_coordinate_outside_dataset_extent")
        self.assertEqual(result["coordinates"], [])
        self.assertEqual(result["segments"], [])
        self.assertFalse(result["waypoints"][0]["insideDeclaredExtent"])

    def test_bounded_snap_just_outside_extent_is_explicit(self):
        west, south, east, north = self.grid.extent_wsen
        outside = (east + 0.0002, (south + north) / 2.0)
        snap = self.grid.nearest_valid(*outside, max_snap_m=100.0)
        self.assertTrue(snap.ok)
        self.assertFalse(snap.inside_extent)
        self.assertIsNotNone(snap.snapped_lon)
        self.assertIsNotNone(snap.distance_m)
        assert snap.distance_m is not None
        self.assertLessEqual(snap.distance_m, 100.0)
        self.assertEqual(snap.reason, "nearest_valid_cell_beyond_declared_extent")


class GridValidationTests(unittest.TestCase):
    def test_checksum_mismatch_is_rejected(self):
        source = DATA_DIR / "gale-hrsc-30m-routing.tif"
        with tempfile.TemporaryDirectory() as temp_dir:
            copy = Path(temp_dir) / source.name
            shutil.copyfile(source, copy)
            with self.assertRaises(ValueError):
                load_grid(copy, "test", expected_sha256="0" * 64)

    def test_earth_crs_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "earth.tif"
            data = np.zeros((8, 8), dtype=np.float32)
            with rasterio.open(
                path,
                "w",
                driver="GTiff",
                width=8,
                height=8,
                count=1,
                dtype="float32",
                crs=CRS.from_epsg(4326),
                transform=from_origin(137.0, -4.0, 0.01, 0.01),
            ) as target:
                target.write(data, 1)
            with self.assertRaises(ValueError):
                load_grid(path, "earth-test")

    def test_rotated_grid_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "rotated.tif"
            data = np.zeros((8, 8), dtype=np.float32)
            mars_crs = CRS.from_proj4(
                f"+proj=eqc +lat_ts=0 +lat_0=0 +lon_0=0 +R={MARS_RADIUS_M} +units=m +no_defs"
            )
            with rasterio.open(
                path,
                "w",
                driver="GTiff",
                width=8,
                height=8,
                count=1,
                dtype="float32",
                crs=mars_crs,
                transform=Affine(30.0, 5.0, 0.0, 5.0, -30.0, 0.0),
            ) as target:
                target.write(data, 1)
            with self.assertRaises(ValueError):
                load_grid(path, "rotated-test")


if __name__ == "__main__":
    unittest.main()
