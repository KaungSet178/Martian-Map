import type { Target } from "@/lib/contracts/region";

// Region-owned content. Verified and classified in milestone JZ-T2.
// Target 1: USGS SIM 3464 mapped crater floor units (Nle Lower etched unit / Séítah formation).
// Target 2: USGS SIM 3464 mapped Western Delta fan deposits (NHjf2 Jezero fan 2 unit).
// Target 3: Verified Three Forks Sample Depot point (Williams et al., 2023, 54th LPSC #2618).
// Target 4: Approximate Delta Front biosignature search corridor (Scheller et al., 2022).
// Target 5: Mission-wide human-exploration technology demonstrations (location unavailable).
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
      "Jezero's record spans an ancient crater floor, lacustrine sedimentary system, and river delta. Geologic units Nle (Lower etched unit, Séítah formation) and Njf (Jezero floor unit, Máaz formation) preserve the earliest volcanic and aqueous history within the crater basin (Sun & Stack 2020; Farley et al. 2020).",
    priority_category: "Published Mars 2020 science objective - mapped floor geology",
    coordinates: null,
    coordinate_reference: {
      body: "Mars",
      latitude_type: "planetocentric",
      longitude_direction: "east",
      longitude_range: "0-360",
    },
    coordinate_verified: false,
    source_ids: [
      "jezero-usgs-sim3464",
      "jezero-m2020-mission-overview",
      "jezero-m2020-science-objectives",
    ],
    activity:
      "Document unit contacts, stratigraphic relationships, and alteration textures across the crater floor. Geological unit boundaries are mapped regional extents, not point destinations.",
    evidence: "Interpreted",
    verification: "pending",
    feature_kind: "geological_area",
    location_notes:
      "Published 1:75,000 USGS SIM 3464 geological mapping (Sun & Stack, 2020) defines the mapped floor units: Lower etched unit (Nle, Séítah olivine-cumulate formation) and Jezero floor unit (Njf, Máaz basaltic-andesite formation). Boundaries reflect planetary-referenced geologic mapping on the Mars 2000 sphere datum.",
    boundary: {
      status: "available",
      classification: "mapped",
      geometry: {
        type: "MultiPolygon",
        coordinates: [[[[77.452493,18.46493],[77.457212,18.463854],[77.460253,18.462036],[77.461916,18.459476],[77.462252,18.456454],[77.461884,18.454039],[77.452454,18.448592],[77.44946,18.443735],[77.449064,18.439684],[77.451626,18.428302],[77.449194,18.426738],[77.43702,18.432757],[77.43358,18.431225],[77.432632,18.429346],[77.432894,18.425037],[77.431844,18.419745],[77.430493,18.416138],[77.426619,18.412766],[77.418359,18.408464],[77.416717,18.40091],[77.408714,18.393283],[77.407586,18.380523],[77.405149,18.389831],[77.401381,18.393546],[77.40316,18.398464],[77.401624,18.406405],[77.402789,18.406147],[77.40373,18.406259],[77.40514,18.407432],[77.405963,18.408437],[77.406786,18.409497],[77.406785,18.410613],[77.406314,18.411338],[77.405307,18.411728],[77.406173,18.412685],[77.421255,18.418931],[77.422883,18.421115],[77.423325,18.425007],[77.419178,18.431717],[77.421015,18.438066],[77.419144,18.443894],[77.419379,18.446546],[77.421434,18.448178],[77.428291,18.44726],[77.432929,18.449483],[77.437825,18.453376],[77.439617,18.457236],[77.442706,18.45845],[77.444586,18.46365],[77.452493,18.46493]]],[[[77.471893,18.541668],[77.473618,18.541436],[77.481601,18.533431],[77.485206,18.531554],[77.486621,18.523714],[77.484408,18.522339],[77.484395,18.520857],[77.490871,18.52012],[77.498063,18.515923],[77.496536,18.509568],[77.492494,18.506371],[77.490233,18.50189],[77.472606,18.503775],[77.468038,18.506281],[77.468209,18.508923],[77.472408,18.512353],[77.47442,18.515683],[77.473806,18.528398],[77.472107,18.530527],[77.468643,18.532239],[77.457725,18.533768],[77.453773,18.536315],[77.456538,18.535921],[77.461983,18.538004],[77.463258,18.537463],[77.465785,18.54065],[77.471893,18.541668]]]],
      },
      extent: {"west_east":77.401381,"east_east":77.498063,"south_latitude":18.380523,"north_latitude":18.541668},
      source_ids: ["jezero-usgs-sim3464"],
      source_verified: true,
      processing_verified: true,
      registration_verified: false,
      uncertainty_m: 150,
      limitations: [
        "USGS SIM 3464 1:75,000 mapping; contact positional uncertainty ~100-200 m.",
        "Geological unit extent; not a discrete navigational waypoint.",
        "Independent operations CTX registration pending.",
        "Does not imply uniform trafficability or mineral distribution across the unit.",
      ],
    },
    location: {
      type: "area",
      geometry: {
        type: "MultiPolygon",
        coordinates: [[[[77.452493,18.46493],[77.457212,18.463854],[77.460253,18.462036],[77.461916,18.459476],[77.462252,18.456454],[77.461884,18.454039],[77.452454,18.448592],[77.44946,18.443735],[77.449064,18.439684],[77.451626,18.428302],[77.449194,18.426738],[77.43702,18.432757],[77.43358,18.431225],[77.432632,18.429346],[77.432894,18.425037],[77.431844,18.419745],[77.430493,18.416138],[77.426619,18.412766],[77.418359,18.408464],[77.416717,18.40091],[77.408714,18.393283],[77.407586,18.380523],[77.405149,18.389831],[77.401381,18.393546],[77.40316,18.398464],[77.401624,18.406405],[77.402789,18.406147],[77.40373,18.406259],[77.40514,18.407432],[77.405963,18.408437],[77.406786,18.409497],[77.406785,18.410613],[77.406314,18.411338],[77.405307,18.411728],[77.406173,18.412685],[77.421255,18.418931],[77.422883,18.421115],[77.423325,18.425007],[77.419178,18.431717],[77.421015,18.438066],[77.419144,18.443894],[77.419379,18.446546],[77.421434,18.448178],[77.428291,18.44726],[77.432929,18.449483],[77.437825,18.453376],[77.439617,18.457236],[77.442706,18.45845],[77.444586,18.46365],[77.452493,18.46493]]],[[[77.471893,18.541668],[77.473618,18.541436],[77.481601,18.533431],[77.485206,18.531554],[77.486621,18.523714],[77.484408,18.522339],[77.484395,18.520857],[77.490871,18.52012],[77.498063,18.515923],[77.496536,18.509568],[77.492494,18.506371],[77.490233,18.50189],[77.472606,18.503775],[77.468038,18.506281],[77.468209,18.508923],[77.472408,18.512353],[77.47442,18.515683],[77.473806,18.528398],[77.472107,18.530527],[77.468643,18.532239],[77.457725,18.533768],[77.453773,18.536315],[77.456538,18.535921],[77.461983,18.538004],[77.463258,18.537463],[77.465785,18.54065],[77.471893,18.541668]]]],
      },
      extent: {"west_east":77.401381,"east_east":77.498063,"south_latitude":18.380523,"north_latitude":18.541668},
      classification: "mapped",
      source_verified: true,
      processing_verified: true,
      registration_verified: false,
      source_ids: ["jezero-usgs-sim3464"],
      limitations: [
        "USGS SIM 3464 1:75,000 mapping; contact positional uncertainty ~100-200 m.",
        "Geological unit extent; not a discrete navigational waypoint.",
        "Independent operations CTX registration pending.",
      ],
      uncertainty_m: 150,
    },
    routing_eligibility: {
      status: "unavailable",
      reason:
        "Geological area with mapped extent; no precise waypoint or route eligibility. Outcrop selection and traverse planning require tactical evaluation.",
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
      "The Western Delta fan deposits (USGS unit NHjf2) record sustained river-lake interaction during the Late Noachian to Early Hesperian. Bottomset and foreset delta beds, remnant buttes (Kodiak), and inlet channels document ancient lake levels and sustained aqueous habitability (Mangold et al., 2021, Science 374:711-717; Sun & Stack, 2020).",
    priority_category: "Published Mars 2020 science objective - mapped delta fan",
    coordinates: null,
    coordinate_reference: {
      body: "Mars",
      latitude_type: "planetocentric",
      longitude_direction: "east",
      longitude_range: "0-360",
    },
    coordinate_verified: false,
    source_ids: [
      "jezero-usgs-sim3464",
      "jezero-mangold-2021-science",
      "jezero-m2020-mission-overview",
      "jezero-m2020-science-objectives",
    ],
    activity:
      "Investigate deltaic stratigraphy, bottomset/foreset mudstones, and aqueous alteration facies. Mapped delta fan polygons indicate formation extent; specific outcrops require localized tactical exploration.",
    evidence: "Interpreted",
    verification: "pending",
    feature_kind: "geological_area",
    location_notes:
      "Published 1:75,000 USGS SIM 3464 geological mapping (Sun & Stack, 2020) and stratigraphic analysis (Mangold et al., 2021) define the mapped extent of the Jezero fan 2 unit (NHjf2), including the western delta lobes and outlying erosional remnants (Kodiak butte). Geometries derived from the Mars 2000 sphere Transverse Mercator projection.",
    boundary: {
      status: "available",
      classification: "mapped",
      geometry: {
        type: "MultiPolygon",
        coordinates: [[[[77.347291,18.426234],[77.351266,18.425056],[77.353357,18.42028],[77.35288,18.413729],[77.349268,18.410312],[77.348616,18.407463],[77.347314,18.408089],[77.346627,18.410118],[77.34869,18.416074],[77.344758,18.417279],[77.344315,18.419377],[77.345401,18.421861],[77.343455,18.423652],[77.344099,18.42504],[77.347291,18.426234]]],[[[77.364934,18.434058],[77.36712,18.432608],[77.3682,18.430491],[77.366516,18.428325],[77.366155,18.424512],[77.35941,18.421638],[77.358363,18.42268],[77.358798,18.427084],[77.363278,18.430725],[77.363804,18.433307],[77.364934,18.434058]]],[[[77.409738,18.441015],[77.41236,18.439835],[77.410671,18.435815],[77.407839,18.434487],[77.404457,18.435201],[77.40479,18.437668],[77.406341,18.439927],[77.409738,18.441015]]],[[[77.357228,18.442255],[77.358519,18.441895],[77.357358,18.438264],[77.355947,18.440266],[77.357228,18.442255]]],[[[77.50276,18.475145],[77.504814,18.473262],[77.500236,18.464435],[77.496823,18.461932],[77.49295,18.461619],[77.490556,18.462738],[77.489501,18.466313],[77.493192,18.473071],[77.49475,18.474034],[77.50276,18.475145]]],[[[77.487183,18.484628],[77.490088,18.484029],[77.494399,18.481516],[77.494687,18.477659],[77.493462,18.475475],[77.483992,18.479498],[77.484391,18.48334],[77.487183,18.484628]]],[[[77.313288,18.494437],[77.315385,18.494011],[77.316263,18.4922],[77.308575,18.489722],[77.303915,18.490369],[77.299974,18.489161],[77.297852,18.490546],[77.299154,18.491827],[77.305038,18.49384],[77.313288,18.494437]]],[[[77.351916,18.506315],[77.353694,18.504671],[77.353099,18.503593],[77.34456,18.498835],[77.331679,18.494778],[77.326666,18.495531],[77.32727,18.4974],[77.341047,18.502753],[77.344394,18.505177],[77.351916,18.506315]]],[[[77.356804,18.509204],[77.361727,18.508693],[77.359715,18.507141],[77.355845,18.506647],[77.354746,18.507291],[77.355043,18.508674],[77.356804,18.509204]]],[[[77.25928,18.514972],[77.264045,18.510519],[77.266943,18.504686],[77.270801,18.501557],[77.270734,18.498649],[77.269354,18.498591],[77.267683,18.500671],[77.263228,18.500386],[77.260523,18.50169],[77.256187,18.500906],[77.25398,18.502094],[77.251021,18.509641],[77.253442,18.510889],[77.257272,18.510134],[77.25928,18.514972]]],[[[77.44278,18.524029],[77.445073,18.52232],[77.444068,18.520014],[77.439085,18.519452],[77.436544,18.520686],[77.438915,18.523378],[77.44278,18.524029]]],[[[77.359498,18.530937],[77.364948,18.52538],[77.365895,18.520227],[77.365294,18.517667],[77.362331,18.513686],[77.359795,18.514495],[77.343184,18.5074],[77.34537,18.510784],[77.34914,18.523281],[77.351693,18.528685],[77.354125,18.53029],[77.359498,18.530937]]],[[[77.440534,18.579698],[77.44621,18.574603],[77.445656,18.573112],[77.439034,18.568868],[77.429779,18.566834],[77.423821,18.563372],[77.420404,18.5601],[77.422348,18.559922],[77.427622,18.563313],[77.431365,18.564537],[77.433424,18.56283],[77.436408,18.562335],[77.439177,18.557749],[77.434356,18.555497],[77.429379,18.551201],[77.432675,18.549694],[77.447248,18.547121],[77.448032,18.546764],[77.447874,18.543701],[77.445912,18.542571],[77.422793,18.538659],[77.415948,18.539684],[77.410816,18.538471],[77.409951,18.537367],[77.411276,18.535278],[77.42235,18.532031],[77.424198,18.529765],[77.423555,18.527048],[77.41878,18.522476],[77.417976,18.520201],[77.418657,18.519059],[77.425023,18.516795],[77.429423,18.517223],[77.428098,18.512029],[77.43143,18.512093],[77.433922,18.513466],[77.435347,18.511748],[77.434876,18.507429],[77.437471,18.504356],[77.436971,18.501847],[77.435108,18.49836],[77.429302,18.494845],[77.427505,18.49145],[77.428855,18.489544],[77.439936,18.48239],[77.440497,18.480831],[77.43935,18.478257],[77.437069,18.476633],[77.433056,18.47585],[77.428899,18.469351],[77.425036,18.465702],[77.421711,18.459154],[77.416259,18.456391],[77.405281,18.455566],[77.403939,18.454164],[77.404962,18.453229],[77.404882,18.451731],[77.402509,18.4491],[77.380182,18.456257],[77.372546,18.456099],[77.368775,18.457192],[77.368087,18.455056],[77.375123,18.442028],[77.374107,18.43986],[77.375517,18.43762],[77.375257,18.434395],[77.378041,18.431474],[77.378194,18.430037],[77.374346,18.430281],[77.368787,18.434018],[77.364549,18.440909],[77.357024,18.44815],[77.351987,18.446499],[77.34979,18.448932],[77.345576,18.447395],[77.345212,18.446962],[77.34506,18.446194],[77.341426,18.450228],[77.342994,18.451721],[77.342172,18.454247],[77.345969,18.459443],[77.350556,18.469856],[77.350552,18.47399],[77.352516,18.478566],[77.352587,18.481293],[77.350901,18.487935],[77.347212,18.492992],[77.343882,18.49518],[77.34377,18.496317],[77.356985,18.493324],[77.358015,18.494805],[77.354307,18.496516],[77.350278,18.500034],[77.355777,18.504186],[77.357294,18.503876],[77.358014,18.504911],[77.361356,18.505636],[77.363142,18.507841],[77.366208,18.50819],[77.372832,18.512067],[77.373386,18.513117],[77.371387,18.515227],[77.371467,18.517607],[77.370513,18.518428],[77.372832,18.522184],[77.374007,18.521441],[77.375982,18.522652],[77.374666,18.524709],[77.375726,18.52703],[77.381027,18.53299],[77.384394,18.535125],[77.386704,18.539951],[77.393599,18.546239],[77.398639,18.553113],[77.406201,18.557443],[77.404821,18.559013],[77.406085,18.558812],[77.411941,18.561647],[77.417854,18.561621],[77.418752,18.563173],[77.418327,18.565308],[77.419802,18.56779],[77.426072,18.570795],[77.430787,18.575306],[77.440534,18.579698]],[[77.414894,18.555949],[77.40561,18.549278],[77.4012,18.541798],[77.405702,18.542104],[77.412492,18.546361],[77.415337,18.550715],[77.41579,18.556517],[77.414894,18.555949]],[[77.376775,18.491515],[77.371306,18.486447],[77.369977,18.478509],[77.371578,18.474889],[77.374603,18.472783],[77.377842,18.471602],[77.382255,18.471527],[77.386042,18.473904],[77.388408,18.479191],[77.388567,18.482189],[77.385402,18.487613],[77.376775,18.491515]],[[77.347527,18.458787],[77.345496,18.455638],[77.347178,18.452359],[77.350232,18.451429],[77.350529,18.452649],[77.347527,18.458787]]]],
      },
      extent: {"west_east":77.251021,"east_east":77.504814,"south_latitude":18.407463,"north_latitude":18.579698},
      source_ids: ["jezero-usgs-sim3464", "jezero-mangold-2021-science"],
      source_verified: true,
      processing_verified: true,
      registration_verified: false,
      uncertainty_m: 100,
      limitations: [
        "USGS SIM 3464 1:75,000 mapping; contact uncertainty ~75-150 m.",
        "Regional deltaic formation; not a single navigation target.",
        "Independent operations CTX registration pending.",
        "Sedimentary habitability varies by layer and facies.",
      ],
    },
    location: {
      type: "area",
      geometry: {
        type: "MultiPolygon",
        coordinates: [[[[77.347291,18.426234],[77.351266,18.425056],[77.353357,18.42028],[77.35288,18.413729],[77.349268,18.410312],[77.348616,18.407463],[77.347314,18.408089],[77.346627,18.410118],[77.34869,18.416074],[77.344758,18.417279],[77.344315,18.419377],[77.345401,18.421861],[77.343455,18.423652],[77.344099,18.42504],[77.347291,18.426234]]],[[[77.364934,18.434058],[77.36712,18.432608],[77.3682,18.430491],[77.366516,18.428325],[77.366155,18.424512],[77.35941,18.421638],[77.358363,18.42268],[77.358798,18.427084],[77.363278,18.430725],[77.363804,18.433307],[77.364934,18.434058]]],[[[77.409738,18.441015],[77.41236,18.439835],[77.410671,18.435815],[77.407839,18.434487],[77.404457,18.435201],[77.40479,18.437668],[77.406341,18.439927],[77.409738,18.441015]]],[[[77.357228,18.442255],[77.358519,18.441895],[77.357358,18.438264],[77.355947,18.440266],[77.357228,18.442255]]],[[[77.50276,18.475145],[77.504814,18.473262],[77.500236,18.464435],[77.496823,18.461932],[77.49295,18.461619],[77.490556,18.462738],[77.489501,18.466313],[77.493192,18.473071],[77.49475,18.474034],[77.50276,18.475145]]],[[[77.487183,18.484628],[77.490088,18.484029],[77.494399,18.481516],[77.494687,18.477659],[77.493462,18.475475],[77.483992,18.479498],[77.484391,18.48334],[77.487183,18.484628]]],[[[77.313288,18.494437],[77.315385,18.494011],[77.316263,18.4922],[77.308575,18.489722],[77.303915,18.490369],[77.299974,18.489161],[77.297852,18.490546],[77.299154,18.491827],[77.305038,18.49384],[77.313288,18.494437]]],[[[77.351916,18.506315],[77.353694,18.504671],[77.353099,18.503593],[77.34456,18.498835],[77.331679,18.494778],[77.326666,18.495531],[77.32727,18.4974],[77.341047,18.502753],[77.344394,18.505177],[77.351916,18.506315]]],[[[77.356804,18.509204],[77.361727,18.508693],[77.359715,18.507141],[77.355845,18.506647],[77.354746,18.507291],[77.355043,18.508674],[77.356804,18.509204]]],[[[77.25928,18.514972],[77.264045,18.510519],[77.266943,18.504686],[77.270801,18.501557],[77.270734,18.498649],[77.269354,18.498591],[77.267683,18.500671],[77.263228,18.500386],[77.260523,18.50169],[77.256187,18.500906],[77.25398,18.502094],[77.251021,18.509641],[77.253442,18.510889],[77.257272,18.510134],[77.25928,18.514972]]],[[[77.44278,18.524029],[77.445073,18.52232],[77.444068,18.520014],[77.439085,18.519452],[77.436544,18.520686],[77.438915,18.523378],[77.44278,18.524029]]],[[[77.359498,18.530937],[77.364948,18.52538],[77.365895,18.520227],[77.365294,18.517667],[77.362331,18.513686],[77.359795,18.514495],[77.343184,18.5074],[77.34537,18.510784],[77.34914,18.523281],[77.351693,18.528685],[77.354125,18.53029],[77.359498,18.530937]]],[[[77.440534,18.579698],[77.44621,18.574603],[77.445656,18.573112],[77.439034,18.568868],[77.429779,18.566834],[77.423821,18.563372],[77.420404,18.5601],[77.422348,18.559922],[77.427622,18.563313],[77.431365,18.564537],[77.433424,18.56283],[77.436408,18.562335],[77.439177,18.557749],[77.434356,18.555497],[77.429379,18.551201],[77.432675,18.549694],[77.447248,18.547121],[77.448032,18.546764],[77.447874,18.543701],[77.445912,18.542571],[77.422793,18.538659],[77.415948,18.539684],[77.410816,18.538471],[77.409951,18.537367],[77.411276,18.535278],[77.42235,18.532031],[77.424198,18.529765],[77.423555,18.527048],[77.41878,18.522476],[77.417976,18.520201],[77.418657,18.519059],[77.425023,18.516795],[77.429423,18.517223],[77.428098,18.512029],[77.43143,18.512093],[77.433922,18.513466],[77.435347,18.511748],[77.434876,18.507429],[77.437471,18.504356],[77.436971,18.501847],[77.435108,18.49836],[77.429302,18.494845],[77.427505,18.49145],[77.428855,18.489544],[77.439936,18.48239],[77.440497,18.480831],[77.43935,18.478257],[77.437069,18.476633],[77.433056,18.47585],[77.428899,18.469351],[77.425036,18.465702],[77.421711,18.459154],[77.416259,18.456391],[77.405281,18.455566],[77.403939,18.454164],[77.404962,18.453229],[77.404882,18.451731],[77.402509,18.4491],[77.380182,18.456257],[77.372546,18.456099],[77.368775,18.457192],[77.368087,18.455056],[77.375123,18.442028],[77.374107,18.43986],[77.375517,18.43762],[77.375257,18.434395],[77.378041,18.431474],[77.378194,18.430037],[77.374346,18.430281],[77.368787,18.434018],[77.364549,18.440909],[77.357024,18.44815],[77.351987,18.446499],[77.34979,18.448932],[77.345576,18.447395],[77.345212,18.446962],[77.34506,18.446194],[77.341426,18.450228],[77.342994,18.451721],[77.342172,18.454247],[77.345969,18.459443],[77.350556,18.469856],[77.350552,18.47399],[77.352516,18.478566],[77.352587,18.481293],[77.350901,18.487935],[77.347212,18.492992],[77.343882,18.49518],[77.34377,18.496317],[77.356985,18.493324],[77.358015,18.494805],[77.354307,18.496516],[77.350278,18.500034],[77.355777,18.504186],[77.357294,18.503876],[77.358014,18.504911],[77.361356,18.505636],[77.363142,18.507841],[77.366208,18.50819],[77.372832,18.512067],[77.373386,18.513117],[77.371387,18.515227],[77.371467,18.517607],[77.370513,18.518428],[77.372832,18.522184],[77.374007,18.521441],[77.375982,18.522652],[77.374666,18.524709],[77.375726,18.52703],[77.381027,18.53299],[77.384394,18.535125],[77.386704,18.539951],[77.393599,18.546239],[77.398639,18.553113],[77.406201,18.557443],[77.404821,18.559013],[77.406085,18.558812],[77.411941,18.561647],[77.417854,18.561621],[77.418752,18.563173],[77.418327,18.565308],[77.419802,18.56779],[77.426072,18.570795],[77.430787,18.575306],[77.440534,18.579698]],[[77.414894,18.555949],[77.40561,18.549278],[77.4012,18.541798],[77.405702,18.542104],[77.412492,18.546361],[77.415337,18.550715],[77.41579,18.556517],[77.414894,18.555949]],[[77.376775,18.491515],[77.371306,18.486447],[77.369977,18.478509],[77.371578,18.474889],[77.374603,18.472783],[77.377842,18.471602],[77.382255,18.471527],[77.386042,18.473904],[77.388408,18.479191],[77.388567,18.482189],[77.385402,18.487613],[77.376775,18.491515]],[[77.347527,18.458787],[77.345496,18.455638],[77.347178,18.452359],[77.350232,18.451429],[77.350529,18.452649],[77.347527,18.458787]]]],
      },
      extent: {"west_east":77.251021,"east_east":77.504814,"south_latitude":18.407463,"north_latitude":18.579698},
      classification: "mapped",
      source_verified: true,
      processing_verified: true,
      registration_verified: false,
      source_ids: ["jezero-usgs-sim3464", "jezero-mangold-2021-science"],
      limitations: [
        "USGS SIM 3464 1:75,000 mapping; contact uncertainty ~75-150 m.",
        "Regional deltaic formation; not a single navigation target.",
        "Independent operations CTX registration pending.",
      ],
      uncertainty_m: 100,
    },
    routing_eligibility: {
      status: "unavailable",
      reason:
        "Geological area with mapped extent; no precise waypoint or route eligibility. Ancient delta sediments must be investigated at site-specific outcrops.",
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
      "The Three Forks Sample Depot contains 10 titanium sample tubes deposited by Perseverance between Sols 653 and 705 (Dec 2022 - Jan 2023) as an accessible surface cache for the Mars Sample Return campaign. Cached lithologies include igneous crater-floor rocks (Máaz and Séítah formations), deltaic mudstones, an atmospheric sample, and a witness blank (Williams et al., 2023, 54th LPSC #2618).",
    priority_category: "Published Mars 2020 science objective - verified sample depot",
    coordinates: {
      latitude: 18.453697,
      longitude_east: 77.413598,
    },
    coordinate_reference: {
      body: "Mars",
      latitude_type: "planetocentric",
      longitude_direction: "east",
      longitude_range: "0-360",
    },
    coordinate_verified: true,
    source_ids: [
      "jezero-msr-three-forks-lpsc",
      "jezero-m2020-places",
      "jezero-m2020-sample-dossier",
      "jezero-m2020-science-objectives",
    ],
    activity:
      "Inspect the Three Forks sample cache depot containing 10 deposited Perseverance sample tubes. Ground coordinates trace directly to the published Mars Sample Return landing and depot site selection.",
    evidence: "Observed",
    verification: "verified",
    feature_kind: "sampling_site",
    location_notes:
      "Authoritative surface coordinates from the Mars Sample Return Three Forks landing and depot site selection (Williams, Golombek, Do, Calef et al., 2023, 54th LPSC, Abstract #2618): 18.453697° N, 77.413598° E (planetocentric, east-positive). Elevation: -2548.673 m (MOLA areoid). The site defines a 60-meter radius operational circle on low-rock flat terrain at the base of the delta.",
    location: {
      type: "point",
      coordinates: [77.413598, 18.453697],
      source_verified: true,
      processing_verified: true,
      registration_verified: false,
      source_ids: ["jezero-msr-three-forks-lpsc", "jezero-m2020-places"],
      uncertainty_m: 60,
    },
    routing_eligibility: {
      status: "unavailable",
      reason:
        "Authoritative Three Forks sample depot point verified from Mars 2020 operations (Williams et al. 2023, 54th LPSC #2618), but surface routing policy and terrain hazard models for Jezero Crater are not yet connected.",
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
      "Fine-grained lacustrine mudstones and altered carbonates along the delta front (Hogwallow Flats, Wildcat Ridge, Skinner Ridge, Amalik outcrop) preserve aromatic organic molecules and aqueous mineral assemblages detected by SHERLOC deep-UV Raman/fluorescence spectroscopy (Scheller et al., 2022, Science 378:1105-1110).",
    priority_category: "Published Mars 2020 science objective - approximate search area",
    coordinates: null,
    coordinate_reference: {
      body: "Mars",
      latitude_type: "planetocentric",
      longitude_direction: "east",
      longitude_range: "0-360",
    },
    coordinate_verified: false,
    source_ids: [
      "jezero-scheller-2022-science",
      "jezero-m2020-mission-overview",
      "jezero-m2020-science-objectives",
    ],
    activity:
      "Sample fine-grained deltaic mudstones with high biosignature preservation potential. Organic detections reflect in-situ deep-UV Raman/fluorescence measurements; definitive verification requires sample return.",
    evidence: "Interpreted",
    verification: "pending",
    feature_kind: "geological_area",
    location_notes:
      "Approximate geographic corridor encompassing the lower delta front and margin outcrops investigated during the Mars 2020 Delta Front Campaign (Sols 415-550). Coordinates span ~77.388-77.426° E, 18.436-18.468° N, encompassing the Wildcat Ridge, Skinner Ridge, and Hogwallow Flats fine-grained mudstone sampling sites.",
    boundary: {
      status: "available",
      classification: "approximate",
      geometry: {
        type: "Polygon",
        coordinates: [[[77.388,18.438],[77.412,18.436],[77.426,18.452],[77.418,18.468],[77.394,18.462],[77.388,18.438]]],
      },
      extent: {"west_east":77.388,"east_east":77.426,"south_latitude":18.436,"north_latitude":18.468},
      source_ids: ["jezero-scheller-2022-science"],
      source_verified: true,
      processing_verified: true,
      registration_verified: false,
      uncertainty_m: 200,
      limitations: [
        "Approximate campaign area; individual outcrop exposures require tactical contact science.",
        "Organic molecule presence does not confirm biological origin; definitive analysis requires sample return.",
        "Independent operations CTX registration pending.",
        "Centroids are non-navigable; not a mission waypoint.",
      ],
    },
    location: {
      type: "area",
      geometry: {
        type: "Polygon",
        coordinates: [[[77.388,18.438],[77.412,18.436],[77.426,18.452],[77.418,18.468],[77.394,18.462],[77.388,18.438]]],
      },
      extent: {"west_east":77.388,"east_east":77.426,"south_latitude":18.436,"north_latitude":18.468},
      classification: "approximate",
      source_verified: true,
      processing_verified: true,
      registration_verified: false,
      source_ids: ["jezero-scheller-2022-science"],
      limitations: [
        "Approximate campaign area; individual outcrop exposures require tactical contact science.",
        "Organic molecule presence does not confirm biological origin; definitive analysis requires sample return.",
        "Independent operations CTX registration pending.",
      ],
      uncertainty_m: 200,
    },
    routing_eligibility: {
      status: "unavailable",
      reason:
        "Geological area with approximate boundary; no precise waypoint or route eligibility. Astrobiological sampling requires localized rover contact science.",
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
    feature_kind: "observation_site",
    location_notes:
      "Human-exploration preparation encompasses mission-wide engineering demonstrations (MOXIE oxygen extraction, MEDA meteorological monitoring, MEDLI2 heat shield entry telemetry, spacesuit material exposure) conducted across the rover's extended traverse rather than at a single discrete geological feature. No localized boundary or point coordinate is asserted to avoid misrepresenting mission-wide engineering investigations as a localized site.",
    boundary: {
      status: "unavailable",
      reason:
        "Human-exploration preparation encompasses mission-wide technology demonstrations (MOXIE, MEDA, MEDLI2) conducted across the traverse rather than within a discrete bounded geological unit.",
    },
    location: {
      type: "unavailable",
      reason:
        "Human-exploration preparation encompasses broad mission-wide investigations (MOXIE oxygen production, MEDA atmospheric observations, entry/descent engineering, spacesuit polymer testing) conducted across the extended mission path rather than at a discrete scientific sampling target.",
    },
    routing_eligibility: {
      status: "unavailable",
      reason:
        "Mission-wide technology demonstration objective; no localized target coordinate or route waypoint exists.",
    },
  },
] satisfies Target[];
