"""Rebuild Gale G1 display assets from NASA products; no Earth geodesy.

Python 3 + numpy + Pillow. Run from repository root:
  python team/gale/prepare_g1.py
Downloads/large originals stay in ignored output/gale-research/. All requests
have timeouts; original orbital image is read only in bounded HTTP ranges.
"""
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from io import BytesIO
from pathlib import Path
import csv
import json
import math
import urllib.request
import xml.etree.ElementTree as ET

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / "output/gale-research"
ASSETS = ROOT / "public/maps/gale"
SOURCES = ROOT / "team/gale/sources"
PDS = "https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/"
WMTS = "https://trek.nasa.gov/tiles/Mars/EQ/Gale_CTX_BlockAdj_dd/1.0.0/"
NS = {"c": "http://pds.nasa.gov/pds4/cart/v1", "p": "http://pds.nasa.gov/pds4/pds/v1"}
RADIUS = 3396190.0


def download(name, url):
    path = CACHE / name
    if not path.exists():
        data = urllib.request.urlopen(url, timeout=40).read()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    return path


def json_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    encoded = json.dumps(data, separators=(",", ":")) if path.suffix == ".geojson" else json.dumps(data, indent=2)
    path.write_text(encoded + "\n", encoding="utf-8")


def source_tile(level, row, col):
    path = download(f"wmts/{level}/{row}/{col}.png", f"{WMTS}default/default028mm/{level}/{row}/{col}.png")
    with Image.open(path) as im:
        im.load()
        assert im.size == (256, 256)
        return np.asarray(im.convert("RGBA"))


def mosaic(level, extent):
    west, south, east, north = extent
    size = 256 * 2 ** (level + 1)
    x0, x1 = math.floor((west + 180) / 360 * size / 256), math.floor((east + 180) / 360 * size / 256)
    y0, y1 = math.floor((90 - north) / 360 * size / 256), math.floor((90 - south) / 360 * size / 256)
    jobs = [(r, c) for r in range(y0, y1 + 1) for c in range(x0, x1 + 1)]
    with ThreadPoolExecutor(max_workers=6) as pool:
        arrays = list(pool.map(lambda rc: source_tile(level, *rc), jobs))
    image = np.zeros(((y1-y0+1)*256, (x1-x0+1)*256, 4), dtype=np.uint8)
    for (r, c), a in zip(jobs, arrays):
        image[(r-y0)*256:(r-y0+1)*256, (c-x0)*256:(c-x0+1)*256] = a
    return image, x0*256, y0*256, size


def sample(image, lon, lat, x0, y0, size):
    # WMTS matrix is angular, not Earth meters. Pixel centers, nearest neighbor.
    x = np.floor((lon + 180) / 360 * size).astype(int) - x0
    y = np.floor((90 - lat) / 360 * size).astype(int) - y0
    return image[np.clip(y, 0, image.shape[0]-1), np.clip(x, 0, image.shape[1]-1)]


def registration_check(extent):
    """Compare two latitude hypotheses against a separately labeled PDS image.

    96 actual source rows (~2.6 MB total), not the 1.5 GB full raster. This is
    a coarse image-registration diagnostic, not survey control or safety review.
    """
    rows = np.linspace(1200, 56000, 96).astype(int)
    cols = np.linspace(800, 26000, 128).astype(int)

    def row_data(row):
        path = CACHE / f"registration/row-{row}.bin"
        if not path.exists():
            start = 53920 + int(row)*26960
            request = urllib.request.Request(PDS + "data_maps/msl_orbital_map.img", headers={"Range": f"bytes={start}-{start+26959}"})
            with urllib.request.urlopen(request, timeout=30) as response:
                if response.status != 206:
                    raise ValueError("Server did not honor bounded range request")
                data = response.read(26961)
                assert len(data) == 26960
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        return np.frombuffer(path.read_bytes(), dtype=np.uint8)[cols]

    with ThreadPoolExecutor(max_workers=8) as pool:
        reference = np.stack(list(pool.map(row_data, rows)))
    lon = np.broadcast_to(np.degrees((8141038 + (cols + .5)*.25)/RADIUS), reference.shape)
    lat = np.broadcast_to(np.degrees((-271514 - (rows[:, None] + .5)*.25)/RADIUS), reference.shape)
    planetographic = np.degrees(np.arctan((3396190/3376200)**2 * np.tan(np.radians(lat))))
    west, south, east, north = extent
    src, x0, y0, size = mosaic(12, [west, float(planetographic.min())-.002, east, north])
    scores = {}
    for name, latitude in [("planetocentric", lat), ("planetographic", planetographic)]:
        sampled = sample(src, lon, latitude, x0, y0, size)
        mask = (reference > 0) & (sampled[:, :, 3] > 0)
        scores[name] = float(np.corrcoef(reference[mask], sampled[:, :, 0][mask])[0, 1])
    assert scores["planetocentric"] > .45, scores
    assert scores["planetocentric"] > scores["planetographic"] + .2, scores
    return {"method": "Pearson DN correlation at 96 x 128 independently georeferenced PDS image samples; no image warping or fitted shifts", "correlations": scores, "range_bytes_downloaded": 96*26960, "conclusion": "Trek angular raster matches planetocentric latitude, despite ambiguous EPSG::104905 identifier. No ellipsoid latitude conversion applied.", "limitation": "Coarse independent registration diagnostic; not a quantified horizontal accuracy or survey certification."}


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    SOURCES.mkdir(parents=True, exist_ok=True)
    inputs = {
        "capabilities.xml": WMTS + "WMTSCapabilities.xml",
        "places.csv": PDS + "data_localizations/localized_interp.csv",
        "places-label.xml": PDS + "data_localizations/localized_interp.csv.xml",
        "map-label.xml": PDS + "data_maps/msl_orbital_map.xml",
        "traverse.json": "https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json",
        "waypoints.json": "https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json",
    }
    for name, url in inputs.items():
        download(name, url)
    label = ET.parse(CACHE / "map-label.xml")
    assert label.find(".//p:version_id", NS).text == "42.0", "Source changed: repeat and document scientific review before rebuilding"
    assert ET.parse(CACHE / "places-label.xml").find(".//p:version_id", NS).text == "42.0"
    def field(name):
        return float(label.find(f".//c:{name}", NS).text)
    extent = [field("west_bounding_coordinate"), field("south_bounding_coordinate"), field("east_bounding_coordinate"), field("north_bounding_coordinate")]
    # AOI is the exact published localization basemap rectangle, not a selected square.
    assert field("a_axis_radius")*1000 == RADIUS
    registration = registration_check(extent)
    print("Registration:", registration, flush=True)
    with (CACHE / "places.csv").open(newline="") as f:
        all_rows = list(csv.DictReader(f))
    rover = [r for r in all_rows if r["frame"] == "ROVER" and int(r["sol"]) >= 0]
    points = [[float(r["longitude"]), float(r["planetocentric_latitude"])] for r in rover]
    assert all(0 <= p[0] < 360 and -90 <= p[1] <= 90 for p in points)
    # The PDS CSV records repeated poses at drive locations, not drive paths.
    # Use NASA's actual line geometry, retaining every segment and source vertex.
    original = json.loads((CACHE / "traverse.json").read_text())
    groups = []
    for f in original["features"]:
        g = f["geometry"]
        lines = g["coordinates"] if g["type"] == "MultiLineString" else [g["coordinates"]]
        assert g["type"] in ["LineString", "MultiLineString"]
        groups.extend([[p[:2] for p in line] for line in lines])
    # Independent convention check: NASA endpoints vs explicit PDS centric columns.
    endpoints = np.array([line[-1] for line in groups])
    pds_unique = np.unique(np.array(points), axis=0)
    nearest = np.min(np.max(np.abs(endpoints[:, None, :] - pds_unique[None, :, :]), axis=2), axis=1)
    matched = int(np.count_nonzero(nearest < .00001))
    assert matched > 500, matched
    waypoints = json.loads((CACHE / "waypoints.json").read_text())
    sol_range = [min(f["properties"]["sol"] for f in waypoints["features"]), max(f["properties"]["sol"] for f in waypoints["features"])]
    feature = {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {"name": "Recorded Curiosity traverse", "source": inputs["traverse.json"], "evidence": "Observed", "snapshot_date": "2026-11-13", "coordinate_convention": "Mars planetocentric latitude, east-positive longitude; display-only GeoJSON, not terrestrial WGS84", "limitations": "NASA mission-map geometry. Original segments and 2D vertices retained; vertical coordinates and Earth-based Length properties omitted. Not an astronaut route or evidence of safe terrain."}, "geometry": {"type": "MultiLineString", "coordinates": groups}}]}
    json_write(ASSETS / "curiosity-traverse.geojson", feature)
    west, south, east, north = extent
    tile_count, opaque, byte_count, missing = 0, 0, 0, 0
    for z in range(5, 14):
        n = 2**z
        def tx(lon): return (lon+180)/360*n
        def ty(lat): return (1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*n
        # Full tile envelopes ensure no missing tile requests within the supported view.
        xa, xb, ya, yb = math.floor(tx(west)), math.floor(tx(east)), math.floor(ty(north)), math.floor(ty(south))
        # Sample only the AOI. Pixels outside it are masked below; fetching full
        # low-zoom tile envelopes would request regions without source coverage.
        src, x0, y0, size = mosaic(z-1, extent)
        for x in range(xa, xb+1):
            for y in range(ya, yb+1):
                lon = (x + (np.arange(256)+.5)/256)/n*360-180
                lat = np.degrees(np.arctan(np.sinh(math.pi*(1-2*(y+(np.arange(256)+.5)/256)/n))))
                lon, lat = np.meshgrid(lon, lat)
                rgba = sample(src, lon, lat, x0, y0, size).copy()
                valid = (lon >= west) & (lon <= east) & (lat >= south) & (lat <= north)
                missing += int(np.count_nonzero(valid & (rgba[:, :, 3] == 0)))
                rgba[~valid] = 0
                opaque += int(np.count_nonzero(rgba[:, :, 3]))
                out = ASSETS / f"ctx-tiles/{z}/{x}/{y}.png"
                out.parent.mkdir(parents=True, exist_ok=True)
                Image.fromarray(rgba).save(out, optimize=True)
                tile_count += 1
                byte_count += out.stat().st_size
        print(f"zoom {z}: cumulative {tile_count} tiles", flush=True)
    # Keep small original labels, not raw images, CSVs, caches or source tiles.
    for name in ["capabilities.xml", "places-label.xml", "map-label.xml"]:
        (SOURCES / name).write_bytes((CACHE/name).read_bytes())
    report = {"dataset_version": "gale-g1-v1", "inputs": {name: {"url": url, "sha256": sha256((CACHE/name).read_bytes()).hexdigest()} for name, url in inputs.items()}, "aoi": {"basis": "Exact PDS msl_orbital_map v42.0 published bounds; display extent, not terrain eligibility", "bounds_wsen": extent}, "registration": registration, "traverse": {"pds_csv_rows": len(all_rows), "pds_rover_rows": len(rover), "nasa_features": len(original['features']), "source_lines": len(groups), "vertices": sum(map(len,groups)), "companion_waypoint_sol_range": sol_range, "pds_matched_endpoints_within_1e_5_degree": matched, "no_synthetic_connections": True, "extent_note": "Latest NASA geometry can extend beyond the older PDS map footprint; shared camera limits clip it. Display footprint is not claimed as full latest traverse coverage."}, "tiles": {"count": tile_count, "bytes": byte_count, "zoom_range": [5,13], "source_matrix": "level z-1, 2^(L+1) columns x 2^L rows, 256px, origin -180/90", "resampling": "nearest neighbor, pixel centers, no radiometric changes; outside exact AOI transparent", "opaque_pixel_count": opaque, "max_zoom_mars_equatorial_sample_spacing_m": 2*math.pi*RADIUS/(256*2**13)}, "not_validated": ["target point coordinates", "hazards", "terrain quality masks", "EVA routing", "suit resources", "radiation", "mission feasibility"]}
    assert missing == 0, f"Source coverage has {missing} missing display samples inside AOI"
    report["tiles"]["missing_samples_inside_aoi"] = missing
    report["output_sha256"] = {str(p.relative_to(ASSETS)).replace("\\", "/"): sha256(p.read_bytes()).hexdigest() for p in sorted(ASSETS.rglob("*")) if p.is_file()}
    json_write(SOURCES / "g1-audit.json", report)


if __name__ == "__main__":
    main()
