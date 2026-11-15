"""Independent source-coordinate reproduction and native numerical coverage; no route search."""
from pathlib import Path
import csv
import hashlib
import json
import math

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "docs/evidence/i4d"
RADIUS = 3396190


def verify():
    sites = json.loads((ROOT / "lib/science/sites.json").read_text(encoding="utf-8"))
    table = EVIDENCE / "sample_tube_locations.csv"
    source_rows = {r["Sample Designation"]: r for r in csv.DictReader(table.read_text().splitlines())}
    assert len(source_rows) == 10
    grid_path = ROOT / "data/routing/jezero/jezero_routing_grid.json"
    grid = json.loads(grid_path.read_text())
    meta = grid["metadata"]
    assert meta["gridSpacingMeters"] == 25 and meta["marsRadiusMeters"] == RADIUS
    http_path = EVIDENCE / "browser/http-site-policy.json"
    http_results = {r["site_id"]: r for r in json.loads(http_path.read_text())} if http_path.exists() else {}
    rows = []
    for site in sites:
        coords = site["coordinates"]
        coverage = traversable = cell = displacement = None
        if site["id"].startswith("jezero-depot-rover-"):
            original = source_rows[site["source"]["feature_id"]]
            assert coords == {"latitude": float(original["Rover Latitude"]), "longitude_east": float(original["Rover Longitude"])}
            assert site["original_precision"] == {"latitude": original["Rover Latitude"], "longitude_east": original["Rover Longitude"]}
            assert site["source"]["sha256"] == hashlib.sha256(table.read_bytes()).hexdigest()
        if coords and site["region"] == "jezero" and site["coordinate_frame"]["latitude_type"] == "planetocentric":
            bounds = meta["bounds"]
            col = math.floor(math.radians(coords["longitude_east"] - bounds["west"]) * RADIUS / 25)
            row = math.floor(math.radians(bounds["north"] - coords["latitude"]) * RADIUS / 25)
            cell = [col, row]
            inside = 0 <= col < meta["width"] and 0 <= row < meta["height"]
            idx = row * meta["width"] + col
            coverage = inside and grid["elevations"][idx] != meta["nodataValue"] and grid.get("validMask", [1] * meta["totalCells"])[idx] == 1
            traversable = bool(coverage and grid["slopes"][idx] <= 25)
            lon = bounds["west"] + math.degrees((col + .5) * 25 / RADIUS)
            lat = bounds["north"] - math.degrees((row + .5) * 25 / RADIUS)
            a = math.sin(math.radians(lat - coords["latitude"]) / 2) ** 2 + math.cos(math.radians(lat)) * math.cos(math.radians(coords["latitude"])) * math.sin(math.radians(lon - coords["longitude_east"]) / 2) ** 2
            displacement = 2 * RADIUS * math.atan2(math.sqrt(a), math.sqrt(1-a))
            assert site["grid_coverage"] == coverage
            assert site["cell_traversability"] == traversable
        assert site["registration_verified"] is False
        assert site["positional_uncertainty_m"] is None
        rows.append({"site_id":site["id"], "region":site["region"], "objective_associations":site["objective_ids"], "scientific_evidence":site["evidence"], "source":site["source"], "published_coordinates":coords, "coordinate_frame":site["coordinate_frame"], "original_precision":site["original_precision"], "source_coordinate_verified":site["source_coordinate_verified"], "source_processing_verified":site["source_processing_verified"], "registration_verified":False, "registration_uncertainty_m":None, "dem_coverage":coverage, "cell":cell, "cell_traversability_under_25_degree_restriction":traversable, "cell_center_displacement_m_not_engine_snap":displacement, "routing_eligible":False, "attempted_route_result":"Server policy rejection tested independently for this site; no site route claimed.", "requested_snapped_displacement_m":None, "numerical_path_metrics":None, "safety_limitations":site["limitations"], "test_evidence":["tests/i4d-sites.test.tsx", "tests/browser/i4d-sites.spec.ts"], "decision":"Integrated as source-qualified context; " + ("geometric-only stop supported" if site["region"] == "oxia" else "automatic terrain waypoint unavailable")})
    for row in rows:
        row["production_http_rejection"] = http_results.get(row["site_id"])
    result = {"method":"Independent Python source-table reproduction and direct native 25 m grid intersection; no search-engine imports. Cell-center displacement is not route snapping.", "grid_sha256":hashlib.sha256(grid_path.read_bytes()).hexdigest(), "records":rows}
    (EVIDENCE / "site-routing-acceptance.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(f"Verified {len(sites)} source-qualified records; ten PDS rover tube-drop coordinates reproduced; all site terrain eligibility remains unavailable.")


if __name__ == "__main__":
    verify()
