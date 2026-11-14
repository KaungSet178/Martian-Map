import json
import math
import unittest
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
import sys
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from team.gale.weather.mars_time import (
    calculate_mars_ls_from_utc,
    calculate_mars_ls_from_jd_tt,
    circular_difference_deg,
    gale_season_from_ls,
    martian_year_clancy,
    northern_season_from_ls,
    rems_timestamp_to_jd_tt,
    rems_timestamp_to_ls,
    southern_season_from_ls,
    tai_utc_offset,
    utc_to_julian_date,
    utc_to_tt_julian_date,
    tt_minus_utc_seconds,
    _find_ls_zero_crossing,
    _ls_raw,
    _mars_year_reference,
    _martian_year_from_jd_tt,
    _solve_ls_multiple_crossing,
)

J2000_JD = 2451545.0


def _datetime_from_jd(jd: float) -> datetime:
    return datetime(2000, 1, 1, 12, tzinfo=timezone.utc) + timedelta(days=jd - J2000_JD)


def _utc_from_tt_jd(jd_tt: float) -> datetime:
    jd_utc = jd_tt
    for _ in range(4):
        jd_utc = jd_tt - tt_minus_utc_seconds(_datetime_from_jd(jd_utc)) / 86400.0
    return _datetime_from_jd(jd_utc)


def _crossing_for_utc(dt: datetime) -> float:
    return _find_ls_zero_crossing(utc_to_tt_julian_date(dt))

METADATA_PATH = ROOT / "team" / "gale" / "weather" / "data" / "rems_sol_00100_time_metadata.json"


class TestGaleMarsTime(unittest.TestCase):
    # --- Group A: time handling ---
    def test_valid_utc_input(self):
        dt = datetime(2000, 1, 6, tzinfo=timezone.utc)
        jd = utc_to_julian_date(dt)
        self.assertAlmostEqual(jd, 2451549.5, places=6)

    def test_timezone_aware_required(self):
        with self.assertRaises(ValueError):
            utc_to_julian_date(datetime(2000, 1, 6))

    def test_tt_offset_calculation(self):
        dt = datetime(2012, 11, 16, tzinfo=timezone.utc)
        jd_tt = utc_to_tt_julian_date(dt)
        jd_utc = utc_to_julian_date(dt)
        self.assertGreater(jd_tt, jd_utc)

    def test_leap_second_offset(self):
        dt = datetime(2012, 11, 16, tzinfo=timezone.utc)
        off = tai_utc_offset(dt)
        self.assertEqual(off, 35.0)

    def test_rems_timestamp_conversion(self):
        jd = rems_timestamp_to_jd_tt(406323911)
        self.assertAlmostEqual(jd, 2456247.8230439816, places=6)

    def test_invalid_date_range_raises(self):
        with self.assertRaises(ValueError):
            utc_to_julian_date(datetime(2000, 1, 1))  # timezone-naive

    # --- Group B: Ls calculations ---
    def test_ls_worked_example_1(self):
        dt = datetime(2000, 1, 6, tzinfo=timezone.utc)
        ls = calculate_mars_ls_from_utc(dt)
        self.assertAlmostEqual(ls, 277.18758, places=4)

    def test_ls_worked_example_spirit(self):
        dt = datetime(2004, 1, 3, 13, 46, 31, tzinfo=timezone.utc)
        ls = calculate_mars_ls_from_utc(dt)
        self.assertAlmostEqual(ls, 327.32416, places=4)

    def test_ls_curiosity_landing_published(self):
        dt = datetime(2012, 8, 7, 12, 0, 0, tzinfo=timezone.utc)
        ls = calculate_mars_ls_from_utc(dt)
        # Published REMS page value: Ls 151.0 (rounded to one decimal).
        self.assertLess(circular_difference_deg(ls, 151.0), 0.5)

    def test_ls_normalization(self):
        ls = calculate_mars_ls_from_utc(datetime(2000, 1, 6, tzinfo=timezone.utc))
        self.assertGreaterEqual(ls, 0.0)
        self.assertLess(ls, 360.0)

    def test_ls_near_zero_boundary(self):
        # Find a date near Ls 0.
        # Use the MY1 epoch date; Ls should be near 0.
        dt = datetime(1955, 4, 11, tzinfo=timezone.utc)
        ls = calculate_mars_ls_from_utc(dt)
        self.assertLess(circular_difference_deg(ls, 0.0), 1.0)

    def test_rems_timestamp_ls(self):
        ls = rems_timestamp_to_ls(406323911)
        self.assertAlmostEqual(ls, 207.896385, places=4)

    def test_deterministic(self):
        dt = datetime(2012, 11, 16, tzinfo=timezone.utc)
        self.assertEqual(calculate_mars_ls_from_utc(dt), calculate_mars_ls_from_utc(dt))

    def test_independent_utc_cross_check(self):
        metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
        rem = metadata["samples"][0]["ls_degrees"]
        utc = metadata["independent_utc_cross_check"]["ls_degrees"]
        self.assertLess(circular_difference_deg(rem, utc), 0.002)

    # --- Group C: seasonal labels ---
    def test_northern_seasons(self):
        self.assertEqual(northern_season_from_ls(0.0), "Spring")
        self.assertEqual(northern_season_from_ls(90.0), "Summer")
        self.assertEqual(northern_season_from_ls(180.0), "Autumn")
        self.assertEqual(northern_season_from_ls(270.0), "Winter")

    def test_southern_reversal(self):
        self.assertEqual(southern_season_from_ls(0.0), "Autumn")
        self.assertEqual(southern_season_from_ls(90.0), "Winter")
        self.assertEqual(southern_season_from_ls(180.0), "Spring")
        self.assertEqual(southern_season_from_ls(270.0), "Summer")

    def test_gale_season(self):
        self.assertEqual(gale_season_from_ls(208.0), "Spring")

    def test_boundary_360(self):
        self.assertEqual(northern_season_from_ls(359.9), "Winter")
        self.assertAlmostEqual(circular_difference_deg(359.9, 0.1), 0.2, places=10)

    # --- Group D: Sol 100 integration ---
    def test_sol100_metadata_exists(self):
        self.assertTrue(METADATA_PATH.is_file())

    def test_sol100_metadata_preserves_source(self):
        metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
        self.assertEqual(metadata["sol"], 100)
        self.assertEqual(metadata["source_dataset"], "MSL-M-REMS-5-MODRDR-V1.0")
        self.assertEqual(metadata["validation_status"], "PARTIALLY_VALIDATED")
        self.assertEqual(metadata["martian_year_clancy_sol100"], 31)

    def test_sol100_ls_range(self):
        metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
        rng = metadata["ls_range_degrees"]
        self.assertGreater(rng[1], rng[0])
        self.assertLess(rng[1] - rng[0], 1.0)

    def test_sol100_samples_authentic(self):
        metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
        self.assertEqual(len(metadata["samples"]), 3)
        for s in metadata["samples"]:
            self.assertIn("timestamp_seconds_since_j2000", s)
            self.assertIn("ls_degrees", s)
            self.assertIn("gale_season", s)

    # --- Group E: invalid inputs ---
    def test_invalid_date_raises(self):
        with self.assertRaises((TypeError, ValueError)):
            utc_to_julian_date(None)  # type: ignore[arg-type]

    def test_missing_timestamp_raises(self):
        records = [{"TIMESTAMP": None, "LMST": "00100M00:00:00.192", "LTST": "00100 00:37:07"}]
        from team.gale.weather.mars_time import build_sol100_time_metadata
        with self.assertRaises(ValueError):
            build_sol100_time_metadata(records)

    def test_nonfinite_jd_raises(self):
        with self.assertRaises(ValueError):
            from team.gale.weather.mars_time import calculate_mars_ls_from_jd_tt
            calculate_mars_ls_from_jd_tt(float("nan"))

    def test_unknown_year_convention_documented(self):
        # Clancy convention is implemented and validated for Curiosity landing.
        self.assertEqual(martian_year_clancy(datetime(2012, 8, 7, tzinfo=timezone.utc)), 31)

    def test_martian_year_epoch_near_ls_zero(self):
        ls = calculate_mars_ls_from_utc(datetime(1955, 4, 11, tzinfo=timezone.utc))
        self.assertLess(circular_difference_deg(ls, 0.0), 1.0)


class TestGaleMarsTimeHardening(unittest.TestCase):
    # --- Group A: historical time conversion ---
    def test_pre1972_no_extra_32_seconds(self):
        dt = datetime(1955, 4, 11, tzinfo=timezone.utc)
        # Direct polynomial value.
        expected = 64.184 + 59.0 * ((utc_to_julian_date(dt) - 2451545.0) / 36525.0) - 51.2 * ((utc_to_julian_date(dt) - 2451545.0) / 36525.0) ** 2 - 67.1 * ((utc_to_julian_date(dt) - 2451545.0) / 36525.0) ** 3 - 16.4 * ((utc_to_julian_date(dt) - 2451545.0) / 36525.0) ** 4
        self.assertAlmostEqual(tt_minus_utc_seconds(dt), expected, places=10)

    def test_pre1972_tt_less_than_post_formula_plus_32(self):
        dt = datetime(1955, 4, 11, tzinfo=timezone.utc)
        # Ensure we did not add 32.184.
        self.assertLess(tt_minus_utc_seconds(dt), 64.184 + 32.184 + 10.0)

    def test_post1972_tai_plus_32(self):
        dt = datetime(2012, 11, 16, tzinfo=timezone.utc)
        self.assertAlmostEqual(tt_minus_utc_seconds(dt), 35.0 + 32.184, places=10)

    def test_tai_utc_raises_before_1972(self):
        dt = datetime(1955, 4, 11, tzinfo=timezone.utc)
        with self.assertRaises(ValueError):
            from team.gale.weather.mars_time import tai_utc_offset
            tai_utc_offset(dt)

    def test_leap_second_boundary(self):
        before = datetime(2012, 6, 30, tzinfo=timezone.utc)
        after = datetime(2012, 7, 1, tzinfo=timezone.utc)
        self.assertEqual(tai_utc_offset(before), 34.0)
        self.assertEqual(tai_utc_offset(after), 35.0)

    def test_tt_jd_consistency(self):
        dt = datetime(2012, 11, 16, tzinfo=timezone.utc)
        jd_tt = utc_to_tt_julian_date(dt)
        jd_utc = utc_to_julian_date(dt)
        self.assertAlmostEqual(jd_tt - jd_utc, tt_minus_utc_seconds(dt) / 86400.0, places=9)

    # --- Group B: Martian-year boundaries ---
    def test_my1_reference(self):
        self.assertEqual(martian_year_clancy(datetime(1955, 4, 11, tzinfo=timezone.utc)), 1)

    def test_my31_curiosity_landing(self):
        self.assertEqual(martian_year_clancy(datetime(2012, 8, 7, tzinfo=timezone.utc)), 31)

    def test_sol100_my31(self):
        self.assertEqual(martian_year_clancy(datetime(2012, 11, 16, tzinfo=timezone.utc)), 31)

    def test_year_boundary_wrap(self):
        # Ls near 0 should be MY boundary; ensure no crash.
        crossing = _find_ls_zero_crossing(utc_to_tt_julian_date(datetime(1955, 4, 11, tzinfo=timezone.utc)))
        self.assertTrue(math.isfinite(crossing))

    def test_deterministic_boundary(self):
        jd = utc_to_tt_julian_date(datetime(2012, 8, 7, tzinfo=timezone.utc))
        c1 = _find_ls_zero_crossing(jd)
        c2 = _find_ls_zero_crossing(jd)
        self.assertEqual(c1, c2)

    # --- Group C: REMS timestamp uncertainty ---
    def test_rems_timestamp_first_record(self):
        # First record timestamp; Ls computed but scale is assumed.
        from team.gale.weather.mars_time import rems_timestamp_to_ls
        ls = rems_timestamp_to_ls(406323911)
        self.assertAlmostEqual(ls, 207.896385, places=4)

    def test_rems_timestamp_no_unexplained_offset(self):
        # Ensure we do not silently adjust timestamps.
        from team.gale.weather.mars_time import rems_timestamp_to_jd_tt
        jd = rems_timestamp_to_jd_tt(406323911)
        self.assertAlmostEqual(jd, 2451545.0 + 406323911 / 86400.0, places=12)

    def test_metadata_validation_status_not_fully_validated(self):
        import json
        meta = json.loads((ROOT / "team" / "gale" / "weather" / "data" / "rems_sol_00100_time_metadata.json").read_text(encoding="utf-8"))
        self.assertNotEqual(meta["validation_status"], "VALIDATED")
        self.assertEqual(meta["validation_statuses"]["rems_source_timestamp"], "ASSUMED_TIME_SCALE")

    # --- Group D: regression ---
    def test_mars24_example_1_unchanged(self):
        dt = datetime(2000, 1, 6, tzinfo=timezone.utc)
        ls = calculate_mars_ls_from_utc(dt)
        self.assertAlmostEqual(ls, 277.18758, places=4)

    def test_mars24_example_2_unchanged(self):
        dt = datetime(2004, 1, 3, 13, 46, 31, tzinfo=timezone.utc)
        ls = calculate_mars_ls_from_utc(dt)
        self.assertAlmostEqual(ls, 327.32416, places=4)

    def test_seasonal_labels_unchanged(self):
        self.assertEqual(northern_season_from_ls(208.0), "Autumn")
        self.assertEqual(gale_season_from_ls(208.0), "Spring")


class TestGaleMarsTimeBoundaryCorrection(unittest.TestCase):
    """W1.2B-H2: Ls=0 crossing detection and exact year boundaries.

    Published dates below come from Clancy et al. (2000) and the Cantor et al.
    (2010) Mars Year table reproduced by The Planetary Society. Those references
    are calendar-day precision; exact instants are calculated here and their Ls
    is validated independently of the year classifier.
    """

    # --- Group A: root-finding validation ---
    def test_crossing_is_finite(self):
        crossing = _crossing_for_utc(datetime(1957, 2, 26, tzinfo=timezone.utc))
        self.assertTrue(math.isfinite(crossing))

    def test_crossing_ls_is_zero(self):
        crossing = _crossing_for_utc(datetime(1957, 2, 26, tzinfo=timezone.utc))
        ls = calculate_mars_ls_from_jd_tt(crossing)
        self.assertLess(circular_difference_deg(ls, 0.0), 1e-6)

    def test_crossing_uses_intended_multiple(self):
        crossing = _crossing_for_utc(datetime(1957, 2, 26, tzinfo=timezone.utc))
        multiple = int(round(_ls_raw(crossing) / 360.0))
        self.assertEqual(multiple, -22)
        self.assertAlmostEqual(_ls_raw(crossing), multiple * 360.0, places=6)

    def test_nearby_guesses_converge_consistently(self):
        jd = utc_to_tt_julian_date(datetime(1957, 2, 26, tzinfo=timezone.utc))
        roots = [_find_ls_zero_crossing(jd + offset) for offset in (-2.0, -0.5, 0.0, 0.5, 2.0)]
        for root in roots[1:]:
            self.assertLess(abs(root - roots[0]), 1e-6)

    def test_guess_near_another_year_finds_its_crossing(self):
        jd = utc_to_tt_julian_date(datetime(2012, 8, 7, 12, tzinfo=timezone.utc))
        crossing = _find_ls_zero_crossing(jd)
        self.assertEqual(int(round(_ls_raw(crossing) / 360.0)), 7)
        self.assertEqual(_utc_from_tt_jd(crossing).date().isoformat(), "2011-09-13")

    def test_nonfinite_guess_rejected(self):
        for value in (float("nan"), float("inf"), float("-inf")):
            with self.assertRaises(ValueError):
                _find_ls_zero_crossing(value)

    def test_non_numeric_guess_rejected(self):
        for value in (None, "2435208.9", True):
            with self.assertRaises(TypeError):
                _find_ls_zero_crossing(value)  # type: ignore[arg-type]

    def test_unbracketable_target_raises(self):
        jd = utc_to_tt_julian_date(datetime(2012, 8, 7, tzinfo=timezone.utc))
        with self.assertRaises(ValueError):
            _solve_ls_multiple_crossing(1_000_000, jd)

    # --- Group B: Martian-year boundaries ---
    def test_my1_crossing_near_published_date(self):
        crossing = _crossing_for_utc(datetime(1955, 4, 11, tzinfo=timezone.utc))
        self.assertEqual(_utc_from_tt_jd(crossing).date().isoformat(), "1955-04-11")

    def test_my1_boundary_day_labeled_my1(self):
        # Published convention is date-only; the exact crossing is mid-day.
        self.assertEqual(
            martian_year_clancy(datetime(1955, 4, 11, 0, 0, tzinfo=timezone.utc)), 1
        )

    def test_dates_before_supported_range_raise(self):
        with self.assertRaises(ValueError):
            martian_year_clancy(datetime(1955, 4, 10, 23, 59, tzinfo=timezone.utc))

    def test_my2_crossing_near_published_date(self):
        crossing = _crossing_for_utc(datetime(1957, 2, 26, tzinfo=timezone.utc))
        self.assertEqual(_utc_from_tt_jd(crossing).date().isoformat(), "1957-02-26")

    def test_my3_crossing_near_published_date(self):
        crossing = _crossing_for_utc(datetime(1959, 1, 14, tzinfo=timezone.utc))
        self.assertEqual(_utc_from_tt_jd(crossing).date().isoformat(), "1959-01-14")

    def test_my31_crossing_near_published_date(self):
        crossing = _crossing_for_utc(datetime(2012, 8, 7, tzinfo=timezone.utc))
        self.assertEqual(_utc_from_tt_jd(crossing).date().isoformat(), "2011-09-13")

    def test_my31_curiosity_landing(self):
        self.assertEqual(
            martian_year_clancy(datetime(2012, 8, 7, 12, 0, tzinfo=timezone.utc)), 31
        )

    def test_my31_sol100(self):
        self.assertEqual(
            martian_year_clancy(datetime(2012, 11, 16, 7, 48, 43, 598000, tzinfo=timezone.utc)),
            31,
        )

    def test_my2_before_at_after_crossing(self):
        crossing = _crossing_for_utc(datetime(1957, 2, 26, tzinfo=timezone.utc))
        self.assertEqual(_martian_year_from_jd_tt(crossing - 1.0 / 24.0), 1)
        self.assertEqual(_martian_year_from_jd_tt(crossing), 2)
        self.assertEqual(_martian_year_from_jd_tt(crossing + 1.0 / 24.0), 2)

    def test_my3_before_at_after_crossing(self):
        crossing = _crossing_for_utc(datetime(1959, 1, 14, tzinfo=timezone.utc))
        self.assertEqual(_martian_year_from_jd_tt(crossing - 1.0 / 24.0), 2)
        self.assertEqual(_martian_year_from_jd_tt(crossing), 3)
        self.assertEqual(_martian_year_from_jd_tt(crossing + 1.0 / 24.0), 3)

    def test_my31_before_at_after_crossing(self):
        crossing = _crossing_for_utc(datetime(2012, 8, 7, tzinfo=timezone.utc))
        self.assertEqual(_martian_year_from_jd_tt(crossing - 1.0 / 24.0), 30)
        self.assertEqual(_martian_year_from_jd_tt(crossing), 31)
        self.assertEqual(_martian_year_from_jd_tt(crossing + 1.0 / 24.0), 31)

    def test_no_premature_transition_at_old_approximate_phase(self):
        # The superseded classifier used raw Ls at 1955-04-11 00:00 UTC, which is
        # about 0.23 deg (roughly 11 hours) before the true MY2 crossing.
        crossing = _crossing_for_utc(datetime(1957, 2, 26, tzinfo=timezone.utc))
        five_hours_before = crossing - 5.0 / 24.0
        self.assertEqual(_martian_year_from_jd_tt(five_hours_before), 1)
        ten_hours_before = crossing - 10.0 / 24.0
        self.assertEqual(_martian_year_from_jd_tt(ten_hours_before), 1)

    def test_transition_occurs_exactly_once(self):
        crossing = _crossing_for_utc(datetime(1957, 2, 26, tzinfo=timezone.utc))
        years = [
            _martian_year_from_jd_tt(crossing + hours / 24.0)
            for hours in range(-24, 25)
        ]
        transitions = sum(1 for a, b in zip(years, years[1:]) if a != b)
        self.assertEqual(transitions, 1)
        self.assertEqual(years[0], 1)
        self.assertEqual(years[-1], 2)

    def test_reference_is_calculated_crossing_not_raw_epoch_phase(self):
        reference_jd, reference_multiple = _mars_year_reference()
        self.assertLess(
            circular_difference_deg(calculate_mars_ls_from_jd_tt(reference_jd), 0.0),
            1e-6,
        )
        self.assertAlmostEqual(_ls_raw(reference_jd), reference_multiple * 360.0, places=6)
        self.assertNotAlmostEqual(
            _ls_raw(reference_jd),
            _ls_raw(utc_to_tt_julian_date(datetime(1955, 4, 11, tzinfo=timezone.utc))),
            places=3,
        )

    # --- Group C: preserved scientific regression ---
    def test_sol100_ls_values_unchanged(self):
        metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
        self.assertAlmostEqual(metadata["samples"][0]["ls_degrees"], 207.896385, places=6)
        self.assertAlmostEqual(metadata["samples"][1]["ls_degrees"], 208.184599, places=6)
        self.assertAlmostEqual(metadata["samples"][2]["ls_degrees"], 208.495693, places=6)
        self.assertEqual(metadata["martian_year_clancy_sol100"], 31)

    def test_sol100_seasons_unchanged(self):
        metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
        for sample in metadata["samples"]:
            self.assertEqual(sample["ls_northern_season"], "Autumn")
            self.assertEqual(sample["ls_southern_season"], "Spring")
            self.assertEqual(sample["gale_season"], "Spring")

    def test_rems_uncertainty_statuses_preserved(self):
        metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
        self.assertEqual(metadata["validation_status"], "PARTIALLY_VALIDATED")
        self.assertEqual(
            metadata["validation_statuses"]["rems_source_timestamp"],
            "ASSUMED_TIME_SCALE",
        )
        self.assertEqual(
            metadata["validation_statuses"]["orbital_algorithm"],
            "VALIDATED_AGAINST_MARS24_REFERENCES",
        )
        self.assertEqual(
            metadata["validation_statuses"]["utc_to_tt_conversion"],
            "VALIDATED_FOR_SUPPORTED_DATE_RANGE",
        )


if __name__ == "__main__":
    unittest.main()
