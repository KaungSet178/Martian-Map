import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import type { Map as MapInstance } from "maplibre-gl";
import { regions } from "../lib/regions/registry";
import { categoryLayers, scientificCategories } from "../lib/map/scientific-categories";
import { mountRegionLayers, updateLayerState, toDisplayCoordinates } from "../lib/map/region-layers";
import { marsDistance, marsPathDistance } from "../lib/map/geodesy";
import { threeForksSite, objectiveLocationEvidence, retiredUnitLayers } from "../regions/location-evidence";
import { newMission, parseMission } from "../lib/mission/model";
import { initWaypointPlanFromMission } from "../lib/mission/waypoint-bridge";
import { calculateTerrainRoutes, validateTerrainRequest } from "../lib/routing/server";
import { createWaypoint, createWaypointPlan } from "../lib/mission/waypoint-planning";
import { loadJezeroRoutingGrid } from "../lib/routing/jezero/loader";

function request(region: "gale" | "jezero" | "oxia", points: number[][], round = false) {
  return { regionId: region, datasetId: region === "gale" ? "gale-hrsc-30m" : "jezero-usgs-trn-dtm-routing-25m", maxSnapMeters: 100,
    plan: createWaypointPlan({region_id: region, mode: round ? "round_trip" : "one_way", name: "F3 manual algorithm probes", waypoints: points.map(([longitude_east,latitude],i)=>createWaypoint({id:`f3-${i}`, label:`Manual algorithm probe ${i+1}`, coordinates:{longitude_east,latitude}, role:i===0?"base":!round&&i===points.length-1?"destination":"science_stop",provenance:"user_planning_input"}))}) };
}
test("retired unit layers cannot mount, reactivate or survive region cleanup; authentic categories unchanged",()=>{
  const mounted=new Set<string>(), sources=new Set<string>();
  const map={addSource:(id:string)=>sources.add(id),addLayer:(l:{id:string})=>mounted.add(l.id),getLayer:(id:string)=>mounted.has(id),getSource:(id:string)=>sources.has(id),removeLayer:(id:string)=>mounted.delete(id),removeSource:(id:string)=>sources.delete(id)} as unknown as MapInstance;
  for(const region of Object.values(regions)) {
    assert.ok(region.layers.every(l=>l.kind!=="geology"));
    assert.equal(region.capabilities.experimental_routing.status,region.id==="oxia"?"unavailable":"available");
    assert.equal(region.routing.enabled,false);
    for(const id of retiredUnitLayers) assert.deepEqual(updateLayerState(region,{},id,{visible:true}),{});
    for(const category of scientificCategories) assert.ok(categoryLayers(region,category).every(l=>l.availability===(l.id==="jezero-slope" ? "unavailable" : "available") && l.attribution && l.legend));
    for(const layer of region.layers) {
      if(layer.rendering.kind==="geojson") assert.ok(!layer.rendering.url.includes("geology"));
    }
    const cleanup=mountRegionLayers(map,region); assert.ok([...mounted].every(id=>!id.includes("geology"))); cleanup(); assert.equal(mounted.size,0);assert.equal(sources.size,0);
  }
});
test("source-backed Oxia coordinates retain interpretation and precision, not independent accuracy",()=>{
  for(const target of regions.oxia.targets) {
    const compilation=target.id==="oxia-objective-4" ? "hydrous" : "aqueous";
    const source=JSON.parse(readFileSync(`docs/evidence/f3/oxia-${compilation}-query.json`,"utf8")).response.features.map((f:{attributes:Record<string,unknown>})=>f.attributes);
    assert.equal(target.evidence,"Interpreted"); assert.equal(target.routing_eligibility.status,"unavailable");
    assert.ok(source.some((a:Record<string,number>)=>Number(a.Latitude.toFixed(2))===target.coordinates!.latitude && Number(a.Longitude.toFixed(2))===target.coordinates!.longitude_east));
    assert.match(target.activity,/uncertainty.*unknown/);
  }
  const distance=marsDistance(regions.oxia.targets[0].coordinates!,regions.oxia.targets[1].coordinates!);
  assert.ok(Math.abs(distance-36077)<1); assert.match(regions.oxia.targets[1].description,/36.1 km/);
});
test("unlocated IDs remain identifiable and never gain coordinates from saved objective selection",()=>{
  for(const region of [regions.gale,regions.jezero]) {
    for(const target of region.targets) {
      assert.equal(target.coordinates,null);assert.equal(target.coordinate_verified,false);
      assert.equal(objectiveLocationEvidence(region.id,target.id).registration_verified,false);
      const mission=parseMission({...newMission(region),target_ids:[target.id]},region);
      assert.ok(mission.target_ids.includes(target.id));assert.equal(initWaypointPlanFromMission(mission,region).waypoints.length,0);
    }
  }
  assert.equal(regions.jezero.targets.length,5);
  assert.equal(threeForksSite.positional_uncertainty_m,null);assert.equal(threeForksSite.landing_circle_radius_m,60);
  assert.equal(threeForksSite.objective_waypoint_eligible,false);
  assert.match(regions.jezero.targets[2].location_notes!,/not the tube depot/);
});
test("regional evidence agrees with historical observation adapters",()=>{
  for(const region of [regions.gale,regions.jezero]) for(const record of region.contextual_datasets) {
    assert.equal(record.evidence,"Observed");assert.equal(record.availability.status,"available");
    assert.match(record.limitations,/not.*forecast|not.*future/i);
  }
  assert.ok(regions.oxia.contextual_datasets.every(d=>d.availability.status==="unavailable"));
});
test("actual objective compatibility receipt separates scientific eligibility and numerical feasibility",async()=>{
  const records:Record<string,unknown>[]=[];
  for(const region of Object.values(regions)) for(const target of region.targets) records.push({region:region.id,objective_id:target.id,scientific_title:target.title,source_evidence:target.source_ids,source_references:region.source_references.filter(s=>target.source_ids.includes(s.id)).map(s=>({id:s.id,url:s.url})),evidence_classification:target.evidence,coordinate_verified:target.coordinate_verified,coordinate_reference:target.coordinate_reference,geometry_type:target.coordinates?"Point":"unlocated",source_coordinates:target.coordinates,terrain_coverage_availability:region.id==="oxia"?"unavailable":target.coordinates?"not tested":"no objective coordinate",snap_status:"not applicable",numerical_routing_result:"not attempted for ineligible objective",registration_verified:false,positional_uncertainty_m:null,objective_waypoint_eligible:false,eligibility_basis:"Regional scientific routing policy, separate from legacy geometric waypoint creation",legacy_geometric_waypoint_creation:target.coordinate_verified,warnings:["Source coordinates and scientific interpretation do not establish operational safety."]});
  const grid=loadJezeroRoutingGrid();const point=threeForksSite.coordinates;const cell=grid.coordToCell(point.longitude_east,point.latitude);
  const probe=request("jezero",[[77.450886,18.444627],[point.longitude_east,point.latitude]]);
  const result=await calculateTerrainRoutes(probe);
  records.push({region:"jezero",site_id:threeForksSite.id,source_evidence:[threeForksSite.source_url],geometry_type:"Point",source_coordinates:point,published_source_coordinates:threeForksSite.published_coordinates,coordinate_system:threeForksSite.coordinate_system,source_verified:true,coordinate_verified:true,processing_verified:false,landing_circle_radius_m:60,terrain_coverage_availability:grid.isValid(...cell),cell,snap_status:result.alternatives.map(r=>({preference:r.preference,requested:r.requestedWaypoints,snapped:r.snappedWaypoints,displacement_m:r.snapDistancesMeters})),numerical_routing_result:result.alternatives.map(r=>({preference:r.preference,status:r.status,distance_m:r.distanceMeters,horizontal_m:r.horizontalDistanceMeters,ascent_m:r.ascentMeters,descent_m:r.descentMeters,failure:r.failureReason})),registration_verified:false,objective_waypoint_eligible:false,warnings:["Manual algorithm probe only; source location is a proposed landing circle, not the tube depot or an eligible objective waypoint."]});
  assert.ok(result.alternatives.every(r=>r.status==="unverified"));
  const scientific={...probe,plan:{...probe.plan,waypoints:probe.plan.waypoints.map((w,i)=>i?{...w,target_id:"jezero-objective-3",provenance:"verified_science_target" as const}:w)}};
  assert.throws(()=>validateTerrainRequest(scientific),/Unverified scientific/);
  for(const region of ["gale","jezero"] as const) {
    const points=region==="gale"?[[137.38,-4.72],[137.4,-4.74],[137.39,-4.75]]:[[77.450886,18.444627],[77.38,18.455],[77.43,18.435]];
    const response=await calculateTerrainRoutes(request(region,points,true));
    for(const route of response.alternatives){assert.equal(route.status,"unverified");assert.equal(route.registrationVerified,false);assert.equal(route.segments.length,3);assert.deepEqual(route.coordinates[0],route.coordinates.at(-1));assert.ok(route.snapDistancesMeters.every(d=>d<=100));}
    records.push({region,site_id:"manual-ordered-round-trip",source_evidence:response.alternatives[0].sourceDatasetIds,geometry_type:"LineString",source_coordinates:null,terrain_coverage_availability:true,snap_status:response.alternatives.map(r=>r.snapDistancesMeters),numerical_routing_result:response.alternatives.map(r=>({preference:r.preference,status:r.status,vertices:r.coordinates.length,distance_m:r.distanceMeters,horizontal_m:r.horizontalDistanceMeters,ascent_m:r.ascentMeters,descent_m:r.descentMeters,segments:r.segments.length})),registration_verified:false,objective_waypoint_eligible:false,warnings:["Manual planning points; no science feature accessibility inference."]});
    mkdirSync("output/i4a-routing",{recursive:true});writeFileSync(`output/i4a-routing/${region}.json`,JSON.stringify(response));
  }
  const oxia=request("oxia",[[335.83,18.22],[336.33,17.84],[336.11,18.22]],true);
  const unavailable=await calculateTerrainRoutes(oxia);assert.ok(unavailable.alternatives.every(r=>r.status==="unavailable"&&r.distanceMeters===null&&r.ascentMeters===null&&r.coordinates.length===0));
  const stops=oxia.plan.waypoints.map(w=>w.coordinates),one=marsPathDistance(stops),round=marsPathDistance([...stops,stops[0]]);
  assert.ok(round>one);assert.deepEqual(toDisplayCoordinates(stops[0]),[-24.170000000000016,18.22]);
  records.push({region:"oxia",site_id:"manual-geometric-plan",source_evidence:["Mars sphere R=3396190 m"],geometry_type:"LineString",source_coordinates:stops,terrain_coverage_availability:false,snap_status:"not applicable",numerical_routing_result:{terrain:"unavailable",one_way_m:one,round_trip_m:round,elevation_metrics:null},registration_verified:false,objective_waypoint_eligible:false,warnings:["Geometric distance only; no Gale/Jezero terrain substitution."]});
  mkdirSync("docs/evidence/f3",{recursive:true});writeFileSync("docs/evidence/i4a/f3-replay-compatibility.json",JSON.stringify({baseline:"26adc4c2e72c4febc2500de2eb11f8f30ef85ccd",records},null,2)+"\n");
});
