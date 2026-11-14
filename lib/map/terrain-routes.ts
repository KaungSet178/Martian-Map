import type { Map as MapInstance, GeoJSONSource } from "maplibre-gl";
import type { TerrainRoute, TerrainPreference } from "@/lib/routing/contracts";
export function mountTerrainRoutes(map:MapInstance) {
  map.addSource("terrain-routes",{type:"geojson",data:{type:"FeatureCollection",features:[]}});
  map.addLayer({id:"terrain-route-casing",type:"line",source:"terrain-routes",paint:{"line-color":"#08101e","line-width":["case",["get","selected"],8,5],"line-opacity":0.9}});
  map.addLayer({id:"terrain-route-alternative",type:"line",source:"terrain-routes",filter:["==",["get","selected"],false],paint:{"line-color":"#ffc36b","line-width":2,"line-dasharray":[2,2]}});
  map.addLayer({id:"terrain-route-selected",type:"line",source:"terrain-routes",filter:["==",["get","selected"],true],paint:{"line-color":"#59e3fa","line-width":4}});
  return ()=>{for(const id of ["terrain-route-selected","terrain-route-alternative","terrain-route-casing"])if(map.getLayer(id))map.removeLayer(id);if(map.getSource("terrain-routes"))map.removeSource("terrain-routes");};
}
export function updateTerrainRoutes(map:MapInstance,routes:TerrainRoute[],preference:TerrainPreference,region:string,preview:boolean) {
  const source=map.getSource("terrain-routes") as GeoJSONSource|undefined;
  source?.setData({type:"FeatureCollection",features:preview?[]:routes.filter(route=>route.regionId===region && route.status!=="unavailable" && route.coordinates.length>=2).map(route=>({type:"Feature",properties:{selected:route.preference===preference,preference:route.preference},geometry:{type:"LineString",coordinates:route.coordinates.map(([lon,lat])=>[lon>180?lon-360:lon,lat])}}))});
}
