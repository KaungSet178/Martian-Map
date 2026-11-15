# I4C independent scientific and functional QA report

15 November 2026, Asia/Rangoon. **Stage A independent audit delivered with unresolved scientific-display and style findings. Stage B final I4D acceptance is pending.**

## Source and independence

Audited source is exact I4B `870f282c0b9349b1d36c058970d2220cc4ea5a5e`, fetched from `origin/feat/i4b-eva-integration` and matched before work. Dedicated branch `audit/i4c-acceptance`, isolated worktree `D:/martian-map-i4c-qa`. Inspected the worktree list first. Original worktree contained a modified map workspace and two untracked Gale scripts; none was edited. No main/I4A/I4B/I4D checkout changes, merges, cherry-picks, routing changes or production-source edits were made. I4D's branch was at the I4B base at initial inspection; no completed final SHA has been supplied.

[Reviewed-material hashes](evidence/i4c/reviewed-materials.json) identify all eight requested project reports/contracts and the historical comprehensive audit. Actual parsed manifests, category index, renderer, legends, numeric generators, route engines, evidence adapter, EVA engine, mission tests and persistence/export/browser flows were inspected. Historical pass counts were not reused as executed I4C outcomes.

## Scientific layer and source findings

[Scientific Layer Style Guide](SCIENTIFIC_LAYER_STYLE_GUIDE.md) defines one proposed source-aware naming system, common numeric ramps, slope classes, legend contract, evidence rules, unknown-data behavior, accessibility gates and implementation migration plan. [Layer consistency audit](I4C_LAYER_CONSISTENCY_AUDIT.md) inventories all 26 regional records, including the 18 category datasets. Stable layer IDs and genuine day/night products remain intact. Gale's separate color basemap is HiRISE, not CTX, and is outside that registry count.

**P1 I4C-01:** Jezero's legacy slope display generator uses center elevation for missing derivative neighbors and emits opaque output. The independent executed kernel fixture reproduces valid-height substitution at unknown support; it can flatten boundary gradients. This is not a claim of a broken route-search nodata mask. **P2 I4C-06:** Jezero elevation presentation itself discloses legacy Earth gradient spacing/shading errors. Numeric routing grids are distinct and remain unchanged. These processing caveats must be resolved before claiming corrected scientific display fidelity.

Other P2 findings: elevation evidence misclassification (Jezero/Oxia Observed versus Derived), inconsistent names/palettes/classes, no uniform explicit immediately associated legend Resolution field, Oxia unknown-lighting flat-gray claim and brightness/material inference mixture. The data register already discloses unavailable resolution; attribution and detailed scale prose exist, so this is not a claim that every source is missing. Proposed uniform palettes are specification changes, not retroactively failed NASA requirements. No P0 demonstrated. See I4C-01 through I4C-08 for exact source paths and proposed corrections; all belong to application/data owners, not silently implemented by I4C.

## Primary-source review and geographic uncertainty

[Primary review](evidence/i4c/primary-source-review.json) records exact source URLs, revisions, locators, retrieval limits and capture hashes. NASA's Artemis overview supports a below-20Ã‚Â° EVA planning boundary in the lunar Artemis III context (PDF pp.21/24), not universal Mars astronaut safety classes. Project 10Ã‚Â°/15Ã‚Â° boundaries remain visualization choices. Jezero's >25Ã‚Â° computational barrier remains unchanged, so visually High concern does not automatically mean computationally blocked.

BVAD Rev 2 Ã‚Â§4.6.2 (printed pp.133Ã¢â‚¬â€œ134) supports conditional oxygen/leakage and cooling references. The app's 0.076 metabolic interpretation plus separate 0.005 leakage remains a disclosed assumption; neither is a universal physiology/suit property. The radiator example reduces water use to 0.19 kg/h rather than proving zero. Nonventing zero consumable loss remains an idealized scenario. Apollo TN D-8093's description has 21.4 Ah and 16.8 V, whose nominal product is 359.52 Wh, with a conflicting Coulomb figure; 390 Wh is not adopted. I4C did not independently re-render Table VII. NASA-STD-3001 Vol 2 Rev D Ã‚Â§11.2.2 is suited nutrition, not a leakage coefficient. No universal 30-minute reserve is substantiated by these checked locations. No capacity/power defaults were invented.

Gale's seven objectives retain null coordinates, including Glen Torridon, Vera Rubin Ridge, sulfate terrain and Gediz Vallis contexts; Jezero's five mission goals also remain unlocated. The committed primary LPSC 2618 capture distinguishes the proposed 60 m landing circle at 18.45369687 N / 77.41359752 E from the separately tabulated depot drop zones. That position is not automatically eligible as a sample-depot waypoint. Live PDF fetch timed out twice, so this finding is explicitly based on the hashed local primary capture, not a new online retrieval.

Oxia's three Interpreted detections match the committed NASA Trek query after converting signed longitude to east-positive and rounding to original 0.01Ã‚Â° precision. Independent Mars-sphere distances are about 36.077 km primary-clay to silica and 15.765 km primary-clay to second clay. Live mineral metadata retrieval was unavailable through the web tool. Capture agreement is not new service authentication, independent basemap registration or meter-level accuracy. All these regions retain unknown positional uncertainty and unavailable operational authorization.

## Independent routing validation

Full baseline execution generates authentic route receipts; the subsequent independent Python replay imports no path-search engine. It checks source-grid cells, spherical geometry, DEM elevations, 3D integration, grade/ascent/descent, alternative cost, snapping, continuity, segment joins and return closure. Independent synthetic fixtures separately check a 100 m horizontal / 30Ã¢â‚¬â€œ40 m vertical profile and a longitude-seam arc using the 3,396,190 m Mars radius.

| Region / preference | Horizontal m | 3D m | Ascent / descent m |
|---|---:|---:|---:|
| Gale shortest | 4545.862753 | 4575.491280 | 234.899414 / 234.899414 |
| Gale lower terrain cost | 4545.868037 | 4574.930615 | 234.899414 / 234.899414 |
| Jezero shortest | 8999.780814 | 9009.254968 | 157.599854 / 157.599854 |
| Jezero lower terrain cost | 9085.623330 | 9091.640330 | 121.600586 / 121.600586 |

Evidence: [independent replay](evidence/i4c/numerical.log), [routing health](evidence/i4c/routing-check.log), [baseline tests](evidence/i4c/baseline-unit.log). These reference fixtures are not claimed as every possible mission. Gale uses authentic HRSC 30 m TIFF data with a separate 200 m fallback; Jezero uses its genuine 25 m numerical grid and geographic cell-center mapping. Invalid cells and diagonal corner barriers, >25Ã‚Â° restriction and bounded snapping pass existing synthetic/native regressions. Alternative cost is an algorithmic preference, distinct from horizontal and canonical 3D path metrics. Agreement tolerance in the replay is 1e-5 m for canonical metrics; exact source-grid/native reaggregation is a separate provenance question.

Oxia remains geometric-only: no foreign DEM substitution, no fabricated ascent/descent, and no terrain route API fallback. Longitude seam handling and spherical distance pass. Full-resolution native Jezero source reaggregation and full raw sensor recalibration were not repeated; committed genuine grid/asset integrity and real runtime path behavior were checked.

## EVA arithmetic, mission integrity and compatibility

Four added independent numerical cases pass. The fixed fixture has 7200 s travel + 3600 s activity + 1800 s delay, with a separate 900 s emergency. At entered 0.08+0.004 kg/h and 20% consumption margin, oxygen required is 0.378 kg; a 1 kg capacity and 10% holdback leave 0.522 kg. At 90 W, +10% margin and 1000 Wh/20% holdback, required energy is 371.25 Wh and remaining is 428.75 Wh. Water at 0.5 kg/h and +30% margin requires 2.4375 kg. These are independent hand-calculated targets, not values imported from the estimator. Unknown coefficients/capacities remain distinct, invalid physical inputs fail closed and no NASA operational approval is inferred.

Existing I4B tests cover actual 3D route-to-duration, stop overrides/fallbacks, return leg once, legacy aggregate g/h-to-kg conversion, subsystem separation, W-to-Wh, profile unknowns, venting/ideal nonventing, reserve/emergency/holdback semantics, arithmetic bounds and stale identities. F1/I4A/I4B regressions cover base/terminus/order, retired/foreign objectives, one-way synchronization, round-trip closure, evidence propagation, request cancellation, Save/Open/JSON compatibility, stale terrain/EVA invalidation, Review and escaped downloaded HTML. Saved inputs are authoritative; saved geometry is never trusted without recomputation. Historical environment series remain rover observations, not future forecasts.

## Executed regression results

[Machine-readable validation](evidence/i4c/independent-validation.json) and [exact command runner results](evidence/i4c/command-results.json) record executed commands, durations and logs. Environment: Windows, private unchanged-lockfile npm install, Next 16.4.6, Chromium software WebGL. This is not real-device or all-browser certification.

| Gate | Actual outcome |
|---|---|
| Map worker and routing worker preparation | Pass |
| Baseline full TypeScript discovery | 510 passed; 64 suites; zero skipped |
| Complete discovery including independent I4C tests | 604 tests: 556 passed, 48 failed; zero skipped |
| New numerical fixtures | 4/4 passed |
| New scientific-integrity fixtures | 3 passed, 1 failed (Jezero missing-neighbor display) |
| Style conformance | 39 passed, 47 failed against proposed shared specification |
| Python regressions | 190 run, 186 passed, four optional-cache skips |
| Independent route replay | Pass |
| Three-region asset verifier | 7,282 assets match source references |
| routing:check, typecheck, lint, build | Pass; final added TypeScript tests also typecheck/lint cleanly |

The mandated full TypeScript invocation **exits nonzero** because it includes independently exposed defects and unmet proposed conformance. It is not reported as an overall green suite. Exact failure names and expectations remain in [conformance evidence](evidence/i4c/layer-style-conformance.json) and logs. Optional Python skips concern raw source caches, not functioning numerical workers.

## Browser acceptance and visual limits

A first broad discovery selected 169 historical cases and was deliberately interrupted after obsolete Gale fit-control selectors failed. Its partial log is retained as `browser-broad-interrupted.log`; it is not acceptance. The screenshot showed the real map/color layer and the current Gale controls; the missing old accessible name is a test-maintenance issue, not proof of broken fit behavior. No production or teammate test files were modified to hide the failure.

The completed scoped run uses the repository's documented nine-spec I4B acceptance set plus 15 I4C cases (three regions Ãƒâ€” five requested viewports) via `tests/i4c/playwright.config.ts`, against `npm.cmd run start -- --port 3346`. Real Python/Node route workers are used; no route API interception supplies fabricated success. Detailed results are appended below after the run completes. New cases exercise all 18 scientific dataset controls, keyboard Space toggles, Home/End opacity, associated legend/scale text, screenshots and region isolation. Existing acceptance checks actual map pixels, nodata/coverage, science objectives, mission workflows and downloaded exports.

Text/metadata assertions do not certify all tile alpha pixels, physical-device interaction or color-vision accessibility. Full palette grayscale/color-vision review remains a migration acceptance gate. Dense compact layers panels retain extensive scrollable metadata; no broad F2 redesign was made. Visual inspection of Gale desktop Review and Oxia 320 px Review found compact trajectory-label clipping and crowded Review navigation (P3 I4C-09), with functional workflows still reachable. The scoped interface-guidelines review is recorded in the layer audit. Any blocked essential interaction is reported separately from visual crowding.

## Stage B handoff

Do not create a completed final acceptance report or `final-acceptance.json` until an exact completed I4D SHA is supplied. Fetch and verify that SHA, create a fresh acceptance checkout, record clean source provenance, port only audit tests deliberately and run against the unmodified implementation. Verify new sites independently against primary data, stable IDs, objective associations, coordinate meaning/conventions, registration/uncertainty, terrain coverage, server-side eligibility, waypoint contracts, cross-region rejection, stale routes/EVA, Save/Open/Review/exports and style conformity. Properly unavailable automatic routing is acceptable when scientific eligibility is not established. Current P1 display processing and all remaining style/source defects require explicit disposition; numerical success alone cannot close them.


## Completed browser outcome

The scoped production run completed: **91 passed, 0 failed, 0 flaky, 0 skipped**, selected 91 cases. Exact machine results: [browser report](evidence/i4c/browser-results.json), [log](evidence/i4c/browser.log), [viewport observations](evidence/i4c/viewport-results.json). All five requested dimensions are explicitly represented per region. Browser failures, if any, remain failures; no acceptance is inferred from an interrupted run. Dedicated layer cases do not assert future palette conformance; those independent static contract failures remain separately open.

[Preserved artifacts](evidence/i4c/browser-artifacts.json) hash real downloaded HTML, saved mission JSON, routing receipts, per-dataset map pixel/opacity observations and representative screenshots. Full raw images/traces remain in ignored `output/playwright/`; selected screenshots and machine observations are committed for review. Visual inspection included [Gale desktop Review](evidence/i4c/browser/i4b/gale-1440-review.png) and [Oxia 320 px Review](evidence/i4c/browser/i4b/oxia-320-review.png).

Stage A recommendation: accept delivery of the independent audit/specification/tests, **retain the P1 display-processing finding and all conformance defects as open**. Do not label the application scientifically/style-conformant or give final I4D acceptance. Stage B remains pending an exact completed I4D SHA.


## Delivery review

Test-generated baseline evidence was preserved under I4C and restored in place. [Source preservation](evidence/i4c/source-preservation.json) confirms no application, source-data, routing, shared test-config or package changes. Only I4C docs/evidence/tests are delivered. The JSON reporter output path was corrected after the completed run to account for config-directory-relative resolution; the actual completed report was relocated without changing results. Fifteen viewport records contain no document-level horizontal overflow; compact clipping/crowding remains the separate P3 finding.

Evidence logs use UTF-8/LF and normalized trailing whitespace, with raw/normalized hashes recorded. Committed downloaded HTML copies normalize trailing whitespace only; browser-artifact records retain both raw download and normalized hashes, and original downloads remain under ignored output paths.

Pre-push privacy/size review: two local user-home directory prefixes in the Python log were replaced with `<USER_HOME>` and its normalized evidence hash updated. No test/assertion/result changed; all 48 failures, including P1 I4C-01 and 47 style failures, remain open. Five screenshots and their metadata were reviewed; no credential patterns or embedded email addresses were found in the audit payload. The original 5.8 MB payload has no file larger than 661 KB and contains review evidence rather than build/dependency/native-raster archives. See [pre-push review](evidence/i4c/pre-push-review.json).
