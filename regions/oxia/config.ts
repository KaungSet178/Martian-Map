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
    reference_surface: null,
    sphere_radius_m: null,
    vertical_datum: null,
  },
  view_center: {
    latitude: 18.2,
    longitude_east: 335.45,
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
  dataset_version: "shared-ui-fixture-v1",
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
  ],
} satisfies RegionConfig;
