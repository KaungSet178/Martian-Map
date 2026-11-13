"""Synthetic mathematical checks, not measurements or Mars safety validation."""
import sys
import unittest
from pathlib import Path

import numpy as np

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "team/gale"))
from dem_math import block_mean, terrain_fields


class TerrainMathTests(unittest.TestCase):
    def test_flat_areoid_height_has_zero_slope_and_known_illumination(self):
        z = np.full((7, 7), -4200.)
        slope, shade, valid = terrain_fields(z, np.ones_like(z, bool), 25, np.full(7, -4.7))
        self.assertTrue(valid.all())
        np.testing.assert_array_equal(slope, 0)
        np.testing.assert_allclose(shade, np.sin(np.radians(45)))

    def test_metre_plane_gradient_uses_mars_latitude_and_north_sign(self):
        for latitude in [-4.7, 60]:
            x = np.arange(7) * 25 * np.cos(np.radians(latitude))
            north = -np.arange(7) * 25
            p, q = .2, -.3
            z = -4200 + p*x[None, :] + q*north[:, None]
            slope, shade, _ = terrain_fields(z, np.ones_like(z, bool), 25, np.full(7, latitude))
            np.testing.assert_allclose(slope, np.degrees(np.arctan(np.hypot(p, q))), atol=1e-10)
            az, alt = np.radians([315, 45])
            expected = (-p*np.sin(az)*np.cos(alt)-q*np.cos(az)*np.cos(alt)+np.sin(alt))/np.sqrt(1+p*p+q*q)
            np.testing.assert_allclose(shade, expected, atol=1e-10)

    def test_invalid_neighbor_erodes_all_affected_support_and_never_fills(self):
        z = np.zeros((7, 7)); valid = np.ones_like(z, bool)
        valid[3, 3] = False; z[3, 3] = np.nan
        slope, shade, support = terrain_fields(z, valid, 25, np.zeros(7))
        self.assertEqual(int(support.sum()), 16)
        self.assertTrue(np.isnan(slope[1:4, 1:4]).all())
        self.assertTrue(np.isnan(shade[1:4, 1:4]).all())
        self.assertTrue(np.isfinite(slope[support]).all())

    def test_complete_block_means_and_nodata(self):
        z = np.arange(16, dtype=float).reshape(4, 4)
        valid = np.ones_like(z, bool)
        mean, _ = block_mean(z, valid, 2)
        np.testing.assert_allclose(mean, [[2.5, 4.5], [10.5, 12.5]])
        valid[0, 0] = False
        mean, mask = block_mean(z, valid, 2)
        self.assertFalse(mask[0, 0]); self.assertTrue(np.isnan(mean[0, 0]))
        with self.assertRaises(ValueError): block_mean(z, valid, 3)

    def test_steep_surface_facing_away_from_light_is_clipped(self):
        z = np.broadcast_to(np.arange(7)*100., (7, 7)).copy()
        _, shade, _ = terrain_fields(z, np.ones_like(z, bool), 25, np.zeros(7), 90, 10)
        np.testing.assert_array_equal(shade, 0)


if __name__ == "__main__":
    unittest.main()
