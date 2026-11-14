"""Tests for Gale THEMIS daytime infrared thermal layer integration.

Audits source metadata, tile format, report metrics, and lack of invented data.
"""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class GaleThermalTests(unittest.TestCase):
    def test_thermal_report_integrity(self):
        report_path = ROOT / "team/gale/thermal_report.json"
        self.assertTrue(report_path.exists(), "thermal_report.json must exist")
        with open(report_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        self.assertEqual(data["source_product"], "THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018")
        self.assertEqual(data["native_resolution_m"], 100)
        self.assertEqual(data["output_tiles_written"], 5)
        self.assertEqual(data["source_tiles_missing"], 0)
        self.assertEqual(data["zoom_range"], [5, 9])
        self.assertIn("NASA/JPL/ASU", data["credit"])

    def test_thermal_tiles_on_disk(self):
        tile_root = ROOT / "public/maps/gale/thermal-tiles"
        expected_tiles = [
            (5, 28, 16),
            (6, 56, 32),
            (7, 112, 65),
            (8, 225, 131),
            (9, 451, 262),
        ]
        for z, x, y in expected_tiles:
            tile_path = tile_root / str(z) / str(x) / f"{y}.png"
            self.assertTrue(tile_path.exists(), f"Tile {z}/{x}/{y}.png must exist on disk")
            # Verify PNG header
            with open(tile_path, "rb") as f:
                header = f.read(8)
                self.assertEqual(header, b"\x89PNG\r\n\x1a\n", "Must be a valid PNG")

if __name__ == "__main__":
    unittest.main()
