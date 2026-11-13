# Mars Spherical Geodesy Foundation — Technical Report

**Module:** `lib/map/geodesy.ts`  
**Test Suite:** `tests/geodesy.test.ts`  
**Status:** Implemented, verified (49 passing tests), fully typed  
**Target Environment:** Pure TypeScript (ES2017+), Node.js / Browser compatible, zero external runtime dependencies  

---

## 1. Executive Summary and Scope

The `lib/map/geodesy.ts` module provides pure mathematical geodesy primitives for the Marswalk Planner application (NASA Space Apps Challenge 2026). It implements rigorous spherical geometry for computing surface distances, forward initial bearings, great-circle interpolations, cumulative multi-waypoint path distances, and equidistant path resampling.

### Strict Scope Boundaries

To maintain scientific integrity and prevent invalid operational claims, the module is deliberately constrained:

1. **Geometric Surface Distance Only:** Outputs represent great-circle arc distances on an idealized reference sphere. They do **not** represent terrain-following distances, slope-adjusted distances, rover odometry, or traversable route lengths.
2. **Zero Operational/Safety Claims:** The module does **not** evaluate slope steepness, metabolic burn rates, oxygen or battery consumption, radiation hazards, walkback feasibility, or crew safety.
3. **No Domain Overreach:** The module contains no Zod schemas, UI components, MapLibre rendering logic, or region-specific hardcoding. It is a general-purpose, reusable mathematical engine.

---

## 2. Mathematical Foundations

### 2.1 The Reference Model: PDS Mars 2000 Sphere

The module adopts the project-standard Mars reference radius:
$$\mathcal{R}_{\text{Mars}} = 3{,}396{,}190 \text{ m} \quad (\approx 3{,}396.19 \text{ km})$$

This matches the reference sphere specified in `regions/gale/config.ts` (`coordinate_system.sphere_radius_m`) and aligns with NASA Planetary Data System (PDS) cartographic conventions for spherical Mars projections.

#### Oblateness and Geometric Error Bounds
Mars is not a perfect sphere; it is an oblate spheroid. According to IAU/IAG Working Group on Cartographic Coordinates and Rotational Elements:
- Equatorial radius ($a$): $3{,}396.2 \pm 0.1 \text{ km}$
- Polar radius ($b$): $3{,}376.2 \pm 0.1 \text{ km}$
- Flattening ($f = \frac{a - b}{a}$): $\approx 0.005889$ (approximately $1/170$)

Using a single mean spherical radius of $3{,}396{,}190 \text{ m}$ introduces a maximum theoretical radial discrepancy of approximately $20 \text{ km}$ at the poles (a relative geometric distortion of $\approx 0.59\%$).

However, for the localized operational scales of astronaut extravehicular activities (EVAs) targeted by Marswalk Planner:
- Maximum EVA traverse radius: typically $< 10\text{–}20 \text{ km}$
- Local regional bounds (e.g., Mount Sharp ascent, Jezero delta): $< 50 \text{ km}$

At this scale, the difference between an ellipsoidal geodesic and a spherical great-circle arc is less than $0.1\%$, which is orders of magnitude smaller than:
1. Topographic relief distortion (elevation changes along crater rims and mounds of several vertical kilometres).
2. Terrain micro-roughness (boulders, dunes, gravel, bedrock steps) that increases true walking distance over straight-line planar distance by $5\%\text{–}25\%$.
3. The spatial resolution of orbital DEMs (CTX at $\sim 20\text{ m/px}$, HRSC at $\sim 50\text{ m/px}$).

Therefore, the spherical model is appropriate for pre-mission planning geometry, provided its outputs are explicitly labeled as **"Geometric surface distance — spherical Mars approximation"**.

---

### 2.2 Great-Circle Distance: The Haversine Formula

Given two points $P_1(\phi_1, \lambda_1)$ and $P_2(\phi_2, \lambda_2)$ where $\phi$ is planetocentric latitude and $\lambda$ is east-positive longitude in radians:

$$\Delta\phi = \phi_2 - \phi_1, \quad \Delta\lambda = \lambda_2 - \lambda_1$$

The haversine of the central angular separation $\sigma$ is:
$$h = \operatorname{hav}(\sigma) = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$

The angular separation in radians is:
$$\sigma = 2 \arcsin\left(\sqrt{\min(1, \max(0, h))}\right)$$

And the surface distance in metres is:
$$d = \mathcal{R}_{\text{Mars}} \cdot \sigma$$

#### Why Haversine Over Spherical Law of Cosines?
The standard Spherical Law of Cosines formula:
$$\cos\sigma = \sin\phi_1\sin\phi_2 + \cos\phi_1\cos\phi_2\cos\Delta\lambda$$
suffers from severe catastrophic cancellation when computing distances between closely spaced points ($d < 1 \text{ km}$). When $\sigma \to 0$, $\cos\sigma \to 1$. In double-precision IEEE 754 floating-point arithmetic, $\arccos(x)$ loses significant precision near $x = 1$ because the derivative $\frac{d}{dx}(\arccos x) \to -\infty$. For points separated by tens of metres on Mars, the Law of Cosines can produce errors of several percent or collapse to zero.

The haversine formulation evaluates $\sin^2(\Delta\phi/2)$ and $\sin^2(\Delta\lambda/2)$ directly, retaining high precision down to sub-millimetre separations. Numerical clamping of $h$ into $[0, 1]$ prevents domain errors in $\arcsin$ caused by small machine-epsilon overshoots.

---

### 2.3 Forward Initial Bearing

The initial bearing (forward azimuth $\theta$) from $P_1$ to $P_2$ is measured clockwise from true geographic north ($0^\circ$) through east ($90^\circ$), south ($180^\circ$), and west ($270^\circ$):

$$x = \sin(\Delta\lambda)\cos(\phi_2)$$
$$y = \cos(\phi_1)\sin(\phi_2) - \sin(\phi_1)\cos(\phi_2)\cos(\Delta\lambda)$$
$$\theta = \left(\operatorname{atan2}(x, y) \cdot \frac{180}{\pi} + 360\right) \pmod{360}$$

#### Singularities and Degeneracies
- **Coincident Points ($P_1 = P_2$):** Both $x$ and $y$ vanish ($\sqrt{x^2 + y^2} < 10^{-12}$). The initial bearing is geometrically undefined; the module returns `NaN`.
- **Antipodal Points:** When two points are separated by exactly $180^\circ$ ($\sigma = \pi$), infinitely many great circles connect them. Here, $x \approx 0$ and $y \approx 0$; the module returns `NaN`.

---

### 2.4 Great-Circle Slerp Interpolation

To interpolate intermediate points between $P_1$ and $P_2$ along the minor great-circle arc for a normalized progress parameter $t \in [0, 1]$:

1. Convert geographic coordinates $(\phi, \lambda)$ to 3D unit-sphere Cartesian coordinates $\mathbf{v} = (x, y, z)$:
   $$x = \cos\phi\cos\lambda, \quad y = \cos\phi\sin\lambda, \quad z = \sin\phi$$
2. Compute the central angle $\Omega$ via the vector dot product:
   $$\mathbf{v}_1 \cdot \mathbf{v}_2 = \cos\Omega, \quad \Omega = \arccos(\operatorname{clamp}(\mathbf{v}_1 \cdot \mathbf{v}_2, -1, 1))$$
3. Perform Spherical Linear Interpolation (Slerp):
   $$\mathbf{v}(t) = \frac{\sin((1-t)\Omega)}{\sin\Omega}\mathbf{v}_1 + \frac{\sin(t\Omega)}{\sin\Omega}\mathbf{v}_2$$
4. In cases of near-coincidence or antipodal ambiguity ($\sin\Omega < 10^{-12}$), the module degrades smoothly to a linear Cartesian blend:
   $$\mathbf{v}(t) = \mathbf{v}_1 + t(\mathbf{v}_2 - \mathbf{v}_1)$$
5. Renormalize $\mathbf{v}(t)$ to the unit sphere:
   $$\hat{\mathbf{v}} = \frac{\mathbf{v}(t)}{\|\mathbf{v}(t)\|}$$
6. Convert $\hat{\mathbf{v}} = (\hat{x}, \hat{y}, \hat{z})$ back to Mars planetocentric coordinates:
   $$\phi = \arcsin(\hat{z}) \cdot \frac{180}{\pi}$$
   $$\lambda = \left(\left(\operatorname{atan2}(\hat{y}, \hat{x}) \cdot \frac{180}{\pi}\right) \pmod{360} + 360\right) \pmod{360}$$

This guarantees that interpolated points lie strictly on the true spherical surface arc, avoiding the chord-penetration error that plagues naive linear latitude/longitude interpolation.

---

### 2.5 Path Resampling (`marsResamplePath`)

Given a multi-waypoint polyline $[W_0, W_1, \dots, W_n]$ and a desired target resolution $S$ (step size in metres):
- Each segment $(W_{k-1}, W_k)$ is evaluated for its great-circle length $d_k$.
- If $d_k \le S$, the destination $W_k$ is emitted directly.
- If $d_k > S$, the segment is subdivided into $M = \lceil d_k / S \rceil$ sub-steps of equal angular length, and intermediate points are sampled at $t = m / M$ for $m = 1, \dots, M$ using Slerp.
- **Invariants preserved:**
  1. The exact starting waypoint $W_0$ is always preserved at index 0.
  2. The exact final waypoint $W_n$ is always preserved at index $N-1$.
  3. Every point strictly satisfies the Mars coordinate contracts.
  4. Cumulative resampled distance remains within $0.1\%$ of the analytical path distance.

---

## 3. Coordinate System Alignment

The module strictly complies with the existing coordinate contracts defined in `lib/contracts/primitives.ts`:

| Property | Project Standard | `geodesy.ts` Enforcement |
| :--- | :--- | :--- |
| **Latitude System** | Planetocentric, $[-90^\circ, +90^\circ]$ | Validated via `assertFiniteRange(-90, 90)` |
| **Longitude System** | East-positive, $[0^\circ, 360^\circ)$ | Validated via `assertFiniteRange(0, 360, true)` |
| **Reference Datum** | Mars 2000 Sphere ($R = 3{,}396{,}190\text{ m}$) | `MARS_RADIUS_M = 3_396_190` |
| **Zero Meridian** | Airy-0 | Inherited from PDS/USGS map bases |
| **Antimeridian Handling** | Continuous wrapping at $0^\circ / 360^\circ$ | Angle normalization handles crossings seamlessly |

---

## 4. Verification and Test Results

A dedicated test suite (`tests/geodesy.test.ts`) comprising **49 automated tests** across 6 test suites was executed using Node's native test runner via `tsx`.

### Test Coverage Breakdown

1. **Physical Constants:**
   - Exact verification of $\mathcal{R}_{\text{Mars}} = 3{,}396{,}190 \text{ m}$.
2. **`marsDistance`:**
   - Trivial cases: identical points, identical poles with different longitudes evaluate to $0.0 \text{ m}$.
   - Known analytical arcs:
     - $1^\circ$ latitude at the equator $= \frac{\pi}{180} \cdot 3{,}396{,}190 \approx 59{,}274.98 \text{ m}$.
     - $1^\circ$ longitude at the equator $= 59{,}274.98 \text{ m}$.
     - $90^\circ$ separation (pole to equator) $= \frac{\pi}{2} \cdot 3{,}396{,}190 \approx 5{,}334{,}731.8 \text{ m}$.
     - $180^\circ$ separation (antipodal poles) $= \pi \cdot 3{,}396{,}190 \approx 10{,}669{,}463.6 \text{ m}$.
   - Symmetry: $d(A, B) \equiv d(B, A)$.
   - Antimeridian crossing: $359^\circ \text{E}$ to $1^\circ \text{E}$ at the equator yields exactly a $2^\circ$ arc ($\approx 118{,}549.95 \text{ m}$).
   - Near-pole longitude invariance: distance from $(89^\circ, 0^\circ)$ to $(90^\circ, 0^\circ)$ matches $(89^\circ, 180^\circ)$ to $(90^\circ, 45^\circ)$.
   - Real Mars benchmark: Gale Crater center $(-5.4^\circ, 137.8^\circ)$ to Jezero Crater center $(18.38^\circ, 77.58^\circ)$ verified against an independent analytical calculation ($\approx 3{,}789{,}884 \text{ m}$).
   - Input validation: Rejection of `NaN`, `Infinity`, latitude $> 90^\circ$ or $< -90^\circ$, longitude $< 0^\circ$ or $\ge 360^\circ$.
3. **`marsInitialBearing`:**
   - Cardinal directions: Due North $= 0^\circ$, Due South $= 180^\circ$, Due East at equator $= 90^\circ$, Due West at equator $= 270^\circ$.
   - Degenerate cases: Coincident points return `NaN`; antipodal points return `NaN`.
   - Range validation: All valid outputs fall strictly within $[0^\circ, 360^\circ)$.
4. **`marsInterpolate`:**
   - Boundary conditions: $t = 0 \implies P_1$, $t = 1 \implies P_2$.
   - Midpoint accuracy: Equatorial and meridional bisectors match analytical coordinates within $10^{-6}$ degrees.
   - Longitude bounds: Outputs preserve $[0^\circ, 360^\circ)$ even across the antimeridian.
   - Robustness: Throws `RangeError` on invalid coordinates or non-finite $t$.
5. **`marsPathDistance`:**
   - Boundary cases: Empty path $= 0$, single waypoint $= 0$, two waypoints $= \operatorname{marsDistance}(P_1, P_2)$.
   - Collinear additivity: $d(P_1 \to P_2 \to P_3) = d(P_1 \to P_2) + d(P_2 \to P_3)$.
   - Loop traversal: Out-and-back path doubles the one-way distance.
6. **`marsResamplePath`:**
   - Endpoint preservation: Exact preservation of $W_0$ and $W_n$.
   - Short segment handling: Segments shorter than step size emit both endpoints without erroneous subdivision.
   - Path length conservation: Total resampled path distance is within $0.05\%$ of analytical path distance.
   - Step size sensitivity: Finer step size increases point count monotonically.
   - Error handling: Throws on $< 2$ waypoints, non-positive step sizes, or non-finite inputs.

---

## 5. Architectural Non-Interference

The implementation strictly honors the workspace isolation and parallel development rules:
- **No shared file changes:** Modifies zero files outside of its own module and test suite.
- **No Codex collision:** Does not touch `regions/gale/`, MapLibre workspace components, or DEM raster tiles currently owned by the `feat/gale-map` branch.
- **No dependency bloat:** Zero new entries added to `package.json`.
- **Passes all checks:** Existing tests (19/19), TypeScript typechecking (`next typegen && tsc --noEmit`), and ESLint run with zero errors.
