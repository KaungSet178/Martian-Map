import type { Mission } from "@/lib/mission/model";
import type { WaypointPlan } from "@/lib/mission/waypoint-planning";
import { ROUTING_VERSION } from "./contracts";

export function terrainRequestKey(mission: Mission, plan: WaypointPlan, datasetId: string, maxSnapMeters: number) {
  return JSON.stringify([ROUTING_VERSION, mission.id, mission.region, mission.dataset_version, datasetId, maxSnapMeters, plan.mode, plan.waypoints]);
}
