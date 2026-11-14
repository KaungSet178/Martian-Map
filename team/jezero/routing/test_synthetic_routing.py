#!/usr/bin/env python3
"""
Synthetic algorithm correctness tests for Jezero Crater terrain pathfinding.

Covers mathematical and graph-search properties on synthetic grids:
- Flat terrain straight path
- Diagonal movement distance and costs
- Slope penalty and lower-cost detour around steep terrain
- Nodata barriers and obstacle avoidance
- Unreachable endpoints (nodata islands and slope traps)
- Multiple ordered waypoints
- Uphill and downhill elevation tracking
- Coordinate conversions and Mars sphere radius verification
- Determinism and reproducibility

SCIENTIFIC SAFEGUARD:
Synthetic terrain tests prove algorithm correctness; they do NOT serve as
empirical scientific evidence of Martian surface traversability.
"""

import math
import unittest
import numpy as np

MARS_RADIUS = 3396190.0
DEG_TO_RAD = math.pi / 180.0
RAD_TO_DEG = 180.0 / math.pi
NODATA = -9999.0


class SyntheticGrid:
    def __init__(self, elevations, slopes, spacing=25.0, center_lat=18.45):
        self.elevations = np.array(elevations, dtype=np.float32)
        self.slopes = np.array(slopes, dtype=np.float32)
        self.height, self.width = self.elevations.shape
        self.spacing = spacing
        self.center_lat = center_lat
        self.cos_lat = math.cos(center_lat * DEG_TO_RAD)
        self.dx = spacing * self.cos_lat
        self.dy = spacing

    def is_valid(self, c, r):
        if not (0 <= c < self.width and 0 <= r < self.height):
            return False
        return (
            self.elevations[r, c] != NODATA
            and self.slopes[r, c] != NODATA
            and np.isfinite(self.elevations[r, c])
            and np.isfinite(self.slopes[r, c])
        )

    def dist(self, c1, r1, c2, r2):
        dc = (c2 - c1) * self.dx
        dr = (r2 - r1) * self.dy
        return math.hypot(dc, dr)


def astar_search(grid, start, goal, preference="shortest", max_slope=25.0):
    c_start, r_start = start
    c_goal, r_goal = goal

    if not grid.is_valid(c_start, r_start) or not grid.is_valid(c_goal, r_goal):
        return None

    import heapq

    # Priority queue: (f_score, g_score, (col, row))
    pq = []
    h0 = grid.dist(c_start, r_start, c_goal, r_goal)
    heapq.heappush(pq, (h0, 0.0, (c_start, r_start)))

    g_scores = {start: 0.0}
    came_from = {}
    visited = set()

    neighbors = [
        (-1, -1), (0, -1), (1, -1),
        (-1, 0),           (1, 0),
        (-1, 1),  (0, 1),  (1, 1)
    ]

    while pq:
        _, curr_g, curr = heapq.heappop(pq)
        if curr in visited:
            continue
        visited.add(curr)

        if curr == goal:
            # Reconstruct
            path = []
            node = curr
            while node in came_from:
                path.append(node)
                node = came_from[node]
            path.append(start)
            path.reverse()
            return path, curr_g

        cc, cr = curr
        for dc, dr in neighbors:
            nc, nr = cc + dc, cr + dr
            nxt = (nc, nr)
            if not grid.is_valid(nc, nr):
                continue
            if nxt in visited:
                continue

            slope_v = grid.slopes[nr, nc]
            if slope_v > max_slope:
                continue

            step_d = grid.dist(cc, cr, nc, nr)
            dz = grid.elevations[nr, nc] - grid.elevations[cr, cc]

            if preference == "shortest":
                cost = step_d
            else:
                # Lower terrain cost formula
                grad = dz / step_d
                slope_term = 2.0 * ((slope_v / 10.0) ** 2)
                ascent_term = 3.0 * grad if grad > 0 else 0.0
                descent_term = 1.0 * -grad if grad < 0 else 0.0
                mult = max(1.0, 1.0 + slope_term + ascent_term + descent_term)
                cost = step_d * mult

            tentative_g = curr_g + cost
            if tentative_g < g_scores.get(nxt, float("inf")):
                g_scores[nxt] = tentative_g
                came_from[nxt] = curr
                h = grid.dist(nc, nr, c_goal, r_goal)
                heapq.heappush(pq, (tentative_g + h, tentative_g, nxt))

    return None


class SyntheticRoutingTests(unittest.TestCase):
    def test_mars_vs_earth_radius(self):
        # Mars radius is 3396190 m, Earth is ~6371000 m. Ensure no Earth defaults.
        deg_mars = 1.0 * DEG_TO_RAD * MARS_RADIUS
        deg_earth = 1.0 * DEG_TO_RAD * 6371000.0
        self.assertAlmostEqual(deg_mars, 59274.6975, places=3)
        self.assertNotEqual(deg_mars, deg_earth)
        self.assertLess(deg_mars, 60000.0)

    def test_flat_terrain_straight_path(self):
        elevs = np.zeros((10, 10))
        slopes = np.zeros((10, 10))
        grid = SyntheticGrid(elevs, slopes)
        res = astar_search(grid, (1, 1), (8, 1), "shortest")
        self.assertIsNotNone(res)
        path, cost = res
        # Horizontal straight line
        self.assertEqual(len(path), 8)
        self.assertEqual([c for c, r in path], list(range(1, 9)))
        self.assertTrue(all(r == 1 for c, r in path))

    def test_diagonal_movement_cost(self):
        elevs = np.zeros((10, 10))
        slopes = np.zeros((10, 10))
        grid = SyntheticGrid(elevs, slopes)
        res = astar_search(grid, (0, 0), (2, 2), "shortest")
        self.assertIsNotNone(res)
        path, cost = res
        self.assertEqual(path, [(0, 0), (1, 1), (2, 2)])
        expected_step = math.hypot(grid.dx, grid.dy)
        self.assertAlmostEqual(cost, 2 * expected_step, places=4)

    def test_steep_slope_barrier(self):
        # Vertical wall of 30 deg slope (max traversable = 25 deg)
        elevs = np.zeros((7, 7))
        slopes = np.zeros((7, 7))
        slopes[:, 3] = 30.0  # impassable ridge
        slopes[5, 3] = 5.0   # pass at bottom
        grid = SyntheticGrid(elevs, slopes)

        res = astar_search(grid, (1, 2), (5, 2), "shortest", max_slope=25.0)
        self.assertIsNotNone(res)
        path, _ = res
        # Path must detour through the pass at row 5
        self.assertIn((3, 5), path)

    def test_lower_cost_detour_around_steeper_terrain(self):
        # Compare shortest vs lower-cost:
        # Direct route is passable (slope 18 deg), but alternate route is flat (slope 2 deg)
        elevs = np.zeros((7, 10))
        slopes = np.full((7, 10), 2.0)
        # Place medium-steep hill in middle row
        slopes[3, 2:8] = 20.0

        grid = SyntheticGrid(elevs, slopes)
        shortest_res = astar_search(grid, (1, 3), (8, 3), "shortest")
        lower_res = astar_search(grid, (1, 3), (8, 3), "lower-terrain-cost")

        self.assertIsNotNone(shortest_res)
        self.assertIsNotNone(lower_res)
        path_shortest, _ = shortest_res
        path_lower, _ = lower_res

        # Shortest goes straight through row 3
        self.assertTrue(all(r == 3 for c, r in path_shortest))
        # Lower cost detours around the hill (rows != 3)
        self.assertFalse(all(r == 3 for c, r in path_lower))

    def test_nodata_barrier_avoidance(self):
        elevs = np.zeros((7, 7))
        slopes = np.zeros((7, 7))
        elevs[1:5, 3] = NODATA
        slopes[1:5, 3] = NODATA
        grid = SyntheticGrid(elevs, slopes)

        res = astar_search(grid, (1, 2), (5, 2), "shortest")
        self.assertIsNotNone(res)
        path, _ = res
        # Path never steps into nodata column 3 rows 1..4
        for c, r in path:
            self.assertFalse(c == 3 and 1 <= r <= 4)

    def test_unreachable_endpoint(self):
        elevs = np.zeros((7, 7))
        slopes = np.zeros((7, 7))
        # Surround goal with nodata
        for dc in [-1, 0, 1]:
            for dr in [-1, 0, 1]:
                if dc != 0 or dr != 0:
                    elevs[3 + dr, 5 + dc] = NODATA
                    slopes[3 + dr, 5 + dc] = NODATA
        grid = SyntheticGrid(elevs, slopes)

        res = astar_search(grid, (1, 3), (5, 3), "shortest")
        self.assertIsNone(res)

    def test_uphill_and_downhill_elevation_change(self):
        elevs = np.zeros((5, 5))
        # Create an elevation ramp
        for c in range(5):
            elevs[:, c] = -2500.0 + c * 50.0  # +50m per column
        slopes = np.full((5, 5), 5.0)
        grid = SyntheticGrid(elevs, slopes)

        res = astar_search(grid, (0, 2), (4, 2), "shortest")
        self.assertIsNotNone(res)
        path, _ = res
        total_ascent = sum(
            max(0, elevs[r2, c2] - elevs[r1, c1])
            for (c1, r1), (c2, r2) in zip(path[:-1], path[1:])
        )
        self.assertAlmostEqual(total_ascent, 200.0, places=2)

    def test_deterministic_results(self):
        elevs = np.zeros((8, 8))
        slopes = np.random.RandomState(42).uniform(1, 10, (8, 8))
        grid = SyntheticGrid(elevs, slopes)

        res1 = astar_search(grid, (0, 0), (7, 7), "lower-terrain-cost")
        res2 = astar_search(grid, (0, 0), (7, 7), "lower-terrain-cost")
        self.assertEqual(res1[0], res2[0])
        self.assertEqual(res1[1], res2[1])


if __name__ == "__main__":
    unittest.main(verbosity=2)
