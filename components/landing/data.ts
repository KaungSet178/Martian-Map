import { assessments, type RegionId, type RegionManifest } from "@/lib/contracts/region";
import { regions, regionIds } from "@/lib/regions/registry";
import { preferenceSchema } from "@/lib/routing/contracts";

export type { RegionId };
export type LandingRegion = ReturnType<typeof makeRegion>;

function makeRegion(id: RegionId, index: number) {
  const region = regions[id];
  return {
    id, index: String(index + 1).padStart(2, "0"), name: region.name,
    missionContext: region.mission_context,
    explorationStatus: region.region_status === "planned" ? "Planned mission area" : "Rover exploration context",
    locationBadge: region.region_status === "planned" ? "Orbital observation context" : "Documented rover region",
    image: `/landing/screens/${id}-map.webp`,
    imageAlt: `${region.name} basemap captured from the Aresian planner`,
    summary: region.scientific_context.question,
    highlights: [region.mission_context, `${region.targets.length} science objectives in the current catalog.`, `${region.layers.filter(layer => layer.availability === "available").length} available map layers; source evidence included.`],
  };
}
export const MARS_REGIONS = regionIds.map(makeRegion);
export const ASSESSMENT_COUNT = assessments.length;

export const ROUTE_CATEGORIES = preferenceSchema.options.map(id => ({
  id,
  title: id === "shortest" ? "Shortest" : "Lower terrain cost",
  description: id === "shortest"
    ? "Compare research routes that minimize distance between manually placed waypoints."
    : "Compare research routes using the terrain cost model within supported coverage.",
  availability: "Experimental",
}));
export type RouteChoice = typeof ROUTE_CATEGORIES[number]["id"];

function sourceSummary(region: RegionManifest, sourceId: string | null) {
  const source = region.source_references.find(item => item.id === sourceId);
  return source?.title ?? "See the planner source register";
}

// This section is explicitly a Gale example. Do not imply every region has
// identical datasets, resolutions or environmental observations.
export const SCIENTIFIC_LAYERS = regions.gale.layers
  .filter(layer => ["gale-optical", "gale-regional-elevation", "gale-regional-hillshade", "gale-regional-slope", "gale-thermal"].includes(layer.id) && layer.availability === "available")
  .map(layer => ({
    id: layer.id, name: layer.display_name ?? layer.type, status: "Available",
    source: sourceSummary(regions.gale, layer.source_id),
    observationDate: layer.observation_date ?? "See source product record",
    resolution: layer.spatial_resolution_m === null ? "See source metadata" : `${layer.spatial_resolution_m} m source resolution`,
    coverage: layer.coverage, limitations: layer.limitations,
  })).concat(regions.gale.contextual_datasets
    .filter(dataset => dataset.id === "gale-environment-context")
    .map(dataset => ({
      id: dataset.id, name: dataset.name, status: dataset.availability.status === "available" ? "Available" : "Unavailable",
      source: sourceSummary(regions.gale, dataset.source_ids[0]),
      observationDate: "Historical rover observations", resolution: "Rover-local point measurements",
      coverage: dataset.availability.reason, limitations: dataset.limitations,
    })));

const checkDetails = [
  { id: "terrain", summary: "Inspect terrain coverage, source registration, and unresolved hazards." },
  { id: "oxygen", summary: "Review conditional oxygen estimates from entered rates and reserves." },
  { id: "battery", summary: "Review conditional energy estimates, capacity, and reserves." },
  { id: "eva-time", summary: "Review travel, science activity, and contingency time assumptions." },
  { id: "radiation", summary: "Inspect available evidence; a validated astronaut dose model is unavailable." },
  { id: "return", summary: "Review return assumptions; operational recovery validation remains unavailable." },
];
export const FEASIBILITY_CHECKS = assessments.map((name, index) => ({ name, ...checkDetails[index] }));

export const WORKFLOW_STEPS = [
  { step: "01", title: "Select a Region", description: "Choose Jezero, Gale, or Oxia Planum." },
  { step: "02", title: "Explore the Surface", description: "Inspect available layers, observations, and their source records." },
  { step: "03", title: "Choose Science Objectives", description: "Inspect objective evidence and distinguish source locations from route eligibility." },
  { step: "04", title: "Plan a Traverse", description: "Place waypoints and compare experimental routes where supported." },
  { step: "05", title: "Review the Mission", description: "Review estimates and missing evidence, then save or export your mission." },
];

// Derive the public summary on the server. The browser receives only the
// concise display data, rather than regional registries and routing engines.
export const landingData = { MARS_REGIONS, ASSESSMENT_COUNT, ROUTE_CATEGORIES, SCIENTIFIC_LAYERS, FEASIBILITY_CHECKS, WORKFLOW_STEPS };
export type LandingData = typeof landingData;
