import { test,expect,type Page } from "@playwright/test";
import { mkdir,writeFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
async function planView(page:Page) {
  const handle=page.locator(".sheet-handle");
  if(await handle.isVisible() && await handle.getAttribute("aria-expanded")==="false")await handle.click();
  await page.getByRole("button",{name:/^Plan [0-9]/}).click();
  await page.getByRole("tab",{name:/Surface Waypoints/}).click();
}
async function addPoint(page:Page,lon:number,lat:number) {
  const details=page.getByTestId("manual-coordinates-card");
  if(!(await details.getAttribute("open"))) {
    if(await details.getAttribute("open")===null)await details.locator("summary").click();
  }
  await page.locator("#manual-coord-lat").fill(String(lat));
  await page.locator("#manual-coord-lon").fill(String(lon));
  await page.getByTestId("add-manual-waypoint-btn").click();
}
async function settle(page:Page){await page.waitForLoadState("networkidle");await page.waitForTimeout(450);}
for(const [width,height] of [[1440,900],[768,1024],[390,844]]) {
  for(const region of ["gale","jezero"] as const) {
    test(`${region} authentic route alternatives, propagation, persistence and isolation at ${width}px`,async({page})=>{
      test.setTimeout(180000);await mkdir("output/playwright/i3a",{recursive:true});
      const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
      page.on("console",message=>{if(message.type()==="error")errors.push(message.text());});
      await page.setViewportSize({width,height});await page.goto(`/?region=${region}`);
      await expect(page.locator(".map-canvas canvas")).toBeVisible();await settle(page);
      if(region==="gale") {
        await expect(page.getByRole("button",{name:"Explore Curiosity area",exact:true})).toBeVisible();
        await page.getByRole("button",{name:"Fit complete mission area",exact:true}).click();
        await page.getByRole("button",{name:"Explore Curiosity area",exact:true}).click();
      }
      await planView(page);
      const points=region==="gale"?[[137.38,-4.72],[137.4,-4.74]]:[[77.450886,18.444627],[77.38,18.455]];
      for(const [lon,lat] of points) await addPoint(page,lon,lat);
      const canvas=page.locator(".map-canvas canvas");await settle(page);
      if(region === "gale") {
        const frame=(await page.locator(".map-workspace").boundingBox())!;
        for(const name of ["Explore Curiosity area","Fit complete mission area"]) {
          const button=page.getByRole("button",{name,exact:true});
          const box=(await button.boundingBox())!;
          expect(box.y+box.height).toBeLessThanOrEqual(frame.y+frame.height);
          expect(await button.evaluate(element=>{const r=element.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===element || element.contains(hit);})).toBe(true);
        }
      }
      const before=await canvas.screenshot({style:".task-panel,.map-topline,.map-bottomline,.map-navigation,.map-attribution,.basemap-control{visibility:hidden!important}"});
      const response=page.waitForResponse(response=>response.url().endsWith("/api/terrain-route")&&response.request().method()==="POST");
      await page.getByRole("button",{name:"Calculate terrain routes",exact:true}).click();
      const http=await response;expect(http.status()).toBe(200);const data=await http.json();
      expect(data.alternatives.every((r:{registrationVerified:boolean;status:string})=>!r.registrationVerified&&r.status==="unverified")).toBe(true);
      await expect(page.getByTestId("terrain-map-status")).toBeVisible();
      await expect(page.locator('[aria-label="Terrain routing"]')).toContainText("absolute registration unverified");
      await expect(page.getByTestId("trajectory-legend")).toHaveCount(0);
      await settle(page);const after=await canvas.screenshot({style:".task-panel,.map-topline,.map-bottomline,.map-navigation,.map-attribution,.basemap-control,.map-route-status{visibility:hidden!important}"});
      expect(after.equals(before)).toBe(false);
      await page.getByRole("radio",{name:/Lower terrain cost/}).check();
      await expect(page.getByTestId("terrain-map-status")).toContainText("lower terrain cost");
      await page.getByTestId("terrain-distance").scrollIntoViewIfNeeded();
      await page.screenshot({path:`output/playwright/i3a/${region}-route-summary-${width}.png`});
      const settings=page.getByText("Timeline and resource scenario inputs",{exact:true});await settings.click();
      await page.getByLabel("Walking speed (m/hour)",{exact:true}).fill("1000");
      await expect(page.getByTestId("terrain-timeline")).toContainText("Terrain scenario distance:");
      await expect(page.locator('[aria-label="Terrain routing"]')).toContainText("INSUFFICIENT_DATA");
      await page.screenshot({path:`output/playwright/i3a/${region}-terrain-${width}.png`});
      await writeFile(`output/playwright/i3a/${region}-terrain-${width}.json`,JSON.stringify(data,null,2));
      await page.getByRole("button",{name:"Review mission",exact:true}).click();
      await expect(page.locator(".panel-scroll")).toContainText("3D DEM distance");
      await expect(page.locator(".panel-scroll")).not.toContainText("No candidate paths have been calculated");
      await page.getByRole("button",{name:"Inspect terrain alternatives and scenario estimates",exact:true}).click();
      await page.getByRole("button",{name:"Save mission",exact:true}).click();
      await page.getByRole("button",{name:"Open mission brief",exact:true}).click();
      await expect(page.getByRole("dialog")).toContainText("Terrain-derived lower-terrain-cost route");
      await expect(page.getByRole("dialog")).toContainText("Environmental availability");
      await expect(page.getByRole("dialog")).toContainText("terrain-i3a-v1-georeferenced");
      const download=page.waitForEvent("download");await page.getByRole("button",{name:"Download brief",exact:true}).click();
      const stream=await(await download).createReadStream();const chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(Buffer.from(chunk));
      expect(Buffer.concat(chunks).toString()).toContain("Terrain-derived lower-terrain-cost route");
      await page.keyboard.press("Escape");
      if(region === "gale" && width === 1440) {
        await page.getByRole("button",{name:"Open saved missions",exact:true}).click();
        const exported=page.waitForEvent("download");await page.getByRole("button",{name:"Export draft JSON",exact:true}).click();
        const jsonStream=await(await exported).createReadStream();const jsonChunks:Buffer[]=[];
        for await(const chunk of jsonStream!)jsonChunks.push(Buffer.from(chunk));
        const buffer=Buffer.concat(jsonChunks),saved=JSON.parse(buffer.toString());
        expect(saved.terrain_route.preference).toBe("lower-terrain-cost");expect(saved.terrain_route.coordinates).toBeUndefined();
        await page.getByRole("button",{name:`Open ${saved.name}`,exact:true}).click();await planView(page);
        await expect(page.getByTestId("terrain-map-status")).toHaveCount(0);
        await expect(page.locator('[aria-label="Terrain routing"]')).toContainText("requires recalculation");
        await page.getByRole("button",{name:"Calculate terrain routes",exact:true}).click();
        await expect(page.getByTestId("terrain-map-status")).toBeVisible({timeout:45000});
        await page.getByRole("button",{name:"Open saved missions",exact:true}).click();
        await page.getByLabel("Import mission JSON",{exact:true}).setInputFiles({name:"terrain-roundtrip.json",mimeType:"application/json",buffer});
        await planView(page);await expect(page.getByTestId("terrain-map-status")).toHaveCount(0);
      }
      await page.reload();await planView(page);
      await expect(page.locator('[aria-label="Terrain routing"]')).toContainText("requires recalculation");
      await expect(page.getByTestId("terrain-map-status")).toHaveCount(0);
      await page.getByRole("button",{name:"Calculate terrain routes",exact:true}).click();
      await expect(page.getByTestId("terrain-map-status")).toBeVisible({timeout:45000});
      if(region === "gale" && width === 1440) {
        await page.getByLabel("Routing terrain source",{exact:true}).selectOption("gale-hrsc-mola-200m");
        await page.getByLabel("Maximum waypoint snap (m)",{exact:true}).fill("150");
        await expect(page.getByTestId("terrain-map-status")).toHaveCount(0);
        const coarseResponse=page.waitForResponse(response=>response.url().endsWith("/api/terrain-route")&&response.request().method()==="POST");
        await page.getByRole("button",{name:"Calculate terrain routes",exact:true}).click();
        const coarse=await(await coarseResponse).json();
        expect(coarse.alternatives.every((route:{sourceDatasetIds:string[];status:string})=>route.status==="unverified"&&route.sourceDatasetIds.length===1&&route.sourceDatasetIds[0]==="gale-hrsc-mola-200m")).toBe(true);
        await expect(page.getByTestId("terrain-map-status")).toBeVisible();
        await writeFile("output/playwright/i3a/gale-coarse-comparison.json",JSON.stringify(coarse,null,2));
        await page.getByRole("button",{name:"Save mission",exact:true}).click();
        await page.getByLabel("Routing terrain source",{exact:true}).selectOption("gale-hrsc-30m");
        await page.getByRole("button",{name:"Open saved missions",exact:true}).click();
        await page.getByRole("button",{name:"Open Gale Crater field plan",exact:true}).click();await planView(page);
        await expect(page.getByLabel("Routing terrain source",{exact:true})).toHaveValue("gale-hrsc-mola-200m");
        await expect(page.getByLabel("Maximum waypoint snap (m)",{exact:true})).toHaveValue("150");
        await expect(page.getByTestId("terrain-map-status")).toHaveCount(0);
      }
      await page.getByLabel("Mission region",{exact:true}).selectOption("oxia");await planView(page);
      await expect(page.locator(".panel-scroll")).toContainText("Terrain-aware routing is not yet available for Oxia Planum.");
      await expect(page.getByTestId("terrain-map-status")).toHaveCount(0);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
      expect(errors).toEqual([]);
    });
  }
  test(`Oxia map, unavailable terrain and environment at ${width}px`,async({page})=>{
    const errors:string[]=[];
    page.on("pageerror",error=>errors.push(error.message));
    page.on("console",message=>{if(message.type()==="error")errors.push(message.text());});
    await page.setViewportSize({width,height});await page.goto("/?region=oxia");
    await expect(page.locator(".map-canvas canvas")).toBeVisible();
    await page.getByRole("button",{name:"Layers",exact:true}).click();
    const handle=page.locator(".sheet-handle");if(await handle.isVisible()&&await handle.getAttribute("aria-expanded")==="false")await handle.click();
    for(const category of ["Elevation","Hillshade","Slope","Thermal"]) {
      const section=page.locator(`[data-scientific-category="${category}"]`);await section.getByRole("checkbox").first().check();
    }
    await page.screenshot({path:`output/playwright/i3a/oxia-map-${width}.png`});
    await planView(page);await expect(page.locator(".panel-scroll")).toContainText("Terrain-aware routing is not yet available for Oxia Planum.");
    if(width===1440){const audit=await new AxeBuilder({page}).include(".task-panel").analyze();expect(audit.violations).toEqual([]);}
    await page.goto("/?region=oxia&panel=environment");
    await expect(page.locator(".panel-scroll")).toContainText(/unavailable|no local/i);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    expect(errors).toEqual([]);
  });
}
test("unavailable terrain and stale responses never leave terrain lines",async({page})=>{
  await page.goto("/?region=jezero");await planView(page);
  await addPoint(page,77.450886,18.444627);await addPoint(page,77.19,18.44);
  await page.getByRole("button",{name:"Calculate terrain routes",exact:true}).click();
  await expect(page.locator('[aria-label="Terrain routing"]')).toContainText("Terrain routing unavailable",{timeout:45000});
  await expect(page.getByTestId("terrain-map-status")).toHaveCount(0);
  await expect(page.getByTestId("trajectory-legend")).toHaveCount(0);
  await page.route("**/api/terrain-route",async route=>{await new Promise(resolve=>setTimeout(resolve,800));await route.fulfill({status:400,contentType:"application/json",body:JSON.stringify({error:"Delayed stale result"})});});
  await page.getByRole("button",{name:"Calculate terrain routes",exact:true}).click();
  await page.getByLabel("Mission region",{exact:true}).selectOption("oxia");
  await page.waitForTimeout(1200);await expect(page.getByTestId("terrain-map-status")).toHaveCount(0);
  await expect(page.locator(".panel-scroll")).not.toContainText("Delayed stale result");
});
