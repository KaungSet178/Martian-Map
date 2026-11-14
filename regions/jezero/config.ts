import type { RegionConfig } from "@/lib/contracts/region";

// Region-owned content. Pending values are deliberately explicit.
export const config = {
  id: "jezero",
  name: "Jezero Crater",
  mission_context: "Perseverance · Western delta",
  region_status: "exploration",
  scientific_context: {
    mission: "NASA · Perseverance",
    question:
      "What can delta sediments reveal about an ancient lake and its habitability?",
  },
  coordinate_system: {
    body: "Mars",
    latitude_type: "planetocentric",
    longitude_direction: "east",
    longitude_range: "0-360",
    projected_crs: "pending-source-validation",
    reference_surface:
      "Mars mean sphere (IAU/MOLA convention, 3,389,500 m radius) registered for display scale; the exact PLACES/SIS (PPPCS) ellipsoid parameters are pending review",
    sphere_radius_m: 3389500,
    vertical_datum:
      "MOLA areoid (PLACES elevation = radius - areoid, positive up; verified empirically in the product)",
  },
  view_center: {
    latitude: 18.444627146,
    longitude_east: 77.450885729,
    status:
      "Perseverance landing localization (PLACES best_interp.csv v16.0 SITE 1, planetocentric/east). Display center for the scientific map; canonical planetocentric values passed through the documented display transform.",
  },
  map: {
    visualization: {
      status: "available",
      reason:
        "Five integrated data layers (CTX, Elevation, Slope, Geological units, Thermal) plus the recorded-traverse overlay, each with a reviewed, documented display transform and the supported extent.",
    },
    initial_zoom: 10,
    supported_extent: {
      west_east: 77.186786,
      east_east: 77.493133,
      south_latitude: 18.401964,
      north_latitude: 18.519663,
    },
    display_transform: {
      status: "reviewed",
      method: "mars-geographic-to-maplibre-display",
      source_id: "jezero-m2020-places",
      notes:
        "Review 2026-11-12, Jezero region owner. Asset public/maps/jezero/perseverance-traverse.geojson derived from PLACES data_localizations/best_interp.csv v16.0 (33,458 rows, sols 0-1897) by team/jezero/traverse/build_traverse.mjs; coordinates are copied, never recomputed: [east longitude 0-360, planetocentric latitude]. All Jezero longitudes are <180E, so the shared east-to-display wrap is an identity here. The shared renderer feeds display latitude to Web Mercator (Earth-sphere tile math; MapLibre distances/scales remain forbidden). ALIGNMENT: the product's planetodetic_latitude column is defective (constant 18.346169209 across release 16, verified in best_interp.csv and best_tactical.csv), so planetocentric latitude is supplied as display latitude; Web Mercator interprets it as geodetic and the planetocentric/geodetic distinction at 18.4-18.5N is ~0.1-0.2 deg, so alignment against any georeferenced basemap is PENDING SIS (PPPCS) ellipsoid review - the asset is display-grade, not survey-grade. NODATA: rows with -9999 lat/lon dropped (0 rows in v16.0); consecutive duplicate positions collapsed; release 16 omits ROVER,n,0 entries bundle-wide per release notes (station points recovered from identical SITE entries). PROVENANCE/CROSS-CHECK: approximate recorded path 42.785 km for sols 14-1897 (through 2026-06-21), consistent with the NASA odometer statement (45.22 km by 2026-10-11); product radius column 3,391,924-3,392,721 m; areoid-relative elevation -2,586 to -1,786 m. Decimation: display vertices thinned to ~10 m spacing (3,502 of 32,978 points). supported_extent and view_center use the same planetocentric convention as the asset, so bounds/center/asset registration is internally consistent. BASEMAP (v5): /maps/jezero/ctx-tiles/ derived from the Murray Lab CTX global mosaic beta01 (Esri tiled service, source jezero-ctx-esri) by team/jezero/basemap/prepare_ctx_basemap.mjs - 351 self-hosted 256 px Web-Mercator XYZ tiles, zooms 5-14, nearest-neighbour resampled from the service's equirectangular grid (level L=z-2), no radiometric processing; ~20 corrupt source tiles (truncated zlib streams, a service-side defect) are covered from a coarser level. The mosaic's GCS is Mars_2000_Sphere (sphere datum: geodetic == planetocentric), which INDEPENDENTLY VALIDATES the planetocentric display-latitude convention used by the traverse asset - both layers share one convention. Residual alignment caveat (planetocentric vs geodetic-on-ellipsoid, ~0.1-0.2 deg) remains documented pending the PPPCS ellipsoid review; visual cross-check of traverse-over-basemap alignment is part of ongoing review. TERRAIN (v6): /maps/jezero/terrain-tiles/ derived from the USGS Mars 2020 TRN HiRISE DTM mosaic (source jezero-usgs-trn-dtm; 1 m/px, equirectangular latTs0/lon0, planetocentric latitude, D_Mars_2000_Sphere r=3,396,190 m) by team/jezero/terrain/build_terrain.mjs - 193 self-hosted 256 px Web-Mercator XYZ RGBA tiles, zooms 5-14, bilinear elevation sampling x analytic hillshade (sun 315 deg az / 45 deg alt), nodata transparent; tile ranges are computed from the region extent (not the DTM footprint) so every tile the clamped viewport can request exists, and tiles west of the DTM are fully transparent; same planetocentric display-latitude convention as the other two layers (equirectangular map X/Y with the label's radius). Vertical datum verified areoid-relative against PLACES (median DTM-PLACES +0.025 m, abs P95 4.3 m, 30,445 matched points, team/jezero/terrain/audit_terrain.mjs); display-grade only - not the native 1 m posts, not route-safety evidence. GEOLOGY (v7): /maps/jezero/geology-tiles/ derived from the USGS SIM 3464 geologic-unit polygons (source jezero-usgs-sim3464; Sun & Stack 2020, 1:75,000; MTM_clon77.5E projection, TM central meridian 77.5 E on the Mars 2000 Sphere r=3,396,190 m) by team/jezero/geology/build_geology.mjs - 3,101 self-hosted 256 px Web-Mercator XYZ RGBA tiles, zooms 5-14, unit-color scanline fill (paint order by polygon area descending), no-unit pixels transparent. The MTM-to-lon/lat inversion is the exact spherical-TM inverse (audit roundtrip error <1e-9 m, team/jezero/geology/audit_geology.mjs) and the sphere datum makes geodetic == planetocentric, so the layer registers on the same display convention as the other three layers; source-inherent random offsets of ~100-200 m versus the operations CTX mosaic are documented in the layer and source limitations. CTX (v8): /maps/jezero/ctx-lvs-tiles/ derived from the Mars 2020 TRN Lander Vision System controlled CTX mosaic (source jezero-mars-trek-ctx-lvs; JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0, ~6 m/px, Mars_2000_Sphere) served by the NASA Mars Trek WMTS service and reprojected by team/jezero/basemap/prepare_trek_basemap.mjs - 111 self-hosted 256 px Web-Mercator XYZ RGBA tiles, zooms 5-13 (5,950,878 bytes). Sampling is nearest-neighbour 1:1 from source level L = z-1: the Trek grid is 256 px with level 0 = 2 x 1 and resolution 0.703125/2^L deg/px, so 0.703125/2^(z-1) == 1.40625/2^z deg/px exactly matches the output pixel grid; source alpha is preserved, so pixels outside the mosaic footprint (west of 77.1605 E) are transparent - the same west-margin clip the DTM shows. The product footprint (77.1605-77.6992 E, 18.2110-18.7212 N) covers the whole supported extent. At z13 the display samples ~10 m/px, so the native ~6 m is not fully resolved at the current zoom ceiling; raising it to z14 with source level L13 is documented as the next step and was deliberately not applied here to keep the committed tile budget bounded. ELEVATION (v8): the former 'Terrain & slope' layer is split - display name is now Elevation (layer id jezero-elevation, unchanged /maps/jezero/terrain-tiles/ tiles, hypsometric tint x hillshade). SLOPE (v8): /maps/jezero/slope-tiles/ derived from the same audited 1 m DTM by team/jezero/terrain/build_slope.mjs - 193 self-hosted 256 px RGBA tiles, zooms 5-14 (15,122,994 bytes), slope = atan(sqrt((dz/dx)^2 + (dz/dy)^2)) from central differences on the display grid with Mars ground spacing 2*pi*R*cos(lat)/(256*2^z), R = 3,396,190 m; 0-35 deg ramp, nodata transparent. The baseline is the display pixel (~10 m at z14, ~19 m at z13, ~5 km at z5), so low zooms show a smoothed regional gradient and the same terrain reads slightly gentler as zoom decreases; tile ranges come from the region extent so deep-zoom panning cannot 404 (tiles west of the DTM are fully transparent), and the sampled distribution over the coverage is p50 4.4 deg, p90 15.4 deg, p98 22.6 deg (report team/jezero/terrain/slope_report.json). Slope is a derived measurement, not bearing strength, rock abundance or trafficability evidence. THERMAL (v8): /maps/jezero/thermal-tiles/ derived from the THEMIS daytime IR controlled mosaic v2 (Oct 2018, ~100 m/px, source jezero-mars-trek-themis) through the same Trek WMTS service and script - 7 self-hosted 256 px RGBA tiles, zooms 5-9, nearest-neighbour 1:1 from L = z-1, upsampled above z9. The legend is qualitative relative daytime IR brightness because the mosaic carries no verified radiometric scaling: no temperature, thermal-inertia, rock-abundance or dust-cover value is asserted anywhere, and the TES thermal-inertia map (3 km/px) is too coarse for this region and unused. SHARED RENDERER (v8): map maxZoom raised 10 -> 13 (coordinated shared change in components/map/map-workspace.tsx) so the z11-13 tiles are reachable; maxBounds still clamps panning to the supported extent and MapLibre distances/scales remain forbidden.",
    },
  },
  data_status: "raster_audited",
  // v9: the three placeholder scenario targets were replaced by the five
  // published Mars 2020 Perseverance science objectives (Geology, Habitability,
  // Sample Caching, Biosignatures, Human-exploration preparation). Objective
  // text is real and cited, but target locations remain unverified, so the
  // targets are evidence "Interpreted" / verification "pending" and stay
  // non-routable. Existing IDs 1-3 are preserved for saved-plan compatibility.
  // Routing stays disabled: no hazard coverage and no approved routing policy
  // are connected.
  dataset_version: "jezero-objectives-v9",
  routing: {
    enabled: false,
    reason:
      "Audited terrain exists, but hazard coverage and an approved routing policy are not connected.",
    eligibility_dataset_id: null,
    policy_version: null,
  },
  capabilities: {
    terrain_coverage: {
      status: "partial",
      reason:
        "USGS Mars 2020 TRN HiRISE DTM mosaic (1 m/px) audited (team/jezero/terrain/audit_terrain.mjs, all checks pass; areoid-relative vertical datum verified against the PLACES traverse, median +0.025 m over 30,445 points). Elevation display tiles cover 77.2229-77.4931 E, 18.4020-18.5197 N (zooms 5-14); slope display tiles derive from the same DTM with a display-pixel measurement baseline. The supported extent's west margin (77.1868-77.2229 E) lies outside the DTM footprint and has no terrain data. Terrain presence is not route safety: routing stays disabled pending hazard coverage and an approved policy.",
      source_id: "jezero-usgs-trn-dtm",
    },
    experimental_routing: {
      status: "unavailable",
      reason: "No experimental planning service is connected.",
    },
    validated_routing: {
      status: "unavailable",
      reason: "Terrain, hazards and policy require scientific review.",
    },
    mission_feasibility: {
      status: "unavailable",
      reason: "Six supported assessments and applicable models are required.",
    },
  },
  contextual_datasets: [
    {
      id: "jezero-environment-context",
      name: "Historical MEDA / environmental context",
      evidence: "Unavailable",
      availability: {
        status: "unavailable",
        reason:
          "MEDA archive is registered, but no applicable observation products are integrated and no exposure model is reviewed.",
      },
      source_ids: ["jezero-meda-environment"],
      limitations:
        "Historical rover observations at the rover location are not spatial fields, not mission forecasts and not astronaut dose models.",
    },
  ],
  source_references: [
    {
      id: "jezero-mission-context",
      title: "Jezero Crater mission context (Perseverance location map)",
      url: "https://science.nasa.gov/mission/mars-2020-perseverance/location-map/",
      agency: "NASA",
      instrument: null,
      product_id: null,
      acquisition_date: null,
      sol: null,
      native_resolution_m: null,
      processing_notes: [
        "Interactive map built on a high-resolution color base map derived from MRO HiRISE images covering the initial exploration area.",
        "Regional true-color context from ESA Mars Express HRSC (original map at https://maps.planet.fu-berlin.de/).",
        "Mission team states a high-resolution DEM was created from orbital images for rover driving; no public product has been selected by this project.",
      ],
      limitations: [
        "Mission context only; does not verify targets, rasters, coordinates or hazards.",
        "Map tiles/dots are a mission operations view; no traverse geometry is asserted from this page.",
      ],
    },
    {
      id: "jezero-m2020-places",
      title:
        "Mars 2020 Rover PLACES Bundle (rover localizations and traverse geometry)",
      url: "https://pds-geosciences.wustl.edu/missions/mars2020/places.htm",
      agency: "NASA/JPL-Caltech · PDS Geosciences Node",
      instrument: "Perseverance PLACES localization database",
      product_id: "urn-nasa-pds-mars2020_rover_places",
      acquisition_date: null,
      sol: null,
      native_resolution_m: null,
      processing_notes: [
        "Bundle root: https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_rover_places/",
        "Traverse geometry lives in the data_localizations/ collection; data_maps/ holds map-related products.",
        "Release 16 (Aug 11 2026) covers sols 0-1897 through 2026-06-21.",
        "Product structure is defined by the Rover PLACES SIS (Mars2020_Rover_PLACES_PDS_SIS.pdf).",
        "Display asset /maps/jezero/perseverance-traverse.geojson derived from data_localizations/best_interp.csv v16.0 by team/jezero/traverse/build_traverse.mjs (audit, decimation and conventions documented there and in the region display-transform notes).",
      ],
      limitations: [
        "Downloadable geometry must be verified per-product before any display or survey-precision use.",
        "Site-frame vs cartographic coordinate conventions and localization accuracy are not yet reviewed.",
        "Rover traverse data is not astronaut route evidence and does not imply terrain safety.",
      ],
    },
    {
      id: "jezero-meda-environment",
      title:
        "MEDA (Mars Environmental Dynamics Analyzer) archive, Mars 2020 mission",
      url: "https://atmos.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html",
      agency: "NASA/JPL · PDS Atmospheres Node",
      instrument: "MEDA (PS, ATS, TIRS, HS, WS, RDS/SkyCam)",
      product_id: "mars2020_meda (DOI 10.17189/1522849)",
      acquisition_date: null,
      sol: null,
      native_resolution_m: null,
      processing_notes: [
        "Certified bundle: https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/",
        "Calibrated and derived products are CSV tables; derived products apply stated models to calibrated data.",
        "Observations began Feb 19, 2021 (Ls 6.1 MY 36) and continue by release.",
      ],
      limitations: [
        "Historical point observations at the rover, not spatial fields over the region.",
        "Not a forecast, not a radiation exposure model and not operational support.",
        "Product selection and any integration require a reviewed applicability statement.",
      ],
    },
    {
      id: "jezero-m2020-sample-dossier",
      title:
        "Mars 2020 Sample Dossier Bundle (sample acquisition and context data)",
      url: "https://pds-geosciences.wustl.edu/missions/mars2020/returned_sample_science.htm",
      agency: "NASA/JPL-Caltech · PDS Geosciences Node",
      instrument: "Perseverance sampling system with mission context cameras",
      product_id: null,
      acquisition_date: null,
      sol: null,
      native_resolution_m: null,
      processing_notes: [
        "Documents remote sensing, contact science and engineering data for drilled/abraded samples.",
        "Bundle URN and per-sample products to be confirmed during target-evidence selection.",
      ],
      limitations: [
        "Sample context is rover-sampled rock/regolith evidence, not a proposed astronaut sampling result.",
        "No specific sample product has been selected or reviewed by this project yet.",
      ],
    },
    {
      id: "jezero-m2020-mission-overview",
      title:
        "Mars 2020 Mission Overview (Farley et al., 2020, Space Science Reviews)",
      url: "https://doi.org/10.1007/s11214-020-00762-y",
      agency: "NASA",
      instrument: "Mars 2020 mission science team",
      product_id: "DOI 10.1007/s11214-020-00762-y",
      acquisition_date: null,
      sol: null,
      native_resolution_m: null,
      processing_notes: [
        "Peer-reviewed mission overview; cited on the verified PDS MEDA archive page.",
        "Describes the Perseverance mission and Jezero landing-site science framing.",
      ],
      limitations: [
        "Published interpretation is not coordinate-verified evidence for a specific site.",
        "Does not establish raster coverage or terrain safety.",
      ],
    },
    {
      id: "jezero-m2020-science-objectives",
      title: "Mars 2020 Perseverance science objectives (NASA mission page)",
      url: "https://science.nasa.gov/mission/mars-2020-perseverance/science-objectives/",
      agency: "NASA",
      instrument: "Mars 2020 Perseverance mission science team",
      product_id: null,
      acquisition_date: null,
      sol: null,
      native_resolution_m: null,
      processing_notes: [
        "Mission page verified live 2026-11-14; states the four objective areas (Geology, Astrobiology, Sample Caching, Preparation for Humans) and their numbered sub-objectives.",
        "Target objective text in regions/jezero/targets.ts paraphrases this page and the peer-reviewed mission overview (Farley et al. 2020); no wording is presented as an operational task or a located field site.",
      ],
      limitations: [
        "Mission objectives are not field-target coordinates; this page does not verify a location, raster, hazard or route.",
        "Objectives are stated at mission scale and do not establish astronaut trafficability or sampling feasibility.",
      ],
    },
    {
      id: "jezero-usgs-trn-dtm",
      title:
        "USGS Mars 2020 Terrain Relative Navigation HiRISE DTM mosaic (1 m/px)",
      url: "https://doi.org/10.5066/P9REJ9JN",
      agency: "USGS Astrogeology Science Center · NASA/MRO HiRISE",
      instrument: "HiRISE",
      product_id:
        "JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40",
      acquisition_date: null,
      sol: null,
      native_resolution_m: 1,
      processing_notes: [
        "Product verified via its DOI landing page, FGDC metadata XML and ISIS label before download; source index https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/HiRISE/index.html.",
        "Uncompressed 32-bit float GeoTIFF, 21,400 x 21,488, 1 m/px, equirectangular (latTs0/lon0), planetocentric latitude, east-positive, D_Mars_2000_Sphere r=3,396,190 m; ISIS label UpperLeftCornerX/Y = 4577366.0/1106618.0 m; GDAL nodata tag -3.4028e+38; label footprint 77.2229-77.5840 E, 18.3068-18.6693 N (reproduced exactly by the GeoTIFF georeferencing tags).",
        "Audit (team/jezero/terrain/audit_terrain.mjs, report team/jezero/terrain/audit_report.json): structure, georeferencing, nodata and value-range checks pass; PLACES cross-check over 30,445 traverse points: median DTM-PLACES +0.025 m, RMS 1.6 m, abs P95 4.3 m - the areoid-relative vertical datum is verified empirically.",
        "FGDC published value range (-2659.8 to -1942.1 m) is understated: sampled values reach -1639.971 m in a contiguous western-rim band (lon 77.25-77.29 E). Confirmed real terrain by rover ground truth (PLACES sol 1354: -1786.0 m at 18.4575 N, 77.2685 E; DTM matched within ~5 m) - recorded as a documented metadata caveat, not a data defect.",
        "USGS documents uncompensated y-parallax in the Jezero_CR stereo components of this mosaic; the traverse bins crossing that area show a small positive bias (~+3 m mean, abs P95 ~4.9 m) consistent with the USGS quality warning.",
        "Display tiles /maps/jezero/terrain-tiles/{z}/{x}/{y}.png derived by team/jezero/terrain/build_terrain.mjs: 193 256 px Web-Mercator XYZ RGBA tiles, zooms 5-14, shaded hypsometric elevation (p2-p98 ramp -2620/-1770 m) x analytic hillshade (sun 315 deg az / 45 deg alt); bilinear sampling; nodata transparent; the large source raster stays in local storage (team/jezero/terrain/, gitignored) and is never committed.",
      ],
      limitations: [
        "Public domain USGS release; cite the product authors via the DOI.",
        "Display tiles are derived, resampled and hillshaded - not the native 1 m posts; not a route-safety or engineering product.",
        "The far-west CR stereo component retains a small (~3-5 m) vertical bias per USGS quality notes; values there are display-grade only.",
      ],
    },
    {
      id: "jezero-hirise-archive",
      title: "HiRISE PDS data volume (EDR, RDR and DTM, accumulating)",
      url: "https://hirise-pds.lpl.arizona.edu/PDS",
      agency: "NASA/JPL-Caltech/University of Arizona",
      instrument: "HiRISE",
      product_id: null,
      acquisition_date: null,
      sol: null,
      native_resolution_m: null,
      processing_notes: [
        "Archive anchor for MRO HiRISE EDR/RDR/DTM volumes.",
        "Specific western-delta imagery/DTM products remain to be selected and reviewed.",
      ],
      limitations: [
        "Archive anchor only; selecting a Jezero product does not by itself validate its coordinate convention or footprint.",
      ],
    },
    {
      id: "jezero-ctx-archive",
      title: "MRO CTX EDR online volumes (PDS Imaging Node)",
      url: "https://pds-imaging.jpl.nasa.gov/volumes/mro.html",
      agency: "NASA/JPL-Caltech · PDS Cartography and Imaging Node",
      instrument: "CTX (Context Camera)",
      product_id: null,
      acquisition_date: null,
      sol: null,
      native_resolution_m: null,
      processing_notes: [
        "Archive anchor for CTX/MARCI EDR volumes; per-volume releases through 2026.",
        "Jezero coverage products to be located via the Orbital Data Explorer before registration.",
      ],
      limitations: [
        "Archive anchor only; no specific Jezero product has been selected or reviewed.",
      ],
    },
    {
      id: "jezero-usgs-sim3464",
      title:
        "USGS SIM 3464 - Geologic map of Jezero crater and the Nili Planum region, Mars (Sun & Stack, 2020, 1:75,000)",
      url: "https://doi.org/10.3133/sim3464",
      agency: "USGS Astrogeology Science Center · NASA",
      instrument:
        "Photogeologic mapping on MRO CTX (6 m/px mosaic base), HiRISE, THEMIS IR and HRSC data",
      product_id:
        "SIM 3464; data release DOI 10.5066/P9CZYIO7; ArcGIS FeatureServer Jezero_FeatureServiceFromPro layer 8 'Geologic Units'",
      acquisition_date: null,
      sol: null,
      native_resolution_m: 6,
      processing_notes: [
        "Product verified via the Publications Warehouse page (pamphlet, map sheet, metadata, database links) and the FGDC metadata before download; first continuous high-resolution geologic map spanning Jezero crater and Nili Planum, published 2020-12-02 for the Mars 2020 landing-site effort.",
        "Official GIS database sim3464_database.zip (349 MB, file geodatabase Nili.gdb, MTM_clon77.5E on GCS Mars_2000_(Sphere) r=3,396,190 m per the included .prj files) downloaded to team/jezero/geology/downloads/ (kept local, gitignored).",
        "Vector layers fetched from the USGS-published ArcGIS FeatureServer of the same database by team/jezero/geology/fetch_source_layers.mjs into team/jezero/geology/source/ (MapBoundary 1, GeologicUnits 1308, GeologicContacts 2497, LinearFeatures 382, SurfaceFeatures 285, LocationFeatures 341 features).",
        "Audit (team/jezero/geology/audit_geology.mjs, report audit_report.json) - all 13 checks pass: exact spherical-TM MTM-to-lon/lat inversion (roundtrip <1e-9 m; central-meridian identity verified); map boundary inverses to the published 1x1 degree box 76.8-77.8 E, 17.7-18.7 N (max edge deviation 0.00173 deg; MTM area within 0.003% of the spherical patch); unit name/symbol domains, 1308-feature count and Shape area/length ranges all match the published FGDC metadata; every unit vertex inside the published bbox; boundary-sample completeness 99.92% (0.035% uncovered, 0.045% multi-covered slivers - published GIS digitizing artifacts, quantified); all 15 units carry Unit_Description and Unit_Interpretation.",
        "Published data quirk kept verbatim: the name domain contains both 'Crater rim unit' (64 polygons) and the misspelling 'Crater riim unit' (1 polygon) sharing symbol cr/unit 11; the legend uses the sheet spelling.",
        "Display tiles /maps/jezero/geology-tiles/{z}/{x}/{y}.png derived by team/jezero/geology/build_geology.mjs: 3,101 256 px Web-Mercator XYZ RGBA tiles, zooms 5-14 (~4.0 MB), unit-color scanline fill (paint order by polygon area descending), no-unit pixels transparent; tile spot-check (spotcheck_tiles.mjs) confirms palette-only colors and edge behavior. Unit colors are display choices, not the printed sheet's lithology colors.",
      ],
      limitations: [
        "Public domain USGS publication; cite Sun, V.Z., and Stack, K.M., 2020, USGS SIM 3464, https://doi.org/10.3133/sim3464.",
        "USGS documents ~100-200 m random offsets versus the July 2020 surface-operations CTX mosaic (map digitized on a semi-controlled predecessor mosaic) - the layer is not co-registered to the basemap at that level.",
        "Photogeologic interpretation at 1:75,000 map scale based on morphology/tone/stratigraphy, not direct mineralogical measurements; unit boundaries are mapper-drawn and carry the quantified sliver gaps/overlaps.",
        "Published polygons are regional classification, not precise sample coordinates; they must not be converted into made-up sample sites.",
        "Display tiles are derived and resampled for legend readability, not a GIS replacement for the source shapefiles/geodatabase.",
      ],
    },
    {
      id: "jezero-ctx-esri",
      title:
        "Murray Lab CTX global mosaic (beta01) - Esri tiled web service",
      url: "https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer",
      agency:
        "NASA/JPL-Caltech/MSSS · Caltech Murray Lab · Esri (tiled service hosting)",
      instrument: "CTX (Context Camera)",
      product_id: "beta01",
      acquisition_date: null,
      sol: null,
      native_resolution_m: 5,
      processing_notes: [
        "Uncontrolled near-global CTX mosaic; imagery publicly released via the NASA Planetary Data System; Murray Lab grants free use of beta01 with credit NASA/JPL/MSSS/The Murray Lab.",
        "Service tiling scheme: equirectangular planetary grid (origin -180/90, 512 px tiles, level L resolution 0.3515625/2^L deg/px, levels 0-17), GCS Mars_2000_Sphere (sphere datum, so geodetic == planetocentric latitude).",
        "Display tiles /maps/jezero/ctx-tiles/{z}/{x}/{y}.png were derived by team/jezero/basemap/prepare_ctx_basemap.mjs: 351 standard Web-Mercator XYZ 256 px grayscale tiles, zooms 5-14, covering the supported extent + 0.05 deg margin, nearest-neighbour resampled from source levels L=z-2; no radiometric processing.",
        "SUPERSEDED 2026-11-14 (region v8) by the Mars 2020 TRN LVS controlled CTX mosaic (source jezero-mars-trek-ctx-lvs): once a controlled product covering the same extent was verified, the uncontrolled beta mosaic's seams and registration made it the weaker basemap. The former derived tiles under /maps/jezero/ctx-tiles/ were retired with the change; the service stays registered as an alternative and the derivation script is kept for reference.",
      ],
      limitations: [
        "Uncontrolled beta mosaic: seams, varying illumination and viewing geometry between orbits; not radiometrically calibrated.",
        "Superseded as the live basemap in region v8 (see processing notes); kept as a registered alternative source.",
        "Display-grade resampled tiles, not survey-grade; not a DEM and not terrain-safety evidence.",
        "Service-internal defect: ~20 corrupt source tiles in this window (see processing notes); coverage completed from a coarser level.",
      ],
    },
    {
      id: "jezero-mars-trek-ctx-lvs",
      title:
        "Mars 2020 TRN Lander Vision System controlled CTX mosaic (SOC_008, ~6 m/px) - NASA Mars Trek WMTS",
      url: "https://trek.nasa.gov/mars/",
      agency:
        "NASA/JPL-Caltech/MSSS · USGS Astrogeology Science Center · NASA Solar System Treks",
      instrument: "CTX (Context Camera), Mars Reconnaissance Orbiter",
      product_id: "JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0",
      acquisition_date: null,
      sol: null,
      native_resolution_m: 6,
      processing_notes: [
        "Product verified live 2026-11-14: the WMTS GetCapabilities document and REST tile endpoint https://trek.nasa.gov/tiles/Mars/EQ/{productLabel}/1.0.0/default/default028mm/{L}/{row}/{col}.png respond with image/png and Access-Control-Allow-Origin: *.",
        "Tiling scheme: equirectangular planetary grid, 256 px tiles, level 0 = 2 x 1 tiles, level L resolution 0.703125/2^L deg/px (tile span 180/2^L deg), levels 0-13. Product CRS Mars_2000_Sphere (sphere datum: geodetic == planetocentric), footprint 77.1605-77.6992 E, 18.2110-18.7212 N - wider than the region's supported extent.",
        "This is the Lander Vision System ('truth') mosaic built for Mars 2020 Terrain Relative Navigation: orthorectified on CTX stereo DTMs at the images' native ~6 m/px, and the same SOC_008/SOC_006 controlled product family as the audited TRN DTM already integrated in this region.",
        "Display tiles /maps/jezero/ctx-lvs-tiles/{z}/{x}/{y}.png derived by team/jezero/basemap/prepare_trek_basemap.mjs: 111 self-hosted 256 px Web-Mercator XYZ RGBA tiles, zooms 5-13 (5,950,878 bytes), nearest-neighbour sampled 1:1 from source level L = z-1, source alpha preserved (pixels west of the mosaic footprint are transparent). Report: team/jezero/basemap/ctx_lvs_report.json (156 source tiles decoded, 13 out-of-footprint requests, 0 gaps inside the footprint).",
      ],
      limitations: [
        "Display-grade basemap, not a DEM, geologic map, hazard map or terrain-safety product.",
        "Native ~6 m/px is not fully resolved at the z13 display ceiling (~10 m/px); extending to z14 with source level L13 is the documented next step.",
        "Controlled and orthorectified, but residual registration error versus surface operations is not quantified in this project.",
        "Web Mercator reads display latitude as geodetic; the documented planetocentric/geodetic display caveat (pending PPPCS review) applies.",
      ],
    },
    {
      id: "jezero-mars-trek-themis",
      title:
        "THEMIS daytime infrared controlled mosaic v2 (Oct 2018, ~100 m/px) - NASA Mars Trek WMTS",
      url: "https://trek.nasa.gov/mars/",
      agency:
        "NASA/JPL · Arizona State University (THEMIS) · NASA Solar System Treks",
      instrument: "THEMIS (Thermal Emission Imaging System), Mars Odyssey",
      product_id: "THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018",
      acquisition_date: null,
      sol: null,
      native_resolution_m: 100,
      processing_notes: [
        "Product verified live 2026-11-14 on the same Mars Trek WMTS endpoint (equirectangular grid, 256 px tiles, levels 0-9; level 9 resolution ~81 m/px). Responses are PNG color type 4 (grayscale + alpha) with CORS open.",
        "Display tiles /maps/jezero/thermal-tiles/{z}/{x}/{y}.png derived by team/jezero/basemap/prepare_trek_basemap.mjs: 7 self-hosted 256 px Web-Mercator XYZ RGBA tiles, zooms 5-9 (525,011 bytes), nearest-neighbour sampled 1:1 from source level L = z-1; above z9 the renderer upsamples the same source. Report: team/jezero/basemap/thermal_report.json (25 source tiles decoded, no gaps).",
        "Radiometric scaling: the service exposes no verified scaling for this mosaic, so the layer is presented as relative brightness only; no temperature or thermal-inertia value is published by this project.",
        "Alternative evaluated and rejected: the TES Thermal Inertia mosaic on Mars Trek (also PNG) has only levels 0-1 at ~3 km/px - far too coarse for a ~20-50 km region.",
      ],
      limitations: [
        "Relative daytime infrared brightness (qualitative, no units): no temperature, thermal-inertia, rock-abundance or dust-cover claim.",
        "Daytime IR mixes albedo and thermophysical properties; brightness contrasts are not by themselves a compositional or hazard classification.",
        "~100 m source resolution, upsampled above z9; display-grade only.",
      ],
    },
  ],
} satisfies RegionConfig;
