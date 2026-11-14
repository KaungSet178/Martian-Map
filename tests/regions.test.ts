import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import type { Map as MapInstance } from "maplibre-gl";
import {
  listRegions,
  getRegion,
  getTargets,
  getAvailableLayers,
  getMapConfig,
  getRegionEvidence,
  getRegionCapabilities,
} from "@/lib/regions/registry";
import {
  regionSchema,
  type RegionManifest,
  targetSchema,
} from "@/lib/contracts/region";
import {
  routeRequestSchema,
  routeResponseSchema,
} from "@/lib/contracts/planning";
import {
  applyLayerStates,
  displayBounds,
  mountRegionLayers,
  toDisplayCoordinates,
  updateLayerState,
  fillColor,
} from "@/lib/map/region-layers";
import { fitOverview } from "@/lib/map/camera";
import { photographSchema } from "@/lib/contracts/science";

test("DEM derivatives retain audited bytes, bounded support, units and conservative readiness", () => {
  const gale = getRegion("gale")!;
  const report = JSON.parse(readFileSync("team/gale/sources/g3-2/processing-audit.json", "utf8"));
  const audit = JSON.parse(readFileSync("team/gale/G3_2_DEM_AUDIT.json", "utf8"));
  for (const [path, record] of Object.entries(report.tiles) as [string, { sha256: string; bytes: number }][]) {
    const bytes = readFileSync(path);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), record.sha256);
    assert.equal(bytes.length, record.bytes);
  }
  assert.equal(Object.keys(report.tiles).length, 39);
  assert.ok(report.tile_bytes < 40_000);
  assert.equal(report.native_valid_pixels, report.native_total_pixels);
  assert.equal(report.valid_analysis_cells, 1600);
  assert.equal(report.analysis_grid_m, 25);
  assert.equal(report.gradient_support_m, 75);
  assert.match(report.vertical_reference, /MOLA areoid/);
  assert.match(audit.decision, /NOT verified/);
  assert.deepEqual(gale.layers.find((l) => l.id === "gale-terrain")!.legend!.items.map((i) => i.color), report.elevation_colors);
  assert.deepEqual(gale.layers.find((l) => l.id === "gale-slope")!.legend!.items.map((i) => i.color), report.slope_colors);
  assert.match(gale.layers.find((l) => l.id === "gale-terrain")!.legend!.units!, /MOLA areoid/);
  assert.match(gale.layers.find((l) => l.id === "gale-slope")!.legend!.units!, /degrees.*not safety/);
  for (const [path, hash] of [["pds-dem.xml", audit.selected.label_sha256], ["pds-dem-headers.bin", audit.selected.headers_sha256]])
    assert.equal(createHash("sha256").update(readFileSync(`team/gale/sources/g3-2/${path}`)).digest("hex"), hash);
  const coverageBytes = readFileSync("public/maps/gale/dem/coverage.geojson");
  assert.equal(createHash("sha256").update(coverageBytes).digest("hex"), report.coverage_sha256);
  const coverage = JSON.parse(coverageBytes.toString());
  const [west, south, east, north] = report.extent_wsen;
  assert.deepEqual(coverage.features[0].geometry.coordinates[0], [[west,south],[east,south],[east,north],[west,north],[west,south]]);
  for (const layer of gale.layers.filter((item) => item.kind === "topography" && item.source_id === "gale-pds-dem-subset")) {
    assert.equal(layer.availability, "available");
    assert.equal(layer.evidence, "Derived");
    assert.equal(layer.default_visible, false);
    assert.equal(layer.default_opacity, 100);
    assert.equal(layer.source_id, "gale-pds-dem-subset");
    assert.match(layer.coverage!, /CTX alignment is unverified/);
    assert.match(layer.limitations, /not astronaut safety/);
    assert.equal(layer.rendering.kind, "raster-tiles");
    if (layer.rendering.kind === "raster-tiles") {
      assert.deepEqual(layer.rendering.bounds, {west_east:west,south_latitude:south,east_east:east,north_latitude:north});
      assert.equal(layer.rendering.focus_extent, undefined);
      assert.equal(layer.rendering.resampling, "nearest");
      assert.ok(regionSchema.safeParse({...gale, layers:[{...layer, rendering:{...layer.rendering, bounds:undefined,focus_extent:undefined,resampling:undefined}}]}).success);
      assert.equal(regionSchema.safeParse({...gale, layers:[{...layer,rendering:{...layer.rendering,resampling:"cubic"}}]}).success,false);
    }
  }
  assert.equal(gale.routing.enabled, false);
  assert.equal(gale.capabilities.terrain_coverage.status, "partial");
  for (const id of ["gale-terrain", "gale-hillshade", "gale-slope", "gale-geology"]) {
    const state = updateLayerState(gale, updateLayerState(gale, {}, "gale-slope", {visible:true}), id, {visible:true});
    assert.equal(gale.layers.filter((l) => l.kind === "topography" && (state[l.id]?.visible ?? l.default_visible)).length,1);
    if (id === "gale-geology") assert.equal(state[id].visible, true);
  }
  for (const id of ["jezero", "oxia"]) assert.ok(getRegion(id)!.layers.every((l) => !l.source_id?.startsWith("gale-")));
});

test("per-product raster request bounds and nearest resampling preserve legacy defaults", () => {
  const sources: Record<string, {bounds?: number[]}> = {}, paint: Record<string, unknown> = {};
  const fake = {
    addSource: (id: string, source: {bounds?: number[]}) => {sources[id]=source;},
    addLayer: (layer: {id:string;paint?:unknown}) => {paint[layer.id]=layer.paint;},
  } as unknown as MapInstance;
  const gale=getRegion("gale")!;
  mountRegionLayers(fake,gale);
  const [w,s,e,n]=JSON.parse(readFileSync("team/gale/sources/g3-2/processing-audit.json","utf8")).extent_wsen;
  assert.deepEqual(sources["region-gale-terrain"].bounds,[w,s,e,n]);
  assert.notDeepEqual(sources["region-gale-optical"].bounds,[w,s,e,n]);
  assert.deepEqual(paint["region-gale-terrain"],{"raster-resampling":"nearest"});
  assert.deepEqual(paint["region-gale-optical"],{"raster-resampling":"linear"});
});

test("G4 regional and global terrain layers preserve multi-resolution hierarchy, audited tiles, and scientific bounds", () => {
  const gale = getRegion("gale")!;
  const audit = JSON.parse(readFileSync("team/gale/G4_TERRAIN_AUDIT.json", "utf8"));
  assert.equal(audit.milestone, "G4");
  assert.equal(audit.coverage_evaluation.combined_real_data_coverage_pct, 100);
  assert.equal(audit.coverage_evaluation.added_gap_filling, false);
  assert.match(audit.coverage_evaluation.display_resampling, /nearest-neighbor/);

  // Check regional HRSC 30 m layers
  const regionalIds = ["gale-regional-elevation", "gale-regional-hillshade", "gale-regional-slope"];
  for (const id of regionalIds) {
    const layer = gale.layers.find((l) => l.id === id);
    assert.ok(layer, `Missing regional layer ${id}`);
    assert.equal(layer!.availability, "available");
    assert.equal(layer!.kind, "topography");
    assert.equal(layer!.source_id, "gale-hrsc-30m");
    assert.equal(layer!.spatial_resolution_m, 30);
    assert.equal(layer!.default_visible, false);
    assert.match(layer!.coverage!, /100% of the Gale overview/);
    assert.match(layer!.limitations, /not for hazard routing/);
    assert.equal(layer!.rendering.kind, "raster-tiles");
    if (layer!.rendering.kind === "raster-tiles") {
      assert.equal(layer!.rendering.resampling, "nearest");
      assert.equal(layer!.rendering.min_zoom, 5);
      assert.equal(layer!.rendering.max_zoom, 13);
      assert.ok(layer!.rendering.bounds);
      assert.equal(layer!.rendering.focus_extent, undefined);
    }
  }

  // Check global HRSC-MOLA 200 m fallback layers
  const globalIds = ["gale-global-elevation", "gale-global-hillshade", "gale-global-slope"];
  for (const id of globalIds) {
    const layer = gale.layers.find((l) => l.id === id);
    assert.ok(layer, `Missing global layer ${id}`);
    assert.equal(layer!.availability, "available");
    assert.equal(layer!.kind, "topography");
    assert.equal(layer!.source_id, "gale-usgs-200m");
    assert.equal(layer!.spatial_resolution_m, 200);
    assert.equal(layer!.default_visible, false);
    assert.match(layer!.coverage!, /All 41,772 derived cells valid/);
    assert.match(layer!.limitations, /hazards are completely unresolved/);
    assert.equal(layer!.rendering.kind, "raster-tiles");
    if (layer!.rendering.kind === "raster-tiles") {
      assert.equal(layer!.rendering.resampling, "nearest");
      assert.equal(layer!.rendering.min_zoom, 5);
      assert.equal(layer!.rendering.max_zoom, 13);
      assert.ok(layer!.rendering.bounds);
      assert.equal(layer!.rendering.focus_extent, undefined);
    }
  }

  // Verify coverage GeoJSON files and hashes
  const regionalCoverageBytes = readFileSync("public/maps/gale/terrain-regional/coverage.geojson");
  assert.equal(createHash("sha256").update(regionalCoverageBytes).digest("hex"), audit.regional_hrsc_30m.coverage_sha256);
  const globalCoverageBytes = readFileSync("public/maps/gale/terrain-global/coverage.geojson");
  assert.equal(createHash("sha256").update(globalCoverageBytes).digest("hex"), audit.global_usgs_200m.coverage_sha256);

  // Spot-check tile files on disk match audit records
  const sampleRegionalTiles = Object.entries(audit.regional_hrsc_30m.tiles).slice(0, 10) as [string, { sha256: string; bytes: number }][];
  for (const [path, record] of sampleRegionalTiles) {
    const bytes = readFileSync(path);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), record.sha256);
    assert.equal(bytes.length, record.bytes);
  }

  // One thematic terrain view; independent geology must remain available.
  for (const id of [...regionalIds, ...globalIds, "gale-terrain", "gale-geology"]) {
    const state = updateLayerState(gale, updateLayerState(gale, {}, "gale-regional-slope", { visible: true }), id, { visible: true });
    assert.equal(gale.layers.filter((l) => l.kind === "topography" && (state[l.id]?.visible ?? l.default_visible)).length, 1);
    if (id === "gale-geology") assert.equal(state[id].visible, true);
  }
});

test("Arc Pass asset preserves all source classifications and audited geometry identity", () => {
  const gale = getRegion("gale")!;
  const layer = gale.layers.find((item) => item.id === "gale-geology")!;
  const report = JSON.parse(readFileSync("team/gale/sources/g3/arc-pass-processing.json", "utf8"));
  const bytes = readFileSync(report.output);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), report.output_sha256);
  const geojson = JSON.parse(bytes.toString());
  assert.equal(geojson.features.length, 53);
  assert.equal(new Set(geojson.features.map((feature: { id: number }) => feature.id)).size, 53);
  const counts: Record<string, number> = {};
  for (const feature of geojson.features) {
    const code = feature.properties.Unit;
    counts[code] = (counts[code] ?? 0) + 1;
    assert.equal(feature.id, feature.properties.source_objectid);
    assert.equal(feature.geometry.type, "MultiPolygon");
    for (const polygon of feature.geometry.coordinates)
      for (const ring of polygon) {
        assert.deepEqual(ring[0], ring.at(-1));
        for (const coordinate of ring) {
          assert.equal(coordinate.length, 2);
          assert.ok(coordinate[0] > 137.4065 && coordinate[0] < 137.4111);
          assert.ok(coordinate[1] > -4.7891 && coordinate[1] < -4.7853);
        }
      }
  }
  assert.deepEqual(counts, report.unit_counts);
  assert.deepEqual(new Set(Object.keys(counts)), new Set(layer.legend!.items.map((item) => item.value)));
  const expression = fillColor(layer) as unknown[];
  assert.deepEqual(expression.slice(0, 2), ["match", ["get", "Unit"]]);
  for (const item of layer.legend!.items) assert.equal(expression[expression.indexOf(item.value)+1], item.color);
  assert.ok(gale.targets.every((target) => !target.coordinate_verified && target.coordinates === null));
});

test("categorical layer contracts reject missing or duplicate legend values and preserve legacy manifests", () => {
  const gale = getRegion("gale")!;
  const layer = gale.layers.find((item) => item.id === "gale-geology")!;
  for (const legend of [null, { ...layer.legend, items: [] },
    { ...layer.legend, items: [layer.legend!.items[0], layer.legend!.items[0]] }]) {
    assert.equal(regionSchema.safeParse({ ...gale, layers: [{ ...layer, legend }] }).success, false);
  }
  for (const region of listRegions()) {
    const legacy = { ...region, layers: region.layers.map((item) => {
      if (item.rendering.kind !== "geojson") return item;
      const { category_property, focus_extent, max_zoom, ...rendering } = item.rendering;
      void category_property; void focus_extent; void max_zoom;
      return { ...item, rendering };
    }) };
    assert.ok(regionSchema.safeParse(legacy).success);
  }
  const state = updateLayerState(gale, {}, "gale-geology", { visible: true });
  assert.equal(state["gale-geology"].visible, true);
  assert.notEqual(state["gale-traverse-recorded"]?.visible, false);
  assert.notEqual(state["gale-optical"]?.visible, false);
});

test("optional photo evidence preserves legacy manifests and cannot promote an area to a point", () => {
  const gale = getRegion("gale")!;
  const area = gale.targets.find((target) => target.id === "gale-glen-torridon")!;
  for (const region of listRegions()) {
    const legacy = {
      ...region,
      targets: region.targets.map(({ feature_kind, location_notes, boundary, photographs, ...target }) => {
        void feature_kind; void location_notes; void boundary; void photographs;
        return target;
      }),
    };
    assert.ok(regionSchema.safeParse(legacy).success);
  }
  assert.equal(targetSchema.safeParse({
    ...area, coordinates: { latitude: -4.85, longitude_east: 137.44 },
    coordinate_verified: true, verification: "verified",
  }).success, false);
  assert.equal(targetSchema.safeParse({ ...area, coordinate_verified: true }).success, false);
  for (const target of gale.targets.filter((target) => target.photographs?.length)) {
    assert.equal(target.feature_kind, "geological_area");
    assert.equal(target.coordinates, null);
    assert.equal(target.coordinate_verified, false);
    assert.equal(target.routing_eligibility.status, "unavailable");
    assert.equal(target.boundary?.status, "unavailable");
  }
});

test("photographs require acquisition metadata, local source lineage and consistent product identity", () => {
  const gale = getRegion("gale")!;
  const target = gale.targets.find((target) => target.photographs?.length)!;
  const photo = target.photographs![0];
  for (const invalid of [
    { ...photo, acquisition_date: null, sol: null },
    { ...photo, acquisition_date: "2019-02-31" },
    { ...photo, attribution: "" },
    { ...photo, association: "" },
    { ...photo, limitations: [] },
    { ...photo, image_url: "javascript:alert(1)" },
  ]) assert.equal(photographSchema.safeParse(invalid).success, false);
  for (const replacement of [
    { ...photo, source_id: "jezero-source" },
    { ...photo, id: "oxia-photo" },
    { ...photo, source_url: "https://science.nasa.gov/unrelated/" },
    { ...photo, product_id: "UNRELATED" },
  ]) assert.equal(regionSchema.safeParse({
    ...gale,
    targets: [{ ...target, photographs: [replacement] }],
  }).success, false);
  assert.equal(regionSchema.safeParse({
    ...gale, targets: [{ ...target, photographs: [photo, photo] }],
  }).success, false);
});

test("committed NASA browse assets match the reviewed evidence register without local image alteration", () => {
  const register = JSON.parse(readFileSync("team/gale/G2_EVIDENCE_REGISTER.json", "utf8"));
  const photos = getRegion("gale")!.targets.flatMap((target) => target.photographs ?? []);
  for (const photo of photos) {
    const audited = Object.values(register.photographs).find((entry) =>
      (entry as { product_id: string }).product_id === photo.product_id,
    ) as { asset_audit: { sha256: string; bytes: number; width: number; height: number } };
    assert.ok(audited, `${photo.product_id} needs an audit record`);
    const bytes = readFileSync(`public${photo.image_url}`);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), audited.asset_audit.sha256);
    assert.equal(bytes.length, audited.asset_audit.bytes);
    assert.equal(photo.width, audited.asset_audit.width);
    assert.equal(photo.height, audited.asset_audit.height);
  }
  for (const id of ["jezero", "oxia"]) {
    assert.ok(getRegion(id)!.targets.every((target) => !target.photographs?.length));
  }
});

test("registry resolves every region, typed metadata and safe unknown IDs", () => {
  assert.deepEqual(
    listRegions()
      .map((r) => r.id)
      .sort(),
    ["gale", "jezero", "oxia"],
  );
  for (const region of listRegions()) {
    assert.equal(getRegion(region.id), region);
    assert.ok(regionSchema.safeParse(region).success);
    assert.equal(getTargets(region.id), region.targets);
    assert.deepEqual(getAvailableLayers(region.id), region.layers.filter((l) => l.availability === "available"));
    assert.equal(getMapConfig(region.id), region.map);
    assert.equal(getRegionEvidence(region.id), region.source_references);
    assert.equal(getRegionCapabilities(region.id), region.capabilities);
  }
  for (const id of ["", "earth", "__proto__", null, {}, 5]) {
    assert.equal(getRegion(id), undefined);
    assert.deepEqual(getTargets(id), []);
    assert.deepEqual(getAvailableLayers(id), []);
    assert.equal(getMapConfig(id), undefined);
  }
});
test("region modules own their content without importing other regions or UI", () => {
  for (const region of listRegions()) {
    for (const file of ["config", "targets", "layers", "index"]) {
      const text = readFileSync(`regions/${region.id}/${file}.ts`, "utf8");
      assert.doesNotMatch(text, /from ["']@\/(components|regions)\//);
    }
  }
  const planner = readFileSync("components/planner.tsx", "utf8");
  assert.doesNotMatch(planner, /fixtures\/regions|regionPresentation/);
});
test("validation rejects foreign records, duplicate IDs and missing scientific lineage", () => {
  const base = getRegion("oxia")!;
  assert.equal(
    regionSchema.safeParse({
      ...base,
      targets: [{ ...base.targets[0], region_id: "jezero" }],
    }).success,
    false,
  );
  assert.equal(
    regionSchema.safeParse({
      ...base,
      targets: [base.targets[0], base.targets[0]],
    }).success,
    false,
  );
  assert.equal(
    regionSchema.safeParse({
      ...base,
      targets: [{ ...base.targets[0], source_ids: ["unknown"] }],
    }).success,
    false,
  );
  assert.equal(
    targetSchema.safeParse({ ...base.targets[0], coordinate_verified: true })
      .success,
    false,
  );
  assert.equal(
    regionSchema.safeParse({
      ...base,
      routing: { ...base.routing, enabled: true },
    }).success,
    false,
  );
  assert.equal(
    regionSchema.safeParse({
      ...base,
      map: {
        ...base.map,
        visualization: { status: "available", reason: "unsupported assertion" },
      },
    }).success,
    false,
  );
  assert.equal(
    regionSchema.safeParse({
      ...base,
      layers: [{ ...base.layers[0], availability: "available" }],
    }).success,
    false,
  );
});

// Synthetic renderer tests: arbitrary test-only metadata is never loaded by the app
// and is not a Mars observation, source audit or scientifically validated route.
function syntheticMap(): RegionManifest {
  const base = getRegion("jezero")!;
  return regionSchema.parse({
    ...base,
    coordinate_system: {
      ...base.coordinate_system,
      reference_surface: "synthetic test surface",
      sphere_radius_m: 1,
    },
    map: {
      ...base.map,
      visualization: {
        status: "available",
        reason: "synthetic renderer test only",
      },
      supported_extent: {
        west_east: 0,
        east_east: 2,
        south_latitude: -1,
        north_latitude: 1,
      },
      display_transform: {
        status: "reviewed",
        method: "mars-geographic-to-maplibre-display",
        source_id: base.source_references[0].id,
        notes: "Synthetic software fixture, not a scientific review.",
      },
    },
    layers: base.layers.map((l, i) => ({
      ...l,
      availability: "available",
      evidence: "Scenario",
      source_id: base.source_references[0].id,
      coverage: "Synthetic test extent",
      attribution: "Software test fixture",
      default_visible: i === 0,
      rendering: {
        kind: "geojson",
        url: `/maps/jezero/test-${i}.geojson`,
        geometry: "line",
        color: "#59E3FA",
      },
    })),
  });
}
test("declarative renderer mounts only current regional sources and cleans them on switch", () => {
  const layers = new Set<string>(),
    sources = new Set<string>();
  const calls: unknown[][] = [];
  const fake = {
    addSource: (id: string, source: unknown) => {
      sources.add(id);
      calls.push(["source", id, source]);
    },
    addLayer: (layer: { id: string }) => layers.add(layer.id),
    getLayer: (id: string) => layers.has(id),
    getSource: (id: string) => sources.has(id),
    removeLayer: (id: string) => layers.delete(id),
    removeSource: (id: string) => sources.delete(id),
    setLayoutProperty: (...args: unknown[]) => calls.push(["layout", ...args]),
    setPaintProperty: (...args: unknown[]) => calls.push(["paint", ...args]),
  };
  const map = fake as unknown as MapInstance;
  const region = syntheticMap();
  const cleanup = mountRegionLayers(map, region);
  assert.equal(layers.size, 3);
  let state = updateLayerState(region, {}, region.layers[1].id, {
    visible: true,
    opacity: 35,
  });
  state = updateLayerState(region, state, region.layers[2].id, {
    visible: true,
  });
  assert.equal(state[region.layers[1].id].visible, false);
  applyLayerStates(map, region, state, false);
  assert.ok(
    calls.some(
      (c) =>
        c[0] === "layout" &&
        c[1] === "region-jezero-geology" &&
        c[3] === "visible",
    ),
  );
  applyLayerStates(map, region, state, true);
  assert.deepEqual(calls.at(-2), [
    "layout",
    "region-jezero-geology",
    "visibility",
    "none",
  ]);
  cleanup();
  assert.equal(layers.size, 0);
  assert.equal(sources.size, 0);
  mountRegionLayers(map, getRegion("oxia")!);
  assert.equal(sources.size, 0);
});
test("Mars east-longitude display conversion and extents never infer Earth distances", () => {
  assert.deepEqual(
    toDisplayCoordinates({ latitude: 18, longitude_east: 335 }),
    [-25, 18],
  );
  assert.deepEqual(
    displayBounds({
      west_east: 359,
      east_east: 1,
      south_latitude: -1,
      north_latitude: 1,
    }),
    [
      [-1, -1],
      [1, 1],
    ],
  );
});

test("overview fits the reviewed extent without constraining navigation or accumulating padding", () => {
  const calls: unknown[][] = [];
  const fake = {
    stop: () => {},
    setMaxBounds: (value: unknown) => calls.push(["bounds", value]),
    setPadding: (value: unknown) => calls.push(["padding", value]),
    getMaxZoom: () => 13,
    fitBounds: (...args: unknown[]) => calls.push(["fit", ...args]),
    jumpTo: (value: unknown) => calls.push(["fallback", value]),
  } as unknown as MapInstance;
  const container = {
    getBoundingClientRect: () => ({ width: 800, height: 600, top: 80, right: 1160, bottom: 680 }),
    parentElement: {
      querySelector: (selector: string) => ({
        getBoundingClientRect: () => selector === ".map-location" ? { bottom: 210 }
          : selector === ".map-navigation" ? { left: 1092 }
          : { top: 600 },
      }),
    },
  } as unknown as HTMLElement;
  const gale = getRegion("gale")!;
  fitOverview(fake, gale, container, false);
  fitOverview(fake, gale, container, false);
  const fits = calls.filter((c) => c[0] === "fit");
  assert.equal(fits.length, 2);
  assert.deepEqual(fits[0], fits[1]);
  assert.deepEqual(fits[0][1], displayBounds(gale.map.supported_extent!));
  assert.deepEqual(fits[0][2], {
    padding: { top: 146, bottom: 96, left: 32, right: 84 },
    maxZoom: 13, bearing: 0, pitch: 0, duration: 0, linear: true, absolutePadding: true,
  });
  assert.ok(calls.filter((c) => c[0] === "bounds").every((c) => c[1] === null));
  // Optional extent fallback uses existing metadata, never invented bounds.
  fitOverview(fake, { ...gale, map: { ...gale.map, supported_extent: null } }, container, false);
  assert.equal(calls.at(-1)?.[0], "fallback");
});

test("regional raster bounds limit sparse tile requests without changing Mars registration", () => {
  const sources: Array<{ bounds?: number[] }> = [];
  const map = {
    addSource: (_id: string, source: { bounds?: number[] }) => sources.push(source),
    addLayer: () => {},
  } as unknown as MapInstance;
  const gale = getRegion("gale")!;
  mountRegionLayers(map, gale);
  const b = gale.map.supported_extent!;
  assert.deepEqual(sources[0].bounds, [b.west_east, b.south_latitude, b.east_east, b.north_latitude]);
});
test("backend boundary rejects missing one-way endpoints and incomplete assessments", () => {
  const request = {
    schema_version: 1,
    region: "gale",
    mission_id: "synthetic-request",
    input_revision: "1",
    dataset_version: "synthetic-software-test",
    model_versions: {},
    start: { latitude: 0, longitude_east: 0 },
    endpoint: null,
    direction: "round",
    ordered_target_ids: ["gale-test-objective"],
    objectives: ["safest"],
    recovery_assumption: "",
    reserves: { oxygen_percent: 25, battery_percent: 25 },
  };
  assert.equal(routeRequestSchema.safeParse(request).success, true);
  assert.equal(
    routeRequestSchema.safeParse({ ...request, direction: "one" }).success,
    false,
  );
  assert.equal(routeRequestSchema.safeParse({ region: "gale" }).success, false);
  assert.equal(
    routeResponseSchema.safeParse({
      status: "unavailable",
      region: "gale",
      input_revision: "1",
      blocking: [
        { code: "service", reason: "No backend connected", target_ids: [] },
      ],
    }).success,
    true,
  );
  assert.equal(
    routeResponseSchema.safeParse({
      status: "candidates",
      region: "gale",
      candidates: [{ assessments: { Terrain: { status: "Feasible" } } }],
    }).success,
    false,
  );
});
