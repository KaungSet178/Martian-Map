import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { loadJezeroRoutingGrid } from "../lib/routing/jezero/loader";
import { planJezeroRouteAlternatives } from "../lib/routing/jezero/router";
import { marsGreatCircleDistanceMeters } from "../lib/routing/jezero/geo";
const request=JSON.parse(readFileSync(0,"utf8"));
const bytes=readFileSync("data/routing/jezero/jezero_routing_grid.json");
const expected=JSON.parse(readFileSync("data/routing/integration-manifest.json","utf8")).jezeroGridSha256;
if(createHash("sha256").update(bytes).digest("hex")!==expected) throw new Error("Jezero routing grid checksum mismatch");
const grid=loadJezeroRoutingGrid();
const result=planJezeroRouteAlternatives(request.coordinates.map((coordinates:[number,number])=>({coordinates,verified:true})),grid,{maxSnapDistanceMeters:request.maxSnapMeters,enforceVerifiedTargets:true});
for(const route of [result.shortest,result.lowerCost]) {
  // Endpoint slope checks are separate from user coordinate verification.
  if(route.snappedWaypoints?.some(point=>{const [c,r]=grid.coordToCell(...point);return (grid.getSlope(c,r) ?? Infinity)>25;})) {
    route.status="unavailable";route.failureReason="Endpoint exceeds the 25 degree computational slope barrier";
  }
  for(const segment of route.segments ?? []) {
    Object.assign(segment,{elevationsMeters:segment.coordinates.map(point=>{const [c,r]=grid.coordToCell(...point);const z=grid.getElevation(c,r);if(z===null)throw new Error("Route left DEM support");return z;})});
  }
  if(route.snappedWaypoints) route.snapDistancesMeters=route.snappedWaypoints.map((p,i)=>marsGreatCircleDistanceMeters(request.coordinates[i],p));
}
process.stdout.write(JSON.stringify({alternatives:{shortest:result.shortest,"lower-terrain-cost":result.lowerCost}}));
