import type { Target } from "@/lib/contracts/region";

// Region-owned content. Pending values are deliberately explicit.
export const targets = [
  {
    id: "gale-objective-1",
    region_id: "gale",
    title: "Layered sedimentary unit",
    description:
      "Investigate how sedimentary layers could record environmental change.",
    scientific_goal:
      "Investigate how sedimentary layers could record environmental change.",
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
      "Propose observations of bedding and stratigraphic relationships.",
    evidence: "Scenario",
    verification: "scenario",
    routing_eligibility: {
      status: "unavailable",
      reason: "Target coordinates and source evidence require verification.",
    },
  },
  {
    id: "gale-objective-2",
    region_id: "gale",
    title: "Clay-to-sulfate transition",
    description:
      "Compare mineralogical context relevant to Mars’s climate history.",
    scientific_goal:
      "Compare mineralogical context relevant to Mars’s climate history.",
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
      "Plan comparative observations after source and location verification.",
    evidence: "Scenario",
    verification: "scenario",
    routing_eligibility: {
      status: "unavailable",
      reason: "Target coordinates and source evidence require verification.",
    },
  },
  {
    id: "gale-objective-3",
    region_id: "gale",
    title: "Sulfate-bearing outcrop",
    description:
      "Investigate a proposed objective about changing water conditions.",
    scientific_goal:
      "Investigate a proposed objective about changing water conditions.",
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
      "Document bedding and erosion patterns at a future verified site.",
    evidence: "Scenario",
    verification: "scenario",
    routing_eligibility: {
      status: "unavailable",
      reason: "Target coordinates and source evidence require verification.",
    },
  },
] satisfies Target[];
