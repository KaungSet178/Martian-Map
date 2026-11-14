"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Download,
  FileCode,
  CheckCircle,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import { WeatherSection } from "./weather-section";
import { RadiationSection } from "./radiation-section";
import { InterpretationPanel } from "./interpretation-panel";
import { getGaleEnvironmentalDataset } from "@/lib/environment/gale/adapter";
import provenanceManifest from "@/data/environment/gale/provenance_manifest.json";

export function GaleEnvironmentalPanel() {
  const [selectedSol, setSelectedSol] = useState<number>(100);
  const [showManifest, setShowManifest] = useState<boolean>(false);

  const handleDownloadDataset = () => {
    const dataset = getGaleEnvironmentalDataset();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataset, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `gale_environmental_dataset_sol_${selectedSol}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 rounded-2xl border border-slate-800 bg-slate-950/90 p-5 md:p-8 text-slate-100 shadow-2xl backdrop-blur-xl">
      {/* Top Banner & Title */}
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between border-b border-slate-800/80 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 px-3 py-0.5 text-xs font-semibold text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" />
              NASA Science Archive Ground Truth
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
              <CheckCircle className="h-3 w-3" />
              PDS Verified
            </span>
          </div>

          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Environmental Conditions
          </h2>

          <p className="text-sm font-medium text-slate-400">
            Gale Crater · Curiosity Historical Observations
          </p>
        </div>

        {/* Action Controls & Sol Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sol Badge Selector */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs">
            <Calendar className="h-4 w-4 text-cyan-400" />
            <span className="text-slate-400 font-medium">Selected Sol:</span>
            <select
              value={selectedSol}
              onChange={(e) => setSelectedSol(Number(e.target.value))}
              className="bg-transparent font-bold text-white font-mono focus:outline-none cursor-pointer"
            >
              <option value={100} className="bg-slate-900 text-white">
                Sol 100 (Full 24h Diurnal Baseline)
              </option>
            </select>
          </div>

          {/* Export JSON Button */}
          <button
            onClick={handleDownloadDataset}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
            title="Download Section 4 contract-compliant EnvironmentalDataset JSON"
          >
            <Download className="h-3.5 w-3.5" />
            Export JSON
          </button>

          {/* Provenance Manifest Button */}
          <button
            onClick={() => setShowManifest(!showManifest)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-200"
            title="Inspect SHA-256 cryptographic provenance manifest"
          >
            <FileCode className="h-3.5 w-3.5" />
            Provenance
          </button>
        </div>
      </header>

      {/* Provenance Manifest Modal / Drawer */}
      {showManifest && (
        <div className="rounded-xl border border-cyan-900/60 bg-slate-900/95 p-4 text-xs space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5 font-mono">
              <ShieldCheck className="h-4 w-4" />
              Cryptographic Provenance & Product Manifest
            </span>
            <button
              onClick={() => setShowManifest(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕ Close
            </button>
          </div>
          <pre className="max-h-64 overflow-auto rounded bg-slate-950 p-3 font-mono text-[11px] text-slate-300">
            {JSON.stringify(provenanceManifest, null, 2)}
          </pre>
        </div>
      )}

      {/* 1. Weather Section (REMS) */}
      <WeatherSection />

      {/* 2. Radiation Section (RAD) */}
      <RadiationSection />

      {/* 3. Scientific Interpretation & Operational Boundaries */}
      <InterpretationPanel />
    </div>
  );
}
