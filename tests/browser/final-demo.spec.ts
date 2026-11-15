import {test,expect} from "@playwright/test";
for(const [width,height] of [[1440,900],[390,844]])test(`final demo Jezero slope quarantine and terrain controls ${width}x${height}`,async({page})=>{
 await page.setViewportSize({width,height});const slopeRequests:string[]=[],errors:string[]=[];page.on("request",r=>{if(r.url().includes("/maps/jezero/slope-tiles/"))slopeRequests.push(r.url());});page.on("pageerror",e=>errors.push(e.message));
 await page.goto("/?region=jezero");const handle=page.locator(".sheet-handle");if(await handle.isVisible()&&await handle.getAttribute("aria-expanded")==="false")await handle.click();await page.getByRole("button",{name:"Layers",exact:true}).click();
 const slope=page.locator('[data-scientific-category="Slope"]');await expect(slope).toContainText("I4C-01");await expect(slope.getByRole("checkbox")).toBeDisabled();await expect(slope.getByRole("checkbox")).not.toBeChecked();
 for(const name of ["Elevation","Hillshade","Thermal"]){const section=page.locator(`[data-scientific-category="${name}"]`);await expect(section.getByRole("checkbox")).toBeEnabled();}
 await slope.getByRole("note").scrollIntoViewIfNeeded();await expect(slope.getByRole("note")).toBeVisible();expect(slopeRequests).toEqual([]);expect(errors).toEqual([]);await page.screenshot({path:`output/playwright/final-demo-slope-${width}.png`});
});
