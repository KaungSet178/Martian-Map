/**
 * Marswalk deterministic mission resource budgeting engine (Oxygen and Battery Energy).
 *
 * M4.2 — Deterministic Resource Budgeting Foundation
 *
 * Computes hypothetical oxygen mass consumption (grams) and electrical energy
 * consumption (watt-hours) from a deterministic mission timeline (M4.1/M4.1A)
 * and explicitly configured scenario assumptions.
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
  /** Estimated oxygen mass consumed during this stage in grams, or null if unconfigured. */
  oxygen_used_g: z.number().nonnegative().nullable(),
  /** Estimated electrical energy consumed during this stage in watt-hours (Wh), or null if unconfigured. */
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

  const validateField = (
    val: unknown,
    fieldName: string,
  ): number | null => {
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

  const validateField = (
    val: unknown,
    fieldName: string,
  ): number | null => {
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
// Main Resource Budget Calculation Engine
// ---------------------------------------------------------------------------

/**
 * Calculates estimated oxygen and electrical energy consumption from a mission timeline
 * and explicit scenario assumptions.
 *
 * Pure, deterministic, region-independent, and unit-tested.
 *
 * @param input Mission timeline and optional resource planning assumptions.
 * @returns Comprehensive resource budget calculation result.
 */
export function calculateResourceBudget(
  input: ResourceBudgetInput,
): ResourceBudgetResult {
  const warnings: string[] = [];

  // 1. Structural input validation
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

  if (!input.timeline || typeof input.timeline !== "object") {
    return {
      status: "INVALID_INPUT",
      oxygen: createDefaultOxygenResult("INVALID_INPUT"),
      battery: createDefaultBatteryResult("INVALID_INPUT"),
      stages: [],
      warnings: ["Mission timeline is required for resource budget calculation."],
      scientific_disclaimer: RESOURCE_BUDGET_DISCLAIMER,
    };
  }

  // If timeline status is invalid, propagate INVALID_INPUT
  if (input.timeline.status === "INVALID_INPUT") {
    warnings.push(
      "Cannot calculate resource budget from an invalid mission timeline.",
    );
    if (input.timeline.warnings && Array.isArray(input.timeline.warnings)) {
      warnings.push(...input.timeline.warnings);
    }
    return {
      status: "INVALID_INPUT",
      oxygen: createDefaultOxygenResult("INVALID_INPUT"),
      battery: createDefaultBatteryResult("INVALID_INPUT"),
      stages: [],
      warnings,
      scientific_disclaimer: RESOURCE_BUDGET_DISCLAIMER,
    };
  }

  // 2. Validate oxygen and battery assumptions
  const oxygenVal = validateOxygenAssumptions(input.oxygen, warnings);
  const batteryVal = validateBatteryAssumptions(input.battery, warnings);

  if (!oxygenVal.valid || !batteryVal.valid) {
    const o2Status: ResourceAssessmentStatus = !oxygenVal.valid
      ? "INVALID_INPUT"
      : oxygenVal.provided
        ? "INSUFFICIENT_DATA"
        : "INSUFFICIENT_DATA";
    const batStatus: ResourceAssessmentStatus = !batteryVal.valid
      ? "INVALID_INPUT"
      : batteryVal.provided
        ? "INSUFFICIENT_DATA"
        : "INSUFFICIENT_DATA";

    return {
      status: "INVALID_INPUT",
      oxygen: createDefaultOxygenResult(o2Status),
      battery: createDefaultBatteryResult(batStatus),
      stages: [],
      warnings,
      scientific_disclaimer: RESOURCE_BUDGET_DISCLAIMER,
    };
  }

  // 3. Stage generation (chronological sequence of stationary stops and travel legs)
  const stages: ResourceStageEntry[] = [];
  let stageIndex = 0;

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
    const stopHours = stopDuration / 3600;

    let stageO2: number | null = null;
    if (oxygenVal.stop_rate_g_per_hour !== null) {
      stageO2 = stopHours * oxygenVal.stop_rate_g_per_hour;
    }

    let stageBat: number | null = null;
    if (batteryVal.stop_power_w !== null) {
      stageBat = stopHours * batteryVal.stop_power_w;
    }

    stages.push({
      stage_index: stageIndex++,
      stage_type: "STATIONARY",
      reference_id: stopEntry.waypoint_id,
      start_elapsed_seconds: stopEntry.arrival_elapsed_seconds,
      end_elapsed_seconds: stopEntry.departure_elapsed_seconds,
      duration_seconds: stopDuration,
      oxygen_used_g: stageO2,
      battery_used_wh: stageBat,
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
        const travelHours = travelDuration / 3600;

        let travelO2: number | null = null;
        if (oxygenVal.travel_rate_g_per_hour !== null) {
          travelO2 = travelHours * oxygenVal.travel_rate_g_per_hour;
        }

        let travelBat: number | null = null;
        if (batteryVal.travel_power_w !== null) {
          travelBat = travelHours * batteryVal.travel_power_w;
        }

        stages.push({
          stage_index: stageIndex++,
          stage_type: "TRAVEL",
          reference_id: `${seg.from_waypoint_id}->${seg.to_waypoint_id}`,
          start_elapsed_seconds: stopEntry.departure_elapsed_seconds,
          end_elapsed_seconds: nextStopEntry.arrival_elapsed_seconds,
          duration_seconds: travelDuration,
          oxygen_used_g: travelO2,
          battery_used_wh: travelBat,
        });
      } else {
        break;
      }
    }
  }

  // 4. Handle incomplete timeline scenario
  if (input.timeline.status === "INCOMPLETE_SCENARIO") {
    warnings.push(
      "Mission timeline is incomplete; definitive full-mission resource budgets cannot be established.",
    );
    if (input.timeline.warnings && Array.isArray(input.timeline.warnings)) {
      warnings.push(...input.timeline.warnings);
    }

    return {
      status: "INSUFFICIENT_DATA",
      oxygen: createDefaultOxygenResult("INSUFFICIENT_DATA"),
      battery: createDefaultBatteryResult("INSUFFICIENT_DATA"),
      stages,
      warnings,
      scientific_disclaimer: RESOURCE_BUDGET_DISCLAIMER,
    };
  }

  // 5. Complete timeline calculation
  const totalTravelSeconds = input.timeline.total_travel_seconds;
  const totalStopSeconds = input.timeline.total_stop_seconds;

  if (totalTravelSeconds === null || !Number.isFinite(totalTravelSeconds)) {
    warnings.push("Timeline total travel duration is unavailable or non-finite.");
    return {
      status: "INSUFFICIENT_DATA",
      oxygen: createDefaultOxygenResult("INSUFFICIENT_DATA"),
      battery: createDefaultBatteryResult("INSUFFICIENT_DATA"),
      stages,
      warnings,
      scientific_disclaimer: RESOURCE_BUDGET_DISCLAIMER,
    };
  }

  const travelHours = totalTravelSeconds / 3600;
  const stopHours = totalStopSeconds / 3600;

  // 5a. Calculate Oxygen Budget
  let oxygenResult: OxygenBudgetResult;

  if (!oxygenVal.provided) {
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

  // 5b. Calculate Battery Energy Budget
  let batteryResult: BatteryBudgetResult;

  if (!batteryVal.provided) {
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

  // 6. Determine overall scenario status
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
