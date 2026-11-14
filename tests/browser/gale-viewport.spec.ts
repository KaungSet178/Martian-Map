import { test, expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const out = "team/gale/viewport/screenshots";
async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(450);
}
async function frame(page: Page) {
  await settle(page);
  return page.locator(".map-canvas canvas").screenshot({
    style: ".map-topline,.map-navigation,.map-bottomline,.map-attribution,.placement-banner{visibility:hidden!important}",
  });
}
async function shot(page: Page, name: string) {
  await settle(page); await page.screenshot({ path: `${out}/${name}.png` });
}
async function outsideDifference(page: Page, a: Buffer, b: Buffer) {
  return page.evaluate(async ([left, right]) => {
    const read = async (base64: string) => {
      const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
      const canvas = document.createElement("canvas"); canvas.width=image.width;canvas.height=image.height;
      const ctx=canvas.getContext("2d")!;ctx.drawImage(image,0,0);image.close();
      return ctx.getImageData(0,0,canvas.width,canvas.height);
    };
    const aa=await read(left),bb=await read(right);
    if(aa.width!==bb.width||aa.height!==bb.height)throw new Error("Camera canvas resized during comparison");
    let changed=0;
    for(let y=0;y<aa.height;y++)for(let x=0;x<aa.width;x++) {
      // Outer 10% columns are well outside the narrow mission rectangle at
      // the explicit full-mission fit, at all three supported aspect ratios.
      if(x>=aa.width*.1&&x<=aa.width*.9)continue;
      const p=(y*aa.width+x)*4;
      if(Math.abs(aa.data[p]-bb.data[p])+Math.abs(aa.data[p+1]-bb.data[p+1])+Math.abs(aa.data[p+2]-bb.data[p+2])>3)changed++;
    }
    return changed;
  },[a.toString("base64"),b.toString("base64")]);
}

async function beyondMissionDifference(page: Page, base: Buffer, mission: Buffer, full: Buffer) {
  return page.evaluate(async (images) => {
    const arrays = await Promise.all(images.map(async (encoded) => {
      const image=await createImageBitmap(await(await fetch(`data:image/png;base64,${encoded}`)).blob());
      const canvas=document.createElement("canvas");canvas.width=image.width;canvas.height=image.height;
      const ctx=canvas.getContext("2d")!;ctx.drawImage(image,0,0);image.close();return ctx.getImageData(0,0,canvas.width,canvas.height);
    }));
    const [aa,bb,cc]=arrays;
    const differs=(a:Uint8ClampedArray,b:Uint8ClampedArray,p:number)=>Math.abs(a[p]-b[p])+Math.abs(a[p+1]-b[p+1])+Math.abs(a[p+2]-b[p+2])>3;
    let left=aa.width,right=-1,top=aa.height,bottom=-1;
    for(let y=0;y<aa.height;y++)for(let x=0;x<aa.width;x++)if(differs(aa.data,bb.data,(y*aa.width+x)*4)) {
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
    if(right<left)throw new Error("Mission overlay did not render");
    let changed=0;
    for(let y=0;y<aa.height;y++)for(let x=0;x<aa.width;x++)
      if((x<left||x>right||y<top||y>bottom)&&differs(aa.data,cc.data,(y*aa.width+x)*4))changed++;
    return changed;
  },[base,mission,full].map(image=>image.toString("base64")));
}

for(const [width,height] of [[1440,900],[768,1024],[390,844]]) {
  test(`Gale authentic context and scientific-only clipping at ${width}px`,async({page})=>{
    test.setTimeout(150_000); await mkdir(out,{recursive:true});
    const errors:string[]=[],responses:{url:string;status:number}[]=[];
    page.on("pageerror",error=>errors.push(error.message));
    page.on("response",response=>{
      if(response.url().includes("/maps/")) {
        responses.push({url:new URL(response.url()).pathname,status:response.status()});
        if(!response.ok())errors.push(`${response.status()} ${response.url()}`);
      }
    });
    await page.setViewportSize({width,height});await page.goto("/?region=gale");
    await expect(page.locator(".map-canvas canvas")).toBeVisible();await settle(page);
    const measurement=await page.evaluate(()=>{
      const rect=(s:string)=>{const r=document.querySelector(s)!.getBoundingClientRect();return{width:r.width,height:r.height};};
      return{workspace:rect(".map-workspace"),canvas:rect(".map-canvas canvas"),overflow:document.documentElement.scrollWidth>innerWidth};
    });
    expect(measurement.canvas).toEqual(measurement.workspace);expect(measurement.overflow).toBe(false);
    const initial=await frame(page);
    const dark=await page.evaluate(async(encoded)=>{
      const image=await createImageBitmap(await(await fetch(`data:image/png;base64,${encoded}`)).blob());
      const canvas=document.createElement("canvas");canvas.width=image.width;canvas.height=image.height;
      const ctx=canvas.getContext("2d")!;ctx.drawImage(image,0,0);image.close();
      const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;let count=0;
      for(let p=0;p<data.length;p+=4)if(Math.abs(data[p]-13)+Math.abs(data[p+1]-25)+Math.abs(data[p+2]-40)<10)count++;
      return count/(data.length/4);
    },initial.toString("base64"));
    expect(dark).toBeLessThan(.05);
    await shot(page,`gale-after-${width}`);
    await page.getByRole("button",{name:"Layers",exact:true}).click();
    const expand=page.getByRole("button",{name:/^Plan ·/});if(await expand.isVisible())await expand.click();
    await page.getByRole("button",{name:"Fit exploration region",exact:true}).click();
    await expect(page.getByRole("radio",{name:"Mission View (Default)",exact:true})).toBeChecked();
    const contextFrame=await frame(page);
    await shot(page,`gale-mission-view-${width}`);
    await shot(page,`gale-detailed-ctx-${width}`);
    const checks:{layer:string;outside_changed:number}[]=[];
    for(const [label,id,opacity] of [
      ["Regional HRSC elevation","gale-regional-elevation","60"],
      ["Regional HRSC hillshade","gale-regional-hillshade","45"],
      ["Regional HRSC slope","gale-regional-slope","60"],
      ["THEMIS daytime","gale-thermal","60"],
    ]) {
      const control=page.getByRole("checkbox",{name:new RegExp(label)});
      await control.check();await expect(page.locator(`#opacity-${id}`)).toHaveValue(opacity);
      await page.locator(`#opacity-${id}`).fill("100");
      const changed=await outsideDifference(page,contextFrame,await frame(page));
      expect(changed,`${id} must not obscure background outside mission`).toBe(0);
      checks.push({layer:id,outside_changed:changed});
      await control.scrollIntoViewIfNeeded();await shot(page,`${id}-${width}`);
      await control.uncheck();
    }
    for(const theme of ["elevation","hillshade","slope"]) {
      const control=page.getByRole("checkbox",{name:new RegExp(`Global HRSC–MOLA ${theme}`)});
      await control.check();
      expect(await outsideDifference(page,contextFrame,await frame(page))).toBe(0);
      await control.uncheck();
    }
    const global=page.getByRole("checkbox",{name:/Global HRSC–MOLA elevation/});
    await global.check();await page.locator("#opacity-gale-global-elevation").fill("100");
    const globalMission=await frame(page);
    await page.getByRole("radio",{name:"Full Data Coverage",exact:true}).check();
    expect(await beyondMissionDifference(page,contextFrame,globalMission,await frame(page))).toBeGreaterThan(500);
    await shot(page,`gale-full-coverage-${width}`);
    await page.getByRole("radio",{name:"Mission View (Default)",exact:true}).check();
    expect(await outsideDifference(page,contextFrame,await frame(page))).toBe(0);
    await page.getByRole("radio",{name:"Full Data Coverage",exact:true}).check();
    await page.getByRole("checkbox",{name:"Global terrain coverage",exact:true}).check();
    await page.getByRole("button",{name:"Zoom to global terrain coverage",exact:true}).click();
    await shot(page,`gale-global-outline-${width}`);
    await page.getByRole("radio",{name:"Mission View (Default)",exact:true}).check();
    await global.uncheck();
    await page.getByLabel("Mission region",{exact:true}).selectOption("jezero");await settle(page);
    await expect(page.locator(".map-location")).toContainText("Jezero");
    await expect(page.getByTestId("basemap-control")).toHaveCount(0);
    await page.getByLabel("Mission region",{exact:true}).selectOption("oxia");await settle(page);
    await expect(page.locator(".map-location")).toContainText("Oxia");
    await page.getByLabel("Mission region",{exact:true}).selectOption("gale");await settle(page);
    await expect(page.locator(".map-failure")).toHaveCount(0);
    expect(responses.some(r=>r.url.includes("/context-tiles/"))).toBe(true);
    expect(responses.some(r=>r.url.includes("/ctx-tiles/"))).toBe(true);
    await writeFile(`team/gale/viewport/after-${width}.json`,JSON.stringify({width,height,...measurement,dark_fraction:dark,checks,errors,responses},null,2)+"\n");
    expect(errors).toEqual([]);
  });
}
