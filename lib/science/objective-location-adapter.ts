import { z } from "zod";
import type { Target } from "@/lib/contracts/science";
import { objectiveLocationEvidence, legacyObjectiveDecisions } from "@/regions/location-evidence";

const geographicEvidenceSchema = z.object({
  registration_verified: z.boolean().nullable(),
  positional_uncertainty_m: z.number().nonnegative().nullable(),
});
const reviewedIds = new Set<string>([
  ...Object.keys(legacyObjectiveDecisions),
  ...[1,2,3,4,5].map(n => `jezero-objective-${n}`),
  ...[1,2,3,4].map(n => `oxia-objective-${n}`),
]);
/** Maps only reviewed objective geography, never the associated Three Forks site.
 * Missing source/processing verification stays unknown in F1's evidence mapper.
 */
export function objectiveGeographicEvidence(target: Target) {
  if (!reviewedIds.has(target.id) || !target.id.startsWith(`${target.region_id}-`))
    return geographicEvidenceSchema.parse({ registration_verified: null, positional_uncertainty_m: null });
  const evidence = objectiveLocationEvidence(target.region_id, target.id);
  return geographicEvidenceSchema.parse({
    registration_verified: evidence.registration_verified,
    positional_uncertainty_m: evidence.positional_uncertainty_m,
  });
}
