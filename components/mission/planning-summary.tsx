import { EVAAssessment } from "./eva-assessment";
import type { MissionPlanningSnapshot } from "@/lib/mission/planning-snapshot";

export function PlanningSummary({snapshot:s}:{snapshot:MissionPlanningSnapshot}) {
  return <section aria-label="Mission planning snapshot" data-testid="mission-planning-snapshot">
    <h3>Planning inputs</h3>
    <p>{s.countLabel}</p>
    <p>Mission type: {s.plan.mode === "round_trip" ? "Round trip to base" : "One way"}</p>
    <p>Start / base: {s.start ? `${s.start.label ?? s.start.id} — ${s.start.coordinate_text}` : "Not designated — use Make Base"}</p>
    <p>Destination / terminus: {s.destination ? `${s.destination.label ?? s.destination.id} — ${s.destination.coordinate_text}` : "Not designated — use Make Terminus"}</p>
    <h3>Ordered waypoint itinerary</h3>
    {s.itinerary.length ? <ol>{s.itinerary.map(w=><li key={w.id}>
      <strong>{w.label ?? w.id}</strong> — {w.role}<br/>{w.coordinate_text}<br/>{w.evidence_text}
      <p>{w.precision_disclosure}</p>{w.inactive_reason && <p>{w.inactive_reason}</p>}
      {w.previous_evidence && <p>Historical saved evidence: {w.previous_evidence.classification}; superseded by the current catalog assessment.</p>}
      <p>Stop duration: {w.stop_seconds === null ? "Not specified" : `${w.stop_seconds} seconds`}</p>
      {w.notes && <p>{w.notes}</p>}
    </li>)}</ol> : <p>No planning waypoints.</p>}
    <h3>Science objectives</h3>
    {s.objectives.length ? <ol>{s.objectives.map(t=><li key={t.id}><strong>{t.title}</strong><p>{t.evidence_text}</p><p>{t.location_disclosure}</p><p>{t.is_waypoint ? "Included as a planning waypoint; registration unverified." : "Objective only; no waypoint inferred."} {t.activity}</p></li>)}</ol> : <p>No scientific objectives selected.</p>}
    {s.retiredObjectives.length > 0 && <><h3>Retired or unavailable objectives</h3><ul>{s.retiredObjectives.map(t=><li key={t.id}><strong>{t.title}</strong> — {t.reason}</li>)}</ul></>}
    <h3>Research route outputs</h3>
    {!s.geometric.available && <p>Geometric preview unavailable: add two active planning waypoints and resolve retired or unavailable locations.</p>}
    <p>{s.geometric.label}. Total geometric distance: {s.geometric.total_surface_distance_m.toFixed(1)} m; outbound {s.geometric.outbound_distance_m.toFixed(1)} m; return {s.geometric.return_distance_m.toFixed(1)} m. {s.geometric.is_closed_loop ? "Return closure included exactly once." : "No return closure."}</p>
    {s.terrain ? <p>Selected terrain alternative: {s.terrain.preference}; 3D DEM distance {s.terrain.distanceMeters ?? "Unavailable"} m; horizontal {s.terrain.horizontalDistanceMeters ?? "Unavailable"} m; ascent {s.terrain.ascentMeters ?? "Unavailable"} m; descent {s.terrain.descentMeters ?? "Unavailable"} m. Absolute registration unverified.</p> : <p>No current computed terrain route. {s.mission.terrain_route ? "Saved preference requires recalculation; stored results are not trusted." : "Recompute after waypoint or endpoint changes."}</p>}
    <EVAAssessment assessment={s.scenario}/>
    <h3>Planning assumptions</h3>
    <p>Recovery assumption: {s.mission.recovery_assumption || "Not documented"}</p>
    <p>Scenario reserves: oxygen {s.mission.oxygen_reserve_percent}%; battery {s.mission.battery_reserve_percent}%.</p>
    {Object.keys(s.assumptions).length ? <dl>{Object.entries(s.assumptions).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value || "Not specified"}</dd></div>)}</dl> : <p>No timeline/resource assumptions entered.</p>}
    {s.validation.issues.length > 0 && <><h3>Editable planning issues</h3><ul>{s.validation.issues.map((issue,i)=><li key={i}>{issue.message}</li>)}</ul></>}
    <h3>Operational feasibility</h3><p>{s.operational}</p>
  </section>;
}
