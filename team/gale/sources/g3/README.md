# G3.1 source and audit inventory

The selected scientific original is separate from the derived application asset.
All files here are small metadata/audit records except the original 94,771-byte ZIP.
No extracted geodatabase, Python packages, image-range cache or build cache is
committed.

| File | Origin / purpose |
| --- | --- |
| `Geomap.gdb.zip` | Joel Davis (2025), original file 58896958, [Figshare v1](https://doi.org/10.6084/m9.figshare.30401788.v1), CC BY 4.0 |
| `arc-pass-source-metadata.json` | Unmodified [pinned source API response](https://api.figshare.com/v2/articles/30401788/versions/1), including license, size and published MD5 |
| `arc-pass-gis-inspection.json` | FileGDB feature-class inventory, actual WKT, bounds, geometry checks and attributes |
| `arc-pass-processing.json` | Reproducible selected-layer conversion, counts, topology, independent inverse checks and output hash |
| `meyer-source-metadata.json` | Unmodified [GSA supplement API response](https://api.figshare.com/v2/articles/25938268); not an implemented layer |
| `meyer-gis-inspection.json` | Eight actual shapefile inspections; coordinate units and bounds differ by file |
| `fedo-source-metadata.json` | Unmodified [Zenodo API response](https://zenodo.org/api/records/7041712); actual map product is an ungeoreferenced JPEG |
| `hughes-doi-metadata.json` | Unmodified [DataCite response](https://api.datacite.org/dois/10.7936/0cyw-3n10), resolving the newer archive location |
| `usgs-global-metadata.xml`, `usgs-global-readme.txt` | Original [SIM 3292 metadata](https://pubs.usgs.gov/sim/3292/downloads/sim3292_metadata.xml) and readme; 1:20M global map, not selected |

The register records original download URLs, formats, SHA-256, sizes, CRS,
footprints and verification stages. The nonselected Meyer archive and Fedo JPEG
remain in ignored `output/g3-geology/raw/`; stable download URLs and checksums
allow retrieval independently. Do not interpret publication/download availability
as render approval.

To reproduce selected GIS checks and GeoJSON, install `../requirements-g3.txt`
in an audit environment and run `python team/gale/prepare_g3_geology.py` from
the repository root. It stops if the pinned original changes. It does not fetch
mutable scientific files during the application build.

For the separate PDS image diagnostic, run
`python team/gale/verify_g3_registration.py --download` after processing. This
retrieves a bounded ~28 MB range only when absent from cache, checks the pinned
PDS label and range hash, and draws native-coordinate outlines without shifting.
The image is a diagnostic, not an extra basemap or a new geometry source.

Attribution: Joel Davis (2025), *GIS Shapefiles of Arc Pass, Mars*, DOI
10.6084/m9.figshare.30401788.v1; associated Davis et al. (2026), DOI
10.1029/2025JE009538. Changes: Marswalk inverse projection/display styling,
constant-zero Z omission and attribute selection described in the report.
PDS reference imagery: NASA/JPL-Caltech/University of Arizona. Scientific
interpretations remain those of the source authors; no endorsement is implied.
