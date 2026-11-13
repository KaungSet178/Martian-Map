# Mars Waypoint Planning UI Components — Technical & Verification Report

**Milestone:** M2.2 — Isolated Waypoint UI Components  
**Module(s):**  
- `components/mission/waypoint-editor.tsx`  
- `components/mission/waypoint-itinerary.tsx`  
- `app/globals.css` (supplementary styling block)  
**Test Suite:** `tests/waypoint-ui.test.ts` (21 tests, 129 total regression suite)  
**Status:** Implemented, verified, strictly typed, production-built  
**Branch:** `feat/marswalk-waypoints` in `D:\martian-map-antigravity`  
**Revision:** Milestone M2.2  

---

## 1. Executive Summary

Milestone M2.2 delivers independent, accessible, and pure React UI components for the **Marswalk Planner** surface waypoint planning interface. Building upon the verified M1 Geodesy library (`lib/map/geodesy.ts`), M2 Waypoint Planning Engine (`lib/mission/waypoint-planning.ts`), and M2.1 Integration Design (`docs/MARS_WAYPOINT_UI_INTEGRATION_PLAN.md`), these components provide the full interactive presentation and editing layer for Mars surface mission itineraries.

### Strict Scope & Architecture Adherence
- **Zero Production Mounting:** The components remain completely isolated and are not mounted into the production `Planner` or `MapWorkspace`, preserving undisturbed operation while OpenAI Codex continues investigating Gale DEM co-registration.
- **Pure Component Architecture:** All components receive data strictly through typed props and communicate modifications through callbacks. They contain zero direct dependencies on `localStorage`, MapLibre map instances, global state, regional datasets, or DEM processing.
- **Scientific Safeguards:** The interface explicitly distinguishes user-defined hypothetical planning coordinates from audited NASA observations, avoids premature "safe/optimal" claims, and prominently presents the mandatory spherical Mars approximation disclaimer.

---

## 2. Implemented Components & API Catalog

### 2.1 `WaypointEditor` (`components/mission/waypoint-editor.tsx`)

The top-level planning container responsible for plan metadata, trajectory mode selection, real-time validation notices, origin/destination management, and action triggers.

```typescript
export interface WaypointEditorProps {
  /** The active immutable waypoint plan. */
  plan: WaypointPlan;
  /** Display name of the active exploration region (optional context). */
  regionName?: string;
  /** Whether the editor is in read-only mode. */
  readOnly?: boolean;
  /** Whether the interactive map placement tool is currently armed. */
  isPlacingOnMap?: boolean;
  /** Optional ID of the waypoint currently undergoing inline label editing. */
  editingWaypointId?: string | null;
  /** Callback invoked when the user updates the plan title. */
  onPlanNameChange?: (name: string) => void;
  /** Callback invoked when the trajectory mode toggles between round_trip and one_way. */
  onModeChange?: (mode: TrajectoryMode, recoveryAssumption?: string) => void;
  /** Callback invoked when the recovery assumption text changes. */
  onRecoveryAssumptionChange?: (recoveryAssumption: string) => void;
  /** Callback invoked when a waypoint is added. */
  onWaypointAdd?: (waypoint: MarsWaypoint, index?: number) => void;
  /** Callback invoked when a waypoint is removed by ID. */
  onWaypointRemove?: (waypointId: string) => void;
  /** Callback invoked when a waypoint is moved up or down. */
  onWaypointMove?: (waypointId: string, delta: number) => void;
  /** Callback invoked when a waypoint's attributes are patched. */
  onWaypointUpdate?: (waypointId: string, patch: Partial<MarsWaypoint>) => void;
  /** Callback invoked when a waypoint label edit begins. */
  onStartEditing?: (waypointId: string) => void;
  /** Callback invoked when a waypoint label edit finishes/cancels. */
  onStopEditing?: () => void;
  /** Callback invoked when a waypoint is promoted to origin base camp. */
  onSetOrigin?: (waypoint: MarsWaypoint) => void;
  /** Callback invoked when a waypoint is designated as destination terminus. */
  onSetDestination?: (waypoint: MarsWaypoint) => void;
  /** Callback requesting the parent container to arm/disarm map placement. */
  onRequestMapPlacement?: () => void;
  /** Callback requesting navigation to the science catalog. */
  onExploreScience?: () => void;
}
```

### 2.2 `WaypointItinerary` (`components/mission/waypoint-itinerary.tsx`)

A focused, accessible list renderer for ordered waypoints, inter-segment geodesic distances, initial forward bearings, return closure legs, and cumulative trajectory metrics.

```typescript
export interface WaypointItineraryProps {
  /** The active immutable waypoint plan. */
  plan: WaypointPlan;
  /** Whether the itinerary is in read-only mode. */
  readOnly?: boolean;
  /** Optional ID of the waypoint currently undergoing inline label editing. */
  editingWaypointId?: string | null;
  /** Callback invoked when a waypoint is removed by ID. */
  onWaypointRemove?: (waypointId: string) => void;
  /** Callback invoked when a waypoint position moves by delta (+1 or -1). */
  onWaypointMove?: (waypointId: string, delta: number) => void;
  /** Callback invoked when a waypoint's attributes are patched. */
  onWaypointUpdate?: (waypointId: string, patch: Partial<MarsWaypoint>) => void;
  /** Callback invoked when a waypoint label edit begins. */
  onStartEditing?: (waypointId: string) => void;
  /** Callback invoked when a waypoint label edit finishes/cancels. */
  onStopEditing?: () => void;
  /** Callback invoked when a waypoint is promoted to origin base camp. */
  onSetOrigin?: (waypoint: MarsWaypoint) => void;
  /** Callback invoked when a waypoint is designated as destination terminus. */
  onSetDestination?: (waypoint: MarsWaypoint) => void;
  /** Callback invoked when the user requests science target selection. */
  onExploreScience?: () => void;
}
```

### 2.3 Supporting Formatting Helpers & Subcomponents

| Export | Signature | Purpose |
| :--- | :--- | :--- |
| `formatDistance` | `(meters: number): string` | Formats meters into metric notation (`X.X m` or `X.XX km (X,XXX m)`). |
| `formatBearing` | `(degrees: number): string` | Normalizes degrees $[0, 360)$ to 3-digit zero-padded azimuth strings (`042°`). Returns `"N/A"` for `NaN`. |
| `formatCoordinates` | `(coords: MarsCoordinate): string` | Formats signed planetocentric latitude and East-positive longitude (`-5.4000°, 137.8000° E`). |
| `roleDisplay` | `(role: WaypointRole): { label, icon }` | Returns standardized titles and Lucide icons for all 5 waypoint roles. |
| `WaypointProvenanceBadge` | `({ provenance }: { provenance: WaypointProvenance })` | Renders accessible, text-explicit provenance badges with descriptive tooltips. |

---

## 3. Interaction Behavior & Workflow

1. **Plan Metadata Management:**
   - Plan identifier/name field with validation feedback (`aria-invalid="true"` when empty).
   - Trajectory traversal mode segmented radio control toggling `round_trip` vs `one_way`.
2. **Real-Time Validation Presentation:**
   - Directly executes `validateWaypointPlan(plan)`.
   - Blocking errors (e.g. empty plan, missing destination in one-way mode, missing recovery note) appear in `.error-notice` with `role="alert"`.
   - Non-blocking advisory warnings (e.g. first stop not marked base, coincident waypoints) appear in `.warning-notice` with `role="status"`.
3. **Base Camp & Terminus Inspection:**
   - Origin status card displays coordinates, label, and provenance for the base camp at index 0.
   - One-way mode displays a dedicated destination status card and an active `recovery_assumption` textarea.
4. **Waypoint Itinerary Operations:**
   - Move Up ($\uparrow$) / Move Down ($\downarrow$) buttons dynamically reorder stops via `onWaypointMove(id, delta)`.
   - "Make Base" action button allows promoting any non-origin stop directly to index 0.
   - "Terminus" action button allows designating a stop as destination in one-way traverses.
   - Delete ($X$) button removes optional waypoints via `onWaypointRemove(id)`.
   - Inline rename tool allows editing waypoint labels with `Enter` (save) and `Escape` (cancel).
5. **Geodesic Trajectory Connectors:**
   - Inter-segment leg cards display forward bearing and surface distance calculated via Vincenty's spherical equation.
   - Round-trip plans automatically display a distinct dashed return closure card from $W_{n-1} \to W_0$.
6. **Cumulative Distance Breakdown:**
   - Outbound distance, return distance, and total surface distance displayed in tabular monospace format.
   - Guarantees float64 additive identity: $\text{total} \equiv \text{outbound} + \text{return}$.

---

## 4. Accessibility (a11y) & Usability Compliance

The components strictly adhere to WCAG 2.1 Level AA standards and the project's `DESIGN.md`:

- **Touch Target Dimensions:** All action buttons (`button`, `.file-button`, `.icon-button`, `.small-action-button`) enforce `min-height: 44px` or `min-height: 36px` with adequate padding to prevent touch overlap.
- **Keyboard Navigation:**
  - Full tab traversal through inputs, radio controls, action toolbar buttons, and individual waypoint controls.
  - Visible focus rings: `outline: 2px solid var(--color-route)` with `outline-offset: 2px`.
  - Accessible names: Every icon-only button contains an explicit, dynamic `aria-label` (e.g., `aria-label="Move Pahrump Hills Sample Site up"`).
- **Screen Reader Semantics:**
  - Ordered list utilizes `<ol className="itinerary" role="list">`.
  - Direction selection utilizes `<div className="segmented" role="radiogroup">`.
  - Error messages utilize `role="alert"`; advisory warnings utilize `role="status"`.
  - Stop sequence numbers announce as `Stop number N`.
- **Non-Color Dependence:**
  - Roles are distinguished by both distinctive glyphs (Home, Compass, Pin, Flag, Shield) and explicit text labels.
  - Provenance badges feature prominent text (`Observed · NASA Target`, `Scenario · User Waypoint`).
  - Validation states feature distinct icons (`AlertTriangle`, `Info`, `CheckCircle2`) and message lists.

---

## 5. Responsive Design Across Form Factors

The design was verified against responsive breakpoints in `app/globals.css`:

- **Desktop ($\ge 1024\text{ px}$):**
  - Renders comfortably in the $340\text{ px}$ planning side drawer.
  - Grid layout for distance metrics and scenario preferences.
- **Tablet Landscape ($768\text{ px} - 1023\text{ px}$):**
  - Compact vertical spacing with flex wrapping on toolbar buttons.
- **Mobile Narrow ($390\text{ px}$):**
  - All text and metrics wrap without horizontal scrolling (`overflow-x: hidden`).
  - Tabular coordinate figures (`IBM Plex Mono`) remain readable without truncation.
  - Buttons wrap into multi-line rows without clipping touch targets.

---

## 6. Scientific Labels & Uncertainty Governance

To maintain scientific integrity for the NASA Space Apps Challenge, the UI enforces strict terminological safeguards:

| Standard Scientific Phrase | Prohibited Claim | Rationale |
| :--- | :--- | :--- |
| **"Proposed geometric trajectory"** | "Safe route" / "Optimal route" | Route has not been cleared for rock hazards or steep slopes. |
| **"Spherical Mars approximation ($\mathcal{R} = 3{,}396{,}190\text{ m}$)"** | "NASA-certified traverse" | Great-circle chord distance only; does not integrate vertical relief. |
| **"Scenario · User Waypoint"** | "Surveyed NASA landmark" | User planning inputs are hypothetical scenarios. |
| **"Observed · NASA Target"** | "Verified astronaut destination" | Represents precursor orbital/rover science observation only. |
| **"Feasibility: Unverified"** | "Mission Feasible" / "Passes EVA limits" | No suit metabolic profiles or terrain slope models connected. |

---

## 7. Verification & Test Suite Summary

An automated test suite was created in `tests/waypoint-ui.test.ts` covering rendering, formatting, validation, and user interactions:

### Test Results Breakdown

| Suite | Tests | Result | Focus Areas |
| :--- | :--- | :--- | :--- |
| **Waypoint Formatting Helpers** | 4 | **PASS** | Sub-km/km distance scaling, bearing zero-padding, signed lat/lon coordinates, role labels. |
| **WaypointItinerary Component Rendering** | 7 | **PASS** | Empty state, ordered list, provenance badges, inter-segment legs, return closure leg, one-way suppression, distance summary, and scientific disclaimers. |
| **WaypointEditor Component Rendering & Validation** | 4 | **PASS** | Plan titles, direction radios, origin card, one-way destination/recovery error notices, advisory warning notices, map placement button. |
| **Waypoint Component Callback Interactions** | 6 | **PASS** | `onWaypointMove` up/down, `onWaypointRemove`, `onSetOrigin`, `onModeChange`, `onPlanNameChange`, `onRecoveryAssumptionChange`. |

### Full Project Regression Suite
- **Waypoint UI Tests:** 21 passed, 0 failed.
- **Waypoint Planning Engine Tests (M2):** 33 passed, 0 failed.
- **Mars Geodesy Tests (M1):** 56 passed, 0 failed.
- **Mission & Region Manifest Tests:** 19 passed, 0 failed.
- **Total Unit Tests:** **129 passed, 0 failed across 15 suites.**
- **TypeScript Typecheck:** Passed (`tsc --noEmit`, 0 errors).
- **ESLint:** Passed (`eslint .`, 0 errors, 0 warnings).
- **Next.js Production Build:** Passed (`next build`, 0 errors, static routes compiled).

---

## 8. Files Changed

1. [waypoint-itinerary.tsx](file:///D:/martian-map-antigravity/components/mission/waypoint-itinerary.tsx) — Created (454 lines).
2. [waypoint-editor.tsx](file:///D:/martian-map-antigravity/components/mission/waypoint-editor.tsx) — Created (387 lines).
3. [globals.css](file:///D:/martian-map-antigravity/app/globals.css) — Updated (+397 lines, appending `.waypoint-*` CSS tokens).
4. [waypoint-ui.test.ts](file:///D:/martian-map-antigravity/tests/waypoint-ui.test.ts) — Created (453 lines).
5. [MARS_WAYPOINT_UI_COMPONENTS_REPORT.md](file:///D:/martian-map-antigravity/docs/MARS_WAYPOINT_UI_COMPONENTS_REPORT.md) — Created (this document).

---

## 9. Integration Requirements (Phase M2.3 & M2.4)

When authorized to integrate these components into the interactive planner:

1. **State Ownership in `Planner` (`components/planner.tsx`):**
   - The top-level `Planner` component will instantiate an active `WaypointPlan` alongside `Mission`.
   - The bidirectional bridge (`planFromMission` / `missionFromPlan`) described in M2.1 will keep `mission.target_ids` synchronized for backward compatibility.
2. **Interactive Map Placement Hook (`useWaypointOverlay`):**
   - `onRequestMapPlacement` will arm crosshair placement on `MapWorkspace`.
   - Map canvas clicks will pass `fromDisplayCoordinates(e.lngLat)` to `createWaypoint` and `addWaypoint`.
3. **MapLibre Linework Rendering:**
   - `resampleTrajectory(trajectory, 250)` will populate a GeoJSON `LineString` layer (`trajectory-outbound` and `trajectory-return`).

---

## 10. Known Limitations

1. **Horizontal Great-Circle Distances Only:**  
   The segment distances displayed do not reflect 3D topographic slope relief. 3D DEM slope integration is reserved for Milestone M3 once Codex completes Gale co-registration.
2. **No Traversal Hazard Verification:**  
   The UI does not certify traversability across scarps, sand traps, or boulder fields.
3. **No Consumable Margin Depletion:**  
   Resource inputs (oxygen and battery reserves) are scenario preferences only; no metabolic burn rates or EVA duration limits are simulated.
