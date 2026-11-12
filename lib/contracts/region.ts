import { z } from "zod";

export const regionIdSchema = z.enum(["jezero", "gale", "oxia"]);
export type RegionId = z.infer<typeof regionIdSchema>;
export const evidenceSchema = z.enum([
  "Observed",
  "Derived",
  "Interpreted",
  "Modeled",
  "Scenario",
  "Unavailable",
]);
export type Evidence = z.infer<typeof evidenceSchema>;
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude_east: z.number().min(0).lt(360),
});
export const targetSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    scientific_goal: z.string(),
    priority_category: z.string(),
    coordinates: coordinatesSchema.nullable(),
    coordinate_verified: z.boolean(),
    source_ids: z.array(z.string()),
    activity: z.string(),
  })
  .refine(
    (t) =>
      !t.coordinate_verified ||
      (t.coordinates !== null && t.source_ids.length > 0),
    {
      message: "Verified targets require coordinates and supporting source IDs",
    },
  );
export const layerSchema = z.object({
  id: z.string(),
  type: z.string(),
  availability: z.enum(["available", "unavailable", "pending"]),
  source_id: z.string().nullable(),
  observation_date: z.string().nullable(),
  spatial_resolution_m: z.number().positive().nullable(),
  coverage: z.string().nullable(),
  limitations: z.string(),
});
export const regionSchema = z.object({
  id: regionIdSchema,
  name: z.string(),
  mission_context: z.string(),
  coordinate_system: z.object({
    latitude_type: z.literal("planetocentric"),
    longitude_direction: z.literal("east"),
    longitude_range: z.literal("0-360"),
    projected_crs: z.string(),
  }),
  view_center: coordinatesSchema.extend({ status: z.string() }),
  data_status: z.enum(["illustrative", "metadata_verified", "raster_audited"]),
  dataset_version: z.string(),
  layers: z.array(layerSchema),
  targets: z.array(targetSchema),
  routing: z.object({
    enabled: z.boolean(),
    reason: z.string(),
    eligibility_dataset_id: z.string().nullable().optional(),
    policy_version: z.string().nullable().optional(),
  }),
  source_references: z.array(
    z.object({ id: z.string(), title: z.string(), url: z.url() }),
  ),
});
export type RegionManifest = z.infer<typeof regionSchema>;
export type Target = z.infer<typeof targetSchema>;

export const assessments = [
  "Terrain",
  "Oxygen",
  "Battery",
  "EVA time",
  "Radiation",
  "Return / recovery",
] as const;
export type AssessmentStatus =
  | "Feasible"
  | "Caution"
  | "Infeasible"
  | "Unverified";
export function overallStatus(statuses: AssessmentStatus[]): AssessmentStatus {
  if (statuses.includes("Infeasible")) return "Infeasible";
  if (statuses.length !== assessments.length || statuses.includes("Unverified"))
    return "Unverified";
  return statuses.includes("Caution") ? "Caution" : "Feasible";
}
