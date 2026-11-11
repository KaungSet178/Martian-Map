# Team Integration Contract — v0.1

## Working agreement
Three teammates build **regional content in parallel**, not three different apps. The app shell, routing implementation, coordinate contract, types and acceptance tests are shared.

| Owner | Region | Deliverables |
| --- | --- | --- |
| You | Gale | Source inventory, candidate AOI(s), geology/science targets, terrain provenance (HiRISE vs CTX/HRSC/MOLA), REMS/RAD historical layers |
| Teammate 2 | Jezero | Source inventory, candidate AOI(s), HiRISE mosaic/quality, Perseverance targets, MEDA historical data |
| Teammate 3 | Oxia | Source inventory, candidate AOI(s), stereo vs ML-derived DEMs, clay geology, proposed (not actual) rover exploration |

## Repo structure proposal
```
app/                  # Next.js frontend and routes
components/map/       # Shared map, layers, markers, route overlay
components/mission/   # Mission editor, comparison, brief
lib/contracts/        # TypeScript types / JSON schema
regions/jezero/       # jezero manifest and curated targets
regions/gale/         # gale manifest and curated targets
regions/oxia/         # oxia manifest and curated targets
services/planning/    # Shared FastAPI routing and feasibility service
scripts/geospatial/   # GDAL/Rasterio preprocessing and audits
```

## Required region manifest fields
`id`, `name`, `mission_context`, `coordinate_system`, `view_center`, `data_status`, `layers[]`, `targets[]`, `routing`, `source_references[]`, `dataset_version`.
- `data_status`: `illustrative` | `metadata_verified` | `raster_audited`.
- Each layer has `id`, `type`, `availability` (`available` | `unavailable` | `pending`), `source_id`, `observation_date`, `spatial_resolution_m`, `coverage`, `limitations`.
- Each target has `id`, `title`, `scientific_goal`, `priority_category`, `coordinates`, `coordinate_verified`, `source_ids[]`, `activity`, `media_source` optional.
- `routing`: `enabled` boolean, `reason` string, `eligibility_dataset_id` optional, and `policy_version` optional.

## Shared API sketch (planned; NOT an implemented backend)
- `GET /v1/regions` — region listings and availability
- `GET /v1/regions/{id}` — manifest, layers, targets, and coverage
- `POST /v1/missions/route-options` — mission stops, type, constraints, dataset versions; returns feasible/unavailable route options with evidence
- `POST /v1/missions/assess` — six feasibility components, limitations and overall status
- `POST /v1/missions/brief` — downloadable report (later)

## Merge and review rules
1. Validate manifest schema before merge.
2. Do not hardcode targets, layers, or map coordinates into shared UI.
3. An unavailable dataset is a valid region contribution if the limitation is explained.
4. Do not mark targets georeferenced until coordinates/source conventions are verified.
5. Never substitute Earth distance functions for Martian coordinate calculations.
6. Prototype illustrative paths MUST NOT be mistaken for computed NASA-backed routes.
7. Each PR includes a screenshot, provenance notes, and what remains unverified.

## Shared interface milestone
Start with a complete UX in illustrative mode: switch location, toggle layers, select targets, change mission type, edit stops, view route unavailable/illustrative status, save/reopen locally, and print a mission brief. Replace illustrative data per region as evidence becomes available.

## Gale owner checklist
- [ ] Choose an exact candidate Curiosity science corridor (not the full crater)
- [ ] Record source DOI/URL and effective DEM resolution by coverage patch
- [ ] Identify at least 3 candidate science targets; verify source and planetary coordinates before enabling route selection
- [ ] Separate REMS atmospheric observations from RAD radiation measurements and from EVA dose models
- [ ] Provide geological/mineral layer metadata and limitations
- [ ] Fill `regions/gale/manifest.json`, with `routing.enabled=false` until validation passes
- [ ] Verify source-map alignment and hand off candidate polygons to shared routing owner
