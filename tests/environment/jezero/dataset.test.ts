import assert from "node:assert/strict";
import { test } from "node:test";
import { jezeroEnvironmentalDataset, validateDataset } from "@/lib/environment/jezero/dataset";

const dataset = jezeroEnvironmentalDataset;

test("dataset is structurally consistent and Jezero-only", () => {
  const result = validateDataset(dataset);
  assert.deepEqual(result.problems, []);
  assert.equal(result.ok, true);
  assert.equal(dataset.regionId, "jezero");
  assert.equal(dataset.instrument, "MEDA");
  assert.equal(dataset.mission, "Mars 2020 Perseverance");
  assert.ok(dataset.series.length > 0);
  for (const series of dataset.series) {
    assert.equal(series.regionId, "jezero");
  }
});

test("product identity is preserved as the original PDS product id", () => {
  const tokens = new Set([
    "CAL_ATS",
    "CAL_TIRS",
    "CAL_RDS",
    "DER_PS",
    "DER_RHS",
    "DER_WS",
  ]);
  for (const series of dataset.series) {
    assert.match(series.productId, /^WE__\d{4}_+[A-Z_]+_+P\d{2}$/);
    const token = /^WE__\d{4}_+([A-Z_]+?)_+P\d{2}$/.exec(series.productId)?.[1];
    assert.ok(token, `cannot read product token from ${series.productId}`);
    assert.ok(tokens.has(token), `unexpected product token in ${series.productId} (${token})`);
    assert.match(series.sourceUrl, /^https:\/\/atmos\.nmsu\.edu\/PDS\/data\/PDS4\/Mars2020\/mars2020_meda\//);
  }
});

test("every series maps to a documented source column and physical unit", () => {
  const expected: Record<string, { quantity: string; unit: string }> = {
    PRESSURE: { quantity: "surface_pressure", unit: "Pa" },
    LOCAL_RELATIVE_HUMIDITY: { quantity: "relative_humidity", unit: "%" },
    HORIZONTAL_WIND_SPEED: { quantity: "horizontal_wind_speed", unit: "m/s" },
    WIND_DIRECTION: { quantity: "wind_direction", unit: "degree" },
    GROUND_TEMP: { quantity: "ground_brightness_temperature", unit: "K" },
    UPWARD_SW_IRRADIANCE: { quantity: "upward_shortwave_irradiance", unit: "W/m²" },
    RDS_TOP_7: { quantity: "photodiode_radiance_fov_integrated", unit: "W/m²" },
  };

  for (const series of dataset.series) {
    if (series.variableId.startsWith("ATS_LOCAL_TEMP")) {
      assert.equal(series.physicalQuantity, "air_temperature");
      assert.equal(series.unit, "K");
      continue;
    }
    const spec = expected[series.variableId];
    assert.ok(spec, `unexpected variable ${series.variableId}`);
    assert.equal(series.physicalQuantity, spec.quantity);
    assert.equal(series.unit, spec.unit);
  }
});

test("air temperature keeps five ATS detectors separate", () => {
  for (const sol of dataset.displayWindow.solSelection) {
    const ats = dataset.series.filter(
      (series) => series.sol === sol && series.physicalQuantity === "air_temperature",
    );
    assert.equal(ats.length, 5, `sol ${sol} should expose five ATS detectors`);
    assert.deepEqual(
      ats.map((series) => series.variableId).sort(),
      [
        "ATS_LOCAL_TEMP1",
        "ATS_LOCAL_TEMP2",
        "ATS_LOCAL_TEMP3",
        "ATS_LOCAL_TEMP4",
        "ATS_LOCAL_TEMP5",
      ],
    );
    assert.equal(new Set(ats.map((series) => series.displayName)).size, 5);
  }
});

test("TIRS ground temperature is a brightness temperature, not kinetic", () => {
  const ground = dataset.series.filter(
    (series) => series.physicalQuantity === "ground_brightness_temperature",
  );
  assert.ok(ground.length > 0);
  for (const series of ground) {
    assert.equal(series.variableId, "GROUND_TEMP");
    assert.equal(series.unit, "K");
    assert.match(series.band ?? "", /8-14/);
    assert.doesNotMatch(series.displayName.toLowerCase(), /kinetic/);
  }
});

test("wind series are valid, non-sentinel, and direction is bounded", () => {
  const wind = dataset.series.filter((series) =>
    ["HORIZONTAL_WIND_SPEED", "WIND_DIRECTION"].includes(series.variableId),
  );
  assert.ok(wind.length > 0);
  for (const series of wind) {
    if (series.variableId === "WIND_DIRECTION") {
      assert.match(series.aggregation.method, /circular/);
    } else {
      assert.equal(series.aggregation.method, "arithmetic mean");
    }
    for (const point of series.points) {
      assert.notEqual(point.v, 999_999_999);
      assert.ok(point.v !== null && point.v >= 0);
      if (series.variableId === "WIND_DIRECTION") {
        assert.ok(point.v >= 0 && point.v < 360, `direction ${point.v} out of range`);
      } else {
        assert.ok(point.v < 100, `implausible wind speed ${point.v}`);
      }
    }
  }
  const directions = dataset.series.filter((series) => series.variableId === "WIND_DIRECTION");
  assert.ok(directions.every((series) => series.aggregation.method.includes("circular")));
});

test("pressure and humidity are physically plausible and never zero-filled", () => {
  const pressure = dataset.series.filter((series) => series.variableId === "PRESSURE");
  const humidity = dataset.series.filter(
    (series) => series.variableId === "LOCAL_RELATIVE_HUMIDITY",
  );
  assert.ok(pressure.length > 0);
  for (const series of pressure) {
    for (const point of series.points) {
      assert.ok(point.v !== null && point.v > 500 && point.v < 1200);
    }
  }
  for (const series of humidity) {
    for (const point of series.points) {
      assert.ok(point.v !== null && point.v >= 0 && point.v <= 110);
    }
  }
});

test("bins are ten-minute LMST means with no interpolation", () => {
  for (const series of dataset.series) {
    assert.equal(series.timeBasis, "LMST");
    assert.equal(series.aggregation.binSeconds, 600);
    assert.equal(series.aggregation.interpolated, false);
    assert.ok(series.points.length <= 144);
    let previous = -1;
    for (const point of series.points) {
      assert.equal(point.t % 600, 0, "bin start is not aligned to ten minutes");
      assert.ok(point.t >= 0 && point.t < 86_400);
      assert.ok(point.t > previous, "bin times are not strictly increasing");
      assert.ok(point.n >= 1);
      previous = point.t;
    }
    const native = series.points.reduce((sum, point) => sum + point.n, 0);
    assert.equal(native, series.summary.validSamples);
    assert.ok(series.summary.excludedSamples >= 0);
  }
});

test("sol metadata comes from the PDS label and covers every parsed sol", () => {
  assert.deepEqual(
    dataset.sols.map((entry) => entry.sol),
    dataset.displayWindow.solSelection,
  );
  for (const entry of dataset.sols) {
    assert.ok(entry.startLsDeg !== null && entry.startLsDeg >= 0 && entry.startLsDeg < 360);
    assert.match(entry.startUtc ?? "", /^\d{4}-\d{2}-\d{2}T/);
    for (const product of entry.products) {
      assert.match(product.version, /^\d+\.\d+$/);
      assert.match(product.csvSha256, /^[0-9a-f]{64}$/);
      assert.ok(product.records > 0);
      assert.ok(["calibrated", "derived"].some((level) => product.processingLevel.toLowerCase().includes(level)));
    }
  }
});

test("solar/UV quantities are radiance channels, never ionizing dose", () => {
  const quantities = new Set(dataset.series.map((series) => series.physicalQuantity));
  assert.ok(quantities.has("upward_shortwave_irradiance"));
  assert.ok(quantities.has("photodiode_radiance_fov_integrated"));
  for (const quantity of quantities) {
    assert.doesNotMatch(quantity, /dose|dose_rate|equivalent|gcr|sep/i);
  }
  const ionizing = dataset.availability.find(
    (entry) => entry.quantity === "ionizing_radiation_dose",
  );
  assert.equal(ionizing?.status, "unavailable");
  assert.match(ionizing?.reason ?? "", /never converted|not converted/i);
  const dust = dataset.availability.find((entry) => entry.quantity === "dust_optical_depth");
  assert.equal(dust?.status, "unavailable");
});
