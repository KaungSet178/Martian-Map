# Marswalk shared frontend — delivery and verification

Verified locally on 12 November 2026, on `feat/shared-ui-redesign`.

## Delivered

- Shared Next.js 16.4.6 / React 19 / TypeScript application with MapLibre GL JS 6.18.0.
- Exact DESIGN.md semantic palette, local Geist / IBM Plex Mono fonts, restrained console surfaces and reusable controls.
- Region-driven Jezero/Gale/Oxia workspace; separate session drafts, URL region identity, and an explicit planned-area label for Oxia.
- Stable MapLibre camera and ResizeObserver sizing; own-origin worker packaging; keyboard/touch zoom/reset; optional schematic preview with no scientific coordinates or route claims.
- Catalog and map objective inspection with shared selected IDs, numbered selected stops, add/remove actions and proposed activities.
- Per-objective ordering and removal, round-trip / one-way settings, independent oxygen and battery reserve preferences, recovery assumptions and missing-input explanations.
- Safest / fastest / science-focused readiness views that explain their unavailable inputs. No fabricated route paths or metrics.
- Six mandatory Unverified assessments with tested failure/unknown/caution/pass precedence for future validated results.
- Layer preview visibility and opacity, active legend, per-product missing-data information, mission reference links and all six evidence categories.
- Versioned local save/open, reload restoration, JSON interchange, input validation, corrupted-storage protection and dataset-change revalidation notices.
- Brief preview, downloadable standalone HTML and print/save-PDF, containing ordered activities, assumptions, versions, references and explicit missing results.
- Collapsible desktop task panel; portrait/mobile sheets; persistent primary action, selected objective and return status; all file actions reachable on mobile.
- Skip link, accessible names and form labels, native radio semantics, explicit dialog focus wrapping/return, Escape, reduced-motion styling and hidden-panel exclusion from keyboard navigation.
- CI definition for lint, generated types, mission tests, build, browser tests and uploaded test artifacts.

## Skills used

Installed and read OpenAI Playwright, Anthropic frontend-design, Vercel React best practices,
Vercel composition patterns and Vercel web-design-guidelines during the approved audit.
Applied these to the final design, shared component/state architecture and verification.
Also used the Sites skill's local repository workflow; no separate hosted Site was created.

## Files and component boundaries

| Paths | Responsibility |
| --- | --- |
| `app/` | Next shell, metadata/icon, loading/error boundaries, local fonts and responsive design tokens/styles |
| `components/planner.tsx` | Shared workspace, region/mission state, panel and file flows |
| `components/map/map-workspace.tsx` | MapLibre lifecycle, schematic preview, controls and marker inspection |
| `components/science/` | Catalog, target details, layers and evidence register |
| `components/mission/` | Mission editor, ordering, readiness/feasibility and brief |
| `components/ui/primitives.tsx` | Dialog focus behavior, notices, badges, downloads |
| `lib/contracts/`, `lib/fixtures/`, `lib/mission/`, `lib/api/` | Shared runtime schemas, honest scenario fixtures, persistence/validation and unavailable planning adapter |
| `tests/`, `playwright.config.ts` | Mission/contract tests, interaction tests, screenshots and accessibility scans |
| `scripts/prepare-map-worker.mjs` | Reproducible same-origin worker packaging |
| `package*.json`, configuration, `.github/workflows/` | Dependency lockfile, toolchain and CI |
| `README.md`, `prototype/README.md`, `docs/` | Run instructions, handoff, audit and review evidence |

Original `DESIGN.md`, `PRD.md`, `TEAM_CONTRACT.md`, all three regional context documents,
the example scientific manifest and historical HTML prototype were not modified.
No regional feature branch was changed or merged.

## Checks executed

| Check | Result |
| --- | --- |
| `npm run lint` | Passed without warnings/errors |
| `npm run typecheck` | Passed (`next typegen` followed by strict `tsc --noEmit`) |
| `npm test` | 6 passed |
| `npm run build` | Passed; production route prerendered successfully |
| `npm run test:e2e` against `npm start` | 11 passed |
| `npm audit --json` | 0 known vulnerabilities, including development dependencies |
| Browser screenshot inspection | Actual Chromium renders inspected at 1440×900, 1024×768, 768×1024 and 390×844 |
| Print/download | HTML and JSON download events verified; browser generated a mission-brief PDF |

The browser suite verifies:

1. Multiple objectives, individual ordering, one-way requirements, missing route results and save/reload/reopen.
2. Target dialog Escape/focus return, region switching, planned Oxia labeling and draft isolation.
3. Real MapLibre preview camera controls, marker visibility, linework visibility and opacity.
4. All three regions at each of the four viewport sizes, no horizontal overflow, persistent Save/Review actions, bounded schematic markers and scrollable layers.
5. Axe WCAG 2 A/AA and 2.1 AA scans in the layer view at all four sizes, plus the science catalog and target dialog: zero detected violations in the tested states.
6. Invalid mission import rejection and stale dataset revalidation.
7. Skip-link focus, collapsed-panel exclusion from navigation and repeated Tab focus wrapping inside the dialog.
8. Mobile selected-objective/return summary, primary action and sheet collapse.
9. Already-loaded offline mission use, offline calculation blocking, JSON export and HTML/print brief.

Earlier failing runs identified the missing matching browser binary, MapLibre worker
resolution, the radio hit area, an overstrict panel visibility assertion and dialog
Tab wrapping. Those were addressed before the final production run. Screenshot review
also corrected a mobile preview marker clipped at the map edge. Test artifacts from
routine runs remain ignored; the screenshots below are intentionally retained for review.

## Screenshot evidence

| View | Screenshot |
| --- | --- |
| Desktop 1440px · Jezero | [Desktop](screenshots/desktop-1440.png) |
| Landscape tablet 1024px · Gale | [Landscape tablet](screenshots/tablet-1024.png) |
| Portrait tablet 768px · Oxia | [Portrait tablet](screenshots/tablet-768.png) |
| Mobile 390px · unavailable scientific map | [Mobile](screenshots/mobile-390.png) |
| Desktop schematic preview | [Preview](screenshots/preview-1440.png) |
| Mobile selected objective, return status and action | [Selected mobile objective](screenshots/selected-390.png) |

Raw screenshots, traces, the browser HTML report and generated print PDF are available
locally under ignored `output/playwright/`, `test-results/` and `playwright-report/`.
CI uploads browser evidence for remote review when its workflow runs; local verification
does not claim a GitHub Actions run has already passed.

## Remaining limitations

- No verified orbital rasters, target geometry, actual coverage boundaries or geological overlays are integrated. The default map truthfully says unavailable; preview linework/markers are schematic only.
- No FastAPI planning backend, audited terrain/hazard policy or applicable suit/radiation models exist in this checkout. Start/recovery geometry, route computation, resource estimates and operational feasibility remain unavailable/Unverified.
- Context links do not establish target-specific scientific provenance. The regional owners must supply verified scientific packages using the shared contract.
- Offline testing covers an already loaded workspace and browser-local records. Cold-start offline installation, persistent tile packs and service-worker caching are not implemented.
- Browser verification used Chromium at the specified viewport sizes, not physical tablets/phones, Safari, Firefox or a screen reader. Automated accessibility results are limited to the tested states and do not constitute complete accessibility certification.
- The current shell is ready for scientific integration; schema checks and synthetic UI tests do not validate real Mars data or navigation safety.
