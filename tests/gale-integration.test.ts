import { test } from "node:test";
import assert from "node:assert/strict";
import { getRegion } from "../lib/regions/registry";
import { layerState, updateLayerState, type LayerStates } from "../lib/map/region-layers";

test("Gale terrain alternatives preserve independent geology, optical imagery and traverse in both directions", () => {
  const gale = getRegion("gale")!;
  for (const terrain of gale.layers.filter((layer) => layer.kind === "topography")) {
    let state = updateLayerState(gale, {}, "gale-geology", { visible: true, opacity: 47 });
    state = updateLayerState(gale, state, terrain.id, { visible: true, opacity: 63 });
    assert.equal(layerState(gale, state, "gale-geology").visible, true);
    assert.equal(layerState(gale, state, "gale-geology").opacity, 47);
    assert.equal(layerState(gale, state, "gale-optical").visible, true);
    assert.equal(layerState(gale, state, "gale-traverse-recorded").visible, true);
    const next = updateLayerState(gale, state, "gale-geology", { visible: true });
    assert.equal(layerState(gale, next, terrain.id).visible, true);
    assert.equal(layerState(gale, next, terrain.id).opacity, 63);
  }
});

test("Jezero and Oxia retain the original availability and visibility policy", () => {
  for (const id of ["jezero", "oxia"]) {
    const actual = getRegion(id)!;
    for (const layer of actual.layers.filter((item) => item.availability !== "available")) {
      const state: LayerStates = {};
      assert.equal(updateLayerState(actual, state, layer.id, { visible: true }), state);
    }
    // Available software fixtures exercise the existing non-Gale policy;
    // no unavailable scientific layer is enabled in the real configurations.
    const fixture = { ...actual, layers: actual.layers.map((layer) => ({ ...layer, availability: "available" as const })) };
    for (const selected of fixture.layers) {
      const original = Object.fromEntries(fixture.layers.map((layer) => [layer.id, { visible: true, opacity: 37 }]));
      const result = updateLayerState(fixture, original, selected.id, { visible: true });
      for (const other of fixture.layers) {
        const shouldHide = selected.id !== other.id && selected.kind !== "optical" && selected.kind !== "overlay" && other.kind !== "optical" && other.kind !== "overlay";
        assert.equal(result[other.id].visible, !shouldHide);
        assert.equal(result[other.id].opacity, 37);
      }
    }
  }
});

test("regional terrain selection preserves camera policy and neutral numeric legends", () => {
  const gale = getRegion("gale")!;
  for (const layer of gale.layers.filter((item) => /^gale-(regional|global)-/.test(item.id))) {
    assert.equal(layer.rendering.kind, "raster-tiles");
    if (layer.rendering.kind === "raster-tiles") assert.equal(layer.rendering.focus_extent, undefined);
    for (const item of layer.legend?.items ?? []) assert.doesNotMatch(item.description ?? "", /clay-bearing|Vera Rubin|sulfate-bearing|stratigraphic/i);
  }
});
