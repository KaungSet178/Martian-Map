import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  fromDisplayCoordinates,
  isCoordinateWithinExtent,
  buildTrajectoryGeoJSON,
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
});
