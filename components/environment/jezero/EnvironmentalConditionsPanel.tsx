"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Download } from "lucide-react";
import type {
  EnvironmentalSeries,
  JezeroEnvironmentalDataset,
  VerificationState,
} from "@/lib/environment/jezero/types";
import { toEnvironmentalDataset } from "@/lib/environment/jezero/adapter";
import {
  availabilityFor,
  seriesForQuantity,
  seriesForSol,
  solSummary,
} from "@/lib/environment/jezero/dataset";
import {
  cardinal,
  formatLs,
  formatLmst,
  formatUtcDate,
  formatValue,
  solLabel,
} from "@/lib/environment/jezero/format";
import { SERIES_COLORS, Sparkline, TimeSeriesChart } from "./TimeSeriesChart";
import { jezeroEnvironmentCss } from "./styles";

const numberFormat = new Intl.NumberFormat("en-US");

function statusClass(state: VerificationState): string {
  return `jz-dot jz-dot--${state.toLowerCase()}`;
}

function VerificationStrip({ dataset }: { dataset: JezeroEnvironmentalDataset }) {
  const items: { key: string; state: VerificationState; note: string }[] = [
    {
      key: "SOURCE_VERIFIED",
      state: dataset.sourceVerified,
      note: "PDS4 products, label-mapped columns, MD5 confirmed.",
    },
    {
      key: "PROCESSING_VERIFIED",
      state: dataset.processingVerified,
      note: "Documented 10-minute LMST means, sentinels filtered.",
    },
    {
      key: "REGISTRATION_VERIFIED",
      state: dataset.registrationVerified,
      note: "Rover-local point observations; no crater-wide registration.",
    },
  ];

  return (
    <div className="jz-verify">
      {items.map((item) => (
        <div className="jz-verify-item" key={item.key} data-testid={`jz-verify-${item.key}`}>
          <span className={statusClass(item.state)} aria-hidden="true" />
          <div>
            <div className="jz-verify-key">{item.key}</div>
            <div className="jz-verify-value">{item.state}</div>
            <p className="jz-verify-note">{item.note}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function EvidenceTag({ evidence }: { evidence: EnvironmentalSeries["evidence"] }) {
  const tone = evidence === "Observed" ? "jz-tag--obs" : evidence === "Derived" ? "jz-tag--der" : "";
  return <span className={`jz-tag ${tone}`}>{evidence}</span>;
}

function WeatherCard({
  title,
  series,
  value,
  unit,
  caption,
  foot,
  empty,
}: {
  title: string;
  series: EnvironmentalSeries[];
  value: ReactNode;
  unit: string;
  caption: string;
  foot: ReactNode;
  empty?: { text: string };
}) {
  if (empty) {
    return (
      <article className="jz-card jz-card--empty" data-testid={`jz-card-${slug(title)}`}>
        <div className="jz-card-top">
          <span className="jz-card-label">{title}</span>
        </div>
        <p className="jz-empty-title">Unavailable</p>
        <p className="jz-card-caption">{empty.text}</p>
      </article>
    );
  }

  return (
    <article className="jz-card" data-testid={`jz-card-${slug(title)}`}>
      <div className="jz-card-top">
        <span className="jz-card-label">{title}</span>
        {series[0] ? <EvidenceTag evidence={series[0].evidence} /> : null}
      </div>
      <div className="jz-card-value">
        <span className="jz-value">{value}</span>
        <span className="jz-unit">{unit}</span>
      </div>
      <p className="jz-card-caption">{caption}</p>
      <Sparkline series={series} />
      <div className="jz-card-foot">{foot}</div>
    </article>
  );
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function sampleFoot(series: EnvironmentalSeries[]): ReactNode {
  if (series.length === 0) return null;
  const valid = series.reduce((sum, entry) => sum + entry.summary.validSamples, 0);
  const excluded = series.reduce((sum, entry) => sum + entry.summary.excludedSamples, 0);
  const first = series[0].summary;
  return (
    <>
      <span>
        min {formatValue(first.min, series[0].unit)} · max{" "}
        {formatValue(first.max, series[0].unit)}
      </span>
      <span>{numberFormat.format(valid)} valid</span>
      {excluded > 0 ? <span>{numberFormat.format(excluded)} excluded</span> : null}
    </>
  );
}

function singleValue(series: EnvironmentalSeries[]): {
  value: string;
  unit: string;
  caption: string;
  foot: ReactNode;
} {
  if (series.length === 0) {
    return { value: "—", unit: "", caption: "Unavailable", foot: null };
  }
  const entry = series[0];
  return {
    value: formatValue(entry.summary.mean, entry.unit),
    unit: entry.unit,
    caption: "Mean of valid native samples",
    foot: sampleFoot(series),
  };
}

function ChartCard({
  title,
  sub,
  series,
  note,
  ariaLabel,
  wide,
  domain,
  digits,
  floorAtZero,
  legend = true,
}: {
  title: string;
  sub?: string;
  series: EnvironmentalSeries[];
  note?: string;
  ariaLabel: string;
  wide?: boolean;
  domain?: { min: number; max: number };
  digits?: number;
  floorAtZero?: boolean;
  legend?: boolean;
}) {
  return (
    <section className={`jz-chartcard ${wide ? "jz-chartcard--wide" : ""}`}>
      <div className="jz-chartcard-head">
        <h4 className="jz-chartcard-title">{title}</h4>
        {sub ? <span className="jz-chartcard-sub">{sub}</span> : null}
      </div>
      {legend && series.length > 1 ? (
        <div className="jz-legend">
          {series.map((entry, index) => (
            <span className="jz-legend-item" key={entry.id}>
              <span
                className="jz-swatch"
                style={{ background: SERIES_COLORS[index % SERIES_COLORS.length] }}
                aria-hidden="true"
              />
              {entry.displayName}
            </span>
          ))}
        </div>
      ) : null}
      <TimeSeriesChart
        series={series}
        ariaLabel={ariaLabel}
        domain={domain}
        digits={digits}
        floorAtZero={floorAtZero}
      />
      {note ? <p className="jz-chartcard-note">{note}</p> : null}
    </section>
  );
}

function EmptyState({
  title,
  children,
  testId,
}: {
  title: string;
  children: ReactNode;
  testId: string;
}) {
  return (
    <div className="jz-empty" data-testid={testId}>
      <p className="jz-empty-title">{title}</p>
      <p className="jz-empty-text">{children}</p>
    </div>
  );
}

export function EnvironmentalConditionsPanel({
  dataset,
  initialSol,
  className,
}: {
  dataset: JezeroEnvironmentalDataset;
  initialSol?: number;
  className?: string;
}) {
  const sols = dataset.displayWindow.solSelection;
  const [sol, setSol] = useState<number>(
    initialSol !== undefined && sols.includes(initialSol) ? initialSol : sols[0],
  );
  const summary = solSummary(sol, dataset);
  const series = useMemo(() => seriesForSol(sol, dataset), [dataset, sol]);

  const pick = (quantity: string) => seriesForQuantity(quantity, sol, dataset);
  const temperature = pick("air_temperature");
  const pressure = pick("surface_pressure");
  const humidity = pick("relative_humidity");
  const windSpeed = pick("horizontal_wind_speed");
  const windDirection = pick("wind_direction");
  const groundTemperature = pick("ground_brightness_temperature");
  const solarShortwave = pick("upward_shortwave_irradiance");
  const rdsUv = pick("photodiode_radiance_fov_integrated");

  const tempValues = temperature
    .map((entry) => entry.summary.mean)
    .filter((value): value is number => value !== null);
  const tempRange =
    tempValues.length > 0
      ? `${formatValue(Math.min(...tempValues), "K")}–${formatValue(Math.max(...tempValues), "K")}`
      : "—";

  const dust = availabilityFor("dust_optical_depth", dataset);
  const ionizing = availabilityFor("ionizing_radiation_dose", dataset);
  const solStart = summary?.lmstFirst ?? null;
  const solEnd = summary?.lmstLast ?? null;

  const handleDownloadDataset = () => {
    const exported = toEnvironmentalDataset(dataset, { sol });
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exported, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `jezero_environmental_dataset_sol_${sol}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <section className={`jz-env ${className ?? ""}`} aria-labelledby="jz-env-title" data-testid="jz-panel">
      <style>{jezeroEnvironmentCss}</style>

      <header className="jz-head">
        <div>
          <p className="jz-eyebrow">Environmental conditions</p>
          <h2 className="jz-title" id="jz-env-title">
            Environmental Conditions
          </h2>
          <p className="jz-subtitle">Jezero Crater · Perseverance Historical Observations</p>
        </div>
        <div className="jz-head-tags">
          <span className="jz-tag">MEDA</span>
          <span className="jz-tag">{solLabel(sol)}</span>
          <span className="jz-tag">Historical · not a forecast</span>
          <button
            type="button"
            onClick={handleDownloadDataset}
            className="jz-tag"
            style={{ cursor: "pointer", background: "var(--jz-raised)", border: "1px solid var(--jz-control)", color: "var(--jz-text)" }}
            title="Download Section 8 contract-compliant EnvironmentalDataset JSON"
          >
            <Download style={{ width: "12px", height: "12px", marginRight: "4px" }} aria-hidden="true" />
            Export JSON
          </button>
        </div>
      </header>

      <VerificationStrip dataset={dataset} />

      <div className="jz-toolbar">
        <div className="jz-field">
          <span className="jz-field-label" id="jz-sol-label">
            Observation sol
          </span>
          <div className="jz-sols" role="group" aria-labelledby="jz-sol-label">
            {sols.map((value) => {
              const entry = solSummary(value, dataset);
              return (
                <button
                  key={value}
                  type="button"
                  className="jz-sol"
                  aria-pressed={value === sol}
                  onClick={() => setSol(value)}
                  data-testid={`jz-sol-${value}`}
                  title={
                    entry
                      ? `${solLabel(value)} · ${formatLs(entry.stopLsDeg)} · ${formatUtcDate(entry.startUtc)} UTC`
                      : solLabel(value)
                  }
                >
                  {solLabel(value)}
                </button>
              );
            })}
          </div>
        </div>
        <p className="jz-sol-meta">
          {summary
            ? `${formatLs(summary.startLsDeg)} · ${formatUtcDate(summary.startUtc)} UTC · LMST ${formatLmst(solStart)}–${formatLmst(solEnd)}`
            : "No sol metadata"}
        </p>
      </div>

      <section className="jz-section" aria-labelledby="jz-weather-title">
        <div className="jz-section-head">
          <h3 className="jz-section-title" id="jz-weather-title">
            Weather
          </h3>
          <p className="jz-section-note">
            Sol {sol} · {numberFormat.format(series.length)} parsed series · 10-minute LMST bin means
          </p>
        </div>

        <div className="jz-cards">
          <WeatherCard
            title="Air temperature"
            series={temperature}
            value={tempRange}
            unit="K"
            caption={
              temperature.length > 1
                ? `Sol-mean range across ${temperature.length} ATS detectors; detectors are not averaged`
                : "Sol mean, single ATS detector"
            }
            foot={
              temperature.length > 0 ? (
                <span>{numberFormat.format(temperature.reduce((n, s) => n + s.summary.validSamples, 0))} valid samples</span>
              ) : null
            }
            empty={temperature.length === 0 ? { text: "No ATS product parsed for this sol." } : undefined}
          />

          <WeatherCard
            title="Surface pressure"
            series={pressure}
            value={pressure.length ? singleValue(pressure).value : "—"}
            unit="Pa"
            caption={pressure.length ? singleValue(pressure).caption : "Unavailable"}
            foot={pressure.length ? singleValue(pressure).foot : null}
            empty={pressure.length === 0 ? { text: "No derived PS product parsed for this sol." } : undefined}
          />

          <WeatherCard
            title="Relative humidity"
            series={humidity}
            value={humidity.length ? singleValue(humidity).value : "—"}
            unit="%"
            caption={humidity.length ? "Relative humidity, RHS (label declares no unit)" : "Unavailable"}
            foot={humidity.length ? singleValue(humidity).foot : null}
            empty={humidity.length === 0 ? { text: "No derived RHS product parsed for this sol." } : undefined}
          />

          <WeatherCard
            title="Wind speed"
            series={windSpeed}
            value={windSpeed.length ? singleValue(windSpeed).value : "—"}
            unit="m/s"
            caption={windSpeed.length ? "Horizontal wind, derived product" : "Unavailable"}
            foot={windSpeed.length ? singleValue(windSpeed).foot : null}
            empty={windSpeed.length === 0 ? { text: "No valid wind product parsed for this sol." } : undefined}
          />

          <WeatherCard
            title="Wind direction"
            series={windDirection}
            value={windDirection.length ? cardinal(windDirection[0].summary.mean) : "—"}
            unit={
              windDirection.length
                ? `from ${formatValue(windDirection[0].summary.mean, "degree")}°`
                : ""
            }
            caption={
              windDirection.length
                ? `From ${formatValue(windDirection[0].summary.mean, "degree")}° · circular mean`
                : "Unavailable"
            }
            foot={windDirection.length ? singleValue(windDirection).foot : null}
            empty={windDirection.length === 0 ? { text: "No valid wind direction parsed for this sol." } : undefined}
          />

          <WeatherCard
            title="Ground brightness temperature"
            series={groundTemperature}
            value={groundTemperature.length ? singleValue(groundTemperature).value : "—"}
            unit="K"
            caption={
              groundTemperature.length
                ? "TIRS 8–14 µm brightness temperature, not kinetic"
                : "Unavailable"
            }
            foot={groundTemperature.length ? singleValue(groundTemperature).foot : null}
            empty={
              groundTemperature.length === 0
                ? { text: "No unshadowed TIRS ground sample parsed for this sol." }
                : undefined
            }
          />
        </div>

        <div className="jz-charts">
          {temperature.length > 0 ? (
            <ChartCard
              title="Air temperature"
              sub="ATS · 5 detectors · K"
              series={temperature}
              ariaLabel={`Air temperature for sol ${sol}, five ATS detectors, Kelvin, 10-minute means over local mean solar time`}
              wide
              note="Each ATS detector is plotted separately. The sensors sit at different positions on the rover, so a single collapsed air temperature would be misleading."
            />
          ) : null}

          {pressure.length > 0 ? (
            <ChartCard
              title="Surface pressure"
              sub="PS derived · Pa"
              series={pressure}
              ariaLabel={`Surface pressure for sol ${sol}, pascals, 10-minute means over local mean solar time`}
            />
          ) : null}

          {humidity.length > 0 ? (
            <ChartCard
              title="Relative humidity"
              sub="RHS derived · %"
              series={humidity}
              ariaLabel={`Relative humidity for sol ${sol}, percent, 10-minute means over local mean solar time`}
              floorAtZero
              note="Relative humidity, not absolute humidity or water-vapour mixing ratio."
            />
          ) : null}

          {windSpeed.length > 0 ? (
            <ChartCard
              title="Wind speed"
              sub="WS derived · m/s"
              series={windSpeed}
              ariaLabel={`Horizontal wind speed for sol ${sol}, metres per second, 10-minute means over local mean solar time`}
              floorAtZero
              note="Invalid retrievals reported as the 999999999 sentinel are excluded, not set to zero."
            />
          ) : null}

          {windDirection.length > 0 ? (
            <ChartCard
              title="Wind direction"
              sub="WS derived · degrees from north"
              series={windDirection}
              ariaLabel={`Wind direction for sol ${sol}, degrees clockwise from north, 10-minute circular means over local mean solar time`}
              domain={{ min: 0, max: 360 }}
              digits={0}
              note="Direction the wind comes from, clockwise from north. Bins use a circular unit-vector mean."
            />
          ) : null}

          {groundTemperature.length > 0 ? (
            <ChartCard
              title="Ground brightness temperature"
              sub="TIRS 8–14 µm · K"
              series={groundTemperature}
              ariaLabel={`Ground brightness temperature for sol ${sol}, Kelvin, 10-minute means over local mean solar time`}
              note="Brightness temperature inferred from upward thermal-infrared radiance. It is not a kinetic surface temperature and assumes the documented emissivity model."
            />
          ) : null}
        </div>
      </section>

      <section className="jz-section" aria-labelledby="jz-solar-title">
        <div className="jz-section-head">
          <h3 className="jz-section-title" id="jz-solar-title">
            Solar / UV radiation
          </h3>
          <p className="jz-section-note">Genuine MEDA radiometric channels only</p>
        </div>

        {solarShortwave.length === 0 && rdsUv.length === 0 ? (
          <div style={{ marginTop: 16 }}>
            <EmptyState title="No verified solar/UV radiation observations are available in this dataset." testId="jz-solar-empty">
              No TIRS shortwave or RDS photodiode series was parsed for Sol {sol}.
            </EmptyState>
          </div>
        ) : null}

        <div className="jz-charts">
          {solarShortwave.length > 0 ? (
            <ChartCard
              title="Upward shortwave irradiance"
              sub="TIRS · 0.3–3 µm · W/m²"
              series={solarShortwave}
              ariaLabel={`Upward shortwave irradiance for sol ${sol}, watts per square metre, 0.3 to 3 micrometres, 10-minute means over local mean solar time`}
              note="Upward-looking hemispherical shortwave channel on the rover deck. It measures the radiation environment at the rover, not a crater-wide solar map."
            />
          ) : null}

          {rdsUv.length > 0 ? (
            <ChartCard
              title="UV photodiode radiance · RDS TOP-7"
              sub="RDS · FOV-integrated · W/m²"
              series={rdsUv}
              ariaLabel={`RDS TOP-7 UV photodiode radiance for sol ${sol}, watts per square metre integrated over the field of view, 10-minute means over local mean solar time`}
              floorAtZero
              note="The RDR product defines this as radiance integrated over the photodiode field of view. The label states no numeric bandpass, so this is not presented as spectral irradiance or as UV index."
            />
          ) : null}
        </div>

        <div className="jz-notes" style={{ marginTop: 16 }}>
          {ionizing ? (
            <div className="jz-note" data-testid="jz-ionizing-empty">
              <p className="jz-note-title">Ionizing radiation dose</p>
              <p className="jz-note-body">
                No verified local ionizing-dose measurement integrated. {ionizing.reason}
              </p>
            </div>
          ) : null}
          {dust ? (
            <div className="jz-note" data-testid="jz-dust-empty">
              <p className="jz-note-title">Dust optical depth</p>
              <p className="jz-note-body">{dust.reason}</p>
            </div>
          ) : null}
          <div className="jz-note">
            <p className="jz-note-title">Why RDS is not a dose readout</p>
            <p className="jz-note-body">
              MEDA&apos;s Radiation and Dust Sensor measures solar ultraviolet and visible
              radiation with upward-looking photodiodes. Its products are not galactic cosmic-ray
              dose, solar energetic-particle dose, absorbed dose, dose equivalent, or astronaut
              exposure, and they are never converted into those quantities here.
            </p>
          </div>
        </div>
      </section>

      <section className="jz-section" aria-labelledby="jz-source-title">
        <div className="jz-section-head">
          <h3 className="jz-section-title" id="jz-source-title">
            Source and limitations
          </h3>
        </div>

        <dl className="jz-dl">
          <div>
            <dt>Rover and region</dt>
            <dd>Mars 2020 Perseverance · Jezero Crater</dd>
          </div>
          <div>
            <dt>Instrument</dt>
            <dd>MEDA · Mars Environmental Dynamics Analyzer</dd>
          </div>
          <div>
            <dt>Dataset</dt>
            <dd>
              NASA PDS4{" "}
              <a href={dataset.bundleUrl} rel="noreferrer noopener" target="_blank">
                mars2020_meda
              </a>{" "}
              · DOI{" "}
              <a
                href={`https://doi.org/${dataset.datasetDoi}`}
                rel="noreferrer noopener"
                target="_blank"
              >
                {dataset.datasetDoi}
              </a>
            </dd>
          </div>
          <div>
            <dt>Sol and time basis</dt>
            <dd>
              {solLabel(sol)} · {formatLs(summary?.startLsDeg ?? null)} ·{" "}
              {formatUtcDate(summary?.startUtc ?? null)} UTC · LMST {formatLmst(solStart)}–
              {formatLmst(solEnd)}
            </dd>
          </div>
          <div>
            <dt>Aggregation</dt>
            <dd>{dataset.aggregation.method} Empty bins are omitted; nothing is interpolated.</dd>
          </div>
          <div>
            <dt>Direct versus derived</dt>
            <dd>
              ATS, TIRS and RDS values are calibrated measurements. PS, RHS and WS values come from
              derived products that inherit upstream calibration and retrieval assumptions.
            </dd>
          </div>
          <div>
            <dt>Registration</dt>
            <dd>
              {dataset.registrationVerified} — these are rover-local point observations at the
              Perseverance workspace, not area-wide Jezero Crater conditions.
            </dd>
          </div>
          <div>
            <dt>Historical data notice</dt>
            <dd>
              Historical observations from a specific sol. They do not predict future EVA
              conditions and are not a forecast.
            </dd>
          </div>
        </dl>

        {summary ? (
          <details className="jz-details">
            <summary>
              Product provenance · {summary.products.length} PDS4 products
              <span className="jz-chartcard-sub">Sol {sol}</span>
            </summary>
            <div className="jz-details-body">
              {summary.products.map((product) => (
                <div className="jz-product" key={product.productId}>
                  <div>
                    <a href={product.csvUrl} rel="noreferrer noopener" target="_blank">
                      <span className="jz-product-id">{product.productId}</span>
                    </a>
                    <div className="jz-chartcard-sub">
                      {product.sensorToken} · v{product.version} · {product.processingLevel}
                    </div>
                  </div>
                  <div className="jz-product-meta">
                    <div>{numberFormat.format(product.records)} records</div>
                    <div title={product.csvSha256}>sha256 {product.csvSha256.slice(0, 12)}…</div>
                  </div>
                </div>
              ))}
              <p className="jz-chartcard-note">
                Raw PDS CSVs are not committed. The build script verifies each payload against the
                MD5 declared in its PDS4 label before parsing.
              </p>
            </div>
          </details>
        ) : null}
      </section>

      <footer className="jz-foot">
        <span>Historical MEDA observation · not a forecast</span>
        <span>Rover-local, not crater-wide</span>
        <span>{dataset.datasetId}</span>
        <span>Generated {formatUtcDate(dataset.generatedAt)}</span>
      </footer>
    </section>
  );
}

export default EnvironmentalConditionsPanel;
