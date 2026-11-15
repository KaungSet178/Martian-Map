import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
for(const [width,height] of [[1440,900],[768,1024],[390,844]]) test(`F3 cross-region zoom and pan at ${width}px`,async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width,height});await mkdir("output/playwright/f3",{recursive:true});const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 for(const id of ["gale","jezero","oxia"]){
  await page.goto(`/?region=${id}`);await expect(page.locator(".map-location")).toContainText(id==="gale"?"Gale":id==="jezero"?"Jezero":"Oxia");
  const collapse=page.getByRole("button",{name:"Collapse planning panel",exact:true});if(await collapse.isVisible())await collapse.click();
  const canvas=page.locator(".map-canvas canvas");await expect(canvas).toBeVisible();await page.waitForLoadState("networkidle");
  const before=await canvas.screenshot();await page.getByRole("button",{name:"Zoom map in",exact:true}).click();await page.waitForTimeout(650);
  expect((await canvas.screenshot()).equals(before)).toBe(false);
  const box=(await canvas.boundingBox())!;const x=box.x+box.width*.6,y=box.y+box.height*.45;
  const zoomed=await canvas.screenshot();await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-65,y+20,{steps:10});await page.mouse.up();await page.waitForTimeout(650);
  expect((await canvas.screenshot()).equals(zoomed)).toBe(false);
  await page.screenshot({path:`output/playwright/f3/${id}-pan-zoom-${width}.png`});
  await expect(page.locator(".map-failure")).toHaveCount(0);
 }
 expect(errors).toEqual([]);
});
