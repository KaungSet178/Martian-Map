import type { Target } from "@/lib/contracts/region";

// Gale G-S2: Production scientific catalog with scenario objectives retired.
// Contains 4 source-backed interpreted geological objectives with authentic
// geographic representations (1 mapped extent, 2 approximate areas, 1 candidate search region).
export const targets = [
  {
    id: "gale-glen-torridon",
    region_id: "gale",
    title: "Glen Torridon",
    description:
      "Clay-bearing terrain investigated by Curiosity, adjoining Vera Rubin Ridge.",
    scientific_goal:
      "Compare mudstone and sandstone facies and evidence for changing lake and river environments.",
    geological_significance:
      "Clay-bearing terrain investigated by Curiosity, adjoining Vera Rubin Ridge.",
    priority_category: "Source-backed science area; no priority ranking",
    coordinates: null,
    coordinate_reference: {
      body: "Mars",
      latitude_type: "planetocentric",
      longitude_direction: "east",
      longitude_range: "0-360",
    },
    coordinate_verified: false,
    source_ids: [
      "gale-glen-torridon-reference",
      "gale-geology-publication",
      "gale-photo-source-glen",
    ],
    activity:
      "Proposed astronaut work: document bedding, grain size and stratigraphic contacts at a future independently located exposure.",
    evidence: "Interpreted",
    verification: "pending",
    routing_eligibility: {
      status: "unavailable",
      reason:
        "Geological area with approximate boundary; no precise waypoint or route eligibility. Specific sampling and outcrop targets require localized validation.",
    },
    feature_kind: "geological_area",
    location_notes:
      "Published sources (Fedo et al., 2022) document this stratigraphic clay-bearing trough. Georeferenced envelope reflects orbital CRISM and HiRISE mapping. Photographs and rover localizations establish scientific context only.",
    boundary: {
      status: "available",
      classification: "approximate",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [137.37, -4.745],
            [137.4, -4.72],
            [137.425, -4.74],
            [137.395, -4.765],
            [137.37, -4.745],
          ],
        ],
      },
      extent: {
        west_east: 137.37,
        south_latitude: -4.765,
        east_east: 137.425,
        north_latitude: -4.72,
      },
      source_ids: [
        "gale-glen-torridon-reference",
        "gale-geology-publication",
        "gale-photo-source-glen",
      ],
      limitations: [
        "Approximate stratigraphic trough envelope based on Fedo et al. (2022) and orbital CRISM clay-bearing unit bounds.",
        "Specific mudstone/sandstone contact facies are not localized to precise coordinates.",
        "Registration to operational CTX mosaic is approximate (+/- 50 m).",
      ],
      source_verified: true,
      processing_verified: true,
      registration_verified: false,
      uncertainty_m: 50.0,
    },
    location: {
      type: "area",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [137.37, -4.745],
            [137.4, -4.72],
            [137.425, -4.74],
            [137.395, -4.765],
            [137.37, -4.745],
          ],
        ],
      },
      extent: {
        west_east: 137.37,
        south_latitude: -4.765,
        east_east: 137.425,
        north_latitude: -4.72,
      },
      classification: "approximate",
      source_verified: true,
      processing_verified: true,
      registration_verified: false,
      source_ids: [
        "gale-glen-torridon-reference",
        "gale-geology-publication",
        "gale-photo-source-glen",
      ],
      limitations: [
        "Approximate stratigraphic trough envelope based on Fedo et al. (2022) and orbital CRISM clay-bearing unit bounds.",
        "Specific mudstone/sandstone contact facies are not localized to precise coordinates.",
        "Registration to operational CTX mosaic is approximate (+/- 50 m).",
      ],
      uncertainty_m: 50.0,
    },
    photographs: [
      {
        id: "gale-photo-pia23047",
        source_id: "gale-photo-source-glen",
        product_id: "PIA23047",
        source_url:
          "https://science.nasa.gov/photojournal/curiosity-on-the-clay-unit/",
        image_url: "/photos/gale/PIA23047.jpg",
        width: 1328,
        height: 1184,
        alt: "Layered tan bedrock beside Curiosity in Glen Torridon.",
        acquisition_date: "2019-02-10",
        sol: 2316,
        instrument: "Curiosity Mastcam",
        caption:
          "Layered bedrock photographed during the Glen Torridon exploration campaign.",
        attribution: "NASA/JPL-Caltech/MSSS",
        association:
          "NASA explicitly associates this observation with Glen Torridon; it is not an independently located sampling point.",
        processing:
          "NASA-provided 1328px browse rendition. Source does not specify a color-calibration method; none is asserted here.",
        limitations: [
          "Ground-level browse photograph, not a georeferenced map or verified feature coordinate.",
          "The depicted formation and the observer location must not be treated as interchangeable.",
        ],
      },
    ],
  },
  {
    id: "gale-vera-rubin-ridge",
    region_id: "gale",
    title: "Vera Rubin Ridge",
    description:
      "Hematite-bearing ridge investigated using orbital and rover observations.",
    scientific_goal:
      "Investigate how iron mineralogy, rock resistance and alteration relate to stratigraphy.",
    geological_significance:
      "Hematite-bearing ridge investigated using orbital and rover observations.",
    priority_category: "Source-backed science area; no priority ranking",
    coordinates: null,
    coordinate_reference: {
      body: "Mars",
      latitude_type: "planetocentric",
      longitude_direction: "east",
      longitude_range: "0-360",
    },
    coordinate_verified: false,
    source_ids: [
      "gale-vera-rubin",
      "gale-geology-publication",
      "gale-photo-source-ridge",
    ],
    activity:
      "Proposed astronaut work: compare textures, veins and iron-mineral signatures across documented units once coordinates are verified.",
    evidence: "Interpreted",
    verification: "pending",
    routing_eligibility: {
      status: "unavailable",
      reason:
        "Geological area with approximate boundary; no precise waypoint or route eligibility. Outcrop selection and traversability require tactical evaluation.",
    },
    feature_kind: "geological_area",
    location_notes:
      "Published sources (Fraeman et al., 2020) document this geomorphic hematite ridge. Envelope reflects orbital CRISM and HiRISE mapping. Photographs and rover localizations establish scientific context only.",
    boundary: {
      status: "available",
      classification: "approximate",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [137.355, -4.715],
            [137.375, -4.69],
            [137.415, -4.705],
            [137.4, -4.73],
            [137.355, -4.715],
          ],
        ],
      },
      extent: {
        west_east: 137.355,
        south_latitude: -4.73,
        east_east: 137.415,
        north_latitude: -4.69,
      },
      source_ids: [
        "gale-vera-rubin",
        "gale-geology-publication",
        "gale-photo-source-ridge",
      ],
      limitations: [
        "Approximate geomorphic ridge envelope derived from Fraeman et al. (2020) and orbital CRISM hematite signatures.",
        "Individual outcrop boundaries and local rover stations are not represented by this regional envelope.",
        "Registration to operational CTX mosaic is approximate (+/- 50 m).",
      ],
      source_verified: true,
      processing_verified: true,
      registration_verified: false,
      uncertainty_m: 50.0,
    },
    location: {
      type: "area",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [137.355, -4.715],
            [137.375, -4.69],
            [137.415, -4.705],
            [137.4, -4.73],
            [137.355, -4.715],
          ],
        ],
      },
      extent: {
        west_east: 137.355,
        south_latitude: -4.73,
        east_east: 137.415,
        north_latitude: -4.69,
      },
      classification: "approximate",
      source_verified: true,
      processing_verified: true,
      registration_verified: false,
      source_ids: [
        "gale-vera-rubin",
        "gale-geology-publication",
        "gale-photo-source-ridge",
      ],
      limitations: [
        "Approximate geomorphic ridge envelope derived from Fraeman et al. (2020) and orbital CRISM hematite signatures.",
        "Individual outcrop boundaries and local rover stations are not represented by this regional envelope.",
        "Registration to operational CTX mosaic is approximate (+/- 50 m).",
      ],
      uncertainty_m: 50.0,
    },
    photographs: [
      {
        id: "gale-photo-pia21851",
        source_id: "gale-photo-source-ridge",
        product_id: "PIA21851",
        source_url:
          "https://science.nasa.gov/photojournal/looking-up-at-layers-of-vera-rubin-ridge-on-sol-1790/",
        image_url: "/photos/gale/PIA21851.jpg",
        width: 1536,
        height: 221,
        alt: "Wide panorama of stratified rocks on the lower Vera Rubin Ridge.",
        acquisition_date: "2017-08-19",
        sol: 1790,
        instrument: "Curiosity Mastcam, right camera",
        caption:
          "Sedimentary layering in Vera Rubin Ridge, observed remotely before the ridge ascent.",
        attribution: "NASA/JPL-Caltech/MSSS",
        association:
          "The NASA description identifies the ridge as the subject. The rover was north of it; the camera position is not the ridge location.",
        processing:
          "NASA panorama of 13 images, white-balanced for an Earth daylight appearance; NASA-provided 1536px browse rendition. Black mosaic margins retained.",
        limitations: [
          "Ground-level browse photograph, not a georeferenced map or verified feature coordinate.",
          "The depicted formation and the observer location must not be treated as interchangeable.",
        ],
      },
    ],
  },
  {
    id: "gale-sulfate-units",
    region_id: "gale",
    title: "Sulfate-bearing geological units",
    description:
      "Published orbital mineralogical context above the clay-bearing terrain on lower Mount Sharp.",
    scientific_goal:
      "Test how sulfate mineralogy relates to changing water chemistry, deposition and alteration.",
    geological_significance:
      "Published orbiter and rover analyses link the transition to depositional changes, erosion and later alteration; orbital sulfate signatures do not uniquely establish primary depositional conditions.",
    priority_category: "Source-backed science area; no priority ranking",
    coordinates: null,
    coordinate_reference: {
      body: "Mars",
      latitude_type: "planetocentric",
      longitude_direction: "east",
      longitude_range: "0-360",
    },
    coordinate_verified: false,
    source_ids: [
      "gale-clay-sulfate",
      "gale-photo-source-sulfate",
      "gale-usgs-sulfate-study",
    ],
    activity:
      "Proposed astronaut work: log stratigraphic and mineralogical contrasts without assuming a unit is one precise sampling point.",
    evidence: "Interpreted",
    verification: "pending",
    routing_eligibility: {
      status: "unavailable",
      reason:
        "Geological area with candidate search region; no precise waypoint or route eligibility. Regional layered sulfates require local reconnaissance.",
    },
    feature_kind: "geological_area",
    location_notes:
      "Published sources (Meyer et al., 2024; Rapin et al., 2021) document the lower Mount Sharp sulfate transition. Candidate search region reflects orbital mineral detection and rover ascent corridor. Photographs and rover localizations establish scientific context only.",
    boundary: {
      status: "available",
      classification: "candidate",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [137.38, -4.78],
            [137.41, -4.76],
            [137.435, -4.785],
            [137.405, -4.805],
            [137.38, -4.78],
          ],
        ],
      },
      extent: {
        west_east: 137.38,
        south_latitude: -4.805,
        east_east: 137.435,
        north_latitude: -4.76,
      },
      source_ids: [
        "gale-clay-sulfate",
        "gale-photo-source-sulfate",
        "gale-usgs-sulfate-study",
      ],
      limitations: [
        "Candidate search region across lower Mount Sharp sulfate-bearing strata (Meyer et al., 2024; Rapin et al., 2021).",
        "Does not guarantee mineral homogeneity or continuous exposure across the region.",
        "Registration to operational CTX mosaic is approximate (+/- 100 m).",
      ],
      source_verified: true,
      processing_verified: true,
      registration_verified: false,
      uncertainty_m: 100.0,
    },
    location: {
      type: "area",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [137.38, -4.78],
            [137.41, -4.76],
            [137.435, -4.785],
            [137.405, -4.805],
            [137.38, -4.78],
          ],
        ],
      },
      extent: {
        west_east: 137.38,
        south_latitude: -4.805,
        east_east: 137.435,
        north_latitude: -4.76,
      },
      classification: "candidate",
      source_verified: true,
      processing_verified: true,
      registration_verified: false,
      source_ids: [
        "gale-clay-sulfate",
        "gale-photo-source-sulfate",
        "gale-usgs-sulfate-study",
      ],
      limitations: [
        "Candidate search region across lower Mount Sharp sulfate-bearing strata (Meyer et al., 2024; Rapin et al., 2021).",
        "Does not guarantee mineral homogeneity or continuous exposure across the region.",
        "Registration to operational CTX mosaic is approximate (+/- 100 m).",
      ],
      uncertainty_m: 100.0,
    },
    photographs: [
      {
        id: "gale-photo-pia26551",
        source_id: "gale-photo-source-sulfate",
        product_id: "PIA26551",
        source_url:
          "https://science.nasa.gov/photojournal/curiosity-looks-downslope-from-the-sulfate-unit/",
        image_url: "/photos/gale/PIA26551.jpg",
        width: 1536,
        height: 251,
        alt: "Panoramic downslope view of Mount Sharp terrain and the distant Gale rim.",
        acquisition_date: "2025-02-07",
        sol: 4447,
        instrument: "Curiosity Mastcam",
        caption:
          "A downslope view across Gale Crater during Curiosity exploration of the sulfate-bearing unit.",
        attribution: "NASA/JPL-Caltech/MSSS",
        association:
          "NASA places the observer in the sulfate-bearing unit. This view does not establish the mineralogy or boundary of every visible surface.",
        processing:
          "NASA color adjustment for Earth-like lighting; NASA-provided 1536px browse rendition. Panorama seams and margins retained.",
        limitations: [
          "Ground-level browse photograph, not a georeferenced map or verified feature coordinate.",
          "The depicted formation and the observer location must not be treated as interchangeable.",
        ],
      },
    ],
  },
  {
    id: "gale-gediz-vallis",
    region_id: "gale",
    title: "Gediz Vallis",
    description:
      "Debris-filled channel and associated deposits documented by Curiosity; formation mechanisms retain uncertainty.",
    scientific_goal:
      "Compare channel/debris relationships with the older Mount Sharp strata and later water activity.",
    geological_significance:
      "Debris-filled channel and associated deposits documented by Curiosity; formation mechanisms retain uncertainty.",
    priority_category: "Source-backed science area; no priority ranking",
    coordinates: null,
    coordinate_reference: {
      body: "Mars",
      latitude_type: "planetocentric",
      longitude_direction: "east",
      longitude_range: "0-360",
    },
    coordinate_verified: false,
    source_ids: [
      "gale-arc-pass-geology",
      "gale-gediz-vallis-reference",
      "gale-photo-source-navcam",
      "gale-gediz-gazetteer",
    ],
    activity:
      "Proposed astronaut work: document clast populations, contacts and transport indicators at a future verified site.",
    evidence: "Interpreted",
    verification: "pending",
    routing_eligibility: {
      status: "unavailable",
      reason:
        "Geological area with mapped extent; no precise waypoint or route eligibility. Terrain traversability and hazards require site-specific evaluation.",
    },
    feature_kind: "geological_area",
    location_notes:
      "Published 1:250 HiRISE photogeological mapping (Davis et al., 2026, JGR Planets / Figshare) defines the mapped extent in Arc Pass and the upper Gediz Vallis corridor. USGS/IAU Gazetteer feature 15571 provides broader nomenclature extent.",
    boundary: {
      status: "available",
      classification: "mapped",
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [137.406597, -4.789073],
              [137.411053, -4.789073],
              [137.411053, -4.785335],
              [137.406597, -4.785335],
              [137.406597, -4.789073],
            ],
          ],
        ],
      },
      extent: {
        west_east: 137.406597,
        south_latitude: -4.789073,
        east_east: 137.411053,
        north_latitude: -4.785335,
      },
      source_ids: [
        "gale-arc-pass-geology",
        "gale-gediz-vallis-reference",
        "gale-gediz-gazetteer",
      ],
      limitations: [
        "Mapped photogeological extent from Davis et al. (2026) 1:250 HiRISE mapping in Arc Pass / Upper Gediz Vallis corridor.",
        "Mapping boundary does not imply uniform traversability or single-point sampling.",
      ],
      source_verified: true,
      processing_verified: true,
      registration_verified: true,
      uncertainty_m: 5.0,
    },
    location: {
      type: "area",
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [137.406597, -4.789073],
              [137.411053, -4.789073],
              [137.411053, -4.785335],
              [137.406597, -4.785335],
              [137.406597, -4.789073],
            ],
          ],
        ],
      },
      extent: {
        west_east: 137.406597,
        south_latitude: -4.789073,
        east_east: 137.411053,
        north_latitude: -4.785335,
      },
      classification: "mapped",
      source_verified: true,
      processing_verified: true,
      registration_verified: true,
      source_ids: [
        "gale-arc-pass-geology",
        "gale-gediz-vallis-reference",
        "gale-gediz-gazetteer",
      ],
      limitations: [
        "Mapped photogeological extent from Davis et al. (2026) 1:250 HiRISE mapping in Arc Pass / Upper Gediz Vallis corridor.",
        "Mapping boundary does not imply uniform traversability or single-point sampling.",
      ],
      uncertainty_m: 5.0,
    },
    photographs: [
      {
        id: "gale-photo-nlb_781532029edr_f1091446ncam00379m_",
        source_id: "gale-photo-source-navcam",
        product_id: "NLB_781532029EDR_F1091446NCAM00379M_",
        source_url:
          "https://science.nasa.gov/blog/sols-4327-4328-on-the-road-again/",
        image_url: "/photos/gale/NLB_781532029EDR_F1091446NCAM00379M_.jpg",
        width: 1024,
        height: 1024,
        alt: "Grayscale Navcam view of rocky terrain and distant Gediz Vallis deposits.",
        acquisition_date: "2024-10-07",
        sol: 4326,
        instrument: "Curiosity Left Navigation Camera",
        caption:
          "Surface textures and a view toward Gediz Vallis deposits from the adjacent sulfate-bearing terrain.",
        attribution: "NASA/JPL-Caltech",
        association:
          "NASA mission commentary identifies channel deposits in the view after Curiosity left Gediz Vallis; this is a remote observation, not a located channel sampling site.",
        processing:
          "NASA-hosted 1024px browse image, associated with raw-image identifier NLB_781532029EDR_F1091446NCAM00379M_. Acquisition time 01:16:16 UTC is stated by NASA; no additional calibration is claimed.",
        limitations: [
          "Ground-level browse photograph, not a georeferenced map or verified feature coordinate.",
          "The depicted formation and the observer location must not be treated as interchangeable.",
        ],
      },
    ],
  },
] satisfies Target[];
