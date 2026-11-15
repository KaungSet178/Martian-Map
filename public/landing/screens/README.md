# Aresian application captures

Captured from the real Next.js application on November 15, 2026, at 1280 × 850.
WebP encoding preserves the screenshot content; no synthetic maps, paths or
interface elements were added. The three `*-map.webp` files are direct browser
clips of the displayed map imagery for region cards.

| Files | Actual application state |
| --- | --- |
| `*-workspace.webp` | Science catalog and regional map for Jezero, Gale or Oxia |
| `jezero-catalog.webp` | Expanded science console with actual source-site summaries |
| `gale-route-*.webp` | Calculated Shortest / Lower terrain cost research alternatives |
| `gale-layer-*.webp` | Actual Gale raster-layer controls or historical REMS observations |
| `gale-assessment.webp` | All six operational assessments remain Unverified |

The route example uses **user-defined planning inputs**, not verified science
targets: base 137.38° E, −4.72° N; intermediate 137.40° E, −4.74° N; round trip.
The application calculated both alternatives using `gale-hrsc-30m`. Absolute
registration and operational feasibility remain unverified. No sample mission
is installed in visitors' storage.

Imagery credits and processing limitations are maintained in the existing
regional source registers: `regions/jezero`, `regions/gale`, and `regions/oxia`.
These screenshots are presentation assets, not scientific data products.

To refresh: run the application, capture the same real states in a clean browser
at 1280 × 850, and export WebP at quality 86. Keep file names in sync with
`components/landing/AppScreenshotFrame.tsx` and the selected records in
`components/landing/data.ts`. Region-card clips exclude interface controls.
