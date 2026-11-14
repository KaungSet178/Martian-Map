"use client";
import { useEffect, useRef, useState } from "react";
import type { Mission } from "@/lib/mission/model";
import type { WaypointPlan } from "@/lib/mission/waypoint-planning";
import { ROUTING_VERSION, terrainResponseSchema, type TerrainRequest, type TerrainResponse, type TerrainPreference } from "./contracts";
import { terrainRequestKey } from "./request-key";
export { terrainRequestKey } from "./request-key";
export function useTerrainRouting(mission:Mission,plan:WaypointPlan,onChange:(change:Partial<Mission>)=>void) {
  const [settings,setSettings]=useState<{region:string;missionId:string;dataset:string;snap:number}>({region:mission.region,missionId:mission.id,dataset:mission.terrain_route?.datasetId || (mission.region === "gale"?"gale-hrsc-30m":"jezero-usgs-trn-dtm-routing-25m"),snap:mission.terrain_route?.maxSnapMeters ?? 100});
  const sameDraft=settings.region===mission.region && settings.missionId===mission.id;
  const dataset=sameDraft?settings.dataset:mission.terrain_route?.datasetId || (mission.region==="gale"?"gale-hrsc-30m":"jezero-usgs-trn-dtm-routing-25m");
  const snap=sameDraft?settings.snap:mission.terrain_route?.maxSnapMeters ?? 100;
  const key=terrainRequestKey(mission,plan,dataset,snap);
  const [state,setState]=useState<{key:string;status:"loading"|"ready"|"unavailable"|"idle";response?:TerrainResponse;error?:string;preference:TerrainPreference}>();
  const controller=useRef<AbortController|null>(null);
  const sequence=useRef(0);
  useEffect(()=>()=>{controller.current?.abort();sequence.current++;},[key]);
  const current=state?.key===key?state:undefined;
  const preference=current?.preference || mission.terrain_route?.preference || "shortest";
  const alternatives=current?.response?.alternatives || [];
  const selected=alternatives.find(route=>route.preference===preference && route.status!=="unavailable") || null;
  function select(next:TerrainPreference) {
    setState(previous=>previous?.key===key?{...previous,preference:next}:previous);
    onChange({terrain_route:{version:ROUTING_VERSION,requestKey:key,preference:next,datasetId:dataset,maxSnapMeters:snap}});
  }
  async function calculate() {
    controller.current?.abort();const abort=new AbortController();controller.current=abort;const token=++sequence.current;
    setState({key,status:"loading",preference});
    try {
      const request:TerrainRequest={regionId:mission.region,plan,datasetId:dataset as TerrainRequest["datasetId"],maxSnapMeters:snap};
      const response=await fetch("/api/terrain-route",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(request),signal:abort.signal});
      const body=await response.json();if(!response.ok)throw new Error(body.error || "Terrain routing unavailable");
      const parsed=terrainResponseSchema.parse(body);
      if(abort.signal.aborted || token!==sequence.current)return;
      const chosen=parsed.alternatives.find(route=>route.preference===preference && route.status!=="unavailable")?.preference || parsed.alternatives.find(route=>route.status!=="unavailable")?.preference || preference;
      setState({key,status:parsed.alternatives.some(route=>route.status!=="unavailable")?"ready":"unavailable",response:parsed,preference:chosen});
      onChange({terrain_route:{version:parsed.version,requestKey:key,preference:chosen,datasetId:dataset,maxSnapMeters:snap}});
    } catch(error) {
      if(abort.signal.aborted || token!==sequence.current)return;
      setState({key,status:"unavailable",preference,error:error instanceof Error?error.message:"Terrain routing unavailable"});
    }
  }
  function invalidate(target:Mission){
    controller.current?.abort();sequence.current++;setState(undefined);
    setSettings({region:target.region,missionId:target.id,dataset:target.terrain_route?.datasetId || (target.region==="gale"?"gale-hrsc-30m":"jezero-usgs-trn-dtm-routing-25m"),snap:target.terrain_route?.maxSnapMeters ?? 100});
  }
  function clear(){controller.current?.abort();sequence.current++;setState({key,status:"idle",preference});onChange({terrain_route:undefined});}
  return {key,dataset,snap,preference,alternatives,selected,status:current?.status || "idle",error:current?.error,calculate,clear,invalidate,select,
    setDataset:(value:string)=>setSettings({region:mission.region,missionId:mission.id,dataset:value,snap}),
    setSnap:(value:number)=>setSettings({region:mission.region,missionId:mission.id,dataset,snap:value}),
    hideGeometric:!!current && current.status!=="idle"};
}
export type TerrainRoutingState=ReturnType<typeof useTerrainRouting>;
