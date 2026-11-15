import { z } from "zod";
const physical = z.number().finite().nonnegative().max(1e9).nullable().optional();
const margin = z.number().finite().min(0).max(100).optional();
/** Inputs only. Null is an explicit unknown override, never a request for a default. */
export const evaConfigSchema = z.object({
  profileId: z.enum(["legacy", "bvad-reference", "apollo-historical", "custom"]),
  coolingArchitecture: z.enum(["venting", "non-venting", "unknown"]).optional(),
  metabolicKgPerHour: physical, leakageKgPerHour: physical,
  electricalWatts: physical, coolingKgPerHour: physical,
  oxygenCapacityKg: physical, batteryCapacityWh: physical, waterCapacityKg: physical,
  oxygenMarginPercent: margin, batteryMarginPercent: margin, waterMarginPercent: margin,
  delaySeconds: physical, emergencySeconds: physical,
});
export type EVAConfig = z.infer<typeof evaConfigSchema>;
