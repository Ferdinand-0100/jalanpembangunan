#!/usr/bin/env python3
"""
Preprocess the Jezero CTX DEM (Dataset 1) and CTX orthomosaic (Dataset 2) for the web viewer.

Original files are only READ, never modified. Outputs go to web/data/:
  terrain.f32.bin   float32 little-endian heightmap, row-major, north row first (metres)
  texture.jpg       8-bit grayscale orthoimage resampled to the exact same ground extent
  nodata.bin        packed bit-mask (1 = DEM cell had no data and was filled for rendering)
  metadata.json     extent, CRS parameters, resolution, elevation stats, attribution, transformations

No terrain is invented: every elevation value is a (block-averaged) NASA/USGS DEM value, except the
few NoData cells which are filled by inverse-distance interpolation and flagged in nodata.bin.
"""
import argparse, hashlib, json, math, os, warnings
import numpy as np, rasterio
from rasterio.windows import Window, from_bounds
from rasterio.enums import Resampling
from rasterio.fill import fillnodata
from PIL import Image

MARS_RADIUS_M = 3396190.0

def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 24), b""):
            h.update(chunk)
    return h.hexdigest()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dem", required=True)
    ap.add_argument("--ortho", required=True)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "web", "data"))
    ap.add_argument("--dem-factor", type=int, default=2, help="block-average factor (2 -> 40 m cells)")
    ap.add_argument("--tex-width", type=int, default=4096, help="texture width in px (8192 for more detail)")
    ap.add_argument("--jpeg-quality", type=int, default=92)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    f = a.dem_factor

    with rasterio.open(a.dem) as d, rasterio.open(a.ortho) as o:
        for name, ds in (("DEM", d), ("ortho", o)):
            assert "18.4663" in ds.crs.to_wkt() and "Equirectangular" in ds.crs.to_wkt(), f"{name}: unexpected CRS"
        res = d.res[0]
        # --- common ground extent, snapped to the DEM grid and to a multiple of the block factor
        L = max(d.bounds.left, o.bounds.left);  Rr = min(d.bounds.right, o.bounds.right)
        B = max(d.bounds.bottom, o.bounds.bottom); T = min(d.bounds.top, o.bounds.top)
        c0 = math.ceil((L - d.bounds.left) / res - 1e-6); c1 = math.floor((Rr - d.bounds.left) / res + 1e-6)
        r0 = math.ceil((d.bounds.top - T) / res - 1e-6);  r1 = math.floor((d.bounds.top - B) / res + 1e-6)
        w = (c1 - c0) // f * f; h = (r1 - r0) // f * f
        left = d.bounds.left + c0 * res; top = d.bounds.top - r0 * res
        right = left + w * res; bottom = top - h * res
        print(f"common extent X {left}..{right}  Y {bottom}..{top}  ({w}x{h} DEM px)")

        # --- DEM: read native window, mask NoData, block-average (NaN aware)
        arr = d.read(1, window=Window(c0, r0, w, h)).astype("float32")
        nod = ~np.isfinite(arr) | (arr < -1e30)
        arr[nod] = np.nan
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", category=RuntimeWarning)
            grid = np.nanmean(arr.reshape(h // f, f, w // f, f), axis=(1, 3)).astype("float32")
        del arr
        hole = ~np.isfinite(grid)
        n_filled = int(hole.sum())
        if n_filled:
            grid = fillnodata(np.where(hole, 0, grid).astype("float32"), mask=(~hole).astype("uint8"),
                              max_search_distance=200)
            assert np.isfinite(grid).all() and (grid[hole] != 0).all(), "unfilled NoData remains"
        rows, cols = grid.shape
        cell = res * f
        valid = grid[~hole]
        stats = dict(min=float(valid.min()), max=float(valid.max()), mean=float(valid.mean()))
        print(f"grid {cols}x{rows} @ {cell} m, filled NoData cells: {n_filled}, elevation {stats}")
        grid.astype("<f4").tofile(os.path.join(a.out, "terrain.f32.bin"))
        np.packbits(hole.astype("uint8").ravel()).tofile(os.path.join(a.out, "nodata.bin"))

        # --- Ortho: same ground extent, area-averaged to texture size
        tw = a.tex_width; th = round(tw * (top - bottom) / (right - left))
        win = from_bounds(left, bottom, right, top, transform=o.transform)
        img = o.read(1, window=win, out_shape=(th, tw), resampling=Resampling.average)
        Image.fromarray(img, "L").save(os.path.join(a.out, "texture.jpg"), quality=a.jpeg_quality, subsampling=0)
        print(f"texture {tw}x{th} ({(right-left)/tw:.2f} m/px EW, {(top-bottom)/th:.2f} m/px NS)")

        meta = {
            "name": "Jezero Crater region (Mars 2020 landing-site CTX products)",
            "generated_by": "preprocessing/preprocess.py",
            "crs": {
                "name": "Equirectangular, Mars 2000 sphere (R = 3396190 m)",
                "radius_m": MARS_RADIUS_M, "standard_parallel_deg": 18.4663, "central_meridian_deg": 0,
                "x_formula": "X = R * lon_rad * cos(standard_parallel)", "y_formula": "Y = R * lat_rad",
                "note": "East-west ground scale is exact only at 18.4663 N; at the north/south edges of the area it is off by about +/-0.5 %.",
            },
            "extent": {"left": left, "right": right, "bottom": bottom, "top": top, "width": right - left, "height": top - bottom},
            "grid": {"cols": cols, "rows": rows, "cell_size_m": cell, "cell_reference": "pixel centre",
                     "layout": "row-major, first row = northernmost", "dtype": "float32 little-endian"},
            "elevation": {**stats, "unit": "metres (not stated in the GeoTIFF metadata; consistent with Jezero Crater's known relief)",
                          "datum": "Not stated in file metadata (Mars 2000 sphere / MOLA-referenced DEM)",
                          "nodata_value": float(d.nodata), "nodata_cells_filled": n_filled},
            "texture": {"file": "texture.jpg", "width": tw, "height": th, "bands": 1,
                        "note": "Source CTX orthoimage is panchromatic (grayscale); no natural colour is contained in the data."},
            "sources": [
                {"role": "terrain geometry", "file": os.path.basename(a.dem), "native_res_m": d.res[0], "native_size": [d.width, d.height],
                 "sha256": sha256(a.dem), "credit": "USGS Astrogeology / NASA Mars 2020 terrain data, CTX DEM, 20 m/px"},
                {"role": "surface texture", "file": os.path.basename(a.ortho), "native_res_m": list(o.res), "native_size": [o.width, o.height],
                 "sha256": sha256(a.ortho), "credit": "USGS Astrogeology / NASA Mars 2020 terrain data, CTX orthomosaic, 5 m/px"},
            ],
            "transformations": [
                "Cropped DEM and orthomosaic to their common ground extent (snapped to the DEM pixel grid).",
                f"DEM block-averaged {f}x{f} (NaN-aware mean) from {res} m to {cell} m cells; no smoothing or filtering beyond that.",
                f"{n_filled} NoData cells filled by inverse-distance interpolation for rendering only; mask in nodata.bin.",
                f"Orthomosaic area-averaged (rasterio Resampling.average) from ~5 m to {(right-left)/tw:.2f} m/px; pixel values not otherwise altered.",
                "No reprojection: both inputs already share the same equirectangular CRS (standard parallel 18.4663), so geometry and texture align by coordinates.",
            ],
            "unused": [{"file": "Jezero_ChannelFan_DEM.tif", "reason": "See docs/DATASETS.md - different CRS/standard parallel and unresolved vertical (~13 m) and possible horizontal offset against the CTX DEM; kept separate."}],
        }
        with open(os.path.join(a.out, "metadata.json"), "w") as fh:
            json.dump(meta, fh, indent=2)
    print("done ->", os.path.abspath(a.out))

if __name__ == "__main__":
    main()
