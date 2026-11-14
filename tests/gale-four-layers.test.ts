import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getRegion } from "../lib/regions/registry";
import {
  missionViewExtent,
  regionalExtent,
  globalExtent,
  thermalExtent,
  galeCoverageModes,
} from "../regions/gale/terrain-layers";

const gale = getRegion("gale")!;

test("Gale standardized four scientific categories exist and are available", () => {
  const layerIds = ["gale-regional-elevation", "gale-regional-hillshade", "gale-regional-slope", "gale-thermal"];
  for (const id of layerIds) {
    const layer = gale.layers.find((l) => l.id === id);
    assert.ok(layer, `Expected layer ${id} to exist`);
    assert.equal(layer!.availability, "available");
    assert.equal(layer!.rendering.kind, "raster-tiles");
  }

  const elev = gale.layers.find((l) => l.id === "gale-regional-elevation")!;
  assert.equal(elev.type, "Elevation");
  assert.equal(elev.kind, "topography");

  const shade = gale.layers.find((l) => l.id === "gale-regional-hillshade")!;
  assert.equal(shade.type, "Hillshade");
  assert.equal(shade.kind, "topography");

  const slope = gale.layers.find((l) => l.id === "gale-regional-slope")!;
  assert.equal(slope.type, "Slope");
  assert.equal(slope.kind, "topography");

  const thermal = gale.layers.find((l) => l.id === "gale-thermal")!;
  assert.equal(thermal.type, "Thermal");
  assert.equal(thermal.kind, "thermal");
});

test("recommended initial opacities match shared four-layer design specification", () => {
  const elev = gale.layers.find((l) => l.id === "gale-regional-elevation")!;
  assert.equal(elev.default_opacity, 60);

  const shade = gale.layers.find((l) => l.id === "gale-regional-hillshade")!;
  assert.equal(shade.default_opacity, 45);

  const slope = gale.layers.find((l) => l.id === "gale-regional-slope")!;
  assert.equal(slope.default_opacity, 60);

  const thermal = gale.layers.find((l) => l.id === "gale-thermal")!;
  assert.equal(thermal.default_opacity, 60);
});

test("slope layer uses standardized ordered color classes and preserves degrees units", () => {
  const slope = gale.layers.find((l) => l.id === "gale-regional-slope")!;
  const expectedColors = ["#4E8B7C", "#D6C875", "#E08E45", "#C25E2E", "#8C382A"];
  const actualColors = slope.legend!.items.map((i) => i.color);
  assert.deepEqual(actualColors, expectedColors);
  assert.match(slope.legend!.units!, /degrees.*not safety classes/);
  assert.match(slope.limitations, /not for hazard routing/i);
  assert.match(slope.legend!.items.at(-1)!.description!, /No astronaut safety threshold is assigned/);
});

test("elevation layer uses low-to-high ordered color ramp with MOLA areoid units", () => {
  const elev = gale.layers.find((l) => l.id === "gale-regional-elevation")!;
  const expectedColors = ["#425A78", "#587E91", "#87A39D", "#BCB29C", "#C8A97E"];
  const actualColors = elev.legend!.items.map((i) => i.color);
  assert.deepEqual(actualColors, expectedColors);
  assert.match(elev.legend!.units!, /MOLA areoid/i);
  assert.match(elev.legend!.items[0].description!, /does not independently establish route safety/i);
});

test("hillshade layer uses neutral grayscale with artificial illumination metadata", () => {
  const shade = gale.layers.find((l) => l.id === "gale-regional-hillshade")!;
  const expectedColors = ["#000000", "#FFFFFF"];
  const actualColors = shade.legend!.items.map((i) => i.color);
  assert.deepEqual(actualColors, expectedColors);
  assert.match(shade.legend!.items[0].description!, /315° azimuth/);
  assert.match(shade.legend!.items[0].description!, /45° altitude/);
  assert.match(shade.legend!.items[0].description!, /Not an optical photograph/);
});

test("thermal layer derives from authentic THEMIS daytime IR mosaic v2", () => {
  const thermal = gale.layers.find((l) => l.id === "gale-thermal")!;
  assert.equal(thermal.source_id, "gale-mars-trek-themis");
  assert.equal(thermal.spatial_resolution_m, 100);
  assert.equal(thermal.evidence, "Observed");
  assert.equal(thermal.legend!.units, null); // Qualitative brightness has no physical units
  assert.match(thermal.limitations, /relative daytime infrared brightness only/i);
  assert.match(thermal.limitations, /no temperature.*asserted/i);
  assert.match(thermal.attribution!, /NASA\/JPL · Arizona State University/);

  // Check tile existence on disk for zooms 5..9
  const expectedTiles = [
    "public/maps/gale/thermal-tiles/5/28/16.png",
    "public/maps/gale/thermal-tiles/6/56/32.png",
    "public/maps/gale/thermal-tiles/7/112/65.png",
    "public/maps/gale/thermal-tiles/8/225/131.png",
    "public/maps/gale/thermal-tiles/9/451/262.png",
  ];
  for (const tilePath of expectedTiles) {
    assert.ok(existsSync(tilePath), `Missing generated thermal tile: ${tilePath}`);
  }

  // Check report on disk
  const reportPath = "team/gale/thermal_report.json";
  assert.ok(existsSync(reportPath), "Missing thermal_report.json");
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  assert.equal(report.source_product, "THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018");
  assert.equal(report.output_tiles_written, 5);
  assert.equal(report.source_tiles_missing, 0);
  assert.equal(thermalExtent.west_east, 137.327439);
});

test("Problem A: presentation bounds restrict overlay to mission basemap footprint", () => {
  const regionalElev = gale.layers.find((l) => l.id === "gale-regional-elevation")!;
  if (regionalElev.rendering.kind !== "raster-tiles") throw new Error("Expected raster-tiles");
  assert.deepEqual(regionalElev.rendering.bounds, missionViewExtent);

  const thermal = gale.layers.find((l) => l.id === "gale-thermal")!;
  if (thermal.rendering.kind !== "raster-tiles") throw new Error("Expected raster-tiles");
  assert.deepEqual(thermal.rendering.bounds, missionViewExtent);

  // Full data coverage is preserved in exported modes and coverage layers
  assert.deepEqual(galeCoverageModes.missionView.bounds, missionViewExtent);
  assert.deepEqual(galeCoverageModes.fullCoverageRegional.bounds, regionalExtent);
  assert.deepEqual(galeCoverageModes.fullCoverageGlobal.bounds, globalExtent);

  const regionalCoverage = gale.layers.find((l) => l.id === "gale-coverage-regional")!;
  assert.deepEqual(regionalCoverage.zoom_extent, regionalExtent);

  const globalCoverage = gale.layers.find((l) => l.id === "gale-coverage-global")!;
  assert.deepEqual(globalCoverage.zoom_extent, globalExtent);
});

test("geological units and rover traverse remain auxiliary overlays outside the four categories", () => {
  const geology = gale.layers.find((l) => l.id === "gale-geology")!;
  assert.equal(geology.kind, "geology");
  assert.equal(geology.type, "Geological mapping");

  const traverse = gale.layers.find((l) => l.id === "gale-traverse-recorded")!;
  assert.equal(traverse.kind, "overlay");
  assert.equal(traverse.type, "Recorded rover traverse");

  // Four-layer categories only include topography and thermal
  const fourLayerKinds = new Set(["topography", "thermal"]);
  const scientificFourLayers = gale.layers.filter(
    (l) => ["gale-regional-elevation", "gale-regional-hillshade", "gale-regional-slope", "gale-thermal"].includes(l.id)
  );
  assert.ok(scientificFourLayers.every((l) => fourLayerKinds.has(l.kind)));
});
