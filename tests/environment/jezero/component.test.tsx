import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { EnvironmentalConditionsPanel } from "@/components/environment/jezero/EnvironmentalConditionsPanel";
import { jezeroEnvironmentalDataset } from "@/lib/environment/jezero/dataset";
import type { JezeroEnvironmentalDataset } from "@/lib/environment/jezero/types";

const dataset = jezeroEnvironmentalDataset;

function render(overrides?: Partial<JezeroEnvironmentalDataset>): string {
  return renderToStaticMarkup(
    <EnvironmentalConditionsPanel dataset={{ ...dataset, ...overrides }} />,
  );
}

test("panel renders the required title, subtitle and verification strip", () => {
  const html = render();
  assert.match(html, /Environmental Conditions/);
  assert.match(html, /Jezero Crater · Perseverance Historical Observations/);
  assert.match(html, /SOURCE_VERIFIED/);
  assert.match(html, /PROCESSING_VERIFIED/);
  assert.match(html, /REGISTRATION_VERIFIED/);
  assert.match(html, /NOT_EVALUATED/);
  assert.match(html, /rover-local/i);
  assert.doesNotMatch(html, /\bGale\b/);
});

test("panel renders every measured weather card with its unit", () => {
  const html = render();
  for (const label of [
    "Air temperature",
    "Surface pressure",
    "Relative humidity",
    "Wind speed",
    "Wind direction",
    "Ground brightness temperature",
  ]) {
    assert.ok(html.includes(label), `missing card ${label}`);
  }
  assert.match(html, /ATS detectors; detectors are not averaged/);
  assert.match(html, /8–14 µm brightness temperature, not kinetic/);
  assert.match(html, /label declares no unit/);
  assert.match(html, /not absolute humidity/);
});

test("panel keeps five ATS detectors in the temperature legend", () => {
  const html = render();
  const legend = html.match(/Air temperature, ATS \d/g) ?? [];
  assert.ok(new Set(legend).size >= 5);
});

test("panel reports solar/UV channels and refuses to invent ionizing dose", () => {
  const html = render();
  assert.match(html, /Upward shortwave irradiance/);
  assert.match(html, /0\.3–3 µm/);
  assert.match(html, /UV photodiode radiance · RDS TOP-7/);
  assert.match(html, /No verified local ionizing-dose measurement integrated/);
  assert.match(html, /Dust optical depth/);
  assert.match(html, /Why RDS is not a dose readout/);
  assert.match(html, /never converted/);
  assert.doesNotMatch(html, /dose equivalent chart/i);
  assert.doesNotMatch(html, /Gale RAD/);
});

test("empty dataset renders unavailable states instead of zeros", () => {
  const html = render({ series: [] });
  assert.match(html, /No ATS product parsed for this sol\./);
  assert.match(html, /No verified solar\/UV radiation observations are available in this dataset\./);
  assert.match(html, /No verified local ionizing-dose measurement integrated/);
  assert.doesNotMatch(html, />0\.0+</);
});

test("initialSol selects the requested sol and its label-info", () => {
  const html = renderToStaticMarkup(
    <EnvironmentalConditionsPanel dataset={dataset} initialSol={300} />,
  );
  assert.match(html, /Sol 300/);
  assert.match(html, /aria-pressed="true"[^>]*>Sol 300/);
  assert.match(html, /LMST \d{2}:\d{2}–\d{2}:\d{2}/);
});

test("panel states the aggregation method and the historical limitation", () => {
  const html = render();
  assert.match(html, /10-minute LMST bins/);
  assert.match(html, /Empty bins are omitted; nothing is interpolated\./);
  assert.match(html, /not a forecast/i);
  assert.match(html, /Historical observations from a specific sol/);
  assert.match(html, /10\.17189\/1522849/);
});
