# Original and derived records

- `pds-dem.xml`: unmodified PDS4 v42.0 label, actual authoritative product layout.
- `pds-dem-headers.bin`: first 53,928 source bytes (ODL/VICAR headers only).
- `pds-subset.json`: original bounded-range receipt, window, byte hash and validity.
- `hirise-candidate.lbl`: individual DTM label; **rejected for integration**.
- `hirise-candidate-subset.json`, `hirise-reference-check.json`: bounded-candidate
  audit and paired comparisons; raw raster caches are outside Git.
- `local-image-registration.json`: actual PDS-vs-CTX sampled check, including an
  **unapplied** diagnostic translation search, not a correction or survey result.
- `aoi-registration-review.json`: small alternative corridor-window checks;
  rover positions select AOIs only, not science-target coordinates.
- `processing-audit.json`: **derived** mask, formula, statistics and tile manifest.

Read [G3_2_DEM_AUDIT.json](../../G3_2_DEM_AUDIT.json) and
[G3_2_REPORT.md](../../G3_2_REPORT.md) before using these data. PDS's generic `DN`
tag is interpreted using the PLACES SIS physical DEM definition (metres relative
to MOLA areoid). Coordinate precision is not accuracy. CTX co-registration is
unverified locally. Never treat these slopes as safety or routing eligibility.

Original full products are available from their recorded agency URLs; no large
original rasters ship. The `.gitattributes` rules retain source/audit bytes across
Windows/Unix checkouts. Derived PNGs credit NASA/JPL-Caltech, PDS PLACES, USGS,
HiRISE/CTX and Marswalk processing; no NASA endorsement is implied.
