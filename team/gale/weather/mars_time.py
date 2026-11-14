"""Martian solar longitude and time-scale helpers for REMS observations."""

from __future__ import annotations

import math
from datetime import datetime, timezone, timedelta
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple

J2000_JD = 2451545.0
MARS_TROPICAL_YEAR_SOL = 668.5921
MARS_TROPICAL_YEAR_DAY = 686.9725

# Root-finding controls for Ls = 0 boundary detection.
_ROOT_JD_TOLERANCE_DAYS = 1e-9
_MAX_BISECTION_ITERATIONS = 200
_MAX_BRACKET_HALF_WIDTH_DAYS = 512.0
_LS_ROOT_TOLERANCE_DEG = 1e-6
# Dates this close to a boundary are re-checked against the solved crossing.
_BOUNDARY_GUARD_DEG = 1e-4
_BOUNDARY_JD_TOLERANCE_DAYS = 1e-9

_LEAP_SECONDS = [
    (datetime(1972, 1, 1, tzinfo=timezone.utc), 10),
    (datetime(1972, 7, 1, tzinfo=timezone.utc), 11),
    (datetime(1973, 1, 1, tzinfo=timezone.utc), 12),
    (datetime(1974, 1, 1, tzinfo=timezone.utc), 13),
    (datetime(1975, 1, 1, tzinfo=timezone.utc), 14),
    (datetime(1976, 1, 1, tzinfo=timezone.utc), 15),
    (datetime(1977, 1, 1, tzinfo=timezone.utc), 16),
    (datetime(1978, 1, 1, tzinfo=timezone.utc), 17),
    (datetime(1979, 1, 1, tzinfo=timezone.utc), 18),
    (datetime(1980, 1, 1, tzinfo=timezone.utc), 19),
    (datetime(1981, 7, 1, tzinfo=timezone.utc), 20),
    (datetime(1982, 7, 1, tzinfo=timezone.utc), 21),
    (datetime(1983, 7, 1, tzinfo=timezone.utc), 22),
    (datetime(1985, 7, 1, tzinfo=timezone.utc), 23),
    (datetime(1988, 1, 1, tzinfo=timezone.utc), 24),
    (datetime(1990, 1, 1, tzinfo=timezone.utc), 25),
    (datetime(1991, 1, 1, tzinfo=timezone.utc), 26),
    (datetime(1992, 7, 1, tzinfo=timezone.utc), 27),
    (datetime(1993, 7, 1, tzinfo=timezone.utc), 28),
    (datetime(1994, 7, 1, tzinfo=timezone.utc), 29),
    (datetime(1996, 1, 1, tzinfo=timezone.utc), 30),
    (datetime(1997, 7, 1, tzinfo=timezone.utc), 31),
    (datetime(1999, 1, 1, tzinfo=timezone.utc), 32),
    (datetime(2006, 1, 1, tzinfo=timezone.utc), 33),
    (datetime(2009, 1, 1, tzinfo=timezone.utc), 34),
    (datetime(2012, 7, 1, tzinfo=timezone.utc), 35),
    (datetime(2015, 7, 1, tzinfo=timezone.utc), 36),
    (datetime(2017, 1, 1, tzinfo=timezone.utc), 37),
]

_MARS_YEAR_1_EPOCH_UTC = datetime(1955, 4, 11, 0, 0, 0, tzinfo=timezone.utc)


def _validate_utc(dt: datetime) -> None:
    if not isinstance(dt, datetime):
        raise TypeError("Expected a datetime")
    if dt.tzinfo is None:
        raise ValueError("Timezone-naive datetime is not supported; provide a timezone-aware UTC datetime")


def utc_to_julian_date(dt: datetime) -> float:
    _validate_utc(dt)
    dt = dt.astimezone(timezone.utc)
    year = dt.year
    month = dt.month
    day = dt.day
    a = (14 - month) // 12
    y = year + 4800 - a
    m = month + 12 * a - 3
    jdn = day + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400 - 32045
    frac = (dt.hour - 12) / 24.0 + dt.minute / 1440.0 + dt.second / 86400.0 + dt.microsecond / 86400.0e6
    return float(jdn + frac)


def _tai_utc_before_1972(dt: datetime) -> float:
    jd = utc_to_julian_date(dt)
    t = (jd - J2000_JD) / 36525.0
    return 64.184 + 59.0 * t - 51.2 * t * t - 67.1 * t ** 3 - 16.4 * t ** 4


def tai_utc_offset(dt: datetime) -> float:
    """Return TAI-UTC in seconds for dates covered by the leap-second table."""
    _validate_utc(dt)
    dt = dt.astimezone(timezone.utc)
    if dt < _LEAP_SECONDS[0][0]:
        raise ValueError("TAI-UTC is not defined by the leap-second table before 1972-01-01")
    offset = _LEAP_SECONDS[0][1]
    for effective, value in _LEAP_SECONDS:
        if dt >= effective:
            offset = value
        else:
            break
    return float(offset)


def tt_minus_utc_seconds(dt: datetime) -> float:
    """Return TT-UTC in seconds, using the Mars24 pre-1972 polynomial directly."""
    _validate_utc(dt)
    dt = dt.astimezone(timezone.utc)
    if dt < _LEAP_SECONDS[0][0]:
        # Mars24 A-4: polynomial is already TT-UTC for pre-1972 dates.
        return float(_tai_utc_before_1972(dt))
    return tai_utc_offset(dt) + 32.184


def utc_to_tt_julian_date(dt: datetime) -> float:
    jd_utc = utc_to_julian_date(dt)
    return jd_utc + (tt_minus_utc_seconds(dt) / 86400.0)


def _deg_sin(x_deg: float) -> float:
    return math.sin(math.radians(x_deg))


def _ls_raw(jd_tt: float) -> float:
    """Unnormalized Mars solar longitude in degrees."""
    if not math.isfinite(jd_tt):
        raise ValueError("Julian Date must be finite")
    dt = jd_tt - J2000_JD
    m = 19.3871 + 0.52402073 * dt
    alpha_fms = 270.3871 + 0.524038496 * dt
    pbs = 0.0
    perturbers = [
        (0.0071, 2.2353, 49.409),
        (0.0057, 2.7543, 168.173),
        (0.0039, 1.1177, 191.837),
        (0.0037, 15.7866, 21.736),
        (0.0021, 2.1354, 15.704),
        (0.0020, 2.4694, 95.528),
        (0.0018, 32.8493, 49.095),
    ]
    for ai, tau, phi in perturbers:
        pbs += ai * math.cos(math.radians((0.985626 * dt / tau) + phi))
    nu_minus_m = (
        (10.691 + 3.0e-7 * dt) * _deg_sin(m)
        + 0.623 * _deg_sin(2 * m)
        + 0.050 * _deg_sin(3 * m)
        + 0.005 * _deg_sin(4 * m)
        + 0.0005 * _deg_sin(5 * m)
        + pbs
    )
    return float(alpha_fms + nu_minus_m)


def calculate_mars_ls_from_jd_tt(jd_tt: float) -> float:
    if not math.isfinite(jd_tt):
        raise ValueError("Julian Date must be finite")
    ls = _ls_raw(jd_tt) % 360.0
    if ls < 0:
        ls += 360.0
    return float(ls)


def calculate_mars_ls_from_utc(dt: datetime) -> float:
    jd_tt = utc_to_tt_julian_date(dt)
    return calculate_mars_ls_from_jd_tt(jd_tt)


def rems_timestamp_to_jd_tt(seconds: int) -> float:
    if not isinstance(seconds, int):
        raise TypeError("REMS timestamp must be an integer")
    return J2000_JD + (seconds / 86400.0)


def rems_timestamp_to_ls(seconds: int) -> float:
    jd_tt = rems_timestamp_to_jd_tt(seconds)
    return calculate_mars_ls_from_jd_tt(jd_tt)


def circular_difference_deg(a: float, b: float) -> float:
    diff = abs(a - b) % 360.0
    return min(diff, 360.0 - diff)


def _validate_jd_guess(jd_guess: float) -> float:
    if isinstance(jd_guess, bool) or not isinstance(jd_guess, (int, float)):
        raise TypeError("Julian Date guess must be a real number")
    jd_guess = float(jd_guess)
    if not math.isfinite(jd_guess):
        raise ValueError("Julian Date guess must be finite")
    return jd_guess


def _solve_ls_multiple_crossing(target_multiple: int, jd_guess: float) -> float:
    """Solve _ls_raw(jd) = target_multiple * 360 for the nearby crossing.

    The unnormalized Ls is strictly increasing, so each 360-degree multiple is
    crossed exactly once. The result is validated against the Ls function rather
    than trusted merely because the solver returned a finite number.
    """
    jd_guess = _validate_jd_guess(jd_guess)
    if isinstance(target_multiple, bool) or not isinstance(target_multiple, int):
        raise TypeError("Target Ls multiple must be an integer")
    target_value = target_multiple * 360.0

    def residual(jd: float) -> float:
        return _ls_raw(jd) - target_value

    half_width = 1.0
    lo = hi = flo = fhi = None
    root: Optional[float] = None
    while half_width <= _MAX_BRACKET_HALF_WIDTH_DAYS:
        lo = jd_guess - half_width
        hi = jd_guess + half_width
        flo = residual(lo)
        fhi = residual(hi)
        if flo == 0.0:
            root = lo
            break
        if fhi == 0.0:
            root = hi
            break
        if (flo < 0.0) != (fhi < 0.0):
            break
        half_width *= 2.0
    if root is None and (lo is None or (flo < 0.0) == (fhi < 0.0)):
        raise ValueError(
            f"Unable to bracket the Ls={target_value} crossing within "
            f"{_MAX_BRACKET_HALF_WIDTH_DAYS:g} days of JD {jd_guess:.6f}"
        )

    if root is None:
        converged = False
        for _ in range(_MAX_BISECTION_ITERATIONS):
            mid = 0.5 * (lo + hi)
            fmid = residual(mid)
            if fmid == 0.0:
                root = mid
                converged = True
                break
            if (fmid < 0.0) == (flo < 0.0):
                lo, flo = mid, fmid
            else:
                hi, fhi = mid, fmid
            if hi - lo <= _ROOT_JD_TOLERANCE_DAYS:
                root = 0.5 * (lo + hi)
                converged = True
                break
        if not converged:
            raise ValueError(
                f"Bisection failed to converge for the Ls={target_value} crossing"
            )

    if not math.isfinite(root):
        raise ValueError("Solved crossing is not a finite Julian Date")
    raw_at_root = _ls_raw(root)
    if abs(raw_at_root - target_value) > _LS_ROOT_TOLERANCE_DEG:
        raise ValueError(
            "Solved crossing does not satisfy the unnormalized Ls target "
            f"(residual {raw_at_root - target_value:.3e} deg)"
        )
    normalized = raw_at_root % 360.0
    if min(normalized, 360.0 - normalized) > _LS_ROOT_TOLERANCE_DEG:
        raise ValueError(
            f"Normalized Ls at the solved crossing is {normalized:.6f} deg, not 0 deg"
        )
    if int(round(raw_at_root / 360.0)) != target_multiple:
        raise ValueError(
            "Solved crossing corresponds to a different 360-degree multiple"
        )
    return float(root)


def _find_ls_zero_crossing(jd_guess: float) -> float:
    """Return the JD (TT) of the Ls=0 crossing nearest the supplied instant."""
    jd_guess = _validate_jd_guess(jd_guess)
    target_multiple = int(math.floor(_ls_raw(jd_guess) / 360.0 + 0.5))
    return _solve_ls_multiple_crossing(target_multiple, jd_guess)


@lru_cache(maxsize=1)
def _mars_year_reference() -> Tuple[float, int]:
    """Calculated MY1 boundary and its exact unnormalized Ls multiple.

    The published MY1 date (1955-04-11) is calendar-day precision and is not
    itself an exact equinox instant. The reference used for classification is
    the solved Ls=0 crossing near that date, not the raw Ls at 00:00 UTC.
    """
    epoch_jd = utc_to_tt_julian_date(_MARS_YEAR_1_EPOCH_UTC)
    crossing = _find_ls_zero_crossing(epoch_jd)
    multiple = int(math.floor(_ls_raw(crossing) / 360.0 + 0.5))
    if abs(_ls_raw(crossing) - multiple * 360.0) > _LS_ROOT_TOLERANCE_DEG:
        raise ValueError("MY1 reference is not aligned to an exact Ls=0 multiple")
    return crossing, multiple


@lru_cache(maxsize=1)
def _mars_year_1_epoch_jd_tt() -> float:
    return utc_to_tt_julian_date(_MARS_YEAR_1_EPOCH_UTC)


def _martian_year_from_jd_tt(jd_tt: float) -> int:
    jd_tt = _validate_jd_guess(jd_tt)
    if jd_tt < _mars_year_1_epoch_jd_tt() - _BOUNDARY_JD_TOLERANCE_DAYS:
        raise ValueError(
            "Martian year classification is supported from the published MY1 "
            "date (1955-04-11) onward"
        )
    reference_jd, reference_multiple = _mars_year_reference()
    # The published convention is date-only. Instants earlier on the MY1
    # boundary day are labelled MY1 rather than the out-of-range MY0.
    if jd_tt < reference_jd - _BOUNDARY_JD_TOLERANCE_DAYS:
        return 1

    phase = _ls_raw(jd_tt) - reference_multiple * 360.0
    completed = int(math.floor(phase / 360.0))
    fraction = phase - completed * 360.0

    # Near a boundary, classify against the solved crossing instant instead of
    # relying on floating-point phase alone.
    if fraction < _BOUNDARY_GUARD_DEG or fraction > 360.0 - _BOUNDARY_GUARD_DEG:
        boundary_multiple = reference_multiple + completed
        if fraction > 180.0:
            boundary_multiple += 1
        boundary_jd = _solve_ls_multiple_crossing(boundary_multiple, jd_tt)
        at_or_after = jd_tt >= boundary_jd - _BOUNDARY_JD_TOLERANCE_DAYS
        completed = boundary_multiple - reference_multiple - (0 if at_or_after else 1)

    return int(completed) + 1


def martian_year_clancy(dt_utc: datetime) -> int:
    _validate_utc(dt_utc)
    return _martian_year_from_jd_tt(utc_to_tt_julian_date(dt_utc))


def northern_season_from_ls(ls: float) -> str:
    ls = ls % 360.0
    if ls < 90.0:
        return "Spring"
    if ls < 180.0:
        return "Summer"
    if ls < 270.0:
        return "Autumn"
    return "Winter"


def southern_season_from_ls(ls: float) -> str:
    opposite = {"Spring": "Autumn", "Summer": "Winter", "Autumn": "Spring", "Winter": "Summer"}
    return opposite[northern_season_from_ls(ls)]


def gale_season_from_ls(ls: float) -> str:
    return southern_season_from_ls(ls)


def build_sol100_time_metadata(records: list, sample_indices: Optional[list] = None) -> Dict[str, Any]:
    if sample_indices is None:
        sample_indices = [0, len(records) // 2, len(records) - 1]
    samples = []
    for idx in sample_indices:
        rec = records[idx]
        ts = rec.get("TIMESTAMP")
        if ts is None:
            raise ValueError(f"Record {idx} has no TIMESTAMP")
        ls_rems = rems_timestamp_to_ls(int(ts))
        samples.append({
            "record_index": idx,
            "timestamp_seconds_since_j2000": ts,
            "lmst": rec.get("LMST"),
            "ltst": rec.get("LTST"),
            "ls_degrees": round(ls_rems, 6),
            "ls_northern_season": northern_season_from_ls(ls_rems),
            "ls_southern_season": southern_season_from_ls(ls_rems),
            "gale_season": gale_season_from_ls(ls_rems),
            "time_scale_assumption": "REMS TIMESTAMP interpreted as seconds since J2000.0 in TT",
        })
    ls_values = [s["ls_degrees"] for s in samples]
    return {
        "schema_version": "1.0",
        "sol": 100,
        "source_dataset": "MSL-M-REMS-5-MODRDR-V1.0",
        "calculation_method": "Mars24 / Allison-McEwen (AM2000)",
        "time_scale": "TT (from REMS TIMESTAMP as J2000.0 seconds)",
        "validation_status": "PARTIALLY_VALIDATED",
        "validation_statuses": {
            "orbital_algorithm": "VALIDATED_AGAINST_MARS24_REFERENCES",
            "utc_to_tt_conversion": "VALIDATED_FOR_SUPPORTED_DATE_RANGE",
            "rems_source_timestamp": "ASSUMED_TIME_SCALE",
        },
        "ls_range_degrees": [min(ls_values), max(ls_values)],
        "samples": samples,
        "limitations": [
            "REMS TIMESTAMP is synced with SCLK with a maximum deviation of 30 s.",
            "TIMESTAMP-derived JD differs from label START_TIME UTC by about 3.5 minutes; both are reported.",
            "Ls changes by roughly 0.5 deg over one sol.",
            "Martian Year uses the Clancy convention and is reported separately when verified.",
            "REMS source timestamp scale is not independently verified; Ls from TIMESTAMP is provisional.",
        ],
    }
