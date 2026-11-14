/**
 * Zod validation schemas for the Marswalk EVA Resource Planning System.
 *
 * Provides runtime validation, type safety, and schema checking for
 * route inputs, reference profiles, planning configurations, and persistence.
 *
 * @module lib/eva/validation
 */

import { z } from "zod";

export const routeEvidenceSchema = z.enum([
  "terrain-derived",
  "geometric",
  "unavailable",
]);

export const resourceEstimateStatusSchema = z.enum([
  "estimated",
  "assumption-dependent",
  "unavailable",
  "exceeds-configured-capacity",
]);

export const capacityAssessmentStatusSchema = z.enum([
  "within-configured-capacity",
  "exceeds-configured-capacity",
  "capacity-unknown",
  "insufficient-evidence",
]);

export const evaProfileTypeSchema = z.enum([
  "historical-hardware",
  "nasa-engineering-reference",
  "user-defined",
]);

export const coolingSystemTypeSchema = z.enum([
  "porous-plate-sublimator",
  "spacesuit-water-membrane-evaporator",
  "closed-loop-recirculating-radiator",
  "other-consumptive",
  "none",
  "unknown",
]);

export const evaReferenceProfileSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(2000),
  profileType: evaProfileTypeSchema,
  sourceAgency: z.string().max(200),
  applicableTechnology: z.string().max(200),
  missionEnvironment: z.string().max(200),

  oxygenMetabolicRateKgPerHour: z.number().nonnegative().nullable().optional(),
  oxygenSupplyLossRateKgPerHour: z.number().nonnegative().nullable().optional(),
  oxygenCapacityKg: z.number().nonnegative().nullable().optional(),

  electricalPowerWatts: z.number().nonnegative().nullable().optional(),
  batteryCapacityWh: z.number().nonnegative().nullable().optional(),

  coolingWaterLossKgPerHour: z.number().nonnegative().nullable().optional(),
  coolingSystemType: coolingSystemTypeSchema.nullable().optional(),
  coolingWaterCapacityKg: z.number().nonnegative().nullable().optional(),

  maximumSupportedDurationHours: z.number().positive().nullable().optional(),

  sourceIds: z.array(z.string()),
  limitations: z.array(z.string()),
});

export const evaResourceRouteInputSchema = z.object({
  regionId: z.enum(["gale", "jezero", "oxia"]),
  routeEvidence: routeEvidenceSchema,
  distanceMeters: z.number().nonnegative().nullable(),
  travelTimeHours: z.number().nonnegative().nullable(),
  scienceStopHours: z.number().nonnegative(),
  otherActivityHours: z.number().nonnegative(),
  ascentMeters: z.number().nullable().optional(),
  descentMeters: z.number().nullable().optional(),
  roundTripIncluded: z.boolean(),
  sourceDatasetIds: z.array(z.string()),
  warnings: z.array(z.string()),
});

export const evaPlanningConfigSchema = z.object({
  profileId: z.string().min(1).max(100),
  customProfile: evaReferenceProfileSchema.partial().optional(),
  speedKmh: z.number().positive().nullable().optional(),
  oxygenPlanningReservePercent: z.number().min(0).max(100).optional(),
  batteryPlanningReservePercent: z.number().min(0).max(100).optional(),
  coolingWaterPlanningReservePercent: z.number().min(0).max(100).optional(),
  timeContingencyPercent: z.number().min(0).max(100).optional(),
  manualDistanceMeters: z.number().nonnegative().nullable().optional(),
  manualOxygenCapacityKg: z.number().nonnegative().nullable().optional(),
  manualBatteryCapacityWh: z.number().nonnegative().nullable().optional(),
  manualCoolingWaterCapacityKg: z.number().nonnegative().nullable().optional(),
  manualElectricalPowerWatts: z.number().nonnegative().nullable().optional(),
});

/**
 * Persistence schema for saving EVA resource planning state with mission drafts.
 */
export const evaResourcePlanPersistenceSchema = z.object({
  schema_version: z.literal(1),
  profile_id: z.string().min(1).max(100),
  profile_version: z.string().min(1).max(100),
  speed_kmh: z.number().positive().nullable().optional(),
  oxygen_reserve_percent: z.number().min(0).max(100).optional(),
  battery_reserve_percent: z.number().min(0).max(100).optional(),
  cooling_water_reserve_percent: z.number().min(0).max(100).optional(),
  time_contingency_percent: z.number().min(0).max(100).optional(),
  manual_assumptions: z
    .object({
      distance_meters: z.number().nonnegative().nullable().optional(),
      oxygen_capacity_kg: z.number().nonnegative().nullable().optional(),
      battery_capacity_wh: z.number().nonnegative().nullable().optional(),
      cooling_water_capacity_kg: z.number().nonnegative().nullable().optional(),
      electrical_power_w: z.number().nonnegative().nullable().optional(),
    })
    .optional(),
  route_version: z.string().optional(),
  dataset_version: z.string().max(200).optional(),
  last_calculated_at: z.string().optional(),
  calculation_status: resourceEstimateStatusSchema.optional(),
});
export type EVAResourcePlanPersistence = z.infer<
  typeof evaResourcePlanPersistenceSchema
>;
