/**
 * Authentic terrain cost functions for Jezero Crater pathfinding.
 *
 * Implements two distinct objective functions:
 * 1. "shortest": Minimizes actual physical ground distance across valid DEM cells.
 * 2. "lower-terrain-cost": Minimizes an algorithmic cost function penalizing steep
 *    slopes and elevation gain/loss.
 *
 * SCIENTIFIC SAFEGUARDS:
 * - Cost functions are algorithmic traversal preferences, NOT certified astronaut safety thresholds.
 * - Routes with lower cost must NEVER be labeled "safe" or "astronaut-approved".
 * - Nodata cells and cells exceeding maxTraversableSlopeDegrees are strictly impassable.
 */

import type { CostModelParameters, RoutePreference } from "./types";
import type { TerrainGrid } from "./grid";

export const DEFAULT_MAX_TRAVERSABLE_SLOPE_DEGREES = 25.0;

export const SHORTEST_DISTANCE_PARAMETERS: CostModelParameters = {
  preference: "shortest",
  maxTraversableSlopeDegrees: DEFAULT_MAX_TRAVERSABLE_SLOPE_DEGREES,
  baseDistanceWeight: 1.0,
  slopePenaltyFactor: 0.0,
  slopeReferenceDegrees: 10.0,
  ascentPenaltyFactor: 0.0,
  descentPenaltyFactor: 0.0,
  formula: "cost = step_distance_meters",
  description:
    "Minimizes authentic physical ground distance across valid DEM cells, bounded by maximum slope threshold.",
};

export const LOWER_TERRAIN_COST_PARAMETERS: CostModelParameters = {
  preference: "lower-terrain-cost",
  maxTraversableSlopeDegrees: DEFAULT_MAX_TRAVERSABLE_SLOPE_DEGREES,
  baseDistanceWeight: 1.0,
  slopePenaltyFactor: 2.0,
  slopeReferenceDegrees: 10.0,
  ascentPenaltyFactor: 3.0,
  descentPenaltyFactor: 1.0,
  formula:
    "cost = step_distance_m * (1.0 + 2.0 * (slope / 10.0)^2 + 3.0 * max(0, dz/d) + 1.0 * max(0, -dz/d))",
  description:
    "Algorithmic preference penalizing quadratic slope steepness and net ascent/descent. Not a NASA-certified EVA safety standard.",
};

export class TerrainCostModel {
  readonly params: CostModelParameters;

  constructor(
    preference: RoutePreference = "shortest",
    overrides?: Partial<CostModelParameters>
  ) {
    const base =
      preference === "lower-terrain-cost"
        ? LOWER_TERRAIN_COST_PARAMETERS
        : SHORTEST_DISTANCE_PARAMETERS;

    this.params = { ...base, ...overrides, preference };
  }

  /**
   * Calculate edge traversal cost from cell u to cell v on the terrain grid.
   * Returns Infinity if the transition is impassable (nodata, out of bounds, or excessive slope).
   */
  calculateEdgeCost(
    grid: TerrainGrid,
    colU: number,
    rowU: number,
    colV: number,
    rowV: number
  ): number {
    // Both cells must be valid, non-nodata cells
    if (!grid.isValid(colU, rowU) || !grid.isValid(colV, rowV)) {
      return Infinity;
    }

    const slopeV = grid.getSlope(colV, rowV);
    if (slopeV === null || slopeV > this.params.maxTraversableSlopeDegrees) {
      return Infinity;
    }

    const elevU = grid.getElevation(colU, rowU);
    const elevV = grid.getElevation(colV, rowV);
    if (elevU === null || elevV === null) {
      return Infinity;
    }

    const distMeters = grid.distanceBetweenCells(colU, rowU, colV, rowV);
    if (distMeters <= 0.0) {
      return 0.0;
    }

    if (this.params.preference === "shortest") {
      return distMeters;
    }

    // Lower-terrain-cost mode:
    const deltaZ = elevV - elevU;
    const gradient = deltaZ / distMeters;
    const slopeNorm = slopeV / this.params.slopeReferenceDegrees;
    const slopeTerm = this.params.slopePenaltyFactor * (slopeNorm * slopeNorm);

    const ascentTerm =
      gradient > 0 ? this.params.ascentPenaltyFactor * gradient : 0.0;
    const descentTerm =
      gradient < 0 ? this.params.descentPenaltyFactor * -gradient : 0.0;

    const multiplier =
      this.params.baseDistanceWeight + slopeTerm + ascentTerm + descentTerm;

    return distMeters * Math.max(1.0, multiplier);
  }
}
