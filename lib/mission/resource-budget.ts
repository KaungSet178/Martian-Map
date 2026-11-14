/**
 * Marswalk deterministic mission resource budgeting engine (Oxygen and Battery Energy).
 *
 * M4.2 / M4.2A — Hardened Deterministic Resource Budgeting Engine
 *
 * Computes hypothetical oxygen mass consumption (grams) and electrical energy
 * consumption (watt-hours) from a deterministic mission timeline (M4.1/M4.1A)
 * and explicitly configured scenario assumptions.
 *
 * HARDENING SAFEGUARDS (M4.2A):
 * - Runtime timeline schema and consistency validation (protecting against malformed/contradictory timelines).
 * - Stage-level numerical overflow protection and finite bounds checking.
 * - Subsystem independence: an invalid/overflowing battery assumption never erases a valid oxygen calculation,
 *   and vice versa.
 * - Strict stage reconciliation: stage-level consumption sums are verified against published full-mission totals
 *   within documented floating-point tolerance (STAGE_RECONCILIATION_TOLERANCE).
 *
 * CRITICAL SCIENTIFIC RESTRICTIONS & BOUNDARIES:
 * - All calculations represent HYPOTHETICAL planning models, NOT certified
 *   NASA spacesuit (e.g., EMU, xEMU) life-support requirements.
 * - Spacesuit oxygen consumption in reality depends on individual metabolic rate,
 *   suit pressure, respiratory quotient, physical workload, terrain slope,
 *   carbon-dioxide scrubber efficiency, and emergency backup systems.
 * - Spacesuit electrical energy consumption depends on active thermal control loops,
 *   avionics, communications, telemetry, display units, sensor heaters, and
 *   usable battery discharge depths.
 * - This engine does NOT certify operational EVA safety, astronaut survivability,
 *   or mission feasibility.
 * - ARITHMETIC COMPLIANCE ("WITHIN_CONFIGURED_BUDGET") INDICATES ONLY THAT THE
 *   CONFIGURED HYPOTHETICAL RESERVES ARE NOT ARITHMETICALLY EXCEEDED.
 * - NO default "NASA astronaut" profile is assumed. All numerical parameters
 *   must be explicitly supplied by the caller or designated scenario fixture.
 *
 * @module lib/mission/resource-budget
 */

import { z } from "zod";
import {
  type MissionTimelineResult,
  missionTimelineResultSchema,
} from "./timeline";

// ---------------------------------------------------------------------------
// Constants & Disclaimers
// ---------------------------------------------------------------------------

/**
 * Mandatory scientific disclaimer attached to all resource budget calculation outputs.
 */
export const RESOURCE_BUDGET_DISCLAIMER =
  "Hypothetical mission resource budget estimate — assumes constant user-configured oxygen consumption rates " +
  "and electrical power draws across travel and stationary periods. Does not account for astronaut metabolic exertion, " +
  "spacesuit thermal control overhead, terrain slope impedance, environmental radiation, life-support system efficiency, " +
  "or contingency reserves. Arithmetic budget compliance does NOT certify operational EVA safety or astronaut survival.";

/**
 * Documented floating-point tolerance for reconciling stage-level consumable sums
 * with mission-wide totals (0.0001 g or 0.0001 Wh).
 */
export const STAGE_RECONCILIATION_TOLERANCE = 1e-4;

/**
 * Documented floating-point tolerance for validating timeline duration and timestamp consistency
 * (0.0001 seconds = 0.1 ms).
 */
export const TIMELINE_EPSILON_SECONDS = 1e-4;

// ---------------------------------------------------------------------------
// Schemas & Types
// ---------------------------------------------------------------------------

/**
 * High-level assessment classification for resource budgeting scenarios.
 *
 * - WITHIN_CONFIGURED_BUDGET: Timeline is complete, valid inputs are supplied,
 *   and calculated consumption leaves remaining resources >= configured reserve.
 * - EXCEEDS_CONFIGURED_BUDGET: Complete scenario exceeds available capacity or
 *   infringes upon the configured reserve (remaining < reserve, or remaining < 0).
 * - INSUFFICIENT_DATA: Required resource assumptions are missing, or timeline
 *   is incomplete; conclusive scenario budget cannot be determined.
 * - INVALID_INPUT: Mathematical or physical constraint violated (negative values,
 *   non-finite numbers, arithmetic overflow past MAX_SAFE_INTEGER, malformed objects).
 */
export const resourceAssessmentStatusSchema = z.enum([
  "WITHIN_CONFIGURED_BUDGET",
  "EXCEEDS_CONFIGURED_BUDGET",
  "INSUFFICIENT_DATA",
  "INVALID_INPUT",
]);
export type ResourceAssessmentStatus = z.infer<
  typeof resourceAssessmentStatusSchema
>;

/**
 * Explicit user-supplied or scenario-defined oxygen planning assumptions.
 */
export const oxygenBudgetAssumptionsSchema = z.object({
  /** Total usable oxygen mass capacity in grams. Must be non-negative and finite, or null. */
  capacity_g: z.number().nonnegative().nullable().optional().default(null),
  /** Hypothetical oxygen consumption rate during travel in grams per hour. Must be non-negative and finite, or null. */
  travel_rate_g_per_hour: z
    .number()
    .nonnegative()
    .nullable()
    .optional()
    .default(null),
  /** Hypothetical oxygen consumption rate while stationary in grams per hour. Must be non-negative and finite, or null. */
  stop_rate_g_per_hour: z
    .number()
    .nonnegative()
    .nullable()
    .optional()
    .default(null),
  /** Required oxygen reserve in grams. Must be non-negative and finite, or null. */
  reserve_g: z.number().nonnegative().nullable().optional().default(null),
});
export type OxygenBudgetAssumptions = z.input<
  typeof oxygenBudgetAssumptionsSchema
>;

/**
 * Explicit user-supplied or scenario-defined battery energy planning assumptions.
 */
export const batteryBudgetAssumptionsSchema = z.object({
  /** Total usable electrical energy capacity in watt-hours (Wh). Must be non-negative and finite, or null. */
  capacity_wh: z.number().nonnegative().nullable().optional().default(null),
  /** Hypothetical electrical power consumption during travel in watts (W). Must be non-negative and finite, or null. */
  travel_power_w: z.number().nonnegative().nullable().optional().default(null),
  /** Hypothetical electrical power consumption while stationary in watts (W). Must be non-negative and finite, or null. */
  stop_power_w: z.number().nonnegative().nullable().optional().default(null),
  /** Required electrical energy reserve in watt-hours (Wh). Must be non-negative and finite, or null. */
  reserve_wh: z.number().nonnegative().nullable().optional().default(null),
});
export type BatteryBudgetAssumptions = z.input<
  typeof batteryBudgetAssumptionsSchema
>;

/**
 * Input contract for resource budget estimation.
 */
export const resourceBudgetInputSchema = z.object({
  /** Calculated mission timeline result from M4.1/M4.1A engine. */
  timeline: missionTimelineResultSchema,
  /** Optional oxygen planning assumptions. */
  oxygen: oxygenBudgetAssumptionsSchema.nullable().optional().default(null),
  /** Optional battery energy planning assumptions. */
  battery: batteryBudgetAssumptionsSchema.nullable().optional().default(null),
});
export type ResourceBudgetInput = {
  readonly timeline: MissionTimelineResult;
  readonly oxygen?: OxygenBudgetAssumptions | null;
  readonly battery?: BatteryBudgetAssumptions | null;
};

/**
 * Calculated oxygen budget breakdown.
 */
export const oxygenBudgetResultSchema = z.object({
  /** Total oxygen used during transit across all supported legs in grams, or null. */
  travel_used_g: z.number().nonnegative().nullable(),
  /** Total oxygen used during stationary stops across all supported stops in grams, or null. */
  stationary_used_g: z.number().nonnegative().nullable(),
  /** Full mission oxygen consumption in grams, or null if timeline or inputs incomplete. */
  total_used_g: z.number().nonnegative().nullable(),
  /** Remaining oxygen mass after full mission (capacity - used) in grams, or null. May be negative. */
  remaining_g: z.number().nullable(),
  /** Remaining oxygen mass after subtracting mandatory reserve in grams, or null. May be negative. */
  remaining_after_reserve_g: z.number().nullable(),
  /** Subsystem assessment status for oxygen. */
  status: resourceAssessmentStatusSchema,
});
export type OxygenBudgetResult = z.infer<typeof oxygenBudgetResultSchema>;

/**
 * Calculated battery electrical energy budget breakdown.
 */
export const batteryBudgetResultSchema = z.object({
  /** Total electrical energy used during transit across all supported legs in watt-hours (Wh), or null. */
  travel_used_wh: z.number().nonnegative().nullable(),
  /** Total electrical energy used during stationary stops in watt-hours (Wh), or null. */
  stationary_used_wh: z.number().nonnegative().nullable(),
  /** Full mission electrical energy consumption in watt-hours (Wh), or null if timeline or inputs incomplete. */
  total_used_wh: z.number().nonnegative().nullable(),
  /** Remaining electrical energy after full mission (capacity - used) in watt-hours (Wh), or null. May be negative. */
  remaining_wh: z.number().nullable(),
  /** Remaining electrical energy after subtracting mandatory reserve in watt-hours (Wh), or null. May be negative. */
  remaining_after_reserve_wh: z.number().nullable(),
  /** Subsystem assessment status for battery. */
  status: resourceAssessmentStatusSchema,
});
export type BatteryBudgetResult = z.infer<typeof batteryBudgetResultSchema>;

/**
 * Calculated resource usage for a discrete chronological mission stage.
 */
export const resourceStageEntrySchema = z.object({
  /** Zero-based chronological stage index. */
  stage_index: z.number().int().nonnegative(),
  /** Stage category: traveling along a leg or stationary at a waypoint. */
  stage_type: z.enum(["TRAVEL", "STATIONARY"]),
  /** Waypoint identifier for stationary stops, or origin->destination leg key for travel. */
  reference_id: z.string().min(1),
  /** Starting elapsed time from mission origin in seconds, or null if indeterminate. */
  start_elapsed_seconds: z.number().nonnegative().nullable(),
  /** Ending elapsed time from mission origin in seconds, or null if indeterminate. */
  end_elapsed_seconds: z.number().nonnegative().nullable(),
  /** Duration of this discrete stage in seconds. */
  duration_seconds: z.number().nonnegative(),
  /** Estimated oxygen mass consumed during this stage in grams, or null if unconfigured or invalid. */
  oxygen_used_g: z.number().nonnegative().nullable(),
  /** Estimated electrical energy consumed during this stage in watt-hours (Wh), or null if unconfigured or invalid. */
  battery_used_wh: z.number().nonnegative().nullable(),
});
export type ResourceStageEntry = z.infer<typeof resourceStageEntrySchema>;

/**
 * Comprehensive mission resource budgeting result.
 */
export const resourceBudgetResultSchema = z.object({
  /** Overall combined scenario status. */
  status: resourceAssessmentStatusSchema,
  /** Subsystem oxygen budget breakdown. */
  oxygen: oxygenBudgetResultSchema,
  /** Subsystem battery electrical energy budget breakdown. */
  battery: batteryBudgetResultSchema,
  /** Chronologically ordered stage-by-stage resource consumption breakdown. */
  stages: z.array(resourceStageEntrySchema),
  /** Explanatory warnings, data insufficiency notices, or validation details. */
  warnings: z.array(z.string()),
  /** Mandatory scientific disclaimer. */
  scientific_disclaimer: z.string(),
});
export type ResourceBudgetResult = z.infer<typeof resourceBudgetResultSchema>;

// ---------------------------------------------------------------------------
// Unit Formatting Helpers
// ---------------------------------------------------------------------------

/**
 * Format oxygen mass in grams into human-readable string.
 * Returns "-- g" if grams is null or non-finite.
 */
export function formatMassGrams(grams: number | null): string {
  if (grams === null || !Number.isFinite(grams)) {
    return "-- g";
  }
  return `${grams.toLocaleString("en-US", { maximumFractionDigits: 1 })} g`;
}

/**
 * Format electrical energy in watt-hours into human-readable string.
 * Returns "-- Wh" if wh is null or non-finite.
 */
export function formatEnergyWattHours(wh: number | null): string {
  if (wh === null || !Number.isFinite(wh)) {
    return "-- Wh";
  }
  return `${wh.toLocaleString("en-US", { maximumFractionDigits: 1 })} Wh`;
}

/**
 * Format power draw in watts into human-readable string.
 * Returns "-- W" if w is null or non-finite.
 */
export function formatPowerWatts(w: number | null): string {
  if (w === null || !Number.isFinite(w)) {
    return "-- W";
  }
  return `${w.toLocaleString("en-US", { maximumFractionDigits: 1 })} W`;
}

/**
 * Format consumption rate in grams per hour into human-readable string.
 * Returns "-- g/h" if rate is null or non-finite.
 */
export function formatRateGramsPerHour(rate: number | null): string {
  if (rate === null || !Number.isFinite(rate)) {
    return "-- g/h";
  }
  return `${rate.toLocaleString("en-US", { maximumFractionDigits: 1 })} g/h`;
}

// ---------------------------------------------------------------------------
// Internal Validation Helpers
// ---------------------------------------------------------------------------

interface ValidatedOxygenAssumptions {
  valid: boolean;
  provided: boolean;
  capacity_g: number | null;
  travel_rate_g_per_hour: number | null;
  stop_rate_g_per_hour: number | null;
  reserve_g: number | null;
}

function validateOxygenAssumptions(
  raw: OxygenBudgetAssumptions | null | undefined,
  warnings: string[],
): ValidatedOxygenAssumptions {
  if (raw === null || raw === undefined) {
    return {
      valid: true,
      provided: false,
      capacity_g: null,
      travel_rate_g_per_hour: null,
      stop_rate_g_per_hour: null,
      reserve_g: null,
    };
  }

  if (typeof raw !== "object") {
    warnings.push("Oxygen budget assumptions must be an object.");
    return {
      valid: false,
      provided: true,
      capacity_g: null,
      travel_rate_g_per_hour: null,
      stop_rate_g_per_hour: null,
      reserve_g: null,
    };
  }

  let valid = true;

  const validateField = (val: unknown, fieldName: string): number | null => {
    if (val === null || val === undefined) {
      return null;
    }
    if (typeof val !== "number" || !Number.isFinite(val)) {
      warnings.push(
        `Oxygen assumption "${fieldName}" must be a finite number. Received: ${val}.`,
      );
      valid = false;
      return null;
    }
    if (val < 0) {
      warnings.push(
        `Oxygen assumption "${fieldName}" cannot be negative. Received: ${val}.`,
      );
      valid = false;
      return null;
    }
    if (val > Number.MAX_SAFE_INTEGER) {
      warnings.push(
        `Oxygen assumption "${fieldName}" exceeds maximum safe representable integer: ${val}.`,
      );
      valid = false;
      return null;
    }
    return val;
  };

  const capacity_g = validateField(raw.capacity_g, "capacity_g");
  const travel_rate_g_per_hour = validateField(
    raw.travel_rate_g_per_hour,
    "travel_rate_g_per_hour",
  );
  const stop_rate_g_per_hour = validateField(
    raw.stop_rate_g_per_hour,
    "stop_rate_g_per_hour",
  );
  const reserve_g = validateField(raw.reserve_g, "reserve_g");

  return {
    valid,
    provided: true,
    capacity_g,
    travel_rate_g_per_hour,
    stop_rate_g_per_hour,
    reserve_g,
  };
}

interface ValidatedBatteryAssumptions {
  valid: boolean;
  provided: boolean;
  capacity_wh: number | null;
  travel_power_w: number | null;
  stop_power_w: number | null;
  reserve_wh: number | null;
}

function validateBatteryAssumptions(
  raw: BatteryBudgetAssumptions | null | undefined,
  warnings: string[],
): ValidatedBatteryAssumptions {
  if (raw === null || raw === undefined) {
    return {
      valid: true,
      provided: false,
      capacity_wh: null,
      travel_power_w: null,
      stop_power_w: null,
      reserve_wh: null,
    };
  }

  if (typeof raw !== "object") {
    warnings.push("Battery budget assumptions must be an object.");
    return {
      valid: false,
      provided: true,
      capacity_wh: null,
      travel_power_w: null,
      stop_power_w: null,
      reserve_wh: null,
    };
  }

  let valid = true;

  const validateField = (val: unknown, fieldName: string): number | null => {
    if (val === null || val === undefined) {
      return null;
    }
    if (typeof val !== "number" || !Number.isFinite(val)) {
      warnings.push(
        `Battery assumption "${fieldName}" must be a finite number. Received: ${val}.`,
      );
      valid = false;
      return null;
    }
    if (val < 0) {
      warnings.push(
        `Battery assumption "${fieldName}" cannot be negative. Received: ${val}.`,
      );
      valid = false;
      return null;
    }
    if (val > Number.MAX_SAFE_INTEGER) {
      warnings.push(
        `Battery assumption "${fieldName}" exceeds maximum safe representable integer: ${val}.`,
      );
      valid = false;
      return null;
    }
    return val;
  };

  const capacity_wh = validateField(raw.capacity_wh, "capacity_wh");
  const travel_power_w = validateField(raw.travel_power_w, "travel_power_w");
  const stop_power_w = validateField(raw.stop_power_w, "stop_power_w");
  const reserve_wh = validateField(raw.reserve_wh, "reserve_wh");

  return {
    valid,
    provided: true,
    capacity_wh,
    travel_power_w,
    stop_power_w,
    reserve_wh,
  };
}

function createDefaultOxygenResult(
  status: ResourceAssessmentStatus = "INSUFFICIENT_DATA",
): OxygenBudgetResult {
  return {
    travel_used_g: null,
    stationary_used_g: null,
    total_used_g: null,
    remaining_g: null,
    remaining_after_reserve_g: null,
    status,
  };
}

function createDefaultBatteryResult(
  status: ResourceAssessmentStatus = "INSUFFICIENT_DATA",
): BatteryBudgetResult {
  return {
    travel_used_wh: null,
    stationary_used_wh: null,
    total_used_wh: null,
    remaining_wh: null,
    remaining_after_reserve_wh: null,
    status,
  };
}

// ---------------------------------------------------------------------------
// Runtime Timeline Consistency Validation (M4.2A Issue C)
// ---------------------------------------------------------------------------

interface TimelineValidationOutcome {
  valid: boolean;
  status: "COMPLETE_SCENARIO" | "INCOMPLETE_SCENARIO" | "INVALID_INPUT";
}

function validateTimelineConsistency(
  rawTimeline: unknown,
  warnings: string[],
): TimelineValidationOutcome {
  if (!rawTimeline || typeof rawTimeline !== "object") {
    warnings.push("Mission timeline input must be a non-null object.");
    return { valid: false, status: "INVALID_INPUT" };
  }

  // Schema parsing check
  const parseResult = missionTimelineResultSchema.safeParse(rawTimeline);
  if (!parseResult.success) {
    warnings.push(
      `Timeline schema validation failed: ${parseResult.error.issues.map((i) => i.message).join("; ")}`,
    );
    return { valid: false, status: "INVALID_INPUT" };
  }

  const timeline = parseResult.data;

  // Direct invalid status
  if (timeline.status === "INVALID_INPUT") {
    warnings.push("Cannot calculate resource budget from an invalid mission timeline.");
    if (timeline.warnings && Array.isArray(timeline.warnings)) {
      warnings.push(...timeline.warnings);
    }
    return { valid: false, status: "INVALID_INPUT" };
  }

  const visits = timeline.timeline;
  const segments = timeline.segments;
  const N = visits.length;

  if (N === 0) {
    warnings.push("Timeline must contain at least one waypoint visit.");
    return { valid: false, status: "INVALID_INPUT" };
  }

  // 1. Validation for COMPLETE_SCENARIO
  if (timeline.status === "COMPLETE_SCENARIO") {
    // Totals existence and finiteness
    if (
      timeline.total_travel_seconds === null ||
      !Number.isFinite(timeline.total_travel_seconds) ||
      timeline.total_travel_seconds < 0 ||
      timeline.total_travel_seconds > Number.MAX_SAFE_INTEGER
    ) {
      warnings.push("Complete timeline requires a valid, finite non-negative total_travel_seconds.");
      return { valid: false, status: "INVALID_INPUT" };
    }

    if (
      !Number.isFinite(timeline.total_stop_seconds) ||
      timeline.total_stop_seconds < 0 ||
      timeline.total_stop_seconds > Number.MAX_SAFE_INTEGER
    ) {
      warnings.push("Complete timeline requires a valid, finite non-negative total_stop_seconds.");
      return { valid: false, status: "INVALID_INPUT" };
    }

    if (
      timeline.total_mission_seconds === null ||
      !Number.isFinite(timeline.total_mission_seconds) ||
      timeline.total_mission_seconds < 0 ||
      timeline.total_mission_seconds > Number.MAX_SAFE_INTEGER
    ) {
      warnings.push("Complete timeline requires a valid, finite non-negative total_mission_seconds.");
      return { valid: false, status: "INVALID_INPUT" };
    }

    // Segment count check: N visits require exactly N - 1 connecting segments
    const expectedSegmentCount = N - 1;
    if (segments.length !== expectedSegmentCount) {
      warnings.push(
        `Complete timeline segment count (${segments.length}) does not match consecutive visits (${expectedSegmentCount}).`,
      );
      return { valid: false, status: "INVALID_INPUT" };
    }

    // Waypoint stops timing checks
    for (let i = 0; i < N; i++) {
      const v = visits[i];
      if (
        v.arrival_elapsed_seconds === null ||
        !Number.isFinite(v.arrival_elapsed_seconds) ||
        v.arrival_elapsed_seconds < 0
      ) {
        warnings.push(`Timeline visit ${i} (${v.waypoint_id}) has invalid arrival elapsed seconds.`);
        return { valid: false, status: "INVALID_INPUT" };
      }
      if (
        v.departure_elapsed_seconds === null ||
        !Number.isFinite(v.departure_elapsed_seconds) ||
        v.departure_elapsed_seconds < 0
      ) {
        warnings.push(`Timeline visit ${i} (${v.waypoint_id}) has invalid departure elapsed seconds.`);
        return { valid: false, status: "INVALID_INPUT" };
      }
      if (!Number.isFinite(v.stop_duration_seconds) || v.stop_duration_seconds < 0) {
        warnings.push(`Timeline visit ${i} (${v.waypoint_id}) has negative or non-finite stop duration.`);
        return { valid: false, status: "INVALID_INPUT" };
      }
      if (v.departure_elapsed_seconds < v.arrival_elapsed_seconds) {
        warnings.push(
          `Timeline visit ${i} (${v.waypoint_id}) has departure (${v.departure_elapsed_seconds}) prior to arrival (${v.arrival_elapsed_seconds}).`,
        );
        return { valid: false, status: "INVALID_INPUT" };
      }
      const actualStopDur = v.departure_elapsed_seconds - v.arrival_elapsed_seconds;
      if (Math.abs(actualStopDur - v.stop_duration_seconds) > TIMELINE_EPSILON_SECONDS) {
        warnings.push(
          `Timeline visit ${i} (${v.waypoint_id}) stop duration (${v.stop_duration_seconds}) does not match departure minus arrival (${actualStopDur}).`,
        );
        return { valid: false, status: "INVALID_INPUT" };
      }
    }

    // Segment connection & duration checks
    let sumSegmentTravelSec = 0;
    for (let j = 0; j < segments.length; j++) {
      const seg = segments[j];
      const fromVisit = visits[j];
      const toVisit = visits[j + 1];

      if (seg.from_waypoint_id !== fromVisit.waypoint_id || seg.to_waypoint_id !== toVisit.waypoint_id) {
        warnings.push(
          `Segment ${j} endpoints (${seg.from_waypoint_id} -> ${seg.to_waypoint_id}) do not match consecutive visits (${fromVisit.waypoint_id} -> ${toVisit.waypoint_id}).`,
        );
        return { valid: false, status: "INVALID_INPUT" };
      }

      if (seg.status !== "SUPPORTED") {
        warnings.push(`Complete timeline contains unsupported segment at index ${j}.`);
        return { valid: false, status: "INVALID_INPUT" };
      }

      if (
        seg.travel_duration_seconds === null ||
        !Number.isFinite(seg.travel_duration_seconds) ||
        seg.travel_duration_seconds < 0 ||
        seg.travel_duration_seconds > Number.MAX_SAFE_INTEGER
      ) {
        warnings.push(`Segment ${j} has non-finite or negative travel duration.`);
        return { valid: false, status: "INVALID_INPUT" };
      }

      const prevDep = fromVisit.departure_elapsed_seconds!;
      const nextArr = toVisit.arrival_elapsed_seconds!;

      if (nextArr < prevDep) {
        warnings.push(`Segment ${j} arrives at ${nextArr} before departing previous stop at ${prevDep}.`);
        return { valid: false, status: "INVALID_INPUT" };
      }

      const transitTime = nextArr - prevDep;
      if (Math.abs(transitTime - seg.travel_duration_seconds) > TIMELINE_EPSILON_SECONDS) {
        warnings.push(
          `Segment ${j} duration (${seg.travel_duration_seconds}) does not match arrival minus departure (${transitTime}).`,
        );
        return { valid: false, status: "INVALID_INPUT" };
      }

      sumSegmentTravelSec += seg.travel_duration_seconds;
    }

    // Sum of segment durations vs total_travel_seconds
    if (Math.abs(sumSegmentTravelSec - timeline.total_travel_seconds) > TIMELINE_EPSILON_SECONDS) {
      warnings.push(
        `Total travel seconds (${timeline.total_travel_seconds}) does not match sum of segments (${sumSegmentTravelSec}).`,
      );
      return { valid: false, status: "INVALID_INPUT" };
    }

    // Sum of stop durations vs total_stop_seconds
    const sumStopSec = visits.reduce((acc, v) => acc + v.stop_duration_seconds, 0);
    if (Math.abs(sumStopSec - timeline.total_stop_seconds) > TIMELINE_EPSILON_SECONDS) {
      warnings.push(
        `Total stop seconds (${timeline.total_stop_seconds}) does not match sum of stops (${sumStopSec}).`,
      );
      return { valid: false, status: "INVALID_INPUT" };
    }

    // Travel + Stop vs Total Mission Duration
    const expectedMissionTotal = timeline.total_travel_seconds + timeline.total_stop_seconds;
    if (Math.abs(expectedMissionTotal - timeline.total_mission_seconds) > TIMELINE_EPSILON_SECONDS) {
      warnings.push(
        `Total mission seconds (${timeline.total_mission_seconds}) does not match travel (${timeline.total_travel_seconds}) plus stop (${timeline.total_stop_seconds}) seconds.`,
      );
      return { valid: false, status: "INVALID_INPUT" };
    }

    return { valid: true, status: "COMPLETE_SCENARIO" };
  }

  // 2. Validation for INCOMPLETE_SCENARIO (check known prefix chronological integrity)
  for (let i = 0; i < N; i++) {
    const v = visits[i];
    if (v.arrival_elapsed_seconds !== null && v.departure_elapsed_seconds !== null) {
      if (
        !Number.isFinite(v.arrival_elapsed_seconds) ||
        !Number.isFinite(v.departure_elapsed_seconds) ||
        v.arrival_elapsed_seconds < 0 ||
        v.departure_elapsed_seconds < 0
      ) {
        warnings.push(`Timeline visit ${i} (${v.waypoint_id}) has invalid non-finite timestamp in prefix.`);
        return { valid: false, status: "INVALID_INPUT" };
      }
      if (v.departure_elapsed_seconds < v.arrival_elapsed_seconds) {
        warnings.push(
          `Timeline visit ${i} (${v.waypoint_id}) departure precedes arrival in incomplete timeline prefix.`,
        );
        return { valid: false, status: "INVALID_INPUT" };
      }
    }
  }

  for (let j = 0; j < segments.length; j++) {
    const seg = segments[j];
    if (seg.travel_duration_seconds !== null) {
      if (!Number.isFinite(seg.travel_duration_seconds) || seg.travel_duration_seconds < 0) {
        warnings.push(`Segment ${j} has invalid non-finite travel duration in prefix.`);
        return { valid: false, status: "INVALID_INPUT" };
      }
    }
  }

  return { valid: true, status: "INCOMPLETE_SCENARIO" };
}

// ---------------------------------------------------------------------------
// Main Resource Budget Calculation Engine
// ---------------------------------------------------------------------------

/**
 * Calculates estimated oxygen and electrical energy consumption from a mission timeline
 * and explicit scenario assumptions.
 *
 * Hardened for M4.2A:
 * - Runtime timeline validation & consistency.
 * - Subsystem decoupling & independent status tracking.
 * - Stage-level numerical overflow protection.
 * - Stage reconciliation against published totals.
 *
 * @param input Mission timeline and optional resource planning assumptions.
 * @returns Comprehensive resource budget calculation result.
 */
export function calculateResourceBudget(
  input: ResourceBudgetInput,
): ResourceBudgetResult {
  const warnings: string[] = [];

  // 1. Root structural check
  if (!input || typeof input !== "object") {
    return {
      status: "INVALID_INPUT",
      oxygen: createDefaultOxygenResult("INVALID_INPUT"),
      battery: createDefaultBatteryResult("INVALID_INPUT"),
      stages: [],
      warnings: ["Invalid resource budget input: root input must be an object."],
      scientific_disclaimer: RESOURCE_BUDGET_DISCLAIMER,
    };
  }

  // 2. Runtime timeline consistency validation (Issue C)
  const timelineValidation = validateTimelineConsistency(input.timeline, warnings);
  if (!timelineValidation.valid) {
    return {
      status: "INVALID_INPUT",
      oxygen: createDefaultOxygenResult("INVALID_INPUT"),
      battery: createDefaultBatteryResult("INVALID_INPUT"),
      stages: [],
      warnings,
      scientific_disclaimer: RESOURCE_BUDGET_DISCLAIMER,
    };
  }

  // 3. Independent assumption validation (Issue B)
  const oxygenVal = validateOxygenAssumptions(input.oxygen, warnings);
  const batteryVal = validateBatteryAssumptions(input.battery, warnings);

  // 4. Stage generation with numerical overflow protection (Issue A)
  const stages: ResourceStageEntry[] = [];
  let stageIndex = 0;
  let oxygenStageOverflow = false;
  let batteryStageOverflow = false;
  let cumulativeStageO2 = 0;
  let cumulativeStageBat = 0;

  const timelineEntries = input.timeline.timeline ?? [];
  const segments = input.timeline.segments ?? [];
  const totalStops = timelineEntries.length;

  for (let i = 0; i < totalStops; i++) {
    const stopEntry = timelineEntries[i];

    // If stop arrival or departure is indeterminate, cease stage generation (prefix cutoff)
    if (
      stopEntry.arrival_elapsed_seconds === null ||
      stopEntry.departure_elapsed_seconds === null
    ) {
      break;
    }

    const stopDuration = stopEntry.stop_duration_seconds;
    if (
      !Number.isFinite(stopDuration) ||
      stopDuration < 0 ||
      stopDuration > Number.MAX_SAFE_INTEGER
    ) {
      warnings.push(`Timeline stop ${i} has invalid duration.`);
      break;
    }

    const stopHours = stopDuration / 3600;

    // Stage oxygen calculation
    let stageO2: number | null = null;
    if (oxygenVal.valid && oxygenVal.stop_rate_g_per_hour !== null) {
      const rawO2 = stopHours * oxygenVal.stop_rate_g_per_hour;
      if (!Number.isFinite(rawO2) || rawO2 > Number.MAX_SAFE_INTEGER) {
        oxygenStageOverflow = true;
        warnings.push(
          `Stationary stage ${stageIndex} oxygen consumption overflowed safe numerical limits: ${rawO2}.`,
        );
      } else {
        stageO2 = rawO2;
        cumulativeStageO2 += rawO2;
        if (cumulativeStageO2 > Number.MAX_SAFE_INTEGER) {
          oxygenStageOverflow = true;
          warnings.push("Cumulative stage oxygen consumption overflowed safe numerical limits.");
        }
      }
    }

    // Stage battery calculation
    let stageBat: number | null = null;
    if (batteryVal.valid && batteryVal.stop_power_w !== null) {
      const rawBat = stopHours * batteryVal.stop_power_w;
      if (!Number.isFinite(rawBat) || rawBat > Number.MAX_SAFE_INTEGER) {
        batteryStageOverflow = true;
        warnings.push(
          `Stationary stage ${stageIndex} battery energy consumption overflowed safe numerical limits: ${rawBat}.`,
        );
      } else {
        stageBat = rawBat;
        cumulativeStageBat += rawBat;
        if (cumulativeStageBat > Number.MAX_SAFE_INTEGER) {
          batteryStageOverflow = true;
          warnings.push("Cumulative stage battery energy consumption overflowed safe numerical limits.");
        }
      }
    }

    stages.push({
      stage_index: stageIndex++,
      stage_type: "STATIONARY",
      reference_id: stopEntry.waypoint_id,
      start_elapsed_seconds: stopEntry.arrival_elapsed_seconds,
      end_elapsed_seconds: stopEntry.departure_elapsed_seconds,
      duration_seconds: stopDuration,
      oxygen_used_g: oxygenStageOverflow ? null : stageO2,
      battery_used_wh: batteryStageOverflow ? null : stageBat,
    });

    // Check connecting leg to subsequent waypoint
    if (i < totalStops - 1) {
      if (i < segments.length) {
        const seg = segments[i];

        // If segment is unsupported or duration missing, stop further stage generation
        if (
          seg.status !== "SUPPORTED" ||
          seg.travel_duration_seconds === null
        ) {
          break;
        }

        const nextStopEntry = timelineEntries[i + 1];
        if (nextStopEntry.arrival_elapsed_seconds === null) {
          break;
        }

        const travelDuration = seg.travel_duration_seconds;
        if (
          !Number.isFinite(travelDuration) ||
          travelDuration < 0 ||
          travelDuration > Number.MAX_SAFE_INTEGER
        ) {
          warnings.push(`Segment ${i} has invalid travel duration.`);
          break;
        }

        const travelHours = travelDuration / 3600;

        // Travel oxygen calculation
        let travelO2: number | null = null;
        if (oxygenVal.valid && oxygenVal.travel_rate_g_per_hour !== null) {
          const rawO2 = travelHours * oxygenVal.travel_rate_g_per_hour;
          if (!Number.isFinite(rawO2) || rawO2 > Number.MAX_SAFE_INTEGER) {
            oxygenStageOverflow = true;
            warnings.push(
              `Travel stage ${stageIndex} oxygen consumption overflowed safe numerical limits: ${rawO2}.`,
            );
          } else {
            travelO2 = rawO2;
            cumulativeStageO2 += rawO2;
            if (cumulativeStageO2 > Number.MAX_SAFE_INTEGER) {
              oxygenStageOverflow = true;
              warnings.push("Cumulative stage oxygen consumption overflowed safe numerical limits.");
            }
          }
        }

        // Travel battery calculation
        let travelBat: number | null = null;
        if (batteryVal.valid && batteryVal.travel_power_w !== null) {
          const rawBat = travelHours * batteryVal.travel_power_w;
          if (!Number.isFinite(rawBat) || rawBat > Number.MAX_SAFE_INTEGER) {
            batteryStageOverflow = true;
            warnings.push(
              `Travel stage ${stageIndex} battery energy consumption overflowed safe numerical limits: ${rawBat}.`,
            );
          } else {
            travelBat = rawBat;
            cumulativeStageBat += rawBat;
            if (cumulativeStageBat > Number.MAX_SAFE_INTEGER) {
              batteryStageOverflow = true;
              warnings.push("Cumulative stage battery energy consumption overflowed safe numerical limits.");
            }
          }
        }

        stages.push({
          stage_index: stageIndex++,
          stage_type: "TRAVEL",
          reference_id: `${seg.from_waypoint_id}->${seg.to_waypoint_id}`,
          start_elapsed_seconds: stopEntry.departure_elapsed_seconds,
          end_elapsed_seconds: nextStopEntry.arrival_elapsed_seconds,
          duration_seconds: travelDuration,
          oxygen_used_g: oxygenStageOverflow ? null : travelO2,
          battery_used_wh: batteryStageOverflow ? null : travelBat,
        });
      } else {
        break;
      }
    }
  }

  // 5. Incomplete timeline handling
  if (timelineValidation.status === "INCOMPLETE_SCENARIO") {
    warnings.push(
      "Mission timeline is incomplete; definitive full-mission resource budgets cannot be established.",
    );
    if (input.timeline.warnings && Array.isArray(input.timeline.warnings)) {
      warnings.push(...input.timeline.warnings);
    }

    const o2Status: ResourceAssessmentStatus = !oxygenVal.valid
      ? "INVALID_INPUT"
      : "INSUFFICIENT_DATA";
    const batStatus: ResourceAssessmentStatus = !batteryVal.valid
      ? "INVALID_INPUT"
      : "INSUFFICIENT_DATA";

    let overallStatus: ResourceAssessmentStatus = "INSUFFICIENT_DATA";
    if (o2Status === "INVALID_INPUT" || batStatus === "INVALID_INPUT") {
      overallStatus = "INVALID_INPUT";
    }

    return {
      status: overallStatus,
      oxygen: createDefaultOxygenResult(o2Status),
      battery: createDefaultBatteryResult(batStatus),
      stages,
      warnings,
      scientific_disclaimer: RESOURCE_BUDGET_DISCLAIMER,
    };
  }

  // 6. Complete timeline calculation
  const totalTravelSeconds = input.timeline.total_travel_seconds!;
  const totalStopSeconds = input.timeline.total_stop_seconds;
  const travelHours = totalTravelSeconds / 3600;
  const stopHours = totalStopSeconds / 3600;

  // 6a. Oxygen Subsystem Assessment
  let oxygenResult: OxygenBudgetResult;

  if (!oxygenVal.valid || oxygenStageOverflow) {
    oxygenResult = createDefaultOxygenResult("INVALID_INPUT");
  } else if (!oxygenVal.provided) {
    warnings.push("Oxygen budget assumptions were not configured.");
    oxygenResult = createDefaultOxygenResult("INSUFFICIENT_DATA");
  } else if (
    oxygenVal.travel_rate_g_per_hour === null ||
    oxygenVal.stop_rate_g_per_hour === null
  ) {
    const travelUsed =
      oxygenVal.travel_rate_g_per_hour !== null
        ? travelHours * oxygenVal.travel_rate_g_per_hour
        : null;
    const stopUsed =
      oxygenVal.stop_rate_g_per_hour !== null
        ? stopHours * oxygenVal.stop_rate_g_per_hour
        : null;

    warnings.push(
      "Oxygen consumption rates are missing or partially specified; full oxygen budget cannot be established.",
    );
    oxygenResult = {
      travel_used_g: travelUsed,
      stationary_used_g: stopUsed,
      total_used_g: null,
      remaining_g: null,
      remaining_after_reserve_g: null,
      status: "INSUFFICIENT_DATA",
    };
  } else {
    const travelUsed = travelHours * oxygenVal.travel_rate_g_per_hour;
    const stopUsed = stopHours * oxygenVal.stop_rate_g_per_hour;
    const totalUsed = travelUsed + stopUsed;

    if (!Number.isFinite(totalUsed) || totalUsed > Number.MAX_SAFE_INTEGER) {
      warnings.push("Calculated oxygen consumption overflowed finite representable limits.");
      oxygenResult = createDefaultOxygenResult("INVALID_INPUT");
    } else if (oxygenVal.capacity_g === null) {
      warnings.push("Oxygen capacity was not configured; remaining oxygen cannot be calculated.");
      oxygenResult = {
        travel_used_g: travelUsed,
        stationary_used_g: stopUsed,
        total_used_g: totalUsed,
        remaining_g: null,
        remaining_after_reserve_g: null,
        status: "INSUFFICIENT_DATA",
      };
    } else {
      const remaining = oxygenVal.capacity_g - totalUsed;

      if (!Number.isFinite(remaining)) {
        warnings.push("Remaining oxygen calculation resulted in non-finite value.");
        oxygenResult = createDefaultOxygenResult("INVALID_INPUT");
      } else if (oxygenVal.reserve_g === null) {
        if (remaining < 0) {
          warnings.push(
            `Configured oxygen capacity (${oxygenVal.capacity_g} g) is exceeded by ${Math.abs(remaining).toFixed(1)} g.`,
          );
          oxygenResult = {
            travel_used_g: travelUsed,
            stationary_used_g: stopUsed,
            total_used_g: totalUsed,
            remaining_g: remaining,
            remaining_after_reserve_g: null,
            status: "EXCEEDS_CONFIGURED_BUDGET",
          };
        } else {
          warnings.push(
            "Oxygen reserve was not configured; reserve compliance cannot be verified.",
          );
          oxygenResult = {
            travel_used_g: travelUsed,
            stationary_used_g: stopUsed,
            total_used_g: totalUsed,
            remaining_g: remaining,
            remaining_after_reserve_g: null,
            status: "INSUFFICIENT_DATA",
          };
        }
      } else {
        const remainingAfterReserve = remaining - oxygenVal.reserve_g;

        if (!Number.isFinite(remainingAfterReserve)) {
          warnings.push(
            "Remaining oxygen after reserve calculation resulted in non-finite value.",
          );
          oxygenResult = createDefaultOxygenResult("INVALID_INPUT");
        } else if (remainingAfterReserve < 0 || remaining < 0) {
          if (remaining < 0) {
            warnings.push(
              `Configured oxygen capacity (${oxygenVal.capacity_g} g) is exceeded by ${Math.abs(remaining).toFixed(1)} g.`,
            );
          } else {
            warnings.push(
              `Configured oxygen reserve (${oxygenVal.reserve_g} g) is infringed by ${Math.abs(remainingAfterReserve).toFixed(1)} g.`,
            );
          }
          oxygenResult = {
            travel_used_g: travelUsed,
            stationary_used_g: stopUsed,
            total_used_g: totalUsed,
            remaining_g: remaining,
            remaining_after_reserve_g: remainingAfterReserve,
            status: "EXCEEDS_CONFIGURED_BUDGET",
          };
        } else {
          oxygenResult = {
            travel_used_g: travelUsed,
            stationary_used_g: stopUsed,
            total_used_g: totalUsed,
            remaining_g: remaining,
            remaining_after_reserve_g: remainingAfterReserve,
            status: "WITHIN_CONFIGURED_BUDGET",
          };
        }
      }
    }
  }

  // 6b. Battery Subsystem Assessment
  let batteryResult: BatteryBudgetResult;

  if (!batteryVal.valid || batteryStageOverflow) {
    batteryResult = createDefaultBatteryResult("INVALID_INPUT");
  } else if (!batteryVal.provided) {
    warnings.push("Battery budget assumptions were not configured.");
    batteryResult = createDefaultBatteryResult("INSUFFICIENT_DATA");
  } else if (
    batteryVal.travel_power_w === null ||
    batteryVal.stop_power_w === null
  ) {
    const travelUsed =
      batteryVal.travel_power_w !== null
        ? travelHours * batteryVal.travel_power_w
        : null;
    const stopUsed =
      batteryVal.stop_power_w !== null
        ? stopHours * batteryVal.stop_power_w
        : null;

    warnings.push(
      "Battery power consumption rates are missing or partially specified; full battery budget cannot be established.",
    );
    batteryResult = {
      travel_used_wh: travelUsed,
      stationary_used_wh: stopUsed,
      total_used_wh: null,
      remaining_wh: null,
      remaining_after_reserve_wh: null,
      status: "INSUFFICIENT_DATA",
    };
  } else {
    const travelUsed = travelHours * batteryVal.travel_power_w;
    const stopUsed = stopHours * batteryVal.stop_power_w;
    const totalUsed = travelUsed + stopUsed;

    if (!Number.isFinite(totalUsed) || totalUsed > Number.MAX_SAFE_INTEGER) {
      warnings.push(
        "Calculated battery energy consumption overflowed finite representable limits.",
      );
      batteryResult = createDefaultBatteryResult("INVALID_INPUT");
    } else if (batteryVal.capacity_wh === null) {
      warnings.push(
        "Battery capacity was not configured; remaining electrical energy cannot be calculated.",
      );
      batteryResult = {
        travel_used_wh: travelUsed,
        stationary_used_wh: stopUsed,
        total_used_wh: totalUsed,
        remaining_wh: null,
        remaining_after_reserve_wh: null,
        status: "INSUFFICIENT_DATA",
      };
    } else {
      const remaining = batteryVal.capacity_wh - totalUsed;

      if (!Number.isFinite(remaining)) {
        warnings.push("Remaining battery energy calculation resulted in non-finite value.");
        batteryResult = createDefaultBatteryResult("INVALID_INPUT");
      } else if (batteryVal.reserve_wh === null) {
        if (remaining < 0) {
          warnings.push(
            `Configured battery capacity (${batteryVal.capacity_wh} Wh) is exceeded by ${Math.abs(remaining).toFixed(1)} Wh.`,
          );
          batteryResult = {
            travel_used_wh: travelUsed,
            stationary_used_wh: stopUsed,
            total_used_wh: totalUsed,
            remaining_wh: remaining,
            remaining_after_reserve_wh: null,
            status: "EXCEEDS_CONFIGURED_BUDGET",
          };
        } else {
          warnings.push(
            "Battery reserve was not configured; reserve compliance cannot be verified.",
          );
          batteryResult = {
            travel_used_wh: travelUsed,
            stationary_used_wh: stopUsed,
            total_used_wh: totalUsed,
            remaining_wh: remaining,
            remaining_after_reserve_wh: null,
            status: "INSUFFICIENT_DATA",
          };
        }
      } else {
        const remainingAfterReserve = remaining - batteryVal.reserve_wh;

        if (!Number.isFinite(remainingAfterReserve)) {
          warnings.push(
            "Remaining battery energy after reserve calculation resulted in non-finite value.",
          );
          batteryResult = createDefaultBatteryResult("INVALID_INPUT");
        } else if (remainingAfterReserve < 0 || remaining < 0) {
          if (remaining < 0) {
            warnings.push(
              `Configured battery capacity (${batteryVal.capacity_wh} Wh) is exceeded by ${Math.abs(remaining).toFixed(1)} Wh.`,
            );
          } else {
            warnings.push(
              `Configured battery reserve (${batteryVal.reserve_wh} Wh) is infringed by ${Math.abs(remainingAfterReserve).toFixed(1)} Wh.`,
            );
          }
          batteryResult = {
            travel_used_wh: travelUsed,
            stationary_used_wh: stopUsed,
            total_used_wh: totalUsed,
            remaining_wh: remaining,
            remaining_after_reserve_wh: remainingAfterReserve,
            status: "EXCEEDS_CONFIGURED_BUDGET",
          };
        } else {
          batteryResult = {
            travel_used_wh: travelUsed,
            stationary_used_wh: stopUsed,
            total_used_wh: totalUsed,
            remaining_wh: remaining,
            remaining_after_reserve_wh: remainingAfterReserve,
            status: "WITHIN_CONFIGURED_BUDGET",
          };
        }
      }
    }
  }

  // 7. Stage-to-Total Reconciliation (Issue D)
  // Ensure stage count matches expected 2N - 1 stages for N visits
  const expectedStageCount = 2 * totalStops - 1;
  if (stages.length !== expectedStageCount) {
    warnings.push(
      `Stage count (${stages.length}) does not match expected chronological sequence count (${expectedStageCount}).`,
    );
    if (oxygenResult.status !== "INVALID_INPUT") {
      oxygenResult = createDefaultOxygenResult("INVALID_INPUT");
    }
    if (batteryResult.status !== "INVALID_INPUT") {
      batteryResult = createDefaultBatteryResult("INVALID_INPUT");
    }
  }

  // Reconcile oxygen stage totals
  if (
    oxygenResult.status !== "INVALID_INPUT" &&
    oxygenResult.travel_used_g !== null &&
    oxygenResult.stationary_used_g !== null &&
    oxygenResult.total_used_g !== null
  ) {
    const stageTravelO2 = stages
      .filter((s) => s.stage_type === "TRAVEL")
      .reduce((sum, s) => sum + (s.oxygen_used_g ?? 0), 0);
    const stageStationaryO2 = stages
      .filter((s) => s.stage_type === "STATIONARY")
      .reduce((sum, s) => sum + (s.oxygen_used_g ?? 0), 0);
    const stageTotalO2 = stageTravelO2 + stageStationaryO2;

    const diffTravel = Math.abs(stageTravelO2 - oxygenResult.travel_used_g);
    const diffStationary = Math.abs(stageStationaryO2 - oxygenResult.stationary_used_g);
    const diffTotal = Math.abs(stageTotalO2 - oxygenResult.total_used_g);

    if (
      diffTravel > STAGE_RECONCILIATION_TOLERANCE ||
      diffStationary > STAGE_RECONCILIATION_TOLERANCE ||
      diffTotal > STAGE_RECONCILIATION_TOLERANCE
    ) {
      warnings.push(
        `Stage oxygen consumption does not reconcile with overall totals (diff: ${diffTotal.toExponential(2)} g).`,
      );
      oxygenResult = createDefaultOxygenResult("INVALID_INPUT");
    }
  }

  // Reconcile battery stage totals
  if (
    batteryResult.status !== "INVALID_INPUT" &&
    batteryResult.travel_used_wh !== null &&
    batteryResult.stationary_used_wh !== null &&
    batteryResult.total_used_wh !== null
  ) {
    const stageTravelBat = stages
      .filter((s) => s.stage_type === "TRAVEL")
      .reduce((sum, s) => sum + (s.battery_used_wh ?? 0), 0);
    const stageStationaryBat = stages
      .filter((s) => s.stage_type === "STATIONARY")
      .reduce((sum, s) => sum + (s.battery_used_wh ?? 0), 0);
    const stageTotalBat = stageTravelBat + stageStationaryBat;

    const diffTravel = Math.abs(stageTravelBat - batteryResult.travel_used_wh);
    const diffStationary = Math.abs(stageStationaryBat - batteryResult.stationary_used_wh);
    const diffTotal = Math.abs(stageTotalBat - batteryResult.total_used_wh);

    if (
      diffTravel > STAGE_RECONCILIATION_TOLERANCE ||
      diffStationary > STAGE_RECONCILIATION_TOLERANCE ||
      diffTotal > STAGE_RECONCILIATION_TOLERANCE
    ) {
      warnings.push(
        `Stage battery consumption does not reconcile with overall totals (diff: ${diffTotal.toExponential(2)} Wh).`,
      );
      batteryResult = createDefaultBatteryResult("INVALID_INPUT");
    }
  }

  // 8. Determine overall scenario status with strict precedence
  let overallStatus: ResourceAssessmentStatus;

  if (
    oxygenResult.status === "INVALID_INPUT" ||
    batteryResult.status === "INVALID_INPUT"
  ) {
    overallStatus = "INVALID_INPUT";
  } else if (
    oxygenResult.status === "EXCEEDS_CONFIGURED_BUDGET" ||
    batteryResult.status === "EXCEEDS_CONFIGURED_BUDGET"
  ) {
    overallStatus = "EXCEEDS_CONFIGURED_BUDGET";
  } else if (
    oxygenResult.status === "INSUFFICIENT_DATA" ||
    batteryResult.status === "INSUFFICIENT_DATA"
  ) {
    overallStatus = "INSUFFICIENT_DATA";
  } else {
    overallStatus = "WITHIN_CONFIGURED_BUDGET";
  }

  return {
    status: overallStatus,
    oxygen: oxygenResult,
    battery: batteryResult,
    stages,
    warnings,
    scientific_disclaimer: RESOURCE_BUDGET_DISCLAIMER,
  };
}
