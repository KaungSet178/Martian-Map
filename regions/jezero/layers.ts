import type { ScientificLayer } from "@/lib/contracts/region";

// Region-owned content. Pending values are deliberately explicit.
// No layer has a selected, audited Jezero product yet: rendering stays unavailable.
export const layers = [
  {
    id: "jezero-optical",
    type: "Optical imagery",
    display_name: "Optical imagery",
    kind: "optical",
    availability: "pending",
    source_id: "jezero-hirise-archive",
    observation_date: null,
    spatial_resolution_m: null,
    coverage: null,
    limitations:
      "Requires selecting a specific HiRISE or CTX product over the exploration area (archive anchors jezero-hirise-archive / jezero-ctx-archive are registered), reviewing its CRS, latitude/longitude convention, actual footprint, nodata and effective resolution, and preparing a reviewed Mars display transform before any tiles are served.",
    evidence: "Unavailable",
    attribution: null,
    rendering: {
      kind: "unavailable",
      reason:
        "No specific Jezero optical product has been selected, audited or prepared for display.",
    },
    default_visible: false,
    default_opacity: 70,
    legend: null,
  },
  {
    id: "jezero-terrain",
    type: "Terrain & slope",
    display_name: "Terrain & slope",
    kind: "topography",
    availability: "pending",
    source_id: "jezero-hirise-archive",
    observation_date: null,
    spatial_resolution_m: null,
    coverage: null,
    limitations:
      "Requires an audited DTM product (e.g. a HiRISE DTM over the delta): audited valid-data footprint, native vs resampled resolution, vertical datum, nodata handling and documented slope derivation. The NASA mission map states a DEM was built for rover driving, but that product has not been selected; any DEM is not astronaut-route evidence.",
    evidence: "Unavailable",
    attribution: null,
    rendering: {
      kind: "unavailable",
      reason:
        "Requires audited DEM, resolution, valid-data footprint and documented derivation.",
    },
    default_visible: false,
    default_opacity: 70,
    legend: null,
  },
  {
    id: "jezero-geology",
    type: "Geology & mineralogy",
    display_name: "Geology & mineralogy",
    kind: "geology",
    availability: "pending",
    source_id: null,
    observation_date: null,
    spatial_resolution_m: null,
    coverage: null,
    limitations:
      "No Jezero geological map or CRISM-derived product has been registered yet (a USGS Jezero geologic map and other published maps remain to be located and verified). Requires published map products, classification legends, coverage verification and source registration before review.",
    evidence: "Unavailable",
    attribution: null,
    rendering: {
      kind: "unavailable",
      reason:
        "Requires published map products, classification legends and coverage verification.",
    },
    default_visible: false,
    default_opacity: 70,
    legend: null,
  },
] satisfies ScientificLayer[];
