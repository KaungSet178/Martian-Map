import type { RegionConfig } from "@/lib/contracts/region";

// Gale G3.2: source-backed content; unknown values remain explicit.
export const config = {
  "id": "gale",
  "name": "Gale Crater",
  "mission_context": "Curiosity · Lower Mount Sharp",
  "region_status": "exploration",
  "scientific_context": {
    "mission": "NASA · Curiosity",
    "question": "How do clay-to-sulfate transitions record changing water conditions?"
  },
  "coordinate_system": {
    "body": "Mars",
    "latitude_type": "planetocentric",
    "longitude_direction": "east",
    "longitude_range": "0-360",
    "projected_crs": "Mars equirectangular, r=3396190 m, lat_ts=0, lon_0=0 (PDS orbital map); no routing grid integrated",
    "reference_surface": "Mars 2000 sphere; PDS orbital map v42.0 axes all 3396.19 km",
    "sphere_radius_m": 3396190,
    "vertical_datum": "Rendered PDS DEM subset: metres relative to MOLA areoid, positive up; not radial or ellipsoid height. Absolute error unquantified."
  },
  "view_center": {
    "latitude": -4.701483291254691,
    "longitude_east": 137.40108917127245,
    "status": "Midpoint of published PDS orbital-map v42.0 footprint, not a science-target location"
  },
  "map": {
    "visualization": {
      "status": "available",
      "reason": "Source-registered NASA Trek CTX display tiles and NASA recorded Curiosity traverse; documented independent PDS display audit."
    },
    // Display-only focus window. On entry the camera fits the largest
    // viewport-aspect rectangle inside this window, centered on real Lower
    // Mount Sharp traverse terrain. Fit Mission still uses the complete
    // supported_extent; neither rectangle changes source geography.
    "initial_zoom": 11,
    "initial_extent": {
      "west_east": 137.36,
      "east_east": 137.45,
      "south_latitude": -4.80,
      "north_latitude": -4.71
    },
    "supported_extent": {
      "west_east": 137.3442352329006,
      "east_east": 137.4579431096443,
      "south_latitude": -4.822361175063087,
      "north_latitude": -4.580605407446296
    },
    "display_transform": {
      "status": "reviewed",
      "method": "mars-geographic-to-maplibre-display",
      "source_id": "gale-display-review",
      "notes": "G1 display-registration review, 2026-11-13. Exact PDS orbital-map footprint defines the view, not terrain eligibility. Source WMTS angular grid: origin -180/90, 256px, 2^(L+1) columns and 2^L rows. Output XYZ pixel centers inverse-mapped to planetocentric/east geographic coordinates then nearest-neighbor sampled at source matrix z-1; no radiometric changes. Ambiguous EPSG::104905 tag is not treated as Earth EPSG or authority for planetographic conversion: independent PDS reference-image correlation is 0.4964 for planetocentric vs 0.1635 for planetographic, no fitted shifts (g1-audit.json). NASA mission-map line geometry retains every segment and 2D vertex; 1277 endpoints match explicit PDS planetocentric/east positions within 0.00001 degree. No synthetic connections. CSV poses are not treated as drive paths. Longitude wrap is identity here. Mercator formula is display encoding only, never Earth distance/scale or an Earth ellipsoid transform. Display registration is not survey control or hazard/safety certification."
    }
  },
  "data_status": "metadata_verified",
  "dataset_version": "gale-g3-2-v1",
  "contextual_datasets": [
    {
      "id": "gale-environment-context",
      "name": "Historical REMS observations",
      "evidence": "Unavailable",
      "availability": {
        "status": "unavailable",
        "reason": "REMS archive registered; no dated observation series ingested."
      },
      "source_ids": [
        "gale-rems"
      ],
      "limitations": "Historical rover-local observations are not forecasts. Future values require dates, measurement locations, calibration and quality flags."
    },
    {
      "id": "gale-radiation-context",
      "name": "Historical RAD observations",
      "evidence": "Unavailable",
      "availability": {
        "status": "unavailable",
        "reason": "RAD archive entry located; no dose series or applicable shielding model integrated."
      },
      "source_ids": [
        "gale-pds-mission"
      ],
      "limitations": "Rover radiation observations do not determine future astronaut dose or mission feasibility."
    }
  ],
  "routing": {
    "enabled": false,
    "reason": "G1 supports scientific map exploration only. Audited terrain quality masks, hazard coverage, routing thresholds and the shared planning service are unavailable.",
    "eligibility_dataset_id": null,
    "policy_version": null
  },
  "capabilities": {
    "terrain_coverage": {
      "status": "partial",
      "reason": "Regional HRSC 30 m and global nominal 200 m source/derivative masks cover 100% of the configured overview; local PDS subset retains 25 m aggregation / 75 m gradient support. Effective observational quality and independent CTX/color co-registration remain unverified. Partial scientific readiness, not missing regional grid coverage; no hazard or routing eligibility.",
      "source_id": "gale-hrsc-30m"
    },
    "experimental_routing": {
      "status": "unavailable",
      "reason": "No experimental planning service is connected."
    },
    "validated_routing": {
      "status": "unavailable",
      "reason": "Terrain, hazards and policy require scientific review."
    },
    "mission_feasibility": {
      "status": "unavailable",
      "reason": "Six supported assessments and applicable models are required."
    }
  },
  "source_references": [
    {
      "id": "gale-pds-dem-subset",
      "title": "PDS PLACES v42.0 - bounded orbital DEM subset",
      "url": "https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_maps/msl_orbital_dem.xml",
      "agency": "NASA/JPL-Caltech PDS Imaging Node; USGS mission localization",
      "instrument": "MRO HiRISE / CTX stereo mosaic",
      "product_id": "urn:nasa:pds:msl_places:data_maps:msl_orbital_dem::42.0",
      "acquisition_date": null,
      "sol": null,
      "native_resolution_m": 1,
      "processing_notes": [
        "Native 1 m post spacing, not uniform effective resolution. Equirectangular Mars sphere R=3396190 m, lat_ts=0, lon_0=0; planetocentric latitude / east longitude. Big-endian float32 image; fractional DEM origin retained, not copied from the orthophoto grid.",
        "MOLA areoid heights, metres positive up (PLACES SIS section 3.9.3). No radius conversion, fitted bias or translation. Bounded 28.31 MB source row range; full raster not downloaded.",
        "25 x 25 complete-post means, then Horn 3 x 3 gradients (75 m support). East metre spacing corrected by cos(latitude). Slope in degrees; hillshade artificial azimuth315 degrees / altitude45 degrees. No exaggeration or cast shadows.",
        "All 1,102,500 input posts valid; derived support 40 x 40 cells, outside transparent. Reproduction: team/gale/prepare_g3_2_dem.py; hashes and gate decisions: team/gale/G3_2_DEM_AUDIT.json."
      ],
      "limitations": [
        "Precise local alignment to CTX is NOT verified. Direct mission-orthophoto/CTX check suggests positional mismatch. Published coordinates retained; full-opacity independent views by default. Do not match fine features between products.",
        "Mixed HiRISE/CTX lineage without per-pixel resolving-power or error map. 25 m analysis grid and 75 m derivative support do not certify effective spatial resolution. Absolute elevation, horizontal and slope error unquantified.",
        "1 km projected square only, not whole Gale or all rover exploration. Archive release time span is not stereo acquisition time. No hazard, astronaut-safety, routing or resource conclusions."
      ]
    },
    {
      "id": "gale-hrsc-30m",
      "title": "30-m HRSC DTM Mosaic of Gale Crater, Mars",
      "url": "https://doi.org/10.5281/zenodo.5808354",
      "agency": "ESA / DLR / Freie Universität Berlin / NASA / JPL-Caltech",
      "instrument": "Mars Express High-Resolution Stereo Camera (HRSC)",
      "product_id": "hrsc_km09_h1938_h1927_h1916-dtm-mosaic.tif",
      "acquisition_date": null,
      "sol": null,
      "native_resolution_m": 30,
      "processing_notes": [
        "Processed from HRSC stereo image orbits H1938_0000, H1927_0000, and H1916_0000 using DLR-VICAR modification (Kim and Muller 2009; Persaud et al. 2021).",
        "Equidistant cylindrical projection on Mars 2000 sphere R=3396190 m, lat_ts=0, lon_0=0. Heights in metres relative to MOLA areoid via 200 m HRSC-MOLA blended DTM control.",
        "Horn 3x3 derivative filters with metric cos(latitude) scaling for slope and NW artificial hillshade (315° az, 45° alt).",
        "Valid data coverage: 100.00% across the entire Gale Overview footprint. Audited in team/gale/G4_TERRAIN_AUDIT.json."
      ],
      "limitations": [
        "Published under CC BY 4.0: Divya M. Persaud, Alfiah Diana Rizky Putri and Jan-Peter Muller (2021), 30-m HRSC DTM Mosaic of Gale Crater, Mars, DOI: 10.5281/zenodo.5808354.",
        "Fine-scale pixel co-registration against CTX optical mosaic is unverified. Do not infer sub-pixel alignment.",
        "30 m nominal posting and 90 m north gradient support do not establish effective spatial resolution or absolute accuracy; small boulders, suit-scale obstacles, and localized hazards are unresolved. Not for astronaut hazard or safety routing."
      ]
    },
    {
      "id": "gale-usgs-200m",
      "title": "USGS HRSC and MOLA Blended DEM Global 200m v2",
      "url": "https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m",
      "agency": "USGS Astrogeology Science Center / NASA / ESA",
      "instrument": "MGS MOLA / Mars Express HRSC blend",
      "product_id": "Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif",
      "acquisition_date": null,
      "sol": null,
      "native_resolution_m": 200,
      "processing_notes": [
        "Fergason, Hare, and Laura (2018), Astrogeology PDS Annex, U.S. Geological Survey.",
        "Global nominal 200 m blended digital elevation model. Geographic angular grid on Mars sphere R=3396190 m; source-specific affine preserved.",
        "Bounded extraction of a localized Gale-area crop, about 35.28 × 47.20 km; not a complete Gale Crater map. Original global source retained via HTTP range requests without downloading the full 11.4 GB raster.",
        "Horn 3x3 derivatives on nominal 200 m grid with 600 m north gradient support for slope in degrees and NW artificial illumination hillshade; neither scale establishes effective resolution or accuracy."
      ],
      "limitations": [
        "Official USGS product cited: Fergason et al. (2018), HRSC and MOLA Blended Digital Elevation Model at 200m V2.",
        "Broad 200 m regional baseline; does not resolve spacesuit-scale terrain hazards, rocks, or rover obstacles.",
        "Co-registration to optical CTX mosaic is uncertified. Not for astronaut safety routing or hazard certification."
      ]
    },
    {
      "id": "gale-arc-pass-geology",
      "title": "Davis - Arc Pass photogeological GIS, v1",
      "url": "https://doi.org/10.6084/m9.figshare.30401788.v1",
      "agency": "Joel Davis author archive / Figshare; associated peer-reviewed JGR study",
      "instrument": "HiRISE, Mastcam and Navcam mapping basis",
      "product_id": "Geomap.gdb.zip; Figshare file 58896958; map_unit_polygons_v2",
      "acquisition_date": null,
      "sol": null,
      "native_resolution_m": null,
      "processing_notes": [
        "Published 2025-10-20; associated paper DOI 10.1029/2025JE009538 (2026), figure 17. Publication dates are not acquisition dates. Mapping digitized at 1:250 on HiRISE with rover observations.",
        "53 source polygons, seven unmodified Unit codes. Mars 2000 sphere R=3396190 m, equirectangular lon_0=0, lat_ts=0, zero offsets. Inverse checked against independent spherical formula and PDS centric reference. No Earth geodesy, simplification, clipping, shifting or topology repair. Constant zero Z omitted, no elevation inferred.",
        "Full source archive, hashes, audit and reproducible workflow: team/gale/G3_GEOLOGY_EVIDENCE_REGISTER.json and prepare_g3_geology.py. Source classifications retained; colors are Marswalk display styling."
      ],
      "limitations": [
        "CC BY 4.0: Joel Davis (2025), GIS Shapefiles of Arc Pass, Mars, DOI 10.6084/m9.figshare.30401788.v1; cite associated Davis et al. (2026) paper.",
        "Small Arc Pass footprint, not a validated geological boundary for all Gediz Vallis or any precise sampling target. Absolute positional uncertainty unspecified; CTX is coarser than source mapping. Source gaps and overlaps preserved; no terrain safety, mineral abundance, routing or feasibility inference.",
        "Source abbreviations MSg, R and S remain unexpanded pending full legend semantics review. Draft contacts, profiles and auxiliary linework are not rendered."
      ]
    },
    {
      "id": "gale-mission-context",
      "title": "Gale Crater mission context",
      "url": "https://science.nasa.gov/mission/msl-curiosity/location-map/",
      "agency": "NASA",
      "instrument": null,
      "product_id": null,
      "acquisition_date": null,
      "sol": null,
      "native_resolution_m": null,
      "processing_notes": [],
      "limitations": [
        "Official mission map and context. Screenshots do not supply verified coordinates."
      ]
    },
    {
      "id": "gale-trek-ctx",
      "title": "NASA Trek - Gale CTX block-adjusted mosaic",
      "url": "https://trek.nasa.gov/tiles/Mars/EQ/Gale_CTX_BlockAdj_dd/1.0.0/WMTSCapabilities.xml",
      "agency": "NASA/JPL-Caltech/MSSS - NASA Solar System Treks",
      "instrument": "MRO Context Camera (CTX)",
      "product_id": "Gale_CTX_BlockAdj_dd",
      "acquisition_date": null,
      "sol": null,
      "native_resolution_m": null,
      "processing_notes": [
        "WMTS default/default028mm; matrices 0-12; 256px PNG; origin -180,90; 2^(L+1) columns and 2^L rows. Bounds 135.1842593..139.2413012 E, -6.5732988..-2.8077809 N.",
        "CTX instrument resolution up to 6 m/px is not served-tile resolution. Matrix 12 corresponds to 10.17 m angular sample spacing on a 3396190 m Mars sphere. Mosaic effective resolution and constituent acquisition dates unspecified.",
        "Local XYZ zooms 5-13 from source matrix z-1. Nearest-neighbor pixel-center sampling; no radiometric processing. Exact PDS footprint clips transparency. Rebuild with team/gale/prepare_g1.py."
      ],
      "limitations": [
        "Catalog creation date 2020-06-25 is not acquisition time. Ambiguous EPSG::104905 namespace is not treated as Earth EPSG or proof of planetographic latitude. Independent PDS image registration supports planetocentric sampling. Seams, illumination and horizontal registration uncertainty remain. Not terrain/hazard evidence."
      ]
    },
    {
      "id": "gale-mars-trek-themis",
      "title": "NASA Trek - THEMIS Daytime Infrared Controlled Mosaic v2",
      "url": "https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018/1.0.0/default/default028mm",
      "agency": "NASA/JPL/ASU - Arizona State University / NASA Solar System Treks",
      "instrument": "2001 Mars Odyssey Thermal Emission Imaging System (THEMIS IR)",
      "product_id": "THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018",
      "acquisition_date": null,
      "sol": null,
      "native_resolution_m": 100,
      "processing_notes": [
        "Global controlled daytime infrared mosaic v2 (released Oct 2018), Edwards et al. (2011), Christensen et al. (2004).",
        "Equirectangular planetary grid on Mars 2000 Sphere R=3,396,190 m, origin -180/90; nearest-neighbor 1:1 sampling from source matrix z-1 to Web-Mercator XYZ zooms 5-9.",
        "Represents relative daytime infrared brightness (qualitative DN). Uncalibrated for absolute kinetic temperature or thermal inertia in this composite mosaic; gaps outside data are transparent."
      ],
      "limitations": [
        "Relative daytime infrared brightness only (qualitative); no physical temperature (K) or thermal inertia (J m^-2 K^-1 s^-1/2) values are asserted.",
        "Daytime IR mixes albedo, surface slopes, and thermophysical properties; bright or dark patches are not by themselves compositional, geotechnical, or astronaut hazard classifications.",
        "Not a live weather forecast or real-time thermal environment model. Coarse ~100 m resolution; localized suit hazards are completely unresolved."
      ]
    },
    {
      "id": "gale-places",
      "title": "PDS - Curiosity localized/interpolated rover positions",
      "url": "https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_localizations/localized_interp.csv.xml",
      "agency": "NASA/JPL-Caltech - PDS Imaging Node",
      "instrument": null,
      "product_id": "urn:nasa:pds:msl_places:data_localizations:localized_interp::42.0",
      "acquisition_date": "2012-08-06T05:18:39Z/2026-04-17T00:19:01Z",
      "sol": null,
      "native_resolution_m": null,
      "processing_notes": [
        "CSV in the same directory: localized_interp.csv. Explicit planetocentric_latitude and longitude retained; ROVER frames with nonnegative sol, source file order, separate site/drive groups, no synthetic connections or decimation.",
        "Current PDS4 archive replaces MSLPLC_1XXX. Original label and CSV SHA-256 in team/gale/sources/g1-audit.json."
      ],
      "limitations": [
        "Historical localized/interpolated rover positions, sols 0-4868. Not a live location, astronaut route or evidence of safe terrain. Decimal precision is not positional accuracy."
      ]
    },
    {
      "id": "gale-display-review",
      "title": "PDS orbital map - Gale display registration reference",
      "url": "https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_maps/msl_orbital_map.xml",
      "agency": "NASA/JPL-Caltech - PDS Imaging Node",
      "instrument": "MRO HiRISE / localization-team orbital map",
      "product_id": "urn:nasa:pds:msl_places:data_maps:msl_orbital_map::42.0",
      "acquisition_date": null,
      "sol": null,
      "native_resolution_m": 0.25,
      "processing_notes": [
        "Published footprint 137.3442352329006..137.4579431096443 E, -4.822361175063087..-4.580605407446296 N. Planetocentric, east-positive, sphere radius 3396190 m. Equirectangular lat_ts=0, lon_0=0. Upper left 8141038,-271514 m; 26960 x 57320 pixels.",
        "Exact published footprint defines the G1 view, not a terrain eligibility area. Independent reference image sampled using 96 bounded HTTP ranges (2.59 MB), avoiding a 1.5 GB download. Planetocentric vs planetographic Pearson DN correlations: 0.4964 vs 0.1635, no fitted shifts. Audit: team/gale/sources/g1-audit.json."
      ],
      "limitations": [
        "0.25 m is reference-map pixel spacing, not CTX resolution or horizontal accuracy. Coarse independent registration diagnostic, not survey control. Only the label/report is bundled; reference-image samples remain ignored."
      ]
    },
    {
      "id": "gale-places-sis",
      "title": "PDS - Curiosity PLACES interface specification",
      "url": "https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/document/PLACES_PDS_SIS.pdf",
      "agency": "NASA/JPL-Caltech - PDS Imaging Node",
      "instrument": null,
      "product_id": "JPL D-78442, release 1.3 Rev A, 2016-07-01",
      "acquisition_date": null,
      "sol": null,
      "native_resolution_m": null,
      "processing_notes": [],
      "limitations": [
        "Describes older PDS3 layout; current PDS4 labels and release notes control product metadata."
      ]
    },
    {
      "id": "gale-merged-dem",
      "title": "USGS - Mars MSL Gale Merged DEM 1m",
      "url": "https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m",
      "agency": "USGS Astrogeology - NASA/JPL-Caltech - University of Arizona",
      "instrument": "HiRISE / CTX / HRSC tied to MOLA",
      "product_id": "MSL_Gale_DEM_Mosaic_1m_v3",
      "acquisition_date": null,
      "sol": null,
      "native_resolution_m": null,
      "processing_notes": [
        "Published 2016-10-20, 32980 x 57440, 32-bit, 1 m output grid, equirectangular, planetocentric/east, radius 3396190 m. Envelope 137.124167..137.680559 E, -5.098652..-4.129605 N.",
        "Source https://planetarymaps.usgs.gov/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif. No full 3.6 GB download. Next step: inspect TIFF layout/range support; subset documented AOI using GDAL/Rasterio or Map a Planet, preserving nodata and stereo/coarse-fallback lineage."
      ],
      "limitations": [
        "1 m output grid is not uniform 1 m effective elevation resolution. Source-quality footprints, pixel validity, alignment and vertical datum require file-level audit. No slopes/hazards computed. Credit Parker, Calef and contributors."
      ]
    },
    {
      "id": "gale-glen-torridon-reference",
      "title": "NASA - Curiosity on the Clay Unit",
      "url": "https://science.nasa.gov/photojournal/curiosity-on-the-clay-unit/",
      "agency": "NASA/JPL-Caltech/MSSS",
      "instrument": "Curiosity Mastcam",
      "product_id": "PIA23047",
      "acquisition_date": "2019-02-10",
      "sol": 2316,
      "native_resolution_m": null,
      "processing_notes": [],
      "limitations": [
        "Supporting photograph and science context; no georeferenced polygon or exact sampling point. G2 integrates the credited NASA browse rendition with its photograph provenance record."
      ]
    },
    {
      "id": "gale-vera-rubin",
      "title": "NASA - Vera Rubin Ridge hematite investigation",
      "url": "https://science.nasa.gov/blog/sols-1734-1735-gazing-longingly-towards-vera-rubin-ridge/",
      "agency": "NASA",
      "instrument": "MRO orbital observations / Curiosity Mastcam",
      "product_id": null,
      "acquisition_date": null,
      "sol": null,
      "native_resolution_m": null,
      "processing_notes": [],
      "limitations": [
        "Science narrative supports hematite investigation; no precise target geometry registered."
      ]
    },
    {
      "id": "gale-clay-sulfate",
      "title": "NASA - Climate clues on Mount Sharp",
      "url": "https://science.nasa.gov/resource/nasas-curiosity-finds-climate-clues-on-a-martian-mountain/",
      "agency": "NASA/JPL-Caltech",
      "instrument": null,
      "product_id": null,
      "acquisition_date": null,
      "sol": null,
      "native_resolution_m": null,
      "processing_notes": [],
      "limitations": [
        "Published science context and historical planned-route illustration. No vector geology or target coordinates extracted from images."
      ]
    },
    {
      "id": "gale-gediz-vallis-reference",
      "title": "NASA - Gediz Vallis channel panorama and interpretation",
      "url": "https://science.nasa.gov/resource/curiosity-takes-a-360-degree-view-of-gediz-vallis-channel/",
      "agency": "NASA/JPL-Caltech/MSSS",
      "instrument": "Curiosity Mastcam",
      "product_id": "PIA26363",
      "acquisition_date": "2024-06-19",
      "sol": 4220,
      "native_resolution_m": null,
      "processing_notes": [],
      "limitations": [
        "Earth-lighting color adjustment. Panorama and published interpretation, not verified point geometry; debris-flow vs other mechanisms retain uncertainty. Source-linked image not copied."
      ]
    },
    {
      "id": "gale-geology-publication",
      "title": "USGS - Glen Torridon stratigraphy and geological mapping",
      "url": "https://www.usgs.gov/publications/geology-and-stratigraphic-correlation-murray-and-carolyn-shoemaker-formations-across",
      "agency": "USGS / Fedo et al.",
      "instrument": null,
      "product_id": "10.1029/2022JE007408",
      "acquisition_date": null,
      "sol": null,
      "native_resolution_m": null,
      "processing_notes": [
        "2022 study describes mapped stratigraphic contacts and lacustrine/fluvial transitions across Glen Torridon and Vera Rubin Ridge."
      ],
      "limitations": [
        "Compatible GIS contacts, CRS, categorical legend and coverage not ingested; no geology overlay enabled."
      ]
    },
    {
      "id": "gale-rems",
      "title": "PDS Atmospheres - Curiosity REMS archive",
      "url": "https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/curiosity/rems.html",
      "agency": "NASA PDS Atmospheres Node / REMS team",
      "instrument": "Curiosity REMS",
      "product_id": null,
      "acquisition_date": null,
      "sol": null,
      "native_resolution_m": null,
      "processing_notes": [],
      "limitations": [
        "Archive discovery only. No dated time series, calibration or quality flags ingested; historical rover measurements are not EVA forecasts."
      ]
    },
    {
      "id": "gale-pds-mission",
      "title": "PDS - Curiosity instrument and RAD archive inventory",
      "url": "https://pds-geosciences.wustl.edu/missions/msl/",
      "agency": "NASA PDS Geosciences / PPI Nodes",
      "instrument": "Curiosity RAD",
      "product_id": null,
      "acquisition_date": null,
      "sol": null,
      "native_resolution_m": null,
      "processing_notes": [],
      "limitations": [
        "Archive entry points only; no radiation series, applicable shielding or astronaut dose model."
      ]
    },
    {
      "id": "gale-proposed-path",
      "title": "NASA - Historical proposed path up Mount Sharp",
      "url": "https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/",
      "agency": "NASA",
      "instrument": null,
      "product_id": null,
      "acquisition_date": null,
      "sol": null,
      "native_resolution_m": null,
      "processing_notes": [],
      "limitations": [
        "Historical proposal, not the recorded traverse. No path traced from the illustration."
      ]
    },
    {
      "id": "gale-image-policy",
      "title": "NASA/JPL image-use and attribution policy",
      "url": "https://www.jpl.nasa.gov/jpl-image-use-policy/",
      "agency": "NASA/JPL-Caltech",
      "instrument": null,
      "product_id": null,
      "acquisition_date": null,
      "sol": null,
      "native_resolution_m": null,
      "processing_notes": [],
      "limitations": [
        "Retain credits and third-party notices; no NASA/JPL endorsement or logo permission implied. Product restrictions take precedence."
      ]
    },
    {
      "id": "gale-nasa-traverse",
      "title": "NASA interactive map - recorded Curiosity traverse",
      "url": "https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json",
      "agency": "NASA/JPL-Caltech",
      "instrument": null,
      "product_id": "MSL_traverse.json; snapshot 2026-11-13 (SHA-256 in g1-audit.json)",
      "acquisition_date": null,
      "sol": null,
      "native_resolution_m": null,
      "processing_notes": [
        "Original LineString/MultiLineString segments and 27008 2D vertices retained. Vertical coordinates and Length properties omitted; no inferred Earth units. 1277 source line endpoints match explicit PDS planetocentric/east coordinates within 0.00001 degree.",
        "Companion MSL_waypoints.json spans sols 3-5070; that range describes waypoints, not an invented timestamp for every line. Newest geometry can lie outside the older PDS v42.0 initial-view footprint; full latest traverse coverage is not claimed."
      ],
      "limitations": [
        "Historical source snapshot; no live position or astronaut route. PDS localization cross-check establishes display convention, not positional accuracy or hazards. NASA source supplies no per-line timestamp/version; hash identifies the downloaded snapshot."
      ]
    },
    {
      "id": "gale-nasa-media-policy",
      "title": "NASA images and media usage guidelines",
      "url": "https://www.nasa.gov/nasa-brand-center/images-and-media/",
      "agency": "NASA",
      "instrument": null,
      "product_id": null,
      "acquisition_date": null,
      "sol": null,
      "native_resolution_m": null,
      "processing_notes": [
        "Educational/informational use with source credit under NASA media guidelines. NASA Trek API publishes WMTS access for clients. No NASA/JPL logo or endorsement is used."
      ],
      "limitations": [
        "Third-party copyright notices and product-specific restrictions must be respected."
      ]
    },
    {
      "id": "gale-photo-source-glen",
      "title": "NASA photograph - PIA23047",
      "url": "https://science.nasa.gov/photojournal/curiosity-on-the-clay-unit/",
      "agency": "NASA/JPL-Caltech/MSSS",
      "instrument": "Curiosity Mastcam",
      "product_id": "PIA23047",
      "acquisition_date": "2019-02-10",
      "sol": 2316,
      "native_resolution_m": null,
      "processing_notes": [
        "NASA-provided 1328px browse rendition. Source does not specify a color-calibration method; none is asserted here.",
        "Local browse image copied without local cropping, enhancement or resampling; exact rendition URL and SHA-256 in team/gale/G2_EVIDENCE_REGISTER.json."
      ],
      "limitations": [
        "Ground-level browse photograph, not a georeferenced map or verified feature coordinate.",
        "The depicted formation and the observer location must not be treated as interchangeable."
      ]
    },
    {
      "id": "gale-photo-source-ridge",
      "title": "NASA photograph - PIA21851",
      "url": "https://science.nasa.gov/photojournal/looking-up-at-layers-of-vera-rubin-ridge-on-sol-1790/",
      "agency": "NASA/JPL-Caltech/MSSS",
      "instrument": "Curiosity Mastcam, right camera",
      "product_id": "PIA21851",
      "acquisition_date": "2017-08-19",
      "sol": 1790,
      "native_resolution_m": null,
      "processing_notes": [
        "NASA panorama of 13 images, white-balanced for an Earth daylight appearance; NASA-provided 1536px browse rendition. Black mosaic margins retained.",
        "Local browse image copied without local cropping, enhancement or resampling; exact rendition URL and SHA-256 in team/gale/G2_EVIDENCE_REGISTER.json."
      ],
      "limitations": [
        "Ground-level browse photograph, not a georeferenced map or verified feature coordinate.",
        "The depicted formation and the observer location must not be treated as interchangeable."
      ]
    },
    {
      "id": "gale-photo-source-sulfate",
      "title": "NASA photograph - PIA26551",
      "url": "https://science.nasa.gov/photojournal/curiosity-looks-downslope-from-the-sulfate-unit/",
      "agency": "NASA/JPL-Caltech/MSSS",
      "instrument": "Curiosity Mastcam",
      "product_id": "PIA26551",
      "acquisition_date": "2025-02-07",
      "sol": 4447,
      "native_resolution_m": null,
      "processing_notes": [
        "NASA color adjustment for Earth-like lighting; NASA-provided 1536px browse rendition. Panorama seams and margins retained.",
        "Local browse image copied without local cropping, enhancement or resampling; exact rendition URL and SHA-256 in team/gale/G2_EVIDENCE_REGISTER.json."
      ],
      "limitations": [
        "Ground-level browse photograph, not a georeferenced map or verified feature coordinate.",
        "The depicted formation and the observer location must not be treated as interchangeable."
      ]
    },
    {
      "id": "gale-photo-source-navcam",
      "title": "NASA photograph - NLB_781532029EDR_F1091446NCAM00379M_",
      "url": "https://science.nasa.gov/blog/sols-4327-4328-on-the-road-again/",
      "agency": "NASA/JPL-Caltech",
      "instrument": "Curiosity Left Navigation Camera",
      "product_id": "NLB_781532029EDR_F1091446NCAM00379M_",
      "acquisition_date": "2024-10-07",
      "sol": 4326,
      "native_resolution_m": null,
      "processing_notes": [
        "NASA-hosted 1024px browse image, associated with raw-image identifier NLB_781532029EDR_F1091446NCAM00379M_. Acquisition time 01:16:16 UTC is stated by NASA; no additional calibration is claimed.",
        "Local browse image copied without local cropping, enhancement or resampling; exact rendition URL and SHA-256 in team/gale/G2_EVIDENCE_REGISTER.json."
      ],
      "limitations": [
        "Ground-level browse photograph, not a georeferenced map or verified feature coordinate.",
        "The depicted formation and the observer location must not be treated as interchangeable."
      ]
    },
    {
      "id": "gale-usgs-sulfate-study",
      "title": "USGS - Clay-sulfate transition, deposition and diagenesis",
      "url": "https://www.usgs.gov/publications/geological-context-and-significance-clay-sulfate-transition-region-mount-sharp-gale",
      "agency": "USGS publication record; Meyer and coauthors",
      "instrument": null,
      "product_id": "10.1130/B37355.1",
      "acquisition_date": null,
      "sol": null,
      "native_resolution_m": null,
      "processing_notes": [
        "Orbiter/rover synthesis: depositional and later alteration processes both contribute to mineral transitions. USGS page date 2024-06-28; publication year field 2025. Neither is an image acquisition date."
      ],
      "limitations": [
        "Publication context only. No independently validated georeferenced unit-boundary product integrated; orbital mineral signatures must not be equated with all visible bedrock or primary depositional conditions."
      ]
    },
    {
      "id": "gale-gediz-gazetteer",
      "title": "USGS/IAU Gazetteer - Gediz Vallis, Feature 15571",
      "url": "https://planetarynames.wr.usgs.gov/Feature/15571",
      "agency": "USGS / IAU WGPSN",
      "instrument": null,
      "product_id": "Gazetteer Feature 15571",
      "acquisition_date": null,
      "sol": null,
      "native_resolution_m": null,
      "processing_notes": [
        "Named feature center and WKT polygon are published in planetocentric, east-positive 0-360 coordinates. Center -4.85 N, 137.44 E is nomenclature reference metadata, not a precise sampling point."
      ],
      "limitations": [
        "Control network is UNKNOWN on the source page. Nomenclature extent is not a validated geological deposit boundary. Geometry is recorded in the evidence audit only and is not rendered or converted to a waypoint."
      ]
    }
  ]
} satisfies RegionConfig;
