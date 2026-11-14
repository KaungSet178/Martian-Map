# Gale Weather W1.2A — REMS Parser and Scientific Validation

**Branch:** `feat/gale-weather-data`  
**Milestone:** W1.2A — Parse and validate one complete Curiosity REMS sol  
**Date:** 2026-11-14  

## 1. Exact NASA source URLs

- Bundle: `urn:nasa:pds:msl_rems`, DOI `10.17189/vwva-ms24`
- MODRDR data product:
  `https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/data_calibrated/SOL_00090_00179/SOL00100/RME_406323911RMD01000000000_______P9.TAB`
- PDS4 label:
  `https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/data_calibrated/SOL_00090_00179/SOL00100/RME_406323911RMD01000000000_______P9.xml`

## 2. Selected product identifiers

- Region: Gale Crater
- Mission: MSL Curiosity
- Instrument: REMS
- Product level: MODRDR
- Data set ID: `MSL-M-REMS-5-MODRDR-V1.0`
- Sol: 100
- Data file: `RME_406323911RMD01000000000_______P9.TAB`
- Label file: `RME_406323911RMD01000000000_______P9.xml`

## 3. PDS4 label interpretation

The PDS4 XML label is the authoritative schema. The parser extracts:

- Logical identifier: `urn:nasa:pds:msl_rems:data_calibrated:rme_406323911rmd01000000000_______pa`
- Product version: `1.0`
- Declared data file: `RME_406323911RMD01000000000_______P9.TAB`
- Record count: 35344
- Record bytes: 372
- Field count: 40
- Field names, numbers, data types, units, byte locations/lengths, and missing-value constants

Fixed-width byte slicing is used according to `field_location` and `field_length` from the label, rather than naive CSV splitting.

## 4. Field schema and units

All 40 MODRDR fields are preserved in verified order. Units include `SECOND`, `KELVIN`, `METERS/SECOND`, `DEGREE`, `W/m**2`, `%`, `ppm`, and `PASCAL`. String fields (LMST, LTST, confidence flags, pressure configuration) have no unit.

## 5. Parser architecture

Files:

- `team/gale/weather/rems_schema.py` — PDS4 label parsing, field metadata, SHA-256
- `team/gale/weather/rems_parser.py` — record parsing, validation, quality summary, JSON output
- `scripts/gale-weather/prepare_sol.py` — reproducible download and generation CLI
- `team/gale/weather/README.md` — usage
- `tests/test_gale_weather_parser.py` — automated tests

Key functions:

- `parse_label()` — parse PDS4 XML
- `validate_field_contract()` — enforce the verified 40-field contract
- `_slice_record()` — fixed-width extraction using label byte positions
- `parse_records()` — parse all rows, enforce count, validate time metadata
- `validate_time_records()` — timestamp monotonicity, LMST/LTST format and sol consistency
- `quality_summary()` — missing-value and confidence-pattern statistics
- `build_output()` — compact JSON structure with field definitions and row arrays

## 6. Missing-value handling

- Documented numeric sentinels (`-999`, `-999.00`, etc.) are converted to JSON `null`.
- Numeric fields are parsed only when the label specifies a numeric data type.
- Negative valid measurements are preserved.
- Non-numeric text and non-finite values in numeric fields are rejected.
- String fields preserve confidence flags and configuration strings; documented missing string sentinels become `null`.

## 7. Confidence-flag handling

Confidence flags remain strings and are not converted to numbers. Raw patterns are preserved and summarized. No broad quality-rejection rules are applied in W1.2A; full instrument-quality filtering belongs to a later phase.

## 8. Time-validation logic

- `TIMESTAMP` is treated as seconds since noon 1-Jan-2000, not Unix time.
- Monotonicity is checked.
- `LMST` format is validated as `SSSSSMHH:MM:SS.sss`.
- `LTST` format is validated as `SSSSS HH:MM:SS.sss` (fractional seconds optional).
- Sol numbers in LMST and LTST must equal 100 and agree with each other.
- Malformed time metadata is reported with row numbers; the parser does not silently correct it.
- LMST and LTST are not treated as interchangeable.

## 9. Sol 100 results

- Records parsed: 35344
- Fields per record: 40
- LMST range: `00100M00:00:00.192` to `00100M23:05:48.143`
- LTST range: `00100 00:37:07` to `00100 23:42:44`

Missing-value counts (of 35344 rows):

- `TIMESTAMP`: 0 (0.0%)
- `HORIZONTAL_WIND_SPEED`: 35308 (99.898%)
- `VERTICAL_WIND_SPEED`: 35344 (100.0%)
- `WIND_DIRECTION`: 35256 (99.751%)
- `BRIGHTNESS_TEMP`: 1680 (4.753%)
- `BOOM1_LOCAL_AIR_TEMP`: 300 (0.849%)
- `BOOM2_LOCAL_AIR_TEMP`: 300 (0.849%)
- `AMBIENT_TEMP`: 300 (0.849%)
- `UV_A`–`UV_E`: 8128 (22.997%)
- `LOCAL_RELATIVE_HUMIDITY`: 340 (0.962%)
- `HS_TEMP`: 340 (0.962%)
- `VOLUME_MIXING_RATIO`: 340 (0.962%)
- `VOLUME_MIXING_RATIO_UNCERTAINTY`: 35344 (100.0%)
- `PRESSURE`: 300 (0.849%)
- `PRESSURE_UNCERTAINTY`: 300 (0.849%)

These statistics reflect instrument limitations and noncontinuous sampling. They are not forecasts or safety determinations.

## 10. Generated output

- File: `team/gale/weather/data/rems_sol_00100.json`
- Size: 9,536,942 bytes
- Rows: 35344
- Row representation: arrays in verified field order
- Field definitions stored once in `fields` and `field_order`

## 11. File hashes

- Data `.TAB` SHA-256: `be0ecfea58f2957502bc8f2723b52dc4c2e0e38600bfb2f67f7c1fa6e9c216b9`
- Label `.xml` SHA-256: `92af8c645bd513b20dcbc79f2667388b273dd9d9bcbd4ee7c29f07745c0952ce`

Raw `.TAB` and `.xml` files are downloaded locally and are not committed.

## 12. Reproduction instructions

From the repository root:

```sh
python scripts/gale-weather/prepare_sol.py
```

To use existing local files:

```sh
python scripts/gale-weather/prepare_sol.py --no-download
```

Tests:

```sh
python -B -m unittest tests.test_gale_weather_parser -v
```

## 13. Test results

- `tests/test_gale_weather_parser.py`: 31 tests, all passed.
- `unittest discover -s tests -p "test_gale_*.py"`: weather tests passed; two pre-existing errors occurred in `test_gale_basemap.py` and `test_gale_registration.py` due to missing `pyproj`, unrelated to W1.2A.

## 14. Known scientific limitations

- REMS observations are point measurements at Curiosity's location and do not apply uniformly to all Lower Mount Sharp waypoints.
- The data are historical observations, not forecasts.
- No safe EVA windows or spacesuit safety determinations are made.
- Wind data are preliminary and largely missing for this sol.
- Vertical wind is unavailable.
- UV is missing for about 23% of rows.
- Volume mixing ratio uncertainty is missing for all rows in this sol.
- Sampling is noncontinuous.

## 15. Next steps for W1.2B

- Implement a validated Ls derivation using the Mars24/Allison–McEwen method.
- Select a seasonal subset of sols distributed by Ls.
- Add compact seasonal/climatological aggregation without interpolating missing values.
- Continue preserving provenance and confidence flags.
PY