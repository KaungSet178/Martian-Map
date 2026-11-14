import { test } from "node:test";
import assert from "node:assert/strict";
import { regions } from "../lib/regions/registry";
import { regionSchema } from "../lib/contracts/region";
import { categoryLayers, layerGroups, scientificCategories } from "../lib/map/scientific-categories";

test("all regions expose four independent categories with regional source variants", () => {
  for (const region of Object.values(regions)) {
    assert.deepEqual(layerGroups(region).slice(0,4).map(group=>group.title), ["Elevation","Hillshade","Slope","Thermal"]);
    const ids = new Set<string>();
    for (const category of scientificCategories) {
      const layers = categoryLayers(region, category);
      assert.ok(layers.length);
      for (const layer of layers) {
        assert.equal(layer.availability,"available");
        assert.equal(layer.rendering.kind,"raster-tiles");
        assert.ok(layer.legend);
        assert.ok(layer.source_id?.startsWith(`${region.id}-`));
        assert.ok(!ids.has(layer.id)); ids.add(layer.id);
      }
    }
    assert.equal(region.routing.enabled,false);
    assert.equal(region.capabilities.mission_feasibility.status,"unavailable");
  }
  assert.equal(categoryLayers(regions.gale,"Elevation").length,3);
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
