"""PDS4 label parsing for the MSL REMS MODRDR product."""

from __future__ import annotations

import hashlib
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

PDS_NS = "http://pds.nasa.gov/pds4/pds/v1"
NS = "{" + PDS_NS + "}"


@dataclass
class FieldSpec:
    name: str
    number: int
    data_type: str
    unit: Optional[str] = None
    length: int = 0
    location: int = 0
    missing_constant: Optional[str] = None


@dataclass
class LabelInfo:
    logical_identifier: str
    version_id: str
    data_file_name: str
    record_count: int
    record_bytes: int
    fields: List[FieldSpec] = field(default_factory=list)


def _find(elem: ET.Element, tag: str) -> ET.Element:
    found = elem.find(tag)
    if found is None:
        raise ValueError(f"Missing required XML element: {tag}")
    return found


def _findall(elem: ET.Element, tag: str) -> List[ET.Element]:
    return elem.findall(tag)


def parse_label(label_path: Path) -> LabelInfo:
    """Parse a PDS4 Product_Observational label and return table metadata."""
    if not label_path.is_file():
        raise FileNotFoundError(f"PDS4 label not found: {label_path}")

    tree = ET.parse(label_path)
    root = tree.getroot()

    logical_identifier = _find(root, f".//{NS}Identification_Area/{NS}logical_identifier").text.strip()
    version_id = _find(root, f".//{NS}Identification_Area/{NS}version_id").text.strip()

    data_file_name = None
    for file_elem in root.findall(f".//{NS}File_Area_Observational/{NS}File"):
        name_elem = file_elem.find(f"{NS}file_name")
        if name_elem is not None and name_elem.text.strip().endswith(".TAB"):
            data_file_name = name_elem.text.strip()
            break
    if data_file_name is None:
        raise ValueError("No .TAB data file declared in PDS4 label")

    table = _find(root, f".//{NS}File_Area_Observational/{NS}Table_Character")
    records_elem = table.find(f"{NS}records")
    if records_elem is None:
        records_elem = _find(root, f".//{NS}File_Area_Observational/{NS}File/{NS}records")
    record_count = int(records_elem.text.strip())

    record_bytes_elem = table.find(f"{NS}Record_Character/{NS}record_length")
    record_bytes = int(record_bytes_elem.text.strip()) if record_bytes_elem is not None and record_bytes_elem.text else 0

    record_char = _find(table, f"{NS}Record_Character")

    fields: List[FieldSpec] = []
    for field_elem in record_char.findall(f"{NS}Field_Character"):
        name = _find(field_elem, f"{NS}name").text.strip()
        number = int(_find(field_elem, f"{NS}field_number").text.strip())
        data_type = _find(field_elem, f"{NS}data_type").text.strip()
        location = int(_find(field_elem, f"{NS}field_location").text.strip())
        length = int(_find(field_elem, f"{NS}field_length").text.strip())
        unit_elem = field_elem.find(f"{NS}unit")
        unit = unit_elem.text.strip() if unit_elem is not None and unit_elem.text else None

        missing = None
        sc = field_elem.find(f"{NS}Special_Constants")
        if sc is not None:
            uc = sc.find(f"{NS}unknown_constant")
            if uc is not None and uc.text:
                missing = uc.text.strip()

        fields.append(FieldSpec(
            name=name,
            number=number,
            data_type=data_type,
            unit=unit,
            length=length,
            location=location,
            missing_constant=missing,
        ))

    if not fields:
        raise ValueError("No Field_Character entries found in PDS4 label")

    expected_numbers = list(range(1, len(fields) + 1))
    actual_numbers = [f.number for f in fields]
    if actual_numbers != expected_numbers:
        raise ValueError(f"Field numbers are not contiguous: {actual_numbers}")

    return LabelInfo(
        logical_identifier=logical_identifier,
        version_id=version_id,
        data_file_name=data_file_name,
        record_count=record_count,
        record_bytes=record_bytes,
        fields=fields,
    )


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()
