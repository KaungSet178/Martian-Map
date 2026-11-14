# F3 integration boundary for F1 / I4

F3 starts at I3A `26adc4c2e72c4febc2500de2eb11f8f30ef85ccd`. No F1 mission, persistence, export, endpoint, review, planner, or map-renderer implementation is changed.

## Minimal integration proposal (not applied by F3)

1. In `lib/mission/waypoint-bridge.ts`, `createWaypointFromTarget` callers and `lib/routing/server.ts::validateTerrainRequest`, treat source-coordinate verification separately from `target.routing_eligibility.status`. Before science-target routing, require explicit available eligibility in addition to reviewed source coordinates. Geometric stop creation may use a separate explicit user action, with source precision and interpretation retained. Do not label interpreted orbital detections as directly observed NASA outcrops.
2. Carry source classification, registration status, uncertainty and manual provenance through itinerary, review, Save/Open and brief. F3 does not change their schemas or implementation.
3. `jezero-objective-3` remains the mission-level sample-caching goal with null coordinates. `jezero-three-forks-landing-circle` is separate science evidence, not an active mission target ID. Never alias it to the mission objective or automatically insert it as a waypoint. The actual tube depot is separately tabulated in LPSC 2618.
4. Ignore retired layer-state IDs `gale-geology`, `jezero-geology`, `oxia-geology`. They cannot mount because no active regional manifest contains them. No objective ID was removed or repurposed. `gale-sulfate-units` keeps its ID and scientific investigation meaning; its title now describes terrain investigation. Legacy Gale scenario IDs remain explicitly unlocated Scenario entries to preserve identification. Do not restore historical demo coordinates or polygon centroids when opening them.
5. If importing saved geographic waypoint data from an older experimental objective branch, preserve the original coordinates as legacy user data with an explicit retired/unverified indication; require manual review before terrain routing. Do not infer that retaining the objective ID verifies old waypoint coordinates. F1 owns this migration; the current F3 branch never imported those alternate persistence contracts.

## Reviewable integration guard

```ts
// Proposed only; apply together with F1's canonical evidence contract.
if (!target?.coordinates || !target.coordinate_verified ||
    target.routing_eligibility.status !== "available") {
  throw new Error("Scientific objective is not eligible for terrain routing");
}
```

This proposal intentionally does not authorize a blanket rewrite or change manual planning. Existing real Gale/Jezero numerical research routing must remain available for explicit manual inputs and remain registration-unverified. Oxia remains geometric-only. No F1 changes are assumed in the F3 tests.

The catalog `coordinate_verified` field means the source supports the copied location, not independent basemap alignment. Oxia's existing bridge still automatically creates geometric stops for its source-verified detections. The machine-readable receipt records that legacy behavior separately from declared scientific routing eligibility. This is an integration dependency, not silently claimed fixed by F3.
