#!/usr/bin/env node
// Jezero terrain diagnostic (Jezero region owner tool).
//
// Follow-up to audit_terrain.mjs: localizes the three failed checks to areas.
//  A. PLACES cross-check diffs binned by longitude and by sol - do the big
//     mismatches concentrate in the far-west Jezero_CR stereo component
//     (center 18.509 N, 77.281 E, uncompensated y-parallax)?
//  B. Landing-site sample (18.444627 N, 77.450886 E; PLACES reports ~-2570 m).
//  C. Where do cells above the FGDC max (-1942.105 m) come from?
//  D. Where do the sentinel/nodata cells cluster?
//
// usage: node diag_terrain.mjs <dtm.tif> <best_interp.csv> [diag_report.json]

import { openSync, readSync, readFileSync, closeSync, writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const [, , tifPath, csvPath, reportPath] = process.argv;
if (!tifPath || !csvPath) {
  console.error("usage: node diag_terrain.mjs <dtm.tif> <best_interp.csv> [diag_report.json]");
  process.exit(1);
}

const RADIUS = 3396190.0;
const DEG = Math.PI / 180;

// ------------------------------------------------------------- TIFF accessors
const fd = openSync(tifPath, "r");
const hdr = Buffer.alloc(8);
readSync(fd, hdr, 0, 8, 0);
const little = hdr.toString("ascii", 0, 2) === "II";
const firstIfd = hdr.readUInt32LE(4);
const TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };
function readTagValues(entryOff) {
  const type = u16(entryOff + 2);
  const count = u32(entryOff + 4);
  const size = TYPE_SIZE[type] || 0;
  if (!size) return null;
  const total = size * count;
  const valueOff = total <= 4 ? entryOff + 8 : u32(entryOff + 8);
  const buf = Buffer.alloc(total);
  readSync(fd, buf, 0, total, valueOff);
  const values = [];
  for (let i = 0; i < count; i++) {
    const o = i * size;
    switch (type) {
      case 3: values.push(little ? buf.readUInt16LE(o) : buf.readUInt16BE(o)); break;
      case 4: values.push(little ? buf.readUInt32LE(o) : buf.readUInt32BE(o)); break;
      case 11: values.push(little ? buf.readFloatLE(o) : buf.readFloatBE(o)); break;
      case 12: values.push(little ? buf.readDoubleLE(o) : buf.readDoubleBE(o)); break;
      default: values.push(buf[o]);
    }
  }
  return values;
}
function u16(off) { const b = Buffer.alloc(2); readSync(fd, b, 0, 2, off); return little ? b.readUInt16LE(0) : b.readUInt16BE(0); }
function u32(off) { const b = Buffer.alloc(4); readSync(fd, b, 0, 4, off); return little ? b.readUInt32LE(0) : b.readUInt32BE(0); }

const numEntries = u16(firstIfd);
const tags = {};
for (let e = 0; e < numEntries; e++) {
  const entryOff = firstIfd + 2 + e * 12;
  tags[u16(entryOff)] = readTagValues(entryOff);
}
const width = tags[256][0];
const height = tags[257][0];
const compression = tags[259][0];
const stripOffsets = tags[273].map(Number);
const rowsPerStrip = Math.round(tags[278][0]);
const stripByteCounts = tags[279].map(Number);
const tiepoint = tags[33922].map(Number);
const ULX = tiepoint[3], ULY = tiepoint[4];

let rowBuf = null, cachedRow = -1;
function getRow(row) {
  if (cachedRow === row && rowBuf) return rowBuf;
  const stripIndex = Math.floor(row / rowsPerStrip);
  const buf = Buffer.alloc(stripByteCounts[stripIndex]);
  readSync(fd, buf, 0, buf.length, stripOffsets[stripIndex]);
  rowBuf = compression === 1 ? buf : inflateSync(buf);
  cachedRow = row;
  return rowBuf;
}
function cell(row, col) {
  return getRow(row).readFloatLE(((row % rowsPerStrip) * width + col) * 4);
}
const isNodata = (v) => Number.isNaN(v) || v < -10000 || v > 20000;

// ------------------------------------------------------- A+B: PLACES cross-check
const text = readFileSync(csvPath, "utf8");
const lines = text.split("\n");
const header = lines[0].trim().split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
const idx = {};
header.forEach((h, i) => { idx[h.toLowerCase()] = i; });
const colOf = (...cands) => {
  for (const c of cands) {
    const k = Object.keys(idx).find((k) => k.includes(c));
    if (k !== undefined) return idx[k];
  }
  return -1;
};
const iSol = colOf("sol");
const iLat = colOf("planetocentric");
const iLon = colOf("longitude", "east");
const iElev = colOf("elevation");

// CR-pair window: image center 18.509 N 77.281 E; HiRISE swath ~5-6 km wide.
const CR_LON_MIN = 77.22, CR_LON_MAX = 77.35;

const matches = []; // {lon, lat, sol, diff}
for (let li = 1; li < lines.length; li++) {
  const parts = lines[li].split(",");
  if (parts.length < header.length) continue;
  const lat = parseFloat(parts[iLat]);
  const lon = parseFloat(parts[iLon]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
  if (lon < 77.2229331 || lon > 77.5839640 || lat < 18.3067994 || lat > 18.6693150) continue;
  const elev = parseFloat(parts[iElev]);
  if (!Number.isFinite(elev)) continue;
  const colT = Math.round(lon * RADIUS * DEG - ULX);
  const rowT = Math.round(ULY - lat * RADIUS * DEG);
  if (colT < 0 || colT >= width || rowT < 0 || rowT >= height) continue;
  const v = cell(rowT, colT);
  if (isNodata(v)) continue;
  matches.push({ lon, lat, sol: parseFloat(parts[iSol]), diff: v - elev });
}

function summarize(ds) {
  if (!ds.length) return null;
  const s = [...ds].sort((a, b) => a - b);
  const abs = ds.map(Math.abs).sort((a, b) => a - b);
  const mean = ds.reduce((a, b) => a + b, 0) / ds.length;
  const rms = Math.sqrt(ds.reduce((a, b) => a + b * b, 0) / ds.length);
  return {
    n: ds.length,
    mean: +mean.toFixed(3),
    rms: +rms.toFixed(3),
    median: +s[Math.floor(s.length / 2)].toFixed(3),
    p2: +s[Math.floor(s.length * 0.02)].toFixed(3),
    p98: +s[Math.floor(s.length * 0.98)].toFixed(3),
    abs_p95: +abs[Math.floor(abs.length * 0.95)].toFixed(3),
    out_gt60m_share: +(ds.filter((d) => Math.abs(d) > 60).length / ds.length).toFixed(4),
    out_gt300m_share: +(ds.filter((d) => Math.abs(d) > 300).length / ds.length).toFixed(4),
  };
}

// Bin by longitude (0.02 deg ~ 1.2 km) and by sol (500-sol bins).
const lonBins = new Map();
const solBins = new Map();
for (const m of matches) {
  const lonKey = (Math.floor(m.lon / 0.02) * 0.02).toFixed(2);
  const solKey = m.sol < 0 ? "pre-landing" : String(Math.floor(m.sol / 500) * 500);
  (lonBins.get(lonKey) ?? lonBins.set(lonKey, []).get(lonKey)).push(m.diff);
  (solBins.get(solKey) ?? solBins.set(solKey, []).get(solKey)).push(m.diff);
}
const lonBinReport = [...lonBins.entries()]
  .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
  .map(([k, ds]) => ({ lon_bin_deg: k, ...summarize(ds) }));
const solBinReport = [...solBins.entries()]
  .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
  .map(([k, ds]) => ({ sol_bin: k, ...summarize(ds) }));

// Inside vs outside the CR window.
const inCR = matches.filter((m) => m.lon >= CR_LON_MIN && m.lon < CR_LON_MAX).map((m) => m.diff);
const outCR = matches.filter((m) => !(m.lon >= CR_LON_MIN && m.lon < CR_LON_MAX)).map((m) => m.diff);

// Per-point save for the strongest outliers (for visual spot-checks later).
const outliers = matches
  .filter((m) => Math.abs(m.diff) > 300)
  .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
  .slice(0, 40)
  .map((m) => ({ lon: +m.lon.toFixed(6), lat: +m.lat.toFixed(6), sol: +m.sol.toFixed(0), diff_m: +m.diff.toFixed(1) }));

// ------------------------------------------------------- B: landing-site sample
const landing = { lat: 18.444627, lon: 77.450886 };
const lc = Math.round(landing.lon * RADIUS * DEG - ULX);
const lr = Math.round(ULY - landing.lat * RADIUS * DEG);
let landingSample = null;
if (lc >= 0 && lc < width && lr >= 0 && lr < height) {
  const v = cell(lr, lc);
  landingSample = isNodata(v) ? "nodata" : +v.toFixed(3);
}

// ------------------------------------------------ C+D: grid anomaly localization
// Coarse scan: every 40th row, every 8th col. Classify cells and record
// lon/lat extents + histograms of where anomalies occur.
const FGDC_MAX = -1942.105, FGDC_MIN = -2659.777;
const step = 8, rowStep = 40;
const anomHigh = []; // v > FGDC max
const sentinelLon = new Float64Array(37).fill(0); // lon bin count for sentinels
const sentinelTotal = { count: 0, lon_min: Infinity, lon_max: -Infinity, lat_min: Infinity, lat_max: -Infinity };
let gridValid = 0, gridHigh = 0, gridLow = 0, gridSentinel = 0;
const highLons = [];
for (let row = 0; row < height; row += rowStep) {
  const buf = getRow(row);
  const lat = (ULY - row) / (RADIUS * DEG);
  for (let colI = 0; colI < width; colI += step) {
    const v = buf.readFloatLE(colI * 4);
    const lon = (ULX + colI) / (RADIUS * DEG);
    if (Number.isNaN(v) || v < -10000 || v > 20000) {
      gridSentinel++;
      sentinelTotal.count++;
      if (lon < sentinelTotal.lon_min) sentinelTotal.lon_min = lon;
      if (lon > sentinelTotal.lon_max) sentinelTotal.lon_max = lon;
      if (lat < sentinelTotal.lat_min) sentinelTotal.lat_min = lat;
      if (lat > sentinelTotal.lat_max) sentinelTotal.lat_max = lat;
      const b = Math.min(36, Math.max(0, Math.floor((lon - 77.2) / 0.01)));
      if (lon >= 77.2 && lon < 77.57) sentinelLon[b]++;
      continue;
    }
    gridValid++;
    if (v > FGDC_MAX) { gridHigh++; highLons.push(lon); anomHigh.push({ lon: +lon.toFixed(6), lat: +lat.toFixed(6), v: +v.toFixed(3) }); }
    else if (v < FGDC_MIN) gridLow++;
  }
}
const highLonSorted = [...highLons].sort((a, b) => a - b);
const highExtent = highLons.length
  ? { n: highLons.length, lon_min: +highLonSorted[0].toFixed(6), lon_p5: +highLonSorted[Math.floor(highLons.length * 0.05)].toFixed(6), lon_median: +highLonSorted[Math.floor(highLons.length / 2)].toFixed(6), lon_p95: +highLonSorted[Math.floor(highLons.length * 0.95)].toFixed(6), lon_max: +highLonSorted[highLons.length - 1].toFixed(6) }
  : null;
// Sentinel share by CR-window vs outside (of scanned grid cells with known lon).
const crSentinels = sentinelLon.slice(0, Math.floor((CR_LON_MAX - 77.2) / 0.01)).reduce((a, b) => a + b, 0);
const totalBinnedSentinels = sentinelLon.reduce((a, b) => a + b, 0);

closeSync(fd);

const report = {
  product: "JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40",
  cr_window_lon_deg: [CR_LON_MIN, CR_LON_MAX],
  places_matches_total: matches.length,
  overall: summarize(matches.map((m) => m.diff)),
  inside_cr_window: summarize(inCR),
  outside_cr_window: summarize(outCR),
  lon_bins_0p02deg: lonBinReport,
  sol_bins_500: solBinReport,
  strongest_outliers: outliers,
  landing_site_sample: {
    ...landing,
    dtm_value_m: landingSample,
    places_expect_m: -2570,
  },
  grid_anomaly_scan: {
    sampling: `every ${rowStep}th row, every ${step}th column`,
    valid_cells: gridValid,
    cells_above_fgdc_max: gridHigh,
    cells_below_fgdc_min: gridLow,
    sentinel_cells: gridSentinel,
    above_fgdc_max_extent: highExtent,
    above_fgdc_max_examples: anomHigh.slice(0, 15),
    sentinel_extent: {
      count: sentinelTotal.count,
      lon_min: +sentinelTotal.lon_min.toFixed(6),
      lon_max: +sentinelTotal.lon_max.toFixed(6),
      lat_min: +sentinelTotal.lat_min.toFixed(6),
      lat_max: +sentinelTotal.lat_max.toFixed(6),
    },
    sentinel_share_in_cr_window: totalBinnedSentinels ? +(crSentinels / totalBinnedSentinels).toFixed(4) : null,
  },
};
console.log(JSON.stringify(report, null, 1));
if (reportPath) writeFileSync(reportPath, JSON.stringify(report, null, 1));
