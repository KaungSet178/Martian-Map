# Marswalk Planner — R1-Gale: Terrain-Aware Route Planning Report

| Field | Value |
| --- | --- |
| Document | `docs/GALE_TERRAIN_ROUTING_REPORT.md` |
| Branch | `feat/gale-terrain-routing` |
| Worktree | `D:\martian-map-gale-routing` |
| Repository | `https://github.com/KaungSet178/Martian-Map` |
| Date | November 14, 2026 |

> A computed path is a lower-terrain-cost path through a declared DEM model.
> It is **not** an astronaut traversability, hazard, trafficability, or safety
> certification, and it is not operational navigation guidance.

---

## 1. Starting commit

| Item | Value |
| --- | --- |
| Baseline branch | `feat/interactive-waypoints` |
| Starting commit | `08ccedb7c635ab89603d6444b30e6fe4f7e7d6d4` |
| Starting commit subject | `fix(map): harden M3 trajectory slerp limits, fault isolation, and placement safeguards` |
| New branch | `feat/gale-terrain-routing` |
| Worktree | `D:\martian-map-gale-routing` |

The baseline is the shared mission baseline that already contains geometric
waypoint planning and the interactive waypoint UI. The routing work was created
from that commit only. No ongoing Gale visualization, weather, Jezero, Oxia, or
shared-integration branch was merged, rebased into, or force-pushed.

Existing worktrees and remote branches were inspected before implementation.
The two alternate regional products were treated as distinct scientific
datasets throughout, never as one blended surface.

---

## 2. Source DEM provenance

Both routing products are authentic numeric Martian elevation rasters. The
routing engine reads GeoTIFF elevation bands directly with `rasterio`; rendered
PNG elevation tiles, hillshades, slope colours, and browser map images were
never decoded or sampled as terrain.

### 2.1 Primary product — regional HRSC 30 m DTM

| Field | Value |
| --- | --- |
| Product | `hrsc_km09_h1938_h1927_h1916-dtm-mosaic` |
| Publisher | ESA / DLR / Freie Universität Berlin / NASA JPL |
| Citation | Persaud et al. (2021), 30 m HRSC DTM mosaic of Gale Crater, DOI `10.5281/zenodo.5808354` |
| Source | `https://zenodo.org/records/5808354/files/hrsc_km09_h1938_h1927_h1916-dtm-mosaic.tif` |
| Authentic raw file | `hrsc_km09_h1938_h1927_h1916-dtm-mosaic.tif` |
| Raw bytes | 311,785,221 |
| Raw SHA-256 | `ed1fd5cd080a62eff7d2b9f38110c0a2c62ee05a4706ac0b45d015043e781ae6` |
| Raw MD5 | `1d714f2142a56e962d50d985b7088b13` |
| Full source dimensions | 7,584 × 10,275 |
| Crop window (col, row, w, h) | `(2838, 3121, 293, 545)` |
| Committed routing crop | `data/routing/gale/gale-hrsc-30m-routing.tif` |
| Crop bytes | 285,545 |
| Crop SHA-256 | `b0212c310f1b9fa7cca8f5566d4b3c1dc4c0069e2a1eee59b350b6836d643e4b` |
| Crop dimensions | 293 × 545 |
| Crop dtype / nodata | float32 / `-32768.0` |
| Crop transform | `[30.0, 0.0, 8140012.398099138, 0.0, -30.0, -270498.3070835827]` |
| Crop extent (W, S, E, N) | `137.3269327, -4.8393044, 137.4752253, -4.5634701` |
| Valid elevation posts | 159,685 of 159,685 |
| Routeable cells (full 3×3 support) | 158,013 |
| Measured ground area | 141.733 km² |
| Elevation range | −4,530.00 to −2,641.22 m (MOLA areoid) |
| Horn 3×3 slope range | 0.00° to 27.30°, mean 5.83° |

The crop covers the audited Gale overview footprint plus a 1 km derivative
buffer so that every edge of the overview has a complete Horn neighbourhood.
The source mosaic itself is only 77.66% valid, but the selected Gale crop
contains no nodata posts.

### 2.2 Secondary product — USGS HRSC–MOLA 200 m blended DEM

| Field | Value |
| --- | --- |
| Product | `Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2` |
| Publisher | USGS Astrogeology Science Center / NASA / ESA |
| Citation | Fergason, Hare, and Laura (2018), USGS HRSC–MOLA blended DEM |
| Source | `https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/HRSC_MOLA_Blend/Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif` |
| Authentic pre-extracted Gale window | `usgs_hrsc_mola_200m_gale.tif` |
| Source bytes | 81,288 |
| Source SHA-256 | `1b39ccf4a714f9a13c51e53140dce417e6ebb4ff652af11ae97807a71bd30b4c` |
| Source MD5 | `a9b48bf7e76e41abbbb865e0a1f0db71` |
| Committed routing crop | `data/routing/gale/gale-hrsc-mola-200m-routing.tif` |
| Crop bytes | 40,377 |
| Crop SHA-256 | `b5b53e2c04e513bb167dde6db893e69b7e79f4c9e266f2a0b70e7bb511bb2bf1` |
| Crop dimensions | 179 × 238 |
| Crop dtype / nodata | int16 / `-32768.0` |
| Crop transform | `[0.0033741353778094364, 0.0, 137.09786867115304, 0.0, -0.0033741353778094364, -4.296961403640324]` |
| Crop extent (W, S, E, N) | `137.0978687, -5.1000056, 137.7018389, -4.2969614` |
| Valid elevation posts | 42,602 of 42,602 |
| Routeable cells | 41,772 |
| Measured ground area | 1,665.266 km² |
| Elevation range | −4,635 to 179 m |
| Horn 3×3 slope range | 0.00° to 32.30°, mean 6.36° |

The 200 m product has roughly 600 m Horn gradient support. It is retained as a
coarse regional comparison only. It is never averaged, resampled, or mosaicked
with the 30 m product, and each route names exactly one source dataset.

### 2.3 Prior scientific audits consulted

- `team/gale/G3_2_DEM_AUDIT.json` and `team/gale/G3_2_REPORT.md` —
  local PDS DEM audit and the explicit statement that CTX registration is not
  verified.
- `team/gale/G4_TERRAIN_AUDIT.json` — regional 30 m and global 200 m terrain
  audit, coverage figures, and the registration gate.
- `team/gale/REGISTRATION_INVESTIGATION.md` — failed image-search registration
  experiment; no shift was applied.
- Authentic G4 raw rasters read from
  `D:\martian-map-gale-terrain\output\g4\raw\` (ignored working data, not
  committed).

The G4 registration gate records `operational_routing_allowed: false` and
`hazard_assessment_certified: false`. Those statements are preserved: this
branch performs research-grade graph search under an explicit `unverified`
status; it does not enable operational navigation.

---

## 3. Projection and distance validation

### 3.1 Planetary reference

| Property | Value |
| --- | --- |
| Body | Mars |
| Reference surface | Mars 2000 sphere, radius 3,396,190 m |
| Latitude convention | Planetocentric, degrees |
| Longitude convention | East-positive, 0–360° |
| Vertical datum | MOLA areoid, metres positive up |
| Distance model | Spherical great-circle (haversine) on the Mars 2000 sphere |

No WGS84 radius, Earth ellipsoid, Earth geoid, or degrees-to-metres shortcut is
used. One degree of arc at the equator is 59,274.6 m on this sphere, which is
why latitude/longitude degree differences are never converted to metres
directly.

### 3.2 Raster CRS audit

| Product | Source CRS | Pixel geometry | Verification |
| --- | --- | --- | --- |
| HRSC 30 m | ESRI:103885, Equirectangular, sphere R = 3,396,190 m, `lat_ts = 0`, central meridian 0 | 30 m × 30 m projected | `pyproj` inverse transforms crop corners to the audited geographic extent. Affine has zero rotation. |
| USGS 200 m | `GCS_Mars_2000_Sphere` (geographic) | 0.0033741353778094364° × 0.0033741353778094364° | Geographic spherical grid; ground spacing computed per row with the Mars radius. |

The loader rejects non-Mars radii, rotated affines, zero pixel spacing,
non-separable grids, grids smaller than 3 × 3, and unchanged checksums.

### 3.3 Metric edge distances

Every graph edge is measured as a Mars great-circle distance between adjacent
cell centres:

- East/west edge: haversine along the row, approximately
  `30 m × cos(planetocentric latitude)` for the projected HRSC grid.
- North/south edge: meridian haversine.
- Diagonal edge: great-circle distance to the diagonal neighbour, indexed by
  the northern row of the pair so north-going and south-going diagonals use
  the correct latitude band.

Measured values for the primary crop (row 100, about 4.62° S):

| Quantity | Measured |
| --- | --- |
| East ground spacing | 29.902763 m |
| North ground spacing | 30.000000 m |
| Diagonal great-circle spacing | 42.357699 m |
| Flat-grid `hypot(29.902763, 30.0)` (not used) | 42.358 m |

Using `hypot` would be a flat-grid approximation with sub-millimetre error at
this scale; the implementation uses the actual sphere distance anyway so that
reported lengths and tests agree exactly.

For the 200 m geographic grid, the metric spacing is computed per row from the
Mars radius and the local planetocentric latitude. No projected Earth formula
is reused.

---

## 4. Terrain-cost model

### 4.1 Formula

For each traversed edge:

```text
cost = distance
       × (1
          + uphill_weight   × min(tan(theta_up),   max_grade)
          + downhill_weight × min(tan(theta_down), max_grade)
          + cross_slope_weight × (max_endpoint_horn_slope / reference_slope)²)
```

- `distance` is the Mars great-circle edge length in metres.
- `theta_up` / `theta_down` are signed directional grades from endpoint
  elevation differences: `atan(dz / distance)`.
- `max_endpoint_horn_slope` is the steeper Horn 3 × 3 cell slope at the two
  endpoints, in degrees.
- Cost has units of **equivalent horizontal metres**. It is nonnegative.
- With every weight at zero, the model reduces exactly to ground distance.

### 4.2 Default parameters

| Parameter | Default | Meaning |
| --- | --- | --- |
| `uphill_weight` | 3.0 | Multiplier on uphill tangent |
| `downhill_weight` | 0.75 | Multiplier on downhill tangent |
| `cross_slope_weight` | 0.5 | Quadratic penalty for steep cell slope |
| `slope_reference_deg` | 20.0° | Normalisation scale for cross-slope term |
| `max_grade_tangent` | 3.0 | Clamp on directional grade contribution |

These are **documented algorithmic preferences**, not validated EVA
physiology, metabolic rates, oxygen consumption, battery drain, or safety
thresholds. The repository contains no certified astronaut-safe slope value,
so no such threshold is invented. The penalty is continuous; no cell is
declared safe or unsafe by crossing an arbitrary slope boundary.

Configuration validation rejects negative weights, non-finite values, a
non-positive reference slope, and a non-positive grade clamp.

---

## 5. Pathfinding implementation

| Aspect | Implementation |
| --- | --- |
| Graph | 8-connected raster grid over routeable numeric-DEM cells |
| Algorithm | A* with a great-circle ground-distance heuristic |
| Correctness oracle | Dijkstra mode (`use_heuristic=False`) for tests |
| Heuristic | Admissible and consistent because every edge cost is ≥ its ground distance |
| Determinism | Fixed neighbour order; heap key `(f, h, row-major cell index)`; repeated runs identical |
| Diagonal cost | Mars great-circle distance between diagonal cell centres |
| Nodata | Blocked; no interpolation, filling, smoothing, or invented obstacles |
| Slope support | A cell is routeable only when all nine 3 × 3 elevation posts are valid |
| Start/goal validation | Out-of-bounds, invalid start, invalid goal, and same-cell requests return explicit results |
| Failure structure | `unreachable`, `expansion_limit`, `start_cell_invalid`, `goal_cell_invalid`, snap failures; no partial path or straight-line substitute |
| Geometry | Actual graph nodes in order; no Bézier, spline, or offset-line post-processing |

### 5.1 Waypoint handling

Waypoints are supplied as ordered `[longitude_east, latitude_planetocentric]`
pairs. Each waypoint is snapped to the nearest routeable cell within an explicit
bound:

- Default maximum snap distance: 100 m.
- Hard maximum: 250 m.
- Output records requested coordinate, snapped coordinate, snap distance, snap
  reason, inside/outside declared extent, and grid cell.
- A waypoint that cannot be placed within the bound yields a structured
  `unavailable` result. It is never silently moved by hundreds of metres.

Segments are routed in the supplied order. If any segment fails, the full route
is reported as `unavailable` with the failed segment index and reason; no
segment is replaced by a straight line.

---

## 6. Real-data route examples

Demonstration inputs are recorded Curiosity traverse positions from
`public/maps/gale/curiosity-traverse.geojson`. They are **demonstration
coordinates**, not certified mission targets, science-target coordinates, or
evidence of astronaut traversability.

| Label | Coordinate `[lon, lat]` | Role |
| --- | --- | --- |
| A | `[137.4416330, -4.5894670]` | Recorded traverse start |
| B | `[137.4010487, -4.6347708]` | Recorded position about 6 km along the traverse |
| C | `[137.3891532, -4.8256778]` | Recorded traverse end |

### 6.1 Direct segment A → B, primary 30 m DEM

| Metric | Shortest | Lower terrain cost |
| --- | --- | --- |
| Status | `unverified` | `unverified` |
| Path distance | 3,658.62 m | 3,658.62 m |
| Straight-line distance | 3,584.92 m | 3,584.92 m |
| Detour ratio | 1.0206 | 1.0206 |
| Ascent | 66.69 m | 50.82 m |
| Descent | 37.47 m | 21.60 m |
| Maximum edge grade | 6.81° | 5.31° |
| Mean edge grade | 1.63° | 1.13° |
| Maximum Horn cell slope | 8.79° | 6.73° |
| Terrain cost | 3,658.62 equivalent m | 3,863.23 equivalent m |
| Mean terrain penalty | 1.0000 | 1.0559 |
| Path samples | 90 | 90 |
| Expanded nodes | 1,189 | 2,515 |
| Waypoint snaps | 5.554 m / 11.471 m | 5.554 m / 11.471 m |
| Runtime, both alternatives | 0.11 s | — |

### 6.2 Full traverse A → C, primary 30 m DEM

| Metric | Shortest | Lower terrain cost |
| --- | --- | --- |
| Status | `unverified` | `unverified` |
| Path distance | 15,294.62 m | 15,319.76 m |
| Straight-line distance | 14,350.92 m | 14,350.92 m |
| Detour ratio | 1.0658 | 1.0675 |
| Ascent | 1,208.04 m | 1,058.58 m |
| Descent | 160.00 m | 10.53 m |
| Maximum edge grade | 25.27° | 17.70° |
| Mean edge grade | 5.07° | 3.97° |
| Maximum Horn cell slope | 22.89° | 15.88° |
| Terrain cost | 15,294.62 equivalent m | 19,288.97 equivalent m |
| Mean terrain penalty | 1.0000 | 1.2591 |
| Path samples | 468 | 468 |
| Expanded nodes | 50,243 | 120,512 |
| Waypoint snaps | 5.554 m / 18.223 m | 5.554 m / 18.223 m |
| Runtime, both alternatives | 5.8 s | — |

### 6.3 Three-waypoint demonstration A → B → C

Committed in `data/routing/gale/examples/gale-demo-alternatives.json`:

| Metric | Shortest | Lower terrain cost |
| --- | --- | --- |
| Path distance | 15,295.05 m | 15,319.82 m |
| Summed straight-line legs | 14,947.60 m | 14,947.60 m |
| Ascent | 1,143.42 m | 1,070.59 m |
| Descent | 95.37 m | 22.55 m |
| Maximum edge grade | 28.37° | 17.70° |
| Mean edge grade | 4.59° | 4.06° |
| Path samples | 468 | 468 |
| Expanded nodes | 14,369 | 89,969 |

### 6.4 Coarse 200 m regional comparison A → B

| Metric | Value |
| --- | --- |
| Dataset | `gale-hrsc-mola-200m` |
| Status | `unverified` |
| Path distance | 3,788.65 m |
| Ascent | 47.0 m |
| Path samples | 15 |
| Runtime | 0.01 s |

The 200 m result is deliberately **not** compared as if it were a higher-quality
version of the 30 m route. It demonstrates that the same engine runs on the
separate coarse product and reports its own dataset identity and limitations.

---

## 7. Shortest versus lower-cost comparison

| Request | Distance Δ | Ascent Δ | Maximum edge-grade Δ | Outcome |
| --- | --- | --- | --- | --- |
| A → B | +0.01 m | −15.86 m | −1.50° | Different geometry, effectively equal length |
| A → C | +25.14 m | −149.47 m | −7.57° | 25 m longer, 149 m less ascent |
| A → B → C | +24.77 m | −72.83 m | −10.67° | 25 m longer, 73 m less ascent |

Both columns are produced by genuine A* searches on the same graph, validity
mask, snapping tolerance, and DEM. They are not offsets of one line.

The lower-terrain-cost objective minimises the documented terrain cost, not the
single worst edge. On shorter requests the same total distance can be achieved
with a different sequence of cells, so the path geometry differs while length
is essentially unchanged. A lower-cost route can occasionally contain a higher
maximum edge grade than the shortest route, because cumulative ascent, mean
grade, and cross-slope penalties are part of the objective. Maximum grade is a
diagnostic, not the optimised quantity.

When both objectives select exactly the same path, `route_alternatives` returns
that same path with `comparison.equivalent: true` and an explanation. It never
manufactures an artificial second route.

---

## 8. Coverage and nodata handling

### 8.1 Primary 30 m crop

- Grid: 293 columns × 545 rows = 159,685 posts.
- All 159,685 elevation posts are valid numeric values.
- 158,013 cells (98.95%) have a complete 3 × 3 Horn neighbourhood and are
  routeable.
- The outer one-cell ring has no full slope support and is blocked.
- Measured ground area of routeable cells: 141.733 km².
- Elevation: −4,530.00 to −2,641.22 m.
- Horn slope: 0.00° to 27.30°, mean 5.83°.

### 8.2 Secondary 200 m crop

- Grid: 179 × 238 = 42,602 posts, all valid.
- 41,772 routeable cells (98.05%).
- Measured ground area: 1,665.266 km².
- Elevation: −4,635 to 179 m.
- Horn slope: 0.00° to 32.30°, mean 6.36°.

### 8.3 Policy

- The GeoTIFF nodata value `-32768.0` and any non-finite value are invalid.
- A cell is routeable only when all nine elevation posts in its Horn
  neighbourhood are valid.
- No nodata cell is filled, interpolated, smoothed, or assumed traversable.
- Cells outside the declared crop are blocked. The coverage rectangle is not
  treated as proof of valid terrain everywhere.
- No boulder, sand, rock-abundance, scarp, or obstacle layer is invented from
  elevation. No roughness or mapped-obstacle dataset was available.
- Route geometry is checked against the declared extent by the TypeScript
  adapter.

Coverage statements apply only to the audited regional crops. They are not a
claim of whole-Gale coverage.

---

## 9. Geographic registration limitations

The DEMs are registered to the MOLA/Mars 2000 global frame. Precise local
co-registration between the DEM and the CTX optical basemap is **not verified**.

- The G3.2 audit documents unstable image-search maxima and no accepted local
  shift.
- The G4 registration gate states that pixel-level CTX co-registration is not
  verified and operational routing is not allowed.
- No shift was fitted to make routes match the optical basemap.
- Published DEM coordinates were retained unchanged.
- Every route reports `registrationVerified: false` and
  `evidence.registration.status: "UNVERIFIED"`.

Consequently every computed Gale route has `status: "unverified"`. The value
`computed` is reserved for a future state in which source, processing, **and**
registration evidence are all verified. A correct graph search does not upgrade
registration confidence.

Routes must not be used for fine-feature matching, hardware command sequences,
or operational navigation.

---

## 10. Scientific uncertainty

Evidence is tracked separately:

| Evidence domain | State | Basis |
| --- | --- | --- |
| Source DEM | `VERIFIED` | Published product identity, numeric band, checksum, CRS, extent |
| Processing | `VERIFIED` | Deterministic slope, metric spacing, graph search, synthetic and real-DEM tests |
| Registration | `UNVERIFIED` | Local DEM-to-CTX alignment not certified; no shift fitted |
| Hazards | `NOT_EVALUATED` | No verified roughness, sand, rock, boulder, or obstacle dataset |
| Resource model | `NOT_EVALUATED` | No physiology, oxygen, or battery model in this branch |

Each route also carries:

- Source dataset ID, checksum, nominal posting, effective Horn support.
- Actual valid coverage, missing-terrain policy, and nodata policy.
- Processing limitations and warnings.
- A statement that the result is not a safety or feasibility certification.
- A statement that ascent/descent are DEM differences, not rover odometry.
- A statement that cost weights are algorithmic preferences, not EVA
  physiology.

The engine never labels a route `safe`, `feasible`, or `traversable`.

---

## 11. Tests and results

### 11.1 Python tests

Command:

```powershell
python -m unittest discover -s tests -p "test_gale_*.py"
```

Result: **51 tests passed** (41 new routing tests plus the 10 pre-existing Gale
DEM/registration tests), in about 1.5 s.

`tests/test_gale_routing.py` covers:

| Area | Cases |
| --- | --- |
| Mars geodesy | Haversine, longitude normalisation, `cos(latitude)` metric scaling |
| Slope | Horn 3 × 3 tilted plane, nine-post validity, nodata exclusion |
| Cost model | Nonnegative validation, flat/uphill/downhill ordering, grade clamp, description |
| Flat terrain | Exact diagonal graph distance and deterministic path |
| Uphill/downhill | Correct ascent, descent, net elevation, cost ordering |
| Steep penalties | Real detour around a 60 m synthetic hill |
| Detours | Valid gap around a partial nodata barrier |
| Barriers | Solid nodata barrier, enclosed goal, structured `unreachable` |
| Out of coverage | Bounded snap, rejected far-away waypoint, no straight-line fallback |
| Diagonals | Every step diagonal, exact Mars great-circle edge length |
| Determinism | Repeated A* equality; A* vs Dijkstra cost equality |
| Waypoints | Ordered multi-leg route, role order, via before destination |
| Snapping | Offset point, explicit requested/snapped pair, distance bound |
| Preferences | Shortest vs lower-cost geometry and cost |
| Failures | Expansion limit, invalid endpoints, invalid coordinates, failed segment |
| Authentic DEM | 158,013 routeable cells, 141.733 km², real 3.6 km routes, alternatives, determinism, A* vs Dijkstra |
| Coarse DEM | 41,772 cells, 1,665.266 km², 200 m disclaimer, dataset separation |
| Loader validation | Checksum mismatch, Earth CRS, rotated affine |

### 11.2 TypeScript adapter tests

Command:

```powershell
npx tsx --test tests/gale-routing.test.ts
```

Result: **12 tests passed** in about 0.5 s.

Coverage includes schema validation of both committed route examples and the
alternatives document, shared-shape conversion, explicit app-coordinate
conversion, authoritative terrain distance, refusal to substitute straight-line
distance on failure, geometry/segment continuity, extent containment,
non-straight-line real geometry, honest alternatives comparison, invalid-input
rejection, GeoJSON conversion, integration notes, and parse determinism.

### 11.3 Typecheck and lint

| Command | Result |
| --- | --- |
| `npm run typecheck` (`next typegen && tsc --noEmit`) | Passed |
| `npm run lint` (`eslint .`) | Passed with no errors or warnings |

### 11.4 Build

| Command | Result |
| --- | --- |
| `npx next build --webpack` | Passed: compilation, TypeScript, page data, static generation |
| `npm run build` (default Turbopack) | Blocked by the isolated worktree's `node_modules` junction to `D:\martian-map\node_modules`, which lies outside Turbopack's workspace root. This is an environment setup artifact, not an application-code failure. |

The webpack build produced the expected `/`, `/_not-found`, and `/icon.svg`
routes. No shared planner, map, science, environment, mission, or contract file
was modified.

### 11.5 Reproduction

```powershell
# Rebuild the compact routing crops from authentic G4 rasters
python -m team.gale.routing.prepare_routing_data `
  --source-dir "D:\martian-map-gale-terrain\output\g4\raw"

# Audit and compute the committed examples
python -m team.gale.routing.cli audit --out data\routing\gale\audit.json
python -m team.gale.routing.cli demo

# Tests
python -m unittest discover -s tests -p "test_gale_*.py"
npx tsx --test tests/gale-routing.test.ts
npm run typecheck
npm run lint
npx next build --webpack
```

The preparation script refuses to write into its own source directory and never
modifies the raw scientific rasters.

---

## 12. Modified files

### 12.1 Route engine (Python)

| File | Purpose |
| --- | --- |
| `team/gale/routing/__init__.py` | Public engine exports |
| `team/gale/routing/terrain.py` | Mars haversine, longitude normalisation, Horn 3 × 3 slope, directional grade |
| `team/gale/routing/grid.py` | Checksum-verified GeoTIFF loading, CRS/affine checks, metric spacing, diagonal spacing, bounded snapping |
| `team/gale/routing/cost.py` | Configurable nonnegative terrain-cost model |
| `team/gale/routing/search.py` | Deterministic A*/Dijkstra, admissible heuristic, path statistics |
| `team/gale/routing/engine.py` | Ordered waypoint route, alternatives, structured failures, evidence |
| `team/gale/routing/datasets.py` | Two-product registry; no blending |
| `team/gale/routing/prepare_routing_data.py` | Reproducible crop/manifest generation |
| `team/gale/routing/cli.py` | `audit`, `route`, `alternatives`, `demo` commands |
| `team/gale/routing/service.py` | Optional FastAPI boundary |
| `team/gale/routing/requirements-routing.txt` | Core and optional HTTP dependencies |

### 12.2 TypeScript adapter

| File | Purpose |
| --- | --- |
| `lib/routing/gale/types.ts` | Zod schemas, regional types, locally mirrored shared `RouteResult` shape |
| `lib/routing/gale/adapter.ts` | Parse/validate, shared conversion, mission summary, app coordinates, geometry diagnostics |
| `lib/routing/gale/index.ts` | Stable import surface |

### 12.3 Data

| File | Purpose |
| --- | --- |
| `data/routing/gale/gale-hrsc-30m-routing.tif` | Compact numeric 30 m routing crop |
| `data/routing/gale/gale-hrsc-mola-200m-routing.tif` | Compact numeric 200 m routing crop |
| `data/routing/gale/dataset-manifest.json` | Provenance, checksums, measured coverage, limits |
| `data/routing/gale/audit.json` | Audited dataset metadata and measured statistics |
| `data/routing/gale/examples/gale-demo-route-shortest.json` | Real shortest route example |
| `data/routing/gale/examples/gale-demo-route-lower-terrain-cost.json` | Real lower-cost route example |
| `data/routing/gale/examples/gale-demo-alternatives.json` | Three-waypoint two-objective example |

### 12.4 Tests and documentation

| File | Purpose |
| --- | --- |
| `tests/test_gale_routing.py` | Synthetic correctness plus authentic-DEM tests |
| `tests/gale-routing.test.ts` | Adapter, contract, evidence, and geometry tests |
| `docs/GALE_TERRAIN_ROUTING_REPORT.md` | This report |

No file outside `lib/routing/gale/**`, `team/gale/routing/**`,
`data/routing/gale/**`, the two Gale routing test files, and this report was
modified.

---

## 13. Shared integration requirements

The Python engine already emits the minimum shared contract fields:

```ts
type RouteResult = {
  regionId: "gale" | "jezero";
  status: "computed" | "unverified" | "unavailable";
  preference: "shortest" | "lower-terrain-cost";
  coordinates: [number, number][];
  distanceMeters: number | null;
  ascentMeters: number | null;
  descentMeters: number | null;
  maximumSlopeDegrees: number | null;
  meanSlopeDegrees: number | null;
  sourceDatasetIds: string[];
  sourceVerified: boolean;
  processingVerified: boolean;
  registrationVerified: boolean;
  warnings: string[];
};
```

`lib/routing/gale/types.ts` mirrors this shape locally without editing the
shared contract. `lib/routing/gale/adapter.ts` provides:

- `parseGaleRoute` / `parseGaleRouteJson` — schema and evidence-consistency
  validation.
- `toSharedRouteResult` — exact mapping to the minimum shared shape.
- `summariseMissionRoute` — route plus per-leg geometry, authoritative terrain
  distance, ascent/descent, evidence, terrain model, and warnings.
- `toAppCoordinate` / `toAppCoordinates` — explicit
  `[longitude, latitude] → { latitude, longitude_east }` conversion.
- `diagnoseRouteGeometry` — segment continuity, sample count, endpoint,
  waypoint order, distance-sum, and extent checks.
- `toGeoJsonLineString` — map-ready geometry in `[lon, lat]` order.

Required shared-engine changes, to be made on the integration branch:

1. Consume `distanceMeters` from the terrain route whenever status is
   `computed` or `unverified`.
2. Do not keep the geometric straight-line distance authoritative after a
   terrain route exists.
3. Consume ascent/descent as DEM-derived sums, not surveyed rover odometry.
4. Drive timeline progression from per-segment geometry; never resample across
   a failed segment.
5. Propagate the three evidence flags and warnings into mission-level displays.
6. Keep oxygen, battery, radiation, and metabolic coefficients in the shared
   resource engine. This branch defines none.
7. Surface structured failures instead of drawing or measuring a straight-line
   substitute.

The existing shared timeline/resource engines and UI were not modified.

---

## 14. Remaining limitations

1. **Registration is unverified.** Local DEM-to-CTX alignment is not certified;
   no shift was applied. Route status remains `unverified`.
2. **Posting is not effective resolution.** 30 m grid spacing does not guarantee
   30 m resolving power. Horn 3 × 3 slope has approximately 90 m support and
   smooths boulders, small scarps, sand traps, and suit-scale obstacles.
3. **No hazard layer.** No verified roughness, sand, rock-abundance, boulder, or
   mapped-obstacle dataset was available. Elevation and slope do not prove a
   passage is free of physical hazards.
4. **No quantitative DEM error model.** Horizontal/vertical accuracy and slope
   error are not propagated per pixel. Ascent and descent are raw sums of DEM
   differences and include noise.
5. **Limited coverage.** The 30 m crop covers the audited Gale exploration
   footprint plus a 1 km derivative buffer, not all of Gale Crater. Outside it,
   terrain is not represented.
6. **The 200 m product is coarse.** Its gradient support is about 600 m. It is a
   regional comparison only and must not be blended into the 30 m grid.
7. **Cost weights are preferences.** They are not validated EVA physiology,
   metabolic cost, oxygen use, battery drain, or safety thresholds.
8. **Maximum grade is diagnostic.** A lower-terrain-cost route can contain a
   higher single-edge grade while reducing cumulative ascent and mean slope.
9. **Graph discretisation.** 8-connected paths are typically 2–7% longer than
   the great-circle chord on these requests. The geometry is the actual graph
   result; it is not smoothed into a fabricated curve.
10. **Snapping is bounded.** The default bound is 100 m and the hard bound is
    250 m. Requests farther from valid terrain fail explicitly.
11. **Runtime.** A full two-objective traverse request took about 6 s on the
    development machine. This is not a real-time navigation service.
12. **No weather, radiation, or resource modelling.** Those remain outside this
    milestone and outside this branch.
13. **Synthetic tests are not Mars data.** They are algorithm oracles only and
    are labelled as such.

---

## 15. Final commit SHA

Final implementation commit: `TO_BE_RECORDED_AFTER_COMMIT`.

The commit that introduces this report is the implementation commit. A
follow-up documentation commit records its SHA and the push status; the branch
HEAD therefore advances without changing any code or data. This avoids the
impossibility of a commit containing its own hash.

---

## 16. Push status

Push status at report drafting: **not yet pushed**.

The branch is pushed normally to `origin/feat/gale-terrain-routing` after the
documentation metadata commit. No force-push, no merge into shared branches, and
no rebase of other agents' work is performed.

Final push confirmation is recorded in the follow-up documentation commit and
in the hand-off message.
