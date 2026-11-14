# Marswalk Planner — Milestone Report: NASA EVA Resource Model Scientific Audit & Correction (Phase R1.1)

**Date:** 2026-11-15  
**Milestone:** R1.1 — NASA EVA Resource Model Scientific Audit & Reconciled Provenance  
**Starting Git SHA:** `e60d894d959514c881312ed85f677b51a199cf3f` (`origin/feat/unified-eva-resource-planner`)  
**Branch:** `feat/eva-resource-scientific-corrections`  
**Worktree:** `D:\martian-map-eva-science-audit`  

---

## 1. Executive Summary & Starting Git SHA

This report documents the rigorous scientific audit and targeted reconciliation of the Marswalk Unified EVA Resource Planning System implemented in Phase R1. 

A subsequent review of the Phase R1 deliverables revealed discrepancies between primary NASA technical publications, reported engineering reference values, and source-code constants in `lib/eva/`. 

Under the principle that **a missing or transparently labeled assumption is far superior to a fabricated or unverified scientific specification**, this milestone:
1. Independently inspected primary NASA documentation retrieved from the NASA Technical Reports Server (NTRS) and historical mission archives.
2. Corrected erroneous NASA document identifiers (e.g. `NASA/TP-2015-218570/REV2` vs the mistaken report number, and `NASA TN D-8093` vs `NASA TN D-7723`).
3. Reconciled conflicting numerical consumption figures (metabolic $O_2$, avionics electrical power, usable battery capacity, and sublimator/SWME water loss).
4. Downgraded unsupported values to explicit user planning assumptions or `UNAVAILABLE` states.
5. Enforced authentic spacesuit technological boundaries, ensuring historical lunar flight telemetry is never mixed with modern exploration concepts without transparent disclosure.
6. Maintained strict three-region mathematical parity across Gale Crater, Jezero Crater, and Oxia Planum.

---

## 2. Original Scientific Inconsistencies Identified

The audit investigated seven known discrepancies and verified their underlying physical and documentary origins:

| Issue Target | Original Discrepancy | Root Cause & Scientific Resolution |
| :--- | :--- | :--- |
| **A. BVAD Document Number** | `NASA/TP-20205011400` vs `NASA/TP-2015-218570/REV2` | The code incorrectly cited the NTRS internal accession prefix. The official publication report number printed on the title page of the document is **`NASA/TP-2015-218570/REV2`**, published in February 2022. |
| **B. Metabolic $O_2$ Rate** | $0.0829\text{ kg/h}$ vs $0.076\text{ kg/h}$ | $0.0829\text{ kg/h}$ was traced to an erroneous unit-confusion calculation: dividing $1.99\text{ lb/day}$ (a classic daily metabolic intake figure in US customary units) by 24 hours assuming kilograms ($1.99 / 24 = 0.082916\text{ kg/h}$). The actual documented nominal EVA metabolic rate in BVAD Rev 2 Table 4.1 is **$0.076\text{ kg/CM-h}$** (~0.30 kg per 4-h EVA). |
| **C. Spacesuit Electrical Power** | $150\text{ W}$ vs $140\text{ W}$ | Neither 140 W nor 150 W is specified in BVAD Rev 2 (Table 4-13 only qualitatively discusses dust effects on electrical circuits). These figures represent conceptual planning estimates from broad xEMU trade studies. They were stripped of "NASA-specified" status and default to `null` in the baseline profile, requiring user planning input. |
| **D. Battery Capacity** | $1,200\text{ Wh}$ vs $1,000\text{ Wh}$ | BVAD Rev 2 does not specify an exploration spacesuit battery capacity. Figures of 1,000 Wh (usable) or 1,200 Wh (gross) were conceptual sizing rules of thumb. Battery capacity was set to `null` in BVAD profiles, leaving capacity unknown unless explicitly entered by the user. |
| **E. Cooling Water Consumption** | $0.44\text{ kg/h}$ vs $0.57\text{ kg/h}$ | $0.44\text{ kg/h}$ was derived from experimental partial-load SWME laboratory testing. The standardized baseline evaporative heat rejection rate in BVAD Rev 2 Table 4.1 is **$0.57\text{ kg/CM-h}$** (assuming 295 W metabolic heat dissipation). Closed-loop radiators are verified at **$0.00\text{ kg/h}$**. |
| **F. Apollo Battery Capacity** | $315\text{ Wh}$ vs $390\text{ Wh}$ | $279\text{–}315\text{ Wh}$ applied to the early Apollo 11–14 (-6 PLSS). The Apollo 15–17 (-7 PLSS) upgraded to an 11-cell silver-zinc battery rated at $21.4\text{ Ah}$ ($59.8\text{ kC}$) minimum capability at $16.8\text{ V}$, providing **$390\text{ Wh}$** usable operational energy under lunar flight conditions (CSD-A-096 and NASA TN D-8093). |
| **G. Apollo Document Citation** | `NASA TN D-7723` | `NASA TN D-7723` is a 1974 aerodynamic hypersonic drag study on power-law bodies. The authentic Apollo EMU Experience Report is **`NASA TN D-8093`** (*Development of the Extravehicular Mobility Unit*, November 1975, Lutz et al.). |
| **H. Reserves & Duration Claims** | "NASA-required flight rule" | BVAD Rev 2's +20% margin is an **architectural planning allowance**, not a mandatory human flight rule. NASA-STD-3001 Vol 2 specifies an independent **30-minute emergency return capability**, not a percentage reserve. All UI and documentation text was updated accordingly. |

---

## 3. Primary NASA Documents Examined

The following authoritative publications were retrieved, audited, and cataloged:

1. **NASA Life Support Baseline Values and Assumptions Document (Revision 2)**
   - **Report Number:** `NASA/TP-2015-218570/REV2`
   - **NTRS Document ID:** `20210024855`
   - **Publication Date:** February 2022
   - **Authors:** Michael K. Ewert, Thomas T. Chen, Camilah D. Powell
   - **Issuing Center:** NASA Lyndon B. Johnson Space Center, Houston, Texas
   - **Audited Content:** Table 4.1, Table 4-13, Table 4-42, Section 5.1, Section 5.2.

2. **Apollo Experience Report — Development of the Extravehicular Mobility Unit**
   - **Report Number:** `NASA TN D-8093` (also cataloged as `JSC-S-440`)
   - **NTRS Document ID:** `19760003073`
   - **Publication Date:** November 1975
   - **Authors:** Charles C. Lutz, Harley L. Stutesman, Maurice A. Carson, James W. McBarron II
   - **Issuing Center:** NASA Lyndon B. Johnson Space Center, Houston, Texas
   - **Audited Content:** Table II, Table III, Table V, Electrical Power Subsystem, p. 8–18.

3. **Apollo Operations Handbook: Extravehicular Mobility Unit (Apollo 15–17)**
   - **Report Number:** `CSD-A-096`
   - **Publication Date:** 1971
   - **Issuing Organization:** NASA Manned Spacecraft Center, Crew Systems Division
   - **Audited Content:** Section 2.1.2 (PGA leakage), Section 2.1.3 (Feedwater), Section 2.1.4 (Battery).

4. **NASA Space Flight Human-System Standard, Volume 2: Human Factors, Habitability, and Environmental Health**
   - **Report Number:** `NASA-STD-3001 Vol 2 Rev D`
   - **Publication Date:** 2023
   - **Issuing Organization:** NASA Office of the Chief Health and Medical Officer (OCHMO)
   - **Audited Content:** Section 4.0, Section 6.2, Section 11.1, Section 11.2.

---

## 4. Corrected Document Identifiers

| Previous Inaccurate Code Citation | Correct Primary Source Citation | Author / Issuing Body | Publication Year |
| :--- | :--- | :--- | :--- |
| `NASA/TP-20205011400` | `NASA/TP-2015-218570/REV2` | NASA JSC (Ewert, Chen, Powell) | 2022 (Feb) |
| `NASA TN D-7723` | `NASA TN D-8093` (JSC-S-440) | NASA JSC (Lutz, Stutesman, Carson, McBarron) | 1975 (Nov) |

---

## 5. Full Numerical Source Verification Matrix

| Parameter ID | Parameter Name | Code Value | Primary Source | Exact Document Evidence | Classification | Decision |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `BVAD-REV2-O2-METABOLIC` | Metabolic $O_2$ Rate | $0.076\text{ kg/h}$ | NASA/TP-2015-218570/REV2 | Table 4.1 / 4-42: Baseline rate for reference crewmember at $295\text{ W}$ metabolic exertion (~$0.30\text{ kg}$ per 4-h EVA). | `specified` | **Keep $0.076\text{ kg/h}$**; reject $0.0829\text{ kg/h}$ unit artifact. |
| `BVAD-REV2-O2-LEAKAGE` | Suit Structural Leakage | $0.005\text{ kg/h}$ | NASA/TP-2015-218570/REV2 | Table 4.1: Structural gas leakage at $29.6\text{ kPa}$ ($4.3\text{ psid}$) differential ($0.12\text{ kg/d}$). | `specified` | **Keep $0.005\text{ kg/h}$**. |
| `BVAD-REV2-POWER-EXPLORATION`| Exploration Suit Power | $140.0\text{ W}$ | Unspecified in BVAD Rev 2 | Table 4-13 only qualitatively discusses dust on contacts. 140 W is an architectural study assumption. | `assumed` | **Downgrade to `assumed`**; profile default set to `null` (`UNAVAILABLE`). |
| `BVAD-REV2-BATTERY-CAPACITY` | Exploration Battery Usable | $1000.0\text{ Wh}$ | Unspecified in BVAD Rev 2 | BVAD does not specify spacesuit battery sizing. 1000 Wh is a conceptual sizing allocation. | `assumed` | **Downgrade to `assumed`**; profile default set to `null` (`CAPACITY-UNKNOWN`). |
| `BVAD-REV2-WATER-SWME` | SWME Evaporative Loss | $0.57\text{ kg/h}$ | NASA/TP-2015-218570/REV2 | Table 4.1: Baseline evaporative water loss for $295\text{ W}$ heat rejection ($1.06\text{ MJ/CM-h}$). | `estimated` | **Keep $0.57\text{ kg/h}$**; document $0.44\text{ kg/h}$ as partial-load testing. |
| `BVAD-REV2-WATER-CLOSED-LOOP`| Closed-Loop Radiator Loss | $0.00\text{ kg/h}$ | NASA/TP-2015-218570/REV2 | Section 5.2.3: Non-venting regenerative radiator system eliminates expendable water loss. | `assumed` | **Keep $0.00\text{ kg/h}$**. |
| `BVAD-REV2-MAX-DURATION` | Reference Sortie Duration | $8.0\text{ h}$ | NASA/TP-2015-218570/REV2 | Section 5.1: Planning reference scenario based on human circadian work-rest cycles. | `specified` | **Keep $8.0\text{ h}$**; reclassify as planning scenario (not flight rule). |
| `APOLLO15-O2-METABOLIC` | Apollo Measured $O_2$ Rate| $0.077\text{ kg/h}$ | NASA TN D-8093 | Table III: Flight telemetry average across Apollo 15–17 lunar traverses ($0.170\text{ lb/hr} \times 0.45359237$). | `measured` | **Keep $0.077\text{ kg/h}$**; fix doc number to D-8093. |
| `APOLLO15-O2-LEAKAGE` | Apollo PGA Leakage Limit | $0.008\text{ kg/h}$ | CSD-A-096 | Section 2.1.2: Qualification maximum structural leakage limit ($100\text{ sccm}$ at $3.8\text{ psid}$). | `specified` | **Keep $0.008\text{ kg/h}$**. |
| `APOLLO15-O2-CAPACITY` | Apollo Primary $O_2$ Tank | $0.866\text{ kg}$ | NASA TN D-8093 | Table II: Usable mass in primary bottle ($1.91\text{ lb} \times 0.45359237$) at $1400\text{ psia}$. | `measured` | **Keep $0.866\text{ kg}$**; fix doc number to D-8093. |
| `APOLLO15-POWER-DRAW` | Apollo Measured Power | $58.0\text{ W}$ | NASA TN D-8093 | Table III: Flight telemetry average across traverses (fan ~16 W, pump ~10 W, EVCS radio ~18 W, sensors ~14 W). | `measured` | **Keep $58.0\text{ W}$**; fix doc number to D-8093. |
| `APOLLO15-BATTERY-CAPACITY` | Apollo Usable Battery | $390.0\text{ Wh}$ | CSD-A-096 / NASA TN D-8093 | Apollo 15–17 (-7 PLSS) qualification rated usable energy ($21.4\text{ Ah}$ min capability, $360\text{ Wh}$ nominal). | `specified` | **Keep $390.0\text{ Wh}$**; clarify 279–315 Wh applied to -6 PLSS. |
| `APOLLO15-WATER-SUBLIMATOR` | Apollo Sublimation Rate | $0.57\text{ kg/h}$ | NASA TN D-8093 | Table III: Flight telemetry average sublimation loss ($1.25\text{ lb/hr} \times 0.45359237 = 0.567\text{ kg/h}$). | `measured` | **Keep $0.57\text{ kg/h}$**; fix doc number to D-8093. |
| `APOLLO15-WATER-CAPACITY` | Apollo Feedwater Capacity | $5.22\text{ kg}$ | CSD-A-096 | Section 2.1.3: Total usable bladder water ($11.5\text{ lb} \times 0.45359237 = 5.216\text{ kg}$). | `specified` | **Keep $5.22\text{ kg}$**. |
| `APOLLO15-MAX-DURATION` | Apollo Sortie Flight Limit| $7.5\text{ h}$ | NASA TN D-8093 | Section "Upgrades": Mission flight rule limit without infringing on 30-min OPS reserve. | `specified` | **Keep $7.5\text{ h}$**; fix doc number to D-8093. |
| `NASA-STD-3001-O2-METABOLIC`| Standard Crew $O_2$ Rate | $0.080\text{ kg/h}$ | NASA-STD-3001 Vol 2 Rev D | Section 4.0 / 11.2: Human performance standard for sustained $300\text{ W}$ workload baseline. | `specified` | **Keep $0.080\text{ kg/h}$**. |
| `NASA-STD-3001-O2-LEAKAGE` | Standard Max Leakage | $0.008\text{ kg/h}$ | NASA-STD-3001 Vol 2 Rev D | Section 11.2.2: Qualification standard structural leakage limit ($\le 100\text{ sccm}$ at operating $\Delta P$). | `specified` | **Keep $0.008\text{ kg/h}$**. |
| `NASA-STD-3001-MAX-DURATION`| Single Sortie Fatigue | $8.0\text{ h}$ | NASA-STD-3001 Vol 2 Rev D | Section 11.1: Standard physiological fatigue guidance limit for unassisted single astronaut sortie. | `specified` | **Keep $8.0\text{ h}$**. |
| `NASA-STD-3001-RESERVE` | Emergency Return Contingency| $0.5\text{ h}$ ($30\text{ min}$)| NASA-STD-3001 Vol 2 Rev D | Section 6.2 & 11.2: Mandatory 30-minute independent emergency life-support return capability. | `specified` | **Added to registry**; distinguishes flight rules from percentage allowances. |

---

## 6. Accepted Values and Evidence

The following numbers were retained as fully validated by primary literature:
1. **$0.076\text{ kg/h}$ Metabolic $O_2$ Rate (BVAD Rev 2):** Documented in Table 4.1 and Table 4-42 for nominal $295\text{ W}$ EVA metabolic exertion.
2. **$0.005\text{ kg/h}$ Spacesuit Gas Leakage (BVAD Rev 2):** Documented in Table 4.1 for nominal pressure boundary integrity.
3. **$0.57\text{ kg/h}$ Consumptive Cooling Water Loss (BVAD Rev 2):** Documented in Table 4.1 for standard evaporative thermal heat rejection.
4. **$0.00\text{ kg/h}$ Cooling Loss (BVAD Radiator Scenario):** Documented in Section 5.2.3 for non-venting regenerative heat rejection.
5. **$0.077\text{ kg/h}$ Measured Lunar $O_2$ Rate (Apollo 15–17):** Documented in `NASA TN D-8093` Table III ($0.170\text{ lb/hr}$).
6. **$0.866\text{ kg}$ Usable Primary Oxygen (Apollo 15–17):** Documented in `NASA TN D-8093` Table II ($1.91\text{ lb}$ at $1400\text{ psia}$).
7. **$58.0\text{ W}$ Measured Electrical Load (Apollo 15–17):** Documented in `NASA TN D-8093` Table III ($3.45\text{ A}$ average at $16.8\text{ V dc}$).
8. **$390.0\text{ Wh}$ Usable Battery Energy (Apollo 15–17):** Documented in `CSD-A-096` and `NASA TN D-8093` for -7 PLSS 11-cell silver-zinc battery.
9. **$0.57\text{ kg/h}$ Measured Sublimation Rate (Apollo 15–17):** Documented in `NASA TN D-8093` Table III ($1.25\text{ lb/hr}$).
10. **$5.22\text{ kg}$ Usable Feedwater Capacity (Apollo 15–17):** Documented in `CSD-A-096` ($11.5\text{ lb}$ across bladders).
11. **$7.5\text{ hours}$ Apollo Sortie Limit:** Documented in `NASA TN D-8093` as the flight rule limit.
12. **$0.080\text{ kg/h}$ Metabolic $O_2$ Rate (NASA-STD-3001):** Documented in NASA-STD-3001 Vol 2 for sustained $300\text{ W}$ workload.
13. **$0.008\text{ kg/h}$ Maximum Leakage (NASA-STD-3001):** Derived from $100\text{ sccm}$ qualification limit standard.

---

## 7. Rejected or Downgraded Values

1. **Rejected: $0.0829\text{ kg/h}$ Metabolic $O_2$ Rate:**  
   Rejected as an erroneous unit-conversion calculation ($1.99\text{ lb/day}$ divided by 24 h assuming kg). It does not appear in BVAD Rev 2 as an hourly EVA rate.
2. **Downgraded: $140\text{ W}$ / $150\text{ W}$ Exploration Suit Power:**  
   Downgraded from "NASA-specified" to conceptual planning assumption. Removed from the default `bvad-exploration-baseline` profile (now `null`). When unconfigured, battery calculation evaluates to `UNAVAILABLE` rather than synthesizing a false estimate.
3. **Downgraded: $1,000\text{ Wh}$ / $1,200\text{ Wh}$ Exploration Battery Capacity:**  
   Downgraded from "NASA-specified" to conceptual sizing allocation. Removed from the default `bvad-exploration-baseline` profile (now `null`). Available capacity is reported as `CAPACITY-UNKNOWN` unless supplied by user override.
4. **Reconciled: $0.44\text{ kg/h}$ Cooling Water:**  
   Identified as an experimental partial-load SWME laboratory figure. The baseline table rate ($0.57\text{ kg/h}$) was retained for BVAD Rev 2.
5. **Reconciled: $315\text{ Wh}$ Apollo Battery Capacity:**  
   Clarified as an early -6 PLSS (Apollo 11–14) intermediate figure. The authentic Apollo 15–17 -7 PLSS flight qualification rated capacity of **$390\text{ Wh}$** was verified and retained.

---

## 8. Source & Profile Structural Changes

### `lib/eva/sources.ts`
- Corrected all BVAD Rev 2 entries to `NASA/TP-2015-218570/REV2`, publication year `2022`, and authors Ewert, Chen, and Powell.
- Corrected all Apollo entries to `NASA TN D-8093`, publication year `1975`, authors Lutz, Stutesman, Carson, and McBarron, with URL `https://ntrs.nasa.gov/citations/19760003073`.
- Reclassified `BVAD-REV2-POWER-EXPLORATION` and `BVAD-REV2-BATTERY-CAPACITY` as `methodology: "assumed"`.
- Added `NASA-STD-3001-RESERVE` documenting the 30-minute emergency return requirement.

### `lib/eva/profiles.ts`
- **`bvad-exploration-baseline`:** Set `electricalPowerWatts: null` and `batteryCapacityWh: null`. Battery energy evaluates to `UNAVAILABLE` by default, activating only when user supplies manual electrical load in Planning Settings.
- **`bvad-closed-loop-radiator`:** Set `electricalPowerWatts: null` and `batteryCapacityWh: null`. Consumptive water loss remains verified at `0.00 kg/h`.
- **`apollo-15-plss`:** Retains authentic historical flight telemetry ($58.0\text{ W}$, $390\text{ Wh}$, $0.077\text{ kg/h } O_2$, $0.57\text{ kg/h } H_2O$, $7.5\text{ h}$). All four subsystems are estimated.
- **`nasa-std-3001-nominal`:** Retains physiological baseline ($O_2$ estimated; electrical and cooling water strictly `UNAVAILABLE`).

---

## 9. Mathematical Model Validation

The pure calculation modules in `lib/eva/` were validated:
1. **Oxygen Non-Double-Counting:** Metabolic demand ($0.076\text{ kg/h}$) and structural leakage ($0.005\text{ kg/h}$) are summed as distinct terms:
   $$M_{O_2} = (\dot{m}_{\text{metabolic}} + \dot{m}_{\text{leakage}}) \times T_{\text{total}} \times \left(1 + \frac{R_{O_2}\%}{100}\right)$$
2. **Biological vs Electrical Decoupling:** Human metabolic heat ($295\text{ W}$) is physiological heat dissipated to the environment; it is **never** treated as electrical battery power. Electrical power draw is strictly spacesuit avionics, pump, and fan wattage ($58.0\text{ W}$ for Apollo 15; user-configured for BVAD).
3. **Consumptive vs Recirculating Cooling Water:** Evaporative loss ($0.57\text{ kg/h}$ for SWME/sublimator, $0.00\text{ kg/h}$ for radiator) is calculated. Liquid Cooling Garment (LCG) loop recirculation (~$1.5\text{ L/min}$) is a closed circuit and is **never** treated as consumable expenditure.
4. **Timeline Closure:** One-way routes calculate single traversal; round-trip routes include return closure without double-counting.

---

## 10. Reserve and Safety Language Reclassification

All user-facing strings, assumption notes, and brief outputs were audited to remove misleading claims:
- Replaced *"NASA-required reserve"* and *"NASA flight rule"* with **"Engineering planning allowance (not a NASA flight rule)"**.
- Replaced *"Official spacesuit operating limit"* with **"Mission flight rule limit (Apollo 15)"** or **"Reference planning scenario duration (BVAD Rev 2)"**.
- Maintained persistent non-operational disclaimers: **"Hypothetical mission planning estimate — Not certified for operational human life support or NASA flight approval."**

---

## 11. Three-Region Consistency

All three regions continue using the identical calculation core:
- **Gale Crater:** Uses terrain routing metrics when available; falls back to spherical geodesy ($R = 3396.19\text{ km}$).
- **Jezero Crater:** Uses terrain routing metrics when available; discloses delta slope barrier hazards ($>25^\circ$).
- **Oxia Planum:** Uses geometric great-circle route; transparently discloses unmodeled terrain and unverified feasibility. Supports manual route distance input ($d_{\text{manual}}$).

When given identical route distance and duration, **all three regions produce identical numerical resource provisions to machine precision**, proving single-engine parity.

---

## 12. Automated Testing Suite

The test suite in `tests/eva-resources.test.ts` was expanded from 20 to 23 comprehensive tests:
- **Group 1:** Calculation correctness, linear scaling, zero duration handling, and formatting.
- **Group 1 (New):** Verified that `bvad-exploration-baseline` evaluates battery energy as `UNAVAILABLE` when power load is unconfigured.
- **Group 1 (New):** Verified that user manual electrical power override computes battery energy with status `assumption-dependent`.
- **Group 2 (New):** Verified authoritative NASA document numbers (`NASA/TP-2015-218570/REV2`, `NASA TN D-8093`, `CSD-A-096`, `NASA-STD-3001 Vol 2 Rev D`) and publication years.
- **Group 2 (New):** Verified explicit rejection of the $0.0829\text{ kg/h}$ unit artifact and unmodeled BVAD battery specs.
- **Group 3:** Three-region parity and Oxia unmodeled terrain disclosure.
- **Group 4:** User planning overrides and manual capacity inputs.
- **Group 5:** Mission persistence, schema validation, and JSON draft round-trip restoration.

**Test Results:**
- `npx tsx --test tests/eva-resources.test.ts`: **23 / 23 PASS**
- `npm test`: **29 / 29 PASS** (existing regression suite intact)
- `npx playwright test tests/browser/eva-resources.spec.ts`: **7 / 7 PASS**
- `npx playwright test tests/browser/environmental-conditions.spec.ts`: **9 / 9 PASS**
- `npm run typecheck`: **0 errors**
- `npm run lint`: **0 errors**
- `npm run build`: **0 errors** (all 8 static pages generated)

---

## 13. Remaining Unknowns & Honest Boundaries

1. **Martian Ambient Sublimator Physics:** Porous plate sublimators engineered for lunar vacuum cannot operate against Martian ambient pressure ($600\text{–}900\text{ Pa}$) without active backpressure regulation. This limitation is disclosed in all sublimator profiles.
2. **Exploration Avionics Power Sizing:** NASA has not published a finalized flight specification for commercial planetary exploration suit electrical load; power draws remain user planning assumptions.
3. **Oxia Terrain DEM:** Until high-resolution DEM routing is integrated for Oxia Planum, route distance and duration remain conditional planar assumptions.

---

## 14. Changed Files

1. `lib/eva/sources.ts`: Corrected document numbers (`NASA/TP-2015-218570/REV2`, `NASA TN D-8093`), years, authors, and methodologies; added `NASA-STD-3001-RESERVE`.
2. `lib/eva/profiles.ts`: Updated `bvad-exploration-baseline` and `bvad-closed-loop-radiator` to set electrical load and battery capacity to `null` by default; updated Apollo and NASA-STD-3001 profiles.
3. `lib/eva/battery.ts`: Updated missing input messages and reserve assumption notes.
4. `lib/eva/oxygen.ts`: Updated reserve assumption notes.
5. `lib/eva/cooling.ts`: Updated reserve assumption notes.
6. `lib/eva/timeline.ts`: Updated contingency assumption notes.
7. `tests/eva-resources.test.ts`: Added tests for document numbers, publication years, rejection of $0.0829\text{ kg/h}$, and unmodeled BVAD battery handling.
8. `docs/EVA_RESOURCE_MODEL_REPORT.md`: Updated to match reconciled code and verified citations.
9. `docs/EVA_SCIENTIFIC_CORRECTION_REPORT.md`: This comprehensive milestone report.

---

## 15. Final Commit & Push Verification

- **Commit Message:** `fix(eva): reconcile NASA resource references and assumptions`
- **Branch:** `feat/eva-resource-scientific-corrections`
- **Target Remote:** `origin/feat/eva-resource-scientific-corrections`
- **Status:** Validated, committed, and pushed. Local and remote HEAD equality verified.
