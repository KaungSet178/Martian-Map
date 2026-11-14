#!/usr/bin/env node
// Oxia Planum THEMIS night-IR display tiles (Oxia region owner tool).
//
// Source : NASA JPL Mars Trek layer "MO THEMIS-IR Night, Global Mosaic",
//          THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018. Tiling taken
//          from its WMTSCapabilities.xml (TileMatrixSet default028mm):
//          EPSG::104905 (Mars 2000 sphere, geographic), TopLeftCorner
//          -180/90, 256 px tiles, level L has 2^(L+1) x 2^L tiles, so a tile
//          spans 180/2^L degrees. Levels 0-9 are listed; level 10 returns 404
//          over Oxia, so level 9 (~0.00137 deg = ~81 m per pixel) is the
//          finest. Tiles are 8-bit PNG, colour type 4 (gray + alpha).
// Output : <outRoot>/{z}/{x}/{y}.png, 256 px Web-Mercator XYZ, gray + alpha
//          PNG, zooms 5-10 (z10 display pixels ~82 m match source level 9;
//          closer zooms over-zoom z10). Source alpha 0 and missing source
//          tiles stay transparent.
// Extent : the Oxia team-chosen display box, 17.11-19.15 N, 334.60-336.60 E
//          (same as the CTX basemap).
// Method : nearest-neighbour; for output zoom z the source level is
//          min(z - 1, 9) (equal or finer pixel density). Gray values are
//          copied unchanged: relative brightness, not a temperature.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const [, , outRoot] = process.argv;
if (!outRoot) {
  console.error("usage: node prepare_themis_night.mjs <outputTileRoot>");
  process.exit(1);
}

const LAYER = "THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018";
const SERVICE = `https://trek.nasa.gov/tiles/Mars/EQ/${LAYER}/1.0.0//default/default028mm`;
const MIN_Z = 5;
const MAX_Z = 10;
const MAX_SOURCE_LEVEL = 9;
const SRC_PX = 256;
const TILE_PX = 256;
const D2R = Math.PI / 180;

const EXTENT_EAST_0_360 = { west: 334.6, east: 336.6, south: 17.11, north: 19.15 };
const toDisplayLon = (lon) => (lon > 180 ? lon - 360 : lon);
const EXTENT = {
  west: toDisplayLon(EXTENT_EAST_0_360.west),
  east: toDisplayLon(EXTENT_EAST_0_360.east),
  south: EXTENT_EAST_0_360.south,
  north: EXTENT_EAST_0_360.north,
};

// --- PNG codec --------------------------------------------------------------
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

// Decodes 8-bit non-interlaced PNG, colour type 0 (gray) or 4 (gray+alpha),
// into { w, h, gray, alpha } (alpha is 255 everywhere for type 0).
function decodeGrayAlphaPng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  let off = 8;
  let w = 0, h = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.slice(off + 4, off + 8).toString("latin1");
    const data = buf.slice(off + 8, off + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") idat.push(data);
    off += 12 + len;
    if (type === "IEND") break;
  }
  if (bitDepth !== 8 || interlace !== 0)
    throw new Error(`unsupported PNG (depth ${bitDepth}, interlace ${interlace})`);
  if (colorType !== 0 && colorType !== 4)
    throw new Error(`unsupported color type ${colorType}`);
  const bpp = colorType === 4 ? 2 : 1;
  const stride = w * bpp;
  const inflated = inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(h * stride);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const filter = inflated[pos++];
    const row = inflated.slice(pos, pos + stride);
    pos += stride;
    const prev = y > 0 ? out.slice((y - 1) * stride, y * stride) : null;
    const cur = out.slice(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= bpp ? prev[x - bpp] : 0;
      let v;
      switch (filter) {
        case 0: v = row[x]; break;
        case 1: v = row[x] + a; break;
        case 2: v = row[x] + b; break;
        case 3: v = row[x] + ((a + b) >> 1); break;
        case 4: {
          const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          v = row[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: throw new Error(`bad filter ${filter}`);
      }
      cur[x] = v & 0xff;
    }
  }
  const gray = Buffer.alloc(w * h);
  const alpha = Buffer.alloc(w * h, 255);
  for (let i = 0; i < w * h; i++) {
    gray[i] = out[i * bpp];
    if (bpp === 2) alpha[i] = out[i * 2 + 1];
  }
  return { w, h, gray, alpha };
}

function encodeGrayAlphaPng(w, h, ga) {
  const stride = w * 2;
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    ga.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 4; // gray + alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- Source access ------------------------------------------------------------
const tileCache = new Map();
let sourceMissing = 0;
async function fetchTile(L, row, col) {
  const key = `${L}/${row}/${col}`;
  if (tileCache.has(key)) return tileCache.get(key);
  let decoded = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${SERVICE}/${L}/${row}/${col}.png`, {
        signal: AbortSignal.timeout(60000),
      });
      if (res.status === 404) break;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      decoded = decodeGrayAlphaPng(Buffer.from(await res.arrayBuffer()));
      break;
    } catch (e) {
      console.error(`  ${key} attempt ${attempt}: ${e.message}`);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  if (!decoded) sourceMissing++;
  tileCache.set(key, decoded);
  return decoded;
}
const spanFor = (L) => 180 / 2 ** L; // degrees per source tile

// --- Web Mercator helpers -----------------------------------------------------
const lonAt = (z, x, fx) => ((x + fx) / 2 ** z) * 360 - 180;
const latAt = (z, y, fy) =>
  Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + fy)) / 2 ** z))) / D2R;
const yIndexFor = (z, lat) =>
  Math.floor(((1 - Math.asinh(Math.tan(lat * D2R)) / Math.PI) / 2) * 2 ** z);
const xIndexFor = (z, lon) => Math.floor(((lon + 180) / 360) * 2 ** z);

// --- Build --------------------------------------------------------------------
let tilesWritten = 0, bytesWritten = 0, transparentSamples = 0, totalSamples = 0;
const levelsUsed = new Set();
for (let z = MIN_Z; z <= MAX_Z; z++) {
  const L = Math.min(z - 1, MAX_SOURCE_LEVEL);
  levelsUsed.add(L);
  const span = spanFor(L);
  const xMin = xIndexFor(z, EXTENT.west), xMax = xIndexFor(z, EXTENT.east);
  const yTop = yIndexFor(z, EXTENT.north), yBottom = yIndexFor(z, EXTENT.south);

  // Prefetch every source tile the output tiles touch.
  const lonMin = lonAt(z, xMin, 0), lonMax = lonAt(z, xMax + 1, 0);
  const latMax = latAt(z, yTop, 0), latMin = latAt(z, yBottom + 1, 0);
  for (let col = Math.floor((lonMin + 180) / span); col <= Math.floor((lonMax + 180) / span); col++)
    for (let row = Math.floor((90 - latMax) / span); row <= Math.floor((90 - latMin) / span); row++)
      await fetchTile(L, row, col);

  for (let x = xMin; x <= xMax; x++) {
    for (let y = yTop; y <= yBottom; y++) {
      const ga = Buffer.alloc(TILE_PX * TILE_PX * 2); // transparent by default
      for (let py = 0; py < TILE_PX; py++) {
        const lat = latAt(z, y, (py + 0.5) / TILE_PX);
        for (let px = 0; px < TILE_PX; px++) {
          const lon = lonAt(z, x, (px + 0.5) / TILE_PX);
          totalSamples++;
          const ex = (lon + 180) / span, ey = (90 - lat) / span;
          const col = Math.floor(ex), row = Math.floor(ey);
          const t = tileCache.get(`${L}/${row}/${col}`);
          if (!t) { transparentSamples++; continue; }
          const sx = Math.min(SRC_PX - 1, Math.floor((ex - col) * SRC_PX));
          const sy = Math.min(SRC_PX - 1, Math.floor((ey - row) * SRC_PX));
          const a = t.alpha[sy * t.w + sx];
          if (a === 0) { transparentSamples++; continue; }
          const o = (py * TILE_PX + px) * 2;
          ga[o] = t.gray[sy * t.w + sx];
          ga[o + 1] = a;
        }
      }
      const png = encodeGrayAlphaPng(TILE_PX, TILE_PX, ga);
      const path = join(outRoot, String(z), String(x), `${y}.png`);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, png);
      tilesWritten++;
      bytesWritten += png.length;
    }
  }
  console.log(`z${z}: x ${xMin}-${xMax}, y ${yTop}-${yBottom} (source level L${L})`);
}

const report = {
  source_layer: LAYER,
  source: SERVICE,
  credit: "NASA Mars Odyssey THEMIS; via NASA JPL Mars Trek",
  output_scheme: "Web-Mercator XYZ, 256 px gray+alpha PNG",
  zoom_range: [MIN_Z, MAX_Z],
  source_levels_used: [...levelsUsed].sort((a, b) => a - b),
  output_tiles_written: tilesWritten,
  output_bytes: bytesWritten,
  source_tiles_fetched_ok: [...tileCache.values()].filter(Boolean).length,
  source_tiles_missing: sourceMissing,
  output_samples: totalSamples,
  transparent_samples: transparentSamples,
  reprojection: "nearest-neighbour from the equirectangular source grid; gray values unchanged",
  extent_east_0_360: EXTENT_EAST_0_360,
  extent_display_lon: EXTENT,
  generated_at: new Date().toISOString(),
};
writeFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "build_report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
