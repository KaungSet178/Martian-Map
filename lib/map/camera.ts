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

// A close-up fills the map behind the floating title and basemap panels, which
// are opaque surfaces. Reserving the whole title block would letterbox a wide
// viewport with dark background that no overlay occupies. Keep only a modest
// breathing edge, the real navigation-control column and the bottom strip.
export function focusPadding(container: HTMLElement): PaddingOptions {
  const frame = container.getBoundingClientRect();
  const controls = container.parentElement
    ?.querySelector(".map-navigation")?.getBoundingClientRect();
  return {
    top: Math.min(24, frame.height * .05),
    bottom: Math.min(64, frame.height * .12),
    left: Math.min(24, frame.width * .06),
    right: Math.min(frame.width * .24,
      controls ? frame.right - controls.left + 16 : 32),
  };
}

export function fitOverview(
  map: MapInstance,
  region: RegionManifest,
  container: HTMLElement,
  preview: boolean,
  animate = false,
  paddingOverride?: PaddingOptions,
) {
  if (region.id === "gale") {
    const frame = container.getBoundingClientRect();
    if (frame.width <= 0 || frame.height <= 0) return;
    // A sheet/region transition can update DOM dimensions before MapLibre's
    // cached transform. Fit only after those sizes agree; otherwise correct
    // new padding can exceed the old canvas height and produce an unfit view.
    map.resize();
  }
  map.stop();
  // A data footprint is not a navigation boundary. In MapLibre maxBounds also
  // raises the minimum zoom until the viewport fits *inside* that rectangle.
  map.setMaxBounds(null);
  map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
  if (preview || region.map.visualization.status !== "available") {
    map.jumpTo(previewCamera);
  } else if (region.map.supported_extent) {
    map.fitBounds(displayBounds(region.map.supported_extent), {
      padding: paddingOverride ?? overviewPadding(container),
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

type Extent = NonNullable<RegionManifest["map"]["supported_extent"]>;
const MERCATOR_MAX_LATITUDE = 85.0511287798066;

// MapLibre renders the Mars equirectangular source through Web Mercator. Use
// projected spans, not raw degrees, so the close-up is not subtly stretched.
function mercatorY(latitude: number) {
  const clamped = Math.max(-MERCATOR_MAX_LATITUDE, Math.min(MERCATOR_MAX_LATITUDE, latitude));
  return Math.log(Math.tan(Math.PI / 4 + (clamped * Math.PI) / 360));
}
function mercatorLatitude(y: number) {
  return ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI;
}

// Largest viewport-aspect rectangle inside the reviewed initial window. The
// window is display framing already inside the detailed CTX footprint; this
// only crops it further so one real subsection fills the usable map instead
// of exposing dark margins beside a portrait footprint on a wide screen.
// It never invents coverage, shifts imagery or changes scientific bounds.
export function focusExtentForViewport(
  region: RegionManifest,
  viewport: { width: number; height: number },
  padding: PaddingOptions,
): Extent | null {
  const framing = region.map.initial_extent;
  const detailed = region.map.supported_extent;
  if (!framing || !detailed) return null;
  const padLeft = padding.left ?? 0;
  const padRight = padding.right ?? 0;
  const padTop = padding.top ?? 0;
  const padBottom = padding.bottom ?? 0;
  const usableWidth = viewport.width - padLeft - padRight;
  const usableHeight = viewport.height - padTop - padBottom;
  if (!(usableWidth > 0) || !(usableHeight > 0)) return null;
  // A display window must not exceed the reviewed mission footprint. Unknown
  // or malformed combinations fall back to the existing framing behaviour.
  const west = Math.max(framing.west_east, detailed.west_east);
  const east = Math.min(framing.east_east, detailed.east_east);
  const south = Math.max(framing.south_latitude, detailed.south_latitude);
  const north = Math.min(framing.north_latitude, detailed.north_latitude);
  if (!(west < east) || !(south < north)) return null;
  const centerLongitude = (west + east) / 2;
  const southY = mercatorY(south), northY = mercatorY(north);
  const centerY = (southY + northY) / 2;
  // Mercator x is longitude in radians; y spans are already projected.
  const halfWindowWidth = ((east - west) * Math.PI) / 360;
  const halfWindowHeight = (northY - southY) / 2;
  const aspect = usableWidth / usableHeight;
  // Saturate the narrower geographic axis: full window width on landscape
  // screens, full window height on tall screens. The result always fits.
  const halfHeight = Math.min(halfWindowHeight, halfWindowWidth / aspect);
  const halfWidth = halfHeight * aspect;
  if (!(halfHeight > 0) || !(halfWidth > 0)) return null;
  const halfLongitude = (halfWidth * 180) / Math.PI;
  return {
    west_east: centerLongitude - halfLongitude,
    east_east: centerLongitude + halfLongitude,
    south_latitude: mercatorLatitude(centerY - halfHeight),
    north_latitude: mercatorLatitude(centerY + halfHeight),
  };
}

// Optional initial framing never replaces the explicit whole-mission action.
// A fresh Gale entry (or the explicit Explore action) gets an aspect-aware
// close-up; other regions keep their existing initial camera.
export function fitInitialView(
  map: MapInstance, region: RegionManifest, container: HTMLElement, preview: boolean,
  animate = false,
) {
  const frame = container.getBoundingClientRect();
  const padding = focusPadding(container);
  const focus = !preview && frame.width > 0 && frame.height > 0
    ? focusExtentForViewport(region, frame, padding)
    : null;
  const extent = focus ?? region.map.initial_extent;
  fitOverview(map, extent && !preview
    ? { ...region, map: { ...region.map, supported_extent: extent } }
    : region, container, preview, animate, focus ? padding : undefined);
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
