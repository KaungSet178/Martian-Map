import type { ScientificLayer } from "@/lib/contracts/region";
import { regionalExtent, globalExtent } from "./terrain-layers";

// The audited, fully valid derived footprints, not the original TIFF envelopes.
// GeoJSON boundaries may become irregular when future valid-data masks change.
export const coverageLayers = [
  {
    id: "gale-coverage-regional",
    type: "Data coverage",
    display_name: "Regional terrain coverage",
    kind: "overlay",
    availability: "available",
    source_id: "gale-hrsc-30m",
    observation_date: null,
    spatial_resolution_m: null,
    coverage: "Boundary of the fully valid regional HRSC display crop: 141.733079 km², about 8.70 × 16.29 km. Extends beyond the fixed optical overview. Solid outline; no fill.",
    limitations: "Data extent only, not a geological contact or safety boundary. CTX/color alignment unverified.",
    evidence: "Derived",
    attribution: "Persaud, Putri and Muller (2021), DOI 10.5281/zenodo.5808354 · Marswalk coverage boundary",
    zoom_extent: regionalExtent,
    rendering: { kind: "geojson", url: "/maps/gale/terrain-regional/coverage.geojson", geometry: "line", color: "#D0BDFF", line_pattern: "solid" },
    default_visible: false,
    default_opacity: 100,
    legend: { title: "Regional display coverage · solid line", units: null, items: [{ label: "Solid · valid regional crop boundary", color: "#D0BDFF" }] },
  },
  {
    id: "gale-coverage-global",
    type: "Data coverage",
    display_name: "Global terrain coverage",
    kind: "overlay",
    availability: "available",
    source_id: "gale-usgs-200m",
    observation_date: null,
    spatial_resolution_m: null,
    coverage: "Boundary of the local Gale-area crop from the global HRSC–MOLA source: 1,665.252534 km², about 35.28 × 47.20 km. Not a complete Gale Crater map. Dashed outline; no fill.",
    limitations: "Data extent only, not global display coverage or a safety boundary. CTX/color alignment unverified.",
    evidence: "Derived",
    attribution: "USGS · Fergason et al. (2018) · Marswalk coverage boundary",
    zoom_extent: globalExtent,
    rendering: { kind: "geojson", url: "/maps/gale/terrain-global/coverage.geojson", geometry: "line", color: "#FFC36B", line_pattern: "dashed" },
    default_visible: false,
    default_opacity: 100,
    legend: { title: "Global-derived local crop · dashed line", units: null, items: [{ label: "Dashed · valid Gale-area crop boundary", color: "#FFC36B" }] },
  },
] satisfies ScientificLayer[];
