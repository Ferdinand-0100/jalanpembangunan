import * as THREE from 'three';
import { CONFIG } from './config.js';
import { loadDataset } from './data/loader.js';
import { Heightfield } from './terrain/heightfield.js';
import { GeoFrame } from './geo/coords.js';
import { TerrainRenderer } from './terrain/terrainRenderer.js';
import { pickTerrain } from './terrain/picking.js';
import { RoverPhysics } from './rover/roverPhysics.js';
import { createRoverModel } from './rover/roverModel.js';
import { RoverInput } from './rover/roverInput.js';
import { CameraRig } from './camera/cameraRig.js';
import { Hud } from './ui/hud.js';

const hud = new Hud({
  onExaggeration: v => { frame.setExaggeration(v); terrain.build(); },
  onStride: v => hud.setMeshInfo(terrain.build(v)),
  onSlope: on => terrain.setSlopeMode(on),
  onTint: on => terrain.setTint(on),
  onRoverScale: v => roverGroup.scale.setScalar(v),
  onSun: () => updateSun(),
  onCamera: m => rig.setMode(m),
  onReset: () => { startRover(); },
});
let frame, hf, terrain, rig, physics, roverGroup, sun, input, marker, meta;

async function main() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('app').appendChild(renderer.domElement);

  let data;
  try { data = await loadDataset(CONFIG.dataPath, renderer, hud.setLoading); }
  catch (e) { hud.showError('Could not load data/. Run preprocessing first and serve web/ over HTTP (see README). ' + e.message); throw e; }
  meta = data.meta; hf = new Heightfield(meta, data.heights); frame = new GeoFrame(meta, CONFIG.verticalExaggeration);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc8a37f);
  scene.fog = new THREE.FogExp2(0xc8a37f, 0.000006);
  scene.add(new THREE.HemisphereLight(0xffe2c8, 0x5a3a2a, 0.45));
  sun = new THREE.DirectionalLight(0xfff1e0, 2.6); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -1500, right: 1500, top: 1500, bottom: -1500, near: 1, far: 12000 });
  sun.shadow.camera.updateProjectionMatrix(); sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 3;
  scene.add(sun, sun.target);

  terrain = new TerrainRenderer(scene, hf, frame, data.texture);
  hud.setMeshInfo(terrain.build(CONFIG.meshStride));

  roverGroup = createRoverModel(); roverGroup.scale.setScalar(CONFIG.roverVisualScale); scene.add(roverGroup);
  marker = new THREE.Mesh(new THREE.ConeGeometry(25, 120, 12), new THREE.MeshBasicMaterial({ color: 0x00e0ff })); marker.visible = false; scene.add(marker);

  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 3, 600000);
  rig = new CameraRig(camera, renderer.domElement, hf, frame);
  physics = new RoverPhysics(hf, CONFIG.rover); input = new RoverInput(() => rig.mode);
  startRover(); updateSun();

  document.getElementById('sources').innerHTML = meta.sources.map(s => `<li><b>${s.role}:</b> ${s.file}<br><span>${s.credit}</span></li>`).join('');
  hud.setInspect(null); hud.hideLoading();

  // click to inspect (ignore drags)
  let down = null; const dom = renderer.domElement;
  dom.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  dom.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
    const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
    const p = pickTerrain(ray.ray, hf, frame);
    if (p) { const [lon, lat] = frame.projToLonLat(p.X, p.Y); hud.setInspect({ ...p, lon, lat }); marker.position.set(p.world.x, p.world.y + 60, p.world.z); marker.rotation.x = Math.PI; marker.visible = true; }
  });
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

  const clock = new THREE.Clock(); let fps = 60;
  const up = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3(), m4 = new THREE.Matrix4();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1); fps += (1 / Math.max(dt, 1e-3) - fps) * 0.05;
    physics.step(dt, input.read());
    // terrain-following pose: position on surface, orient to the (visually exaggerated) surface normal
    const w = frame.toWorld(physics.X, physics.Y, physics.elevation);
    const [gx, gy] = physics.grad, e = frame.exag;
    up.set(-e * gx, 1, e * gy).normalize();
    fwd.set(Math.sin(physics.heading), 0, -Math.cos(physics.heading));
    fwd.addScaledVector(up, -fwd.dot(up)).normalize(); right.crossVectors(fwd, up).normalize();
    m4.makeBasis(right, up, fwd.clone().negate()); roverGroup.quaternion.setFromRotationMatrix(m4);
    roverGroup.position.set(w.x, w.y, w.z);
    // shadow frustum follows the rover
    sun.position.copy(roverGroup.position).add(sunDir.clone().multiplyScalar(5000)); sun.target.position.copy(roverGroup.position);
    rig.update(dt, roverGroup.position);
    renderer.render(scene, camera);
    const [lon, lat] = frame.projToLonLat(physics.X, physics.Y);
    hud.update({ lon, lat, X: physics.X, Y: physics.Y, elev: physics.elevation, slope: physics.slopeDeg, heading: physics.heading, speed: physics.speed, status: physics.status, fps });
  });
}
const sunDir = new THREE.Vector3();
function updateSun() {
  const el = +document.getElementById('sunEl').value * Math.PI / 180, az = +document.getElementById('sunAz').value * Math.PI / 180;
  sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)); // azimuth clockwise from north
}
function startRover() {
  const [X, Y] = frame.lonLatToProj(...CONFIG.startLonLat);
  physics.setPosition(X, Y, 0);
  const w = frame.toWorld(X, Y, physics.elevation);
  rig.placeBehind(new THREE.Vector3(w.x, w.y, w.z), 0);
}
main();
