import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync,mkdirSync } from "node:fs";
import { calculateTerrainRoutes,validateTerrainRequest } from "../lib/routing/server";
import { terrainPlanningSummary } from "../lib/routing/planning";
import { createWaypoint,createWaypointPlan } from "../lib/mission/waypoint-planning";
import { newMission,parseMission,saveMission,readMissions } from "../lib/mission/model";
import { regions } from "../lib/regions/registry";
import { planJezeroSegmentRoute } from "../lib/routing/jezero/router";
import { TerrainGrid } from "../lib/routing/jezero/grid";
import { loadJezeroRoutingGrid } from "../lib/routing/jezero/loader";
import { terrainBriefSummary } from "../components/mission/brief";
export function realRequest(region:"gale"|"jezero",round=false) {
  const points=region==="gale"?[[137.441633,-4.589467],[137.4010487,-4.6347708]]:[[77.450886,18.444627],[77.38,18.455]];
  const plan=createWaypointPlan({region_id:region,name:"Authentic route QA",mode:round?"round_trip":"one_way",waypoints:points.map(([longitude_east,latitude],i)=>createWaypoint({id:`qa-${i}`,coordinates:{longitude_east,latitude},role:i===0?"base":round?"science_stop":"destination",provenance:"user_planning_input"}))});
  return {regionId:region,plan,datasetId:region==="gale"?"gale-hrsc-30m":"jezero-usgs-trn-dtm-routing-25m",maxSnapMeters:100};
}
for(const region of ["gale","jezero"] as const)test(`${region}: real worker, ordered round trip, canonical metrics, scenarios and persistence`,async()=>{
  const request=realRequest(region,true),response=await calculateTerrainRoutes(request);
  mkdirSync("output/routing-qa",{recursive:true});writeFileSync(`output/routing-qa/${region}.json`,JSON.stringify(response));
  for(const route of response.alternatives) {
    assert.equal(route.status,"unverified",route.failureReason || "");assert.equal(route.registrationVerified,false);
    assert.equal(route.segments.length,2);assert.ok(route.coordinates.length>10);assert.ok(route.sourceDatasetIds[0].startsWith(region));
    assert.ok(route.snapDistancesMeters.every(d=>d<=100));
    assert.deepEqual(route.coordinates[0],route.coordinates.at(-1));
    const summary=terrainPlanningSummary(request.plan,route,{speed:"1000",scienceMinutes:"10",oxygenCapacity:"5000",oxygenTravel:"100",oxygenStop:"50",batteryCapacity:"2000",batteryTravel:"100",batteryStop:"30"},{oxygen:25,battery:30})!;
    assert.equal(summary.timeline.status,"COMPLETE_SCENARIO");
    assert.ok(Math.abs(summary.timeline.total_distance_metres!-route.distanceMeters!)<1e-6);
    assert.ok(Math.abs(summary.timeline.total_travel_seconds!-route.distanceMeters!*3.6)<1e-6);
    assert.ok(summary.timeline.total_stop_seconds>=600);
    assert.ok(Math.abs(summary.resources.oxygen.travel_used_g!-route.distanceMeters!/1000*100)<1e-6);
    assert.equal(terrainPlanningSummary(request.plan,null,{speed:"1000"},{oxygen:25,battery:25}),null);
    assert.equal(terrainPlanningSummary(request.plan,route,{}, {oxygen:25,battery:25}),null);
    const incomplete=terrainPlanningSummary(request.plan,route,{speed:"1000"},{oxygen:25,battery:25})!;
    assert.equal(incomplete.resources.oxygen.total_used_g,null);
    assert.match(terrainBriefSummary(newMission(regions[region]),route),/3D distance.*Absolute registration unverified/);
  }
  const mission={...newMission(regions[region]),waypoint_plan:request.plan,terrain_route:{version:response.version,requestKey:"qa",preference:"shortest" as const,datasetId:request.datasetId}};
  const store=new Map<string,string>();const storage={getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>{store.set(k,v);}};
  saveMission(storage,mission);const [saved]=readMissions(storage);assert.deepEqual(parseMission(saved,regions[region]).terrain_route,mission.terrain_route);
  assert.ok(!JSON.stringify(saved).includes('"coordinates":['));
});
test("strict source selection, region isolation and unverified objective rejection",async()=>{
  const request=realRequest("jezero");
  assert.throws(()=>validateTerrainRequest({...request,datasetId:"gale-hrsc-30m"}),/Wrong terrain/);
  assert.throws(()=>validateTerrainRequest({...request,regionId:"gale"}),/another region/);
  assert.throws(()=>validateTerrainRequest({...request,maxSnapMeters:251}));
  assert.throws(()=>validateTerrainRequest({...request,plan:{...request.plan,waypoints:request.plan.waypoints.map((w,i)=>i?{...w,target_id:regions.jezero.targets[0].id,provenance:"verified_science_target"}:w)}}),/Unverified scientific/);
  const response=await calculateTerrainRoutes({...request,plan:{...request.plan,waypoints:request.plan.waypoints.map((w,i)=>i?{...w,coordinates:{longitude_east:77.19,latitude:18.44}}:w)}});
  assert.ok(response.alternatives.every(route=>route.status==="unavailable"&&route.coordinates.length===0&&route.distanceMeters===null));
  const oxia=await calculateTerrainRoutes({...request,regionId:"oxia",plan:{...request.plan,region_id:"oxia",waypoints:request.plan.waypoints.map((w,i)=>({...w,coordinates:{longitude_east:335.4+i*.01,latitude:18.2}}))}});
  assert.match(oxia.alternatives[0].failureReason!,/not yet available for Oxia/);
});
test("Jezero geography follows native projected posting and round trips every sampled cell",()=>{
  const grid=loadJezeroRoutingGrid();
  for(const [col,row] of [[0,0],[100,80],[603,212]]) {
    const point=grid.cellToCoord(col,row);assert.ok(grid.coordToCell(...point).every((value,i)=>value===[col,row][i]));
    const expected=grid.metadata.bounds.west+(col+.5)*25/3396190*180/Math.PI;
    assert.ok(Math.abs(point[0]-expected)<1e-10);
  }
  assert.ok(grid instanceof TerrainGrid);
});

test("missing Python dependency and cancellation never substitute a geometric result",async()=>{
  const before=process.env.MARSWALK_PYTHON;
  process.env.MARSWALK_PYTHON="missing-marswalk-python-executable";
  try {await assert.rejects(calculateTerrainRoutes(realRequest("gale")),/ENOENT/);} finally {if(before===undefined)delete process.env.MARSWALK_PYTHON;else process.env.MARSWALK_PYTHON=before;}
  const controller=new AbortController();controller.abort();
  await assert.rejects(calculateTerrainRoutes(realRequest("gale"),controller.signal));
});

test("Jezero default slope restriction cannot be disabled by an undefined option",()=>{
 const real=loadJezeroRoutingGrid();
 const metadata={...real.metadata,width:3,height:3};
 const grid=new TerrainGrid({metadata,elevations:Array(9).fill(-2500),slopes:[0,30,0,30,30,30,0,30,0],validMask:Array(9).fill(1)});
 const route=planJezeroSegmentRoute([{coordinates:grid.cellToCoord(0,0),verified:true},{coordinates:grid.cellToCoord(2,2),verified:true}],grid,{maxSnapDistanceMeters:100});
 assert.equal(route.status,"unavailable");assert.equal(route.distanceMeters,null);
});

for(const region of ["gale","jezero"] as const)test(`${region}: three distinct ordered waypoints keep segment junctions`,async()=>{
 const request=realRequest(region);
 request.plan.waypoints[1].role="intermediate";
 const last=region==="gale"?{longitude_east:137.39,latitude:-4.75}:{longitude_east:77.43,latitude:18.435};
 request.plan.waypoints.push(createWaypoint({id:"qa-final",coordinates:last,role:"destination",provenance:"user_planning_input"}));
 const result=await calculateTerrainRoutes(request);
 for(const route of result.alternatives){
  assert.equal(route.status,"unverified",route.failureReason || "");
  assert.equal(route.requestedWaypoints.length,3);assert.equal(route.segments.length,2);
  assert.deepEqual(route.segments[0].coordinates.at(-1),route.segments[1].coordinates[0]);
  assert.deepEqual(route.requestedWaypoints[2],[last.longitude_east,last.latitude]);
 }
});

test("Gale coarse comparison stays a separate authentic dataset",async()=>{
 const request=realRequest("gale");
 const west=137.09786867115304,north=-4.296961403640324,spacing=.0033741353778094364;
 request.plan.waypoints.forEach((waypoint,i)=>{waypoint.coordinates={longitude_east:west+(80+i*10+.5)*spacing,latitude:north-(100+i*20+.5)*spacing};});
 const result=await calculateTerrainRoutes({...request,datasetId:"gale-hrsc-mola-200m"});
 for(const route of result.alternatives){assert.equal(route.status,"unverified",route.failureReason || "");assert.deepEqual(route.sourceDatasetIds,["gale-hrsc-mola-200m"]);assert.ok(route.distanceMeters!>0);}
});
