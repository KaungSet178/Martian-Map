# I4D science routing integration report

15 November 2026, Asia/Rangoon. Branch `feat/i4d-science-location-routing`; isolated worktree `D:/martian-map-i4d-science-routing`.

## Outcome

A source-qualified science-site registry now connects objective inspection, site details, point context, explicit site selection, permitted Oxia geometric stops, canonical mission state, Save/Open, Review, JSON and HTML. **Automatic Gale/Jezero objective-linked terrain routing remains unavailable pending independent registration or source evidence.** No registered science destination or completed site visit is claimed. Existing manual terrain routes and I4B EVA estimates remain operational.

At the user's subsequent submission-cleanup request, the three Gale sample Scenario objectives were removed from the active catalog. Four source-backed contexts remain: Glen Torridon, Vera Rubin Ridge, sulfate-bearing terrain and Gediz Vallis. Old sample IDs retain their titles and explicit retired status in saved missions; they cannot produce active endpoints.

## 1. Exact foundation and ancestry

Origin was fetched successfully before worktree creation. Required remote references matched:

| Role | Exact SHA |
|---|---|
| Authoritative I4B foundation | `870f282c0b9349b1d36c058970d2220cc4ea5a5e` |
| Historical Gale reference | `10f6f795f0a73f01ff151e86e033263359ae94a0` |
| Historical Jezero reference | `c39b7a32a28efee2dc9a8c7bc8f969b7b0d946d4` |

I4B directly follows I4A `3b52ad137728c57324aa020ac4321a299a1d6d98`, then F1 `f8d633884fd385b57f06f14a983227513c7dd060`. No historical science branch was merged. The dedicated I4D branch was created from the exact I4B commit, after inspecting registered worktrees, available path, catalog contracts and server eligibility. [Starting state](evidence/i4d/starting-state.json) records source ancestry and the original workspace's dirty-file hashes.

## 2. Isolation and reviewed evidence

Application writes, dependencies, generated outputs and tests are confined to the I4D worktree. The original `D:/martian-map` had unrelated renderer/script edits and was left untouched. I4B was read as source/dependency evidence and was not edited. Shared Git fetch/worktree administration was explicitly authorized. No main merge, branch reset or force push occurs.

Reviewed I4B's pending-objective section and machine evidence; I4A integration and I4B input contracts; F3 verification, integration notes and compatibility records; F1 integrity; the comprehensive three-region audit; and both historical objective reports from their exact Git objects. [Reference hashes](evidence/i4d/reference-reports.json) identify the actual files. Local Next.js 16.4.6 server/client and route-handler guides were read before code changes. Private dependencies were copied only after matching lockfile hashes.

## 3. Scientific candidate inventory and decisions

The 22 records comprise five unlocated Gale drill investigations, fourteen Jezero records and three preserved Oxia interpreted mineral detections. Jezero includes ten PDS rover positions during actual depot tube-drop events, the distinct proposed landing-circle center, two published sample-report investigation coordinates whose exact reference point/latitude frame remain unresolved, and unlocated Hogwallow Flats context.

All are integrated at their supported confidence level. Zero are accepted as registered terrain destinations. No arbitrary minimum site count, rover-to-target substitution, tube endpoint inference, depot centroid or approximate polygon is introduced. [Scientific verification](I4D_SCIENTIFIC_SITE_VERIFICATION.md) documents every candidate and decision.

## 4. Primary source verification

The PDS `sample_tube_locations.csv` and PDS4 label v1.0 are preserved verbatim, with the source identifiers/target table. The depot User Guide and PLACES SIS were downloaded and inspected; their URLs, versions and hashes are delivered, with raw research copies retained in ignored `output/i4d-sources/`. Independent reproduction checks all ten latitude/longitude fields and original strings. Upstream localization processing is not independently audited, so its verification flag remains null; numeric transcription checks do not certify that processing. The table describes rover positions during tube drops, not sample-tube endpoints or their original collection outcrops. The archive's release notes identify 15 October 2024 as release 1; the older landing-page date is not silently used as product provenance.

The 34.8 MB Initial Reports Volume 2 Release 2 was downloaded and inspected locally. Swift Run p.14/report 11-1 and Hazeltop p.58/report 14-1 contain the retained numbers; source hash and narrow excerpts are delivered, and the full volume remains in ignored `output/i4d-sources/`. Swift Run running-header/body identifier inconsistency is disclosed. Frame/reference-point uncertainty prevents marker creation for both sample-report records. Source existence does not establish registration.

The previously committed LPSC 2618 primary PDF was independently read again. Its proposed 60 m landing-circle center is kept separate from depot rover events. Gale NASA/JPL and primary literature establish named investigations; the reviewed material did not independently reproduce usable point coordinates. Camera locations and regional map centers are not substituted. Unknown source dates/versions/feature identifiers remain null.

## 5. Coordinate reference and uncertainty

Geographic values use explicit Mars body, latitude convention, east-positive longitude/range, datum/body-reference description and original published strings. No source numeric precision is padded. PLACES geographic latitude/longitude are retained directly; its projected eastings (standard parallel 18.4663 degrees) are never treated as coordinates in the application's zero-standard-parallel native terrain projection.

Native grid intersection uses the existing Mars sphere radius 3,396,190 m and authentic grid metadata. Eleven qualified Jezero source points intersect valid numerical cells. Direct cell slope checks and center displacements are recorded independently of actual engine snapping. The two sample-report positions with unresolved frame are excluded from these compatibility claims. Every absolute registration flag remains false; uncertainty remains null. Design radius, decimal places and orbital pixel spacing are not error budgets.

## 6. Site/objective/waypoint architecture

`lib/science/sites.json` is the current source registry; `sites.ts` validates its records and separates evidence, coordinate support, frame compatibility, source processing, registration evidence, uncertainty, coverage, computational cell restriction, snapping and operational safety.

Existing objective IDs remain objectives. A site has its own ID and explicit objective associations. Mission schema v1 gains optional validated `science_sites` selections: site ID, objective ID, a content revision, and an immutable source snapshot for historical provenance. A waypoint may carry a small `science_site` reference. Current evidence derives from the registry; saved snapshots are historical evidence and are not accepted as routing permission. A content revision detects changes across source/coordinate/interpretation metadata, without claiming to be an authentication signature.

## 7. Routing eligibility and server policy

Unlocated, frame-unresolved and source-located/registration-unverified states are distinct. Registered research eligibility requires supported coordinates, compatible frame, source/processing support, documented datum, registration evidence tied to the requested dataset, and an uncertainty budget. Numerical terrain restrictions remain separate final checks. No research opt-in bypass is exposed for today's unregistered sites.

The server revalidates region, site ID, current revision, objective association, exact coordinates, dataset registration and duplicate site references before native workers run. Frontend flags and saved evidence cannot grant eligibility. All 22 current records reject site-linked terrain requests. Manual inputs remain manual even at identical coordinates; proximity never creates an association. Oxia's explicit geometric action does not enable a terrain engine.

## 8. Site-selection interface and markers

Objective details show associated sites through focused disclosures using the existing design system. Each displays title, objective, importance/physical meaning, source link/version/feature locator, original coordinates, frame, registration, uncertainty, numerical coverage, routing status and limitations. Users can include/remove site context without claiming a visited stop.

Only frame-compatible, source-supported Jezero locations create context point markers. They are keyboard-focusable buttons, open the associated objective and retain unverified-registration labels. No marker is fabricated for Gale or Hogwallow Flats. The two sample-report points remain undisplayed pending frame reconciliation. Oxia retains existing source point rendering and gains no duplicate marker system. No unit geometry/toggle/legend is restored.

## 9. Canonical mission and waypoint invariants

F1 role ordering, exactly one base, explicit one-way terminus, real return closure, recoverable invalid configurations and no endpoint promotion remain intact. Existing waypoint creation now carries the optional site reference instead of dropping it. Duplicate Oxia additions reuse the existing associated stop and preserve its role. Waypoint evidence retains the scientific classification, source citation, site identity and uncertainty; it is never overwritten by generic manual-point evidence.

Invalid/changed source references become inactive while preserving their stored coordinates. Unknown retired records retain historical identity. Changed source coordinates do not silently move the waypoint. Same-region inactive references do not invalidate an otherwise readable mission; cross-region associations reject. A stale coordinate cannot keep current coordinate-verification permission.

## 10. Gale submission cleanup

The later user instruction overrides the earlier requirement to retain the three Scenario samples in the active catalog. `gale-objective-1`, `gale-objective-2`, and `gale-objective-3` are removed from `regions/gale/targets.ts`. A small retired registry preserves their names and former Scenario meaning for saved v1 missions. Parser, Plan, Review and brief show the retirement reason. Unrelated manual points survive. Four genuine investigation contexts and their photographs remain active. Legacy test fixtures now use genuine active contexts where new selection is intended.

## 11. Terrain engines and genuine routes

Gale's authentic Python HRSC A*/Dijkstra implementation, both compact DEMs, source costs, coverage/nodata rules and real return searches are unchanged. Jezero's corrected native 25 m TypeScript worker, 25-degree restriction, corner/nodata barriers, geographic indexing and bounded snapping are unchanged. Lower terrain cost is never renamed safest.

Fresh complete TypeScript I4A/I4B tests exercise both real alternatives, ordered segments, searched return legs, requested/snapped positions and canonical metrics. Fresh receipts are copied into I4D evidence before historical generated receipts are restored. The independent I4A numerical validator checks path metrics, native costs, snapping, cell connectivity and restrictions separately from engine tests. These are manual research probes, not evidence of access to a scientific site.

| Region | Alternative | 3D distance m | Horizontal m | Ascent/descent m | Vertices |
|---|---|---:|---:|---:|---:|
| gale | shortest | 4575.491 | 4545.863 | 234.899/234.899 | 120 |
| gale | lower-terrain-cost | 4574.931 | 4545.868 | 234.899/234.899 | 120 |
| jezero | shortest | 9009.255 | 8999.781 | 157.600/157.600 | 337 |
| jezero | lower-terrain-cost | 9091.640 | 9085.623 | 121.601/121.601 | 337 |

Maximum requested-to-snapped displacement is 12.4814 m for the Gale probe and 12.0886 m for Jezero, below the requested 100 m bound. These are actual fresh manual-engine results; site-linked route metrics remain null.

## 12. Oxia geometric regression

All three original two-decimal NASA Trek coordinates and interpreted classifications remain unchanged. Explicit site addition is geometric only and preserves the source reference; repeated addition produces no duplicate stop. Existing legacy objective-only saved missions continue to work. No Gale/Jezero grid, DEM relief, ascent/descent or terrain feasibility is supplied for Oxia. The independent source check and unit/browser workflows exercise this distinction.

## 13. EVA integration and invalidation

`estimateEVAResources` remains the only production resource engine and is unchanged. Canonical current routes continue feeding travel/science-stop durations, oxygen, energy, cooling water and reserves. Site references and evidence participate in request identity; adding/removing/reordering an associated stop invalidates stale route-dependent results. Context-only selections are not route endpoints. Resource-only assumptions still recompute without terrain searches.

Positive conditional margins do not confer operational feasibility. Source registration remains unverified in the same snapshot, Review and export even when manual-route resource arithmetic is available.

## 14. Save/Open, legacy and retired references

Optional additions preserve schema version 1 and old missions without site metadata. Source selections persist their identity/revision and historical source snapshots. Reopen revalidates the live registry, associations and coordinates, preserves retired/changed identities, and never silently remaps them. Computed geometry is not saved as automatically trusted output; terrain routes require recomputation. Source selections can be removed from Plan, including stale records. Site context counts are shown separately while retaining F1's original count-object contract.

## 15. Review, JSON and HTML

Plan and Review use the canonical planning snapshot. JSON/save export that snapshot's canonical mission inputs, including the single persisted site provenance snapshot. HTML presents the same site/objective IDs, source citations, coordinates, classification, registration, uncertainty and unavailable reason without another calculation pipeline. Context selections explicitly are not completed visits. Waypoint itineraries include the association and source disclosure. Unknown and retired references remain identifiable.

## 16. Scientific layer and asset preservation

Elevation, Hillshade, Slope and Thermal remain active in all three regions. The required asset verifier confirms 7,282 identical map assets. Source URLs, data values, map tiles, authentic grids, coverage, legends, opacity, attribution, camera behavior, rover traverses and historical environmental adapters remain preserved. Only the explicitly requested Gale Scenario catalog records and retirement metadata change regional science content. No DEM or sensor value is adjusted to make a site routable.

## 17. Independent numerical and unit validation

The final complete TypeScript suite passes 554 tests in 64 suites, including I4B EVA tests and 44 new I4D cases. The source-specific independent Python verifier reproduces all ten PDS depot rover coordinates and checks native Jezero coverage without importing routing code. Coordinate wrapping/projection roundtrips, frame guards, invalid/nonfinite values, evidence/precision bounds, cross-region and duplicate associations, stale/retired source handling, legacy reopen, scientific classification, server rejection and export are tested.

Required Python results: Gale 149 run with 3 optional-cache skips, Gale environment 4 pass, Jezero environment 21 run with 1 optional-cache skip, Jezero source routing 9 pass, Jezero hillshade 7 pass. Total 186 passes and four skips. Runtime health, independent I4A numerical validation, asset verification, typecheck, warning-free lint and production build pass. Raw log normalization and final results are recorded in `evidence/i4d/validation-summary.json`.

## 18. Production browser acceptance

**100 distinct production-browser cases pass.** The full ten-spec batch passed 95 cases. After conservatively leaving upstream source-processing verification unknown, all 19 I4D cases passed again alongside five migrated sample-dependent legacy cases (24 in that run). The 19 repeated cases are counted once. Logs: [full batch](evidence/i4d/browser-all.log), [final source/cleanup run](evidence/i4d/browser-final-sites-and-cleanup.log). The production HTTP boundary rejects all 22 current site requests with HTTP 400; each actual error is attached to its site acceptance record. Desktop and 320 px site panels and the mobile retired-mission brief were visually inspected.

Tests use the production Next.js application on `http://127.0.0.1:3344`, genuine Python/Node terrain workers and Chromium software WebGL. The five required viewports are 1440x900, 768x1024, 390x844, 320x640 and 844x390. New cases cover source details, source coordinates/citations, unavailable actions, qualified markers, duplicate-safe Oxia geometric addition, Save/Open, source snapshots, Review/JSON/HTML, region isolation, all-site HTTP rejection and sample-objective retirement recovery. Existing I4B cases cover actual routes/resources, alternative choice, invalidation, assumptions-only resource changes, one-way/return behavior and genuine downloaded briefs.

An earlier batch was deliberately interrupted when the user added submission cleanup; it is retained only under ignored `output/i4d-diagnostics/` and is not counted as final acceptance. Initial factory-reference and Windows pipeline text issues were corrected; final checks use the corrected application. This is functional Chromium acceptance, not physical-device, other-browser, full accessibility or operational certification.

## 19. Reproduction

```powershell
node scripts/prepare-map-worker.mjs
node scripts/build-routing-worker.mjs
$f = @(rg --files tests -g '*.test.ts' -g '*.test.tsx')
node --import tsx --test @f
python -m unittest discover -s tests -p 'test_gale*.py'
python -m unittest discover -s tests/environment/gale -p 'test*.py'
python -m unittest discover -s tests/environment/jezero -p 'test*.py'
python -m unittest discover -s team/jezero/routing -p test_synthetic_routing.py
python -m unittest discover -s team/jezero/terrain -p test_hillshade.py
python scripts/verify-i4d-sites.py
python scripts/verify-i4a-numerical.py
python scripts/verify-three-region-assets.py
npm.cmd run routing:check
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run start -- --port 3344
# In a second terminal:
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3344'
node node_modules/@playwright/test/cli.js test tests/browser/i4d-sites.spec.ts tests/browser/i4b-eva.spec.ts tests/browser/environmental-conditions.spec.ts tests/browser/f1-mission-integrity.spec.ts tests/browser/f3-navigation.spec.ts tests/browser/f3-science.spec.ts tests/browser/gale-geology.spec.ts tests/browser/i4a-integration.spec.ts tests/browser/terrain-routing-integration.spec.ts tests/browser/three-region-integration.spec.ts
```

## 20. Remaining scientific limits

No candidate has the independently measured source-to-grid registration and uncertainty budget needed for automatic site-linked terrain routing. Gale still needs discrete coordinate/frame reconciliation. The two Jezero sample-report records need exact reference-point/latitude-frame reconciliation. Depot rover coordinates do not locate tube endpoints. Current numerical coverage, cell slope and manual-route success do not demonstrate site access, fine-scale hazards, physiology, thermal sufficiency, radiation safety or recovery approval. Oxia remains geometric only.

The correct outcome is a completed source-qualified catalog/provenance integration with explicit unavailable science-routing states. Full objective-linked terrain routing is not complete or claimed. No I4C or F2 redesign is started.

## 21. File inventory and delivery

The full reviewed inventory is [changed-file-inventory.json](evidence/i4d/changed-file-inventory.json). Changes are confined to science-site records/contracts/UI, optional mission/source associations, server policy/request identity, shared provenance presentation, the requested sample retirement, relevant tests and reports/evidence. Numerical engine algorithms, scientific assets and EVA equations are preserved.

The branch is delivered by a normal commit/push, without merging into main or modifying I4B. The final commit SHA, local/remote equality and clean-worktree confirmation are recorded after commit in ignored `output/i4d-delivery.json` and the delivery response. `git rev-parse HEAD` identifies the exact commit containing this report; a tracked report cannot embed its own resulting hash.
