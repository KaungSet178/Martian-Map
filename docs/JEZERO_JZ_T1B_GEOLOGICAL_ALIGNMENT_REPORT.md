# Jezero JZ-T1B geological alignment report

Date: 2026-11-14, Asia/Rangoon. **Audit complete; independent absolute geological registration remains UNVERIFIED. No region is certified for selection.**

## Executive summary

The existing geological projection is numerically correct for its stated Mars sphere. On 14,506 sampled native vertices, independently calculated PROJ positions differ from the application's actual JavaScript function by at most 1.508e-09 m. One committed geology tile independently rasterizes identically: 62,434 interior pixels compared, zero mismatches (also zero over all 65,536 in-map tile pixels). These results establish a limited engineering transformation check, not source geographic accuracy.

All 1,308 original service polygons were checked: 1,306 valid, two ring self-intersections. Sixty-two valid features in nine unit-name groups intersect the actual map. Six groups lie outside. The original application's CTX source has valid, non-nodata pixels throughout the sampled supported window. All nine intersecting groups are PARTIALLY_VERIFIED for geometry/coordinate integrity, with alignment UNVERIFIED and no waypoint/selection approval.

Nine candidate relative-image ties compare separately published USGS CTX products. Five preassigned calibration windows give median displacement **-5.69 m east, 42.00 m north** (negative east means west). Four held-out windows give **5.02 m RMS** after that translation hypothesis. This is **image-to-image relative agreement**, not a measured geology-to-ground error or independent absolute control. No surveyed or independently landmark-validated ground-control point was obtained. No correction was applied.

Authoritative SIM 3464 metadata independently confirms the previous source warning: random offsets of about **100–200 m** versus the later operations CTX mosaic. That range is source-reported, not a confidence interval, fitted transform or new audit measurement. The geology's positional uncertainty is not reduced to 5 m by the image-comparison result.

## Git baseline, isolation and delivery

- Starting branch: `origin/feat/jezero-map`; fetched and independently checked remote SHA: `d9fbe2f2bf845ef76e69b61cfa0f874246630ca6`.
- Audit branch: `feat/jezero-geology-alignment-audit`.
- Worktree: `D:/martian-map/output/gale-g1/output/jezero-geology-alignment-audit`.
- JZ-T1 inspected directly at local commit `9670ada94b634ab6a35b660c7e675ee9dfad4ac3`: report, manifest and original native geometry JSON, including source hashes. JZ-T1A inspected at `b580e214ce54a6a043a9a55c8adcf3d1259c6a9b`: report, renderer predicate and mission/catalog changes. Neither branch was merged.
- `git worktree list --porcelain` and branch/status inspection identified concurrent uncommitted renderer work in main/Gale coverage and timeline-dashboard work. No other worktree was modified, reset, cleaned, stashed or overwritten.
- A sparse checkout excludes bulk public imagery and screenshots. Actual sample tiles were read from this baseline's Git objects, not substituted from another branch.
- Final commit, normal-push result and exact remote HEAD are reported in the delivery message. This committed report cannot embed its own commit hash; resolve with `git rev-parse HEAD`.

The audit baseline intentionally still contains the original target-marker defect; JZ-T1A is separate and was not merged. No target catalog, rendering, bounds, mission schema or geographic eligibility changed here.

## Phase 0: inventory, provenance and initial risks

| Dataset/asset | Authoritative evidence | CRS and spatial properties | Application lineage |
|---|---|---|---|
| Sun & Stack SIM 3464 (2020) | [Publication](https://doi.org/10.3133/sim3464), [GIS release](https://doi.org/10.5066/P9CZYIO7), [FGDC metadata](https://pubs.usgs.gov/sim/3464/sim3464_metadata.xml) | 1:75,000; units digitized on 6 m semi-controlled CTX; 76.8–77.8 E, 17.7–18.7 N | USGS-owned ArcGIS service layer 8; native polygon snapshot from JZ-T1 retained by hash; owner fetch rounds vertices to 0.001 m |
| USGS ArcGIS geology service | [Service](https://services.arcgis.com/v01gqwM5QqNysAAi/arcgis/rest/services/Jezero_FeatureServiceFromPro/FeatureServer/8), [item metadata](https://www.arcgis.com/sharing/rest/content/items/b602bd9a573d447eb07388e5fb9ca884?f=pjson) | MTM_clon77_5E; Transverse Mercator, central meridian 77.5 E, k0=1, latitude origin=0, false offsets=0, R=3,396,190 m sphere | USGS owner confirmed in item metadata. Service explicitly says viewing purposes only; official PDF/GIS release remains canonical. Full geodatabase was not re-downloaded or compared |
| Current application CTX | [Official ISIS label](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.lbl), [FGDC metadata](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.xml) | SOC_008, equirectangular, true-scale latitude 0, central longitude 0, R=3,396,190 m; 5,322 × 5,040, 6 m/px; nodata=0 | NASA Trek WMTS equirectangular tiles → nearest source-pixel sampling → self-hosted Web Mercator display PNGs `public/maps/jezero/ctx-lvs-tiles/` |
| Current geology display | `team/jezero/geology/build_geology.mjs`, owner reports and one actual committed tile | Native MTM → spherical longitude/latitude → Mercator tile-pixel math → scanline unit fill; zooms 5–14 | `public/maps/jezero/geology-tiles/`; actual feature boundaries have been rasterized. No production interactive GeoJSON polygon layer exists |
| Separate USGS CTX reference | [Authoritative ISIS label](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_landing_site_dtm/J03_045994_1986_XN_18N282W_6m_ORTHO.lbl) | J03_045994_1986_XN_18N282W_6m_ORTHO; 6.0603893249424 m/px, 6,974 × 17,448; planetocentric/east, equirectangular lon0=180, latTs=0; equatorial/polar radii 3,396,190 / 3,376,200 m; ISIS eqc radius at latTs=0 is equatorial radius | Independent publication/processing, not independent acquisition or surveyed absolute control. TIFF has no embedded georeference; label supplies it |
| Independent HiRISE RDR | [PDS label](https://hirise-pds.lpl.arizona.edu/PDS/RDR/ESP/ORB_045900_045999/ESP_045994_1985/ESP_045994_1985_RED.LBL) | ESP_045994_1985_RED, version 1.0, MRO-M-HIRISE-3-RDR-V1.1; 27,505 × 58,222, 0.25 m/px, planetocentric/east; local sphere R=3,394,839.8133163 m; latTs=15, lon0=180 | Header and annotated browse retrieved. Embedded GeoJP2 WKT conflicts with PDS projection semantics; browse is not used for control |
| Existing terrain/slope | Current Jezero config and `team/jezero/terrain/audit_report.json` | HiRISE-derived TRN DTM product `JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40`, DOI 10.5066/P9REJ9JN; owner-audited 1 m equirectangular Mars sphere | Terrain derivatives are not the current base imagery. Raw DTM was not independently reread in JZ-T1B; no terrain alignment/route-safety certification follows |

Initial risks: semi-controlled geology versus controlled operational imagery; unknown per-boundary mapping error; two invalid features; service/GDB feature-ID differences and viewing-only service status; source-specific Mars projection radii; possible pixel-origin/resampling differences; incomplete independence of reference imagery. These remain reasons to withhold target certification.

Authoritative geology and application-imagery metadata were established, so the Phase-0 stop condition was not triggered. Missing reference-TIFF metadata was resolved by its actual ISIS label, not guessed. The HiRISE metadata conflict caused that reference to be excluded from control use.

## Current geography and coordinate chain

Supported map extent from `regions/jezero/config.ts`: **77.186786–77.493133 E, 18.401964–18.519663 N**. This is the application-supported viewport; it is not the historical research footprint. Region coordinates are Mars planetocentric latitude, north positive; east longitude 0–360. The CTX source label uses a 180 longitude domain; all relevant longitudes are positive and less than 180, so normalization is an identity in this area.

The CTX source envelope from its label is 77.16046545922367–77.69917761355299 E, 18.21102739096340–18.72119448187280 N. Exact native affine corner mapping is:

```text
x = 4573663.25085300021 + 6 * column
 y = 1109693.14018799993 - 6 * row
pixel center uses column+0.5, row+0.5
lon = x / (3396190 * pi/180)
lat = y / (3396190 * pi/180)
```

The separate reference uses `x0=-6100375.77370840032`, `y0=1145171.16684109997`, pixel size 6.0603893249423999 m; `lon=180+x/(3396190*pi/180)`, `lat=y/(3396190*pi/180)`. Polar radius in its label does not authorize converting its explicitly planetocentric latitude to ellipsoidal geodetic latitude. Axis order is always longitude/easting first in calculations. No Earth datum conversion is used.

The application's display-scale radius 3,389,500 m differs from the scientific source sphere. It is not substituted into native projections or scientific distance measurements here. The exact native CRS remains separately documented even though the application has a `pending-source-validation` generic projected-CRS string.

## Phase 1: transformation and discrepancy measurements

| Check | Original/expected | Calculated result | Finding |
|---|---|---|---|
| Application geology inverse vs independent PROJ | Same stated spherical TM | Max 1.508e-09 m across 14,506 sampled vertices | Numerically corroborated; not a positional accuracy estimate |
| Native → geographic → native | Recover original sampled coordinate pairs | Max 3.261e-09 m | Numerical roundtrip passed |
| Actual geology tile 13/5857/3668 | Source-mapped unit IDs at independently projected pixel centers | Zero mismatches; 62,434 unit-interior pixels / 65,536 full tile pixels checked | One-tile engineering corroboration only |
| Actual CTX tile vs native source sampled to same pixel centers | Nominally same product/grid | Correlation peak 0.9939 at offset +1 column, +1 row | Approx. one display pixel each axis; not silently corrected. WMTS/native resampling, pixel convention or service placement may contribute; cause unresolved by one tile |
| Trek sampling description | Script/report calls source/output grid 1:1 | Longitude increment matches; Mercator latitude increment varies with cos(latitude) | Documentation is incomplete: at 18.46 N, output north-south angular sampling is about 0.949 of source level spacing; repeated/interpolated source rows are expected, not an absolute registration proof |
| Geology paint-order description | Comment says polygon area descending | Actual code sorts native bounding-box area | Documentation discrepancy; no production code changed |
| HiRISE GeoJP2 WKT vs PDS label | Corner near 77.382125 E, 18.550007 N | Embedded WKT interpreted literally gives 80.878745 E, 33.550006 N; PDS reconstruction gives 77.382125 E, 18.550006 N | Approximately 908 km discrepancy from treating 15 degrees as latitude origin instead of true-scale parallel; a header-semantics conflict, not observed physical image motion |

The HiRISE header was read from bytes 0–262143 of a 776,829,687-byte JP2 (HTTP 206), not a full-image download. Its embedded affine is 0.25 m pixels, upper-left (-5,873,046.625, 1,099,108.875). Both competing WKT interpretations, all compared points and original PDS label are retained. PDS-reconstructed envelope and label extrema differ slightly at pixel-edge scale; no exact equality or subpixel registration is asserted. The annotated browse is 2,048 × 4,531, whose aspect ratio differs from native 27,505 × 58,222; assigning it the native affine would invent a georeference. It is shown standalone only.

Numerical tolerance 1e-5 m in software tests checks double-precision projection consistency. It is **not** an arbitrary scientific acceptance threshold. No accuracy threshold was invented from nominal map scale. The 1:75,000 map scale and 6 m source imagery cannot establish per-boundary accuracy without independent control.

## Phase 2: imagery-registration method and control inventory

Independent absolute ground-control inventory: **zero accepted points**. Crater rims, etched terrain, scarp/delta margins and bedform fields are visible in the diagnostic imagery, but none was assigned an independently surveyed or landmark-validated coordinate. No geological contact was converted to a fabricated control point. No reference-image tie was promoted to a navigation point.

The separate CTX comparison is reproducible and informative about relative registration: resample reference imagery onto the application native 6 m grid using its authoritative label; use 64×64 pixel (384 m projected) texture windows and normalized cross correlation in a ±80-pixel search (480 m projected radius). Nine fixed window centers span the map. Checkerboard assignment of five calibration and four validation windows precedes matching. No validation tie is used to fit the translation or affine hypothesis. Peaks are integer-pixel candidates; no arbitrary correlation-score cutoff is used to declare geographic truth.

| Diagnostic tie | Role | Original center lon E, planetocentric lat | Candidate east, north displacement (m) | NCC peak |
|---|---|---|---|---|
| window-0-0 | calibration | 77.248074510, 18.490252772 | 0.00, 36.00 | 0.9875 |
| window-0-1 | validation | 77.340086789, 18.490252772 | -5.69, 42.00 | 0.9898 |
| window-0-2 | calibration | 77.431997844, 18.490252772 | -11.38, 48.00 | 0.9977 |
| window-1-0 | validation | 77.248074510, 18.460796696 | 0.00, 42.00 | 0.9900 |
| window-1-1 | calibration | 77.340086789, 18.460796696 | -5.69, 42.00 | 0.9678 |
| window-1-2 | validation | 77.431997844, 18.460796696 | -11.38, 48.00 | 0.9931 |
| window-2-0 | calibration | 77.248074510, 18.431340620 | 0.00, 42.00 | 0.9929 |
| window-2-1 | validation | 77.340086789, 18.431340620 | -5.69, 42.00 | 0.9661 |
| window-2-2 | calibration | 77.431997844, 18.431340620 | -11.38, 48.00 | 0.9901 |

The separate CTX image and SOC_008 share acquisition lineage. The comparison therefore does not independently establish absolute location and does not measure SIM 3464's boundary offsets. The source's 100–200 m warning refers specifically to a later operations mosaic (metadata cites DOI 10.5066/P9GV1ND3); no equivalence of that mosaic with every TRN product version is assumed.

Translation hypothesis: median calibration displacement (-5.69, +42.00) m east/north; held-out RMSE 5.02 m. Candidate shifts vary west-to-east (roughly 0 to -11.4 m east, 36–48 m north), so a uniform translation is not an exhaustive model.

A diagnostic affine displacement model, fit only to five calibration ties, has singular scales 0.9994721 and 0.9985683, polar rotation 0.02494 degrees and four-window holdout RMSE 2.14 m. Parameters and local-frame origin are retained in measurements JSON. These small-sample, integer-match results are descriptive hypotheses; subpixel RMS does not imply subpixel geographic accuracy. Their physical cause, higher-order local distortions and landmark correctness are unverified. Neither model was applied to polygons or imagery.

**Independent registration certification gate: NOT SATISFIED.** Passing computational tests and lower model residuals do not change this result.

## Phase 3: coverage, geometry and confidence

Original source features 669 and 1159, both Upper etched unit, have ring self-intersections. They remain in original input evidence and are excluded without `make_valid`, buffering or other repair. Feature 1159 has a broad native envelope extending across this region; excluding it means this audit cannot certify topology/completeness of the entire production layer. An invalid envelope is not substituted for its scientific boundary.

The valid polygon inventory below preserves original unit names, including the source typo `Crater riim unit`. A group is PARTIALLY_VERIFIED when native geometry and coordinate calculations are corroborated but independent geographic alignment is not. OUT_OF_COVERAGE refers to the supported map, not a claim that the unit is absent from Jezero. Invalid features carry feature-level INVALID status regardless of other valid features in their group.

| Source unit-name group | Valid intersecting polygons | Classification | Independent alignment | Positional uncertainty (m) | Selectable |
|---|---:|---|---|---|---|
| Crater ejecta unit | 0 | OUT_OF_COVERAGE | Not evaluated | Unknown | No |
| Crater interior unit | 0 | OUT_OF_COVERAGE | Not evaluated | Unknown | No |
| Crater riim unit | 0 | OUT_OF_COVERAGE | Not evaluated | Unknown | No |
| Crater rim unit | 4 | PARTIALLY_VERIFIED | UNVERIFIED | Unknown | No |
| Eolian bedform unit | 16 | PARTIALLY_VERIFIED | UNVERIFIED | Unknown | No |
| Jezero fan 1 unit | 0 | OUT_OF_COVERAGE | Not evaluated | Unknown | No |
| Jezero fan 2 unit | 13 | PARTIALLY_VERIFIED | UNVERIFIED | Unknown | No |
| Jezero floor unit | 1 | PARTIALLY_VERIFIED | UNVERIFIED | Unknown | No |
| Lower etched unit | 2 | PARTIALLY_VERIFIED | UNVERIFIED | Unknown | No |
| Nili Planum 1 unit | 8 | PARTIALLY_VERIFIED | UNVERIFIED | Unknown | No |
| Nili Planum 2 unit | 0 | OUT_OF_COVERAGE | Not evaluated | Unknown | No |
| Nili Planum fan unit | 0 | OUT_OF_COVERAGE | Not evaluated | Unknown | No |
| Rugged bright unit | 3 | PARTIALLY_VERIFIED | UNVERIFIED | Unknown | No |
| Smooth unit, undivided | 7 | PARTIALLY_VERIFIED | UNVERIFIED | Unknown | No |
| Upper etched unit | 8 | PARTIALLY_VERIFIED | UNVERIFIED | Unknown | No |

All sampled current-CTX pixels in the supported native window are non-nodata (source TIFF explicitly declares nodata 0), so within this map the retained valid boundaries have source imagery support. This result is at 6 m raster sampling; it is not survey coverage, photogrammetric accuracy, hazard evidence or proof of a correct geological interpretation. Many complete source features extend outside the viewport and retained GeoJSON preserves their full original boundary rather than clipping or enlarging them. Coverage outside the downloaded window was not certified. The separate reference CTX has a visible western image-edge wedge; it is not assumed to cover the entire current footprint merely from its rectangular envelope.

## Phase 4: diagnostic artifacts

All diagnostic figures are static scientific plots generated from actual retrieved pixels or original source geometry. Red extent boxes are application-configuration annotations; cyan unit lines are original mapped boundaries. Orange/cyan vectors are candidate image-match measurements with separate calibration/validation roles. None are production targets.

- [Original polygons on actual application source imagery and coverage](diagnostics/jz-t1b/application-geology-coverage.png) — 2,880 × 2,880 PNG.
- [Original boundaries on separate reference imagery](diagnostics/jz-t1b/reference-geology-overlay.png) — 2,880 × 1,440 PNG.
- [Relative-image pairs and discrepancy vectors](diagnostics/jz-t1b/relative-image-registration.png) — 2,880 × 1,800 PNG.
- [Independent HiRISE browse, explicitly ungeoreferenced](diagnostics/jz-t1b/independent-hirise-browse.png) — standalone diagnostic, not a registration overlay.
- `original-intersecting-polygons.geojson.gz`: 62 complete valid features, independently reprojected; source IDs/names preserved, no boundary replacement.
- `coverage.geojson`: supported extent and source valid-pixel footprint within the downloaded window.
- `candidate-image-ties.geojson`, `candidate-image-vectors.geojson`: diagnostic image matches; not ground-control/target catalogs.
- `measurements.json`, `tile-validation.json`, `ctx-tile-validation.json`, `versions.json`, source-retrieval manifests, native source snapshot hash and application transform samples.

The large raw rasters are deliberately uncommitted. Downloaded byte ranges and their hashes are recorded separately from full-source hashes. The reconstructed TIFF containers are partial: **only their recorded downloaded rows may be read**. Unretrieved rows are not scientific zeros. Original TIFF/JP2 inputs were never rewritten.

## Validation and limitations

Executed:

| Command | Result |
|---|---|
| `python -u docs/diagnostics/jz-t1b/audit.py` | Completed: 1,308 validity checks, independent PROJ comparison, coverage, actual imagery plots and relative-image candidate ties |
| `python -u docs/diagnostics/jz-t1b/validate_tile.py` | Passed one committed geology-tile categorical comparison |
| `python -u docs/diagnostics/jz-t1b/validate_ctx_tile.py` | Completed; +1/+1 pixel residual retained as a discrepancy, not waived |
| `python docs/diagnostics/jz-t1b/enrich_registration.py` | Completed diagnostic calibration/held-out model checks; no correction applied |
| `python -B docs/diagnostics/jz-t1b/test_audit.py` | **9 passed, 0 failed**; includes fail-closed independent-registration gate |
| `npx.cmd tsx --test tests/regions.test.ts tests/mission.test.ts` | **13 passed, 0 failed** |
| `git diff --check` | Required before commit; final result recorded in delivery checks |

Published metadata is retained byte-for-byte, including original whitespace. A diagnostics-local .gitattributes disables EOL conversion for hashed evidence and textual diff checking for verbatim XML/ISIS/HTML fixtures. The initial staged whitespace check flagged original source whitespace; fixture attributes preserve it rather than modifying scientific evidence.

No production frontend changes were made, so no new browser or build claim is made. Shapely emits a deprecation notice for ops.transform; the executed function remains supported. The first TIFF-header parser attempt needed an inline SHORT-value slice fix before retrieval; no data from that failed attempt were treated as evidence. Bulk image download and a fresh GIS-library install were stopped as unnecessary; existing libraries were read without modification. The live geology metadata request failed with RemoteDisconnected; its already-inspected JZ-T1 layer snapshot and independently retrieved USGS-owned item/FGDC metadata provide the retained provenance. Reference XML/world/prj/aux guesses returned 404 and are not treated as authoritative metadata; the actual successful ISIS label is the basis for calculation.

No boundary-specific positional standard deviations are available; record null rather than inventing confidence scores. ArcGIS service polygons were not byte-compared to the official geodatabase. One validated tile is not a full tile-pyramid certification. No independent absolute controls, no individually validated geological contacts, no approved rigid/affine transform and no region-selection approval have been established. Metadata source warnings and current display-level residuals remain material.

## Reproduction

Use Python 3.13; versions are recorded in `versions.json`. Existing read-only GIS libraries were found at `D:/martian-map/output/g3-geology/python-libs`; for a portable setup install `requirements.txt` into ignored `.audit-python`. Retrieval scripts require requests. Run from the isolated worktree root:

```powershell
python -m pip install --target .audit-python -r docs/diagnostics/jz-t1b/requirements.txt
$env:PYTHONPATH=(Resolve-Path '.audit-python').Path
python docs/diagnostics/jz-t1b/prepare_native.py
python docs/diagnostics/jz-t1b/retrieve.py
python docs/diagnostics/jz-t1b/retrieve_ranges.py
python docs/diagnostics/jz-t1b/retrieve_sidecars.py
python docs/diagnostics/jz-t1b/retrieve_window.py
python docs/diagnostics/jz-t1b/retrieve_reference_window.py
python docs/diagnostics/jz-t1b/extract_application.py
python docs/diagnostics/jz-t1b/audit.py
python docs/diagnostics/jz-t1b/validate_tile.py
python docs/diagnostics/jz-t1b/validate_ctx_tile.py
python docs/diagnostics/jz-t1b/enrich_registration.py
python docs/diagnostics/jz-t1b/plot_reference.py
python -B docs/diagnostics/jz-t1b/test_audit.py
npx.cmd tsx --test tests/regions.test.ts tests/mission.test.ts
```

`prepare_native.py` reuses the original JZ-T1 source snapshot locally or retrieves the official service query into ignored cache, then requires its exact recorded SHA-256; a changed service response must be investigated rather than silently accepted. `extract_application.py` uses committed baseline source functions and tiles. All geospatial outputs state Mars conventions explicitly; GeoJSON coordinates must not be assumed to be terrestrial EPSG:4326. HTTP responses, metadata snapshots, input hashes, byte ranges, pixel anchors and model coefficients are retained for review.

## Recommended next milestone

Review the HiRISE embedded-WKT/PDS conflict and the one-pixel CTX display discrepancy; obtain a fully documented controlled reference raster and genuinely independent named landmark/control coordinates. Review the canonical geodatabase against the viewing service, and resolve invalid features only with source-authorized geometry evidence. Perform boundary-specific landmark validation and quantified uncertainty assessment before proposing any production correction or certification. Preserve the current bounds and unverified state. **Do not begin JZ-T2 or enable geological targets on the basis of these relative-image residuals.**
