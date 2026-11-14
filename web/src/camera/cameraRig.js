import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';

/** Modes: 'follow' (orbit around rover), 'orbit' (free orbit/pan/zoom), 'fly' (WASD + drag look). */
export class CameraRig {
  constructor(camera, dom, hf, frame) {
    this.camera = camera; this.hf = hf; this.frame = frame; this.mode = 'follow';
    this.controls = new OrbitControls(camera, dom);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.08, minDistance: 8, maxDistance: 250000, maxPolarAngle: Math.PI * 0.495, zoomSpeed: 1.2 });
    this.keys = new Set(); this.yaw = 0; this.pitch = 0; this.flySpeed = 800; this.dragging = false;
    addEventListener('keydown', e => this.keys.add(e.code)); addEventListener('keyup', e => this.keys.delete(e.code));
    dom.addEventListener('pointerdown', e => { if (this.mode === 'fly' && e.button === 0) { this.dragging = true; dom.setPointerCapture(e.pointerId); } });
    dom.addEventListener('pointerup', e => { this.dragging = false; });
    dom.addEventListener('pointermove', e => { if (this.dragging && this.mode === 'fly') { this.yaw -= e.movementX * 0.003; this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch - e.movementY * 0.003)); } });
    dom.addEventListener('wheel', e => { if (this.mode === 'fly') this.flySpeed = Math.max(20, Math.min(20000, this.flySpeed * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); }, { passive: true });
  }
  placeBehind(pos, heading, dist = 500, height = 250) {
    const back = new THREE.Vector3(-Math.sin(heading), 0, Math.cos(heading)); // behind a north-up heading: -(east, -north)
    this.camera.position.copy(pos).addScaledVector(back, dist).add(new THREE.Vector3(0, height, 0));
    this.controls.target.copy(pos); this.controls.update();
  }
  setMode(m) {
    if (m === this.mode) return;
    if (m === 'fly') {
      const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ'); this.yaw = e.y; this.pitch = e.x; this.controls.enabled = false;
    } else {
      if (this.mode === 'fly') { const dir = new THREE.Vector3(); this.camera.getWorldDirection(dir); this.controls.target.copy(this.camera.position).addScaledVector(dir, 1500); }
      this.controls.enabled = true;
    }
    this.mode = m;
  }
  update(dt, roverPos) {
    if (this.mode === 'follow') {
      const delta = roverPos.clone().sub(this.controls.target); this.controls.target.add(delta); this.camera.position.add(delta);
    }
    if (this.mode === 'fly') {
      this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
      const k = this.keys, v = new THREE.Vector3(), q = this.camera.quaternion;
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q), right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
      if (k.has('KeyW')) v.add(fwd); if (k.has('KeyS')) v.sub(fwd); if (k.has('KeyD')) v.add(right); if (k.has('KeyA')) v.sub(right);
      if (k.has('KeyE') || k.has('Space')) v.y += 1; if (k.has('KeyQ')) v.y -= 1;
      if (v.lengthSq()) this.camera.position.addScaledVector(v.normalize(), this.flySpeed * (k.has('ShiftLeft') ? 4 : 1) * dt);
    } else this.controls.update();
    // never let the camera pass through the terrain
    const [X, Y] = this.frame.fromWorld(this.camera.position.x, this.camera.position.z);
    if (this.hf.inBounds(X, Y)) {
      const min = this.frame.elevToY(this.hf.sample(X, Y)) + 10;
      if (this.camera.position.y < min) this.camera.position.y = min;
    }
  }
}
