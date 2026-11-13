"""Bounded, fail-closed USGS TIFF audit. No application assets are written.

python scripts/gale-basemap/audit.py --download
Cached reproduction needs no network. A shared 64 MiB budget applies to raster
range reads; a server ignoring Range is rejected before its body is consumed.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from io import BytesIO
import json
import math
from pathlib import Path
import re
import struct
import threading
import zlib

import numpy as np
from PIL import Image
import pyproj
import rasterio
from rasterio.io import MemoryFile
import requests

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output/gale-basemap"
RADIUS = 3396190.0
URLS = {
    "grayscale": "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/MSL_Gale_Orthophoto_Mosaic_25cm_v3.tif",
    "color": "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif",
}


class Budget:
    def __init__(self, limit=64 * 1024**2):
        self.limit, self.used = limit, 0

    def charge(self, size):
        if size < 1 or self.used + size > self.limit:
            raise ValueError("Raster byte budget exceeded; refusing source download")
        self.used += size


def validate_response(response, start, length, total=None, etag=None):
    """Validate before reading a streamed response, including exact total/version."""
    match = re.fullmatch(r"bytes (\d+)-(\d+)/(\d+)", response.headers.get("Content-Range", ""))
    if response.status_code != 206 or not match:
        raise ValueError("Server did not honor bounded Range")
    first, last, size = map(int, match.groups())
    if (first, last) != (start, start + length - 1) or (total is not None and size != total):
        raise ValueError("Unexpected Content-Range")
    if response.headers.get("Content-Encoding", "identity") != "identity":
        raise ValueError("Encoded range response")
    if etag is not None and response.headers.get("ETag") != etag:
        raise ValueError("Source version changed")
    return size


class Ranges:
    def __init__(self, name, download, budget):
        self.name, self.url = name, URLS[name]
        self.download, self.budget = download, budget
        self.directory = OUT / "ranges" / name
        self.directory.mkdir(parents=True, exist_ok=True)
        self.index_path = self.directory / "index.json"
        self.index = json.loads(self.index_path.read_text()) if self.index_path.exists() else {}
        snapshot = ROOT / "team/gale/sources/g5/audit.json"
        self.pinned = json.loads(snapshot.read_text())["sources"][name] if snapshot.exists() else None
        self.expected = {f'{r["start"]}-{r["length"]}': r for r in self.pinned["range_receipts"]} if self.pinned else {}
        if self.index and self.index["url"] != self.url:
            raise ValueError("Cached source URL changed")
        if self.index and self.pinned and any(self.index[k] != self.pinned["http"][k] for k in ("etag", "total")):
            raise ValueError("Cached source identity differs from reviewed snapshot")
        self.segments = []
        self.receipts = []
        self.session = requests.Session()

    def read(self, start, length):
        start, length = int(start), int(length)
        if start < 0 or length < 1:
            raise ValueError("Invalid byte range")
        for offset, data in self.segments:
            if offset <= start and start + length <= offset + len(data):
                return data[start-offset:start-offset+length]
        self.budget.charge(length)
        key = f"{start}-{length}"
        path = self.directory / (key + ".bin")
        record = self.index.get("ranges", {}).get(key, self.expected.get(key))
        if record is not None and path.exists():
            data = path.read_bytes()
            if len(data) != length or sha256(data).hexdigest() != record["sha256"]:
                raise ValueError("Cached bytes changed")
        else:
            if not self.download:
                raise ValueError(f"Missing range {self.name}/{key}; use --download")
            headers = {"Range": f"bytes={start}-{start+length-1}", "Accept-Encoding": "identity"}
            identity = self.index or (self.pinned["http"] if self.pinned else {})
            if identity:
                headers["If-Match"] = identity["etag"]
            with self.session.get(self.url, headers=headers, stream=True, timeout=45) as response:
                size = validate_response(response, start, length, identity.get("total"), identity.get("etag"))
                data = response.raw.read(length + 1)
                if len(data) != length:
                    raise ValueError("Truncated or oversized response")
                if not self.index:
                    self.index = {"url": self.url, "total": size, "etag": response.headers.get("ETag"),
                                  "last_modified": response.headers.get("Last-Modified"),
                                  "version_id": response.headers.get("x-amz-version-id"), "ranges": {}}
            record = {"start": start, "length": length, "sha256": sha256(data).hexdigest()}
            path.write_bytes(data)
            self.index["ranges"][key] = record
            self.index_path.write_text(json.dumps(self.index, indent=2) + "\n")
        expected = self.expected.get(key)
        if expected and sha256(data).hexdigest() != expected["sha256"]:
            raise ValueError("Range bytes differ from reviewed snapshot")
        self.receipts.append(record)
        self.segments.append((start, data))
        return data

    def read_many(self, ranges):
        """Parallel tiny mask ranges; serialize cache/index writes in main thread.

        COG masks are interleaved with JPEG tiles: one enclosing read would
        transfer 770 MB. Exact mask-only requests transfer under 1 MB instead.
        """
        workers = threading.local()
        def fetch(item):
            start, length = item
            key = f"{start}-{length}"
            path = self.directory / (key + ".bin")
            record = self.index["ranges"].get(key, self.expected.get(key))
            if record is not None and path.exists():
                data = path.read_bytes()
                if len(data) != length or sha256(data).hexdigest() != record["sha256"]:
                    raise ValueError("Cached mask bytes changed")
            else:
                if not self.download:
                    raise ValueError(f"Missing mask range {key}; use --download")
                headers = {"Range": f"bytes={start}-{start+length-1}", "Accept-Encoding": "identity",
                           "If-Match": self.index["etag"]}
                if not hasattr(workers, "session"):
                    workers.session = requests.Session()
                with workers.session.get(self.url, headers=headers, stream=True, timeout=45) as response:
                    validate_response(response, start, length, self.index["total"], self.index["etag"])
                    # Read exactly the validated range so urllib3 can reuse TLS.
                    # Content-Length is validated separately; no full-body read.
                    if int(response.headers.get("Content-Length", "-1")) != length:
                        raise ValueError("Unexpected mask Content-Length")
                    data = response.raw.read(length)
                if len(data) != length:
                    raise ValueError("Unexpected mask range length")
                record = {"start": start, "length": length, "sha256": sha256(data).hexdigest()}
                path.write_bytes(data)
            expected = self.expected.get(key)
            if expected and sha256(data).hexdigest() != expected["sha256"]:
                raise ValueError("Native mask bytes differ from reviewed snapshot")
            return key, record, data
        for _, length in ranges:
            self.budget.charge(length)
        result = {}
        try:
            with ThreadPoolExecutor(max_workers=32) as pool:
                for index, (key, record, data) in enumerate(pool.map(fetch, ranges)):
                    self.index["ranges"][key] = record
                    self.receipts.append(record)
                    result[record["start"]] = data
                    if index % 256 == 0:
                        self.index_path.write_text(json.dumps(self.index, indent=2) + "\n")
                        print(f"{self.name}: {index+1}/{len(ranges)} native mask blocks", flush=True)
        finally:
            self.index_path.write_text(json.dumps(self.index, indent=2) + "\n")
        return result


class Tiff:
    """Read only TIFF directory bytes; never ask a library to read the whole URL."""
    TYPES = {1: ("B", 1), 2: ("s", 1), 3: ("H", 2), 4: ("I", 4),
             5: (None, 8), 7: ("B", 1), 12: ("d", 8), 16: ("Q", 8), 18: ("Q", 8)}

    def __init__(self, source):
        self.source = source
        header = source.read(0, 16384)
        if header[:2] not in (b"II", b"MM"):
            raise ValueError("Not a TIFF")
        self.order = "<" if header[:2] == b"II" else ">"
        version = struct.unpack(self.order + "H", header[2:4])[0]
        if version not in (42, 43):
            raise ValueError("Unknown TIFF version")
        self.big = version == 43
        self.width = 8 if self.big else 4
        if self.big and struct.unpack(self.order + "HH", header[4:8]) != (8, 0):
            raise ValueError("Unsupported BigTIFF offset size")
        offset = self.integer(header[8:16] if self.big else header[4:8])
        self.ifds = []
        seen = set()
        while offset:
            if offset in seen or len(seen) >= 32:
                raise ValueError("Cyclic or excessive IFD chain")
            seen.add(offset)
            tags, offset = self.directory(offset)
            self.ifds.append(tags)

    def integer(self, data):
        return int.from_bytes(data, "little" if self.order == "<" else "big")

    def directory(self, offset):
        count_size, entry_size = (8, 20) if self.big else (2, 12)
        count = self.integer(self.source.read(offset, count_size))
        if count > 1024:
            raise ValueError("Unexpected IFD length")
        entries = self.source.read(offset + count_size, count * entry_size + self.width)
        tags = {}
        for index in range(count):
            entry = entries[index*entry_size:(index+1)*entry_size]
            tag, kind = struct.unpack(self.order + "HH", entry[:4])
            n = self.integer(entry[4:12] if self.big else entry[4:8])
            if kind not in self.TYPES:
                raise ValueError(f"Unsupported TIFF tag type {kind}")
            fmt, size = self.TYPES[kind]
            length = n * size
            if length > 8 * 1024**2:
                raise ValueError("Excessive TIFF metadata payload")
            value = entry[12:20] if self.big else entry[8:12]
            raw = value[:length] if length <= self.width else self.source.read(self.integer(value), length)
            if kind == 2:
                values = raw.rstrip(b"\0").decode("utf-8", errors="replace")
            elif fmt is None:
                values = list(raw)
            else:
                values = list(struct.unpack(self.order + str(n) + fmt, raw))
            tags[tag] = values
        if 330 in tags:
            raise ValueError("SubIFDs need explicit implementation; refusing silent omission")
        return tags, self.integer(entries[count*entry_size:])

    def metadata(self):
        # Materialize only directory/header bytes in memory. Pixel payload offsets
        # remain absent. GDAL parses the actual GeoKeys, not a fabricated CRS.
        length = max(offset + len(data) for offset, data in self.source.segments)
        if length > 16 * 1024**2:
            raise ValueError("Metadata too dispersed for bounded header inspection")
        header = bytearray(length)
        for offset, data in self.source.segments:
            header[offset:offset+len(data)] = data
        with MemoryFile(bytes(header)) as memory, memory.open() as ds:
            result = {"width": ds.width, "height": ds.height, "bands": ds.count,
                      "dtype": ds.dtypes, "transform": list(ds.transform)[:6],
                      "crs_wkt": ds.crs.to_wkt(), "bounds_m": list(ds.bounds),
                      "block_shapes": ds.block_shapes, "nodata": ds.nodata,
                      "mask_flags": [[f.name for f in flags] for flags in ds.mask_flag_enums],
                      "overviews": ds.overviews(1), "tags": ds.tags(),
                      "image_structure": ds.tags(ns="IMAGE_STRUCTURE")}
        result["ifds"] = [{"width": t[256][0], "height": t[257][0],
                           "subfile_type": t.get(254, [0])[0], "compression": t.get(259, [1])[0],
                           "bits": t.get(258), "photometric": t.get(262)} for t in self.ifds]
        result["coordinate_check"] = check_crs(result["crs_wkt"])
        return result


def check_crs(wkt):
    crs = pyproj.CRS.from_wkt(wkt)
    params = crs.to_dict()
    expected = {"proj": "eqc", "lat_ts": 0, "lat_0": 0, "lon_0": 0, "x_0": 0, "y_0": 0}
    if any(params.get(k) != v for k, v in expected.items()):
        raise ValueError(f"Unreviewed source projection: {params}")
    if crs.ellipsoid.semi_major_metre != RADIUS or crs.ellipsoid.semi_minor_metre != RADIUS:
        raise ValueError("Unreviewed planetary reference surface")
    if crs.prime_meridian.longitude != 0 or params.get("units") != "m":
        raise ValueError("Unreviewed meridian or units")
    transformer = pyproj.Transformer.from_crs(crs.geodetic_crs, crs, always_xy=True)
    points = [(137.35, -4.59), (137.4, -4.7), (137.45, -4.82)]
    errors = [max(abs(x-RADIUS*math.radians(lon)), abs(y-RADIUS*math.radians(lat)))
              for lon, lat in points for x, y in [transformer.transform(lon, lat)]]
    return {"proj_parameters": params, "max_analytical_proj_residual_m": max(errors),
            "latitude_note": "Declared sphere: planetocentric and geodetic latitude coincide; no oblate conversion.",
            "longitude_note": "East-positive input in 0..360; no wrap occurs in this Gale AOI."}


def fractional_window(transform, bounds):
    a, b, c, d, e, f = transform
    if a <= 0 or e >= 0 or b != 0 or d != 0:
        raise ValueError("Expected north-up source-specific affine")
    west, south, east, north = bounds
    return [(RADIUS*math.radians(west)-c)/a, (f-RADIUS*math.radians(north))/-e,
            (RADIUS*math.radians(east)-c)/a, (f-RADIUS*math.radians(south))/-e]


def valid_area(mask, x, y, window):
    """Exact fractional native-pixel area overlap; mask is boolean, not DN>0."""
    x0, y0, x1, y1 = window
    wx = np.maximum(0, np.minimum(np.arange(mask.shape[1])+x+1, x1)-np.maximum(np.arange(mask.shape[1])+x, x0))
    wy = np.maximum(0, np.minimum(np.arange(mask.shape[0])+y+1, y1)-np.maximum(np.arange(mask.shape[0])+y, y0))
    return float(wy @ mask.astype(float) @ wx)


def color_coverage(tiff, metadata, bounds):
    masks = [t for t in tiff.ifds if t.get(254, [0])[0] == 4]
    if len(masks) != 1:
        raise ValueError("Expected one full-resolution internal mask")
    t = masks[0]
    if t[258] != [1] or t[259] != [8] or t[262] != [4]:
        raise ValueError("Unreviewed internal mask encoding")
    width, height = t[256][0], t[257][0]
    if (width, height) != (metadata["width"], metadata["height"]):
        raise ValueError("Mask and image dimensions differ")
    tw, th = t[322][0], t[323][0]
    offsets, counts = t[324], t[325]
    # Native masks are interleaved with JPEG payloads. Fetch ONLY masks.
    start, end = min(offsets), max(o+n for o, n in zip(offsets, counts))
    window = fractional_window(metadata["transform"], bounds)
    total = (window[2]-window[0])*(window[3]-window[1])
    valid = 0.0
    columns = math.ceil(width/tw)
    ranges = [(o, n) for i, (o, n) in enumerate(zip(offsets, counts))
              if (i % columns)*tw < window[2] and (i % columns+1)*tw > window[0]
              and (i // columns)*th < window[3] and (i // columns+1)*th > window[1]]
    payloads = tiff.source.read_many(ranges)
    for i, (offset, count) in enumerate(zip(offsets, counts)):
        x, y = (i % columns)*tw, (i // columns)*th
        if x >= window[2] or x+tw <= window[0] or y >= window[3] or y+th <= window[1]:
            continue
        decoded = zlib.decompress(payloads[offset])
        if len(decoded) != math.ceil(tw/8)*th:
            raise ValueError("Unexpected native mask block size")
        mask = np.unpackbits(np.frombuffer(decoded, dtype=np.uint8)).reshape(th, math.ceil(tw/8)*8)[:, :tw]
        mask = mask[:min(th, height-y), :min(tw, width-x)]
        valid += valid_area(mask, x, y, window)
    return {"method": "all intersecting native 0.25 m internal-mask pixels; fractional pixel-edge overlap",
            "area_metric": "native projected area (not spherical ground area)",
            "valid_projected_area_m2": valid * abs(metadata["transform"][0]*metadata["transform"][4]),
            "overview_projected_area_m2": total * abs(metadata["transform"][0]*metadata["transform"][4]),
            "valid_percent": 100*valid/total, "fallback_percent": 100*(1-valid/total),
            "mask_payload_span_bytes": end-start, "window_native_pixel_edges": window,
            "native_mask_requests": len(ranges), "native_mask_bytes": sum(n for _, n in ranges),
            "registration_status": "unverified; valid coverage does not establish alignment"}


def ctx_coverage(bounds):
    """Integrate existing finest XYZ alpha over spherical angular area.

    Transparent clipping at pixel centers may leave fractional edge slivers.
    These are measured, not silently counted as fully covered.
    """
    west, south, east, north = bounds
    z, size = 13, 256
    scale = size * 2**z
    total = math.radians(east-west)*(math.sin(math.radians(north))-math.sin(math.radians(south)))
    covered = 0.0
    hashes = {}
    for path in sorted((ROOT / "public/maps/gale/ctx-tiles/13").glob("*/*.png")):
        x, y = int(path.parent.name), int(path.stem)
        hashes[str(path.relative_to(ROOT)).replace("\\", "/")] = sha256(path.read_bytes()).hexdigest()
        alpha = np.asarray(Image.open(BytesIO(path.read_bytes())).convert("RGBA"))[..., 3]
        if not np.isin(alpha, [0, 255]).all():
            raise ValueError("Partial alpha requires an explicit coverage policy")
        lons = (x*size + np.arange(size+1))/scale*360-180
        lats = np.degrees(np.arctan(np.sinh(math.pi*(1-2*(y*size+np.arange(size+1))/scale))))
        wx = np.radians(np.maximum(0, np.minimum(lons[1:], east)-np.maximum(lons[:-1], west)))
        top, bottom = np.minimum(lats[:-1], north), np.maximum(lats[1:], south)
        wy = np.where(top > bottom, np.sin(np.radians(top))-np.sin(np.radians(bottom)), 0)
        covered += float(wy @ (alpha > 0).astype(float) @ wx)
    if not hashes:
        raise ValueError("Missing preserved CTX tiles")
    return {"method": "all committed z13 alpha pixels, exact spherical area intersection with overview",
            "valid_percent": 100*covered/total, "overview_spherical_area_m2": total*RADIUS**2,
            "tile_sha256": hashes, "upstream_native_validity": "not inferred from display alpha"}


def extract_gray_window(source, tiff, metadata, window):
    """Direct row subranges avoid GDAL fetching full 180,000-byte strips.

    This strategy is specific to the verified uncompressed 8-bit, one-row-strip
    BigTIFF. It refuses other layouts rather than assuming their byte mapping.
    """
    col, row, width, height = window
    t = tiff.ifds[0]
    if t[259] != [1] or t[258] != [8] or t.get(277, [1]) != [1] or t[278] != [1]:
        raise ValueError("Direct subrow extraction requires the reviewed grayscale layout")
    if min(col, row) < 0 or min(width, height) < 1 or col+width > metadata["width"] or row+height > metadata["height"]:
        raise ValueError("Native window outside source")
    if any(n != metadata["width"] for n in t[279][row:row+height]):
        raise ValueError("Unexpected uncompressed strip size")
    ranges = [(offset+col, width) for offset in t[273][row:row+height]]
    chunks = source.read_many(ranges)
    values = np.stack([np.frombuffer(chunks[offset], dtype=np.uint8) for offset, _ in ranges])
    transform = rasterio.Affine(*metadata["transform"]) @ rasterio.Affine.translation(col, row)
    path = OUT / "grayscale-native-window.tif"
    with rasterio.open(path, "w", driver="GTiff", width=width, height=height, count=1,
                       dtype="uint8", crs=metadata["crs_wkt"], transform=transform,
                       nodata=metadata["nodata"], compress="deflate") as ds:
        ds.write(values, 1)
    return {"window_col_row_width_height": window, "source_bytes": width*height,
            "output": str(path.relative_to(ROOT)).replace("\\", "/"),
            "sha256": sha256(path.read_bytes()).hexdigest(),
            "valid_native_pixels": int(np.count_nonzero(values != metadata["nodata"])),
            "total_native_pixels": width*height,
            "note": "Native unmodified DN; research subset only, not overview coverage or registration evidence."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true")
    parser.add_argument("--gray-window", type=int, nargs=4, metavar=("COL", "ROW", "WIDTH", "HEIGHT"),
                        help="Optional exact native grayscale subrow extraction, within the same byte budget")
    args = parser.parse_args()
    # Read exact current bounds from configuration; do not redefine the map.
    config = (ROOT / "regions/gale/config.ts").read_text(encoding="utf-8")
    def field(name):
        return float(re.search(r'"' + name + r'":\s*(-?[\d.]+)', config).group(1))
    bounds = [field("west_east"), field("south_latitude"), field("east_east"), field("north_latitude")]
    budget = Budget()
    report = {"status": "preparation_only_not_a_completed_basemap_upgrade", "bounds_wsen": bounds,
              "software": {"rasterio": rasterio.__version__, "gdal": rasterio.__gdal_version__,
                           "pyproj": pyproj.__version__, "proj": pyproj.proj_version_str}, "sources": {}}
    for name in URLS:
        source = Ranges(name, args.download, budget)
        tiff = Tiff(source)
        metadata = tiff.metadata()
        if name == "color":
            metadata["coverage"] = color_coverage(tiff, metadata, bounds)
        else:
            metadata["coverage"] = {"valid_percent": None, "status": "unmeasured",
                                    "reason": "No overview or separate mask; requires native DN reads across about 57320 AOI rows. Do not substitute bounding-box overlap."}
            if args.gray_window:
                metadata["research_subset"] = extract_gray_window(source, tiff, metadata, args.gray_window)
        metadata["http"] = {k: v for k, v in source.index.items() if k != "ranges"}
        metadata["range_receipts"] = source.receipts
        report["sources"][name] = metadata
    report["ctx"] = ctx_coverage(bounds)
    report["raster_bytes_read_or_replayed"] = budget.used
    report["raster_byte_budget"] = budget.limit
    report["application_tiles_generated"] = 0
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "audit.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"report": str(OUT / "audit.json"), "raster_bytes": budget.used,
                      "color_coverage": report["sources"]["color"]["coverage"],
                      "ctx_valid_percent": report["ctx"]["valid_percent"]}, indent=2))


if __name__ == "__main__":
    main()
