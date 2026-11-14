import type { Map as MapInstance, ExpressionSpecification } from "maplibre-gl";
import type {
  RegionManifest,
  MarsGeographicCoordinates,
} from "@/lib/contracts/region";
import { missionTileTemplates, usesScientificClip } from "./scientific-clip";

export type CoverageFocusRequest = { region_id: string; layer_id: string; request_id: number };
export type LayerState = { visible: boolean; opacity: number };
export type LayerStates = Record<string, LayerState>;

export const PRESENTATION_MASK_LAYER_ID = "region-presentation-mask";
export const PRESENTATION_MASK_SOURCE_ID = "region-presentation-mask";
type ClipState = { clip: boolean; pending: boolean; opacity: number; stop?: () => void };
const clippedSources = new WeakMap<MapInstance, Map<string, ClipState>>();

export function createPresentationMaskData(
  extent: NonNullable<RegionManifest["map"]["supported_extent"]>,
) {
  const bounds = displayBounds(extent);
  const [west, south] = bounds[0];
  const [east, north] = bounds[1];
  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "Polygon" as const,
      coordinates: [
        // Exterior ring (counter-clockwise across global display)
        [
          [-180, -85.051129],
          [180, -85.051129],
          [180, 85.051129],
          [-180, 85.051129],
          [-180, -85.051129],
        ],
        // Hole (clockwise across mission overview footprint)
        [
          [west, south],
          [west, north],
          [east, north],
          [east, south],
          [west, south],
        ],
      ],
    },
  };
}
export function fillColor(layer: RegionManifest["layers"][number]): string | ExpressionSpecification {
  const render = layer.rendering;
  if (render.kind !== "geojson") return "#647C9A";
  const items = layer.legend?.items;
  if (!render.category_property || !items?.length) return render.color;
  return ["match", ["get", render.category_property], items[0].value!, items[0].color,
    ...items.slice(1).flatMap((item) => [item.value!, item.color]), render.color];
}
export function displayBounds(
  extent: NonNullable<RegionManifest["map"]["supported_extent"]>,
): [[number, number], [number, number]] {
  const west =
    extent.west_east > 180 ? extent.west_east - 360 : extent.west_east;
  let east = extent.east_east > 180 ? extent.east_east - 360 : extent.east_east;
  if (east < west) east += 360;
  return [
    [west, extent.south_latitude],
    [east, extent.north_latitude],
  ];
}
export function toDisplayCoordinates(
  point: MarsGeographicCoordinates,
): [number, number] {
  // Display conversion only. Never use MapLibre/Earth distances for Mars.
  return [
    point.longitude_east > 180
      ? point.longitude_east - 360
      : point.longitude_east,
    point.latitude,
  ];
}
export function layerState(
  region: RegionManifest,
  states: LayerStates,
  id: string,
): LayerState {
  const layer = region.layers.find((l) => l.id === id);
  return (
    states[id] ?? {
      visible: layer?.default_visible ?? false,
      opacity: layer?.default_opacity ?? 70,
    }
  );
}
export function updateLayerState(
  region: RegionManifest,
  states: LayerStates,
  id: string,
  change: Partial<LayerState>,
): LayerStates {
  const layer = region.layers.find((l) => l.id === id);
  if (!layer || layer.availability !== "available") return states;
  const next = {
    ...states,
    [id]: { ...layerState(region, states, id), ...change },
  };
  // Gale terrain products are alternative thematic views. Geology/traverse
  // are independent overlays. Preserve the legacy policy in other regions.
  const incompatible = (other: RegionManifest["layers"][number]) =>
    region.id === "gale"
      ? layer.kind === "topography" && other.kind === "topography"
      : layer.kind !== "optical" && layer.kind !== "overlay" &&
        other.kind !== "optical" && other.kind !== "overlay";
  if (change.visible) {
    for (const other of region.layers.filter(
      (l) => l.id !== id && incompatible(l),
    ))
      next[other.id] = {
        ...layerState(region, next, other.id),
        visible: false,
      };
  }
  return next;
}
export function mountRegionLayers(
  map: MapInstance,
  region: RegionManifest,
): () => void {
  if (region.map.visualization.status !== "available") return () => {};
  const ids: string[] = [];
  const clips = new Map<string, ClipState>();
  clippedSources.set(map, clips);
  const availableLayers = region.layers.filter(
    (l) => l.availability === "available",
  );

  // 1. Mount raster tile layers
  for (const layer of availableLayers) {
    const render = layer.rendering,
      id = `region-${layer.id}`;
    if (render.kind !== "raster-tiles") continue;
    // Restrict tile *requests*, not the camera. Sparse regional tile packs do
    // not contain tiles outside this reviewed display footprint. Dateline-
    // crossing extents need split source bounds; leave those unbounded here.
    const extent = render.bounds ?? region.map.supported_extent;
    const bounds = extent
      ? displayBounds(extent)
      : undefined;
    const sourceBounds: [number, number, number, number] | undefined =
      bounds && bounds[1][0] <= 180
        ? [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]]
        : undefined;
    map.addSource(id, {
      type: "raster",
      tiles: usesScientificClip(region, layer)
        ? missionTileTemplates(render.tiles, region.map.supported_extent!)
        : render.tiles,
      tileSize: render.tile_size,
      minzoom: render.min_zoom,
      maxzoom: render.max_zoom,
      bounds: sourceBounds,
      attribution: layer.attribution ?? undefined,
    });
    map.addLayer({
      id,
      type: "raster",
      source: id,
      layout: { visibility: "none" },
      paint: {
        "raster-resampling": usesScientificClip(region, layer) ? "nearest" : render.resampling ?? "linear",
        ...(usesScientificClip(region, layer) ? { "raster-fade-duration": 0 } : {}),
      },
    });
    ids.push(id);
    if (usesScientificClip(region, layer)) clips.set(id, { clip: true, pending: false, opacity: layer.default_opacity / 100 });
  }

  // 2. Mount presentation mask layer immediately above raster layers
  const hasRaster = availableLayers.some((l) => l.rendering.kind === "raster-tiles");
  // Gale clips scientific tile alpha instead. Its authentic context/optical
  // imagery must remain visible outside the mission footprint. Other regions
  // retain their existing presentation behavior.
  if (region.id !== "gale" && hasRaster && region.map.supported_extent) {
    map.addSource(PRESENTATION_MASK_SOURCE_ID, {
      type: "geojson",
      data: createPresentationMaskData(region.map.supported_extent),
    });
    map.addLayer({
      id: PRESENTATION_MASK_LAYER_ID,
      type: "fill",
      source: PRESENTATION_MASK_SOURCE_ID,
      layout: { visibility: "visible" },
      paint: {
        "fill-color": "#0D1928",
        "fill-opacity": 1,
        "fill-outline-color": "#0D1928",
      },
    });
    ids.push(PRESENTATION_MASK_LAYER_ID);
  }

  // 3. Mount vector / GeoJSON layers above the presentation mask
  for (const layer of availableLayers) {
    const render = layer.rendering,
      id = `region-${layer.id}`;
    if (render.kind !== "geojson") continue;
    // GeoJSON assets must already use the reviewed display transform.
    map.addSource(id, {
      type: "geojson",
      data: render.url,
      attribution: layer.attribution ?? undefined,
    });
    if (render.geometry === "line") {
      // A thin dark casing keeps the optional boundaries legible over both
      // light imagery and the dark map background. No polygon fill is added.
      if (render.line_pattern) {
        const halo = `${id}-halo`;
        map.addLayer({
          id: halo, type: "line", source: id,
          layout: { visibility: "none", "line-join": "round" },
          paint: { "line-color": "#09111F", "line-width": 5,
            ...(render.line_pattern === "dashed" ? { "line-dasharray": [2.4, 1.6] } : {}) },
        });
        ids.push(halo);
      }
      map.addLayer({
        id,
        type: "line",
        source: id,
        layout: { visibility: "none", ...(render.line_pattern ? { "line-join": "round" as const } : {}) },
        paint: { "line-color": render.color, "line-width": 2,
          ...(render.line_pattern === "dashed" ? { "line-dasharray": [6, 4] } : {}) },
      });
      ids.push(id);
    }
    if (render.geometry === "fill") {
      map.addLayer({
        id,
        type: "fill",
        source: id,
        layout: { visibility: "none" },
        paint: {
          "fill-color": fillColor(layer),
          ...(render.category_property ? { "fill-outline-color": "#111D30" } : {}),
        },
      });
      ids.push(id);
    }
    if (render.geometry === "circle") {
      map.addLayer({
        id,
        type: "circle",
        source: id,
        layout: { visibility: "none" },
        paint: { "circle-color": render.color, "circle-radius": 5 },
      });
      ids.push(id);
    }
  }
  return () => {
    for (const entry of clips.values()) entry.stop?.();
    clippedSources.delete(map);
    for (const id of [...ids].reverse())
      if (map.getLayer(id)) map.removeLayer(id);
    for (const id of ids)
      if (map.getSource(id)) map.removeSource(id);
  };
}
export function applyLayerStates(
  map: MapInstance,
  region: RegionManifest,
  states: LayerStates,
  preview: boolean,
  presentationMode: "mission_view" | "full_coverage" = "mission_view",
) {
  const isFullCoverage = presentationMode === "full_coverage" ||
    states["presentation-mode"]?.visible === false ||
    states[PRESENTATION_MASK_LAYER_ID]?.visible === false;
  if (map.getLayer(PRESENTATION_MASK_LAYER_ID)) {
    const maskVisible = !preview && !isFullCoverage;
    map.setLayoutProperty(
      PRESENTATION_MASK_LAYER_ID,
      "visibility",
      maskVisible ? "visible" : "none",
    );
  }
  for (const layer of region.layers) {
    const id = `region-${layer.id}`;
    if (!map.getLayer(id) || layer.rendering.kind === "unavailable") continue;
    const state = layerState(region, states, layer.id);
    const entry = clippedSources.get(map)?.get(id);
    if (entry) entry.opacity = state.opacity / 100;
    if (usesScientificClip(region, layer) && layer.rendering.kind === "raster-tiles") {
      const clip = !isFullCoverage;
      if (entry && entry.clip !== clip) {
        const source = map.getSource(id);
        if (source && "setTiles" in source && typeof source.setTiles === "function") {
          entry.stop?.();
          entry.clip = clip;
          entry.pending = true;
          // MapLibre keeps expired textures renderable while setTiles reloads.
          // Hide this scientific raster until the new tiles finish, so a
          // Full -> Mission transition cannot flash the old unclipped data.
          map.setPaintProperty(id, "raster-opacity", 0);
          const onData = (event: { sourceId?: string; sourceDataType?: string; sourceDataChanged?: boolean }) => {
            if (event.sourceId !== id || event.sourceDataType === "metadata" || event.sourceDataChanged || !map.isSourceLoaded(id)) return;
            entry.pending = false;
            entry.stop?.();
            entry.stop = undefined;
            map.setPaintProperty(id, "raster-opacity", entry.opacity);
          };
          map.on("sourcedata", onData);
          entry.stop = () => map.off("sourcedata", onData);
          source.setTiles(clip ? missionTileTemplates(layer.rendering.tiles, region.map.supported_extent!) : layer.rendering.tiles);
        }
      }
      map.setPaintProperty(id, "raster-resampling", clip ? "nearest" : layer.rendering.resampling ?? "linear");
    }
    map.setLayoutProperty(
      id,
      "visibility",
      !preview && state.visible ? "visible" : "none",
    );
    const type =
      layer.rendering.kind === "raster-tiles"
        ? "raster"
        : layer.rendering.geometry;
    map.setPaintProperty(id, `${type}-opacity`, entry?.pending ? 0 : state.opacity / 100);
    if (layer.rendering.kind === "geojson" && layer.rendering.line_pattern) {
      const halo = `${id}-halo`;
      if (map.getLayer(halo)) {
        map.setLayoutProperty(halo, "visibility", !preview && state.visible ? "visible" : "none");
        map.setPaintProperty(halo, "line-opacity", state.opacity / 100);
      }
    }
  }
}
