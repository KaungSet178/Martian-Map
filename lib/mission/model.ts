import { z } from "zod";
import {
  coordinatesSchema,
  regionIdSchema,
  type RegionManifest,
} from "@/lib/contracts/region";

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
});
export type Mission = z.infer<typeof missionSchema>;
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
  if (!mission.target_ids.length)
    issues.push("Add at least one science objective.");
  if (!mission.start) issues.push("A verified start location is required.");
  if (mission.direction === "one") {
    if (!mission.endpoint)
      issues.push(
        "A verified recovery endpoint is required for a one-way mission.",
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
    mission.target_ids.some((id) => !region.targets.some((t) => t.id === id))
  ) {
    throw new Error(
      "This plan contains unknown region or objective IDs. Its source catalog is required before opening.",
    );
  }
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
