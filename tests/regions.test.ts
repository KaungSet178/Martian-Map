import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  assessments,
  type RegionManifest,
  targetSchema,
} from "@/lib/contracts/region";
import {
  routeRequestSchema,
  routeResponseSchema,
} from "@/lib/contracts/planning";
import {
  displayRoutesFromResult,
  routeFeatureCollection,
} from "@/lib/map/routes";
import {
  applyLayerStates,
  displayBounds,
  mountRegionLayers,
  toDisplayCoordinates,
  updateLayerState,
} from "@/lib/map/region-layers";

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
    assert.deepEqual(
      getAvailableLayers(region.id),
      region.layers.filter((l) => l.availability === "available"),
    );
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
  const base = getRegion("gale")!;
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
  assert.equal(layers.size, region.layers.length);
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
        c[1] === `region-${region.layers[2].id}` &&
        c[3] === "visible",
    ),
  );
  applyLayerStates(map, region, state, true);
  const layoutCalls = calls.filter((c) => c[0] === "layout");
  assert.deepEqual(layoutCalls.at(-1), [
    "layout",
    `region-${region.layers.at(-1)!.id}`,
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

test("route result geometry is display-only and fails closed without it", () => {
  const result = routeResponseSchema.parse({
    status: "candidates",
    region: "jezero",
    input_revision: "rev-1",
    dataset_version: "synthetic-software-test",
    coverage: {
      status: "audited",
      source_ids: ["synthetic-software-test-source"],
      limitations: [],
    },
    candidates: [
      {
        id: "candidate-display",
        objective: "safest",
        validation: "experimental",
        geometry: [
          { body: "Mars", crs: "IAU_2015", easting_m: 0, northing_m: 0 },
          { body: "Mars", crs: "IAU_2015", easting_m: 1, northing_m: 1 },
        ],
        display_geometry: [
          { latitude: 18.4, longitude_east: 77.5 },
          { latitude: 18.5, longitude_east: 282.5 },
        ],
        identical_to: null,
        omitted_target_ids: [],
        models: [
          {
            id: "synthetic-model",
            version: "1",
            source_ids: ["synthetic-software-test-source"],
            assumptions: [],
            limitations: [],
          },
        ],
        limitations: [],
        assessments: Object.fromEntries(
          assessments.map((name) => [
            name,
            { status: "Unverified", reason: "", value: null, unit: null },
          ]),
        ),
      },
      {
        id: "candidate-projected-only",
        objective: "fastest",
        validation: "scientifically_reviewed",
        geometry: [
          { body: "Mars", crs: "IAU_2015", easting_m: 0, northing_m: 0 },
          { body: "Mars", crs: "IAU_2015", easting_m: 1, northing_m: 1 },
        ],
        identical_to: null,
        omitted_target_ids: [],
        models: [
          {
            id: "synthetic-model",
            version: "1",
            source_ids: ["synthetic-software-test-source"],
            assumptions: [],
            limitations: [],
          },
        ],
        limitations: [],
        assessments: Object.fromEntries(
          assessments.map((name) => [
            name,
            { status: "Unverified", reason: "", value: null, unit: null },
          ]),
        ),
      },
    ],
  });
  assert.equal(result.status, "candidates");
  if (result.status !== "candidates") return;

  const { routes, unplottable } = displayRoutesFromResult(result);
  assert.deepEqual(unplottable, ["candidate-projected-only"]);
  assert.deepEqual(routes, [
    {
      id: "candidate-display",
      objective: "safest",
      validation: "experimental",
      coordinates: [
        [77.5, 18.4],
        [-77.5, 18.5],
      ],
    },
  ]);

  const collection = routeFeatureCollection(routes, "candidate-display");
  assert.equal(collection.features.length, 1);
  assert.equal(collection.features[0].properties.selected, true);
  assert.deepEqual(
    routeFeatureCollection(routes, null).features[0].properties.selected,
    false,
  );
});
