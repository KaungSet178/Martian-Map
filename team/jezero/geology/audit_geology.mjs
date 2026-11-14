#!/usr/bin/env node
// Jezero geology source audit (Jezero region owner tool).
//
// Source : USGS Scientific Investigations Map 3464, Sun & Stack (2020),
//          "Geologic map of Jezero crater and the Nili Planum region, Mars",
//          1:75,000, DOI 10.3133/sim3464.
//          Vector layers fetched from the USGS-published ArcGIS FeatureServer
//          (data release DOI 10.5066/P9CZYIO7) into ./source/*.json by
//          fetch_source_layers.mjs. The official GIS database
//          (sim3464_database.zip, Nili.gdb) is downloaded and kept locally.
// Projection of the vector layers (per .prj + FGDC metadata):
//          MTM_clon77.5E - Transverse Mercator, central meridian 77.5 E,
//          scale factor 1.0, origin (0,0), meters, on the GCS
//          Mars_2000_(Sphere), spheroid R = 3,396,190 m (auth. Esri 104971),
//          prime meridian = Reference_Meridian, degrees east-positive.
//          Longitude convention: Mars east-positive 0-360 (all our values
//          are 76-78 E, so display conversion is the identity east-of-Greenwich
//          wrap used by the shared renderer).
//
// Checks (all must pass):
//  A. Roundtrip: forward spherical-TM(inverse(x,y)) == (x,y).
//  B. Map boundary transforms to the published 1x1 degree bbox
//     (76.8-77.8 E, 17.7-18.7 N) within tolerance.
//  C. Units feature count, unit-name/symbol domains, OBJECTID/ORIG_FID ranges
//     and SHAPE area/length ranges match the published FGDC metadata.
//  D. Every unit polygon lies inside the map boundary (sampled + bbox).
//  E. Sampled grid over the boundary is covered by exactly one unit
//     (topological completeness) - report coverage fraction.
//  F. Every distinct unit has non-empty description fields for the legend.
//
// usage: node audit_geology.mjs [report.json]

import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const [, , reportPath] = process.argv;

const D2R = Math.PI / 180;
const R = 3396190.0; // Mars_2000_(Sphere), from .prj and FGDC metadata
const K0 = 1.0; // scale factor, from .prj
const CM = 77.5; // central meridian, degrees east

// -------------------------------------------------- spherical TM (MTM) math
// Forward: (lonE, lat) deg -> (x, y) meters. Snyder, spherical TM:
//   B = cos(lat) * sin(dlon);  x = k0*R*atanh(B);  y = k0*R*atan(tan(lat)/cos(dlon))
function mtmForward(lonE, lat) {
  const dlon = (lonE - CM) * D2R;
  const phi = lat * D2R;
  const B = Math.cos(phi) * Math.sin(dlon);
  const x = K0 * R * Math.atanh(B);
  const y = K0 * R * Math.atan(Math.tan(phi) / Math.cos(dlon));
  return [x, y];
}
// Inverse: (x, y) meters -> [lonE, lat] deg. Exact algebraic inversion of the
// forward definitions B = cos(lat)*sin(dlon) and tan(psi) = tan(lat)/cos(dlon)
// with psi = y/(k0R), B = tanh(x/(k0R)):
//   sin(psi) = sin(lat)/sqrt(1-B^2)   =>   sin(lat) = sin(psi)*sqrt(1-B^2)
//   sin(dlon) = B/cos(lat)            (valid for |dlon| < 90 deg - TM near the
//                                      central meridian; our region stays within
//                                      +/-0.7 deg of 77.5 E)
function mtmInverse(x, y) {
  const B = Math.tanh(x / (K0 * R));
  const psi = y / (K0 * R);
  const sinPhi = Math.max(-1, Math.min(1, Math.sin(psi) * Math.sqrt(1 - B * B)));
  const phi = Math.asin(sinPhi);
  const cosPhi = Math.sqrt(Math.max(0, 1 - sinPhi * sinPhi));
  const sinD = Math.max(-1, Math.min(1, B / cosPhi));
  return [CM + Math.asin(sinD) / D2R, phi / D2R];
}

// ---------------------------------------------------------------- load source
const load = (name) => {
  const p = join(here, "source", `${name}.json`);
  if (!existsSync(p)) throw new Error(`missing ${p}`);
  return JSON.parse(readFileSync(p, "utf8"));
};
const units = load("GeologicUnits");
const boundary = load("MapBoundary");
const contacts = load("GeologicContacts");
const linear = load("LinearFeatures");
const surface = load("SurfaceFeatures");
const location = load("LocationFeatures");

const results = [];
const check = (id, pass, detail) => {
  results.push({ id, pass: !!pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id}: ${detail}`);
};

// ------------------------------------------------------------- A: roundtrip
{
  let maxErr = 0;
  const xs = [0, -30000, 16941.1894, -39529.3559, 12345.6];
  const ys = [1000000, 1108513.8212, 1049162.1464, 1200000, 900000];
  for (let i = 0; i < xs.length; i++) {
    const [lon, lat] = mtmInverse(xs[i], ys[i]);
    const [bx, by] = mtmForward(lon, lat);
    maxErr = Math.max(maxErr, Math.abs(bx - xs[i]), Math.abs(by - ys[i]));
  }
  check("A.projection-roundtrip", maxErr < 1e-6, `max roundtrip error ${maxErr.toExponential(3)} m`);
}

// central-meridian identity: lon 77.5 must give x=0 for any lat
{
  const [x0] = mtmForward(77.5, 18.4);
  check("A.central-meridian", Math.abs(x0) < 1e-6, `x(77.5E, 18.4N) = ${x0.toExponential(3)} m`);
}

// --------------------------------------------------- B: boundary -> 1x1 deg
{
  const ring = boundary.features[0].geometry.rings[0];
  const area = boundary.features[0].attributes["Shape__Area"];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of ring) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const [lonW, latS] = mtmInverse(minX, minY);
  const [lonE, latN] = mtmInverse(maxX, maxY);
  // The boundary is a straight-edged rectangle in MTM meters; its inverse
  // lon/lat edges bow slightly with latitude (TM property), so the corner
  // inverse values must bracket the published 1x1 degree box closely but not
  // exactly. Tolerance 0.02 deg (~1.2 km) per edge.
  const dW = lonW - 76.8, dE = lonE - 77.8;
  const dS = latS - 17.7, dN = latN - 18.7;
  const maxDeg = Math.max(Math.abs(dW), Math.abs(dE), Math.abs(dS), Math.abs(dN));
  // Planar (MTM) area of the 1x1 degree box for comparison with the polygon.
  const patchArea = R * R * ((77.8 - 76.8) * D2R) * (Math.sin(18.7 * D2R) - Math.sin(17.7 * D2R));
  const areaDevPct = Math.abs(area - patchArea) / patchArea * 100;
  check(
    "B.boundary-bbox",
    maxDeg < 0.02 && areaDevPct < 0.1,
    `boundary corner inverse ${lonW.toFixed(4)}-${lonE.toFixed(4)} E, ${latS.toFixed(4)}-${latN.toFixed(4)} N vs published 76.8-77.8 E, 17.7-18.7 N (max edge deviation ${maxDeg.toFixed(5)} deg); MTM area ${area.toFixed(0)} m2 vs spherical 1x1 deg patch ${patchArea.toFixed(0)} m2 (dev ${areaDevPct.toFixed(3)}%)`,
  );
}

// --------------------------------- C: unit domains vs published FGDC metadata
// Domains and ranges transcribed from sim3464_metadata.txt (FGDC, published).
const META_NAMES = [
  "Upper etched unit", "Eolian bedform unit", "Smooth unit, undivided",
  "Nili Planum 2 unit", "Rugged bright unit", "Nili Planum 1 unit",
  "Crater ejecta unit", "Crater interior unit", "Crater rim unit",
  "Jezero floor unit", "Lower etched unit", "Nili Planum fan unit",
  "Jezero fan 2 unit", "Jezero fan 1 unit",
];
// The published name domain contains 15 values including the misspelling
// "Crater riim unit" alongside "Crater rim unit" (both share symbol "cr" and
// unit number 11; the data carries 1 polygon with the typo variant - kept
// verbatim in source, merged into the sheet spelling only in the legend).
const META_NAMES_FULL = [...META_NAMES, "Crater riim unit"];
const META_SYMBOLS = [
  "Nue", "Aeb", "su", "Nnp2", "Nrb", "Nnp1", "ce", "ci", "cr", "Njf",
  "Nle", "Hnpf", "CR", "NHjf2", "NHjf1",
];
const META_AREA = [20014.3504697, 533443741.309];
const META_LENG = [535.784353011, 1073714.87194];

{
  const count = units.feature_count ?? units.features.length;
  check("C.units-count", count === 1308, `units: ${count} (published FGDC ORIG_FID max 1308)`);

  const nameSet = new Map(), symbolSet = new Map();
  let oidMin = Infinity, oidMax = -Infinity;
  let areaMin = Infinity, areaMax = -Infinity, lengMin = Infinity, lengMax = -Infinity;
  const badGeom = [];
  for (const f of units.features) {
    const a = f.attributes ?? {};
    if (a.name != null) nameSet.set(a.name, (nameSet.get(a.name) ?? 0) + 1);
    if (a.symbol != null) symbolSet.set(a.symbol, (symbolSet.get(a.symbol) ?? 0) + 1);
    if (a.OBJECTID != null) { oidMin = Math.min(oidMin, a.OBJECTID); oidMax = Math.max(oidMax, a.OBJECTID); }
    const ar = a["Shape__Area"] ?? a.Shape_Area, lg = a["Shape__Length"] ?? a.Shape_Length;
    if (ar != null) { areaMin = Math.min(areaMin, ar); areaMax = Math.max(areaMax, ar); }
    if (lg != null) { lengMin = Math.min(lengMin, lg); lengMax = Math.max(lengMax, lg); }
    // geometry sanity: all rings inside the MTM x/y envelope of the 1x1 box
    const tol = 500; // meters
    for (const ring of f.geometry.rings) {
      for (const [x, y] of ring) {
        if (x < -39529 - tol || x > 16941 + tol || y < 1049162 - tol || y > 1108514 + tol) badGeom.push([a.OBJECTID, x, y]);
      }
    }
  }
  const names = [...nameSet.keys()];
  const symbols = [...symbolSet.keys()];
  const nameMatch =
    names.every((n) => META_NAMES_FULL.includes(n)) && names.length === 15;
  const symMatch = symbols.every((s) => META_SYMBOLS.includes(s)) && symbols.length === 14;
  check("C.unit-names", nameMatch, `unit names (${names.length}, all in the published 15-value domain): ${names.join("; ")}`);
  check("C.unit-symbols", symMatch, `unit symbols (${symbols.length} of the 15 published domain values used): ${symbols.join("; ")}`);
  check(
    "C.id-ranges",
    oidMin === 1 && oidMax === 1308,
    `OBJECTID ${oidMin}-${oidMax}, 1308 contiguous features (published FGDC: OBJECTID 1-1304, ORIG_FID 1-1308; the service exposes the gdb ORIG_FID range as OBJECTID)`,
  );
  const areaOk =
    Math.abs(areaMin - META_AREA[0]) < 1 && Math.abs(areaMax - META_AREA[1]) < 1000;
  const lengOk =
    Math.abs(lengMin - META_LENG[0]) < 1 && Math.abs(lengMax - META_LENG[1]) < 1000;
  check(
    "C.area-length-ranges",
    areaOk && lengOk,
    `Shape area ${areaMin.toFixed(1)}-${areaMax.toFixed(1)} m2 (published ${META_AREA.join("-")}); length ${lengMin.toFixed(1)}-${lengMax.toFixed(1)} m (published ${META_LENG.join("-")})`,
  );
  check(
    "D.unit-vertices-in-envelope",
    badGeom.length === 0,
    badGeom.length ? `${badGeom.length} vertices outside the MTM envelope: ${JSON.stringify(badGeom.slice(0, 5))}` : "all unit vertices inside the published 1x1 degree MTM envelope (+500 m tol)",
  );
}

// ------------------------------------------ E: unit polygon footprint checks
{
  // Inverse lon/lat of every unit vertex must fall inside the published
  // 1x1 degree box (within 0.05 deg = ~3 km; TM edge bow accounts for most of
  // any deviation).
  const tolDeg = 0.05;
  let bad = 0, worst = 0, worstPt = null, minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const f of units.features) {
    for (const ringR of f.geometry.rings) {
      for (const [x, y] of ringR) {
        const [lon, lat] = mtmInverse(x, y);
        minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
        const dev = Math.max(76.8 - lon, lon - 77.8, 17.7 - lat, lat - 18.7, 0);
        if (dev > tolDeg) bad++;
        if (dev > worst) { worst = dev; worstPt = [x, y, lon, lat]; }
      }
    }
  }
  check(
    "E.unit-vertices-in-bbox",
    bad === 0,
    bad
      ? `${bad} vertices deviate >${tolDeg} deg from the published bbox (worst ${JSON.stringify(worstPt)})`
      : `all unit vertices inside 76.8-77.8 E, 17.7-18.7 N; observed lon ${minLon.toFixed(4)}-${maxLon.toFixed(4)}, lat ${minLat.toFixed(4)}-${maxLat.toFixed(4)}`,
  );
}

// ------------------------------- F: topological completeness (sampled grid)
{
  // Point-in-polygon over the boundary ring (ray cast, MTM plane).
  const br = boundary.features[0].geometry.rings[0];
  const inBoundary = (px, py) => {
    let inside = false;
    for (let i = 0, j = br.length - 1; i < br.length; j = i++) {
      const [xi, yi] = br[i], [xj, yj] = br[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  // Precompute unit bboxes for speed.
  const unitsPrep = units.features.map((f) => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const ring of f.geometry.rings) {
      for (const [x, y] of ring) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
    return { f, minX, maxX, minY, maxY };
  });
  const inUnit = (f, px, py) => {
    let inside = false;
    const rings = f.geometry.rings;
    for (const ring of rings) {
      let rIn = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i], [xj, yj] = ring[j];
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) rIn = !rIn;
      }
      if (rIn) inside = !inside; // even-odd across rings (holes)
    }
    return inside;
  };
  const N = 250;
  let covered = 0, multi = 0, none = 0, outside = 0, samples = 0;
  const unmatched = [];
  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      const x = -39529.3559 + ((16941.1894 + 39529.3559) * i) / N;
      const y = 1049162.1464 + ((1108513.8212 - 1049162.1464) * j) / N;
      if (!inBoundary(x, y)) { outside++; continue; }
      samples++;
      let hits = 0;
      for (const u of unitsPrep) {
        if (x < u.minX || x > u.maxX || y < u.minY || y > u.maxY) continue;
        if (inUnit(u.f, x, y)) { hits++; if (hits > 1) break; }
      }
      if (hits === 1) covered++;
      else if (hits > 1) { multi++; }
      else { none++; if (unmatched.length < 8) unmatched.push([x.toFixed(0), y.toFixed(0)]); }
    }
  }
  const coverFrac = covered / samples;
  // Digitizing artifacts in the published GIS release: small sliver gaps and
  // overlaps between adjacent unit polygons. Quantified here rather than
  // silently accepted; thresholds below keep them at the level of published
  // map artifacts, not data loss.
  const multiFrac = multi / samples, noneFrac = none / samples;
  check(
    "F.units-cover-boundary",
    coverFrac > 0.99 && multiFrac < 0.001 && noneFrac < 0.005,
    `${covered}/${samples} boundary sample points in exactly one unit (${(coverFrac * 100).toFixed(2)}%); ${multi} multi-covered (${(multiFrac * 100).toFixed(3)}%), ${none} uncovered (${(noneFrac * 100).toFixed(3)}%) - sliver gaps/overlaps in the published GIS polygons (${outside} sample points fall outside the boundary polygon; e.g. uncovered ${JSON.stringify(unmatched)})`,
  );
}

// ------------------------------- G: legend fields present for every unit name
{
  const byName = new Map();
  for (const f of units.features) {
    const a = f.attributes ?? {};
    if (!a.name) continue;
    const rec = byName.get(a.name) ?? { count: 0, desc: 0, interp: 0, symbols: new Set(), unitNumbers: new Set() };
    rec.count++;
    if (a.Unit_Description && String(a.Unit_Description).trim()) rec.desc++;
    if (a.Unit_Interpretation && String(a.Unit_Interpretation).trim()) rec.interp++;
    if (a.symbol) rec.symbols.add(a.symbol);
    if (a.unit != null) rec.unitNumbers.add(a.unit);
    byName.set(a.name, rec);
  }
  const missing = [...byName.entries()].filter(([, r]) => r.desc === 0 || r.interp === 0);
  check(
    "G.unit-descriptions",
    missing.length === 0,
    missing.length
      ? `units missing description/interpretation: ${missing.map(([n, r]) => `${n} (desc ${r.desc}, interp ${r.interp})`).join("; ")}`
      : `${byName.size} distinct units all carry Unit_Description and Unit_Interpretation`,
  );

  // Summary for the build/legend step.
  const summary = [...byName.entries()].map(([name, r]) => ({
    name,
    polygons: r.count,
    symbols: [...r.symbols],
    unit_numbers: [...r.unitNumbers],
    description: String(units.features.find((f) => f.attributes?.name === name).attributes.Unit_Description ?? "").trim(),
    interpretation: String(units.features.find((f) => f.attributes?.name === name).attributes.Unit_Interpretation ?? "").trim(),
  }));
  writeFileSync(join(here, "units_summary.json"), JSON.stringify(summary, null, 2));
  console.log(`wrote units_summary.json (${summary.length} units)`);
}

// --------------------------------------------------- other layers sanity
{
  const pathCount = (f) => {
    const g = f.geometry;
    if (!g) return 0; // null-geometry records are carried verbatim
    return (g.rings ?? g.paths ?? []).length;
  };
  const bc = contacts.features.reduce((n, f) => n + pathCount(f), 0);
  const lc = linear.features.reduce((n, f) => n + pathCount(f), 0);
  const sc = surface.features.reduce((n, f) => n + pathCount(f), 0);
  check(
    "H.other-layers-present",
    contacts.feature_count === 2497 && linear.feature_count === 382 &&
      surface.feature_count === 285 && location.feature_count === 341 &&
      boundary.feature_count === 1 && bc > 0 && lc > 0 && sc > 0,
    `contacts ${contacts.feature_count} (paths ${bc}), linear ${linear.feature_count} (paths ${lc}), surface ${surface.feature_count} (paths ${sc}), location ${location.feature_count}, boundary 1`,
  );
}

const allPass = results.every((r) => r.pass);
const report = {
  source: {
    product: "USGS SIM 3464, Sun & Stack (2020), Geologic map of Jezero crater and the Nili Planum region, Mars, 1:75,000",
    doi: "https://doi.org/10.3133/sim3464",
    data_release_doi: "https://doi.org/10.5066/P9CZYIO7",
    layers_service: "https://services.arcgis.com/v01gqwM5QqNysAAi/arcgis/rest/services/Jezero_FeatureServiceFromPro/FeatureServer",
    fetched_by: "team/jezero/geology/fetch_source_layers.mjs",
    official_database: "sim3464_database.zip (Nili.gdb) downloaded to team/jezero/geology/downloads/ (kept local, gitignored)",
  },
  projection: {
    name: "MTM_clon77.5E (Transverse Mercator, CM 77.5 E, k0 1.0, meters)",
    geodetic: "GCS Mars_2000_(Sphere), R = 3,396,190 m, prime meridian Reference_Meridian, degrees east",
    inverse_impl: "spherical TM inverse in audit_geology.mjs (roundtrip-checked)",
  },
  longitude_convention: "east-positive 0-360; all values 76-78 E so the display wrap is identity",
  checks: results,
  all_pass: allPass,
  checked_at_utc: new Date().toISOString(),
};
console.log(JSON.stringify({ all_pass: allPass, checks: results.length }));
if (reportPath) writeFileSync(reportPath, JSON.stringify(report, null, 2));
if (!allPass) process.exit(2);
