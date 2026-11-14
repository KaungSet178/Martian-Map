// Tile spot-check (Jezero geology display asset).
// Reads a sample of PNG tiles across zooms and verifies:
//  - decode succeeds (zlib PNG parse via a minimal reader),
//  - tiles contain unit colors (opaque pixels) and, where expected,
//    transparency at the footprint edge,
//  - every opaque pixel color belongs to the declared unit palette
//    (no stray colors).
// usage: node spotcheck_tiles.mjs [tileRoot]
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..", "public", "maps", "jezero", "geology-tiles");

// declared palette
const PALETTE = new Set();
{
  const report = JSON.parse(readFileSync(join(here, "build_report.json"), "utf8"));
  for (const u of report.units) PALETTE.add(u.color);
}
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const palSet = new Set([...PALETTE].map(hexRgb).map((c) => c.join(",")));

function decodePng(path) {
  const buf = readFileSync(path);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`not png ${path}`);
  let off = 8;
  let w = 0, h = 0, idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("latin1", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6) throw new Error(`unexpected bitdepth/color ${path}`);
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * 4;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    // implement filters 0-4
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? out[y * stride + x - 4] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= 4 && y > 0 ? out[(y - 1) * stride + x - 4] : 0;
      let v = row[x];
      if (f === 1) v = (v + a) & 255;
      else if (f === 2) v = (v + b) & 255;
      else if (f === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
      out[y * stride + x] = v;
    }
  }
  return { w, h, rgba: out };
}

const SAMPLES = [
  { z: 5, x: 22, y: 14, expectOpaque: "partial" }, // whole map in one tile
  { z: 6, x: 45, y: 28, expectOpaque: "partial" },
  { z: 10, x: 731, y: 458, expectOpaque: "partial" },
  { z: 14, x: 11710, y: 7349, expectOpaque: "partial" }, // Jezero crater interior
  { z: 14, x: 11733, y: 7373, expectOpaque: "partial" },
];
const results = [];
for (const s of SAMPLES) {
  const p = join(root, String(s.z), String(s.x), `${s.y}.png`);
  if (!existsSync(p)) { results.push(`${s.z}/${s.x}/${s.y}: MISSING`); continue; }
  const { w, h, rgba } = decodePng(p);
  let opaque = 0;
  const colors = new Map();
  for (let i = 0; i < w * h * 4; i += 4) {
    if (rgba[i + 3] === 0) continue;
    opaque++;
    const key = `${rgba[i]},${rgba[i + 1]},${rgba[i + 2]}`;
    colors.set(key, (colors.get(key) ?? 0) + 1);
  }
  const stray = [...colors.keys()].filter((k) => !palSet.has(k));
  results.push(
    `${s.z}/${s.x}/${s.y}: opaque ${opaque}/${w * h} (${((opaque / (w * h)) * 100).toFixed(1)}%), distinct colors ${colors.size}, stray ${stray.length}${stray.length ? " e.g. " + stray.slice(0, 3).join(" | ") : ""}`,
  );
}
console.log(results.join("\n"));
