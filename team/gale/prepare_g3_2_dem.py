"""Reproduce registered PDS DEM derivatives from a pinned bounded source range.

python team/gale/prepare_g3_2_dem.py [--download]
Only --download fetches missing input (~28 MB), never the full ~386 MB raster.
Original bytes stay in ignored output; app receives small RGBA display tiles.
"""
from pathlib import Path
from hashlib import sha256
import argparse
import json
import math
import sys
import urllib.request
import xml.etree.ElementTree as ET

import numpy as np
from PIL import Image

sys.dont_write_bytecode = True
from dem_math import block_mean, terrain_fields

ROOT = Path(__file__).resolve().parents[2]
SOURCES = ROOT / "team/gale/sources/g3-2"
CACHE = ROOT / "output/g3-2/raw/pds-subset-row-range.bin"
ASSETS = ROOT / "public/maps/gale/dem"
RADIUS = 3396190.0
FACTOR = 25
ELEVATION_BREAKS = [-4200, -4160, -4120, -4080]
ELEVATION_COLORS = ["#425A78", "#587E91", "#87A39D", "#BCB29C", "#C8A97E"]
SLOPE_BREAKS = [5, 10, 15, 20]
SLOPE_COLORS = ["#526B82", "#71989E", "#AAA7BD", "#B49A88", "#C9BDA0"]


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes((json.dumps(data, indent=2) + "\n").encode("utf-8"))


def source_values(download):
    audit = json.loads((SOURCES/"pds-subset.json").read_text())
    label_bytes = (SOURCES/"pds-dem.xml").read_bytes()
    reviewed = json.loads((ROOT/"team/gale/G3_2_DEM_AUDIT.json").read_text(encoding="utf-8"))
    assert sha256(label_bytes).hexdigest() == reviewed["selected"]["label_sha256"]
    assert sha256((SOURCES/"pds-dem-headers.bin").read_bytes()).hexdigest() == reviewed["selected"]["headers_sha256"]
    ns = {"p":"http://pds.nasa.gov/pds4/pds/v1", "c":"http://pds.nasa.gov/pds4/cart/v1"}
    label = ET.fromstring(label_bytes)
    assert label.findtext(".//p:version_id", namespaces=ns) == "42.0"
    assert label.findtext(".//p:data_type", namespaces=ns) == "IEEE754MSBSingle"
    assert label.findtext(".//c:latitude_type", namespaces=ns) == "Planetocentric"
    assert float(label.findtext(".//c:a_axis_radius", namespaces=ns))*1000 == RADIUS
    assert float(label.findtext(".//c:standard_parallel_1", namespaces=ns)) == 0
    assert float(label.findtext(".//c:longitude_of_central_meridian", namespaces=ns)) == 0
    assert label.findtext(".//c:longitude_direction", namespaces=ns) == "Positive East"
    assert label.findtext(".//p:Array_2D_Image/p:offset", namespaces=ns) == "53928"
    assert [int(node.text) for node in label.findall(".//p:Axis_Array/p:elements", ns)] == [14331, 6741]
    if not CACHE.exists():
        if not download:
            raise SystemExit("Missing pinned source cache. Run again with --download.")
        with urllib.request.urlopen(audit["source_url"].replace(".img", ".xml"), timeout=40) as response:
            assert response.read() == label_bytes, "Live label changed: review before proceeding"
        first, last = audit["range"]
        request = urllib.request.Request(audit["source_url"], headers={"Range":f"bytes={first}-{last}"})
        with urllib.request.urlopen(request, timeout=60) as response:
            assert response.status == 206, "Range not honored; refusing full-raster download"
            data = response.read(last-first+2)
        assert len(data) == audit["range_bytes"] and sha256(data).hexdigest() == audit["range_sha256"]
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        CACHE.write_bytes(data)
    data = CACHE.read_bytes()
    assert sha256(data).hexdigest() == audit["range_sha256"]
    window = audit["pixel_window"]
    z = np.frombuffer(data, dtype=">f4").reshape(window["height"], 6741)[:, window["col"]:window["col"]+window["width"]].astype(np.float64)
    valid = np.isfinite(z) & (np.abs(z) < 1e30)
    assert z.shape == (1050, 1050) and valid.all(), "Changed coverage requires renewed audit"
    return z, valid, audit


def rgb(hexes):
    return np.array([[int(color[i:i+2], 16) for i in [1,3,5]] for color in hexes], dtype=np.uint8)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--download", action="store_true")
    args = parser.parse_args()
    z, native_valid, source = source_values(args.download)
    mean, valid = block_mean(z, native_valid, FACTOR)
    left, top = source["transform"][2], source["transform"][5]
    latitudes = np.degrees((top-(np.arange(mean.shape[0])+.5)*FACTOR)/RADIUS)
    slope, hillshade, support = terrain_fields(mean, valid, FACTOR, latitudes)
    elevation = mean[1:-1, 1:-1]
    assert support.all() and slope.shape == (40,40)
    grid_left, grid_top = left+FACTOR, top-FACTOR
    extent = [math.degrees(grid_left/RADIUS), math.degrees((grid_top-1000)/RADIUS),
              math.degrees((grid_left+1000)/RADIUS), math.degrees(grid_top/RADIUS)]
    colors = {"elevation":rgb(ELEVATION_COLORS)[np.digitize(elevation, ELEVATION_BREAKS)],
              "slope":rgb(SLOPE_COLORS)[np.digitize(slope, SLOPE_BREAKS)],
              "hillshade":np.repeat(np.rint(hillshade[...,None]*255).astype(np.uint8), 3, axis=2)}
    hashes = {}
    for zoom in range(5, 15):
        n = 2**zoom
        tx = lambda lon: (lon+180)/360*n
        ty = lambda lat: (1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*n
        for x in range(math.floor(tx(extent[0])), math.floor(tx(extent[2]))+1):
            for y in range(math.floor(ty(extent[3])), math.floor(ty(extent[1]))+1):
                lon = (x+(np.arange(256)+.5)/256)/n*360-180
                lat = np.degrees(np.arctan(np.sinh(math.pi*(1-2*(y+(np.arange(256)+.5)/256)/n))))
                cols = np.floor((RADIUS*np.radians(lon)-grid_left)/FACTOR).astype(int)
                rows = np.floor((grid_top-RADIUS*np.radians(lat))/FACTOR).astype(int)
                inside = (rows[:,None]>=0)&(rows[:,None]<40)&(cols[None,:]>=0)&(cols[None,:]<40)
                rr, cc = np.clip(rows,0,39), np.clip(cols,0,39)
                inside &= support[np.ix_(rr,cc)]
                for kind in colors:
                    rgba = np.zeros((256,256,4), dtype=np.uint8)
                    rgba[:,:,:3] = colors[kind][np.ix_(rr,cc)]
                    rgba[:,:,3] = np.where(inside,255,0)
                    rgba[~inside,:3] = 0
                    path = ASSETS/kind/str(zoom)/str(x)/f"{y}.png"
                    path.parent.mkdir(parents=True, exist_ok=True)
                    Image.fromarray(rgba).save(path, optimize=True)
                    hashes[str(path.relative_to(ROOT)).replace("\\","/")] = {"sha256":sha256(path.read_bytes()).hexdigest(), "bytes":path.stat().st_size}
    # Actual valid support is a complete rectangle for this pinned window only.
    w,s,e,n = extent
    coverage = {"type":"FeatureCollection", "marswalk_reference":{"body":"Mars","latitude_type":"planetocentric","longitude_direction":"east"},
                "features":[{"type":"Feature","properties":{"meaning":"Audited DEM derivative support; outside is unaudited, never safe"},
                "geometry":{"type":"Polygon","coordinates":[[[w,s],[e,s],[e,n],[w,n],[w,s]]]}}]}
    write_json(ASSETS/"coverage.geojson", coverage)
    stats = lambda field: {"min":float(field[support].min()),"max":float(field[support].max()),"percentiles_5_50_95":np.percentile(field[support],[5,50,95]).tolist()}
    report = {"product_id":source["product_id"],"source_range_sha256":source["range_sha256"],
              "native_grid_m":1,"native_valid_pixels":int(native_valid.sum()),"native_total_pixels":int(z.size),
              "analysis_grid_m":25,"gradient_support_m":75,"valid_analysis_cells":int(support.sum()),
              "effective_resolution":"Source-dependent HiRISE/CTX mosaic; no per-pixel resolving-power map. 25 m averaging / 75 m gradient support are processing scales, not a guaranteed ground resolving power.",
              "vertical_reference":"Metres relative to MOLA areoid, positive up; not radius or ellipsoid height. Raw source values retained, no fitted bias correction.",
              "horizontal_reference":"Mars sphere R=3396190 m, planetocentric/east, equirectangular lat_ts=0 lon_0=0. Local east spacing corrected by cos(latitude).",
              "derivation":"Complete 25x25 native-post means; Horn 3x3 gradients; slope=degrees(atan(hypot(dz/dEast,dz/dNorth))); hillshade=clipped dot(unit terrain normal, artificial NW light).",
              "sun":{"azimuth_clockwise_from_north_deg":315,"altitude_deg":45,"cast_shadows":False},
              "nodata_policy":"Nonfinite/special float posts invalid; every block and all 9 gradient neighbors must be valid. Unsupported outer analysis ring omitted; transparent outside actual support. No filling/interpolation across gaps.",
              "extent_wsen":extent,"elevation_m":stats(elevation),"slope_degrees":stats(slope),"hillshade_relative":stats(hillshade),
              "elevation_breaks_m":ELEVATION_BREAKS,"elevation_colors":ELEVATION_COLORS,"slope_breaks_degrees":SLOPE_BREAKS,"slope_colors":SLOPE_COLORS,
              "display":"Angular inverse MapLibre Mercator encoding only; nearest analysis-cell sampling. No Earth distances. Source bounds and alpha preserve coverage; PNGs contain display colors, not numeric DEM values.",
              "tile_zoom_range":[5,14],"tile_count":len(hashes),"tile_bytes":sum(h["bytes"] for h in hashes.values()),"tiles":hashes,
              "coverage_sha256":sha256((ASSETS/"coverage.geojson").read_bytes()).hexdigest()}
    write_json(SOURCES/"processing-audit.json", report)
    np.savez_compressed(ROOT/"output/g3-2/analysis-values.npz", elevation=elevation, slope=slope, hillshade=hillshade, valid=support)
    print(json.dumps({k:report[k] for k in ["extent_wsen","elevation_m","slope_degrees","tile_count","tile_bytes"]}, indent=2))


if __name__ == "__main__":
    main()
