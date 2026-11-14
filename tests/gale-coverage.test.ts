import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Map as MapInstance } from "maplibre-gl";
import { getRegion } from "../lib/regions/registry";
import { regionalExtent, globalExtent } from "../regions/gale/terrain-layers";
import { fitLayerCoverage, fitOverview } from "../lib/map/camera";
import { applyLayerStates, displayBounds, mountRegionLayers, updateLayerState } from "../lib/map/region-layers";
import { layerSchema } from "../lib/contracts/science";

const gale = getRegion("gale")!;
const expected = [
  { id: "regional", bounds: regionalExtent, wsen: [137.32743882663516,-4.838798324880672,137.47471920704652,-4.563976171741976], posting: 30, support: 90, pattern: "solid" },
  { id: "global", bounds: globalExtent, wsen: [137.09987566364117,-5.096221490785939,137.69709505066461,-4.299928974754662], posting: 200, support: 600, pattern: "dashed" },
];

test("coverage uses the audited valid grid geometry and unchanged coverage assets", () => {
  for (const item of expected) {
    const layer = gale.layers.find((l) => l.id === `gale-coverage-${item.id}`)!;
    assert.deepEqual(layer.zoom_extent, item.bounds);
    assert.equal(layer.default_visible, false);
    assert.equal(layer.kind, "overlay");
    assert.equal(layer.rendering.kind, "geojson");
    if (layer.rendering.kind !== "geojson") throw Error("Expected vector boundary");
    assert.equal(layer.rendering.geometry, "line");
    assert.equal(layer.rendering.line_pattern, item.pattern);
    assert.equal(layer.rendering.focus_extent, undefined);
    const coverage = JSON.parse(readFileSync(`public${layer.rendering.url}`, "utf8"));
    const [w,s,e,n] = item.wsen;
    assert.deepEqual(coverage.features[0].geometry.coordinates, [[[w,s],[e,s],[e,n],[w,n],[w,s]]]);
    assert.deepEqual([item.bounds.west_east,item.bounds.south_latitude,item.bounds.east_east,item.bounds.north_latitude],item.wsen);
  }
});

test("all six terrain themes distinguish source/crop/validity/posting/support and correct attribution", () => {
  for (const item of expected) for (const theme of ["elevation","hillshade","slope"]) {
    const layer = gale.layers.find((l) => l.id === `gale-${item.id}-${theme}`)!;
    const data = layer.data_details!;
    assert.equal(data.nominal_posting_m,item.posting);
    assert.equal(data.gradient_support_north_m,item.support);
    for (const text of [data.source_product,data.source_coverage,data.display_crop,data.valid_coverage,data.crs]) assert.ok(text.length > 20);
    assert.match(layer.limitations,/effective.*resolution/);
    assert.match(layer.limitations,/unverified|unmeasured/);
    assert.doesNotMatch(layer.coverage!,/across the entire Gale Crater/);
    if (item.id === "global") {
      assert.match(data.display_crop,/35.28 × 47.20/);
      assert.match(data.display_crop,/Not a complete Gale Crater map/);
    } else {
      assert.match(data.display_crop,/beyond the fixed.*optical overview/);
      for (const name of ["Divya M. Persaud","Alfiah Diana Rizky Putri","Jan-Peter Muller"]) assert.ok(layer.attribution!.includes(name));
    }
  }
  assert.doesNotMatch(JSON.stringify(gale.source_references),/Persaud, S\./);
  assert.equal(gale.layers.find(l=>l.id==="gale-geology")!.data_details!.nominal_posting_m,null);
});

test("coverage lines and casings mount once, follow independent state, and clean up shared sources", () => {
  const sources = new Map<string, unknown>();
  const layers = new Map<string, { type: string; source: string; layout: Record<string, unknown>; paint: Record<string, unknown> }>();
  const fake = {
    addSource: (id: string, source: unknown) => { assert.ok(!sources.has(id)); sources.set(id,source); },
    addLayer: (layer: typeof layers extends Map<string, infer T> ? T & {id:string} : never) => { assert.ok(!layers.has(layer.id)); layers.set(layer.id,layer); },
    getSource: (id:string)=>sources.get(id), getLayer:(id:string)=>layers.get(id),
    removeLayer:(id:string)=>layers.delete(id),
    removeSource:(id:string)=>{ assert.ok(![...layers.values()].some(l=>l.source===id));sources.delete(id); },
    setLayoutProperty:(id:string,key:string,value:unknown)=>{ layers.get(id)!.layout[key]=value; },
    setPaintProperty:(id:string,key:string,value:unknown)=>{ layers.get(id)!.paint[key]=value; },
  } as unknown as MapInstance;
  const cleanup=mountRegionLayers(fake,gale);
  const count=layers.size;
  assert.equal(count,gale.layers.length+2);
  let state=updateLayerState(gale,{},"gale-coverage-regional",{visible:true});
  state=updateLayerState(gale,state,"gale-coverage-global",{visible:true});
  for (let i=0;i<3;i++) for (const theme of ["elevation","slope","hillshade"]) {
    state=updateLayerState(gale,state,`gale-regional-${theme}`,{visible:true});
    applyLayerStates(fake,gale,state,false);
    assert.equal(layers.size,count);
    for(const id of ["regional","global"]) for(const suffix of ["","-halo"]) {
      const line=layers.get(`region-gale-coverage-${id}${suffix}`)!;
      assert.equal(line.type,"line"); assert.equal(line.layout.visibility,"visible");
      assert.equal(line.paint["fill-opacity"],undefined);
    }
  }
  const solid=layers.get("region-gale-coverage-regional")!;
  const dashed=layers.get("region-gale-coverage-global")!;
  assert.equal(solid.paint["line-dasharray"],undefined);
  assert.deepEqual(dashed.paint["line-dasharray"],[6,4]);
  state=updateLayerState(gale,state,"gale-coverage-regional",{visible:false});
  state=updateLayerState(gale,state,"gale-coverage-global",{opacity:35});
  applyLayerStates(fake,gale,state,false);
  assert.equal(solid.layout.visibility,"none");
  assert.equal(dashed.layout.visibility,"visible");
  assert.equal(layers.get("region-gale-coverage-global-halo")!.paint["line-opacity"],.35);
  assert.equal(layers.get("region-gale-regional-hillshade")!.layout.visibility,"visible");
  applyLayerStates(fake,gale,state,true); assert.equal(dashed.layout.visibility,"none");
  cleanup(); assert.equal(layers.size,0); assert.equal(sources.size,0);
  assert.equal(layerSchema.safeParse({...gale.layers.find(l=>l.id==="gale-coverage-global")!,rendering:{kind:"geojson",url:"/test.geojson",geometry:"fill",color:"#FFFFFF",line_pattern:"dashed"}}).success,false);
});

test("explicit coverage fits use authoritative bounds and existing responsive camera policy", () => {
  const fits:unknown[][]=[];const limits:unknown[]=[];
  const map={stop:()=>{},setMaxBounds:(v:unknown)=>limits.push(v),setPadding:()=>{},getMaxZoom:()=>18,fitBounds:(...a:unknown[])=>fits.push(a)} as unknown as MapInstance;
  const container={getBoundingClientRect:()=>({width:390,height:450,top:0,right:390,bottom:450}),parentElement:{querySelector:()=>null}} as unknown as HTMLElement;
  const original=gale.map.supported_extent;
  for(const item of expected) {
    assert.equal(fitLayerCoverage(map,gale,`gale-coverage-${item.id}`,container),true);
    assert.deepEqual(fits.at(-1)![0],displayBounds(item.bounds));
    const options=fits.at(-1)![1] as {padding:Record<string,number>;maxZoom:number;bearing:number;pitch:number;absolutePadding:boolean};
    assert.equal(options.maxZoom,18);assert.equal(options.bearing,0);assert.equal(options.pitch,0);assert.equal(options.absolutePadding,true);
    assert.ok(Object.values(options.padding).every(v=>v>=24));
  }
  assert.equal(fitLayerCoverage(map,gale,"gale-regional-elevation",container),false);
  assert.deepEqual(gale.map.supported_extent,original);
  fitOverview(map,gale,container,false);
  assert.deepEqual(fits.at(-1)![0],displayBounds(original!));
  assert.ok(limits.every(v=>v===null));
  const geology = gale.layers.find(l=>l.id==="gale-geology")!.rendering;
  assert.ok(geology.kind === "geojson");
  assert.deepEqual(geology.focus_extent,{
    west_east:137.4065970458571,east_east:137.4110534954222,south_latitude:-4.789072816244821,north_latitude:-4.785334720408685,
  });
  for(const id of ["jezero","oxia"]) assert.ok(getRegion(id)!.layers.every(l=>!l.zoom_extent));
});
