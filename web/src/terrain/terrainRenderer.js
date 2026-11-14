import * as THREE from 'three';

const slopeRamp = (deg, out) => { // green (flat) -> yellow -> red (steep); visualisation only
  const t = Math.min(deg / 30, 1);
  if (t < 0.5) { const k = t * 2; out[0] = 0.15 + 0.85 * k; out[1] = 0.65; out[2] = 0.2 * (1 - k); }
  else { const k = (t - 0.5) * 2; out[0] = 1.0; out[1] = 0.65 * (1 - k); out[2] = 0; }
};

/** Builds and owns the terrain mesh from the real heightfield + real orthoimage. */
export class TerrainRenderer {
  constructor(scene, hf, frame, texture) {
    this.scene = scene; this.hf = hf; this.frame = frame; this.texture = texture;
    this.stride = 4; this.mesh = null;
    this.texMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 });
    this.slopeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    this.slopeMode = false;
    this.setTint(true);
  }
  /** Visual enhancement only: source imagery is grayscale. */
  setTint(on) { this.texMat.color.set(on ? 0xffb98a : 0xffffff); this.texMat.needsUpdate = true; }
  setSlopeMode(on) { this.slopeMode = on; if (this.mesh) this.mesh.material = on ? this.slopeMat : this.texMat; }

  build(stride = this.stride) {
    this.stride = stride;
    const { hf, frame } = this, ext = hf.meta.extent;
    const nx = Math.floor((hf.cols - 1) / stride) + 1, ny = Math.floor((hf.rows - 1) / stride) + 1;
    const pos = new Float32Array(nx * ny * 3), uv = new Float32Array(nx * ny * 2), col = new Float32Array(nx * ny * 3);
    const rgb = [0, 0, 0], p = { x: 0, y: 0, z: 0 };
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const ci = Math.min(i * stride, hf.cols - 1), cj = Math.min(j * stride, hf.rows - 1);
      const X = hf.left + (ci + 0.5) * hf.cell, Y = hf.top - (cj + 0.5) * hf.cell;
      const elev = hf.data[cj * hf.cols + ci], k = j * nx + i;
      frame.toWorld(X, Y, elev, p);
      pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z;
      uv[k * 2] = (X - ext.left) / ext.width; uv[k * 2 + 1] = 1 - (ext.top - Y) / ext.height; // exact geographic registration
      slopeRamp(hf.slopeDeg(X, Y), rgb); col[k * 3] = rgb[0]; col[k * 3 + 1] = rgb[1]; col[k * 3 + 2] = rgb[2];
    }
    const idx = new Uint32Array((nx - 1) * (ny - 1) * 6); let q = 0;
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
      idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d; // CCW seen from above (+y)
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();
    if (this.mesh) { this.mesh.geometry.dispose(); this.mesh.geometry = g; }
    else {
      this.mesh = new THREE.Mesh(g, this.slopeMode ? this.slopeMat : this.texMat);
      this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
      this.scene.add(this.mesh);
    }
    return { vertices: nx * ny, triangles: (nx - 1) * (ny - 1) * 2, meshCell: hf.cell * stride };
  }
}
