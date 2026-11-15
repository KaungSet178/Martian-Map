# Marswalk Planner final demo release

15 November 2026, Asia/Rangoon. Release branch: `release/marswalk-demo-final`. Worktree: `D:/martian-map-demo-final`.

## Candidate and scope

Foundation is exact completed I4D `994c2ecde29d25fa35b925320b7116019672f9ab`, verified clean before implementation. Origin was fetched. I4C Stage A was reviewed at exact `e0d4795c274450b9275c63d26185b5daeabde62a`, including its independent QA report and layer audit. I4D, I4C and teammates' worktrees were not modified; their preserved source states are recorded in [preservation.json](evidence/demo-final/preservation.json).

Only two production files change. No audit branch was merged, no numerical routing policy was changed, and no F2 redesign or 47-item style migration was attempted. All I4D sites, source snapshots, eligibility restrictions, retired Gale sample handling, mission logic and EVA calculations remain inherited unchanged.

## P1 I4C-01 disposition: mitigated, not corrected

The legacy Jezero slope generator replaces missing cardinal derivative neighbors with the center height. The new executable regression reproduces this: a missing western support becomes the valid value 100. This can make unsupported terrain look plausibly gentle.

A defensible correction requires regenerated display tiles and validation of source sampling, support, alpha and indexing. The release therefore quarantines `jezero-slope`: its stable category/ID, source citation, evidence, legend and original assets are retained, but its availability and rendering are unavailable. The disabled control displays the explicit I4C-01 reason. Stale slope-on state cannot mount the raster, mark its checkbox checked, or expose misleading opacity/legend controls. Browser checks confirm no slope-tile requests and visibly reachable disclosure at desktop/mobile sizes.

The separate authentic Jezero 25 m routing grid, slope barrier, nodata and corner restrictions, bounded snapping, Gale Python routing, and Oxia geometric-only behavior are unchanged. No source raster or numerical value is edited. Other scientific layers remain available.

## Essential validation

| Check | Result |
|---|---|
| Focused mission/routing/EVA/site + mitigation tests | 188 passed |
| Complete inherited I4D TypeScript discovery plus three release tests | 557 passed, 64 suites, no failures/skips |
| Focused production Chromium cases, desktop 1440x900 and mobile 390x844 | 15 distinct passed |
| Stronger visible-disclosure rerun | 2 passed, repeated subset of the 15 |
| Typecheck, lint, production build, routing health | Passed |
| Independent route numerical replay and I4D site-coordinate verification | Passed |

Three inherited layer-availability assertions were updated only to require the deliberate `jezero-slope` quarantine; source, attribution, legend, asset-checksum and other regional expectations remain intact. The exposed generator defect is explicitly reproduced rather than hidden by a claimed fix. I4C's separate style-conformance suite was not imported or represented as passing.

Production tests use real Python/Node workers at port 3358. Coverage includes authentic Gale/Jezero alternatives and return searches, Oxia geometric resources without invented terrain metrics, scientific site details/provenance, HTTP rejection of all 22 current unregistered site requests, EVA assumption recalculation, route invalidation, Save/Open, Review, JSON and downloaded HTML. Six existing I4B mission workflows, six I4D site workflows, one all-site HTTP case and two display mitigation cases comprise the 15. Console/runtime assertions in the existing workflows remain active. Screenshots of the visible slope notice were inspected.

[Validation logs](evidence/demo-final/validation-summary.json) and [browser artifacts](evidence/demo-final/browser) contain fresh release results. Historical generated I4D/I4A/I4B/F3 receipts were copied under release evidence then restored; no historical source evidence is silently replaced. Logs and review copies of downloaded text artifacts are normalized to UTF-8/LF with trailing whitespace removed; original download and review-copy hashes are in `artifact-provenance.json`, and original downloads remain under ignored output paths. Full Python cache-dependent regression and all historical browser/style suites were not repeated for this bounded release.

## Remaining findings and limits

- I4C-01 requires a validated display regeneration before Jezero Slope can be re-enabled; disabling it is a demo mitigation.
- I4C-02 through I4C-09 and the 47 proposed style conformance findings remain unresolved/unaccepted. This includes elevation processing/evidence caveats, palette/name/resolution consistency, Oxia interpretation/lighting caveats and compact layout issues.
- I4D source-to-grid registration and defensible positional uncertainty remain unavailable. Automatic registered-site terrain routing stays blocked. Published site coordinates, numerical routes and positive conditional EVA margins do not establish astronaut safety or access.
- Existing historical environmental observations remain observations, not forecasts. Chromium desktop/mobile tests are not physical-device or complete accessibility certification.

**This release is not full I4C Stage B acceptance.** No merge to main is performed. The exact pushed commit, live remote/local equality and clean-worktree state are recorded after commit in ignored `output/demo-final-delivery.json` and the delivery response; a tracked report cannot contain its own resulting hash.

## Reproduction

```powershell
node scripts/prepare-map-worker.mjs
node scripts/build-routing-worker.mjs
$f = @(rg --files tests -g '*.test.ts' -g '*.test.tsx')
node --import tsx --test @f
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run routing:check
npm.cmd run build
python scripts/verify-i4a-numerical.py
python scripts/verify-i4d-sites.py
npm.cmd run start -- --port 3358
# In a second terminal:
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3358'
node node_modules/@playwright/test/cli.js test tests/browser/final-demo.spec.ts tests/browser/i4b-eva.spec.ts tests/browser/i4d-sites.spec.ts --grep '1440x900|390x844|HTTP boundary'
```
