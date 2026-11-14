# Marswalk — Oxia Planum regional developer handoff

Owner: **Thaw Thaw Tun**. Assigned branch: **feat/oxia-map**.
Shared integration/architecture branch: feat/shared-ui-redesign, PR #1.
This is implementation guidance, not scientific or operational approval.

## Current state (14 November 2026, `dataset_version` `oxia-slope-v8`)

Data-source rule for Oxia: (1) the Space Apps challenge Resources list (NASA JPL Mars
Trek) first; (2) other NASA sources only where the list cannot cover it, marked tier 2
and cited by exact document and page; (3) no non-NASA sources.

Display area (team-chosen, not a landing ellipse or published map boundary):
17.11–19.15 N, 334.60–336.60 E (display longitude −25.40 to −23.40). View centre
18.20 N, 335.45 E is illustrative. Mars 2000 sphere, R = 3,396,190 m.

### Layers (`regions/oxia/layers.ts`)

| Layer id | Display name | Evidence | Source id | Resolution | Asset (zooms, size) |
| --- | --- | --- | --- | --- | --- |
| `oxia-optical` | CTX basemap | Observed | `oxia-ctx-trek` | CTX ~5 m, displayed to z12 (~20 m) | `/maps/oxia/ctx-tiles/` (z5–12, 841 tiles, ~21 MB) |
| `oxia-terrain` | Regional hillshade (200 m) | Derived | `oxia-mola-hrsc-shade-trek` | 200 m | `/maps/oxia/hillshade-tiles/` (z5–9, 26 tiles, ~1 MB) |
| `oxia-slope` | Regional slope (MOLA) | Derived | `oxia-trek-elevation-profile` | MOLA ~463 m (grid 0.01°) | `/maps/oxia/slope-tiles/` (z5–9, 26 tiles, 33 KB) |
| `oxia-geology` | Mineral detections | Interpreted | `oxia-trek-aqueous` (+ `oxia-trek-hydrous`) | points, ~0.6 km | `/maps/oxia/mineral-detections.geojson` (6 points, 4.7 KB) |
| `oxia-thermal-night` | THEMIS night IR | Observed | `oxia-themis-night-trek` | 100 m (source level 9 ~81 m) | `/maps/oxia/themis-night-tiles/` (z5–10, 75 tiles, 4.8 MB) |

Slope classes: 0–2, 2–5, 5–10, 10–20, >20°. The >20° class marks slopes beyond
NASA's 20° suited-walking figure (tier 2: EVA-EXP-0042 Rev B p.38; ICES-2025-129
p.7). In the display area 56 of 41,205 cells (18.8 km², 0.14 %) exceed 20°, mostly
one patch near 17.21 N, 335.07 E. Mineral detections use one colour because the
shared renderer draws circles in a single colour; each point keeps its class.

### Targets (`regions/oxia/targets.ts`; IDs unchanged)

| Target id | Title | Location (planetocentric N, E 0–360) | Evidence | Sources |
| --- | --- | --- | --- | --- |
| `oxia-objective-1` | Clay-rich bedrock study | 18.22, 335.83 | Interpreted | `oxia-trek-aqueous`, `oxia-trek-hydrous` |
| `oxia-objective-2` | Hydrated silica detection | 17.84, 336.33 | Interpreted | `oxia-trek-aqueous` |
| `oxia-objective-3` | Second clay detection | 18.22, 336.11 | Interpreted | `oxia-trek-aqueous` |

Locations are Mars Trek detection points (two-decimal degrees, ~0.6 km), not sample
sites. All targets keep `routing_eligibility` unavailable.

### Sources (`config.source_references`)

| Source id | What | Tier |
| --- | --- | --- |
| `oxia-ctx-trek` | Mars Trek `CTX_beta01_uncontrolled_5m_Caltech` (tiles served from the Trek-designated astro.arcgis.com CTX MapServer) | 1 |
| `oxia-trek-elevation-profile` | Mars Trek elevation-profile service `multiDEM/interpolated` (DEM "MGS MOLA, Global DEM") | 1 |
| `oxia-mola-hrsc-shade-trek` | Mars Trek `Mars_MOLA_blend200ppx_HRSC_Shade_clon0dd_200mpp_lzw` | 1 |
| `oxia-themis-night-trek` | Mars Trek `THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018` (relative brightness; observation period unconfirmed) | 1 |
| `oxia-trek-aqueous` | Mars Trek `Aqueous_Mineral_Distribution_Options_clon0` (cites Ehlmann & Edwards 2014) | 1 |
| `oxia-trek-hydrous` | Mars Trek `Hydrous_Mineral_Detections_CRISM_clon0` (cites Carter et al. 2013) | 1 |
| `oxia-nasa-eva-exp-0042` | NASA EVA-EXP-0042 Rev B, Exploration EVA System ConOps (Oct 19, 2020), p.38 | 2 |
| `oxia-nasa-ices-2025-129` | NASA NTRS 20250001829, ICES-2025-129 (Kim et al.), p.7 | 2 |
| `oxia-mission-context` | esa.int ExoMars page from the shared fixture; **open question**: remove or replace under the NASA-only rule | — |

### Elevation grid for a future route engine

`public/maps/oxia/elevation-grid.json`: 201 × 205 samples at 0.01° (real MOLA
elevations in metres, areoid-relative, −3791 to −2381 m), row-major north→south,
west→east, with lat/lon axes (display and 0–360 E), nodata −32768, DEM name, source
URL and fetch date. Built by `team/oxia/terrain/build_mola_slope.mjs` (resumable;
`--refetch` samples Mars Trek again). Real detail is MOLA (~463 m); 0.01° spacing only
interpolates it.

The Mars Trek elevation-profile service sends no CORS header, so the browser app cannot
call it directly. Live elevation profiles would need a server-side proxy route (shared
`app/` change, coordinator decision); otherwise use the pre-baked grid.

### Unavailable, and why

- **Radiation / weather:** no landed instrument at Oxia and no applicable Mars Trek
  product; `oxia-environment-context` stays Unavailable.
- **Routing and feasibility:** `routing.enabled` false; no hazard coverage or approved
  routing policy. Regional terrain (MOLA ~463 m, hillshade 200 m) cannot support it.
- **Walking-scale slope / hazards:** not available; MOLA smooths short steep slopes,
  boulders and banks.
- **Planned landing area outline:** Mars Trek has no ExoMars landing ellipse, and
  non-NASA sources are excluded.

### Rebuild scripts (prep-only, outside the app build)

`team/oxia/basemap/prepare_ctx_basemap.mjs`, `team/oxia/thermal/prepare_themis_night.mjs`,
`team/oxia/terrain/prepare_hillshade.py` (Python + Pillow), `team/oxia/terrain/build_mola_slope.mjs`,
`team/oxia/geology/build_detections.mjs`; each writes a build report next to it.
Screenshots: `team/oxia/screenshots/`.

## Read and inspect first

Read PRD.md, DESIGN.md, TEAM_CONTRACT.md and docs/REGION_DEVELOPMENT_GUIDE.md.
Inspect status/branch, fetch, and agree the reviewed common baseline before integrating
regional work. Never discard, reset, force-push or overwrite existing teammate changes.
The shared architecture PR does not modify your feature branch. Existing older work
may require a reviewed adaptation; do not copy obsolete shared UI files over the shell.

## Your owned files

- regions/oxia/config.ts — identity, scientific question, sources, Mars view/reference,
  map registration, coverage and capability metadata.
- regions/oxia/targets.ts — stable IDs, evidence-backed catalog and coordinate status.
- regions/oxia/layers.ts — layer metadata, availability, rendering and legends.
- regions/oxia/index.ts — consistent named manifest export, validated by regionSchema.
- public/maps/oxia/** — small reviewed display assets when available; create this
  directory only when needed. Large source rasters/tiles/caches stay in documented storage.
- team/oxia/CONTEXT.md — regional handoff updates. Add source notes under your region
  module as needed; do not introduce an incompatible second manifest/schema.

Shared app/components/lib contracts/registry/renderer/mission/API files, styles,
dependencies, PRD and DESIGN require coordination before edits. Do not fork the shell
or implement a regional routing algorithm. Adding your own target/layer normally changes
only your module or assets; no registry/React change is needed.

## Science focus

Focus: **the planned Rosalind Franklin landing/exploration area**.
Guiding question: *Which clay-rich and proposed subsurface sampling contexts could illuminate past habitability?*

Published geological mapping, clay-bearing units, orbital imagery, stereo-derived terrain where documented, and proposed science/drilling objectives. There is no completed Rosalind Franklin traverse or local landed weather/radiation record in this package.

Mission context reference: https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Exploration/ExoMars
This contextual link does not independently verify a target, raster, coordinate or hazard.

Keep region_status planned. Distinguish stereo-derived from ML/model-derived elevation and never equate output pixel spacing with measured accuracy. Use planetocentric latitude and east-positive 0–360 longitude; do not confuse the high-east-longitude area with west longitude.

## Contracts to follow

Use RegionConfig/RegionManifest from lib/contracts/region.ts, Target/ScientificLayer/
SourceRecord from its science.ts composition, and the same regional record ID prefix
oxia-. Types are inferred from runtime schemas. No parallel types/ schema is needed.
Preserve existing objective IDs while adding evidence so saved mission v1 records keep
working. Increment dataset_version for substantive scientific changes; coordinate removal
or migration of old target IDs. Unknowns stay null/pending with an explanation.

## Add imagery or a scientific layer

1. Register exact source/product HTTPS URLs, agency/instrument, dates or sol, native
   resolution, processing, legal attribution and limitations in config.source_references.
2. Verify original CRS, latitude/longitude conventions, Mars sphere/reference surface,
   vertical datum, registration, nodata and actual footprint. No Earth-distance defaults.
3. Prepare reviewed display tiles or GeoJSON. Use raster-tiles or geojson rendering in
   layers.ts, HTTPS or /maps/oxia/ paths, exact attribution and legend/units.
4. Missing products use pending/unavailable plus rendering.kind unavailable and a reason;
   they appear in evidence details, not as enabled map controls. Do not invent rasters.
5. Enable map.visualization only after the documented display-transform review,
   source reference, extent and Mars reference metadata are present. Visualization does
   not enable routing. The shared renderer handles source lifecycle, camera and controls.

## Add a scientific objective

Document question, geological significance, proposed field activity, evidence category,
source_ids, region_id and the Mars coordinate_reference. Keep coordinates null and
coordinate_verified false until the actual source convention/location is checked.
Scenario objectives stay clearly labeled; published polygons are not precise invented
sample points. Verified locations require non-scenario evidence and registered sources.
Routing eligibility remains unavailable until audited terrain/hazards/policy support it.

Use Observed / Derived / Interpreted / Modeled / Scenario / Unavailable consistently.
Atmospheric/radiation context belongs in contextual_datasets unless a genuine renderable
product exists. Dates, instrument location and model applicability must remain visible.

## Verify in the shared frontend

Run npm run lint, npm run typecheck, npm test, npm run build and npm run test:e2e
(install Chromium with npx playwright install chromium if missing). Use npm.cmd/npx.cmd
in restricted Windows PowerShell. Start npm run dev and open
http://127.0.0.1:3000/?region=oxia.

Check catalog/map inspection, actual layer visibility/opacity/legend/source details,
missing data, region switching away/back, stop order, one-way requirements, save/open,
JSON interchange and briefs. Review 1440/1024/768/390px layouts and keyboard dialogs.
Software/synthetic tests do not validate real geospatial accuracy or navigation safety.

## PR and scientific gates

Submit a focused PR from feat/oxia-map to main with owned paths, source/product IDs,
coordinate/coverage/resolution notes, screenshots, tests actually run, dataset version
and unresolved limitations. Coordinate shared changes and baseline adaptation explicitly.
Do not merge automatically or push directly to main.

Keep routing.enabled false until reviewed eligibility coverage/policy exists. A DEM is
not a safe route. Experimental routing is distinct from validated routing; all six
feasibility checks need supported evidence/models. The current FastAPI adapter is
unavailable; lib/contracts/planning.ts is a shared proposal, not a running backend.
No fabricated oxygen/battery/time/radiation values or operational certification.

First release is 2D pre-mission planning: no 3D, live tracking, EVA rehearsal or new
offline route computation. Preserve the existing responsive mission-console design.
