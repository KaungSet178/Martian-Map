import type { Mission } from "./model";
import type { RegionManifest } from "@/lib/contracts/region";
import { initWaypointPlanFromMission, syncMissionWithWaypointPlan } from "./waypoint-bridge";
import { calculateDistanceSummary, generateGeometricTrajectory, validateWaypointPlan, targetWaypointEvidence } from "./waypoint-planning";
import { terrainRequestKey } from "@/lib/routing/request-key";
import { ROUTING_VERSION, type TerrainRoute } from "@/lib/routing/contracts";
import { terrainPlanningSummary } from "@/lib/routing/planning";

export function coordinateText(coordinates: {latitude:number;longitude_east:number} | null): string {
  return coordinates ? `${coordinates.latitude}° N, ${coordinates.longitude_east}° E` : "Not designated";
}

/** Raw stored values are displayed without padding; digits never imply surveyed precision. */
export function evidenceText(evidence?: ReturnType<typeof targetWaypointEvidence>, userDefined = false): string {
  if (userDefined) return "User-defined waypoint · Registration unverified · Positional uncertainty unavailable";
  if (!evidence) return "Evidence unavailable · Registration unverified";
  const verified = (value: boolean | null) => value === true ? "verified" : value === false ? "unverified" : "unverified (not independently established)";
  const representation = {point:"Point",mapped_area:"Mapped area",approximate_area:"Approximate area",unavailable:"Location unavailable"}[evidence.representation];
  return `${evidence.classification} · ${representation} · Source ${verified(evidence.source_verified)} · Processing ${verified(evidence.processing_verified)} · Coordinate ${verified(evidence.coordinate_verified)} · Registration ${verified(evidence.registration_verified)} · Positional uncertainty ${evidence.positional_uncertainty_m === null ? "unavailable" : `${evidence.positional_uncertainty_m} m`} · Routing ${evidence.routing_eligible ? "catalog eligible; registration unverified" : "unavailable"}`;
}

/** Live outputs are accepted only against the current mission receipt and endpoint sequence. */
export function currentTerrainRoute(mission: Mission, region: RegionManifest, route?: TerrainRoute | null): TerrainRoute | null {
  if (mission.region !== region.id || !route || route.status === "unavailable" || route.regionId !== region.id || region.id === "oxia") return null;
  const plan = initWaypointPlanFromMission(mission, region);
  const receipt = mission.terrain_route;
  if (!receipt || receipt.version !== ROUTING_VERSION || receipt.preference !== route.preference || receipt.requestKey !== terrainRequestKey(mission, plan, receipt.datasetId, receipt.maxSnapMeters ?? 100)) return null;
  const requiredSources = receipt.datasetId === "jezero-usgs-trn-dtm-routing-25m" ? ["jezero-usgs-trn-dtm", "jezero-hirise-soc-006"] : [receipt.datasetId];
  if (!requiredSources.every(id => route.sourceDatasetIds.includes(id))) return null;
  const requested = plan.waypoints.map(w => [w.coordinates.longitude_east, w.coordinates.latitude]);
  if (plan.mode === "round_trip" && requested.length) requested.push(requested[0]);
  if (JSON.stringify(requested) !== JSON.stringify(route.requestedWaypoints)) return null;
  return route;
}

/** One derived contract for Review, brief, mission summaries and persisted planning inputs.
 * Computed geometry/results are deliberately absent from snapshot.mission.
 */
export function missionPlanningSnapshot(mission: Mission, region: RegionManifest, liveRoute?: TerrainRoute | null) {
  const plan = initWaypointPlanFromMission(mission, region);
  const canonical = syncMissionWithWaypointPlan(mission, plan, region);
  const trajectory = generateGeometricTrajectory(plan);
  const terrain = currentTerrainRoute(mission, region, liveRoute);
  const assumptions = mission.terrain_assumptions ?? {};
  const defaultMinutes = assumptions.scienceMinutes?.trim() ? Number(assumptions.scienceMinutes) : null;
  const itinerary = plan.waypoints.map(w => ({
    ...w,
    coordinate_text: coordinateText(w.coordinates),
    evidence_text: (w.target_id && !region.targets.some(t => t.id === w.target_id) ? "Retired or unavailable catalog target · Not a route destination · " : "") + evidenceText(w.evidence, w.provenance === "user_planning_input" && !w.target_id),
    precision_disclosure: w.evidence?.precision_disclosure ?? "User planning coordinates; accuracy, positional uncertainty and absolute registration unverified.",
    stop_seconds: w.stop_duration_seconds ?? (w.role === "science_stop" && defaultMinutes !== null && Number.isFinite(defaultMinutes) && defaultMinutes >= 0 ? defaultMinutes * 60 : null),
  }));
  const objectives = mission.target_ids.flatMap(id => {
    const target = region.targets.find(t => t.id === id);
    if (!target) return [];
    const planning_evidence = targetWaypointEvidence(target);
    return [{...target, planning_evidence, evidence_text:evidenceText(planning_evidence), location_disclosure:planning_evidence.precision_disclosure, is_waypoint:itinerary.some(w => w.target_id === id)}];
  });
  const retiredObjectives = mission.target_ids.filter(id => !region.targets.some(t => t.id === id)).map(id => ({id,title:mission.retired_objectives?.find(t => t.id === id)?.title ?? id,reason:mission.retired_objectives?.find(t => t.id === id)?.reason ?? "Retired or unavailable objective; retained for historical context. Not a route destination."}));
  const bases = itinerary.filter(w => w.role === "base");
  const ends = itinerary.filter(w => w.role === "destination" || w.role === "recovery_endpoint");
  const counts = { objectives: mission.target_ids.length, waypoints: itinerary.length, science_stops: itinerary.filter(w => w.role === "science_stop" || w.target_id).length };
  const countLabel = `${counts.objectives} ${counts.objectives === 1 ? "objective" : "objectives"} · ${counts.waypoints} ${counts.waypoints === 1 ? "waypoint" : "waypoints"} · ${counts.science_stops} science ${counts.science_stops === 1 ? "stop" : "stops"}`;
  return {
    mission: canonical, plan, itinerary, objectives, retiredObjectives, counts, countLabel,
    start: bases.length === 1 ? bases[0] : null,
    destination: plan.mode === "round_trip" ? (bases.length === 1 ? bases[0] : null) : (ends.length === 1 ? ends[0] : null),
    validation: validateWaypointPlan(plan),
    geometric: { available: !plan.waypoints.some(w => w.inactive_reason) && plan.waypoints.length >= 2, ...calculateDistanceSummary(trajectory), label:trajectory.scientific_label, segments:trajectory.segments },
    terrain,
    scenario: terrainPlanningSummary(plan, terrain, assumptions, {oxygen:mission.oxygen_reserve_percent,battery:mission.battery_reserve_percent}, mission.eva_config),
    assumptions,
    evaInputIdentity: JSON.stringify([mission.id, mission.region, mission.dataset_version, mission.terrain_route ?? null, plan, assumptions, mission.eva_config ?? null, mission.oxygen_reserve_percent, mission.battery_reserve_percent]),
    operational: "Certified route safety, astronaut trafficability, radiation exposure limits, full life-support validation and recovery authorization remain unavailable. Research estimates do not provide operational clearance.",
  };
}
export type MissionPlanningSnapshot = ReturnType<typeof missionPlanningSnapshot>;
