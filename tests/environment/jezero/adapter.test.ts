import assert from "node:assert/strict";
import { test } from "node:test";
import {
  toEnvironmentalDataset,
  toEnvironmentalMeasurements,
  verificationSummary,
} from "@/lib/environment/jezero/adapter";
import { jezeroEnvironmentalDataset } from "@/lib/environment/jezero/dataset";

const dataset = jezeroEnvironmentalDataset;

test("adapter exposes every aggregated point in the shared contract shape", () => {
  const observations = toEnvironmentalMeasurements(dataset);
  const expected = dataset.series.reduce((sum, series) => sum + series.points.length, 0);
  assert.equal(observations.length, expected);
  assert.ok(observations.length > 0);

  for (const observation of observations) {
    assert.equal(observation.regionId, "jezero");
    assert.equal(observation.instrument, "MEDA");
    assert.ok(observation.productId.startsWith("WE__"));
    assert.ok(observation.variableId.length > 0);
    assert.ok(observation.physicalQuantity.length > 0);
    assert.equal(typeof observation.value, "number");
    assert.ok(observation.unit.length > 0);
    assert.equal(typeof observation.sol, "number");
    assert.equal(observation.timeBasis, "LMST");
    assert.match(observation.sourceUrl, /^https:\/\//);
    assert.ok(observation.qualityStatus.length > 0);
    assert.match(observation.localMeanSolarTime ?? "", /^\d{2}:\d{2}:\d{2}$/);
  }
});

test("adapter never fabricates UTC timestamps for per-sample observations", () => {
  for (const observation of toEnvironmentalMeasurements(dataset)) {
    assert.equal(observation.observedAt, null);
  }
});

test("adapter marks the statistic as derived from native samples", () => {
  const [first] = toEnvironmentalMeasurements(dataset, { sol: 100 });
  assert.ok(first);
  assert.match(first.derivedStatistic, /10-minute LMST bin/);
  assert.match(first.qualityStatus, /Aggregated/);
  assert.match(first.qualityStatus, /no interpolation/i);
});

test("sol filter returns only that sol and matches the panel selection", () => {
  for (const sol of dataset.displayWindow.solSelection) {
    const observations = toEnvironmentalMeasurements(dataset, { sol });
    assert.ok(observations.length > 0);
    assert.ok(observations.every((observation) => observation.sol === sol));
    const expected = dataset.series
      .filter((series) => series.sol === sol)
      .reduce((sum, series) => sum + series.points.length, 0);
    assert.equal(observations.length, expected);
  }
});

test("shared dataset wrapper reuses the Gale-compatible contract fields", () => {
  const shared = toEnvironmentalDataset(dataset, { sol: 140 });
  assert.equal(shared.regionId, "jezero");
  assert.equal(shared.mission, dataset.mission);
  assert.equal(shared.instrument, "MEDA");
  assert.equal(shared.sourceVerified, "VERIFIED");
  assert.equal(shared.processingVerified, "VERIFIED");
  assert.ok(shared.observations.every((observation) => observation.sol === 140));
  assert.deepEqual(verificationSummary(dataset), {
    source: "VERIFIED",
    processing: "VERIFIED",
    registration: "NOT_EVALUATED",
  });
});

test("no observation is an ionizing-dose quantity", () => {
  for (const observation of toEnvironmentalMeasurements(dataset)) {
    assert.doesNotMatch(observation.physicalQuantity, /dose|dose_rate|equivalent|gcr|sep/i);
    assert.doesNotMatch(observation.variableId, /dose|GCR|SEP/);
  }
});
