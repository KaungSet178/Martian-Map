"""Verify all baseline Gale assets and protected mission/other-region files."""
import hashlib
import json
import subprocess
from pathlib import Path

BASELINE = "4dbb4062205e76da9fdd23b6d1c0b74f2c94819f"


def main():
    tree = subprocess.check_output(["git", "ls-tree", "-r", BASELINE, "--", "public/maps/gale"], text=True)
    entries = [line.split("\t") for line in tree.splitlines()]
    paths = [path for _, path in entries]
    current = subprocess.check_output(["git", "hash-object", "--stdin-paths"], input="\n".join(paths) + "\n", text=True).splitlines()
    hashes = {}
    for (metadata, name), object_hash in zip(entries, current, strict=True):
        baseline_hash = metadata.split()[2]
        if object_hash != baseline_hash:
            raise ValueError(f"Baseline scientific/basemap asset changed: {name}")
        hashes[name] = {"git_blob": baseline_hash, "sha256": hashlib.sha256(Path(name).read_bytes()).hexdigest()}
    protected = ["regions/jezero", "regions/oxia", "regions/gale/terrain-layers.ts",
                 "regions/gale/targets.ts", "regions/gale/coverage-layers.ts", "lib/mission", "lib/api"]
    subprocess.run(["git", "diff", "--quiet", BASELINE, "--", *protected], check=True)
    result = {"baseline": BASELINE, "original_gale_assets_verified": len(hashes),
              "protected_paths_unchanged": protected, "original_assets": hashes}
    Path("team/gale/viewport/preservation.json").write_text(json.dumps(result, indent=2) + "\n", newline="\n")
    print(f"Verified {len(hashes)} original Gale assets and protected regional/mission code")


if __name__ == "__main__":
    main()
