import type { Target } from "@/lib/contracts/region";

// Region-owned content. Pending values are deliberately explicit.
export const targets = [
  {
    id: "oxia-objective-1",
    region_id: "oxia",
    title: "Clay-rich bedrock study",
    description:
      "Explore a proposed investigation of an ancient aqueous environment.",
    scientific_goal:
      "Explore a proposed investigation of an ancient aqueous environment.",
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
      "Review published geological interpretation before choosing a field location.",
    evidence: "Scenario",
    verification: "scenario",
    routing_eligibility: {
      status: "unavailable",
      reason: "Target coordinates and source evidence require verification.",
    },
  },
  {
    id: "oxia-objective-2",
    region_id: "oxia",
    title: "Layered geological unit",
    description: "Compare proposed objectives about stratigraphic history.",
    scientific_goal: "Compare proposed objectives about stratigraphic history.",
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
    activity: "Plan observations of exposed layers after mapping verification.",
    evidence: "Scenario",
    verification: "scenario",
    routing_eligibility: {
      status: "unavailable",
      reason: "Target coordinates and source evidence require verification.",
    },
  },
  {
    id: "oxia-objective-3",
    region_id: "oxia",
    title: "Proposed drill context",
    description:
      "Consider a hypothetical investigation of subsurface preservation.",
    scientific_goal:
      "Consider a hypothetical investigation of subsurface preservation.",
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
      "Define a future sampling question; no drilling or sample collection is implied.",
    evidence: "Scenario",
    verification: "scenario",
    routing_eligibility: {
      status: "unavailable",
      reason: "Target coordinates and source evidence require verification.",
    },
  },
] satisfies Target[];
