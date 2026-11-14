/**
 * Marswalk deterministic mission timeline and route duration calculation engine.
 *
 * M4.1 — Deterministic Mission Timeline Foundation
 *
 * Computes elapsed-time arrivals, departures, science stops, segment durations,
 * and total mission duration from an ordered waypoint itinerary and explicit,
 * configurable user planning assumptions.
 *
 * SCIENTIFIC BOUNDARIES & RESTRICTIONS:
 * - Mars reference sphere: R = 3,396,190 m (PDS Mars 2000 standard).
 * - All timing estimates are purely HYPOTHETICAL planning calculations.
 * - Walking speeds are user-configured planning scenarios, NOT validated
 *   astronaut metabolic or operational performance values.
 * - This engine does NOT evaluate terrain relief, slope impedance, DEM hazards,
 *   boulder fields, suit consumables (O2, battery), or weather exposure.
 * - Unsupported or incomplete segments never report false complete totals.
 *
 * @module lib/mission/timeline
 */

import { z } from "zod";
import { coordinatesSchema } from "@/lib/contracts/primitives";
import {
  marsDistance,
  MARS_RADIUS_M,
  type MarsCoordinate,
} from "@/lib/map/geodesy";
import {
  waypointRoleSchema,
  generateGeometricTrajectory,
  type MarsWaypoint,
  type WaypointPlan,
  type TrajectoryMode,
  type ProposedGeometricTrajectory,
} from "@/lib/mission/waypoint-planning";

// ---------------------------------------------------------------------------
// Constants & Disclaimers
// ---------------------------------------------------------------------------

/** Reference spherical Mars radius in metres (PDS Mars 2000 standard). */
export const MARS_TIMELINE_RADIUS_M = MARS_RADIUS_M;

/** Mandatory scientific disclaimer attached to all mission timeline outputs. */
export const TIMELINE_DISCLAIMER =
  "Hypothetical mission timeline estimate — assumes idealized spherical Mars geometry (R = 3,396,190 m) " +
  "and constant user-configured travel speed. Does not account for terrain relief, slope impedance, " +
  "physical traversability, astronaut metabolic exertion, or environmental hazards.";

// ---------------------------------------------------------------------------
// Schemas & Types
// ---------------------------------------------------------------------------

/**
 * Status of the timeline calculation scenario.
 *
 * - COMPLETE_SCENARIO: All segments and waypoints are valid and supported; complete totals established.
 * - INCOMPLETE_SCENARIO: Structurally valid, but has unsupported segments, missing distances,
 *                        insufficient waypoints, or an incomplete return leg.
 * - INVALID_INPUT: Mathematical or structural constraint violated (negative/non-finite speed or distance,
 *                  negative stop duration, empty plan, duplicate IDs, invalid coordinates).
 */
export const timelineStatusSchema = z.enum([
  "COMPLETE_SCENARIO",
  "INCOMPLETE_SCENARIO",
  "INVALID_INPUT",
]);
export type TimelineStatus = z.infer<typeof timelineStatusSchema>;

/**
 * Segment support status for timing calculations.
 */
export const segmentSupportStatusSchema = z.enum(["SUPPORTED", "UNSUPPORTED"]);
export type SegmentSupportStatus = z.infer<typeof segmentSupportStatusSchema>;

/**
 * Explicit user-supplied or scenario-defined timeline planning assumptions.
 */
export const timelineAssumptionsSchema = z.object({
  /** Hypothetical astronaut walking speed in metres per hour. Must be strictly positive and finite. */
  walking_speed_m_per_hour: z.number().positive(),
  /** Mission start elapsed time in seconds from origin epoch. Defaults to 0. */
  start_elapsed_seconds: z.number().nonnegative().optional().default(0),
  /** Default stop duration in seconds for waypoints with role="science_stop". Defaults to 0. */
  default_science_stop_duration_seconds: z
    .number()
    .nonnegative()
    .optional()
    .default(0),
  /** Explicit duration in seconds for specific waypoints, keyed by waypoint ID. */
  waypoint_stop_durations_seconds: z
    .record(z.string(), z.number().nonnegative())
    .optional()
    .default({}),
  /** Explicit base preparation delay in seconds at initial departure. Defaults to 0. */
  base_preparation_duration_seconds: z
    .number()
    .nonnegative()
    .optional()
    .default(0),
  /** Explicit duration in seconds at final destination or post-return recovery. Defaults to 0. */
  final_destination_duration_seconds: z
    .number()
    .nonnegative()
    .optional()
    .default(0),
});
export type TimelineAssumptions = z.input<typeof timelineAssumptionsSchema>;
export type ResolvedTimelineAssumptions = z.infer<
  typeof timelineAssumptionsSchema
>;

/**
 * Calculated timeline event entry at an ordered waypoint visit.
 */
export const timelineEntrySchema = z.object({
  /** Zero-based sequential stop index in the mission itinerary. */
  step_index: z.number().int().nonnegative(),
  /** Identifier of the visited waypoint. */
  waypoint_id: z.string().min(1),
  /** Functional role of the waypoint if known. */
  role: waypointRoleSchema.optional(),
  /** Indicates whether this entry represents the final return closure at the base camp. */
  is_return: z.boolean().optional(),
  /** Elapsed seconds from mission origin upon arrival at this waypoint, or null if indeterminate. */
  arrival_elapsed_seconds: z.number().nonnegative().nullable(),
  /** Elapsed seconds from mission origin upon departure from this waypoint, or null if indeterminate. */
  departure_elapsed_seconds: z.number().nonnegative().nullable(),
  /** Assigned stationary stop duration at this waypoint in seconds. */
  stop_duration_seconds: z.number().nonnegative(),
});
export type TimelineEntry = z.infer<typeof timelineEntrySchema>;

/**
 * Calculated timing properties for a single route leg connecting two waypoints.
 */
export const timelineSegmentSchema = z.object({
  /** Zero-based sequential segment index. */
  segment_index: z.number().int().nonnegative(),
  /** Origin waypoint ID for this leg. */
  from_waypoint_id: z.string().min(1),
  /** Destination waypoint ID for this leg. */
  to_waypoint_id: z.string().min(1),
  /** Great-circle surface distance in metres, or null if unsupported/unknown. */
  distance_metres: z.number().nonnegative().nullable(),
  /** Estimated travel time in seconds, or null if unsupported/unknown. */
  travel_duration_seconds: z.number().nonnegative().nullable(),
  /** Support classification for this segment. */
  status: segmentSupportStatusSchema,
  /** Indicates whether this leg is the return closure to the origin base camp. */
  is_return_segment: z.boolean(),
});
export type TimelineSegment = z.infer<typeof timelineSegmentSchema>;

/**
 * Comprehensive mission timeline result.
 */
export const missionTimelineResultSchema = z.object({
  /** High-level calculation scenario status. */
  status: timelineStatusSchema,
  /** Resolved planning assumptions applied to the calculation. */
  assumptions: timelineAssumptionsSchema,
  /** Chronologically ordered waypoint visit timeline. */
  timeline: z.array(timelineEntrySchema),
  /** Chronologically ordered route segment legs. */
  segments: z.array(timelineSegmentSchema),
  /** Total route distance in metres across all supported legs, or null if incomplete. */
  total_distance_metres: z.number().nonnegative().nullable(),
  /** Total travel time in seconds across all supported legs, or null if incomplete. */
  total_travel_seconds: z.number().nonnegative().nullable(),
  /** Total stationary time in seconds across all assigned stops. */
  total_stop_seconds: z.number().nonnegative(),
  /** Total mission elapsed time in seconds (travel + stops), or null if incomplete. */
  total_mission_seconds: z.number().nonnegative().nullable(),
  /** Mandatory scientific disclaimer. */
  scientific_disclaimer: z.string(),
  /** Explanatory warnings, incomplete notices, or validation failure details. */
  warnings: z.array(z.string()),
});
export type MissionTimelineResult = z.infer<typeof missionTimelineResultSchema>;

/**
 * Explicit input segment for ad-hoc or partially unverified route itineraries.
 */
export interface TimelineSegmentInput {
  readonly segment_index?: number;
  readonly from_waypoint_id: string;
  readonly to_waypoint_id: string;
  readonly from_coordinates?: MarsCoordinate;
  readonly to_coordinates?: MarsCoordinate;
  readonly distance_metres?: number | null;
  readonly status?: SegmentSupportStatus;
  readonly is_return_segment?: boolean;
}

/**
 * Flexible itinerary input contract for timeline calculation.
 */
export interface TimelineRouteInput {
  readonly mode?: TrajectoryMode;
  readonly waypoints: readonly MarsWaypoint[];
  readonly segments?: readonly TimelineSegmentInput[];
}

// ---------------------------------------------------------------------------
// Unit Conversion Helpers
// ---------------------------------------------------------------------------

/** Convert minutes to seconds. */
export function minutesToSeconds(minutes: number): number {
  return minutes * 60;
}

/** Convert seconds to minutes. */
export function secondsToMinutes(seconds: number): number {
  return seconds / 60;
}

/** Convert hours to seconds. */
export function hoursToSeconds(hours: number): number {
  return hours * 3600;
}

/** Convert seconds to hours. */
export function secondsToHours(seconds: number): number {
  return seconds / 3600;
}

/**
 * Format elapsed seconds into HH:MM:SS string.
 * Returns "--:--:--" if seconds is null or non-finite.
 */
export function formatElapsedSeconds(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) {
    return "--:--:--";
  }
  const totalSec = Math.floor(seconds);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Core Timeline Calculation Engine
// ---------------------------------------------------------------------------

/**
 * Deterministic mission timeline and route duration calculation engine.
 *
 * Computes segment travel durations, science-stop durations, cumulative arrival/departure
 * times, and overall mission duration using purely explicit user planning assumptions and
 * verified great-circle geometry.
 *
 * @param route Waypoint plan, precomputed geometric trajectory, or ad-hoc route input.
 * @param assumptions Timing and speed assumptions.
 * @returns Structured `MissionTimelineResult`.
 */
export function calculateMissionTimeline(
  route: WaypointPlan | ProposedGeometricTrajectory | TimelineRouteInput,
  assumptions: TimelineAssumptions,
): MissionTimelineResult {
  const warnings: string[] = [];

  // 1. Validate & resolve assumptions
  const assumptionsResult = validateAndResolveAssumptions(assumptions, warnings);
  if (!assumptionsResult.valid || !assumptionsResult.resolved) {
    return createInvalidResult(
      assumptionsResult.fallbackAssumptions,
      warnings,
      TIMELINE_DISCLAIMER,
    );
  }
  const resolvedAssumptions = assumptionsResult.resolved;

  // 2. Resolve waypoints and mode from input
  const routeResolution = resolveRouteData(route, warnings);
  if (!routeResolution.valid) {
    return createInvalidResult(
      resolvedAssumptions,
      warnings,
      TIMELINE_DISCLAIMER,
    );
  }

  const { mode, waypoints, rawSegments } = routeResolution;

  // 3. Handle empty itinerary
  if (waypoints.length === 0) {
    warnings.push("Itinerary contains no waypoints. At least an origin base is required.");
    return createInvalidResult(
      resolvedAssumptions,
      warnings,
      TIMELINE_DISCLAIMER,
    );
  }

  // 4. Handle single-waypoint itinerary (cannot form a traverse)
  if (waypoints.length === 1) {
    warnings.push(
      "Itinerary contains only one waypoint. A traverse requires at least two waypoints to form an excursion leg.",
    );
    const singleWp = waypoints[0];
    const basePrep =
      resolvedAssumptions.waypoint_stop_durations_seconds[singleWp.id] ??
      resolvedAssumptions.base_preparation_duration_seconds;

    const timeline: TimelineEntry[] = [
      {
        step_index: 0,
        waypoint_id: singleWp.id,
        role: singleWp.role,
        is_return: false,
        arrival_elapsed_seconds: resolvedAssumptions.start_elapsed_seconds,
        departure_elapsed_seconds:
          resolvedAssumptions.start_elapsed_seconds + basePrep,
        stop_duration_seconds: basePrep,
      },
    ];

    return {
      status: "INCOMPLETE_SCENARIO",
      assumptions: resolvedAssumptions,
      timeline,
      segments: [],
      total_distance_metres: null,
      total_travel_seconds: null,
      total_stop_seconds: basePrep,
      total_mission_seconds: null,
      scientific_disclaimer: TIMELINE_DISCLAIMER,
      warnings,
    };
  }

  // 5. Build and validate segments
  const segmentsResult = buildAndValidateSegments(
    waypoints,
    mode,
    rawSegments,
    resolvedAssumptions.walking_speed_m_per_hour,
    warnings,
  );

  if (!segmentsResult.valid) {
    return createInvalidResult(
      resolvedAssumptions,
      warnings,
      TIMELINE_DISCLAIMER,
    );
  }

  const { segments, trajectoryWaypoints, isScenarioIncomplete } = segmentsResult;

  // 6. Build timeline entries along trajectory waypoints
  const { timeline, totalStopSeconds, hasIndeterminateTiming } =
    buildTimelineEntries(
      trajectoryWaypoints,
      segments,
      mode,
      resolvedAssumptions,
    );

  // 7. Calculate totals & finalize status
  const incomplete = isScenarioIncomplete || hasIndeterminateTiming;

  if (incomplete) {
    if (!warnings.some((w) => w.includes("incomplete or partially unsupported"))) {
      warnings.push(
        "Total mission duration cannot be computed for an incomplete or partially unsupported scenario.",
      );
    }

    return {
      status: "INCOMPLETE_SCENARIO",
      assumptions: resolvedAssumptions,
      timeline,
      segments,
      total_distance_metres: null,
      total_travel_seconds: null,
      total_stop_seconds: totalStopSeconds,
      total_mission_seconds: null,
      scientific_disclaimer: TIMELINE_DISCLAIMER,
      warnings,
    };
  }

  // Complete Scenario: sum distances and travel durations
  const totalDistance = segments.reduce(
    (sum, s) => sum + (s.distance_metres ?? 0),
    0,
  );
  const totalTravelSeconds = segments.reduce(
    (sum, s) => sum + (s.travel_duration_seconds ?? 0),
    0,
  );
  const totalMissionSeconds = totalTravelSeconds + totalStopSeconds;

  return {
    status: "COMPLETE_SCENARIO",
    assumptions: resolvedAssumptions,
    timeline,
    segments,
    total_distance_metres: totalDistance,
    total_travel_seconds: totalTravelSeconds,
    total_stop_seconds: totalStopSeconds,
    total_mission_seconds: totalMissionSeconds,
    scientific_disclaimer: TIMELINE_DISCLAIMER,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Internal Pipeline Steps
// ---------------------------------------------------------------------------

interface AssumptionValidationOutcome {
  valid: boolean;
  resolved: ResolvedTimelineAssumptions | null;
  fallbackAssumptions: ResolvedTimelineAssumptions;
}

function validateAndResolveAssumptions(
  raw: TimelineAssumptions,
  warnings: string[],
): AssumptionValidationOutcome {
  const fallback: ResolvedTimelineAssumptions = {
    walking_speed_m_per_hour: Number.isFinite(raw.walking_speed_m_per_hour)
      ? raw.walking_speed_m_per_hour
      : 0,
    start_elapsed_seconds: Number.isFinite(raw.start_elapsed_seconds)
      ? (raw.start_elapsed_seconds ?? 0)
      : 0,
    default_science_stop_duration_seconds: Number.isFinite(
      raw.default_science_stop_duration_seconds,
    )
      ? (raw.default_science_stop_duration_seconds ?? 0)
      : 0,
    base_preparation_duration_seconds: Number.isFinite(
      raw.base_preparation_duration_seconds,
    )
      ? (raw.base_preparation_duration_seconds ?? 0)
      : 0,
    final_destination_duration_seconds: Number.isFinite(
      raw.final_destination_duration_seconds,
    )
      ? (raw.final_destination_duration_seconds ?? 0)
      : 0,
    waypoint_stop_durations_seconds: raw.waypoint_stop_durations_seconds ?? {},
  };

  // Speed checks
  if (
    typeof raw.walking_speed_m_per_hour !== "number" ||
    !Number.isFinite(raw.walking_speed_m_per_hour) ||
    raw.walking_speed_m_per_hour <= 0
  ) {
    warnings.push(
      `Walking speed assumption must be a strictly positive finite number in metres per hour. Received: ${raw.walking_speed_m_per_hour}.`,
    );
    return { valid: false, resolved: null, fallbackAssumptions: fallback };
  }

  // Start elapsed seconds
  const startSec = raw.start_elapsed_seconds ?? 0;
  if (!Number.isFinite(startSec) || startSec < 0) {
    warnings.push(
      `Start elapsed time must be a non-negative finite number in seconds. Received: ${startSec}.`,
    );
    return { valid: false, resolved: null, fallbackAssumptions: fallback };
  }

  // Science stop default duration
  const defaultScienceStop = raw.default_science_stop_duration_seconds ?? 0;
  if (!Number.isFinite(defaultScienceStop) || defaultScienceStop < 0) {
    warnings.push(
      `Default science stop duration must be a non-negative finite number in seconds. Received: ${defaultScienceStop}.`,
    );
    return { valid: false, resolved: null, fallbackAssumptions: fallback };
  }

  // Base prep duration
  const basePrep = raw.base_preparation_duration_seconds ?? 0;
  if (!Number.isFinite(basePrep) || basePrep < 0) {
    warnings.push(
      `Base preparation duration must be a non-negative finite number in seconds. Received: ${basePrep}.`,
    );
    return { valid: false, resolved: null, fallbackAssumptions: fallback };
  }

  // Final destination duration
  const finalDest = raw.final_destination_duration_seconds ?? 0;
  if (!Number.isFinite(finalDest) || finalDest < 0) {
    warnings.push(
      `Final destination duration must be a non-negative finite number in seconds. Received: ${finalDest}.`,
    );
    return { valid: false, resolved: null, fallbackAssumptions: fallback };
  }

  // Waypoint stop durations mapping
  const wpStops: Record<string, number> = {};
  if (raw.waypoint_stop_durations_seconds) {
    for (const [wpId, dur] of Object.entries(
      raw.waypoint_stop_durations_seconds,
    )) {
      if (typeof dur !== "number" || !Number.isFinite(dur) || dur < 0) {
        warnings.push(
          `Stop duration for waypoint "${wpId}" must be a non-negative finite number. Received: ${dur}.`,
        );
        return { valid: false, resolved: null, fallbackAssumptions: fallback };
      }
      wpStops[wpId] = dur;
    }
  }

  return {
    valid: true,
    resolved: {
      walking_speed_m_per_hour: raw.walking_speed_m_per_hour,
      start_elapsed_seconds: startSec,
      default_science_stop_duration_seconds: defaultScienceStop,
      base_preparation_duration_seconds: basePrep,
      final_destination_duration_seconds: finalDest,
      waypoint_stop_durations_seconds: wpStops,
    },
    fallbackAssumptions: fallback,
  };
}

interface RouteResolutionOutcome {
  valid: boolean;
  mode: TrajectoryMode;
  waypoints: readonly MarsWaypoint[];
  rawSegments?: readonly TimelineSegmentInput[];
}

function resolveRouteData(
  route: WaypointPlan | ProposedGeometricTrajectory | TimelineRouteInput,
  warnings: string[],
): RouteResolutionOutcome {
  let mode: TrajectoryMode = "round_trip";
  let waypoints: readonly MarsWaypoint[] = [];
  let rawSegments: readonly TimelineSegmentInput[] | undefined = undefined;

  if ("trajectory_waypoints" in route && "segments" in route) {
    // ProposedGeometricTrajectory
    mode = route.mode;
    waypoints = route.trajectory_waypoints;
    rawSegments = route.segments.map((s) => ({
      segment_index: s.segment_index,
      from_waypoint_id: s.from_waypoint_id,
      to_waypoint_id: s.to_waypoint_id,
      from_coordinates: s.from_coordinates,
      to_coordinates: s.to_coordinates,
      distance_metres: s.surface_distance_m,
      status: "SUPPORTED",
      is_return_segment: s.is_return_segment,
    }));
  } else if ("schema_version" in route && "waypoints" in route) {
    // WaypointPlan
    mode = route.mode;
    if (route.waypoints.length >= 2) {
      const trajectory = generateGeometricTrajectory(route);
      waypoints = trajectory.trajectory_waypoints;
      rawSegments = trajectory.segments.map((s) => ({
        segment_index: s.segment_index,
        from_waypoint_id: s.from_waypoint_id,
        to_waypoint_id: s.to_waypoint_id,
        from_coordinates: s.from_coordinates,
        to_coordinates: s.to_coordinates,
        distance_metres: s.surface_distance_m,
        status: "SUPPORTED" as const,
        is_return_segment: s.is_return_segment,
      }));
    } else {
      waypoints = route.waypoints;
    }
  } else if ("waypoints" in route) {
    // TimelineRouteInput
    mode = route.mode ?? "round_trip";
    waypoints = route.waypoints;
    rawSegments = route.segments;
  } else {
    warnings.push("Unrecognized route input structure.");
    return { valid: false, mode, waypoints: [] };
  }

  // Validate waypoint IDs uniqueness
  const seenIds = new Set<string>();
  // If trajectory waypoints include round-trip closure, the last waypoint is identical to the first.
  // We check uniqueness across the base itinerary (excluding closing return duplicate).
  const isRoundTripClosing =
    mode === "round_trip" &&
    waypoints.length >= 2 &&
    waypoints[waypoints.length - 1].id === waypoints[0].id;

  const uniquenessList = isRoundTripClosing
    ? waypoints.slice(0, -1)
    : waypoints;

  for (const wp of uniquenessList) {
    if (seenIds.has(wp.id)) {
      warnings.push(
        `Duplicate waypoint ID detected: "${wp.id}". Waypoint IDs must be unique within an itinerary.`,
      );
      return { valid: false, mode, waypoints: [] };
    }
    seenIds.add(wp.id);
  }

  // Validate coordinates using primitive schema
  for (const wp of waypoints) {
    const parsedCoords = coordinatesSchema.safeParse(wp.coordinates);
    if (!parsedCoords.success) {
      warnings.push(
        `Waypoint "${wp.id}" has invalid coordinates: ${JSON.stringify(wp.coordinates)}. Latitude must be in [-90, 90] and East longitude in [0, 360).`,
      );
      return { valid: false, mode, waypoints: [] };
    }
  }

  return { valid: true, mode, waypoints, rawSegments };
}

interface SegmentsBuildOutcome {
  valid: boolean;
  segments: TimelineSegment[];
  trajectoryWaypoints: MarsWaypoint[];
  isScenarioIncomplete: boolean;
}

function buildAndValidateSegments(
  waypoints: readonly MarsWaypoint[],
  mode: TrajectoryMode,
  rawSegments: readonly TimelineSegmentInput[] | undefined,
  speedMPerHour: number,
  warnings: string[],
): SegmentsBuildOutcome {
  let isScenarioIncomplete = false;
  const segments: TimelineSegment[] = [];
  const trajectoryWaypoints: MarsWaypoint[] = [...waypoints];

  // Helper map for waypoint existence
  const wpMap = new Map(waypoints.map((w) => [w.id, w]));

  if (rawSegments && rawSegments.length > 0) {
    // Caller provided explicit segment specifications
    for (let i = 0; i < rawSegments.length; i++) {
      const seg = rawSegments[i];

      // Validate waypoint references
      if (!wpMap.has(seg.from_waypoint_id)) {
        warnings.push(
          `Segment ${i} references unknown from_waypoint_id: "${seg.from_waypoint_id}".`,
        );
        return {
          valid: false,
          segments: [],
          trajectoryWaypoints: [],
          isScenarioIncomplete: true,
        };
      }
      if (!wpMap.has(seg.to_waypoint_id)) {
        warnings.push(
          `Segment ${i} references unknown to_waypoint_id: "${seg.to_waypoint_id}".`,
        );
        return {
          valid: false,
          segments: [],
          trajectoryWaypoints: [],
          isScenarioIncomplete: true,
        };
      }

      const isReturn = Boolean(seg.is_return_segment);
      const isExplicitUnsupported = seg.status === "UNSUPPORTED";
      const dist = seg.distance_metres;

      if (dist !== null && dist !== undefined) {
        if (!Number.isFinite(dist)) {
          warnings.push(
            `Segment ${i} (${seg.from_waypoint_id} -> ${seg.to_waypoint_id}) has non-finite distance: ${dist}.`,
          );
          return {
            valid: false,
            segments: [],
            trajectoryWaypoints: [],
            isScenarioIncomplete: true,
          };
        }
        if (dist < 0) {
          warnings.push(
            `Segment ${i} (${seg.from_waypoint_id} -> ${seg.to_waypoint_id}) has negative distance: ${dist} m.`,
          );
          return {
            valid: false,
            segments: [],
            trajectoryWaypoints: [],
            isScenarioIncomplete: true,
          };
        }
      }

      if (dist === null || dist === undefined || isExplicitUnsupported) {
        // Unsupported or missing distance
        isScenarioIncomplete = true;
        warnings.push(
          `Segment ${i} (${seg.from_waypoint_id} -> ${seg.to_waypoint_id}) is unsupported or missing distance: travel duration cannot be determined.`,
        );
        segments.push({
          segment_index: i,
          from_waypoint_id: seg.from_waypoint_id,
          to_waypoint_id: seg.to_waypoint_id,
          distance_metres: dist ?? null,
          travel_duration_seconds: null,
          status: "UNSUPPORTED",
          is_return_segment: isReturn,
        });
      } else {
        // Supported leg
        const travelDurationSec = (dist / speedMPerHour) * 3600;
        segments.push({
          segment_index: i,
          from_waypoint_id: seg.from_waypoint_id,
          to_waypoint_id: seg.to_waypoint_id,
          distance_metres: dist,
          travel_duration_seconds: travelDurationSec,
          status: "SUPPORTED",
          is_return_segment: isReturn,
        });
      }
    }

    // Check round-trip return closure
    if (mode === "round_trip") {
      const baseId = waypoints[0].id;
      const hasReturnSegment = segments.some(
        (s) => s.is_return_segment || s.to_waypoint_id === baseId,
      );
      if (!hasReturnSegment) {
        isScenarioIncomplete = true;
        warnings.push(
          "Round-trip itinerary is missing a return segment closing back to the origin base.",
        );
      } else {
        // If return segment exists and trajectoryWaypoints doesn't have closing base, add it
        const lastWp = trajectoryWaypoints[trajectoryWaypoints.length - 1];
        if (lastWp.id !== baseId) {
          trajectoryWaypoints.push(waypoints[0]);
        }
      }
    }
  } else {
    // Generate geometric segments from waypoints sequence
    let segIdx = 0;
    for (let i = 1; i < waypoints.length; i++) {
      const fromWp = waypoints[i - 1];
      const toWp = waypoints[i];
      const dist = marsDistance(fromWp.coordinates, toWp.coordinates);
      const travelDurationSec = (dist / speedMPerHour) * 3600;

      segments.push({
        segment_index: segIdx++,
        from_waypoint_id: fromWp.id,
        to_waypoint_id: toWp.id,
        distance_metres: dist,
        travel_duration_seconds: travelDurationSec,
        status: "SUPPORTED",
        is_return_segment: false,
      });
    }

    // For round_trip, generate return segment back to origin base
    if (mode === "round_trip" && waypoints.length >= 2) {
      const finalWp = waypoints[waypoints.length - 1];
      const baseWp = waypoints[0];
      const returnDist = marsDistance(finalWp.coordinates, baseWp.coordinates);
      const returnTravelDurationSec = (returnDist / speedMPerHour) * 3600;

      segments.push({
        segment_index: segIdx++,
        from_waypoint_id: finalWp.id,
        to_waypoint_id: baseWp.id,
        distance_metres: returnDist,
        travel_duration_seconds: returnTravelDurationSec,
        status: "SUPPORTED",
        is_return_segment: true,
      });

      trajectoryWaypoints.push(baseWp);
    }
  }

  return {
    valid: true,
    segments,
    trajectoryWaypoints,
    isScenarioIncomplete,
  };
}

interface TimelineBuildOutcome {
  timeline: TimelineEntry[];
  totalStopSeconds: number;
  hasIndeterminateTiming: boolean;
}

function buildTimelineEntries(
  trajectoryWaypoints: readonly MarsWaypoint[],
  segments: readonly TimelineSegment[],
  mode: TrajectoryMode,
  assumptions: ResolvedTimelineAssumptions,
): TimelineBuildOutcome {
  const timeline: TimelineEntry[] = [];
  let currentElapsed: number | null = assumptions.start_elapsed_seconds;
  let totalStopSeconds = 0;
  let hasIndeterminateTiming = false;

  const totalStops = trajectoryWaypoints.length;

  for (let i = 0; i < totalStops; i++) {
    const wp = trajectoryWaypoints[i];
    const isFirst = i === 0;
    const isLast = i === totalStops - 1;
    const isReturn = mode === "round_trip" && isLast && i > 0;

    let stopDuration = 0;

    if (isFirst) {
      // Departure base camp visit
      if (assumptions.waypoint_stop_durations_seconds[wp.id] !== undefined) {
        stopDuration = assumptions.waypoint_stop_durations_seconds[wp.id];
      } else {
        stopDuration = assumptions.base_preparation_duration_seconds;
      }
    } else if (isReturn) {
      // Return completion at base camp
      stopDuration = assumptions.final_destination_duration_seconds;
    } else if (isLast && (wp.role === "destination" || wp.role === "recovery_endpoint")) {
      // One-way destination or recovery endpoint
      if (assumptions.final_destination_duration_seconds > 0) {
        stopDuration = assumptions.final_destination_duration_seconds;
      } else if (assumptions.waypoint_stop_durations_seconds[wp.id] !== undefined) {
        stopDuration = assumptions.waypoint_stop_durations_seconds[wp.id];
      } else {
        stopDuration = 0;
      }
    } else {
      // Intermediate or science stop
      if (assumptions.waypoint_stop_durations_seconds[wp.id] !== undefined) {
        stopDuration = assumptions.waypoint_stop_durations_seconds[wp.id];
      } else if (wp.role === "science_stop") {
        stopDuration = assumptions.default_science_stop_duration_seconds;
      } else {
        stopDuration = 0;
      }
    }

    totalStopSeconds += stopDuration;

    const arrival: number | null = currentElapsed;
    const departure: number | null =
      arrival !== null ? arrival + stopDuration : null;

    if (arrival === null || departure === null) {
      hasIndeterminateTiming = true;
    }

    timeline.push({
      step_index: i,
      waypoint_id: wp.id,
      role: wp.role,
      is_return: isReturn,
      arrival_elapsed_seconds: arrival,
      departure_elapsed_seconds: departure,
      stop_duration_seconds: stopDuration,
    });

    // Advance to next waypoint using segment i
    if (i < segments.length) {
      const seg = segments[i];
      if (
        seg.status === "SUPPORTED" &&
        seg.travel_duration_seconds !== null &&
        departure !== null
      ) {
        currentElapsed = departure + seg.travel_duration_seconds;
      } else {
        currentElapsed = null;
        hasIndeterminateTiming = true;
      }
    }
  }

  return {
    timeline,
    totalStopSeconds,
    hasIndeterminateTiming,
  };
}

function createInvalidResult(
  assumptions: ResolvedTimelineAssumptions,
  warnings: string[],
  disclaimer: string,
): MissionTimelineResult {
  return {
    status: "INVALID_INPUT",
    assumptions,
    timeline: [],
    segments: [],
    total_distance_metres: null,
    total_travel_seconds: null,
    total_stop_seconds: 0,
    total_mission_seconds: null,
    scientific_disclaimer: disclaimer,
    warnings,
  };
}
