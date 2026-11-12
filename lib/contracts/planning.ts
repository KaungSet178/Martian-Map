import { z } from "zod";
import {
  coordinatesSchema,
  projectedCoordinatesSchema,
  regionIdSchema,
} from "./primitives";
import { assessments } from "./region";

// Frontend-facing proposal for the shared FastAPI boundary; no backend is implemented.
export const modelProvenanceSchema = z.object({
  id: z.string(),
  version: z.string(),
  source_ids: z.array(z.string()).min(1),
  assumptions: z.array(z.string()),
  limitations: z.array(z.string()),
});
export const routeRequestSchema = z
  .object({
    schema_version: z.literal(1),
    region: regionIdSchema,
    mission_id: z.string(),
    input_revision: z.string().min(1),
    dataset_version: z.string(),
    model_versions: z.record(z.string(), z.string()),
    start: coordinatesSchema,
    endpoint: coordinatesSchema.nullable(),
    direction: z.enum(["round", "one"]),
    ordered_target_ids: z.array(z.string()).min(1),
    objectives: z.array(z.enum(["safest", "fastest", "science"])).min(1),
    recovery_assumption: z.string(),
    reserves: z.object({
      oxygen_percent: z.number().min(0).max(100),
      battery_percent: z.number().min(0).max(100),
    }),
  })
  .refine(
    (r) =>
      r.direction !== "one" || (!!r.endpoint && !!r.recovery_assumption.trim()),
    "One-way requests require an endpoint and recovery assumption",
  );
export const blockingConditionSchema = z.object({
  code: z.enum([
    "coverage",
    "coordinates",
    "hazards",
    "model",
    "stale",
    "offline",
    "service",
  ]),
  reason: z.string().min(1),
  target_ids: z.array(z.string()),
});
export const resourceAssessmentSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("Unverified"),
    reason: z.string(),
    value: z.null(),
    unit: z.null(),
  }),
  z.object({
    status: z.enum(["Feasible", "Caution", "Infeasible"]),
    reason: z.string(),
    value: z.number().nullable(),
    unit: z.string().nullable(),
    models: z.array(modelProvenanceSchema).min(1),
    source_ids: z.array(z.string()).min(1),
    uncertainty: z.string().min(1),
  }),
]);
export const routeResponseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("unavailable"),
    region: regionIdSchema,
    input_revision: z.string(),
    blocking: z.array(blockingConditionSchema).min(1),
  }),
  z.object({
    status: z.literal("error"),
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
  }),
  z.object({
    status: z.literal("candidates"),
    region: regionIdSchema,
    input_revision: z.string(),
    dataset_version: z.string(),
    coverage: z.object({
      status: z.enum(["audited", "partial"]),
      source_ids: z.array(z.string()).min(1),
      limitations: z.array(z.string()),
    }),
    candidates: z.array(
      z.object({
        id: z.string(),
        objective: z.enum(["safest", "fastest", "science"]),
        validation: z.enum(["experimental", "scientifically_reviewed"]),
        geometry: z.array(projectedCoordinatesSchema).min(2),
        identical_to: z.string().nullable(),
        omitted_target_ids: z.array(z.string()),
        models: z.array(modelProvenanceSchema).min(1),
        limitations: z.array(z.string()),
        assessments: z.object(
          Object.fromEntries(
            assessments.map((a) => [a, resourceAssessmentSchema]),
          ) as Record<
            (typeof assessments)[number],
            typeof resourceAssessmentSchema
          >,
        ),
      }),
    ),
  }),
]);
export type RoutePlanningRequest = z.infer<typeof routeRequestSchema>;
export type RoutePlanningResponse = z.infer<typeof routeResponseSchema>;
