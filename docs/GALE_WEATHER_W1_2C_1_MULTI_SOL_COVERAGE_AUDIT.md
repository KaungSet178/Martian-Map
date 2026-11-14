# Gale Weather W1.2C-1 — Multi-Sol Historical Weather Coverage Audit

**Branch:** `feat/gale-weather-data`
**Starting commit:** `5f7fc83e0d7a9512bb724d6de44432626b056b6b` (W1.2B-H2 completion, verified in branch history and at origin)
**Milestone:** W1.2C-1 — Research and data-selection milestone: identify a scientifically defensible collection of approximately 12 Curiosity REMS sols spanning all four Martian seasons
**Date:** 2026-11-14
**Deliverables:** this report; `team/gale/weather/data/rems_seasonal_sample_manifest.json`
**Not done (by scope):** no weather frontend, forecasting, EVA thresholds, route scheduling, full-sol processing, parser changes, or Mars-time changes.

---

## 1. Executive summary

- **28 candidate sols were inspected at product-label level**, plus the existing Sol 100 reference (full-sol statistics from W1.2A). A final collection of **12 sols** was selected: 3 per northern season, spanning **8 Martian years (MY31–MY38)**, all traceable to PDS4 MODRDR products of `MSL-M-REMS-5-MODRDR-V1.0` (DOI `10.17189/vwva-ms24`).
- **The Sol 4488 versus Sol 4843 discrepancy is resolved as a documentation lag.** The official REMS page still states coverage to Sol 4488 (2025-03-22), but the PDS4 bundle directory and the calibrated collection inventory contain complete four-product sols through **Sol 4843** (label START_TIME 2026-03-21T19:16:37.443Z). The errata document's newest release note is Release 36 (sols 4000–4133); sols 4134–4843 therefore exist as accessible PDS4 products **without a published release note**. Archive directory coverage, product availability, and release documentation were verified separately and are not identical. Selection was restricted to sols ≤ 4488 (officially stated coverage).
- **140 sols have no products in the calibrated collection** (archive gaps, e.g. sols 2–8, 201–221, 2176–2203, 2321–2332). Candidate sols were screened against this gap list.
- **Wind is effectively unavailable** in every inspected candidate: horizontal wind speed had 0 valid rows in every sampled window for every selected sol (one single-row exception), and 99.898% missing across the full Sol 100 reference. Vertical wind is entirely missing. Missing wind did not disqualify any sol.
- **Air temperature, pressure, and humidity are well populated** in all sampled windows (worst-window valid fractions 99.4–100%, 100%, and 99.4–100% respectively). Ground temperature and UV show partial, sol-dependent population, consistent with documented GTS/UVS behavior.
- Per-sample solar longitude was derived from **PDS4 label START_TIME (UTC)** using the existing validated Mars24/Allison–McEwen module — independent of the unresolved REMS TIMESTAMP time-scale assumption. Statuses `PARTIALLY_VALIDATED` and `ASSUMED_TIME_SCALE` (for the TIMESTAMP path) are preserved. No per-record UTC or Ls values were fabricated.
- The manifest contains **metadata only** (no observation records). The existing Sol 100 observation JSON was not modified (SHA-256 verified unchanged).

---

## 2. Official NASA sources

| Resource | URL | Use |
|---|---|---|
| Data set / DOI | https://doi.org/10.17189/vwva-ms24 | Citation identity |
| Official REMS page | https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/curiosity/rems.html | Official coverage statement |
| PDS4 bundle root | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/ | Bundle label, collections |
| Calibrated collection | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/data_calibrated/ | MODRDR products by sol |
| Calibrated collection inventory | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/data_calibrated/collection_mslrems_data_calibrated_inventory.csv | Authoritative per-sol product presence |
| Bundle label | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/bundle_msl_rems.xml | Bundle identity |
| Errata / release notes | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/document/ERRATA_CAL.TXT | Release documentation |
| MODRDR data set description | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/document/REMS_MODRDR_DS.CAT | Field semantics (prior W1.1 audit) |
| REMS RDR SIS | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/document/REMS_RDR_SIS.TXT | Product format (prior W1.1 audit) |
| Mars24 algorithm | https://www.giss.nasa.gov/tools/mars24/help/algorithm.html | Ls method (existing module) |

All archive URLs were retrieved successfully on 2026-11-14. No unofficial weather APIs, third-party Mars weather sites, synthetic datasets, or AI-generated values were used.

---

## 3. Archive coverage findings

### 3.1 Three distinct notions of coverage

| Notion | Extent | Verified by |
|---|---|---|
| Officially stated coverage | Sol 1 (2012-08-07) → **Sol 4488** (2025-03-22, Ls 60.1, MY 38), [ongoing] | Official REMS page (retrieved 2026-11-14) |
| Archive directory coverage | Sol folders `SOL_00001_00089` … `SOL_04710_04843` (42 group folders) | Directory listings |
| Product availability | **4703 sols** with complete four-product calibrated sets (ADR/MODRDR/RNV/RTL), latest **Sol 4843** | Collection inventory CSV + spot checks |
| Release documentation | Release 36 (sols 4000–4133, 2024-08-02) + PDS4 compatibility conversion (2024-09-30, sols 0–3999) | `ERRATA_CAL.TXT` (publication 2024-09-30) |

### 3.2 Latest accessible products

- **Latest sol with accessible MODRDR products: Sol 4843.**
  Label: `RME_827380920RMD48430000000_______P1.xml`, LID `urn:nasa:pds:msl_rems:data_calibrated:rme_827380920rmd48430000000_______p1`, version 1.0, 22,793 records, 40 fields; START_TIME 2026-03-21T19:16:37.443Z, STOP_TIME 2026-03-22T12:03:18.021Z.
- **Completeness:** complete ADR/MODRDR/RNV/RTL product sets were spot-verified at sols 4488, 4500, 4600, 4700, 4800, 4842 and 4843. The collection inventory shows **all 4703 present sols have complete four-product sets** (no sol has a partial product set).
- **Inventory integrity:** 18,812 inventory rows parse cleanly into 4703 unique sols × 4 product kinds; 82 sols carry the legacy version suffix `a` (sols 1–89 range); all others use numeric version suffixes (1–9). All MODRDR labels inspected declare `version_id = 1.0`, 40 fields, and record length 372 bytes — schema stability across the mission.

### 3.3 Archive gaps (sols with no products)

**140 sols are absent from the calibrated collection** (no directory entry, no inventory row). These are not random dropouts but contiguous blocks, consistent with periods of no REMS acquisition (rover/safe-mode/downtime); the cause is not documented per-sol in this milestone:

> 2–8, 193–194, 201–221, 263–266, 359–364, 445–453, 458–461, 479–484, 874–879, 938, 956, 1390–1397, 2176–2203, 2321–2332, 2340–2346, 2808–2809, 2815, 2966, 3497–3502, 3584–3588, 3789–3792

Implications: seasonal bins remain populated in every Martian year, but several bins have shortened sol ranges (e.g. MY34 northern autumn is bounded by the 2176–2203 gap). Candidate screening excluded all gap sols.

### 3.4 Sensor-availability changes over the mission (documentation + inventory level)

- Sols 1–8: MODRDR environmental products absent (ADR-only per inventory for several early sols; environmental acquisition begins within the first week per documentation).
- Wind Sensor: Boom 1 boards damaged at landing; Boom 2 boards inoperative from sols 854, 1485, 1491, 1504 (W1.1 audit of archive documentation). Measured products confirm near-total absence of horizontal wind at our sampled sols regardless of era.
- UV: degradation after ~Sol 155 (dust attenuation > 10%, flagged in `UVS_CONFIDENCE_LEVEL`); partial UV population observed in sampled windows.
- Humidity: limited reliability before ~Sol 63; from Sol 793 the Humidity Sensor high-resolution interval mode switches Boom 2 off during selected hours.
- All selected sols are ≥ Sol 100, so the pre-Sol-63 humidity caveat does not apply; the HRIM boom-2 interaction is irrelevant to wind here because wind is already absent.

---

## 4. Resolution of the Sol 4488 versus Sol 4843 discrepancy

**Status: resolved — documentation lag identified.**

1. The official REMS page (retrieved 2026-11-14) still states: *"Aug 7, 2012 (Sol 1, Ls 151.0, MY 31) to March 22, 2025 (Sol 04488, Ls 60.1, My 38) [ongoing]"*.
2. The bundle directory contains sol folders through `SOL_04710_04843`, and the calibrated collection inventory lists complete four-product sols through **4843**.
3. Sol 4843's label START_TIME (2026-03-21T19:16:37.443Z) is consistent with the page's Sol 4488 = 2025-03-22: 355 sols × ~1.0275 days/sol ≈ 365 days.
4. The errata document has **no release note for sols 4134–4843**; its newest entries are Release 36 (sols 4000–4133, 2024-08-02) and the 2024-09-30 PDS4 compatibility conversion of sols 0–3999.

**Interpretation:** products beyond the page statement exist and are accessible, but the page's coverage statement and the errata release notes lag the archive contents. For this milestone, sols beyond **4488** were excluded from selection (sols 4134–4488 were allowed but not selected; see §9). Sols 4489–4843 are recorded as available-but-undocumented and are recommended only after official release documentation appears.

**Independent cross-check:** the page's Ls 60.1 for Sol 4488 was verified by calculating Ls at 2025-03-22T12:00 UTC with the existing validated module: **Ls = 60.037°** (consistent at the published one-decimal rounding), MY 38 as stated.

---

## 5. Candidate sol selection methodology

### 5.1 Candidate pool construction (28 candidates)

A sol-to-UTC linear model was anchored at the two verified label START_TIMEs:

- Sol 100 → 2012-11-16T07:48:43.598Z (existing verified product)
- Sol 4843 → 2026-03-21T19:16:37.443Z (fetched label)

Linear rate: **1.027510 days/sol**, cross-checked against the official page's Sol 4488 = 2025-03-22 (model estimate: 2025-03-22T00:53 UTC — same calendar day). For each integer sol 1–4843 the model date, Ls (validated Mars24 module), and Martian year were computed, and sols were binned by (MY, northern season). Candidates were then drawn across season bins and MYs at several Ls depths, excluding the 140 archive-gap sols. Five initial picks failed screening (one archive-gap sol; four invalidated by an early group-range table error) and were replaced. **Every retained candidate's Ls and MY were re-derived from its actual PDS4 label START_TIME — the model was used only to choose which labels to fetch, never as a data source.**

### 5.2 Per-candidate evaluation (labels + bounded data sampling)

For each candidate, from the **PDS4 MODRDR label** (small metadata download):

- Product identity: filename, LID, version (all 1.0), record count, record length (372 bytes), field count (40).
- Field contract: names/order match the canonical 40-field contract verified in W1.2A (`team/gale/weather/rems_parser.py`), including all key variables (`AMBIENT_TEMP`, `BRIGHTNESS_TEMP`, `PRESSURE`, `LOCAL_RELATIVE_HUMIDITY`, `VOLUME_MIXING_RATIO`, `HORIZONTAL_WIND_SPEED`, `WIND_DIRECTION`, `UV_A…UV_E`, boom-local temperatures).
- Missing-value convention per field from label `Special_Constants` (`-999`, `-999.00`, `-9.990E+02`; confidence-string placeholders `XXXXXX`/`XXXX`).
- Units per field (KELVIN, PASCAL, METERS/SECOND, DEGREE, W/m**2, %, ppm, SECOND).
- LID cross-check against the official calibrated collection inventory.

For each **selected** sol (and two alternates), from the **data file via bounded HTTP range samples**:

- Three 65,536-byte windows per file (start, middle, end) — 2.16 MB total for 13 sols; no bulk raw-data download.
- Per-window valid/missing counts for 15 key variables (missing = `-999` conventions; never zero-filled).
- Data file size from `Content-Range` (recorded as `data_bytes`).

No invented numerical quality score was used; selection applied the documented priorities (§5.3) qualitatively against the measured facts.

### 5.3 Selection priorities (as mandated)

1. Valid air temperature — all selected sols: 100% valid in every sampled window.
2. Valid pressure — all selected sols: 100% valid in every sampled window.
3. Valid ground temperature where available — partial in some windows (GTS duty cycle/processing removals); no selected sol rejected on this basis.
4. Reliable humidity — ≥ 99.4% valid in every sampled window (single missing first-row in start windows).
5. Wind only when genuinely available — wind is effectively absent everywhere; **no sol was rejected for missing wind** (per instructions).
6. UV with documented limitations — partial in some windows, consistent with documented UVS degradation; accepted with limitation notes.
7. Martian-year diversity — achieved across all 8 archive years (MY31–MY38).
8. In-season Ls spread and gap avoidance.

### 5.4 Candidates examined

28 candidate sols (labels) + Sol 100 (full local statistics) = **29 sols examined**. Season/MY bins of the candidate pool (label-verified):

| Northern season (Gale) | Candidates (sol: MY, Ls°) |
|---|---|
| Spring (Gale autumn) | 430: MY32 38.6 · 500: MY32 70.4 · 1750: MY34 30.6 · 1850: MY34 76.1 · 3100: MY36 36.6 · 3180: MY36 72.9 · 4400: MY38 19.0 |
| Summer (Gale winter) | 620: MY32 125.7 · 700: MY32 167.4 · 1250: MY33 107.4 · 1330: MY33 146.6 · 2600: MY35 113.4 · 2690: MY35 158.7 · 3950: MY37 119.5 · 4040: MY37 165.7 |
| Autumn (Gale spring) | 760: MY32 202.6 · 830: MY32 247.3 · 1450: MY33 215.9 · 1520: MY33 261.2 · 3450: MY36 212.3 · 4100: MY37 200.7 · 4180: MY37 251.8 · (100: MY31 207.9–208.5, reference) |
| Winter (Gale summer) | 900: MY32 292.3 · 970: MY32 333.8 · 2250: MY34 300.2 · 3560: MY36 283.2 · 3660: MY36 342.4 · 4250: MY37 296.7 |

Audited alternates (not selected): Sol 1750 (MY34 spring, Ls 30.6) and Sol 3100 (MY36 spring, Ls 36.6) — both passed window sampling and remain documented swap candidates.

---

## 6. Seasonal coverage

Final collection (3 per northern season; Gale = southern-hemisphere season):

| Northern season | Gale season | Ls bin | Selected sols (Ls° at label START_TIME) |
|---|---|---|---|
| Spring | Autumn | 0–90 | 4400 (18.98), 430 (38.63), 1850 (76.13) |
| Summer | Winter | 90–180 | 1250 (107.36), 2600 (113.38), 3950 (119.49) |
| Autumn | Spring | 180–270 | **100 (207.90–208.50, reference)**, 1450 (215.91), 4100 (200.75) |
| Winter | Summer | 270–360 | 900 (292.31), 2250 (300.23), 3560 (283.22) |

Desired 3-per-season distribution was **achieved**. One structural limitation: the archive begins at Ls ≈ 151 (landing), so northern spring is not observable in MY31; sol 100 (MY31) anchors northern autumn instead. Northern autumn samples span Ls 200.7–215.9; summer 107.4–119.5; spring 19.0–76.1; winter 283.2–300.2 — in-season spread is widest for spring, narrower for the other bins. Seasonal classification was recomputed independently from each label START_TIME and matched the manifest (34/34 automated checks passed).

---

## 7. Martian-year coverage

| MY | Sols | Northern seasons covered |
|---|---|---|
| 31 | 100 | Autumn (archive begins mid-year at Ls ≈ 151) |
| 32 | 430, 900 | Spring, Winter |
| 33 | 1250, 1450 | Summer, Autumn |
| 34 | 1850, 2250 | Spring, Winter |
| 35 | 2600 | Summer |
| 36 | 3560 | Winter |
| 37 | 3950, 4100 | Summer, Autumn |
| 38 | 4400 | Spring |

**8 distinct Martian years** — twice the "at least four" requirement. The archive spans MY31 (partial, from Ls 151) through MY38 (partial, ends Sol 4843 = Ls ≈ 208-equivalent within N-Autumn; MY39 begins 2026-09-30 per the validated boundary calculation).

Calculated MY boundaries used (from the existing validated `martian_year_clancy`, Ls=0 crossings):

| MY | Calculated Ls=0 crossing (UTC) |
|---|---|
| 31 | 2011-09-13 14:22:53.907 |
| 32 | 2013-07-31 13:45:24.783 |
| 33 | 2015-06-18 12:24:56.166 |
| 34 | 2017-05-05 11:35:20.779 |
| 35 | 2019-03-23 11:36:36.081 |
| 36 | 2021-02-07 11:00:59.651 |
| 37 | 2022-12-26 10:16:06.696 |
| 38 | 2024-11-12 09:44:42.723 |
| 39 | 2026-09-30 08:21:38.636 (after archive end) |

Gaps in MY coverage: MY35 and MY36 have one sample each (seasonal representation still complete across the collection); no Martian year has zero samples.

---

## 8. Sensor availability matrix

Matrix combines: (a) full-sol measurement for Sol 100; (b) worst-of-three-window sampled measurement for the other 11 sols; (c) label-level field presence for all. Values are **valid fractions (percent)**; window values are bounded samples, not full-sol statistics.

| Variable | Sol 100 (full sol) | Selected sols 430–4400 (worst window) |
|---|---|---|
| `AMBIENT_TEMP` | 99.2% valid | 100% in every window |
| `BOOM1_LOCAL_AIR_TEMP` | 99.2% valid | 100% in every window |
| `BOOM2_LOCAL_AIR_TEMP` | 99.2% valid | 100% in every window |
| `PRESSURE` | 99.2% valid | 100% in every window |
| `BRIGHTNESS_TEMP` | 95.2% valid | 0–100% by window (GTS duty cycle/processing removals; sol 430 has a fully empty middle window) |
| `LOCAL_RELATIVE_HUMIDITY` | 99.0% valid | ≥ 99.4% in every window |
| `VOLUME_MIXING_RATIO` | 99.0% valid | ≥ 99.4% in every window |
| `HS_TEMP` | 99.0% valid | ≥ 99.4% in every window |
| `HORIZONTAL_WIND_SPEED` | **0.102% valid** | **0% in every window** (one single valid row at sol 900) |
| `WIND_DIRECTION` | 0.249% valid | 0–0.6% by window |
| `VERTICAL_WIND_SPEED` | 0% valid | 0% in every window |
| `UV_A/UV_ABC/UV_D/UV_E` | 77.0% valid | 0–100% by window and sol (night rows carry valid 0.00 W/m²; gaps are acquisition gaps) |

Full per-window percentages for all 15 variables × 3 windows × 11 sols are in the manifest (`window_sample_audit.missing_value_percent_by_window`).

**Field-presence distinctions preserved (per milestone §7):**

| State | Finding |
|---|---|
| Field not included in product | Never observed: all 40 fields present in every inspected label, all mission-long |
| Field included but entirely missing | `VERTICAL_WIND_SPEED` everywhere; `HORIZONTAL_WIND_SPEED`/`WIND_DIRECTION` effectively everywhere (documented sensor damage) |
| Field partially populated | `BRIGHTNESS_TEMP` (GTS removals/duty cycle), UV bands (acquisition gaps), single first-row gaps in humidity columns |
| Field populated but quality-degraded | Not distinguishable at window-sampling level; confidence flags must be applied in W1.2C-2 |
| Usable with documented limitations | UV (post-Sol-155 degradation, `UVS_CONFIDENCE_LEVEL`), wind (if any valid values, preliminary + confidence filtered) |

---

## 9. Product identifiers and filenames (final collection)

All products: PDS4 calibrated collection, LID prefix `urn:nasa:pds:msl_rems:data_calibrated:`, version 1.0, 40 fields, record length 372 bytes.

| Sol | MY | MODRDR data filename | Data bytes | Records | Label START_TIME (UTC) |
|---|---|---|---:|---:|---|
| 4400 | 38 | `RME_788053862RMD44000000000_______P1.TAB` | 12,863,760 | 34,580 | 2024-12-21T12:54:40.004Z |
| 430 | 32 | `RME_435619468RMD04300000000_______P6.TAB` | 8,093,232 | 21,756 | 2013-10-21T09:33:18.056Z |
| 1850 | 34 | `RME_561679125RMD18500000000_______P2.TAB` | 10,318,536 | 27,738 | 2017-10-19T10:27:54.807Z |
| 1250 | 33 | `RME_508414481RMD12500000000_______P2.TAB` | 13,887,876 | 37,333 | 2016-02-10T22:34:13.095Z |
| 2600 | 35 | `RME_628259926RMD26000000000_______P2.TAB` | 14,102,148 | 37,909 | 2019-11-29T01:17:11.788Z |
| 3950 | 37 | `RME_748105384RMD39500000000_______P2.TAB` | 7,795,632 | 20,956 | 2023-09-16T04:01:27.932Z |
| 100 | 31 | `RME_406323911RMD01000000000_______P9.TAB` | 13,147,968 | 35,344 | 2012-11-16T07:48:43.598Z |
| 1450 | 33 | `RME_526169363RMD14500000000_______P2.TAB` | 11,579,988 | 31,129 | 2016-09-03T10:32:27.665Z |
| 4100 | 37 | `RME_761421544RMD41000000000_______P2.TAB` | 16,625,796 | 44,693 | 2024-02-17T06:59:27.957Z |
| 900 | 32 | `RME_477343439RMD09000000000_______P3.TAB` | 11,687,496 | 31,418 | 2015-02-16T07:39:27.847Z |
| 2250 | 34 | `RME_597188888RMD22500000000_______P2.TAB` | 11,856,012 | 31,871 | 2018-12-04T10:22:21.948Z |
| 3560 | 36 | `RME_713483365RMD35600000000_______P2.TAB` | 11,579,988 | 31,129 | 2022-08-11T10:42:02.269Z |

Naming note (established in W1.2A-H): PDS4 logical identifiers lowercase the PDS3 filename version suffix (`..._P9.TAB` → LID `...p9`); this is the official naming convention, and `file_name` in the label is authoritative.

---

## 10. Time and Ls metadata

Per-sample Ls in this milestone is derived from **PDS4 label START_TIME (UTC)** using the existing validated module (`team/gale/weather/mars_time.py`, Mars24/Allison–McEwen, UTC→TT via leap-second table). This path is independent of the REMS TIMESTAMP time-scale assumption.

- **Statuses preserved:** per-sample calculations are `PARTIALLY_VALIDATED` (algorithm and UTC→TT validated; source instant is the label UTC, which is product metadata rather than a per-record time).
- **REMS TIMESTAMP:** `ASSUMED_TIME_SCALE` (seconds since J2000.0 interpreted as TT). TIMESTAMP-derived Ls was **not** used for the new samples; for Sol 100 the existing TIMESTAMP-derived metadata (207.896°–208.496°) is retained, and its label-UTC cross-check value (207.898346°, difference 0.001961°) is recorded alongside.
- **Unresolved, unchanged:** the ~3.5-minute difference between TIMESTAMP-derived time and label UTC was neither explained nor silently reconciled. No per-record UTC or Ls values were fabricated; each sol spans ~0.5° of Ls, so season binning is insensitive to that offset.
- STOP_TIMEs (e.g. Sol 4400: 2024-12-22T12:38:44.813Z) confirm ~1-sol product spans and are recorded in the manifest.

---

## 11. Final recommended 12-sample collection

Ordered by season (complete details in `team/gale/weather/data/rems_seasonal_sample_manifest.json`):

| # | Sol | MY | Ls° (label UTC) | Northern / Gale | Role |
|---:|---|---|---|---|---|
| 1 | 4400 | 38 | 18.981 | Spring / Autumn | Earliest-spring anchor, newest year |
| 2 | 430 | 32 | 38.631 | Spring / Autumn | MY32 mid-spring |
| 3 | 1850 | 34 | 76.129 | Spring / Autumn | Late-spring anchor |
| 4 | 1250 | 33 | 107.356 | Summer / Winter | MY33 early summer |
| 5 | 2600 | 35 | 113.377 | Summer / Winter | MY35 mid-summer |
| 6 | 3950 | 37 | 119.489 | Summer / Winter | MY37 late-early-summer |
| 7 | 100 | 31 | 207.896–208.496 | Autumn / Spring | Existing validated reference (W1.2A) |
| 8 | 4100 | 37 | 200.749 | Autumn / Spring | Densest product (44,693 records) |
| 9 | 1450 | 33 | 215.910 | Autumn / Spring | MY33 mid-autumn |
| 10 | 900 | 32 | 292.314 | Winter / Summer | MY32 early winter |
| 11 | 2250 | 34 | 300.226 | Winter / Summer | MY34 mid-winter |
| 12 | 3560 | 36 | 283.224 | Winter / Summer | MY36 late-winter |

Why each sol is useful: every sol provides fully populated air temperature, pressure, humidity (VMR) and boom-local temperatures in sampled windows; ground temperature and UV where populated extend diurnal analysis; the set spans all four seasons, all 8 archive Martian years, and both the oldest (2012) and newest (2024) fully documented eras of the archive.

Download volume used for this audit (no bulk raw download): 28 labels (~0.8 MB), bounded range samples (2.16 MB), collection inventory (1.56 MB), errata (21 KB), directory listings (~90 KB).

---

## 12. Scientific limitations

1. **Wind:** effectively absent in all inspected candidates (hardware degradation documented in the archive). Where isolated valid values exist (e.g. 1 row at sol 900; 36 rows at Sol 100), they remain preliminary and require confidence-flag filtering in W1.2C-2. Wind must be presented as "not reliably available", never as zero.
2. **Vertical wind:** not scientifically usable; entirely missing in every inspected product.
3. **UV:** degraded after ~Sol 155; partial population varies by sol and time of day; corrected UVRDR products (SZA < 55°) remain the recommended source for any quantitative UV analysis.
4. **Window sampling:** missing-value percentages for the 11 new sols are bounded samples (3 × 65,536 bytes/file) — they demonstrate population patterns but are **not** full-sol statistics; full-sol percentages must be computed in W1.2C-2 before any comparison use.
5. **Point observations:** REMS measures Curiosity's location only; samples are not Gale-region-wide fields, not forecasts, and carry no EVA safety meaning.
6. **Missing ≠ zero:** `-999` conventions were never converted, interpolated, or zero-filled in this milestone (the manifest contains no observation records at all).
7. **Release-documentation lag:** sols 4134–4843 exist as accessible PDS4 products without errata release notes; Sol 4400 (selected) lies within the officially stated coverage but predates any release note covering it — identity verified via label + collection inventory; re-verify at next archive release.
8. **Time scale:** REMS TIMESTAMP scale remains assumed; the ~3.5-minute label offset is unresolved (see §10).

---

## 13. Recommended W1.2C-2 implementation plan

1. **Generalize sol handling in the preparation tooling** (not the parser's scientific logic): the current `scripts/gale-weather/prepare_sol.py` and `rems_parser.py` identity checks are Sol-100-specific (filename allowlist, `EXPECTED_SOL`); extend to accept the 12 selected sols via the manifest, preserving all existing validation semantics (field contract, record-length, CRLF, monotonic TIMESTAMP, confidence-string shapes).
2. **Download and process the 12 MODRDR products** (`_P*.TAB` + labels), verifying SHA-256 against the archive and populating manifest checksum fields.
3. **Compute full-sol missing-value statistics** for all 40 fields per sol; replace window-sample statistics in the manifest (or supersede it with a per-sol quality manifest).
4. **Aggregate compact per-sol JSON** (existing `build_output` structure): hourly statistics (count/min/max/mean per key variable with confidence summaries), preserving raw records and `-999`→null handling.
5. **Per-sol time metadata:** label START/STOP UTC + Ls (label-UTC path, as here), TIMESTAMP-derived Ls cross-check per sol (expected ≤ 0.002° difference), MY and seasons — reuse `prepare_time_metadata.py` patterns.
6. **Confidence-flag analysis** per sensor per sol (pattern tables as already implemented in `quality_summary`).
7. **Tests:** extend `tests/test_gale_weather_parser.py` with per-sol parameterized cases (record counts from this audit's table, seasonal bins, MY assignments); keep Mars-time tests untouched.
8. **Frontend integration deferred** to a later milestone (out of W1.2C scope), consuming the generated JSONs.

Stop after W1.2C-1 — W1.2C-2 must not begin without review.

---

## 14. Validation performed for W1.2C-1

- [x] Official REMS page retrieved; coverage statement and Sol 4488 identity verified.
- [x] All 42 calibrated-collection group listings retrieved; sol-folder gaps enumerated.
- [x] PDS4 calibrated collection inventory (18,812 rows) parsed; 4703 sols, complete product sets, 140 gap sols.
- [x] 28 candidate labels + Sol 4843 label downloaded and parsed with the existing validated label parser; 40-field contract verified for every label.
- [x] LIDs of all 12 selected sols cross-checked against the official inventory (12/12 match).
- [x] Ls, MY, and seasons recomputed independently from label START_TIMEs; 34/34 automated manifest checks passed (includes Ls-in-bin, 3-per-season, 8-MY coverage, distribution consistency).
- [x] Bounded range-sampling audit (2.16 MB) for 13 sols; no bulk raw-data download performed.
- [x] Sol 100 observation JSON, data file, and label verified byte-unchanged (SHA-256 match with W1.2A-H records).
- [x] Manifest JSON syntax validated (parsed successfully).
- [x] `python -B -m unittest tests.test_gale_mars_time -v` → **69 tests, OK**.
- [x] `python -B -m unittest tests.test_gale_weather_parser -v` → **45 tests, OK**.
- [x] `python -B -m unittest discover -s tests -p "test_gale_*.py" -v` → **133 tests, OK**.
- [x] Frontend typecheck/lint/build not run (not mandatory; no frontend files changed).

---

## 15. Files created or modified

| File | Change |
|---|---|
| `docs/GALE_WEATHER_W1_2C_1_MULTI_SOL_COVERAGE_AUDIT.md` | Created (this report) |
| `team/gale/weather/data/rems_seasonal_sample_manifest.json` | Created (metadata-only manifest) |

Unchanged: all existing weather code (`rems_schema.py`, `rems_parser.py`, `mars_time.py`), existing Sol 100 data files, tests, scripts, frontend, Jezero/Oxia files, and all other worktrees. Scratch audit tooling was used outside the committed tree and removed before commit.

---

## 16. Unresolved scientific questions

1. Why do the 140 gap sols have no REMS products (mission activities vs. deliberate exclusion)? A per-gap explanation would require mission-event records beyond the REMS bundle.
2. The REMS TIMESTAMP time scale and the ~3.5-minute label-UTC offset remain unexplained (carried from W1.2B-H2; unchanged).
3. GTS (`BRIGHTNESS_TEMP`) population varies strongly between windows (0–100%); the per-window pattern suggests duty-cycle/processing removals whose exact rules should be confirmed against `REMS_MODRDR_DS.CAT` during full-sol processing in W1.2C-2.
4. UV zero-value semantics: night rows carry valid 0.00 W/m²; distinguishing "true zero irradiance" from "sensor output below detection" should be documented with `UVS_CONFIDENCE_LEVEL` semantics in W1.2C-2.
5. Sols 4489–4843 await official release documentation; whether any future seasonal sample should come from that window is deferred.
6. Whether seasonal climatology should ultimately average multiple sols per bin (W1.2C-2+ design decision; this milestone's one-sol-per-bin-per-MY sample is a defensible start, not a climatology).

---

## 17. Git delivery

- Branch: `feat/gale-weather-data`
- Starting commit: `5f7fc83e0d7a9512bb724d6de44432626b056b6b` (verified in local and remote history before work began)
- Work performed in the existing dedicated worktree at `Martian-Map-weather` (branch was occupied there; no other worktree touched)
- Research commit: see `git log` (docs: add Gale multi-sol seasonal coverage audit)
- Push status: see final delivery note / remote verification
