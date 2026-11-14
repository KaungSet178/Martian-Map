/**
 * Terrain routing grid representation for Jezero Crater.
 *
 * Encapsulates authentic numeric elevation and slope rasters, geographic
 * coordinate conversions, nodata boundaries, and bounded snapping.
 */

import {
  lonLatToEquirectangularMeters,
  equirectangularMetersToLonLat,
} from "./geo";
import type { RoutingGridMetadata } from "./types";

const DEG_TO_RAD = Math.PI / 180.0;

export interface SerializedGridData {
  metadata: RoutingGridMetadata;
  // Elevation in meters as float32 array or number array (row-major)
  elevations: number[];
  // Slope in degrees as float32 array or number array (row-major)
  slopes: number[];
  // Valid flag mask: 1 for valid traversable terrain, 0 for nodata/invalid
  validMask?: number[];
}

export class TerrainGrid {
  readonly metadata: RoutingGridMetadata;
  readonly width: number;
  readonly height: number;
  readonly elevations: Float32Array;
  readonly slopes: Float32Array;
  readonly validMask: Uint8Array;
  readonly originEasting: number;
  readonly originNorthing: number;
  readonly pixelSpacingMeters: number;
  readonly cosLatRef: number;

  constructor(data: SerializedGridData) {
    this.metadata = data.metadata;
    this.width = data.metadata.width;
    this.height = data.metadata.height;
    this.pixelSpacingMeters = data.metadata.gridSpacingMeters;

    const totalCells = this.width * this.height;
    this.elevations = new Float32Array(totalCells);
    this.slopes = new Float32Array(totalCells);
    this.validMask = new Uint8Array(totalCells);

    // Grid origin: Upper-Left (North-West) corner in equirectangular projection
    const [ulEast, ulNorth] = lonLatToEquirectangularMeters(
      data.metadata.bounds.west,
      data.metadata.bounds.north
    );
    this.originEasting = ulEast;
    this.originNorthing = ulNorth;

    const centerLat =
      (data.metadata.bounds.north + data.metadata.bounds.south) / 2.0;
    this.cosLatRef = Math.cos(centerLat * DEG_TO_RAD);

    const nodata = data.metadata.nodataValue;

    for (let i = 0; i < totalCells; i++) {
      const elev = data.elevations[i];
      const slope = data.slopes[i];

      const isElevValid =
        Number.isFinite(elev) &&
        elev !== nodata &&
        Math.abs(elev - nodata) > 1e-4 &&
        elev >= -4000 &&
        elev <= 10000;

      const isSlopeValid =
        Number.isFinite(slope) &&
        slope !== nodata &&
        slope >= 0.0 &&
        slope <= 90.0;

      const explicitValid =
        data.validMask && data.validMask.length === totalCells
          ? data.validMask[i] === 1
          : true;

      if (isElevValid && isSlopeValid && explicitValid) {
        this.elevations[i] = elev;
        this.slopes[i] = slope;
        this.validMask[i] = 1;
      } else {
        this.elevations[i] = nodata;
        this.slopes[i] = nodata;
        this.validMask[i] = 0;
      }
    }
  }

  getIndex(col: number, row: number): number {
    return row * this.width + col;
  }

  isInside(col: number, row: number): boolean {
    return col >= 0 && col < this.width && row >= 0 && row < this.height;
  }

  isValid(col: number, row: number): boolean {
    if (!this.isInside(col, row)) return false;
    return this.validMask[this.getIndex(col, row)] === 1;
  }

  getElevation(col: number, row: number): number | null {
    if (!this.isValid(col, row)) return null;
    return this.elevations[this.getIndex(col, row)];
  }

  getSlope(col: number, row: number): number | null {
    if (!this.isValid(col, row)) return null;
    return this.slopes[this.getIndex(col, row)];
  }

  /**
   * Convert geographic coordinate [lon, lat] into floating grid cell coordinates [col, row].
   */
  coordToGridFloat(lon: number, lat: number): [number, number] {
    const [easting, northing] = lonLatToEquirectangularMeters(lon, lat);

    // Upper-left corner is origin; easting increases with col, northing decreases with row
    const col =
      (easting - this.originEasting) /
      (this.pixelSpacingMeters * this.cosLatRef);
    const row =
      (this.originNorthing - northing) / this.pixelSpacingMeters;

    return [col, row];
  }

  /**
   * Convert geographic coordinate [lon, lat] into integer grid cell [col, row].
   */
  coordToCell(lon: number, lat: number): [number, number] {
    const [colF, rowF] = this.coordToGridFloat(lon, lat);
    return [Math.round(colF), Math.round(rowF)];
  }

  /**
   * Convert grid cell [col, row] into geographic coordinate [lon, lat] (cell center).
   */
  cellToCoord(col: number, row: number): [number, number] {
    const easting =
      this.originEasting +
      (col + 0.5) * this.pixelSpacingMeters * this.cosLatRef;
    const northing =
      this.originNorthing - (row + 0.5) * this.pixelSpacingMeters;

    return equirectangularMetersToLonLat(easting, northing);
  }

  /**
   * Calculate ground distance between two grid cells in meters.
   */
  distanceBetweenCells(
    colA: number,
    rowA: number,
    colB: number,
    rowB: number
  ): number {
    const dCol = colB - colA;
    const dRow = rowB - rowA;
    const dxMeters = dCol * this.pixelSpacingMeters * this.cosLatRef;
    const dyMeters = dRow * this.pixelSpacingMeters;
    return Math.hypot(dxMeters, dyMeters);
  }

  /**
   * Snap an input cell to the nearest valid, traversable cell within a maximum search radius.
   * Uses breadth-first search / concentric ring expansion.
   * Returns [snappedCol, snappedRow, distanceMeters] or null if no valid cell within radius.
   */
  snapToNearestValidCell(
    requestedCol: number,
    requestedRow: number,
    maxDistanceMeters: number
  ): [number, number, number] | null {
    if (this.isValid(requestedCol, requestedRow)) {
      return [requestedCol, requestedRow, 0.0];
    }

    const maxRadiusCells = Math.ceil(
      maxDistanceMeters / (this.pixelSpacingMeters * Math.min(this.cosLatRef, 1.0))
    );

    let bestCell: [number, number] | null = null;
    let minDistance = Infinity;

    for (let r = 1; r <= maxRadiusCells; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue; // check perimeter of current ring

          const c = requestedCol + dx;
          const row = requestedRow + dy;

          if (this.isValid(c, row)) {
            const dist = this.distanceBetweenCells(
              requestedCol,
              requestedRow,
              c,
              row
            );
            if (dist <= maxDistanceMeters && dist < minDistance) {
              minDistance = dist;
              bestCell = [c, row];
            }
          }
        }
      }
      // If we found a valid candidate in this ring, verify no closer cell in this ring
      if (bestCell !== null) {
        return [bestCell[0], bestCell[1], minDistance];
      }
    }

    return null;
  }
}
