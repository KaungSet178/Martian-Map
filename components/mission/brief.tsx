"use client";

import { planningSnapshotHtml } from "@/lib/mission/brief-html";
import { PlanningSummary } from "./planning-summary";
import { missionPlanningSnapshot } from "@/lib/mission/planning-snapshot";
import { ROUTING_VERSION, type TerrainRoute } from "@/lib/routing/contracts";
import { Download, Printer } from "lucide-react";
import type { RegionManifest } from "@/lib/contracts/region";
import { assessments } from "@/lib/contracts/region";
import type { Mission } from "@/lib/mission/model";
import { Badge, downloadFile } from "@/components/ui/primitives";

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
function mapSummary(region: RegionManifest): string {
  return region.map.visualization.status === "available"
    ? `Map context: ${region.layers.filter((layer) => layer.availability === "available").map((layer) => layer.display_name).join(", ")}. Map imagery is viewable in the application; no map image is embedded in this brief. Terrain eligibility remains unverified.`
    : "Scientific map and terrain coverage: not integrated.";
}
export function terrainBriefSummary(mission:Mission,route?:TerrainRoute|null):string {
  const environment=mission.region === "gale" ? "Historical REMS weather and RAD absorbed-dose observations (sol 100); sparse wind limitations apply." : mission.region === "jezero" ? "Historical MEDA weather, five temperature sensors, solar/UV radiance across six sols; ionizing dose unavailable." : "Local environmental observations unavailable.";
  const result=route && route.regionId===mission.region && route.status!=="unavailable"
    ? `Terrain-derived ${route.preference} route. Model ${ROUTING_VERSION}. 3D distance ${route.distanceMeters?.toFixed(1)} m; horizontal Mars distance ${route.horizontalDistanceMeters?.toFixed(1)} m; ascent ${route.ascentMeters?.toFixed(1)} m; descent ${route.descentMeters?.toFixed(1)} m; maximum path grade ${route.maximumSlopeDegrees?.toFixed(2)} degrees. Source: ${route.sourceDatasetIds.join(", ")}. Absolute registration unverified. ${route.warnings.join(" ")}`
    : mission.terrain_route ? `Saved ${mission.terrain_route.preference} preference requires recalculation and source/model revalidation. No stored geometry is trusted.` : "No computed terrain route selected.";
  return `${result} Environmental availability: ${environment} Oxygen, battery, radiation and mission feasibility remain unverified. Scenario reserve inputs: oxygen ${mission.oxygen_reserve_percent}%, battery ${mission.battery_reserve_percent}%.`;
}
export function briefHtml(
  mission: Mission,
  region: RegionManifest,
  generatedAt: string,
  terrainRoute?: TerrainRoute | null,
) {
  const snapshot = missionPlanningSnapshot(mission, region, terrainRoute);
  terrainRoute = snapshot.terrain;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(mission.name)} — Mission brief</title><style>body{font:16px/1.6 system-ui;max-width:850px;margin:40px auto;padding:0 24px;color:#172234}h1,h2{line-height:1.2}aside{border:1px solid #99703a;padding:16px}li{margin:8px 0}dt{font-weight:bold}dd{margin:0 0 12px}a{color:#174c68}pre{white-space:pre-wrap;overflow-wrap:anywhere}@media print{body{margin:0}}</style><body><p>Marswalk · Pre-mission research plan</p><h1>${escape(mission.name)}</h1><p>${escape(region.name)} · ${escape(region.mission_context)}</p><aside><strong>Unverified — Not operational navigation.</strong> ${terrainRoute ? "Terrain routing is a research estimate; hazard analysis and validated resource estimates are unavailable." : "Geometric preview is a planning estimate. No certified route, hazard analysis or validated resource estimate is available."}</aside><h2>Terrain routing and environment</h2><p>${escape(terrainBriefSummary(mission,terrainRoute))}</p><h2>Plan inputs</h2><dl><dt>Generated</dt><dd>${escape(generatedAt)}</dd><dt>Mission direction</dt><dd>${mission.direction === "round" ? "Round trip to start" : "One way"}</dd><dt>Start / recovery endpoint</dt><dd>${escape(snapshot.start?.coordinate_text ?? "Not designated")} / ${escape(snapshot.destination?.coordinate_text ?? "Not designated")}; registration unverified</dd><dt>Recovery assumption</dt><dd>${escape(mission.recovery_assumption || "Not documented")}</dd><dt>Scenario reserve preferences</dt><dd>Oxygen ${mission.oxygen_reserve_percent}%; battery ${mission.battery_reserve_percent}%. These are inputs, not calculated margins.</dd></dl>${planningSnapshotHtml(snapshot)}<h2>Six mandatory assessments</h2><ul>${assessments.map((a) => `<li>${a}: Unverified — required evidence unavailable.</li>`).join("")}</ul><h2>Map, route and resource results</h2><p>${escape(mapSummary(region))} ${terrainRoute ? "Computed terrain route metrics are detailed above; validated resource and hazard assessments remain unavailable." : "Geometric distance and planning inputs are detailed above; terrain results require current computation. Validated operational assessments remain unavailable."} No schematic preview artwork is exported as evidence.</p><h2>Versions and provenance</h2><p>Mission schema: ${mission.schema_version}. Saved dataset: ${escape(mission.dataset_version)}. Current dataset: ${escape(region.dataset_version)}. Models: ${terrainRoute ? ROUTING_VERSION : "none connected"}. Coordinates: planetocentric latitude, east-positive longitude 0–360°; projected reference: ${escape(region.coordinate_system.projected_crs)}.</p><p>${escape(region.routing.reason)}</p><h2>Source references</h2><p>References document regional evidence; unresolved target coordinates remain unverified.</p><ul>${region.source_references.map((s) => `<li><a href="${escape(s.url)}">${escape(s.title)}</a></li>`).join("")}</ul></body></html>`;
}

export function MissionBrief({
  mission,
  region,
  generatedAt,
  terrainRoute: suppliedTerrainRoute,
}: {
  mission: Mission;
  region: RegionManifest;
  generatedAt: string;
  terrainRoute?: TerrainRoute | null;
}) {
  const snapshot = missionPlanningSnapshot(mission, region, suppliedTerrainRoute);
  const terrainRoute = snapshot.terrain;
  return (
    <>
      <div className="brief-actions">
        <button onClick={() => window.print()}>
          <Printer size={17} />
          Print / save PDF
        </button>
        <button
          className="primary"
          onClick={() =>
            downloadFile(
              `marswalk-${mission.region}-brief.html`,
              briefHtml(mission, region, generatedAt, terrainRoute),
              "text/html;charset=utf-8",
            )
          }
        >
          <Download size={17} />
          Download brief
        </button>
      </div>
      <article className="mission-brief">
        <p className="eyebrow">Marswalk · Pre-mission research plan</p>
        <h2>{mission.name}</h2>
        <p>
          {region.name} · {region.mission_context}
        </p>
        <Badge tone="caution">Unverified</Badge>
        <p>
          Not operational navigation. {terrainRoute ? "Terrain-derived research estimate; no safety certification." : "Geometric preview available for placed points; no safety certification."}
        </p>
        <dl className="metadata">
          <div>
            <dt>Generated</dt>
            <dd>{new Date(generatedAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt>Direction</dt>
            <dd>{mission.direction === "round" ? "Round trip" : "One way"}</dd>
          </div>
          <div>
            <dt>Start / endpoint</dt>
            <dd>{snapshot.start?.coordinate_text ?? "Not designated"} / {snapshot.destination?.coordinate_text ?? "Not designated"}; registration unverified</dd>
          </div>
          <div>
            <dt>Recovery assumption</dt>
            <dd>{mission.recovery_assumption || "Not documented"}</dd>
          </div>
          <div>
            <dt>Scenario reserves</dt>
            <dd>
              Oxygen {mission.oxygen_reserve_percent}% · Battery{" "}
              {mission.battery_reserve_percent}%
            </dd>
          </div>
        </dl>
        <PlanningSummary snapshot={snapshot} />
        <h3>Mandatory assessments</h3>
        <dl className="assessment-list">
          {assessments.map((a) => (
            <div key={a}>
              <dt>{a}</dt>
              <dd>Unverified</dd>
            </div>
          ))}
        </dl>
        <h3>Terrain routing and environment</h3>
        <p>{terrainBriefSummary(mission,terrainRoute)}</p>
        <h3>Map, route and resource results</h3>
        <p>
          {mapSummary(region)} {terrainRoute ? "Computed terrain results are detailed above. Hazard certification and validated resource assessments remain unavailable." : "Geometric planning inputs and distance are detailed above. Validated EVA time, consumption, radiation and return margin remain unavailable."} Preview artwork is excluded from this brief.
        </p>
        <h3>Versions and references</h3>
        <p className="supporting">
          Schema {mission.schema_version} · Saved dataset{" "}
          {mission.dataset_version} · Current dataset {region.dataset_version} ·
          {terrainRoute ? `Terrain model ${ROUTING_VERSION}; operational resource models unverified.` : "No models connected."}
        </p>
        <p>
          Planetocentric latitude; east-positive longitude 0–360°. Projected reference: {region.coordinate_system.projected_crs}.
        </p>
        {region.source_references.map((s) => (
          <p key={s.id}>
            <a href={s.url}>{s.title}</a>
          </p>
        ))}
      </article>
    </>
  );
}
