/**
 * Marswalk Planner — Jezero Crater Scientific Terrain Routing Types
 *
 * Implements the shared Gale/Jezero route-output contract with region-specific
 * extensions for scientific provenance, uncertainty tracking, and multi-segment
 * pathfinding metadata.
 */

export type RouteStatus = "computed" | "unverified" | "unavailable";
export type RoutePreference = "shortest" | "lower-terrain-cost";
export type ScientificVerificationStatus =
  | "VERIFIED"
  | "UNVERIFIED"
  | "NOT_EVALUATED"
  | "INVALID";

export type RouteSegment = {
  segmentIndex: number;
  fromWaypointIndex: number;
  toWaypointIndex: number;
  requestedStart: [number, number]; // [lon, lat]
  requestedEnd: [number, number]; // [lon, lat]
  snappedStart: [number, number]; // [lon, lat]
  snappedEnd: [number, number]; // [lon, lat]
  startSnapDistanceMeters: number;
  endSnapDistanceMeters: number;
  coordinates: [number, number][]; // [lon, lat]
  distanceMeters: number;
  ascentMeters: number;
  descentMeters: number;
  maximumSlopeDegrees: number;
  meanSlopeDegrees: number;
  pathCellCount: number;
  status: RouteStatus;
  warnings: string[];
};

export type RoutingGridMetadata = {
  datasetId: string;
  sourceProduct: string;
  doi: string;
  crs: string;
  projection: "Equirectangular";
  marsRadiusMeters: number;
  standardParallelDegrees: number;
  centerLongitudeDegrees: number;
  gridSpacingMeters: number;
  width: number;
  height: number;
  bounds: {
    west: number;
    east: number;
    south: number;
    north: number;
  };
  elevationRangeMeters: [number, number];
  slopeRangeDegrees: [number, number];
  nodataValue: number;
  scientificCaveats?: string[];
};

export type CostModelParameters = {
  preference: RoutePreference;
  maxTraversableSlopeDegrees: number;
  baseDistanceWeight: number;
  slopePenaltyFactor: number;
  slopeReferenceDegrees: number;
  ascentPenaltyFactor: number;
  descentPenaltyFactor: number;
  formula: string;
  description: string;
};

export type WaypointInput = {
  id?: string;
  coordinates: [number, number] | null; // [lon, lat]
  label?: string;
  verified?: boolean; // JZ-T1A verification requirement
};

/**
 * Shared route-output contract between Gale and Jezero routing agents.
 */
export type RouteResult = {
  regionId: "gale" | "jezero";
  status: RouteStatus;
  preference: RoutePreference;
  coordinates: [number, number][]; // [lon, lat]
  distanceMeters: number | null;
  ascentMeters: number | null;
  descentMeters: number | null;
  maximumSlopeDegrees: number | null;
  meanSlopeDegrees: number | null;
  sourceDatasetIds: string[];
  sourceVerified: boolean;
  processingVerified: boolean;
  registrationVerified: boolean;
  warnings: string[];

  // Extended scientific & routing metadata
  segments?: RouteSegment[];
  requestedWaypoints?: [number, number][];
  snappedWaypoints?: [number, number][];
  snapDistancesMeters?: number[];
  gridMetadata?: RoutingGridMetadata;
  costParameters?: CostModelParameters;
  algorithm?: "A*" | "Dijkstra";
  coverageLimitations?: string[];
  failureReason?: string | null;
  scientificVerification?: {
    source: ScientificVerificationStatus;
    processing: ScientificVerificationStatus;
    registration: ScientificVerificationStatus;
    pathfinding: ScientificVerificationStatus;
    coverageCompleteness: ScientificVerificationStatus;
  };
};

export type RoutePlanningOptions = {
  preference?: RoutePreference;
  maxSnapDistanceMeters?: number;
  maxTraversableSlopeDegrees?: number;
  enforceVerifiedTargets?: boolean;
};
