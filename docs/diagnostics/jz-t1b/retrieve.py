import requests,json,concurrent.futures,hashlib
from pathlib import Path
out=Path('docs/diagnostics/jz-t1b/source');cache=Path('output/jz-t1b-cache')
urls={
 'sim3464.xml':'https://pubs.usgs.gov/sim/3464/sim3464_metadata.xml',
 'sim3464.html':'https://pubs.usgs.gov/sim/3464/',
 'ctx-label.lbl':'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.lbl',
 'ctx-metadata.xml':'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.xml',
 'ctx-index.html':'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/index.html',
 'trek-capabilities.xml':'https://trek.nasa.gov/tiles/Mars/EQ/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0/1.0.0/WMTSCapabilities.xml',
 'hirise.lbl':'https://hirise-pds.lpl.arizona.edu/PDS/RDR/ESP/ORB_045900_045999/ESP_045994_1985/ESP_045994_1985_RED.LBL',
 'hirise-browse.jpg':'https://hirise-pds.lpl.arizona.edu/PDS/EXTRAS/RDR/ESP/ORB_045900_045999/ESP_045994_1985/ESP_045994_1985_RED.abrowse.jpg',
 'hirise-prefix.bin':'https://hirise-pds.lpl.arizona.edu/PDS/RDR/ESP/ORB_045900_045999/ESP_045994_1985/ESP_045994_1985_RED.JP2',
 'geology-layer.json':'https://services.arcgis.com/v01gqwM5QqNysAAi/arcgis/rest/services/Jezero_FeatureServiceFromPro/FeatureServer/8?f=pjson',
 'geology-item.json':'https://www.arcgis.com/sharing/rest/content/items/b602bd9a573d447eb07388e5fb9ca884?f=pjson',
}
def fetch(item):
 name,url=item
 try:
  r=requests.get(url,timeout=(20,50),headers={'Range':'bytes=0-262143'} if 'prefix' in name else {},stream=True)
  if 'prefix' in name and r.status_code!=206: r.close();return {'name':name,'url':url,'status':r.status_code,'error':'Range not honored; bulk download refused'}
  data=r.content
  dest=(cache if name.endswith(('.jpg','.bin')) else out)/name
  dest.write_bytes(data)
  return {'name':name,'url':url,'status':r.status_code,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'path':str(dest),'content_range':r.headers.get('Content-Range')}
 except Exception as e:return {'name':name,'url':url,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool: results=list(pool.map(fetch,urls.items()))
(out/'retrieval.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
