import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Map as MapInstance } from "maplibre-gl";
import { getRegion } from "../lib/regions/registry";
import { fitInitialView, fitOverview, focusExtentForViewport } from "../lib/map/camera";
import { applyLayerStates, mountRegionLayers, displayBounds } from "../lib/map/region-layers";
import { missionPixelRect, missionTileTemplates, usesScientificClip, registerScientificClip } from "../lib/map/scientific-clip";

const gale = getRegion("gale")!;
test("broader context retains authenticated existing source, original mission bounds and checked tile hashes", () => {
  const layer = gale.layers.find((item) => item.id === "gale-context")!;
  assert.equal(layer.source_id, "gale-trek-ctx");
  assert.equal(layer.kind, "optical");
  assert.equal(layer.default_visible, false);
  const report = JSON.parse(readFileSync("team/gale/viewport/context-report.json", "utf8"));
  assert.equal(report.source_capabilities_sha256, JSON.parse(readFileSync("team/gale/sources/g1-audit.json", "utf8")).inputs["capabilities.xml"].sha256);
  assert.equal(report.tiles_written, 207);
  assert.equal(report.product, "Gale_CTX_BlockAdj_dd");
  assert.ok(report.max_zoom_equatorial_posting_m > 40 && report.max_zoom_equatorial_posting_m < 41);
  for (const [path, hash] of Object.entries(report.output_sha256))
    assert.equal(createHash("sha256").update(readFileSync(`public/maps/gale/context-tiles/${path}`)).digest("hex"), hash);
  assert.equal(gale.map.supported_extent!.west_east, 137.3442352329006);
  assert.equal(usesScientificClip(gale, layer), false);
});

test("initial exploration is separate from complete mission fit and other regions remain unchanged", () => {
  const calls: unknown[][] = [];
  let resized=false;
  const map = { stop:()=>{},resize:()=>{resized=true;}, setMaxBounds:(v:unknown)=>assert.equal(v,null), setPadding:()=>{},
    getMaxZoom:()=>18, fitBounds:(...args:unknown[])=>{assert.ok(resized);calls.push(args);} } as unknown as MapInstance;
  const container = { getBoundingClientRect:()=>({width:1080,height:788,top:0,bottom:788,right:1080}),
    parentElement:{querySelector:()=>null} } as unknown as HTMLElement;
  fitInitialView(map,gale,container,false);
  const focus=focusExtentForViewport(gale,{width:1080,height:788},{top:24,bottom:64,left:24,right:32})!;
  assert.deepEqual(calls.at(-1)![0],displayBounds(focus));
  assert.notDeepEqual(calls.at(-1)![0],displayBounds(gale.map.initial_extent!));
  assert.equal((calls.at(-1)![1] as {duration:number}).duration,0);
  fitInitialView(map,gale,container,false,true);
  assert.equal((calls.at(-1)![1] as {duration:number}).duration,280);
  fitOverview(map,gale,container,false);
  assert.deepEqual(calls.at(-1)![0],displayBounds(gale.map.supported_extent!));
  for (const id of ["jezero","oxia"]) {
    const region=getRegion(id)!;
    assert.equal(region.map.initial_extent,undefined);
    assert.equal(focusExtentForViewport(region,{width:1080,height:788},{top:24,bottom:64,left:24,right:32}),null);
  }
});

test("scientific alpha clips conservatively to true geographic cell edges at multiple zooms", () => {
  const n=2**13, x=7220, y=4200, size=256;
  const lon=(px:number)=>(x+px/size)/n*360-180;
  const lat=(py:number)=>Math.atan(Math.sinh(Math.PI*(1-2*(y+py/size)/n)))*180/Math.PI;
  const bounds=[lon(37.2),lat(197.8),lon(181.4),lat(29.3)];
  assert.deepEqual(missionPixelRect(bounds,13,x,y,size),{left:38,right:181,top:30,bottom:197});
  const outside=missionPixelRect(bounds,13,x+1,y,size);
  assert.equal(outside.left,0); assert.equal(outside.right,0);
  assert.throws(()=>missionPixelRect([NaN,0,1,2],13,x,y,size));
  const template=missionTileTemplates(["/maps/gale/terrain-regional/elevation/{z}/{x}/{y}.png"],gale.map.supported_extent!)[0];
  const resolved=template.replaceAll("{z}","13").replaceAll("{x}","7220").replaceAll("{y}","4200");
  assert.equal(new URL(resolved).searchParams.get("source"),"/maps/gale/terrain-regional/elevation/13/7220/4200.png");
});

test("only scientific raster tiles switch at coverage changes; basemaps and vectors keep their stack, opacity and sources", () => {
  const sources=new Map<string,{type:string;tiles?:string[];setTiles?:(tiles:string[])=>void}>();
  const layers=new Map<string,{id:string;paint:Record<string,unknown>}>();
  let updates=0;
  const listeners=new Set<(event:{sourceId:string;sourceDataType:string})=>void>();
  const map={
    addSource:(id:string,spec:{type:string;tiles?:string[]})=>sources.set(id,{...spec,setTiles:(tiles:string[])=>{sources.get(id)!.tiles=tiles;updates++;}}),
    addLayer:(layer:{id:string;paint:Record<string,unknown>})=>layers.set(layer.id,layer),
    getSource:(id:string)=>sources.get(id),getLayer:(id:string)=>layers.get(id),
    removeLayer:(id:string)=>layers.delete(id),removeSource:(id:string)=>sources.delete(id),
    setLayoutProperty:()=>{},setPaintProperty:(id:string,key:string,value:unknown)=>{layers.get(id)!.paint[key]=value;},
    on:(_name:string,callback:(event:{sourceId:string;sourceDataType:string})=>void)=>listeners.add(callback),
    off:(_name:string,callback:(event:{sourceId:string;sourceDataType:string})=>void)=>listeners.delete(callback),
    isSourceLoaded:()=>true,
  } as unknown as MapInstance;
  const cleanup=mountRegionLayers(map,gale);
  const optical=sources.get("region-gale-optical")!.tiles;
  const context=sources.get("region-gale-context")!.tiles;
  assert.equal(layers.has("region-presentation-mask"),false);
  const order=[...layers.keys()];
  assert.ok(order.indexOf("region-gale-context")<order.indexOf("region-gale-optical"));
  assert.ok(order.indexOf("region-gale-optical")<order.indexOf("region-gale-regional-elevation"));
  assert.ok(order.indexOf("region-gale-thermal")<order.indexOf("region-gale-traverse-recorded"));
  for (const layer of gale.layers.filter((item)=>usesScientificClip(gale,item)))
    assert.match(sources.get(`region-${layer.id}`)!.tiles![0],/^marswalk-mission:/);
  applyLayerStates(map,gale,{},false,"mission_view");assert.equal(updates,0);
  applyLayerStates(map,gale,{},false,"full_coverage");
  assert.ok(updates>0);
  assert.equal(layers.get("region-gale-thermal")!.paint["raster-opacity"],0);
  for(const id of sources.keys())for(const listener of [...listeners])listener({sourceId:id,sourceDataType:"content"});
  for (const layer of gale.layers.filter((item)=>usesScientificClip(gale,item)))
    assert.doesNotMatch(sources.get(`region-${layer.id}`)!.tiles![0],/^marswalk-mission:/);
  const count=updates;
  applyLayerStates(map,gale,{},false,"full_coverage");assert.equal(updates,count);
  applyLayerStates(map,gale,{},false,"mission_view");
  assert.equal(layers.get("region-gale-thermal")!.paint["raster-opacity"],0);
  for(const id of sources.keys())for(const listener of [...listeners])listener({sourceId:id,sourceDataType:"content"});
  assert.equal(sources.get("region-gale-optical")!.tiles,optical);
  assert.equal(sources.get("region-gale-context")!.tiles,context);
  assert.equal(layers.get("region-gale-thermal")!.paint["raster-opacity"],.6);
  cleanup();assert.equal(sources.size,0);assert.equal(layers.size,0);
});

test("mask protocol registration is shared and released after the last map", () => {
  const calls:string[]=[];
  const add=(name:string)=>{calls.push(`add:${name}`);};
  const remove=(name:string)=>{calls.push(`remove:${name}`);};
  const first=registerScientificClip(add,remove),second=registerScientificClip(add,remove);
  assert.equal(calls.length,1);first();assert.equal(calls.length,1);second();assert.equal(calls.length,2);
});
