# Marswalk Transformation Plan — Independent Scientific Integrity Audit

**Auditor:** Independent Planetary GIS Engineer & Scientific Software Reviewer  
**Subject:** "Marswalk Planner Transformation Plan" (6-Pillar Proposal)  
**Date:** March 2026 / NASA Space Apps Challenge 2026  
**Status:** **NOT APPROVED FOR IMPLEMENTATION AS WRITTEN**  
**Actionable Recommendation:** Phased decomposition with rigorous scientific boundary controls, removal of unverified numerical thresholds, and preservation of the evidence-first architecture.

---

## 1. Executive Summary

An independent technical and scientific audit of the proposed 6-pillar *Marswalk Planner Transformation Plan* was conducted. While the proposal demonstrates ambitious UI/UX vision, it contains critical scientific defects, unverified operational assumptions, and architectural risks that would undermine the scientific credibility of the Marswalk Planner project:

1. **Invention of Unverified Astronaut Safety Standards:** The proposal invents specific slope thresholds ($0\text{–}10^\circ$ safe, $10\text{–}18^\circ$ caution, $>18^\circ$ impassable, $>25^\circ$ infeasible) and suit mobility classifications that are not NASA-approved human Mars exploration standards.
2. **Hardcoding of Physiological and Consumables Rates:** Values for walking speed ($2.2\text{ km/h}$), oxygen consumption ($0.06\text{ kg/h}$), suit power ($180\text{ W}$), and metabolic slope penalties are presented as factual operational benchmarks rather than hypothetical scenario parameters.
3. **Erosion of Feasibility Integrity:** The proposed system allows unverified or user-entered numbers to generate automated "FEASIBLE" mission certifications, violating the project's foundational rule that feasibility requires verified, multi-domain scientific evidence.
4. **Unsupported Sensor Capabilities:** The proposal claims multi-mission overlays such as full 18-band CRISM mineralogical spectral cubes across all traverse sites, ignoring severe coverage gaps, atmospheric calibration artifacts, and sensor degradation.
5. **Overreach on Ground Truth Vision:** Ground-level rover photography (e.g., Mastcam, Navcam) is conflated with free-roaming astronaut first-person viewpoints, ignoring strict geometric constraints of camera mast height, field-of-view, pointing azimuth, and fixed rover traverse locations.

Below is the detailed component-by-component audit, classifying every feature and establishing the required corrections.

---

## 2. Classification Schema

- **Supported:** Grounded in verified NASA datasets, established physical laws, or existing approved project contracts.
- **Conditionally Viable:** Scientifically and technically plausible, but requires verified data sources, user-configurable scenario parameters, explicit uncertainty ranges, and prominent disclaimers.
- **Unsupported:** Lacks empirical grounding in human Mars exploration literature; inappropriately transfers robotic rover constraints to suited astronauts without validation; asserts speculative capabilities.
- **Incorrect:** Mathematically, physically, or architecturally flawed; contradicts project contracts; or generates false safety/feasibility guarantees.

---

## 3. Comprehensive Pillar Audit

### Pillar 1: Interactive Traverse & Waypoint Builder

| Subcomponent | Classification | Summary of Flaws & Scientific Risks | Required Evidence & Corrected Approach |
| :--- | :--- | :--- | :--- |
| **1.1 Pure Spherical Geodesy (`geodesy.ts`)** | **Supported** | None. Computes geometric great-circle arc distance, forward initial bearing, and Slerp interpolation on the standard Mars 2000 sphere ($R = 3{,}396{,}190\text{ m}$). | Keep strictly isolated as a pure mathematical module. Must clearly label all outputs as *geometric surface distance on an idealized sphere*. |
| **1.2 Interactive Polyline Route Creation** | **Conditionally Viable** | Allows users to click on the map to define waypoints. Risk: implies that a straight line between waypoints is a safe or walkable path without considering topography or obstacles. | Label interactive lines as *candidate traverse plans*. Do not calculate slope or traversability from straight-line geometry without underlying DEM elevation sampling. |
| **1.3 Dynamic Waypoint Reordering & Dragging** | **Conditionally Viable** | Standard GIS planning capability. Risk: invalidating existing scientific context if a waypoint is moved outside the region boundary or into an unstudied area. | Require coordinate boundary validation. Invalidate any cached terrain or scientific assessments when coordinates change. |
| **1.4 Turn Angle & Sinuousity Metrics** | **Conditionally Viable** | Proposed calculating turn angles to assess rover or astronaut fatigue. Rover turn friction does not translate linearly to bipedal turning. | Present as geometric properties (e.g., "cumulative heading change: $42^\circ$") rather than fatigue or difficulty scores. |
| **1.5 Reverse Route & Walkback Geometry** | **Supported** | Inverting an ordered array of waypoints $[W_n, \dots, W_0]$ is mathematically trivial and geometrically sound. | Validated as a geometric utility. Do not automatically certify walkback feasibility without elevation profile reversal (uphill vs downhill metabolic differences). |

---

### Pillar 2: Dynamic Elevation & Slope Hazard Profiler

| Subcomponent | Classification | Summary of Flaws & Scientific Risks | Required Evidence & Corrected Approach |
| :--- | :--- | :--- | :--- |
| **2.1 DEM Path Profiling** | **Conditionally Viable** | Sampling elevation along a resampled great-circle path from a High-Resolution Stereo Camera (HRSC) or CTX digital elevation model (DEM). | Requires verified, co-registered GeoTIFF/raster DEM tiles. Must explicitly report horizontal resolution (e.g., HRSC $\sim 50\text{ m/px}$, CTX $\sim 20\text{ m/px}$) and vertical uncertainty ($\pm 5\text{–}15\text{ m}$). |
| **2.2 Slope Categorization ($0\text{–}10^\circ$, $10\text{–}18^\circ$, $>18^\circ$, $>25^\circ$)** | **Unsupported** | **Critical Defect:** The thresholds $0\text{–}10^\circ$ (safe), $10\text{–}18^\circ$ (caution), and $>18^\circ$ (impassable) were invented or copied from robotic rover mobility constraints (e.g., Curiosity/Perseverance wheel slip thresholds) and labeled as "NASA astronaut suit standards." | Suited human mobility on Mars gravity ($0.38\text{ g}$) is an active research domain (e.g., Apollo lunar surface debriefs, NASA Desert RATS, Carr 2005, Minetti 2002). Astronauts can scramble up steeper slopes than wheeled rovers on rock, but lose traction rapidly on loose scree. Thresholds must be presented as **configurable scenario limits**, never as official NASA safety certifications. |
| **2.3 Slope-Based Speed Penalty ($0.08\text{ km/h per degree}$)** | **Unsupported** | Assumes a rigid linear deceleration of $0.08\text{ km/h}$ per degree of incline. Human metabolic cost on slopes follows non-linear U-shaped curves (e.g., Minetti et al. 2002, Margaria 1968), where moderate downhill slopes reduce cost but steep downhill slopes increase braking work. | Remove hardcoded linear equations. If slope modeling is implemented, present it as a hypothetical parametric tool with reference to experimental terrestrial/lunar analog literature, explicitly noting absence of validated Mars suit performance data. |
| **2.4 Micro-Relief Obstacle Assessment** | **Incorrect** | Claims that an orbital DEM can detect boulders and rock hazards for foot placement. | Orbital DEMs ($20\text{–}50\text{ m/px}$) cannot resolve sub-metre boulders, crevices, or loose regolith. Claiming terrain clearance from orbital DEMs creates dangerous false confidence. Label DEM slope as *macro-topography only*. |

---

### Pillar 3: Multi-Mission 4-Layer Scientific Stack

| Subcomponent | Classification | Summary of Flaws & Scientific Risks | Required Evidence & Corrected Approach |
| :--- | :--- | :--- | :--- |
| **3.1 CTX Global/Regional Basemap** | **Supported** | NASA MRO Context Camera (CTX) mosaics ($\sim 6\text{ m/px}$) provide standard high-resolution regional context across Gale, Jezero, and Oxia Planum. | Maintain existing tile-based TMS/XYZ integration. Include complete PDS product ID lineage and USGS Astrogeology attribution. |
| **3.2 HiRISE Precision DTM & Orthorectified Imagery** | **Supported** | NASA MRO HiRISE imagery ($25\text{–}50\text{ cm/px}$) exists for high-priority landing sites and rover traverses (e.g., Arc Pass in Gale, Western Delta in Jezero). | Limit HiRISE layers to areas with verified, processed public PDS DTM products. Do not claim universal coverage. |
| **3.3 Universal CRISM 18-Band Spectral Overlays** | **Unsupported** | Proposes universal 18-band spectral cubes across all traverse paths to automatically detect clay, hematite, sulfates, and olivine. | CRISM data has limited spatial coverage, significant cryocooler-related noise in later mission phases, and requires extensive photometric and atmospheric correction. Only display verified, published mineralogical map polygons (e.g., Milliken et al. 2010 for Gale; Stack et al. 2020 for Jezero) with source citations. |
| **3.4 Real-Time Atmospheric & Thermal Inertia Integration** | **Conditionally Viable** | Proposes pulling live Martian atmospheric conditions from REMS/MEDA or global climate models. | Clearly distinguish between historical rover environmental station measurements (REMS on Curiosity, MEDA on Perseverance) and regional climate models (Mars Climate Database). Historical data must display acquisition date/sol and diurnal phase. |

---

### Pillar 4: Ground-Level Outcrop Vision

| Subcomponent | Classification | Summary of Flaws & Scientific Risks | Required Evidence & Corrected Approach |
| :--- | :--- | :--- | :--- |
| **4.1 Ground Rover Photography Catalog** | **Supported** | Curiosity (Mastcam, MAHLI, ChemCam RMI) and Perseverance (Mastcam-Z, SuperCam RMI) have acquired tens of thousands of scientifically calibrated surface images. | Supported when tied to verified rover sol/site/drive locations, PDS product IDs, and instrument metadata. Maintain existing `PhotographEvidence` contract. |
| **4.2 "Astronaut First-Person Viewpoint Simulation"** | **Incorrect** | Claims that rover mast camera mosaics represent what an astronaut walking anywhere on the map would see. | Mastcam images are taken from fixed, historic rover positions at a specific mast height ($\approx 2\text{ m}$), with specific narrow/medium fields of view and pointing vectors. They cannot be projected arbitrarily along hypothetical human walk paths. Must be presented strictly as *ground-truth observations from robotic precursor locations*. |
| **4.3 3D Terrain Synthetic Outcrop Rendering** | **Unsupported** | Proposes synthetic 3D mesh rendering of rock faces from sparse orbital imagery. | Orbital DEMs lack the vertical resolution to synthesize accurate outcrop stratigraphy or rock texture. Synthetic rendering creates fabricated geologic features not present in primary data. |

---

### Pillar 5: Operational EVA Consumables & Mobility Engine

| Subcomponent | Classification | Summary of Flaws & Scientific Risks | Required Evidence & Corrected Approach |
| :--- | :--- | :--- | :--- |
| **5.1 Hardcoded Walking Speed ($2.2\text{ km/h}$)** | **Unsupported** | Asserts $2.2\text{ km/h}$ as the standard NASA Mars walking speed. | Terrestrial unsuited walking averages $4.5\text{–}5\text{ km/h}$; Apollo lunar EVA suited traverse speeds ranged from $1.5\text{–}3.5\text{ km/h}$ (often using hopping/loping gaits); Mars suit prototypes in analog studies show speeds varying between $1.0\text{–}3.0\text{ km/h}$ depending on terrain. Must be user-configurable with an explicit uncertainty range $[1.0, 3.5]\text{ km/h}$. |
| **5.2 Hardcoded Oxygen Rate ($0.06\text{ kg/h}$)** | **Unsupported** | Hardcodes $0.06\text{ kg/h}$ ($1.0\text{ g/min}$) as a universal astronaut oxygen consumption rate. | Metabolic rate during EVA varies widely ($150\text{–}450\text{ W}$, or $200\text{–}600\text{ kcal/h}$), which scales oxygen uptake from $\approx 0.04\text{ to } 0.12\text{ kg/h}$ depending on astronaut mass, suit stiffness, walking velocity, and slope. Present only as a baseline default in an exploratory scenario slider with prominent disclaimers. |
| **5.3 Suit & Comms Power Consumption ($180\text{ W} + 40\text{ W}$)** | **Unsupported** | Specific electrical loads for Portable Life Support System (PLSS) fans, pumps, sublimators, and S-band avionics are not standardized for Mars surface suits. | Label as *illustrative mission scenario assumptions*. Do not certify battery depletion margins. |
| **5.4 Mandatory Reserve Rules ($25\%$ Reserve)** | **Conditionally Viable** | The concept of contingency margins ($20\text{–}30\%$ reserves for oxygen, battery, and water) is standard aerospace practice (e.g., NASA EVA Flight Rules). | Allowed as a planning heuristic, provided the reserve percentage is configurable and clearly labeled as an operational margin policy rather than a physical law. |
| **5.5 Robotic vs Human Walkback Limits** | **Unsupported** | Uses rover speed ($8\text{ km/h}$) and rover range ($20\text{ km}$) to calculate walkback safety limits. | A human cannot walk back $20\text{ km}$ in a pressurized suit under typical single-EVA consumables budgets ($\le 6\text{–}8\text{ hours}$). The walkback rule dictates that astronauts must never travel further in a pressurized or unpressurized rover than they can physically walk back to the habitat/ascent vehicle on remaining suit consumables. |

---

### Pillar 6: Astronaut Habitat Console & Mission Feasibility

| Subcomponent | Classification | Summary of Flaws & Scientific Risks | Required Evidence & Corrected Approach |
| :--- | :--- | :--- | :--- |
| **6.1 Multi-Tier Feasibility Engine** | **Supported** | The existing 4-tier model (`Feasible`, `Caution`, `Infeasible`, `Unverified`) correctly reflects rigorous scientific decision-making under uncertainty. | Strictly retain the 4-tier contract. Never reduce to binary Pass/Fail. |
| **6.2 Auto-Certification from Assumed Values** | **Incorrect** | **Critical Defect:** Generating a "FEASIBLE" certification when key environmental or terrain layers are missing, or when using default/manual consumables estimates. | If any mandatory domain (terrain/slope, radiation, thermal, life support margin, walkback reserve) lacks verified source data, the overall assessment **MUST remain `Unverified`**. Defaults and hypothetical sliders must never flip an assessment from `Unverified` to `Feasible`. |
| **6.3 Science Return Scoring Algorithm** | **Conditionally Viable** | Proposes calculating a "Science ROI Score" based on waypoints visited and sample targets. | Acceptable as an educational planning heuristic if clearly identified as a user-customizable scoring rubric, not an objective NASA scientific metric. |
| **6.4 Real-Time Hab Telemetry Simulation** | **Conditionally Viable** | Visual console simulating telemetry readouts (suit pressure, core temp, heart rate). | Must be labeled as *Simulated Scenario Feed / Training Mode*. Cannot be conflated with flight telemetry. |

---

## 4. Scientific Literature and Data Source Matrix

To transition Conditionally Viable features into scientifically verified implementations in future phases, the following published peer-reviewed literature and primary NASA data sources must be consulted:

| Domain | Required Primary Scientific Sources | Key Empirical Constraints |
| :--- | :--- | :--- |
| **Martian Topography & Geodesy** | - Smith et al. (2001), *Mars Orbiter Laser Altimeter (MOLA)*, JGR.<br>- Kirk et al. (2008), *HiRISE Photogrammetry*, JGR Planets.<br>- Archinal et al. (2018), *IAU/IAG Cartographic Coordinates*. | Planetary radii: $a = 3396.2\text{ km}$, $b = 3376.2\text{ km}$. Spatial resolution limits of orbital DTMs must be stated. |
| **Human Locomotion in Reduced Gravity** | - Minetti, A. E. et al. (2002), *Energy cost and locomotion mechanics on gradients in simulated Mars gravity*, J. Appl. Physiol.<br>- Carr, C. E. (2005), *Human Locomotion on Mars: Biomechanical Modeling*, MIT PhD Thesis.<br>- Norcross et al. (2010), *Metabolic Costs of Suited Ambulation in Lunar and Martian Gravity*, NASA TP-2010-216115. | Metabolic cost is non-linear with slope. Speeds vary from $1.2\text{ to } 3.2\text{ km/h}$. Hopping vs walking transition occurs at lower speeds in $0.38\text{ g}$. |
| **EVA Life Support & Consumables** | - NASA (2020), *Human Integration Design Handbook (HIDH)*, NASA/SP-2010-3407/REV1.<br>- NASA (2023), *Exploration Extravehicular Activity (xEVA) System Requirements Document (SRD)*.<br>- Chappell et al. (2017), *NASA Desert RATS Operations and Consumables Baselines*. | Metabolic rate: $200\text{–}600\text{ kcal/h}$ ($230\text{–}700\text{ W}$). Oxygen consumption: $0.04\text{–}0.12\text{ kg/h}$. Standard nominal EVA duration: $\le 8\text{ hours}$. Mandatory reserve: $\ge 25\text{–}30\%$. |
| **Martian Radiation Environment** | - Hassler et al. (2014), *Mars Science Laboratory Radiation Assessment Detector (RAD) Surface Measurements*, Science.<br>- Zeitlin et al. (2019), *GCR and Solar Particle Event Doses at Gale Crater*, Life Sci. Space Res. | Galactic Cosmic Ray (GCR) background dose on surface: $\approx 0.6\text{–}0.7\text{ mSv/day}$. Solar Particle Events (SPE) can deliver lethal doses in hours without regolith/habitat shielding. |
| **Planetary Geology & Mineralogy** | - Grotzinger et al. (2014), *A Habitable Fluvio-Lacustrine Environment at Gale Crater*, Science.<br>- Stack et al. (2020), *Photogeologic Map of the Jezero Crater Landing Site*, Space Sci. Rev.<br>- Milliken et al. (2010), *Clay and Sulfate Minerals in Gale Crater*, Icarus. | Use mapped geologic unit polygons with verified mineral associations. Do not extrapolate raw spectral channels without full radiometric processing. |

---

## 5. Architectural Guidance for Future Work

1. **Keep Pure Geodesy Independent:** Retain `lib/map/geodesy.ts` as a pure mathematical module without domain-specific feasibility logic.
2. **Preserve the Evidence Register Pattern:** Any future elevation profile or terrain assessment must query an explicit evidence provider (e.g., `TerrainElevationEvidence`), record the product ID, and propagate an `Unverified` status if coverage is incomplete.
3. **Isolate Scenario Simulation from Certified Feasibility:**
   - Create a dedicated `ScenarioCalculator` UI sandbox where users can adjust walking speed, oxygen burn rate, and suit power to explore trade-offs.
   - Strictly decouple this scenario sandbox from the authoritative `assessMissionReadiness` engine. Feasibility must remain tied to audited, empirical mission constraints.
4. **Respect Parallel Worktrees:** Never edit regional files (`regions/gale/`, `regions/jezero/`, `regions/oxia/`) or shared MapLibre workspace files while other agents or developers own those branches.
