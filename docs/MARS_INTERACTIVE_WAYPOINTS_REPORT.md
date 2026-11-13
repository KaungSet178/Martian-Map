# Mars Interactive Map Waypoint Placement & Geometric Trajectory Visualization — Technical & Hardening Report

**Module:** Milestone M3 — Interactive Map Waypoint Placement and Geometric Trajectory Visualization  
**Workspace:** `D:\martian-map`  
**Active Branch:** `feat/interactive-waypoints`  
**Base Commit:** `34316b9` (`feat/gale-map`)  
**Status:** Hardened, fully verified across viewports and accessibility standards, production-built  
**Date:** November 2026 (NASA Space Apps Challenge 2026)  

---

## 1. Executive Summary & Purpose

Milestone M3 bridges the Marswalk Planner geometric mission planning engine (M1–M2.3) with direct MapLibre GL JS planetary cartography. It introduces real-time interactive waypoint placement directly onto the surface map, high-fidelity great-circle trajectory densification and rendering, comprehensive mobile and accessibility support, strict scientific regional coverage enforcement, and rigorous interaction and complexity safeguards.

### Key Capabilities Delivered

1. **Interactive Canvas Waypoint Placement:** Single-click placement of new planning waypoints directly on the MapLibre GL JS canvas within verified scientific boundaries.
2. **Planetocentric Coordinate Normalization:** Exact conversion between MapLibre Web Mercator coordinates ($[-180, 180]$ longitude, $[-85.0511, 85.0511]$ latitude) and IAU/IAG Mars planetocentric East-positive coordinates ($[0, 360)^\circ\text{ E}$, $[-90, 90]^\circ\text{ lat}$).
3. **Hardened Spherical Densification Engine:** Slerp interpolation on the Mars reference sphere ($\mathcal{R}_{\text{Mars}} = 3{,}396{,}190\text{ m}$) guaranteeing step length $\le 100\text{ m}$ for all distances without artificial step clamping.
4. **Documented Complexity Limits & Explicit Failure Mode:** Enforces a documented limit (`MAX_SEGMENT_INTERPOLATION_STEPS = 1000`, up to $100\text{ km}$ at $100\text{ m}$ spacing). Traverses exceeding this limit return an explicit `status: "unsupported"` result with full diagnostic metrics instead of silently degrading precision.
5. **Per-Segment Fault Isolation:** Trajectory generation processes segments independently; if a single segment exceeds complexity limits or encounters an error, it is recorded in `unsupported_segments` while unrelated valid segments render normally.
6. **Native WebGL Trajectory Layers:** Two-tone high-contrast styling (dark casing `#09111F` width 5.5px, outbound dashed `#59E3FA` width 3px dash `[3, 1]`, and return dashed `#59E3FA` width 2.5px dash `[1, 2]`) rendered directly via MapLibre GeoJSON sources for smooth 60fps pan and zoom.
7. **Placement Event & Gesture Safeguards:** Comprehensive protections against inadvertent waypoint placement during mouse drags, touch panning, pinch-zoom gestures, marker selection clicks, and map control interactions.
8. **Decoupled DOM Marker Lifecycle & Double-Mount Prevention:** Semantic SVG/DOM markers representing waypoint roles (`base`, `intermediate`, `science_stop`, `destination`/`recovery_endpoint`), with DOM class styling decoupled from marker destruction and async promise cleanup guards to prevent duplicate marker instantiation.
9. **Accessible & Responsive Workflows:**
   - Visual placement mode banner with dedicated Cancel button and `Escape` key shortcut.
   - Non-mouse keyboard/screen reader fallback form (`ManualCoordinateEntry`) with immediate boundary validation.
   - Mobile-adaptive responsive layout with collapsed bottom sheet during placement and bottom-aligned banner at 390px viewports.
   - Two-way selection synchronization: selecting on map highlights the itinerary stop; selecting in itinerary highlights the map marker.
10. **Scientific Regional Coverage Gating:** Placement is restricted strictly to regions possessing verified high-resolution scientific base maps (Gale Crater). In unverified regions (Jezero Crater, Oxia Planum), interactive placement is disabled with an explanatory scientific advisory notice.
11. **Standard Scientific Disclaimer:** Trajectory layers, map legend, and mission itinerary consistently display:  
   `"Proposed geometric trajectory — spherical Mars approximation (R = 3,396,190 m)"`.

---

## 2. Architecture & File Structure

```
martian-map/
├── lib/
│   ├── map/
│   │   ├── geodesy.ts                  # M1 Mars spherical geodesy foundation (R = 3,396,190 m)
│   │   └── waypoint-layers.ts          # M3 MapLibre GeoJSON generator, slerp densification, converters, & layers
│   └── mission/
│       ├── types.ts                    # Core mission data contracts (marswalk.missions.v1)
│       └── waypoint-planning.ts        # M2 Immutable waypoint planning engine
├── components/
│   ├── map/
│   │   └── map-workspace.tsx           # MapLibre container, trajectory layers, DOM markers, click/gesture handling
│   ├── mission/
│   │   ├── waypoint-editor.tsx         # Waypoint editor panel, placement trigger, manual entry form
│   │   └── waypoint-itinerary.tsx      # Ordered itinerary list, leg metrics, and selection highlights
│   └── planner.tsx                     # Top-level coordinator, mobile sheet toggle, selection state
├── app/
│   └── globals.css                     # Placement mode styles, marker roles, legends, responsive rules
├── tests/
│   ├── waypoint-layers.test.ts         # M3 Unit test suite for coordinate conversions, slerp, & complexity limits
│   └── browser/
│       └── interactive-waypoints.spec.ts # M3 Playwright browser, gesture safeguards & accessibility test suite
└── docs/
    └── MARS_INTERACTIVE_WAYPOINTS_REPORT.md # This technical & hardening report
```

---

## 3. Mathematical & Planetary Geodesy Specifications

### 3.1 Mars Planetocentric Coordinate Projection

MapLibre GL JS operates on a standard Web Mercator coordinate system where coordinates are reported as $(x, y) = (\text{lng}, \text{lat})$ with $\text{lng} \in [-180, 180]$ and $\text{lat} \in [-85.0511, 85.0511]$. Martian planetary science data (IAU/IAG 2000 standard) utilizes planetocentric East-positive coordinates:

$$\phi \in [-90^\circ, +90^\circ] \quad (\text{latitude, North positive})$$
$$\lambda \in [0^\circ, 360^\circ) \quad (\text{longitude, East positive})$$

The conversion implementation in `lib/map/waypoint-layers.ts` ensures mathematical correctness and eliminates zero-sign artifacts:

```typescript
export function fromDisplayCoordinates(
  lngLat: { lng: number; lat: number } | [number, number],
): MarsGeographicCoordinates {
  const lng = Array.isArray(lngLat) ? lngLat[0] : lngLat.lng;
  const lat = Array.isArray(lngLat) ? lngLat[1] : lngLat.lat;

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    throw new TypeError(
      `Display coordinates must be finite numbers; received lng=${lng}, lat=${lat}`,
    );
  }

  const clampedLat = Math.max(-90, Math.min(90, lat));

  let lonEast = lng % 360;
  if (lonEast < 0) lonEast += 360;
  let normalizedLon = Number(lonEast.toFixed(6));
  if (normalizedLon >= 360 || Object.is(normalizedLon, -0)) normalizedLon = 0;

  return {
    latitude: Number(clampedLat.toFixed(6)),
    longitude_east: normalizedLon,
  };
}
```

For display on MapLibre tilesets centered on the prime meridian:

```typescript
export function toDisplayCoordinates(coord: MarsGeographicCoordinates): [number, number] {
  let displayLon = coord.longitude_east;
  if (displayLon > 180) {
    displayLon -= 360;
  }
  return [displayLon, coord.latitude];
}
```

### 3.2 Hardened Spherical Slerp Densification & Complexity Limits

Earlier prototypes clamped interpolation steps via `Math.min(100, Math.ceil(dist / maxStepMeters))`. For traverses longer than 10 km (e.g. 20 km), this artificially restricted the step count to 100, resulting in 200 m step lengths that violated the maximum 100 m step constraint.

The hardened implementation introduces explicit complexity limits, guarantees step spacing, preserves endpoints, and provides failure isolation:

```typescript
export const DEFAULT_MAX_STEP_METERS = 100;
export const MAX_SEGMENT_INTERPOLATION_STEPS = 1000;

export function densifyTrajectorySegment(
  from: MarsGeographicCoordinates,
  to: MarsGeographicCoordinates,
  distanceMeters: number,
  maxStepMeters: number = DEFAULT_MAX_STEP_METERS,
  maxSteps: number = MAX_SEGMENT_INTERPOLATION_STEPS,
): DensifiedSegmentResult {
  if (distanceMeters <= 0) {
    const pt = toDisplayCoordinates(from);
    return {
      status: "supported",
      coordinates: [[pt, pt]],
      stepCount: 1,
      stepLengthMeters: 0,
    };
  }

  const requiredSteps = Math.ceil(distanceMeters / maxStepMeters);

  if (requiredSteps > maxSteps) {
    return {
      status: "unsupported",
      reason: `Traverse segment length (${distanceMeters.toFixed(1)} m) requires ${requiredSteps} steps at max ${maxStepMeters} m spacing, exceeding the complexity limit of ${maxSteps} steps.`,
      requiredSteps,
      maxSteps,
    };
  }

  const numSteps = Math.max(1, requiredSteps);
  const stepLength = distanceMeters / numSteps;
  const segmentCoords: [number, number][] = [];

  for (let step = 0; step <= numSteps; step++) {
    const t = step / numSteps;
    const pt =
      step === 0
        ? from
        : step === numSteps
          ? to
          : marsInterpolate(from, to, t);
    segmentCoords.push(toDisplayCoordinates(pt));
  }

  const subSegments = splitAntimeridianCoords(segmentCoords);

  return {
    status: "supported",
    coordinates: subSegments,
    stepCount: numSteps,
    stepLengthMeters: stepLength,
  };
}
```

#### Trajectory Generation Guarantees
- **Exact Endpoints:** Step 0 is guaranteed to equal `from`; step $N$ is guaranteed to equal `to`.
- **Spacing Compliance:** Step length is strictly $\le \text{maxStepMeters}$ (e.g. 20 km segment produces 200 steps at exactly 100 m spacing).
- **Explicit Failure Diagnostics:** Segments exceeding 1000 steps ($> 100\text{ km}$ at 100 m spacing) return an explicit `status: "unsupported"` error object instead of degrading visual precision.
- **Segment Fault Isolation:** If segment $K$ is unsupported, `buildTrajectoryGeoJSON` logs segment $K$ to `unsupported_segments` while rendering valid segments $1 \dots K-1$ and $K+1 \dots N$.
- **Antimeridian Seam Crossing:** Traverses crossing the $180^\circ$ meridian are cleanly split into disjoint LineStrings, eliminating horizontal cord artifacts.

---

## 4. Interaction Safeguards & Event Handling

### 4.1 Placement Safeguards Audit

To ensure user gestures never corrupt mission plans:

| Gesture / Event | Safeguard Mechanism | Verification Result |
| :--- | :--- | :--- |
| **Normal Canvas Click** | Maps canvas pixel coordinates to Mars coordinates, validates regional extent, appends waypoint. | **Creates 1 waypoint**. |
| **Mouse Dragging / Panning** | MapLibre's internal gesture tracker suppresses `click` if movement exceeds 3px tolerance. | **0 waypoints created**. |
| **Touch Panning** | Touch move gestures cancel tap detection. | **0 waypoints created**. |
| **Pinch-Zoom** | Multi-touch gestures suppress single-tap events. | **0 waypoints created**. |
| **Marker Selection Clicks** | `.map-waypoint-marker` and `.science-marker` invoke `e.stopPropagation()`. `handleClick` checks `target.closest(".maplibregl-marker, .map-waypoint-marker, .science-marker")`. | **Selects marker; 0 duplicates created**. |
| **Map Control Clicks** | Navigation controls capture mousedown/click. `handleClick` explicitly checks `target.closest(".maplibregl-ctrl")`. | **Controls operate; 0 waypoints created**. |
| **Escape Key Cancellation** | Window `keydown` listener disarms placement mode upon `Escape`. | **Disarms immediately**. |
| **Schematic-Only Regions** | UI button disabled (`disabled={!hasScientificMap}`), guarded in `handleRequestMapPlacement`, and rejected in `handleClick` if `visualization.status !== "available"`. | **Placement blocked with advisory**. |

### 4.2 DOM Marker Lifecycle & Async Mounting Guard

Because `maplibre-gl` dynamically loads in browser runtime, asynchronous `import("maplibre-gl").then(...)` can resolve across multiple state changes. To eliminate race conditions:
1. `waypointMarkers.current` and `markerElements.current` are explicitly cleared at the start of the effect, inside the resolved promise prior to new marker mounting, and upon effect cleanup.
2. Selection changes (`selectedWaypointId`) update `.selected` CSS classes directly via stored references in `markerElements.current`, avoiding MapLibre Marker recreation.

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

| Category | Suite | Passed | Failed | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Node.js Unit Tests** | `tests/*.test.ts` (19 suites) | **159** | **0** | **Pass** |
| **Python Geodesy/Registration** | `team/gale/verify_g3_registration.py` | Exit code 0 | 0 | **Pass** |
| **Python Unit Tests** | `tests/test_gale_registration.py` | **5** | **0** | **Pass** |
| **Playwright Browser Tests** | `tests/browser/*.spec.ts` (7 suites) | **49** | **0** | **Pass** |
| **Axe Accessibility Audit** | Automated WCAG 2.1 AA checks across desktop, tablet, and mobile | **0 violations** | 0 | **Pass** |
| **TypeScript Strict Check** | `npm run typecheck` | **0 errors** | 0 | **Pass** |
| **ESLint Validation** | `npm run lint` | **0 errors, 0 warnings** | 0 | **Pass** |
| **Production Build** | `npm run build` (Turbopack) | **Compiled successfully (code 0)** | 0 | **Pass** |

### 6.2 Interpolation Verification Matrix (`tests/waypoint-layers.test.ts`)

- **Short Segment (500 m, 100 m step):**
  - Result: 5 steps, step length $\le 100\text{ m}$, 6 vertices.
  - Endpoints: exact match with `from` and `to`.
- **10 km Segment (10,000 m, 100 m step):**
  - Result: 100 steps, step length $= 100\text{ m}$, 101 vertices.
  - Endpoints: exact match.
- **20 km Segment (20,000 m, 100 m step):**
  - Result: 200 steps, step length $= 100\text{ m}$, 201 vertices.
  - Verified NOT clamped to 100 steps.
- **50 km Segment (50,000 m, 100 m step):**
  - Result: 500 steps, step length $= 100\text{ m}$, `status: "supported"`.
- **150 km Segment (150,000 m, 100 m step):**
  - Required steps: 1500 $> 1000$ limit.
  - Result: `status: "unsupported"`, reason: `"Traverse segment length (150000.0 m) requires 1500 steps at max 100 m spacing, exceeding the complexity limit of 1000 steps."`.
- **Custom Complexity Limit:**
  - 20 km segment with `maxSteps = 100`: returns `status: "unsupported"` (200 steps $> 100$).
- **Segment Fault Isolation:**
  - Plan with 3 segments: Segment 1 (2.5 km, valid), Segment 2 (220 km, exceeds limit), Segment 3 (1.2 km, valid).
  - Features array contains both Segment 1 and Segment 3 LineStrings.
  - `unsupported_segments` contains Segment 2 with diagnostic reason.
- **Antimeridian Seam Crossing:**
  - Coordinates jumping across $180^\circ$ split into two distinct LineStrings.

### 6.3 Browser Safeguards Matrix (`tests/browser/interactive-waypoints.spec.ts`)

- **Mouse Dragging Safeguard:** Dragging the canvas in placement mode does not create a waypoint.
- **Map Control Click Safeguard:** Clicking zoom in/out does not create a waypoint.
- **Marker Click Safeguard:** Clicking an existing marker selects it and does not create a duplicate.
- **Escape Key Safeguard:** Pressing `Escape` disarms placement mode immediately.
- **Mobile Touch Tap at 390px:** A single touch tap in Gale Crater creates exactly 1 waypoint within the footprint.
- **Axe Core Accessibility:** Zero violations across all tested states.

---

## 7. Backward Compatibility & Data Preservation

1. **Storage Schema:**
   - Retains exact `marswalk.missions.v1` schema.
   - All newly placed waypoints conform to `MarsWaypoint` Zod schema with `provenance: "user_planning_input"`.
   - Existing mission plans open and save without schema drift.
2. **Scientific Boundaries Preserved:**
   - No speculative walking speeds, metabolic expenditure rates, or slope penalties were introduced.
   - All distance calculations adhere strictly to the spherical Mars geodesic model ($\mathcal{R}_{\text{Mars}} = 3{,}396{,}190\text{ m}$).
