# Dataset inspection report

## Dataset 1 – `M20_JezeroCrater_CTXDEM_20m.tif`
GeoTIFF, float32, 1 band, 4456 × 5067 px, 20 m/px, no overviews, uncompressed. CRS: equirectangular, Mars 2000 **sphere** (R = 3 396 190 m), standard parallel 18.4663°, central meridian 0°. Extent X 4 329 000–4 418 120, Y 1 042 080–1 143 420 m ≈ lon 77.00–78.58° E, lat 17.58–19.29° N. NoData −3.4028e38 (≈0.04 % of pixels). Elevation −3501 … −476 m, mean −2316 m. Unit not declared in the file.

## Dataset 2 – `M20_JezeroCrater_CTXortho_mosaic_5m.tif`
GeoTIFF, uint8, **1 band (grayscale)**, 17 766 × 20 234 px, 5.002 × 5.002 m/px, same CRS as Dataset 1, no NoData. Extent ≈ Dataset 1 but shifted/shrunk by 0–190 m on the edges (cropped to the common area). Pure imagery: contains **no elevation** and no colour.

## Dataset 3 – `Jezero_ChannelFan_DEM.tif` (+ .tfw, .xml, .aux.xml)
GeoTIFF, float32, 14 341 × 17 220 px, **1 m/px**, LZW tiles. Per the .xml, derived from HiRISE stereo DTMs (ASP) – "CenterFan_plus_Channel". CRS **MarsEC0**: equirectangular, standard parallel **0°**, ellipsoid (a = 3 396 190, 1/f = 169.894) – *different from Datasets 1/2*. The .tfw is consistent with the GeoTIFF geotransform. Extent lon 77.223–77.465° E, lat 18.372–18.662° N (~14.3 × 17.2 km) → **covers only ~1.7 % of the regional area** (cols 633–1313, rows 1860–2722 of the 20 m DEM). Elevation −2599 … −1622 m, only ~65 % of pixels valid (rest NoData).

### Compatibility test (`preprocessing/check_fan_alignment.py`)
Same-lon/lat comparison, ~404 000 overlapping samples (Dataset 3 averaged to ~20 m):
* X coordinates are **not interchangeable** (different standard parallel); a naive overlay puts the data outside the regional DEM entirely, so reprojection through lon/lat is mandatory.
* Vertical: Dataset 3 is **+13.2 m (median)** above Dataset 1, spread σ ≈ 12 m, 5–95 % range −4…+36 m. A constant offset does not explain the spread.
* Horizontal: residuals are slightly lower with a ~60 m north–south shift (RMS 12.4 → 10.3 m), but this is a modest, ambiguous improvement, not a proven registration. A sphere-vs-ellipsoid / planetographic-vs-planetocentric latitude difference could plausibly contribute – unverified.

### Decision
Per your rule 8 the datasets are **not merged**. Dataset 3 is not rendered; the regional terrain is Dataset 1 only. To integrate later, first resolve the datum/latitude definition (e.g. check the Murray Lab release notes or co-register against HiRISE/CTX features), then add it as a separate high-detail tile layer around the delta/fan with its own vertical correction.
