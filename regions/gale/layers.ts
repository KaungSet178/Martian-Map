import type { ScientificLayer } from "@/lib/contracts/region";

// Gale G1: source-backed content; unknown values remain explicit.
export const layers = [
  {
    "id": "gale-optical",
    "type": "Optical imagery",
    "display_name": "Gale CTX orbital mosaic",
    "kind": "optical",
    "availability": "available",
    "source_id": "gale-trek-ctx",
    "observation_date": null,
    "spatial_resolution_m": null,
    "coverage": "Exact published PDS orbital-map v42.0 footprint: 137.344235..137.457943 E, -4.822361..-4.580605 N, within the wider CTX mosaic. Outside footprint transparent.",
    "limitations": "Derived display tiles of observed CTX imagery. Mosaic effective resolution and acquisition dates unspecified; finest served angular spacing about 10.17 m on Mars, not uniform 6 m imagery. Seams and registration uncertainty remain. No terrain/hazard inference.",
    "evidence": "Derived",
    "attribution": "NASA/JPL-Caltech/MSSS - CTX - NASA Trek - display resampling by Marswalk",
    "rendering": {
      "kind": "raster-tiles",
      "tiles": [
        "/maps/gale/ctx-tiles/{z}/{x}/{y}.png"
      ],
      "tile_size": 256,
      "min_zoom": 5,
      "max_zoom": 13
    },
    "default_visible": true,
    "default_opacity": 100,
    "legend": null
  },
  {
    "id": "gale-terrain",
    "type": "Terrain & slope",
    "display_name": "Terrain & slope",
    "kind": "topography",
    "availability": "pending",
    "source_id": "gale-merged-dem",
    "observation_date": null,
    "spatial_resolution_m": null,
    "coverage": "Published DEM envelope 137.124167..137.680559 E, -5.098652..-4.129605 N; actual valid pixels and quality zones unaudited.",
    "limitations": "USGS merged HiRISE/CTX/HRSC/MOLA DEM v3 identified. Its 1 m output grid does not imply uniform 1 m effective resolution. No raster subset, slopes, nodata mask or terrain eligibility integrated; full 3.6 GB file not downloaded.",
    "evidence": "Unavailable",
    "attribution": null,
    "rendering": {
      "kind": "unavailable",
      "reason": "Requires audited DEM, resolution, valid-data footprint and documented derivation."
    },
    "default_visible": false,
    "default_opacity": 70,
    "legend": null
  },
  {
    "id": "gale-geology",
    "type": "Geology & mineralogy",
    "display_name": "Geology & mineralogy",
    "kind": "geology",
    "availability": "pending",
    "source_id": "gale-geology-publication",
    "observation_date": null,
    "spatial_resolution_m": null,
    "coverage": null,
    "limitations": "USGS-listed Glen Torridon stratigraphic study located. Published interpretation supports the catalog; registered GIS contacts, coverage and categorical legend are not ingested. No invented mineral raster.",
    "evidence": "Unavailable",
    "attribution": null,
    "rendering": {
      "kind": "unavailable",
      "reason": "Requires published map products, classification legends and coverage verification."
    },
    "default_visible": false,
    "default_opacity": 70,
    "legend": null
  },
  {
    "id": "gale-traverse-recorded",
    "type": "Recorded rover traverse",
    "display_name": "Recorded Curiosity traverse",
    "kind": "overlay",
    "availability": "available",
    "source_id": "gale-nasa-traverse",
    "observation_date": null,
    "spatial_resolution_m": null,
    "coverage": "NASA interactive-map traverse snapshot 2026-11-13, cross-checked against PDS v42.0. Full source geometry retained; the camera is bounded to the older published PDS orbital-map footprint.",
    "limitations": "Historical recorded line geometry, not live location or an astronaut route. All original line segments and 2D vertices retained; no invented connections. 1277 endpoints independently matched to PDS centric/east positions. Latest segments can fall outside the supported camera footprint. No per-line date supplied; no hazard or terrain-safety claim.",
    "evidence": "Observed",
    "attribution": "NASA/JPL-Caltech - Curiosity mission map - PDS localization cross-check",
    "rendering": {
      "kind": "geojson",
      "url": "/maps/gale/curiosity-traverse.geojson",
      "geometry": "line",
      "color": "#D6DEE8"
    },
    "default_visible": true,
    "default_opacity": 90,
    "legend": {
      "title": "Historical rover record",
      "units": null,
      "items": [
        {
          "label": "Recorded Curiosity traverse - snapshot 2026-11-13",
          "color": "#D6DEE8"
        }
      ]
    }
  }
] satisfies ScientificLayer[];
