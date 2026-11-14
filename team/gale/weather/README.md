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

## Scientific notes

- Source data are historical observations from Curiosity's REMS instrument at Gale Crater.
- They are not forecasts and do not define safe EVA windows.
- Missing numeric values are converted to JSON `null`.
- Confidence flags are preserved as strings.
- LMST and LTST are validated but not converted to each other.
PY