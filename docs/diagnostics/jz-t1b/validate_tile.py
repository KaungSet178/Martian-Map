"""Validate one committed categorical tile using independent PROJ geometry/rasterization."""
import sys,json,gzip,math
from pathlib import Path
sys.path.insert(0,'D:/martian-map/output/g3-geology/python-libs')
sys.path.insert(0,str(Path('.audit-python').resolve()))
import numpy as np
from PIL import Image
from rasterio.features import rasterize
from affine import Affine
from shapely.geometry import shape
from shapely.ops import transform
out=Path('docs/diagnostics/jz-t1b');src=json.loads(Path('output/jz-t1b-cache/units-native.json').read_text());attrs={f['attributes']['OBJECTID']:f for f in src['features']}
with gzip.open(out/'original-intersecting-polygons.geojson.gz','rt') as f:fs=json.load(f)['features']
palette={'Nue':'D2B48C','Nle':'A9713C','Nnp1':'9CB380','Nnp2':'7A8B52','Hnpf':'C97B4A','NHjf1':'3D7AB8','NHjf2':'6FA8DC','Njf':'9BD3C8','su':'CDD6D0','Nrb':'D8CFC0','Aeb':'E8D9A0','cr':'8A6642','ci':'6B4F4F','ce':'BFBFBF'}
ids={symbol:i+1 for i,symbol in enumerate(palette)}
def bboxarea(f):
 pts=[p for r in attrs[f['properties']['objectid']]['geometry']['rings'] for p in r];x,y=zip(*pts);return (max(x)-min(x))*(max(y)-min(y))
fs.sort(key=bboxarea,reverse=True)
z,x,y=13,5857,3668;grid=256*2**z
pairs=[]
for f in fs:
 def pix(lon,lat,z=None):
  return (np.asarray(lon)+180)/360*grid-x*256,(.5-np.arcsinh(np.tan(np.radians(lat)))/(2*np.pi))*grid-y*256
 pairs.append((transform(pix,shape(f['geometry'])),ids[f['properties']['symbol']]))
expected=rasterize(pairs,out_shape=(256,256),transform=Affine.identity(),dtype='uint8')
a=np.array(Image.open(out/'source/application-geology-tile.png').convert('RGBA'));actual=np.zeros((256,256),dtype='uint8')
for symbol,color in palette.items():
 rgb=tuple(int(color[k:k+2],16) for k in (0,2,4));actual[np.all(a[:,:,:3]==rgb,axis=2)&(a[:,:,3]>0)]=ids[symbol]
rr,cc=np.indices(expected.shape);lon=(x*256+cc+.5)/grid*360-180;lat=np.degrees(np.arctan(np.sinh(np.pi*(1-2*(y*256+rr+.5)/grid))))
inside=(lon>=77.186786)&(lon<=77.493133)&(lat>=18.401964)&(lat<=18.519663)
interior=inside&(expected>0)
for dy,dx in [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(1,1),(-1,1),(1,-1)]:interior&=expected==np.roll(expected,(dy,dx),(0,1))
interior[[0,-1],:]=False;interior[:,[0,-1]]=False
m={'tile':[z,x,y],'scope':'one committed tile only, unit interiors; not an imagery registration test','interior_pixels_compared':int(interior.sum()),'interior_mismatches':int(((expected!=actual)&interior).sum()),'all_in_map_pixels':int(inside.sum()),'all_in_map_mismatches':int(((expected!=actual)&inside).sum()),'paint_order':'source implementation actually sorts native bounding-box area, not exact polygon area as its comment claims','contact_exclusion':'one-pixel categorical-neighbor exclusion for rasterization-edge differences; not a scientific accuracy threshold'}
(out/'tile-validation.json').write_text(json.dumps(m,indent=2));print(m)
