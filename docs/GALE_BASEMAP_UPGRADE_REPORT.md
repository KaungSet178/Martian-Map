# Gale G5 — audited USGS basemap preparation

Reviewed 13 November 2026. **Preparation result; the basemap upgrade is not
enabled.** CTX remains the only application basemap. Exact USGS color raster
validity is measured, a bounded native grayscale extraction is demonstrated,
and projection checks pass. Grayscale overview validity and distributed local
registration remain unverified. No arbitrary offsets, image warps, generated
imagery, obstacle classification or operational terrain sampling were added.

## 1. Delivery and isolation

Branch: `feat/gale-basemap-upgrade`. Isolated worktree:
`D:\martian-map\output\gale-g1`. It was clean at detached `6cec9a6` before work.
After `git fetch origin`, the latest available integrated M3 baseline was
`d6e47fa6f2d73c8e5edbc11c24805fc1281ead7b` on
`origin/feat/interactive-waypoints`, descended from the requested `34316b9`.
The new branch was created here from that baseline. Neither active worktree
(`D:\martian-map`, `D:\martian-map-antigravity`) was edited or switched.

The implementation adds only standalone scripts, source receipts, scientific
tests and this report. `MapWorkspace`, `Planner`, application configuration,
camera, original assets, DEM, geology, science positions, M1–M3 and other regions
have **zero changes from the M3 baseline**. No protected branch was merged or
force-pushed. The final delivery commit is the commit containing this report;
resolve its exact ID with `git log -1 --format=%H -- docs/GALE_BASEMAP_UPGRADE_REPORT.md`.
The delivery response records the exact commit and push result.

## 2. Source evidence and redistribution

- [USGS official merged orthophoto catalogue](https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_orthophoto_mosaic_25cm).
  A retrieved page is pinned at
  [usgs-catalogue.html](../team/gale/sources/g5/usgs-catalogue.html).
- [Grayscale GeoTIFF v3](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/MSL_Gale_Orthophoto_Mosaic_25cm_v3.tif).
- [HiRISE 78-quad processed LRGB COG](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif).
- [Preserved NASA Trek CTX WMTS](https://trek.nasa.gov/tiles/Mars/EQ/Gale_CTX_BlockAdj_dd/1.0.0/WMTSCapabilities.xml).

The catalogue credits Fred J. Calef III and Timothy Parker for the grayscale
product. Its requested citation is Calef III, F. J., & Parker, T. (2016),
*MSL Gale Merged Orthophoto Mosaic*, PDS Annex, U.S. Geological Survey. For color,
the catalogue explicitly gives Timothy Parker then Fred J. Calef III as author
order. Keep these credits alongside USGS Astrogeology / NASA / JPL-Caltech /
UArizona, and the HRSC/ESA lineage where applicable. Its access constraint asks
for author credit and its use constraint is listed as none. No additional
product-specific derivative restriction was found on that page; it is not a
blanket license for agency branding, third-party material or endorsement.
This delivery redistributes no USGS image tiles or full source raster.

Published grayscale lineage is HRSC controlled to MOLA, manual CTX-to-HRSC ties,
then HiRISE-to-CTX or already registered HiRISE. HiRISE gaps are filled with CTX
and HRSC. The catalogue's approximate 100 m horizontal base-control statement
is contextual, not a per-pixel accuracy model or a validated error bound here.

Color is real HiRISE RGB-strip content, manually tied, blended and fused to the
mission RED orthophoto mosaic using Photoshop. The July 2025 description records
GIMP unsharp masking and JPEG quality 85 COG conversion. JPEG is lossy even
though the catalogue describes it as near lossless. It is not raw human-eye
true color. Constituent RGB support and local color-processing footprints were
not supplied or reconstructed.

## 3. Actual file metadata and access

The machine-readable [audit.json](../team/gale/sources/g5/audit.json) contains the
full declared WKT, affine transforms, TIFF directories, object identities and
SHA-256 receipts for every accessed range. Both hosts returned exact HTTP 206
Content-Range responses. The implementation rejects full-body responses before
reading them and enforces a shared 64 MiB raster-read budget.

| Property | USGS grayscale | USGS color |
| --- | --- | --- |
| Actual object length | **50,404,480,837 bytes** | 1,030,625,379 bytes |
| Dimensions | 180,000 × 280,000 | 36,000 × 76,000 |
| Bands / type | 1 / uint8 | 3 / uint8 |
| Pixel grid | 0.25 m | 0.25 m |
| Upper-left edge E/N | 8,126,248 / −241,164 m | 8,140,000 / −270,000 m |
| Blocks | Uncompressed, 1 × 180,000 strips | 512 × 512 tiles, YCbCr JPEG |
| Overviews | None | Factors 2, 4, 8, 16, 32, 64, 128, approximately 257 |
| NoData / mask | DN 0; no independent mask | No numeric NoData; internal 1-bit mask |
| Pixel interpretation | Area | Area |
| Object last modified | 2022-12-01 23:24:04 UTC | 2025-07-25 16:58:53 UTC |

The grayscale length differs materially from the approximately 23 GB estimate
in the task/catalogue. Its 50.4 billion uncompressed DN pixels explain the actual
size. Neither full raster was downloaded. Multipart ETags identify objects but
are **not** full-file MD5 checksums. No published full-file cryptographic checksum
was established. Range SHA-256 values pin only the bytes actually read; they do
not certify the remainder. The color S3 version ID is recorded; grayscale returns
the literal null version ID.

The audit reads TIFF directories using explicit bounded requests, then GDAL
parses GeoKeys from the assembled header in memory. It does not use
`rasterio.open(file_object)` on a remote stream or load full source image data.

## 4. Exact existing extent and measured coverage

The script reads the current configuration directly; bounds are unchanged:

| West E | East E | South | North |
| --- | --- | --- | --- |
| 137.3442352329006° | 137.4579431096443° | −4.822361175063087° | −4.580605407446296° |

The projected overview is 6,740 × 14,330 m, or 96,584,200 m². These are
equirectangular projected dimensions, not latitude-corrected ground distances.

| Product | Valid coverage of existing overview | Meaning |
| --- | --- | --- |
| USGS color | **100% within floating-point tolerance** | Every intersecting native internal-mask block measured; projected-area overlap |
| Existing CTX | **100% within floating-point tolerance** | Every committed z13 display alpha pixel measured; exact spherical angular-area intersection |
| USGS grayscale | **Unmeasured** | No separate mask or overview; rectangular overlap is not accepted as native validity |

Color coverage uses **5,989** intersecting full-resolution mask tiles, only
**311,428 compressed mask bytes**. No coarse overview or rectangular footprint
substitutes for these native mask pixels. All fractional AOI edge overlaps are
weighted. Mask validity is not a guarantee of real RGB-strip contribution,
absence of mosaic seams, or accurate geographic registration. The floating-point
results are 99.99999999999962% color and 100.00000000000003% CTX; report these as
100%, not an impossible excess or a scientifically meaningful subpixel gap.

No mask-defined color gaps were found inside the overview. CTX remains necessary
for missing alternative tiles, loading failures and any future clipped release
footprint. Outside the existing extent, coverage was not assessed. No extra
geographic coverage is gained in the current app. Global grayscale resolution
improvement and RGB-strip coverage percentages are not claimed.

## 5. Source-specific coordinates

Both actual TIFF GeoKeys declare spherical equirectangular projection with
radius **3,396,190 m**, standard parallel 0°, latitude of origin 0°, central
meridian 0°, false easting/northing 0 m and prime meridian 0°. Catalogue latitude
is planetocentric, longitude positive east, with published domain −180..180°.
Marswalk uses east longitude 0..360°; at 137° E this conversion is identity.
On the declared sphere, geodetic and planetocentric latitude coincide. No oblate
latitude conversion or guessed EPSG/ESRI/IAU authority substitution is used.

For these independently inspected sources only, `E = R × lon_rad` and
`N = R × lat_rad`. Source affine origins remain distinct. Raster rows run south:
`E = left + (column + 0.5) × 0.25`,
`N = top − (row + 0.5) × 0.25` for pixel centers.
PROJ 9.8.1 reproduces the analytical projected coordinates at three distributed
Gale points with a recorded maximum residual of 0 m at stored precision. This
is a computational consistency check, not zero ground error. Unit tests cover
pixel-center inversion, wrong planets/ellipsoids and unsupported projection
parameters. No scientific calculation uses an Earth geodetic CRS.

## 6. Efficient grayscale subset demonstration

The verified layout permits direct reads of selected columns in each native
uncompressed row. The audit demonstrates window `(72000,154000,128,128)` using
**16,384 native DN bytes**, 128 row requests, retaining original values, NoData,
source WKT and translated source affine. The upper-left edge is approximately
137.3983898745° E, −4.7181008370°, inside the existing overview. All 16,384 subset
pixels are non-NoData. This 32 × 32 m research subset is not an overview coverage
sample or a registration control.

The result is ignored `output/gale-basemap/grayscale-native-window.tif`, SHA-256
`707d4815759271820868ca9098a929ac9e082733bfcfa76a078d8ba33c429ffc` in the tested
software environment. No scientific image values are stretched or sharpened.

Full native overview coverage would require about 57,320 subrow requests and
1.55 GB of DN values, or substantially greater traffic if full-width strips
are fetched by GDAL. This is not scheduled implicitly. Next options are an
explicitly budgeted offline extraction, a provider-generated tiled grayscale
subset/COG, or another documented orthophoto product with its own audit. Broad
stride samples or reduced browse JPEGs cannot replace the native mask audit.

## 7. Registration decision

The existing [registration investigation](../team/gale/REGISTRATION_INVESTIGATION.md)
was read before preparation. Its unstable correlation hypotheses are not used
as translations or evidence of a unique georeferencing error.

| Comparison | Established | Still missing |
| --- | --- | --- |
| Grayscale versus published control | Declared CRS, grid, HRSC/MOLA control lineage | Distributed independent feature controls and local uncertainty |
| Color versus grayscale | Published manual ties/fusion ancestry; both actual source CRSs inspected | Independently checked feature correspondences, matched support and held-out points |
| Grayscale versus Trek CTX | Source coordinate formulas and preserved CTX angular matrix | Exact shared control lineage and robust local correspondence evidence |
| Imagery versus vectors/DEM | Existing coordinates, asset bytes and operational gates preserved | Independent absolute registration; rover poses are not photographed-feature controls |

No image-correlation fit, correction, warp or survey accuracy claim is produced.
The native subset demonstrates access, not registration. No distributed landmark
validation was completed; lineage is not a substitute. Because the task requires
scientifically justified integration, USGS display layers and selector remain
deferred. Terrain sampling, safety certification and hazard classification remain
disabled. Orbital imagery supports visual inspection but cannot replace terrain
models, ground observations or validated traverse analysis.

## 8. Tiles, UI and performance

**Zero USGS application tiles generated; zero added application image bytes.**
No USGS zoom pyramid or runtime source exists. Existing CTX z5–13, layer opacity,
overlay stacking, initial camera and map navigation remain intact. Expected
additional browser memory and request impact is zero because no G5 code is
imported by the application; no browser performance improvement was measured.

The reproducible audit reads/replays **5,068,357 raster bytes** in total, including
both headers/directories, all intersecting color masks and the native grayscale
subset. Re-running with cached inputs requires no network. Source raster traffic
is not the same as committed Git size or decoded browser memory.

[Preparation README](../scripts/gale-basemap/README.md) documents a future tile
procedure: inverse-map existing XYZ pixel centers, evaluate each actual source
projection, account for source pixel centers once, area-resample genuine valid
image support, preserve alpha and provenance, and independently verify output.
That recipe is not presented as a tested tile generator. Mixed HRSC/CTX/HiRISE
quality means 25 cm grid spacing cannot be advertised as uniform 25 cm detail.
Source contribution/seam footprints still require investigation.

There is no selector in this delivery and no brightness/contrast processing.
The eventual selector must preserve camera, opacity, overlay visibility and M3
waypoint geometry, allow only one alternative above CTX fallback, and state when
fallback is visible. Required color wording:

> Processed color mosaic from real HiRISE observations. Color balance and
> sharpening applied by source authors; not a guaranteed human-eye true-color
> representation.

## 9. Validation and M3 compatibility

The complete existing browser suite ran against this worktree's production
server at `http://127.0.0.1:3105`, avoiding both active development servers.

| Check | Result |
| --- | --- |
| Exact native color mask audit | Passed; all 5,989 intersecting mask blocks |
| Analytical versus actual GeoKeys/PROJ | Passed for both sources |
| Cache-only replay | Passed; same coverage, native subset hash and byte total |
| Node mission, geodesy and waypoint suites | **151 passed**, 18 suites |
| Scientific Python checks | **19 passed**, including nine G5 tests |
| ESLint | Passed |
| TypeScript / Next type generation | Passed |
| Production build | Passed |
| Complete Playwright Chromium suite | **43 passed, 4 failed**, 47 total, 4.8 minutes |
| G5 selector, fallback and alternative-mode coordinate tests | Not applicable: no alternatives integrated |
| G5 tile resampling, seams and visual detail validation | Deferred: no pyramid generated |

The four browser failures are the M3 placement test at **1440, 1024, 768 and
390 px**, all at `interactive-waypoints.spec.ts:80`: after the second placement,
the test expects two markers and receives three. The production bundle and
browser tests are unchanged from `d6e47fa`, so this run exposes baseline M3
behavior rather than a G5 runtime change. The exact cause is not diagnosed here;
do not weaken the assertion or silently patch the concurrent waypoint work.
The remainder covers scientific views, opacity, navigation, touch/pinch,
regional isolation, persistence, offline behavior and waypoint forms.

Failure screenshots, traces and error context remain under ignored
`test-results/interactive-waypoints-*/`; the full local HTML report is
`playwright-report/index.html`. Existing screenshot outputs are also ignored.
No thresholds or existing tests were changed.

Commands (PowerShell; `npm.cmd` avoids local script execution-policy restrictions):

```powershell
python -B scripts/gale-basemap/audit.py --download --gray-window 72000 154000 128 128
python -B scripts/gale-basemap/audit.py --gray-window 72000 154000 128 128
python -B -m unittest discover -s tests -p test_gale_*.py -v
npx.cmd tsx --test tests/*.test.ts
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
# In another terminal:
npm.cmd run start -- --port 3105
# Against that isolated server:
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3105'
npm.cmd run test:e2e
```

The environment required sandbox escalation to fetch shared Git metadata, use
network access and update pre-existing generated build/cache files. No automatic
approval rejection occurred. Generated inputs and caches remain outside Git.

## 10. Screenshots and remaining work

No CTX-versus-USGS before/after screenshots are supplied because neither USGS
mode is integrated or registration-validated. A tiny research crop is not a
camera-matched map comparison. The existing CTX and M3 browser screenshots do
not demonstrate a G5 visual upgrade. Producing unrelated or unregistered images
as a completed comparison would misrepresent this result.

Release blockers are explicit: full grayscale valid coverage, distributed
registration with held-out evidence, source-contribution quality footprints,
validated static tile preparation and independent tile tests. M3's four baseline
browser failures also require resolution before a selector can claim waypoint
compatibility. Fetch and inspect the then-current M3 branch again before UI work.
The scientifically justified G5 delivery at this point is this bounded,
reproducible preparation and evidence package; a sharper/color application map
remains unfinished.
