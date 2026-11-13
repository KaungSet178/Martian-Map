"""Scientific consistency checks, not a ground-control accuracy certificate."""
import csv
from hashlib import sha256
import json
from pathlib import Path
import sys
import unittest

import numpy as np

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/"team/gale"))
from investigate_registration import eqc_forward, pixel_edges, area_mean, correlation


class RegistrationTests(unittest.TestCase):
    def test_published_landing_coordinates_match_mission_projection_to_rounding(self):
        east, north = eqc_forward(137.441632997, -4.589466996)
        self.assertAlmostEqual(float(east), 8146811.223, delta=.0006)
        self.assertAlmostEqual(float(north), -272039.268, delta=.0006)
        unit_east, _ = eqc_forward(1, 0)
        self.assertAlmostEqual(float(unit_east), 59274.69752330622, delta=1e-9)

    def test_original_checkpoint_pixel_fields_agree_with_each_fractional_grid(self):
        rows = csv.DictReader((ROOT/"team/gale/sources/registration/mission-checkpoints.csv").read_text().splitlines())
        for r in rows:
            for prefix, left, top, step in [("map",8141038,-271514,.25), ("dem",8141037.49279,-271513.07519,1)]:
                col, row = pixel_edges(float(r["easting"]), float(r["northing"]),left,top,step)
                self.assertAlmostEqual(col,float(r[f"{prefix}_pixel_sample"]),delta=.0061)
                self.assertAlmostEqual(row,float(r[f"{prefix}_pixel_line"]),delta=.0061)
        with self.assertRaises(ValueError): pixel_edges(0,0,0,0,0)

    def test_complete_area_means_preserve_dc_and_do_not_sparse_sample(self):
        checkerboard = (np.indices((8,8)).sum(axis=0) % 2)*200
        np.testing.assert_array_equal(area_mean(checkerboard,2),np.full((4,4),100.))
        # Sparse even-index samples alias this same image to a constant zero.
        np.testing.assert_array_equal(checkerboard[::2,::2],0)
        with self.assertRaises(ValueError): area_mean(checkerboard,3)

    def test_correlations_require_information_and_support_mask_sensitivity(self):
        a=np.arange(16).reshape(4,4)
        self.assertAlmostEqual(correlation(a,a),1.)
        self.assertAlmostEqual(correlation(a,-a),-1.)
        altered=a.copy();altered[0,0]=1000
        mask=np.ones_like(a,dtype=bool);mask[0,0]=False
        self.assertAlmostEqual(correlation(a,altered,mask),1.)
        for b in [np.ones_like(a),np.full_like(a,np.nan,dtype=float)]:
            with self.assertRaises(ValueError):correlation(a,b)

    def test_investigation_does_not_rewrite_any_existing_scientific_asset(self):
        g1=json.loads((ROOT/"team/gale/sources/g1-audit.json").read_text())
        for path, expected in g1["output_sha256"].items():
            self.assertEqual(sha256((ROOT/"public/maps/gale"/path).read_bytes()).hexdigest(),expected)
        dem=json.loads((ROOT/"team/gale/sources/g3-2/processing-audit.json").read_text())
        for path, record in dem["tiles"].items():
            self.assertEqual(sha256((ROOT/path).read_bytes()).hexdigest(),record["sha256"])
        self.assertEqual(sha256((ROOT/"public/maps/gale/dem/coverage.geojson").read_bytes()).hexdigest(),dem["coverage_sha256"])


if __name__ == "__main__":
    unittest.main()
