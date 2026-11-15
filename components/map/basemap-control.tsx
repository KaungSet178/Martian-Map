"use client";

import { useEffect, useState } from "react";
import type { Map as MapInstance, ErrorEvent as MapErrorEvent } from "maplibre-gl";
import { addProtocol, removeProtocol } from "maplibre-gl";
import { COLOR_BASEMAP, applyColorBasemap } from "@/lib/map/color-basemap";

// Gale has one automatic basemap. CTX is retained only as a rendering fallback.
export default function BasemapControl({ map }: { map: MapInstance | null }) {
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!map) return;
    let failed = false;
    let mounting = false;
    // Sparse-tile 404s otherwise do not reliably emit MapLibre error events.
    addProtocol("marswalk-usgs", async (request, controller) => {
      const response = await fetch(request.url.replace("marswalk-usgs://", "/"), { signal: controller.signal });
      if (!response.ok) throw new Error(`USGS imagery unavailable (${response.status})`);
      return { data: await response.arrayBuffer() };
    });
    const onError = (event: MapErrorEvent & { sourceId?: string }) => {
      if (event.sourceId !== COLOR_BASEMAP.id) return;
      failed = true;
      if (map.getLayer(COLOR_BASEMAP.id)) map.setLayoutProperty(COLOR_BASEMAP.id, "visibility", "none");
      setNotice("USGS imagery could not load. Detailed CTX fallback is shown where available; coverage may be incomplete. Mission and camera preserved.");
    };
    const mount = () => {
      // On region changes the controller can mount before the regional layers.
      if (failed || mounting || map.getLayer(COLOR_BASEMAP.id) || !map.getLayer("region-gale-optical")) return;
      mounting = true;
      applyColorBasemap(map, true, true, 100);
      mounting = false;
    };
    map.on("error", onError);
    map.on("styledata", mount);
    mount();
    return () => {
      map.off("error", onError);
      map.off("styledata", mount);
      if (map.getLayer(COLOR_BASEMAP.id)) map.removeLayer(COLOR_BASEMAP.id);
      if (map.getSource(COLOR_BASEMAP.id)) map.removeSource(COLOR_BASEMAP.id);
      removeProtocol("marswalk-usgs");
    };
  }, [map]);

  return notice ? <div className="basemap-control" role="status" data-testid="basemap-fallback-notice">{notice}</div> : null;
}
