import type { EVAPlanningAssessment } from "@/lib/routing/planning";
const number=(v:number|null,unit:string)=>v===null?"Unavailable":`${v.toFixed(unit.startsWith("kg")?4:2)} ${unit}`;
/** Shared semantic rows; presentation never recalculates physical quantities. */
export function evaAssessmentRows(s:EVAPlanningAssessment):[string,string][] {
 const r=s.resources,t=r.timeline;
 const rows:[string,string][]=[
  ["Selected EVA profile",r.profileName],["Route basis",s.routeBasis],["Distance basis",number(s.distanceMeters,"m")],
  ["Travel duration",number(t.travelSeconds,"s")],["Return travel included once",number(s.returnTravelSeconds,"s")],["Scientific activity duration",number(s.scienceSeconds,"s")],["Walking speed assumption",number(s.speedMetersPerHour,"m/hour")],["Round trip",String(s.roundTripIncluded)],["Planned stationary activity duration",number(t.stopSeconds,"s")],
  ["Additional delay",number(t.delaySeconds,"s")],["Baseline EVA duration",number(t.baselineSeconds,"s")],
  ["Emergency duration allowance (user heuristic)",number(t.emergencySeconds,"s")],["Total modeled duration including emergency allowance",number(t.totalSeconds,"s")],
  ["Metabolic oxygen coefficient",number(r.coefficients.metabolicKgPerHour,"kg/h")],
  ["Modeled leakage coefficient",number(r.coefficients.leakageKgPerHour,"kg/h")],
  ["Baseline metabolic oxygen",number(r.oxygen.metabolicKg,"kg")],["Baseline leakage oxygen",number(r.oxygen.leakageKg,"kg")],
  ["Electrical load",number(r.coefficients.electricalWatts,"W")],
  ["Cooling architecture",r.architecture],["Consumptive cooling rate",number(r.coefficients.coolingKgPerHour,"kg/h")],
 ];
 for(const [name,x] of [["Oxygen",r.oxygen],["Electrical energy",r.battery],["Cooling water",r.water]] as const){
  rows.push([`${name} assessment`,x.status],[`${name} baseline`,number(x.baseline,x.unit)],
   [`${name} emergency allowance`,number(x.timeReserve,x.unit)],[`${name} consumption margin`,number(x.consumptionMargin,x.unit)],
   [`${name} total required`,number(x.required,x.unit)],[`${name} available capacity`,number(x.capacity,x.unit)],
   [`${name} capacity holdback`,number(x.capacityHoldback,x.unit)],[`${name} remaining margin after holdback`,number(x.remaining,x.unit)],
   [`${name} capacity state`,x.capacityStatus]);
 }
 rows.push(["Reserve arithmetic","Required = baseline + emergency allowance + consumption margin on that sum. Remaining = capacity - capacity holdback - required."],
  ["Entered assumption provenance",JSON.stringify(r.enteredAssumptionProvenance)],["Reserve settings",JSON.stringify(r.reserves)],["Sources",s.sourceDatasetIds.join(", ")||"No terrain source"],
  ["Verification",`Source ${s.sourceVerified}; processing ${s.processingVerified}; absolute registration unverified`],
  ["Missing data",r.missing.join(" ")||"No missing arithmetic inputs; operational feasibility remains unverified."],
  ["Reference provenance (user overrides are assumptions)",r.provenance.map(p=>`${p.parameter}: ${p.document??"User/engineering assumption"}; ${p.locator??"no NASA locator"}; ${p.status}. ${p.conditions}`).join("\n")],
  ["Operational limitations",r.limitations]);
 if(r.profileId==="legacy")rows.push(["Legacy rate interpretation","Existing travel/stationary oxygen rates are aggregate g/h, not separately measured metabolic and leakage coefficients. Emergency oxygen uses the entered travel rate; delay uses stationary rates."],["Legacy rate inputs",JSON.stringify(r.coefficients.legacyAggregateRates)]);
 return rows;
}
