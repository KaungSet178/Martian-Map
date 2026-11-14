"""Bounded stdin/stdout adapter; preserves the validated Gale search implementation."""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from team.gale.routing.datasets import load_dataset
from team.gale.routing.engine import route_alternatives
request = json.load(sys.stdin)
grid = load_dataset(request["datasetId"])
result = route_alternatives(grid, request["coordinates"], max_snap_m=request["maxSnapMeters"])
for route in result["alternatives"].values():
    for segment in route["segments"]:
        heights=[]
        for lon,lat in segment["coordinates"]:
            row,col,inside=grid.to_fractional(lon,lat)
            r,c=round(row),round(col)
            if not inside or not grid.valid[r,c]: raise ValueError("Route left authentic numeric support")
            heights.append(float(grid.elevation[r,c]))
        segment["elevationsMeters"]=heights
json.dump(result, sys.stdout, ensure_ascii=True, allow_nan=False)
