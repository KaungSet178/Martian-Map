# G2 — Science evidence and Curiosity photographs

13 November 2026 · `feat/gale-map` · baseline `6a773a5` · dataset `gale-g2-v1`.

Four documented science areas now have Curiosity photographs and visible provenance
in the shared target dialog. Scientific context and photographic association are
verified against the sources below. Precise sampling/observation points and
geological boundaries remain unverified. No new markers or polygons are rendered.

The [machine-readable evidence register](G2_EVIDENCE_REGISTER.json) contains source
references, per-area coordinates/boundary/CRS/coverage findings, observation context,
image metadata, exact NASA download URLs, dimensions, byte counts and SHA-256 hashes.

## Target verification

| Area | Source-backed science context | Point and boundary outcome |
| --- | --- | --- |
| Glen Torridon | NASA associates PIA23047 with clay-rich exploration. USGS correlates strata across GT and Vera Rubin Ridge. | No individual feature/sampling point selected. Published contact mapping exists; no georeferenced contacts retrieved and validated. |
| Vera Rubin Ridge | PIA21851 depicts stratified ridge rocks before ascent. Hematite detected from orbit; remote layering alone does not distinguish water from wind deposition. | Observer north of ridge is not a ridge coordinate. USGS describes contacts across the geomorphic divide; no validated polygon integrated. |
| Sulfate-bearing geological units | PIA26551 documents an observation from the unit. USGS identifies deposition, erosion and later alteration as contributors to the mineral transition. | Observer location does not locate every photographed rock/mineral. No validated unit-boundary GIS integrated. |
| Gediz Vallis | NASA identifies channel deposits in a distant Navcam view after the rover left the channel. | Gazetteer center and WKT polygon exist, but control network is UNKNOWN and suitability as geological-deposit boundaries remains unverified. No point or polygon rendered. |

**Verified:** four published science contexts, selected image identity, acquisition
metadata, credits and documented associations. **Unverified:** precise feature
points, sample sites, geological boundaries, positional accuracy and terrain
eligibility for all four. The three existing generic Gale objectives remain
scenarios; their stable IDs are preserved.

Named regions/units/channels are distinct from individual rocks, drill holes,
camera stations and sampling events. Proposed astronaut activity remains labeled
as proposed. Each photograph has an Observed badge, independent of the target's
pending location verification and unavailable routing.

## Source audit

- [NASA PIA23047](https://science.nasa.gov/photojournal/curiosity-on-the-clay-unit/): metadata and Glen Torridon association verified; page supplies no precise feature location or georeferenced boundary.
- [NASA PIA21851](https://science.nasa.gov/photojournal/looking-up-at-layers-of-vera-rubin-ridge-on-sol-1790/): pre-ascent ridge panorama, acquisition/instrument/processing verified. Its traverse-map reference is an observer location, not a mapped ridge boundary.
- [NASA PIA26551](https://science.nasa.gov/photojournal/curiosity-looks-downslope-from-the-sulfate-unit/): observer in sulfate-bearing terrain; view includes distant floor and rim. No mineral distribution inferred from colors.
- [NASA Sols 4327–4328 update](https://science.nasa.gov/blog/sols-4327-4328-on-the-road-again/): displayed image is Sol **4326**, acquired October 7, not the title's planning Sols or October 9 publication date.
- [USGS/Fedo et al., DOI 10.1029/2022JE007408](https://www.usgs.gov/publications/geology-and-stratigraphic-correlation-murray-and-carolyn-shoemaker-formations-across): mapped contacts/stratigraphy across GT/VRR. No machine-readable contacts validated here; figures were not traced into invented polygons or assigned an assumed CRS.
- [USGS/Meyer et al., DOI 10.1130/B37355.1](https://www.usgs.gov/publications/geological-context-and-significance-clay-sulfate-transition-region-mount-sharp-gale): deposition and later diagenesis both affect sulfate signatures. Page date June 2024 and publication-year field 2025 are recorded separately; neither is an image acquisition date. No validated GIS integrated.
- [USGS/IAU Gediz Vallis, Feature 15571](https://planetarynames.wr.usgs.gov/Feature/15571): explicitly planetocentric/+East/0–360, center −4.85°, 137.44° E, rounded limits and WKT available. Control network UNKNOWN. This is nomenclature extent, not demonstrated deposit contacts or a precise sampling point. No geometry conversion or rendering performed.
- [PDS PLACES v42.0 label](https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_localizations/localized_interp.csv.xml): explicitly planetocentric/east rover positions, not photographed-feature positions. Not substituted for targets.
- [PDS MSL inventory](https://pds-geosciences.wustl.edu/missions/msl/), [Notebook target definitions](https://an.rsl.wustl.edu/help/Content/Using%20the%20Notebook/Concepts%20and%20deep%20dive/Targets.htm) and [target table](https://an.rsl.wustl.edu/help/Content/Using%20the%20Notebook/Main%20sections/Mission/Science%20targets%20table.htm): individually defined feature targets exist, with MSL local XYZ/projected meter coordinates. No individual record with reviewed frame/transform/uncertainty and association has been selected for integration. Definition Sol may differ from observation Sol.

Additional research lead: Hughes (2022), *Geomorphic map of Glen Torridon*, DOI
`10.7936/0cyw-3n10`. Its indexed university catalog describes a dataset and CC BY
4.0 license. The current repository redirect could not be opened in this audit;
file contents, CRS and coverage remain unreviewed. It is not represented as
NASA/USGS/PDS-validated geometry or integrated into the app.

Unavailable in the app does not mean no public geometry exists. Photos are image
products without a georeferenced map CRS or quantified ground footprint. Canonical
point coordinates remain Mars planetocentric/east. Future geometry needs its
source frame, reference surface, footprint, resolution and registration reviewed
before the shared MapLibre display transform can be used. Photos display in
details; they do not enter MapLibre geographic sources.

## Photograph collection

| Area | NASA product | Acquisition | Instrument | Scientific caption and association | Attribution |
| --- | --- | --- | --- | --- | --- |
| Glen Torridon | PIA23047 | 2019-02-10 · Sol 2316 | Mastcam | Layered bedrock during exploration of the clay-rich area; explicit NASA association. | NASA/JPL-Caltech/MSSS |
| Vera Rubin Ridge | PIA21851 | 2017-08-19 · Sol 1790 | Right Mastcam | Thirteen-frame ridge stratification panorama before ascent. | NASA/JPL-Caltech/MSSS |
| Sulfate unit | PIA26551 | 2025-02-07 · Sol 4447 | Mastcam | Downslope view from the unit; no mineral claim for every visible surface. | NASA/JPL-Caltech/MSSS |
| Gediz Vallis | NLB_781532029EDR_F1091446NCAM00379M_ | 2024-10-07, 01:16:16 UTC · Sol 4326 | Left Navcam | Remote view including channel deposits from adjacent terrain. | NASA/JPL-Caltech |

Source URLs are the NASA pages above and accompany every image in the register
and UI. PIA identifiers are NASA presentation products, including mosaics, not
assertions of single calibrated PDS EDR/RDR identities. The Navcam ID is from
NASA's hosted raw-image filename; its independent PDS label/calibration was not
audited. NASA explicitly supplies its acquisition date, time, Sol and camera.

Four NASA-provided browse renditions total **705,526 bytes**, committed unchanged
under `public/photos/gale/`. Decoded dimensions: 1328×1184, 1536×221, 1536×251,
1024×1024. No local crop, recolor, resampling or AI processing. Next Image uses
`unoptimized` to preserve the audited bytes; CSS displays proportional scaling
with mosaic margins intact. PIA21851 is white-balanced and PIA26551 has NASA's
Earth-lighting adjustment. No additional calibration is claimed for the others.
Acquisition dates are distinct from publication/image-addition dates.

Limitations remain attached to every photograph: browse imagery is not a
georeferenced map, observer and subject locations differ, and association does
not establish a target point or boundary. Metadata, credit and source links remain
available if an image fails. [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)
and [JPL image policy](https://www.jpl.nasa.gov/jpl-image-use-policy/) are registered;
no logos or endorsement are used.

## Shared implementation and changed files

[Contract review](G2_CONTRACT_REVIEW.md) documents optional backward-compatible
fields and the deferred boundary contract. Existing mission v1 IDs, shared
registry and Jezero/Oxia data remain compatible. No breaking changes or external
developer approval are claimed.

Target details now show Geological area, Location unverified, location/boundary
explanations, a proportionally scaled image, acquisition date/Sol, instrument,
product, credit, association, and a native disclosure for processing/limitations.
Existing design tokens, dialog keyboard behavior, proposed activity and mission
actions are retained. No gallery, timeline or comparison feature was introduced.

Changed paths:

- `lib/contracts/science.ts`, `lib/contracts/region.ts`: optional fields and provenance checks.
- `components/science/catalog.tsx`, new `components/science/photograph.tsx`, `app/globals.css`: shared conditional details and image fallback.
- `regions/gale/config.ts`, `regions/gale/targets.ts`: audited sources, area metadata, photographs and dataset version.
- `public/photos/gale/*.jpg`: four NASA renditions.
- `tests/regions.test.ts`, `tests/browser/gale-science.spec.ts`, `tests/browser/planner.spec.ts`: evidence integrity, compatibility and responsive regressions.
- `team/gale/G2_EVIDENCE_REGISTER.json`, `G2_CONTRACT_REVIEW.md`, this report, `CONTEXT.md`, `screenshots/g2/`: audit and handoff.

## Verification

Passed on Windows with Node/npm and Chromium:

| Check | Result |
| --- | --- |
| `npm.cmd run lint` | Passed, no ESLint errors |
| `npm.cmd run typecheck` | Passed, Next type generation and TypeScript |
| `npm.cmd run build` | Passed, optimized production build |
| `npm.cmd test` | 17/17 unit, mission, renderer and contract tests passed |
| `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npx.cmd playwright test` | 31/31 browser tests passed |
| Original G1 asset hash comparison | All 33 imagery/traverse assets unchanged |
| New photo integrity | All four assets match registered hashes, byte counts and dimensions |
| `git diff --check` | Passed |

Browser coverage includes Gale, Jezero and Oxia isolation; legacy mission import,
save/reopen and dataset revalidation; keyboard/focus/Escape; accessibility;
source metadata and image loading for all four targets; image-failure fallback;
and responsive layouts at 1440×900, 1024×768, 768×1024 and 390×844.
Existing viewport tests exercise actual rendered imagery containment, repeated
fit/resize, drag pan, wheel/control zoom, keyboard navigation, mobile touch drag
and pinch through Chromium CDP. Screenshots are retained under
`team/gale/screenshots/g2/`. Tests verify software behavior, not Mars survey
accuracy, scientific calibration or navigation safety.

After the final shared source-link wording update, the five G2 browser tests and
lint/build were run again and passed. Source-link labels are generic so the shared
component can also represent evidence hosted by other authoritative archives.

To preview from PowerShell, use the repository root `D:\martian-map` on
`feat/gale-map`, then `npm.cmd run dev -- --port 3100` and open
`http://127.0.0.1:3100/?region=gale`. Select any of the four named science areas.
If the current local server is still running, open that URL directly.

## Remaining limits

No precise feature coordinates or geological polygons met this integration's
verification gate. PDS calibrated camera geometry, source GIS, geological and
mineral coverage, registration uncertainty and terrain eligibility remain separate
scientific work. Existing G1 map assets and viewport behavior are preserved.
G2 does not add DEM, slope, mineral layers, a Sol timeline, comparison UI, routing,
or G3/G4 enhancements. Those require further approval and shared coordination.
