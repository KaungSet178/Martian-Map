import type { Map as MapInstance } from "maplibre-gl";
import type {
  RegionManifest,
  MarsGeographicCoordinates,
} from "@/lib/contracts/region";

export type LayerState = { visible: boolean; opacity: number };
export type LayerStates = Record<string, LayerState>;
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
  if (change.visible && layer.kind !== "optical") {
    for (const other of region.layers.filter(
      (l) => l.id !== id && l.kind !== "optical",
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
  for (const layer of region.layers.filter(
    (l) => l.availability === "available",
  )) {
    const render = layer.rendering,
      id = `region-${layer.id}`;
    if (render.kind === "unavailable") continue;
    if (render.kind === "raster-tiles") {
      // Restrict tile *requests*, not the camera. Sparse regional tile packs do
      // not contain tiles outside this reviewed display footprint. Dateline-
      // crossing extents need split source bounds; leave those unbounded here.
      const bounds = region.map.supported_extent
        ? displayBounds(region.map.supported_extent)
        : undefined;
      const sourceBounds: [number, number, number, number] | undefined =
        bounds && bounds[1][0] <= 180
          ? [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]]
          : undefined;
      map.addSource(id, {
        type: "raster",
        tiles: render.tiles,
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
      });
    } else {
      // GeoJSON assets must already use the reviewed display transform.
      map.addSource(id, {
        type: "geojson",
        data: render.url,
        attribution: layer.attribution ?? undefined,
      });
      if (render.geometry === "line")
        map.addLayer({
          id,
          type: "line",
          source: id,
          layout: { visibility: "none" },
          paint: { "line-color": render.color, "line-width": 2 },
        });
      if (render.geometry === "fill")
        map.addLayer({
          id,
          type: "fill",
          source: id,
          layout: { visibility: "none" },
          paint: { "fill-color": render.color },
        });
      if (render.geometry === "circle")
        map.addLayer({
          id,
          type: "circle",
          source: id,
          layout: { visibility: "none" },
          paint: { "circle-color": render.color, "circle-radius": 5 },
        });
    }
    ids.push(id);
  }
  return () => {
    for (const id of ids.reverse()) {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    }
  };
}
export function applyLayerStates(
  map: MapInstance,
  region: RegionManifest,
  states: LayerStates,
  preview: boolean,
) {
  for (const layer of region.layers) {
    const id = `region-${layer.id}`;
    if (!map.getLayer(id) || layer.rendering.kind === "unavailable") continue;
    const state = layerState(region, states, layer.id);
    map.setLayoutProperty(
      id,
      "visibility",
      !preview && state.visible ? "visible" : "none",
    );
    const type =
      layer.rendering.kind === "raster-tiles"
        ? "raster"
        : layer.rendering.geometry;
    map.setPaintProperty(id, `${type}-opacity`, state.opacity / 100);
  }
}
