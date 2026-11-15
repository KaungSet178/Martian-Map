import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {EvidenceDetails} from '../../components/science/evidence';
import {regions} from '../../lib/regions/registry';
import {marsDistance} from '../../lib/map/geodesy';
import {threeForksSite} from '../../regions/location-evidence';
test('I4C source-rounded Oxia detections and independent target separation',()=>{
 const capture=JSON.parse(readFileSync('docs/evidence/f3/oxia-aqueous-query.json','utf8'));
 for(const target of regions.oxia.targets){
  assert.equal(target.evidence,'Interpreted');assert.equal(target.routing_eligibility.status,'unavailable');
  const c=target.coordinates!;
  assert.ok(capture.response.features.some((f:{geometry:{x:number;y:number}})=>Math.round(((f.geometry.x+360)%360)*100)/100===c.longitude_east&&Math.round(f.geometry.y*100)/100===c.latitude));
 }
 const [a,b,c]=regions.oxia.targets;assert.ok(Math.abs(marsDistance(a.coordinates!,b.coordinates!)-36077)<2);assert.ok(Math.abs(marsDistance(a.coordinates!,c.coordinates!)-15763)<50);
});
test('I4C Three Forks local primary capture means landing circle, not depot',()=>{
 const source=readFileSync('docs/evidence/f3/three-forks-2618.txt','utf8');
 assert.match(source,/landing site is defined as[\s\S]{0,100}18\.45369687/);
 assert.equal(threeForksSite.objective_waypoint_eligible,false);assert.equal(threeForksSite.registration_verified,false);
 for(const region of [regions.gale,regions.jezero])assert.ok(region.targets.every(t=>t.coordinates===null));
});
test('I4C unknown resolution visibly disclosed in data register',()=>{
 const html=renderToStaticMarkup(createElement(EvidenceDetails,{region:regions.gale}));
 assert.match(html,/Resolution: unavailable/);
});
test('I4C Jezero generator: missing derivative neighbor must remain unknown',()=>{
 // Execute the actual generator neighbor expression with a missing western support.
 // This is a kernel regression, not certification of all rendered alpha pixels.
 const source=readFileSync('team/jezero/terrain/build_slope.mjs','utf8');
 const expression=source.match(/const west = ([^;]+);/)?.[1];assert.ok(expression);
 const sample=new Function('valid','grid','gi','e',`return (${expression})`)([0,1,1],[NaN,100,200],1,100);
 assert.ok(sample===null||!Number.isFinite(sample),'Missing west support was replaced by a valid center elevation; derivative can flatten nodata edges');
});
