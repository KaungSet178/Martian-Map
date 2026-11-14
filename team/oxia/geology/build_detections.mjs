#!/usr/bin/env node
// Oxia Planum mineral-detection overlay (Oxia region owner tool).
//
// Source : two NASA JPL Mars Trek ArcGIS feature layers (point features,
//          GCS_Mars_2000_Sphere), queried inside the Oxia display box
//          334.60-336.60 E, 17.11-19.15 N:
//          - Aqueous Mineral Distribution (Aqueous_Mineral_Distribution_Options_clon0;
//            Trek service name spelled "Aquieous"), field Class.
//            Cited by Trek: Ehlmann & Edwards (2014), Annu. Rev. Earth Planet. Sci. 42, 291-315.
//          - Hydrous Mineral Detections (OMEGA, CRISM)
//            (Hydrous_Mineral_Detections_CRISM_clon0), fields Type, Instrument.
//            Cited by Trek: Carter et al. (2013), JGR Planets 118(4), 831-858.
// Output : public/maps/oxia/mineral-detections.geojson (path from argv),
//          one Point per unique (class, latitude, longitude); rows that repeat
//          with identical values are merged and their FIDs kept.
//          Coordinates use the reviewed display convention: [lon, lat] with
//          east longitude converted from 0-360 to -180..180 (lon - 360 when
//          lon > 180), taken from the 'Longitude' (0-360 E) and 'Latitude'
//          fields. The original 0-360 values are kept as properties.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [, , outPath] = process.argv;
if (!outPath) {
  console.error("usage: node build_detections.mjs <output.geojson>");
  process.exit(1);
}

const BOX = { west: 334.6, east: 336.6, south: 17.11, north: 19.15 };
const toDisplayLon = (lon) => (lon > 180 ? lon - 360 : lon);
const envelope = {
  xmin: toDisplayLon(BOX.west),
  ymin: BOX.south,
  xmax: toDisplayLon(BOX.east),
  ymax: BOX.north,
  spatialReference: { wkid: 104905 },
};

const LAYERS = [
  {
    source_id: "oxia-trek-aqueous",
    trek_layer_id: "Aqueous_Mineral_Distribution_Options_clon0",
    url: "https://trek.nasa.gov/mars/trekarcgis/rest/services/Aquieous_Mineral_Distribution_Options_clon0/MapServer/0",
    citation:
      "Ehlmann, B. L., Edwards, C. S. (2014) Mineralogy of the Martian Surface, Annu. Rev. Earth Planet. Sci. 42, 291-315",
    classOf: (a) => a.Class,
    instrumentOf: () => "CRISM / OMEGA / THEMIS compilation (per-point instrument not given)",
  },
  {
    source_id: "oxia-trek-hydrous",
    trek_layer_id: "Hydrous_Mineral_Detections_CRISM_clon0",
    url: "https://trek.nasa.gov/mars/trekarcgis/rest/services/Hydrous_Mineral_Detections_OMEGA_CRISM_clon0/MapServer/0",
    citation:
      "Carter, J., Poulet, F., Bibring, J.-P., Mangold, N., Murchie, S. (2013) Hydrous minerals on Mars as seen by the CRISM and OMEGA imaging spectrometers: Updated global view, JGR Planets 118(4), 831-858",
    classOf: () => "hydrous (unspecified)",
    instrumentOf: (a) => a.Instrument,
  },
];

const features = [];
const report = { queried_at: new Date().toISOString(), box_east_0_360: BOX, layers: [] };
for (const layer of LAYERS) {
  const q = new URLSearchParams({
    where: "1=1",
    geometry: JSON.stringify(envelope),
    geometryType: "esriGeometryEnvelope",
    inSR: "104905",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    returnGeometry: "false",
    f: "json",
  });
  const res = await fetch(`${layer.url}/query?${q}`, { signal: AbortSignal.timeout(90000) });
  const json = await res.json();
  if (json.error) throw new Error(`${layer.trek_layer_id}: ${JSON.stringify(json.error)}`);
  const unique = new Map();
  for (const { attributes: a } of json.features) {
    const cls = layer.classOf(a);
    const key = `${cls}|${a.Latitude.toFixed(4)}|${a.Longitude.toFixed(4)}`;
    const entry = unique.get(key) ?? { a, cls, fids: [] };
    entry.fids.push(a.FID);
    unique.set(key, entry);
  }
  for (const { a, cls, fids } of unique.values()) {
    const latitude = Number(a.Latitude.toFixed(2));
    const longitude_east = Number(a.Longitude.toFixed(2));
    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [Number(toDisplayLon(longitude_east).toFixed(2)), latitude],
      },
      properties: {
        mineral_class: cls,
        latitude,
        longitude_east,
        instrument: layer.instrumentOf(a),
        source_id: layer.source_id,
        trek_layer_id: layer.trek_layer_id,
        trek_feature_ids: fids,
        citation: layer.citation,
        evidence: "Interpreted",
        location_note: "Approximate detection location (two-decimal degrees, about 0.6 km); not a mapped unit boundary.",
      },
    });
  }
  report.layers.push({
    trek_layer_id: layer.trek_layer_id,
    rows_returned: json.features.length,
    unique_points: unique.size,
    exceeded_transfer_limit: Boolean(json.exceededTransferLimit),
  });
}

const geojson = { type: "FeatureCollection", features };
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(geojson, null, 1) + "\n");
report.features_written = features.length;
report.classes = [...new Set(features.map((f) => f.properties.mineral_class))];
writeFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "build_report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
