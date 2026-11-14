// Downloads the USGS-published ArcGIS FeatureServer layers for SIM 3464
// (Sun & Stack 2020, Geologic map of Jezero crater and the Nili Planum
// region, Mars, 1:75,000; DOI 10.3133/sim3464; data release DOI
// 10.5066/P9CZYIO7). The service is the USGS-published web layer of the
// official SIM database (Nili.gdb, sim3464_database.zip downloaded and kept
// locally; see audit_report.json for the provenance chain).
//
// Usage: node fetch_source_layers.mjs
// Writes one JSON file per feature layer into ./source/ and
// fetch_source_layers.json (provenance report). Requires Node >= 18 (global
// fetch). No third-party dependencies.

import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "source");

const SERVICE =
  "https://services.arcgis.com/v01gqwM5QqNysAAi/arcgis/rest/services/Jezero_FeatureServiceFromPro/FeatureServer";

const LAYERS = [
  { id: 0, name: "MapBoundary" },
  { id: 4, name: "LocationFeatures" },
  { id: 5, name: "GeologicContacts" },
  { id: 6, name: "LinearFeatures" },
  { id: 7, name: "SurfaceFeatures" },
  { id: 8, name: "GeologicUnits" },
];

const page = 2000; // service maxRecordCount

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const body = await res.json();
  if (body.error) throw new Error(JSON.stringify(body.error));
  return body;
}

const report = { service: SERVICE, fetched_at_utc: new Date().toISOString(), layers: [] };

for (const spec of LAYERS) {
  const layerUrl = `${SERVICE}/${spec.id}`;
  const meta = await fetchJson(`${layerUrl}?f=json`);
  const countBody = await fetchJson(
    `${layerUrl}/query?where=1%3D1&returnCountOnly=true&f=json`,
  );
  const count = typeof countBody === "number" ? countBody : countBody.count;
  if (!Number.isFinite(count)) throw new Error(`bad count ${JSON.stringify(countBody)}`);
  const features = [];
  for (let offset = 0; offset < count; offset += page) {
    const chunk = await fetchJson(
      `${layerUrl}/query?where=1%3D1&outFields=*&geometryPrecision=3&returnGeometry=true&f=json&resultOffset=${offset}&resultRecordCount=${page}`,
    );
    features.push(...chunk.features);
    if (chunk.exceededTransferLimit === false) break;
  }
  if (features.length !== count) {
    throw new Error(
      `layer ${spec.id} (${spec.name}): fetched ${features.length} != count ${count}`,
    );
  }
  const out = {
    source: SERVICE,
    layer_id: spec.id,
    layer_name: meta.name,
    geometry_type: meta.geometryType,
    spatial_reference_wkt: meta.spatialReference?.wkt ?? null,
    extent: meta.extent,
    feature_count: features.length,
    fetched_at_utc: report.fetched_at_utc,
    fields: (meta.fields ?? []).map((f) => f.name),
    features,
  };
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, `${spec.name}.json`);
  writeFileSync(file, JSON.stringify(out));
  report.layers.push({
    id: spec.id,
    name: meta.name,
    feature_count: features.length,
    file: `source/${spec.name}.json`,
    geometry_type: meta.geometryType,
  });
  console.log(`${spec.name}: ${features.length} features -> ${file}`);
}

writeFileSync(join(here, "fetch_source_layers.json"), JSON.stringify(report, null, 2));
console.log("done");
