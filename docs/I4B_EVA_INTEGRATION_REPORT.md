# I4B EVA Resource Planner integration report

15 November 2026 · Asia/Rangoon. Dedicated branch `feat/i4b-eva-integration`, worktree `D:/martian-map-i4b-eva`.

## 1. Outcome

One production EVA calculation pipeline now connects the canonical mission snapshot, selected current route, timeline, assumptions, capacities and reserves to Plan, Mission Review and downloadable HTML. **510 TypeScript tests, 186 Python passes with four optional-cache skips, and 76 production-browser cases pass.** All required static/runtime/numerical/asset gates pass. These establish conditional research-planner behavior, not operational EVA feasibility.

## 2. Exact foundation and reference

I4A foundation: `3b52ad137728c57324aa020ac4321a299a1d6d98` (`origin/feat/i4a-f1-f3-integration`). R1.1 reference: `4434ebb6505d184cb9954634668d3e31939b1336` (`origin/feat/eva-resource-scientific-corrections`). Original EVA ancestry reference: `e60d894d959514c881312ed85f677b51a199cf3f`. Origin was fetched and live heads matched the requested revisions. Common ancestor is `818eeb85db67f0c2440e2acc47024b436e8a1526`. Application overlap: `components/planner.tsx`, `components/mission/brief.tsx`, `lib/mission/model.ts`. No wholesale source-branch merge occurred.

## 3. Isolation and reviewed materials

Existing worktrees and dirty main files were inspected before creation; the requested path was absent. The dedicated branch starts at exact I4A. [Starting state](evidence/i4b/starting-state.json) records ancestry, overlap, all worktrees and dirty-file hashes. [Reference report hashes](evidence/i4b/reference-reports.json) identify the actual I4A report/input contract/validation, R1.1 correction/original implementation reports and comprehensive audit, including B01. [Worktree preservation](evidence/i4b/worktree-preservation.json) verifies all recorded pre-existing worktree HEAD/status/hash values; the main renderer also matches the separately identified historical I4A preservation hash (initial hash-coverage detail is disclosed in that evidence). Dependencies were privately copied only after lockfile hashes matched; package manifests are unchanged.

## 4. Architecture before and after

I4A previously used `terrainPlanningSummary -> calculateMissionTimeline -> calculateResourceBudget`. R1.1's separate component config, regional adapters, timeline and engine predate F1 contracts. I4B retains the canonical snapshot and existing timeline, adapts the reviewed R1.1 rate-times-hours equations and subsystem distinctions into `lib/eva/estimate.ts`, and retires the former M4 engine to historical **test support only**. No production code imports it. [Pre-implementation design](I4B_INTEGRATION_DESIGN.md) records ownership decisions.

## 5. R1.1 source review

The R1.1 report was not treated as proof. Primary BVAD Rev 2, Apollo D-8093 and NASA-STD-3001 Vol 2 Rev D were inspected independently. Incorrect locators, unsupported power/capacity defaults, blanket non-venting radiator claims and universal emergency-duration claims are excluded or explicitly downgraded. [Scientific provenance](I4B_EVA_SCIENTIFIC_PROVENANCE.md) and [source review](evidence/i4b/source-review.json) record exact checked locations and pending evidence. Apollo 390 Wh remains unsupported and is not a default. No invented discharge-condition explanation is asserted.

## 6. Authoritative engine

`estimateEVAResources` is the only production resource calculator. It validates optional `eva_config`, integrates supplied durations in seconds into kg and Wh, separates baseline/emergency/consumption margins/capacity holdbacks, and returns requirements independently of known capacities. Invalid/nonfinite/negative inputs, unknown mandatory coefficients and arithmetic bounds fail closed. Historic M4 tests still run against the retired module, preserving historical numerical coverage without exposing a competing application model.

## 7. Input and output contracts

Inputs remain `Mission`, canonical ordered `WaypointPlan`, selected current `TerrainRoute`, `terrain_assumptions`, existing reserve preferences and optional `eva_config`. Receipt acceptance checks mission/region, routing version, geometry/eligibility request identity, alternative, actual source IDs and requested endpoints. Jezero's numerical selector maps to its two authentic parent-source IDs. Outputs include timeline components, distance/route basis, return time, source/processing/registration flags, resource components/capacity states, provenance, missing data and operational limitations. `evaInputIdentity` derives from current mission/plan/receipt/assumptions; it is not persisted as another truth.

## 8. Route to duration

Gale/Jezero use the actual current ordered 3D segment distances divided by explicit m/hour speed. No routing cost is used as physiology or time. Return travel uses its actual closing segment once. Oxia uses existing validated Mars geometric segments only, explicitly labeled geometric-only with null terrain ascent/descent. Missing speed prevents complete estimates. Each configured stop is counted once; explicit per-waypoint seconds override the user science-minute fallback. Unknown science durations block complete resources; explicit zero is valid. Base/terminus time is included only when explicitly entered. Additional delay and emergency duration are separate.

## 9. Oxygen

The BVAD reference scenario discloses the adopted oxygen-use and leakage assumptions separately. Baseline metabolic and leakage amounts are separate; emergency and percentage allowance then contribute to total provision. Capacity/margin remain unknown when absent. Legacy I4A aggregate travel/stationary g/hour inputs and g capacities are preserved and converted to kg; no metabolic/leakage decomposition is invented. See the provenance report for applicability and the distinction from another BVAD metabolic table entry.

## 10. Electrical energy and battery

Energy is entered W × modeled hours, with separate reserve terms, known Wh capacity and remaining energy after capacity holdback. Unknown power stays unavailable and unknown capacity never becomes sufficient. Metabolic heat is not electrical load. No unsupported NASA or Apollo battery/power value is automatically supplied.

## 11. Cooling water

Venting uses a conditional coefficient or user assumption; unknown architecture blocks consumption. Explicit idealized non-venting uses zero consumable loss while retaining thermal/working-fluid limitations. Drinking water is excluded. Required mass, capacity, reserves and margins use the common duration contract and kg units; no hidden density conversion is applied.

## 12. Reserve logic

Required = baseline + emergency consumption + consumption margin on that sum. Remaining = entered capacity − capacity holdback − required. Existing oxygen/battery reserve preferences retain their I4A capacity-holdback meaning and become editable in the EVA controls. New percentage margins default visibly to zero and are explicitly user-configurable; emergency duration likewise defaults to zero. The independent test case with 3.5 baseline hours, 0.5 emergency hour, oxygen +20%, battery +25% and separate capacity holdbacks verifies every arithmetic term. No reserve proves safety.

## 13. Profiles

Existing I4A user assumptions, NASA BVAD reference scenario, Apollo historical context and Custom are available. Only independently reviewed conditional reference coefficients are supplied; hardware power/capacity fields remain unknown. Apollo coefficients not independently established remain unknown. Profile edits update resources without terrain rerouting. Selecting a preset restores its coefficients; returning to legacy clears new-profile overrides so invisible capacities/margins cannot affect old controls. User overrides are labeled assumptions, not source-verified hardware.

## 14. Live planner and Mission Review

Plan and Review render the same `EVAAssessment` and shared semantic rows from the canonical snapshot. Core values remain visible, with detailed breakdown/provenance in a disclosure. Scientific activity duration is distinct from other configured stationary activity. Raw legacy assumptions and their aggregate interpretation remain visible. Missing data and operational unverified state are explicit.

## 15. Mission brief and HTML

The onscreen brief uses the canonical snapshot. Downloaded HTML renders the same semantic rows without another calculator. Numerical values, profile, route basis, time components, reserves, capacity states, missing inputs and source locators agree in unit and actual production download tests. HTML escaping is retained. Copied evidence normalizes trailing whitespace only; raw downloads remain under `output/playwright/i4b`, with both hashes recorded in [export provenance](evidence/i4b/browser/export-provenance.json).

## 16. Save/Open and JSON compatibility

Mission schema version remains 1 with optional validated `eva_config`. Existing I4A/I3A-style missions without it load using preserved user inputs and no newly invented hardware assumptions. Save/JSON retain user coefficients, capacities, speed, durations and reserve preferences; computed geometry/resource assessments are not stored as trusted outputs. Opening clears live terrain and requires recomputation in Gale/Jezero. Oxia's permitted geometric estimate is freshly derived from restored inputs. Existing retired/foreign-region validation remains intact.

## 17. Invalidation and one-way defect

Geometry identity retains mission, region, dataset/model version, selected terrain source/snap, mode, ordered IDs/coordinates/roles and eligibility evidence. Resource/profile/capacity/reserve/speed/activity changes recompute resources without rerunning search. Labels/notes do not affect a path. Production acceptance exposed a one-way self-invalidation: receipt synchronization copied recovery text into terminus notes, previously part of the request key. The narrowed key fixes that defect; two authentic regional one-way regression tests reproduce receipt synchronization. Existing worker cancellation/sequence/current-key protections remain unchanged. Stale receipts alone never supply geometry.

## 18. Gale acceptance

Real HRSC 3D alternatives, three ordered waypoints, independently searched round-trip closure and one-way terminus are exercised. Speed, stop, alternative, profile/architecture, electrical load, capacity, margins and emergency inputs update the current assessment. Save/Open/recompute, Review, JSON and HTML agree at every required viewport. Geological units remain absent.

## 19. Jezero acceptance

The same complete workflows pass against the genuine corrected numerical grid. Existing native geography, 25-degree computational restriction, nodata/corner barriers, bounded snapping and registration-false behavior pass regressions. Unlocated scientific objectives stay ineligible and the Three Forks landing-circle center is not treated as the sample depot or a full mission objective. No worker/grid/search change occurs.

## 20. Oxia acceptance

Manual geometric one-way and round-trip plans produce conditional estimates only with required assumptions. No foreign terrain API substitute, DEM, ascent/descent or fictitious terrain route is created. Architecture unknown/non-venting/venting, Save/Open and all shared outputs are exercised. Source uncertainty and terrain unavailable labels remain explicit.

## 21. Numerical validation

47 new I4B cases are included in the full suite. Independent fixed-duration arithmetic covers kg/g, seconds/hours and W/Wh, oxygen separation, zero activities, multiple activities, delay/emergency, consumption margins and capacity holdbacks. Boundary capacity states, unknowns, invalid inputs, profiles, stale receipts, authentic alternatives, one-way synchronization, reopening and Oxia geometry are tested. `verify-i4a-numerical.py` independently replays the authentic routing receipts; original genuine grid and 7,282 map-asset checks pass.

## 22. Unit results

Full actual runner: `node --import tsx --test` with all `.test.ts`/`.test.tsx` files returned by `rg --files tests`. **510 passed, 64 suites, zero failed/skipped**, including all F1/F3/I4A and 47 I4B cases. The package's smaller default test script was not mistaken for the full suite. Relevant historical assertions were adapted only where the resource output contract changed.

## 23. Python results

Gale tests: 149 run, 146 passed, 3 optional raw-cache skips. Gale environment: 4 passed. Jezero environment: 21 run, 20 passed, 1 optional-cache skip. Jezero source routing: 9 passed. Hillshade: 7 passed. **190 run, 186 passed, 4 skipped.** No required runtime dependency is unavailable; full-resolution native Jezero reaggregation is not repeated.

## 24. Static, runtime and browser results

`npm.cmd run routing:check`, `typecheck`, `lint`, `build`, `python scripts/verify-i4a-numerical.py` and `python scripts/verify-three-region-assets.py` were executed and pass. Final full unit/lint/typecheck and production build follow all runtime corrections. **76 distinct Chromium production cases pass**, including 15 new EVA workflows (three regions × 1440×900, 768×1024, 390×844, 320×640, 844×390) and 61 existing integration/environment/navigation/layer cases. Three desktop smoke cases are a repeated subset, not additional distinct acceptance. Server: `npm.cmd run start -- --port 3342`. The full batch passed 70 cases; six legacy cases still asserted the retired panel/status text. After migrating those assertions to the shared unavailable-energy and unknown-capacity states, all six passed in a scoped rerun, with no runtime change. Final acceptance is the union of 70 unaffected cases and six resolved cases, counted once. Exact commands/results are in [browser acceptance](evidence/i4b/browser-acceptance.json), [full log](evidence/i4b/browser-all.log) and [resolved rerun](evidence/i4b/browser-last-failed.log).

Initial diagnostic attempts identified an unprepared worker, source-ID mapping, coefficient display precision, recovery-note identity, and a Windows text conversion; each was corrected and superseded by final runs. An interrupted earlier browser batch is not counted as acceptance. The restored UTF-8 punctuation was visually checked. PowerShell logs were normalized to UTF-8 and trailing whitespace only, with raw backups and hashes in evidence/i4b/log-provenance.json. No general F2 redesign was included.

## 25. Known limitations

This remains per-person constant-rate conditional arithmetic with unverified absolute registration and operational feasibility. No validated astronaut physiology, purge/sweep gas, CO2 removal, thermal sufficiency, potable water, environmental forecast or recovery model is added. Apollo source discrepancies/unchecked handbook pages remain explicit. Four optional cache tests skip. Oxia terrain is unavailable. Browser evidence is Chromium software-WebGL, not physical-device, other-browser, complete accessibility or printer/PDF certification. Broader compact-panel density remains F2 scope. Scientific objective-linked routing remains pending, as described below.

## 26. Scientific provenance

[I4B_EVA_SCIENTIFIC_PROVENANCE.md](I4B_EVA_SCIENTIFIC_PROVENANCE.md), `lib/eva/profiles.ts`, [source-review.json](evidence/i4b/source-review.json) and regional `provenance`/`enteredAssumptionProvenance` records disclose parameter values/units, exact independently checked locators, applicability, modeled versus sourced status and unresolved checks. Unsupported numeric source claims are not silently promoted to verified values.

## 27. File-change inventory and preservation

[changed-file-inventory.json](evidence/i4b/changed-file-inventory.json) lists delivered paths. Changes are confined to the EVA core/controls/presentation, canonical adapter/schema/source guards, geometry request identity, historical test relocation, targeted tests and reports/evidence. [runtime-preservation.json](evidence/i4b/runtime-preservation.json) covers unchanged regional data/catalogs/layers, map renderer, routing engines/worker/server, metrics, contracts and geodesy. Historical tracked screenshots/receipts regenerated during tests were restored; fresh evidence is under I4B. All four scientific categories remain functional and no geological-unit feature returns.

## 28. Final commit and delivery

Normal commit and push target `feat/i4b-eva-integration`; no merge into main or I4A and no force push. The exact final commit, live local/remote HEAD equality and clean-worktree result are written after delivery to `output/i4b-delivery.json` and included in the delivery response. `git rev-parse HEAD` identifies the commit containing this report; a tracked report cannot embed its own resulting hash. I4C is not started.

## Pending Scientific Objective Location Integration

Historical branches were inspected **read-only**, at the supplied exact revisions:

| Region | Branch | Commit | Actual report |
|---|---|---|---|
| Gale | `feat/gale-science-objective-verification` | `10f6f795f0a73f01ff151e86e033263359ae94a0` | `docs/GALE_SCIENCE_OBJECTIVE_VERIFICATION_REPORT.md` |
| Jezero | `feat/jezero-objective-location-verification` | `c39b7a32a28efee2dc9a8c7bc8f969b7b0d946d4` | `docs/JEZERO_OBJECTIVE_LOCATION_VERIFICATION_REPORT.md` |

[pending-objective-locations.json](evidence/i4b/pending-objective-locations.json) records exact report/target/config blobs and their comparison to I4A. Their historic test/report claims are not newly accepted scientific verification.

**Already available in I4A:** Gale retains Glen Torridon, Vera Rubin Ridge, sulfate-bearing terrain and Gediz Vallis investigation contexts, plus three unlocated Scenario concepts. All seven objective coordinates remain null. Jezero retains all five mission-level science goals with null coordinates. `regions/location-evidence.ts` separately records the published Three Forks **proposed landing-circle center**, source/coordinate evidence, registration false, unknown positional uncertainty and unavailable objective-waypoint eligibility. That site evidence is not the tube depot, a full mission goal, or permission to route. Existing imagery/rover traverse context remains distinct from objective locations.

**Unintegrated source-supported contexts and candidate sites:** The Gale branch's four location payloads are areas, not independently registered point destinations. Its scientific investigation contexts already exist in I4A; its mapped/approximate/candidate polygons are deliberately excluded. Future discrete rover sampling or observation locations within those investigations could be associated with separate published/PDS site records after localization review. The Jezero branch's floor, western-delta/Kodiak and mudstone-corridor payloads are likewise areas. Wildcat Ridge, Skinner Ridge and Hogwallow Flats are named site-association candidates for primary-source/PDS reconciliation; the historical payload does not establish safe point destinations for them. Actual sample-depot/tube positions need their own correct localization source. No new point coordinate from these two historical payloads is ready for automatic objective routing on the evidence inspected.

**Rejected historical claims:** F3/I4A excluded geological-unit polygons, arbitrary approximate bounds, centroid-generated targets, unsupported Gale ±5 m absolute registration and other unmeasured uncertainty values. Jezero's historical promotion of a proposed landing-circle center to an Observed/verified sample-depot objective was rejected; its 60 m design radius is not coordinate error. Source support and published digits do not establish registration, traversability or astronaut safety. Historical retirement/migration policies must also be reconciled with I4A's stable IDs rather than replacing catalog semantics wholesale.

**Requirements for safely enabling objective-linked routing:** Use a separate stable site identity and an explicit association to a mission-level goal. Independently check source/version/hash, coordinate frame/datum conventions and site meaning; establish source-to-basemap/DEM registration using measured tie points and an uncertainty budget. Preserve unknown values as null. Check each proposed point against the actual selected Gale grid or Jezero 25 m numerical mask—not merely a display footprint—including nodata, native slope/corner restrictions, actual bounded snapping and source identity. DEM coverage is not safe access. Define an explicit objective-routing eligibility policy independent of scientific classification and registration, with manual planning remaining available. Test canonical ordering, receipt/current-request identity, stale-worker rejection, Save/Open, regional isolation, Review and HTML before enabling any new automatic destination.

**Suggested follow-up scope:** A separate point/site provenance and policy milestone, limited to source-supported investigation sites and associations. Keep all geological-unit overlays removed in Gale, Jezero and Oxia; do not restore historical polygon renderers or merge historical branches wholesale. No objective-linked routing is marked complete here. No objective runtime change was necessary for I4B correctness; manual waypoints and valid current terrain routes remain fully supported.

## Reproduction

```powershell
node scripts/prepare-map-worker.mjs
node scripts/build-routing-worker.mjs
$i4bTests = @(rg --files tests -g '*.test.ts' -g '*.test.tsx')
node --import tsx --test @i4bTests
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
npm.cmd run start -- --port 3342
# Second terminal: set PLAYWRIGHT_BASE_URL=http://127.0.0.1:3342;
# run the exact nine-spec command from docs/evidence/i4b/browser-all-command.json.
```
