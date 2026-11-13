# Mars Spherical Geodesy Foundation — Technical & Verification Report

**Module:** `lib/map/geodesy.ts`  
**Test Suite:** `tests/geodesy.test.ts`  
**Status:** Implemented, verified (56 passing unit tests), strictly typed  
**Target Environment:** Pure TypeScript (ES2017+), Node.js / Browser compatible, zero external runtime dependencies  
**Revision:** Post-Audit Verification & Edge-Case Hardening (M1)

---

## 1. Executive Summary and Scope

The `lib/map/geodesy.ts` module provides pure mathematical geodesy utilities for the Marswalk Planner application (NASA Space Apps Challenge 2026). It implements spherical geometry for computing surface distances, forward initial bearings, great-circle interpolations, cumulative multi-waypoint path distances, and equidistant path resampling.

### Strict Scope Boundaries

To maintain scientific integrity and prevent invalid operational claims, the module is deliberately constrained:

1. **Geometric Surface Distance Only:** Outputs represent great-circle arc distances on an idealized reference sphere. They do **not** represent terrain-following distances, slope-adjusted distances, rover odometry, or traversable route lengths.
2. **Zero Operational/Safety Claims:** The module does **not** evaluate slope steepness, metabolic burn rates, oxygen or battery consumption, radiation hazards, walkback feasibility, or crew safety.
3. **No Domain Overreach:** The module contains no Zod schemas, UI components, MapLibre rendering logic, or region-specific hardcoding. It is a general-purpose, reusable mathematical engine.

---

## 2. Mathematical Foundations & Reference Datum

### 2.1 The Reference Model: PDS Mars 2000 Sphere

The module adopts the project-standard Mars reference radius:
$$\mathcal{R}_{\text{Mars}} = 3{,}396{,}190 \text{ m} \quad (\approx 3{,}396.19 \text{ km})$$

This matches the reference sphere specified in `regions/gale/config.ts` (`coordinate_system.sphere_radius_m`) and aligns with NASA Planetary Data System (PDS) cartographic conventions for spherical Mars projections.

### 2.2 Reassessment of Spherical vs. Ellipsoidal Error Bounds

A common misconception in planetary GIS is that the error between a spherical model and an ellipsoidal model diminishes to near-zero simply because a route is short. **This claim is scientifically invalid.**

#### Physical Geodesy of Martian Oblateness
Mars is an oblate ellipsoid of revolution. According to the IAU/IAG Working Group on Cartographic Coordinates and Rotational Elements (Archinal et al., 2018):
- Equatorial semi-major axis ($a$): $3{,}396.2 \pm 0.1 \text{ km}$
- Polar semi-minor axis ($b$): $3{,}376.2 \pm 0.1 \text{ km}$
- First eccentricity squared ($e^2 = \frac{a^2 - b^2}{a^2}$): $\approx 0.01174$
- Flattening ($f = \frac{a - b}{a}$): $\approx 0.005889 \quad (\approx 1/170)$

On an ellipsoid, the surface radius $r(\phi)$ and the principal radii of curvature—the meridional radius $M(\phi)$ and the prime vertical radius $N(\phi)$—are functions of planetocentric/planetographic **latitude ($\phi$)** and **azimuth ($\alpha$)**:
$$M(\phi) = \frac{a(1 - e^2)}{(1 - e^2 \sin^2\phi)^{3/2}}, \qquad N(\phi) = \frac{a}{(1 - e^2 \sin^2\phi)^{1/2}}$$

- At the equator ($\phi = 0^\circ$): $M \approx 3{,}356.4 \text{ km}$, $N = a = 3{,}396.2 \text{ km}$.
- At the poles ($\phi = \pm 90^\circ$): $M = N = \frac{a^2}{b} \approx 3{,}416.3 \text{ km}$.
- The radial distance from planetary center $r(\phi)$ varies from $3{,}396.2 \text{ km}$ at the equator down to $3{,}376.2 \text{ km}$ at the poles (a difference of $\approx 20.0 \text{ km}$, or $\approx 0.59\%$).

#### Why Route Length Does Not Eliminate Ellipsoidal Error
For any displacement $d\sigma$ (in radians), the arc length on an ellipsoid is $ds = R_{\text{local}}(\phi, \alpha) \cdot d\sigma$.
The fractional discrepancy between the spherical model ($R_0 = 3{,}396{,}190\text{ m}$) and the true ellipsoidal geodesic is:
$$\frac{\Delta s}{s} \approx \frac{R_0 - R_{\text{local}}(\phi, \alpha)}{R_{\text{local}}(\phi, \alpha)}$$

Because this is a **fractional ratio**, it does **not** scale down with shorter route lengths. Even for a short $2\text{ km}$ traverse, if the traverse is conducted near the poles or along a north-south meridian at high latitudes, the spherical approximation carries a persistent fractional error of up to $\sim 0.6\%\text{--}0.9\%$ relative to an ellipsoidal geodesic.

#### Operational Context and Model Distinctions
It is critical to maintain a clear scientific separation between reference-surface geometric discrepancies and terrain-following distance effects:

1. **Geometric Reference Model Discrepancies:**
   - Discrepancies between the spherical model ($\mathcal{R}_0 = 3{,}396{,}190\text{ m}$) and an ellipsoidal geodesic depend strictly on the **chosen mathematical reference datum, latitude ($\phi$), and azimuth ($\alpha$)**.
   - These geometric discrepancies exist independently of whether the underlying surface is mountainous, hilly, or planar. At high latitudes, the reference sphere introduces a fractional discrepancy up to $\sim 0.6\%\text{--}0.9\%$ along meridional trajectories relative to an ellipsoidal datum.

2. **Terrain-Following and Traversability Effects:**
   - Real-world surface traverse distances depend on **measured elevation** (topographic relief derived from co-registered digital elevation models) and **actual surface traversability** (micro-roughness, boulder distributions, sand dunes, scree, and slope hazards).
   - In regions with steep inclines (such as crater rims or the slopes of Mount Sharp), 3D slope integration along a DEM path will increase the integrated surface distance relative to horizontal separation. Conversely, across smooth, low-relief plains, slope-induced path expansion is minimal.
   - Surface traversability also requires navigating around localized impassable obstacles, which adds path sinuosity that cannot be derived from a universal percentage or assumed constant.

3. **Separation of Concerns:**
   - Topographic effects do not "cancel out" or universally dominate geometric model discrepancies; they represent distinct physical and mathematical phenomena.
   - `lib/map/geodesy.ts` provides only the horizontal great-circle arc length on the reference sphere. It makes no assumptions regarding local slopes, surface roughness, or micro-topography.

Therefore, the spherical model is retained strictly as a geometric baseline for spherical reference coordinates, with outputs explicitly labeled:  
**"Geometric surface distance — spherical Mars approximation ($\mathcal{R} = 3{,}396{,}190\text{ m}$)"**.

---

## 3. Independent Numerical Verification & Discrepancy Analysis

### 3.1 Certified Analytical Benchmarks

Using the exact spherical radius $\mathcal{R}_{\text{Mars}} = 3{,}396{,}190\text{ m}$ and standard double-precision IEEE 754 arithmetic:

| Benchmark Case | Exact Mathematical Formula | Analytical Value (Double Precision) | Documented Benchmark |
| :--- | :--- | :--- | :--- |
| **$1^\circ$ Great-Circle Arc** | $\mathcal{R} \cdot \frac{\pi}{180}$ | $59{,}274.69752330622\text{ m}$ | **$59{,}274.6975\text{ m}$** |
| **$90^\circ$ Great-Circle Arc** | $\mathcal{R} \cdot \frac{\pi}{2}$ | $5{,}334{,}722.77709756\text{ m}$ | **$5{,}334{,}722.7771\text{ m}$** |
| **$2^\circ$ Equatorial Arc** | $\mathcal{R} \cdot \frac{\pi}{90}$ | $118{,}549.39504661244\text{ m}$ | **$118{,}549.3950\text{ m}$** |
| **Gale Crater to Jezero Crater** | $\mathcal{R} \cdot 2\arcsin\left(\sqrt{\operatorname{hav}(\Delta\phi) + \cos\phi_1\cos\phi_2\operatorname{hav}(\Delta\lambda)}\right)$ | $3{,}789{,}056.381057668\text{ m}$ | **$3{,}789{,}056.38\text{ m}$** |

*Coordinates for Gale-Jezero test:*
- Gale Crater center: $\phi_1 = -5.4^\circ$, $\lambda_1 = 137.8^\circ\text{ E}$
- Jezero Crater center: $\phi_2 = 18.38^\circ$, $\lambda_2 = 77.58^\circ\text{ E}$

### 3.2 Root-Cause Analysis of Previous Discrepancies

In an earlier turn report, slightly different numbers were quoted:
- Reported $59{,}274.98\text{ m}$ vs. exact $59{,}274.6975\text{ m}$ ($+0.28\text{ m}$)
- Reported $5{,}334{,}731.8\text{ m}$ vs. exact $5{,}334{,}722.7771\text{ m}$ ($+9.02\text{ m}$)
- Reported $118{,}549.95\text{ m}$ vs. exact $118{,}549.3950\text{ m}$ ($+0.55\text{ m}$)
- Reported $3{,}789{,}884\text{ m}$ vs. exact $3{,}789{,}056.38\text{ m}$ ($+827.62\text{ m}$)

#### Origin of the Discrepancies:
1. **Implementation vs. Documentation:** The TypeScript code in `lib/map/geodesy.ts` was **never defective**. Running `marsDistance` with the exact Gale and Jezero coordinates produced $3{,}789{,}056.381057668\text{ m}$ from the beginning.
2. **Comment Truncation in Tests:** In `tests/geodesy.test.ts`, the test author included an explanatory comment showing manual arithmetic:
   ```text
   c = 2 * asin(sqrt(0.28039)) = 1.11594 rad
   d = R * 1.11594 ≈ 3,789,884 m
   ```
   The intermediate angle was manually rounded to 5 decimal places ($1.11594\text{ rad}$ instead of the true $1.11568\text{ rad}$). Multiplying by $3{,}396{,}190\text{ m}$ amplified this small rounding into an $827.6\text{ m}$ discrepancy. The author then mistakenly copied this handwritten comment value into the documentation report instead of inspecting the runtime variable output.
3. **Rounded Summary Constants:** The values $59{,}274.98\text{ m}$ and $5{,}334{,}731.8\text{ m}$ were approximate scratchpad figures from an earlier conversational context that were transcribed into the report without recalculating against $\pi / 180$.

**Resolution:** Both `tests/geodesy.test.ts` and `docs/MARS_GEODESY_REPORT.md` now explicitly test and document the exact double-precision analytical figures ($59{,}274.6975\text{ m}$, $5{,}334{,}722.7771\text{ m}$, $118{,}549.3950\text{ m}$, and $3{,}789{,}056.38\text{ m}$).

---

## 4. Edge-Case Audit & Hardened Implementation

The codebase was audited to ensure it **never silently returns a plausible but incorrect result for an ambiguous geodesic**.

### 4.1 Polar Singularities ($|\phi| = 90^\circ$)
- **Problem:** At the geographic North Pole ($+90^\circ$) or South Pole ($-90^\circ$), all meridians of longitude converge. True geographic North has no defined direction. Naive azimuth calculations produce an arbitrary number dependent on the arbitrary longitude assigned to the pole (e.g. returning $135^\circ$).
- **Hardened Behavior:** `marsInitialBearing(a, b)` checks `Math.abs(a.latitude) === 90` and immediately returns `NaN`. Forward bearing from a pole is geometrically undefined.
- **Heading to a Pole:** If $b$ is at the North Pole ($b.latitude === 90$), heading is uniquely $0^\circ$ (due North). If $b$ is at the South Pole ($b.latitude === -90$), heading is uniquely $180^\circ$ (due South).

### 4.2 Antipodal Points & Geodesic Ambiguity
- **Problem:** When two points are separated by exactly $180^\circ$ ($\operatorname{dot} \approx -1$), there is **no unique shortest great-circle arc**. Infinitely many great circles connect them (e.g., crossing over any meridian). Falling back to a linear Cartesian blend divides by zero or projects to an arbitrary coordinate due to machine-epsilon noise in $\sin\pi$.
- **Hardened Behavior:** In `marsInterpolate(a, b, t)`, if $\operatorname{dot} \le -1 + 10^{-12}$, the function throws a `RangeError`:  
  `"Great-circle interpolation is undefined for antipodal points: infinitely many geodesics exist"`.
- **Bearing Behavior:** In `marsInitialBearing(a, b)`, antipodal points produce $\hypot(x, y) < 10^{-12}$ and return `NaN`.

### 4.3 Coincident Points ($a = b$)
- `marsDistance(a, a)` returns exact `0.0`.
- `marsInitialBearing(a, a)` returns `NaN` (undefined azimuth).
- `marsInterpolate(a, a, t)` returns $a$ directly (unambiguous, no division by zero).

### 4.4 Nearly Antipodal Points ($\operatorname{dot} > -1 + 10^{-12}$)
- For points separated by $179.9^\circ$, a unique shortest great-circle path does exist. Slerp interpolates along this arc without numerical instability because $\sin\Omega > 10^{-6}$.

### 4.5 Resampling Across Unequal-Length Segments (`marsResamplePath`)
- Paths containing short segments ($< step$), medium segments, and long segments are resampled with integer subdivisions per segment.
- Guarantees:
  - Exact preservation of origin $W_0$ and destination $W_n$.
  - Preservation of all intermediate polyline vertices.
  - Conservation of total path distance within $0.05\%$ of analytical great-circle distance.
  - Sub-segments shorter than the step size emit endpoints directly without zero-division or duplicate loops.

---

## 5. Verification & Test Suite Summary

A comprehensive test suite of **56 automated unit tests** in `tests/geodesy.test.ts` validates all mathematical properties and edge cases:

```text
TAP version 13
# Subtest: MARS_RADIUS_M (1 test) - ok
# Subtest: marsDistance (18 tests) - ok
# Subtest: marsInitialBearing (12 tests) - ok
# Subtest: marsInterpolate (10 tests) - ok
# Subtest: marsPathDistance (6 tests) - ok
# Subtest: marsResamplePath (9 tests) - ok
# tests 56, suites 6, pass 56, fail 0
```

Combined with existing mission tests: **75 passing tests across the entire repository**, 0 failures.
TypeScript (`next typegen && tsc --noEmit`) and ESLint checks pass with 0 errors.
Production build (`next build`) compiles cleanly.
