# Adding regional data to the shared Marswalk application

Use your region's four files: config.ts (identity/view/sources/capabilities), targets.ts
(catalog), layers.ts (declarative rendering), index.ts (runtime-validated manifest).
The canonical schema is `lib/contracts/region.ts`, which composes primitives.ts and
science.ts. Do not edit another region or shared components to add your own data.

## Start safely

Read TEAM_CONTRACT.md and your team context. Agree the reviewed common baseline,
inspect branch/status, fetch, and work on feat/gale-map, feat/jezero-map or feat/oxia-map.
This restructure does not merge or overwrite existing regional branch work. If your
older branch already has scientific files, adapt them to these modules in a reviewed
change; preserve their source evidence. Never force-push or auto-merge main.

## Example: add an unavailable thermal layer

In `regions/gale/layers.ts`, append this object to the existing `layers` array. For
another region, use its own prefix. No shared UI or registry changes are needed:

```ts
{
  id: "gale-thermal-context",
  type: "Thermal context",
  display_name: "Thermal context",
  kind: "thermal",
  availability: "pending",
  source_id: null,
  observation_date: null,
  spatial_resolution_m: null,
  coverage: null,
  limitations: "No applicable product has been integrated or audited.",
  evidence: "Unavailable",
  attribution: null,
  rendering: { kind: "unavailable", reason: "Awaiting source product and coverage review." },
  default_visible: false,
  default_opacity: 70,
  legend: null,
}
```

The unavailable layer appears in the data register, not as a working map toggle.
It does not enable routing, supply measurements or imply a THEMIS product was acquired.

## Turn a reviewed product into a renderable layer

1. Register a source in config.source_references: exact HTTPS source/product URL,
   agency/instrument, product identifier, acquisition date/sol, effective native
   resolution, processing and limitations. Keep unknown values null. Source IDs use
   the region prefix and must resolve locally.
2. Review original latitude/longitude conventions, Mars reference body/surface/radius,
   projection, vertical datum, actual valid footprint, nodata and resolution. Preserve
   stereo-vs-model-derived lineage. Context resolution is not hazard-detection accuracy.
3. Prepare correctly registered map-display assets outside the frontend. For raster
   tiles set `rendering: { kind: "raster-tiles", tiles: [reviewedTileTemplate],
   tile_size: 256, min_zoom: actualMinZoom, max_zoom: actualMaxZoom }`. Those variables
   stand for your audited product values, not suggested scientific measurements.
   URLs must be HTTPS or same-origin absolute paths. Remote servers need CORS.
4. For a reviewed GeoJSON overlay use `rendering: { kind: "geojson", url: reviewedPath,
   geometry: "line", color: "#D6DEE8" }` (or fill/circle as appropriate). The asset must
   already use the documented MapLibre display-coordinate convention. Do not feed raw
   0–360 longitude GeoJSON without review/conversion. Historical rover tracks use
   documented geometry, never traced schematic routes.
5. Set the layer to available only with source_id, attribution, coverage, limitations
   and evidence. Supply a legend with the actual quantity/units or categories. Set
   defaults deliberately; use one non-optical thematic overlay at a time.
6. In config.map supply supported_extent, reviewed display_transform (with method
   `mars-geographic-to-maplibre-display`, a registered review source_id and notes),
   initial_zoom and visualization availability. Record reference_surface/radius in
   coordinate_system. Set a reviewed regional center; its status must describe its
   provenance. This is display registration, not a route/safety review.
7. Increment dataset_version for substantive scientific changes. Test the region.
   The shared renderer mounts/removes its layers, applies opacity/legend and changes
   view without custom React. MapLibre's Earth distance/scale remains forbidden.

Only commit small reviewed map assets under `public/maps/<region>/`. Keep original
GeoTIFFs, DEMs, downloads and generated tile pyramids in documented object storage.
Use source URLs/config paths rather than adding large files to Git.

## Add a science target without inventing a location

Keep a concept's existing stable ID when refining its documentation. In targets.ts,
populate title/description/scientific_goal/geological_significance/activity from
documented science. Link source_ids to config.source_references. Include region_id,
evidence and the declared Mars coordinate_reference. For pending geometry use
coordinates:null, coordinate_verified:false, verification:pending (or scenario for
demonstrations), and routing_eligibility:unavailable with its reason.

For a target whose location was actually checked, these fields must come from your
source audit, not an example coordinate:

```ts
const reviewedLocation: MarsGeographicCoordinates = sourceAudit.canonicalLocation;
// sourceAudit is your documented scientific input, not a frontend-derived value.
const revisedTarget = {
  ...existingTarget,
  coordinates: reviewedLocation,
  coordinate_verified: true,
  verification: "verified" as const,
  evidence: "Interpreted" as const, // choose the actual source's evidence category
  source_ids: [registeredTargetSourceId],
  routing_eligibility: {
    status: "unavailable" as const,
    reason: "Target location checked; regional terrain and routing policy are still unaudited.",
  },
};
```

This is a field-update pattern, not a fabricated sourceAudit implementation. Include
the canonical coordinate-reference fields and genuine sources in the region module.
Verified location does not make a target routable. Only verified targets appear in
scientific map mode; schematic markers are restricted to Scenario targets in explicit
preview mode. Published polygons must not become made-up precise sample coordinates.
Keep previously saved IDs, or coordinate a migration before removing them.

## Check your changes in one shared frontend

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run dev
```

Open `http://127.0.0.1:3000/?region=gale` (or jezero/oxia). On restricted Windows
PowerShell use npm.cmd/npx.cmd. Check source details, unavailable layers, catalog/map
inspection, stop editing, save/open/JSON/brief, and switching away/back. Inspect
1440/1024/768/390px layouts and keyboard dialogs. The existing browser suite covers all
regions and the mission regressions; add tests for your actual integration, and label
synthetic tests as software tests. No test alone proves real Mars suitability.

## PR checklist

- Owned region paths only, or explicitly coordinated shared changes.
- Exact source URLs/product IDs, attribution/licenses and acquisition context.
- Coordinate transformations, effective resolution/coverage, unknowns and limitations.
- Dataset version updated when science changes; old plan IDs preserved/migrated.
- No unsupported routing/feasibility flags, fictitious measurements or future rover history.
- Focused commit/PR targeting main, with screenshots and tests actually executed.
- Review/adapt the common baseline first; never overwrite teammates' regional work.

The proposed shared FastAPI boundary is `lib/contracts/planning.ts`; it is not an
implemented or backend-approved API. Coordinate versions, CRS, models and input-revision
invalidation with the shared backend owner before connecting it. No regional algorithm forks.
