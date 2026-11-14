# Marswalk Planner — M4.1A Mission Timeline Engine Hardening Report

**Milestone:** M4.1A — Mission Timeline Engine Hardening  
**Module:** `lib/mission/timeline.ts`  
**Test Suite:** `tests/mission-timeline.test.ts`  
**Branch:** `feat/mission-timeline`  
**Baseline M4.1 Commit:** `077b5194e577abae62422552f4d9e4364d6c875f`  
**Status:** Hardening Complete & Fully Verified  

---

## 1. Original M4.1 Implementation

Milestone M4.1 delivered the initial pure TypeScript mission timeline engine (`lib/mission/timeline.ts`), which computed segment transit times, cumulative arrivals, departures, and science-stop durations for hypothetical astronaut EVAs on Mars.

While M4.1 was verified against 34 dedicated unit tests, an audit identified specific validation vulnerabilities when evaluating ad-hoc or partially corrupted explicit segment arrays (`TimelineRouteInput`).

---

## 2. Specific Weaknesses Identified

1. **Disconnected Segment Endpoints:** The original segment validator checked only that `from_waypoint_id` and `to_waypoint_id` existed in the route's waypoint dictionary. It did not verify that segment $j$ actually originated at waypoint $W_j$ and terminated at waypoint $W_{j+1}$. As a result, disconnected sequences (such as `A -> B` followed by `C -> A` for an itinerary `A -> B -> C`) were not rejected as invalid, potentially assigning incorrect transit times to subsequent waypoints.
2. **Reversed Legs & Segment Order:** Segments pointing in reverse (e.g. `B -> A` when `A -> B` was expected) were not rejected.
3. **Unchecked Segment Count & Extra Segments:** Itineraries containing extra segments past the destination or return base were processed without flagging extra legs.
4. **Duplicate Segments:** Repeated identical directed legs (e.g. `A -> B` followed by `A -> B`) were not rejected upfront.
5. **False Return Closure Flags:** A segment bearing `is_return_segment: true` was accepted even if it terminated at an intermediate waypoint instead of the excursion base camp ($W_0$), or if it appeared prematurely in the itinerary.
6. **Multiple Return Markers:** Multiple segments could claim return status simultaneously.
7. **Downstream Time Carry-over on Missing Legs:** In `buildTimelineEntries`, if an explicit segment list ended prematurely before the final waypoint, the loop previously skipped updating `currentElapsed` on the missing leg, causing downstream waypoints to incorrectly inherit the last departure timestamp instead of evaluating to `null`.
8. **Numerical Overflow on Extreme Inputs:** Calculations involving very small speeds (e.g. $10^{-300}\text{ m/h}$) or astronomical distances could produce `Infinity` or exceed `Number.MAX_SAFE_INTEGER`, leading to invalid numbers in result schemas.

---

## 3. Corrected Segment-Continuity Rules

For every route with explicit segments ($S_0, S_1, \dots, S_{K-1}$) evaluated against base itinerary waypoints ($W_0, W_1, \dots, W_{N-1}$):

1. **Supplied Index Consistency:** If $S_j.\text{segment\_index}$ is provided, it must strictly equal $j$. Any mismatch immediately triggers `INVALID_INPUT`.
2. **Sequential Endpoint Continuity:**
   - Outbound legs ($j < N - 1$): $S_j.\text{from\_waypoint\_id} \equiv W_j.\text{id}$ and $S_j.\text{to\_waypoint\_id} \equiv W_{j+1}.\text{id}$.
   - Return closure leg ($j = N - 1$ in round-trip mode): $S_j.\text{from\_waypoint\_id} \equiv W_{N-1}.\text{id}$ and $S_j.\text{to\_waypoint\_id} \equiv W_0.\text{id}$.
   Any endpoint mismatch immediately triggers `INVALID_INPUT` with a descriptive message (e.g. `"Segment 1 has disconnected start waypoint 'C'. Expected 'B'."`).
3. **Duplicate Segment Detection:** A directed leg key `${from}->${to}` cannot appear more than once in an explicit route. Duplicates trigger `INVALID_INPUT`.
4. **Extra Segment Prevention:** Total explicit segments cannot exceed $N - 1$ for one-way missions or $N$ for round-trip missions. Any segment at $j \ge \text{maxAllowed}$ triggers `INVALID_INPUT`.
5. **Missing Expected Segments:** If fewer segments are supplied than the itinerary requires ($K < N - 1$ for one-way, or $K < N$ for round-trip):
   - The scenario is marked `INCOMPLETE_SCENARIO`.
   - Waypoints beyond the provided segments evaluate to `arrival_elapsed_seconds: null` and `departure_elapsed_seconds: null`.
   - Total travel and total mission durations evaluate to `null` (never false complete numbers).

---

## 4. Corrected Return-Closure Validation

For round-trip missions:
1. **Base Identity Preservation:** The departure base is explicitly identified as $W_0 = \text{baseWaypoints}[0]$.
2. **Closure Destination Match:** The return leg must terminate at $W_0.\text{id}$. If the closing segment terminates at any other waypoint (e.g. `B -> C` or `B -> A` where $A \ne W_0$), the input is rejected as `INVALID_INPUT` (`"Return segment destination '...' does not match the starting base '...'"`).
3. **Closure Origin Match:** The return leg must begin at the final excursion waypoint $W_{N-1}.\text{id}$.
4. **No Premature Returns:** Segments prior to index $N - 1$ cannot have `is_return_segment: true`. Any premature return flag triggers `INVALID_INPUT` (`"... falsely marked as a return segment before the final leg."`).
5. **Single Return Marker:** An itinerary cannot have more than one segment with `is_return_segment: true`. Multiple return markers trigger `INVALID_INPUT`.
6. **No Continuation After Return:** No segments are permitted after the return closure leg ($j = N - 1$).
7. **One-Way Protection:** If `mode === "one_way"`, any segment with `is_return_segment: true` is strictly rejected as `INVALID_INPUT`.

---

## 5. Incomplete vs. Invalid Handling

A strict architectural distinction is enforced:

| Condition | Classification | Total Durations | Downstream Arrivals |
| :--- | :--- | :--- | :--- |
| **Missing Segment Distance (`null`)** | `INCOMPLETE_SCENARIO` | `null` | Evaluates to `null` past break |
| **Segment Marked `UNSUPPORTED`** | `INCOMPLETE_SCENARIO` | `null` | Evaluates to `null` past break |
| **Missing Expected Segment (prefix route)** | `INCOMPLETE_SCENARIO` | `null` | Evaluates to `null` for unreached stops |
| **Missing Return Leg in Round-Trip** | `INCOMPLETE_SCENARIO` | `null` | Base itinerary preserved; return visit omitted |
| **Disconnected Waypoint References** | `INVALID_INPUT` | `null` | Timeline empty; error reported |
| **Reversed Segment Direction** | `INVALID_INPUT` | `null` | Timeline empty; error reported |
| **Extra / Duplicate Segments** | `INVALID_INPUT` | `null` | Timeline empty; error reported |
| **Falsely Labeled / Contradictory Return** | `INVALID_INPUT` | `null` | Timeline empty; error reported |
| **Negative Speed / Distance / Stop** | `INVALID_INPUT` | `null` | Timeline empty; error reported |
| **Numerical Overflow past MAX_SAFE_INTEGER**| `INVALID_INPUT` | `null` | Timeline empty; error reported |

---

## 6. Generated Return-Leg Semantics

When `WaypointPlan` or `TimelineRouteInput` without explicit segments is provided:
- The engine synthesizes outbound legs and, for `round_trip`, the return segment from $W_{N-1}$ back to $W_0$.
- The synthesized return leg is explicitly tagged with `is_return_segment: true`.
- **Hypothetical Disclaimer Maintained:** The generated return leg is based strictly on idealized great-circle geometry on the Mars 2000 sphere ($R = 3,396,190\text{ m}$). It does NOT imply operational route safety, terrain traversability, hazard avoidance, or that the outbound path can be safely reversed.
- The mandatory `TIMELINE_DISCLAIMER` is attached to all calculation outputs.

---

## 7. Numerical Safety and Overflow Handling

1. **Finite Range Assertions:** All speeds, distances, and stop durations are validated with `Number.isFinite(x)`.
2. **Safe Integer Ceiling:** To avoid IEEE-754 precision loss and representation overflow:
   - Any segment distance $> \text{Number.MAX\_SAFE\_INTEGER}$ ($9.007 \times 10^{15}\text{ m}$) triggers `INVALID_INPUT`.
   - Any computed segment travel duration $> \text{Number.MAX\_SAFE\_INTEGER}$ ($\approx 2.85 \times 10^8$ years in seconds) triggers `INVALID_INPUT`.
   - Cumulative elapsed arrival/departure timestamps exceeding `Number.MAX_SAFE_INTEGER` trigger `INVALID_INPUT`.
   - Total mission duration exceeding `Number.MAX_SAFE_INTEGER` triggers `INVALID_INPUT`.
3. **Small Positive Speeds:** Tiny positive speeds (e.g. $0.01\text{ m/h}$) that produce safe, finite durations evaluate accurately without crashing.
4. **Fractional Durations:** High-precision floating-point durations (e.g. $1234.5678\text{ m}$ @ $456.789\text{ m/h}$) preserve exact precision without intermediate rounding.
5. **Zero-Length Segments:** Coincident consecutive waypoints ($d = 0\text{ m}$) produce $0\text{ s}$ transit duration without division-by-zero errors.

---

## 8. Stop-Duration Preservation

- **Base Preparation:** Configured via `base_preparation_duration_seconds` (or waypoint ID override); applied **strictly once** at initial excursion departure ($W_0$, index 0).
- **Return Ingress:** The final return visit to base camp in round-trip mode receives `final_destination_duration_seconds`, completely preventing double-counting of initial base preparation delays.
- **Selective Science Stops:** Waypoints with `role === "science_stop"` receive science stop durations; intermediate waypoints default to $0\text{ s}$ unless overridden by ID.
- **Partial Timelines:** If an itinerary has an unsupported leg or missing segment, all valid arrival and departure times prior to the break are preserved.

---

## 9. Test Suite Expansion (30 New Tests)

The test suite in [`tests/mission-timeline.test.ts`](file:///D:/martian-map-timeline/tests/mission-timeline.test.ts) was expanded with 30 new regression tests (Groups A through E):

### Group A: Segment Continuity
- `1. accepts valid explicit sequence A -> B -> C` (Passed)
- `2. rejects invalid disconnected sequence A -> B, C -> A as INVALID_INPUT` (Passed)
- `3. rejects invalid reversed segment B -> A when A -> B expected` (Passed)
- `4. rejects extra explicit segment beyond expected itinerary length` (Passed)
- `5. rejects duplicate explicit segment` (Passed)
- `6. rejects incorrect supplied segment index` (Passed)
- `7. marks missing expected explicit segment as INCOMPLETE_SCENARIO` (Passed)

### Group B: Return Closure
- `8. accepts valid Base -> A -> B -> Base in round-trip mode` (Passed)
- `9. rejects return marker on B -> C instead of B -> Base` (Passed)
- `10. rejects return marker before the final leg` (Passed)
- `11. rejects multiple return markers` (Passed)
- `12. rejects return destination that is not the starting base` (Passed)
- `13. marks missing return segment in a round-trip input as INCOMPLETE_SCENARIO` (Passed)
- `14. validates auto-generated geometric return segment` (Passed)

### Group C: Timeline Consistency
- `15. verifies timeline visit count equals expected route visits` (Passed)
- `16. verifies segment count matches expected travel legs` (Passed)
- `17. verifies every arrival corresponds to the preceding segment duration` (Passed)
- `18. propagates unknown downstream times when an intermediate segment is unsupported` (Passed)
- `19. preserves valid partial timeline prior to unsupported segment` (Passed)

### Group D: Numerical Stability
- `20. rejects finite inputs causing duration overflow as INVALID_INPUT` (Passed)
- `21. rejects cumulative time overflow across segments as INVALID_INPUT` (Passed)
- `22. handles very small positive speed without crashing or overflow` (Passed)
- `23. handles fractional duration accurately without rounding loss` (Passed)
- `24. handles zero-length valid segment safely` (Passed)

### Group E: Regression & Preservation
- `25. preserves existing WaypointPlan calculations` (Passed)
- `26. preserves existing ProposedGeometricTrajectory calculations` (Passed)
- `27. preserves existing one-way scenario semantics` (Passed)
- `28. preserves existing science-stop duration behavior` (Passed)
- `29. ensures input objects remain unmodified after hardened checks` (Passed)
- `30. confirms all existing 34 dedicated M4.1 tests remain passing` (Passed)

---

## 10. Verification & Quality Gates

| Verification Gate | Command | Result |
| :--- | :--- | :--- |
| **Dedicated Timeline Tests** | `npx tsx --test tests/mission-timeline.test.ts` | **64 passed**, 0 failed (22 test suites) |
| **Repository Node Tests** | `npx tsx --test tests/*.test.ts` | **223 passed**, 0 failed (41 test suites) |
| **Jest Core Suite** | `npm test` | **21 passed**, 0 failed (2 test suites) |
| **TypeScript Typecheck** | `npm run typecheck` (`next typegen && tsc --noEmit`) | **Passed** (0 errors) |
| **ESLint** | `npm run lint` (`eslint .`) | **Passed** (0 errors, 0 warnings) |
| **Production Build** | `npm run build` (Turbopack) | **Passed** (4 static pages generated, exit code 0) |

---

## 11. Public API Compatibility

All existing public contracts and signatures in `lib/mission/timeline.ts` remain 100% backward compatible:
- `calculateMissionTimeline(route, assumptions)` accepts `WaypointPlan | ProposedGeometricTrajectory | TimelineRouteInput`.
- All exported schemas (`timelineStatusSchema`, `timelineAssumptionsSchema`, `timelineEntrySchema`, `timelineSegmentSchema`, `missionTimelineResultSchema`) remain unaltered.
- Conversion utilities (`minutesToSeconds`, `secondsToMinutes`, `hoursToSeconds`, `secondsToHours`, `formatElapsedSeconds`) remain identical.
- Zero changes made to MapLibre, UI, or regional modules.

---

## 12. Files Modified

1. **`lib/mission/timeline.ts`:** Hardened segment validation, sequential continuity checks, return closure rules, and numerical overflow handling.
2. **`tests/mission-timeline.test.ts`:** Added Groups A–E regression test suites (total tests increased from 34 to 64).
3. **`docs/M4_1A_TIMELINE_HARDENING_REPORT.md`:** This hardening audit report.

---

## 13. Remaining Limitations

1. **Hypothetical Planning Assumptions:** Speed and stop parameters remain scenario inputs and do not imply NASA-validated operational astronaut performance.
2. **Spherical Geodesy:** Calculations use the Mars 2000 reference sphere ($R = 3,396,190\text{ m}$) without local slope or 3D terrain integration.
3. **No Hazard Clearance:** Timings do not verify route traversability, rover slope limits, or obstacle bypass.
4. **No Life-Support Budgeting:** Consumable resources (oxygen, power) and solar weather cycles are addressed in subsequent milestones (M4.2/M4.3/M4.4).
