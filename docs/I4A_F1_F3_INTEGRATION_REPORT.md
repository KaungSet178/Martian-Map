# I4A - F1 + F3 unified integration report

15 November 2026 - Asia/Rangoon (UTC+06:30)

## 1. Outcome and scope

F1 mission integrity and F3 scientific verification are integrated in `D:/martian-map-i4a-integration` on `feat/i4a-f1-f3-integration`. Relevant gates pass: **463 TypeScript tests, 186 Python tests with four optional-cache skips, 61 production-browser cases, runtime health, typecheck, lint and production build**. This establishes the defined research application integration, ready for a separate I4B review. It does not establish operational EVA safety.

No main merge, source-branch reset, force push, unrelated history merge, new terrain/scientific data, resource-model replacement or general UI redesign occurred. I4B/R1.1 implementation is not included.

## 2. Exact sources and ancestry

| Role | Verified remote branch | Exact SHA |
|---|---|---|
| F1 authoritative foundation | `origin/feat/f1-mission-integrity-fixes` | `f8d633884fd385b57f06f14a983227513c7dd060` |
| F3 authoritative science | `origin/feat/f3-scientific-verification` | `e0742e5ca8194e6053d762f526bdb61505c314b6` |
| Common I3A baseline | `origin/feat/map-routing-feature-integration` | `26adc4c2e72c4febc2500de2eb11f8f30ef85ccd` |

Fetched origin before edits; all expected SHAs matched. F1/F3 merge-base is exactly I3A. The branch starts at F1 and selectively imports F3 content; no merge-parent relationship to F3 is asserted. Original separate routing/objective branches were not reimported.

## 3. Worktree isolation and reviewed evidence

Inspected registered worktrees before creation; the integration path did not exist and its initial F1 checkout was clean. [Starting state](evidence/i4a/starting-state.json) records source histories, path classifications, overlap, worktrees and hashes of the main worktree's existing dirty renderer/scripts.

Reviewed the comprehensive audit, F1 report, F3 report, F3 integration notes/compatibility JSON and I3A routing report. Paths and content hashes are in [reference-reports.json](evidence/i4a/reference-reports.json). Prior reports are historical evidence, not newly executed acceptance.

[Worktree preservation](evidence/i4a/worktree-preservation.json) confirms main, F1 and F3 HEAD/status values and the main worktree's three existing dirty-file hashes match the starting state. Dependencies were privately copied after lockfile comparison; no dependency/lock/config changes were made.

## 4. Source comparison and conflict decisions

The F1/F3 changed-file intersection against I3A is empty. All **108 F3 paths** were explicitly classified and selectively imported. There were no textual merge conflicts; contracts still required semantic reconciliation.

| Area | Decision |
|---|---|
| Regional catalogs/layers/source metadata | Exact F3 source retained. |
| Mission state, roles, persistence and canonical snapshot | F1 retained, with minimal integration-specific evidence and parser changes. |
| Routing boundary, engines, live hook/request identity, resources | F1 retained byte for byte; no old F3 server or bridge imported. |
| Science details and category grouping | F3 isolated changes imported; renderer/CSS untouched. |
| Explicit F3 registration false versus F1 legacy unknown | Validated adapter maps reviewed objective geography; absent source/processing checks stay null. |
| F3 one-way route probes | Test helper explicitly designates the last destination, satisfying F1 validation; validation is not loosened. |
| Historical F3 receipts | Preserved; fresh adapted test output goes to I4A evidence. |

## 5. Geological-unit removal

`gale-geology`, `jezero-geology` and `oxia-geology` are absent from active controls and map manifests. No unit polygons, boundary fills/outlines, unit legends, obsolete toggles or centroid-generated waypoints remain. Removed IDs cannot be reactivated by stale layer state or after region switching.

Original geological research assets and processing records remain for provenance. Terrain coverage outlines, presentation masks and explicitly schematic linework do not encode geological units and remain unchanged. Scientific investigations about geology remain valid concepts, without unit map geometry.

## 6. Preserved scientific layer matrix

| Region | Elevation | Hillshade | Slope | Thermal | Numerical route capability |
|---|---|---|---|---|---|
| Gale | Regional HRSC, global comparison, local DEM | Same three resolutions | Same three resolutions | Relative THEMIS daytime IR | Authentic Python HRSC A*/Dijkstra; 30 m and separate 200 m sources |
| Jezero | SOC_006 HiRISE-derived display | Genuine numerical derivative | Display-scale gradient | Relative THEMIS daytime IR | Corrected 25 m TypeScript numerical worker |
| Oxia | MOLA-derived regional display | Regional numerical hillshade | Coarse MOLA derivative | Relative THEMIS night IR | Unavailable; geometric planning only |

All **18 category records** retain original data values, dataset IDs, resolution/coverage metadata, units, opacity, legends and rendering. **7,282 map assets** match source revisions: Gale 2,163; Jezero 4,124; Oxia 995. Routing-grid hashes match F3's preservation receipt. [Preservation evidence](evidence/i4a/preservation.json) includes every regional source path, layer definition and protected F1 path.

Actual rendered-pixel tests check enable/disable, opacity, legends, coverage and attribution for every category dataset at 1440x900, 768x1024 and 390x844. Zoom, drag, Gale focus/complete-area controls, rover traverses, nodata and region isolation remain functional.

## 7. Scientific objective reconciliation

Gale retains seven identifiable entries: three unlocated Scenario concepts and the Glen Torridon, Vera Rubin Ridge, sulfate-bearing terrain and Gediz Vallis investigation contexts. No invented point or unsupported 5 m accuracy claim is introduced. `gale-sulfate-units` retains its ID and investigation meaning with the F3 title. Broad area classification does not create polygon geometry or a navigation destination.

Jezero retains all five mission-level goals. `jezero-objective-3` remains sample caching with null coordinates. The separate Three Forks published **18.45369687 N, 77.41359752 E** is a proposed landing-circle center, not the tube depot. Its 60 m circle radius is not positional uncertainty. No associated-site coordinate or verification flag is assigned to the full mission objective. Human-exploration preparation remains unlocated.

Oxia retains its three original two-decimal mineral locations, Interpreted evidence and corrected ~36.1 km primary-clay/silica separation. No extra measurement precision, source-to-map registration or safe outcrop access is inferred. Appropriately labeled geometric stops remain available; terrain-certified objective routing stays unavailable.

## 8. Evidence flow and minimal adapter

`objectiveGeographicEvidence` is Zod-validated and recognizes reviewed region-prefixed objective IDs. It maps F3's explicit registration false and null positional uncertainty. Unreviewed IDs retain null fields. It does not infer source/processing verification from legacy enums or copy Three Forks site flags to sample caching.

F1's single `missionPlanningSnapshot` remains authoritative. Selected objectives now expose derived `planning_evidence` and `location_disclosure`; Review and HTML render that same disclosure, including Three Forks and unavailable-location caveats. No second persisted source of mission truth or calculator is added.

Real entries tested across catalog/selection, applicable itinerary, snapshot, Save/Open, JSON, Review and HTML: Glen Torridon, Gediz Vallis, sample caching, human-exploration preparation, clay-rich bedrock and hydrated silica. Interpreted remains Interpreted, Scenario remains Scenario and manual remains user-defined. Source IDs, coordinate/source/processing/registration checks, uncertainty, representation and eligibility remain independent; missing values do not become true. Prior supplied evidence remains identifiable as historical superseded context.

## 9. Retired-reference and foreign-region boundary

Mission schema version remains **1**. Unknown same-region references retain IDs, labels, historical coordinates, roles, notes and durations while inactive. Unrelated manual points survive; invalid references can be removed in the real itinerary. No retired ID is reassigned, relabeled as manual or granted routing permission.

Testing found that F1 checked foreign IDs in objective selections but not saved waypoint associations or retired-reference metadata. The parser now validates all three locations. Foreign-region references reject; unknown same-region references remain readable. This is a validation boundary correction, not a schema redesign.

Current F1, I3A-style optional-metadata-free, objective-only, manual-only, Oxia-associated, unknown same-region, foreign-region, retired/unavailable, catalog-changed and JSON roundtrip cases pass. Reopen never trusts stored live geometry; receipts require recomputation. Geological state cannot recreate a removed map source.

## 10. Roles, ordering and route invalidation

Preserved F1 rules: one explicit base; an explicit one-way terminus; base-first/terminus-last canonical order; independent intermediate order; one return closure; recoverable missing/duplicate roles; role-based promotions; and retained waypoint data through mode switches. Science selection does not invent endpoint coordinates.

Browser acceptance exercises Make Base/Make Terminus, reorder, mode switch, 123-second stop duration, selected alternatives, Save/Open/recompute and endpoint invalidation. The 844x390 case repairs roles and opens a complete brief; F1's 320 px scenario cases also pass. Server validation, cancellation, timeout, stale-response rejection and mission/region identity are unchanged from F1.

## 11. Fresh Gale/Jezero numerical routes

Explicit manual research probes produce both real alternatives, three ordered segments and an actual searched return leg. Status remains unverified; absolute registration is false.

| Region | Preference | 3D m | Horizontal m | Ascent / descent m | Vertices |
|---|---|---:|---:|---:|---:|
| gale | shortest | 4575.491 | 4545.863 | 234.899 / 234.899 | 120 |
| gale | lower-terrain-cost | 4574.931 | 4545.868 | 234.899 / 234.899 | 120 |
| jezero | shortest | 9009.255 | 8999.781 | 157.600 / 157.600 | 337 |
| jezero | lower-terrain-cost | 9091.640 | 9085.623 | 121.601 / 121.601 | 337 |

Inputs [east longitude, latitude]: Gale `[137.38,-4.72] -> [137.40,-4.74] -> [137.39,-4.75] -> base`; Jezero `[77.450886,18.444627] -> [77.38,18.455] -> [77.43,18.435] -> base`. Full requests/responses: [Gale](evidence/i4a/gale-routes.json), [Jezero](evidence/i4a/jezero-routes.json). Results are recomputed and compared against F3, not filled with copied numbers.

Maximum snap is ~12.481 m for Gale and ~12.089 m for Jezero, below the requested 100 m bound. Source coverage/nodata checks pass. Native Jezero cell indexing/conversion, the 25-degree computational restriction and both cardinal supports for diagonal transitions remain tested. Fresh Three Forks manual replay finds valid cell (447,97), actual snap ~15.241 m and a successful numerical route; the sample-caching scientific target association is independently rejected. Manual success does not establish science eligibility.

## 12. Independent numerical verification

[Independent results](evidence/i4a/independent-numerical.json) recompute Mars horizontal/3D distance, DEM ascent/descent, snapping, connected cells, Jezero slope/nodata/corners and native alternative cost using equations that import neither search engine. Canonical agreement is within 1e-5 m. Ordered stop/segment junctions and exact return closure are independently asserted.

Shortest minimizes the native horizontal graph objective. Lower terrain cost minimizes each regional formula, not normalized astronaut hazard or physiology. Gale's lower-cost canonical 3D total can be slightly smaller without contradicting its horizontal shortest objective. Source weights/native and displayed metrics remain distinct.

The existing independent validator only gains an import-safe main guard; its equations are unchanged. The new I4A script reuses those equations on fresh receipts. Full-resolution native Jezero reaggregation was not repeated; genuine committed grids/hashes and actual runtime paths are verified. Historical source Python routing tests supplement, rather than replace, corrected TypeScript worker acceptance.

## 13. Oxia geometric acceptance

Oxia retains east-positive longitude handling, display wrapping, interpreted source stops and explicit user-defined plans. One-way and round-trip segment counts/closure pass. No terrain geometry/elevation statistic or Gale/Jezero grid substitute is produced. Terrain is explicitly unavailable.

Browser workflows combine two interpreted observations with three manual points, repair/designate endpoints, switch modes, Save/Open, Review and export the complete itinerary. The adapted F3 replay also recomputes the original three-point geometry (~61,789.298 m one-way; ~77,554.092 m round-trip). No geometric distance grants operational feasibility.

## 14. Historical environment

F3 register corrections are integrated without sensor/adapter changes. Gale REMS/RAD and Jezero MEDA remain historical/local; Oxia has no local rover series. Gaps, quality flags, six MEDA sols, detector distinctions and ionizing versus solar observations remain intact. Browser evidence registers match Environment. No future route-wide forecast, synthetic observation or validated EVA exposure field is created.

## 15. Save/Open, Review, JSON and HTML

Nine unified region/viewport workflows inspect the requested science entries, add three manual points, set endpoint roles, enter 123-second stop duration, switch one-way/round-trip, compute terrain where supported, select lower terrain cost, enter walking-speed assumptions, save/export JSON, explicitly Open, invalidate/recompute, Review and download HTML.

Actual saved JSON and downloaded HTML in [browser evidence](evidence/i4a/browser) retain ordered labels/roles, raw coordinates, evidence, objective context, durations, supported route/scenario outputs and unknown resource inputs. Live geometry is not persisted as a trusted result. Location caveats are derived from the same snapshot as Review.

The cross-region case computes separate Gale/Jezero routes and an Oxia draft, returns to the original saved Gale inputs, sees cleared live geometry, opens it and recomputes a Gale-only route. Waypoints, unit layers and terrain receipts do not leak across regions.

## 16. Production browser acceptance

**61 distinct Chromium cases pass**: 59 in the main sequential eight-spec batch plus two explicit saved-region/compact cases. Actual Next.js 16.4.6 production server at port 3341 invokes genuine Python/Node routing workers. Required sizes: 1440x900, 768x1024, 390x844; additional functional 320 px and 844x390 checks. This is not mock-only acceptance.

Main specs: `environmental-conditions`, `f1-mission-integrity`, `f3-navigation`, `f3-science`, `gale-geology` (now removal acceptance), `i4a-integration`, `terrain-routing-integration`, `three-region-integration`. Relevant full workflows/map tests assert console/page errors. Captures include real geometry, objective panels, classifications, Review, saved JSON, downloaded HTML, region switching and unit removal. Representative mobile Review was visually inspected. Existing compact density remains F2 scope.

The initial new desktop smoke attempt used the wrong empty-itinerary test ID; two cases stopped there. The corrected test targets F1's existing empty state and respects an already-designated base. No application workaround or weaker assertion was used; final complete runs pass. Earlier diagnostics remain in ignored `output/i4a-diagnostics/`, excluded from acceptance counts. Environmental test screenshots were captured into I4A evidence and historical tracked screenshots restored. Delivery logs are normalized from PowerShell UTF-16 to UTF-8 for review. Delivered HTML copies normalize trailing whitespace only; raw downloaded bytes remain under `output/playwright/i4a/` with both hashes recorded in [export-provenance.json](evidence/i4a/export-provenance.json).

## 17. Full automated results

| Gate | Result |
|---|---|
| Full TypeScript suite | 463 passed, 64 suites, zero failed/skipped |
| Gale Python scientific/routing/weather | 149 run: 146 passed, 3 raw-cache skips |
| Gale environmental Python | 4 passed |
| Jezero environmental Python | 21 run: 20 passed, 1 raw-cache skip |
| Jezero source Python routing | 9 passed |
| Jezero hillshade Python | 7 passed |
| Independent numerical checks | Passed |
| Authentic map assets | 7,282 identical |
| Runtime health/typecheck/lint/build | Passed; lint without warnings |
| Selected production browser cases | 61 passed |

Eleven new focused I4A cases and all F1/F3 unit suites are included in 463, not added twice. Exact commands, results, capabilities and known limits are in [validation-summary.json](evidence/i4a/validation-summary.json).

## 18. Reproduction

```powershell
$integrationTests = @(rg --files tests -g '*.test.ts' -g '*.test.tsx')
node --import tsx --test @integrationTests
python -m unittest discover -s tests -p 'test_gale*.py'
python -m unittest discover -s tests/environment/gale -p 'test*.py'
python -m unittest discover -s tests/environment/jezero -p 'test*.py'
python -m unittest discover -s team/jezero/routing -p test_synthetic_routing.py
python -m unittest discover -s team/jezero/terrain -p test_hillshade.py
python scripts/verify-i4a-numerical.py
python scripts/verify-three-region-assets.py
npm.cmd run routing:check
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run start -- --port 3341
# In a second terminal:
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3341'
node node_modules/@playwright/test/cli.js test tests/browser/environmental-conditions.spec.ts tests/browser/f1-mission-integrity.spec.ts tests/browser/f3-navigation.spec.ts tests/browser/f3-science.spec.ts tests/browser/gale-geology.spec.ts tests/browser/i4a-integration.spec.ts tests/browser/terrain-routing-integration.spec.ts tests/browser/three-region-integration.spec.ts
```

## 19. Unchanged resource model and I4B recommendations

See [I4B input contract](I4B_EVA_INPUT_CONTRACT.md). Consume the canonical current selected route, actual 3D segment distances, ordered/return state, explicit stop durations, user walking speed, source/processing/registration flags and current receipt/invalidation identity. Retain existing resource units, assumptions, reserves, breakdown and insufficient-data statuses.

No R1.1 import occurs. Timeline/resource engines, routing planning, receipts/request keys and live hook remain byte-identical to F1. I4B should adapt one existing calculation boundary after independent source/unit review, without duplicate oxygen/battery models or unsupported defaults. No I4B implementation starts here.

## 20. Known scientific limits

- Independent absolute registration remains unverified; no surveyed precision, safe EVA access or astronaut certification follows.
- Unknown source/processing dimensions and positional uncertainty stay null. Three Forks landing-circle evidence is not the tube-depot center or a located mission objective.
- Four optional raw-cache Python replays skipped; native full-resolution Jezero source reaggregation not repeated. Genuine committed grids and actual paths are tested.
- Historical rover-local observations are neither future route-wide forecasts nor validated exposure models.
- Oxia terrain routing and local rover observations remain unavailable.
- Resource outputs remain unverified user-assumption scenarios. R1.1 and I4B implementation are not included.
- Chromium software-WebGL acceptance is not physical-device, cross-browser, full accessibility or printer/PDF certification.
- Existing compact-panel density and broader F2 redesign are deferred.

No unresolved integration blocker remains within I4A scope. These explicit limits are not silently treated as passed operational requirements. No full historical browser-directory, physical-device, printer/PDF or multiple-browser certification is claimed.

## 21. Changed-file inventory

Every imported F3 path is classified in [starting state](evidence/i4a/starting-state.json); all delivery paths are listed in [changed-file-inventory.json](evidence/i4a/changed-file-inventory.json).

Integration-specific changes beyond F3 imports:

- `lib/science/objective-location-adapter.ts`: validated reviewed geography.
- `lib/mission/waypoint-planning.ts`: explicit F3 registration/uncertainty mapping.
- `lib/mission/planning-snapshot.ts`: canonical selected-objective evidence/disclosure.
- `components/mission/planning-summary.tsx`, `lib/mission/brief-html.ts`: render disclosure in shared outputs.
- `lib/mission/model.ts`: reject foreign waypoint/retired references as well as objective IDs.
- `tests/f1-mission-integrity.test.tsx`: known F3 registration false replaces legacy-null expectation.
- `tests/f3-science.test.ts`: explicit one-way destination and separate fresh I4A replay output.
- `tests/i4a-integration.test.tsx`, `tests/browser/i4a-integration.spec.ts`: integrated semantics, saved compatibility, real routes and complete workflows.
- `scripts/verify-routing-independent.py`, `scripts/verify-i4a-numerical.py`: import-safe independent numerical audit reuse.
- Reports, source/preservation/validation receipts and selected browser exports/screenshots.

## 22. Final diff and source preservation

All regional science files match F3. Protected F1 runtime/resource/data paths are unchanged. Main/F1/F3 source worktree states and dirty-file hashes match their initial receipts. Original datasets are not deleted. Historical environmental screenshots generated by testing are restored; only I4A captures are newly delivered. No unrelated work is included.

## 23. Final Git delivery

Branch: `feat/i4a-f1-f3-integration`; worktree: `D:/martian-map-i4a-integration`. Commit/push occurs normally after diff review; no merge into main/F1/F3 or automatic I4B work follows.

The exact final commit, live remote/local equality and clean-worktree state are recorded after commit/push in the [local delivery receipt](../output/i4a-delivery.json) and delivery response. `git rev-parse HEAD` identifies the commit containing this report; remote comparison uses `git ls-remote origin refs/heads/feat/i4a-f1-f3-integration`. A tracked report does not claim to contain its own resulting Git hash.
