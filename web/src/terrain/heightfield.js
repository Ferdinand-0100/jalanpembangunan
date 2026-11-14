// Sampled elevation grid (projected metres). Pure JS, no three.js: usable by future agents/tests.
export class Heightfield {
  constructor(meta, data) {
    this.meta = meta; this.data = data;
    this.cols = meta.grid.cols; this.rows = meta.grid.rows; this.cell = meta.grid.cell_size_m;
    this.left = meta.extent.left; this.top = meta.extent.top;
    // valid sample positions are cell centres: left+(i+0.5)*cell, top-(j+0.5)*cell
    this.minX = this.left + this.cell / 2; this.maxX = this.left + (this.cols - 0.5) * this.cell;
    this.maxY = this.top - this.cell / 2;  this.minY = this.top - (this.rows - 0.5) * this.cell;
  }
  inBounds(X, Y) { return X >= this.minX && X <= this.maxX && Y >= this.minY && Y <= this.maxY; }
  /** Bilinear elevation (m) at projected X, Y; clamps to the grid edge. */
  sample(X, Y) {
    let fx = (X - this.left) / this.cell - 0.5, fy = (this.top - Y) / this.cell - 0.5;
    fx = Math.min(Math.max(fx, 0), this.cols - 1.001); fy = Math.min(Math.max(fy, 0), this.rows - 1.001);
    const i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j, c = this.cols, d = this.data;
    const a = d[j * c + i], b = d[j * c + i + 1], e = d[(j + 1) * c + i], f = d[(j + 1) * c + i + 1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (e * (1 - tx) + f * tx) * ty;
  }
  /** [dh/dX (east), dh/dY (north)] by central differences over +-1 cell. */
  gradient(X, Y) {
    const e = this.cell;
    return [(this.sample(X + e, Y) - this.sample(X - e, Y)) / (2 * e),
            (this.sample(X, Y + e) - this.sample(X, Y - e)) / (2 * e)];
  }
  /** Slope in degrees measured over a ~80 m baseline (2 cells), i.e. DEM-scale, not rover-scale. */
  slopeDeg(X, Y) {
    const [gx, gy] = this.gradient(X, Y); return Math.atan(Math.hypot(gx, gy)) * 180 / Math.PI;
  }
}
