// Reproduce opacity-transition timing; read-only local browser diagnostic.
// Run from repository root; results stay in ignored output.
import { chromium } from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('output/registration-investigation', { recursive: true });
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto((process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3100')+'/?region=gale');
 await page.getByRole('button',{name:'Layers',exact:true}).click();
 const handle=page.getByRole('button',{name:/^Plan \u00b7/});if(await handle.isVisible())await handle.click();
 await page.getByRole('checkbox',{name:/Elevation.*MOLA areoid/}).check();
 const opacity=page.getByLabel(/Elevation.*MOLA areoid opacity/);
 const samples=[];
 async function pixels(){
  const b=await page.locator('.map-canvas canvas').screenshot({style:'.map-topline, .map-navigation, .map-bottomline, .map-attribution { visibility: hidden !important; }'});
  return page.evaluate(async encoded=>{
   const im=await createImageBitmap(await(await fetch('data:image/png;base64,'+encoded)).blob());
   const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);im.close();const d=ctx.getImageData(0,0,c.width,c.height).data;
   let colored=0,sum=0;for(let i=0;i<d.length;i+=4){sum+=d[i]+d[i+1]+d[i+2];if(d[i]+d[i+1]+d[i+2]>100&&Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2])>12)colored++;}
   return {colored,mean:sum/(c.width*c.height*3),canvas:[c.width,c.height]};
  },b.toString('base64'));
 }
 for(const value of ['100','0','100']) {
  await opacity.fill(value);const t=performance.now();
  for(let i=0;i<7;i++)samples.push({opacity:value,ms:Math.round(performance.now()-t),...await pixels()});
 }
 fs.writeFileSync('output/registration-investigation/mobile-opacity-probe.json',JSON.stringify(samples,null,2)+'\n');console.log(samples);
 await browser.close();
})();
