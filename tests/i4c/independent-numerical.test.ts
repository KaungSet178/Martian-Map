import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateEVAResources } from '../../lib/eva/estimate';
import { marsDistance } from '../../lib/map/geodesy';
import { terrainMetrics } from '../../lib/routing/metrics';
import { DEFAULT_MAX_TRAVERSABLE_SLOPE_DEGREES } from '../../lib/routing/jezero/cost';
const near=(a:number|null,b:number)=>assert.ok(a!==null&&Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('I4C independent rate/hour arithmetic: unequal activities, delay, emergency, holdback',()=>{
 const r=estimateEVAResources({travelSeconds:7200,stopSeconds:3600,legacy:{},oxygenHoldbackPercent:10,batteryHoldbackPercent:20,config:{profileId:'custom',metabolicKgPerHour:.08,leakageKgPerHour:.004,electricalWatts:90,coolingArchitecture:'venting',coolingKgPerHour:.5,delaySeconds:1800,emergencySeconds:900,oxygenMarginPercent:20,batteryMarginPercent:10,waterMarginPercent:30,oxygenCapacityKg:1,batteryCapacityWh:1000,waterCapacityKg:5}});
 near(r.timeline.baselineSeconds,12600);near(r.oxygen.baseline,.294);near(r.oxygen.timeReserve,.021);near(r.oxygen.required,.378);near(r.oxygen.remaining,.522);
 near(r.battery.required,371.25);near(r.battery.remaining,428.75);near(r.water.required,2.4375);near(r.water.remaining,2.5625);
});
test('I4C unknown consumption and capacity remain distinct; no hidden hardware',()=>{
 const r=estimateEVAResources({travelSeconds:3600,stopSeconds:0,legacy:{},oxygenHoldbackPercent:0,batteryHoldbackPercent:0,config:{profileId:'bvad-reference'}});
 near(r.oxygen.required,.081);assert.equal(r.oxygen.capacity,null);assert.equal(r.oxygen.capacityStatus,'missing-capacity');assert.equal(r.battery.required,null);assert.equal(r.operationalFeasibility,'unverified');
});
test('I4C invalid physical input fails closed',()=>{
 for(const seconds of [-1,NaN,Infinity,1e10]) {
  const r=estimateEVAResources({travelSeconds:seconds,stopSeconds:0,legacy:{},oxygenHoldbackPercent:0,batteryHoldbackPercent:0});assert.equal(r.oxygen.required,null);
 }
});
test('I4C independent spherical arc and 3D integration including longitude seam',()=>{
 const arc=3396190*Math.PI/180;
 near(marsDistance({latitude:0,longitude_east:359.5},{latitude:0,longitude_east:.5}),arc);
 const d=100/3396190*180/Math.PI;
 const r=terrainMetrics([[0,0],[d,0],[2*d,0]],[10,40,0]);
 near(r.horizontalDistanceMeters,200);near(r.distanceMeters,Math.sqrt(10900)+Math.sqrt(11600));near(r.ascentMeters,30);near(r.descentMeters,40);
 assert.equal(DEFAULT_MAX_TRAVERSABLE_SLOPE_DEGREES,25);
});
