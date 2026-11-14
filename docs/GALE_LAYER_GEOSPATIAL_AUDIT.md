# Gale scientific layer geospatial audit — Phase 0

Audit date: 14 November 2026 (Asia/Rangoon). **Audit only; Phase 1 has not started.**

## 1. Executive summary

The checked-in terrain overlays have the geographic footprints specified by their source-derived grids. No evidence of a stretched raster, arbitrary translation, incorrect current bounds, or slope-specific footprint defect was found. The visible size differences principally reflect different scientific coverage and processing windows:

- Regional HRSC elevation, hillshade and slope occupy **141.733079 km²**, 1.472412 times the fixed Lower Mount Sharp overview. This is a deliberately buffered crop, not the entire much larger HRSC source mosaic.
- Global HRSC–MOLA elevation, hillshade and slope occupy **1,665.252534 km²**, 17.299681 times the overview and about 11.749 times the regional display area. They use a separate, broader crop and nominal 200 m grid.
- Arc Pass occupies **58,323.087 m² on the declared sphere**, approximately 263.233 × 221.575 ground metres, just **0.060590%** of the overview. Enlarging it would misrepresent the study.

All **1,515** terrain PNGs match existing SHA-256 receipts. Across all prepared zooms, the three themes in each family have identical alpha masks, and inverse-coordinate footprint checks have **zero mismatched pixels**. All 53 Arc Pass geometries retain every source XY vertex and Unit assignment: maximum coordinate difference after the declared inverse projection is **0 degrees**.

There are real **coverage-description defects** and presentation gaps. The global-layer claim of coverage across the entire Gale Crater is false for the shipped crop. Independent terrain/CTX/color registration and absolute positional accuracy remain unverified. Coordinate consistency does not resolve those questions.

## 2. Repository baseline and current architecture

`git fetch origin` succeeded before branch creation. Latest verified `origin/feat/gale-map`: **`bd12f5508ed317b76d5119db39b56e4f4f059590`**, `docs(gale): record verified G4 G5 integration and scientific audit`. The caller worktree was initially clean on `feat/gale-basemap-upgrade`; it was not switched or edited. This audit uses **`feat/gale-layer-visualization`**, created directly from that remote commit, in `output/gale-layer-visualization` beneath the caller worktree. No merges were performed.

The worktree inventory includes shared Gale, color, integration, terrain, Jezero, waypoint, resource and timeline branches. Audit checkpoints found ongoing edits in `D:/martian-map/components/map/map-workspace.tsx` and an untracked `tests/mission-m4-integration.test.ts` in the M4 integration worktree. Both were left untouched; before/after status maps in [measurements.json](diagnostics/gale-layer-audit/measurements.json) are identical outside this audit worktree. No work on the active shared renderer was needed.

The installed Next.js documentation index and Turbopack reference were read. No application code was changed.

| Implementation | Actual role inspected |
| --- | --- |
| `regions/gale/config.ts` | Mars reference sphere, fixed overview, source lineage and scientific gates |
| `regions/gale/terrain-layers.ts` | Six thematic declarations, source-specific request bounds, nearest texture sampling |
| `regions/gale/layers.ts`, `geology-legend.ts` | Source GeoJSON, categories, colors and Arc Pass focus extent |
| `lib/map/region-layers.ts` | MapLibre XYZ sources, request bounds, raster sampling and categorical vector fills |
| `lib/map/camera.ts`, `components/map/map-workspace.tsx` | Overview fitting, unrestricted navigation and existing geology fit behavior |
| `team/gale/prepare_g4_terrain.py`, `dem_math.py` | Integer windows, nine-post validity, Horn derivatives, XYZ sampling |
| `team/gale/extract_usgs_200m.py`, `verify_g4_global_source.py` | Global window origin, original affine and DN correspondence |
| `team/gale/prepare_g3_geology.py` | Mars inverse projection, unchanged polygon vertices, retained Unit/OBJECTID |
| `scripts/gale-basemap/`, `lib/map/color-basemap.ts` | Separate provisional color pipeline; never used here as ground control |
| `components/mission/` | Geometric planning and explicit unavailable terrain/safety outputs; no alternative overlay transformation |

Terrain themes are precolored 2D raster tiles, not a MapLibre elevation surface or runtime `raster-dem`. Heights do not displace the map vertically. Topographic themes are mutually exclusive; geology, CTX and traverse can coexist. Terrain toggles preserve the camera. Explicitly opening Arc Pass already fits its focus extent; opacity changes do not refit it.

## 3. Source dataset inventory and evidence

| Layers | Original product and files | Inspection in this audit |
| --- | --- | --- |
| Regional elevation / hillshade / slope | Persaud, Putri and Muller (2021), [30-m HRSC DTM Mosaic](https://zenodo.org/records/5808354), DOI `10.5281/zenodo.5808354`; `hrsc_km09_h1938_h1927_h1916-dtm-mosaic.tif`; images H1938_0000, H1927_0000, H1916_0000 | Read complete 311,785,221-byte cached original, CRS/affine, full source mask and cropped support; matched existing source SHA-256 and published MD5 lineage |
| Global elevation / hillshade / slope | Fergason et al. (2018), USGS HRSC–MOLA blend v2, original `Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif`; [original object](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/HRSC_MOLA_Blend/Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif); subset `usgs_hrsc_mola_200m_gale.tif` | Opened corrected 81,924-byte subset; replayed pinned original TIFF header and 537 source DN samples from existing cache. Full 11,384,463,908-byte original not downloaded |
| Arc Pass geology | Joel Davis (2025), [Figshare 30401788 v1](https://doi.org/10.6084/m9.figshare.30401788.v1), file 58896958, `Geomap.gdb.zip`, class `map_unit_polygons_v2`; associated [Davis et al. study](https://doi.org/10.1029/2025JE009538) | Read original 94,771-byte FileGDB archive through GDAL/OpenFileGDB, verified ZIP CRC/hash, transformed every geometry and compared all display coordinates/Unit values |

Raw terrain inputs were read from the **corrected integration cache** at `../gale-g4-g5-integration/output/g4/raw`, not the older terrain-development cache. Input hashes remained unchanged:

| Input | SHA-256 |
| --- | --- |
| Regional original TIFF | `ed1fd5cd080a62eff7d2b9f38110c0a2c62ee05a4706ac0b45d015043e781ae6` |
| Corrected global subset TIFF | `6661929884ed52de7f0a7e746e99d5196783178ce7bdfe718c52402747b87ff4` |
| Arc Pass original archive | `783f052b5bb5eb7b478e66ce6c972816f8adc0e154be0176bc817b14cd7e8a24` |
| Arc Pass display GeoJSON | `d182c9291450f77fd07fef4fbdb979d23df45e65c6665fb02dd7df08f2748dce` |

No production generator was run, no new terrain raster was produced, and no new geology dataset was downloaded or integrated.

## 4. Geospatial metadata for all seven layers

Bounds use **west, south, east, north**, east-positive longitude and planetocentric latitude in degrees. Affines use Rasterio order **`[a,b,c,d,e,f]`**: `x=a*col+b*row+c`, `y=d*col+e*row+f`, at pixel edges. This is not GDAL's differently ordered six-value tuple.

### Original raster grids

| Property | Regional HRSC original | Global HRSC–MOLA original | Corrected global Gale subset |
| --- | --- | --- | --- |
| Width × height | 7,584 × 10,275 | 106,694 × 53,347 | 179 × 238 |
| Data type | Float32 | Int16 | Int16, source DNs retained |
| Horizontal CRS | Spherical equirectangular metres; standard parallel/central meridian/false offsets zero | Mars spherical geographic degrees | Same as global original |
| Datum | WKT named `unknown`, spheroid radius exactly 3,396,190 m, flattening 0, prime meridian 0; numerically compatible with configured Mars sphere | `Mars_2000_(Sphere)`, R=3,396,190 m, flattening 0, reference meridian 0 | Same as global original |
| Nominal posting | 30 m projected | 200 m; actual angular step `0.003374120830641°` | Same angular step |
| Actual north spacing | 30 m | 199.999991643332 m | 199.999991643332 m |
| East spacing at overview midpoint | 29.899057957 m | 199.327044718 m | 199.327044718 m |
| Nodata | -32768 | -32768 | -32768 |
| Mask | Nodata mask AND finite DN | Complete original mask not read | Nodata mask AND finite DN; all 42,602 cells valid |

Source geographic envelopes:

```text
Regional original: [135.89056941086952, -8.184239268244921,
                    139.72896942818787, -2.9838753207309043]
Global original:   [-180.0, -89.99922395220543, 179.99844790441085, 90.0]
Global subset:     [137.09650154281053, -5.0995956116165795,
                    137.70046917149526, -4.296554853924022]
```

Original/subset affines:

```text
Regional original (metres):
[30, 0, 8054872.398099138, 0, -30, -176868.30708358268]
Global original (degrees):
[0.003374120830641, 0, -180, 0, -0.003374120830641, 90]
Global subset (degrees):
[0.003374120830641, 0, 137.09650154281053,
 0, -0.003374120830641, -4.296554853924022]
```

The HRSC original has **60,515,345 valid cells / 77,925,600 total**, 77.657849% by cell count, occupying **54,193.511331 km²** of spherical cell area. Its valid-data footprint is irregular. Its valid-cell bounding box is `[135.89056941086952, -8.183733150099178, 139.72846331004214, -2.9838753207309043]`; this box does not encode missing areas. The exact footprint is the union of valid source cell rectangles identified by the hashed full-resolution mask in the JSON; the figure shows a reduced preview. The selected regional support window is entirely valid. The global subset is entirely valid. The full global original's mask was not scanned, so whole-globe valid coverage is **not established** here.

Project lineage records heights in metres relative to the **MOLA areoid, positive up**; regional heights inherit HRSC–MOLA control. Neither inspected TIFF declares a complete vertical CRS or uncertainty raster. Numeric spheroid compatibility is not a vertical-error or control-network certificate. Posting is not independently measured effective resolution. Acquisition dates and per-cell stereo quality remain unestablished.

### Derived grids and individual products

Regional output starts at source column/row **(2839,3122)**, width 291, height 543. Input support is 293 × 545; one border cell is omitted on each side for Horn support. Global output starts at subset **(1,1)**, width 177, height 236, from 179 × 238 input. No aggregation or stretch is applied.

```text
Regional inner affine (metres):
[30, 0, 8140042.398099138, 0, -30, -270528.3070835827]
Regional derived extent / current request bounds:
[137.32743882663516, -4.838798324880672,
 137.47471920704652, -4.563976171741976]

Global inner affine (degrees):
[0.003374120830641, 0, 137.09987566364117,
 0, -0.003374120830641, -4.299928974754662]
Global derived extent / current request bounds:
[137.09987566364117, -5.096221490785939,
 137.69709505066461, -4.299928974754662]
```

| Individual layer | Grid; valid cells | Analysis/support scale | Values and transformation | Display pack |
| --- | --- | --- | --- | --- |
| Regional HRSC elevation | 291 × 543; 158,013 | 30 m posts; same nine-post support mask as derivatives | Inner source elevations unchanged; five classes; committed range -4530 to -2641.216552734375 m | `terrain-regional/elevation`, 70 PNGs |
| Regional HRSC hillshade | 291 × 543; 158,013 | 30 m posts, 90 m north gradient support | Horn normals; light azimuth 315°, altitude 45°; clipped 0–1, rounded 8-bit gray; committed range 0.589336–0.943723 | `terrain-regional/hillshade`, 70 PNGs |
| Regional HRSC slope | 291 × 543; 158,013 | 30 m posts, 90 m north support | `degrees(atan(hypot(dz/dEast,dz/dNorth)))`; breaks 5/10/15/20°; committed range 0–27.299451° | `terrain-regional/slope`, 70 PNGs |
| Global HRSC–MOLA elevation | 177 × 236; 41,772 | Nominal 200 m posts; same derivative support mask | Source elevations unchanged; same class breaks; committed range -4635 to 179 m | `terrain-global/elevation`, 435 PNGs |
| Global HRSC–MOLA hillshade | 177 × 236; 41,772 | Nominal 200 m posts, 600 m north support | Same Horn/light equations, 8-bit gray; committed range 0.418516–0.955397 | `terrain-global/hillshade`, 435 PNGs |
| Global HRSC–MOLA slope | 177 × 236; 41,772 | Nominal 200 m posts, 600 m north support | Same numeric-degree equation/classes; committed range 0–32.299784° | `terrain-global/slope`, 435 PNGs |
| Arc Pass geological units | Vector: 53 MultiPolygon source records; seven Unit values | Reported digitization at 1:250 on HiRISE; raster dimensions, pixel resolution, affine and nodata **not applicable** | Exact Mars inverse projection; zero Z omitted; unchanged XY/Unit/source ID; categorical fill | `arc-pass-geology.geojson`, 240,690 bytes |

Value ranges above come from the existing hash-verified processing receipt; terrain fields were not regenerated to claim new measurements. Existing analytic tests verify the equations. Within each family, all three themes use the same **fully valid inner rectangular footprint**. Elevation uses the stricter derivative support rather than an elevation-only mask. This would matter around nodata holes, but creates none here.

Every raster theme uses inverse XYZ Mercator pixel-center lon/lat → source-derived row/column → floor-index nearest-neighbor sample → precolored PNG, alpha 255 for supported cells and 0 outside. Tiles are 256 × 256, prepared at zooms **5–13 inclusive**. Runtime MapLibre also uses **nearest** sampling; overzoom repeats cells without adding observations. Earth Mercator is display encoding; physical gradients/distances use Mars metres, not an Earth-radius scale.

## 5. Source, valid, rendered, viewport and traverse footprints

The **fixed overview** is `[137.3442352329006, -4.822361175063087, 137.4579431096443, -4.580605407446296]`, **96.259148 km²**, about 6.717 × 14.330 km. Provisional color tiles and CTX tiles use this reviewed optical footprint. Neither defines original terrain source coverage.

The **interactive viewport** is the canvas's current visible extent. Initial fitting adds layout-dependent padding; it is not the overview box. Panning and zooming can reveal terrain beyond the optical crop. Navigation is unrestricted by these data bounds. A single invariant viewport bounding box cannot be reported independently of layout/navigation.

The **recorded traverse** is line geometry, not a scientific-coverage polygon. Its envelope is `[137.3527136, -4.825677784, 137.4494842, -4.589136889]`; southern geometry lies beyond the old optical overview. Its envelope is not actual visited surface area or a safety corridor.

| Product | Original footprint | Valid derived footprint | Current rendered behavior |
| --- | --- | --- | --- |
| Three regional themes | Irregular support inside large original HRSC TIFF | Entire 291 × 543 crop; 141.733079 km²; contains overview | Alpha matches crop; nearest sampling; request bounds equal analysis grid |
| Three global themes | Near-global envelope; whole-source mask uninspected | Entire 177 × 236 crop; 1,665.252534 km²; contains overview and regional crop | Same behavior on broader crop; not a globally served tile pack |
| Arc Pass | Source study `boundary_box`, with original tiny topology gaps | Union of 53 original interpreted polygons | Unchanged vector footprint; focus extent equals polygon envelope; no fill beyond polygons |

Raster source bounds restrict **tile requests**, not vector-style per-pixel clipping. Actual visible edges come from tile alpha. Rendered pixel-cell edges can extend/recede by up to half a display pixel relative to the analysis box, depending on zoom. Measured zoom-13 alpha envelopes:

```text
Regional: [137.32738494873047, -4.8388649022053665,
           137.47467041015625, -4.563933498759915]
Global:   [137.09993362426758, -5.0962446630892515,
           137.6971435546875, -4.2998522307419185]
```

At zoom 13, a display pixel is about 10.175 m equatorially, 10.141 m locally, versus 30/200 m analysis posting. Half-pixel edge quantization is about 5.1 m, not a free coordinate offset. At zoom 5, display pixels are about 2.605 km equatorially. Every zoom's counts/envelopes are in the JSON; no theme-specific alpha differences were found. Both terrain families cover the fixed overview fully at the finest prepared level. The baseline runtime receipt reports color coverage 99.971875% from its separate edge sampling; that is historical evidence, not a new HTTP measurement.

## 6. Why regional elevation looks oversized

The processor adds **1,000 projected metres** around each overview edge before selecting an integer source window, then removes the one-cell derivative border. The displayed crop extends roughly 0.97–1.00 km beyond each overview side. It is about **8.701 × 16.290 km**, versus the optical overview's 6.717 × 14.330 km: **29.5% wider, 13.7% taller, 47.24% larger in area**.

A high-opacity terrain rectangle remains visible beyond the image edge when the camera includes the surroundings. The original HRSC source is much broader still; the app does not render its full 227.520 × 308.250 km projected array.

The evidence supports intentional crop/coverage differences, not an incorrect CRS, stretch, geotransform or camera scale. No user screenshot was supplied to attribute a particular historical view; findings apply to the verified commit and delivered assets. Visual overlap does not establish independent optical registration.

## 7. Why regional and global slopes differ

Global extraction starts from a broad requested window near **137.1–137.7° E, -5.1–-4.3° N**, snapped to original integer cells. Its trimmed output is about **35.281 × 47.200 km**. Regional slope uses the smaller buffered overview crop. This difference is also present in the corresponding elevation/hillshade layers.

Both derivatives preserve their source grid geometry and require all nine Horn posts. East gradient spacing includes `cos(latitude)`; rows increase southward and north-gradient sign is handled explicitly. The grids have different origins, dimensions, effective support and source reconstruction/blending. They should not have identical slope patterns or sharpness. The approximately 6.667-fold posting difference and **90 versus 600 m support** are scientifically consequential. Repeated screen pixels do not add local detail.

No slope-specific clipping or scale defect is demonstrated. A common legend compares numeric classes as representations, not measurements at equal scale/uncertainty. Differences do not indicate terrain change, hazard boundaries or route classes.

## 8. Arc Pass footprint, traverse and symbology

Source native envelope in equirectangular metres:
`[8144734.477600001, -283870.8426000001, 8144998.632300001, -283649.2681]`.

Exact geographic envelope:
`[137.4065970458571, -4.789072816244821, 137.4110534954222, -4.785334720408685]`.

CRS: `Mars2000_Equidistant_Cylindrical_clon0`, Mars 2000 sphere R=3,396,190 m, meridian/offsets zero. Inverse: `lon=degrees(x/R)`, `lat=degrees(y/R)`. On the sphere planetographic/planetocentric latitude coincide. No Earth datum or oblate-Mars conversion is introduced. Longitude wrapping is the identity here.

The source rectangle measures **264.154700 × 221.574500 projected metres**; east ground width is **263.233202 m** after spherical latitude correction. Polygon union area is **58,527.260774 projected m²**, or **58,323.087124 spherical m²**. The 0.35% difference is projection distortion. Surface area uses oriented rings and PyProj spherical polygon area; numerical precision is not survey accuracy.

All 53 source features are valid/nonempty. Counts: **F1 5, F2 1, F3 16, mF1R 2, MSg 7, R 21, S 1**. Source study boundary: 58,529.945575 projected m²; **2.684801 m²** inside is unmapped, **0.000172 m²** of polygon overlap remains, and none lies outside. These source artifacts were preserved, not repaired.

Arc Pass lies fully inside Lower Mount Sharp's optical overview and both terrain crops. About **720.224 m of historical linework** intersects the polygon union in source projected coordinates. This includes recorded turns/backtracking; it is not visited area, chronology or a calculated route. The GeoJSON has one source feature carrying intersecting multipart linework; diagnostic plotting preserves disconnected segments.

The display preserves all categories/vertices exactly. Seven muted colors are explicitly **Marswalk styling**, not the publisher's palette. F1/F2/F3 and mixed-facies descriptions follow the existing study-backed legend; MSg/R/S retain raw codes rather than invented expansions. Auxiliary draft/final contacts, troughs, ridges, profile and study-boundary classes are omitted from independent display. Thus the polygon interpretation is preserved, but not every element of original map symbology. No source style definition was established that would justify calling these colors the original palette.

The existing [native-coordinate PDS reference diagnostic](../team/gale/screenshots/g3-1/arc-pass-registration.png) was visually inspected: boundaries are consistent with mapped landforms without a fitted shift. This supports image consistency, not quantitative independent registration or confirmation of geological interpretation. Color imagery was not used to move polygons. At overview scale the study should look tiny; its existing focus fit strongly overzooms CTX relative to vector detail.

## 9. Registration and alignment assessment

| Relationship | Supported conclusion | Unresolved |
| --- | --- | --- |
| TIFF → analysis grid → tiles | Numeric geometry/alpha consistent; runtime/coverage bounds match | Effective resolution and absolute source control |
| Regional vs global | Same numeric sphere, broad HRSC–MOLA lineage, individual origins retained | Independent feature alignment and correlated errors; grids are not identical |
| Global original → subset | Original header affine and 3 rows / 537 DNs replayed and matched | Unsampled original rows and full global mask |
| Geology source → display | Exact inverse projection, all vertices/Units retained | Absolute map tie and interpreted-contact completeness |
| Scientific layers → CTX | Compatible coordinate conventions; prior PDS image evidence supports geology consistency | Independent local co-registration/residuals |
| Scientific layers → provisional color | No new registration claim | Independent color registration remains unverified |

The old global subset used `360/106694` rather than the TIFF pixel scale. That was corrected **before this audit's starting commit**. Old affine: `[0.0033741353778094364, 0, 137.09786867115304, 0, -0.0033741353778094364, -4.296961403640324]`. Corrected values above are present in the integration cache, current receipts/tiles and runtime extent. The older development cache still exists and must not be mistaken for verified input. Phase 0 made no affine or DN correction.

## 10. Defects and presentation gaps

| Finding | Classification | Evidence / consequence |
| --- | --- | --- |
| Global text says “across the entire Gale Crater footprint” | **Current scientific-description defect** | Shipped crop is only ~35 × 47 km; the associated study describes Gale as ~155 km across. Global parent coverage does not make the local pack crater-wide |
| Regional text cites overview coordinates without explaining larger displayed crop | **Coverage-description ambiguity** | Display area is 1.4724× overview; source/crop/overview differ |
| Manifest notes credit “Persaud, S.” | **Attribution metadata defect** | Primary archive names Divya M. Persaud, Alfiah Diana Rizky Putri and Jan-Peter Muller; reconcile attribution separately |
| Coverage GeoJSON exists but is not mounted as an outline | Presentation gap | Thematic edges lack a distinct source-footprint key |
| Global label can imply globally served coverage; support scales unevenly emphasized | Presentation gap | Source lineage, app coverage and spatial support are easily confused |
| Historical global affine error | **Previously corrected processing defect**, not current | Original header replay matches corrected metadata; do not apply another shift |
| Regional larger than optical crop; global larger than regional; Arc Pass tiny | **Scientifically consistent differences** | Actual source windows/study boundary explain them |
| Pixel-edge quantization / nearest blockiness | Expected sampling behavior and limitation | Zero inverse-sampling mismatches; no evidence for fitted offsets |

No current production rendering or terrain-processing defect was demonstrated for these seven overlays. Unverified registration is a limitation, not evidence that an arbitrary correction is valid.

## 11. Recommended corrections, without implementation

Preserve source coordinates, derived affines, masks and region/camera configuration. Explain each theme using separate **source product**, **display crop**, **valid coverage**, **posting** and **gradient support** fields. Describe the global pack as a “Gale-area crop from global HRSC–MOLA,” not whole-crater/global display coverage. Correct attribution from the primary record.

Add optional coverage outlines with an explicit legend. Current terrain inner crops are fully valid rectangles; future irregular sources must use actual validity masks. Outside a crop means unavailable data, not zero slope or a geological class. Preserve transparency and nearest thematic rendering.

Offer explicit terrain zoom-to-coverage actions and retain existing Arc Pass focus behavior. Keep optical overview fitting unchanged. Label Arc Pass as local interpreted geology; its study boundary is a mapping limit, not a geological contact. Show 30/200 m posting and 90/600 m north support, with “nominal” for the coarse grid. Keep registration caveats and non-operational status visible. Review low-zoom sampling only as presentation; do not infer a CRS correction from pixel quantization.

## 12. Broader geological dataset research

This phase consulted primary publication/catalog metadata and the existing evidence inventory. **No additional GIS/archive/map dataset was downloaded or integrated.** Evidence stages distinguish publications, catalogs and inspected GIS.

| Candidate | Scope and evidence | Recommendation / limits |
| --- | --- | --- |
| [Meyer et al., clay–sulfate study](https://pubs.usgs.gov/publication/70258181), [supplement DOI](https://doi.org/10.1130/GSAB.S.25938268.v1) | Strong regional follow-up. Pinned metadata lists `B37355_DataFileS1-C1.zip`; prior GIS inspection records 8 shapefiles: layer boundaries, marker-bed polygons, pediments, formation-tagged rover segments | Highest-priority GIS candidate for later review; not complete formation-polygon coverage of the overview. Files mix projected/geographic coordinates; each CRS/geometry needs review. Not re-downloaded/rendered here |
| [Fedo et al. Glen Torridon map](https://zenodo.org/records/7041712), associated DOI `10.1029/2022JE007408` | Primary catalog verified; corners 137.3767–137.3919 E, -4.7383–-4.7206 N; broader than Arc Pass but still a local subregion. Distributed product is JPEG | Useful reference, not ready georeferenced polygons. Obtain original GIS/control metadata before integration. Do not stretch the figure to catalog corners or infer traced contacts |
| [Hughes, Glen Torridon geomorphic map](https://openscholarship.wustl.edu/data/95/), DOI `10.7936/0cyw-3n10` | Primary repository identifies dataset; existing DataCite snapshot resolves to migrated library record | Follow up on GIS release, footprint, classification and CRS. Current product-file availability unestablished here; catalog evidence is not render approval |
| [Thomson et al. 1:60,000 Gale mapping](https://www.hou.usra.edu/meetings/pgm2024/pdf/7022.pdf) | Primary 2024 progress abstract describes western Aeolis Mons mapping expanded east into sulfate-bearing terrain | Strong broader mound-scale lead; no final released GIS verified. Progress maps are not production-approved layers |
| [USGS SIM 3292, Geologic Map of Mars](https://pubs.usgs.gov/sim/3292/) | Official global map/GIS release, 1:20,000,000; pinned original readme specifies Robinson / Mars 2000 sphere R=3,396,190 m | Broad context only; too coarse for corridor formation contacts or Arc Pass facies. Review polygons/projection if later approved; database not downloaded |

Primary web checks on 14 November 2026 confirmed the Persaud, Fedo, USGS publication, Thomson abstract and Hughes catalog records. Some direct DOI/API/USGS opens failed or returned 403; search-indexed primary pages and already pinned metadata supplied the stated evidence. No exhaustive current-availability claim is made. The Arc Pass archive geometry, not a web illustration, controls its measured footprint.

## 13. Risks, unresolved questions and diagnostic evidence

Effective HRSC/MOLA resolution, absolute horizontal/vertical error, slope uncertainty and source quality masks remain unquantified. Shared control means regional/global agreement would not independently validate either. Absolute geology/CTX/color ties remain unverified. No classes describe safety, traversability, mineral abundance or route suitability. Mission, weather, Jezero, Oxia, boundaries and safeguards are unchanged.

The full original global valid-data mask was not read; the local subset is fully measured. The HRSC full irregular footprint is summarized numerically and with a reduced visualization; its envelope must not be reused as a mask. Areas use the declared sphere, not areoid surface-area integration or terrain surface area. Detailed geology contacts need source-appropriate HiRISE context; coarse CTX and unregistered color cannot establish precise contact alignment.

Evidence:

- [New footprint diagnostic figure](diagnostics/gale-layer-audit/footprints.png): original HRSC validity preview, crop/overview/traverse comparison, Arc Pass polygons with preserved disconnected recorded segments. Plot colors distinguish polygons for inspection and are not a geological legend.
- [Machine-readable measurements](diagnostics/gale-layer-audit/measurements.json): CRS/affines, full-mask hashes/counts/areas, inner grids, every zoom's alpha envelope, source geometry comparisons and worktree checkpoints.
- [Read-only reproducer](diagnostics/gale-layer-audit/audit.py): writes only sibling diagnostics; never invokes production generators.
- Existing baseline [CTX/regional browser view](images/g4-g5/ctx-regional-1440.jpg), [color/slope view](images/g4-g5/color-slope-1440.jpg), [Arc Pass PDS reference](../team/gale/screenshots/g3-1/arc-pass-registration.png). These are existing evidence, **not new screenshots**. No fresh browser session or HTTP runtime check was run in this audit.

Reproduce from this audit worktree using existing caches/libraries (source inputs read-only):

```powershell
python -B docs/diagnostics/gale-layer-audit/audit.py `
  --raw-dir ../gale-g4-g5-integration/output/g4/raw `
  --global-ranges ../gale-g4-g5-integration/output/integration-science/global-ranges `
  --gis-libs D:/martian-map/output/g3-geology/python-libs
```

Tools: Python 3.13.7, Rasterio 1.5.2 / GDAL 3.12.2, PyProj 3.8.0 / PROJ 9.8.1, Pyogrio 0.13.0, Shapely 2.2.0. Original global header SHA-256: `c4189705c45c65eef450cacd4942fc31832a75b48fa35df2b578aa7689f028d7`. Three original source rows matched all **537 sampled DNs**. Original files and production assets were not rewritten.

## 14. Validation, delivery and proposed Phase 1

| Executed check | Result |
| --- | --- |
| `python -B -m unittest discover -s tests -p 'test_gale_*.py' -v` | **37 passed, 0 failed, 0 skipped** after provisioning isolated scratch/cache; final log linked below |
| `node D:/martian-map/node_modules/tsx/dist/cli.mjs --test tests/mission.test.ts tests/regions.test.ts tests/gale-integration.test.ts` | **25 passed, 0 failed, 0 skipped** |
| Read-only original-source / geometry / tile diagnostic | Passed: 1,515 hashes; 0 alpha pair mismatches; 0 inverse-footprint mismatches; 53 valid source features; 0-degree vertex delta; runtime/coverage bounds equal analysis grids |
| Raw before/after hashes | Original regional TIFF, corrected global TIFF and original GIS archive unchanged |
| Production scope | `git diff --name-only bd12f5508ed317b76d5119db39b56e4f4f059590 -- regions lib components team scripts public tests` returns no paths |
| Formatting | `git diff --check` and staged equivalent checked before commit |

The first Python run in the fresh worktree reported **37 run, 1 error, 1 skipped**: an existing test required an `output/` temporary directory, and the cached subset was absent. Creating ignored scratch space and copying the unchanged corrected 81,924-byte subset resolved both. No test/application fix was needed. PyProj emits its existing advisory about WKT-to-PROJ conversion; this is not a test failure. Final logs: [Python](diagnostics/gale-layer-audit/python-tests.txt), [TypeScript](diagnostics/gale-layer-audit/typescript-tests.txt).

Only this report and strictly necessary diagnostics are delivered. Existing sources, public tiles/GeoJSON, manifests, tests, bounds, camera and scientific metadata are unchanged. Final commit is the commit containing this report, message **`docs(gale): audit scientific layer footprints and rendering`**, branch `feat/gale-layer-visualization`; its SHA and push result are given in the delivery response. No merge or Phase 1 implementation is authorized by this report.

Proposed Phase 1, **pending audit review and approval**:

1. Correct global coverage wording, regional crop/overview wording and author attribution. Present source extent, shipped crop, valid coverage, posting and gradient support separately.
2. Add optional verified outlines and explicit terrain zoom-to-coverage controls. Preserve source coordinates, optical overview, camera defaults, Arc Pass geometry and its existing auto-focus.
3. Validate masks/edges across zoom, opacity, resized viewports and CTX/color switches. Retain numeric slope legends and registration caveats.
4. Investigate independent registration only with identified control provenance and defensible residual/error measurements. A transformation needs a separate reviewed scientific case; no visual-fit offsets.
5. Scope broader geology acquisition separately, prioritizing Meyer GIS and released western Aeolis Mons products. Verify release/license/CRS/coverage/symbology before integration. Never extrapolate Arc Pass.

**Stop at Phase 0. No production implementation has been made.**
