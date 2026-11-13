# Marswalk — Gale Crater regional developer handoff

Owner: **Project coordinator**. Assigned branch: **feat/gale-map**.
Shared integration/architecture branch: feat/shared-ui-redesign, PR #1.
This is implementation guidance, not scientific or operational approval.

## Read and inspect first

Read PRD.md, DESIGN.md, TEAM_CONTRACT.md and docs/REGION_DEVELOPMENT_GUIDE.md.
Inspect status/branch, fetch, and agree the reviewed common baseline before integrating
regional work. Never discard, reset, force-push or overwrite existing teammate changes.
The shared architecture PR does not modify your feature branch. Existing older work
may require a reviewed adaptation; do not copy obsolete shared UI files over the shell.

## Your owned files

- regions/gale/config.ts — identity, scientific question, sources, Mars view/reference,
  map registration, coverage and capability metadata.
- regions/gale/targets.ts — stable IDs, evidence-backed catalog and coordinate status.
- regions/gale/layers.ts — layer metadata, availability, rendering and legends.
- regions/gale/index.ts — consistent named manifest export, validated by regionSchema.
- public/maps/gale/** — small reviewed display assets when available; create this
  directory only when needed. Large source rasters/tiles/caches stay in documented storage.
- team/gale/CONTEXT.md — regional handoff updates. Add source notes under your region
  module as needed; do not introduce an incompatible second manifest/schema.

Shared app/components/lib contracts/registry/renderer/mission/API files, styles,
dependencies, PRD and DESIGN require coordination before edits. Do not fork the shell
or implement a regional routing algorithm. Adding your own target/layer normally changes
only your module or assets; no registry/React change is needed.

## Science focus

Focus: **Curiosity’s exploration corridor around lower Mount Sharp**.
Guiding question: *How do clay-bearing to sulfate-bearing transitions record changing water conditions?*

Curiosity recorded traverse; stratigraphy, clay/sulfate geology; HiRISE/CTX/other documented orbital imagery and terrain; REMS historical atmosphere and RAD historical radiation. Keep rover observations distinct from future astronaut exposure models.

Mission context reference: https://science.nasa.gov/mission/msl-curiosity/location-map/
This contextual link does not independently verify a target, raster, coordinate or hazard.

Do not treat coarse or resampled DEM pixels as independently resolved hazards. Preserve stereo/coarse fallback lineage and actual valid footprints.

## Contracts to follow

Use RegionConfig/RegionManifest from lib/contracts/region.ts, Target/ScientificLayer/
SourceRecord from its science.ts composition, and the same regional record ID prefix
gale-. Types are inferred from runtime schemas. No parallel types/ schema is needed.
Preserve existing objective IDs while adding evidence so saved mission v1 records keep
working. Increment dataset_version for substantive scientific changes; coordinate removal
or migration of old target IDs. Unknowns stay null/pending with an explanation.

## Add imagery or a scientific layer

1. Register exact source/product HTTPS URLs, agency/instrument, dates or sol, native
   resolution, processing, legal attribution and limitations in config.source_references.
2. Verify original CRS, latitude/longitude conventions, Mars sphere/reference surface,
   vertical datum, registration, nodata and actual footprint. No Earth-distance defaults.
3. Prepare reviewed display tiles or GeoJSON. Use raster-tiles or geojson rendering in
   layers.ts, HTTPS or /maps/gale/ paths, exact attribution and legend/units.
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
http://127.0.0.1:3000/?region=gale.

Check catalog/map inspection, actual layer visibility/opacity/legend/source details,
missing data, region switching away/back, stop order, one-way requirements, save/open,
JSON interchange and briefs. Review 1440/1024/768/390px layouts and keyboard dialogs.
Software/synthetic tests do not validate real geospatial accuracy or navigation safety.

## PR and scientific gates

Submit a focused PR from feat/gale-map to main with owned paths, source/product IDs,
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


## Milestone G1 - 13 November 2026

Gale scientific map exploration is implemented on `feat/gale-map`, dataset
`gale-g1-v1`. Read [G1_REPORT.md](G1_REPORT.md) for the source inventory, exact
published AOI, projection audit, science catalog, reproduction and limitations.

- Available: NASA Trek Gale CTX display tiles; NASA recorded Curiosity traverse
  with independent PDS planetocentric/east coordinate cross-check.
- Pending: USGS merged DEM subset/quality audit, registered geology, precise
  scientific target geometry, historical REMS/RAD measurements.
- No precise target markers, hazard inference, EVA routes or numeric resource
  estimates. Six feasibility checks remain Unverified.
- Original objective IDs and mission schema v1 preserved. Scientific changes
  require dataset-version updates. Current display registration is not a terrain
  eligibility or navigation-safety review.

Development used an isolated worktree after the main working directory was
switched externally to Jezero. The initial Gale edits in that checkout were
backed up, hash-compared and restored; no teammate changes were discarded.
Only the Gale branch is to be committed/pushed. Do not merge automatically.
