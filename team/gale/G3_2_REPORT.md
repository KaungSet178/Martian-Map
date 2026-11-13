# Gale G3.2 — real DEM implementation and scientific audit

Baseline: `5eee968`, branch `feat/gale-map`. Dataset: `gale-g3-2-v1`.

Elevation, hillshade and slope are available as three optional **independent
native-coordinate DEM views**. Each starts at 100% opacity and fits the audited
subset. G1 imagery/traverse, G2 photographs and target records, G3.1 geology and
unrestricted map navigation are preserved. No target coordinates, geological
boundaries, hazards, routes, resource calculations or feasibility results added.

**Material limitation: precise local DEM-to-CTX alignment is NOT verified.**
The direct image comparison suggests a positional mismatch. No shift was fitted
into the scientific assets. These views support inspecting the DEM representation;
they do not support matching fine CTX features or navigation. Coverage and layer
limitations state this explicitly. Full opacity avoids default blending with CTX.

## Source selection and provenance

The selected source is NASA/JPL-Caltech PDS PLACES
[`msl_orbital_dem`, version 42.0](https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_maps/msl_orbital_dem.xml),
LIDVID `urn:nasa:pds:msl_places:data_maps:msl_orbital_dem::42.0`.
The [PLACES SIS](https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/document/PLACES_PDS_SIS.pdf)
§4.5 describes the localization-team USGS HiRISE DEM mosaic, CTX backfill, and
registration through associated orthophotos. Its older dimensions are superseded
by the actual v42 PDS4 label. Release time bounds are mission/archive context,
not constituent stereo acquisition dates; no per-pixel acquisition map is supplied.

The [machine-readable audit](G3_2_DEM_AUDIT.json) records selection, negative
alignment findings, rejected products, coverage, reference systems and scientific
gates. [Source snapshots](sources/g3-2/) preserve original label/header bytes and
range checksums. The generic PDS4 sample unit `DN` is not itself evidence for
physical elevation units: the metre/areoid interpretation comes from SIS §3.9.3
and the DEM product definition. Source samples have no additional scale/offset.

| Property | Verified interpretation |
| --- | --- |
| Native grid | 6,741 × 14,331 posts; 1 m projected spacing, **not uniform 1 m resolving power** |
| Encoding | Big-endian IEEE float32; image byte offset 53,928 after two headers |
| Horizontal CRS | Mars equirectangular; sphere R=3,396,190 m; standard parallel and central meridian 0°; no Earth CRS transform |
| Coordinates | Planetocentric latitude, east-positive longitude 0–360° |
| Native corner | Easting 8,141,037.49279 m; northing −271,513.07519 m; fractional offset retained |
| Vertical reference | Metres relative to the **MOLA areoid**, positive up; not sphere radial/ellipsoid height |
| Effective resolution | Source-dependent HiRISE/CTX mixture; per-pixel resolving power unavailable |
| Accuracy | Absolute horizontal/vertical and derivative errors unquantified; no accuracy certificate |

The independently published [HiRISE DTM DTEEC_009149_1750_009294_1750_U01](https://www.uahirise.org/dtm/PSP_009149_1750)
was investigated first. A bounded subset is entirely valid, but comparison to
2,304 mission-DEM samples gives median height difference +6.21 m and RMSE 7.04 m,
with unresolved registration differences. It is **not integrated**. The mission
DEM and DEM-sampled rover heights are related sources, not independent ground truth.
The [larger USGS merged v3 DEM](https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m)
is authoritative but approximately 3.6 GB; it was not downloaded. Its full
validity/source-quality zones remain unaudited.

## Actual coverage and alignment findings

The selected native window is column 1,569 / row 8,288, size 1,050 × 1,050.
All **1,102,500** posts are valid finite elevations; native range −4237.51 to
−4056.81 m. This is an inspected mask, not an assumption from the product envelope.
The historical Sol 2300 observer position selected an AOI around part of the
Curiosity corridor; it does not supply a photographed-feature or sampling-target
coordinate. The existing recorded traverse intersects the window.

After aggregation and dropping the unsupported gradient border, the common
display support contains **1,600 cells**, a 1,000 × 1,000 m *projected* square:

- Longitude: 137.3711184201–137.3879890250° E.
- Latitude: −4.7377057484–−4.7208351435° planetocentric.
- Ground east span is slightly shorter than projected span by cos(latitude).
- [Coverage GeoJSON](../../public/maps/gale/dem/coverage.geojson) describes the
  complete valid support for this pinned window only. Alpha is zero outside it.
- Neither the rest of Gale nor all Curiosity exploration has reviewed coverage.

G1's broad independent image check establishes the display latitude convention,
not precise local registration. The new local check compares 4,096 independently
georeferenced PDS orthophoto samples against the **committed CTX display tiles**,
with no transformation. Pearson DN agreement is −0.198. A diagnostic translation
search after smoothing improves a central patch to about 0.840 at row +12 / column
+3 of a 16.15 m sample grid. This suggests substantial mismatch; it is **not** an
accepted transformation or survey offset, and no correction was applied. Other
historical corridor windows also failed direct-match checks. Photometric differences
complicate correlation, so these diagnostics cannot certify an exact displacement.

The DEM retains its authoritative native frame. Precise CTX co-registration
remains a failed scientific gate for fine-feature comparison and operational use.
Layer details expose this; each DEM view starts opaque. Users may explore opacity,
but that does not resolve the alignment limitation. No source was moved to make
it appear aligned. See [local check](sources/g3-2/local-image-registration.json)
and [alternative-window review](sources/g3-2/aoi-registration-review.json).

## Derived data and units

The [processor](prepare_g3_2_dem.py) uses complete 25×25-post means: a **25 m
analysis grid**, not a verified 25 m effective resolution. Horn 3×3 derivatives
have **75 m support**. All nine analysis cells must be valid. Special/nonfinite
posts invalidate their complete block and dependent gradient cells. No nodata
filling, seam repair, smoothing across invalid data, height-bias correction or
vertical exaggeration occurs. The pinned subset contains no native gaps.

With p=dz/dEast and q=dz/dNorth, slope is
`degrees(atan(sqrt(p²+q²)))`. Horn's east denominator is
`8 × 25 m × cos(planetocentric latitude)`; the north denominator is `8 × 25 m`.
Raster rows run southward, so the north derivative reverses the row sign.
Both horizontal and vertical quantities are Martian metres; MapLibre/Earth
distances are never used. The pure [math module](dem_math.py) is tested against
analytic planes, flat surfaces, invalid neighbors and lighting direction.

Hillshade is the clipped dot product of the terrain normal `(-p,-q,1)` with
artificial light from azimuth 315° clockwise from north, altitude 45°.
It has no ambient term or cast shadows. It is not a photograph, measured
illumination, or a Sun position for an acquisition date.

| Derived field | Actual valid-cell range |
| --- | --- |
| Mean elevation | −4231.11 to −4061.56 m relative to MOLA areoid |
| Slope magnitude | 0.233 to 20.578° at 75 m support |
| Hillshade | 0.591–0.903 relative illumination |

These statistics describe this processed representation only. Mixed-resolution
backfill, stereo artifacts, interpolation and seams may remain. Coarsening does
not certify effective resolving power or eliminate artifacts. Small obstacles,
roughness, overhangs and hazards are unresolved. **Slope alone is not astronaut
safety.** Routing, all six mission assessments and resources remain unavailable.

## Application and shared contract handoff

The stable `gale-terrain` ID now displays elevation. `gale-hillshade` and
`gale-slope` use the same reviewed support. They reuse the existing layer manager,
attribution, units/legend details and opacity controls from `DESIGN.md`. One
thematic layer is active at a time; optical context and the historical traverse
can coexist. Each view is off initially; enabling it fits once. Opacity changes
and deliberate panning do not repeatedly fit the map. Fit exploration region
restores the original G1 overview. Terrain coverage is `partial`; scientific
readiness is not promoted beyond `metadata_verified`.

Three **optional**, backward-compatible `raster-tiles` fields are added to
`lib/contracts/science.ts`: `bounds` (per-product source requests), `focus_extent`
(one-time existing camera fit), `resampling` (`nearest` or `linear`). Omission
retains the old regional bounds and linear resampling. Classified DEM colors
use nearest sampling. No numeric DEM decoder, 3D terrain, feature-click API,
comparison tool, route profile or new regional UI shell is introduced. These
small renderer additions are the G3.2 handoff to regional developers; external
teammate approval is not claimed. Coordinate further shared behavior before use.
Jezero/Oxia source and assets are untouched.

There are **39 PNGs totaling 31,744 bytes**, zooms 5–14. They are display colors,
not terrain-RGB or recoverable numeric DEMs. Inverse angular Mercator encoding
locates tile pixel centers; it does not perform Earth geodesy. Coverage alpha
and per-source request bounds prevent extrapolation and missing-tile requests.
The original ~386 MB source image is not bundled. A single bounded 28,312,200-byte
row run is cached outside Git; only source metadata and small derived tiles ship.

## Reproduction and verification

Run from `D:\martian-map`:

```powershell
python -m pip install -r team/gale/requirements-g3-2.txt
python team/gale/prepare_g3_2_dem.py --download
python team/gale/audit_g3_2_alignment.py --download
python -B -m unittest discover -s tests -p test_gale_dem.py -v
npm run lint
npm run typecheck
npm test
npm run build
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3100'
npm run test:e2e
```

The DEM processor uses cached bytes by default. `--download` permits only the
pinned bounded range, rejects a full-file response, verifies SHA-256 and requires
the live label to equal the reviewed label. A changed release requires scientific
review. Source data, numeric analysis arrays and screenshots remain in ignored
`output/`. [Processing audit](sources/g3-2/processing-audit.json) records tile and
coverage hashes, masks, formulas, palettes and statistics. Rebuilding from the
pinned source reproduces every committed tile and coverage hash. Alignment
sampling is also range-bounded and checks pinned source samples.

Final validation on 2026-11-13:

| Check | Result |
| --- | --- |
| ESLint | Pass |
| Next type generation / TypeScript | Pass |
| Production build | Pass; app and static pages generated |
| Unit / contract / scientific asset integrity | 21 passed |
| Python terrain mathematics | 5 passed |
| Full Playwright Chromium suite | **39 passed**, final clean run, 3.5 minutes |
| Responsive layouts | 1440×900, 1024×768, 768×1024, 390×844 |
| Regional regression | Gale, Jezero and Oxia; source/target/UI isolation preserved |
| Navigation | Fit/reset, drag, wheel, keyboard, resize, mobile touch drag and pinch passed |
| G1 asset preservation | All 33 original SHA-256 values unchanged |
| G2 / G3.1 preservation | Photograph hashes/metadata and exact Arc Pass geometry/classifications pass |
| Derived reproducibility | Rebuilt from pinned bytes; tile and coverage hashes match |
| Scientific geography gate | Precise local CTX co-registration **not verified**; visible limitation, no applied shift |

The first full browser run found four assertions still expecting the removed
pending-DEM wording. They now check the processing-scale and alignment disclosures;
the final full run is green. New browser checks inspect actual rendered pixels,
all three views, opacity, exclusivity, source responses, accessibility and isolation.
Twelve DEM screenshots are in ignored `output/playwright/gale-g3-2-*.png`.
No missing Gale asset responses or page errors occurred in these checks.

To inspect manually, run `npm run dev -- --port 3100` from the repository root,
open `http://127.0.0.1:3100/?region=gale`, then Layers → Elevation, DEM hillshade
or DEM slope. Read coverage/limits beside the legend; collapse the mobile sheet
for a larger map. Pan, zoom and Fit exploration region, then switch to Jezero
and Oxia to check region isolation. The separate friend-preview checkout is
unrelated to this branch and is not used for these regression results.

## Files changed

- `regions/gale/{config,layers,terrain-layers}.ts`: regional source metadata,
  three DEM views and bounded capability/version update.
- `lib/contracts/science.ts`, `lib/map/region-layers.ts`,
  `components/map/map-workspace.tsx`: optional raster support, nearest sampling,
  and existing one-time focus behavior extended to raster layers.
- `public/maps/gale/dem/`: tiny derived tiles, coverage and byte-preservation rule.
- `team/gale/`: audit/report, provenance snapshots, deterministic processor,
  alignment checker, math, pinned processing requirements and context handoff.
- `tests/{mission,regions}.test.ts`, `tests/test_gale_dem.py`,
  `tests/browser/{gale-dem,planner}.spec.ts`: readiness/contract, asset integrity,
  math, actual rendered pixels, responsive views and version expectations.
