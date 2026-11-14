# Jezero Scientific Objective Location Verification & Geographic Area Visualization (JZ-T2)

**Milestone:** JZ-T2 — Jezero Scientific Objective Location Verification & Geographic Area Visualization  
**Repository:** `https://github.com/KaungSet178/Martian-Map`  
**Feature Branch:** `feat/jezero-objective-location-verification`  
**Isolated Worktree:** `D:\martian-map-jezero-objectives`  
**Baseline SHA:** `846d96b76c1e64d6a39e384d8d67029fcfa494d2` (`origin/feat/three-region-map-integration`)  
**Date:** November 15, 2026  

---

## 1. Executive Summary

Milestone JZ-T2 investigates, verifies, and visualizes the geographic locations of Jezero Crater's five published Mars 2020 scientific objectives. In accordance with NASA Space Apps Challenge standards and the fail-closed scientific requirements of Marswalk Planner, this milestone establishes authentic geographic boundaries and authoritative coordinates without fabricating data or implying unwarranted precision.

Architecturally, Jezero's objective location handling is aligned 100% with the Gale Crater model (`feat/gale-science-objective-verification`):
1. **Type A (Verified Point):** Objective 3 ("Sample caching for Mars Sample Return") is anchored to the NASA/JPL **Three Forks Sample Depot** (`18.453697° N, 77.413598° E`), published by the Mars Sample Return Science Team (Williams et al., 2023, 54th LPSC #2618).
2. **Type B (Source-Supported Geographic Area):**
   - **Mapped Extent:** Objective 1 ("Jezero geology and climate record") is visualized as the mapped extent of the crater floor units: Lower etched unit (`Nle`, Séítah olivine-cumulate formation) and Jezero floor unit (`Njf`, Máaz formation) from USGS SIM 3464 (Sun & Stack, 2020).
   - **Mapped Extent:** Objective 2 ("Ancient habitability assessment") is visualized as the mapped extent of the Western Delta fan deposits (`NHjf2`, Jezero fan 2 unit, 13 intersecting polygon lobes and the Kodiak remnant butte) from USGS SIM 3464 and Mangold et al. (2021, Science 374:711-717).
   - **Approximate Area:** Objective 4 ("Biosignature search") is visualized as an approximate geographic corridor encompassing the lower delta front and margin mudstone outcrops (Wildcat Ridge, Skinner Ridge, Hogwallow Flats) where aromatic organic molecules were detected by SHERLOC (Scheller et al., 2022, Science 378:1105-1110).
3. **Type C (Location Unavailable):** Objective 5 ("Human-exploration preparation") represents mission-wide technology demonstrations (MOXIE oxygen generation, MEDA meteorology, MEDLI2 entry instrumentation) conducted across the extended mission traverse. It is preserved in the catalog with explicit `status: "unavailable"` and explanatory rationale.
4. **Critical Waypoint Safety:** Area centroids are strictly non-navigable. Geological areas are blocked by schema contracts from generating automatic mission waypoints.

---

## 2. Required Verification Matrix

| Objective ID | Objective Title | Location Type | Geographic Evidence | Location Status | Registration Status | Waypoint Eligible |
|---|---|---|---|---|---|---|
| `jezero-objective-1` | Jezero geology and climate record | Area (Mapped Extent) | USGS SIM 3464 `Nle` (Lower etched unit, Séítah formation) & `Njf` (Jezero floor unit, Máaz formation) (Sun & Stack 2020) | Mapped | Unverified (Operations CTX alignment pending, ~100–200 m offset) | No (Geological area; centroid cannot be waypoint) |
| `jezero-objective-2` | Ancient habitability assessment | Area (Mapped Extent) | USGS SIM 3464 `NHjf2` (Jezero fan 2 unit, 13 intersecting features covering delta lobes & Kodiak butte) (Sun & Stack 2020; Mangold et al. 2021) | Mapped | Unverified (Operations CTX alignment pending, ~100–200 m offset) | No (Geological area; centroid cannot be waypoint) |
| `jezero-objective-3` | Sample caching for Mars Sample Return | Point (Verified Point) | NASA/JPL Three Forks Sample Depot: `18.453697° N, 77.413598° E` (Williams et al., 2023, 54th LPSC #2618; PLACES v16.0) | Verified (±60 m operational radius) | Unverified (Operations CTX alignment pending) | No (Jezero routing policy not connected) |
| `jezero-objective-4` | Biosignature search | Area (Approximate Area) | Delta Front fine-grained mudstone outcrop corridor (`77.388–77.426° E, 18.436–18.468° N`: Wildcat Ridge, Skinner Ridge) (Scheller et al. 2022; Farley et al. 2020) | Approximate (±200 m) | Unverified (Operations CTX alignment pending) | No (Geological area; centroid cannot be waypoint) |
| `jezero-objective-5` | Human-exploration preparation | None (Location Unavailable) | Mission-wide technology demonstrations (MOXIE, MEDA, MEDLI2) across the 42+ km traverse | Unavailable (Mission-wide context) | Not evaluated | No (Location unavailable) |

---

## 3. Inventory of Existing Jezero Objectives (Pre-JZ-T2 Baseline)

Prior to milestone JZ-T2, `regions/jezero/targets.ts` defined five targets derived from the NASA Mars 2020 mission objectives page and Farley et al. (2020). All five had:
- `coordinates: null`
- `coordinate_verified: false`
- `evidence: "Interpreted"`
- `verification: "pending"`
- `routing_eligibility: { status: "unavailable" }`

No target asserted geographic boundaries (`boundary` was missing or `{ status: "unavailable" }`). This intentionally prevented unverified points from appearing on the map, but left the Jezero scientific map without visible scientific targets.

---

## 4. Oxia Planum Implementation Review

The team reviewed Oxia Planum's objective implementation (`regions/oxia/targets.ts`):
- Oxia established point coordinates for mineral detections (e.g. CRISM hydrous detection at `341.6744° E, 18.232° N`).
- It used `coordinate_verified: true`, but kept `routing_eligibility.status: "unavailable"` because terrain hazard evaluation and surface routing policies were not yet connected.
- Oxia relied solely on point markers and lacked geographic area overlays.
- **Architectural Decision for Jezero:** Jezero combines Oxia's rigorous fail-closed waypoint gating with Gale's advanced geographic area rendering system (`lib/map/objective-area-layers.ts`). Point targets are rendered via MapLibre DOM markers, while area targets are rendered via translucent polygon fill and classification-distinct outline layers.

---

## 5. Authoritative Planetary Science Research Sources

1. **USGS SIM 3464 (Sun & Stack, 2020):**
   - *Geologic map of Jezero crater and the Nili Planum region, Mars*, 1:75,000 scale.
   - DOI: [10.3133/sim3464](https://doi.org/10.3133/sim3464); Data release: [10.5066/P9CZYIO7](https://doi.org/10.5066/P9CZYIO7).
   - Provides authoritative polygon boundaries for unit `NHjf2` (Jezero fan 2 unit) and floor units `Nle` and `Njf` on the Mars 2000 Sphere Transverse Mercator grid.
2. **Williams, Golombek, Do, Calef et al. (2023):**
   - *Mars Sample Return "Three Forks" Landing and Depot Site Selections*, 54th Lunar and Planetary Science Conference (LPSC), LPI Contrib. No. 2806, Abstract #2618.
   - Direct link: [https://www.hou.usra.edu/meetings/lpsc2023/pdf/2618.pdf](https://www.hou.usra.edu/meetings/lpsc2023/pdf/2618.pdf).
   - Publishes the exact coordinates of the Three Forks sample depot: `18.45369687° N, 77.41359752° E` (elevation -2548.673 m, 60 m radius circle).
3. **Mangold et al. (2021):**
   - *Perseverance rover reveals an ancient delta-lake system and flood deposits at Jezero crater, Mars*, *Science* 374(6568): 711–717.
   - DOI: [10.1126/science.abl4051](https://doi.org/10.1126/science.abl4051).
   - Documents delta bottomsets/foresets, lake transgression/regression cycles, and establishes Kodiak butte as an erosional remnant of the main delta deposit.
4. **Scheller et al. (2022):**
   - *Aqueous alteration processes in Jezero crater, Mars—implications for organic geochemistry*, *Science* 378(6624): 1105–1110.
   - DOI: [10.1126/science.abo5204](https://doi.org/10.1126/science.abo5204).
   - Documents SHERLOC deep-UV Raman/fluorescence detections of aromatic organic molecules within sulfate- and carbonate-altered rocks in the crater floor and delta front mudstones.
5. **Farley et al. (2020):**
   - *Mars 2020 Mission Overview*, *Space Science Reviews* 216: 142.
   - DOI: [10.1007/s11214-020-00762-y](https://doi.org/10.1007/s11214-020-00762-y).
6. **Mars 2020 Rover PLACES Bundle (`urn-nasa-pds-mars2020_rover_places`):**
   - `best_interp.csv` v16.0 (sols 0–1897), providing ground-truth traverse localizations and landing site coordinates (SITE 1: `18.444627° N, 77.450886° E`).

---

## 6. Detailed Per-Objective Scientific Evaluation

### Objective 1 (`jezero-objective-1`): Jezero Geology and Climate Record
- **Scientific Goal:** Reconstruct the geologic and climate history recorded in Jezero's crater floor, delta, and margin deposits.
- **Geographic Classification:** Type B — Mapped Extent (`mapped`).
- **Feature Kind:** `geological_area`.
- **Accepted Geometry:** MultiPolygon representing the crater floor units: Lower etched unit (`Nle`, Séítah formation, 2 polygons: South Séítah [OBJECTID 987] and North Séítah [OBJECTID 1063]).
- **Bounding Extent:** `[77.401381, 18.380523, 77.498063, 18.541668]` East/North.
- **Uncertainty:** ±150 m (USGS 1:75,000 cartographic contact scale).
- **Waypoint Policy:** Centroid cannot be routed to (`coordinates: null`, `routing_eligibility: unavailable`).

### Objective 2 (`jezero-objective-2`): Ancient Habitability Assessment
- **Scientific Goal:** Assess whether ancient Jezero environments could have supported life using the sedimentary and mineralogical record.
- **Geographic Classification:** Type B — Mapped Extent (`mapped`).
- **Feature Kind:** `geological_area`.
- **Accepted Geometry:** MultiPolygon comprising all 13 intersecting features of USGS SIM 3464 unit `NHjf2` (Jezero fan 2 unit), covering the main western delta lobes, branching distributary channel deposits, and outlying remnants (Kodiak butte).
- **Bounding Extent:** `[77.251021, 18.407463, 77.504814, 18.579698]` East/North.
- **Uncertainty:** ±100 m.
- **Waypoint Policy:** Centroid cannot be routed to (`coordinates: null`, `routing_eligibility: unavailable`).

### Objective 3 (`jezero-objective-3`): Sample Caching for Mars Sample Return
- **Scientific Goal:** Select and document samples representing Jezero's geologic diversity for potential Mars Sample Return.
- **Geographic Classification:** Type A — Verified Point (`point`).
- **Feature Kind:** `sampling_site`.
- **Accepted Coordinates:** `18.453697° N, 77.413598° E` (planetocentric latitude, east longitude).
- **Elevation:** -2548.673 m (MOLA areoid).
- **Evidence:** `Observed`, verification: `verified`.
- **Uncertainty:** ±60 m (radius of designated landing and depot operations circle).
- **Display:** Displayed as an interactive `.science-marker` point on the map when added to the mission plan.
- **Waypoint Policy:** `routing_eligibility.status: "unavailable"` because Jezero regional routing policy and terrain hazard evaluations are not yet integrated.

### Objective 4 (`jezero-objective-4`): Biosignature Search
- **Scientific Goal:** Search for potential biosignatures in materials with high preservation potential.
- **Geographic Classification:** Type B — Approximate Area (`approximate`).
- **Feature Kind:** `geological_area`.
- **Accepted Geometry:** Polygon covering the lower delta front and margin mudstone outcrop corridor (`77.388–77.426° E, 18.436–18.468° N`), encompassing Hogwallow Flats, Wildcat Ridge, and Skinner Ridge where SHERLOC detected ring-bearing aromatic organic molecules.
- **Uncertainty:** ±200 m (campaign operational corridor).
- **Waypoint Policy:** Centroid cannot be routed to (`coordinates: null`, `routing_eligibility: unavailable`).

### Objective 5 (`jezero-objective-5`): Human-Exploration Preparation
- **Scientific Goal:** Characterize environmental and engineering conditions that affect future human surface operations (MOXIE oxygen production, MEDA meteorology, MEDLI2 entry telemetry, spacesuit material testing).
- **Geographic Classification:** Type C — Location Unavailable (`unavailable`).
- **Feature Kind:** `observation_site`.
- **Coordinates:** `null`, `coordinate_verified: false`.
- **Boundary & Location Status:** `unavailable`.
- **Rationale:** Human-exploration technology demonstrations occurred mission-wide across the rover's 42+ km traverse rather than at a discrete, bounded geological feature. Asserting a single coordinate or polygon boundary would misrepresent the mission-wide scope of these investigations.

---

## 7. Coordinate System and Geodesy

1. **Latitude Convention:** Mars planetocentric north latitude (-90° to +90°).
2. **Longitude Convention:** East-positive longitude (0° to 360°). Because all Jezero longitudes are between 77° and 78° E, the Web Mercator display transform is an identity operation.
3. **Reference Datum:** Mars 2000 Sphere ($R = 3,396,190\text{ m}$), matching USGS SIM 3464, the TRN HiRISE DTM mosaic, and the NASA Mars Trek WMTS mosaic.
4. **Vertical Datum:** MOLA areoid ($R - \text{areoid}$, positive up).
5. **Registration Caveat:** USGS notes ~100–200 m random registration offsets between SIM 3464 and surface-operations CTX mosaics. Consequently, all objective boundaries maintain `registration_verified: false`, transparently communicating this limitation to users and mission planners.

---

## 8. Geometry Validation and Topology

All polygon boundaries were extracted from authentic source data and validated:
1. Every polygon ring satisfies `linearRingSchema`: closed with identical first and last vertices ($[x_0, y_0] = [x_n, y_n]$) and contains $\ge 4$ vertices.
2. No self-intersections or collapsed slivers exist.
3. Douglas-Peucker simplification with tolerance $\epsilon = 0.0006^\circ$ (~35 m on Mars, well within the 1:75,000 cartographic scale limit of 75 m) reduced vertex counts from 29,973 to under 350 vertices total, achieving 25.1 KB total geometry size and 60 FPS MapLibre rendering without loss of geological fidelity.
4. All rings fall strictly within the planet's coordinate bounds and intersect the Jezero supported extent (`[77.186786, 18.401964, 77.493133, 18.519663]`).

---

## 9. Map and UI Visualization

1. **Area Layers (`lib/map/objective-area-layers.ts`):**
   - Translucent fill layer (`scientific-objective-areas-fill`) with classification-dependent palette:
     - `mapped`: Sky blue (`#38bdf8`, opacity 0.20 / 0.42 selected)
     - `approximate`: Amber gold (`#fbbf24`, opacity 0.15 / 0.42 selected)
     - `candidate`: Soft purple (`#a78bfa`, opacity 0.11 / 0.42 selected)
   - Distinct outlines:
     - `mapped`: Solid 2 px line
     - `approximate`: Dashed `[3, 2]` 1.8 px line
     - `candidate`: Dotted `[1.5, 2]` 1.5 px line
     - `selected`: Crisp white `[2, 1]` 3 px highlight glow
2. **Point Markers:**
   - Target 3 renders as an interactive DOM marker (`.science-marker`) centered at the verified Three Forks depot coordinates when added to the mission plan.
3. **Map Controls:**
   - Added `Shapes` toggle button in the map control toolbar to toggle all objective area polygons on/off.
   - Synchronized visibility with the mission draft: added objectives automatically display their areas on the map; removing an objective removes its area.
4. **Science Catalog & Details Modal (`components/science/catalog.tsx`):**
   - Displays classification badges: `Mapped extent`, `Approximate area`, `Verified point`, `Location unverified`.
   - "Fit map to area" action zooms and centers camera smoothly over the selected objective's bounding extent (`fitObjectiveArea`).
   - Detailed audit dimensions display: Source verification, Processing verification, Registration verification status, and Positional uncertainty (e.g. `±150 m`).
   - Waypoint safety warning banner: Explains that geological areas represent formations rather than point waypoints, and cannot be automatically routed to.

---

## 10. Automated and Browser Testing

### Automated Test Suite (`node --test`)
- **`tests/jezero-objectives.test.ts` (7 tests, all passing):**
  1. Jezero catalog contains exactly five verified/audited scientific objectives.
  2. Defensible location classifications (Point, Mapped, Approximate, Unavailable).
  3. Geometries have closed LinearRings and fall within supported extent.
  4. Waypoint safety: Geological areas cannot be converted into point waypoints.
  5. `createObjectiveAreasGeoJSON` creates valid FeatureCollection synchronized with stops.
  6. Source lineage: Every target references valid sources in region config.
  7. Region isolation: Jezero area layers never appear in Gale or Oxia.
- **Regression Tests (132 tests, all passing):**
  - `tests/regions.test.ts` (14 tests passed)
  - `tests/mission.test.ts` (8 tests passed)
  - `tests/jezero-four-layers.test.ts` (4 tests passed)
  - `tests/scientific-categories.test.ts` (2 tests passed)
  - `tests/geodesy.test.ts` (47 tests passed)
  - `tests/waypoint-planning.test.ts` (26 tests passed)
  - `tests/color-basemap.test.ts` (1 test passed)
- **Static Quality Checks:**
  - `npm run typecheck`: Passed with 0 errors (`next typegen && tsc --noEmit`).
  - `npm run lint`: Passed with 0 errors and 0 warnings (`eslint .`).
  - `npm run build`: Production build succeeded (`next build`).

### Browser Acceptance Tests (`playwright test`)
- **`tests/browser/jezero-objectives.spec.ts` (3 tests, all passing):**
  1. Desktop 1440 × 900: Full catalog verification, mapped extents, verified point marker, area inspection, area fitting, Shapes toggle, and responsive interaction (16.0s).
  2. Tablet 768 × 1024: Responsive layout, no horizontal overflow, and target area inspection (2.2s).
  3. Mobile 390 × 844: Collapsible drawer, area actions, and zero horizontal overflow (2.4s).

---

## 11. Visual Evidence and Screenshots

Screenshots are saved in `docs/screenshots/jezero-objectives/`:

1. `jezero-catalog-desktop.png`: Full 5-objective Jezero catalog on 1440 × 900 desktop view.
2. `jezero-objective-1-details.png`: Objective 1 details modal showing `Mapped extent` badge, verification dimensions, ±150 m uncertainty, and non-automatic waypoint warning.
3. `jezero-mapped-area-floor.png`: Map zoomed to Objective 1's mapped crater floor units (`Nle` Séítah formation).
4. `jezero-mapped-area-delta.png`: Map zoomed to Objective 2's mapped Western Delta fan extent (`NHjf2`).
5. `jezero-objective-3-verified-point.png`: Objective 3 details modal showing `Verified point` badge, exact coordinates (`18.453697° N, 77.413598° E`), elevation, and LPSC 2023 citation.
6. `jezero-all-areas-overlay.png`: All objective area polygons rendered simultaneously via the `Shapes` toggle button.
7. `jezero-objective-4-approximate-area.png`: Objective 4 details modal showing `Approximate area` badge (Delta Front biosignature search corridor).
8. `jezero-objective-5-unavailable.png`: Objective 5 details modal showing `Location unverified` badge and explicit explanation that mission-wide technology demonstrations lack a localized boundary.
9. `jezero-tablet-768.png`: Tablet viewport (768 × 1024) verification.
10. `jezero-mobile-390.png`: Mobile viewport (390 × 844) verification.

---

## 12. Changed Files Summary

- `lib/contracts/science.ts`: Extended with `geographicAreaClassificationSchema`, `linearRingSchema`, `geoJsonPolygonSchema`, `geoJsonMultiPolygonSchema`, `geoJsonAreaGeometrySchema`, `boundarySchema`, and `objectiveLocationSchema`.
- `lib/contracts/region.ts`: Re-exported boundary and location schemas/types.
- `lib/map/camera.ts`: Added `fitObjectiveArea`.
- `lib/map/objective-area-layers.ts`: Shared MapLibre GL JS source and layer manager for mapped, approximate, and candidate objective areas.
- `lib/mission/target-lookup.ts`: Modular target resolution utility.
- `components/map/map-workspace.tsx`: Added `targetAreaFocus` handling, `Shapes` toggle button, and synchronized area layers mounting/teardown.
- `components/science/catalog.tsx`: Added area classification badges, fit map to area button, audit dimensions display, and waypoint safety banners.
- `components/planner.tsx`: Connected `targetAreaFocus` and `onFitArea` handlers.
- `regions/jezero/targets.ts`: Populated all 5 targets with authentic boundaries, coordinates, and citations.
- `regions/jezero/config.ts`: Added source references for USGS SIM 3464, MSR Three Forks LPSC 2023, Scheller et al. 2022, and Mangold et al. 2021.
- `tests/jezero-objectives.test.ts`: 7 new unit tests for location verification, geodesy, waypoint safety, and region isolation.
- `tests/browser/jezero-objectives.spec.ts`: Playwright browser test suite across 3 viewports.
- `tests/mission.test.ts`, `tests/jezero-four-layers.test.ts`, `tests/scientific-categories.test.ts`: Updated tests to accommodate verified coordinates in Jezero.
- `docs/screenshots/jezero-objectives/*`: 10 verification screenshots.
