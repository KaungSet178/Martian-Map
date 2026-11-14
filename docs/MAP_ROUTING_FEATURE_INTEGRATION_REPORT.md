# I3A: camera and terrain-routing feature integration

Delivery validation: November 15, 2026 (Asia/Rangoon).

## 1. Foundation, source SHAs and isolation

| Role | Branch | Exact fetched SHA |
|---|---|---|
| Foundation | `origin/feat/environmental-conditions-integration` | `818eeb85db67f0c2440e2acc47024b436e8a1526` |
| Focused Gale camera | `origin/feat/gale-mission-focused-view` | `8fed48cdd4a899969c53cace30a5d81bc6946896` |
| Gale terrain engine | `origin/feat/gale-terrain-routing` | `4453bf2a15391c05dae78663cbdcae3acb9f6220` |
| Jezero terrain engine | `origin/feat/jezero-terrain-routing` | `c53d65afd4937320075fb596d781fe9fb58175a8` |

Fetched origin and inspected registered worktrees, source history, merge bases and changed paths before editing. All four remote heads matched the supplied revisions. The requested worktree did not exist; created `D:/martian-map-routing-integration` on `feat/map-routing-feature-integration` from the environmental foundation. Existing worktrees were not reset, edited or merged. The original `D:/martian-map` still contained the teammate's modified map renderer and two untracked Gale scripts; they were excluded.

## 2. Ancestry and integration strategy

Merge bases with the foundation: camera `eb413d06ea3ceac23ded5b6ab771efbdbd322745`; Gale routing `08ccedb7c635ab89603d6444b30e6fe4f7e7d6d4`; Jezero routing `b6cc52dc48f459904543ce68c94dc11d6b4e8800`. Jezero's routing history includes its older independent shared renderer, so full branch merges would reintroduce unrelated shared application changes. Selective imports were used. No conflict-favoring merges, force pushes, source resets or main merge occurred.

Imported Gale `lib/routing/gale`, `team/gale/routing`, `data/routing/gale`, routing tests/report; Jezero equivalent routing-only directories/tests/report. Imported camera-owned renderer/control/camera utilities, Gale config/layers and camera tests/report, then explicitly reconciled the planner callback and stylesheet into the environmental foundation. Neither ongoing scientific objective-verification branch was imported. No merge conflicts occurred; overlapping shared files were reconciled deliberately.

## 3. Existing planner audit

The foundation's surface waypoints generate explicitly geometric spherical trajectories. Those lines and distances were not terrain-aware. M4 timeline/resource libraries already accept explicit segment distances and scenario inputs, but the shared UI did not connect them to a terrain service. The legacy `routeAvailability` API describes validated scientific-objective/safety routing, which remains unavailable. Manual DEM research routing is a separate capability; it does not activate unverified objective coordinates or promote validated routing readiness.

The existing region registry, objective catalog, waypoint bridge, timeline/resource algorithms, persistence schema-v1, mission brief, scientific evidence controls and Environment tab were inspected. `lib/mission/timeline.ts`, `resource-budget.ts`, `waypoint-bridge.ts`, all environmental modules/data and both regional objective catalogs remain unchanged.

## 4. Changed-file inventory

`MAP_ROUTING_FEATURE_CHANGE_INVENTORY.tsv` records the integration paths. Main integration-owned modules:

- `lib/routing/contracts.ts`: shared validated request/response and saved receipt.
- `lib/routing/server.ts`: region/target/coverage validation and bounded process adapter.
- `lib/routing/metrics.ts`: canonical Mars horizontal/3D terrain metrics from authentic samples.
- `lib/routing/use-terrain-routing.ts`: calculation state, cancellation, stale-response rejection and mission-scoped preference.
- `lib/routing/planning.ts`: existing M4 timeline and resource integration.
- `lib/map/terrain-routes.ts`: actual computed path GeoJSON and alternative styling.
- `components/mission/terrain-routing.tsx`: source, snapping, alternatives, scientific status, statistics and scenario controls.
- `app/api/terrain-route/route.ts`: Node server boundary.
- `scripts/gale-route-runtime.py`, `jezero-route-worker.ts`, `build-routing-worker.mjs`, `check-routing-runtime.mjs`: runtime/build boundaries.
- `scripts/verify-routing-independent.py`, new integration/browser tests and captured evidence.

Shared planner/map/brief/review/model files were changed only to connect those features and reconcile camera behavior. Python dependencies are documented in `requirements-routing-runtime.txt`; esbuild is an explicit pinned build dependency. No scientific display raster bytes were changed.

## 5. Gale camera reconciliation

Gale opens over the detailed Curiosity area; wider CTX is off by default but available from the basemap control and Layers. Explore Curiosity area and Fit complete mission area remain distinct keyboard-accessible controls. Camera fitting remains responsive and does not run on route updates. Jezero and Oxia keep their existing camera logic.

Detailed CTX, Curiosity traverse, the four scientific categories, regional/global variants, opacity/legends, coverage boundaries, Mission View alpha clipping and Full Data Coverage are preserved. The custom scientific clipping protocol was not replaced or extended to other regions.

Browser regressions exposed basemap furniture intercepting mobile waypoint placement taps. `.placing-mode .basemap-control` now hides only that control during placement; the original basemap layers remain intact and controls return afterward. Legacy Gale browser tests were updated to the new complete-mission fit control name. Screenshot review also found the extra fit button extending below a compact map frame. Gale alone now uses a two-column compact toolbar; browser assertions require both camera buttons to lie inside the map and pass center-point hit testing.

## 6. Source engines and scientific comparison

| Property | Gale | Jezero |
|---|---|---|
| Actual search runtime | Original Python A*/Dijkstra | Original TypeScript A*, compiled into isolated Node worker |
| Numeric source | Published HRSC DTM; separate HRSC/MOLA comparison | USGS Mars 2020 TRN HiRISE SOC_006 DTM |
| Runtime grid | 293 x 545 at 30 m; distinct 179 x 238 at 200 m | 604 x 213 at 25 m computational posting |
| Grid availability | 158,013 supported 30 m cells; 41,772 coarse cells | 114,520 valid cells before the slope restriction |
| Derivative support | Horn 3 x 3, approximately 90 m / 600 m | Central differences on block-mean terrain; not native 1 m detail |
| Native distance objective | Horizontal Mars great-circle edge lengths | Horizontal fixed-reference-latitude ground-grid edge lengths |
| Native summary distance | Horizontal | 3D from horizontal steps and DEM differences |
| Canonical integration distance | Mars-sphere 3D distance from actual DEM nodes | Same canonical definition; native summary remains available |
| Native slope summary | Directional edge grade, distance-weighted mean; separate Horn cell slopes | Computational cell slope, vertex arithmetic mean (segment combination retained natively) |
| Displayed common slope summary | Maximum edge grade and horizontal-distance-weighted mean | Same canonical definition; native cell slopes retained separately |
| Lower-cost parameters | Uphill 3, downhill 0.75, cross-slope 0.5; reference 20 degrees; tangent clamp 3 | Slope 2, ascent 3, descent 1; reference 10 degrees |
| Slope restriction | Source support and nodata constraints; no certified hard safety threshold | 25-degree cell barrier, explicitly a computational rule |
| Snapping | Original bounded engine; UI request defaults 100 m | Actual geographic displacement checked against the requested bound |
| Common UI bound | 0-150 m; narrower than Gale's original 250 m hard maximum | 0-150 m |
| Absolute registration | Unverified | Unverified |
| Safety / EVA certification | None | None |

The cost weights are not normalized between engines. Shortest distance minimizes the native horizontal graph objective; it does not promise the shortest 3D or physiological path. Lower terrain cost minimizes its regional formula. Canonical summary metrics do not alter the selected graph nodes or search weights.

## 7. Verified Jezero corrections

The source wrapper had scientific defects that could not safely be preserved:

1. It multiplied projected equirectangular X coordinates by cos(latitude), compressing longitude coverage despite a source projection with standard parallel zero. Coordinate conversion now uses the native 25 m projected posting; ground distances retain their original latitude scaling. Cell-center forward/inverse indexing is consistent.
2. Snapping previously reported cell-index displacement rather than full requested-coordinate-to-snapped-coordinate displacement. Actual Mars geographic displacement is now measured and bounded, including within-cell displacement.
3. The router passed an explicit `undefined` over the default maximum-slope option, disabling its stated 25-degree restriction. The default is now applied explicitly. Start/end slope checks and a steep-barrier regression enforce the documented rule.
4. Diagonal transitions could bridge a nodata/steep corner. Both cardinal side cells must now be supported and below the configured computational limit.

No grid values or source raster coordinates were shifted or regenerated. A*/heap search, regional weights and terrain data remain the original implementation. The changes are validity/georeferencing corrections, not a replacement pathfinder. Tests cover native projected posting, cell-center inversion, actual snapping, barriers, round trips and real multi-waypoint paths.

The upstream Jezero Python replay was run as source evidence, but it mirrors the original compressed coordinate conversion and is not accepted as independent registration or corrected-runtime proof. The new independent validator checks the actual shared TypeScript worker outputs against numeric grid cells and original native TIFF samples instead. The source replay report remains historical provenance.

## 8. Runtime architecture and startup

See [TERRAIN_ROUTING_RUNTIME.md](TERRAIN_ROUTING_RUNTIME.md) for full instructions.

```powershell
npm.cmd ci
python -m pip install -r requirements-routing-runtime.txt
npm.cmd run routing:check
npm.cmd run dev -- --port 3219
# Production:
npm.cmd run build
npm.cmd run routing:check
npm.cmd run start -- --port 3219
```

Gale is invoked directly through Python; no FastAPI service is assumed. Jezero's real TypeScript engine is bundled by predev/prebuild and executed as a Node child. Both run outside the Next.js event loop, with two concurrent workers per server process, a 45-second timeout, cancellation and bounded output. Requests accept 2-12 unique ordered waypoints and at most 32 KiB. Engines use only compact committed numeric data at runtime. Raw multi-gigabyte DEMs are required only for optional scientific revalidation, not application operation.

`MARSWALK_PYTHON` can select a specific interpreter. Missing executable/dependency/grid/hash mismatch or worker timeout leaves routing unavailable with a reason. Node/server and Python runtime are required; static hosting or Edge-only runtimes cannot execute this feature.

The foundation's hardcoded `turbopack.root = D:/` was replaced with `process.cwd()` because dependencies are installed inside the dedicated worktree and deployment must be portable. This is documented portability configuration, not a hidden alternate build. Default Turbopack production build passes; no Webpack fallback was required. Explicit Next.js output tracing includes compact grids, Python modules/adapter and generated Node worker. Actual production API calculations were tested.

## 9. Shared routing contract

Existing regional result shapes were adapted with Zod rather than replaced. The shared contract carries region/preference/status, actual coordinates and segments, horizontal/3D distance, ascent/descent, directional grades, requested/snapped coordinates and displacement, dataset IDs, separate verification flags, warnings and failure reasons. Full native metrics, source coverage and cost metadata are retained under `nativeMetrics`; unavailable results preserve source verification but expose no partial line or fabricated distance.

Current successful routes are `unverified`, with `registrationVerified: false`. Source and processing verification never promote absolute geographic control. Unverified/foreign science targets are checked against the authoritative registry on the server; a browser-supplied verification flag cannot activate them. Manual numeric waypoints are allowed under existing reviewed mission extents and authentic terrain support without requiring verified science objectives.

## 10. Geometry and alternative display

Actual returned coordinate sequences are drawn with dark casing: selected alternative solid cyan, alternative dashed amber. Only the map display conversion wraps east longitudes above 180; scientific coordinates remain east-positive 0-360, planetocentric latitude, `[longitude, latitude]`. No decorative smoothing, invented connector or fallback is inserted.

Computed/loading/failed terrain requests suppress the existing geometric preview. Clearing explicitly restores the labeled geometric preview. Editing waypoints/source/snap/mode invalidates terrain results; stale responses cannot restore them. Region changes remove sources and prevent route leakage. Route updates do not auto-fit the map. Round trips search an actual return leg; it is not a reversed assumption about an asymmetric cost model.

## 11. Distance and terrain statistics

For each valid returned step, canonical horizontal distance is a Mars great-circle distance with radius 3,396,190 m. Canonical 3D distance is `sqrt(horizontal^2 + delta_elevation^2)`. Ascent/descent sum authentic numeric DEM differences. Path grade is `atan2(abs(delta_elevation), horizontal)`; the mean is weighted by horizontal distance. These estimates include grid discretization and DEM noise and are not surveyed odometry.

Native Gale horizontal metrics and native Jezero 3D/fixed-reference-grid metrics remain visible. Native grid-cell slopes are not conflated with directional grades. Nominal posting is not effective resolution. Jezero source, grid-processing and absolute-registration verification remain separate.

## 12. Timeline and resource propagation

The selected valid terrain route supplies its per-leg canonical 3D distances to the existing M4 timeline engine. Ordered stops, explicit science durations and actual return segments are preserved. Users supply a walking-speed scenario; no default astronaut speed is invented. Missing/invalid input does not produce a supported travel-time result.

Existing M4 oxygen/battery engines consume that terrain-based timeline and only user-supplied capacities/rates/powers. Reserve percentages are converted using user capacities; absent coefficients stay `INSUFFICIENT_DATA` and unverified. Cost weights are never used as physiology. Underlying timeline/resource algorithms and environmental data are unchanged. No computed graph route turns mission feasibility green.

## 13. Save/open, JSON exchange, review and brief

Mission schema-v1 remains backward-compatible through optional `terrain_route` and `terrain_assumptions` fields. Saved receipts contain version, request identity, selected preference, source and snap bound; they do not persist large/trusted path geometry. Every reopen/import explicitly invalidates in-memory results and restores the saved draft's source/snap settings before requiring fresh computation. Settings are scoped by mission identity as well as region. Editing source, waypoints or parameters invalidates old calculations. Scenario inputs and existing reserve settings remain saved.

Mission Review acknowledges a selected research terrain route and links back to its alternatives/scenarios; validated science-objective routing and six operational assessments remain independently unavailable/unverified. HTML and on-screen briefs identify preference, terrain source, 3D/horizontal distance, ascent/descent/grade, absolute registration, coverage/processing warnings, environmental availability and unverified resource assessments. Old geometric drafts are never reclassified as terrain-derived.

## 14. Oxia behavior

Oxia retains its own authentic map assets, sources, objectives, camera, mission draft and environmental unavailable panel. The explicit message is: **Terrain-aware routing is not yet available for Oxia Planum.** Existing geometric estimates remain labeled. No Gale/Jezero grid is used to simulate Oxia routing; no terrain route leaks across regions.

## 15. Environment and map preservation

Environmental modules and `data/environment/**` are unchanged from `818eeb8`: historical Gale REMS/RAD sol 100, sparse wind warnings, six Jezero MEDA sols and five independent temperature sensors, solar/UV radiance and ionizing-dose unavailable state, and Oxia unavailable. These observations are not forecasts.

Exact source-asset verification passes for all 7,282 public map assets (Gale 2,163; Jezero 4,124; Oxia 995). A protected-path diff also confirms no changes to public maps, Oxia configuration, environmental implementations/data or Gale/Jezero objective catalogs. Four scientific categories and separate research overlays remain intact. Objective-location verification branches remain deferred.

## 16. Independent numerical checks

`scripts/verify-routing-independent.py` imports neither regional routing engine. It reads actual shared-engine output, compact numeric TIFF/JSON grids and the original Jezero TIFF, and independently verifies:

- Every coordinate maps to a valid terrain cell; steps are eight-connected, with no nodata/steep-corner bridges.
- Requested/snapped displacement and endpoints match reported values and bounds.
- Canonical Mars distances, 3D lengths, ascent, descent and directional grade statistics reproduce independently.
- The shortest path minimizes the native horizontal objective relative to the comparison path; the lower-cost path improves the independently evaluated regional formula.
- Jezero computational block means and pixel-center geography agree with the original SHA-256-verified 1.8 GB native DTM. The native source is read only, never needed by the running app.

At least one authentic route and both alternatives are checked for each region, including outbound/return ordering. Additional shared integration tests exercise three distinct ordered waypoints and exact segment junctions. Synthetic barrier tests are engineering evidence, not invented Mars terrain.

## 17. Automated verification

Final gates pass. See `docs/evidence/i3a/validation-summary.json` for the machine-readable receipt. Commands:

```powershell
$testFiles = Get-ChildItem tests -Recurse -File | Where-Object { $_.Name -match '\.test\.tsx?$' } | ForEach-Object { $_.FullName }
npx.cmd tsx --test $testFiles
python -m unittest discover -s tests -p 'test_gale_*.py'
python -m unittest discover -s team/jezero/routing -p test_synthetic_routing.py
python team/jezero/routing/validate_real_routing.py
python -m unittest discover -s tests/environment/gale -p 'test_*.py'
python -m unittest discover -s tests/environment/jezero -p 'test_*.py'
python -m unittest discover -s team/jezero/terrain -p test_hillshade.py
python scripts/verify-three-region-assets.py
python scripts/verify-routing-independent.py --jezero-dem <authentic-local-source.tif>
npm.cmd run routing:check
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

- Complete TypeScript suite: **432 passed, 0 failed**. This includes 9 shared real-routing integration cases, three distinct ordered waypoints per region, a separate coarse Gale source, unavailable terrain, missing Python and cancellation, persistence and the corrected default Jezero slope barrier.
- Gale Python scientific/routing/weather suite: 149 run, 146 passed, 3 skipped due to an absent optional raw USGS subset. The 41 Gale routing cases pass and include authentic crops and A*/Dijkstra comparison.
- Jezero Python routing algorithm tests: 9 passed; source authentic replay executed with the caveat in section 7.
- Environmental pipelines: Gale 4 passed; Jezero 21 run, 20 passed, 1 optional raw-cache replay skipped.
- Jezero hillshade: 7 passed.
- Independent native terrain/metric/cost checks, source preservation and runtime health checks: passed.
- Typecheck, lint and default production build: **passed** on the delivery implementation.
- **54 unique affected browser cases passed** across the listed suites. Final presentation changes were covered by 14 camera/terrain reruns and 2 mobile mouse/touch reruns; all 10 terrain/region acceptance cases were additionally checked for console errors. The final same-session saved-source/JSON roundtrip case passed after the mission-scoped settings correction.
- Actual development and production APIs both returned authentic computed alternatives for Gale and Jezero. Next.js reported an existing dedicated-worktree development server on port 3000; it was reused for verification rather than terminated. The separate production review app runs on port 3219.

No full historical Playwright-directory pass is claimed. Executed affected suites: terrain-routing-integration, gale-focused-view, environmental-conditions, interactive-waypoints, waypoint-integration, planner and jezero-four-layers. Initial compact-sheet test selector failures, the mobile basemap obstruction and legacy camera-control names were corrected and affected cases rerun.

## 18. Browser screenshots and acceptance

Actual Chromium browser acceptance uses the production Next.js app on port 3219 and authentic local grids/tiles at 1440 x 900, 768 x 1024 and 390 x 844. It verifies actual HTTP calculations, returned geometry, alternatives, canonical statistics, registration warnings, timeline propagation, unknown resources, save/reopen/recompute, downloaded briefs, stale/failure behavior, route isolation, four-layer maps, camera controls, environments, keyboard/accessibility and overflow. Representative screenshots are in `docs/screenshots/i3a/`; complete working captures/response JSON are in `output/playwright/i3a/`.

- [Gale, 1440 x 900](screenshots/i3a/gale-route-summary-1440.png)
- [Gale, 768 x 1024](screenshots/i3a/gale-route-summary-768.png)
- [Gale, 390 x 844](screenshots/i3a/gale-route-summary-390.png)
- [Jezero, 1440 x 900](screenshots/i3a/jezero-route-summary-1440.png)
- [Jezero, 768 x 1024](screenshots/i3a/jezero-route-summary-768.png)
- [Jezero, 390 x 844](screenshots/i3a/jezero-route-summary-390.png)
- [Oxia, 1440 x 900](screenshots/i3a/oxia-map-1440.png)
- [Oxia, 768 x 1024](screenshots/i3a/oxia-map-768.png)
- [Oxia, 390 x 844](screenshots/i3a/oxia-map-390.png)

Numerical evidence: `docs/evidence/i3a/independent-validation.json` and the two authentic QA response files. Browser and independent numerical routes use their explicitly recorded manual demonstration inputs, not newly verified science objectives. The coarse browser response proves source separation.

## 19. Known limitations and outstanding dependencies

Absolute registration is unverified in both regions. Authentic DEM support does not establish astronaut trafficability, surface bearing strength, boulder clearance, hazard certification or safe EVA navigation. Coarse terrain smooths local obstacles; ascent/descent include DEM noise. Fixed-reference-latitude Jezero search metrics are retained as native model assumptions. Native and canonical metrics differ by definition and are labeled separately.

Python and its numeric libraries must be deployed with a full Node server. Large requests may exceed the bounded computation time and return unavailable. Process workers reload compact grids per request rather than depending on a long-lived external service. Scientific objective locations remain restricted to the foundation's registry; ongoing Gale/Jezero verification work is deliberately excluded. No new NASA dataset, weather/radiation estimate or physiological coefficient was introduced.

## 20. Delivery

All implementation and validation gates passed. Implementation commit: `032706f4fa3724f975c445aef942c878930f65d3` (`feat(integration): unify Gale and Jezero terrain routing`). Normal push to `origin/feat/map-routing-feature-integration` succeeded; an independent `git ls-remote origin refs/heads/feat/map-routing-feature-integration` matched that full local SHA. This documentation-only receipt follows that verified implementation commit and is pushed normally as well. The final branch HEAD is the receipt commit; it can be resolved with `git rev-parse HEAD` and checked against the same remote command without a self-referential embedded hash.

Production review: http://127.0.0.1:3219 (HTTP 200 checked after delivery). The working tree is `D:/martian-map-routing-integration`. Main and teammate worktrees remain untouched; the original worktree's one modified renderer and two untracked scripts are preserved. No force-push or main merge occurred.
