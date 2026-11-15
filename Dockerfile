# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# prebuild generates both the MapLibre assets and Jezero's bundled Node worker.
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
# Debian Bookworm supplies Python 3.11; binary wheels carry GDAL/PROJ.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/routing-venv
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    PATH="/opt/routing-venv/bin:$PATH" \
    MARSWALK_PYTHON=/opt/routing-venv/bin/python \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
COPY requirements-routing-runtime.txt ./
RUN python -m pip install --no-cache-dir --only-binary=:all: -r requirements-routing-runtime.txt \
    && python -m pip check
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
# Preserve every regional tile, scientific overlay, metadata file and map worker.
COPY --from=builder --chown=node:node /app/public ./public
# Child-process dependencies must not depend on Next.js tracing heuristics.
COPY --from=builder --chown=node:node /app/.routing ./.routing
COPY --from=builder --chown=node:node /app/data ./data
COPY --from=builder --chown=node:node /app/team/gale/routing ./team/gale/routing
COPY --from=builder --chown=node:node /app/scripts/gale-route-runtime.py /app/scripts/check-routing-runtime.mjs ./scripts/
USER node
# Fail the cloud build if Python imports, DEM checksums or Jezero routing fail.
RUN node scripts/check-routing-runtime.mjs
EXPOSE 3000
CMD ["node", "server.js"]
