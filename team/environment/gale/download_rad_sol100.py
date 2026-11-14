"""
Download and verify authentic MSL Curiosity RAD Sol 100 RDR files from NASA PDS PPI.
Dataset: MSL-M-RAD-3-RDR-V1.0
Target: Sol 100 (EDR RDA_406323911ESD_0100_000_0000_M1.DAT / RDR RAD_RDR_2012_321_08_21_0100_V00)
"""

import hashlib
import os
import sys
import urllib.request

PDS_PPI_BASE_URL = "https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/DATA/SOL_00090_00179/"
FILES = {
    "RAD_RDR_2012_321_08_21_0100_V00.LBL": {
        "url": PDS_PPI_BASE_URL + "RAD_RDR_2012_321_08_21_0100_V00.LBL",
        "sha256": "f4ca7b4bd3cfd5a26ba79b83a62709d3d9270665e5e09626cece572373c80b9d",
        "size": 393012,
    },
    "RAD_RDR_2012_321_08_21_0100_V00.TXT": {
        "url": PDS_PPI_BASE_URL + "RAD_RDR_2012_321_08_21_0100_V00.TXT",
        "sha256": "f08b7ccfb6950240e3c869c58ed825e669dcc42a261a82d8871bd90544e30c12",
        "size": 17208991,
    }
}

RAW_DIR = os.path.join(os.path.dirname(__file__), "raw")


def sha256_file(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def download_file(filename: str, meta: dict, dest_dir: str) -> bool:
    dest_path = os.path.join(dest_dir, filename)
    if os.path.exists(dest_path):
        actual_hash = sha256_file(dest_path)
        if actual_hash == meta["sha256"]:
            print(f"[OK] {filename} exists and SHA-256 matches: {actual_hash[:16]}...")
            return True
        else:
            print(f"[WARN] {filename} exists but SHA-256 mismatch: {actual_hash} != {meta['sha256']}. Redownloading...")

    os.makedirs(dest_dir, exist_ok=True)
    print(f"Downloading {filename} from {meta['url']}...")
    req = urllib.request.Request(meta["url"], headers={"User-Agent": "Marswalk-Planner/1.0 (NASA Space Apps)"})
    with urllib.request.urlopen(req) as resp, open(dest_path, "wb") as out:
        while chunk := resp.read(65536):
            out.write(chunk)

    actual_hash = sha256_file(dest_path)
    if actual_hash != meta["sha256"]:
        raise ValueError(f"Checksum mismatch for {filename}: expected {meta['sha256']}, got {actual_hash}")
    print(f"[SUCCESS] Downloaded and verified {filename} ({os.path.getsize(dest_path)} bytes).")
    return True


def main():
    os.makedirs(RAW_DIR, exist_ok=True)
    all_ok = True
    for filename, meta in FILES.items():
        try:
            download_file(filename, meta, RAW_DIR)
        except Exception as e:
            print(f"[ERROR] Failed to download/verify {filename}: {e}", file=sys.stderr)
            all_ok = False
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
