#!/usr/bin/env node
// Focused scan: localize cells above the FGDC max (-1942.105 m) inside the
// region supported extent (77.1868-77.4931 E, 18.4020-18.5197 N).
// usage: node scan_region_high.mjs <dtm.tif>

import { openSync, readSync, closeSync, writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const [, , tifPath] = process.argv;
const RADIUS = 3396190.0, DEG = Math.PI / 180;
const fd = openSync(tifPath, "r");
const hdr = Buffer.alloc(8);
readSync(fd, hdr, 0, 8, 0);
const little = hdr.toString("ascii", 0, 2) === "II";
const firstIfd = hdr.readUInt32LE(4);
const TYPE_SIZE = { 1: 1, 3: 2, 4: 4, 11: 4, 12: 8 };
function u16(off) { const b = Buffer.alloc(2); readSync(fd, b, 0, 2, off); return little ? b.readUInt16LE(0) : b.readUInt16BE(0); }
function u32(off) { const b = Buffer.alloc(4); readSync(fd, b, 0, 4, off); return little ? b.readUInt32LE(0) : b.readUInt32BE(0); }
function tagVals(entryOff) {
  const type = u16(entryOff + 2), count = u32(entryOff + 4);
  const size = TYPE_SIZE[type] || 0;
  if (!size) return null;
  const total = size * count;
  const valueOff = total <= 4 ? entryOff + 8 : u32(entryOff + 8);
  const buf = Buffer.alloc(total);
  readSync(fd, buf, 0, total, valueOff);
  const out = [];
  for (let i = 0; i < count; i++) {
    const o = i * size;
    out.push(type === 3 ? buf.readUInt16LE(o) : type === 4 ? buf.readUInt32LE(o) : type === 11 ? buf.readFloatLE(o) : type === 12 ? buf.readDoubleLE(o) : buf[o]);
  }
  return out;
}
const numEntries = u16(firstIfd);
const tags = {};
for (let e = 0; e < numEntries; e++) {
  const entryOff = firstIfd + 2 + e * 12;
  tags[u16(entryOff)] = tagVals(entryOff);
}
const width = tags[256][0], height = tags[257][0];
const compression = tags[259][0];
const stripOffsets = tags[273].map(Number);
const rowsPerStrip = Math.round(tags[278][0]);
const stripByteCounts = tags[279].map(Number);
const tiepoint = tags[33922].map(Number);
const ULX = tiepoint[3], ULY = tiepoint[4];

let rowBuf = null, cachedRow = -1;
function getRow(row) {
  if (cachedRow === row) return rowBuf;
  const s = Math.floor(row / rowsPerStrip);
  const buf = Buffer.alloc(stripByteCounts[s]);
  readSync(fd, buf, 0, buf.length, stripOffsets[s]);
  rowBuf = compression === 1 ? buf : inflateSync(buf);
  cachedRow = row;
  return rowBuf;
}

const REG = { west: 77.186786, east: 77.493133, south: 18.401964, north: 18.519663 };
const FGDC_MAX = -1942.105;
// Latitudinal histogram of high cells (0.01 deg bins) + extremes.
const latHist = new Map();
const lonHist = new Map();
const grid2d = new Map(); // "latXlon" 0.02-deg cell -> count
let nHigh = 0, nValid = 0, vMin = Infinity, vMax = -Infinity;
const examples = [];
for (let row = 0; row < height; row += 20) {
  const lat = (ULY - row) / (RADIUS * DEG);
  if (lat < REG.south || lat > REG.north) continue;
  const buf = getRow(row);
  for (let col = 0; col < width; col += 4) {
    const lon = (ULX + col) / (RADIUS * DEG);
    if (lon < REG.west || lon > REG.east) continue;
    const v = buf.readFloatLE(col * 4);
    if (Number.isNaN(v) || v < -10000 || v > 20000) continue;
    nValid++;
    if (v > FGDC_MAX) {
      nHigh++;
      if (v < vMin) vMin = v;
      if (v > vMax) vMax = v;
      const k = (Math.floor(lat / 0.01) * 0.01).toFixed(2);
      latHist.set(k, (latHist.get(k) || 0) + 1);
      const kLon = (Math.floor(lon / 0.01) * 0.01).toFixed(2);
      lonHist.set(kLon, (lonHist.get(kLon) || 0) + 1);
      const gk = (Math.floor(lat / 0.02) * 0.02).toFixed(2) + "|" + (Math.floor(lon / 0.02) * 0.02).toFixed(2);
      grid2d.set(gk, (grid2d.get(gk) || 0) + 1);
      if (examples.length < 400) examples.push({ lon: +lon.toFixed(6), lat: +lat.toFixed(6), v: +v.toFixed(3) });
    }
  }
}
closeSync(fd);
const hist = [...latHist.entries()].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])).map(([k, n]) => ({ lat_bin: k, count: n }));
const lonHistArr = [...lonHist.entries()].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])).map(([k, n]) => ({ lon_bin: k, count: n }));
// ASCII map: rows = lat desc, cols = lon asc; cell shows relative density.
const lats = [...new Set([...grid2d.keys()].map((k) => k.split("|")[0]))].sort((a, b) => parseFloat(b) - parseFloat(a));
const lons = [...new Set([...grid2d.keys()].map((k) => k.split("|")[1]))].sort((a, b) => parseFloat(a) - parseFloat(b));
const maxCount = Math.max(...grid2d.values());
const chars = " .:-=+*#%@";
let ascii = "      " + lons.join("") + "\n";
for (const la of lats) {
  ascii += la + " ";
  for (const lo of lons) {
    const n = grid2d.get(la + "|" + lo) || 0;
    ascii += (n === 0 ? " ." : chars[Math.min(9, 1 + Math.floor((n / maxCount) * 8))]) + " ";
  }
  ascii += "\n";
}
const report = {
  sampling: "every 20th row, every 4th col within region supported extent",
  valid_cells: nValid,
  high_cells: nHigh,
  high_share_pct: +((nHigh / nValid) * 100).toFixed(3),
  high_value_range: [+vMin.toFixed(3), +vMax.toFixed(3)],
  high_cells_by_lat_bin_0p01deg: hist,
  high_cells_by_lon_bin_0p01deg: lonHistArr,
  ascii_map_lat_x_lon_0p02deg: ascii,
  examples_first_400: examples,
};
writeFileSync("team/jezero/terrain/region_high_scan.json", JSON.stringify(report, null, 1));
console.log(ascii);
console.log(JSON.stringify({ valid: nValid, high: nHigh, share: report.high_share_pct, range: report.high_value_range, lonBins: lonHistArr }, null, 1));
