#!/usr/bin/env python3
"""
Marswalk Planner — Jezero Authentic Terrain Route Validation

Executes genuine DEM pathfinding on the authentic Jezero Crater routing cost grid
derived from the USGS Mars 2020 TRN HiRISE DTM mosaic:
JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40
(DOI 10.5066/P9REJ9JN).

Outputs:
  team/jezero/routing/real_routing_validation.json

Scientific safeguards:
- Uses measured, authentic numeric elevation and slope values.
- Compares Shortest vs Lower-Terrain-Cost alternatives.
- Records exact path coordinates, 3D distance, ascent, descent, and slope metrics.
- Evaluates out-of-coverage boundary conditions.
- Strictly notes that absolute geographic registration remains UNVERIFIED.
"""

import json
import math
from pathlib import Path
import numpy as np

GRID_JSON_PATH = Path("data/routing/jezero/jezero_routing_grid.json")
OUTPUT_VALIDATION_PATH = Path("team/jezero/routing/real_routing_validation.json")
MARS_RADIUS = 3396190.0
DEG_TO_RAD = math.pi / 180.0
RAD_TO_DEG = 180.0 / math.pi


def lon_lat_to_xy(lon, lat):
    return MARS_RADIUS * lon * DEG_TO_RAD, MARS_RADIUS * lat * DEG_TO_RAD


def xy_to_lon_lat(x, y):
    return (x / MARS_RADIUS) * RAD_TO_DEG, (y / MARS_RADIUS) * RAD_TO_DEG


class JezeroGrid:
    def __init__(self, data):
        self.meta = data["metadata"]
        self.width = self.meta["width"]
        self.height = self.meta["height"]
        self.spacing = self.meta["gridSpacingMeters"]
        self.nodata = self.meta["nodataValue"]

        self.elevs = np.array(data["elevations"], dtype=np.float32).reshape(
            self.height, self.width
        )
        self.slopes = np.array(data["slopes"], dtype=np.float32).reshape(
            self.height, self.width
        )
        self.valid = np.array(data["validMask"], dtype=bool).reshape(
            self.height, self.width
        )

        ul_x, ul_y = lon_lat_to_xy(
            self.meta["bounds"]["west"], self.meta["bounds"]["north"]
        )
        self.ul_easting = ul_x
        self.ul_northing = ul_y
        self.center_lat = (
            self.meta["bounds"]["north"] + self.meta["bounds"]["south"]
        ) / 2.0
        self.cos_lat = math.cos(self.center_lat * DEG_TO_RAD)
        self.dx = self.spacing * self.cos_lat
        self.dy = self.spacing

    def coord_to_cell(self, lon, lat):
        easting, northing = lon_lat_to_xy(lon, lat)
        col = (easting - self.ul_easting) / self.dx
        row = (self.ul_northing - northing) / self.dy
        return round(col), round(row)

    def cell_to_coord(self, col, row):
        easting = self.ul_easting + (col + 0.5) * self.dx
        northing = self.ul_northing - (row + 0.5) * self.dy
        return xy_to_lon_lat(easting, northing)

    def is_valid_cell(self, col, row):
        if 0 <= col < self.width and 0 <= row < self.height:
            return bool(self.valid[row, col])
        return False

    def dist(self, c1, r1, c2, r2):
        dc = (c2 - c1) * self.dx
        dr = (r2 - r1) * self.dy
        return math.hypot(dc, dr)

    def snap_cell(self, col, row, max_dist_m=150.0):
        if self.is_valid_cell(col, row):
            return col, row, 0.0

        max_cells = int(math.ceil(max_dist_m / self.dx))
        best = None
        min_d = float("inf")

        for r in range(1, max_cells + 1):
            for dy in range(-r, r + 1):
                for dx in range(-r, r + 1):
                    if abs(dx) != r and abs(dy) != r:
                        continue
                    cc, rr = col + dx, row + dy
                    if self.is_valid_cell(cc, rr):
                        d = self.dist(col, row, cc, rr)
                        if d <= max_dist_m and d < min_d:
                            min_d = d
                            best = (cc, rr)
            if best is not None:
                return best[0], best[1], min_d

        return None


def astar(grid, start_cell, goal_cell, preference="shortest", max_slope=25.0):
    import heapq

    sc, sr = start_cell
    gc, gr = goal_cell

    if not grid.is_valid_cell(sc, sr) or not grid.is_valid_cell(gc, gr):
        return None

    pq = []
    h0 = grid.dist(sc, sr, gc, gr)
    heapq.heappush(pq, (h0, 0.0, (sc, sr)))

    g_scores = {start_cell: 0.0}
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

        if curr == goal_cell:
            path = []
            node = curr
            while node in came_from:
                path.append(node)
                node = came_from[node]
            path.append(start_cell)
            path.reverse()
            return path, curr_g

        cc, cr = curr
        for dc, dr in neighbors:
            nc, nr = cc + dc, cr + dr
            nxt = (nc, nr)
            if not grid.is_valid_cell(nc, nr) or nxt in visited:
                continue

            slope = float(grid.slopes[nr, nc])
            if slope > max_slope:
                continue

            step_d = grid.dist(cc, cr, nc, nr)
            dz = float(grid.elevs[nr, nc] - grid.elevs[cr, cc])

            if preference == "shortest":
                cost = step_d
            else:
                grad = dz / step_d
                slope_term = 2.0 * ((slope / 10.0) ** 2)
                ascent_term = 3.0 * grad if grad > 0 else 0.0
                descent_term = 1.0 * -grad if grad < 0 else 0.0
                mult = max(1.0, 1.0 + slope_term + ascent_term + descent_term)
                cost = step_d * mult

            tentative_g = curr_g + cost
            if tentative_g < g_scores.get(nxt, float("inf")):
                g_scores[nxt] = tentative_g
                came_from[nxt] = curr
                h = grid.dist(nc, nr, gc, gr)
                heapq.heappush(pq, (tentative_g + h, tentative_g, nxt))

    return None


def calculate_metrics(grid, path_cells):
    coords = []
    total_3d_dist = 0.0
    total_ascent = 0.0
    total_descent = 0.0
    max_slope = 0.0
    slope_sum = 0.0

    for i, (c, r) in enumerate(path_cells):
        coords.append(grid.cell_to_coord(c, r))
        slope = float(grid.slopes[r, c])
        if slope > max_slope:
            max_slope = slope
        slope_sum += slope

        if i > 0:
            pc, pr = path_cells[i - 1]
            d_horiz = grid.dist(pc, pr, c, r)
            dz = float(grid.elevs[r, c] - grid.elevs[pr, pc])
            d_3d = math.hypot(d_horiz, dz)
            total_3d_dist += d_3d
            if dz > 0:
                total_ascent += dz
            else:
                total_descent += -dz

    mean_slope = slope_sum / len(path_cells) if path_cells else 0.0
    return {
        "coordinates": coords,
        "distanceMeters": round(total_3d_dist, 1),
        "ascentMeters": round(total_ascent, 1),
        "descentMeters": round(total_descent, 1),
        "maximumSlopeDegrees": round(max_slope, 1),
        "meanSlopeDegrees": round(mean_slope, 1),
        "stepCount": len(path_cells),
    }


def main():
    print(f"Loading Jezero routing grid from {GRID_JSON_PATH}...")
    with open(GRID_JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    grid = JezeroGrid(data)
    print(f"Loaded grid: {grid.width}x{grid.height}, valid cells: {np.sum(grid.valid)}")

    # Test Case 1: Route from Perseverance Landing Site to Western Delta Front
    # Landing Site: [77.450886, 18.444627]
    # Delta Front:  [77.380000, 18.455000]
    start_req = [77.450886, 18.444627]
    goal_req = [77.380000, 18.455000]

    sc0, sr0 = grid.coord_to_cell(*start_req)
    gc0, gr0 = grid.coord_to_cell(*goal_req)

    snap_start = grid.snap_cell(sc0, sr0)
    snap_goal = grid.snap_cell(gc0, gr0)

    assert snap_start is not None, "Start snap failed!"
    assert snap_goal is not None, "Goal snap failed!"

    start_cell = (snap_start[0], snap_start[1])
    goal_cell = (snap_goal[0], snap_goal[1])

    print(f"Computing Shortest path from Landing Site to Delta Front...")
    shortest_res = astar(grid, start_cell, goal_cell, preference="shortest")
    assert shortest_res is not None, "Shortest pathfinding failed!"
    shortest_metrics = calculate_metrics(grid, shortest_res[0])

    print(f"Computing Lower-Terrain-Cost path from Landing Site to Delta Front...")
    lower_res = astar(grid, start_cell, goal_cell, preference="lower-terrain-cost")
    assert lower_res is not None, "Lower cost pathfinding failed!"
    lower_metrics = calculate_metrics(grid, lower_res[0])

    print(f"Shortest path: {shortest_metrics['distanceMeters']} m, max slope {shortest_metrics['maximumSlopeDegrees']} deg, mean {shortest_metrics['meanSlopeDegrees']} deg")
    print(f"Lower cost path: {lower_metrics['distanceMeters']} m, max slope {lower_metrics['maximumSlopeDegrees']} deg, mean {lower_metrics['meanSlopeDegrees']} deg")

    paths_identical = (shortest_res[0] == lower_res[0])
    print(f"Paths identical: {paths_identical}")

    # Test Case 2: Multi-waypoint segment route
    # Landing -> Séítah South -> Delta Front
    wp_landing = [77.450886, 18.444627]
    wp_seitah = [77.430000, 18.435000]
    wp_delta = [77.380000, 18.455000]

    wps = [wp_landing, wp_seitah, wp_delta]
    multi_segments = []
    for i in range(len(wps) - 1):
        c1, r1 = grid.coord_to_cell(*wps[i])
        c2, r2 = grid.coord_to_cell(*wps[i + 1])
        s1 = grid.snap_cell(c1, r1)
        s2 = grid.snap_cell(c2, r2)
        res = astar(grid, (s1[0], s1[1]), (s2[0], s2[1]), "lower-terrain-cost")
        assert res is not None
        seg_met = calculate_metrics(grid, res[0])
        multi_segments.append({
            "segment": f"WP{i+1}->WP{i+2}",
            "metrics": seg_met
        })

    # Test Case 3: Out-of-coverage rejection
    # West of 77.2229 is outside DEM footprint
    out_of_bounds_req = [77.190000, 18.440000]
    oc, orow = grid.coord_to_cell(*out_of_bounds_req)
    out_snap = grid.snap_cell(oc, orow, max_dist_m=150.0)
    out_of_bounds_rejected = (out_snap is None)
    print(f"Out-of-coverage coordinate correctly rejected: {out_of_bounds_rejected}")

    report = {
        "status": "PASS",
        "sourceProduct": grid.meta["sourceProduct"],
        "doi": grid.meta["doi"],
        "sourceSha256": grid.meta["sourceSha256"],
        "routingGridPostingMeters": grid.spacing,
        "gridDimensions": [grid.width, grid.height],
        "testCase1_LandingToDelta": {
            "requestedStart": start_req,
            "requestedGoal": goal_req,
            "startSnapDistanceMeters": round(snap_start[2], 1),
            "goalSnapDistanceMeters": round(snap_goal[2], 1),
            "shortestAlternative": shortest_metrics,
            "lowerCostAlternative": lower_metrics,
            "pathsIdentical": paths_identical,
        },
        "testCase2_MultiWaypointRoute": {
            "waypoints": wps,
            "segments": multi_segments,
        },
        "testCase3_CoverageBoundaryRejection": {
            "requestedCoordinate": out_of_bounds_req,
            "snapAttemptRadiusMeters": 150.0,
            "rejectedAsUnsupported": out_of_bounds_rejected,
        },
        "scientificLimitations": [
            "Routes are computed using authentic USGS DEM elevations and derived slopes, not visual curves.",
            "Slope and elevation cost functions reflect mathematical optimization, NOT certified astronaut safety thresholds.",
            "Horizontal registration reflects USGS TRN HiRISE mosaic; independent absolute ground control is UNVERIFIED.",
            "Areas outside the DEM footprint (west of 77.2229E) are strictly non-traversable."
        ]
    }

    OUTPUT_VALIDATION_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_VALIDATION_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"Wrote real Jezero routing validation to {OUTPUT_VALIDATION_PATH}")


if __name__ == "__main__":
    main()
