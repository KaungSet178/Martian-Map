/**
 * Gale terrain-aware routing adapter.
 *
 * This module is the Gale-specific boundary between the Python routing engine
 * output and the future shared mission contract.  It performs three jobs:
 *
 * 1. Validate real route JSON against the mirrored Gale schema.
 * 2. Convert the extended regional result into the minimum shared
 *    `RouteResult` shape, plus a mission-integration summary.
 * 3. Check route geometry against its own segments and declared coverage
 *    without repairing, smoothing, or inventing anything.
 *
 * The shared contract file is intentionally not modified in this branch.
 * Coordinates remain `[longitude_east, latitude_planetocentric]` throughout;
 * conversion to the app's `{ latitude, longitude_east }` form is explicit.
 */

import {
  galeRouteAlternativesSchema,
  galeRouteResultSchema,
  type GaleRouteAlternatives,
  type GaleRoutePreference,
  type GaleRouteResult,
  type GaleRouteSegment,
  type GaleRouteStatus,
  type SharedRouteResultShape,
} from "./types";

export type AppCoordinate = {
  latitude: number;
  longitude_east: number;
};

export type RouteLeg = {
  segmentId: string;
  fromWaypointIndex: number;
  toWaypointIndex: number;
  status: "computed" | "unavailable";
  coordinates: [number, number][];
  distanceMeters: number | null;
  ascentMeters: number | null;
  descentMeters: number | null;
  maximumSlopeDegrees: number | null;
  meanSlopeDegrees: number | null;
  straightLineDistanceMeters: number | null;
  detourRatio: number | null;
};

export type MissionWaypoint = {
  index: number;
  role: "start" | "via" | "destination";
  requested: [number, number];
  snapped: [number, number] | null;
  snapDistanceMeters: number | null;
  snapReason: string;
  appCoordinate: AppCoordinate | null;
};

export type MissionRouteSummary = {
  regionId: "gale";
  routeId: string | null;
  requestId: string;
  status: GaleRouteStatus;
  preference: GaleRoutePreference;
  distanceMeters: number | null;
  ascentMeters: number | null;
  descentMeters: number | null;
  maximumSlopeDegrees: number | null;
  meanSlopeDegrees: number | null;
  straightLineDistanceMeters: number | null;
  detourRatio: number | null;
  totalTerrainCostMeters: number | null;
  legs: RouteLeg[];
  waypoints: MissionWaypoint[];
  sourceDatasetIds: string[];
  sourceVerified: boolean;
  processingVerified: boolean;
  registrationVerified: boolean;
  evidence: {
    source: string;
    processing: string;
    registration: string;
    hazards: string;
    resourceModel: string;
  };
  terrainModel: {
    datasetId: string;
    nominalPostingMeters: number | null;
    slopeDerivative: string;
    crs: string;
    verticalDatum: string;
    nodata: number | null;
    checksumSha256: string;
    validAreaKm2: number;
    validRouteCells: number;
  };
  warnings: string[];
  integration: {
    /**
     * The distance the mission timeline/resource engines should use once they
     * consume terrain-aware routing. Never silently fall back to straight-line
     * geometry when this is null.
     */
    authoritativeDistanceMeters: number | null;
    distanceSource: "terrain-graph" | "unavailable";
    straightLineDistanceMeters: number | null;
    straightLineMustNotRemainAuthoritative: true;
    ascentMeters: number | null;
    descentMeters: number | null;
    geometry: [number, number][];
  };
};

export type GeometryDiagnostics = {
  coordinateCount: number;
  declaredSampleCount: number;
  segmentCoordinateCount: number;
  coordinateCountMatchesSamples: boolean;
  geometryMatchesSegments: boolean;
  endpointsMatchSnappedWaypoints: boolean;
  segmentChainContinuous: boolean;
  waypointOrderPreserved: boolean;
  segmentDistanceSumMatchesRoute: boolean;
  routeInsideDatasetExtent: boolean;
  issues: string[];
};

export class GaleRouteValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`invalid Gale route payload: ${issues.join("; ")}`);
    this.name = "GaleRouteValidationError";
    this.issues = issues;
  }
}

function formatZodIssues(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "<root>";
    return `${path}: ${issue.message}`;
  });
}

/** Parse and validate one Gale route result object. */
export function parseGaleRoute(value: unknown): GaleRouteResult {
  const parsed = galeRouteResultSchema.safeParse(value);
  if (!parsed.success) {
    throw new GaleRouteValidationError(formatZodIssues(parsed.error));
  }
  return parsed.data;
}

/** Parse and validate one Gale route result JSON document. */
export function parseGaleRouteJson(text: string): GaleRouteResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new GaleRouteValidationError([
      `not valid JSON: ${(error as Error).message}`,
    ]);
  }
  return parseGaleRoute(value);
}

/** Parse and validate a shortest/lower-cost alternatives document. */
export function parseGaleAlternatives(value: unknown): GaleRouteAlternatives {
  const parsed = galeRouteAlternativesSchema.safeParse(value);
  if (!parsed.success) {
    throw new GaleRouteValidationError(formatZodIssues(parsed.error));
  }
  return parsed.data;
}

/** Parse and validate an alternatives JSON document. */
export function parseGaleAlternativesJson(text: string): GaleRouteAlternatives {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new GaleRouteValidationError([
      `not valid JSON: ${(error as Error).message}`,
    ]);
  }
  return parseGaleAlternatives(value);
}

/** Convert `[longitude_east, latitude]` into the app's object convention. */
export function toAppCoordinate(
  coordinate: readonly [number, number],
): AppCoordinate {
  const [longitude_east, latitude] = coordinate;
  return { latitude, longitude_east };
}

/** Convert a full route path into app coordinates, preserving order. */
export function toAppCoordinates(
  coordinates: ReadonlyArray<readonly [number, number]>,
): AppCoordinate[] {
  return coordinates.map(toAppCoordinate);
}

/**
 * Project a route to the minimum shared `RouteResult` shape.
 *
 * Extended Gale details stay available in the original `GaleRouteResult`.
 */
export function toSharedRouteResult(
  route: GaleRouteResult,
): SharedRouteResultShape {
  return {
    regionId: "gale",
    status: route.status,
    preference: route.preference,
    coordinates: route.coordinates.map(
      ([longitude, latitude]) => [longitude, latitude],
    ),
    distanceMeters: route.distanceMeters,
    ascentMeters: route.ascentMeters,
    descentMeters: route.descentMeters,
    maximumSlopeDegrees: route.maximumSlopeDegrees,
    meanSlopeDegrees: route.meanSlopeDegrees,
    sourceDatasetIds: [...route.sourceDatasetIds],
    sourceVerified: route.sourceVerified,
    processingVerified: route.processingVerified,
    registrationVerified: route.registrationVerified,
    warnings: [...route.warnings],
  };
}

/**
 * Summarise one route for the mission timeline and resource-budget engines.
 *
 * The summary explicitly marks the terrain-graph distance as authoritative
 * when a path exists, and carries `null` rather than a straight-line substitute
 * when it does not.
 */
export function summariseMissionRoute(
  route: GaleRouteResult,
): MissionRouteSummary {
  const available =
    route.status !== "unavailable" && route.coordinates.length >= 2;

  const legs: RouteLeg[] = route.segments.map((segment) => ({
    segmentId: segment.segmentId,
    fromWaypointIndex: segment.fromWaypointIndex,
    toWaypointIndex: segment.toWaypointIndex,
    status: segment.status,
    coordinates: segment.coordinates.map(
      ([longitude, latitude]) => [longitude, latitude],
    ),
    distanceMeters: segment.distanceMeters,
    ascentMeters: segment.ascentMeters,
    descentMeters: segment.descentMeters,
    maximumSlopeDegrees: segment.maximumSlopeDegrees,
    meanSlopeDegrees: segment.meanSlopeDegrees,
    straightLineDistanceMeters: segment.straightLineDistanceMeters,
    detourRatio: segment.detourRatio,
  }));

  const waypoints: MissionWaypoint[] = route.waypoints.map((waypoint) => ({
    index: waypoint.index,
    role: waypoint.role,
    requested: [
      waypoint.requested[0],
      waypoint.requested[1],
    ],
    snapped:
      waypoint.snapped === null
        ? null
        : [waypoint.snapped[0], waypoint.snapped[1]],
    snapDistanceMeters: waypoint.snapDistanceMeters,
    snapReason: waypoint.snapReason,
    appCoordinate:
      waypoint.snapped === null ? null : toAppCoordinate(waypoint.snapped),
  }));

  return {
    regionId: "gale",
    routeId: route.routeId,
    requestId: route.requestId,
    status: route.status,
    preference: route.preference,
    distanceMeters: route.distanceMeters,
    ascentMeters: route.ascentMeters,
    descentMeters: route.descentMeters,
    maximumSlopeDegrees: route.maximumSlopeDegrees,
    meanSlopeDegrees: route.meanSlopeDegrees,
    straightLineDistanceMeters: route.straightLineDistanceMeters,
    detourRatio: route.detourRatio,
    totalTerrainCostMeters: route.totalTerrainCostMeters,
    legs,
    waypoints,
    sourceDatasetIds: [...route.sourceDatasetIds],
    sourceVerified: route.sourceVerified,
    processingVerified: route.processingVerified,
    registrationVerified: route.registrationVerified,
    evidence: {
      source: route.evidence.source.status,
      processing: route.evidence.processing.status,
      registration: route.evidence.registration.status,
      hazards: route.evidence.hazards.status,
      resourceModel: route.evidence.resource_model.status,
    },
    terrainModel: {
      datasetId: route.grid.datasetId,
      nominalPostingMeters: route.grid.nominalPostingMeters,
      slopeDerivative: route.grid.slopeDerivative,
      crs: route.grid.crs,
      verticalDatum: route.grid.verticalDatum,
      nodata: route.grid.nodata,
      checksumSha256: route.grid.checksumSha256,
      validAreaKm2: route.grid.validAreaKm2,
      validRouteCells: route.grid.validRouteCells,
    },
    warnings: [...route.warnings],
    integration: {
      authoritativeDistanceMeters: available ? route.distanceMeters : null,
      distanceSource: available ? "terrain-graph" : "unavailable",
      straightLineDistanceMeters: route.straightLineDistanceMeters,
      straightLineMustNotRemainAuthoritative: true,
      ascentMeters: available ? route.ascentMeters : null,
      descentMeters: available ? route.descentMeters : null,
      geometry: route.coordinates.map(
        ([longitude, latitude]) => [longitude, latitude],
      ),
    },
  };
}

function sameCoordinate(
  a: readonly [number, number],
  b: readonly [number, number],
): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function concatenateSegmentCoordinates(
  segments: readonly GaleRouteSegment[],
): [number, number][] {
  const combined: [number, number][] = [];
  for (const [index, segment] of segments.entries()) {
    const coordinates = segment.coordinates;
    const start = index > 0 && combined.length > 0 ? 1 : 0;
    for (let i = start; i < coordinates.length; i += 1) {
      combined.push([coordinates[i][0], coordinates[i][1]]);
    }
  }
  return combined;
}

/**
 * Compare reported geometry with the segment geometry and declared metadata.
 *
 * Diagnostics only detect inconsistency; they never alter or repair the route.
 */
export function diagnoseRouteGeometry(
  route: GaleRouteResult,
): GeometryDiagnostics {
  const issues: string[] = [];
  const [west, south, east, north] = route.grid.extentWsen;

  const recomposed = concatenateSegmentCoordinates(route.segments);
  const geometryMatchesSegments =
    recomposed.length === route.coordinates.length &&
    recomposed.every((coordinate, index) =>
      sameCoordinate(coordinate, route.coordinates[index]),
    );
  if (!geometryMatchesSegments) {
    issues.push(
      "route coordinates do not equal the concatenation of segment coordinates",
    );
  }

  let endpointsMatchSnappedWaypoints =
    route.waypoints.length >= 2 &&
    route.waypoints[0].snapped !== null &&
    route.waypoints[route.waypoints.length - 1].snapped !== null;
  if (endpointsMatchSnappedWaypoints && route.coordinates.length > 0) {
    const first = route.coordinates[0];
    const last = route.coordinates[route.coordinates.length - 1];
    const startSnap = route.waypoints[0].snapped;
    const endSnap = route.waypoints[route.waypoints.length - 1].snapped;
    endpointsMatchSnappedWaypoints =
      startSnap !== null &&
      endSnap !== null &&
      sameCoordinate(first, startSnap) &&
      sameCoordinate(last, endSnap);
    if (!endpointsMatchSnappedWaypoints) {
      issues.push(
        "route endpoints do not match the snapped start/destination waypoints",
      );
    }
  } else if (route.status !== "unavailable") {
    issues.push("route is missing snapped endpoint waypoints");
  }

  let segmentChainContinuous = true;
  for (let index = 0; index + 1 < route.segments.length; index += 1) {
    const current = route.segments[index].coordinates;
    const next = route.segments[index + 1].coordinates;
    if (
      current.length === 0 ||
      next.length === 0 ||
      !sameCoordinate(current[current.length - 1], next[0])
    ) {
      segmentChainContinuous = false;
      issues.push(`segments ${index + 1} and ${index + 2} are not continuous`);
    }
  }

  let waypointOrderPreserved = true;
  route.waypoints.forEach((waypoint, index) => {
    if (waypoint.index !== index) {
      waypointOrderPreserved = false;
      issues.push(`waypoint ${index} reports index ${waypoint.index}`);
    }
    const expectedRole =
      index === 0
        ? "start"
        : index === route.waypoints.length - 1
          ? "destination"
          : "via";
    if (waypoint.role !== expectedRole) {
      waypointOrderPreserved = false;
      issues.push(
        `waypoint ${index} reports role ${waypoint.role}, expected ${expectedRole}`,
      );
    }
  });
  route.segments.forEach((segment, index) => {
    if (
      segment.fromWaypointIndex !== index ||
      segment.toWaypointIndex !== index + 1
    ) {
      waypointOrderPreserved = false;
      issues.push(
        `segment ${segment.segmentId} does not connect waypoints ${index} -> ${index + 1}`,
      );
    }
  });

  let segmentDistanceSumMatchesRoute = route.status !== "unavailable";
  if (route.status !== "unavailable") {
    const distances = route.segments.map((segment) => segment.distanceMeters);
    if (distances.some((distance) => distance === null)) {
      segmentDistanceSumMatchesRoute = false;
      issues.push("at least one segment has no measured distance");
    } else if (route.distanceMeters !== null) {
      const sum = distances.reduce<number>(
        (total, distance) => total + (distance ?? 0),
        0,
      );
      const tolerance = Math.max(1e-6, Math.abs(route.distanceMeters) * 1e-9);
      if (Math.abs(sum - route.distanceMeters) > tolerance) {
        segmentDistanceSumMatchesRoute = false;
        issues.push(
          `segment distance sum ${sum} differs from route distance ${route.distanceMeters}`,
        );
      }
    }
  }

  let routeInsideDatasetExtent = true;
  for (const [longitude, latitude] of route.coordinates) {
    if (
      longitude < west - 1e-9 ||
      longitude > east + 1e-9 ||
      latitude < south - 1e-9 ||
      latitude > north + 1e-9
    ) {
      routeInsideDatasetExtent = false;
      issues.push(
        `coordinate [${longitude}, ${latitude}] lies outside the declared dataset extent`,
      );
      break;
    }
  }

  return {
    coordinateCount: route.coordinates.length,
    declaredSampleCount: route.samples.coordinateCount,
    segmentCoordinateCount: recomposed.length,
    coordinateCountMatchesSamples:
      route.coordinates.length === route.samples.coordinateCount,
    geometryMatchesSegments,
    endpointsMatchSnappedWaypoints,
    segmentChainContinuous,
    waypointOrderPreserved,
    segmentDistanceSumMatchesRoute,
    routeInsideDatasetExtent,
    issues,
  };
}

/** Convert a route path to a GeoJSON LineString in `[lon, lat]` order. */
export function toGeoJsonLineString(route: GaleRouteResult): {
  type: "LineString";
  coordinates: [number, number][];
} {
  return {
    type: "LineString",
    coordinates: route.coordinates.map(
      ([longitude, latitude]) => [longitude, latitude],
    ),
  };
}

/** True when both alternatives for a request were computed on valid terrain. */
export function alternativesAreComparable(
  alternatives: GaleRouteAlternatives,
): boolean {
  return (
    alternatives.alternatives.shortest.status !== "unavailable" &&
    alternatives.alternatives["lower-terrain-cost"].status !== "unavailable"
  );
}

/**
 * Interface requirements for future shared mission-engine integration.
 *
 * These are documentation strings, not executable policy. They are exported so
 * the integration branch can consume the same wording as the report.
 */
export const MISSION_INTEGRATION_NOTES: readonly string[] = [
  "Consume route.distanceMeters as the terrain-aware path length whenever status is computed or unverified.",
  "Do not keep the geometric straight-line distance authoritative after a terrain route is available.",
  "Consume ascentMeters/descentMeters as DEM-derived sums, not surveyed rover odometry.",
  "Use per-segment geometry for timeline progression; do not resample across failed segments.",
  "Keep oxygen, battery, radiation, and metabolic coefficients in the shared engine; this branch does not define them.",
  "Propagate sourceVerified, processingVerified, registrationVerified and warnings into any mission-level evidence display.",
  "Treat status 'unverified' as computed geometry with uncertified optical registration, never as safety or feasibility.",
  "When a segment is unavailable, surface the structured failure and do not draw or measure a straight-line substitute.",
];
