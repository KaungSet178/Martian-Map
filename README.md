# Marswalk Planner — Team Project Package

NASA Space Apps Challenge · Shared working handoff (11 November 2026)

## Contents
- `PRD.md`: working product requirements (v0.1), subject to team review.
- `DESIGN.md`: original team-supplied visual design system (unchanged).
- `prototype/frontend_prototype.html`: revised interactive 2D HTML prototype based on DESIGN.md. Open locally in a browser. Illustrative terrain and route previews only; not a MapLibre/NASA integration.
- `prototype/README.md`: prototype details and limits.
- `team/gale/CONTEXT.md`: Gale owner / shared integration.
- `team/jezero/CONTEXT.md`: Aung Khant Min / Jezero.
- `team/oxia/CONTEXT.md`: Thaw Thaw Tun / Oxia.
- `TEAM_CONTRACT.md`: region handoff and integration expectations.
- `region_manifest.example.json`: sample data shape.

## Parallel workflow
1. Everyone reads PRD.md, DESIGN.md, TEAM_CONTRACT.md.
2. Give each developer their `team/<region>/CONTEXT.md` in their coding agent workspace.
3. Use a shared frontend and map components, with independent region datasets and manifests.
4. The frontend prototype is for UX review, not a validated navigation system.
5. Scientific DEM footprints, hazard screening, and resource models still require validation before enabling detailed routing.

## Scope note
The source DESIGN.md includes an EVA rehearsal concept; accepted PRD decisions prioritize pre-mission planning for the first release. Do not treat rehearsal as committed first-release scope.
