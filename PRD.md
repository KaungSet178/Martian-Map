# Marswalk Planner — Product Requirements Document (Working v0.1)

**Status:** Shared implementation baseline for a three-person NASA Space Apps team  
**Date:** 2026-11-11  
**Scope:** Jezero Crater, Gale Crater, Oxia Planum  
**Core principle:** A scientifically transparent, pre-mission Mars surface EVA planning application; **not** a flight-qualified or NASA-certified operational navigation system.

## 1. Product summary
Marswalk Planner helps a researcher or hypothetical future astronaut inspect georeferenced NASA/ESA observations, select documented scientific targets, compare terrain-aware route alternatives wherever data quality permits, and review feasibility and uncertainty before planning an EVA. The product is a **2D, map-centered** interface with collapsible planning and analysis panels. Each region is developed in parallel using a common application shell, data schema, and backend API.

## 2. Goals and success criteria
1. Users can switch among **Jezero, Gale, and Oxia** without changing the mission workflow.
2. Every region offers a useful scientific map and an evidence-backed catalog of targets; layers and routing availability may vary with actual verified coverage.
3. In *eligible* areas, route generation offers up to three objectives: **safest**, **fastest**, and **science-focused**, with explanations; identical routes may be shown as identical rather than artificially varied.
4. Users can choose multiple targets, a predefined habitat or valid custom start, and a one-way (requires documented endpoint/recovery assumption) or round-trip mission; they can reorder stops and recalculate.
5. Users can see terrain-screening results, dataset provenance, and six mandatory feasibility assessments: terrain, oxygen, battery, EVA time, radiation, return/recovery.
6. Users can save/reopen missions without accounts and export a mission brief; changing source dataset versions prompts revalidation.
7. Unsupported scientific results are disabled or labeled **Unverified**; no fictitious hazard, suit, weather, or radiation numbers are presented as observed or validated.

## 3. Users and use cases
**Primary:** Space Apps judges, researchers, mission-design students, future human-exploration planners.  
**Use cases:** Inspect mapped geological units; assemble multi-stop scientific traverse; understand hazards/coverage; compare alternatives; document planning assumptions; export an evidence-backed mission summary.

## 4. Confirmed product decisions
- **Locations:** Jezero (Perseverance/western delta exploration), Gale (Curiosity/lower Mount Sharp corridor), Oxia (future Rosalind Franklin/planned exploration; not a completed rover traverse).
- **Data:** Real georeferenced imagery/DEM and scientific observations where available. Historical environment data must show collection dates; science-supportable models must show applicability and uncertainty. Missing layers are hidden from normal controls but documented in an information panel.
- **Science:** Curated NASA/ESA mission objectives with real mapped targets; select via catalog or map markers; priority categories require documented rationale.
- **Routing:** DEM slope/terrain and mapped/image-derived obstacle evidence, with **Safe / Caution / Unsafe / Unknown** screening. Unknown is not automatically safe. Detailed routing only in region-specific audited DEM, hazard coverage, and threshold zones. Block unsafe routes; explain omitted destinations and offer revised reachable-target missions. Robotic reconnaissance is advisory, with suitability caveats.
- **Mission types:** One-way with defined destination/recovery point and documented assumptions; round-trip to start. Edit, reorder, add, and remove stops.
- **Resources:** Published/verified suit performance references only; configurable budgets/reserves using documented models; walking-time model considers distance, slopes, surface difficulty and stops. Unsupported inputs disable affected calculations and imply Unverified feasibility.
- **Feasibility:** Feasible / Caution / Infeasible / Unverified. All six assessments mandatory for Feasible.
- **Map UI:** 2D MapLibre GL JS, map-centered with collapsible panels; three route overlays + comparison; layer visibility/opacity/legend/provenance.
- **Persistence:** No-account local save/reopen; retain dataset/model versions, revalidate if updated. Cached maps and saved plans remain viewable during backend outage; new computations disabled.
- **Export:** Route map, target activities, resource assessment, hazard analysis, references and limitations.
- **Development:** Three regions in parallel against shared contract; initial curated datasets; 3D/custom dataset imports deferred.

## 5. Functional requirements and acceptance criteria
### FR-01 Region navigation
- Choose Jezero/Gale/Oxia; load region overview, available layers, science targets, datasets, and routing status.
- **Accept:** All regions render using one frontend component system and region manifest; unavailable features show actionable explanations.
### FR-02 Scientific layers
- Show optical, terrain, geologic/mineral, atmospheric, radiation, thermal layers when published compatible sources are integrated; visibility, opacity, legends, provenance panel.
- **Accept:** Every displayed layer exposes source, instrument, observation date/range, resolution, coverage, limitations, version and observation-vs-model label. No unexplained placeholders masquerade as actual NASA data.
### FR-03 Science target catalog
- Display source-backed point/polygon, coordinates in declared Mars CRS, scientific rationale, target image where licensed, suggested activity, source references and confidence.
- **Accept:** Target selection synchronized between map/catalog; multiple targets selectable; targets without verified coordinates not available as route waypoints.
### FR-04 Mission setup
- User chooses supported base or valid map start, ordered science targets, round-trip/one-way, a recovery endpoint for one-way, budgets and reserves.
- **Accept:** Invalid or incomplete inputs block calculation with specific reason; mission edits invalidate previous computed results.
### FR-05 Terrain screening and route eligibility
- Use audited DEM footprint, source-quality mask, obstacles, coverage, and documented threshold policy. Screen labels Safe/Caution/Unsafe/Unknown; do not interpret Safe as certified astronaut safety.
- **Accept:** No routing through Unsafe/Unknown; paths remain inside audited coverage; mismatched grids/CRS rejected; provenance of thresholds recorded.
### FR-06 Route generation and comparison
- Compute up to three paths: fastest (supported mobility/time model), safest (documented risk proxy and hard exclusions), science-focused (source-backed priorities under constraints). Stop-order optimization and return legs apply. Explain identical route outcomes or unavailable objectives.
- **Accept:** Known blocked terrain not crossed, missing coverage prevents computation, multi-stop and one-way/round-trip tests pass, omitted targets explained, route outputs have cost/model/data versions.
### FR-07 Resource modeling
- Suit reference from verified published values; documented oxygen/battery and mobility models; reserves independently configurable. Radiation model only if relevant evidence and shielding/applicability are justified.
- **Accept:** Every number includes units, provenance, assumptions and uncertainty; absent input -> unavailable/Unverified, never invented substitute.
### FR-08 Feasibility engine
- Six assessments: terrain, oxygen, battery, time, radiation, return/recovery. Precedence: any confirmed mandatory failure => Infeasible; otherwise any missing evidence => Unverified; otherwise any documented caution => Caution; else Feasible.
- **Accept:** Output includes individual evidence and explanations; overall Feasible is explicitly a modeled screening outcome, not operational certification.
### FR-09 Save/reopen/revalidate
- Save plan to browser storage without login; allow JSON export/import; preserve schema and dataset/model versions; flag stale plan when inputs change.
- **Accept:** Reload preserves planned mission, stale output cannot appear newly approved, backend outage does not prevent viewing local saved plan.
### FR-10 Mission brief
- Export printable/downloadable report with map/route summary, targets/activities, assessments, assumptions, data sources and warnings.
- **Accept:** Missing results marked unavailable; report carries generation date and dataset versions.
### FR-11 Reliability/accessibility
- Loading/errors/empty states; keyboard interactions for essential controls; responsive layout; no inaccessible map-only target selection.
- **Accept:** Target catalog works independently of map clicking; no fabricated metrics on errors.

## 6. Scope boundaries
**Must-have v1:** Three regions, source-aware region manifests, 2D map, layer controls, curated science catalog, mission editor, safety/quality states, real-data capability gating, saved plans, printable brief; verified routing and resource calculations where validated evidence exists.  
**Conditional:** Three truly distinct route alternatives and full Feasible results only when validated models/data support them.  
**Not in v1:** 3D, real-time EVA navigation, operational space-weather prediction, invented suit models, arbitrary user DEM upload, authenticated sharing, automated certified hazard detection, autonomous rover routing.

## 7. Architecture
- **Frontend:** Next.js + TypeScript + MapLibre GL JS; map rendering only; no authoritative calculations in UI.
- **Backend:** Python FastAPI; terrain/route/feasibility services; NumPy/SciPy A*/Dijkstra; GDAL/Rasterio offline geoprocessing.
- **Data:** Postgres/PostGIS for spatial records/metadata; curated COG/GeoTIFF + tiles in object storage; cache keyed by region, source versions, constraints and target ordering.
- **Coordinate contract:** Planetocentric latitude and east-positive longitude as canonical geographic coordinates (0–360); local Mars-projected metric grid for routing; verify source conventions, vertical datum, sphere/ellipsoid and pixel alignment per product. Earth-default geodesy not allowed.
- **Provenance:** Every region/layer/target/model records stable ID, origin URL/DOI, instrument, observation or model dates, CRS, resolution, quality flags, limitations and version.

## 8. Shared delivery contract (see TEAM_CONTRACT.md and schemas)
Region owners deliver identical manifest shape, documented target sources, data footprints and availability flags. Shared frontend displays all regions. Shared backend is not forked per region. A region may mark routes unavailable with a transparent reason.

## 9. Parallel team plan
- **Gale owner (user):** Curiosity science corridor, Gale DEM source provenance, REMS/RAD historical layer metadata, geology and verified targets.
- **Jezero owner:** Perseverance corridor, HiRISE mosaic/source-confidence, MEDA metadata, science targets.
- **Oxia owner:** ESA future exploration area, stereo-vs-model-derived DEM distinction, orbital geology, proposed targets.
- **Shared ownership:** Agree manifest schema and UI components first; merge small PRs; collectively review route-policy and coordinate transforms. Do not assume separate location owners must each build their own routing engine.

## 10. Testing and validation gates
- Contract schema tests for every region; links/sources/coordinate convention verified.
- File-level geospatial audits: CRS, nodata, actual coverage, effective source resolution, alignment, quality and hazards; synthetic tests cannot be used as real Mars validation.
- Independent pathfinding tests, disconnected targets, model absence, stale datasets, one-way/round-trip, backend offline.
- Scientific signoff of route eligibility and suit/radiation models before enabling full mission Feasible status.

## 11. Delivery phases
1. **Shared UI and contracts:** functional prototype (uses plainly labeled illustrative geometry), region manifests, empty/loading/unavailable states.
2. **Region content in parallel:** documented source catalogs, objectives, provisional map layers, independently verified coordinates.
3. **Data ingestion:** actual DEM/imagery/quality grids, footprint validations and region eligibility policies.
4. **Routing:** shared multi-target route engine and comparisons only in audited areas.
5. **Models and reports:** resource applicability, six-part feasibility, local save/revalidation, PDF/print.
6. **Validation:** source-backed acceptance for three regions and polished demo narrative.

## 12. Open evidence dependencies (not unspecified features)
- Exact audited DEM footprints/pixel validity and geographic AOIs for all three regions.
- High-confidence obstacle evidence and defensible slope/roughness thresholds.
- Published/verified suit performance models applicable to Mars EVA; shielding-aware radiation dose method.
- Verified geospatial coordinates for each curated target, with dates and instrument sources.
- Whether any complete mission can responsibly receive Feasible vs Unverified.

## 13. Definition of done
A first release is complete when a user can select any region, inspect genuine sources, build and save a mission, receive source-aware route results **only where validation permits**, understand blocked/unverified outcomes, and export a transparent brief. It is not complete merely because a visualization shows a route.
