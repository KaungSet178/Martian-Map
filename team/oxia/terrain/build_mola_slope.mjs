#!/usr/bin/env node
// Oxia Planum MOLA elevation grid + regional slope display tiles
// (Oxia region owner tool). Run from the repository root:
//
//   node team/oxia/terrain/build_mola_slope.mjs            # reuse grid if present
//   node team/oxia/terrain/build_mola_slope.mjs --refetch  # sample Mars Trek again
//
// Source : NASA JPL Mars Trek elevation-profile service (the service behind
//          Mars Trek's Elevation Profile tool; listed in
//          https://trek.nasa.gov/mars/jpl/config/config.json as
//          services.multiDEMService.equirect):
//          https://trek.nasa.gov/mars/TrekServices/ws/elevationProfile/multiDEM/interpolated
//          ?path=[[lon1,lat1],[lon2,lat2]]&numberOfPoints=N&radiusInMeters=3390000
//          Longitudes are -180..180. Response: paths[0].DEM (name) and
//          paths[0].line[] = {x, y, elevation (m)}; No_Data_Value -32768.
//          Behaviour checked 2026-11-14: N points evenly spaced from start
//          to end, plus a repeated start point (and, through float rounding,
//          sometimes a repeated end point), so N = 201 over 2 degrees gives
//          0.01 degree spacing; points are snapped to grid columns and
//          duplicates dropped. Over Oxia the DEM is
//          "MGS MOLA, Global DEM" (~463 m), so 0.01 degree (~0.59 km) samples
//          interpolate MOLA; they add no detail beyond it.
// Grid   : 0.01 degree, longitudes 334.60..336.60 E (display -25.40..-23.40),
//          latitudes 19.15 down to 17.11 N: 201 x 205 samples. One request
//          per latitude row, sequential, 400 ms apart, 3 retries.
// Slope  : degrees, from central differences (one-sided at edges) using
//          Mars 2000 sphere distances, R = 3,396,190 m (the GCS of every
//          Mars Trek layer used for Oxia): dx = R cos(lat) dlon, dy = R dlat.
//          The service's radiusInMeters only affects its reported distances.
// Tiles  : public/maps/oxia/slope-tiles/{z}/{x}/{y}.png, 256 px Web-Mercator
//          XYZ RGBA, zooms 5-9, nearest grid cell, display classes
//          0-2, 2-5, 5-10, 10-20, >20 degrees. The >20 class marks slopes
//          beyond NASA's 20 degree suited-walking figure (EVA-EXP-0042 Rev B,
//          p.38; ICES-2025-129 p.7 treats >+/-20 degrees as no-go). At MOLA
//          scale these are display classes, not a safety assessment. Cells
//          outside the grid or with nodata are transparent.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GRID_PATH = "public/maps/oxia/elevation-grid.json";
const TILE_ROOT = "public/maps/oxia/slope-tiles";
const SERVICE =
  "https://trek.nasa.gov/mars/TrekServices/ws/elevationProfile/multiDEM/interpolated";
const R = 3396190;
const D2R = Math.PI / 180;
const STEP = 0.01;
const LON_W = -25.4, LON_E = -23.4; // display longitudes (334.60-336.60 E)
const LAT_N = 19.15, LAT_S = 17.11;
const NX = Math.round((LON_E - LON_W) / STEP) + 1; // 201
const NY = Math.round((LAT_N - LAT_S) / STEP) + 1; // 205
const NODATA = -32768;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchRow(lat) {
  const path = JSON.stringify([[LON_W, lat], [LON_E, lat]]);
  const url = `${SERVICE}?path=${encodeURIComponent(path)}&numberOfPoints=${NX}&radiusInMeters=3390000`;
  const ATTEMPTS = 6;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      const p = j.paths[0];
      // The start point is always repeated, and float rounding sometimes
      // repeats the end point too, so snap every point to its grid column
      // and keep the first sample per column.
      const byColumn = new Array(NX);
      for (const pt of p.line) {
        const i = Math.round((pt.x - LON_W) / STEP);
        if (i < 0 || i >= NX) throw new Error(`point outside row: ${pt.x}`);
        if (Math.abs(pt.x - (LON_W + i * STEP)) > 1e-6 || Math.abs(pt.y - lat) > 1e-6)
          throw new Error(`point ${pt.x},${pt.y} is off the 0.01 degree grid`);
        if (byColumn[i] === undefined) byColumn[i] = pt.elevation;
      }
      if (byColumn.some((v) => v === undefined)) throw new Error("missing grid columns");
      return {
        dem: p.DEM,
        nodata: j.No_Data_Value,
        values: byColumn.map((v) =>
          v === j.No_Data_Value ? NODATA : Math.round(v * 100) / 100,
        ),
      };
    } catch (e) {
      console.error(`  lat ${lat} attempt ${attempt}: ${e.message}`);
      if (attempt === ATTEMPTS) throw e;
      await sleep(Math.min(30000, 3000 * 2 ** (attempt - 1)));
    }
  }
}

// --- 1. Elevation grid -------------------------------------------------------
let grid;
if (existsSync(GRID_PATH) && !process.argv.includes("--refetch")) {
  grid = JSON.parse(readFileSync(GRID_PATH, "utf8"));
  console.log(`reusing ${GRID_PATH}`);
} else {
  // Rows are saved to a resume file outside the repo after each request, so
  // a dropped connection only costs the current row on the next run.
  const RESUME = join(tmpdir(), "marswalk-oxia-mola-rows.json");
  const done =
    existsSync(RESUME) && !process.argv.includes("--refetch")
      ? JSON.parse(readFileSync(RESUME, "utf8"))
      : {};
  if (Object.keys(done).length) console.log(`resuming: ${Object.keys(done).length} rows cached in ${RESUME}`);
  const t0 = Date.now();
  for (let r = 0; r < NY; r++) {
    const lat = Math.round((LAT_N - r * STEP) * 100) / 100;
    if (done[lat]) continue;
    const row = await fetchRow(lat);
    if (row.nodata !== NODATA) throw new Error(`unexpected nodata ${row.nodata}`);
    done[lat] = row;
    writeFileSync(RESUME, JSON.stringify(done));
    if (r % 25 === 0) console.log(`row ${r + 1}/${NY} lat ${lat} (${row.dem})`);
    await sleep(400);
  }
  const values = [];
  const dems = new Set();
  for (let r = 0; r < NY; r++) {
    const lat = Math.round((LAT_N - r * STEP) * 100) / 100;
    dems.add(done[lat].dem);
    values.push(...done[lat].values);
  }
  grid = {
    description:
      "Oxia Planum elevation samples from the NASA JPL Mars Trek elevation-profile service. Values interpolate the DEM named in 'dem'; 0.01 degree spacing does not add detail beyond that DEM.",
    source_url: SERVICE,
    request_template:
      "?path=[[lon_west,lat],[lon_east,lat]]&numberOfPoints=201&radiusInMeters=3390000 (one request per latitude row; duplicated start point dropped)",
    dem: [...dems],
    fetched_at: new Date().toISOString(),
    fetch_seconds: Math.round((Date.now() - t0) / 1000),
    units: "meters (as returned by the service; MOLA heights are relative to the Mars areoid)",
    nodata: NODATA,
    coordinate_convention:
      "planetocentric latitude; longitude listed both as display (-180..180) and east 0-360",
    layout: "row-major, rows north to south (lat_axis order), columns west to east (lon_axis order)",
    lat_axis: Array.from({ length: NY }, (_, r) => Math.round((LAT_N - r * STEP) * 100) / 100),
    lon_axis_display: Array.from({ length: NX }, (_, c) => Math.round((LON_W + c * STEP) * 100) / 100),
    lon_axis_east_0_360: Array.from({ length: NX }, (_, c) => Math.round((LON_W + c * STEP + 360) * 100) / 100),
    values,
  };
  mkdirSync(dirname(GRID_PATH), { recursive: true });
  writeFileSync(GRID_PATH, JSON.stringify(grid) + "\n");
  rmSync(RESUME, { force: true });
}

// --- 2. Slope ----------------------------------------------------------------
const z = (r, c) => grid.values[r * NX + c];
const slope = new Float64Array(NX * NY).fill(NaN);
for (let r = 0; r < NY; r++) {
  const lat = grid.lat_axis[r];
  const dxm = R * Math.cos(lat * D2R) * STEP * D2R; // metres per column
  const dym = R * STEP * D2R; // metres per row
  for (let c = 0; c < NX; c++) {
    const c0 = Math.max(0, c - 1), c1 = Math.min(NX - 1, c + 1);
    const r0 = Math.max(0, r - 1), r1 = Math.min(NY - 1, r + 1);
    const vals = [z(r, c0), z(r, c1), z(r0, c), z(r1, c)];
    if (vals.some((v) => v === NODATA)) continue;
    const dzdx = (z(r, c1) - z(r, c0)) / ((c1 - c0) * dxm);
    const dzdy = (z(r0, c) - z(r1, c)) / ((r1 - r0) * dym);
    slope[r * NX + c] = Math.atan(Math.hypot(dzdx, dzdy)) / D2R;
  }
}
const valid = [...slope].filter((v) => !Number.isNaN(v)).sort((a, b) => a - b);
const pct = (p) => valid[Math.min(valid.length - 1, Math.floor(p * valid.length))];
const elev = grid.values.filter((v) => v !== NODATA);
const CLASSES = [
  { max: 2, label: "0-2", rgb: [255, 255, 204] },
  { max: 5, label: "2-5", rgb: [254, 217, 118] },
  { max: 10, label: "5-10", rgb: [253, 141, 60] },
  { max: 20, label: "10-20", rgb: [227, 26, 28] },
  { max: Infinity, label: ">20", rgb: [128, 0, 38] },
];
const classCounts = Object.fromEntries(CLASSES.map((k) => [k.label, 0]));
for (const v of valid) classCounts[CLASSES.find((k) => v < k.max).label]++;

// Cells steeper than 20 degrees: total area and connected patches
// (8-connected), each with its centre and extent in planetocentric
// latitude / east longitude 0-360.
const LIMIT = 20;
const cellArea = (r) => {
  const lat = grid.lat_axis[r] * D2R;
  return (R * STEP * D2R) * (R * Math.cos(lat) * STEP * D2R); // m^2
};
let steepArea = 0, totalArea = 0;
for (let r = 0; r < NY; r++)
  for (let c = 0; c < NX; c++) {
    const s = slope[r * NX + c];
    if (Number.isNaN(s)) continue;
    totalArea += cellArea(r);
    if (s > LIMIT) steepArea += cellArea(r);
  }
const seen = new Uint8Array(NX * NY);
const patches = [];
for (let r = 0; r < NY; r++)
  for (let c = 0; c < NX; c++) {
    const i = r * NX + c;
    if (seen[i] || !(slope[i] > LIMIT)) continue;
    const stack = [i];
    seen[i] = 1;
    const cells = [];
    while (stack.length) {
      const k = stack.pop();
      cells.push(k);
      const kr = Math.floor(k / NX), kc = k % NX;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = kr + dr, nc = kc + dc;
          if (nr < 0 || nr >= NY || nc < 0 || nc >= NX) continue;
          const n = nr * NX + nc;
          if (!seen[n] && slope[n] > LIMIT) { seen[n] = 1; stack.push(n); }
        }
    }
    const lats = cells.map((k) => grid.lat_axis[Math.floor(k / NX)]);
    const lons = cells.map((k) => grid.lon_axis_east_0_360[k % NX]);
    const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
    patches.push({
      cells: cells.length,
      area_km2: +(cells.reduce((s, k) => s + cellArea(Math.floor(k / NX)), 0) / 1e6).toFixed(2),
      centre_lat: +mean(lats).toFixed(2),
      centre_lon_east: +mean(lons).toFixed(2),
      lat_range: [Math.min(...lats), Math.max(...lats)],
      lon_east_range: [Math.min(...lons), Math.max(...lons)],
      max_slope_deg: +Math.max(...cells.map((k) => slope[k])).toFixed(2),
    });
  }
patches.sort((a, b) => b.cells - a.cells);

// --- 3. Slope tiles ------------------------------------------------------------
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
function encodeRgbaPng(w, h, rgba) {
  const stride = w * 4;
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
const lonAt = (zz, x, fx) => ((x + fx) / 2 ** zz) * 360 - 180;
const latAt = (zz, y, fy) => Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + fy)) / 2 ** zz))) / D2R;
const yIndexFor = (zz, lat) => Math.floor(((1 - Math.asinh(Math.tan(lat * D2R)) / Math.PI) / 2) * 2 ** zz);
const xIndexFor = (zz, lon) => Math.floor(((lon + 180) / 360) * 2 ** zz);

let tilesWritten = 0, bytesWritten = 0;
const MIN_Z = 5, MAX_Z = 9;
for (let zz = MIN_Z; zz <= MAX_Z; zz++) {
  for (let x = xIndexFor(zz, LON_W); x <= xIndexFor(zz, LON_E); x++) {
    for (let y = yIndexFor(zz, LAT_N); y <= yIndexFor(zz, LAT_S); y++) {
      const rgba = Buffer.alloc(256 * 256 * 4);
      for (let py = 0; py < 256; py++) {
        const lat = latAt(zz, y, (py + 0.5) / 256);
        const r = Math.round((LAT_N - lat) / STEP);
        if (r < 0 || r >= NY) continue;
        for (let px = 0; px < 256; px++) {
          const lon = lonAt(zz, x, (px + 0.5) / 256);
          const c = Math.round((lon - LON_W) / STEP);
          if (c < 0 || c >= NX) continue;
          const s = slope[r * NX + c];
          if (Number.isNaN(s)) continue;
          const k = CLASSES.find((cl) => s < cl.max);
          const o = (py * 256 + px) * 4;
          rgba[o] = k.rgb[0];
          rgba[o + 1] = k.rgb[1];
          rgba[o + 2] = k.rgb[2];
          rgba[o + 3] = 255;
        }
      }
      const png = encodeRgbaPng(256, 256, rgba);
      const path = join(TILE_ROOT, String(zz), String(x), `${y}.png`);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, png);
      tilesWritten++;
      bytesWritten += png.length;
    }
  }
}

const report = {
  source: SERVICE,
  dem: grid.dem,
  grid_file: GRID_PATH,
  grid_fetched_at: grid.fetched_at,
  grid_size: `${NX} x ${NY}`,
  grid_bytes: Buffer.byteLength(readFileSync(GRID_PATH)),
  nodata_samples: grid.values.length - elev.length,
  elevation_m: { min: Math.min(...elev), max: Math.max(...elev) },
  slope_radius_m: R,
  slope_deg: {
    min: +valid[0].toFixed(3),
    p50: +pct(0.5).toFixed(3),
    p95: +pct(0.95).toFixed(3),
    p99: +pct(0.99).toFixed(3),
    max: +valid[valid.length - 1].toFixed(3),
  },
  slope_class_cells: classCounts,
  over_20_deg: {
    cells: valid.filter((v) => v > LIMIT).length,
    area_km2: +(steepArea / 1e6).toFixed(2),
    percent_of_area: +((100 * steepArea) / totalArea).toFixed(3),
    total_area_km2: +(totalArea / 1e6).toFixed(0),
    patches,
  },
  tiles: { root: TILE_ROOT, zoom_range: [MIN_Z, MAX_Z], written: tilesWritten, bytes: bytesWritten },
  generated_at: new Date().toISOString(),
};
writeFileSync(join(HERE, "slope_report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
