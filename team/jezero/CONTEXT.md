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

## Target enrichment notes (Phase 3, feat/jezero-map) - superseded by v9

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

## PR #2 (verification pass)

All five gates pass at HEAD (lint, typecheck, test 12/12, build, e2e 16/16). PR #2
opened from `feat/jezero-map` to `main` with full source/coordinate/test/limitation
notes and console screenshots (1440/390). Do not merge automatically; awaiting review.

## Terrain (DEM) integration (feat/jezero-map)

The map now carries a real shaded-elevation layer derived from an audited 1 m DTM.

- **Product**: USGS Astrogeology **Mars 2020 Terrain Relative Navigation HiRISE DTM
  mosaic** `JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40`
  (DOI 10.5066/P9REJ9JN, public domain). Verified before download via the product page,
  ISIS label, FGDC metadata XML and the S3 source index. Uncompressed 32-bit float
  GeoTIFF, 21,400×21,488, 1 m/px, equirectangular (latTs0/lon0), planetocentric,
  D_Mars_2000_Sphere r=3,396,190 m, UpperLeftCornerX/Y = 4577366.0/1106618.0 m,
  GDAL nodata tag −3.4028e+38, footprint 77.2229–77.5840 E / 18.3068–18.6693 N —
  reproduced exactly by the GeoTIFF georeferencing tags. The 1.71 GB source stays in
  local storage (`team/jezero/terrain/`, gitignored) and is never committed.
- **Audit**: `team/jezero/terrain/audit_terrain.mjs` (report `audit_report.json`) —
  structure, georeferencing, nodata and value-range checks all pass. PLACES
  cross-check over **30,445 traverse points**: median DTM−PLACES **+0.025 m**, RMS
  1.6 m, abs P95 **4.3 m** — the areoid-relative vertical datum is verified
  empirically.
  - **First audit run falsely failed** its cross-check gates: the script's row cache
    keyed by row only, feeding every traverse point on a row the first column's
    elevation. `team/jezero/terrain/diag_terrain.mjs` (+ `scan_region_high.mjs`,
    `region_high_scan.json`, `diag_report.json`) localized the anomaly to the script,
    not the data; the bug was fixed and the audit re-run clean. Kept as diagnostic
    provenance.
  - **FGDC value range is understated** in the published metadata: sampled values
    reach −1639.971 m in a contiguous western-rim band (lon 77.25–77.29 E). Confirmed
    **real terrain** by rover ground truth: PLACES sol 1354 records −1786.0 m at
    (18.4575 N, 77.2685 E) and the DTM matches within ~5 m. Recorded as a documented
    metadata caveat, not a data defect.
  - **Jezero_CR parallax caveat quantified**: the USGS-documented uncompensated
    y-parallax in the mosaic's CR stereo components shows up as a small positive bias
    in the traverse bins crossing that area (~+3 m mean, abs P95 ~4.9 m) versus
    ~0.4 m elsewhere. Display-grade acceptable; documented in the layer limitations.
- **Display tiles**: `team/jezero/terrain/build_terrain.mjs` (report
  `build_report.json`) — pure Node TIFF reader, bilinear sampling, **193 self-hosted
  256 px Web-Mercator XYZ RGBA tiles** at `public/maps/jezero/terrain-tiles/{z}/{x}/{y}.png`,
  zooms 5–14 (12,816,609 bytes). Shaded hypsometric elevation: p2–p98 ramp −2620/−1770 m with a
  gamma-0.75 low-end expansion × analytic hillshade (sun 315° az / 45° alt); nodata is
  transparent. Tile ranges are computed from the **region extent**, not the DTM
  footprint, so every tile the clamped viewport can request exists (deep-zoom panning
  cannot 404); tiles west of the DTM are fully transparent. The supported extent's west
  margin (77.1868–77.2229 E) lies outside the DTM and stays transparent. Same
  planetocentric display-latitude convention as the other two layers.
- **Layer**: `jezero-terrain` ("Terrain & slope") is now **available** — raster-tiles
  rendering, evidence **Observed** (required by the shared readiness guard for any
  available layer; the DTM is photogrammetrically measured topography, same
  reasoning class as the CTX mosaic — flagged here for reviewer attention),
  spatial_resolution_m 1, hypsometric legend with units, full limitations (not native
  1 m posts, not route-safety evidence), attribution USGS · NASA/MRO HiRISE · DOI.
  Default hidden, opacity 70%.
- **Capability**: `terrain_coverage` → **`partial`** with source
  `jezero-usgs-trn-dtm` (registered with full provenance). Partial is the honest value:
  the audited DTM covers all of the supported extent except the west margin. **No
  shared-test change was needed or made** — the existing guard forbids
  `terrain_coverage: "audited"` and "partial" passes it; the guard's invariant is
  intact.
- **Version/state**: `dataset_version` → `jezero-terrain-v6`; `data_status` stays
  `raster_audited`; `routing.enabled` stays false (terrain presence is not route
  safety — no hazard coverage, no approved policy). `map.display_transform` notes
  extended with the TERRAIN derivation paragraph.
- **Gates**: lint (0 warnings), typecheck, test 12/12, build, e2e 16/16 — all pass.
- **Visual verification**: `team/jezero/screenshots/jezero-terrain-1440.png` (terrain
  over CTX: tan western rim, blue floor, hillshaded relief, legend + attribution) and
  `jezero-terrain-390.png` (mobile panel with terrain enabled).

## Five-layer data set from NASA Mars Trek (region v8)

The map now carries exactly five data layers — **CTX, Elevation, Slope, Geological
units, Thermal** — plus the recorded-traverse overlay. Elevation/Slope come from the
already-audited local DTM (no download); CTX and Thermal come from NASA Mars Trek;
Geology is unchanged.

- **Sources verified live (2026-11-14)** on the Mars Trek WMTS REST endpoint
  `https://trek.nasa.gov/tiles/Mars/EQ/{productLabel}/1.0.0/default/default028mm/{L}/{row}/{col}.png`
  (GetCapabilities + sample tiles). Grid: 256 px tiles, level 0 = 2×1, level *L*
  resolution `0.703125/2^L` deg/px, tile span `180/2^L` deg, origin −180/90; products are
  `Mars_2000_Sphere` (sphere datum ⇒ geodetic == planetocentric). Responses are
  `image/png` color type 4 (gray+alpha, 8-bit) with `Access-Control-Allow-Origin: *`.
- **CTX** — `JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0`, the Mars 2020 TRN
  **Lander Vision System** ("truth") mosaic: orthorectified on CTX DTMs at ~6 m/px,
  same SOC_008/SOC_006 controlled family as the audited TRN DTM, footprint
  77.1605–77.6992 E / 18.2110–18.7212 N (covers the full supported extent), levels 0–13.
  Registered as source `jezero-mars-trek-ctx-lvs`.
- **Thermal** — `THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018`, ~100 m/px, levels 0–9.
  Registered as source `jezero-mars-trek-themis`. Presented as **relative daytime IR
  brightness only** (qualitative legend, no units): the service exposes no verified
  radiometric scaling, so no temperature/thermal-inertia/rock-abundance value is
  asserted. TES thermal inertia (3 km/px) was evaluated and rejected as too coarse.
- **Build tool** — `team/jezero/basemap/prepare_trek_basemap.mjs` (generic WMTS →
  Web-Mercator XYZ reprojector, pure Node + zlib): decodes 8-bit PNG color types
  0/2/4/6, samples nearest-neighbour at source level **`L = z − 1`** (an exact 1:1 match:
  `0.703125/2^(z−1) == 1.40625/2^z` deg/px), preserves source alpha, retries dropped TLS
  connections with backoff, falls back to a coarser level for missing tiles, writes RGBA
  PNG (filter 0) and a JSON report.
  - `node team/jezero/basemap/prepare_trek_basemap.mjs ctx public/maps/jezero/ctx-lvs-tiles team/jezero/basemap/ctx_lvs_report.json`
    → **111 tiles, zooms 5–13, 5,950,878 bytes**; 156 source tiles decoded, 13
    requests outside the mosaic footprint, **0 gaps inside the footprint** (only the
    western edge column is transparent, west of 77.1605 E — the same west-margin clip
    the DTM has).
  - `node team/jezero/basemap/prepare_trek_basemap.mjs thermal public/maps/jezero/thermal-tiles team/jezero/basemap/thermal_report.json`
    → **7 tiles, zooms 5–9, 525,011 bytes**, 25 source tiles, no gaps.
  - Note the sampling convention difference from the retired Esri script: 256 px source
    tiles are 1:1 at `L = z−1`, whereas the 512 px Esri source used `L = z−2`.
- **Elevation** — the former "Terrain & slope" layer is renamed (id
  `jezero-terrain` → **`jezero-elevation`**); tiles/derivation unchanged
  (`terrain-tiles/`, 193 tiles, 12,816,609 bytes, zooms 5–14; ranges now span the
  region extent so deep-zoom panning cannot request a missing tile).
- **Slope** — new `team/jezero/terrain/build_slope.mjs` (report
  `team/jezero/terrain/slope_report.json`), derived from the same audited 1 m DTM, no
  download: `slope = atan(sqrt((dz/dx)² + (dz/dy)²))`, central differences on the
  display grid, **Mars** ground spacing `2πR·cos(lat)/(256·2^z)` with
  R = 3,396,190 m (the hillshade in `build_terrain.mjs` still uses a display-only
  Earth-sphere constant for shading — that is cosmetic, slope has units, so it uses
  Mars spacing). **193 tiles, zooms 5–14, 15,122,994 bytes** (ranges span the region
  extent, not just the DTM footprint, with transparent west-margin tiles), 0–35° ramp,
  nodata transparent. Sampled distribution over the coverage: **p50 4.4°, p90 15.4°,
  p98 22.6°** (max 54.4°). Explicit limitation: the measurement baseline is the
  display pixel (~10 m at z14, ~19 m at z13, ~5 km at z5), so low zooms show a smoothed
  regional gradient, and slope alone is not bearing strength, rock abundance or
  trafficability.
- **Layer list / defaults** — `jezero-optical` (CTX, z5–13, visible 100%), then
  Elevation (hidden, 70%), Slope (hidden, 70%), Geology (unchanged, hidden, 70%),
  Thermal (hidden, 70%), then the traverse overlay (visible, 90%). Non-optical layers
  stay mutually exclusive (radio behaviour in `updateLayerState`), optical layers stack.
- **Retired assets** — `public/maps/jezero/ctx-tiles/` (351 tiles, 8.2 MB, uncontrolled
  Murray Lab beta01) was **removed** in v8 and `jezero-ctx-esri` is marked superseded but
  kept registered. The old derivation script is kept for reference.
- **Version/state** — `dataset_version` → `jezero-trek-layers-v8`; `data_status` stays
  `raster_audited`; `routing.enabled` stays false; `terrain_coverage` stays `partial`
  with the slope note added. Replaced assets: the five layers total **38.4 MB** of
  committed tiles (CTX 5.95, elevation 12.82, slope 15.12, geology 4.02, thermal 0.53 MB)
  minus the 8.2 MB retired set ≈ **+30.2 MB net**. The growth is concentrated in the
  elevation/slope sets whose tile ranges now span the full region extent (region-extent
  ranges trade ~8.5 MB of extra transparent edge and deeper tiles for 404-free
  deep-zoom panning).
- **Coordinated shared changes** (flagged for review):
  1. `components/map/map-workspace.tsx`: `maxZoom` **10 → 13** so the z11–13 CTX tiles
     are reachable; `maxBounds` still clamps panning to the supported extent. NOTE: with
     `maxBounds` active MapLibre auto-raises the initial view to ~13 to fit the bounds,
     so the map now opens at the deepest CTX detail instead of the old effective ~12.1.
  2. `components/map/map-workspace.tsx`: removed the **unused, invalid `osm` raster
     source** that had been added in the uncommitted working tree
     (`url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"`). A raster source's
     `url` is a TileJSON endpoint in MapLibre and `{s}` is unsupported there, so the
     source failed to load, fired the renderer `error` event and permanently set the
     "Map renderer unavailable" banner (which also disabled the zoom controls). No layer
     ever referenced it, and Earth OSM imagery is not valid content for a Mars map. The
     cursor/`wheelZoom`/container-height edits in that working tree are preserved.
  3. `tests/regions.test.ts`: the renderer mount test hard-coded `region-jezero-geology`
     as the third layer; it now derives the id from `region.layers[2]` so adding layers
     no longer breaks a content-independent renderer test (same intent, no relaxed
     assertion).
- **Gates (2026-11-14)**: `npm run lint` clean, `npm run typecheck` pass, `npm test`
  12/12, `npm run build` pass, `npm run test:e2e` **16/16**. No console/page errors in the
  visual pass.
- **Visual verification** — `team/jezero/screenshots/verify_layers.mjs` (helper, not a
  gate): `jezero-layers-1440.png` (default), `jezero-layers-zoom13-1440.png` (z13 CTX
  detail; the controlled mosaic resolves the delta front, and the traverse overlay sits
  on it without the old banner), `jezero-elevation-1440.png`, `jezero-slope-1440.png`,
  `jezero-geology-1440.png` (SIM 3464 unit fills align with the new basemap),
  `jezero-thermal-1440.png`, `jezero-layers-390.png` (mobile, thermal legend visible).
- **Known limitation to carry forward**: at z13 the CTX display samples ~10 m/px, so the
  native ~6 m product is not fully resolved. Extending CTX to z14 with source level L13
  (+~4.5 MB tiles) is the documented next step, deliberately not taken here to bound the
  committed tile budget.

## Published Mars 2020 science objectives (region v9)

The three placeholder scenario targets were replaced by the **real, published Mars 2020
Perseverance science objectives**. Before this change every Jezero target was
hand-authored: descriptions began "Scenario objective: ...", `evidence` was `"Scenario"`,
`verification` was `"scenario"`, and `CONTEXT.md` recorded them as enrichment prose rather
than source-derived objectives. They were never the mission's actual objectives.

- **Source verified live (2026-11-14)**: `https://science.nasa.gov/mission/mars-2020-perseverance/science-objectives/`,
  now registered as `jezero-m2020-science-objectives`. The page groups the mission into
  four areas (Geology, Astrobiology, Sample Caching, Preparation for Humans) with numbered
  sub-objectives. The peer-reviewed mission overview (Farley et al. 2020, DOI
  10.1007/s11214-020-00762-y) was already registered as `jezero-m2020-mission-overview`.
- **Five targets** (`regions/jezero/targets.ts`), preserving IDs 1-3 so saved mission v1
  records keep resolving, plus two new IDs:

  | ID | Title | NASA basis |
  |---|---|---|
  | `jezero-objective-1` | Jezero geology and climate record | Geology 1-3 |
  | `jezero-objective-2` | Ancient habitability assessment | Astrobiology 1 |
  | `jezero-objective-3` | Sample caching for Mars Sample Return | Sample Caching 1-2 |
  | `jezero-objective-4` (new) | Biosignature search | Astrobiology 2-3 |
  | `jezero-objective-5` (new) | Human-exploration preparation | Preparation 1-4 |

- **Honesty rules**: the objective text is real and paraphrased from the published page
  and mission overview, but **no target coordinate is asserted**. All five stay
  `coordinates: null`, `coordinate_verified: false`, `verification: "pending"`,
  `routing_eligibility: unavailable` (reason: published objective, no source-audited
  coordinate), `priority_category: "Published Mars 2020 science objective - location
  pending"`. `evidence` changed `"Scenario"` → `"Interpreted"` because the objective
  content is a published interpretation, not a hypothetical demonstration input. Jezero
  is a scientific-map region, so null-coordinate targets render no markers; Gale and Oxia
  keep their scenario targets and UI copy.
- **Version**: `dataset_version` → `jezero-objectives-v9`, so saved plans show the
  "Dataset version changed. Revalidate this plan against current evidence." notice.
- **Tests**: the five e2e references to the old title `"Delta sediment exposure"` now use
  `"Jezero geology and climate record"`; the round-trip test still asserts
  `target_ids: ["jezero-objective-1"]`.
- **Explicitly out of scope**: named rover campaign waypoints, real sample-site
  coordinates and PLACES/sample-dossier mapping. Those require a separate per-product
  coordinate audit and must not be inferred from the objective text.

## Route-candidate display (region v9, no backend)

The map can now draw **selected route candidates**, but only from a loaded, versioned
route result. Nothing is calculated or drawn while routing is unavailable, so Jezero
still shows no route by default and the Review panel still reports the missing inputs.

- **Contract addition** (`lib/contracts/planning.ts`): candidate results may carry an
  optional `display_geometry` array of `{ latitude, longitude_east }` (planetocentric
  latitude, east longitude 0-360). It is **display-only**: the planning service must
  reproject the same audited route it returned in `geometry`; the client never derives
  a route from projected coordinates because no Mars projection transform has been
  reviewed. A candidate without `display_geometry` stays in the comparison list and is
  reported as "No display geometry · not plotted".
- **Import rules** (`components/planner.tsx`): the Review panel accepts a JSON
  `routeResponseSchema` result. A result is accepted only when it is `candidates`, its
  `region` matches the open region, and its `dataset_version` matches both the current
  catalog and the open plan. `unavailable` / `error` results and invalid or mismatched
  files are rejected with an explicit reason. Any mission edit, mission import, or
  region switch clears the loaded result, so stale geometry can never stay on the map.
- **Map rendering** (`components/map/map-workspace.tsx`, `lib/map/routes.ts`): the
  selected candidate is a solid cyan line with a dark casing; other plottable
  candidates are dashed. The renderer adds/removes one GeoJSON source and three layers
  from the loaded result only; preview mode and regions without a scientific map draw
  nothing. A caption names the selected candidate and its validation state
  (`Experimental` / `Scientifically reviewed`).
- **Tests**: `tests/regions.test.ts` covers the display conversion (including the
  >180° east-longitude wrap), the fail-closed path for projected-only candidates and
  selected feature flags. `tests/browser/planner.spec.ts` imports a synthetic candidate
  result, checks solid/dashed display and selection, confirms projected-only candidates
  are not plotted, and confirms a mission edit clears the overlay.
- **Still required before real use**: a connected planning service, reviewed route
  geometry and projection, and audited coverage/assessments. The imported fixture in
  tests is software-test data and is not a real Jezero route.
- **Visual verification**: `jezero-route-candidates-1440.png` and
  `jezero-route-selected-science-1440.png` were captured with a synthetic result to
  verify line styling and the status caption; they are not evidence of a real route.
