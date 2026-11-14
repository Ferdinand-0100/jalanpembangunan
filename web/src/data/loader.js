import * as THREE from 'three';
export async function loadDataset(base, renderer, onProgress = () => {}) {
  onProgress('Loading metadata…');
  const meta = await (await fetch(base + 'metadata.json')).json();
  onProgress('Loading elevation grid (NASA/USGS CTX DEM)…');
  const buf = await (await fetch(base + 'terrain.f32.bin')).arrayBuffer();
  const heights = new Float32Array(buf);
  if (heights.length !== meta.grid.cols * meta.grid.rows) throw new Error('terrain.f32.bin size does not match metadata');
  onProgress('Loading orthoimage texture (NASA/USGS CTX mosaic)…');
  const texture = await new THREE.TextureLoader().loadAsync(base + meta.texture.file);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return { meta, heights, texture };
}
