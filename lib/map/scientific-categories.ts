import type { RegionManifest, ScientificLayer } from "@/lib/contracts/region";

export const scientificCategories = ["Elevation", "Hillshade", "Slope", "Thermal"] as const;
export type ScientificCategory = typeof scientificCategories[number];
const datasets: Record<RegionManifest["id"], Record<ScientificCategory, string[]>> = {
  gale: {
    Elevation: ["gale-regional-elevation", "gale-global-elevation", "gale-terrain"],
    Hillshade: ["gale-regional-hillshade", "gale-global-hillshade", "gale-hillshade"],
    Slope: ["gale-regional-slope", "gale-global-slope", "gale-slope"],
    Thermal: ["gale-thermal"],
  },
  jezero: { Elevation: ["jezero-elevation"], Hillshade: ["jezero-hillshade"], Slope: ["jezero-slope"], Thermal: ["jezero-thermal"] },
  oxia: { Elevation: ["oxia-elevation"], Hillshade: ["oxia-terrain"], Slope: ["oxia-slope"], Thermal: ["oxia-thermal-night"] },
};
export const categoryInterpretation: Record<ScientificCategory, string> = {
  Elevation: "Terrain height relative to the source vertical reference; posting does not establish effective resolution or absolute accuracy.",
  Hillshade: "Artificial illumination reveals terrain shape. Intensity is unitless and does not represent actual sunlight or terrain safety.",
  Slope: "Local terrain gradient in degrees. Display classes are not astronaut safety thresholds or a traversability assessment.",
  Thermal: "Qualitative infrared mosaic brightness. This display is not calibrated temperature or thermal inertia; observation context differs by source.",
};
export function categoryLayers(region: RegionManifest, category: ScientificCategory): ScientificLayer[] {
  return datasets[region.id][category].map((id) => region.layers.find((layer) => layer.id === id)).filter((layer): layer is ScientificLayer => !!layer);
}
export function layerGroups(region: RegionManifest) {
  const scientific = scientificCategories.map((title) => ({ title, description: categoryInterpretation[title], layers: categoryLayers(region, title) }));
  const ids = new Set(scientific.flatMap((group) => group.layers.map((layer) => layer.id)));
  const remaining = region.layers.filter((layer) => !ids.has(layer.id) && !layer.zoom_extent);
  return [...scientific,
    { title: "Basemaps", description: "Optical context and mission imagery.", layers: remaining.filter((layer) => layer.kind === "optical") },
    { title: "Map overlays", description: "Recorded traverses and optional geological research overlays; these do not establish waypoint eligibility.", layers: remaining.filter((layer) => layer.kind !== "optical") },
  ];
}
