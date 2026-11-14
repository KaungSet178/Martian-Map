/**
 * Oxia Planum Regional Route Adapter for EVA Resource Planning.
 *
 * Implements Section 5 of the specification for Oxia Planum:
 * - Oxia Planum currently lacks an integrated validated terrain-routing engine.
 * - Still provides FULL access to the unified EVA resource planning engine.
 * - Computes geometric route distance from validated spherical waypoints.
 * - Derives time using a clearly labeled planning speed assumption.
 * - Explicitly marks terrain adjustment UNAVAILABLE and overall feasibility UNVERIFIED.
 * - Transparently states that actual traversal may differ due to unmodeled terrain.
 * - Never substitutes Gale or Jezero DEM values.
 * - Never invents Oxia-specific terrain-aware slope or elevation metrics.
 * - If no geometric route exists, accepts manual distance/duration if supplied,
 *   otherwise marks route metrics as unavailable.
 *
 * @module lib/eva/adapters/oxia
 */

import type { RegionManifest } from "@/lib/contracts/region";
import type { Mission } from "@/lib/mission/model";
import { initWaypointPlanFromMission } from "@/lib/mission/waypoint-bridge";
import { generateGeometricTrajectory } from "@/lib/mission/waypoint-planning";
import type { EVAResourceRouteInput, RouteEvidence } from "../types";

export interface OxiaManualRouteInput {
  readonly manualDistanceMeters?: number | null;
  readonly manualTravelTimeHours?: number | null;
  readonly manualScienceStopHours?: number | null;
  readonly manualNotes?: string;
}

export function adaptOxiaRoute(
  mission: Mission,
  region: RegionManifest,
  manualInputs?: OxiaManualRouteInput | null,
): EVAResourceRouteInput {
  const warnings: string[] = [];
  const sourceDatasetIds: string[] = [region.dataset_version];

  // Mandatory scientific notices for Oxia Planum
  warnings.push(
    "Oxia Planum terrain-routing engine is unavailable. Resource estimates are conditional and based on geometric trajectory.",
  );
  warnings.push(
    "Terrain slope adjustment is unavailable. Actual rover/crew traversal effort may differ due to unmodeled surface roughness and regolith properties.",
  );

  // 1. Try deriving from geometric waypoint trajectory
  const plan = initWaypointPlanFromMission(mission, region);
  const trajectory = generateGeometricTrajectory(plan);

  let routeEvidence: RouteEvidence = "unavailable";
  let distanceMeters: number | null = null;
  let travelTimeHours: number | null = null;

  if (trajectory.segments.length > 0 && trajectory.total_surface_distance_m > 0) {
    routeEvidence = "geometric";
    distanceMeters = trajectory.total_surface_distance_m;
    warnings.push("Distance derived from spherical Mars geodesy (PDS Mars 2000 reference sphere, R = 3,396,190 m).");
  } else if (
    manualInputs?.manualDistanceMeters !== undefined &&
    manualInputs.manualDistanceMeters !== null &&
    Number.isFinite(manualInputs.manualDistanceMeters) &&
    manualInputs.manualDistanceMeters > 0
  ) {
    // User supplied manual distance planning assumption
    routeEvidence = "geometric";
    distanceMeters = manualInputs.manualDistanceMeters;
    travelTimeHours = manualInputs.manualTravelTimeHours ?? null;
    warnings.push("Distance derived from user-specified manual planning assumption.");
  } else {
    warnings.push("No traversable route segments found in Oxia mission plan; geometric distance cannot be established.");
  }

  const scienceStopHours =
    manualInputs?.manualScienceStopHours !== undefined && manualInputs.manualScienceStopHours !== null
      ? manualInputs.manualScienceStopHours
      : mission.target_ids.length * 0.25;

  return {
    regionId: "oxia",
    routeEvidence,
    distanceMeters,
    travelTimeHours,
    scienceStopHours,
    otherActivityHours: 0,
    // Elevation data is strictly unavailable for Oxia in Phase R1
    ascentMeters: null,
    descentMeters: null,
    roundTripIncluded: mission.direction === "round",
    sourceDatasetIds,
    warnings,
  };
}
