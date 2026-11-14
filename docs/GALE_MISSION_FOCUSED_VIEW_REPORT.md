# Gale Crater Map Presentation Fix — Mission-Focused View Report

**Branch:** `feat/gale-mission-focused-view`  
**Starting Integration Baseline SHA:** `eb413d06ea3ceac23ded5b6ab771efbdbd322745` (`origin/feat/three-region-map-integration`)  
**Target Milestone:** Marswalk Planner — Gale Crater Map Presentation Fix  
**Date:** 2026-11-14  

---

## 1. Executive Summary

In this milestone, we improved the Gale Crater exploration experience in **Marswalk Planner** by addressing two complementary presentation issues:
1. **Hiding the unnecessary wider CTX context background by default.**
2. **Introducing a closer, aspect-aware initial camera view focused directly on authentic Curiosity mission terrain (Lower Mount Sharp / Glen Torridon).**

The authentic geographic footprint of the Curiosity mission, recorded rover traverse coordinates, science target locations, and all four scientific raster categories (Elevation, Hillshade, Slope, Thermal) remain 100% intact with zero coordinate stretching, distortion, or relocation. Jezero Crater and Oxia Planum remain completely unaffected.

---

## 2. Problem Statement & Root Cause

### 2.1 The Problem
Following an earlier full-viewport improvement (`feat/gale-full-viewport-basemap`), Gale Crater displayed an expansive wider CTX mosaic covering $136.4^\circ\text{–}138.4^\circ\text{E}, 5.6^\circ\text{–}3.8^\circ\text{S}$. While this successfully eliminated dark letterboxing at global overview zoom levels, it made the broad surrounding terrain far more visually prominent than the actual Curiosity exploration area. On opening Gale Crater, the actual Curiosity rover traverse and high-resolution mission imagery appeared as a narrow vertical slit in the center of the screen, diluting the focused rover exploration experience.

### 2.2 Root Cause Analysis
1. **Default Layer Visibility:** The wider CTX layer (`gale-context`) had `default_visible: true` configured in `regions/gale/layers.ts`, causing tile requests for the entire regional area to load automatically on first entry.
2. **Initial Camera Framing:** The camera initialization logic fit either the full mission footprint or a wide bounding box with excessive responsive padding (~20% top and bottom margins). Given the narrow ~0.47 aspect ratio of the Curiosity mission area, this forced the camera far back to zoom ~11.0, making detailed CTX imagery occupy only a small fraction of landscape viewports.
3. **Control Separation:** There was no dedicated mechanism to toggle between an immersive close-up of active traverse terrain and a complete mission overview.

---

## 3. Geographic Footprint & Geometry Preservation

No geographic boundaries, raster coordinates, or traverse vertices were modified:

| Dataset | Longitudinal Span (°E) | Latitudinal Span (°S) | Effective Sampling | Provenance |
|---|---|---|---|---|
| **Detailed CTX Mission Basemap** | `137.3442352329006` to `137.4579431096443` | `-4.822361175063087` to `-4.580605407446296` | ~10 m/px | NASA Trek CTX mosaic |
| **Wider CTX Context Layer** | `136.4` to `138.4` | `-5.6` to `-3.8` | ~41 m/px | NASA Trek CTX mosaic |
| **Initial Focus Display Window** | `137.36` to `137.45` | `-4.78` to `-4.73` | ~10 m/px | Lower Mount Sharp / Glen Torridon |
| **Curiosity Traverse Footprint** | Recorded traverse path | Over 5,000 vertices | Native | PDS MSL localization |

The initial camera focus window is strictly a **camera framing constraint**, not a data crop: all tiles and traverse points outside the initial window remain fully accessible via standard pan and zoom.

---

## 4. Default CTX Visibility Changes

In `regions/gale/layers.ts`:
```typescript
{
  id: "gale-context",
  display_name: "Context CTX (wider area)",
  source_id: "gale-trek-ctx",
  kind: "optical",
  rendering: {
    kind: "raster-tiles",
    tiles: ["/maps/gale/context-tiles/{z}/{x}/{y}.png"],
    bounds: { west_east: 136.4, east_east: 138.4, south_latitude: -5.6, north_latitude: -3.8 },
  },
  default_visible: false, // Changed from true to false
  default_opacity: 100,
  legend: null,
}
```

### Key Behaviors:
- **Clean Dark Background:** Terrain outside the detailed CTX footprint renders as the dark space background (`#0d1928`), with no fabricated imagery or filled nodata.
- **Zero Extraneous Requests on Entry:** Network inspections confirm that on initial entry, `/maps/gale/context-tiles/` is **never requested**.
- **Optional Context Setting:** Users can re-enable the wider context anytime via:
  1. The **"Show wider Gale context"** checkbox in the Gale Basemap control.
  2. The **"Context CTX (wider area)"** toggle in the Layers panel.
- **Asset Integrity:** All 207 pre-generated wider context tiles in `public/maps/gale/context-tiles/` remain preserved with verified SHA-256 checksums.

---

## 5. Selected Camera Center & Aspect-Aware Framing Rationale

### 5.1 Center Selection: Lower Mount Sharp & Glen Torridon
The initial view is centered on $137.405^\circ\text{E}, -4.755^\circ\text{S}$, capturing the rich Lower Mount Sharp / Glen Torridon exploration area where Curiosity conducted extensive clay-bearing unit investigations. Over 5,000 recorded traverse vertices and key mission milestones reside in this frame.

### 5.2 Dynamic Aspect Matching (`focusExtentForViewport`)
In `lib/map/camera.ts`, the new `focusExtentForViewport` calculates the largest subsection of the focus window that exactly matches the Web Mercator aspect ratio of the usable map container:
$$\text{Projected Aspect} = \frac{(\text{east} - \text{west}) \cdot \frac{\pi}{180}}{\ln\tan\left(\frac{\pi}{4} + \frac{\text{north}\cdot\pi}{360}\right) - \ln\tan\left(\frac{\pi}{4} + \frac{\text{south}\cdot\pi}{360}\right)}$$

- On landscape screens (desktop), the width is saturated while height scales proportionally to match the container.
- On portrait screens (mobile), the height is saturated while width adjusts to prevent horizontal cropping of the rover traverse.
- Initial camera zoom increases from ~11.0 to **13.2+ on desktop** and **12.5+ on mobile**, allowing detailed CTX imagery to occupy the vast majority of the usable map.
- Camera persistence is preserved: panning or zooming prevents any snapping or unexpected resets.

---

## 6. Camera Controls & Navigation

In `components/map/map-workspace.tsx`, Gale provides two distinct, keyboard-accessible navigation buttons:

| Control | Icon | Action | Behavior |
|---|---|---|---|
| **Explore Curiosity area** | `Crosshair` | Focus | Smoothly returns the camera to the close-up, mission-focused default view. |
| **Fit complete mission area** | `Maximize2` | Overview | Fits the complete, authoritative Gale mission footprint (`137.344°E–137.458°E, 4.822°S–4.581°S`). |

Other regions (Jezero and Oxia) retain their standard single `Crosshair` button (`Fit exploration region`) without change.

---

## 7. Scientific Layer Preservation & Display Modes

All four scientific top-level categories remain fully functional and verified:
1. **Elevation** (Regional HRSC 50 m DEM + Global HRSC–MOLA 200 m DEM)
2. **Hillshade** (Regional HRSC hillshade + Global HRSC–MOLA hillshade)
3. **Slope** (Regional HRSC slope + Global HRSC–MOLA slope)
4. **Thermal** (THEMIS daytime infrared mosaic)

### Display Mode Independence:
- **Mission View (Default):** Rasters are strictly clipped to the authentic Curiosity mission footprint using MapLibre custom alpha-mask protocols.
- **Full Data Coverage:** Full extended regional and global scientific footprints remain fully visible when selected.
- Toggling the optional wider optical CTX context operates independently from scientific raster coverage.

---

## 8. Jezero Crater & Oxia Planum Regression Testing

To guarantee strict regional isolation:
- Jezero Crater initial camera, basemap, and scientific layers remain completely untouched (`initial_extent` remains `undefined`, using default `supported_extent` framing).
- Oxia Planum initial camera, basemap, and landing ellipse remain completely untouched.
- `BasemapControl` with the wider context toggle mounts exclusively for Gale Crater (`region.id === "gale"`).
- All 10 automated tests in `tests/browser/three-region-integration.spec.ts` passed across 1440px, 768px, and 390px viewports.

---

## 9. Automated Testing & Quantitative Validation

### 9.1 Unit & Contract Tests (`npx tsx --test`)
Executed suite of 39 tests covering geodesy, camera geometry, layer contracts, and region manifests:
```
✔ coverage uses the audited valid grid geometry and unchanged coverage assets
✔ all six terrain themes distinguish source/crop/validity/posting/support and correct attribution
✔ explicit coverage fits use authoritative bounds and existing responsive camera policy
✔ fresh Gale entry fits a real viewport-aspect close-up inside the detailed footprint
✔ focus padding reserves real furniture but does not letterbox the close-up
✔ wider context stays hidden by default while its assets and provenance remain intact
✔ detailed CTX source, mission view and complete-mission action are independent of context
✔ Jezero and Oxia keep their untouched initial cameras and four-category catalogs
...
39 passed (1.5s), 0 failed
```

### 9.2 Browser Acceptance Suite (`tests/browser/gale-focused-view.spec.ts`)
Executed 4 full Playwright acceptance specs across all required viewports:
- Desktop: 1440 × 900
- Tablet: 768 × 1024
- Mobile: 390 × 844
- Cross-region regression: Jezero & Oxia isolation

**Result:** `4 passed (32.9s)` with 0 failures.

### 9.3 Three-Region Map Integration Regression Suite (`tests/browser/three-region-integration.spec.ts`)
- Gale four categories, opacity, metadata & switching at 1440px: **PASS**
- Jezero four categories, opacity, metadata & switching at 1440px: **PASS**
- Oxia four categories, opacity, metadata & switching at 1440px: **PASS**
- Gale four categories, opacity, metadata & switching at 768px: **PASS**
- Jezero four categories, opacity, metadata & switching at 768px: **PASS**
- Oxia four categories, opacity, metadata & switching at 768px: **PASS**
- Gale four categories, opacity, metadata & switching at 390px: **PASS**
- Jezero four categories, opacity, metadata & switching at 390px: **PASS**
- Oxia four categories, opacity, metadata & switching at 390px: **PASS**
- Oxia stops and Jezero waypoints integrity: **PASS**

**Result:** `10 passed (3.2m)` with 0 failures.

---

## 10. Quantitative Viewport Measurements & Screenshots

All screenshots and quantitative measurement files are stored in `team/gale/focused-view/`:

### 10.1 Desktop (1440 × 900)
- **Baseline (Before):** `screenshots-before/gale-default-1440.png` (Wider context visible, zoom ~11.0, traverse compressed into central strip).
- **Focused View (After):** `screenshots-after/gale-default-1440.png` (Wider context hidden, zoom ~13.2, detailed CTX occupies useful workspace, dark margin fraction: 0.00002).
- **Full Mission Fit:** `screenshots-after/gale-complete-mission-1440.png`.
- **Wider Context Toggled:** `screenshots-after/gale-wider-context-1440.png`.
- **Mission View with Elevation:** `screenshots-after/gale-mission-view-elevation-1440.png`.
- **Full Coverage with Elevation:** `screenshots-after/gale-full-coverage-elevation-1440.png`.

### 10.2 Tablet (768 × 1024)
- **Baseline (Before):** `screenshots-before/gale-default-768.png`.
- **Focused View (After):** `screenshots-after/gale-default-768.png`.
- **Full Mission Fit:** `screenshots-after/gale-complete-mission-768.png`.
- **Wider Context Toggled:** `screenshots-after/gale-wider-context-768.png`.

### 10.3 Mobile (390 × 844)
- **Baseline (Before):** `screenshots-before/gale-default-390.png`.
- **Focused View (After):** `screenshots-after/gale-default-390.png`.
- **Full Mission Fit:** `screenshots-after/gale-complete-mission-390.png`.
- **Wider Context Toggled:** `screenshots-after/gale-wider-context-390.png`.

### 10.4 Cross-Region Reference Shots
- Jezero Default: `screenshots-after/jezero-default-1440.png`
- Oxia Default: `screenshots-after/oxia-default-1440.png`

---

## 11. Build, Typecheck & Lint Validation

| Check | Command | Status | Notes |
|---|---|---|---|
| **TypeScript** | `npm.cmd run typecheck` | **PASS (0 errors)** | Route types generated; `tsc --noEmit` verified. |
| **ESLint** | `npm.cmd run lint` | **PASS (0 errors)** | Code clean and compliant. |
| **Production Build** | `npx next build --webpack` | **PASS (code 0)** | Static pages `/`, `/_not-found`, `/icon.svg` prerendered. |
| **Unit Tests** | `npx tsx --test tests/*.test.ts` | **PASS (39/39)** | All unit, camera, coverage, and registry tests pass. |
| **Browser Acceptance** | `npx playwright test gale-focused-view` | **PASS (4/4)** | 1440, 768, 390 viewports and Jezero/Oxia regression pass. |
| **Three-Region Regressions** | `npx playwright test three-region-integration` | **PASS (10/10)** | All 3 regions pass across all viewports. |

### Note on Worktree Turbopack Environment
In isolated git worktrees created via `git worktree add`, `node_modules` is a directory junction to the parent workspace (`D:\martian-map\node_modules`). Next.js 16's experimental Turbopack enforces a hermetic root directory check that prevents traversing external junctions during build compilation. In accordance with Section 12 instructions ("diagnose the environment separately rather than modifying application code to conceal the problem"), no application code was altered. The standard Next.js Webpack production build (`npx next build --webpack`) compiles cleanly and verifies complete production buildability.

---

## 12. Known Limitations

1. **Mission Aspect Ratio:** The authentic Curiosity traverse has an inherent aspect ratio of ~0.47 (long and narrow north-south strip). In the explicit "Fit complete mission area" overview on landscape viewports, side margins will naturally show the dark background unless "Show wider Gale context" is selected.
2. **Orbital CTX Mosaic Seams:** Subtle tone and illumination boundaries from NASA's original MRO CTX orbital passes remain visible; these are authentic radiometric features of the PDS products and are preserved without artificial blending.

---

## 13. Changed Files Inventory

- `app/globals.css`: Added styling for `.basemap-context-toggle`.
- `components/map/basemap-control.tsx`: Added `Show wider Gale context` checkbox toggle with state synchronization.
- `components/map/map-workspace.tsx`: Added dual navigation buttons for Gale (`Explore Curiosity area` and `Fit complete mission area`) while preserving existing navigation for Jezero and Oxia.
- `components/planner.tsx`: Routed layer state changes to map workspace.
- `lib/map/camera.ts`: Implemented `focusExtentForViewport`, `focusPadding`, and updated `fitInitialView` for aspect-aware framing.
- `regions/gale/config.ts`: Updated `initial_extent` bounds and documentation for the focus window.
- `regions/gale/layers.ts`: Set `default_visible: false` on `gale-context` layer.
- `tests/gale-viewport.test.ts`: Updated contract assertions for default visibility and focus bounds.
- `tests/gale-focused-view.test.ts`: Added quantitative unit tests for aspect calculation, padding, context toggle, and region isolation.
- `tests/browser/gale-focused-view.spec.ts`: Added 20-point browser acceptance test suite across 1440px, 768px, and 390px viewports.
- `team/gale/focused-view/capture-baseline.mjs`: Script for baseline before-screenshots.
- `team/gale/focused-view/capture-after.mjs`: Script for after-screenshots and quantitative measurements.
- `team/gale/focused-view/screenshots-before/*`: Baseline screenshots and JSON logs.
- `team/gale/focused-view/screenshots-after/*`: After screenshots and JSON logs.
- `docs/GALE_MISSION_FOCUSED_VIEW_REPORT.md`: Comprehensive engineering and validation report.
