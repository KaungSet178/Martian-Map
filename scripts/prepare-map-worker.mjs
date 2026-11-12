import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

// Serve the pinned MapLibre ESM worker from our origin. Bundler rewriting of
// import.meta.url otherwise points it at a Next chunk instead of its module.
await mkdir(resolve("public/generated"), { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  await copyFile(
    resolve("node_modules/maplibre-gl/dist", file),
    resolve("public/generated", file),
  );
}
