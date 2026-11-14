"""Gale terrain-aware routing engine.

Public entry points:

* ``load_dataset`` - checksum-verified numeric Gale DEM products.
* ``route`` - one route under ``shortest`` or ``lower-terrain-cost``.
* ``route_alternatives`` - both objectives on the same graph.
* ``astar`` - deterministic 8-connected graph search.

All coordinates are ``[longitude_east, latitude_planetocentric]`` in degrees.
"""

from .cost import CostModel, EdgeCost
from .datasets import (
    COARSE_DATASET_ID,
    PRIMARY_DATASET_ID,
    SPECS,
    dataset_manifest,
    dataset_specs,
    load_dataset,
)
from .engine import route, route_alternatives
from .grid import RoutingGrid, SnapResult, load_grid
from .search import PathResult, astar
from .terrain import MARS_RADIUS_M, haversine_m, horn_slope

__all__ = [
    "COARSE_DATASET_ID",
    "PRIMARY_DATASET_ID",
    "SPECS",
    "CostModel",
    "EdgeCost",
    "MARS_RADIUS_M",
    "PathResult",
    "RoutingGrid",
    "SnapResult",
    "astar",
    "dataset_manifest",
    "dataset_specs",
    "haversine_m",
    "horn_slope",
    "load_dataset",
    "load_grid",
    "route",
    "route_alternatives",
]
