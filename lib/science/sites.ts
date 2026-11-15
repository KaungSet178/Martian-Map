import { z } from "zod";
import { coordinatesSchema, evidenceSchema, regionIdSchema } from "@/lib/contracts/primitives";
import records from "./sites.json";

export const scienceSiteSchema = z.object({
  id:z.string().min(1).max(100), region:regionIdSchema, title:z.string().min(1).max(200),
  description:z.string().min(1), objective_ids:z.array(z.string().min(1)).min(1), evidence:evidenceSchema,
  source:z.object({title:z.string().min(1),version:z.string().nullable(),url:z.url().refine(u=>u.startsWith("https://")),feature_id:z.string().nullable(),locator:z.string().nullable(),sha256:z.string().nullable()}),
  coordinates:coordinatesSchema.nullable(),
  coordinate_frame:z.object({body:z.literal("Mars"),latitude_type:z.enum(["planetocentric","planetographic"]).nullable(),longitude_direction:z.literal("east"),longitude_range:z.literal("0-360"),datum:z.string().nullable()}),
  original_precision:z.object({latitude:z.string(),longitude_east:z.string()}).nullable(),
  source_verified:z.boolean(), source_coordinate_verified:z.boolean(), source_processing_verified:z.boolean().nullable(),
  registration_evidence:z.object({dataset_id:z.string().min(1),source_url:z.url(),method:z.string().min(1),uncertainty_budget:z.string().min(1)}).nullable(),
  registration_verified:z.boolean(), positional_uncertainty_m:z.number().finite().nonnegative().nullable(),
  grid_coverage:z.boolean().nullable(),cell_traversability:z.boolean().nullable(),snap_displacement_m:z.number().finite().nonnegative().nullable(),
  interpretation:z.string(),operational_safety:z.literal("unverified"),limitations:z.array(z.string()).min(1),
}).superRefine((s,ctx)=>{
  if(!s.id.startsWith(s.region+"-"))ctx.addIssue({code:"custom",message:"Cross-region site identity"});
  if(s.source_coordinate_verified && !s.coordinates)ctx.addIssue({code:"custom",message:"Coordinate verification requires source coordinates"});
  if(s.original_precision && (!s.coordinates || Number(s.original_precision.latitude)!==s.coordinates.latitude || Number(s.original_precision.longitude_east)!==s.coordinates.longitude_east))ctx.addIssue({code:"custom",message:"Published coordinate reproduction mismatch"});
  if(s.objective_ids.some(id=>!id.startsWith(s.region+"-")))ctx.addIssue({code:"custom",message:"Cross-region objective association"});
});
export type ScienceSite = z.infer<typeof scienceSiteSchema>;
export const scienceSites: readonly ScienceSite[] = z.array(scienceSiteSchema).parse(records);
export const siteReferenceSchema=z.object({site_id:z.string().min(1).max(100),objective_id:z.string().min(1).max(100),revision:z.string().min(1).max(100)});
export type SiteReference=z.infer<typeof siteReferenceSchema>;
export const siteSelectionSchema=siteReferenceSchema.extend({source_snapshot:scienceSiteSchema}).refine(s=>s.source_snapshot.id===s.site_id && s.source_snapshot.objective_ids.includes(s.objective_id) && siteRevision(s.source_snapshot)===s.revision,"Saved source snapshot must match its site reference");
export type SiteSelection=z.infer<typeof siteSelectionSchema>;
export function sitesForObjective(region:string,objectiveId:string){return scienceSites.filter(s=>s.region===region && s.objective_ids.includes(objectiveId));}
export function siteRevision(site:ScienceSite):string {
  // Content identity for change detection, not a security/authentication signature.
  let hash=2166136261;for(const char of JSON.stringify(site)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}
  return `i4d-${(hash>>>0).toString(16)}`;
}
export function siteFrameCompatible(site:ScienceSite){return site.source_coordinate_verified && site.coordinates!==null && site.coordinate_frame.latitude_type==="planetocentric";}
export function sitePolicy(site:ScienceSite){
  const frameCompatible=siteFrameCompatible(site);
  const registered=frameCompatible && site.source_verified && site.source_processing_verified===true && site.coordinate_frame.datum!==null && site.registration_evidence!==null && site.registration_verified && site.positional_uncertainty_m!==null;
  const geometricOnly=site.region==="oxia" && frameCompatible;
  return {state:!site.coordinates ? "Unlocated" : !frameCompatible ? "Unavailable: coordinate frame unresolved" : registered ? "Registered research site" : "Source-located, registration unverified",
    frameCompatible,registrationVerified:site.registration_verified,gridCoverage:site.grid_coverage,cellTraversability:site.cell_traversability,snapDisplacementMeters:site.snap_displacement_m,
    terrainEligible:registered && site.region!=="oxia",geometricOnly,
    reason:geometricOnly ? "Geometric planning only; no Oxia terrain engine or validated science routing." : !site.coordinates ? "No independently reproduced point coordinate; no waypoint inferred." : !frameCompatible ? "Coordinate frame/reference-point reconciliation required before map placement or routing." : !registered ? "Automatic site-linked terrain routing unavailable pending independent source-to-grid registration and uncertainty evidence." : "Research eligibility still requires actual coverage, nodata/slope/corner and bounded snapping checks.",operationalSafety:"Unverified"};
}
export function resolveSiteReference(ref:SiteReference,region:string,coordinates?:{latitude:number;longitude_east:number}){
  const site=scienceSites.find(s=>s.id===ref.site_id);
  const reason=!site ? "Retired or unknown scientific site; historical reference retained." : site.region!==region ? "Scientific site belongs to another region." : !site.objective_ids.includes(ref.objective_id) ? "Invalid site-to-objective association." : siteRevision(site)!==ref.revision ? "Scientific site source or coordinates changed; explicit reselection required." : coordinates && (!site.coordinates || site.coordinates.latitude!==coordinates.latitude || site.coordinates.longitude_east!==coordinates.longitude_east) ? "Waypoint differs from current source coordinates; association invalid." : null;
  return {site,reason};
}
export function selectScienceSite(site:ScienceSite,objectiveId:string):SiteSelection {
  if(!site.objective_ids.includes(objectiveId))throw new Error("Invalid objective association");
  return {site_id:site.id,objective_id:objectiveId,revision:siteRevision(site),source_snapshot:site};
}
export function selectedSiteDetails(selection:SiteSelection,region:string){
  const {site,reason}=resolveSiteReference(selection,region);
  const record=reason ? selection.source_snapshot : site!;
  return {...selection,record,stale_reason:reason,policy:sitePolicy(record)};
}

export function siteWaypointEvidence(site:ScienceSite){return {
  classification:site.evidence,source_ids:[site.source.url],source_verified:site.source_verified,
  processing_verified:site.source_processing_verified,coordinate_verified:site.source_coordinate_verified,
  registration_verified:site.registration_verified,positional_uncertainty_m:site.positional_uncertainty_m,
  representation:site.coordinates ? "point" as const : "unavailable" as const,
  precision_disclosure:`Site ${site.id}: ${site.title}. ${site.interpretation} Source: ${site.source.title} (${site.source.url}); ${site.source.version ?? "version unknown"}. ${site.limitations.join(" ")}`,
  routing_eligible:sitePolicy(site).terrainEligible,
};}

export interface ObjectiveSiteSummary {
  siteCount: number;
  siteCountLabel: string;
  sourceCoordinatesVerified: boolean;
  frameCompatibleCount: number;
  unresolvedFrameCount: number;
  unlocatedCount: number;
  sourceLocationLabel: string;
  registrationStatus: string;
  sourceBadge: string | null;
  registrationBadge: string;
  detailedSummary: string;
}

export function objectiveSiteSummary(
  regionId: string,
  targetId: string,
  targetCoordinateVerified = false,
): ObjectiveSiteSummary {
  const sites = sitesForObjective(regionId, targetId);
  const siteCount = sites.length;
  const frameCompatibleSites = sites.filter(s => siteFrameCompatible(s));
  const frameCompatibleCount = frameCompatibleSites.length;
  const unresolvedFrameSites = sites.filter(s => s.coordinates !== null && !siteFrameCompatible(s));
  const unresolvedFrameCount = unresolvedFrameSites.length;
  const unlocatedSites = sites.filter(s => s.coordinates === null);
  const unlocatedCount = unlocatedSites.length;

  const siteCountLabel = siteCount === 0
    ? "No associated sites"
    : `${siteCount} associated site${siteCount === 1 ? "" : "s"}`;

  let sourceCoordinatesVerified = false;
  let sourceLocationLabel = "Location unverified";
  let sourceBadge: string | null = null;
  let registrationStatus = "Registration unverified";
  let registrationBadge = "Registration unverified";
  let detailedSummary = "";

  if (targetCoordinateVerified) {
    sourceCoordinatesVerified = true;
    sourceLocationLabel = "Source coordinates verified";
    sourceBadge = "Source coordinates verified";
    registrationStatus = regionId === "oxia" ? "Geometric planning only" : "Registration unverified";
    registrationBadge = regionId === "oxia" ? "Geometric only" : "Registration unverified";
    detailedSummary = regionId === "oxia"
      ? "Interpreted orbital mineral detection from NASA Mars Trek compilation. Verified source coordinates; geometric planning only."
      : "Verified source coordinate; independent terrain registration unverified.";
  } else if (frameCompatibleCount > 0) {
    sourceCoordinatesVerified = true;
    sourceLocationLabel = `Source coordinates verified (${frameCompatibleCount} site${frameCompatibleCount === 1 ? "" : "s"})`;
    sourceBadge = "Source coordinates verified";
    registrationStatus = "Registration unverified · Routing blocked";
    registrationBadge = "Registration unverified";
    detailedSummary = `${frameCompatibleCount} qualified discrete site${frameCompatibleCount === 1 ? "" : "s"} tracked with verified source coordinates in Mars planetocentric latitude, east-positive longitude. Independent terrain registration to the routing grid is unverified; automatic terrain routing is unavailable.`;
  } else if (unresolvedFrameCount > 0) {
    sourceCoordinatesVerified = false;
    sourceLocationLabel = "Coordinate frame unresolved";
    sourceBadge = "Coordinate frame unresolved";
    registrationStatus = "Registration unverified";
    registrationBadge = "Registration unverified";
    detailedSummary = `${siteCount} qualified discrete record${siteCount === 1 ? "" : "s"} tracked from published mission literature. ${unresolvedFrameCount} site${unresolvedFrameCount === 1 ? "" : "s"} have published coordinates with unresolved latitude frame/datum; ${unlocatedCount > 0 ? `${unlocatedCount} record is unlocated context. ` : ""}Independent terrain registration is unverified.`;
  } else if (unlocatedCount > 0) {
    sourceCoordinatesVerified = false;
    sourceLocationLabel = "Location unverified (unlocated context)";
    sourceBadge = "Unlocated context";
    registrationStatus = "Registration unverified";
    registrationBadge = "Registration unverified";
    detailedSummary = `${siteCount} documented named investigation${siteCount === 1 ? "" : "s"} tracked from published literature. Reviewed sources establish named scientific context; verified point coordinates remain unlocated.`;
  } else {
    sourceCoordinatesVerified = false;
    sourceLocationLabel = "Location unverified";
    sourceBadge = null;
    registrationStatus = "Registration unverified";
    registrationBadge = "Registration unverified";
    detailedSummary = "No independently supported discrete site is associated with this objective.";
  }

  return {
    siteCount,
    siteCountLabel,
    sourceCoordinatesVerified,
    frameCompatibleCount,
    unresolvedFrameCount,
    unlocatedCount,
    sourceLocationLabel,
    registrationStatus,
    sourceBadge,
    registrationBadge,
    detailedSummary,
  };
}
