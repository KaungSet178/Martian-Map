/** Independently re-reviewed R1.1 references. No automatic hardware capacities. */
export const BVAD_URL = "https://ntrs.nasa.gov/api/citations/20210024855/downloads/BVAD_2.15.22-final.pdf";
export const APOLLO_URL = "https://ntrs.nasa.gov/api/citations/19760003073/downloads/19760003073.pdf";
export const EVA_PROFILES = {
  legacy: {name:"Existing I4A user assumptions", metabolic:null, leakage:null, cooling:null, architecture:"unknown" as const},
  "bvad-reference": {name:"NASA BVAD Rev 2 reference scenario", metabolic:0.076, leakage:0.005, cooling:0.57, architecture:"venting" as const},
  "apollo-historical": {name:"Apollo historical context (coefficients unverified)", metabolic:null, leakage:null, cooling:null, architecture:"unknown" as const},
  custom: {name:"Custom user scenario", metabolic:null, leakage:null, cooling:null, architecture:"unknown" as const},
};
export const EVA_PROVENANCE = [
  {parameter:"metabolicKgPerHour",value:0.076,unit:"kg/h/person",document:"NASA/TP-2015-218570/REV2",revision:"2; February 2022",locator:"4.6.2, printed p.134; PDF p.148",url:BVAD_URL,status:"verified reference text; modeled coefficient",conditions:"Conditional oxygen-use scenario; separate Table 4-70 gives 0.086. Not a universal physiological rate; separately adding leakage is a planner assumption."},
  {parameter:"leakageKgPerHour",value:0.005,unit:"kg/h/person",document:"NASA/TP-2015-218570/REV2",revision:"2; February 2022",locator:"4.6.2, printed p.134; PDF p.148",url:BVAD_URL,status:"verified reference text; architecture assumption",conditions:"Closed-loop scenario; excludes sweep gas, purge and cryogenic oxygen losses. Not a Mars suit qualification limit."},
  {parameter:"coolingKgPerHour",value:0.57,unit:"kg/h/person",document:"NASA/TP-2015-218570/REV2",revision:"2; February 2022",locator:"4.6.2, printed p.133; PDF p.147",url:BVAD_URL,status:"verified conditional reference",conditions:"No-radiator consumptive cooling; 295 W metabolic heat. Not a SWME hardware specification."},
  {parameter:"nonVentingLoss",value:0,unit:"kg/h",document:null,revision:null,locator:null,url:null,status:"idealized engineering assumption",conditions:"Explicit non-venting scenario only; thermal capacity, working fluid and drinking water excluded."},
  {parameter:"apolloBattery",value:null,unit:"Wh",document:"NASA TN D-8093",revision:"November 1975",locator:"printed p.39; PDF p.49",url:APOLLO_URL,status:"390 Wh unsupported; excluded",conditions:"21.4 Ah and 16.8 +/- 0.8 V stated separately. Nominal product 359.52 Wh is not usable-energy certification; source also pairs 59.8 kC with 21.4 Ah, an unresolved conversion discrepancy."},
  {parameter:"electricalWatts,batteryCapacityWh,oxygenCapacityKg,waterCapacityKg",value:null,unit:"W,Wh,kg,kg",document:null,revision:null,locator:null,url:null,status:"requires user assumptions",conditions:"Unknown hardware values remain null, including historical Apollo profile coefficients not independently established."},
  {parameter:"delaySeconds,emergencySeconds,resourceMargins",value:0,unit:"s,s,%",document:null,revision:null,locator:null,url:null,status:"visible configurable engineering assumptions",conditions:"No universal NASA 30-minute rule asserted; baseline has no added allowance. Legacy oxygen/battery capacity holdbacks remain separately applied."},
] as const;
export const EVA_LIMITATIONS = "Conditional estimate per person; constant user walking speed and resource rates omit physiology, terrain impedance, environmental exposure, purge/sweep gas, CO2 removal, thermal feasibility, drinking water and recovery validation. Positive arithmetic margins do not certify operational feasibility or astronaut safety.";
