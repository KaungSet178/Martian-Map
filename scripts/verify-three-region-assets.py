"""Offline preservation check; does not regenerate or edit scientific assets."""
import hashlib
import json
import subprocess
from pathlib import Path

SOURCES = {
    "gale": "fa081fa14daeabb1e98b7e0c72d73d17b1323e4e",
    "jezero": "93ab7362e305dd2a10910729e3073247e99985db",
    "oxia": "0d1cc2eae0a745a9aeec8c3357c107c0e5ff108c",
}
report = {}
for region, commit in SOURCES.items():
    tree = subprocess.check_output(["git", "ls-tree", "-r", commit, "--", f"public/maps/{region}"], text=True)
    entries = [line.split("\t") for line in tree.splitlines()]
    paths = [path for _, path in entries]
    hashes = subprocess.check_output(["git", "hash-object", "--stdin-paths"], input="\n".join(paths)+"\n", text=True).splitlines()
    for (metadata, path), actual in zip(entries, hashes, strict=True):
        assert metadata.split()[2] == actual, f"Changed scientific asset: {path}"
    report[region] = {"source_sha":commit,"identical_assets":len(paths),"asset_sha256":{path:hashlib.sha256(Path(path).read_bytes()).hexdigest() for path in paths}}
Path("output/three-region-assets.json").write_text(json.dumps(report,indent=2)+"\n")
print(json.dumps({region:{k:v for k,v in record.items() if k != "asset_sha256"} for region,record in report.items()},indent=2))
