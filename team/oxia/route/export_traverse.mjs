#!/usr/bin/env node
// Export the A* candidate traverse from walk_report.json as a display GeoJSON.
// Run from the repository root after walk_analysis.mjs:
//   node team/oxia/route/export_traverse.mjs
//
// Output: public/maps/oxia/candidate-traverse.geojson, one LineString per leg
// in the reviewed display convention ([lon, lat], east longitude 0-360
// converted to -180..180 by lon - 360 when lon > 180), as in
// docs/REGION_DEVELOPMENT_GUIDE.md step 4. A fixed, offline candidate line:
// Modeled, experimental, not live routing and not safety-validated.

import { readFileSync, writeFileSync } from "node:fs";

const report = JSON.parse(readFileSync("team/oxia/route/walk_report.json", "utf8"));
const toDisplayLon = (lon) => (lon > 180 ? lon - 360 : lon);
const r4 = (v) => Math.round(v * 1e4) / 1e4;

const features = report.legs.map((leg, i) => ({
  type: "Feature",
  geometry: {
    type: "LineString",
    coordinates: leg.astar_path.path_lat_lon_east.map(([lat, lon]) => [r4(toDisplayLon(lon)), r4(lat)]),
  },
  properties: {
    leg: i + 1,
    name: `${leg.from} -> ${leg.to}`,
    from: leg.from,
    to: leg.to,
    distance_km: leg.astar_path.distance_km,
    ascent_m: leg.astar_path.ascent_m,
    descent_m: leg.astar_path.descent_m,
    max_slope_deg: leg.astar_path.max_slope_deg,
    walking_time_h_at_2kmh: leg.astar_path.walking_time_h_at_2kmh,
    evidence: "Modeled",
    method: report.method.astar,
    k_per_degree: 0.05,
    no_go_slope_deg: 20,
    grid_source: `${report.input.grid} (${report.input.dem.join(", ")}, fetched ${report.input.fetched_at})`,
    start_point: "Scenario midpoint, not a landing site",
  },
}));

writeFileSync(
  "public/maps/oxia/candidate-traverse.geojson",
  JSON.stringify({ type: "FeatureCollection", features }, null, 1) + "\n",
);
console.log(JSON.stringify(features.map((f) => ({ leg: f.properties.leg, pts: f.geometry.coordinates.length, first: f.geometry.coordinates[0], last: f.geometry.coordinates.at(-1), km: f.properties.distance_km })), null, 1));
