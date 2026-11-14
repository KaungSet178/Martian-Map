"use client";

import {
  Shield,
  Timer,
  Microscope,
  LockKeyhole,
  Upload,
  X,
} from "lucide-react";
import { assessments, type RegionManifest } from "@/lib/contracts/region";
import type { Mission } from "@/lib/mission/model";
import { routeAvailability } from "@/lib/api/planning";
import {
  ROUTE_LABELS,
  VALIDATION_LABELS,
  displayRoutesFromResult,
  type RouteCandidateResult,
  type RouteCandidate,
} from "@/lib/map/routes";
import { Badge, Notice } from "@/components/ui/primitives";

export function RouteComparison({
  mission,
  region,
  online,
  routeResult,
  selectedRouteId,
  routeError,
  onLoadRoute,
  onSelectRoute,
  onClearRoute,
  onEvidence,
}: {
  mission: Mission;
  region: RegionManifest;
  online: boolean;
  routeResult: RouteCandidateResult | null;
  selectedRouteId: string | null;
  routeError: string;
  onLoadRoute: (file?: File) => void;
  onSelectRoute: (id: string) => void;
  onClearRoute: () => void;
  onEvidence: () => void;
}) {
  const availability = routeAvailability(mission, region, online);
  const icons = [Shield, Timer, Microscope];
  const display = routeResult ? displayRoutesFromResult(routeResult) : null;
  const plotted = new Set(display?.routes.map((route) => route.id) ?? []);
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
      <div className="route-upload">
        <label className="file-button">
          <Upload size={17} />
          Import route result
          <input
            type="file"
            accept=".json,application/json"
            aria-label="Import route result JSON"
            onChange={(event) => {
              onLoadRoute(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        {routeResult && (
          <button onClick={onClearRoute}>
            <X size={17} />
            Clear loaded routes
          </button>
        )}
      </div>
      {routeError && (
        <p role="alert" className="error-notice">
          {routeError}
        </p>
      )}
      {routeResult ? (
        <>
          <Notice title="Versioned route result loaded">
            {routeResult.candidates.length} candidate
            {routeResult.candidates.length === 1 ? "" : "s"} for dataset{" "}
            {routeResult.dataset_version}. Coverage is{" "}
            {routeResult.coverage.status}. Only candidates carrying the
            service&apos;s reviewed display geometry are drawn; nothing is
            calculated in the browser.
          </Notice>
          <div className="route-candidates" aria-label="Route candidates">
            {routeResult.candidates.map((candidate: RouteCandidate) => {
              const isPlotted = plotted.has(candidate.id);
              return (
                <label
                  key={candidate.id}
                  className={`route-candidate ${selectedRouteId === candidate.id ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="route-candidate"
                    checked={selectedRouteId === candidate.id}
                    onChange={() => onSelectRoute(candidate.id)}
                    aria-label={`Select ${ROUTE_LABELS[candidate.objective]} route candidate`}
                  />
                  <span className="route-candidate-body">
                    <span className="route-candidate-title">
                      <strong>{ROUTE_LABELS[candidate.objective]}</strong>
                      <Badge
                        tone={
                          candidate.validation === "scientifically_reviewed"
                            ? "cyan"
                            : "caution"
                        }
                      >
                        {VALIDATION_LABELS[candidate.validation]}
                      </Badge>
                    </span>
                    <span className="supporting">
                      {isPlotted
                        ? "Reviewed display geometry · drawn on map"
                        : "No display geometry · not plotted"}
                      {candidate.identical_to
                        ? ` · Identical to ${candidate.identical_to}`
                        : ""}
                      {candidate.omitted_target_ids.length
                        ? ` · ${candidate.omitted_target_ids.length} objective${
                            candidate.omitted_target_ids.length === 1 ? "" : "s"
                          } omitted`
                        : ""}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <p className="supporting">
            Candidate geometry is reproduced from the loaded result. It is not
            a feasibility determination and does not replace the missing
            evidence listed in the data register.
          </p>
        </>
      ) : (
        <>
          <Notice title="Detailed routing unavailable">
            No candidate paths have been calculated. You can continue editing
            and saving this draft.
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
        </>
      )}
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
