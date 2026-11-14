"""
Dedicated Python verification test suite for Gale Crater Environmental Ground Truth pipeline.
Verifies REMS hourly processing, RAD RDR parsing, and EnvironmentalDataset contract generation.
"""

import json
import os
import unittest

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
DATA_DIR = os.path.join(BASE_DIR, "data", "environment", "gale")


class TestGaleEnvironmentalPipeline(unittest.TestCase):
    def test_rems_hourly_file_integrity(self):
        hourly_path = os.path.join(DATA_DIR, "rems_sol_00100_hourly.json")
        self.assertTrue(os.path.exists(hourly_path), f"File missing: {hourly_path}")

        with open(hourly_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        meta = data["metadata"]
        self.assertEqual(meta["regionId"], "gale")
        self.assertEqual(meta["sol"], 100)
        self.assertEqual(meta["start_sclk"], 406323911)
        self.assertEqual(meta["product_id"], "RME_406323911RMD01000000000_______P9")

        summary = data["sol_summary"]
        # Ambient temperature min must be at dawn (~ -66.8°C), max in early afternoon (~ -0.5°C)
        self.assertLess(summary["air_temperature_c"]["min"], -60.0)
        self.assertGreater(summary["air_temperature_c"]["max"], -15.0)

        # Ground temperature warms above freezing at solar noon (> 0°C)
        self.assertGreater(summary["ground_temperature_c"]["max"], 0.0)

        # Atmospheric pressure diurnal tide between 7.7 and 8.7 hPa
        self.assertGreater(summary["pressure_hpa"]["min"], 7.6)
        self.assertLess(summary["pressure_hpa"]["max"], 8.8)
        self.assertGreater(summary["pressure_hpa"]["diurnal_amplitude_hpa"], 0.8)

        # Solar UV peak at noon
        self.assertGreater(summary["uv_abc_w_m2"]["peak"], 10.0)

        # Wind speed sparse: exactly 36 valid samples
        self.assertEqual(summary["wind_speed_m_s"]["valid_samples"], 36)

        # Hourly bins: exactly 24
        hours = data["hourly_observations"]
        self.assertEqual(len(hours), 24)
        for h_rec in hours:
            self.assertIn("hour", h_rec)
            self.assertIn("ltst_label", h_rec)

    def test_rad_rdr_file_integrity(self):
        rad_path = os.path.join(DATA_DIR, "rad_sol_00100.json")
        self.assertTrue(os.path.exists(rad_path), f"File missing: {rad_path}")

        with open(rad_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        meta = data["metadata"]
        self.assertEqual(meta["regionId"], "gale")
        self.assertEqual(meta["sol"], 100)
        self.assertEqual(meta["dataset_id"], "MSL-M-RAD-3-RDR-V1.0")
        self.assertEqual(meta["product_id"], "RAD_RDR_2012_321_08_21_0100_V00")
        self.assertEqual(meta["total_observations"], 43)

        stats_b = data["statistics"]["detector_b_silicon"]
        stats_e = data["statistics"]["detector_e_plastic"]

        # Detector B mean ~ 9.04 uGy/hr (216.98 uGy/day)
        self.assertAlmostEqual(stats_b["mean_microgray_per_hour"], 9.0409, places=2)
        self.assertAlmostEqual(stats_b["mean_microgray_per_day"], 216.98, places=1)

        # Detector E mean ~ 8.77 uGy/hr (210.53 uGy/day)
        self.assertAlmostEqual(stats_e["mean_microgray_per_hour"], 8.7722, places=2)
        self.assertAlmostEqual(stats_e["mean_microgray_per_day"], 210.53, places=1)

        # Exactly 43 observation records
        obs = data["observations"]
        self.assertEqual(len(obs), 43)
        for o in obs:
            self.assertEqual(o["qc_status"], "00000000")
            self.assertGreater(o["dose_rate_b_microgray_per_hour"], 0.0)
            self.assertGreater(o["dose_rate_e_microgray_per_hour"], 0.0)

    def test_contract_dataset_conformance(self):
        dataset_path = os.path.join(DATA_DIR, "environmental_dataset.json")
        self.assertTrue(os.path.exists(dataset_path), f"File missing: {dataset_path}")

        with open(dataset_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.assertEqual(data["regionId"], "gale")
        self.assertEqual(data["mission"], "MSL Curiosity")
        self.assertEqual(data["sourceVerified"], "VERIFIED")
        self.assertEqual(data["processingVerified"], "VERIFIED")

        obs = data["observations"]
        self.assertGreater(len(obs), 100)

        for m in obs:
            self.assertEqual(m["regionId"], "gale")
            self.assertIn(m["instrument"], ["REMS", "RAD"])
            self.assertIn("variableId", m)
            self.assertIn("physicalQuantity", m)
            self.assertIn("unit", m)
            self.assertIn("sourceUrl", m)
            self.assertIn("qualityStatus", m)

    def test_provenance_manifest_hashes(self):
        import hashlib
        manifest_path = os.path.join(DATA_DIR, "provenance_manifest.json")
        self.assertTrue(os.path.exists(manifest_path), f"File missing: {manifest_path}")

        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        self.assertEqual(manifest["regionId"], "gale")
        for key, pinfo in manifest["processed_application_products"].items():
            full_p = os.path.join(BASE_DIR, pinfo["path"])
            self.assertTrue(os.path.exists(full_p), f"Target missing: {full_p}")
            h = hashlib.sha256()
            with open(full_p, "rb") as pf:
                while chunk := pf.read(65536):
                    h.update(chunk)
            self.assertEqual(h.hexdigest(), pinfo["sha256"], f"Hash mismatch for {key}")


if __name__ == "__main__":
    unittest.main()
