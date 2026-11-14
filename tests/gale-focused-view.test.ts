import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Map as MapInstance } from "maplibre-gl";
import { getRegion } from "../lib/regions/registry";
import { fitInitialView, fitOverview, focusExtentForViewport, focusPadding } from "../lib/map/camera";
import { displayBounds, layerState, updateLayerState } from "../lib/map/region-layers";
import { categoryLayers, scientificCategories } from "../lib/map/scientific-categories";

const gale = getRegion("gale")!;
const mission = gale.map.supported_extent!;
type Extent = NonNullable<typeof mission>;
const mercatorY = (latitude: number) =>
  Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360));
const projectedAspect = (extent: Extent) =>
  ((extent.east_east - extent.west_east) * Math.PI / 180) /
  (mercatorY(extent.north_latitude) - mercatorY(extent.south_latitude));
const contains = (outer: Extent, inner: Extent) =>
  inner.west_east >= outer.west_east - 1e-12 &&
  inner.east_east <= outer.east_east + 1e-12 &&
  inner.south_latitude >= outer.south_latitude - 1e-12 &&
  inner.north_latitude <= outer.north_latitude + 1e-12;

// Actual map-workspace frames measured at the required browser sizes. The
// desktop sidebar and the mobile sheet reduce the frame, so viewport width is
// not the map width; the regression uses the real frames, not 1440/768/390.
const viewports = [
  { name: "desktop", width: 1080, height: 788, padding: { top: 24, bottom: 64, left: 24, right: 76 } },
  { name: "tablet", width: 768, height: 750, padding: { top: 24, bottom: 64, left: 24, right: 76 } },
  { name: "mobile", width: 390, height: 570, padding: { top: 24, bottom: 64, left: 23.4, right: 76 } },
] as const;

test("fresh Gale entry fits a real viewport-aspect close-up inside the detailed footprint", () => {
  const traverse = JSON.parse(readFileSync("public/maps/gale/curiosity-traverse.geojson", "utf8"));
  const vertices: number[][] = [];
  const walk = (coordinates: unknown): void => {
    if (typeof (coordinates as number[])[0] === "number") vertices.push(coordinates as number[]);
    else (coordinates as unknown[]).forEach(walk);
  };
  walk(traverse.features[0].geometry.coordinates);
  const framing = gale.map.initial_extent!;
  for (const viewport of viewports) {
    const usableWidth = viewport.width - viewport.padding.left - viewport.padding.right;
    const usableHeight = viewport.height - viewport.padding.top - viewport.padding.bottom;
    const focus = focusExtentForViewport(gale, viewport, viewport.padding)!;
    assert.ok(focus, `${viewport.name}: focus extent must exist`);
    // Detailed CTX coverage, not the optional wider context.
    assert.ok(contains(mission, focus), `${viewport.name}: focus exceeds detailed CTX footprint`);
    assert.ok(contains(framing, focus), `${viewport.name}: focus exceeds reviewed initial window`);
    // Mars Mercator projected aspect matches the usable map exactly.
    assert.ok(Math.abs(projectedAspect(focus) - usableWidth / usableHeight) < 1e-9,
      `${viewport.name}: camera enforces a different aspect than the map`);
    // The narrower geographic axis is saturated, so the crop is maximal.
    const widthSaturated = Math.abs((focus.east_east - focus.west_east) -
      (framing.east_east - framing.west_east)) < 1e-9;
    const heightSaturated = Math.abs((focus.north_latitude - focus.south_latitude) -
      (framing.north_latitude - framing.south_latitude)) < 1e-9;
    assert.ok(widthSaturated || heightSaturated, `${viewport.name}: focus is not maximal`);
    // Selector centre is the reviewed Lower Mount Sharp midpoint, with real
    // recorded traverse terrain inside the crop.
    assert.ok(Math.abs((focus.west_east + focus.east_east) / 2 -
      (framing.west_east + framing.east_east) / 2) < 1e-9);
    assert.ok(Math.abs((focus.south_latitude + focus.north_latitude) / 2 -
      (framing.south_latitude + framing.north_latitude) / 2) < 1e-5);
    const traverseVertices = vertices.filter(([longitude, latitude]) =>
      longitude >= focus.west_east && longitude <= focus.east_east &&
      latitude >= focus.south_latitude && latitude <= focus.north_latitude).length;
    assert.ok(traverseVertices > 5000,
      `${viewport.name}: close-up contains too little recorded traverse (${traverseVertices})`);
    // A fit of a 0.09-degree-wide crop is a close-up, not the overview.
    const zoom = Math.log2(((usableWidth / (focus.east_east - focus.west_east)) * 360) / 256);
    assert.ok(zoom > (viewport.name === "mobile" ? 12.5 : 13.2),
      `${viewport.name}: close-up zoom ${zoom.toFixed(2)} is too far out`);
    assert.ok(projectedAspect(focus) > 0 && focus.east_east > focus.west_east);
    // The close-up must not be mistaken for complete mission coverage.
    assert.notDeepEqual(focus, mission);
    assert.ok(!contains(focus, mission), `${viewport.name}: close-up claims the entire mission`);
    assert.ok((focus.east_east - focus.west_east) *
      (focus.north_latitude - focus.south_latitude) <
      (mission.east_east - mission.west_east) *
      (mission.north_latitude - mission.south_latitude));
  }
});

test("focus padding reserves real furniture but does not letterbox the close-up", () => {
  const container = {
    getBoundingClientRect: () => ({ width: 1080, height: 788, top: 80, right: 1440, bottom: 868, left: 360 }),
    parentElement: {
      querySelector: (selector: string) => selector === ".map-navigation"
        ? { getBoundingClientRect: () => ({ left: 1380 }) }
        : null,
    },
  } as unknown as HTMLElement;
  assert.deepEqual(focusPadding(container), { top: 24, bottom: 64, left: 24, right: 76 });
  const pad = focusPadding(container);
  assert.ok((pad.top ?? 0) + (pad.bottom ?? 0) < 100);
});

test("wider context stays hidden by default while its assets and provenance remain intact", () => {
  const state = layerState(gale, {}, "gale-context");
  assert.equal(state.visible, false);
  assert.equal(state.opacity, 100);
  const layer = gale.layers.find((item) => item.id === "gale-context")!;
  assert.equal(layer.display_name, "Context CTX (wider area)");
  assert.equal(layer.availability, "available");
  assert.equal(layer.source_id, "gale-trek-ctx");
  if (layer.rendering.kind !== "raster-tiles") throw Error("Expected context raster tiles");
  assert.deepEqual(layer.rendering.tiles, ["/maps/gale/context-tiles/{z}/{x}/{y}.png"]);
  assert.deepEqual(layer.rendering.bounds, {
    west_east: 136.4, east_east: 138.4, south_latitude: -5.6, north_latitude: -3.8,
  });
  assert.ok(layer.attribution?.includes("NASA/JPL-Caltech/MSSS"));
  assert.match(layer.limitations ?? "", /display sample spacings/);
  assert.equal(readFileSync("public/maps/gale/context-tiles/11/1805/1050.png").length > 0, true);
  // The optional setting restores context without disabling scientific layers.
  const shown = updateLayerState(gale, {}, "gale-context", { visible: true });
  assert.equal(shown["gale-context"].visible, true);
  assert.equal(layerState(gale, shown, "gale-optical").visible, true);
  for (const category of scientificCategories) {
    const layers = categoryLayers(gale, category);
    assert.ok(layers.length > 0, `${category} must keep its Gale layers`);
    assert.ok(layers.every((item) => layerState(gale, shown, item.id).visible === false));
  }
  const hiddenAgain = updateLayerState(gale, shown, "gale-context", { visible: false });
  assert.equal(hiddenAgain["gale-context"].visible, false);
});

test("detailed CTX source, mission view and complete-mission action are independent of context", () => {
  const optical = gale.layers.find((item) => item.id === "gale-optical")!;
  if (optical.rendering.kind !== "raster-tiles") throw Error("Expected detailed CTX raster tiles");
  assert.deepEqual(optical.rendering.tiles, ["/maps/gale/ctx-tiles/{z}/{x}/{y}.png"]);
  assert.equal(optical.rendering.max_zoom, 13);
  assert.equal(layerState(gale, {}, "gale-optical").visible, true);
  assert.deepEqual(gale.map.supported_extent, {
    west_east: 137.3442352329006,
    east_east: 137.4579431096443,
    south_latitude: -4.822361175063087,
    north_latitude: -4.580605407446296,
  });
  assert.ok(readFileSync("public/maps/gale/ctx-tiles/13/7222/4204.png").length > 0);

  const calls: unknown[][] = [];
  const map = {
    stop: () => {}, resize: () => {}, setMaxBounds: () => {}, setPadding: () => {},
    getMaxZoom: () => 18,
    fitBounds: (...args: unknown[]) => calls.push(args),
  } as unknown as MapInstance;
  const container = {
    getBoundingClientRect: () => ({ width: 1080, height: 788, top: 80, right: 1440, bottom: 868, left: 360 }),
    parentElement: {
      querySelector: (selector: string) => selector === ".map-navigation"
        ? { getBoundingClientRect: () => ({ left: 1380 }) }
        : null,
    },
  } as unknown as HTMLElement;
  fitInitialView(map, gale, container, false);
  const fresh = calls.at(-1)!;
  fitInitialView(map, gale, container, false);
  assert.deepEqual(calls.at(-1)![0], fresh[0]);
  assert.deepEqual(calls.at(-1)![0],
    displayBounds(focusExtentForViewport(gale, { width: 1080, height: 788 },
      { top: 24, bottom: 64, left: 24, right: 76 })!));
  assert.deepEqual((fresh[1] as { padding: unknown }).padding,
    { top: 24, bottom: 64, left: 24, right: 76 });
  assert.equal((fresh[1] as { duration: number }).duration, 0);
  fitInitialView(map, gale, container, false, true);
  assert.equal((calls.at(-1)![1] as { duration: number }).duration, 280);
  fitOverview(map, gale, container, false);
  assert.deepEqual(calls.at(-1)![0], displayBounds(mission));
  assert.equal((calls.at(-1)![1] as { duration: number }).duration, 0);
});

test("Jezero and Oxia keep their untouched initial cameras and four-category catalogs", () => {
  for (const id of ["jezero", "oxia"] as const) {
    const region = getRegion(id)!;
    assert.equal(region.map.initial_extent, undefined);
    assert.ok(region.map.supported_extent);
    assert.equal(focusExtentForViewport(region, { width: 1080, height: 788 },
      { top: 24, bottom: 64, left: 24, right: 76 }), null);
    for (const category of scientificCategories)
      assert.equal(categoryLayers(region, category).length, 1);
    assert.equal(region.layers.some((layer) => layer.id === "gale-context"), false);
    const state = updateLayerState(region, {}, "gale-context", { visible: true });
    assert.equal(Object.keys(state).length, 0);
  }
  const categories = scientificCategories.map((category) => ({
    category,
    layers: categoryLayers(gale, category).map((layer) => layer.id),
  }));
  assert.deepEqual(categories, [
    { category: "Elevation", layers: ["gale-regional-elevation", "gale-global-elevation", "gale-terrain"] },
    { category: "Hillshade", layers: ["gale-regional-hillshade", "gale-global-hillshade", "gale-hillshade"] },
    { category: "Slope", layers: ["gale-regional-slope", "gale-global-slope", "gale-slope"] },
    { category: "Thermal", layers: ["gale-thermal"] },
  ]);
});
