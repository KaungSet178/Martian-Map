import sys,struct,math,requests,concurrent.futures,json,hashlib
from pathlib import Path
sys.path.insert(0,'D:/martian-map/output/g3-geology/python-libs')
sys.path.insert(0,str(Path('.audit-python').resolve()))
from rasterio.io import MemoryFile
root=Path('output/jz-t1b-cache');prefix=(root/'ctx-prefix.bin').read_bytes();endian='<' if prefix[:2]==b'II' else '>';ifd=struct.unpack_from(endian+'I',prefix,4)[0];n=struct.unpack_from(endian+'H',prefix,ifd)[0];tags={}
for j in range(n):
 tag,typ,cnt,val=struct.unpack_from(endian+'HHII',prefix,ifd+2+j*12);size={1:1,2:1,3:2,4:4,5:8,12:8}.get(typ,1);raw=prefix[ifd+2+j*12+8:ifd+2+j*12+12] if cnt*size<=4 else prefix[val:val+cnt*size]
 if typ in (3,4):tags[tag]=list(struct.unpack(endian+('H' if typ==3 else 'I')*cnt,raw[:cnt*size]))
with MemoryFile(prefix) as mem:
 with mem.open() as ds: af=ds.transform;width=ds.width;height=ds.height
R=3396190; row0=math.floor((af.f-R*math.radians(18.519663))/6);row1=math.ceil((af.f-R*math.radians(18.401964))/6)
a=tags[273][row0];b=tags[273][row1]+tags[279][row1]-1
url='https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.tif'
ranges=[(s,min(s+262143,b)) for s in range(a,b+1,262144)]
def get(pair):
 s,e=pair;p=root/f'ctx-bytes-{s}-{e}.bin'
 if p.exists():data=p.read_bytes()
 else:
  r=requests.get(url,headers={'Range':f'bytes={s}-{e}'},timeout=(15,30));r.raise_for_status();assert r.status_code==206 and r.headers['Content-Range'].startswith(f'bytes {s}-{e}/'),r.headers;data=r.content;assert len(data)==e-s+1;p.write_bytes(data)
 return s,e,data
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:parts=list(pool.map(get,ranges))
with (root/'application-window.tif').open('wb') as f:
 f.write(prefix);f.truncate(36269402)
 for s,e,d in parts:f.seek(s);f.write(d)
report={'url':url,'partial_container':'output/jz-t1b-cache/application-window.tif','available_rows_inclusive':[row0,row1],'range_audit':[{'start':s,'end':e,'sha256':hashlib.sha256(d).hexdigest()} for s,e,d in parts],'bytes_downloaded':sum(len(d) for s,e,d in parts),'warning':'Partial TIFF container; pixels outside downloaded rows not valid. Read only the recorded row window.'}
Path('docs/diagnostics/jz-t1b/source/ctx-window-ranges.json').write_text(json.dumps(report,indent=2));print(row0,row1,report['bytes_downloaded'])
