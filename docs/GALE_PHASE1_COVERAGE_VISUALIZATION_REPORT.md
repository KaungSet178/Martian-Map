# Gale Phase 1 — Scientific coverage visualization and metadata corrections

Completed 14 November 2026 (Asia/Rangoon). **Phase 1 only; no registration correction, new geology acquisition or terrain generation.**

## 1. Implementation summary and baseline

Added two independent, optional terrain coverage outlines, explicit zoom-to-coverage actions, and source/crop/validity/posting/support explanations. Corrected misleading coverage descriptions and regional HRSC attribution. The initial map appearance, scientific coordinates, imagery, terrain products, geology, confidence classifications and mission gates remain unchanged.

Implementation branch: `feat/gale-coverage-visualization-phase1`, isolated worktree `output/gale-coverage-phase1`. Starting commit: **`6ea65200d76f3dc29e5c9b70182f3facd5d5b789`**, latest verified `origin/feat/gale-map` after fetching. This includes the independently completed M4 integration; the older Phase 0 starting commit was not used as the implementation baseline.

Authoritative audit: **`8c2d8f5bc3168d05c305afbff7196f2624ce2f39`** on `feat/gale-layer-visualization`; [committed report](https://github.com/KaungSet178/Martian-Map/blob/8c2d8f5bc3168d05c305afbff7196f2624ce2f39/docs/GALE_LAYER_GEOSPATIAL_AUDIT.md) and [measurements](https://github.com/KaungSet178/Martian-Map/blob/8c2d8f5bc3168d05c305afbff7196f2624ce2f39/docs/diagnostics/gale-layer-audit/measurements.json). That branch and its evidence were preserved. Its report was read, and all current terrain bounds and coverage GeoJSON were compared numerically with the audit before editing.

No merge was performed. Final commit is the commit containing this report, with message `feat(gale): add scientific coverage visualization`; the delivery response records its SHA and remote verification.

## 2. Changed files

| Files | Purpose |
| --- | --- |
| `regions/gale/coverage-layers.ts` | Two default-off boundary declarations referencing existing coverage assets and extents |
| `regions/gale/terrain-layers.ts`, `layers.ts`, `config.ts` | Correct descriptions/attribution; structured metadata for six regional/global themes and Arc Pass |
| `lib/contracts/science.ts` | Optional structured metadata, explicit fit extent and line-pattern fields; old manifests remain valid |
| `lib/map/region-layers.ts` | Opt-in line casing/pattern, independent visibility/opacity, correct shared-source cleanup |
| `lib/map/camera.ts` | Explicit `fitLayerCoverage` wrapper around existing responsive camera utility |
| `components/science/coverage-controls.tsx`, `product-metadata.tsx`, `evidence.tsx` | Accessible controls, line legend and expandable source/crop/scale information |
| `components/planner.tsx`, `components/map/map-workspace.tsx` | Coverage-action event wiring and one-time request handling only; mission/waypoint calculations untouched |
| `app/globals.css` | Scoped swatches, wrapping and metadata disclosure styling using existing design tokens |
| `tests/gale-coverage.test.ts`, `tests/browser/gale-coverage.spec.ts` | New geometry/metadata/renderer/camera and real browser regressions |
| `tests/mission.test.ts`, `tests/regions.test.ts`, `tests/browser/gale-regional-terrain.spec.ts` | Existing expected layer inventory and corrected-wording assertions updated |
| `package.json` | Add focused coverage/integration tests to `npm test`; no dependency changes |
| This report, `docs/images/coverage-phase1/`, `docs/diagnostics/gale-phase1/` | Genuine screenshots, logs and validation receipts |

No public assets, source processing scripts, scientific receipts, geological polygons, terrain algorithms, mission models, M4 files, weather files or other regional content changed. Existing browser tests generated eight old G4/G5 screenshot destinations; only those generated outputs were restored byte-for-byte from this branch's starting commit. New screenshots have their own directory.

## 3. Corrected scientific metadata

All six regional/global terrain themes and Arc Pass now provide separately labeled original source product, source coverage, application display crop, valid-data coverage, nominal posting, north gradient support, CRS and scientific limitations. These are visible through expandable data panels in Layers and in the scientific data register. Legacy numeric resolution fields retain their values for contract compatibility, while the UI explicitly describes posting and states that effective resolution is unmeasured.

Regional descriptions distinguish the original large, irregularly valid HRSC mosaic from the fully valid **291 × 543** application crop and the smaller fixed optical overview. The crop intentionally extends roughly 1 km beyond that overview. Global descriptions explicitly distinguish the original global HRSC–MOLA product from the local **177 × 236**, approximately **35.28 × 47.20 km** application crop, which is **not a complete Gale Crater map**. Complete original global validity remains uninspected.

Attribution uses **Divya M. Persaud, Alfiah Diana Rizky Putri and Jan-Peter Muller (2021)**, DOI **10.5281/zenodo.5808354**, confirmed against the [primary publication record](https://zenodo.org/records/5808354). Source image identifiers and original source information are preserved.

Arc Pass metadata retains its localized interpreted coverage, 53 original features, seven source Unit categories, source-coordinate conversion and unquantified absolute accuracy. Posting/gradient support are explicitly not applicable to these vector polygons. No geology palette, Unit assignment, polygon or auto-focus extent changed.

## 4. Coverage outlines

The boundaries use the existing, unchanged `terrain-regional/coverage.geojson` and `terrain-global/coverage.geojson`. The audit established fully valid rectangular derived crops; no original TIFF envelope, rover envelope, optical overview or expanded rectangle is substituted.

| Coverage | Exact W/S/E/N degrees | Area / analysis scale |
| --- | --- | --- |
| Regional | `[137.32743882663516, -4.838798324880672, 137.47471920704652, -4.563976171741976]` | 141.733079 km²; 30 m nominal posting, 90 m north support |
| Global-derived local crop | `[137.09987566364117, -5.096221490785939, 137.69709505066461, -4.299928974754662]` | 1,665.252534 km²; 200 m nominal posting, 600 m north support |

Regional coverage is a **solid** science-color line; global-derived coverage is a **dashed** caution-color line. Both use a 2 px foreground and matched 5 px dark casing for contrast. There is **no polygon fill**. Pattern, swatch, explicit name and description distinguish them. These are data extents, not geological contacts or safety boundaries.

Outlines are ordinary independent context overlays, default off. Selecting terrain does not enable them. Either or both can be shown, hidden or given a different opacity without disabling terrain or changing the camera. Theme changes do not remount boundaries. Basemap switching retains their state. GeoJSON is rendered directly, so future nonrectangular masks and holes can be represented without a rectangle-generation assumption; an updated mask must still be reviewed and its fit envelope kept consistent.

Cleanup removes all foreground/casing layers before removing shared sources. Existing traverse line styling and other regions' default rendering remain unchanged.

## 5. Explicit zoom-to-coverage implementation

The coverage controls expose **Zoom to regional terrain coverage** and **Zoom to global terrain coverage**, available independently of whether the outline is shown. Each action sends a numbered, region-specific request. The map handles each request once and calls `fitLayerCoverage`, which uses the existing `fitOverview` utility on a temporary copy of the map configuration with the verified coverage bounds.

The source-controlled optical overview is never mutated. Fitting uses existing responsive viewport padding, maximum zoom, north-up orientation, zero pitch and unrestricted navigation. Terrain visibility/opacity and outline visibility/opacity do not invoke this action. The existing Arc Pass `focus_extent` effect remains separate and unchanged.

The fixed optical overview remains `[137.3442352329006, -4.822361175063087, 137.4579431096443, -4.580605407446296]`. On small screens the existing expanded sheet reduces the map area and hides the basemap selector; users can collapse the sheet for the larger map and use Layers to reopen it. The controls work through that existing interaction rather than changing unrelated layout behavior.

## 6. Posting versus gradient support

The interface shows **30 m nominal posting / 90 m north gradient support** for regional terrain and **200 m nominal posting / 600 m north gradient support** for global-derived terrain. A keyboard-accessible disclosure explains that posting is elevation-sample spacing and gradient support is the neighborhood used to calculate slope and hillshade.

Neither value independently establishes effective spatial resolution or absolute measurement accuracy. Slope legends remain neutral numeric degree classes. No uncertainty estimate, safety threshold, confidence upgrade or route eligibility is introduced.

## 7. Genuine screenshots and initial-view preservation

Before images were captured from the untouched new baseline worktree; after images and final coverage images were captured from the implemented application. Before capture used the isolated development server; final acceptance used the optimized production server. No screenshot was fabricated or retouched.

| View | Desktop, 1440 × 900 | Mobile, 390 × 844 |
| --- | --- | --- |
| Initial overview before | [Before](images/coverage-phase1/before-overview-1440.png) | [Before](images/coverage-phase1/before-overview-390.png) |
| Initial overview after | [After](images/coverage-phase1/after-overview-1440.png) | [After](images/coverage-phase1/after-overview-390.png) |
| New controls, initially off | [Layers](images/coverage-phase1/after-layers-1440.png) | [Layers](images/coverage-phase1/after-layers-390.png) |
| Regional boundary / CTX | [Regional](images/coverage-phase1/regional-ctx-1440.png) | [Regional](images/coverage-phase1/regional-ctx-390.png) |
| Both boundaries / provisional color | [Both](images/coverage-phase1/both-color-1440.png) | [Both](images/coverage-phase1/both-color-390.png) |
| Expanded scientific metadata | [Metadata](images/coverage-phase1/metadata-1440.png) | [Metadata](images/coverage-phase1/metadata-390.png) |

Initial map-area pixel comparisons were **identical**: desktop rectangle `[360,80,1440,840]` and mobile rectangle `[0,80,390,620]`, with mean absolute pixel difference **0**. These compare the map area away from the development-only Next indicator; they do not claim byte-identical whole-page PNGs. The comparison supports the unchanged default map appearance in addition to the unchanged configuration and default-off state tests.

## 8. Automated tests and build results

| Check | Final result | Evidence |
| --- | --- | --- |
| `python -B -m unittest discover -s tests -p 'test_gale_*.py' -v` | **37 passed, 0 failed, 0 skipped** | [Python log](diagnostics/gale-phase1/python-tests.txt) |
| `npm test` focused suite / equivalent direct tsx invocation | **29 passed, 0 failed, 0 skipped**; Phase 0's 25 plus 4 new coverage tests | [Validation receipt](diagnostics/gale-phase1/validation.json) |
| All `tests/*.test.ts` through tsx | **323 passed, 0 failed, 0 skipped** | [Full TypeScript log](diagnostics/gale-phase1/all-typescript-tests.txt) |
| All seven Gale browser specs, optimized production server | **37 passed, 0 failed** in 5.9 minutes | [Production browser log](diagnostics/gale-phase1/browser-production-tests.txt) |
| `npm run typecheck` | Passed | [Typecheck log](diagnostics/gale-phase1/typecheck.txt) |
| `npm run lint` | Passed | [Lint log](diagnostics/gale-phase1/lint.txt) |
| `npm run build -- --webpack` | Passed; optimized static Next.js production output | [Build log](diagnostics/gale-phase1/build.txt) |
| `git diff --check`, staged equivalent | Passed before commit | Git delivery verification |

The new unit tests verify exact current geometry, crop/source distinction, corrected authors, posting/support values, default-off state, independent theme/outline selection, matched casing opacity, shared-source cleanup, no duplicate mounts, maximum zoom/padding, unchanged optical bounds and unchanged Arc Pass focus. Existing test edits update only the two added layer IDs and corrected coverage wording; no scientific or mission assertion was removed.

The Python test cache contains an unchanged copy of the already verified global subset so its integrity check runs rather than skips. No production processor was invoked. PyProj's existing WKT-to-PROJ advisory is not a test failure.

The isolated worktree uses a junction to the existing dependency installation. Turbopack could not resolve packages outside its inferred worktree root, so development and production compilation used Next.js's documented webpack option. This required no dependency, lockfile or Next.js configuration change. Production acceptance ran on `http://127.0.0.1:3132` using `npm run start -- --port 3132`, not on a mock or unit-test renderer.

Reproduce focused checks with `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build -- --webpack`. With the local production server running, set `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3132` and run Playwright against the `gale-*.spec.ts` files, using forward-slash paths on Windows. The exact file list and command are recorded in the browser log.

## 9. Browser acceptance and visual review

Chromium acceptance covered **1440 × 900, 1024 × 768, 768 × 1024 and 390 × 844**. It exercised CTX, provisional color, regional/global elevation, hillshade and slope, local PDS terrain regressions, Arc Pass, recorded traverse, and existing waypoint/mission-save behavior.

New acceptance tests check actual rendered boundary-colored pixels, individual hiding, simultaneous outlines, state preservation across basemaps, all six terrain themes at zero opacity, and exact map-frame recovery after identical explicit fit actions. This verifies camera preservation without adding private map/test hooks. Exact fit coordinates are also asserted in unit tests. Keyboard Space toggles, visible focus, accessible labels, Axe scans, document-width checks and reopening Layers from a collapsed panel pass.

Both desktop and mobile images were inspected. The valid-crop boundaries extend beyond the optical imagery, as expected; they must not be stretched to its edges. Thin solid/dashed lines remain distinct over the dark surroundings, terrain views and both basemap selections. The original imagery remains visible without opaque coverage fill.

During test development, raw canvas captures were corrected to hide overlaid UI labels before comparing map pixels. Mobile tests were corrected to collapse the existing sheet before accessing the intentionally hidden basemap selector and to compare explicit overview fits at the same sheet size. These were test-flow corrections; the default camera and mobile layout were not changed. Earlier exploratory failures are not presented as passing acceptance runs. The final production run passed all 37 cases.

## 10. Source hashes and unrelated worktree integrity

[Validation receipt](diagnostics/gale-phase1/validation.json) records:

- **210 regional + 1,305 global = 1,515** existing terrain PNG SHA-256 receipts matched.
- Regional raw TIFF SHA-256 `ed1fd5cd080a62eff7d2b9f38110c0a2c62ee05a4706ac0b45d015043e781ae6` matched.
- Corrected global raw TIFF SHA-256 `6661929884ed52de7f0a7e746e99d5196783178ce7bdfe718c52402747b87ff4` matched.
- Original Arc Pass archive SHA-256 `783f052b5bb5eb7b478e66ce6c972816f8adc0e154be0176bc817b14cd7e8a24` matched.
- Arc Pass display SHA-256 `d182c9291450f77fd07fef4fbdb979d23df45e65c6665fb02dd7df08f2748dce` matched.
- **2,087 tracked files** across public assets, Gale source/processing records, scripts, other regions and mission source directories retained their canonical Git content. No source hash or scientific processing receipt changed.

Live worktree status and pre-existing modified-file hashes were captured before editing and compared afterward. The main worktree's existing `components/map/map-workspace.tsx` edit is byte-identical to its initial snapshot. The M4 worktree remained clean on its starting HEAD. The Phase 0 audit worktree remained clean on `8c2d8f5`. A concurrent Jezero worktree independently advanced from `d9fbe2f` to `9670ada`; its status remained clean, and no Jezero files were edited or absorbed into this branch. The receipt records that advancement rather than claiming every external HEAD stayed fixed.

## 11. Remaining scientific uncertainties

Independent CTX/color registration, absolute positional/vertical accuracy, effective observational resolution and slope error remain unverified or unquantified. Common HRSC–MOLA lineage does not provide independent registration validation. Full global validity was not established by inspecting the local subset. Neither geological interpretations nor numeric slope classes establish astronaut route safety.

The source raster values, affines, derivative equations, nodata masks, Arc Pass polygons, fixed optical overview and regional coordinate system remain unchanged. No arbitrary offsets, raster resizing, geological extrapolation, new confidence classifications or terrain-based route-safety logic were introduced.

## 12. Known limitations and scope boundary

Coverage lines represent the verified derived grid boundary. The visible raster alpha edge can differ by half a display pixel from that exact boundary because the existing tiles sample pixel centers; this expected zoom-dependent quantization is not a registration correction. At broad coverage fits the optical crop can appear small, especially on the compact mobile map. Opening/closing the existing sheet changes the visible viewport; explicit fit actions use the viewport and padding present when invoked. Future irregular masks must supply updated coverage geometry and a reviewed fit envelope.

The same coverage legend remains available through Layers after the panel is collapsed. Camera orientation follows the existing north-up fit policy. Basemap source registration warnings and all routing/scientific safeguards remain in force. Broader geology acquisition, independent registration correction, terrain processing, weather and target-catalog work are outside this delivery.

**Phase 1 is complete. Stop after Phase 1; no merge into the shared Gale branch.**
