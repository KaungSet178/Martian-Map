# Gale Weather W1.1 — Curiosity REMS Source Audit

**Assignment:** W1.1 — Research and verify real Curiosity REMS weather datasets for Gale Crater  
**Scope:** Research and data auditing only. No weather feature, UI, forecast, or route scheduling is implemented.  
**Branch:** `feat/gale-weather-data` (based on `origin/feat/gale-map` @ `a5809da`)  
**Verification date:** 2026-11-14  
**Primary region:** Gale Crater (Curiosity / Lower Mount Sharp)  

---

## 1. Executive summary

Authentic, reproducibly accessible historical weather data from NASA's Curiosity rover exists in the
**Planetary Data System (PDS4)** as the **MSL REMS bundle** (`urn:nasa:pds:msl_rems`, DOI `10.17189/vwva-ms24`).

Recommended source for Marswalk is the **MODRDR** product level:

- Data set ID: `MSL-M-REMS-5-MODRDR-V1.0`
- Product: `RME_*RMD*_PA.TAB` (one sol per file)
- Processing level: **Calibrated / Reduced Data Record**, highest REMS processing level
- Contains corrected environmental magnitudes plus per-sensor confidence levels and uncertainties

MODRDR supports historical visualization and seasonal analysis of:

- Air temperature (ambient + boom-local)
- Ground (brightness) temperature
- Atmospheric pressure
- Relative humidity and volume mixing ratio
- Ultraviolet flux (bands A–E)
- Horizontal wind speed and wind direction (with documented limitations)

Key limitations:

- Vertical wind is effectively unavailable in the observed sample and documentation says only horizontal wind speed/direction are provided.
- Wind Sensor hardware was damaged during landing and several boom boards failed later in the mission.
- Ultraviolet Sensor degraded beyond operational requirements after sol 155 due to dust deposition.
- Humidity Sensor uses a special high-resolution interval mode on selected sols from sol 793 onward, during which Boom 2 (wind + air temperature) is switched off.
- Baseline sampling is 5 minutes per hour, not continuous.
- **No solar longitude (Ls) field is present** in MODRDR or ADR geometry tables. Ls must be derived from the archive time fields using a published algorithm.
- REMS is a point observation at Curiosity's location. It is not a forecast and does not apply uniformly to every Lower Mount Sharp waypoint.

No artificial EVA safety thresholds, forecasts, or safety recommendations are made in this audit.

---

## 2. Official sources

| Resource | URL |
|---|---|
| REMS official PDS page | https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/curiosity/rems.html |
| PDS4 bundle root | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/ |
| Bundle label (PDS4) | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/bundle_msl_rems.xml |
| Calibrated data collection | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/data_calibrated/ |
| Calibrated collection label | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/data_calibrated/collection_mslrems_data_calibrated.xml |
| Calibrated collection inventory | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/data_calibrated/collection_mslrems_data_calibrated_inventory.csv |
| Raw data collection | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/data_raw/ |
| UV-corrected data collection | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/data_uv_corrected/ |
| MODRDR data set description | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/document/REMS_MODRDR_DS.CAT |
| ADR data set description | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/document/REMS_ADR_DS.CAT |
| ENVRDR data set description | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/document/REMS_ENVRDR_DS.CAT |
| TELRDR data set description | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/document/REMS_TELRDR_DS.CAT |
| UVRDR data set description | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/document/REMS_UVRDR_DS.CAT |
| EDR data set description | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/document/REMS_EDRDS.CAT |
| REMS RDR SIS (PDF) | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/document/REMS_RDR_SIS.PDF |
| REMS RDR SIS (text) | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/document/REMS_RDR_SIS.TXT |
| REMS RDR volume SIS (text) | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/document/REMS_RDR_VOLSIS.TXT |
| Instrument catalog | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/document/REMS_INST.CAT |
| Wind processing note | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/document/WIND_PROCESSING.TXT |
| Errata / release notes | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/document/ERRATA_CAL.TXT |
| Calibration directory | https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/calibration/ |
| Mars24 technical notes | https://www.giss.nasa.gov/tools/mars24/help/notes.html |
| Mars24 credits/references | https://www.giss.nasa.gov/tools/mars24/help/credits.html |

All URLs above were retrieved successfully on 2026-11-14. The bundle DOI is `10.17189/vwva-ms24`.

---

## 3. Archive inventory

### Product levels

| Level | Data set ID | Description | Recommendation |
|---|---|---|---|
| EDR | `MSL-M-REMS-2-EDR-V1.0` | Raw telemetry converted to ASCII | Not for direct scientific use |
| TELRDR | `MSL-M-REMS-3-TELRDR-V1.0` | Electrical/thermal magnitudes and temperatures | Useful for sensor-level checks only |
| ENVRDR | `MSL-M-REMS-4-ENVRDR-V1.0` | Environmental magnitudes with minimal corrections | Secondary comparison |
| **MODRDR** | `MSL-M-REMS-5-MODRDR-V1.0` | Corrected/modeled environmental magnitudes; highest level | **Recommended** |
| ADR | `MSL-M-REMS-6-ADR-V1.0` | Ancillary geometry, rover position, sun angles | Required for geometry/time context |
| UVRDR | `MSL-M-REMS-7-UVRDR-V1.0` | Alternative corrected UV fluxes for SZA < 55° | Use for corrected UV analysis |

### Bundle and release metadata

- PDS4 bundle: `urn:nasa:pds:msl_rems`, version `1.0`
- Bundle information model version: `1.24.0.0`
- Calibrated collection information model version: `1.18.0.0`
- MODRDR data set release date (CAT): `2024-08-02`
- Latest errata file publication date: `2024-09-30`
- Official REMS page coverage statement: Sol 1 (2012-08-07, Ls 151.0, MY 31) to Sol 4488 (2025-03-22, Ls 60.1, MY 38), ongoing
- Current bundle directory listing extends through sol folders `SOL04843`; verify release/errata status and file completeness before scientific use of sols beyond the officially documented range

File organization:

- One directory per sol: `data_calibrated/SOL_XXXXX_YYYYY/SOLZZZZZ/`
- Four products per sol: `*ADR*.TAB`, `*RMD*.TAB`, `*RNV*.TAB`, `*RTL*.TAB`
- Labels: `.LBL` (PDS3) and `.xml` (PDS4)
- Fixed-width ASCII tables, CRLF row delimiters, comma-delimited fields

---

## 4. Available variables (MODRDR)

Source: PDS4 label `RME_397535244RMD00010000000_______PA.xml` and `REMS_MODRDR_DS.CAT`.

| # | Official field | Units | Sampling / notes | Missing value | Quality / limitations |
|---:|---|---|---|---|---|
| 1 | `TIMESTAMP` | seconds (since noon 1-Jan-2000) | 1 Hz max; each row is one acquisition second | — | Synced with SCLK; max deviation 30 s |
| 2 | `LMST` | string `SSSSSMHH:MM:SS.sss` | Local Mean Solar Time; sol number + time | — | Do not confuse with LTST |
| 3 | `LTST` | string `SSSSS HH:MM:SS.sss` | Local True Solar Time relative to rover position | — | Rover position, not landing site |
| 4 | `HORIZONTAL_WIND_SPEED` | m/s | Derived from WS inverse model; only if front wind | `-999.00` | WS damaged; preliminary; confidence in `WS_CONFIDENCE_LEVEL` |
| 5 | `VERTICAL_WIND_SPEED` | m/s | Column exists; observed as `-999` in sample | `-999.00` | Documentation states only horizontal speed/direction are provided |
| 6 | `WIND_DIRECTION` | degree | 5-min histogram most frequent direction | `-999.00` | Front: ±15°; rear: ±45°, speed not reported |
| 7 | `WS_CONFIDENCE_LEVEL` | 8-char string | ASIC temp, noise, rover motion, config, front/rear, reliability | `XXXXXX`/`XXXX` | Higher number of `1` = more reliable |
| 8 | `BRIGHTNESS_TEMP` | K | GTS thermopile A, 8–14 µm | `-999.00` | Range 150–300 K; accuracy 10 K; resolution 2 K |
| 9 | `BRIGHTNESS_TEMP_LONG_TERM_UNCERTAINTY` | K | Absolute systematic uncertainty | `-999.00` | — |
| 10 | `BRIGHTNESS_TEMP_SHORT_TERM_UNCERTAINTY` | K | Relative systematic uncertainty | `-999.00` | — |
| 11 | `GTS_CONFIDENCE_LEVEL` | 8-char string | ASIC power, recalibration, rover motion, shadow | `XXXX` | — |
| 12 | `BOOM1_LOCAL_AIR_TEMP` | K | PT1000-derived local air temperature | — | Range 150–300 K; accuracy 5 K; resolution 0.1 K |
| 13 | `ATS_BOOM1_CONFIDENCE_LEVEL` | 8-char string | Boom 1 ATS quality flags | — | — |
| 14 | `BOOM2_LOCAL_AIR_TEMP` | K | PT1000-derived local air temperature | — | Same range/accuracy as boom 1 |
| 15 | `ATS_BOOM2_CONFIDENCE_LEVEL` | 8-char string | Boom 2 ATS quality flags | — | — |
| 16 | `AMBIENT_TEMP` | K | Filtered single ambient air temperature | `-999.00` | Operational error < 5 K flag in confidence |
| 17 | `AMBIENT_TEMP_CONFIDENCE_LEVEL` | 12-char string | Ambient temperature quality flags | — | — |
| 18–23 | `UV_A` … `UV_E` | W/m² | Six photodiode bands | `-999.00` | Accuracy < 8%; UVS degraded after sol 155 |
| 24–29 | `UV_*_UNCERTAINTY` | % | Systematic uncertainty per band | `-999.00` | — |
| 30 | `UVS_CONFIDENCE_LEVEL` | 8-char string | Global/diffuse irradiance, arm, shadow, dust | — | Dust attenuation > 10% flagged |
| 31 | `LOCAL_RELATIVE_HUMIDITY` | % | Median of three humidity channels | `-999.00` | Accuracy 10% in 200–323 K; resolution 1% |
| 32 | `HS_TEMP` | K | Humidity sensor operating temperature | `-999.00` | — |
| 33 | `LOCAL_RELATIVE_HUMIDITY_UNCERTAINTY` | % | Calibration uncertainty | `-999.00` | — |
| 34 | `VOLUME_MIXING_RATIO` | ppm | Derived H₂O VMR | `-999.00` | — |
| 35 | `VOLUME_MIXING_RATIO_UNCERTAINTY` | ppm | VMR uncertainty | `-999.00` | — |
| 36 | `HS_CONFIDENCE_LEVEL` | 8-char string | HS reliability, RH quality, VMR range | `XXXX` | — |
| 37 | `PS_CONFIGURATION` | string | Oscillator (`1`/`2`) + resolution (`L`/`H`) | — | — |
| 38 | `PRESSURE` | Pa | Drift-corrected pressure | `-999.00` | Range 1–1150 Pa; accuracy ~3–20 Pa; resolution 0.5 Pa |
| 39 | `PRESSURE_UNCERTAINTY` | Pa | Absolute accuracy | `-999.00` | — |
| 40 | `PS_CONFIDENCE_LEVEL` | 8-char string | Oscillator and shadow-effect flags | — | — |

Sampling strategy (from `REMS_MODRDR_DS.CAT`):

- Maximum resolution 1 Hz.
- Baseline: 5 minutes of data every hour.
- Additional on-demand or event-triggered blocks.
- First 72 sols: wind sensor off for 60 s, on for 235 s, off for 5 s in each 5-minute block; all sensors on from sol 73 onward.
- From sol 793: Humidity Sensor High Resolution Interval Mode (HS HRIM) on selected one-hour observations; Boom 2 switched off, so no wind or air-temperature measurements during those intervals.

---

## 5. Time metadata

### Fields available in MODRDR

| Field | Meaning | Important interpretation |
|---|---|---|
| `TIMESTAMP` | Seconds since noon 1-Jan-2000 | Convert to UTC/SCET using the documented epoch; not a Unix timestamp |
| `LMST` | Local Mean Solar Time, format `SSSSSMHH:MM:SS.sss` | Sol number (5 digits), separator, hour, minute, second, millisecond |
| `LTST` | Local True Solar Time, format `SSSSS HH:MM:SS.sss` | Rover position; differs from landing-site LTST used in some MSL products |
| Label `START_TIME` / `STOP_TIME` | UTC interval for the product | Spacecraft/ground time context |

### Sol numbering

- Curiosity landed on 2012-08-06 (Sol 0 in MSL convention).
- Official REMS page labels 2012-08-07 as Sol 1.
- Sol number is embedded in `LMST` and `LTST`.

### Local Mean vs. Local True Solar Time

- LMST advances uniformly.
- LTST includes the Equation of Time.
- On Mars, the Equation of Time ranges from about -51.1 min to +39.9 min.
- These fields are **not interchangeable**.

### Solar longitude (Ls)

- **No Ls field exists** in MODRDR.
- The ADR geometry field named `SOLAR_LONGITUDE_ANGLE` is a solar azimuth angle relative to the rover frame, not heliocentric Mars solar longitude. It must not be used as Ls.
- Ls must be derived from the archive time fields using a published orbital algorithm.

Recommended derivation method:

- **Mars24 sunclock algorithm** (Allison and McEwen, 2000), with technical notes at https://www.giss.nasa.gov/tools/mars24/help/notes.html
- Required inputs:
  - UTC/SCET time derived from `TIMESTAMP` or label start/stop times
  - Mars orbital elements / ephemeris (mean anomaly, perihelion longitude, eccentricity, obliquity)
- Expected accuracy (from Mars24 notes):
  - Maximum Ls error approximately 0.008° over ±100 years of J2000
  - True Solar Time error up to about 3 s
  - TT-to-UTC conversion error up to about 3 s in some post-1975 periods
- Additional seasonal reference:
  - Mars tropical year: 686.9725 days (668.5921 sols)
  - Ls = 0°, 90°, 180°, 270° = northern vernal equinox, summer solstice, autumnal equinox, winter solstice

Martian year is not stored in REMS. It can be derived from Ls cycles, but the exact epoch convention must be documented in W1.2 before use.

### Time conversion cautions

- `TIMESTAMP` is seconds since noon 1-Jan-2000, not a conventional Unix epoch.
- REMS clock is synced with SCLK with a maximum deviation of 30 s.
- LTST uses rover position, while other MSL products may use landing-site longitude.
- MSL mission clock was based on a planned landing longitude of 137.42°E, while the actual landing longitude is 137.442°E, producing a several-second difference.

---

## 6. Data quality

### Missing and invalid data

- Current (PDS4) release convention: undetermined values are stored as `-999` (or `-999.00`, depending on field format).
- Older releases used `UNK` or `NULL`.
- A value of `-999` means the value is not known and may never be known, or is not known at release time but may be known later.
- Missing values must remain missing. They must not be interpolated or replaced with arbitrary values.

### Instrument and operational limitations

- **Wind Sensor:**
  - Wind Sensor boards 2 and 3 in Boom 1 are not provided because they were damaged during landing.
  - Boom 2 boards became inoperative starting at sols 854, 1485, 1491, and 1504.
  - Wind data are preliminary and pending further revision.
  - Only horizontal speed and direction are provided.
  - Rear-wind directions have ±45° uncertainty and no wind speed.
  - Front-wind directions have ±15° uncertainty.
- **Ultraviolet Sensor:**
  - Degraded beyond operational functional requirements from sol 155 due to dust deposition (> 10% attenuation).
  - Degradation is flagged in `UVS_CONFIDENCE_LEVEL`.
  - Corrected UV products (`UVRDR`) are available for solar zenith angles < 55°.
- **Humidity Sensor:**
  - HS HRIM mode begins at sol 793 on selected one-hour observations.
  - During HS HRIM, Boom 2 is switched off, so wind and air-temperature measurements are unavailable.
  - Relative humidity accuracy is 10% in the 200–323 K range.
- **Ground Temperature Sensor:**
  - Thermopiles B and C were removed from MODRDR due to high uncertainty.
  - Data acquired with unstable ASIC temperature or outside calibration sequence are removed.
  - Shadow in the field of view is flagged.
- **Air Temperature Sensor:**
  - Ambient temperature is derived by filtering boom-local temperatures.
  - Boom-in-shadow and observation-reliability flags are included.
  - Early release note: air-temperature columns were incorrectly labeled as Celsius instead of Kelvin in an early release; later releases corrected this.
- **Pressure Sensor:**
  - Drift correction applied.
  - Oscillator and shadow-effect flags are included.
- **Sampling gaps:**
  - Baseline is 5 minutes per hour.
  - Coverage is not continuous.
  - Event mode may add triggered observations.

---

## 7. Verified small sample

The following lines were retrieved by bounded HTTP access to one MODRDR product on 2026-11-14. No full archive download was performed. Values are copied verbatim from the source; `-999.00` values represent missing data.

Source product: `RME_397535244RMD00010000000_______PA.TAB` (Sol 1, MODRDR), with PDS4 label `RME_397535244RMD00010000000_______PA.xml`.

First row in the Sol 1 product (all meteorological fields missing in this row):

```text
 397584147,"00001M13:13:15.824","00001 13:46:33",-999.00,-999.00,-999.00,"  XXXXXX",-999.00,-999.00,-999.00,"    XXXX",-999.00,"     XXX",-999.00," -999.00",-999.00,"     -999.00",-999.00,-999.00,-999.00,-999.00,-999.00,-999.00,  10.00,  10.00,  10.00,  10.00,  10.00,  10.00," -999.00",-999.00,-999.00,-999.00, -999.00,-999.00," -999.00","  ",-999.00,-999.00," -999.00"
```

First Sol 1 row with non-missing ambient air temperature, ground temperature, and pressure (row index 240 of 750):

```text
 397584415,"00001M13:17:36.656","00001 13:50:54",-999.00,-999.00,-999.00,"  XXXXXX", 293.45,   4.01,   0.61,"    0111", 275.74,"101XX001", 266.09,"101XX111", 266.09,"   101XX1111",-999.00,-999.00,-999.00,-999.00,-999.00,-999.00,  10.00,  10.00,  10.00,  10.00,  10.00,  10.00,"    XXXX",-999.00,-999.00,-999.00, -999.00,-999.00,"     XXX","  ",-999.00,-999.00," -999.00"
```

Source product: `RME_406323911RMD01000000000_______P9.TAB` (Sol 100, MODRDR), with PDS4 label `RME_406323911RMD01000000000_______P9.xml`.

First row in the Sol 100 product (wind direction and UV available; UV is zero at local night):

```text
 406323911,"00100M00:00:00.192","00100 00:37:07",-999.00,-999.00,  53.77,"  101100", 222.85,"111XX111", 219.49,"111XX111", 219.49,"   111XX1111",   0.00,   0.00,   0.00,   0.00,   0.00,   0.00,  10.00,  10.00,  10.00,  10.00,  10.00,  10.00,"   01111",   2.71, 219.35,  10.00,   76.51,-999.00,"     0X1","2H", 864.77,   2.70,"      11"
```

Observed row counts:

- Sol 1 MODRDR product: 750 rows, 40 fields.
- Sol 1 ambient air temperature: 510 non-missing of 750 rows.
- Sol 1 pressure: 450 non-missing of 750 rows.
- Sol 1 relative humidity: 387 non-missing of 750 rows.
- Sol 1 horizontal wind speed: 0 non-missing of 750 rows in this product.
- Sol 1 UV: 0 non-missing of 750 rows in this product.
- Sol 1 ground (brightness) temperature: 510 non-missing of 750 rows.

These counts are from one representative sol and are not generalized to the whole mission.

---

## 8. Proposed preprocessing strategy (for W1.2, not implemented here)

1. **Select a small, defensible subset of sols** (for example, one sol per ~30° Ls after Ls derivation), rather than the full archive.
2. **Download only selected MODRDR products** and their PDS4 labels; do not commit raw `.TAB` files.
3. **Parse fixed-width CSV** using the PDS4 label as the schema authority.
4. **Convert `-999` to `null`** in all numeric fields; retain original confidence strings.
5. **Keep SI units** (K, Pa, m/s, W/m², %, ppm) and record unit metadata alongside values.
6. **Aggregate 1 Hz rows into compact intervals** (for example 5-minute or hourly statistics: count, min, max, mean, and confidence summary).
7. **Derive Ls** from `TIMESTAMP` using the Mars24/Allison–McEwen method; store Ls, derived Martian season, and derivation method/version.
8. **Preserve missingness**: do not interpolate, impute, or smooth gaps.
9. **Filter wind by confidence flags** and distinguish front vs. rear wind.
10. **Use UVRDR** for corrected UV analysis when solar zenith angle < 55°.
11. **Output compact JSON** per selected sol or seasonal climatology, with provenance:
    - Source product IDs
    - Data set ID and release
    - Bundle DOI
    - Processing/preprocessing version
    - Ls derivation method
12. **Validate against PDS labels** before any use in the application.

---

## 9. Suitability and limitations

### What REMS can support

- Historical weather visualization near Curiosity:
  - Air temperature over a sol
  - Ground temperature variations
  - Pressure changes during a sol
  - Available wind measurements
  - Humidity and UV where valid
- Seasonal historical analysis by Ls:
  - Temperature distributions by season
  - Diurnal variation across observed seasons
  - Historical pressure patterns
- Offline processing into compact, source-backed JSON
- Environmental timeline comparisons at different times of day within observed sols

### What REMS cannot support

- Forecasting or prediction of future conditions
- Applying a historical observation exactly to all locations in Lower Mount Sharp
- Continuous 24-hour coverage at 1 Hz
- Vertical wind measurements (effectively unavailable)
- Reliable UV after sol 155 without corrected products and confidence filtering
- Any claim that a time window is safe for human EVA
- Any spacesuit safety determination from temperature alone

REMS measures historical conditions at Curiosity's observing location. It does not provide a guaranteed forecast for an astronaut at every waypoint.

---

## 10. Next-phase recommendation (W1.2)

- **Primary product:** MODRDR (`MSL-M-REMS-5-MODRDR-V1.0`)
- **Secondary product:** UVRDR for corrected UV fluxes (SZA < 55°)
- **Ancillary product:** ADR for geometry, rover position, and solar angles
- **First implementation target:** parse and validate one complete sol (recommended: Sol 100) end to end
- **Seasonal subset:** after Ls derivation, select approximately 12 sols distributed across Ls (about one per 30°) for a compact seasonal sample
- **Validation checks to implement:**
  - Source URL resolves
  - PDS4 label parses
  - Row count matches label
  - Field count is 40
  - `-999` handling is correct
  - `LMST` and `LTST` parse correctly
  - Confidence strings have expected lengths
  - `TIMESTAMP` is monotonic within a sol
  - Derived Ls is within 0–360°
  - No values are fabricated or imputed
  - Provenance metadata is complete

Do not implement W1.2 in this branch.

---

## 11. Validation performed for W1.1

- [x] Official REMS page retrieved and reviewed
- [x] PDS4 bundle and collection labels retrieved
- [x] MODRDR, ADR, ENVRDR, TELRDR, and UVRDR data set descriptions retrieved
- [x] MODRDR PDS4 label retrieved and field names verified
- [x] MODRDR `.TAB` sample retrieved and inspected
- [x] Units verified against PDS4 label
- [x] Missing-value convention verified (`-999`)
- [x] Time-field definitions verified
- [x] Wind-processing note retrieved
- [x] Errata/release notes retrieved
- [x] Mars24 Ls algorithm references retrieved
- [x] No example values fabricated; sample rows copied from source
- [x] No large downloads committed
- [x] Only the W1.1 audit document was added; unrelated project files were not modified

---

## 12. Git delivery

- Branch: `feat/gale-weather-data`
- Base: `origin/feat/gale-map` @ `a5809da`
- Commit: (to be filled after commit)
- Remote push status: (to be filled after push)

---

## 13. Unresolved issues

- The official REMS page states coverage through Sol 4488, while the current bundle directory lists sol folders through 4843. Confirm the intended coverage and release status before using sols beyond the documented range.
- Ls is not present in REMS products and must be derived externally; W1.2 must implement and validate the chosen conversion.
- Martian year/epoch convention is not defined in REMS and must be documented before seasonal grouping.
- LMST reference (rover vs. landing site) is not as explicitly documented as LTST; verify against ADR/RDR SIS before relying on it.
- Wind data remain preliminary and several hardware boards are inoperative; W1.2 must filter by confidence flags and sol range.
- UV degradation after sol 155 requires confidence filtering or UVRDR use.
PY