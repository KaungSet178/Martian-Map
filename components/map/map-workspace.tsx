"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MapInstance, Marker } from "maplibre-gl";
import {
  schematicContours,
  previewPositions,
} from "@/lib/map/preview";
import {
  applyLayerStates,
  mountRegionLayers,
  layerState,
  toDisplayCoordinates,
  type LayerState,
  type LayerStates,
  type CoverageFocusRequest,
} from "@/lib/map/region-layers";
import {
  mountTrajectoryLayers,
  updateTrajectoryData,
  fromDisplayCoordinates,
  isCoordinateWithinExtent,
} from "@/lib/map/waypoint-layers";
import { formatCoordinates } from "@/components/mission/waypoint-itinerary";
import type { WaypointPlan } from "@/lib/mission/waypoint-planning";
import { fitOverview, fitInitialView, fitLayerCoverage, fitObjectiveArea } from "@/lib/map/camera";
import { registerScientificClip } from "@/lib/map/scientific-clip";
import {
  mountObjectiveAreaLayers,
  removeObjectiveAreaLayers,
  setObjectiveAreasVisibility,
} from "@/lib/map/objective-area-layers";
import {
  Crosshair,
  Layers,
  Maximize2,
  Minus,
  Plus,
  ArrowUp,
  Map as MapIcon,
  PanelLeftOpen,
  Shapes,
} from "lucide-react";
import type { RegionManifest, MarsGeographicCoordinates } from "@/lib/contracts/region";
import { Badge } from "@/components/ui/primitives";
import BasemapControl from "@/components/map/basemap-control";
import { COLOR_BASEMAP } from "@/lib/map/color-basemap";

export type TargetAreaFocusRequest = {
  region_id: string;
  target_id: string;
  request_id: number;
  extent: NonNullable<RegionManifest["map"]["supported_extent"]>;
};

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
  onLayerChange?: (id: string, change: Partial<LayerState>) => void;
  presentationMode?: "mission_view" | "full_coverage";
  coverageFocus?: CoverageFocusRequest | null;
  targetAreaFocus?: TargetAreaFocusRequest | null;
  plan?: WaypointPlan;
  isPlacingOnMap?: boolean;
  onPlaceWaypoint?: (coords: MarsGeographicCoordinates) => void;
  onCancelPlacement?: () => void;
  selectedWaypointId?: string | null;
  onSelectWaypoint?: (id: string) => void;
  onPlacementError?: (error: string) => void;
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
  onLayerChange,
  presentationMode = "mission_view",
  coverageFocus,
  targetAreaFocus,
  plan,
  isPlacingOnMap = false,
  onPlaceWaypoint,
  onCancelPlacement,
  selectedWaypointId = null,
  onSelectWaypoint,
  onPlacementError,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const markers = useRef<Marker[]>([]);
  const waypointMarkers = useRef<Marker[]>([]);
  const markerElements = useRef<Map<string, HTMLButtonElement>>(new Map());
  const overview = useRef<"initial" | "mission" | false>("initial");
  const handledCoverageFocus = useRef<number | null>(null);
  const handledTargetAreaFocus = useRef<number | null>(null);
  const previousLayers = useRef<{ region: string; visible: Set<string> } | null>(null);
  const [ready, setReady] = useState(false);
  const [showAllObjectiveAreas, setShowAllObjectiveAreas] = useState(false);
  const previousStops = useRef<string[]>(stops);
  const [loadedMap, setLoadedMap] = useState<MapInstance | null>(null);
  const [failed, setFailed] = useState(false);
  const scientificMap = region.map.visualization.status === "available";

  useEffect(() => {
    // When an objective is removed from the plan, ensure showAllObjectiveAreas is turned off
    // so that the removed objective's area is guaranteed not to be shown!
    if (stops.length < previousStops.current.length && showAllObjectiveAreas) {
      setShowAllObjectiveAreas(false);
    }
    previousStops.current = stops;
  }, [stops, showAllObjectiveAreas]);
  const resetView = useCallback((animate = false, initial = false) => {
    if (!map.current || !container.current) return;
    overview.current = initial ? "initial" : "mission";
    if (initial) fitInitialView(map.current, region, container.current, preview, animate);
    else fitOverview(map.current, region, container.current, preview, animate);
  }, [region, preview]);
  const activeLayers = region.layers.filter(
    (l) =>
      l.availability === "available" &&
      layerState(region, layerStates, l.id).visible,
  );

  useEffect(() => {
    let disposed = false;
    let releaseClip: (() => void) | undefined;
    import("maplibre-gl")
      .then(({ Map, setWorkerUrl, addProtocol, removeProtocol }) => {
        if (disposed || !container.current) return;
        try {
          releaseClip = registerScientificClip(addProtocol, removeProtocol);
          setWorkerUrl("/generated/maplibre-gl-worker.mjs");
          const instance = new Map({
            container: container.current,
            center: [0, 0],
            zoom: 7.3,
            minZoom: 5,
            maxZoom: 10,
            bearing: 0,
            pitch: 0,
            maxPitch: 0,
            dragPan: true,
            scrollZoom: true,
            touchZoomRotate: true,
            cooperativeGestures: false,
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
          instance
            .getCanvas()
            .setAttribute(
              "aria-label",
              "Schematic preview canvas. No georeferenced scientific map is connected.",
            );
          instance.getCanvas().setAttribute("tabindex", "-1");
          instance.on("load", () => {
            if (!disposed) { setReady(true); setLoadedMap(instance); }
          });
          instance.on("error", (event) => {
            if ("sourceId" in event && event.sourceId === COLOR_BASEMAP.id) return;
            if (!disposed) setFailed(true);
          });
          instance.on("movestart", (event) => {
            if (event.originalEvent) overview.current = false;
          });
        } catch {
          if (!disposed) setFailed(true);
        }
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
      releaseClip?.();
    };
  }, []);

  useEffect(() => {
    if (!ready || !map.current) return;
    return mountRegionLayers(map.current, region);
  }, [ready, region]);

  useEffect(() => {
    if (!ready || !map.current) return;
    applyLayerStates(map.current, region, layerStates, preview, presentationMode);
  }, [ready, region, layerStates, preview, presentationMode]);

  useEffect(() => {
    if (!ready || !map.current) return;
    map.current.setMaxZoom(
      scientificMap
        ? Math.max(10, ...region.layers.flatMap((layer) =>
            layer.availability === "available" && layer.rendering.kind !== "unavailable" && layer.rendering.max_zoom !== undefined
              ? [layer.rendering.max_zoom]
              : [],
          ))
        : 10,
    );
    resetView(false, true);
  }, [ready, region, scientificMap, resetView]);

  useEffect(() => {
    if (!ready || !map.current || !container.current) return;
    const visible = new Set(region.layers.filter((layer) =>
      layerState(region, layerStates, layer.id).visible).map((layer) => layer.id));
    const previous = previousLayers.current;
    previousLayers.current = { region: region.id, visible };
    if (preview || previous?.region !== region.id) return;
    const revealed = region.layers.find((layer) =>
      layer.availability === "available" && visible.has(layer.id) && !previous.visible.has(layer.id) &&
      layer.rendering.kind !== "unavailable" && layer.rendering.focus_extent);
    if (revealed && revealed.rendering.kind !== "unavailable" && revealed.rendering.focus_extent) {
      // Explicitly opening a small mapped area uses the same contained fit as
      // the regional overview. Opacity changes and resize never re-trigger it.
      overview.current = false;
      fitOverview(map.current, { ...region, map: { ...region.map,
        supported_extent: revealed.rendering.focus_extent } }, container.current, false);
    }
  }, [ready, region, layerStates, preview]);

  useEffect(() => {
    if (!ready || !map.current || !container.current || !coverageFocus ||
        handledCoverageFocus.current === coverageFocus.request_id) return;
    handledCoverageFocus.current = coverageFocus.request_id;
    if (preview || coverageFocus.region_id !== region.id) return;
    // Explicit user action only. Reuse responsive padding/maxZoom/north-up fit.
    if (fitLayerCoverage(map.current, region, coverageFocus.layer_id, container.current))
      overview.current = false;
  }, [ready, coverageFocus, region, preview]);

  useEffect(() => {
    if (
      !ready ||
      !map.current ||
      !container.current ||
      !targetAreaFocus ||
      handledTargetAreaFocus.current === targetAreaFocus.request_id
    )
      return;
    handledTargetAreaFocus.current = targetAreaFocus.request_id;
    if (preview || targetAreaFocus.region_id !== region.id) return;
    if (
      fitObjectiveArea(
        map.current,
        region,
        targetAreaFocus.extent,
        container.current,
      )
    ) {
      overview.current = false;
    }
  }, [ready, targetAreaFocus, region, preview]);

  useEffect(() => {
    if (!ready || !map.current || preview || !scientificMap) return;
    const instance = map.current;
    const focusedTargetId =
      targetAreaFocus?.region_id === region.id ? targetAreaFocus.target_id : null;
    mountObjectiveAreaLayers(
      instance,
      region,
      selected,
      onInspect,
      stops,
      showAllObjectiveAreas,
      focusedTargetId,
    );
    const hasVisibleAreas =
      showAllObjectiveAreas ||
      region.targets.some(
        (t) =>
          t.boundary?.status === "available" &&
          (stops.includes(t.id) || t.id === focusedTargetId),
      );
    setObjectiveAreasVisibility(instance, hasVisibleAreas);
    return () => {
      removeObjectiveAreaLayers(instance);
    };
  }, [
    ready,
    region,
    preview,
    scientificMap,
    onInspect,
    showAllObjectiveAreas,
    selected,
    stops,
    targetAreaFocus,
  ]);

  useEffect(() => {
    if (!ready || !container.current || !map.current) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        map.current?.resize();
        // Keep an overview fitted as the visible canvas changes; after a user
        // navigates, preserve their camera rather than snapping back on resize.
        if (overview.current) resetView(false, overview.current === "initial");
      });
    });
    observer.observe(container.current);
    const title = container.current.parentElement?.querySelector(".map-location");
    if (title) observer.observe(title);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [ready, resetView]);

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
    instance.touchZoomRotate.disableRotation();
    instance.touchPitch.disable();
    instance.keyboard.disableRotation();
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
        .filter((target) =>
          preview
            ? target.evidence === "Scenario"
            : target.coordinate_verified && target.coordinates !== null && stops.includes(target.id),
        )
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
          button.onclick = (e) => {
            e.stopPropagation();
            onInspect(target.id);
          };
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

  // Trajectory layers mounting & updates
  useEffect(() => {
    if (!ready || !map.current) return;
    return mountTrajectoryLayers(map.current);
  }, [ready, region]);

  useEffect(() => {
    if (!ready || !map.current || !plan) return;
    updateTrajectoryData(map.current, plan);
  }, [ready, region, plan]);

  const selectedWaypointIdRef = useRef(selectedWaypointId);
  useEffect(() => {
    selectedWaypointIdRef.current = selectedWaypointId;
  }, [selectedWaypointId]);

  // Waypoint DOM markers
  useEffect(() => {
    let disposed = false;
    const markersRef = waypointMarkers;
    const elementsRef = markerElements;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    elementsRef.current.clear();

    if (
      !ready ||
      (!preview && !scientificMap) ||
      !map.current ||
      !plan?.waypoints ||
      plan.waypoints.length === 0
    ) {
      return;
    }

    import("maplibre-gl").then(({ Marker }) => {
      if (disposed || !map.current) return;
      // Ensure any previously attached markers are purged before mounting new set
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      elementsRef.current.clear();

      markersRef.current = (plan.waypoints || []).map((wp, i) => {
        const button = document.createElement("button");
        button.type = "button";
        const isSelected = selectedWaypointIdRef.current === wp.id;
        button.className = `map-waypoint-marker ${wp.role} ${isSelected ? "selected" : ""}`;
        button.setAttribute("data-testid", "map-waypoint-marker");
        button.setAttribute("data-waypoint-id", wp.id);
        button.setAttribute("data-role", wp.role);
        const roleLabel =
          wp.role === "base"
            ? "Base Camp"
            : wp.role === "destination" || wp.role === "recovery_endpoint"
              ? "Destination"
              : wp.role === "science_stop"
                ? "Science Stop"
                : `Waypoint ${i + 1}`;
        button.setAttribute(
          "aria-label",
          `${roleLabel}: ${wp.label || "Waypoint"} (${formatCoordinates(wp.coordinates)})`,
        );
        button.setAttribute("aria-pressed", String(isSelected));

        const glyph = document.createElement("span");
        glyph.className = "marker-glyph";
        if (wp.role === "base") {
          glyph.textContent = "⌂";
        } else if (wp.role === "destination" || wp.role === "recovery_endpoint") {
          glyph.textContent = "⚑";
        } else if (wp.role === "science_stop") {
          glyph.textContent = "◇";
        } else {
          glyph.textContent = String(i + 1);
        }
        button.appendChild(glyph);

        button.onclick = (e) => {
          e.stopPropagation();
          onSelectWaypoint?.(wp.id);
        };

        elementsRef.current.set(wp.id, button);

        return new Marker({ element: button })
          .setLngLat(toDisplayCoordinates(wp.coordinates))
          .addTo(map.current!);
      });
    });

    return () => {
      disposed = true;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      elementsRef.current.clear();
    };
  }, [
    ready,
    preview,
    scientificMap,
    plan?.waypoints,
    onSelectWaypoint,
  ]);

  // Sync selected state on existing waypoint marker buttons without remounting
  useEffect(() => {
    markerElements.current.forEach((button, id) => {
      const isSelected = selectedWaypointId === id;
      button.classList.toggle("selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });
  }, [selectedWaypointId]);

  // Cursor style when in placement mode
  useEffect(() => {
    const canvas = map.current?.getCanvas();
    if (!canvas) return;
    if (isPlacingOnMap) {
      canvas.style.cursor = "crosshair";
    } else {
      canvas.style.cursor = "";
    }
  }, [isPlacingOnMap, ready]);

  // Callback refs to avoid rebuilding map click listener on state changes
  const onPlaceWaypointRef = useRef(onPlaceWaypoint);
  const onPlacementErrorRef = useRef(onPlacementError);

  useEffect(() => {
    onPlaceWaypointRef.current = onPlaceWaypoint;
    onPlacementErrorRef.current = onPlacementError;
  }, [onPlaceWaypoint, onPlacementError]);

  // Interactive map click for waypoint placement with event safeguards
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance || !isPlacingOnMap) return;

    const handleClick = (e: {
      lngLat: { lng: number; lat: number };
      originalEvent?: MouseEvent | TouchEvent;
    }) => {
      // 1. Event-target safeguard: Suppress if click landed on an existing marker,
      // navigation control, or overlay banner
      const target = e.originalEvent?.target as HTMLElement | null;
      if (
        target &&
        (target.closest(".maplibregl-ctrl") ||
          target.closest(".maplibregl-marker") ||
          target.closest(".map-waypoint-marker") ||
          target.closest(".science-marker") ||
          target.closest(".placement-banner"))
      ) {
        return;
      }

      // 2. Regional safeguard: Suppress if region lacks verified scientific map coverage
      if (region.map.visualization.status !== "available") {
        onPlacementErrorRef.current?.(
          "Interactive map placement requires georeferenced scientific map coverage.",
        );
        return;
      }

      const coords = fromDisplayCoordinates(e.lngLat);
      if (!isCoordinateWithinExtent(coords, region.map.supported_extent)) {
        const ext = region.map.supported_extent;
        const extentStr = ext
          ? `${ext.west_east.toFixed(3)}°E–${ext.east_east.toFixed(3)}°E, ${ext.south_latitude.toFixed(3)}°S–${ext.north_latitude.toFixed(3)}°S`
          : "Scientific map coverage not available";
        onPlacementErrorRef.current?.(
          `Coordinates outside reviewed scientific footprint (${extentStr}).`,
        );
        return;
      }

      onPlaceWaypointRef.current?.(coords);
    };

    instance.on("click", handleClick);
    return () => {
      instance.off("click", handleClick);
    };
  }, [ready, isPlacingOnMap, region]);

  // Escape key cancels placement mode
  useEffect(() => {
    if (!isPlacingOnMap) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancelPlacement?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlacingOnMap, onCancelPlacement]);

  return (
    <section
      className={`map-workspace ${preview ? "preview" : ""} ${scientificMap ? "scientific" : ""} ${isPlacingOnMap ? "placing-mode" : ""}`}
      aria-label={`${region.name} map workspace`}
    >
      <div className="map-canvas" ref={container} data-testid="map-canvas" />
      {isPlacingOnMap && (
        <div className="placement-banner" role="status" aria-live="polite" data-testid="placement-banner">
          <div className="placement-banner-content">
            <Crosshair size={18} className="pulse-icon" aria-hidden="true" />
            <span>
              <strong>Waypoint placement active</strong> — Click within scientific map footprint to place {(!plan?.waypoints || plan.waypoints.length === 0) ? "Base Camp" : "a waypoint"}. Press Escape to cancel.
            </span>
          </div>
          <button
            type="button"
            className="placement-cancel-btn"
            onClick={onCancelPlacement}
            aria-label="Cancel map placement"
            data-testid="cancel-placement-btn"
          >
            Cancel
          </button>
        </div>
      )}
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
        <button className="surface-button" onClick={() => {
          // Layer inspection is an explicit choice to retain the current view.
          // Otherwise mobile sheet resize can refit against a changed legend.
          if (region.id === "gale" && scientificMap && !preview) overview.current = false;
          onLayers();
        }}>
          <Layers size={18} />
          Layers
        </button>
        {region.id === "gale" && scientificMap && !preview && (
          <BasemapControl key={region.id} map={loadedMap}
            visible={layerState(region, layerStates, "gale-optical").visible}
            opacity={layerState(region, layerStates, "gale-optical").opacity}
            contextVisible={layerState(region, layerStates, "gale-context").visible}
            onContextVisibleChange={(visible) =>
              onLayerChange?.("gale-context", { visible })} />
        )}
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
            onClick={() => {
              overview.current = false;
              map.current?.zoomIn({ duration: preview ? 0 : 180 });
            }}
            disabled={(!preview && !scientificMap) || !ready || failed}
            aria-label="Zoom map in"
          >
            <Plus size={20} />
          </button>
          <button
            className="icon-button"
            onClick={() => {
              overview.current = false;
              map.current?.zoomOut({ duration: preview ? 0 : 180 });
            }}
            disabled={(!preview && !scientificMap) || !ready || failed}
            aria-label="Zoom map out"
          >
            <Minus size={20} />
          </button>
        </div>
        {scientificMap && !preview && region.id === "gale" ? (
          <>
            <button
              className="icon-button"
              onClick={() => resetView(true, true)}
              disabled={!ready || failed}
              aria-label="Explore Curiosity area"
              title="Explore Curiosity area"
            >
              <Crosshair size={20} />
            </button>
            <button
              className="icon-button"
              onClick={() => resetView(true)}
              disabled={!ready || failed}
              aria-label="Fit complete mission area"
              title="Fit complete mission area"
            >
              <Maximize2 size={20} />
            </button>
          </>
        ) : (
          <button
            className="icon-button"
            onClick={() => resetView(true)}
            disabled={(!preview && !scientificMap) || !ready || failed}
            aria-label={scientificMap && !preview ? "Fit exploration region" : "Reset map view"}
            title={scientificMap && !preview ? "Fit mission area" : "Reset map view"}
          >
            <Crosshair size={20} />
          </button>
        )}
        {scientificMap && !preview && (
          <button
            className={`icon-button ${showAllObjectiveAreas ? "active" : ""}`}
            onClick={() => setShowAllObjectiveAreas(!showAllObjectiveAreas)}
            disabled={!ready || failed}
            aria-label={
              showAllObjectiveAreas ? "Hide objective areas" : "Show objective areas"
            }
            title={
              showAllObjectiveAreas ? "Hide objective areas" : "Show objective areas"
            }
          >
            <Shapes size={20} />
          </button>
        )}
      </div>
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
        {plan?.waypoints && plan.waypoints.length >= 2 && (
          <span
            className="trajectory-legend mono"
            data-testid="trajectory-legend"
            title="Spherical Mars approximation (R = 3,396,190 m)"
          >
            Proposed geometric trajectory — spherical Mars approximation (R = 3,396,190 m)
          </span>
        )}
        <span className="map-scale mono">
          Scale unavailable<span>{scientificMap && !preview ? "Source footprint only" : "Not georeferenced"}</span>
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
