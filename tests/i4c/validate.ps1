$ErrorActionPreference = 'Continue'
$commands = @(
 @{id='prepare-map'; exe='node'; args=@('scripts/prepare-map-worker.mjs')},
 @{id='build-routing'; exe='node'; args=@('scripts/build-routing-worker.mjs')},
 @{id='baseline-unit'; exe='node'; args=(@('--import','tsx','--test') + @(rg --files tests -g '*.test.ts' -g '*.test.tsx' | Where-Object { $_ -notmatch 'i4c' }))},
 @{id='numerical'; exe='python'; args=@('scripts/verify-i4a-numerical.py')},
 @{id='assets'; exe='python'; args=@('scripts/verify-three-region-assets.py')},
 @{id='python-gale'; exe='python'; args=@('-m','unittest','discover','-s','tests','-p','test_gale*.py')},
 @{id='python-gale-environment'; exe='python'; args=@('-m','unittest','discover','-s','tests/environment/gale','-p','test*.py')},
 @{id='python-jezero-environment'; exe='python'; args=@('-m','unittest','discover','-s','tests/environment/jezero','-p','test*.py')},
 @{id='python-jezero-routing'; exe='python'; args=@('-m','unittest','discover','-s','team/jezero/routing','-p','test_synthetic_routing.py')},
 @{id='python-hillshade'; exe='python'; args=@('-m','unittest','discover','-s','team/jezero/terrain','-p','test_hillshade.py')},
 @{id='routing-check'; exe='npm.cmd'; args=@('run','routing:check')},
 @{id='typecheck'; exe='npm.cmd'; args=@('run','typecheck')},
 @{id='lint'; exe='npm.cmd'; args=@('run','lint')},
 @{id='build'; exe='npm.cmd'; args=@('run','build')}
)
$results = @()
foreach ($c in $commands) {
 $watch = [Diagnostics.Stopwatch]::StartNew()
 $exe=$c.exe; $arguments=$c.args
 & $exe @arguments *> "docs/evidence/i4c/$($c.id).log"
 $code=$LASTEXITCODE
 $results += @{id=$c.id; command="$exe $($arguments -join ' ')"; exitCode=$code; seconds=$watch.Elapsed.TotalSeconds; log="docs/evidence/i4c/$($c.id).log"}
 $results | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 docs/evidence/i4c/command-results.json
 Write-Output "$($c.id): exit $code"
}
