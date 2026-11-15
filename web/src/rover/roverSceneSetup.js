import * as THREE from 'three';

/**
 * Opt-in scene illumination for the rover viewer.
 * Call once after your renderer/scene are created:
 *   enhanceRoverScene(scene, renderer);
 * Idempotent: repeated calls do not stack lights.
 */
export function enhanceRoverScene(scene, renderer, opts = {}) {
  if (scene.userData.__roverLighting) return scene.userData.__roverLighting;
  const { sunIntensity = 2.4, shadowMapSize = 2048, shadowExtent = 6 } = opts;

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Warm Martian sky / dust-bounce ambient
  const hemi = new THREE.HemisphereLight(0xd8b28a, 0x5a4030, 0.55);
  hemi.name = 'RoverHemisphere';
  scene.add(hemi);

  // Primary sun — the only shadow caster (kept cheap on purpose)
  const sun = new THREE.DirectionalLight(0xfff2e0, sunIntensity);
  sun.name = 'RoverSun';
  sun.position.set(6, 9, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 30;
  sun.shadow.camera.left = -shadowExtent;
  sun.shadow.camera.right = shadowExtent;
  sun.shadow.camera.top = shadowExtent;
  sun.shadow.camera.bottom = -shadowExtent;
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  // Cool secondary fill so shadowed mechanics stay readable (no shadows)
  const fill = new THREE.DirectionalLight(0x8fa3c0, 0.35);
  fill.name = 'RoverFill';
  fill.position.set(-5, 4, -6);
  scene.add(fill);

  const refs = { hemi, sun, fill };
  scene.userData.__roverLighting = refs;

  // Optional image-based reflections for metals/lenses (three.js built-in, no new deps)
  enableEnvironment(scene, renderer).catch(() => {});
  return refs;
}

export async function enableEnvironment(scene, renderer) {
  let RoomEnvironment;
  try {
    ({ RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js'));
  } catch (e) {
    ({ RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js'));
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();
  return scene.environment;
}