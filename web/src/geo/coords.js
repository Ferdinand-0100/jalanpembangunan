// Geographic coordinate conversion. Dataset CRS: equirectangular, Mars 2000 sphere,
// standard parallel 18.4663 deg (X = R*lon*cos(phi0), Y = R*lat). See web/data/metadata.json.
// Scene (world) frame: x = east, y = up, z = south; origin at the centre of the dataset extent.
export class GeoFrame {
  constructor(meta, exaggeration = 1) {
    this.R = meta.crs.radius_m;
    this.cosPhi0 = Math.cos((meta.crs.standard_parallel_deg * Math.PI) / 180);
    this.extent = meta.extent;
    this.X0 = (meta.extent.left + meta.extent.right) / 2;
    this.Y0 = (meta.extent.bottom + meta.extent.top) / 2;
    this.zRef = meta.elevation.min;       // heights are drawn relative to the lowest DEM value
    this.exag = exaggeration;
  }
  setExaggeration(e) { this.exag = e; }
  elevToY(elev) { return (elev - this.zRef) * this.exag; }
  yToElev(y) { return y / this.exag + this.zRef; }
  toWorld(X, Y, elev, target = { x: 0, y: 0, z: 0 }) {
    target.x = X - this.X0; target.y = this.elevToY(elev); target.z = -(Y - this.Y0); return target;
  }
  fromWorld(x, z) { return [x + this.X0, -z + this.Y0]; }
  projToLonLat(X, Y) {
    return [(X / (this.R * this.cosPhi0)) * 180 / Math.PI, (Y / this.R) * 180 / Math.PI];
  }
  lonLatToProj(lon, lat) {
    return [(lon * Math.PI / 180) * this.R * this.cosPhi0, (lat * Math.PI / 180) * this.R];
  }
}
