"""Optional FastAPI boundary for the Gale terrain-aware routing engine.

The core engine has no web dependency.  This module is a thin, runtime-validated
wrapper for integration work; it does not modify the shared mission planner,
timeline, or resource-budget engines.

Run locally::

    python -m uvicorn team.gale.routing.service:app --port 8000

Then::

    POST /route
    {
      "regionId": "gale",
      "datasetId": "gale-hrsc-30m",
      "start": [137.441633, -4.589467],
      "waypoints": [[137.4010487, -4.6347708]],
      "destination": [137.3891532, -4.8256778],
      "preference": "lower-terrain-cost",
      "maxSnapMeters": 100
    }
"""

from __future__ import annotations

from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .datasets import (
    COARSE_DATASET_ID,
    PRIMARY_DATASET_ID,
    dataset_manifest,
    dataset_specs,
    load_dataset,
)
from .engine import route, route_alternatives

app = FastAPI(
    title="Marswalk Gale terrain-aware routing",
    version="1.0.0",
    description=(
        "Computes shortest and lower-terrain-cost paths through authentic Gale "
        "numeric DEM products. Not an astronaut traversability or safety "
        "certification service."
    ),
)


class RouteRequestModel(BaseModel):
    regionId: Literal["gale"] = "gale"
    datasetId: Literal[
        PRIMARY_DATASET_ID, COARSE_DATASET_ID
    ] = PRIMARY_DATASET_ID
    start: tuple[float, float]
    waypoints: list[tuple[float, float]] = Field(default_factory=list)
    destination: tuple[float, float]
    preference: Literal["shortest", "lower-terrain-cost"] = (
        "lower-terrain-cost"
    )
    maxSnapMeters: float = Field(default=100.0, gt=0, le=250.0)

    def ordered_waypoints(self) -> list[tuple[float, float]]:
        return [self.start, *self.waypoints, self.destination]


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "regionId": "gale",
        "datasets": [PRIMARY_DATASET_ID, COARSE_DATASET_ID],
        "notASafetyCertification": True,
    }


@app.get("/datasets")
def datasets() -> dict[str, object]:
    return {
        "regionId": "gale",
        "datasets": dataset_specs(),
        "manifest": dataset_manifest(),
    }


@app.get("/datasets/{dataset_id}")
def dataset(dataset_id: str) -> dict[str, object]:
    for entry in dataset_specs():
        if entry["datasetId"] == dataset_id:
            return entry
    raise HTTPException(status_code=404, detail="unknown routing dataset")


@app.post("/route")
def compute_route(request: RouteRequestModel) -> dict[str, object]:
    try:
        grid = load_dataset(request.datasetId)
        return route(
            grid,
            request.ordered_waypoints(),
            request.preference,
            max_snap_m=request.maxSnapMeters,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/route/alternatives")
def compute_alternatives(request: RouteRequestModel) -> dict[str, object]:
    try:
        grid = load_dataset(request.datasetId)
        return route_alternatives(
            grid,
            request.ordered_waypoints(),
            max_snap_m=request.maxSnapMeters,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
