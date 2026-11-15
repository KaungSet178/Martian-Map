import {test} from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {regions,regionIds} from "@/lib/regions/registry";
import {newMission,parseMission,saveMission,readMissions} from "@/lib/mission/model";
import {createWaypoint,createWaypointPlan,createWaypointFromTarget,moveWaypoint,reorderWaypoints,setOrigin,setDestination,setTrajectoryMode,removeWaypoint,validateWaypointPlan,generateGeometricTrajectory,type WaypointPlan} from "@/lib/mission/waypoint-planning";
import {syncMissionWithWaypointPlan,initWaypointPlanFromMission,applyMissionChange} from "@/lib/mission/waypoint-bridge";
import {missionPlanningSnapshot} from "@/lib/mission/planning-snapshot";
import {briefHtml,MissionBrief} from "@/components/mission/brief";
import {MissionEditor} from "@/components/mission/editor";
import {RouteComparison} from "@/components/mission/analysis";
import {WaypointItinerary} from "@/components/mission/waypoint-itinerary";
import {terrainRequestKey} from "@/lib/routing/request-key";
import {ROUTING_VERSION} from "@/lib/routing/contracts";
import {calculateTerrainRoutes,validateTerrainRequest} from "@/lib/routing/server";

function threePointPlan(region:typeof regionIds[number]):WaypointPlan {
  const points=region==="gale" ? [[137.441633,-4.589467],[137.42,-4.61],[137.4010487,-4.6347708]] : region==="jezero" ? [[77.450886,18.444627],[77.42,18.45],[77.38,18.455]] : [[335.4,18.2],[335.41,18.21],[335.42,18.22]];
  return createWaypointPlan({region_id:region,name:`${region} F1 <test>`,waypoints:points.map(([longitude_east,latitude],i)=>createWaypoint({id:`f1-${i}`,label:`RAW_STOP_${i}`,coordinates:{longitude_east,latitude},role:i===0?"base":i===1?"science_stop":"intermediate",stop_duration_seconds:i===1?123:undefined}))});
}
function storage(){const data=new Map<string,string>();return {getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};}
for(const id of regionIds) for(const mode of ["round_trip","one_way"] as const) test(`${id} ${mode}: canonical itinerary, Save/Open, JSON, Review and HTML export agree`,()=>{
  const region=regions[id];let plan=threePointPlan(id);
  if(mode==="one_way")plan=setDestination(setTrajectoryMode(plan,mode,"User recovery scenario"),"f1-2");
  const mission=syncMissionWithWaypointPlan(newMission(region),plan,region);
  const store=storage();saveMission(store,mission);
  const opened=parseMission(JSON.parse(JSON.stringify(readMissions(store)[0])),region);
  const s=missionPlanningSnapshot(opened,region);
  assert.deepEqual(s.itinerary.map(w=>w.id),["f1-0","f1-1","f1-2"]);
  assert.equal(s.start?.id,"f1-0");assert.equal(s.destination?.id,mode==="round_trip"?"f1-0":"f1-2");
  assert.deepEqual(s.counts,{objectives:0,waypoints:3,science_stops:1});
  assert.equal(s.itinerary[1].stop_seconds,123);assert.equal(s.itinerary[0].stop_seconds,null);
  assert.equal(s.geometric.segments.filter(leg=>leg.is_return_segment).length,mode==="round_trip"?1:0);
  assert.ok(s.geometric.total_surface_distance_m>0);assert.equal(s.terrain,null);assert.equal(s.scenario,null);
  const html=briefHtml(opened,region,"2026-11-15T00:00:00Z");
  const review=renderToStaticMarkup(<RouteComparison mission={opened} region={region} online onEvidence={()=>{}}/>);
  const brief=renderToStaticMarkup(<MissionBrief mission={opened} region={region} generatedAt="2026-11-15T00:00:00Z"/>);
  const editor=renderToStaticMarkup(<MissionEditor mission={opened} region={region} onChange={()=>{}} onScience={()=>{}}/>);
  for(const output of [html,review,brief]) {
    for(const waypoint of s.itinerary){assert.ok(output.includes(waypoint.label!));assert.ok(output.includes(String(waypoint.coordinates.longitude_east)));}
    assert.match(output,/User-defined waypoint/);assert.match(output,/123 seconds/);
    assert.ok(output.indexOf("RAW_STOP_0")<output.indexOf("RAW_STOP_1"));
    assert.match(output,/Total geometric distance/);assert.match(output,/Registration unverified/);
  }
  assert.match(html,/&lt;test&gt;/);assert.doesNotMatch(editor,/No verified base or coverage/);
  assert.match(editor,/RAW_STOP_0/);assert.match(editor,/Geometric distance/);
});

test("endpoint identities survive moves, repeated promotions, modes, removals and persisted reordering",()=>{
  let plan=threePointPlan("gale");
  plan=moveWaypoint(plan,"f1-1",-1);assert.equal(plan.waypoints[0].id,"f1-0");
  plan=moveWaypoint(plan,"f1-0",2);assert.equal(plan.waypoints[0].id,"f1-0");
  plan=setOrigin(plan,"f1-1");assert.equal(plan.waypoints.filter(w=>w.role==="base").length,1);
  plan=setTrajectoryMode(plan,"one_way","Scenario rendezvous");plan=setDestination(plan,"f1-2");
  assert.equal(plan.waypoints.at(-1)?.id,"f1-2");
  plan=setDestination(plan,"f1-0");assert.equal(plan.waypoints.filter(w=>w.role==="destination").length,1);
  assert.throws(()=>setDestination(plan,"f1-1"),/base/);
  const ordered=reorderWaypoints(plan,["f1-0","f1-2","f1-1"]);assert.equal(ordered.waypoints[0].id,"f1-1");assert.equal(ordered.waypoints.at(-1)?.id,"f1-0");
  const mission=syncMissionWithWaypointPlan(newMission(regions.gale),ordered,regions.gale);
  const reopened=parseMission(JSON.parse(JSON.stringify(mission)),regions.gale);
  assert.deepEqual(reorderWaypoints(reopened.waypoint_plan!,["f1-0","f1-1","f1-2"]).waypoints.map(w=>w.id),["f1-1","f1-2","f1-0"]);
  const round=setTrajectoryMode(ordered,"round_trip");assert.equal(round.waypoints.length,3);assert.equal(round.waypoints.filter(w=>w.role==="destination").length,0);
  assert.equal(generateGeometricTrajectory(round).segments.filter(s=>s.is_return_segment).length,1);
  assert.equal(validateWaypointPlan(removeWaypoint(round,"f1-1")).valid,false);
  assert.ok(validateWaypointPlan(removeWaypoint(ordered,"f1-0")).errors.some(e=>e.code==="MISSING_DESTINATION"));
});

test("Oxia catalog-first mission remains interpreted, repairable, and preserves independent evidence through every path",()=>{
  const region=regions.oxia,target=region.targets.find(t=>t.coordinates && t.coordinate_verified)!;
  let mission=applyMissionChange(newMission(region),{target_ids:[target.id]},region);
  assert.equal(mission.start,null);assert.equal(validateWaypointPlan(mission.waypoint_plan!).valid,false);
  let plan=initWaypointPlanFromMission(mission,region);plan=setOrigin(plan,plan.waypoints[0].id);
  mission=syncMissionWithWaypointPlan(mission,plan,region);
  const store=storage();saveMission(store,mission);
  const restored=parseMission(JSON.parse(JSON.stringify(readMissions(store)[0])),region);
  const s=missionPlanningSnapshot(restored,region);
  assert.equal(s.itinerary[0].evidence?.classification,"Interpreted");
  assert.equal(s.itinerary[0].evidence?.source_verified,null);assert.equal(s.itinerary[0].evidence?.processing_verified,null);
  assert.equal(s.itinerary[0].evidence?.coordinate_verified,true);assert.equal(s.itinerary[0].evidence?.registration_verified,false);
  assert.equal(s.itinerary[0].evidence?.positional_uncertainty_m,null);
  assert.ok(s.itinerary[0].coordinate_text.includes(String(target.coordinates!.latitude)));
  assert.ok(!s.itinerary[0].coordinate_text.includes(target.coordinates!.latitude.toFixed(4)));
  for(const output of [briefHtml(restored,region,"date"),renderToStaticMarkup(<WaypointItinerary plan={s.plan}/>),renderToStaticMarkup(<RouteComparison mission={restored} region={region} online onEvidence={()=>{}}/>)]) {
    assert.match(output,/Interpreted/);assert.doesNotMatch(output,/Observed.*NASA Target/);assert.match(output,/Registration unverified/);
  }
  // A legacy plan without optional metadata is enriched from the current catalog.
  delete restored.waypoint_plan!.waypoints[0].evidence;
  assert.equal(missionPlanningSnapshot(restored,region).itinerary[0].evidence?.classification,"Interpreted");
});

test("unlocated and geological-area objectives remain objectives without synthesizing waypoint locations",()=>{
  for(const id of ["gale","jezero"] as const){
    const region=regions[id],mission=applyMissionChange(newMission(region),{target_ids:region.targets.map(t=>t.id)},region);
    const s=missionPlanningSnapshot(mission,region);
    assert.equal(s.itinerary.length,0);assert.equal(s.objectives.length,region.targets.length);
    assert.ok(s.objectives.every(t=>!t.is_waypoint));assert.match(briefHtml(mission,region,"date"),/Location unavailable|Approximate area/);
  }
});

test("retired targets and newly unlocated objectives retain historical coordinates, roles, labels and evidence but cannot route",()=>{
  const region=regions.oxia,target=region.targets.find(t=>t.coordinates)!;
  const plan=createWaypointPlan({region_id:"oxia",waypoints:[createWaypointFromTarget(target),...threePointPlan("oxia").waypoints]});
  const mission=syncMissionWithWaypointPlan(newMission(region),plan,region);
  const retiredRegion={...region,targets:region.targets.filter(t=>t.id!==target.id)};
  const opened=parseMission(JSON.parse(JSON.stringify(mission)),retiredRegion);
  const snapshot=missionPlanningSnapshot(opened,retiredRegion);
  assert.ok(opened.target_ids.includes(target.id));assert.ok(opened.retired_objectives?.some(t=>t.id===target.id));
  assert.deepEqual(snapshot.itinerary.find(w=>w.target_id===target.id)?.coordinates,target.coordinates);
  assert.equal(snapshot.itinerary.find(w=>w.target_id===target.id)?.evidence?.classification,"Interpreted");
  assert.equal(snapshot.validation.valid,false);assert.equal(snapshot.geometric.available,false);assert.equal(snapshot.geometric.segments.length,0);
  assert.match(briefHtml(opened,retiredRegion,"date"),/Retired or unavailable/);
  const store=storage();saveMission(store,snapshot.mission);assert.deepEqual(readMissions(store)[0].target_ids,mission.target_ids);
  const unavailableRegion={...region,targets:region.targets.map(t=>t.id===target.id?{...t,coordinates:null,coordinate_verified:false}:t)};
  const unavailable=missionPlanningSnapshot(parseMission(mission,unavailableRegion),unavailableRegion);
  assert.match(unavailable.itinerary.find(w=>w.target_id===target.id)!.inactive_reason!,/location unavailable/);
  assert.equal(unavailable.geometric.segments.length,0);
  const retiredWaypoint=snapshot.itinerary.find(w=>w.target_id===target.id)!;
  assert.throws(()=>validateTerrainRequest({regionId:"oxia",plan:{...snapshot.plan,waypoints:[snapshot.plan.waypoints.find(w=>w.role==="base")!,retiredWaypoint]},datasetId:"gale-hrsc-30m",maxSnapMeters:100}),/Retired/);
});

test("region imports isolate missions and preserve retired IDs instead of silently deleting them",()=>{
  const mission=syncMissionWithWaypointPlan(newMission(regions.gale),threePointPlan("gale"),regions.gale);
  assert.throws(()=>parseMission(mission,regions.jezero));
  assert.throws(()=>parseMission({...mission,waypoint_plan:{...mission.waypoint_plan,region_id:"jezero"}},regions.gale));
  assert.throws(()=>parseMission({...mission,target_ids:["jezero-old-unit"]},regions.gale));
  const retired=parseMission({...mission,target_ids:["gale-retired-unit"]},regions.gale);assert.deepEqual(retired.target_ids,["gale-retired-unit"]);
});

for(const id of ["gale","jezero"] as const)test(`${id}: authentic three-point return leg, receipt validity, scenarios, and stale endpoint invalidation`,async()=>{
  const region=regions[id],plan=threePointPlan(id);
  let mission=syncMissionWithWaypointPlan(newMission(region),plan,region);
  const datasetId=id==="gale"?"gale-hrsc-30m":"jezero-usgs-trn-dtm-routing-25m";
  const response=await calculateTerrainRoutes({regionId:id,plan,datasetId,maxSnapMeters:100});
  const route=response.alternatives[0];assert.equal(route.status,"unverified",route.failureReason??"");
  assert.equal(route.segments.length,3);assert.equal(route.registrationVerified,false);
  assert.deepEqual(route.coordinates[0],route.coordinates.at(-1));assert.equal(route.requestedWaypoints.length,4);
  mission={...mission,terrain_assumptions:{speed:"1000",scienceMinutes:"10"},terrain_route:{version:ROUTING_VERSION,requestKey:terrainRequestKey(mission,plan,datasetId,100),datasetId,maxSnapMeters:100,preference:route.preference}};
  const snapshot=missionPlanningSnapshot(mission,region,route);
  assert.equal(snapshot.terrain,route);assert.equal(snapshot.scenario?.timeline.status,"COMPLETE_SCENARIO");
  assert.equal(snapshot.scenario?.timeline.total_stop_seconds,123);
  assert.ok(briefHtml(mission,region,"date",route).includes("3D DEM distance"));
  const changed=applyMissionChange(mission,{waypoint_plan:setOrigin(plan,"f1-1")},region);
  assert.equal(changed.terrain_route,undefined);assert.equal(missionPlanningSnapshot(changed,region,route).scenario,null);
  const reordered=applyMissionChange(mission,{waypoint_plan:moveWaypoint(plan,"f1-2",-1)},region);assert.equal(reordered.terrain_route,undefined);
  const store=storage();saveMission(store,mission);const reopened=parseMission(readMissions(store)[0],region);
  assert.equal(missionPlanningSnapshot(reopened,region).terrain,null);assert.match(briefHtml(reopened,region,"date"),/requires recalculation/);
  assert.equal(missionPlanningSnapshot({...mission,terrain_route:{...mission.terrain_route!,requestKey:"stale"}},region,route).terrain,null);
});

test("legacy optional regional plan ID and temporarily blank title preserve manual data",()=>{
  const mission=syncMissionWithWaypointPlan(newMission(regions.gale),threePointPlan("gale"),regions.gale);
  const legacy=JSON.parse(JSON.stringify(mission));delete legacy.waypoint_plan.region_id;
  assert.equal(parseMission(legacy,regions.gale).waypoint_plan!.waypoints.length,3);
  const blank=applyMissionChange(mission,{waypoint_plan:{...mission.waypoint_plan!,name:""}},regions.gale);
  assert.equal(initWaypointPlanFromMission(blank,regions.gale).waypoints.length,3);
  assert.equal(initWaypointPlanFromMission(blank,regions.gale).name,"");
  const changedRegion={...regions.oxia,targets:regions.oxia.targets.map(t=>({...t,evidence:"Derived" as const}))};
  const target=regions.oxia.targets.find(t=>t.coordinates)!;
  const old=syncMissionWithWaypointPlan(newMission(regions.oxia),createWaypointPlan({region_id:"oxia",waypoints:[createWaypointFromTarget(target)]}),regions.oxia);
  const opened=parseMission(old,changedRegion);assert.equal(opened.waypoint_plan!.waypoints[0].previous_evidence?.classification,"Interpreted");assert.equal(opened.waypoint_plan!.waypoints[0].evidence?.classification,"Derived");
});

test("objective order persists and deselecting a scientific endpoint cannot relabel its coordinates as manual",()=>{
  const region=regions.oxia,targets=region.targets.filter(t=>t.coordinates);
  let mission=applyMissionChange(newMission(region),{target_ids:targets.slice(0,2).map(t=>t.id)},region);
  const reversed=[...mission.target_ids].reverse();mission=applyMissionChange(mission,{target_ids:reversed},region);assert.deepEqual(mission.target_ids,reversed);
  let plan=setOrigin(initWaypointPlanFromMission(mission,region),`wp-${targets[0].id}`);plan=setDestination(setTrajectoryMode(plan,"one_way","Scenario"),`wp-${targets[1].id}`);
  mission=syncMissionWithWaypointPlan(mission,plan,region);
  const removed=applyMissionChange(mission,{target_ids:[targets[0].id]},region);
  assert.equal(removed.endpoint,null);assert.ok(!removed.waypoint_plan!.waypoints.some(w=>w.coordinates.latitude===targets[1].coordinates!.latitude && w.coordinates.longitude_east===targets[1].coordinates!.longitude_east));
});
