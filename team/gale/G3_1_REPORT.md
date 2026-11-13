# G3.1 — Geological mapping and GIS integration

13 November 2026 · branch `feat/gale-map` · starting commit `f102e81`.
Dataset version: `gale-g3-1-v1`. Scope: G3.1 only.

The Gale map now offers **Arc Pass geological units**, a small interpreted
photogeological dataset linked from the peer-reviewed Gediz Vallis study. All
53 author-supplied polygons and seven source Unit codes are retained. This is
about 264 × 222 m of Arc Pass, not crater-wide geology or a boundary for the
four catalog targets. Their location verification and routing status are unchanged.

## 1. Research and selection

The [geological evidence register](G3_GEOLOGY_EVIDENCE_REGISTER.json) distinguishes
publication context, available download, inspected file and render validation for
seven candidates. It was created before enabling the layer. Final readiness is
recorded there after checks.

| Candidate | Actual audit outcome | Integration decision |
| --- | --- | --- |
| [Davis, Arc Pass GIS](https://doi.org/10.6084/m9.figshare.30401788.v1) | Downloaded and inspected FileGDB; source CRS, category attributes, geometry and independent registration reviewed. | Selected: small categorical map inside existing CTX coverage. |
| [Fedo et al., Glen Torridon map](https://zenodo.org/records/7041712) | Downloaded JPEG, 2058×2402; no CRS, geotransform, GCPs or RPCs. Repository gives corner numbers. | Not georeferenced from those corners; no tracing, crop registration or invented boundaries. |
| [Hughes, Glen Torridon geomorphic map](https://doi.org/10.7936/0cyw-3n10) | Retrieved legacy catalog and DOI metadata; newer archive destination returned empty HTTP 202, and browser returned 403. | Product files, CRS, coverage and classification remain uninspected. |
| [Meyer et al., clay–sulfate supplementary GIS](https://doi.org/10.1130/GSAB.S.25938268) | Downloaded archive, inspected eight shapefiles with valid/nonempty geometries. Mixed Mars geographic degrees/projected metres. | Promising subsequent geological work; not render-validated. Files map boundaries, pediments, marker bed and formation-tagged rover segments, not a complete formation-polygon catalog. |
| [USGS SIM 3292 global Mars map](https://pubs.usgs.gov/sim/3292/) | Retrieved original metadata/readme and official Robinson/Mars-sphere feature-service definition; 790 MB raw database not downloaded. | Scale 1:20M is unsuitable for these small corridor formations; no false detailed coverage. |
| [Thomson et al., western Aeolis Mons mapping](https://www.hou.usra.edu/meetings/pgm2024/pdf/7022.pdf) | Public 1:60,000 mapping-progress abstract located; no released GIS file verified in this audit. | Publication/progress evidence only. |
| [USGS/IAU Gediz Vallis nomenclature](https://planetarynames.wr.usgs.gov/Feature/15571) | Center/WKT available; control network UNKNOWN, as recorded in G2. | Named-valley extent is not a geological deposit classification; not used. |

Sources were followed through actual data-availability statements. The
[Fedo paper](https://doi.org/10.1029/2022JE007408) links its Zenodo JPEG.
The [Meyer study](https://doi.org/10.1130/B37355.1) links its GSA supplement;
its inspected files include Carolyn Shoemaker, Mirador and Stimson rover
segments. These are not repurposed as formation boundaries or used to replace
the historical traverse. The [Davis study](https://doi.org/10.1029/2025JE009538),
published in 2026, links the author's 2025 supporting-data collection and GIS.
Its figure 17 identifies the mapping basis and digitization scale. No DEM/slope
or mineralogy products were processed for display.

## 2. Original product and integrity

Selected product: **GIS Shapefiles of Arc Pass, Mars**, Joel Davis (2025),
Figshare article `30401788`, version 1, DOI `10.6084/m9.figshare.30401788.v1`.
Despite the catalog title, the actual archive is an ESRI File Geodatabase.

- Original file: `Geomap.gdb.zip`, 94,771 bytes, 83 ZIP members.
- [Stable original download](https://ndownloader.figshare.com/files/58896958).
- Published and computed MD5: `b2988eb07e8c664589c9e5fd8429fdb0`.
- SHA-256: `783f052b5bb5eb7b478e66ce6c972816f8adc0e154be0176bc817b14cd7e8a24`.
- ZIP CRC check passed; all seven GIS feature classes readable with OpenFileGDB.
- Source archive and source API metadata preserved under `sources/g3/`.
- License: CC BY 4.0. Attribution includes Joel Davis, year, DOI and associated
  paper; Marswalk's display conversion is identified as a modification.

The nonselected Fedo JPEG and Meyer archive also matched their published MD5s;
their SHA-256, sizes and download URLs are in the register. They remain in the
ignored audit cache, with compact metadata and inspection results committed.

## 3. Planetary coordinate validation

The geodatabase declares `Mars2000_Equidistant_Cylindrical_clon0`, with a
`GCS_Mars_2000_Sphere` reference, radius **3,396,190 m**, no flattening, central
meridian 0 and zero false offsets. Its spherical equirectangular inverse uses
standard parallel 0, as independently checked below. Coordinates are metres,
with eastward easting and northward northing.

The inverse projects to the source Mars geographic sphere, with `always_xy=True`.
On a sphere planetographic and planetocentric latitude coincide; no Earth
ellipsoid or Mars-ellipsoid latitude conversion is silently introduced. The
source footprint is east-positive near 137° E, so longitude wrapping to signed
MapLibre display coordinates makes no numerical change here.

Native extent in metres:
`[8144734.477600001, -283870.8426000001, 8144998.632300001, -283649.2681]`.
Geographic W/S/E/N:
`[137.4065970458571, -4.789072816244821, 137.4110534954222, -4.785334720408685]`.

Two corners and the center were checked against the independent equations
`lon = degrees(x / 3396190)` and `lat = degrees(y / 3396190)`.
Maximum angular disagreement was below `1e-10°` (observed residual about
`8.9e-16°`). This tests the coordinate conversion, not survey accuracy.

Independent [PDS PLACES map label](https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_maps/msl_orbital_map.xml)
v42.0 specifies the same sphere and explicitly planetocentric/east convention.
Selected end-of-Sol rover positions from the separately labeled PDS localization
table are consistent with the paper's east-to-west Arc Pass campaign context.
They are used only as a registration/context check, never as feature coordinates.

## 4. Geometry and registration validation

Selected class: `map_unit_polygons_v2`, 53 MultiPolygon Z records.
All are readable, valid and nonempty; no missing features or normalized duplicate
geometries were found. Unit values/counts:

| Source Unit | Polygon count |
| --- | ---: |
| F1 | 5 |
| F2 | 1 |
| F3 | 16 |
| mF1R | 2 |
| MSg | 7 |
| R | 21 |
| S | 1 |

Projected union area is about 58,527.26 m². Relative to the source `boundary_box`, about
2.6848 m² is unmapped and overlap totals about 0.000172 m². No polygon area
extends outside that boundary. These small source artifacts are documented and
preserved: no buffer/repair, gap filling or snapped edges. The straight outer
rectangle is the source mapping limit, not a geological contact enclosing a unit.

For an independent image review, the existing PDS map label was downloaded and
matched byte-for-byte to the pinned G1 label. A bounded HTTP range retrieved
28,227,120 bytes of its image, not the 1.5 GB original. Original 0.25 m pixels
were cropped using the label's stated origin and pixel size. Source polygons
were drawn at their declared coordinates with no fitted shift. Outlines follow
the corresponding mapped landforms on that reference. Existing CTX uses the
G1-reviewed coordinate convention and covers the full polygon footprint;
browser rendering also confirms that the layer appears at that location.

[Registration diagnostic](screenshots/g3-1/arc-pass-registration.png): PDS
HiRISE reference imagery, NASA/JPL-Caltech/University of Arizona; source mapping
Joel Davis (CC BY 4.0), with Marswalk diagnostic outlines and raw Unit labels.
This supports registration consistency, not quantified absolute accuracy or
independent geological confirmation of each interpreted contact.

## 5. Reproducible processing

See [prepare_g3_geology.py](prepare_g3_geology.py),
[requirements-g3.txt](requirements-g3.txt), and
[source inventory](sources/g3/README.md).

```powershell
cd D:\martian-map
python -m venv output\g3-audit-env
output\g3-audit-env\Scripts\python.exe -m pip install -r team\gale\requirements-g3.txt
output\g3-audit-env\Scripts\python.exe team\gale\prepare_g3_geology.py
```

The script verifies the pinned archive SHA-256, ZIP integrity, planetary CRS,
independent coordinate inverse, category counts and geometry validity before
writing the display asset. It uses GDAL/OpenFileGDB through Pyogrio, PyProj and
Shapely. These are offline audit tools, not application dependencies.

The output is `public/maps/gale/arc-pass-geology.geojson`: **240,690 bytes**,
53 features. All XY vertices, rings, source `Unit` values and OBJECTIDs are
retained. Constant zero Z is omitted without an elevation interpretation;
auxiliary area/length fields are not used as scientific measurements in the app.
Draft contacts, final linework, trough/ridge axes, profile and boundary-box
classes are not independently displayed. No simplification, clipping, smoothing,
geometric shift or resampling of the polygons occurs. MapLibre's ordinary
viewport tessellation/LOD is presentation behavior, not a replacement GIS product.

Output SHA-256:
`d182c9291450f77fd07fef4fbdb979d23df45e65c6665fb02dd7df08f2748dce`.
The processing audit stores original WKT, checks, counts, topology and versions.
GeoJSON is explicitly Mars display encoding, not Earth GPS data.

## 6. Integrated layer and legend

Open Gale, choose **Layers**, and enable **Arc Pass geological units**.
It starts off, uses 45% opacity by default, and fits the small mapped footprint
when explicitly enabled. Opacity edits and panel resizing do not repeatedly
recenter it. **Fit exploration region** restores the original regional overview.
CTX and recorded Curiosity geometry remain visible; zoom, pan and touch work.

Seven muted display colors match the seven exact source codes. Colors are
Marswalk styling, not a claim to reproduce the paper's palette. The legend
includes source codes, counts and supported facies descriptions. MSg, R and S
remain unexpanded where an exact legend expansion has not been independently
verified; no arbitrary formation/mineral names are assigned to them. Unit
information can be read in the legend beside the map without opening a new modal.

Evidence is **Interpreted**. Coverage, source credit, digitization scale and
limitations are visible. The close-view limit is 18 to inspect vector details;
the CTX pack retains its native served zoom limit 13 and becomes visibly coarse
when overzoomed. No higher-resolution basemap is claimed or substituted.

## 7. Shared architecture

[G3.1 contract handoff](G3_1_CONTRACT_REVIEW.md) documents optional category,
legend-description, focus-extent and zoom fields. Old manifests remain valid.
Historical/context overlays can coexist with a thematic layer; thematic choices
remain mutually exclusive. No new renderer, persisted mission format, target
polygon interface or regional UI fork was created. No teammate approval is claimed.
Jezero/Oxia content and assets are unchanged.

## 8. Verification and screenshots

Executed successfully on Windows:

| Check | Result |
| --- | --- |
| `npm.cmd run lint` | Passed |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run build` | Passed, optimized Next.js production build |
| `npm.cmd test` | 19/19 unit/mission/renderer/contract tests passed |
| `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npx.cmd playwright test` | 35/35 browser tests passed |
| `python team/gale/prepare_g3_geology.py` | Passed, deterministic output hash reproduced |
| `python team/gale/verify_g3_registration.py` | Passed using checked cached range; diagnostic reproduced |
| G1 asset hash comparison | All 33 original assets unchanged |
| G2 photograph integrity and target verification guards | Passed in unit/browser regression |
| `git diff --check` | Passed |

Browser checks include actual canvas colors, opacity, source legend,
credits/coverage, CTX/traverse loading, region isolation, accessibility and the
four responsive sizes. Existing tests also exercise drag panning, wheel/control
zoom, touch drag/pinch through Chromium CDP, keyboard navigation, fitting,
resizing, photo fallbacks, legacy mission persistence and stale datasets.
They test software/source consistency; they do not certify survey accuracy or
geological interpretation.

Screenshots with layer and legend:
[1440px](screenshots/g3-1/gale-g3-geology-1440.png),
[1024px](screenshots/g3-1/gale-g3-geology-1024.png),
[768px](screenshots/g3-1/gale-g3-geology-768.png),
[390px](screenshots/g3-1/gale-g3-geology-390.png).

## 9. Files changed

- `regions/gale/config.ts`, `layers.ts`, new `geology-legend.ts`: provenance, version and interpreted layer.
- `public/maps/gale/arc-pass-geology.geojson`, `.gitattributes`: derived display geometry and byte-preserving checkout rule.
- `lib/contracts/science.ts`, `lib/map/region-layers.ts`: compatible categorical rendering and context-overlay coexistence.
- `components/map/map-workspace.tsx`, `components/science/evidence.tsx`: opted-in footprint fit, useful zoom and source category information.
- `tests/regions.test.ts`, `tests/mission.test.ts`, `tests/browser/gale-geology.spec.ts`, `tests/browser/planner.spec.ts`: validation, integrity and browser regressions.
- `team/gale/G3_GEOLOGY_EVIDENCE_REGISTER.json`, this report, contract handoff, `CONTEXT.md`, processor/requirements, `sources/g3/`, `screenshots/g3-1/`: scientific audit and delivery evidence.

## 10. Limitations and delivery

Only the Arc Pass product is validated for this app display. GT/Murray/Carolyn
Shoemaker/VRR and wider sulfate/valley boundaries have not been fabricated from
publication illustrations or renamed to match catalog targets. The Meyer bundle
provides a concrete GIS lead for further geological review. Unavailable archives
are not described as nonexistent datasets.

Geology is interpreted science context. It does not establish safe terrain,
mineral abundances, precise sampling sites, navigation-grade positional accuracy,
routes or resources. All six mission assessments retain the existing gates.
Original G1 imagery/traverse assets and G2 photographs/targets are preserved.
No G3.2 DEM/slope, G3.3 mineralogy, G4, route optimization or resource calculations
were begun. Delivery is committed and pushed to `origin/feat/gale-map` with
message `feat(gale): integrate validated Arc Pass geological mapping`; the
revision is the commit containing this report, also recorded in the final
delivery response. No merge to `main` is performed.
