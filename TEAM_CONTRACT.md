# Team Integration Contract — v0.2

This is the shared application contract for parallel region development. The existing
mission-console design stays unchanged. First release is **2D pre-mission planning**;
no live EVA, rehearsal, new offline calculations or operational navigation.

## Actual structure and ownership

```text
app/                         Shared Next.js App Router, tokens and styles
components/
  planner.tsx                Shared region/mission state and application shell
  map/                       One MapLibre renderer and controls
  mission/                   Shared editor, comparison, feasibility and brief
  science/                   Shared catalog, layers and evidence details
  ui/                        Shared accessible primitives
regions/
  gale/{config,targets,layers,index}.ts
  jezero/{config,targets,layers,index}.ts
  oxia/{config,targets,layers,index}.ts
lib/
  contracts/                 Canonical runtime schemas and inferred TS types
    primitives.ts            Region IDs, evidence, Mars coordinates, availability
    science.ts               Sources, targets, layers and contextual datasets
    region.ts                Region manifest, config and capability gates
    planning.ts              Proposed shared FastAPI request/response boundary
  regions/registry.ts         Explicit typed registry and lookup helpers
  map/                       Shared source lifecycle and schematic preview
  mission/model.ts           Single persisted mission schema and validation
  api/planning.ts            Unavailable service adapter; no backend implementation
public/maps/                 Small reviewed assets under region-owned subpaths
tests/                       Contract, mission, renderer and browser regressions
team/{gale,jezero,oxia}/      Regional agent handoffs
docs/                        Integration guides, audit and verification evidence
```

`lib/contracts/` is the equivalent of the proposed `types/` folder. Types are inferred
from the runtime schemas; do not create a second schema in `types/`, region folders
or backend stubs. No `src/` migration, duplicate application or empty backend exists.

| Developer | Branch | Owned content |
| --- | --- | --- |
| Project coordinator | `feat/gale-map` | `regions/gale/**`, `public/maps/gale/**`, `team/gale/CONTEXT.md` |
| Aung Khant Min | `feat/jezero-map` | `regions/jezero/**`, `public/maps/jezero/**`, `team/jezero/CONTEXT.md` |
| Thaw Thaw Tun | `feat/oxia-map` | `regions/oxia/**`, `public/maps/oxia/**`, `team/oxia/CONTEXT.md` |
| Shared coordinator/reviewers | `feat/shared-ui-redesign` | Shared components, contracts, registry, renderer, mission/API state, styles and tests |

Regional contributors should ordinarily edit only their own module/assets. Coordinate
changes to `app/**`, `components/**`, `lib/**`, dependencies, contracts, shared tests,
PRD.md and DESIGN.md before editing. A new target/layer in an existing region must not
require changing the registry or shared React code.

## Module and registry contract

Each region exports a named manifest (`gale`, `jezero`, `oxia`) from its `index.ts`:

```ts
export const gale = regionSchema.parse({ ...config, targets, layers });
```

`config.ts` satisfies `RegionConfig`, `targets.ts` satisfies `Target[]`, and `layers.ts`
satisfies `ScientificLayer[]`. Metadata/source references live in config. All record IDs
are stable, unique and prefixed with their region, including source/context records.

The registry provides `listRegions`, `getRegion`, `getTargets`, `getAvailableLayers`,
`getMapConfig`, `getRegionEvidence`, `getRegionCapabilities` plus typed records/IDs for
the existing UI. Unknown IDs return `undefined` or empty lists. Shared code imports
the registry, not region assembly internals. No plugin discovery or dynamic imports
are needed for three known modules.

## Canonical data fields

The original fields are retained: `id`, `name`, `mission_context`, `coordinate_system`,
`view_center`, `data_status`, `layers`, `targets`, `routing`, `source_references`,
`dataset_version`. Additional required metadata is documented below and enforced in
`lib/contracts/region.ts`. `region_manifest.example.json` is an exported Gale manifest
from this same schema, not a parallel format.

- Identity: `region_status` = exploration/planned; `scientific_context` = mission/question.
- Mars reference: `body: "Mars"`, planetocentric latitude, east-positive longitude
  `0 <= longitude_east < 360`; recorded `reference_surface`, `sphere_radius_m`,
  `projected_crs`, `vertical_datum`, with unresolved metadata explicitly null/pending.
- Display configuration: `map.visualization` (status/reason), `initial_zoom`,
  `supported_extent` (west_east/east_east/south_latitude/north_latitude), and
  `display_transform` (unverified/reason or reviewed/method/source_id/notes).
- Source records: id/title/HTTPS url, agency, instrument, product_id, acquisition_date,
  sol, native_resolution_m, processing_notes and limitations. Unknown values are null;
  mission-context links do not establish target or raster provenance.
- Layers retain original availability/source/date/resolution/coverage fields and add
  display_name, kind (optical/topography/geology/thermal/overlay), evidence, attribution,
  rendering, default_visible/default_opacity, and optional-null legend (title, units,
  label/color items). Rendering is unavailable, raster-tiles or GeoJSON line/fill/circle.
- Targets retain original IDs/title/goal/priority/coordinates/source_ids/activity and add
  region_id, description, geological_significance, coordinate_reference, evidence,
  verification and routing_eligibility. Verified coordinates require registered sources,
  verified status and non-scenario evidence. Null coordinates remain non-routable.
- Contextual datasets hold atmospheric/radiation context separately from renderable
  layers: id/name/evidence/availability/source_ids/limitations. No unimplemented numeric
  measurements are implied by a metadata record.

Every evidence label is one of **Observed, Derived, Interpreted, Modeled, Scenario,
Unavailable**. Availability and assessment statuses are separate concepts. Data status
remains illustrative / metadata_verified / raster_audited; do not advance without evidence.

## Rendering and safety gates

MapLibre sources are mounted declaratively by the shared renderer; changing region
removes previous sources/layers/markers and applies the new view. IDs keep layer
preferences isolated. Only available layers with render configuration enter controls.
One thematic overlay is active by default; optical context can remain visible.

A map can be visualized only with available source-backed rendering, a supported
extent, a reviewed display transform, a documented Mars reference surface/radius and
a registered review reference. A schema flag is **not** scientific review: document
alignment, longitude conversion, source registration, nodata, uncertainty and provenance.
GeoJSON/tile products must already use the reviewed display convention. The generic
longitude wrap is display-only; never use Earth geodesy, MapLibre distances or its
default Earth scale for Mars. Unitless preview geometry stays in `lib/map/preview.ts`.

Capabilities distinguish map visualization from unknown/partial/audited terrain coverage,
experimental routing, scientifically reviewed routing and full mission feasibility.
`routing.enabled` is false by default. Enabling validated routing also requires audited
terrain, raster_audited data status, eligibility_dataset_id and policy_version. A DEM
alone proves neither obstacle absence nor safety. Experimental results must retain
their label. The backend adapter currently returns unavailable regardless of metadata.

All six checks (terrain, oxygen, battery, EVA time, radiation, return/recovery) must be
supported before Feasible. Known failure takes precedence over missing evidence;
otherwise missing mandatory evidence means Unverified. No operational certification.

## Shared backend boundary

Existing planned endpoints remain `/v1/regions`, `/v1/regions/{id}`,
`/v1/missions/route-options`, `/v1/missions/assess`, `/v1/missions/brief`.
`lib/contracts/planning.ts` proposes region-independent request, projected candidate,
coverage/blocking, model provenance, resource assessment and error/unavailable schemas.
Requests/results carry an input revision and dataset/model versions. Backend owners
must jointly confirm the transport contract before connecting it. No successful route
or numeric resource result is fabricated here; no FastAPI server is implemented.

## Integration procedure and Git rules

1. Agree a common baseline after review of [PR #1](https://github.com/KaungSet178/Martian-Map/pull/1).
   Existing regional work may need a reviewed adaptation onto the shared module shape.
   Preserve that work; do not copy old shared components over the new application.
2. Inspect status/branch and fetch before work; use the assigned regional branch.
   Do not reset, discard, force-push, merge automatically or push to main.
3. Edit owned config/targets/layers, register exact source evidence and add small
   reviewed assets or HTTPS tile URLs. Large original rasters/caches belong in documented
   external storage. Do not generate coordinates for pending targets.
4. Keep stable target IDs and dataset versions consistent. Scientific changes increment
   dataset_version to trigger saved-plan revalidation. Do not remove IDs used by old
   plans without a coordinated migration; mission storage schema v1 remains compatible.
5. Run lint, typecheck, `npm test`, build and browser checks before a focused PR to main.
   Include region screenshots, exact source/product/coordinate/coverage notes, ownership
   scope, tests executed and unresolved evidence. Request shared review for contract/UI
   changes rather than inventing regional fields or a regional routing engine.

The implementation guide is [docs/REGION_DEVELOPMENT_GUIDE.md](docs/REGION_DEVELOPMENT_GUIDE.md).
Tests are software regressions, not validation of real Mars terrain or routes.
