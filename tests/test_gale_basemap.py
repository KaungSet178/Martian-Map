"""Scientific and network-boundary checks for the standalone G5 preparation."""
import importlib.util
import json
import math
from pathlib import Path
import struct
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import numpy as np
import pyproj
import rasterio
from rasterio.transform import Affine

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("g5audit", ROOT / "scripts/gale-basemap/audit.py")
audit = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(audit)


class BasemapAuditTests(unittest.TestCase):
    def test_source_specific_crs_and_independent_pixel_center_inverse(self):
        crs = pyproj.CRS.from_proj4("+proj=eqc +lat_ts=0 +lat_0=0 +lon_0=0 +R=3396190 +units=m")
        self.assertLess(audit.check_crs(crs.to_wkt())["max_analytical_proj_residual_m"], 1e-7)
        for left, top in [(8126248, -241164), (8140000, -270000)]:
            transform = Affine(.25, 0, left, 0, -.25, top)
            x, y = transform @ (123.5, 456.5)
            lon, lat = math.degrees(x/audit.RADIUS), math.degrees(y/audit.RADIUS)
            px, py = ~transform @ (audit.RADIUS*math.radians(lon), audit.RADIUS*math.radians(lat))
            self.assertAlmostEqual(px, 123.5, places=7)
            self.assertAlmostEqual(py, 456.5, places=7)
            window = audit.fractional_window(list(transform)[:6], [lon, lat, lon, lat])
            np.testing.assert_allclose(window, [123.5, 456.5, 123.5, 456.5], atol=1e-7)

    def test_rejects_earth_oblate_and_unreviewed_projection_parameters(self):
        for proj in ["+proj=eqc +datum=WGS84", "+proj=eqc +a=3396190 +b=3376200",
                     "+proj=eqc +R=3396190 +lon_0=137", "+proj=eqc +R=3396190 +lat_ts=5"]:
            with self.assertRaises(ValueError):
                audit.check_crs(pyproj.CRS.from_proj4(proj).to_wkt())

    def test_native_mask_fractional_overlap_holes_and_outside_footprint(self):
        mask = np.ones((2, 3), dtype=bool)
        mask[0, 1] = False  # Validity is supplied by mask, not image brightness.
        self.assertEqual(audit.valid_area(mask, 0, 0, [0, 0, 3, 2]), 5)
        self.assertEqual(audit.valid_area(mask, 0, 0, [.5, .5, 2.5, 1.5]), 1.5)
        self.assertEqual(audit.valid_area(mask, 0, 0, [9, 9, 10, 10]), 0)

    def test_range_guard_rejects_full_download_changed_object_and_bad_ranges(self):
        good = {"Content-Range": "bytes 10-19/100", "ETag": '"version"'}
        self.assertEqual(audit.validate_response(SimpleNamespace(status_code=206, headers=good), 10, 10, 100, '"version"'), 100)
        for status, headers in [(200, good), (206, {}), (206, {**good, "Content-Range": "bytes 11-20/100"}),
                                (206, {**good, "Content-Range": "bytes 10-19/101"}),
                                (206, {**good, "ETag": '"changed"'}), (206, {**good, "Content-Encoding": "gzip"})]:
            with self.assertRaises(ValueError):
                audit.validate_response(SimpleNamespace(status_code=status, headers=headers), 10, 10, 100, '"version"')

    def test_budget_rejects_large_reads_before_network(self):
        budget = audit.Budget(100)
        budget.charge(99)
        with self.assertRaises(ValueError):
            budget.charge(2)
        self.assertEqual(budget.used, 99)

    def test_native_subrow_extraction_preserves_dn_nodata_and_affine(self):
        class Source:
            def read_many(self, ranges):
                self.ranges = ranges
                return {103: bytes([0, 12, 99]), 113: bytes([5, 6, 7])}
        source = Source()
        tiff = SimpleNamespace(ifds=[{259: [1], 258: [8], 277: [1], 278: [1],
                                      279: [10, 10], 273: [100, 110]}])
        metadata = {"width": 10, "height": 2, "nodata": 0,
                    "transform": [.25, 0, 8140000, 0, -.25, -270000],
                    "crs_wkt": pyproj.CRS.from_proj4("+proj=eqc +R=3396190").to_wkt()}
        with tempfile.TemporaryDirectory(dir=ROOT / "output") as directory:
            with patch.object(audit, "OUT", Path(directory)):
                result = audit.extract_gray_window(source, tiff, metadata, [3, 0, 3, 2])
                with rasterio.open(ROOT / result["output"]) as ds:
                    np.testing.assert_array_equal(ds.read(1), [[0, 12, 99], [5, 6, 7]])
                    np.testing.assert_array_equal(ds.dataset_mask(), [[0, 255, 255], [255, 255, 255]])
                    self.assertEqual(ds.transform.c, 8140000.75)
                    self.assertEqual(ds.transform.f, -270000)
                self.assertEqual(result["source_bytes"], 6)
                self.assertEqual(result["valid_native_pixels"], 5)
        self.assertEqual(source.ranges, [(103, 3), (113, 3)])
        tiff.ifds[0][259] = [8]
        with self.assertRaises(ValueError):
            audit.extract_gray_window(source, tiff, metadata, [3, 0, 3, 2])

    def test_tiff_parser_handles_actual_inline_classic_and_big_endian_bigtiff(self):
        class Source:
            def __init__(self, data):
                self.data = data.ljust(16384, b"\0")
            def read(self, start, length):
                return self.data[start:start+length]
        classic = b"II" + struct.pack("<HI", 42, 8) + struct.pack("<H", 1)
        classic += struct.pack("<HHII", 256, 4, 1, 123) + struct.pack("<I", 0)
        big = b"MM" + struct.pack(">HHHQ", 43, 8, 0, 16) + struct.pack(">Q", 1)
        big += struct.pack(">HHQ", 256, 4, 1) + struct.pack(">I", 456) + b"\0"*4 + struct.pack(">Q", 0)
        self.assertEqual(audit.Tiff(Source(classic)).ifds[0][256], [123])
        self.assertEqual(audit.Tiff(Source(big)).ifds[0][256], [456])

    def test_preserved_ctx_alpha_is_measured_without_modification(self):
        config = json.loads((ROOT / "team/gale/sources/g5/audit.json").read_text())
        result = audit.ctx_coverage(config["bounds_wsen"])
        self.assertEqual(result["tile_sha256"], config["ctx"]["tile_sha256"])
        self.assertAlmostEqual(result["valid_percent"], config["ctx"]["valid_percent"], places=10)
        self.assertGreater(result["valid_percent"], 99)
        self.assertLessEqual(result["valid_percent"], 100.0000001)

    def test_coverage_snapshot_keeps_unmeasured_and_registration_explicit(self):
        report = json.loads((ROOT / "team/gale/sources/g5/audit.json").read_text())
        self.assertIsNone(report["sources"]["grayscale"]["coverage"]["valid_percent"])
        color = report["sources"]["color"]["coverage"]
        self.assertAlmostEqual(color["valid_percent"] + color["fallback_percent"], 100)
        self.assertIn("unverified", color["registration_status"])
        self.assertEqual(report["application_tiles_generated"], 0)
        self.assertLessEqual(report["raster_bytes_read_or_replayed"], report["raster_byte_budget"])


if __name__ == "__main__":
    unittest.main()
