import type { ScientificLayer } from "@/lib/contracts/region";

// Region-owned content. Pending values are deliberately explicit.
export const layers = [
  {
    id: "gale-optical",
    type: "Optical imagery",
    display_name: "Optical imagery",
    kind: "optical",
    availability: "pending",
    source_id: null,
    observation_date: null,
    spatial_resolution_m: null,
    coverage: null,
    limitations:
      "Georeferenced orbital imagery and its planetary transform have not been integrated.",
    evidence: "Unavailable",
    attribution: null,
    rendering: {
      kind: "unavailable",
      reason:
        "Georeferenced orbital imagery and its planetary transform have not been integrated.",
    },
    default_visible: false,
    default_opacity: 70,
    legend: null,
  },
  {
    id: "gale-terrain",
    type: "Terrain & slope",
    display_name: "Terrain & slope",
    kind: "topography",
    availability: "pending",
    source_id: null,
    observation_date: null,
    spatial_resolution_m: null,
    coverage: null,
    limitations:
      "Requires audited DEM, resolution, valid-data footprint and documented derivation.",
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
    id: "gale-geology",
    type: "Geology & mineralogy",
    display_name: "Geology & mineralogy",
    kind: "geology",
    availability: "pending",
    source_id: null,
    observation_date: null,
    spatial_resolution_m: null,
    coverage: null,
    limitations:
      "Requires published map products, classification legends and coverage verification.",
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
