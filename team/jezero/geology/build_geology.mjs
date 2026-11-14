#!/usr/bin/env node
// Jezero geology display-tile derivation (Jezero region owner tool).
//
// Source : USGS SIM 3464, Sun & Stack (2020), "Geologic map of Jezero crater
//          and the Nili Planum region, Mars", 1:75,000, DOI 10.3133/sim3464.
//          Vector "Geologic Units" polygons (1308 features, 15 unit names)
//          fetched from the USGS-published ArcGIS FeatureServer
//          (data release DOI 10.5066/P9CZYIO7) by fetch_source_layers.mjs into
//          ./source/GeologicUnits.json and verified by audit_geology.mjs
//          (all checks pass; see audit_report.json).
// Input  : ./source/GeologicUnits.json (ESRI JSON, MTM_clon77.5E meters on the
//          Mars 2000 Sphere, R = 3,396,190 m) + ./units_summary.json.
// Output : <outRoot>/{z}/{x}/{y}.png
//          Standard 256 px Web-Mercator XYZ RGBA tiles for zooms 5-14 over the
//          map footprint (the published 1 x 1 degree area, 76.8-77.8 E,
//          17.7-18.7 N). Pixels with no unit polygon are transparent, so the
//          underlying basemap/terrain shows through at map edges and slivers.
//
// Display transform (display-grade, documented):
// - Each polygon vertex is projected MTM -> lon/lat with the exact spherical
//   TM inverse (same math as audit_geology.mjs, roundtrip < 1e-9 m) and then
//   to Web-Mercator tile pixel space (Earth-sphere tile math, the same display
//   convention as the CTX basemap and terrain tiles). Latitude fed to Mercator
//   is the product's Mars 2000 Sphere geodetic latitude (== planetocentric on
//   this sphere datum); the region display-transform caveats still apply.
// - Polygons are scanline-rasterized per tile in even-odd mode (rings carry
//   holes). Paint order is by polygon area descending, so small units paint
//   over large ones at sliver overlaps; the audit measured 0.045% overlap and
//   0.035% uncovered slivers - published GIS digitizing artifacts, kept as-is.
// - Unit colors are this region's display choices for legend separation, NOT
//   the printed map sheet's lithology colors.
//
// usage: node build_geology.mjs <outRoot> [report.json]

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const [, , outRoot, reportPath] = process.argv;
if (!outRoot) {
  console.error("usage: node build_geology.mjs <outRoot> [report.json]");
  process.exit(1);
}

const MIN_Z = 5;
const MAX_Z = 14;
const TILE_PX = 256;
const R = 3396190.0; // Mars_2000_(Sphere), from the product .prj / FGDC metadata
const K0 = 1.0; // MTM scale factor
const CM = 77.5; // MTM central meridian (deg east)
const D2R = Math.PI / 180;

// ---------------------------------------------------------------- MTM inverse
// (identical math to audit_geology.mjs; see that file for the derivation and
// the roundtrip verification)
function mtmInverse(x, y) {
  const B = Math.tanh(x / (K0 * R));
  const psi = y / (K0 * R);
  const sinPhi = Math.max(-1, Math.min(1, Math.sin(psi) * Math.sqrt(1 - B * B)));
  const phi = Math.asin(sinPhi);
  const cosPhi = Math.sqrt(Math.max(0, 1 - sinPhi * sinPhi));
  const sinD = Math.max(-1, Math.min(1, B / cosPhi));
  return [CM + Math.asin(sinD) / D2R, phi / D2R];
}

// ------------------------------------------------------------------- palette
// Display colors per unit symbol (not the printed sheet's colors). The data's
// "Crater riim unit" typo polygon shares symbol "cr" with "Crater rim unit"
// and paints identically; the legend uses the sheet spelling.
const UNITS = [
  { symbol: "Nue", name: "Upper etched unit", color: "#D2B48C" },
  { symbol: "Nle", name: "Lower etched unit", color: "#A9713C" },
  { symbol: "Nnp1", name: "Nili Planum 1 unit", color: "#9CB380" },
  { symbol: "Nnp2", name: "Nili Planum 2 unit", color: "#7A8B52" },
  { symbol: "Hnpf", name: "Nili Planum fan unit", color: "#C97B4A" },
  { symbol: "NHjf1", name: "Jezero fan 1 unit", color: "#3D7AB8" },
  { symbol: "NHjf2", name: "Jezero fan 2 unit", color: "#6FA8DC" },
  { symbol: "Njf", name: "Jezero floor unit", color: "#9BD3C8" },
  { symbol: "su", name: "Smooth unit, undivided", color: "#CDD6D0" },
  { symbol: "Nrb", name: "Rugged bright unit", color: "#D8CFC0" },
  { symbol: "Aeb", name: "Eolian bedform unit", color: "#E8D9A0" },
  { symbol: "cr", name: "Crater rim unit", color: "#8A6642" },
  { symbol: "ci", name: "Crater interior unit", color: "#6B4F4F" },
  { symbol: "ce", name: "Crater ejecta unit", color: "#BFBFBF" },
];
const colorBySymbol = new Map(UNITS.map((u) => [u.symbol, u.color]));
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// ------------------------------------------------------------ load + prep
const src = JSON.parse(
  readFileSync(join(here, "source", "GeologicUnits.json"), "utf8"),
);

// Paint order: area descending (large polygons first, small ones paint over
// sliver overlaps deterministically).
const polys = src.features
  .map((f) => {
    const a = f.attributes ?? {};
    const color = colorBySymbol.get(a.symbol) ?? "#FF00FF"; // unknown symbol would stand out
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, vertexCount = 0;
    for (const ring of f.geometry.rings) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        vertexCount++;
      }
    }
    return { rings: f.geometry.rings, color: hexToRgb(color), symbol: a.symbol, name: a.name, minX, maxX, minY, maxY, vertexCount };
  })
  .sort((p, q) => (q.maxX - q.minX) * (q.maxY - q.minY) - (p.maxX - p.minX) * (p.maxY - p.minY));

// Unit footprint in lon/lat (envelope corners, verified by the audit).
const [footW, footS] = mtmInverse(-39529.3559, 1049162.1464);
const [footE, footN] = mtmInverse(16941.1894, 1108513.8212);
const FOOT = {
  west: Math.min(footW, 76.8), east: Math.max(footE, 77.8),
  south: Math.min(footS, 17.7), north: Math.max(footN, 18.7),
};

// ------------------------------------------------------------- PNG encoding
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

// ------------------------------------------------------------ Mercator math
const lonAt = (z, x, fx) => ((x + fx) / 2 ** z) * 360 - 180;
const latAt = (z, y, fy) =>
  Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + fy)) / 2 ** z))) / D2R;
const yIndexFor = (z, lat) =>
  Math.floor(((1 - Math.asinh(Math.tan(lat * D2R)) / Math.PI) / 2) * 2 ** z);
// MTM meters -> [0..1) normalized web-mercator (x, y)
const normX = (lon) => (lon + 180) / 360;
const normY = (lat) => {
  const t = Math.tan(lat * D2R);
  return 0.5 - Math.asinh(Math.max(-1e12, Math.min(1e12, t))) / (2 * Math.PI);
};
// Forward MTM (lon/lat deg -> meters) for the tile-bbox polygon pre-filter.
function mtmForward(lonE, lat) {
  const dlon = (lonE - CM) * D2R;
  const phi = lat * D2R;
  const B = Math.cos(phi) * Math.sin(dlon);
  return [K0 * R * Math.atanh(B), K0 * R * Math.atan(Math.tan(phi) / Math.cos(dlon))];
}

// ------------------------------------------------------------- rasterize one
// polygon into a tile: transform its rings to tile pixels, then even-odd
// scanline fill.
function fillPolygon(buf, poly, x, y, z) {
  const px = new Float64Array(poly.vertexCount);
  const py = new Float64Array(poly.vertexCount);
  let n = 0;
  const scale = 2 ** z;
  const edgeCount = []; // per ring vertex count
  for (const ring of poly.rings) {
    for (const [mx, my] of ring) {
      const [lon, lat] = mtmInverse(mx, my);
      px[n] = (normX(lon) * scale - x) * TILE_PX;
      py[n] = (normY(lat) * scale - y) * TILE_PX;
      n++;
    }
    edgeCount.push(ring.length);
  }
  // even-odd scanline over all rings
  let v = 0;
  let minYv = Infinity, maxYv = -Infinity;
  const ringRanges = [];
  for (const count of edgeCount) {
    let rMin = Infinity, rMax = -Infinity;
    for (let i = v; i < v + count; i++) {
      if (py[i] < rMin) rMin = py[i];
      if (py[i] > rMax) rMax = py[i];
    }
    ringRanges.push([v, v + count]);
    if (rMin < minYv) minYv = rMin;
    if (rMax > maxYv) maxYv = rMax;
    v += count;
  }
  const y0 = Math.max(0, Math.floor(minYv));
  const y1 = Math.min(TILE_PX - 1, Math.ceil(maxYv));
  const xs = [];
  for (let row = y0; row <= y1; row++) {
    const yc = row + 0.5;
    xs.length = 0;
    for (const [start, end] of ringRanges) {
      let prev = end - 1;
      for (let i = start; i < end; i++) {
        const x0 = px[prev], y0v = py[prev];
        const x1 = px[i], y1v = py[i];
        if (y0v > yc !== y1v > yc) {
          xs.push(x0 + ((yc - y0v) / (y1v - y0v)) * (x1 - x0));
        }
        prev = i;
      }
    }
    if (xs.length < 2) continue;
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const sx = Math.max(0, Math.round(xs[k]));
      const ex = Math.min(TILE_PX - 1, Math.round(xs[k + 1]) - 1);
      for (let xi = sx; xi <= ex; xi++) {
        const o = (row * TILE_PX + xi) * 4;
        buf[o] = poly.color[0];
        buf[o + 1] = poly.color[1];
        buf[o + 2] = poly.color[2];
        buf[o + 3] = 255;
      }
    }
  }
}

// ------------------------------------------------------------------ tile loop
const MARGIN_DEG = 0.01;
let tilesWritten = 0, bytesWritten = 0, coveredPx = 0;
const tileLog = [];
for (let z = MIN_Z; z <= MAX_Z; z++) {
  const xMin = Math.floor(((FOOT.west - MARGIN_DEG + 180) / 360) * 2 ** z);
  const xMax = Math.floor(((FOOT.east + MARGIN_DEG + 180) / 360) * 2 ** z);
  const yTop = yIndexFor(z, Math.min(85, FOOT.north + MARGIN_DEG));
  const yBottom = yIndexFor(z, FOOT.south - MARGIN_DEG);
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yTop; y <= yBottom; y++) {
      const lon0 = lonAt(z, x, 0), lon1 = lonAt(z, x + 1, 0);
      const lat1 = latAt(z, y, 0), lat0 = latAt(z, y + 1, 0);
      if (lon1 < FOOT.west || lon0 > FOOT.east) continue;
      if (lat1 < FOOT.south || lat0 > FOOT.north) continue;
      // tile bbox in MTM meters (conservative: 4 corners + small tolerance)
      const TOL = 20;
      let tx0 = Infinity, tx1 = -Infinity, ty0 = Infinity, ty1 = -Infinity;
      for (const [clon, clat] of [[lon0, lat0], [lon0, lat1], [lon1, lat0], [lon1, lat1]]) {
        const [mx, my] = mtmForward(clon, clat);
        if (mx < tx0) tx0 = mx; if (mx > tx1) tx1 = mx;
        if (my < ty0) ty0 = my; if (my > ty1) ty1 = my;
      }
      tx0 -= TOL; tx1 += TOL; ty0 -= TOL; ty1 += TOL;
      const out = Buffer.alloc(TILE_PX * TILE_PX * 4);
      let anyPainted = false;
      for (const poly of polys) {
        if (poly.maxX < tx0 || poly.minX > tx1 || poly.maxY < ty0 || poly.minY > ty1) continue;
        fillPolygon(out, poly, x, y, z);
        anyPainted = true;
      }
      if (!anyPainted) continue;
      // count exact coverage; skip fully transparent tiles
      let cov = 0;
      for (let i = 3; i < out.length; i += 4) if (out[i]) cov++;
      coveredPx += cov;
      if (cov === 0) continue;
      const png = encodeRgbaPng(TILE_PX, TILE_PX, out);
      const path = join(outRoot, String(z), String(x), `${y}.png`);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, png);
      tilesWritten++;
      bytesWritten += png.length;
    }
  }
  tileLog.push({ z, xMin, xMax, yTop, yBottom });
  console.log(`z${z}: done (${tilesWritten} tiles so far)`);
}

const report = {
  source: {
    product: "USGS SIM 3464, Sun & Stack (2020), Geologic map of Jezero crater and the Nili Planum region, Mars, 1:75,000",
    doi: "https://doi.org/10.3133/sim3464",
    data_release_doi: "https://doi.org/10.5066/P9CZYIO7",
    layer: "Geologic Units (1308 polygons, 15 unit names; USGS FeatureServer layer 8)",
    audit: "team/jezero/geology/audit_report.json (all checks pass)",
  },
  output_scheme: "Web-Mercator XYZ, 256 px RGBA PNG (unit-color fill)",
  zoom_range: [MIN_Z, MAX_Z],
  footprint_deg: FOOT,
  paint_order: "polygon area descending (small units over sliver overlaps)",
  unit_colors_note:
    "Unit colors are display choices for legend separation, not the printed map sheet's lithology colors.",
  tiles_written: tilesWritten,
  output_bytes: bytesWritten,
  covered_pixels: coveredPx,
  covered_fraction_note:
    "covered_pixels / (tiles * 256*256) is not meaningful across zooms (same ground counted at every z); per-zoom coverage fractions matter instead.",
  tile_ranges: tileLog,
  units: UNITS,
};
console.log(JSON.stringify({ tiles_written: tilesWritten, bytes: bytesWritten }));
if (reportPath) writeFileSync(reportPath, JSON.stringify(report, null, 2));
