import type { FeatureCollection } from "geojson";

// Unitless schematic UI geometry, explicitly unrelated to a Mars CRS.
export const previewCamera = {
  center: [0, 0] as [number, number],
  zoom: 7.3,
  bearing: 0,
};
export const previewPositions: [number, number][] = [
  [-0.5, -0.05],
  [0.12, 0.65],
  [0.5, 0.1],
];
export function schematicContours(): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: Array.from({ length: 35 }, (_, row) => ({
      type: "Feature",
      properties: { major: row % 5 === 0 },
      geometry: {
        type: "LineString",
        coordinates: Array.from({ length: 90 }, (_, col) => {
          const x = (col - 45) * 0.065;
          return [
            x,
            (row - 17) * 0.15 +
              Math.sin(x * 2.3 + row * 0.16) * 0.16 +
              Math.cos(x * 1.1) * 0.3,
          ];
        }),
      },
    })),
  };
}
