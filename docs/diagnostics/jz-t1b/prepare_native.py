from pathlib import Path
import json,hashlib,shutil,requests
out=Path('docs/diagnostics/jz-t1b');ref=json.loads((out/'source/native-source-reference.json').read_text());dest=Path('output/jz-t1b-cache/units-native.json');original=Path('../jezero-science-targets/docs/diagnostics/jz-t1/units-native.json')
dest.parent.mkdir(parents=True,exist_ok=True)
if not dest.exists():
 if original.exists():shutil.copyfile(original,dest)
 else:
  r=requests.get(ref['source_url'],timeout=(20,120));r.raise_for_status();dest.write_bytes(r.content)
assert hashlib.sha256(dest.read_bytes()).hexdigest()==ref['sha256'],'Source changed: do not silently substitute a newer service snapshot'
shutil.copyfile('../jezero-science-targets/docs/diagnostics/jz-t1/layer.json',out/'source/geology-layer-snapshot.json') if Path('../jezero-science-targets/docs/diagnostics/jz-t1/layer.json').exists() else None
print('Verified native source snapshot',ref['sha256'])
