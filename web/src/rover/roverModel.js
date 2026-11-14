import * as THREE from 'three';
// Simple stylised rover (~3 m) - a visual stand-in, not an engineering model. Forward = -Z.
export function createRoverModel() {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.6, metalness: 0.2 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.9 });
  const beacon = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 1.5 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  add(new THREE.BoxGeometry(1.8, 0.7, 2.6), body, 0, 0.9, 0);
  add(new THREE.BoxGeometry(1.2, 0.08, 1.6), dark, 0, 1.3, 0.2);            // deck / panel
  add(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8), dark, 0.5, 1.9, -1.0); // mast
  add(new THREE.BoxGeometry(0.4, 0.25, 0.25), body, 0.5, 2.6, -1.0);         // camera head
  add(new THREE.SphereGeometry(0.15, 12, 8), beacon, -0.5, 1.45, 1.0);
  const wheel = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 16); wheel.rotateZ(Math.PI / 2);
  for (const z of [-1.1, 0, 1.1]) for (const x of [-1.15, 1.15]) add(wheel, dark, x, 0.4, z);
  g.userData.groundOffset = 0;  // wheels' lowest point sits at y = 0
  return g;
}
