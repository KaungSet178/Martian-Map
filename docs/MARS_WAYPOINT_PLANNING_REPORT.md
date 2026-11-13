# Mars Geometric Waypoint Planning Foundation — Technical & Verification Report

**Module:** `lib/mission/waypoint-planning.ts`  
**Test Suite:** `tests/waypoint-planning.test.ts`  
**Status:** Implemented, verified (33 unit tests, 89 total regression suite), strictly typed, production-built  
**Target Environment:** Pure TypeScript (ES2017+), Node.js / Browser compatible, runtime schema validation via Zod  
**Revision:** Milestone M2 — Geometric Waypoint Planning Foundation

---

## 1. Executive Summary & Purpose

The `lib/mission/waypoint-planning.ts` module introduces a pure, deterministic, and immutable waypoint planning engine for the **Marswalk Planner** application (NASA Space Apps Challenge 2026). Building upon the M1 Mars Geodesy library (`lib/map/geodesy.ts`), this module delivers the core architectural capabilities required for interactive surface mission planning without coupling to visual UI state or compromising planetary geodesy.

### Key Capabilities

1. **Custom Base Camp Placement:** Flexible designation of human landing sites, habitat shelters, or precursor lander locations as mission origins.
2. **Intermediate Waypoints & Science Stops:** Unconstrained insertion and ordering of navigational turn points and verified scientific investigation targets.
3. **One-Way & Round-Trip Trajectory Generation:** Mathematical synthesis of outbound traverses and closed-loop returns to base, enforcing strict physical and recovery assumptions.
4. **Distance & Bearing Metrics:** Exact per-segment surface distances, initial bearings, outbound vs. return breakdowns, and cumulative trajectory metrics.
5. **Lossless Serialization & Deserialization:** Standard JSON encoding with rigorous Zod schema parsing and structural validation.
6. **Pure Immutable State Transforms:** Every modifier produces a new, unmutated plan instance, eliminating side-effects across UI and simulation layers.

### Strict Scope Boundaries & Scientific Integrity

To preserve scientific rigor and prevent misleading operational claims:
- **Geometric Great-Circle Baseline Only:** All distances and trajectories represent great-circle arcs on the IAU/IAG Mars 2000 reference sphere ($\mathcal{R}_{\text{Mars}} = 3{,}396{,}190\text{ m}$).
- **No Unverified Operational Certification:** The module does **not** compute astronaut walkback limits, life-support consumable burn rates, slope hazards, or automated feasibility certifications.
- **Explicit Provenance:** All coordinates explicitly distinguish user planning inputs from verified NASA target catalog items.
- **Standard Scientific Disclaimer:** All trajectory outputs carry the disclaimer:  
  `"Proposed geometric trajectory — spherical Mars approximation (R = 3,396,190 m)"`.

---

## 2. Data Architecture & Types

The module defines domain models using Zod schemas with derived TypeScript types, ensuring both static type safety and runtime boundary enforcement.

### 2.1 Waypoint Role & Provenance

```typescript
export const waypointRoleSchema = z.enum([
  "base",              // Starting base camp / habitat / lander location
  "science_stop",      // Planned stop for scientific investigation or sampling
  "intermediate",      // Navigational milestone or turn point
  "destination",       // Terminus of an outbound traverse
  "recovery_endpoint", // Pre-planned extraction or rendezvous location
]);
export type WaypointRole = z.infer<typeof waypointRoleSchema>;

export const waypointProvenanceSchema = z.enum([
  "user_planning_input",     // Hypothetical user-placed planning location
  "verified_science_target", // Derived from an audited, coordinate-verified Target record
  "historical_landmark",     // Precursor mission landmark (e.g. rover landing site)
]);
export type WaypointProvenance = z.infer<typeof waypointProvenanceSchema>;
```

### 2.2 Waypoint Data Model

```typescript
export const waypointSchema = z.object({
  id: z.string().min(1).max(100),
  coordinates: coordinatesSchema, // lat: [-90, 90], lon: [0, 360) East
  role: waypointRoleSchema,
  label: z.string().trim().min(1).max(200).optional(),
  target_id: z.string().min(1).max(100).optional(),
  provenance: waypointProvenanceSchema,
  notes: z.string().max(2000).optional(),
});
export type MarsWaypoint = z.infer<typeof waypointSchema>;
```

### 2.3 Waypoint Plan

```typescript
export const trajectoryModeSchema = z.enum(["round_trip", "one_way"]);
export type TrajectoryMode = z.infer<typeof trajectoryModeSchema>;

export const waypointPlanSchema = z.object({
  id: z.string().min(1).max(100),
  region_id: regionIdSchema.optional(),
  name: z.string().trim().min(1).max(200),
  waypoints: z.array(waypointSchema),
  trajectory_mode: trajectoryModeSchema,
  recovery_assumption: z.string().max(2000).optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type WaypointPlan = z.infer<typeof waypointPlanSchema>;
```

### 2.4 Trajectory & Distance Metrics

```typescript
export interface TrajectorySegment {
  readonly segment_index: number;
  readonly from_waypoint_id: string;
  readonly to_waypoint_id: string;
  readonly from_coordinates: MarsCoordinate;
  readonly to_coordinates: MarsCoordinate;
  readonly surface_distance_m: number;
  readonly initial_bearing_deg: number;
  readonly is_return_segment: boolean;
}

export interface GeometricTrajectory {
  readonly plan_id: string;
  readonly trajectory_mode: TrajectoryMode;
  readonly segments: readonly TrajectorySegment[];
  readonly outbound_distance_m: number;
  readonly return_distance_m: number;
  readonly total_surface_distance_m: number;
  readonly label: string;
}
```

---

## 3. Pure Functional API Catalog

All operations are pure, stateless functions. Data mutations are strictly prohibited; all modifiers return fresh object copies via shallow-clone and array restructuring.

| Function | Signature | Description |
| :--- | :--- | :--- |
| `createWaypoint` | `(input: WaypointInput): MarsWaypoint` | Validates and constructs a single waypoint with default provenance `user_planning_input`. |
| `createWaypointFromTarget` | `(target: Target, role?: WaypointRole): MarsWaypoint` | Constructs a waypoint linked directly to a verified science target catalog entry. |
| `createWaypointPlan` | `(input: PlanInput): WaypointPlan` | Creates a validated planning container. |
| `addWaypoint` | `(plan: WaypointPlan, waypoint: MarsWaypoint, index?: number): WaypointPlan` | Appends or inserts a waypoint at a specified index. |
| `removeWaypoint` | `(plan: WaypointPlan, waypoint_id: string): WaypointPlan` | Removes a waypoint by ID. |
| `updateWaypoint` | `(plan: WaypointPlan, waypoint_id: string, patch: Partial<MarsWaypoint>): WaypointPlan` | Immutably patches a waypoint's attributes. Throws if ID is missing. |
| `reorderWaypoints` | `(plan: WaypointPlan, ordered_waypoint_ids: string[]): WaypointPlan` | Reorders waypoints to match an explicit ID permutation. Throws on count mismatch or unknown IDs. |
| `moveWaypoint` | `(plan: WaypointPlan, waypoint_id: string, delta_index: number): WaypointPlan` | Moves a waypoint up/down within the list, clamped to array boundaries. |
| `setOrigin` | `(plan: WaypointPlan, base_waypoint: MarsWaypoint): WaypointPlan` | Designates or creates a base camp at index 0 with role `base`. |
| `setDestination` | `(plan: WaypointPlan, dest_waypoint: MarsWaypoint, recovery_note?: string): WaypointPlan` | Sets a destination waypoint at the terminus and switches mode to `one_way`. |
| `setTrajectoryMode` | `(plan: WaypointPlan, mode: TrajectoryMode, recovery_assumption?: string): WaypointPlan` | Switches between `round_trip` and `one_way`. |
| `validateWaypointPlan` | `(plan: WaypointPlan): PlanValidationReport` | Comprehensive validation returning errors, warnings, and an overall boolean status. |
| `generateGeometricTrajectory` | `(plan: WaypointPlan): GeometricTrajectory` | Evaluates all great-circle segments, bearings, distances, and return closure leg. |
| `calculateDistanceSummary` | `(plan: WaypointPlan): DistanceSummary` | Fast, lightweight breakdown of outbound, return, and total distances without generating segment coordinates. |
| `resampleTrajectory` | `(trajectory: GeometricTrajectory, step_m: number): MarsCoordinate[]` | Densifies a trajectory using spherical Slerp at uniform distance intervals. |
| `serializeWaypointPlan` | `(plan: WaypointPlan): string` | Formats a plan to indented JSON after Zod schema validation. |
| `deserializeWaypointPlan` | `(json_string: string): WaypointPlan` | Parses JSON and strictly validates against `waypointPlanSchema`. |

---

## 4. Mathematical & Geodetic Foundations

### 4.1 Spherical Reference Model

All trajectory calculations utilize the IAU/IAG Mars 2000 reference sphere:
$$\mathcal{R}_{\text{Mars}} = 3{,}396{,}190\text{ m}$$

Segment distances $s_i$ are computed using the Vincenty great-circle formula:
$$\Delta\sigma = \arctan\left(\frac{\sqrt{(\cos\phi_2\sin\Delta\lambda)^2 + (\cos\phi_1\sin\phi_2 - \sin\phi_1\cos\phi_2\cos\Delta\lambda)^2}}{\sin\phi_1\sin\phi_2 + \cos\phi_1\cos\phi_2\cos\Delta\lambda}\right)$$
$$s_i = \mathcal{R}_{\text{Mars}} \cdot \Delta\sigma$$

Initial forward azimuth $\alpha$ is computed as:
$$\alpha = \operatorname{atan2}\left(\sin\Delta\lambda\cos\phi_2,\; \cos\phi_1\sin\phi_2 - \sin\phi_1\cos\phi_2\cos\Delta\lambda\right) \pmod{360^\circ}$$

### 4.2 Additive Identity Guarantee

For a plan with $N$ waypoints $W_0, W_1, \dots, W_{n-1}$:

1. **One-Way Trajectory ($M = N - 1$ segments):**
   $$\text{outbound\_distance\_m} = \sum_{k=0}^{N-2} s(W_k, W_{k+1})$$
   $$\text{return\_distance\_m} = 0$$
   $$\text{total\_surface\_distance\_m} = \text{outbound\_distance\_m}$$

2. **Round-Trip Trajectory ($M = N$ segments, when $N \ge 2$):**
   $$\text{outbound\_distance\_m} = \sum_{k=0}^{N-2} s(W_k, W_{k+1})$$
   $$\text{return\_distance\_m} = s(W_{n-1}, W_0)$$
   $$\text{total\_surface\_distance\_m} = \text{outbound\_distance\_m} + \text{return\_distance\_m} = \sum_{j=0}^{M-1} s_j$$

In all cases, the additive identity holds strictly within float64 machine epsilon ($\epsilon \approx 10^{-16}$), eliminating rounding accumulation across segment boundaries.

---

## 5. Trajectory Semantics: One-Way vs. Round-Trip

The engine enforces explicit mission planning semantics:

### Round-Trip Mode
- Standard Mars EVA paradigm where the crew departs from a base camp (habitat/lander) and returns safely to the same base camp.
- If $N \ge 2$, a return segment is automatically appended from $W_{n-1}$ back to $W_0$.
- The return segment has `is_return_segment: true`.
- If $W_{n-1}$ is already coincident with $W_0$, the return segment distance is $0.0\text{ m}$.

### One-Way Mode
- Non-returning traverse (e.g. traverse from Habitat A to Habitat B, or to an extraction vehicle).
- **Mandatory Requirements:**
  1. The final waypoint $W_{n-1}$ must be designated with role `destination` or `recovery_endpoint`.
  2. The plan must contain a non-empty `recovery_assumption` string documenting how the crew or assets will be recovered at the terminus (e.g. pressurized rover rendezvous, secondary lander, prepositioned ascent vehicle).
- If either condition is violated, `validateWaypointPlan` records a blocking validation error.

---

## 6. Validation Rule Matrix

The `validateWaypointPlan` function evaluates structural, topological, and mission rules, categorizing findings into **Errors** (blocking) and **Warnings** (non-blocking informational notices):

| Category | Code | Severity | Condition | Remediation |
| :--- | :--- | :--- | :--- | :--- |
| **Empty Plan** | `EMPTY_PLAN` | Error | $N = 0$ (plan has no waypoints) | Add at least one base camp waypoint. |
| **Duplicate IDs** | `DUPLICATE_WAYPOINT_ID` | Error | Two or more waypoints share the same `id` | Assign unique IDs to every waypoint. |
| **Coordinate Bounds** | `INVALID_COORDINATES` | Error | Latitude $\notin [-90, 90]$ or Longitude $\notin [0, 360)$ | Restrict coordinates to Mars standard bounds. |
| **One-Way Terminus** | `ONE_WAY_DESTINATION_ROLE_MISSING` | Error | In `one_way` mode, final waypoint role is neither `destination` nor `recovery_endpoint` | Set role of final waypoint to `destination` or `recovery_endpoint`. |
| **Recovery Note** | `ONE_WAY_RECOVERY_ASSUMPTION_MISSING` | Error | In `one_way` mode, `recovery_assumption` is missing or empty whitespace | Provide documented extraction/recovery plan. |
| **Base Missing** | `ORIGIN_NOT_BASE` | Warning | First waypoint ($W_0$) does not have role `base` | Mark $W_0$ with role `base`. |
| **Single Waypoint** | `SINGLE_WAYPOINT` | Warning | Plan contains only $1$ waypoint | Add intermediate stops or science targets. |
| **Coincident Points** | `COINCIDENT_WAYPOINTS` | Warning | Consecutive waypoints $W_k, W_{k+1}$ are at the exact same coordinates ($s < 0.01\text{ m}$) | Check coordinates or remove redundant waypoint. |

---

## 7. Numerical Verification & Benchmarks

The accompanying test suite (`tests/waypoint-planning.test.ts`) verifies 33 individual specifications across 5 suites:

### 7.1 Analytical Benchmark Cases

| Test Case | Geometry | Expected Metric | Result |
| :--- | :--- | :--- | :--- |
| **Equatorial $1^\circ$ Segment** | $(-5.4^\circ, 137.8^\circ) \to (-5.4^\circ, 138.8^\circ)$ | $s = \mathcal{R} \cdot \cos(-5.4^\circ) \cdot \frac{\pi}{180} \approx 59{,}011.64\text{ m}$ | Passed ($\Delta < 0.01\text{ m}$) |
| **Equatorial $2^\circ$ Outbound + Return** | $(0^\circ, 100^\circ) \to (0^\circ, 102^\circ)$ | Outbound: $118{,}549.40\text{ m}$<br>Return: $118{,}549.40\text{ m}$<br>Total: $237{,}098.79\text{ m}$ | Passed ($\Delta < 0.01\text{ m}$) |
| **Multi-Waypoint Gale Loop** | Base $\to$ Pahrump Hills $\to$ Vera Rubin Ridge $\to$ Return | $\sum s_i \equiv \text{total\_distance}$ | Exact double equality ($\Delta = 0$) |
| **Antimeridian Crossing** | $(0^\circ, 359^\circ) \to (0^\circ, 1^\circ)$ | $s \approx 2^\circ \text{ arc} = 118{,}549.40\text{ m}$ | Passed |
| **Slerp Densification** | $10\text{ km}$ segment resampled at $2\text{ km}$ | Exact 6 points (5 segments of $2{,}000\text{ m}$), preserving endpoints | Passed |

---

## 8. Scientific Limitations & Future Milestones

To ensure proper usage across the Marswalk Planner project, the following limitations must be recognized:

1. **Horizontal Reference Distances Only:**  
   The calculated distances do **not** account for vertical relief. In mountainous regions (e.g. Mount Sharp / Aeolis Mons), 3D slope-integrated path lengths exceed spherical horizontal distances. Full topographic distance integration is reserved for Milestone M3 (co-registered DEM slope sampling).
2. **Absence of Traverse Feasibility Scoring:**  
   This module does **not** evaluate whether a human astronaut or rover could traverse the path. Steep scarps, impassable boulder fields, sand traps, or excessive slopes are not accounted for.
3. **Absence of Environmental Constraints:**  
   The module does **not** model illumination, shadows, diurnal temperature swings, dust storm atmospheric opacity, or surface radiation levels.
4. **No Automated Navigation / Pathfinding:**  
   Trajectories connect user-specified waypoints directly via great-circle chords. Obstacle-avoidance routing requires higher-level planners.

---

## 9. Integration Architecture

The module integrates seamlessly with the existing codebase without modifying other subsystems:
- **`lib/map/geodesy.ts`:** Directly consumes `marsDistance`, `marsInitialBearing`, `marsResamplePath`, and `MARS_RADIUS_M`.
- **`lib/contracts/primitives.ts`:** Adheres strictly to `coordinatesSchema` (clamping east longitudes to $[0, 360)$) and `regionIdSchema`.
- **`lib/contracts/science.ts`:** Consumes `Target` structures via `createWaypointFromTarget`.
- **Zero Disruptive Changes:** Does not modify `regions/gale/`, `regions/jezero/`, `regions/oxia/`, MapLibre shaders, DEM co-registration pipelines, or existing UI editors.
