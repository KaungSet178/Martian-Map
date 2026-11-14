#!/usr/bin/env node
// Jezero CTX basemap tile derivation (Jezero region owner tool).
//
// Source : Mars MRO CTX uncontrolled mosaic "beta01", Caltech Murray Lab,
//          served by Esri as a tiled MapServer:
//          https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer
//          (PNG, 512 px tiles, equirectangular planetary tiling scheme:
//           origin -180/90, level L resolution 0.3515625/2^L deg/px,
//           tile span 180/2^L deg, levels 0-17).
//          All imagery is publicly released via the NASA Planetary Data
//          System; the Murray Lab grants free use of beta01 for all
//          purposes with credit "NASA/JPL/MSSS/The Murray Lab".
// Output : <outRoot>/{z}/{x}/{y}.png
//          Standard 256 px Web-Mercator XYZ tiles (what the shared
//          renderer's raster-tiles path consumes) for zooms 5-14 over the
//          region supported extent (plus margin).
//
// Reprojection (display-grade, documented):
// - For every output pixel, its Mars lon/lat is computed from the Web
//   Mercator tile grid, then sampled nearest-neighbour from the source
//   equirectangular mosaic at level L = z-2 (chosen so the source is >= 1x
//   the output pixel density; L13 is ~2.4 m/px vs CTX native ~5 m/px).
// - The source mosaic GCS is Mars_2000_Sphere (sphere datum: geodetic ==
//   planetocentric latitude), so sampling uses planetocentric latitude -
//   the same convention as the recorded-traverse asset. This also means the
//   basemap and the traverse overlay share one latitude convention.
// - Resampling is nearest-neighbour; no radiometric processing, sharpening
//   or contrast adjustment is applied. This is a display basemap, not a
//   geologic or terrain-safety product.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

const [, , outRoot] = process.argv;
if (!outRoot) {
  console.error("usage: node prepare_ctx_basemap.mjs <outputTileRoot>");
  process.exit(1);
}

const SERVICE =
  "https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile";
const MIN_Z = 5;
const MAX_Z = 14;
// Supported extent (planetocentric, from the audited traverse bbox + margin).
const EXTENT = {
  west: 77.186786,
  east: 77.493133,
  south: 18.401964,
  north: 18.519663,
};
// Generate tiles intersecting the extent inflated by this margin (deg).
const MARGIN = 0.05;
const TILE_PX = 256;
const D2R = Math.PI / 180;

// --- PNG codec (8-bit grayscale, no interlace) -----------------------------
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
function decodeGrayPng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  let off = 8;
  let w = 0,
    h = 0,
    bitDepth = 0,
    colorType = 0,
    interlace = 0;
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
  if (colorType !== 0) throw new Error(`unsupported color type ${colorType}`);
  const inflated = inflateSync(Buffer.concat(idat));
  const stride = w;
  const out = Buffer.alloc(h * stride);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const filter = inflated[pos++];
    const row = inflated.slice(pos, pos + stride);
    pos += stride;
    const prev = y > 0 ? out.slice((y - 1) * stride, y * stride) : null;
    const cur = out.slice(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= 1 ? cur[x - 1] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= 1 ? prev[x - 1] : 0;
      let v;
      switch (filter) {
        case 0: v = row[x]; break;
        case 1: v = row[x] + a; break;
        case 2: v = row[x] + b; break;
        case 3: v = row[x] + ((a + b) >> 1); break;
        case 4: {
          const p = a + b - c,
            pa = Math.abs(p - a),
            pb = Math.abs(p - b),
            pc = Math.abs(p - c);
          v = row[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: throw new Error(`bad filter ${filter}`);
      }
      cur[x] = v & 0xff;
    }
  }
  return { w, h, gray: out };
}
function encodeGrayPng(w, h, gray) {
  const raw = Buffer.alloc(h * (w + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w + 1)] = 0; // filter 0
    gray.copy(raw, y * (w + 1) + 1, y * w, (y + 1) * w);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // grayscale
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- Source mosaic access --------------------------------------------------
const tileCache = new Map(); // "L/tx/ty" -> {w,h,gray} | null (missing/undecodable)
async function fetchBuffer(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
}
async function loadEquirectTile(L, tx, ty) {
  const key = `${L}/${tx}/${ty}`;
  if (tileCache.has(key)) return tileCache.get(key);
  let decoded = null;
  // Retry the fetch when decoding fails: the server occasionally truncates
  // tile bodies, which shows up as inflate errors rather than fetch errors.
  for (let attempt = 1; attempt <= 3 && !decoded; attempt++) {
    const buf = await fetchBuffer(`${SERVICE}/${L}/${ty}/${tx}`);
    if (buf && buf.length > 0) {
      try {
        decoded = decodeGrayPng(buf);
      } catch (e) {
        console.error(
          `  decode failed for ${key} (attempt ${attempt}): ${e.message}`,
        );
      }
    }
  }
  tileCache.set(key, decoded);
  return decoded;
}
const resFor = (L) => 0.3515625 / 2 ** L;

// --- Mercator helpers ------------------------------------------------------
const lonAt = (z, x, fx) => ((x + fx) / 2 ** z) * 360 - 180;
const latAt = (z, y, fy) =>
  Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + fy)) / 2 ** z))) / D2R;
const yIndexFor = (z, lat) =>
  Math.floor(((1 - Math.asinh(Math.tan(lat * D2R)) / Math.PI) / 2) * 2 ** z);

// --- Build ------------------------------------------------------------------
let tilesWritten = 0,
  bytesWritten = 0,
  samplesWithoutSource = 0;
const levelsUsed = new Set();
for (let z = MIN_Z; z <= MAX_Z; z++) {
  const L = Math.max(0, z - 2);
  levelsUsed.add(L);
  const xMin = Math.floor((((EXTENT.west - MARGIN) + 180) / 360) * 2 ** z);
  const xMax = Math.floor((((EXTENT.east + MARGIN) + 180) / 360) * 2 ** z);
  const yTop = yIndexFor(z, EXTENT.north + MARGIN);
  const yBottom = yIndexFor(z, EXTENT.south - MARGIN);

  // Pre-fetch every source tile this zoom level can touch, covering the
  // FULL lat/lon span of the output tiles (their bounds extend past the
  // extent), so sampling is synchronous and never misses an edge tile.
  const fetchRange = async (level) => {
    const res = resFor(level);
    const lonMin = lonAt(z, xMin, 0);
    const lonMax = lonAt(z, xMax + 1, 0);
    const latMax = latAt(z, yTop, 0);
    const latMin = latAt(z, yBottom + 1, 0);
    const exMin = (lonMin + 180) / res;
    const exMax = (lonMax + 180) / res;
    const eyMin = (90 - latMax) / res;
    const eyMax = (90 - latMin) / res;
    for (let tx = Math.floor(exMin / 512); tx <= Math.floor(exMax / 512); tx++)
      for (let ty = Math.floor(eyMin / 512); ty <= Math.floor(eyMax / 512); ty++)
        await loadEquirectTile(level, tx, ty);
  };
  await fetchRange(L);
  // Also pre-fetch one level coarser as a fallback for missing tiles.
  if (L > 0) await fetchRange(L - 1);

  const sampleSync = (lat, lon) => {
    for (let level = L; level >= 0; level--) {
      const res = resFor(level);
      const ex = (lon + 180) / res;
      const ey = (90 - lat) / res;
      const tx = Math.floor(ex / 512);
      const ty = Math.floor(ey / 512);
      const t = tileCache.get(`${level}/${tx}/${ty}`);
      if (t) {
        const px = Math.min(511, Math.floor(ex - tx * 512));
        const py = Math.min(511, Math.floor(ey - ty * 512));
        return t.gray[py * t.w + px];
      }
      if (level === 0) break;
    }
    return null;
  };

  for (let x = xMin; x <= xMax; x++) {
    for (let y = yTop; y <= yBottom; y++) {
      const out = Buffer.alloc(TILE_PX * TILE_PX);
      for (let py = 0; py < TILE_PX; py++) {
        const lat = latAt(z, y, (py + 0.5) / TILE_PX);
        for (let px = 0; px < TILE_PX; px++) {
          const lon = lonAt(z, x, (px + 0.5) / TILE_PX);
          const v = sampleSync(lat, lon);
          if (v === null) {
            samplesWithoutSource++;
            out[py * TILE_PX + px] = 0;
          } else {
            out[py * TILE_PX + px] = v;
          }
        }
      }
      const png = encodeGrayPng(TILE_PX, TILE_PX, out);
      const path = join(outRoot, String(z), String(x), `${y}.png`);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, png);
      tilesWritten++;
      bytesWritten += png.length;
    }
  }
  console.log(
    `z${z}: x ${xMin}-${xMax}, y ${yTop}-${yBottom} done (source level L${L})`,
  );
}

const audit = {
  source: SERVICE,
  source_product: "Murray Lab CTX global mosaic beta01 (uncontrolled)",
  credit: "NASA/JPL/MSSS/Caltech Murray Lab; tiled service hosted by Esri",
  output_scheme: "Web-Mercator XYZ, 256 px grayscale PNG",
  zoom_range: [MIN_Z, MAX_Z],
  source_levels_used: [...levelsUsed].sort((a, b) => a - b),
  output_tiles_written: tilesWritten,
  output_bytes: bytesWritten,
  source_tiles_fetched_ok: [...tileCache.values()].filter(Boolean).length,
  source_tiles_missing:
    [...tileCache.values()].filter((v) => v === null).length,
  samples_without_source: samplesWithoutSource,
  reprojection: "nearest-neighbour from the equirectangular source grid",
  extent_used: EXTENT,
  margin_deg: MARGIN,
};
console.log(JSON.stringify(audit, null, 2));
