import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  getGaleEnvironmentalDataset,
  getGaleMeasurementsByInstrument,
  getGaleMeasurementsByVariable,
} from "@/lib/environment/gale/adapter";
import type { EnvironmentalDataset } from "@/lib/environment/gale/types";

function sha256(filePath: string): string {
  const buf = readFileSync(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

test("Gale adapter strictly conforms to Section 4 EnvironmentalDataset contract", () => {
  const dataset: EnvironmentalDataset = getGaleEnvironmentalDataset();

  assert.equal(dataset.regionId, "gale");
  assert.equal(dataset.mission, "MSL Curiosity");
  assert.equal(dataset.sourceVerified, "VERIFIED");
  assert.equal(dataset.processingVerified, "VERIFIED");
  assert.ok(Array.isArray(dataset.observations));
  assert.ok(dataset.observations.length > 0);

  // Validate every single observation record has required contract fields
  for (const obs of dataset.observations) {
    assert.equal(obs.regionId, "gale");
    assert.ok(obs.instrument === "REMS" || obs.instrument === "RAD");
    assert.ok(typeof obs.productId === "string" && obs.productId.length > 0);
    assert.ok(typeof obs.variableId === "string" && obs.variableId.length > 0);
    assert.ok(typeof obs.physicalQuantity === "string" && obs.physicalQuantity.length > 0);
    assert.ok(typeof obs.unit === "string" && obs.unit.length > 0);
    assert.equal(obs.sol, 100);
    assert.ok(typeof obs.sourceUrl === "string" && obs.sourceUrl.startsWith("https://"));
    assert.ok(typeof obs.qualityStatus === "string");

    // Value must be either a valid finite number or null (never NaN or undefined)
    assert.ok(
      obs.value === null || (typeof obs.value === "number" && !isNaN(obs.value)),
      `Observation ${obs.variableId} has invalid value: ${obs.value}`
    );
  }
});

test("Gale adapter provides clean filtering by instrument and variable", () => {
  const remsObs = getGaleMeasurementsByInstrument("REMS");
  const radObs = getGaleMeasurementsByInstrument("RAD");

  assert.ok(remsObs.length > 0);
  assert.ok(radObs.length > 0);
  assert.equal(remsObs.length + radObs.length, getGaleEnvironmentalDataset().observations.length);

  for (const obs of remsObs) {
    assert.equal(obs.instrument, "REMS");
  }
  for (const obs of radObs) {
    assert.equal(obs.instrument, "RAD");
  }

  // Check specific variable query
  const tempObs = getGaleMeasurementsByVariable("air_temperature");
  assert.equal(tempObs.length, 24); // 24 hourly measurements
  for (const obs of tempObs) {
    assert.equal(obs.variableId, "air_temperature");
    assert.equal(obs.unit, "degC");
  }

  const doseBObs = getGaleMeasurementsByVariable("absorbed_dose_rate_b");
  assert.equal(doseBObs.length, 43); // 43 observation blocks
  for (const obs of doseBObs) {
    assert.equal(obs.variableId, "absorbed_dose_rate_b");
    assert.equal(obs.unit, "uGy/hr");
  }
});

test("Gale adapter preserves nulls for sparse variables and never fabricates synthetic zeros", () => {
  const windObs = getGaleMeasurementsByVariable("wind_speed");
  assert.equal(windObs.length, 24);

  // Sol 100 has many hours where wind speed was not recorded due to Boom 1 damage
  const nullWind = windObs.filter((o) => o.value === null);
  assert.ok(nullWind.length > 0, "Missing wind observations must be preserved as null");
  for (const o of nullWind) {
    assert.equal(o.qualityStatus, "UNAVAILABLE_BOOM_DAMAGE");
  }
});

test("Cryptographic provenance manifest matches actual file checksums on disk", () => {
  const manifestPath = "data/environment/gale/provenance_manifest.json";
  assert.ok(existsSync(manifestPath));
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

  assert.equal(manifest.regionId, "gale");
  assert.equal(manifest.git_baseline_sha, "ed3e253d6e07b7675853aaa3c6951030ef3ac54b");

  // Check processed file hashes
  for (const [key, item] of Object.entries(manifest.processed_application_products) as [string, { path: string; sha256: string }][]) {
    assert.ok(existsSync(item.path), `Processed file ${item.path} must exist`);
    const actualHash = sha256(item.path);
    assert.equal(actualHash, item.sha256, `SHA-256 hash mismatch for ${key} (${item.path})`);
  }
});
