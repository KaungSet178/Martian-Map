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
    display_name: "Regional hillshade (200 m)",
    kind: "topography",
    availability: "available",
    source_id: "oxia-mola-hrsc-shade-trek",
    observation_date: null,
    spatial_resolution_m: 200,
    coverage:
      "Mars Trek MOLA + HRSC hillshade blend over the team-chosen Oxia display area, 17.11-19.15 N, 334.60-336.60 E: 26 derived display tiles, Web-Mercator XYZ, zooms 5-9 (source level 8, about 163 m per pixel; product 200 m per pixel). No gaps in this area.",
    limitations:
      "Regional relief only, 200 m per pixel. Not for walking-scale slope or safety. Shaded relief image with no elevation or slope values; boulders, small craters and steep local slopes are not resolved. Illumination direction is not stated by Mars Trek. Display-grade, nearest-neighbour resampled from Mars Trek JPEG tiles (lossy compression). No routing or hazard use.",
    evidence: "Derived",
    attribution:
      "NASA MGS MOLA and ESA Mars Express HRSC hillshade blend · via NASA JPL Mars Trek",
    rendering: {
      kind: "raster-tiles",
      tiles: ["/maps/oxia/hillshade-tiles/{z}/{x}/{y}.png"],
      tile_size: 256,
      min_zoom: 5,
      max_zoom: 9,
    },
    default_visible: false,
    default_opacity: 70,
    legend: {
      title:
        "Shaded relief. Regional relief only, 200 m per pixel. Not for walking-scale slope or safety.",
      units: null,
      items: [
        { label: "Lit slopes", color: "#DADADA" },
        { label: "Flat ground", color: "#9A9A9A" },
        { label: "Shadowed slopes", color: "#3C3C3C" },
      ],
    },
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
  {
    id: "oxia-thermal-night",
    type: "Thermal context",
    display_name: "THEMIS night IR",
    kind: "thermal",
    availability: "available",
    source_id: "oxia-themis-night-trek",
    observation_date: null,
    spatial_resolution_m: 100,
    coverage:
      "Mars Trek THEMIS night-IR global mosaic over the team-chosen Oxia display area, 17.11-19.15 N, 334.60-336.60 E: 75 derived display tiles, Web-Mercator XYZ, zooms 5-10 (source level 9, about 81 m per pixel). No gaps in this area.",
    limitations:
      "Relative brightness only: the 8-bit mosaic values are not calibrated temperatures and are not thermal-inertia values. Observation period not stated by Mars Trek (the 'oct2018' in the layer name refers to the 2018 mosaic release). Night-time brightness mainly reflects thermal inertia (brighter = holds heat, e.g. rock or indurated surfaces; darker = loose sand or dust), but it can also vary with season, local time and dust. Mosaic of many orbits with stretched brightness between images. Display-grade, nearest-neighbour resampled; not terrain-safety evidence.",
    evidence: "Observed",
    attribution:
      "NASA Mars Odyssey THEMIS · night-IR global mosaic (2018 release) · via NASA JPL Mars Trek",
    rendering: {
      kind: "raster-tiles",
      tiles: ["/maps/oxia/themis-night-tiles/{z}/{x}/{y}.png"],
      tile_size: 256,
      min_zoom: 5,
      max_zoom: 10,
    },
    default_visible: false,
    default_opacity: 80,
    legend: {
      title: "Night-time IR brightness (relative, not temperature)",
      units: null,
      items: [
        {
          label: "Bright: holds heat at night (likely rock or indurated surface)",
          color: "#DADADA",
        },
        { label: "Medium", color: "#818181" },
        {
          label: "Dark: cools quickly at night (likely loose sand or dust)",
          color: "#373737",
        },
      ],
    },
  },
] satisfies ScientificLayer[];
