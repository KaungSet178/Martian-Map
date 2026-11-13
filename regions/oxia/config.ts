import type { RegionConfig } from "@/lib/contracts/region";

// Region-owned content. Pending values are deliberately explicit.
export const config = {
  id: "oxia",
  name: "Oxia Planum",
  mission_context: "Rosalind Franklin · Planned mission area",
  region_status: "planned",
  scientific_context: {
    mission: "ESA · Planned exploration",
    question:
      "Which proposed clay-rich and subsurface targets could illuminate past habitability?",
  },
  coordinate_system: {
    body: "Mars",
    latitude_type: "planetocentric",
    longitude_direction: "east",
    longitude_range: "0-360",
    projected_crs: "pending-source-validation",
    reference_surface:
      "IAU Mars 2000 sphere (D_Mars_2000_Sphere), used by both the CTX mosaic service (GCS_Mars_2000_Sphere) and the Fawdon et al. 2024 Oxia Planum map projection",
    sphere_radius_m: 3396190,
    // No elevation layer is integrated yet, so no vertical datum is asserted.
    vertical_datum: null,
  },
  view_center: {
    latitude: 18.2,
    longitude_east: 335.45,
    status:
      "Projection centre of the published Oxia Planum geological map (Fawdon et al. 2024, section 2.1: equirectangular projection centred at 18.20 N, 335.45 E, matching the ExoMars Rover Operations Control Centre coordinate system). A display centre, not a landing point or target coordinate.",
  },
  map: {
    visualization: {
      status: "available",
      reason:
        "CTX basemap tiles over the published Oxia Planum map area with a documented display transform.",
    },
    initial_zoom: 9,
    supported_extent: {
      west_east: 334.6,
      east_east: 336.6,
      south_latitude: 17.11,
      north_latitude: 19.15,
    },
    display_transform: {
      status: "reviewed",
      method: "mars-geographic-to-maplibre-display",
      source_id: "oxia-ctx-esri",
      notes:
        "Review 2026-11-14, Oxia region owner. EXTENT: the supported extent is the published main map area of Fawdon et al. 2024 (17.11-19.15 N, 334.60-336.60 E; source oxia-fawdon-2024-map), not a landing ellipse. LONGITUDE: Oxia lies above 180 E, so the shared display conversion (lib/map/region-layers.ts: east longitude - 360) gives display longitudes -25.40 to -23.40; team/oxia/basemap/prepare_ctx_basemap.mjs applies the same conversion when sampling. BASEMAP (v2): /maps/oxia/ctx-tiles/ derived from the Murray Lab CTX global mosaic beta01 (Esri tiled service, source oxia-ctx-esri) by team/oxia/basemap/prepare_ctx_basemap.mjs (adapted from the Jezero owner's script): 841 self-hosted 256 px grayscale Web-Mercator XYZ tiles, zooms 5-12, nearest-neighbour from the service's equirectangular grid at level L=z-2, no radiometric processing. Build report team/oxia/basemap/build_report.json: 262 source tiles fetched, 0 missing, 0 output samples without source. LATITUDE: the service GCS is Mars_2000_Sphere (r=3,396,190 m), so geodetic == planetocentric and planetocentric latitude is passed as display latitude; Web Mercator is display math only (MapLibre Earth distances/scale stay forbidden). NOT CHECKED: no independent registration test against HiRISE or the Fawdon map products (the beta01 mosaic is uncontrolled); display-grade only, not survey-grade, not terrain or hazard evidence.",
    },
  },
  data_status: "metadata_verified",
  // v2: CTX basemap integrated (oxia-optical available, evidence Observed).
  // Targets are unchanged and still have no coordinates; routing stays off.
  dataset_version: "oxia-ctx-v2",
  routing: {
    enabled: false,
    reason:
      "Audited terrain, hazard coverage and an approved routing policy are not connected.",
    eligibility_dataset_id: null,
    policy_version: null,
  },
  capabilities: {
    terrain_coverage: {
      status: "unknown",
      reason: "No terrain footprint has been audited.",
      source_id: null,
    },
    experimental_routing: {
      status: "unavailable",
      reason: "No experimental planning service is connected.",
    },
    validated_routing: {
      status: "unavailable",
      reason: "Terrain, hazards and policy require scientific review.",
    },
    mission_feasibility: {
      status: "unavailable",
      reason: "Six supported assessments and applicable models are required.",
    },
  },
  contextual_datasets: [
    {
      id: "oxia-environment-context",
      name: "Orbital environmental context (planned mission)",
      evidence: "Unavailable",
      availability: {
        status: "unavailable",
        reason:
          "No applicable observation products or exposure models are integrated.",
      },
      source_ids: [],
      limitations:
        "Historical rover observations are not mission forecasts or astronaut dose models.",
    },
  ],
  source_references: [
    {
      id: "oxia-mission-context",
      title: "Oxia Planum mission context",
      url: "https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Exploration/ExoMars",
      agency: "ESA",
      instrument: null,
      product_id: null,
      acquisition_date: null,
      sol: null,
      native_resolution_m: null,
      processing_notes: [],
      limitations: [
        "Mission context only; does not verify scenario objectives.",
      ],
    },
    {
      id: "oxia-ctx-esri",
      title:
        "Mars MRO CTX global mosaic beta01 (Caltech Murray Lab), Esri tiled map service",
      url: "https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer",
      agency: "NASA/JPL/MSSS · Caltech Murray Lab · Esri",
      instrument: "MRO Context Camera (CTX)",
      product_id: "Murray Lab CTX global mosaic beta01 (uncontrolled)",
      acquisition_date: null,
      sol: null,
      native_resolution_m: 5,
      processing_notes: [
        "Service metadata checked 2026-11-14: GCS_Mars_2000_Sphere (radius 3,396,190 m), origin -180/90, 512 px PNG tiles, 18 levels, level 0 resolution 0.3515625 deg/px.",
        "Service copyright text: 'Source: NASA/JPL/MSSS/Caltech Murray Lab/Esri'.",
        "Display tiles /maps/oxia/ctx-tiles/ built by team/oxia/basemap/prepare_ctx_basemap.mjs; see the region display-transform notes and team/oxia/basemap/build_report.json.",
      ],
      limitations: [
        "Uncontrolled beta mosaic: seams and illumination differences between orbits; not radiometrically calibrated.",
        "Individual CTX image acquisition dates are not carried by the tiled service.",
        "Imagery only; not elevation, geology or hazard evidence.",
      ],
    },
    {
      id: "oxia-fawdon-2024-map",
      title:
        "Fawdon et al. 2024, The high-resolution map of Oxia Planum, Mars; the landing site of the ExoMars Rosalind Franklin rover mission (Journal of Maps 20:1, 2302361)",
      url: "https://doi.org/10.1080/17445647.2024.2302361",
      agency: "ExoMars RSOWG Macro group · ESA (open access, CC BY 4.0)",
      instrument: null,
      product_id: "doi:10.1080/17445647.2024.2302361",
      acquisition_date: "2024",
      sol: null,
      native_resolution_m: null,
      processing_notes: [
        "Section 2.1: main map covers 17.11-19.15 N and 334.60-336.60 E; equirectangular projection centred at 18.20 N, 335.45 E, based on the IAU Mars2000 sphere.",
        "Mapping focused on the one-sigma landing ellipse (~66.75 x 5 km, ~67% touchdown probability).",
        "Map data are listed as available via the ESA PSA Guest Storage Facility and The Open University (Fawdon et al. 2023); not yet integrated here.",
      ],
      limitations: [
        "Used here only for the map extent and display centre; geologic units and the ellipse geometry are not yet integrated.",
      ],
    },
  ],
} satisfies RegionConfig;
