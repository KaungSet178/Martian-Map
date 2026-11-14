# Gale REMS weather parser (W1.2A)

This module parses one authentic MSL Curiosity REMS MODRDR sol from the NASA PDS4 archive.

## Files

- `rems_schema.py` — PDS4 label parsing and field schema
- `rems_parser.py` — fixed-width record parsing, validation, and quality summary
- `data/` — downloaded source files and generated compact JSON (raw `.TAB` is not committed)

## Reproduce

From the repository root:

```sh
python scripts/gale-weather/prepare_sol.py
```

This downloads the verified Sol 100 MODRDR product and label, validates the schema, and writes
`team/gale/weather/data/rems_sol_00100.json`.

To use existing local files:

```sh
python scripts/gale-weather/prepare_sol.py --no-download
```

## Tests

```sh
python -B -m unittest tests.test_gale_weather_parser -v
```

## Mars time conversion (W1.2B / W1.2B-H2)

```python
from team.gale.weather.mars_time import calculate_mars_ls_from_utc, martian_year_clancy

ls = calculate_mars_ls_from_utc(datetime(2012, 11, 16, tzinfo=timezone.utc))
year = martian_year_clancy(datetime(2012, 11, 16, tzinfo=timezone.utc))  # MY31
```

Martian-year boundaries use the calculated Ls = 0° crossing (bisection on the
unnormalized Mars24 Ls), not the raw phase at 1955-04-11 00:00 UTC. The published
MY1 date is calendar-day precision; the solved crossing is 1955-04-11 10:58:15.617 UTC.
See `docs/GALE_WEATHER_W1_2B_H2_BOUNDARY_REPORT.md` and
`docs/GALE_WEATHER_W1_2B_TIME_VALIDATION_REPORT.md` for algorithm and validation details.
PY