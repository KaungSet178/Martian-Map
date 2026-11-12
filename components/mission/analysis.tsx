"use client";

import { Shield, Timer, Microscope, LockKeyhole } from "lucide-react";
import { assessments, type RegionManifest } from "@/lib/contracts/region";
import type { Mission } from "@/lib/mission/model";
import { routeAvailability } from "@/lib/api/planning";
import { Badge, Notice } from "@/components/ui/primitives";

export function RouteComparison({
  mission,
  region,
  online,
  onEvidence,
}: {
  mission: Mission;
  region: RegionManifest;
  online: boolean;
  onEvidence: () => void;
}) {
  const availability = routeAvailability(mission, region, online);
  const icons = [Shield, Timer, Microscope];
  return (
    <>
      <div className="section-intro">
        <span className="eyebrow">Mission assessment</span>
        <h2>Review route readiness</h2>
        <p>
          Routes become comparable when the same verified inputs support each
          objective.
        </p>
      </div>
      <Notice title="Detailed routing unavailable">
        No candidate paths have been calculated. You can continue editing and
        saving this draft.
      </Notice>
      <div className="route-list">
        {availability.objectives.map((objective, i) => {
          const Icon = icons[i];
          return (
            <div className="route-item" key={objective.id}>
              <Icon size={21} aria-hidden="true" />
              <div>
                <strong>{objective.name}</strong>
                <p>{objective.requirement}</p>
              </div>
              <LockKeyhole size={16} aria-label="Unavailable" />
            </div>
          );
        })}
      </div>
      <h3>What is missing</h3>
      <ul className="missing-list">
        {availability.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <FeasibilityPanel />
      <button className="full" onClick={onEvidence}>
        Inspect data and limitations
      </button>
    </>
  );
}
export function FeasibilityPanel() {
  return (
    <section className="feasibility">
      <div className="section-heading">
        <h3>Mission feasibility</h3>
        <Badge tone="caution">Unverified</Badge>
      </div>
      <p className="supporting">
        All six checks require evidence. No operational safety determination is
        available.
      </p>
      <dl>
        {assessments.map((label) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>Unverified</dd>
          </div>
        ))}
      </dl>
      <p className="supporting">
        Distance, EVA time, slope, oxygen, battery, radiation dose and return
        margin: unavailable.
      </p>
    </section>
  );
}
