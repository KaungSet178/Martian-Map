import {test,expect,type Page,type Download} from "@playwright/test";
import {mkdir,writeFile} from "node:fs/promises";
import {regions} from "../../lib/regions/registry";
async function planView(page:Page){const h=page.locator(".sheet-handle");if(await h.isVisible()&&await h.getAttribute("aria-expanded")==="false")await h.click();await page.getByRole("button",{name:/^Plan [0-9]/}).click();await page.getByRole("tab",{name:/Surface Waypoints/}).click();}
async function point(page:Page,label:string,lon:number,lat:number){const card=page.getByTestId("manual-coordinates-card");if(await card.getAttribute("open")===null)await card.locator("summary").click();await page.locator("#manual-coord-label").fill(label);await page.locator("#manual-coord-lat").fill(String(lat));await page.locator("#manual-coord-lon").fill(String(lon));await page.getByTestId("add-manual-waypoint-btn").click();}
async function contents(download:Download){const stream=await download.createReadStream();const parts:Buffer[]=[];for await(const part of stream!)parts.push(Buffer.from(part));return Buffer.concat(parts).toString();}
for(const [width,height] of [[1440,900],[768,1024],[390,844]])for(const id of ["gale","jezero","oxia"] as const)test(`I4A ${id} complete science-to-saved-route-and-export workflow at ${width}px`,async({page})=>{
 test.setTimeout(180000);const out="output/playwright/i4a";await mkdir(out,{recursive:true});await page.setViewportSize({width,height});
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
 await page.goto(`/?region=${id}`);await expect(page.locator(".map-location")).toContainText(regions[id].name);
 const h=page.locator(".sheet-handle");if(await h.isVisible()&&await h.getAttribute("aria-expanded")==="false")await h.click();
 const ids=id==="gale"?["gale-glen-torridon","gale-gediz-vallis"]:id==="jezero"?["jezero-objective-3","jezero-objective-5"]:["oxia-objective-1","oxia-objective-2"];
 for(const targetId of ids){const target=regions[id].targets.find(t=>t.id===targetId)!;await page.getByRole("button",{name:target.title,exact:true}).click();await expect(page.getByRole("dialog")).toContainText("Interpreted");await expect(page.getByRole("dialog")).toContainText("Positional uncertainty: unknown");if(targetId==="jezero-objective-3")await expect(page.getByRole("dialog")).toContainText("not the tube depot");await page.screenshot({path:`${out}/${targetId}-${width}.png`});await page.keyboard.press("Escape");await page.getByRole("button",{name:`Add ${target.title}`,exact:true}).click();}
 await planView(page);if(id!=="oxia")await expect(page.getByTestId("empty-itinerary")).toContainText("No surface waypoints");
 const points=id==="gale"?[[137.38,-4.72],[137.4,-4.74],[137.39,-4.75]]:id==="jezero"?[[77.450886,18.444627],[77.38,18.455],[77.43,18.435]]:[[335.4,18.2],[335.41,18.21],[335.42,18.22]];
 const labels=["I4A Manual Base","I4A Manual Science","I4A Manual Final"];
 for(let i=0;i<points.length;i++)await point(page,labels[i],points[i][0],points[i][1]);
 if(id==="oxia")await page.getByRole("button",{name:"Promote I4A Manual Base to origin base camp",exact:true}).click();await expect(page.getByTestId("origin-status")).toContainText("I4A Manual Base");await page.getByLabel("Stop duration for I4A Manual Science",{exact:true}).fill("123");
 await page.getByRole("radio",{name:"One way traverse",exact:true}).check();await page.getByRole("button",{name:"Designate I4A Manual Final as destination terminus",exact:true}).click();await page.locator("#recovery-assumption").fill("I4A user-defined rendezvous scenario");await expect(page.getByTestId("one-way-section")).toContainText("I4A Manual Final");
 await page.getByRole("radio",{name:"Round trip to base",exact:true}).check();await expect(page.getByTestId("return-closure-leg")).toHaveCount(1);
 let routeResponse:unknown=null;
 if(id!=="oxia"){
  const pending=page.waitForResponse(r=>r.url().endsWith("/api/terrain-route")&&r.request().method()==="POST");await page.getByRole("button",{name:"Calculate terrain routes",exact:true}).click();const http=await pending;expect(http.status()).toBe(200);const response=await http.json();routeResponse=response;
  for(const r of response.alternatives){expect(r.status).toBe("unverified");expect(r.registrationVerified).toBe(false);expect(r.segments).toHaveLength(3);expect(r.coordinates[0]).toEqual(r.coordinates.at(-1));}
  await expect(page.getByTestId("terrain-map-status")).toBeVisible();await page.getByRole("radio",{name:/Lower terrain cost/}).check();await page.getByText("Timeline and resource scenario inputs",{exact:true}).click();await page.getByLabel("Walking speed (m/hour)",{exact:true}).fill("1000");await expect(page.getByTestId("terrain-timeline")).toBeVisible();
 }else{await expect(page.locator(".panel-scroll")).toContainText("Terrain-aware routing is not yet available for Oxia Planum.");await expect(page.getByTestId("waypoint-itinerary")).toContainText("Interpreted");}
 await page.getByRole("button",{name:"Save mission",exact:true}).click();await page.getByRole("button",{name:"Open saved missions",exact:true}).click();const pendingJson=page.waitForEvent("download");await page.getByRole("button",{name:"Export draft JSON",exact:true}).click();const json=await contents(await pendingJson),saved=JSON.parse(json);
 expect(saved.schema_version).toBe(1);expect(saved.target_ids).toEqual(ids);expect(saved.waypoint_plan.waypoints).toHaveLength(id==="oxia"?5:3);expect(saved.terrain_route?.coordinates).toBeUndefined();
 if(id==="oxia")for(const wp of saved.waypoint_plan.waypoints.filter((w:{target_id?:string})=>w.target_id)){expect(wp.evidence.classification).toBe("Interpreted");expect(wp.evidence.registration_verified).toBe(false);expect(wp.evidence.positional_uncertainty_m).toBeNull();}
 await writeFile(`${out}/${id}-${width}-mission.json`,json);await page.getByRole("button",{name:`Open ${saved.name}`,exact:true}).click();await planView(page);await expect(page.getByTestId("terrain-map-status")).toHaveCount(0);
 if(id!=="oxia"){await page.getByRole("button",{name:"Calculate terrain routes",exact:true}).click();await expect(page.getByTestId("terrain-map-status")).toBeVisible({timeout:45000});}
 await page.getByRole("button",{name:"Review mission",exact:true}).click();const snapshot=page.getByTestId("mission-planning-snapshot");for(const label of labels)await expect(snapshot).toContainText(label);await expect(snapshot).toContainText("123 seconds");await expect(snapshot).toContainText("Interpreted");await expect(snapshot).not.toContainText("NASA Target");
 if(id==="jezero")await expect(snapshot).toContainText("landing-circle center (not the tube depot)");
 if(id!=="oxia")await expect(snapshot).toContainText("Selected terrain alternative: lower-terrain-cost");
 await page.screenshot({path:`${out}/${id}-${width}-review.png`});await page.getByRole("button",{name:"Open mission brief",exact:true}).click();const pendingBrief=page.waitForEvent("download");await page.getByRole("button",{name:"Download brief",exact:true}).click();const html=await contents(await pendingBrief);
 for(const label of [...labels,"123 seconds","Interpreted","Registration unverified"])expect(html).toContain(label);expect(html).not.toContain("Observed ? NASA Target");for(const targetId of ids)expect(html).toContain(regions[id].targets.find(t=>t.id===targetId)!.title);
 if(id==="jezero")expect(html).toContain("landing-circle center (not the tube depot)");
 await writeFile(`${out}/${id}-${width}-brief.html`,html);await writeFile(`${out}/${id}-${width}-route.json`,JSON.stringify(routeResponse,null,2));await page.screenshot({path:`${out}/${id}-${width}-brief.png`});await page.keyboard.press("Escape");
 await page.getByLabel("Mission region",{exact:true}).selectOption(id==="gale"?"jezero":"gale");await expect(page.getByTestId("terrain-map-status")).toHaveCount(0);await expect(page.locator(".mission-summary")).toContainText("0 waypoints");
 expect(errors).toEqual([]);
});

test("I4A cross-region saved mission isolation returns to original Gale inputs and fresh route",async({page})=>{
 test.setTimeout(180000);const errors:string[]=[],requests:string[]=[];page.on("pageerror",e=>errors.push(e.message));page.on("request",r=>requests.push(r.url()));
 await page.goto("/?region=gale");
 const savedNames:Record<string,string>={};
 for(const id of ["gale","jezero","oxia"] as const){
  await page.getByLabel("Mission region",{exact:true}).selectOption(id);await planView(page);await expect(page.getByTestId("terrain-map-status")).toHaveCount(0);
  const points=id==="gale"?[[137.38,-4.72],[137.4,-4.74]]:id==="jezero"?[[77.450886,18.444627],[77.42,18.45]]:[[335.4,18.2],[335.41,18.21]];
  for(let i=0;i<points.length;i++)await point(page,`${id} isolation ${i}`,points[i][0],points[i][1]);
  if(id!=="oxia"){await page.getByRole("button",{name:"Calculate terrain routes",exact:true}).click();await expect(page.getByTestId("terrain-map-status")).toBeVisible({timeout:45000});}
  await page.getByRole("button",{name:"Save mission",exact:true}).click();
  savedNames[id]=await page.evaluate(region=>JSON.parse(localStorage.getItem("marswalk.missions.v1")!).find((m:{region:string})=>m.region===region).name,id);
 }
 await page.getByLabel("Mission region",{exact:true}).selectOption("gale");await planView(page);
 await expect(page.getByTestId("waypoint-itinerary")).toContainText("gale isolation 0");await expect(page.getByTestId("waypoint-itinerary")).not.toContainText("jezero isolation");await expect(page.getByTestId("waypoint-itinerary")).not.toContainText("oxia isolation");await expect(page.getByTestId("terrain-map-status")).toHaveCount(0);
 await page.getByRole("button",{name:"Open saved missions",exact:true}).click();await page.getByRole("button",{name:`Open ${savedNames.gale}`,exact:true}).click();await planView(page);
 const pending=page.waitForResponse(r=>r.url().endsWith("/api/terrain-route")&&r.request().method()==="POST");await page.getByRole("button",{name:"Calculate terrain routes",exact:true}).click();const response=await(await pending).json();expect(response.alternatives.every((r:{regionId:string;sourceDatasetIds:string[]})=>r.regionId==="gale"&&r.sourceDatasetIds.every(id=>id.startsWith("gale-")))).toBe(true);
 expect(requests.filter(u=>/arc-pass-geology|geology-tiles/.test(u))).toEqual([]);expect(errors).toEqual([]);
 await writeFile("output/playwright/i4a/cross-region-route.json",JSON.stringify(response,null,2));await page.screenshot({path:"output/playwright/i4a/cross-region-return-gale.png"});
});

test("I4A compact landscape role repair and complete brief remain reachable",async({page})=>{
 test.setTimeout(90000);await page.setViewportSize({width:844,height:390});await page.goto("/?region=jezero");await planView(page);
 await point(page,"Landscape Start",77.450886,18.444627);await point(page,"Landscape End",77.42,18.45);
 await page.getByRole("radio",{name:"One way traverse",exact:true}).check();await page.getByRole("button",{name:"Designate Landscape End as destination terminus",exact:true}).click();
 await page.getByRole("button",{name:"Promote Landscape End to origin base camp",exact:true}).click();await page.getByRole("button",{name:"Designate Landscape Start as destination terminus",exact:true}).click();
 await expect(page.getByTestId("origin-status")).toContainText("Landscape End");await expect(page.getByTestId("one-way-section")).toContainText("Landscape Start");
 await page.getByRole("button",{name:"Open mission brief",exact:true}).click();await expect(page.getByRole("dialog")).toContainText("Landscape Start");await expect(page.getByRole("dialog")).toContainText("Landscape End");await page.screenshot({path:"output/playwright/i4a/compact-landscape-brief.png"});
});
