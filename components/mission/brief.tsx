"use client";

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
function briefHtml(
  mission: Mission,
  region: RegionManifest,
  generatedAt: string,
) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(mission.name)} — Mission brief</title><style>body{font:16px/1.6 system-ui;max-width:850px;margin:40px auto;padding:0 24px;color:#172234}h1,h2{line-height:1.2}aside{border:1px solid #99703a;padding:16px}li{margin:8px 0}dt{font-weight:bold}dd{margin:0 0 12px}a{color:#174c68}@media print{body{margin:0}}</style><body><p>Marswalk · Pre-mission research plan</p><h1>${escape(mission.name)}</h1><p>${escape(region.name)} · ${escape(region.mission_context)}</p><aside><strong>Unverified — Not operational navigation.</strong> No calculated route, hazard analysis or resource estimate is available.</aside><h2>Plan inputs</h2><dl><dt>Generated</dt><dd>${escape(generatedAt)}</dd><dt>Mission direction</dt><dd>${mission.direction === "round" ? "Round trip to start" : "One way"}</dd><dt>Start / recovery endpoint</dt><dd>Unavailable / unverified</dd><dt>Recovery assumption</dt><dd>${escape(mission.recovery_assumption || "Not documented")}</dd><dt>Scenario reserve preferences</dt><dd>Oxygen ${mission.oxygen_reserve_percent}%; battery ${mission.battery_reserve_percent}%. These are inputs, not calculated margins.</dd></dl><h2>Ordered objectives</h2><ol>${
    mission.target_ids
      .map((id) => {
        const t = region.targets.find((t) => t.id === id)!;
        return `<li><strong>${escape(t.title)}</strong> — ${escape(t.evidence)}; location ${t.coordinate_verified ? "verified" : "unverified"}.<br>${escape(t.activity)}</li>`;
      })
      .join("") || "<li>None selected</li>"
  }</ol><h2>Six mandatory assessments</h2><ul>${assessments.map((a) => `<li>${a}: Unverified — required evidence unavailable.</li>`).join("")}</ul><h2>Map, route and resource results</h2><p>${escape(mapSummary(region))} Route geometry, distance, slope, time, oxygen, battery, radiation and return margin: unavailable. No schematic preview artwork is exported as evidence.</p><h2>Versions and provenance</h2><p>Mission schema: ${mission.schema_version}. Saved dataset: ${escape(mission.dataset_version)}. Current dataset: ${escape(region.dataset_version)}. Models: none connected. Coordinates: planetocentric latitude, east-positive longitude 0–360°; projected reference: ${escape(region.coordinate_system.projected_crs)}.</p><p>${escape(region.routing.reason)}</p><h2>Source references</h2><p>References document regional evidence; unresolved target coordinates remain unverified.</p><ul>${region.source_references.map((s) => `<li><a href="${escape(s.url)}">${escape(s.title)}</a></li>`).join("")}</ul></body></html>`;
}

export function MissionBrief({
  mission,
  region,
  generatedAt,
}: {
  mission: Mission;
  region: RegionManifest;
  generatedAt: string;
}) {
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
              briefHtml(mission, region, generatedAt),
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
          Not operational navigation. No calculated route or safety
          certification.
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
            <dd>Unavailable / unverified</dd>
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
        <h3>Ordered objectives</h3>
        <ol>
          {mission.target_ids.map((id) => {
            const target = region.targets.find((t) => t.id === id)!;
            return (
              <li key={id}>
                <strong>{target.title}</strong>
                <p>{target.activity}</p>
                <p className="supporting">
                  {target.evidence} ·{" "}
                  {target.coordinate_verified
                    ? "Location verified"
                    : "Location unverified"}
                </p>
              </li>
            );
          })}
        </ol>
        {!mission.target_ids.length && <p>No objectives selected.</p>}
        <h3>Mandatory assessments</h3>
        <dl className="assessment-list">
          {assessments.map((a) => (
            <div key={a}>
              <dt>{a}</dt>
              <dd>Unverified</dd>
            </div>
          ))}
        </dl>
        <h3>Map, route and resource results</h3>
        <p>
          {mapSummary(region)} Route, hazard analysis, slope, distance, EVA time,
          consumption, radiation and return margin: unavailable. Preview artwork
          is excluded from this brief.
        </p>
        <h3>Versions and references</h3>
        <p className="supporting">
          Schema {mission.schema_version} · Saved dataset{" "}
          {mission.dataset_version} · Current dataset {region.dataset_version} ·
          No models connected.
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
