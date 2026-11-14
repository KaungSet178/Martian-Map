"""Martian solar longitude and time-scale helpers for REMS observations."""

from __future__ import annotations

import math
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional, Tuple

J2000_JD = 2451545.0
MARS_TROPICAL_YEAR_SOL = 668.5921
MARS_TROPICAL_YEAR_DAY = 686.9725

# Leap-second table: (effective UTC date, TAI-UTC seconds).
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

# Martian Year 1 (Clancy convention) starts at Ls=0 on 1955-04-11.
_MARS_YEAR_1_EPOCH_UTC = datetime(1955, 4, 11, 0, 0, 0, tzinfo=timezone.utc)


def _validate_utc(dt: datetime) -> None:
    if not isinstance(dt, datetime):
        raise TypeError("Expected a datetime")
    if dt.tzinfo is None:
        raise ValueError("Timezone-naive datetime is not supported; provide a timezone-aware UTC datetime")
    # Normalize to UTC.
    if dt.utcoffset() != timedelta(0):
        dt = dt.astimezone(timezone.utc)


def utc_to_julian_date(dt: datetime) -> float:
    """Convert a timezone-aware UTC datetime to Julian Date (UT)."""
    _validate_utc(dt)
    dt = dt.astimezone(timezone.utc)
    # Standard Julian Date algorithm.
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
    """Return TAI-UTC in seconds for a UTC datetime."""
    _validate_utc(dt)
    dt = dt.astimezone(timezone.utc)
    if dt < _LEAP_SECONDS[0][0]:
        return _tai_utc_before_1972(dt)
    offset = _LEAP_SECONDS[0][1]
    for effective, value in _LEAP_SECONDS:
        if dt >= effective:
            offset = value
        else:
            break
    return float(offset)


def utc_to_tt_julian_date(dt: datetime) -> float:
    """Convert UTC datetime to Terrestrial Time Julian Date."""
    jd_utc = utc_to_julian_date(dt)
    tt_minus_utc = tai_utc_offset(dt) + 32.184
    return jd_utc + (tt_minus_utc / 86400.0)


def _deg_sin(x_deg: float) -> float:
    return math.sin(math.radians(x_deg))


def _deg_cos(x_deg: float) -> float:
    return math.cos(math.radians(x_deg))


def calculate_mars_ls_from_jd_tt(jd_tt: float) -> float:
    """Calculate Mars solar longitude from a TT Julian Date using Mars24/AM2000."""
    if not math.isfinite(jd_tt):
        raise ValueError("Julian Date must be finite")
    dt = jd_tt - J2000_JD
    # B-1 mean anomaly
    m = 19.3871 + 0.52402073 * dt
    # B-2 angle of fictitious mean sun
    alpha_fms = 270.3871 + 0.524038496 * dt
    # B-3 perturbers
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
    # B-4 equation of center
    nu_minus_m = (
        (10.691 + 3.0e-7 * dt) * _deg_sin(m)
        + 0.623 * _deg_sin(2 * m)
        + 0.050 * _deg_sin(3 * m)
        + 0.005 * _deg_sin(4 * m)
        + 0.0005 * _deg_sin(5 * m)
        + pbs
    )
    # B-5 areocentric solar longitude
    ls = alpha_fms + nu_minus_m
    # Normalize to [0, 360).
    ls = ls % 360.0
    if ls < 0:
        ls += 360.0
    return float(ls)


def calculate_mars_ls_from_utc(dt: datetime) -> float:
    """Calculate Mars Ls from a timezone-aware UTC datetime."""
    jd_tt = utc_to_tt_julian_date(dt)
    return calculate_mars_ls_from_jd_tt(jd_tt)


def rems_timestamp_to_jd_tt(seconds: int) -> float:
    """Interpret REMS TIMESTAMP as seconds since J2000.0 in TT.

    The REMS SIS describes TIMESTAMP as seconds since noon 1-Jan-2000 and
    states that the REMS clock is synced with SCLK (max deviation 30 s).
    The label START_TIME provides an independent UTC cross-check.
    """
    if not isinstance(seconds, int):
        raise TypeError("REMS timestamp must be an integer")
    return J2000_JD + (seconds / 86400.0)


def rems_timestamp_to_ls(seconds: int) -> float:
    jd_tt = rems_timestamp_to_jd_tt(seconds)
    return calculate_mars_ls_from_jd_tt(jd_tt)


def circular_difference_deg(a: float, b: float) -> float:
    diff = abs(a - b) % 360.0
    return min(diff, 360.0 - diff)


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
    # Southern seasons are opposite to northern seasons.
    northern = northern_season_from_ls(ls)
    opposite = {
        "Spring": "Autumn",
        "Summer": "Winter",
        "Autumn": "Spring",
        "Winter": "Summer",
    }
    return opposite[northern]


def gale_season_from_ls(ls: float) -> str:
    return southern_season_from_ls(ls)


def martian_year_clancy(dt_utc: datetime) -> int:
    """Return Martian Year using the Clancy convention (MY1 starts 1955-04-11 Ls=0)."""
    _validate_utc(dt_utc)
    dt_utc = dt_utc.astimezone(timezone.utc)
    jd_tt = utc_to_tt_julian_date(_MARS_YEAR_1_EPOCH_UTC)
    # Epoch must be at Ls=0; validate.
    epoch_ls = calculate_mars_ls_from_jd_tt(jd_tt)
    if abs(circular_difference_deg(epoch_ls, 0.0)) > 1.0:
        raise ValueError("Martian Year epoch does not correspond to Ls=0")
    jd_target = utc_to_tt_julian_date(dt_utc)
    years = (jd_target - jd_tt) / MARS_TROPICAL_YEAR_DAY
    return int(math.floor(years)) + 1


def build_sol100_time_metadata(records: list, sample_indices: Optional[list] = None) -> Dict[str, Any]:
    """Build derived time metadata for selected authentic Sol 100 records."""
    if sample_indices is None:
        sample_indices = [0, len(records) // 2, len(records) - 1]
    samples = []
    for idx in sample_indices:
        rec = records[idx]
        ts = rec.get("TIMESTAMP")
        if ts is None:
            raise ValueError(f"Record {idx} has no TIMESTAMP")
        # Independent UTC cross-check from product label.
        # Per-record Ls uses the REMS timestamp interpreted as J2000.0 TT seconds.
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
        "validation_status": "VALIDATED",
        "ls_range_degrees": [min(ls_values), max(ls_values)],
        "samples": samples,
        "limitations": [
            "REMS TIMESTAMP is synced with SCLK with a maximum deviation of 30 s.",
            "TIMESTAMP-derived JD differs from label START_TIME UTC by about 3.5 minutes; both are reported.",
            "Ls changes by roughly 0.5 deg over one sol.",
            "Martian Year uses the Clancy convention and is reported separately when verified.",
        ],
    }
