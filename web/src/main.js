import * as THREE from 'three';
import { CONFIG } from './config.js';
import { loadDataset } from './data/loader.js';
import { Heightfield } from './terrain/heightfield.js';
import { GeoFrame } from './geo/coords.js';
import { TerrainRenderer } from './terrain/terrainRenderer.js';
import { pickTerrain } from './terrain/picking.js';
import { RoverSwarm } from './rover/roverSwarm.js';
import { RoverInput } from './rover/roverInput.js';
import { CameraRig } from './camera/cameraRig.js';
import { Hud } from './ui/hud.js';

let frame, hf, terrain, rig, swarm, sun, input, marker, meta;

const hud = new Hud({
  onExaggeration: v => { frame.setExaggeration(v); terrain.build(); },
  onStride: v => hud.setMeshInfo(terrain.build(v)),
  onSlope: on => terrain.setSlopeMode(on),
  onTint: on => terrain.setTint(on),
  onRoverScale: v => swarm.setVisualScale(v),
  onSun: () => updateSun(),
  onCamera: m => rig.setMode(m),
  onReset: () => startRovers(),
  onSelectRover: idx => selectRover(idx),
  onSwarmMode: mode => swarm.setSwarmMode(mode),
  onTriggerTask: () => {
    if (swarm) swarm.triggerActiveTask();
  },
});

function selectRover(idx) {
  if (!swarm) return;
  const rover = swarm.setActiveRover(idx);
  hud.updateRoverSelection(idx, rover);
  if (rig && rig.mode === 'follow') {
    rig.controls.target.copy(rover.mesh.position);
  }
}

async function main() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('app').appendChild(renderer.domElement);

  let data;
  try {
    data = await loadDataset(CONFIG.dataPath, renderer, hud.setLoading);
  } catch (e) {
    hud.showError('Could not load data/. Run preprocessing first and serve web/ over HTTP (see README). ' + e.message);
    throw e;
  }

  meta = data.meta;
  hf = new Heightfield(meta, data.heights);
  frame = new GeoFrame(meta, CONFIG.verticalExaggeration);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc8a37f);
  scene.fog = new THREE.FogExp2(0xc8a37f, 0.000006);
  scene.add(new THREE.HemisphereLight(0xffe2c8, 0x5a3a2a, 0.45));

  sun = new THREE.DirectionalLight(0xfff1e0, 2.6);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -1500, right: 1500, top: 1500, bottom: -1500, near: 1, far: 12000 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 3;
  scene.add(sun, sun.target);

  terrain = new TerrainRenderer(scene, hf, frame, data.texture);
  hud.setMeshInfo(terrain.build(CONFIG.meshStride));

  // Initialize the 3 specialized mission robots
  swarm = new RoverSwarm(scene, hf, frame, CONFIG.rover, CONFIG.roverVisualScale);
  swarm.onMissionLog = msg => hud.showToast(msg);

  marker = new THREE.Mesh(new THREE.ConeGeometry(25, 120, 12), new THREE.MeshBasicMaterial({ color: 0x00e0ff }));
  marker.visible = false;
  scene.add(marker);

  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 3, 600000);
  rig = new CameraRig(camera, renderer.domElement, hf, frame);
  input = new RoverInput(() => rig.mode);

  startRovers();
  updateSun();

  document.getElementById('sources').innerHTML = meta.sources.map(s => `<li><b>${s.role}:</b> ${s.file}<br><span>${s.credit}</span></li>`).join('');
  hud.setInspect(null);
  hud.hideLoading();

  // Keyboard shortcut switching between the 3 robots & task triggers
  addEventListener('keydown', e => {
    if (['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
      const idx = parseInt(e.code.replace('Digit', ''), 10) - 1;
      selectRover(idx);
    } else if (e.code === 'Tab') {
      e.preventDefault();
      selectRover((swarm.activeIndex + 1) % swarm.rovers.length);
    } else if (e.code === 'Space' && rig.mode !== 'fly') {
      e.preventDefault();
      swarm.triggerActiveTask();
    }
  });

  // Click to inspect (ignore drags)
  let down = null;
  const dom = renderer.domElement;
  dom.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  dom.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
    const p = pickTerrain(ray.ray, hf, frame);
    if (p) {
      const [lon, lat] = frame.projToLonLat(p.X, p.Y);
      hud.setInspect({ ...p, lon, lat });
      marker.position.set(p.world.x, p.world.y + 60, p.world.z);
      marker.rotation.x = Math.PI;
      marker.visible = true;
    }
  });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const clock = new THREE.Clock();
  let fps = 60;

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    fps += (1 / Math.max(dt, 1e-3) - fps) * 0.05;

    // Update the 3 specialized rovers and their autonomous mission routines
    swarm.update(dt, input.read());

    const active = swarm.getActiveRover();
    const activeMeshPos = active.mesh.position;

    // Directional shadow frustum follows active rover
    sun.position.copy(activeMeshPos).add(sunDir.clone().multiplyScalar(5000));
    sun.target.position.copy(activeMeshPos);

    rig.update(dt, activeMeshPos);
    renderer.render(scene, camera);

    const [lon, lat] = frame.projToLonLat(active.physics.X, active.physics.Y);
    hud.update({
      rover: active,
      lon,
      lat,
      X: active.physics.X,
      Y: active.physics.Y,
      elev: active.physics.elevation,
      slope: active.physics.slopeDeg,
      heading: active.physics.heading,
      speed: active.physics.speed,
      status: active.physics.status,
      fps,
    });
  });
}

const sunDir = new THREE.Vector3();
function updateSun() {
  const el = +document.getElementById('sunEl').value * Math.PI / 180;
  const az = +document.getElementById('sunAz').value * Math.PI / 180;
  sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
}

function startRovers() {
  const [X, Y] = frame.lonLatToProj(...CONFIG.startLonLat);
  swarm.spawnAt(X, Y, 0);

  const active = swarm.getActiveRover();
  const w = frame.toWorld(active.physics.X, active.physics.Y, active.physics.elevation);
  rig.placeBehind(new THREE.Vector3(w.x, w.y, w.z), 0);
  hud.updateRoverSelection(swarm.activeIndex, active);
}

main();
