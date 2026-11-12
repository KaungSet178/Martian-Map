import type { Target } from "@/lib/contracts/region";

// Region-owned content. Pending values are deliberately explicit.
export const targets = [
  {
    id: "jezero-objective-1",
    region_id: "jezero",
    title: "Delta sediment exposure",
    description:
      "Investigate depositional layers and the context of ancient water.",
    scientific_goal:
      "Investigate depositional layers and the context of ancient water.",
    geological_significance: null,
    priority_category: "Unranked scenario objective",
    coordinates: null,
    coordinate_reference: {
      body: "Mars",
      latitude_type: "planetocentric",
      longitude_direction: "east",
      longitude_range: "0-360",
    },
    coordinate_verified: false,
    source_ids: [],
    activity: "Document bedding and sedimentary context.",
    evidence: "Scenario",
    verification: "scenario",
    routing_eligibility: {
      status: "unavailable",
      reason: "Target coordinates and source evidence require verification.",
    },
  },
  {
    id: "jezero-objective-2",
    region_id: "jezero",
    title: "Carbonate investigation",
    description: "Explore a proposed objective about water-related mineralogy.",
    scientific_goal:
      "Explore a proposed objective about water-related mineralogy.",
    geological_significance: null,
    priority_category: "Unranked scenario objective",
    coordinates: null,
    coordinate_reference: {
      body: "Mars",
      latitude_type: "planetocentric",
      longitude_direction: "east",
      longitude_range: "0-360",
    },
    coordinate_verified: false,
    source_ids: [],
    activity:
      "Compare published mineralogical context before selecting a field site.",
    evidence: "Scenario",
    verification: "scenario",
    routing_eligibility: {
      status: "unavailable",
      reason: "Target coordinates and source evidence require verification.",
    },
  },
  {
    id: "jezero-objective-3",
    region_id: "jezero",
    title: "Sample context study",
    description:
      "Consider the geological setting of a prospective sampling stop.",
    scientific_goal:
      "Consider the geological setting of a prospective sampling stop.",
    geological_significance: null,
    priority_category: "Unranked scenario objective",
    coordinates: null,
    coordinate_reference: {
      body: "Mars",
      latitude_type: "planetocentric",
      longitude_direction: "east",
      longitude_range: "0-360",
    },
    coordinate_verified: false,
    source_ids: [],
    activity: "Record a proposed sample-context observation plan.",
    evidence: "Scenario",
    verification: "scenario",
    routing_eligibility: {
      status: "unavailable",
      reason: "Target coordinates and source evidence require verification.",
    },
  },
] satisfies Target[];
