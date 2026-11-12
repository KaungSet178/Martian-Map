import type { Target } from "@/lib/contracts/region";

// Region-owned content. Pending values are deliberately explicit.
// Existing IDs are preserved so saved mission v1 records keep working.
export const targets = [
  {
    id: "jezero-objective-1",
    region_id: "jezero",
    title: "Delta sediment exposure",
    description:
      "Scenario objective: examine interpreted delta-front exposures in the western delta to document depositional bedding and the sedimentary record of an ancient lake.",
    scientific_goal:
      "Document interpreted delta sedimentary layering and its context for ancient water activity.",
    geological_significance:
      "Delta deposits at Jezero are widely interpreted as the record of sustained fluvial activity into a standing body of water; their bedding and contacts bear directly on habitability and on the preservation potential of organic material in lacustrine sediments.",
    priority_category: "Unranked scenario objective",
    coordinates: null,
    coordinate_reference: {
      body: "Mars",
      latitude_type: "planetocentric",
      longitude_direction: "east",
      longitude_range: "0-360",
    },
    coordinate_verified: false,
    source_ids: ["jezero-mission-context", "jezero-m2020-mission-overview"],
    activity:
      "Document bedding orientation, grain-size context and exposure contacts in interpreted delta-front outcrops; log candidate sample-context observations without asserting survey precision. Location stays pending until a source-audited coordinate is produced.",
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
    description:
      "Scenario objective: examine interpreted carbonate-bearing units around the western delta to compare water-related mineralogical context before selecting a field site.",
    scientific_goal:
      "Explore interpreted water-related mineralogy (carbonates) as a record of lacustrine alteration.",
    geological_significance:
      "Carbonate-bearing units around the western delta are interpreted as a record of lacustrine alteration and potentially habitable aqueous environments; their distribution constrains how long standing water persisted and where biosignature preservation was most likely.",
    priority_category: "Unranked scenario objective",
    coordinates: null,
    coordinate_reference: {
      body: "Mars",
      latitude_type: "planetocentric",
      longitude_direction: "east",
      longitude_range: "0-360",
    },
    coordinate_verified: false,
    source_ids: ["jezero-mission-context", "jezero-m2020-mission-overview"],
    activity:
      "Compare published mineralogical interpretations before selecting a field site; a proposed site is not a verified sample point, and any location requires a per-product coordinate audit first.",
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
      "Scenario objective: consider the geological setting of a prospective sampling stop relative to the documented Perseverance sample context and traverse record.",
    scientific_goal:
      "Consider the geological setting of a prospective sampling stop using documented rover sampling and traverse context.",
    geological_significance:
      "Perseverance's acquired and cached samples document the stratigraphic context of crater-floor and delta units; relating a proposed stop to that recorded context preserves scientific traceability across mission datasets.",
    priority_category: "Unranked scenario objective",
    coordinates: null,
    coordinate_reference: {
      body: "Mars",
      latitude_type: "planetocentric",
      longitude_direction: "east",
      longitude_range: "0-360",
    },
    coordinate_verified: false,
    source_ids: ["jezero-m2020-sample-dossier", "jezero-m2020-places"],
    activity:
      "Record a proposed sample-context observation plan anchored to documented Perseverance sample and traverse data. Proposed astronaut sampling is not a completed observation, and traverse geometry must be verified per-product before any display use.",
    evidence: "Scenario",
    verification: "scenario",
    routing_eligibility: {
      status: "unavailable",
      reason: "Target coordinates and source evidence require verification.",
    },
  },
] satisfies Target[];
