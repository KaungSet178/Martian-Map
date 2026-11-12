import type { RegionConfig } from "@/lib/contracts/region";

// Region-owned content. Pending values are deliberately explicit.
export const config = {
  id: "jezero",
  name: "Jezero Crater",
  mission_context: "Perseverance · Western delta",
  region_status: "exploration",
  scientific_context: {
    mission: "NASA · Perseverance",
    question:
      "What can delta sediments reveal about an ancient lake and its habitability?",
  },
  coordinate_system: {
    body: "Mars",
    latitude_type: "planetocentric",
    longitude_direction: "east",
    longitude_range: "0-360",
    projected_crs: "pending-source-validation",
    reference_surface:
      "Mars mean sphere (IAU/MOLA convention, 3,389,500 m radius) registered for display scale; the exact PLACES/SIS (PPPCS) ellipsoid parameters are pending review",
    sphere_radius_m: 3389500,
    vertical_datum:
      "MOLA areoid (PLACES elevation = radius - areoid, positive up; verified empirically in the product)",
  },
  view_center: {
    latitude: 18.444627146,
    longitude_east: 77.450885729,
    status:
      "Perseverance landing localization (PLACES best_interp.csv v16.0 SITE 1, planetocentric/east). Display center for the scientific map; canonical planetocentric values passed through the documented display transform.",
  },
  map: {
    visualization: {
      status: "available",
      reason:
        "Recorded-traverse display asset with a reviewed, documented display transform and supported extent.",
    },
    initial_zoom: 10,
    supported_extent: {
      west_east: 77.186786,
      east_east: 77.493133,
      south_latitude: 18.401964,
      north_latitude: 18.519663,
    },
    display_transform: {
      status: "reviewed",
      method: "mars-geographic-to-maplibre-display",
      source_id: "jezero-m2020-places",
      notes:
        "Review 2026-11-12, Jezero region owner. Asset public/maps/jezero/perseverance-traverse.geojson derived from PLACES data_localizations/best_interp.csv v16.0 (33,458 rows, sols 0-1897) by team/jezero/traverse/build_traverse.mjs; coordinates are copied, never recomputed: [east longitude 0-360, planetocentric latitude]. All Jezero longitudes are <180E, so the shared east-to-display wrap is an identity here. The shared renderer feeds display latitude to Web Mercator (Earth-sphere tile math; MapLibre distances/scales remain forbidden). ALIGNMENT: the product's planetodetic_latitude column is defective (constant 18.346169209 across release 16, verified in best_interp.csv and best_tactical.csv), so planetocentric latitude is supplied as display latitude; Web Mercator interprets it as geodetic and the planetocentric/geodetic distinction at 18.4-18.5N is ~0.1-0.2 deg, so alignment against any georeferenced basemap is PENDING SIS (PPPCS) ellipsoid review - the asset is display-grade, not survey-grade. NODATA: rows with -9999 lat/lon dropped (0 rows in v16.0); consecutive duplicate positions collapsed; release 16 omits ROVER,n,0 entries bundle-wide per release notes (station points recovered from identical SITE entries). PROVENANCE/CROSS-CHECK: approximate recorded path 42.785 km for sols 14-1897 (through 2026-06-21), consistent with the NASA odometer statement (45.22 km by 2026-10-11); product radius column 3,391,924-3,392,721 m; areoid-relative elevation -2,586 to -1,786 m. Decimation: display vertices thinned to ~10 m spacing (3,502 of 32,978 points). supported_extent and view_center use the same planetocentric convention as the asset, so bounds/center/asset registration is internally consistent.",
    },
  },
  data_status: "metadata_verified",
  // v3: real recorded-traverse product integrated (PLACES best_interp.csv
  // v16.0), display transform reviewed, visualization enabled. No raster
  // (imagery/DEM) audited yet, so data_status stays at metadata_verified.
  dataset_version: "jezero-traverse-v3",
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
      id: "jezero-environment-context",
      name: "Historical MEDA / environmental context",
      evidence: "Unavailable",
      availability: {
        status: "unavailable",
        reason:
          "MEDA archive is registered, but no applicable observation products are integrated and no exposure model is reviewed.",
      },
      source_ids: ["jezero-meda-environment"],
      limitations:
        "Historical rover observations at the rover location are not spatial fields, not mission forecasts and not astronaut dose models.",
    },
  ],
  source_references: [
    {
      id: "jezero-mission-context",
      title: "Jezero Crater mission context (Perseverance location map)",
      url: "https://science.nasa.gov/mission/mars-2020-perseverance/location-map/",
      agency: "NASA",
      instrument: null,
      product_id: null,
      acquisition_date: null,
      sol: null,
      native_resolution_m: null,
      processing_notes: [
        "Interactive map built on a high-resolution color base map derived from MRO HiRISE images covering the initial exploration area.",
        "Regional true-color context from ESA Mars Express HRSC (original map at https://maps.planet.fu-berlin.de/).",
        "Mission team states a high-resolution DEM was created from orbital images for rover driving; no public product has been selected by this project.",
      ],
      limitations: [
        "Mission context only; does not verify targets, rasters, coordinates or hazards.",
        "Map tiles/dots are a mission operations view; no traverse geometry is asserted from this page.",
      ],
    },
    {
      id: "jezero-m2020-places",
      title:
        "Mars 2020 Rover PLACES Bundle (rover localizations and traverse geometry)",
      url: "https://pds-geosciences.wustl.edu/missions/mars2020/places.htm",
      agency: "NASA/JPL-Caltech · PDS Geosciences Node",
      instrument: "Perseverance PLACES localization database",
      product_id: "urn-nasa-pds-mars2020_rover_places",
      acquisition_date: null,
      sol: null,
      native_resolution_m: null,
      processing_notes: [
        "Bundle root: https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_rover_places/",
        "Traverse geometry lives in the data_localizations/ collection; data_maps/ holds map-related products.",
        "Release 16 (Aug 11 2026) covers sols 0-1897 through 2026-06-21.",
        "Product structure is defined by the Rover PLACES SIS (Mars2020_Rover_PLACES_PDS_SIS.pdf).",
        "Display asset /maps/jezero/perseverance-traverse.geojson derived from data_localizations/best_interp.csv v16.0 by team/jezero/traverse/build_traverse.mjs (audit, decimation and conventions documented there and in the region display-transform notes).",
      ],
      limitations: [
        "Downloadable geometry must be verified per-product before any display or survey-precision use.",
        "Site-frame vs cartographic coordinate conventions and localization accuracy are not yet reviewed.",
        "Rover traverse data is not astronaut route evidence and does not imply terrain safety.",
      ],
    },
    {
      id: "jezero-meda-environment",
      title:
        "MEDA (Mars Environmental Dynamics Analyzer) archive, Mars 2020 mission",
      url: "https://atmos.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html",
      agency: "NASA/JPL · PDS Atmospheres Node",
      instrument: "MEDA (PS, ATS, TIRS, HS, WS, RDS/SkyCam)",
      product_id: "mars2020_meda (DOI 10.17189/1522849)",
      acquisition_date: null,
      sol: null,
      native_resolution_m: null,
      processing_notes: [
        "Certified bundle: https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/",
        "Calibrated and derived products are CSV tables; derived products apply stated models to calibrated data.",
        "Observations began Feb 19, 2021 (Ls 6.1 MY 36) and continue by release.",
      ],
      limitations: [
        "Historical point observations at the rover, not spatial fields over the region.",
        "Not a forecast, not a radiation exposure model and not operational support.",
        "Product selection and any integration require a reviewed applicability statement.",
      ],
    },
    {
      id: "jezero-m2020-sample-dossier",
      title:
        "Mars 2020 Sample Dossier Bundle (sample acquisition and context data)",
      url: "https://pds-geosciences.wustl.edu/missions/mars2020/returned_sample_science.htm",
      agency: "NASA/JPL-Caltech · PDS Geosciences Node",
      instrument: "Perseverance sampling system with mission context cameras",
      product_id: null,
      acquisition_date: null,
      sol: null,
      native_resolution_m: null,
      processing_notes: [
        "Documents remote sensing, contact science and engineering data for drilled/abraded samples.",
        "Bundle URN and per-sample products to be confirmed during target-evidence selection.",
      ],
      limitations: [
        "Sample context is rover-sampled rock/regolith evidence, not a proposed astronaut sampling result.",
        "No specific sample product has been selected or reviewed by this project yet.",
      ],
    },
    {
      id: "jezero-m2020-mission-overview",
      title:
        "Mars 2020 Mission Overview (Farley et al., 2020, Space Science Reviews)",
      url: "https://doi.org/10.1007/s11214-020-00762-y",
      agency: "NASA",
      instrument: "Mars 2020 mission science team",
      product_id: "DOI 10.1007/s11214-020-00762-y",
      acquisition_date: null,
      sol: null,
      native_resolution_m: null,
      processing_notes: [
        "Peer-reviewed mission overview; cited on the verified PDS MEDA archive page.",
        "Describes the Perseverance mission and Jezero landing-site science framing.",
      ],
      limitations: [
        "Published interpretation is not coordinate-verified evidence for a specific site.",
        "Does not establish raster coverage or terrain safety.",
      ],
    },
    {
      id: "jezero-hirise-archive",
      title: "HiRISE PDS data volume (EDR, RDR and DTM, accumulating)",
      url: "https://hirise-pds.lpl.arizona.edu/PDS",
      agency: "NASA/JPL-Caltech/University of Arizona",
      instrument: "HiRISE",
      product_id: null,
      acquisition_date: null,
      sol: null,
      native_resolution_m: null,
      processing_notes: [
        "Archive anchor for MRO HiRISE EDR/RDR/DTM volumes.",
        "Specific western-delta imagery/DTM products remain to be selected and reviewed.",
      ],
      limitations: [
        "Archive anchor only; selecting a Jezero product does not by itself validate its coordinate convention or footprint.",
      ],
    },
    {
      id: "jezero-ctx-archive",
      title: "MRO CTX EDR online volumes (PDS Imaging Node)",
      url: "https://pds-imaging.jpl.nasa.gov/volumes/mro.html",
      agency: "NASA/JPL-Caltech · PDS Cartography and Imaging Node",
      instrument: "CTX (Context Camera)",
      product_id: null,
      acquisition_date: null,
      sol: null,
      native_resolution_m: null,
      processing_notes: [
        "Archive anchor for CTX/MARCI EDR volumes; per-volume releases through 2026.",
        "Jezero coverage products to be located via the Orbital Data Explorer before registration.",
      ],
      limitations: [
        "Archive anchor only; no specific Jezero product has been selected or reviewed.",
      ],
    },
  ],
} satisfies RegionConfig;
