#!/usr/bin/env node
// Jezero terrain display-tile derivation (Jezero region owner tool).
//
// Source : USGS Astrogeology Mars 2020 Terrain Relative Navigation HiRISE DTM
//          mosaic, 1 m/px:
//          JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40
//          DOI 10.5066/P9REJ9JN (public domain USGS release; cite the authors).
//          Equirectangular (latTs0, lon0), planetocentric latitude,
//          east-positive, D_Mars_2000_Sphere r=3,396,190 m, 32-bit float,
//          uncompressed GeoTIFF, ISIS label UpperLeftCornerX/Y = 4577366.0 /
//          1106618.0 m. Elevation values are areoid-relative meters
//          (cross-checked against the PLACES traverse by audit_terrain.mjs).
// Output : <outRoot>/{z}/{x}/{y}.png
//          Standard 256 px Web-Mercator XYZ RGBA tiles for zooms 5-14 spanning
//          the region supported extent (plus margin); pixels outside the DTM
//          footprint are transparent.
//          Shaded hypsometric tint: elevation color ramp x analytic hillshade.
//
// Display transform (display-grade, documented):
// - For every output pixel, its Mars lon/lat is computed from the Web-Mercator
//   tile grid, converted to equirectangular map X/Y with the label's radius,
//   and the DTM is bilinearly sampled (4 cells). Nodata = NaN or the GDAL
//   nodata tag; those pixels are transparent.
// - Latitude sampling uses the DTM's planetocentric latitude directly - the
//   same display convention as the CTX basemap and the recorded-traverse
//   asset. Web Mercator interprets latitude as geodetic; the residual
//   planetocentric/geodetic distinction (~0.1-0.2 deg) stays documented in the
//   region display_transform pending the PPPCS (SIS) ellipsoid review.
// - The hillshade uses 9.545*cos(lat) m/px ground spacing of the output grid
//   (native 1 m data is implicitly smoothed by display downsampling). This is
//   a display product: NOT a route-safety, hazard or engineering product, and
//   not a substitute for the DEM's native 1 m posts.
//
// usage: node build_terrain.mjs <dtm.tif> <outputTileRoot> [report.json]

import { openSync, readSync, closeSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

const [, , tifPath, outRoot, reportPath] = process.argv;
if (!tifPath || !outRoot || !existsSync(tifPath)) {
  console.error("usage: node build_terrain.mjs <dtm.tif> <outputTileRoot> [report.json]");
  process.exit(1);
}

const MIN_Z = 5;
const MAX_Z = 14;
const TILE_PX = 256;
const RADIUS = 3396190.0; // D_Mars_2000_Sphere (ISIS label + FGDC)
const D2R = Math.PI / 180;

// DTM footprint (ISIS label, verified by audit_terrain.mjs).
const DTM = {
  ulx: 4577366.0,
  uly: 1106618.0,
  width: 21400,
  height: 21488,
  lonMin: 77.2229330769714153,
  lonMax: 77.5839640209350847,
  latMin: 18.3067994496865651,
  latMax: 18.6693150068777456,
};
// Region supported extent (from the audited traverse bbox + margin).
const REGION = { west: 77.186786, east: 77.493133, south: 18.401964, north: 18.519663 };
// Coverage = intersection (lon west edge is the DTM's own west edge).
const COVERAGE = {
  west: DTM.lonMin,
  east: Math.min(DTM.lonMax, REGION.east),
  south: Math.max(DTM.latMin, REGION.south),
  north: Math.min(DTM.latMax, REGION.north),
};
const MARGIN_DEG = 0.01; // small margin so tile edges blend, pixels outside DTM stay transparent

// ---------------------------------------------------------------- TIFF parse
const fd = openSync(tifPath, "r");
const hdr = Buffer.alloc(8);
readSync(fd, hdr, 0, 8, 0);
const little = hdr.toString("ascii", 0, 2) === "II";
if (hdr.readUInt16LE(2) !== 42) throw new Error("not a classic TIFF");
const firstIfd = hdr.readUInt32LE(4);

const TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };
function readTag(ifdOff, entryOff) {
  const type = readU16(entryOff + 2);
  const count = readU32(entryOff + 4);
  const size = TYPE_SIZE[type] || 0;
  if (!size) return { type, count, values: null };
  const total = size * count;
  const valueOff = total <= 4 ? entryOff + 8 : readU32(entryOff + 8);
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
  return { type, count, values };
}
function readU16(off) { const b = Buffer.alloc(2); readSync(fd, b, 0, 2, off); return little ? b.readUInt16LE(0) : b.readUInt16BE(0); }
function readU32(off) { const b = Buffer.alloc(4); readSync(fd, b, 0, 4, off); return little ? b.readUInt32LE(0) : b.readUInt32BE(0); }

const numEntries = readU16(firstIfd);
const tags = {};
for (let e = 0; e < numEntries; e++) {
  const entryOff = firstIfd + 2 + e * 12;
  tags[readU16(entryOff)] = readTag(firstIfd, entryOff);
}
const width = tags[256].values[0];
const height = tags[257].values[0];
const compression = tags[259].values[0];
if (width !== DTM.width || height !== DTM.height) throw new Error(`TIFF dims ${width}x${height} != label ${DTM.width}x${DTM.height}`);
if (compression !== 1 && compression !== 8 && compression !== 32946) throw new Error(`unsupported compression ${compression}`);
const stripOffsets = tags[273].values.map(Number);
const rowsPerStrip = Math.round(tags[278].values[0]);
const stripByteCounts = tags[279].values.map(Number);
const pixelScale = tags[33550].values.map(Number);
const tiepoint = tags[33922].values.map(Number);
if (Math.abs(pixelScale[0] - 1) > 1e-9 || Math.abs(pixelScale[1] - 1) > 1e-9) throw new Error(`unexpected pixel scale ${pixelScale}`);
if (Math.abs(tiepoint[3] - DTM.ulx) > 1e-3 || Math.abs(tiepoint[4] - DTM.uly) > 1e-3) throw new Error(`unexpected tiepoint ${tiepoint}`);
const nodataTag = tags[42113] && tags[42113].values ? Buffer.from(tags[42113].values).toString("ascii").replace(/\0.*$/, "") : null;
const nodataValue = nodataTag !== null && nodataTag !== "" ? parseFloat(nodataTag) : null;

// Row cache: tiles read rows mostly in ascending order.
let rowCache = new Map();
function getStrip(row) {
  const stripIndex = Math.floor(row / rowsPerStrip);
  if (rowCache.has(stripIndex)) return rowCache.get(stripIndex);
  const buf = Buffer.alloc(stripByteCounts[stripIndex]);
  readSync(fd, buf, 0, buf.length, stripOffsets[stripIndex]);
  const data = compression === 1 ? buf : inflateSync(buf);
  if (rowCache.size > 96) {
    const first = rowCache.keys().next().value;
    rowCache.delete(first);
  }
  rowCache.set(stripIndex, data);
  return data;
}
const isNoData = (v) => Number.isNaN(v) || (nodataValue !== null && v === nodataValue) || v < -10000 || v > 20000;
// Bilinear sample at fractional (colF, rowF); null when any used cell is nodata.
function sampleElev(colF, rowF) {
  const c0 = Math.floor(colF), r0 = Math.floor(rowF);
  const dx = colF - c0, dy = rowF - r0;
  if (c0 < 0 || c0 + 1 >= width || r0 < 0 || r0 + 1 >= height) return null;
  const s0 = getStrip(r0), s1 = getStrip(Math.min(height - 1, r0 + 1));
  const o0b = ((r0 % rowsPerStrip) * width + c0) * 4;
  const o1b = ((r0 % rowsPerStrip) * width + c0 + 1) * 4;
  const o0n = ((Math.min(height - 1, r0 + 1) % rowsPerStrip) * width + c0) * 4;
  const o1n = ((Math.min(height - 1, r0 + 1) % rowsPerStrip) * width + c0 + 1) * 4;
  const v00 = s0.readFloatLE(o0b), v10 = s0.readFloatLE(o1b);
  const v01 = s1.readFloatLE(o0n), v11 = s1.readFloatLE(o1n);
  if (isNoData(v00) || isNoData(v10) || isNoData(v01) || isNoData(v11)) return null;
  const top = v00 + (v10 - v00) * dx;
  const bot = v01 + (v11 - v01) * dx;
  return top + (bot - top) * dy;
}

// ------------------------------------------------------------ color ramp/RGBA
// Hypsometric ramp over the coverage elevation range (resolved below).
const RAMP = [
  [0.0, [70, 85, 172]],
  [0.25, [82, 136, 182]],
  [0.45, [130, 172, 166]],
  [0.65, [200, 190, 138]],
  [0.85, [230, 212, 168]],
  [1.0, [248, 240, 224]],
];
function rampColor(t) {
  // Gamma 0.75 expands the low end: the floor/delta (where most of the
  // coverage sits) occupies the bottom of the ramp but must stay readable.
  t = Math.max(0, Math.min(1, t)) ** 0.75;
  for (let i = 1; i < RAMP.length; i++) {
    if (t <= RAMP[i][0]) {
      const [t0, c0] = RAMP[i - 1];
      const [t1, c1] = RAMP[i];
      const f = (t - t0) / (t1 - t0);
      return [0, 1, 2].map((k) => Math.round(c0[k] + (c1[k] - c0[k]) * f));
    }
  }
  return RAMP[RAMP.length - 1][1];
}

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
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter 0
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --------------------------------------------------------------- Mercator math
const lonAt = (z, x, fx) => ((x + fx) / 2 ** z) * 360 - 180;
const latAt = (z, y, fy) =>
  Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + fy)) / 2 ** z))) / D2R;
const yIndexFor = (z, lat) =>
  Math.floor(((1 - Math.asinh(Math.tan(lat * D2R)) / Math.PI) / 2) * 2 ** z);
const lonCol = (lon) => lon * RADIUS * D2R - DTM.ulx;
const latRow = (lat) => DTM.uly - lat * RADIUS * D2R;

// ------------------------------------------------- coverage elevation extremes
// Resolve the ramp range from a coarse sample of the coverage so the tint is
// anchored to what is actually displayed: p2-p98 of the coverage sample, so
// the (small) rim and outlier tails do not crush the floor/delta into the
// darkest ramp colors.
let samples = [];
{
  const steps = 200;
  for (let j = 0; j <= steps; j++) {
    const lat = COVERAGE.south + ((COVERAGE.north - COVERAGE.south) * j) / steps;
    for (let i = 0; i <= steps; i++) {
      const lon = COVERAGE.west + ((COVERAGE.east - COVERAGE.west) * i) / steps;
      const v = sampleElev(lonCol(lon), latRow(lat));
      if (v === null) continue;
      samples.push(v);
    }
  }
}
if (!samples.length) throw new Error("coverage ramp range could not be sampled");
samples.sort((a, b) => a - b);
let rampMin = samples[Math.floor(samples.length * 0.02)];
let rampMax = samples[Math.floor(samples.length * 0.98)];
rampMin = Math.floor(rampMin / 10) * 10;
rampMax = Math.ceil(rampMax / 10) * 10;
samples = null;

// ------------------------------------------------------------------ build tiles
// Tile ranges are computed from the REGION extent (not the DTM coverage) so
// every tile the clamped map viewport can request exists; tiles west of the
// DTM footprint are fully transparent. Missing tiles would otherwise 404 when
// panning to the supported extent's west margin at deep zoom.
let tilesWritten = 0, bytesWritten = 0, transparentPx = 0;
const tileLog = [];
for (let z = MIN_Z; z <= MAX_Z; z++) {
  const xMin = Math.floor(((REGION.west - MARGIN_DEG + 180) / 360) * 2 ** z);
  const xMax = Math.floor(((REGION.east + MARGIN_DEG + 180) / 360) * 2 ** z);
  const yTop = yIndexFor(z, Math.min(85, REGION.north + MARGIN_DEG));
  const yBottom = yIndexFor(z, REGION.south - MARGIN_DEG);
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yTop; y <= yBottom; y++) {
      const out = Buffer.alloc(TILE_PX * TILE_PX * 4);
      // Elevation grid with 1px padding for the hillshade gradient.
      const PAD = 1;
      const gW = TILE_PX + 2 * PAD;
      const grid = new Float64Array(gW * gW);
      const valid = new Uint8Array(gW * gW);
      for (let py = -PAD; py < TILE_PX + PAD; py++) {
        const lat = latAt(z, y, (py + 0.5) / TILE_PX);
        const rowF = latRow(lat);
        for (let px = -PAD; px < TILE_PX + PAD; px++) {
          const lon = lonAt(z, x, (px + 0.5) / TILE_PX);
          const v = sampleElev(lonCol(lon), rowF);
          const gi = (py + PAD) * gW + (px + PAD);
          if (v === null) { grid[gi] = NaN; valid[gi] = 0; }
          else { grid[gi] = v; valid[gi] = 1; }
        }
      }
      for (let py = 0; py < TILE_PX; py++) {
        const lat = latAt(z, y, (py + 0.5) / TILE_PX);
        const groundPx = 156543.03392 * Math.cos((lat * D2R)) / 2 ** z; // m/px on the ground
        for (let px = 0; px < TILE_PX; px++) {
          const gi = (py + PAD) * gW + (px + PAD);
          if (!valid[gi]) { transparentPx++; continue; }
          const e = grid[gi];
          // Hillshade (Lambert, sun azimuth 315 NW, altitude 45) on the
          // display grid; edge pixels clamp to their in-tile neighbor.
          const west = valid[gi - 1] ? grid[gi - 1] : e;
          const east = valid[gi + 1] ? grid[gi + 1] : e;
          const north = valid[gi - gW] ? grid[gi - gW] : e;
          const south = valid[gi + gW] ? grid[gi + gW] : e;
          const dzdx = (east - west) / (2 * groundPx);
          const dzdy = (south - north) / (2 * groundPx);
          const slope = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy));
          const aspect = Math.atan2(dzdy, -dzdx);
          const sunAz = 315 * D2R, sunAlt = 45 * D2R;
          const shade =
            Math.cos(sunAlt) * Math.sin(slope) +
            Math.sin(sunAlt) * Math.cos(slope) * Math.cos(sunAz - aspect);
          const hill = Math.max(0, shade);
          const [r, g, b] = rampColor((e - rampMin) / (rampMax - rampMin));
          const o = (py * TILE_PX + px) * 4;
          // Ramp color modulated by hillshade (factor 0.65-1.0) for readable
          // relief without washing out the tint.
          const h = 0.65 + 0.35 * hill;
          out[o] = Math.min(255, r * h);
          out[o + 1] = Math.min(255, g * h);
          out[o + 2] = Math.min(255, b * h);
          out[o + 3] = 255;
        }
      }
      const png = encodeRgbaPng(TILE_PX, TILE_PX, out);
      const path = join(outRoot, String(z), String(x), `${y}.png`);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, png);
      tilesWritten++;
      bytesWritten += png.length;
    }
  }
  tileLog.push({ z, xMin, xMax, yTop, yBottom });
  console.log(`z${z}: done`);
}
closeSync(fd);

const report = {
  source: "USGS Astrogeology Mars 2020 TRN HiRISE DTM mosaic 1 m/px (JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40)",
  doi: "https://doi.org/10.5066/P9REJ9JN",
  credit: "USGS Astrogeology Science Center; NASA/MRO HiRISE",
  output_scheme: "Web-Mercator XYZ, 256 px RGBA PNG (shaded hypsometric elevation)",
  zoom_range: [MIN_Z, MAX_Z],
  coverage_used: COVERAGE,
  coverage_note:
    "DTM footprint intersected with the region supported extent; the DTM's west edge (77.2229 E) truncates the region's west margin (77.1868-77.2229 E has no DTM and is transparent).",
  gdal_nodata_tag: nodataValue,
  ramp_range_m: [rampMin, rampMax],
  tiles_written: tilesWritten,
  output_bytes: bytesWritten,
  transparent_pixels: transparentPx,
  tile_ranges: tileLog,
  sun: { azimuth_deg: 315, altitude_deg: 45 },
};
console.log(JSON.stringify(report, null, 2));
if (reportPath) writeFileSync(reportPath, JSON.stringify(report, null, 2));
