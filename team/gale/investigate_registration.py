"""Offline registration diagnostics; never changes application data or geometry.

Run from any directory: python team/gale/investigate_registration.py [--download]
Missing pinned inputs require --download. All fetches are size/hash checked;
the orthophoto is accessed through one bounded band, never the full raster.
Results go to ignored output/registration-investigation/measurements.json.
"""
import argparse
import csv
from hashlib import sha256
import json
import math
from pathlib import Path
import platform
import xml.etree.ElementTree as ET

import numpy as np
from PIL import Image
import pyproj
import rasterio
import requests

ROOT = Path(__file__).resolve().parents[2]
SOURCES = ROOT / "team/gale/sources/registration"
OUTPUT = ROOT / "output/registration-investigation"
RADIUS = 3396190.
NS = {"c": "http://pds.nasa.gov/pds4/cart/v1",
      "w": "http://www.opengis.net/wmts/1.0",
      "o": "http://www.opengis.net/ows/1.1"}


def eqc_forward(longitude, latitude):
    """Metres on the declared spherical equirectangular grid, lat_ts=lon_0=0."""
    return RADIUS*np.radians(longitude), RADIUS*np.radians(latitude)


def pixel_edges(east, north, left, top, step):
    """Continuous pixel-edge coordinates (PDS CSV convention), not center indices."""
    if step <= 0:
        raise ValueError("Positive projected metre spacing required")
    return (east-left)/step, (top-north)/step


def area_mean(values, factor):
    """Complete native-pixel area means. Never sparse point samples."""
    h, w = values.shape
    if factor < 1 or h % factor or w % factor:
        raise ValueError("Complete blocks required")
    return values.reshape(h//factor, factor, w//factor, factor).mean(axis=(1, 3))


def correlation(a, b, mask=None):
    """NCC diagnostic only; refuse invalid/constant data instead of inventing a score."""
    a, b = np.asarray(a, dtype=float), np.asarray(b, dtype=float)
    if a.shape != b.shape or a.size < 3 or not (np.isfinite(a).all() and np.isfinite(b).all()):
        raise ValueError("Matching finite samples required")
    if mask is not None:
        a, b = a[mask], b[mask]
        if a.size < 3:
            raise ValueError("Insufficient supported samples")
    a, b = a-a.mean(), b-b.mean()
    scale = np.linalg.norm(a)*np.linalg.norm(b)
    if scale == 0:
        raise ValueError("No image contrast")
    return float(np.sum(a*b)/scale)


def checked_input(record, download):
    path = ROOT/record["path"]
    if not path.exists():
        if not download:
            raise SystemExit(f"Missing {path}; --download permits pinned input retrieval")
        headers = {"Accept-Encoding": "identity"}
        if "range" in record:
            start, end = record["range"]
            headers["Range"] = f"bytes={start}-{end}"
        with requests.get(record["url"], headers=headers, timeout=60, stream=True) as response:
            if "range" in record:
                if response.status_code != 206 or response.headers.get("Content-Range") != f"bytes {start}-{end}/1545401120":
                    raise ValueError("Incorrect Content-Range; refusing full/wrong raster")
            else:
                response.raise_for_status()
            data = response.raw.read(record["bytes"]+1)
        if len(data) != record["bytes"] or sha256(data).hexdigest() != record["sha256"]:
            raise ValueError("Source changed: scientific review required")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    data = path.read_bytes()
    if len(data) != record["bytes"] or sha256(data).hexdigest() != record["sha256"]:
        raise ValueError(f"Pinned input changed: {path}")
    return data


class CtxSampler:
    """Original WMTS angular pixels, independently sampled; no warping or shift."""
    def __init__(self, records, download):
        self.records, self.download, self.tiles = records, download, {}

    def tile(self, level, row, col):
        path = f"output/gale-research/wmts/{level}/{row}/{col}.png"
        if path not in self.tiles:
            checked_input({"path":path, **self.records[path]}, self.download)
            with Image.open(ROOT/path) as image:
                self.tiles[path] = np.asarray(image.convert("RGBA"))
        return self.tiles[path]

    def sample(self, east, north):
        longitude, latitude = np.degrees(east/RADIUS), np.degrees(north/RADIUS)
        col = np.floor((longitude+180)/360*2**13*256).astype(int)
        row = np.floor((90-latitude)/360*2**13*256).astype(int)
        result = np.zeros((len(row), len(col)), dtype=float)
        for ty in np.unique(row//256):
            for tx in np.unique(col//256):
                ys, xs = np.where(row//256 == ty)[0], np.where(col//256 == tx)[0]
                tile = self.tile(12, int(ty), int(tx))
                pixels = tile[np.ix_(row[ys] % 256, col[xs] % 256)]
                if not (pixels[..., 3] == 255).all():
                    raise ValueError("Comparison has incomplete source coverage")
                result[np.ix_(ys, xs)] = pixels[..., 0]
        return result


def inspect_labels_and_checkpoints(csv_bytes):
    map_label = ET.parse(ROOT/"team/gale/sources/map-label.xml")
    dem_label = ET.parse(ROOT/"team/gale/sources/g3-2/pds-dem.xml")
    origins = []
    for label in [map_label, dem_label]:
        def field(key):
            return float(label.findtext(f".//c:{key}", namespaces=NS))
        assert field("a_axis_radius") == field("b_axis_radius") == field("c_axis_radius") == 3396.19
        assert field("standard_parallel_1") == field("longitude_of_central_meridian") == 0
        assert label.findtext(".//c:latitude_type", namespaces=NS) == "Planetocentric"
        assert label.findtext(".//c:longitude_direction", namespaces=NS) == "Positive East"
        origins.append([field("upperleft_corner_x"), field("upperleft_corner_y"), field("pixel_resolution_x")])
    with rasterio.open(ROOT/"team/gale/sources/g3-2/pds-dem-headers.bin") as ds:
        transform = list(ds.transform)[:6]
        independent = pyproj.CRS.from_wkt(ds.crs.to_wkt())
        converter = pyproj.Transformer.from_crs(independent.geodetic_crs, independent, always_xy=True)
    with rasterio.open(SOURCES/"pds-map-headers.bin") as ds:
        map_transform = list(ds.transform)[:6]
    assert np.allclose(map_transform, [.25, 0, origins[0][0], 0, -.25, origins[0][1]], rtol=0, atol=1e-9)
    assert np.allclose(transform, [1, 0, origins[1][0], 0, -1, origins[1][1]], rtol=0, atol=1e-9)
    rows = [r for r in csv.DictReader(csv_bytes.decode().splitlines()) if r["frame"] == "ROVER" and int(r["sol"]) >= 0]
    residuals, independent_errors = [], []
    for r in rows:
        east, north, longitude, latitude = [float(r[k]) for k in ["easting", "northing", "longitude", "planetocentric_latitude"]]
        x, y = eqc_forward(longitude, latitude)
        px, py = converter.transform(longitude, latitude)
        independent_errors.append([px-x, py-y])
        differences = [east-x, north-y]
        for prefix, (left, top, step) in zip(["map", "dem"], origins):
            col, row = pixel_edges(east, north, left, top, step)
            differences.extend([float(r[f"{prefix}_pixel_sample"])-col, float(r[f"{prefix}_pixel_line"])-row])
        residuals.append(differences)
    samples = list(csv.DictReader((SOURCES/"mission-checkpoints.csv").read_text().splitlines()))
    assert all(row in rows for row in samples), "Checkpoint extraction must preserve original source records"
    landing = samples[0]
    east_delta = RADIUS*math.radians(float(landing["longitude"])-137.4417)*math.cos(math.radians(-4.5895))
    north_delta = RADIUS*math.radians(float(landing["planetocentric_latitude"])+4.5895)
    latitude = float(samples[4]["planetocentric_latitude"])
    wrong_lat = math.degrees(math.atan((3396190/3376200)**2*math.tan(math.radians(latitude))))
    return {"map_origin_step":origins[0], "dem_origin_step":origins[1], "gdal_dem_transform":transform, "gdal_map_transform":map_transform,
            "mission_rows":len(rows), "residual_order":["east_m", "north_m", "map_sample_px", "map_line_px", "dem_sample_px", "dem_line_px"],
            "max_abs_residual":np.abs(residuals).max(axis=0).tolist(), "p95_abs_residual":np.percentile(np.abs(residuals),95,axis=0).tolist(),
            "proj_vs_spherical_formula_max_abs_m":np.abs(independent_errors).max(axis=0).tolist(),
            "representative_mission_checkpoints":[{k:r[k] for k in ["sol","site","drive","pose","northing","easting","planetocentric_latitude","planetodetic_latitude","longitude","map_pixel_sample","map_pixel_line","dem_pixel_sample","dem_pixel_line"]} for r in samples],
            "published_landing_comparison":{"reference":"https://ntrs.nasa.gov/citations/20130011617", "published_lat_lon":[-4.5895,137.4417], "east_north_difference_m":[east_delta,north_delta], "local_separation_m":math.hypot(east_delta,north_delta), "limitation":"Rounded independent publication, same mission context; not independent surveyed truth or a fine CTX tie point."},
            "incorrect_oblate_latitude_conversion_north_error_m":RADIUS*math.radians(wrong_lat-latitude),
            "half_native_pixel_m":{"map":.125, "dem":.5},
            "interpretation":"Coordinate/pixel consistency to rounding precision, not ground positional accuracy. No new geological target or image control coordinates."}


def inspect_tile_pipeline(sampler):
    root = ET.parse(ROOT/"team/gale/sources/capabilities.xml")
    matrices = {int(m.findtext("o:Identifier", namespaces=NS)):m for m in root.findall(".//w:TileMatrix", NS)}
    compared = mismatches = tile_count = 0
    for path in sorted((ROOT/"public/maps/gale/ctx-tiles").rglob("*.png")):
        z, x, y = map(int, path.relative_to(ROOT/"public/maps/gale/ctx-tiles").with_suffix("").parts)
        with Image.open(path) as image:
            output = np.asarray(image.convert("RGBA"))
        matrix = matrices[z-1]
        assert matrix.findtext("w:TopLeftCorner", namespaces=NS) == "-180.0 90.0"
        width = int(float(matrix.findtext("w:MatrixWidth", namespaces=NS)))*256
        height = int(float(matrix.findtext("w:MatrixHeight", namespaces=NS)))*256
        lon = (x+(np.arange(256)+.5)/256)/2**z*360-180
        lat = np.degrees(np.arctan(np.sinh(np.pi*(1-2*(y+(np.arange(256)+.5)/256)/2**z))))
        col = np.floor((lon+180)/360*width).astype(int)
        row = np.floor((90-lat)/180*height).astype(int)
        for ty in np.unique(row//256):
            for tx in np.unique(col//256):
                ys, xs = np.where(row//256 == ty)[0], np.where(col//256 == tx)[0]
                actual = output[np.ix_(ys, xs)]
                valid = actual[..., 3] > 0
                if not valid.any():
                    continue
                original = sampler.tile(z-1, int(ty), int(tx))[np.ix_(row[ys] % 256, col[xs] % 256)]
                compared += int(valid.sum())
                mismatches += int(np.any(actual != original, axis=2)[valid].sum())
        tile_count += 1
    return {"xyz_tiles":tile_count, "compared_opaque_pixels":compared, "mismatching_rgba_pixels":mismatches,
            "method":"WMTS XML dimensions/top-left versus XYZ inverse angular Mercator pixel centers. Independent of prepare_g1.py; no production sampler imported.",
            "interpretation":"Checks software fidelity to published tile grid, not native source georeferencing or surface accuracy."}


def inspect_area_comparison(band_bytes, record, sampler):
    raw = np.frombuffer(band_bytes, dtype=np.uint8).reshape(record["height"], record["width"])
    crop = raw[:, 6400:10400]
    reference = area_mean(crop, 40)
    # PDS declares unsigned DN but no special zero constant. Do not silently
    # call dark photograph pixels terrain nodata. Check both conventions.
    conservative_mask = crop.reshape(26,40,100,40).all(axis=(1,3))
    east = 8141038+(6400+(np.arange(100)+.5)*40)*.25
    north = -271514-(record["row"]+(np.arange(26)+.5)*40)*.25
    windows = [(0,100),(0,33),(33,66),(66,100),(0,66)]
    candidates = [[] for _ in windows]
    for dy in range(-300, 301, 10):
        for dx in range(-300, 301, 10):
            candidate = sampler.sample(east+dx, north+dy)
            for scores, (start,end) in zip(candidates, windows):
                scores.append((correlation(reference[:,start:end],candidate[:,start:end],conservative_mask[:,start:end]),dx,dy))
    original = sampler.sample(east, north)
    results = [{"columns":[start,end], "zero_shift_ncc":correlation(reference[:,start:end],original[:,start:end],conservative_mask[:,start:end]),
                "unapplied_best_ncc_east_north_projected_m":max(scores)} for (start,end),scores in zip(windows,candidates)]
    _, train_dx, train_dy = max(candidates[-1])
    holdout = correlation(reference[:,66:],sampler.sample(east+train_dx,north+train_dy)[:,66:],conservative_mask[:,66:])
    gradients = lambda a: np.hypot(*np.gradient(a))
    nulls = []
    for dx,dy in [(0,1000),(0,-1000),(1000,0),(-1000,0)]:
        unrelated = sampler.sample(east+dx,north+dy)
        nulls.append({"ctx_offset_east_north_projected_m":[dx,dy], "ncc":correlation(reference,unrelated,conservative_mask),
                      "heldout_ncc":correlation(reference[:,66:],unrelated[:,66:],conservative_mask[:,66:])})
    return {"native_window":{"row":record["row"],"height":1040,"column":6400,"width":4000},
            "reference":"PDS orthophoto area mean, 40x40 native pixels", "analysis_grid_projected_m":10,
            "zero_dn_sensitivity":{"native_zero_pixels":int((crop == 0).sum()),"conservative_supported_cells":int(conservative_mask.sum()),"total_cells":2600,
                "policy":"No zero-DN special value is declared in PDS4 label. Conservatively exclude every block containing zero for searches; record unmasked NCC for sensitivity, not a new DEM validity mask.","all_cells_zero_shift_ncc":correlation(reference,original)},
            "shape":[26,100], "search":{"east_north_radius_projected_m":300,"step_m":10,"hypotheses":3721},
            "results":results, "training_columns":[0,66], "holdout_columns":[66,100], "holdout_ncc_at_training_winner":holdout,
            "zero_shift_gradient_magnitude_ncc":correlation(gradients(reference),gradients(original)), "unrelated_window_checks":nulls,
            "interpretation":"All offsets are diagnostic sampling hypotheses only. No geometry or app asset is shifted. Limited strip geometry, correlated pixels, photometry, differing products and selection of maxima prevent survey interpretation."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true")
    args = parser.parse_args()
    inputs = json.loads((SOURCES/"inputs.json").read_text())
    for name, record in inputs["source_metadata"].items():
        data = (SOURCES/name).read_bytes()
        assert len(data) == record["bytes"] and sha256(data).hexdigest() == record["sha256"]
    for name, expected in inputs["declared_label_hashes"].items():
        assert sha256((ROOT/name).read_bytes()).hexdigest() == expected, "Scientific label changed"
    csv_bytes = checked_input(inputs["source_receipts"]["pds_csv"], args.download)
    band = checked_input(inputs["source_receipts"]["pds_band"], args.download)
    sampler = CtxSampler(inputs["ctx_inputs"], args.download)
    esri = pyproj.CRS.from_authority("ESRI", "104905")
    try:
        pyproj.CRS.from_authority("EPSG", "104905")
        epsg_available = True
    except pyproj.exceptions.CRSError:
        epsg_available = False
    namespace_check = {"wmts_identifier":"urn:ogc:def:crs:EPSG::104905",
                       "trek_catalog_identifier":json.loads((SOURCES/"trek-config.json").read_text())["mars"]["projections"]["equirectangular"],
                       "installed_esri_104905_name":esri.name,"installed_esri_axes_m":[esri.ellipsoid.semi_major_metre,esri.ellipsoid.semi_minor_metre],
                       "installed_epsg_104905_available":epsg_available,
                       "decision":"Do not substitute authorities or infer an oblate latitude transform from this ambiguous service identifier."}
    report = {"baseline_commit":inputs["baseline_commit"], "scientific_geometry_changed":False,
              "operational_sampling_enabled":False, "route_safety_enabled":False,
              "coordinates":inspect_labels_and_checkpoints(csv_bytes), "ctx_pipeline":inspect_tile_pipeline(sampler),
              "area_comparison":inspect_area_comparison(band, inputs["source_receipts"]["pds_band"], sampler),
              "coordinate_namespace_check":namespace_check,
              "software":{"python":platform.python_version(),"numpy":np.__version__,"rasterio":rasterio.__version__,
                          "gdal":rasterio.__gdal_version__,"pyproj":pyproj.__version__,"proj":pyproj.proj_version_str},
              "conclusion":"No evidence-supported coordinate correction. Declared PDS CRS and published tile processing are internally consistent; exact CTX native control provenance and local image tie remain unverified. Correlation maxima are not control points."}
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT/"measurements.json").write_bytes((json.dumps(report,indent=2)+"\n").encode())
    print(json.dumps({"pipeline":report["ctx_pipeline"],"area_comparison":report["area_comparison"],"conclusion":report["conclusion"]},indent=2))


if __name__ == "__main__":
    main()
