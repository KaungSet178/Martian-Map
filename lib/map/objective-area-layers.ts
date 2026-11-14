import type {
  Map as MapInstance,
  MapMouseEvent,
  MapGeoJSONFeature,
  GeoJSONSource,
} from "maplibre-gl";
import type {
  RegionManifest,
  Target,
  TargetBoundary,
} from "@/lib/contracts/region";

export const OBJECTIVE_AREAS_SOURCE_ID = "scientific-objective-areas";
export const OBJECTIVE_AREAS_FILL_LAYER_ID = "scientific-objective-areas-fill";
export const OBJECTIVE_AREAS_LINE_MAPPED_ID =
  "scientific-objective-areas-line-mapped";
export const OBJECTIVE_AREAS_LINE_APPROX_ID =
  "scientific-objective-areas-line-approximate";
export const OBJECTIVE_AREAS_LINE_CANDIDATE_ID =
  "scientific-objective-areas-line-candidate";
export const OBJECTIVE_AREAS_LINE_SELECTED_ID =
  "scientific-objective-areas-line-selected";

export const ALL_OBJECTIVE_AREA_LAYER_IDS = [
  OBJECTIVE_AREAS_FILL_LAYER_ID,
  OBJECTIVE_AREAS_LINE_MAPPED_ID,
  OBJECTIVE_AREAS_LINE_APPROX_ID,
  OBJECTIVE_AREAS_LINE_CANDIDATE_ID,
  OBJECTIVE_AREAS_LINE_SELECTED_ID,
];

type TargetWithBoundary = Target & {
  boundary: Extract<TargetBoundary, { status: "available" }>;
};

function hasAvailableBoundary(target: Target): target is TargetWithBoundary {
  return target.boundary?.status === "available";
}

function toDisplayPosition([lon, lat]: [number, number]): [number, number] {
  return [lon > 180 ? lon - 360 : lon, lat];
}

function toDisplayGeometry(
  geom: TargetWithBoundary["boundary"]["geometry"],
): GeoJSON.Geometry {
  if (geom.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geom.coordinates.map((ring) => ring.map(toDisplayPosition)),
    };
  }
  return {
    type: "MultiPolygon",
    coordinates: geom.coordinates.map((poly) =>
      poly.map((ring) => ring.map(toDisplayPosition)),
    ),
  };
}

export function createObjectiveAreasGeoJSON(
  region: RegionManifest,
  selectedTargetId: string | null,
): GeoJSON.FeatureCollection {
  const targetsWithBoundary = region.targets.filter(hasAvailableBoundary);
  return {
    type: "FeatureCollection",
    features: targetsWithBoundary.map((target) => ({
      type: "Feature",
      id: target.id,
      properties: {
        id: target.id,
        title: target.title,
        classification: target.boundary.classification,
        selected: selectedTargetId === target.id,
      },
      geometry: toDisplayGeometry(target.boundary.geometry),
    })),
  };
}

// Track click/hover listeners for clean teardown per map instance
const mapListeners = new WeakMap<
  MapInstance,
  {
    clickHandler: (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => void;
    enterHandler: () => void;
    leaveHandler: () => void;
  }
>();

export function mountObjectiveAreaLayers(
  map: MapInstance,
  region: RegionManifest,
  selectedTargetId: string | null,
  onInspectTarget: (targetId: string) => void,
) {
  // If source already exists, update data
  const data = createObjectiveAreasGeoJSON(region, selectedTargetId);
  const existingSource = map.getSource(OBJECTIVE_AREAS_SOURCE_ID) as
    | GeoJSONSource
    | undefined;

  if (existingSource) {
    existingSource.setData(data);
    updateObjectiveAreaSelection(map, selectedTargetId);
    return;
  }

  // Add GeoJSON source
  map.addSource(OBJECTIVE_AREAS_SOURCE_ID, {
    type: "geojson",
    data,
  });

  // 1. Semi-transparent fill layer
  map.addLayer({
    id: OBJECTIVE_AREAS_FILL_LAYER_ID,
    type: "fill",
    source: OBJECTIVE_AREAS_SOURCE_ID,
    paint: {
      "fill-color": [
        "match",
        ["get", "classification"],
        "mapped",
        "#38bdf8", // cyan/sky blue
        "approximate",
        "#fbbf24", // amber/gold
        "candidate",
        "#a78bfa", // purple
        "#94a3b8", // fallback
      ],
      "fill-opacity": [
        "case",
        ["==", ["get", "id"], selectedTargetId ?? ""],
        0.42,
        [
          "match",
          ["get", "classification"],
          "mapped",
          0.2,
          "approximate",
          0.15,
          "candidate",
          0.11,
          0.15,
        ],
      ],
    },
  });

  // 2. Mapped extent outline (solid)
  map.addLayer({
    id: OBJECTIVE_AREAS_LINE_MAPPED_ID,
    type: "line",
    source: OBJECTIVE_AREAS_SOURCE_ID,
    filter: ["==", ["get", "classification"], "mapped"],
    paint: {
      "line-color": "#38bdf8",
      "line-width": 2,
    },
  });

  // 3. Approximate area outline (dashed)
  map.addLayer({
    id: OBJECTIVE_AREAS_LINE_APPROX_ID,
    type: "line",
    source: OBJECTIVE_AREAS_SOURCE_ID,
    filter: ["==", ["get", "classification"], "approximate"],
    paint: {
      "line-color": "#fbbf24",
      "line-width": 1.8,
      "line-dasharray": [3, 2],
    },
  });

  // 4. Candidate search region outline (dotted)
  map.addLayer({
    id: OBJECTIVE_AREAS_LINE_CANDIDATE_ID,
    type: "line",
    source: OBJECTIVE_AREAS_SOURCE_ID,
    filter: ["==", ["get", "classification"], "candidate"],
    paint: {
      "line-color": "#a78bfa",
      "line-width": 1.5,
      "line-dasharray": [1.5, 2],
    },
  });

  // 5. Selected outline highlight (crisp white glow)
  map.addLayer({
    id: OBJECTIVE_AREAS_LINE_SELECTED_ID,
    type: "line",
    source: OBJECTIVE_AREAS_SOURCE_ID,
    filter: ["==", ["get", "id"], selectedTargetId ?? ""],
    paint: {
      "line-color": "#ffffff",
      "line-width": 3,
    },
  });

  // Interactive selection handlers
  const clickHandler = (
    e: MapMouseEvent & { features?: MapGeoJSONFeature[] },
  ) => {
    const feat = e.features?.[0];
    if (feat && feat.properties && feat.properties.id) {
      onInspectTarget(feat.properties.id);
    }
  };

  const enterHandler = () => {
    map.getCanvas().style.cursor = "pointer";
  };

  const leaveHandler = () => {
    map.getCanvas().style.cursor = "";
  };

  map.on("click", OBJECTIVE_AREAS_FILL_LAYER_ID, clickHandler);
  map.on("mouseenter", OBJECTIVE_AREAS_FILL_LAYER_ID, enterHandler);
  map.on("mouseleave", OBJECTIVE_AREAS_FILL_LAYER_ID, leaveHandler);

  mapListeners.set(map, { clickHandler, enterHandler, leaveHandler });
}

export function updateObjectiveAreaSelection(
  map: MapInstance,
  selectedTargetId: string | null,
) {
  if (map.getLayer(OBJECTIVE_AREAS_LINE_SELECTED_ID)) {
    map.setFilter(OBJECTIVE_AREAS_LINE_SELECTED_ID, [
      "==",
      ["get", "id"],
      selectedTargetId ?? "",
    ]);
  }

  if (map.getLayer(OBJECTIVE_AREAS_FILL_LAYER_ID)) {
    map.setPaintProperty(OBJECTIVE_AREAS_FILL_LAYER_ID, "fill-opacity", [
      "case",
      ["==", ["get", "id"], selectedTargetId ?? ""],
      0.42,
      [
        "match",
        ["get", "classification"],
        "mapped",
        0.2,
        "approximate",
        0.15,
        "candidate",
        0.11,
        0.15,
      ],
    ]);
  }
}

export function setObjectiveAreasVisibility(
  map: MapInstance,
  visible: boolean,
) {
  const value = visible ? "visible" : "none";
  for (const layerId of ALL_OBJECTIVE_AREA_LAYER_IDS) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", value);
    }
  }
}

export function removeObjectiveAreaLayers(map: MapInstance) {
  const listeners = mapListeners.get(map);
  if (listeners) {
    map.off("click", OBJECTIVE_AREAS_FILL_LAYER_ID, listeners.clickHandler);
    map.off("mouseenter", OBJECTIVE_AREAS_FILL_LAYER_ID, listeners.enterHandler);
    map.off("mouseleave", OBJECTIVE_AREAS_FILL_LAYER_ID, listeners.leaveHandler);
    mapListeners.delete(map);
  }

  for (const layerId of ALL_OBJECTIVE_AREA_LAYER_IDS) {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
  }

  if (map.getSource(OBJECTIVE_AREAS_SOURCE_ID)) {
    map.removeSource(OBJECTIVE_AREAS_SOURCE_ID);
  }
}
