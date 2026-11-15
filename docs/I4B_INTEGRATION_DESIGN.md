# I4B integration design and file ownership

Foundation: I4A 3b52ad137728c57324aa020ac4321a299a1d6d98. Reference: R1.1 4434ebb6505d184cb9954634668d3e31939b1336. Selective adaptation only; no branch merge.

The canonical missionPlanningSnapshot owns mission inputs and accepts only current selected live terrain geometry. Its scenario boundary will feed a single EVA engine. The engine reuses the corrected R1.1 dimensional equations (rate times hours; separate metabolic/leakage; conditional cooling) with explicit missing-input, finite-value and reserve guards. R1.1 regional adapters, duplicate timeline, UI and persistence are not imported because they predate F1 contracts and contain hidden defaults and unsupported claims.

File ownership:
- lib/eva: validated assumptions, reviewed profiles/provenance, resource equations and presentation rows.
- lib/routing/planning.ts: adapt canonical ordered terrain/geometric legs to the existing validated timeline; call the EVA engine once. No search-engine changes.
- lib/mission/planning-snapshot.ts: mission identity, route receipt and source guards; attach current EVA output.
- lib/mission/model.ts: optional backward-compatible EVA inputs; computed outputs never stored.
- components/mission/terrain-routing.tsx and new EVA panel: use the existing planner snapshot, editable input controls; no local calculation state.
- components/mission/planning-summary.tsx and lib/mission/brief-html.ts: presentation of the same assessment rows.
- request-key.ts: exclude activity-only duration changes from geometry identity while retaining coordinates, roles, order, evidence and source identity. Resource changes must not reroute.
- tests and docs/evidence/i4b: independent arithmetic, actual routes, persistence/invalidation, production browser workflows and preserved-source receipts.

Gale/Jezero require current live terrain; no straight-line fallback. Oxia may use validated geometric legs, always labeled geometric-only, with null ascent/descent. Unknown stop duration blocks a complete estimate; explicit zero is valid. Base/terminus time is included only when explicitly entered. Round-trip geometry includes its searched return once and each stop is counted once.

Oxygen/battery legacy reserve preferences remain capacity holdbacks for old missions. New EVA settings expose additive consumption margins and a separate emergency-duration allowance. Both reserve bases are displayed; no implicit 30-minute NASA rule. Profiles supply no battery capacity or power defaults. Apollo disputed energy and unchecked coefficients remain null. The BVAD 0.076 reference is a conditional scenario, with separate 0.005 leakage assumption and disclosed ambiguity versus the separate Table 4-70 0.086 entry. Non-venting zero loss is an explicit idealized assumption, not a BVAD radiator specification.

The former resource-budget module is moved out of production into tests/support/legacy-resource-budget.ts solely for historical regression comparison. Production has one EVA resource engine; no active UI/export or production library calls the retired model.
