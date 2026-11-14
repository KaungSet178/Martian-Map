import { test, expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { regions } from "../../lib/regions/registry";
import { categoryLayers, scientificCategories } from "../../lib/map/scientific-categories";

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(450);
}
async function frame(page: Page) {
  await settle(page);
  return page.locator(".map-canvas canvas").screenshot({ style: ".task-panel,.map-topline,.map-navigation,.map-bottomline,.map-attribution,.basemap-control{visibility:hidden!important}" });
}
async function difference(page: Page, a: Buffer, b: Buffer) {
  return page.evaluate(async (encoded) => {
    const data = await Promise.all(encoded.map(async (value) => {
      const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${value}`)).blob());
      const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext("2d")!; context.drawImage(image,0,0); image.close();
      return context.getImageData(0,0,canvas.width,canvas.height).data;
    }));
    let changed = 0;
    for (let i=0;i<data[0].length;i+=4) if (Math.abs(data[0][i]-data[1][i])+Math.abs(data[0][i+1]-data[1][i+1])+Math.abs(data[0][i+2]-data[1][i+2]) > 3) changed++;
    return changed;
  }, [a.toString("base64"), b.toString("base64")]);
}
for (const [width,height] of [[1440,900],[768,1024],[390,844]]) {
  for (const regionId of ["gale","jezero","oxia"] as const) {
    test(`${regionId} four categories render, opacity, metadata and switching at ${width}px`, async ({page}) => {
      test.setTimeout(180_000);
      const out = "output/playwright/three-region"; await mkdir(out,{recursive:true});
      const errors: string[] = [], responses: {url:string;status:number}[] = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("response", response => { if(response.url().includes("/maps/")) responses.push({url:new URL(response.url()).pathname,status:response.status()}); });
      await page.setViewportSize({width,height}); await page.goto(`/?region=${regionId}`);
      await expect(page.locator(".map-canvas canvas")).toBeVisible(); await settle(page);
      await page.getByRole("button",{name:"Layers",exact:true}).click();
      const handle = page.getByRole("button",{name:/^Plan \u00b7/}); if(await handle.isVisible()) await handle.click();
      const checks: {category:string;layer:string;visible_pixels:number;opacity_pixels:number}[] = [];
      for(const category of scientificCategories) {
        const section=page.locator(`[data-scientific-category="${category}"]`);
        await expect(section.getByRole("heading",{name:category,exact:true})).toBeVisible();
        const layers=categoryLayers(regions[regionId],category);
        for(const layer of layers) {
          const control=section.getByRole("checkbox",{name: new RegExp(`^${layer.display_name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}`)});
          await control.uncheck(); const before=await frame(page);
          await control.check(); const slider=page.locator(`#opacity-${layer.id}`); await slider.fill("100");
          await expect(section.locator(".legend-detail").first()).toBeVisible();
          await expect(section).toContainText(layer.attribution!);
          await expect(section).toContainText("Coverage:");
          const after=await frame(page); const visible_pixels=await difference(page,before,after);
          expect(visible_pixels,`${layer.id} must change actual canvas pixels`).toBeGreaterThan(10);
          await slider.fill("25"); const opacity_pixels=await difference(page,after,await frame(page));
          expect(opacity_pixels,`${layer.id} opacity must change actual canvas pixels`).toBeGreaterThan(10);
          await page.screenshot({path:`${out}/${regionId}-${layer.id}-${width}.png`});
          await writeFile(`${out}/${regionId}-${layer.id}-${width}-map.png`,after);
          checks.push({category,layer:layer.id,visible_pixels,opacity_pixels});
          await control.uncheck();
        }
      }
      expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
      if(regionId === "jezero") await expect(page.locator(".science-marker")).toHaveCount(0);
      for(const next of ["gale","jezero","oxia",regionId] as const) {
        await page.getByLabel("Mission region",{exact:true}).selectOption(next); await settle(page);
        await expect(page.locator(".map-location")).toContainText(regions[next].name);
        await expect(page.locator(".map-failure")).toHaveCount(0);
      }
      expect(responses.filter(response=>response.status>=400)).toEqual([]);
      expect(errors).toEqual([]);
      await writeFile(`${out}/${regionId}-${width}.json`,JSON.stringify({checks,errors,responses},null,2));
    });
  }
}

test("verified Oxia stops retain markers while Jezero objectives never fabricate waypoints", async ({page}) => {
  const errors: string[]=[]; page.on("pageerror",error=>errors.push(error.message));
  for (const id of ["oxia","jezero"] as const) {
    await page.goto(`/?region=${id}`);
    await expect(page.locator(".map-canvas canvas")).toBeVisible();
    await expect(page.locator(".science-marker")).toHaveCount(0);
    const target=regions[id].targets[0];
    await page.getByRole("button",{name:`Add ${target.title}`,exact:true}).click();
    await expect(page.locator(".science-marker")).toHaveCount(id === "oxia" ? 1 : 0);
    await page.getByRole("button",{name:"Save mission",exact:true}).click();
    const waypoints=await page.evaluate((regionId)=>{
      const missions=JSON.parse(localStorage.getItem("marswalk.missions.v1")!);
      return missions.find((mission: {region:string})=>mission.region===regionId)?.waypoint_plan?.waypoints ?? [];
    },id);
    if(id === "jezero") expect(waypoints).toEqual([]);
    else {
      expect(waypoints).toHaveLength(1);
      expect(waypoints[0].coordinates).toEqual(target.coordinates);
    }
  }
  expect(errors).toEqual([]);
});
