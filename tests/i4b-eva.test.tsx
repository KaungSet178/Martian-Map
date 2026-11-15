import {test} from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {mkdirSync,writeFileSync} from "node:fs";
import {estimateEVAResources,type EVAInput} from "../lib/eva/estimate";
import {evaConfigSchema,type EVAConfig} from "../lib/eva/config";
import {EVA_PROFILES} from "../lib/eva/profiles";
import {evaAssessmentRows} from "../lib/eva/presentation";
import {regions} from "../lib/regions/registry";
import {newMission,parseMission,readMissions,saveMission} from "../lib/mission/model";
import {createWaypoint,createWaypointPlan} from "../lib/mission/waypoint-planning";
import {syncMissionWithWaypointPlan,applyMissionChange} from "../lib/mission/waypoint-bridge";
import {missionPlanningSnapshot} from "../lib/mission/planning-snapshot";
import {terrainRequestKey} from "../lib/routing/request-key";
import {ROUTING_VERSION} from "../lib/routing/contracts";
import {calculateTerrainRoutes} from "../lib/routing/server";
import {PlanningSummary} from "../components/mission/planning-summary";
import {briefHtml} from "../components/mission/brief";
const close=(actual:number|null,expected:number)=>{assert.notEqual(actual,null);assert.ok(Math.abs(actual!-expected)<1e-9,`${actual} != ${expected}`);};
function run(config:Partial<EVAConfig>={},extra:Partial<EVAInput>={}) {return estimateEVAResources({travelSeconds:7200,stopSeconds:3600,legacy:{},oxygenHoldbackPercent:0,batteryHoldbackPercent:0,config:{profileId:"bvad-reference",...config},...extra});}
test("independent three-hour BVAD scenario separates metabolic and leakage; dimensional checks",()=>{
 const r=run({electricalWatts:80});close(r.oxygen.metabolicKg,.228);close(r.oxygen.leakageKg,.015);close(r.oxygen.required,.243);close(r.battery.required,240);close(r.water.required,1.71);assert.equal(r.oxygen.capacityStatus,"missing-capacity");
 close(run({}, {travelSeconds:3600,stopSeconds:0}).oxygen.required,.081);close(run({}, {travelSeconds:1800,stopSeconds:0}).oxygen.required,.0405);
});
test("time and resource reserve bases are explicit and never counted twice",()=>{
 const r=run({electricalWatts:80,emergencySeconds:1800,delaySeconds:1800,oxygenMarginPercent:20,batteryMarginPercent:25,waterMarginPercent:10,oxygenCapacityKg:1,batteryCapacityWh:1000,waterCapacityKg:5},{oxygenHoldbackPercent:25,batteryHoldbackPercent:30});
 close(r.timeline.baselineSeconds,12600);close(r.timeline.totalSeconds,14400);
 close(r.oxygen.baseline,.2835);close(r.oxygen.timeReserve,.0405);close(r.oxygen.consumptionMargin,.0648);close(r.oxygen.required,.3888);close(r.oxygen.remaining,.3612);
 close(r.battery.baseline,280);close(r.battery.timeReserve,40);close(r.battery.consumptionMargin,80);close(r.battery.required,400);close(r.battery.remaining,300);close(r.water.required,2.508);
});
for(const [capacity,state] of [[239,"insufficient-under-assumptions"],[240,"sufficient-under-assumptions"],[241,"sufficient-under-assumptions"]] as const)test(`battery ${capacity} Wh capacity boundary`,()=>{const r=run({electricalWatts:80,batteryCapacityWh:capacity});assert.equal(r.battery.capacityStatus,state);close(r.battery.remaining,capacity-240);});
test("missing power never becomes zero; missing capacity does not erase demand",()=>{
 assert.equal(run({batteryCapacityWh:500}).battery.required,null);const r=run({electricalWatts:80});close(r.battery.required,240);assert.equal(r.battery.remaining,null);assert.equal(r.battery.capacityStatus,"missing-capacity");
});
test("non-venting zero is conditional; recirculation is not water consumption",()=>{const r=run({coolingArchitecture:"non-venting",waterCapacityKg:0});close(r.water.required,0);close(r.water.remaining,0);assert.equal(r.water.capacityStatus,"sufficient-under-assumptions");assert.match(r.limitations,/thermal feasibility/);});
test("unknown cooling architecture does not accept a rate without architecture",()=>{assert.equal(run({coolingArchitecture:"unknown",coolingKgPerHour:.57}).water.required,null);});
test("custom and Apollo profiles supply no invented rates or capacities",()=>{
 for(const profileId of ["custom","apollo-historical"] as const){const r=run({profileId});assert.equal(r.oxygen.required,null);assert.equal(r.battery.required,null);assert.equal(r.water.required,null);assert.equal(EVA_PROFILES[profileId].metabolic,null);}
 const r=run({profileId:"custom",metabolicKgPerHour:.1,leakageKgPerHour:.01,coolingArchitecture:"venting",coolingKgPerHour:.2,electricalWatts:40});close(r.oxygen.required,.33);close(r.battery.required,120);close(r.water.required,.6);
});
test("explicit unknown override clears a profile coefficient",()=>{assert.equal(run({metabolicKgPerHour:null}).oxygen.required,null);assert.equal(run({coolingKgPerHour:null}).water.required,null);});
for(const bad of [-1,NaN,Infinity,-Infinity,1e100])for(const field of ["metabolicKgPerHour","electricalWatts","oxygenCapacityKg","emergencySeconds","oxygenMarginPercent"] as const)test(`reject ${field}=${bad}`,()=>{
 assert.equal(evaConfigSchema.safeParse({profileId:"custom",[field]:bad}).success,false);assert.equal(run({[field]:bad}).oxygen.required,null);
});
for(const bad of [-1,NaN,Infinity,null])test(`invalid mandatory duration ${bad} blocks all resources`,()=>{const r=run({electricalWatts:80},{travelSeconds:bad});assert.equal(r.oxygen.required,null);assert.equal(r.battery.required,null);assert.equal(r.water.required,null);});
test("zero duration and explicit zero coefficients remain valid arithmetic",()=>{const r=run({electricalWatts:0},{travelSeconds:0,stopSeconds:0});close(r.oxygen.required,0);close(r.battery.required,0);});
function plan(id:"gale"|"jezero"|"oxia",round=true){
 const coords=id==="gale"?[[137.38,-4.72],[137.4,-4.74],[137.39,-4.75]]:id==="jezero"?[[77.450886,18.444627],[77.38,18.455],[77.43,18.435]]:[[335.4,18.2],[335.41,18.21],[335.42,18.22]];
 return createWaypointPlan({region_id:id,mode:round?"round_trip":"one_way",recovery_assumption:"User rendezvous assumption",waypoints:coords.map(([longitude_east,latitude],i)=>createWaypoint({id:`i4b-${i}`,label:`I4B ${i}`,role:i===0?"base":!round&&i===2?"destination":"science_stop",coordinates:{longitude_east,latitude},provenance:"user_planning_input",stop_duration_seconds:i===0?0:i===1?600:1200}))});
}
test("Oxia geometric one-way/return and multiple stops share duration without inventing terrain",()=>{
 for(const round of [false,true]){
  const p=plan("oxia",round),mission={...syncMissionWithWaypointPlan(newMission(regions.oxia),p,regions.oxia),terrain_assumptions:{speed:"1000"},eva_config:{profileId:"bvad-reference" as const}};
  const s=missionPlanningSnapshot(mission,regions.oxia);assert.match(s.scenario.routeBasis,/geometric-only/);assert.equal(s.terrain,null);assert.equal(s.scenario.ascentMeters,null);close(s.scenario.resources.timeline.stopSeconds,1800);
  close(s.scenario.resources.timeline.travelSeconds,s.geometric.total_surface_distance_m/1000*3600);assert.equal(s.scenario.timeline!.segments.length,round?3:2);
  const faster=missionPlanningSnapshot({...mission,terrain_assumptions:{speed:"2000"}},regions.oxia);close(faster.scenario.resources.timeline.travelSeconds,s.scenario.resources.timeline.travelSeconds!/2);
 }
});
test("missing walking speed and missing science duration fail closed; explicit zero works",()=>{
 const p=plan("oxia");delete p.waypoints[1].stop_duration_seconds;
 const m={...syncMissionWithWaypointPlan(newMission(regions.oxia),p,regions.oxia),eva_config:{profileId:"bvad-reference" as const}};
 assert.equal(missionPlanningSnapshot(m,regions.oxia).scenario.resources.oxygen.required,null);
 const withSpeed={...m,terrain_assumptions:{speed:"1000"}};assert.equal(missionPlanningSnapshot(withSpeed,regions.oxia).scenario.resources.oxygen.required,null);
 assert.ok(missionPlanningSnapshot({...m,terrain_assumptions:{speed:"1000",scienceMinutes:"0"}},regions.oxia).scenario.resources.oxygen.required!>0);
});
for(const id of ["gale","jezero"] as const)test(`I4B ${id} authentic selected route, inputs, reopen, stale guards and shared export`,async()=>{
 const p=plan(id),region=regions[id],datasetId=id==="gale"?"gale-hrsc-30m":"jezero-usgs-trn-dtm-routing-25m";
 const response=await calculateTerrainRoutes({regionId:id,plan:p,datasetId,maxSnapMeters:100});
 const m={...syncMissionWithWaypointPlan(newMission(region),p,region),terrain_assumptions:{speed:"1000"},eva_config:{profileId:"bvad-reference" as const,electricalWatts:80,emergencySeconds:1800}};
 const outputs=[];
 for(const route of response.alternatives){
  assert.equal(route.status,"unverified");const mission={...m,terrain_route:{version:ROUTING_VERSION,requestKey:terrainRequestKey(m,p,datasetId,100),datasetId,preference:route.preference}};
  const s=missionPlanningSnapshot(mission,region,route),r=s.scenario.resources;assert.equal(s.terrain,route);
  const hours=route.segments.reduce((sum,l)=>sum+l.distanceMeters,0)/1000+.5+.5;
  close(r.oxygen.required,hours*.081);close(r.battery.required,hours*80);close(r.water.required,hours*.57);close(r.timeline.stopSeconds,1800);
  const html=briefHtml(mission,region,"2026-11-15",route),ui=renderToStaticMarkup(<PlanningSummary snapshot={s}/>);
  assert.equal(new Map(evaAssessmentRows(s.scenario)).get("Metabolic oxygen coefficient"),"0.0760 kg/h");
  assert.equal(new Map(evaAssessmentRows(s.scenario)).get("Modeled leakage coefficient"),"0.0050 kg/h");
  for(const [label,value] of evaAssessmentRows(s.scenario)){assert.ok(html.includes(label));assert.ok(ui.includes(label));if(label.endsWith("total required")){assert.ok(html.includes(value));assert.ok(ui.includes(value));}}
  const changed=applyMissionChange(mission,{eva_config:{...mission.eva_config,electricalWatts:160}},region);assert.deepEqual(changed.terrain_route,mission.terrain_route);close(missionPlanningSnapshot(changed,region,route).scenario.resources.battery.required,r.battery.required!*2);
  const durationPlan={...p,waypoints:p.waypoints.map((w,i)=>i===1?{...w,stop_duration_seconds:0}:w)};
  const durationChanged=applyMissionChange(mission,{waypoint_plan:durationPlan},region);assert.deepEqual(durationChanged.terrain_route,mission.terrain_route);close(missionPlanningSnapshot(durationChanged,region,route).scenario.resources.timeline.stopSeconds,1200);
  const moved=applyMissionChange(mission,{waypoint_plan:{...p,waypoints:p.waypoints.map((w,i)=>i===1?{...w,coordinates:{...w.coordinates,latitude:w.coordinates.latitude+.001}}:w)}},region);assert.equal(moved.terrain_route,undefined);assert.equal(missionPlanningSnapshot(moved,region,route).scenario.resources.oxygen.required,null);
  for(const invalid of [{...mission,id:"other"},{...mission,terrain_route:{...mission.terrain_route,requestKey:"stale"}},{...mission,terrain_route:{...mission.terrain_route,datasetId:"wrong-source"}},{...mission,terrain_route:{...mission.terrain_route,preference:route.preference==="shortest"?"lower-terrain-cost" as const:"shortest" as const}}])assert.equal(missionPlanningSnapshot(invalid,region,route).scenario.resources.oxygen.required,null);
  const store=new Map<string,string>(),storage={getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>{store.set(k,v);}};
  saveMission(storage,mission);const saved=readMissions(storage)[0],opened=parseMission(JSON.parse(JSON.stringify(saved)),region);assert.deepEqual(opened.eva_config,mission.eva_config);assert.equal(missionPlanningSnapshot(opened,region).scenario.resources.oxygen.required,null);assert.ok(!JSON.stringify(saved).includes('"required"'));close(missionPlanningSnapshot(opened,region,route).scenario.resources.oxygen.required,r.oxygen.required!);
  outputs.push({preference:route.preference,distance:route.distanceMeters,assessment:s.scenario});
 }
 mkdirSync("docs/evidence/i4b",{recursive:true});writeFileSync(`docs/evidence/i4b/${id}-eva.json`,JSON.stringify({request:{regionId:id,plan:p,datasetId,maxSnapMeters:100},response,outputs},null,2)+"\n");
});


for(const id of ["gale","jezero"] as const)test(`I4B ${id} one-way response survives canonical recovery-note synchronization`,async()=>{
 const region=regions[id],p=plan(id,false),datasetId=id==="gale"?"gale-hrsc-30m":"jezero-usgs-trn-dtm-routing-25m";
 const m={...syncMissionWithWaypointPlan(newMission(region),p,region),terrain_assumptions:{speed:"1000"},eva_config:{profileId:"bvad-reference" as const}};
 assert.equal(p.waypoints.at(-1)!.notes,undefined);
 const response=await calculateTerrainRoutes({regionId:id,plan:p,datasetId,maxSnapMeters:100}),route=response.alternatives[0];
 const key=terrainRequestKey(m,p,datasetId,100);
 const received=applyMissionChange(m,{terrain_route:{version:response.version,requestKey:key,datasetId,preference:route.preference,maxSnapMeters:100}},region);
 assert.equal(received.waypoint_plan!.waypoints.at(-1)!.notes,"User rendezvous assumption");
 assert.ok(received.terrain_route,"Receipt must survive copying recovery notes");
 const snapshot=missionPlanningSnapshot(received,region,route);
 assert.equal(snapshot.terrain,route);close(snapshot.scenario.resources.timeline.travelSeconds,route.distanceMeters!*3.6);close(snapshot.scenario.returnTravelSeconds,0);
 assert.equal(route.segments.length,2);assert.ok(snapshot.scenario.resources.oxygen.required!>0);
 const edited={...p,waypoints:p.waypoints.map(w=>({...w,label:"Renamed",notes:"Changed notes",stop_duration_seconds:0}))};
 assert.equal(terrainRequestKey(m,edited,datasetId,100),key);
 const moved={...p,waypoints:p.waypoints.map((w,i)=>i===1?{...w,coordinates:{...w.coordinates,latitude:w.coordinates.latitude+.001}}:w)};
 assert.notEqual(terrainRequestKey(m,moved,datasetId,100),key);
});
test("invalid capacity holdbacks fail closed",()=>{for(const percent of [-1,NaN,Infinity,101]){const r=run({electricalWatts:80},{oxygenHoldbackPercent:percent});assert.equal(r.oxygen.required,null);assert.equal(r.battery.required,null);}});
