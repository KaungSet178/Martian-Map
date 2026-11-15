import type { EVAPlanningAssessment } from "@/lib/routing/planning";
import { evaAssessmentRows } from "@/lib/eva/presentation";
import { BVAD_URL, APOLLO_URL } from "@/lib/eva/profiles";
export function EVAAssessment({assessment}:{assessment:EVAPlanningAssessment}) {
 const rows=evaAssessmentRows(assessment);
 const primary=(label:string)=>["Selected EVA profile","Route basis","Distance basis","Travel duration","Planned stationary activity duration","Total modeled duration including emergency allowance","Cooling architecture","Missing data"].includes(label)||label.endsWith("total required")||label.endsWith("capacity state");
 const render=([label,value]:[string,string])=><div key={label}><dt>{label}</dt><dd style={{whiteSpace:"pre-wrap"}}>{value}</dd></div>;
 return <section aria-label="EVA resource assessment" data-testid="eva-assessment" style={{overflowWrap:"anywhere"}}>
  <h3>EVA resource assessment</h3>
  {assessment.timeline && <p data-testid="terrain-timeline">Travel-time scenario: {assessment.timeline.total_travel_seconds?.toFixed(2)} seconds; stationary stops {assessment.resources.timeline.stopSeconds===null?"Unavailable":assessment.resources.timeline.stopSeconds.toFixed(2)} seconds.</p>}
  <dl className="metadata">{rows.filter(([label])=>primary(label)).map(render)}</dl>
  <details><summary>Resource assumptions, breakdown and provenance</summary><dl className="metadata">{rows.filter(([label])=>!primary(label)).map(render)}</dl></details>
  <p><a href={BVAD_URL} target="_blank" rel="noreferrer">NASA BVAD Rev 2</a> · <a href={APOLLO_URL} target="_blank" rel="noreferrer">Apollo historical source</a></p>
 </section>;
}
