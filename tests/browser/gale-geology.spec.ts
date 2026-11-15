import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
for (const [width,height] of [[1440,900],[768,1024],[390,844]]) {
  test(`F3 retired units absent across region switches at ${width}px`,async({page})=>{
    test.setTimeout(120000); await mkdir("output/playwright/f3",{recursive:true});
    const errors:string[]=[],requests:string[]=[];page.on("pageerror",e=>errors.push(e.message));
    page.on("request",r=>requests.push(r.url()));await page.setViewportSize({width,height});
    await page.goto("/?region=gale");
    for(const region of ["gale","jezero","oxia","gale"]){
      await page.getByLabel("Mission region",{exact:true}).selectOption(region);
      await expect(page.locator(".map-canvas canvas")).toBeVisible();
      await page.getByRole("button",{name:"Layers",exact:true}).click();
      const handle=page.locator(".sheet-handle");if(await handle.isVisible()&&await handle.getAttribute("aria-expanded")==="false")await handle.click();
      await expect(page.getByRole("checkbox",{name:/Arc Pass|Geology|geological units|Shapes/i})).toHaveCount(0);
      await expect(page.locator(".map-failure")).toHaveCount(0);
      for(const category of ["Elevation","Hillshade","Slope","Thermal"])await expect(page.locator(`[data-scientific-category="${category}"]`)).toBeVisible();
      await page.screenshot({path:`output/playwright/f3/${region}-no-units-${width}.png`});
    }
    expect(requests.filter(u=>/arc-pass-geology|geology-tiles|objective.*polygon/.test(u))).toEqual([]);expect(errors).toEqual([]);
    await writeFile(`output/playwright/f3/removal-${width}.json`,JSON.stringify({errors,retired_layer_requests:requests.filter(u=>/geology/.test(u))},null,2));
  });
}
