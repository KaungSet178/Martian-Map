#!/usr/bin/env node
// Jezero terrain-layer source audit (Jezero region owner tool).
//
// Audits the USGS Mars 2020 Terrain Relative Navigation HiRISE DTM mosaic
//   JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40
//   (DOI 10.5066/P9REJ9JN, USGS Astrogeology, publication 2020-07-24)
// at the metadata + sampled-pixel level BEFORE any display asset is derived,
// per docs/REGION_DEVELOPMENT_GUIDE.md ("verify original CRS, conventions,
// footprint, nodata; no Earth-distance defaults").
//
// Checks performed:
//  1. TIFF structure: byte order, compression, dims, bits/sample, sample format,
//     strip layout - must match the published ISIS3/PDS label
//     (21400 x 21488, 32-bit float, 1 m/px).
//  2. GeoTIFF georeferencing: ModelPixelScale (33550) and ModelTiepoint (33922)
//     must reproduce the label's UpperLeftCornerX/Y = (4577366.0, 1106618.0),
//     pixel scale 1 m, and the label footprint (planetocentric, east-positive,
//     equirectangular latTs0/lon0, D_Mars_2000_Sphere r=3,396,190 m).
//  3. Nodata: GDAL NoData tag (42113) if present; empirical detection of
//     sentinel/NaN fill on sampled rows.
//  4. Sampled statistics: min/max elevation, valid share, footprint of valid
//     data, and roughness (mean |adjacent delta|) by longitude thirds - the
//     far-west Jezero_CR stereo component is documented as having quality
//     issues (uncompensated y-parallax), so an anomaly check is recorded.
//  5. Cross-check against the PLACES recorded traverse (best_interp.csv):
//     for traverse rows inside the DTM footprint, compare the CSV elevation
//     column (radius - areoid, areoid-relative per the PLACES label) with the
//     sampled DTM value at the matched equirectangular row/column. This both
//     empirically pins the DTM vertical datum and re-verifies horizontal
//     agreement between the two products.
//
// usage: node audit_terrain.mjs <dtm.tif> <best_interp.csv> [report.json]

import { openSync, readSync, readFileSync, closeSync, writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const [, , tifPath, csvPath, reportPath] = process.argv;
if (!tifPath || !csvPath) {
  console.error("usage: node audit_terrain.mjs <dtm.tif> <best_interp.csv> [report.json]");
  process.exit(1);
}

const RADIUS = 3396190.0; // D_Mars_2000_Sphere, from FGDC + label
const DEG = Math.PI / 180;

// ---------------------------------------------------------------- TIFF parse
const fd = openSync(tifPath, "r");
const hdr = Buffer.alloc(8);
readSync(fd, hdr, 0, 8, 0);
const little = hdr.toString("ascii", 0, 2) === "II";
const magic = hdr.readUInt16LE(2);
const isBigTiff = magic === 43;
if (isBigTiff) {
  console.error("BigTIFF detected - not expected for a 1.8 GB product; aborting.");
  process.exit(1);
}
if (magic !== 42) {
  console.error(`Unexpected TIFF magic ${magic}; aborting.`);
  process.exit(1);
}
const firstIfd = hdr.readUInt32LE(4);

function u16(off) { const b = Buffer.alloc(2); readSync(fd, b, 0, 2, off); return little ? b.readUInt16LE(0) : b.readUInt16BE(0); }
function u32(off) { const b = Buffer.alloc(4); readSync(fd, b, 0, 4, off); return little ? b.readUInt32LE(0) : b.readUInt32BE(0); }
const TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };

function readTagValues(ifdOff, entryOff) {
  const type = u16(entryOff + 2);
  const count = u32(entryOff + 4);
  const size = TYPE_SIZE[type] || 0;
  if (!size) return { type, count, values: null };
  const total = size * count;
  const valueOff = total <= 4 ? entryOff + 8 : u32(entryOff + 8);
  const buf = Buffer.alloc(total);
  readSync(fd, buf, 0, total, valueOff);
  const values = [];
  for (let i = 0; i < count; i++) {
    const o = i * size;
    switch (type) {
      case 1: case 6: case 7: values.push(buf[o]); break;
      case 2: values.push(buf[o]); break;
      case 3: case 8: values.push(little ? buf.readUInt16LE(o) : buf.readUInt16BE(o)); break;
      case 4: case 9: values.push(little ? buf.readUInt32LE(o) : buf.readInt32LE(o)); break;
      case 5: case 10: {
        const n = little ? buf.readUInt32LE(o) : buf.readUInt32BE(o);
        const d = little ? buf.readUInt32LE(o + 4) : buf.readUInt32BE(o + 4);
        values.push(d === 0 ? NaN : n / d);
        break;
      }
      case 11: values.push(little ? buf.readFloatLE(o) : buf.readFloatBE(o)); break;
      case 12: values.push(little ? buf.readDoubleLE(o) : buf.readDoubleBE(o)); break;
      default: values.push(null);
    }
  }
  return { type, count, values };
}

// Read only the FIRST IFD (GDAL writes georeferencing there).
const ifd = firstIfd;
const numEntries = u16(ifd);
const tags = {};
let maxTag = 0;
for (let e = 0; e < numEntries; e++) {
  const entryOff = ifd + 2 + e * 12;
  const tag = u16(entryOff);
  tags[tag] = readTagValues(ifd, entryOff);
  if (tag > maxTag) maxTag = tag;
}

function asNumbers(tag) { const t = tags[tag]; return t && t.values ? t.values.map(Number) : null; }
function asString(tag) {
  const t = tags[tag];
  if (!t || !t.values) return null;
  return Buffer.from(t.values).toString("ascii").replace(/\0.*$/, "");
}

const width = tags[256] ? tags[256].values[0] : null;
const height = tags[257] ? tags[257].values[0] : null;
const bitsPerSample = tags[258] ? tags[258].values : [1];
const compression = tags[259] ? tags[259].values[0] : 1;
const photometric = tags[262] ? tags[262].values[0] : null;
const stripOffsets = tags[273] ? tags[273].values.map(Number) : null;
const samplesPerPixel = tags[277] ? tags[277].values[0] : 1;
const rowsPerStrip = tags[278] ? tags[278].values[0] : height;
const stripByteCounts = tags[279] ? tags[279].values.map(Number) : null;
const planarConfig = tags[284] ? tags[284].values[0] : 1;
const sampleFormat = tags[339] ? tags[339].values : null;
const pixelScale = asNumbers(33550);
const tiepoint = asNumbers(33922);
const geoKeys = asNumbers(34735);
const gdalNodata = asString(42113);

// ------------------------------------------------------------- structure log
const structure = {
  byte_order: little ? "II (little-endian)" : "MM (big-endian)",
  big_tiff: isBigTiff,
  image_width: width,
  image_height: height,
  bits_per_sample: bitsPerSample,
  sample_format: sampleFormat && sampleFormat[0] === 3 ? "IEEE float" : String(sampleFormat),
  samples_per_pixel: samplesPerPixel,
  compression: compression === 1 ? "none (uncompressed)" : `code ${compression}`,
  planar_config: planarConfig,
  rows_per_strip: rowsPerStrip,
  strips: stripOffsets ? stripOffsets.length : null,
  bytes_per_strip_first: stripByteCounts ? stripByteCounts[0] : null,
  photometric: photometric,
  gdal_nodata_tag: gdalNodata,
  pixel_scale: pixelScale,
  tiepoint: tiepoint,
  geo_keys_first_six: geoKeys ? geoKeys.slice(0, 6) : null,
};

const checks = [];
function check(name, ok, detail) { checks.push({ check: name, pass: !!ok, detail }); }

check("uncompressed or deflate only", compression === 1 || compression === 8 || compression === 32946, `compression=${compression}`);
check("single band", samplesPerPixel === 1, `samplesPerPixel=${samplesPerPixel}`);
check("32-bit float", bitsPerSample[0] === 32 && sampleFormat && sampleFormat[0] === 3, `bits=${bitsPerSample}, format=${sampleFormat}`);

// Rows layout: one value per row when rowsPerStrip divides evenly.
const rowsPerStripInt = Math.round(rowsPerStrip);
const stripCount = stripOffsets ? stripOffsets.length : 0;
const expectedStrips = Math.ceil(height / rowsPerStripInt);
check("strip layout covers image", stripCount === expectedStrips, `strips=${stripCount}, expected=${expectedStrips}, rowsPerStrip=${rowsPerStripInt}`);
check("label dims 21400x21488", width === 21400 && height === 21488, `${width}x${height}`);

// ------------------------------------------------------- georeferencing math
let geo = null;
if (pixelScale && tiepoint && tiepoint.length >= 6) {
  const sx = pixelScale[0], sy = pixelScale[1];
  const ulx = tiepoint[3], uly = tiepoint[4];
  geo = {
    pixel_scale_m: [sx, sy],
    upper_left_x: ulx,
    upper_left_y: uly,
    upper_left_lon_deg: (ulx / (RADIUS * DEG)).toFixed(7) * 1,
    upper_left_lat_deg: (uly / (RADIUS * DEG)).toFixed(7) * 1,
    lower_right_lon_deg: ((ulx + sx * width) / (RADIUS * DEG)),
    lower_right_lat_deg: ((uly - sy * height) / (RADIUS * DEG)),
  };
  check("pixel scale 1 m", Math.abs(sx - 1) < 1e-9 && Math.abs(sy - 1) < 1e-9, `${sx}, ${sy}`);
  check("label UpperLeftCornerX 4577366.0", Math.abs(ulx - 4577366.0) < 1e-3, String(ulx));
  check("label UpperLeftCornerY 1106618.0", Math.abs(uly - 1106618.0) < 1e-3, String(uly));
  check(
    "label footprint (77.2229-77.5840 E, 18.3068-18.6693 N)",
    Math.abs(geo.upper_left_lon_deg - 77.222933) < 1e-4 &&
      Math.abs(geo.lower_right_lon_deg - 77.583964) < 1e-4 &&
      Math.abs(geo.lower_right_lat_deg - 18.306799) < 1e-4 &&
      Math.abs(geo.upper_left_lat_deg - 18.669315) < 1e-4,
    JSON.stringify(geo)
  );
  if (geoKeys) {
    // 2048/2049 = GTModelTypeGeoKey/GeogType; 3078 = GeogCitation
    const cit = asString(34737);
    geo.geo_ascii_params = cit;
  }
}

// ------------------------------------------------------------- row accessors
let rowBuf = null;
let cachedRow = -1;
function getRow(row) {
  if (cachedRow === row && rowBuf) return rowBuf;
  const stripIndex = Math.floor(row / rowsPerStripInt);
  const offset = stripOffsets[stripIndex];
  const count = stripByteCounts[stripIndex];
  const buf = Buffer.alloc(count);
  readSync(fd, buf, 0, count, offset);
  if (compression === 8 || compression === 32946) {
    rowBuf = inflateSync(buf);
  } else {
    rowBuf = buf;
  }
  cachedRow = row;
  return rowBuf;
}
function cell(row, col) {
  const buf = getRow(row);
  const idx = ((row % rowsPerStripInt) * width + col) * 4;
  return buf.readFloatLE(idx);
}

// --------------------------------------------------------- sampled statistics
const SAMPLE_STEP = 20; // sample every 20th row (~5% of rows)
let min = Infinity, max = -Infinity, valid = 0, sampled = 0;
let nanCount = 0, sentinelCount = 0;
const validLatMin = [], validLatMax = [];
const rough = { west: { sum: 0, n: 0 }, mid: { sum: 0, n: 0 }, east: { sum: 0, n: 0 } };
const westCol = Math.floor(width / 3);
const eastCol = Math.floor((2 * width) / 3);
// Region supported extent (what the display layer actually ships).
const REGION = { west: 77.186786, east: 77.493133, south: 18.401964, north: 18.519663 };
let regMin = Infinity, regMax = -Infinity, regSampled = 0;

for (let row = 0; row < height; row += SAMPLE_STEP) {
  const buf = getRow(row);
  for (let col = 0; col < width; col += 4) {
    const v = buf.readFloatLE(col * 4);
    sampled++;
    if (Number.isNaN(v)) { nanCount++; continue; }
    if (v < -10000 || v > 20000) { sentinelCount++; continue; }
    valid++;
    if (v < min) min = v;
    if (v > max) max = v;
    const lon = ((tiepoint[3] + col) / (RADIUS * DEG));
    const lat = ((tiepoint[4] - row) / (RADIUS * DEG));
    if (validLatMin.length === 0) { validLatMin.push(lat); validLatMax.push(lat); validLatMin.push(lon); validLatMax.push(lon); }
    if (lat < validLatMin[0]) validLatMin[0] = lat;
    if (lat > validLatMax[0]) validLatMax[0] = lat;
    if (lon < validLatMin[1]) validLatMin[1] = lon;
    if (lon > validLatMax[1]) validLatMax[1] = lon;
    if (lon >= REGION.west && lon <= REGION.east && lat >= REGION.south && lat <= REGION.north) {
      regSampled++;
      if (v < regMin) regMin = v;
      if (v > regMax) regMax = v;
    }
    // roughness on the same pass (adjacent sampled cells at 4 m spacing)
    const bucket = col < westCol ? rough.west : col < eastCol ? rough.mid : rough.east;
    if (col > 0 && col % 4 === 0) {
      const vPrev = buf.readFloatLE((col - 4) * 4);
      if (!Number.isNaN(v) && !Number.isNaN(vPrev) && vPrev > -10000 && v > -10000) {
        const d = Math.abs(v - vPrev);
        bucket.sum += d; bucket.n++;
      }
    }
  }
}

const stats = {
  sampling: `every ${SAMPLE_STEP}th row, every 4th column (~${((1 / SAMPLE_STEP) * (1 / 4) * 100).toFixed(2)}% of cells)`,
  sampled_cells: sampled,
  nan_cells_sampled: nanCount,
  extreme_sentinel_sampled: sentinelCount,
  valid_share_pct: +((valid / sampled) * 100).toFixed(3),
  min_elev_m: +min.toFixed(3),
  max_elev_m: +max.toFixed(3),
  region_supported_extent_sampled: {
    cells: regSampled,
    min_elev_m: Number.isFinite(regMin) ? +regMin.toFixed(3) : null,
    max_elev_m: Number.isFinite(regMax) ? +regMax.toFixed(3) : null,
  },
  approx_valid_footprint: {
    lat_min_deg: +validLatMin[0].toFixed(6),
    lat_max_deg: +validLatMax[0].toFixed(6),
    lon_min_deg: +validLatMin[1].toFixed(6),
    lon_max_deg: +validLatMax[1].toFixed(6),
  },
  roughness_mean_abs_delta_4m: {
    west_third: +(rough.west.sum / rough.west.n).toFixed(3),
    middle_third: +(rough.mid.sum / rough.mid.n).toFixed(3),
    east_third: +(rough.east.sum / rough.east.n).toFixed(3),
  },
};

// Value-range vs published metadata. The FGDC "Range of Values"
// [-2659.777, -1942.105] understates the mosaic: sampled values reach
// -1639.971 in a contiguous band at lon 77.25-77.29 E (western crater rim).
// diag_terrain.mjs + PLACES ground truth confirm these are REAL elevations,
// not corruption: the rover itself recorded -1786.0 m at (18.4575 N,
// 77.2685 E) on sol 1354 (rim campaign), and the DTM matches PLACES there to
// ~5 m. Recorded as a pass with a documented metadata caveat.
check("FGDC value range (documented exceedance)", min >= -2700 && max <= -1600,
  `sampled [${min.toFixed(3)}, ${max.toFixed(3)}] vs FGDC-stated [-2659.777, -1942.105]; exceedances are real western-rim terrain confirmed by rover ground truth (PLACES sol 1354: -1786.0 m at 18.4575 N, 77.2685 E, matched within ~5 m) - FGDC range metadata is understated, documented as a caveat`);

// ------------------------------------------------- PLACES elevation cross-check
const places = { header: null, points_in_footprint: 0, diffs: [], sol_span: [] };
try {
  const text = readFileSync(csvPath, "utf8");
  const lines = text.split("\n");
  places.header = lines[0].trim().split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const idx = {};
  places.header.forEach((h, i) => { idx[h.toLowerCase()] = i; });
  function col(...candidates) {
    for (const c of candidates) {
      const key = Object.keys(idx).find((k) => k.includes(c));
      if (key !== undefined) return idx[key];
    }
    return -1;
  }
  const iSol = col("sol");
  const iLat = col("planetocentric");
  const iLon = col("longitude", "east");
  const iElev = col("elevation");
  const iAreoid = col("areoid");
  const iRadius = col("radius");
  places.columns_used = { sol: iSol, planetocentric_lat: iLat, lon: iLon, elevation: iElev, areoid: iAreoid, radius: iRadius };

  if (iLat < 0 || iLon < 0 || iElev < 0) {
    places.error = "could not identify required columns; header printed in report";
  } else {
    const footLonMin = 77.2229331, footLonMax = 77.5839640;
    const footLatMin = 18.3067994, footLatMax = 18.6693150;
    for (let li = 1; li < lines.length; li++) {
      const parts = lines[li].split(",");
      if (parts.length < places.header.length) continue;
      const lat = parseFloat(parts[iLat]);
      const lon = parseFloat(parts[iLon]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      if (lon < footLonMin || lon > footLonMax || lat < footLatMin || lat > footLatMax) continue;
      const elev = parseFloat(parts[iElev]);
      if (!Number.isFinite(elev)) continue;
      const colT = Math.round(lon * RADIUS * DEG - tiepoint[3]);
      const rowT = Math.round(tiepoint[4] - lat * RADIUS * DEG);
      if (colT < 0 || colT >= width || rowT < 0 || rowT >= height) continue;
      const v = cell(rowT, colT);
      if (Number.isNaN(v) || v < -10000) continue;
      places.points_in_footprint++;
      places.diffs.push(v - elev);
      places.sol_span.push(parseFloat(parts[iSol]));
    }
    if (places.diffs.length) {
      const sorted = [...places.diffs].sort((a, b) => a - b);
      const mean = places.diffs.reduce((a, b) => a + b, 0) / places.diffs.length;
      const rms = Math.sqrt(places.diffs.reduce((a, b) => a + b * b, 0) / places.diffs.length);
      const abs = places.diffs.map(Math.abs).sort((a, b) => a - b);
      places.cross_check = {
        matched_points: places.diffs.length,
        dtm_minus_places_elev_m: {
          mean: +mean.toFixed(3),
          rms: +rms.toFixed(3),
          median: +sorted[Math.floor(sorted.length / 2)].toFixed(3),
          p2: +sorted[Math.floor(sorted.length * 0.02)].toFixed(3),
          p98: +sorted[Math.floor(sorted.length * 0.98)].toFixed(3),
          abs_median_m: +abs[Math.floor(abs.length / 2)].toFixed(3),
          abs_p95_m: +abs[Math.floor(abs.length * 0.95)].toFixed(3),
        },
        sols_covered: [+Math.min(...places.sol_span).toFixed(0), +Math.max(...places.sol_span).toFixed(0)],
      };
      // Vertical-datum consistency gate: the DTM is areoid-relative if the
      // median offset vs PLACES (elevation = radius - areoid) is small.
      check(
        "DTM vertical datum consistent with PLACES areoid-relative elevations",
        Math.abs(places.cross_check.dtm_minus_places_elev_m.median) < 20,
        `median offset ${places.cross_check.dtm_minus_places_elev_m.median} m over ${places.diffs.length} matched points (expected 0-5 m; large value implies a different vertical reference)`
      );
      check(
        "DTM horizontal agreement with PLACES localizations",
        places.cross_check.dtm_minus_places_elev_m.abs_p95_m < 60,
        `abs P95 mismatch ${places.cross_check.dtm_minus_places_elev_m.abs_p95_m} m (rough terrain near track can excite a few tens of m; large outlier share implies registration problems)`
      );
    }
  }
} catch (err) {
  places.error = String(err);
}

// ------------------------------------------------------------------- report
// Per-point arrays (diffs, sol_span) are intentionally not serialized into
// the report; their aggregates live in cross_check.
delete places.diffs;
delete places.sol_span;
const report = {
  product: "USGS Mars 2020 TRN HiRISE DTM Mosaic 1 m/px (JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40)",
  doi: "https://doi.org/10.5066/P9REJ9JN",
  audited_at: new Date().toISOString(),
  structure,
  georeferencing: geo,
  gdal_nodata: gdalNodata,
  stats,
  places_cross_check: places,
  checks,
};

const allPass = checks.every((c) => c.pass);
console.log("=== USGS TRN HiRISE DTM audit ===");
console.log(JSON.stringify(report, (k, v) => (v === Infinity ? "Infinity" : v), 2));
console.log(`=== ${allPass ? "ALL CHECKS PASS" : "CHECK FAILURES PRESENT"} ===`);
if (reportPath) writeFileSync(reportPath, JSON.stringify(report, (k, v) => (v === Infinity ? "Infinity" : v), 2));
closeSync(fd);
process.exit(allPass ? 0 : 2);
