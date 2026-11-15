import { writeFileSync } from 'node:fs';
import { regions } from '../../lib/regions/registry';
import { categoryLayers, scientificCategories } from '../../lib/map/scientific-categories';
import { execFileSync } from 'node:child_process';
const records = Object.values(regions).flatMap(region => region.layers.map(layer => {
 const category = scientificCategories.find(c => categoryLayers(region,c).some(l=>l.id===layer.id)) ?? (layer.kind==='optical'?'Basemap':'Overlay');
 const standardName = category==='Thermal' ? (layer.id.includes('night')?'Thermal (night IR)':'Thermal (day IR)') : category==='Basemap'?'CTX basemap':category;
 return {region:region.id,category,standardName,...layer,source:region.source_references.find(s=>s.id===layer.source_id)??null};
}));
writeFileSync('docs/evidence/i4c/layer-inventory.json',JSON.stringify({sourceRevision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scientificCount:records.filter(r=>scientificCategories.some(c=>c===r.category)).length,records},null,2)+'\n');
console.log(records.map(r=>`${r.region}\t${r.id}\t${r.category}\t${r.display_name}\t${r.spatial_resolution_m}\t${r.evidence}`).join('\n'));
