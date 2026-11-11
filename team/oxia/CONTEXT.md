# Marswalk Planner — Agent Context: Oxia Planum

**Owner:** Thaw Thaw Tun  
**Region ID:** `oxia`  
**Project:** NASA Space Apps Challenge — *Interplanetary Survival Guide: Martian Map*  
**Team:** Aung Khant Min (Jezero), Thaw Thaw Tun (Oxia), Gale owner (Gale and shared coordination)  
**Status:** Implementation handoff — not a scientific-approval certificate

> **Read this file first.** Then read the repository's `PRD.md`, `DESIGN.md`, and `TEAM_CONTRACT.md`. Those shared documents control UX, tech stack, and region schemas. Note a scope discrepancy: the design document sketches optional EVA rehearsal, but the **approved first release is pre-mission planning only**. Do not add rehearsal, live positioning, or navigation unless scope changes.

## 1. What you are building

Own the **Oxia Planum map and ESA-focused science content** inside a single shared Marswalk application. Your map should explore the future Rosalind Franklin landing/exploration region using source-backed orbital imagery, geologic interpretation, available terrain products, and **proposed** science targets.

**Critical factual distinction:** Rosalind Franklin's landing and traverse are **planned/future**, not a completed rover mission. Never show a recorded Rosalind Franklin rover traverse, fabricated rover weather station, or actual samples collected at Oxia. Show the landing region as **Planned mission area** and astronaut science stops as **Scenario / Proposed**.

**Do not build a separate app, frontend layout, route engine, or new design system.** Oxia supplies configuration and data to the shared Next.js + MapLibre 2D map and shared FastAPI planning backend.

### Required user experience
1. The common site picker opens **Oxia Planum** with a clear **Planned mission area** label.
2. The user sees an orbital-image regional map, geographic coverage limits, planned landing-area boundary when sourced, and geological/clay-rich units where available.
3. Selecting a science marker opens the common source-backed target card: question, evidence, proposed field activity, source link, **Add stop**.
4. Show a science catalog that works independently of map markers. Separate *published interpreted geological feature* from *proposed future astronaut stop*.
5. Layer manager exposes opacity, legends and provenance; unavailable environmental measurements are described in the data-info panel, not replaced with fictional local sensor data.
6. Shared planner allows target selection, but detailed routing remains off until Oxia DEM footprint/hazard/threshold validation has passed.

## 2. Scientific focus

**Guiding science question:** *Which clay-rich units and subsurface sampling targets could help reconstruct Oxia's past habitability?*

Prioritize a small, defensible catalog related to:
- Published clay-bearing bedrock/geological units and their relevance to aqueous history.
- Stratigraphic/geological boundaries and science-interesting surface materials identified by mapped studies.
- Proposed subsurface or near-surface sampling opportunities related to astrobiology, marked as **future investigation concepts**, not actual findings.

**First content milestone:** ≥3 candidate published map features/science objectives with cited source material and explicit evidence type. Only enable map-point route selection after real coordinates or polygons are verified in a declared Mars CRS. If the scientific unit is a polygon, don't invent a precise sample-point coordinate within it.

## 3. Data responsibilities

| Data group | Candidate authority / source | Expected output | Caveat |
|---|---|---|---|
| Mission identity and planned region | [ESA Rosalind Franklin rover](https://www.esa.int/missions/about-us/directorates/human-and-robotic-exploration/mars/exomars/rosalind-franklin-rover) | Mission context card with **Planned** badge | No completed rover traverses or landed observations |
| Regional geology | [ESA geological mapping overview](https://www.esa.int/articles/about-us/directorates/human-and-robotic-exploration/best-geological-map-for-a-european-rover-on-mars) and linked source papers/data | Geology/mineral-unit overlay and science objectives | Geological units are scientific interpretations; preserve citations |
| Optical imagery | MRO CTX/HiRISE, NASA PDS, published Oxia cartography | Credited orbital map/tiles and metadata | Record imagery acquisition and actual coverage |
| Terrain | Published Oxia HiRISE stereo DTMs, CTX products, geological-map DEM releases | DEM/quality inventory with source lineage | Distinguish stereo DEM from AI/ML-generated or blended DEM; pixel size != verified local hazard resolution |
| Clay mineral evidence | CRISM or published map interpretations, where verified | Thematic clay/geology overlay | Do not imply mineral certainty beyond the published method/scale |
| Atmospheric context | Suitable orbital records/models, only where published and applicable | Optional context panel | No local Rosalind Franklin surface weather measurements |
| Radiation | Validated regional model only if supportable | Optional context | No local rover radiation measurement; mission dose likely unavailable |

**Source inventory for every layer/target:** agency, instrument, dataset/product identifier, DOI/URL, acquisition or publication date, native resolution, CRS, vertical reference, footprint, processing method, quality constraints, reuse/credit requirements. Unknown fields remain explicitly pending.

## 4. DEM provenance is especially important in Oxia

Different published Oxia products can use **different elevation-generation approaches**. Do not combine them into one undifferentiated `high resolution DEM` layer. Record per product whether it is:
- Stereo-photogrammetric DEM from orbital stereo pairs.
- Model-derived / machine-learning terrain estimate.
- Merged or resampled regional terrain product.
- Contextual low-resolution elevation product.

Each has different uncertainty and suitability for scientific visualization versus local route screening. A 0.5 m pixel grid from an ML-derived product does **not** prove 0.5 m independently measured terrain accuracy. Default detailed routing to **disabled** until the team explicitly validates the terrain-quality, obstacle, and threshold policies.

## 5. Coordinates and geospatial rules

Canonical across Marswalk:
- **Planetocentric latitude**, degrees.
- **East-positive longitude in 0–360°**, degrees. Oxia is near the high-east-longitude portion of the 0–360 system; **do not accidentally treat ~335° east as 335° west or as −335°**.
- Use verified locally projected Martian metric coordinates for slope, length and routing.
- Verify each source's projection center, datum, sphere radius, planetographic vs planetocentric convention, and elevation reference before overlay alignment.
- Do not use Earth geodesic length or Earth Web Mercator metrics for Martian traverses.

A map view center can remain provisional in demo mode; never present it as a surveyed science target.

## 6. Shared integration contract

Make Oxia changes under the planned region folder, adapted to the actual repository:

```text
regions/oxia/
  manifest.json             # Shared manifest schema; no Oxia-only field names
  targets.json              # Source-backed catalog, verified geolocations only when known
  sources.md                # Scientific references and pending evidence
  layers/                  # Imagery/DEM/geology metadata, tile references
  geometry/                # Planned boundary/coverage polygons when validated
  README.md                # Oxia integration and limitations
```

Use the existing `TEAM_CONTRACT.md` field names and enums exactly:
- Region: `id`, `name`, `mission_context`, `coordinate_system`, `view_center`, `data_status`, `dataset_version`, `layers`, `targets`, `routing`, `source_references`.
- `data_status`: `illustrative` / `metadata_verified` / `raster_audited`.
- Layer `availability`: `available` / `unavailable` / `pending`.
- Science target: stable id, title, goal, curated priority category/rationale, coordinates and coordinate-verified flag, source ids, proposed activity, optional media source.
- Routing is an explicit gate with `enabled=false` until region data is approved; include a user-readable `reason`.

**Stable IDs:** `oxia-target-...`, `oxia-layer-...`; record dataset versions and references so the shared app can invalidate stale saved missions.

## 7. Design instructions from shared DESIGN.md

Shared palette and conventions (do not create a new Oxia theme):

| Role | Color |
|---|---|
| Background | `#09111F` |
| Panels | `#111D30` |
| Raised | `#1B2A40` |
| Border | `#334761` |
| Selected route / primary action | `#59E3FA` |
| Science marker | `#D0BDFF` |
| Caution | `#FFC36B` |
| Blocked | `#FF8D9A` |
| Historical rover path (if any supported historical context) | `#D6DEE8` |

- Map is dominant; side panel collapses on landscape, bottom sheet on narrow displays.
- Planned landing area uses a **dashed boundary plus explicit Planned label**; do not use historical-traverse styling for a future rover.
- Science targets use numbered violet diamonds; source-backed geology uses separate legend and evidence type `Interpreted`.
- Coverage gaps are bounded/hatched, not silently filled with simulated safe terrain.
- Show north/scale/legend/attribution; optional thematic layers with visibility and opacity.
- Evidence types: `Observed`, `Derived`, `Interpreted`, `Modeled`, `Scenario`, `Unavailable`.
- One primary action per panel; keyboard-accessible controls and 390 px no horizontal scrolling.

## 8. Work in this order (parallel-friendly)

**Milestone A — UI/data scaffold first**
- [ ] Read shared source files and inspect the common app components.
- [ ] Implement `regions/oxia/manifest.json` with truthful planned-mission status and pending routing state.
- [ ] Connect Oxia to shared site picker/map/catalog (coordinate any shared component edits with Gale owner).
- [ ] Add ≥3 source-backed candidate science targets/features, visibly distinguishing published feature from proposed stop.
- [ ] Show ESA references and current availability limits in target/layer info.

**Milestone B — Scientific assets**
- [ ] Register relevant orbital imagery, geology/clay units, candidate DTMs.
- [ ] Trace dataset provenance, imagery timestamps, CRS, native grid spacing, vertical datum and valid coverage.
- [ ] Produce georeferenced map tiles/layers or processing instructions, with attribution.
- [ ] Review stereo-vs-model DEM source classifications and overlay alignment.
- [ ] Generate audited coverage/quality polygons where possible; unknown terrain remains unknown.

**Milestone C — Handoff to shared routing**
- [ ] Provide verified target geometry in canonical Mars geographic coordinates and projected metric CRS metadata.
- [ ] Provide source-quality masks and coverage geometry; never infer obstacle absence from missing data.
- [ ] Leave `routing.enabled=false` until the team validates hazards and routing thresholds.

## 9. Tests and acceptance checklist

- [ ] Oxia opens from the exact same frontend shell as Gale and Jezero.
- [ ] **Planned mission area** is visible and no recorded Rosalind Franklin traverse is falsely shown.
- [ ] ≥3 source-backed objectives/features in catalog; proposed activities never mislabeled as actual samples.
- [ ] Geo markers do not pretend to have verified coordinates when source maps are not georeferenced.
- [ ] Map layers expose agency, instrument, dates, resolution/coverage, processing and limitations.
- [ ] Invalid/missing terrain blocks detailed routing with a clear explanation, while map exploration still works.
- [ ] Shared markers, legend, layer manager, mission editor, narrow-screen layout, and source cards remain consistent.
- [ ] Schema/type checks pass; contributions do not break Jezero/Gale fixtures.

## 10. Coordination / Git practice

- Use a branch such as `feat/oxia-map`.
- Own `regions/oxia/**`; shared UI / contracts / FastAPI modifications require coordination.
- Small PRs include screenshot, references, data version, file licensing/credit, test results, and uncertainties.
- Keep large DEM/raster files out of Git unless agreed; document object storage, preprocessing, and retrieval.
- You may fully progress on regional content while Gale and Jezero teams work in parallel.

## 11. Product constraints

1. Release 1 is **2D, pre-mission planning only**. No 3D, rover simulation, EVA tracking, or flight-qualified navigation.
2. All regions share multiple science stops, editable mission, round-trip/one-way, route comparisons, save/reopen and mission brief functionality.
3. All six feasibility assessments must be supported before overall `Feasible`; missing essential evidence => `Unverified` (unless a known failure proves `Infeasible`).
4. Do not fabricate NASA/ESA measurements, mission completions, science coordinates, oxygen/battery/radiation metrics, or official slope safety limits.
5. A region that accurately reports **planning unavailable pending evidence** is still an acceptable first frontend milestone.

## 12. Immediate agent instruction

**First inspect the existing repo and shared contracts.** Create the Oxia manifest, scientific source register, and initial source-backed target catalog, then integrate them into the shared map/target components. Reuse the common design; do not fork a site-specific shell. If a shared contract must change, propose a narrow team-wide revision rather than diverging independently. At completion report changed files, screenshot/test results, source evidence, and remaining scientific blockers.
