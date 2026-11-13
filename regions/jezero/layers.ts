import type { ScientificLayer } from "@/lib/contracts/region";

// Region-owned content. Pending values are deliberately explicit.
// The recorded traverse (observed overlay) and the CTX basemap (observed
// optical imagery, self-hosted derived tiles) are the integrated products;
// see config display_transform notes for both derivations.
export const layers = [
  {
    id: "jezero-optical",
    type: "Optical imagery",
    display_name: "CTX basemap",
    kind: "optical",
    availability: "available",
    source_id: "jezero-ctx-esri",
    observation_date: null,
    spatial_resolution_m: 5,
    coverage:
      "Murray Lab CTX global mosaic (beta01) over the Jezero exploration area: derived display tiles cover 77.137-77.543 E, 18.352-18.570 N (Web-Mercator XYZ, zooms 5-14), from the equirectangular source service.",
    limitations:
      "Uncontrolled beta mosaic (seams, varying illumination between orbits; not radiometrically calibrated). Display-grade: tiles nearest-neighbour resampled from the service's equirectangular grid by team/jezero/basemap/prepare_ctx_basemap.mjs; a small area samples a coarser level where the service serves corrupt tiles (~20 source tiles). Imagery basemap only - not a DEM, not geology and not terrain-safety evidence. Alignment shares the region display-transform caveats (planetocentric latitude; the mosaic's Mars_2000_Sphere datum makes geodetic == planetocentric there).",
    evidence: "Observed",
    attribution:
      "NASA/JPL/MSSS · Caltech Murray Lab CTX global mosaic (beta01) · tiled service hosted by Esri",
    rendering: {
      kind: "raster-tiles",
      tiles: ["/maps/jezero/ctx-tiles/{z}/{x}/{y}.png"],
      tile_size: 256,
      min_zoom: 5,
      max_zoom: 14,
    },
    default_visible: true,
    default_opacity: 100,
    legend: null,
  },
  {
    id: "jezero-terrain",
    type: "Terrain & slope",
    display_name: "Terrain & slope",
    kind: "topography",
    availability: "available",
    source_id: "jezero-usgs-trn-dtm",
    observation_date: null,
    spatial_resolution_m: 1,
    coverage:
      "USGS Mars 2020 TRN HiRISE DTM mosaic (JEZ_hirise_soc_006, 1 m/px, DOI 10.5066/P9REJ9JN) over the Jezero exploration area: derived shaded-elevation display tiles cover 77.2229-77.4931 E, 18.4020-18.5197 N (Web-Mercator XYZ, zooms 5-14, 120 RGBA tiles). Pixels outside the DTM footprint - including the supported extent's west margin, 77.1868-77.2229 E - are transparent (no terrain data there).",
    limitations:
      "Display-grade shaded elevation (hypsometric tint x analytic hillshade, sun 315 deg az / 45 deg alt, derived by team/jezero/terrain/build_terrain.mjs from the audited 1 m DTM), NOT the native 1 m posts and NOT a route-safety, hazard or engineering product. Vertical datum: areoid-relative meters, verified against the PLACES traverse (median DTM-PLACES offset +0.025 m, abs P95 4.3 m, 30,445 matched points; team/jezero/terrain/audit_terrain.mjs - all checks pass). Documented caveats: the far-west Jezero_CR stereo component (USGS-documented uncompensated y-parallax) carries a small positive bias (~+3 m mean, abs P95 ~4.9 m in the traverse bins crossing it); the FGDC published value range is understated - sampled values to -1639.971 m are real western-rim terrain confirmed by rover ground truth (PLACES sol 1354: -1786.0 m at 18.4575 N, 77.2685 E, matched within ~5 m). Ramp saturates at -2620/-1770 m (p2-p98 of the coverage); the display shares the region display-transform caveats (planetocentric display latitude on Web Mercator, pending the PPPCS ellipsoid review).",
    evidence: "Observed",
    attribution:
      "USGS Astrogeology Science Center · NASA/MRO HiRISE · Mars 2020 TRN DTM mosaic (DOI 10.5066/P9REJ9JN)",
    rendering: {
      kind: "raster-tiles",
      tiles: ["/maps/jezero/terrain-tiles/{z}/{x}/{y}.png"],
      tile_size: 256,
      min_zoom: 5,
      max_zoom: 14,
    },
    default_visible: false,
    default_opacity: 70,
    legend: {
      title: "Elevation (MOLA areoid-relative, hillshaded)",
      units: "m",
      items: [
        { label: "-2620 to -2400", color: "#5081b5" },
        { label: "-2400 to -2200", color: "#8dafa2" },
        { label: "-2200 to -2000", color: "#cec390" },
        { label: "-2000 to -1850", color: "#e7d6ac" },
        { label: "-1850 to -1770", color: "#f4e9d3" },
      ],
    },
  },
  {
    id: "jezero-geology",
    type: "Geology & mineralogy",
    display_name: "Geology & mineralogy",
    kind: "geology",
    availability: "pending",
    source_id: null,
    observation_date: null,
    spatial_resolution_m: null,
    coverage: null,
    limitations:
      "No Jezero geological map or CRISM-derived product has been registered yet (a USGS Jezero geologic map and other published maps remain to be located and verified). Requires published map products, classification legends, coverage verification and source registration before review.",
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
    id: "jezero-traverse-recorded",
    type: "Recorded rover traverse",
    display_name: "Recorded rover traverse",
    kind: "overlay",
    availability: "available",
    source_id: "jezero-m2020-places",
    observation_date: "2021-02-18/2026-06-21",
    spatial_resolution_m: null,
    coverage:
      "Perseverance recorded traverse, sols 0-1897 (PLACES release 16), Jezero Crater exploration area; 77.217-77.463 E, 18.422-18.500 N (planetocentric). Approximate recorded path 42.785 km.",
    limitations:
      "Recorded rover traverse, not an astronaut route and not terrain-safety evidence. Display-grade pending basemap-alignment review (product planetodetic column defective; see region display_transform notes), not survey-grade. Localization accuracy per the Rover PLACES SIS. Display vertices thinned to ~10 m spacing; no slope/terrain information is implied.",
    evidence: "Observed",
    attribution:
      "NASA/JPL-Caltech · Mars 2020 Rover PLACES Bundle, PDS Geosciences Node (urn-nasa-pds-mars2020_rover_places, release 16)",
    rendering: {
      kind: "geojson",
      url: "/maps/jezero/perseverance-traverse.geojson",
      geometry: "line",
      color: "#D6DEE8",
    },
    default_visible: true,
    default_opacity: 90,
    legend: {
      title: "Recorded Perseverance traverse",
      units: null,
      items: [
        {
          label: "Recorded rover traverse (sols 0-1897, PLACES release 16)",
          color: "#D6DEE8",
        },
      ],
    },
  },
] satisfies ScientificLayer[];
