# Marswalk Planner — M4.1 Deterministic Mission Timeline Report

**Milestone:** M4.1 — Deterministic Mission Timeline and Route Duration Engine  
**Module:** `lib/mission/timeline.ts`  
**Test Suite:** `tests/mission-timeline.test.ts`  
**Branch:** `feat/mission-timeline`  
**Starting Baseline SHA:** `a5809dad9ed0f52c0604f3a00c327b666d8d95e2` (`origin/feat/gale-map`)  
**Status:** Verification Complete — Ready for Review  

---

## 1. Purpose and Scope

Milestone **M4.1** establishes the deterministic calculation engine for estimating the duration of a hypothetical astronaut extravehicular activity (EVA) traverse on Mars.

Given an ordered sequence of Mars waypoints and explicit user planning assumptions (hypothetical walking speed, stationary science stop durations, mission start offset, base preparation delay, and recovery endpoint duration), the engine computes:
- Individual segment distances and transit durations.
- Chronologically ordered waypoint arrivals and departures.
- Stationary science-stop and base preparation durations.
- Cumulative mission elapsed time.
- Return-to-base timing for closed-loop excursions.
- Structured validation status (`COMPLETE_SCENARIO`, `INCOMPLETE_SCENARIO`, `INVALID_INPUT`) and descriptive warnings.

### Phase M4.1 Isolation
This milestone deliverable is **strictly a calculation engine**. It does not construct user interfaces, does not alter existing MapLibre components or map styling, does not query external network APIs or AI services, and does not hardcode region-specific geography.

---

## 2. Existing Architecture Reused

The timeline engine directly integrates with and builds upon existing Marswalk architecture:
1. **PDS Mars 2000 Reference Sphere ($R = 3,396,190\text{ m}$):** Reuses `MARS_RADIUS_M` and geodesy routines from [`lib/map/geodesy.ts`](file:///D:/martian-map-timeline/lib/map/geodesy.ts).
2. **Primitive Coordinate Schema:** Reuses `coordinatesSchema` from [`lib/contracts/primitives.ts`](file:///D:/martian-map-timeline/lib/contracts/primitives.ts) ensuring strict validation of planetocentric latitude $[-90^\circ, 90^\circ]$ and East-positive longitude $[0^\circ, 360^\circ)$.
3. **M2/M3 Waypoint Planning Contracts:** Reuses `waypointRoleSchema`, `waypointPlanSchema`, `generateGeometricTrajectory`, `MarsWaypoint`, `WaypointPlan`, and `ProposedGeometricTrajectory` from [`lib/mission/waypoint-planning.ts`](file:///D:/martian-map-timeline/lib/mission/waypoint-planning.ts).
4. **Zero Geodesic Duplication:** Rather than re-implementing distance equations, `calculateMissionTimeline` accepts either a `WaypointPlan`, a `ProposedGeometricTrajectory`, or an ad-hoc `TimelineRouteInput`. When a `WaypointPlan` is provided, great-circle segment lengths are determined using the verified M2 geometric trajectory generator.

---

## 3. Input Contract

The engine accepts a flexible input union (`WaypointPlan | ProposedGeometricTrajectory | TimelineRouteInput`) alongside a typed `TimelineAssumptions` contract:

```typescript
export interface TimelineAssumptions {
  /** Hypothetical astronaut walking speed in metres per hour. Must be strictly positive and finite. */
  readonly walking_speed_m_per_hour: number;
  /** Mission start elapsed time in seconds from origin epoch. Defaults to 0. */
  readonly start_elapsed_seconds?: number;
  /** Default duration in seconds for waypoints with role="science_stop". Defaults to 0. */
  readonly default_science_stop_duration_seconds?: number;
  /** Explicit duration in seconds for specific waypoints, keyed by waypoint ID. */
  readonly waypoint_stop_durations_seconds?: Readonly<Record<string, number>>;
  /** Explicit base preparation delay in seconds at initial departure. Defaults to 0. */
  readonly base_preparation_duration_seconds?: number;
  /** Explicit duration in seconds at final destination or post-return recovery. Defaults to 0. */
  readonly final_destination_duration_seconds?: number;
}
```

For ad-hoc testing, benchmark evaluation, or candidate routes from future planners, `TimelineRouteInput` allows passing explicit segment definitions:

```typescript
export interface TimelineSegmentInput {
  readonly segment_index?: number;
  readonly from_waypoint_id: string;
  readonly to_waypoint_id: string;
  readonly from_coordinates?: MarsCoordinate;
  readonly to_coordinates?: MarsCoordinate;
  readonly distance_metres?: number | null;
  readonly status?: "SUPPORTED" | "UNSUPPORTED";
  readonly is_return_segment?: boolean;
}

export interface TimelineRouteInput {
  readonly mode?: "round_trip" | "one_way";
  readonly waypoints: readonly MarsWaypoint[];
  readonly segments?: readonly TimelineSegmentInput[];
}
```

---

## 4. Output Contract

The calculation produces a typed, schema-validated `MissionTimelineResult`:

```typescript
export interface MissionTimelineResult {
  readonly status: "COMPLETE_SCENARIO" | "INCOMPLETE_SCENARIO" | "INVALID_INPUT";
  readonly assumptions: ResolvedTimelineAssumptions;
  readonly timeline: readonly TimelineEntry[];
  readonly segments: readonly TimelineSegment[];
  readonly total_distance_metres: number | null;
  readonly total_travel_seconds: number | null;
  readonly total_stop_seconds: number;
  readonly total_mission_seconds: number | null;
  readonly scientific_disclaimer: string;
  readonly warnings: readonly string[];
}

export interface TimelineEntry {
  readonly step_index: number;
  readonly waypoint_id: string;
  readonly role?: WaypointRole;
  readonly is_return?: boolean;
  readonly arrival_elapsed_seconds: number | null;
  readonly departure_elapsed_seconds: number | null;
  readonly stop_duration_seconds: number;
}

export interface TimelineSegment {
  readonly segment_index: number;
  readonly from_waypoint_id: string;
  readonly to_waypoint_id: string;
  readonly distance_metres: number | null;
  readonly travel_duration_seconds: number | null;
  readonly status: "SUPPORTED" | "UNSUPPORTED";
  readonly is_return_segment: boolean;
}
```

### Important Null Semantics
- A `null` value in `distance_metres`, `travel_duration_seconds`, `arrival_elapsed_seconds`, or `departure_elapsed_seconds` denotes that the metric **could not be established**.
- `null` never means zero.
- Unsupported or indeterminate legs are never replaced with zero durations, preventing false assertions of complete mission duration.

---

## 5. Calculation Formulas

For each supported segment connecting waypoint $W_i$ to $W_{i+1}$ with great-circle surface distance $d_i$ (metres) and user walking speed $v$ (metres per hour):

$$t_{\text{travel, hours}} = \frac{d_i}{v}$$

$$t_{\text{travel, seconds}} = t_{\text{travel, hours}} \times 3600 = \frac{d_i}{v} \times 3600$$

For sequential waypoint visits ($i = 0, 1, \dots, M-1$):

$$t_{\text{arrival}, 0} = t_{\text{start}}$$
$$t_{\text{departure}, 0} = t_{\text{arrival}, 0} + \Delta t_{\text{stop}, 0}$$

For each subsequent visit $i > 0$:
$$t_{\text{arrival}, i} = t_{\text{departure}, i-1} + t_{\text{travel}, i-1}$$
$$t_{\text{departure}, i} = t_{\text{arrival}, i} + \Delta t_{\text{stop}, i}$$

Across all supported segments and stops:
$$T_{\text{travel}} = \sum_{i=0}^{N-1} t_{\text{travel}, i}$$
$$T_{\text{stop}} = \sum_{j=0}^{M-1} \Delta t_{\text{stop}, j}$$
$$T_{\text{mission}} = T_{\text{travel}} + T_{\text{stop}}$$

Mathematical identity guaranteed:
$$t_{\text{departure}, M-1} - t_{\text{start}} \equiv T_{\text{mission}}$$

---

## 6. Unit Conventions

- **Distance:** Metres ($\text{m}$), positive floating-point number.
- **Speed:** Metres per hour ($\text{m/h}$), strictly positive finite number.
- **Time:** Seconds ($\text{s}$), non-negative floating-point number.
- **Conversion Utilities Provided:**
  - `minutesToSeconds(minutes: number): number`
  - `secondsToMinutes(seconds: number): number`
  - `hoursToSeconds(hours: number): number`
  - `secondsToHours(seconds: number): number`
  - `formatElapsedSeconds(seconds: number | null): string` (formats to `HH:MM:SS` or `--:--:--`)

---

## 7. Stop-Duration Handling & Anti-Double-Counting Rules

1. **Selective Application:** Stop durations are **not** silently applied to every waypoint. Intermediate navigation waypoints (`role === "intermediate"`) default to $0\text{ s}$ stop duration unless explicitly overridden by ID.
2. **Science Stops:** Waypoints with `role === "science_stop"` receive `default_science_stop_duration_seconds` unless overridden by an explicit entry in `waypoint_stop_durations_seconds`.
3. **Base Preparation Delay:** Configured via `base_preparation_duration_seconds` (defaults to 0). Applied strictly at initial excursion departure ($W_0$, index 0).
4. **Return Closure Isolation:** In a round-trip excursion, the origin base is visited twice (index 0 for departure, index $M-1$ for final ingress). The base preparation delay is applied **only once** at index 0. The final return visit receives `final_destination_duration_seconds` (defaults to 0), completely preventing double-counting.
5. **Exact Minute-to-Second Integrity:** A 15-minute science stop contributes exactly $900\text{ s}$ to total stop duration.

---

## 8. One-Way Behavior

- In `one_way` mode, the trajectory terminates at the final designated waypoint (`role === "destination"` or `"recovery_endpoint"`).
- **No Implicit Return:** No return segment or closure leg back to the base camp is synthesized.
- A one-way route requires at least 2 waypoints. If fewer than 2 waypoints exist, status is marked `INCOMPLETE_SCENARIO`.

---

## 9. Round-Trip Behavior

- In `round_trip` mode, a complete excursion must include the return leg connecting the final excursion waypoint back to the origin base camp ($W_0$).
- When using a `WaypointPlan`, the return leg is synthesized with `is_return_segment: true`.
- If an ad-hoc or candidate route in round-trip mode omits the closing leg, status is set to `INCOMPLETE_SCENARIO` and an explicit warning is attached: `"Round-trip itinerary is missing a return segment closing back to the origin base."`

---

## 10. Invalid and Unsupported Cases

The engine distinguishes input invalidity from scenario incompleteness using a 3-tier hierarchy:

1. **`INVALID_INPUT` (Structural / Numerical Corruption):**
   - Non-positive, zero, `NaN`, or infinite walking speed.
   - Negative, `NaN`, or infinite stop duration.
   - Negative, `NaN`, or infinite segment distance.
   - Negative or non-finite start offset.
   - Coordinates outside $[-90, 90]$ latitude or $[0, 360)$ longitude.
   - Empty waypoint list ($0$ waypoints).
   - Duplicate waypoint IDs.
   - Segment referencing non-existent waypoint IDs.
   *Outcome:* `total_distance_metres: null`, `total_travel_seconds: null`, `total_mission_seconds: null`.

2. **`INCOMPLETE_SCENARIO` (Valid Inputs, Incomplete Plan):**
   - Single-waypoint itinerary (cannot form a traverse).
   - Round-trip route missing return closure leg.
   - Any segment with `distance_metres === null` or marked `status: "UNSUPPORTED"`.
   *Outcome:* Partial timing is provided for valid segments prior to the break; downstream arrivals/departures and total mission duration are set to `null`.

3. **`COMPLETE_SCENARIO`:**
   - All segments supported with finite non-negative distances, all stops valid, return closure confirmed where applicable.
   *Outcome:* Full cumulative schedule and additive totals established.

---

## 11. Numerical Precision & Stability

- All timing computations utilize IEEE-754 64-bit double precision floats.
- Segment durations are calculated as $(d_i / v) \times 3600$, avoiding intermediate rounding.
- Zero-length segments (e.g. coincident coordinates) evaluate safely to $0\text{ s}$ travel duration without division by zero.
- Long traverses (50+ waypoints) verify exact summation without cumulative floating-point drift.
- Output schema validates that all duration fields are non-negative.

---

## 12. Scientific Limitations

The following scientific boundaries are explicitly documented in all outputs via `TIMELINE_DISCLAIMER`:
1. **Hypothetical Planning Parameter:** Walking speeds are scenario inputs, not validated EVA performance standards.
2. **Idealized Spherical Geometry:** Segment distances represent great-circle arcs on an un-deformed sphere ($R = 3,396,190\text{ m}$). Terrain relief is not integrated into distance calculations.
3. **No Metabolic Exertion:** Metabolic workload, caloric expenditure, and life-support consumption (oxygen, power) are not estimated.
4. **No Hazard Clearance:** Timing calculations do not certify operational safety, boulder-field bypass, slope stability, or rover traversability.

---

## 13. Future Weather Integration (M4.4 Readiness)

The timeline engine outputs clean, continuous elapsed seconds from mission origin:
- `arrival_elapsed_seconds`
- `departure_elapsed_seconds`
- `travel_duration_seconds`
- `stop_duration_seconds`

This architecture allows future weather modules (M4.4) to map elapsed seconds into:
- Mars Solar Time (LMST / LTST).
- Diurnal surface temperature cycles ($T_{\text{surf}}(t)$).
- Atmospheric pressure variations ($P(t)$).
- Solar irradiance and UV flux.
- Dust optical depth ($\tau$).

By remaining decoupled from Mars calendar systems in M4.1, the engine ensures deterministic, timezone-agnostic timing that can be mapped to any chosen mission Sol or solar longitude ($L_s$).

---

## 14. Verification and Test Results

Test suite [`tests/mission-timeline.test.ts`](file:///D:/martian-map-timeline/tests/mission-timeline.test.ts) exercises 34 dedicated test scenarios covering all prompt-specified cases:

| Scenario / Test Category | Scenarios Covered | Result |
| :--- | :--- | :--- |
| **Unit Conversion Helpers** | Minutes/hours to seconds, format HH:MM:SS, null handling | **Passed (3/3)** |
| **Scenario A: Basic Route** | 1,000 m @ 500 m/h $\rightarrow$ 7,200 s exact | **Passed (1/1)** |
| **Scenario B: Multiple Segments** | Cumulative arrival/departure across multi-leg traverse | **Passed (1/1)** |
| **Scenario C: Science Stops** | 15-min stop (900 s) added once; selective stop roles; ID overrides | **Passed (3/3)** |
| **Scenario D: Zero-Duration Stop** | Total time unchanged when stop duration = 0 | **Passed (1/1)** |
| **Scenario E: Invalid Speed Inputs** | 0, -500, NaN, +Infinity, -Infinity rejected as INVALID_INPUT | **Passed (5/5)** |
| **Scenario F: Invalid Distance Inputs** | Negative, NaN, Infinity rejected; null handled as INCOMPLETE | **Passed (4/4)** |
| **Scenario G: Unsupported Segments** | Partial timing preserved; totals null; downstream arrivals null | **Passed (1/1)** |
| **Scenario H: One-Way Route** | Trajectory ends at destination; no return segment created | **Passed (1/1)** |
| **Scenario I: Round-Trip Route** | Closing return leg back to base camp included in total duration | **Passed (1/1)** |
| **Scenario J: Missing Return Leg** | INCOMPLETE_SCENARIO reported when round-trip lacks closure | **Passed (1/1)** |
| **Scenario K: Fractional Distances** | Fractional metres (1234.5678 m) & speeds; zero-length segment | **Passed (2/2)** |
| **Scenario L: Long Itinerary** | 50-segment itinerary verified without accumulation drift | **Passed (1/1)** |
| **Scenario M: Determinism** | Repeated calculation with identical inputs produces deep-equal result | **Passed (1/1)** |
| **Scenario N: Input Immutability** | Deep-frozen inputs run without mutation or errors | **Passed (1/1)** |
| **Scenario O: Regional Independence** | Evaluates identically for Gale, Jezero, and Oxia coordinates | **Passed (1/1)** |
| **Additional Structural Checks** | Empty itinerary, single waypoint, duplicate IDs, ghost references, base prep | **Passed (6/6)** |

### Comprehensive Repository Test Execution
```bash
> npx tsx --test tests/*.test.ts
193 tests passed across 36 test suites (0 failed)

> npm test
21 tests passed across 2 test suites (0 failed)

> npm run typecheck
next typegen && tsc --noEmit
✓ Types generated successfully (0 errors)

> npm run lint
eslint .
✓ 0 errors, 0 warnings

> npm run build
next build (Turbopack)
✓ Compiled successfully in 4.8s
✓ 4 static pages generated (exit code 0)
```

---

## 15. Files Changed

1. **`lib/mission/timeline.ts` (New file):** Pure TypeScript mission timeline calculation engine, Zod schemas, unit conversion helpers, and disclaimer constants.
2. **`tests/mission-timeline.test.ts` (New file):** Comprehensive 34-test suite covering scenarios A through O and operational edge cases.
3. **`docs/M4_1_MISSION_TIMELINE_REPORT.md` (New file):** This detailed milestone report.

No existing MapLibre components, UI files, or regional datasets were modified.

---

## 16. Git Commit Details

- **Branch:** `feat/mission-timeline`
- **Initial Base SHA:** `a5809dad9ed0f52c0604f3a00c327b666d8d95e2`
- **Status:** All changes committed to branch `feat/mission-timeline` and pushed to remote `origin/feat/mission-timeline`.

---

## 17. Remaining Work for Subsequent Milestones

- **M4.2 — Timeline UI Presentation:** React components for visualizing the timeline schedule, duration breakdowns, and speed selector controls.
- **M4.3 — Consumable Resource Budgeting:** Oxygen and battery consumption models with safety margins and reserve requirements.
- **M4.4 — Climate & Weather Integration:** Mapping elapsed timeline seconds to local solar time and diurnal Martian atmospheric conditions.
