# Marswalk Planner — Milestone Report: Unified EVA Resource Estimation (Phase R1)

**Date:** 2026-11-15  
**Milestone:** R1 — Unified EVA Resource Planning System across Gale, Jezero, and Oxia  
**Branch:** `feat/unified-eva-resource-planner`  
**Worktree:** `D:\martian-map-eva-resources`  
**Baseline Verified SHA:** `818eeb85db67f0c2440e2acc47024b436e8a1526` (`origin/feat/environmental-conditions-integration`)  

---

## Executive Summary

Phase R1 implements a unified, evidence-based Extravehicular Activity (EVA) Resource Estimation engine for Marswalk Planner. The system computes route-based life-support requirements—**Oxygen provision (kg)**, **Electrical energy (Wh)**, **Cooling water (kg / L)**, and **Total EVA duration (hours / minutes)**—using verified NASA engineering baselines and historical mission flight telemetry.

### Core Scientific & Architectural Principles
1. **One Engine, Not Three:** A single mathematical calculation core (`lib/eva/estimate.ts`) handles resource estimation across Gale Crater, Jezero Crater, and Oxia Planum. Regional differences reflect input evidence and scientific uncertainty, not divergent physical or physiological algorithms.
2. **Strict Traceability & Evidence Integrity:** No NASA suit specifications, consumption rates, or physiological limits are fabricated. Every constant maps to an audited NASA technical publication (BVAD Rev 2, BVAD Rev 1, NASA-STD-3001, or Apollo PLSS flight telemetry) with document number, section/table, page, and scientific limitations.
3. **Decoupled Architecture:** Subsystem independence ensures missing data produces honest `UNAVAILABLE` or `ASSUMPTION-DEPENDENT` states rather than synthesized figures. For example, physiological standards that do not define spacesuit avionics electrical wattage leave battery consumption as `UNAVAILABLE`.
4. **Physiological vs. Electrical Boundary:** Astronaut metabolic heat dissipation (Watts) is strictly decoupled from spacesuit electrical power draw (Watts). Biological exertion is never converted into battery load.
5. **Cooling Fluid Distinction:** Consumptive thermal heat rejection (water vented via sublimator or membrane evaporator) is mathematically separated from internal non-consumptive Liquid Cooling Garment (LCG) loop recirculation flow (~1.5 L/min).
6. **Non-Operational Disclaimer:** All outputs are labeled as conditional planning estimates. No estimate implies NASA flight certification, spacesuit qualification, or astronaut safety approval.

---

## 1. Scope and Architecture

The unified resource planner is designed to seamlessly interface with existing mission waypoints and geometry, while remaining fully decoupled from MapLibre GL, browser DOM, and region-specific raster structures.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             REGIONAL ROUTE ADAPTERS                         │
│  Gale (terrain/geometric)    Jezero (terrain/geometric)    Oxia (geometric) │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼ (EVAResourceRouteInput)
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UNIFIED EVA TIMELINE ENGINE                       │
│    Duration = Travel Time + Science Stops + Other Work + Contingency Buffer │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼ (EVATimelineResult)
┌─────────────────────────────────────────────────────────────────────────────┐
│                     NASA LIFE-SUPPORT REFERENCE PROFILES                    │
│   BVAD Exploration Baseline · BVAD Radiator · Apollo 15–17 · NASA-STD-3001 │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     UNIFIED RESOURCE ESTIMATION CORE                        │
│   Oxygen Subsystem       Battery Subsystem        Cooling Subsystem         │
│   (Metabolic+Leakage)    (Electrical Load)       (Consumptive Loss)         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼ (EVAPlanResult)
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SHARED EVA RESOURCE UI PANEL                         │
│  Section A: Route Summary              Section B: Profile Selector          │
│  Section C: 4 Resource Cards           Section D: Planning Settings         │
│  Section E: Collapsible Scientific Explanation & Provenance                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Module File Layout
- `lib/eva/types.ts`: Normalized contracts (`EVAResourceRouteInput`, `EVAPlanResult`, `EVAReferenceProfile`, `EVAPlanningConfig`).
- `lib/eva/sources.ts`: Audited scientific data source registry containing citations for every numeric constant.
- `lib/eva/profiles.ts`: Extensible profile library (Apollo 15–17, BVAD Exploration, BVAD Radiator, NASA-STD-3001, User-Defined).
- `lib/eva/timeline.ts`: Pure timeline aggregation engine with double-count prevention.
- `lib/eva/oxygen.ts`: Metabolic and structural leakage oxygen model with capacity tracking.
- `lib/eva/battery.ts`: Electrical power load and battery energy model with capacity tracking.
- `lib/eva/cooling.ts`: Sublimator and closed-loop non-venting thermal rejection model.
- `lib/eva/estimate.ts`: Orchestration core assembling `EVAPlanResult`.
- `lib/eva/validation.ts`: Runtime Zod schemas for validation and persistence.
- `lib/eva/adapters/`:
  - `gale.ts`: Gale Crater adapter (terrain metrics or geometric fallback).
  - `jezero.ts`: Jezero Crater adapter (terrain metrics or geometric fallback).
  - `oxia.ts`: Oxia Planum adapter (geometric trajectory with transparent unmodeled-terrain disclosure, manual distance input support).
  - `index.ts`: Unified adapter factory `adaptMissionToEVARoute`.
- `components/eva/`:
  - `eva-resource-panel.tsx`: Primary unified EVA planning panel with live recalculation.
  - `resource-card.tsx`: Individual resource card displaying value, unit, status badge, capacity margin, and collapsible breakdown.
  - `profile-selector.tsx`: Engineering baseline selector with institution, tech, and limitation summaries.
  - `route-summary-section.tsx`: Route summary (distance, time, mode, geographic uncertainty).
  - `assumptions-panel.tsx`: Configurable planning allowances (reserves, walking speed, manual overrides).
  - `scientific-explanation.tsx`: Collapsible transparency section with formulas, active citations, and boundary notices.
  - `styles.ts`: Self-contained scoped stylesheet matching dark space-themed design.
- `tests/eva-resources.test.ts`: 20 unit tests covering math, boundaries, region parity, and persistence.
- `tests/browser/eva-resources.spec.ts`: 7 Playwright browser tests across Desktop (1440px), Tablet (768px), and Mobile (390px).

---

## 2. NASA Sources Researched

| Source ID | Document Title | Document Number | Publication Year | Author / Agency | URL |
|---|---|---|---|---|---|
| `BVAD-REV2-O2-METABOLIC` | Life Support Baseline Values and Assumptions Document (Rev 2) | NASA/TP-2015-218570/REV2 | 2022 | NASA Johnson Space Center (Ewert, Chen, Powell) | [NTRS Citation](https://ntrs.nasa.gov/citations/20210024855) |
| `BVAD-REV2-O2-LEAKAGE` | Life Support Baseline Values and Assumptions Document (Rev 2) | NASA/TP-2015-218570/REV2 | 2022 | NASA Johnson Space Center (Ewert, Chen, Powell) | [NTRS Citation](https://ntrs.nasa.gov/citations/20210024855) |
| `BVAD-REV2-POWER-EXPLORATION` | Life Support Baseline Values and Assumptions Document (Rev 2) | NASA/TP-2015-218570/REV2 (Unspecified) | 2022 | NASA Johnson Space Center | [NTRS Citation](https://ntrs.nasa.gov/citations/20210024855) |
| `BVAD-REV2-BATTERY-CAPACITY` | Life Support Baseline Values and Assumptions Document (Rev 2) | NASA/TP-2015-218570/REV2 (Unspecified) | 2022 | NASA Johnson Space Center | [NTRS Citation](https://ntrs.nasa.gov/citations/20210024855) |
| `BVAD-REV2-WATER-SWME` | Life Support Baseline Values and Assumptions Document (Rev 2) | NASA/TP-2015-218570/REV2 | 2022 | NASA Johnson Space Center (Ewert, Chen, Powell) | [NTRS Citation](https://ntrs.nasa.gov/citations/20210024855) |
| `BVAD-REV2-WATER-CLOSED-LOOP` | Life Support Baseline Values and Assumptions Document (Rev 2) | NASA/TP-2015-218570/REV2 | 2022 | NASA Johnson Space Center (Ewert, Chen, Powell) | [NTRS Citation](https://ntrs.nasa.gov/citations/20210024855) |
| `BVAD-REV2-MAX-DURATION` | Life Support Baseline Values and Assumptions Document (Rev 2) | NASA/TP-2015-218570/REV2 | 2022 | NASA Johnson Space Center (Ewert, Chen, Powell) | [NTRS Citation](https://ntrs.nasa.gov/citations/20210024855) |
| `APOLLO15-O2-METABOLIC` | Apollo Experience Report: Development of the EMU | NASA TN D-8093 | 1975 | NASA Johnson Space Center (Lutz et al.) | [NTRS Citation](https://ntrs.nasa.gov/citations/19760003073) |
| `APOLLO15-O2-LEAKAGE` | Apollo Operations Handbook: EMU (Apollo 15–17) | CSD-A-096 | 1971 | NASA MSC Crew Systems Division | NASA Historical Archive |
| `APOLLO15-O2-CAPACITY` | Apollo Experience Report: Development of the EMU | NASA TN D-8093 | 1975 | NASA Johnson Space Center (Lutz et al.) | [NTRS Citation](https://ntrs.nasa.gov/citations/19760003073) |
| `APOLLO15-POWER-DRAW` | Apollo Experience Report: Development of the EMU | NASA TN D-8093 | 1975 | NASA Johnson Space Center (Lutz et al.) | [NTRS Citation](https://ntrs.nasa.gov/citations/19760003073) |
| `APOLLO15-BATTERY-CAPACITY` | Apollo Operations Handbook: EMU (Apollo 15–17) / Apollo Experience Report | CSD-A-096 / NASA TN D-8093 | 1971 | NASA MSC Crew Systems Division | [NTRS Citation](https://ntrs.nasa.gov/citations/19760003073) |
| `APOLLO15-WATER-SUBLIMATOR` | Apollo Experience Report: Development of the EMU | NASA TN D-8093 | 1975 | NASA Johnson Space Center (Lutz et al.) | [NTRS Citation](https://ntrs.nasa.gov/citations/19760003073) |
| `APOLLO15-WATER-CAPACITY` | Apollo Operations Handbook: EMU (Apollo 15–17) | CSD-A-096 | 1971 | NASA MSC Crew Systems Division | NASA Historical Archive |
| `APOLLO15-MAX-DURATION` | Apollo Experience Report: Development of the EMU | NASA TN D-8093 | 1975 | NASA Johnson Space Center (Lutz et al.) | [NTRS Citation](https://ntrs.nasa.gov/citations/19760003073) |
| `NASA-STD-3001-O2-METABOLIC` | NASA Space Flight Human-System Standard, Vol 2 | NASA-STD-3001 Vol 2 Rev D | 2023 | NASA OCHMO | [NASA Standards](https://www.nasa.gov/reference/11-0-spacesuits-vol-2/) |
| `NASA-STD-3001-O2-LEAKAGE` | NASA Space Flight Human-System Standard, Vol 2 | NASA-STD-3001 Vol 2 Rev D | 2023 | NASA OCHMO | [NASA Standards](https://www.nasa.gov/reference/11-0-spacesuits-vol-2/) |
| `NASA-STD-3001-MAX-DURATION` | NASA Space Flight Human-System Standard, Vol 2 | NASA-STD-3001 Vol 2 Rev D | 2023 | NASA OCHMO | [NASA Standards](https://www.nasa.gov/reference/4-0-human-performance/) |
| `NASA-STD-3001-RESERVE` | NASA Space Flight Human-System Standard, Vol 2 | NASA-STD-3001 Vol 2 Rev D | 2023 | NASA OCHMO | [NASA Standards](https://www.nasa.gov/reference/11-0-spacesuits-vol-2/) |

---

## 3. Audited Reference Values & Technical Provenance

### Metabolic & Gas Supply Subsystem
- **Nominal EVA Metabolic Rate:** $295\text{ W}$ ($1.06\text{ MJ/CM-h}$ or $\sim 1000\text{ BTU/h}$). Source: BVAD Rev 2, Table 4.1.
- **Metabolic $\text{O}_2$ Consumption Rate:** $0.076\text{ kg/CM-h}$. Source: BVAD Rev 2, Table 4.1 & Table 4-42. (Note: The $0.0829\text{ kg/h}$ figure occasionally cited originates from an erroneous unit confusion dividing $1.99\text{ lb/day}$ by 24 hours assuming kg; $0.076\text{ kg/h}$ is the true BVAD hourly EVA rate).
- **Apollo Lunar Traverses Average $\text{O}_2$ Consumption:** $0.077\text{ kg/h}$ ($0.170\text{ lb/hr}$). Source: NASA TN D-8093, Table III. Converted from imperial mass ($0.170 \times 0.45359237$).
- **Allowable Suit Structural Gas Leakage:** $0.005\text{ kg/h}$ (BVAD Rev 2 Table 4.1) / $0.008\text{ kg/h}$ ($\le 100\text{ sccm}$ at $4.3\text{ psid}$, NASA-STD-3001 Vol 2 Sec 11.2).

### Electrical Power & Energy Subsystem
- **Modern Exploration PLSS Power Draw:** Unspecified in BVAD Rev 2. General exploration architecture studies estimate $\sim 100\text{ W}$ to $140\text{–}150\text{ W}$. Because BVAD does not document an electrical power standard, baseline profile sets power to `null` (reported as `UNAVAILABLE`), allowing user manual planning entry.
- **Apollo 15–17 -7 PLSS Electrical Power Draw:** $58.0\text{ W}$ measured flight telemetry average across lunar traverses ($3.45\text{ A}$ at $16.8\text{ V dc}$). Source: NASA TN D-8093, Table III.
- **Exploration Spacesuit Battery Capacity:** Unspecified in BVAD Rev 2. Sizing allocations ($1,000\text{ Wh}$ usable / $1,200\text{ Wh}$ gross) from advanced lightweight studies are treated as unverified assumptions; profile default is `null` (reported as `CAPACITY-UNKNOWN`) to allow user input.
- **Apollo 15–17 Silver-Zinc Battery Usable Capacity:** $390.0\text{ Wh}$ usable operational flight qualification rating ($21.4\text{ Ah}$ minimum capability, $360\text{ Wh}$ nominal at $16.8\text{ V}$). Source: CSD-A-096 Section 2.1.4 and NASA TN D-8093. (Note: $279\text{–}315\text{ Wh}$ applied to the earlier Apollo 11–14 -6 PLSS).

### Thermal Control & Consumptive Cooling Subsystem
- **Spacesuit Water Membrane Evaporator (SWME) Loss Rate:** $0.57\text{ kg/CM-h}$ ($0.57\text{ L/h}$ at standard water density $\rho = 1.0\text{ kg/L}$). Source: BVAD Rev 2, Table 4.1. (Note: $0.44\text{ kg/h}$ reflects experimental partial-load test conditions; $0.57\text{ kg/h}$ is the standardized baseline table rate).
- **Apollo Porous Plate Sublimator Loss Rate:** $0.57\text{ kg/h}$ ($1.25\text{ lb/hr}$). Source: NASA TN D-8093, Table III. Converted from imperial mass ($1.25 \times 0.45359237 = 0.567\text{ kg/h}$).
- **Non-Venting Regenerable Radiator Loss Rate:** $0.00\text{ kg/h}$ (closed regenerative loop). Source: BVAD Rev 2, Section 5.2.3.
- **Apollo 15–17 Feedwater Tank Capacity:** $5.22\text{ kg}$ ($11.5\text{ lb}$ total across primary and auxiliary bladders). Source: CSD-A-096, Section 2.1.3.

---

## 4. Spacesuit Reference Profile Library

| Profile ID | Profile Name | Profile Type | Applicable Tech | Environment | $\text{O}_2$ Rate ($\text{kg/h}$) | Power ($\text{W}$) | Battery ($\text{Wh}$) | Water Rate ($\text{kg/h}$) | Max Duration |
|---|---|---|---|---|---|---|---|---|---|
| `bvad-exploration-baseline` | NASA Life Support BVAD Rev 2 Exploration Reference | `nasa-engineering-reference` | xEMU / SWME Evaporator | Surface EVA | $0.076 + 0.005$ | `null` | `null` | $0.57$ | $8.0\text{ h}$ |
| `bvad-closed-loop-radiator` | NASA Life Support BVAD Rev 2 Non-Venting Radiator | `nasa-engineering-reference` | Regenerative Radiator / PCM | Surface EVA | $0.076 + 0.005$ | `null` | `null` | $0.00$ | $8.0\text{ h}$ |
| `apollo-15-plss` | Apollo 15–17 PLSS (A7LB / -7 PLSS) | `historical-hardware` | Apollo EMU / Sublimator | Lunar Vacuum | $0.077 + 0.008$ | $58.0$ | $390.0$ | $0.57$ | $7.5\text{ h}$ |
| `nasa-std-3001-nominal` | NASA-STD-3001 Vol 2 Human Performance | `nasa-engineering-reference` | Physiological Standard | Surface EVA | $0.080 + 0.008$ | `null` | `null` | `null` | $8.0\text{ h}$ |
| `user-defined` | User-Defined Custom Assumptions | `user-defined` | Custom Model | Configured | Configurable | Configurable | Configurable | Configurable | Configurable |

### Authentic Hardware vs. Engineering Scenarios
The profile library strictly enforces architectural consistency. Historical Apollo 15 hardware parameters (such as $390\text{ Wh}$ silver-zinc battery capacity and porous plate sublimators) are never blended with modern xEMU digital avionics power draws ($140\text{ W}$) to synthesize a false spacesuit. When a user creates a composite scenario, it is labeled as `user-defined` and all outputs carry the `ASSUMPTION-DEPENDENT` status.

---

## 5. Mathematical Consumption Models

### 5.1 EVA Duration Model
$$\text{Duration}_{\text{total}} = \text{Travel Time} + \text{Science Stops} + \text{Other Activities} + \text{Contingency Time}$$

- **Travel Time:** When computed by an integrated terrain-routing engine, the actual route travel time is utilized. When route metrics supply only spherical geometric distance $d$, travel time is derived using the explicit planning speed assumption $v_{\text{walk}}$ (default $1.0\text{ km/h}$):
  $$t_{\text{travel}} = \frac{d}{v_{\text{walk}}}$$
- **Return Closure:** When `roundTripIncluded` is true, the route distance and travel time already include return closure to base camp; no duplicate return segment is added.
- **Contingency Allowance:** Configured as a percentage buffer $P_{\text{time}}$ (default $0\%$ to $20\%$):
  $$t_{\text{contingency}} = t_{\text{base}} \times \frac{P_{\text{time}}}{100}$$

### 5.2 Oxygen Model
$$\text{Metabolic Demand} = r_{\text{metabolic}} \times t_{\text{total}}$$
$$\text{Supply Losses} = r_{\text{leakage}} \times t_{\text{total}}$$
$$\text{Base Requirement} = \text{Metabolic Demand} + \text{Supply Losses}$$
$$\text{Recommended Provision} = \text{Base Requirement} \times \left(1 + \frac{P_{\text{O2 reserve}}}{100}\right)$$

- **Double-Count Prevention:** BVAD specifies physiological metabolic consumption ($0.076\text{ kg/h}$) and structural suit leakage ($0.005\text{ kg/h}$) as separate, non-overlapping terms. They are added together without duplicating system-level overhead.
- **Distance Multiplier Prohibition:** Oxygen is never estimated by multiplying route distance by an arbitrary kilograms-per-kilometer constant.

### 5.3 Electrical Energy Model
$$E_{\text{base}} = P_{\text{load}} \times t_{\text{total}}$$
$$E_{\text{recommended}} = E_{\text{base}} \times \left(1 + \frac{P_{\text{battery reserve}}}{100}\right)$$

- **Decoupling Biological Exertion:** Metabolic heat production (e.g. $295\text{ W}$) is physiological heat rejected by the human body; it is **NOT** electrical power consumed by suit electronics. The electrical model uses strictly spacesuit electrical load $P_{\text{load}}$ (e.g. $140\text{ W}$ for BVAD xEMU, $58\text{ W}$ for Apollo 15).
- **Missing Power Load Guard:** If electrical load is null in the reference profile (e.g. `nasa-std-3001-nominal`), battery energy is reported as `UNAVAILABLE` rather than guessing a default.

### 5.4 Cooling-Water Model
$$W_{\text{base}} = r_{\text{loss}} \times t_{\text{total}}$$
$$W_{\text{recommended}} = W_{\text{base}} \times \left(1 + \frac{P_{\text{water reserve}}}{100}\right)$$

- **Consumptive vs. Recirculating:** Sublimators and SWME vent water vapor into the vacuum or low-pressure atmosphere to reject heat ($r_{\text{loss}} = 0.57\text{ kg/h}$). Closed-loop radiator architectures reject heat without mass loss ($r_{\text{loss}} = 0.00\text{ kg/h}$).
- **Garment Circulation Guard:** Recirculating flow through the Liquid Cooling Garment (LCG $\sim 1.5\text{ L/min}$) is a closed fluid loop and is **NEVER** treated as consumable water loss.
- **Potable Water Separation:** Astronaut drinking water is tracked separately from thermal cooling feedwater.

### 5.5 Reserves & Available Capacity Comparison
For each resource with known usable capacity $C$:
$$\text{Margin}_{\text{remaining}} = C - \text{Recommended Provision}$$

Assessment states:
- `within-configured-capacity`: $\text{Margin}_{\text{remaining}} \ge 0$.
- `exceeds-configured-capacity`: $\text{Recommended Provision} > C$ ($\text{Margin}_{\text{remaining}} < 0$).
- `capacity-unknown`: Usable capacity is not specified in the reference profile.
- `insufficient-evidence`: Duration or consumption rate cannot be determined.

---

## 6. Regional Route Adapters

### 6.1 Gale Crater (`lib/eva/adapters/gale.ts`)
- When terrain routing metrics are supplied, the adapter extracts terrain-derived distance, ascent/descent, and travel time, flagging evidence as `terrain-derived`.
- When terrain routing is not yet integrated, it falls back to spherical Mars geometric geodesy ($R = 3,396,190\text{ m}$) from verified waypoints and labels evidence as `geometric`.
- Preserves Curiosity REMS and RAD historical weather/radiation isolation.

### 6.2 Jezero Crater (`lib/eva/adapters/jezero.ts`)
- Same uniform normalization contract.
- Incorporates HiRISE DEM coverage limits and delta rim slope barrier caveats into route warnings.
- Preserves Perseverance MEDA environmental data isolation.

### 6.3 Oxia Planum (`lib/eva/adapters/oxia.ts`)
- Transparently discloses that an integrated terrain-routing engine is currently unavailable.
- Derives geometric trajectory from spherical waypoints.
- Derives travel time using the user-configured walking speed assumption ($1.0\text{ km/h}$).
- Marks terrain slope adjustment strictly `UNAVAILABLE` and mission feasibility `UNVERIFIED`.
- Supports manual distance input ($d_{\text{manual}}$) when no geometric waypoints are established.
- Never invents fake DEM elevations or slope barriers for Oxia.

---

## 7. Scientific Confidence & Result States

| Status | Definition | Example Scenario |
|---|---|---|
| `estimated` | Calculated using validated, documented NASA rates and supported terrain-derived route metrics. | Gale with terrain route and BVAD Exploration profile. |
| `assumption-dependent` | Calculated, but relies on user-supplied assumptions (e.g. geometric distance, speed assumption, custom power load). | Oxia with geometric route and $1.0\text{ km/h}$ speed assumption. |
| `unavailable` | Required rate, duration, or model is absent. Fake numbers are strictly blocked. | Cooling water under `nasa-std-3001-nominal` profile. |
| `exceeds-configured-capacity` | Calculated recommended provision exceeds configured usable capacity. | $8.0\text{ h}$ sortie evaluated against Apollo 15 ($390\text{ Wh}$) battery. |

---

## 8. User Interface Implementation

The shared EVA Resource Planning panel (`components/eva/eva-resource-panel.tsx`) is mounted into the mission planner across all three regions:

### Main Panel Structure
1. **Section A — Route Summary (`RouteSummarySection`):** Displays region name, route evidence badge, total distance, travel time, science-stop duration, direction mode, and geographic uncertainty.
2. **Section B — Reference Profile (`ProfileSelector`):** Dropdown selector for NASA engineering baselines and custom scenarios, with metadata badges, descriptions, and boundary limitations.
3. **Section C — Recommended Resources (`ResourceCard` × 4):**
   - **Oxygen Card:** Estimated provision (kg), capacity margin, breakdown (metabolic vs leakage vs reserve).
   - **Battery Card:** Estimated energy requirement (Wh), capacity margin, power load breakdown.
   - **Cooling Water Card:** Estimated provision (kg/L), evaporative loss breakdown.
   - **EVA Duration Card:** Total planned duration (hours/minutes), travel vs science stop breakdown.
4. **Section D — Planning Settings (`AssumptionsPanel`):** Inputs for walking speed (km/h), O₂ reserve (+%), battery reserve (+%), cooling water reserve (+%), time contingency (+%), and collapsible manual overrides.
5. **Section E — Scientific Explanation (`ScientificExplanation`):** Collapsible panel documenting exact mathematical formulas, active NASA primary citations with NTRS links, and non-operational disclaimers.

### Responsive Design & Accessibility
- Clean layout matching the Marswalk space-themed palette (`#0f172a`, `#131d33`, `#38bdf8`, `#fbbf24`, `#f87171`).
- Fully tested on Desktop ($1440 \times 900$), Tablet ($768 \times 1024$), and Mobile ($390 \times 844$).
- Horizontal overflow: $0\text{ px}$ across all viewports.
- Keyboard accessible with native `<summary>` and ARIA labels.

---

## 9. Mission Persistence & Mission Brief

### Schema Integration
The mission persistence schema (`lib/mission/model.ts`) was extended with an optional `eva_resource_plan` property:
```ts
export const evaResourcePlanPersistenceSchema = z.object({
  schema_version: z.literal(1),
  profile_id: z.string().min(1).max(100),
  profile_version: z.string().min(1).max(100),
  speed_kmh: z.number().positive().nullable().optional(),
  oxygen_reserve_percent: z.number().min(0).max(100).optional(),
  battery_reserve_percent: z.number().min(0).max(100).optional(),
  cooling_water_reserve_percent: z.number().min(0).max(100).optional(),
  time_contingency_percent: z.number().min(0).max(100).optional(),
  manual_assumptions: z.object({
    distance_meters: z.number().nonnegative().nullable().optional(),
    oxygen_capacity_kg: z.number().nonnegative().nullable().optional(),
    battery_capacity_wh: z.number().nonnegative().nullable().optional(),
    cooling_water_capacity_kg: z.number().nonnegative().nullable().optional(),
    electrical_power_w: z.number().nonnegative().nullable().optional(),
  }).optional(),
  route_version: z.string().optional(),
  dataset_version: z.string().max(200).optional(),
  last_calculated_at: z.string().optional(),
  calculation_status: resourceEstimateStatusSchema.optional(),
});
```
Because the field is optional, full backward compatibility is preserved for existing mission drafts.

### Mission Brief Integration
Both the HTML download brief and the on-screen mission brief (`components/mission/brief.tsx`) now include a dedicated **EVA Life-Support Resources & Duration** section displaying:
- Selected route evidence and distance.
- Planned EVA duration.
- Estimated oxygen provision.
- Estimated electrical energy requirement.
- Estimated cooling-water provision.
- Reference profile and reserve assumptions.
- Traceable NASA data sources.
- Scientific limitations and missing data notices.

---

## 10. Automated Verification & Test Results

### 10.1 Dedicated EVA Unit Suite (`tests/eva-resources.test.ts`)
Run command: `npx tsx --test tests/eva-resources.test.ts`
- **Group 1: Calculation Correctness (7 tests):** Metabolic oxygen and suit leakage summation; electrical energy scaling with duration; exceeds-configured-capacity detection; SWME vs closed-loop radiator cooling water; total duration aggregation with contingency; deterministic h/min formatting; zero-duration division-by-zero protection.
- **Group 2: Scientific Validity & Model Boundaries (6 tests):** Citation completeness across all profiles; metabolic heat vs electrical power decoupling; cooling water unavailable for physiological standards; no fake DEM slopes; mandatory non-operational safety disclaimers; profile resolution via `getEVAProfile`.
- **Group 3: Region Coverage & Shared Engine (3 tests):** Arithmetic parity across Gale, Jezero, and Oxia under identical route inputs; Oxia unmodeled-terrain disclosure; terrain-derived metric adaptation.
- **Group 4: User Assumptions & Overrides (3 tests):** Custom profile handling; manual capacity overrides; manual electrical load override.
- **Group 5: Mission Persistence & Serialization (1 test):** Mission draft persistence and restoration round-trip.
- **Result:** **20 passed**, 0 failed (100% pass rate, execution time: $1.04\text{ s}$).

### 10.2 Project Regression Suites
- `npm test`: **29 passed**, 0 failed (`tests/mission.test.ts`, `tests/regions.test.ts`, `tests/gale-integration.test.ts`, `tests/gale-coverage.test.ts`).
- `npm run typecheck`: **0 errors**, strict TypeScript type generation passed.
- `npm run lint`: **0 errors**, strict ESLint passed.
- `npm run build`: **0 errors**, static production build compiled successfully.

### 10.3 Playwright E2E Browser Acceptance (`tests/browser/eva-resources.spec.ts`)
Run command: `npx playwright test tests/browser/eva-resources.spec.ts`
- **Test 1 (Desktop 1440px):** Gale Crater workflow, 4 cards render, speed recalculation, reserve recalculation, Apollo 15 profile switch, 0 console errors.
- **Test 2 (Desktop 1440px):** Jezero Crater estimation consistency and 4 cards render.
- **Test 3 (Desktop 1440px):** Oxia Planum geometric route assumptions, unmodeled terrain disclosure, manual distance input recalculation.
- **Test 4 (Tablet 768px):** Responsive layout check, zero horizontal overflow ($\le 1\text{ px}$).
- **Test 5 (Mobile 390px):** Mobile layout check, cards stacked cleanly, zero horizontal overflow ($\le 1\text{ px}$).
- **Test 6 (Desktop 1440px):** Mission brief includes EVA Life-Support Resources & Duration section.
- **Test 7 (Desktop 1440px):** Environmental conditions panel preservation (Gale REMS/RAD observations intact).
- **Result:** **7 passed**, 0 failed (100% pass rate).

### 10.4 Existing Environmental Browser Suite (`tests/browser/environmental-conditions.spec.ts`)
Run command: `npx playwright test tests/browser/environmental-conditions.spec.ts`
- **Result:** **9 passed**, 0 failed (100% pass rate).

---

## 11. Browser Acceptance Screenshots

All screenshots captured during automated Playwright browser test execution are stored in `docs/screenshots/`:
- `docs/screenshots/eva-resources-desktop-1440.png`: Gale Crater Desktop 1440px view showing route summary, Apollo 15–17 profile, 4 primary resource cards, planning settings, and scientific explanation.
- `docs/screenshots/eva-resources-jezero.png`: Jezero Crater view showing Jezero route summary and resource estimation.
- `docs/screenshots/eva-resources-oxia.png`: Oxia Planum view showing geometric trajectory assumptions and transparent unmodeled-terrain disclosures.
- `docs/screenshots/eva-resources-tablet-768.png`: Tablet 768px responsive viewport.
- `docs/screenshots/eva-resources-mobile-390.png`: Mobile 390px compact viewport.

---

## 12. Known Limitations & Future Work

1. **Terrain Slope Exertion Modeling (Phase R2):** Phase R1 employs constant metabolic rates ($0.076\text{ kg/h}$ nominal). Real planetary traverses increase metabolic oxygen demand and heat rejection on steep grades (e.g. Minetti or Santee locomotion models). This should be integrated in Phase R2 once terrain routing is fully active.
2. **Atmospheric Backpressure on Cooling:** In the vacuum of the Moon, water sublimates directly from ice. In the Martian atmosphere ($600\text{–}900\text{ Pa}$ $\text{CO}_2$), porous plate sublimation requires backpressure regulation or active vacuum pumping; modern SWME architectures vent through hollow fiber membranes.
3. **Environmental Coupling:** Environmental air temperature and solar flux are displayed for scientific context, but Phase R1 deliberately avoids unsupported thermal conduction or radiation models that lack validated empirical calibration.
4. **Future Codex Routing Integration:** The routing adapter interface (`TerrainRouteMetrics`) is ready to receive Codex's terrain-derived route distance, velocity, ascent, and descent metrics without modifying the calculation core.

---

## 13. Changed & Added Files

### Added Files
- `lib/eva/types.ts`: Type definitions for route inputs, profiles, estimates, and results.
- `lib/eva/sources.ts`: Data source registry for numerical constants and NASA citations.
- `lib/eva/profiles.ts`: NASA reference profile library.
- `lib/eva/timeline.ts`: Pure EVA duration calculation module.
- `lib/eva/oxygen.ts`: Oxygen consumption and provision calculation module.
- `lib/eva/battery.ts`: Electrical power load and battery energy calculation module.
- `lib/eva/cooling.ts`: Consumptive cooling water calculation module.
- `lib/eva/estimate.ts`: Unified estimation engine.
- `lib/eva/validation.ts`: Runtime Zod schemas and persistence contracts.
- `lib/eva/adapters/gale.ts`: Gale Crater regional route adapter.
- `lib/eva/adapters/jezero.ts`: Jezero Crater regional route adapter.
- `lib/eva/adapters/oxia.ts`: Oxia Planum regional route adapter.
- `lib/eva/adapters/index.ts`: Regional route adapter factory.
- `lib/eva/index.ts`: Public API export module.
- `components/eva/styles.ts`: Scoped dark space-themed CSS stylesheet.
- `components/eva/resource-card.tsx`: Resource estimation card component.
- `components/eva/profile-selector.tsx`: Reference profile selector component.
- `components/eva/route-summary-section.tsx`: Route summary section component.
- `components/eva/assumptions-panel.tsx`: Planning settings and allowances component.
- `components/eva/scientific-explanation.tsx`: Collapsible scientific explanation component.
- `components/eva/eva-resource-panel.tsx`: Unified EVA resource planning panel component.
- `components/eva/index.ts`: Component public exports.
- `tests/eva-resources.test.ts`: 20 unit tests across 5 test groups.
- `tests/browser/eva-resources.spec.ts`: 7 Playwright e2e browser acceptance tests.
- `docs/EVA_RESOURCE_MODEL_REPORT.md`: Comprehensive milestone report.
- `docs/screenshots/eva-resources-desktop-1440.png`: Desktop screenshot.
- `docs/screenshots/eva-resources-jezero.png`: Jezero screenshot.
- `docs/screenshots/eva-resources-oxia.png`: Oxia screenshot.
- `docs/screenshots/eva-resources-tablet-768.png`: Tablet screenshot.
- `docs/screenshots/eva-resources-mobile-390.png`: Mobile screenshot.

### Modified Files
- `lib/mission/model.ts`: Added optional `eva_resource_plan` property to `missionSchema`.
- `components/mission/brief.tsx`: Added EVA Life-Support Resources & Duration section to both brief HTML and UI.
- `components/planner.tsx`: Integrated EVA Resources tab, URL parameter navigation (`panel=eva`), panel rendering, and footer button.

---

## 14. Verification & Delivery Summary

- **Branch:** `feat/unified-eva-resource-planner`
- **Worktree:** `D:\martian-map-eva-resources`
- **Baseline Commit:** `818eeb85db67f0c2440e2acc47024b436e8a1526`
- **All Suites Passing:**
  - `npm test`: 29/29 passed
  - `npx tsx --test tests/eva-resources.test.ts`: 20/20 passed
  - `npx playwright test tests/browser/eva-resources.spec.ts`: 7/7 passed
  - `npx playwright test tests/browser/environmental-conditions.spec.ts`: 9/9 passed
  - `npm run typecheck`: clean
  - `npm run lint`: clean (0 errors)
  - `npm run build`: production build successful
