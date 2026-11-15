import {test} from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {readFileSync} from "node:fs";
import type {Map as MapInstance} from "maplibre-gl";
import {regions} from "../lib/regions/registry";
import {scientificCategories,categoryLayers} from "../lib/map/scientific-categories";
import {mountRegionLayers,updateLayerState} from "../lib/map/region-layers";
import {LayerManager} from "../components/science/evidence";
test("final demo reproduces I4C-01 and quarantines legacy display without claiming correction",()=>{
 const source=readFileSync("team/jezero/terrain/build_slope.mjs","utf8");const expression=source.match(/const west = ([^;]+);/)?.[1];assert.ok(expression);
 const actual=new Function("valid","grid","gi","e",`return (${expression})`)([0,1,1],[NaN,100,200],1,100);assert.equal(actual,100);
 const layer=regions.jezero.layers.find(l=>l.id==="jezero-slope")!;assert.equal(layer.availability,"unavailable");assert.equal(layer.rendering.kind,"unavailable");if(layer.rendering.kind==="unavailable")assert.match(layer.rendering.reason,/I4C-01/);
 assert.equal(layer.source_id,"jezero-usgs-trn-dtm");assert.equal(layer.evidence,"Derived");
});
test("final demo stale slope-on state cannot mount or enable quarantined raster",()=>{
 const sources:string[]=[];const map={addSource:(id:string)=>sources.push(id),addLayer:()=>{},getLayer:()=>undefined,getSource:()=>undefined} as unknown as MapInstance;
 mountRegionLayers(map,regions.jezero);assert.ok(!sources.includes("region-jezero-slope"));assert.ok(sources.includes("region-jezero-hillshade"));
 const old={"jezero-slope":{visible:true,opacity:100}};assert.equal(updateLayerState(regions.jezero,old,"jezero-slope",{visible:true}),old);
 const html=renderToStaticMarkup(<LayerManager region={regions.jezero} layerStates={old} onLayerChange={()=>{}} preview={false} setPreview={()=>{}} contours={false} setContours={()=>{}} markers={false} setMarkers={()=>{}} opacity={60} setOpacity={()=>{}} onEvidence={()=>{}} onZoomToCoverage={()=>{}}/>);
 assert.match(html,/Temporarily unavailable for the demo: I4C-01/);assert.doesNotMatch(html,/id="opacity-jezero-slope"/);assert.match(html,/disabled=""/);
});
test("final demo retains four category identities and other regional products",()=>{
 assert.deepEqual(scientificCategories,["Elevation","Hillshade","Slope","Thermal"]);
 for(const region of Object.values(regions))for(const category of scientificCategories)for(const layer of categoryLayers(region,category))assert.equal(layer.availability,region.id==="jezero"&&category==="Slope" ? "unavailable" : "available");
});
