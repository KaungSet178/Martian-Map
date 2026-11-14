"""Independent analytic checks for the G5 source-specific display pipeline."""
import importlib.util
from io import BytesIO
import json
import math
from pathlib import Path
import sys
import unittest

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts/gale-basemap"))
SPEC = importlib.util.spec_from_file_location("color_tiles", ROOT / "scripts/gale-basemap/color_tiles.py")
tiles = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(tiles)


class ColorTileTests(unittest.TestCase):
    def test_xyz_inverse_edges_and_centers(self):
        lon, lat = tiles.tile_edges(1, 1, 1)
        self.assertEqual(lon[0], 0)
        self.assertEqual(lon[-1], 180)
        self.assertEqual(lat[0], 0)
        self.assertAlmostEqual(lat[-1], -85.0511287798066)
        # Project an independently chosen destination pixel center forward.
        z, x, y, i, j = 15, 28889, 16810, 17, 51
        size = 256*2**z
        longitude = (x*256+i+.5)/size*360-180
        latitude = math.degrees(math.atan(math.sinh(math.pi*(1-2*(y*256+j+.5)/size))))
        self.assertAlmostEqual((longitude+180)/360*size, x*256+i+.5)
        self.assertAlmostEqual((1-math.asinh(math.tan(math.radians(latitude)))/math.pi)/2*size, y*256+j+.5)
        lc, bc = tiles.tile_centers(z, x, y)
        self.assertAlmostEqual(lc[i], longitude)
        self.assertAlmostEqual(bc[j], latitude)

    def test_source_affine_from_independent_projected_edge(self):
        transform = [.25, 0, 8140000, 0, -.25, -270000]
        lon, lat = tiles.tile_edges(13, 7222, 4203)
        cols, rows = tiles.source_edges(transform, 13, 7222, 4203)
        np.testing.assert_allclose(8140000 + .25*cols, 3396190*np.radians(lon))
        np.testing.assert_allclose(-270000 - .25*rows, 3396190*np.radians(lat))
        with self.assertRaises(ValueError):
            tiles.source_edges([1, 1, 0, 0, -1, 0], 13, 7222, 4203)

    def test_area_average_uses_all_support_and_keeps_rgb_order(self):
        rgb = np.array([[[0, 20, 100], [100, 40, 200]], [[200, 60, 100], [100, 80, 0]]], dtype=np.uint8)
        result = tiles.resample(rgb, np.full((2, 2), 255, dtype=np.uint8), [0, 2], [0, 2])
        np.testing.assert_array_equal(result, [[[100, 50, 100, 255]]])

    def test_fractional_support_and_no_extrapolation(self):
        w = tiles.weights(np.array([-.5, .5, 1.5, 2.5]), 2).toarray()
        np.testing.assert_array_equal(w, [[.5, 0], [.5, .5], [0, .5]])
        with self.assertRaises(ValueError):
            tiles.weights([1, 0], 2)

    def test_mask_is_not_black_and_nodata_never_bleeds(self):
        rgb = np.array([[[0, 0, 0], [255, 50, 80]]], dtype=np.uint8)
        result = tiles.resample(rgb, np.array([[255, 0]], dtype=np.uint8), [0, 2], [0, 1])
        np.testing.assert_array_equal(result, [[[0, 0, 0, 128]]])
        result = tiles.resample(rgb, np.zeros((1, 2), dtype=np.uint8), [0, 2], [0, 1])
        np.testing.assert_array_equal(result, [[[0, 0, 0, 0]]])

    def test_webp_reproducibility_and_lossless_color_alpha(self):
        image = np.random.default_rng(123).integers(0, 256, (16, 16, 4), dtype=np.uint8)
        image[..., 3] = 255
        image[0, 0] = 0
        data = tiles.encode_tile(image)
        self.assertEqual(data, tiles.encode_tile(image))
        np.testing.assert_array_equal(np.array(Image.open(BytesIO(data)).convert("RGBA")), image)

    def test_delivered_coverage_receipts_and_unchanged_scope(self):
        from hashlib import sha256
        manifest = json.loads((tiles.DEST / "manifest.json").read_text())
        snapshot = json.loads(tiles.SNAPSHOT.read_text())
        self.assertEqual(manifest["bounds_wsen"], snapshot["bounds_wsen"])
        self.assertEqual(manifest["source_affine"], snapshot["sources"]["color"]["transform"])
        self.assertEqual(manifest["registration"], "Georeferenced but alignment unverified")
        expected = {f"{z}/{x}/{y}.webp" for z in range(5, 16) for x, y in tiles.tiles_for_bounds(z, manifest["bounds_wsen"])}
        self.assertEqual(set(manifest["tile_sha256"]), expected)
        self.assertEqual(manifest["tile_count"], len(expected))
        self.assertLess(manifest["tile_bytes"], 24*1024**2)
        total = 0
        for relative, digest in manifest["tile_sha256"].items():
            data = (tiles.DEST / relative).read_bytes()
            self.assertEqual(sha256(data).hexdigest(), digest)
            total += len(data)
            z, x, name = relative.split("/")
            lon, lat = tiles.tile_edges(int(z), int(x), int(name[:-5]))
            image = np.array(Image.open(BytesIO(data)).convert("RGBA"))
            self.assertEqual(image.shape, (256, 256, 4))
            west, south, east, north = manifest["bounds_wsen"]
            lc, bc = tiles.tile_centers(int(z), int(x), int(name[:-5]))
            inside = ((bc >= south) & (bc <= north))[:, None] & ((lc >= west) & (lc <= east))[None, :]
            self.assertTrue((image[~inside, 3] == 0).all())
            self.assertTrue((image[inside, 3] == 255).all())
        self.assertEqual(total, manifest["tile_bytes"])

    def test_registration_diagnostics_do_not_invent_controls_or_accuracy(self):
        sys.path.insert(0, str(ROOT / "scripts/gale-basemap"))
        import registration
        a = np.arange(100).reshape(10, 10)
        mask = np.ones_like(a, dtype=bool)
        self.assertAlmostEqual(registration.correlation(a, a*3+9, mask), 1)
        self.assertIsNone(registration.correlation(a, np.zeros_like(a), mask))
        report = json.loads((ROOT / "team/gale/sources/g5-phase2/registration.json").read_text())
        self.assertEqual(report["independent_control_points"], [])
        self.assertIsNone(report["positional_residual_rmse_m"])
        self.assertIsNone(report["positional_uncertainty_m"])
        self.assertFalse(report["correction_applied"])
        self.assertEqual(sum(p["split"] == "held_out" for p in report["ctx_color_windows"]), 2)


if __name__ == "__main__":
    unittest.main()
