import { test } from "node:test";
import assert from "node:assert/strict";
import { regions } from "../lib/regions/registry";
import { regionSchema } from "../lib/contracts/region";
import { categoryLayers, layerGroups, scientificCategories } from "../lib/map/scientific-categories";
import { applyLayerStates, layerState, updateLayerState } from "../lib/map/region-layers";
import type { Map as MapInstance } from "maplibre-gl";

test("all regions expose exactly one layer per scientific category", () => {
  for (const region of Object.values(regions)) {
    assert.deepEqual(layerGroups(region).slice(0,4).map(group=>group.title), ["Elevation","Hillshade","Slope","Thermal"]);
    const ids = new Set<string>();
    for (const category of scientificCategories) {
      const layers = categoryLayers(region, category);
      assert.equal(layers.length, 1);
      for (const layer of layers) {
        assert.equal(layer.availability,layer.id==="jezero-slope" ? "unavailable" : "available");
        assert.equal(layer.rendering.kind,layer.id==="jezero-slope" ? "unavailable" : "raster-tiles");
        if(layer.rendering.kind==="unavailable")assert.match(layer.rendering.reason,/I4C-01/);
        assert.ok(layer.legend);
        assert.ok(layer.source_id?.startsWith(`${region.id}-`));
        assert.ok(!ids.has(layer.id)); ids.add(layer.id);
      }
    }
    assert.equal(region.routing.enabled,false);
    assert.equal(region.capabilities.mission_feasibility.status,"unavailable");
  }
  assert.deepEqual(scientificCategories.flatMap(category => categoryLayers(regions.gale, category).map(layer => layer.id)),
    ["gale-regional-elevation", "gale-regional-hillshade", "gale-regional-slope", "gale-thermal"]);
});

test("hidden Gale variants and coverage cannot be selected or rendered from old states", () => {
  const hidden = ["gale-terrain", "gale-hillshade", "gale-slope", "gale-global-elevation", "gale-global-hillshade", "gale-global-slope", "gale-coverage-regional", "gale-coverage-global"];
  const displayed = layerGroups(regions.gale).flatMap(group => group.layers.map(layer => layer.id));
  const states = Object.fromEntries(hidden.map(id => [id, { visible: true, opacity: 100 }]));
  const visibility = new Map<string, unknown>();
  const map = {
    getLayer: () => true,
    setLayoutProperty: (id: string, property: string, value: unknown) => { if (property === "visibility") visibility.set(id, value); },
    setPaintProperty: () => {},
  } as unknown as MapInstance;
  applyLayerStates(map, regions.gale, states, false);
  for (const id of hidden) {
    assert.ok(regions.gale.layers.some(layer => layer.id === id), `${id} metadata retained`);
    assert.ok(!displayed.includes(id));
    assert.equal(layerState(regions.gale, states, id).visible, false);
    assert.equal(updateLayerState(regions.gale, {}, id, { visible: true })[id], undefined);
    assert.equal(visibility.get(`region-${id}`), "none");
  }
});

test("Derived is a display evidence class with mandatory lineage, not geographic or routing verification", () => {
  for (const region of Object.values(regions)) {
    for (const layer of region.layers.filter(layer=>layer.availability === "available" && layer.evidence === "Derived")) {
      assert.ok(region.source_references.some(source=>source.id===layer.source_id));
      assert.ok(layer.coverage && layer.attribution && layer.limitations);
      assert.equal(regionSchema.safeParse({...region,layers:[{...layer,source_id:null}]}).success,false);
      assert.equal(regionSchema.safeParse({...region,layers:[{...layer,source_id:"unknown-source"}]}).success,false);
    }
  }
  for (const target of regions.jezero.targets) {
    assert.equal(target.coordinates,null); assert.equal(target.coordinate_verified,false);
    assert.equal(target.routing_eligibility.status,"unavailable");
  }
});
