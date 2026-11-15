from pathlib import Path
import json,hashlib,shutil,re,subprocess
base=Path('docs/evidence/i4c')
# Run after browser completion. Preserve only fresh artifacts owned by this audit.
results=base/'browser-results.json'
if not results.exists(): raise SystemExit('Browser run has not produced its final JSON report')
b=json.loads(results.read_text(encoding='utf-8-sig'))
stats=b['stats']
if stats.get('duration') is None: raise SystemExit('Browser report is incomplete')
artifacts=[]
for dirname in ['i4b','i4c','three-region']:
 source=Path('output/playwright')/dirname
 for p in sorted(source.glob('*')):
  if p.suffix not in ['.json','.html']:continue
  target=base/'browser'/dirname/p.name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,target)
  artifacts.append({'path':str(target).replace('\\','/'),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'source':str(p).replace('\\','/')})
for dirname,names in [('i4b',['gale-1440-review.png','oxia-320-review.png']),('i4c',['gale-1440.png','jezero-390.png','oxia-320.png'])]:
 for name in names:
  p=Path('output/playwright')/dirname/name
  if p.exists():
   target=base/'browser'/dirname/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,target)
   artifacts.append({'path':str(target).replace('\\','/'),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'source':str(p).replace('\\','/')})
(base/'browser-artifacts.json').write_text(json.dumps(artifacts,indent=2)+'\n')
obs=[]
for p in (base/'browser/i4c').glob('*.json'):
 d=json.loads(p.read_text());obs.append({'region':d['region'],'width':d['width'],'height':d['height'],'documentOverflow':d['overflow'],'datasetControls':len(d['observations']),'evidence':str(p).replace('\\','/')})
(base/'viewport-results.json').write_text(json.dumps(obs,indent=2)+'\n')
validation=json.loads((base/'independent-validation.json').read_text())
validation['browser']={'scope':'documented I4B 76 cases plus 15 independent I4C cases','command':'npx.cmd playwright test --config tests/i4c/playwright.config.ts','stats':stats,'report':'browser-results.json','log':'browser.log','viewports':'viewport-results.json','artifacts':'browser-artifacts.json','interruptedBroadRun':{'selected':169,'completedPasses':27,'completedFailures':2,'status':'interrupted; not acceptance','failure':'legacy Gale Fit exploration region selector absent; use current region-specific fit controls','log':'browser-broad-interrupted.log'},'otherHistoricalBrowserCases':'not completed; no pass claim'}
validation['staticFinal']={'typecheck':'pass; typecheck-final.log','lint':'pass; lint-final.log'}
(base/'independent-validation.json').write_text(json.dumps(validation,indent=2)+'\n')
append=f'''

## Completed browser outcome

The scoped production run completed: **{stats.get('expected',0)} passed, {stats.get('unexpected',0)} failed, {stats.get('flaky',0)} flaky, {stats.get('skipped',0)} skipped**, selected 91 cases. Exact machine results: [browser report](evidence/i4c/browser-results.json), [log](evidence/i4c/browser.log), [viewport observations](evidence/i4c/viewport-results.json). All five requested dimensions are explicitly represented per region. Browser failures, if any, remain failures; no acceptance is inferred from an interrupted run. Dedicated layer cases do not assert future palette conformance; those independent static contract failures remain separately open.

[Preserved artifacts](evidence/i4c/browser-artifacts.json) hash real downloaded HTML, saved mission JSON, routing receipts, per-dataset map pixel/opacity observations and representative screenshots. Full raw images/traces remain in ignored `output/playwright/`; selected screenshots and machine observations are committed for review. Visual inspection included [Gale desktop Review](evidence/i4c/browser/i4b/gale-1440-review.png) and [Oxia 320 px Review](evidence/i4c/browser/i4b/oxia-320-review.png).

Stage A recommendation: accept delivery of the independent audit/specification/tests, **retain the P1 display-processing finding and all conformance defects as open**. Do not label the application scientifically/style-conformant or give final I4D acceptance. Stage B remains pending an exact completed I4D SHA.
'''
with Path('docs/I4C_INDEPENDENT_QA_REPORT.md').open('a',encoding='utf8') as f:f.write(append)
# Normalize logs after completion; preserve raw/output hashes rather than pretending byte identity.
normalization=[]
for p in sorted(base.glob('*.log')):
 raw=p.read_bytes()
 encoding='utf-16' if raw.startswith((b'\xff\xfe',b'\xfe\xff')) else 'utf-8-sig'
 text=raw.decode(encoding).replace('\r\n','\n')
 p.write_text(text,encoding='utf8',newline='\n')
 normalization.append({'path':str(p).replace('\\','/'),'rawEncoding':encoding,'rawSha256':hashlib.sha256(raw).hexdigest(),'normalizedSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'operation':'decode BOM; normalize CRLF to LF; no semantic edit'})
(base/'log-normalization.json').write_text(json.dumps(normalization,indent=2)+'\n')
print(json.dumps({'browser':stats,'viewports':len(obs),'overflow':[o for o in obs if o['documentOverflow']],'artifacts':len(artifacts)},indent=2))
