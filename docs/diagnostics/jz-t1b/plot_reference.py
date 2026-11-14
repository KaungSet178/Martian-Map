import sys,json,gzip
from pathlib import Path
sys.path.insert(0,'D:/martian-map/output/g3-geology/python-libs')
sys.path.insert(0,str(Path('.audit-python').resolve()))
import matplotlib;matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np,rasterio
from rasterio.transform import Affine
from rasterio.windows import Window
from scipy.ndimage import map_coordinates
from shapely.geometry import shape
out=Path('docs/diagnostics/jz-t1b');m=json.loads((out/'measurements.json').read_text());rows=json.loads((out/'source/reference-window-ranges.json').read_text())['available_rows_inclusive'];W,S,E,N=m['map_footprint_wsen'];R=3396190.;af=Affine(6.0603893249423999,0,-6100375.77370840032,0,-6.0603893249423999,1145171.16684109997)
with rasterio.open('output/jz-t1b-cache/reference-window.tif') as ds:a=ds.read(1,window=Window(0,rows[0],ds.width,rows[1]-rows[0]+1))
# Diagnostic resampling only; source pixels remain unchanged.
lon=np.linspace(W,E,1800);lat=np.linspace(N,S,800);xx,yy=np.meshgrid(lon,lat);grid=map_coordinates(a.astype(float),[(R*np.radians(yy)-af.f)/af.e-.5-rows[0],(R*np.radians(xx)-R*np.pi-af.c)/af.a-.5],order=1,mode='constant')
with gzip.open(out/'original-intersecting-polygons.geojson.gz','rt') as f:fs=json.load(f)['features']
fig,ax=plt.subplots(figsize=(16,8),layout='constrained');ax.imshow(grid,cmap='gray',extent=(W,E,S,N),vmin=0,vmax=255)
for f in fs:
 g=shape(f['geometry']);ps=g.geoms if g.geom_type=='MultiPolygon' else [g]
 for p in ps:
  for ring in [p.exterior,*p.interiors]:x,y=ring.xy;ax.plot(x,y,color='cyan',lw=.55)
ax.set_xlim(W,E);ax.set_ylim(S,N);ax.set_aspect(1/np.cos(np.radians((S+N)/2)));ax.set_xlabel('Mars east longitude');ax.set_ylabel('Planetocentric latitude');ax.set_title('Original SIM 3464 boundaries over separately published USGS CTX reference\nCyan = original valid polygon boundaries; no correction applied; independent absolute alignment UNVERIFIED');fig.savefig(out/'reference-geology-overlay.png',dpi=180)
