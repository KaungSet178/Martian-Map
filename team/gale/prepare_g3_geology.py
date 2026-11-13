"""Rebuild the small, pinned Arc Pass display asset; never infer source geometry.

From repository root: python team/gale/prepare_g3_geology.py
Install requirements-g3.txt in an audit environment. Original archive and metadata
are kept in team/gale/sources/g3, separately from public display GeoJSON.
"""
from collections import Counter
from hashlib import sha256
from pathlib import Path
import json
import math
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[2]
# Optional isolated tool installation used for this audit; no app dependency.
LOCAL_TOOLS = ROOT / "output/g3-geology/python-libs"
if LOCAL_TOOLS.is_dir():
    sys.path.insert(0, str(LOCAL_TOOLS))
import numpy as np
import pyogrio
from pyproj import CRS, Transformer
import shapely

ARCHIVE = ROOT / "team/gale/sources/g3/Geomap.gdb.zip"
EXPECTED = "783f052b5bb5eb7b478e66ce6c972816f8adc0e154be0176bc817b14cd7e8a24"
OUTPUT = ROOT / "public/maps/gale/arc-pass-geology.geojson"
CACHE = ROOT / "output/g3-geology/processed"


def main():
    assert sha256(ARCHIVE.read_bytes()).hexdigest() == EXPECTED, "Archive changed: review first"
    CACHE.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(ARCHIVE) as archive:
        assert archive.testzip() is None
        assert all((CACHE / p.filename).resolve().is_relative_to(CACHE.resolve()) for p in archive.infolist())
        archive.extractall(CACHE)
    gdb = CACHE / "Geomap.gdb"
    meta, fids, geometries, values = pyogrio.raw.read(gdb, layer="map_unit_polygons_v2", return_fids=True)
    shapes = shapely.from_wkb(geometries)
    crs = CRS(meta["crs"])
    assert crs.is_projected and crs.ellipsoid.semi_major_metre == 3396190
    assert crs.ellipsoid.inverse_flattening == 0
    assert crs.coordinate_operation.method_name == "Equidistant Cylindrical (Spherical)"
    # Explicit defaults in source WKT/PROJ: no offset, lon_0=0, lat_ts=0.
    inverse = Transformer.from_crs(crs, crs.geodetic_crs, always_xy=True)
    native_bounds = shapely.total_bounds(shapes).tolist()
    checks = []
    for x, y in [(native_bounds[0], native_bounds[1]), (native_bounds[2], native_bounds[3]),
                 ((native_bounds[0]+native_bounds[2])/2, (native_bounds[1]+native_bounds[3])/2)]:
        lon, lat = inverse.transform(x, y)
        independent = [math.degrees(x/3396190), math.degrees(y/3396190)]
        assert max(abs(lon-independent[0]), abs(lat-independent[1])) < 1e-10
        checks.append({"projected_m": [x, y], "geographic_degrees": [lon, lat], "independent_inverse": independent})
    assert len(shapes) == 53 and np.all(shapely.is_valid(shapes))
    assert not np.any(shapely.is_empty(shapes)) and not np.any(shapely.is_missing(shapes))
    assert len(set(shapely.to_wkb(shapely.normalize(shapes)))) == len(shapes)
    coords = shapely.get_coordinates(shapes, include_z=True)
    assert np.all(coords[:, 2] == 0), "Nonconstant Z requires independent vertical review"
    units = values[list(meta["fields"]).index("Unit")]
    assert Counter(units) == {"F1": 5, "F2": 1, "F3": 16, "MSg": 7, "R": 21, "mF1R": 2, "S": 1}
    features = []
    for fid, unit, shape in zip(fids, units, shapes):
        # No clipping, shifting, simplification, smoothing or topology repair.
        geographic = shapely.transform(shapely.force_2d(shape), inverse.transform, interleaved=False)
        assert geographic.is_valid
        features.append({"type": "Feature", "id": int(fid),
                         "properties": {"Unit": str(unit), "source_objectid": int(fid)},
                         "geometry": shapely.geometry.mapping(geographic)})
    asset = {"type": "FeatureCollection", "marswalk_reference": {
        "body": "Mars", "latitude_type": "planetocentric", "longitude_direction": "east",
        "sphere_radius_m": 3396190, "source_doi": "10.6084/m9.figshare.30401788.v1",
        "notes": "MapLibre display encoding, not Earth GPS; source Z=0 omitted; no target point inference."},
        "features": features}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_bytes((json.dumps(asset, separators=(",", ":")) + "\n").encode("utf-8"))
    union = shapely.union_all(shapes)
    _, _, boundary_wkb, _ = pyogrio.raw.read(gdb, layer="boundary_box")
    boundary = shapely.union_all(shapely.from_wkb(boundary_wkb))
    report = {"input_sha256": EXPECTED, "input_crs_wkt": crs.to_wkt(), "input_layer": "map_unit_polygons_v2",
              "feature_count": len(features), "unit_counts": dict(Counter(units)), "native_bounds_m": native_bounds,
              "coordinate_checks": checks, "invalid": 0, "empty": 0, "normalized_duplicates": 0,
              "overlap_area_m2": float(shapely.area(shapes).sum()-union.area),
              "unmapped_inside_boundary_m2": shapely.difference(boundary, union).area,
              "outside_boundary_m2": shapely.difference(union, boundary).area,
              "processing": "Preserve all XY vertices, rings and attributes Unit/source OBJECTID. Omit constant zero Z. No simplification, repair, clipping or fitted shift.",
              "omitted_layers": [str(name) for name, _ in pyogrio.list_layers(gdb) if name != "map_unit_polygons_v2"],
              "output": str(OUTPUT.relative_to(ROOT)).replace("\\", "/"),
              "output_bytes": OUTPUT.stat().st_size, "output_sha256": sha256(OUTPUT.read_bytes()).hexdigest(),
              "tool_versions": {"pyogrio": pyogrio.__version__, "gdal": list(pyogrio.__gdal_version__), "shapely": shapely.__version__}}
    (ROOT / "team/gale/sources/g3/arc-pass-processing.json").write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8", newline="\n")
    print(json.dumps({k: report[k] for k in ["feature_count", "output_bytes", "output_sha256"]}))


if __name__ == "__main__":
    main()
