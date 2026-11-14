import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  MISSION_INTEGRATION_NOTES,
  alternativesAreComparable,
  diagnoseRouteGeometry,
  parseGaleAlternativesJson,
  parseGaleRoute,
  parseGaleRouteJson,
  summariseMissionRoute,
  toAppCoordinate,
  toAppCoordinates,
  toGeoJsonLineString,
  toSharedRouteResult,
  type GaleRouteResult,
} from "@/lib/routing/gale";

const EXAMPLE_DIR = path.join("data", "routing", "gale", "examples");
const SHORTEST_FILE = path.join(EXAMPLE_DIR, "gale-demo-route-shortest.json");
const LOWER_COST_FILE = path.join(
  EXAMPLE_DIR,
  "gale-demo-route-lower-terrain-cost.json",
);
const ALTERNATIVES_FILE = path.join(EXAMPLE_DIR, "gale-demo-alternatives.json");

const MARS_RADIUS_M = 3_396_190;

function readText(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function readRoute(relativePath: string): GaleRouteResult {
  return parseGaleRouteJson(readText(relativePath));
}

function cloneRoute(route: GaleRouteResult): GaleRouteResult {
  return structuredClone(route);
}

/** Maximum lateral offset of a path from its start-end chord, in metres. */
function maximumCrossTrackMeters(route: GaleRouteResult): number {
  const start = route.coordinates[0];
  const end = route.coordinates[route.coordinates.length - 1];
  const lat0 = ((start[1] + end[1]) / 2) * (Math.PI / 180);
  const toLocal = ([longitude, latitude]: [number, number]): [number, number] => [
    MARS_RADIUS_M * (longitude - start[0]) * (Math.PI / 180) * Math.cos(lat0),
    MARS_RADIUS_M * (latitude - start[1]) * (Math.PI / 180),
  ];
  const a = toLocal(start);
  const b = toLocal(end);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const chord = Math.hypot(dx, dy);
  if (chord === 0) {
    return 0;
  }
  let maximum = 0;
  for (const coordinate of route.coordinates) {
    const point = toLocal(coordinate);
    const offset = Math.abs(
      dx * (point[1] - a[1]) - dy * (point[0] - a[0]),
    ) / chord;
    maximum = Math.max(maximum, offset);
  }
  return maximum;
}

test("committed Gale routes validate and keep evidence states separate", () => {
  for (const file of [SHORTEST_FILE, LOWER_COST_FILE]) {
    const route = readRoute(file);
    assert.equal(route.regionId, "gale");
    assert.equal(route.status, "unverified");
    assert.ok(route.coordinates.length > 2);
    assert.equal(route.sourceDatasetIds.length, 1);
    assert.equal(route.sourceDatasetIds[0], "gale-hrsc-30m");
    assert.equal(route.sourceVerified, true);
    assert.equal(route.processingVerified, true);
    assert.equal(route.registrationVerified, false);
    assert.equal(route.evidence.source.status, "VERIFIED");
    assert.equal(route.evidence.processing.status, "VERIFIED");
    assert.equal(route.evidence.registration.status, "UNVERIFIED");
    assert.equal(route.evidence.hazards.status, "NOT_EVALUATED");
    assert.equal(route.evidence.resource_model.status, "NOT_EVALUATED");
    assert.ok(route.warnings.length >= 5);
    assert.ok(
      route.warnings.some((warning) => /not an astronaut/i.test(warning)),
      "route warnings must state it is not a safety model",
    );
    assert.equal(route.grid.nominalPostingMeters, 30);
    assert.equal(route.grid.datasetId, "gale-hrsc-30m");
    assert.match(route.grid.checksumSha256, /^[0-9a-f]{64}$/);
    assert.equal(route.costModel.name, "gale-terrain-penalty-v1");
    assert.equal(route.algorithm.neighbours, 8);
    assert.equal(route.algorithm.deterministic, true);
  }
});

test("shared adapter preserves [longitude, latitude] order and status", () => {
  const route = readRoute(SHORTEST_FILE);
  const shared = toSharedRouteResult(route);
  assert.equal(shared.regionId, "gale");
  assert.equal(shared.status, "unverified");
  assert.equal(shared.preference, route.preference);
  assert.deepEqual(shared.coordinates, route.coordinates);
  assert.equal(shared.distanceMeters, route.distanceMeters);
  assert.equal(shared.ascentMeters, route.ascentMeters);
  assert.equal(shared.descentMeters, route.descentMeters);
  assert.equal(shared.registrationVerified, false);
  assert.deepEqual(shared.sourceDatasetIds, ["gale-hrsc-30m"]);
  assert.deepEqual(shared.warnings, route.warnings);
  // Coordinates remain east-longitude first, so Gale stays near 137 E.
  assert.ok(shared.coordinates.every(([lon]) => lon > 137 && lon < 138));
  assert.ok(shared.coordinates.every(([, lat]) => lat > -5 && lat < -4));
});

test("app coordinate conversion is explicit and reversible", () => {
  const converted = toAppCoordinate([137.441633, -4.589467]);
  assert.deepEqual(converted, {
    latitude: -4.589467,
    longitude_east: 137.441633,
  });
  const route = readRoute(SHORTEST_FILE);
  const appCoordinates = toAppCoordinates(route.coordinates);
  assert.equal(appCoordinates.length, route.coordinates.length);
  appCoordinates.forEach((coordinate, index) => {
    assert.equal(coordinate.latitude, route.coordinates[index][1]);
    assert.equal(coordinate.longitude_east, route.coordinates[index][0]);
  });
});

test("mission summary makes the terrain-graph distance authoritative", () => {
  const route = readRoute(SHORTEST_FILE);
  const summary = summariseMissionRoute(route);

  assert.equal(summary.regionId, "gale");
  assert.equal(summary.routeId, route.routeId);
  assert.equal(summary.status, "unverified");
  assert.equal(summary.integration.distanceSource, "terrain-graph");
  assert.equal(summary.integration.straightLineMustNotRemainAuthoritative, true);
  assert.equal(
    summary.integration.authoritativeDistanceMeters,
    route.distanceMeters,
  );
  assert.notEqual(
    summary.integration.authoritativeDistanceMeters,
    summary.integration.straightLineDistanceMeters,
  );
  assert.ok(
    summary.integration.authoritativeDistanceMeters !== null &&
      summary.integration.straightLineDistanceMeters !== null &&
      summary.integration.authoritativeDistanceMeters >
        summary.integration.straightLineDistanceMeters,
  );
  assert.deepEqual(summary.integration.geometry, route.coordinates);

  assert.equal(summary.legs.length, route.segments.length);
  const legDistance = summary.legs.reduce(
    (total, leg) => total + (leg.distanceMeters ?? 0),
    0,
  );
  assert.ok(Math.abs(legDistance - (route.distanceMeters ?? 0)) < 1e-6);

  assert.equal(summary.waypoints.length, route.requestedWaypoints.length);
  summary.waypoints.forEach((waypoint, index) => {
    assert.equal(waypoint.index, index);
    assert.ok(waypoint.snapDistanceMeters !== null);
    assert.ok(
      waypoint.snapDistanceMeters >= 0 && waypoint.snapDistanceMeters <= 100,
      "committed routes must not snap beyond the default 100 m bound",
    );
    assert.ok(waypoint.snapReason.length > 0);
    assert.ok(waypoint.appCoordinate !== null);
  });
  assert.equal(summary.waypoints[0].role, "start");
  assert.equal(
    summary.waypoints[summary.waypoints.length - 1].role,
    "destination",
  );

  assert.equal(summary.evidence.registration, "UNVERIFIED");
  assert.equal(summary.terrainModel.datasetId, "gale-hrsc-30m");
  assert.equal(summary.terrainModel.nominalPostingMeters, 30);
  assert.ok(summary.terrainModel.validAreaKm2 > 100);
});

test("mission summary does not substitute straight-line distance when unavailable", () => {
  const route = cloneRoute(readRoute(SHORTEST_FILE));
  route.status = "unavailable";
  route.coordinates = [];
  route.distanceMeters = null;
  route.ascentMeters = null;
  route.descentMeters = null;

  const summary = summariseMissionRoute(route);
  assert.equal(summary.integration.distanceSource, "unavailable");
  assert.equal(summary.integration.authoritativeDistanceMeters, null);
  assert.equal(summary.integration.ascentMeters, null);
  assert.equal(summary.integration.descentMeters, null);
  assert.deepEqual(summary.integration.geometry, []);
  // The independent straight-line diagnostic stays visible but is not offered
  // as an authoritative substitute.
  assert.equal(
    summary.integration.straightLineMustNotRemainAuthoritative,
    true,
  );
});

test("geometry diagnostics confirm segment continuity and coverage on real data", () => {
  const routes: Array<[string, GaleRouteResult]> = [
    ["shortest route", readRoute(SHORTEST_FILE)],
    ["lower-terrain-cost route", readRoute(LOWER_COST_FILE)],
  ];
  const alternatives = parseGaleAlternativesJson(readText(ALTERNATIVES_FILE));
  routes.push(
    ["alternatives shortest", alternatives.alternatives.shortest],
    [
      "alternatives lower-terrain-cost",
      alternatives.alternatives["lower-terrain-cost"],
    ],
  );

  for (const [label, route] of routes) {
    const diagnostics = diagnoseRouteGeometry(route);
    assert.equal(diagnostics.issues.length, 0, `${label}: ${diagnostics.issues}`);
    assert.equal(diagnostics.coordinateCountMatchesSamples, true, label);
    assert.equal(diagnostics.geometryMatchesSegments, true, label);
    assert.equal(diagnostics.endpointsMatchSnappedWaypoints, true, label);
    assert.equal(diagnostics.segmentChainContinuous, true, label);
    assert.equal(diagnostics.waypointOrderPreserved, true, label);
    assert.equal(diagnostics.segmentDistanceSumMatchesRoute, true, label);
    assert.equal(diagnostics.routeInsideDatasetExtent, true, label);
  }
});

test("real routes are graph detours, not straight-line connections", () => {
  for (const file of [SHORTEST_FILE, LOWER_COST_FILE]) {
    const route = readRoute(file);
    assert.ok(route.distanceMeters !== null);
    assert.ok(route.straightLineDistanceMeters !== null);
    assert.ok(route.detourRatio !== null);
    assert.ok(
      route.detourRatio > 1.02,
      `expected a measurable grid detour, got ${route.detourRatio}`,
    );
    const crossTrack = maximumCrossTrackMeters(route);
    assert.ok(
      crossTrack > 100,
      `expected terrain-driven lateral offset, got ${crossTrack.toFixed(1)} m`,
    );
    // At least one consecutive pair must differ in both axes, proving a
    // multi-cell graph path rather than a two-point line.
    const multiAxisSteps = route.coordinates.filter(
      (coordinate, index) =>
        index > 0 &&
        coordinate[0] !== route.coordinates[index - 1][0] &&
        coordinate[1] !== route.coordinates[index - 1][1],
    ).length;
    assert.ok(multiAxisSteps > 0);
  }
});

test("alternatives are genuine and compared honestly", () => {
  const alternatives = parseGaleAlternativesJson(readText(ALTERNATIVES_FILE));
  assert.equal(alternatives.regionId, "gale");
  assert.equal(alternatives.datasetId, "gale-hrsc-30m");
  assert.equal(alternativesAreComparable(alternatives), true);

  const shortest = alternatives.alternatives.shortest;
  const lower = alternatives.alternatives["lower-terrain-cost"];
  assert.equal(shortest.preference, "shortest");
  assert.equal(lower.preference, "lower-terrain-cost");
  assert.equal(shortest.regionId, "gale");
  assert.equal(lower.regionId, "gale");
  assert.deepEqual(shortest.sourceDatasetIds, lower.sourceDatasetIds);
  assert.equal(shortest.requestedWaypoints.length, 3);
  assert.deepEqual(shortest.requestedWaypoints, lower.requestedWaypoints);
  assert.equal(alternatives.comparison.explanation.length > 20, true);

  if (
    alternatives.comparison.equivalent === false &&
    shortest.coordinates.length > 0 &&
    lower.coordinates.length > 0
  ) {
    assert.notDeepEqual(shortest.coordinates, lower.coordinates);
  }
  if (
    shortest.distanceMeters !== null &&
    lower.distanceMeters !== null &&
    alternatives.comparison.distanceDeltaMeters !== null
  ) {
    const delta =
      lower.distanceMeters - shortest.distanceMeters;
    assert.ok(
      Math.abs(delta - alternatives.comparison.distanceDeltaMeters) < 1e-6,
    );
  }
  assert.equal(alternatives.comparison.equivalent, false);
});

test("validation rejects invalid coordinates, statuses, and malformed JSON", () => {
  const base = cloneRoute(readRoute(SHORTEST_FILE));

  assert.throws(() =>
    parseGaleRoute({ ...base, status: "safe" }),
  );
  assert.throws(() =>
    parseGaleRoute({
      ...base,
      coordinates: [[400, -4.5]],
    }),
  );
  assert.throws(() =>
    parseGaleRoute({
      ...base,
      coordinates: [[-4.5, 137.4]],
    }),
  );
  assert.throws(() =>
    parseGaleRoute({
      ...base,
      coordinates: [[137.4, -100]],
    }),
  );
  assert.throws(() =>
    parseGaleRoute({
      ...base,
      warnings: [],
    }),
  );
  assert.throws(() =>
    parseGaleRoute({
      ...base,
      registrationVerified: true,
    }),
  );
  assert.throws(() => parseGaleRouteJson("{not json"));
  assert.throws(() => parseGaleRouteJson("null"));

  const valid = parseGaleRoute(base);
  assert.equal(valid.routeId, base.routeId);
});

test("GeoJSON conversion keeps longitude-latitude order", () => {
  const route = readRoute(SHORTEST_FILE);
  const line = toGeoJsonLineString(route);
  assert.equal(line.type, "LineString");
  assert.deepEqual(line.coordinates, route.coordinates);
});

test("mission integration notes require terrain distance and shared resources", () => {
  const notes = MISSION_INTEGRATION_NOTES.join("\n");
  assert.match(notes, /terrain-aware path length/i);
  assert.match(notes, /straight-line distance authoritative/i);
  assert.match(notes, /oxygen, battery/i);
  assert.match(notes, /unverified/i);
  assert.match(notes, /failed segment/i);
});

test("parsing is deterministic", () => {
  const pathToRoute = SHORTEST_FILE;
  const first = readRoute(pathToRoute);
  const second = readRoute(pathToRoute);
  assert.deepEqual(first, second);
  assert.equal(
    JSON.stringify(toSharedRouteResult(first)),
    JSON.stringify(toSharedRouteResult(second)),
  );
});
