import { z } from "zod";
import {
  availabilitySchema,
  coordinatesSchema,
  geographicExtentSchema,
  regionIdSchema,
} from "./primitives";
import {
  contextDatasetSchema,
  layerSchema,
  sourceSchema,
  targetSchema,
} from "./science";
export * from "./primitives";
export { layerSchema, sourceSchema, targetSchema } from "./science";
export type { Target, ScientificLayer, SourceRecord } from "./science";
export const mapConfigSchema = z.object({
  visualization: availabilitySchema,
  initial_zoom: z.number().min(0).max(22),
  supported_extent: geographicExtentSchema.nullable(),
  display_transform: z.discriminatedUnion("status", [
    z.object({ status: z.literal("unverified"), reason: z.string() }),
    z.object({
      status: z.literal("reviewed"),
      method: z.literal("mars-geographic-to-maplibre-display"),
      source_id: z.string(),
      notes: z.string().min(1),
    }),
  ]),
});
export const regionSchema = z
  .object({
    id: regionIdSchema,
    name: z.string(),
    mission_context: z.string(),
    region_status: z.enum(["exploration", "planned"]),
    scientific_context: z.object({ mission: z.string(), question: z.string() }),
    coordinate_system: z.object({
      body: z.literal("Mars"),
      latitude_type: z.literal("planetocentric"),
      longitude_direction: z.literal("east"),
      longitude_range: z.literal("0-360"),
      projected_crs: z.string(),
      reference_surface: z.string().nullable(),
      sphere_radius_m: z.number().positive().nullable(),
      vertical_datum: z.string().nullable(),
    }),
    view_center: coordinatesSchema.extend({ status: z.string() }),
    map: mapConfigSchema,
    data_status: z.enum([
      "illustrative",
      "metadata_verified",
      "raster_audited",
    ]),
    dataset_version: z.string(),
    layers: z.array(layerSchema),
    targets: z.array(targetSchema),
    contextual_datasets: z.array(contextDatasetSchema),
    routing: z.object({
      enabled: z.boolean(),
      reason: z.string(),
      eligibility_dataset_id: z.string().nullable().optional(),
      policy_version: z.string().nullable().optional(),
    }),
    capabilities: z.object({
      terrain_coverage: z.object({
        status: z.enum(["unknown", "partial", "audited"]),
        reason: z.string().min(1),
        source_id: z.string().nullable(),
      }),
      experimental_routing: availabilitySchema,
      validated_routing: availabilitySchema,
      mission_feasibility: availabilitySchema,
    }),
    source_references: z.array(sourceSchema),
  })
  .superRefine((r, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    const sources = new Set(r.source_references.map((s) => s.id));
    const records = [
      ...r.layers,
      ...r.targets,
      ...r.contextual_datasets,
      ...r.source_references,
      ...r.targets.flatMap((t) => t.photographs ?? []),
    ];
    if (new Set(records.map((x) => x.id)).size !== records.length)
      issue("IDs must be unique within a region");
    if (records.some((x) => !x.id.startsWith(`${r.id}-`)))
      issue("Regional record IDs must use their region prefix");
    if (r.targets.some((t) => t.region_id !== r.id))
      issue("Targets cannot belong to a different region");
    const refs = [
      ...r.targets.flatMap((t) => t.source_ids),
      ...r.targets.flatMap((t) => (t.photographs ?? []).map((photo) => photo.source_id)),
      ...r.layers.flatMap((l) => (l.source_id ? [l.source_id] : [])),
      ...r.contextual_datasets.flatMap((d) => d.source_ids),
    ];
    if (refs.some((id) => !sources.has(id)))
      issue(
        "Every referenced source must exist in this region's source register",
      );
    for (const photo of r.targets.flatMap((t) => t.photographs ?? [])) {
      const source = r.source_references.find((s) => s.id === photo.source_id);
      if (source && (source.url !== photo.source_url || source.product_id !== photo.product_id))
        issue("Photographic product and URL must match its registered source");
    }
    if (
      r.map.visualization.status === "available" &&
      (r.map.display_transform.status !== "reviewed" ||
        !r.map.supported_extent ||
        !r.coordinate_system.reference_surface ||
        !r.coordinate_system.sphere_radius_m ||
        !r.layers.some((l) => l.availability === "available"))
    )
      issue(
        "Map visualization requires reviewed Mars transform, reference surface, extent and available layers",
      );
    if (
      r.map.display_transform.status === "reviewed" &&
      !sources.has(r.map.display_transform.source_id)
    )
      issue("Display transform review must reference a registered source");
    if (
      r.capabilities.terrain_coverage.status !== "unknown" &&
      (!r.capabilities.terrain_coverage.source_id ||
        !sources.has(r.capabilities.terrain_coverage.source_id))
    )
      issue("Terrain coverage must reference its source");
    if (
      (r.routing.enabled ||
        r.capabilities.validated_routing.status === "available") &&
      (!r.routing.enabled ||
        r.capabilities.validated_routing.status !== "available" ||
        r.data_status !== "raster_audited" ||
        r.capabilities.terrain_coverage.status !== "audited" ||
        !r.routing.eligibility_dataset_id ||
        !r.routing.policy_version)
    )
      issue(
        "Validated routing requires audited coverage, policy and eligibility dataset",
      );
    if (
      r.capabilities.mission_feasibility.status === "available" &&
      !r.routing.enabled
    )
      issue(
        "Full mission feasibility requires validated routing and separate model review",
      );
  });
export type RegionManifest = z.infer<typeof regionSchema>;
export type RegionConfig = Omit<RegionManifest, "targets" | "layers">;
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
