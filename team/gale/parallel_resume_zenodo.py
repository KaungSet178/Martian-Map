import os
import sys
import hashlib
from pathlib import Path
import urllib.request
import concurrent.futures

URL = "https://zenodo.org/records/5808354/files/hrsc_km09_h1938_h1927_h1916-dtm-mosaic.tif"
TOTAL_SIZE = 311785221
EXPECTED_MD5 = "1d714f2142a56e962d50d985b7088b13"
DEST = Path("output/g4/raw/hrsc_km09_h1938_h1927_h1916-dtm-mosaic.tif")

current_size = DEST.stat().st_size if DEST.exists() else 0
print(f"Current file size: {current_size} / {TOTAL_SIZE} bytes ({current_size/TOTAL_SIZE*100:.1f}%)")

if current_size == TOTAL_SIZE:
    h = hashlib.md5(DEST.read_bytes()).hexdigest()
    if h == EXPECTED_MD5:
        print("File already complete and MD5 verified!")
        sys.exit(0)

# We need bytes from current_size to TOTAL_SIZE - 1
remaining = TOTAL_SIZE - current_size
num_chunks = 10
chunk_size = (remaining + num_chunks - 1) // num_chunks

chunks = []
for i in range(num_chunks):
    start = current_size + i * chunk_size
    end = min(TOTAL_SIZE - 1, start + chunk_size - 1)
    if start <= end:
        chunks.append((i, start, end))

print(f"Split {remaining} bytes into {len(chunks)} chunks of ~{chunk_size/1024/1024:.2f} MB each.")

def fetch_chunk(item):
    idx, start, end = item
    req = urllib.request.Request(URL, headers={"Range": f"bytes={start}-{end}"})
    print(f"Starting chunk {idx}: {start}-{end} ({end - start + 1} bytes)...")
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = resp.read()
                if len(data) == (end - start + 1):
                    print(f"Finished chunk {idx} ({len(data)} bytes)")
                    return idx, data
                print(f"Chunk {idx} partial read ({len(data)} != {end - start + 1}), retrying...")
        except Exception as e:
            print(f"Chunk {idx} error ({e}), attempt {attempt+1}/5...")
    raise RuntimeError(f"Failed to download chunk {idx}")

chunk_data = {}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    futures = [pool.submit(fetch_chunk, c) for c in chunks]
    for fut in concurrent.futures.as_completed(futures):
        idx, data = fut.result()
        chunk_data[idx] = data

print("All chunks downloaded. Appending to destination file...")
with open(DEST, "ab") as f:
    for i in range(len(chunks)):
        f.write(chunk_data[i])

new_size = DEST.stat().st_size
print(f"New file size: {new_size} bytes")
assert new_size == TOTAL_SIZE, f"Size mismatch: {new_size} != {TOTAL_SIZE}"

print("Verifying MD5 checksum...")
hasher = hashlib.md5()
with open(DEST, "rb") as f:
    while chunk := f.read(1024*1024*8):
        hasher.update(chunk)
digest = hasher.hexdigest()
print(f"Computed MD5: {digest}")
assert digest == EXPECTED_MD5, f"MD5 mismatch: {digest} != {EXPECTED_MD5}"
print("HRSC 30m DTM Mosaic fully downloaded and verified successfully!")
