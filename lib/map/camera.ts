import type { Map as MapInstance, PaddingOptions } from "maplibre-gl";
import type { RegionManifest } from "@/lib/contracts/region";
import { displayBounds, toDisplayCoordinates } from "./region-layers";
import { previewCamera } from "./preview";

// Padding comes from visible map furniture, not a second subtraction of the
// desktop sidebar (the grid has already allocated its width to a sibling).
export function overviewPadding(container: HTMLElement): PaddingOptions {
  const frame = container.getBoundingClientRect();
  const workspace = container.parentElement;
  const title = workspace?.querySelector(".map-location")?.getBoundingClientRect();
  const controls = workspace?.querySelector(".map-navigation")?.getBoundingClientRect();
  const bottom = [".map-bottomline", ".map-attribution"]
    .map((selector) => workspace?.querySelector(selector)?.getBoundingClientRect().top)
    .filter((value): value is number => value !== undefined);
  const topInset = title ? title.bottom - frame.top + 16 : 24;
  const bottomInset = bottom.length ? frame.bottom - Math.min(...bottom) + 16 : 24;
  const verticalScale = Math.min(1, Math.max(0, frame.height - 48) / (topInset + bottomInset));
  return {
    top: topInset * verticalScale,
    bottom: bottomInset * verticalScale,
    left: Math.min(frame.width * .16, 32),
    right: Math.min(frame.width * .24, controls ? frame.right - controls.left + 16 : 32),
  };
}

export function fitOverview(
  map: MapInstance,
  region: RegionManifest,
  container: HTMLElement,
  preview: boolean,
  animate = false,
) {
  map.stop();
  // A data footprint is not a navigation boundary. In MapLibre maxBounds also
  // raises the minimum zoom until the viewport fits *inside* that rectangle.
  map.setMaxBounds(null);
  map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
  if (preview || region.map.visualization.status !== "available") {
    map.jumpTo(previewCamera);
  } else if (region.map.supported_extent) {
    map.fitBounds(displayBounds(region.map.supported_extent), {
      padding: overviewPadding(container),
      maxZoom: map.getMaxZoom(),
      bearing: 0,
      pitch: 0,
      duration: animate ? 280 : 0,
      linear: true,
      // MapLibre 6.18: explicit replacement avoids accumulating fit padding.
      absolutePadding: true,
    });
  } else {
    // Display-only fallback to the existing reviewed regional configuration;
    // it does not establish a complete footprint or routing coverage.
    map.jumpTo({
      center: toDisplayCoordinates(region.view_center),
      zoom: region.map.initial_zoom,
      bearing: 0,
      pitch: 0,
    });
  }
}

// Called only by an explicit coverage-fit action. Auto-focus remains separate.
export function fitLayerCoverage(
  map: MapInstance, region: RegionManifest, layerId: string, container: HTMLElement,
): boolean {
  const extent = region.layers.find((layer) => layer.id === layerId &&
    layer.availability === "available")?.zoom_extent;
  if (!extent || region.map.visualization.status !== "available") return false;
  fitOverview(map, { ...region, map: { ...region.map, supported_extent: extent } }, container, false, true);
  return true;
}
