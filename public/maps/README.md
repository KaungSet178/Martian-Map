# Region-owned display assets

Place small, reviewed assets in `gale/`, `jezero/` or `oxia/` when they exist, owned by
that region's developer. Reference them as `/maps/<region>/<file>` from layers.ts.
No scientific assets are bundled yet, so empty regional directories are not committed.

Use documented HTTPS object storage for large rasters and tile pyramids. Do not commit
original DEM/GeoTIFF downloads or generated caches. GeoJSON and tiles must have a
reviewed Mars-to-display transform, exact attribution and footprint/source records.
See docs/REGION_DEVELOPMENT_GUIDE.md and TEAM_CONTRACT.md.
