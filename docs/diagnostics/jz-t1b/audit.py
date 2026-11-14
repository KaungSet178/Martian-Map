"""JZ-T1B: numerical/coverage audit. No production asset is written."""
import sys,json,math,hashlib,re,gzip
from pathlib import Path
sys.path.insert(0,str(Path('.audit-python').resolve()))
sys.path.insert(0,'D:/martian-map/output/g3-geology/python-libs')
sys.path.insert(0,str(Path('.audit-python').resolve()))
import numpy as np
import rasterio
from rasterio.windows import Window
from rasterio.io import MemoryFile
from rasterio.features import rasterize,shapes
from rasterio.transform import Affine
from pyproj import CRS,Transformer,Geod
from shapely.geometry import Polygon,box,mapping,shape,LineString,Point
from shapely.ops import transform,unary_union
from shapely.validation import explain_validity
from scipy.ndimage import map_coordinates
from scipy.signal import fftconvolve
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection

OUT=Path('docs/diagnostics/jz-t1b');CACHE=Path('output/jz-t1b-cache');SRC=Path('output/jz-t1b-cache')
R=3396190.;rad=math.pi/180;W,S,E,N=77.186786,18.401964,77.493133,18.519663
geo=CRS.from_proj4(f'+proj=longlat +R={R}');geod=Geod(a=R,b=R)
raw=json.loads((SRC/'units-native.json').read_text());native=CRS.from_wkt(raw['spatialReference']['wkt']);inv=Transformer.from_crs(native,geo,always_xy=True);fwd=Transformer.from_crs(geo,native,always_xy=True)
foot=box(W,S,E,N);features=[];invalid=[];groups={}
for f in raw['features']:
 a=f['attributes'];shells=[];holes=[]
 for r in f['geometry']['rings']:
  area=sum(x*v-u*y for (x,y),(u,v) in zip(r,r[1:]));(shells if area<0 else holes).append(r)
 p=unary_union([Polygon(s,[h for h in holes if Polygon(s).contains(Polygon(h).representative_point())]) for s in shells])
 if not p.is_valid:
  invalid.append({'objectid':a['OBJECTID'],'name':a['name'],'reason':explain_validity(p),'bounds_native':list(p.bounds)});continue
 g=transform(inv.transform,p);hits=g.intersects(foot);groups.setdefault(a['name'],[]).append((a,g))
 if hits:features.append({'type':'Feature','properties':{'objectid':a['OBJECTID'],'name':a['name'],'symbol':a['symbol'],'geographic_status':'PARTIALLY_VERIFIED','registration':'UNVERIFIED','selectable':False},'geometry':mapping(g)})
with gzip.open(OUT/'original-intersecting-polygons.geojson.gz','wt',encoding='utf-8') as f:json.dump({'type':'FeatureCollection','coordinate_convention':'Mars planetocentric latitude/east longitude; NOT terrestrial WGS84','features':features},f)
samples=json.loads((OUT/'source/application-transform-samples.json').read_text());xy=np.array(samples['native_xy']);app=np.array(samples['application_lonlat']);lon,lat=inv.transform(xy[:,0],xy[:,1]);err=geod.inv(app[:,0],app[:,1],lon,lat)[2];rx,ry=fwd.transform(lon,lat);roundtrip=np.hypot(rx-xy[:,0],ry-xy[:,1])
checks={'feature_count':len(raw['features']),'valid_count':len(raw['features'])-len(invalid),'invalid':invalid,'sample_count':len(xy),'application_vs_pyproj_max_m':float(np.max(err)),'roundtrip_max_m':float(np.max(roundtrip)),'axis_order':'always_xy (easting,northing -> longitude,latitude)','geology_wkt':native.to_wkt()}
print('PROJECTION',checks['application_vs_pyproj_max_m'],checks['roundtrip_max_m'],flush=True)
# Read ONLY downloaded application rows. TIFF nodata=0 is explicit in the source header.
wr=json.loads((OUT/'source/ctx-window-ranges.json').read_text());row0,row1=wr['available_rows_inclusive']
with rasterio.open(CACHE/'application-window.tif') as ds:
 col0=math.floor((R*rad*W-ds.transform.c)/ds.transform.a);col1=math.ceil((R*rad*E-ds.transform.c)/ds.transform.a)
 win=Window(col0,row0,col1-col0+1,row1-row0+1);img=ds.read(1,window=win);aff=ds.window_transform(win);nodata=ds.nodata;ctx_meta={'crs_wkt':ds.crs.to_wkt(),'affine':list(ds.transform)[:6],'width':ds.width,'height':ds.height,'nodata':nodata,'pixel_corner_vs_center':'affine maps corners; pixel centers add 0.5 to row/column','window':list(win.flatten())}
mask=img!=nodata;h,w=img.shape
# Pixel footprint, not the rectangular raster envelope. Diagnostic valid-data region from original nodata.
geotrans=Affine(aff.a/(R*rad),0,aff.c/(R*rad),0,aff.e/(R*rad),aff.f/(R*rad))
valid_shapes=[shape(g) for g,v in shapes(mask.astype('uint8'),mask=mask,transform=geotrans) if v==1];valid_foot=unary_union(valid_shapes)
fd={'type':'FeatureCollection','coordinate_convention':'Mars sphere geographic (not Earth WGS84)','features':[{'type':'Feature','properties':{'kind':'supported_map_extent','annotation':True},'geometry':mapping(foot)},{'type':'Feature','properties':{'kind':'application_CTX_valid_pixels_in_window','source':'original TIFF nodata=0','resolution_m':6},'geometry':mapping(valid_foot)}]}
(OUT/'coverage.geojson').write_text(json.dumps(fd))
regions=[]
for name,items in sorted(groups.items()):
 hits=[(a,g) for a,g in items if g.intersects(foot)];regions.append({'name':name,'classification':'PARTIALLY_VERIFIED' if hits else 'OUT_OF_COVERAGE','alignment':'UNVERIFIED' if hits else 'NOT_EVALUATED','selectable':False,'positional_uncertainty_m':None,'source_reported_offset_range_m':[100,200],'intersecting_objectids':[a['OBJECTID'] for a,g in hits],'extends_beyond_supported_extent':bool(hits and any(not foot.covers(g) for a,g in hits)),'extends_beyond_imagery_within_map':bool(hits and any(not valid_foot.covers(g.intersection(foot)) for a,g in hits))})
# Three panels: actual application original pixels, original unit boundaries, coverage mask.
colors=plt.get_cmap('tab20');fig,axes=plt.subplots(3,1,figsize=(16,16),layout='constrained');extent=(geotrans.c,geotrans.c+w*geotrans.a,geotrans.f+h*geotrans.e,geotrans.f)
for ax in axes[:2]:ax.imshow(np.ma.masked_where(~mask,img),cmap='gray',extent=extent,vmin=0,vmax=255,interpolation='nearest')
for f in features:
 g=shape(f['geometry']);polys=list(g.geoms) if g.geom_type=='MultiPolygon' else [g]
 for poly in polys:
  for ring in [poly.exterior,*poly.interiors]:
   x,y=ring.xy;axes[1].plot(x,y,lw=.6,color=colors(sorted(groups).index(f['properties']['name'])%20))
axes[0].set_title('Actual application CTX source pixels (6 m); original nodata transparent')
axes[1].set_title('Original SIM 3464 boundaries — no shift/rotation/repair; alignment UNVERIFIED')
axes[2].imshow(mask,cmap='Greys',extent=extent,interpolation='nearest');axes[2].set_title('Actual source valid pixels in supported window; white = nodata, black = data')
for ax in axes:
 ax.plot([W,E,E,W,W],[S,S,N,N,S],color='red',lw=1);ax.set_xlim(W,E);ax.set_ylim(S,N);ax.set_aspect(1/math.cos((S+N)/2*rad));ax.set_xlabel('East longitude (Mars degrees)');ax.set_ylabel('Planetocentric latitude');ax.grid(alpha=.2)
fig.savefig(OUT/'application-geology-coverage.png',dpi=180);plt.close(fig)
# Standalone HiRISE browse is real imagery but annotated/resized; do NOT assign map coordinates.
from PIL import Image
browse=Image.open(CACHE/'hirise-browse.jpg');fig,ax=plt.subplots(figsize=(8,14),layout='constrained');ax.imshow(browse);ax.axis('off');ax.set_title('Independent HiRISE ESP_045994_1985_RED browse\nAnnotated browse; not georeferenced or used as ground control');fig.savefig(OUT/'independent-hirise-browse.png',dpi=180);plt.close(fig)
# Independently test conflicting HiRISE embedded GeoJP2 WKT against the authoritative PDS label.
with MemoryFile((CACHE/'hirise-prefix.bin').read_bytes()) as mem:
 with mem.open() as ds:
  hdr=CRS.from_wkt(ds.crs.to_wkt());af=ds.transform;hw,hh=ds.width,ds.height
Rhi=3394839.8133163
# PDS's equirectangular uses 15deg true-scale parallel, not a 15deg northing origin.
pds=CRS.from_proj4(f'+proj=eqc +lat_ts=15 +lat_0=0 +lon_0=180 +R={Rhi} +units=m')
hi_geo=CRS.from_proj4(f'+proj=longlat +R={Rhi}')
pdsinv=Transformer.from_crs(pds,hi_geo,always_xy=True);hdrinv=Transformer.from_crs(hdr,hi_geo,always_xy=True)
hipoints=[]
for c,r in [(0,0),(hw,hh),(hw/2,hh/2)]:
 x,y=af*(c,r);expected=pdsinv.transform(x,y);embedded=hdrinv.transform(x,y);hipoints.append({'pixel_corner':[c,r],'pds_label_lonlat':expected,'embedded_wkt_lonlat':embedded,'difference_m':geod.inv(*expected,*embedded)[2]})
hi={'pds_radius_m':Rhi,'pds_proj':pds.to_wkt(),'embedded_wkt':hdr.to_wkt(),'affine':list(af)[:6],'comparisons':hipoints,'status':'CONFLICT: embedded WKT must not be used blindly; PDS label reconstruction retained as diagnostic only','browse_dimensions':browse.size,'native_dimensions':[hw,hh],'browse_georeferencing':'not established; no control points extracted'}
# Registration results are optional until independently described reference rows are available.
registration={'absolute_status':'UNVERIFIED','accepted_ground_control_points':0,'control_points':[],'correction_applied':False,'relative_image_registration':None}
refpath=CACHE/'reference-window.tif'
if refpath.exists():
 rr=json.loads((OUT/'source/reference-window-ranges.json').read_text());r0,r1=rr['available_rows_inclusive'];raf=Affine(6.0603893249423999,0,-6100375.77370840032,0,-6.0603893249423999,1145171.16684109997)
 with rasterio.open(refpath) as ds: ref=ds.read(1,window=Window(0,r0,ds.width,r1-r0+1))
 yy,xx=np.indices(img.shape);worldx=aff.c+(xx+.5)*aff.a;worldy=aff.f+(yy+.5)*aff.e
 # Same spherical/planetocentric angular coordinates; different central meridian.
 refx=(worldx-R*math.pi-raf.c)/raf.a-.5;refy=(worldy-raf.f)/raf.e-.5-r0
 refgrid=map_coordinates(ref.astype('float32'),[refy,refx],order=1,mode='constant',cval=0)
 ties=[];size=64;search=80
 for j,fy in enumerate([.25,.5,.75]):
  for i,fx in enumerate([.2,.5,.8]):
   cy=int(h*fy);cx=int(w*fx);small=refgrid[cy-32:cy+32,cx-32:cx+32];large=img[cy-32-search:cy+32+search,cx-32-search:cx+32+search].astype('float64')
   if small.shape!=(64,64) or large.shape!=(224,224) or np.any(small==0) or np.any(large==0):continue
   small=small-small.mean();norm=float(np.sqrt((small*small).sum()))
   numer=fftconvolve(large,small[::-1,::-1],mode='valid');ones=np.ones((64,64));sums=fftconvolve(large,ones,mode='valid');sq=fftconvolve(large**2,ones,mode='valid');den=norm*np.sqrt(np.maximum(sq-sums*sums/4096,1e-9));ncc=numer/den;dy,dx=np.unravel_index(np.argmax(ncc),ncc.shape);dx=int(dx)-search;dy=int(dy)-search
   lon0=(aff.c+(cx+.5)*6)/(R*rad);lat0=(aff.f-(cy+.5)*6)/(R*rad);east=dx*6*math.cos(lat0*rad);north=-dy*6
   ties.append({'id':f'window-{j}-{i}','role':'calibration' if (i+j)%2==0 else 'validation','kind':'candidate image correlation tie; NOT surveyed/accepted ground control','longitude_east':lon0,'planetocentric_latitude':lat0,'match_dx_pixels':dx,'match_dy_pixels':dy,'east_m':east,'north_m':north,'ncc_peak':float(ncc.max()),'search_boundary_hit':abs(dx)==search or abs(dy)==search})
 cal=[t for t in ties if t['role']=='calibration' and not t['search_boundary_hit']];val=[t for t in ties if t['role']=='validation' and not t['search_boundary_hit']]
 shift=np.median([[t['east_m'],t['north_m']] for t in cal],axis=0) if cal else np.array([np.nan,np.nan])
 for t in ties:t['translation_holdout_residual_m']=float(np.hypot(t['east_m']-shift[0],t['north_m']-shift[1]))
 registration['relative_image_registration']={'source':'USGS J03_045994_1986_XN_18N282W_6m_ORTHO versus application SOC_008','independence_limitation':'Separate processing/publication; overlapping acquisition lineage and no independently surveyed control. Does not certify geological boundaries.','template_pixels':64,'search_radius_pixels':80,'sample_spacing_m':6,'candidate_ties':ties,'calibration_translation_east_north_m':shift.tolist(),'holdout_count':len(val),'holdout_rmse_m':float(np.sqrt(np.mean([t['translation_holdout_residual_m']**2 for t in val]))) if val else None,'rotation_scale_local_distortion':'Not certified: correlation ties have not been independently landmark-identified; no physical transform fitted or applied.'}
 fig,axs=plt.subplots(2,1,figsize=(16,10),layout='constrained');axs[0].imshow(refgrid,cmap='gray',extent=extent,vmin=0,vmax=255);axs[1].imshow(img,cmap='gray',extent=extent,vmin=0,vmax=255)
 for t in ties:
  x=t['longitude_east'];y=t['planetocentric_latitude'];axs[1].annotate('',xy=(x+t['east_m']/(R*rad*math.cos(y*rad)),y+t['north_m']/(R*rad)),xytext=(x,y),arrowprops={'arrowstyle':'->','color':'cyan' if t['role']=='validation' else 'orange'});axs[1].text(x,y,t['id'],color='yellow',fontsize=8)
 for ax in axs:ax.set_xlim(W,E);ax.set_ylim(S,N);ax.set_aspect(1/math.cos((N+S)/2*rad));ax.set_xlabel('Mars east longitude');ax.set_ylabel('Planetocentric latitude')
 axs[0].set_title('Separate USGS reference CTX: georeferenced from authoritative ISIS label');axs[1].set_title('Candidate relative-image discrepancy vectors at true scale; orange calibration / cyan held-out\nNo vectors are surveyed control; polygons were not adjusted');fig.savefig(OUT/'relative-image-registration.png',dpi=180);plt.close(fig)
 (OUT/'candidate-image-ties.geojson').write_text(json.dumps({'type':'FeatureCollection','coordinate_convention':'Mars planetocentric/east; diagnostic ties only','features':[{'type':'Feature','properties':t,'geometry':mapping(Point(t['longitude_east'],t['planetocentric_latitude']))} for t in ties]},indent=2))
m={'milestone':'JZ-T1B','starting_commit':'d9fbe2f2bf845ef76e69b61cfa0f874246630ca6','map_footprint_wsen':[W,S,E,N],'projection_checks':checks,'application_ctx':ctx_meta,'supported_map_valid_CTX_pixel_fraction':float(mask.mean()),'unit_groups':regions,'hirise_header_discrepancy':hi,'registration':registration,'no_production_changes':True,'source_reported_geology_offsets_m':[100,200],'diagnostic_scope':'Coordinate correctness is separate from absolute geographic alignment. No selectable targets certified.'}
(OUT/'measurements.json').write_text(json.dumps(m,indent=2,allow_nan=False));print('COVERAGE',len(features),len(regions),sum(bool(r['intersecting_objectids']) for r in regions),'valid pixels',mask.mean(),flush=True);print('REGISTRATION',json.dumps(registration),flush=True)
