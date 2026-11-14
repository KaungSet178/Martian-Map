import json,sys,math
from pathlib import Path
sys.path.insert(0,'D:/martian-map/output/g3-geology/python-libs')
sys.path.insert(0,str(Path('.audit-python').resolve()))
import numpy as np,rasterio
from scipy.ndimage import map_coordinates
from scipy.signal import fftconvolve
from PIL import Image
out=Path('docs/diagnostics/jz-t1b');m=json.loads((out/'measurements.json').read_text());rows=json.loads((out/'source/ctx-window-ranges.json').read_text())['available_rows_inclusive'];R=3396190;z,x,y=13,5857,3668;rr,cc=np.indices((256,256));lon=(x*256+cc+.5)/(256*2**z)*360-180;lat=np.degrees(np.arctan(np.sinh(np.pi*(1-2*(y*256+rr+.5)/(256*2**z)))))
with rasterio.open('output/jz-t1b-cache/application-window.tif') as ds:
 a=ds.read(1,window=rasterio.windows.Window(0,rows[0],ds.width,rows[1]-rows[0]+1));af=ds.transform
expected=map_coordinates(a.astype(float),[(R*np.radians(lat)-af.f)/af.e-.5-rows[0],(R*np.radians(lon)-af.c)/af.a-.5],order=1)
actual=np.array(Image.open(out/'source/application-ctx-tile.png').convert('RGBA'))[:,:,0].astype(float);template=expected[16:-16,16:-16];template-=template.mean();num=fftconvolve(actual,template[::-1,::-1],mode='valid');ones=np.ones(template.shape);s=fftconvolve(actual,ones,mode='valid');sq=fftconvolve(actual**2,ones,mode='valid');ncc=num/(np.linalg.norm(template)*np.sqrt(np.maximum(sq-s*s/template.size,1e-10)));dy,dx=np.unravel_index(ncc.argmax(),ncc.shape)
val={'tile':[z,x,y],'best_offset_pixels':[int(dx)-16,int(dy)-16],'ncc_peak':float(ncc.max()),'method':'Application committed tile versus native official CTX window sampled at exact Web Mercator pixel centers, bilinear diagnostic sampling, normalized cross correlation; no output changed','scope':'Single tile relative check, not absolute control or a byte-for-byte resampling assertion'};(out/'ctx-tile-validation.json').write_text(json.dumps(val,indent=2));print(val)
m['source_integrity']={'native_source_sha256':json.loads((out/'source/native-source-reference.json').read_text())['sha256'],'application_script_sha256':{p:__import__('hashlib').sha256(Path(p).read_bytes()).hexdigest() for p in ['regions/jezero/config.ts','regions/jezero/layers.ts','team/jezero/geology/build_geology.mjs','team/jezero/basemap/prepare_trek_basemap.mjs']}}
(out/'measurements.json').write_text(json.dumps(m,indent=2));print('invalid',m['projection_checks']['invalid']);print('samples',m['projection_checks']['sample_count'])
