# F1 — Mission integrity and scientifically honest planning

15 November 2026 · Asia/Rangoon. Implementation only; no scientific-source branch merges.

## Foundation and isolation

- Exact fetched starting commit: `26adc4c2e72c4febc2500de2eb11f8f30ef85ccd` (`origin/feat/map-routing-feature-integration`). Remote fetch matched the requested SHA.
- Branch: `feat/f1-mission-integrity-fixes`.
- Worktree: `D:/martian-map-f1-mission-integrity`, created after inspecting all registered worktrees. Dependencies installed from this worktree's lockfile with `npm ci --ignore-scripts`.
- Existing worktree application files were not edited. The original `D:/martian-map` contained unrelated renderer/script changes and was left untouched. I3A was inspected read-only for baseline reproduction.
- No merges, force pushes, changes to main, scientific target edits, source registry edits, environmental dataset edits, terrain byte changes, or terrain search algorithm changes.

## Audit inspected and reproduced against I3A

Read the complete three-region audit at `D:/martian-map-audits/2026-11-15/MARSWALK_THREE_REGION_COMPREHENSIVE_AUDIT.md` and I3A's integration report. Findings apply to their exact builds, not automatically to this starting commit.

| Finding | I3A reproduction / disposition | F1 result |
|---|---|---|
| A01 | Reproduced using component rendering: a manual waypoint named `MANUAL_END_RAW` was absent from Brief; endpoints remained hard-coded unavailable. I3A did already export live terrain metrics. | Shared snapshot exports the ordered itinerary, raw coordinates, roles, stops, objectives, assumptions, geometric and current terrain/scenario outputs. |
| A02 | Reproduced with the actual Oxia catalog: classification `Interpreted`, itinerary contains `Observed · NASA Target`. | Independent evidence metadata; no provenance-based Observed/NASA promotion; unpadded catalog coordinate display and explicit precision disclosure. |
| A03 | Reproduced by pure transitions and component rendering: last ordinary point lacks Terminus; moving base gives `start=null`; selecting a new base leaves two base roles. | Role-based actions, unique-role promotions, pinned endpoint ordering, recoverable missing/duplicate endpoints, one return closure. |
| A05 | Partially resolved before F1: I3A already supplies authentic Gale/Jezero alternatives and terrain → timeline → resource scenario controls. Oxia terrain remains deliberately unavailable. | Preserve integration; Review and Brief now expose the same supported outputs, and endpoint changes invalidate route-dependent results. |
| A08 | Reproduced: objective editor says no base despite stored base and waypoints; broad distance-unavailable copy contradicts geometric planning. | Objective editor, Review, summary and Brief acknowledge existing inputs and geometric distance independently of operational feasibility. |
| A14 | Reproduced: two planning waypoints coexist with zero objectives and objective-only global/saved counts. | Distinct objective, waypoint and science-stop counts; navigation count represents planning inputs; singular/plural labels corrected (also A20). |
| A15 | Reproduced as a coverage gap: the baseline's suite lacks semantic export, evidence-promotion and endpoint-role assertions. | New unit/component and browser acceptance tests assert values, transitions, persistence and export contents. |
| A16 / B02 | Already corrected in I3A source: portable `process.cwd()` root; native Jezero projection/barrier/corner protections. | Preserved and exercised by build, runtime, unit and browser regressions. |

Remaining findings were inspected for scope: A04/A06/A09/A10/A12/A13/A17/A18/A19 belong to responsive/accessibility/design work; A07/A11/B01/B03 concern scientific metadata, copy or separate scientific/resource branches. F1 does not claim to resolve them. Broad F2 responsive work remains deferred. No coordinate or polygon correction was attempted.

Before evidence above is read-only SSR/component and pure-function replay on the frozen I3A source, not a retrospective browser audit of that build. After evidence is automated unit/component tests plus live production-browser acceptance described below.

## Mission state contract

`missionPlanningSnapshot(mission, region, liveRoute?)` is the single derived planning contract. It resolves the mission's regional waypoint plan and produces:

- Canonical persisted/exported mission inputs (`snapshot.mission`), ordered itinerary and selected scientific objectives.
- Distinct counts, actual base/destination roles, validation issues and non-waypoint/unlocated objectives.
- Geometric legs and spherical Mars distances with separate outbound/return totals.
- Current terrain result only when its model, mission receipt, alternative, region and requested endpoint sequence match.
- The existing terrain timeline/resource calculation using current user assumptions and per-waypoint stop durations.
- Explicit operational assessment limitations.

Review and on-screen Brief use `PlanningSummary`; downloadable HTML uses `planningSnapshotHtml` over the same snapshot. HTML presentation duplicates no mission calculations. Planner summaries and JSON/save controls use the same snapshot's counts/mission. No server-rendering runtime was added to the client bundle to generate downloads.

Mission schema version stays **1**. Optional waypoint additions: `evidence`, `previous_evidence`, `stop_duration_seconds`, `inactive_reason`. Optional mission addition: `retired_objectives` (ID, optional historical title, reason). Existing route receipts remain lightweight preferences/model/source/request identity; computed route geometry is not persisted as a valid route.

## Endpoint-role invariants and transitions

- A valid plan has exactly one `base`; one-way plans additionally have exactly one `destination` or `recovery_endpoint` distinct from base. Missing/duplicate roles are editable errors, not inferred coordinates.
- Identity comes from roles. Canonical ordering pins base first and one-way terminus last; intermediate moves/reorders retain their relative requested order. Moving an intermediate ahead of base or base down deliberately reconciles to the selected endpoint identity.
- Make Base demotes every previous base; Make Terminus demotes previous termini. Actions depend on roles and remain available at list boundaries, including the last ordinary stop. Duplicate-role plans can be repaired using the same actions.
- Switching to round trip demotes the one-way terminus but preserves its point, label, coordinates, target association, notes and stop duration. Switching back requires an explicit terminus selection.
- Removing base/terminus leaves a recoverable missing-role state. No automatic science-target coordinate becomes a verified base.
- Round trip adds exactly one geometric return leg to the chosen base. Authentic terrain routing independently computes its actual return leg; no distance doubling or reuse of the outbound path substitutes for it.
- `applyMissionChange` reconciles shared state and drops mismatched receipts. I3A's live key/abort/sequence protections still reject stale results. Scenario outputs derive only from the current live route; changed assumptions recompute scenarios.
- Scientific objective order is retained independently of waypoint order. Deselecting a catalog endpoint cannot silently recreate its coordinates as a user-defined endpoint.

The server boundary additionally requires unambiguous endpoint roles, orders by those roles, and rejects inactive, unknown, ineligible or coordinate-mismatched scientific references. Native Python/TypeScript search engines, their metrics and their restrictions are unchanged.

## Evidence propagation and geographic precision

Catalog conversion copies the actual evidence classification and source IDs. Coordinate verification, independent source verification, processing verification, absolute registration, positional uncertainty, representation and routing eligibility are separate fields. Legacy `verification`/`coordinate_verified` are never expanded into source/processing/registration certification; unsupported dimensions remain null/unverified.

User inputs remain user-defined. Oxia's interpreted point remains Interpreted. Gale geological areas are never converted into point waypoints. Jezero location-unavailable objectives remain selected objectives without fabricated positions. A source-backed point does not establish geographic registration or operational navigation readiness.

Catalog coordinates display their supplied numeric values without four/six-decimal padding; raw values remain in storage and exports. Catalog location notes and an explicit unknown-uncertainty/registration disclosure accompany the coordinates. Manual entry no longer truncates stored input to six decimals. When a current catalog assessment differs, prior saved evidence is retained in `previous_evidence` and identified separately as historical, superseded context.

## Save/Open, JSON and retired-target compatibility

Existing valid v1 missions remain accepted, including plans without an optional regional plan ID (the containing mission supplies it). Explicit foreign-region plans/IDs are rejected. A temporarily blank editable plan title preserves all manual points; saving still requires a valid mission name.

Unknown same-region objective IDs are treated as **retired or unavailable references**, rather than rejecting the whole mission or deleting them. Current catalog removal or unavailable/mismatched scientific locations preserve the stored label, coordinates, role, notes, durations, IDs and available evidence. Such historical points receive an inactive reason, remain inspectable in itinerary/Review/exports, and block active route generation until the user resolves/removes them. They do not become manual navigation points or new point coordinates. Saved retired reference titles/reasons are retained where present; pre-F1 objective-only saves containing only an ID cannot recover a title that was never stored.

On reload/Open/import, no live terrain result exists until recomputation. Saved preference/model/source metadata is presented as requiring recalculation. Storage failures continue to preserve existing browser data. JSON/HTML escaping and existing schema/bounds validation remain in effect.

## Product update and F3 integration dependency

F3 owns removal of geological-unit overlays/targets and all scientific files. F1 does not reference geological-unit polygons, extract centroids, add unit IDs as destinations, or import the objective-verification branches. Its compatibility path treats IDs absent from the active catalog as inactive historical references.

For integration, F3 must remove retired IDs from active target catalogs/menus and may supply historical `retired_objectives` titles/reasons when available. A retired target must remain absent or explicitly ineligible; do not replace its ID with an unrelated point, mark its historical coordinates as manual, or re-enable routing merely to satisfy old saves/tests. Re-run the retirement and evidence acceptance tests after the scientific changes. If F3 introduces independently established source/processing/registration/uncertainty fields, explicitly map their meanings into the waypoint evidence contract; do not infer them from the legacy catalog verification enum. Source corrections (including Oxia separation copy and any claimed meter-level registration) remain F3 dependencies.

## Validation and acceptance

Final validation results are recorded here after completion. Browser evidence is generated under `output/playwright/f1/` and `output/playwright/i3a/` in this worktree; logs under `output/f1/`.

- `npm.cmd run routing:check`: passed with checksum-validated authentic Gale compact DEMs and functioning Jezero worker.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed without warnings on the final source.
- `npm.cmd run build`: passed, isolated production server at `http://127.0.0.1:3295`.
- Full TypeScript suite, all `tests/**/*.test.ts` and `tests/**/*.test.tsx`: **447 passed, 64 suites, zero failed/skipped**. Includes Jezero routing, Gale routing, terrain integration, environmental regressions and F1 semantic tests.
- `python -m unittest discover -s tests -p 'test_gale*.py'`: **149 tests, 3 skipped, zero failures**; skips require uncommitted raw PDS weather files or the raw USGS DEM subset. Includes authentic compact terrain runtime tests.
- Gale environmental Python regression: **4 passed**.
- Jezero environmental Python regression: **21 tests, 1 skipped, zero failures**; optional raw PDS cache absent.
- Browser result: **41 unique browser tests passed**: 32 mission/terrain/environment/waypoint tests; 7 interactive map/touch tests; 2 final-production current-scenario tests at 390 and 320 px. Zero browser test failures in completed runs. An initial new-test run was stopped to correct an exact accessible-name selector; no application workaround was used..

Three-region acceptance includes a three-waypoint manual mission in Gale/Jezero/Oxia, one-way designation and round-trip switch, explicit stop duration, save/reload, explicit Open, JSON export/import, Review and downloaded HTML with actual names/order/coordinates/evidence. Desktop **1440 × 900** and mobile **390 × 844** are tested; existing routing coverage also includes 768 × 1024. Authentic Gale/Jezero tests verify independently computed return legs, source identity, registration unverified, canonical horizontal/3D distances, selected alternatives, scenario propagation, source switching, saved receipt recomputation, no-path and stale-response behavior. Oxia retains unavailable terrain/environment states.

### Screenshot evidence

| Region | Desktop Review | Mobile Review |
|---|---|---|
| Gale | [1440 × 900](screenshots/f1/gale-1440-review.png) | [390 × 844](screenshots/f1/gale-390-review.png) |
| Jezero | [1440 × 900](screenshots/f1/jezero-1440-review.png) | [390 × 844](screenshots/f1/jezero-390-review.png) |
| Oxia | [1440 × 900](screenshots/f1/oxia-1440-review.png) | [390 × 844](screenshots/f1/oxia-390-review.png) |

Representative Gale desktop and Oxia mobile screenshots were visually inspected. Existing sheet/navigation density remains visible and is deferred to F2. Browser acceptance separately scrolls and asserts the complete itinerary and downloaded artifacts; a screenshot alone is not the functional evidence.

## Limitations

Research estimates remain unregistered and operationally unverified. No astronaut safety clearance, future weather forecast, life-support certification or recovery authorization is introduced. F1 validates functionality against the current I3A scientific catalog, not F3's not-yet-integrated replacements. Compact-height layout, broader mobile redesign, print-driver/PDF rendering, real devices, other browser engines, independent scientific source validation and full raw-data recalibration remain outside this milestone. Screenshots/browser success do not establish those claims.

## Changed-file inventory and delivery

- `components/mission/analysis.tsx`
- `components/mission/brief.tsx`
- `components/mission/editor.tsx`
- `components/mission/planning-summary.tsx`
- `components/mission/waypoint-editor.tsx`
- `components/mission/waypoint-itinerary.tsx`
- `components/planner.tsx`
- `lib/mission/brief-html.ts`
- `lib/mission/model.ts`
- `lib/mission/planning-snapshot.ts`
- `lib/mission/waypoint-bridge.ts`
- `lib/mission/waypoint-planning.ts`
- `lib/routing/planning.ts`
- `lib/routing/request-key.ts`
- `lib/routing/server.ts`
- `lib/routing/use-terrain-routing.ts`
- `tests/browser/f1-mission-integrity.spec.ts`
- `tests/f1-mission-integrity.test.tsx`
- `tests/terrain-integration.test.ts`
- `tests/waypoint-bridge.test.ts`
- `tests/waypoint-planning.test.ts`
- `tests/waypoint-ui.test.ts`
- `docs/F1_MISSION_INTEGRITY_REPORT.md`
- `docs/screenshots/f1/gale-1440-review.png`
- `docs/screenshots/f1/gale-390-review.png`
- `docs/screenshots/f1/jezero-1440-review.png`
- `docs/screenshots/f1/jezero-390-review.png`
- `docs/screenshots/f1/oxia-1440-review.png`
- `docs/screenshots/f1/oxia-390-review.png`

Implementation commit SHA: `d008ea1f7b55eaa3f5d2ab4811308cce04d6ff39`.
Final delivery commit SHA is supplied in the delivery response and [local delivery record](../output/f1/delivery.json); the tracked report's implementation revision is recorded explicitly rather than claiming a self-referential Git hash. No merge was performed. Final local/remote HEAD equality is checked after normal branch push.
