import rasterio, numpy as np, math
from rasterio.windows import Window
import sys
U=(sys.argv[1] if len(sys.argv)>1 else "/mnt/user-data/uploads/").rstrip("/")+"/"
R=3396190.0
phi0=math.radians(18.4663); c=math.cos(phi0)
def d1_to_lonlat(x,y): return math.degrees(x/(R*c)), math.degrees(y/R)
def d3_to_lonlat(x,y): return math.degrees(x/R), math.degrees(y/R)
def lonlat_to_d1(lon,lat): return math.radians(lon)*R*c, math.radians(lat)*R
def lonlat_to_d3(lon,lat): return math.radians(lon)*R, math.radians(lat)*R
with rasterio.open(U+"M20_JezeroCrater_CTXDEM_20m.tif") as a, rasterio.open(U+"M20_JezeroCrater_CTXortho_mosaic_5m.tif") as o, rasterio.open(U+"Jezero_ChannelFan_DEM.tif") as f:
    for n,ds,fn in (("DEM20",a,d1_to_lonlat),("ORTHO5",o,d1_to_lonlat),("FAN1m",f,d3_to_lonlat)):
        b=ds.bounds
        print(n,"lon %.4f..%.4f lat %.4f..%.4f"%(fn(b.left,b.bottom)[0],fn(b.right,b.top)[0],fn(b.left,b.bottom)[1],fn(b.right,b.top)[1]))
    print("DEM20 vs ORTHO5 bounds diff (m): L %.1f R %.1f B %.1f T %.1f"%(o.bounds.left-a.bounds.left,o.bounds.right-a.bounds.right,o.bounds.bottom-a.bounds.bottom,o.bounds.top-a.bounds.top))
    # Fan footprint in DEM20 pixel coords
    corners=[(f.bounds.left,f.bounds.top),(f.bounds.right,f.bounds.top),(f.bounds.right,f.bounds.bottom),(f.bounds.left,f.bounds.bottom)]
    for cx,cy in corners:
        lon,lat=d3_to_lonlat(cx,cy); x1,y1=lonlat_to_d1(lon,lat)
        print("fan corner lon/lat %.4f %.4f -> DEM20 xy %.1f %.1f -> px col %.1f row %.1f"%(lon,lat,x1,y1,(x1-a.bounds.left)/20,(a.bounds.top-y1)/20))
    # sample Fan DEM at coarse grid (stride 20 px ~ 20 m), compare to DEM20 bilinear-ish nearest
    step=20
    fa=f.read(1,out_shape=(f.height//step,f.width//step),resampling=rasterio.enums.Resampling.average).astype('float64')
    fv=(fa>-1e30)
    rows,cols=np.where(fv)
    xs=f.bounds.left+(cols+0.5)*step; ys=f.bounds.top-(rows+0.5)*step
    lon=np.degrees(xs/R); lat=np.degrees(ys/R)
    x1=np.radians(lon)*R*c; y1=np.radians(lat)*R
    ca=((x1-a.bounds.left)/20).astype(int); ra=((a.bounds.top-y1)/20).astype(int)
    ok=(ca>=0)&(ca<a.width)&(ra>=0)&(ra<a.height)
    dem=a.read(1).astype('float64')
    d=dem[ra[ok],ca[ok]]; g=fa[rows[ok],cols[ok]]
    m=(d>-1e30)
    diff=g[m]-d[m]
    print("overlap samples",m.sum(),"fan-DEM20 diff: mean %.2f m, median %.2f, std %.2f, p5 %.2f p95 %.2f"%(diff.mean(),np.median(diff),diff.std(),*np.percentile(diff,[5,95])))
    # same test but WITHOUT reprojection (naive: use D3 xy directly as D1 xy) to show the offset matters
    ca2=((xs-a.bounds.left)/20).astype(int); ra2=((a.bounds.top-ys)/20).astype(int)
    ok2=(ca2>=0)&(ca2<a.width)&(ra2>=0)&(ra2<a.height)
    print("naive no-reproject samples in DEM20 extent:",ok2.sum())
    # best-fit offset search: shift in DEM20 pixels
    best=None
    for dr in range(-6,7):
        for dc in range(-6,7):
            r2=ra[ok]+dr; c2=ca[ok]+dc
            k=(r2>=0)&(r2<a.height)&(c2>=0)&(c2<a.width)
            dd=dem[r2[k],c2[k]]; gg=g[k]; mm=dd>-1e30
            e=np.sqrt(np.mean((gg[mm]-dd[mm]-np.median(gg[mm]-dd[mm]))**2))
            if best is None or e<best[0]: best=(e,dr,dc,np.median(gg[mm]-dd[mm]))
    print("best residual-RMS shift (rows,cols in 20m px):",best)
    print("zero-shift residual RMS:", np.sqrt(np.mean((diff-np.median(diff))**2)))
    print("fan valid fraction at 20px decimation: %.3f"%fv.mean())
