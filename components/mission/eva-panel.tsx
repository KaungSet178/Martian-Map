"use client";
import type { Mission } from "@/lib/mission/model";
import type { MissionPlanningSnapshot } from "@/lib/mission/planning-snapshot";
import { EVA_PROFILES } from "@/lib/eva/profiles";
import type { EVAConfig } from "@/lib/eva/config";
import { EVAAssessment } from "./eva-assessment";
const fields:[keyof EVAConfig,string][]=[
 ["metabolicKgPerHour","Metabolic oxygen (kg/hour)"],["leakageKgPerHour","Modeled oxygen leakage (kg/hour)"],
 ["electricalWatts","Electrical load (W)"],["coolingKgPerHour","Venting cooling loss (kg/hour)"],
 ["oxygenCapacityKg","Oxygen capacity (kg)"],["batteryCapacityWh","Battery capacity (Wh)"],["waterCapacityKg","Cooling water capacity (kg)"],
 ["oxygenMarginPercent","Oxygen consumption margin (%)"],["batteryMarginPercent","Energy consumption margin (%)"],["waterMarginPercent","Water consumption margin (%)"],
 ["delaySeconds","Additional delay (seconds)"],["emergencySeconds","Emergency duration allowance (seconds)"],
];
export function EVAPanel({snapshot,onChange}:{snapshot:MissionPlanningSnapshot;onChange:(change:Partial<Mission>)=>void}) {
 const mission=snapshot.mission,inputs=mission.terrain_assumptions??{},config=mission.eva_config??{profileId:"legacy" as const};
 const set=(change:Partial<EVAConfig>)=>onChange({eva_config:{...config,...change}});
 return <section className="terrain-routing" aria-label="EVA planning inputs">
  <h3>EVA planning</h3>
  <details><summary>Timeline and resource scenario inputs</summary>
   <p className="supporting">Conditional estimates per person. Enter walking speed and each science activity duration; zero is allowed. No hardware capacity is assumed. Changing these inputs recomputes resources.</p>
   <label className="field-label">EVA profile<select aria-label="EVA profile" value={config.profileId} onChange={e=>{const profileId=e.target.value as EVAConfig["profileId"];onChange({eva_config:profileId==="legacy"?{profileId}:{...config,profileId,metabolicKgPerHour:undefined,leakageKgPerHour:undefined,coolingKgPerHour:undefined,coolingArchitecture:undefined}});}}>{Object.entries(EVA_PROFILES).map(([id,p])=><option key={id} value={id}>{p.name}</option>)}</select></label>
   {[["speed","Walking speed (m/hour)"],["scienceMinutes","Science stop duration (minutes)"]].map(([key,label])=><label className="field-label" key={key}>{label}<input aria-label={label} type="number" min="0" value={inputs[key]??""} onChange={e=>onChange({terrain_assumptions:{...inputs,[key]:e.target.value}})}/></label>)}
   <p className="supporting">Selecting a profile restores its reference coefficients. Returning to existing I4A assumptions clears new-profile overrides.</p>
   <p className="supporting">Science duration is a fallback only for science stops without their own duration. Base and terminus activities require explicit waypoint duration. Missing activity duration blocks a complete estimate.</p>
   {config.profileId==="legacy"?<>
    <p>Existing I4A assumptions are preserved. Select BVAD or Custom for separately modeled metabolism, leakage and cooling.</p>
    {[["oxygenCapacity","Usable oxygen (g)"],["oxygenTravel","Travel oxygen rate (g/hour)"],["oxygenStop","Stationary oxygen rate (g/hour)"],["batteryCapacity","Usable battery (Wh)"],["batteryTravel","Travel power (W)"],["batteryStop","Stationary power (W)"]].map(([key,label])=><label className="field-label" key={key}>{label}<input aria-label={label} type="number" min="0" value={inputs[key]??""} onChange={e=>onChange({terrain_assumptions:{...inputs,[key]:e.target.value}})}/></label>)}
   </>:<>
    <label className="field-label">Cooling architecture<select aria-label="Cooling architecture" value={config.coolingArchitecture??EVA_PROFILES[config.profileId].architecture} onChange={e=>set({coolingArchitecture:e.target.value as EVAConfig["coolingArchitecture"]})}><option value="unknown">Unknown</option><option value="venting">Venting consumptive cooling</option><option value="non-venting">Idealized non-venting (zero consumable loss)</option></select></label>
    {fields.map(([key,label])=>{
     const defaults:Partial<Record<keyof EVAConfig,number|null>>={metabolicKgPerHour:EVA_PROFILES[config.profileId].metabolic,leakageKgPerHour:EVA_PROFILES[config.profileId].leakage,coolingKgPerHour:EVA_PROFILES[config.profileId].cooling,delaySeconds:0,emergencySeconds:0,oxygenMarginPercent:0,batteryMarginPercent:0,waterMarginPercent:0};
     const value=config[key]===undefined?defaults[key]:config[key];
     return <label className="field-label" key={key}>{label}<input aria-label={label} type="number" min="0" step="any" max={key.endsWith("Percent")?100:1e9} value={typeof value==="number"?value:""} onChange={e=>set({[key]:e.target.value===""?(key.endsWith("Percent")?0:null):Number(e.target.value)})}/></label>;
    })}
   </>}
   {([["oxygen_reserve_percent","Oxygen capacity holdback (%)"],["battery_reserve_percent","Battery capacity holdback (%)"]] as const).map(([key,label])=><label className="field-label" key={key}>{label}<input aria-label={label} type="number" min="10" max="50" step="5" value={mission[key]} onChange={e=>{const value=e.target.valueAsNumber;if(Number.isFinite(value)&&value>=10&&value<=50)onChange({[key]:value});}}/></label>)}
   <p>Oxygen capacity holdback: {mission.oxygen_reserve_percent}%; battery capacity holdback: {mission.battery_reserve_percent}%. These are retained mission reserve preferences. Consumption margins and emergency duration are additional, separately shown engineering allowances. No NASA emergency-duration mandate is asserted.</p>
  </details>
  <EVAAssessment assessment={snapshot.scenario}/>
 </section>;
}
