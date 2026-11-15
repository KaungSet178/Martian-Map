import type { ScientificLayer } from "@/lib/contracts/region";
import { terrainLayers } from "./terrain-layers";
import { coverageLayers } from "./coverage-layers";

// Gale G1: source-backed content; unknown values remain explicit.
export const layers = [
  {
    id: "gale-context",
    type: "Optical imagery",
    display_name: "Context CTX (wider area)",
    kind: "optical",
    availability: "available",
    source_id: "gale-trek-ctx",
    observation_date: null,
    spatial_resolution_m: null,
    coverage: "Broader crop of the existing Gale_CTX_BlockAdj_dd NASA Trek mosaic: 136.4-138.4 E, -5.6 to -3.8 N. Original alpha gaps retained. Finite context coverage, not global Mars or high-resolution mission coverage.",
    limitations: "Context tiles sample the same authenticated angular CTX service at approximately 40.7 m equatorial spacing (z11 ceiling), versus 10.17 m for the detailed mission tiles (z13). These are display sample spacings, not effective image resolution or positional accuracy. Native acquisition dates and mosaic dimensions are unspecified. No radiometric edits, invented pixels, fitted shifts or safety inference. Source coordinates and mission eligibility remain unchanged.",
    evidence: "Derived",
    attribution: "NASA/JPL-Caltech/MSSS · CTX · NASA Trek Gale block-adjusted mosaic · wider context at ~41 m display sampling",
    rendering: {
      kind: "raster-tiles",
      tiles: ["/maps/gale/context-tiles/{z}/{x}/{y}.png"],
      tile_size: 256,
      min_zoom: 5,
      max_zoom: 11,
      bounds: { west_east: 136.4, east_east: 138.4, south_latitude: -5.6, north_latitude: -3.8 },
    },
    default_visible: false,
    default_opacity: 100,
    legend: null,
  },
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
  ...terrainLayers,
  {
    "id": "gale-traverse-recorded",
    "type": "Recorded rover traverse",
    "display_name": "Recorded Curiosity traverse",
    "kind": "overlay",
    "availability": "available",
    "source_id": "gale-nasa-traverse",
    "observation_date": null,
    "spatial_resolution_m": null,
    "coverage": "NASA interactive-map traverse snapshot 2026-11-13, cross-checked against PDS v42.0. Full source geometry retained; the initial overview fits the older published PDS orbital-map footprint. Camera navigation is not restricted to imagery coverage.",
    "limitations": "Historical recorded line geometry, not live location or an astronaut route. All original line segments and 2D vertices retained; no invented connections. 1277 endpoints independently matched to PDS centric/east positions. Latest segments can extend beyond the imagery footprint. No per-line date supplied; no hazard or terrain-safety claim.",
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
  },
  ...coverageLayers,
] satisfies ScientificLayer[];
