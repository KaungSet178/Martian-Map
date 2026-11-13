"""Reproduce the independent native-coordinate PDS image diagnostic.

Run prepare_g3_geology.py first. Then run this script from the repository root.
Use --download only if the pinned ~28 MB bounded source range is not cached.
This produces an audit figure, never a new geometry or application basemap.
"""
import argparse
from hashlib import sha256
import json
from pathlib import Path
import sys
import urllib.request

sys.dont_write_bytecode = True
import prepare_g3_geology as geology
import numpy as np
from PIL import Image, ImageDraw
import pyogrio
import shapely


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--download", action="store_true")
    args = parser.parse_args()
    root = geology.ROOT
    register = json.loads((root / "team/gale/G3_GEOLOGY_EVIDENCE_REGISTER.json").read_text())
    audit = register["independent_reference"]
    cache = root / "output/g3-geology/raw/pds-reference-range.bin"
    if not cache.exists():
        if not args.download:
            raise SystemExit("Missing audit cache. Use --download to retrieve the bounded source range.")
        label = urllib.request.urlopen(audit["url"].replace(".img", ".xml"), timeout=40).read()
        assert sha256(label).hexdigest() == audit["label_sha256"], "PDS label changed: stop for review"
        start, end = audit["range"]
        request = urllib.request.Request(audit["url"], headers={"Range": f"bytes={start}-{end}"})
        with urllib.request.urlopen(request, timeout=60) as response:
            assert response.status == 206, "Server did not honor bounded range"
            data = response.read(end-start+2)
        assert len(data) == audit["bytes"] and sha256(data).hexdigest() == audit["sha256"]
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_bytes(data)
    data = cache.read_bytes()
    assert sha256(data).hexdigest() == audit["sha256"]
    window = audit["pixel_window"]
    pixels = np.frombuffer(data, dtype=np.uint8).reshape(window["r1"]-window["r0"], 26960)
    image = Image.fromarray(pixels[:, window["c0"]:window["c1"]]).convert("RGB")
    frame = Image.new("RGB", (image.width, image.height+48), "#111D30")
    frame.paste(image, (0, 0))
    draw = ImageDraw.Draw(frame)
    _, _, wkb, attrs = pyogrio.raw.read(geology.CACHE/"Geomap.gdb", layer="map_unit_polygons_v2")
    colors = {"F1":"#B99472", "F2":"#C9B77C", "F3":"#8CA89C", "mF1R":"#A6AC89", "MSg":"#B18E91", "R":"#9A91AC", "S":"#CDC6A0"}
    def positions(points):
        return [((x-8141038)/.25-window["c0"], (-271514-y)/.25-window["r0"]) for x, y, *_ in points]
    for geometry, code in zip(shapely.from_wkb(wkb), attrs[0]):
        for polygon in geometry.geoms:
            draw.line(positions(polygon.exterior.coords), fill=colors[code], width=2)
            for ring in polygon.interiors:
                draw.line(positions(ring.coords), fill=colors[code], width=2)
            point = polygon.representative_point()
            draw.text(positions([(point.x, point.y)])[0], str(code), fill=colors[code], stroke_width=1, stroke_fill="#111111")
    draw.text((12, image.height+6), "PDS HiRISE reference: NASA/JPL-Caltech/University of Arizona. Mapping: Joel Davis (2025), CC BY 4.0.", fill="white")
    draw.text((12, image.height+25), "Marswalk diagnostic: native-coordinate outlines and source Unit codes. No fitted shift; not a new map or survey certification.", fill="white")
    output = root/"team/gale/screenshots/g3-1/arc-pass-registration.png"
    output.parent.mkdir(parents=True, exist_ok=True)
    frame.save(output)
    print(str(output), sha256(output.read_bytes()).hexdigest())


if __name__ == "__main__":
    main()
