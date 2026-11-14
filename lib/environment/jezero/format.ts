const COMPASS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
] as const;

/** Decimal digits that keep the displayed precision close to the source. */
export function precisionFor(unit: string): number {
  if (unit === "K" || unit === "Pa") return 1;
  if (unit === "%") return 1;
  if (unit === "m/s") return 2;
  if (unit === "degree") return 0;
  return 2;
}

/** Format a nullable number without ever rendering a missing value as zero. */
export function formatValue(
  value: number | null | undefined,
  unit: string,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toFixed(precisionFor(unit));
}

export function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

/** `43200` -> `12:00` (LMST, seconds after local mean solar midnight). */
export function formatLmst(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return "—";
  const wrapped = ((seconds % 86_400) + 86_400) % 86_400;
  const hours = Math.floor(wrapped / 3600);
  const minutes = Math.floor((wrapped % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatLmstWithSeconds(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return "—";
  const wrapped = ((seconds % 86_400) + 86_400) % 86_400;
  const hours = Math.floor(wrapped / 3600);
  const minutes = Math.floor((wrapped % 3600) / 60);
  const secs = Math.floor(wrapped % 60);
  return [hours, minutes, secs].map((part) => String(part).padStart(2, "0")).join(":");
}

export function cardinal(degrees: number | null | undefined): string {
  if (degrees === null || degrees === undefined || !Number.isFinite(degrees)) return "—";
  const index = Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16;
  return COMPASS[index];
}

export function formatLs(degrees: number | null | undefined): string {
  if (degrees === null || degrees === undefined || !Number.isFinite(degrees)) return "—";
  return `${degrees.toFixed(1)}° Ls`;
}

/** ISO timestamp -> `2021-06-05` (UTC), no local timezone reinterpretation. */
export function formatUtcDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
  return match ? match[1] : iso;
}

export function solLabel(sol: number): string {
  return `Sol ${sol}`;
}
