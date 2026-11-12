# Shared regional architecture — delivery report

Date: 12 November 2026. Branch: `feat/shared-ui-redesign`. Baseline: `249e536`.
Repository and clean working tree were verified, remote references fetched, and local
HEAD matched origin/feat/shared-ui-redesign (0 commits ahead/behind) before changes.
This work updates the existing [PR #1](https://github.com/KaungSet178/Martian-Map/pull/1).
No regional branch or main branch was changed or merged.

## Assessment and decisions

The existing MapWorkspace, TargetCatalog/Details, LayerManager, EvidenceDetails,
MissionEditor, RouteComparison/FeasibilityPanel, MissionBrief and native dialog
primitives were reusable. Planner already owned region-isolated drafts, stop selection,
panel preferences and file flows. Mission storage was versioned and independently
validated. Those components/state mechanisms were retained.

The architectural bottleneck was a centralized `lib/fixtures/regions.ts` containing
all regional content and generated manifests. The old region schema did not describe
layer rendering, detailed provenance, reviewed display registration or distinct
capability gates. A few UI labels assumed scenario data or checked a specific region ID.

The restructure moves content into owned regional modules, makes the registry the
shared data entry point, extends the existing canonical contracts, and lets the
existing renderer/layer controls consume declarative regional data. It does not
redesign the interface, replace mission state, move the app to src/, duplicate types
under another schema, introduce a plugin framework, or implement a backend.

## Final tracked directory structure

```text
app/
  layout.tsx, page.tsx, globals.css, loading.tsx, error.tsx, icon.svg
components/
  planner.tsx
  map/map-workspace.tsx
  mission/{analysis,brief,editor}.tsx
  science/{catalog,evidence}.tsx
  ui/primitives.tsx
regions/
  gale/{config,targets,layers,index}.ts
  jezero/{config,targets,layers,index}.ts
  oxia/{config,targets,layers,index}.ts
lib/
  contracts/{primitives,science,region,planning}.ts
  regions/registry.ts
  map/{region-layers,preview}.ts
  mission/model.ts
  api/planning.ts
public/
  maps/README.md
  generated/                  ignored build-time worker assets
team/
  gale/CONTEXT.md
  jezero/CONTEXT.md
  oxia/CONTEXT.md
tests/
  mission.test.ts
  regions.test.ts
  browser/planner.spec.ts
docs/
  REGION_DEVELOPMENT_GUIDE.md
  architecture-restructuring.md
  frontend-integration.md
  ui-ux-audit.md, redesign-verification.md
  screenshots/
prototype/                    historical design reference, unchanged
.github/workflows/frontend.yml
AGENTS.md, README.md, PRD.md, DESIGN.md, TEAM_CONTRACT.md
region_manifest.example.json
package.json, package-lock.json, tsconfig.json
next.config.ts, eslint.config.mjs, playwright.config.ts
```

There is no unnecessary layout/ or types/ directory: the existing Planner is the
shared shell, and `lib/contracts/` owns inferred TS types plus runtime validation.
Region asset subdirectories `public/maps/gale`, `jezero`, `oxia` are created when
actual small reviewed assets exist; empty scientific directories/data are not invented.

## Shared interfaces and flow

| Interface / module | Purpose |
| --- | --- |
| `RegionManifest`, `RegionConfig`, `regionSchema` | Identity/status, scientific question, Mars reference, map configuration, sources, layers, targets, contextual datasets and capability gates; module entry points validate at runtime |
| `MarsGeographicCoordinates` | Planetocentric latitude and east-positive 0–360 longitude; explicit Mars reference |
| `MarsProjectedCoordinates` | Separate Mars body/CRS/easting_m/northing_m for future metric route results; never interchangeable with display coordinates |
| `SourceRecord` | Agency, instrument, product, HTTPS URL, acquisition/sol, native resolution, processing and limitations; unknown fields remain null |
| `ScientificLayer` | Stable ID, display/kind/availability, evidence, source/coverage, attribution, rendering union, opacity/visibility defaults and legend |
| `Target` | Stable regional ID, description/question/significance/activity, coordinate reference/verification, sources/evidence and routing eligibility |
| `map.visualization`, `capabilities` | Separate rendering availability, unknown/partial/audited terrain coverage, experimental routing, validated routing and full feasibility |
| `registry.ts` | List/resolve regions, safely handle unknown IDs, and retrieve targets, available layers, view configuration, evidence and capabilities |
| `region-layers.ts` | Single source/layer mount/cleanup driver, visibility/opacity state, thematic exclusivity, longitude display conversion and supported extent handling |
| `planning.ts` contracts | Proposed versioned FastAPI requests/responses, input revisions, projected candidate geometry, coverage/blocking, model provenance and assessments; no successful results or server implementation |
| `mission/model.ts` | Existing mission schema v1, stable IDs/order, budgets, source versions, storage and import validation preserved |

Each region assembles `{ ...config, targets, layers }` and exports the same parsed
manifest. The explicit registry imports all three modules. Shared React code imports
the registry/contracts, not scientific content assembly details. Region switches
remove previous map sources/markers, update the camera/data/provenance, clear transient
selection and restore the correct session draft. Namespaced layer IDs retain preferences
without leaking them into another region.

Available raster tile or GeoJSON layers can now be added through a region module.
Actual display requires documented Mars reference/extent and a reviewed transform
reference. Verified target coordinates can appear in scientific mode; schematic
positions remain isolated in `lib/map/preview.ts` and apply only to Scenario targets.
No Earth distance or scale is calculated. Metadata/schema validity is not a scientific
audit or navigation approval.

The persisted mission schema, original objective IDs and `shared-ui-fixture-v1` dataset
versions were retained because the restructure did not change scientific evidence.
Future substantive scientific updates must bump dataset_version and coordinate old-ID
migrations. JSON from the original frontend was exercised through export/import again.

## Regional developer handoff

| Developer | Own branch / files | Immediate next integration |
| --- | --- | --- |
| Coordinator, Gale | feat/gale-map; regions/gale/**, public/maps/gale/** | Curiosity/Mount Sharp source register, clay/sulfate targets, audited imagery/terrain; REMS/RAD retain historical context |
| Aung Khant Min, Jezero | feat/jezero-map; regions/jezero/**, public/maps/jezero/** | Perseverance/western delta imagery/terrain and target evidence; recorded traverse and MEDA context with source geometry/dates |
| Thaw Thaw Tun, Oxia | feat/oxia-map; regions/oxia/**, public/maps/oxia/** | Planned Rosalind Franklin area, geological/orbital sources and proposed targets; preserve stereo-vs-model DEM lineage and future-mission labels |

All three updated context documents describe eight practical handoff duties: ownership,
shared contracts, imagery/layers, verified targets, missing-data declarations, frontend
verification, coordinated shared changes, and PR preparation. See
[TEAM_CONTRACT.md](../TEAM_CONTRACT.md) and the executable-field examples in
[REGION_DEVELOPMENT_GUIDE.md](REGION_DEVELOPMENT_GUIDE.md).

Agree the reviewed common baseline before integrating regional branch work. Older
regional contributions may require a reviewed adaptation; do not overwrite them or
copy obsolete shared components across branches. Shared contract/renderer/API changes
require coordination. No outbound teammate messages or automatic merges were performed.

## Files created, moved and modified

- Created `regions/gale/config.ts`, `targets.ts`, `layers.ts`, `index.ts`; same four
  files under `regions/jezero/` and `regions/oxia/`: independent ownership and validated exports.
- Removed `lib/fixtures/regions.ts`; moved its content into those modules, preserving IDs,
  values and source-context links. This is a content split, not a scientific dataset update.
- Created `lib/regions/registry.ts`: explicit safe shared lookup API.
- Created `lib/contracts/primitives.ts`, `science.ts`, `planning.ts`; refined `region.ts`:
  one compositional runtime/type contract, richer lineage and separate capability gates.
- Created `lib/map/region-layers.ts`, `preview.ts`: renderer lifecycle and unitless
  preview geometry separated from React and scientific region content.
- Modified `components/planner.tsx` and `map/map-workspace.tsx`: registry-driven metadata,
  regional source/view application and namespaced layer preferences without replacing state.
- Modified `components/science/catalog.tsx`, `evidence.tsx`, `components/mission/editor.tsx`,
  `brief.tsx`: consume typed evidence/verification/provenance instead of assuming all future
  regional content is a scenario. Existing planning and export flows remain.
- Modified `app/globals.css` only to suppress the unavailable grid over an actual connected
  scientific map. Tokens, typography and layout rules were not redesigned.
- Modified `lib/mission/model.ts`: target readiness also respects declared routing eligibility;
  persisted mission format is unchanged.
- Created `tests/regions.test.ts`; updated `tests/mission.test.ts` imports and added browser
  region-switch/JSON-compatibility regressions in `tests/browser/planner.spec.ts`.
- Updated package.json's test command and playwright.config.ts's optional base URL for
  isolated production testing. No dependencies or lockfile versions changed.
- Updated README.md, TEAM_CONTRACT.md, all three team CONTEXT.md files and
  docs/frontend-integration.md. Created this report, REGION_DEVELOPMENT_GUIDE.md and
  public/maps/README.md. Regenerated region_manifest.example.json from the canonical registry.

## Verification executed

| Check | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed, including generated route types and strict TS |
| `npm test` | 12 passed: original 6 mission tests plus 6 architecture/registry/renderer/contract tests |
| `npm run build` | Production build passed |
| `npm run test:e2e` | 16 passed against the isolated production server at 127.0.0.1:3100 |
| Responsive screenshots | Actual renders inspected at 1440×900, 1024×768, 768×1024 and 390×844 |
| Visual preservation | All four default-view PNG hashes exactly matched the committed pre-restructure screenshots |
| Accessibility | Existing axe WCAG 2 A/AA and 2.1 AA scans passed in tested layers/science/dialog flows; keyboard focus, Escape and mobile sheets regressed successfully |

The browser suite still exercises inspection, multi-target editing/order, direction,
save/reload/reopen, invalid imports/stale versions, JSON and brief downloads, print/PDF,
offline interaction and Unverified assessments. Added tests exercise switching among
all three registries at every requested width, isolation of catalogs/evidence/drafts,
unknown URL IDs and successful legacy mission JSON interchange.

Synthetic renderer tests mount/clean up test-only source metadata, check visibility,
opacity/thematic state and longitude wrapping. They are not observations, geospatial
accuracy tests or a mocked scientifically valid route. Contract tests reject foreign
records, duplicate IDs, missing sources, unsupported verification and routing flags.

A transient port-3000 conflict was avoided by using an explicitly isolated production
port rather than stopping an unowned process. Local tests do not claim remote CI,
physical-device, screen-reader or cross-browser certification.

Current default screenshots (verified matching the earlier references):
[1440](screenshots/desktop-1440.png), [1024](screenshots/tablet-1024.png),
[768](screenshots/tablet-768.png), [390](screenshots/mobile-390.png).
Fresh runs, region-switch screenshots, traces/reports and PDF remain in ignored
output/playwright/, test-results/ and playwright-report/.

## Remaining limitations and coordination

All actual region packages still declare illustrative data, pending layers, null
target geometry and disabled routing. No new NASA/ESA observation, source audit, DEM
footprint, hazard mask, target coordinate, resource number or completed future rover
activity was invented. No scientific rasters/assets were downloaded or committed.

Regional owners must supply source-backed data and independent registration/terrain
audits. Declared map metadata still needs scientific review before enabling actual
products; generic schema tests cannot establish it. The transport schemas are a
frontend-facing proposal that the FastAPI owner must confirm before implementation.
No backend, route computation, metric scale, full feasibility or offline tile pack is
implemented. Existing already-loaded browser-local offline behavior is preserved.

PR #1 remains the review vehicle; the final commit/push identity is recorded in Git
and the delivery response. No new PR or automatic merge is required.
