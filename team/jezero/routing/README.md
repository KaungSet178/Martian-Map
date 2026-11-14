# Jezero routing integration notes

The TypeScript engine is used by the I3A application. `build_routing_grid.py` and the committed numeric grid retain the original authentic DEM processing lineage.

The upstream `validate_real_routing.py` and `real_routing_validation.json` are retained source-branch replay evidence. That Python replay mirrors the original compressed X-coordinate conversion. Its PASS status is not independent proof of the corrected I3A runtime geography.

For current shared-runtime numerical validation, run the real integration tests and `scripts/verify-routing-independent.py` as documented in `docs/MAP_ROUTING_FEATURE_INTEGRATION_REPORT.md`. The independent validator checks actual shared-worker coordinates against numeric grid cells and original native TIFF pixel centers/block means, along with connectivity, snapping, metrics and documented cost functions. Absolute registration remains unverified.
