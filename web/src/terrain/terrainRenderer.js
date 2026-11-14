import * as THREE from 'three';

const slopeRamp = (deg, out) => { // green (flat) -> yellow -> red (steep); visualisation only
  const t = Math.min(deg / 30, 1);
  if (t < 0.5) { const k = t * 2; out[0] = 0.15 + 0.85 * k; out[1] = 0.65; out[2] = 0.2 * (1 - k); }
  else { const k = (t - 0.5) * 2; out[0] = 1.0; out[1] = 0.65 * (1 - k); out[2] = 0; }
};

/* ------------------------------------------------------------------ */
/*  GLSL helpers (noise + palet tanah Mars)                            */
/* ------------------------------------------------------------------ */
const NOISE_GLSL = /* glsl */`
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  vec2 i0 = mod(i, 256.0); vec2 i1 = mod(i + 1.0, 256.0);
  float a = h21(i0), b = h21(vec2(i1.x, i0.y)), c = h21(vec2(i0.x, i1.y)), d = h21(i1);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
  return s;
}
`;

const PALETTE_GLSL = /* glsl */`
vec3 dustPalette(float l, float steep, float n){
  vec3 rock = pow(vec3(0.30, 0.20, 0.15), vec3(2.2));   // basalt gelap
  vec3 dust = pow(vec3(0.80, 0.47, 0.28), vec3(2.2));   // debu teroksidasi
  vec3 sand = pow(vec3(0.92, 0.66, 0.45), vec3(2.2));   // pasir terang
  vec3 c = mix(rock, dust, smoothstep(0.12, 0.55, l));
  c = mix(c, sand, smoothstep(0.55, 0.95, l));
  float rm = smoothstep(0.10, 0.45, steep * 2.5 + (n - 0.5) * 0.4); // lereng curam = batuan terbuka
  return mix(c, rock * 0.9, rm * 0.7);
}
`;

const TERRAIN_COMMON = /* glsl */`
uniform float uTint;
uniform float uDetail;
varying vec3 vWPos;
varying vec3 vWN;
${NOISE_GLSL}
${PALETTE_GLSL}
`;

const TERRAIN_ALBEDO = /* glsl */`
{
  float dist  = length(vViewPosition);
  float nearK = 1.0 - smoothstep(120.0, 1500.0, dist);
  float closeK = 1.0 - smoothstep(25.0, 350.0, dist);
  vec2 p = vWPos.xz;
  float n0 = fbm(p / 700.0);
  float n1 = fbm(p / 90.0);
  float dtl = (n0 - 0.5) * 0.30 + (n1 - 0.5) * 0.30;
  if (nearK > 0.0)  dtl += (fbm(p / 11.0)  - 0.5) * 0.35 * nearK;
  if (closeK > 0.0) dtl += (fbm(p / 1.6)   - 0.5) * 0.45 * closeK;

  if (uTint > 0.5) {
    float lum = pow(clamp(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)), 0.0, 1.0), 0.4545);
    float steep = 1.0 - clamp(vWN.y, 0.0, 1.0);
    diffuseColor.rgb = dustPalette(clamp(lum * 1.25, 0.0, 1.0), steep, n1);
  }
  diffuseColor.rgb *= 1.0 + dtl * uDetail;
}
`;

const TERRAIN_NORMAL = /* glsl */`
{
  float fd = (1.0 - smoothstep(60.0, 900.0, length(vViewPosition))) * uDetail;
  if (fd > 0.0) {
    vec2 q = vWPos.xz / 2.5;
    float e = 0.35;
    float a0 = fbm(q), ax = fbm(q + vec2(e, 0.0)), az = fbm(q + vec2(0.0, e));
    vec3 g = vec3(a0 - ax, 0.0, a0 - az) / e;
    normal = normalize(normal + (viewMatrix * vec4(g, 0.0)).xyz * 0.35 * fd);
  }
}
`;

/** Builds and owns the terrain mesh from the real heightfield + real orthoimage. */
export class TerrainRenderer {
  constructor(scene, hf, frame, texture) {
    this.scene = scene; this.hf = hf; this.frame = frame; this.texture = texture;
    this.stride = 4; this.mesh = null;
    if (texture) texture.anisotropy = 16; // dikunci otomatis ke batas GPU

    // uniform dibagi ke RegionMarkers supaya palet & toggle tint selalu sama
    this.uniforms = { uTint: { value: 1 }, uDetail: { value: 1 } };

    this.texMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 });
    this.texMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTint = this.uniforms.uTint;
      shader.uniforms.uDetail = this.uniforms.uDetail;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWN;')
        .replace('#include <begin_vertex>',
          '#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWN = normalize(mat3(modelMatrix) * objectNormal);');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + TERRAIN_COMMON)
        .replace('#include <map_fragment>', '#include <map_fragment>\n' + TERRAIN_ALBEDO)
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + TERRAIN_NORMAL);
    };
    this.texMat.customProgramCacheKey = () => 'terrain-mars-v1';

    this.slopeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    this.slopeMode = false;
    this.setTint(true);
  }
  /** Warna Mars dipetakan dari luminansi citra (sumber citra grayscale). Visual saja. */
  setTint(on) { this.uniforms.uTint.value = on ? 1 : 0; }
  /** 0 = tanpa detail prosedural, 1 = penuh. */
  setDetail(v) { this.uniforms.uDetail.value = v; }
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

/**
 * Opsional: pengaturan renderer/scene agar tampilan lebih sinematik.
 * Panggil sekali setelah renderer & scene dibuat. Sesuaikan warna fog dengan warna horizon langit Anda.
 */
export function applyMarsLook(renderer, scene, { fog = false, fogColor = 0xc99a72, fogDensity = 0.00005, exposure = 1.1 } = {}) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (fog) scene.fog = new THREE.FogExp2(fogColor, fogDensity);
}
