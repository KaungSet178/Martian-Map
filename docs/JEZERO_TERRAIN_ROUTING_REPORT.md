# Jezero Crater Terrain-Aware Routing Report

**Date:** 2026-11-14  
**Author / Role:** Senior Planetary GIS Engineer, HiRISE/PDS Terrain Specialist, Pathfinding Engineer, Geospatial Scientific Validation Specialist  
**Assigned Branch:** `feat/jezero-terrain-routing`  
**Source Branch:** `origin/feat/jezero-four-layer-standardization`  
**Baseline Git SHA:** `93ab7362e305dd2a10910729e3073247e99985db`  

---

## 1. Executive Summary & Objective

The primary objective of this milestone is to replace Jezero Crater's legacy straight-line waypoint and circular unverified target route placeholders with **genuine, terrain-aware paths powered by authentic numeric DEM and slope data**.

Key capabilities delivered:
1. **Authentic DEM Grid Routing:** Derived a 25-meter computational cost grid from the official 1-meter USGS Mars 2020 TRN HiRISE DTM mosaic.
2. **Terrain-Aware Traversal Cost Models:**
   - **Alternative A (Shortest-Distance):** Minimizes actual physical ground distance across valid DEM cells bounded by physical slope barriers.
   - **Alternative B (Lower-Terrain-Cost):** Minimizes a documented cost function penalizing steep slope gradients and elevation ascent/descent.
3. **Genuine A* Graph Search:** 8-connected topology, admissible Mars-geodesic Euclidean heuristics, deterministic tie-breaking, strict nodata barriers, and multi-segment waypoint chaining.
4. **Authentic Geospatial Polylines & Statistics:** Produces accurate Mars coordinates `[longitude, latitude]`, true 3D surface distance, cumulative ascent, cumulative descent, maximum slope, and arithmetic mean slope.
5. **Scientific Safeguards & JZ-T1A Enforcement:** Bounded snapping rejects excessive shifts; unverified targets with missing or unvalidated coordinates are strictly blocked; areas outside DEM coverage fail closed.
6. **Shared Gale/Jezero Route Contract:** Full compatibility with the minimum shared `RouteResult` schema and integration requirements.

> [!IMPORTANT]
> **Scientific Caveat:** Traversal cost models represent mathematical optimizations of relative terrain difficulty. They do **not** claim NASA-certified astronaut safety, EVA suit limitations, bearing strength, or absolute traversability approvals.

---

## 2. Scientific Source Audit & Provenance

| Parameter | Specification |
|---|---|
| **Official Product ID** | `JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40` |
| **DOI** | [10.5066/P9REJ9JN](https://doi.org/10.5066/P9REJ9JN) |
| **Publishing Agency** | USGS Astrogeology Science Center · NASA/MRO HiRISE |
| **Native Posting** | 1.0 meter/pixel |
| **Raster Dimensions** | 21,400 samples × 21,488 lines (459,843,200 posts) |
| **Exact File Size** | 1,839,545,409 bytes |
| **Verified SHA256** | `44c3819caa33922b06f7a8228534d1e32ab4087aca85144136d825c371c747d8` |
| **Map Projection** | Equirectangular ($latTs=0^\circ$, $lon0=0^\circ$) |
| **Reference Datum** | `D_Mars_2000_Sphere`, radius $R = 3,396,190.0\text{ m}$ |
| **Coordinate System** | Planetocentric latitude (north-positive), East-positive longitude |
| **Vertical Datum** | Areoid-relative meters (cross-validated against PLACES traverse: median $+0.025\text{ m}$, abs P95 $4.3\text{ m}$) |
| **Nodata Sentinel** | `-3.4028226550889045e+38` |
| **Valid Native Posts** | 303,990,958 posts (66.1% valid footprint) |

### Independent Geographic Registration Limitations
Prior audits identified unresolved independent registration questions in Jezero products (e.g. geological SIM 3464 offsets of ~100–200 m, CTX display discrepancies, and HiRISE PDS-label metadata differences). While the DTM matches the PLACES rover traverse vertically within $0.025\text{ m}$ median, both share Mars 2020 mission control lineage. Consequently:
- `sourceVerified`: `true`
- `processingVerified`: `true`
- `registrationVerified`: `false` (explicitly flagged in all routing outputs)

---

## 3. Computational Routing Grid Construction

To enable real-time, deterministic graph search while preserving genuine terrain characteristics:
- **Computational Spacing:** 25.0 meters posting (25 native DTM pixels).
- **Processing Lineage:** Tool `team/jezero/routing/build_routing_grid.py`.
- **Bounding Box:**
  - West: $77.225042^\circ\text{ E}$
  - East: $77.479788^\circ\text{ E}$
  - South: $18.405172^\circ\text{ N}$
  - North: $18.495008^\circ\text{ N}$
- **Dimensions:** 604 columns × 213 rows = 128,652 total cells.
- **Valid Data Coverage:** 114,520 cells (89.0% valid traversable terrain).
- **Elevation Range:** $-2621.3\text{ m}$ to $-1641.3\text{ m}$ areoid-relative.
- **Slope Derivation:** Central differences on the 25 m grid with Mars ground spacing:
  $$\Delta x_{\text{east}} = 25.0 \times \cos(18.45^\circ) \approx 23.715\text{ m}, \quad \Delta y_{\text{north}} = 25.0\text{ m}$$
  $$\frac{dz}{de} = \frac{z_{c+1, r} - z_{c-1, r}}{2 \Delta x_{\text{east}}}, \quad \frac{dz}{dn} = \frac{z_{c, r-1} - z_{c, r+1}}{2 \Delta y_{\text{north}}}$$
  $$\text{slope} = \arctan\left(\sqrt{\left(\frac{dz}{de}\right)^2 + \left(\frac{dz}{dn}\right)^2}\right) \times \frac{180}{\pi}$$
- **Slope Distribution:** $p50 = 4.5^\circ$, $p90 = 16.1^\circ$, $p98 = 22.5^\circ$, $\max = 38.3^\circ$. This matches the Jezero slope audit in `slope_report.json` ($p50 = 4.4^\circ$, $p98 = 22.6^\circ$).
- **Strict Nodata Handling:** Any cell with $<90\%$ valid native posts or missing cardinal neighbors for gradient calculation is marked strictly nodata ($-9999.0$).

---

## 4. Terrain Cost Models & Search Algorithms

### 4.1 Cost Formulations
For transition from cell $u$ to neighbor $v$, ground step distance $d_{\text{step}} = \sqrt{(\Delta c \cdot \Delta x)^2 + (\Delta r \cdot \Delta y)^2}$:
1. **Impassable Barrier:**
   If cell $v$ is nodata or slope $s_v > 25.0^\circ$, traversal cost is $\infty$.
2. **Alternative A — Shortest Distance:**
   $$C_{\text{shortest}}(u \to v) = d_{\text{step}}$$
3. **Alternative B — Lower Terrain Cost:**
   $$C_{\text{lower\_cost}}(u \to v) = d_{\text{step}} \times \left(1.0 + w_s \cdot \left(\frac{s_v}{s_0}\right)^2 + w_a \cdot \max\left(0, \frac{\Delta z}{d_{\text{step}}}\right) + w_d \cdot \max\left(0, -\frac{\Delta z}{d_{\text{step}}}\right)\right)$$
   Where:
   - $w_s = 2.0$ (slope penalty weighting)
   - $s_0 = 10.0^\circ$ (reference normalization slope)
   - $w_a = 3.0$ (elevation ascent penalty)
   - $w_d = 1.0$ (elevation descent penalty)

All edge costs are strictly non-negative ($C \ge d_{\text{step}} > 0$).

### 4.2 Graph Search & Heuristic Admissibility
- **Algorithm:** A* search on an 8-connected graph.
- **Heuristic:** Euclidean great-circle ground distance on the Mars sphere:
  $$h(v, \text{goal}) = d_{\text{Mars}}(v, \text{goal})$$
  Because $C(u \to v) \ge d_{\text{step}}$, $h$ is strictly admissible and monotonic (consistent).
- **Determinism:** Min-heap priority queue with secondary tie-breaking by higher $g$-score, followed by cell index.
- **3D Surface Distance:** Metrics accumulate true 3D distance $d_{3D} = \sqrt{d_{\text{step}}^2 + \Delta z^2}$.

---

## 5. Authentic Jezero Route Examples & Comparison

Routing validation was executed using tool `team/jezero/routing/validate_real_routing.py` across authentic Jezero landmarks:

### Test Case 1: Octavia E. Butler Landing Site to Western Delta Front
- **Start (Landing Site):** $[77.450886^\circ\text{ E}, 18.444627^\circ\text{ N}]$ (Elevation: $-2569.9\text{ m}$)
- **Goal (Delta Front):** $[77.380000^\circ\text{ E}, 18.455000^\circ\text{ N}]$ (Elevation: $-2500.4\text{ m}$)
- **Snap Distances:** Start: $0.0\text{ m}$, Goal: $0.0\text{ m}$ (both inside valid DEM cells).

| Metric | Alternative A: Shortest Distance | Alternative B: Lower Terrain Cost | Difference / Optimization |
|---|---|---|---|
| **Path Distance ($d_{3D}$)** | $4,459.0\text{ m}$ | $4,543.3\text{ m}$ | $+84.3\text{ m}$ ($+1.9\%$) |
| **Cumulative Ascent** | $+88.9\text{ m}$ | $+83.6\text{ m}$ | $-5.3\text{ m}$ ascent reduction |
| **Cumulative Descent** | $-19.4\text{ m}$ | $-14.1\text{ m}$ | Less undulating terrain |
| **Maximum Sampled Slope** | $6.1^\circ$ | $6.0^\circ$ | Avoids steep localized terrain |
| **Mean Sampled Slope** | $2.5^\circ$ | $1.5^\circ$ | **$-40.0\%$ slope reduction** |
| **Path Geometry Identical?** | **No** (False) | **No** (False) | Genuine slope-avoiding detour |

**Analysis:** The Lower-Terrain-Cost search willingly travels an additional 84 meters across the crater floor to navigate through flatter, smoother terrain, achieving a 40% reduction in average slope.

### Test Case 2: Multi-Waypoint Route
- **Waypoints:** Landing Site $\to$ Séítah South ($[77.430^\circ\text{ E}, 18.435^\circ\text{ N}]$) $\to$ Delta Front ($[77.380^\circ\text{ E}, 18.455^\circ\text{ N}]$).
- **Result:** Successfully chained 2 distinct segments. Segment 1 distance: $1,475.2\text{ m}$, Segment 2 distance: $3,334.8\text{ m}$. Total distance: $4,810.0\text{ m}$.

### Test Case 3: Coverage Boundary & JZ-T1A Rejection
- **Boundary Rejection:** Coordinate $[77.190^\circ\text{ E}, 18.440^\circ\text{ N}]$ lies west of the DEM boundary ($77.2229^\circ\text{ E}$). Snapping within $150\text{ m}$ fails closed and returns `status: "unavailable"`.
- **JZ-T1A Rejection:** Objectives marked `verified: false` are strictly rejected, preventing unverified science targets from generating routes.

---

## 6. Shared Route Contract Specification

Both Gale and Jezero routing implement the identical minimum contract:

```typescript
export type RouteResult = {
  regionId: "gale" | "jezero";
  status: "computed" | "unverified" | "unavailable";
  preference: "shortest" | "lower-terrain-cost";
  coordinates: [number, number][]; // [longitude_east, latitude_north]
  distanceMeters: number | null;
  ascentMeters: number | null;
  descentMeters: number | null;
  maximumSlopeDegrees: number | null;
  meanSlopeDegrees: number | null;
  sourceDatasetIds: string[];
  sourceVerified: boolean;
  processingVerified: boolean;
  registrationVerified: boolean;
  warnings: string[];
  // Extended fields
  segments?: RouteSegment[];
  requestedWaypoints?: [number, number][];
  snappedWaypoints?: [number, number][];
  snapDistancesMeters?: number[];
  gridMetadata?: RoutingGridMetadata;
  costParameters?: CostModelParameters;
  algorithm?: "A*" | "Dijkstra";
  coverageLimitations?: string[];
  failureReason?: string | null;
};
```

---

## 7. Verification & Test Summary

| Test Suite | Execution Command | Result | Notes |
|---|---|---|---|
| **Jezero TypeScript Routing Suite** | `npx tsx --test tests/jezero-routing.test.ts` | **PASS (14/14)** | Geodesic math, synthetic grids, snapping, JZ-T1A, authentic DEM routing, alternatives |
| **Python Synthetic Routing Suite** | `python3 team/jezero/routing/test_synthetic_routing.py` | **PASS (9/9)** | Diagonal scaling, slope barriers, nodata circumnavigation, determinism |
| **Python Real DEM Validation** | `python3 team/jezero/routing/validate_real_routing.py` | **PASS** | Landing-to-Delta alternatives, metrics comparison, boundary rejection |
| **Jezero Four-Layer Regression** | `npx tsx --test tests/jezero-four-layers.test.ts` | **PASS (4/4)** | Zero regressions on existing hillshade, slope, elevation, thermal layers |
| **Real Hillshade Validation** | `python3 team/jezero/terrain/validate_real_hillshade.py` | **PASS** | Exact tile hash reproduction, DEM SHA256 integrity |
| **ESLint** | `npm run lint` | **PASS (0 errors)** | Zero warnings in owned routing files |
| **TypeScript Typecheck** | `npx tsc --noEmit` | **PASS on owned files** | 2 pre-existing shared marker errors in `components/map/map-workspace.tsx:315` |
| **Pre-existing test suite** | `npm test` | **12/13 pass** | Single pre-existing shared evidence whitelist failure (`tests/mission.test.ts:28`) |

---

## 8. Files Created and Modified

All modifications adhere strictly to assigned file ownership:

### Created Files (Owned):
- `lib/routing/jezero/types.ts`: Shared route contract and Jezero type definitions.
- `lib/routing/jezero/geo.ts`: Mars geodetic distance and Equirectangular projection math.
- `lib/routing/jezero/grid.ts`: TerrainGrid class with bounding, cell mapping, and bounded snapping.
- `lib/routing/jezero/cost.ts`: Shortest and lower-terrain-cost models with documented parameters.
- `lib/routing/jezero/pathfinder.ts`: Genuine A* graph search with deterministic tie-breaking.
- `lib/routing/jezero/snapping.ts`: Waypoint validator and JZ-T1A enforcement.
- `lib/routing/jezero/router.ts`: Multi-segment route planner and alternative comparison.
- `lib/routing/jezero/loader.ts`: Fast JSON grid loader and cache.
- `lib/routing/jezero/index.ts`: Public module export.
- `data/routing/jezero/jezero_routing_grid.json`: Authentic 25m Jezero routing grid (3.05 MB).
- `data/routing/jezero/jezero_routing_metadata.json`: Full provenance and statistical metadata.
- `team/jezero/routing/build_routing_grid.py`: DTM extraction and slope grid builder.
- `team/jezero/routing/test_synthetic_routing.py`: Python synthetic algorithm test suite.
- `team/jezero/routing/validate_real_routing.py`: Authentic Jezero route validation script.
- `team/jezero/routing/real_routing_validation.json`: Recorded real route validation output.
- `tests/jezero-routing.test.ts`: TypeScript regression test suite (14 tests).
- `docs/JEZERO_TERRAIN_ROUTING_REPORT.md`: This comprehensive report.

### Unmodified Files (Protected):
- `components/planner.tsx`, `components/map/**`, `components/science/**`, `lib/map/**`, `lib/mission/**`
- `regions/gale/**`, `regions/oxia/**`
- Existing Jezero tiles under `public/maps/jezero/**`

---

## 9. Shared Integration Handoff

For subsequent frontend planner and mission integration:
1. **Consume Genuine Route Coordinates:** Replace straight-line waypoint connections with `RouteResult.coordinates`.
2. **Resource Feasibility Model:** Use `RouteResult.distanceMeters`, `ascentMeters`, and `descentMeters` instead of planar straight-line distances when calculating metabolic energy, oxygen consumption, and timeline budgets.
3. **Display Alternatives:** Render both `shortest` and `lower-terrain-cost` options in the mission UI, enabling planners to choose between minimal distance or gentle slopes.
4. **Display Warnings:** Always surface `RouteResult.warnings` regarding registration uncertainty and snapping adjustments.
5. **Pre-existing Markers Fix:** Line 315 in `components/map/map-workspace.tsx` references undefined `displayLon`/`displayLat` for unverified objectives. In the shared integration phase, unverified objectives should either remain unrendered on the map or display a non-georeferenced badge.

---

## 10. Git Delivery Status

- **Branch:** `feat/jezero-terrain-routing`
- **Delivery Commit SHA:** `3a6ea204466e280e4b73526382175f4fb04ca9b9`
- **Baseline Source SHA:** `93ab7362e305dd2a10910729e3073247e99985db` (`origin/feat/jezero-four-layer-standardization`)
- **Git Delivery Status:** Implementation, validation datasets, tests, and documentation committed cleanly to `feat/jezero-terrain-routing`. Ready for remote push once repository write authentication (PAT or SSH key) is configured in the environment.
