#!/usr/bin/env node
// Jezero Mars Trek WMTS basemap tile derivation (Jezero region owner tool).
//
// Source : NASA Mars Trek WMTS layer services (Solar System Treks, JPL/NASA):
//          https://trek.nasa.gov/tiles/Mars/EQ/<productLabel>/1.0.0/default/default028mm/<L>/<row>/<col>.png
//          RESTful WMTS, 256 px PNG tiles, equirectangular planetary grid
//          (origin -180/90, level L resolution 0.703125/2^L deg/px, tile span
//          180/2^L deg, level 0 = 2 columns x 1 row). Products are
//          Mars_2000_Sphere (sphere datum: geodetic == planetocentric).
//          Warm months of 2026 check: `Access-Control-Allow-Origin: *`.
// Output : <outRoot>/{z}/{x}/{y}.png
//          Standard 256 px Web-Mercator XYZ RGBA tiles (what the shared
//          renderer's raster-tiles path consumes) for the requested zoom
//          range over the region supported extent (plus margin).
//
// Products (presets below):
//   ctx     - JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0
//             Mars 2020 TRN Lander Vision System CTX mosaic, ~6 m/px,
//             controlled (orthorectified on CTX DTMs), levels 0-13.
//             The same SOC_008 family as the audited TRN DTM in this repo.
//   thermal - THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018
//             THEMIS daytime infrared controlled mosaic, ~100 m/px,
//             levels 0-9. Displayed as relative IR brightness only - the
//             mosaic ships no verified radiometric scaling, so no
//             temperature values are asserted anywhere in this project.
//
// Reprojection (display-grade, documented):
// - For every output pixel, its Mars lon/lat is computed from the Web
//   Mercator tile grid, then sampled nearest-neighbour from the source
//   equirectangular mosaic at level L = z-1. That level is an exact 1:1
//   match of the source pixel grid to the output tile grid
//   (0.703125/2^(z-1) == 1.40625/2^z deg/px), so no source detail is
//   invented or discarded. Output zooms above the product's native
//   resolution still upsample the source (documented per layer).
// - The source mosaics use a sphere datum (Mars_2000_Sphere), so sampling
//   uses planetocentric latitude - the same convention as the recorded
//   traverse asset and the terrain tiles. Web Mercator interprets display
//   latitude as geodetic; the residual distinction stays documented in the
//   region display_transform pending the PPPCS (SIS) ellipsoid review.
// - Source alpha is preserved (mosaic gaps stay transparent). Resampling is
//   nearest-neighbour; no radiometric processing, sharpening or contrast
//   adjustment is applied. These are display basemaps/overlays, not
//   geologic, thermal-property or terrain-safety products.
//
// usage: node prepare_trek_basemap.mjs <ctx|thermal> <outputTileRoot> [report.json]

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

const PRESETS = {
  ctx: {
    label: "JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0",
    title: "Mars 2020 TRN LVS controlled CTX mosaic (SOC_008), ~6 m/px",
    credit:
      "NASA/JPL-Caltech/MSSS · USGS Astrogeology · Mars 2020 TRN CTX LVS mosaic · NASA Mars Trek",
    minZoom: 5,
    maxZoom: 13, // levels 0-13; 1:1 sampling at z<=14
    sourceMaxLevel: 13,
    nativeResolutionM: 6,
    landingPage: "https://trek.nasa.gov/mars/",
  },
  thermal: {
    label: "THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018",
    title:
      "THEMIS daytime infrared controlled mosaic (v2, Oct 2018), ~100 m/px",
    credit:
      "NASA/JPL/ASU · THEMIS daytime IR controlled mosaic v2 · NASA Mars Trek",
    minZoom: 5,
    maxZoom: 9, // levels 0-9; above z9 the renderer upsamples the source
    sourceMaxLevel: 9,
    nativeResolutionM: 100,
    landingPage: "https://trek.nasa.gov/mars/",
  },
};

const [, , presetName, outRoot, reportPath] = process.argv;
const preset = PRESETS[presetName];
if (!preset || !outRoot) {
  console.error(
    "usage: node prepare_trek_basemap.mjs <" +
      Object.keys(PRESETS).join("|") +
      "> <outputTileRoot> [report.json]",
  );
  process.exit(1);
}

const MIN_Z = preset.minZoom;
const MAX_Z = preset.maxZoom;
const SERVICE = `https://trek.nasa.gov/tiles/Mars/EQ/${preset.label}/1.0.0/default/default028mm`;
const SOURCE_TILE_PX = 256;
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
// Decode 8-bit non-interlaced PNG (gray, RGB, gray+alpha or RGBA) to RGBA.
// Mars Trek serves color type 4 (gray+alpha) for both products; the other
// 8-bit types are accepted so the tool survives a product re-encode.
function decodePng(buf) {
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
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`unsupported color type ${colorType}`);
  const inflated = inflateSync(Buffer.concat(idat));
  const stride = w * channels;
  const raw = Buffer.alloc(h * stride);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const filter = inflated[pos++];
    const row = inflated.slice(pos, pos + stride);
    pos += stride;
    const prev = y > 0 ? raw.slice((y - 1) * stride, y * stride) : null;
    const cur = raw.slice(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= channels ? prev[x - channels] : 0;
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
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0, o = 0; i < w * h; i++, o += 4) {
    const s = i * channels;
    switch (colorType) {
      case 0:
        rgba[o] = rgba[o + 1] = rgba[o + 2] = raw[s];
        rgba[o + 3] = 255;
        break;
      case 2:
        rgba[o] = raw[s];
        rgba[o + 1] = raw[s + 1];
        rgba[o + 2] = raw[s + 2];
        rgba[o + 3] = 255;
        break;
      case 4:
        rgba[o] = rgba[o + 1] = rgba[o + 2] = raw[s];
        rgba[o + 3] = raw[s + 1];
        break;
      case 6:
        rgba[o] = raw[s];
        rgba[o + 1] = raw[s + 1];
        rgba[o + 2] = raw[s + 2];
        rgba[o + 3] = raw[s + 3];
        break;
    }
  }
  return { w, h, rgba };
}
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

// --- Source mosaic access ---------------------------------------------------
const tileCache = new Map(); // "L/tx/ty" -> {w,h,rgba} | null (missing/undecodable)
// The public service occasionally drops TLS connections under load; retry
// with backoff and let a persistent failure surface as a missing tile (the
// sampler then falls back to a coarser level, and the report counts it).
async function fetchBuffer(url) {
  const ATTEMPTS = 5;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (attempt === ATTEMPTS) {
        console.error(`  fetch failed for ${url}: ${e.message}`);
        return null;
      }
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
    }
  }
}
async function loadSourceTile(L, tx, ty) {
  const key = `${L}/${tx}/${ty}`;
  if (tileCache.has(key)) return tileCache.get(key);
  let decoded = null;
  // Retry when decoding fails: the service occasionally truncates tile
  // bodies, which shows up as inflate errors rather than fetch errors.
  for (let attempt = 1; attempt <= 3 && !decoded; attempt++) {
    const buf = await fetchBuffer(`${SERVICE}/${L}/${ty}/${tx}.png`);
    if (buf && buf.length > 0) {
      try {
        decoded = decodePng(buf);
      } catch (e) {
        console.error(`  decode failed for ${key} (attempt ${attempt}): ${e.message}`);
      }
    }
  }
  tileCache.set(key, decoded);
  return decoded;
}
const resFor = (L) => 0.703125 / 2 ** L;
// 256 px source tiles at level L: 1:1 with the output grid at z = L + 1.
const sourceLevelFor = (z) => Math.max(0, Math.min(z - 1, preset.sourceMaxLevel));

// --- Mercator helpers -------------------------------------------------------
const lonAt = (z, x, fx) => ((x + fx) / 2 ** z) * 360 - 180;
const latAt = (z, y, fy) =>
  Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + fy)) / 2 ** z))) / D2R;
const yIndexFor = (z, lat) =>
  Math.floor(((1 - Math.asinh(Math.tan(lat * D2R)) / Math.PI) / 2) * 2 ** z);

// --- Build ------------------------------------------------------------------
let tilesWritten = 0,
  bytesWritten = 0,
  samplesWithoutSource = 0,
  transparentPixels = 0;
const levelsUsed = new Set();
const perZoom = [];

for (let z = MIN_Z; z <= MAX_Z; z++) {
  const L = sourceLevelFor(z);
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
    for (
      let tx = Math.floor(exMin / SOURCE_TILE_PX);
      tx <= Math.floor(exMax / SOURCE_TILE_PX);
      tx++
    )
      for (
        let ty = Math.floor(eyMin / SOURCE_TILE_PX);
        ty <= Math.floor(eyMax / SOURCE_TILE_PX);
        ty++
      )
        await loadSourceTile(level, tx, ty);
  };
  await fetchRange(L);
  // Also pre-fetch one level coarser as a fallback for missing tiles.
  if (L > 0) await fetchRange(L - 1);

  const sampleSync = (lat, lon) => {
    for (let level = L; level >= 0; level--) {
      const res = resFor(level);
      const ex = (lon + 180) / res;
      const ey = (90 - lat) / res;
      const tx = Math.floor(ex / SOURCE_TILE_PX);
      const ty = Math.floor(ey / SOURCE_TILE_PX);
      const t = tileCache.get(`${level}/${tx}/${ty}`);
      if (t) {
        const px = Math.min(SOURCE_TILE_PX - 1, Math.floor(ex - tx * SOURCE_TILE_PX));
        const py = Math.min(SOURCE_TILE_PX - 1, Math.floor(ey - ty * SOURCE_TILE_PX));
        const o = (py * t.w + px) * 4;
        // Source alpha is the mosaic's own coverage mask; keep it.
        if (t.rgba[o + 3] < 8) return null;
        return t.rgba.slice(o, o + 4);
      }
      if (level === 0) break;
    }
    return null;
  };

  let transparentThisZoom = 0;
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yTop; y <= yBottom; y++) {
      const out = Buffer.alloc(TILE_PX * TILE_PX * 4);
      for (let py = 0; py < TILE_PX; py++) {
        const lat = latAt(z, y, (py + 0.5) / TILE_PX);
        for (let px = 0; px < TILE_PX; px++) {
          const lon = lonAt(z, x, (px + 0.5) / TILE_PX);
          const v = sampleSync(lat, lon);
          const o = (py * TILE_PX + px) * 4;
          if (v === null) {
            samplesWithoutSource++;
            transparentThisZoom++;
            continue; // zeroed RGBA -> transparent
          }
          out[o] = v[0];
          out[o + 1] = v[1];
          out[o + 2] = v[2];
          out[o + 3] = v[3];
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
  transparentPixels += transparentThisZoom;
  const range = { z, sourceLevel: L, xMin, xMax, yTop, yBottom };
  perZoom.push(range);
  console.log(
    `z${z}: x ${xMin}-${xMax}, y ${yTop}-${yBottom} done (source level L${L})`,
  );
}

const report = {
  source: SERVICE,
  source_product: preset.label,
  source_title: preset.title,
  credit: preset.credit,
  landing_page: preset.landingPage,
  native_resolution_m: preset.nativeResolutionM,
  output_scheme: "Web-Mercator XYZ, 256 px RGBA PNG",
  zoom_range: [MIN_Z, MAX_Z],
  source_levels_used: [...levelsUsed].sort((a, b) => a - b),
  sampling: "nearest-neighbour at source level L = z-1 (1:1 source/output grid)",
  source_tile_px: SOURCE_TILE_PX,
  output_tiles_written: tilesWritten,
  output_bytes: bytesWritten,
  source_tiles_fetched_ok: [...tileCache.values()].filter(Boolean).length,
  source_tiles_missing: [...tileCache.values()].filter((v) => v === null).length,
  samples_without_source: samplesWithoutSource,
  transparent_pixels: transparentPixels,
  tile_ranges: perZoom,
  extent_used: EXTENT,
  margin_deg: MARGIN,
};
console.log(JSON.stringify(report, null, 2));
if (reportPath) writeFileSync(reportPath, JSON.stringify(report, null, 2));
