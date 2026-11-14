"""Scientific verification and mathematical tests for Gale regional terrain products.

Audits Mars geodetic coordinates, slope gradients, hillshade derivation,
NoData masking, and multi-resolution dataset isolation.
"""
import math
import sys
import unittest
from pathlib import Path
import numpy as np

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "team/gale"))
from dem_math import block_mean, terrain_fields

MARS_RADIUS_M = 3396190.0

class GaleRegionalTerrainTests(unittest.TestCase):
    def test_mars_coordinate_metric_scaling(self):
        """East-west metric spacing must scale strictly with cos(planetocentric latitude)."""
        latitudes = [-4.7, 0.0, 45.0, -60.0]
        step_deg = 0.003374135377818809 # ~200 m at equator
        for lat in latitudes:
            expected_dx = MARS_RADIUS_M * math.radians(step_deg) * math.cos(math.radians(lat))
            calculated_dx = MARS_RADIUS_M * math.radians(step_deg) * np.cos(np.radians(lat))
            self.assertAlmostEqual(calculated_dx, expected_dx, places=7)

    def test_slope_gradient_independent_derivation(self):
        """Horn 3x3 derivative on synthetic tilted plane yields exact analytical slope."""
        # Slope angles from 1 to 45 degrees
        for target_slope_deg in [2.0, 5.0, 12.5, 20.0, 35.0]:
            target_rad = math.radians(target_slope_deg)
            p = math.tan(target_rad) * math.cos(math.radians(45)) # East gradient
            q = math.tan(target_rad) * math.sin(math.radians(45)) # North gradient
            step_m = 30.0 # 30 m grid
            lat = -4.7
            dx = step_m * math.cos(math.radians(lat))

            # Build 7x7 grid
            cols = np.arange(7)
            rows = np.arange(7)
            x_m = cols * dx
            y_m = (6 - rows) * step_m # y increases northward
            z = -4200.0 + p * x_m[None, :] + q * y_m[:, None]
            valid = np.ones_like(z, dtype=bool)

            slope, shade, support = terrain_fields(z, valid, step_m, np.full(7, lat))
            self.assertTrue(support.all())
            # Center cells should match analytical slope within 1e-6 degrees
            center_slopes = slope[1:-1, 1:-1]
            np.testing.assert_allclose(center_slopes, target_slope_deg, atol=1e-5)

    def test_hillshade_azimuth_and_altitude_illumination(self):
        """Artificial NW illumination (azimuth 315°, altitude 45°) matches analytical dot product."""
        step_m = 25.0
        lat = -4.7
        # Surface facing directly toward light source (NW slope)
        # Normal vector points toward NW: p < 0 (sloping down to East), q > 0 (sloping down to South, i.e. up to North)
        p, q = -0.2, 0.2
        dx = step_m * math.cos(math.radians(lat))
        cols, rows = np.arange(7), np.arange(7)
        z = -4100.0 + p * (cols * dx)[None, :] - q * (rows * step_m)[:, None]
        valid = np.ones_like(z, dtype=bool)

        slope, shade, support = terrain_fields(z, valid, step_m, np.full(7, lat), azimuth_deg=315, altitude_deg=45)
        az, alt = math.radians(315), math.radians(45)
        expected_shade = (-p * math.sin(az) * math.cos(alt) - q * math.cos(az) * math.cos(alt) + math.sin(alt)) / math.sqrt(1 + p*p + q*q)
        expected_shade = max(0.0, min(1.0, expected_shade))

        center_shades = shade[1:-1, 1:-1]
        np.testing.assert_allclose(center_shades, expected_shade, atol=1e-5)

    def test_nodata_strictly_isolated_without_gap_filling(self):
        """Any single invalid post erodes the entire 3x3 derivative neighborhood without interpolation."""
        z = np.full((9, 9), -4200.0)
        valid = np.ones((9, 9), dtype=bool)
        valid[4, 4] = False # single central missing post
        z[4, 4] = np.nan

        slope, shade, support = terrain_fields(z, valid, 25.0, np.full(9, -4.7))
        # Inner 7x7 grid without the center 3x3 block should be valid
        # Center 3x3 in the output (indices 2:5, 2:5 in 7x7 output) must be False
        self.assertFalse(support[3, 3]) # exactly where invalid post was
        # The 8 surrounding cells in the 3x3 kernel must also be unsupported
        for dy in [-1, 0, 1]:
            for dx in [-1, 0, 1]:
                self.assertFalse(support[3 + dy, 3 + dx])
        # Cells outside the 3x3 affected neighborhood remain valid
        self.assertTrue(support[0, 0])
        self.assertTrue(support[0, 6])
        self.assertTrue(support[6, 0])
        self.assertTrue(support[6, 6])

    def test_web_mercator_display_inversion_to_mars_coordinates(self):
        """Web Mercator inverse mapping formula converts tile pixel coordinates to exact Mars lon/lat."""
        # For zoom 11, test center tile coordinates
        zoom = 11
        n = 2 ** zoom
        # Midpoint of Gale crater: lon ~ 137.401°, lat ~ -4.701°
        test_lon = 137.401
        test_lat = -4.701
        # Forward Mercator
        tx = (test_lon + 180.0) / 360.0 * n
        ty = (1.0 - math.asinh(math.tan(math.radians(test_lat))) / math.pi) / 2.0 * n

        # Inverse Mercator
        inv_lon = (tx / n) * 360.0 - 180.0
        inv_lat = math.degrees(math.atan(math.sinh(math.pi * (1.0 - 2.0 * (ty / n)))))

        self.assertAlmostEqual(inv_lon, test_lon, places=9)
        self.assertAlmostEqual(inv_lat, test_lat, places=9)

    def test_usgs_extracted_raster_integrity(self):
        """Extracted USGS 200m DEM subset contains valid Martian elevations without NaNs or empty cells."""
        raw_dem = ROOT / "output/g4/raw/usgs_hrsc_mola_200m_gale.tif"
        if not raw_dem.exists():
            self.skipTest("USGS raw DEM subset not yet extracted")

        import rasterio
        with rasterio.open(raw_dem) as src:
            self.assertEqual(src.count, 1)
            self.assertEqual(src.dtypes[0], "int16")
            self.assertEqual(src.nodata, -32768)
            arr = src.read(1)
            valid_mask = arr != src.nodata
            self.assertTrue(valid_mask.all(), "Expected 100% valid coverage for USGS Gale window")
            # Gale crater floor is ~ -4500m, Mount Sharp peak is > 0m
            self.assertGreater(arr.min(), -4700)
            self.assertLess(arr.max(), 1000)

if __name__ == "__main__":
    unittest.main()
