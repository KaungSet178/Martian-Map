"""Deterministic A*/Dijkstra search on the Gale 8-connected routing grid.

A* uses the great-circle ground distance to the goal as an admissible and
consistent heuristic because every edge cost is at least its ground distance.
Dijkstra is retained as an independent correctness oracle for tests.

The implementation never post-processes the path into a smooth curve: the
returned geometry is the actual graph search result on cell centres.
"""

from __future__ import annotations

import heapq
import math
from dataclasses import dataclass
from typing import Literal

import numpy as np

from .cost import CostModel
from .grid import RoutingGrid
from .terrain import haversine_m

Preference = Literal["shortest", "lower-terrain-cost"]

# Fixed neighbour order keeps equal-cost searches deterministic across Python
# versions and platforms.  Orthogonal moves are evaluated before diagonals.
NEIGHBOURS: tuple[tuple[int, int], ...] = (
    (-1, -1),
    (-1, 0),
    (-1, 1),
    (0, -1),
    (0, 1),
    (1, -1),
    (1, 0),
    (1, 1),
)


@dataclass(frozen=True)
class PathResult:
    found: bool
    failure: str | None
    nodes: tuple[int, ...]
    distance_m: float
    ascent_m: float
    descent_m: float
    total_cost_m: float
    max_grade_deg: float
    mean_grade_deg: float
    max_cell_slope_deg: float
    mean_cell_slope_deg: float
    min_elevation_m: float | None
    max_elevation_m: float | None
    net_elevation_m: float | None
    expanded_nodes: int
    heap_pushes: int
    start: tuple[int, int]
    goal: tuple[int, int]

    def coordinates(self, grid: RoutingGrid) -> list[list[float]]:
        return [
            [round(grid.lon_centers[c], 7), round(grid.lat_centers[r], 7)]
            for r, c in (grid.row_col(index) for index in self.nodes)
        ]


def _empty_failure(
    failure: str,
    start: tuple[int, int],
    goal: tuple[int, int],
    expanded: int = 0,
    pushes: int = 0,
) -> PathResult:
    return PathResult(
        found=False,
        failure=failure,
        nodes=(),
        distance_m=0.0,
        ascent_m=0.0,
        descent_m=0.0,
        total_cost_m=0.0,
        max_grade_deg=0.0,
        mean_grade_deg=0.0,
        max_cell_slope_deg=0.0,
        mean_cell_slope_deg=0.0,
        min_elevation_m=None,
        max_elevation_m=None,
        net_elevation_m=None,
        expanded_nodes=expanded,
        heap_pushes=pushes,
        start=start,
        goal=goal,
    )


def astar(
    grid: RoutingGrid,
    start: tuple[int, int],
    goal: tuple[int, int],
    preference: Preference = "lower-terrain-cost",
    cost_model: CostModel | None = None,
    *,
    use_heuristic: bool = True,
    max_expansions: int | None = None,
) -> PathResult:
    """Find a least-cost path between two routeable grid cells.

    Parameters
    ----------
    grid:
        Loaded Gale routing grid.
    start, goal:
        ``(row, col)`` integer cell indices.  Both must be routeable.
    preference:
        ``"shortest"`` optimises ground distance only.
        ``"lower-terrain-cost"`` applies the documented terrain penalty.
    cost_model:
        Required for ``"lower-terrain-cost"``; ignored for ``"shortest"``.
    use_heuristic:
        ``True`` runs A*; ``False`` runs Dijkstra (used by tests).
    max_expansions:
        Optional safety limit for long searches.  Exceeding it returns the
        structured ``expansion_limit`` failure rather than a partial path.
    """
    height = grid.height
    width = grid.width
    if not (0 <= start[0] < height and 0 <= start[1] < width):
        return _empty_failure("start_out_of_bounds", start, goal)
    if not (0 <= goal[0] < height and 0 <= goal[1] < width):
        return _empty_failure("goal_out_of_bounds", start, goal)
    if not grid.valid[start[0], start[1]]:
        return _empty_failure("start_cell_invalid", start, goal)
    if not grid.valid[goal[0], goal[1]]:
        return _empty_failure("goal_cell_invalid", start, goal)
    if preference not in ("shortest", "lower-terrain-cost"):
        raise ValueError(f"unsupported preference: {preference}")
    if preference == "lower-terrain-cost" and cost_model is None:
        raise ValueError("cost_model is required for lower-terrain-cost routing")

    start_index = grid.index(*start)
    goal_index = grid.index(*goal)
    goal_lon, goal_lat = grid.lonlat(*goal)

    if start_index == goal_index:
        elevation = float(grid.elevation[goal[0], goal[1]])
        return PathResult(
            found=True,
            failure=None,
            nodes=(start_index,),
            distance_m=0.0,
            ascent_m=0.0,
            descent_m=0.0,
            total_cost_m=0.0,
            max_grade_deg=0.0,
            mean_grade_deg=0.0,
            max_cell_slope_deg=float(grid.slope_deg[goal[0], goal[1]]),
            mean_cell_slope_deg=float(grid.slope_deg[goal[0], goal[1]]),
            min_elevation_m=elevation,
            max_elevation_m=elevation,
            net_elevation_m=0.0,
            expanded_nodes=1,
            heap_pushes=1,
            start=start,
            goal=goal,
        )

    def heuristic(row: int, col: int) -> float:
        if not use_heuristic:
            return 0.0
        return haversine_m(
            float(grid.lon_centers[col]),
            float(grid.lat_centers[row]),
            goal_lon,
            goal_lat,
        )

    size = height * width
    g_score = np.full(size, np.inf, dtype=np.float64)
    parent = np.full(size, -1, dtype=np.int64)
    closed = np.zeros(size, dtype=bool)
    g_score[start_index] = 0.0
    h_start = heuristic(*start)
    heap: list[tuple[float, float, int]] = [(h_start, h_start, start_index)]
    pushes = 1
    expanded = 0

    east = grid.east_step_m
    north = grid.north_step_m
    elevation = grid.elevation
    slope = grid.slope_deg
    valid = grid.valid

    found = False
    while heap:
        _, _, current = heapq.heappop(heap)
        if closed[current]:
            continue
        closed[current] = True
        expanded += 1
        if current == goal_index:
            found = True
            break
        if max_expansions is not None and expanded > max_expansions:
            return _empty_failure(
                "expansion_limit", start, goal, expanded=expanded, pushes=pushes
            )

        row, col = divmod(current, width)
        current_elevation = elevation[row, col]
        current_g = g_score[current]

        for delta_row, delta_col in NEIGHBOURS:
            next_row = row + delta_row
            next_col = col + delta_col
            if next_row < 0 or next_row >= height or next_col < 0 or next_col >= width:
                continue
            if not valid[next_row, next_col]:
                continue

            if delta_row == 0:
                distance = float(east[row])
            elif delta_col == 0:
                distance = float(north[min(row, next_row)])
            else:
                distance = float(grid.diagonal_step_m[min(row, next_row)])
            if distance <= 0.0:
                continue

            dz = float(elevation[next_row, next_col] - current_elevation)
            if preference == "shortest":
                step_cost = distance
            else:
                assert cost_model is not None
                step_cost = cost_model.edge(
                    distance,
                    dz,
                    float(slope[row, col]),
                    float(slope[next_row, next_col]),
                ).cost_m

            tentative = current_g + step_cost
            next_index = next_row * width + next_col
            if tentative >= g_score[next_index] - 1e-12:
                continue

            g_score[next_index] = tentative
            parent[next_index] = current
            h_value = heuristic(next_row, next_col)
            heapq.heappush(heap, (tentative + h_value, h_value, next_index))
            pushes += 1

    if not found:
        return _empty_failure(
            "unreachable", start, goal, expanded=expanded, pushes=pushes
        )

    # Reconstruct the actual graph path.
    path: list[int] = []
    cursor = goal_index
    while cursor != -1:
        path.append(cursor)
        if cursor == start_index:
            break
        cursor = int(parent[cursor])
    if not path or path[-1] != start_index:
        return _empty_failure(
            "path_reconstruction_failed",
            start,
            goal,
            expanded=expanded,
            pushes=pushes,
        )
    path.reverse()

    distance_total = 0.0
    ascent_total = 0.0
    descent_total = 0.0
    grade_weighted = 0.0
    cell_slope_weighted = 0.0
    max_grade = 0.0
    max_cell_slope = 0.0
    minimum_elevation = float(elevation[path[0] // width, path[0] % width])
    maximum_elevation = minimum_elevation

    for index_a, index_b in zip(path, path[1:]):
        row_a, col_a = divmod(index_a, width)
        row_b, col_b = divmod(index_b, width)
        if row_a == row_b:
            distance = float(east[row_a])
        elif col_a == col_b:
            distance = float(north[min(row_a, row_b)])
        else:
            distance = float(grid.diagonal_step_m[min(row_a, row_b)])
        dz = float(elevation[row_b, col_b] - elevation[row_a, col_a])
        grade_deg = math.degrees(math.atan2(dz, distance))
        distance_total += distance
        ascent_total += max(dz, 0.0)
        descent_total += max(-dz, 0.0)
        grade_weighted += abs(grade_deg) * distance
        max_grade = max(max_grade, abs(grade_deg))
        edge_cell_slope = max(
            float(slope[row_a, col_a]), float(slope[row_b, col_b])
        )
        cell_slope_weighted += edge_cell_slope * distance
        max_cell_slope = max(max_cell_slope, edge_cell_slope)
        node_elevation = float(elevation[row_b, col_b])
        minimum_elevation = min(minimum_elevation, node_elevation)
        maximum_elevation = max(maximum_elevation, node_elevation)

    first_elevation = float(elevation[path[0] // width, path[0] % width])
    last_elevation = float(elevation[path[-1] // width, path[-1] % width])

    return PathResult(
        found=True,
        failure=None,
        nodes=tuple(path),
        distance_m=distance_total,
        ascent_m=ascent_total,
        descent_m=descent_total,
        total_cost_m=float(g_score[goal_index]),
        max_grade_deg=max_grade,
        mean_grade_deg=(
            grade_weighted / distance_total if distance_total > 0.0 else 0.0
        ),
        max_cell_slope_deg=max_cell_slope,
        mean_cell_slope_deg=(
            cell_slope_weighted / distance_total if distance_total > 0.0 else 0.0
        ),
        min_elevation_m=minimum_elevation,
        max_elevation_m=maximum_elevation,
        net_elevation_m=last_elevation - first_elevation,
        expanded_nodes=expanded,
        heap_pushes=pushes,
        start=start,
        goal=goal,
    )
