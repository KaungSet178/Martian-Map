# Marswalk Planner — Team Project Package

## Shared frontend

The shared Next.js / TypeScript / MapLibre frontend lives at the repository root.
It implements the approved mission-console design for Jezero, Gale and Oxia.
**Scientific imagery, verified target geometry and planning services are not yet connected.**
The optional interface preview is schematic artwork, not a scientific map or calculated route.

Requires Node.js 20.9 or later and npm. Node 22 was used for verification.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. On Windows PowerShell with script execution restricted,
use `npm.cmd` and `npx.cmd` in place of `npm` and `npx`.

```sh
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm start
```

`predev` and `prebuild` copy the pinned MapLibre worker into ignored
`public/generated/` assets for same-origin loading. Font files are bundled locally.
Do not commit dependencies, build output or generated worker files.

Mission drafts use versioned browser storage. Save before leaving; Open restores
named plans and supports JSON import/export. Scientific estimates remain Unverified.
Region switching retains separate drafts during the session. A dataset-version
mismatch requires revalidation. Exported briefs explicitly document unavailable results.

See [frontend integration notes](docs/frontend-integration.md),
[UI/UX audit](docs/ui-ux-audit.md), and [verification report](docs/redesign-verification.md).

## Original project handoff

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
