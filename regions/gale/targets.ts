import type { Target } from "@/lib/contracts/region";

// G2: source-backed area context and photos; unverified geometry stays unavailable.
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
    },
    "feature_kind": "scenario_objective"
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
    },
    "feature_kind": "scenario_objective"
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
    },
    "feature_kind": "scenario_objective"
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
      "gale-geology-publication",
      "gale-photo-source-glen"
    ],
    "activity": "Proposed astronaut work: document bedding, grain size and stratigraphic contacts at a future independently located exposure.",
    "evidence": "Interpreted",
    "verification": "pending",
    "routing_eligibility": {
      "status": "unavailable",
      "reason": "Geological area with unverified boundary; no precise waypoint or route eligibility. Photographs establish scientific context only."
    },
    "feature_kind": "geological_area",
    "location_notes": "Published sources document this science area and the associated observation. A precise point and a validated georeferenced boundary remain unavailable. Photographs and rover localizations are not used to infer either.",
    "boundary": {
      "status": "unavailable",
      "reason": "No source geometry with reviewed coordinates, CRS, coverage and registration has been validated for this catalog entry."
    },
    "photographs": [
      {
        "id": "gale-photo-pia23047",
        "source_id": "gale-photo-source-glen",
        "product_id": "PIA23047",
        "source_url": "https://science.nasa.gov/photojournal/curiosity-on-the-clay-unit/",
        "image_url": "/photos/gale/PIA23047.jpg",
        "width": 1328,
        "height": 1184,
        "alt": "Layered tan bedrock beside Curiosity in Glen Torridon.",
        "acquisition_date": "2019-02-10",
        "sol": 2316,
        "instrument": "Curiosity Mastcam",
        "caption": "Layered bedrock photographed during the Glen Torridon exploration campaign.",
        "attribution": "NASA/JPL-Caltech/MSSS",
        "association": "NASA explicitly associates this observation with Glen Torridon; it is not an independently located sampling point.",
        "processing": "NASA-provided 1328px browse rendition. Source does not specify a color-calibration method; none is asserted here.",
        "limitations": [
          "Ground-level browse photograph, not a georeferenced map or verified feature coordinate.",
          "The depicted formation and the observer location must not be treated as interchangeable."
        ]
      }
    ]
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
      "gale-geology-publication",
      "gale-photo-source-ridge"
    ],
    "activity": "Proposed astronaut work: compare textures, veins and iron-mineral signatures across documented units once coordinates are verified.",
    "evidence": "Interpreted",
    "verification": "pending",
    "routing_eligibility": {
      "status": "unavailable",
      "reason": "Geological area with unverified boundary; no precise waypoint or route eligibility. Photographs establish scientific context only."
    },
    "feature_kind": "geological_area",
    "location_notes": "Published sources document this science area and the associated observation. A precise point and a validated georeferenced boundary remain unavailable. Photographs and rover localizations are not used to infer either.",
    "boundary": {
      "status": "unavailable",
      "reason": "No source geometry with reviewed coordinates, CRS, coverage and registration has been validated for this catalog entry."
    },
    "photographs": [
      {
        "id": "gale-photo-pia21851",
        "source_id": "gale-photo-source-ridge",
        "product_id": "PIA21851",
        "source_url": "https://science.nasa.gov/photojournal/looking-up-at-layers-of-vera-rubin-ridge-on-sol-1790/",
        "image_url": "/photos/gale/PIA21851.jpg",
        "width": 1536,
        "height": 221,
        "alt": "Wide panorama of stratified rocks on the lower Vera Rubin Ridge.",
        "acquisition_date": "2017-08-19",
        "sol": 1790,
        "instrument": "Curiosity Mastcam, right camera",
        "caption": "Sedimentary layering in Vera Rubin Ridge, observed remotely before the ridge ascent.",
        "attribution": "NASA/JPL-Caltech/MSSS",
        "association": "The NASA description identifies the ridge as the subject. The rover was north of it; the camera position is not the ridge location.",
        "processing": "NASA panorama of 13 images, white-balanced for an Earth daylight appearance; NASA-provided 1536px browse rendition. Black mosaic margins retained.",
        "limitations": [
          "Ground-level browse photograph, not a georeferenced map or verified feature coordinate.",
          "The depicted formation and the observer location must not be treated as interchangeable."
        ]
      }
    ]
  },
  {
    "id": "gale-sulfate-units",
    "region_id": "gale",
    "title": "Sulfate-bearing geological units",
    "description": "Published orbital mineralogical context above the clay-bearing terrain on lower Mount Sharp.",
    "scientific_goal": "Test how sulfate mineralogy relates to changing water chemistry, deposition and alteration.",
    "geological_significance": "Published orbiter and rover analyses link the transition to depositional changes, erosion and later alteration; orbital sulfate signatures do not uniquely establish primary depositional conditions.",
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
      "gale-clay-sulfate",
      "gale-photo-source-sulfate",
      "gale-usgs-sulfate-study"
    ],
    "activity": "Proposed astronaut work: log stratigraphic and mineralogical contrasts without assuming a unit is one precise sampling point.",
    "evidence": "Interpreted",
    "verification": "pending",
    "routing_eligibility": {
      "status": "unavailable",
      "reason": "Geological area with unverified boundary; no precise waypoint or route eligibility. Photographs establish scientific context only."
    },
    "feature_kind": "geological_area",
    "location_notes": "Published sources document this science area and the associated observation. A precise point and a validated georeferenced boundary remain unavailable. Photographs and rover localizations are not used to infer either.",
    "boundary": {
      "status": "unavailable",
      "reason": "No source geometry with reviewed coordinates, CRS, coverage and registration has been validated for this catalog entry."
    },
    "photographs": [
      {
        "id": "gale-photo-pia26551",
        "source_id": "gale-photo-source-sulfate",
        "product_id": "PIA26551",
        "source_url": "https://science.nasa.gov/photojournal/curiosity-looks-downslope-from-the-sulfate-unit/",
        "image_url": "/photos/gale/PIA26551.jpg",
        "width": 1536,
        "height": 251,
        "alt": "Panoramic downslope view of Mount Sharp terrain and the distant Gale rim.",
        "acquisition_date": "2025-02-07",
        "sol": 4447,
        "instrument": "Curiosity Mastcam",
        "caption": "A downslope view across Gale Crater during Curiosity exploration of the sulfate-bearing unit.",
        "attribution": "NASA/JPL-Caltech/MSSS",
        "association": "NASA places the observer in the sulfate-bearing unit. This view does not establish the mineralogy or boundary of every visible surface.",
        "processing": "NASA color adjustment for Earth-like lighting; NASA-provided 1536px browse rendition. Panorama seams and margins retained.",
        "limitations": [
          "Ground-level browse photograph, not a georeferenced map or verified feature coordinate.",
          "The depicted formation and the observer location must not be treated as interchangeable."
        ]
      }
    ]
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
      "gale-gediz-vallis-reference",
      "gale-photo-source-navcam",
      "gale-gediz-gazetteer"
    ],
    "activity": "Proposed astronaut work: document clast populations, contacts and transport indicators at a future verified site.",
    "evidence": "Interpreted",
    "verification": "pending",
    "routing_eligibility": {
      "status": "unavailable",
      "reason": "Geological area with unverified boundary; no precise waypoint or route eligibility. Photographs establish scientific context only."
    },
    "feature_kind": "geological_area",
    "location_notes": "NASA documents the channel and associated observations. The USGS/IAU Gazetteer publishes a named-feature center and extent, with an unknown control network. These are not a precise sampling site or validated geological-deposit boundary. No point or polygon is rendered.",
    "boundary": {
      "status": "unavailable",
      "reason": "A USGS/IAU nomenclature polygon is available, but its unknown control network and applicability to geological deposits have not been validated. It remains unavailable as map geometry."
    },
    "photographs": [
      {
        "id": "gale-photo-nlb_781532029edr_f1091446ncam00379m_",
        "source_id": "gale-photo-source-navcam",
        "product_id": "NLB_781532029EDR_F1091446NCAM00379M_",
        "source_url": "https://science.nasa.gov/blog/sols-4327-4328-on-the-road-again/",
        "image_url": "/photos/gale/NLB_781532029EDR_F1091446NCAM00379M_.jpg",
        "width": 1024,
        "height": 1024,
        "alt": "Grayscale Navcam view of rocky terrain and distant Gediz Vallis deposits.",
        "acquisition_date": "2024-10-07",
        "sol": 4326,
        "instrument": "Curiosity Left Navigation Camera",
        "caption": "Surface textures and a view toward Gediz Vallis deposits from the adjacent sulfate-bearing terrain.",
        "attribution": "NASA/JPL-Caltech",
        "association": "NASA mission commentary identifies channel deposits in the view after Curiosity left Gediz Vallis; this is a remote observation, not a located channel sampling site.",
        "processing": "NASA-hosted 1024px browse image, associated with raw-image identifier NLB_781532029EDR_F1091446NCAM00379M_. Acquisition time 01:16:16 UTC is stated by NASA; no additional calibration is claimed.",
        "limitations": [
          "Ground-level browse photograph, not a georeferenced map or verified feature coordinate.",
          "The depicted formation and the observer location must not be treated as interchangeable."
        ]
      }
    ]
  }
] satisfies Target[];
