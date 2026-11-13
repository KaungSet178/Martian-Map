"""Recheck small PDS orthophoto samples versus committed CTX; no shifts applied.

Run from the repository root. --download permits 260,608 bytes of bounded
source image reads into ignored output. Cached data is verified against audit.
"""
from pathlib import Path
import sys

import numpy as np,requests,json,hashlib,math
from concurrent.futures import ThreadPoolExecutor
from PIL import Image,ImageFilter
root=Path('output/g3-2');a=json.loads(Path('team/gale/sources/g3-2/pds-subset.json').read_text());w,s,e,n=a['bounds_wsen'];R=3396190
lon=np.linspace(w,e,66)[1:-1];lat=np.linspace(n,s,66)[1:-1]
cols=np.floor((R*np.radians(lon)-8141038)/.25).astype(int)
rows=np.floor((-271514-R*np.radians(lat))/.25).astype(int)
expected=json.loads(Path('team/gale/sources/g3-2/local-image-registration.json').read_text())
pinned={tuple(r['range']):r for r in expected['ranges']}
records=[]
url='https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_maps/msl_orbital_map.img'
def fetch(row):
 start=53920+int(row)*26960+int(cols.min());end=53920+int(row)*26960+int(cols.max())
 p=root/f'raw/pds-image-check/{start}-{end}.bin';p.parent.mkdir(parents=True,exist_ok=True)
 if not p.exists():
  if '--download' not in sys.argv: raise SystemExit('Missing cache; --download permits bounded requests')
  with requests.get(url,headers={'Range':f'bytes={start}-{end}'},timeout=30,stream=True) as r:
   assert r.status_code==206
   b=r.raw.read(end-start+2);assert len(b)==end-start+1;p.write_bytes(b)
 b=p.read_bytes();assert hashlib.sha256(b).hexdigest()==pinned[(start,end)]['sha256'];records.append({'range':[start,end],'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
 return np.frombuffer(b,dtype='uint8')[cols-cols.min()]
with ThreadPoolExecutor(max_workers=8) as pool: pds=np.stack(list(pool.map(fetch,rows)))
tiles={}
def ctx(lats):
 result=np.zeros((64,64),dtype='uint8')
 for j,la in enumerate(lats):
  for i,lo in enumerate(lon):
   x=int((lo+180)/360*2**13*256);y=int((1-math.asinh(math.tan(math.radians(la)))/math.pi)/2*2**13*256)
   key=(x//256,y//256)
   if key not in tiles:tiles[key]=np.array(Image.open(f'public/maps/gale/ctx-tiles/13/{key[0]}/{key[1]}.png'))
   result[j,i]=tiles[key][y%256,x%256,0]
 return result
image=ctx(lat);alternative=ctx(np.degrees(np.arctan((3396190/3376200)**2*np.tan(np.radians(lat)))))
np.savez_compressed(root/'local-image-samples.npz',pds=pds,ctx=image)
r={'method':'64x64 local PDS image samples compared with committed NASA CTX display pixels at unmodified published coordinates. No fitted shifts. This tests display convention, not survey accuracy.','reference_url':url,'native_centric_correlation':float(np.corrcoef(pds.ravel(),image.ravel())[0,1]),'wrong_graphic_hypothesis_correlation':float(np.corrcoef(pds.ravel(),alternative.ravel())[0,1]),'samples':4096,'bytes_downloaded':sum(r['bytes'] for r in records),'ranges':sorted(records,key=lambda r:r['range'][0])}
smoothed=[np.array(Image.fromarray(c).filter(ImageFilter.GaussianBlur(2)),float) for c in [pds,image]]
diagnostic=[]
for dy in range(-16,17):
 for dx in range(-16,17):
  a=smoothed[0][16:48,16:48];b=smoothed[1][16+dy:48+dy,16+dx:48+dx]
  diagnostic.append((float(np.corrcoef(a.ravel(),b.ravel())[0,1]),dy,dx))
r['unapplied_translation_diagnostic']={'gaussian_radius_samples':2,'central_patch':[32,32],'search_radius_samples':16,'sample_step_projected_m':1050/65,'best_correlation_row_column':max(diagnostic),'zero_shift_correlation':next(d[0] for d in diagnostic if d[1:]==(0,0)),'interpretation':'Suggests positional mismatch, not an accepted transform, survey offset or correction. No shift applied.'}
(root/'local-image-registration.json').write_bytes((json.dumps(r,indent=2)+'\n').encode())
canvas=Image.new('RGB',(600,320),'#111d30')
for i,array in enumerate([pds,image]):canvas.paste(Image.fromarray(array).resize((290,290)),(i*300,20))
canvas.save(root/'local-registration.png')
print({k:v for k,v in r.items() if k!='ranges'})
