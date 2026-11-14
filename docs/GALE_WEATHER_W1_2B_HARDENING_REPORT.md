# Gale Weather W1.2B-H — Martian Time and Seasonal Metadata Hardening Report

**Branch:** `feat/gale-weather-data`  
**Milestone:** W1.2B-H — Correct and independently validate Martian time conversions, Martian-year boundaries, and REMS timestamp interpretation  
**Date:** 2026-11-14  

## 1. Original W1.2B implementation

- Code commit: `06063b9`
- Implemented Mars24/Allison-McEwen Ls algorithm.
- Independent Mars24 worked examples passed.
- Sol 100 metadata reported Ls 207.896°–208.496°, northern Autumn, southern Spring, MY 31.
- Validation status was originally reported as `VALIDATED`, which overstated source-time certainty.

## 2. Scientific problems identified

1. Pre-1972 TT-UTC helper could double-count 32.184 seconds.
2. Martian-year calculation used a fixed day-count floor rather than Ls=0 boundaries.
3. REMS TIMESTAMP time scale was not independently verified.
4. Metadata validation status did not distinguish orbital validation from source-time uncertainty.

## 3. Corrected pre-1972 TT-UTC behavior

- Added `tt_minus_utc_seconds()`.
- For dates before 1972-01-01, the Mars24 polynomial is used directly as TT-UTC.
- No additional 32.184 seconds are added.
- For dates on or after 1972-01-01, TT-UTC = TAI-UTC + 32.184.
- `tai_utc_offset()` now raises for pre-1972 dates because TAI-UTC is not table-defined there.

## 4. Exact Mars24 references

- Algorithm: https://www.giss.nasa.gov/tools/mars24/help/algorithm.html
- Technical notes: https://www.giss.nasa.gov/tools/mars24/help/notes.html
- Equations A-4, A-5, A-6, B-1 through B-5.
- Pre-1972 polynomial: TT-UTC = 64.184 + 59T - 51.2T² - 67.1T³ - 16.4T⁴.

## 5. Martian-year boundary algorithm

- Martian years are counted by Ls=0 crossings, not by a fixed 686.9725-day interval.
- `_ls_raw()` provides unnormalized Ls.
- `martian_year_clancy()` computes `floor((raw_ls - raw_epoch) / 360) + 1`, where the epoch is 1955-04-11.
- `_find_ls_zero_crossing()` provides deterministic bracketed root-finding for boundary tests.

## 6. Root-finding and numerical tolerances

- Bisection with a 5-day initial bracket, expanding up to 320 days if needed.
- 100 iterations.
- Ls differences use circular angular distance.
- Published Mars24 examples validated to 0.001°.

## 7. Published Martian-year comparison cases

- MY1: 1955-04-11 → calculated MY 1
- MY31: 2012-08-07 → calculated MY 31
- Sol 100: 2012-11-16 → calculated MY 31
- MY1 epoch Ls at 1955-04-11 00:00 UTC: 359.77° (within 0.23° of 0°)

## 8. REMS timestamp interpretation investigation

- The REMS SIS describes TIMESTAMP as seconds since noon 1-Jan-2000, synced with SCLK with a maximum deviation of 30 s.
- The label START_TIME for Sol 100 is 2012-11-16T07:48:43.598Z.
- The TIMESTAMP-derived Julian Date is about 3.5 minutes earlier than the label START_TIME UTC.
- No authoritative explanation was found for this offset.
- The offset was not corrected or removed.
- REMS source timestamp status is reported as `ASSUMED_TIME_SCALE`.

## 9. Whether the 3.5-minute discrepancy was resolved

No. The discrepancy remains unresolved and is documented. Ls values derived from TIMESTAMP and from label START_TIME UTC agree within 0.002°, so the seasonal result is not materially affected, but the source-time interpretation is not verified.

## 10. Sol 100 Ls and MY results

- Ls range: 207.896° to 208.496°
- Northern season: Autumn
- Southern/Gale season: Spring
- Martian Year: 31
- Validation status: `PARTIALLY_VALIDATED`

## 11. Metadata validation statuses

- Orbital algorithm: `VALIDATED_AGAINST_MARS24_REFERENCES`
- UTC-to-TT conversion: `VALIDATED_FOR_SUPPORTED_DATE_RANGE`
- REMS source timestamp: `ASSUMED_TIME_SCALE`

## 12. Automated tests

- `tests.test_gale_mars_time`: 44 tests, all passed
- `tests.test_gale_weather_parser`: 45 tests, all passed
- Broader Gale discovery: 108 tests, all passed
- Mars24 worked examples: unchanged and passing

## 13. Files changed

- `team/gale/weather/mars_time.py`
- `tests/test_gale_mars_time.py`
- `team/gale/weather/data/rems_sol_00100_time_metadata.json`
- `team/gale/weather/README.md`
- `docs/GALE_WEATHER_W1_2B_HARDENING_REPORT.md`

## 14. Reproduction instructions

```sh
python scripts/gale-weather/prepare_sol.py --no-download
python scripts/gale-weather/prepare_time_metadata.py
python -B -m unittest tests.test_gale_mars_time -v
python -B -m unittest tests.test_gale_weather_parser -v
python -B -m unittest discover -s tests -p "test_gale_*.py" -v
```

## 15. Commit SHA and remote push status

- Branch: `feat/gale-weather-data`
- Previous commit: `b7019eb`
- Code commit: 40abdac (fix: harden Martian time conversion and year boundaries)
- Remote push status: pushed successfully to origin/feat/gale-weather-data

## 16. Recommendation for W1.2C

Proceed to multi-sol historical weather processing only after acknowledging that REMS source timestamps are assumed, not verified. Use Ls and seasonal labels as derived metadata, not as exact observation-time proof.
PY