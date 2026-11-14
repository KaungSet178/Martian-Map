# Gale Weather W1.2A-H — Parser Hardening Report

**Branch:** `feat/gale-weather-data`  
**Milestone:** W1.2A-H — Harden REMS parser, verify PDS4 source identity, rerun scientific validation  
**Date:** 2026-11-14  

## 1. Original W1.2A baseline

- Commit: `210f3c2`
- Records: 35,344
- Fields: 40
- Output: `team/gale/weather/data/rems_sol_00100.json` (9,536,942 bytes)
- Dedicated tests: 31 passed
- Source hashes:
  - Data `.TAB`: `be0ecfea58f2957502bc8f2723b52dc4c2e0e38600bfb2f67f7c1fa6e9c216b9`
  - Label `.xml`: `92af8c645bd513b20dcbc79f2667388b273dd9d9bcbd4ee7c29f07745c0952ce`

## 2. Exact source URLs and hashes

- Data:
  `https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/data_calibrated/SOL_00090_00179/SOL00100/RME_406323911RMD01000000000_______P9.TAB`
- Label:
  `https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/data_calibrated/SOL_00090_00179/SOL00100/RME_406323911RMD01000000000_______P9.xml`
- Verified data SHA-256: `be0ecfea58f2957502bc8f2723b52dc4c2e0e38600bfb2f67f7c1fa6e9c216b9`
- Verified label SHA-256: `92af8c645bd513b20dcbc79f2667388b273dd9d9bcbd4ee7c29f07745c0952ce`

The source archive did not change between W1.2A and W1.2A-H.

## 3. Source identity investigation

The PDS4 logical identifier is:

`urn:nasa:pds:msl_rems:data_calibrated:rme_406323911rmd01000000000_______p9`

The data filename is:

`RME_406323911RMD01000000000_______P9.TAB`

### Explanation of `_pa` versus `_P9`

The apparent discrepancy is an official PDS naming convention, not an error:

- The filename retains the uppercase PDS3 product-version suffix (`...P9`).
- The PDS4 logical identifier lowercases that suffix (`...p9`).
- The authoritative cross-reference is the label's `file_name` element, which exactly matches the supplied `.TAB` file.

The parser now verifies the logical identifier, product version, declared filename, supplied filename, MODRDR identity, and the lowercased version suffix instead of requiring an exact character-for-character match.

## 4. Record-length interpretation

- Label-declared `record_bytes`: 372
- Actual content bytes per record: 370
- Line terminator: CRLF (2 bytes)
- Field bytes: 370 content = 372 declared record bytes minus 2 terminator bytes
- Last field ends at byte 369 (1-based), leaving one trailing space before CRLF

The parser now validates CRLF terminators and exact content length against the label.

## 5. Blank-line behavior

Blank records are no longer silently discarded. A blank line raises a `ValueError` identifying the affected record number.

## 6. Short/oversized record handling

The hardened parser rejects:

- Truncated records
- Oversized records
- Empty records
- Missing records
- Extra records
- Incorrect record length
- Field boundaries that exceed the record
- LF-only files (because the product uses CRLF)
- Invalid numeric values and non-finite values

All errors identify the affected record number or field.

## 7. Parser changes

Modified:

- `team/gale/weather/rems_parser.py`
  - Byte-oriented record splitting
  - Strict CRLF handling
  - Exact record-byte validation
  - Field-boundary validation
  - `validate_source_identity()`
  - Improved time validation
- `tests/test_gale_weather_parser.py`
  - Added source-identity tests
  - Added hardening negative tests

## 8. New test coverage

Added tests for:

- Valid official Sol 100 label/data pairing
- Incorrect data filename
- Incorrect logical identifier
- Incorrect product version
- Valid official naming difference (`_p9` vs `_P9`)
- Truncated record
- Oversized record
- Blank record
- Missing record
- Extra record
- Incorrect record length
- Field boundary exceeding record
- Wrong delimiter/quoting
- Correct CRLF handling

## 9. Original-versus-regenerated output comparison

Regenerated with:

```sh
python scripts/gale-weather/prepare_sol.py --no-download
```

Results:

- Records: 35,344 (unchanged)
- Fields: 40 (unchanged)
- Output size: 9,536,942 bytes (unchanged)
- Data hash: unchanged
- Label hash: unchanged
- `git diff` showed no change to `rems_sol_00100.json`

Scientific measurement values, missing-value interpretation, confidence flags, LMST, and LTST remain unchanged.

## 10. Scientific data preservation verification

- No rows dropped.
- No fabricated values.
- No numeric conversion changes.
- No lossy rounding.
- No confidence-flag reinterpretation.

## 11. Python environment details

- Python: 3.12.10
- pyproj: 3.8.0
- rasterio: 1.5.2
- numpy: 2.4.6
- Installed from:
  - `team/gale/requirements-g3.txt`
  - `team/gale/requirements-registration.txt`

Environment setup:

```sh
python -m pip install pyproj==3.8.0
python -m pip install rasterio==1.5.2
```

## 12. Full test results

- `tests.test_gale_weather_parser`: 45 tests, all passed
- `unittest discover -s tests -p "test_gale_*.py"`: 64 tests, all passed after creating the expected `output/` directory for a pre-existing basemap test
- Weather-specific tests: 45 passed

## 13. Frontend checks

No frontend files were changed in W1.2A-H. The Next.js typecheck, lint, and build were previously run successfully in the baseline repository before this milestone. In this worktree, `npm ci` did not complete within the time limit, so frontend checks were not rerun here. This is an environment limitation, not a code failure.

## 14. Files changed

- `team/gale/weather/rems_parser.py`
- `tests/test_gale_weather_parser.py`
- `docs/GALE_WEATHER_W1_2A_HARDENING_REPORT.md`

## 15. Remaining scientific limitations

- REMS observations are point measurements at Curiosity's location.
- Data are historical, not predictive.
- No safe EVA windows or spacesuit safety determinations are made.
- Wind data remain largely missing for this sol.
- Vertical wind is unavailable.
- UV is missing for about 23% of rows.
- Volume mixing ratio uncertainty is missing for all rows in this sol.
- Sampling is noncontinuous.
- Ls derivation remains for W1.2B.

## 16. Recommendation for W1.2B

Proceed to implement and validate Martian solar longitude (Ls) derivation using the Mars24/Allison-McEwen method, with full provenance and no seasonal aggregation yet.

## 17. Git delivery

- Branch: `feat/gale-weather-data`
- Previous commit: `210f3c2`
- Hardening code commit: ce7ed07 (fix: harden REMS parser and PDS4 source identity validation)
- Remote push status: pushed successfully to origin/feat/gale-weather-data
PY