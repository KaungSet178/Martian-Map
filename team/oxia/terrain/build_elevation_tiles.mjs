#!/usr/bin/env node
// Oxia Planum elevation display tiles from the existing MOLA grid
// (Oxia region owner tool). No network access. Run from the repo root:
//
//   node team/oxia/terrain/build_elevation_tiles.mjs
//
// Input  : public/maps/oxia/elevation-grid.json (MGS MOLA heights in metres,
//          relative to the Mars areoid, sampled at 0.01 degree from the Mars
//          Trek elevation-profile service by build_mola_slope.mjs).
// Output : public/maps/oxia/elevation-tiles/{z}/{x}/{y}.png, 256 px
//          Web-Mercator XYZ RGBA, zooms 5-9 (same as the slope tiles),
//          nearest grid cell, plain colour by height class (no shading).
//          Cells outside the grid or with nodata are transparent.
// Classes: 100 m steps around the bulk of the data (p10 -3107 m, p90
//          -2744 m), with open-ended outer classes so the full range
//          (-3791 to -2381 m) is covered. Colours follow the Jezero terrain
//          legend ramp (low = blue, high = pale).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GRID_PATH = "public/maps/oxia/elevation-grid.json";
const TILE_ROOT = "public/maps/oxia/elevation-tiles";
const D2R = Math.PI / 180;
const STEP = 0.01;

const grid = JSON.parse(readFileSync(GRID_PATH, "utf8"));
const NY = grid.lat_axis.length;
const NX = grid.lon_axis_display.length;
const LAT_N = grid.lat_axis[0];
const LAT_S = grid.lat_axis[NY - 1];
const LON_W = grid.lon_axis_display[0];
const LON_E = grid.lon_axis_display[NX - 1];

export const CLASSES = [
  { max: -3100, label: "below -3100", rgb: [0x50, 0x81, 0xb5] },
  { max: -3000, label: "-3100 to -3000", rgb: [0x8d, 0xaf, 0xa2] },
  { max: -2900, label: "-3000 to -2900", rgb: [0xce, 0xc3, 0x90] },
  { max: -2800, label: "-2900 to -2800", rgb: [0xe7, 0xd6, 0xac] },
  { max: Infinity, label: "-2800 and above", rgb: [0xf4, 0xe9, 0xd3] },
];

// --- PNG (RGBA) -----------------------------------------------------------------
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
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const lonAt = (z, x, fx) => ((x + fx) / 2 ** z) * 360 - 180;
const latAt = (z, y, fy) => Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + fy)) / 2 ** z))) / D2R;
const yIndexFor = (z, lat) => Math.floor(((1 - Math.asinh(Math.tan(lat * D2R)) / Math.PI) / 2) * 2 ** z);
const xIndexFor = (z, lon) => Math.floor(((lon + 180) / 360) * 2 ** z);

const valid = grid.values.filter((v) => v !== grid.nodata);
const classCells = Object.fromEntries(CLASSES.map((k) => [k.label, 0]));
for (const v of valid) classCells[CLASSES.find((k) => v < k.max).label]++;

let tilesWritten = 0, bytesWritten = 0;
const MIN_Z = 5, MAX_Z = 9;
for (let z = MIN_Z; z <= MAX_Z; z++) {
  for (let x = xIndexFor(z, LON_W); x <= xIndexFor(z, LON_E); x++) {
    for (let y = yIndexFor(z, LAT_N); y <= yIndexFor(z, LAT_S); y++) {
      const rgba = Buffer.alloc(256 * 256 * 4);
      for (let py = 0; py < 256; py++) {
        const r = Math.round((LAT_N - latAt(z, y, (py + 0.5) / 256)) / STEP);
        if (r < 0 || r >= NY) continue;
        for (let px = 0; px < 256; px++) {
          const c = Math.round((lonAt(z, x, (px + 0.5) / 256) - LON_W) / STEP);
          if (c < 0 || c >= NX) continue;
          const v = grid.values[r * NX + c];
          if (v === grid.nodata) continue;
          const k = CLASSES.find((cl) => v < cl.max);
          const o = (py * 256 + px) * 4;
          rgba[o] = k.rgb[0];
          rgba[o + 1] = k.rgb[1];
          rgba[o + 2] = k.rgb[2];
          rgba[o + 3] = 255;
        }
      }
      const png = encodeRgbaPng(256, 256, rgba);
      const path = join(TILE_ROOT, String(z), String(x), `${y}.png`);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, png);
      tilesWritten++;
      bytesWritten += png.length;
    }
  }
}

const report = {
  input: GRID_PATH,
  dem: grid.dem,
  grid_fetched_at: grid.fetched_at,
  elevation_m: { min: Math.min(...valid), max: Math.max(...valid) },
  classes: CLASSES.map((k) => ({
    label: k.label,
    upper_bound_m: Number.isFinite(k.max) ? k.max : null,
    color: "#" + k.rgb.map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase(),
    cells: classCells[k.label],
  })),
  tiles: { root: TILE_ROOT, zoom_range: [MIN_Z, MAX_Z], written: tilesWritten, bytes: bytesWritten },
  generated_at: new Date().toISOString(),
};
writeFileSync(join(HERE, "elevation_report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
