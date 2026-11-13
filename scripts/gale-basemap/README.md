# G5 scientific preparation

This directory is an offline audit, not an enabled basemap or a tile generator.
It writes only ignored `output/gale-basemap/`. No app, camera, scientific layer,
waypoint or original imagery changes are made.

## Reproduce

From the repository root, with Python 3.13:

```powershell
python -m pip install -r scripts/gale-basemap/requirements.txt
python -B scripts/gale-basemap/audit.py --download --gray-window 72000 154000 128 128
python -B scripts/gale-basemap/audit.py --gray-window 72000 154000 128 128
python -B -m unittest discover -s tests -p test_gale_*.py -v
```

The first command with `--download` fetches missing ranges. The next replays
SHA-256-checked caches without network. The checked-in audit pins ETags, total
object lengths, source URLs and individual range digests. Changed source bytes
or object identities require a new scientific review; do not delete pins to
force a changed product through the audit. Multipart ETags are not MD5 checksums.

Every raster request requires HTTP 206 and exact Content-Range. Mask requests
also require exact Content-Length. The server is checked before consuming the
body. A shared 64 MiB budget is charged before scheduling reads. The audit parses
classic TIFF/BigTIFF directories explicitly, then lets GDAL parse the actual
GeoKeys from an in-memory header containing no image payload. Unsupported tag
layouts, SubIFDs, masks, projections and incomplete responses fail closed.

Grayscale is uncompressed, one row per strip. The optional native window reads
only the requested columns of each row using verified strip offsets; there is
no TIFF-wide, full-strip or full-source download. Values, source NoData, source
CRS and translated affine origin are preserved in a research GeoTIFF. Even a
small subrow extraction requires one HTTP request per native row. Full-overview
native extraction would require about 57,320 requests and 1.55 GB of DN data;
this audit does not perform it. Use an explicitly budgeted offline job or obtain
a tiled/COG grayscale derivative from the source provider before production
preparation. A coarse published browse image cannot establish native coverage.

Color native mask payloads total about 311 KB over this overview, but their
offsets span about 770 MB because JPEG blocks are interleaved. The audit fetches
5,989 individual mask ranges with 32 persistent HTTP workers. This is a one-time
offline audit, not a browser access strategy. All intersecting 1-bit native mask
blocks are decoded, including holes; fractional edge overlap is area-weighted.
Full validity is not proof of full RGB-strip contribution or ground accuracy.

## Release gates and deferred tile procedure

Before enabling alternatives, measure grayscale valid coverage, establish
distributed feature correspondences with uncertainties and held-out points,
audit color-versus-grayscale and grayscale-versus-CTX at matched image support,
and review constituent resolution/processing footprints. Shared control lineage
alone does not close these gates. Do not fit a cosmetic translation.

Only after these gates:

1. Prepare a bounded, masked, source-specific subset outside `public/`. Keep the
   original inputs and hashes; preserve each product's affine origin.
2. Use the existing XYZ angular display encoding. For global output pixel
   centers `u=x*256+i+0.5`, `v=y*256+j+0.5`, `S=256*2^z`, use
   `longitude=360*u/S-180`, `latitude=atan(sinh(pi*(1-2*v/S)))`. This is display
   math, never an Earth geodetic CRS. Gale's source longitude is unchanged by
   conversion between -180..180 and 0..360 conventions.
3. Evaluate the actual source projection, then invert its affine to source
   pixel-edge coordinates. Account for the center offset exactly once. Use
   area-weighted downsampling over genuine valid support; do not sparsely sample
   a fine source and call it a coarse average. Do not sharpen or fill gaps.
4. Build transparent, compressed static tiles and a native validity footprint.
   Measure tile bytes/count, seams and supported detail; independently test tile
   pixel centers and provenance before copying a small release into `public/`.
5. Integrate a mutually exclusive selector using the latest reviewed M3 code.
   CTX remains the default until registration is justified. Keep a CTX underlay
   only for missing/transparent alternative coverage and indicate fallback.
   Preserve existing optical opacity, layer order and all mission/camera state.
6. Test missing tile/network behavior, all overlays, marker coordinates,
   trajectory geometry, attribution and all four viewport sizes. Do not mark
   these alternative-mode tests passed while no alternatives are integrated.

No USGS zoom range, tile footprint, browser memory measurement or performance
gain is published by this preparation. The existing CTX z5–13 pyramid is intact.
See `docs/GALE_BASEMAP_UPGRADE_REPORT.md` for evidence and remaining blockers.
