import json
import math
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in __import__("sys").path:
    __import__("sys").path.insert(0, str(ROOT))

from team.gale.weather.rems_parser import (
    EXPECTED_FIELD_NAMES,
    EXPECTED_SOL,
    NUMERIC_TYPES,
    build_output,
    parse_label,
    parse_records,
    quality_summary,
    validate_field_contract,
    validate_time_records,
    validate_source_identity,
)
from team.gale.weather.rems_schema import FieldSpec

DATA_DIR = ROOT / "team" / "gale" / "weather" / "data"
XML_PATH = DATA_DIR / "RME_406323911RMD01000000000_______P9.xml"
TAB_PATH = DATA_DIR / "RME_406323911RMD01000000000_______P9.TAB"
OUTPUT_PATH = DATA_DIR / "rems_sol_00100.json"


class TestGaleWeatherParser(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not XML_PATH.is_file() or not TAB_PATH.is_file():
            raise unittest.SkipTest("Raw PDS4 XML/TAB files not present in team/gale/weather/data (gitignored)")
        cls.label = parse_label(XML_PATH)
        cls.records = parse_records(cls.label, TAB_PATH, expected_sol=EXPECTED_SOL)

    # --- Group A: schema ---
    def test_label_parses(self):
        self.assertIsNotNone(self.label)
        self.assertTrue(self.label.logical_identifier)
        self.assertTrue(self.label.version_id)

    def test_field_count(self):
        self.assertEqual(len(self.label.fields), 40)

    def test_field_order(self):
        self.assertEqual(tuple(f.name for f in self.label.fields), EXPECTED_FIELD_NAMES)

    def test_units_preserved(self):
        by_name = {f.name: f for f in self.label.fields}
        self.assertEqual(by_name["AMBIENT_TEMP"].unit, "KELVIN")
        self.assertEqual(by_name["PRESSURE"].unit, "PASCAL")
        self.assertEqual(by_name["TIMESTAMP"].unit, "SECOND")

    def test_record_count(self):
        self.assertEqual(len(self.records), self.label.record_count)
        self.assertEqual(self.label.record_count, 35344)

    def test_product_identity(self):
        self.assertEqual(self.label.data_file_name, "RME_406323911RMD01000000000_______P9.TAB")
        self.assertIn("msl_rems", self.label.logical_identifier)

    def test_field_contract_validation(self):
        validate_field_contract(self.label)  # should not raise

    # --- Group B: numeric values ---
    def test_missing_sentinel_becomes_none(self):
        # Find a row where AMBIENT_TEMP is missing.
        missing_rows = [r for r in self.records if r["AMBIENT_TEMP"] is None]
        self.assertGreater(len(missing_rows), 0)

    def test_numeric_negative_preserved(self):
        spec = FieldSpec(name="TEST", number=1, data_type="ASCII_Real", unit=None)
        from team.gale.weather.rems_parser import _parse_numeric
        self.assertEqual(_parse_numeric("  -12.5  ", spec), -12.5)

    def test_numeric_missing_sentinel(self):
        spec = FieldSpec(name="TEST", number=1, data_type="ASCII_Real", unit=None, missing_constant="-999.00")
        from team.gale.weather.rems_parser import _parse_numeric
        self.assertIsNone(_parse_numeric("-999.00", spec))

    def test_numeric_rejects_text(self):
        spec = FieldSpec(name="TEST", number=1, data_type="ASCII_Real", unit=None)
        from team.gale.weather.rems_parser import _parse_numeric
        with self.assertRaises(ValueError):
            _parse_numeric("not-a-number", spec)

    def test_numeric_rejects_nonfinite(self):
        spec = FieldSpec(name="TEST", number=1, data_type="ASCII_Real", unit=None)
        from team.gale.weather.rems_parser import _parse_numeric
        with self.assertRaises(ValueError):
            _parse_numeric("inf", spec)

    def test_integer_parsing(self):
        spec = FieldSpec(name="TS", number=1, data_type="ASCII_Integer", unit="SECOND")
        from team.gale.weather.rems_parser import _parse_numeric
        self.assertEqual(_parse_numeric("123", spec), 123)

    # --- Group C: strings ---
    def test_lmst_preserved(self):
        self.assertTrue(all(isinstance(r["LMST"], str) for r in self.records[:10]))
        self.assertRegex(self.records[0]["LMST"], r"^\d{5}M\d{2}:\d{2}:\d{2}\.\d{3}$")

    def test_ltst_preserved(self):
        self.assertTrue(all(isinstance(r["LTST"], str) for r in self.records[:10]))
        self.assertRegex(self.records[0]["LTST"], r"^\d{5} \d{2}:\d{2}:\d{2}(\.\d{3})?$")

    def test_confidence_flags_are_strings(self):
        self.assertTrue(all(isinstance(r["WS_CONFIDENCE_LEVEL"], str) or r["WS_CONFIDENCE_LEVEL"] is None
                            for r in self.records))

    def test_pressure_config_is_string(self):
        configs = [r["PS_CONFIGURATION"] for r in self.records if r["PS_CONFIGURATION"] is not None]
        self.assertGreater(len(configs), 0)
        self.assertTrue(all(isinstance(c, str) for c in configs))

    # --- Group D: time validation ---
    def test_time_validation_passes(self):
        issues = validate_time_records(self.records, expected_sol=EXPECTED_SOL)
        self.assertEqual(issues, [])

    def test_timestamp_monotonic(self):
        timestamps = [r["TIMESTAMP"] for r in self.records if r["TIMESTAMP"] is not None]
        self.assertEqual(timestamps, sorted(timestamps))

    def test_malformed_time_reported(self):
        bad_records = [dict(r) for r in self.records[:1]]
        bad_records[0]["LMST"] = "not-a-time"
        issues = validate_time_records(bad_records, expected_sol=EXPECTED_SOL)
        self.assertGreater(len(issues), 0)

    def test_sol_consistency(self):
        for r in self.records[:100]:
            self.assertEqual(int(r["LMST"][:5]), EXPECTED_SOL)
            self.assertEqual(int(r["LTST"][:5]), EXPECTED_SOL)

    # --- Group E: data integrity ---
    def test_full_sol_parses(self):
        self.assertEqual(len(self.records), 35344)

    def test_all_rows_have_40_fields(self):
        for r in self.records:
            self.assertEqual(len(r), 40)

    def test_missing_stats_reproducible(self):
        q1 = quality_summary(self.records, self.label)
        q2 = quality_summary(self.records, self.label)
        self.assertEqual(q1["missing_counts"], q2["missing_counts"])
        self.assertEqual(q1["total_rows"], 35344)

    def test_json_serialization(self):
        source = {
            "bundle_doi": "10.17189/vwva-ms24",
            "data_product": "RME_406323911RMD01000000000_______P9.TAB",
            "label_product": "RME_406323911RMD01000000000_______P9.xml",
        }
        output = build_output(EXPECTED_SOL, self.label, self.records, source)
        text = json.dumps(output, separators=(",", ":"))
        self.assertGreater(len(text), 0)
        reparsed = json.loads(text)
        self.assertEqual(reparsed["quality_summary"]["total_rows"], 35344)
        self.assertEqual(len(reparsed["records"]), 35344)
        self.assertEqual(len(reparsed["records"][0]), 40)

    def test_output_file_exists(self):
        self.assertTrue(OUTPUT_PATH.is_file())

    # --- Group F: negative cases ---
    def test_missing_label_raises(self):
        with tempfile.TemporaryDirectory() as td:
            missing = Path(td) / "missing.xml"
            with self.assertRaises(FileNotFoundError):
                parse_label(missing)

    def test_missing_data_file_raises(self):
        with tempfile.TemporaryDirectory() as td:
            missing = Path(td) / "missing.TAB"
            with self.assertRaises(FileNotFoundError):
                parse_records(self.label, missing)

    def test_record_count_mismatch_raises(self):
        # Create a truncated copy of the data file.
        with tempfile.TemporaryDirectory() as td:
            truncated = Path(td) / "truncated.TAB"
            lines = TAB_PATH.read_text(encoding="ascii").splitlines()
            truncated.write_text("\n".join(lines[:5]) + "\n", encoding="ascii")
            with self.assertRaises(ValueError):
                parse_records(self.label, truncated)

    def test_wrong_field_count_raises(self):
        with tempfile.TemporaryDirectory() as td:
            bad = Path(td) / "bad.TAB"
            # One field short.
            lines = TAB_PATH.read_text(encoding="ascii").splitlines()
            bad_lines = []
            for line in lines[:3]:
                bad_lines.append(line.rsplit(",", 1)[0])
            bad.write_text("\n".join(bad_lines) + "\n", encoding="ascii")
            with self.assertRaises(ValueError):
                parse_records(self.label, bad)

    def test_invalid_numeric_raises(self):
        with tempfile.TemporaryDirectory() as td:
            bad = Path(td) / "bad.TAB"
            lines = TAB_PATH.read_text(encoding="ascii").splitlines()
            # Replace first numeric field value with text in first row.
            bad.write_text(lines[0].replace(" 397584147", " notanum  ", 1) + "\n",
                           encoding="ascii")
            # Pad to at least one record; record count mismatch will also raise.
            with self.assertRaises(ValueError):
                parse_records(self.label, bad)


class TestGaleWeatherHardening(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not XML_PATH.is_file() or not TAB_PATH.is_file():
            raise unittest.SkipTest("Raw PDS4 XML/TAB files not present in team/gale/weather/data (gitignored)")
        cls.label = parse_label(XML_PATH)
        cls.records = parse_records(cls.label, TAB_PATH, expected_sol=EXPECTED_SOL)

    def test_source_identity_valid(self):
        validate_source_identity(self.label, TAB_PATH, expected_sol=EXPECTED_SOL)

    def test_source_identity_wrong_filename(self):
        from pathlib import Path as P
        wrong = P("WRONG.TAB")
        # Create a dummy file to satisfy is_file check? validate_source_identity checks name only before file existence.
        with self.assertRaises(ValueError):
            validate_source_identity(self.label, wrong, expected_sol=EXPECTED_SOL)

    def test_source_identity_wrong_logical_identifier(self):
        bad_label = parse_label(XML_PATH)
        bad_label.logical_identifier = "urn:nasa:pds:msl_rems:data_calibrated:wrong"
        with self.assertRaises(ValueError):
            validate_source_identity(bad_label, TAB_PATH, expected_sol=EXPECTED_SOL)

    def test_source_identity_wrong_version(self):
        bad_label = parse_label(XML_PATH)
        bad_label.version_id = "9.9"
        with self.assertRaises(ValueError):
            validate_source_identity(bad_label, TAB_PATH, expected_sol=EXPECTED_SOL)

    def test_logical_identifier_suffix_matches_filename_version(self):
        # PDS4 LIDs lowercase the product filename version suffix (_P9 -> _p9).
        self.assertTrue(self.label.logical_identifier.endswith(TAB_PATH.stem[-2:].lower()))
        self.assertTrue(TAB_PATH.name.endswith("P9.TAB"))
        validate_source_identity(self.label, TAB_PATH, expected_sol=EXPECTED_SOL)

    def test_truncated_record_raises(self):
        with tempfile.TemporaryDirectory() as td:
            bad = Path(td) / "bad.TAB"
            lines = TAB_PATH.read_bytes().split(b"\r\n")
            if lines and lines[-1] == b"":
                lines = lines[:-1]
            # Remove last 10 bytes from first record.
            truncated_line = lines[0][:-10] + b"\r\n"
            bad.write_bytes(truncated_line + b"\r\n".join(lines[1:]) + b"\r\n")
            with self.assertRaises(ValueError):
                parse_records(self.label, bad)

    def test_oversized_record_raises(self):
        with tempfile.TemporaryDirectory() as td:
            bad = Path(td) / "bad.TAB"
            lines = TAB_PATH.read_bytes().split(b"\r\n")
            if lines and lines[-1] == b"":
                lines = lines[:-1]
            oversized_line = lines[0] + b" " + b"\r\n"
            bad.write_bytes(oversized_line + b"\r\n".join(lines[1:]) + b"\r\n")
            with self.assertRaises(ValueError):
                parse_records(self.label, bad)

    def test_blank_record_raises(self):
        with tempfile.TemporaryDirectory() as td:
            bad = Path(td) / "bad.TAB"
            lines = TAB_PATH.read_bytes().split(b"\r\n")
            if lines and lines[-1] == b"":
                lines = lines[:-1]
            blank_line = b"\r\n"
            bad.write_bytes(lines[0] + b"\r\n" + blank_line + b"\r\n".join(lines[2:]) + b"\r\n")
            with self.assertRaises(ValueError):
                parse_records(self.label, bad)

    def test_missing_record_raises(self):
        with tempfile.TemporaryDirectory() as td:
            bad = Path(td) / "bad.TAB"
            lines = TAB_PATH.read_bytes().split(b"\r\n")
            if lines and lines[-1] == b"":
                lines = lines[:-1]
            # Remove one record entirely.
            bad.write_bytes(b"\r\n".join(lines[:-1]) + b"\r\n")
            with self.assertRaises(ValueError):
                parse_records(self.label, bad)

    def test_extra_record_raises(self):
        with tempfile.TemporaryDirectory() as td:
            bad = Path(td) / "bad.TAB"
            lines = TAB_PATH.read_bytes().split(b"\r\n")
            if lines and lines[-1] == b"":
                lines = lines[:-1]
            extra = lines[0] + b"\r\n"
            bad.write_bytes(b"\r\n".join(lines) + b"\r\n" + extra)
            with self.assertRaises(ValueError):
                parse_records(self.label, bad)

    def test_incorrect_record_length_raises(self):
        with tempfile.TemporaryDirectory() as td:
            bad = Path(td) / "bad.TAB"
            # Write a record with wrong number of bytes (10) + CRLF.
            bad.write_bytes(b"1234567890\r\n")
            with self.assertRaises(ValueError):
                parse_records(self.label, bad)

    def test_field_boundary_exceeds_record_raises(self):
        from team.gale.weather.rems_schema import FieldSpec
        bad_label = parse_label(XML_PATH)
        # Move last field beyond record boundary.
        bad_label.fields[-1].location = 400
        with tempfile.TemporaryDirectory() as td:
            bad = Path(td) / "bad.TAB"
            bad.write_bytes(TAB_PATH.read_bytes()[:372])
            with self.assertRaises(ValueError):
                parse_records(bad_label, bad)

    def test_wrong_delimiter_handling(self):
        with tempfile.TemporaryDirectory() as td:
            bad = Path(td) / "bad.TAB"
            # LF-only file should be rejected because label declares CRLF records.
            raw = TAB_PATH.read_bytes().replace(b"\r\n", b"\n")
            bad.write_bytes(raw)
            with self.assertRaises(ValueError):
                parse_records(self.label, bad)

    def test_crlf_handling_valid(self):
        # The real source uses CRLF and must parse successfully.
        self.assertEqual(len(self.records), 35344)


if __name__ == "__main__":
    unittest.main()
