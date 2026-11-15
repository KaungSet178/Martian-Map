import {test} from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {mkdirSync,writeFileSync,readFileSync} from "node:fs";
import {regions} from "../lib/regions/registry";
import {newMission,parseMission,saveMission,readMissions} from "../lib/mission/model";
import {applyMissionChange,syncMissionWithWaypointPlan} from "../lib/mission/waypoint-bridge";
import {createWaypoint,createWaypointPlan,createWaypointFromTarget,targetWaypointEvidence} from "../lib/mission/waypoint-planning";
import {missionPlanningSnapshot} from "../lib/mission/planning-snapshot";
import {briefHtml} from "../components/mission/brief";
import {PlanningSummary} from "../components/mission/planning-summary";
import {WaypointItinerary} from "../components/mission/waypoint-itinerary";
import {TargetDetails} from "../components/science/catalog";
import {calculateTerrainRoutes,validateTerrainRequest} from "../lib/routing/server";
import {threeForksSite} from "../regions/location-evidence";

const cases = [["gale","gale-glen-torridon"],["gale","gale-gediz-vallis"],["jezero","jezero-objective-3"],["jezero","jezero-objective-5"],["oxia","oxia-objective-1"],["oxia","oxia-objective-2"]] as const;
for(const [id,targetId] of cases)test(`I4A ${targetId}: source, selection, snapshot, storage, JSON, Review and HTML agree`,()=>{
 const region=regions[id],target=region.targets.find(t=>t.id===targetId)!;
 let mission=applyMissionChange(newMission(region),{target_ids:[targetId]},region);
 const store=new Map<string,string>();const storage={getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>{store.set(k,v);}};
 saveMission(storage,mission);mission=parseMission(JSON.parse(JSON.stringify(readMissions(storage)[0])),region);
 const snapshot=missionPlanningSnapshot(mission,region),objective=snapshot.objectives[0],evidence=objective.planning_evidence;
 assert.equal(evidence.classification,target.evidence);assert.deepEqual(evidence.source_ids,target.source_ids);
 assert.equal(evidence.coordinate_verified,target.coordinate_verified);assert.equal(evidence.source_verified,null);assert.equal(evidence.processing_verified,null);
 assert.equal(evidence.registration_verified,false);assert.equal(evidence.positional_uncertainty_m,null);assert.equal(evidence.routing_eligible,false);
 assert.equal(snapshot.itinerary.length,target.coordinates?1:0);
 if(target.coordinates){assert.deepEqual(snapshot.itinerary[0].coordinates,target.coordinates);assert.deepEqual(snapshot.itinerary[0].evidence,evidence);}
 const outputs=[briefHtml(mission,region,"2026-11-15"),renderToStaticMarkup(<PlanningSummary snapshot={snapshot}/>),renderToStaticMarkup(<WaypointItinerary plan={snapshot.plan}/>),renderToStaticMarkup(<TargetDetails target={target} region={region} added onToggle={()=>{}}/>)];
 for(const output of outputs.filter((_,i)=>i!==2||!!target.coordinates)){assert.match(output,/Interpreted/);assert.doesNotMatch(output,/Observed.*NASA Target/);assert.match(output,/Registration unverified|registration: unverified/);}
 if(targetId==="jezero-objective-3"){
  assert.equal(objective.coordinates,null);assert.equal(evidence.representation,"unavailable");assert.equal(evidence.source_verified,null);
  assert.match(outputs[0],/landing-circle center \(not the tube depot\)/);assert.match(outputs[1],/landing-circle radius is not coordinate uncertainty/);
  assert.equal(snapshot.itinerary.length,0);assert.equal(region.targets.some(t=>t.id===threeForksSite.id),false);
 }
});
test("I4A missing evidence dimensions stay unknown and Scenario/user-defined remain distinct",()=>{
 const synthetic={...regions.oxia.targets[0],id:"oxia-unreviewed-test",source_ids:[],coordinate_verified:false,coordinates:null,verification:"pending" as const,evidence:"Scenario" as const};
 const e=targetWaypointEvidence(synthetic);assert.equal(e.source_verified,null);assert.equal(e.processing_verified,null);assert.equal(e.registration_verified,null);assert.equal(e.positional_uncertainty_m,null);assert.equal(e.classification,"Scenario");
 const m=applyMissionChange(newMission(regions.gale),{target_ids:["gale-objective-1"]},regions.gale);
 assert.equal(missionPlanningSnapshot(m,regions.gale).objectives[0].planning_evidence.classification,"Scenario");
});
function plan(id:"gale"|"jezero"|"oxia",points:number[][],round=true){return createWaypointPlan({region_id:id,name:"I4A manual research probes",mode:round?"round_trip":"one_way",waypoints:points.map(([longitude_east,latitude],i)=>createWaypoint({id:`i4a-${i}`,label:`Manual probe ${i}`,role:i===0?"base":!round&&i===points.length-1?"destination":"science_stop",coordinates:{longitude_east,latitude},provenance:"user_planning_input",stop_duration_seconds:i===1?123:0}))});}
test("I4A legacy same-region references preserve unrelated points, foreign references in all saved fields reject",()=>{
 const region=regions.gale,manual=plan("gale",[[137.38,-4.72],[137.4,-4.74],[137.39,-4.75]]);
 const mission=syncMissionWithWaypointPlan(newMission(region),manual,region);
 for(const foreign of ["jezero-objective-3","oxia-old-unit"]){
  assert.throws(()=>parseMission({...mission,target_ids:[foreign]},region),/region|objective/);
  assert.throws(()=>parseMission({...mission,waypoint_plan:{...manual,waypoints:manual.waypoints.map((w,i)=>i===1?{...w,target_id:foreign}:w)}},region),/region|objective/);
  assert.throws(()=>parseMission({...mission,retired_objectives:[{id:foreign,reason:"historical"}]},region),/region|objective/);
 }
 const historical={...mission,target_ids:["gale-old-unit"],waypoint_plan:{...manual,waypoints:manual.waypoints.map((w,i)=>i===1?{...w,target_id:"gale-old-unit",provenance:"verified_science_target" as const}:w)}};
 const reopened=parseMission(JSON.parse(JSON.stringify(historical)),region),snapshot=missionPlanningSnapshot(reopened,region);
 assert.equal(snapshot.itinerary.length,3);assert.deepEqual(snapshot.itinerary.map(w=>w.coordinates),manual.waypoints.map(w=>w.coordinates));
 assert.equal(snapshot.itinerary[0].provenance,"user_planning_input");assert.equal(snapshot.itinerary[1].provenance,"verified_science_target");assert.ok(snapshot.itinerary[1].inactive_reason);assert.equal(snapshot.geometric.available,false);
 assert.match(briefHtml(reopened,region,"date"),/gale-old-unit/);
 const second=parseMission(JSON.parse(JSON.stringify(snapshot.mission)),region);assert.equal(missionPlanningSnapshot(second,region).itinerary[1].target_id,"gale-old-unit");
});
for(const id of ["gale","jezero"] as const)test(`I4A ${id}: recompute real ordered round trips and compare F3 independent reference`,async()=>{
 const points=id==="gale"?[[137.38,-4.72],[137.4,-4.74],[137.39,-4.75]]:[[77.450886,18.444627],[77.38,18.455],[77.43,18.435]];
 const p=plan(id,points),datasetId=id==="gale"?"gale-hrsc-30m":"jezero-usgs-trn-dtm-routing-25m";
 const response=await calculateTerrainRoutes({regionId:id,plan:p,datasetId,maxSnapMeters:100});
 const baseline=JSON.parse(readFileSync("docs/evidence/f3/objective-routing-compatibility.json","utf8")).records.find((r:{region:string;site_id:string})=>r.region===id&&r.site_id==="manual-ordered-round-trip");
 for(const [i,r] of response.alternatives.entries()){
  assert.equal(r.status,"unverified");assert.equal(r.registrationVerified,false);assert.equal(r.segments.length,3);assert.equal(r.requestedWaypoints.length,4);
  assert.deepEqual(r.coordinates[0],r.coordinates.at(-1));assert.ok(r.snapDistancesMeters.every(d=>d<=100));
  for(let j=1;j<r.segments.length;j++)assert.deepEqual(r.segments[j-1].coordinates.at(-1),r.segments[j].coordinates[0]);
  assert.ok(Math.abs(r.distanceMeters!-baseline.numerical_routing_result[i].distance_m)<1e-5);
 }
 mkdirSync("docs/evidence/i4a",{recursive:true});writeFileSync(`docs/evidence/i4a/${id}-routes.json`,JSON.stringify({request:{regionId:id,plan:p,datasetId,maxSnapMeters:100},...response},null,2));
 // Scientific target association is independently rejected; manual success is not scientific eligibility.
 const target=id==="gale"?"gale-gediz-vallis":"jezero-objective-3";
 assert.throws(()=>validateTerrainRequest({regionId:id,plan:{...p,waypoints:p.waypoints.map((w,i)=>i===1?{...w,target_id:target,provenance:"verified_science_target"}:w)},datasetId,maxSnapMeters:100}),/Unverified scientific/);
});
test("I4A Oxia interpreted planning and one-way/round-trip geography never borrow terrain",async()=>{
 const points=regions.oxia.targets.map(t=>[t.coordinates!.longitude_east,t.coordinates!.latitude]);
 for(const round of [false,true]){
  const p=plan("oxia",points,round),response=await calculateTerrainRoutes({regionId:"oxia",plan:p,datasetId:"jezero-usgs-trn-dtm-routing-25m",maxSnapMeters:100});
  assert.ok(response.alternatives.every(r=>r.status==="unavailable"&&r.distanceMeters===null&&r.ascentMeters===null&&r.coordinates.length===0));
  const m=syncMissionWithWaypointPlan(newMission(regions.oxia),p,regions.oxia),s=missionPlanningSnapshot(m,regions.oxia);
  assert.equal(s.geometric.available,true);assert.equal(s.geometric.segments.length,round?3:2);
  assert.equal(s.terrain,null);assert.equal(s.scenario.resources.oxygen.required,null);assert.match(briefHtml(m,regions.oxia,"date"),/User-defined waypoint/);
 }
 const wp=createWaypointFromTarget(regions.oxia.targets[0]);assert.equal(wp.evidence?.classification,"Interpreted");assert.equal(wp.evidence?.routing_eligible,false);
});
