import { z } from "zod";
import { waypointPlanSchema } from "@/lib/mission/waypoint-planning";
export const ROUTING_VERSION = "terrain-i3a-v1-georeferenced";
export const preferenceSchema = z.enum(["shortest", "lower-terrain-cost"]);
export type TerrainPreference = z.infer<typeof preferenceSchema>;
export const routeRequestSchema = z.object({
  regionId: z.enum(["gale", "jezero", "oxia"]),
  plan: waypointPlanSchema.refine(plan => plan.waypoints.length >= 2 && plan.waypoints.length <= 12, "Use 2 to 12 ordered waypoints"),
  datasetId: z.enum(["gale-hrsc-30m", "gale-hrsc-mola-200m", "jezero-usgs-trn-dtm-routing-25m"]),
  maxSnapMeters: z.number().finite().min(0).max(150),
});
export type TerrainRequest = z.infer<typeof routeRequestSchema>;
export const routeReceiptSchema = z.object({
  version: z.string().max(100), requestKey: z.string().max(20000),
  preference: preferenceSchema, datasetId: z.string().max(100), maxSnapMeters: z.number().min(0).max(150).optional(),
});
const pair = z.tuple([z.number().finite().min(0).lt(360), z.number().finite().min(-90).max(90)]);
export const terrainSegmentSchema = z.object({
  coordinates: z.array(pair).max(150000), distanceMeters: z.number().finite().nonnegative(),
  horizontalDistanceMeters: z.number().finite().nonnegative(),
  ascentMeters: z.number().finite().nonnegative(), descentMeters: z.number().finite().nonnegative(),
});
export const terrainRouteSchema = z.object({
  regionId: z.enum(["gale", "jezero", "oxia"]), preference: preferenceSchema,
  status: z.enum(["computed", "unverified", "unavailable"]),
  coordinates: z.array(pair).max(150000), segments: z.array(terrainSegmentSchema).max(12),
  distanceMeters: z.number().finite().nonnegative().nullable(),
  horizontalDistanceMeters: z.number().finite().nonnegative().nullable(),
  surfaceDistanceMeters: z.number().finite().nonnegative().nullable(),
  ascentMeters: z.number().finite().nonnegative().nullable(), descentMeters: z.number().finite().nonnegative().nullable(),
  maximumSlopeDegrees: z.number().finite().nonnegative().nullable(), meanSlopeDegrees: z.number().finite().nonnegative().nullable(),
  sourceDatasetIds: z.array(z.string()), sourceVerified: z.boolean(), processingVerified: z.boolean(), registrationVerified: z.literal(false),
  requestedWaypoints: z.array(pair), snappedWaypoints: z.array(pair), snapDistancesMeters: z.array(z.number().finite().nonnegative()),
  warnings: z.array(z.string()), failureReason: z.string().nullable(),
  nativeMetrics: z.record(z.string(), z.unknown()),
});
export type TerrainRoute = z.infer<typeof terrainRouteSchema>;
export const terrainResponseSchema = z.object({version:z.string(), alternatives:z.array(terrainRouteSchema).length(2)});
export type TerrainResponse = z.infer<typeof terrainResponseSchema>;
export function unavailableRoute(regionId: TerrainRequest["regionId"], preference: TerrainPreference, reason: string): TerrainRoute {
  return {regionId, preference, status:"unavailable",coordinates:[],segments:[],distanceMeters:null,horizontalDistanceMeters:null,surfaceDistanceMeters:null,ascentMeters:null,descentMeters:null,maximumSlopeDegrees:null,meanSlopeDegrees:null,sourceDatasetIds:[],sourceVerified:false,processingVerified:false,registrationVerified:false,requestedWaypoints:[],snappedWaypoints:[],snapDistancesMeters:[],warnings:[reason],failureReason:reason,nativeMetrics:{}};
}
