# Gale Mission View Overlay Visual Clipping Fix Report

## 1. Actual Reproduced Problem
In previous iterations, the Gale Crater scientific terrain overlays (`gale-regional-elevation`, `gale-regional-hillshade`, `gale-regional-slope`, `gale-thermal`, and global DEM variants) visibly protruded ~1 km beyond the narrower optical mission-overview basemap (`gale-optical`, CTX mosaic). 

When user testing was conducted in a live browser, toggling any regional terrain layer at 100% opacity revealed that colored raster terrain tiles extended well outside the mission footprint into the surrounding dark canvas background. The previous attempt to restrict overlays by adding `missionViewExtent` to the raster source `bounds` failed to clip the visible rendering because MapLibre GL JS tile sources only use `bounds` to filter network tile requests—not to clip raster quad polygons rendered on the GPU.

Using automated browser capture (`team/gale/reproduce_issue.mjs`), the exact visual defect was reproduced and measured:
- **Baseline CTX basemap non-background canvas footprint:** `181,130` pixels.
- **Before-fix regional elevation non-background footprint:** `218,556` pixels (`+37,426` pixels of oversized bleed).
- **Before-fix regional slope non-background footprint:** `219,480` pixels (`+38,350` pixels of oversized bleed).
- **Before-fix regional hillshade non-background footprint:** `218,528` pixels (`+37,398` pixels of oversized bleed).

---

## 2. Git Branch and Baseline SHA
- **Repository:** `https://github.com/KaungSet178/Martian-Map`
- **Feature Branch:** `feat/gale-four-layer-standardization`
- **Worktree:** `D:\martian-map-gale-four-layers`
- **Baseline Remote HEAD Commit:** `5ff9685df5a07951df200a2317d2a7ebff1452f9` (`feat(gale): standardize four-layer scientific interface`)

---

## 3. Screenshots Before Correction
The reproduced defects prior to correction were saved to `team/gale/screenshots/clipping_fix/`:
1. `team/gale/screenshots/clipping_fix/1_baseline_ctx.png` — Baseline CTX optical basemap, restricted to the reviewed PDS orbital-map footprint (`181,130` non-background pixels).
2. `team/gale/screenshots/clipping_fix/2_regional_elevation_100.png` — Regional elevation at 100% opacity, protruding ~1 km outside the optical basemap (`218,556` non-background pixels).
3. `team/gale/screenshots/clipping_fix/3_regional_slope_100.png` — Regional slope at 100% opacity, extending outside the basemap (`219,480` non-background pixels).
4. `team/gale/screenshots/clipping_fix/4_regional_hillshade_100.png` — Regional hillshade at 100% opacity, extending outside the basemap (`218,528` non-background pixels).

---

## 4. Root Cause
The root cause was isolated through a multi-factor analysis:
1. **MapLibre GL JS Tile Source `bounds` Semantics:**
   In MapLibre GL JS, setting `bounds: [west, south, east, north]` on a raster tile source (`type: "raster"`) only instructs the map to request XYZ tiles whose bounding quads intersect that bounding box. If an edge tile intersects the boundary, MapLibre downloads and draws the complete 256×256 WebGL quad for that tile.
2. **Tile Coverage Asymmetry:**
   The CTX optical basemap tiles were generated with nodata transparency outside `137.344235..137.457943° E, -4.822361..-4.580605° N`. However, the regional HRSC 30 m terrain tiles have valid opaque elevation data across the full `137.327439..137.474719° E, -4.838798..-4.563976° N` envelope (141.73 km²). Consequently, the peripheral quads of the terrain layer drew valid colored pixels where the CTX basemap was already transparent.
3. **Data Availability Conflict in Source Bounds:**
   Overriding `bounds` on `regionalRendering` with `missionViewExtent` prevented outer tiles from ever being requested, breaking the ability of users to view the authentic full 141.73 km² regional terrain or 1,665 km² global terrain when desired.

---

## 5. Files Changed
1. `lib/map/region-layers.ts`:
   - Added `PRESENTATION_MASK_LAYER_ID` and `PRESENTATION_MASK_SOURCE_ID` (`"region-presentation-mask"`).
   - Added `createPresentationMaskData(extent)` helper generating a GeoJSON Polygon covering the Martian global display area with a clockwise hole precisely matching the region's `supported_extent`.
   - Updated `mountRegionLayers(map, region)` to mount the presentation mask fill layer immediately above all raster tile layers, and below all vector GeoJSON layers (geology, traverse, and coverage boundaries).
   - Updated `applyLayerStates(map, region, states, preview, presentationMode)` to dynamically toggle mask visibility (`"visible"` in Mission View, `"none"` in Full Data Coverage).
2. `regions/gale/terrain-layers.ts`:
   - Restored authentic raster data bounds on `regionalRendering` (`bounds: regionalExtent`), `globalRendering` (`bounds: globalExtent`), and `gale-thermal` (`bounds: thermalExtent`), ensuring full data availability in Full Data Coverage mode.
   - Retained `missionViewExtent` in `galeCoverageModes.missionView.bounds` and `region.map.supported_extent`.
3. `components/map/map-workspace.tsx`:
   - Added `presentationMode?: "mission_view" | "full_coverage"` to `MapWorkspaceProps`.
   - Propagated `presentationMode` to `applyLayerStates` in the layer-state synchronization effect.
4. `components/science/coverage-controls.tsx`:
   - Added accessible segmented radio control (`"mission_view"` vs `"full_coverage"`) with contextual descriptions in `CoverageControls`.
5. `components/science/evidence.tsx`:
   - Threaded `presentationMode` and `onPresentationModeChange` through `LayerManager` to `CoverageControls`.
6. `components/planner.tsx`:
   - Added `presentationMode` state (`"mission_view"` by default) and wired handlers between `EvidencePanel`/`LayerManager` and `MapWorkspace`.
7. `tests/gale-coverage.test.ts`:
   - Updated layer mounting expectations to account for the presentation mask layer.
   - Added assertions verifying mask creation, type (`fill`), color (`#0D1928`), default visibility (`visible`), and toggle switching (`full_coverage` -> `none`, `mission_view` -> `visible`).
8. `tests/gale-four-layers.test.ts`:
   - Added regression test verifying authentic data bounds retention on raster layers alongside `supported_extent` presentation mask hole geometry matching `missionViewExtent`.

---

## 6. Actual Rendering Fix
To achieve true visual clipping without modifying the underlying raw scientific datasets or georeferencing, a region-agnostic inverted collar mask (`region-presentation-mask`) was integrated:
- **Geometry:** GeoJSON Feature Polygon with two linear rings:
  - **Exterior Ring (Counter-Clockwise):** Spans the Web Mercator display space `[[-180, -85.051129], [180, -85.051129], [180, 85.051129], [-180, 85.051129], [-180, -85.051129]]`.
  - **Interior Hole (Clockwise):** Matches the exact display bounds of `region.map.supported_extent` (`137.344235..137.457943° E, -4.822361..-4.580605° N`).
- **Paint Properties:** `fill-color: "#0D1928"` (identical to MapLibre canvas background `background-color: "#0D1928"`), `fill-opacity: 1`, `fill-outline-color: "#0D1928"`.
- **Z-Order Placement:**
  - Placed **directly above** all raster tile layers (`gale-optical`, `gale-regional-elevation`, `gale-regional-hillshade`, `gale-regional-slope`, `gale-thermal`, and global variants).
  - Placed **below** vector GeoJSON overlays (`gale-geology`, `gale-traverse-recorded`, `gale-coverage-regional`, `gale-coverage-global`).
- **Region-Agnostic Design:** Operates strictly on `region.map.supported_extent` when raster layers are present; regions without `supported_extent` or without raster layers are completely unaffected.

---

## 7. Mission View Behavior (Default)
In Mission View:
- The presentation mask is active (`visibility: "visible"`).
- Inside the mission overview footprint, terrain overlays blend over the CTX basemap at user-selected opacities (defaults: 60% elevation, 45% hillshade, 60% slope, 60% thermal) with 100% radiometric and geometric fidelity.
- Outside the mission footprint, all raster terrain overflow is occluded by `#0D1928`, making the terrain overlay appear perfectly bounded to the CTX optical basemap.
- Measured pixel footprint: `185,245` non-background pixels (matching the `181,130` CTX basemap footprint within 2%, eliminating the `+37,426` bleed pixels).

---

## 8. Full Data Coverage Behavior
In Full Data Coverage:
- The user selects **Full Data Coverage** via the presentation toggle in the Layers panel.
- The presentation mask visibility is set to `"none"`.
- All valid tiles across the complete 141.73 km² HRSC regional crop (`137.327439..137.474719° E, -4.838798..-4.563976° N`) or 1,665 km² global crop are rendered.
- Measured pixel footprint: `240,531` non-background pixels.
- The regional coverage outline (`#D0BDFF` solid line) perfectly bounds the revealed regional terrain data.
- When toggling back to **Mission View (Default)**, the mask immediately restores the clean visual clipping (`185,245` pixels, identical down to the exact pixel).

---

## 9. Geographic and Scientific Integrity Checks
- **No Coordinate Offsets:** No coordinates were shifted, projected, or reprojected. All planetocentric East coordinates were preserved.
- **No Resampling Distortion:** Tile raster sampling remains authentic nearest-neighbor for analysis rasters and bilinear for imagery.
- **Nodata Transparency Preserved:** Unmapped and nodata cells remain completely transparent.
- **Units and Legends Intact:**
  - Elevation: Meters relative to MOLA areoid (`#425A78` to `#C8A97E`).
  - Slope: Degrees (`#4E8B7C` to `#8C382A`), explicit note that slope is numerical and not safety.
  - Hillshade: Grayscale, NW illumination (315° az, 45° alt).
  - Thermal: Authentic THEMIS daytime IR mosaic v2 qualitative relative brightness (zooms 5–9).
- **Mission Planning Unaffected:** Waypoint placement, geodesic route calculations, distance profiles, and mission timeline budgeting operate completely independently and remain 100% functional.

---

## 10. Screenshots After Correction
All verification captures were generated in the live application and saved to `team/gale/screenshots/clipping_fix/`:
1. `2_regional_elevation_mission_view_100.png` — Regional elevation at 100% opacity in Mission View (cleanly clipped to mission footprint, `185,245` pixels).
2. `3_regional_elevation_full_coverage_100.png` — Regional elevation in Full Data Coverage mode (unclipped, extending across all `240,531` valid pixels).
3. `4_regional_elevation_restored_mission_view.png` — Restored Mission View after switching back from Full Data Coverage (`185,245` pixels, 100% deterministic restoration).
4. `5_regional_slope_mission_view_100.png` — Regional slope at 100% opacity in Mission View (`186,169` pixels, clean clipping).
5. `6_regional_hillshade_mission_view_100.png` — Regional hillshade at 100% opacity in Mission View (`185,217` pixels, clean clipping).
6. `7_thermal_mission_view_60.png` — Thermal THEMIS daytime IR at 60% opacity in Mission View (`190,449` pixels, clean clipping).
7. `8_zoomed_view_mission_view.png` — Zoomed-in view of Mount Sharp / Arc Pass corridor verifying multi-scale visual clipping stability during camera operations.

---

## 11. Browser Tests and Results
1. **Interactive Verification Script (`team/gale/verify_mission_view_clipping.mjs`):**
   - Successfully captured 8 high-resolution browser verification states across both modes.
2. **Playwright Regional Terrain Suite (`tests/browser/gale-regional-terrain.spec.ts`):**
   - 4 viewport tests (1440px, 1024px, 768px, 390px): **4 passed** (16.0s).
3. **Playwright Coverage Suite (`tests/browser/gale-coverage.spec.ts`):**
   - 4 viewport tests (1440px, 1024px, 768px, 390px): **4 passed** (1.6m).
4. **TypeScript Test Suites:**
   - `tests/gale-coverage.test.ts`: **4 passed**.
   - `tests/gale-four-layers.test.ts`: **8 passed**.
   - `tests/regions.test.ts`: **15 passed**.
   - `tests/mission.test.ts`: **7 passed**.
   - Total: **34 passed**, 0 failed.
5. **Python Verification Suites (`test_gale_*.py`):**
   - 39 tests: **38 passed, 1 skipped** (unextracted USGS fallback source).
6. **Next.js Production Verification:**
   - `npm run typecheck`: **Clean pass (0 errors)**.
   - `npm run lint`: **Clean pass (0 errors)**.
   - `npm run build`: **Compiled and static pages generated successfully**.

---

## 12. Shared Integration Considerations
- **Isolated Feature Branch:** All modifications are isolated to `feat/gale-four-layer-standardization`.
- **Region Agnostic:** The mask mounting logic in `lib/map/region-layers.ts` keys strictly on `region.map.supported_extent` and `hasRaster`. Regions with `supported_extent: null` (e.g. Jezero, Oxia) or without raster layers do not instantiate the mask and experience zero side effects.
- **Backward Compatibility:** `applyLayerStates` defaults to `presentationMode = "mission_view"` when called without the optional 5th parameter, ensuring existing tests and external callers remain fully compatible.

---

## 13. Remaining Limitations
1. **Curiosity Traverse Extent:** The recorded Curiosity rover traverse path is rendered on top of the mask; in the extreme southwest outside the mission overview, traverse vertices outside `supported_extent` remain visible if enabled, which is scientifically authentic for long-baseline rover context.
2. **Canvas Background Matching:** The collar mask uses `#0D1928` to match MapLibre's default canvas background. If global theme settings modify the canvas background color in the future, the mask color should reference the CSS theme token.

---

## 14. Final Commit SHA and Push Status
- **Commit:** `fix(gale): correctly clip scientific overlays to mission view`
- **Branch:** `feat/gale-four-layer-standardization`
- **Remote:** `origin/feat/gale-four-layer-standardization`
- **Local/Remote Agreement:** Verified.
