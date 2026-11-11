# Marswalk Planner — Agent Context: Jezero Crater

**Owner:** Aung Khant Min  
**Region ID:** `jezero`  
**Project:** NASA Space Apps Challenge — *Interplanetary Survival Guide: Martian Map*  
**Team:** Aung Khant Min (Jezero), Thaw Thaw Tun (Oxia), Gale owner (Gale and shared coordination)  
**Status:** Implementation handoff — not a scientific-approval certificate

> **Read this file first.** Then read the repository's `PRD.md`, `DESIGN.md`, and `TEAM_CONTRACT.md` before modifying code. These shared files control product decisions, visual styling, and integration contracts. If the attached design file suggests simulated live EVA rehearsal, note that the **current approved release is pre-mission planning only**. Do not build real-time navigation or rehearsal unless the team changes scope.

## 1. What you are building

Own **Jezero-specific map content and geospatial integration** inside the one shared Marswalk app. Build a science-rich 2D map around the Perseverance landing/exploration area, including the western delta where the dataset permits. Help users explore real Mars imagery, view the recorded Perseverance traverse as historical context, inspect source-backed scientific targets, and add validated targets to a planned astronaut excursion.

**Do not create a separate Jezero app, separate design system, separate pathfinding engine, or separate frontend shell.** Jezero is a configuration/data package plugged into the shared Next.js + MapLibre GL JS app. The team shares FastAPI routing, geospatial processing, mission state, styles, and components.

### Required user experience
1. User selects **Jezero Crater** from the common region picker.
2. Map opens to a credible overview of the Perseverance corridor; detailed view respects the actual validated data footprint.
3. User can inspect optical imagery, terrain/hillshade/slope, geological/mineral context, and other layers **only when corresponding data is available and documented**.
4. The Perseverance traverse is displayed as a **recorded historical rover path**, visually distinct from hypothetical astronaut route candidates.
5. Science markers open a shared target detail card with rationale, source, activity, and an **Add stop** action. Multiple stops can be selected.
6. Route-planning controls and feasibility cards come from the shared app; if Jezero has not passed DEM/hazard checks, show **routing unavailable / Unverified**, not an invented route.
7. The UI behaves with narrow screens and offline/missing-data states according to `DESIGN.md`.

## 2. Scientific focus

**Guiding science question:** *What can delta sediments and nearby rocks reveal about Jezero's ancient lake and its past habitability?*

Curate a small, defensible set of mission objectives around:
- Delta and sedimentary stratification, including clues to the ancient lake environment.
- Carbonate-bearing or other published geological/mineral targets, **where products and coordinates support them**.
- Documented Perseverance science/sample sites, clearly distinguishing **actual rover observations** from **proposed astronaut investigation activities**.

**First content milestone:** ≥3 candidate source-backed science targets. A target must not become a selectable routed waypoint until its location and planetary coordinate convention are verified. If its exact position is unresolved, display it in the catalog as *location unverified*; do not manufacture coordinates.

## 3. Data responsibilities

| Data group | Candidate authority / source | Expected output | Caveat |
|---|---|---|---|
| Mission context and traverse | [NASA Perseverance location map](https://science.nasa.gov/mission/mars-2020-perseverance/location-map/) | Contextual recorded rover track and mission overview | Check whether downloadable georeferenced geometry exists; do not trace an image and claim survey precision |
| Orbital optical imagery | MRO HiRISE / CTX via NASA PDS / USGS | Credited basemap source(s), accessible tile assets or processing instructions | Footprint and licensing/attribution must be documented |
| High-resolution terrain | USGS Jezero HiRISE terrain mosaic, including newer western coverage | DEM inventory; quality/confidence layer; proposed detailed AOI | Reported grid spacing ≠ guaranteed hazard-detection accuracy |
| Broader terrain | CTX / HRSC / MOLA where relevant | Regional view only if too coarse for local traversal | Never silently enable route planning using context-only terrain |
| Geology/mineralogy | NASA PDS / published Jezero geological products; CRISM if coverage applies | Science overlay with units/classes and evidence references | Distinguish interpreted geological units from raw observations |
| Historical weather | Perseverance MEDA archive | Optional environmental context card with measurement sol/date/location | Historical measurements are not future mission forecasts |
| Radiation | A suitable published model/observation only if supportable | Optional evidence card | Do not infer local astronaut dose from unsupported inputs |

**First source milestone:** inventory authoritative source URLs, original product IDs, instrument, acquisition time (if known), native pixel scale, Martian CRS, vertical reference, file format, footprint, any confidence product, and legal attribution. Mark unresolved fields `null` / `pending`, never guess.

## 4. Coordinates and geospatial rules

Canonical geographic representation across the team:
- **Planetocentric latitude** in degrees.
- **East-positive longitude 0–360°** in degrees.
- Spatial calculations use a **verified local Martian projected metric CRS**, with its reference sphere/ellipsoid and datum recorded.
- Verify source longitude conventions, equirectangular projection parameters, elevation datum, and GIS unit metadata before transforming any product.
- Do **not** use Earth-default distance measurements or default Web Mercator assumptions for Marswalking distances.

MapLibre can render prepared Martian raster/tiles, but correct planetary geometry and scale require explicit validation. Region view center is **not** a verified science waypoint.

## 5. Shared integration contract

Contribute under **only** these planned region-owned paths (adjust the root to the existing repository structure if needed):

```text
regions/jezero/
  manifest.json              # Must match shared region manifest contract
  targets.json               # Curated target catalog with provenance
  sources.md                 # Scientific source register and limitations
  layers/                   # Tile/overlay metadata and derived-asset references
  geometry/                 # Audited AOI and coverage polygons, if available
  README.md                 # How to use this Jezero region package
```

Use the exact schema in `TEAM_CONTRACT.md`. Important fields:
- Region: `id`, `name`, `mission_context`, `coordinate_system`, `view_center`, `data_status`, `dataset_version`, `layers`, `targets`, `routing`, `source_references`.
- `data_status`: `illustrative`, `metadata_verified`, or `raster_audited`; never elevate the status without corresponding evidence.
- Layers: `id`, `type`, `availability`, `source_id`, `observation_date`, `spatial_resolution_m`, `coverage`, `limitations`.
- Targets: `id`, `title`, `scientific_goal`, `priority_category`, `coordinates`, `coordinate_verified`, `source_ids`, `activity`, optional `media_source`.
- Routing: `enabled`, `reason`, optional `eligibility_dataset_id`, `policy_version`.

**Coordinate objects, field names, types, and allowed enum values must be shared across all three regions.** Never create Jezero-only render behavior in common UI without discussing it with the team.

### Stable IDs and versioning
- Use region-prefixed stable IDs, e.g. `jezero-target-...`, `jezero-layer-...`.
- Record `dataset_version` and source-product revisions; a saved mission must be marked for revalidation if versions change.
- Link every target to references in the region source register.
- Illustrative demo geometry must be distinctly labeled `Scenario` and **not** submitted as a verified NASA target.

## 6. Design instructions from shared DESIGN.md

Use the shared dark mission console; do not invent a new color palette. Main tokens:

| Role | Color |
|---|---|
| Background | `#09111F` |
| Panels | `#111D30` |
| Raised | `#1B2A40` |
| Border | `#334761` |
| Primary / selected route | `#59E3FA` |
| Science markers | `#D0BDFF` |
| Caution | `#FFC36B` |
| Critical | `#FF8D9A` |
| Recorded traverse | `#D6DEE8` |

- Map-first, tablet-landscape layout with collapsible 320–360 px side panel; mobile bottom sheet at narrow widths.
- Optical basemap + science stops + mission context by default; extra overlays controlled by layer manager.
- Selected astronaut route = solid cyan; alternate = dashed cyan; **Perseverance historical traverse = neutral dotted**; stop = violet diamond; data gap = bounded/hatching.
- Provide north marker, scale, visible legend, layer opacity, attribution, and understandable data-status labels.
- Every measurement is labeled `Observed`, `Derived`, `Interpreted`, `Modeled`, `Scenario`, or `Unavailable`.
- Keep essential actions keyboard-accessible and do not make adding targets map-click-only.

## 7. Work in this order (parallel-friendly)

**Milestone A — Immediate, UI/data scaffold (do not wait for giant DEM downloads)**
- [ ] Inspect shared frontend, PRD, design system, and region contract.
- [ ] Create `regions/jezero/manifest.json` with accurate *pending* status and working metadata structure.
- [ ] Connect Jezero to the **existing** shared region picker and shared map/target components (coordinate UI edits with Gale owner).
- [ ] Build a truthful source catalog and ≥3 candidate objective cards; unresolved coordinates remain non-routable.
- [ ] Show source details, unavailable layer reasons, and historical-vs-scenario labels.

**Milestone B — Geospatial assets**
- [ ] Identify/download permitted real imagery and DEM products.
- [ ] Document original CRS, nodata, vertical units, footprint, quality, and source resolution.
- [ ] Produce correctly projected overview tiles, and/or a clear shared preprocessing job.
- [ ] Check registration of HiRISE/CTX/target geometry; create verifiable coverage footprints and provenance.
- [ ] Include confidence and unknown-coverage treatment; **do not** automatically mark valid DEM pixels as safe.

**Milestone C — Handoff to shared routing**
- [ ] Provide audited AOI and terrain-quality/obstacle/unknown masks where available.
- [ ] Only request `routing.enabled=true` after project-level threshold and hazard validation are approved.
- [ ] Hand the shared engine target coordinates, local projected units, dataset versions, and validation notes.

## 8. Tests and acceptance checklist

- [ ] Jezero opens in the same shell, interactions, typography and controls as Gale/Oxia.
- [ ] Map location and layer sources are cited; illustrative content clearly flagged.
- [ ] Science markers and catalog stay synchronized; ≥3 candidate targets have credible references.
- [ ] Recorded Perseverance track is NOT shown as an astronaut-generated plan.
- [ ] Wrong CRS, missing footprint, or unverifiable target coordinates do not silently enable routing.
- [ ] Layer controls show coverage gaps, opacity, legends and evidence information.
- [ ] Desktop/tablet/narrow UI remains accessible and free of horizontal overflow.
- [ ] Missing or failed data loads have clear states; a previously cached map remains useful.
- [ ] Region passes schema/type checks and does not break other region fixtures.

## 9. Coordination / Git practice

- Work on a named region branch such as `feat/jezero-map`.
- Change `regions/jezero/**` freely; shared `components/**`, `lib/contracts/**`, route API, and theme files require team coordination.
- Submit small pull requests with screenshots, manifest/schema checks, source URLs, licenses/credits, known limitations, and exact unverified items.
- Do not commit massive original imagery files into Git without agreement; use documented object storage paths and scripts.
- The Gale owner coordinates shared app integration; **do not wait for Gale-specific geological data** to finish Jezero's manifest/catalog work.

## 10. Important scope and safety rules

1. First release = **2D**, pre-mission planning only. No 3D, live tracking, EVA rehearsal, or operational navigation.
2. Three modes of route alternatives (safest, fastest, science-focused) are implemented by the **shared engine**, not region owners.
3. Six mandatory assessments for an overall `Feasible` status: terrain, oxygen, battery, time, radiation, return/recovery. Any mandatory unknown means `Unverified` unless a known failure makes it `Infeasible`.
4. Use only documented suit inputs and scientifically justified environmental models. No invented oxygen, battery, radiation, slope safety values, or rovers already operating where they are not.
5. A science map that honestly says `Detailed routing unavailable: coverage not audited` is an acceptable first shared-frontend milestone.

## 11. Immediate agent instruction

**Start by auditing the existing repo.** Report the files/components to reuse, confirm the current manifest shape, then implement the **Jezero region manifest + source register + catalog + integration into the shared map shell**. Do not rebuild the shell. If an essential shared contract is missing, propose the smallest compatible type/schema change for team approval and proceed with a self-contained region package. Finish by listing changed files, screenshot/test results, source provenance, and any blockers.
