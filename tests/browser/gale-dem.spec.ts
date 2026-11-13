import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function expand(page: Page) {
  const handle = page.getByRole("button", { name: /^Plan \u00b7/ });
  if (await handle.isVisible()) await handle.click();
}

async function pixels(page: Page) {
  const png = await page.locator(".map-canvas canvas").screenshot({
    style: ".map-topline, .map-navigation, .map-bottomline, .map-attribution { visibility: hidden !important; }",
  });
  return page.evaluate(async (encoded) => {
    const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${encoded}`)).blob());
    const canvas = document.createElement("canvas"); canvas.width=image.width; canvas.height=image.height;
    const ctx=canvas.getContext("2d")!; ctx.drawImage(image,0,0); image.close();
    const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let colored=0, brightness=0;
    for(let i=0;i<data.length;i+=4) {
      brightness+=data[i]+data[i+1]+data[i+2];
      if(data[i]+data[i+1]+data[i+2]>100 && Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2])>12) colored++;
    }
    return {colored, mean:brightness/(canvas.width*canvas.height*3)};
  },png.toString("base64"));
}

for(const [width,height] of [[1440,900],[1024,768],[768,1024],[390,844]]) {
  test(`real DEM views, uncertainty, opacity and isolation at ${width}px`, async({page}) => {
    await page.setViewportSize({width,height});
    const errors:string[]=[],requested:string[]=[];
    page.on("pageerror",error=>errors.push(error.message));
    page.on("response",response=>{
      if(response.url().includes("/maps/gale/")) {
        requested.push(response.url());
        if(!response.ok()) errors.push(`${response.status()} ${response.url()}`);
      }
    });
    await page.goto("/?region=gale");
    await page.getByRole("button",{name:"Layers",exact:true}).click(); await expand(page);
    const names=["Elevation · MOLA areoid","DEM hillshade","DEM slope · degrees"];
    for(const [i,name] of names.entries()) {
      const control=page.getByRole("checkbox",{name:new RegExp(name)});
      await expect(control).not.toBeChecked(); await control.check();
      const product=control.locator("xpath=ancestor::div[contains(@class,'data-product')]");
      await expect(product).toContainText("CTX alignment is unverified");
      await expect(product).toContainText("75 m");
      await expect(product).toContainText("not astronaut safety");
      await expect(product).toContainText("outside is unaudited");
      for(const other of names.filter(n=>n!==name)) await expect(page.getByRole("checkbox",{name:new RegExp(other)})).not.toBeChecked();
      await expect(page.getByRole("checkbox",{name:/Gale CTX orbital mosaic/})).toBeChecked();
      await expect(page.getByRole("checkbox",{name:/Recorded Curiosity traverse/})).toBeChecked();
      const kind=["elevation","hillshade","slope"][i];
      await expect.poll(()=>requested.some(url=>url.includes(`/dem/${kind}/`))).toBe(true);
      await expect(product.locator(".legend-detail")).toContainText(["MOLA areoid","315°","degrees (°)"][i]);
      const opacity=page.getByLabel(new RegExp(`${name} opacity`));
      await expect(opacity).toHaveValue("100");
      await opacity.fill("0"); const baseline=await pixels(page);
      await opacity.fill("100");
      if(i!==1) await expect.poll(async()=> (await pixels(page)).colored).toBeGreaterThan(baseline.colored+100);
      else await expect.poll(async()=>Math.abs((await pixels(page)).mean-baseline.mean)).toBeGreaterThan(.1);
      await product.scrollIntoViewIfNeeded();
      await page.screenshot({path:`output/playwright/gale-g3-2-${kind}-${width}.png`});
      if(i===2) {
        const a11y=await new AxeBuilder({page}).include(".task-panel").analyze();
        expect(a11y.violations).toEqual([]);
      }
    }
    await page.getByRole("button",{name:"Fit exploration region",exact:true}).click();
    await expect(page.locator(".map-failure")).toHaveCount(0);
    for(const region of ["jezero","oxia"]) {
      await page.getByLabel("Mission region",{exact:true}).selectOption(region); await expand(page);
      await page.getByRole("button",{name:"Layers",exact:true}).click();
      for(const name of names) await expect(page.getByRole("checkbox",{name:new RegExp(name)})).toHaveCount(0);
      await expect(page.locator(".map-attribution")).not.toContainText("PDS PLACES");
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
