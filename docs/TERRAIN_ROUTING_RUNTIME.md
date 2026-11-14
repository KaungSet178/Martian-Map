# Terrain routing runtime

Use a full Node.js >=20.9 server and Python >=3.11. Static-only export and an Edge runtime cannot execute the Gale Python engine. Python needs numpy, rasterio and pyproj; a separately running FastAPI service is not required.

```powershell
npm.cmd ci
python -m pip install -r requirements-routing-runtime.txt
npm.cmd run routing:check
npm.cmd run dev -- --port 3219
```

For production:

```powershell
npm.cmd run build
npm.cmd run routing:check
npm.cmd run start -- --port 3219
```

`predev` and `prebuild` compile the unchanged Jezero A* implementation (with the documented georeferencing/validity corrections) into `.routing/jezero-worker.cjs`. Node invokes that bundle as a bounded child process. Gale runs `scripts/gale-route-runtime.py`, which calls the original Python engine directly. Set `MARSWALK_PYTHON` to an explicit interpreter executable if `python` is not on the server PATH. Neither engine needs the original 1.8 GB Jezero DEM or full Gale raw mosaic at runtime.

Runtime inputs are the committed compact numeric GeoTIFFs in `data/routing/gale/` and the 3.2 MB numeric Jezero JSON grid. The Gale loader checks manifest hashes; the Jezero worker checks `data/routing/integration-manifest.json`. The Next.js route trace explicitly includes these assets, the Python sources/adapter, and the generated Node worker. Deployments must preserve their repository-relative layout and provide the Python runtime/libraries. No grid is served from public/ or imported by a client component.

`POST /api/terrain-route` accepts a region-owned waypoint plan, selected source, and snap bound. Requests are limited to 32 KiB and 2-12 unique ordered waypoints. Each process permits two workers, a 45-second calculation timeout, and 16 MB output; request cancellation kills the child. Busy/missing-data/missing-dependency errors leave routing unavailable. The UI ignores stale responses. No failure is replaced with a geometric route.

Open Plan -> Surface Waypoints. Place map waypoints or use manual coordinate entry, then Calculate terrain routes. Compare Shortest distance and Lower terrain cost. Canonical summaries use Mars-sphere horizontal steps plus DEM elevation differences for 3D distance. Native horizontal objectives, costs, cell-slope statistics, source coverage, snapping and registration caveats remain separately available. The 25-degree Jezero barrier is a computational rule, not astronaut certification.

Reopened/imported plans contain a versioned preference/source/snap receipt and scenario assumptions, not trusted terrain geometry. Recalculate against the current numeric grid and model version. Old schema-v1 missions without receipts remain supported. User speed and resource coefficients are optional scenario inputs; no empirical astronaut consumption model is supplied. Registration and mission feasibility remain unverified even when a graph path exists.
