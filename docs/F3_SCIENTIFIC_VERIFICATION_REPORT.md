# Marswalk Planner ? F3 scientific verification report

15 November 2026 ? Asia/Rangoon (UTC+06:30)

## Delivery and version freeze

Branch: `feat/f3-scientific-verification`. Dedicated worktree: `D:/martian-map-f3-science`.

Fetched origin before creating the worktree. All three remote heads matched the requested commits:

| Role | Remote branch | Exact SHA |
|---|---|---|
| Starting I3A baseline | `feat/map-routing-feature-integration` | `26adc4c2e72c4febc2500de2eb11f8f30ef85ccd` |
| Gale reference | `feat/gale-science-objective-verification` | `10f6f795f0a73f01ff151e86e033263359ae94a0` |
| Jezero reference | `feat/jezero-objective-location-verification` | `c39b7a32a28efee2dc9a8c7bc8f969b7b0d946d4` |

Neither objective branch was merged. Only the F3 branch was committed/pushed; no main/F1 merge or force push. The main worktree's pre-existing modifications were left alone. Git worktree administration and fetched refs are shared Git metadata, not application edits in another worktree.

Final commit SHA and remote/local equality are recorded after commit in the local [delivery receipt](../../output/f3-delivery.json) and the delivery response. In a checkout, `git rev-parse HEAD` identifies the commit containing this report; a tracked file cannot contain its own resulting commit hash. The receipt is intentionally outside the tracked tree.

## Baseline audit reproduction

Read `D:/martian-map-audits/2026-11-15/MARSWALK_THREE_REGION_COMPREHENSIVE_AUDIT.md`. Reproduced against I3A sources before edits and ran all nine baseline terrain-integration tests successfully ([baseline TAP](evidence/f3/baseline-routing.tap)). The old environmental build was not substituted for I3A.

| Finding | I3A/reference status before F3 | F3 disposition |
|---|---|---|
| B03 Gale 5 m registration | Not reproducible in active I3A; reproduced on Gale reference (`registration_verified: true`, `uncertainty_m: 5.0`, Arc Pass rectangle) | Do not import. Active Gale entries remain unlocated; explicit independent registration false and numeric uncertainty null in science-owned evidence. |
| A07 environment register | Reproduced: Gale REMS/RAD and Jezero MEDA described as not ingested while observation adapters exist | Corrected regional availability/evidence and stale Gale source descriptions. Historical observations remain rover-local; future forecasts, spatial fields and validated EVA exposure remain unavailable. |
| A11 Oxia distance | Reproduced: silica copy says 7 km from clay; retained points are ~36.077 km apart | Corrected to ~36.1 km with named `oxia-objective-1` pair and Mars sphere radius. No coordinate changes. |
| A02 interpreted evidence | Partially resolved at source already: Oxia catalog says Interpreted; shared bridge/itinerary can promote it | Preserve Interpreted source evidence, qualify precision and remove independence claim. Downstream F1 propagation is explicitly deferred. |
| B02 original Jezero defects | Already resolved in I3A source | Preserve engine unchanged; independently rerun cell geography, slope/nodata/corner, actual path/metric, ordered/return-leg and invalidation tests. |
| Cross-region objectives | Five Jezero goals and unlocated Gale concepts already present in I3A | Retain scientifically meaningful goals without imported unit geometry. No new surrogate coordinates. |

## Exact geological removal inventory

| Region | Removed active catalog record / control | Retained research evidence |
|---|---|---|
| Gale | `gale-geology`: Arc Pass categorical GeoJSON fill/outline, Unit legend, layer toggle, opacity control and automatic layer-focus entry | Original 53-feature GeoJSON, author/source metadata, geology legend source and processing history remain on disk. |
| Jezero | `jezero-geology`: SIM 3464 unit-color raster entry, layer toggle, legend, opacity control | Original USGS mapping, geology tiles and processing/source documentation retained. |
| Oxia | `oxia-geology`: obsolete unavailable geology/mineralogy placeholder and its empty control | Original mineral observation service references retained; no active unit overlay existed. |

Removal is from the declarative regional manifests, not CSS or a hidden default. Retired IDs cannot be enabled with `updateLayerState`, mounted, selected or requested after a region switch. No shared map renderer changes were needed. No exclusive Shapes control exists on I3A. Its separate schematic linework preview is not a geological-unit layer and remains explicitly Scenario. Scientific terrain-coverage outlines and the presentation mask remain, because neither encodes geological units.

Not imported from reference branches: Gale Arc Pass/Gediz rectangle, other area boundaries, Jezero Nle/Njf/NHjf2 geometries, the approximate biosignature corridor, geological area selection/Shapes UI, polygon routing shortcuts, centroid fallbacks, or alternate shared location/persistence schemas. No polygon center, corner, arbitrary outcrop or source-photo camera position became a target.

## Preserved scientific maps and data

All 18 category dataset records are deeply identical to I3A, covering Elevation, Hillshade, Slope and Thermal in every region. The [preservation receipt](evidence/f3/preserved-scientific-layers.json) records their original URLs, resolutions/rendering and authentic routing-grid hashes. No raster value, source tile, DEM, numeric terrain grid, sensor reading, basemap, camera extent, nodata mask or rover traverse changed. `git diff` contains no edits under `data/`, `public/`, `team/`, or `lib/routing/`.

Browser tests check real rendered pixels with enable/disable and opacity changes for every category dataset, attribution, coverage text and legends at 1440?900, 768?1024 and 390?844. Cross-region switching does not request unit assets. Separate three-size tests exercise actual zoom and drag. Curiosity focused/complete-area controls, Perseverance traverse and existing MapLibre behavior remain intact.

## Gale objective and accuracy decisions

Glen Torridon, Vera Rubin Ridge, sulfate-bearing terrain and Gediz Vallis remain scientifically meaningful investigation contexts with existing NASA photograph provenance. They are broader areas, not selectable unit boundaries or independently supported observation points. Coordinates stay null, routing stays unavailable and no map markers are invented. `gale-sulfate-units` retains its ID and scientific meaning; its title becomes ?Sulfate-bearing terrain investigation.?

The three legacy `gale-objective-1/2/3` concepts remain identifiable, unlocated Scenario entries. This avoids silently dropping saved selections or promoting old demo points. They are not imported as verified historical observation sites. No baseline objective ID was retired or reassigned; the retired IDs are the three layer records above. The Gale reference had dropped those three scenario entries; F3 deliberately preserves compatibility instead of copying that catalog wholesale.

B03 investigation: the reference branch's rectangle is the Arc Pass map bounding extent, not a controlled sampling point. Regional documentation identifies source Mars 2000 sphere R=3,396,190 m and an equirectangular inverse with meridian/standard parallel zero. Correct projection conversion and a 1:250 digitizing scale do not establish 5 m absolute alignment. No independent controls, registration residuals or defensible meter-level error budget were available. DOI retrieval through the web tool failed; source/processing files remain available locally but were not treated as proof of absolute accuracy. All active Gale science location evidence reports registration unverified and positional uncertainty unknown.

NASA context checked: [Glen Torridon](https://science.nasa.gov/photojournal/curiosity-on-the-clay-unit/), [Vera Rubin Ridge](https://science.nasa.gov/photojournal/looking-up-at-layers-of-vera-rubin-ridge-on-sol-1790/), [sulfate investigation](https://science.nasa.gov/photojournal/curiosity-looks-downslope-from-the-sulfate-unit/), and [Gediz remote view](https://science.nasa.gov/blog/sols-4327-4328-on-the-road-again/). These establish scientific associations, not target survey coordinates.

## Jezero objectives and Three Forks correction

All five mission goals remain: geology/climate, ancient habitability, sample caching, biosignature search and human-exploration preparation. Goals 1/2/4 remain unlocated without USGS unit or approximate corridor geometry. No individual named biosignature point was independently accepted; goal 5 has no invented MOXIE/MEDA location.

The [primary LPSC abstract 2618](https://www.hou.usra.edu/meetings/lpsc2023/pdf/2618.pdf), downloaded independently, distinguishes the proposed landing site from the sample depot. The published **18.45369687? N, 77.41359752? E** is a **60 m radius landing-circle center**, relative to controlled HiRISE mapping and MOLA vertical reference. It is not the tube-depot center; the paper tabulates drop zones separately near 77.408? E. The radius is an operational design area, not ?60 m localization error. [NASA/JPL PIA25682](https://www.jpl.nasa.gov/images/pia25682-perseverances-three-forks-sample-depot-map/) independently identifies ten deposited tubes and dates the final deposit to sol 690, rather than the reference branch's sol 705 claim.

The six-decimal rounded landing-circle coordinate is retained in `regions/location-evidence.ts` as associated site evidence, with the full published coordinate recorded separately. `jezero-objective-3` remains the unlocated sample-caching goal. Neither value is silently substituted into its target coordinates. Source/coordinate support is distinct from processing verification, unknown positional accuracy, independent registration false, and objective waypoint eligibility false. No landing-circle polygon or automatically added point marker was introduced.

## Oxia source verification and distances

Live NASA Trek queries returned ten aqueous rows (four distinct rounded locations) and two CRISM hydrous rows. Captures: [aqueous](evidence/f3/oxia-aqueous-query.json), [hydrous](evidence/f3/oxia-hydrous-query.json). The three retained target coordinates match source Latitude/Longitude rounded to 0.01?. The extra float digits in ArcGIS storage are not interpreted as greater observational precision. Hydrous geometry uses signed longitude while the Longitude attribute is east-positive; field-based filtering avoids the misleading empty result from a 334?336 geometry envelope.

Keep the three published mineral interpretations, not direct outcrop observations. Source sampling/resolution and map registration remain separate. Two compilations can share contributing observations, so the primary clay description no longer calls them independent detections. Rounded coordinate spacing (~0.6 km) is not a numeric positional uncertainty.

Silica `oxia-objective-2` to primary clay `oxia-objective-1` is ~36.077 km using haversine on R=3,396,190 m. The copy states ~36.1 km and names that pair. Primary to second clay is ~15.765 km; copy rounds to 15.8 km. The hydrous context point (18.17 N, 335.82 E) remains a separately documented nearby detection, not the clay point itself. All original catalog coordinates are unchanged.

## Environmental metadata and capability separation

Gale REMS and RAD and Jezero MEDA contextual records now say Observed/available for integrated historical samples. Source metadata no longer says no REMS/RAD series exists. Oxia still has no integrated local rover observation series. Sensor data and adapters are untouched. Historical local measurements are neither future route conditions nor a validated astronaut exposure model.

Gale/Jezero `capabilities.experimental_routing` now accurately describes their existing tested I3A runtimes. `routing.enabled` stays false for validated science-objective routing; validated routing and mission feasibility remain unavailable. Oxia experimental terrain routing stays unavailable. This corrects source-owned stale availability text without changing the engines or operational gates.

## Scientific provenance and eligibility matrix

Coordinates below use Mars planetocentric latitude and east-positive longitude. All independent registration states are unverified; positional uncertainty is unknown (null), and all declared scientific routing eligibility remains unavailable. A source-supported coordinate does not establish EVA safety. ?Legacy geometric? below records the existing F1 bridge behavior separately.

| Objective ID | Scientific title | Evidence | Source coordinate (lat, east lon) | Primary/source references | Scientific eligibility / legacy geometric creation |
|---|---|---|---|---|---|
| `jezero-objective-1` | Jezero geology and climate record | Interpreted | Unavailable | [jezero-m2020-mission-overview](https://doi.org/10.1007/s11214-020-00762-y), [jezero-m2020-science-objectives](https://science.nasa.gov/mission/mars-2020-perseverance/science-objectives/) | Unavailable / none |
| `jezero-objective-2` | Ancient habitability assessment | Interpreted | Unavailable | [jezero-m2020-mission-overview](https://doi.org/10.1007/s11214-020-00762-y), [jezero-m2020-science-objectives](https://science.nasa.gov/mission/mars-2020-perseverance/science-objectives/) | Unavailable / none |
| `jezero-objective-3` | Sample caching for Mars Sample Return | Interpreted | Unavailable | [jezero-three-forks-primary-f3](https://www.hou.usra.edu/meetings/lpsc2023/pdf/2618.pdf), [jezero-m2020-sample-dossier](https://pds-geosciences.wustl.edu/missions/mars2020/returned_sample_science.htm), [jezero-m2020-science-objectives](https://science.nasa.gov/mission/mars-2020-perseverance/science-objectives/) | Unavailable / none |
| `jezero-objective-4` | Biosignature search | Interpreted | Unavailable | [jezero-m2020-mission-overview](https://doi.org/10.1007/s11214-020-00762-y), [jezero-m2020-science-objectives](https://science.nasa.gov/mission/mars-2020-perseverance/science-objectives/) | Unavailable / none |
| `jezero-objective-5` | Human-exploration preparation | Interpreted | Unavailable | [jezero-meda-environment](https://atmos.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html), [jezero-m2020-science-objectives](https://science.nasa.gov/mission/mars-2020-perseverance/science-objectives/) | Unavailable / none |
| `gale-objective-1` | Layered sedimentary unit | Scenario | Unavailable | [gale-clay-sulfate](https://science.nasa.gov/resource/nasas-curiosity-finds-climate-clues-on-a-martian-mountain/), [gale-geology-publication](https://www.usgs.gov/publications/geology-and-stratigraphic-correlation-murray-and-carolyn-shoemaker-formations-across) | Unavailable / none |
| `gale-objective-2` | Clay-to-sulfate transition | Scenario | Unavailable | [gale-clay-sulfate](https://science.nasa.gov/resource/nasas-curiosity-finds-climate-clues-on-a-martian-mountain/), [gale-geology-publication](https://www.usgs.gov/publications/geology-and-stratigraphic-correlation-murray-and-carolyn-shoemaker-formations-across) | Unavailable / none |
| `gale-objective-3` | Sulfate-bearing outcrop | Scenario | Unavailable | [gale-clay-sulfate](https://science.nasa.gov/resource/nasas-curiosity-finds-climate-clues-on-a-martian-mountain/), [gale-geology-publication](https://www.usgs.gov/publications/geology-and-stratigraphic-correlation-murray-and-carolyn-shoemaker-formations-across) | Unavailable / none |
| `gale-glen-torridon` | Glen Torridon | Interpreted | Unavailable | [gale-glen-torridon-reference](https://science.nasa.gov/photojournal/curiosity-on-the-clay-unit/), [gale-geology-publication](https://www.usgs.gov/publications/geology-and-stratigraphic-correlation-murray-and-carolyn-shoemaker-formations-across), [gale-photo-source-glen](https://science.nasa.gov/photojournal/curiosity-on-the-clay-unit/) | Unavailable / none |
| `gale-vera-rubin-ridge` | Vera Rubin Ridge | Interpreted | Unavailable | [gale-vera-rubin](https://science.nasa.gov/blog/sols-1734-1735-gazing-longingly-towards-vera-rubin-ridge/), [gale-geology-publication](https://www.usgs.gov/publications/geology-and-stratigraphic-correlation-murray-and-carolyn-shoemaker-formations-across), [gale-photo-source-ridge](https://science.nasa.gov/photojournal/looking-up-at-layers-of-vera-rubin-ridge-on-sol-1790/) | Unavailable / none |
| `gale-sulfate-units` | Sulfate-bearing terrain investigation | Interpreted | Unavailable | [gale-clay-sulfate](https://science.nasa.gov/resource/nasas-curiosity-finds-climate-clues-on-a-martian-mountain/), [gale-photo-source-sulfate](https://science.nasa.gov/photojournal/curiosity-looks-downslope-from-the-sulfate-unit/), [gale-usgs-sulfate-study](https://www.usgs.gov/publications/geological-context-and-significance-clay-sulfate-transition-region-mount-sharp-gale) | Unavailable / none |
| `gale-gediz-vallis` | Gediz Vallis | Interpreted | Unavailable | [gale-gediz-vallis-reference](https://science.nasa.gov/resource/curiosity-takes-a-360-degree-view-of-gediz-vallis-channel/), [gale-photo-source-navcam](https://science.nasa.gov/blog/sols-4327-4328-on-the-road-again/), [gale-gediz-gazetteer](https://planetarynames.wr.usgs.gov/Feature/15571) | Unavailable / none |
| `oxia-objective-1` | Clay-rich bedrock study | Interpreted | 18.22, 335.83 | [oxia-trek-hydrous](https://trek.nasa.gov/mars/trekarcgis/rest/services/Hydrous_Mineral_Detections_OMEGA_CRISM_clon0/MapServer/0), [oxia-trek-aqueous](https://trek.nasa.gov/mars/trekarcgis/rest/services/Aquieous_Mineral_Distribution_Options_clon0/MapServer/0) | Unavailable / existing geometric stop |
| `oxia-objective-2` | Hydrated silica detection | Interpreted | 17.84, 336.33 | [oxia-trek-aqueous](https://trek.nasa.gov/mars/trekarcgis/rest/services/Aquieous_Mineral_Distribution_Options_clon0/MapServer/0) | Unavailable / existing geometric stop |
| `oxia-objective-3` | Second clay detection | Interpreted | 18.22, 336.11 | [oxia-trek-aqueous](https://trek.nasa.gov/mars/trekarcgis/rest/services/Aquieous_Mineral_Distribution_Options_clon0/MapServer/0) | Unavailable / existing geometric stop |

Full source URLs, scientific classification, geometry, source-coordinate flags, terrain availability, snap results, warnings and policy/legacy behavior are retained in [objective-routing-compatibility.json](evidence/f3/objective-routing-compatibility.json). The associated Three Forks landing-circle site is separately identified in that receipt; it is not a replacement objective ID.

## Actual routing acceptance

Manual algorithm probes are explicitly labeled in tests; they do not prove access to a named science feature. Both preferences use real committed numerical terrain and return actual geometry; registration remains false and status unverified.

| Region / test | Preference | 3D distance m | Horizontal m | Ascent / descent m | Path vertices |
|---|---|---:|---:|---:|---:|
| gale ordered 3-stop round trip | shortest | 4575.491 | 4545.863 | 234.899 / 234.899 | 120 |
| gale ordered 3-stop round trip | lower-terrain-cost | 4574.931 | 4545.868 | 234.899 / 234.899 | 120 |
| jezero ordered 3-stop round trip | shortest | 9009.255 | 8999.781 | 157.600 / 157.600 | 337 |
| jezero ordered 3-stop round trip | lower-terrain-cost | 9091.640 | 9085.623 | 121.601 / 121.601 | 337 |

Gale manual points: (137.38 E, ?4.72 N), (137.40 E, ?4.74 N), (137.39 E, ?4.75 N), then actual return to base. Jezero manual points: (77.450886 E, 18.444627 N), (77.38 E, 18.455 N), (77.43 E, 18.435 N), then return. All segment junctions and closure are retained. Gale max requested-to-snapped shift ~12.481 m; Jezero ~12.089 m, under the requested 100 m bound. ?Shortest? minimizes the native horizontal graph objective, not necessarily canonical 3D length.

The Three Forks landing-circle probe lies at Jezero cell (447,97), valid terrain. Requested-to-snapped displacement is **15.241 m**. Both numerical preferences succeed from the independently selected landing-localization manual point; shortest is ~2325.078 m 3D. A request that instead labels that endpoint `jezero-objective-3` is rejected as an unverified scientific target. No eligibility is inferred from the manual calculation.

[Independent path validation](evidence/f3/independent-path-validation.json) recomputes Mars horizontal/3D distances, elevations, ascent/descent, requested/snapped displacement, connected cells, native objective costs and Jezero ?25?/nodata/diagonal-corner restrictions without importing either search engine. Canonical metrics agree within 1e-5 m. Lowest-cost routes reduce the documented regional objective. Existing cell geography/round-trip conversion, slope barrier, invalid requests, cancellation, stale route cleanup, and multi-waypoint tests pass. The unchanged Gale Python suite also exercises real-grid out-of-coverage and checksum rejection. Native full-resolution Jezero DEM aggregation was not rerun; the committed genuine derived grid and its source hash were preserved.

Oxia ordered manual points use the three retained detection coordinates as explicitly manual geometric probes: one-way **61,789.298 m**, round-trip **77,554.092 m**. East-positive-to-display wrapping is tested. Terrain responses contain no geometry or elevation metrics and explicitly report unavailable; no Gale/Jezero grid is used. Scientific interpretation and absolute registration remain separate from geometric draft calculations.

## Regression and browser results

- 437 TypeScript tests, 64 suites, zero failures/skips in final full run.
- 41 Gale Python routing tests pass.
- Nine I3A baseline routing tests passed before implementation.
- 29 distinct selected browser cases pass across the requested sizes: three retirement/switching cases, ten terrain/geometric integration cases, ten category/marker cases, three navigation cases and three science/environment cases. The final science cases additionally inspect the actual evidence register.
- Generated Next.js typecheck, ESLint and production build pass with the installed 16.4.6 runtime. No dependency/lock/config changes.
- Browser evidence includes all category datasets changing actual canvas pixels with opacity, source attribution, coverage and legends; map camera zoom/drag; point/unlocated objectives; environmental panels/registers; real worker calculations, route return legs and invalidation; and unavailable Oxia terrain.

A supplementary pair of concurrent Playwright invocations initially collided in their default trace-artifact directory (`ENOENT` during context close). They were rerun sequentially with an isolated output directory. Earlier diagnostics are retained under ignored `output/f3-diagnostics/`, not counted as application failures or passing acceptance. All final browser logs are linked in `docs/evidence/f3/`. An initial dependency junction also failed Turbopack's workspace-root boundary; a private dependency copy fixed the environment without changing application config. Browser screenshots are Chromium/software WebGL evidence, not physical-device or operational certification.

Reproduction commands (PowerShell; production server at port 3337):

```powershell
$f3TestFiles = @(rg --files tests -g "*.test.ts" -g "*.test.tsx")
node --import tsx --test @f3TestFiles
python -m unittest discover -s tests -p test_gale_routing.py
npm run typecheck
npm run lint
npm run build
$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:3337"
node node_modules/@playwright/test/cli.js test tests/browser/gale-geology.spec.ts tests/browser/three-region-integration.spec.ts tests/browser/terrain-routing-integration.spec.ts tests/browser/f3-science.spec.ts tests/browser/f3-navigation.spec.ts
```

51 selected screenshots and 15 browser measurement receipts are delivered in [browser evidence](evidence/f3/browser). The broader category screenshots remain in the local ignored `output/playwright/three-region/` folder.

## Integration dependencies and limitations

See the precise [F1/I4 proposal](F3_F1_INTEGRATION_NOTES.md). No F1-owned application file is modified. Source-owned scientific metadata is complete, but A02 downstream itinerary/export evidence propagation remains F1's responsibility. Existing Oxia geometric autoconversion is recorded honestly, not silently represented as fixed. Experimental branch saved-coordinate migration must preserve legacy data and visibly require review; F3 does not alter shared persistence.

Independent scientific registration and numeric positional uncertainty remain unverified/unknown. No validated EVA hazard, exposure, forecast, consumption or safety conclusion follows from these routes. No newly verified Gale point, arbitrary Jezero biosignature point or substitute unit centroid was introduced. Original research assets remain accessible as evidence but cannot reactivate retired map layers.

## Changed-file inventory

- `components/science/catalog.tsx`
- `lib/map/scientific-categories.ts`
- `regions/gale/config.ts`
- `regions/gale/layers.ts`
- `regions/gale/targets.ts`
- `regions/jezero/config.ts`
- `regions/jezero/layers.ts`
- `regions/jezero/targets.ts`
- `regions/oxia/layers.ts`
- `regions/oxia/targets.ts`
- `tests/browser/gale-geology.spec.ts`
- `tests/browser/gale-science.spec.ts`
- `tests/gale-coverage.test.ts`
- `tests/gale-four-layers.test.ts`
- `tests/gale-integration.test.ts`
- `tests/mission.test.ts`
- `tests/regions.test.ts`
- `regions/location-evidence.ts`
- `tests/f3-science.test.ts`
- `tests/browser/f3-science.spec.ts`
- `tests/browser/f3-navigation.spec.ts`
- `docs/F3_SCIENTIFIC_VERIFICATION_REPORT.md`
- `docs/F3_F1_INTEGRATION_NOTES.md`
- `docs/evidence/f3/ (source captures, route/provenance receipts, logs and selected browser evidence)`
