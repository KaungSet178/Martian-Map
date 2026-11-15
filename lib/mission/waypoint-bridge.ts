import { resolveSiteReference, sitePolicy, siteWaypointEvidence } from "@/lib/science/sites";
import { terrainRequestKey } from "@/lib/routing/request-key";
import type { RegionManifest } from "@/lib/contracts/region";
import type { Mission } from "@/lib/mission/model";
import {
  createWaypoint,
  createWaypointFromTarget,
  createWaypointPlan,
  waypointPlanSchema,
  orderedWaypoints,
  targetWaypointEvidence,
  setTrajectoryMode,
  isTerminus,
  type MarsWaypoint,
  type TrajectoryMode,
  type WaypointPlan,
} from "@/lib/mission/waypoint-planning";

/**
 * Initializes or resolves a WaypointPlan for a given Mission and RegionManifest.
 *
 * Scientific Integrity Rules:
 * 1. If the mission already contains a valid `waypoint_plan`, that plan is preserved.
 * 2. Unverified science targets (coordinates null or coordinate_verified false)
 *    are NEVER automatically converted into geographic coordinates or waypoints.
 * 3. Base camp coordinates are created only if mission.start is verified.
 * 4. Recovery endpoint coordinates are created only if mission.endpoint is verified in one-way mode.
 */
export function initWaypointPlanFromMission(
  mission: Mission,
  region: RegionManifest,
): WaypointPlan {
  // If the mission already has a valid waypoint plan matching the region, return it
  if (mission.waypoint_plan && mission.waypoint_plan.region_id === region.id) {
    // A temporarily empty title is editable UI state, not permission to discard points.
    const parsed = waypointPlanSchema.safeParse({...mission.waypoint_plan,name:mission.waypoint_plan.name.trim() || "Untitled draft"});
    if (parsed.success) {
      return { ...parsed.data, name:mission.waypoint_plan.name, waypoints: orderedWaypoints(parsed.data).map(w => {
        if (w.science_site) {
          const resolved=resolveSiteReference(w.science_site,region.id,w.coordinates);
          const policy=resolved.site ? sitePolicy(resolved.site) : null;
          const inactive_reason=resolved.reason ?? (w.target_id && w.target_id!==w.science_site.objective_id ? "Site and objective identity mismatch." : undefined) ?? (region.id === "oxia" && policy?.geometricOnly ? undefined : policy?.terrainEligible ? undefined : policy?.reason ?? "Scientific site unavailable");
          const current=resolved.site ? siteWaypointEvidence(resolved.site) : w.evidence;
          const evidence=resolved.reason && current ? {...current,coordinate_verified:false,routing_eligible:false} : current;
          return {...w,inactive_reason,evidence,previous_evidence:w.previous_evidence ?? (w.evidence && evidence && JSON.stringify(w.evidence)!==JSON.stringify(evidence) ? w.evidence : undefined)};
        }
        if (!w.target_id) return w;
        const target = region.targets.find(t => t.id === w.target_id);
        const mismatch = target?.coordinates && (target.coordinates.latitude !== w.coordinates.latitude || target.coordinates.longitude_east !== w.coordinates.longitude_east);
        const inactive_reason = !target ? "Retired or unavailable catalog target; not an active route destination."
          : !target.coordinates || !target.coordinate_verified || target.feature_kind === "geological_area" ? "Scientific location unavailable for point routing; historical coordinates retained without verification."
          : mismatch ? "Stored coordinates differ from the current catalog; registration and routing require review." : undefined;
        const currentEvidence = target ? targetWaypointEvidence(target) : undefined;
        const previous_evidence = w.previous_evidence ?? (w.evidence && currentEvidence && JSON.stringify(w.evidence)!==JSON.stringify(currentEvidence) ? w.evidence : undefined);
        return { ...w, inactive_reason, previous_evidence, evidence: target ? {...targetWaypointEvidence(target), ...(inactive_reason ? {coordinate_verified:false,routing_eligible:false} : {})} : w.evidence ? {...w.evidence,routing_eligible:false} : undefined };
      }) };
    }
  }

  const waypoints: MarsWaypoint[] = [];

  // 1. Mission start / Base Camp (if verified coordinates provided)
  if (mission.start) {
    waypoints.push(
      createWaypoint({
        id: `wp-base-${mission.id.slice(0, 8)}`,
        label: "Mission Base Camp",
        role: "base",
        coordinates: mission.start,
        provenance: "user_planning_input",
      }),
    );
  }

  // 2. Verified science targets
  for (const targetId of mission.target_ids) {
    const target = region.targets.find((t) => t.id === targetId);
    // Explicit check: only targets with verified coordinates become waypoints
    if (target && target.coordinates && target.coordinate_verified && target.feature_kind !== "geological_area") {
      waypoints.push(createWaypointFromTarget(target, "science_stop"));
    }
  }

  // 3. One-way recovery endpoint (if one-way and verified endpoint provided)
  if (mission.direction === "one" && mission.endpoint) {
    waypoints.push(
      createWaypoint({
        id: `wp-endpoint-${mission.id.slice(0, 8)}`,
        label: "Recovery Endpoint",
        role: "recovery_endpoint",
        coordinates: mission.endpoint,
        provenance: "user_planning_input",
        notes: mission.recovery_assumption || undefined,
      }),
    );
  }

  return createWaypointPlan({
    name: mission.name,
    region_id: region.id,
    mode: mission.direction === "round" ? "round_trip" : "one_way",
    waypoints,
    recovery_assumption: mission.recovery_assumption || undefined,
  });
}

/**
 * Synchronizes a Mission container with an active WaypointPlan.
 *
 * Preserves:
 * - Unverified regional objectives that cannot exist as geographic waypoints.
 * - Resource preferences (oxygen/battery reserves).
 * - Dataset and model version strings.
 * - Mission ID.
 */
export function syncMissionWithWaypointPlan(
  mission: Mission,
  plan: WaypointPlan,
  region: RegionManifest,
): Mission {
  // 1. Determine start coordinates from first base waypoint
  plan = { ...plan, waypoints: orderedWaypoints(plan) };
  const bases = plan.waypoints.filter(w => w.role === "base");
  const first = bases.length === 1 ? bases[0] : undefined;
  const startCoords =
    first && first.role === "base" ? first.coordinates : null;

  // 2. Determine endpoint coordinates from last waypoint if one-way
  let endpointCoords = null;
  if (plan.mode === "one_way" && plan.waypoints.length > 0) {
    const last = plan.waypoints[plan.waypoints.length - 1];
    if (plan.waypoints.filter(w => w.role === "destination" || w.role === "recovery_endpoint").length === 1 && (last.role === "destination" || last.role === "recovery_endpoint")) {
      endpointCoords = last.coordinates;
    }
  }

  // 3. Reconcile target_ids:
  // Verified targets present in the waypoint plan
  const waypointTargetIds = plan.waypoints
    .map((w) => w.target_id)
    .filter((id): id is string => Boolean(id));

  // Regional targets that have verified coordinates
  const verifiedTargetIdsInRegion = new Set(
    region.targets
      .filter((t) => t.coordinate_verified && t.coordinates && t.feature_kind !== "geological_area")
      .map((t) => t.id),
  );

  // Retain any unverified targets previously in mission.target_ids
  // because they cannot be expressed as geometric point waypoints
  const retainedUnverifiedTargetIds = mission.target_ids.filter(
    (id) => !verifiedTargetIdsInRegion.has(id),
  );

  const combinedTargetIds = Array.from(new Set([
    ...mission.target_ids.filter(id => retainedUnverifiedTargetIds.includes(id) || waypointTargetIds.includes(id)),
    ...waypointTargetIds,
  ]));

  return {
    ...mission,
    name: plan.name,
    direction: plan.mode === "round_trip" ? "round" : "one",
    recovery_assumption: plan.recovery_assumption ?? mission.recovery_assumption,
    start: startCoords,
    endpoint: endpointCoords,
    target_ids: combinedTargetIds,
    waypoint_plan: plan,
  };
}

/**
 * Synchronizes an existing WaypointPlan when changes occur to the parent Mission
 * (e.g. from the legacy MissionEditor or TargetCatalog).
 */
export function syncWaypointPlanWithMission(
  mission: Mission,
  region: RegionManifest,
): WaypointPlan {
  if (!mission.waypoint_plan || mission.waypoint_plan.region_id !== region.id) {
    return initWaypointPlanFromMission(mission, region);
  }

  const currentPlan = mission.waypoint_plan;
  const targetMode: TrajectoryMode =
    mission.direction === "round" ? "round_trip" : "one_way";

  let updatedWaypoints = [...currentPlan.waypoints];

  // 1. Sync Base Camp from mission.start
  if (mission.start) {
    const baseIndex = updatedWaypoints.findIndex((w) => w.role === "base");
    if (baseIndex >= 0) {
      updatedWaypoints[baseIndex] = {
        ...updatedWaypoints[baseIndex],
        coordinates: mission.start,
      };
    } else {
      updatedWaypoints.unshift(
        createWaypoint({
          id: `wp-base-${mission.id.slice(0, 8)}`,
          label: "Mission Base Camp",
          role: "base",
          coordinates: mission.start,
          provenance: "user_planning_input",
        }),
      );
    }
  } else {
    // If mission.start is cleared, remove any base camp
    updatedWaypoints = updatedWaypoints.filter((w) => w.role !== "base");
  }

  // 2. Sync verified science stops with mission.target_ids
  const missionTargetSet = new Set(mission.target_ids);

  // Remove science stop waypoints whose target is no longer in mission.target_ids
  updatedWaypoints = updatedWaypoints.filter((w) => {
    if (w.target_id && region.targets.some(t => t.id === w.target_id)) {
      return missionTargetSet.has(w.target_id);
    }
    return true;
  });

  // Add any newly added verified targets
  const existingWaypointTargetIds = new Set(
    updatedWaypoints.map((w) => w.target_id).filter(Boolean),
  );

  for (const tid of mission.target_ids) {
    if (!existingWaypointTargetIds.has(tid)) {
      const target = region.targets.find((t) => t.id === tid);
      if (target && target.coordinates && target.coordinate_verified && target.feature_kind !== "geological_area") {
        // Insert before recovery endpoint if one exists
        const lastIndex = updatedWaypoints.length - 1;
        const hasEndpoint =
          lastIndex >= 0 &&
          (updatedWaypoints[lastIndex].role === "destination" ||
            updatedWaypoints[lastIndex].role === "recovery_endpoint");

        const newWp = createWaypointFromTarget(target, "science_stop");
        if (hasEndpoint) {
          updatedWaypoints.splice(lastIndex, 0, newWp);
        } else {
          updatedWaypoints.push(newWp);
        }
      }
    }
  }

  // 3. Sync recovery endpoint for one-way missions
  const removedCatalogEndpoint = currentPlan.waypoints.some(w => isTerminus(w) && w.target_id && !missionTargetSet.has(w.target_id));
  if (targetMode === "one_way" && mission.endpoint && !removedCatalogEndpoint) {
    const epIndex = updatedWaypoints.findIndex(
      (w) => w.role === "destination" || w.role === "recovery_endpoint",
    );
    if (epIndex >= 0) {
      updatedWaypoints[epIndex] = {
        ...updatedWaypoints[epIndex],
        coordinates: mission.endpoint,
        notes: mission.recovery_assumption || updatedWaypoints[epIndex].notes,
      };
    } else {
      updatedWaypoints.push(
        createWaypoint({
          id: `wp-endpoint-${mission.id.slice(0, 8)}`,
          label: "Recovery Endpoint",
          role: "recovery_endpoint",
          coordinates: mission.endpoint,
          provenance: "user_planning_input",
          notes: mission.recovery_assumption || undefined,
        }),
      );
    }
  }

  return {
    ...currentPlan,
    name: mission.name,
    mode: targetMode,
    recovery_assumption: mission.recovery_assumption || undefined,
    waypoints: setTrajectoryMode({ ...currentPlan, waypoints: updatedWaypoints }, targetMode).waypoints,
  };
}

/** Single state transition used by catalog, waypoint, and scenario editors. */
export function applyMissionChange(mission: Mission, change: Partial<Mission>, region: RegionManifest): Mission {
  const next = { ...mission, ...change };
  const plan = change.waypoint_plan ?? syncWaypointPlanWithMission(next, region);
  const canonical = syncMissionWithWaypointPlan(next, plan, region);
  const receipt = canonical.terrain_route;
  if (receipt && receipt.requestKey !== terrainRequestKey(canonical, initWaypointPlanFromMission(canonical, region), receipt.datasetId, receipt.maxSnapMeters ?? 100)) {
    canonical.terrain_route = undefined;
  }
  return canonical;
}
