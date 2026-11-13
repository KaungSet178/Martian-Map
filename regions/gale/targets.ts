import type { Target } from "@/lib/contracts/region";

// Gale G1: source-backed content; unknown values remain explicit.
export const targets = [
  {
    "id": "gale-objective-1",
    "region_id": "gale",
    "title": "Layered sedimentary unit",
    "description": "Proposed astronaut investigation informed by published Curiosity science; location pending independent source audit.",
    "scientific_goal": "Investigate how sedimentary layers could record environmental change.",
    "geological_significance": "Published stratigraphic correlations connect lake mudstones and cross-bedded sandstones across Glen Torridon and Vera Rubin Ridge; geomorphic boundaries need not coincide with formation boundaries.",
    "priority_category": "Unranked scenario objective",
    "coordinates": null,
    "coordinate_reference": {
      "body": "Mars",
      "latitude_type": "planetocentric",
      "longitude_direction": "east",
      "longitude_range": "0-360"
    },
    "coordinate_verified": false,
    "source_ids": [
      "gale-geology-publication",
      "gale-clay-sulfate"
    ],
    "activity": "Propose observations of bedding and stratigraphic relationships.",
    "evidence": "Scenario",
    "verification": "pending",
    "routing_eligibility": {
      "status": "unavailable",
      "reason": "Scientific context is documented; precise geometry, terrain eligibility and hazard policy remain unavailable."
    }
  },
  {
    "id": "gale-objective-2",
    "region_id": "gale",
    "title": "Clay-to-sulfate transition",
    "description": "Proposed astronaut investigation informed by published Curiosity science; location pending independent source audit.",
    "scientific_goal": "Compare mineralogical context relevant to Mars’s climate history.",
    "geological_significance": "Orbital clay and sulfate signatures motivate testing changing aqueous environments; mineralogy alone does not uniquely determine climatic history.",
    "priority_category": "Unranked scenario objective",
    "coordinates": null,
    "coordinate_reference": {
      "body": "Mars",
      "latitude_type": "planetocentric",
      "longitude_direction": "east",
      "longitude_range": "0-360"
    },
    "coordinate_verified": false,
    "source_ids": [
      "gale-geology-publication",
      "gale-clay-sulfate"
    ],
    "activity": "Plan comparative observations after source and location verification.",
    "evidence": "Scenario",
    "verification": "pending",
    "routing_eligibility": {
      "status": "unavailable",
      "reason": "Scientific context is documented; precise geometry, terrain eligibility and hazard policy remain unavailable."
    }
  },
  {
    "id": "gale-objective-3",
    "region_id": "gale",
    "title": "Sulfate-bearing outcrop",
    "description": "Proposed astronaut investigation informed by published Curiosity science; location pending independent source audit.",
    "scientific_goal": "Investigate a proposed objective about changing water conditions.",
    "geological_significance": "Sulfate-bearing strata record a later part of the Mount Sharp sedimentary succession; depositional and subsequent alteration effects require distinction.",
    "priority_category": "Unranked scenario objective",
    "coordinates": null,
    "coordinate_reference": {
      "body": "Mars",
      "latitude_type": "planetocentric",
      "longitude_direction": "east",
      "longitude_range": "0-360"
    },
    "coordinate_verified": false,
    "source_ids": [
      "gale-geology-publication",
      "gale-clay-sulfate"
    ],
    "activity": "Document bedding and erosion patterns at a future verified site.",
    "evidence": "Scenario",
    "verification": "pending",
    "routing_eligibility": {
      "status": "unavailable",
      "reason": "Scientific context is documented; precise geometry, terrain eligibility and hazard policy remain unavailable."
    }
  },
  {
    "id": "gale-glen-torridon",
    "region_id": "gale",
    "title": "Glen Torridon",
    "description": "Clay-bearing terrain investigated by Curiosity, adjoining Vera Rubin Ridge.",
    "scientific_goal": "Compare mudstone and sandstone facies and evidence for changing lake and river environments.",
    "geological_significance": "Clay-bearing terrain investigated by Curiosity, adjoining Vera Rubin Ridge.",
    "priority_category": "Source-backed science area; no priority ranking",
    "coordinates": null,
    "coordinate_reference": {
      "body": "Mars",
      "latitude_type": "planetocentric",
      "longitude_direction": "east",
      "longitude_range": "0-360"
    },
    "coordinate_verified": false,
    "source_ids": [
      "gale-glen-torridon-reference",
      "gale-geology-publication"
    ],
    "activity": "Proposed astronaut work: document bedding, grain size and stratigraphic contacts at a future independently located exposure.",
    "evidence": "Interpreted",
    "verification": "pending",
    "routing_eligibility": {
      "status": "unavailable",
      "reason": "Published scientific area verified in references; no precise point/polygon geometry independently registered. No map marker or route eligibility."
    }
  },
  {
    "id": "gale-vera-rubin-ridge",
    "region_id": "gale",
    "title": "Vera Rubin Ridge",
    "description": "Hematite-bearing ridge investigated using orbital and rover observations.",
    "scientific_goal": "Investigate how iron mineralogy, rock resistance and alteration relate to stratigraphy.",
    "geological_significance": "Hematite-bearing ridge investigated using orbital and rover observations.",
    "priority_category": "Source-backed science area; no priority ranking",
    "coordinates": null,
    "coordinate_reference": {
      "body": "Mars",
      "latitude_type": "planetocentric",
      "longitude_direction": "east",
      "longitude_range": "0-360"
    },
    "coordinate_verified": false,
    "source_ids": [
      "gale-vera-rubin",
      "gale-geology-publication"
    ],
    "activity": "Proposed astronaut work: compare textures, veins and iron-mineral signatures across documented units once coordinates are verified.",
    "evidence": "Interpreted",
    "verification": "pending",
    "routing_eligibility": {
      "status": "unavailable",
      "reason": "Published scientific area verified in references; no precise point/polygon geometry independently registered. No map marker or route eligibility."
    }
  },
  {
    "id": "gale-sulfate-units",
    "region_id": "gale",
    "title": "Sulfate-bearing geological units",
    "description": "Published orbital mineralogical context above the clay-bearing terrain on lower Mount Sharp.",
    "scientific_goal": "Test how sulfate mineralogy relates to changing water chemistry, deposition and alteration.",
    "geological_significance": "Published orbital mineralogical context above the clay-bearing terrain on lower Mount Sharp.",
    "priority_category": "Source-backed science area; no priority ranking",
    "coordinates": null,
    "coordinate_reference": {
      "body": "Mars",
      "latitude_type": "planetocentric",
      "longitude_direction": "east",
      "longitude_range": "0-360"
    },
    "coordinate_verified": false,
    "source_ids": [
      "gale-clay-sulfate"
    ],
    "activity": "Proposed astronaut work: log stratigraphic and mineralogical contrasts without assuming a unit is one precise sampling point.",
    "evidence": "Interpreted",
    "verification": "pending",
    "routing_eligibility": {
      "status": "unavailable",
      "reason": "Published scientific area verified in references; no precise point/polygon geometry independently registered. No map marker or route eligibility."
    }
  },
  {
    "id": "gale-gediz-vallis",
    "region_id": "gale",
    "title": "Gediz Vallis",
    "description": "Debris-filled channel and associated deposits documented by Curiosity; formation mechanisms retain uncertainty.",
    "scientific_goal": "Compare channel/debris relationships with the older Mount Sharp strata and later water activity.",
    "geological_significance": "Debris-filled channel and associated deposits documented by Curiosity; formation mechanisms retain uncertainty.",
    "priority_category": "Source-backed science area; no priority ranking",
    "coordinates": null,
    "coordinate_reference": {
      "body": "Mars",
      "latitude_type": "planetocentric",
      "longitude_direction": "east",
      "longitude_range": "0-360"
    },
    "coordinate_verified": false,
    "source_ids": [
      "gale-gediz-vallis-reference"
    ],
    "activity": "Proposed astronaut work: document clast populations, contacts and transport indicators at a future verified site.",
    "evidence": "Interpreted",
    "verification": "pending",
    "routing_eligibility": {
      "status": "unavailable",
      "reason": "Published scientific area verified in references; no precise point/polygon geometry independently registered. No map marker or route eligibility."
    }
  }
] satisfies Target[];
