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
    reference_surface: null,
    sphere_radius_m: null,
    vertical_datum: null,
  },
  view_center: {
    latitude: 18.44,
    longitude_east: 77.45,
    status: "illustrative-map-center-not-target-coordinate",
  },
  map: {
    visualization: {
      status: "unavailable",
      reason:
        "Georeferenced imagery and a reviewed Mars display transform are not integrated.",
    },
    initial_zoom: 7.3,
    supported_extent: null,
    display_transform: {
      status: "unverified",
      reason:
        "Source registration and planetary projection review are pending.",
    },
  },
  data_status: "illustrative",
  // Bumped from shared-ui-fixture-v1: verified source register (PLACES, MEDA,
  // sample dossier, HiRISE/CTX archive anchors). No coordinate/raster review yet.
  dataset_version: "jezero-sources-v2",
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
