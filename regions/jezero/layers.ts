import type { ScientificLayer } from "@/lib/contracts/region";

// Region-owned content. Pending values are deliberately explicit.
// Five integrated data layers (CTX, Elevation, Slope, Geological units,
// Thermal) plus the recorded-traverse overlay; see the config
// display_transform notes for every derivation.
export const layers = [
  {
    id: "jezero-optical",
    type: "Optical imagery",
    display_name: "CTX basemap",
    kind: "optical",
    availability: "available",
    source_id: "jezero-mars-trek-ctx-lvs",
    observation_date: null,
    spatial_resolution_m: 6,
    coverage:
      "Mars 2020 TRN Lander Vision System controlled CTX mosaic (SOC_008, ~6 m/px) over the Jezero exploration area: derived display tiles cover 77.137-77.543 E, 18.352-18.570 N (Web-Mercator XYZ, zooms 5-13), from the NASA Mars Trek WMTS service's equirectangular source grid.",
    limitations:
      "Controlled mosaic: orthorectified on CTX stereo DTMs and tied to the Mars 2020 TRN control basis (the same SOC_006/SOC_008 product family as the audited terrain layer), so it is better registered than an uncontrolled global mosaic - but it is still a display basemap, not a DEM, geology layer or terrain-safety evidence. Display-grade: tiles nearest-neighbour resampled 1:1 from source level L=z-1 by team/jezero/basemap/prepare_trek_basemap.mjs; at z13 the display samples ~10 m/px, so the product's native ~6 m/px detail is not fully resolved at the zoom ceiling (raise max_zoom with source level L13 if that is needed). Source alpha is preserved (mosaic gaps transparent). Alignment shares the region display-transform caveats (planetocentric display latitude on Web Mercator; the mosaic's Mars_2000_Sphere datum makes geodetic == planetocentric there).",
    evidence: "Observed",
    attribution:
      "NASA/JPL-Caltech/MSSS · USGS Astrogeology · Mars 2020 TRN CTX LVS mosaic (SOC_008) · NASA Mars Trek",
    rendering: {
      kind: "raster-tiles",
      tiles: ["/maps/jezero/ctx-lvs-tiles/{z}/{x}/{y}.png"],
      tile_size: 256,
      min_zoom: 5,
      max_zoom: 13,
    },
    default_visible: true,
    default_opacity: 100,
    legend: null,
  },
  {
    id: "jezero-elevation",
    type: "Elevation",
    display_name: "Elevation",
    kind: "topography",
    availability: "available",
    source_id: "jezero-usgs-trn-dtm",
    observation_date: null,
    spatial_resolution_m: 1,
    coverage:
      "USGS Mars 2020 TRN HiRISE DTM mosaic (JEZ_hirise_soc_006, 1 m/px, DOI 10.5066/P9REJ9JN) over the Jezero exploration area: derived shaded-elevation display tiles cover 77.2229-77.4931 E, 18.4020-18.5197 N (Web-Mercator XYZ, zooms 5-14, 193 RGBA tiles; tile ranges span the region extent, data only within the footprint). Pixels outside the DTM footprint - including the supported extent's west margin, 77.1868-77.2229 E - are transparent (no terrain data there).",
    limitations:
      "Display-grade shaded elevation (hypsometric tint x analytic hillshade, sun 315 deg az / 45 deg alt, derived by team/jezero/terrain/build_terrain.mjs from the audited 1 m DTM), NOT the native 1 m posts and NOT a route-safety, hazard or engineering product. Vertical datum: areoid-relative meters, verified against the PLACES traverse (median DTM-PLACES offset +0.025 m, abs P95 4.3 m, 30,445 matched points; team/jezero/terrain/audit_terrain.mjs - all checks pass). Documented caveats: the far-west Jezero_CR stereo component (USGS-documented uncompensated y-parallax) carries a small positive bias (~+3 m mean, abs P95 ~4.9 m in the traverse bins crossing it); the FGDC published value range is understated - sampled values to -1639.971 m are real western-rim terrain confirmed by rover ground truth (PLACES sol 1354: -1786.0 m at 18.4575 N, 77.2685 E, matched within ~5 m). Ramp saturates at -2620/-1770 m (p2-p98 of the coverage); the display shares the region display-transform caveats (planetocentric display latitude on Web Mercator, pending the PPPCS ellipsoid review).",
    evidence: "Observed",
    attribution:
      "USGS Astrogeology Science Center · NASA/MRO HiRISE · Mars 2020 TRN DTM mosaic (DOI 10.5066/P9REJ9JN)",
    rendering: {
      kind: "raster-tiles",
      tiles: ["/maps/jezero/terrain-tiles/{z}/{x}/{y}.png"],
      tile_size: 256,
      min_zoom: 5,
      max_zoom: 14,
    },
    default_visible: false,
    default_opacity: 70,
    legend: {
      title: "Elevation (MOLA areoid-relative, hillshaded)",
      units: "m",
      items: [
        { label: "-2620 to -2400", color: "#5081b5" },
        { label: "-2400 to -2200", color: "#8dafa2" },
        { label: "-2200 to -2000", color: "#cec390" },
        { label: "-2000 to -1850", color: "#e7d6ac" },
        { label: "-1850 to -1770", color: "#f4e9d3" },
      ],
    },
  },
  {
    id: "jezero-slope",
    type: "Slope",
    display_name: "Slope",
    kind: "topography",
    availability: "available",
    source_id: "jezero-usgs-trn-dtm",
    observation_date: null,
    spatial_resolution_m: 1,
    coverage:
      "Slope derived from the same USGS Mars 2020 TRN HiRISE DTM mosaic (JEZ_hirise_soc_006, 1 m/px, DOI 10.5066/P9REJ9JN): display tiles cover 77.2229-77.4931 E, 18.4020-18.5197 N (Web-Mercator XYZ, zooms 5-14, 193 RGBA tiles; tile ranges span the region extent, data only within the footprint). Pixels outside the DTM footprint - including the west margin 77.1868-77.2229 E - are transparent (no terrain data there).",
    limitations:
      "Derived display measurement, not a hazard or trafficability product: slope = atan(sqrt((dz/dx)^2 + (dz/dy)^2)) computed by team/jezero/terrain/build_slope.mjs on the display pixel grid from bilinearly sampled DTM elevations, with Mars ground spacing (r = 3,396,190 m). The measurement baseline is therefore the display pixel size, not the native 1 m post: ~10 m at z14, ~19 m at z13, ~150 m at z10 and ~5 km at z5, so low zooms show a smoothed regional gradient and the same terrain reads slightly gentler as zoom decreases. Slope alone says nothing about bearing strength, rock abundance, sand trapping or rover trafficability; unknown terrain is not safe terrain. Vertical-datum caveats and the far-west CR stereo bias (~3-5 m) documented for the Elevation layer apply to the underlying elevations; the display shares the region display-transform caveats (planetocentric display latitude on Web Mercator).",
    evidence: "Observed",
    attribution:
      "USGS Astrogeology Science Center · NASA/MRO HiRISE · derived from the Mars 2020 TRN DTM mosaic (DOI 10.5066/P9REJ9JN)",
    rendering: {
      kind: "raster-tiles",
      tiles: ["/maps/jezero/slope-tiles/{z}/{x}/{y}.png"],
      tile_size: 256,
      min_zoom: 5,
      max_zoom: 14,
    },
    default_visible: false,
    default_opacity: 70,
    legend: {
      title: "Slope (display-derived, degrees)",
      units: "deg",
      items: [
        { label: "0 to 3", color: "#286b6d" },
        { label: "3 to 8", color: "#73ac81" },
        { label: "8 to 15", color: "#ecb967" },
        { label: "15 to 25", color: "#f0935c" },
        { label: "25 and steeper", color: "#c7513f" },
      ],
    },
  },
  {
    id: "jezero-geology",
    type: "Geology & mineralogy",
    display_name: "Geology (USGS SIM 3464)",
    kind: "geology",
    availability: "available",
    source_id: "jezero-usgs-sim3464",
    observation_date: null,
    spatial_resolution_m: 6,
    coverage:
      "USGS SIM 3464 geologic units (Sun & Stack 2020, 1:75,000, DOI 10.3133/sim3464) over the full published map area, 76.8-77.8 E, 17.7-18.7 N (~60 x 60 km, spanning Jezero crater and Nili Planum): derived display tiles cover the entire footprint (3,101 Web-Mercator XYZ tiles, zooms 5-14); pixels with no unit polygon are transparent.",
    limitations:
      "Published photogeologic interpretation at 1:75,000 map scale (evidence Interpreted: a published scientific classification), not direct mineralogical measurements - unit boundaries are mapper-drawn from CTX morphology/tone/stratigraphy. USGS documents ~100-200 m random offsets versus the July 2020 surface-operations CTX mosaic (map digitized on a semi-controlled predecessor), so the layer is not co-registered to the basemap at that level. Boundary completeness 99.92% (0.035% sliver gaps, 0.045% overlaps - published GIS digitizing artifacts, quantified by team/jezero/geology/audit_geology.mjs). Unit colors are display choices for legend separation, not the printed map sheet's lithology colors; the legend merges the data's single 'Crater riim unit' typo polygon into 'Crater rim unit'. Display-grade classification only - not a route/hazard product and not a source of precise sample coordinates.",
    evidence: "Interpreted",
    attribution:
      "USGS Astrogeology Science Center · Sun, V.Z., and Stack, K.M., 2020, USGS SIM 3464 · DOI 10.3133/sim3464",
    rendering: {
      kind: "raster-tiles",
      tiles: ["/maps/jezero/geology-tiles/{z}/{x}/{y}.png"],
      tile_size: 256,
      min_zoom: 5,
      max_zoom: 14,
    },
    default_visible: false,
    default_opacity: 70,
    legend: {
      title: "Geologic units (USGS SIM 3464, 1:75,000)",
      units: null,
      items: [
        { label: "Nue — Upper etched unit", color: "#D2B48C" },
        { label: "Nle — Lower etched unit", color: "#A9713C" },
        { label: "Nnp1 — Nili Planum 1 unit", color: "#9CB380" },
        { label: "Nnp2 — Nili Planum 2 unit", color: "#7A8B52" },
        { label: "Hnpf — Nili Planum fan unit", color: "#C97B4A" },
        { label: "NHjf1 — Jezero fan 1 unit", color: "#3D7AB8" },
        { label: "NHjf2 — Jezero fan 2 unit", color: "#6FA8DC" },
        { label: "Njf — Jezero floor unit", color: "#9BD3C8" },
        { label: "su — Smooth unit, undivided", color: "#CDD6D0" },
        { label: "Nrb — Rugged bright unit", color: "#D8CFC0" },
        { label: "Aeb — Eolian bedform unit", color: "#E8D9A0" },
        { label: "cr — Crater rim unit", color: "#8A6642" },
        { label: "ci — Crater interior unit", color: "#6B4F4F" },
        { label: "ce — Crater ejecta unit", color: "#BFBFBF" },
      ],
    },
  },
  {
    id: "jezero-thermal",
    type: "Thermal",
    display_name: "Thermal (THEMIS daytime IR)",
    kind: "thermal",
    availability: "available",
    source_id: "jezero-mars-trek-themis",
    observation_date: null,
    spatial_resolution_m: 100,
    coverage:
      "THEMIS daytime infrared controlled mosaic v2 (Oct 2018, ~100 m/px) over the Jezero exploration area: derived display tiles cover 77.137-77.543 E, 18.352-18.570 N (Web-Mercator XYZ, zooms 5-9; above z9 the renderer upsamples the same source).",
    limitations:
      "Relative daytime infrared brightness only (qualitative): the mosaic ships no verified radiometric scaling, so no temperature, thermal-inertia, rock-abundance or dust-cover values are asserted - the legend deliberately has no units. Daytime IR mixes albedo and thermophysical properties, so bright/dark patches are not by themselves a compositional or hazard classification. Not a thermal-inertia product: the TES inertia map (3 km/px) is far too coarse for this region and is not used. Display-grade: tiles nearest-neighbour resampled 1:1 from source level L=z-1 by team/jezero/basemap/prepare_trek_basemap.mjs; the ~100 m source is upsampled above z9. Source alpha is preserved. The display shares the region display-transform caveats (planetocentric display latitude on Web Mercator).",
    evidence: "Observed",
    attribution:
      "NASA/JPL · Arizona State University · THEMIS daytime IR controlled mosaic v2 · NASA Mars Trek",
    rendering: {
      kind: "raster-tiles",
      tiles: ["/maps/jezero/thermal-tiles/{z}/{x}/{y}.png"],
      tile_size: 256,
      min_zoom: 5,
      max_zoom: 9,
    },
    default_visible: false,
    default_opacity: 70,
    legend: {
      title: "Relative daytime infrared brightness (qualitative)",
      units: null,
      items: [
        { label: "Dark", color: "#1b1b1b" },
        { label: "Mid-dark", color: "#4d4d4d" },
        { label: "Mid", color: "#808080" },
        { label: "Mid-bright", color: "#b3b3b3" },
        { label: "Bright", color: "#e6e6e6" },
      ],
    },
  },
  {
    id: "jezero-traverse-recorded",
    type: "Recorded rover traverse",
    display_name: "Recorded rover traverse",
    kind: "overlay",
    availability: "available",
    source_id: "jezero-m2020-places",
    observation_date: "2021-02-18/2026-06-21",
    spatial_resolution_m: null,
    coverage:
      "Perseverance recorded traverse, sols 0-1897 (PLACES release 16), Jezero Crater exploration area; 77.217-77.463 E, 18.422-18.500 N (planetocentric). Approximate recorded path 42.785 km.",
    limitations:
      "Recorded rover traverse, not an astronaut route and not terrain-safety evidence. Display-grade pending basemap-alignment review (product planetodetic column defective; see region display_transform notes), not survey-grade. Localization accuracy per the Rover PLACES SIS. Display vertices thinned to ~10 m spacing; no slope/terrain information is implied.",
    evidence: "Observed",
    attribution:
      "NASA/JPL-Caltech · Mars 2020 Rover PLACES Bundle, PDS Geosciences Node (urn-nasa-pds-mars2020_rover_places, release 16)",
    rendering: {
      kind: "geojson",
      url: "/maps/jezero/perseverance-traverse.geojson",
      geometry: "line",
      color: "#D6DEE8",
    },
    default_visible: true,
    default_opacity: 90,
    legend: {
      title: "Recorded Perseverance traverse",
      units: null,
      items: [
        {
          label: "Recorded rover traverse (sols 0-1897, PLACES release 16)",
          color: "#D6DEE8",
        },
      ],
    },
  },
] satisfies ScientificLayer[];
