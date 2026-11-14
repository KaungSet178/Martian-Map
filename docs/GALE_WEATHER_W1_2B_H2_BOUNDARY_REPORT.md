# Gale Weather W1.2B-H2 — Martian-Year Boundary Correction Report

**Branch:** `feat/gale-weather-data`  
**Milestone:** W1.2B-H2 — Correct Martian-year classification to calculated Ls = 0° crossings and independently verify boundary behavior  
**Date:** 2026-11-14  
**Starting commit:** `ceb3a34a70804d2cccf57566eeab39d801d4e472` (verified present locally and at `origin/feat/gale-weather-data`)  
**Scientific code commit:** `5d182eef4cd62c7959befa0cd56d1a6338065fa1`

## 1. Scope

This milestone changed only the Martian-year boundary logic and its tests. The validated
Mars24/Allison–McEwen Ls calculation, UTC↔TT conversion, leap-second handling, REMS
parsing, observation records, and frontend were not modified. W1.2C and later work were
not started.

## 2. Scientific issue identified

The superseded `martian_year_clancy()` computed:

```python
raw_epoch = _ls_raw(utc_to_tt_julian_date(datetime(1955, 4, 11, tzinfo=utc)))
raw_ls = _ls_raw(jd)
return floor((raw_ls - raw_epoch) / 360.0) + 1
```

The published MY1 date is calendar-day precision. At 1955-04-11 00:00 UTC the calculated
unnormalized Ls is `-8280.228019°` (normalized `359.771981°`), i.e. `0.228019°` before the
true 360° multiple (`-8280°`). Using that raw value as the phase reference moved every
subsequent year transition **~0.23° early — about 11 hours**.

Measured for MY2: the superseded threshold occurred at `1957-02-25 22:48:47.857 UTC`,
**10.97 hours before** the calculated crossing at `1957-02-26 09:46:54.985 UTC`.

## 3. Corrected MY1 boundary reference

The reference is now the **calculated** Ls = 0° crossing near the published MY1 date:

| Quantity | Value |
| --- | --- |
| Reference crossing (UTC) | **1955-04-11 10:58:15.617 UTC** |
| Reference crossing JD (TT) | 2435208.9575060 |
| Exact unnormalized Ls multiple | −23 (i.e. −8280°) |
| Published MY1 date (Clancy et al. 2000) | 1955-04-11 (day precision) |

The published date and the calculated instant agree to the calendar day. The report does
not claim that the published date establishes a sub-day crossing time.

## 4. Ls root-finding implementation

`_find_ls_zero_crossing()` now delegates to `_solve_ls_multiple_crossing()`:

1. Select the integer 360° multiple nearest the guess from the **unnormalized** Ls
   (`_ls_raw`), avoiding the 360°→0° wrap discontinuity.
2. Expand a symmetric bracket (1 day doubling to a 512-day half-width cap) until the
   residual `_ls_raw(jd) − multiple·360` changes sign.
3. Solve with deterministic bisection (maximum 200 iterations).
4. Validate the result:
   - finite Julian Date;
   - bracket contained a sign change;
   - `|residual| ≤ 1e-6°` against the target multiple;
   - normalized Ls within `1e-6°` of 0°/360°;
   - `round(raw/360)` equals the intended multiple.
5. Raise a controlled `ValueError` if bracketing or convergence fails.

The solver is deterministic; repeated calls and nearby guesses return the same root within
the convergence tolerance.

## 5. Root convergence tolerance

- Julian Date interval tolerance: **`1e-9` day (~86 µs)**.
- Maximum bisection iterations: **200**.
- Post-solve Ls validation: **`|ΔLs| ≤ 1e-6°`** (observed residuals ≤ `2.1e-10°`).
- The root is not accepted merely because a numerical tolerance was met; the Ls function
  must independently confirm the crossing.

## 6. Boundary classification logic

`martian_year_clancy()` now:

1. Validates a timezone-aware datetime and converts UTC → TT.
2. Uses the cached, validated MY1 crossing and its exact 360° multiple.
3. Counts completed 360° crossings from that **integer multiple**, not from the approximate
   epoch phase.
4. Within `1e-4°` of a boundary, re-solves the crossing and compares the instant against it
   with a `1e-9`-day tolerance, so sub-microsecond datetime round-off cannot flip the year.
5. Returns `completed_crossings + 1`.

Boundary semantics: at the solved crossing the new year begins; before it the previous year
applies; after it the new year applies. Verified for MY2, MY3 and MY31.

**Supported range:** classification is defined from the published MY1 date
(1955-04-11 00:00 UTC) onward. Earlier instants raise `ValueError`. Because the published
convention is date-only, times on 1955-04-11 before the exact 10:58 crossing are labelled
MY1 rather than the out-of-range MY0. This compatibility rule is explicit and tested.

## 7. Published references

- NASA Mars24 algorithm: <https://www.giss.nasa.gov/tools/mars24/help/algorithm.html>
- Mars24 technical notes: <https://www.giss.nasa.gov/tools/mars24/help/notes.html>
- Mars24 versions/documentation: <https://www.giss.nasa.gov/tools/mars24/help/versions.html>
- The Planetary Society, *Mars' Calendar*: <https://www.planetary.org/articles/mars-calendar>
- Clancy et al. (2000), JGR 105, 9553: <https://adsabs.harvard.edu/abs/2000JGR...105.9553C>
- Cantor, James & Calvin (2010) Mars Year table (reproduced by The Planetary Society).

Published start dates used (day precision): MY1 1955-04-11, MY2 1957-02-26,
MY3 1959-01-14, MY31 2011-09-13.

## 8. Calculated crossings

| MY | Published start | Calculated crossing (UTC) | JD (TT) | 360° multiple | Ls at root |
| --- | --- | --- | --- | --- | --- |
| MY1 | 1955-04-11 | 1955-04-11 10:58:15.617 | 2435208.9575060 | −23 | 0.000000° (≤ 2.5e-11°) |
| MY2 | 1957-02-26 | 1957-02-26 09:46:54.985 | 2435895.9079770 | −22 | 0.000000° (1.3e-10°) |
| MY3 | 1959-01-14 | 1959-01-14 09:52:42.930 | 2436582.9120197 | −21 | 0.000000° (1.2e-10°) |
| MY31 | 2011-09-13 | 2011-09-13 14:22:53.907 | 2455818.1000011 | 7 | 0.000000° (2.0e-10°) |

All calculated dates match the published calendar day. UTC instants were obtained by
subtracting TT−UTC (leap-second table after 1972; Mars24 polynomial before).

## 9. Before / at / after classification

| Boundary | 1 hour before | At crossing | 1 hour after |
| --- | --- | --- | --- |
| MY2 | 1 | 2 | 2 |
| MY3 | 2 | 3 | 3 |
| MY31 | 30 | 31 | 31 |

MY1: the crossing itself classifies as MY1; the preceding day is outside the supported
range (documented in §6). Ten hours before MY2 and five hours before MY2 both classify as
MY1, eliminating the superseded premature transition.

## 10. MY31 validation

- Curiosity landing, 2012-08-07 12:00 UTC → Ls 151.36°, **MY31** (published table: 31/150 on
  Aug 6, 2012).
- Sol 100 label start, 2012-11-16 07:48:43.598 UTC → Ls 207.898°, **MY31**.
- MY31 boundary solved at 2011-09-13 14:22:53.907 UTC, matching the published 2011-09-13.

## 11. Sol 100 results

| Sample | Ls (deg) | Northern | Southern | Gale | MY |
| --- | --- | --- | --- | --- | --- |
| record 0 | 207.896385 | Autumn | Spring | Spring | 31 |
| record 17672 | 208.184599 | Autumn | Spring | Spring | 31 |
| record 35343 | 208.495693 | Autumn | Spring | Spring | 31 |

Ls range 207.896°–208.496° is unchanged. `martian_year_clancy_sol100` remains 31.

## 12. REMS source-time uncertainty preserved

Unchanged and explicit:

- `validation_status`: `PARTIALLY_VALIDATED`
- `orbital_algorithm`: `VALIDATED_AGAINST_MARS24_REFERENCES`
- `utc_to_tt_conversion`: `VALIDATED_FOR_SUPPORTED_DATE_RANGE`
- `rems_source_timestamp`: `ASSUMED_TIME_SCALE`

REMS TIMESTAMP remains interpreted as J2000.0 TT seconds. The unexplained ~3.5-minute
difference from the PDS4 UTC label was neither corrected nor explained. Original
observations and timestamps were not modified.

## 13. Metadata regeneration

`python scripts/gale-weather/prepare_time_metadata.py` regenerated
`team/gale/weather/data/rems_sol_00100_time_metadata.json`. The result is **byte-identical**
(no diff): Sol 100 Ls values, seasonal labels, MY 31, cross-check, and uncertainty flags are
unchanged. The generator script itself required no modification.

## 14. Test results

| Suite | Result |
| --- | --- |
| `tests.test_gale_mars_time` | **69 passed** (44 pre-existing preserved + 25 new) |
| `tests.test_gale_weather_parser` | **45 passed** |
| `python -m unittest discover -s tests -p "test_gale_*.py"` | **133 passed** |

New coverage:

- **Group A (8):** finite root, Ls≈0 at root, correct multiple, convergence from nearby
  guesses, other-year guess, non-finite/non-numeric rejection, failed bracketing error.
- **Group B (14):** MY1/MY2/MY3/MY31 crossing dates, MY1 boundary-day rule, out-of-range
  error, MY31 landing and Sol 100, before/at/after for MY2/MY3/MY31, no premature MY2
  transition, single transition across ±24 h, reference is a crossing not raw epoch phase.
- **Group C (3):** Sol 100 Ls values, seasonal labels, REMS validation statuses.

Expected values come from published dates, published equations, and independently checked
boundary properties; the corrected classifier is not used to generate its own expected
outputs. Computed roots are used as boundary test locations only after independent Ls and
multiple validation.

Frontend `npm run typecheck`, `npm run lint` and `npm run build` were **not executed**:
Node dependencies are not installed in this worktree (`node_modules/.bin` is absent). No
frontend code was modified. This is an environment limitation, not a passing result.

## 15. Files changed

- `team/gale/weather/mars_time.py` — root-finding and exact year classification.
- `tests/test_gale_mars_time.py` — 25 new regression tests; existing tests preserved.
- `team/gale/weather/README.md` — boundary semantics note.
- `team/gale/weather/data/rems_sol_00100_time_metadata.json` — regenerated, byte-identical.
- `docs/GALE_WEATHER_W1_2B_H2_BOUNDARY_REPORT.md` — this report.

Unchanged: `rems_parser.py`, `rems_schema.py`, `rems_sol_00100.json`,
`prepare_time_metadata.py`, frontend, API, regions, and all other worktrees.

## 16. Scientific limitations

- The Mars24/AM2000 Ls formulation is not a full planetary ephemeris. Crossing instants
  inherit its accuracy (worked examples validated to ~`0.001°`, i.e. a few minutes of time).
- Published Mars Year starts are calendar-day precision; agreement is demonstrated at that
  precision, not at sub-second precision.
- The MY0→MY1 transition is outside the supported range; the published MY1 day is treated
  as day-precision per the source.
- REMS source time scale remains assumed, and the ~3.5-minute label offset remains
  unexplained.
- No external crossing service was used as an oracle; validation relies on the published
  Ls equation and published calendar dates.

## 17. Reproduction

```sh
python scripts/gale-weather/prepare_time_metadata.py
python -B -m unittest tests.test_gale_mars_time -v
python -B -m unittest tests.test_gale_weather_parser -v
python -B -m unittest discover -s tests -p "test_gale_*.py" -v
```

## 18. Git delivery

- Branch: `feat/gale-weather-data`
- Starting commit: `ceb3a34a70804d2cccf57566eeab39d801d4e472`
- Scientific code commit: `5d182eef4cd62c7959befa0cd56d1a6338065fa1`
- Documentation commit (this report): `e01692eed9030ebea2df3129e579c13a03a2240d`
- Remote push verification: `ceb3a34..e01692e feat/gale-weather-data -> feat/gale-weather-data`;
  local HEAD and `origin/feat/gale-weather-data` matched at verification.
- Final delivery-addendum commit: the HEAD containing this verification note (see `git log`).
- No reset, stash, clean, rebase, force-push, or merge was performed. No protected branch
  or other worktree was modified. Worktree was clean after the commits.
