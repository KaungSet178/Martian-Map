/**
 * Mars geometric waypoint planning foundation.
 *
 * Provides a pure, deterministic, unit-tested engine for constructing,
 * updating, validating, and calculating geometric trajectories across
 * sequences of Mars surface waypoints.
 *
 * Uses the M1 Mars geodesy utilities (`lib/map/geodesy.ts`) on the PDS
 * Mars 2000 reference sphere (R = 3,396,190 m).
 *
 * SCIENTIFIC BOUNDARIES & CONTRACT INTEGRITY:
 * - All outputs are strictly "Proposed geometric trajectories".
 * - Distance outputs are geometric surface distances on an idealized sphere.
 * - This module does NOT evaluate terrain slopes, DEM relief, boulder hazards,
 *   physical traversability, astronaut metabolic rates, or mission feasibility.
 * - User-defined coordinates are planning inputs, not verified NASA ground truth.
 *
 * @module lib/mission/waypoint-planning
 */

import { z } from "zod";
import {
  coordinatesSchema,
  regionIdSchema,
  type RegionId,
} from "@/lib/contracts/primitives";
import {
  marsDistance,
  marsInitialBearing,
  marsResamplePath,
  MARS_RADIUS_M,
  type MarsCoordinate,
} from "@/lib/map/geodesy";
import type { Target } from "@/lib/contracts/science";

// ---------------------------------------------------------------------------
// Scientific Constants & Descriptions
// ---------------------------------------------------------------------------

/** Reference spherical Mars radius in meters (PDS Mars 2000 standard). */
export const MARS_SPHERICAL_RADIUS_M = MARS_RADIUS_M;

/** Standard scientific disclaimer attached to all trajectory outputs. */
export const GEOMETRIC_TRAJECTORY_LABEL =
  "Proposed geometric trajectory — spherical Mars approximation (R = 3,396,190 m)";

// ---------------------------------------------------------------------------
// Zod Schemas & TypeScript Types
// ---------------------------------------------------------------------------

/**
 * Functional role of a waypoint within a proposed Mars surface excursion.
 */
export const waypointRoleSchema = z.enum([
  "base", // Starting base camp / habitat / lander location
  "science_stop", // Planned stop for scientific investigation or sampling
  "intermediate", // Navigational milestone or turn point
  "destination", // Terminus of an outbound traverse
  "recovery_endpoint", // Pre-planned extraction or rendezvous location
]);
export type WaypointRole = z.infer<typeof waypointRoleSchema>;

/**
 * Provenance origin of coordinate data for a waypoint.
 * Distinguishes user planning inputs from verified NASA target catalog items.
 */
export const waypointProvenanceSchema = z.enum([
  "user_planning_input", // Hypothetical user-placed planning location
  "verified_science_target", // Derived from an audited, coordinate-verified Target record
  "historical_landmark", // Precursor mission landmark (e.g. verified rover landing site)
]);
export type WaypointProvenance = z.infer<typeof waypointProvenanceSchema>;

/**
 * Schema for an individual Mars surface waypoint.
 */
export const waypointSchema = z.object({
  id: z.string().min(1).max(100),
  coordinates: coordinatesSchema,
  role: waypointRoleSchema,
  label: z.string().trim().min(1).max(200).optional(),
  target_id: z.string().min(1).max(100).optional(),
  provenance: waypointProvenanceSchema,
  notes: z.string().max(2000).optional(),
});
export type MarsWaypoint = z.infer<typeof waypointSchema>;

/**
 * Trajectory mode:
 * - round_trip: Trajectory loops back from the final waypoint to the origin base.
 * - one_way: Trajectory terminates at a designated destination or recovery endpoint.
 */
export const trajectoryModeSchema = z.enum(["round_trip", "one_way"]);
export type TrajectoryMode = z.infer<typeof trajectoryModeSchema>;

/**
 * Schema for a complete waypoint planning document.
 */
export const waypointPlanSchema = z.object({
  schema_version: z.literal(1),
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  region_id: regionIdSchema.optional(),
  mode: trajectoryModeSchema,
  waypoints: z.array(waypointSchema).max(100),
  recovery_assumption: z.string().max(2000).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});
export type WaypointPlan = z.infer<typeof waypointPlanSchema>;

/**
 * Calculated geometric properties of a single leg connecting two waypoints.
 */
export interface TrajectorySegment {
  readonly segment_index: number;
  readonly from_waypoint_id: string;
  readonly to_waypoint_id: string;
  readonly from_coordinates: MarsCoordinate;
  readonly to_coordinates: MarsCoordinate;
  /** Great-circle surface distance on the Mars reference sphere in metres. */
  readonly surface_distance_m: number;
  /** Forward initial bearing in degrees [0, 360), or NaN if coincident or undefined. */
  readonly initial_bearing_deg: number;
  /** Indicates whether this segment represents the return closure leg to the origin base. */
  readonly is_return_segment: boolean;
}

/**
 * Complete geometric trajectory structure generated from a validated waypoint plan.
 */
export interface ProposedGeometricTrajectory {
  readonly mode: TrajectoryMode;
  readonly ordered_waypoint_ids: readonly string[];
  /** Sequence of waypoints visited, including the closed origin at the end if round_trip. */
  readonly trajectory_waypoints: readonly MarsWaypoint[];
  readonly segments: readonly TrajectorySegment[];
  readonly total_surface_distance_m: number;
  readonly scientific_label: string;
}

/**
 * Summary breakdown of distances for a geometric trajectory.
 */
export interface GeometricDistanceSummary {
  readonly outbound_distance_m: number;
  readonly return_distance_m: number;
  readonly total_surface_distance_m: number;
  readonly segment_count: number;
  readonly waypoint_count: number;
  readonly is_closed_loop: boolean;
}

/**
 * Validation issue severity.
 */
export type ValidationSeverity = "error" | "warning";

/**
 * Structured validation issue reported by `validateWaypointPlan`.
 */
export interface PlanValidationIssue {
  readonly code:
    | "EMPTY_PLAN"
    | "DUPLICATE_WAYPOINT_ID"
    | "INVALID_COORDINATES"
    | "MISSING_ORIGIN"
    | "INSUFFICIENT_WAYPOINTS"
    | "MISSING_DESTINATION"
    | "MISSING_RECOVERY_ASSUMPTION"
    | "COINCIDENT_CONSECUTIVE_WAYPOINTS"
    | "UNVERIFIED_TARGET_REFERENCE";
  readonly message: string;
  readonly waypoint_id?: string;
  readonly severity: ValidationSeverity;
}

/**
 * Outcome of validating a waypoint plan.
 */
export interface PlanValidationResult {
  readonly valid: boolean;
  readonly issues: readonly PlanValidationIssue[];
  readonly errors: readonly PlanValidationIssue[];
  readonly warnings: readonly PlanValidationIssue[];
}

// ---------------------------------------------------------------------------
// Pure Factory Helpers
// ---------------------------------------------------------------------------

/**
 * Parameters for creating a new waypoint.
 */
export interface CreateWaypointParams {
  readonly id?: string;
  readonly coordinates: MarsCoordinate;
  readonly role?: WaypointRole;
  readonly label?: string;
  readonly target_id?: string;
  readonly provenance?: WaypointProvenance;
  readonly notes?: string;
}

/**
 * Create a validated `MarsWaypoint`.
 *
 * @throws {Error} if coordinate values fail project bounds [-90..90, 0..<360].
 */
export function createWaypoint(params: CreateWaypointParams): MarsWaypoint {
  const raw: Record<string, unknown> = {
    id: params.id ?? `wp-${crypto.randomUUID()}`,
    coordinates: {
      latitude: params.coordinates.latitude,
      longitude_east: params.coordinates.longitude_east,
    },
    role: params.role ?? "intermediate",
    provenance: params.provenance ?? "user_planning_input",
  };
  if (params.label !== undefined) raw.label = params.label;
  if (params.target_id !== undefined) raw.target_id = params.target_id;
  if (params.notes !== undefined) raw.notes = params.notes;

  return waypointSchema.parse(raw);
}

/**
 * Create a `MarsWaypoint` associated with an existing verified `Target`.
 *
 * @throws {Error} if the target has no coordinates or is not verified.
 */
export function createWaypointFromTarget(
  target: Target,
  role: WaypointRole = "science_stop",
): MarsWaypoint {
  if (!target.coordinates) {
    throw new Error(
      `Cannot create waypoint from target "${target.id}": coordinates are null or unassigned.`,
    );
  }
  if (!target.coordinate_verified) {
    throw new Error(
      `Cannot create waypoint from target "${target.id}": coordinate verification is false.`,
    );
  }

  return createWaypoint({
    id: `wp-${target.id}`,
    coordinates: target.coordinates,
    role,
    label: target.title,
    target_id: target.id,
    provenance: "verified_science_target",
    notes: target.scientific_goal,
  });
}

/**
 * Options for initializing a new `WaypointPlan`.
 */
export interface CreateWaypointPlanOptions {
  readonly id?: string;
  readonly name?: string;
  readonly region_id?: RegionId;
  readonly mode?: TrajectoryMode;
  readonly waypoints?: readonly MarsWaypoint[];
  readonly recovery_assumption?: string;
}

/**
 * Initialize a new, immutable `WaypointPlan`.
 */
export function createWaypointPlan(
  options: CreateWaypointPlanOptions = {},
): WaypointPlan {
  const plan: Record<string, unknown> = {
    schema_version: 1,
    id: options.id ?? `plan-${crypto.randomUUID()}`,
    name: options.name ?? "Proposed Marswalk Traverse",
    mode: options.mode ?? "round_trip",
    waypoints: options.waypoints ? [...options.waypoints] : [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (options.region_id !== undefined) plan.region_id = options.region_id;
  if (options.recovery_assumption !== undefined) {
    plan.recovery_assumption = options.recovery_assumption;
  }
  return waypointPlanSchema.parse(plan);
}

// ---------------------------------------------------------------------------
// Pure Immutable Management Functions
// ---------------------------------------------------------------------------

/**
 * Add a waypoint to the plan.
 *
 * @param plan Target plan.
 * @param waypoint Waypoint to insert.
 * @param index Optional zero-based insertion index. If omitted, appends to the end.
 * @returns A fresh, immutable `WaypointPlan`.
 * @throws {Error} if a waypoint with the same ID already exists in the plan.
 */
export function addWaypoint(
  plan: WaypointPlan,
  waypoint: MarsWaypoint,
  index?: number,
): WaypointPlan {
  const validatedWp = waypointSchema.parse(waypoint);
  if (plan.waypoints.some((w) => w.id === validatedWp.id)) {
    throw new Error(
      `Waypoint with ID "${validatedWp.id}" already exists in plan "${plan.id}".`,
    );
  }

  const nextWaypoints = [...plan.waypoints];
  if (index === undefined || index >= nextWaypoints.length) {
    nextWaypoints.push(validatedWp);
  } else if (index <= 0) {
    nextWaypoints.unshift(validatedWp);
  } else {
    nextWaypoints.splice(index, 0, validatedWp);
  }

  return {
    ...plan,
    waypoints: nextWaypoints,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Remove a waypoint from the plan by its ID.
 *
 * @param plan Target plan.
 * @param waypointId ID of the waypoint to remove.
 * @returns A fresh, immutable `WaypointPlan`.
 * @throws {Error} if the waypoint ID does not exist in the plan.
 */
export function removeWaypoint(
  plan: WaypointPlan,
  waypointId: string,
): WaypointPlan {
  const exists = plan.waypoints.some((w) => w.id === waypointId);
  if (!exists) {
    throw new Error(
      `Cannot remove waypoint: ID "${waypointId}" was not found in plan "${plan.id}".`,
    );
  }

  return {
    ...plan,
    waypoints: plan.waypoints.filter((w) => w.id !== waypointId),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Update an existing waypoint within the plan.
 *
 * @param plan Target plan.
 * @param waypointId ID of the waypoint to update.
 * @param updates Fields to merge into the waypoint.
 * @returns A fresh, immutable `WaypointPlan`.
 * @throws {Error} if the waypoint ID does not exist or if updates produce an invalid waypoint.
 */
export function updateWaypoint(
  plan: WaypointPlan,
  waypointId: string,
  updates: Partial<Omit<MarsWaypoint, "id">>,
): WaypointPlan {
  const index = plan.waypoints.findIndex((w) => w.id === waypointId);
  if (index === -1) {
    throw new Error(
      `Cannot update waypoint: ID "${waypointId}" was not found in plan "${plan.id}".`,
    );
  }

  const existing = plan.waypoints[index];
  const merged: MarsWaypoint = waypointSchema.parse({
    ...existing,
    ...updates,
    id: existing.id, // ID remains immutable
  });

  const nextWaypoints = [...plan.waypoints];
  nextWaypoints[index] = merged;

  return {
    ...plan,
    waypoints: nextWaypoints,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Reorder all waypoints in the plan according to an array of waypoint IDs.
 *
 * @param plan Target plan.
 * @param orderedIds Explicit ordered array of all waypoint IDs in the plan.
 * @returns A fresh, immutable `WaypointPlan`.
 * @throws {Error} if `orderedIds` does not contain an exact 1-to-1 permutation of existing IDs.
 */
export function reorderWaypoints(
  plan: WaypointPlan,
  orderedIds: readonly string[],
): WaypointPlan {
  if (orderedIds.length !== plan.waypoints.length) {
    throw new Error(
      `Reordering failed: received ${orderedIds.length} IDs, expected ${plan.waypoints.length}.`,
    );
  }

  const idMap = new Map(plan.waypoints.map((w) => [w.id, w]));
  const reordered: MarsWaypoint[] = [];

  for (const id of orderedIds) {
    const wp = idMap.get(id);
    if (!wp) {
      throw new Error(
        `Reordering failed: ID "${id}" does not exist in plan "${plan.id}".`,
      );
    }
    reordered.push(wp);
  }

  return {
    ...plan,
    waypoints: reordered,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Move a waypoint up or down by a given index offset (delta).
 *
 * @param plan Target plan.
 * @param waypointId ID of the waypoint to shift.
 * @param delta Number of positions to shift (e.g. -1 for up, +1 for down).
 * @returns A fresh, immutable `WaypointPlan`.
 */
export function moveWaypoint(
  plan: WaypointPlan,
  waypointId: string,
  delta: number,
): WaypointPlan {
  const i = plan.waypoints.findIndex((w) => w.id === waypointId);
  if (i < 0) return plan;

  const nextIndex = i + delta;
  if (nextIndex < 0 || nextIndex >= plan.waypoints.length) return plan;

  const nextWaypoints = [...plan.waypoints];
  const [removed] = nextWaypoints.splice(i, 1);
  nextWaypoints.splice(nextIndex, 0, removed);

  return {
    ...plan,
    waypoints: nextWaypoints,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Set or designate the origin / base waypoint for the plan.
 *
 * If a `MarsWaypoint` object is provided, it is set at index 0 with role `"base"`.
 * If a string ID is provided, the existing waypoint is moved to index 0 and its role is updated to `"base"`.
 *
 * @param plan Target plan.
 * @param waypointOrId New waypoint or existing waypoint ID.
 * @returns A fresh, immutable `WaypointPlan`.
 */
export function setOrigin(
  plan: WaypointPlan,
  waypointOrId: MarsWaypoint | string,
): WaypointPlan {
  if (typeof waypointOrId === "string") {
    const existing = plan.waypoints.find((w) => w.id === waypointOrId);
    if (!existing) {
      throw new Error(
        `Cannot set origin: waypoint ID "${waypointOrId}" not found in plan.`,
      );
    }
    const filtered = plan.waypoints.filter((w) => w.id !== waypointOrId);
    const updatedBase: MarsWaypoint = { ...existing, role: "base" };
    return {
      ...plan,
      waypoints: [updatedBase, ...filtered],
      updated_at: new Date().toISOString(),
    };
  }

  const newBase: MarsWaypoint = {
    ...waypointSchema.parse(waypointOrId),
    role: "base",
  };
  const filtered = plan.waypoints.filter((w) => w.id !== newBase.id);
  return {
    ...plan,
    waypoints: [newBase, ...filtered],
    updated_at: new Date().toISOString(),
  };
}

/**
 * Set or designate the final destination or recovery endpoint for a one-way plan.
 *
 * @param plan Target plan.
 * @param waypointOrId Waypoint object, existing waypoint ID, or null to clear.
 * @returns A fresh, immutable `WaypointPlan`.
 */
export function setDestination(
  plan: WaypointPlan,
  waypointOrId: MarsWaypoint | string | null,
): WaypointPlan {
  if (waypointOrId === null) {
    // If the last waypoint has role destination or recovery_endpoint, revert to intermediate
    const nextWaypoints = plan.waypoints.map((w, idx) => {
      if (
        idx === plan.waypoints.length - 1 &&
        (w.role === "destination" || w.role === "recovery_endpoint")
      ) {
        return { ...w, role: "intermediate" as WaypointRole };
      }
      return w;
    });
    return {
      ...plan,
      waypoints: nextWaypoints,
      updated_at: new Date().toISOString(),
    };
  }

  if (typeof waypointOrId === "string") {
    const existing = plan.waypoints.find((w) => w.id === waypointOrId);
    if (!existing) {
      throw new Error(
        `Cannot set destination: waypoint ID "${waypointOrId}" not found in plan.`,
      );
    }
    const filtered = plan.waypoints.filter((w) => w.id !== waypointOrId);
    const updatedDest: MarsWaypoint = { ...existing, role: "destination" };
    return {
      ...plan,
      waypoints: [...filtered, updatedDest],
      updated_at: new Date().toISOString(),
    };
  }

  const newDest: MarsWaypoint = {
    ...waypointSchema.parse(waypointOrId),
    role: "destination",
  };
  const filtered = plan.waypoints.filter((w) => w.id !== newDest.id);
  return {
    ...plan,
    waypoints: [...filtered, newDest],
    updated_at: new Date().toISOString(),
  };
}

/**
 * Configure the plan's trajectory mode (round_trip or one_way).
 *
 * @param plan Target plan.
 * @param mode Desired trajectory mode.
 * @param recoveryAssumption Required recovery context when selecting one_way.
 * @returns A fresh, immutable `WaypointPlan`.
 */
export function setTrajectoryMode(
  plan: WaypointPlan,
  mode: TrajectoryMode,
  recoveryAssumption?: string,
): WaypointPlan {
  return {
    ...plan,
    mode,
    recovery_assumption:
      mode === "one_way"
        ? recoveryAssumption ?? plan.recovery_assumption ?? ""
        : plan.recovery_assumption,
    updated_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Plan Validation Functions
// ---------------------------------------------------------------------------

/**
 * Comprehensive, pure validation of a `WaypointPlan`.
 *
 * Checks sequence integrity, ID uniqueness, coordinate validity, and mode-specific
 * operational requirements without inventing default coordinates.
 *
 * @param plan Target plan to validate.
 * @returns Structured validation outcome with typed errors and warnings.
 */
export function validateWaypointPlan(plan: WaypointPlan): PlanValidationResult {
  const issues: PlanValidationIssue[] = [];

  // 1. Empty plan check
  if (!plan.waypoints.length) {
    issues.push({
      code: "EMPTY_PLAN",
      message: "The plan contains no waypoints. At least an origin base is required.",
      severity: "error",
    });
    return finalizeValidation(issues);
  }

  // 2. Duplicate waypoint IDs
  const seenIds = new Set<string>();
  for (const wp of plan.waypoints) {
    if (seenIds.has(wp.id)) {
      issues.push({
        code: "DUPLICATE_WAYPOINT_ID",
        message: `Duplicate waypoint ID detected: "${wp.id}". IDs must be strictly unique.`,
        waypoint_id: wp.id,
        severity: "error",
      });
    }
    seenIds.add(wp.id);
  }

  // 3. Coordinate validation
  for (const wp of plan.waypoints) {
    const lat = wp.coordinates.latitude;
    const lon = wp.coordinates.longitude_east;
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      issues.push({
        code: "INVALID_COORDINATES",
        message: `Waypoint "${wp.id}" has invalid latitude: ${lat}. Must be finite and in [-90, 90].`,
        waypoint_id: wp.id,
        severity: "error",
      });
    }
    if (!Number.isFinite(lon) || lon < 0 || lon >= 360) {
      issues.push({
        code: "INVALID_COORDINATES",
        message: `Waypoint "${wp.id}" has invalid east longitude: ${lon}. Must be finite and in [0, 360).`,
        waypoint_id: wp.id,
        severity: "error",
      });
    }
  }

  // 4. Origin role validation
  const firstWp = plan.waypoints[0];
  if (firstWp.role !== "base") {
    issues.push({
      code: "MISSING_ORIGIN",
      message: `The first waypoint ("${firstWp.id}") must have role "base" to define the excursion origin.`,
      waypoint_id: firstWp.id,
      severity: "warning",
    });
  }

  // 5. Trajectory mode specific requirements
  if (plan.mode === "one_way") {
    if (plan.waypoints.length < 2) {
      issues.push({
        code: "INSUFFICIENT_WAYPOINTS",
        message:
          "One-way planning requires at least 2 waypoints (an origin and a destination/recovery endpoint).",
        severity: "error",
      });
    }

    const lastWp = plan.waypoints[plan.waypoints.length - 1];
    if (
      lastWp.role !== "destination" &&
      lastWp.role !== "recovery_endpoint"
    ) {
      issues.push({
        code: "MISSING_DESTINATION",
        message: `One-way traverses require the final waypoint ("${lastWp.id}") to have role "destination" or "recovery_endpoint".`,
        waypoint_id: lastWp.id,
        severity: "error",
      });
    }

    if (!plan.recovery_assumption || !plan.recovery_assumption.trim()) {
      issues.push({
        code: "MISSING_RECOVERY_ASSUMPTION",
        message:
          "One-way planning requires an explicit documented recovery assumption (e.g. pressurized rover rendezvous, ascent vehicle ingress).",
        severity: "error",
      });
    }
  } else if (plan.mode === "round_trip") {
    if (plan.waypoints.length < 2) {
      issues.push({
        code: "INSUFFICIENT_WAYPOINTS",
        message:
          "Round-trip planning requires at least 2 waypoints to form an excursion beyond the base.",
        severity: "warning",
      });
    }
  }

  // 6. Geometry warnings: consecutive identical waypoints
  for (let i = 1; i < plan.waypoints.length; i++) {
    const prev = plan.waypoints[i - 1];
    const curr = plan.waypoints[i];
    if (
      prev.coordinates.latitude === curr.coordinates.latitude &&
      prev.coordinates.longitude_east === curr.coordinates.longitude_east
    ) {
      issues.push({
        code: "COINCIDENT_CONSECUTIVE_WAYPOINTS",
        message: `Consecutive waypoints "${prev.id}" and "${curr.id}" share identical coordinates. Segment distance will be 0 m.`,
        waypoint_id: curr.id,
        severity: "warning",
      });
    }
  }

  return finalizeValidation(issues);
}

function finalizeValidation(
  issues: PlanValidationIssue[],
): PlanValidationResult {
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  return {
    valid: errors.length === 0,
    issues,
    errors,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Trajectory Generation & Distance Calculations
// ---------------------------------------------------------------------------

/**
 * Generate an ordered, deterministic geometric trajectory from a waypoint plan.
 *
 * Evaluates great-circle surface distances and forward initial bearings between
 * consecutive waypoints using M1 spherical geodesy.
 *
 * For `round_trip` missions with 2 or more waypoints, automatically synthesizes
 * the return leg connecting the final waypoint back to the origin base.
 *
 * @param plan Target plan.
 * @returns Generated `ProposedGeometricTrajectory`.
 */
export function generateGeometricTrajectory(
  plan: WaypointPlan,
): ProposedGeometricTrajectory {
  const waypoints = plan.waypoints;

  if (waypoints.length === 0) {
    return {
      mode: plan.mode,
      ordered_waypoint_ids: [],
      trajectory_waypoints: [],
      segments: [],
      total_surface_distance_m: 0,
      scientific_label: GEOMETRIC_TRAJECTORY_LABEL,
    };
  }

  if (waypoints.length === 1) {
    return {
      mode: plan.mode,
      ordered_waypoint_ids: [waypoints[0].id],
      trajectory_waypoints: [waypoints[0]],
      segments: [],
      total_surface_distance_m: 0,
      scientific_label: GEOMETRIC_TRAJECTORY_LABEL,
    };
  }

  const segments: TrajectorySegment[] = [];
  const trajectoryWaypoints: MarsWaypoint[] = [...waypoints];
  let segmentIndex = 0;

  // 1. Build outbound segments
  for (let i = 1; i < waypoints.length; i++) {
    const fromWp = waypoints[i - 1];
    const toWp = waypoints[i];
    const dist = marsDistance(fromWp.coordinates, toWp.coordinates);
    const bearing = marsInitialBearing(fromWp.coordinates, toWp.coordinates);

    segments.push({
      segment_index: segmentIndex++,
      from_waypoint_id: fromWp.id,
      to_waypoint_id: toWp.id,
      from_coordinates: fromWp.coordinates,
      to_coordinates: toWp.coordinates,
      surface_distance_m: dist,
      initial_bearing_deg: bearing,
      is_return_segment: false,
    });
  }

  // 2. Build return segment if mode is round_trip
  if (plan.mode === "round_trip" && waypoints.length >= 2) {
    const finalWp = waypoints[waypoints.length - 1];
    const baseWp = waypoints[0];
    const returnDist = marsDistance(finalWp.coordinates, baseWp.coordinates);
    const returnBearing = marsInitialBearing(
      finalWp.coordinates,
      baseWp.coordinates,
    );

    segments.push({
      segment_index: segmentIndex++,
      from_waypoint_id: finalWp.id,
      to_waypoint_id: baseWp.id,
      from_coordinates: finalWp.coordinates,
      to_coordinates: baseWp.coordinates,
      surface_distance_m: returnDist,
      initial_bearing_deg: returnBearing,
      is_return_segment: true,
    });

    // Explicitly record return to base in visited waypoint sequence
    trajectoryWaypoints.push(baseWp);
  }

  // Exact summation of segment lengths
  const totalDist = segments.reduce((sum, s) => sum + s.surface_distance_m, 0);

  return {
    mode: plan.mode,
    ordered_waypoint_ids: trajectoryWaypoints.map((w) => w.id),
    trajectory_waypoints: trajectoryWaypoints,
    segments,
    total_surface_distance_m: totalDist,
    scientific_label: GEOMETRIC_TRAJECTORY_LABEL,
  };
}

/**
 * Produce a deterministic distance summary from a plan or precomputed trajectory.
 *
 * Distinguishes outbound distance from return leg distance and confirms
 * mathematical additive identity (`total === outbound + return`).
 *
 * @param planOrTrajectory Waypoint plan or generated trajectory.
 * @returns `GeometricDistanceSummary`.
 */
export function calculateDistanceSummary(
  planOrTrajectory: WaypointPlan | ProposedGeometricTrajectory,
): GeometricDistanceSummary {
  const trajectory: ProposedGeometricTrajectory =
    "segments" in planOrTrajectory
      ? planOrTrajectory
      : generateGeometricTrajectory(planOrTrajectory);

  let outbound = 0;
  let returnDist = 0;

  for (const seg of trajectory.segments) {
    if (seg.is_return_segment) {
      returnDist += seg.surface_distance_m;
    } else {
      outbound += seg.surface_distance_m;
    }
  }

  const total = outbound + returnDist;

  return {
    outbound_distance_m: outbound,
    return_distance_m: returnDist,
    total_surface_distance_m: total,
    segment_count: trajectory.segments.length,
    waypoint_count: trajectory.trajectory_waypoints.length,
    is_closed_loop:
      trajectory.mode === "round_trip" && trajectory.segments.length > 0,
  };
}

/**
 * Resample a geometric trajectory into equidistant great-circle points.
 *
 * Connects each segment using M1 Slerp interpolation.
 *
 * @param trajectory Proposed trajectory.
 * @param stepMetres Sampling distance step along great-circle arc in metres.
 * @returns Array of resampled `MarsCoordinate` points.
 * @throws {RangeError} if stepMetres is <= 0 or non-finite.
 */
export function resampleTrajectory(
  trajectory: ProposedGeometricTrajectory,
  stepMetres: number,
): MarsCoordinate[] {
  if (trajectory.trajectory_waypoints.length < 2) {
    return trajectory.trajectory_waypoints.map((w) => ({
      latitude: w.coordinates.latitude,
      longitude_east: w.coordinates.longitude_east,
    }));
  }

  const coords = trajectory.trajectory_waypoints.map((w) => w.coordinates);
  return marsResamplePath(coords, stepMetres);
}

// ---------------------------------------------------------------------------
// Serialization & Deserialization
// ---------------------------------------------------------------------------

/**
 * Serialize a `WaypointPlan` to a formatted JSON string.
 */
export function serializeWaypointPlan(plan: WaypointPlan): string {
  const parsed = waypointPlanSchema.parse(plan);
  return JSON.stringify(parsed, null, 2);
}

/**
 * Parse and validate a `WaypointPlan` from raw JSON.
 *
 * @throws {Error} if JSON is malformed or schema validation fails.
 */
export function deserializeWaypointPlan(jsonString: string): WaypointPlan {
  const raw = JSON.parse(jsonString);
  return waypointPlanSchema.parse(raw);
}
