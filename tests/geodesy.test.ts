/**
 * Unit tests for lib/map/geodesy.ts — Mars spherical geodesy utilities.
 *
 * Expected values are independently derived from spherical geometry formulae.
 * No function outputs were used to "reverse-engineer" expected values.
 *
 * Mars reference radius used throughout: R = 3,396,190 m.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  MARS_RADIUS_M,
  marsDistance,
  marsInitialBearing,
  marsInterpolate,
  marsPathDistance,
  marsResamplePath,
  type MarsCoordinate,
} from "../lib/map/geodesy.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const R = 3_396_190; // metres — must match the module constant

/** Shorthand coordinate constructor. */
function c(latitude: number, longitude_east: number): MarsCoordinate {
  return { latitude, longitude_east };
}

/** Assert approximate equality with relative or absolute tolerance. */
function assertApprox(
  actual: number,
  expected: number,
  relTol = 1e-9,
  absTol = 1e-6,
  msg?: string,
) {
  const diff = Math.abs(actual - expected);
  const ref = Math.max(Math.abs(expected), 1);
  if (diff > Math.max(relTol * ref, absTol)) {
    assert.fail(
      `${msg ?? "assertApprox"}: expected ≈ ${expected}, got ${actual} (diff = ${diff})`,
    );
  }
}

/** Assert coordinate equality within tolerance. */
function assertCoordApprox(
  actual: MarsCoordinate,
  expected: MarsCoordinate,
  tolDeg = 1e-8,
  msg?: string,
) {
  assertApprox(actual.latitude, expected.latitude, 0, tolDeg, `${msg ?? ""} lat`);
  // Handle longitude wrap: 0 ≈ 360
  let dLon = Math.abs(actual.longitude_east - expected.longitude_east);
  if (dLon > 180) dLon = 360 - dLon;
  if (dLon > tolDeg) {
    assert.fail(
      `${msg ?? ""} lon: expected ≈ ${expected.longitude_east}, got ${actual.longitude_east} (diff = ${dLon})`,
    );
  }
}

// ===========================================================================
// 1. MARS_RADIUS_M constant
// ===========================================================================

describe("MARS_RADIUS_M", () => {
  it("equals 3 396 190", () => {
    assert.equal(MARS_RADIUS_M, 3_396_190);
  });
});

// ===========================================================================
// 2. marsDistance
// ===========================================================================

describe("marsDistance", () => {
  // -- Trivial / degenerate cases ------------------------------------------

  it("identical points → 0", () => {
    assert.equal(marsDistance(c(0, 0), c(0, 0)), 0);
    assert.equal(marsDistance(c(-45.3, 137.4), c(-45.3, 137.4)), 0);
  });

  it("north pole to north pole → 0", () => {
    // Longitude is irrelevant at the pole.
    assert.equal(marsDistance(c(90, 0), c(90, 270)), 0);
  });

  // -- Known angular separations -------------------------------------------

  it("1° of latitude at the equator ≈ π/180 × R", () => {
    // Independent: 1° arc on a great circle = R × π/180
    const expected = R * Math.PI / 180; // 59 274.977… m
    const actual = marsDistance(c(0, 0), c(1, 0));
    assertApprox(actual, expected, 1e-10, 0.01, "1° lat");
  });

  it("1° of longitude at the equator ≈ π/180 × R", () => {
    const expected = R * Math.PI / 180;
    const actual = marsDistance(c(0, 0), c(0, 1));
    assertApprox(actual, expected, 1e-10, 0.01, "1° lon at equator");
  });

  it("90° angular separation (pole to equator)", () => {
    // North pole (90, 0) to equator (0, 0): central angle = π/2
    const expected = R * Math.PI / 2; // 5 333 730.… m
    const actual = marsDistance(c(90, 0), c(0, 0));
    assertApprox(actual, expected, 1e-10, 0.1, "quarter circumference");
  });

  it("180° angular separation (pole to pole)", () => {
    // North pole to south pole: central angle = π
    const expected = R * Math.PI; // half circumference
    const actual = marsDistance(c(90, 0), c(-90, 0));
    assertApprox(actual, expected, 1e-10, 0.1, "half circumference");
  });

  // -- Symmetry ------------------------------------------------------------

  it("distance(a, b) === distance(b, a)", () => {
    const a = c(-4.6, 137.4);
    const b = c(18.65, 77.45);
    assert.equal(marsDistance(a, b), marsDistance(b, a));
  });

  // -- Antimeridian (0° / 360° boundary) -----------------------------------

  it("antimeridian crossing: lon 359° to lon 1° ≈ 2° arc at equator", () => {
    // The angular separation in longitude is min(|359-1|, 360-|359-1|) = 2°
    // At the equator this is a great-circle distance = R × 2 × π/180
    const expected = R * 2 * Math.PI / 180;
    const actual = marsDistance(c(0, 359), c(0, 1));
    assertApprox(actual, expected, 1e-10, 0.01, "antimeridian 2° at equator");
  });

  it("antimeridian crossing: lon 0.5° to lon 359.5° ≈ 1° arc at equator", () => {
    const expected = R * 1 * Math.PI / 180;
    const actual = marsDistance(c(0, 0.5), c(0, 359.5));
    assertApprox(actual, expected, 1e-10, 0.01, "antimeridian 1° at equator");
  });

  // -- Longitude independence at the poles ---------------------------------

  it("1° latitude near pole, different longitudes → same result", () => {
    const d1 = marsDistance(c(89, 0), c(90, 0));
    const d2 = marsDistance(c(89, 180), c(90, 45));
    // Both are 1° angular separation from lat 89 to lat 90
    assertApprox(d1, d2, 1e-10, 0.01, "near-pole longitude independence");
  });

  // -- Non-trivial independently computed case -----------------------------

  it("Gale Crater center to Jezero Crater center", () => {
    // Gale: lat ≈ -5.4°, lon ≈ 137.8° E
    // Jezero: lat ≈ 18.38°, lon ≈ 77.58° E
    // Independent haversine calculation:
    //   dLat = 23.78° = 0.41504 rad
    //   dLon = -60.22° = -1.05101 rad
    //   a = sin²(0.20752) + cos(-0.09425)·cos(0.32078)·sin²(-0.52550)
    //     = 0.042242 + 0.99556 × 0.94913 × 0.25148
    //     = 0.042242 + 0.23766 = 0.28039 (approx)
    //   c = 2·asin(√0.28039) = 2·asin(0.52953) = 2 × 0.55797 = 1.11594 rad
    //   d = R × 1.11594 ≈ 3,789,884 m
    // We compute with more precision below:
    const a_ = c(-5.4, 137.8);
    const b_ = c(18.38, 77.58);
    const dLat = (18.38 - (-5.4)) * Math.PI / 180;
    const dLon = (77.58 - 137.8) * Math.PI / 180;
    const lat1 = -5.4 * Math.PI / 180;
    const lat2 = 18.38 * Math.PI / 180;
    const hv =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const expected = R * 2 * Math.asin(Math.sqrt(hv));
    const actual = marsDistance(a_, b_);
    assertApprox(actual, expected, 1e-9, 1, "Gale-Jezero");
  });

  // -- Input validation ----------------------------------------------------

  it("throws on NaN latitude", () => {
    assert.throws(() => marsDistance(c(NaN, 0), c(0, 0)), RangeError);
  });

  it("throws on Infinity longitude", () => {
    assert.throws(() => marsDistance(c(0, 0), c(0, Infinity)), RangeError);
  });

  it("throws on latitude > 90", () => {
    assert.throws(() => marsDistance(c(91, 0), c(0, 0)), RangeError);
  });

  it("throws on latitude < -90", () => {
    assert.throws(() => marsDistance(c(-91, 0), c(0, 0)), RangeError);
  });

  it("throws on longitude < 0", () => {
    assert.throws(() => marsDistance(c(0, -1), c(0, 0)), RangeError);
  });

  it("throws on longitude >= 360", () => {
    assert.throws(() => marsDistance(c(0, 360), c(0, 0)), RangeError);
  });

  it("throws on -Infinity", () => {
    assert.throws(() => marsDistance(c(-Infinity, 0), c(0, 0)), RangeError);
  });
});

// ===========================================================================
// 3. marsInitialBearing
// ===========================================================================

describe("marsInitialBearing", () => {
  it("due north → 0°", () => {
    const b = marsInitialBearing(c(0, 100), c(10, 100));
    assertApprox(b, 0, 0, 1e-6, "due north");
  });

  it("due south → 180°", () => {
    const b = marsInitialBearing(c(10, 100), c(0, 100));
    assertApprox(b, 180, 0, 1e-6, "due south");
  });

  it("due east at equator → 90°", () => {
    const b = marsInitialBearing(c(0, 0), c(0, 1));
    assertApprox(b, 90, 0, 1e-6, "due east");
  });

  it("due west at equator → 270°", () => {
    // Going from lon 1 to lon 0 along the equator
    const b = marsInitialBearing(c(0, 1), c(0, 0));
    assertApprox(b, 270, 0, 1e-6, "due west");
  });

  it("coincident points → NaN", () => {
    assert.ok(Number.isNaN(marsInitialBearing(c(45, 100), c(45, 100))));
  });

  it("antipodal points → NaN", () => {
    // (0, 0) and (0, 180) are antipodal on a sphere
    assert.ok(Number.isNaN(marsInitialBearing(c(0, 0), c(0, 180))));
  });

  it("result is in [0, 360)", () => {
    // Test many different headings
    const cases: [MarsCoordinate, MarsCoordinate][] = [
      [c(0, 0), c(45, 45)],
      [c(0, 0), c(-45, 45)],
      [c(0, 0), c(-45, 315)],
      [c(0, 0), c(45, 315)],
      [c(10, 350), c(20, 5)],
    ];
    for (const [a, b] of cases) {
      const bearing = marsInitialBearing(a, b);
      assert.ok(bearing >= 0 && bearing < 360, `bearing ${bearing} out of [0,360)`);
    }
  });

  it("throws on invalid input", () => {
    assert.throws(() => marsInitialBearing(c(NaN, 0), c(0, 0)), RangeError);
  });
});

// ===========================================================================
// 4. marsInterpolate
// ===========================================================================

describe("marsInterpolate", () => {
  it("t=0 → start point", () => {
    const a = c(-5.4, 137.8);
    const b = c(18.38, 77.58);
    const result = marsInterpolate(a, b, 0);
    assertCoordApprox(result, a, 1e-10, "t=0");
  });

  it("t=1 → end point", () => {
    const a = c(-5.4, 137.8);
    const b = c(18.38, 77.58);
    const result = marsInterpolate(a, b, 1);
    assertCoordApprox(result, b, 1e-10, "t=1");
  });

  it("t=0.5 → midpoint is equidistant from both endpoints", () => {
    const a = c(0, 0);
    const b = c(0, 60);
    const mid = marsInterpolate(a, b, 0.5);
    // Midpoint of (0,0)→(0,60) on the equator should be (0,30)
    assertCoordApprox(mid, c(0, 30), 1e-6, "equatorial midpoint");
  });

  it("midpoint of meridional arc preserves longitude", () => {
    const a = c(0, 100);
    const b = c(60, 100);
    const mid = marsInterpolate(a, b, 0.5);
    assertApprox(mid.latitude, 30, 0, 1e-6, "meridional midpoint lat");
    assertApprox(mid.longitude_east, 100, 0, 1e-6, "meridional midpoint lon");
  });

  it("coincident points → same point for any t", () => {
    const p = c(10, 200);
    assertCoordApprox(marsInterpolate(p, p, 0), p, 1e-10, "coincident t=0");
    assertCoordApprox(marsInterpolate(p, p, 0.5), p, 1e-10, "coincident t=0.5");
    assertCoordApprox(marsInterpolate(p, p, 1), p, 1e-10, "coincident t=1");
  });

  it("result longitude is in [0, 360)", () => {
    // Across the 0°/360° boundary
    const a = c(0, 350);
    const b = c(0, 10);
    const mid = marsInterpolate(a, b, 0.5);
    assert.ok(mid.longitude_east >= 0 && mid.longitude_east < 360);
  });

  it("throws on non-finite t", () => {
    assert.throws(() => marsInterpolate(c(0, 0), c(10, 10), NaN), RangeError);
    assert.throws(() => marsInterpolate(c(0, 0), c(10, 10), Infinity), RangeError);
  });

  it("throws on invalid coordinates", () => {
    assert.throws(() => marsInterpolate(c(100, 0), c(0, 0), 0.5), RangeError);
  });
});

// ===========================================================================
// 5. marsPathDistance
// ===========================================================================

describe("marsPathDistance", () => {
  it("empty array → 0", () => {
    assert.equal(marsPathDistance([]), 0);
  });

  it("single waypoint → 0", () => {
    assert.equal(marsPathDistance([c(10, 20)]), 0);
  });

  it("two waypoints → same as marsDistance", () => {
    const a = c(-5.4, 137.8);
    const b = c(18.38, 77.58);
    assertApprox(
      marsPathDistance([a, b]),
      marsDistance(a, b),
      1e-12,
      0,
      "two waypoints",
    );
  });

  it("three collinear equatorial waypoints = sum of segments", () => {
    // (0,0) → (0,10) → (0,30)
    const pts = [c(0, 0), c(0, 10), c(0, 30)];
    const expected = marsDistance(c(0, 0), c(0, 10)) + marsDistance(c(0, 10), c(0, 30));
    assertApprox(marsPathDistance(pts), expected, 1e-12, 0, "three equatorial");
  });

  it("out-and-back doubles the distance", () => {
    const a = c(10, 100);
    const b = c(20, 110);
    const outAndBack = marsPathDistance([a, b, a]);
    assertApprox(outAndBack, 2 * marsDistance(a, b), 1e-12, 0, "out-and-back");
  });

  it("throws if any waypoint is invalid", () => {
    assert.throws(() => marsPathDistance([c(0, 0), c(0, 400)]), RangeError);
  });
});

// ===========================================================================
// 6. marsResamplePath
// ===========================================================================

describe("marsResamplePath", () => {
  it("preserves first and last waypoint", () => {
    const a = c(0, 0);
    const b = c(0, 10);
    const result = marsResamplePath([a, b], 50_000);
    assertCoordApprox(result[0], a, 1e-10, "first preserved");
    assertCoordApprox(result[result.length - 1], b, 1e-10, "last preserved");
  });

  it("short segment (< step) emits exactly 2 points", () => {
    const a = c(0, 0);
    const b = c(0, 0.001); // ~60 m
    const result = marsResamplePath([a, b], 100_000);
    assert.equal(result.length, 2);
  });

  it("resampled path cumulative distance ≈ original", () => {
    const path = [c(0, 0), c(10, 5), c(20, 10)];
    const originalDist = marsPathDistance(path);
    const resampled = marsResamplePath(path, 50_000);
    const resampledDist = marsPathDistance(resampled);
    // Resampled distance should be within 0.1% of original (both are on
    // the same great-circle arcs).
    assertApprox(resampledDist, originalDist, 0.001, 1, "resampled ≈ original");
  });

  it("more points when step is smaller", () => {
    const path = [c(0, 0), c(0, 10)];
    const coarse = marsResamplePath(path, 200_000);
    const fine = marsResamplePath(path, 50_000);
    assert.ok(fine.length > coarse.length, "finer step → more points");
  });

  it("throws on fewer than 2 waypoints", () => {
    assert.throws(() => marsResamplePath([c(0, 0)], 1000), RangeError);
    assert.throws(() => marsResamplePath([], 1000), RangeError);
  });

  it("throws on non-positive stepMetres", () => {
    assert.throws(() => marsResamplePath([c(0, 0), c(1, 0)], 0), RangeError);
    assert.throws(() => marsResamplePath([c(0, 0), c(1, 0)], -100), RangeError);
  });

  it("throws on non-finite stepMetres", () => {
    assert.throws(() => marsResamplePath([c(0, 0), c(1, 0)], NaN), RangeError);
    assert.throws(
      () => marsResamplePath([c(0, 0), c(1, 0)], Infinity),
      RangeError,
    );
  });

  it("multi-segment path with mixed lengths", () => {
    // One long segment and one short segment
    const path = [c(0, 0), c(0, 10), c(0, 10.001)];
    const step = 100_000;
    const result = marsResamplePath(path, step);
    // First and last must be preserved
    assertCoordApprox(result[0], c(0, 0), 1e-10, "first");
    assertCoordApprox(result[result.length - 1], c(0, 10.001), 1e-6, "last");
    // Must have more than 3 points (the long segment gets subdivided)
    assert.ok(result.length > 3, `expected > 3 points, got ${result.length}`);
  });
});
