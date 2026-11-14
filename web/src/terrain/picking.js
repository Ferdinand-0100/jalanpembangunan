// Ray-march a camera ray against the real heightfield (cheaper and more exact than raycasting 700k triangles).
export function pickTerrain(ray, hf, frame, maxDist = 300000) {
  const o = ray.origin, d = ray.direction;
  let t = 0, prevT = 0, prevAbove = null;
  for (let n = 0; n < 6000 && t < maxDist; n++) {
    const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
    const [X, Y] = frame.fromWorld(x, z);
    let step = 200;
    if (hf.inBounds(X, Y)) {
      const gy = frame.elevToY(hf.sample(X, Y)), above = y > gy;
      if (prevAbove === true && !above) {
        let lo = prevT, hi = t;
        for (let k = 0; k < 24; k++) {
          const m = (lo + hi) / 2, [mx, my] = frame.fromWorld(o.x + d.x * m, o.z + d.z * m);
          (o.y + d.y * m > frame.elevToY(hf.sample(mx, my)) ? (lo = m) : (hi = m));
        }
        const [px, py] = frame.fromWorld(o.x + d.x * hi, o.z + d.z * hi);
        const elev = hf.sample(px, py);
        return { X: px, Y: py, elevation: elev, slopeDeg: hf.slopeDeg(px, py), world: frame.toWorld(px, py, elev) };
      }
      prevAbove = above; step = Math.min(2000, Math.max(20, Math.abs(y - gy) * 0.35));
    } else prevAbove = null;
    prevT = t; t += step;
  }
  return null;
}
