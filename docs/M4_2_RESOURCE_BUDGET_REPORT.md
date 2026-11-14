# Marswalk Planner — M4.2 Deterministic Mission Resource Budgeting Engine Report

**Milestone:** M4.2 — Deterministic Mission Oxygen and Battery Resource Budgeting Engine  
**Module:** `lib/mission/resource-budget.ts`  
**Test Suite:** `tests/mission-resource-budget.test.ts`  
**Dedicated Branch:** `feat/mission-resource-budget`  
**Worktree:** `D:\martian-map-resource-budget`  
**Verified Baseline M4.1A Commit:** `f67505c718e529450e888b6aad8cd082609e9943`  
**Status:** Verification Complete & Fully Tested  

---

## Mandatory Scientific Disclaimer

> [!WARNING]
> **CRITICAL SCIENTIFIC RESTRICTIONS & SCOPE LIMITATIONS**
> 
> - All oxygen mass consumption rates ($g/\text{hour}$) and electrical power requirements ($W$) computed by this engine are **purely configurable hypothetical planning assumptions**.
> - These values are **NOT certified or validated** for any operational NASA spacesuit architecture (such as the Apollo A7L, Shuttle EMU, Constellation EVA suit, or Artemis xEMU).
> - Real spacesuit oxygen consumption depends heavily on individual astronaut metabolic rates, physical work intensity, respiratory quotient, spacesuit internal pressure, carbon-dioxide ($CO_2$) scrubbing loop efficiency, and emergency secondary oxygen pack (SOP) reserve architectures.
> - Real spacesuit electrical energy consumption depends on active thermal control loops (sublimators/radiators and liquid cooling garments), avionics, sensor heaters, radio communications, biotelemetry, helmet cameras, display heads-up units, and maximum safe battery depth of discharge (DoD).
> - **Arithmetic compliance (`WITHIN_CONFIGURED_BUDGET`) indicates solely that the user's hypothetical numbers do not exceed the user's hypothetical capacity and reserve.**
> - **This engine does NOT certify operational EVA safety, astronaut survivability, terrain traversability, slope impedance, thermal comfort, radiation exposure, or mission feasibility.**
> - **There is strictly no default "NASA astronaut" profile.** Every calculation parameter must be supplied explicitly by the user or an audited planning fixture.

---

## 1. Milestone Objective

Milestone **M4.2** implements a deterministic, pure TypeScript mission resource budgeting engine for the Marswalk Planner (NASA Space Apps Challenge 2026).

Building directly upon the verified M4.1/M4.1A deterministic mission timeline foundation, this module estimates:
1. Hypothetical oxygen mass consumption across travel and stationary periods.
2. Hypothetical electrical energy consumption across travel and stationary periods.
3. Total mission consumable usage, remaining inventory, and remaining margin after mandatory reserve deduction.
4. Independent subsystem status evaluations (`oxygen` and `battery`).
5. Discrete, chronological stage-by-stage consumable breakdowns that reconcile with full-mission totals.
6. Disciplined classification of missing assumptions, incomplete route plans, and invalid mathematical inputs.

---

## 2. Git Starting Commit and Branch Isolation

- **Remote Repository:** `https://github.com/KaungSet178/Martian-Map`
- **Starting Point:** Hardened M4.1A commit `f67505c718e529450e888b6aad8cd082609e9943` on `feat/mission-timeline`.
- **Dedicated Feature Branch:** `feat/mission-resource-budget`
- **Dedicated Local Worktree:** `D:\martian-map-resource-budget`
- **Branch Protection & Non-Interference:**
  - Zero modification to `main`, `feat/gale-map`, `feat/mission-timeline`, `feat/gale-terrain-expansion` (G4), `feat/gale-color-basemap` (G5), or weather branches.
  - Zero interference with concurrent Codex integration or regional map tasks.
  - Clean fast-forward git history without rebasing or force-pushing.

---

## 3. Existing Architecture Reused

Milestone M4.2 reuses and integrates with the existing Marswalk architecture:
1. **`MissionTimelineResult` (`lib/mission/timeline.ts`):**
   - Ingests the complete timeline result from M4.1/M4.1A, including `total_travel_seconds`, `total_stop_seconds`, `total_mission_seconds`, ordered `timeline` stops, and ordered `segments`.
   - Preserves timeline scenario statuses (`COMPLETE_SCENARIO`, `INCOMPLETE_SCENARIO`, `INVALID_INPUT`).
2. **`MarsWaypoint` & `TrajectoryMode` (`lib/mission/waypoint-planning.ts`):**
   - Respects waypoint roles (`base`, `science_stop`, `intermediate`, `destination`, `recovery_endpoint`) and one-way vs. round-trip mode semantics.
3. **Region Independence:**
   - Functions identically across Gale Crater, Jezero Crater, and Oxia Planum without regional hardcoding.

---

## 4. Input Model Contract

The input model contract is defined in [`lib/mission/resource-budget.ts`](file:///D:/martian-map-resource-budget/lib/mission/resource-budget.ts):

```typescript
export interface OxygenBudgetAssumptions {
  readonly capacity_g?: number | null;
  readonly travel_rate_g_per_hour?: number | null;
  readonly stop_rate_g_per_hour?: number | null;
  readonly reserve_g?: number | null;
}

export interface BatteryBudgetAssumptions {
  readonly capacity_wh?: number | null;
  readonly travel_power_w?: number | null;
  readonly stop_power_w?: number | null;
  readonly reserve_wh?: number | null;
}

export interface ResourceBudgetInput {
  readonly timeline: MissionTimelineResult;
  readonly oxygen?: OxygenBudgetAssumptions | null;
  readonly battery?: BatteryBudgetAssumptions | null;
}
```

### Key Input Characteristics
- **Explicit Physical Units:** All parameter names explicitly state their unit (`capacity_g`, `travel_rate_g_per_hour`, `capacity_wh`, `travel_power_w`, etc.).
- **Missing vs. Zero:** A missing value is represented as `null` or `undefined`. `0` is a valid user-configured assumption (e.g., zero reserve or zero consumption).
- **Independent Provision:** The caller may supply oxygen alone, battery alone, both, or neither.

---

## 5. Output Model Contract

The result contract provides full transparency, independent subsystem classifications, and stage breakdowns:

```typescript
export type ResourceAssessmentStatus =
  | "WITHIN_CONFIGURED_BUDGET"
  | "EXCEEDS_CONFIGURED_BUDGET"
  | "INSUFFICIENT_DATA"
  | "INVALID_INPUT";

export interface OxygenBudgetResult {
  readonly travel_used_g: number | null;
  readonly stationary_used_g: number | null;
  readonly total_used_g: number | null;
  readonly remaining_g: number | null; // Unclamped; negative when capacity exceeded
  readonly remaining_after_reserve_g: number | null; // Unclamped; negative when reserve infringed
  readonly status: ResourceAssessmentStatus;
}

export interface BatteryBudgetResult {
  readonly travel_used_wh: number | null;
  readonly stationary_used_wh: number | null;
  readonly total_used_wh: number | null;
  readonly remaining_wh: number | null; // Unclamped; negative when capacity exceeded
  readonly remaining_after_reserve_wh: number | null; // Unclamped; negative when reserve infringed
  readonly status: ResourceAssessmentStatus;
}

export interface ResourceStageEntry {
  readonly stage_index: number;
  readonly stage_type: "TRAVEL" | "STATIONARY";
  readonly reference_id: string; // Waypoint ID or origin->destination leg key
  readonly start_elapsed_seconds: number | null;
  readonly end_elapsed_seconds: number | null;
  readonly duration_seconds: number;
  readonly oxygen_used_g: number | null;
  readonly battery_used_wh: number | null;
}

export interface ResourceBudgetResult {
  readonly status: ResourceAssessmentStatus;
  readonly oxygen: OxygenBudgetResult;
  readonly battery: BatteryBudgetResult;
  readonly stages: ResourceStageEntry[];
  readonly warnings: string[];
  readonly scientific_disclaimer: string;
}
```

---

## 6. Oxygen Accounting Formulas

Given timeline durations converted to decimal hours:
$$\Delta t_{\text{travel, hr}} = \frac{T_{\text{travel, sec}}}{3600}, \quad \Delta t_{\text{stop, hr}} = \frac{T_{\text{stop, sec}}}{3600}$$

The oxygen mass calculations proceed deterministically:
1. **Travel Oxygen Consumption:**
   $$m_{\text{O}_2, \text{travel}} = \Delta t_{\text{travel, hr}} \times \dot{m}_{\text{O}_2, \text{travel}} \quad [g]$$
2. **Stationary Oxygen Consumption:**
   $$m_{\text{O}_2, \text{stop}} = \Delta t_{\text{stop, hr}} \times \dot{m}_{\text{O}_2, \text{stop}} \quad [g]$$
3. **Total Mission Oxygen Usage:**
   $$m_{\text{O}_2, \text{total}} = m_{\text{O}_2, \text{travel}} + m_{\text{O}_2, \text{stop}} \quad [g]$$
4. **Remaining Oxygen Mass:**
   $$m_{\text{O}_2, \text{remaining}} = C_{\text{O}_2} - m_{\text{O}_2, \text{total}} \quad [g]$$
5. **Remaining Oxygen After Reserve:**
   $$m_{\text{O}_2, \text{after reserve}} = m_{\text{O}_2, \text{remaining}} - R_{\text{O}_2} \quad [g]$$

---

## 7. Battery Electrical Energy Accounting Formulas

With power draw $\bar{P}$ in watts ($W$) and duration in hours:
1. **Travel Electrical Energy Consumption:**
   $$E_{\text{bat, travel}} = \Delta t_{\text{travel, hr}} \times \bar{P}_{\text{travel}} \quad [\text{Wh}]$$
2. **Stationary Electrical Energy Consumption:**
   $$E_{\text{bat, stop}} = \Delta t_{\text{stop, hr}} \times \bar{P}_{\text{stop}} \quad [\text{Wh}]$$
3. **Total Mission Electrical Energy Usage:**
   $$E_{\text{bat, total}} = E_{\text{bat, travel}} + E_{\text{bat, stop}} \quad [\text{Wh}]$$
4. **Remaining Usable Electrical Energy:**
   $$E_{\text{bat, remaining}} = C_{\text{bat}} - E_{\text{bat, total}} \quad [\text{Wh}]$$
5. **Remaining Electrical Energy After Reserve:**
   $$E_{\text{bat, after reserve}} = E_{\text{bat, remaining}} - R_{\text{bat}} \quad [\text{Wh}]$$

---

## 8. Unit Conventions

Physical units are strictly maintained and never conflated:
- **Oxygen Inventory & Reserves:** Grams ($g$). No unsupported conversion to tank pressure (psi/bar) or volume (liters) is performed.
- **Oxygen Consumption Rates:** Grams per hour ($g/\text{hour}$).
- **Electrical Energy:** Watt-hours ($\text{Wh}$). Energy is kept distinct from instantaneous power ($W$).
- **Electrical Power Draw:** Watts ($W$).
- **Timeline Elapsed Time:** Seconds ($s$) internally; converted using $1\text{ hr} = 3600\text{ s}$.

---

## 9. Reserve Handling & Negative Margins

- **Unclamped Diagnostics:** When consumption exceeds capacity or infringes on the configured reserve, remaining values are **NOT clamped to zero**. Negative values are preserved (e.g., $m_{\text{O}_2, \text{after reserve}} = -30.0\text{ g}$) as essential diagnostic information for mission planners.
- **Boundary Verification:** Exactly meeting capacity and reserve ($m_{\text{O}_2, \text{after reserve}} = 0$) evaluates to `WITHIN_CONFIGURED_BUDGET`.
- **Zero Reserves:** Setting reserve to $0$ is explicitly supported and represents a non-reserve margin baseline.

---

## 10. Stage-Level Resource Estimation

The mission itinerary is partitioned chronologically into alternating stages:
1. **`STATIONARY` Stages:** Base camp preparation (stop 0), intermediate waypoint stops, science investigation stops, and destination/recovery wait periods.
2. **`TRAVEL` Stages:** Active geodesic transit along each supported route segment.

### Stage Rules
- **Non-Duplication:** Each stationary period and each travel leg is represented exactly once.
- **Prefix Truncation:** If a segment is unsupported or has indeterminate duration, stage generation halts immediately before the unsupported leg. Downstream stops with unknown arrival times are never assigned synthetic stages.
- **Reconciliation:** The sum of all stage oxygen usage and stage battery usage reconciles with full-mission totals within floating-point tolerance ($\epsilon < 10^{-6}$).

---

## 11. Missing-Data & Incomplete-Timeline Behavior

- **Missing Parameters (`null`):** If capacity is null, usage is computed if rates are present, but remaining amounts are `null` and status is `INSUFFICIENT_DATA`.
- **Independent Subsystem Reporting:** If oxygen assumptions are complete but battery assumptions are omitted:
  - `oxygen.status`: `WITHIN_CONFIGURED_BUDGET` (or `EXCEEDS_CONFIGURED_BUDGET`)
  - `battery.status`: `INSUFFICIENT_DATA`
  - `status` (overall): `INSUFFICIENT_DATA` (preserving subsystem integrity while indicating incomplete combined assessment).
- **Incomplete Timeline (`INCOMPLETE_SCENARIO`):**
  - Full-mission usage and remaining amounts evaluate to `null`.
  - Overall status evaluates to `INSUFFICIENT_DATA`.
  - Chronological stages for the verified prefix are retained with partial usage.

---

## 12. Invalid-Input & Numerical Safety

The engine validates all numbers and fails safely to `INVALID_INPUT` without throwing uncaught exceptions:
- **Negative Rejection:** Negative capacities, reserves, or rates evaluate to `INVALID_INPUT`.
- **Non-Finite Protection:** `NaN`, `Infinity`, and `-Infinity` evaluate to `INVALID_INPUT`.
- **Integer Ceiling Safeguard:** Values exceeding JavaScript `Number.MAX_SAFE_INTEGER` ($9.007 \times 10^{15}$) evaluate to `INVALID_INPUT`.
- **Small-Rate Stability:** Positive fractional rates as low as $0.0001\text{ g/h}$ are accurately processed without numerical underflow.

---

## 13. Example Hypothetical Scenario

```typescript
const result = calculateResourceBudget({
  timeline: completeMissionTimeline,
  oxygen: {
    capacity_g: 1000,
    travel_rate_g_per_hour: 60,
    stop_rate_g_per_hour: 40,
    reserve_g: 200,
  },
  battery: {
    capacity_wh: 500,
    travel_power_w: 100,
    stop_power_w: 50,
    reserve_wh: 100,
  },
});
```

For a 2.0-hour travel and 1.5-hour stop itinerary:
- $m_{\text{O}_2, \text{travel}} = 2.0 \times 60 = 120\text{ g}$
- $m_{\text{O}_2, \text{stop}} = 1.5 \times 40 = 60\text{ g}$
- $m_{\text{O}_2, \text{total}} = 180\text{ g}$
- $m_{\text{O}_2, \text{remaining}} = 820\text{ g}$
- $m_{\text{O}_2, \text{after reserve}} = 620\text{ g}$
- `status`: `"WITHIN_CONFIGURED_BUDGET"`

---

## 14. Automated Test Results

The dedicated automated test suite in [`tests/mission-resource-budget.test.ts`](file:///D:/martian-map-resource-budget/tests/mission-resource-budget.test.ts) covers 44 test cases across 6 groups:

| Test Group | Focus Area | Result |
| :--- | :--- | :--- |
| **Group A (Tests 1–7)** | Basic travel, stop, combined consumption, remaining, and reserve calculations | **7 passed** / 0 failed |
| **Group B (Tests 8–15)** | Boundary conditions: exact capacity/reserve, budget exceedances, zero rates, zero reserves, fractional math | **8 passed** / 0 failed |
| **Group C (Tests 16–22)** | Missing inputs: capacity, rates, power, reserves, independent subsystem preservation | **7 passed** / 0 failed |
| **Group D (Tests 23–30)** | Timeline integrity: one-way, round-trip, return leg accounting, unsupported leg truncation, non-duplication | **8 passed** / 0 failed |
| **Group E (Tests 31–37)** | Numerical protection: negative values, non-finite values, MAX_SAFE_INTEGER overflow, small rates, large scenarios | **7 passed** / 0 failed |
| **Group F (Tests 38–44)** | Engineering integrity: region-independence, determinism, immutability, stage reconciliation, disclaimers, unit formatters | **7 passed** / 0 failed |
| **Total Dedicated Tests** | `npx tsx --test tests/mission-resource-budget.test.ts` | **44 passed** / 0 failed |

### Quality Gate Summary

- **M4.2 Dedicated Suite:** `44 passed`, 0 failed (6 suites).
- **M4.1/M4.1A Timeline Suite:** `64 passed`, 0 failed (22 suites).
- **Complete Node Test Suite:** `267 passed`, 0 failed (47 suites).
- **Vitest Test Suite:** `21 passed`, 0 failed (2 suites).
- **TypeScript Typecheck (`npm run typecheck`):** Clean (0 errors).
- **ESLint Code Quality (`npm run lint`):** Clean (0 errors, 0 warnings).
- **Production Turbopack Build (`npm run build`):** Succeeded in 7.4s (exit code 0).

---

## 15. Repository Changes

- **Added:** `lib/mission/resource-budget.ts` (Deterministic resource budgeting module)
- **Added:** `tests/mission-resource-budget.test.ts` (44 comprehensive unit tests)
- **Added:** `docs/M4_2_RESOURCE_BUDGET_REPORT.md` (Engineering specification and verification report)
- **Updated:** `tests/mission-timeline.test.ts` (Removed unused variable `wC` to ensure zero ESLint warnings)

---

## 16. Recommended Scope for Next Milestone (M4.3)

With M4.1/M4.1A (deterministic timeline) and M4.2 (deterministic resource budgeting) complete:
- **Phase M4.3:** Candidate mission feasibility classification framework, synthesizing geometric distance, duration, terrain relief indicators, and resource margin thresholds into transparent pre-mission planning advisories.
- **Frontend Planning Dashboard:** Surface timeline stages, resource depletion bars, and reserve warning cards in the planner UI.
