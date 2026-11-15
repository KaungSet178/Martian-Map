# Aresian landing page preview

The supplied `marswalk-planner.zip` defines the presentation. Its React section
layouts, responsive breakpoints, colors, grid backgrounds, rounded frames,
Space Grotesk / Inter / JetBrains Mono typography, and navigation were retained.
The page uses the existing Aresian name and Mars logo.

## Local review

Checkout: `D:/martian-map/.worktrees/aresian-landing`

Branch: `feat/aresian-landing`, based on deployed commit `1427a6a`.

```sh
npm ci
npm run dev -- --port 3110
```

Landing: http://127.0.0.1:3110/

Planner: http://127.0.0.1:3110/planner

This is a local preview. No deployment branch was updated and no hosted Site
was created or published.

## Content and compatibility

- The homepage introduces the project. Explore buttons open the real planner
  with the selected region; the route CTA opens Gale's surface-waypoint view.
- Legacy `/?region=...` and `/?panel=...` URLs redirect to `/planner` with every
  query value preserved, including repeated values. Unknown regions retain the
  planner's Jezero fallback.
- The server derives region summaries, objective/layer counts, route preferences
  and assessment categories from current project modules. The browser receives
  only presentation data. No routing engine or interactive map runs on the
  landing page.
- The ZIP's invented targets, route metrics, eligibility claims and planner
  modal were replaced with real application captures and current capability
  descriptions. Experimental research routes are distinguished from validated
  scientific-objective routing, which remains unavailable.
- The layer section is explicitly a Gale example, including available regional
  elevation, hillshade, slope, thermal imagery and historical REMS observations.
- Mission storage remains `marswalk.missions.v1`; scientific calculations,
  source coordinates, export formats, Docker configuration and API endpoints
  are unchanged. Leaving an unsaved planner through its home link prompts for
  confirmation.

## Styling and maintenance

`npm run landing:css` compiles the reference's utility styles and scopes every
selector under `.aresian-landing`. `predev` and `prebuild` run it automatically.
Run it again after editing utility classes during a running dev session.
The generated stylesheet is ignored; its source and generator are tracked.

The landing's 16px rem baseline applies only while the landing element exists;
the planner keeps its existing 15px baseline. Fonts are bundled locally.
`NEXT_PUBLIC_SITE_URL` can override the public origin used by social metadata.

Screenshot provenance is documented in `public/landing/screens/README.md`.
The ZIP and temporary reference build live under ignored `output/` only; its
environment example, external AI SDK and simulated planner are not integrated.

## Review evidence

Desktop/mobile images and browser acceptance output are under
`output/playwright/landing-*`. The ZIP comparison is
`output/playwright/reference-desktop.png`.

Validation results are recorded in `output/LANDING_ACCEPTANCE.md`.

Production build, TypeScript and lint passed. Browser acceptance passed at
320, 390, 768 and 1440 pixels, including real image loading, navigation,
selectors, legacy redirects, mission persistence and planner style isolation.
The existing F2/science integration smoke passed at desktop and mobile widths.

Keyboard checks passed for skip-to-content, visible focus, mobile-menu Escape
dismissal and focus return. Canceling the planner's unsaved-draft warning
preserves the draft; accepting it returns to the landing page.

Known design limitation: Axe reports color-contrast findings on 12 elements
using the reference's orange/white and small orange text choices. The rendered
ZIP reference reports 30 such findings. These colors were retained to follow
the requested exact palette. No other Axe WCAG A/AA rule violations were found
in the fully loaded landing-page scan; this does not establish full accessibility
compliance.
