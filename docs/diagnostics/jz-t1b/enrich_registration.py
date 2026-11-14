import sys,json,math,hashlib
from pathlib import Path
sys.path.insert(0,'D:/martian-map/output/g3-geology/python-libs')
sys.path.insert(0,str(Path('.audit-python').resolve()))
import numpy as np
out=Path('docs/diagnostics/jz-t1b');p=out/'measurements.json';m=json.loads(p.read_text());reg=m['registration']['relative_image_registration'];ties=reg['candidate_ties'];R=3396190.;rad=math.pi/180;lat0=(18.401964+18.519663)/2;lon0=(77.186786+77.493133)/2
A=np.array([[(t['longitude_east']-lon0)*R*rad*math.cos(lat0*rad),(t['planetocentric_latitude']-lat0)*R*rad,1] for t in ties]);D=np.array([[t['east_m'],t['north_m']] for t in ties]);cal=np.array([t['role']=='calibration' for t in ties]);coeff=np.linalg.lstsq(A[cal],D[cal],rcond=None)[0];errors=np.linalg.norm(A@coeff-D,axis=1);linear=np.eye(2)+coeff[:2,:].T
reg['diagnostic_affine_hypothesis']={'interpretation':'Relative image ties only, not a geological correction or approved datum transform','local_origin_lonlat':[lon0,lat0],'local_sphere_radius_m':R,'displacement_coefficients_rows_x_y_constant':coeff.tolist(),'linear_matrix':linear.tolist(),'scale_singular_values':np.linalg.svd(linear,compute_uv=False).tolist(),'polar_rotation_deg':math.degrees(math.atan2(linear[1,0]-linear[0,1],linear[0,0]+linear[1,1])),'calibration_ties':int(cal.sum()),'validation_ties':int((~cal).sum()),'holdout_rmse_m':float(np.sqrt(np.mean(errors[~cal]**2))),'applied':False}
reg['rotation_scale_local_distortion']='Diagnostic affine hypothesis fitted on five calibration windows only; four held-out windows evaluated. Model is not independently landmark-validated and is not applied.'
vectors=[]
for t in ties:
 lon=t['longitude_east'];lat=t['planetocentric_latitude'];t['application_anchor_pixel_column_row']=[(R*lon*rad-4573663.250853)/6-.5,(1109693.140188-R*lat*rad)/6-.5]
 t['reference_anchor_pixel_column_row']=[(R*(lon-180)*rad+6100375.7737084)/6.0603893249423999-.5,(1145171.1668411-R*lat*rad)/6.0603893249423999-.5]
 end=[lon+t['east_m']/(R*rad*math.cos(lat*rad)),lat+t['north_m']/(R*rad)];vectors.append({'type':'Feature','properties':t,'geometry':{'type':'LineString','coordinates':[[lon,lat],end]}})
(out/'candidate-image-vectors.geojson').write_text(json.dumps({'type':'FeatureCollection','coordinate_convention':'Mars planetocentric/east degrees; image-match diagnostics, NOT scientific targets','features':vectors},indent=2))
m['source_integrity']={'native_source_sha256':json.loads((out/'source/native-source-reference.json').read_text())['sha256'],'application_script_sha256':{str(q):hashlib.sha256(q.read_bytes()).hexdigest() for q in [Path('regions/jezero/config.ts'),Path('regions/jezero/layers.ts'),Path('team/jezero/geology/build_geology.mjs'),Path('team/jezero/basemap/prepare_trek_basemap.mjs')]}}
p.write_text(json.dumps(m,indent=2));print(json.dumps(reg['diagnostic_affine_hypothesis'],indent=2))
import matplotlib,scipy,shapely,pyproj,rasterio,PIL
versions={'python':sys.version,'numpy':np.__version__,'scipy':scipy.__version__,'matplotlib':matplotlib.__version__,'shapely':shapely.__version__,'pyproj':pyproj.__version__,'proj':pyproj.proj_version_str,'rasterio':rasterio.__version__,'gdal':rasterio.__gdal_version__,'pillow':PIL.__version__};(out/'versions.json').write_text(json.dumps(versions,indent=2));print(versions)
