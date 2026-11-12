import { z } from "zod";
export const regionIdSchema = z.enum(["jezero", "gale", "oxia"]);
export type RegionId = z.infer<typeof regionIdSchema>;
export const evidenceSchema = z.enum([
  "Observed",
  "Derived",
  "Interpreted",
  "Modeled",
  "Scenario",
  "Unavailable",
]);
export type Evidence = z.infer<typeof evidenceSchema>;
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude_east: z.number().min(0).lt(360),
});
export type MarsGeographicCoordinates = z.infer<typeof coordinatesSchema>;
export const coordinateReferenceSchema = z.object({
  body: z.literal("Mars"),
  latitude_type: z.literal("planetocentric"),
  longitude_direction: z.literal("east"),
  longitude_range: z.literal("0-360"),
});
export const projectedCoordinatesSchema = z.object({
  body: z.literal("Mars"),
  crs: z.string().min(1),
  easting_m: z.number(),
  northing_m: z.number(),
});
export type MarsProjectedCoordinates = z.infer<
  typeof projectedCoordinatesSchema
>;
export const availabilitySchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("unavailable"), reason: z.string().min(1) }),
  z.object({ status: z.literal("available"), reason: z.string().min(1) }),
]);
export const geographicExtentSchema = z
  .object({
    west_east: z.number().min(0).lt(360),
    east_east: z.number().min(0).lt(360),
    south_latitude: z.number().min(-85).max(85),
    north_latitude: z.number().min(-85).max(85),
  })
  .refine(
    (b) => b.south_latitude < b.north_latitude,
    "Extent latitude bounds must be ordered",
  );
export const assetUrlSchema = z
  .string()
  .refine(
    (url) => /^https:\/\//.test(url) || /^\/(?!\/)/.test(url),
    "Use an HTTPS URL or same-origin absolute asset path",
  );
