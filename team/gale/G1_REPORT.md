# Gale G1: scientific map exploration

Viewport/navigation behavior was subsequently corrected in [VIEWPORT_FIX.md](VIEWPORT_FIX.md).
The source audit below records the original G1 delivery.

Dataset `gale-g1-v1`, reviewed 13 November 2026. Implementation branch:
`feat/gale-map`, based on merged shared architecture PR #1 (`b6cc52d`).
This delivers map exploration and source-backed scientific context. It does not
deliver an EVA route engine or verified mission feasibility.

## Delivered map and extent

The shared MapLibre workspace displays NASA Trek's **Gale_CTX_BlockAdj_dd**
orbital mosaic and **NASA's recorded Curiosity traverse**. Layer visibility,
opacity, neutral traverse legend, attribution and the evidence register use the
existing regional contract. No separate map, registry fork or backend was added.

The supported view uses the exact PDS `msl_orbital_map::42.0` published footprint:
137.3442352329006–137.4579431096443 degrees east,
−4.822361175063087–−4.580605407446296 degrees planetocentric latitude.
This elongated footprint contains the recorded crater-floor/lower Mount Sharp
exploration corridor. It is a **display extent**, not a science-unit boundary,
complete latest traverse extent, audited terrain footprint or safe exploration zone.
Newer NASA traverse segments can lie beyond this older camera footprint.

| Layer ID | Configuration | Evidence / status |
| --- | --- | --- |
| `gale-optical` | `/maps/gale/ctx-tiles/{z}/{x}/{y}.png`, 256px XYZ, zooms 5–13, visible at 100% | Derived display tiles of observed CTX imagery; available |
| `gale-traverse-recorded` | `/maps/gale/curiosity-traverse.geojson`, neutral `#D6DEE8` line, 90% | Observed mission record; available |
| `gale-terrain` | No rendering; registered USGS DEM reference | Pending raster subset/quality audit |
| `gale-geology` | No rendering; published USGS-listed mapping reference | Pending registered GIS geometry and legend |

The imagery pack is 32 PNGs, 1,169,334 bytes, with zero missing source samples
inside the display AOI. Outside the exact AOI is transparent. Original rasters,
source WMTS cache, reference image samples and large downloads are not committed.

## Source inventory

The full machine-readable inventory, including instrument, product ID, dates,
resolution, processing and limitations, lives in `regions/gale/config.ts` and is
visible in the application's data register. Unknown values remain null.

| Source | Use and limits |
| --- | --- |
| [NASA Trek WMTS capabilities](https://trek.nasa.gov/tiles/Mars/EQ/Gale_CTX_BlockAdj_dd/1.0.0/WMTSCapabilities.xml) | Actual imagery, matrix geometry and bounding envelope. Acquisition dates and mosaic effective resolution unspecified. CTX's instrument capability of up to 6 m/pixel is not this service's pixel spacing. Catalog creation time is not an observation date. |
| [NASA Trek API](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars) | Published client-access protocol; template ordering is matrix/row/column. |
| [NASA Curiosity location map](https://science.nasa.gov/mission/msl-curiosity/location-map/) | Official context and interactive map entry point. No screenshot tracing. |
| [NASA traverse GeoJSON](https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json) | Actual line geometry snapshot; 1,316 features, 1,320 original line parts and 27,008 2D vertices. Segments retained without fabricated connections. Source's vertical coordinates and `Length` properties omitted rather than assuming units/datum. |
| [NASA companion waypoints](https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json) | Source snapshot spans sols 3–5070. This is not asserted as a per-line timestamp. |
| [PDS localization label](https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_localizations/localized_interp.csv.xml) | PDS4 v42.0, CSV at same path without `.xml`; 49,315 rows, 49,194 ROVER records, sols 0–4868. Explicit centric latitude and east longitude cross-check the NASA geometry. CSV repeats poses at drive locations and is **not** treated as a continuous driven path. |
| [PDS orbital-map label](https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_maps/msl_orbital_map.xml) | v42.0 footprint, Mars sphere and image georeferencing. A 2.59 MB bounded-range sample supports independent coarse image registration without downloading the 1.5 GB reference image. |
| [PLACES SIS](https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/document/PLACES_PDS_SIS.pdf) | JPL D-78442, release 1.3. Older PDS3 layout; current PDS4 labels/release notes control the archive organization. |
| [USGS merged DEM](https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m) | Parker/Calef et al., v3; 32,980 × 57,440, 32-bit, 1 m output grid. HRSC/CTX/HiRISE tied to MOLA: effective resolution varies. Published bounds 137.124167–137.680559 E, −5.098652–−4.129605 N. Not downloaded or enabled. |
| [USGS-listed Glen Torridon study](https://www.usgs.gov/publications/geology-and-stratigraphic-correlation-murray-and-carolyn-shoemaker-formations-across) | Fedo et al., 2022, DOI 10.1029/2022JE007408. Published mapped contacts/stratigraphy support science context; no georeferenced overlay extracted from figures. |
| [REMS archive](https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/curiosity/rems.html) | Historical environmental archive identified. No dates/values/quality flags ingested, no forecast. |
| [PDS mission instrument inventory](https://pds-geosciences.wustl.edu/missions/msl/) | RAD archive discovery; no radiation series, astronaut dose or shielding model. |
| [Proposed Mount Sharp path](https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/) | Historical proposal only; never traced or confused with the recorded traverse. |

Educational/informational use follows [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)
and [JPL image-use policy](https://www.jpl.nasa.gov/jpl-image-use-policy/).
Credits remain visible; third-party notices take precedence. No logos or NASA
endorsement are implied. No separate product-specific restriction was supplied in
the fetched Trek capabilities/catalog; this is not a blanket license for unrelated assets.

## Coordinates, preprocessing and audit

Canonical coordinates remain Mars planetocentric latitude and east longitude
0–360. At Gale the display longitude wrap is an identity. PDS orbital-map labels
specify a 3,396,190 m sphere, equirectangular standard parallel and central
meridian zero. Projected meters stay distinct from geographic degrees.

Trek's WMTS declares `EPSG::104905`, with inconsistent namespace usage across
service/catalog APIs. That tag alone is not trusted as an Earth CRS or as evidence
for an ellipsoidal planetographic-latitude conversion. The actual grid starts at
−180/90, uses 256px images and has 2^(L+1) columns and 2^L rows at source matrix L.
It cannot be consumed as Web Mercator XYZ without adaptation.

`prepare_g1.py` inverse-maps each output XYZ pixel center through the angular
Mercator display formula, samples the corresponding planetary angular WMTS pixel
at L=z−1 with nearest-neighbor resampling, and masks outside the exact AOI. No
Earth radius, Earth distance, terrain measurement, radiometric correction or
geodetic ellipsoid transformation enters the display calculation. Finest source
sample spacing is about **10.175 m on Mars**, not native 6 m CTX resolution.

The separate PDS image registration diagnostic samples 96 × 128 georeferenced
reference pixels using bounded HTTP ranges. DN correlation is **0.4964** under
planetocentric sampling versus **0.1635** under a planetographic hypothesis, with
no fitted shifts. This supports the chosen display convention, but does not
establish survey-grade horizontal accuracy. Separately, **1,277** NASA traverse
line endpoints match explicit PDS centric/east positions within 0.00001 degree;
that tolerance is a comparison threshold, not claimed location accuracy.

Original small labels, input SHA-256, output hashes and actual audit results are
in `team/gale/sources/`. Display registration is a software/source review, not
independent scientific signoff on hazards or astronaut navigation.

Rebuild from the repository root with Python 3, NumPy and Pillow installed:

```sh
python team/gale/prepare_g1.py
```

Cache is under ignored `output/gale-research/`. Reuse that cache for the pinned
snapshot; changing inputs requires renewed review and a dataset-version bump.
The script rejects changed PDS label versions rather than silently adopting them.
No Python service or production runtime dependency was added.

For terrain follow-up, first inspect the GeoTIFF's tiling/compression and HTTP
range support, then subset a documented AOI with GDAL/Rasterio or the USGS-linked
Map a Planet service. Preserve mixed-source resolution zones and nodata/quality
masks. G1 does not assume this 3.6 GB product is cloud-optimized or download it.

## Science catalog and verification status

The original three `gale-objective-*` IDs and names remain compatible with saved
mission v1 records. They are documented hypothetical investigations. Four named
scientific areas were added:

| Area | Evidence and proposed investigation | Geometry status |
| --- | --- | --- |
| Glen Torridon | [NASA PIA23047](https://science.nasa.gov/photojournal/curiosity-on-the-clay-unit/) and the USGS-listed stratigraphic study support clay-bearing terrain and lake/river-history questions. Proposed bedding/contact observations. | Pending; no precise marker |
| Vera Rubin Ridge | [NASA hematite investigation](https://science.nasa.gov/blog/sols-1734-1735-gazing-longingly-towards-vera-rubin-ridge/) supports comparing iron mineralogy, textures and alteration. | Pending; no precise marker |
| Sulfate-bearing geological units | [NASA climate context](https://science.nasa.gov/resource/nasas-curiosity-finds-climate-clues-on-a-martian-mountain/) supports mineralogical and stratigraphic comparisons; not a unique climate interpretation. | Pending; no precise marker |
| Gediz Vallis | [NASA PIA26363](https://science.nasa.gov/resource/curiosity-takes-a-360-degree-view-of-gediz-vallis-channel/) supports channel/debris relationships and transport-history questions. Proposed clast/contact observations. | Pending; no precise marker |

These four entries carry Interpreted evidence and source references. Their
scientific existence/context is documented; **no exact target point or polygon
has been independently verified**. All seven coordinates remain null, and all
route eligibility remains unavailable. Source pages provide credited supporting
images; no photograph is copied into the UI or misrepresented as geospatial data.

## Shared changes and verification

Shared changes are necessary for real imagery: raster metadata controls camera
maximum zoom, title/attribution surfaces remain readable over bright imagery,
labels reflect scientific-map availability, and the brief distinguishes visible
map context from unavailable calculated routes/resources. No shared schema,
registry, dependency, Jezero data or Oxia data changes were made.

Tests were adapted only where the former all-regions-empty fixture assumption no
longer applies. Contract rejection cases use an unavailable region as their
baseline. The new Gale browser cases check layer fetches, visibility/opacity,
source links, absence of unverified markers, map controls and four screen widths.

Final verification in the isolated Gale worktree:

| Check | Result |
| --- | --- |
| `npm run lint` | Pass, no warnings/errors |
| `npm run typecheck` | Pass |
| `npm test` | 12/12 pass |
| `npm run build` | Pass, production static route generated |
| `npm run test:e2e` | 20/20 pass, including 4 Gale scientific-map cases and Jezero/Oxia regression flows |
| Source/preprocessing audit | Pass; 32 tiles, zero missing samples inside AOI; independent coordinate/registration diagnostics recorded |
| `git diff --check` | Pass |

Screenshots at 1440x900, 1024x768, 768x1024 and 390x844 were captured and
visually inspected at desktop and mobile. Automated browser checks also covered
responsive layout, keyboard/dialog accessibility, save/open/import, stale
versions, offline plan access and unavailable calculations. These software checks
are not scientific validation of Mars terrain or safe navigation.

Modified paths: `regions/gale/{config,layers,targets}.ts`, `public/maps/gale/**`,
`team/gale/{CONTEXT.md,G1_REPORT.md,prepare_g1.py,sources/**,screenshots/**}`;
shared `components/map/map-workspace.tsx`, `components/mission/brief.tsx`,
`components/planner.tsx`, `components/science/catalog.tsx`, `app/globals.css`;
and `tests/{mission.test.ts,regions.test.ts,browser/planner.spec.ts}`.
Final commit information is recorded in the delivery message.
Screenshots are retained under `team/gale/screenshots/`; original automated output
and reports remain ignored under `output/playwright/` and `playwright-report/`.

All six assessments, routing, oxygen/battery/EVA-time/radiation calculations and
return margins remain **Unverified / unavailable**. There is no FastAPI backend,
hazard inference, generated astronaut path, live tracking or 3D work in G1.
