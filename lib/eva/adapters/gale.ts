/**
 * Gale Crater Regional Route Adapter for EVA Resource Planning.
 *
 * Implements Section 5 of the specification for Gale Crater:
 * - Adapts mission waypoints, terrain routing (when available), and science stops.
 * - When terrain routing is not yet integrated or calculated, derives geometric trajectory
 *   and explicitly reports evidence as "geometric".
 * - Never invents DEM slopes or elevations when absent.
 * - Preserves Gale REMS and RAD environmental data independence.
 *
 * @module lib/eva/adapters/gale
 */

import type { RegionManifest } from "@/lib/contracts/region";
import type { Mission } from "@/lib/mission/model";
import { initWaypointPlanFromMission } from "@/lib/mission/waypoint-bridge";
import { generateGeometricTrajectory } from "@/lib/mission/waypoint-planning";
import type { EVAResourceRouteInput, RouteEvidence } from "../types";

export interface TerrainRouteMetrics {
  readonly distanceMeters: number;
  readonly travelTimeHours?: number | null;
  readonly ascentMeters?: number | null;
  readonly descentMeters?: number | null;
  readonly sourceDatasetIds?: readonly string[];
  readonly warnings?: readonly string[];
}

export function adaptGaleRoute(
  mission: Mission,
  region: RegionManifest,
  terrainMetrics?: TerrainRouteMetrics | null,
): EVAResourceRouteInput {
  const warnings: string[] = [];
  const sourceDatasetIds: string[] = ["gale-curiosity-rems-rad", region.dataset_version];

  // 1. If terrain-derived metrics are provided by an integrated routing engine:
  if (terrainMetrics && Number.isFinite(terrainMetrics.distanceMeters) && terrainMetrics.distanceMeters > 0) {
    if (terrainMetrics.sourceDatasetIds) {
      sourceDatasetIds.push(...terrainMetrics.sourceDatasetIds);
    }
    if (terrainMetrics.warnings) {
      warnings.push(...terrainMetrics.warnings);
    }

    warnings.push("Gale terrain-derived traversal: subject to HiRISE/HRSC co-registration uncertainty.");

    // Calculate science stops
    const scienceStopHours = mission.target_ids.length * 0.25; // 15 min default per verified science stop

    return {
      regionId: "gale",
      routeEvidence: "terrain-derived",
      distanceMeters: terrainMetrics.distanceMeters,
      travelTimeHours: terrainMetrics.travelTimeHours ?? null,
      scienceStopHours,
      otherActivityHours: 0,
      ascentMeters: terrainMetrics.ascentMeters ?? null,
      descentMeters: terrainMetrics.descentMeters ?? null,
      roundTripIncluded: mission.direction === "round",
      sourceDatasetIds,
      warnings,
    };
  }

  // 2. Otherwise derive from geometric waypoint trajectory
  const plan = initWaypointPlanFromMission(mission, region);
  const trajectory = generateGeometricTrajectory(plan);

  let routeEvidence: RouteEvidence = "unavailable";
  let distanceMeters: number | null = null;

  if (trajectory.segments.length > 0 && trajectory.total_surface_distance_m > 0) {
    routeEvidence = "geometric";
    distanceMeters = trajectory.total_surface_distance_m;
    warnings.push(
      "Gale terrain-routing engine is not active for this plan. Trajectory is spherical geometric; terrain elevation, slope impedance, and rover wheel-slip are unmodeled.",
    );
  } else {
    warnings.push("No traversable route segments found in Gale mission plan.");
  }

  const scienceStopHours = mission.target_ids.length * 0.25;

  return {
    regionId: "gale",
    routeEvidence,
    distanceMeters,
    travelTimeHours: null,
    scienceStopHours,
    otherActivityHours: 0,
    roundTripIncluded: mission.direction === "round",
    sourceDatasetIds,
    warnings,
  };
}
