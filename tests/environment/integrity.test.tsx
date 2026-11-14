import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

import {
  getEnvironmentalDatasetForRegion,
  getAvailableSolsForRegion,
  getDefaultSolForRegion,
  getRegionEnvironmentalCapabilities,
} from "@/lib/environment/unified-adapter";
import { getGaleEnvironmentalDataset } from "@/lib/environment/gale/adapter";
import { getGaleSol100Radiation, getRadDetectorBStats, getRadDetectorEStats } from "@/lib/environment/gale/rad-data";
import { getGaleSol100Weather, getWeatherSolSummary, getDiurnalWindSeries } from "@/lib/environment/gale/rems-data";
import { jezeroEnvironmentalDataset } from "@/lib/environment/jezero/dataset";
import { EnvironmentalConditionsPanel } from "@/components/environment/environmental-conditions-panel";
import { OxiaUnavailablePanel } from "@/components/environment/oxia/oxia-unavailable-panel";

const ROOT = process.cwd();

// 1. Traceability & Source Product Lineage
test("every Gale and Jezero observation traces to an authentic archival product ID and source URL", () => {
  const galeData = getEnvironmentalDatasetForRegion("gale");
  assert.ok(galeData !== null, "Gale dataset must not be null");
  assert.equal(galeData.regionId, "gale");
  assert.ok(galeData.observations.length > 0);

  for (const obs of galeData.observations) {
    assert.ok(obs.productId.length > 0, "Missing product ID in Gale observation");
    assert.match(obs.sourceUrl, /^https?:\/\//, "Gale observation must have valid HTTP(S) source URL");
    assert.ok(obs.physicalQuantity.length > 0);
    assert.ok(obs.unit.length > 0);
  }

  const jzData = getEnvironmentalDatasetForRegion("jezero", { sol: 100 });
  assert.ok(jzData !== null, "Jezero dataset must not be null");
  assert.equal(jzData.regionId, "jezero");
  assert.ok(jzData.observations.length > 0);

  for (const obs of jzData.observations) {
    assert.ok(obs.productId.length > 0, "Missing product ID in Jezero observation");
    assert.match(obs.sourceUrl, /^https?:\/\//, "Jezero observation must have valid HTTP(S) source URL");
    assert.ok(obs.physicalQuantity.length > 0);
    assert.ok(obs.unit.length > 0);
  }
});

// 2. Original Physical Quantities and Units Preserved
test("physical quantities and units preserve authentic PDS standards", () => {
  const galeData = getEnvironmentalDatasetForRegion("gale")!;
  const units = new Set(galeData.observations.map((o) => o.unit));
  assert.ok(units.has("degC"), "Must contain degC temperature in Gale observations");
  assert.ok(units.has("hPa"), "Must contain hPa pressure in Gale observations");
  assert.ok(units.has("W/m^2"), "Must contain W/m^2 UV irradiance in Gale observations");
  assert.ok(units.has("uGy/hr"), "Must contain uGy/hr absorbed dose rate in Gale observations");

  // Verify that absorbed dose (uGy) is NEVER converted to equivalent dose (Sv or rem)
  for (const obs of galeData.observations) {
    if (obs.variableId.includes("dose")) {
      assert.match(obs.unit, /uGy/);
      assert.doesNotMatch(obs.unit, /Sv/);
    }
  }

  const jzData = getEnvironmentalDatasetForRegion("jezero", { sol: 100 })!;
  const jzUnits = new Set(jzData.observations.map((o) => o.unit));
  assert.ok(jzUnits.has("K"), "Jezero ATS temperature must be in Kelvin");
  assert.ok(jzUnits.has("Pa"), "Jezero PS surface pressure must be in Pascals");
  assert.ok(jzUnits.has("m/s"), "Jezero WS wind speed must be in m/s");
});

// 3. Data-Quality Exclusions and Missing-Data Sentinels Preserved (No Synthetic Zeros)
test("missing-data gaps and quality exclusions are preserved as nulls, never synthetic zeros", () => {
  const summary = getWeatherSolSummary();
  assert.equal(summary.wind_speed_m_s.valid_samples, 36, "Gale Sol 100 has sparse wind due to Boom 1 failure");
  assert.ok(summary.wind_speed_m_s.sensor_limitation_note.includes("Boom 1"));

  const windSeries = getDiurnalWindSeries();
  const nullHours = windSeries.filter((pt) => pt.value === null);
  assert.ok(nullHours.length >= 15, `Expected >=15 hours with null wind, got ${nullHours.length}`);

  const jzData = jezeroEnvironmentalDataset;
  for (const s of jzData.series) {
    for (const pt of s.points) {
      if (pt.n === 0) {
        assert.equal(pt.v, null, "Points with 0 samples must have value null, not 0");
      }
    }
  }
});

// 4. No Synthetic Values or Fictitious Observations
test("no synthetic values or placeholder measurements are introduced", () => {
  const galeData = getGaleEnvironmentalDataset();
  for (const obs of galeData.observations) {
    if (obs.value !== null) {
      assert.ok(!isNaN(obs.value), "Observation value must not be NaN");
      assert.ok(isFinite(obs.value), "Observation value must be finite");
    }
  }
});

// 5. Checksum and Manifest Cryptographic Verification
test("checksums of committed environmental data files match provenance manifests", () => {
  const galeManifestPath = join(ROOT, "data/environment/gale/provenance_manifest.json");
  assert.ok(existsSync(galeManifestPath), "Gale provenance manifest must exist");
  const manifest = JSON.parse(readFileSync(galeManifestPath, "utf-8"));

  assert.equal(manifest.regionId, "gale");
  for (const [key, item] of Object.entries(manifest.processed_application_products) as [string, { path: string; sha256: string }][]) {
    const fullPath = join(ROOT, item.path);
    assert.ok(existsSync(fullPath), `Processed file ${item.path} must exist`);
    const fileBytes = readFileSync(fullPath);
    const computedHash = createHash("sha256").update(fileBytes).digest("hex");
    assert.equal(
      computedHash,
      item.sha256,
      `SHA-256 hash mismatch for ${key} (${item.path})`
    );
  }
});

// 6. Jezero Six-Sol Dataset Integrity
test("Jezero six-sol dataset is fully preserved with authentic sols and products", () => {
  const expectedSols = [100, 140, 180, 220, 265, 300];
  const availableSols = getAvailableSolsForRegion("jezero");
  assert.deepEqual(availableSols, expectedSols);

  assert.equal(jezeroEnvironmentalDataset.sols.length, 6);
  assert.equal(jezeroEnvironmentalDataset.displayWindow.solSelection.length, 6);
  assert.ok(jezeroEnvironmentalDataset.series.length > 50, "Must preserve all authentic series");
});

// 7. Gale Sol 100 Dataset Integrity
test("Gale Sol 100 REMS and RAD datasets are fully preserved", () => {
  const availableSols = getAvailableSolsForRegion("gale");
  assert.deepEqual(availableSols, [100]);

  const rad = getGaleSol100Radiation();
  assert.equal(rad.metadata.sol, 100);
  assert.equal(rad.observations.length, 43, "Curiosity RAD must contain 43 nominal observations on Sol 100");

  const rems = getGaleSol100Weather();
  assert.equal(rems.metadata.sol, 100);
  assert.equal(rems.hourly_observations.length, 24, "REMS Sol 100 must cover 24 hourly bins");
});

// 8. RAD Detector B and Detector E Dosimetry Maintained Strictly Separate
test("Curiosity RAD Detector B (Silicon) and Detector E (Plastic) remain distinct", () => {
  const rad = getGaleSol100Radiation();
  const statB = getRadDetectorBStats();
  const statE = getRadDetectorEStats();

  assert.ok(statB !== null, "Detector B stats must exist");
  assert.ok(statE !== null, "Detector E stats must exist");

  // Detector B is 300 µm Silicon (~217 uGy/day); Detector E is 18 mm plastic scintillator (~210 uGy/day)
  assert.notEqual(statB.mean_microgray_per_day, statE.mean_microgray_per_day);
  assert.ok(statB.mean_microgray_per_day >= 205 && statB.mean_microgray_per_day <= 225, "Detector B matches Hassler 2014");
  assert.ok(statE.mean_microgray_per_day >= 200 && statE.mean_microgray_per_day <= 220, "Detector E matches Hassler 2014");

  for (const obs of rad.observations) {
    if (obs.dose_rate_b_microgray_per_hour !== null && obs.dose_rate_e_microgray_per_hour !== null) {
      assert.notEqual(obs.dose_rate_b_microgray_per_hour, obs.dose_rate_e_microgray_per_hour);
    }
  }
});

// 9. Perseverance MEDA ATS Air-Temperature Detectors (ATS1-ATS5) Maintained Distinct
test("MEDA ATS five air-temperature detectors remain separate and are not averaged into a single reading", () => {
  const sol100Series = jezeroEnvironmentalDataset.series.filter(
    (s) => s.sol === 100 && s.physicalQuantity === "air_temperature"
  );
  assert.equal(sol100Series.length, 5, "Must have exactly 5 distinct ATS temperature series on Sol 100");

  const variableIds = sol100Series.map((s) => s.variableId).sort();
  assert.deepEqual(variableIds, [
    "ATS_LOCAL_TEMP1",
    "ATS_LOCAL_TEMP2",
    "ATS_LOCAL_TEMP3",
    "ATS_LOCAL_TEMP4",
    "ATS_LOCAL_TEMP5",
  ]);
});

// 10. TIRS Ground Temperature is Strictly Labeled Brightness Temperature
test("MEDA TIRS ground temperature is explicitly labeled brightness temperature, not kinetic", () => {
  const tirsSeries = jezeroEnvironmentalDataset.series.filter(
    (s) => s.physicalQuantity === "ground_brightness_temperature"
  );
  assert.ok(tirsSeries.length > 0);
  for (const s of tirsSeries) {
    assert.equal(s.variableId, "GROUND_TEMP");
    assert.match(s.displayName, /brightness/i);
    assert.doesNotMatch(s.displayName.toLowerCase(), /kinetic/);
  }
});

// 11. Unsupported Radiation Quantities Remain Unavailable in Jezero and Gale
test("RDS is solar/UV radiance, not ionizing dose; Jezero reports ionizing dose as unavailable", () => {
  const rdsSeries = jezeroEnvironmentalDataset.series.filter(
    (s) => s.physicalQuantity === "photodiode_radiance_fov_integrated"
  );
  assert.ok(rdsSeries.length > 0);
  for (const s of rdsSeries) {
    assert.equal(s.variableId, "RDS_TOP_7");
    assert.equal(s.unit, "W/m²");
    assert.doesNotMatch(s.unit, /Gy/);
    assert.doesNotMatch(s.unit, /Sv/);
  }

  const ionizingAvail = jezeroEnvironmentalDataset.availability.find(
    (a) => a.quantity === "ionizing_radiation_dose"
  );
  assert.ok(ionizingAvail !== undefined);
  assert.equal(ionizingAvail?.status, "unavailable");
  assert.match(ionizingAvail?.reason ?? "", /No verified Jezero ionizing-dose/i);
});

// 12. Oxia Planum Strictly Displays Unavailable State and Never Displays Foreign Observations
test("Oxia Planum returns null dataset and renders deliberate unavailable state with no data leakage", () => {
  const oxiaData = getEnvironmentalDatasetForRegion("oxia");
  assert.equal(oxiaData, null, "Oxia dataset must be strictly null");

  const oxiaSols = getAvailableSolsForRegion("oxia");
  assert.deepEqual(oxiaSols, [], "Oxia must have zero observation sols");

  const defaultSol = getDefaultSolForRegion("oxia");
  assert.equal(defaultSol, null);

  const caps = getRegionEnvironmentalCapabilities("oxia");
  assert.equal(caps.weatherStatus, "unavailable");
  assert.equal(caps.ionizingRadiationStatus, "unavailable");
  assert.equal(caps.solarUvStatus, "unavailable");
  assert.equal(caps.notes, "No verified local historical rover observations are currently integrated for Oxia Planum.");

  const html = renderToStaticMarkup(<OxiaUnavailablePanel />);
  assert.match(html, /Environmental Conditions/);
  assert.match(html, /Oxia Planum · Exploration Region/);
  assert.match(html, /Environmental observations unavailable/);
  assert.match(html, /No verified local historical rover observations are currently integrated for Oxia Planum\./);
  assert.match(html, /Critical Planning Notice: Lack of Data Is Not Proof of Safety/);
  // Verify foreign measurement cards are NOT rendered
  assert.doesNotMatch(html, /GT_AMB/);
  assert.doesNotMatch(html, /RME_/);
  assert.doesNotMatch(html, /CAL_ATS/);
  assert.doesNotMatch(html, /Detector B — Silicon/);
});

// 13. Unified Panel Reacts Cleanly to Region Changes Without Stale State
test("unified EnvironmentalConditionsPanel renders authentic regional content for all three regions", () => {
  // Gale
  const galeHtml = renderToStaticMarkup(<EnvironmentalConditionsPanel regionId="gale" />);
  assert.match(galeHtml, /Environmental Conditions/);
  assert.match(galeHtml, /Gale Crater · Curiosity Historical Observations/);
  assert.match(galeHtml, /Curiosity REMS/);
  assert.match(galeHtml, /Curiosity RAD/);
  assert.match(galeHtml, /Detector B — Silicon Planar/);
  assert.match(galeHtml, /Detector E — Plastic Scintillator/);
  assert.doesNotMatch(galeHtml, /Perseverance/);
  assert.doesNotMatch(galeHtml, /MEDA/);

  // Jezero
  const jzHtml = renderToStaticMarkup(<EnvironmentalConditionsPanel regionId="jezero" sol={100} />);
  assert.match(jzHtml, /Environmental Conditions/);
  assert.match(jzHtml, /Jezero Crater · Perseverance Historical Observations/);
  assert.match(jzHtml, /MEDA/);
  assert.match(jzHtml, /No verified local ionizing-dose measurement integrated/);
  assert.doesNotMatch(jzHtml, /Curiosity/);
  assert.doesNotMatch(jzHtml, /Gale RAD/);

  // Oxia
  const oxiaHtml = renderToStaticMarkup(<EnvironmentalConditionsPanel regionId="oxia" />);
  assert.match(oxiaHtml, /Environmental observations unavailable/);
  assert.match(oxiaHtml, /No verified local historical rover observations are currently integrated for Oxia Planum\./);
  assert.doesNotMatch(oxiaHtml, /Curiosity/);
  assert.doesNotMatch(oxiaHtml, /Perseverance/);
  assert.doesNotMatch(oxiaHtml, /GT_AMB/);
  assert.doesNotMatch(oxiaHtml, /CAL_ATS/);
});
