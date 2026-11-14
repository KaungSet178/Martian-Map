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
      "IAU Mars 2000 sphere (D_Mars_2000_Sphere), as declared by the Mars Trek CTX tile service (GCS_Mars_2000_Sphere)",
    sphere_radius_m: 3396190,
    // No elevation layer is integrated yet, so no vertical datum is asserted.
    vertical_datum: null,
  },
  view_center: {
    latitude: 18.2,
    longitude_east: 335.45,
    status:
      "Illustrative display centre for the Oxia Planum region, retained from the shared fixture. Team-chosen; not a landing point, landing-ellipse centre or target coordinate.",
  },
  map: {
    visualization: {
      status: "available",
      reason:
        "Mars Trek CTX basemap tiles over a team-chosen Oxia display area with a documented display transform.",
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
      source_id: "oxia-ctx-trek",
      notes:
        "Review 2026-11-14, Oxia region owner. EXTENT: team-chosen display box, 17.11-19.15 N, 334.60-336.60 E (about 2 x 2 degrees around the illustrative display centre). It is not a landing ellipse, mission boundary or published map area; no planned landing-area geometry is integrated because Mars Trek (the project's data source) has none. LONGITUDE: Oxia lies above 180 E, so the shared display conversion (lib/map/region-layers.ts: east longitude - 360) gives display longitudes -25.40 to -23.40; team/oxia/basemap/prepare_ctx_basemap.mjs applies the same conversion when sampling. BASEMAP (v2): /maps/oxia/ctx-tiles/ derived from the Murray Lab CTX global mosaic beta01, NASA Mars Trek layer CTX_beta01_uncontrolled_5m_Caltech (source oxia-ctx-trek; tiles from the Trek-designated endpoint), by team/oxia/basemap/prepare_ctx_basemap.mjs (adapted from the Jezero owner's script): 841 self-hosted 256 px grayscale Web-Mercator XYZ tiles, zooms 5-12, nearest-neighbour from the service's equirectangular grid at level L=z-2, no radiometric processing. Build report team/oxia/basemap/build_report.json: 262 source tiles fetched, 0 missing, 0 output samples without source. LATITUDE: the service GCS is Mars_2000_Sphere (r=3,396,190 m), so geodetic == planetocentric and planetocentric latitude is passed as display latitude; Web Mercator is display math only (MapLibre Earth distances/scale stay forbidden). NOT CHECKED: no independent registration test against HiRISE (the beta01 mosaic is uncontrolled); display-grade only, not survey-grade, not terrain or hazard evidence.",
    },
  },
  data_status: "metadata_verified",
  // v2: CTX basemap integrated (oxia-optical available, evidence Observed).
  // v3: targets located at Mars Trek mineral-detection points (Interpreted,
  // approximate); routing stays off.
  dataset_version: "oxia-targets-v3",
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
      id: "oxia-ctx-trek",
      title:
        "NASA JPL Mars Trek layer 'MRO CTX, Mosaic Global Uncontrolled (Caltech)' (CTX_beta01_uncontrolled_5m_Caltech)",
      url: "https://trek.nasa.gov/tiles/Mars/EQ/CTX_beta01_uncontrolled_5m_Caltech/1.0.0/WMTSCapabilities.xml",
      agency: "NASA JPL Mars Trek · NASA/JPL/MSSS · Caltech Murray Lab",
      instrument: "MRO Context Camera (CTX)",
      product_id:
        "CTX_beta01_uncontrolled_5m_Caltech (Mars Trek item 8b9208ac-bb00-4d7c-8da4-f4d34366146d)",
      acquisition_date: null,
      sol: null,
      native_resolution_m: 5,
      processing_notes: [
        "Mars Trek is listed in the Space Apps 2026 'Interplanetary Survival Guide: Martian Map' challenge resources.",
        "Mars Trek WMTS capabilities (checked 2026-11-14) give the layer's tile ResourceURL as https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/{TileMatrix}/{TileRow}/{TileCol}; tiles were fetched from that Trek-designated endpoint.",
        "Tile service metadata checked 2026-11-14: GCS_Mars_2000_Sphere (radius 3,396,190 m), origin -180/90, 512 px PNG tiles, 18 levels, level 0 resolution 0.3515625 deg/px; copyright 'Source: NASA/JPL/MSSS/Caltech Murray Lab/Esri'.",
        "Display tiles /maps/oxia/ctx-tiles/ built by team/oxia/basemap/prepare_ctx_basemap.mjs; see the region display-transform notes and team/oxia/basemap/build_report.json.",
      ],
      limitations: [
        "Uncontrolled beta mosaic: seams and illumination differences between orbits; not radiometrically calibrated.",
        "Individual CTX image acquisition dates are not carried by the tiled service.",
        "Imagery only; not elevation, geology or hazard evidence.",
      ],
    },
    {
      id: "oxia-trek-hydrous",
      title:
        "NASA JPL Mars Trek layer 'Hydrous Mineral Detections (OMEGA, CRISM)' (Hydrous_Mineral_Detections_CRISM_clon0)",
      url: "https://trek.nasa.gov/mars/trekarcgis/rest/services/Hydrous_Mineral_Detections_OMEGA_CRISM_clon0/MapServer/0",
      agency: "NASA JPL Mars Trek · NASA MRO CRISM · ESA Mars Express OMEGA",
      instrument: "MRO CRISM / Mars Express OMEGA (all Oxia points: CRISM)",
      product_id:
        "Hydrous_Mineral_Detections_CRISM_clon0 (Mars Trek item ab0cdc7b-2152-4a91-8023-ae06c09967da)",
      acquisition_date: null,
      sol: null,
      native_resolution_m: null,
      processing_notes: [
        "Mars Trek is listed in the Space Apps 2026 challenge resources.",
        "Layer description cites: J. Carter, F. Poulet, J.-P. Bibring, N. Mangold, S. Murchie (2013) Hydrous minerals on Mars as seen by the CRISM and OMEGA imaging spectrometers: Updated global view, JGR Planets 118(4), 831-858.",
        "Queried 2026-11-14 (ArcGIS feature query, envelope 334.60-336.60 E, 17.11-19.15 N): 2 points, both Type 'Hydrous Mineral Detection', Instrument 'CRISM': FID 773 (18.17 N, 335.82 E) and FID 775 (17.70 N, 336.07 E). Coordinates taken from the 'Latitude' and 'Longitude' (0-360 E) fields; the 'Long_East' field holds -180..180 values.",
        "Service spatial reference: GCS_Mars_2000_Sphere (r = 3,396,190 m), so geodetic and planetocentric latitude coincide.",
      ],
      limitations: [
        "Global-survey point markers with two-decimal coordinates (about 0.6 km steps); they mark detection locations, not precise outcrops or sample sites.",
        "No mineral class is given per point, only 'Hydrous Mineral Detection'.",
      ],
    },
    {
      id: "oxia-trek-aqueous",
      title:
        "NASA JPL Mars Trek layer 'Aqueous Mineral Distribution' (Aqueous_Mineral_Distribution_Options_clon0)",
      url: "https://trek.nasa.gov/mars/trekarcgis/rest/services/Aquieous_Mineral_Distribution_Options_clon0/MapServer/0",
      agency: "NASA JPL Mars Trek · NASA MRO CRISM · ESA Mars Express OMEGA · NASA Mars Odyssey THEMIS",
      instrument: "MRO CRISM / Mars Express OMEGA / Mars Odyssey THEMIS (compilation)",
      product_id:
        "Aqueous_Mineral_Distribution_Options_clon0 (Mars Trek item dd2e18f9-e698-4f8d-b5c7-895992bffbc2)",
      acquisition_date: null,
      sol: null,
      native_resolution_m: null,
      processing_notes: [
        "Mars Trek is listed in the Space Apps 2026 challenge resources.",
        "Layer description cites: B. L. Ehlmann, C. S. Edwards (2014) Mineralogy of the Martian Surface, Annu. Rev. Earth Planet. Sci. 42, 291-315. Classes: silica, phyllosilicate, sulfate, chloride, carbonate.",
        "Queried 2026-11-14 (ArcGIS feature query, envelope 334.60-336.60 E, 17.11-19.15 N): 10 rows, 4 unique locations (rows repeat with identical values): silica 17.84 N 336.33 E (FID 260/261); phyllosilicate 18.22 N 335.83 E (FID 3603/3604), 18.22 N 336.11 E (FID 2454/2455), 17.74 N 336.38 E (FID 2450/2451/3601/3602). Coordinates from 'Latitude' and 'Longitude' (0-360 E).",
        "Service spatial reference: GCS_Mars_2000_Sphere (r = 3,396,190 m).",
      ],
      limitations: [
        "Compilation point markers with two-decimal coordinates (about 0.6 km steps); detection locations, not precise outcrops or sample sites.",
        "Classes are published spectral interpretations; no abundance, layering or depth information.",
      ],
    },
  ],
} satisfies RegionConfig;
