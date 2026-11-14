import type { AddProtocolAction } from "maplibre-gl";
import type { RegionManifest, ScientificLayer } from "@/lib/contracts/region";

type Extent = NonNullable<RegionManifest["map"]["supported_extent"]>;
export const SCIENTIFIC_CLIP_PROTOCOL = "marswalk-mission";

// Opt in only Gale's numeric/thermal display rasters. Basemaps, source bounds,
// vectors, other regions and native data are deliberately outside this mask.
export function usesScientificClip(region: RegionManifest, layer: ScientificLayer) {
  return region.id === "gale" && !!region.map.supported_extent &&
    layer.rendering.kind === "raster-tiles" &&
    (layer.kind === "topography" || layer.kind === "thermal");
}

export function missionTileTemplates(tiles: string[], extent: Extent): string[] {
  const bounds = [extent.west_east, extent.south_latitude, extent.east_east, extent.north_latitude];
  return tiles.map((tile) => {
    // Leave XYZ placeholders available to MapLibre's template substitution.
    const source = encodeURIComponent(tile).replaceAll("%7B", "{").replaceAll("%7D", "}");
    return `${SCIENTIFIC_CLIP_PROTOCOL}://tile/{z}/{x}/{y}?source=${source}&bounds=${bounds.join(",")}`;
  });
}

export function missionPixelRect(bounds: number[], z: number, x: number, y: number, size: number) {
  const [west, south, east, north] = bounds;
  if (bounds.length !== 4 || !bounds.every(Number.isFinite) || west >= east || south >= north ||
      Math.abs(south) > 85.051129 || Math.abs(north) > 85.051129)
    throw new Error("Invalid scientific presentation extent");
  const px = (lon: number) => ((lon + 180) / 360 * 2 ** z - x) * size;
  const py = (lat: number) => ((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * 2 ** z - y) * size;
  // Retain only cells wholly inside the mission rectangle. Conservative
  // inward quantization is <1 stored display pixel, with no outside spill.
  // Nearest rendering keeps the alpha edge contained even when overzoomed.
  const start = (value: number) => Math.max(0, Math.min(size, Math.ceil(value)));
  const end = (value: number) => Math.max(0, Math.min(size, Math.floor(value)));
  return { left: start(px(west)), right: end(px(east)), top: start(py(north)), bottom: end(py(south)) };
}

export const loadMissionTile: AddProtocolAction = async (request, controller) => {
  const url = new URL(request.url);
  const [z, x, y] = url.pathname.slice(1).split("/").map(Number);
  if (![z, x, y].every(Number.isInteger) || z < 0 || z > 22 || x < 0 || y < 0 || x >= 2 ** z || y >= 2 ** z)
    throw new Error("Invalid scientific tile coordinate");
  const source = url.searchParams.get("source");
  if (!source) throw new Error("Missing scientific source tile");
  const response = await fetch(source, { signal: controller.signal });
  if (!response.ok) throw new Error(`Scientific source tile unavailable (${response.status})`);
  const image = await createImageBitmap(await response.blob(), { colorSpaceConversion: "none" });
  try {
    controller.signal.throwIfAborted();
    if (image.width !== image.height) throw new Error("Expected square scientific tile");
    const rect = missionPixelRect((url.searchParams.get("bounds") ?? "").split(",").map(Number), z, x, y, image.width);
    const canvas = document.createElement("canvas");
    canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Scientific presentation masking unavailable");
    ctx.drawImage(image, 0, 0);
    ctx.clearRect(0, 0, rect.left, image.height);
    ctx.clearRect(rect.right, 0, image.width - rect.right, image.height);
    ctx.clearRect(0, 0, image.width, rect.top);
    ctx.clearRect(0, rect.bottom, image.width, image.height - rect.bottom);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      (value) => value ? resolve(value) : reject(new Error("Scientific mask encoding failed")), "image/png"));
    controller.signal.throwIfAborted();
    return { data: await blob.arrayBuffer() };
  } finally {
    image.close();
  }
};

let users = 0;
export function registerScientificClip(
  addProtocol: (name: string, load: AddProtocolAction) => void,
  removeProtocol: (name: string) => void,
) {
  if (users++ === 0) addProtocol(SCIENTIFIC_CLIP_PROTOCOL, loadMissionTile);
  return () => { if (--users === 0) removeProtocol(SCIENTIFIC_CLIP_PROTOCOL); };
}
