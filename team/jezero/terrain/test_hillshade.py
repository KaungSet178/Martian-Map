"""Synthetic algorithm checks are engineering evidence, not Jezero validation."""
import unittest
import numpy as np
from rasterio import Affine
from build_hillshade import bilinear, illumination, tile_rgba, tile_ranges, RADIUS, RAD


class HillshadeTests(unittest.TestCase):
    def test_flat(self):
        self.assertAlmostEqual(float(illumination(0, 0)), np.sqrt(.5))

    def test_light_direction(self):
        # NW facing terrain rises southeast: positive east, negative north.
        self.assertGreater(float(illumination(.5, -.5)), float(illumination(-.5, .5)))
        self.assertAlmostEqual(float(illumination(1, 0, 90, 45)), 0, places=14)
        self.assertAlmostEqual(float(illumination(-1, 0, 90, 45)), 1, places=14)
        self.assertAlmostEqual(float(illumination(0, -1, 0, 45)), 1, places=14)

    def test_bilinear_center_and_nodata(self):
        data = np.arange(25, dtype=float).reshape(5, 5)
        self.assertEqual(float(bilinear(data, np.array(1.5), np.array(1.5), -9999)), 9)
        data[2, 2] = -9999
        self.assertTrue(np.isnan(bilinear(data, np.array(1.5), np.array(1.5), -9999)))
        self.assertTrue(np.isnan(bilinear(data, np.array(-1.), np.array(1.), -9999)))

    def test_global_grid_seams_and_determinism(self):
        # A synthetic equatorial DEM covering two adjacent output tiles.
        z, x, y, size = 14, 8192, 8192, 16
        spacing = 2 * np.pi * RADIUS / (size * 2**z)
        transform = Affine(spacing, 0, -4 * spacing, 0, -spacing, 4 * spacing)
        yy, xx = np.mgrid[:32, :48]
        data = xx * .3 + yy * .7
        left = tile_rgba(data, -9999, transform, z, x, y, size)
        right = tile_rgba(data, -9999, transform, z, x + 1, y, size)
        # Same global coordinates under a wider output tile must be byte identical.
        whole = tile_rgba(data, -9999, transform, z - 1, x // 2, y // 2, size * 2)
        np.testing.assert_array_equal(left, whole[:size, :size])
        np.testing.assert_array_equal(right, whole[:size, size:])
        np.testing.assert_array_equal(left, tile_rgba(data, -9999, transform, z, x, y, size))
        self.assertTrue(np.all(left[:, :, 0] == left[:, :, 1]))
        self.assertTrue(np.all(left[:, :, 3] == 255))
        expected = int(np.floor(float(illumination(.3 / spacing, -.7 / spacing)) * 255 + .5))
        self.assertTrue(np.all(left[:, :, 0] == expected))

    def test_transparent_gap(self):
        data = np.full((32, 32), -9999.)
        step = 2 * np.pi * RADIUS / (16 * 2**14)
        rgba = tile_rgba(data, -9999, Affine(step, 0, -4 * step, 0, -step, 4 * step),
                         14, 8192, 8192, 16)
        self.assertFalse(rgba.any())

    def test_missing_gradient_support_is_not_flattened(self):
        data = np.zeros((32, 32))
        step = 2 * np.pi * RADIUS / (16 * 2**14)
        transform = Affine(step, 0, -4 * step, 0, -step, 4 * step)
        before = tile_rgba(data, -9999, transform, 14, 8192, 8192, 16)
        data[4, 5] = -9999
        after = tile_rgba(data, -9999, transform, 14, 8192, 8192, 16)
        self.assertEqual(before[0, 0, 3], 255)
        self.assertEqual(after[0, 0, 3], 0)
        self.assertEqual(after[-1, -1, 3], 255)

    def test_extent_tile_index(self):
        bounds = [77.222933, 18.306799, 77.583964, 18.669315]
        xmin, xmax, top, bottom = tile_ranges(bounds, 14)
        self.assertLess(xmin, xmax)
        self.assertLess(top, bottom)
        self.assertEqual(xmin, int((bounds[0] + 180) / 360 * 2**14))
        self.assertAlmostEqual(RADIUS * RAD, 59274.69752330622, places=6)


if __name__ == "__main__":
    unittest.main()
