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
    id: "oxia-slope",
    type: "Terrain & slope",
    display_name: "Regional slope (MOLA)",
    kind: "topography",
    availability: "available",
    source_id: "oxia-trek-elevation-profile",
    observation_date: null,
    spatial_resolution_m: 463,
    coverage:
      "Slope in degrees over the team-chosen Oxia display area, 17.11-19.15 N, 334.60-336.60 E, from a 201 x 205 elevation grid (0.01 degree, about 0.59 km) sampled from the Mars Trek elevation-profile service (MGS MOLA, Global DEM). 26 display tiles, zooms 5-9. Grid: /maps/oxia/elevation-grid.json.",
    limitations:
      "Regional slope from MOLA (~463 m). Small banks, boulders and walking-scale hazards are not resolved. Not a safety assessment. Slope from central differences on a 0.01 degree grid interpolated from MOLA, using Mars 2000 sphere distances (R = 3,396,190 m); steep short slopes are smoothed out, so real local slopes can exceed the mapped class. The >20 degree class marks slopes beyond NASA's 20 degree suited-walking figure: NASA EVA-EXP-0042 Rev B, Exploration EVA System Concept of Operations (Oct 19, 2020), p.38, 'Walking up/down/across a slope of up to 20°' (source oxia-nasa-eva-exp-0042); NASA ICES-2025-129 (Kim et al., funded by the NASA Mars Campaign Office), p.7, treats slopes beyond +/-20 degrees as inaccessible no-go zones (source oxia-nasa-ices-2025-129). That figure is lunar-derived and Mars gravity is higher. In this area 56 of 41,205 cells (18.8 km2, 0.14%) exceed 20 degrees, mostly one patch near 17.21 N, 335.07 E.",
    evidence: "Derived",
    attribution: "NASA MGS MOLA Global DEM · via NASA JPL Mars Trek elevation-profile service",
    rendering: {
      kind: "raster-tiles",
      tiles: ["/maps/oxia/slope-tiles/{z}/{x}/{y}.png"],
      tile_size: 256,
      min_zoom: 5,
      max_zoom: 9,
    },
    default_visible: false,
    default_opacity: 70,
    legend: {
      title:
        "Regional slope from MOLA (~463 m). Not a safety assessment.",
      units: "degrees",
      items: [
        { label: "0-2", color: "#FFFFCC" },
        { label: "2-5", color: "#FED976" },
        { label: "5-10", color: "#FD8D3C" },
        { label: "10-20", color: "#E31A1C" },
        {
          label:
            ">20°: beyond NASA's 20° suited-walking limit (lunar-derived; Mars gravity is higher). Regional MOLA slope (~463 m), so small steep features are not resolved. Not a safety assessment.",
          color: "#800026",
        },
      ],
    },
  },
  {
    id: "oxia-geology",
    type: "Geology & mineralogy",
    display_name: "Mineral detections",
    kind: "geology",
    availability: "available",
    source_id: "oxia-trek-aqueous",
    observation_date: null,
    spatial_resolution_m: null,
    coverage:
      "6 unique detection points inside the team-chosen Oxia display area (17.11-19.15 N, 334.60-336.60 E) from two Mars Trek layers: Aqueous Mineral Distribution (3 phyllosilicate, 1 silica; source oxia-trek-aqueous) and Hydrous Mineral Detections (2 CRISM hydrous; source oxia-trek-hydrous). Asset /maps/oxia/mineral-detections.geojson built by team/oxia/geology/build_detections.mjs.",
    limitations:
      "Detection points are approximate (two-decimal degrees, about 0.6 km) and are not mapped unit boundaries or outcrop outlines. All classes share one colour because the shared renderer draws circles in a single colour; each point keeps its class, source, citation and Mars Trek feature IDs as GeoJSON properties. Published spectral interpretations from global compilations, not field-verified; no abundance, layering or depth information.",
    evidence: "Interpreted",
    attribution:
      "Mars Trek Aqueous Mineral Distribution (Ehlmann & Edwards 2014) and Hydrous Mineral Detections (Carter et al. 2013) · via NASA JPL Mars Trek",
    rendering: {
      kind: "geojson",
      url: "/maps/oxia/mineral-detections.geojson",
      geometry: "circle",
      color: "#5FD39A",
    },
    default_visible: false,
    default_opacity: 90,
    legend: {
      title:
        "Mineral detections (approximate points, ~0.6 km; not unit boundaries). All classes in one colour.",
      units: null,
      items: [
        {
          label: "Phyllosilicate (clay), silica or hydrous mineral detection",
          color: "#5FD39A",
        },
      ],
    },
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
