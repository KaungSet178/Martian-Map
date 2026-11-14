import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
if(!existsSync(".routing/jezero-worker.cjs")) await import("./build-routing-worker.mjs");
const gale=JSON.parse(execFileSync(process.env.MARSWALK_PYTHON || "python",["-m","team.gale.routing.cli","audit"],{encoding:"utf8",windowsHide:true,timeout:30000,maxBuffer:4000000}));
const jezero=JSON.parse(execFileSync(process.execPath,[".routing/jezero-worker.cjs"],{input:JSON.stringify({coordinates:[[77.450886,18.444627],[77.38,18.455]],maxSnapMeters:100}),encoding:"utf8",windowsHide:true,timeout:30000,maxBuffer:16000000}));
if(!gale.measured || jezero.alternatives.shortest.status==="unavailable")throw new Error("Authentic routing runtime check failed");
console.log("Gale: both compact DEMs checksum-validated through Python. Jezero: authentic grid and Node A* worker operational. No raw DEM or separate HTTP service required.");
