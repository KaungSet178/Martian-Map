/**
 * EVA Duration and Timeline Calculation Module.
 *
 * Implements Section 11 of the specification:
 * - Deterministic aggregation of EVA duration:
 *   Total EVA duration = Travel time + Science stops + Other planned activity + Configured contingency time.
 * - Prevents return-route double counting when roundTripIncluded is true.
 * - Respects pre-calculated travelTimeHours when provided by the route engine.
 * - Falls back to explicit speed assumption (km/h) for geometric routes (Oxia Planum, unrouted waypoints).
 * - Identifies missing inputs and marks duration unavailable if neither travel time nor speed is provided.
 *
 * @module lib/eva/timeline
 */

import type {
  EVAPlanningConfig,
  EVAResourceRouteInput,
  RouteEvidence,
} from "./types";

export interface EVATimelineResult {
  readonly routeEvidence: RouteEvidence;
  readonly distanceMeters: number | null;
  readonly travelDurationHours: number | null;
  readonly scienceStopDurationHours: number;
  readonly otherActivityDurationHours: number;
  readonly contingencyDurationHours: number;
  readonly baseDurationHours: number | null;
  readonly totalDurationHours: number | null;
  readonly routeType: "round-trip" | "one-way";
  readonly isRoundTrip: boolean;
  readonly speedUsedKmh: number | null;
  readonly isSpeedAssumptionDependent: boolean;
  readonly status: "estimated" | "assumption-dependent" | "unavailable";
  readonly missingInputs: readonly string[];
  readonly assumptions: readonly string[];
  readonly warnings: readonly string[];
}

export const DEFAULT_PLANNING_SPEED_KMH = 1.0; // 1.0 km/h nominal Mars walking speed assumption

/**
 * Calculate the normalized EVA timeline and total planned duration.
 */
export function calculateEVATimeline(
  route: EVAResourceRouteInput,
  config: EVAPlanningConfig,
): EVATimelineResult {
  const missingInputs: string[] = [];
  const assumptions: string[] = [];
  const warnings: string[] = [...route.warnings];

  const scienceStopHours = Math.max(0, Number.isFinite(route.scienceStopHours) ? route.scienceStopHours : 0);
  const otherActivityHours = Math.max(0, Number.isFinite(route.otherActivityHours) ? route.otherActivityHours : 0);
  const timeContingencyPercent = Math.max(0, Number.isFinite(config.timeContingencyPercent ?? 0) ? (config.timeContingencyPercent ?? 0) : 0);

  let travelDurationHours: number | null = null;
  let speedUsedKmh: number | null = null;
  let isSpeedAssumptionDependent = false;

  // 1. Determine travel duration
  if (route.travelTimeHours !== null && Number.isFinite(route.travelTimeHours) && route.travelTimeHours >= 0) {
    // Travel time already computed by route engine (e.g. terrain routing)
    travelDurationHours = route.travelTimeHours;
    assumptions.push(`Travel time (${travelDurationHours.toFixed(2)} h) supplied directly by route engine.`);
  } else if (route.distanceMeters !== null && Number.isFinite(route.distanceMeters) && route.distanceMeters >= 0) {
    // Distance available, but travel time not computed -> use configured walking speed
    const speedKmh = config.speedKmh ?? DEFAULT_PLANNING_SPEED_KMH;
    if (Number.isFinite(speedKmh) && speedKmh > 0) {
      speedUsedKmh = speedKmh;
      isSpeedAssumptionDependent = true;
      // distance in km / speed in km/h
      const distanceKm = route.distanceMeters / 1000.0;
      travelDurationHours = distanceKm / speedKmh;
      assumptions.push(
        `Travel time calculated from ${route.distanceMeters.toLocaleString(undefined, { maximumFractionDigits: 1 })} m distance at assumed planning speed of ${speedKmh.toFixed(1)} km/h.`,
      );
    } else {
      missingInputs.push("Valid positive travel speed assumption (km/h).");
    }
  } else {
    // Neither distance nor travel time available
    missingInputs.push("Route distance or travel time.");
  }

  // 2. Aggregate durations
  let baseDurationHours: number | null = null;
  let contingencyDurationHours = 0;
  let totalDurationHours: number | null = null;

  if (travelDurationHours !== null) {
    baseDurationHours = travelDurationHours + scienceStopHours + otherActivityHours;
    contingencyDurationHours = baseDurationHours * (timeContingencyPercent / 100.0);
    totalDurationHours = baseDurationHours + contingencyDurationHours;
  } else if (scienceStopHours > 0 || otherActivityHours > 0) {
    // Only stationary work known; travel is missing
    warnings.push("Travel time is unavailable; duration reflects stationary activities only and is incomplete.");
  }

  // 3. Determine status
  let status: "estimated" | "assumption-dependent" | "unavailable" = "estimated";
  if (totalDurationHours === null) {
    status = "unavailable";
  } else if (
    route.routeEvidence === "geometric" ||
    isSpeedAssumptionDependent ||
    route.routeEvidence === "unavailable"
  ) {
    status = "assumption-dependent";
  }

  if (route.roundTripIncluded) {
    assumptions.push("Route distance and duration already include return closure to base (no double counting).");
  }

  return {
    routeEvidence: route.routeEvidence,
    distanceMeters: route.distanceMeters,
    travelDurationHours,
    scienceStopDurationHours: scienceStopHours,
    otherActivityDurationHours: otherActivityHours,
    contingencyDurationHours,
    baseDurationHours,
    totalDurationHours,
    routeType: route.roundTripIncluded ? "round-trip" : "one-way",
    isRoundTrip: route.roundTripIncluded,
    speedUsedKmh,
    isSpeedAssumptionDependent,
    status,
    missingInputs,
    assumptions,
    warnings,
  };
}

/**
 * Format hours into a clear, deterministic string: e.g. "3 h 45 min" or "45 min".
 */
export function formatHoursToHMin(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || !Number.isFinite(hours)) {
    return "Unavailable";
  }
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) {
    return `${m} min`;
  }
  if (m === 0) {
    return `${h} h`;
  }
  return `${h} h ${m} min`;
}
