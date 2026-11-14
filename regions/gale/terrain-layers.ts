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
  spatial_resolution_m: 30,
  coverage: "Gale HRSC 30 m DTM mosaic (Persaud et al., 2021) covering 100% of the Gale overview exploration footprint (137.344..137.458 E, -4.822..-4.581 N). 158,013 valid analysis cells; outside footprint transparent. CTX alignment is unverified locally: do not match fine features between these products.",
  limitations: "30 m grid spacing derived from HRSC stereo images H1938_0000, H1927_0000, and H1916_0000 tied to HRSC-MOLA 200 m global DTM. Heights in metres above MOLA areoid. Co-registration against CTX mosaic unverified; not for hazard routing or astronaut safety certification.",
  evidence: "Derived",
  attribution: "ESA / DLR / Freie Universität Berlin / NASA / JPL-Caltech · Persaud et al. (2021) · Marswalk DEM derivatives",
  default_visible: false,
  default_opacity: 100,
} as const;

const regionalRendering = (kind: string) => ({
  kind: "raster-tiles" as const,
  tiles: [`/maps/gale/terrain-regional/${kind}/{z}/{x}/{y}.png`],
  tile_size: 256 as const,
  min_zoom: 5,
  max_zoom: 13,
  bounds: regionalExtent,
  resampling: "nearest" as const,
});

// --- Global HRSC-MOLA 200 m Fallback ---
const globalCommon = {
  kind: "topography",
  availability: "available",
  source_id: "gale-usgs-200m",
  observation_date: null,
  spatial_resolution_m: 200,
  coverage: "USGS HRSC-MOLA Blended DEM Global 200m v2 (Fergason et al., 2018) providing continuous regional elevation fallback across the entire Gale Crater footprint. 100% real-data coverage of the configured overview means valid source-grid support; outside transparent. Nearest-neighbor display resampling repeats source cells, not independent observations. CTX/color alignment remains unverified.",
  limitations: "200 m grid spacing blending Mars Express HRSC and MGS MOLA elevation observations. 600 m gradient support; absolute positional and slope uncertainty unmeasured. Coarse regional baseline; small rocks, boulders, and local rover/suit hazards are completely unresolved. Not for astronaut hazard or safety routing.",
  evidence: "Derived",
  attribution: "USGS Astrogeology Science Center · NASA / ESA · Fergason et al. (2018) · Marswalk DEM derivatives",
  default_visible: false,
  default_opacity: 100,
} as const;

const globalRendering = (kind: string) => ({
  kind: "raster-tiles" as const,
  tiles: [`/maps/gale/terrain-global/${kind}/{z}/{x}/{y}.png`],
  tile_size: 256 as const,
  min_zoom: 5,
  max_zoom: 13,
  bounds: globalExtent,
  resampling: "nearest" as const,
});

export const terrainLayers = [
  // --- Regional HRSC 30 m Layers ---
  {
    ...regionalCommon,
    id: "gale-regional-elevation",
    type: "Elevation",
    display_name: "Regional HRSC elevation",
    rendering: regionalRendering("elevation"),
    legend: {
      title: "Regional elevation · 30 m grid · CTX alignment unverified",
      units: "m relative to MOLA areoid, positive up",
      items: [
        { label: "Below −4400 m", color: "#425A78", description: "Lowest elevation class; elevation does not identify geological materials." },
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
    rendering: regionalRendering("slope"),
    legend: {
      title: "Regional slope · 30 m grid · CTX alignment unverified",
      units: "degrees (°), not safety classes",
      items: [
        { label: "0 to < 5°", color: "#526B82", description: "Horn 3×3 derivative; Mars metre spacing, east distance corrected by cos(planetocentric latitude)." },
        { label: "5 to < 10°", color: "#71989E" },
        { label: "10 to < 15°", color: "#AAA7BD" },
        { label: "15 to < 20°", color: "#B49A88" },
        { label: "20° and above", color: "#C9BDA0", description: "Classes describe this DEM representation only. Small obstacles and hazards are unresolved. No astronaut safety threshold is assigned." },
      ],
    },
  },

  // --- Global HRSC-MOLA 200 m Fallback Layers ---
  {
    ...globalCommon,
    id: "gale-global-elevation",
    type: "Elevation",
    display_name: "Global HRSC–MOLA elevation",
    rendering: globalRendering("elevation"),
    legend: {
      title: "Global elevation · 200 m grid · CTX alignment unverified",
      units: "m relative to MOLA areoid, positive up",
      items: [
        { label: "Below −4400 m", color: "#425A78" },
        { label: "−4400 to < −4200 m", color: "#587E91" },
        { label: "−4200 to < −3900 m", color: "#87A39D" },
        { label: "−3900 to < −3500 m", color: "#BCB29C" },
        { label: "−3500 m and above", color: "#C8A97E" },
      ],
    },
  },
  {
    ...globalCommon,
    id: "gale-global-hillshade",
    type: "Hillshade",
    display_name: "Global HRSC–MOLA hillshade",
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
    rendering: globalRendering("slope"),
    legend: {
      title: "Global slope · 200 m grid · CTX alignment unverified",
      units: "degrees (°), not safety classes",
      items: [
        { label: "0 to < 5°", color: "#526B82" },
        { label: "5 to < 10°", color: "#71989E" },
        { label: "10 to < 15°", color: "#AAA7BD" },
        { label: "15 to < 20°", color: "#B49A88" },
        { label: "20° and above", color: "#C9BDA0", description: "Broad 200 m slope only; suit-scale hazards completely unresolved." },
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
