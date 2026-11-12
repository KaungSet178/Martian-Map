import {
  regionSchema,
  type RegionId,
  type RegionManifest,
} from "@/lib/contracts/region";

// Shared UI fixtures only. These are not regional scientific data packages.
// Centers are provisional display metadata; target geometry is deliberately null.
const definitions = {
  jezero: {
    name: "Jezero Crater",
    context: "Perseverance · Western delta",
    mission: "NASA · Perseverance",
    question:
      "What can delta sediments reveal about an ancient lake and its habitability?",
    center: [18.44, 77.45],
    reference:
      "https://science.nasa.gov/mission/mars-2020-perseverance/location-map/",
    targets: [
      [
        "Delta sediment exposure",
        "Investigate depositional layers and the context of ancient water.",
        "Document bedding and sedimentary context.",
      ],
      [
        "Carbonate investigation",
        "Explore a proposed objective about water-related mineralogy.",
        "Compare published mineralogical context before selecting a field site.",
      ],
      [
        "Sample context study",
        "Consider the geological setting of a prospective sampling stop.",
        "Record a proposed sample-context observation plan.",
      ],
    ],
  },
  gale: {
    name: "Gale Crater",
    context: "Curiosity · Lower Mount Sharp",
    mission: "NASA · Curiosity",
    question:
      "How do clay-to-sulfate transitions record changing water conditions?",
    center: [-4.59, 137.44],
    reference: "https://science.nasa.gov/mission/msl-curiosity/location-map/",
    targets: [
      [
        "Layered sedimentary unit",
        "Investigate how sedimentary layers could record environmental change.",
        "Propose observations of bedding and stratigraphic relationships.",
      ],
      [
        "Clay-to-sulfate transition",
        "Compare mineralogical context relevant to Mars’s climate history.",
        "Plan comparative observations after source and location verification.",
      ],
      [
        "Sulfate-bearing outcrop",
        "Investigate a proposed objective about changing water conditions.",
        "Document bedding and erosion patterns at a future verified site.",
      ],
    ],
  },
  oxia: {
    name: "Oxia Planum",
    context: "Rosalind Franklin · Planned mission area",
    mission: "ESA · Planned exploration",
    question:
      "Which proposed clay-rich and subsurface targets could illuminate past habitability?",
    center: [18.2, 335.45],
    reference:
      "https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Exploration/ExoMars",
    targets: [
      [
        "Clay-rich bedrock study",
        "Explore a proposed investigation of an ancient aqueous environment.",
        "Review published geological interpretation before choosing a field location.",
      ],
      [
        "Layered geological unit",
        "Compare proposed objectives about stratigraphic history.",
        "Plan observations of exposed layers after mapping verification.",
      ],
      [
        "Proposed drill context",
        "Consider a hypothetical investigation of subsurface preservation.",
        "Define a future sampling question; no drilling or sample collection is implied.",
      ],
    ],
  },
} as const;

export const regionPresentation = definitions;
export const regionIds: RegionId[] = ["jezero", "gale", "oxia"];
export const regions = Object.fromEntries(
  regionIds.map((id) => {
    const d = definitions[id];
    return [
      id,
      regionSchema.parse({
        id,
        name: d.name,
        mission_context: d.context,
        coordinate_system: {
          latitude_type: "planetocentric",
          longitude_direction: "east",
          longitude_range: "0-360",
          projected_crs: "pending-source-validation",
        },
        view_center: {
          latitude: d.center[0],
          longitude_east: d.center[1],
          status: "illustrative-map-center-not-target-coordinate",
        },
        data_status: "illustrative",
        dataset_version: "shared-ui-fixture-v1",
        layers: [
          {
            id: `${id}-optical`,
            type: "Optical imagery",
            availability: "pending",
            source_id: null,
            observation_date: null,
            spatial_resolution_m: null,
            coverage: null,
            limitations:
              "Georeferenced orbital imagery and its planetary transform have not been integrated.",
          },
          {
            id: `${id}-terrain`,
            type: "Terrain & slope",
            availability: "pending",
            source_id: null,
            observation_date: null,
            spatial_resolution_m: null,
            coverage: null,
            limitations:
              "Requires audited DEM, resolution, valid-data footprint and documented derivation.",
          },
          {
            id: `${id}-geology`,
            type: "Geology & mineralogy",
            availability: "pending",
            source_id: null,
            observation_date: null,
            spatial_resolution_m: null,
            coverage: null,
            limitations:
              "Requires published map products, classification legends and coverage verification.",
          },
        ],
        targets: d.targets.map((t, i) => ({
          id: `${id}-objective-${i + 1}`,
          title: t[0],
          scientific_goal: t[1],
          priority_category: "Unranked scenario objective",
          coordinates: null,
          coordinate_verified: false,
          source_ids: [],
          activity: t[2],
        })),
        routing: {
          enabled: false,
          reason:
            "Audited terrain, hazard coverage and an approved routing policy are not connected.",
          eligibility_dataset_id: null,
          policy_version: null,
        },
        source_references: [
          {
            id: `${id}-mission-context`,
            title: `${d.name} mission context`,
            url: d.reference,
          },
        ],
      }),
    ];
  }),
) as Record<RegionId, RegionManifest>;
