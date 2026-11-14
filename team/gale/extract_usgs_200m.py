"""Extract bounded Gale Crater window from USGS HRSC-MOLA 200m Global DEM via HTTP range requests.
Avoids downloading the full 11.4 GB global raster while preserving original pixels and metadata.
"""
from pathlib import Path
import time
import numpy as np
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import rasterio
from rasterio.transform import from_origin
from rasterio.crs import CRS
import concurrent.futures

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "output/g4/raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)
OUT_TIF = RAW_DIR / "usgs_hrsc_mola_200m_gale.tif"

URL = "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/HRSC_MOLA_Blend/Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif"

# Global raster parameters from audited BigTIFF header
WIDTH = 106694
HEIGHT = 53347
PIXEL_SIZE = 360.0 / WIDTH # 0.003374135377818809 deg
ORIGIN_LON = -180.0
ORIGIN_LAT = 90.0
DATA_OFFSET = 854272
BYTES_PER_ROW = WIDTH * 2

# Gale exploration bounds: 137.344235..137.457943 E, -4.822361..-4.580605 N
# Add generous buffer: 137.1 to 137.7 E, -5.1 to -4.3 N
WEST, SOUTH, EAST, NORTH = 137.1, -5.1, 137.7, -4.3

col_start = int(np.floor((WEST - ORIGIN_LON) / PIXEL_SIZE))
col_end = int(np.ceil((EAST - ORIGIN_LON) / PIXEL_SIZE))
row_start = int(np.floor((ORIGIN_LAT - NORTH) / PIXEL_SIZE))
row_end = int(np.ceil((ORIGIN_LAT - SOUTH) / PIXEL_SIZE))

win_width = col_end - col_start
win_height = row_end - row_start

print(f"Gale window: cols {col_start}..{col_end} ({win_width} cols), rows {row_start}..{row_end} ({win_height} rows)")
print(f"Bounding coords: Lon [{ORIGIN_LON + col_start*PIXEL_SIZE:.6f}, {ORIGIN_LON + col_end*PIXEL_SIZE:.6f}], Lat [{ORIGIN_LAT - row_end*PIXEL_SIZE:.6f}, {ORIGIN_LAT - row_start*PIXEL_SIZE:.6f}]")

def create_session():
    session = requests.Session()
    retries = Retry(total=5, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
    adapter = HTTPAdapter(max_retries=retries, pool_connections=8, pool_maxsize=8)
    session.mount("https://", adapter)
    return session

def main():
    if OUT_TIF.exists() and OUT_TIF.stat().st_size > 50000:
        print(f"Already extracted: {OUT_TIF}")
        with rasterio.open(OUT_TIF) as src:
            print("Profile:", src.profile)
            arr = src.read(1)
            print(f"Shape: {arr.shape}, Min: {arr.min()}, Max: {arr.max()}, NoData: {src.nodata}")
        return

    print(f"Fetching {win_height} row segments with persistent requests session...")
    data_grid = np.empty((win_height, win_width), dtype="<i2")
    session = create_session()

    # To be extremely efficient and avoid connection churn, let's fetch in batches or sequentially with keepalive
    completed = 0
    t0 = time.time()
    for r in range(row_start, row_end):
        row_offset = DATA_OFFSET + r * BYTES_PER_ROW
        seg_start = row_offset + col_start * 2
        seg_end = row_offset + col_end * 2 - 1
        headers = {"Range": f"bytes={seg_start}-{seg_end}"}
        resp = session.get(URL, headers=headers, timeout=20)
        resp.raise_for_status()
        raw_bytes = resp.content
        data_grid[r - row_start, :] = np.frombuffer(raw_bytes, dtype="<i2")
        completed += 1
        if completed % 40 == 0 or completed == win_height:
            print(f"Fetched {completed}/{win_height} rows ({time.time() - t0:.1f}s)")

    print(f"All data fetched in {time.time() - t0:.1f}s. Array shape: {data_grid.shape}, Min: {data_grid.min()} m, Max: {data_grid.max()} m")

    usgs_crs = CRS.from_string("GEOGCS[\"GCS_Mars_2000_Sphere\",DATUM[\"D_Mars_2000_Sphere\",SPHEROID[\"Mars_2000_Sphere_IAU_IAG\",3396190.0,0.0]],PRIMEM[\"Reference_Meridian\",0.0],UNIT[\"Degree\",0.0174532925199433]]")

    transform = from_origin(
        ORIGIN_LON + col_start * PIXEL_SIZE,
        ORIGIN_LAT - row_start * PIXEL_SIZE,
        PIXEL_SIZE,
        PIXEL_SIZE
    )

    profile = {
        "driver": "GTiff",
        "height": win_height,
        "width": win_width,
        "count": 1,
        "dtype": "int16",
        "crs": usgs_crs,
        "transform": transform,
        "nodata": -32768,
        "compress": "lzw"
    }

    with rasterio.open(OUT_TIF, "w", **profile) as dst:
        dst.write(data_grid, 1)

    print(f"Successfully saved {OUT_TIF} ({OUT_TIF.stat().st_size} bytes)")

if __name__ == "__main__":
    main()
