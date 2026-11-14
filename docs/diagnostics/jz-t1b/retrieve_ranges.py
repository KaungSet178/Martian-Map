import requests,json,hashlib,concurrent.futures
from pathlib import Path
out=Path('docs/diagnostics/jz-t1b/source'); cache=Path('output/jz-t1b-cache')
urls={
 'ctx-prefix.bin':'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.tif',
 'reference-ctx-prefix.bin':'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_landing_site_dtm/J03_045994_1986_XN_18N282W_6m_ORTHO.tif',
 'reference-ctx.xml':'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_landing_site_dtm/J03_045994_1986_XN_18N282W_6m_ORTHO.xml'}
def go(it):
 n,u=it
 try:
  r=requests.get(u,headers={'Range':'bytes=0-65535'} if n.endswith('.bin') else {},timeout=(15,30),stream=True)
  if n.endswith('.bin') and r.status_code!=206:return {'name':n,'url':u,'status':r.status_code,'error':'Range not honored; not downloaded'}
  data=r.content;p=(cache if n.endswith('.bin') else out)/n;p.write_bytes(data)
  return {'name':n,'url':u,'status':r.status_code,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'content_range':r.headers.get('Content-Range')}
 except Exception as e:return {'name':n,'url':u,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool: result=list(pool.map(go,urls.items()))
(out/'range-retrieval.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
