"use client";

import React, { useState } from "react";
import {
  Shield,
  Activity,
  Layers,
  Info,
  ExternalLink,
  Cpu,
} from "lucide-react";
import {
  getGaleSol100Radiation,
  getRadDoseSeries,
  getRadDetectorBStats,
  getRadDetectorEStats,
} from "@/lib/environment/gale/rad-data";
import { EnvironmentalChart, type ChartSeries } from "./environmental-chart";

export function RadiationSection() {
  const radDataset = getGaleSol100Radiation();
  const meta = radDataset.metadata;
  const statsB = getRadDetectorBStats();
  const statsE = getRadDetectorEStats();
  const doseSeriesData = getRadDoseSeries();

  const [unitMode, setUnitMode] = useState<"hourly" | "daily">("hourly");

  // Chart series for Detector B and Detector E
  const chartSeries: ChartSeries[] = [
    {
      id: "det-b-silicon",
      name: `Detector B (Silicon, 300 µm) [${unitMode === "hourly" ? "µGy/hr" : "µGy/day"}]`,
      color: "#38bdf8", // Sky blue
      unit: unitMode === "hourly" ? "µGy/hr" : "µGy/day",
      data: doseSeriesData.map((d) => ({
        x: d.index,
        label: `Obs ${d.index} (${d.hourLtst !== null ? `${d.hourLtst.toFixed(1)}h LTST` : "UTC"})`,
        y: unitMode === "hourly" ? d.doseRateB_uGy_hr : d.doseDailyB_uGy_day,
      })),
    },
    {
      id: "det-e-plastic",
      name: `Detector E (Plastic scintillator, 18 mm) [${unitMode === "hourly" ? "µGy/hr" : "µGy/day"}]`,
      color: "#ec4899", // Rose / pink
      unit: unitMode === "hourly" ? "µGy/hr" : "µGy/day",
      data: doseSeriesData.map((d) => ({
        x: d.index,
        label: `Obs ${d.index} (${d.hourLtst !== null ? `${d.hourLtst.toFixed(1)}h LTST` : "UTC"})`,
        y: unitMode === "hourly" ? d.doseRateE_uGy_hr : d.doseDailyE_uGy_day,
      })),
    },
  ];

  return (
    <section className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Activity className="h-5 w-5 text-rose-400" />
              Radiation — Curiosity RAD
            </h3>
            <span className="rounded bg-rose-950/70 border border-rose-800/80 px-2 py-0.5 text-[11px] font-medium text-rose-300">
              PDS PPI RDR
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Authentic ionizing radiation dosimetry from the MSL Radiation Assessment Detector
          </p>
        </div>

        {/* Rate unit toggle */}
        <div className="flex items-center rounded-md border border-slate-800 bg-slate-900/80 p-0.5 text-xs">
          <button
            onClick={() => setUnitMode("hourly")}
            className={`rounded px-2.5 py-1 transition-colors ${
              unitMode === "hourly" ? "bg-rose-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            µGy/hr
          </button>
          <button
            onClick={() => setUnitMode("daily")}
            className={`rounded px-2.5 py-1 transition-colors ${
              unitMode === "daily" ? "bg-rose-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            µGy/day
          </button>
        </div>
      </div>

      {/* Scientific Distinction Notice */}
      <div className="flex items-start gap-3 rounded-lg border border-rose-900/50 bg-rose-950/20 p-3.5 text-xs text-rose-200 leading-relaxed">
        <Shield className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
        <div>
          <strong>Scientific Distinction:</strong> REMS measures <em>non-ionizing</em> solar ultraviolet radiation (W/m²), whereas RAD measures <em>ionizing</em> radiation (Galactic Cosmic Rays and secondary particle showers in µGy/hr). These are fundamentally separate physical processes and are never combined or conflated.
        </div>
      </div>

      {/* Observation Metadata Banner */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-lg border border-slate-800/80 bg-slate-900/40 p-3 text-xs">
        <div>
          <span className="text-slate-500 block">Dataset ID</span>
          <span className="font-mono text-slate-200 text-[11px]">{meta.dataset_id}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Observation Sol</span>
          <span className="font-semibold text-slate-200 font-mono">Sol {meta.sol} (43 intervals)</span>
        </div>
        <div>
          <span className="text-slate-500 block">Quality Status</span>
          <span className="font-mono text-emerald-400">100% Nominal (QC 00000000)</span>
        </div>
        <div>
          <span className="text-slate-500 block">Archive Source</span>
          <a
            href={meta.pds_archive_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-rose-400 hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
          >
            PDS PPI / UCLA <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Detector Dosimetry Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Card 1: Detector B (Silicon) */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 transition-colors hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 text-sky-300">
              <Cpu className="h-4 w-4 text-sky-400" />
              Detector B — Silicon Planar
            </span>
            <span className="text-[10px] font-mono text-slate-500">300 µm thickness</span>
          </div>

          <div className="text-2xl font-bold font-mono text-slate-100 mb-1">
            {unitMode === "hourly"
              ? `${statsB?.mean_microgray_per_hour.toFixed(2)} µGy/hr`
              : `${statsB?.mean_microgray_per_day.toFixed(1)} µGy/day`}
            <span className="text-xs font-normal text-slate-400 ml-1.5">(sol mean)</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 border-t border-slate-800/80 pt-2 mt-2">
            <div>
              <span className="text-slate-500">Min Rate:</span>{" "}
              <span className="font-mono text-sky-300">
                {unitMode === "hourly"
                  ? `${statsB?.min_microgray_per_hour.toFixed(2)} µGy/hr`
                  : `${statsB?.min_microgray_per_day.toFixed(1)} µGy/day`}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Max Rate:</span>{" "}
              <span className="font-mono text-rose-300">
                {unitMode === "hourly"
                  ? `${statsB?.max_microgray_per_hour.toFixed(2)} µGy/hr`
                  : `${statsB?.max_microgray_per_day.toFixed(1)} µGy/day`}
              </span>
            </div>
            <div className="col-span-2 text-[11px] text-slate-500">
              Published Gale benchmark: ~210 µGy/day in silicon (Hassler et al. 2014)
            </div>
          </div>
        </div>

        {/* Card 2: Detector E (Tissue-Equivalent Plastic) */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 transition-colors hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 text-rose-300">
              <Layers className="h-4 w-4 text-rose-400" />
              Detector E — Plastic Scintillator
            </span>
            <span className="text-[10px] font-mono text-slate-500">BC-432 (18 mm, tissue-equiv.)</span>
          </div>

          <div className="text-2xl font-bold font-mono text-slate-100 mb-1">
            {unitMode === "hourly"
              ? `${statsE?.mean_microgray_per_hour.toFixed(2)} µGy/hr`
              : `${statsE?.mean_microgray_per_day.toFixed(1)} µGy/day`}
            <span className="text-xs font-normal text-slate-400 ml-1.5">(sol mean)</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 border-t border-slate-800/80 pt-2 mt-2">
            <div>
              <span className="text-slate-500">Min Rate:</span>{" "}
              <span className="font-mono text-sky-300">
                {unitMode === "hourly"
                  ? `${statsE?.min_microgray_per_hour.toFixed(2)} µGy/hr`
                  : `${statsE?.min_microgray_per_day.toFixed(1)} µGy/day`}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Max Rate:</span>{" "}
              <span className="font-mono text-rose-300">
                {unitMode === "hourly"
                  ? `${statsE?.max_microgray_per_hour.toFixed(2)} µGy/hr`
                  : `${statsE?.max_microgray_per_day.toFixed(1)} µGy/day`}
              </span>
            </div>
            <div className="col-span-2 text-[11px] text-slate-500">
              Published Gale benchmark: ~205 µGy/day in plastic (Hassler et al. 2014)
            </div>
          </div>
        </div>
      </div>

      {/* Observation Dose Rate Scatter/Line Chart */}
      <EnvironmentalChart
        title={`MSL RAD Sol ${meta.sol} Absorbed Dose Rates across 43 Calibrated Observations`}
        subtitle="Individual observation blocks (OBS000 to OBS042) synchronized with spacecraft clock"
        series={chartSeries}
        yLabel={`Absorbed Dose Rate (${unitMode === "hourly" ? "µGy/hr" : "µGy/day"})`}
        xLabel="Observation Block Number (0..42)"
        height={260}
      />

      {/* Scientific Analysis & Context Notes */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-xs space-y-3">
        <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
          <Info className="h-4 w-4 text-sky-400" />
          RAD Instrument Physics & Data Nuance
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-300">
          <div className="rounded border border-slate-800/80 bg-slate-950/40 p-2.5 space-y-1">
            <span className="font-semibold text-slate-200 block">Absorbed vs Equivalent Dose</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              RAD directly measures absorbed dose in microgray (µGy). Dose equivalent in microsievert (µSv) requires particle-by-particle Linear Energy Transfer (LET) spectra and radiation quality factor weighting Q(LET). On Mars, average Q ≈ 3.05 (Hassler et al. 2014), yielding ~0.64 mSv/day. Authentic RDR archives report absorbed dose; no speculative Sv conversion is invented here.
            </p>
          </div>

          <div className="rounded border border-slate-800/80 bg-slate-950/40 p-2.5 space-y-1">
            <span className="font-semibold text-slate-200 block">MMRTG Background Subtraction</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Curiosity carries an MMRTG power source at the rover aft. The MMRTG emits a constant small flux of secondary neutrons and gamma rays. The RAD science team measured this background during cruise and surface calibrations, subtracting it to isolate genuine galactic cosmic ray (GCR) dosimetry.
            </p>
          </div>

          <div className="rounded border border-slate-800/80 bg-slate-950/40 p-2.5 space-y-1">
            <span className="font-semibold text-slate-200 block">Atmospheric Column Shielding</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              The Martian atmosphere provides ~20 g/cm² of shielding at Gale Crater elevations. As surface atmospheric pressure fluctuates diurnally (7.7 to 8.6 hPa) and seasonally, the total overhead column mass modulates GCR penetration, causing slight inverse correlations between surface pressure and dose rate.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
