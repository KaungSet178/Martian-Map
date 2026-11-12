# Marswalk Planner — UI/UX audit and redesign proposal

Date: 12 November 2026. Status: **Approved by the user; implementation and verification are documented in [the delivery report](redesign-verification.md).** The findings below preserve the pre-implementation baseline.

## Repository and scope

- Repository verified: `https://github.com/KaungSet178/Martian-Map.git`.
- Initial branch: `main`; initial working tree: clean.
- Fetched `origin`, confirmed no existing local or remote redesign branch, and created `feat/shared-ui-redesign` from the latest fetched `origin/main`.
- Verified active branch using `git branch --show-current`. No commits, pushes, merges, or regional branch changes were made.
- Actual repository: planning documents, three regional context documents, a sample manifest, and one standalone HTML/CSS/JavaScript/SVG prototype. There is **no Next.js application, package.json, TypeScript configuration, MapLibre integration, FastAPI implementation, regional dataset package, or test harness** in this checkout.
- Read: PRD.md, DESIGN.md, TEAM_CONTRACT.md, README.md, prototype/README.md, prototype/frontend_prototype.html, all three team CONTEXT.md files, and region_manifest.example.json. No repository AGENTS.md was found in the tracked/workspace file inventory.
- DESIGN.md controls visual styling. PRD.md and all regional handoffs resolve its rehearsal/offline-computation discrepancy: first release is **2D pre-mission planning**, without live EVA, rehearsal, or new offline route computations.

The implementation proposal is therefore a shared frontend foundation informed by the prototype, rather than a refactor of existing React components. Scientific content and backend computation remain separate deliverables.

## Skills installed and reviewed

Previously installed user skills were developing-with-streamlit and find-skills, plus the system skill collection. Streamlit is unrelated to the requested stack and was not applied.

Used find-skills and skill-installer to inspect the official OpenAI catalog, verify exact repository paths and publisher repositories, and install these five skills through the system installer:

| Installed folder | Publisher / source | Purpose and use in this phase |
| --- | --- | --- |
| `playwright` | [OpenAI](https://github.com/openai/skills/tree/main/skills/.curated/playwright) | Real-browser baseline screenshots, viewport inspection, interaction and keyboard checks |
| `frontend-design` | [Anthropic](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | Visual hierarchy, restrained design direction and layout proposal |
| `react-best-practices` | [Vercel](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) | Planned rendering boundaries, MapLibre loading and state architecture; no React code exists to assess yet |
| `composition-patterns` | [Vercel](https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns) | Proposed reusable component and state boundaries |
| `web-design-guidelines` | [Vercel](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | Accessibility and interaction review; fetched current guidelines |

All five SKILL.md files were read from `C:/Users/ACER/.codex/skills/`. They are accessible now and available for automatic discovery on the next turn. No third-party installation scripts were executed. Existing DESIGN.md tokens and user requirements take precedence over generic skill styling suggestions. Browser CLI invocation used `npx --package @playwright/cli playwright-cli` on Windows.

## What to preserve

- Exact navy, cyan, violet, amber and restrained red palette; semantic route and science symbols.
- One shared workspace and one interaction model for all regions.
- Map-first composition; current desktop shell already gives the map most of the width.
- Honest illustrative labels, unavailable estimates, and all six Unverified feasibility checks.
- Native form controls, several useful accessible names, visible control focus styles, reduced-motion CSS, and local storage error handling.
- Region science questions and the explicit planned-area distinction for Oxia.
- No horizontal document overflow in the four baseline viewports tested.

## Findings and proposed corrections

Priorities: P0 = correctness/evidence integrity; P1 = core task/accessibility; P2 = polish or supporting completeness. Browser-confirmed findings are identified explicitly; other findings come from source inspection.

| Priority | Evidence location | Finding | Proposed correction |
| --- | --- | --- | --- |
| P0 | `prototype/frontend_prototype.html:17` | Browser confirmed: removing a selected target leaves every route path unchanged. Artwork always visits the same three points, regardless of selection or ordering. | Never present decorative geometry as mission output. Invalidate computed results after any mission edit; render routes only from versioned backend results. Optional illustrative fixtures must be visibly separate from scientific mode. |
| P0 | `prototype/frontend_prototype.html:17` | Browser confirmed: changing round trip to one way leaves all route geometry unchanged. Round-trip artwork does not return to the base. Empty recovery still permits route review. | Explicit start/stop/end model, required recovery endpoint and documented assumptions for one-way missions. Gate calculations on valid inputs and region eligibility. |
| P0 | `prototype/frontend_prototype.html:16` | Zoom transforms only terrain artwork; marker/route overlay has a separate coordinate transform. Terrain uses SVG slice while overlay uses meet. | One MapLibre camera and aligned sources/layers. Do not use Earth-derived scale or distance for Mars. Show scale unavailable until the planetary transform is validated. |
| P0 | `prototype/frontend_prototype.html:14` | All three regions' objectives and geometry are embedded directly in shared UI JavaScript. No individual target source IDs, verified locations, or scientific layer products are integrated. | Manifest-driven shared components using stable IDs; unresolved locations remain catalog objectives, not routable points. Regional owners supply their scientific packages. |
| P1 | `prototype/frontend_prototype.html:4` | Browser confirmed: sidebar footer begins below the viewport at every tested size. At 1440×900 its top is approximately y=1132; the review action requires sidebar scrolling. | Independently scrolling panel body with persistent summary/action footer; collapsible 320–360px task panel. |
| P1 | `prototype/frontend_prototype.html:4` | Mobile has a capped scrolling sidebar, without sheet expansion/collapse controls. Save and site overview disappear at 390px; scale disappears too. | Accessible bottom sheet with summary/detail states, persistent primary action, compact legend/status, and reachable Save/Open actions through a labeled menu. |
| P1 | `prototype/frontend_prototype.html:10` | Browser confirmed at 390×844: layer panel extends to y=533 beyond map bottom near y=506; its bottom evidence action is clipped. | One active auxiliary panel/sheet, viewport-bounded height and internal scroll; place map controls above the collapsed sheet and respect safe areas. |
| P1 | `prototype/frontend_prototype.html:4` | Browser confirmed: a hidden comparison dock remains in the Tab order. Tab after Reset reaches invisible Close route comparison. | Unmount or use hidden/inert appropriately; restore focus to the trigger on close and keep focused elements visible. |
| P1 | `prototype/frontend_prototype.html:22` | Browser confirmed: comparison aria-expanded remains true after close; layer close similarly does not synchronize its trigger. Direction buttons expose no selected state. | Derive visibility and ARIA from a single state source; use radio semantics for mutually exclusive choices. |
| P1 | `prototype/frontend_prototype.html:11` | Browser confirmed: Escape does not close target details. Region switch leaves an Oxia target title visible over Gale. No focus transfer/return handling. | Region-scoped selection state and cleanup of transient panels; accessible dialogs/sheets with Escape, appropriate focus behavior and focus return. |
| P1 | `prototype/frontend_prototype.html:18` | Catalog clicks add/remove immediately; they cannot inspect the same detail view available through map markers. Re-rendering replaces focused target buttons. | Separate Inspect and Add actions; catalog and map share target IDs/detail state and selected treatment. Preserve keyboard focus across updates. |
| P1 | `prototype/frontend_prototype.html:22` | Earlier/Later rotate the entire selected array rather than moving a specified stop. There is no visible ordered itinerary. | Numbered ordered stop list with per-stop Move up, Move down and Remove; disabled boundary actions and announced changes. |
| P1 | `prototype/frontend_prototype.html:7` | Custom start is an enabled future-placeholder option without a working map selection. Recovery is free text with no location validation. | Offer only supported starts; expose a keyboard-operable coordinate form with verified CRS/coverage checks when supported. Distinguish endpoint geometry from recovery assumptions. |
| P1 | `prototype/frontend_prototype.html:21` | Browser save/reload works, but only one browser slot exists, no explicit Open flow, no import/export, and no dataset/model versions or staleness checks. Invalid stored data is silently ignored. | Named saved plans with schema validation, stable IDs, JSON import/export, storage-error guidance and revalidation when dataset/model versions change. |
| P1 | `prototype/frontend_prototype.html:20` | Brief uses generic source names without links, generation date or dataset/model versions; resource settings and proposed activities are incomplete. No dedicated downloadable report flow. | Printable/downloadable mission brief containing mission inputs, activities, evidence, map when available, all six assessments, assumptions, versions, date and source links. Explicitly mark unavailable sections. |
| P1 | `prototype/frontend_prototype.html:22` | Evidence is a browser alert with general future-data prose rather than inspectable per-layer/target provenance. | Shared evidence drawer with source links, product ID, dates, units, resolution, CRS, processing, coverage, limitations and version. |
| P1 | `prototype/frontend_prototype.html:4` | Browser confirms target metadata at 10px; many labels are 9–11px, body mostly 12px, section headings 14px. Frequently used controls are 38–43px. | Restore DESIGN.md scale: 15–16px body, 13–14px metadata, 20px section headings and 28–32px view title; aim for 44px frequent controls. Reduce simultaneous content rather than shrinking text. |
| P1 | `prototype/frontend_prototype.html:7` | No main landmark or skip link. Marker focus lacks the explicit focus styling supplied to ordinary controls. Native target buttons are useful but insufficient for complete keyboard equivalence. | Semantic main/navigation/region structure, skip link, shared focus styles including map targets, keyboard alternatives to all map-dependent actions. |
| P1 | `prototype/frontend_prototype.html:10` | Layers have one generic opacity slider and no thematic quantity/units, per-layer legends or provenance. A slope-style shape is illustrative, not a derived slope layer. | Available layers only in normal switches; one thematic overlay by default, contextual opacity/legend/source details. Explain pending/unavailable products separately. |
| P1 | Prototype overall | No real asynchronous data lifecycle, service failure, missing footprint, offline asset availability or resource model integration exists. | Explicit loading, empty, unavailable, failed, offline and stale states; retain cached views/local plans while disabling new calculations during outage. Never invent fallback metrics. |
| P2 | `prototype/frontend_prototype.html:4` | Repeated uppercase micro-labels, boxed notices, duplicate region identity, frosted surfaces and a decorative sparkle dilute the mission hierarchy. | Plain opaque console surfaces, sentence case, restrained separators, concise task-focused text and consistent icons. Preserve useful science/status information through progressive disclosure. |
| P2 | `prototype/frontend_prototype.html:8` | Legend includes absent rover history and inactive routes/coverage; it overlaps the base label in baseline views. Fake scale rule remains even when scale unavailable. | Legend reflects visible layers only, with expandable detail; reserve unobstructed marker space. No scale graphic without a valid scale. |
| P2 | `prototype/frontend_prototype.html:4` | Geist and IBM Plex Mono are named but not distributed. Browser uses available fallback fonts. | Bundle licensed local font assets with readable fallbacks; avoid network-only font dependencies. |
| P2 | `prototype/README.md:3` | Instructions refer to nonexistent frontend_prototype_v2.html and DESIGN (1).md. | Correct handoff/startup documentation during implementation. |

## Visual and interaction direction for approval

Keep the current identity and exact DESIGN.md tokens. Base colors: background `#09111F`, surface `#111D30`, raised surface `#1B2A40`, text `#F0F5FC`, primary/route `#59E3FA`, science `#D0BDFF`; retain existing muted, border, amber and critical tokens. Use control-border for interactive boundaries; ordinary border remains a separator. Use Geist for interface copy, IBM Plex Mono for coordinates, versions and quantitative data. Keep 4/8/12/16/24/32 spacing, 8px control and 12px panel corners.

The memorable element should be the scientific map. No new gradients, decorative plots, card grid dashboard or animated telemetry. Use short user-triggered transitions and respect reduced motion. Display every scientific result with its actual evidence category: Observed, Derived, Interpreted, Modeled, Scenario or Unavailable. Unverified is an assessment status, distinct from those evidence categories.

Desktop concept:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Marswalk   Region selector / capability status   Open Save Brief │
├────────────────────┬────────────────────────────────────────────┤
│ Science | Plan     │ Region / data status              Layers   │
│                    │                                            │
│ Contextual task    │          MAP WORKSPACE              N / +  │
│ body scrolls       │     targets / coverage / routes       −    │
│                    │                                            │
│ Selected target    │ Active legend / source     validated scale │
├────────────────────┤                                            │
│ Plan status / CTA  │ Compare / evidence open only when requested │
└────────────────────┴────────────────────────────────────────────┘
```

| Viewport | Proposed behavior |
| --- | --- |
| 1440px+ | Compact header; 340–360px collapsible task panel. Map occupies the remaining workspace. Route comparison appears on demand; avoid two permanent sidebars. |
| ~1024px landscape | 320px task panel with explicit collapse. Compare/evidence replaces the current panel or opens a bounded drawer. |
| ~768px portrait | Map above a collapsible sheet with clear summary and expanded detail states; no miniature desktop panels. |
| 390px mobile | Compact region header, map controls and short active legend; bottom sheet with selected stop, return status and main action reachable in the summary. Expanded sheets scroll internally; Save/Open remain reachable. |

Flow: choose region → inspect evidence/coverage → inspect and add objectives → review ordered mission/start/return settings → compare supported route results → review six assessments → save/export. Allow exploration and draft saving even when routing is blocked. Use an actionable unavailable explanation, not an enabled calculation pretending to succeed.

No synthetic science markers should appear in normal scientific mode. A target without verified geometry can be added as a draft objective, visibly requiring location verification; it cannot become a calculated waypoint. With no integrated imagery, show an honest map-unavailable state and keep catalog/planning tasks usable. If illustrative preview is retained, make it an explicit mode with persistent labeling, separate from real results.

## Shared implementation architecture proposed for approval

- `app/`: Next.js/TypeScript application shell and workspace route; URL records region and relevant view state.
- `components/ui/`: buttons, form fields, badges, disclosure, dialog, drawer/sheet and status primitives.
- `components/map/`: MapWorkspace, MapControls, LayerManager, ActiveLegend, CoverageStatus and attribution.
- `components/science/`: TargetCatalog, TargetDetails and EvidenceDetails.
- `components/mission/`: MissionEditor, StartDestinationFields, OrderedStops, RouteComparison, FeasibilityPanel, SavedMissions and MissionBrief.
- `lib/contracts/`: existing manifest names/enums retained, runtime validation and typed client boundaries. Propose optional evidence/processing/model metadata additions explicitly before adopting them; avoid silently changing the team contract.
- `lib/mission/`: shared mission state, validation, version/staleness handling and local persistence. State stores stable target IDs, not array positions; selected map target and mission stop membership are separate concepts.
- `lib/api/`: adapter for the planned FastAPI contracts, with explicit unavailable service behavior until endpoints exist. No authoritative route/resource computation in the frontend.
- Clearly separated illustrative fixtures for all three region shells; do not modify region-owned scientific datasets or imply metadata verification. Components consume the same contract when regional packages arrive.
- Load MapLibre on the client and keep the map instance stable across panel changes. Separate high-frequency camera state from mission state. Resize the map when the task panel changes. Validate the Martian source-coordinate/rendering transform before showing real overlays or scale.

## Approval-dependent implementation sequence

1. Establish shared Next.js/TypeScript foundation, runtime contract checks and exact visual tokens. Document interfaces for regional teammates without sending external messages.
2. Build responsive shell, accessible panels/sheet and region capability loading; preserve map state when opening details.
3. Integrate MapLibre boundary, layers/legend/evidence UI and truthful absent-data behavior. Scientific rasters require separately verified regional input.
4. Build target catalog/detail and mission editor: starts/endpoints, ordered objectives, input validation and result invalidation.
5. Add route comparison/feasibility adapters and all missing-data states. Keep routing disabled until audited data and backend outputs support it. No fabricated alternatives or metrics.
6. Add versioned local save/open, JSON interchange, brief preview and print/download flow.
7. Run type/lint/build checks and focused behavioral tests for contracts, stale results, one-way validation and saved-plan handling. Execute browser review across all regions and four widths, keyboard navigation, dialogs/panels, layer controls, loading/offline/unavailable states and contrast. Inspect actual screenshots and correct issues.
8. Review the diff, create focused commits, push only feat/shared-ui-redesign, and prepare a PR targeting main with evidence and scientific limitations. Do not merge automatically.

## Baseline browser evidence — executed

Served the unchanged prototype with Python http.server bound to 127.0.0.1:8765. Used Playwright CLI's Chromium browser. Captured and visually inspected the four baseline viewport screenshots and the mobile layer screenshot.

| Viewport | Horizontal overflow | Other measured/observed outcomes |
| --- | --- | --- |
| 1440×900 | None; scrollWidth 1440 | Map height 830px; sidebar primary action below initial visible area |
| 1024×768 | None; scrollWidth 1024 | Map height 698px; crowded small typography and below-view action |
| 768×1024 | None; scrollWidth 768 | Map height ~522px; static scrolling lower panel, not collapsible sheet |
| 390×844 | None; scrollWidth 390 | Map height ~444px; Save hidden; layer evidence action clipped |

Artifacts relative to this report:

- [Desktop 1440](../output/playwright/baseline-1440.png)
- [Tablet landscape 1024](../output/playwright/baseline-1024.png)
- [Tablet portrait 768](../output/playwright/baseline-768.png)
- [Mobile 390](../output/playwright/baseline-390.png)
- [Mobile layers clipping](../output/playwright/baseline-layers-390.png)
- [Comparison with edited mission](../output/playwright/baseline-compare-1440.png)
- [Jezero](../output/playwright/baseline-jezero-1440.png), [Gale](../output/playwright/baseline-gale-1440.png), [Oxia](../output/playwright/baseline-oxia-1440.png)

Executed interactions: opened route review, removed a selected target, changed mission direction, inspected resulting SVG paths, switched all three regions, opened/closed layers, inspected a marker, pressed Escape, switched region with target details open, saved/reloaded a scenario, and traversed from Reset into hidden comparison controls using Tab. Findings above reflect those results; they are **baseline defects, not a passing redesign test suite**.

Core token contrast was calculated using WCAG relative luminance:

| Pair | Ratio |
| --- | --- |
| Primary text / surface | 15.43:1 |
| Muted text / surface | 8.37:1 |
| Muted text / raised surface | 7.17:1 |
| Primary button dark text / cyan | 12.13:1 |
| Control border / surface | 3.94:1 |
| Separator border / surface | 1.78:1 |

These core text pairs support retaining the palette. The separator token should not be the sole essential control boundary. These calculations do not certify every composited surface, imagery overlay, disabled state or focus treatment. No full automated accessibility scan, screen-reader session, print/PDF verification, offline cache test or real geospatial validation was executed. Browser console showed a missing favicon (404); no application JavaScript exception was observed during the checked flows.

## Approval boundary and remaining dependencies

Approve the visual/interaction direction and shared frontend foundation above before application files are created or modified. Approval would cover a functioning, responsive interface with honest capability gating; it would not establish scientific validity of routes, resource models, or regional datasets.

Remaining external dependencies: verified imagery and Mars transforms, target geometry and source registers from regional owners, audited DEM/hazard coverage and routing policy, FastAPI route/assessment services, and applicable engineering/radiation models. These do not block building a useful frontend, but they block scientifically supported route results and a fully Feasible mission assessment.

Current project changes are limited to this audit document and generated browser evidence/CLI logs. Application source, regional data and original design/contract documents are unchanged. Generated browser artifacts are review evidence and will not be committed by default.
