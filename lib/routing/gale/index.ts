/**
 * Gale terrain-aware routing adapter entry point.
 *
 * Import from `@/lib/routing/gale` rather than deep-importing individual
 * modules so future contract migration stays local to this directory.
 */

export {
  GALE_ROUTING_DATASET_IDS,
  galeEvidenceStatusSchema,
  galeRouteAlternativesSchema,
  galeRouteComparisonSchema,
  galeRouteEvidenceSchema,
  galeRoutePreferenceSchema,
  galeRouteResultSchema,
  galeRouteSegmentSchema,
  galeRouteStatusSchema,
  galeRouteWaypointSchema,
  galeGridSummarySchema,
  marsCoordinatePairSchema,
} from "./types";

export type {
  GaleEvidenceStatus,
  GaleGridSummary,
  GaleRouteAlternatives,
  GaleRouteComparison,
  GaleRouteEvidence,
  GaleRoutePreference,
  GaleRouteResult,
  GaleRouteSegment,
  GaleRouteStatus,
  GaleRouteWaypoint,
  GaleRoutingDatasetId,
  MarsCoordinatePair,
  SharedRouteResultShape,
} from "./types";

export {
  MISSION_INTEGRATION_NOTES,
  GaleRouteValidationError,
  alternativesAreComparable,
  diagnoseRouteGeometry,
  parseGaleAlternatives,
  parseGaleAlternativesJson,
  parseGaleRoute,
  parseGaleRouteJson,
  summariseMissionRoute,
  toAppCoordinate,
  toAppCoordinates,
  toGeoJsonLineString,
  toSharedRouteResult,
} from "./adapter";

export type {
  AppCoordinate,
  GeometryDiagnostics,
  MissionRouteSummary,
  MissionWaypoint,
  RouteLeg,
} from "./adapter";
