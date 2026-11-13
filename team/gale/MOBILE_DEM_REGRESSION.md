# Separate regression: 390px DEM pixel assertion

Reported during M1 integration; investigated on `8e0bc77`. This is separate from
scientific DEM/CTX registration. No M1 file or production renderer was changed.

The original DEM browser test failed **3/3** repeat runs at 390×844 using the
original thresholds. Representative result: baseline 4,590 colored pixels,
required full-opacity count >4,690, observed 4,601. The screenshot showed the DEM
rendering, not a missing scientific tile.

Root cause: the test immediately screenshots after changing raster opacity to
zero and then reverses it to 100%. MapLibre 6.18.0 supplies a default 300 ms paint
transition (`node_modules/maplibre-gl/src/style/style.ts`, `getTransition()`). The
first screenshot can retain almost all DEM color while the fade is in progress.
It becomes an invalid baseline for an increase-of-100-pixels assertion. Input
value zero is not evidence that a WebGL opacity transition has finished.

[probe_mobile_opacity.mjs](probe_mobile_opacity.mjs) reproduces the unchanged
100→0→100 sequence and records actual pixels through the transition, using the
same pixel-count rule as the original test. The [measurement snapshot](sources/registration/mobile-opacity-probe.json)
records:

| State | Colored pixels | Mean RGB intensity |
| --- | --- | --- |
| Stable 100% | 4,601 | 85.8157 |
| First screenshot after selecting 0% | 4,597 | 85.5718 |
| Settled 0% | 1,170 | 84.2946 |
| Stable restored 100% | 4,601 | 85.8157 |

The canvas stays 390×283. This measured **3,431-pixel** settled difference easily
exceeds the existing threshold. Sample-start times vary with screenshot overhead;
they are not precise GPU transition timings. The installed renderer's transition
code explains the observed fade.

Correction is confined to the browser test: `settledPixels()` waits for two
consecutive stable rendered comparisons (same count and mean intensity within
0.001) before taking the zero-opacity baseline. It uses condition-based polling,
not an arbitrary timeout or an internal MapLibre test hook. The original
**`>100` colored-pixel and `>0.1` hillshade assertions are unchanged**. No opacity
transition, geometry, source, camera, responsive layout or M1 code was altered.

The corrected 390px test passes **3/3** repeats. The final full regression suite
is recorded in [REGISTRATION_INVESTIGATION.md](REGISTRATION_INVESTIGATION.md).
This resolves the reproduced timing failure; it does not certify scientific
registration or explain unrelated future pixel failures.

To repeat the measurement, start the app on port 3100, then from the repository
root run:

```powershell
node team/gale/probe_mobile_opacity.mjs
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3100'
npx playwright test tests/browser/gale-dem.spec.ts --grep '390px' --repeat-each=3
```
