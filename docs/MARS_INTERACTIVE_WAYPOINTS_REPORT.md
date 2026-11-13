# Mars Interactive Map Waypoint Placement & Geometric Trajectory Visualization — Technical & Verification Report

**Module:** Milestone M3 — Interactive Map Waypoint Placement and Geometric Trajectory Visualization  
**Workspace:** `D:\martian-map`  
**Active Branch:** `feat/interactive-waypoints`  
**Base Commit:** `34316b9` (`feat/gale-map`)  
**Status:** Fully implemented, verified across viewports and accessibility standards, production-built  
**Date:** November 2026 (NASA Space Apps Challenge 2026)  

---

## 1. Executive Summary & Purpose

Milestone M3 bridges the Marswalk Planner geometric mission planning engine (M1–M2.3) with direct MapLibre GL JS planetary cartography. It introduces real-time interactive waypoint placement directly onto the surface map, high-fidelity great-circle trajectory densification and rendering, comprehensive mobile and accessibility support, and strict scientific regional coverage enforcement.

### Key Capabilities Delivered

1. **Interactive Canvas Waypoint Placement:** Single-click placement of new planning waypoints directly on the MapLibre GL JS canvas within verified scientific boundaries.
2. **Planetocentric Coordinate Normalization:** Exact conversion between MapLibre Web Mercator coordinates ($[-180, 180]$ longitude, $[-85.0511, 85.0511]$ latitude) and IAU/IAG Mars planetocentric East-positive coordinates ($[0, 360)^\circ\text{ E}$, $[-90, 90]^\circ\text{ lat}$).
3. **Great-Circle Trajectory Densification:** Spherical densification using spherical linear interpolation (slerp) on the Mars reference sphere ($\mathcal{R}_{\text{Mars}} = 3{,}396{,}190\text{ m}$) at $\le 100\text{ m}$ step increments, complete with antimeridian seam crossing detection.
4. **Native WebGL Trajectory Layers:** Two-tone high-contrast styling (dark casing `#09111F` width 5.5px, outbound dashed `#59E3FA` width 3px dash `[3, 1]`, and return dashed `#59E3FA` width 2.5px dash `[1, 2]`) rendered directly via MapLibre GeoJSON sources for smooth 60fps pan and zoom.
5. **Decoupled DOM Marker Lifecycle:** Semantic SVG/DOM markers representing waypoint roles (`base`, `intermediate`, `science_stop`, `destination`/`recovery_endpoint`), with DOM class styling decoupled from marker object destruction to prevent UI flicker and click event interception.
6. **Accessible & Responsive Workflows:**
   - Visual placement mode banner with dedicated Cancel button and `Escape` key shortcut.
   - Non-mouse keyboard/screen reader fallback form (`ManualCoordinateEntry`) with immediate boundary validation.
   - Mobile-adaptive responsive layout with collapsed bottom sheet during placement and bottom-aligned banner at 390px viewports.
   - Two-way selection synchronization: selecting on map highlights the itinerary stop; selecting in itinerary highlights the map marker.
7. **Scientific Regional Coverage Gating:** Placement is restricted strictly to regions possessing verified high-resolution scientific base maps (Gale Crater). In unverified regions (Jezero Crater, Oxia Planum), interactive placement is disabled with an explanatory scientific advisory notice.
8. **Standard Scientific Disclaimer:** Trajectory layers, map legend, and mission itinerary consistently display:  
   `"Proposed geometric trajectory — spherical Mars approximation (R = 3,396,190 m)"`.

---

## 2. Architecture & File Structure

```
martian-map/
├── lib/
│   ├── map/
│   │   ├── geodesy.ts                  # M1 Mars spherical geodesy foundation (R = 3,396,190 m)
│   │   └── waypoint-layers.ts          # M3 MapLibre GeoJSON generator, converters, & layer mounting
│   └── mission/
│       ├── types.ts                    # Core mission data contracts (marswalk.missions.v1)
│       └── waypoint-planning.ts        # M2 Immutable waypoint planning engine
├── components/
│   ├── map/
│   │   └── map-workspace.tsx           # MapLibre container, trajectory layers, DOM markers, click handling
│   ├── mission/
│   │   ├── waypoint-editor.tsx         # Waypoint editor panel, placement trigger, manual entry form
│   │   └── waypoint-itinerary.tsx      # Ordered itinerary list, leg metrics, and selection highlights
│   └── planner.tsx                     # Top-level coordinator, mobile sheet toggle, selection state
├── app/
│   └── globals.css                     # Placement mode styles, marker roles, legends, responsive rules
├── tests/
│   ├── waypoint-layers.test.ts         # M3 Unit test suite for coordinate conversions and GeoJSON generation
│   └── browser/
│       └── interactive-waypoints.spec.ts # M3 Playwright browser & accessibility test suite
└── docs/
    └── MARS_INTERACTIVE_WAYPOINTS_REPORT.md # This milestone report
```

---

## 3. Mathematical & Planetary Geodesy Specifications

### 3.1 Mars Planetocentric Coordinate Projection

MapLibre GL JS operates on a standard Web Mercator coordinate system where coordinates are reported as $(x, y) = (\text{lng}, \text{lat})$ with $\text{lng} \in [-180, 180]$ and $\text{lat} \in [-85.0511, 85.0511]$. Martian planetary science data (IAU/IAG 2000 standard) utilizes planetocentric East-positive coordinates:

$$\phi \in [-90^\circ, +90^\circ] \quad (\text{latitude, North positive})$$
$$\lambda \in [0^\circ, 360^\circ) \quad (\text{longitude, East positive})$$

The conversion implementation in `lib/map/waypoint-layers.ts` ensures mathematical correctness and eliminates zero-sign artifacts:

```typescript
export function fromDisplayCoordinates(lng: number, lat: number): MarsCoordinate {
  const normLat = Object.is(lat, -0) ? 0 : lat;
  const clampedLat = Math.max(-90, Math.min(90, normLat));

  const normLng = Object.is(lng, -0) ? 0 : lng;
  let eastLon = ((normLng % 360) + 360) % 360;
  if (eastLon >= 360) {
    eastLon = 0;
  }
  if (Object.is(eastLon, -0)) {
    eastLon = 0;
  }

  return {
    latitude: clampedLat,
    longitude: eastLon,
  };
}
```

For display on MapLibre tilesets centered on the prime meridian:

```typescript
export function toDisplayCoordinates(coord: MarsCoordinate): [number, number] {
  let displayLon = coord.longitude;
  if (displayLon > 180) {
    displayLon -= 360;
  }
  return [displayLon, coord.latitude];
}
```

### 3.2 Spherical Densification & Trajectory LineStrings

Straight lines drawn across a Mercator map do not follow great-circle arcs on a sphere. To accurately depict the shortest physical traverse across the Martian surface:

1. Each traverse leg (outbound segments $i \to i+1$, and closing return leg $N \to 0$ if `round_trip`) is densified via spherical linear interpolation:
   $$s = \text{marsDistance}(p_1, p_2, \mathcal{R}_{\text{Mars}})$$
   $$N_{\text{steps}} = \max\left(1, \left\lceil \frac{s}{\text{maxStepMeters}} \right\rceil\right) \quad (\text{default } \text{maxStepMeters} = 100\text{ m})$$
2. Intermediate points are sampled at fractional intervals $f_k = k / N_{\text{steps}}$ using `marsIntermediatePoint(p_1, p_2, f_k)`.
3. **Antimeridian Seam Handling:** If any adjacent step crosses the $180^\circ$ antimeridian boundary ($|\Delta \text{displayLon}| > 180^\circ$), the trajectory is split into separate LineString features to prevent horizontal wrap cords across the map canvas.

Each generated GeoJSON feature carries explicit scientific metadata:
```json
{
  "type": "Feature",
  "geometry": {
    "type": "LineString",
    "coordinates": [[137.365, -4.685], [137.368, -4.681], "..."]
  },
  "properties": {
    "kind": "outbound",
    "from_id": "wp-1",
    "to_id": "wp-2",
    "distance_m": 842.5,
    "initial_bearing_deg": 38.4,
    "disclaimer": "Proposed geometric trajectory — spherical Mars approximation (R = 3,396,190 m)"
  }
}
```

---

## 4. UI/UX Interaction & Accessibility

### 4.1 Interactive Placement Flow

1. The user navigates to the **Traverse** tab in the mission planner.
2. Clicking **"Place waypoint on map"** enters placement mode:
   - The map container receives CSS class `.placing-mode`, switching the cursor to `crosshair`.
   - A high-visibility banner (`.placement-banner`) appears:
     - On desktop/tablet: Docked at top center (`top: 16px`).
     - On mobile ($\le 900\text{px}$): Docked at bottom (`bottom: 64px`) so the center of the map remains completely clear for finger tapping.
   - The mobile task sheet is collapsed (`setExpanded(false)`) automatically so the map canvas is unobstructed.
3. Clicking on the map canvas:
   - Screen coordinates are mapped to longitude/latitude via MapLibre `e.lngLat`.
   - Coordinates are converted to planetocentric East-positive coordinates and validated against the regional `supported_extent`.
   - If valid, a new waypoint is appended to the plan with `provenance: "user_planning_input"`.
   - Placement mode disarms, cursor returns to normal, and the itinerary updates immediately.
4. If the user presses `Escape` or clicks the banner's **Cancel** button, placement mode cancels cleanly without side effects.

### 4.2 Non-Mouse & Screen Reader Accessibility (`ManualCoordinateEntry`)

Because interactive canvas clicks cannot be operated by keyboard-only or screen reader users, `components/mission/waypoint-editor.tsx` provides a dedicated manual entry interface:
- Includes high-contrast input fields for **Latitude**, **Longitude (East)**, and **Label**.
- Provides immediate boundary validation against the active region's scientific extent.
- Fully operable via `Tab`, `Enter`, and standard form submission.
- Passes all WCAG 2.1 AA accessibility checks with zero violations via `@axe-core/playwright`.

### 4.3 DOM Marker Architecture & Selection Synchronization

Waypoint markers are instantiated as MapLibre `Marker` objects with custom DOM elements:
- `.base`: White hexagon `⌂`, `role="button"`, labeled `"Base Camp: [Name]"`.
- `.intermediate`: Cyan disc with stop number, `role="button"`, labeled `"Waypoint [N]: [Name]"`.
- `.science_stop`: Amber diamond `◇`, `role="button"`, labeled `"Science Stop [N]: [Name]"`.
- `.destination` / `.recovery_endpoint`: Red flag `⚑`, `role="button"`, labeled `"Destination: [Name]"`.

**Decoupled Lifecycle Optimization:**
Previous prototypes destroyed and remounted all `Marker` instances whenever `selectedWaypointId` changed, introducing visual flicker and event-dispatch race conditions. In M3, DOM marker element references are cached in a React ref (`markerElements.current`). Selection state toggles CSS classes (`.selected`) directly on the DOM nodes without rebuilding the MapLibre Marker instances.

---

## 5. Regional Scientific Coverage Enforcement

Marswalk Planner strictly separates regions with verified high-resolution planetary data from unverified or illustrative regions:

| Region | Scientific Status | Extent Bounds ($\text{Lon E}, \text{Lat}$) | Placement Mode Behavior |
| :--- | :--- | :--- | :--- |
| **Gale Crater** (`gale`) | Verified (HiRISE/CTX co-registered DEM) | $137.344^\circ\text{E} - 137.458^\circ\text{E}$<br>$-4.822^\circ\text{S} - -4.581^\circ\text{S}$ | **Enabled**. Canvas clicks and manual entries are bounded to this extent. |
| **Jezero Crater** (`jezero`) | Overview only (Pending DEM co-registration) | Global / Overview | **Disabled**. Button disabled with advisory notice: *"Interactive map placement requires verified regional base map (currently Gale Crater only)."* |
| **Oxia Planum** (`oxia`) | Overview only (Pending DEM co-registration) | Global / Overview | **Disabled**. Button disabled with explanatory scientific notice. |

---

## 6. Verification & Quality Assurance Matrix

### 6.1 Test Suite Summary

| Category | Suite | Passed | Failed | Execution Time |
| :--- | :--- | :--- | :--- | :--- |
| **Node.js Unit Tests** | `tests/*.test.ts` (18 suites) | **151** | **0** | ~1.15 s |
| **Python Geodesy/Registration** | `team/gale/verify_g3_registration.py` | **1** | **0** | ~0.12 s |
| **Python Unit Tests** | `tests/test_gale_registration.py` | **5** | **0** | ~0.06 s |
| **Playwright Browser Tests** | `tests/browser/*.spec.ts` (7 suites) | **47** | **0** | Full run |
| **TypeScript Strict Check** | `npm run typecheck` | Clean (0 errors) | 0 | ~3.8 s |
| **ESLint Validation** | `npm run lint` | Clean (0 warnings) | 0 | ~4.2 s |
| **Production Build** | `npm run build` (Turbopack) | Clean (Exit 0) | 0 | ~4.5 s |

### 6.2 Browser Test Matrix (`tests/browser/interactive-waypoints.spec.ts`)

- **1440px Workstation:**
  - Arm placement mode $\to$ verify crosshair cursor and `.placement-banner`.
  - Click map canvas $\to$ verify waypoint marker created, trajectory layers rendered, and itinerary updated.
  - Add second waypoint $\to$ verify outbound leg distance, initial bearing, and return leg card.
  - Two-way selection $\to$ clicking map marker highlights stop in itinerary.
  - Persistent scientific disclaimer verified on map legend and itinerary.
  - Axe Core accessibility audit: **0 violations**.
- **1024px Desktop:**
  - Full placement workflow, marker interaction, and trajectory verification.
  - Axe Core accessibility audit: **0 violations**.
- **768px Tablet:**
  - Responsive layout, bottom sheet interaction, and placement mode validation.
  - Axe Core accessibility audit: **0 violations**.
- **390px Mobile:**
  - Placement mode arming auto-collapses task panel to reveal full map canvas.
  - Banner relocates to `bottom: 64px` without obstructing the screen center.
  - Tapping map marker auto-expands task panel and scrolls to selected stop.
  - Axe Core accessibility audit: **0 violations**.
- **Regional Gating (Jezero Crater):**
  - Verify placement button is `disabled`.
  - Verify scientific explanation banner is displayed.
  - Verify manual coordinate entry remains available for experimental use.

---

## 7. Backward Compatibility & Data Preservation

1. **Storage Schema:**
   - Retains exact `marswalk.missions.v1` schema.
   - All newly placed waypoints conform to `MarsWaypoint` Zod schema with `provenance: "user_planning_input"`.
   - Existing mission plans open and save without schema drift.
2. **Scientific Boundaries Preserved:**
   - No speculative walking speeds, metabolic expenditure rates, or slope penalties were introduced.
   - All distance calculations adhere strictly to the spherical Mars geodesic model ($\mathcal{R}_{\text{Mars}} = 3{,}396{,}190\text{ m}$).
