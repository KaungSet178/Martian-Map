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


## Viewport/navigation correction - 13 November 2026

See [VIEWPORT_FIX.md](VIEWPORT_FIX.md) for root causes, behavior checks and
before/after screenshots. The reviewed footprint now drives initial fit/reset,
not camera maxBounds. Raster request bounds keep sparse tile requests within the
pack. Mobile map and planning sheet share visible height; ResizeObserver refits
an overview and preserves deliberate user navigation. All 33 G1 display-asset
hashes remain unchanged. Initial-view wording supersedes the older G1 report's
camera-clipping description; scientific provenance and dataset version remain.

## Milestone G2 - 13 November 2026

Gale now uses `gale-g2-v1`. Read [G2_REPORT.md](G2_REPORT.md), the
[evidence register](G2_EVIDENCE_REGISTER.json), and
[shared contract review](G2_CONTRACT_REVIEW.md).

Four geological-area entries have verified NASA photographic associations and
full provenance. Precise feature coordinates and suitable geological boundaries
remain unverified; all remain non-routable, with no new markers or polygons.
Gediz Gazetteer nomenclature geometry exists but is not equated with geological
deposits or sample sites. Optional shared fields preserve Jezero/Oxia manifests
and mission v1 IDs. Future available polygons require regional contract review.
No G3/G4 work has begun.

## Milestone G3.1 - 13 November 2026

Gale now uses `gale-g3-1-v1`. Read [G3_1_REPORT.md](G3_1_REPORT.md),
[geological evidence register](G3_GEOLOGY_EVIDENCE_REGISTER.json), and
[shared renderer handoff](G3_1_CONTRACT_REVIEW.md).

Arc Pass geological units are available as an optional interpreted overlay:
53 source polygons, seven exact Unit codes, about 264 x 222 m inside current CTX
coverage. Source: Joel Davis (2025), Figshare DOI 10.6084/m9.figshare.30401788.v1,
CC BY 4.0, associated Davis et al. (2026) JGR paper. Source FileGDB and processing
are pinned and audited. Default opacity 45%; enabling fits the source footprint.
CTX remains coarse at close zoom; absolute contact accuracy is unspecified.

All catalog target coordinates/boundaries remain unverified; this small mapped
area is not all Gediz Vallis. G1/G2 data and original traverse are preserved.
Meyer clay-sulfate supplementary shapefiles were inspected but not render-validated.
Optional shared categorical/extent fields preserve older regional manifests;
historical context overlays can now coexist with one thematic layer. Coordinate
future shared features through the handoff. G3.2/G3.3 and other enhancements are
not started.

## Milestone G3.2 - 13 November 2026

Dataset `gale-g3-2-v1`: optional real PDS DEM elevation, hillshade and slope views.
Read [G3_2_REPORT.md](G3_2_REPORT.md) and [scientific audit](G3_2_DEM_AUDIT.json).
The inspected 1.05 km native window yields a 1 km projected valid support square.
All native posts are valid; 25 m complete-post averaging and 75 m Horn support
are processing scales, not guaranteed effective resolution. Heights are metres
relative to MOLA areoid, positive up. Mixed HiRISE/CTX quality and absolute errors
remain unquantified. Native coordinates retained without fitted corrections.

**Local CTX co-registration is unverified; direct orthophoto checks suggest a
positional mismatch.** Layers explicitly state this and open at 100% opacity.
Independent DEM inspection is available; precise feature comparison, hazards,
routing and mission/resource calculations remain unsupported. Target locations
and boundaries unchanged. G1/G2/G3.1 assets preserved. Optional raster bounds,
focus and nearest sampling preserve legacy manifests; see report for shared
contract handoff. No G3.3/G4 features started.

## Focused registration investigation - 13 November 2026

Read [REGISTRATION_INVESTIGATION.md](REGISTRATION_INVESTIGATION.md) and the
separate [390px regression report](MOBILE_DEM_REGRESSION.md). Baseline `8e0bc77`
includes the three M1 geodesy cherry-picks, all preserved without edits.

No evidence-supported georeferencing correction: all 1,249,591 audited opaque CTX
pixels reproduce source mapping exactly; PDS labels, GDAL/PROJ and 49,194 mission
rows agree to rounding. This is internal consistency, not ground accuracy. The
area-averaged image comparison has unstable search winners and weak held-out
agreement. Exact Trek control lineage and precise local registration remain
unverified; prior high correlation peaks must not be treated as measured shifts.

All scientific geometry/assets and app behavior unchanged. Operational sampling,
terrain-aware routing, elevation profiles, safety/feasibility calculations and
mineralogy remain out of scope. The separate mobile pixel failure was reproduced
and traced to an opacity-transition baseline race. The test waits for rendered
stability; original thresholds and production renderer are preserved.
