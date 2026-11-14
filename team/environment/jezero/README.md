# Jezero environmental conditions (MEDA)

Standalone, independently importable environmental-conditions module for
Jezero Crater, built from NASA PDS4 Mars 2020 MEDA products. It does not import
or modify the shared map, planner, or mission UI.

## What is here

| Path | Purpose |
| --- | --- |
| `fetch_meda.py` | Lists the PDS4 sol directories, selects the highest-version product per sensor, downloads label + CSV, verifies the label-declared MD5, writes `cache/download_manifest.json`. |
| `build_dataset.py` | Parses the cached CSVs against their PDS4 labels, filters sentinels/flags, aggregates to 10-minute LMST bins, writes `data/environment/jezero/meda_jezero_sample.json`. |
| `render_preview.tsx` | Renders the panel to static HTML and bundles a hydration entry for the screenshot harness. |
| `preview.spec.ts` | Playwright checks for hydration, empty states, and 1440/768/390 px layouts. |
| `screenshots/` | Committed screenshots referenced by the report. |
| `cache/` | Raw downloads and manifest. Git-ignored; reproducible. |

The React panel lives in `components/environment/jezero/`, the typed data layer
in `lib/environment/jezero/`, and tests in `tests/environment/jezero/`.

## Reproduce

```bash
python -B team/environment/jezero/fetch_meda.py
python -B team/environment/jezero/build_dataset.py
```

Downloads land in `team/environment/jezero/cache/` (about 100 MB, not
committed). Builds are deterministic apart from the `generatedAt` timestamp.

## Validate

```bash
# Python pipeline + committed dataset
python -B -m unittest discover -s tests/environment/jezero -p "test_*.py" -v

# TypeScript data layer, adapter, and server-rendered panel
npx tsx --test tests/environment/jezero/dataset.test.ts tests/environment/jezero/adapter.test.ts tests/environment/jezero/component.test.tsx

# Screenshots and responsive/hydration browser checks
npx tsx team/environment/jezero/render_preview.tsx
npx playwright test -c team/environment/jezero/playwright.preview.config.ts
```

## Integration

```tsx
import { EnvironmentalConditionsPanel } from "@/components/environment/jezero/EnvironmentalConditionsPanel";
import { jezeroEnvironmentalDataset } from "@/lib/environment/jezero/dataset";

<EnvironmentalConditionsPanel dataset={jezeroEnvironmentalDataset} initialSol={100} />;
```

The panel injects its own scoped `<style>` block, so no shared stylesheet or
`app/globals.css` change is required. It reads design tokens with fallbacks.

For mission-level interoperability, use the adapter rather than the display
series:

```ts
import { toEnvironmentalDataset } from "@/lib/environment/jezero/adapter";

const shared = toEnvironmentalDataset(jezeroEnvironmentalDataset, { sol: 100 });
// { regionId, mission, instrument, observations, sourceVerified, processingVerified }
```

`EnvironmentalMeasurement` fields match the agreed Gale/Jezero contract.
`observedAt` is `null` because MEDA products carry sol + LMST rather than
per-sample UTC; the native LMST is preserved in `localMeanSolarTime`.

## Scientific boundaries

- Rover-local observations, not crater-wide conditions, and not a forecast.
- Five ATS detectors stay separate; they are never collapsed into one value.
- TIRS `GROUND_TEMP` is an 8–14 µm brightness temperature, not kinetic
  temperature.
- MEDA RDS is a solar/UV photodiode sensor. Its values are never converted to
  ionizing dose, and no Gale RAD values are substituted.
- Missing samples stay missing: no interpolation, no placeholder zeroes.
