"""Download the documented MEDA PDS4 sample for Jezero environmental conditions.

This script intentionally uses only the Python standard library. It reads the
public PDS4 directory listings, picks the highest-versioned product for each
requested sensor/sol, downloads the label and CSV, verifies the CSV against the
label-declared MD5, and records provenance in ``cache/download_manifest.json``.

Raw CSVs are large and are never committed. Only the compact derived JSON in
``data/environment/jezero/`` is committed.

Reproduce::

    python -B team/environment/jezero/fetch_meda.py
    python -B team/environment/jezero/fetch_meda.py --sols 100 140

Source bundle:
    https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/
Dataset DOI:
    https://doi.org/10.17189/1522849
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

BUNDLE = "https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda"

# One product family per environmental quantity. Calibrated products are used
# where no derived product carries the physical magnitude (ATS, RDS, ground
# brightness temperature). Derived products are used where they do (PS, RHS,
# wind) because PDS recommends them for science analysis.
PRODUCTS = (
    ("data_calibrated_env", "CAL_ATS"),
    ("data_calibrated_env", "CAL_TIRS"),
    ("data_calibrated_env", "CAL_RDS"),
    ("data_derived_env", "DER_PS"),
    ("data_derived_env", "DER_RHS"),
    ("data_derived_env", "DER_WS"),
)

# Six sols inside 36-315: the only interval in the release-4 derived collection
# where the wind-sensor product exists. All are after the sol-63 humidity
# commissioning limit documented in the bundle README. Sol 265 is used instead
# of 260 because the wind product is absent on several sols (246, 260, 273...).
DEFAULT_SOLS = (100, 140, 180, 220, 265, 300)

HERE = Path(__file__).resolve().parent
CACHE = HERE / "cache"
MANIFEST = CACHE / "download_manifest.json"

PDS_NS = "http://pds.nasa.gov/pds4/pds/v1"
M2020_NS = "http://pds.nasa.gov/pds4/mission/mars2020/v1"
NS = {"pds": PDS_NS, "m2020": M2020_NS}


@dataclass(frozen=True)
class Product:
    collection: str
    sol: int
    token: str
    version: int
    directory_url: str
    label_name: str
    csv_name: str


def bucket(sol: int) -> str:
    """Return the PDS sol bucket directory name for a sol number."""
    if sol < 90:
        return "sol_0000_0089"
    if sol < 180:
        return "sol_0090_0179"
    start = 180 + ((sol - 180) // 120) * 120
    return f"sol_{start:04d}_{start + 119:04d}"


def list_directory(url: str) -> list[str]:
    request = urllib.request.Request(url, headers={"User-Agent": "marswalk-jezero/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            html = response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            # A sensor product can be absent for a sol (for example the wind
            # product on sol 260). That is a documented gap, not a build error.
            return []
        raise
    return re.findall(r'href="([^"/?][^"]*)"', html)


def pick_products(sol: int) -> list[Product]:
    """List a sol directory and return the highest version of each product."""
    found: list[Product] = []
    for collection, token in PRODUCTS:
        directory = f"{BUNDLE}/{collection}/{bucket(sol)}/sol_{sol:04d}/"
        names = list_directory(directory)
        if not names:
            print(f"  - sol {sol:04d} {token}: no product directory")
            continue
        pattern = re.compile(
            rf"^WE__{sol:04d}_+{token}_+P(\d+)\.(CSV|xml)$", re.IGNORECASE
        )
        versions: dict[int, dict[str, str]] = {}
        for name in names:
            match = pattern.match(name)
            if not match:
                continue
            version = int(match.group(1))
            versions.setdefault(version, {})[match.group(2).lower()] = name
        complete = sorted(
            (v for v, files in versions.items() if set(files) == {"csv", "xml"}),
            reverse=True,
        )
        if not complete:
            print(f"  ! sol {sol:04d} {token}: no complete CSV+label pair")
            continue
        version = complete[0]
        found.append(
            Product(
                collection,
                sol,
                token,
                version,
                directory,
                versions[version]["xml"],
                versions[version]["csv"],
            )
        )
    return found


def fetch(url: str, destination: Path, attempts: int = 5) -> None:
    """Download a file atomically, retrying truncated or failed transfers."""
    if destination.exists() and destination.stat().st_size > 0:
        return
    partial = destination.with_name(destination.name + ".part")
    for attempt in range(1, attempts + 1):
        try:
            request = urllib.request.Request(
                url, headers={"User-Agent": "marswalk-jezero/1.0"}
            )
            with urllib.request.urlopen(request, timeout=300) as response:
                expected = int(response.headers.get("Content-Length") or 0)
                data = response.read()
            if expected and len(data) != expected:
                raise IOError(
                    f"truncated transfer: {len(data)} of {expected} bytes"
                )
            partial.write_bytes(data)
            partial.replace(destination)
            print(f"    {destination.name} ({len(data) / 1e6:.1f} MB)")
            return
        except Exception as exc:  # network errors, truncation, timeouts
            print(f"  ! attempt {attempt}/{attempts} failed for {destination.name}: {exc}")
            if partial.exists():
                partial.unlink()
            if attempt < attempts:
                time.sleep(min(2 * attempt, 10))
    raise SystemExit(f"could not download {url}")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def text_of(element: ET.Element, path: str) -> str | None:
    node = element.find(path, NS)
    return node.text.strip() if node is not None and node.text else None


def label_metadata(label: Path) -> dict:
    """Extract provenance and the exact column definition from a PDS4 label."""
    root = ET.parse(label).getroot()

    def text(path: str) -> str | None:
        return text_of(root, path)

    fields = []
    for field in root.findall(".//pds:Field_Delimited", NS):
        fields.append(
            {
                "name": text_of(field, "pds:name"),
                "number": text_of(field, "pds:field_number"),
                "unit": text_of(field, "pds:unit"),
                "description": text_of(field, "pds:description"),
            }
        )

    return {
        "logicalIdentifier": text(".//pds:logical_identifier"),
        "versionId": text(".//pds:version_id"),
        "title": text(".//pds:title"),
        "processingLevel": text(".//pds:processing_level"),
        "releaseNumber": text(".//m2020:release_number"),
        "startTime": text(".//pds:start_date_time"),
        "stopTime": text(".//pds:stop_date_time"),
        "startSol": text(".//m2020:start_sol_number"),
        "stopSol": text(".//m2020:stop_sol_number"),
        "startLs": text(".//m2020:start_solar_longitude"),
        "stopLs": text(".//m2020:stop_solar_longitude"),
        "md5": text(".//pds:md5_checksum"),
        "fileSize": text(".//pds:file_size"),
        "records": text(".//pds:records"),
        "fields": fields,
    }


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sols", nargs="+", type=int, default=list(DEFAULT_SOLS))
    args = parser.parse_args(argv)

    CACHE.mkdir(parents=True, exist_ok=True)
    manifest = (
        json.loads(MANIFEST.read_text("utf-8")) if MANIFEST.exists() else {"sol": []}
    )
    by_sol = {entry["sol"]: entry for entry in manifest["sol"]}

    for sol in args.sols:
        directory = CACHE / f"sol_{sol:04d}"
        directory.mkdir(parents=True, exist_ok=True)
        print(f"sol {sol:04d}")
        products = []
        for product in pick_products(sol):
            label_path = directory / product.label_name
            csv_path = directory / product.csv_name
            fetch(product.directory_url + product.label_name, label_path)
            fetch(product.directory_url + product.csv_name, csv_path)

            metadata = label_metadata(label_path)
            declared = metadata["md5"]
            declared_size = metadata["fileSize"]
            if (
                declared_size
                and csv_path.exists()
                and csv_path.stat().st_size != int(declared_size)
            ):
                csv_path.unlink()
                fetch(product.directory_url + product.csv_name, csv_path)
            actual = hashlib.md5(csv_path.read_bytes()).hexdigest()
            if declared and actual != declared:
                print(f"  ! MD5 mismatch for {product.csv_name}: {actual} != {declared}")
                continue

            products.append(
                {
                    "collection": product.collection,
                    "sensorToken": product.token,
                    "label": product.label_name,
                    "csv": product.csv_name,
                    "labelUrl": product.directory_url + product.label_name,
                    "csvUrl": product.directory_url + product.csv_name,
                    "csvBytes": csv_path.stat().st_size,
                    "csvSha256": sha256(csv_path),
                    "labelSha256": sha256(label_path),
                    **metadata,
                }
            )
            print(f"  + {product.csv_name} v{metadata['versionId']} (md5 ok)")

        by_sol[sol] = {
            "sol": sol,
            "bucket": bucket(sol),
            "products": products,
            "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        }
        # Persist after every sol so an interrupted network run keeps the sols
        # that already verified.
        MANIFEST.write_text(
            json.dumps({"sol": [by_sol[key] for key in sorted(by_sol)]}, indent=2) + "\n",
            "utf-8",
        )

    manifest = {"sol": [by_sol[key] for key in sorted(by_sol)]}
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", "utf-8")
    print(f"wrote {MANIFEST}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
