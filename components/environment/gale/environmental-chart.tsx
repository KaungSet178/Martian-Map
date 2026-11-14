"use client";

import React, { useState } from "react";

export interface ChartSeries {
  id: string;
  name: string;
  color: string;
  unit: string;
  data: { x: number; label: string; y: number | null }[];
}

interface EnvironmentalChartProps {
  title: string;
  subtitle?: string;
  series: ChartSeries[];
  yLabel: string;
  xLabel: string;
  yMinOverride?: number;
  yMaxOverride?: number;
  height?: number;
}

export function EnvironmentalChart({
  title,
  subtitle,
  series,
  yLabel,
  xLabel,
  yMinOverride,
  yMaxOverride,
  height = 240,
}: EnvironmentalChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    seriesName: string;
    label: string;
    val: number;
    unit: string;
    x: number;
    y: number;
  } | null>(null);

  // Compute overall min/max
  const allY = series.flatMap((s) =>
    s.data.map((d) => d.y).filter((v): v is number => v !== null && !isNaN(v))
  );

  if (allY.length === 0) {
    return (
      <div className="flex h-48 w-full flex-col items-center justify-center rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-center text-sm text-slate-400">
        <p className="font-medium text-slate-300">No verified observation available for this selected period.</p>
        <p className="text-xs text-slate-500 mt-1">Data gaps preserved per scientific archival standards.</p>
      </div>
    );
  }

  const rawMin = Math.min(...allY);
  const rawMax = Math.max(...allY);
  const padding = (rawMax - rawMin) * 0.1 || 1.0;
  const yMin = yMinOverride ?? Math.floor(rawMin - padding);
  const yMax = yMaxOverride ?? Math.ceil(rawMax + padding);
  const yRange = yMax - yMin || 1;

  // Chart layout dimensions
  const width = 640;
  const padLeft = 55;
  const padRight = 20;
  const padTop = 30;
  const padBottom = 40;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  // Compute all unique X values
  const allX = series[0]?.data.map((d) => d.x) ?? [];
  const xMin = allX.length > 0 ? Math.min(...allX) : 0;
  const xMax = allX.length > 0 ? Math.max(...allX) : 23;
  const xRange = xMax - xMin || 1;

  const scaleX = (x: number) => padLeft + ((x - xMin) / xRange) * plotWidth;
  const scaleY = (y: number) => padTop + plotHeight - ((y - yMin) / yRange) * plotHeight;

  // Generate 5 Y-ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((frac) => yMin + frac * yRange);

  return (
    <div className="w-full rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur-sm">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold tracking-wide text-slate-200">{title}</h4>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {series.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5 text-slate-300">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span>{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          aria-label={`${title} chart`}
        >
          {/* Horizontal grid lines */}
          {yTicks.map((tick, i) => {
            const yPos = scaleY(tick);
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={yPos}
                  x2={width - padRight}
                  y2={yPos}
                  stroke="#334155"
                  strokeDasharray="2,2"
                  strokeWidth="0.8"
                />
                <text
                  x={padLeft - 8}
                  y={yPos + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  {tick.toFixed(tick % 1 === 0 ? 0 : 1)}
                </text>
              </g>
            );
          })}

          {/* Y Axis Label */}
          <text
            x={12}
            y={height / 2}
            textAnchor="middle"
            transform={`rotate(-90 12 ${height / 2})`}
            className="fill-slate-400 text-[10px] font-medium tracking-wider"
          >
            {yLabel}
          </text>

          {/* X Axis ticks */}
          {allX
            .filter((_, idx) => idx % Math.ceil(allX.length / 8) === 0 || idx === allX.length - 1)
            .map((xVal, i) => {
              const xPos = scaleX(xVal);
              const label = series[0]?.data.find((d) => d.x === xVal)?.label ?? `${xVal}`;
              return (
                <g key={i}>
                  <line
                    x1={xPos}
                    y1={padTop + plotHeight}
                    x2={xPos}
                    y2={padTop + plotHeight + 4}
                    stroke="#475569"
                    strokeWidth="1"
                  />
                  <text
                    x={xPos}
                    y={padTop + plotHeight + 16}
                    textAnchor="middle"
                    className="fill-slate-400 text-[10px] font-mono"
                  >
                    {label}
                  </text>
                </g>
              );
            })}

          {/* X Axis Label */}
          <text
            x={padLeft + plotWidth / 2}
            y={height - 6}
            textAnchor="middle"
            className="fill-slate-400 text-[10px] font-medium"
          >
            {xLabel}
          </text>

          {/* Series lines & points */}
          {series.map((s) => {
            // Build segmented path to NOT draw across null gaps
            const segments: { x: number; y: number }[][] = [];
            let currentSeg: { x: number; y: number }[] = [];

            s.data.forEach((d) => {
              if (d.y !== null && !isNaN(d.y)) {
                currentSeg.push({ x: scaleX(d.x), y: scaleY(d.y) });
              } else {
                if (currentSeg.length > 0) {
                  segments.push(currentSeg);
                  currentSeg = [];
                }
              }
            });
            if (currentSeg.length > 0) {
              segments.push(currentSeg);
            }

            return (
              <g key={s.id}>
                {segments.map((seg, sIdx) => {
                  const dStr = seg
                    .map((pt, pIdx) => `${pIdx === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
                    .join(" ");
                  return (
                    <path
                      key={sIdx}
                      d={dStr}
                      fill="none"
                      stroke={s.color}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                })}

                {/* Individual observation points */}
                {s.data.map((d, dIdx) => {
                  if (d.y === null || isNaN(d.y)) return null;
                  const cx = scaleX(d.x);
                  const cy = scaleY(d.y);
                  return (
                    <circle
                      key={dIdx}
                      cx={cx}
                      cy={cy}
                      r="3"
                      fill={s.color}
                      className="cursor-pointer transition-transform hover:scale-150"
                      onMouseEnter={() =>
                        setHoveredPoint({
                          seriesName: s.name,
                          label: d.label,
                          val: d.y as number,
                          unit: s.unit,
                          x: cx,
                          y: cy,
                        })
                      }
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Hover tooltip inside SVG */}
          {hoveredPoint && (
            <g transform={`translate(${Math.min(hoveredPoint.x + 8, width - 130)}, ${Math.max(hoveredPoint.y - 25, padTop + 5)})`}>
              <rect
                x="0"
                y="0"
                width="120"
                height="32"
                rx="4"
                fill="#0f172a"
                stroke="#475569"
                strokeWidth="1"
                className="shadow-lg opacity-95"
              />
              <text x="6" y="13" className="fill-slate-300 text-[9px] font-sans">
                {hoveredPoint.label} · {hoveredPoint.seriesName}
              </text>
              <text x="6" y="25" className="fill-cyan-400 text-[11px] font-mono font-bold">
                {hoveredPoint.val.toFixed(2)} {hoveredPoint.unit}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
