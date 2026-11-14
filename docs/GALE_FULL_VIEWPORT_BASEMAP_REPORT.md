# Gale full-viewport basemap and camera improvement

Date: 2026-11-14, Asia/Rangoon. Branch: `feat/gale-full-viewport-basemap`.

## Baseline and isolation

Starting SHA: **`4dbb4062205e76da9fdd23b6d1c0b74f2c94819f`**, verified by fetching `origin/feat/gale-four-layer-standardization`. This is Antigravity's latest pushed Mission View clipping implementation. The new worktree is `D:/martian-map/output/gale-g1/output/gale-full-viewport-basemap`, inside the authorized writable workspace. No shared branch was merged or force-pushed.

All worktree statuses were inspected first. The root `D:/martian-map` had teammate changes in its shared map component and two untracked Gale helper scripts; those were neither read as a baseline nor edited. The new branch starts from the verified remote commit, not that dirty tree. Existing Jezero work at `93ab736` supplied visual reference screenshots, not a merge or a terrain dataset. No tracked Jezero/Oxia file or mission/routing implementation changes are part of this delivery.

## Screenshot-based diagnosis

The canvas was already full size. Its `position:absolute; inset:0` container, grid/flex allocation and ResizeObserver were functioning. No CSS width fix or imagery scaling was appropriate.

| Viewport | Gale canvas and workspace | Before dark-background pixels | After dark-background pixels |
|---|---|---:|---:|
| 1440 × 900 | 1080 × 788 | 73.82% | 0% |
| 768 × 1024 | 768 × 750 | 68.25% | 0% |
| 390 × 844 | 390 × 570 | 53.77% | 0% |

Measurements are in `team/gale/viewport/before-measurements.json` and `after-{width}.json`. Dark pixels are a display diagnostic near background RGB (13,25,40), not a scientific coverage classifier. After measurements hide map furniture for the canvas capture; before screenshots include overlapping furniture, so these percentages are approximate image-occupancy comparisons. Both show the much larger effect of genuine imagery versus the dark collar. All measured canvases equal their assigned workspace rectangles with no horizontal overflow.

The working Jezero reference fills its own assigned canvas: 1080 × 788 desktop, 768 × 924 tablet, 390 × 744 mobile. Its older shell allocates a different mobile panel height; its sources and camera behavior also differ. Its near-zero dark area does not imply equal Gale/Jezero coverage, resolution or absolute registration. The reference branch has a separately documented pre-existing marker exception; it was used only as a visual reference. Smoke tests for the unchanged Jezero/Oxia manifests in the Gale baseline are separate.

Three factors caused Gale's appearance:

1. Existing `ctx-tiles` deliberately mask outside **137.3442352329006–137.4579431096443°E, -4.822361175063087–-4.580605407446296°N**. This is the tall PDS orbital-map v42.0 mission rectangle, not the whole CTX product.
2. Initial `fitOverview` fitted the entire rectangle with responsive furniture padding. On a wide canvas this produces a thin, contained strip. `initial_zoom=11` was only a fallback, not the active fit policy. Navigation already had no maxBounds and a minimum zoom of 5; maximum zoom is derived from available layers (18 with the local geology overlay).
3. Antigravity's opaque dark fill above **all** raster layers covered anything outside that mission rectangle. Simply inserting a wider background below it would accomplish nothing.

The configured baseline fallback center is 137.40108917127245°E, -4.701483291254691°N with zoom 11. The actual initialized camera comes from `fitBounds`, not those fallback values, and varies with measured canvas size and asymmetric furniture padding. The new initial crop has geometric center 137.405°E, -4.755°N; it is still fitted rather than assigned a fixed zoom. These are display-camera values, never target coordinates.

The native PDS reference image is **26960 samples × 57320 lines** at 0.25m grid spacing. Those are not the dimensions or effective resolution of the CTX mosaic. The WMTS publishes 256px tiles, a global angular matrix with `2^(L+1)` columns × `2^L` rows, and levels 0–12. Native CTX mosaic pixel dimensions and constituent acquisition dates are not stated. Existing detailed display assets are 32 XYZ PNG tiles at zooms 5–13, with zero missing source samples inside the mission crop per the existing G1 audit. Their intentional outside-crop alpha is preserved byte-for-byte.

## Selected authentic background

Reused **the same existing `Gale_CTX_BlockAdj_dd` CTX dataset**, NASA/JPL-Caltech/MSSS via [NASA Trek WMTS](https://trek.nasa.gov/tiles/Mars/EQ/Gale_CTX_BlockAdj_dd/1.0.0/WMTSCapabilities.xml). The authoritative capabilities report a much wider product envelope: **135.1842593–139.2413012°E, -6.5732988–-2.8077809°N**.

The already-integrated USGS processed LRGB color pack has the same narrow mission crop, so it cannot independently fill the wider workspace. HRSC thematic rasters and THEMIS infrared brightness are scientific overlays, not replacements for optical context. An unrelated global product was unnecessary.

The new context is a finite **136.4–138.4°E, -5.6–-3.8°N** display crop inside the original CTX coverage. It contains the mission, regional HRSC and global-derived terrain display extents. It is not an invented expansion of the detailed CTX imagery, not global Mars, and not a newly claimed scientific observation footprint.

`team/gale/viewport/prepare_context.py` reuses the existing G1 inverse-Mercator pixel-center → angular WMTS nearest-neighbor sampler. Output: **207 self-hosted XYZ RGBA PNGs**, zooms **5–11**, **11,565,568 bytes**, under `public/maps/gale/context-tiles/`. Source level is `L=z-1`. At the top level the angular sample spacing is **40.70070478132293m** on the source Mars sphere, versus **10.175176195330733m** for detailed z13 tiles. These are sample spacings, not proven optical resolving power. Mercator encoding is display math; no Earth distance is used.

The freshly retrieved capabilities SHA256 matches the previous G1 audit exactly: `ec61c61162ea6f588666c4acb5d38303016f96175ffa1a0e68b62727ba96e5d2`. Full source-tile and output PNG hashes, request levels/ranges and alpha counts are recorded in `context-report.json`. At z11, **7,663,804 of 7,664,103** crop sample centers have nonzero source alpha; **299** remain missing. Those genuine gaps are not filled. No contrast stretch, colorization, geometric shift, source-bound change, synthetic imagery or resampling of the original detailed/scientific assets occurs.

Source registration follows the existing G1 reviewed planetocentric/east angular convention. The service's ambiguous EPSG::104905 identifier is not treated as Earth or authority for a planetographic conversion. The historical independent PDS correlation diagnostic favors planetocentric sampling (0.4964 versus 0.1635); this is not an absolute horizontal accuracy estimate. Reusing the same source/grid avoids introducing a cross-product fitted alignment, but does not certify the wider crop's independent absolute registration. USGS color/HRSC/local PDS alignment warnings remain unchanged.

## Scientific-only Mission View clipping

The scientific restriction remains **on by default**, with the exact same mission extent. The implementation changes its mechanism for Gale only:

- Optical stack: wider context → unchanged detailed CTX → optional unchanged USGS color.
- Science stack: regional/global/local elevation, hillshade and slope plus THEMIS thermal.
- Vector stack: geology, source coverage outlines, recorded traverse, trajectories and waypoint markers.
- Controls remain DOM overlays above the canvas.

The old dark collar is removed **only for Gale**. Other regions retain their existing mask behavior. A registered [MapLibre custom raster protocol](https://maplibre.org/maplibre-gl-js/docs/API/functions/addProtocol/) creates transparent presentation tiles for Gale topography/thermal sources in Mission View. It fetches the genuine original PNG, retains only complete display-pixel cells inside the actual mission rectangle, and clears alpha outside it. It does not recolor values, alter source bounds, stretch coordinates or fill nodata. The original source and all scientific PNGs remain unchanged.

Conservative inward edge quantization is less than one stored display pixel per boundary. Nearest texture sampling prevents interpolation beyond the mask edge, even during overzoom; the result can leave a narrow transparent strip **inside** the presentation rectangle. This is display clipping, not missing source observations or a new source validity mask. Original full-footprint alpha and each product's configured resampling are restored in Full Data Coverage. Original source/layer IDs, extent metadata, variants, legends and opacity controls are preserved.

Switching coverage modes updates source tile templates only; changing opacity does not reload them. MapLibre 6.18 keeps expired textures renderable while `setTiles` reloads. To prevent even a transient Full → Mission leak, the scientific raster stays at zero display opacity until the new source tiles finish loading; its latest requested opacity is then restored. Metadata-only source events do not reopen it. Raster fading is disabled for these layers. Failures stay fail-closed, with the existing map error handling. Context, detailed CTX, optional color, vectors and camera remain visible/unchanged during this reload.

Custom protocol registration is shared for the map lifetime, supports cancellation, closes decoded image resources, removes pending event handlers on region cleanup, and leaves no mask source or layer behind. It uses browser image decoding/canvas PNG encoding; if that fails, unmasked science is never substituted. No external service is required at runtime because all assets are self-hosted.

Full Data Coverage restores original tile templates and complete authentic stored footprints. Coverage outlines remain independent and above rasters. Display-mode changes never change scientific coverage, geographic eligibility, waypoint coordinates, source datum or mission calculations.

## Initial camera and controls

An optional shared `map.initial_extent` allows Gale to start with a closer, display-only Lower Mount Sharp crop: **137.36–137.45°E, -4.80–-4.71°N**. This is camera framing inside the established mission rectangle, not a science target, new mission boundary or routing permission. Jezero/Oxia omit it and retain their previous behavior.

`fitInitialView` fits that crop with the existing responsive padding. The explicit **Fit mission area** icon (accessible name retained as **Fit exploration region**) still fits the complete original mission rectangle through `fitOverview`. Source-coverage actions still fit original authoritative regional/global bounds. Initial and mission camera modes are retained appropriately during resize; a user pan/zoom prevents resize from snapping the camera back. North-up, pitch zero, ordinary pan, wheel, touch/pinch and keyboard navigation remain available. No maxBounds is imposed and no image coordinates or CSS image scales change.

Gale fits synchronize MapLibre's canvas size before calculating the camera and skip zero-sized transient containers. This addresses the observed case where mobile sheet DOM dimensions changed before MapLibre's cached transform, making otherwise correct new padding exceed the old canvas size. Other regions retain their original fit behavior.

The existing basemap selector keeps stable `ctx`/`color` values, now labeled **Detailed CTX + context** and **USGS Color + context · provisional**. Active source attribution distinguishes the wider ~41m context from detailed imagery. A compact **Coverage & source** disclosure states the finite context crop, coarser sampling, preserved gaps and unquantified accuracy. Its compact default also keeps the mobile map's center available for clicks. Individual context/detailed visibility controls remain in the shared Layers panel; disabling one never synthesizes imagery for the other. The color pack retains its original attribution, alignment warning and explicit fallback to CTX on failure.

## Screenshots and browser checks

All screenshots use actual local scientific/context tiles, not mocked image responses. The baseline Gale and working Jezero reference were captured before implementation. Required screenshots are in `team/gale/viewport/screenshots/`.

| View | Desktop | Tablet | Mobile |
|---|---|---|---|
| Gale before | [1440](../team/gale/viewport/screenshots/gale-before-1440.png) | [768](../team/gale/viewport/screenshots/gale-before-768.png) | [390](../team/gale/viewport/screenshots/gale-before-390.png) |
| Jezero reference | [1440](../team/gale/viewport/screenshots/jezero-before-1440.png) | [768](../team/gale/viewport/screenshots/jezero-before-768.png) | [390](../team/gale/viewport/screenshots/jezero-before-390.png) |
| Gale after | [1440](../team/gale/viewport/screenshots/gale-after-1440.png) | [768](../team/gale/viewport/screenshots/gale-after-768.png) | [390](../team/gale/viewport/screenshots/gale-after-390.png) |
| Mission View | [1440](../team/gale/viewport/screenshots/gale-mission-view-1440.png) | [768](../team/gale/viewport/screenshots/gale-mission-view-768.png) | [390](../team/gale/viewport/screenshots/gale-mission-view-390.png) |
| Full Data Coverage | [1440](../team/gale/viewport/screenshots/gale-full-coverage-1440.png) | [768](../team/gale/viewport/screenshots/gale-full-coverage-768.png) | [390](../team/gale/viewport/screenshots/gale-full-coverage-390.png) |
| Detailed CTX | [1440](../team/gale/viewport/screenshots/gale-detailed-ctx-1440.png) | [768](../team/gale/viewport/screenshots/gale-detailed-ctx-768.png) | [390](../team/gale/viewport/screenshots/gale-detailed-ctx-390.png) |
| Elevation | [1440](../team/gale/viewport/screenshots/gale-regional-elevation-1440.png) | [768](../team/gale/viewport/screenshots/gale-regional-elevation-768.png) | [390](../team/gale/viewport/screenshots/gale-regional-elevation-390.png) |
| Hillshade | [1440](../team/gale/viewport/screenshots/gale-regional-hillshade-1440.png) | [768](../team/gale/viewport/screenshots/gale-regional-hillshade-768.png) | [390](../team/gale/viewport/screenshots/gale-regional-hillshade-390.png) |
| Slope | [1440](../team/gale/viewport/screenshots/gale-regional-slope-1440.png) | [768](../team/gale/viewport/screenshots/gale-regional-slope-768.png) | [390](../team/gale/viewport/screenshots/gale-regional-slope-390.png) |
| Thermal | [1440](../team/gale/viewport/screenshots/gale-thermal-1440.png) | [768](../team/gale/viewport/screenshots/gale-thermal-768.png) | [390](../team/gale/viewport/screenshots/gale-thermal-390.png) |

The new acceptance tests compare rendered background pixels with every regional/global theme and thermal enabled. Tested outer pixels remain exactly unchanged in Mission View. Full coverage changes actual rendered pixels outside the measured mission overlay rectangle. Returning to Mission View restores the restriction. This tests the rendered compositing result, not just configuration or a successful tile request. Original recorded traverse and waypoint/trajectory code remain untouched.

Legacy navigation aspect-ratio tests explicitly switch off wider context while measuring the unchanged detailed CTX rectangle, then exercise fit, drag, wheel, touch and keyboard behavior. Coverage tests compare a real outline toggled off/on at the same camera rather than relying on an old absolute gold-pixel count over a dark background. Color waypoint tests choose an actual unobstructed color-terrain pixel instead of a fixed offset that could hit an existing marker after camera changes. No safety validation is weakened and no marker-interception rule is bypassed.

## Validation, changed files and limits

Reproduce context and preservation checks:

```powershell
python team/gale/viewport/prepare_context.py
python team/gale/viewport/verify_assets.py
npx.cmd tsx --test tests/regions.test.ts tests/mission.test.ts tests/gale-integration.test.ts tests/gale-coverage.test.ts tests/gale-four-layers.test.ts tests/color-basemap.test.ts tests/gale-viewport.test.ts
python -m unittest discover -s tests -p 'test_gale_*.py' -v
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Run browser suites against the app using `PLAYWRIGHT_BASE_URL`, with a dedicated output directory and one runner. The baseline-only capture requires explicit `CAPTURE_GALE_BASELINE=1` and a verified untouched baseline server; it must not be used to overwrite original before screenshots after implementation.

Modified application files: `components/map/{basemap-control,map-workspace}.tsx`; `lib/contracts/region.ts` (optional initial framing only); `lib/map/{camera,region-layers,scientific-clip}.ts`; `regions/gale/{config,layers}.ts`. Added context PNGs and `team/gale/viewport` scripts, audit records and screenshots. Tests update exact expected layer inventory and meaningful display assertions; no mission calculation implementation changes. `app/globals.css`, package manifests/lockfiles, scientific terrain metadata/assets, Jezero/Oxia manifests, route algorithms, weather and radiation remain unchanged.

Limits: context remains finite and coarser than the detailed mission crop; source gaps/uncertain resolving power and absolute registration remain. Full-coverage scientific overlays retain their independent source alignment caveats. Source masks and mission presentation masks remain distinct. Clipping can conservatively remove edge cells within the mission rectangle and briefly hide science during a mode reload; it never exposes unknown terrain as a safe path. This is a presentation milestone, not terrain-aware routing or scientific registration certification. Final test counts and Git delivery follow below.

## Final validation record

| Check | Result |
|---|---|
| Original Gale assets | PASS: all **1,956** baseline assets match original Git blobs; current SHA256 inventory in `preservation.json` |
| Protected regions/science/mission code | PASS: Jezero/Oxia, Gale scientific metadata/targets/coverage records, mission and planning API implementations unchanged |
| Relevant TypeScript tests | PASS: **43/43** (regions, mission, Gale integration, coverage, four scientific layers, color basemap and new viewport/camera tests) |
| Gale scientific Python tests | PASS: **38 passed, 1 skipped**, 39 total; skip explicitly concerns the absent raw USGS DEM subset, not a claimed verification |
| Baseline/reference browser capture | PASS: 1 explicit audit across three Gale and three Jezero viewport sizes |
| Complete selected browser regression run | PASS: **24/24**, including 7 color/fallback/waypoint/persistence checks, 4 coverage/accessibility checks, 3 new viewport/clipping checks, 6 navigation/resize/keyboard/touch checks and 4 regional isolation checks |
| Final camera synchronization rerun | PASS: **9/9**, repeating all new viewport checks and existing camera/keyboard/touch checks after the resize-before-fit fix |
| Client runtime/asset checks | PASS: final three viewport captures have zero page exceptions and all observed map asset responses are HTTP 200 |
| Typecheck, lint and production build | PASS; successful TypeScript compilation and static page generation |
| Diff whitespace check | PASS |

The final viewport records include all required real-layer captures and zero changed tested background pixels outside the mission footprint for all four categories. The serial run uses a dedicated artifact directory; an earlier parallel-run artifact collision was corrected and is not counted as a passing run. Early tests were also corrected to exclude overlapping UI from raster pixel comparisons and to detect coverage relative to the actual rendered mission rectangle. Exact safety and source-validation assertions remain in force.

Gale now provides the requested full-workspace optical presentation while keeping high-detail imagery at its genuine source location, default scientific clipping intact, full-data exploration accessible and original scientific values/mission behavior unchanged. No further features are included.

## Git delivery

- Implementation commit: **`bba8398bc9f113f2bf7c83d1d7ef385d2a98ca5e`**, `feat(gale): improve full-viewport basemap while preserving mission clipping`.
- Normal push to **`origin/feat/gale-full-viewport-basemap`** succeeded. Independent `git ls-remote --heads origin feat/gale-full-viewport-basemap` returned that exact implementation SHA.
- This verified delivery record is a separate documentation closeout commit. The final delivered commit is the HEAD of `feat/gale-full-viewport-basemap` containing this report; its exact local/remote equality is verified after the closeout push and supplied in the final delivery response. A commit cannot embed its own SHA without changing that SHA.
- The worktree was clean after the implementation commit. A final baseline diff confirmed no existing Gale map asset, Jezero/Oxia manifest, mission implementation or planning API change.
- No force push or merge into `main`, `feat/gale-map`, `feat/gale-four-layer-standardization` or another shared development branch. Original source values, scientific footprints, target coordinates and mission restrictions remain intact.
- Temporary verification browsers and development servers were stopped. This task ends at the Gale viewport/basemap milestone.
