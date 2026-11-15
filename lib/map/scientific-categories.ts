import type { RegionManifest, ScientificLayer } from "@/lib/contracts/region";

export const scientificCategories = ["Elevation", "Hillshade", "Slope", "Thermal"] as const;
export type ScientificCategory = typeof scientificCategories[number];
const datasets: Record<RegionManifest["id"], Record<ScientificCategory, string[]>> = {
  gale: {
    Elevation: ["gale-regional-elevation"],
    Hillshade: ["gale-regional-hillshade"],
    Slope: ["gale-regional-slope"],
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
// Keep dataset metadata intact while limiting Gale's selectable display products.
export function isLayerSelectable(region: RegionManifest, layer: ScientificLayer): boolean {
  if (region.id !== "gale") return true;
  if (layer.kind === "optical") return false; // Internal fallback assets, not basemap choices.
  if (layer.zoom_extent) return false;
  return layer.kind !== "topography" || Object.values(datasets.gale).some((ids) => ids.includes(layer.id));
}
export function layerGroups(region: RegionManifest) {
  const scientific = scientificCategories.map((title) => ({ title, description: categoryInterpretation[title], layers: categoryLayers(region, title) }));
  const ids = new Set(scientific.flatMap((group) => group.layers.map((layer) => layer.id)));
  const remaining = region.layers.filter((layer) => !ids.has(layer.id) && !layer.zoom_extent && isLayerSelectable(region, layer));
  return [...scientific,
    ...(region.id === "gale" ? [] : [{ title: "Basemaps", description: "Optical context and mission imagery.", layers: remaining.filter((layer) => layer.kind === "optical") }]),
    { title: "Map overlays", description: "Recorded traverses and dataset coverage outlines; these do not establish waypoint eligibility.", layers: remaining.filter((layer) => layer.kind !== "optical") },
  ];
}
