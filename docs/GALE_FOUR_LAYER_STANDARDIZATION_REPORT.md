# Gale Four-Layer Scientific Map Standardization Report

**Marswalk Planner — NASA Space Apps Challenge 2026**  
**Engineering & Scientific Standardization Milestone**  
**Branch:** `feat/gale-four-layer-standardization`  
**Worktree:** `D:\martian-map-gale-four-layers`  
**Starting Verified Baseline:** `c7189caf5f79e8fef256a49b370d2647b4b3733d` (`feat/gale-coverage-visualization-phase1`)  
**Shared Baseline Head:** `6ea65200d76f3dc29e5c9b70182f3facd5d5b789` (integrated G4/G5 + M4-INT)

---

## Executive Summary

This milestone establishes a standardized, scientifically rigorous four-layer exploration interface for Gale Crater (`Elevation`, `Hillshade`, `Slope`, `Thermal`), achieving strict architectural parity with Jezero Crater (Codex) and Oxia Planum without compromising authentic planetary data, resolution differences, or scientific uncertainty.

Crucially, this work resolves all five primary user-identified deficiencies:
1. **Problem A (Oversized Scientific Overlays):** Resolved via Mission View presentation bounds (`missionViewExtent: 137.344235..137.457943° E, -4.822361..-4.580605° N`), which natively constrain MapLibre raster loading and rendering to the mission basemap footprint (~96.26 km²) without stretching coordinates or clipping source data. Full regional data coverage (141.73 km²) remains accessible via vector coverage boundaries and zoom actions.
2. **Problem B (Poor Color Interpretation):** Resolved by implementing scientifically structured color palettes: an intuitive low-to-high elevation scale (muted blue-gray → teal → sand → ochre → rust) and a 5-class ordered slope palette (0–5° muted blue-green, 5–10° pale yellow, 10–15° orange, 15–20° dark orange, >20° red-brown) that communicate steepness clearly without assigning unsupported "safe/unsafe" hazard labels.
3. **Problem C (Weak Map Readability):** Resolved through calibrated initial opacities (Elevation 60%, Hillshade 45%, Slope 60%, Thermal 60%) that preserve underlying optical context imagery while maintaining relief readability.
4. **Problem D (Missing Thermal Layer):** Resolved through authentic data integration of the NASA Mars Trek / ASU controlled THEMIS daytime infrared mosaic v2 (~100 m/px), generating Web-Mercator XYZ display tiles for zooms 5–9 with qualitative relative brightness semantics (no fabricated kinetic temperature or thermal inertia).
5. **Problem E (Inconsistent Implementation):** Gale now exposes the identical four scientific categories and metadata schema as Jezero and Oxia, while preserving Arc Pass photogeology as an auxiliary localized research overlay.

---

## 1. Baseline Git Commit & Isolation Audit

- **Repository:** `https://github.com/KaungSet178/Martian-Map`
- **Isolated Branch:** `feat/gale-four-layer-standardization`
- **Worktree:** `D:\martian-map-gale-four-layers`
- **Starting Commit SHA:** `c7189caf5f79e8fef256a49b370d2647b4b3733d` (`feat(gale): add scientific coverage visualization`)
- **Git State:** Clean, verified isolation. Zero modifications made to read-only shared files (`components/map/map-workspace.tsx`, `components/planner.tsx`, `components/science/**`, `lib/contracts/**`, `lib/map/**`, `lib/mission/**`, `app/globals.css`, `regions/jezero/**`, `regions/oxia/**`, package manifests).

---

## 2. Existing Layer Inventory & Standardization

The Gale Crater layer stack is now standardized into four primary scientific categories, supported by source variants and auxiliary overlays:

| Category / Role | Layer ID | Display Name | Kind / Type | Resolution | Default Opacity | Bounds Behavior | Status |
|---|---|---|---|---|---|---|---|
| **Elevation (Primary)** | `gale-regional-elevation` | Regional HRSC elevation | `topography` / `Elevation` | 30 m | 60% | Mission View (`missionViewExtent`) | Available |
| **Hillshade (Primary)** | `gale-regional-hillshade` | Regional HRSC hillshade | `topography` / `Hillshade` | 30 m | 45% | Mission View (`missionViewExtent`) | Available |
| **Slope (Primary)** | `gale-regional-slope` | Regional HRSC slope · degrees | `topography` / `Slope` | 30 m (90 m support) | 60% | Mission View (`missionViewExtent`) | Available |
| **Thermal (Primary)** | `gale-thermal` | Thermal (THEMIS daytime IR) | `thermal` / `Thermal` | 100 m | 60% | Mission View (`missionViewExtent`) | Available (New) |
| *Elevation (Variant)* | `gale-global-elevation` | Global HRSC–MOLA elevation | `topography` / `Elevation` | 200 m | 60% | Mission View (`missionViewExtent`) | Available |
| *Hillshade (Variant)* | `gale-global-hillshade` | Global HRSC–MOLA hillshade | `topography` / `Hillshade` | 200 m | 45% | Mission View (`missionViewExtent`) | Available |
| *Slope (Variant)* | `gale-global-slope` | Global HRSC–MOLA slope · degrees | `topography` / `Slope` | 200 m (600 m support) | 60% | Mission View (`missionViewExtent`) | Available |
| *Elevation (Local)* | `gale-terrain` | Elevation · MOLA areoid | `topography` / `Elevation` | 25 m (1 m native) | 100% | Local Corridor (`demExtent`) | Available |
| *Hillshade (Local)* | `gale-hillshade` | DEM hillshade | `topography` / `Hillshade` | 25 m | 100% | Local Corridor (`demExtent`) | Available |
| *Slope (Local)* | `gale-slope` | DEM slope · degrees | `topography` / `Slope` | 25 m (75 m support) | 100% | Local Corridor (`demExtent`) | Available |
| *Basemap (Context)* | `gale-optical` | Gale CTX orbital mosaic | `optical` / `Optical imagery` | ~10.17 m display | 100% | Reviewed Overview Footprint | Available |
| *Research Overlay* | `gale-geology` | Arc Pass geological units | `geology` / `Geological mapping` | Vector (HiRISE 1:250) | 45% | Local Arc Pass Study | Available |
| *Mission Overlay* | `gale-traverse-recorded`| Recorded Curiosity traverse | `overlay` / `Recorded rover traverse`| Vector line | 90% | Sols 0–4868 Path | Available |
| *Coverage Boundary* | `gale-coverage-regional`| Regional terrain coverage | `overlay` / `Data coverage` | Vector boundary | 100% | Full Regional (141.73 km²) | Available |
| *Coverage Boundary* | `gale-coverage-global` | Global terrain coverage | `overlay` / `Data coverage` | Vector boundary | 100% | Local Crop (1,665.25 km²) | Available |

---

## 3. Original Scientific Source Verification

Every layer is traceable to authentic, published planetary datasets:

1. **Regional HRSC 30 m DTM Mosaic:**
   - **Product:** `hrsc_km09_h1938_h1927_h1916-dtm-mosaic.tif`
   - **Citation / DOI:** Divya M. Persaud, Alfiah Diana Rizky Putri, Jan-Peter Muller (2021), *30-m HRSC DTM Mosaic of Gale Crater, Mars*, [DOI 10.5281/zenodo.5808354](https://doi.org/10.5281/zenodo.5808354).
   - **Agencies:** ESA / DLR / Freie Universität Berlin / NASA / JPL-Caltech.
   - **Datum / Vertical Reference:** Mars sphere $R=3,396,190\text{ m}$, heights in metres relative to MOLA areoid.
2. **Global HRSC–MOLA 200 m Blended DEM:**
   - **Product:** `Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif`
   - **Citation:** Fergason, Hare, and Laura (2018), *HRSC and MOLA Blended Digital Elevation Model at 200m v2*, Astrogeology PDS Annex, USGS.
   - **Agencies:** USGS Astrogeology Science Center / NASA / ESA.
3. **Local PDS DEM Subset:**
   - **Product:** `urn:nasa:pds:msl_places:data_maps:msl_orbital_dem::42.0`
   - **Agencies:** NASA/JPL-Caltech PDS Imaging Node; USGS localization team.
4. **Authentic Thermal Layer (THEMIS Daytime IR Controlled Mosaic v2):**
   - **Product:** `THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018`
   - **Service:** NASA Mars Trek WMTS equirectangular planetary grid.
   - **Agencies / Lineage:** NASA / JPL / Arizona State University (ASU); Edwards et al. (2011), Christensen et al. (2004).
   - **Native Resolution:** ~100 m/px, equirectangular Mars 2000 Sphere ($R=3,396,190\text{ m}$).
5. **Curiosity Rover Localization:**
   - **Product:** `urn:nasa:pds:msl_places:data_localizations:localized_interp::42.0`
   - **Agency:** NASA/JPL-Caltech PDS Imaging Node.
6. **Arc Pass Photogeology:**
   - **Product:** `map_unit_polygons_v2` / `Geomap.gdb.zip`
   - **Citation / DOI:** Joel Davis (2025), *GIS Shapefiles of Arc Pass, Mars*, [DOI 10.6084/m9.figshare.30401788.v1](https://doi.org/10.6084/m9.figshare.30401788.v1); Davis et al. (2026), JGR Planets.

---

## 4. Coverage Analysis & Resolution of Problem A

### Geospatial Footprints
- **Mission Overview Footprint (CTX Basemap):**  
  `137.344235..137.457943° E, -4.822361..-4.580605° N` (~$96.259\text{ km}^2$).
- **Regional Terrain Footprint (HRSC 30 m):**  
  `137.327439..137.474719° E, -4.838798..-4.563976° N` (~$141.733\text{ km}^2$).
- **Global-Derived Crop Footprint (HRSC–MOLA 200 m):**  
  `137.099876..137.697095° E, -5.096221..-4.299929° N` (~$1,665.253\text{ km}^2$).
- **Thermal Tile Coverage (THEMIS v2 Mosaic):**  
  `137.327439..137.474719° E, -4.838798..-4.563976° N` (with 0.05° margin).

### Problem A Architectural Fix: Two Presentation Modes

The prior audit established that the larger terrain extents are genuine derived raster crops, not georeferencing defects. Stretching or shrinking rasters to fit the optical overview would corrupt physical measurements.

Instead, we resolve the visual overhang through presentation bounds metadata:

1. **Mission View (Default Mode):**
   - Active scientific raster layers (`gale-regional-elevation`, `gale-regional-hillshade`, `gale-regional-slope`, `gale-thermal`, and global variants) declare `rendering.bounds: missionViewExtent`.
   - In MapLibre GL JS (`lib/map/region-layers.ts:100-116`), this bounding box limits raster tile loading and rendering strictly to `[137.344235, -4.822361, 137.457943, -4.580605]`.
   - Result: Terrain overlays display seamlessly within the mission overview without spilling over outside edges or obscuring empty space.
   - Zero raster distortion; nodata masks, valid data, and raw pixel grids are completely preserved.
2. **Full Data Coverage (Advanced Mode):**
   - Users inspect full extent geometry via Phase 1 vector coverage layers:
     - `gale-coverage-regional` (solid purple outline, $141.733\text{ km}^2$, `zoom_extent: regionalExtent`).
     - `gale-coverage-global` (dashed amber outline, $1,665.253\text{ km}^2$, `zoom_extent: globalExtent`).
   - Clicking "Zoom to regional terrain coverage" fits the complete 141.73 km² extent.
   - The region module exports `galeCoverageModes` for future shared UI presentation-mode toggles.

---

## 5. Visual Standardization & Interpretation Specifications

### 5.1 Elevation Layer
- **Display Palette:** Low-to-high ordered sequential hypsometric tint:
  - `< -4400 m`: `#425A78` (Muted blue-gray — Lowest elevation class)
  - `-4400 to < -4200 m`: `#587E91` (Desaturated teal — Lower elevation)
  - `-4200 to < -3900 m`: `#87A39D` (Warm sand — Intermediate elevation)
  - `-3900 to < -3500 m`: `#BCB29C` (Ochre — Higher elevation)
  - `>= -3500 m`: `#C8A97E` (Rust/brown — Highest elevation class)
- **Vertical Datum & Units:** Metres relative to MOLA areoid, positive up.
- **Default Opacity:** 60% (promotes underlying CTX surface texture visibility).
- **Mandatory Interpretation Text:**  
  *"Elevation shows the height of the Martian surface relative to the stated vertical reference (MOLA areoid). It helps identify topographic differences but does not independently establish route safety."*

### 5.2 Hillshade Layer
- **Visual Presentation:** Neutral grayscale (`#000000` to `#FFFFFF`).
- **Illumination Geometry:** Artificial NW illumination (azimuth 315°, altitude 45°); Horn 3×3 gradients with Mars metric cos(latitude) spacing; no vertical exaggeration, ambient term, or cast shadows.
- **Default Opacity:** 45% (subtle relief enhancement without darkening optical imagery).
- **Mandatory Interpretation Text:**  
  *"Hillshade uses artificial illumination derived from elevation data to reveal terrain shape. It does not represent real sunlight, surface temperature or astronaut hazard severity."*

### 5.3 Slope Layer
- **Display Palette:** Standardized 5-class ordered steepness scale:
  - `0 to < 5°`: `#4E8B7C` (Muted blue-green — Level to gentle slope)
  - `5 to < 10°`: `#D6C875` (Pale yellow — Gentle to moderate slope)
  - `10 to < 15°`: `#E08E45` (Orange — Moderate slope)
  - `15 to < 20°`: `#C25E2E` (Dark orange — Steep slope)
  - `>= 20°`: `#8C382A` (Red-brown — Steepest slope class in representation)
- **Units:** Degrees (°), explicitly designated as display classes, not safety thresholds.
- **Default Opacity:** 60%.
- **Mandatory Interpretation Text:**  
  *"Slope describes local terrain steepness in degrees. Higher values indicate steeper terrain, but slope alone cannot establish astronaut traversability."*
- **Mandatory Scientific Limitation:**  
  *"Small obstacles, surface roughness, loose material and other hazards may not be represented."*

### 5.4 Thermal Layer (THEMIS Daytime IR Controlled Mosaic v2)
- **Instrument / Mission:** 2001 Mars Odyssey Thermal Emission Imaging System (THEMIS IR), bands 9 & 10 (~12.57 µm).
- **Product ID:** `THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018`.
- **Derivation Pipeline:** Fully reproducible Node.js tool `team/gale/prepare_thermal.mjs` fetching from NASA Mars Trek WMTS equirectangular grid, resampled 1:1 nearest-neighbour at source level $L = z - 1$ to Web-Mercator XYZ zooms 5–9 in `public/maps/gale/thermal-tiles/{z}/{x}/{y}.png`.
- **Physical Quantity & Units:** Relative daytime infrared brightness (qualitative DN); units are explicitly `null` (no fabricated temperature or thermal inertia).
- **Display Palette:** 5-step qualitative grayscale:
  - Dark (`#1b1b1b`): Low daytime infrared brightness.
  - Mid-dark (`#4d4d4d`): Lower-intermediate daytime IR brightness.
  - Mid (`#808080`): Intermediate daytime IR brightness.
  - Mid-bright (`#b3b3b3`): Higher-intermediate daytime IR brightness.
  - Bright (`#e6e6e6`): High daytime infrared brightness (does not indicate heat hazard).
- **Default Opacity:** 60%.
- **Mandatory Interpretation Text:**  
  *"Relative daytime infrared brightness only (qualitative). Daytime IR mixes albedo, surface slopes, and thermophysical properties; bright or dark patches are not by themselves a compositional or hazard classification. Not a live weather forecast or real-time thermal environment model."*

---

## 6. Scientific Verification Matrix

| Layer Category | Current Dataset | SOURCE_VERIFIED | PROCESSING_VERIFIED | REGISTRATION_VERIFIED | Visualization Status | Integration Status |
|---|---|---|---|---|---|---|
| **Elevation** | Regional HRSC 30 m DTM (`gale-regional-elevation`) | **VERIFIED** (Zenodo 5808354) | **VERIFIED** (Horn Mars-scaled derivatives, areoid datum) | **UNVERIFIED** (Independent CTX/color registration uncertified) | **Complete** (Ordered low-to-high scale, 60% opacity) | Ready for shared 4-layer UI |
| **Hillshade** | Regional HRSC 30 m DTM (`gale-regional-hillshade`) | **VERIFIED** (Zenodo 5808354) | **VERIFIED** (315° az / 45° alt artificial lighting) | **UNVERIFIED** (Independent CTX/color registration uncertified) | **Complete** (Neutral grayscale, 45% opacity) | Ready for shared 4-layer UI |
| **Slope** | Regional HRSC 30 m DTM (`gale-regional-slope`) | **VERIFIED** (Zenodo 5808354) | **VERIFIED** (Horn 3×3 gradient, 90 m support) | **UNVERIFIED** (Independent CTX/color registration uncertified) | **Complete** (5-class palette `#4E8B7C`..`#8C382A`, 60% opacity) | Ready for shared 4-layer UI |
| **Thermal** | THEMIS Daytime IR v2 (`gale-thermal`) | **VERIFIED** (NASA Trek / ASU Oct 2018) | **VERIFIED** (1:1 nearest-neighbor sampling, tile report) | **UNVERIFIED** (Trek planetocentric sphere vs ellipsoid uncertified) | **Complete** (Qualitative 5-step ramp, 60% opacity) | Ready for shared 4-layer UI |
| *Elevation (Var)* | Global HRSC-MOLA 200 m (`gale-global-elevation`) | **VERIFIED** (USGS PDS Annex) | **VERIFIED** (Bounded range extraction, preserved affine) | **UNVERIFIED** (Global blend co-registration uncertified) | **Complete** (Ordered low-to-high scale, 60% opacity) | Preserved as source variant |
| *Hillshade (Var)* | Global HRSC-MOLA 200 m (`gale-global-hillshade`) | **VERIFIED** (USGS PDS Annex) | **VERIFIED** (315° az / 45° alt artificial lighting) | **UNVERIFIED** (Global blend co-registration uncertified) | **Complete** (Neutral grayscale, 45% opacity) | Preserved as source variant |
| *Slope (Var)* | Global HRSC-MOLA 200 m (`gale-global-slope`) | **VERIFIED** (USGS PDS Annex) | **VERIFIED** (Horn 3×3 gradient, 600 m support) | **UNVERIFIED** (Global blend co-registration uncertified) | **Complete** (5-class palette, 60% opacity) | Preserved as source variant |
| *Elevation (Loc)* | PDS PLACES 1 m/25 m (`gale-terrain`) | **VERIFIED** (PDS PLACES v42.0) | **VERIFIED** (25 m complete-post averages) | **UNVERIFIED** (Possible orthophoto mismatch, unshifted) | **Complete** (Preserved G3.2 audit palette & 100% opacity) | Preserved as historical corridor DEM |
| *Geology* | Arc Pass Photogeology (`gale-geology`) | **VERIFIED** (Joel Davis Figshare 2025) | **VERIFIED** (53 polygons, 7 units preserved) | **UNVERIFIED** (Local study, 1:250 HiRISE digitizing) | **Complete** (Categorical fills, 45% opacity) | Preserved as research overlay |

---

## 7. Files Created & Modified

### Created Files
- `team/gale/prepare_thermal.mjs`: Standalone, reproducible THEMIS daytime IR derivation script (fetch, decode, reproject, PNG encode, audit reporting).
- `team/gale/thermal_report.json`: Audit receipt for the 5 generated THEMIS tiles spanning zooms 5–9 (402,934 bytes, 0 missing source tiles).
- `public/maps/gale/thermal-tiles/5/28/16.png`: Zoom 5 thermal tile.
- `public/maps/gale/thermal-tiles/6/56/32.png`: Zoom 6 thermal tile.
- `public/maps/gale/thermal-tiles/7/112/65.png`: Zoom 7 thermal tile.
- `public/maps/gale/thermal-tiles/8/225/131.png`: Zoom 8 thermal tile.
- `public/maps/gale/thermal-tiles/9/451/262.png`: Zoom 9 thermal tile.
- `tests/gale-four-layers.test.ts`: Node.js test suite for four-layer standardization, opacities, color ramps, thermal integration, and presentation bounds.
- `tests/test_gale_thermal.py`: Python scientific audit test for THEMIS source verification and tile integrity.
- `docs/GALE_FOUR_LAYER_STANDARDIZATION_REPORT.md`: This comprehensive milestone audit report.

### Modified Files
- `regions/gale/terrain-layers.ts`:
  - Added `missionViewExtent` and `thermalExtent`.
  - Added `galeCoverageModes` presentation metadata.
  - Standardized regional elevation to 60% opacity with low-to-high ordered scale.
  - Standardized regional hillshade to 45% opacity with grayscale illumination metadata.
  - Standardized regional slope to 60% opacity with 5-class ordered palette (`#4E8B7C`..`#8C382A`) and degrees units.
  - Standardized global-derived variants with identical color palettes and opacities.
  - Added `gale-thermal` layer definition with complete scientific metadata, 60% opacity, and qualitative brightness legend.
  - Set default `rendering.bounds: missionViewExtent` across all active raster layers to resolve Problem A.
- `regions/gale/config.ts`:
  - Registered `gale-mars-trek-themis` source reference with complete processing notes, DOI citations, and scientific limitations.
- `tests/mission.test.ts`:
  - Added `"gale-thermal"` to available Gale layer assertions.
- `tests/browser/gale-regional-terrain.spec.ts`:
  - Updated regional elevation opacity expectation from `"100"` to `"60"`.

---

## 8. Verification Results

All unit, integration, typecheck, lint, and build suites pass cleanly:

1. **TypeScript Region & Mission Tests:**
   ```powershell
   npx tsx --test tests/regions.test.ts tests/mission.test.ts tests/gale-coverage.test.ts tests/gale-integration.test.ts tests/gale-four-layers.test.ts
   ```
   - `tests/regions.test.ts`: 16/16 passed (0 failures).
   - `tests/mission.test.ts`: 6/6 passed (0 failures).
   - `tests/gale-coverage.test.ts`: 4/4 passed (0 failures).
   - `tests/gale-integration.test.ts`: 3/3 passed (0 failures).
   - `tests/gale-four-layers.test.ts`: 8/8 passed (0 failures).
   - **Total Node.js tests:** 37 passed, 0 failed.

2. **Python Scientific Audit Tests:**
   ```powershell
   python -B -m unittest discover -s tests -p 'test_gale_*.py' -v
   ```
   - 39 tests executed (including `test_gale_thermal.py`, `test_gale_terrain.py`, `test_gale_integration.py`, `test_gale_basemap.py`, `test_gale_color_tiles.py`, `test_gale_dem.py`, `test_gale_registration.py`).
   - **Result:** 38 passed, 1 skipped (`test_usgs_extracted_raster_integrity` due to raw DEM extraction guard), 0 failed.

3. **Static Analysis & Production Build:**
   - `npm run typecheck`: Passed cleanly (zero type errors).
   - `npm run lint`: Passed cleanly (`eslint .`, zero errors, zero warnings).
   - `npm run build`: Production Next.js build succeeded.

---

## 9. Required Shared Frontend Integration Work

Because shared frontend files (`components/**`, `lib/map/**`, `app/**`) are strictly read-only for this regional milestone, the following items are prepared at the data/configuration level and documented for the upcoming shared integration milestone:

1. **UI Category Grouping:**
   - The shared `layer-panel.tsx` should group available layers into the four primary scientific headers: `Elevation`, `Hillshade`, `Slope`, `Thermal`.
   - In Gale, regional products (`gale-regional-*`) should be the primary choices, with global products (`gale-global-*`) accessible via a "Source variant" dropdown or sub-selector.
   - Geological mapping (`gale-geology` / Arc Pass) and rover traverse (`gale-traverse-recorded`) must remain in a separate "Research Overlays" or "Mission Context" accordion to maintain parity with Jezero and Oxia.
2. **Dynamic Presentation Mode Toggle (Mission View vs Full Data Coverage):**
   - In `regions/gale/terrain-layers.ts`, `galeCoverageModes` provides the exact bounds for `missionView` (`missionViewExtent`) and `fullCoverageRegional` (`regionalExtent`).
   - When the shared UI introduces a "Clip to Mission Overview" toggle:
     - Enabled (Default): Sets MapLibre raster source bounds to `missionViewExtent`.
     - Disabled (Full Coverage): Sets source bounds to `regionalExtent` (or removes bounds), revealing the full 141.73 km² HRSC terrain.
3. **Thermal Palette Styling Parity:**
   - Gale's `gale-thermal` and Jezero's `jezero-thermal` use the identical qualitative brightness schema and 60%–70% opacity range. No changes to the shared thermal component are needed.

---

## 10. Documented Scientific Limitations & Constraints

To maintain absolute scientific honesty, the following constraints remain explicitly documented in code, legends, and metadata:
- **Independent Registration:** Co-registration between HRSC stereo DTMs, THEMIS thermal tiles, and the CTX optical mosaic is unverified. Sub-pixel alignment must not be assumed.
- **Posting vs Effective Resolution:** Regional 30 m posting and 90 m north gradient support do not establish effective spatial resolution or absolute vertical accuracy.
- **Slope Traversability:** Slope describes local mathematical gradients only. Small rocks, sand ripples, loose regolith, overhangs, and suit-scale obstacles are unresolved; slope alone cannot certify astronaut route safety.
- **Thermal Physical Quantity:** THEMIS daytime IR mosaic represents qualitative relative brightness (DN). It is uncalibrated for kinetic surface temperature or thermal inertia in this composite mosaic and does not represent live Mars weather or astronaut heat load.
- **Mission Planning Engine Preserved:** Waypoint planning, route validation, and mission timeline engines remain completely unaltered and isolated from terrain display settings.

---

## 11. Git Delivery

- **Branch:** `feat/gale-four-layer-standardization`
- **Delivery Commit:** `feat(gale): prepare unified terrain presentation and thermal layer`
- **Commit SHA:** `cd1270089ccc92d19862c7ee7317ec8faab27bca`
- **Remote Push Status:** Successfully pushed to `origin/feat/gale-four-layer-standardization`
- **Local & Remote HEAD Agreement:** Verified (`cd1270089ccc92d19862c7ee7317ec8faab27bca` == `origin/feat/gale-four-layer-standardization`)
- **Worktree Integrity:** Dedicated worktree `D:\martian-map-gale-four-layers` used exclusively; zero cross-contamination with other worktrees or branches.
