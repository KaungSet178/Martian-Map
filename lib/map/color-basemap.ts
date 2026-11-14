import type { Map as MapInstance } from "maplibre-gl";

// Source-specific display metadata. No shared geodesy or camera changes.
export const COLOR_BASEMAP = {
  id: "gale-usgs-color",
  tiles: "/maps/gale/usgs-color/{z}/{x}/{y}.webp",
  minzoom: 5,
  maxzoom: 15,
  bounds: [137.3442352329006, -4.822361175063087, 137.4579431096443, -4.580605407446296] as const,
  catalogue: "https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_orthophoto_mosaic_25cm",
  attribution: "USGS Astrogeology / NASA / JPL-Caltech / UArizona; Timothy Parker & Fred J. Calef III; processed LRGB; alignment unverified",
  description: "Processed color mosaic from real HiRISE observations. Color balance and sharpening applied by source authors; not guaranteed human-eye true color. CTX remains underneath as fallback. Local alignment with scientific overlays is unverified.",
} as const;

export function applyColorBasemap(map: MapInstance, color: boolean, visible: boolean, opacity: number) {
  if (color && !map.getSource(COLOR_BASEMAP.id)) {
    map.addSource(COLOR_BASEMAP.id, {
      type: "raster", tiles: [COLOR_BASEMAP.tiles.replace(/^\//, "marswalk-usgs://")], tileSize: 256,
      minzoom: COLOR_BASEMAP.minzoom, maxzoom: COLOR_BASEMAP.maxzoom,
      bounds: [...COLOR_BASEMAP.bounds], attribution: COLOR_BASEMAP.attribution,
    });
    const layers = map.getStyle().layers;
    const ctxIndex = layers.findIndex((layer) => layer.id === "region-gale-optical");
    if (ctxIndex < 0) throw new Error("CTX fallback must be mounted before USGS imagery");
    map.addLayer({
      id: COLOR_BASEMAP.id, type: "raster", source: COLOR_BASEMAP.id,
      layout: { visibility: "none" },
      paint: { "raster-fade-duration": 0, "raster-resampling": "linear" },
    }, layers[ctxIndex + 1]?.id);
  }
  if (map.getLayer(COLOR_BASEMAP.id)) {
    map.setLayoutProperty(COLOR_BASEMAP.id, "visibility", color && visible ? "visible" : "none");
    map.setPaintProperty(COLOR_BASEMAP.id, "raster-opacity", opacity / 100);
  }
}
