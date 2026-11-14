"use client";

import React, { useState } from "react";
import {
  Thermometer,
  Gauge,
  Sun,
  Wind,
  Droplets,
  AlertTriangle,
  Clock,
  Layers,
} from "lucide-react";
import {
  getGaleSol100Weather,
  getDiurnalTemperatureSeries,
  getDiurnalPressureSeries,
  getDiurnalUvSeries,
  getDiurnalWindSeries,
} from "@/lib/environment/gale/rems-data";
import { EnvironmentalChart, type ChartSeries } from "./environmental-chart";

export function WeatherSection() {
  const dataset = getGaleSol100Weather();
  const summary = dataset.sol_summary;
  const meta = dataset.metadata;

  const [tempUnit, setTempUnit] = useState<"C" | "K">("C");
  const [pressureUnit, setPressureUnit] = useState<"hPa" | "Pa">("hPa");
  const [activeTab, setActiveTab] = useState<"temperature" | "pressure" | "uv" | "wind">("temperature");

  const toDisplayTemp = (valC: number | null): string => {
    if (valC === null) return "--";
    if (tempUnit === "K") {
      return (valC + 273.15).toFixed(1) + " K";
    }
    return valC.toFixed(1) + " °C";
  };

  const toDisplayPressure = (valHpa: number | null): string => {
    if (valHpa === null) return "--";
    if (pressureUnit === "Pa") {
      return (valHpa * 100).toFixed(0) + " Pa";
    }
    return valHpa.toFixed(2) + " hPa";
  };

  // Prepare chart series
  const { air: airSeriesData, ground: groundSeriesData } = getDiurnalTemperatureSeries();
  const tempSeries: ChartSeries[] = [
    {
      id: "air-temp",
      name: `Air Temperature (${tempUnit === "C" ? "°C" : "K"})`,
      color: "#38bdf8", // Sky blue
      unit: tempUnit === "C" ? "°C" : "K",
      data: airSeriesData.map((d) => ({
        x: d.hour,
        label: d.label,
        y: d.value !== null ? (tempUnit === "K" ? d.value + 273.15 : d.value) : null,
      })),
    },
    {
      id: "ground-temp",
      name: `Ground Temperature (${tempUnit === "C" ? "°C" : "K"})`,
      color: "#fb923c", // Warm amber/orange
      unit: tempUnit === "C" ? "°C" : "K",
      data: groundSeriesData.map((d) => ({
        x: d.hour,
        label: d.label,
        y: d.value !== null ? (tempUnit === "K" ? d.value + 273.15 : d.value) : null,
      })),
    },
  ];

  const pressureRaw = getDiurnalPressureSeries();
  const pressureSeries: ChartSeries[] = [
    {
      id: "pressure",
      name: `Pressure (${pressureUnit})`,
      color: "#a855f7", // Purple
      unit: pressureUnit,
      data: pressureRaw.map((d) => ({
        x: d.hour,
        label: d.label,
        y: d.value !== null ? (pressureUnit === "Pa" ? d.value * 100 : d.value) : null,
      })),
    },
  ];

  const uvRaw = getDiurnalUvSeries();
  const uvSeries: ChartSeries[] = [
    {
      id: "uv-abc",
      name: "UV-ABC Solar Irradiance (W/m²)",
      color: "#facc15", // Yellow
      unit: "W/m²",
      data: uvRaw.map((d) => ({
        x: d.hour,
        label: d.label,
        y: d.value,
      })),
    },
  ];

  const windRaw = getDiurnalWindSeries();
  const windSeries: ChartSeries[] = [
    {
      id: "wind-speed",
      name: "Wind Speed (m/s) [Sparse]",
      color: "#34d399", // Emerald
      unit: "m/s",
      data: windRaw.map((d) => ({
        x: d.hour,
        label: d.label,
        y: d.value,
      })),
    },
  ];

  return (
    <section className="space-y-6">
      {/* Section Header & Subtitle */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-sky-400" />
              Surface Weather — Curiosity REMS
            </h3>
            <span className="rounded bg-sky-950/70 border border-sky-800/80 px-2 py-0.5 text-[11px] font-medium text-sky-300">
              PDS4 MODRDR
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Calibrated 1 Hz environmental time series from the Rover Environmental Monitoring Station
          </p>
        </div>

        {/* Units and Season Indicators */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center rounded-md border border-slate-800 bg-slate-900/80 p-0.5">
            <button
              onClick={() => setTempUnit("C")}
              className={`rounded px-2 py-1 transition-colors ${
                tempUnit === "C" ? "bg-sky-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              °C
            </button>
            <button
              onClick={() => setTempUnit("K")}
              className={`rounded px-2 py-1 transition-colors ${
                tempUnit === "K" ? "bg-sky-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Kelvin
            </button>
          </div>

          <div className="flex items-center rounded-md border border-slate-800 bg-slate-900/80 p-0.5">
            <button
              onClick={() => setPressureUnit("hPa")}
              className={`rounded px-2 py-1 transition-colors ${
                pressureUnit === "hPa" ? "bg-purple-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              hPa
            </button>
            <button
              onClick={() => setPressureUnit("Pa")}
              className={`rounded px-2 py-1 transition-colors ${
                pressureUnit === "Pa" ? "bg-purple-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Pa
            </button>
          </div>
        </div>
      </div>

      {/* Sol Context Banner */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-lg border border-slate-800/80 bg-slate-900/40 p-3 text-xs">
        <div>
          <span className="text-slate-500 block">Observation Sol</span>
          <span className="font-semibold text-slate-200 font-mono">Sol {meta.sol}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Season / Orbit</span>
          <span className="font-semibold text-slate-200">
            MY{meta.martian_year} (L<sub>s</sub> {meta.solar_longitude_ls_deg}°)
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Time Span (UTC)</span>
          <span className="font-mono text-slate-300 text-[11px] truncate block" title={`${meta.start_utc} to ${meta.end_utc}`}>
            2012-11-16 — 11-17
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Calibrated Records</span>
          <span className="font-mono text-slate-200">{meta.total_calibrated_records.toLocaleString()}</span>
        </div>
      </div>

      {/* Observation Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Air Temperature */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 transition-colors hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Thermometer className="h-4 w-4 text-sky-400" />
              Air Temperature
            </span>
            <span className="text-[10px] font-mono text-slate-500">GT_AMB</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 mb-1">
            {toDisplayTemp(summary.air_temperature_c.mean)}
            <span className="text-xs font-normal text-slate-400 ml-1.5">(mean)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 border-t border-slate-800/80 pt-2 mt-2">
            <div>
              <span className="text-slate-500">Min (Dawn):</span>{" "}
              <span className="font-mono text-sky-300">{toDisplayTemp(summary.air_temperature_c.min)}</span>
            </div>
            <div>
              <span className="text-slate-500">Max (Aft):</span>{" "}
              <span className="font-mono text-amber-300">{toDisplayTemp(summary.air_temperature_c.max)}</span>
            </div>
            <div className="col-span-2 text-[11px] text-slate-500">
              Diurnal swing: <span className="font-mono text-slate-300">{summary.air_temperature_c.diurnal_range_c}°C</span>
            </div>
          </div>
        </div>

        {/* Card 2: Ground Temperature */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 transition-colors hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-amber-400" />
              Ground Temperature
            </span>
            <span className="text-[10px] font-mono text-slate-500">GT_GRD</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 mb-1">
            {toDisplayTemp(summary.ground_temperature_c.mean)}
            <span className="text-xs font-normal text-slate-400 ml-1.5">(mean)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 border-t border-slate-800/80 pt-2 mt-2">
            <div>
              <span className="text-slate-500">Min (05:00):</span>{" "}
              <span className="font-mono text-sky-300">{toDisplayTemp(summary.ground_temperature_c.min)}</span>
            </div>
            <div>
              <span className="text-slate-500">Max (Noon):</span>{" "}
              <span className="font-mono text-amber-300">{toDisplayTemp(summary.ground_temperature_c.max)}</span>
            </div>
            <div className="col-span-2 text-[11px] text-slate-500">
              Diurnal swing: <span className="font-mono text-slate-300">{summary.ground_temperature_c.diurnal_range_c}°C</span>
            </div>
          </div>
        </div>

        {/* Card 3: Atmospheric Pressure */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 transition-colors hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Gauge className="h-4 w-4 text-purple-400" />
              Surface Pressure
            </span>
            <span className="text-[10px] font-mono text-slate-500">PRESSURE</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 mb-1">
            {toDisplayPressure(summary.pressure_hpa.mean)}
            <span className="text-xs font-normal text-slate-400 ml-1.5">(mean)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 border-t border-slate-800/80 pt-2 mt-2">
            <div>
              <span className="text-slate-500">Trough:</span>{" "}
              <span className="font-mono text-purple-300">{toDisplayPressure(summary.pressure_hpa.min)}</span>
            </div>
            <div>
              <span className="text-slate-500">Peak:</span>{" "}
              <span className="font-mono text-purple-300">{toDisplayPressure(summary.pressure_hpa.max)}</span>
            </div>
            <div className="col-span-2 text-[11px] text-slate-500">
              Thermal tide amplitude: <span className="font-mono text-slate-300">{summary.pressure_hpa.diurnal_amplitude_hpa} hPa</span>
            </div>
          </div>
        </div>

        {/* Card 4: Relative Humidity */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 transition-colors hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Droplets className="h-4 w-4 text-cyan-400" />
              Relative Humidity
            </span>
            <span className="text-[10px] font-mono text-slate-500">HUM_HUM</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 mb-1">
            {summary.relative_humidity_pct.mean?.toFixed(1) ?? "--"} %
            <span className="text-xs font-normal text-slate-400 ml-1.5">(mean)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 border-t border-slate-800/80 pt-2 mt-2">
            <div>
              <span className="text-slate-500">Day Min:</span>{" "}
              <span className="font-mono text-slate-300">{summary.relative_humidity_pct.min?.toFixed(1) ?? "--"} %</span>
            </div>
            <div>
              <span className="text-slate-500">Night Peak:</span>{" "}
              <span className="font-mono text-cyan-300">{summary.relative_humidity_pct.max?.toFixed(1) ?? "--"} %</span>
            </div>
            <div className="col-span-2 text-[11px] text-slate-500">
              Water vapor adsorption onto soil grains at night
            </div>
          </div>
        </div>

        {/* Card 5: Solar UV Flux */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 transition-colors hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Sun className="h-4 w-4 text-yellow-400" />
              Solar UV Irradiance
            </span>
            <span className="text-[10px] font-mono text-slate-500">UV_ABC</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 mb-1">
            {summary.uv_abc_w_m2.peak?.toFixed(2) ?? "--"} W/m²
            <span className="text-xs font-normal text-slate-400 ml-1.5">(solar noon peak)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 border-t border-slate-800/80 pt-2 mt-2">
            <div>
              <span className="text-slate-500">Daytime Mean:</span>{" "}
              <span className="font-mono text-yellow-300">{summary.uv_abc_w_m2.mean_daytime?.toFixed(2) ?? "--"} W/m²</span>
            </div>
            <div>
              <span className="text-slate-500">Night (00-05h):</span>{" "}
              <span className="font-mono text-slate-400">0.00 W/m²</span>
            </div>
            <div className="col-span-2 text-[11px] text-slate-500">
              Non-ionizing solar UV (200–380 nm photodiode channels)
            </div>
          </div>
        </div>

        {/* Card 6: Wind Limitations */}
        <div className="rounded-lg border border-amber-900/40 bg-slate-900/60 p-4 transition-colors hover:border-amber-700/60">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 text-amber-300">
              <Wind className="h-4 w-4 text-amber-400" />
              Wind Measurements
            </span>
            <span className="text-[10px] font-mono text-amber-400/80">SPARSE (0.1%)</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-200 mb-1">
            {summary.wind_speed_m_s.mean !== null ? `${summary.wind_speed_m_s.mean.toFixed(1)} m/s` : "Limited"}
            <span className="text-xs font-normal text-slate-400 ml-1.5">
              ({summary.wind_speed_m_s.valid_samples} valid points)
            </span>
          </div>
          <div className="text-[11px] text-amber-400/90 border-t border-slate-800/80 pt-2 mt-2 leading-relaxed">
            Boom 1 wind sensor wire severed during landing. Boom 2 operated intermittently. No continuous hourly curve is interpolated.
          </div>
        </div>
      </div>

      {/* Interactive Diurnal Time-Series Charts */}
      <div className="space-y-3">
        {/* Chart Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2 text-xs">
          <span className="text-slate-400 mr-2 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> Diurnal Profiles:
          </span>
          <button
            onClick={() => setActiveTab("temperature")}
            className={`rounded px-3 py-1.5 transition-colors font-medium ${
              activeTab === "temperature"
                ? "bg-slate-800 text-sky-400 border border-slate-700 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Temperature (Air vs Ground)
          </button>
          <button
            onClick={() => setActiveTab("pressure")}
            className={`rounded px-3 py-1.5 transition-colors font-medium ${
              activeTab === "pressure"
                ? "bg-slate-800 text-purple-400 border border-slate-700 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Pressure (Thermal Tide)
          </button>
          <button
            onClick={() => setActiveTab("uv")}
            className={`rounded px-3 py-1.5 transition-colors font-medium ${
              activeTab === "uv"
                ? "bg-slate-800 text-yellow-400 border border-slate-700 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Solar UV-ABC Irradiance
          </button>
          <button
            onClick={() => setActiveTab("wind")}
            className={`rounded px-3 py-1.5 transition-colors font-medium ${
              activeTab === "wind"
                ? "bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Wind (Sparse Samples)
          </button>
        </div>

        {/* Selected Chart Rendering */}
        {activeTab === "temperature" && (
          <EnvironmentalChart
            title="Diurnal Surface & Atmospheric Temperature Cycle"
            subtitle="Local True Solar Time (LTST) 00:00 to 23:00 on Sol 100"
            series={tempSeries}
            yLabel={`Temperature (${tempUnit === "C" ? "°C" : "K"})`}
            xLabel="Martian Local True Solar Time (LTST)"
            height={260}
          />
        )}

        {activeTab === "pressure" && (
          <EnvironmentalChart
            title="Diurnal Atmospheric Pressure Tidal Wave"
            subtitle="Diurnal and semi-diurnal thermal tides in thin CO₂ atmosphere"
            series={pressureSeries}
            yLabel={`Pressure (${pressureUnit})`}
            xLabel="Martian Local True Solar Time (LTST)"
            height={260}
          />
        )}

        {activeTab === "uv" && (
          <EnvironmentalChart
            title="Solar Ultraviolet (UV-ABC) Irradiance"
            subtitle="Non-ionizing solar UV photodiode measurements across day and night"
            series={uvSeries}
            yLabel="UV Irradiance (W/m²)"
            xLabel="Martian Local True Solar Time (LTST)"
            height={260}
          />
        )}

        {activeTab === "wind" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-amber-900/50 bg-amber-950/30 p-3 text-xs text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              <span>
                <strong>Sparse Observation Notice:</strong> Out of 35,344 calibrated records on Sol 100, only 36 records have valid wind speed. Data points are shown only where authentic observations exist; missing hours are left unplotted per scientific archival protocol.
              </span>
            </div>
            <EnvironmentalChart
              title="Horizontal Wind Speed Observations"
              subtitle="Discrete valid wind records (missing hours preserved as gaps)"
              series={windSeries}
              yLabel="Wind Speed (m/s)"
              xLabel="Martian Local True Solar Time (LTST)"
              height={260}
            />
          </div>
        )}
      </div>
    </section>
  );
}
