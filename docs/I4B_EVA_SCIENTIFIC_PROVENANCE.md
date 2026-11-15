# I4B EVA scientific provenance

15 November 2026, Asia/Rangoon. Reference branch: R1.1 `4434ebb6505d184cb9954634668d3e31939b1336`. This review supersedes its unsupported locators and hardware assertions. Machine-readable records are [source-review.json](evidence/i4b/source-review.json), the `provenance`/`enteredAssumptionProvenance` fields of the regional EVA evidence, and `lib/eva/profiles.ts`.

## Adopted coefficients and their scope

| Parameter | Value/unit | Primary provenance | Status and applicability |
|---|---|---|---|
| Reference oxygen-use coefficient, modeled as metabolic component | 0.076 kg/h/person | [BVAD Rev 2](https://ntrs.nasa.gov/api/citations/20210024855/downloads/BVAD_2.15.22-final.pdf), §4.6.2, printed p.134 / PDF p.148 | Text verified; conditional scenario. Treating this as the metabolic component and adding leakage is explicitly a modeling assumption. Table 4-70 separately gives 0.086; no universal physiological rate inferred. |
| Separate leakage scenario | 0.005 kg/h/person | Same §4.6.2 and page | Text verified; conditional closed-loop architecture, excluding other gas losses. Not a universal Mars suit leak specification. |
| Venting cooling | 0.57 kg/h/person | Same document, §4.6.2, printed p.133 / PDF p.147 | Conditional no-radiator reference at 295 W metabolic heat; not a SWME hardware certification. |
| Non-venting consumable-water loss | 0 kg/h | Explicit idealized engineering assumption | Selected non-venting scenario only; no claim of demonstrated thermal performance or zero working-fluid needs. |
| Power, battery energy, oxygen/water capacities | null until entered | User assumptions | No automatic hardware value in any profile. |
| Custom coefficients | null until entered | User assumptions | Entered numeric values are recorded as assumptions; they do not inherit NASA verification. |
| Added delays/emergency duration | 0 seconds initially | Visible configurable engineering assumptions | No implicit 30-minute reserve; unknown explicitly entered duration blocks assessment. |
| Added consumption margins | 0% initially | Visible configurable engineering assumptions | Applies once to baseline plus emergency consumption. |
| Existing oxygen/battery capacity holdbacks | Stored I4A preferences; new missions 25% | Inherited user scenario, not NASA | Holdback is capacity × percentage, separate from added consumption margins. UI supports existing mission range 10–50%. |

BVAD is NASA/TP-2015-218570/REV2, February 2022. R1.1's Table 4.1/4-42 and §5.2.3 locators are not used for these claims. No NASA-attributed electrical or duration-capability default is carried over. All profiles represent one person. No crew-count multiplier is implied.

## Apollo battery discrepancy

[NASA TN D-8093](https://ntrs.nasa.gov/api/citations/19760003073/downloads/19760003073.pdf), November 1975, printed p.39 (PDF p.49), lists 21.4 Ah and 16.8 ± 0.8 V in the Apollo 11 PLSS discussion. Their nominal product is **359.52 Wh**, not 390 Wh. Table VII, printed p.47 (PDF p.57), separately lists a 360 Wh later-PLSS entry. No explanation establishing 390 Wh as usable energy was verified. Source Coulomb/Ah conversion is also inconsistent. These are historical observations, not a combined modern specification. **390 Wh is excluded**, and no disputed derived energy is a default. CSD-A-096 pages cited by R1.1 remain independently unchecked; associated coefficients are not adopted. Apollo profile is a historical-context option with unknown coefficients/capacities, editable only as disclosed user assumptions.

## Emergency-duration interpretation

[NASA-STD-3001 Volume 2 Revision D](https://standards.nasa.gov/sites/default/files/standards/NASA/D/nasa-std-3001-vol-2-rev-d-signature.pdf), approved 2023-09-15, was checked directly, including §11.2 (pp.242–245) and text searches. Its §11.2.2 concerns suited nutrition, not R1.1's claimed leakage requirement. No applicable universal 30-minute EVA reserve was substantiated. This does not prove the absence of mission-specific rules elsewhere. The current online reference is not silently substituted for Rev D. I4B's emergency seconds are user-configurable engineering assumptions, including an optional 1800-second scenario, with no certification claim.

## Equations, dimensions and boundaries

Travel seconds = sum of current ordered leg metres / entered metres/hour × 3600. Baseline seconds = travel + each configured activity once + additional delay. A round-trip uses the actual closing leg once; stationary activities are not repeated automatically.

For each resource, baseline = rate × baseline hours; emergency allowance = the same rate × emergency seconds / 3600; consumption margin = (baseline + emergency allowance) × entered percentage / 100. Required = baseline + emergency allowance + consumption margin. Remaining = capacity − capacity holdback − required. Existing legacy travel/stationary rates are integrated separately with these same equations; oxygen g/h and g capacities are converted to kg. Their metabolic/leakage decomposition stays unknown. Legacy emergency allowance uses the entered travel rate; added stationary delay uses the stop rate.

Unknown consumption coefficient prevents requirement calculation; unknown capacity preserves a calculated requirement but leaves capacity feasibility unverified. Schema rejects negative/nonfinite physical values and values over the explicit 1e9 modeling bound; margins are 0–100%. Arithmetic overflow/invalid totals fail closed. Zero is supported only as an explicit number or a visible zero allowance. Water is kg, with no hidden density/volume conversion.

## Scientific limits

This is conditional arithmetic, not a model of CO2 removal, purge/sweep gas, physiological response, heater duty cycles, thermal rejection sufficiency, hydration, radiation safety or astronaut recovery. Registration is unverified. Historical rover observations are not forecasts. Oxia is geometric-only with no fabricated DEM/ascent/descent. No positive arithmetic margin is a NASA operational approval.
