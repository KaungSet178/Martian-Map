"""Tests for the Jezero MEDA ingestion pipeline and the committed dataset.

Run with::

    python -B -m unittest discover -s tests/environment/jezero -p "test_*.py" -v
"""

from __future__ import annotations

import importlib.util
import json
import math
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
TEAM = ROOT / "team" / "environment" / "jezero"
DATASET = ROOT / "data" / "environment" / "jezero" / "meda_jezero_sample.json"
CACHE = TEAM / "cache"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


build = load_module("jezero_build_dataset", TEAM / "build_dataset.py")
fetch = load_module("jezero_fetch_meda", TEAM / "fetch_meda.py")


class TimeAndValueParsing(unittest.TestCase):
    def test_bucket_boundaries(self) -> None:
        self.assertEqual(fetch.bucket(0), "sol_0000_0089")
        self.assertEqual(fetch.bucket(89), "sol_0000_0089")
        self.assertEqual(fetch.bucket(90), "sol_0090_0179")
        self.assertEqual(fetch.bucket(179), "sol_0090_0179")
        self.assertEqual(fetch.bucket(180), "sol_0180_0299")
        self.assertEqual(fetch.bucket(299), "sol_0180_0299")
        self.assertEqual(fetch.bucket(300), "sol_0300_0419")
        self.assertEqual(fetch.bucket(359), "sol_0300_0419")

    def test_lmst_requires_the_documented_format(self) -> None:
        self.assertAlmostEqual(build.parse_lmst("00100M04:00:28.047"), 14428.047)
        self.assertAlmostEqual(build.parse_lmst("00100M00:00:00"), 0.0)
        self.assertIsNone(build.parse_lmst(""))
        self.assertIsNone(build.parse_lmst("00100X04:00:28"))
        self.assertIsNone(build.parse_lmst("04:00:28"))

    def test_numeric_rejects_blanks_sentinels_and_non_finite(self) -> None:
        self.assertIsNone(build.numeric(""))
        self.assertIsNone(build.numeric("   "))
        self.assertIsNone(build.numeric("nan"))
        self.assertIsNone(build.numeric("inf"))
        self.assertIsNone(build.numeric("999999999"))
        self.assertEqual(build.numeric("-0.4"), -0.4)
        self.assertEqual(build.numeric(" 12.5 "), 12.5)

    def test_circular_mean_does_not_average_across_north(self) -> None:
        mean = build.circular_mean([350.0, 10.0])
        self.assertTrue(mean < 1.0 or mean > 359.0, mean)
        self.assertAlmostEqual(build.circular_mean([90.0, 90.0]), 90.0)
        self.assertAlmostEqual(build.circular_mean([180.0]), 180.0)

    def test_summary_reports_originals_and_circular_mean(self) -> None:
        summary = build.summarise([350.0, 10.0], circular=True)
        self.assertEqual(summary["validSamples"], 2)
        self.assertEqual(summary["min"], 10.0)
        self.assertEqual(summary["max"], 350.0)
        self.assertTrue(summary["mean"] < 1.0 or summary["mean"] > 359.0)


class LabelContract(unittest.TestCase):
    def test_csv_header_must_match_the_pds4_label(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sample.csv"
            path.write_text("SCLK,LMST,WRONG\n1,00100M00:00:00,2\n", encoding="utf-8")
            with self.assertRaises(SystemExit):
                build.read_product(
                    path,
                    [
                        {"name": "SCLK"},
                        {"name": "LMST"},
                        {"name": "PRESSURE"},
                    ],
                    ["LMST", "PRESSURE"],
                )

    def test_every_selected_column_is_a_documented_pds_field(self) -> None:
        documented = {
            "ATS_LOCAL_TEMP1",
            "ATS_LOCAL_TEMP2",
            "ATS_LOCAL_TEMP3",
            "ATS_LOCAL_TEMP4",
            "ATS_LOCAL_TEMP5",
            "PRESSURE",
            "LOCAL_RELATIVE_HUMIDITY",
            "HORIZONTAL_WIND_SPEED",
            "WIND_DIRECTION",
            "GROUND_TEMP",
            "UPWARD_SW_IRRADIANCE",
            "RDS_TOP_7",
        }
        used = {column for spec in build.SERIES_SPECS for column in spec["columns"]}
        self.assertEqual(used, documented)


def spec_for(sensor: str, column: str) -> dict:
    for spec in build.SERIES_SPECS:
        if spec["sensorToken"] == sensor and column in spec["columns"]:
            return spec
    raise AssertionError(f"no spec for {sensor}/{column}")


PRODUCT = {
    "_sol": 100,
    "sensorToken": "DER_WS",
    "csv": "WE__0100___________DER_WS__________________P02.CSV",
    "csvUrl": "https://example.invalid/product.csv",
    "versionId": "2.0",
}


class SeriesBuilding(unittest.TestCase):
    def build(self, spec: dict, header: list[str], rows: list[list[str]]):
        fields = [{"name": name, "unit": None} for name in header]
        return build.build_series(
            spec,
            "test series",
            spec["columns"][0],
            dict(PRODUCT, sensorToken=spec["sensorToken"]),
            fields,
            header,
            rows,
        )

    def test_sentinel_only_product_yields_no_series(self) -> None:
        spec = spec_for("DER_WS", "HORIZONTAL_WIND_SPEED")
        series = self.build(
            spec,
            ["LMST", "HORIZONTAL_WIND_SPEED"],
            [
                ["00100M04:00:00.000", "999999999"],
                ["00100M04:00:01.000", ""],
            ],
        )
        self.assertIsNone(series)

    def test_single_valid_sample_becomes_one_bin_and_counts_exclusions(self) -> None:
        spec = spec_for("DER_WS", "HORIZONTAL_WIND_SPEED")
        series = self.build(
            spec,
            ["LMST", "HORIZONTAL_WIND_SPEED"],
            [
                ["00100M04:00:00.000", "1.5"],
                ["00100M04:00:01.000", "999999999"],
            ],
        )
        assert series is not None
        self.assertEqual(series["points"], [{"t": 14400, "v": 1.5, "n": 1, "lo": 1.5, "hi": 1.5}])
        self.assertEqual(series["summary"]["validSamples"], 1)
        self.assertEqual(series["summary"]["excludedSamples"], 1)
        self.assertEqual(series["summary"]["firstLmstSeconds"], 14400.0)
        self.assertEqual(series["aggregation"]["interpolated"], False)

    def test_tirs_shadowed_ground_samples_are_excluded(self) -> None:
        spec = spec_for("CAL_TIRS", "GROUND_TEMP")
        header = ["LMST", "GROUND_TEMP", "TIRS_GROUND_FOOTPRINT_NOT_IN_SHADOW"]
        series = self.build(
            spec,
            header,
            [
                ["00100M04:00:00.000", "210.0", "0"],
                ["00100M04:00:01.000", "211.0", "1"],
            ],
        )
        assert series is not None
        self.assertEqual([point["v"] for point in series["points"]], [211.0])
        self.assertEqual(series["summary"]["excludedSamples"], 1)
        self.assertIn("shadowed", series["qualityStatus"])

    def test_rds_high_gain_rows_are_not_mixed_into_regular_mode(self) -> None:
        spec = spec_for("CAL_RDS", "RDS_TOP_7")
        header = ["LMST", "RDS_TOP_1", "RDS_TOP_7"]
        series = self.build(
            spec,
            header,
            [
                ["00100M04:00:00.000", "", "0.90"],
                ["00100M04:00:01.000", "12.0", "0.50"],
            ],
        )
        assert series is not None
        self.assertEqual([point["v"] for point in series["points"]], [0.5])
        self.assertEqual(series["summary"]["excludedSamples"], 1)

    def test_rds_series_is_radiance_not_dose(self) -> None:
        spec = spec_for("CAL_RDS", "RDS_TOP_7")
        series = self.build(
            spec,
            ["LMST", "RDS_TOP_1", "RDS_TOP_7"],
            [["00100M04:00:00.000", "12.0", "0.50"]],
        )
        assert series is not None
        self.assertEqual(series["physicalQuantity"], "photodiode_radiance_fov_integrated")
        self.assertEqual(series["unit"], "W/m²")
        self.assertNotIn("dose", series["physicalQuantity"])
        self.assertNotIn("dose", series["unit"].lower())
        self.assertIn("not ionizing dose", series["unitNote"].lower())


class CommittedDataset(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.data = json.loads(DATASET.read_text(encoding="utf-8"))

    def test_region_scope_and_verification(self) -> None:
        self.assertEqual(self.data["regionId"], "jezero")
        self.assertEqual(self.data["instrument"], "MEDA")
        self.assertEqual(self.data["sourceVerified"], "VERIFIED")
        self.assertEqual(self.data["processingVerified"], "VERIFIED")
        self.assertEqual(self.data["registrationVerified"], "NOT_EVALUATED")
        self.assertTrue(all(series["regionId"] == "jezero" for series in self.data["series"]))

    def test_units_and_quantities(self) -> None:
        units = {series["unit"] for series in self.data["series"]}
        self.assertTrue(units <= {"K", "Pa", "%", "m/s", "degree", "W/m²"})
        quantities = {series["physicalQuantity"] for series in self.data["series"]}
        self.assertIn("air_temperature", quantities)
        self.assertIn("surface_pressure", quantities)
        self.assertIn("relative_humidity", quantities)
        self.assertIn("horizontal_wind_speed", quantities)
        self.assertIn("wind_direction", quantities)
        self.assertIn("ground_brightness_temperature", quantities)
        self.assertIn("upward_shortwave_irradiance", quantities)
        self.assertIn("photodiode_radiance_fov_integrated", quantities)
        self.assertFalse(any("dose" in quantity for quantity in quantities))

    def test_no_null_or_sentinel_values_survive(self) -> None:
        for series in self.data["series"]:
            for point in series["points"]:
                self.assertIsNotNone(point["v"], series["id"])
                self.assertNotEqual(point["v"], 999999999, series["id"])
                self.assertGreaterEqual(point["n"], 1, series["id"])
                self.assertEqual(point["t"] % 600, 0, series["id"])

    def test_summaries_match_bins(self) -> None:
        for series in self.data["series"]:
            native = sum(point["n"] for point in series["points"])
            self.assertEqual(native, series["summary"]["validSamples"], series["id"])
            times = [point["t"] for point in series["points"]]
            self.assertEqual(times, sorted(set(times)), series["id"])
            self.assertLessEqual(len(times), 144, series["id"])

    def test_five_ats_detectors_per_sol(self) -> None:
        for sol in self.data["displayWindow"]["solSelection"]:
            ats = [
                series
                for series in self.data["series"]
                if series["sol"] == sol and series["physicalQuantity"] == "air_temperature"
            ]
            self.assertEqual(len(ats), 5, sol)

    def test_weather_and_radiation_availability_matrix(self) -> None:
        matrix = {entry["quantity"]: entry for entry in self.data["availability"]}
        for quantity in (
            "air_temperature",
            "surface_pressure",
            "relative_humidity",
            "horizontal_wind_speed",
            "wind_direction",
            "ground_brightness_temperature",
            "upward_shortwave_irradiance",
            "photodiode_radiance_fov_integrated",
        ):
            self.assertEqual(matrix[quantity]["status"], "available", quantity)
        self.assertEqual(matrix["dust_optical_depth"]["status"], "unavailable")
        self.assertEqual(matrix["ionizing_radiation_dose"]["status"], "unavailable")
        self.assertIn("never converted", matrix["ionizing_radiation_dose"]["reason"])

    def test_products_are_pds_identifiers_with_checksums(self) -> None:
        for entry in self.data["sols"]:
            self.assertGreaterEqual(len(entry["products"]), 5)
            for product in entry["products"]:
                self.assertRegex(product["productId"], r"^WE__\d{4}_.+_P\d{2}$")
                self.assertRegex(product["csvSha256"], r"^[0-9a-f]{64}$")
                self.assertIn("atmos.nmsu.edu", product["csvUrl"])


@unittest.skipUnless(CACHE.exists(), "raw PDS cache absent; fetch_meda.py was not run here")
class CachedProducts(unittest.TestCase):
    def test_cached_csv_rows_match_label_record_count(self) -> None:
        manifest = json.loads((CACHE / "download_manifest.json").read_text(encoding="utf-8"))
        for entry in manifest["sol"]:
            for product in entry["products"]:
                path = CACHE / f"sol_{entry['sol']:04d}" / product["csv"]
                if not path.exists():
                    self.skipTest(f"{path.name} not cached")
                lines = path.read_bytes().count(b"\n")
                # The PDS record count includes the header line.
                self.assertLessEqual(abs(lines - int(product["records"])), 2, path.name)


class EstimatorSanity(unittest.TestCase):
    def test_solar_values_are_physically_bounded(self) -> None:
        data = json.loads(DATASET.read_text(encoding="utf-8"))
        for series in data["series"]:
            if series["physicalQuantity"] not in {
                "upward_shortwave_irradiance",
                "photodiode_radiance_fov_integrated",
            }:
                continue
            for point in series["points"]:
                self.assertLess(point["v"], 5000.0, series["id"])
                self.assertGreater(point["v"], -50.0, series["id"])
                self.assertFalse(math.isnan(point["v"]))


if __name__ == "__main__":
    unittest.main()
