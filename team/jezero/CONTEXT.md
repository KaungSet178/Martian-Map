# Marswalk — Jezero Crater regional developer handoff

Owner: **Aung Khant Min**. Assigned branch: **feat/jezero-map**.
Shared integration/architecture branch: feat/shared-ui-redesign, PR #1.
This is implementation guidance, not scientific or operational approval.

## Read and inspect first

Read PRD.md, DESIGN.md, TEAM_CONTRACT.md and docs/REGION_DEVELOPMENT_GUIDE.md.
Inspect status/branch, fetch, and agree the reviewed common baseline before integrating
regional work. Never discard, reset, force-push or overwrite existing teammate changes.
The shared architecture PR does not modify your feature branch. Existing older work
may require a reviewed adaptation; do not copy obsolete shared UI files over the shell.

## Your owned files

- regions/jezero/config.ts — identity, scientific question, sources, Mars view/reference,
  map registration, coverage and capability metadata.
- regions/jezero/targets.ts — stable IDs, evidence-backed catalog and coordinate status.
- regions/jezero/layers.ts — layer metadata, availability, rendering and legends.
- regions/jezero/index.ts — consistent named manifest export, validated by regionSchema.
- public/maps/jezero/** — small reviewed display assets when available; create this
  directory only when needed. Large source rasters/tiles/caches stay in documented storage.
- team/jezero/CONTEXT.md — regional handoff updates. Add source notes under your region
  module as needed; do not introduce an incompatible second manifest/schema.

Shared app/components/lib contracts/registry/renderer/mission/API files, styles,
dependencies, PRD and DESIGN require coordination before edits. Do not fork the shell
or implement a regional routing algorithm. Adding your own target/layer normally changes
only your module or assets; no registry/React change is needed.

## Science focus

Focus: **Perseverance’s exploration area, including the western delta**.
Guiding question: *What do ancient lake and delta deposits reveal about habitability?*

Perseverance recorded traverse and source-backed science/sample context; delta/sedimentary formations; HiRISE/CTX imagery and terrain; MEDA historical environmental observations. Proposed astronaut sampling is not a completed observation.

Mission context reference: https://science.nasa.gov/mission/mars-2020-perseverance/location-map/
This contextual link does not independently verify a target, raster, coordinate or hazard.

Verify downloadable traverse geometry; do not trace a map image and assert survey precision. Record terrain mosaic coverage/confidence, native vs resampled resolution and unknown terrain.

## Contracts to follow

Use RegionConfig/RegionManifest from lib/contracts/region.ts, Target/ScientificLayer/
SourceRecord from its science.ts composition, and the same regional record ID prefix
jezero-. Types are inferred from runtime schemas. No parallel types/ schema is needed.
Preserve existing objective IDs while adding evidence so saved mission v1 records keep
working. Increment dataset_version for substantive scientific changes; coordinate removal
or migration of old target IDs. Unknowns stay null/pending with an explanation.

## Add imagery or a scientific layer

1. Register exact source/product HTTPS URLs, agency/instrument, dates or sol, native
   resolution, processing, legal attribution and limitations in config.source_references.
2. Verify original CRS, latitude/longitude conventions, Mars sphere/reference surface,
   vertical datum, registration, nodata and actual footprint. No Earth-distance defaults.
3. Prepare reviewed display tiles or GeoJSON. Use raster-tiles or geojson rendering in
   layers.ts, HTTPS or /maps/jezero/ paths, exact attribution and legend/units.
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
http://127.0.0.1:3000/?region=jezero.

Check catalog/map inspection, actual layer visibility/opacity/legend/source details,
missing data, region switching away/back, stop order, one-way requirements, save/open,
JSON interchange and briefs. Review 1440/1024/768/390px layouts and keyboard dialogs.
Software/synthetic tests do not validate real geospatial accuracy or navigation safety.

## PR and scientific gates

Submit a focused PR from feat/jezero-map to main with owned paths, source/product IDs,
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

## Source research notes (Phase 2, feat/jezero-map)

Verified against live archives on 2026-11-12 and registered in
`regions/jezero/config.ts` (`dataset_version: jezero-sources-v2`):

- `jezero-mission-context` — NASA Perseverance location map (existing). Enriched with
  the page's own About-This-Map statement: HiRISE-derived high-resolution base map of the
  initial exploration area, ESA Mars Express HRSC regional color map, and a mission DEM
  statement. Still contextual only.
- `jezero-m2020-places` — Mars 2020 Rover PLACES Bundle, PDS Geosciences Node
  (`urn-nasa-pds-mars2020_rover_places`, release 16 covers sols 0–1897 through
  2026-06-21). This is the traverse-geometry source: downloadable localizations exist,
  but per-product verification of site-frame vs cartographic coordinates is still
  required before any display use. No geometry is asserted in the module yet.
- `jezero-meda-environment` — MEDA archive, PDS Atmospheres Node
  (`mars2020_meda`, DOI 10.17189/1522849, certified). Historical point observations
  (CSV); linked to the `jezero-environment-context` contextual dataset, which remains
  `unavailable` because no products or exposure models are integrated.
- `jezero-m2020-sample-dossier` — Sample Dossier Bundle, PDS Geosciences Node. Bundle
  URN/products still to be confirmed during target-evidence selection.
- `jezero-hirise-archive` / `jezero-ctx-archive` — verified PDS archive anchors
  (hirise-pds.lpl.arizona.edu/PDS; pds-imaging.jpl.nasa.gov MRO volumes). No specific
  Jezero product selected yet; optical/terrain layers stay pending.

Considered but NOT registered (could not be verified this session): Murray Lab global
CTX mosaic (site unreachable) and a USGS Jezero geologic map (catalog search returned no
parseable result). Revisit during layer work; do not register unverifiable URLs.

Region-level gates intentionally unchanged: `data_status` stays `illustrative`,
coordinates stay null, `routing.enabled` stays false. Bumping `data_status` or
`dataset_version` again requires reviewed product/coordinate evidence.

## Target enrichment notes (Phase 3, feat/jezero-map)

`jezero-objective-1/2/3` IDs are unchanged (saved-plan compatibility). Each now has a
documented geological significance, a clearer description/goal/activity, and `source_ids`
linked into the register:

- objective-1 (delta sediments) and objective-2 (carbonates) reference
  `jezero-mission-context` + `jezero-m2020-mission-overview` (Farley et al. 2020,
  DOI 10.1007/s11214-020-00762-y — new source record, DOI verified live and cited on the
  MEDA archive page).
- objective-3 (sample context) references `jezero-m2020-sample-dossier` +
  `jezero-m2020-places`, with an explicit statement that proposed astronaut sampling is
  not a completed observation.

All three remain `evidence: "Scenario"`, `verification: "scenario"`, coordinates null,
`coordinate_verified: false`, routing unavailable — published interpretations describe
units, not verified stop locations. `dataset_version` was already bumped to
`jezero-sources-v2` this session; no further bump (targets stayed Scenario, no saved-plan
semantics changed).

## Layer provenance notes (Phase 4, feat/jezero-map)

All three layers stay `pending` with `rendering.kind: "unavailable"` (no audited Jezero
product exists yet); they now expose provenance anchors:

- `jezero-optical` → `source_id: jezero-hirise-archive`; limitations spell out the exact
  path to availability: select a specific HiRISE/CTX product, audit CRS/convention/
  footprint/nodata/resolution, prepare a reviewed display transform.
- `jezero-terrain` → `source_id: jezero-hirise-archive`; limitations note the mission's
  rover-driving DEM statement (NASA page) is not a selected public product, and a DEM is
  not route evidence.
- `jezero-geology` → `source_id` stays null (no registered product; USGS/university
  Jezero geologic maps still need location and verification before registration).

`index.ts` needed no change; the named `jezero` export still validates through
`regionSchema`.

## Verification notes (Phase 6, feat/jezero-map)

- `npm run lint`, `npm run typecheck`, `npm test` (12/12), `npm run build`,
  `npm run test:e2e` (16/16) all pass after the Phase 2–4 changes.
- One **shared test file** was touched and must be called out for review:
  `tests/browser/planner.spec.ts` asserted the literal `shared-ui-fixture-v1` dataset
  version in the mission JSON round-trip test. The documented version bump to
  `jezero-sources-v2` changed what a correct round trip carries, so the test now expects
  `jezero.dataset_version` (same assertion semantics, version derived from the region
  manifest instead of a pinned string). This is the coordinated shared-change exception
  required by the version bump; reviewed together in the PR.
