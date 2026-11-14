import { build } from "esbuild";
await build({entryPoints:["scripts/jezero-route-worker.ts"],outfile:".routing/jezero-worker.cjs",platform:"node",format:"cjs",bundle:true,target:"node20"});
