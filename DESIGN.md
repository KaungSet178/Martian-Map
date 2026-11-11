# Marswalk Design System

**NASA Space Apps Challenge · Interplanetary Survival Guide: Martian Map**

Marswalk is a tablet-first planning and rehearsal tool for a simulated astronaut surface excursion. It brings terrain, science targets, and return estimates into one map so an explorer can decide where to go, what to investigate, and when to turn back.

The visual direction is a dark mission console with real Mars imagery, cyan routes, and restrained amber alerts. The map takes priority over decorative elements. This document specifies the intended design. Jezero is the reference experience, and each site exposes the capabilities supported by its verified data coverage.

## Mission areas

Use a regional overview to establish location and a detailed map to plan within each mission area. Set the detailed extent from the mission footprint and available data. The Jezero demo tile can serve as the first high-detail section inside the broader Perseverance area.

| Site | Detailed map focus | Science question to guide proposed stops | Mission overlay |
| --- | --- | --- | --- |
| **Jezero Crater** | Perseverance landing and exploration area, including the western delta | What can delta sediments and nearby rocks reveal about the ancient lake and its past habitability? | Recorded Perseverance traverse. [NASA mission map](https://science.nasa.gov/mission/mars-2020-perseverance/location-map/) |
| **Gale Crater** | Curiosity corridor around lower Mount Sharp | How do changes from clay-bearing to sulfate-bearing rocks record changing water conditions? | Recorded Curiosity traverse. [NASA mission map](https://science.nasa.gov/mission/msl-curiosity/location-map/) |
| **Oxia Planum** | Planned Rosalind Franklin landing and exploration area | Which clay-rich units and subsurface sampling targets could help reconstruct past habitability? | Published planned landing area, with hypothetical astronaut stops labeled separately. [ESA rover mission](https://www.esa.int/missions/about-us/directorates/human-and-robotic-exploration/mars/exomars/rosalind-franklin-rover) · [ESA geological mapping](https://www.esa.int/articles/about-us/directorates/human-and-robotic-exploration/best-geological-map-for-a-european-rover-on-mars) |

Show detailed planning controls wherever the selected terrain product supports them. Elsewhere, show the regional overview and available layers with an explanation of the planning limit. Use the same map symbols, panel structure, and status language at all three sites.

## Experience

| View | What the user sees | Primary action |
| --- | --- | --- |
| **Choose a site** | Three image-led mission cards, each with a science question and available planning capability. Oxia carries a “Planned mission area” label. | Open map |
| **Explore map** | Optical basemap, science stops, mission footprint, layer controls, north arrow, scale bar, and active legend. | Inspect a science stop or switch layers |
| **Plan excursion** | Start and return point, ordered stops, selected route, slope profile, route assumptions, and return margin. | Compare candidate routes or start simulation |
| **Rehearse excursion** | Simulated position, next stop, mission status, return ETA, and reserve margin. Show “Simulation · No navigation fix” next to the position or in the persistent status bar. | Advance simulation or inspect return route |
| **Review plan** | Ordered stops, estimated distance and time, return assumptions, coverage limitations, and source links. | Return to plan |

### Layout

- **Tablet landscape and desktop:** Use a full-height map with a compact header. Keep the site selector and data status in the header, map controls at an edge, and the current task in a 320–360 px side panel. Collapse that panel into a short route summary during rehearsal. Expose route comparisons, settings, and evidence on demand.
- **Narrow screens:** Use a bottom sheet with a collapsed summary and an expanded detail state. Keep zoom controls and the legend above the sheet. At 390 px, the map, selected stop, return status, and primary action must remain usable without horizontal scrolling.
- **Persistent map furniture:** Keep north, scale, coverage, and the active legend accessible at every zoom level. Place floating text on an opaque or near-opaque surface. Preserve map position, selected stop, and route when opening details.

## Visual language

Use deep navy for chrome and let rust and ochre come from credited Mars imagery. A faint star field can appear behind the site picker. The planning workspace uses plain surfaces. Use a real orbital crop per mission card with credit and data provenance. Label any illustrative image shown outside the map.

| Token | Color | Use |
| --- | --- | --- |
| `--color-bg` | `#09111F` | App background and map loading |
| `--color-surface` | `#111D30` | Panels, sheets, map controls |
| `--color-surface-raised` | `#1B2A40` | Selected cards and elevated controls |
| `--color-border` | `#334761` | Surface separators |
| `--color-control-border` | `#647C9A` | Interactive outlines |
| `--color-text` | `#F0F5FC` | Primary text |
| `--color-text-muted` | `#A8B8CD` | Supporting text and metadata |
| `--color-route` | `#59E3FA` | Selected route, primary action, keyboard focus |
| `--color-science` | `#D0BDFF` | Science markers |
| `--color-caution` | `#FFC36B` | Limited margin or partial coverage |
| `--color-critical` | `#FF8D9A` | Return threshold exceeded or route blocked |
| `--color-history` | `#D6DEE8` | Recorded rover traverses |

- Use **Geist** for interface text and **IBM Plex Mono** with tabular figures for coordinates, timestamps, and route metrics. Use local font files or system fallbacks so the offline demo remains readable.
- Use a 28–32 px view title, 20 px section titles, 15–16 px body text, and 13–14 px metadata. Use sentence case. Reserve uppercase for short labels where space is limited.
- Use spacing steps of 4, 8, 12, 16, 24, and 32 px. Use 8 px corners on controls and 12 px corners on panels.
- Use one primary action per panel. Place dark text on filled cyan buttons. Pair every status color with a label or symbol. Keep transitions short and honor reduced motion.

## Map layers

Start with the optical basemap, science stops, and mission context. Let users add hillshade or slope during route planning. Keep science overlays optional and display their units and legend only when active.

| Layer | User question | Candidate data | Display |
| --- | --- | --- | --- |
| **Optical imagery** | What landmarks and surface features can I identify? | MRO CTX for regional context and HiRISE where coverage permits | Natural or grayscale basemap, with source and resolution |
| **Topography** | Where does the terrain steepen or change elevation? | A site-specific digital terrain model, with MOLA for regional relief where appropriate | Hillshade, slope in degrees, optional contours, and a route elevation profile |
| **Mineralogy and geology** | Where are the geological units or mineral signatures relevant to my science stops? | MRO CRISM products or published geological maps, including ESA-supported Oxia mapping | Bounded overlays with a categorical legend and product-specific attribution |
| **Thermal context** | What does the available observation tell me about this surface? | Mars Odyssey THEMIS products where available | Label the actual quantity, such as surface temperature in K or thermal inertia, and attach the observation context |

Treat weather and radiation as context cards when supported. Use historical MEDA observations for Jezero and REMS or RAD observations for Gale when relevant products are available. Show measurement location and date or sol. Use a scenario label for modeled conditions or exposure estimates, with the basis and units in the details. Keep any operational readout tied to the simulation.

### Cartography and evidence

| Map object | Symbol |
| --- | --- |
| Selected astronaut route | Solid cyan line with dark casing |
| Alternate candidate route | Thinner dashed cyan line with a route label |
| Recorded rover traverse | Dotted neutral line with mission label |
| Planned landing area | Dashed boundary with a “Planned” label |
| Science stop | Violet diamond with its stop number |
| Start and return point | Labeled ring, with a distinct glyph for each when they differ |
| Terrain coverage limit | Dashed outline and hatched uncovered area |
| Terrain caution | Amber hatch with a text label and visible legend |

Use a consistent display order from imagery and thematic overlays through route lines, markers, and labels. Give selected routes and critical markers enough casing to stay visible against bright terrain. Allow one full thematic overlay at a time by default, with opacity control where it supports comparison.

Expose source details from the layer legend or target card. For each layer record the agency, instrument or dataset, product ID or source URL, acquisition date or sol when supplied, native resolution where available, processing, and coverage. State the coordinate convention used. Document any reprojection or derivation in the layer details.

| Evidence label | Meaning | Example |
| --- | --- | --- |
| **Observed** | Direct source observation or published mission record | Orbital image or rover measurement |
| **Derived** | Product calculated from source data, with method available | Slope derived from a terrain model |
| **Interpreted** | Published scientific classification or interpretation | Geological unit on a map |
| **Modeled** | Estimate from stated inputs | Return ETA or oxygen estimate |
| **Scenario** | Demonstration input or hypothetical mission object | Simulated position, start location, or proposed stop |
| **Unavailable** | Value or coverage missing for this selection | Radiation estimate with insufficient inputs |

Use these labels on individual values when a panel mixes multiple evidence types. Show coverage gaps explicitly. Use units consistently and match displayed precision to the underlying data.

## Planning, rehearsal, and offline states

- **Science stop card:** Show the question, why the target matters, a proposed field activity, supporting evidence, and “Add stop.” Use source-backed imagery when available. Indicate if the stop is outside the supported planning area.
- **Route summary:** Lead with distance, estimated return time, and remaining reserve. Show the slope profile and its source, then oxygen, battery, or radiation estimates when inputs exist. Explain reserve margin as the amount left after modeled return demand and the configured reserve. Label its units and the limiting resource.
- **Candidate comparison:** Compare routes using the same assumptions and units. Explain meaningful differences such as longer distance, greater ascent, or incomplete coverage. Label both selected and alternate paths as candidate astronaut routes. A recorded rover track supplies historical context.
- **Coverage gap:** Mark the affected segment and identify the missing input. Suppress dependent safety or resource estimates where coverage is insufficient. Keep the map and available evidence usable.
- **Return state:** Use “Return margin within scenario limits,” “Low return margin,” or “Return threshold exceeded.” Show the reason next to the status and make the return route easy to inspect. When inputs are missing, use “Return margin unavailable.” This prototype supports rehearsal and comparison of candidate routes.
- **Offline mode:** Show which mission area is saved, the pack version, and its included layers. A saved pack should open the map, controls, cached evidence, and supported planning without connectivity. If a layer was never saved, show “Unavailable offline” beside it and keep the cached layers accessible. Distinguish loading, missing coverage, and connection failure in the interface.

## Accessibility and demo acceptance

- Meet WCAG AA text contrast targets and provide visible focus. Aim for 44 × 44 px touch targets on frequently used controls. Give map buttons descriptive accessible names.
- Support keyboard operation for site selection, layers, zoom, stops, and dialogs. Provide an ordered stop list and a text route summary alongside the map. Support button alternatives for gesture-dependent or drag-only actions.
- Confirm that route lines, science stops, rover history, and coverage limits remain distinguishable against light and dark terrain, including in grayscale.
- Verify that a user can open Jezero, inspect a science target and its source, toggle a terrain layer, compare two supported candidate routes, and rehearse a return decision.
- Verify that Gale presents the Curiosity corridor and Oxia presents a planned landing area. In each site, test a coverage boundary and confirm that route estimates reflect the available data.
- At tablet and narrow widths, verify that the map legend, selected stop, return status, and main action are reachable. Reopen a saved mission pack with networking disabled and check the missing-layer state.

## Reference catalogs

- [NASA Planetary Data System](https://pds.nasa.gov/) and [USGS Astrogeology data and instruments](https://www.usgs.gov/centers/astrogeology-science-center/science/instruments-data-and-software).
- [NASA Open Data · Mars Reconnaissance Orbiter products](https://data.nasa.gov/dataset/?tags=crism&tags=ctx&tags=hirise&tags=pds) and [Arizona State University · Mars Global Data](https://global-data.mars.asu.edu/).
