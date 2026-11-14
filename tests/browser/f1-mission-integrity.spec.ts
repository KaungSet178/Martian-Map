import {test,expect,type Page,type Download} from "@playwright/test";
import {mkdir} from "node:fs/promises";
async function planView(page:Page){
  const handle=page.locator(".sheet-handle");if(await handle.isVisible() && await handle.getAttribute("aria-expanded")==="false")await handle.click();
  await page.getByRole("button",{name:/^Plan [0-9]/}).click();
  await page.getByRole("tab",{name:/Surface Waypoints/}).click();
}
async function point(page:Page,label:string,lon:number,lat:number){
  const details=page.getByTestId("manual-coordinates-card");if(await details.getAttribute("open")===null)await details.locator("summary").click();
  await page.locator("#manual-coord-label").fill(label);await page.locator("#manual-coord-lat").fill(String(lat));await page.locator("#manual-coord-lon").fill(String(lon));
  await page.getByTestId("add-manual-waypoint-btn").click();
}
async function text(download:Download){const stream=await download.createReadStream();const parts:Buffer[]=[];for await(const chunk of stream!)parts.push(Buffer.from(chunk));return Buffer.concat(parts).toString();}
for(const [width,height] of [[1440,900],[390,844]])for(const region of ["gale","jezero","oxia"] as const)test(`F1 ${region} three-point mission, roles, review, Save/Open, JSON and brief at ${width}px`,async({page})=>{
  test.setTimeout(120000);await mkdir("output/playwright/f1",{recursive:true});await page.setViewportSize({width,height});await page.goto(`/?region=${region}`);await planView(page);
  const origin=region==="gale"?[137.441633,-4.589467]:region==="jezero"?[77.450886,18.444627]:[335.4,18.2];
  await point(page,"F1 Base",origin[0],origin[1]);await point(page,"F1 Science",origin[0]+.001,origin[1]+.001);await point(page,"F1 Final",origin[0]+.002,origin[1]+.002);
  await page.getByLabel("Stop duration for F1 Science",{exact:true}).fill("123");
  await page.getByRole("button",{name:"Move F1 Science up",exact:true}).click();
  await expect(page.getByTestId("origin-status")).toContainText("F1 Base");
  await page.getByRole("button",{name:"Move F1 Base down",exact:true}).click();
  await expect(page.getByTestId("origin-status")).toContainText("F1 Base");
  await page.getByRole("radio",{name:"One way traverse",exact:true}).check();
  await page.getByRole("button",{name:"Designate F1 Final as destination terminus",exact:true}).click();
  await page.locator("#recovery-assumption").fill("F1 rendezvous scenario");
  await expect(page.getByTestId("one-way-section")).toContainText("F1 Final");
  for(const mode of ["one_way","round_trip"]){
    if(mode==="round_trip"){await page.getByRole("radio",{name:"Round trip to base",exact:true}).check();await expect(page.getByTestId("waypoint-itinerary")).toContainText("F1 Final");await expect(page.getByTestId("return-closure-leg")).toHaveCount(1);}
    await page.getByRole("button",{name:"Save mission",exact:true}).click();
    await page.getByRole("button",{name:"Review mission",exact:true}).click();
    const snapshot=page.getByTestId("mission-planning-snapshot");await expect(snapshot).toContainText("F1 Base");await expect(snapshot).toContainText("F1 Science");await expect(snapshot).toContainText("F1 Final");await expect(snapshot).toContainText("123 seconds");await expect(snapshot).toContainText("Total geometric distance");
    await page.getByRole("button",{name:"Open mission brief",exact:true}).click();
    await expect(page.getByRole("dialog")).toContainText("3 waypoints");
    const pending=page.waitForEvent("download");await page.getByRole("button",{name:"Download brief",exact:true}).click();const html=await text(await pending);
    for(const label of ["F1 Base","F1 Science","F1 Final","123 seconds","User-defined waypoint"])expect(html).toContain(label);
    expect(html.indexOf("<strong>F1 Base")).toBeLessThan(html.indexOf("<strong>F1 Science"));expect(html).toContain(mode==="one_way"?"One way":"Round trip to base");
    await page.keyboard.press("Escape");
    await page.getByRole("button",{name:"Edit mission plan",exact:true}).click();await page.getByRole("tab",{name:/Surface Waypoints/}).click();
  }
  await page.getByRole("button",{name:"Open saved missions",exact:true}).click();
  const pending=page.waitForEvent("download");await page.getByRole("button",{name:"Export draft JSON",exact:true}).click();const json=await text(await pending);const saved=JSON.parse(json);
  expect(saved.waypoint_plan.waypoints.map((w:{label:string})=>w.label)).toEqual(["F1 Base","F1 Science","F1 Final"]);
  await expect(page.getByRole("dialog")).toContainText("3 waypoints");
  await page.getByRole("button",{name:`Open ${saved.name}`,exact:true}).click();await planView(page);
  await expect(page.getByTestId("origin-status")).toContainText("F1 Base");
  await page.getByRole("button",{name:"Open saved missions",exact:true}).click();
  await page.getByLabel("Import mission JSON",{exact:true}).setInputFiles({name:"f1.json",mimeType:"application/json",buffer:Buffer.from(json)});await planView(page);
  await page.reload();await planView(page);await expect(page.getByTestId("waypoint-itinerary")).toContainText("F1 Final");
  if(region==="oxia")await expect(page.locator(".panel-scroll")).toContainText("Terrain-aware routing is not yet available for Oxia Planum.");
  await page.getByRole("button",{name:"Review mission",exact:true}).click();await page.getByTestId("mission-planning-snapshot").scrollIntoViewIfNeeded();
  await page.screenshot({path:`output/playwright/f1/${region}-${width}-review.png`});
  await page.getByLabel("Mission region",{exact:true}).selectOption(region==="gale"?"jezero":"gale");
  await expect(page.locator(".mission-summary")).toContainText("0 waypoints");
});

test("F1 Oxia interpreted catalog evidence and target-first base recovery",async({page})=>{
  await page.goto("/?region=oxia");await page.getByRole("button",{name:"Add Clay-rich bedrock study",exact:true}).click();await planView(page);
  await expect(page.getByTestId("origin-status")).toContainText("No origin base established");
  const itinerary=page.getByTestId("waypoint-itinerary");await expect(itinerary).toContainText("Interpreted");await expect(itinerary).not.toContainText("Observed");
  await page.getByRole("button",{name:"Promote Clay-rich bedrock study to origin base camp",exact:true}).click();
  await expect(page.getByTestId("origin-status")).toContainText("Clay-rich bedrock study");
  await page.getByRole("button",{name:"Save mission",exact:true}).click();await page.reload();await planView(page);await expect(page.getByTestId("waypoint-itinerary")).toContainText("Interpreted");
  await page.getByRole("button",{name:"Open mission brief",exact:true}).click();await expect(page.getByRole("dialog")).toContainText("Registration unverified");
});

for(const region of ["gale","jezero"] as const)test(`F1 ${region} endpoint changes invalidate actual terrain, timeline and brief`,async({page})=>{
  test.setTimeout(120000);await page.goto(`/?region=${region}`);await planView(page);
  const points=region==="gale"?[[137.441633,-4.589467],[137.42,-4.61],[137.4010487,-4.6347708]]:[[77.450886,18.444627],[77.42,18.45],[77.38,18.455]];
  for(let i=0;i<points.length;i++)await point(page,`Live ${i}`,points[i][0],points[i][1]);
  await page.getByRole("button",{name:"Calculate terrain routes",exact:true}).click();await expect(page.getByTestId("terrain-map-status")).toBeVisible({timeout:45000});
  await page.getByText("Timeline and resource scenario inputs",{exact:true}).click();await page.getByLabel("Walking speed (m/hour)",{exact:true}).fill("1000");await expect(page.getByTestId("terrain-timeline")).toBeVisible();
  await page.getByRole("button",{name:"Promote Live 1 to origin base camp",exact:true}).click();
  await expect(page.getByTestId("terrain-map-status")).toHaveCount(0);await expect(page.getByTestId("terrain-timeline")).toHaveCount(0);
  await page.getByRole("button",{name:"Review mission",exact:true}).click();await expect(page.getByTestId("mission-planning-snapshot")).toContainText("No current computed terrain route");
  await page.getByRole("button",{name:"Open mission brief",exact:true}).click();await expect(page.getByRole("dialog")).not.toContainText("Terrain-derived shortest route");await expect(page.getByRole("dialog")).toContainText("Live 1");
});

test("F1 retired objective JSON remains readable and editable without active route geometry",async({page})=>{
  await page.goto("/?region=gale");await planView(page);await point(page,"Historical Base",137.441633,-4.589467);await point(page,"Retired Stop",137.42,-4.61);
  await page.getByRole("button",{name:"Open saved missions",exact:true}).click();const pending=page.waitForEvent("download");await page.getByRole("button",{name:"Export draft JSON",exact:true}).click();const saved=JSON.parse(await text(await pending));
  saved.target_ids=["gale-retired-unit"];saved.waypoint_plan.waypoints[1].target_id="gale-retired-unit";saved.waypoint_plan.waypoints[1].provenance="verified_science_target";
  await page.getByLabel("Import mission JSON",{exact:true}).setInputFiles({name:"historical.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(saved))});await planView(page);
  await expect(page.getByTestId("waypoint-itinerary")).toContainText("Retired Stop");await expect(page.getByTestId("validation-errors")).toContainText("Retired or unavailable");await expect(page.getByTestId("trajectory-legend")).toHaveCount(0);
  await page.getByRole("button",{name:"Open mission brief",exact:true}).click();await expect(page.getByRole("dialog")).toContainText("gale-retired-unit");await expect(page.getByRole("dialog")).toContainText("Retired Stop");
  await page.keyboard.press("Escape");await page.getByRole("button",{name:"Remove Retired Stop from itinerary",exact:true}).click();await expect(page.getByTestId("waypoint-itinerary")).not.toContainText("Retired Stop");
});

for(const width of [390,320])test(`F1 current terrain scenario Review and downloadable brief fit ${width}px`,async({page})=>{
  test.setTimeout(90000);await page.setViewportSize({width,height:844});await page.goto("/?region=jezero");await planView(page);
  await point(page,"Scenario Base",77.450886,18.444627);await point(page,"Scenario End",77.42,18.45);
  await page.getByRole("button",{name:"Calculate terrain routes",exact:true}).click();await expect(page.getByTestId("terrain-map-status")).toBeVisible({timeout:45000});
  await page.getByText("Timeline and resource scenario inputs",{exact:true}).click();await page.getByLabel("Walking speed (m/hour)",{exact:true}).fill("1000");
  await page.getByRole("button",{name:"Review mission",exact:true}).click();const snapshot=page.getByTestId("mission-planning-snapshot");await expect(snapshot).toContainText("Travel-time scenario");
  await snapshot.getByText("Resource scenario breakdown",{exact:true}).click();await snapshot.locator("pre").scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole("button",{name:"Open mission brief",exact:true}).click();await expect(page.getByRole("dialog")).toContainText("Terrain-derived shortest route");
  const pending=page.waitForEvent("download");await page.getByRole("button",{name:"Download brief",exact:true}).click();const html=await text(await pending);expect(html).toContain("travel_used_g");expect(html).toContain("Travel-time scenario");expect(html).toContain("Absolute registration unverified");
});
