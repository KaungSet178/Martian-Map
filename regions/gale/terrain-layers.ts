import type { ScientificLayer } from "@/lib/contracts/region";

// Published PDS coordinates, never shifted to fit the optical basemap.
export const demExtent = {
  west_east: 137.37111842010495,
  south_latitude: -4.737705748385843,
  east_east: 137.38798902496305,
  north_latitude: -4.7208351435277285,
};
const common = {
  kind: "topography",
  availability: "available",
  source_id: "gale-pds-dem-subset",
  observation_date: null,
  spatial_resolution_m: 25,
  coverage: "Audited 1 km projected square in the historical Curiosity corridor, 137.371118..137.387989 E, -4.737706..-4.720835 N. 1,600 valid analysis cells; outside is unaudited and transparent. Opening fits this subset. CTX alignment is unverified locally: do not match fine features between these products.",
  limitations: "25 m complete-post averages with 75 m gradient support; these are processing scales, not guaranteed effective resolution. Native PDS grid 1 m, mixed HiRISE/CTX lineage without per-pixel quality. Heights in metres above the MOLA areoid. Absolute horizontal/vertical accuracy and slope error unquantified. Local orthophoto/CTX comparison indicates a possible positional mismatch; no fitted shift applied. Full-opacity independent DEM view by default. Slope alone is not astronaut safety, hazards or routing evidence.",
  evidence: "Derived",
  attribution: "NASA/JPL-Caltech · PDS PLACES v42.0 · USGS / HiRISE / CTX · Marswalk DEM derivatives",
  default_visible: false,
  default_opacity: 100,
} as const;
const rendering = (kind: string) => ({
  kind: "raster-tiles" as const,
  tiles: [`/maps/gale/dem/${kind}/{z}/{x}/{y}.png`],
  tile_size: 256 as const,
  min_zoom: 5,
  max_zoom: 14,
  bounds: demExtent,
  focus_extent: demExtent,
  resampling: "nearest" as const,
});
export const terrainLayers = [
  {
    ...common,
    id: "gale-terrain",
    type: "Elevation",
    display_name: "Elevation · MOLA areoid",
    rendering: rendering("elevation"),
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
    ...common,
    id: "gale-hillshade",
    type: "Hillshade",
    display_name: "DEM hillshade",
    rendering: rendering("hillshade"),
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
    ...common,
    id: "gale-slope",
    type: "Slope",
    display_name: "DEM slope · degrees",
    rendering: rendering("slope"),
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
