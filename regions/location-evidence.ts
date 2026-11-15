/** F3 source/geography review, deliberately separate from mission waypoint permission. */
export const threeForksSite = {
  id: "jezero-three-forks-landing-circle", objective_id: "jezero-objective-3", region_id: "jezero",
  title: "Three Forks proposed landing-circle center (not the tube depot)",
  published_coordinates: { latitude: 18.45369687, longitude_east: 77.41359752 },
  coordinates: { latitude: 18.453697, longitude_east: 77.413598 },
  coordinate_system: "Mars planetocentric latitude, east-positive longitude",
  source_url: "https://www.hou.usra.edu/meetings/lpsc2023/pdf/2618.pdf",
  source_verified: true, coordinate_verified: true, processing_verified: false,
  registration_verified: false, positional_uncertainty_m: null,
  landing_circle_radius_m: 60, objective_waypoint_eligible: false,
  limitations: ["Published precision is not accuracy.", "Landing-circle radius is not localization error.", "A site is not the full mission-level objective.", "Numerical terrain coverage does not grant waypoint eligibility."],
} as const;
export function objectiveLocationEvidence(region: string, id: string) {
  return { region_id: region, objective_id: id, registration_verified: false,
    positional_uncertainty_m: null, objective_waypoint_eligible: false,
    associated_site: region === "jezero" && id === threeForksSite.objective_id ? threeForksSite : null };
}
export const retiredUnitLayers = ["gale-geology", "jezero-geology", "oxia-geology"] as const;
// Historical IDs retain their scientific meanings; none is reassigned to a point.
export const legacyObjectiveDecisions = {
  "gale-objective-1": "Retained unlocated Scenario; never restore historical demo coordinates.",
  "gale-objective-2": "Retained unlocated Scenario; never restore historical demo coordinates.",
  "gale-objective-3": "Retained unlocated Scenario; never restore historical demo coordinates.",
  "gale-glen-torridon": "Retained unlocated science context; no unit geometry.",
  "gale-vera-rubin-ridge": "Retained unlocated science context; no unit geometry.",
  "gale-sulfate-units": "Retained ID for sulfate investigation context; no unit geometry.",
  "gale-gediz-vallis": "Retained unlocated science context; no Arc Pass rectangle or 5 m claim.",
  "jezero-objective-3": "Retained unlocated mission goal; Three Forks remains separate site evidence.",
} as const;
