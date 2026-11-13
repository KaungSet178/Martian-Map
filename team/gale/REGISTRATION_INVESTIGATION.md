# Gale DEM–CTX registration investigation

Reviewed 13 November 2026. Baseline `8e0bc77`, including the three preserved M1
commits above G3.2 `d2d6c05`. Work is confined to `feat/gale-map`.

**Finding: no evidence-supported coordinate correction is available.** PDS grid
conversions and Marswalk's CTX tile generation are consistent with their declared
metadata. The precise local image tie remains unverified. Missing provenance for
the exact Trek mosaic, differing image products/photometry, and limitations of
the previous correlation method prevent assigning a unique source of the apparent
discrepancy. No source geometry, display transform, raster, marker or region was
moved. Operational terrain sampling and route safety remain disabled.

The [measurements](sources/registration/measurements.json) and
[pinned inputs](sources/registration/inputs.json) are reproducible with
[investigate_registration.py](investigate_registration.py). This is a scientific
investigation, not a registration adjustment or a terrain-routing implementation.

## 1. Sources and lineage

| Source | Verified evidence and limitation |
| --- | --- |
| [PDS PLACES orthophoto v42.0](https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_maps/msl_orbital_map.xml) | Explicit planetocentric/east convention; spherical equirectangular projection; 0.25 m posts; original ODL/VICAR headers independently parsed by GDAL |
| [PDS PLACES DEM v42.0](https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_maps/msl_orbital_dem.xml) | Same reference sphere/projection; 1 m native posts; fractional origin; source DEM values and G3.2 derivatives preserved |
| [PLACES SIS](https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/document/PLACES_PDS_SIS.pdf), §§3.9, 4.5 | Defines mission projected northing/easting, areoid elevations, and DEM/orthophoto registration context; current labels control actual array layout |
| [PDS localized/interpolated rover table label](https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_localizations/localized_interp.csv.xml) | Publishes projected, planetocentric, planetodetic and image-pixel coordinates; bookkeeping cross-check, not independent ground truth |
| [Exact Trek CTX WMTS](https://trek.nasa.gov/tiles/Mars/EQ/Gale_CTX_BlockAdj_dd/1.0.0/WMTSCapabilities.xml) and [API documentation](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars) | Angular tile matrix, upper-left −180°/90°, 256 px, matrix width twice height; source matrix z−1 for app XYZ z |
| [Trek exact-layer abstract](https://trek.nasa.gov/mars/TrekWS/rest/cat/abstract?label=Gale_CTX_BlockAdj_dd) | Generic CTX instrument description; no constituent image IDs, acquisition dates, native control network or residuals |
| [Trek exact-layer FGDC endpoint](https://trek.nasa.gov/mars/TrekWS/rest/cat/metadata/fgdc/html?label=Gale_CTX_BlockAdj_dd) | HTTP 200 with **empty body** during this investigation; does not establish native georeferencing/control lineage |
| [USGS merged mission orthophoto catalogue](https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_orthophoto_mosaic_25cm) | Describes an HRSC/MOLA → CTX → HiRISE control chain and mixed fill; contextual evidence of differing products/control, **not proof that Trek serves that exact mosaic** |
| [NASA NTRS 20130011617](https://ntrs.nasa.gov/citations/20130011617) | Published Bradbury Landing coordinate and distinction between relative image localization and absolute map-tie uncertainty |
| [NASA NAIF coordinate conventions](https://naif.jpl.nasa.gov/pub/naif/self_training/individual_docs/05_concepts.pdf) | Planetocentric and planetographic/planetodetic definitions; longitude direction must follow each product's explicit convention |

Small source metadata snapshots, exact URL/byte hashes, and unavailable-metadata
receipts are in [sources/registration](sources/registration/). Live PDS labels
match the G1/G3.2 snapshots. Two representative live CTX tiles match the pinned
G1 input bytes. That verifies sampled endpoint continuity, not every historical
source tile or its absolute control.

The USGS catalogue reports approximate base-control accuracy. It is not a
per-pixel uncertainty model and is not propagated as an accuracy guarantee for
our PDS subset or the unidentified native Trek mosaic. Identical CRS names do
not establish identical control networks, map versions or source imagery.

## 2. Coordinate and grid checks

Both PDS products explicitly declare a sphere with all axes **3,396,190 m**,
planetocentric latitude, east-positive longitude, equirectangular standard parallel
and central meridian zero. Conversion is `E=R·longitude_rad`, `N=R·latitude_rad`.
Array rows run southward. Global PDS northing/easting terminology is distinguished
from raster x=easting / y=northing.

| Product | Upper-left easting / northing (m) | Native projected post |
| --- | --- | --- |
| Orthophoto | 8,141,038 / −271,514 | 0.25 m |
| DEM | 8,141,037.49279 / −271,513.07519 | 1 m |

GDAL 3.12.2 independently reads these same affine transforms from the original
ODL/VICAR header bytes. PROJ 9.8.1 independently reproduces the declared spherical
projection. The actual DEM origin was retained throughout G3.2; it was never
replaced with the orthophoto origin.

The complete pinned rover table supplies **49,194** nonnegative-Sol ROVER rows:

| Consistency residual | Maximum absolute difference |
| --- | --- |
| Formula versus published easting/northing | 0.000530 m |
| Formula versus independent PROJ | Below 0.000000002 m |
| Formula versus orthophoto pixel fields | 0.0061 native pixel |
| Formula versus DEM pixel fields | 0.0053 native pixel |

These tiny residuals reflect decimal rounding and consistency between published
fields. **They do not mean submillimetre or subpixel ground accuracy.** The table
and maps share mission localization ancestry.

Representative unmodified source rows are retained in
[mission-checkpoints.csv](sources/registration/mission-checkpoints.csv):

| Sol | Planetocentric latitude | East longitude | Context |
| --- | --- | --- | --- |
| 0 | −4.589466996° | 137.441632997° | Initial rover localization |
| 504 | −4.625270893° | 137.410273932° | Historical observer checkpoint |
| 997 | −4.668266198° | 137.370017922° | Historical observer checkpoint |
| 1500 | −4.699771908° | 137.354874606° | Historical observer checkpoint |
| 2300 | −4.729277020° | 137.379310998° | Historical observer checkpoint near DEM AOI |
| 3000 | −4.734052962° | 137.398455075° | Historical observer checkpoint |
| 3974 | −4.776473634° | 137.404551468° | Historical observer checkpoint |

These are **observer positions, not photographed-feature coordinates or newly
surveyed image control points**. Multiple poses can exist on one Sol. Source
site/drive/pose identifiers are preserved in the CSV. No new app markers exist.

NASA's independently published rounded landing coordinate, −4.5895°, 137.4417° E,
is about **4.42 m** from the selected PDS Sol 0 row. This supports the convention
at that rounding scale. The NASA reconstruction paper distinguishes relative
localization from larger absolute map-tie uncertainty; a publication about the
same mission is not an independent modern surface-control survey.

### Rejected transformation explanations

- Applying an oblate planetocentric→planetodetic conversion at the DEM AOI would
  introduce about **3.3 km** north/south displacement. The PDS sphere and explicit
  columns do not authorize it. Planetographic longitude defaults also vary by
  convention; explicit product east longitude controls here.
- Native center-versus-edge conventions contribute only 0.125 m for the
  orthophoto and 0.5 m for the DEM. The two actual origins differ by about 1 m.
  Those effects cannot justify the previous hundred-metre diagnostic hypotheses.
- The Trek WMTS uses an ambiguous `EPSG::104905` identifier, while Trek's own
  catalogue configuration labels a corresponding service as `IAU2000::104905`.
  Installed PROJ resolves **ESRI:104905** as an oblate Mars system and rejects
  **EPSG:104905**. These namespaces are not interchangeable. No Earth ellipsoid,
  inferred latitude conversion, axis swap or guessed authority substitution is
  applied. G1's broad check supports the sampled angular convention, not precise
  local control.

M1 uses the same reference radius, but pure geodesy cannot establish registration
between image products. No runtime map/DEM pipeline imports M1. Its four files
and all three commits are preserved; its tests are run explicitly.

## 3. Tile-generation audit

The independent checker reads dimensions and origin from the actual WMTS XML,
maps committed XYZ pixel centres back to angular coordinates, and compares the
corresponding original NASA input pixels. It does not import the G1 sampler.
Grayscale/alpha and RGBA PNG input modes are normalized before comparison.

**32 CTX output tiles; 1,249,591 opaque pixels compared; zero RGBA mismatches.**
This rules out a discrepancy introduced by the audited nearest-neighbour tile
conversion relative to the declared WMTS grid. It does not prove that the
upstream mosaic's native georeferencing or control network is correct.

All 33 G1 asset hashes, G2 photo records, G3.1 geology and all G3.2 tile/coverage
hashes remain unchanged. MapLibre remains angular display encoding; no Earth
distance or scale is used for scientific measurement.

## 4. Correlation investigation

The prior G3.2 check sampled isolated 0.25 m orthophoto pixels roughly 16 m apart
against approximately 10 m CTX samples. It did not average the finer image to
comparable support. Its central-patch peak of about 0.84 was selected after
smoothing and searching many translations. That number is not a control-point
fit, held-out validation or an accepted displacement. The historical measurements
are preserved; their interpretation is qualified by this follow-up.

The new check fetches only one **28,038,400-byte** native orthophoto band, with
verified Content-Range and SHA-256. It does not download the full 1.5 GB image.
The comparison window is **1,000 × 260 m projected**, inside the DEM AOI:
4,000 × 1,040 native pixels averaged into 100 × 26 cells of 10 m support. CTX is
sampled from the original WMTS inputs. Ten metres is a processing grid, not a
certified effective resolving power or registration accuracy.

The window contains 60 zero-DN pixels. The label does not declare a special
zero value. For diagnostic sensitivity, searches exclude all eight analysis
blocks containing any zero, retaining 2,592 cells. This conservative image mask
is **not a new DEM validity mask**. Including all cells gives NCC −0.254;
excluding those blocks gives approximately −0.249. Gradient-magnitude agreement
at the original coordinates is approximately 0.028. Neither establishes a tie.

The checker explores 3,721 diagnostic sampling hypotheses (±300 m in projected
east/north, 10 m increments); none is written into data or rendering:

| Reference window | Unshifted NCC | Best search NCC | Diagnostic CTX sampling offset E/N (m), **unapplied** |
| --- | --- | --- | --- |
| Full strip | −0.249 | 0.408 | −70 / −260 |
| Western third | −0.500 | 0.673 | +140 / −250 |
| Middle third | +0.115 | 0.415 | +190 / −100 |
| Eastern third | −0.336 | 0.432 | +170 / −250 |
| Western two-thirds (training only) | −0.228 | 0.549 | +40 / −170 |

The training winner scores only **0.222** on the held-out eastern third.
Unrelated 1 km-offset full-strip windows score up to **0.283**; checks using the
same held-out support score up to **0.182**. These are diagnostic comparisons,
not an independent significance test. Correlated spatial samples,
limited strip geometry, lighting/albedo differences, image resolution and
selection of maxima prevent statistical or survey accuracy claims. Even handling
eight uncertain radiometric blocks changes the full-strip winner. There is no
stable, independently validated rigid correction. Affine or nonrigid fitting
would add unsupported freedom and is not attempted.

## 5. Causal assessment and decision

| Explanation | Evidence assessment |
| --- | --- |
| Marswalk CTX tile conversion | No mapping error found against the published matrix; exact pixel reproduction |
| PDS projection/origin conversion | Labels, native headers, CSV fields and independent software agree to rounding |
| Latitude type, units, axis order or half-pixel error | No evidence-supported correction; tested alternatives do not justify the diagnostic offsets |
| Differing source/control products | PDS mission reference and Trek CTX are distinct products; exact shared control lineage is unavailable |
| Correlation limitations | Demonstrated sparse-sampling alias risk, unstable search winners, weak held-out agreement and photometric ambiguity |
| Upstream georeferencing/absolute accuracy | Still unresolved; published control context is not a local error model or an independent survey |

The discrepancy **cannot be uniquely attributed** to an upstream georeferencing
error rather than image-product differences or correlation limitations with the
available evidence. Low or negative DN agreement alone does not prove a physical
translation. Internal coordinate consistency alone does not prove registration.
Therefore **no scientific correction is applied** and precise co-registration
remains unverified. The app's existing full-opacity views and warnings remain.
There is no operational terrain sampler, numerical elevation profile, route
optimization, astronaut safety class, feasibility calculation or mineralogy work.

Recommended next evidence: obtain the exact Trek mosaic's constituent products,
native georeferencing and control/residual documentation; identify distributed,
independently supported feature correspondences with uncertainties and reserved
validation points. A documented mission orthophoto associated with the same DEM
is a possible future basemap candidate, subject to its own coverage and control
audit. Do not use rover poses as feature controls, fit geometry to appearance, or
infer whole-corridor accuracy from one strip. No external messages were sent.

## 6. Separate mobile regression and verification

The reported 390px pixel-count failure is investigated separately in
[MOBILE_DEM_REGRESSION.md](MOBILE_DEM_REGRESSION.md). It reproduced three times
without changing the test. MapLibre's 300 ms opacity transition contaminated the
immediate zero-opacity baseline. The test now waits for stable rendered pixels;
the original `>100` colored-pixel and `>0.1` hillshade thresholds are unchanged.
Production rendering, layout, scientific data and M1 are untouched.

Final combined validation:

| Check | Result |
| --- | --- |
| Scientific investigation | Reproduced from pinned input bytes; no transformation accepted |
| Python scientific/terrain tests | **10 passed** |
| Regional/contract tests + M1 geodesy suite | **77 passed** (21 regional/contract + 56 M1) |
| ESLint / TypeScript | Pass |
| Production build | Pass |
| Full Playwright Chromium regression | **39 passed**, including all three regions, desktop/tablet/390px, drag/wheel/keyboard/touch/pinch and prior science views |
| Separate 390px repeat checks | 3/3 reproduced before fix; 3/3 passed after verified baseline wait |
| Scientific assets / M1 preservation | Existing asset hashes and four M1 file hashes unchanged |
| Precise local registration / operational gate | **Unverified / disabled**, unchanged |

## Reproduction and changed files

From `D:\martian-map`:

For browser checks, first start `npm run dev -- --port 3100` in a separate
terminal. The explicit base URL below keeps these checks on this checkout's
server. The scientific script and Python tests do not need a server.

```powershell
python -m pip install -r team/gale/requirements-registration.txt
python -B team/gale/investigate_registration.py --download
python -B -m unittest discover -s tests -p test_gale_*.py -v
npm run lint
npm run typecheck
npx tsx --test tests/mission.test.ts tests/regions.test.ts tests/geodesy.test.ts
npm run build
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3100'
npm run test:e2e
```

`--download` permits missing pinned inputs only: the 28 MB image band, 11.8 MB
rover CSV and small source tiles. Cached data is used by default. Every input is
checked by length/hash; an unexpected Range response is rejected before reading
the body. Original full rasters and caches stay outside Git. Generated results
stay in `output/registration-investigation/`; the reviewed snapshot is committed
under `sources/registration/`. Measurements may have platform-dependent floating
point differences at the last decimal; software versions are recorded.

Changes: scientific audit script and requirements, pinned metadata/measurements,
five Python consistency checks, a reproducible opacity probe, this report and
mobile-regression report, context/follow-up links, and a rendered-baseline wait in
`tests/browser/gale-dem.spec.ts`. No regional manifest, shared contract, application
renderer, M1 file or regional asset is changed. Jezero and Oxia remain isolated.
