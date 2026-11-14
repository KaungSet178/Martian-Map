"""Phase 0 read-only source/footprint audit; writes only sibling diagnostic files.
Run with --raw-dir corrected integration/output/g4/raw --gis-libs audit libraries.
"""
import argparse, json, math, sys, subprocess, zipfile, re
from pathlib import Path
from hashlib import sha256
from collections import Counter
sys.dont_write_bytecode=True
p=argparse.ArgumentParser(); p.add_argument('--raw-dir',type=Path,required=True); p.add_argument('--gis-libs',type=Path); p.add_argument('--global-ranges',type=Path); args=p.parse_args()
if args.gis_libs: sys.path.insert(0,str(args.gis_libs))
import numpy as np
import rasterio, pyproj, pyogrio, shapely
from shapely.geometry import shape
from PIL import Image
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
HERE=Path(__file__).resolve().parent; ROOT=HERE.parents[2]; R=3396190.; M=R*math.pi/180
G4=json.loads((ROOT/'team/gale/G4_TERRAIN_AUDIT.json').read_text())
b=G4['overview_footprint']; OV=[b[k] for k in ['west_east','south_latitude','east_east','north_latitude']]
def digest(p): return sha256(p.read_bytes()).hexdigest()
def area(b):
 w,s,e,n=b
 return R**2*math.radians(e-w)*(math.sin(math.radians(n))-math.sin(math.radians(s)))
def git(*a): return subprocess.check_output(['git',*a],cwd=ROOT,text=True).strip()
def statuses():
 paths=[x[9:] for x in git('worktree','list','--porcelain').splitlines() if x.startswith('worktree ')]
 return {p:subprocess.check_output(['git','-C',p,'status','--porcelain'],text=True).strip() for p in paths}
out={'starting_commit':git('rev-parse','HEAD'),'overview_wsen':OV,'overview_area_m2':area(OV),'worktrees_before':statuses(),
 'tools':{'python':sys.version.split()[0],'rasterio':rasterio.__version__,'gdal':rasterio.__gdal_version__,'pyproj':pyproj.__version__,'proj':pyproj.proj_version_str,'shapely':shapely.__version__,'pyogrio':pyogrio.__version__}}
receipts={}; fig,axes=plt.subplots(1,3,figsize=(17,7))
for key,filename,folder in [('regional_hrsc_30m','hrsc_km09_h1938_h1927_h1916-dtm-mosaic.tif','terrain-regional'),('global_usgs_200m','usgs_hrsc_mola_200m_gale.tif','terrain-global')]:
 path=args.raw_dir/filename; receipts[str(path)]=digest(path); assert receipts[str(path)]==G4[key]['source_sha256']
 with rasterio.open(path) as src:
  a=src.transform; mask=(src.read_masks(1)>0)&np.isfinite(src.read(1)); bounds=list(src.bounds); projected=src.crs.is_projected
  to_geo=(lambda b:[v/M for v in b]) if projected else (lambda b:b)
  yy,xx=np.where(mask); left,top=a*(int(xx.min()),int(yy.min())); right,bottom=a*(int(xx.max())+1,int(yy.max())+1)
  if projected:
   row_area=30*R*(np.sin((a.f-np.arange(src.height)*30)/R)-np.sin((a.f-(np.arange(src.height)+1)*30)/R))
  else:
   north=a.f+np.arange(src.height)*a.e; row_area=R**2*math.radians(a.a)*(np.sin(np.radians(north))-np.sin(np.radians(north+a.e)))
  extent=G4[key]['extent_wsen']; w,s,e,n=extent
  step=a.a if projected else a.a*M
  native=[v*M for v in extent] if projected else extent
  col=round((native[0]-a.c)/a.a); row=round((native[3]-a.f)/a.e); width=round((native[2]-native[0])/a.a); height=round((native[1]-native[3])/a.e)
  support_input=mask[row-1:row+height+1,col-1:col+width+1]
  support=np.logical_and.reduce([support_input[y:y+height,x:x+width] for y in range(3) for x in range(3)])
  assert support.all() and support.size==G4[key]['valid_analysis_cells']
  d={'source_filename':filename,'source_sha256':receipts[str(path)],'crs_wkt':src.crs.to_wkt(),'width':src.width,'height':src.height,'dtype':src.dtypes[0],'nodata':src.nodata,
   'affine_abcdef':list(a)[:6],'source_native_bounds':bounds,'source_wsen':to_geo(bounds),'source_valid_bbox_wsen':to_geo([left,bottom,right,top]),
   'valid_mask_sha256':sha256(mask.tobytes()).hexdigest(),'source_valid_cells':int(mask.sum()),'source_total_cells':mask.size,'source_valid_cell_area_m2':float(row_area@mask.sum(axis=1)),
   'derived_width':width,'derived_height':height,'derived_affine_abcdef':list(a*rasterio.Affine.translation(col,row))[:6],'derived_window_col_row':[col,row],
   'input_support_width_height':[width+2,height+2],'derived_extent_wsen':extent,'derived_valid_cells':int(support.sum()),'derived_spherical_area_m2':area(extent),'area_ratio_to_overview':area(extent)/area(OV),
   'grid_step_north_m':step,'grid_step_east_at_overview_center_m':step*math.cos(math.radians((OV[1]+OV[3])/2)),
   'tiles_hash_checked':0,'tile_alpha_pair_mismatches':0,'tile_alpha_inverse_sampling_mismatches':0,'alpha_by_zoom':{}}
  if projected:
   gb=to_geo(bounds); axes[0].imshow(mask[::20,::20],extent=[gb[0],gb[2],gb[1],gb[3]],origin='upper',cmap='Greys',vmin=0,vmax=1)
   axes[0].set_xlim(to_geo(bounds)[0]-.05,to_geo(bounds)[2]+.05); axes[0].set_ylim(to_geo(bounds)[1]-.05,to_geo(bounds)[3]+.05)
  for tile,receipt in G4[key]['tiles'].items():
   assert digest(ROOT/tile)==receipt['sha256'],tile
   d['tiles_hash_checked']+=1
  for ep in sorted((ROOT/'public/maps/gale'/folder/'elevation').glob('*/*/*.png')):
   rel=ep.relative_to(ROOT/'public/maps/gale'/folder/'elevation'); z,x,y=int(rel.parts[0]),int(rel.parts[1]),int(ep.stem); alpha=np.array(Image.open(ep))[...,3]
   for kind in ['slope','hillshade']:
    other=np.array(Image.open(ROOT/'public/maps/gale'/folder/kind/rel))[...,3]
    d['tile_alpha_pair_mismatches']+=int(np.count_nonzero(alpha!=other))
   scale=256*2**z; lon=(x*256+np.arange(256)+.5)/scale*360-180; lat=np.degrees(np.arctan(np.sinh(math.pi*(1-2*(y*256+np.arange(256)+.5)/scale))))
   inside=(lon[None,:]>=w)&(lon[None,:]<e)&(lat[:,None]<=n)&(lat[:,None]>s)
   d['tile_alpha_inverse_sampling_mismatches']+=int(np.count_nonzero((alpha>0)!=inside))
   yy,xx=np.where(alpha>0); entry=d['alpha_by_zoom'].setdefault(str(z),{'opaque_pixels':0,'bbox_wsen':None}); entry['opaque_pixels']+=len(xx)
   if len(xx):
    xb=[x*256+int(xx.min()),x*256+int(xx.max())+1]; yb=[y*256+int(yy.min()),y*256+int(yy.max())+1]
    bb=[xb[0]/scale*360-180,math.degrees(math.atan(math.sinh(math.pi*(1-2*yb[1]/scale)))),xb[1]/scale*360-180,math.degrees(math.atan(math.sinh(math.pi*(1-2*yb[0]/scale))))]
    old=entry['bbox_wsen']; entry['bbox_wsen']=bb if old is None else [min(old[0],bb[0]),min(old[1],bb[1]),max(old[2],bb[2]),max(old[3],bb[3])]
  assert d['tile_alpha_pair_mismatches']==d['tile_alpha_inverse_sampling_mismatches']==0
  ts=(ROOT/'regions/gale/terrain-layers.ts').read_text()
  extent_name='regionalExtent' if projected else 'globalExtent'
  block=re.search(r'export const '+extent_name+r' = \{(.*?)\};',ts,re.S).group(1)
  values={name:float(value) for name,value in re.findall(r'(west_east|south_latitude|east_east|north_latitude): ([-0-9.]+)',block)}
  assert [values[k] for k in ['west_east','south_latitude','east_east','north_latitude']]==extent
  coverage=json.loads((ROOT/'public/maps/gale'/folder/'coverage.geojson').read_text())
  assert list(shape(coverage['features'][0]['geometry']).bounds)==extent
  d['runtime_and_coverage_bounds_match']=True
  out[key]=d
archive=ROOT/'team/gale/sources/g3/Geomap.gdb.zip'; receipts[str(archive)]=digest(archive)
assert receipts[str(archive)]=='783f052b5bb5eb7b478e66ce6c972816f8adc0e154be0176bc817b14cd7e8a24'
with zipfile.ZipFile(archive) as z: assert z.testzip() is None
vsi='/vsizip/'+archive.as_posix()+'/Geomap.gdb'
meta,fids,wkb,fields=pyogrio.raw.read(vsi,layer='map_unit_polygons_v2',return_fids=True); native=shapely.from_wkb(wkb)
_,_,boundary_wkb,_=pyogrio.raw.read(vsi,layer='boundary_box'); boundary=shapely.union_all(shapely.from_wkb(boundary_wkb))
units=fields[list(meta['fields']).index('Unit')]; inv=pyproj.Transformer.from_crs(meta['crs'],pyproj.CRS(meta['crs']).geodetic_crs,always_xy=True)
geographic=shapely.transform(shapely.force_2d(native),inv.transform,interleaved=False)
display=json.loads((ROOT/'public/maps/gale/arc-pass-geology.geojson').read_text()); byid={f['id']:f for f in display['features']}; delta=0.
for fid,geom,unit in zip(fids,geographic,units):
 f=byid[int(fid)]; assert f['properties']['Unit']==unit
 left=shapely.get_coordinates(geom); right=shapely.get_coordinates(shape(f['geometry'])); assert left.shape==right.shape; delta=max(delta,float(np.abs(left-right).max()))
union=shapely.union_all(shapely.force_2d(native)); geo=shapely.union_all(geographic); bounds=list(geo.bounds)
features=json.loads((ROOT/'public/maps/gale/curiosity-traverse.geojson').read_text())['features']
traverse=shape({'type':'GeometryCollection','geometries':[f['geometry'] for f in features]}); traverse_m=shapely.transform(traverse,lambda xy:xy*M)
geod=pyproj.Geod(a=R,b=R); surface_area=abs(geod.geometry_area_perimeter(shapely.orient_polygons(geo))[0])
out['arc_pass']={'archive_sha256':receipts[str(archive)],'geojson_sha256':digest(ROOT/'public/maps/gale/arc-pass-geology.geojson'),'native_bounds_m':list(union.bounds),'geographic_wsen':bounds,
 'feature_count':len(native),'unit_counts':dict(Counter(str(u) for u in units)),'valid_features':int(shapely.is_valid(native).sum()),'empty_features':int(shapely.is_empty(native).sum()),
 'source_to_display_max_vertex_delta_degrees':delta,'projected_union_area_m2':union.area,'spherical_union_area_m2':surface_area,'projected_boundary_area_m2':boundary.area,
 'source_overlap_m2':float(shapely.area(native).sum()-union.area),'source_unmapped_inside_boundary_m2':boundary.difference(union).area,'outside_boundary_m2':union.difference(boundary).area,
 'spherical_bbox_area_m2':area(bounds),'bbox_width_ground_m':(bounds[2]-bounds[0])*M*math.cos(math.radians((bounds[1]+bounds[3])/2)),'bbox_height_ground_m':(bounds[3]-bounds[1])*M,
 'area_percent_overview':surface_area/area(OV)*100,'traverse_wsen':list(traverse.bounds),'traverse_intersection_projected_length_m':traverse_m.intersection(union).length,
 'traverse_intersecting_source_features':sum(shape(f['geometry']).intersects(geo) for f in features)}
def lines(geometry):
 if geometry.geom_type in ['LineString','LinearRing']: yield geometry
 elif hasattr(geometry,'geoms'):
  for part in geometry.geoms: yield from lines(part)
def rect(ax,b,color,label): ax.add_patch(Rectangle((b[0],b[1]),b[2]-b[0],b[3]-b[1],fill=False,edgecolor=color,lw=1.6,label=label))
for ax in axes[:2]:
 rect(ax,out['regional_hrsc_30m']['derived_extent_wsen'],'tab:blue','Regional 30 m display'); rect(ax,out['global_usgs_200m']['derived_extent_wsen'],'tab:orange','Global-derived crop'); rect(ax,OV,'tab:green','Fixed overview / color clip'); rect(ax,bounds,'tab:red','Arc Pass study')
 for geom in lines(traverse):
  xy=shapely.get_coordinates(geom); ax.plot(xy[:,0],xy[:,1],color='purple',lw=.6)
 ax.set_aspect(1/math.cos(math.radians(-4.7))); ax.set_xlabel('East longitude (degrees)'); ax.set_ylabel('Planetocentric latitude (degrees)'); ax.legend(fontsize=7,loc='lower left')
axes[0].set_title('Original HRSC valid mask (20-cell preview)'); axes[1].set_title('Display bounds vs fixed overview'); axes[1].set_xlim(137.05,137.75); axes[1].set_ylim(-5.15,-4.25)
for f in display['features']:
 for polygon in shapely.get_parts(shape(f['geometry'])):
  xy=np.array(polygon.exterior.coords); axes[2].fill((xy[:,0]-bounds[0])*M*math.cos(math.radians(-4.7872)),(xy[:,1]-bounds[1])*M,alpha=.3,edgecolor='black',lw=.3)
for geom in lines(traverse):
 xy=shapely.get_coordinates(geom); axes[2].plot((xy[:,0]-bounds[0])*M*math.cos(math.radians(-4.7872)),(xy[:,1]-bounds[1])*M,color='purple',lw=1)
axes[2].set_xlim(-25,290); axes[2].set_ylim(-25,245); axes[2].set_aspect('equal'); axes[2].set_title('Arc Pass polygons / recorded traverse'); axes[2].set_xlabel('Approximate east metres from study west'); axes[2].set_ylabel('North metres from study south')
fig.suptitle('Phase 0 coordinate diagnostics; not independent ground-control registration\nThe fixed overview is a source extent. Interactive viewport varies with layout and navigation.',fontsize=12); fig.tight_layout(); fig.savefig(HERE/'footprints.png',dpi=160); plt.close(fig)
out['raw_inputs_unchanged']={p:digest(Path(p))==h for p,h in receipts.items()}; assert all(out['raw_inputs_unchanged'].values()); out['worktrees_after']=statuses()
if args.global_ranges:
 cache=args.global_ranges
 report=json.loads((ROOT/'team/gale/sources/integration/global-source-check.json').read_text())
 chunks=[]
 for offset in range(0,1024**2,65536):
  path=cache/f'{offset}-65536.bin'; data=path.read_bytes()
  assert len(data)==65536 and sha256(data).hexdigest()==json.loads(path.with_suffix('.json').read_text())['sha256']
  chunks.append(data)
 prefix=b''.join(chunks); assert sha256(prefix).hexdigest()==report['header_sha256']
 with rasterio.io.MemoryFile(prefix) as mem,mem.open() as original:
  assert list(original.transform)[:6]==report['source_affine']
  a=original.transform; original_bounds=list(original.bounds)
  out['original_global_header']={'prefix_sha256':sha256(prefix).hexdigest(),'width':original.width,'height':original.height,'affine_abcdef':list(a)[:6],'wsen':original_bounds,'nodata':original.nodata,'dtype':original.dtypes[0],'crs_wkt':original.crs.to_wkt(),'full_global_valid_mask':'Not read: 11.38 GB source not downloaded; Gale subset validity independently checked.'}
 sys.path.insert(0,str(ROOT/'scripts/gale-basemap'))
 from audit import Tiff
 class Header:
  def read(self,offset,size): return prefix[offset:offset+size]
 tags=Tiff(Header()).ifds[0]
 sample_checks=[]
 with rasterio.open(args.raw_dir/'usgs_hrsc_mola_200m_gale.tif') as src:
  col0,row0=report['subset_col_row']
  for sample in report['samples']:
   local_row=sample['subset_row']; offset=tags[273][row0+local_row]+col0*2
   data=(cache/f'{offset}-{src.width*2}.bin').read_bytes()
   assert sha256(data).hexdigest()==sample['range_sha256']
   np.testing.assert_array_equal(np.frombuffer(data,dtype='<i2'),src.read(1,window=((local_row,local_row+1),(0,src.width)))[0])
   sample_checks.append({'subset_row':local_row,'source_row':row0+local_row,'values_verified':src.width})
 out['original_global_header']['native_dn_sample_checks']=sample_checks
(HERE/'measurements.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
for k,v in out.items():
 if k in ['regional_hrsc_30m','global_usgs_200m']: v={a:b for a,b in v.items() if a not in ['crs_wkt','alpha_by_zoom']}
 print(k,json.dumps(v,indent=2))
