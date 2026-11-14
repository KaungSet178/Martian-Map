import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";

const viewports = [[1440, 900], [1024, 768], [768, 1024], [390, 844]];
const products = [
  ["Regional HRSC elevation", "terrain-regional/elevation"],
  ["Regional HRSC hillshade", "terrain-regional/hillshade"],
  ["Regional HRSC slope", "terrain-regional/slope"],
  ["Global HRSC–MOLA elevation", "terrain-global/elevation"],
  ["Global HRSC–MOLA hillshade", "terrain-global/hillshade"],
  ["Global HRSC–MOLA slope", "terrain-global/slope"],
];

async function collapse(page: Page) {
  const button = page.getByRole("button", { name: "Collapse planning panel", exact: true });
  if (await button.isVisible()) await button.click();
  await expect(page.getByLabel("Basemap", { exact: true })).toBeVisible();
  await page.waitForTimeout(350);
}

async function placeTwo(page: Page) {
  const handle = page.getByRole("button", { name: /^Plan ·/ });
  if (await handle.isVisible()) await handle.click();
  await page.getByRole("button", { name: /^Plan/ }).click();
  await page.getByRole("tab", { name: /Surface Waypoints/ }).click();
  await page.getByTestId("toggle-map-placement-btn").click();
  await page.waitForTimeout(500);
  const box = (await page.locator(".map-canvas canvas").boundingBox())!;
  await page.mouse.click(box.x+box.width*.5, box.y+box.height*.5-25);
  await expect(page.getByTestId("map-waypoint-marker")).toHaveCount(1);
  await page.mouse.click(box.x+box.width*.5, box.y+box.height*.5+25);
  await expect(page.getByTestId("map-waypoint-marker")).toHaveCount(2);
  await page.keyboard.press("Escape");
  await collapse(page);
}

async function markers(page: Page) {
  return page.getByTestId("map-waypoint-marker").evaluateAll((nodes) => nodes.map((node) => ({
    label: node.getAttribute("aria-label"), role: node.getAttribute("data-role"),
    transform: (node as HTMLElement).style.transform,
  })));
}

async function pixels(page: Page) {
  const png = await page.locator(".map-canvas canvas").screenshot({
    style: ".map-topline,.map-navigation,.map-bottomline,.map-attribution,.maplibregl-marker {visibility:hidden!important}",
  });
  return page.evaluate(async (encoded) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${encoded}`)).blob());
    const canvas = document.createElement("canvas"); canvas.width=bitmap.width; canvas.height=bitmap.height;
    const context=canvas.getContext("2d")!; context.drawImage(bitmap,0,0); bitmap.close();
    const bytes=context.getImageData(0,0,canvas.width,canvas.height).data;
    let digest=2166136261;
    for (const value of bytes) digest=Math.imul(digest^value,16777619)>>>0;
    return digest;
  }, png.toString("base64"));
}

async function exportedMission(page: Page) {
  await page.getByRole("button", { name: "Open saved missions", exact: true }).click();
  const [download]=await Promise.all([
    page.waitForEvent("download", {timeout:10_000}),
    page.getByRole("button", { name: "Export draft JSON", exact: true }).click({timeout:10_000}),
  ]);
  const stream=await download.createReadStream();
  const chunks: Buffer[]=[];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  await page.keyboard.press("Escape");
  return JSON.parse(Buffer.concat(chunks).toString());
}

async function setTerrain(page: Page, name: string, opacity: string) {
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  const checkbox=page.getByRole("checkbox", { name: new RegExp(name) });
  await checkbox.check();
  await page.getByLabel(new RegExp(`${name}.* opacity`)).fill(opacity);
  await expect(checkbox).toBeChecked();
  await collapse(page);
}

async function shot(page: Page, name: string) {
  await mkdir("docs/images/g4-g5", { recursive: true });
  await page.screenshot({path:`docs/images/g4-g5/${name}.jpg`, type:"jpeg", quality:80});
}

for (const [width,height] of viewports) {
  test(`combined G4/G5 rendered terrain, M3, camera, mission and isolation at ${width}px`, async ({page}) => {
    test.setTimeout(180_000);
    await page.setViewportSize({width,height});
    const responses: string[]=[];
    page.on("response", (response) => {if(response.ok()) responses.push(response.url());});
    await page.goto("/?region=gale");
    await placeTwo(page);
    const before=await markers(page);
    const mission=await exportedMission(page);
    const select=page.getByLabel("Basemap",{exact:true});
    await select.selectOption("color");
    await page.waitForLoadState("networkidle");
    const colorOnly=await pixels(page);
    for (const [index,[name,path]] of products.entries()) {
      await setTerrain(page,name,"60");
      await select.selectOption("ctx");
      await page.waitForLoadState("networkidle");
      const ctx=await pixels(page);
      expect(await markers(page)).toEqual(before);
      if(index===0 && [1440,390].includes(width)) await shot(page,`ctx-regional-${width}`);
      await select.selectOption("color");
      await expect.poll(()=>pixels(page)).not.toBe(ctx);
      expect(await markers(page)).toEqual(before);
      await expect(page.getByTestId("trajectory-legend")).toBeVisible();
      expect(responses.some((url)=>url.includes(path))).toBe(true);
      if([1440,390].includes(width) && [0,1,2].includes(index)) await shot(page,`color-${["regional","hillshade-waypoints","slope"][index]}-${width}`);
      // Actual compositing: zero terrain opacity must recover the same color
      // framebuffer at the same camera, not merely a checked component state.
      await setTerrain(page,name,"0");
      await expect.poll(()=>pixels(page)).toBe(colorOnly);
      await expect(select).toHaveValue("color");
      expect(await markers(page)).toEqual(before);
    }
    expect(await exportedMission(page)).toEqual(mission);
    const a11y=await new AxeBuilder({page}).include(".basemap-control").analyze();
    expect(a11y.violations).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    for(const region of ["jezero","oxia"]) {
      await page.getByLabel("Mission region",{exact:true}).selectOption(region);
      await page.waitForLoadState("networkidle");
      await expect(page.getByTestId("basemap-control")).toHaveCount(0);
      await expect(page.locator(".map-attribution")).not.toContainText("Persaud");
      await page.getByRole("button",{name:"Layers",exact:true}).click();
      await expect(page.getByRole("checkbox",{name:/Regional HRSC|Global HRSC/})).toHaveCount(0);
    }
    await page.getByLabel("Mission region",{exact:true}).selectOption("gale");
    await expect(page.getByLabel("Basemap",{exact:true})).toHaveValue("ctx");
    await expect(page.getByTestId("map-waypoint-marker")).toHaveCount(2);
    await expect(page.locator(".map-failure")).toHaveCount(0);
  });

  test(`combined missing color tile retains terrain and M3 at ${width}px`, async ({page}) => {
    await page.setViewportSize({width,height});
    await page.route("**/usgs-color/**/*.webp",route=>route.fulfill({status:404,body:"Missing"}));
    await page.goto("/?region=gale");
    await placeTwo(page);
    await setTerrain(page,"Regional HRSC hillshade","60");
    const before=await markers(page);
    const framebuffer=await pixels(page);
    await page.getByLabel("Basemap",{exact:true}).selectOption("color");
    await expect(page.getByLabel("Basemap",{exact:true})).toHaveValue("ctx");
    await expect(page.getByTestId("basemap-control")).toContainText("Original CTX restored");
    await expect.poll(()=>pixels(page)).toBe(framebuffer);
    expect(await markers(page)).toEqual(before);
    await page.getByRole("button",{name:"Layers",exact:true}).click();
    await expect(page.getByRole("checkbox",{name:/Regional HRSC hillshade/})).toBeChecked();
    await expect(page.getByLabel(/Regional HRSC hillshade opacity/)).toHaveValue("60");
    await expect(page.getByRole("button",{name:"Zoom map in",exact:true})).toBeEnabled();
    await expect(page.locator(".map-failure")).toHaveCount(0);
  });
}

test("color, regional terrain and independently mapped geology actually composite", async ({page}) => {
  await page.goto("/?region=gale");
  await page.getByLabel("Basemap",{exact:true}).selectOption("color");
  await setTerrain(page,"Regional HRSC hillshade","60");
  await page.getByRole("button",{name:"Layers",exact:true}).click();
  const geology=page.getByRole("checkbox",{name:/Arc Pass geological units/});
  await geology.check();
  await expect(page.getByRole("checkbox",{name:/Regional HRSC hillshade/})).toBeChecked();
  await page.getByLabel(/Arc Pass geological units opacity/).fill("0");
  await collapse(page);
  await page.waitForTimeout(500);
  const withoutGeology=await pixels(page);
  await page.getByRole("button",{name:"Layers",exact:true}).click();
  await page.getByLabel(/Arc Pass geological units opacity/).fill("85");
  await collapse(page);
  await expect.poll(()=>pixels(page)).not.toBe(withoutGeology);
  await expect(page.getByLabel("Basemap",{exact:true})).toHaveValue("color");
});
