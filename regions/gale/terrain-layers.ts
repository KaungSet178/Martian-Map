import type { ScientificLayer } from "@/lib/contracts/region";

// Published PDS coordinates, never shifted to fit the optical basemap.
export const demExtent = {
  west_east: 137.37111842010495,
  south_latitude: -4.737705748385843,
  east_east: 137.38798902496305,
  north_latitude: -4.7208351435277285,
};

// Regional HRSC 30 m DTM mosaic bounds (Persaud et al., 2021)
export const regionalExtent = {
  west_east: 137.32743882663516,
  south_latitude: -4.838798324880672,
  east_east: 137.47471920704652,
  north_latitude: -4.563976171741976,
};

// Global HRSC-MOLA 200 m blended DEM fallback bounds (Fergason et al., 2018)
export const globalExtent = {
  west_east: 137.09987566364117,
  south_latitude: -5.096221490785939,
  east_east: 137.69709505066461,
  north_latitude: -4.299928974754662,
};

// Mission View presentation bounds: reviewed PDS orbital-map optical overview footprint (~96.26 km²).
// Restricting raster-tiles display bounds to this extent prevents oversized overlay bleeding.
export const missionViewExtent = {
  west_east: 137.3442352329006,
  east_east: 137.4579431096443,
  south_latitude: -4.822361175063087,
  north_latitude: -4.580605407446296,
};

// Thermal THEMIS v2 controlled mosaic footprint for Gale Crater
export const thermalExtent = {
  west_east: 137.327439,
  east_east: 137.474719,
  south_latitude: -4.838798,
  north_latitude: -4.563976,
};

// Presentation modes metadata for shared integration
export const galeCoverageModes = {
  missionView: {
    id: "mission_view",
    name: "Mission View (Default)",
    description: "Restricts scientific raster overlay presentation to the reviewed optical basemap footprint (~96.26 km²), preventing visual overflow beyond imagery.",
    bounds: missionViewExtent,
  },
  fullCoverageRegional: {
    id: "full_coverage_regional",
    name: "Full Regional Data Coverage",
    description: "Displays complete valid HRSC 30 m derived terrain extent (141.73 km²), extending ~1 km beyond optical overview.",
    bounds: regionalExtent,
    coverage_layer_id: "gale-coverage-regional",
  },
  fullCoverageGlobal: {
    id: "full_coverage_global",
    name: "Full Global-Derived Data Coverage",
    description: "Displays complete valid HRSC-MOLA 200 m local crop extent (1,665.25 km²).",
    bounds: globalExtent,
    coverage_layer_id: "gale-coverage-global",
  },
};

// --- Local PDS DEM (1 m native, 25 m analysis) ---
const localCommon = {
  kind: "topography",
  availability: "available",
  source_id: "gale-pds-dem-subset",
  observation_date: null,
  spatial_resolution_m: 25,
  coverage: "Audited 1 km projected square in the historical Curiosity corridor, 137.371118..137.387989 E, -4.737706..-4.720835 N. 1,600 valid analysis cells; outside is unaudited and transparent. Toggling preserves the current camera. CTX alignment is unverified locally: do not match fine features between these products.",
  limitations: "25 m complete-post averages with 75 m gradient support; these are processing scales, not guaranteed effective resolution. Native PDS grid 1 m, mixed HiRISE/CTX lineage without per-pixel quality. Heights in metres above the MOLA areoid. Absolute horizontal/vertical accuracy and slope error unquantified. Local orthophoto/CTX comparison indicates a possible positional mismatch; no fitted shift applied. Full-opacity independent DEM view by default. Slope alone is not astronaut safety, hazards or routing evidence.",
  evidence: "Derived",
  attribution: "NASA/JPL-Caltech · PDS PLACES v42.0 · USGS / HiRISE / CTX · Marswalk DEM derivatives",
  default_visible: false,
  default_opacity: 100,
} as const;

const localRendering = (kind: string) => ({
  kind: "raster-tiles" as const,
  tiles: [`/maps/gale/dem/${kind}/{z}/{x}/{y}.png`],
  tile_size: 256 as const,
  min_zoom: 5,
  max_zoom: 14,
  bounds: demExtent,
  resampling: "nearest" as const,
});

// --- Regional HRSC 30 m DTM ---
const regionalCommon = {
  kind: "topography",
  availability: "available",
  source_id: "gale-hrsc-30m",
  observation_date: null,
  spatial_resolution_m: 30, // Legacy contract field; UI describes posting explicitly.
  data_details: {
    source_product: "hrsc_km09_h1938_h1927_h1916-dtm-mosaic.tif · DOI 10.5281/zenodo.5808354",
    source_coverage: "Original HRSC mosaic: 135.890569–139.728969° E, −8.184239–−2.983875° N; valid source coverage is irregular.",
    display_crop: "Selected 291 × 543 grid, about 8.70 × 16.29 km (141.733079 km²). Intentionally extends about 1 km beyond the fixed 96.259148 km² optical overview. Mission View bounds restrict default display to mission footprint.",
    valid_coverage: "All 158,013 derived cells valid; fully valid rectangular crop covering 100% of the Gale overview. Outside this crop is unavailable and transparent.",
    nominal_posting_m: 30,
    gradient_support_north_m: 90,
    crs: "Mars sphere R=3,396,190 m; equirectangular, standard parallel/central meridian 0; planetocentric latitude, east longitude. Heights relative to MOLA areoid. Source datum name is unspecified.",
  },
  coverage: "Regional crop from the broader HRSC source mosaic: 8.70 × 16.29 km, 141.733079 km². Fully valid crop covers 100% of the Gale overview and intentionally extends beyond the fixed optical overview. Outside crop transparent. CTX alignment unverified.",
  limitations: "30 m nominal posting and 90 m north gradient support for derivatives; neither establishes effective resolution or absolute accuracy. Derived from HRSC stereo images H1938_0000, H1927_0000, and H1916_0000 tied to HRSC-MOLA 200 m global DTM. Heights in metres above MOLA areoid. Co-registration against CTX mosaic unverified; not for hazard routing or astronaut safety certification.",
  evidence: "Derived",
  attribution: "ESA / DLR / Freie Universität Berlin / NASA / JPL-Caltech · Divya M. Persaud / Alfiah Diana Rizky Putri / Jan-Peter Muller (2021), DOI 10.5281/zenodo.5808354 · Marswalk DEM derivatives",
  default_visible: false,
} as const;

const regionalRendering = (kind: string) => ({
  kind: "raster-tiles" as const,
  tiles: [`/maps/gale/terrain-regional/${kind}/{z}/{x}/{y}.png`],
  tile_size: 256 as const,
  min_zoom: 5,
  max_zoom: 13,
  bounds: missionViewExtent,
  resampling: "nearest" as const,
});

// --- Global HRSC-MOLA 200 m Fallback ---
const globalCommon = {
  kind: "topography",
  availability: "available",
  source_id: "gale-usgs-200m",
  observation_date: null,
  spatial_resolution_m: 200, // Nominal posting, not measured effective resolution.
  data_details: {
    source_product: "Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif · Fergason et al. (2018)",
    source_coverage: "Original product is near-global on a Mars spherical geographic grid. Complete global valid-data mask not inspected; local subset validity verified.",
    display_crop: "Localized Gale-area crop: 177 × 236 cells, about 35.28 × 47.20 km (1,665.252534 km²). Not a complete Gale Crater map. Mission View bounds restrict default display to mission footprint.",
    valid_coverage: "All 41,772 derived cells valid; fully valid rectangular crop covering 100% of the fixed optical overview. Outside this crop is unavailable and transparent.",
    nominal_posting_m: 200,
    gradient_support_north_m: 600,
    crs: "Mars 2000 sphere R=3,396,190 m; geographic grid, 0.003374120830641° posting, planetocentric latitude and east longitude. Heights relative to MOLA areoid.",
  },
  coverage: "Original source is a global HRSC–MOLA product; Marswalk serves a localized Gale-area crop, about 35.28 × 47.20 km (1,665.252534 km²), not a complete Gale Crater map. All 41,772 derived cells valid; covers the fixed optical overview. Outside crop transparent. CTX/color alignment remains unverified.",
  limitations: "200 m nominal posting blending Mars Express HRSC and MGS MOLA elevation observations. 600 m north gradient support for derivatives. Neither posting nor support establishes effective spatial resolution or absolute accuracy; absolute positional and slope uncertainty unmeasured. Coarse regional baseline; small rocks, boulders, and local rover/suit hazards are completely unresolved. Not for astronaut hazard or safety routing.",
  evidence: "Derived",
  attribution: "USGS Astrogeology Science Center · NASA / ESA · Fergason et al. (2018) · Marswalk DEM derivatives",
  default_visible: false,
} as const;

const globalRendering = (kind: string) => ({
  kind: "raster-tiles" as const,
  tiles: [`/maps/gale/terrain-global/${kind}/{z}/{x}/{y}.png`],
  tile_size: 256 as const,
  min_zoom: 5,
  max_zoom: 13,
  bounds: missionViewExtent,
  resampling: "nearest" as const,
});

export const terrainLayers = [
  // --- Regional HRSC 30 m Layers (Standard 4-Layer Scientific Interface) ---
  {
    ...regionalCommon,
    id: "gale-regional-elevation",
    type: "Elevation",
    display_name: "Regional HRSC elevation",
    default_opacity: 60,
    rendering: regionalRendering("elevation"),
    legend: {
      title: "Regional elevation · 30 m grid · CTX alignment unverified",
      units: "m relative to MOLA areoid, positive up",
      items: [
        { label: "Below −4400 m", color: "#425A78", description: "Lowest elevation class; elevation shows height relative to MOLA areoid but does not independently establish route safety." },
        { label: "−4400 to < −4200 m", color: "#587E91", description: "Lower elevation terrain" },
        { label: "−4200 to < −3900 m", color: "#87A39D", description: "Intermediate elevation terrain" },
        { label: "−3900 to < −3500 m", color: "#BCB29C", description: "Higher elevation terrain" },
        { label: "−3500 m and above", color: "#C8A97E", description: "Highest elevation class in this legend" },
      ],
    },
  },
  {
    ...regionalCommon,
    id: "gale-regional-hillshade",
    type: "Hillshade",
    display_name: "Regional HRSC hillshade",
    default_opacity: 45,
    rendering: regionalRendering("hillshade"),
    legend: {
      title: "Regional artificial illumination · CTX alignment unverified",
      units: "relative illumination, 0–1",
      items: [
        { label: "Dark · 0", color: "#000000", description: "Light from northwest (315° azimuth), 45° altitude. No cast shadows or vertical exaggeration. Not an optical photograph." },
        { label: "Bright · 1", color: "#FFFFFF", description: "Horn gradients on 30 m grid with Mars metric spacing." },
      ],
    },
  },
  {
    ...regionalCommon,
    id: "gale-regional-slope",
    type: "Slope",
    display_name: "Regional HRSC slope · degrees",
    default_opacity: 60,
    rendering: regionalRendering("slope"),
    legend: {
      title: "Regional slope · 30 m grid · CTX alignment unverified",
      units: "degrees (°), not safety classes",
      items: [
        { label: "0 to < 5°", color: "#4E8B7C", description: "Horn 3×3 derivative; Mars metre spacing, east distance corrected by cos(planetocentric latitude)." },
        { label: "5 to < 10°", color: "#D6C875", description: "Gentle-to-moderate slope; small obstacles and roughness may not be represented." },
        { label: "10 to < 15°", color: "#E08E45", description: "Moderate slope; higher values indicate steeper terrain, but slope alone cannot establish astronaut traversability." },
        { label: "15 to < 20°", color: "#C25E2E", description: "Steep terrain; spacesuit and rover mobility depends on surface texture, regolith, and loose rocks." },
        { label: "20° and above", color: "#8C382A", description: "Classes describe this DEM representation only. Small obstacles, roughness, loose material, and other hazards are unresolved. No astronaut safety threshold is assigned." },
      ],
    },
  },

  // --- Gale Authentic Thermal Layer (THEMIS Daytime IR Mosaic v2) ---
  {
    id: "gale-thermal",
    type: "Thermal",
    display_name: "Thermal (THEMIS daytime IR)",
    kind: "thermal",
    availability: "available",
    source_id: "gale-mars-trek-themis",
    observation_date: null,
    spatial_resolution_m: 100,
    data_details: {
      source_product: "THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018 · Edwards et al. (2011), Christensen et al. (2004)",
      source_coverage: "Global THEMIS controlled daytime infrared mosaic v2: near-global coverage between 60°S and 60°N on Mars 2000 Sphere.",
      display_crop: "Gale exploration area: 137.327–137.475° E, −4.839–−4.564° N (zooms 5–9). Mission View presentation bounds restrict display to the optical basemap footprint (~96.26 km²).",
      valid_coverage: "100% valid over the Gale exploration area; no gaps within the observed scene. Relative brightness only.",
      nominal_posting_m: 100,
      gradient_support_north_m: null,
      crs: "Mars 2000 sphere R=3,396,190 m, equirectangular planetocentric latitude and east longitude.",
    },
    coverage: "THEMIS daytime infrared controlled mosaic v2 (Oct 2018, ~100 m/px) over the Gale Crater exploration area: derived display tiles cover 137.327-137.475 E, -4.839--4.564 N (Web-Mercator XYZ, zooms 5-9; above z9 the renderer upsamples the same source).",
    limitations: "Relative daytime infrared brightness only (qualitative): the mosaic ships no verified radiometric scaling, so no temperature, thermal-inertia, rock-abundance or dust-cover values are asserted - the legend deliberately has no units. Daytime IR mixes albedo, surface slopes, and thermophysical properties, so bright/dark patches are not by themselves a compositional or hazard classification. Not a thermal-inertia product: the TES inertia map (3 km/px) is far too coarse for this region and is not used. Display-grade: tiles nearest-neighbour resampled 1:1 from source level L=z-1 by team/gale/prepare_thermal.mjs; the ~100 m source is upsampled above z9. Source alpha is preserved. The display shares the region display-transform caveats (planetocentric display latitude on Web Mercator).",
    evidence: "Observed",
    attribution: "NASA/JPL · Arizona State University · THEMIS daytime IR controlled mosaic v2 · NASA Mars Trek",
    rendering: {
      kind: "raster-tiles",
      tiles: ["/maps/gale/thermal-tiles/{z}/{x}/{y}.png"],
      tile_size: 256,
      min_zoom: 5,
      max_zoom: 9,
      bounds: missionViewExtent,
      resampling: "nearest",
    },
    default_visible: false,
    default_opacity: 60,
    legend: {
      title: "Relative daytime infrared brightness (qualitative)",
      units: null,
      items: [
        { label: "Dark", color: "#1b1b1b", description: "Low daytime infrared brightness; uncalibrated qualitative DN" },
        { label: "Mid-dark", color: "#4d4d4d", description: "Lower-intermediate daytime IR brightness" },
        { label: "Mid", color: "#808080", description: "Intermediate daytime IR brightness" },
        { label: "Mid-bright", color: "#b3b3b3", description: "Higher-intermediate daytime IR brightness" },
        { label: "Bright", color: "#e6e6e6", description: "High daytime infrared brightness; does not indicate heat hazard" },
      ],
    },
  },

  // --- Global HRSC-MOLA 200 m Fallback Layers (Source Variant) ---
  {
    ...globalCommon,
    id: "gale-global-elevation",
    type: "Elevation",
    display_name: "Global HRSC–MOLA elevation",
    default_opacity: 60,
    rendering: globalRendering("elevation"),
    legend: {
      title: "Global elevation · 200 m grid · CTX alignment unverified",
      units: "m relative to MOLA areoid, positive up",
      items: [
        { label: "Below −4400 m", color: "#425A78", description: "Lowest elevation class in global 200 m DEM" },
        { label: "−4400 to < −4200 m", color: "#587E91", description: "Lower elevation terrain" },
        { label: "−4200 to < −3900 m", color: "#87A39D", description: "Intermediate elevation terrain" },
        { label: "−3900 to < −3500 m", color: "#BCB29C", description: "Higher elevation terrain" },
        { label: "−3500 m and above", color: "#C8A97E", description: "Highest elevation class in this legend" },
      ],
    },
  },
  {
    ...globalCommon,
    id: "gale-global-hillshade",
    type: "Hillshade",
    display_name: "Global HRSC–MOLA hillshade",
    default_opacity: 45,
    rendering: globalRendering("hillshade"),
    legend: {
      title: "Global artificial illumination · CTX alignment unverified",
      units: "relative illumination, 0–1",
      items: [
        { label: "Dark · 0", color: "#000000", description: "Light from northwest (315° azimuth), 45° altitude." },
        { label: "Bright · 1", color: "#FFFFFF", description: "Horn gradients on 200 m global grid." },
      ],
    },
  },
  {
    ...globalCommon,
    id: "gale-global-slope",
    type: "Slope",
    display_name: "Global HRSC–MOLA slope · degrees",
    default_opacity: 60,
    rendering: globalRendering("slope"),
    legend: {
      title: "Global slope · 200 m grid · CTX alignment unverified",
      units: "degrees (°), not safety classes",
      items: [
        { label: "0 to < 5°", color: "#4E8B7C", description: "Horn 3×3 derivative on 200 m global grid." },
        { label: "5 to < 10°", color: "#D6C875", description: "Gentle slope on broad 200 m baseline." },
        { label: "10 to < 15°", color: "#E08E45", description: "Moderate slope on broad 200 m baseline." },
        { label: "15 to < 20°", color: "#C25E2E", description: "Steeper slope on broad 200 m baseline." },
        { label: "20° and above", color: "#8C382A", description: "Broad 200 m slope only; suit-scale hazards completely unresolved." },
      ],
    },
  },

  // --- Existing Local PDS DEM (1 m native, 25 m analysis) ---
  {
    ...localCommon,
    id: "gale-terrain",
    type: "Elevation",
    display_name: "Elevation · MOLA areoid",
    rendering: localRendering("elevation"),
    legend: {
      title: "Mean elevation · 25 m grid · CTX alignment unverified",
      units: "m relative to MOLA areoid, positive up",
      items: [
        { label: "Below −4200 m", color: "#425A78" },
        { label: "−4200 to < −4160 m", color: "#587E91" },
        { label: "−4160 to < −4120 m", color: "#87A39D" },
        { label: "−4120 to < −4080 m", color: "#BCB29C" },
        { label: "−4080 m and above", color: "#C8A97E" },
      ],
    },
  },
  {
    ...localCommon,
    id: "gale-hillshade",
    type: "Hillshade",
    display_name: "DEM hillshade",
    rendering: localRendering("hillshade"),
    legend: {
      title: "Artificial illumination · CTX alignment unverified",
      units: "relative illumination, 0–1",
      items: [
        { label: "Dark · 0", color: "#000000", description: "Light from northwest (315° azimuth), 45° altitude. No cast shadows, ambient term or vertical exaggeration. Not a photograph or an acquisition-time lighting model." },
        { label: "Bright · 1", color: "#FFFFFF", description: "Horn gradients on the same 25 m grid / 75 m support as slope; all nine neighboring cells required." },
      ],
    },
  },
  {
    ...localCommon,
    id: "gale-slope",
    type: "Slope",
    display_name: "DEM slope · degrees",
    rendering: localRendering("slope"),
    legend: {
      title: "Slope · 75 m support · CTX alignment unverified",
      units: "degrees (°), not safety classes",
      items: [
        { label: "0 to < 5°", color: "#526B82", description: "Horn 3×3 derivative; Mars metre spacing, east distance corrected by cos(planetocentric latitude). No Earth scale or geodesy." },
        { label: "5 to < 10°", color: "#71989E" },
        { label: "10 to < 15°", color: "#AAA7BD" },
        { label: "15 to < 20°", color: "#B49A88" },
        { label: "20° and above", color: "#C9BDA0", description: "Classes describe this DEM representation only. Small obstacles, roughness, overhangs and hazards are unresolved. No astronaut safety threshold is assigned." },
      ],
    },
  },
] satisfies ScientificLayer[];
