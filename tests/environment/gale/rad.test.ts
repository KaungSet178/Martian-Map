import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getGaleSol100Radiation,
  getRadObservations,
  getRadDetectorBStats,
  getRadDetectorEStats,
  getRadDoseSeries,
} from "@/lib/environment/gale/rad-data";

test("Gale RAD ionizing radiation verifies authentic PDS PPI dataset and product provenance", () => {
  const rad = getGaleSol100Radiation();
  assert.equal(rad.metadata.regionId, "gale");
  assert.equal(rad.metadata.mission, "MSL Curiosity");
  assert.equal(rad.metadata.sol, 100);
  assert.equal(rad.metadata.dataset_id, "MSL-M-RAD-3-RDR-V1.0");
  assert.equal(rad.metadata.product_id, "RAD_RDR_2012_321_08_21_0100_V00");
  assert.equal(rad.metadata.units.hourly, "microgray per hour (uGy/hr)");
  assert.equal(rad.metadata.units.daily, "microgray per day (uGy/day)");
  assert.equal(rad.metadata.total_observations, 43);
});

test("Gale RAD contains exactly 43 nominal observations synchronized with spacecraft clock", () => {
  const observations = getRadObservations();
  assert.equal(observations.length, 43);

  // First observation starts at SCLK 406323911, matching REMS start exactly
  assert.equal(observations[0].start_obs_sclk, 406323911);
  assert.equal(observations[0].observation_index, 0);

  // All 43 observations must have nominal QC (00000000)
  for (const obs of observations) {
    assert.equal(obs.qc_status, "00000000");
    assert.notEqual(obs.dose_rate_b_microgray_per_hour, null);
    assert.notEqual(obs.dose_rate_e_microgray_per_hour, null);
    assert.ok(obs.dose_rate_b_microgray_per_hour! > 0);
    assert.ok(obs.dose_rate_e_microgray_per_hour! > 0);
  }
});

test("Gale RAD Detector B (Silicon) dosimetry matches published Hassler et al. 2014 benchmark", () => {
  const statsB = getRadDetectorBStats();
  assert.notEqual(statsB, null);
  assert.equal(statsB!.count, 43);

  // Hassler et al. 2014 Science benchmark for surface silicon: ~210 uGy/day (mean ~8.75 uGy/hr)
  // On Sol 100, Detector B mean is 9.0409 uGy/hr (216.98 uGy/day)
  assert.ok(
    statsB!.mean_microgray_per_hour >= 8.5 && statsB!.mean_microgray_per_hour <= 9.5,
    `Detector B mean rate ${statsB!.mean_microgray_per_hour} out of expected ~9.0 uGy/hr range`
  );
  assert.ok(
    statsB!.mean_microgray_per_day >= 205 && statsB!.mean_microgray_per_day <= 225,
    `Detector B daily rate ${statsB!.mean_microgray_per_day} out of expected ~210-220 uGy/day range`
  );

  // Verify daily conversion is exactly 24 * hourly
  assert.equal(
    Number((statsB!.mean_microgray_per_hour * 24).toFixed(2)),
    Number(statsB!.mean_microgray_per_day.toFixed(2))
  );
});

test("Gale RAD Detector E (Plastic Scintillator) dosimetry matches published benchmark", () => {
  const statsE = getRadDetectorEStats();
  assert.notEqual(statsE, null);
  assert.equal(statsE!.count, 43);

  // Hassler et al. 2014 Science benchmark for surface plastic: ~205 uGy/day (mean ~8.54 uGy/hr)
  // On Sol 100, Detector E mean is 8.7722 uGy/hr (210.53 uGy/day)
  assert.ok(
    statsE!.mean_microgray_per_hour >= 8.2 && statsE!.mean_microgray_per_hour <= 9.2,
    `Detector E mean rate ${statsE!.mean_microgray_per_hour} out of expected ~8.8 uGy/hr range`
  );
  assert.ok(
    statsE!.mean_microgray_per_day >= 200 && statsE!.mean_microgray_per_day <= 220,
    `Detector E daily rate ${statsE!.mean_microgray_per_day} out of expected ~205-215 uGy/day range`
  );
});

test("Gale RAD series maintains strict physical units and does not fabricate equivalent dose (Sv)", () => {
  const series = getRadDoseSeries();
  assert.equal(series.length, 43);

  for (const pt of series) {
    // Check that values are in microgray, not microsieverts or raw counts
    assert.ok(pt.doseRateB_uGy_hr! > 5 && pt.doseRateB_uGy_hr! < 30);
    assert.ok(pt.doseRateE_uGy_hr! > 5 && pt.doseRateE_uGy_hr! < 30);
  }
});
