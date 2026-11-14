"""Parser and validator for one MSL REMS MODRDR observation sol."""

from __future__ import annotations

import json
import math
import re
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .rems_schema import FieldSpec, LabelInfo, parse_label, sha256_file

EXPECTED_SOL = 100
EXPECTED_FIELD_NAMES: Tuple[str, ...] = (
    "TIMESTAMP", "LMST", "LTST", "HORIZONTAL_WIND_SPEED", "VERTICAL_WIND_SPEED",
    "WIND_DIRECTION", "WS_CONFIDENCE_LEVEL", "BRIGHTNESS_TEMP",
    "BRIGHTNESS_TEMP_LONG_TERM_UNCERTAINTY", "BRIGHTNESS_TEMP_SHORT_TERM_UNCERTAINTY",
    "GTS_CONFIDENCE_LEVEL", "BOOM1_LOCAL_AIR_TEMP", "ATS_BOOM1_CONFIDENCE_LEVEL",
    "BOOM2_LOCAL_AIR_TEMP", "ATS_BOOM2_CONFIDENCE_LEVEL", "AMBIENT_TEMP",
    "AMBIENT_TEMP_CONFIDENCE_LEVEL", "UV_A", "UV_B", "UV_C", "UV_ABC", "UV_D",
    "UV_E", "UV_A_UNCERTAINTY", "UV_B_UNCERTAINTY", "UV_C_UNCERTAINTY",
    "UV_ABC_UNCERTAINTY", "UV_D_UNCERTAINTY", "UV_E_UNCERTAINTY",
    "UVS_CONFIDENCE_LEVEL", "LOCAL_RELATIVE_HUMIDITY", "HS_TEMP",
    "LOCAL_RELATIVE_HUMIDITY_UNCERTAINTY", "VOLUME_MIXING_RATIO",
    "VOLUME_MIXING_RATIO_UNCERTAINTY", "HS_CONFIDENCE_LEVEL",
    "PS_CONFIGURATION", "PRESSURE", "PRESSURE_UNCERTAINTY",
    "PS_CONFIDENCE_LEVEL",
)

EXPECTED_UNITS: Dict[str, Optional[str]] = {
    "TIMESTAMP": "SECOND",
    "LMST": None,
    "LTST": None,
    "HORIZONTAL_WIND_SPEED": "METERS/SECOND",
    "VERTICAL_WIND_SPEED": "METERS/SECOND",
    "WIND_DIRECTION": "DEGREE",
    "WS_CONFIDENCE_LEVEL": None,
    "BRIGHTNESS_TEMP": "KELVIN",
    "BRIGHTNESS_TEMP_LONG_TERM_UNCERTAINTY": "KELVIN",
    "BRIGHTNESS_TEMP_SHORT_TERM_UNCERTAINTY": "KELVIN",
    "GTS_CONFIDENCE_LEVEL": None,
    "BOOM1_LOCAL_AIR_TEMP": "KELVIN",
    "ATS_BOOM1_CONFIDENCE_LEVEL": None,
    "BOOM2_LOCAL_AIR_TEMP": "KELVIN",
    "ATS_BOOM2_CONFIDENCE_LEVEL": None,
    "AMBIENT_TEMP": "KELVIN",
    "AMBIENT_TEMP_CONFIDENCE_LEVEL": None,
    "UV_A": "W/m**2",
    "UV_B": "W/m**2",
    "UV_C": "W/m**2",
    "UV_ABC": "W/m**2",
    "UV_D": "W/m**2",
    "UV_E": "W/m**2",
    "UV_A_UNCERTAINTY": "%",
    "UV_B_UNCERTAINTY": "%",
    "UV_C_UNCERTAINTY": "%",
    "UV_ABC_UNCERTAINTY": "%",
    "UV_D_UNCERTAINTY": "%",
    "UV_E_UNCERTAINTY": "%",
    "UVS_CONFIDENCE_LEVEL": None,
    "LOCAL_RELATIVE_HUMIDITY": "%",
    "HS_TEMP": "KELVIN",
    "LOCAL_RELATIVE_HUMIDITY_UNCERTAINTY": "%",
    "VOLUME_MIXING_RATIO": "ppm",
    "VOLUME_MIXING_RATIO_UNCERTAINTY": "ppm",
    "HS_CONFIDENCE_LEVEL": None,
    "PS_CONFIGURATION": None,
    "PRESSURE": "PASCAL",
    "PRESSURE_UNCERTAINTY": "PASCAL",
    "PS_CONFIDENCE_LEVEL": None,
}

NUMERIC_TYPES = {"ASCII_Integer", "ASCII_Real"}

LMST_RE = re.compile(r"^\d{5}M\d{2}:\d{2}:\d{2}\.\d{3}$")
LTST_RE = re.compile(r"^\d{5} \d{2}:\d{2}:\d{2}(\.\d{3})?$")


@dataclass
class TimeValidation:
    issues: List[str]


def validate_field_contract(label: LabelInfo) -> None:
    names = tuple(f.name for f in label.fields)
    if names != EXPECTED_FIELD_NAMES:
        raise ValueError(
            "MODRDR field names/order do not match the verified contract.\n"
            f"Expected: {EXPECTED_FIELD_NAMES}\nGot:      {names}"
        )
    if len(label.fields) != 40:
        raise ValueError(f"Expected 40 fields, got {len(label.fields)}")
    for f in label.fields:
        expected_unit = EXPECTED_UNITS[f.name]
        if f.unit != expected_unit:
            raise ValueError(
                f"Unit mismatch for {f.name}: expected {expected_unit!r}, got {f.unit!r}"
            )


def validate_source_identity(label: LabelInfo, data_path: Path, expected_sol: int = EXPECTED_SOL) -> None:
    """Verify that the PDS4 label legitimately references the supplied MODRDR file."""
    if "msl_rems" not in label.logical_identifier:
        raise ValueError(f"Unexpected logical identifier: {label.logical_identifier!r}")
    if label.version_id != "1.0":
        raise ValueError(f"Unexpected product version: {label.version_id!r}")
    if label.data_file_name != data_path.name:
        raise ValueError(
            f"Label data file {label.data_file_name!r} does not match supplied file {data_path.name!r}"
        )
    name = data_path.name
    if not name.startswith("RME_") or "RMD" not in name:
        raise ValueError(f"Data filename does not identify a MODRDR product: {name!r}")
    if f"SOL{expected_sol:05d}" not in name and f"SOL{expected_sol:04d}" not in name:
        # The product filename does not embed the sol directly; require the verified filename.
        if name != "RME_406323911RMD01000000000_______P9.TAB":
            raise ValueError(f"Unexpected Sol {expected_sol} MODRDR filename: {name!r}")
    # The logical identifier is a lowercased PDS4 LID and legitimately ends in ...pa,
    # while the filename retains the PDS3 product version suffix ...P9. This is an
    # official naming difference, not a mismatch, because file_name is authoritative.
    # PDS4 logical identifiers lowercase the product filename's version suffix.
    # For example, a file ending in ...P9.TAB has an LID ending in ...p9.
    expected_suffix = data_path.stem[-2:].lower()
    if not label.logical_identifier.endswith(expected_suffix):
        raise ValueError(
            "Logical identifier suffix does not match the product filename version: "
            f"{label.logical_identifier!r} vs {expected_suffix!r}"
        )


def _is_missing_numeric(value: str, spec: FieldSpec) -> bool:
    stripped = value.strip().strip('"')
    if stripped == "":
        return True
    if spec.missing_constant is not None and stripped == spec.missing_constant.strip().strip('"'):
        return True
    if stripped in {"-999", "-999.00", "-9.990E+02"}:
        return True
    return False


def _parse_numeric(value: str, spec: FieldSpec) -> Optional[float]:
    stripped = value.strip().strip('"')
    if _is_missing_numeric(stripped, spec):
        return None
    try:
        if spec.data_type == "ASCII_Integer":
            number = int(stripped)
        else:
            number = float(stripped)
    except ValueError as exc:
        raise ValueError(
            f"Non-numeric value in numeric field {spec.name}: {stripped!r}"
        ) from exc
    if isinstance(number, float) and not math.isfinite(number):
        raise ValueError(f"Non-finite value in field {spec.name}: {stripped!r}")
    return number


def _parse_string(value: str, spec: FieldSpec) -> Optional[str]:
    stripped = value.strip()
    if len(stripped) >= 2 and stripped.startswith('"') and stripped.endswith('"'):
        stripped = stripped[1:-1]
    if stripped == "":
        return None
    if spec.missing_constant is not None and stripped == spec.missing_constant.strip().strip('"'):
        return None
    return stripped


def _split_records(data: bytes) -> List[bytes]:
    """Split a CRLF-delimited byte stream into records without silently dropping blanks."""
    if data == b"":
        raise ValueError("Empty MODRDR data file")
    if not data.endswith(b"\r\n") and not data.endswith(b"\n"):
        raise ValueError("MODRDR data file does not end with a line terminator")
    # Split on CRLF first; fall back to LF for the final terminator check only.
    records: List[bytes] = []
    # Preserve blank lines: splitlines(keepends=True) would hide them; use explicit split.
    if b"\r\n" in data:
        parts = data.split(b"\r\n")
        # File ends with CRLF, so the last part is empty.
        if parts and parts[-1] == b"":
            parts = parts[:-1]
        for part in parts:
            records.append(part + b"\r\n")
    else:
        parts = data.split(b"\n")
        if parts and parts[-1] == b"":
            parts = parts[:-1]
        for part in parts:
            records.append(part + b"\n")
    if not records:
        raise ValueError("No records found in MODRDR data file")
    return records


def _slice_record(line: bytes, label: LabelInfo) -> List[str]:
    if line.endswith(b"\r\n"):
        terminator = b"\r\n"
    elif line.endswith(b"\n"):
        terminator = b"\n"
    else:
        terminator = b""
    content = line[:-len(terminator)] if terminator else line
    if content.strip() == b"":
        raise ValueError("Blank record encountered")
    if terminator:
        expected_content_len = label.record_bytes - len(terminator)
    else:
        expected_content_len = label.record_bytes
    if expected_content_len <= 0:
        raise ValueError("Invalid record_bytes in PDS4 label")
    if len(content) != expected_content_len:
        raise ValueError(
            f"Record byte length mismatch: expected {expected_content_len}, got {len(content)}"
        )
    values: List[str] = []
    for spec in label.fields:
        start = spec.location - 1
        end = start + spec.length
        if start < 0 or end > len(content):
            raise ValueError(
                f"Field {spec.name} extends outside the record: bytes {spec.location}-{spec.location + spec.length - 1}"
            )
        values.append(content[start:end].decode("ascii"))
    return values


def validate_time_records(records: List[Dict[str, Any]], expected_sol: int = EXPECTED_SOL) -> List[str]:
    issues: List[str] = []
    previous_timestamp: Optional[int] = None
    for idx, rec in enumerate(records, start=1):
        ts = rec.get("TIMESTAMP")
        if ts is not None:
            if not isinstance(ts, int):
                issues.append(f"Row {idx}: TIMESTAMP is not an integer")
            elif previous_timestamp is not None and ts < previous_timestamp:
                issues.append(f"Row {idx}: TIMESTAMP is not monotonic ({ts} < {previous_timestamp})")
            if isinstance(ts, int):
                previous_timestamp = ts

        lmst = rec.get("LMST")
        if lmst is None or not isinstance(lmst, str) or not LMST_RE.match(lmst):
            issues.append(f"Row {idx}: invalid LMST format: {lmst!r}")
        else:
            sol = int(lmst[:5])
            if sol != expected_sol:
                issues.append(f"Row {idx}: LMST sol {sol} != expected {expected_sol}")

        ltst = rec.get("LTST")
        if ltst is None or not isinstance(ltst, str) or not LTST_RE.match(ltst):
            issues.append(f"Row {idx}: invalid LTST format: {ltst!r}")
        else:
            sol = int(ltst[:5])
            if sol != expected_sol:
                issues.append(f"Row {idx}: LTST sol {sol} != expected {expected_sol}")

        if isinstance(lmst, str) and isinstance(ltst, str) and LMST_RE.match(lmst) and LTST_RE.match(ltst):
            if lmst[:5] != ltst[:5]:
                issues.append(f"Row {idx}: LMST and LTST sol numbers differ")

    return issues


def parse_records(label: LabelInfo, data_path: Path, expected_sol: int = EXPECTED_SOL) -> List[Dict[str, Any]]:
    if not data_path.is_file():
        raise FileNotFoundError(f"MODRDR data file not found: {data_path}")

    validate_source_identity(label, data_path, expected_sol=expected_sol)
    validate_field_contract(label)

    raw = data_path.read_bytes()
    lines = _split_records(raw)

    records: List[Dict[str, Any]] = []
    for line_number, line in enumerate(lines, start=1):
        try:
            values = _slice_record(line, label)
        except ValueError as exc:
            raise ValueError(f"Record {line_number}: {exc}") from exc
        if len(values) != len(label.fields):
            raise ValueError(
                f"Record {line_number}: expected {len(label.fields)} fields, got {len(values)}"
            )
        record: Dict[str, Any] = {}
        for spec, value in zip(label.fields, values):
            if spec.data_type in NUMERIC_TYPES:
                record[spec.name] = _parse_numeric(value, spec)
            else:
                record[spec.name] = _parse_string(value, spec)
        records.append(record)

    if len(records) != label.record_count:
        raise ValueError(
            f"Record count mismatch: label says {label.record_count}, parsed {len(records)}"
        )

    issues = validate_time_records(records, expected_sol=expected_sol)
    if issues:
        raise ValueError("Time validation failed:\n" + "\n".join(issues[:20]))

    return records


def _confidence_patterns(records: List[Dict[str, Any]], field: str) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for rec in records:
        val = rec.get(field)
        key = val if isinstance(val, str) else "<null>"
        counts[key] = counts.get(key, 0) + 1
    return dict(sorted(counts.items()))


def quality_summary(records: List[Dict[str, Any]], label: LabelInfo) -> Dict[str, Any]:
    numeric_fields = [f.name for f in label.fields if f.data_type in NUMERIC_TYPES]
    valid_counts: Dict[str, int] = {}
    missing_counts: Dict[str, int] = {}
    for name in numeric_fields:
        valid = sum(1 for r in records if r.get(name) is not None)
        valid_counts[name] = valid
        missing_counts[name] = len(records) - valid

    lmst_values = [r["LMST"] for r in records if isinstance(r.get("LMST"), str)]
    ltst_values = [r["LTST"] for r in records if isinstance(r.get("LTST"), str)]

    return {
        "total_rows": len(records),
        "field_count": len(label.fields),
        "valid_counts": valid_counts,
        "missing_counts": missing_counts,
        "missing_percent": {
            name: round((missing_counts[name] / len(records)) * 100.0, 3)
            for name in numeric_fields
        },
        "confidence_patterns": {
            "WS_CONFIDENCE_LEVEL": _confidence_patterns(records, "WS_CONFIDENCE_LEVEL"),
            "GTS_CONFIDENCE_LEVEL": _confidence_patterns(records, "GTS_CONFIDENCE_LEVEL"),
            "ATS_BOOM1_CONFIDENCE_LEVEL": _confidence_patterns(records, "ATS_BOOM1_CONFIDENCE_LEVEL"),
            "ATS_BOOM2_CONFIDENCE_LEVEL": _confidence_patterns(records, "ATS_BOOM2_CONFIDENCE_LEVEL"),
            "AMBIENT_TEMP_CONFIDENCE_LEVEL": _confidence_patterns(records, "AMBIENT_TEMP_CONFIDENCE_LEVEL"),
            "UVS_CONFIDENCE_LEVEL": _confidence_patterns(records, "UVS_CONFIDENCE_LEVEL"),
            "HS_CONFIDENCE_LEVEL": _confidence_patterns(records, "HS_CONFIDENCE_LEVEL"),
            "PS_CONFIDENCE_LEVEL": _confidence_patterns(records, "PS_CONFIDENCE_LEVEL"),
        },
        "lmst_earliest": min(lmst_values) if lmst_values else None,
        "lmst_latest": max(lmst_values) if lmst_values else None,
        "ltst_earliest": min(ltst_values) if ltst_values else None,
        "ltst_latest": max(ltst_values) if ltst_values else None,
        "time_validation_errors": [],
    }


def build_output(
    sol: int,
    label: LabelInfo,
    records: List[Dict[str, Any]],
    source: Dict[str, Any],
) -> Dict[str, Any]:
    field_names = [f.name for f in label.fields]
    fields = [
        {
            "name": f.name,
            "number": f.number,
            "type": f.data_type,
            "unit": f.unit,
        }
        for f in label.fields
    ]
    q = quality_summary(records, label)
    q["time_validation_errors"] = validate_time_records(records, expected_sol=sol)
    record_arrays = [[rec[name] for name in field_names] for rec in records]
    return {
        "schema_version": "1.0",
        "region": "gale",
        "mission": "MSL Curiosity",
        "instrument": "REMS",
        "product_level": "MODRDR",
        "sol": sol,
        "source": source,
        "field_order": field_names,
        "fields": fields,
        "records": record_arrays,
        "quality_summary": q,
    }


def download_file(url: str, destination: Path) -> Tuple[int, str]:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url) as response:
        if response.status != 200:
            raise RuntimeError(f"HTTP {response.status} for {url}")
        data = response.read()
    destination.write_bytes(data)
    return len(data), sha256_file(destination)
