import ast,json,hashlib,gzip,xml.etree.ElementTree as ET,subprocess
from pathlib import Path
import sys
sys.path.insert(0,'D:/martian-map/output/g3-geology/python-libs')
from PIL import Image
out=Path('docs/diagnostics/jz-t1b');records=[]
for p in sorted(out.rglob('*')):
 if not p.is_file() or p.name=='evidence-index.json':continue
 data=p.read_bytes()
 if p.suffix=='.py':ast.parse(data.decode('utf-8-sig'))
 elif p.suffix in ('.json','.geojson'):json.loads(data)
 elif p.suffix=='.xml':ET.fromstring(data)
 elif p.suffix=='.gz':json.loads(gzip.decompress(data))
 elif p.suffix=='.png':
  with Image.open(p) as im:im.verify()
 records.append({'path':str(p),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
(out/'evidence-index.json').write_text(json.dumps({'description':'Artifact hashes; raw HTTP source hashes and byte ranges are separately recorded under source/. This index excludes itself.','files':records},indent=2))
print('Inspected',len(records),'files: Python AST, JSON/GeoJSON, gzip, XML and PNG checks completed.')
for name,cmd in [('scientific-tests.txt',['python','-B',str(out/'test_audit.py')]),('regional-tests.txt',['npx.cmd','tsx','--test','tests/regions.test.ts','tests/mission.test.ts'])]:
 r=subprocess.run(cmd,capture_output=True,text=True);(out/name).write_text(r.stdout+r.stderr,encoding='utf-8');print(name,'exit',r.returncode);assert r.returncode==0
changed=subprocess.check_output(['git','status','--porcelain'],text=True);assert all(line[3:].startswith('docs/') for line in changed.splitlines()),changed
r=subprocess.run(['git','diff','--check'],capture_output=True,text=True);assert r.returncode==0,r.stdout+r.stderr
print('PASS: only docs paths changed; diff whitespace check clean')

# Refresh hashes after test logs are finalized (timings change on each run).
records=[{'path':str(p),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(out.rglob('*')) if p.is_file() and p.name!='evidence-index.json']
(out/'evidence-index.json').write_text(json.dumps({'description':'Artifact hashes excluding this self-referential index; source response and byte-range hashes are separately retained under source/.','files':records},indent=2))
