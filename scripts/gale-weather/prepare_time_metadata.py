"""Generate derived Sol 100 time metadata from the validated REMS JSON."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in __import__("sys").path:
    __import__("sys").path.insert(0, str(ROOT))

from team.gale.weather.mars_time import (
    build_sol100_time_metadata,
    calculate_mars_ls_from_utc,
    martian_year_clancy,
)

DATA_DIR = ROOT / "team" / "gale" / "weather" / "data"
INPUT = DATA_DIR / "rems_sol_00100.json"
OUTPUT = DATA_DIR / "rems_sol_00100_time_metadata.json"


def main() -> None:
    payload = json.loads(INPUT.read_text(encoding="utf-8"))
    field_order = payload["field_order"]
    records = [dict(zip(field_order, row)) for row in payload["records"]]
    metadata = build_sol100_time_metadata(records)

    # Independent cross-check using the product label's UTC start time.
    label_start_utc = datetime(2012, 11, 16, 7, 48, 43, 598000, tzinfo=timezone.utc)
    label_ls = calculate_mars_ls_from_utc(label_start_utc)
    metadata["independent_utc_cross_check"] = {
        "label_start_time_utc": label_start_utc.isoformat(),
        "ls_degrees": round(label_ls, 6),
        "martian_year_clancy": martian_year_clancy(label_start_utc),
        "note": "Ls derived from the PDS4 label START_TIME UTC, independent of REMS TIMESTAMP.",
    }
    metadata["martian_year_clancy_sol100"] = martian_year_clancy(label_start_utc)

    OUTPUT.write_text(json.dumps(metadata, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
