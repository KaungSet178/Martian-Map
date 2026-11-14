import type { Target } from "@/lib/contracts/region";

// Region-owned content. Target locations come only from NASA Mars Trek
// mineral-detection layers (see config.source_references oxia-trek-*).
// They are approximate detection locations (two-decimal degrees), not
// precise outcrops, sample sites or routable waypoints.
const coordinate_reference = {
  body: "Mars",
  latitude_type: "planetocentric",
  longitude_direction: "east",
  longitude_range: "0-360",
} as const;

const routing_eligibility = {
  status: "unavailable",
  reason:
    "Detection location checked against Mars Trek; regional terrain, hazards and a routing policy are still unaudited.",
} as const;

export const targets = [
  {
    id: "oxia-objective-1",
    region_id: "oxia",
    title: "Clay-rich bedrock study",
    description:
      "Phyllosilicate (clay) detection in the Mars Trek Aqueous Mineral Distribution layer, with a CRISM hydrous-mineral detection about 3 km away in the Hydrous Mineral Detections layer.",
    scientific_goal:
      "Examine clay-bearing material as a record of past water-rock alteration.",
    geological_significance:
      "Phyllosilicates form by aqueous alteration of rock, so they point to past liquid water. Two independent Mars Trek layers report a detection here.",
    priority_category: "Primary: detected by two Mars Trek layers",
    coordinates: { latitude: 18.22, longitude_east: 335.83 },
    coordinate_reference,
    coordinate_verified: true,
    source_ids: ["oxia-trek-aqueous", "oxia-trek-hydrous"],
    activity:
      "Inspect the detection area in orbital imagery, then plan close-range imaging of clay-bearing surfaces. Location is approximate (about 0.6 km precision).",
    evidence: "Interpreted",
    verification: "verified",
    routing_eligibility,
  },
  {
    id: "oxia-objective-2",
    region_id: "oxia",
    title: "Hydrated silica detection",
    description:
      "Silica detection in the Mars Trek Aqueous Mineral Distribution layer, about 7 km from a phyllosilicate detection.",
    scientific_goal:
      "Examine silica-bearing material and compare it with nearby clay detections.",
    geological_significance:
      "Silica in this layer is an aqueous mineral class, formed by alteration or precipitation from water.",
    priority_category: "Secondary: single Mars Trek detection",
    coordinates: { latitude: 17.84, longitude_east: 336.33 },
    coordinate_reference,
    coordinate_verified: true,
    source_ids: ["oxia-trek-aqueous"],
    activity:
      "Inspect the detection area in orbital imagery and compare its surface texture with the clay detection 7 km away. Location is approximate (about 0.6 km precision).",
    evidence: "Interpreted",
    verification: "verified",
    routing_eligibility,
  },
  {
    id: "oxia-objective-3",
    region_id: "oxia",
    title: "Second clay detection",
    description:
      "A second phyllosilicate detection in the Mars Trek Aqueous Mineral Distribution layer, about 16 km east of the primary clay target.",
    scientific_goal:
      "Check whether clay-bearing material extends between separate detections.",
    geological_significance:
      "A second clay detection helps judge whether alteration minerals are local or widespread.",
    priority_category: "Secondary: single Mars Trek detection",
    coordinates: { latitude: 18.22, longitude_east: 336.11 },
    coordinate_reference,
    coordinate_verified: true,
    source_ids: ["oxia-trek-aqueous"],
    activity:
      "Compare this detection with the primary clay target in orbital imagery. Location is approximate (about 0.6 km precision).",
    evidence: "Interpreted",
    verification: "verified",
    routing_eligibility,
  },
] satisfies Target[];
