import type { Metadata } from "next";
import { GaleEnvironmentalPanel } from "@/components/environment/gale/gale-environmental-panel";

export const metadata: Metadata = {
  title: "Gale Crater Environmental Conditions | Marswalk Planner",
  description:
    "Authentic historical environmental observations for Gale Crater from MSL Curiosity REMS surface weather and RAD ionizing radiation dosimetry.",
};

export default function GaleEnvironmentPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 md:px-8 text-slate-100 selection:bg-cyan-500 selection:text-black">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono">Marswalk Planner · NASA Space Apps Challenge</span>
          <span className="rounded bg-slate-900 border border-slate-800 px-2 py-1 font-mono text-cyan-400">
            Workstream: Gale Environmental Ground Truth
          </span>
        </div>

        <GaleEnvironmentalPanel />
      </div>
    </main>
  );
}
