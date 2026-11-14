import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { regions } from "../../lib/regions/registry";
for(const [width,height] of [[1440,900],[768,1024],[390,844]]) test(`F3 scientific objectives and environment at ${width}px`,async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width,height});await mkdir("output/playwright/f3",{recursive:true});const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 for(const id of ["gale","jezero","oxia"] as const){
  await page.goto(`/?region=${id}`);await expect(page.locator(".map-location")).toContainText(regions[id].name);
  const handle=page.locator(".sheet-handle");if(await handle.isVisible()&&await handle.getAttribute("aria-expanded")==="false")await handle.click();
  for(const target of regions[id].targets) await expect(page.getByRole("button",{name:target.title,exact:true})).toHaveCount(1);
  const target=regions[id].targets[id==="jezero"?2:0];await page.getByRole("button",{name:target.title,exact:true}).click();
  await expect(page.getByRole("dialog")).toContainText("Positional uncertainty: unknown");
  if(id==="jezero") {await expect(page.getByRole("dialog")).toContainText("not the tube depot");await expect(page.getByRole("dialog")).toContainText("Not a routable waypoint");}
  await page.screenshot({path:`output/playwright/f3/${id}-objective-${width}.png`});
  await page.keyboard.press("Escape");
  await page.getByRole("button",{name:"Environment",exact:true}).first().click();
  const panel=page.locator(".panel-scroll");
  if(id==="gale"){await expect(panel).toContainText("REMS");await expect(panel).toContainText("RAD");}
  if(id==="jezero")await expect(panel).toContainText("MEDA");
  if(id==="oxia")await expect(panel).toContainText(/no.*local|unavailable|not.*available/i);
  await page.screenshot({path:`output/playwright/f3/${id}-environment-${width}.png`});
  await page.getByRole("button",{name:"Data and limitations",exact:true}).first().click();
  for(const record of regions[id].contextual_datasets)await expect(page.locator(".panel-scroll")).toContainText(record.availability.reason);
  await page.screenshot({path:`output/playwright/f3/${id}-evidence-register-${width}.png`});
 }
 expect(errors).toEqual([]);await writeFile(`output/playwright/f3/science-environment-${width}.json`,JSON.stringify({errors,regions:3,objectives_checked:15},null,2));
});
