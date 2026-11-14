# Jezero four-layer baseline audit

Audit date: 2026-11-14 (Asia/Rangoon). Baseline: `d9fbe2f2bf845ef76e69b61cfa0f874246630ca6`, fetched `origin/feat/jezero-map`. Latest branch contains thermal already. Worktree: `D:/martian-map/output/gale-g1/output/jezero-four-layer-standardization`; branch `feat/jezero-four-layer-standardization`. The suggested external directory was replaced by an isolated directory within the authorized writable workspace. No other worktree was edited. Existing root, JZ-T1A and JZ-T1B worktrees were clean when inspected; detached preview status could not be checked under sandbox ownership rules. No JZ-T1A/T1B merge or cherry-pick was performed.

## Existing implementation

`regions/jezero/{config,layers,index,targets}.ts` supplies the shared renderer. Elevation: 193 RGBA PNGs under `terrain-tiles`, slope: 193 under `slope-tiles`, thermal: seven under `thermal-tiles`. All are XYZ 256px. CTX and recorded traverse are separate overlays. Existing geology is retained without geometry or eligibility changes; it is excluded from the four-category presentation index.

Read `team/jezero/terrain/{audit_report,build_report,slope_report}.json`, corresponding MJS generators, `team/jezero/basemap/{thermal_report,prepare_trek_basemap.mjs}`, and JZ-T1B's report from its own worktree. The original numeric DEM was absent in the searched repository tree. Its official 1,839,545,409-byte copy was requested from the USGS S3 mirror, rather than reconstructing heights from RGB tiles.

Oxia reference: read the Git object from `origin/feat/oxia-map`, not the obsolete pending Oxia records in the Jezero baseline; final reference SHA `0d1cc2eae0a745a9aeec8c3357c107c0e5ff108c`. It uses MOLA elevation, regional MOLA/HRSC hillshade, MOLA-grid slope and qualitative THEMIS night IR records through the same renderer. Its hillshade is a pre-shaded regional image with unspecified illumination and 200m posting, not an appropriate numeric source or processing template for Jezero. Its night IR is uncalibrated and differs from Jezero daytime IR. Oxia's slope record also makes a lunar-derived 20-degree accessibility interpretation; that interpretation was not copied into Jezero's display-only slope metadata. No Oxia files changed.

## Product inventory and provenance

| Field | Elevation | Slope | Thermal |
|---|---|---|---|
| Original product | `JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40` | Same DEM | `THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018` |
| Mission / instrument | MRO / HiRISE stereo; USGS TRN mosaic | Same | Mars Odyssey / THEMIS, served by NASA Mars Trek |
| Source | [USGS release](https://www.usgs.gov/data/mars-2020-terrain-relative-navigation-hirise-dtm-mosaic), DOI 10.5066/P9REJ9JN | Same | [NASA Mars Trek](https://trek.nasa.gov/mars/); precise service URL in thermal_report.json |
| Quantity / units | Areoid-relative elevation, m; rendered as shaded tint | Gradient angle, degrees | Relative daytime infrared brightness; qualitative, no physical numeric units |
| Native CRS | Equirectangular, latTs=0/lon0=0, Mars sphere R=3,396,190m | Same | Service equirectangular tile grid; exact original mosaic sphere/CRS not independently authenticated here |
| Latitude / longitude | Planetocentric north-positive / east-positive, 0–360 | Same | Service latitude/east longitude passed to application display convention; original per-observation metadata unresolved |
| Native posting | 1m | 1m source; derivative is on output display grid | Approximately 100m |
| Display posting | z5–14: approximately 2470m to 4.825m at 18.46N | Same; gradient cardinal baseline is twice these distances | z5–9: approximately 2470m to 154m; enlarged beyond z9 |
| Coverage | Source envelope 77.222933–77.583964E / 18.306799–18.669315N; irregular valid mask | Same source; legacy output alpha | Seven opaque tiles; full source valid footprint not established |
| App coverage | Tile ranges in build_report.json, spanning mission extent plus 0.01deg margin, retaining full tile pixels wherever DEM valid | Same tile ranges | Tile ranges in thermal_report.json, mission extent plus 0.05deg margin |
| Processing | Bilinear DEM sampling, percentile ramp -2620/-1770m, gamma .75, legacy shade multiplier .65–1 | Bilinear sample then display central differences; Mars ground spacing; missing cardinal neighbor replaced by center | Nearest source-level L=z-1 WMTS sampling, source alpha retained; original report's “1:1” wording is exact only for longitude increments |
| Checksums | New checksums inventory records all retained assets; numeric source SHA256 in hillshade_report.json | Same inventory; no tile bytes changed | Same inventory; no tile bytes changed |
| Registration | Historical PLACES height agreement, not independent absolute horizontal control | Inherits DEM coordinates; no independent horizontal control | UNVERIFIED; successful tile rendering does not establish alignment |

Posting above uses `2*pi*3396190*cos(latitude)/(256*2^z)`. Existing comments claim ~10m at z14 and ~19m at z13; these are approximately twice the actual output posting. Derivative cardinal support is two output pixels, which may explain that wording but is not pixel resolution.

## Scientific findings

1. **Elevation visualization defect:** `build_terrain.mjs` uses `156543.03392*cos(lat)/2^z` (Earth radius) for gradient spacing. Its illumination expression gives flat-ground brightness dependent on an undefined aspect rather than sin(altitude). Existing numeric heights are not thereby invalidated. Retain historical pixels with explicit processing UNVERIFIED; do not certify the embedded hillshade.
2. **Legacy pixel origins:** elevation/slope samplers map affine corner coordinates directly to array indices, omitting the -0.5 pixel-center correction. This is a nominal half-native-post offset, not evidence for a general geometric correction. New standalone hillshade uses centers explicitly. No source affine was changed.
3. **Slope:** interior gradient method uses Mars spacing and degrees as stated, but derivatives vary with display zoom and nodata neighbors are flattened. Full numerical reproduction remains unverified; native source posting is not derivative resolution. Existing continuous ramp is 0/3.5/8.75/17.5/26.25/35deg, saturating at 35deg. Sampled reported max 54.4deg is not a full-data maximum. Legacy legend bin colors were representative midpoint samples, not class fills. Replace legend with actual continuous anchors, preserving values and pixels. Proposed 0/5/10/15/20deg intervals are deferred until deliberate recoloring, not silently claimed as existing classes.
4. **Elevation range:** old audit extrema are sampled (~1.25% source), not exact extrema. New full scan records native and mission-center extrema; neither is the legacy color saturation range. Published FGDC range understatement and documented western CR stereo y-parallax caveat remain applicable. PLACES height agreement (+0.025m median, abs P95 4.256m across 30,445 historical matches) supports vertical consistency but shares mission/control lineage.
5. **Thermal:** no Kelvin or thermal-inertia legend is scientifically supportable. October 2018 identifies a mosaic version, not a single observation date. The existing grayscale qualitative legend and all seven tiles must remain. Service provenance is recorded, but raw radiometry, observation list and absolute registration remain UNVERIFIED.
6. **Nodata/coverage:** report coverage rectangles describe nominal selected bounds, not enforced per-pixel mission masks. The generators write whole tiles, so valid pixels outside the nominal rectangle can exist. Full original DEM coverage exceeds the mission viewport. Hillshade can prepare full-source tiles; the shared camera remains mission-clamped. Thermal full source extent cannot be invented from seven local tiles.

## Verification dimensions before work

| Product | Source | Processing | Registration |
|---|---|---|---|
| Elevation source / legacy shaded display | VERIFIED source reference; local byte identity to be recorded | UNVERIFIED; identified shading/indexing issues | UNVERIFIED absolute horizontal |
| Hillshade | NOT_EVALUATED (absent) | NOT_EVALUATED | NOT_EVALUATED |
| Slope | VERIFIED source reference | UNVERIFIED overall; interior formula inspected | UNVERIFIED absolute horizontal |
| Thermal | UNVERIFIED beyond existing service lineage | UNVERIFIED reproduction/radiometry | UNVERIFIED |

JZ-T1B's 100–200m offsets apply to SIM3464 geology; its CTX discrepancy and separate HiRISE GeoJP2 WKT/PDS-label conflict are source-specific. They are not evidence that this DEM or thermal is invalid. No accepted independent absolute geological control points exist. These findings are retained in the integration handoff, not applied as a blanket terrain rejection.

Targets on this baseline already have null coordinates, pending verification and unavailable routing. Preserve them and all mission computations. Tests previously covered general registry/renderer behavior; this milestone adds Jezero category, provenance, preservation and numerical hillshade checks.
