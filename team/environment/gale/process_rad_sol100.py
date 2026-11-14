"""
Parse authentic MSL Curiosity RAD Sol 100 RDR observations from NASA PDS PPI archive.
Extracts 43 observation blocks for Sol 100, including Silicon detector B and
Plastic scintillator detector E absorbed dose rates (in uGy/hr and uGy/day).
Generates data/environment/gale/rad_sol_00100.json.
"""

import json
import math
import os
import re
import sys

RAW_DIR = os.path.join(os.path.dirname(__file__), "raw")
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "environment", "gale"))

LBL_FILENAME = "RAD_RDR_2012_321_08_21_0100_V00.LBL"
TXT_FILENAME = "RAD_RDR_2012_321_08_21_0100_V00.TXT"


def parse_ltst_hour(mars_str: str) -> float | None:
    """Extract decimal hour of sol from string like 'Sol 0100 00:06:50.000' or '00:06:50'."""
    if not mars_str:
        return None
    m = re.search(r"(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)", mars_str)
    if not m:
        return None
    h, mn, s = float(m.group(1)), float(m.group(2)), float(m.group(3))
    return round(h + mn / 60.0 + s / 3600.0, 4)


def parse_rad_rdr(txt_path: str, lbl_path: str) -> dict:
    with open(txt_path, "r", encoding="utf-8", errors="replace") as f:
        txt_text = f.read()

    obs_matches = list(re.finditer(r"\[OBSERVATION:\s*(\d+)\]", txt_text))
    if not obs_matches:
        raise ValueError(f"No [OBSERVATION: xx] sections found in {txt_path}")

    observations = []
    for i, m in enumerate(obs_matches):
        obs_idx = int(m.group(1))
        start_pos = m.start()
        end_pos = obs_matches[i + 1].start() if i + 1 < len(obs_matches) else len(txt_text)
        chunk = txt_text[start_pos:end_pos]

        edr_match = re.search(r"EDR_FILENAME=([^\r\n]+)", chunk)
        mars_match = re.search(r'START_OBS_MARS="([^"]+)"', chunk)
        utc_match = re.search(r'START_OBS_UTC="([^"]+)"', chunk)
        sclk_match = re.search(r"START_OBS_SCLK=([^\r\n]+)", chunk)
        integ_match = re.search(r"INTEGRATION_TIME=([^\r\n]+)", chunk)
        qc_match = re.search(r"QC=([0-9A-Fa-f]+)", chunk)

        edr_val = edr_match.group(1).strip() if edr_match else None
        sclk_val = None
        if sclk_match:
            try:
                sclk_val = int(sclk_match.group(1).strip())
            except ValueError:
                pass
        if sclk_val is None and edr_val:
            s_match = re.search(r"RDA_(\d+)", edr_val)
            if s_match:
                sclk_val = int(s_match.group(1))

        dose_b_match = re.search(r"\[DOSIMETRY_TOTAL_DOSE_B:\s*\d+\]\s*\r?\n\s*([0-9\.\-\+eE]+)", chunk)
        dose_e_match = re.search(r"\[DOSIMETRY_TOTAL_DOSE_E:\s*\d+\]\s*\r?\n\s*([0-9\.\-\+eE]+)", chunk)

        dose_b = float(dose_b_match.group(1)) if dose_b_match else None
        dose_e = float(dose_e_match.group(1)) if dose_e_match else None

        mars_str = mars_match.group(1).strip() if mars_match else None
        utc_str = utc_match.group(1).strip() if utc_match else None
        hour_ltst = parse_ltst_hour(mars_str)

        dose_b_day = round(dose_b * 24.0, 4) if dose_b is not None else None
        dose_e_day = round(dose_e * 24.0, 4) if dose_e is not None else None

        observations.append({
            "observation_index": obs_idx,
            "edr_filename": edr_match.group(1).strip() if edr_match else None,
            "start_obs_sclk": sclk_val,
            "start_obs_utc": utc_str,
            "start_obs_mars": mars_str,
            "hour_ltst": hour_ltst,
            "integration_time_seconds": float(integ_match.group(1).strip()) if integ_match else None,
            "qc_status": qc_match.group(1).strip() if qc_match else None,
            "dose_rate_b_microgray_per_hour": dose_b,
            "dose_rate_b_microgray_per_day": dose_b_day,
            "dose_rate_e_microgray_per_hour": dose_e,
            "dose_rate_e_microgray_per_day": dose_e_day,
        })

    # Summary statistics for Detector B (Silicon) and Detector E (Plastic)
    valid_b = [o["dose_rate_b_microgray_per_hour"] for o in observations if o["dose_rate_b_microgray_per_hour"] is not None]
    valid_e = [o["dose_rate_e_microgray_per_hour"] for o in observations if o["dose_rate_e_microgray_per_hour"] is not None]

    def stats(vals):
        if not vals:
            return None
        mean_val = sum(vals) / len(vals)
        variance = sum((x - mean_val) ** 2 for x in vals) / len(vals) if len(vals) > 1 else 0.0
        return {
            "count": len(vals),
            "min_microgray_per_hour": round(min(vals), 4),
            "max_microgray_per_hour": round(max(vals), 4),
            "mean_microgray_per_hour": round(mean_val, 4),
            "stddev_microgray_per_hour": round(math.sqrt(variance), 4),
            "min_microgray_per_day": round(min(vals) * 24.0, 4),
            "max_microgray_per_day": round(max(vals) * 24.0, 4),
            "mean_microgray_per_day": round(mean_val * 24.0, 4),
            "stddev_microgray_per_day": round(math.sqrt(variance) * 24.0, 4),
        }

    stats_b = stats(valid_b)
    stats_e = stats(valid_e)

    result = {
        "metadata": {
            "regionId": "gale",
            "mission": "MSL Curiosity",
            "instrument": "Radiation Assessment Detector (RAD)",
            "dataset_id": "MSL-M-RAD-3-RDR-V1.0",
            "product_id": "RAD_RDR_2012_321_08_21_0100_V00",
            "pds_archive_url": "https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/DATA/SOL_00090_00179/RAD_RDR_2012_321_08_21_0100_V00.TXT",
            "sol": 100,
            "ls_deg": 208.57,
            "martian_year": 31,
            "detector_b_type": "Silicon planar detector B (300 um thickness)",
            "detector_e_type": "Plastic scintillator detector E (BC-432 tissue-equivalent, 18 mm thickness)",
            "units": {
                "hourly": "microgray per hour (uGy/hr)",
                "daily": "microgray per day (uGy/day)"
            },
            "total_observations": len(observations),
            "valid_observations_b": len(valid_b),
            "valid_observations_e": len(valid_e),
            "scientific_notes": [
                "RAD measures ionizing radiation dose from Galactic Cosmic Rays (GCR) and solar energetic particles.",
                "Detector B is a 300-micrometer silicon sensor; Detector E is tissue-equivalent plastic scintillator.",
                "Values are absorbed dose rates (microgray); equivalent dose (microsievert) requires LET spectra quality factor integration.",
                "Published MSL RAD baseline on Gale surface: ~210 uGy/day in silicon, ~205 uGy/day in plastic (Hassler et al., Science 2014)."
            ]
        },
        "statistics": {
            "detector_b_silicon": stats_b,
            "detector_e_plastic": stats_e,
        },
        "observations": observations
    }

    return result


def main():
    txt_path = os.path.join(RAW_DIR, TXT_FILENAME)
    lbl_path = os.path.join(RAW_DIR, LBL_FILENAME)

    if not os.path.exists(txt_path) or not os.path.exists(lbl_path):
        print(f"[ERROR] Source files missing in {RAW_DIR}. Run download_rad_sol100.py first.", file=sys.stderr)
        return 1

    print(f"Parsing RAD RDR from {txt_path}...")
    dataset = parse_rad_rdr(txt_path, lbl_path)

    os.makedirs(OUT_DIR, exist_ok=True)
    out_path = os.path.join(OUT_DIR, "rad_sol_00100.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2)

    print(f"[SUCCESS] Wrote {out_path} ({os.path.getsize(out_path)} bytes).")
    print(f"  Total observations: {dataset['metadata']['total_observations']}")
    print(f"  Detector B Mean: {dataset['statistics']['detector_b_silicon']['mean_microgray_per_day']} uGy/day")
    print(f"  Detector E Mean: {dataset['statistics']['detector_e_plastic']['mean_microgray_per_day']} uGy/day")
    return 0


if __name__ == "__main__":
    sys.exit(main())
