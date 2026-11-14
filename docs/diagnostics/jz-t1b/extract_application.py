from pathlib import Path
import json,subprocess,hashlib,re
out=Path('docs/diagnostics/jz-t1b');root=Path('output/jz-t1b-cache');src=json.loads((root/'units-native.json').read_text());points=[xy for f in src['features'] for ring in f['geometry']['rings'] for xy in ring[::100]]
script=Path('team/jezero/geology/build_geology.mjs').read_text();fn=re.search(r'function mtmInverse\(x, y\) \{[\s\S]*?\n\}',script).group();js='const R=3396190,K0=1,CM=77.5,D2R=Math.PI/180;'+fn+';const fs=require("fs");const p=JSON.parse(fs.readFileSync(0,"utf8"));process.stdout.write(JSON.stringify(p.map(x=>mtmInverse(...x))));'
result=json.loads(subprocess.check_output(['node','-e',js],input=json.dumps(points).encode()));(out/'source/application-transform-samples.json').write_text(json.dumps({'native_xy':points,'application_lonlat':result}))
files=['public/maps/jezero/ctx-lvs-tiles/13/5857/3668.png','public/maps/jezero/geology-tiles/13/5857/3668.png']
for path in files:
 data=subprocess.check_output(['git','-c','http.version=HTTP/1.1','show','HEAD:'+path]);dest=out/'source'/('application-ctx-tile.png' if 'ctx-lvs' in path else 'application-geology-tile.png');dest.write_bytes(data);print(path,len(data),hashlib.sha256(data).hexdigest())
(out/'source/native-source-reference.json').write_text(json.dumps({'source_file':str(root/'units-native.json'),'sha256':hashlib.sha256((root/'units-native.json').read_bytes()).hexdigest(),'source_url':'https://services.arcgis.com/v01gqwM5QqNysAAi/arcgis/rest/services/Jezero_FeatureServiceFromPro/FeatureServer/8/query?where=1%3D1&outFields=*&returnGeometry=true&f=json&resultRecordCount=2000','research_commit':'9670ada94b634ab6a35b660c7e675ee9dfad4ac3','sample_count':len(points)},indent=2))
