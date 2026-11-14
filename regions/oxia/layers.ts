import type { ScientificLayer } from "@/lib/contracts/region";

// Region-owned content. Pending values are deliberately explicit.
export const layers = [
  {
    id: "oxia-optical",
    type: "Optical imagery",
    display_name: "CTX basemap",
    kind: "optical",
    availability: "available",
    source_id: "oxia-ctx-trek",
    observation_date: null,
    spatial_resolution_m: 5,
    coverage:
      "Murray Lab CTX global mosaic (beta01) over the team-chosen Oxia display area, 17.11-19.15 N, 334.60-336.60 E: 841 derived display tiles, Web-Mercator XYZ, zooms 5-12.",
    limitations:
      "Uncontrolled beta mosaic (seams, varying illumination; not radiometrically calibrated). Display-grade: nearest-neighbour resampled to ~20 m display pixels at the top zoom (12), coarser than CTX native ~5 m; closer zooms enlarge the z12 tiles. No independent registration check against HiRISE yet. Imagery only, not a DEM, geology or terrain-safety evidence.",
    evidence: "Observed",
    attribution:
      "NASA/JPL/MSSS · Caltech Murray Lab CTX global mosaic (beta01) · via NASA JPL Mars Trek (tiles hosted by Esri)",
    rendering: {
      kind: "raster-tiles",
      tiles: ["/maps/oxia/ctx-tiles/{z}/{x}/{y}.png"],
      tile_size: 256,
      min_zoom: 5,
      max_zoom: 12,
    },
    default_visible: true,
    default_opacity: 100,
    legend: null,
  },
  {
    id: "oxia-terrain",
    type: "Terrain & slope",
    display_name: "Terrain & slope",
    kind: "topography",
    availability: "pending",
    source_id: null,
    observation_date: null,
    spatial_resolution_m: null,
    coverage: null,
    limitations:
      "Requires audited DEM, resolution, valid-data footprint and documented derivation.",
    evidence: "Unavailable",
    attribution: null,
    rendering: {
      kind: "unavailable",
      reason:
        "Requires audited DEM, resolution, valid-data footprint and documented derivation.",
    },
    default_visible: false,
    default_opacity: 70,
    legend: null,
  },
  {
    id: "oxia-geology",
    type: "Geology & mineralogy",
    display_name: "Geology & mineralogy",
    kind: "geology",
    availability: "pending",
    source_id: null,
    observation_date: null,
    spatial_resolution_m: null,
    coverage: null,
    limitations:
      "Requires published map products, classification legends and coverage verification.",
    evidence: "Unavailable",
    attribution: null,
    rendering: {
      kind: "unavailable",
      reason:
        "Requires published map products, classification legends and coverage verification.",
    },
    default_visible: false,
    default_opacity: 70,
    legend: null,
  },
] satisfies ScientificLayer[];
