/**
 * Unit tests for `lib/mission/waypoint-planning.ts` — Geometric Waypoint Planning Foundation.
 *
 * Verifies pure waypoint management, immutable updates, deterministic trajectory
 * generation, segment and total distance sums, one-way/round-trip constraints,
 * coordinate provenance, and serialization.
 *
 * All distance benchmarks reuse verified M1 Mars geodesy calculations (R = 3,396,190 m).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  createWaypoint,
  createWaypointFromTarget,
  createWaypointPlan,
  addWaypoint,
  removeWaypoint,
  updateWaypoint,
  reorderWaypoints,
  moveWaypoint,
  setOrigin,
  setDestination,
  setTrajectoryMode,
  validateWaypointPlan,
  generateGeometricTrajectory,
  calculateDistanceSummary,
  resampleTrajectory,
  serializeWaypointPlan,
  deserializeWaypointPlan,
  GEOMETRIC_TRAJECTORY_LABEL,
  type MarsWaypoint,
  type WaypointPlan,
} from "../lib/mission/waypoint-planning.js";
import type { Target } from "../lib/contracts/science.js";

// ---------------------------------------------------------------------------
// Helpers & Test Data
// ---------------------------------------------------------------------------

function wp(
  id: string,
  latitude: number,
  longitude_east: number,
  role: MarsWaypoint["role"] = "intermediate",
  label?: string,
): MarsWaypoint {
  return createWaypoint({
    id,
    coordinates: { latitude, longitude_east },
    role,
    label,
  });
}

function assertApprox(
  actual: number,
  expected: number,
  tolerance = 1e-4,
  msg?: string,
) {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    assert.fail(
      `${msg ?? "assertApprox"}: expected ≈ ${expected}, got ${actual} (diff = ${diff})`,
    );
  }
}

// ===========================================================================
// 1. Waypoint Creation & Provenance
// ===========================================================================

describe("Waypoint Creation & Provenance", () => {
  it("creates a user-defined waypoint with default provenance", () => {
    const w = wp("wp-base", -4.5, 137.4, "base", "Bradbury Landing Base Camp");
    assert.equal(w.id, "wp-base");
    assert.equal(w.coordinates.latitude, -4.5);
    assert.equal(w.coordinates.longitude_east, 137.4);
    assert.equal(w.role, "base");
    assert.equal(w.label, "Bradbury Landing Base Camp");
    assert.equal(w.provenance, "user_planning_input");
  });

  it("throws on invalid coordinates (latitude out of range)", () => {
    assert.throws(
      () => wp("bad-lat", 95.0, 100),
      /invalid_type|too_big|too_small|Number must be/,
    );
  });

  it("throws on invalid coordinates (longitude out of range)", () => {
    assert.throws(
      () => wp("bad-lon", 0, 360),
      /invalid_type|too_big|too_small|Number must be/,
    );
    assert.throws(
      () => wp("bad-lon-neg", 0, -1),
      /invalid_type|too_big|too_small|Number must be/,
    );
  });

  it("creates a waypoint from a verified Target record", () => {
    const mockTarget: Target = {
      id: "gale-target-yellowknife",
      region_id: "gale",
      title: "Yellowknife Bay Mudstone Outcrop",
      description: "Fine-grained sedimentary rock investigated for ancient habitability",
      scientific_goal: "Sample smectite clay minerals",
      geological_significance: "Lacustrine mudstone unit",
      priority_category: "primary_science",
      coordinates: { latitude: -4.59, longitude_east: 137.44 },
      coordinate_reference: {
        body: "Mars",
        latitude_type: "planetocentric",
        longitude_direction: "east",
        longitude_range: "0-360",
      },
      coordinate_verified: true,
      source_ids: ["source-msl-pds"],
      activity: "drill_sample",
      evidence: "Observed",
      verification: "verified",
      routing_eligibility: { status: "available", reason: "Audited feature" },
    };

    const w = createWaypointFromTarget(mockTarget, "science_stop");
    assert.equal(w.id, "wp-gale-target-yellowknife");
    assert.equal(w.coordinates.latitude, -4.59);
    assert.equal(w.coordinates.longitude_east, 137.44);
    assert.equal(w.role, "science_stop");
    assert.equal(w.provenance, "verified_science_target");
    assert.equal(w.target_id, "gale-target-yellowknife");
    assert.equal(w.label, "Yellowknife Bay Mudstone Outcrop");
    assert.equal(w.notes, "Sample smectite clay minerals");
  });

  it("throws when attempting to create waypoint from unverified or null-coordinate target", () => {
    const unverifiedTarget: Target = {
      id: "gale-unverified-area",
      region_id: "gale",
      title: "Candidate Dune Field",
      description: "Unreviewed region",
      scientific_goal: "Explore ripples",
      geological_significance: null,
      priority_category: "secondary",
      coordinates: null,
      coordinate_reference: {
        body: "Mars",
        latitude_type: "planetocentric",
        longitude_direction: "east",
        longitude_range: "0-360",
      },
      coordinate_verified: false,
      source_ids: ["source-pds"],
      activity: "reconnaissance",
      evidence: "Unavailable",
      verification: "pending",
      routing_eligibility: { status: "unavailable", reason: "Coordinates unverified" },
    };

    assert.throws(
      () => createWaypointFromTarget(unverifiedTarget),
      /coordinates are null or unassigned/,
    );
  });
});

// ===========================================================================
// 2. Pure Immutable Plan Management Functions
// ===========================================================================

describe("Pure Immutable Plan Management", () => {
  const w1 = wp("wp-1", -4.5, 137.4, "base", "Base Camp");
  const w2 = wp("wp-2", -4.6, 137.45, "science_stop", "Stop 1");
  const w3 = wp("wp-3", -4.7, 137.5, "science_stop", "Stop 2");

  it("initializes a clean default plan", () => {
    const plan = createWaypointPlan({ name: "Gale Crater EVA-01", region_id: "gale" });
    assert.equal(plan.name, "Gale Crater EVA-01");
    assert.equal(plan.region_id, "gale");
    assert.equal(plan.mode, "round_trip");
    assert.equal(plan.waypoints.length, 0);
  });

  it("addWaypoint appends and preserves immutability", () => {
    const plan0 = createWaypointPlan();
    const plan1 = addWaypoint(plan0, w1);
    const plan2 = addWaypoint(plan1, w2);

    assert.equal(plan0.waypoints.length, 0);
    assert.equal(plan1.waypoints.length, 1);
    assert.equal(plan2.waypoints.length, 2);
    assert.equal(plan2.waypoints[0].id, "wp-1");
    assert.equal(plan2.waypoints[1].id, "wp-2");
  });

  it("addWaypoint inserts at specified index", () => {
    const plan = createWaypointPlan({ waypoints: [w1, w3] });
    const updated = addWaypoint(plan, w2, 1);
    assert.deepEqual(
      updated.waypoints.map((w) => w.id),
      ["wp-1", "wp-2", "wp-3"],
    );
  });

  it("addWaypoint rejects duplicate waypoint IDs", () => {
    const plan = createWaypointPlan({ waypoints: [w1] });
    assert.throws(
      () => addWaypoint(plan, w1),
      /already exists in plan/,
    );
  });

  it("removeWaypoint removes stop and preserves immutability", () => {
    const plan = createWaypointPlan({ waypoints: [w1, w2, w3] });
    const after = removeWaypoint(plan, "wp-2");

    assert.equal(plan.waypoints.length, 3);
    assert.deepEqual(
      after.waypoints.map((w) => w.id),
      ["wp-1", "wp-3"],
    );
  });

  it("removeWaypoint throws if waypoint ID is not found", () => {
    const plan = createWaypointPlan({ waypoints: [w1] });
    assert.throws(
      () => removeWaypoint(plan, "non-existent-id"),
      /not found in plan/,
    );
  });

  it("updateWaypoint updates attributes immutably", () => {
    const plan = createWaypointPlan({ waypoints: [w1, w2] });
    const updated = updateWaypoint(plan, "wp-2", {
      label: "Updated Stop 1",
      notes: "Prioritize mineral spectroscopy",
    });

    assert.equal(plan.waypoints[1].label, "Stop 1");
    assert.equal(updated.waypoints[1].label, "Updated Stop 1");
    assert.equal(updated.waypoints[1].notes, "Prioritize mineral spectroscopy");
    assert.equal(updated.waypoints[1].id, "wp-2"); // ID immutable
  });

  it("updateWaypoint throws if waypoint ID is not found", () => {
    const plan = createWaypointPlan({ waypoints: [w1] });
    assert.throws(
      () => updateWaypoint(plan, "non-existent", { label: "Test" }),
      /not found in plan/,
    );
  });

  it("reorderWaypoints applies exact permutation", () => {
    const plan = createWaypointPlan({ waypoints: [w1, w2, w3] });
    const reordered = reorderWaypoints(plan, ["wp-3", "wp-1", "wp-2"]);

    assert.deepEqual(
      reordered.waypoints.map((w) => w.id),
      ["wp-3", "wp-1", "wp-2"],
    );
    // Original unchanged
    assert.deepEqual(
      plan.waypoints.map((w) => w.id),
      ["wp-1", "wp-2", "wp-3"],
    );
  });

  it("reorderWaypoints throws on length mismatch or unknown IDs", () => {
    const plan = createWaypointPlan({ waypoints: [w1, w2, w3] });
    assert.throws(
      () => reorderWaypoints(plan, ["wp-1", "wp-2"]),
      /Reordering failed: received 2 IDs, expected 3/,
    );
    assert.throws(
      () => reorderWaypoints(plan, ["wp-1", "wp-2", "wp-unknown"]),
      /does not exist in plan/,
    );
  });

  it("moveWaypoint shifts stop position by delta", () => {
    const plan = createWaypointPlan({ waypoints: [w1, w2, w3] });
    const movedDown = moveWaypoint(plan, "wp-1", 1);
    assert.deepEqual(
      movedDown.waypoints.map((w) => w.id),
      ["wp-2", "wp-1", "wp-3"],
    );

    const movedUp = moveWaypoint(movedDown, "wp-3", -2);
    assert.deepEqual(
      movedUp.waypoints.map((w) => w.id),
      ["wp-3", "wp-2", "wp-1"],
    );

    // Out of bounds shift returns unchanged plan
    const oob = moveWaypoint(plan, "wp-1", -1);
    assert.equal(oob, plan);
  });

  it("setOrigin designates base and places at index 0", () => {
    const plan = createWaypointPlan({ waypoints: [w2, w3] });
    const withBase = setOrigin(plan, w1);
    assert.equal(withBase.waypoints[0].id, "wp-1");
    assert.equal(withBase.waypoints[0].role, "base");

    // Setting origin using an existing ID promotes it to index 0
    const reOrigin = setOrigin(withBase, "wp-3");
    assert.equal(reOrigin.waypoints[0].id, "wp-3");
    assert.equal(reOrigin.waypoints[0].role, "base");
  });

  it("setDestination sets destination at last index", () => {
    const wDest = wp("wp-dest", -4.8, 137.6, "destination", "Recovery Site");
    const plan = createWaypointPlan({ waypoints: [w1, w2] });
    const withDest = setDestination(plan, wDest);

    assert.equal(withDest.waypoints[withDest.waypoints.length - 1].id, "wp-dest");
    assert.equal(withDest.waypoints[withDest.waypoints.length - 1].role, "destination");

    // Clear destination
    const cleared = setDestination(withDest, null);
    assert.equal(cleared.waypoints[cleared.waypoints.length - 1].role, "intermediate");
  });

  it("setTrajectoryMode updates mode and recovery context", () => {
    const plan = createWaypointPlan();
    const oneWay = setTrajectoryMode(
      plan,
      "one_way",
      "Pressurized rover rendezvous at Recovery Point Zulu",
    );
    assert.equal(oneWay.mode, "one_way");
    assert.equal(
      oneWay.recovery_assumption,
      "Pressurized rover rendezvous at Recovery Point Zulu",
    );
  });
});

// ===========================================================================
// 3. Plan Validation Rules
// ===========================================================================

describe("Plan Validation Rules", () => {
  it("rejects empty plan", () => {
    const plan = createWaypointPlan();
    const res = validateWaypointPlan(plan);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.code === "EMPTY_PLAN"));
  });

  it("detects duplicate waypoint IDs", () => {
    // Construct raw plan with duplicate ID to bypass addWaypoint guard
    const plan: WaypointPlan = {
      schema_version: 1,
      id: "plan-dup",
      name: "Duplicate Plan",
      mode: "round_trip",
      waypoints: [
        wp("wp-1", 0, 0, "base"),
        wp("wp-1", 0, 10, "science_stop"),
      ],
    };
    const res = validateWaypointPlan(plan);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.code === "DUPLICATE_WAYPOINT_ID"));
  });

  it("warns when first waypoint is not marked role=base", () => {
    const plan = createWaypointPlan({
      waypoints: [
        wp("wp-1", 0, 0, "science_stop"),
        wp("wp-2", 0, 10, "science_stop"),
      ],
    });
    const res = validateWaypointPlan(plan);
    assert.ok(res.warnings.some((w) => w.code === "MISSING_ORIGIN"));
  });

  it("enforces one-way mode constraints: destination role & recovery assumption", () => {
    // One way without destination or recovery assumption
    const plan = createWaypointPlan({
      mode: "one_way",
      waypoints: [
        wp("wp-base", 0, 0, "base"),
        wp("wp-mid", 0, 5, "science_stop"),
      ],
      recovery_assumption: "",
    });

    const res = validateWaypointPlan(plan);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.code === "MISSING_DESTINATION"));
    assert.ok(res.errors.some((e) => e.code === "MISSING_RECOVERY_ASSUMPTION"));

    // Provide proper destination and recovery assumption
    const validOneWay = setDestination(
      setTrajectoryMode(plan, "one_way", "Lander egress at recovery site"),
      wp("wp-dest", 0, 10, "destination"),
    );

    const validRes = validateWaypointPlan(validOneWay);
    assert.equal(validRes.valid, true);
  });

  it("warns on consecutive coincident waypoints", () => {
    const plan = createWaypointPlan({
      waypoints: [
        wp("wp-1", 10, 20, "base"),
        wp("wp-2", 10, 20, "science_stop"), // Same coords
      ],
    });
    const res = validateWaypointPlan(plan);
    assert.ok(res.warnings.some((w) => w.code === "COINCIDENT_CONSECUTIVE_WAYPOINTS"));
  });
});

// ===========================================================================
// 4. Trajectory Generation & Geometric Calculations
// ===========================================================================

describe("Trajectory Generation & Distance Metrics", () => {
  it("generates empty trajectory for empty plan", () => {
    const plan = createWaypointPlan();
    const traj = generateGeometricTrajectory(plan);
    assert.equal(traj.segments.length, 0);
    assert.equal(traj.total_surface_distance_m, 0);
    assert.equal(traj.scientific_label, GEOMETRIC_TRAJECTORY_LABEL);
  });

  it("generates 0 segments for single-waypoint plan", () => {
    const plan = createWaypointPlan({ waypoints: [wp("base", 0, 0, "base")] });
    const traj = generateGeometricTrajectory(plan);
    assert.equal(traj.segments.length, 0);
    assert.equal(traj.total_surface_distance_m, 0);
  });

  it("calculates one-way trajectory segment and distance accurately", () => {
    // 1° latitude at equator: M1 benchmark = 59,274.6975 m
    const plan = createWaypointPlan({
      mode: "one_way",
      recovery_assumption: "Rendezvous at Stop 2",
      waypoints: [
        wp("w1", 0, 0, "base"),
        wp("w2", 1, 0, "destination"),
      ],
    });

    const traj = generateGeometricTrajectory(plan);
    assert.equal(traj.segments.length, 1);
    assert.equal(traj.segments[0].is_return_segment, false);
    assert.equal(traj.segments[0].from_waypoint_id, "w1");
    assert.equal(traj.segments[0].to_waypoint_id, "w2");

    // Exact M1 benchmark verification
    assertApprox(
      traj.segments[0].surface_distance_m,
      59_274.6975,
      1e-4,
      "1° latitude segment distance",
    );
    assertApprox(
      traj.total_surface_distance_m,
      59_274.6975,
      1e-4,
      "Total distance matches segment distance",
    );

    // Initial bearing due North = 0°
    assertApprox(traj.segments[0].initial_bearing_deg, 0, 1e-6, "Bearing due north");
  });

  it("calculates round-trip trajectory with return closure leg", () => {
    // 2 waypoints round trip: W1 -> W2 -> W1
    // Leg 1: (0, 0) to (1, 0) = 59,274.6975 m
    // Leg 2 (return): (1, 0) to (0, 0) = 59,274.6975 m
    // Total = 118,549.3950 m
    const plan = createWaypointPlan({
      mode: "round_trip",
      waypoints: [
        wp("w1", 0, 0, "base"),
        wp("w2", 1, 0, "science_stop"),
      ],
    });

    const traj = generateGeometricTrajectory(plan);
    assert.equal(traj.segments.length, 2);
    assert.equal(traj.segments[0].is_return_segment, false);
    assert.equal(traj.segments[1].is_return_segment, true);
    assert.equal(traj.segments[1].from_waypoint_id, "w2");
    assert.equal(traj.segments[1].to_waypoint_id, "w1");

    assertApprox(traj.segments[0].surface_distance_m, 59_274.6975, 1e-4);
    assertApprox(traj.segments[1].surface_distance_m, 59_274.6975, 1e-4);
    assertApprox(traj.total_surface_distance_m, 118_549.3950, 1e-4, "Round trip total");

    // Return bearing from (1, 0) to (0, 0) is due South = 180°
    assertApprox(traj.segments[1].initial_bearing_deg, 180, 1e-6, "Return bearing due south");

    // Trajectory waypoints include closure at end: [w1, w2, w1]
    assert.deepEqual(traj.ordered_waypoint_ids, ["w1", "w2", "w1"]);
  });

  it("verifies multi-waypoint loop: total distance strictly equals sum of segments", () => {
    // Triangular traverse on Mars:
    // A: (0, 0) -> B: (1, 0) -> C: (1, 1) -> A: (0, 0)
    const plan = createWaypointPlan({
      mode: "round_trip",
      waypoints: [
        wp("A", 0, 0, "base"),
        wp("B", 1, 0, "science_stop"),
        wp("C", 1, 1, "science_stop"),
      ],
    });

    const traj = generateGeometricTrajectory(plan);
    assert.equal(traj.segments.length, 3);

    const seg0 = traj.segments[0].surface_distance_m;
    const seg1 = traj.segments[1].surface_distance_m;
    const seg2 = traj.segments[2].surface_distance_m;
    const sum = seg0 + seg1 + seg2;

    assertApprox(traj.total_surface_distance_m, sum, 1e-9, "Exact additive identity");

    const summary = calculateDistanceSummary(traj);
    assert.equal(summary.segment_count, 3);
    assert.equal(summary.waypoint_count, 4); // [A, B, C, A]
    assert.equal(summary.is_closed_loop, true);
    assertApprox(summary.outbound_distance_m, seg0 + seg1, 1e-9);
    assertApprox(summary.return_distance_m, seg2, 1e-9);
    assertApprox(summary.total_surface_distance_m, sum, 1e-9);
  });

  it("handles antimeridian crossing across 0° / 360° boundary", () => {
    // 359° E to 1° E on equator = 2° arc = 118,549.3950 m
    const plan = createWaypointPlan({
      mode: "one_way",
      recovery_assumption: "Base pickup",
      waypoints: [
        wp("w-west", 0, 359, "base"),
        wp("w-east", 0, 1, "destination"),
      ],
    });

    const traj = generateGeometricTrajectory(plan);
    assert.equal(traj.segments.length, 1);
    assertApprox(
      traj.segments[0].surface_distance_m,
      118_549.3950,
      1e-4,
      "Antimeridian crossing distance",
    );
    // Heading due East = 90°
    assertApprox(traj.segments[0].initial_bearing_deg, 90, 1e-6);
  });

  it("resamples geometric trajectory preserving start and end points", () => {
    const plan = createWaypointPlan({
      mode: "round_trip",
      waypoints: [
        wp("A", 0, 0, "base"),
        wp("B", 1, 0, "science_stop"), // ~59 km away
      ],
    });

    const traj = generateGeometricTrajectory(plan);
    const resampled = resampleTrajectory(traj, 20_000); // 20 km steps

    // Round trip loop has start at (0,0) and ends at (0,0)
    assertApprox(resampled[0].latitude, 0, 1e-6);
    assertApprox(resampled[0].longitude_east, 0, 1e-6);
    assertApprox(resampled[resampled.length - 1].latitude, 0, 1e-6);
    assertApprox(resampled[resampled.length - 1].longitude_east, 0, 1e-6);

    // Number of points should be greater than original 3 vertices
    assert.ok(resampled.length >= 6);
  });
});

// ===========================================================================
// 5. Stable Serialization & Deserialization
// ===========================================================================

describe("Serialization & Schema Integrity", () => {
  it("serializes and deserializes a plan with zero information loss", () => {
    const plan = createWaypointPlan({
      id: "plan-test-01",
      name: "Arc Pass Geologic Traverse",
      region_id: "gale",
      mode: "one_way",
      recovery_assumption: "Curiosity track rendezvous at Marker 14",
      waypoints: [
        wp("w1", -4.5, 137.4, "base", "Bradbury Landing"),
        wp("w2", -4.6, 137.45, "science_stop", "Gale Mudstone"),
        wp("w3", -4.7, 137.5, "destination", "Recovery Point"),
      ],
    });

    const json = serializeWaypointPlan(plan);
    assert.equal(typeof json, "string");

    const restored = deserializeWaypointPlan(json);
    assert.deepEqual(restored, plan);
  });

  it("deserializeWaypointPlan throws on invalid JSON or corrupt schema", () => {
    assert.throws(() => deserializeWaypointPlan("invalid json {"), SyntaxError);
    assert.throws(
      () => deserializeWaypointPlan(JSON.stringify({ schema_version: 99 })),
      /invalid_type|invalid_value|invalid_union/,
    );
  });
});
