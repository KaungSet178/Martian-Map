# Gale Weather W1.2B — Martian Solar Longitude and Time Conversion Validation

**Branch:** `feat/gale-weather-data`  
**Milestone:** W1.2B — Martian Solar Longitude and Time Conversion Validation  
**Date:** 2026-11-14  

## 1. Purpose and scope

This milestone adds independently validated Martian solar longitude (Ls) calculations and time-scale handling for historical Curiosity REMS observations. It does not modify original REMS measurements, implement UI, aggregation, forecasting, or route scheduling.

## 2. Official scientific references

- NASA Mars24 algorithm and worked examples: https://www.giss.nasa.gov/tools/mars24/help/algorithm.html
- NASA Mars24 technical notes: https://www.giss.nasa.gov/tools/mars24/help/notes.html
- Allison, M. 1997. Geophys. Res. Lett., 24, 1967-1970.
- Allison, M. and McEwen, M. 2000. Planet. Space Sci., 48, 215-235.
- REMS RDR SIS: https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/document/REMS_RDR_SIS.TXT
- REMS MODRDR DS: https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/document/REMS_MODRDR_DS.CAT
- REMS official page (Curiosity Sol 1, Ls 151.0): https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/curiosity/rems.html

## 3. Selected Ls algorithm

Mars24 / Allison-McEwen (AM2000) equations B-1 through B-5:

- M = 19.3871 + 0.52402073 * ΔtJ2000
- α_FMS = 270.3871 + 0.524038496 * ΔtJ2000
- PBS = Σ A_i cos((0.985626 * ΔtJ2000 / τ_i) + φ_i)
- ν - M = (10.691 + 3.0e-7 * ΔtJ2000) sin M + 0.623 sin 2M + 0.050 sin 3M + 0.005 sin 4M + 0.0005 sin 5M + PBS
- Ls = α_FMS + (ν - M), normalized to [0, 360)

Coefficients are taken directly from the Mars24 algorithm page.

## 4. Time-scale conventions

- UTC is converted to Julian Date (UT), then to Terrestrial Time (TT) using a documented leap-second table.
- TT-UTC = TAI-UTC + 32.184 s.
- For dates before 1972-01-01, the Mars24 polynomial is used.
- REMS TIMESTAMP is described as seconds since noon 1-Jan-2000 and is synced with SCLK (max deviation 30 s).
- In this implementation, REMS TIMESTAMP is interpreted as seconds since J2000.0 in TT for Ls calculation. This assumption is documented in the metadata.
- The PDS4 label START_TIME (UTC) is used as an independent cross-check.

## 5. REMS timestamp interpretation

- TIMESTAMP is not Unix time.
- The derived JD from TIMESTAMP is about 3.5 minutes earlier than the label START_TIME UTC. This difference is reported, not hidden.
- Ls values derived from TIMESTAMP and from label START_TIME UTC agree within 0.002°.

## 6. UTC-to-TT conversion

- Leap-second table from 1972 through 2017 is hard-coded from authoritative IERS/USNO values.
- No leap seconds after 2017 as of the Mars24 documentation (winter 2025).
- Pre-1972 dates use the Mars24 polynomial.

## 7. Leap-second handling

- TAI-UTC offsets are applied based on the effective leap-second date.
- TT-UTC = TAI-UTC + 32.184 s.
- Timezone-naive datetimes are rejected.

## 8. Mars solar longitude calculation

Implemented in `team/gale/weather/mars_time.py`:

- `utc_to_julian_date()`
- `utc_to_tt_julian_date()`
- `calculate_mars_ls_from_jd_tt()`
- `calculate_mars_ls_from_utc()`
- `rems_timestamp_to_ls()`
- `circular_difference_deg()`
- `northern_season_from_ls()`, `southern_season_from_ls()`, `gale_season_from_ls()`
- `martian_year_clancy()`

## 9. Independent numerical validation

Reference cases:

1. Mars24 worked example 1: 2000-01-06 00:00 UTC -> Ls 277.18758°
   - Calculated: 277.187589°
   - Difference: 0.000009°
2. Mars24 worked example 2 (Spirit landing): 2004-01-03 13:46:31 UTC -> Ls 327.32416°
   - Calculated: 327.324162°
   - Difference: 0.000002°
3. Curiosity landing published value: 2012-08-07 -> Ls 151.0°
   - Calculated at 12:00 UTC: 151.3603°
   - Difference: 0.3603° (published value is rounded to one decimal)
4. Sol 100 independent UTC cross-check: label START_TIME 2012-11-16T07:48:43.598Z
   - Ls: 207.898346°
   - TIMESTAMP-derived Ls: 207.896385°
   - Difference: 0.001961°

Maximum observed validation discrepancy: 0.3603° against a rounded published value; 0.001961° between independent calculation paths.

## 10. Accepted tolerances and rationale

- Mars24 worked examples: 0.001° (method precision)
- Published rounded Ls (Curiosity landing): 0.5° (published to one decimal)
- Cross-check between TIMESTAMP and UTC paths: 0.002° (observed difference)

## 11. Martian-year convention

- Clancy convention: MY1 begins at Ls=0 on 1955-04-11.
- Validated: Curiosity landing (2012-08-07) yields MY 31, matching the official REMS page.
- Sol 100 yields MY 31.
- The epoch Ls at 1955-04-11 00:00 UTC is 359.77°, within 0.23° of 0°.

## 12. Sol 100 derived metadata

File: `team/gale/weather/data/rems_sol_00100_time_metadata.json`

- Ls range: 207.896° to 208.496°
- Northern season: Autumn
- Southern season: Spring
- Gale season: Spring
- Martian Year: 31
- Samples: first, middle, and final observation records

## 13. Northern and southern season labeling

Northern seasons:

- 0° to < 90°: Spring
- 90° to < 180°: Summer
- 180° to < 270°: Autumn
- 270° to < 360°: Winter

Southern seasons are opposite. Gale Crater is in the southern hemisphere, so its season is the southern label.

## 14. Remaining scientific uncertainties

- REMS TIMESTAMP time scale is not explicitly documented beyond SCLK sync; treated as J2000.0 TT seconds.
- The ~3.5-minute offset between TIMESTAMP-derived JD and label START_TIME UTC is not fully explained.
- Ls changes by roughly 0.5° over one sol.
- No per-record UTC is available; Ls is derived from TIMESTAMP.

## 15. Automated test results

- `tests.test_gale_mars_time`: 27 tests, all passed
- `tests.test_gale_weather_parser`: 45 tests, all passed
- Broader Gale discovery: 64 tests passed

## 16. Files changed

- `team/gale/weather/mars_time.py`
- `tests/test_gale_mars_time.py`
- `scripts/gale-weather/prepare_time_metadata.py`
- `team/gale/weather/data/rems_sol_00100_time_metadata.json`
- `team/gale/weather/README.md`
- `docs/GALE_WEATHER_W1_2B_TIME_VALIDATION_REPORT.md`

## 17. Reproduction instructions

```sh
python scripts/gale-weather/prepare_sol.py --no-download
python scripts/gale-weather/prepare_time_metadata.py
python -B -m unittest tests.test_gale_mars_time -v
python -B -m unittest tests.test_gale_weather_parser -v
```

## 18. Commit and branch status

- Branch: `feat/gale-weather-data`
- Previous commit: `aab3bbf`
- Code commit: 06063b9 (feat: add validated Mars solar longitude and time conversion)
- Remote push status: pushed successfully to origin/feat/gale-weather-data
PY