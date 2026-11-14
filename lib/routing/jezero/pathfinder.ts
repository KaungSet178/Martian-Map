/**
 * Authentic graph-search pathfinder for Jezero Crater terrain routing.
 *
 * Implements A* and Dijkstra algorithms on an 8-connected grid with:
 * - Admissible Euclidean heuristic
 * - Deterministic tie-breaking
 * - Strict nodata and slope barriers
 * - Accurate 3D distance, ascent, descent, and slope metrics
 */

import type { TerrainGrid } from "./grid";
import type { TerrainCostModel } from "./cost";
import type { RouteStatus } from "./types";

export type PathNode = {
  col: number;
  row: number;
};

export type PathSearchResult = {
  status: RouteStatus;
  cells: PathNode[];
  coordinates: [number, number][]; // [lon, lat]
  distanceMeters: number;
  ascentMeters: number;
  descentMeters: number;
  maximumSlopeDegrees: number;
  meanSlopeDegrees: number;
  totalCost: number;
  expandedCount: number;
  failureReason?: string;
};

// 8-connected neighbor offsets: (dx, dy)
const NEIGHBORS_8: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

class PriorityQueue {
  private nodes: number[] = []; // cell indices
  private priorities: number[] = []; // f-scores
  private gScores: number[] = []; // g-scores for tie-breaking

  push(cellIdx: number, priority: number, gScore: number): void {
    this.nodes.push(cellIdx);
    this.priorities.push(priority);
    this.gScores.push(gScore);
    this.bubbleUp(this.nodes.length - 1);
  }

  pop(): number | undefined {
    if (this.nodes.length === 0) return undefined;
    const top = this.nodes[0];
    const bottom = this.nodes.pop()!;
    const bottomPriority = this.priorities.pop()!;
    const bottomG = this.gScores.pop()!;

    if (this.nodes.length > 0) {
      this.nodes[0] = bottom;
      this.priorities[0] = bottomPriority;
      this.gScores[0] = bottomG;
      this.sinkDown(0);
    }
    return top;
  }

  get size(): number {
    return this.nodes.length;
  }

  private bubbleUp(index: number): void {
    const node = this.nodes[index];
    const priority = this.priorities[index];
    const gScore = this.gScores[index];

    while (index > 0) {
      const parentIdx = (index - 1) >> 1;
      const parentP = this.priorities[parentIdx];
      const parentG = this.gScores[parentIdx];

      // Primary: smaller f-score. Tie-break: higher g-score, then smaller cell index for determinism.
      if (
        priority < parentP ||
        (priority === parentP && gScore > parentG) ||
        (priority === parentP && gScore === parentG && node < this.nodes[parentIdx])
      ) {
        this.nodes[index] = this.nodes[parentIdx];
        this.priorities[index] = parentP;
        this.gScores[index] = parentG;
        index = parentIdx;
      } else {
        break;
      }
    }
    this.nodes[index] = node;
    this.priorities[index] = priority;
    this.gScores[index] = gScore;
  }

  private sinkDown(index: number): void {
    const length = this.nodes.length;
    const node = this.nodes[index];
    const priority = this.priorities[index];
    const gScore = this.gScores[index];

    while (true) {
      let swap: number | null = null;
      const leftChildIdx = (index << 1) + 1;
      const rightChildIdx = leftChildIdx + 1;

      if (leftChildIdx < length) {
        const leftP = this.priorities[leftChildIdx];
        const leftG = this.gScores[leftChildIdx];
        if (
          leftP < priority ||
          (leftP === priority && leftG > gScore) ||
          (leftP === priority && leftG === gScore && this.nodes[leftChildIdx] < node)
        ) {
          swap = leftChildIdx;
        }
      }

      if (rightChildIdx < length) {
        const rightP = this.priorities[rightChildIdx];
        const rightG = this.gScores[rightChildIdx];
        const compareTargetP = swap === null ? priority : this.priorities[swap];
        const compareTargetG = swap === null ? gScore : this.gScores[swap];
        const compareTargetNode = swap === null ? node : this.nodes[swap];

        if (
          rightP < compareTargetP ||
          (rightP === compareTargetP && rightG > compareTargetG) ||
          (rightP === compareTargetP &&
            rightG === compareTargetG &&
            this.nodes[rightChildIdx] < compareTargetNode)
        ) {
          swap = rightChildIdx;
        }
      }

      if (swap === null) break;

      this.nodes[index] = this.nodes[swap];
      this.priorities[index] = this.priorities[swap];
      this.gScores[index] = this.gScores[swap];
      index = swap;
    }

    this.nodes[index] = node;
    this.priorities[index] = priority;
    this.gScores[index] = gScore;
  }
}

export function searchPathAStar(
  grid: TerrainGrid,
  costModel: TerrainCostModel,
  startCol: number,
  startRow: number,
  goalCol: number,
  goalRow: number,
  useAStarHeuristic: boolean = true
): PathSearchResult {
  // Safeguard: start and goal must be valid
  if (!grid.isValid(startCol, startRow)) {
    return {
      status: "unavailable",
      cells: [],
      coordinates: [],
      distanceMeters: 0,
      ascentMeters: 0,
      descentMeters: 0,
      maximumSlopeDegrees: 0,
      meanSlopeDegrees: 0,
      totalCost: Infinity,
      expandedCount: 0,
      failureReason: `Start node (${startCol}, ${startRow}) is outside valid DEM coverage or exceeds maximum slope.`,
    };
  }

  if (!grid.isValid(goalCol, goalRow)) {
    return {
      status: "unavailable",
      cells: [],
      coordinates: [],
      distanceMeters: 0,
      ascentMeters: 0,
      descentMeters: 0,
      maximumSlopeDegrees: 0,
      meanSlopeDegrees: 0,
      totalCost: Infinity,
      expandedCount: 0,
      failureReason: `Goal node (${goalCol}, ${goalRow}) is outside valid DEM coverage or exceeds maximum slope.`,
    };
  }

  const startIdx = grid.getIndex(startCol, startRow);
  const goalIdx = grid.getIndex(goalCol, goalRow);

  if (startIdx === goalIdx) {
    const slope = grid.getSlope(startCol, startRow) ?? 0;
    const [lon, lat] = grid.cellToCoord(startCol, startRow);
    return {
      status: "computed",
      cells: [{ col: startCol, row: startRow }],
      coordinates: [[lon, lat]],
      distanceMeters: 0,
      ascentMeters: 0,
      descentMeters: 0,
      maximumSlopeDegrees: slope,
      meanSlopeDegrees: slope,
      totalCost: 0,
      expandedCount: 1,
    };
  }

  const totalCells = grid.width * grid.height;
  const gScores = new Float64Array(totalCells).fill(Infinity);
  const cameFrom = new Int32Array(totalCells).fill(-1);
  const closedSet = new Uint8Array(totalCells);

  const pq = new PriorityQueue();

  const heuristic = (c: number, r: number): number => {
    if (!useAStarHeuristic) return 0.0;
    return grid.distanceBetweenCells(c, r, goalCol, goalRow);
  };

  gScores[startIdx] = 0.0;
  pq.push(startIdx, heuristic(startCol, startRow), 0.0);

  let expandedCount = 0;
  let reached = false;

  while (pq.size > 0) {
    const currentIdx = pq.pop()!;
    if (closedSet[currentIdx] === 1) continue;
    closedSet[currentIdx] = 1;
    expandedCount++;

    if (currentIdx === goalIdx) {
      reached = true;
      break;
    }

    const currentG = gScores[currentIdx];
    const currentCol = currentIdx % grid.width;
    const currentRow = Math.floor(currentIdx / grid.width);

    for (const [dx, dy] of NEIGHBORS_8) {
      const nextCol = currentCol + dx;
      const nextRow = currentRow + dy;

      if (!grid.isValid(nextCol, nextRow)) continue;

      const nextIdx = grid.getIndex(nextCol, nextRow);
      if (closedSet[nextIdx] === 1) continue;

      const edgeCost = costModel.calculateEdgeCost(
        grid,
        currentCol,
        currentRow,
        nextCol,
        nextRow
      );

      if (!Number.isFinite(edgeCost)) continue;

      const tentativeG = currentG + edgeCost;
      if (tentativeG < gScores[nextIdx]) {
        gScores[nextIdx] = tentativeG;
        cameFrom[nextIdx] = currentIdx;
        const fScore = tentativeG + heuristic(nextCol, nextRow);
        pq.push(nextIdx, fScore, tentativeG);
      }
    }
  }

  if (!reached) {
    return {
      status: "unavailable",
      cells: [],
      coordinates: [],
      distanceMeters: 0,
      ascentMeters: 0,
      descentMeters: 0,
      maximumSlopeDegrees: 0,
      meanSlopeDegrees: 0,
      totalCost: Infinity,
      expandedCount,
      failureReason:
        "No traversable path exists through valid DEM terrain without exceeding slope/nodata barriers.",
    };
  }

  // Reconstruct path
  const pathIndices: number[] = [];
  let curr = goalIdx;
  while (curr !== -1) {
    pathIndices.push(curr);
    curr = cameFrom[curr];
  }
  pathIndices.reverse();

  const cells: PathNode[] = [];
  const coordinates: [number, number][] = [];
  let totalDistanceMeters = 0.0;
  let totalAscentMeters = 0.0;
  let totalDescentMeters = 0.0;
  let maxSlopeDegrees = 0.0;
  let sumSlopeDegrees = 0.0;

  for (let i = 0; i < pathIndices.length; i++) {
    const idx = pathIndices[i];
    const c = idx % grid.width;
    const r = Math.floor(idx / grid.width);
    cells.push({ col: c, row: r });
    coordinates.push(grid.cellToCoord(c, r));

    const slope = grid.getSlope(c, r) ?? 0.0;
    if (slope > maxSlopeDegrees) maxSlopeDegrees = slope;
    sumSlopeDegrees += slope;

    if (i > 0) {
      const prevIdx = pathIndices[i - 1];
      const prevC = prevIdx % grid.width;
      const prevR = Math.floor(prevIdx / grid.width);

      const dHoriz = grid.distanceBetweenCells(prevC, prevR, c, r);
      const prevElev = grid.getElevation(prevC, prevR) ?? 0.0;
      const currElev = grid.getElevation(c, r) ?? 0.0;
      const dz = currElev - prevElev;

      // 3D physical surface distance
      const d3D = Math.hypot(dHoriz, dz);
      totalDistanceMeters += d3D;

      if (dz > 0) {
        totalAscentMeters += dz;
      } else {
        totalDescentMeters += -dz;
      }
    }
  }

  const meanSlopeDegrees =
    pathIndices.length > 0 ? sumSlopeDegrees / pathIndices.length : 0.0;

  return {
    status: "computed",
    cells,
    coordinates,
    distanceMeters: totalDistanceMeters,
    ascentMeters: totalAscentMeters,
    descentMeters: totalDescentMeters,
    maximumSlopeDegrees: maxSlopeDegrees,
    meanSlopeDegrees,
    totalCost: gScores[goalIdx],
    expandedCount,
  };
}
