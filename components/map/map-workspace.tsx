"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapInstance, Marker } from "maplibre-gl";
import {
  schematicContours,
  previewCamera,
  previewPositions,
} from "@/lib/map/preview";
import {
  applyLayerStates,
  mountRegionLayers,
  layerState,
  toDisplayCoordinates,
  displayBounds,
  type LayerStates,
} from "@/lib/map/region-layers";
import {
  Crosshair,
  Layers,
  Minus,
  Plus,
  ArrowUp,
  Map as MapIcon,
  PanelLeftOpen,
} from "lucide-react";
import type { RegionManifest } from "@/lib/contracts/region";
import {
  ROUTE_LABELS,
  VALIDATION_LABELS,
  routeFeatureCollection,
  type DisplayRoute,
} from "@/lib/map/routes";
import { hasVerifiedMapLocation } from "@/lib/map/target-location";
import { Badge } from "@/components/ui/primitives";

type Props = {
  region: RegionManifest;
  preview: boolean;
  setPreview: (value: boolean) => void;
  selected: string | null;
  stops: string[];
  onInspect: (id: string) => void;
  onLayers: () => void;
  onEvidence: () => void;
  onExpand: () => void;
  collapsed: boolean;
  contours: boolean;
  showMarkers: boolean;
  opacity: number;
  layerStates: LayerStates;
  routes: DisplayRoute[];
  selectedRouteId: string | null;
};

export default function MapWorkspace({
  region,
  preview,
  setPreview,
  selected,
  stops,
  onInspect,
  onLayers,
  onEvidence,
  onExpand,
  collapsed,
  contours,
  showMarkers,
  opacity,
  layerStates,
  routes,
  selectedRouteId,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const markers = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const scientificMap = region.map.visualization.status === "available";
  const activeLayers = region.layers.filter(
    (l) =>
      l.availability === "available" &&
      layerState(region, layerStates, l.id).visible,
  );

  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;
    import("maplibre-gl")
      .then(({ Map, setWorkerUrl }) => {
        if (disposed || !container.current) return;
        try {
          setWorkerUrl("/generated/maplibre-gl-worker.mjs");
          const instance = new Map({
            container: container.current,
            center: [0, 0],
            zoom: 7.3,
            minZoom: 5,
            // Must cover the deepest integrated raster layer (CTX z5-13);
            // maxBounds still clamps panning to the supported extent.
            maxZoom: 13,
            bearing: 0,
            pitch: 0,
            maxPitch: 0,
            attributionControl: false,
            renderWorldCopies: false,
            style: {
              version: 8,
              sources: {},
              layers: [
                {
                  id: "background",
                  type: "background",
                  paint: { "background-color": "#0D1928" },
                },
              ],
            },
          });
          map.current = instance;
          
          // Set cursor to indicate map is interactive for zoom (mouse wheel/trackpad)
          if (container.current) {
            container.current.style.cursor = "grab";
          }
          
          instance
            .getCanvas()
            .setAttribute(
              "aria-label",
              "Schematic preview canvas. No georeferenced scientific map is connected.",
            );
          instance.getCanvas().setAttribute("tabindex", "-1");
          instance.on("load", () => {
            if (!disposed) setReady(true);
          });
          instance.on("error", () => {
            if (!disposed) setFailed(true);
          });
          // Ensure map container has minimum height for rendering
          if (container.current) {
            container.current.style.minHeight = "400px";
            container.current.style.height = "100%";
          }
          observer = new ResizeObserver(() => instance.resize());
          observer.observe(container.current);
          
          // Set cursor to indicate map interactivity (zoom with mouse wheel/trackpad)
          if (mapContainerRef.current) {
            mapContainerRef.current.style.cursor = "grab";
          }
        } catch {
          if (!disposed) setFailed(true);
        }
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });
    return () => {
      disposed = true;
      observer?.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !map.current) return;
    return mountRegionLayers(map.current, region);
  }, [ready, region]);

  useEffect(() => {
    if (!ready || !map.current) return;
    applyLayerStates(map.current, region, layerStates, preview);
  }, [ready, region, layerStates, preview]);

  useEffect(() => {
    if (!ready || !map.current) return;
    map.current.setMaxBounds(
      !preview && scientificMap && region.map.supported_extent
        ? displayBounds(region.map.supported_extent)
        : null,
    );
    // Jump to region view, with fallback to [0, 0] if coordinates fail
    map.current.jumpTo(
      preview || !scientificMap
        ? previewCamera
        : {
            center: toDisplayCoordinates(region.view_center) || [0, 0],
            zoom: region.map.initial_zoom ?? 7.3,
            bearing: 0,
          },
    );
  }, [ready, region, preview, scientificMap]);

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    instance
      .getCanvas()
      .setAttribute("tabindex", preview || scientificMap ? "0" : "-1");
    instance
      .getCanvas()
      .setAttribute(
        "aria-label",
        preview
          ? "Schematic preview canvas. Not a scientific map."
          : scientificMap
            ? `${region.name} scientific map. Display coordinates only; no Earth distance calculations.`
            : "Schematic preview canvas. No georeferenced scientific map is connected.",
      );
    if (!instance.getSource("schematic")) {
      instance.addSource("schematic", {
        type: "geojson",
        data: schematicContours(),
      });
      instance.addLayer({
        id: "schematic-lines",
        type: "line",
        source: "schematic",
        paint: {
          "line-color": ["case", ["get", "major"], "#536477", "#26394D"],
          "line-width": ["case", ["get", "major"], 1.2, 0.7],
        },
      });
    }
    instance.setLayoutProperty(
      "schematic-lines",
      "visibility",
      preview && contours ? "visible" : "none",
    );
    instance.setPaintProperty("schematic-lines", "line-opacity", opacity / 100);
    for (const handler of [
      instance.dragPan,
      instance.scrollZoom,
      instance.boxZoom,
      instance.doubleClickZoom,
      instance.keyboard,
      instance.touchZoomRotate,
    ]) {
      if (preview || scientificMap) handler.enable();
      else handler.disable();
    }
    instance.dragRotate.disable();
  }, [ready, preview, contours, opacity, scientificMap, region.name]);

  useEffect(() => {
    let disposed = false;
    markers.current.forEach((m) => m.remove());
    markers.current = [];
    if (
      !ready ||
      (!preview && !scientificMap) ||
      (preview && !showMarkers) ||
      !map.current
    )
      return;
    import("maplibre-gl").then(({ Marker }) => {
      if (disposed || !map.current) return;
      markers.current = region.targets
        .filter((target) => {
          // Schematic scenario positions are confined to the explicit interface preview.
          return target.region_id === region.id && (preview
            ? target.evidence === "Scenario"
            : hasVerifiedMapLocation(target, region));
        })
        .map((target, i) => {
          const button = document.createElement("button");
          button.className = `science-marker ${selected === target.id ? "inspected" : ""} ${stops.includes(target.id) ? "added" : ""}`;
          button.setAttribute(
            "aria-label",
            `Inspect ${target.title}, ${preview ? "schematic location" : "verified location"}`,
          );
          button.setAttribute("aria-pressed", String(selected === target.id));
          const label = document.createElement("span");
          label.textContent = stops.includes(target.id)
            ? String(stops.indexOf(target.id) + 1)
            : "◇";
          button.append(label);
          button.onclick = () => onInspect(target.id);
  
          // Increase click target size for better accessibility
          button.style.width = "48px";
          button.style.height = "48px";
          button.style.display = "flex";
          button.style.alignItems = "center";
          button.style.justifyContent = "center";
  
          return new Marker({ element: button })
            .setLngLat(
              preview
                ? previewPositions[i % previewPositions.length]
                : toDisplayCoordinates(target.coordinates!),
            )
            .addTo(map.current!);
        });
    });
    return () => {
      disposed = true;
      markers.current.forEach((m) => m.remove());
    };
  }, [
    ready,
    preview,
    showMarkers,
    region,
    selected,
    stops,
    onInspect,
    scientificMap,
  ]);

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    const source = "route-candidates";
    const layers = ["route-casing", "route-alternate", "route-selected"];

    // Always rebuild from the loaded, versioned result. No decorative or
    // client-calculated path is ever added here.
    for (const id of [...layers].reverse())
      if (instance.getLayer(id)) instance.removeLayer(id);
    if (instance.getSource(source)) instance.removeSource(source);

    if (preview || !scientificMap || routes.length === 0) return;

    instance.addSource(source, {
      type: "geojson",
      data: routeFeatureCollection(routes, selectedRouteId),
    });
    instance.addLayer({
      id: "route-casing",
      type: "line",
      source,
      filter: ["==", ["get", "selected"], true],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#04101C",
        "line-width": 9,
        "line-opacity": 0.85,
      },
    });
    instance.addLayer({
      id: "route-alternate",
      type: "line",
      source,
      filter: ["==", ["get", "selected"], false],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#7FD8F0",
        "line-width": 2,
        "line-opacity": 0.55,
        "line-dasharray": [2, 1.5],
      },
    });
    instance.addLayer({
      id: "route-selected",
      type: "line",
      source,
      filter: ["==", ["get", "selected"], true],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#63E4FF",
        "line-width": 3.5,
        "line-opacity": 0.95,
      },
    });
  }, [ready, preview, scientificMap, region, routes, selectedRouteId]);

  const selectedRoute =
    routes.find((route) => route.id === selectedRouteId) ?? null;

  return (
    <section
      className={`map-workspace ${preview ? "preview" : ""} ${scientificMap ? "scientific" : ""}`}
      aria-label={`${region.name} map workspace`}
    >
      <div className="map-canvas" ref={container} data-testid="map-canvas" />
      <div className="map-topline">
        <div className="map-location">
          {collapsed && (
            <button
              className="icon-button"
              onClick={onExpand}
              aria-label="Open planning panel"
            >
              <PanelLeftOpen size={20} />
            </button>
          )}
          <div>
            <span className="eyebrow">
              {region.region_status === "planned"
                ? "Planned mission area"
                : "Exploration region"}
            </span>
            <h1>{region.name}</h1>
            <p>{region.mission_context}</p>
          </div>
        </div>
        <button className="surface-button" onClick={onLayers}>
          <Layers size={18} />
          Layers
        </button>
      </div>
      {preview ? (
        <div className="preview-label">
          <Badge tone="science">Interface preview</Badge>
          <span>Schematic geometry · not Mars imagery</span>
          <button onClick={() => setPreview(false)}>Exit preview</button>
        </div>
      ) : !scientificMap ? (
        <div className="map-empty">
          <div className="map-empty-icon">
            <MapIcon size={28} strokeWidth={1.3} />
          </div>
          <Badge>Scientific map unavailable</Badge>
          <h2>Regional map not connected</h2>
          <p>
            Verified orbital imagery and terrain coverage are not connected for{" "}
            {region.name}. Build a draft mission while regional data is
            prepared.
          </p>
          <button className="surface-button" onClick={() => setPreview(true)}>
            View interface preview <span aria-hidden="true">↗</span>
          </button>
          <span className="supporting">
            Preview uses schematic artwork, without calculated routes.
          </span>
        </div>
      ) : null}
      <div className="map-navigation" aria-label="Map controls">
        <button
          className="icon-button"
          onClick={() => map.current?.resetNorth({ duration: 0 })}
          disabled={(!preview && !scientificMap) || !ready || failed}
          aria-label="Reset map north"
        >
          <ArrowUp size={18} />
          <span className="north">N</span>
        </button>
        <div className="zoom-group">
          <button
            className="icon-button"
            onClick={() => map.current?.zoomIn({ duration: 0 })}
            disabled={(!preview && !scientificMap) || !ready || failed}
            aria-label="Zoom map in"
          >
            <Plus size={20} />
          </button>
          <button
            className="icon-button"
            onClick={() => map.current?.zoomOut({ duration: 0 })}
            disabled={(!preview && !scientificMap) || !ready || failed}
            aria-label="Zoom map out"
          >
            <Minus size={20} />
          </button>
        </div>
        <button
          className="icon-button"
          onClick={() =>
            map.current?.jumpTo(
              preview || !scientificMap
                ? previewCamera
                : {
                    center: toDisplayCoordinates(region.view_center),
                    zoom: region.map.initial_zoom,
                    bearing: 0,
                  },
            )
          }
          disabled={(!preview && !scientificMap) || !ready || failed}
          aria-label="Reset map view"
        >
          <Crosshair size={20} />
        </button>
      </div>
      {!preview && scientificMap && routes.length > 0 && (
        <p className="map-route-status" role="status">
          <span
            className={`route-swatch ${selectedRoute ? "selected" : ""}`}
            aria-hidden="true"
          />
          {selectedRoute ? (
            <>
              <strong>{ROUTE_LABELS[selectedRoute.objective]}</strong>
              <span>{VALIDATION_LABELS[selectedRoute.validation]}</span>
              {routes.length > 1 && (
                <span className="supporting">
                  {routes.length - 1} alternate
                  {routes.length - 1 === 1 ? "" : "s"} shown dashed
                </span>
              )}
            </>
          ) : (
            "No plotted route candidate selected"
          )}
        </p>
      )}
      {failed && (
        <p className="map-failure" role="status">
          Map renderer unavailable. The science catalog and mission editor
          remain accessible.
        </p>
      )}
      <div className="map-bottomline">
        <button className="legend-button" onClick={onEvidence}>
          {preview ? (
            <>
              <span className="diamond" /> Scenario objectives
            </>
          ) : (
            <>
              <span className="status-dot" />{" "}
              {activeLayers.length
                ? activeLayers.map((l) => l.display_name).join(" · ")
                : "No active scientific layers"}
            </>
          )}
        </button>
        <span className="map-scale mono">
          Scale unavailable<span>Not georeferenced</span>
        </span>
      </div>
      <div className="map-attribution">
        {preview
          ? "Schematic interface artwork · no observations or routes"
          : scientificMap
            ? activeLayers
                .map((l) => l.attribution)
                .filter(Boolean)
                .join(" · ")
            : "No NASA / ESA imagery displayed"}
      </div>
    </section>
  );
}
