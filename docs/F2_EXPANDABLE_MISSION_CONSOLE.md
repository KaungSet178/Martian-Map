# F2 — Expandable Mission Console

Starting GitHub HEAD: `c2df0b922919cf527b90ad66df2910a847f91bb5`, fetched and verified before implementation and again before delivery. Work completed in the isolated `.worktrees/f2-console` worktree on `feat/f2-ui-ux-refinement`.

## Delivered behavior

- Desktop mission console opens by default, can expand from 380px to 560px where space permits, and can collapse and reopen. Map furniture follows its current width.
- Gale measurement/metadata grids respond to their container width rather than the viewport. Jezero cards, charts, verification notes, product metadata and provenance adapt to narrow containers without hiding overflowing content. Numerical values and scientific labels remain unchanged.
- Science, Environment, Plan and Review use semantic tabs with selected states, panel labels, a single tab stop, Left/Right wrapping, Home/End navigation and visible focus. Plan's Objectives/Waypoints tabs follow the same pattern. Tab changes start content at the top.
- The content body scrolls independently of the tabs and summary, with scroll padding and stable scrollbar space. The fixed summary retains mission counts, Unverified status and the review/edit action; redundant return-margin and selected-target lines were removed. The tested empty summary stays below 100px tall.
- The mobile sheet retains its handle and open/close behavior, including Escape and focus return. Expanded content has more usable height. The separate Layers/Data Register window overlays the sheet on mobile while leaving the map controls available above it.
- Layers/Data Register receives focus when opened, supports Escape, returns focus to Layers, and retains focus while its inputs update. Desktop windows reserve the map-control column; compact map controls use a horizontal row.
- Gale's observation-sol selector now has an accessible name.

The navy/ivory/cream/citrus palette, existing typography and floating-window design are preserved. No routing algorithms, scientific datasets, EVA calculations, persistence, science-site verification/visibility or map-renderer code changed. Jezero Slope remains unavailable in `regions/jezero/layers.ts`. No geological overlays or unregistered-site terrain routing were enabled.

## Validation

| Check | Result |
| --- | --- |
| Baseline `npm run typecheck` / `npm run lint` | Passed |
| Baseline environmental browser suite | 9 passed |
| Final `npm run typecheck` / `npm run lint` | Passed |
| `npm run build` | Passed, all 9 pages generated |
| `npm test` | 29 passed |
| Environmental integrity and Jezero component tests | 20 passed |
| Final relevant Chromium browser run | 28 passed |

Browser viewports: **1440×900, 1024×768, 768×1024, 390×844**. The new `tests/browser/f2-console.spec.ts` checks all four tabs, Plan sub-tabs, keyboard navigation, desktop expansion, collapse/reopen, mobile handle and Escape, summary actions, environmental overflow, scrolling to the end, Layers/Data Register and focus return, unobstructed map buttons and rendered map changes after zoom. It also audits both environmental consoles for serious/critical axe violations. Existing environmental, renderer-recovery and selected planner dialog/keyboard tests were included in the final run.

Final browser command (with the isolated dev server at port 3102):

```powershell
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3102'
npx.cmd playwright test tests/browser/f2-console.spec.ts tests/browser/environmental-conditions.spec.ts tests/browser/map-renderer-recovery.spec.ts tests/browser/planner.spec.ts --grep 'console|measurements fit|Environmental Conditions Integration|one failed Jezero|unavailable optional|genuine WebGL|target dialogs support|keyboard focus, native dialog' --reporter=list
```

No baseline failures were observed in the checks run. An intermediate run encountered a trace-file cleanup collision because two browser commands shared an output directory; the final single sequential run passed. The full historical browser suite and Firefox/WebKit were not run. No outstanding UI regressions were identified by the scoped checks.

## Committed browser evidence

| Evidence | Screenshot |
| --- | --- |
| Expanded Jezero metrics, 1440px | [Desktop](screenshots/f2-console-1440.png) |
| Expanded Jezero metrics, 1024px | [Compact desktop](screenshots/f2-console-1024.png) |
| Gale metrics, 768px | [Tablet](screenshots/f2-console-768.png) |
| Gale metrics and compact footer, 390px | [Mobile](screenshots/f2-console-390.png) |
| Expanded console, Data Register and map controls, 1024px | [Desktop windows](screenshots/f2-console-layers-1024.png) |
| Separate Layers window and map controls, 390px | [Mobile Layers](screenshots/f2-console-layers-390.png) |

Additional per-tab, per-region and footer screenshots remain in the ignored `output/playwright/f2-*.png` directory of the isolated worktree. No merge or pull request was created.
