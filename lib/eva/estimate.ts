import { evaConfigSchema, type EVAConfig } from "./config";
import { EVA_PROFILES, EVA_PROVENANCE, EVA_LIMITATIONS } from "./profiles";
export type ResourceAssessment = {
  status: "calculated-requirement" | "capacity-sufficient-under-assumptions" | "capacity-insufficient-under-assumptions" | "missing-consumption-coefficient" | "no-valid-duration" | "invalid-input";
  unit: "kg" | "Wh"; baseline: number|null; timeReserve: number|null; consumptionMargin: number|null;
  required: number|null; capacity: number|null; capacityHoldback: number|null; remaining: number|null;
  capacityStatus: "missing-capacity" | "sufficient-under-assumptions" | "insufficient-under-assumptions" | "unverified";
};
export type EVAInput = { travelSeconds:number|null; stopSeconds:number|null; legacy:Record<string,string>; oxygenHoldbackPercent:number; batteryHoldbackPercent:number; config?:EVAConfig };
export function physical(value:unknown):number|null { return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1e9 ? value : null; }
export function legacyNumber(inputs:Record<string,string>,key:string) { const v=inputs[key];return v?.trim() ? physical(Number(v)) : null; }
/** One dimensional core, adapted from R1.1: rate * hours, with explicit reserves and unknowns. */
export function estimateEVAResources(input:EVAInput) {
  const validHoldbacks=[input.oxygenHoldbackPercent,input.batteryHoldbackPercent].every(v=>physical(v)!==null&&v<=100);
  const parsed=evaConfigSchema.safeParse(input.config ?? {profileId:"legacy"});
  const config=parsed.success ? parsed.data : {profileId:"custom" as const};
  const profile=EVA_PROFILES[config.profileId];
  const missing:string[]=[];
  if(!parsed.success)missing.push("Invalid EVA inputs: negative, nonfinite or out-of-range values are rejected.");
  const travel=physical(input.travelSeconds),stop=physical(input.stopSeconds);
  if(travel===null)missing.push("Current route and positive explicit walking speed required.");
  if(stop===null)missing.push("Specify every science stop duration (explicit zero is permitted).");
  const delay=config.delaySeconds===undefined?0:physical(config.delaySeconds);
  const emergency=config.emergencySeconds===undefined?0:physical(config.emergencySeconds);
  if(delay===null||emergency===null)missing.push("Additional delay and emergency duration must be known.");
  const base=parsed.success&&travel!==null&&stop!==null&&delay!==null?physical(travel+stop+delay):null;
  const duration=base!==null&&emergency!==null?physical(base+emergency):null;
  const resolve=(key:"metabolicKgPerHour"|"leakageKgPerHour"|"coolingKgPerHour",fallback:number|null)=>config[key]===undefined?fallback:physical(config[key]);
  const metabolic=resolve("metabolicKgPerHour",profile.metabolic),leakage=resolve("leakageKgPerHour",profile.leakage);
  const power=config.electricalWatts===undefined?null:physical(config.electricalWatts);
  const architecture=config.coolingArchitecture ?? profile.architecture;
  const waterRate=architecture==="unknown"?null:architecture==="non-venting"?0:resolve("coolingKgPerHour",profile.cooling);
  const legacy=config.profileId==="legacy";
  const rateTravel=legacy?legacyNumber(input.legacy,"oxygenTravel"):metabolic;
  const rateStop=legacy?legacyNumber(input.legacy,"oxygenStop"):metabolic;
  const powerTravel=legacy?legacyNumber(input.legacy,"batteryTravel"):power;
  const powerStop=legacy?legacyNumber(input.legacy,"batteryStop"):power;
  const leakRate=legacy?null:leakage;
  const allowance=config.emergencySeconds===undefined?0:emergency;
  // Legacy oxygen fields are aggregate g/h; decomposition cannot be inferred.
  const integratedUse=(travelRate:number|null,stopRate:number|null,scale=1)=>base!==null&&travel!==null&&stop!==null&&delay!==null&&travelRate!==null&&stopRate!==null?physical((travelRate*travel+stopRate*(stop+delay))/3600*scale):null;
  const metabolicUse=legacy?null:integratedUse(metabolic,metabolic);
  const leakageUse=legacy?null:integratedUse(leakRate,leakRate);
  const oxygenBase=legacy?integratedUse(rateTravel,rateStop,.001):metabolicUse!==null&&leakageUse!==null?physical(metabolicUse+leakageUse):null;
  const oxygenEmergencyRate=legacy?rateTravel===null?null:rateTravel*.001:metabolic!==null&&leakage!==null?metabolic+leakage:null;
  function resource(unit:"kg"|"Wh",baseline:number|null,rate:number|null,capacity:number|null,margin:number,holdback:number):ResourceAssessment {
    const capacityHoldback=capacity!==null&&physical(holdback)!==null?physical(capacity*holdback/100):null;
    const timeReserve=rate!==null&&allowance!==null?physical(rate*allowance/3600):null;
    const consumptionMargin=baseline!==null&&timeReserve!==null?physical((baseline+timeReserve)*margin/100):null;
    const required=parsed.success&&validHoldbacks&&duration!==null&&baseline!==null&&timeReserve!==null&&consumptionMargin!==null?physical(baseline+timeReserve+consumptionMargin):null;
    const remaining=required!==null&&capacity!==null&&capacityHoldback!==null?capacity-capacityHoldback-required:null;
    const capacityStatus=required===null?"unverified":capacity===null?"missing-capacity":remaining===null?"unverified":remaining>=-1e-10?"sufficient-under-assumptions":"insufficient-under-assumptions";
    const status=!parsed.success||!validHoldbacks?"invalid-input":duration===null?"no-valid-duration":required===null?"missing-consumption-coefficient":capacityStatus==="sufficient-under-assumptions"?"capacity-sufficient-under-assumptions":capacityStatus==="insufficient-under-assumptions"?"capacity-insufficient-under-assumptions":"calculated-requirement";
    return {unit,status,baseline:duration===null?null:baseline,timeReserve:duration===null?null:timeReserve,consumptionMargin,required,capacity,capacityHoldback,remaining,capacityStatus};
  }
  const oxygenCapacity=config.oxygenCapacityKg===undefined&&legacy?legacyNumber(input.legacy,"oxygenCapacity"):null;
  const oxygen=resource("kg",oxygenBase,oxygenEmergencyRate,config.oxygenCapacityKg===undefined?(oxygenCapacity===null?null:oxygenCapacity*.001):physical(config.oxygenCapacityKg),config.oxygenMarginPercent??0,input.oxygenHoldbackPercent);
  const battery=resource("Wh",integratedUse(powerTravel,powerStop),powerTravel,config.batteryCapacityWh===undefined&&legacy?legacyNumber(input.legacy,"batteryCapacity"):physical(config.batteryCapacityWh),config.batteryMarginPercent??0,input.batteryHoldbackPercent);
  const water=resource("kg",integratedUse(waterRate,waterRate),waterRate,physical(config.waterCapacityKg),config.waterMarginPercent??0,0);
  for(const [name,r] of Object.entries({oxygen,battery,water})) {
    if(r.required===null)missing.push(`${name}: missing coefficient, duration or invalid arithmetic.`);
    if(r.capacity===null)missing.push(`${name}: capacity unknown; feasibility unverified.`);
  }
  return {profileId:config.profileId,profileName:profile.name,architecture,config,
    coefficients:{metabolicKgPerHour:metabolic,leakageKgPerHour:leakage,electricalWatts:power,coolingKgPerHour:waterRate,legacyAggregateRates:legacy?input.legacy:null},
    timeline:{travelSeconds:travel,stopSeconds:stop,delaySeconds:delay,baselineSeconds:base,emergencySeconds:emergency,totalSeconds:duration},
    oxygen:{...oxygen,metabolicKg:duration===null?null:metabolicUse,leakageKg:duration===null?null:leakageUse},battery,water,missing,
    reserves:{oxygenHoldbackPercent:input.oxygenHoldbackPercent,batteryHoldbackPercent:input.batteryHoldbackPercent,oxygenMarginPercent:config.oxygenMarginPercent??0,batteryMarginPercent:config.batteryMarginPercent??0,waterMarginPercent:config.waterMarginPercent??0},
    enteredAssumptionProvenance:Object.fromEntries(Object.entries(config).map(([key,value])=>[key,{value,status:"user-selected planning assumption; not a NASA hardware property"}])),
    provenance:EVA_PROVENANCE,limitations:EVA_LIMITATIONS,operationalFeasibility:"unverified" as const};
}
export type EVAResult=ReturnType<typeof estimateEVAResources>;
