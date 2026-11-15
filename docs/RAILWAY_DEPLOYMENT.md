# Marswalk Planner on Railway

Deployment branch: `deploy/railway-marswalk`, based on release commit
`dbc755284d8dc8bc61d243de9f4fad023da0d187`.

## Connect and deploy

1. In Railway, create a project from GitHub repository
   `KaungSet178/Martian-Map`. Select `deploy/railway-marswalk` as the service's
   source branch **before deploying**. Keep the root directory at `/`.
2. Use the root `Dockerfile` (Railway detects it automatically). Leave build and
   start command overrides empty. There is one service; no database, volume,
   FastAPI service, or local Docker installation is required.
3. Set the service healthcheck path to `/api/health`, with a 300-second timeout.
   No application secrets are required. Railway supplies `PORT`; the image binds
   `0.0.0.0` and reads that value. Keep `HOSTNAME=0.0.0.0` and the image's
   `MARSWALK_PYTHON=/opt/routing-venv/bin/python` if adding variable overrides.
4. Deploy the branch. Confirm build logs show the Next.js production build,
   successful Python dependency installation, and the final Gale/Jezero runtime
   check. Do not override the Docker command `node server.js` with `npm start`.
5. Under service Settings > Networking > Public Networking, choose **Generate
   Domain**. Use the service's listening port (`PORT`) if asked for a target port.
   Open the resulting HTTPS URL and perform the acceptance checks below.

## Image contents

- Node.js 22 / Debian Bookworm and Python 3.11 in `/opt/routing-venv`.
- All libraries in `requirements-routing-runtime.txt`: NumPy, Rasterio, PyProj.
  Binary wheels include their GDAL/PROJ dependencies; `pip check` runs at build.
- Next.js 16 standalone server, `.next/static`, and **all** of `public/`, including
  every region's tiles, scientific assets, photographs, and generated MapLibre worker.
- All of `data/`, including both Gale routing GeoTIFFs, dataset checksums,
  Jezero's numeric routing grid and integration manifest.
- `team/gale/routing`, `scripts/gale-route-runtime.py`, and the generated
  `.routing/jezero-worker.cjs`. Their original relative paths are preserved.
- A non-root runtime user. The final image runs the existing checksum audit and
  genuine Jezero A* calculation during build; missing runtime dependencies fail
  the build. No dataset downloads occur at request time.

`/api/health` returns HTTP 200 with `{"status":"ok","service":"marswalk-planner"}`.
It is a lightweight liveness endpoint, not a per-request scientific dataset audit.

## Verification before handoff

On Node.js 22.20.0 and Python 3.13 locally:

- All 507 top-level TypeScript tests passed, with no failures or skips. These cover
  routing, scientific site restrictions, EVA, mission integrity, Save/Open and exports.
- `npm run typecheck`, `npm run lint`, `npm run build`, and
  `npm run routing:check` passed.
- Packaged standalone server tested on `0.0.0.0:3217` using `PORT`: homepage,
  health endpoint, MapLibre worker, and sample tiles from all three regions returned
  200. Genuine Gale and Jezero HTTP route calculations returned numeric DEM routes;
  Oxia returned unavailable terrain alternatives. The copied runtime audit passed.

Docker is not installed locally. The Linux image build, Python 3.11 wheel installation,
non-root container startup, Railway networking, and public browser acceptance remain
to be verified on Railway. No successful cloud deployment is claimed.

## Public URL acceptance

- Open the homepage and each region; pan/zoom and confirm tiles and map workers load.
- Request `/api/health`; expect 200 and the JSON above.
- In Gale and Jezero, add valid endpoints and calculate both terrain alternatives.
  Confirm numeric distance and visible DEM paths. Existing **unverified registration**
  labels must remain; a computed route is not certified EVA navigation.
- Confirm Oxia stays geometric-only. Jezero's quarantined Slope display must remain
  disabled, and geological-unit overlays must remain absent.
- Change walking speed and EVA scenario inputs; confirm timeline and resources update.
- Save a mission, reopen it, recompute terrain as prompted, export/import mission JSON,
  and download the mission brief. Saves remain in the browser's local storage and are
  specific to the public origin; localhost saves do not transfer automatically.

Record the public URL, deployed Git commit, and results before calling deployment
complete. No Railway access or public URL was available during preparation. UI/UX
changes can be integrated into this branch later; do not merge this deployment into
the release branch or main as part of these steps.

References: [Dockerfiles](https://docs.railway.com/builds/dockerfiles),
[healthchecks](https://docs.railway.com/deployments/healthchecks), and
[public networking](https://docs.railway.com/networking/public-networking).
