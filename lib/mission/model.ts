import { z } from "zod";
import { evaConfigSchema } from "@/lib/eva/config";
import { routeReceiptSchema } from "@/lib/routing/contracts";
import {
  coordinatesSchema,
  regionIdSchema,
  type RegionManifest,
} from "@/lib/contracts/region";
import {
  waypointPlanSchema,
  type WaypointPlan,
  targetWaypointEvidence,
} from "@/lib/mission/waypoint-planning";

export const missionSchema = z.object({
  schema_version: z.literal(1),
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(100),
  region: regionIdSchema,
  target_ids: z
    .array(z.string().max(100))
    .max(50)
    .refine((ids) => new Set(ids).size === ids.length),
  direction: z.enum(["round", "one"]),
  start: coordinatesSchema.nullable(),
  endpoint: coordinatesSchema.nullable(),
  recovery_assumption: z.string().max(2000),
  oxygen_reserve_percent: z.number().min(10).max(50),
  battery_reserve_percent: z.number().min(10).max(50),
  dataset_version: z.string().max(200),
  model_versions: z.record(z.string(), z.string()),
  saved_at: z.iso.datetime().nullable(),
  waypoint_plan: waypointPlanSchema.optional(),
  terrain_route: routeReceiptSchema.optional(),
  retired_objectives: z.array(z.object({id:z.string().max(100),title:z.string().max(200).optional(),reason:z.string().max(2000)})).max(100).optional(),
  eva_config: evaConfigSchema.optional(),
  terrain_assumptions: z.record(z.string().max(40), z.string().max(50)).optional(),
});
export type Mission = z.infer<typeof missionSchema>;
export type { WaypointPlan };
export const STORAGE_KEY = "marswalk.missions.v1";

export function newMission(region: RegionManifest): Mission {
  return {
    schema_version: 1,
    id: crypto.randomUUID(),
    name: `${region.name} field plan`,
    region: region.id,
    target_ids: [],
    direction: "round",
    start: null,
    endpoint: null,
    recovery_assumption: "",
    oxygen_reserve_percent: 25,
    battery_reserve_percent: 25,
    dataset_version: region.dataset_version,
    model_versions: {},
    saved_at: null,
  };
}
export function moveStop(ids: string[], id: string, delta: number): string[] {
  const i = ids.indexOf(id),
    next = i + delta;
  if (i < 0 || next < 0 || next >= ids.length) return ids;
  const result = [...ids];
  [result[i], result[next]] = [result[next], result[i]];
  return result;
}
export function missionIssues(
  mission: Mission,
  region: RegionManifest,
): string[] {
  const issues: string[] = [];
  if (!mission.target_ids.length && !mission.waypoint_plan?.waypoints.length)
    issues.push("Add a planning waypoint or science objective.");
  if (!mission.start) issues.push("A planned start/base location is required; absolute registration remains unverified.");
  if (mission.direction === "one") {
    if (!mission.endpoint)
      issues.push(
        "A planned recovery endpoint is required for a one-way mission; absolute registration remains unverified.",
      );
    if (!mission.recovery_assumption.trim())
      issues.push("Document the recovery assumption for a one-way mission.");
  }
  if (
    mission.target_ids.some((id) => {
      const target = region.targets.find((t) => t.id === id);
      return (
        !target?.coordinate_verified ||
        target.routing_eligibility.status !== "available"
      );
    })
  )
    issues.push(
      "Selected objectives need verified target coordinates and routing eligibility before routing.",
    );
  if (mission.dataset_version !== region.dataset_version)
    issues.push(
      "Dataset version changed. Revalidate this plan against current evidence.",
    );
  if (!region.routing.enabled) issues.push(region.routing.reason);
  return issues;
}
export function parseMission(value: unknown, region: RegionManifest): Mission {
  const mission = missionSchema.parse(value);
  if (
    mission.region !== region.id ||
    [...mission.target_ids, ...(mission.waypoint_plan?.waypoints.flatMap(w => w.target_id ? [w.target_id] : []) ?? []), ...(mission.retired_objectives?.map(t => t.id) ?? [])].some((id) => /^(gale|jezero|oxia)[-_]/.test(id) && !id.startsWith(`${region.id}-`) && !id.startsWith(`${region.id}_`))
  ) {
    throw new Error(
      "This plan contains unknown region or objective IDs. Its source catalog is required before opening.",
    );
  }
  if (mission.waypoint_plan && mission.waypoint_plan.region_id !== undefined && mission.waypoint_plan.region_id !== region.id) {
    throw new Error(
      "This plan contains waypoints from a different exploration region. Regional state must remain strictly isolated.",
    );
  }
  if (mission.waypoint_plan && !mission.waypoint_plan.region_id) mission.waypoint_plan.region_id = region.id;
  // Retired references remain readable and editable, never silently discarded or routed.
  const retired = new Map((mission.retired_objectives ?? []).map(t => [t.id,t]));
  for (const id of [...mission.target_ids, ...(mission.waypoint_plan?.waypoints.flatMap(w => w.target_id ? [w.target_id] : []) ?? [])]) {
    if (!region.targets.some(t => t.id === id)) retired.set(id, retired.get(id) ?? {id,reason:"Target absent from the current science catalog; retained as historical planning context, unavailable for terrain routing."});
  }
  if (retired.size) mission.retired_objectives = [...retired.values()];
  if (mission.waypoint_plan) mission.waypoint_plan.waypoints = mission.waypoint_plan.waypoints.map(w => {
    const target = region.targets.find(t => t.id === w.target_id);
    if (target) {
      const evidence = targetWaypointEvidence(target);
      return {...w,evidence,previous_evidence:w.previous_evidence ?? (w.evidence && JSON.stringify(w.evidence)!==JSON.stringify(evidence) ? w.evidence : undefined)};
    }
    if (w.target_id && w.evidence) return {...w,evidence:{...w.evidence,routing_eligible:false,precision_disclosure:`Retired catalog association. ${w.evidence.precision_disclosure}`}};
    return w;
  });
  return mission;
}
export function readMissions(storage: Pick<Storage, "getItem">): Mission[] {
  const raw = storage.getItem(STORAGE_KEY);
  return raw ? z.array(missionSchema).max(100).parse(JSON.parse(raw)) : [];
}
export function saveMission(
  storage: Pick<Storage, "getItem" | "setItem">,
  mission: Mission,
): Mission[] {
  const stored = readMissions(storage);
  const updated = {
    ...missionSchema.parse(mission),
    saved_at: new Date().toISOString(),
  };
  const result = [updated, ...stored.filter((m) => m.id !== mission.id)].slice(
    0,
    100,
  );
  storage.setItem(STORAGE_KEY, JSON.stringify(result));
  return result;
}
