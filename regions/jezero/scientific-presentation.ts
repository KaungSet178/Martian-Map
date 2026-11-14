/** Region-owned integration metadata. Existing ScientificLayer remains the renderer contract.
 * Verification dimensions do not confer routing eligibility. Bounds are envelopes;
 * validity comes from raster alpha/native mask, never from these rectangles.
 */
import { layers } from "./layers";
import terrainSummary from "./terrain-summary.json";

type Verification = "VERIFIED" | "UNVERIFIED" | "NOT_EVALUATED" | "INVALID";
const verification = (source: Verification, processing: Verification, registration: Verification) =>
  ({ source, processing, registration });
export const missionExtent = [77.186786, 18.401964, 77.493133, 18.519663] as const;
export const demExtent = [77.22293307697142, 18.306799449686565, 77.58396402093508, 18.669315006877746] as const;
export const basemapSourceExtent = [77.16046545922367, 18.2110273909634, 77.69917761355299, 18.7211944818728] as const;

export const scientificPresentation = [
  {
    category: "Elevation", dataset_id: "jezero-elevation", quantity: "Areoid-relative terrain elevation",
    units: "m", native_posting_m: 1, recommended_opacity: 60,
    source_extent: demExtent, application_tiles: "team/jezero/terrain/build_report.json#tile_ranges",
    coverage_geometry: "team/jezero/terrain/elevation-display-footprint.geojson",
    valid_mask: "Native DEM nodata; legacy output alpha. Existing tiles include tile-range margins, not a hard mission clip.",
    range_evidence: "team/jezero/terrain/hillshade_report.json#source_exact_range_m",
    native_range_m: terrainSummary.source_exact_range_m,
    mission_native_range_m: terrainSummary.mission_exact_range_m,
    numeric_range: "Use exact native/mission extrema in hillshade_report.json; legacy audit extrema were sampled, not global minima/maxima.",
    verification: verification("VERIFIED", "UNVERIFIED", "UNVERIFIED"),
    interpretation: "Elevation describes terrain height relative to the stated vertical reference. It helps identify topographic differences but does not independently establish route safety.",
    limitations: "Preserved shaded tint has incorrect Earth gradient spacing and flat-ground illumination. Native numeric elevations unchanged. Vertical reference is supported by historical PLACES height agreement; this is not independent absolute horizontal control.",
    proposed_ramp: [[0, "#617f8d"], [.25, "#719c94"], [.5, "#c7b995"], [.75, "#b38c52"], [1, "#8d5e48"]],
    ramp_status: "Proposed numeric sequential ramp for integration; existing gamma .75 shaded tiles retained. Legend lists actual legacy pre-shading ramp anchors; shading multiplies colors by 0.65..1.",
  },
  {
    category: "Hillshade", dataset_id: "jezero-hillshade", quantity: "Artificial Lambertian illumination intensity",
    units: null, native_posting_m: 1, recommended_opacity: 45,
    source_extent: demExtent, application_tiles: "team/jezero/terrain/hillshade_report.json#tile_ranges",
    coverage_geometry: "team/jezero/terrain/hillshade-display-footprint.geojson",
    source_valid_geometry: "team/jezero/terrain/dem-valid-footprint.geojson",
    valid_mask: "Strict center and four cardinal bilinear supports; native source nodata boundaries eroded, no extrapolation. PNG alpha is authoritative at each zoom.",
    verification: verification("VERIFIED", "VERIFIED", "UNVERIFIED"),
    interpretation: "Hillshade uses artificial illumination derived from elevation data to reveal terrain shape. It does not represent actual sunlight, surface temperature, or terrain safety.",
    illumination: { azimuth_deg: 315, elevation_deg: 45, gradient_baseline_m: 2 },
    limitations: "Full source envelope tiled; camera remains mission-limited. No cast shadows or coarse-zoom anti-alias averaging. Strict nodata support can remove narrow valid islands.",
  },
  {
    category: "Slope", dataset_id: "jezero-slope", quantity: "Local display-grid terrain gradient angle",
    units: "deg", native_posting_m: 1, recommended_opacity: 60,
    source_extent: demExtent, application_tiles: "team/jezero/terrain/slope_report.json#tile_ranges",
    coverage_geometry: "team/jezero/terrain/slope-display-footprint.geojson",
    valid_mask: "Legacy alpha retained; invalid cardinal neighbors replaced with center elevation by legacy generator, potentially flattening edges.",
    verification: verification("VERIFIED", "UNVERIFIED", "UNVERIFIED"),
    interpretation: "Slope measures local terrain steepness in degrees. Higher values indicate steeper terrain, but slope alone does not determine astronaut traversability.",
    limitations: "Display-dependent central differences, ~4.825m at z14 / ~9.65m at z13 / ~2470m at z5 at 18.46N. Existing source indexing lacks pixel-center -0.5. No numeric changes; color saturates at 35deg while sampled slopes reach 54.4deg.",
    proposed_display_intervals_deg: [0, 5, 10, 15, 20],
    proposed_colors: ["#719c94", "#ddd09b", "#da9857", "#bd703f", "#974e3f"],
    ramp_status: "Proposed intervals deferred: legacy pixels are continuous interpolation at 0/3.5/8.75/17.5/26.25/35deg; current legend corrected to those exact anchors.",
  },
  {
    category: "Thermal", dataset_id: "jezero-thermal", quantity: "Relative daytime infrared mosaic brightness (qualitative)",
    units: null, native_posting_m: 100, recommended_opacity: 60,
    source_extent: null, application_tiles: "team/jezero/basemap/thermal_report.json#tile_ranges",
    coverage_geometry: "team/jezero/terrain/thermal-display-footprint.geojson",
    valid_mask: "All seven existing output tiles opaque per baseline report; rectangular tile coverage exceeds mission viewport. Full original mosaic valid footprint not authenticated.",
    verification: verification("UNVERIFIED", "UNVERIFIED", "UNVERIFIED"),
    interpretation: "Relative daytime infrared brightness reveals qualitative image contrast. It is not calibrated surface temperature or thermal inertia.",
    product: "THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018",
    mission_instrument: "Mars Odyssey / THEMIS", observation_context: "Daytime controlled multi-observation mosaic; October 2018 product version, not a single acquisition date",
    limitations: "No verified radiometric scaling or Kelvin legend. ~100m native posting; z9 display sampling ~154m at 18.46N; renderer enlarges the z9 pixels above z9. Preserve bytes and qualitative grayscale. Source sphere and individual observation metadata need follow-up.",
  },
] as const;

// Stable renderer records, in the required four-category order. Basemap,
// deferred geology and traverse are intentionally outside this category index.
export const scientificLayers = scientificPresentation.map((item) => {
  const layer = layers.find((layer) => layer.id === item.dataset_id);
  if (!layer) throw new Error(`Missing Jezero scientific layer ${item.dataset_id}`);
  return layer;
});
