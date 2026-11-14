"use client";

import type { EnvironmentalSeries, SeriesPoint } from "@/lib/environment/jezero/types";
import { formatValue } from "@/lib/environment/jezero/format";

export const SERIES_COLORS = [
  "#59E3FA",
  "#D0BDFF",
  "#FFC36B",
  "#7CE0B8",
  "#FF8D9A",
  "#D6DEE8",
] as const;

type Bounds = { min: number; max: number };

function boundsFor(points: SeriesPoint[]): Bounds | null {
  const values = points
    .map((point) => point.v)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  if (values.length === 0) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}

function combineBounds(series: EnvironmentalSeries[]): Bounds | null {
  const all = series
    .map((entry) => boundsFor(entry.points))
    .filter((entry): entry is Bounds => entry !== null);
  if (all.length === 0) return null;
  return {
    min: Math.min(...all.map((entry) => entry.min)),
    max: Math.max(...all.map((entry) => entry.max)),
  };
}

/**
 * Split a series into contiguous runs.
 *
 * A run breaks whenever the gap between consecutive bins exceeds one bin plus
 * half a bin of tolerance. This draws no line across a missing interval, so the
 * chart cannot imply interpolated data.
 */
function segments(points: SeriesPoint[], binSeconds: number): SeriesPoint[][] {
  const runs: SeriesPoint[][] = [];
  let current: SeriesPoint[] = [];
  for (const point of points) {
    if (point.v === null) {
      if (current.length) runs.push(current);
      current = [];
      continue;
    }
    const previous = current[current.length - 1];
    if (previous && point.t - previous.t > binSeconds * 1.5) {
      runs.push(current);
      current = [];
    }
    current.push(point);
  }
  if (current.length) runs.push(current);
  return runs;
}

function pathFor(
  run: SeriesPoint[],
  scaleX: (t: number) => number,
  scaleY: (v: number) => number,
): string {
  return run
    .map((point, index) => {
      const x = scaleX(point.t).toFixed(2);
      const y = scaleY(point.v as number).toFixed(2);
      return `${index === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");
}

export function TimeSeriesChart({
  series,
  ariaLabel,
  height = 168,
  domain,
  digits,
  floorAtZero = false,
  className,
}: {
  series: EnvironmentalSeries[];
  ariaLabel: string;
  height?: number;
  domain?: Bounds;
  digits?: number;
  /** Keep the y axis from dipping below zero for strictly non-negative quantities. */
  floorAtZero?: boolean;
  className?: string;
}) {
  const usable = series.filter((entry) => entry.points.length > 0);
  const unit = usable[0]?.unit ?? "";
  const base = domain ?? combineBounds(usable);
  const bounds: Bounds = base
    ? base
    : { min: 0, max: 1 };
  const span = bounds.max - bounds.min;
  const pad = domain ? 0 : span === 0 ? (Math.abs(bounds.max) || 1) * 0.1 : span * 0.08;
  const low = floorAtZero ? Math.max(0, bounds.min - pad) : bounds.min - pad;
  const high = bounds.max + pad;
  const range = high - low || 1;

  const scaleY = (value: number) => 1000 - ((value - low) / range) * 1000;
  const scaleX = (seconds: number) => (seconds / 86_400) * 1000;

  const label = (value: number) =>
    digits === undefined ? formatValue(value, unit) : value.toFixed(digits);

  const ticks = [high, (high + low) / 2, low];

  return (
    <figure className={`jz-chart ${className ?? ""}`}>
      <div className="jz-chart-frame">
        <div className="jz-chart-yaxis" aria-hidden="true">
          {ticks.map((tick, index) => (
            <span key={index}>{label(tick)}</span>
          ))}
        </div>
        <div className="jz-chart-plot" style={{ height }}>
          <svg
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            role="img"
            aria-label={ariaLabel}
            focusable="false"
          >
            <title>{ariaLabel}</title>
            {[0, 250, 500, 750, 1000].map((x) => (
              <line
                key={`v${x}`}
                x1={x}
                x2={x}
                y1={0}
                y2={1000}
                className="jz-chart-grid"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {[0, 500, 1000].map((y) => (
              <line
                key={`h${y}`}
                x1={0}
                x2={1000}
                y1={y}
                y2={y}
                className="jz-chart-grid"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {usable.map((entry, index) => {
              const colour = SERIES_COLORS[index % SERIES_COLORS.length];
              const bin = entry.aggregation.binSeconds;
              return segments(entry.points, bin).map((run, runIndex) => {
                if (run.length === 1) {
                  const point = run[0];
                  const x = scaleX(point.t).toFixed(2);
                  const y = scaleY(point.v as number).toFixed(2);
                  return (
                    <line
                      key={`${entry.id}-dot-${runIndex}`}
                      x1={x}
                      x2={x}
                      y1={y}
                      y2={y}
                      stroke={colour}
                      strokeWidth={3}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                }
                return (
                  <path
                    key={`${entry.id}-${runIndex}`}
                    d={pathFor(run, scaleX, scaleY)}
                    fill="none"
                    stroke={colour}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  >
                    <title>{`${entry.displayName}: ${run.length} bins, ${formatValue(
                      Math.min(...run.map((point) => point.v as number)),
                      unit,
                    )} to ${formatValue(
                      Math.max(...run.map((point) => point.v as number)),
                      unit,
                    )} ${unit}`}</title>
                  </path>
                );
              });
            })}
          </svg>
          <span className="jz-chart-unit" aria-hidden="true">
            {unit}
          </span>
        </div>
      </div>
      <div className="jz-chart-xaxis" aria-hidden="true">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>
      <figcaption className="jz-chart-caption">
        LMST {formatLmstRange(usable)}
      </figcaption>
    </figure>
  );
}

function formatLmstRange(series: EnvironmentalSeries[]): string {
  const firsts = series
    .map((entry) => entry.summary.firstLmstSeconds)
    .filter((value): value is number => value !== null);
  const lasts = series
    .map((entry) => entry.summary.lastLmstSeconds)
    .filter((value): value is number => value !== null);
  if (firsts.length === 0 || lasts.length === 0) return "not available";
  return `${clock(Math.min(...firsts))}–${clock(Math.max(...lasts))}`;
}

function clock(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function Sparkline({
  series,
  height = 34,
}: {
  series: EnvironmentalSeries[];
  height?: number;
}) {
  const usable = series.filter((entry) => entry.points.length > 0);
  const bounds = combineBounds(usable);
  if (!bounds) return null;
  const pad = bounds.max - bounds.min === 0 ? 1 : (bounds.max - bounds.min) * 0.12;
  const low = bounds.min - pad;
  const high = bounds.max + pad;
  const range = high - low || 1;
  const scaleY = (value: number) => 100 - ((value - low) / range) * 100;
  const scaleX = (seconds: number) => (seconds / 86_400) * 200;

  return (
    <svg
      className="jz-spark"
      viewBox="0 0 200 100"
      preserveAspectRatio="none"
      style={{ height }}
      aria-hidden="true"
      focusable="false"
    >
      {usable.map((entry, index) =>
        segments(entry.points, entry.aggregation.binSeconds).map((run, runIndex) => (
          <path
            key={`${entry.id}-${runIndex}`}
            d={pathFor(run, scaleX, scaleY)}
            fill="none"
            stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )),
      )}
    </svg>
  );
}
