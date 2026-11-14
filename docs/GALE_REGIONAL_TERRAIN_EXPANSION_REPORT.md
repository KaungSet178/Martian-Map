# Marswalk Planner — G4 Milestone Technical Report
## Gale Regional Terrain Coverage Expansion: Elevation, Hillshade, and Slope

**Document Reference:** `docs/GALE_REGIONAL_TERRAIN_EXPANSION_REPORT.md`  
**Milestone:** G4 — Gale Regional Terrain Coverage Expansion  
**Integrated Development Branch:** `feat/gale-terrain-expansion`  
**Target Remote Branch:** `origin/feat/gale-terrain-expansion`  
**Verified Baseline Commit:** `a5809dad9ed0f52c0604f3a00c327b666d8d95e2`  
**Date:** November 14, 2026  

---

### Executive Summary

Milestone G4 expands scientific terrain visualization across the Curiosity / Lower Mount Sharp exploration footprint in Gale Crater from a localized **1.04%** subset to **100.00% continuous real-data terrain coverage**, without new gap filling by the Marswalk derivative pipeline. Display reprojection uses nearest-neighbor resampling, and the upstream stereo reconstruction and blended source are not claimed to contain zero interpolation. See the combined integration report for measured validity and the corrected global-source affine.

Using published 30 m HRSC stereo photogrammetry (Persaud et al., 2021; DOI: 10.5281/zenodo.5808354) as the primary regional candidate and official USGS HRSC–MOLA 200 m blended elevation (Fergason et al., 2018) as the secondary fallback, Marswalk Planner now serves authentic elevation, hillshade, and slope overlays across the full **96.26 km²** Gale overview footprint (`137.344235°` to `137.457943° E`, `-4.822361°` to `-4.580605° N`).

All products preserve the Mars 2000 sphere reference frame ($R = 3,396,190\text{ m}$), planetocentric latitude, east-positive longitude, and the MOLA areoid vertical datum. Co-registration against the optical CTX mosaic remains formally qualified with scientific disclaimers in accordance with project safety guidelines.

---

### 1. Scientific Objectives

1. **Continuous Real-Data Terrain Coverage:** Eliminate artificial terrain boundaries across the Curiosity exploration corridor while refusing to invent missing data.
2. **Multi-Resolution Provenance Isolation:** Retain distinct, un-blended layers for local high-detail PDS DEM (1 m native, 25 m analysis), regional HRSC (30 m grid), and global HRSC–MOLA fallback (200 m grid), preventing false claims of uniform spatial resolution.
3. **Geodetically Sound Surface Derivations:** Calculate metric slope and artificial illumination using exact Martian horizontal metric scaling ($\Delta x = R_{\text{Mars}} \cdot \Delta\lambda_{\text{rad}} \cdot \cos(\phi_{\text{rad}})$).
4. **Transparent Boundaries & NoData Integrity:** Ensure outer boundaries and unsupported regions render transparently with zero synthetic edge bleeding.
5. **Non-Operational Exploration Gate:** Qualify all terrain layers with explicit scientific warnings ("CTX alignment unverified; not for astronaut hazard routing or traversability certification").

---

### 2. Source Datasets & Provenance

| Parameter | Primary Regional Candidate | Secondary Global Fallback | Existing Local DEM |
| :--- | :--- | :--- | :--- |
| **Product Name** | 30-m HRSC DTM Mosaic of Gale Crater | USGS HRSC–MOLA Blended DEM Global 200m v2 | PDS PLACES v42.0 Orbital DEM Subset |
| **Dataset Identifier** | `hrsc_km09_h1938_h1927_h1916-dtm-mosaic.tif` | `Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif` | `msl_orbital_dem.xml` (PDS PLACES v42.0) |
| **Publisher / Agency** | ESA / DLR / Freie Universität Berlin / NASA JPL | USGS Astrogeology Science Center / NASA / ESA | NASA / JPL-Caltech / USGS Localization |
| **Citation / DOI** | Persaud, D. M., Putri, A. D. R., and Muller, J.-P. (2021), DOI: `10.5281/zenodo.5808354` | Fergason, Hare, and Laura (2018), PDS Annex | PLACES SIS Section 3.9.3 |
| **Published File Size** | 311,785,221 bytes (311.8 MB) | 11,384,463,908 bytes (11.38 GB global) | 28,311,552 bytes (bounded row range) |
| **Source Checksum** | MD5: `1d714f2142a56e962d50d985b7088b13` | BigTIFF IFD Header verified | SHA-256 verified |
| **Access Method** | Direct Zenodo download with range resume | Bounded window extraction via HTTP Range | PDS row-range HTTP Range request |
| **Native Spacing** | 30 m / pixel | 200 m / pixel | 1 m posting |
| **Analysis Support** | 30 m grid / 90 m gradient support | 200 m grid / 600 m gradient support | 25 m mean / 75 m gradient support |
| **Reference Datum** | MOLA areoid (metres, positive up) | MOLA areoid (metres, positive up) | MOLA areoid (metres, positive up) |
| **Projected CRS** | Equidistant Cylindrical (`ESRI:103885`, $R=3,396,190\text{ m}$) | Mars 2000 Sphere (`ESRI:104971`, degrees) | Equirectangular ($R=3,396,190\text{ m}$) |

---

### 3. Geographic Scope & Measured Coverage

The configured Gale Overview exploration footprint remains strictly preserved:
- **West:** `137.3442352329006° E`
- **East:** `137.4579431096443° E`
- **South:** `-4.822361175063087° N`
- **North:** `-4.580605407446296° N`
- **Planar Surface Area:** $\approx 96.26\text{ km}^2$ (spherical footprint area; not a positional-accuracy measure)

#### Independently measured integration coverage

| Product | Valid source-grid coverage of configured overview | Buffered derived cells |
| --- | --- | --- |
| PDS local subset | approximately 1.04% | 1,600 |
| Regional HRSC 30 m | 100% | 158,013 |
| Global HRSC–MOLA nominal 200 m | 100% | 41,772 |

These percentages are spherical-area intersections of actual native and derivative masks with the configured overview. Buffered cell counts are not counts of cells wholly inside the overview. Display coverage is independently audited from every tile over HTTP. No pipeline gap filling is applied; nearest-neighbor display reprojection/resampling and source-authored stereo reconstruction/blending are explicitly retained. Native-grid validity does not establish uniform observational resolution or independent optical alignment.

The integration audit found that the global extractor substituted 360/106694 for the actual GeoTIFF pixel step 0.003374120830641 degrees. The copied subset metadata and global derivatives are corrected to the actual source affine after 537 native DN values in three distributed rows matched the original TIFF. Original native values and integer source window are preserved. This correction is computational source correspondence, not an optical registration fit.

---

### 4. Terrain Derivation Mathematics

Derivations run offline via reproducible scientific Python routines (`team/gale/dem_math.py`, `team/gale/prepare_g4_terrain.py`).

#### Coordinate & Metric Scaling
Horizontal spacing on the equirectangular Mars sphere ($R_{\text{Mars}} = 3,396,190\text{ m}$) accounts for latitude convergence:
$$\Delta y = \Delta\phi_{\text{rad}} \cdot R_{\text{Mars}}$$
$$\Delta x = \Delta\lambda_{\text{rad}} \cdot R_{\text{Mars}} \cdot \cos(\phi_{\text{rad}})$$

#### Slope Derivation (Horn 3×3 Gradients)
Surface gradients in orthogonal directions are computed over a 3×3 moving window:
$$p = \frac{\partial z}{\partial x} = \frac{(z_{NE} + 2z_{E} + z_{SE}) - (z_{NW} + 2z_{W} + z_{SW})}{8 \cdot \Delta x}$$
$$q = \frac{\partial z}{\partial y} = \frac{(z_{NW} + 2z_{N} + z_{NE}) - (z_{SW} + 2z_{S} + z_{SE})}{8 \cdot \Delta y}$$
$$\text{Slope (degrees)} = \arctan\left(\sqrt{p^2 + q^2}\right) \cdot \frac{180}{\pi}$$

#### Artificial Illumination (Hillshade)
Artificial directional illumination uses no atmosphere, acquisition-time lighting, cast-shadow or vertical-exaggeration model:
- **Azimuth ($\theta$):** $315^\circ$ (Northwest)
- **Altitude ($\alpha$):** $45^\circ$
- **Illumination Model:**
$$\text{Hillshade} = \max\left(0, \frac{-p \sin\theta \cos\alpha - q \cos\theta \cos\alpha + \sin\alpha}{\sqrt{1 + p^2 + q^2}}\right)$$

#### Strict NoData & Edge Handling
All 9 posts in the 3×3 gradient window must be finite and valid. If any post is invalid or unobserved, the output cell is flagged invalid ($\alpha = 0$). Gaps are never bridged with bilinear or spline interpolation.

---

### 5. Multi-Resolution Hierarchy & Visual Design

To maintain strict scientific provenance, different sensors are never averaged or numerically spliced into a pseudo-seamless DEM. Instead, distinct layer entries allow users to compare sensors:

#### Regional HRSC 30 m Products
- **`gale-regional-elevation`**: Discrete elevation classes relative to the MOLA areoid; elevation does not identify lithology:
  - `< −4400 m`: `#425A78` (Lowest elevation class)
  - `−4400 to < −4200 m`: `#587E91` (Lower elevation terrain)
  - `−4200 to < −3900 m`: `#87A39D` (Intermediate elevation terrain)
  - `−3900 to < −3500 m`: `#BCB29C` (Higher elevation terrain)
  - `≥ −3500 m`: `#C8A97E` (Highest elevation class)
- **`gale-regional-hillshade`**: 30 m grid artificial illumination highlighting canyon walls, channel scarps, and yardang crests.
- **`gale-regional-slope`**: 30 m grid terrain inclination classes ($0-5^\circ, 5-10^\circ, 10-15^\circ, 15-20^\circ, \ge 20^\circ$).

#### Global HRSC–MOLA 200 m Products
- **`gale-global-elevation`**, **`gale-global-hillshade`**, **`gale-global-slope`**: Regional baseline providing crater-scale context.

#### Local PDS 1 m / 25 m Products
- **`gale-terrain`**, **`gale-hillshade`**, **`gale-slope`**: Local 1 km subset retained at 25 m analysis support from a 1 m source grid; uniform native 1 m detail is not claimed.

#### UI Interaction & Mutual Exclusivity
In `lib/map/region-layers.ts`, selecting any thematic terrain or geology layer automatically clears previous non-optical layers while retaining the CTX optical mosaic and Curiosity rover traverse underneath. This prevents legend collision and conflicting vertical datums.

---

### 6. Static Tile Generation & Performance

Tiles are prerendered as compact, transparent Web Mercator PNGs (`256×256`) for zoom levels 5 through 13.

- **Tile Sampling:** Direct inverse Mercator projection ($px \to \lambda, py \to \phi$) with nearest-neighbor sampling. Zero arbitrary coordinate shifts.
- **Asset Footprint:**
  - Regional HRSC 30 m: 210 tiles total (539.5 KB)
  - Global HRSC–MOLA 200 m: 1,305 tiles total (1,225.7 KiB)
  - Combined tile assets: ~1.77 MB
- **Network Performance:** Small static assets are served locally. No universal latency or zero browser-CPU claim is established; decoding, resampling and compositing consume client resources. Combined HTTP hashes and browser measurements are recorded in the integration report.

---

### 7. Geological Map Investigation (G4.7)

In accordance with Section 14, broader geological GIS products were surveyed:

1. **USGS SIM 3292 (Tanaka et al., 2014):**
   - Global 1:20,000,000 scale geological map of Mars.
   - Database reviewed (`sim3292_database.zip`, 771.4 MB).
   - *Finding:* Gale Crater comprises only 1–2 broad, undifferentiated regional units (Hesperian transition and crater floor material). It lacks the resolution necessary to distinguish Mount Sharp stratigraphic members along Curiosity's path.
2. **Zenodo 5808381 (Persaud, 2021):**
   - Multi-resolution basemap of Northwest Aeolis Mons.
   - *Finding:* Contains CRISM mineralogical raster ratio maps (hydrated sulfates, mafics, phyllosilicates) and HiRISE image strips rather than classified geological contact polygon layers.
3. **Conclusion & Recommendation:**
   - The peer-reviewed Joel Davis (2025/2026) Arc Pass local geological mapping layer (`gale-geology`) is retained unchanged. Unit boundaries are preserved without artificial spatial stretching.

---

### 8. Scientific Registration Gate Status

Independent local DEM-to-CTX and DEM-to-USGS-color registration remains unverified. No quantitative local positional bound is established. The previously asserted 20–50 m range and causal attribution were unsupported and are withdrawn. The combined audit separately found and repaired a source-affine transcription error in the derived global subset; that computational correction is not an optical co-registration validation.

- **Gate Decision:** Regional terrain visualization is permitted with mandatory visual warnings.
- **Operational Route Planning:** Geometric great-circle planning remains uncoupled from terrain elevations.
- **Hazard Scoring:** No automated suit-hazard scores or traversability certifications are generated.
- **Scientific Caveat Display:** All terrain layers explicitly state: *"CTX alignment unverified. Broad baseline does not resolve suit-scale hazards."*

---

### 9. Verification & Test Summary

All automated test suites pass with 100% success:

1. **Node.js / TypeScript Test Suites (`npm test` & `npx tsx --test`):**
   - **51 top-level tests, 160 passing tests (0 failures, 0 regressions).**
   - Covers geodesy, waypoint planning, UI components, bridge serialization, region contracts, layer schema validation, and G4 multi-resolution integrity.
2. **Python Scientific Test Suites (`unittest`):**
   - **16 tests passing across 3 suites.**
   - Covers analytical slope derivatives, illumination dot products, Mars metric scaling, NoData erosion, and USGS raster integrity (`tests/test_gale_terrain.py`).
3. **TypeScript & Linter Checks:**
   - `npm run typecheck`: Passed with 0 errors (`next typegen && tsc --noEmit`).
   - `npm run lint`: Passed with 0 errors, 0 warnings (`eslint .`).
4. **Production Build:**
   - `npm run build`: Successfully compiled with Next.js Turbopack in 6.4s.
5. **Playwright End-to-End Browser Tests:**
   - **53 tests passing across 8 spec suites.**
   - Includes dedicated `tests/browser/gale-regional-terrain.spec.ts` validating visibility toggles, opacity adjustments, tile loading, legends, and accessibility (`axe-core`, 0 violations).

---

### 10. Delivery & Repository Status

- **Feature Branch:** `feat/gale-terrain-expansion`
- **Remote Target:** `origin/feat/gale-terrain-expansion`
- **Isolation Preserved:** Work remained strictly isolated in `D:\martian-map-gale-terrain`. No modifications were made to `main`, `feat/gale-map`, or concurrent G5 worktrees.
- **Hosting Limits Respected:** Oversized raw global rasters reside in ignored `output/` directories. Only lightweight, optimized tile assets (<2 MB) and verified metadata are staged for Git delivery.
