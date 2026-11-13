# G2 shared contract review

13 November 2026 · viewport baseline `6a773a5`.

The existing target contract supports verified points with Mars planetocentric/east
coordinates, registered sources, verification and routing eligibility. Null
coordinates represent unavailable locations. It has no geological-area geometry
or photograph record. GeoJSON fill rendering does not verify a target boundary.

G2 adds optional fields to the existing `targetSchema`:

| Field | Meaning |
| --- | --- |
| `feature_kind` | `geological_area`, `observation_site`, `sampling_site`, `scenario_objective` |
| `location_notes` | Location evidence and uncertainty |
| `boundary` | Only `{status: "unavailable", reason}` is supported in G2 |
| `photographs` | Up to eight independently sourced photographic records |

`photographSchema` requires ID, local source ID, product identifier, HTTPS source
page, image asset, dimensions, alt text, date or Sol, instrument, caption, credit,
association, processing and limitations. Regional validation rejects foreign or
duplicate photo IDs, absent sources and mismatched source URL/product identity.
Each photo source must also appear in its target's source IDs. Geological areas
cannot declare precise point coordinates. Photos never populate coordinates or
change verification/routing eligibility.

All additions are optional without defaults on legacy targets. Jezero/Oxia
manifests, objective IDs, mission v1 JSON and registry APIs remain compatible.
Gale advances to `gale-g2-v1`; saved plans retain the existing dataset-revalidation
flow. No persisted mission schema changes. Shared details render new evidence
conditionally, using existing tokens, badges, native dialog and disclosures.

The user explicitly approved this minimal backward-compatible G2 extension.
No approval from Jezero/Oxia developers or breaking interface change is claimed.
This document is their review handoff. Before future available-boundary work,
coordinate geometry semantics, source/version, CRS/reference surface, footprint,
registration/uncertainty, verification gates, area selection and point-waypoint
behavior. G2 deliberately cannot accept an available polygon. No regional shell,
renderer, timeline, comparison control or advanced shared UI was added.

Tests cover legacy manifests, area-to-point rejection, photo metadata and source
lineage, regional isolation, asset hashes and responsive behavior. Results:
[G2_REPORT.md](G2_REPORT.md).
