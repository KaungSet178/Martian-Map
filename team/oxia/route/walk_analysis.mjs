#!/usr/bin/env node
// Oxia Planum candidate walk: offline analysis (not an app feature).
// Run from the repository root:  node team/oxia/route/walk_analysis.mjs
//
// Input : public/maps/oxia/elevation-grid.json (MGS MOLA heights in metres,
//         from the Mars Trek elevation-profile service, 0.01 degree grid;
//         real detail ~463 m).
// Walk  : Start (Scenario point, not stored in region data) = midpoint of
//         oxia-objective-1 (18.22 N, 335.83 E) and the CRISM hydrous
//         detection (18.17 N, 335.82 E) = 18.195 N, 335.825 E.
//         Legs: Start -> objective-1 -> hydrous detection -> Start.
// Method: Mars sphere R = 3,396,190 m (Mars 2000 sphere, as for every Oxia
//         layer). Elevation along any line is bilinear in the grid.
//         (a) Straight great-circle line per leg, sampled every ~50 m.
//         (b) A* least-cost path on the grid's 8-connected nodes:
//             move cost = horizontal distance x (1 + K x slope_deg), where
//             slope_deg is the move's own gradient (|dz| / distance), and
//             nodes whose terrain slope (central differences, as in the
//             slope layer) exceeds 20 degrees are no-go. K = 0.05 per
//             degree (a 10 degree move costs 1.5x its distance). Leg end
//             points are joined to their nearest grid node by a straight
//             connector, included in the totals.
// Checks: NASA EVA-EXP-0042 Rev B (tier 2): 2 km max walking radius from
//         the lander (p.39), 8 h EVA + 1 h backup O2 (p.36), ~2 km/h pace
//         and 16 km cumulative (p.40), 20 degree slope (p.38; also
//         ICES-2025-129 p.7). These are lunar-surface figures.
// Labels: path = Modeled; Start = Scenario. At MOLA detail (~463 m) small
//         hazards are not resolved; the path is not safety-validated.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = 3396190;
const D2R = Math.PI / 180;
const K = 0.05;
const NO_GO_DEG = 20;
const PACE_KMH = 2;
const SAMPLE_M = 50;

const grid = JSON.parse(readFileSync("public/maps/oxia/elevation-grid.json", "utf8"));
const NY = grid.lat_axis.length, NX = grid.lon_axis_east_0_360.length;
const LAT_N = grid.lat_axis[0], LON_W = grid.lon_axis_east_0_360[0];
const STEP = 0.01;
const zAt = (r, c) => grid.values[r * NX + c];

const POINTS = {
  start: { name: "Start (Scenario midpoint)", lat: 18.195, lon: 335.825, evidence: "Scenario" },
  obj1: { name: "oxia-objective-1 Clay-rich bedrock study", lat: 18.22, lon: 335.83, evidence: "Interpreted" },
  hydrous: { name: "CRISM hydrous detection (Mars Trek, FID 773)", lat: 18.17, lon: 335.82, evidence: "Interpreted" },
};
const LEGS = [["start", "obj1"], ["obj1", "hydrous"], ["hydrous", "start"]];

// --- geometry ---------------------------------------------------------------
function haversine(a, b) {
  const p1 = a.lat * D2R, p2 = b.lat * D2R, dp = p2 - p1, dl = (b.lon - a.lon) * D2R;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function interpGC(a, b, f) {
  const p1 = a.lat * D2R, l1 = a.lon * D2R, p2 = b.lat * D2R, l2 = b.lon * D2R;
  const d = haversine(a, b) / R;
  if (d === 0) return { ...a };
  const A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
  const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
  const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
  const z = A * Math.sin(p1) + B * Math.sin(p2);
  return { lat: Math.atan2(z, Math.hypot(x, y)) / D2R, lon: ((Math.atan2(y, x) / D2R) + 360) % 360 };
}
function elevation(p) {
  const fr = (LAT_N - p.lat) / STEP, fc = (p.lon - LON_W) / STEP;
  const r0 = Math.max(0, Math.min(NY - 2, Math.floor(fr))), c0 = Math.max(0, Math.min(NX - 2, Math.floor(fc)));
  const ty = fr - r0, tx = fc - c0;
  return (zAt(r0, c0) * (1 - tx) + zAt(r0, c0 + 1) * tx) * (1 - ty) + (zAt(r0 + 1, c0) * (1 - tx) + zAt(r0 + 1, c0 + 1) * tx) * ty;
}
const nodePoint = (r, c) => ({ lat: LAT_N - r * STEP, lon: LON_W + c * STEP });
const nearestNode = (p) => [Math.round((LAT_N - p.lat) / STEP), Math.round((p.lon - LON_W) / STEP)];

// Terrain slope per node (degrees), same method as the oxia-slope layer.
const terrainSlope = new Float64Array(NX * NY);
for (let r = 0; r < NY; r++) {
  const dxm = R * Math.cos(grid.lat_axis[r] * D2R) * STEP * D2R, dym = R * STEP * D2R;
  for (let c = 0; c < NX; c++) {
    const c0 = Math.max(0, c - 1), c1 = Math.min(NX - 1, c + 1), r0 = Math.max(0, r - 1), r1 = Math.min(NY - 1, r + 1);
    const gx = (zAt(r, c1) - zAt(r, c0)) / ((c1 - c0) * dxm), gy = (zAt(r0, c) - zAt(r1, c)) / ((r1 - r0) * dym);
    terrainSlope[r * NX + c] = Math.atan(Math.hypot(gx, gy)) / D2R;
  }
}

// --- profile statistics along a polyline of points ----------------------------
function profile(pts) {
  let dist = 0, up = 0, down = 0, maxSlope = 0, slopeDistSum = 0;
  let prev = { ...pts[0], z: elevation(pts[0]) };
  for (let i = 1; i < pts.length; i++) {
    const cur = { ...pts[i], z: elevation(pts[i]) };
    const d = haversine(prev, cur);
    if (d > 0) {
      const dz = cur.z - prev.z;
      const s = Math.atan(Math.abs(dz) / d) / D2R;
      dist += d;
      if (dz > 0) up += dz; else down -= dz;
      maxSlope = Math.max(maxSlope, s);
      slopeDistSum += s * d;
    }
    prev = cur;
  }
  return { distance_m: dist, ascent_m: up, descent_m: down, max_slope_deg: maxSlope, mean_slope_deg: dist ? slopeDistSum / dist : 0 };
}
function densify(pts) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const n = Math.max(1, Math.ceil(haversine(pts[i - 1], pts[i]) / SAMPLE_M));
    for (let k = 1; k <= n; k++) out.push(interpGC(pts[i - 1], pts[i], k / n));
  }
  return out;
}

// --- A* on the grid -----------------------------------------------------------
function astar(start, goal) {
  const key = (r, c) => r * NX + c;
  const [sr, sc] = start, [gr, gc] = goal;
  const g = new Float64Array(NX * NY).fill(Infinity), came = new Int32Array(NX * NY).fill(-1);
  const goalPt = nodePoint(gr, gc);
  const h = (r, c) => haversine(nodePoint(r, c), goalPt); // admissible: cost >= distance
  const open = [[h(sr, sc), sr, sc]];
  g[key(sr, sc)] = 0;
  const closed = new Uint8Array(NX * NY);
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [, r, c] = open.splice(bi, 1)[0];
    const k0 = key(r, c);
    if (closed[k0]) continue;
    closed[k0] = 1;
    if (r === gr && c === gc) break;
    const p0 = nodePoint(r, c), z0 = zAt(r, c);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= NY || nc < 0 || nc >= NX) continue;
      const k1 = key(nr, nc);
      if (closed[k1] || terrainSlope[k1] > NO_GO_DEG) continue;
      const d = haversine(p0, nodePoint(nr, nc));
      const s = Math.atan(Math.abs(zAt(nr, nc) - z0) / d) / D2R;
      const cost = g[k0] + d * (1 + K * s);
      if (cost < g[k1]) { g[k1] = cost; came[k1] = k0; open.push([cost + h(nr, nc), nr, nc]); }
    }
  }
  const path = [];
  for (let k = key(gr, gc); k !== -1; k = came[k]) path.unshift(nodePoint(Math.floor(k / NX), k % NX));
  return { path, cost: g[key(gr, gc)] };
}

// Max distance of any path vertex from the straight line (cross-track, metres).
function maxDeviation(pathPts, a, b) {
  const line = densify([a, b]);
  let worst = 0;
  for (const p of pathPts) {
    let best = Infinity;
    for (const q of line) best = Math.min(best, haversine(p, q));
    worst = Math.max(worst, best);
  }
  return worst;
}

const round = (v, n = 1) => Math.round(v * 10 ** n) / 10 ** n;
const fmt = (s) => ({
  distance_km: round(s.distance_m / 1000, 3),
  ascent_m: round(s.ascent_m), descent_m: round(s.descent_m),
  max_slope_deg: round(s.max_slope_deg, 2), mean_slope_deg: round(s.mean_slope_deg, 2),
  walking_time_h_at_2kmh: round(s.distance_m / 1000 / PACE_KMH, 2),
});

const legs = [];
const totals = { straight: { distance_m: 0, ascent_m: 0, descent_m: 0, max_slope_deg: 0, slopeDist: 0 }, astar: { distance_m: 0, ascent_m: 0, descent_m: 0, max_slope_deg: 0, slopeDist: 0 } };
let allPathPts = [];
for (const [from, to] of LEGS) {
  const a = POINTS[from], b = POINTS[to];
  const straight = profile(densify([a, b]));
  const sn = nearestNode(a), gn = nearestNode(b);
  const { path } = astar(sn, gn);
  const full = [a, ...path, b];
  const modeled = profile(densify(full));
  const dev = maxDeviation(full, a, b);
  allPathPts = allPathPts.concat(full);
  for (const [t, s] of [["straight", straight], ["astar", modeled]]) {
    totals[t].distance_m += s.distance_m; totals[t].ascent_m += s.ascent_m; totals[t].descent_m += s.descent_m;
    totals[t].max_slope_deg = Math.max(totals[t].max_slope_deg, s.max_slope_deg);
    totals[t].slopeDist += s.mean_slope_deg * s.distance_m;
  }
  legs.push({
    from: a.name, to: b.name,
    straight_line: fmt(straight),
    astar_path: {
      ...fmt(modeled),
      grid_nodes: path.length,
      max_deviation_from_straight_m: Math.round(dev),
      extra_distance_vs_straight_m: Math.round(modeled.distance_m - straight.distance_m),
      path_lat_lon_east: full.map((p) => [round(p.lat, 4), round(p.lon, 4)]),
    },
  });
}
const tot = (t) => fmt({ ...totals[t], mean_slope_deg: totals[t].slopeDist / totals[t].distance_m });
const maxRadius = Math.max(...allPathPts.map((p) => haversine(POINTS.start, p)));
const astarTotal = tot("astar");
const noGoNodes = [...terrainSlope].filter((s) => s > NO_GO_DEG).length;

const report = {
  title: "Oxia candidate walk: offline analysis",
  labels: { path: "Modeled", start: "Scenario", stops: "Interpreted (Mars Trek detection points, ~0.6 km precision)" },
  caveat:
    "Elevation is MOLA (~463 m real detail) interpolated on a 0.01 degree grid: boulders, banks, small craters and short steep slopes are not resolved. The path is not safety-validated and is not an approved route.",
  input: { grid: "public/maps/oxia/elevation-grid.json", dem: grid.dem, fetched_at: grid.fetched_at },
  method: {
    mars_radius_m: R,
    straight_line: `great-circle, bilinear elevation sampled every ~${SAMPLE_M} m`,
    astar: `8-connected grid nodes (0.01 deg), move cost = distance x (1 + K x move slope in degrees), K = ${K}; nodes with terrain slope > ${NO_GO_DEG} deg are no-go (${noGoNodes} such nodes in the whole grid); end points joined to nearest nodes by straight connectors`,
    slope_along_path: "move gradient between successive ~50 m samples of the bilinear MOLA surface",
  },
  interpretation:
    "The corridor is nearly flat at MOLA scale (max ~1.1 degrees along either path), so no cell comes near the 20 degree no-go limit and terrain does not force a detour. The A* path's extra distance and its few-hundred-metre deviation come from the 0.01 degree (~0.59 km) grid: end points snap to grid nodes and 8-connected moves zig-zag. For this walk the straight great-circle figures are the better distance and time estimate; A* is reported to show that the cost model finds no terrain reason to leave the straight line.",
  points: POINTS,
  legs,
  totals: { straight_line: tot("straight"), astar_path: astarTotal },
  nasa_checks_tier2: {
    source: "NASA EVA-EXP-0042 Rev B, Exploration EVA System Concept of Operations (Oct 19, 2020); ICES-2025-129 (NTRS 20250001829). Lunar-surface figures; Mars gravity is higher.",
    max_radius_from_start: { limit_km: 2, page: "p.39", value_km: round(maxRadius / 1000, 3), within: maxRadius <= 2000 },
    cumulative_distance: { limit_km: 16, page: "p.40", value_km: astarTotal.distance_km, within: astarTotal.distance_km <= 16 },
    eva_duration: { limit_h: 8, backup_o2_h: 1, page: "p.36", walking_time_h: astarTotal.walking_time_h_at_2kmh, within: astarTotal.walking_time_h_at_2kmh <= 8, note: "walking time only; science stops, ingress/egress not included" },
    pace: { kmh: PACE_KMH, page: "p.40" },
    slope: { limit_deg: 20, pages: "EVA-EXP-0042 p.38; ICES-2025-129 p.7", max_on_path_deg: astarTotal.max_slope_deg, within: astarTotal.max_slope_deg <= 20 },
  },
  generated_at: new Date().toISOString(),
};
writeFileSync(join(HERE, "walk_report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ legs: legs.map((l) => ({ from: l.from, to: l.to, straight: l.straight_line, astar: { ...l.astar_path, path_lat_lon_east: `${l.astar_path.path_lat_lon_east.length} pts` } })), totals: report.totals, nasa: report.nasa_checks_tier2 }, null, 1));
