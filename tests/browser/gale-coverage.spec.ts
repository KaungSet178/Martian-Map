import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";

async function expand(page: Page) {
  const handle = page.getByRole("button", { name: /^Plan ·/ });
  if (await handle.isVisible()) await handle.click();
}
async function selectBasemap(page: Page, value: string) {
  const select=page.getByLabel("Basemap",{exact:true});
  const hidden=!(await select.isVisible());
  if(hidden)await page.getByRole("button",{name:"Collapse planning panel",exact:true}).click();
  await select.selectOption(value);await settle(page);
  if(hidden){await page.getByRole("button",{name:"Layers",exact:true}).click();await expand(page);await settle(page);}
}
async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400); // MapLibre camera duration and raster fade.
}
async function frame(page: Page) {
  await settle(page);
  return page.locator(".map-canvas canvas").screenshot({ style: ".map-topline,.map-navigation,.map-bottomline,.map-attribution,.basemap-control{visibility:hidden!important}" });
}
async function digest(page: Page) { return createHash("sha256").update(await frame(page)).digest("hex"); }
async function boundaryPixels(page: Page) {
  const png = await frame(page);
  return page.evaluate(async (encoded) => {
    const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${encoded}`)).blob());
    const canvas = document.createElement("canvas"); canvas.width=image.width;canvas.height=image.height;
    const ctx=canvas.getContext("2d")!;ctx.drawImage(image,0,0);image.close();
    const bytes=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let regional=0,global=0;
    for(let i=0;i<bytes.length;i+=4) {
      if(Math.abs(bytes[i]-208)+Math.abs(bytes[i+1]-189)+Math.abs(bytes[i+2]-255)<25)regional++;
      if(Math.abs(bytes[i]-255)+Math.abs(bytes[i+1]-195)+Math.abs(bytes[i+2]-107)<25)global++;
    }
    return {regional,global};
  },png.toString("base64"));
}
async function shot(page: Page,name:string) {
  await mkdir("output/playwright/phase1",{recursive:true});
  await settle(page);
  await page.screenshot({path:`output/playwright/phase1/${name}.png`});
}

for(const [width,height] of [[1440,900],[1024,768],[768,1024],[390,844]]) {
  test(`coverage independence, fitting, rendering and accessibility at ${width}px`,async({page})=>{
    test.setTimeout(150_000);
    await page.setViewportSize({width,height});
    const errors:string[]=[];const products=new Set<string>();
    page.on("pageerror",e=>errors.push(e.message));
    page.on("response",r=>{if(r.url().includes("/maps/gale/")&&!r.ok())errors.push(`${r.status()} ${r.url()}`);if(r.ok())products.add(r.url());});
    await page.goto("/?region=gale");
    await page.getByRole("button",{name:"Layers",exact:true}).click();await expand(page);
    const regional=page.getByRole("checkbox",{name:"Regional terrain coverage",exact:true});
    const global=page.getByRole("checkbox",{name:"Global terrain coverage",exact:true});
    await expect(regional).not.toBeChecked();await expect(global).not.toBeChecked();
    await expect(page.getByRole("checkbox",{name:/Recorded Curiosity traverse/})).toBeChecked();
    // Establish the explicit overview fit at the current sheet size. Initial
    // page-load fitting happened before the mobile sheet was expanded.
    await page.getByRole("button",{name:"Fit exploration region",exact:true}).click();
    const initial=await digest(page);
    // Keyboard toggle and opacity edits leave the exact initial camera intact.
    await regional.focus();await page.keyboard.press("Space");await expect(regional).toBeChecked();
    expect(await regional.evaluate(el=>el.matches(":focus-visible"))).toBe(true);
    await page.getByLabel("Regional terrain coverage opacity").fill("0");
    expect(await digest(page)).toBe(initial);
    await page.getByLabel("Regional terrain coverage opacity").fill("100");
    await page.getByRole("button",{name:"Zoom to regional terrain coverage",exact:true}).click();
    expect(await digest(page)).not.toBe(initial);
    expect((await boundaryPixels(page)).regional).toBeGreaterThan(150);
    if([1440,390].includes(width))await shot(page,`regional-ctx-${width}`);
    await global.check();await expect(regional).toBeChecked();
    await page.getByRole("button",{name:"Zoom to global terrain coverage",exact:true}).click();
    const both=await boundaryPixels(page);expect(both.regional).toBeGreaterThan(50);expect(both.global).toBeGreaterThan(150);
    await regional.uncheck();await expect(global).toBeChecked();
    expect((await boundaryPixels(page)).regional).toBeLessThan(both.regional);
    await global.uncheck();const globalCamera=await digest(page);
    // A return to CTX proves the basemap selector preserved the exact camera.
    await selectBasemap(page,"color");await selectBasemap(page,"ctx");
    expect(await digest(page)).toBe(globalCamera);
    // All six thematic choices remain independent, and zero-opacity frames
    // recover the same camera/image; this catches accidental terrain auto-fit.
    for(const family of ["Regional HRSC","Global HRSC–MOLA"])for(const theme of ["elevation","hillshade","slope"]) {
      const checkbox=page.getByRole("checkbox",{name:new RegExp(`${family} ${theme}`)});
      await checkbox.check();await page.getByLabel(new RegExp(`${family} ${theme}.* opacity`)).fill("0");
      expect(await digest(page)).toBe(globalCamera);
      await expect(regional).not.toBeChecked();await expect(global).not.toBeChecked();
    }
    await page.getByRole("checkbox",{name:/Global HRSC–MOLA slope/}).uncheck();
    await regional.check();await global.check();
    // Both basemaps keep both selected outlines; inspect real rendered pixels.
    for(const base of ["ctx","color"]) {
      await selectBasemap(page,base);
      await expect(regional).toBeChecked();await expect(global).toBeChecked();
      const pixels=await boundaryPixels(page);expect(pixels.regional).toBeGreaterThan(50);expect(pixels.global).toBeGreaterThan(150);
      if([1440,390].includes(width))await shot(page,`both-${base}-${width}`);
    }
    await page.getByRole("button",{name:"Zoom to regional terrain coverage",exact:true}).click();
    await page.getByRole("checkbox",{name:/Regional HRSC slope/}).check();
    await page.getByLabel(/Regional HRSC slope.* opacity/).fill("60");
    const metadata=page.getByText("Regional HRSC slope · degrees data coverage and scale",{exact:true});
    await metadata.click();await expect(page.locator(".product-metadata[open]")).toContainText("90 m");
    const accessibility=await new AxeBuilder({page}).include(".task-panel").analyze();expect(accessibility.violations).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if([1440,390].includes(width))await shot(page,`metadata-${width}`);
    await page.getByRole("checkbox",{name:/Regional HRSC slope/}).uncheck();
    await regional.uncheck();await global.uncheck();
    const geology=page.getByRole("checkbox",{name:/Arc Pass geological units/});
    const beforeGeology=await digest(page);await geology.check();
    expect(await digest(page)).not.toBe(beforeGeology);
    await expect(page.getByLabel(/Arc Pass geological units opacity/)).toHaveValue("45");
    await geology.uncheck();
    // Reset the same overview with original optical visibility and no new outlines.
    await selectBasemap(page,"ctx");
    await page.getByRole("button",{name:"Fit exploration region",exact:true}).click();
    expect(await digest(page)).toBe(initial);
    // A collapsed sidebar still exposes Layers; explicit fitting remains usable.
    const collapse=page.getByRole("button",{name:"Collapse planning panel",exact:true});
    if(await collapse.isVisible())await collapse.click();
    await page.getByRole("button",{name:"Layers",exact:true}).click();await expand(page);
    await expect(regional).toBeVisible();
    await regional.check();await page.getByRole("button",{name:"Zoom to regional terrain coverage",exact:true}).click();
    await page.getByRole("button",{name:"Zoom map in",exact:true}).click();
    await page.getByRole("button",{name:"Zoom map out",exact:true}).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    for(const path of ["terrain-regional/elevation","terrain-regional/hillshade","terrain-regional/slope","terrain-global/elevation","terrain-global/hillshade","terrain-global/slope","arc-pass-geology.geojson"])expect([...products].some(url=>url.includes(path))).toBe(true);
    expect(errors).toEqual([]);await expect(page.locator(".map-failure")).toHaveCount(0);
  });
}
