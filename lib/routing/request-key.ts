import type { Mission } from "@/lib/mission/model";
import type { WaypointPlan } from "@/lib/mission/waypoint-planning";
import { ROUTING_VERSION } from "./contracts";

/** Geometry and routing eligibility identity. Activity durations, labels and notes
 * cannot change a searched path. In particular, receipt synchronization may copy
 * recovery notes onto a terminus; that must not invalidate its own live response.
 */
export function terrainRequestKey(mission: Mission, plan: WaypointPlan, datasetId: string, maxSnapMeters: number) {
  const endpoints = plan.waypoints.map(w => ({
    id: w.id, coordinates: w.coordinates, role: w.role,
    target_id: w.target_id, provenance: w.provenance,
    evidence: w.evidence, inactive_reason: w.inactive_reason,
  }));
  return JSON.stringify([ROUTING_VERSION, mission.id, mission.region, mission.dataset_version, datasetId, maxSnapMeters, plan.mode, endpoints]);
}
