/**
 * Gale terrain-aware routing contract adapter types.
 *
 * This is a Gale-specific mirror of the future shared `RouteResult` contract.
 * The shared contract file is intentionally not modified in this branch.  All
 * geographic coordinates are `[longitude_east, latitude_planetocentric]` in
 * degrees and use the Mars 2000 sphere (R = 3,396,190 m).
 */

import { z } from "zod";

export const galeRoutePreferenceSchema = z.enum([
  "shortest",
  "lower-terrain-cost",
]);
export type GaleRoutePreference = z.infer<typeof galeRoutePreferenceSchema>;

export const galeRouteStatusSchema = z.enum([
  "computed",
  "unverified",
  "unavailable",
]);
export type GaleRouteStatus = z.infer<typeof galeRouteStatusSchema>;

export const galeEvidenceStatusSchema = z.enum([
  "VERIFIED",
  "UNVERIFIED",
  "NOT_EVALUATED",
  "INVALID",
]);
export type GaleEvidenceStatus = z.infer<typeof galeEvidenceStatusSchema>;

export const GALE_ROUTING_DATASET_IDS = [
  "gale-hrsc-30m",
  "gale-hrsc-mola-200m",
] as const;
export type GaleRoutingDatasetId = (typeof GALE_ROUTING_DATASET_IDS)[number];

export const marsCoordinatePairSchema = z
  .tuple([z.number().finite(), z.number().finite()])
  .refine(
    ([longitude, latitude]) =>
      longitude >= 0 &&
      longitude < 360 &&
      latitude >= -90 &&
      latitude <= 90,
    "coordinates must be [longitude_east 0-360, planetocentric latitude -90..90]",
  );
export type MarsCoordinatePair = z.infer<typeof marsCoordinatePairSchema>;

const nullableFiniteNumber = z.number().finite().nullable();

export const galeEvidenceSchema = z
  .object({
    source: z
      .object({ status: galeEvidenceStatusSchema })
      .passthrough(),
    processing: z
      .object({ status: galeEvidenceStatusSchema })
      .passthrough(),
    registration: z
      .object({ status: galeEvidenceStatusSchema })
      .passthrough(),
    hazards: z
      .object({ status: galeEvidenceStatusSchema })
      .passthrough(),
    resource_model: z
      .object({ status: galeEvidenceStatusSchema })
      .passthrough(),
  })
  .passthrough();

export const galeGridSummarySchema = z
  .object({
    datasetId: z.enum(GALE_ROUTING_DATASET_IDS),
    nominalPostingMeters: z.number().positive().nullable(),
    slopeDerivative: z.string().min(1),
    slopeSupportMeters: z.unknown(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    crs: z.string().min(1),
    verticalDatum: z.string().min(1),
    horizontalDatum: z.string().min(1),
    nodata: z.number().nullable(),
    checksumSha256: z.string().regex(/^[0-9a-f]{64}$/i),
    extentWsen: z.tuple([
      z.number().finite(),
      z.number().finite(),
      z.number().finite(),
      z.number().finite(),
    ]),
    validRouteCells: z.number().int().nonnegative(),
    totalCells: z.number().int().positive(),
    validFraction: z.number().min(0).max(1),
    validAreaKm2: z.number().nonnegative(),
  })
  .passthrough();

export const galeRouteWaypointSchema = z
  .object({
    index: z.number().int().nonnegative(),
    role: z.enum(["start", "via", "destination"]),
    requested: marsCoordinatePairSchema,
    snapped: marsCoordinatePairSchema.nullable(),
    snapDistanceMeters: z.number().finite().nullable(),
    snapReason: z.string().min(1),
    insideDeclaredExtent: z.boolean(),
    gridCell: z.tuple([z.number().int(), z.number().int()]).nullable(),
    ok: z.boolean(),
  })
  .passthrough();

export const galeRouteSegmentSchema = z
  .object({
    segmentId: z.string().min(1),
    fromWaypointIndex: z.number().int().nonnegative(),
    toWaypointIndex: z.number().int().positive(),
    status: z.enum(["computed", "unavailable"]),
    coordinates: z.array(marsCoordinatePairSchema),
    distanceMeters: nullableFiniteNumber,
    ascentMeters: nullableFiniteNumber,
    descentMeters: nullableFiniteNumber,
    maximumSlopeDegrees: nullableFiniteNumber,
    meanSlopeDegrees: nullableFiniteNumber,
    maximumCellSlopeDegrees: nullableFiniteNumber,
    meanCellSlopeDegrees: nullableFiniteNumber,
    straightLineDistanceMeters: nullableFiniteNumber,
    detourRatio: nullableFiniteNumber,
    totalTerrainCostMeters: nullableFiniteNumber,
    expandedNodes: z.number().int().nonnegative(),
    heapPushes: z.number().int().nonnegative(),
    failure: z
      .object({
        code: z.string().min(1),
        message: z.string().min(1),
      })
      .passthrough()
      .nullable(),
    preference: galeRoutePreferenceSchema,
  })
  .passthrough();

export const galeRouteEvidenceSchema = z
  .object({
    source: z.object({ status: galeEvidenceStatusSchema }).passthrough(),
    processing: z.object({ status: galeEvidenceStatusSchema }).passthrough(),
    registration: z.object({ status: galeEvidenceStatusSchema }).passthrough(),
    hazards: z.object({ status: galeEvidenceStatusSchema }).passthrough(),
    resource_model: z
      .object({ status: galeEvidenceStatusSchema })
      .passthrough(),
  })
  .passthrough();

export const galeRouteResultSchema = z
  .object({
    schemaVersion: z.literal("gale-route-v1"),
    regionId: z.literal("gale"),
    status: galeRouteStatusSchema,
    preference: galeRoutePreferenceSchema,
    coordinates: z.array(marsCoordinatePairSchema),
    distanceMeters: nullableFiniteNumber,
    ascentMeters: nullableFiniteNumber,
    descentMeters: nullableFiniteNumber,
    maximumSlopeDegrees: nullableFiniteNumber,
    meanSlopeDegrees: nullableFiniteNumber,
    sourceDatasetIds: z.array(z.enum(GALE_ROUTING_DATASET_IDS)).min(1),
    sourceVerified: z.boolean(),
    processingVerified: z.boolean(),
    registrationVerified: z.boolean(),
    warnings: z.array(z.string().min(1)).min(1),
    routeId: z.string().min(1).nullable(),
    requestId: z.string().min(1),
    requestedWaypoints: z.array(marsCoordinatePairSchema).min(2),
    snappedWaypoints: z.array(marsCoordinatePairSchema),
    waypoints: z.array(galeRouteWaypointSchema),
    segments: z.array(galeRouteSegmentSchema),
    algorithm: z
      .object({
        name: z.string().min(1),
        preference: galeRoutePreferenceSchema,
        heuristic: z.string().min(1),
        neighbours: z.literal(8),
        deterministic: z.boolean(),
      })
      .passthrough(),
    costModel: z
      .object({
        name: z.string().min(1),
        units: z.string().min(1),
        formula: z.string().min(1),
      })
      .passthrough(),
    grid: galeGridSummarySchema,
    samples: z
      .object({
        coordinateCount: z.number().int().nonnegative(),
        edgeCount: z.number().int().nonnegative(),
        expandedNodes: z.number().int().nonnegative(),
        heapPushes: z.number().int().nonnegative(),
      })
      .passthrough(),
    coverage: z
      .object({
        status: z.string().min(1),
        datasetId: z.enum(GALE_ROUTING_DATASET_IDS),
        validRouteCells: z.number().int().nonnegative(),
        totalCells: z.number().int().positive(),
        validFraction: z.number().min(0).max(1),
        validAreaKm2: z.number().nonnegative(),
        extentWsen: z.tuple([
          z.number().finite(),
          z.number().finite(),
          z.number().finite(),
          z.number().finite(),
        ]),
        routeWithinValidCoverage: z.boolean(),
      })
      .passthrough(),
    evidence: galeRouteEvidenceSchema,
    failure: z
      .object({
        code: z.string().min(1),
        message: z.string().min(1),
        segmentIndex: z.number().int().nullable(),
      })
      .passthrough()
      .nullable(),
    limitations: z.array(z.string()),
    straightLineDistanceMeters: nullableFiniteNumber,
    detourRatio: nullableFiniteNumber,
    totalTerrainCostMeters: nullableFiniteNumber,
    meanTerrainPenalty: nullableFiniteNumber,
    startElevationMeters: nullableFiniteNumber,
    endElevationMeters: nullableFiniteNumber,
    minimumElevationMeters: nullableFiniteNumber,
    maximumElevationMeters: nullableFiniteNumber,
    netElevationChangeMeters: nullableFiniteNumber,
    maximumCellSlopeDegrees: nullableFiniteNumber,
    meanCellSlopeDegrees: nullableFiniteNumber,
    demonstrationNote: z.string().min(1).optional(),
    demonstrationWaypoints: z.array(marsCoordinatePairSchema).optional(),
  })
  .passthrough()
  // Boolean evidence flags must not contradict the separated evidence record.
  .refine(
    (route) => route.sourceVerified === (route.evidence.source.status === "VERIFIED"),
    {
      message:
        "sourceVerified must equal (evidence.source.status === 'VERIFIED')",
      path: ["sourceVerified"],
    },
  )
  .refine(
    (route) =>
      route.processingVerified ===
      (route.evidence.processing.status === "VERIFIED"),
    {
      message:
        "processingVerified must equal (evidence.processing.status === 'VERIFIED')",
      path: ["processingVerified"],
    },
  )
  .refine(
    (route) =>
      route.registrationVerified ===
      (route.evidence.registration.status === "VERIFIED"),
    {
      message:
        "registrationVerified must equal (evidence.registration.status === 'VERIFIED')",
      path: ["registrationVerified"],
    },
  );

export type GaleRouteResult = z.infer<typeof galeRouteResultSchema>;
export type GaleRouteSegment = z.infer<typeof galeRouteSegmentSchema>;
export type GaleRouteWaypoint = z.infer<typeof galeRouteWaypointSchema>;
export type GaleGridSummary = z.infer<typeof galeGridSummarySchema>;
export type GaleRouteEvidence = z.infer<typeof galeRouteEvidenceSchema>;

export const galeRouteComparisonSchema = z
  .object({
    equivalent: z.boolean(),
    explanation: z.string().min(1),
    distanceDeltaMeters: nullableFiniteNumber,
    ascentDeltaMeters: nullableFiniteNumber,
    descentDeltaMeters: nullableFiniteNumber,
    maximumSlopeDeltaDegrees: nullableFiniteNumber,
    terrainCostDeltaMeters: nullableFiniteNumber,
  })
  .passthrough();

export const galeRouteAlternativesSchema = z
  .object({
    schemaVersion: z.literal("gale-route-alternatives-v1"),
    regionId: z.literal("gale"),
    datasetId: z.enum(GALE_ROUTING_DATASET_IDS),
    request: z
      .object({
        regionId: z.literal("gale"),
        datasetId: z.enum(GALE_ROUTING_DATASET_IDS),
        waypoints: z.array(marsCoordinatePairSchema).min(2),
        maxSnapMeters: z.number().positive(),
      })
      .passthrough(),
    alternatives: z.object({
      shortest: galeRouteResultSchema,
      "lower-terrain-cost": galeRouteResultSchema,
    }),
    comparison: galeRouteComparisonSchema,
    evidence: galeRouteEvidenceSchema,
    warnings: z.array(z.string().min(1)).min(1),
    demonstrationNote: z.string().min(1).optional(),
    demonstrationWaypoints: z.array(marsCoordinatePairSchema).optional(),
  })
  .passthrough();

export type GaleRouteAlternatives = z.infer<typeof galeRouteAlternativesSchema>;
export type GaleRouteComparison = z.infer<typeof galeRouteComparisonSchema>;

/** The minimum shared integration shape, mirrored locally without editing it. */
export type SharedRouteResultShape = {
  regionId: "gale" | "jezero";
  status: GaleRouteStatus;
  preference: GaleRoutePreference;
  coordinates: [number, number][];
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
};
