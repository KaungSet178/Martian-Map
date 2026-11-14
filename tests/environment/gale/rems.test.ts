import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getGaleSol100Weather,
  getDiurnalTemperatureSeries,
  getDiurnalPressureSeries,
  getDiurnalUvSeries,
  getDiurnalWindSeries,
  getWeatherSolSummary,
} from "@/lib/environment/gale/rems-data";

test("Gale REMS weather dataset verifies authentic PDS4 provenance and Sol 100 metadata", () => {
  const dataset = getGaleSol100Weather();
  assert.equal(dataset.metadata.regionId, "gale");
  assert.equal(dataset.metadata.mission, "MSL Curiosity");
  assert.equal(dataset.metadata.sol, 100);
  assert.equal(dataset.metadata.solar_longitude_ls_deg, 208.57);
  assert.equal(dataset.metadata.martian_year, 31);
  assert.equal(dataset.metadata.product_id, "RME_406323911RMD01000000000_______P9");
  assert.equal(dataset.metadata.pds4_bundle, "urn:nasa:pds:msl_rems");
  assert.equal(dataset.metadata.start_sclk, 406323911);
  assert.equal(dataset.metadata.total_calibrated_records, 35344);
});

test("Gale REMS diurnal cycle covers 24 hourly bins with authentic temperatures", () => {
  const dataset = getGaleSol100Weather();
  assert.equal(dataset.hourly_observations.length, 24);

  const { air, ground } = getDiurnalTemperatureSeries();
  assert.equal(air.length, 24);
  assert.equal(ground.length, 24);

  // All hours should have valid air temperature observations on Sol 100
  for (const pt of air) {
    assert.notEqual(pt.value, null, `Hour ${pt.hour} must have valid air temperature`);
    assert.ok(pt.value! >= -75 && pt.value! <= 10, `Air temp ${pt.value}°C out of realistic bounds`);
  }

  // Check diurnal low at dawn (05:00) and peak in afternoon (14:00)
  const dawnAir = air.find((pt) => pt.hour === 5);
  const aftAir = air.find((pt) => pt.hour === 14);
  assert.ok(dawnAir!.value! < -60, `Dawn air temp should be below -60°C, got ${dawnAir!.value}`);
  assert.ok(aftAir!.value! > -15, `Afternoon air temp should peak above -15°C, got ${aftAir!.value}`);

  // Ground temperature warms above freezing at solar noon (12:00-13:00)
  const noonGround = ground.find((pt) => pt.hour === 12);
  assert.ok(noonGround!.value! > 0, `Solar noon ground temp should exceed 0°C, got ${noonGround!.value}`);
});

test("Gale REMS atmospheric pressure displays authentic diurnal thermal tide", () => {
  const summary = getWeatherSolSummary();
  assert.ok(summary.pressure_hpa.min !== null);
  assert.ok(summary.pressure_hpa.max !== null);
  assert.ok(summary.pressure_hpa.diurnal_amplitude_hpa !== null);

  // Surface pressure should range between ~7.7 and ~8.7 hPa
  assert.ok(summary.pressure_hpa.min >= 7.6 && summary.pressure_hpa.min <= 7.8);
  assert.ok(summary.pressure_hpa.max >= 8.5 && summary.pressure_hpa.max <= 8.8);
  assert.ok(summary.pressure_hpa.diurnal_amplitude_hpa >= 0.8 && summary.pressure_hpa.diurnal_amplitude_hpa <= 1.1);

  const pressureSeries = getDiurnalPressureSeries();
  assert.equal(pressureSeries.length, 24);
  for (const pt of pressureSeries) {
    assert.notEqual(pt.value, null);
    assert.ok(pt.value! >= 7.5 && pt.value! <= 8.8);
  }
});

test("Gale REMS solar UV irradiance is 0 at night and peaks at solar noon", () => {
  const uvSeries = getDiurnalUvSeries();
  assert.equal(uvSeries.length, 24);

  // Night hours (00:00 to 04:00 LTST) must be near 0
  const nightPt = uvSeries.find((pt) => pt.hour === 2);
  assert.ok(nightPt!.value! <= 0.05, `Night UV should be zero, got ${nightPt!.value}`);

  // Solar noon hour (12:00 LTST) should peak above 10 W/m^2
  const noonPt = uvSeries.find((pt) => pt.hour === 12);
  assert.ok(noonPt!.value! > 10, `Noon UV should exceed 10 W/m^2, got ${noonPt!.value}`);
});

test("Gale REMS wind preserves sparse observations and never invents synthetic zeros", () => {
  const summary = getWeatherSolSummary();
  // Valid wind speed records must be exactly 36 (0.1% coverage) due to Boom 1 wire damage
  assert.equal(summary.wind_speed_m_s.valid_samples, 36);
  assert.ok(summary.wind_speed_m_s.sensor_limitation_note.includes("Boom 1"));

  const windSeries = getDiurnalWindSeries();
  assert.equal(windSeries.length, 24);

  // The majority of hours must have null (not 0.0) wind speed
  const nullHours = windSeries.filter((pt) => pt.value === null);
  assert.ok(nullHours.length >= 15, `Expected >=15 hours with null wind, got ${nullHours.length}`);

  // Hours with valid samples must have positive speed values
  const validHours = windSeries.filter((pt) => pt.value !== null);
  assert.ok(validHours.length > 0);
  for (const pt of validHours) {
    assert.ok(pt.value! >= 0, `Wind speed must be non-negative, got ${pt.value}`);
  }
});
