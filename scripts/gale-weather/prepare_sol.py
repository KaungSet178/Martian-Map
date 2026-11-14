"""Download and parse one MSL REMS MODRDR sol into compact JSON."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

# Allow running as a script from the repository root.
import sys

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from team.gale.weather.rems_parser import (
    EXPECTED_SOL,
    build_output,
    download_file,
    parse_label,
    parse_records,
    validate_field_contract,
)
from team.gale.weather.rems_schema import sha256_file

SOL = 100
DATA_DIR = ROOT / "team" / "gale" / "weather" / "data"
TAB_URL = (
    "https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/"
    "data_calibrated/SOL_00090_00179/SOL00100/"
    "RME_406323911RMD01000000000_______P9.TAB"
)
XML_URL = (
    "https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/"
    "data_calibrated/SOL_00090_00179/SOL00100/"
    "RME_406323911RMD01000000000_______P9.xml"
)
TAB_NAME = "RME_406323911RMD01000000000_______P9.TAB"
XML_NAME = "RME_406323911RMD01000000000_______P9.xml"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sol", type=int, default=SOL)
    parser.add_argument("--data-dir", type=Path, default=DATA_DIR)
    parser.add_argument("--output", type=Path, default=DATA_DIR / "rems_sol_00100.json")
    parser.add_argument("--no-download", action="store_true", help="Use existing local files")
    args = parser.parse_args()

    if args.sol != EXPECTED_SOL:
        raise ValueError(f"This W1.2A implementation supports sol {EXPECTED_SOL} only")

    data_dir = args.data_dir
    data_dir.mkdir(parents=True, exist_ok=True)
    tab_path = data_dir / TAB_NAME
    xml_path = data_dir / XML_NAME

    if not args.no_download:
        tab_size, tab_hash = download_file(TAB_URL, tab_path)
        xml_size, xml_hash = download_file(XML_URL, xml_path)
    else:
        tab_size, tab_hash = tab_path.stat().st_size, sha256_file(tab_path)
        xml_size, xml_hash = xml_path.stat().st_size, sha256_file(xml_path)

    label = parse_label(xml_path)
    validate_field_contract(label)
    if label.data_file_name != TAB_NAME:
        raise ValueError(
            f"Label data file {label.data_file_name!r} does not match expected {TAB_NAME!r}"
        )

    records = parse_records(label, tab_path, expected_sol=args.sol)

    source = {
        "bundle_doi": "10.17189/vwva-ms24",
        "data_product": TAB_NAME,
        "label_product": XML_NAME,
        "data_url": TAB_URL,
        "label_url": XML_URL,
        "data_sha256": tab_hash,
        "label_sha256": xml_hash,
        "data_bytes": tab_size,
        "label_bytes": xml_size,
        "logical_identifier": label.logical_identifier,
        "product_version": label.version_id,
    }

    output = build_output(args.sol, label, records, source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(output, f, separators=(",", ":"), ensure_ascii=False)
        f.write("\n")

    print(f"Parsed {len(records)} records from {TAB_NAME}")
    print(f"Output: {args.output} ({args.output.stat().st_size} bytes)")
    print(f"Data SHA-256: {tab_hash}")
    print(f"Label SHA-256: {xml_hash}")


if __name__ == "__main__":
    main()
