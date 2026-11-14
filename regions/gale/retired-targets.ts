import type { Target } from "@/lib/contracts/region";

// Historical scenario objectives retired in G-S2. Retained for saved-mission compatibility only.
export const retiredTargets: Target[] = [
  {
    id: "gale-objective-1",
    region_id: "gale",
    title: "Layered sedimentary unit (Retired)",
    description:
      "Scenario objective retired from active catalog. Retained for saved-mission compatibility.",
    scientific_goal:
      "Investigate how sedimentary layers could record environmental change.",
    geological_significance:
      "Historical demonstration scenario. Retired from active catalog in milestone G-S2.",
    priority_category: "Retired scenario objective",
    coordinates: null,
    coordinate_reference: {
      body: "Mars",
      latitude_type: "planetocentric",
      longitude_direction: "east",
      longitude_range: "0-360",
    },
    coordinate_verified: false,
    source_ids: ["gale-geology-publication", "gale-clay-sulfate"],
    activity:
      "Scenario objective retired. Location and scientific context unverified for mission operations.",
    evidence: "Scenario",
    verification: "scenario",
    routing_eligibility: {
      status: "unavailable",
      reason:
        "This scenario objective has been retired and is no longer available for active mission planning.",
    },
    feature_kind: "scenario_objective",
    location_notes:
      "Scenario objective retired in milestone G-S2. Not available for new mission planning.",
    boundary: {
      status: "unavailable",
      reason:
        "Retired scenario objective with no valid planetary coordinates or geometry.",
    },
    location: {
      type: "unavailable",
      reason: "Retired scenario objective; location unavailable.",
    },
  },
  {
    id: "gale-objective-2",
    region_id: "gale",
    title: "Clay-to-sulfate transition (Retired)",
    description:
      "Scenario objective retired from active catalog. Retained for saved-mission compatibility.",
    scientific_goal:
      "Compare mineralogical context relevant to Mars’s climate history.",
    geological_significance:
      "Historical demonstration scenario. Retired from active catalog in milestone G-S2.",
    priority_category: "Retired scenario objective",
    coordinates: null,
    coordinate_reference: {
      body: "Mars",
      latitude_type: "planetocentric",
      longitude_direction: "east",
      longitude_range: "0-360",
    },
    coordinate_verified: false,
    source_ids: ["gale-geology-publication", "gale-clay-sulfate"],
    activity:
      "Scenario objective retired. Location and scientific context unverified for mission operations.",
    evidence: "Scenario",
    verification: "scenario",
    routing_eligibility: {
      status: "unavailable",
      reason:
        "This scenario objective has been retired and is no longer available for active mission planning.",
    },
    feature_kind: "scenario_objective",
    location_notes:
      "Scenario objective retired in milestone G-S2. Not available for new mission planning.",
    boundary: {
      status: "unavailable",
      reason:
        "Retired scenario objective with no valid planetary coordinates or geometry.",
    },
    location: {
      type: "unavailable",
      reason: "Retired scenario objective; location unavailable.",
    },
  },
  {
    id: "gale-objective-3",
    region_id: "gale",
    title: "Sulfate-bearing outcrop (Retired)",
    description:
      "Scenario objective retired from active catalog. Retained for saved-mission compatibility.",
    scientific_goal:
      "Investigate a proposed objective about changing water conditions.",
    geological_significance:
      "Historical demonstration scenario. Retired from active catalog in milestone G-S2.",
    priority_category: "Retired scenario objective",
    coordinates: null,
    coordinate_reference: {
      body: "Mars",
      latitude_type: "planetocentric",
      longitude_direction: "east",
      longitude_range: "0-360",
    },
    coordinate_verified: false,
    source_ids: ["gale-geology-publication", "gale-clay-sulfate"],
    activity:
      "Scenario objective retired. Location and scientific context unverified for mission operations.",
    evidence: "Scenario",
    verification: "scenario",
    routing_eligibility: {
      status: "unavailable",
      reason:
        "This scenario objective has been retired and is no longer available for active mission planning.",
    },
    feature_kind: "scenario_objective",
    location_notes:
      "Scenario objective retired in milestone G-S2. Not available for new mission planning.",
    boundary: {
      status: "unavailable",
      reason:
        "Retired scenario objective with no valid planetary coordinates or geometry.",
    },
    location: {
      type: "unavailable",
      reason: "Retired scenario objective; location unavailable.",
    },
  },
] satisfies Target[];
