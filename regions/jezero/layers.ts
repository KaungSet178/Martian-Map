import type { ScientificLayer } from "@/lib/contracts/region";

// Region-owned content. Pending values are deliberately explicit.
// Only the recorded rover traverse has a selected, audited product so far;
// it renders as a display-grade GeoJSON overlay (see config display_transform).
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
  {
    id: "jezero-traverse-recorded",
    type: "Recorded rover traverse",
    display_name: "Recorded rover traverse",
    kind: "overlay",
    availability: "available",
    source_id: "jezero-m2020-places",
    observation_date: "2021-02-18/2026-06-21",
    spatial_resolution_m: null,
    coverage:
      "Perseverance recorded traverse, sols 0-1897 (PLACES release 16), Jezero Crater exploration area; 77.217-77.463 E, 18.422-18.500 N (planetocentric). Approximate recorded path 42.785 km.",
    limitations:
      "Recorded rover traverse, not an astronaut route and not terrain-safety evidence. Display-grade pending basemap-alignment review (product planetodetic column defective; see region display_transform notes), not survey-grade. Localization accuracy per the Rover PLACES SIS. Display vertices thinned to ~10 m spacing; no slope/terrain information is implied.",
    evidence: "Observed",
    attribution:
      "NASA/JPL-Caltech · Mars 2020 Rover PLACES Bundle, PDS Geosciences Node (urn-nasa-pds-mars2020_rover_places, release 16)",
    rendering: {
      kind: "geojson",
      url: "/maps/jezero/perseverance-traverse.geojson",
      geometry: "line",
      color: "#D6DEE8",
    },
    default_visible: true,
    default_opacity: 90,
    legend: {
      title: "Recorded Perseverance traverse",
      units: null,
      items: [
        {
          label: "Recorded rover traverse (sols 0-1897, PLACES release 16)",
          color: "#D6DEE8",
        },
      ],
    },
  },
] satisfies ScientificLayer[];
