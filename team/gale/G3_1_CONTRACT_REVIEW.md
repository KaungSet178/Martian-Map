# G3.1 shared renderer handoff

Baseline: `f102e81`. No regional manifest, target, mission-v1 or registry API was
replaced. Jezero and Oxia files/assets are untouched. Their existing manifest
records parse without new fields. This handoff records the small compatible
changes authorized by the G3.1 brief; external teammate approval is not claimed.

The shared renderer already supported GeoJSON fills, opacity, cleanup and source
attribution. The layer manager already supported a categorical-looking legend.
It lacked a way to bind each source category to its color, describe a category,
or open a tiny mapped area at a useful zoom. The following optional additions
reuse those interfaces:

| Contract field | Behavior |
| --- | --- |
| `geojson.category_property` | Source attribute used in a MapLibre `match` fill expression |
| `geojson.focus_extent` | Reviewed Mars geographic extent; enabling the layer fits it using existing measured furniture padding |
| `geojson.max_zoom` | Optional close-view camera limit; does not imply imagery resolution |
| `legend.items[].value` | Exact source category matched to that item's color |
| `legend.items[].description` | Scientific interpretation/source-code explanation shown beside legend entry |

Categorical fills require a nonempty legend with unique source values. Existing
uncategorized fills retain their old solid styling; missing fields do not enable
new behavior. Unknown categories use the declared fallback color. Scientific
asset tests check that the selected asset's exact codes equal its legend values.

Enabling an opted-in layer fits its footprint once. Opacity edits, repeated renders
and panel resize do not recenter it. Fit exploration region still restores the
original reviewed regional overview. There is no camera hard boundary. Native
pan, wheel, touch and keyboard handlers remain unchanged.

`kind: overlay` now remains visible alongside a thematic layer, like optical
context. This permits the historical Curiosity traverse to accompany geology.
Geology/topography/thermal remain mutually exclusive thematic selections. No
other region currently has an available historical overlay, so their current
selection behavior is preserved. A renderer/contract regression covers coexistence.

Unit information is inspected through the existing legend, beside the map;
there is no new map-click modal, target geometry interface, renderer or regional
shell. Source codes stay visible. Coverage and limitations are displayed in the
layer panel. Revisit shared contracts with all regional developers before adding
target polygons, per-feature interactions, vector tiles, DEM/slope, mineralogy,
timelines or comparison tools.
