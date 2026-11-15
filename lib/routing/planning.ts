import { generateGeometricTrajectory, validateWaypointPlan, type WaypointPlan } from "@/lib/mission/waypoint-planning";
import { calculateMissionTimeline } from "@/lib/mission/timeline";
import { estimateEVAResources, legacyNumber } from "@/lib/eva/estimate";
import type { EVAConfig } from "@/lib/eva/config";
import type { TerrainRoute } from "./contracts";
/** Canonical route-to-timeline adapter. Return geometry is already included, never doubled. */
export function terrainPlanningSummary(plan:WaypointPlan,route:TerrainRoute|null,inputs:Record<string,string>,reserves:{oxygen:number;battery:number},config?:EVAConfig) {
  const geometric=plan.region_id==="oxia";
  const segments=geometric?generateGeometricTrajectory(plan).segments.map(s=>({distanceMeters:s.surface_distance_m})):route?.segments;
  const valid=validateWaypointPlan(plan).valid && !plan.waypoints.some(w=>w.inactive_reason) && segments?.length===plan.waypoints.length-(plan.mode==="round_trip"?0:1) && (geometric || route && route.status!=="unavailable" && route.regionId===plan.region_id);
  const speed=legacyNumber(inputs,"speed"),fallback=legacyNumber(inputs,"scienceMinutes");
  const missingStops=plan.waypoints.some(w=>w.role==="science_stop"&&w.stop_duration_seconds===undefined&&fallback===null);
  const timeline=valid&&speed!==null&&speed>0&&segments?calculateMissionTimeline({mode:plan.mode,waypoints:plan.waypoints,segments:segments.map((s,i)=>({from_waypoint_id:plan.waypoints[i].id,to_waypoint_id:plan.waypoints[(i+1)%plan.waypoints.length].id,distance_metres:s.distanceMeters,status:"SUPPORTED" as const,is_return_segment:plan.mode==="round_trip"&&i===plan.waypoints.length-1}))},{walking_speed_m_per_hour:speed,default_science_stop_duration_seconds:(fallback??0)*60,waypoint_stop_durations_seconds:Object.fromEntries(plan.waypoints.filter(w=>w.stop_duration_seconds!==undefined).map(w=>[w.id,w.stop_duration_seconds!]))}):null;
  const resources=estimateEVAResources({travelSeconds:timeline?.total_travel_seconds??null,stopSeconds:missingStops?null:timeline?.total_stop_seconds??null,legacy:inputs,oxygenHoldbackPercent:reserves.oxygen,batteryHoldbackPercent:reserves.battery,config});
  return {timeline,resources,routeBasis:geometric?"geometric-only estimate; terrain unavailable":valid?"current selected terrain-derived 3D distance":"no valid route; recomputation required",
    distanceMeters:valid?segments?.reduce((s,l)=>s+l.distanceMeters,0)??null:null,
    sourceDatasetIds:geometric?[]:route?.sourceDatasetIds??[],sourceVerified:geometric?false:route?.sourceVerified??false,processingVerified:geometric?false:route?.processingVerified??false,registrationVerified:false,
    speedMetersPerHour:speed, roundTripIncluded:plan.mode==="round_trip",
    scienceSeconds:missingStops?null:plan.waypoints.filter(w=>w.role==="science_stop").reduce((sum,w)=>sum+(w.stop_duration_seconds??(fallback??0)*60),0),
    returnTravelSeconds:timeline?.segments.find(s=>s.is_return_segment)?.travel_duration_seconds??(plan.mode==="one_way"?0:null),
    ascentMeters:geometric?null:route?.ascentMeters??null,descentMeters:geometric?null:route?.descentMeters??null};
}
export type EVAPlanningAssessment=ReturnType<typeof terrainPlanningSummary>;
