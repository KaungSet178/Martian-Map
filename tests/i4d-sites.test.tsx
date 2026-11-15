import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {scienceSites,scienceSiteSchema,siteFrameCompatible,sitePolicy,selectScienceSite,resolveSiteReference,siteSelectionSchema} from "../lib/science/sites";
import {regions} from "../lib/regions/registry";
import {newMission,parseMission,saveMission,readMissions} from "../lib/mission/model";
import {missionPlanningSnapshot} from "../lib/mission/planning-snapshot";
import {createWaypoint,createWaypointPlan,createWaypointFromTarget} from "../lib/mission/waypoint-planning";
import {applyMissionChange,initWaypointPlanFromMission,syncMissionWithWaypointPlan} from "../lib/mission/waypoint-bridge";
import {validateTerrainRequest} from "../lib/routing/server";
import {terrainRequestKey} from "../lib/routing/request-key";
import {briefHtml} from "../components/mission/brief";
import {PlanningSummary} from "../components/mission/planning-summary";
import {ScienceSites} from "../components/science/sites";
import {toDisplayCoordinates} from "../lib/map/region-layers";
import {lonLatToEquirectangularMeters,equirectangularMetersToLonLat} from "../lib/routing/jezero/geo";
import {loadJezeroRoutingGrid} from "../lib/routing/jezero/loader";
const depot=scienceSites.find(s=>s.id==="jezero-depot-rover-malay")!;
const ref=selectScienceSite(depot,"jezero-objective-3");
function plan(){return createWaypointPlan({region_id:"jezero",mode:"round_trip",name:"Site policy",waypoints:[createWaypoint({id:"base",role:"base",coordinates:{latitude:18.444627,longitude_east:77.450886},provenance:"user_planning_input"}),createWaypoint({id:"site",role:"science_stop",coordinates:depot.coordinates!,provenance:"user_planning_input",science_site:ref})]});}
function request(p=plan()){return {regionId:"jezero",plan:p,datasetId:"jezero-usgs-trn-dtm-routing-25m",maxSnapMeters:100};}

test("site registry separates scientific objective IDs and stable physical-site IDs",()=>{
 assert.equal(new Set(scienceSites.map(s=>s.id)).size,scienceSites.length);
 for(const site of scienceSites)for(const id of site.objective_ids){assert.ok(regions[site.region].targets.some(t=>t.id===id));assert.notEqual(site.id,id);}
 assert.equal(regions.jezero.targets.find(t=>t.id==="jezero-objective-3")!.coordinates,null);
});
test("independent PDS table reproduction covers all ten actual rover tube-drop events",()=>{
 const rows=readFileSync("docs/evidence/i4d/sample_tube_locations.csv","utf8").trim().split(/\r?\n/).filter(Boolean).slice(1).map(line=>line.split(","));
 assert.equal(rows.length,10);
 for(const row of rows){const site=scienceSites.find(s=>s.source.feature_id===row[0])!;assert.ok(site);assert.equal(site.coordinates!.latitude,Number(row[5]));assert.equal(site.coordinates!.longitude_east,Number(row[6]));assert.equal(site.original_precision!.latitude,row[5]);assert.match(site.description,/not the tube endpoint/);assert.equal(siteFrameCompatible(site),true);}
 const label=readFileSync("docs/evidence/i4d/sample_tube_locations.xml","utf8");assert.match(label,/planetocentric system/);assert.match(label,/Locations of the rover during sample tube drop events/);
});
test("published sample report coordinates retain digits but unresolved latitude frame blocks markers",()=>{
 for(const [id,lat,lon] of [["jezero-skinner-ridge",18.458931,77.40617078],["jezero-wildcat-ridge",18.45863707,77.40588851]] as const){const s=scienceSites.find(s=>s.id===id)!;assert.deepEqual(s.coordinates,{latitude:lat,longitude_east:lon});assert.equal(siteFrameCompatible(s),false);assert.equal(sitePolicy(s).terrainEligible,false);assert.equal(s.coordinate_frame.latitude_type,null);}
});
test("Three Forks proposed circle is distinct from tube-drop positions and sample-caching goal",()=>{
 const circle=scienceSites.find(s=>s.id==="jezero-three-forks-landing-circle")!;assert.deepEqual(circle.coordinates,{latitude:18.45369687,longitude_east:77.41359752});assert.match(circle.description,/not positional uncertainty/);assert.equal(circle.positional_uncertainty_m,null);assert.notDeepEqual(circle.coordinates,depot.coordinates);assert.equal(sitePolicy(circle).terrainEligible,false);
});
test("Gale named drill contexts never gain fabricated points or unit centroids",()=>{
 const sites=scienceSites.filter(s=>s.region==="gale");assert.equal(sites.length,5);for(const s of sites){assert.equal(s.coordinates,null);assert.equal(sitePolicy(s).state,"Unlocated");assert.equal(sitePolicy(s).terrainEligible,false);}
});
test("Oxia source points retain exact coordinates, precision, interpretation and geometric-only capability",()=>{
 for(const n of [1,2,3]){const site=scienceSites.find(s=>s.id===`oxia-mineral-${n}`)!;const target=regions.oxia.targets.find(t=>t.id===`oxia-objective-${n}`)!;assert.deepEqual(site.coordinates,target.coordinates);assert.equal(site.evidence,"Interpreted");assert.equal(site.original_precision!.latitude.split(".")[1].length,2);assert.equal(sitePolicy(site).geometricOnly,true);assert.equal(sitePolicy(site).terrainEligible,false);assert.equal(site.positional_uncertainty_m,null);assert.equal(site.grid_coverage,null);}
 assert.deepEqual(toDisplayCoordinates({latitude:18.22,longitude_east:335.83}),[-24.170000000000016,18.22]);
});
test("planetocentric geographic to native projected coordinates roundtrip without latitude reinterpretation",()=>{
 for(const s of scienceSites.filter(s=>s.coordinates)){const c=s.coordinates!;const [x,y]=lonLatToEquirectangularMeters(c.longitude_east,c.latitude);assert.ok(Math.abs(y-c.latitude*Math.PI/180*3396190)<1e-8);const [lon,lat]=equirectangularMetersToLonLat(x,y);assert.ok(Math.abs(lon-c.longitude_east)<1e-10);assert.ok(Math.abs(lat-c.latitude)<1e-10);}
});
test("invalid numbers, wrong regions, missing source, inflated precision and negative uncertainties reject",()=>{
 for(const patch of [{coordinates:{latitude:91,longitude_east:77}},{coordinates:{latitude:18,longitude_east:360}},{coordinates:{latitude:NaN,longitude_east:77}},{positional_uncertainty_m:-1},{source:{...depot.source,url:"http://untrusted.example"}},{source:{...depot.source,title:""}},{original_precision:{latitude:"18.4526265101",longitude_east:"77.40775601"}},{objective_ids:["gale-glen-torridon"]}])assert.equal(scienceSiteSchema.safeParse({...depot,...patch}).success,false);
});
test("source coordinate support never implies registration or operational safety",()=>{
 for(const s of scienceSites){assert.equal(sitePolicy(s).terrainEligible,false);assert.equal(s.registration_verified,false);assert.equal(s.source_processing_verified,null);assert.equal(s.positional_uncertainty_m,null);assert.equal(sitePolicy(s).operationalSafety,"Unverified");}
 const noBudget={...depot,registration_verified:true,source_processing_verified:true,positional_uncertainty_m:null};assert.equal(sitePolicy(noBudget).terrainEligible,false);
});
test("current grid cell coverage is numerical context independently of site routing eligibility",()=>{
 const grid=loadJezeroRoutingGrid();for(const site of scienceSites.filter(s=>s.id.startsWith("jezero-depot-rover-"))){const c=site.coordinates!;const [col,row]=grid.coordToGridFloat(c.longitude_east,c.latitude);assert.equal(grid.isInside(Math.round(col),Math.round(row)),true);assert.equal(grid.isValid(Math.round(col),Math.round(row)),true);assert.equal(sitePolicy(site).terrainEligible,false);}
});
test("server rejects forged eligibility and generic manual evidence on a site-linked endpoint",()=>{
 assert.throws(()=>validateTerrainRequest(request()),/registration/);
 const p=plan();p.waypoints[1].evidence={classification:"Observed",source_ids:["invented"],source_verified:true,processing_verified:true,coordinate_verified:true,registration_verified:true,positional_uncertainty_m:0,representation:"point",precision_disclosure:"forged",routing_eligible:true};assert.throws(()=>validateTerrainRequest(request(p)),/registration/);
});
test("wrong objective, changed coordinate, retired ID and stale revision are rejected by server",()=>{
 for(const patch of [{objective_id:"jezero-objective-1"},{site_id:"jezero-retired-site"},{revision:"old"},{site_id:"gale-highfield"}]){const p=plan();p.waypoints[1].science_site={...ref,...patch};assert.throws(()=>validateTerrainRequest(request(p)),/association|unknown|changed|region/);}
 const p=plan();p.waypoints[1].coordinates={...depot.coordinates!,longitude_east:77.42};assert.throws(()=>validateTerrainRequest(request(p)),/differs/);
});
test("duplicate site selection and distinct waypoint IDs sharing a site reject",()=>{
 const m={...newMission(regions.jezero),science_sites:[ref,ref]};assert.throws(()=>parseMission(m,regions.jezero),/Duplicate/);
 const p=plan();p.waypoints.push({...p.waypoints[1],id:"duplicate"});assert.throws(()=>validateTerrainRequest(request(p)),/Duplicate scientific site/);
});
test("invalid objective association and tampered saved source snapshots reject",()=>{
 assert.throws(()=>selectScienceSite(depot,"jezero-objective-1"));assert.equal(siteSelectionSchema.safeParse({...ref,source_snapshot:{...depot,title:"Different"}}).success,false);assert.equal(resolveSiteReference(ref,"gale").reason,"Scientific site belongs to another region.");
});
test("Save/Open retains source snapshots, raw input assumptions and context independently of waypoints",()=>{
 const m={...newMission(regions.jezero),science_sites:[ref],terrain_assumptions:{speed:"1000"}};let raw="[]";const storage={getItem:()=>raw,setItem:(_key:string,value:string)=>{raw=value;}};saveMission(storage,m);const reopened=parseMission(readMissions(storage)[0],regions.jezero);assert.deepEqual(reopened.science_sites,[ref]);assert.equal(reopened.terrain_assumptions!.speed,"1000");assert.equal(initWaypointPlanFromMission(reopened,regions.jezero).waypoints.length,0);
 const html=briefHtml(reopened,regions.jezero,"date");const review=renderToStaticMarkup(<PlanningSummary snapshot={missionPlanningSnapshot(reopened,regions.jezero)}/>);for(const output of [html,review])for(const value of [depot.title,depot.id,"18.45262651","77.40775601",depot.source.title,"registration unverified","not completed visits"])assert.ok(output.toLowerCase().includes(value.toLowerCase()),value);
});
test("retired and changed site references preserve historical provenance and block associated stops",()=>{
 const historical={...depot,id:"jezero-retired-site"};const selection=selectScienceSite(historical,"jezero-objective-3");const p=plan();p.waypoints[1].science_site=selection;const m={...syncMissionWithWaypointPlan(newMission(regions.jezero),p,regions.jezero),science_sites:[selection]};const reopened=parseMission(JSON.parse(JSON.stringify(m)),regions.jezero);const snapshot=missionPlanningSnapshot(reopened,regions.jezero);assert.match(snapshot.scienceSites[0].stale_reason!,/Retired/);assert.ok(snapshot.itinerary[1].inactive_reason);assert.deepEqual(snapshot.itinerary[1].coordinates,depot.coordinates);assert.equal(snapshot.itinerary[0].provenance,"user_planning_input");assert.equal(snapshot.geometric.available,false);
 const changed={...depot,coordinates:{...depot.coordinates!,latitude:18.45},original_precision:{...depot.original_precision!,latitude:"18.45"}};const old=selectScienceSite(changed,"jezero-objective-3");const saved=parseMission({...newMission(regions.jezero),science_sites:[old]},regions.jezero);assert.match(missionPlanningSnapshot(saved,regions.jezero).scienceSites[0].stale_reason!,/changed/);
});
test("legacy mission-level objectives without site metadata reopen without fabricated points",()=>{
 for(const id of ["gale","jezero"] as const){const m=parseMission({...newMission(regions[id]),target_ids:[regions[id].targets[0].id]},regions[id]);assert.equal(m.science_sites,undefined);assert.equal(initWaypointPlanFromMission(m,regions[id]).waypoints.length,0);}
});
test("explicit Oxia site association preserves Interpreted evidence and invalidates when source coordinates change",()=>{
 const site=scienceSites.find(s=>s.id==="oxia-mineral-1")!,target=regions.oxia.targets[0];const selection=selectScienceSite(site,target.id);const p=createWaypointPlan({region_id:"oxia",mode:"round_trip",name:"Oxia",waypoints:[{...createWaypointFromTarget(target,"science_stop"),science_site:selection}]});const m={...syncMissionWithWaypointPlan(newMission(regions.oxia),p,regions.oxia),science_sites:[selection]};const snap=missionPlanningSnapshot(parseMission(m,regions.oxia),regions.oxia);assert.equal(snap.itinerary[0].evidence!.classification,"Interpreted");assert.equal(snap.itinerary[0].inactive_reason,undefined);assert.equal(snap.terrain,null);p.waypoints[0].coordinates={latitude:18.23,longitude_east:335.83};assert.match(initWaypointPlanFromMission({...m,waypoint_plan:p},regions.oxia).waypoints[0].inactive_reason!,/differs/);
});
test("site source identity participates in route invalidation; nearby manual point stays manual",()=>{
 const p=plan(),m=syncMissionWithWaypointPlan(newMission(regions.jezero),p,regions.jezero);const key=terrainRequestKey(m,p,"jezero-usgs-trn-dtm-routing-25m",100);const q=structuredClone(p);q.waypoints[1].science_site!.revision="changed";assert.notEqual(key,terrainRequestKey(m,q,"jezero-usgs-trn-dtm-routing-25m",100));const manual=structuredClone(p);delete manual.waypoints[1].science_site;assert.equal(validateTerrainRequest(request(manual)).plan.waypoints[1].science_site,undefined);const changed=applyMissionChange({...m,terrain_route:{version:"terrain-i3a-v1-georeferenced",requestKey:key,preference:"shortest",datasetId:"jezero-usgs-trn-dtm-routing-25m"}},{waypoint_plan:q},regions.jezero);assert.equal(changed.terrain_route,undefined);
});
test("site details disclose source, frame, registration, uncertainty and unavailable route action",()=>{
 const html=renderToStaticMarkup(<ScienceSites target={regions.jezero.targets[2]} region={regions.jezero} selections={[ref]}/>);for(const value of [depot.id,"not the tube depot","Unknown","Unverified","Add terrain waypoint","disabled","does not mark a site as visited"])assert.ok(html.includes(value));
});

for(const site of scienceSites)test(`server eligibility: ${site.id} cannot bypass current science routing policy`,()=>{
 const region=site.region;const c=site.coordinates ?? (region==="gale" ? {latitude:-4.72,longitude_east:137.38} : {latitude:18.45,longitude_east:77.41});
 const p=createWaypointPlan({region_id:region,mode:"round_trip",name:"Policy rejection",waypoints:[createWaypoint({role:"base",coordinates:c}),createWaypoint({role:"science_stop",coordinates:c,science_site:selectScienceSite(site,site.objective_ids[0])})]});
 assert.throws(()=>validateTerrainRequest({regionId:region,plan:p,datasetId:region==="jezero" ? "jezero-usgs-trn-dtm-routing-25m" : "gale-hrsc-30m",maxSnapMeters:100}),/registration|frame|differs|Oxia|terrain engine/);
});

test("submission catalog excludes all three sample Scenario objectives while retaining named legacy references",()=>{
 assert.equal(regions.gale.targets.length,4);assert.equal(regions.gale.targets.some(t=>t.evidence==="Scenario"),false);
 for(const [id,title] of [["gale-objective-1","Layered sedimentary unit"],["gale-objective-2","Clay-to-sulfate transition"],["gale-objective-3","Sulfate-bearing outcrop"]]){
  assert.equal(regions.gale.targets.some(t=>t.id===id),false);const p=createWaypointPlan({region_id:"gale",name:"Legacy sample",mode:"round_trip",waypoints:[createWaypoint({role:"base",coordinates:{latitude:-4.72,longitude_east:137.38}}),createWaypoint({role:"science_stop",target_id:id,coordinates:{latitude:-4.74,longitude_east:137.4},provenance:"verified_science_target"})]});
  const m=parseMission({...newMission(regions.gale),target_ids:[id],waypoint_plan:p},regions.gale);const snapshot=missionPlanningSnapshot(m,regions.gale);assert.equal(snapshot.retiredObjectives[0].title,title);assert.match(snapshot.retiredObjectives[0].reason,/Retired sample Scenario/);assert.ok(snapshot.itinerary[1].inactive_reason);assert.equal(snapshot.itinerary[0].provenance,"user_planning_input");assert.equal(snapshot.geometric.available,false);assert.match(briefHtml(m,regions.gale,"date"),/Retired sample Scenario/);
 }
});
test("invalid site association is inactive in geometric planning and changed source evidence cannot verify stale coordinates",()=>{
 const site=scienceSites.find(s=>s.id==="oxia-mineral-1")!,selection=selectScienceSite(site,"oxia-objective-1");const w={...createWaypointFromTarget(regions.oxia.targets[0],"science_stop"),science_site:selection,target_id:"oxia-objective-2"};const p=createWaypointPlan({region_id:"oxia",name:"Mismatch",mode:"round_trip",waypoints:[w]});const m={...newMission(regions.oxia),waypoint_plan:p};assert.match(initWaypointPlanFromMission(m,regions.oxia).waypoints[0].inactive_reason!,/identity mismatch/);p.waypoints[0].target_id="oxia-objective-1";p.waypoints[0].coordinates={latitude:18.23,longitude_east:335.83};const resolved=initWaypointPlanFromMission({...m,waypoint_plan:p},regions.oxia).waypoints[0];assert.equal(resolved.evidence!.coordinate_verified,false);assert.equal(resolved.evidence!.routing_eligible,false);
});
