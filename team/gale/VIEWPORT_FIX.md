# Map viewport and navigation correction

13 November 2026 · `feat/gale-map`

## Root cause and investigation

The renderer used the narrow reviewed imagery footprint as `setMaxBounds`, then
applied a fixed center/zoom with `jumpTo`. MapLibre constrains the whole viewport
inside max bounds, raising the effective minimum zoom. The initial view therefore
clipped much of Curiosity's corridor, zooming out was constrained, and panning
quickly reached the boundary. Reapplying the fixed zoom did not fit the region.

Desktop already used a full-height grid and an absolutely positioned canvas, with
an independently scrolling sidebar. It did not need a new fixed-size map. The
mobile canvas, however, filled the workspace *behind* the bottom sheet. Camera
calculations included that obscured area, and the expanded sheet could cover the
navigation controls. The existing ResizeObserver resized the renderer but did
not recalculate an overview for the visible space.

Drag pan, wheel zoom and touch handlers were already enabled. Their apparent
restriction came primarily from the camera boundary. Floating container wrappers
already used `pointer-events: none`, with their actual controls opting back in;
that behavior is retained. Browser checks confirm an unobstructed canvas target
at the gesture point, then measure actual movement of the rendered imagery.

The NASA WMTS matrix, projection and registration were checked against the
existing capabilities snapshot and G1 audit. No tile addressing/georeferencing
correction was needed. All 33 existing imagery/traverse display assets still
match the G1 audit's SHA-256 values.

Relevant API references: [MapLibre fitBounds, camera and resize APIs](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/)
and [interaction options](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MapOptions/).
Implementation was also checked against the installed MapLibre 6.18 source and
Next.js 16.4.6 bundled client-component documentation.

## Camera and interactions

`lib/map/camera.ts` fits the region's existing `supported_extent` using
`fitBounds`. Padding is measured from the current title, map controls, legend and
attribution. The desktop sidebar already occupies a sibling grid column, so its
width is not subtracted again. Small viewports scale padding only when needed to
retain usable space. No geographic coordinates or coverage were invented.

Initial region selection and **Fit exploration region** use this same helper.
Explicit absolute padding prevents repeated fits from accumulating padding.
If a scientific region lacks an extent, the existing center/initial_zoom is a
display-only fallback. Unavailable regions and the schematic preview retain
their existing preview behavior.

The imagery footprint no longer restricts the camera. Instead, the existing
reviewed extent bounds raster tile requests, preventing requests for nonexistent
tiles in a sparse local pack. This changes neither tile pixels nor their
registration. Dateline-crossing footprints are left without a single raster
request bound; split-source support would be needed before applying that
optimization there. Gale does not cross the dateline.

Left-drag, ordinary wheel/trackpad-wheel input, touch drag, pinch zoom, keyboard
navigation and zoom buttons remain enabled. Cooperative gestures are explicitly
off, so navigation needs neither right-click nor Ctrl-wheel. Rotation and touch
pitch are disabled for the 2D workflow. Buttons and fit transitions are short;
MapLibre's reduced-motion behavior is retained and tested with that preference.

ResizeObserver follows the actual canvas and title dimensions. An overview
refits when the viewport or panel changes. Once the user deliberately pans or
zooms, resizing preserves their camera; pressing Fit restores overview behavior.
Observers and scheduled animation frames are cleaned up on unmount.

## Layout and responsive behavior

The application remains a contained `100dvh` workspace with a visible header,
scrolling sidebar and clipped map canvas. Explicit zero min-width/min-height
constraints prevent grid/flex children expanding the page. The old 500px minimum
app height no longer forces page scrolling on short windows.

Below the existing 850px breakpoint, the map and bottom sheet share the available
height as flex siblings. The canvas now ends at the sheet rather than extending
behind it. The expanded sheet uses 62% of the workspace, preserving a visible map
and its controls. The map gets the remaining height and resizes automatically.
The expanded mobile title is compact, and its passive unavailable-scale card is
omitted while controls, legend and attribution remain accessible. The full
scale/coverage message returns with the collapsed sheet. Controls occupy their
own right-edge space and do not overlap the Layers button or attribution.

The existing palette, fonts, component hierarchy and mission workflow remain.
Gale, Jezero and Oxia still use the same renderer; Jezero/Oxia regional science
files were not edited. Gale camera wording was updated to distinguish its
initial-view footprint from navigation limits. Dataset version stays
`gale-g1-v1`: source products, geometry and processing did not change.

## Verification and screenshots

Browser verification uses the actual running application and actual rendered
grayscale imagery. Overlay text is hidden only during pixel measurement so it
cannot be mistaken for terrain. No production debug hook or invented scientific
marker is used. Tests verify full-footprint framing, image movement after left
drag, wheel/button zoom, repeatable fit, canvas dimensions, control containment,
panel changes, keyboard navigation, camera preservation after user navigation,
region switching and emulated touch/pinch via Chromium's input protocol.

| Check | Result |
| --- | --- |
| ESLint | Pass |
| TypeScript / generated route types | Pass |
| Unit/contract tests | 14 pass |
| Browser regressions + navigation cases | 26 pass |
| Production build | Pass |
| `git diff --check` | Pass |
| Existing display-asset hashes | All 33 match original G1 audit |

Reviewed viewport sizes: 1440×900, 1024×768, 768×1024 and 390×844. Before captures
are provided at desktop and mobile; after captures cover all four sizes, plus
expanded sheets at 768px and 390px:

- [Before desktop](screenshots/viewport/gale-viewport-before-1440.png)
- [Before mobile](screenshots/viewport/gale-viewport-before-390.png)
- [After desktop](screenshots/viewport/gale-viewport-after-1440.png)
- [After tablet landscape](screenshots/viewport/gale-viewport-after-1024.png)
- [After tablet portrait](screenshots/viewport/gale-viewport-after-768.png)
- [After mobile](screenshots/viewport/gale-viewport-after-390.png)
- [Expanded portrait sheet](screenshots/viewport/gale-viewport-expanded-768.png)
- [Expanded mobile sheet](screenshots/viewport/gale-viewport-expanded-390.png)

Changed implementation files: `app/globals.css`,
`components/map/map-workspace.tsx`, `lib/map/{camera,region-layers}.ts`, and Gale's
`config.ts`/`layers.ts` camera descriptions. Verification changes are in
`tests/regions.test.ts`, `tests/browser/{planner,map-navigation}.spec.ts`.
Handoff/report/screenshots are under `team/gale/`.

## Remaining limits

The local imagery pack covers only its documented source footprint. Panning
beyond it shows background, not fabricated adjacent imagery. Fit returns to the
reviewed corridor. More surrounding context would require a separately reviewed
imagery integration. A complete overview is naturally small while the planning
sheet is expanded; collapsing it restores the larger exploration workspace.

Touch/pinch were exercised with Chromium emulation, not physical mobile hardware.
Trackpad wheel input uses the same enabled wheel handler; physical trackpad
hardware was not separately tested. No Earth-distance scale, hazard inference,
astronaut route, resource calculation or feasibility certification was added.
