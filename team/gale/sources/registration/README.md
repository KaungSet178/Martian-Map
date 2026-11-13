# Registration-investigation evidence

Read [the focused report](../../REGISTRATION_INVESTIGATION.md).

- `inputs.json`: pinned input URLs, hashes and metadata availability.
- `pds-band-receipt.json`: exact bounded native-image transfer, original response
  headers; the 28 MB source bytes remain in ignored output.
- `pds-map-headers.bin`: original first 53,920 bytes, metadata only; preserves
  fixed-record padding for independent GDAL parsing.
- `mission-checkpoints.csv`: seven original mission observer rows; no new target
  coordinates or image control points. Full-source hash in `inputs.json`.
- `measurements.json`: reviewed **derived** results from the offline investigation.
- `verification.json`: test-result record, separate from reproducible scientific measurements.
- `trek-config.json`, `trek-ctx-abstract.html`, `usgs-ortho-decoded.html`: source
  metadata snapshots; the USGS HTML is HTTP-content-decoded, not a new data product.
- `live-source-checks.json`: two exact live CTX input checks and header receipt.
- `mobile-opacity-probe.json`: independent UI transition diagnostic, not a Mars
  measurement and not evidence of a source-data shift.

No archive raster, source PNG pack or full CSV is committed. Diagnostic offsets
are sampling hypotheses only; none is applied to geometry. Exact CTX native
control lineage and precise local registration remain unavailable. Byte-preserving
Git attributes retain the source metadata and fixed records across platforms.
