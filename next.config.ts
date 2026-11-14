import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingIncludes: { "/api/terrain-route": ["./data/routing/**/*", "./team/gale/routing/**/*.py", "./scripts/gale-route-runtime.py", "./.routing/jezero-worker.cjs"] },
  turbopack: {
    root: process.cwd(),
  },
};
export default config;
