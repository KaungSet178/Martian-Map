"use client";

import React from "react";
import { Compass, CheckCircle2, Database, ShieldAlert } from "lucide-react";

export function InterpretationPanel() {
  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/70 p-5 backdrop-blur-md">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <Compass className="h-5 w-5 text-cyan-400" />
        <div>
          <h3 className="text-base font-bold text-slate-100">Scientific Context & Operational Limitations</h3>
          <p className="text-xs text-slate-400">Authentic in-situ environment at Bradbury Landing, Gale Crater (-4.59°S, 137.44°E)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Physical Interpretation */}
        <div className="space-y-2 rounded-lg border border-slate-800/80 bg-slate-900/40 p-3.5">
          <h4 className="font-semibold text-slate-200 flex items-center gap-1.5 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Atmospheric & Surface Physics
          </h4>
          <ul className="space-y-1.5 text-slate-300 list-disc list-inside leading-relaxed">
            <li>
              <strong>Extreme Thermal Inertia:</strong> Because Mars&apos; atmosphere is 95% CO₂ and less than 1% of Earth&apos;s surface density, the ground and air rapidly lose heat after sunset, dropping to -66.8°C at dawn and rebounding to -0.5°C air / +13.5°C ground at solar noon.
            </li>
            <li>
              <strong>Thermal Tides:</strong> The 0.95 hPa diurnal pressure swing is driven by global atmospheric solar heating, creating predictable morning and afternoon barometric oscillations.
            </li>
            <li>
              <strong>Unattenuated Solar UV:</strong> In the absence of an ozone layer, solar UV flux reaches 16.57 W/m² at solar noon, requiring comprehensive optical and polymer UV shielding for astronaut visors and EVA suits.
            </li>
            <li>
              <strong>Galactic Cosmic Rays (GCR):</strong> Surface ionizing dose rate averages ~210 µGy/day. The ~20 g/cm² overhead atmosphere shields solar wind electrons and low-energy protons, but primary high-energy GCR ions penetrate and produce secondary neutron/gamma cascades.
            </li>
          </ul>
        </div>

        {/* Operational Safety Disclaimer */}
        <div className="space-y-2 rounded-lg border border-amber-900/40 bg-amber-950/20 p-3.5">
          <h4 className="font-semibold text-amber-200 flex items-center gap-1.5 text-sm">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            Operational EVA Planning Boundaries
          </h4>
          <div className="space-y-2 text-slate-300 leading-relaxed">
            <p>
              <strong>Historical Context, Not Live Weather:</strong> These records reflect genuine observations during Sol 100 (November 2012, MY31 L<sub>s</sub> 208.6°). They establish ground-truth empirical baselines for Gale Crater terrain, but do not represent real-time weather forecasts.
            </p>
            <p>
              <strong>No EVA Certification:</strong> In accordance with NASA flight safety engineering, environmental measurements alone do not constitute an operational EVA clearance. There is intentionally <em>no &quot;Safe EVA&quot; or &quot;Unsafe EVA&quot; badge</em> displayed.
            </p>
            <p>
              <strong>Data Completeness:</strong> Missing observations (such as damaged wind sensor records) are preserved as authentic gaps rather than synthetic approximations.
            </p>
          </div>
        </div>
      </div>

      {/* Archive Provenance Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-slate-400" />
          <span>Curiosity REMS: PDS4 Atmospheres Node (MODRDR Sol 100)</span>
          <span className="text-slate-600">·</span>
          <span>Curiosity RAD: PDS PPI Node / UCLA (MSL-M-RAD-3-RDR-V1.0)</span>
        </div>
        <div className="font-mono text-slate-400">
          Traceable Baseline SHA: ed3e253d
        </div>
      </div>
    </section>
  );
}
