/** Removed from the active submission catalog; IDs remain readable in saved v1 missions. */
export const retiredGaleObjectives = [
  {id:"gale-objective-1",title:"Layered sedimentary unit"},
  {id:"gale-objective-2",title:"Clay-to-sulfate transition"},
  {id:"gale-objective-3",title:"Sulfate-bearing outcrop"},
].map(record=>({...record,evidence:"Scenario" as const,reason:"Retired sample Scenario objective, removed from the active submission catalog. Historical identity is retained; no scientific location or routing eligibility is inferred."}));
export function retiredObjective(region:string,id:string){return region==="gale" ? retiredGaleObjectives.find(record=>record.id===id) : undefined;}
