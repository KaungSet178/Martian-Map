"use client";
import type { ScienceSite, SiteSelection } from "@/lib/science/sites";
import { sitePolicy, sitesForObjective, objectiveSiteSummary } from "@/lib/science/sites";
import type { RegionManifest, Target } from "@/lib/contracts/region";
import { EvidenceBadge, Notice } from "@/components/ui/primitives";
export function ScienceSites({target,region,selections,onToggle,onAdd}:{target:Target;region:RegionManifest;selections:SiteSelection[];onToggle?:(site:ScienceSite)=>void;onAdd?:(site:ScienceSite)=>void}){
  const sites=sitesForObjective(region.id,target.id);
  const summary=objectiveSiteSummary(region.id,target.id,target.coordinate_verified);
  return <section aria-label="Associated scientific sites" data-testid="science-sites"><h3>Associated scientific sites</h3>
    <p>Scientific goals and physical sites are separate. Including site context does not mark a site as visited.</p>
    {!sites.length && <p>No independently supported discrete site is associated with this objective.</p>}
    {sites.length > 0 && (
      <div className="science-sites-summary">
        <p className="supporting">{summary.detailedSummary}</p>
      </div>
    )}
    {sites.map(site=>{const policy=sitePolicy(site);const selected=selections.some(s=>s.site_id===site.id);
      return <details key={site.id} data-testid={`site-${site.id}`}>
        <summary>
          <span className="site-summary-title">{site.title}</span>
          {site.coordinates ? (
            <span className="site-summary-coords mono">
              {site.original_precision?.latitude ?? site.coordinates.latitude}° N,{" "}
              {site.original_precision?.longitude_east ?? site.coordinates.longitude_east}° E
            </span>
          ) : (
            <span className="site-summary-coords supporting">Unlocated</span>
          )}
        </summary>
        <EvidenceBadge value={site.evidence}/><p>Associated objective: {target.title}</p><p>{site.description}</p>
        <dl className="metadata"><div><dt>Site ID</dt><dd>{site.id}</dd></div><div><dt>Source coordinates</dt><dd>{site.coordinates ? `${site.original_precision?.latitude ?? site.coordinates.latitude} degrees N, ${site.original_precision?.longitude_east ?? site.coordinates.longitude_east} degrees E` : "Unavailable; no point inferred"}</dd></div>
        <div><dt>Coordinate frame</dt><dd>{site.coordinate_frame.latitude_type ?? "Latitude convention unresolved"}; east-positive 0-360 degrees. {site.coordinate_frame.datum ?? "Datum not independently established"}</dd></div>
        <div><dt>Geographic registration</dt><dd>{site.registration_verified ? "Verified" : "Unverified"}</dd></div><div><dt>Positional uncertainty</dt><dd>{site.positional_uncertainty_m===null ? "Unknown" : `${site.positional_uncertainty_m} m`}</dd></div><div><dt>Terrain coverage</dt><dd>{site.region==="oxia" ? "Terrain unavailable" : site.grid_coverage===true ? "Inside valid Jezero 25 m numerical grid coverage; this does not verify registration or route access" : site.grid_coverage===false ? "Outside valid numerical coverage" : "Not established for site-linked routing"}</dd></div>
        <div><dt>Routing status</dt><dd>{policy.state}. {policy.reason}</dd></div></dl>
        <a className="source-link" href={site.source.url} target="_blank" rel="noreferrer">{site.source.title}</a><p className="supporting">{site.source.version ?? "Source version/date unknown"}; {site.source.locator ?? "No precise locator independently established"}. Feature: {site.source.feature_id ?? "Unknown"}.</p>
        <ul>{site.limitations.map(l=><li key={l}>{l}</li>)}</ul>
        {onToggle && <button className="small-button" aria-pressed={selected} onClick={()=>onToggle(site)}>{selected ? "Remove site context" : "Include site context"}</button>}
        {policy.geometricOnly && onAdd ? <button className="small-button" onClick={()=>onAdd(site)}>Add geometric stop</button> : <button className="small-button" disabled>Add terrain waypoint (unavailable)</button>}
      </details>;
    })}
    {sites.length>0 && <Notice title="Research planning limitation">No integrated Gale or Jezero site has independently verified source-to-grid registration. Automatic site-linked terrain routing is unavailable. Manual research planning remains available under its existing restrictions.</Notice>}
  </section>;
}
