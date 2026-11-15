import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { regions } from "../lib/regions/registry";
import { marsDistance } from "../lib/map/geodesy";
import { scienceSites, sitesForObjective, sitePolicy } from "../lib/science/sites";
import { objectiveGeographicEvidence } from "../lib/science/objective-location-adapter";

test("restored Oxia color assets and offline overlay preserve geometric-only planning", () => {
  const region = regions.oxia;
  assert.equal(region.routing.enabled, false);
  assert.equal(region.targets.length, 4);
  assert.equal(scienceSites.length, 23);
  assert.equal(region.layers.find(l => l.id === "oxia-optical")!.default_visible, false);
  const color = region.layers.find(l => l.id === "oxia-optical-color")!;
  assert.equal(color.default_visible, true);
  assert.equal(readdirSync("public/maps/oxia/ctx-color-tiles", { recursive: true }).filter(p => String(p).endsWith(".jpg")).length, 841);
  const overlay = region.layers.find(l => l.id === "oxia-candidate-traverse")!;
  assert.equal(overlay.default_visible, false);
  assert.equal(overlay.evidence, "Modeled");
  assert.match(overlay.limitations, /Not safety-validated; not live routing/);
  assert.equal(overlay.rendering.kind, "geojson");
  if (overlay.rendering.kind === "geojson") {
    assert.equal(overlay.rendering.color, "#FF7A00");
    assert.equal(overlay.rendering.line_pattern, "dashed");
  }
  const lines = JSON.parse(readFileSync("public/maps/oxia/candidate-traverse.geojson", "utf8"));
  assert.equal(lines.features.length, 3);
  assert.ok(lines.features.every((f: { geometry: { type: string } }) => f.geometry.type === "LineString"));
});

test("Oxia CRISM feature 773 is a rounded source point, approximately 3 km south", () => {
  const target = regions.oxia.targets.find(t => t.id === "oxia-objective-4")!;
  const [site] = sitesForObjective("oxia", target.id);
  const query = JSON.parse(readFileSync("docs/evidence/f3/oxia-hydrous-query.json", "utf8"));
  const feature = query.response.features.find((f: { attributes: { FID: number } }) => f.attributes.FID === 773);
  assert.deepEqual(site.coordinates, { latitude: Number(feature.attributes.Latitude.toFixed(2)), longitude_east: Number(feature.attributes.Longitude.toFixed(2)) });
  assert.deepEqual(site.coordinates, target.coordinates);
  assert.equal(site.source.feature_id, "773");
  assert.equal(sitePolicy(site).geometricOnly, true);
  assert.equal(sitePolicy(site).terrainEligible, false);
  assert.deepEqual(objectiveGeographicEvidence(target), { registration_verified: false, positional_uncertainty_m: null });
  const primary = regions.oxia.targets[0].coordinates!;
  const distance = marsDistance(primary, target.coordinates!);
  assert.ok(distance > 2900 && distance < 3100);
  assert.ok(target.coordinates!.latitude < primary.latitude);
  assert.match(target.activity, /spacing.*uncertainty.*unknown/);
});
