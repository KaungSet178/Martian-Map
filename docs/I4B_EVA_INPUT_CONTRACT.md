# I4B input contract from I4A (recommendation only)

I4A does not import R1.1 and does not add another resource calculator. Use the existing derived `missionPlanningSnapshot(mission, region, selectedLiveRoute)` boundary. Do not persist computed geometry as a trusted result.

| Input | Authoritative field / function | Meaning and required guard |
|---|---|---|
| Mission identity and mode | `snapshot.mission.id`, `.region`, `.dataset_version`; `snapshot.plan.mode` | Mission/region scoped; `round_trip` versus `one_way`. Do not infer a return by doubling outbound length. |
| Selected current route | `snapshot.terrain` / `currentTerrainRoute` | Null unless region, model version, request key, selected preference and actual ordered requested endpoints match. Oxia is always null. |
| Receipt | `mission.terrain_route` | `version`, `requestKey`, `preference`, `datasetId`, optional `maxSnapMeters`. Receipt alone never supplies trusted geometry or consumables. |
| Invalidation identity | `terrainRequestKey` | JSON of `[ROUTING_VERSION, mission.id, mission.region, mission.dataset_version, datasetId, maxSnapMeters, plan.mode, plan.waypoints]`. Retain F1 abort/sequence/region protections. |
| Actual segment distances | `snapshot.terrain.segments[i].distanceMeters` | Canonical 3D metres from genuine DEM nodes. `horizontalDistanceMeters` is separately available. Never use engine cost as distance or physiology. |
| Ordered endpoints / return | `snapshot.plan.waypoints`; route `requestedWaypoints`, `segments`, snapped points | Preserve role order and exactly one independently computed return leg for round trips. Match segments to the canonical plan. |
| Stops | waypoint `stop_duration_seconds`, snapshot itinerary `stop_seconds` | Seconds; explicit per-stop input wins. Existing optional `terrain_assumptions.scienceMinutes` is an explicit user fallback. Unspecified input must not become a new certified default. |
| Walking speed | `mission.terrain_assumptions.speed` | User scenario metres/hour. Missing/invalid/nonpositive speed cannot support travel-time estimates. No validated slope/physiology/environment adjustment is present. |
| Travel and stationary time | `snapshot.scenario.timeline` | Seconds, actual terrain-derived segment distances, and explicit stop durations. Use supported status/null checks before model consumption. |
| Route source flags | route `sourceDatasetIds`, `sourceVerified`, `processingVerified`, `registrationVerified`, `warnings` | Genuine grid source/processing support is separate from absolute registration (false) and operational safety (unavailable). |
| Objective science flags | waypoint `evidence`, objective `planning_evidence` | Classification, source IDs, source/processing/coordinate/registration checks, positional uncertainty, representation, precision disclosure and routing eligibility remain independent. Unknown stays null. |
| Existing scenario inputs | `mission.terrain_assumptions`, oxygen/battery reserve percentages | User capacities, rates and powers. Retain provenance and units; do not fill unknown values with NASA-attributed assumptions. |
| Existing resource output | `snapshot.scenario.resources` | Current M4 oxygen/battery research scenarios and breakdown. R1.1 should replace/adapt one calculation boundary, not run a duplicate model beside it. |
| Environment | Existing regional observation adapters | Historical rover-local REMS/RAD/MEDA only; no route-wide future forecast or validated exposure field. Oxia local observations unavailable. |

`lib/routing/planning.ts`, `lib/mission/timeline.ts`, `lib/mission/resource-budget.ts`, route receipt/request-key/hook contracts, genuine grids and engines are unchanged from F1. The current resource path may report INSUFFICIENT_DATA; it is not a NASA-certified life-support assessment. I4B must validate R1.1 sources/units/architecture applicability independently before replacing this boundary. No I4B implementation is started here.
