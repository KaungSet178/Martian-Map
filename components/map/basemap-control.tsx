"use client";

import { useEffect, useState } from "react";
import type { Map as MapInstance, ErrorEvent as MapErrorEvent } from "maplibre-gl";
import { addProtocol, removeProtocol } from "maplibre-gl";
import { COLOR_BASEMAP, applyColorBasemap } from "@/lib/map/color-basemap";

export default function BasemapControl({
  map, visible, opacity, contextVisible, onContextVisibleChange,
}: {
  map: MapInstance | null;
  visible: boolean;
  opacity: number;
  contextVisible: boolean;
  onContextVisibleChange: (visible: boolean) => void;
}) {
  const [mode, setMode] = useState("ctx");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!map) return;
    // MapLibre treats HTTP 404 tiles as normal sparse coverage and suppresses
    // error events. Convert any failed color request into an explicit source
    // error so users receive CTX fallback rather than a silent partial mosaic.
    addProtocol("marswalk-usgs", async (request, controller) => {
      const response = await fetch(request.url.replace("marswalk-usgs://", "/"), { signal: controller.signal });
      if (!response.ok) throw new Error(`USGS imagery unavailable (${response.status})`);
      return { data: await response.arrayBuffer() };
    });
    const onError = (event: MapErrorEvent & { sourceId?: string }) => {
      if (event.sourceId !== COLOR_BASEMAP.id) return;
      if (map.getLayer(COLOR_BASEMAP.id)) map.setLayoutProperty(COLOR_BASEMAP.id, "visibility", "none");
      setMode("ctx");
      setNotice("USGS imagery could not load. Detailed CTX restored; mission and camera preserved.");
    };
    map.on("error", onError);
    return () => {
      map.off("error", onError);
      if (map.getLayer(COLOR_BASEMAP.id)) map.removeLayer(COLOR_BASEMAP.id);
      if (map.getSource(COLOR_BASEMAP.id)) map.removeSource(COLOR_BASEMAP.id);
      removeProtocol("marswalk-usgs");
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;
    applyColorBasemap(map, mode === "color", visible, opacity);
  }, [map, mode, visible, opacity]);

  return (
    <div className="basemap-control" data-testid="basemap-control" data-mode={mode}>
      <label htmlFor="gale-basemap">Basemap</label>
      <select id="gale-basemap" value={mode} disabled={!map} aria-describedby="basemap-source"
        onChange={(event) => { setMode(event.target.value); setNotice(""); }}>
        <option value="ctx">Curiosity detailed CTX</option>
        <option value="color">USGS Color · provisional</option>
      </select>
      <label className="check-row basemap-context-toggle">
        <input
          type="checkbox"
          checked={contextVisible}
          disabled={!map}
          onChange={(event) => onContextVisibleChange(event.target.checked)}
        />
        Show wider Gale context
      </label>
      <div id="basemap-source" role="status">
        {notice || (mode === "color" ? <>
          <strong>Alignment unverified · visual comparison</strong>
          <div>USGS · Parker & Calef · processed LRGB</div>
          <details><summary>Source & limitations</summary>
            <p>{COLOR_BASEMAP.description}</p>
            <p>High-resolution orbital imagery for visual terrain inspection. 0.25 m source grid; spatially variable detail. Tiles sample a 2 m source overview. No validated positional uncertainty or terrain safety assessment.</p>
            <a href={COLOR_BASEMAP.catalogue} target="_blank" rel="noreferrer">USGS source · Parker & Calef</a>
          </details>
        </> : <>
          <div>NASA Trek CTX · ~10 m detailed mission sampling</div>
          <details><summary>Coverage & source</summary>
            <p>The wider Gale context is hidden by default; enable Show wider Gale context to restore it. Context covers 136.4–138.4°E, 5.6–3.8°S; gaps remain transparent. These are display sample spacings, not verified effective resolution. Absolute positional accuracy is unquantified.</p>
            <a href="https://trek.nasa.gov/tiles/Mars/EQ/Gale_CTX_BlockAdj_dd/1.0.0/WMTSCapabilities.xml" target="_blank" rel="noreferrer">NASA Trek source</a>
          </details>
        </>)}
      </div>
    </div>
  );
}
