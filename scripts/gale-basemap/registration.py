"""Unshifted spatial comparisons, deliberately NOT a registration solution."""
from hashlib import sha256
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
import rasterio

import audit
import color_tiles as tiles

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / "team/gale/sources/g5-phase2"


def correlation(a, b, valid):
    a, b = a[valid].astype(float), b[valid].astype(float)
    if len(a) < 16 or min(np.std(a), np.std(b)) < 1e-9:
        return None
    return float(np.corrcoef(a, b)[0, 1])


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    panels = Image.new("RGB", (768, 6*284), "#101b2a")
    draw = ImageDraw.Draw(panels)
    samples = []
    # Preselected distributed windows; no fitted image translation at any point.
    locations = [(7221, 4200), (7222, 4201), (7223, 4202), (7221, 4203), (7222, 4204), (7223, 4205)]
    for i, (x, y) in enumerate(locations):
        paths = [ROOT / f"public/maps/gale/ctx-tiles/13/{x}/{y}.png", tiles.DEST / f"13/{x}/{y}.webp"]
        ctx, color = [np.array(Image.open(p).convert("RGBA")) for p in paths]
        valid = (ctx[..., 3] == 255) & (color[..., 3] == 255)
        gray = color[..., :3].mean(axis=2)
        lon, lat = tiles.tile_edges(13, x, y)
        record = {"id": f"window-{i+1}", "split": "held_out" if i >= 4 else "exploratory",
                  "tile_xyz": [13, x, y], "center_lon_lat": [float(lon[128]), float(lat[128])],
                  "valid_comparison_pixels": int(valid.sum()),
                  "zero_shift_brightness_correlation": correlation(ctx[..., 0], gray, valid),
                  "input_sha256": [sha256(p.read_bytes()).hexdigest() for p in paths],
                  "accepted_independent_feature_controls": 0,
                  "residual_m": None,
                  "interpretation": "Diagnostic window, not a photographed-feature control. Photometry, native support and local lineage differ; no registration accuracy follows from this coefficient."}
        samples.append(record)
        panels.paste(Image.fromarray(ctx).convert("RGB"), (0, i*284+28))
        panels.paste(Image.fromarray(color).convert("RGB"), (256, i*284+28))
        panels.paste(Image.fromarray(np.repeat(gray[..., None], 3, axis=2).astype(np.uint8)), (512, i*284+28))
        draw.text((8, i*284+6), f"{record['id']} {record['split']} | CTX / processed color / mean RGB | NO FIT", fill="white")
    panels.save(DEST / "distributed-comparisons.webp", lossless=True)
    rgb, mask, transform, _, _ = tiles.load_overview()
    gray_path = ROOT / "output/gale-basemap/grayscale-native-window.tif"
    if not gray_path.exists():
        # Reuse exactly the Phase 1 pinned extraction; no grayscale network reads.
        source = audit.Ranges("grayscale", False, audit.Budget())
        tiff = audit.Tiff(source)
        audit.extract_gray_window(source, tiff, tiff.metadata(), [72000, 154000, 128, 128])
    with rasterio.open(gray_path) as ds:
        gray = ds.read(1)
        # Average native grayscale cells onto 2 m (8x8 native-pixel) support.
        gray_2m = gray.reshape(16, 8, 16, 8).mean(axis=(1, 3))
        gt = ds.transform
        east_edges = gt.c + np.arange(17)*2
        north_edges = gt.f - np.arange(17)*2
        columns = (east_edges-transform[2])/transform[0]
        rows = (north_edges-transform[5])/transform[4]
        x0, x1 = int(np.floor(columns[0])), int(np.ceil(columns[-1]))
        y0, y1 = int(np.floor(rows[0])), int(np.ceil(rows[-1]))
        color = tiles.resample(rgb[y0:y1, x0:x1], mask[y0:y1, x0:x1], columns-x0, rows-y0)
        gray_comparison = {"native_window": [72000, 154000, 128, 128], "size_m": [32, 32],
                           "native_sha256": sha256(gray_path.read_bytes()).hexdigest(),
                           "matched_support_m": 2, "zero_shift_brightness_correlation": correlation(gray_2m, color[..., :3].mean(axis=2), color[..., 3] == 255),
                           "accepted_feature_controls": 0, "residual_m": None,
                           "limitation": "A 32 m patch is insufficient for distributed stable landform controls. Color shares grayscale ancestry and is not independent absolute control."}
        pair = Image.new("RGB", (256, 128))
        pair.paste(Image.fromarray(np.uint8(gray_2m)).convert("RGB").resize((128, 128), Image.Resampling.NEAREST), (0, 0))
        pair.paste(Image.fromarray(color).convert("RGB").resize((128, 128), Image.Resampling.NEAREST), (128, 0))
        pair.save(DEST / "gray-color-research-patch.png")
    report = {"classification": "Georeferenced but alignment unverified",
              "method": "Source-specific coordinates; unshifted same-XYZ windows at comparable display spacing; source-overview area averages. Exploratory and held-out windows preselected; no optimization.",
              "source_lineage": "Published color strips manually tied, blended and fused to mission RED orthophoto; grayscale HRSC/MOLA -> CTX -> HiRISE lineage. Exact Trek mosaic control chain not established.",
              "published_base_control_context_m_approx": 100,
              "base_control_is_local_accuracy_bound": False,
              "independent_control_points": [], "positional_residual_rmse_m": None, "positional_uncertainty_m": None,
              "correction_applied": False, "ctx_color_windows": samples, "grayscale_color": gray_comparison,
              "visual_review": "Same-coordinate panels show unresolved landform/photometric differences, notably the northern crater field and southern ridge/channel margins. These differences are not resolved by the high correlation in the tiny grayscale patch. A cause or global correction cannot be assigned from these windows.",
              "decision": "Optional provisional comparison only, with persistent alignment warning. No survey-grade display validation, source shifts, terrain sampling or safety inference.",
              "remaining_validation": "Identify and independently check spatially distributed stable photographed landforms; reserve held-out controls; characterize photometric/support differences; measure residuals and uncertainty without cosmetic warping."}
    (DEST / "registration.json").write_text(json.dumps(report, indent=2)+"\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
