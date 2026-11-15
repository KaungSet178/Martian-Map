# Oxia restoration verification

Base: `dbc755284d8dc8bc61d243de9f4fad023da0d187`.
Branch: `fix/restore-oxia-latest`.

The four owner commits were cherry-picked in the requested order:

| Original | Restored |
| --- | --- |
| `b47b395` | `b954a91672adc5dc7b4ddbbcd7f73b5ad7d9e0dd` |
| `188f129` | `1bac1f4ab6f91a0673fd976f8e7289f80dfbd52c` |
| `50efa1f` | `5ab11f609fe20de16d2dba016b9508c2fd825394` |
| `846d96b` | `bf48cdde5363aac1e8e498f8b868f5c1522185e7` |

Objective-4 uses the release's spacing/unknown-uncertainty and compilation wording.
Objectives 1–3 are unchanged. The science registry now has 23 records, including
`oxia-mineral-4`, associated only with `oxia-objective-4`. Its coordinates reproduce
Mars Trek hydrous compilation feature 773 at the existing catalog's two-decimal
precision; the preserved query is `docs/evidence/f3/oxia-hydrous-query.json`.
The site has Interpreted evidence, unknown positional uncertainty and unverified
registration. It supports geometric stops only. Oxia's routing remains disabled.
No geological-unit overlays or shared UI changes were introduced.

Checks on the restored release tree:

- 510 top-level TypeScript tests passed, zero failures/skips.
- Typecheck, lint, production build and routing runtime check passed.
- 12 relevant production-server browser checks passed: restored Oxia (desktop and
  mobile), Jezero slope quarantine (desktop and mobile), Oxia site persistence and
  exports (five viewports), and Oxia terrain unavailability (three viewports).
- The restored browser checks verify default color tiles return 200, plain CTX is
  off, four objectives are listed, both Oxia site stops can be added, objective-4
  saves at 18.17 N / 335.82 E and its rendered marker is south of objective-1.
- The modeled overlay starts off, toggles on, loads its GeoJSON, changes actual
  canvas pixels and draws cyan pixels. Its dashed styling is validated against
  the manifest; the existing shared renderer applies the dash array.
- All 841 new color JPEG tiles are present. The source-point distance is about
  3.0 km on the Mars sphere. Existing science restrictions remain covered by tests.

Local artifacts are in ignored `output/`: unit/browser logs and Playwright
screenshots (`playwright/oxia-traverse-*.png`, `playwright/oxia-restoration-*.png`).
An initial browser test incorrectly waited for a new GeoJSON response after the
toggle; MapLibre had already fetched the source during mount. The test now records
responses from navigation onward and verifies actual rendered pixels.

Railway target supplied by the owner:
`https://martian-map-production-979928bb.up.railway.app`.
Updating the deployment Git branch does not itself prove the public deployment
has rebuilt; public acceptance must be recorded separately after that rebuild.
