# Scientific Layer Style Guide

I4C Stage A specification, 15 November 2026, Asia/Rangoon. Audited implementation: `870f282c0b9349b1d36c058970d2220cc4ea5a5e`. This specification is proposed for team adoption; it has not been applied to application files. Actual inventory and migration failures are in [the audit](I4C_LAYER_CONSISTENCY_AUDIT.md).

## Names, groups and availability

Group scientific products in this order: Elevation, Hillshade, Slope, Thermal; then Basemaps and Map overlays. Display names begin with the shared quantity; source variants follow ` · `, for example `Elevation · regional HRSC (30 m posting)`. Retain stable dataset IDs, URLs, saved references and scientific processing lineage.

Use `CTX basemap` only for documented CTX imagery, with context/source qualifiers after ` · `. The separate Gale HiRISE color control must retain its HiRISE name and source, never CTX. Genuine Gale/Jezero THEMIS daytime mosaics become `Thermal (day IR)`; Oxia's genuine nighttime mosaic becomes `Thermal (night IR)`. These labels are not interchangeable. Preserve instrument/product/version in associated metadata.

Unavailable categories show `Unavailable` with the reason, disabled control and explicit missing quantity; never substitute another region's data. Oxia has coarse display terrain but no walking-scale numerical route capability. Coverage envelopes do not prove valid pixel support. Historical rover traverse is an observation record, not an EVA route.

## Shared numeric styles

The colors below are exact proposed tokens in `tests/i4c/style-contract.ts`. They are design conventions, not NASA safety categories. Regenerate numeric rasters and legends together; recoloring an existing legend alone is invalid. Transparent pixels remain unknown through reprojection, resampling and clipping. A neutral hatch/outline may indicate coverage gaps without filling them with a valid data color.

| Quantity | Low to high colors | Scaling and units |
|---|---|---|
| Elevation | `#352A68`, `#286B9E`, `#4A9C9A`, `#B89B55`, `#F3E8C8` | Linear region/dataset-relative numeric scale, meters relative to explicitly identified datum |
| Slope | `#357F78`, `#DCCB67`, `#DF8B45`, `#A83232` | Discrete boundaries 0, 10, 15, 20, 90 degrees |
| Thermal | `#1E0C45`, `#61136E`, `#BC3754`, `#F98B0B`, `#F4E156` | Linear relative mosaic intensity, no temperature units without verified calibration |
| Hillshade | `#000000`, `#808080`, `#FFFFFF` | Neutral grayscale, artificial intensity 0, 0.5, 1 where normalization known |

Elevation uses `t=(z-L)/(U-L)` clamped to [0,1], linearly interpolated at t=0,.25,.5,.75,1. L/U must be explicit reviewed numeric bounds from that product's valid-data domain; record the bounds, domain, datum, any clipping and method. If U=L, disclose constant elevation; never divide by zero. Tick labels show L, L+.25(U-L), L+.5(U-L), L+.75(U-L), U in meters, plus true min/max if clipped. Legend must say **dataset-relative scale: same color is not the same absolute elevation across datasets**. No common absolute range is adopted: regional ranges, interpolation and datum/processing confidence differ. No sea level or vegetation meaning. Jezero's existing hillshade-multiplied elevation tint must be replaced from numeric data before claiming exact palette conformance; its processing caveats remain until reviewed.

Thermal uses native documented DN bounds (0–255 only when confirmed as 8-bit), linear normalized intensity at the same five stops. Caption: `Relative daytime/nighttime IR brightness; uncalibrated; not K, °C or thermal inertia`. Do not equate colors across different mosaics or day/night contexts. Record valid-data coverage, mosaic release versus acquisition date, resampling and saturation. Relative brightness cannot independently classify rock strength or navigability. Oxia's existing legend should qualify its rock/loose-ground interpretations separately from brightness.

Hillshade is computed illumination, not photographed sunlight or measured temperature. Record DEM source, posting, derivative support, sun azimuth/elevation, vertical exaggeration and casting model; unknown settings say unavailable. Gale/Jezero documented lighting is 315°/45°; Oxia's upstream illumination is unavailable. Do not label a particular gray as flat ground when illumination metadata is unknown. Avoid assigning a common intensity calibration to a lossy upstream shade image without numeric provenance.

## Slope boundaries and verified NASA context

| Numeric interval | Display label | Meaning |
|---|---|---|
| 0° to <10° | Low | Project visualization class |
| 10° to <15° | Moderate | Project visualization class |
| 15° to <20° | Steep | Project visualization class |
| 20° to 90° | High concern | Project caution; not a universal astronaut prohibition |
| Null, nonfinite, negative or >90° | Unavailable | Missing/invalid gradient; never Low |

NASA's [Artemis Human Landing System Overview, 2025 International Space Apps Challenge](https://ntrs.nasa.gov/api/citations/20250009323/downloads/ArtemisOverview2025IntSPAPPSChallenge.pdf), cover dated 4 October 2025, with an interior 1 August 2024 presentation title, has an Artemis III landing-requirements list on PDF page 21 and slope discussion on PDF page 24 (1-based). The lunar landing-site context uses an EVA slope limit below 20°, associated with a 2 km exploration context. This verifies the existence and context of that published planning boundary; it does not establish a universal Mars suit limit, measured physiological tolerance, flight rule or common 10°/15° safety classes. The exact 20° boundary here is a project caution convention inspired by that context. Source text extraction succeeded; screenshot retrieval for that deck failed. No revision-controlled NASA Mars operational requirement was established.

Jezero's computational threshold remains **25°** (`lib/routing/jezero/cost.ts`): cells above 25° are blocked, equality is allowed under current comparisons, with nodata and diagonal barriers. Thus 20–25° cells may be High concern visually while computationally traversable. Routing validity, visualization, caution and mission-specific operational approval are separate. No routing algorithm changes are authorized by this guide. Derivative baseline matters: Jezero display slope is zoom-dependent, its routing grid is 25 m; Gale has 30/200/25 m variants; Oxia has coarse MOLA-derived regional slopes. Identical colors cannot erase these different spatial supports.

## Evidence vocabulary

Observed: direct instrument observations with processing disclosed. Derived: processed/reconstructed quantities, including DEM elevation displays, slope, hillshade, resampled display products when describing that processing level. Interpreted: scientific inference, such as mineral identification or likely surface materials. Modeled: explicit computational model output, including route/EVA requirements. Scenario: user assumptions or illustrative planning inputs. Unavailable: missing evidence/data. Preserve input observations alongside the classification of the displayed product.

Hillshade and slope must always be Derived. Jezero stereo-reconstructed elevation and Oxia interpolated/gridded MOLA elevation displays must be Derived, preserving observed sensor lineage. A false/unknown registration flag remains false/unknown even if source coordinates are checked. Keep evidence classification independent of source verification, processing verification, registration, positional uncertainty and routing permission. Do not promote interpreted minerals, a landing-circle center or numerical route completion into verified navigation/safety.

## Legend contract

Each active layer needs its standard name, quantity, ordered swatches/symbols, numeric boundaries, units (or explicitly unitless), actual product/source link, resolution field, evidence classification, coverage, nodata representation and limitations. **Source and Resolution must be visible with the legend or its immediately associated metadata**, with unknown resolution explicitly `Resolution unavailable`. Merely mentioning a number in limitations or linking a remote data register is insufficient.

Differentiate native nominal sensor posting, reconstructed DEM grid spacing, derived analysis/gradient support, display sampling and effective resolution. Show `Effective resolution unavailable; source posting …; derived grid …; display sampling …` when those are all that is known. Never relabel tile zoom as resolution or nominal posting as positional accuracy. Unknown dates, registration and uncertainty must be explicit. No-data must not share the lowest valid color; label transparency and the actual source footprint.

All color classes need text/numeric labels; no color-only communication. Use keyboard reachable native checkbox/range controls with visible focus and accessible names. Labels and body text need readable contrast (target WCAG AA 4.5:1 normal text, 3:1 large text/control boundaries). Discrete slope colors are ordered but not promised perceptually uniform or universally color-vision safe: require grayscale/color-vision simulation review plus numeric inspection and optional hatch cues before adoption. Opacity blends alter apparent colors, so show legend swatches at full opacity and identify layer opacity. Support all five audited sizes and distinguish layout crowding from blocked essential controls.

## Implementation proposal and ownership

Current numeric palette sources: `regions/gale/terrain-layers.ts`, `regions/jezero/layers.ts`, `regions/jezero/scientific-presentation.ts`, `regions/oxia/layers.ts`; raster generation: `team/gale/terrain/`, `team/jezero/terrain/build_terrain.mjs`, `build_slope.mjs`, `team/oxia/terrain/build_elevation_tiles.mjs`, `build_mola_slope.mjs`, thermal generators. `lib/map/region-layers.ts` mounts precolored rasters; it cannot recover numeric values from colors. The category index is `lib/map/scientific-categories.ts`; legend rendering is `components/science/evidence.tsx` and `product-metadata.tsx`.

Propose one future `lib/map/scientific-style.ts` exporting ramps, slope-class helper, names and legend quantity contracts. Wire regional manifests to it, and generate a JSON token artifact for Python/JS tile builders. Keep source-specific bounds/units/availability in manifests. Explicitly rename via category + source variant; map DEM display evidence to Derived; emit a persistent source/resolution metadata row beside every legend. Preserve stable layer IDs and old save states; no mission/schema/routing changes. Palette changes require reviewed numeric regeneration, alpha/hash verification and screenshot comparison; fix Jezero derivative support and Earth-spacing/shaded-elevation processing separately before conformance claims. Do not recolor source pixels blindly.

I4C owns docs/tests/evidence only. I4D/application owners review proposed changes after I4D completion on a separate authorized styling branch. No runtime patch is applied here. Example proposed rendering addition (review required): `<p>Source: {sourceTitle} · Resolution: {resolutionDisclosure ?? "unavailable"}</p>` alongside each legend. Tests must inspect that field for known and unknown values, not accept arbitrary prose containing a number.

## Verification and migration gates

Run `node --import tsx --test tests/i4c/*.test.ts` (use explicit PowerShell file discovery). Current failures are deliberately actionable. The independent contract tests verify numeric boundary handling, exact names, shared colors, source relationships, derived evidence, units, category order, retired-layer rejection and explicit legend resolution. Kernel fixture exposes Jezero missing-neighbor flattening; it is not a complete raster reprocessing test. Production browser cases cover 18 dataset controls at five sizes, keyboard toggles/ranges, region isolation; existing pixel tests supplement them. Require actual numeric-raster/legend agreement, no-data masks, color-vision review and source-specific metadata review before styling acceptance. No tests or specification imply operational EVA approval.
