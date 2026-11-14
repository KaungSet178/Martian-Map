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
    // Off by default: the colorized CTX below is the default basemap.
    default_visible: false,
    default_opacity: 100,
    legend: null,
  },
  {
    id: "oxia-optical-color",
    type: "Optical imagery",
    display_name: "CTX colorized (Viking color)",
    kind: "optical",
    availability: "available",
    source_id: "oxia-viking-color-trek",
    observation_date: null,
    spatial_resolution_m: 5,
    coverage:
      "Same area and zooms as the CTX basemap (17.11-19.15 N, 334.60-336.60 E; 841 tiles, z5-12, JPEG). Brightness and detail from the Mars Trek CTX tiles (source oxia-ctx-trek); colour from the Mars Trek Viking global colour mosaic (source oxia-viking-color-trek, levels 4-7).",
    limitations:
      "Pan-sharpened display: brightness and detail from CTX (~5 m), colour from the Viking global colour mosaic (~232 m). Colour is approximate and regional, not true colour at CTX scale. Not for mineral identification. Method: YCbCr luminance swap (CTX gray as luminance, Viking chroma sampled bilinearly and scaled to 0.8 saturation), no other radiometric adjustment; built by team/oxia/basemap/prepare_ctx_color.py. Inherits the CTX limitations (uncontrolled beta mosaic, seams, display-grade, no HiRISE registration check). Lossy JPEG tiles.",
    evidence: "Derived",
    attribution:
      "NASA/JPL/MSSS · Caltech Murray Lab CTX global mosaic (beta01) + NASA Viking Orbiter MDIM 2.1 colour mosaic · via NASA JPL Mars Trek",
    rendering: {
      kind: "raster-tiles",
      tiles: ["/maps/oxia/ctx-color-tiles/{z}/{x}/{y}.jpg"],
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
      "Regional relief only, 200 m per pixel. Not for walking-scale slope or safety. Detail varies: sharp where Mars Express HRSC stereo elevation exists (e.g. the south-east of the area), smoother where only MOLA (~463 m) is available (much of the centre). A per-tile edge check at zoom 9 found smooth tiles across roughly 17.98-19.15 N, 334.60-336.09 E (including the area around the Clay-rich bedrock study target) and crisp tiles south of about 18 N and east of about 336.1 E; Mars Trek does not state which input each pixel comes from, so this is an inference from the image. Tiles end at zoom 9; closer zooms enlarge them. Shaded relief image with no elevation or slope values; boulders, small craters and steep local slopes are not resolved. Illumination direction is not stated by Mars Trek. Display-grade, nearest-neighbour resampled from Mars Trek JPEG tiles (lossy compression). No routing or hazard use.",
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
    id: "oxia-elevation",
    type: "Terrain & slope",
    display_name: "Elevation (MOLA)",
    kind: "topography",
    availability: "available",
    source_id: "oxia-trek-elevation-profile",
    observation_date: null,
    spatial_resolution_m: 463,
    coverage:
      "MOLA elevations over the team-chosen Oxia display area, 17.11-19.15 N, 334.60-336.60 E, from the 201 x 205 elevation grid (/maps/oxia/elevation-grid.json): range -3791 to -2381 m. 26 display tiles, zooms 5-9, built by team/oxia/terrain/build_elevation_tiles.mjs.",
    limitations:
      "Regional (~463 m MOLA detail). Not for walking-scale terrain. MOLA only across the whole area: the sharper HRSC-derived detail seen in parts of the hillshade is not in this layer. Tiles end at zoom 9; closer zooms enlarge them. Values are MGS MOLA heights as returned by the Mars Trek elevation-profile service, interpolated by that service onto a 0.01 degree grid (about 0.59 km); the service does not state its interpolation method. Plain colour by height class (100 m steps, open-ended outer classes covering -3791 to -2381 m); no shading. Not a slope or safety assessment.",
    evidence: "Observed",
    attribution: "NASA MGS MOLA Global DEM · via NASA JPL Mars Trek elevation-profile service",
    rendering: {
      kind: "raster-tiles",
      tiles: ["/maps/oxia/elevation-tiles/{z}/{x}/{y}.png"],
      tile_size: 256,
      min_zoom: 5,
      max_zoom: 9,
    },
    default_visible: false,
    default_opacity: 70,
    legend: {
      title: "Elevation (MOLA, m, relative to the Mars areoid)",
      units: "m",
      items: [
        { label: "below -3100 (lowest -3791)", color: "#5081B5" },
        { label: "-3100 to -3000", color: "#8DAFA2" },
        { label: "-3000 to -2900", color: "#CEC390" },
        { label: "-2900 to -2800", color: "#E7D6AC" },
        { label: "-2800 and above (highest -2381)", color: "#F4E9D3" },
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
      "Regional slope from MOLA (~463 m). Small banks, boulders and walking-scale hazards are not resolved. Not a safety assessment. MOLA only across the whole area: the sharper HRSC-derived detail seen in parts of the hillshade is not in this layer. Tiles end at zoom 9; closer zooms enlarge them. Slope from central differences on a 0.01 degree grid interpolated from MOLA, using Mars 2000 sphere distances (R = 3,396,190 m); steep short slopes are smoothed out, so real local slopes can exceed the mapped class. The >20 degree class marks slopes beyond NASA's 20 degree suited-walking figure: NASA EVA-EXP-0042 Rev B, Exploration EVA System Concept of Operations (Oct 19, 2020), p.38, 'Walking up/down/across a slope of up to 20°' (source oxia-nasa-eva-exp-0042); NASA ICES-2025-129 (Kim et al., funded by the NASA Mars Campaign Office), p.7, treats slopes beyond +/-20 degrees as inaccessible no-go zones (source oxia-nasa-ices-2025-129). That figure is lunar-derived and Mars gravity is higher. In this area 56 of 41,205 cells (18.8 km2, 0.14%) exceed 20 degrees, mostly one patch near 17.21 N, 335.07 E.",
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
            ">20 degrees: regional numerical slope class. MOLA (~463 m) does not resolve small steep features. Not an astronaut safety threshold.",
          color: "#800026",
        },
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
      "No geology or mineralogy map layer is shown for Oxia (removed by the region owner). Mars Trek mineral-detection points are used only to locate the science targets (sources oxia-trek-aqueous and oxia-trek-hydrous), not drawn as a layer. No mapped geologic units are integrated.",
    evidence: "Unavailable",
    attribution: null,
    rendering: {
      kind: "unavailable",
      reason:
        "Removed by the region owner; no geology or mineralogy map layer is integrated for Oxia.",
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
      "Mars Trek THEMIS night-IR global mosaic over the team-chosen Oxia display area, 17.11-19.15 N, 334.60-336.60 E: 75 derived display tiles, Web-Mercator XYZ, zooms 5-10 (source level 9, about 81 m per pixel), coloured with an inferno display ramp. No gaps in this area.",
    limitations:
      "Relative brightness only: the 8-bit mosaic values are not calibrated temperatures and are not thermal-inertia values. Observation period not stated by Mars Trek (the 'oct2018' in the layer name refers to the 2018 mosaic release). Night-time brightness mainly reflects thermal inertia (brighter = holds heat, e.g. rock or indurated surfaces; darker = loose sand or dust), but it can also vary with season, local time and dust. Mosaic of many orbits with stretched brightness between images, so strip-to-strip seams can appear. Colours are a display ramp (matplotlib 'inferno') applied to the uncalibrated 8-bit values; they do not mark temperature or thermal-inertia thresholds. Display-grade, nearest-neighbour resampled; not terrain-safety evidence.",
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
      title:
        "Night-time IR brightness (relative, not °C or K). Display colour ramp on uncalibrated 8-bit values.",
      units: null,
      items: [
        {
          label: "Yellow: brightest, holds heat at night (likely rock or firm ground)",
          color: "#F4E156",
        },
        { label: "Orange", color: "#F98B0B" },
        { label: "Red-pink: middle", color: "#BC3754" },
        { label: "Purple", color: "#61136E" },
        {
          label: "Dark purple: darkest, cools fast at night (likely loose sand or dust)",
          color: "#1E0C45",
        },
      ],
    },
  },
] satisfies ScientificLayer[];
