import type { Target } from "@/lib/contracts/region";

// Region-owned content. These five targets follow the published Mars 2020
// Perseverance science objectives (NASA science-objectives page, verified
// 2026-11-14) and the peer-reviewed mission overview (Farley et al. 2020).
// The objective text is real; target locations are not. No coordinate is
// asserted, so every target stays non-routable pending a source-audited
// coordinate. Existing IDs 1-3 are preserved so saved mission v1 records
// keep working.
export const targets = [
  {
    id: "jezero-objective-1",
    region_id: "jezero",
    title: "Jezero geology and climate record",
    description:
      "Published Mars 2020 objective: characterize the geology and climate history of the Jezero field area - its rocks, landscape and the processes that formed and modified the geologic record in this astrobiologically relevant setting.",
    scientific_goal:
      "Reconstruct the geologic and climate history recorded in Jezero's crater-floor, delta and margin deposits.",
    geological_significance:
      "Jezero's record spans a crater floor, an ancient lake and a delta system. Mapping unit contacts, stratigraphy and alteration constrains when and how long surface water persisted, what the climate was like, and which materials could preserve biosignatures.",
    priority_category: "Published Mars 2020 science objective - location pending",
    coordinates: null,
    coordinate_reference: {
      body: "Mars",
      latitude_type: "planetocentric",
      longitude_direction: "east",
      longitude_range: "0-360",
    },
    coordinate_verified: false,
    source_ids: [
      "jezero-m2020-mission-overview",
      "jezero-m2020-science-objectives",
    ],
    activity:
      "Propose a field campaign that documents unit contacts, stratigraphic relationships and alteration textures. No field location is asserted until a source-audited coordinate exists, and a proposed investigation is not a completed measurement.",
    evidence: "Interpreted",
    verification: "pending",
    routing_eligibility: {
      status: "unavailable",
      reason:
        "Objective text follows the published Mars 2020 science objectives, but no source-audited target coordinate exists.",
    },
  },
  {
    id: "jezero-objective-2",
    region_id: "jezero",
    title: "Ancient habitability assessment",
    description:
      "Published Mars 2020 objective: determine whether an ancient Jezero environment was habitable, using the geologic and mineralogical record of the crater floor, delta and lake deposits.",
    scientific_goal:
      "Assess whether ancient Jezero environments could have supported life.",
    geological_significance:
      "Delta and lacustrine deposits, carbonate-bearing units and alteration minerals are interpreted as evidence of sustained aqueous conditions. Habitability depends on reconstructing water activity, chemistry and preservation potential, not on the presence of water alone.",
    priority_category: "Published Mars 2020 science objective - location pending",
    coordinates: null,
    coordinate_reference: {
      body: "Mars",
      latitude_type: "planetocentric",
      longitude_direction: "east",
      longitude_range: "0-360",
    },
    coordinate_verified: false,
    source_ids: [
      "jezero-m2020-mission-overview",
      "jezero-m2020-science-objectives",
    ],
    activity:
      "Evaluate published habitability evidence before selecting a field site. A proposed site is not a verified sample point, and any location requires a per-product coordinate audit first.",
    evidence: "Interpreted",
    verification: "pending",
    routing_eligibility: {
      status: "unavailable",
      reason:
        "Objective text follows the published Mars 2020 science objectives, but no source-audited target coordinate exists.",
    },
  },
  {
    id: "jezero-objective-3",
    region_id: "jezero",
    title: "Sample caching for Mars Sample Return",
    description:
      "Published Mars 2020 objective: collect and cache the most promising samples representing Jezero's geologic diversity, with documented context, for potential return to Earth.",
    scientific_goal:
      "Select and document samples that represent Jezero's geologic diversity for potential Mars Sample Return.",
    geological_significance:
      "Returned samples would enable laboratory analyses that cannot be performed in situ. Sample context - unit, stratigraphy, alteration and setting - determines the scientific value of each cached sample, so the record must remain traceable across mission datasets.",
    priority_category: "Published Mars 2020 science objective - location pending",
    coordinates: null,
    coordinate_reference: {
      body: "Mars",
      latitude_type: "planetocentric",
      longitude_direction: "east",
      longitude_range: "0-360",
    },
    coordinate_verified: false,
    source_ids: [
      "jezero-m2020-sample-dossier",
      "jezero-m2020-science-objectives",
    ],
    activity:
      "Plan sample-context observations anchored to documented Perseverance sample and traverse records. Proposed astronaut sampling is not a completed observation, and traverse geometry must be verified per product before any display use.",
    evidence: "Interpreted",
    verification: "pending",
    routing_eligibility: {
      status: "unavailable",
      reason:
        "Objective text follows the published Mars 2020 science objectives, but no source-audited target coordinate exists.",
    },
  },
  {
    id: "jezero-objective-4",
    region_id: "jezero",
    title: "Biosignature search",
    description:
      "Published Mars 2020 objective: search for potential evidence of past life in Jezero materials, guided by assessments of habitability and biosignature preservation potential.",
    scientific_goal:
      "Search for potential biosignatures in materials with high preservation potential.",
    geological_significance:
      "Fine-grained lacustrine sediments, carbonates and silica-bearing deposits are interpreted as high-priority preservation targets. A positive detection requires distinguishing ancient life from abiotic processes, and preservation potential is not evidence of life by itself.",
    priority_category: "Published Mars 2020 science objective - location pending",
    coordinates: null,
    coordinate_reference: {
      body: "Mars",
      latitude_type: "planetocentric",
      longitude_direction: "east",
      longitude_range: "0-360",
    },
    coordinate_verified: false,
    source_ids: [
      "jezero-m2020-mission-overview",
      "jezero-m2020-science-objectives",
    ],
    activity:
      "Identify materials with high biosignature-preservation potential and document sampling and analysis context. No biosignature claim is made unless sample analysis supports one.",
    evidence: "Interpreted",
    verification: "pending",
    routing_eligibility: {
      status: "unavailable",
      reason:
        "Objective text follows the published Mars 2020 science objectives, but no source-audited target coordinate exists.",
    },
  },
  {
    id: "jezero-objective-5",
    region_id: "jezero",
    title: "Human-exploration preparation",
    description:
      "Published Mars 2020 objective: test technologies and gather environmental data that inform future human exploration - in-situ resource utilization, atmospheric dust, surface weather and entry/descent engineering.",
    scientific_goal:
      "Characterize environmental and engineering conditions that would affect future human surface operations.",
    geological_significance: null,
    priority_category: "Published Mars 2020 science objective - location pending",
    coordinates: null,
    coordinate_reference: {
      body: "Mars",
      latitude_type: "planetocentric",
      longitude_direction: "east",
      longitude_range: "0-360",
    },
    coordinate_verified: false,
    source_ids: ["jezero-meda-environment", "jezero-m2020-science-objectives"],
    activity:
      "Review historical MEDA observations and published technology-demonstration results as context. These are rover measurements, not forecasts, radiation dose models or operational support for astronauts.",
    evidence: "Interpreted",
    verification: "pending",
    routing_eligibility: {
      status: "unavailable",
      reason:
        "Objective text follows the published Mars 2020 science objectives, but no source-audited target coordinate exists.",
    },
  },
] satisfies Target[];
