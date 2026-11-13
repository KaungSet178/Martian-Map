import type { ScientificLayer } from "@/lib/contracts/region";
import { geologyLegend } from "./geology-legend";
import { terrainLayers } from "./terrain-layers";

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
  ...terrainLayers,
  {
    "id": "gale-geology",
    "type": "Geological mapping",
    "display_name": "Arc Pass geological units",
    "kind": "geology",
    "availability": "available",
    "source_id": "gale-arc-pass-geology",
    "observation_date": null,
    "spatial_resolution_m": null,
    "coverage": "Arc Pass only: 137.406597..137.411053 E, -4.789073..-4.785335 N; about 264 x 222 m. Outside the source footprint is unmapped, not a missing or safe unit. Opening the layer fits this mapped area.",
    "limitations": "Davis (2025) source Unit codes preserved; interpreted photogeology, not terrain safety or mineral abundance. Digitized at 1:250 on HiRISE; CTX context is much coarser and becomes pixelated at close zoom. Absolute positional accuracy is unspecified; tiny source topology gaps remain. Not the whole Gediz Vallis or a boundary for any catalog target.",
    "evidence": "Interpreted",
    "attribution": "Joel Davis (2025), Figshare, CC BY 4.0; Davis et al. (2026), JGR Planets; display conversion by Marswalk",
    "rendering": {
      "kind": "geojson",
      "url": "/maps/gale/arc-pass-geology.geojson",
      "geometry": "fill",
      "color": "#647C9A",
      "category_property": "Unit",
      "max_zoom": 18,
      "focus_extent": {
        "west_east": 137.4065970458571,
        "east_east": 137.4110534954222,
        "south_latitude": -4.789072816244821,
        "north_latitude": -4.785334720408685
      }
    },
    "default_visible": false,
    "default_opacity": 45,
    "legend": geologyLegend
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
  }
] satisfies ScientificLayer[];
