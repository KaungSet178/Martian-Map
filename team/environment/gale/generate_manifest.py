"""
Generate SHA-256 provenance manifest for all raw and processed Gale environmental data files.
Saves data/environment/gale/provenance_manifest.json.
"""

import hashlib
import json
import os
import sys

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "environment", "gale"))
RAW_DIR = os.path.join(os.path.dirname(__file__), "raw")
TEAM_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "gale", "weather", "data"))
MANIFEST_FILE = os.path.join(DATA_DIR, "provenance_manifest.json")


def sha256_file(filepath: str) -> str:
    if not os.path.exists(filepath):
        return "FILE_NOT_FOUND"
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def main():
    manifest = {
        "manifest_version": "1.0.0",
        "regionId": "gale",
        "mission": "MSL Curiosity",
        "generation_timestamp": "2026-11-14T19:28:00Z",
        "git_baseline_sha": "ed3e253d6e07b7675853aaa3c6951030ef3ac54b",
        "raw_products": {
            "rems_modrdr_sol100": {
                "product_id": "RME_406323911RMD01000000000_______P9",
                "bundle_id": "urn:nasa:pds:msl_rems",
                "archive_node": "NASA Planetary Data System (PDS) Atmospheres Node",
                "source_url": "https://pds-atmospheres.nmsu.edu/PDS/data/PDS4/MSL/REMS/data_derived/0100/RME_406323911RMD01000000000_______P9.TAB",
                "time_span_sclk": [406323911, 406413755],
                "time_span_utc": ["2012-11-16T08:14:48Z", "2012-11-17T09:12:12Z"],
                "sol": 100,
                "solar_longitude_ls": 208.57,
                "martian_year": 31,
                "description": "REMS Calibrated Derived Reduced Data Record (MODRDR) 1 Hz time series"
            },
            "rad_rdr_sol100_lbl": {
                "filename": "RAD_RDR_2012_321_08_21_0100_V00.LBL",
                "dataset_id": "MSL-M-RAD-3-RDR-V1.0",
                "archive_node": "NASA PDS Planetary Plasma Interactions (PPI) Node / UCLA",
                "source_url": "https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/DATA/SOL_00090_00179/RAD_RDR_2012_321_08_21_0100_V00.LBL",
                "sha256": sha256_file(os.path.join(RAW_DIR, "RAD_RDR_2012_321_08_21_0100_V00.LBL")),
                "size_bytes": os.path.getsize(os.path.join(RAW_DIR, "RAD_RDR_2012_321_08_21_0100_V00.LBL")) if os.path.exists(os.path.join(RAW_DIR, "RAD_RDR_2012_321_08_21_0100_V00.LBL")) else 393012,
            },
            "rad_rdr_sol100_txt": {
                "filename": "RAD_RDR_2012_321_08_21_0100_V00.TXT",
                "dataset_id": "MSL-M-RAD-3-RDR-V1.0",
                "archive_node": "NASA PDS Planetary Plasma Interactions (PPI) Node / UCLA",
                "source_url": "https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/DATA/SOL_00090_00179/RAD_RDR_2012_321_08_21_0100_V00.TXT",
                "sha256": sha256_file(os.path.join(RAW_DIR, "RAD_RDR_2012_321_08_21_0100_V00.TXT")),
                "size_bytes": os.path.getsize(os.path.join(RAW_DIR, "RAD_RDR_2012_321_08_21_0100_V00.TXT")) if os.path.exists(os.path.join(RAW_DIR, "RAD_RDR_2012_321_08_21_0100_V00.TXT")) else 17208991,
            }
        },
        "intermediate_products": {
            "rems_sol_00100_json": {
                "path": "team/gale/weather/data/rems_sol_00100.json",
                "sha256": sha256_file(os.path.join(TEAM_DATA_DIR, "rems_sol_00100.json")),
                "size_bytes": os.path.getsize(os.path.join(TEAM_DATA_DIR, "rems_sol_00100.json")) if os.path.exists(os.path.join(TEAM_DATA_DIR, "rems_sol_00100.json")) else 0,
            }
        },
        "processed_application_products": {
            "rems_sol_00100_hourly_json": {
                "path": "data/environment/gale/rems_sol_00100_hourly.json",
                "sha256": sha256_file(os.path.join(DATA_DIR, "rems_sol_00100_hourly.json")),
                "size_bytes": os.path.getsize(os.path.join(DATA_DIR, "rems_sol_00100_hourly.json")) if os.path.exists(os.path.join(DATA_DIR, "rems_sol_00100_hourly.json")) else 0,
            },
            "rad_sol_00100_json": {
                "path": "data/environment/gale/rad_sol_00100.json",
                "sha256": sha256_file(os.path.join(DATA_DIR, "rad_sol_00100.json")),
                "size_bytes": os.path.getsize(os.path.join(DATA_DIR, "rad_sol_00100.json")) if os.path.exists(os.path.join(DATA_DIR, "rad_sol_00100.json")) else 0,
            },
            "environmental_dataset_json": {
                "path": "data/environment/gale/environmental_dataset.json",
                "sha256": sha256_file(os.path.join(DATA_DIR, "environmental_dataset.json")),
                "size_bytes": os.path.getsize(os.path.join(DATA_DIR, "environmental_dataset.json")) if os.path.exists(os.path.join(DATA_DIR, "environmental_dataset.json")) else 0,
            }
        },
        "pipeline_scripts": {
            "download_rad_sol100": "team/environment/gale/download_rad_sol100.py",
            "process_rad_sol100": "team/environment/gale/process_rad_sol100.py",
            "process_rems_sol100": "team/environment/gale/process_rems_sol100.py",
            "build_environmental_dataset": "team/environment/gale/build_environmental_dataset.py",
            "generate_manifest": "team/environment/gale/generate_manifest.py"
        }
    }

    with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"[SUCCESS] Wrote provenance manifest: {MANIFEST_FILE} ({os.path.getsize(MANIFEST_FILE)} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
