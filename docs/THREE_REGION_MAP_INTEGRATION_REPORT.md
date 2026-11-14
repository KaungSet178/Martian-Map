# Three-region scientific map integration (I1)

## Sources, baseline, and isolation

- Shared ancestor: `b6cc52dc48f459904543ce68c94dc11d6b4e8800` (shared frontend/region architecture).
- Starting integration baseline / Gale source: `fa081fa14daeabb1e98b7e0c72d73d17b1323e4e`, fetched `origin/feat/gale-full-viewport-basemap`.
- Jezero source: `93ab7362e305dd2a10910729e3073247e99985db`, fetched `origin/feat/jezero-four-layer-standardization`.
- Oxia baseline: `0d1cc2eae0a745a9aeec8c3357c107c0e5ff108c`, fetched existing `origin/feat/oxia-map`. No new Oxia branch was invented.
- Integration branch: `feat/three-region-map-integration`; isolated worktree: `D:/martian-map-three-region-integration`.
- Inspected worktrees and ancestry after fetching origin. Gale/Jezero remote heads matched the supplied revisions. Both source worktrees were clean. The original `D:/martian-map` contained a modified `components/map/map-workspace.tsx` and untracked `team/gale/check_map.mjs`, `team/gale/test_inject.mjs`; all remain untouched.

Gale was selected over the shared ancestor because it already contains the completed M2/M3 waypoint/geodesy work, M4 timeline/resource engines, and latest CTX camera/clipping implementation. Selective regional import avoids Jezero's independent shared renderer, route-candidate UI, and fabricated fallback marker locations. No feature merge, conflict-favoring strategy, reset, or force push was used. No merge conflicts occurred; shared contracts and controls were reconciled explicitly.

## Commit and file inventory

Gale's complete history is retained through the starting parent (not replayed or squashed): `bba8398` viewport/context, `4dbb406` scientific alpha clipping, `cd12700` four-layer preparation, `c7189ca` coverage, `6ea6520` M4 integration, and their ancestors.

Imported from the exact Jezero source:

- `regions/jezero/**`, `public/maps/jezero/**`, `team/jezero/**` (including legacy geological datasets, source labels, coverage geometry, checksums, DEM hillshade generation/verification scripts and existing provenance).
- `tests/jezero-four-layers.test.ts`, `tests/browser/jezero-four-layers.spec.ts` and both `docs/JEZERO_FOUR_LAYER_*` reports.

Imported from the exact Oxia source:

- `regions/oxia/**`, `public/maps/oxia/**`, `team/oxia/**`.
- Reconciled its added-stop marker policy into the existing safe renderer rather than replacing the renderer.

Integration-owned changes:

- `lib/map/scientific-categories.ts`: explicit category/dataset mapping and interpretation.
- `components/science/evidence.tsx`: shared categories, source variants, availability, legends, opacity, coverage, source processing notes, and Jezero's separate verification dimensions.
- `components/map/map-workspace.tsx`: verified scientific targets appear only when added as stops; no fallback coordinates.
- Jezero manifests retain the source branch's mission-limited raster request bounds; the full native envelope is separately documented in scientific metadata.
- `regions/oxia/layers.ts`: retains class colors and values; removes the legend's astronaut-limit claim in favor of a numerical class warning.
- `tests/scientific-categories.test.ts`, `tests/browser/three-region-integration.spec.ts`, existing mission/region/browser regressions: actual regional fixtures and source-backed evidence expectations.
- `scripts/verify-three-region-assets.py`: offline exact Git-blob and SHA-256 preservation audit.
- This report and captured integration evidence.

`lib/mission/**`, `lib/api/**`, all Gale regional manifests, `lib/map/scientific-clip.ts`, and the original scientific rasters are unchanged from the Gale integration baseline. See `THREE_REGION_CHANGE_INVENTORY.tsv` for every staged integration path (before the inventory itself) and `git show --stat` for the final commit inventory.

## Shared scientific-layer architecture

Exactly four scientific sections: Elevation, Hillshade, Slope, Thermal. Gale regional HRSC, global HRSC/MOLA and legacy PDS DEM views are dataset variants within these sections, with independent visibility and opacity controls. Existing mutually exclusive thematic presentation remains: users can turn each category on/off without opaque terrain stacks concealing one another. Basemaps, recorded traverses, coverage outlines and optional geological research layers remain separate. Pending geological datasets remain registered and disabled.

Every scientific dataset retains its legend, physical units or qualitative semantics, source attribution, coverage, limitations and availability. Source links, processing notes and source warnings remain available. Jezero additionally exposes source verification, processing verification and independent registration separately; its existing elevation/slope processing caveats and thermal uncertainty are not hidden behind its regional `raster_audited` status.

## Gale viewport and clipping preservation

The wider genuine NASA Trek CTX context and detailed mission CTX remain intact, as do initial framing, explicit mission fit, responsive padding and normal pan/zoom. The `marswalk-mission` custom protocol clips only science raster presentation alpha. Full Data Coverage restores original scientific footprints. Basemaps, recorded Curiosity traverse, coverage lines, markers and source rasters are outside that presentation mask. No dark collar was substituted. Clipping was not extended to Oxia or Jezero.

Viewport tests compare outer-map pixels under each science overlay, regional/global variants, Full Data Coverage transitions and coverage fitting at 1440 x 900, 768 x 1024 and 390 x 844. They verify the wider optical background remains visible and the scientific footprint expands in full mode.

## Jezero hillshade and objectives

All 518 generated DEM hillshade PNGs and all 393 retained elevation/slope/thermal PNGs match the source inventory hashes. The full native hillshade envelope is 77.22293307697142 to 77.58396402093508 E, 18.306799449686565 to 18.669315006877746 N; alpha, not that rectangle, defines valid terrain support. The existing renderer requests only the mission-supported portion and retains Jezero's existing presentation mask. The full native source envelope is documented separately; source data are not stretched or shifted to the mission rectangle.

Illumination is artificial: azimuth 315 degrees, elevation 45 degrees, 2 m native gradient baseline, strict nodata support. No new hillshade was generated. The original local 1.8 GB DEM was read through an ignored source-cache junction and verified by its reported SHA-256; the actual-tile validator reproduces sampled PNG bytes and cross-tile boundaries exactly. Algorithm tests are engineering checks, separate from real-source validation and independent registration.

The controlled CTX basemap, recorded Perseverance PLACES traverse and published science objectives are preserved. Objectives without audited coordinates remain draft-only, with `coordinates: null`, `coordinate_verified: false` and unavailable routing eligibility.

## Oxia regression findings

Imported the existing authentic CTX, MOLA elevation, MOLA/HRSC hillshade, numerical MOLA slope and qualitative THEMIS night-IR implementation. All 995 public assets are byte-identical to Oxia's source. Region configuration, sources, objective coordinates and mission interactions are retained. Uneven hillshade detail and coarse MOLA effective detail remain explicit. Numerical slope classes do not certify astronaut safety. No Gale raster or Gale mission clipping was applied to Oxia.

## Marker and evidence contracts

The independent Jezero renderer attempted to display unverified objectives at invented positions using undeclared `displayLon`/`displayLat`, causing runtime/type failures. That renderer was excluded. The retained renderer requires verified coordinates and now also follows Oxia's added-stop policy. Marker and waypoint eligibility are not disabled; verified Oxia objectives remain usable, while unverified Jezero objectives remain unplottable.

The canonical `evidenceSchema` already includes `Derived`. Jezero's branch-local mission test incorrectly limited live layers to `Observed`/`Interpreted`. Source-backed DEM derivatives and resampled orbital imagery legitimately use the existing display evidence class. No enum conversion or schema relaxation was needed. Tests explicitly require valid regional lineage for Derived layers and reject missing/foreign sources. Display evidence never promotes coordinate verification, routing readiness or mission feasibility.

## Scientific verification and limitations

Offline preservation audit: **7,282 exact source assets** (Gale 2,163; Jezero 4,124; Oxia 995). See `scripts/verify-three-region-assets.py` and the preserved verification summary. Existing Jezero checksum tests also verify retained/generated tiles, PNG dimensions, metadata bytes and coverage hashes.

No raster values, extents or source coordinates were altered. Native posting is not effective resolution. THEMIS displays qualitative brightness, not Kelvin or thermal inertia. Slope classes are numerical, not astronaut safety thresholds. Jezero's absolute registration remains unverified; shared display transforms do not establish independent geographic control. Legacy Jezero elevation/slope processing limitations remain visible. Oxia's coarse terrain cannot resolve walking-scale hazards. Finite source coverage and transparent nodata remain visible. Existing trajectories remain geometric, not terrain-aware; mission feasibility is unverified.

## Validation

- Full TypeScript unit suite: 342 tests passed, zero failed (including all existing geodesy, timeline, resource-budget, mission persistence and waypoint engines).
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed (Next.js 16.4.6 production build).
- `python -m unittest discover -s team/jezero/terrain -p test_hillshade.py`: 7 passed.
- `python team/jezero/terrain/validate_real_hillshade.py`: passed against the SHA-verified authentic local DEM; sampled PNG bytes deterministic and cross-tile grids equal.
- `python scripts/verify-three-region-assets.py`: passed for all three source commits.
- Browser runs use Chromium and authentic self-hosted tiles against the production app at `http://127.0.0.1:3217`, not mocked tiles. Final browser results: **52 affected cases passed** (9 three-region real-pixel cases; 1 marker/waypoint eligibility case; 3 Gale viewport/clipping; 1 Jezero four-layer; 4 Gale DEM; 34 mission/coverage/placement/persistence/accessibility). The first final-build batch contained the four legacy DEM locator failures; all four were corrected and passed in the separate final DEM run. No complete historical-directory pass is claimed.

Initial findings were corrected transparently: stale pending-region fixtures, legacy preview navigation and marker assumptions, and a shell-encoded panel selector. The legacy DEM test located a footprint by treating all grayscale pixels as the detailed CTX; the new wider CTX invalidated that locator. The test now temporarily hides context to locate the detailed optical footprint, then restores it before retaining the scientific pixel checks. Scientific tolerances were not relaxed.

## Implementation matrix

| Region | Elevation | Hillshade | Slope | Thermal | Browser verified |
|---|---|---|---|---|---|
| Gale | Rendered; all 3 variants | Rendered; all 3 variants | Rendered; all 3 variants | Rendered | Passed at desktop/tablet/mobile |
| Jezero | Rendered | Authentic DEM-derived PNGs rendered | Rendered | Qualitative daytime IR rendered | Passed at desktop/tablet/mobile |
| Oxia | MOLA rendered | Existing MOLA/HRSC rendered | MOLA classes rendered | Qualitative night IR rendered | Passed at desktop/tablet/mobile |

The layer acceptance tests compare actual canvas pixels before/after visibility and opacity changes for every dataset at all three viewports. They also check legends, attribution, coverage text, region switching, runtime exceptions, failed local assets and horizontal overflow.

## Screenshots and browser evidence

Representative region/viewport screenshots are in `docs/screenshots/three-region/`. Full per-dataset UI and 100%-opacity map captures, response logs and pixel-change counts remain in `output/playwright/three-region/`. Gale clipping/viewport screenshots and response records are in `team/gale/viewport/`. Existing imported regional screenshots are labeled upstream evidence and are not substituted for integration verification.

- [Gale hillshade, 1440px](screenshots/three-region/gale-hillshade-1440.png)
- [Gale hillshade, 768px](screenshots/three-region/gale-hillshade-768.png)
- [Gale hillshade, 390px](screenshots/three-region/gale-hillshade-390.png)
- [Jezero hillshade, 1440px](screenshots/three-region/jezero-hillshade-1440.png)
- [Jezero hillshade, 768px](screenshots/three-region/jezero-hillshade-768.png)
- [Jezero hillshade, 390px](screenshots/three-region/jezero-hillshade-390.png)
- [Oxia hillshade, 1440px](screenshots/three-region/oxia-hillshade-1440.png)
- [Oxia hillshade, 768px](screenshots/three-region/oxia-hillshade-768.png)
- [Oxia hillshade, 390px](screenshots/three-region/oxia-hillshade-390.png)

See `THREE_REGION_BROWSER_VERIFICATION.json` for per-dataset visibility/opacity pixel counts, response counts and empty error lists.

## Known issues and deferred work

No weather, radiation, terrain-aware routing or unrelated experimental features were imported. Geological development is deferred without deleting existing geological assets. Mission feasibility remains unverified. The full historical browser directory includes milestone-specific screenshot/audit tools; only the explicitly listed affected suites are claimed as executed. Source acquisition/registration caveats above remain scientific limitations, not resolved accuracy claims.

The first worktree dependency junction could not be resolved by Turbopack's hermetic filesystem. A worktree-local `npm ci` resolved that environment issue without changing dependencies or another worktree.

## Delivery

Final integration implementation commit: `372677ff8c5dea5536febda14faa1b0eec613d59` (`feat(map): integrate Gale Jezero and Oxia scientific maps`). All required validation gates passed before commit creation.
Push status: normal push succeeded to `origin/feat/three-region-map-integration`. `git ls-remote origin refs/heads/feat/three-region-map-integration` returned `372677ff8c5dea5536febda14faa1b0eec613d59`, matching local HEAD. Main is unchanged. This documentation-only receipt records that verified implementation SHA; the receipt is pushed normally and its new branch HEAD is checked again after commit creation.
