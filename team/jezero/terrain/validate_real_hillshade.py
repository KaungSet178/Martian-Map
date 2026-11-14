"""Validate genuine Jezero outputs separately from synthetic algorithm tests."""
import io
import json
from pathlib import Path
import numpy as np
from PIL import Image
from build_hillshade import open_numeric_source, tile_rgba, sha256

root = Path("team/jezero/terrain")
report = json.loads((root / "hillshade_report.json").read_text())
data, transform, nodata, _ = open_numeric_source(root / "source/jezero-dtm.tif")
assert sha256(root / "source/jezero-dtm.tif") == report["source_sha256"]
checks = []
for z, x, y in [(13, 5856, 3668), (13, 5857, 3668), (14, 11704, 7336)]:
    tile = Path(f"public/maps/jezero/hillshade-tiles/{z}/{x}/{y}.png")
    actual = np.array(Image.open(tile))
    expected = tile_rgba(data, nodata, transform, z, x, y)
    np.testing.assert_array_equal(actual, expected)
    # Re-encode for a byte-level deterministic check, not just equal RGB arrays.
    encoded = io.BytesIO()
    Image.fromarray(expected).save(encoded, format="PNG", compress_level=9)
    assert encoded.getvalue() == tile.read_bytes()
    assert np.all(actual[:, :, 0] == actual[:, :, 1])
    assert np.all(actual[:, :, 1] == actual[:, :, 2])
    checks.append({"tile": f"{z}/{x}/{y}", "deterministic_bytes": True,
                   "valid_pixels": int(np.count_nonzero(actual[:, :, 3]))})
# A combined tile evaluates the same geographic pixels on both sides of a real
# production boundary. This catches local tile-edge gradient/reset artifacts.
whole = tile_rgba(data, nodata, transform, 12, 2928, 1834, size=512)
left = np.array(Image.open("public/maps/jezero/hillshade-tiles/13/5856/3668.png"))
right = np.array(Image.open("public/maps/jezero/hillshade-tiles/13/5857/3668.png"))
np.testing.assert_array_equal(whole[:256, :256], left)
np.testing.assert_array_equal(whole[:256, 256:], right)
result = {"source_sha256_verified": True, "actual_jezero_tiles": checks,
          "combined_grid_cross_tile_bytes_equal": True,
          "registration": "UNVERIFIED; numeric grid and source affine checks are not independent absolute control"}
(root / "real_validation.json").write_text(json.dumps(result, indent=2) + "\n", newline="\n")
print(json.dumps(result, indent=2))
