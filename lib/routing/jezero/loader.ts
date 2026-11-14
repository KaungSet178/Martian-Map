/**
 * Loader for the authentic Jezero Crater routing cost grid.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TerrainGrid, type SerializedGridData } from "./grid";

let cachedGrid: TerrainGrid | null = null;

export function loadJezeroRoutingGrid(customPath?: string): TerrainGrid {
  if (cachedGrid && !customPath) {
    return cachedGrid;
  }
  const filePath =
    customPath ||
    join(process.cwd(), "data/routing/jezero/jezero_routing_grid.json");

  const raw = readFileSync(filePath, "utf-8");
  const data: SerializedGridData = JSON.parse(raw);
  const grid = new TerrainGrid(data);

  if (!customPath) {
    cachedGrid = grid;
  }
  return grid;
}
