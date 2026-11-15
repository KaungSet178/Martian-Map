import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { regions } from '../../lib/regions/registry';
import { categoryLayers, scientificCategories } from '../../lib/map/scientific-categories';
import { LayerManager } from '../../components/science/evidence';
import { updateLayerState } from '../../lib/map/region-layers';
import { slopeClass,tokens } from './style-contract';
test('I4C proposed slope boundaries treat unknown separately',()=>{
 for(const [v,e] of [[0,'Low'],[9.999,'Low'],[10,'Moderate'],[15,'Steep'],[19.999,'Steep'],[20,'High concern'],[25,'High concern'],[90,'High concern'],[null,'Unavailable'],[-1,'Unavailable'],[NaN,'Unavailable']] as const)assert.equal(slopeClass(v),e);
});
for(const region of Object.values(regions)) {
 test(`I4C ${region.id}: category order and retired layers`,()=>{
  assert.deepEqual(scientificCategories,['Elevation','Hillshade','Slope','Thermal']);
  for(const id of ['gale-geology','jezero-geology','oxia-geology']) {
   assert.ok(!region.layers.some(l=>l.id===id));
   assert.deepEqual(updateLayerState(region,{},id,{visible:true}),{});
  }
 });
 for(const category of scientificCategories) for(const layer of categoryLayers(region,category)) {
  const key=`I4C ${layer.id}`;
  test(`${key}: source reference and units`,()=>{
   assert.ok(region.source_references.some(s=>s.id===layer.source_id));
   if(category==='Slope')assert.match(layer.legend?.units??'',/deg|°/i);
   if(category==='Thermal')assert.equal(layer.legend?.units,null,'relative mosaics must not acquire temperature units');
  });
  test(`${key}: standard name`,()=>{
   const expected=category==='Thermal'?(region.id==='oxia'?'Thermal (night IR)':'Thermal (day IR)'):category;
   assert.ok(layer.display_name===expected||layer.display_name.startsWith(`${expected} · `),`expected ${expected}, got ${layer.display_name}`);
  });
  if(category==='Hillshade'||category==='Slope'||category==='Elevation')test(`${key}: derived evidence`,()=>assert.equal(layer.evidence,'Derived'));
  if(category!=='Hillshade')test(`${key}: common numeric color contract`,()=>{
   const expected=category==='Elevation'?tokens.elevation:category==='Slope'?tokens.slope:tokens.thermal;
   assert.deepEqual(layer.legend?.items.map(i=>i.color.toUpperCase()),expected.map(c=>c.toUpperCase()),'regenerate numeric raster and legend together; do not merely replace legend swatches');
   if(category==='Slope')assert.deepEqual(layer.legend?.items.map(i=>i.label),['0° to <10° · Low','10° to <15° · Moderate','15° to <20° · Steep','20° to 90° · High concern']);
  });
  test(`${key}: source and resolution immediately associated with legend`,()=>{
   const noop=()=>{};
   const html=renderToStaticMarkup(createElement(LayerManager,{region:{...region,layers:[layer]},layerStates:{[layer.id]:{visible:true,opacity:60}},onLayerChange:noop,preview:false,setPreview:noop,contours:false,setContours:noop,markers:true,setMarkers:noop,opacity:60,setOpacity:noop,onEvidence:noop,onZoomToCoverage:noop}));
   assert.ok(html.includes(layer.attribution??'SOURCE MISSING'));
   assert.match(html,/(?:Resolution:\s|<dt>Resolution<\/dt>)/i,'a number in free-text limitations is not an explicit resolution field');
  });
 }
}
