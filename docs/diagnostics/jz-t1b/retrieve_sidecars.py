import requests,concurrent.futures,json,hashlib
from pathlib import Path
base='https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_landing_site_dtm/'
keys=['index.html','J03_045994_1986_XN_18N282W_6m_ORTHO.tif.aux.xml','J03_045994_1986_XN_18N282W_6m_ORTHO.tfw','J03_045994_1986_XN_18N282W_6m_ORTHO.prj','J03_045994_1986_XN_18N282W_6m_ORTHO.lbl']
def go(k):
 try:
  r=requests.get(base+k,timeout=(15,25));p=Path('docs/diagnostics/jz-t1b/source')/('reference-'+k);p.write_bytes(r.content);return {'url':base+k,'status':r.status_code,'bytes':len(r.content),'sha256':hashlib.sha256(r.content).hexdigest(),'path':str(p)}
 except Exception as e:return {'url':base+k,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:r=list(pool.map(go,keys))
Path('docs/diagnostics/jz-t1b/source/reference-sidecars-retrieval.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,indent=2))
