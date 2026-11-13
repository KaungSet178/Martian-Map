import { z } from "zod";
import {
  assetUrlSchema,
  availabilitySchema,
  coordinatesSchema,
  coordinateReferenceSchema,
  evidenceSchema,
  regionIdSchema,
} from "./primitives";
export const sourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z
    .url()
    .refine((url) => url.startsWith("https://"), "Source links must use HTTPS"),
  agency: z.string().nullable(),
  instrument: z.string().nullable(),
  product_id: z.string().nullable(),
  acquisition_date: z.string().nullable(),
  sol: z.number().nonnegative().nullable(),
  native_resolution_m: z.number().positive().nullable(),
  processing_notes: z.array(z.string()),
  limitations: z.array(z.string()),
});
export type SourceRecord = z.infer<typeof sourceSchema>;
export const renderingSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("unavailable"), reason: z.string().min(1) }),
  z.object({
    kind: z.literal("raster-tiles"),
    tiles: z.array(assetUrlSchema).min(1),
    tile_size: z.union([z.literal(256), z.literal(512)]),
    min_zoom: z.number().min(0).max(22),
    max_zoom: z.number().min(0).max(22),
  }),
  z.object({
    kind: z.literal("geojson"),
    url: assetUrlSchema,
    geometry: z.enum(["line", "fill", "circle"]),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
]);
export const layerSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
    display_name: z.string().min(1),
    kind: z.enum(["optical", "topography", "geology", "thermal", "overlay"]),
    availability: z.enum(["available", "unavailable", "pending"]),
    source_id: z.string().nullable(),
    observation_date: z.string().nullable(),
    spatial_resolution_m: z.number().positive().nullable(),
    coverage: z.string().nullable(),
    limitations: z.string().min(1),
    evidence: evidenceSchema,
    attribution: z.string().nullable(),
    rendering: renderingSchema,
    default_visible: z.boolean(),
    default_opacity: z.number().min(0).max(100),
    legend: z
      .object({
        title: z.string(),
        units: z.string().nullable(),
        items: z.array(
          z.object({
            label: z.string(),
            color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
          }),
        ),
      })
      .nullable(),
  })
  .superRefine((l, ctx) => {
    if (
      l.availability === "available" &&
      (l.rendering.kind === "unavailable" ||
        !l.source_id ||
        !l.attribution ||
        !l.coverage ||
        l.evidence === "Unavailable")
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Available layers require source, attribution, coverage, evidence and rendering",
      });
    if (l.availability !== "available" && l.rendering.kind !== "unavailable")
      ctx.addIssue({
        code: "custom",
        message: "Pending/unavailable layers cannot declare active rendering",
      });
    if (
      l.rendering.kind === "raster-tiles" &&
      l.rendering.min_zoom > l.rendering.max_zoom
    )
      ctx.addIssue({
        code: "custom",
        message: "Raster zoom bounds must be ordered",
      });
  });
export type ScientificLayer = z.infer<typeof layerSchema>;
export const photographSchema = z.object({
  id: z.string().min(1),
  source_id: z.string().min(1),
  product_id: z.string().min(1),
  source_url: z.url().refine((url) => url.startsWith("https://")),
  image_url: assetUrlSchema,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string().min(1),
  acquisition_date: z.iso.date().nullable(),
  sol: z.number().int().nonnegative().nullable(),
  instrument: z.string().min(1),
  caption: z.string().min(1),
  attribution: z.string().min(1),
  association: z.string().min(1),
  processing: z.string().min(1),
  limitations: z.array(z.string().min(1)).min(1),
}).refine((photo) => photo.acquisition_date !== null || photo.sol !== null, {
  message: "Photographic evidence requires an acquisition date or Sol",
});
export type Photograph = z.infer<typeof photographSchema>;
export const targetSchema = z
  .object({
    id: z.string().min(1),
    region_id: regionIdSchema,
    title: z.string().min(1),
    description: z.string(),
    scientific_goal: z.string(),
    geological_significance: z.string().nullable(),
    priority_category: z.string(),
    coordinates: coordinatesSchema.nullable(),
    coordinate_reference: coordinateReferenceSchema,
    coordinate_verified: z.boolean(),
    source_ids: z.array(z.string()),
    activity: z.string(),
    evidence: evidenceSchema,
    verification: z.enum(["scenario", "pending", "verified"]),
    routing_eligibility: availabilitySchema,
    // Optional additions: existing regional manifests and mission v1 IDs stay
    // valid. Photos establish evidence/association, never target coordinates.
    feature_kind: z.enum(["geological_area", "observation_site", "sampling_site", "scenario_objective"]).optional(),
    location_notes: z.string().min(1).optional(),
    boundary: z.object({ status: z.literal("unavailable"), reason: z.string().min(1) }).optional(),
    photographs: z.array(photographSchema).max(8).optional(),
  })
  .superRefine((t, ctx) => {
    if (t.feature_kind === "geological_area" && t.coordinates !== null) {
      ctx.addIssue({ code: "custom", message: "Geological areas cannot be represented as precise point waypoints" });
    }
    if (t.photographs?.some((photo) => !t.source_ids.includes(photo.source_id))) {
      ctx.addIssue({ code: "custom", message: "Photographs must reference supporting target sources" });
    }
    if (
      (t.coordinate_verified ||
        t.verification === "verified" ||
        t.routing_eligibility.status === "available") &&
      (!t.coordinates ||
        !t.coordinate_verified ||
        !t.source_ids.length ||
        t.verification !== "verified" ||
        t.evidence === "Scenario" ||
        t.evidence === "Unavailable")
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Verified/routable targets require verified Mars coordinates, non-scenario evidence and supporting sources",
      });
  });
export type Target = z.infer<typeof targetSchema>;
export const contextDatasetSchema = z.object({
  id: z.string(),
  name: z.string(),
  evidence: evidenceSchema,
  availability: availabilitySchema,
  source_ids: z.array(z.string()),
  limitations: z.string(),
});
