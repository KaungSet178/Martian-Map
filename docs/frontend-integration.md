# Shared frontend integration

The redesign establishes one Next.js App Router application. All three regions use
the same MapLibre workspace, catalog, mission editor, evidence views and persistence.
The historical HTML prototype remains unchanged as reference material.

## Ownership and data boundary

- `app/` contains layout, locally bundled fonts, exact DESIGN.md tokens and responsive CSS.
- `components/map/` owns the stable MapLibre instance, viewport resizing, preview linework, markers and controls.
- `components/science/` contains catalog/details, layer controls and source-aware evidence views.
- `components/mission/` contains the ordered editor, route-readiness/feasibility views and printable/downloadable brief.
- `components/ui/` contains the accessible native dialog, badges, notices and download helper.
- `lib/contracts/region.ts` provides runtime-validated shared manifest types using the existing team field names/enums.
- `regions/{gale,jezero,oxia}/` independently own config, targets, layers and validated manifest exports. Current content remains clearly labeled scenarios with null target coordinates and no target-specific source IDs. `lib/regions/registry.ts` is the shared lookup API; the centralized fixture module was removed.
- `lib/mission/` validates versioned saved plans, stop ordering, imports and route prerequisites.
- `lib/api/planning.ts` is an explicit unavailable-service boundary. No request is sent to a nonexistent backend and no path/resource result is synthesized.

No files on `feat/gale-map`, `feat/jezero-map` or `feat/oxia-map` were changed or merged.
Regional owners can supply verified manifests separately. This PR does not approve
any regional scientific content. The updated TEAM_CONTRACT.md and regional handoffs
now describe the actual module interface and file ownership.

## Manifest conventions

The TypeScript schema follows TEAM_CONTRACT.md and the example manifest: stable
region/layer/target IDs, availability enums, data status, dataset version, source
references and explicit routing eligibility. Source records preserve id/title/url
plus agency, instrument, product, acquisition/sol, native resolution, processing and
limitations. The canonical schemas also separate display registration, terrain
coverage, experimental routing, validated routing and full feasibility. See
[the region guide](REGION_DEVELOPMENT_GUIDE.md) for exact field names and examples.

Coordinates use `{ latitude, longitude_east }`, planetocentric latitude and
east-positive longitude in 0–360°. The renderer **does not place provisional region
centers or source-unverified objectives on a scientific map**. Targets may be draft
objectives without being eligible waypoints. A verified target must have coordinates
and source IDs, but a schema check alone is not scientific validation.

Before loading actual raster/target sources into MapLibre, jointly review the Mars
projection, sphere/ellipsoid, source-coordinate transforms, bounds and valid-data
footprints. MapLibre defaults and its Earth scale must not become Mars measurements.
No scale bar or distance is displayed in the current scaffold.

## Scientific service handoff

The next integration should replace the unavailable adapter with runtime-validated,
versioned FastAPI responses matching the team's agreed endpoints. Before enabling
calculations, agree route geometry, units, Mars CRS, dataset/model versions,
eligibility, omitted targets, identical alternatives, result revision and six-part
assessment evidence. Do not infer these details from the illustrative prototype.

Every input edit must invalidate any future computed result. Prefer a result keyed
by the complete mission input revision plus dataset/model versions. Render actual
backend alternatives only, preserving unavailable and identical outcomes. The current
client has no computed result to accidentally reuse, and all three objectives are
shown with their missing prerequisites rather than fabricated route lines.

Overall assessment precedence is implemented and tested: a confirmed mandatory failure
means Infeasible; otherwise any missing check/evidence means Unverified; otherwise
documented caution means Caution; only six supported passing checks can mean Feasible.
That outcome would still be modeled screening, not operational certification.

## Persistence and offline behavior

`marswalk.missions.v1` stores at most 100 named browser-local plans. A plan includes
schema version, stable ordered target IDs, region, start/end placeholders, recovery
assumptions, independent reserve preferences, dataset/model versions and saved time.
Unrecognized schemas, invalid ranges, duplicate/foreign/unknown objective IDs and
files above 1 MB are rejected. Corrupt storage is not cleared or silently overwritten.
Local JSON export remains an alternative when browser storage is blocked/full.

On reload, the latest saved plan for the URL's region opens. Opening another saved
mission retains the previous draft in session memory. Unsaved edits warn on leaving.
Browser-local plans remain usable in an already loaded workspace during connection
loss. This release does **not** promise cold-start offline installation, persistent
tile packs, offline route calculation or a service-worker cache. No scientific map
assets are integrated to cache yet.

## Source and generated files

The lockfile records the tested dependency graph. `public/generated/` contains the
pinned MapLibre ESM worker copied at dev/build time; it is ignored. Local font assets
come from Fontsource packages. `next-env.d.ts`, build output, browser binaries,
traces and raw screenshots are ignored. Next.js generated `AGENTS.md` is intentionally
tracked as the version-aware entry point for future contributors; it directs agents
to the installed framework documentation. Curated screenshots under `docs/screenshots/`
are intentional review evidence, not runtime assets.

The scoped minimatch override upgrades only typescript-eslint's nested matcher to
11.0.8 to resolve the development-only glob amplification advisory. Lint and type
checks verify the resulting toolchain. No production dependency advisory was reported.
