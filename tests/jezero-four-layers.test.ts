import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import type { Map as MapInstance } from "maplibre-gl";
import { jezero } from "../regions/jezero";
import { scientificLayers, scientificPresentation, missionExtent, demExtent } from "../regions/jezero/scientific-presentation";
import { mountRegionLayers, applyLayerStates, updateLayerState } from "../lib/map/region-layers";

const json = (path: string) => JSON.parse(readFileSync(path, "utf8"));

test("Jezero has exactly four source-backed categories with safe interpretations", () => {
  assert.deepEqual(scientificPresentation.map((item) => item.category), ["Elevation", "Hillshade", "Slope", "Thermal"]);
  assert.equal(new Set(scientificLayers.map((item) => item.id)).size, 4);
  for (const layer of scientificLayers) {
    assert.equal(layer.availability, "available");
    assert.ok(jezero.source_references.some((source) => source.id === layer.source_id));
    assert.equal(layer.rendering.kind, "raster-tiles");
  }
  assert.deepEqual(scientificLayers.map((item) => item.default_opacity), [60, 45, 60, 60]);
  assert.equal(scientificLayers[0].legend?.units, "m");
  assert.equal(scientificLayers[2].legend?.units, "deg");
  assert.equal(scientificLayers[3].legend?.units, null);
  assert.match(scientificLayers[3].limitations, /no temperature/);
  assert.equal(scientificLayers[1].evidence, "Derived");
  assert.equal(scientificLayers[2].evidence, "Derived");
  assert.equal(jezero.routing.enabled, false);
  assert.ok(jezero.targets.every((target) => target.coordinates === null && !target.coordinate_verified && target.routing_eligibility.status === "unavailable"));
});

test("real DEM lineage, extrema, strict nodata, tile positioning and native affine", () => {
  const report = json("team/jezero/terrain/hillshade_report.json");
  assert.match(report.product, /^JEZ_hirise_soc_006_DTM_/);
  assert.equal(report.source_bytes, 1839545409);
  assert.match(report.source_sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(report.source_affine, [1, 0, 4577366, 0, -1, 1106618]);
  assert.ok(report.nodata < -1e30);
  assert.ok(report.source_exact_range_m[0] < -2600);
  assert.ok(report.source_exact_range_m[1] > -1900);
  assert.ok(report.source_exact_range_m[0] <= report.mission_exact_range_m[0]);
  assert.equal(report.azimuth_deg, 315);
  assert.equal(report.illumination_elevation_deg, 45);
  assert.match(report.gradient_support, /strictly transparent/);
  report.source_bounds.forEach((value: number, index: number) => assert.ok(Math.abs(value - demExtent[index]) < 1e-10));
  assert.ok(demExtent[2] > missionExtent[2] && demExtent[1] < missionExtent[1]);
  for (const row of report.tile_ranges) {
    assert.equal(row.xMin, Math.floor((report.tiling_bounds[0] + 180) / 360 * 2 ** row.z));
    assert.equal(row.xMax, Math.floor((report.tiling_bounds[2] + 180) / 360 * 2 ** row.z));
  }
});

test("all real retained scientific PNGs preserve baseline bytes; generated assets match hashes", () => {
  const inventory = json("team/jezero/terrain/asset_checksums.json");
  assert.equal(Object.keys(inventory.retained).length, 393);
  const report = json("team/jezero/terrain/hillshade_report.json");
  assert.equal(Object.keys(inventory.generated).length, report.tiles_written);
  for (const [path, hash] of Object.entries({ ...inventory.retained, ...inventory.generated })) {
    const data = readFileSync(path);
    assert.equal(createHash("sha256").update(data).digest("hex"), hash);
    assert.equal(data.readUInt32BE(16), 256);
    assert.equal(data.readUInt32BE(20), 256);
  }
  for (const geometry of Object.values(inventory.display_footprints) as { path: string; sha256: string }[]) {
    assert.equal(createHash("sha256").update(readFileSync(geometry.path)).digest("hex"), geometry.sha256);
  }
  for (const [name, hash] of Object.entries(inventory.source_metadata_sha256)) {
    assert.equal(createHash("sha256").update(readFileSync(`team/jezero/terrain/${name}`)).digest("hex"), hash);
  }
  assert.equal(createHash("sha256").update(readFileSync(`team/jezero/terrain/${report.valid_footprint}`)).digest("hex"), report.valid_footprint_sha256);
});

test("existing renderer mounts real Jezero hillshade, switches layers, applies opacity and cleans up", () => {
  const layers = new Set<string>(), sources = new Set<string>();
  const calls: unknown[][] = [];
  const map = {
    addSource: (id: string, source: unknown) => { sources.add(id); calls.push(["source", id, source]); },
    addLayer: (layer: { id: string }) => layers.add(layer.id),
    getLayer: (id: string) => layers.has(id), getSource: (id: string) => sources.has(id),
    removeLayer: (id: string) => layers.delete(id), removeSource: (id: string) => sources.delete(id),
    setLayoutProperty: (...args: unknown[]) => calls.push(["layout", ...args]),
    setPaintProperty: (...args: unknown[]) => calls.push(["paint", ...args]),
  } as unknown as MapInstance;
  const cleanup = mountRegionLayers(map, jezero);
  assert.ok(sources.has("region-jezero-hillshade"));
  let state = updateLayerState(jezero, {}, "jezero-elevation", { visible: true });
  state = updateLayerState(jezero, state, "jezero-hillshade", { visible: true });
  assert.equal(state["jezero-elevation"].visible, false);
  applyLayerStates(map, jezero, state, false);
  assert.ok(calls.some((call) => call[0] === "paint" && call[1] === "region-jezero-hillshade" && call[2] === "raster-opacity" && call[3] === .45));
  assert.ok([...sources].every((id) => id.startsWith("region-jezero-")));
  cleanup();
  assert.equal(sources.size, 0);
  assert.equal(layers.size, 0);
});
