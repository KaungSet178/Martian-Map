import type { WaypointPlan } from "@/lib/mission/waypoint-planning";
import { calculateMissionTimeline } from "@/lib/mission/timeline";
import { calculateResourceBudget } from "@/lib/mission/resource-budget";
import type { TerrainRoute } from "./contracts";
export function terrainPlanningSummary(plan:WaypointPlan,route:TerrainRoute|null,inputs:Record<string,string>,reserves:{oxygen:number;battery:number}) {
  const value=(key:string)=>{const raw=inputs[key];if(!raw?.trim())return null;const parsed=Number(raw);return Number.isFinite(parsed)&&parsed>=0?parsed:null;};
  const speed=value("speed");
  if(!route || route.status==="unavailable" || !speed || route.segments.length !== plan.waypoints.length-(plan.mode==="round_trip"?0:1))return null;
  const timeline=calculateMissionTimeline({mode:plan.mode,waypoints:plan.waypoints,segments:route.segments.map((segment,i)=>({from_waypoint_id:plan.waypoints[i].id,to_waypoint_id:plan.waypoints[(i+1)%plan.waypoints.length].id,distance_metres:segment.distanceMeters,status:"SUPPORTED" as const,is_return_segment:plan.mode==="round_trip"&&i===plan.waypoints.length-1}))},{walking_speed_m_per_hour:speed,default_science_stop_duration_seconds:(value("scienceMinutes") || 0)*60});
  const oxygenCapacity=value("oxygenCapacity"),batteryCapacity=value("batteryCapacity");
  const resources=calculateResourceBudget({timeline,oxygen:{capacity_g:oxygenCapacity,travel_rate_g_per_hour:value("oxygenTravel"),stop_rate_g_per_hour:value("oxygenStop"),reserve_g:oxygenCapacity===null?null:oxygenCapacity*reserves.oxygen/100},battery:{capacity_wh:batteryCapacity,travel_power_w:value("batteryTravel"),stop_power_w:value("batteryStop"),reserve_wh:batteryCapacity===null?null:batteryCapacity*reserves.battery/100}});
  return {timeline:{...timeline,scientific_disclaimer:"Terrain-derived 3D distance; constant user-configured scenario speed. No validated slope impedance, physiology or environmental adjustment. Absolute registration unverified."},resources};
}
