# F2 + verified science-site integration

## Verified inputs

- Foundation: `deploy/railway-marswalk` at `f5dc457edd70171b29e4add916d270aa8e4d8b1b`.
- F2: `feat/f2-ui-ux-refinement` at `9da2c890df26ec765e2e4b73e45c4742d3e8c2df`.
- Science visibility: `fix/verified-science-site-visibility` at `21deb64f2becd0d9289d13f9fdc16be64775eddd`.

All three remote HEADs matched the supplied versions. Integration was performed in the isolated `.worktrees/f2-science-final` worktree on `integration/f2-science-final`.

## Merge review

Both merges completed without textual conflicts. The automatic merges in `components/map/map-workspace.tsx`, `components/planner.tsx`, `app/globals.css` and `lib/map/region-layers.ts` were reviewed. Deployment's automatic USGS Color basemap controller and four simplified science-layer categories remain byte-identical to the foundation. F2's console behavior and palette coexist with science-site counts, location statuses, original coordinate precision and eligible source-located markers.

The only integration-specific application adjustment is CSS: use the F2 surface token and square corners for the incoming science-site summary; wrap disclosure headings and long coordinates on mobile. No whole-file conflict replacement was used.

Changed application files comprise the existing F2 presentation changes (`app` shell/environment pages, environmental styles/chart colors, planner/map presentation, waypoint/route display colors and Oxia legend colors), plus the science catalog/site components and the read-only objective summary helpers in `lib/science/sites.ts`. The final Git diff provides the exact file list. Source datasets, `lib/science/sites.json`, source coordinates, eligibility rules, routing engines, EVA calculations, mission persistence/export formats, Docker configuration and `/api/health` are unchanged. Map route files change paint colors only. Jezero Slope remains disabled; no geological overlays or automatic unregistered-site routing were enabled.

## Focused checks

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed, all nine pages generated.
- `npx tsx --test tests/science-site-visibility.test.tsx tests/color-basemap.test.ts tests/scientific-categories.test.ts`: **14 passed**.
- `tests/browser/f2-science-integration.spec.ts`: **2 Chromium production-build smoke tests passed**, at 1440×900 and 390×844.

The smoke checks cover console expansion/collapse/reopening, separate Layers open/close, successful USGS Color tile loading without fallback, four Gale scientific categories, accessible map controls, updated F2 catalog counts/statuses, source coordinates in disclosures, disabled terrain-waypoint actions, 11 eligible Jezero source-located markers, accessible manual route planning and zero uncaught browser runtime errors. The initial smoke assertion needed to open a collapsed site disclosure before checking its disabled button; application safeguards were unchanged.

Screenshots are generated under `output/playwright/integration-{gale,sites,plan}-{1440,390}.png`. The historical routing, EVA, scientific-source and full browser suites were intentionally not repeated.

## Deployment handoff

Before promotion the existing public `/api/health` returned HTTP 200 with `{"status":"ok","service":"marswalk-planner"}`. Railway CLI/account access is unavailable and the Railway plugin is not connected. Public readiness checks can establish which UI is being served, but Railway dashboard build logs and the deployment's exact Git SHA require account access. Do not infer successful deployment of this commit merely from an already-healthy endpoint.

The verified staging commit is to be pushed first, checked for a clean worktree and reviewed against the current deployment branch, then promoted with a normal fast-forward Git push. Main, release, feature branches and the existing deployment worktree are not edited. The delivery response records the resulting staging/deployment SHAs and post-promotion public status.
