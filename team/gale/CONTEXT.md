# Marswalk Planner — Agent Context: Gale Crater

**Owner:** Gale region owner (you)  
**Region ID:** `gale`  
**Project:** NASA Space Apps Challenge — *Interplanetary Survival Guide: Martian Map*  
**Team:** Gale (you; also coordinating shared integration), Aung Khant Min (Jezero), Thaw Thaw Tun (Oxia)  
**Status:** Implementation handoff; **not** scientific or operational safety approval

> **Agent: read this first**, then inspect the actual repository and read `PRD.md`, `DESIGN.md`, and `TEAM_CONTRACT.md`. Treat those shared documents as the source of truth. If the design document describes EVA *rehearsal*, simulation, or offline route calculations, note that the team's approved first release is **2D pre-mission planning only**; do not implement simulated live EVA, real-time positioning, 3D, or offline new-route calculation. Do not assume demo geometry or source-metadata discovery counts as validated Mars navigation data.

## 1. Mission and assignment

Build the **Gale Crater region package** within one common Marswalk application. You are responsible for real, source-backed scientific content and a 2D map centered on the **Curiosity exploration corridor around lower Mount Sharp**, emphasizing the transition from clay-bearing to sulfate-bearing geology where the chosen imagery and DEM coverage permit.

**Guiding science question:** *How do changes from clay-bearing to sulfate-bearing rocks record changing water conditions in Gale Crater?*

Your deliverables must plug into the shared Next.js + TypeScript + MapLibre GL JS frontend and shared Python/FastAPI planning backend. You also coordinate shared contract/frontend integration between all three teammates; **do not build three separate apps or make Gale-specific behavior a hardcoded dependency of the shared UI**.

### End-user experience

1. Select **Gale Crater** from the same Jezero/Gale/Oxia picker; retain the shared console theme.
2. Open an orbital map showing source-backed terrain and the Curiosity exploration context, including the **recorded historical Curiosity traverse** only when its coordinates/source can be verified.
3. Inspect optional imagery, elevation/hillshade/slope, geology/mineralogy, thermal context, and supported historical environment cards. The map layer menu shows only available overlays; unavailable information is explained in data details.
4. Select multiple science objectives from catalog or mapped markers. Target cards show why a feature matters, proposed astronaut activity, evidence type, source, and **Add stop**.
5. Pick a habitat/base or valid arbitrary map point; choose one-way with a documented destination/recovery endpoint or round trip. Reorder targets and recalculate when routing is actually enabled.
6. Use shared route-comparison, resources, feasibility, save/reopen, and mission-brief components. Until approved data and safety policies exist, display **Detailed routing unavailable / Unverified** rather than fabricated paths or estimates.
7. Preserve interaction and map state across panels; support tablet-first layout and small screens.

## 2. Gale scientific content — your primary responsibilities

Build a defensible science catalog with at least **three candidate, source-backed** objectives such as:

- **Clay-bearing strata:** investigate evidence for water-related alteration and depositional conditions along Curiosity's documented exploration corridor.
- **Clay–sulfate transition:** characterize published stratigraphic/mineralogical changes and what they imply for Mars's climate history.
- **Sulfate-bearing layers or other documented Mount Sharp strata:** propose comparative sedimentological observations or sampling activities.

These are **objective themes**, not verified waypoint coordinates. Choose actual named outcrops/features only after verifying their scientific references and location. Never invent exact coordinates, elevations, images, instrument readings, priority rankings, or an astronaut-safe path. Proposed astronaut activities are **Scenario**, geological unit assignments may be **Interpreted**, rover measurements **Observed**, and derived slope **Derived**.

Curated science priority categories must be transparent and source-backed; never present your own weighting as an official NASA ranking. A geological unit polygon is not automatically a point the astronaut can reach.

## 3. Gale-specific data audit and integration

| Data group | Primary candidate sources | Required output | Mandatory caveat |
|---|---|---|---|
| Mission context | [NASA Curiosity location map](https://science.nasa.gov/mission/msl-curiosity/location-map/) | Regional context and correctly labeled **recorded** rover traverse where verifiable geometry exists | Do not digitize an image and imply survey-quality GPS/navigation geometry |
| Orbital basemap | NASA PDS / USGS MRO HiRISE and CTX imagery | Properly credited optical tile layer, tile bounds and resolution metadata | Tile availability and actual coverage must be audited |
| Elevation / slope | [USGS Gale merged 1 m DEM](https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m); individual HiRISE stereo DTMs if available | DEM/source register, quality/coverage masks, candidate detailed AOIs | **Merged 1 m output pixels combine HiRISE, CTX, HRSC and MOLA sources; 1 m grid ≠ consistent 1 m measured detail** |
| Geology and mineralogy | Curiosity publications and mapped geological products; CRISM where scientifically applicable | Source-linked geology/mineral overlays and target rationale | Avoid implying regional CRISM signatures precisely resolve every field stop |
| Historical atmosphere | [Curiosity REMS archive](https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/curiosity/rems.html) | Historical environmental context card (parameter, units, site, sol/date) | Historical rover conditions are not current/future EVA forecasts |
| Historical radiation | Curiosity **RAD** instrument archived products through NASA PDS | Historical measured dose-rate / radiation context where product supports it | RAD rover measurements ≠ astronaut dose inside a suit; no unsupported shielding/exposure calculation |
| Thermal context | THEMIS or validated derived product where available | Optional temperature/thermal-inertia layer with appropriate units and date | Do not substitute thermal imagery for forecasted EVA conditions |

For **every** source, record source agency, instrument, product name/ID, URL/DOI, acquisition date/sol if supplied, publication date when relevant, native grid spacing, effective source resolution, Martian CRS, elevation datum/vertical units, file format, valid coverage footprint, nodata/quality flags, processing derivation, license/attribution, and limitations. Unknown fields must remain `null` or `pending`, never guessed.

### Important Gale DEM rule

The merged USGS DEM is useful for overview mapping, but a locally high-resolution-looking raster is not automatically eligible for local astronaut route screening. Preserve the underlying source-resolution/lineage information. Prioritize **audited HiRISE stereo subregions** for detailed routing, require obstacle and uncertainty evidence, and block unverified or mixed/coarse fallback cells until the project-level rules explicitly allow them.

## 4. Planetary coordinate contract

Use the **shared Martian conventions**, consistently across all three regions:

- **Planetocentric latitude**, degrees; **east-positive longitude 0–360°**, degrees.
- Record original source coordinates, longitude direction/range, latitude convention, reference sphere/ellipsoid, projection, vertical reference, and transformation details.
- Use a verified, locally projected **Martian metric CRS** for terrain slopes, distances, connectivity and routing. Never use Earth-default geodesic lengths or assume Web Mercator metres are valid on Mars.
- Keep target geometry and image/DEM footprints in known, explicitly transformed coordinate systems. Validate registration before declaring a mapped target routable.
- A provisional map center is for display only and must never be presented as a verified science target or landing/habitat point.

## 5. Shared integration contract — follow exactly

Adapt directories to the actual repository structure after inspection. Recommended owned paths:

```text
regions/gale/
  manifest.json           # Shared schema; initially pending/unverified
  targets.json            # Curated objectives and sourced coordinates
  sources.md              # Dataset register, status, limitations, credits
  layers/                 # Overlay and tile metadata/assets references
  geometry/               # Audited AOI and quality/coverage geometry, when ready
  README.md               # Gale integration notes and unverified items
```

Use the existing `TEAM_CONTRACT.md` interface, not a Gale-specific schema:

- Region: `id`, `name`, `mission_context`, `coordinate_system`, `view_center`, `data_status`, `dataset_version`, `layers`, `targets`, `routing`, `source_references`.
- Region `data_status`: `illustrative` | `metadata_verified` | `raster_audited` (only advance when substantiated).
- Layers: `id`, `type`, `availability` (`available` | `unavailable` | `pending`), `source_id`, `observation_date`, `spatial_resolution_m`, `coverage`, `limitations`.
- Targets: `id`, `title`, `scientific_goal`, `priority_category`, `coordinates`, `coordinate_verified`, `source_ids`, `activity`, optional `media_source`.
- Routing: `enabled`, `reason`, optional `eligibility_dataset_id`, `policy_version`.
- Stable IDs: `gale-target-...`, `gale-layer-...`; use referential IDs into the source register.
- Dataset versions must be attached to saved missions and trigger **revalidation** when updated; do not silently recompute older mission plans.

`routing.enabled` must default to **false** until project-level DEM/source-resolution, hazard, alignment, thresholds and route-testing gates pass. If a target lacks verifiable coordinates, keep it in the catalog but non-routable; don't generate placeholder coordinates for production data.

### Planned common API (not yet guaranteed to exist)

```text
GET  /v1/regions
GET  /v1/regions/{id}
POST /v1/missions/route-options
POST /v1/missions/assess
POST /v1/missions/brief
```

Before integrating API calls, inspect the repository: use existing abstractions and mock contracts where backend endpoints are not implemented. The shared planner ultimately provides **safest, fastest, science-focused** comparisons; ordered/reordered multiple targets; one-way/round-trip; valid recovery endpoint; blocked unknown terrain; partial reachable-target suggestions; and explainable results. Region workers supply data, not separate optimization algorithms.

## 6. Visual and interaction contract — from DESIGN.md

Do not restyle the shared app. Use these existing tokens:

| Use | Token |
|---|---|
| Background | `#09111F` |
| Surface | `#111D30` |
| Raised surface | `#1B2A40` |
| Border | `#334761` |
| Control outline | `#647C9A` |
| Text | `#F0F5FC` |
| Muted text | `#A8B8CD` |
| Selected route, primary CTA, focus | `#59E3FA` |
| Science target marker | `#D0BDFF` |
| Caution | `#FFC36B` |
| Critical/blocked | `#FF8D9A` |
| Recorded Curiosity traverse | `#D6DEE8` |

- Map-first, tablet-landscape/desktop workspace; collapsible **320–360 px** side panel; narrow-screen bottom sheet.
- Map controls: north arrow, **Mars-correct scale**, active legend, coverage boundary, provenance/attribution, visibility and opacity controls.
- Selected astronaut route: solid cyan with dark casing; alternatives: thin dashed cyan; **historical Curiosity traverse: neutral dotted**; science stops: numbered violet diamonds; caution: labeled amber hatch; unknown terrain: explicit gap/outline.
- Label mixed values `Observed`, `Derived`, `Interpreted`, `Modeled`, `Scenario`, `Unavailable`. Show source details and dates/sols next to historical observations.
- Use Geist or system UI fallback, IBM Plex Mono or system monospace for coordinates/metrics. Prefer 44×44 px touch targets, keyboard controls and WCAG-AA contrast. Avoid horizontal overflow at 390 px.
- Missing data: hide unavailable thematic overlay from switchable map layers, explain in data-information panel. Do not invent data or imply a simulated route is NASA approved.

## 7. Shared coordination — additional Gale-owner role

You also coordinate the **common product foundation**, but keep that work separate from Gale scientific content:

1. Ensure team uses a single baseline commit/branch, `PRD.md`, `DESIGN.md`, `TEAM_CONTRACT.md`, manifest schema and stable region IDs (`gale`, `jezero`, `oxia`).
2. Own or coordinate changes to shared `app/**`, `components/map/**`, `components/mission/**`, `lib/contracts/**`, and shared planning API. These are **team-owned paths**; communicate changes and avoid overwriting teammates' edits.
3. Make the shared frontend **region-driven**: never hardcode Gale targets/layers into map components. Region switching loads a manifest and retains consistent symbols, controls and status states.
4. Use the existing redesigned HTML prototype as **visual/interaction reference**, not as real terrain, an implemented MapLibre renderer, or proof of computed route accuracy.
5. Keep mock/demo data behind explicitly labeled `illustrative` or `Scenario` status; use actual dataset source information as it becomes verified.
6. Integrate other teammates' region contributions via schema validation, type checks, cross-region UI tests and small pull requests; review source attribution, route status and planned-vs-recorded mission labels.
7. Share contract updates **before** merge. If schemas change, update the sample manifest, PRD/contract notes and all three region examples together.
8. Do not assume the Phase 1–6 synthetic validation tests mean any real Mars DEM passed a scientific audit. Real-data routing remains off until independently validated.

### Parallel ownership

| Contributor | Primary owned data | Recommended branch |
|---|---|---|
| You | `regions/gale/**`; coordinate shared UI/contracts | `feat/gale-map` (shared changes separately reviewed) |
| Aung Khant Min | `regions/jezero/**` | `feat/jezero-map` |
| Thaw Thaw Tun | `regions/oxia/**` | `feat/oxia-map` |

Do not require Jezero/Oxia scientific files to be finished before Gale's region scaffold and the shared shell can be developed. Avoid putting large original DEMs in Git; use object storage and repeatable acquisition/preprocessing instructions.

## 8. Execution milestones (in this order)

### Milestone A — Working map/frontend scaffold (highest immediate priority)
- [ ] Inspect repo and confirm whether MapLibre, manifest schema, shared map components, routing APIs and data folders already exist.
- [ ] If needed, establish the minimum shared region contract, reusable loader, picker, target catalog, target card, layer manager, data-status display and mission-plan state in Next.js.
- [ ] Scaffold `regions/gale/manifest.json`, `targets.json`, `sources.md` with *truthful* pending/illustrative status and source references.
- [ ] Show Gale in the common picker and render the Curiosity corridor context in the same UI as other regions.
- [ ] Catalog **≥3 sourced candidate** science objectives; verify locations before enabling map-based waypoints.
- [ ] Save/reopen plans locally without login. Keep dataset-version information and revalidation flags.
- [ ] Demonstrate usable desktop/tablet/mobile states with clear unavailable/offline data messages.

### Milestone B — Scientific map assets
- [ ] Inventory authoritative Curiosity, HiRISE/CTX, Gale DEM, geology/mineral, REMS and RAD data sources.
- [ ] Prepare properly georeferenced regional imagery and overlays, including source attribution and legal reuse checks.
- [ ] Select candidate Gale AOI by intersections of verified science target locations and audited DEM footprints; **not** whole-crater or arbitrary fixed-size squares.
- [ ] Produce/inspect DEM validity and source-resolution masks; document stereo vs coarse fallback, nodata, vertical datum, uncertainties and coverage.
- [ ] Register Curiosity historical traverse geometry only when source geometry supports it.
- [ ] Hand verified source and AOI metadata to the shared terrain/routing pipeline.

### Milestone C — Shared routing/feasibility integration (after evidence gates)
- [ ] Wire common client to FastAPI route and assessment contracts when implemented; preserve informative unavailable states meanwhile.
- [ ] Render candidate safest/fastest/science-focused routes only from actual route outputs, not fabricated visual differences.
- [ ] Support multi-stop editing, partial mission suggestions, one-way recovery endpoint, resource budgets, configurable reserves and versioned mission revalidation.
- [ ] Use six mandatory checks (terrain, oxygen, battery, EVA time, radiation, return/recovery) for overall statuses: `Feasible`, `Caution`, `Infeasible`, `Unverified`. A known mandatory failure takes precedence; any other missing mandatory evidence forces `Unverified`.
- [ ] Use published/verified suit performance inputs and documented models only; unsupported resource/radiation values stay unavailable.
- [ ] Export mission brief with map, targets/activities, hazard and resource analysis, source references, uncertainty and dataset versions.

## 9. Acceptance criteria

### Region-specific
- [ ] Gale opens in shared map shell, aligned with the Marswalk dark design system.
- [ ] Curiosity's recorded traverse (if sourced) is visually distinct from candidate human routes.
- [ ] At least three scientifically justified candidate objectives exist, linked to source IDs and evidence labels; unsurveyed points are not falsely geolocated.
- [ ] DEM lineage correctly distinguishes 1 m output grid from genuinely high-resolution stereo coverage.
- [ ] REMS weather and RAD radiation data are labeled as **historical**, including units, date/sol and rover measurement location.
- [ ] Geology/mineral layers have documented coverage, legend, provenance and limitations.
- [ ] Insufficient DEM/hazard/radiation/suit data never silently produces `Feasible` or `routing.enabled=true`.

### Shared integration
- [ ] Jezero, Gale and Oxia use the same manifest/target schema and reusable map components.
- [ ] Site selection, layer toggles, target cards, stop ordering and saved-plan flows are functional in scaffold mode.
- [ ] Region-specific labels distinguish recorded rover traverses from Oxia's **planned** future rover exploration.
- [ ] Data source links, confidence, observed/modeled tags and unavailable messages are visible and consistent.
- [ ] Misaligned CRS, invalid target coordinates, changed dataset versions and unavailable APIs fail clearly.
- [ ] Keyboard and touch controls work; no horizontal scrolling at 390 px.
- [ ] Automated manifest/type tests and basic cross-region UI checks pass. Report untested checks accurately.

## 10. Git and agent workflow rules

- Before editing, inspect the active branch, git status, package structure, existing design system and pending changes. **Do not overwrite** another teammate's work.
- Prefer small, reviewable PRs; isolate Gale dataset edits from shared component changes where practical.
- Commit source notes/derivation scripts/metadata, not huge unreviewed rasters.
- On each milestone, report changed files, screenshots (when possible), test results, data-source citations/URLs, what is illustrative, unverified assumptions, and coordination requests.
- Never claim official NASA approval or operational astronaut safety validation.
- Do not create a separate app, 3D viewer, live EVA rehearsal, or autonomous agent workflow unless project scope is updated.

## 11. Immediate instruction to your coding agent

**Start now by inspecting the existing repository and shared project documents.** Identify the current frontend shell, region/data interfaces, map renderer and gaps. Produce a brief integration plan and implement the smallest working **Gale manifest + source catalog + science target catalog** within the existing app. If no common loader or region schema exists, create a minimal, reusable implementation covering all three locations, coordinating changes through the shared contract. Keep detailed routing disabled pending scientific validation. Finish with the changed-file list, validation steps and explicitly unresolved data gaps.
