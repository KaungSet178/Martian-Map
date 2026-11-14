import type { RoutePlanningResponse } from "@/lib/contracts/planning";
import type { RegionManifest } from "@/lib/contracts/region";

export type RouteCandidateResult = Extract<
  RoutePlanningResponse,
  { status: "candidates" }
>;
export type RouteCandidate = RouteCandidateResult["candidates"][number];

export type DisplayRoute = {
  id: string;
  objective: RouteCandidate["objective"];
  validation: RouteCandidate["validation"];
  // Display longitude/latitude pairs (planetocentric latitude, -180..180 lon).
  coordinates: [number, number][];
};

export const ROUTE_LABELS: Record<RouteCandidate["objective"], string> = {
  safest: "Safest",
  fastest: "Fastest",
  science: "Science-focused",
};

export const VALIDATION_LABELS: Record<RouteCandidate["validation"], string> = {
  experimental: "Experimental",
  scientifically_reviewed: "Scientifically reviewed",
};

/**
 * Convert a versioned candidate result into map-ready geometry.
 *
 * Only the service's optional `display_geometry` is plotted. Projected
 * geometry is never converted on the client: without a reviewed Mars
 * projection transform it cannot be placed on the Web-Mercator display
 * honestly. Candidates that cannot be plotted are reported, not guessed.
 */
export function displayRoutesFromResult(result: RouteCandidateResult): {
  routes: DisplayRoute[];
  unplottable: string[];
} {
  const routes: DisplayRoute[] = [];
  const unplottable: string[] = [];
  for (const candidate of result.candidates) {
    if (!candidate.display_geometry || candidate.display_geometry.length < 2) {
      unplottable.push(candidate.id);
      continue;
    }
    const coordinates = candidate.display_geometry
      .map(
        (point: { longitude_east: number; latitude: number }) =>
          [
            point.longitude_east > 180
              ? point.longitude_east - 360
              : point.longitude_east,
            point.latitude,
          ] as [number, number],
      )
      .filter(
        ([lon, lat]: [number, number]) =>
          Number.isFinite(lon) &&
          Number.isFinite(lat) &&
          lon >= -180 &&
          lon <= 180 &&
          lat >= -90 &&
          lat <= 90,
      );
    if (coordinates.length < 2 || coordinates.length !== candidate.display_geometry.length) {
      unplottable.push(candidate.id);
      continue;
    }
    routes.push({
      id: candidate.id,
      objective: candidate.objective,
      validation: candidate.validation,
      coordinates,
    });
  }
  return { routes, unplottable };
}

export type RouteFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: {
      id: string;
      objective: string;
      validation: string;
      selected: boolean;
    };
    geometry: { type: "LineString"; coordinates: [number, number][] };
  }>;
};

/**
 * Generate client-side route geometry for unverified objectives.
 *
 * Uses the same circular distribution pattern as the map markers so objectives
 * are visible on the map even without verified coordinates. The route connects
 * objectives in the order they appear in target_ids.
 */
export function generateClientRoute(
  region: RegionManifest,
  targetIds: string[],
): DisplayRoute[] {
  if (!targetIds.length) return [];
  
  const { latitude: centerLat, longitude_east: centerLon } = region.view_center;
  const distance = 0.3; // degrees from center
  const routes: DisplayRoute[] = [];
  
  // Generate a single route through all targets in order
  const routeCoordinates: [number, number][] = [];
  
  targetIds.forEach((targetId: string, index: number) => {
    const target = region.targets.find((t) => t.id === targetId);
    if (!target) return;
    
    // Use target's explicit coordinates if verified, otherwise use circular distribution
    if (target.coordinates && target.coordinate_verified) {
      routeCoordinates.push([target.coordinates.longitude_east, target.coordinates.latitude]);
    } else {
      // Circular pattern for unverified targets (same as map markers)
      const angle = (index / Math.max(targetIds.length, 1)) * 2 * Math.PI;
      const fallback = {
        lon: centerLon + distance * Math.cos(angle),
        lat: centerLat + distance * Math.sin(angle),
      };
      routeCoordinates.push([fallback.lon, fallback.lat]);
    }
  });
  
  if (routeCoordinates.length >= 2) {
    const routeId = `client-route-${Date.now()}`;
    routes.push({
      id: routeId,
      objective: 'science' as const,
      validation: 'experimental' as const,
      coordinates: routeCoordinates,
    });
  }
  
  return routes;
}


export function routeFeatureCollection(
  routes: DisplayRoute[],
  selectedId: string | null,
): RouteFeatureCollection {
  return {
    type: "FeatureCollection",
    features: routes.map((route) => ({
      type: "Feature" as const,
      properties: {
        id: route.id,
        objective: route.objective,
        validation: route.validation,
        selected: route.id === selectedId,
      },
      geometry: {
        type: "LineString" as const,
        coordinates: route.coordinates,
      },
    })),
  };
}
