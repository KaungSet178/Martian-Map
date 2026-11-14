"""Record SHA256 and PNG validity for real committed Jezero assets; no downloads."""
import hashlib
import json
import math
import subprocess
from pathlib import Path
from PIL import Image
import numpy as np
from rasterio import Affine
from rasterio.features import shapes

BASELINE = "d9fbe2f2bf845ef76e69b61cfa0f874246630ca6"


def main():
    report = {"baseline": BASELINE, "retained": {}, "generated": {}, "tile_envelopes": {}}
    for category, directory in [("Elevation", "terrain-tiles"), ("Slope", "slope-tiles"),
                                ("Thermal", "thermal-tiles"), ("Hillshade", "hillshade-tiles")]:
        paths = sorted(Path(f"public/maps/jezero/{directory}").rglob("*.png"))
        if not paths:
            raise ValueError(f"Missing {category} assets")
        envelopes = {}
        highest_zoom = max(int(path.parts[-3]) for path in paths)
        features = []
        for path in paths:
            data = path.read_bytes()
            digest = hashlib.sha256(data).hexdigest()
            with Image.open(path) as image:
                image.load()
                if image.size != (256, 256) or image.mode != "RGBA":
                    raise ValueError(f"Bad scientific PNG {path}")
                alpha = np.array(image)[:, :, 3]
            relative = path.as_posix()
            if category != "Hillshade":
                original = subprocess.check_output(["git", "show", f"{BASELINE}:{relative}"])
                if data != original:
                    raise ValueError(f"Existing scientific asset changed: {path}")
                report["retained"][relative] = digest
            else:
                report["generated"][relative] = digest
            z, x, y = int(path.parts[-3]), int(path.parts[-2]), int(path.stem)
            env = envelopes.setdefault(z, [x, y, x, y])
            env[:] = [min(env[0], x), min(env[1], y), max(env[2], x), max(env[3], y)]
            if z == highest_zoom:
                valid = (alpha > 0).astype(np.uint8)
                for geometry, value in shapes(valid, mask=valid.astype(bool), transform=Affine(1, 0, x * 256, 0, 1, y * 256)):
                    if value != 1:
                        continue
                    geometry["coordinates"] = [
                        [[gx / (256 * 2**z) * 360 - 180,
                          math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * gy / (256 * 2**z)))))]
                         for gx, gy in ring] for ring in geometry["coordinates"]]
                    features.append({"type": "Feature", "properties": {"tile": f"{z}/{x}/{y}", "zoom": z}, "geometry": geometry})
        report["tile_envelopes"][category] = envelopes
        footprint = Path(f"team/jezero/terrain/{category.lower()}-display-footprint.geojson")
        footprint.write_text(json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")) + "\n", newline="\n")
        report.setdefault("display_footprints", {})[category] = {"path": footprint.as_posix(), "zoom": highest_zoom,
            "sha256": hashlib.sha256(footprint.read_bytes()).hexdigest(),
            "semantics": "Exact nonzero-alpha cell union at stated output zoom, separate tile polygons; other zooms retain their own PNG alpha"}
    for name in ["source-label.lbl", "source-metadata.xml"]:
        path = Path("team/jezero/terrain") / name
        report.setdefault("source_metadata_sha256", {})[name] = hashlib.sha256(path.read_bytes()).hexdigest()
    Path("team/jezero/terrain/asset_checksums.json").write_text(json.dumps(report, indent=2) + "\n", newline="\n")
    print(f"Validated {len(report['retained'])} unchanged tiles and {len(report['generated'])} hillshade tiles")


if __name__ == "__main__":
    main()
