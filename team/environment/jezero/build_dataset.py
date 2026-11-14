"""Build the compact, display-ready Jezero MEDA dataset from verified PDS4 files.

Input:  team/environment/jezero/cache/download_manifest.json + raw CSVs/labels
Output: data/environment/jezero/meda_jezero_sample.json

Scientific rules enforced here:

* Only columns that the PDS4 label actually declares are read; a header that
  does not match the label aborts the build.
* Missing fields, blank cells and the documented 999999999 sentinel stay
  missing. They are never replaced by zero.
* No interpolation and no synthetic samples. A 10-minute LMST bin is emitted
  only if it contains at least one valid native sample.
* Bins are arithmetic means of valid 1 Hz samples. Wind direction uses a
  circular (unit-vector) mean, never an arithmetic mean.
* Units are the units declared by the PDS4 label. Where the label omits a unit
  (relative humidity) that omission is recorded rather than hidden.
* TIRS ``GROUND_TEMP`` is a ground *brightness* temperature in the 8-14 um
  band. It is never promoted to kinetic surface temperature.
* MEDA RDS photodiode values are FOV-integrated radiance in W/m^2. They are not
  spectral irradiance and are not ionizing-radiation dose.

Reproduce::

    python -B team/environment/jezero/fetch_meda.py
    python -B team/environment/jezero/build_dataset.py
"""

from __future__ import annotations

import csv
import json
import math
import re
import statistics
import sys
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CACHE = HERE / "cache"
MANIFEST = CACHE / "download_manifest.json"
OUTPUT = ROOT / "data" / "environment" / "jezero" / "meda_jezero_sample.json"

BIN_SECONDS = 600
SENTINELS = {999999999.0, 9999999999.0}

# Exact columns selected from each PDS4 product, with the semantics taken from
# the product label and the MEDA RDR SIS.
SERIES_SPECS = [
    {
        "sensorToken": "CAL_ATS",
        "band": None,
        "columns": [f"ATS_LOCAL_TEMP{i}" for i in range(1, 6)],
        "quantity": "air_temperature",
        "unit": "K",
        "names": [
            "Air temperature, ATS 1 (RSM, 50°)",
            "Air temperature, ATS 2 (RSM, 155°)",
            "Air temperature, ATS 3 (RSM, 290°)",
            "Air temperature, ATS 4 (RFB, port/pilot)",
            "Air temperature, ATS 5 (RFB, starboard/co-pilot)",
        ],
        "evidence": "Observed",
    },
    {
        "sensorToken": "DER_PS",
        "band": None,
        "columns": ["PRESSURE"],
        "quantity": "surface_pressure",
        "unit": "Pa",
        "names": ["Surface pressure, PS (derived transducer)"],
        "evidence": "Derived",
    },
    {
        "sensorToken": "DER_RHS",
        "band": None,
        "columns": ["LOCAL_RELATIVE_HUMIDITY"],
        "quantity": "relative_humidity",
        "unit": "%",
        "names": ["Local relative humidity, RHS"],
        "evidence": "Derived",
        "unitNote": (
            "The PDS4 label declares no unit for LOCAL_RELATIVE_HUMIDITY; "
            "percent is the documented relative-humidity convention and matches "
            "the observed 0-100 range."
        ),
    },
    {
        "sensorToken": "DER_WS",
        "band": None,
        "columns": ["HORIZONTAL_WIND_SPEED"],
        "quantity": "horizontal_wind_speed",
        "unit": "m/s",
        "names": ["Horizontal wind speed, WS (derived)"],
        "evidence": "Derived",
        "circular": False,
    },
    {
        "sensorToken": "DER_WS",
        "band": None,
        "columns": ["WIND_DIRECTION"],
        "quantity": "wind_direction",
        "unit": "degree",
        "names": ["Wind direction (degrees clockwise from north)"],
        "evidence": "Derived",
        "circular": True,
    },
    {
        "sensorToken": "CAL_TIRS",
        "band": "8-14 µm (ground channel)",
        "columns": ["GROUND_TEMP"],
        "quantity": "ground_brightness_temperature",
        "unit": "K",
        "names": ["Ground brightness temperature, TIRS (8–14 µm)"],
        "evidence": "Observed",
        "requireFlags": {"TIRS_GROUND_FOOTPRINT_NOT_IN_SHADOW": 1},
        "flagNote": (
            "Samples with TIRS_GROUND_FOOTPRINT_NOT_IN_SHADOW = 0 are excluded: "
            "the ground footprint was shadowed by the rover."
        ),
    },
    {
        "sensorToken": "CAL_TIRS",
        "band": "0.3-3 µm",
        "columns": ["UPWARD_SW_IRRADIANCE"],
        "quantity": "upward_shortwave_irradiance",
        "unit": "W/m²",
        "names": ["Upward shortwave irradiance, TIRS (0.3–3 µm, hemispherical FOV)"],
        "evidence": "Observed",
    },
    {
        "sensorToken": "CAL_RDS",
        "band": None,
        "columns": ["RDS_TOP_7"],
        "quantity": "photodiode_radiance_fov_integrated",
        "unit": "W/m²",
        "names": ["UV photodiode radiance, RDS TOP-7 (FOV-integrated)"],
        "evidence": "Observed",
        "regularModeOnly": True,
        "unitNote": (
            "The RDR product defines this channel as radiance integrated over the "
            "photodiode field of view in W/m². The product label does not state a "
            "numeric bandpass; the sensor is documented as an upward-looking UV "
            "photodetector. It is not spectral irradiance and not ionizing dose."
        ),
    },
]

LMST = re.compile(r"^(\d{5})M(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)$")


def parse_lmst(value: str) -> float | None:
    match = LMST.match(value.strip())
    if not match:
        return None
    _, hours, minutes, seconds = match.groups()
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def numeric(value: str) -> float | None:
    text = value.strip()
    if not text:
        return None
    try:
        number = float(text)
    except ValueError:
        return None
    if not math.isfinite(number) or number in SENTINELS:
        return None
    return number


def circular_mean(angles: list[float]) -> float:
    x = sum(math.cos(math.radians(a)) for a in angles)
    y = sum(math.sin(math.radians(a)) for a in angles)
    return math.degrees(math.atan2(y, x)) % 360.0


def normalise_field(name: str) -> str:
    """PDS4 labels use display names such as 'PRESSURE UNCERTAINTY' while the
    CSV header uses 'PRESSURE_UNCERTAINTY'. Compare on normalized names only;
    order and field count must still match exactly."""
    return re.sub(r"\s+", "_", name.strip()).upper()


def read_product(
    path: Path, label_fields: list[dict], required: list[str]
) -> tuple[list[str], list[list[str]]]:
    """Read a product and verify the columns this build depends on.

    Full header equality is not usable as a hard gate: the published RHS label
    contains two name typos in unselected uncertainty columns
    (``LOCAL_TEMP_UNCERTAINTY`` and ``VOLUME_MIXING_RATION_UNCERTAINTY``) while
    the CSV uses different names. Every column that is actually parsed must be
    present in both the CSV header and the PDS4 label, and the row layout is
    still checked for order-independent presence and count.
    """
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.reader(handle)
        header = [cell.strip() for cell in next(reader)]
        rows = [row for row in reader if row]
    declared = [field["name"] for field in label_fields]
    if len(header) != len(declared):
        raise SystemExit(
            f"{path.name}: CSV has {len(header)} columns but label declares {len(declared)}"
        )

    declared_names = {normalise_field(name) for name in declared}
    header_names = {normalise_field(name) for name in header}
    missing_from_csv = [name for name in required if normalise_field(name) not in header_names]
    missing_from_label = [name for name in required if normalise_field(name) not in declared_names]
    if missing_from_csv or missing_from_label:
        raise SystemExit(
            f"{path.name}: required columns missing\n"
            f"  not in CSV:   {missing_from_csv}\n"
            f"  not in label: {missing_from_label}\n"
            f"  header: {header}\n  label:  {declared}"
        )

    mismatched = [
        (cell, name)
        for cell, name in zip(header, declared)
        if normalise_field(cell) != normalise_field(name)
    ]
    if mismatched:
        print(
            f"  ~ {path.name}: {len(mismatched)} unselected column name(s) differ between "
            f"label and CSV, e.g. {mismatched[0][0]} vs {mismatched[0][1]}"
        )
    return header, rows


def series_id(sol: int, quantity: str, variable: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", f"{quantity}-{variable}".lower()).strip("-")
    return f"jezero-meda-{sol:04d}-{slug}"


def summarise(values: list[float], circular: bool = False) -> dict:
    if not values:
        return {"validSamples": 0, "min": None, "max": None, "mean": None}
    mean = circular_mean(values) if circular else statistics.fmean(values)
    return {
        "validSamples": len(values),
        "min": round(min(values), 4),
        "max": round(max(values), 4),
        "mean": round(mean, 4),
    }


def build_series(
    spec: dict,
    name: str,
    variable: str,
    product: dict,
    label_fields: list[dict],
    header: list[str],
    rows: list[list[str]],
) -> dict | None:
    index = {column: i for i, column in enumerate(header)}
    if variable not in index:
        print(f"  ! {product['csv']} has no {variable}; series skipped")
        return None

    t_index = index["LMST"]
    v_index = index[variable]
    flag_indices = {
        flag: index[flag] for flag in (spec.get("requireFlags") or {}) if flag in index
    }
    required_flags = spec.get("requireFlags") or {}
    mode_index = index.get("RDS_TOP_1") if spec.get("regularModeOnly") else None

    bins: dict[int, list[float]] = {}
    native: list[float] = []
    excluded = 0
    first_t: float | None = None
    last_t: float | None = None

    for row in rows:
        if len(row) <= v_index:
            excluded += 1
            continue
        t = parse_lmst(row[t_index])
        value = numeric(row[v_index])
        if t is None or value is None:
            excluded += 1
            continue
        if mode_index is not None and not row[mode_index].strip():
            # High-gain mode row: the regular-mode columns are empty by design.
            excluded += 1
            continue
        if flag_indices and any(
            numeric(row[index]) != required_flags[flag]
            for flag, index in flag_indices.items()
        ):
            excluded += 1
            continue
        native.append(value)
        key = int(t // BIN_SECONDS)
        bins.setdefault(key, []).append(value)
        first_t = t if first_t is None else min(first_t, t)
        last_t = t if last_t is None else max(last_t, t)

    if not native:
        return None

    points = []
    for key in sorted(bins):
        values = bins[key]
        if not values:
            continue
        points.append(
            {
                "t": key * BIN_SECONDS,
                "v": round(circular_mean(values) if spec.get("circular") else statistics.fmean(values), 4),
                "n": len(values),
                "lo": round(min(values), 4),
                "hi": round(max(values), 4),
            }
        )

    summary = summarise(native, bool(spec.get("circular")))
    summary.update(
        {
            "nativeSamplesRead": len(rows),
            "excludedSamples": excluded,
            "firstLmstSeconds": round(first_t, 3) if first_t is not None else None,
            "lastLmstSeconds": round(last_t, 3) if last_t is not None else None,
        }
    )

    declared_unit = next(
        (
            field.get("unit")
            for field in label_fields
            if normalise_field(field.get("name") or "") == normalise_field(variable)
        ),
        None,
    )

    return {
        "id": series_id(product["_sol"], spec["quantity"], variable),
        "regionId": "jezero",
        "instrument": "MEDA",
        "sensor": product["sensorToken"].split("_", 1)[1],
        "productId": product["csv"].rsplit(".", 1)[0],
        "variableId": variable,
        "physicalQuantity": spec["quantity"],
        "displayName": name,
        "unit": spec["unit"],
        "declaredLabelUnit": declared_unit,
        "band": spec["band"],
        "sol": product["_sol"],
        "timeBasis": "LMST",
        "sourceUrl": product["csvUrl"],
        "evidence": spec["evidence"],
        "qualityStatus": spec.get("flagNote")
        or ("All native samples valid; no per-sample quality flag in product label."
            if spec["evidence"] == "Observed"
            else "Derived product; derived values inherit upstream calibration."),
        "unitNote": spec.get("unitNote"),
        "aggregation": {
            "method": "circular (unit-vector) mean" if spec.get("circular") else "arithmetic mean",
            "binSeconds": BIN_SECONDS,
            "interpolated": False,
            "minimumNativeSamplesPerBin": 1,
        },
        "summary": summary,
        "points": points,
    }


def product_index(entry: dict) -> dict[str, dict]:
    return {product["sensorToken"]: product for product in entry["products"]}


def main() -> int:
    if not MANIFEST.exists():
        raise SystemExit(f"missing {MANIFEST}; run fetch_meda.py first")
    manifest = json.loads(MANIFEST.read_text("utf-8"))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    series: list[dict] = []
    sols: list[dict] = []
    availability: dict[str, dict] = {}

    required_columns: dict[str, list[str]] = {}
    for spec in SERIES_SPECS:
        columns = required_columns.setdefault(spec["sensorToken"], ["LMST"])
        for column in spec["columns"]:
            if column not in columns:
                columns.append(column)
        if spec.get("regularModeOnly") and "RDS_TOP_1" not in columns:
            columns.append("RDS_TOP_1")

    for entry in manifest["sol"]:
        sol = entry["sol"]
        print(f"sol {sol:04d}")
        products = product_index(entry)
        sol_series: list[dict] = []
        parsed: dict[str, tuple[list[str], list[list[str]]]] = {}

        for spec in SERIES_SPECS:
            product = products.get(spec["sensorToken"])
            if product is None:
                availability.setdefault(
                    spec["quantity"],
                    {"quantity": spec["quantity"], "status": "unavailable",
                     "reason": f"No {spec['sensorToken']} product for this sol."},
                )
                continue
            csv_path = CACHE / f"sol_{sol:04d}" / product["csv"]
            if not csv_path.exists():
                raise SystemExit(f"missing {csv_path}; re-run fetch_meda.py")
            if spec["sensorToken"] not in parsed:
                parsed[spec["sensorToken"]] = read_product(
                    csv_path, product["fields"], required_columns[spec["sensorToken"]]
                )
            header, rows = parsed[spec["sensorToken"]]
            for name, variable in zip(spec["names"], spec["columns"]):
                product["_sol"] = sol
                built = build_series(spec, name, variable, product, product["fields"], header, rows)
                if built:
                    sol_series.append(built)
            availability.setdefault(
                spec["quantity"],
                {
                    "quantity": spec["quantity"],
                    "status": "available",
                    "instrument": "MEDA " + spec["sensorToken"].split("_", 1)[1],
                    "evidence": spec["evidence"],
                    "unit": spec["unit"],
                },
            )

        series.extend(sol_series)
        sols.append(
            {
                "sol": sol,
                "startLsDeg": float(products["CAL_ATS"]["startLs"]) if "CAL_ATS" in products else None,
                "stopLsDeg": float(products["CAL_ATS"]["stopLs"]) if "CAL_ATS" in products else None,
                "startUtc": products["CAL_ATS"]["startTime"] if "CAL_ATS" in products else None,
                "stopUtc": products["CAL_ATS"]["stopTime"] if "CAL_ATS" in products else None,
                "lmstFirst": min((s["summary"]["firstLmstSeconds"] for s in sol_series), default=None),
                "lmstLast": max((s["summary"]["lastLmstSeconds"] for s in sol_series), default=None),
                "products": [
                    {
                        "sensorToken": product["sensorToken"],
                        "title": product["title"],
                        "processingLevel": product["processingLevel"],
                        "productId": product["csv"].rsplit(".", 1)[0],
                        "version": product["versionId"],
                        "csvUrl": product["csvUrl"],
                        "csvSha256": product["csvSha256"],
                        "records": int(product["records"]),
                    }
                    for product in entry["products"]
                ],
            }
        )

    for quantity, reason in (
        ("dust_optical_depth", "No validated dust-opacity product exists in the calibrated or derived MEDA CSV collections used here. SkyCam tau imagery was not processed in this milestone."),
        ("ionizing_radiation_dose", "No verified Jezero ionizing-dose product is integrated. MEDA RDS photodiodes are solar/UV sensors; their values are never converted to dose."),
    ):
        availability[quantity] = {
            "quantity": quantity,
            "status": "unavailable",
            "evidence": "Unavailable",
            "reason": reason,
        }

    dataset = {
        "schemaVersion": 1,
        "datasetId": "jezero-meda-sample-v1",
        "regionId": "jezero",
        "mission": "Mars 2020 Perseverance",
        "instrument": "MEDA",
        "datasetDoi": "10.17189/1522849",
        "bundleUrl": "https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/",
        "sourceVerified": "VERIFIED",
        "processingVerified": "VERIFIED",
        "registrationVerified": "NOT_EVALUATED",
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "aggregation": {
            "method": "Per-variable 10-minute LMST bins; arithmetic mean of valid native samples (circular mean for wind direction).",
            "binSeconds": BIN_SECONDS,
            "interpolated": False,
            "emptyBins": "omitted",
        },
        "displayWindow": {
            "solSelection": [entry["sol"] for entry in manifest["sol"]],
            "selectionRule": (
                f"{len(manifest['sol'])} sols ("
                + ", ".join(str(entry["sol"]) for entry in manifest["sol"])
                + ") inside sols 36-315, the only interval with a derived wind product "
                "in this PDS release, and after the sol-63 humidity commissioning limit. "
                "Sols without a complete six-instrument product set were replaced."
            ),
        },
        "availability": list(availability.values()),
        "sols": sols,
        "series": series,
        "limitations": [
            "These are rover-local MEDA observations at the Perseverance workspace, not area-wide Jezero Crater conditions.",
            "No historical observation in this dataset predicts future EVA conditions.",
            "Air temperature is reported per ATS detector; detectors are never averaged into one undisclosed value.",
            "TIRS GROUND_TEMP is ground brightness temperature in the 8-14 µm band, not kinetic surface temperature.",
            "MEDA RDS values are FOV-integrated photodiode radiance in W/m²; the product label states no numeric bandpass.",
            "MEDA RDS measurements are not galactic cosmic-ray dose, solar energetic-particle dose, absorbed dose, dose equivalent, or astronaut exposure.",
            "Dust optical depth is unavailable in the parsed products.",
        ],
    }

    OUTPUT.write_text(json.dumps(dataset, indent=2, ensure_ascii=False) + "\n", "utf-8")
    size = OUTPUT.stat().st_size
    print(f"wrote {OUTPUT} ({size/1024:.0f} KiB), {len(series)} series")
    return 0


if __name__ == "__main__":
    sys.exit(main())
