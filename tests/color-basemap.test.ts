import { test } from "node:test";
import assert from "node:assert/strict";
import type { Map as MapInstance } from "maplibre-gl";
import { applyColorBasemap, COLOR_BASEMAP } from "../lib/map/color-basemap";

test("color controller preserves CTX, all overlays, camera and mission; mounts once below terrain", () => {
  const layers = ["background", "region-gale-optical", "region-gale-dem", "region-gale-geology", "region-gale-traverse-recorded", "trajectory"];
  const calls: unknown[][] = [];
  let source: unknown, layer: unknown;
  // Any unexpected camera/state API access fails: these are the entire interface.
  const map = {
    getSource: () => source, getLayer: () => layer,
    getStyle: () => ({ layers: layers.map((id) => ({ id })) }),
    addSource: (...args: unknown[]) => { calls.push(["source", ...args]); source = args[1]; },
    addLayer: (...args: unknown[]) => { calls.push(["layer", ...args]); layer = args[0]; },
    setLayoutProperty: (...args: unknown[]) => calls.push(["layout", ...args]),
    setPaintProperty: (...args: unknown[]) => calls.push(["paint", ...args]),
  } as unknown as MapInstance;
  applyColorBasemap(map, false, true, 100);
  assert.equal(calls.length, 0);
  applyColorBasemap(map, true, true, 63);
  assert.equal(calls[1][2], "region-gale-dem");
  assert.deepEqual(calls[2], ["layout", COLOR_BASEMAP.id, "visibility", "visible"]);
  assert.deepEqual(calls[3], ["paint", COLOR_BASEMAP.id, "raster-opacity", .63]);
  applyColorBasemap(map, true, false, 25);
  assert.deepEqual(calls[4], ["layout", COLOR_BASEMAP.id, "visibility", "none"]);
  applyColorBasemap(map, false, true, 100);
  assert.equal(calls.filter((c) => c[0] === "source").length, 1);
  assert.equal(calls.filter((c) => c[0] === "layer").length, 1);
  assert.ok(calls.filter((c) => c[0] === "layout" || c[0] === "paint").every((c) => c[1] === COLOR_BASEMAP.id));
});
