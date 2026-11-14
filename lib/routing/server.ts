import { spawn } from "node:child_process";
import path from "node:path";
import { routeRequestSchema, ROUTING_VERSION, terrainResponseSchema, unavailableRoute, type TerrainRequest, type TerrainRoute } from "./contracts";
import { regions } from "@/lib/regions/registry";
import { parseGaleRoute } from "./gale/adapter";
import { terrainMetrics } from "./metrics";
import { marsDistance } from "@/lib/map/geodesy";
let running=0;
export function validateTerrainRequest(input:unknown): TerrainRequest {
  const request=routeRequestSchema.parse(input);
  if(request.plan.region_id !== request.regionId) throw new Error("Waypoint plan belongs to another region");
  if(request.regionId === "gale" && !request.datasetId.startsWith("gale-")) throw new Error("Wrong terrain source for Gale");
  if(request.regionId === "jezero" && request.datasetId !== "jezero-usgs-trn-dtm-routing-25m") throw new Error("Wrong terrain source for Jezero");
  if(new Set(request.plan.waypoints.map(waypoint=>waypoint.id)).size!==request.plan.waypoints.length)throw new Error("Waypoint IDs must be unique");
  for(const waypoint of request.plan.waypoints) {
    if(waypoint.target_id || waypoint.provenance === "verified_science_target") {
      const target=regions[request.regionId].targets.find(target=>target.id===waypoint.target_id);
      if(!target?.coordinate_verified || !target.coordinates || JSON.stringify(target.coordinates)!==JSON.stringify(waypoint.coordinates)) throw new Error("Unverified scientific target cannot be a routing endpoint");
    }
    const extent=regions[request.regionId].map.supported_extent;
    const {longitude_east:lon,latitude:lat}=waypoint.coordinates;
    if(extent && (lon<extent.west_east || lon>extent.east_east || lat<extent.south_latitude || lat>extent.north_latitude)) throw new Error("Manual waypoint outside the reviewed mission footprint");
  }
  return request;
}
function execute(command:string,args:string[],input:string,signal?:AbortSignal):Promise<string> {
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{cwd:process.cwd(),windowsHide:true,stdio:["pipe","pipe","pipe"],signal});
    let stdout="",stderr="";const timer=setTimeout(()=>child.kill(),45000);
    child.stdout.setEncoding("utf8");child.stderr.setEncoding("utf8");
    child.stdout.on("data",chunk=>{stdout+=chunk;if(stdout.length>16000000)child.kill();});
    child.stderr.on("data",chunk=>{stderr=(stderr+chunk).slice(-3000);});
    child.on("error",error=>{clearTimeout(timer);reject(error);});
    child.on("close",code=>{clearTimeout(timer);if(code===0)resolve(stdout);else reject(new Error(stderr.trim().split("\n").at(-1) || "Routing worker stopped or exceeded its 45 second limit"));});
    child.stdin.on("error",()=>{});child.stdin.end(input);
  });
}
// Native engine metadata is retained alongside canonical Mars 3D metrics.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(raw:any,request:TerrainRequest,preference:TerrainRoute["preference"]):TerrainRoute {
  if(request.regionId === "gale") raw=parseGaleRoute(raw);
  if(raw.status === "unavailable") {
    const reason=raw.failureReason || raw.failure?.message || "No route found within validated terrain coverage";
    const message=/no.*path|unreachable|no.*route/i.test(reason)?`No route found within validated terrain coverage. ${reason}`:reason;
    return {...unavailableRoute(request.regionId,preference,message),sourceDatasetIds:raw.sourceDatasetIds,sourceVerified:raw.sourceVerified,processingVerified:raw.processingVerified,warnings:[...raw.warnings,message],nativeMetrics:raw};
  }
  const requested=raw.requestedWaypoints as [number,number][], snapped=raw.snappedWaypoints as [number,number][];
  const snaps=snapped.map((p,i)=>marsDistance({longitude_east:p[0],latitude:p[1]},{longitude_east:requested[i][0],latitude:requested[i][1]}));
  if(snaps.some(d=>d>request.maxSnapMeters+0.01)) throw new Error("Engine exceeded actual waypoint snapping bound");
  // Preserve Python adapter extensions while its strict route schema validates scientific fields.
  const nativeSegments=raw.segments;
  const segments=nativeSegments.map((segment:{coordinates:[number,number][];elevationsMeters:number[]})=>({coordinates:segment.coordinates,...terrainMetrics(segment.coordinates,segment.elevationsMeters)}));
  const coordinates: [number,number][]=[],heights:number[]=[];
  nativeSegments.forEach((segment:{coordinates:[number,number][];elevationsMeters:number[]},i:number)=>{coordinates.push(...segment.coordinates.slice(i?1:0));heights.push(...segment.elevationsMeters.slice(i?1:0));});
  return {regionId:request.regionId,preference,status:"unverified",coordinates,segments,...terrainMetrics(coordinates,heights),requestedWaypoints:requested,snappedWaypoints:snapped,snapDistancesMeters:snaps,sourceDatasetIds:raw.sourceDatasetIds,sourceVerified:raw.sourceVerified,processingVerified:raw.processingVerified,registrationVerified:false,warnings:[...raw.warnings,"Canonical summary: 3D DEM distance on the Mars sphere; native engine metrics are retained separately. Not approved EVA navigation."],failureReason:null,nativeMetrics:raw};
}
export async function calculateTerrainRoutes(input:unknown,signal?:AbortSignal) {
  const request=validateTerrainRequest(input);
  if(request.regionId === "oxia") return {version:ROUTING_VERSION,alternatives:(["shortest","lower-terrain-cost"] as const).map(p=>unavailableRoute("oxia",p,"Terrain-aware routing is not yet available for Oxia Planum."))};
  if(running>=2) throw new Error("Routing workers are busy; retry after the current calculation");
  running++;
  try {
    const coordinates=request.plan.waypoints.map(w=>[w.coordinates.longitude_east,w.coordinates.latitude]);
    if(request.plan.mode === "round_trip") coordinates.push(coordinates[0]);
    const payload=JSON.stringify({...request,coordinates});
    const output=request.regionId === "gale"
      ? await execute(process.env.MARSWALK_PYTHON || "python",[path.join(process.cwd(),"scripts/gale-route-runtime.py")],payload,signal)
      : await execute(process.execPath,[path.join(process.cwd(),".routing/jezero-worker.cjs")],payload,signal);
    const native=JSON.parse(output);
    return terrainResponseSchema.parse({version:ROUTING_VERSION,alternatives:(["shortest","lower-terrain-cost"] as const).map(p=>normalize(native.alternatives[p],request,p))});
  } finally {running--;}
}
