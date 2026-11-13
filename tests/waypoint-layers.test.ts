import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  fromDisplayCoordinates,
  isCoordinateWithinExtent,
  buildTrajectoryGeoJSON,
  densifyTrajectorySegment,
  DEFAULT_MAX_STEP_METERS,
  MAX_SEGMENT_INTERPOLATION_STEPS,
} from "@/lib/map/waypoint-layers";
import {
  createWaypoint,
  createWaypointPlan,
  addWaypoint,
  GEOMETRIC_TRAJECTORY_LABEL,
} from "@/lib/mission/waypoint-planning";

describe("fromDisplayCoordinates", () => {
  test("converts standard coordinates to Mars planetocentric and East-positive", () => {
    const pt1 = fromDisplayCoordinates({ lng: 0, lat: 0 });
    assert.equal(pt1.latitude, 0);
    assert.equal(pt1.longitude_east, 0);

    const pt2 = fromDisplayCoordinates({ lng: 137.401, lat: -4.701 });
    assert.equal(pt2.latitude, -4.701);
    assert.equal(pt2.longitude_east, 137.401);

    // Negative longitude (west of prime meridian in MapLibre)
    const pt3 = fromDisplayCoordinates({ lng: -10, lat: 25.5 });
    assert.equal(pt3.latitude, 25.5);
    assert.equal(pt3.longitude_east, 350);

    // Array form
    const pt4 = fromDisplayCoordinates([-180, 0]);
    assert.equal(pt4.longitude_east, 180);
  });

  test("handles multi-world and negative longitude wrapping", () => {
    const pt1 = fromDisplayCoordinates({ lng: 370, lat: 10 });
    assert.equal(pt1.longitude_east, 10);

    const pt2 = fromDisplayCoordinates({ lng: -370, lat: -10 });
    assert.equal(pt2.longitude_east, 350);

    const pt3 = fromDisplayCoordinates({ lng: -0.0000001, lat: 0 });
    assert.ok(pt3.longitude_east >= 0 && pt3.longitude_east < 360);
  });

  test("clamps extreme latitudes to [-90, 90]", () => {
    const pt1 = fromDisplayCoordinates({ lng: 100, lat: 95 });
    assert.equal(pt1.latitude, 90);

    const pt2 = fromDisplayCoordinates({ lng: 100, lat: -95 });
    assert.equal(pt2.latitude, -90);
  });

  test("throws on non-finite inputs", () => {
    assert.throws(
      () => fromDisplayCoordinates({ lng: NaN, lat: 0 }),
      TypeError,
    );
    assert.throws(
      () => fromDisplayCoordinates({ lng: 0, lat: Infinity }),
      TypeError,
    );
  });
});

describe("isCoordinateWithinExtent", () => {
  const galeExtent = {
    west_east: 137.344235,
    east_east: 137.457943,
    south_latitude: -4.822361,
    north_latitude: -4.580605,
  };

  test("returns true for coordinates strictly inside Gale extent", () => {
    assert.equal(
      isCoordinateWithinExtent(
        { latitude: -4.701, longitude_east: 137.401 },
        galeExtent,
      ),
      true,
    );
    // Boundary checks
    assert.equal(
      isCoordinateWithinExtent(
        { latitude: -4.822361, longitude_east: 137.344235 },
        galeExtent,
      ),
      true,
    );
  });

  test("returns false for coordinates outside extent in any direction", () => {
    // Too far north
    assert.equal(
      isCoordinateWithinExtent(
        { latitude: -4.5, longitude_east: 137.401 },
        galeExtent,
      ),
      false,
    );
    // Too far south
    assert.equal(
      isCoordinateWithinExtent(
        { latitude: -4.9, longitude_east: 137.401 },
        galeExtent,
      ),
      false,
    );
    // Too far west
    assert.equal(
      isCoordinateWithinExtent(
        { latitude: -4.701, longitude_east: 137.3 },
        galeExtent,
      ),
      false,
    );
    // Too far east
    assert.equal(
      isCoordinateWithinExtent(
        { latitude: -4.701, longitude_east: 137.5 },
        galeExtent,
      ),
      false,
    );
  });

  test("returns false when extent is null or undefined", () => {
    assert.equal(
      isCoordinateWithinExtent(
        { latitude: -4.701, longitude_east: 137.401 },
        null,
      ),
      false,
    );
    assert.equal(
      isCoordinateWithinExtent(
        { latitude: -4.701, longitude_east: 137.401 },
        undefined,
      ),
      false,
    );
  });

  test("handles extents that cross the 360/0 degree antimeridian", () => {
    const wrapExtent = {
      west_east: 355,
      east_east: 5,
      south_latitude: -10,
      north_latitude: 10,
    };

    assert.equal(
      isCoordinateWithinExtent(
        { latitude: 0, longitude_east: 358 },
        wrapExtent,
      ),
      true,
    );
    assert.equal(
      isCoordinateWithinExtent(
        { latitude: 0, longitude_east: 2 },
        wrapExtent,
      ),
      true,
    );
    assert.equal(
      isCoordinateWithinExtent(
        { latitude: 0, longitude_east: 180 },
        wrapExtent,
      ),
      false,
    );
  });
});

describe("buildTrajectoryGeoJSON", () => {
  test("returns empty FeatureCollection when plan has < 2 waypoints", () => {
    const emptyPlan = createWaypointPlan({ name: "Empty", region_id: "gale" });
    const geojson0 = buildTrajectoryGeoJSON(emptyPlan);
    assert.equal(geojson0.features.length, 0);

    const singleWpPlan = addWaypoint(
      emptyPlan,
      createWaypoint({
        id: "wp-base",
        coordinates: { latitude: -4.7, longitude_east: 137.4 },
        role: "base",
        label: "Base",
        provenance: "user_planning_input",
      }),
    );
    const geojson1 = buildTrajectoryGeoJSON(singleWpPlan);
    assert.equal(geojson1.features.length, 0);
  });

  test("builds outbound and return LineString features with scientific metadata", () => {
    const wp1 = createWaypoint({
      id: "wp-1",
      coordinates: { latitude: -4.7, longitude_east: 137.4 },
      role: "base",
      label: "Base Camp",
      provenance: "user_planning_input",
    });
    const wp2 = createWaypoint({
      id: "wp-2",
      coordinates: { latitude: -4.72, longitude_east: 137.42 },
      role: "intermediate",
      label: "Turn Point 1",
      provenance: "user_planning_input",
    });
    const wp3 = createWaypoint({
      id: "wp-3",
      coordinates: { latitude: -4.74, longitude_east: 137.44 },
      role: "destination",
      label: "Destination",
      provenance: "user_planning_input",
    });

    // 1. One-way plan
    let plan = createWaypointPlan({
      name: "One-Way Traverse",
      region_id: "gale",
      mode: "one_way",
      recovery_assumption: "Rendezvous rover pickup",
    });
    plan = addWaypoint(plan, wp1);
    plan = addWaypoint(plan, wp2);
    plan = addWaypoint(plan, wp3);

    const oneWayGeojson = buildTrajectoryGeoJSON(plan);
    assert.equal(oneWayGeojson.features.length, 2);
    assert.ok(oneWayGeojson.features.every((f) => f.properties?.kind === "outbound"));
    assert.equal(
      oneWayGeojson.features[0].properties?.disclaimer,
      GEOMETRIC_TRAJECTORY_LABEL,
    );

    // 2. Round-trip plan
    const roundTripPlan = {
      ...plan,
      mode: "round_trip" as const,
      recovery_assumption: undefined,
    };
    const roundTripGeojson = buildTrajectoryGeoJSON(roundTripPlan);
    // Should have 2 outbound segments and 1 return segment
    assert.equal(roundTripGeojson.features.length, 3);
    const outbound = roundTripGeojson.features.filter(
      (f) => f.properties?.kind === "outbound",
    );
    const returnLeg = roundTripGeojson.features.filter(
      (f) => f.properties?.kind === "return",
    );
    assert.equal(outbound.length, 2);
    assert.equal(returnLeg.length, 1);
    assert.equal(returnLeg[0].properties?.to_id, "wp-1");
  });

  test("segment isolation: an unsupported long segment does not hide valid segments", () => {
    // Gale Crater to distant point (segment 2 is >150 km, exceeding limit), then back to nearby
    const wp1 = createWaypoint({
      id: "wp-valid-1",
      coordinates: { latitude: -4.7, longitude_east: 137.4 },
      role: "base",
      provenance: "user_planning_input",
    });
    const wp2 = createWaypoint({
      id: "wp-valid-2",
      coordinates: { latitude: -4.72, longitude_east: 137.42 }, // ~2.5 km from wp1
      role: "intermediate",
      provenance: "user_planning_input",
    });
    const wp3 = createWaypoint({
      id: "wp-long-3",
      coordinates: { latitude: -1.0, longitude_east: 137.42 }, // ~220 km from wp2 (exceeds 1000 steps at 100m)
      role: "intermediate",
      provenance: "user_planning_input",
    });
    const wp4 = createWaypoint({
      id: "wp-valid-4",
      coordinates: { latitude: -1.02, longitude_east: 137.42 }, // ~1.2 km from wp3
      role: "destination",
      provenance: "user_planning_input",
    });

    let plan = createWaypointPlan({
      name: "Mixed Segment Plan",
      region_id: "gale",
      mode: "one_way",
      recovery_assumption: "Rendezvous",
    });
    plan = addWaypoint(plan, wp1);
    plan = addWaypoint(plan, wp2);
    plan = addWaypoint(plan, wp3);
    plan = addWaypoint(plan, wp4);

    const geojson = buildTrajectoryGeoJSON(plan, 100, 1000);

    // Segment 1 (wp1 -> wp2) is ~2.5 km -> supported
    // Segment 2 (wp2 -> wp3) is ~220 km -> unsupported (exceeds 1000 steps)
    // Segment 3 (wp3 -> wp4) is ~1.2 km -> supported
    // Valid segments MUST be rendered!
    assert.equal(geojson.features.length, 2);
    assert.equal(geojson.features[0].properties?.from_id, "wp-valid-1");
    assert.equal(geojson.features[0].properties?.to_id, "wp-valid-2");
    assert.equal(geojson.features[1].properties?.from_id, "wp-long-3");
    assert.equal(geojson.features[1].properties?.to_id, "wp-valid-4");

    // Unsupported segment must be recorded in unsupported_segments with reason
    assert.ok(geojson.unsupported_segments);
    assert.equal(geojson.unsupported_segments.length, 1);
    assert.equal(geojson.unsupported_segments[0].from_id, "wp-valid-2");
    assert.equal(geojson.unsupported_segments[0].to_id, "wp-long-3");
    assert.ok(
      geojson.unsupported_segments[0].reason.includes("exceeding the complexity limit"),
    );
  });
});

describe("densifyTrajectorySegment — Numerical & Geometric Verification", () => {
  const pOrigin = { latitude: 0, longitude_east: 0 };
  const p500m = { latitude: 0.008436, longitude_east: 0 }; // ~500 m due North on Mars (59,274.7 m/deg)
  const p10km = { latitude: 0.168705, longitude_east: 0 }; // ~10,000 m
  const p20km = { latitude: 0.337410, longitude_east: 0 }; // ~20,000 m
  const p50km = { latitude: 0.843526, longitude_east: 0 }; // ~50,000 m
  const p150km = { latitude: 2.530578, longitude_east: 0 }; // ~150,000 m

  test("short segment (< 1 km): preserves exact endpoints and respects <= 100m step length", () => {
    const res = densifyTrajectorySegment(pOrigin, p500m, 500, DEFAULT_MAX_STEP_METERS, MAX_SEGMENT_INTERPOLATION_STEPS);
    assert.equal(res.status, "supported");
    if (res.status === "supported") {
      assert.equal(res.stepCount, 5); // 500 / 100 = 5 steps
      assert.ok(res.stepLengthMeters <= 100);
      assert.equal(res.coordinates.length, 1);
      const coords = res.coordinates[0];
      assert.equal(coords.length, 6); // 5 steps + 1 = 6 vertices

      // Exact endpoints preserved
      assert.equal(coords[0][0], 0);
      assert.equal(coords[0][1], 0);
      assert.equal(coords[coords.length - 1][0], 0);
      assert.equal(coords[coords.length - 1][1], p500m.latitude);
    }
  });

  test("10 km segment: exactly 100 steps, step length <= 100m", () => {
    const res = densifyTrajectorySegment(pOrigin, p10km, 10000, 100, 1000);
    assert.equal(res.status, "supported");
    if (res.status === "supported") {
      assert.equal(res.stepCount, 100);
      assert.ok(res.stepLengthMeters <= 100);
      const coords = res.coordinates[0];
      assert.equal(coords.length, 101);
      assert.equal(coords[0][1], 0);
      assert.equal(coords[coords.length - 1][1], p10km.latitude);
    }
  });

  test("20 km segment: 200 steps, step length <= 100m (not clamped to 100 steps)", () => {
    const res = densifyTrajectorySegment(pOrigin, p20km, 20000, 100, 1000);
    assert.equal(res.status, "supported");
    if (res.status === "supported") {
      // Must have 200 steps to satisfy <= 100m requirement!
      assert.equal(res.stepCount, 200);
      assert.ok(res.stepLengthMeters <= 100);
      assert.equal(res.stepLengthMeters, 100);
      const coords = res.coordinates[0];
      assert.equal(coords.length, 201);
      assert.equal(coords[0][1], 0);
      assert.equal(coords[coords.length - 1][1], p20km.latitude);
    }
  });

  test("50 km segment within 1000-step limit: 500 steps, status=supported", () => {
    const res = densifyTrajectorySegment(pOrigin, p50km, 50000, 100, 1000);
    assert.equal(res.status, "supported");
    if (res.status === "supported") {
      assert.equal(res.stepCount, 500);
      assert.ok(res.stepLengthMeters <= 100);
    }
  });

  test("longer segment (150 km) exceeding 1000 steps: returns explicit unsupported result", () => {
    const res = densifyTrajectorySegment(pOrigin, p150km, 150000, 100, 1000);
    assert.equal(res.status, "unsupported");
    if (res.status === "unsupported") {
      assert.equal(res.requiredSteps, 1500);
      assert.equal(res.maxSteps, 1000);
      assert.ok(res.reason.includes("exceeding the complexity limit"));
      assert.ok(res.reason.includes("1500"));
    }
  });

  test("custom complexity limit enforcement (20 km with maxSteps=100 returns unsupported)", () => {
    const res = densifyTrajectorySegment(pOrigin, p20km, 20000, 100, 100);
    assert.equal(res.status, "unsupported");
    if (res.status === "unsupported") {
      assert.equal(res.requiredSteps, 200);
      assert.equal(res.maxSteps, 100);
    }
  });

  test("antimeridian crossing segment: splits into multiple LineString vertex sets", () => {
    const westOfSeam = { latitude: 0, longitude_east: 179.9 };
    const eastOfSeam = { latitude: 0, longitude_east: 180.1 };
    // Distance across 0.2° arc at equator is ~11.85 km
    const res = densifyTrajectorySegment(westOfSeam, eastOfSeam, 11855, 100, 1000);
    assert.equal(res.status, "supported");
    if (res.status === "supported") {
      // Must split into 2 subsegments to avoid horizontal cord across map
      assert.equal(res.coordinates.length, 2);
      assert.ok(res.coordinates[0].length >= 2);
      assert.ok(res.coordinates[1].length >= 2);
    }
  });
});
