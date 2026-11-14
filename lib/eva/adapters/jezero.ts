/**
 * Jezero Crater Regional Route Adapter for EVA Resource Planning.
 *
 * Implements Section 5 of the specification for Jezero Crater:
 * - Adapts mission waypoints, terrain routing (when available), and science stops.
 * - When terrain routing is not yet integrated or calculated, derives geometric trajectory
 *   and explicitly reports evidence as "geometric".
 * - Never invents DEM slopes or elevations when absent.
 * - Preserves Jezero Perseverance MEDA environmental data independence.
 * - Highlights Jezero delta rim slope barriers and HiRISE coverage boundaries.
 *
 * @module lib/eva/adapters/jezero
 */

import type { RegionManifest } from "@/lib/contracts/region";
import type { Mission } from "@/lib/mission/model";
import { initWaypointPlanFromMission } from "@/lib/mission/waypoint-bridge";
import { generateGeometricTrajectory } from "@/lib/mission/waypoint-planning";
import type { EVAResourceRouteInput, RouteEvidence } from "../types";
import type { TerrainRouteMetrics } from "./gale";

export function adaptJezeroRoute(
  mission: Mission,
  region: RegionManifest,
  terrainMetrics?: TerrainRouteMetrics | null,
): EVAResourceRouteInput {
  const warnings: string[] = [];
  const sourceDatasetIds: string[] = ["jezero-perseverance-meda", region.dataset_version];

  // 1. If terrain-derived metrics are provided by an integrated routing engine:
  if (terrainMetrics && Number.isFinite(terrainMetrics.distanceMeters) && terrainMetrics.distanceMeters > 0) {
    if (terrainMetrics.sourceDatasetIds) {
      sourceDatasetIds.push(...terrainMetrics.sourceDatasetIds);
    }
    if (terrainMetrics.warnings) {
      warnings.push(...terrainMetrics.warnings);
    }

    warnings.push("Jezero delta slope barriers and scarps are evaluated under regional DEM coverage.");

    const scienceStopHours = mission.target_ids.length * 0.25;

    return {
      regionId: "jezero",
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
      "Jezero terrain-routing engine is not active for this plan. Trajectory is spherical geometric; delta fan scarps, boulder fields, and slope barriers are unmodeled.",
    );
  } else {
    warnings.push("No traversable route segments found in Jezero mission plan.");
  }

  const scienceStopHours = mission.target_ids.length * 0.25;

  return {
    regionId: "jezero",
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
