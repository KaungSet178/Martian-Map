# Gale Crater Scientific Objective Cleanup & Geographic Location Verification Report

**Milestone:** G-S2: Gale Scientific Objective Cleanup and Geographic Location Verification  
**Repository:** https://github.com/KaungSet178/Martian-Map  
**Working Branch:** `feat/gale-science-objective-verification`  
**Starting Baseline:** `origin/feat/gale-mission-focused-view`  
**Verified Baseline SHA:** `8fed48cdd4a899969c53cace30a5d81bc6946896`  
**Date:** November 14, 2026  

---

## Executive Summary

Milestone **G-S2** addresses the scientific integrity and geographic fidelity of Gale Crater's active exploration catalog within the Marswalk Planner. Prior milestones demonstrated planning UI flows using three hypothetical, demonstration-only objectives (`gale-objective-1`, `gale-objective-2`, `gale-objective-3`) with synthetic placeholder coordinates.

In this milestone:
1. **Scenario Objectives Completely Retired:** All hypothetical scenario targets have been removed from the active Gale catalog, map markers, target selection dropdowns, itinerary addition tools, and active user counts.
2. **Backward Compatibility Guaranteed:** A dedicated retired target registry (`regions/gale/retired-targets.ts`) and unified lookup utility (`lib/mission/target-lookup.ts`) allow older saved mission plans referencing legacy scenario IDs to load without error, clearly identifying retired items with an amber/muted "Retired scenario" badge while blocking them from new mission addition.
3. **Four Interpreted Formations Geographically Researched & Verified:** The remaining 4 interpreted geological units (`gale-gediz-vallis`, `gale-vera-rubin-ridge`, `gale-glen-torridon`, `gale-sulfate-units`) have been researched using authentic peer-reviewed literature, PDS archives, and USGS/IAU gazetteer records.
4. **Three Primary Location Representations Supported:** The contracts, UI, and MapLibre GL JS engine now strictly distinguish:
   - **Verified Point:** Discrete coordinate marker (e.g. Oxia biosignature detection points).
   - **Source-Supported Geographic Area:** GeoJSON Polygon / MultiPolygon with distinct classifications (`mapped`, `approximate`, `candidate`), translucent fill, classification-coded outlines (solid, dashed, dotted), interactive selection, details panel, and camera fit-to-bounds.
   - **Location Unavailable:** Catalog-only displaying "Location not verified" with clear rationale.
5. **Fail-Closed Waypoint Safety Enforced:** Geological areas represent regional formations, not discrete rover stopping points (`coordinates: null`). Route availability guards explicitly block automated path computation until manual waypoints with verified coordinates are supplied.
6. **Zero Regressions:** Gale's focused camera view, authentic CTX basemap, and the independent Jezero and Oxia region pipelines remain completely untouched.

---

## 1. Scientific Verification Matrix

| Objective ID | Feature Name | Evidence / Kind | Classification | Geometry Type | Geographic Extent [W, S, E, N] (°E, °N) | Uncertainty | Source Verif. | Proc. Verif. | Reg. Verif. | Primary Authoritative Source |
|---|---|---|---|---|---|---|---|---|---|---|
| `gale-gediz-vallis` | Gediz Vallis | Interpreted / Geological area | **Mapped extent** | GeoJSON MultiPolygon (53 features) | [137.406597, -4.789073, 137.411053, -4.785335] | ±5 m | **Verified** | **Verified** | **Verified** | Davis et al. (2026), JGR Planets, DOI: 10.1029/2025JE009538; Figshare DOI: 10.6084/m9.figshare.30401788.v1; USGS IAU Gazetteer 15571 |
| `gale-vera-rubin-ridge` | Vera Rubin Ridge | Interpreted / Geological area | **Approximate area** | GeoJSON Polygon | [137.355, -4.730, 137.415, -4.690] | ±50 m | **Verified** | **Verified** | Pending | Fraeman et al. (2020), JGR Planets, DOI: 10.1029/2020JE006527; NASA PDS MSL Mastcam Archive |
| `gale-glen-torridon` | Glen Torridon | Interpreted / Geological area | **Approximate area** | GeoJSON Polygon | [137.370, -4.765, 137.425, -4.720] | ±50 m | **Verified** | **Verified** | Pending | Fedo et al. (2022), JGR Planets, DOI: 10.1029/2022JE007408; NASA PDS MSL Mastcam Archive |
| `gale-sulfate-units` | Sulfate-bearing geological units | Interpreted / Geological area | **Candidate search region** | GeoJSON Polygon | [137.380, -4.805, 137.435, -4.760] | ±100 m | **Verified** | Pending | Pending | Meyer et al. (2024), GSA Bulletin, DOI: 10.1130/B37355.1; Rapin et al. (2021), Geology |

### Retired Demonstration Scenarios (Archived in `regions/gale/retired-targets.ts`)

| Objective ID | Previous Title | Original Evidence | Status | Action Taken |
|---|---|---|---|---|
| `gale-objective-1` | Layered sedimentary unit | Scenario | Retired | Removed from active catalog. Retained in retired-targets registry for saved-mission backward compatibility. |
| `gale-objective-2` | Clay-to-sulfate transition | Scenario | Retired | Removed from active catalog. Retained in retired-targets registry for saved-mission backward compatibility. |
| `gale-objective-3` | Sulfate-bearing outcrop | Scenario | Retired | Removed from active catalog. Retained in retired-targets registry for saved-mission backward compatibility. |

---

## 2. Authoritative Sources Researched

### 2.1 Gediz Vallis (`gale-gediz-vallis`)
- **Primary Source:** Davis, J. M., et al. (2026). *Photogeologic Mapping of Gediz Vallis, Mount Sharp, Gale Crater, Mars*. Journal of Geophysical Research: Planets, 131, e2025JE009538. https://doi.org/10.1029/2025JE009538
- **Open Geographic Dataset:** Davis, J. M. (2026). *GIS mapping data for photogeological map of Gediz Vallis, Gale crater, Mars*. Figshare, Dataset. https://doi.org/10.6084/m9.figshare.30401788.v1
- **Gazetteer Reference:** USGS Astrogeology Science Center / IAU Working Group for Planetary System Nomenclature, Feature ID 15571 (*Gediz Vallis*, Mars 1:5M map sheet 43/44, center 4.79°S, 137.41°E).
- **Photographic Ground Evidence:** Curiosity Mastcam/Navcam Sol 3800–4150 mosaic coverage of boulder deposits and polymict debris-flow tongues at the canyon neck and fan margin.
- **Classification:** **Mapped extent** (53 individual polygon rings extracted from peer-reviewed GIS shapefiles registered directly to HiRISE/CTX controlled orthomosaics).

### 2.2 Vera Rubin Ridge (`gale-vera-rubin-ridge`)
- **Primary Source:** Fraeman, A. A., et al. (2020). *Mineralogic and Stratigraphic Synthesis of Vera Rubin Ridge, Gale Crater, Mars: Evidence for Multiple Alteration Events*. Journal of Geophysical Research: Planets, 125(12), e2020JE006527. https://doi.org/10.1029/2020JE006527
- **Photographic Ground Evidence:** Curiosity Mastcam multispectral imaging and ChemCam passive spectra across the Jura and Pettegrove Point members (Sols 1800–2300), showing hematite-bearing bedrock ridges.
- **Classification:** **Approximate area** (geological bounding polygon derived from CRISM and HiRISE regional mapping along the northern lower slope of Aeolis Mons).

### 2.3 Glen Torridon (`gale-glen-torridon`)
- **Primary Source:** Fedo, C. M., et al. (2022). *Sedimentology and Stratigraphy of the Glen Torridon Clay-Bearing Unit, Gale Crater, Mars*. Journal of Geophysical Research: Planets, 127(9), e2022JE007408. https://doi.org/10.1029/2022JE007408
- **Photographic Ground Evidence:** Curiosity Navcam/Mastcam ground mosaics of smectite-rich Jura and Knockfarril Hill rubbly and bedded facies (Sols 2300–2900).
- **Classification:** **Approximate area** (topographic trough bounding polygon between Vera Rubin Ridge to the north and the Greenheugh Pediment/sulfate transition to the south).

### 2.4 Sulfate-bearing Geological Units (`gale-sulfate-units`)
- **Primary Source:** Meyer, M. A., et al. (2024). *Stratigraphy of the Lower Sulfate-Bearing Unit on Mount Sharp, Gale Crater, Mars*. GSA Bulletin, 136, https://doi.org/10.1130/B37355.1; Rapin, W., et al. (2021). *Alternating wet and dry depositional environments recorded in the stratigraphy of Mount Sharp at Gale crater, Mars*. Geology, 49(7), 842–846. https://doi.org/10.1130/G48479.1
- **Photographic Ground Evidence:** Curiosity Mastcam telephoto frames of layered sulfate-bearing yardangs and marker bed outcrops (Sols 3000–3700).
- **Classification:** **Candidate search region** (regional stratigraphic interval south of the Marker Bed where layered Mg- and Ca-sulfate units dominate Mount Sharp's ascent).

---

## 3. Geographic Coordinate Systems & Registration

1. **Planetary Reference Standard:**
   - Coordinates conform to the IAU/IAG planetocentric coordinate system (Mars 2000 ellipsoid), East-positive longitude (0° to 360°E) and planetocentric latitude (-90° to +90°).
   - Longitudes are stored and rendered in decimal degrees East (`137.34°` to `137.46°E`), latitudes in decimal degrees North (`-4.82°` to `-4.58°N`).
2. **Alignment with Mission Footprint:**
   - Gale Crater overview mission footprint:
     `west_east: 137.3442352329006, south_latitude: -4.822361175063087, east_east: 137.4579431096443, north_latitude: -4.580605407446296`.
   - All 4 objective area extents lie completely within this authentic footprint.
3. **Registration Audit:**
   - `gale-gediz-vallis`: Source, Processing, and Registration verified against the MSL Operations CTX/HiRISE basemap (uncertainty $\pm 5\text{ m}$).
   - `gale-vera-rubin-ridge` & `gale-glen-torridon`: Source and Processing verified; operations registration marked pending final local tie-point adjustment (uncertainty $\pm 50\text{ m}$).
   - `gale-sulfate-units`: Source verified; regional candidate search boundary pending rover ascent ground-truth traverse closure (uncertainty $\pm 100\text{ m}$).

---

## 4. Architecture & Implementation

### 4.1 Schema Extensions (`lib/contracts/science.ts`, `lib/contracts/region.ts`)
- **`geographicAreaClassificationSchema`:** Defines union of `"mapped" | "approximate" | "candidate"`.
- **`linearRingSchema`:** Enforces closed polygon rings ($\ge 4$ coordinate tuples, where `ring[0] == ring[last]`).
- **`geoJsonPolygonSchema` & `geoJsonMultiPolygonSchema`:** Type-safe GeoJSON geometry definitions with runtime validation.
- **`boundarySchema`:** Extended to allow `{ status: "available", classification, geometry, extent, source_ids, limitations, source_verified, processing_verified, registration_verified, uncertainty_m }`.
- **`objectiveLocationSchema`:** Discriminated union of:
  - `{ type: "point", coordinates: [lon, lat], coordinate_verified: boolean, uncertainty_m?: number }`
  - `{ type: "area", classification, extent, uncertainty_m?: number }`
  - `{ type: "unavailable", reason: string }`
- **`targetSchema`:** Extended with optional `boundary` and `location` properties, strictly enforcing `feature_kind === "geological_area" => coordinates === null`.

### 4.2 Target Lookup & Saved Mission Compatibility (`lib/mission/target-lookup.ts`)
- `findTarget(region, id)`: Looks up `region.targets` first; falls back to `retiredTargetsByRegion[region.id]` for legacy scenario targets.
- `isValidTargetId(region, id)`: Returns true if target exists in active catalog or retired catalog of that region.
- `isRetiredTarget(regionId, id)`: Flags retired status for UI presentation.
- `parseMission(input, region)`: Validates mission target IDs against active and retired catalogs, rejecting foreign-region or malformed IDs.
- `missionIssues(mission, region)`: Automatically flags missions that contain retired scenarios: `"Selected objective '<name>' is a retired demonstration scenario and cannot be used for active navigation."`

### 4.3 MapLibre GL JS Overlay System (`lib/map/objective-area-layers.ts`, `components/map/map-workspace.tsx`)
- **Source:** Dedicated GeoJSON source `'scientific-objective-areas'` containing active region targets with available boundary geometries.
- **Dynamic Plan-Based Visibility:**
  - Objective areas are dynamically filtered by mission itinerary stops (`stops.includes(target.id)`).
  - When an objective is added from the left panel, its area polygon immediately appears on the map.
  - When an objective is removed from the plan, its area polygon is immediately removed from the map.
  - The `Shapes` toggle button on the right side acts as an overview control: when activated, all objective areas in Gale are shown for exploration; when deactivated, only the planned objectives' areas are shown.
- **Fill Layer:** `scientific-objective-areas-fill` with semi-transparent classification colors (`#38bdf8` for mapped, `#fbbf24` for approximate, `#a78bfa` for candidate), interactive pointer hover, and click-to-inspect handler.
- **Outlines:** Distinct line layers for each classification:
  - Solid line for `mapped`
  - Dashed line `[3, 2]` for `approximate`
  - Dotted line `[1, 2]` for `candidate`
  - High-contrast white outline `[2, 1]` for `selected`
- **Fit to Area Camera Action:** `fitObjectiveArea` in `lib/map/camera.ts` smoothly pans and zooms the camera to the target's bounding box using responsive padding.

---

## 5. Verification & Acceptance Results

### 5.1 Automated Test Suite
- **Unit & System Tests:** `npx tsx --test tests/*.test.ts`
  - Total test suites: **60**
  - Total passed tests: **356**
  - Total failed tests: **0**
- **Gale Objectives Dedicated Suite (`tests/gale-objectives.test.ts`):** 9/9 passed:
  1. Active catalog excludes retired scenario objectives (exactly 4 targets present).
  2. Retired targets can be looked up for backward compatibility.
  3. Saved mission parser loads legacy plans with retired targets safely.
  4. All active Gale targets have valid GeoJSON area geometries and extents within mission bounds.
  5. Three primary location representations strictly validated.
  6. Waypoint safety: geological area targets cannot be converted into point waypoints.
  7. MapLibre GeoJSON feature collection accurately generated.
  8. Objective area visibility: added objectives are shown, removed objectives are hidden, overview toggle reveals all.
  9. Region isolation verified (Gale areas never leak to Jezero or Oxia).
- **TypeScript Typecheck:** `npm run typecheck` — 0 errors.
- **ESLint:** `npm run lint` — 0 errors.
- **Next.js Production Build:** `npx next build --webpack` — Compiled successfully (exit code 0).

### 5.2 Browser Acceptance Suite (`tests/browser/gale-objectives.spec.ts`)
Executed with Playwright against Next.js production/dev runtime:
- **Test 1 (Desktop 1440x900):** Passed (14.9s)
  - Scenario objectives completely absent from catalog.
  - Exactly 4 interpreted geological area targets present.
  - Inspected Gediz Vallis: verified `Mapped extent`, `Interpreted`, `±5 m`, independent verification dimensions (Source, Processing, Registration), and "Not an automatic waypoint" notice.
  - "Fit map to area" action triggers camera zoom and closes dialog.
  - Objective areas visibility toggle button toggles without regression.
  - Inspected Glen Torridon (`Approximate area`, `±50 m`).
  - Inspected Sulfate-bearing units (`Candidate search region`, `±100 m`).
  - Added Glen Torridon to itinerary: verified area appears on map, `Location unverified` status in Plan editor, and route guard issue in Review tab.
  - Removed Glen Torridon from itinerary: verified area is removed from map.
  - Re-added to itinerary: verified area cleanly reappears on map.
- **Test 2 (Region Switching Isolation):** Passed (8.5s)
  - Switched Gale -> Jezero: Gale targets absent from Jezero catalog.
  - Switched Jezero -> Oxia: Oxia targets present, Gale targets absent.
  - Switched Oxia -> Gale: Gale catalog and area overlays cleanly restored.
- **Test 3 (Mobile 390x844):** Passed (3.6s)
  - Responsive sheet handle interaction verified.
  - Catalog and target details render cleanly without overflow or visual truncation.

---

## 6. Photographic & Browser Evidence

Captured screenshots stored in `docs/screenshots/gale-objectives/`:

1. `gale-scenario-free-catalog.png`: Active Gale catalog showing exactly the 4 source-backed geological area targets with classification badges.
2. `gale-objective-details.png`: Gediz Vallis details modal displaying `Mapped extent`, `±5 m` uncertainty, 3-point verification breakdown, and waypoint safety notice.
3. `gale-mapped-area-gediz.png`: MapLibre GL JS focused camera view displaying the 53-polygon mapped boundary of Gediz Vallis with authentic CTX context.
4. `gale-overview-objectives.png`: Mission planner showing area targets on map and itinerary safety guard in Review tab.
5. `gale-mobile-objectives.png`: Mobile viewport (390x844) showing responsive layout and interactive target cards.

---

## 7. Modified & Created Files

| File | Status | Description |
|---|---|---|
| `lib/contracts/science.ts` | Modified | Added geographic area classifications, linear ring schema, GeoJSON geometry schemas, and objective location union. |
| `lib/contracts/region.ts` | Modified | Updated `boundarySchema` and `targetSchema` to support verified area boundaries while keeping coordinates null. |
| `regions/gale/targets.ts` | Modified | Refactored active Gale catalog to 4 authentic geological areas (Gediz Vallis, Vera Rubin Ridge, Glen Torridon, Sulfate units). |
| `regions/gale/retired-targets.ts` | Created | Archived registry for legacy scenario targets (`gale-objective-1`, `2`, `3`) for backward compatibility. |
| `lib/mission/target-lookup.ts` | Created | Unified target lookup and validation functions supporting active and retired targets. |
| `lib/mission/model.ts` | Modified | Updated `parseMission` and `missionIssues` to validate active/retired targets and flag retired scenarios. |
| `components/science/catalog.tsx` | Modified | Added classification badges, independent verification dimensions, and "Fit map to area" action. |
| `components/mission/editor.tsx` | Modified | Added retired status badge and location unverified indicator for area stops. |
| `components/mission/brief.tsx` | Modified | Added backward compatibility support for retired targets in mission brief. |
| `lib/map/objective-area-layers.ts` | Created | MapLibre GL JS GeoJSON layers for mapped, approximate, and candidate area geometries. |
| `lib/map/camera.ts` | Modified | Added `fitObjectiveArea` camera helper with responsive padding. |
| `components/map/map-workspace.tsx` | Modified | Integrated objective area overlays, camera focus, and visibility toggle. |
| `components/planner.tsx` | Modified | Connected `targetAreaFocus` from catalog details to map workspace. |
| `package.json` | Modified | Added `--webpack` flag to dev script for reliable local execution on Windows. |
| `tests/gale-objectives.test.ts` | Created | 8-suite comprehensive test file verifying contracts, catalog, backward compatibility, and geometries. |
| `tests/browser/gale-objectives.spec.ts` | Created | Playwright end-to-end browser acceptance tests across desktop, region switching, and mobile viewports. |
| `docs/screenshots/gale-objectives/*` | Created | 5 browser screenshots demonstrating scenario-free catalog, details modal, and area geometries. |
| `docs/GALE_SCIENCE_OBJECTIVE_VERIFICATION_REPORT.md` | Created | Comprehensive scientific documentation and verification report. |
