import type { RegionManifest } from "@/lib/contracts/region";
import type { Mission } from "@/lib/mission/model";
import { missionIssues } from "@/lib/mission/model";

// No service exists in this repository. Fail closed rather than synthesize paths.
// Wire a runtime-validated FastAPI response here when its versioned contract is ready.
export function routeAvailability(
  mission: Mission,
  region: RegionManifest,
  online: boolean,
) {
  return {
    status: "unavailable" as const,
    reasons: [
      ...missionIssues(mission, region),
      ...(online ? [] : ["New route calculations are unavailable offline."]),
      "The shared planning service is not connected.",
    ],
    objectives: [
      {
        id: "safest",
        name: "Safest",
        requirement: "Audited hazards and reviewed risk thresholds",
      },
      {
        id: "fastest",
        name: "Fastest",
        requirement: "A supported mobility and travel-time model",
      },
      {
        id: "science",
        name: "Science-focused",
        requirement: "Source-backed target priorities and constraints",
      },
    ],
  };
}
