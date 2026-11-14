/**
 * Build a self-contained preview page for the Jezero environmental panel.
 *
 * The Next.js app is untouched: this script renders the panel with
 * `react-dom/server`, bundles a tiny hydration entry with esbuild, and writes
 * static HTML for three viewport widths. Playwright then screenshots and
 * interactively checks the same files.
 *
 * Usage:
 *   npx tsx team/environment/jezero/render_preview.tsx
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { renderToStaticMarkup } from "react-dom/server";
import { EnvironmentalConditionsPanel } from "@/components/environment/jezero/EnvironmentalConditionsPanel";
import { jezeroEnvironmentalDataset } from "@/lib/environment/jezero/dataset";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const OUT = path.join(HERE, "preview");

const WIDTHS = [
  { name: "desktop", css: 1440 },
  { name: "tablet", css: 768 },
  { name: "mobile", css: 390 },
] as const;

function shell(markup: string, width: number): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Jezero Environmental Conditions · ${width}px preview</title>
<style>
  :root {
    color-scheme: dark;
    --color-bg: #09111f;
    --color-surface: #111d30;
    --color-surface-raised: #1b2a40;
    --color-border: #334761;
    --color-control-border: #647c9a;
    --color-text: #f0f5fc;
    --color-text-muted: #a8b8cd;
    --color-route: #59e3fa;
    --color-science: #d0bdff;
    --color-caution: #ffc36b;
    --color-critical: #ff8d9a;
    --color-history: #d6dee8;
    font-family: Geist, system-ui, -apple-system, "Segoe UI", sans-serif;
    background: var(--color-bg);
    color: var(--color-text);
  }
  html, body { margin: 0; padding: 0; background: var(--color-bg); }
  body { padding: 24px; }
  #root { max-width: 1240px; margin: 0 auto; }
  @media (max-width: 720px) { body { padding: 12px; } }
</style>
</head>
<body>
<div id="root">${markup}</div>
<script src="./app.js" defer></script>
</body>
</html>
`;
}

async function main() {
  await mkdir(OUT, { recursive: true });

  await build({
    entryPoints: [path.join(HERE, "preview-client.tsx")],
    outfile: path.join(OUT, "app.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["chrome120"],
    jsx: "automatic",
    alias: { "@": ROOT },
    loader: { ".json": "json" },
    define: { "process.env.NODE_ENV": '"production"' },
    // Generated bundle: keep `npm run lint` clean without touching the shared
    // ESLint config. This directory is git-ignored and never shipped.
    banner: { js: "/* eslint-disable */" },
    logLevel: "warning",
  });

  const markup = renderToStaticMarkup(
    <EnvironmentalConditionsPanel dataset={jezeroEnvironmentalDataset} />,
  );

  for (const width of WIDTHS) {
    const file = path.join(OUT, `jezero-${width.css}.html`);
    await writeFile(file, shell(markup, width.css), "utf8");
    console.log(`wrote ${path.relative(ROOT, file)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
