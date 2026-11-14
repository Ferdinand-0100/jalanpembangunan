# Jezero Crater 3D Terrain Simulator (NASA Space Apps – Mars rover swarm foundation)

Explorable Three.js terrain of the wider Jezero Crater region built **only from real NASA/USGS data**:

| Role | File | Used? |
|---|---|---|
| Terrain geometry | `M20_JezeroCrater_CTXDEM_20m.tif` (USGS/NASA Mars 2020, CTX DEM, 20 m/px) | Yes |
| Surface texture | `M20_JezeroCrater_CTXortho_mosaic_5m.tif` (USGS/NASA Mars 2020, CTX orthomosaic, 5 m/px, **grayscale**) | Yes |
| Local detail | `Jezero_ChannelFan_DEM.tif` (+ .tfw/.xml/.aux.xml; Caltech Murray Lab, 1 m/px) | **No – kept separate**, see `docs/DATASETS.md` |

Not used: geological maps (none provided). Nothing procedural or invented is rendered as terrain.

## Run
```bash
# 1) (already done in this zip) preprocess – needs: pip install rasterio numpy pillow
python3 preprocessing/preprocess.py --dem /path/M20_JezeroCrater_CTXDEM_20m.tif --ortho /path/M20_JezeroCrater_CTXortho_mosaic_5m.tif
#    optional sharper texture: add --tex-width 8192   (denser DEM: --dem-factor 1, ~90 MB)
# 2) serve the web folder (ES modules need HTTP, not file://)
cd web && python3 -m http.server 8000     # open http://localhost:8000
```
Three.js r160 and OrbitControls are vendored in `web/vendor/` (works offline, MIT licence).

## Controls
Drive the rover: **W A S D / arrows**. Camera: left-drag rotate, right-drag pan, wheel zoom. Camera menu: *Follow rover*, *Free orbit*, *Free-fly* (WASD, Q/E, Shift, drag to look, wheel = speed). **Click** terrain to read lon/lat, elevation, slope. Panel: vertical exaggeration (1–5×), mesh resolution (320/160/80/40 m), slope map, sun angle, rover display scale.

## Structure
```
preprocessing/preprocess.py            GDAL/rasterio pipeline -> web/data/
preprocessing/check_fan_alignment.py   Dataset 3 compatibility test
web/src/geo/coords.js                  lon/lat <-> projected <-> scene coordinates
web/src/data/loader.js                 loads metadata, heightmap, texture
web/src/terrain/heightfield.js         bilinear elevation, gradient, slope (no three.js)
web/src/terrain/terrainRenderer.js     mesh, texture/slope materials, LOD stride
web/src/terrain/picking.js             exact ray-vs-heightfield inspection
web/src/rover/roverPhysics.js          terrain-following kinematics, slope/edge collision (no three.js)
web/src/rover/roverModel.js, roverInput.js
web/src/camera/cameraRig.js            follow / orbit / fly, camera-terrain collision
web/src/ui/hud.js                      info panel & controls
web/src/ai/agentInterface.js           stub: observation + role definitions for the 3 future rovers
web/data/metadata.json                 extent, CRS, stats, checksums, every transformation
```

## What is real vs. visualisation
Real: elevation values (block-averaged to 40 m cells), image brightness, coordinates. Visualisation only: Mars-tone tint (toggleable; CTX is panchromatic), slope colour ramp, sun/shadows (the CTX image already contains its own baked illumination), rover model, rover display scale, vertical exaggeration, simulation speed (40 m/s vs real ~0.04 m/s).

## Documented transformations (details in `web/data/metadata.json`)
1. DEM and orthomosaic cropped to common extent (they differ by up to ~190 m at the edges), snapped to DEM grid.
2. DEM 2×2 NaN-aware block mean → 40 m cells. The ~0.04 % NoData pixels are excluded from averages; no 40 m cell was entirely empty, so nothing had to be interpolated (`nodata_cells_filled = 0`).
3. Orthomosaic area-averaged to 4096 px wide (21.7 m/px). Same CRS as the DEM, so no reprojection.
4. Elevation relative to the lowest DEM value is used for drawing; displayed elevation is the original value.

## Limitations (tested vs. not tested)
* Tested: preprocessing on your real files; coordinate round trips; heightfield sampling; rover physics driving 8 km in 4 directions on real data (no NaN, bounds respected); DEM–texture registration (hillshade/imagery correlation peaks at zero offset); all files serve correctly over HTTP.
* **Not tested:** rendering in a browser – no browser was available in my sandbox. Please report any console errors.
* Elevation unit (metres) and vertical datum are not stated in the GeoTIFF metadata; metres is inferred from magnitude (floor ≈ −2.5 km).
* East–west distances use the equirectangular projection with standard parallel 18.4663° N: ≈ ±0.5 % error at the north/south edges.
* Slopes are at DEM scale (~80 m baseline) and understate rover-scale (metre) slopes. No rocks/boulders: not resolved by 20 m data.
* Rover start (77.4509° E, 18.4446° N) is the approximate public Mars 2020 landing location, used only as a start position.
