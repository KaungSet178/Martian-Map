"""Command-line interface for the Gale terrain-aware routing engine.

Examples (from the repository root)::

    python -m team.gale.routing.cli audit
    python -m team.gale.routing.cli route \
        --start 137.441633,-4.589467 \
        --end 137.3891532,-4.8256778 \
        --preference lower-terrain-cost \
        --out route.json
    python -m team.gale.routing.cli alternatives \
        --start 137.441633,-4.589467 \
        --via 137.4010487,-4.6347708 \
        --end 137.3891532,-4.8256778 \
        --out alternatives.json
    python -m team.gale.routing.cli demo
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from .datasets import (
    COARSE_DATASET_ID,
    DATA_DIR,
    dataset_specs,
    load_dataset,
)
from .engine import route, route_alternatives

ROOT = Path(__file__).resolve().parents[3]
EXAMPLES_DIR = DATA_DIR / "examples"

# Recorded Curiosity traverse positions.  These are demonstration inputs, not
# certified mission targets.  Start = first recorded position; via = ~6 km
# along the recorded path; destination = last recorded position.
DEMO_WAYPOINTS = [
    [137.4416330, -4.5894670],
    [137.4010487, -4.6347708],
    [137.3891532, -4.8256778],
]
DEMO_NOTE = (
    "Demonstration inputs: recorded Curiosity traverse positions from "
    "public/maps/gale/curiosity-traverse.geojson. They are not certified "
    "mission targets, science-target coordinates, or astronaut traversability "
    "evidence."
)


def _parse_point(text: str) -> tuple[float, float]:
    parts = text.split(",")
    if len(parts) != 2:
        raise argparse.ArgumentTypeError(
            f"expected 'longitude,latitude', received {text!r}"
        )
    try:
        return float(parts[0]), float(parts[1])
    except ValueError as exc:
        raise argparse.ArgumentTypeError(str(exc)) from exc


def _write_or_print(payload: dict[str, Any], destination: Path | None) -> None:
    text = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
    if destination is None:
        sys.stdout.write(text)
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(text, encoding="utf-8")
    print(f"Wrote {destination}")


def _add_common(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--dataset",
        default="gale-hrsc-30m",
        choices=["gale-hrsc-30m", COARSE_DATASET_ID],
        help="Routing dataset. Products are never blended.",
    )
    parser.add_argument(
        "--max-snap-m",
        type=float,
        default=100.0,
        help="Maximum explicit waypoint snap distance in metres (<=250).",
    )
    parser.add_argument("--out", type=Path, default=None)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Gale terrain-aware routing engine"
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    audit = subparsers.add_parser(
        "audit", help="Print dataset provenance and measured coverage."
    )
    audit.add_argument("--out", type=Path, default=None)

    route_parser = subparsers.add_parser(
        "route", help="Compute one shortest or lower-terrain-cost route."
    )
    _add_common(route_parser)
    route_parser.add_argument("--start", type=_parse_point, required=True)
    route_parser.add_argument(
        "--via", type=_parse_point, action="append", default=[]
    )
    route_parser.add_argument("--end", type=_parse_point, required=True)
    route_parser.add_argument(
        "--preference",
        choices=["shortest", "lower-terrain-cost"],
        default="lower-terrain-cost",
    )

    alternatives = subparsers.add_parser(
        "alternatives", help="Compute both objectives on the same graph."
    )
    _add_common(alternatives)
    alternatives.add_argument("--start", type=_parse_point, required=True)
    alternatives.add_argument(
        "--via", type=_parse_point, action="append", default=[]
    )
    alternatives.add_argument("--end", type=_parse_point, required=True)

    demo = subparsers.add_parser(
        "demo", help="Generate the committed real-data route examples."
    )
    demo.add_argument(
        "--dataset",
        default="gale-hrsc-30m",
        choices=["gale-hrsc-30m", COARSE_DATASET_ID],
    )
    demo.add_argument("--out-dir", type=Path, default=EXAMPLES_DIR)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    if args.command == "audit":
        payload = {
            "schemaVersion": "gale-routing-audit-v1",
            "regionId": "gale",
            "datasets": dataset_specs(),
            "measured": {},
        }
        for dataset_id in ("gale-hrsc-30m", COARSE_DATASET_ID):
            grid = load_dataset(dataset_id)
            payload["measured"][dataset_id] = grid.stats()
        _write_or_print(payload, args.out)
        return 0

    if args.command == "demo":
        grid = load_dataset(args.dataset)
        out_dir: Path = args.out_dir
        out_dir.mkdir(parents=True, exist_ok=True)
        start, via, end = DEMO_WAYPOINTS

        for preference in ("shortest", "lower-terrain-cost"):
            result = route(grid, [start, end], preference)
            result["demonstrationNote"] = DEMO_NOTE
            result["demonstrationWaypoints"] = [start, end]
            _write_or_print(
                result, out_dir / f"gale-demo-route-{preference}.json"
            )

        alternatives = route_alternatives(grid, [start, via, end])
        alternatives["demonstrationNote"] = DEMO_NOTE
        alternatives["demonstrationWaypoints"] = [start, via, end]
        _write_or_print(
            alternatives, out_dir / "gale-demo-alternatives.json"
        )
        return 0

    grid = load_dataset(args.dataset)
    waypoints = [args.start, *args.via, args.end]
    if args.command == "route":
        payload = route(
            grid,
            waypoints,
            args.preference,
            max_snap_m=args.max_snap_m,
        )
    else:
        payload = route_alternatives(
            grid,
            waypoints,
            max_snap_m=args.max_snap_m,
        )
    _write_or_print(payload, args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
