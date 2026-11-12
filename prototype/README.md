# Marswalk frontend prototype — Design System v2

Open `frontend_prototype.html` in a desktop or mobile browser. No development server or external dependencies are required. This historical standalone prototype is retained as a design reference; the shared application now runs from the repository root with `npm run dev`.

## Based on supplied `DESIGN.md`

- Dark mission-console theme using exact color tokens.
- Geist/IBM Plex Mono naming with system fallback (no font files distributed).
- 2D map-dominant layout, 340px mission panel, contextual comparison panel, responsive narrow-screen layout.
- Cyan route candidate and violet diamond stops, amber coverage outlines, map furniture and data status.
- Choose Jezero, Gale or Oxia; inspect and select example scientific objectives; configure round trip or one-way; review illustrative route variants; adjust planning reserve preference; save/reload locally; print demo mission brief.
- Demonstration artwork is *stylized and not georeferenced*. It is not NASA imagery. No real DEM, slope or safe path calculation is connected.
- Mission feasibility remains Unverified, aligned with the accepted product requirements.

## Scope reconciliation

The uploaded DESIGN.md mentions a rehearsal/simulated EVA screen and offline routing, whereas the previously agreed first-release product is **pre-mission planning only** with **cached maps/saved plans but no new route computations offline**. Therefore, this prototype does not implement rehearsal or offline route computation. Other source design details are carried over where appropriate.

## Implementation handoff

Keep this standalone prototype as the visual reference. Build production UI in Next.js/TypeScript with MapLibre GL JS, replacing the decorative SVG terrain with validated NASA/ESA georeferenced rasters and individual region manifests. Implement route computation with the shared FastAPI service. Do not convert the displayed decorative candidate geometry into validated outputs.

## Validation

- JavaScript parsed successfully with `node --check`.
- Automated browser rendering not completed: Playwright browser binary unavailable in the current environment.
