import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
for(const [width,height] of [[1440,900],[768,1024],[390,844],[320,640],[844,390]])for(const region of ['gale','jezero','oxia'])test(`I4C layer interaction ${region} ${width}x${height}`,async({page})=>{
 await page.setViewportSize({width,height});await page.goto(`/?region=${region}`);
 await expect(page.locator('.map-canvas canvas')).toBeVisible();
 await page.getByRole('button',{name:'Layers',exact:true}).first().click();
 const observations=[];
 for(const category of ['Elevation','Hillshade','Slope','Thermal']){
  const group=page.locator(`[data-scientific-category="${category}"]`);
  const controls=group.getByRole('checkbox');
  for(let i=0;i<await controls.count();i++){
   const control=controls.nth(i);await control.check();await expect(control).toBeChecked();
   const product=control.locator('xpath=../..');const slider=product.getByRole('slider');
   await slider.focus();await page.keyboard.press('Home');await expect(slider).toHaveValue('0');await page.keyboard.press('End');await expect(slider).toHaveValue('100');
   await control.focus();await page.keyboard.press('Space');await expect(control).not.toBeChecked();await page.keyboard.press('Space');await expect(control).toBeChecked();
   observations.push({category,label:await control.locator('..').innerText(),metadata:await product.innerText()});
  }
 }
 const dir='output/playwright/i4c';await mkdir(dir,{recursive:true});await page.screenshot({path:`${dir}/${region}-${width}.png`});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 await writeFile(`${dir}/${region}-${width}.json`,JSON.stringify({region,width,height,overflow,observations},null,2));
 await page.getByLabel('Mission region',{exact:true}).selectOption(region==='gale'?'jezero':'gale');
 await expect(page.locator(`[id^="opacity-${region}-"]`)).toHaveCount(0);
});
