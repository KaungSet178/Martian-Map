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

## Mars time conversion (W1.2B)

```python
from team.gale.weather.mars_time import calculate_mars_ls_from_utc

ls = calculate_mars_ls_from_utc(datetime(2012, 11, 16, tzinfo=timezone.utc))
```

See `docs/GALE_WEATHER_W1_2B_TIME_VALIDATION_REPORT.md` for algorithm and validation details.
PY