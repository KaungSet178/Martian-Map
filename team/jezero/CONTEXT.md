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

## Shared-test adaptations (data ingestion phase)

Three shared-test assertions were fixture-pinned to the old "no available layers /
illustrative" state and were adapted to follow the manifest, preserving each test's
original semantics (still guarded by the schema's own visualization/routing gates):

- `tests/mission.test.ts` ("cannot imply scientific readiness"): data_status may no
  longer claim `raster_audited`; any available layer must be an Observed overlay
  (recorded-traverse class); routing disabled and null/verified-false targets unchanged.
- `tests/regions.test.ts` (registry): `getAvailableLayers` must return the manifest's
  available layers instead of a hardcoded empty list (gale/oxia still yield []).
- `tests/regions.test.ts` (synthetic renderer): mounted-source count now derives from
  the synthetic region's layer count, and the preview-visibility tail assertion targets
  the last layer instead of a hardcoded index/name.
- `tests/browser/planner.spec.ts`: Jezero no longer shows the schematic empty state, so
  preview/empty-state flows were retargeted to gale (region-agnostic semantics kept,
  gale's own target titles used); the responsive loop now asserts the live scientific
  map for Jezero (`.map-empty` absent, canvas attached) and the empty state for
  gale/oxia. The post-loop preview checks still run on oxia.

## Recorded-traverse integration (data ingestion phase, feat/jezero-map)

First real product integrated; the Jezero scientific map is now live in the shared
frontend. All of this came from the downloadable PDS product, not from tracing images.

- **Product**: PLACES `data_localizations/best_interp.csv` v16.0 (33,458 rows, sols
  0–1897, acquisition 2021-02-18 → 2026-06-21), fetched from the bundle and audited
  locally. The PDS4 label documents 28 columns including planetocentric latitude, east
  longitude, elevation, areoid, radius and sol.
- **Derivation**: `team/jezero/traverse/build_traverse.mjs` copies coordinates (never
  recomputes), drops `-9999` nodata rows (0 found), collapses consecutive duplicates
  (covers the release-16 `ROVER,n,0` elimination via identical SITE entries), decimates
  display vertices to ~10 m (3,502 of 32,978 points), and emits
  `public/maps/jezero/perseverance-traverse.geojson` (78 KB) with full provenance
  properties.
- **Cross-check**: approximate path length **42.785 km** for sols 14–1897 is consistent
  with NASA's odometer statement (45.22 km by 2026-10-11; release data ends 2026-06-21).
  Elevation range −2,586 → −1,786 m areoid-relative matches Jezero relief.
- **Product defect found**: `planetodetic_latitude` is constant (18.346169209) across
  every row of release 16, verified in both `best_interp.csv` and `best_tactical.csv`.
  The column is unusable and its implied ellipsoid cannot be verified from the product.
  PDS release notes invite error reports — worth sending to geosci@wunder.wustl.edu.
- **Display decision**: display coordinates are [east longitude, planetocentric
  latitude] copied from the product. Web Mercator interprets latitude as geodetic
  (~0.1–0.2° distinction at Jezero), so the asset is display-grade pending the SIS
  (PPPCS) ellipsoid review; documented in `map.display_transform.notes`.
- **Config updates**: `map.visualization` available; reviewed
  `mars-geographic-to-maplibre-display` transform (source `jezero-m2020-places`);
  supported extent 77.1868–77.4931 E, 18.4020–18.5197 N (same convention as the asset);
  view center = PLACES SITE 1 landing localization (18.444627, 77.450886 E) with
  provenance status; `reference_surface` (Mars mean sphere, 3,389,500 m display-scale
  metadata) and `vertical_datum` (MOLA areoid; elevation = radius − areoid, verified
  empirically) recorded; `projected_crs` stays pending (the CSV northing/easting define
  a mission-local equidistant-cylindrical-style projection whose parameters still need
  the SIS — do not route on a partial decode).
- **Layer**: new `jezero-traverse-recorded` (kind overlay, evidence **Observed**,
  available, `/maps/jezero/` GeoJSON line, attribution to PDS PLACES bundle, legend,
  default visible). The three pending imagery/terrain/geology layers are unchanged.
- **Version/state**: `dataset_version` → `jezero-traverse-v3`; `data_status` →
  `metadata_verified` (real product audited at metadata level; no raster audited, so
  not raster_audited). Routing stays disabled — a recorded rover traverse is not
  astronaut-route or terrain-safety evidence.

## Blank-map diagnosis and fix (feat/jezero-map)

The v3 integration passed every gate and a headless app probe (canvas mounted, GeoJSON
HTTP 200, no console errors) yet painted nothing. Pixel-scan of a probe screenshot
showed a uniform background: the line was not rendered at all, not merely faint.
Isolation then found the cause in two steps:

1. **Renderer isolation**: a standalone page (copy of MapLibre UMD + the same style,
   source, layer and camera) painted the line correctly — MapLibre, the worker, WebGL
   and the asset delivery were all healthy, so the fault was in the asset itself, not
   the renderer or app wiring.
2. **Live app state probe** (temporary `window.__jezeroMap` hook, removed after): layer
   `visible`, correct color/width/opacity, source loaded, camera clamped by
   `supported_extent` maxBounds to zoom ~12.1 (viewport 18.402–18.520 N) — all correct.

Root cause: **the v3 build script emitted the product's defective
`planetodetic_latitude` column (constant 18.346169) into the output coordinates**
instead of the varying planetocentric latitude, despite the audit having already
flagged that column. The line sat at 18.346 N — below the supported extent's southern
edge (18.402 N) — so the maxBounds-clamped viewport could never show it.

Fix: `build_traverse.mjs` now emits `planetocentric_latitude` in the output
coordinates (consistent with the documented display convention, which it had claimed
all along); asset regenerated (same 3,502 points, 42.785 km); `dataset_version` →
`jezero-traverse-v4`. Also confirmed empirically: this MapLibre version clamps zoom
*up* so the viewport stays inside `setMaxBounds`, so the effective initial zoom is
~12.1 rather than the configured `initial_zoom` 10.

## CTX basemap integration (feat/jezero-map)

The map now shows real Mars imagery under the traverse line.

- **Product**: Murray Lab CTX global mosaic **beta01** (uncontrolled, near-global,
  ~5 m/px), served by Esri as a tiled MapServer
  (`astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer`). All imagery is
  publicly released via the NASA PDS; the Murray Lab grants free use of beta01 with
  credit. Registered as source `jezero-ctx-esri` alongside the CTX archive anchor.
- **Tiling-scheme problem and solution**: the service uses an *equirectangular
  planetary* grid (origin −180/90, 512 px tiles, level *L* = 0.3515625/2^L deg/px,
  GCS `Mars_2000_Sphere`), which MapLibre's Web-Mercator raster source cannot consume
  directly. Solution: **derived self-hosted tiles** —
  `team/jezero/basemap/prepare_ctx_basemap.mjs` (pure Node + zlib, no image
  dependencies) downloads the source tiles over the supported extent and resamples
  them into **351 standard 256 px Web-Mercator XYZ tiles**,
  `public/maps/jezero/ctx-tiles/{z}/{x}/{y}.png`, zooms 5–14 (~8.2 MB), nearest-
  neighbour from source level *L* = z−2, no radiometric processing. Same-origin tiles
  also keep the app offline-capable and free of runtime third-party requests.
- **Datum cross-check (important)**: the mosaic's `Mars_2000_Sphere` GCS means
  geodetic == planetocentric latitude there — independently validating the
  planetocentric display-latitude convention the traverse asset uses. Both layers now
  share one convention; the residual planetocentric-vs-geodetic-on-ellipsoid caveat
  (~0.1–0.2°) stays documented pending the PPPCS ellipsoid review.
- **Service defect (second one)**: ~20 source tiles in this window serve **corrupt
  zlib streams** (truncated final IDAT, "unexpected end of file" on every retry — the
  declared chunk lengths exceed the served bytes). The prepare script retries and
  falls back to the coarser level, so coverage is complete (`samples_without_source:
  0`) with a small softer-than-native patch at zoom 11. Documented in the source
  register; could be folded into the same PDS/Esri feedback email as the PLACES
  planetodetic defect.
- **Layer**: `jezero-optical` (previously pending "Optical imagery") is now the
  **available** "CTX basemap": kind optical, evidence Observed, raster-tiles rendering,
  default visible at 100%, attribution NASA/JPL/MSSS · Caltech Murray Lab · Esri.
  It mounts first, so the traverse overlay paints above it. Terrain and geology
  layers remain pending (CTX imagery is **not** a DEM).
- **Gates/state**: `data_status` → `raster_audited` (first audited raster); routing
  still disabled and `terrain_coverage` still `unknown` — imagery is not terrain-
  safety evidence, so the readiness posture is unchanged. `dataset_version` →
  `jezero-ctx-basemap-v5`.
- **Coordinated shared-test change**: `tests/mission.test.ts` readiness guard updated
  — data_status may now be `raster_audited`, but no fixture may claim
  `terrain_coverage: audited`, available layers must still be Observed evidence, and
  routing/targets guards are unchanged (same semantics, same coordinated-exception
  review class as the earlier adaptations).

**Visual verification**: headless probe screenshot shows the CTX crater-floor imagery
with the recorded traverse above it, both legend chips and combined attribution.
