"""Independent fractional coverage and original source/asset regression checks."""
import importlib.util
import json
from pathlib import Path
import sys
import unittest
from types import SimpleNamespace

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'team/gale'))
SPEC = importlib.util.spec_from_file_location('g4', ROOT/'team/gale/prepare_g4_terrain.py')
g4 = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(g4)


class IntegrationScienceTests(unittest.TestCase):
    def test_unreviewed_planet_projection_and_affine_are_rejected(self):
        from rasterio.crs import CRS
        from rasterio import Affine
        cases = [
            (CRS.from_epsg(4326), Affine(30, 0, 0, 0, -30, 0)),
            (CRS.from_string('+proj=merc +R=3396190 +units=m'), Affine(30, 0, 0, 0, -30, 0)),
            (CRS.from_string('+proj=eqc +R=3396190 +units=m'), Affine(30, 1, 0, 0, -30, 0)),
        ]
        for crs, transform in cases:
            with self.assertRaises(ValueError):
                g4.source_metadata(SimpleNamespace(crs=crs, transform=transform), projected=True)

    def test_fractional_mask_coverage_does_not_accept_bounding_box_as_validity(self):
        old = g4.GALE_OVERVIEW_BOUNDS
        try:
            g4.GALE_OVERVIEW_BOUNDS = dict(west_east=.5, east_east=1.5, south_latitude=0, north_latitude=1)
            extent = [0, 0, 2, 1]
            self.assertAlmostEqual(g4.coverage_overview(np.array([[True, False]]), extent)['valid_percent'], 50)
            self.assertEqual(g4.coverage_overview(np.array([[True, True]]), extent)['valid_percent'], 100)
            self.assertEqual(g4.coverage_overview(np.array([[False, False]]), extent)['valid_percent'], 0)
        finally:
            g4.GALE_OVERVIEW_BOUNDS = old

    def test_actual_source_and_derived_masks_cover_overview_without_accuracy_claim(self):
        report = json.loads((ROOT/'team/gale/G4_TERRAIN_AUDIT.json').read_text())
        for key in ['regional_hrsc_30m', 'global_usgs_200m']:
            product = report[key]
            self.assertEqual(product['native_valid_coverage']['valid_percent'], 100)
            self.assertEqual(product['derived_valid_coverage']['valid_percent'], 100)
            self.assertEqual(product['source_metadata']['nodata'], -32768)
            self.assertEqual(product['valid_analysis_cells'], product['total_analysis_cells'])
        self.assertEqual(report['regional_hrsc_30m']['source_md5'], '1d714f2142a56e962d50d985b7088b13')
        self.assertFalse(report['coverage_evaluation']['added_gap_filling'])
        self.assertIn('nearest-neighbor', report['coverage_evaluation']['display_resampling'])
        self.assertFalse(report['registration_gate']['operational_routing_allowed'])

    def test_global_subset_uses_original_affine_and_source_dn(self):
        report = json.loads((ROOT/'team/gale/sources/integration/global-source-check.json').read_text())
        self.assertLess(report['unique_range_bytes'], 2*1024**2)
        self.assertEqual(report['source_dtype'], ['int16'])
        self.assertEqual(len(report['samples']), 3)
        self.assertEqual(sum(item['native_values_compared'] for item in report['samples']), 537)
        # Original step is authoritative; width does not imply an exact 360° raster.
        self.assertNotEqual(report['source_affine'][0], 360/106694)
        self.assertEqual(report['corrected_subset_affine'][0], report['source_affine'][0])


if __name__ == '__main__':
    unittest.main()
