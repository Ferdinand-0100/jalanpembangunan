import * as THREE from 'three';
import { getNasaWormTexture, getNasaMeatballTexture, getNasaContainerTexture } from './nasaDecals.js';

/* =========================================================================
 * CENTRALIZED DIMENSIONS — single source of truth.
 * Coordinate convention: forward = -Z, right = +X, up = +Y, ground plane y=0.
 * Wheel axle axis = X. All placement below is derived from these values.
 * ========================================================================= */
export const ROVER_DIMENSIONS = Object.freeze({
  chassis: { width: 1.56, height: 0.52, length: 2.24, centerY: 0.92, bevel: 0.05 },
  deck:    { width: 1.44, thickness: 0.04, length: 1.96, topY: 1.22 },
  skid:    { width: 1.30, height: 0.10, length: 2.00, centerY: 0.60 },
  bumper:  { width: 1.50, height: 0.34, depth: 0.30, y: 0.80, z: -1.22 },
  rearStep:{ width: 1.40, height: 0.22, depth: 0.42, y: 0.98, z: 1.28 },
  wheel:   { radius: 0.40, width: 0.34, trackX: 1.30, frontZ: -1.22, midZ: 0.12, rearZ: 1.32 },
  suspension: { armX: 1.04, armThickness: 0.07, pivotY: 0.98, pivotZ: -0.12,
                bogieY: 0.72, bogieZ: 0.52, diffY: 1.26 },
  mast:    { x: 0.45, z: -0.82, transportX: 0.0, transportZ: -0.98, headLift: 1.08 },
  rtg:     { y: 1.06, z: 1.46, transportZ: 1.70, tilt: 0.45, radius: 0.20, length: 0.62, finRadius: 0.34 },
  panel:   { thickness: 0.02, height: 0.34, standoff: 0.005 },
  decal:   { plaqueThickness: 0.012, airGap: 0.004 },
  cleat:   { stations: 24, length: 0.17, height: 0.024, depth: 0.05, skew: 0.42, xOff: 0.070, lift: 0.012 },
});

const DETAIL_LEVELS = {
  high:   { wheelSeg: 48, cleatStations: 24, cylSeg: 16, sphereSeg: 20 },
  medium: { wheelSeg: 28, cleatStations: 16, cylSeg: 10, sphereSeg: 12 },
};

/* ------------------------- geometry factory (cached) ------------------------- */
function makeGeometryFactory() {
  const cache = new Map();
  const get = (key, make) => {
    let g = cache.get(key);
    if (!g) { g = make(); cache.set(key, g); }
    return g;
  };
  const roundedBox = (w, h, d, r) => get(`rb${w},${h},${d},${r}`, () => {
    const b = Math.min(0.025, h * 0.24, w * 0.24, d * 0.24);
    const sw = w - 2 * b, sd = d - 2 * b, cr = Math.max(r - b, 0.008);
    const s = new THREE.Shape();
    const x = -sw / 2, y = -sd / 2;
    s.moveTo(x + cr, y);
    s.lineTo(x + sw - cr, y);       s.quadraticCurveTo(x + sw, y, x + sw, y + cr);
    s.lineTo(x + sw, y + sd - cr);  s.quadraticCurveTo(x + sw, y + sd, x + sw - cr, y + sd);
    s.lineTo(x + cr, y + sd);       s.quadraticCurveTo(x, y + sd, x, y + sd - cr);
    s.lineTo(x, y + cr);            s.quadraticCurveTo(x, y, x + cr, y);
    const g = new THREE.ExtrudeGeometry(s, {
      depth: h - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b,
      bevelSegments: 2, steps: 1, curveSegments: 4,
    });
    g.center();
    g.rotateX(-Math.PI / 2); // extrusion axis +Z -> +Y
    return g;
  });
  return {
    box:   (w, h, d) => get(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)),
    plane: (w, h)    => get(`p${w},${h}`, () => new THREE.PlaneGeometry(w, h)),
    cylY:  (r, h, seg = 16, open = false) => get(`cy${r},${h},${seg},${open}`, () => new THREE.CylinderGeometry(r, r, h, seg, 1, open)),
    cylX:  (r, h, seg = 16, open = false) => get(`cx${r},${h},${seg},${open}`, () => new THREE.CylinderGeometry(r, r, h, seg, 1, open).rotateZ(Math.PI / 2)),
    cylZ:  (r, h, seg = 16, open = false) => get(`cz${r},${h},${seg},${open}`, () => new THREE.CylinderGeometry(r, r, h, seg, 1, open).rotateX(Math.PI / 2)),
    coneY: (rt, rb, h, seg = 12) => get(`co${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)),
    torusX:(R, t, seg = 40) => get(`tx${R},${t},${seg}`, () => new THREE.TorusGeometry(R, t, 8, seg).rotateY(Math.PI / 2)),
    torusZ:(R, t, seg = 40) => get(`tz${R},${t},${seg}`, () => new THREE.TorusGeometry(R, t, 8, seg)),
    ringX: (ri, ro, seg = 40) => get(`rx${ri},${ro},${seg}`, () => new THREE.RingGeometry(ri, ro, seg).rotateY(Math.PI / 2)),
    sphere:(r, seg = 16) => get(`s${r},${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(8, Math.round(seg * 0.7)))),
    roundedBox,
    cache,
  };
}

/* ------------------------- procedural texture helpers ------------------------- */
function makeFoilBumpTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 260; i++) {
    const v = 108 + Math.floor(Math.random() * 40);
    ctx.strokeStyle = `rgb(${v},${v},${v})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    const x = Math.random() * 128, y = Math.random() * 128, a = Math.random() * Math.PI;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * (6 + Math.random() * 18), y + Math.sin(a) * (6 + Math.random() * 18));
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 4);
  return t;
}

function makeSolarCellTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0e1c36'; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#24466e'; ctx.lineWidth = 3;
  for (let i = 0; i <= 8; i++) {
    const p = i * 32;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(256, p); ctx.stroke();
  }
  ctx.strokeStyle = '#54687f'; ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const p = i * 32 + 16;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 256); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 2);
  return t;
}

function makeSerialPlacardTexture(name, callsign, role, accent) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const ctx = c.getContext('2d');
  const hex = '#' + accent.toString(16).padStart(6, '0');
  ctx.fillStyle = '#17191c'; ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = hex; ctx.lineWidth = 4; ctx.strokeRect(4, 4, 504, 120);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8e6df'; ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('NASA / JPL \u00b7 CALTECH', 256, 36);
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(String(name).toUpperCase(), 256, 74);
  ctx.fillStyle = hex; ctx.font = '20px monospace';
  ctx.fillText(`MSN-${callsign} \u00b7 ${String(role).toUpperCase()}`, 256, 106);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function textureAspect(tex, fallback) {
  if (tex && tex.image && tex.image.width && tex.image.height) return tex.image.width / tex.image.height;
  return fallback;
}

function makeDecalMaterial(tex, transparent) {
  if (tex) tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({
    map: tex, transparent: !!transparent,
    roughness: 0.4, metalness: 0.05,
    emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.15,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
}

/* ------------------------- centralized material library ------------------------- */
function createMaterials(accent) {
  const foilBump = makeFoilBumpTexture();
  const solarTex = makeSolarCellTexture();
  const std = (p) => new THREE.MeshStandardMaterial(p);
  return {
    body:      std({ color: 0xe8e6df, roughness: 0.42, metalness: 0.15, envMapIntensity: 0.7 }),
    darkTi:    std({ color: 0x2a2d31, roughness: 0.55, metalness: 0.80, envMapIntensity: 0.8 }),
    graphite:  std({ color: 0x17181b, roughness: 0.70, metalness: 0.60, envMapIntensity: 0.5 }),
    aluminum:  std({ color: 0xb8bcc2, roughness: 0.35, metalness: 0.90, envMapIntensity: 1.0 }),
    steel:     std({ color: 0x8f959c, roughness: 0.45, metalness: 0.95, envMapIntensity: 1.0 }),
    goldFoil:  std({ color: 0xc9a227, roughness: 0.32, metalness: 0.90, envMapIntensity: 1.1,
                     bumpMap: foilBump, bumpScale: 0.015 }),
    wheelMetal:std({ color: 0x3a3d42, roughness: 0.50, metalness: 0.85, envMapIntensity: 0.9 }),
    cleatMetal:std({ color: 0x5a5e66, roughness: 0.45, metalness: 0.90, envMapIntensity: 0.9 }),
    lens:      std({ color: 0x0a1420, roughness: 0.08, metalness: 0.90, envMapIntensity: 1.4,
                     emissive: 0x0a2438, emissiveIntensity: 0.25 }),
    headlight: std({ color: 0xfff6dd, roughness: 0.30, metalness: 0.10,
                     emissive: 0xfff2cc, emissiveIntensity: 1.1 }),
    accent:    std({ color: accent, roughness: 0.35, metalness: 0.20,
                     emissive: accent, emissiveIntensity: 0.9 }),
    redMarker: std({ color: 0x551111, roughness: 0.40, metalness: 0.20,
                     emissive: 0xff2222, emissiveIntensity: 0.8 }),
    solar:     std({ color: 0xffffff, map: solarTex, roughness: 0.22, metalness: 0.70, envMapIntensity: 1.2 }),
    container: std({ color: 0x343b41, roughness: 0.45, metalness: 0.75, envMapIntensity: 0.8 }),
    hazard:    std({ color: 0xd7a31a, roughness: 0.50, metalness: 0.30 }),
    cargoGlow: std({ color: 0x1f8f5f, roughness: 0.35, metalness: 0.20,
                     emissive: 0x27c07f, emissiveIntensity: 0.8 }),
    tubeEmpty: std({ color: 0x333333, roughness: 0.70, metalness: 0.50 }),
    flame:     new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.5, depthWrite: false }),
    scanRing:  new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.30,
                     side: THREE.DoubleSide, depthWrite: false }),
    laser:     new THREE.MeshBasicMaterial({ color: 0xff1144, transparent: true, opacity: 0.7, depthWrite: false }),
  };
}

/* =========================================================================
 * ROVER BUILDER
 * Preserves the original public API: createRoverModel(opts) -> THREE.Group
 * with userData { groundOffset, role, name, callsign, missionTitle,
 * tagSprite, roleHooks } plus new { wheels, animationController, ... }.
 * ========================================================================= */
export function createRoverModel(opts = {}) {
  const {
    role = 'surface-mapping',
    accent = 0x00d4ff,
    name = 'Ares Mapper',
    callsign = '01',
    missionTitle = 'Surface Mapping & Exploration',
    detailLevel = 'high',
    headlights = true,
  } = opts;

  const D = DETAIL_LEVELS[detailLevel] || DETAIL_LEVELS.high;
  const C = ROVER_DIMENSIONS;
  const M = createMaterials(accent);
  const G = makeGeometryFactory();

  const group = new THREE.Group();
  group.name = `Rover_${callsign}_${role}`;

  const chassisAssembly = new THREE.Group();      chassisAssembly.name = 'ChassisAssembly';
  const suspensionAssembly = new THREE.Group();   suspensionAssembly.name = 'SuspensionAssembly';
  const mastAssembly = new THREE.Group();         mastAssembly.name = 'MastAssembly';
  const powerSystem = new THREE.Group();          powerSystem.name = 'PowerSystem';
  const roleEquipment = new THREE.Group();        roleEquipment.name = 'RoleSpecificEquipment';
  const lightingAssembly = new THREE.Group();     lightingAssembly.name = 'LightingAssembly';
  const identification = new THREE.Group();       identification.name = 'IdentificationAssembly';
  group.add(chassisAssembly, suspensionAssembly, mastAssembly, powerSystem, roleEquipment, lightingAssembly, identification);

  /* ----------------------------- local helpers ----------------------------- */
  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const decal = (geo, mat, parent, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = false; m.receiveShadow = false; m.renderOrder = 2;
    parent.add(m);
    return m;
  };
  const _up = new THREE.Vector3(0, 1, 0);
  const beam = (parent, mat, ax, ay, az, bx, by, bz, t) => {
    const a = new THREE.Vector3(ax, ay, az), b = new THREE.Vector3(bx, by, bz);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const m = new THREE.Mesh(G.box(t, Math.round(len * 1e4) / 1e4, t), mat);
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(_up, dir.normalize());
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const _dummy = new THREE.Object3D();
  const instanced = (geo, mat, parent, placements) => {
    const im = new THREE.InstancedMesh(geo, mat, placements.length);
    placements.forEach((p, i) => {
      _dummy.position.set(p[0], p[1], p[2]);
      _dummy.rotation.set(p[3] || 0, p[4] || 0, p[5] || 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      im.setMatrixAt(i, _dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    im.castShadow = true; im.receiveShadow = true;
    parent.add(im);
    return im;
  };

  const hw = C.chassis.width / 2, hl = C.chassis.length / 2;
  const deckTop = C.deck.topY;

  /* ============================ 1. CHASSIS ============================ */
  // Warm Electronics Box — beveled aerospace hull
  mesh(G.roundedBox(C.chassis.width, C.chassis.height, C.chassis.length, C.chassis.bevel),
       M.body, chassisAssembly, 0, C.chassis.centerY, 0);
  // Lower protective skid plate + standoffs
  mesh(G.roundedBox(C.skid.width, C.skid.height, C.skid.length, 0.03), M.darkTi, chassisAssembly, 0, C.skid.centerY, 0);
  for (const sx of [-0.45, 0.45]) for (const sz of [-0.7, 0.7])
    mesh(G.box(0.10, 0.06, 0.10), M.graphite, chassisAssembly, sx, 0.655, sz);
  // Gold MLI equipment deck + aluminum edge rails
  mesh(G.box(C.deck.width, C.deck.thickness, C.deck.length), M.goldFoil, chassisAssembly, 0, deckTop - C.deck.thickness / 2, 0);
  for (const sz of [-1, 1]) mesh(G.box(C.deck.width + 0.02, 0.02, 0.04), M.aluminum, chassisAssembly, 0, deckTop + 0.008, sz * (C.deck.length / 2 - 0.02));
  for (const sx of [-1, 1]) mesh(G.box(0.04, 0.02, C.deck.length), M.aluminum, chassisAssembly, sx * (C.deck.width / 2 - 0.02), deckTop + 0.008, 0);
  // Front bumper / rear equipment step
  mesh(G.roundedBox(C.bumper.width, C.bumper.height, C.bumper.depth, 0.04), M.darkTi, chassisAssembly, 0, C.bumper.y, C.bumper.z);
  mesh(G.roundedBox(C.rearStep.width, C.rearStep.height, C.rearStep.depth, 0.03), M.darkTi, chassisAssembly, 0, C.rearStep.y, C.rearStep.z);
  // Reinforced corner brackets
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    mesh(G.box(0.06, 0.44, 0.06), M.darkTi, chassisAssembly, sx * (hw - 0.01), C.chassis.centerY, sz * (hl - 0.02));

  // Replaceable side panels (3 per side, real seams) + fastener rows
  const panelX = hw + C.panel.standoff + C.panel.thickness / 2;
  const panelFace = panelX + C.panel.thickness / 2;
  const panelDefs = [{ z: -0.74, len: 0.52 }, { z: -0.06, len: 0.64 }, { z: 0.66, len: 0.52 }];
  const fastenerPos = [];
  for (const s of [-1, 1]) {
    for (const p of panelDefs) {
      mesh(G.box(C.panel.thickness, C.panel.height, p.len), M.body, chassisAssembly, s * panelX, C.chassis.centerY, p.z);
      for (const dy of [-0.14, 0.14]) for (const dz of [-(p.len / 2 - 0.04), p.len / 2 - 0.04])
        fastenerPos.push([s * (panelFace + 0.004), C.chassis.centerY + dy, p.z + dz]);
    }
    // cable access ports with glands
    mesh(G.cylX(0.03, 0.03, 12), M.graphite, chassisAssembly, s * (panelFace + 0.008), 0.78, 0.35);
    mesh(G.torusX(0.03, 0.008, 20), M.steel, chassisAssembly, s * (panelFace + 0.02), 0.78, 0.35);
  }
  instanced(G.cylX(0.011, 0.01, 8), M.steel, chassisAssembly, fastenerPos);
  // deck fastener ring
  const deckBolts = [];
  for (let i = 0; i < 6; i++) {
    const z = -0.85 + i * 0.34;
    deckBolts.push([-(C.deck.width / 2 - 0.06), deckTop + 0.006, z], [C.deck.width / 2 - 0.06, deckTop + 0.006, z]);
  }
  instanced(G.cylY(0.012, 0.012, 8), M.steel, chassisAssembly, deckBolts);
  // rear heat-dissipation louvers (purposeful, restrained)
  const louvers = [];
  for (let i = 0; i < 5; i++) for (const sx of [-0.40, 0.40])
    louvers.push([sx, 0.90 + i * 0.03, C.rearStep.z + C.rearStep.depth / 2 + 0.004]);
  instanced(G.box(0.28, 0.014, 0.012), M.graphite, chassisAssembly, louvers);
  // avionics / electronics bays on deck (clear of the differential bar at z=-0.12)
  mesh(G.roundedBox(0.46, 0.10, 0.60, 0.02), M.darkTi, chassisAssembly, -0.35, deckTop + 0.05, 0.35);
  mesh(G.roundedBox(0.36, 0.08, 0.44, 0.02), M.body, chassisAssembly, 0.38, deckTop + 0.04, 0.42);
  for (let i = 0; i < 3; i++) mesh(G.cylY(0.02, 0.03, 10), M.steel, chassisAssembly, -0.45 + i * 0.10, deckTop + 0.115, 0.50);
  // service hatch detail on left front panel
  mesh(G.box(0.012, 0.20, 0.30), M.darkTi, chassisAssembly, -(panelFace + 0.006), 0.92, -0.74);
  mesh(G.box(0.02, 0.03, 0.10), M.steel, chassisAssembly, -(panelFace + 0.016), 0.92, -0.62);

  /* ====================== 2. NASA IDENTIFICATION ====================== */
  const wormTex = getNasaWormTexture();
  const meatballTex = getNasaMeatballTexture();
  const wormMat = makeDecalMaterial(wormTex, false);
  const meatballMat = makeDecalMaterial(meatballTex, true);
  const wormAspect = textureAspect(wormTex, 3.55);

  // RIGHT side: primary NASA worm placard, aspect derived from the actual texture
  const rh = 0.15, rw = Math.min(0.58, rh * wormAspect);
  const plaqueX = panelFace + C.decal.plaqueThickness / 2 + 0.001;
  mesh(G.box(C.decal.plaqueThickness, rh + 0.05, rw + 0.05), M.graphite, identification, plaqueX, 0.92, -0.06);
  const rDecal = decal(G.plane(rw, rh), wormMat, identification, plaqueX + C.decal.plaqueThickness / 2 + C.decal.airGap, 0.92, -0.06);
  rDecal.rotation.y = Math.PI / 2;
  // mission serial strip under the worm (text placard, official logos untouched)
  const serialTex = makeSerialPlacardTexture(name, callsign, role, accent);
  const serialMat = makeDecalMaterial(serialTex, false);
  const rSerial = decal(G.plane(0.24, 0.06), serialMat, identification, panelFace + C.decal.airGap, 0.785, -0.06);
  rSerial.rotation.y = Math.PI / 2;

  // LEFT side: small meatball + serial (restrained)
  mesh(G.cylX(0.075, 0.012, 24), M.graphite, identification, -plaqueX, 0.92, -0.74);
  const lBall = decal(G.plane(0.13, 0.13), meatballMat, identification, -(plaqueX + C.decal.plaqueThickness / 2 + C.decal.airGap), 0.92, -0.74);
  lBall.rotation.y = -Math.PI / 2;
  const lSerial = decal(G.plane(0.44, 0.11), serialMat, identification, -(panelFace + C.decal.airGap), 0.92, -0.06);
  lSerial.rotation.y = -Math.PI / 2;

  // REAR worm placard (visible while following the rover)
  const rearZ = C.rearStep.z + C.rearStep.depth / 2;
  const bh = 0.12, bw = Math.min(0.50, bh * wormAspect);
  mesh(G.box(bw + 0.04, bh + 0.04, C.decal.plaqueThickness), M.graphite, identification, 0, C.rearStep.y, rearZ + C.decal.plaqueThickness / 2 + 0.001);
  decal(G.plane(bw, bh), wormMat, identification, 0, C.rearStep.y, rearZ + C.decal.plaqueThickness + C.decal.airGap);

  // FRONT meatball badge on bumper
  const frontZ = C.bumper.z - C.bumper.depth / 2;
  mesh(G.cylZ(0.10, 0.015, 24), M.graphite, identification, 0, C.bumper.y, frontZ - 0.008);
  const fBall = decal(G.plane(0.17, 0.17), meatballMat, identification, 0, C.bumper.y, frontZ - 0.016 - C.decal.airGap);
  fBall.rotation.y = Math.PI;

  // TOP deck stencil (small, for top-down inspection)
  const topDecal = decal(G.plane(0.40, 0.40 / wormAspect), wormMat, identification, 0, deckTop + 0.006, 0.85);
  topDecal.rotation.x = -Math.PI / 2;

  /* ================= 3. ROCKER-BOGIE SUSPENSION + WHEELS ================= */
  const S = C.suspension, W = C.wheel;
  const wheels = [];
  const suspensionRefs = {};

  // Differential: cross-bar + gearbox + drop links to both rocker pivots
  mesh(G.cylX(0.03, S.armX * 2, 12), M.darkTi, suspensionAssembly, 0, S.diffY, S.pivotZ);
  mesh(G.roundedBox(0.26, 0.14, 0.20, 0.02), M.darkTi, suspensionAssembly, 0, S.diffY + 0.02, S.pivotZ);
  for (const s of [-1, 1])
    mesh(G.cylY(0.025, S.diffY - S.pivotY, 10), M.steel, suspensionAssembly, s * S.armX, (S.diffY + S.pivotY) / 2, S.pivotZ);

  function createWheel(side, station, parent, lx, ly, lz) {
    const pivot = new THREE.Group();                 // steering yaw (corner wheels)
    pivot.name = `WheelPivot_${side < 0 ? 'L' : 'R'}_${station}`;
    pivot.position.set(lx, ly, lz);
    const spin = new THREE.Group();                  // rolling rotation about local X
    spin.name = `WheelRotationGroup_${side < 0 ? 'L' : 'R'}_${station}`;
    pivot.add(spin);
    parent.add(pivot);

    const r = W.radius, w2 = W.width / 2, seg = D.wheelSeg;
    mesh(G.cylX(r, W.width, seg, true), M.wheelMetal, spin);                 // outer tread barrel
    mesh(G.cylX(r - 0.045, W.width - 0.03, seg, true), M.graphite, spin);    // inner drum
    for (const fx of [-1, 1]) {
      const face = mesh(G.ringX(0.14, r - 0.005, seg), M.wheelMetal, spin, fx * (w2 - 0.004), 0, 0);
      if (fx < 0) face.rotation.y = Math.PI;                                 // outward-facing normals
      mesh(G.torusX(r - 0.006, 0.012, seg), M.aluminum, spin, fx * (w2 - 0.006), 0, 0); // rim lip
    }
    // radial spokes on both faces (recessed), instanced
    const spokes = [];
    for (const fx of [-1, 1]) for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + (fx > 0 ? 0 : Math.PI / 6);
      spokes.push([fx * (w2 - 0.05), 0.20 * Math.cos(a), 0.20 * Math.sin(a), a, 0, 0]);
    }
    instanced(G.box(0.04, 0.20, 0.05), M.aluminum, spin, spokes);
    // hub, cap, bolt circle, axle stub (axle points inboard toward the arm)
    mesh(G.cylX(0.10, 0.09, 20), M.aluminum, spin, side * (w2 - 0.045), 0, 0);
    mesh(G.cylX(0.055, 0.03, 16), M.darkTi, spin, side * (w2 + 0.002), 0, 0);
    const bolts = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      bolts.push([side * (w2 + 0.005), 0.075 * Math.cos(a), 0.075 * Math.sin(a)]);
    }
    instanced(G.cylX(0.012, 0.015, 8), M.steel, spin, bolts);
    mesh(G.cylX(0.04, 0.16, 12), M.steel, spin, -side * (w2 + 0.05), 0, 0);
    // chevron cleats — one InstancedMesh per wheel, verified against tire surface
    const CL = C.cleat, n = D.cleatStations;
    const placements = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const R = r + CL.lift;
      placements.push([-CL.xOff, R * Math.cos(a), R * Math.sin(a), a, CL.skew, 0]);
      placements.push([ CL.xOff, R * Math.cos(a), R * Math.sin(a), a, -CL.skew, 0]);
    }
    instanced(G.box(CL.length, CL.height, CL.depth), M.cleatMetal, spin, placements);

    const entry = { pivot, spin, side, station, x: side * W.trackX, radius: r };
    wheels.push(entry);
    return entry;
  }

  for (const s of [-1, 1]) {
    const sideKey = s < 0 ? 'left' : 'right';
    // chassis mount bracket bridging hull side -> rocker plane
    mesh(G.box(0.30, 0.10, 0.14), M.darkTi, suspensionAssembly, s * (hw + 0.12), S.pivotY, S.pivotZ);

    const rocker = new THREE.Group();
    rocker.name = `RockerAssembly_${sideKey}`;
    rocker.position.set(s * S.armX, S.pivotY, S.pivotZ);
    suspensionAssembly.add(rocker);
    mesh(G.cylX(0.09, 0.12, 16), M.aluminum, rocker);            // pivot housing
    mesh(G.cylX(0.045, 0.14, 12), M.darkTi, rocker);             // pivot cap

    const fL = { y: W.radius - S.pivotY, z: W.frontZ - S.pivotZ };
    const bL = { y: S.bogieY - S.pivotY, z: S.bogieZ - S.pivotZ };
    beam(rocker, M.darkTi, 0, 0, 0, 0, fL.y, fL.z, S.armThickness);          // rocker -> front hub
    beam(rocker, M.darkTi, 0, 0, 0, 0, bL.y, bL.z, S.armThickness);          // rocker -> bogie pivot
    mesh(G.cylX(0.07, 0.09, 14), M.steel, rocker, 0, fL.y, fL.z);            // front bearing housing
    const dx = s * (W.trackX - S.armX);
    createWheel(s, 'front', rocker, dx, fL.y, fL.z);

    const bogie = new THREE.Group();
    bogie.name = `BogieAssembly_${sideKey}`;
    bogie.position.set(0, bL.y, bL.z);
    rocker.add(bogie);
    mesh(G.cylX(0.07, 0.10, 14), M.aluminum, bogie);
    const mL = { y: W.radius - S.bogieY, z: W.midZ - S.bogieZ };
    const rL = { y: W.radius - S.bogieY, z: W.rearZ - S.bogieZ };
    beam(bogie, M.darkTi, 0, 0, 0, 0, mL.y, mL.z, S.armThickness * 0.85);
    beam(bogie, M.darkTi, 0, 0, 0, 0, rL.y, rL.z, S.armThickness * 0.85);
    mesh(G.cylX(0.07, 0.09, 14), M.steel, bogie, 0, mL.y, mL.z);
    mesh(G.cylX(0.07, 0.09, 14), M.steel, bogie, 0, rL.y, rL.z);
    createWheel(s, 'mid', bogie, dx, mL.y, mL.z);
    createWheel(s, 'rear', bogie, dx, rL.y, rL.z);

    suspensionRefs[sideKey] = { rocker, bogie };
  }

  /* ============================ 4. MAST ============================ */
  const isTransport = role === 'transport-support';
  const mastX = isTransport ? C.mast.transportX : C.mast.x;
  const mastZ = isTransport ? C.mast.transportZ : C.mast.z;
  mastAssembly.position.set(mastX, deckTop, mastZ);
  mesh(G.roundedBox(0.26, 0.05, 0.26, 0.015), M.darkTi, mastAssembly, 0, 0.025, 0);
  instanced(G.cylY(0.012, 0.02, 8), M.steel, mastAssembly,
    [[-0.09, 0.055, -0.09], [0.09, 0.055, -0.09], [-0.09, 0.055, 0.09], [0.09, 0.055, 0.09]]);
  mesh(G.box(0.10, 0.58, 0.10), M.body, mastAssembly, 0, 0.34, 0);
  mesh(G.cylY(0.018, 0.56, 10), M.graphite, mastAssembly, 0.065, 0.34, 0.02);   // cable conduit
  for (let i = 0; i < 3; i++) mesh(G.box(0.03, 0.02, 0.05), M.steel, mastAssembly, 0.055, 0.16 + i * 0.18, 0.02);
  mesh(G.cylX(0.07, 0.16, 16), M.aluminum, mastAssembly, 0, 0.66, 0);            // elevation joint
  mesh(G.cylX(0.03, 0.18, 10), M.darkTi, mastAssembly, 0, 0.66, 0);
  mesh(G.box(0.08, 0.34, 0.08), M.body, mastAssembly, 0, 0.86, 0);

  const mastHead = new THREE.Group();
  mastHead.name = 'InstrumentHead';
  mastHead.position.set(0, C.mast.headLift, 0);
  mastAssembly.add(mastHead);
  mesh(G.roundedBox(0.50, 0.20, 0.24, 0.03), M.body, mastHead);
  mesh(G.box(0.52, 0.03, 0.26), M.darkTi, mastHead, 0, 0.115, 0);
  for (const xo of [-0.16, 0.16]) {                                              // stereo Mastcam barrels
    mesh(G.cylZ(0.055, 0.14, 20), M.darkTi, mastHead, xo, 0, -0.17);
    mesh(G.torusZ(0.055, 0.008, 24), M.aluminum, mastHead, xo, 0, -0.245);
    mesh(G.cylZ(0.042, 0.015, 20), M.lens, mastHead, xo, 0, -0.245);
    mesh(G.cylZ(0.02, 0.01, 12), M.graphite, mastHead, xo, 0, -0.252);
  }
  mesh(G.cylZ(0.03, 0.10, 14), M.steel, mastHead, 0, 0.02, -0.15);               // central laser aperture
  mesh(G.cylZ(0.018, 0.012, 12), M.accent, mastHead, 0, 0.02, -0.205);
  for (const xo of [-0.36, 0.36]) {                                              // MEDA booms
    mesh(G.cylX(0.010, 0.30, 8), M.steel, mastHead, xo, 0.02, 0.04);
    mesh(G.box(0.03, 0.03, 0.06), M.darkTi, mastHead, xo + Math.sign(xo) * 0.16, 0.02, 0.04);
  }
  mesh(G.cylZ(0.02, 0.015, 10), M.accent, mastHead, 0.18, 0.05, 0.125);          // mast status light

  /* ============================ 5. MMRTG ============================ */
  const rtgZ = isTransport ? C.rtg.transportZ : C.rtg.z;
  if (isTransport) mesh(G.box(0.50, 0.08, 0.50), M.darkTi, powerSystem, 0, 1.02, rtgZ - 0.08); // rear extension plate
  mesh(G.box(0.16, 0.10, 0.20), M.darkTi, powerSystem, 0, C.rtg.y - 0.02, rtgZ - 0.06);        // mount bracket
  const mmrtg = new THREE.Group();
  mmrtg.position.set(0, C.rtg.y, rtgZ);
  mmrtg.rotation.x = C.rtg.tilt;
  powerSystem.add(mmrtg);
  mesh(G.cylY(C.rtg.radius, C.rtg.length, 20), M.darkTi, mmrtg, 0, C.rtg.length / 2, 0);
  const finPlacements = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    finPlacements.push([0.25 * Math.sin(a), C.rtg.length / 2, 0.25 * Math.cos(a), 0, a, 0]);
  }
  instanced(G.box(0.024, 0.56, 0.18), M.darkTi, mmrtg, finPlacements);
  mesh(G.coneY(0.16, C.rtg.radius, 0.07, 20), M.aluminum, mmrtg, 0, C.rtg.length + 0.035, 0);
  mesh(G.cylY(0.03, 0.10, 10), M.graphite, mmrtg, 0, -0.03, 0);                  // cable gland into bracket

  /* ==================== 6. LIGHTING / NAV / BEACON ==================== */
  const headlightSpots = [];
  for (const s of [-1, 1]) {
    // front hazcam stereo pair
    mesh(G.box(0.20, 0.12, 0.10), M.darkTi, chassisAssembly, s * 0.50, 0.86, C.bumper.z - C.bumper.depth / 2 - 0.01);
    for (const xo of [-0.05, 0.05]) {
      mesh(G.cylZ(0.032, 0.03, 14), M.graphite, chassisAssembly, s * 0.50 + xo, 0.86, C.bumper.z - C.bumper.depth / 2 - 0.065);
      mesh(G.cylZ(0.024, 0.01, 14), M.lens, chassisAssembly, s * 0.50 + xo, 0.86, C.bumper.z - C.bumper.depth / 2 - 0.082);
    }
    // headlight housing + lens
    mesh(G.box(0.14, 0.09, 0.06), M.darkTi, lightingAssembly, s * 0.55, 0.99, C.bumper.z - C.bumper.depth / 2 + 0.01);
    const lensMesh = decal(G.plane(0.10, 0.06), M.headlight, lightingAssembly, s * 0.55, 0.99, C.bumper.z - C.bumper.depth / 2 - 0.022);
    lensMesh.rotation.y = Math.PI;
    if (headlights) {
      const spot = new THREE.SpotLight(0xfff2dd, 6, 7, 0.45, 0.7, 1.5);
      spot.position.set(s * 0.55, 0.99, C.bumper.z - C.bumper.depth / 2 - 0.03);
      spot.castShadow = false;
      spot.target.position.set(s * 0.55, 0.1, -4);
      lightingAssembly.add(spot, spot.target);
      headlightSpots.push(spot);
    }
    // rear navigation markers + rear hazcams
    mesh(G.cylZ(0.028, 0.02, 12), M.redMarker, lightingAssembly, s * 0.60, 1.04, rearZ + 0.004);
    mesh(G.box(0.14, 0.10, 0.08), M.darkTi, chassisAssembly, s * 0.42, 1.02, rearZ + 0.01);
    mesh(G.cylZ(0.026, 0.02, 12), M.lens, chassisAssembly, s * 0.42, 1.02, rearZ + 0.055);
  }
  // role beacon on a real bracket (no floating spheres)
  const beaconPos = isTransport ? [-0.55, 2.14, -0.30] : [-0.45, deckTop, 0.95];
  mesh(G.cylY(0.03, 0.10, 10), M.darkTi, lightingAssembly, beaconPos[0], beaconPos[1] + 0.05, beaconPos[2]);
  mesh(G.sphere(0.07, D.sphereSeg), M.accent, lightingAssembly, beaconPos[0], beaconPos[1] + 0.14, beaconPos[2]);

  /* ==================== 7. ROLE-SPECIFIC EQUIPMENT ==================== */
  const roleHooks = {};

  if (role === 'surface-mapping') {
    // Solar wings on real hinges + support struts
    for (const s of [-1, 1]) {
      const wing = new THREE.Group();
      wing.position.set(s * 0.74, deckTop + 0.02, 0);
      wing.rotation.z = -s * 0.12;
      roleEquipment.add(wing);
      for (const hz of [-0.55, 0.55]) mesh(G.cylZ(0.03, 0.10, 12), M.steel, wing, 0, 0, hz);
      mesh(G.roundedBox(0.92, 0.03, 1.42, 0.01), M.darkTi, wing, s * 0.46, 0, 0);
      mesh(G.box(0.88, 0.032, 1.38), M.solar, wing, s * 0.46, 0.001, 0);
      const ca = Math.cos(0.12), sa = Math.sin(0.12);
      for (const hz of [-0.55, 0.55]) {
        const px = s * (0.74 + 0.42 * ca), py = deckTop + 0.02 - 0.42 * sa - 0.02;
        beam(roleEquipment, M.steel, s * 0.60, deckTop, hz, px, py, hz, 0.025);
      }
    }
    // LiDAR on a bracket above the instrument head (no floating rings)
    const lidarSpin = new THREE.Group();
    lidarSpin.position.set(0, 0.13, 0.02);
    mastHead.add(lidarSpin);
    mesh(G.cylY(0.05, 0.05, 14), M.darkTi, lidarSpin, 0, 0.025, 0);
    const lidarRing = mesh(G.cylY(0.132, 0.03, 24), M.accent, lidarSpin, 0, 0.075, 0);
    const lidarDome = mesh(G.sphere(0.13, D.sphereSeg), M.darkTi, lidarSpin, 0, 0.14, 0);
    lidarDome.scale.y = 0.85;
    // forward terrain sensor bar
    mesh(G.box(0.70, 0.07, 0.10), M.darkTi, roleEquipment, 0, 1.16, -(hl + 0.01));
    const strip = decal(G.plane(0.60, 0.02), M.accent, roleEquipment, 0, 1.16, -(hl + 0.065));
    strip.rotation.y = Math.PI;
    // ground scan projection
    const scanRing = new THREE.Mesh(new THREE.RingGeometry(1.4, 3.0, 48), M.scanRing);
    scanRing.rotation.x = -Math.PI / 2;
    scanRing.position.set(0, 0.03, -1.2);
    scanRing.castShadow = false; scanRing.receiveShadow = false;
    roleEquipment.add(scanRing);
    roleHooks.scanRing = scanRing;
    roleHooks.lidarDome = lidarDome;
    roleHooks.lidarRing = lidarRing;
    roleHooks.lidarSpin = lidarSpin;

  } else if (role === 'geological-investigation') {
    // Sample carousel: drum outboard of the hull, sockets on the visible face
    mesh(G.box(0.10, 0.16, 0.20), M.darkTi, roleEquipment, hw + 0.05, 0.95, -0.35);
    const carousel = new THREE.Group();
    carousel.position.set(hw + 0.21, 0.95, -0.35);
    roleEquipment.add(carousel);
    mesh(G.cylX(0.24, 0.30, 24), M.aluminum, carousel);
    mesh(G.cylX(0.24, 0.015, 24), M.darkTi, carousel, 0.155, 0, 0);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const sy = 0.15 * Math.cos(a), sz = 0.15 * Math.sin(a);
      mesh(G.cylX(0.045, 0.03, 12), M.tubeEmpty, carousel, 0.165, sy, sz);
      mesh(G.torusX(0.045, 0.006, 16), M.steel, carousel, 0.182, sy, sz);
    }
    mesh(G.cylX(0.05, 0.04, 12), M.darkTi, carousel, 0.17, 0, 0);
    roleHooks.sampleCarousel = carousel;

    // Articulated coring drill: shoulder -> elbow -> wrist -> spinning bit
    mesh(G.box(0.22, 0.06, 0.22), M.darkTi, roleEquipment, -0.62, 1.00, -1.20);
    mesh(G.cylY(0.09, 0.10, 16), M.darkTi, roleEquipment, -0.62, 1.08, -1.20);
    const armGroup = new THREE.Group();                       // shoulder pitch (legacy hook name)
    armGroup.position.set(-0.62, 1.10, -1.20);
    roleEquipment.add(armGroup);
    mesh(G.cylX(0.08, 0.14, 16), M.aluminum, armGroup);
    mesh(G.box(0.07, 0.07, 0.55), M.body, armGroup, 0, 0, -0.275);
    const elbowGroup = new THREE.Group();
    elbowGroup.position.set(0, 0, -0.55);
    armGroup.add(elbowGroup);
    mesh(G.cylX(0.065, 0.12, 14), M.aluminum, elbowGroup);
    mesh(G.box(0.06, 0.06, 0.45), M.body, elbowGroup, 0, 0, -0.225);
    const wrist = new THREE.Group();
    wrist.position.set(0, 0, -0.45);
    elbowGroup.add(wrist);
    mesh(G.cylY(0.10, 0.20, 16), M.darkTi, wrist, 0, -0.10, 0);
    const drillBit = new THREE.Group();                       // local Y = drill axis
    drillBit.position.set(0, -0.22, 0);
    wrist.add(drillBit);
    mesh(G.cylY(0.045, 0.06, 12), M.steel, drillBit, 0, -0.03, 0);
    mesh(G.coneY(0.028, 0.05, 0.26, 12), M.steel, drillBit, 0, -0.13, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const flute = mesh(G.box(0.012, 0.22, 0.055), M.darkTi, drillBit, 0.035 * Math.sin(a), -0.13, 0.035 * Math.cos(a));
      flute.rotation.y = a;
    }
    mesh(G.coneY(0.001, 0.028, 0.06, 10), M.aluminum, drillBit, 0, -0.29, 0);
    armGroup.rotation.x = 0.9;                                // stowed pose (ground-clear, verified)
    elbowGroup.rotation.x = -1.9;
    roleHooks.armGroup = armGroup;
    roleHooks.elbowGroup = elbowGroup;
    roleHooks.drillBit = drillBit;

    // spectrometer laser (mast head -> ground), hidden until used
    const la = new THREE.Vector3(mastX, deckTop + C.mast.headLift, mastZ - 0.25);
    const lb = new THREE.Vector3(mastX, 0.02, mastZ - 1.7);
    const ldir = new THREE.Vector3().subVectors(lb, la);
    const laserBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, ldir.length(), 8), M.laser);
    laserBeam.position.copy(la).addScaledVector(ldir, 0.5);
    laserBeam.quaternion.setFromUnitVectors(_up, ldir.normalize());
    laserBeam.visible = false;
    laserBeam.castShadow = false; laserBeam.receiveShadow = false;
    roleEquipment.add(laserBeam);
    roleHooks.laserBeam = laserBeam;

  } else if (role === 'transport-support') {
    // Freight container seated ON the deck, clear of mast and RTG (verified)
    const container = new THREE.Group();
    container.position.set(0, deckTop, 0.40);
    roleEquipment.add(container);
    mesh(G.roundedBox(1.50, 0.92, 1.86, 0.03), M.container, container, 0, 0.46, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      mesh(G.box(0.06, 0.92, 0.06), M.darkTi, container, sx * 0.72, 0.46, sz * 0.90);
    const containerTex = getNasaContainerTexture();
    const containerMat = makeDecalMaterial(containerTex, false);
    const ch = 0.28, cw = Math.min(1.30, ch * textureAspect(containerTex, 3.8));
    for (const s of [-1, 1]) {
      mesh(G.box(0.02, 0.62, 1.70), M.body, container, s * 0.765, 0.46, 0);
      mesh(G.box(0.022, 0.05, 1.70), M.hazard, container, s * 0.766, 0.78, 0);
      const cd = decal(G.plane(cw, ch), containerMat, container, s * 0.782, 0.46, 0);
      cd.rotation.y = s * Math.PI / 2;
    }
    // rear doors on real hinges
    const doorL = new THREE.Group(); doorL.position.set(-0.72, 0.46, 0.93); container.add(doorL);
    const doorR = new THREE.Group(); doorR.position.set(0.72, 0.46, 0.93); container.add(doorR);
    mesh(G.box(0.70, 0.80, 0.03), M.darkTi, doorL, 0.35, 0, 0);
    mesh(G.box(0.70, 0.80, 0.03), M.darkTi, doorR, -0.35, 0, 0);
    for (const d of [doorL, doorR]) for (const hy of [-0.25, 0.25])
      mesh(G.cylY(0.02, 0.10, 10), M.steel, d, 0, hy, 0);
    mesh(G.box(1.40, 0.08, 0.05), M.steel, doorL, 0.72, 0, 0.04);
    mesh(G.sphere(0.035, 10), M.cargoGlow, doorR, -0.60, 0.30, 0.03);
    roleHooks.containerDoors = { left: doorL, right: doorR };
    // OPEN roof rack: specimen is actually visible when toggled
    for (const sx of [-0.35, 0.35]) mesh(G.box(0.05, 0.04, 1.20), M.aluminum, container, sx, 0.94, 0.35);
    for (const sz of [0.13, 0.57]) mesh(G.box(0.44, 0.06, 0.08), M.darkTi, container, 0, 0.99, sz);
    const cargoSpecimen = new THREE.Group();
    cargoSpecimen.position.set(0, 1.22, 0.35);
    container.add(cargoSpecimen);
    mesh(G.cylZ(0.20, 0.60, 20), M.aluminum, cargoSpecimen);
    mesh(G.cylZ(0.205, 0.10, 20), M.cargoGlow, cargoSpecimen);
    for (const sz of [-0.30, 0.30]) {
      const cap = mesh(G.sphere(0.20, 16), M.aluminum, cargoSpecimen, 0, 0, sz);
      cap.scale.z = 0.4;
    }
    cargoSpecimen.visible = false;
    roleHooks.cargoSpecimen = cargoSpecimen;
    roleHooks.containerGlow = M.cargoGlow;
    // front equipment lockers (mast passes between them)
    for (const s of [-1, 1]) {
      mesh(G.roundedBox(0.36, 0.42, 0.50, 0.02), M.darkTi, roleEquipment, s * 0.55, deckTop + 0.21, -0.85);
      const visor = decal(G.plane(0.28, 0.16), M.lens, roleEquipment, s * 0.55, deckTop + 0.25, -1.106);
      visor.rotation.y = Math.PI;
    }
    // radar on a bracket above the left locker
    mesh(G.cylY(0.05, 0.08, 12), M.darkTi, roleEquipment, -0.55, deckTop + 0.46, -0.85);
    const radarGroup = new THREE.Group();
    radarGroup.position.set(-0.55, deckTop + 0.50, -0.85);
    roleEquipment.add(radarGroup);
    mesh(G.coneY(0.10, 0.14, 0.08, 14), M.darkTi, radarGroup, 0, 0.04, 0);
    const radarDish = new THREE.Group();
    radarDish.position.set(0, 0.10, 0);
    radarGroup.add(radarDish);
    mesh(G.coneY(0.30, 0.10, 0.10, 20), M.body, radarDish, 0, 0.05, 0);
    mesh(G.cylY(0.025, 0.22, 10), M.steel, radarDish, 0, 0.16, 0);
    mesh(G.sphere(0.045, 12), M.accent, radarDish, 0, 0.28, 0);
    roleHooks.radarDish = radarDish;
    // rear thruster pods (legacy feature, hidden flames preserved)
    const boosterFlames = [];
    for (const sx of [-0.55, 0.55]) {
      const nozzle = mesh(G.coneY(0.14, 0.10, 0.18, 14), M.darkTi, roleEquipment, sx, 1.35, 1.40);
      nozzle.rotation.x = Math.PI / 2;
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.6, 12), M.flame);
      flame.rotation.x = Math.PI / 2;
      flame.position.set(sx, 1.35, 1.79);
      flame.visible = false;
      flame.castShadow = false; flame.receiveShadow = false;
      roleEquipment.add(flame);
      boosterFlames.push(flame);
    }
    roleHooks.boosterFlames = boosterFlames;
    // front bullbar
    beam(roleEquipment, M.steel, -0.70, 0.72, -1.42, 0.70, 0.72, -1.42, 0.05);
    for (const s of [-1, 1]) beam(roleEquipment, M.darkTi, s * 0.70, 0.72, -1.42, s * 0.60, 0.66, -1.35, 0.04);

    // Dual-tool sampling arm: yaw base -> shoulder -> elbow -> wrist -> claw/scoop
    mesh(G.box(0.20, 0.05, 0.20), M.darkTi, roleEquipment, 0.62, 0.995, -1.30);
    const samplingArmGroup = new THREE.Group();
    samplingArmGroup.position.set(0.62, 1.02, -1.30);
    roleEquipment.add(samplingArmGroup);
    mesh(G.cylY(0.10, 0.12, 16), M.darkTi, samplingArmGroup, 0, 0.06, 0);
    mesh(G.sphere(0.08, 14), M.aluminum, samplingArmGroup, 0, 0.14, 0);
    const upperArm = new THREE.Group();
    upperArm.position.set(0, 0.14, 0);
    upperArm.rotation.x = -0.4;
    samplingArmGroup.add(upperArm);
    mesh(G.box(0.07, 0.78, 0.07), M.body, upperArm, 0, 0.39, 0);
    mesh(G.cylY(0.02, 0.60, 10), M.steel, upperArm, 0.055, 0.35, 0.03);
    const forearmGroup = new THREE.Group();
    forearmGroup.position.set(0, 0.78, 0);
    upperArm.add(forearmGroup);
    mesh(G.sphere(0.065, 12), M.darkTi, forearmGroup);
    mesh(G.box(0.055, 0.62, 0.055), M.darkTi, forearmGroup, 0, 0.31, 0);
    const toolHead = new THREE.Group();
    toolHead.position.set(0, 0.62, 0);
    forearmGroup.add(toolHead);
    mesh(G.box(0.14, 0.10, 0.12), M.darkTi, toolHead, 0, 0.05, 0);
    mesh(G.sphere(0.025, 10), M.cargoGlow, toolHead, 0, 0.12, 0);
    const clawGroup = new THREE.Group();
    clawGroup.position.set(0, 0.10, 0);
    toolHead.add(clawGroup);
    const clawLeft = new THREE.Group();  clawLeft.position.set(-0.06, 0, 0);  clawGroup.add(clawLeft);
    const clawRight = new THREE.Group(); clawRight.position.set(0.06, 0, 0);   clawGroup.add(clawRight);
    mesh(G.box(0.025, 0.18, 0.05), M.steel, clawLeft, 0, 0.09, 0);
    mesh(G.box(0.025, 0.18, 0.05), M.steel, clawRight, 0, 0.09, 0);
    const tipL = mesh(G.coneY(0.001, 0.02, 0.07, 8), M.steel, clawLeft, 0.012, 0.20, 0);  tipL.rotation.z = -0.35;
    const tipR = mesh(G.coneY(0.001, 0.02, 0.07, 8), M.steel, clawRight, -0.012, 0.20, 0); tipR.rotation.z = 0.35;
    const scoopGroup = new THREE.Group();
    scoopGroup.position.set(0, 0.08, 0.10);
    toolHead.add(scoopGroup);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.06, 0.16, 16, 1, true, 0, Math.PI), M.steel);
    bowl.rotation.x = -Math.PI / 2;
    bowl.position.set(0, 0.06, 0);
    bowl.castShadow = true; bowl.receiveShadow = true;
    scoopGroup.add(bowl);
    const hose = mesh(G.cylY(0.018, 0.25, 10), M.graphite, scoopGroup, 0, -0.06, -0.05);
    hose.rotation.x = 0.4;
    roleHooks.samplingArmGroup = samplingArmGroup;
    roleHooks.upperArm = upperArm;
    roleHooks.forearmGroup = forearmGroup;
    roleHooks.toolHead = toolHead;
    roleHooks.clawGroup = clawGroup;
    roleHooks.clawLeft = clawLeft;
    roleHooks.clawRight = clawRight;
    roleHooks.scoopGroup = scoopGroup;
    roleHooks.samplingMode = 'idle';
    roleHooks.samplingProgress = 0;
  }

  /* ==================== 8. HUD TAG (unchanged API) ==================== */
  const sprite = createRoverTag(callsign, name, missionTitle, accent);
  sprite.position.set(0, 5.5, 0);
  sprite.scale.set(8.0, 3.4, 1);
  sprite.renderOrder = 999;
  group.add(sprite);

  /* ==================== 9. ANIMATION CONTROLLER ==================== */
  const animationController = createAnimationController({
    root: group, wheels, suspension: suspensionRefs, mastHead, role, roleHooks,
    materials: M, headlightSpots,
  });

  group.userData = {
    groundOffset: 0,
    role, name, callsign, missionTitle,
    tagSprite: sprite,
    roleHooks,
    wheels,
    wheelRadius: C.wheel.radius,
    suspension: suspensionRefs,
    mastHead,
    animationController,
    dimensions: C,
    dispose: () => disposeRoverModel(group),
  };
  return group;
}

/* =========================================================================
 * ANIMATION CONTROLLER
 * Single integration point for the existing movement system:
 *   rover.userData.animationController.update(deltaTime, {
 *     linearVelocity,   // m/s, positive = forward (-Z)
 *     angularVelocity,  // rad/s yaw about +Y
 *     steering,         // rad, corner-wheel Ackermann-style steering
 *   });
 * If velocities are omitted, displacement is derived from the root transform
 * (with a teleport guard), so transform-driven movement stays synchronized.
 * ========================================================================= */
function createAnimationController(ctx) {
  const { root, wheels, suspension, mastHead, role, roleHooks, materials, headlightSpots } = ctx;
  const TWO_PI = Math.PI * 2;
  const _pos = new THREE.Vector3(), _delta = new THREE.Vector3(), _fwd = new THREE.Vector3();
  const _q = new THREE.Quaternion(), _e = new THREE.Euler();
  const st = {
    movement: 'idle', task: null, taskTime: 0, time: 0,
    prevPos: new THREE.Vector3(), prevYaw: 0, hasPrev: false,
    steering: 0, scanPhase: 0, droveDrill: false, droveCargo: false, cargoP: 0,
  };
  const clamp = THREE.MathUtils.clamp;
  const damp = (cur, target, dt, rate = 6) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
  const yawOf = () => {
    root.getWorldQuaternion(_q);
    _e.setFromQuaternion(_q, 'YXZ');
    return _e.y;
  };

  function update(deltaTime, motion) {
    const dt = clamp(deltaTime || 0, 0, 0.1);
    if (dt <= 0) return;
    st.time += dt;
    let v = 0, yawRate = 0;
    if (motion && typeof motion.linearVelocity === 'number') {
      v = motion.linearVelocity;
      yawRate = motion.angularVelocity || 0;
      st.hasPrev = false;
    } else {
      root.getWorldPosition(_pos);
      const yaw = yawOf();
      if (!st.hasPrev) {
        st.prevPos.copy(_pos); st.prevYaw = yaw; st.hasPrev = true;
      } else {
        _delta.subVectors(_pos, st.prevPos);
        if (_delta.length() > 1.5) {
          v = 0; yawRate = 0;                       // teleport guard: no rotation jump
        } else {
          root.getWorldDirection(_fwd).multiplyScalar(-1); // forward = -Z
          v = _delta.dot(_fwd) / dt;
          let dy = yaw - st.prevYaw;
          dy = Math.atan2(Math.sin(dy), Math.cos(dy));
          yawRate = dy / dt;
        }
        st.prevPos.copy(_pos); st.prevYaw = yaw;
      }
    }
    // Rolling without slipping: dTheta = (v + yawRate * x) * dt / r
    for (const w of wheels) {
      const vw = v + yawRate * w.x;
      w.spin.rotation.x = (w.spin.rotation.x + (vw * dt) / w.radius) % TWO_PI;
    }
    if (motion && typeof motion.steering === 'number') api.setSteering(motion.steering);
    st.movement = Math.abs(v) > 0.01
      ? (v > 0 ? 'moving-forward' : 'moving-reverse')
      : (Math.abs(yawRate) > 0.05 ? 'turning' : 'idle');

    if (st.task) st.taskTime += dt;

    if (st.task === 'scanning') {
      st.scanPhase += dt;
      if (roleHooks.lidarSpin) roleHooks.lidarSpin.rotation.y += 2.4 * dt;
      else if (roleHooks.lidarDome) roleHooks.lidarDome.rotation.y += 2.4 * dt;
      if (roleHooks.radarDish) roleHooks.radarDish.rotation.y += 1.6 * dt;
      if (mastHead) mastHead.rotation.y = Math.sin(st.scanPhase * 0.6) * 0.45;
      if (roleHooks.scanRing) {
        const p = 0.5 + 0.5 * Math.sin(st.scanPhase * 2.0);
        roleHooks.scanRing.material.opacity = 0.18 + 0.22 * p;
        const s = 1 + 0.06 * p;
        roleHooks.scanRing.scale.set(s, s, 1);
      }
    }

    if (role === 'geological-investigation' && roleHooks.armGroup) {
      if (st.task === 'drilling') {
        st.droveDrill = true;
        const p = clamp(st.taskTime / 1.5, 0, 1);
        roleHooks.armGroup.rotation.x = damp(roleHooks.armGroup.rotation.x, 0.9 + (-0.30 - 0.9) * p, dt);
        roleHooks.elbowGroup.rotation.x = damp(roleHooks.elbowGroup.rotation.x, -1.9 + (-0.62 + 1.9) * p, dt);
        roleHooks.drillBit.rotation.y += 14 * dt;
        if (roleHooks.laserBeam) roleHooks.laserBeam.visible = p > 0.6;
      } else if (st.droveDrill) {
        roleHooks.armGroup.rotation.x = damp(roleHooks.armGroup.rotation.x, 0.9, dt);
        roleHooks.elbowGroup.rotation.x = damp(roleHooks.elbowGroup.rotation.x, -1.9, dt);
        if (roleHooks.laserBeam) roleHooks.laserBeam.visible = false;
        if (Math.abs(roleHooks.armGroup.rotation.x - 0.9) < 0.01) st.droveDrill = false;
      }
    }

    if (st.task === 'sampling' && role === 'transport-support' && roleHooks.upperArm) {
      const mode = roleHooks.samplingMode;
      const p = clamp(roleHooks.samplingProgress, 0, 1);
      samplingArmGroupPose(mode, p, dt);
    }

    if (role === 'transport-support' && roleHooks.containerDoors) {
      if (st.task === 'cargo-loading') {
        st.droveCargo = true;
        st.cargoP = clamp(st.taskTime / 2.0, 0, 1);
      } else if (st.droveCargo) {
        st.cargoP = damp(st.cargoP, 0, dt, 3);
        if (st.cargoP < 0.01) { st.cargoP = 0; st.droveCargo = false; }
      }
      if (st.droveCargo || st.cargoP > 0) {
        roleHooks.containerDoors.left.rotation.y = -1.85 * st.cargoP;
        roleHooks.containerDoors.right.rotation.y = 1.85 * st.cargoP;
        if (roleHooks.cargoSpecimen) roleHooks.cargoSpecimen.visible = st.cargoP > 0.05;
      }
    }

    if (st.movement === 'idle' && !st.task) {
      materials.accent.emissiveIntensity = 0.85 + 0.25 * Math.sin(st.time * 2.2);
    }
  }

  function samplingArmGroupPose(mode, p, dt) {
    const h = roleHooks;
    h.samplingArmGroup.rotation.y = damp(h.samplingArmGroup.rotation.y, -0.5 * p, dt);
    h.upperArm.rotation.x = damp(h.upperArm.rotation.x, -0.4 + (-1.15 + 0.4) * p, dt);
    h.forearmGroup.rotation.x = damp(h.forearmGroup.rotation.x, 0.55 * p, dt);
    h.toolHead.rotation.x = damp(h.toolHead.rotation.x, mode === 'scoop' ? -0.9 * p : 0, dt);
    const open = mode === 'claw' ? 0.15 + 0.30 * (1 - p) : 0.30;
    h.clawLeft.rotation.z = damp(h.clawLeft.rotation.z, -open, dt);
    h.clawRight.rotation.z = damp(h.clawRight.rotation.z, open, dt);
  }

  const api = {
    update,
    updateRoverMovement(o) { o = o || {}; update(o.deltaTime, o); },
    updateWheelAnimation(o) { o = o || {}; update(o.deltaTime, o); },
    setState(s) {
      if (s === 'idle' || s === 'moving-forward' || s === 'moving-reverse' || s === 'turning') st.task = null;
      else { st.task = s; st.taskTime = 0; }
      return api;
    },
    setSteering(a) {
      const c = clamp(a, -0.5, 0.5);
      st.steering = c;
      for (const w of wheels) {
        if (w.station === 'front') w.pivot.rotation.y = c;
        else if (w.station === 'rear') w.pivot.rotation.y = -c;
      }
      return api;
    },
    setSuspensionArticulation(a) {
      a = a || {};
      for (const key of ['left', 'right']) {
        const side = suspension[key], input = a[key];
        if (!side || !input) continue;
        if (typeof input.rocker === 'number') side.rocker.rotation.x = clamp(input.rocker, -0.35, 0.35);
        if (typeof input.bogie === 'number') side.bogie.rotation.x = clamp(input.bogie, -0.35, 0.35);
      }
      return api;
    },
    setHeadlights(on) {
      for (const s of headlightSpots) s.visible = !!on;
      materials.headlight.emissiveIntensity = on ? 1.1 : 0.05;
      return api;
    },
    setSampling(mode, progress) {
      roleHooks.samplingMode = mode;
      roleHooks.samplingProgress = clamp(progress, 0, 1);
      st.task = 'sampling';
      return api;
    },
    reset() {
      for (const w of wheels) { w.spin.rotation.x = 0; w.pivot.rotation.y = 0; }
      for (const key of ['left', 'right']) {
        if (suspension[key]) { suspension[key].rocker.rotation.x = 0; suspension[key].bogie.rotation.x = 0; }
      }
      if (mastHead) mastHead.rotation.y = 0;
      st.task = null; st.taskTime = 0; st.hasPrev = false; st.steering = 0;
      st.droveDrill = false; st.droveCargo = false; st.cargoP = 0;
      materials.accent.emissiveIntensity = 0.9;
      return api;
    },
    getState() { return { movement: st.movement, task: st.task, steering: st.steering }; },
  };
  return api;
}

/* ------------------------- resource disposal ------------------------- */
export function disposeRoverModel(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const texKeys = ['map', 'emissiveMap', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'];
  root.traverse((obj) => {
    if (obj.geometry) geometries.add(obj.geometry);
    if (obj.material) {
      const list = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of list) {
        materials.add(m);
        for (const k of texKeys) if (m[k]) textures.add(m[k]);
      }
    }
    if (obj.isLight && typeof obj.dispose === 'function') obj.dispose();
  });
  geometries.forEach((g) => g.dispose());
  textures.forEach((t) => t.dispose());
  materials.forEach((m) => m.dispose());
  if (root.parent) root.parent.remove(root);
}

/* ------------------------- HUD tag (original, unchanged) ------------------------- */
function createRoverTag(callsign, name, missionTitle, accentColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 220;
  const ctx = canvas.getContext('2d');
  const hex = '#' + accentColor.toString(16).padStart(6, '0');
  ctx.fillStyle = 'rgba(14, 10, 8, 0.90)';
  ctx.strokeStyle = hex;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 170, 24);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = hex;
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 42, [24, 24, 0, 0]);
  ctx.fill();
  ctx.fillStyle = '#0f0c0a';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`ROBOT ${callsign} \u00b7 ${missionTitle.toUpperCase()}`, 256, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px system-ui, sans-serif';
  ctx.fillText(name, 256, 115);
  ctx.fillStyle = hex;
  ctx.font = '22px monospace';
  ctx.fillText('MISSION ACTIVE \u00b7 AUTONOMOUS SYSTEM', 256, 155);
  ctx.fillStyle = hex;
  ctx.beginPath();
  ctx.moveTo(236, 180);
  ctx.lineTo(276, 180);
  ctx.lineTo(256, 212);
  ctx.closePath();
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.renderOrder = 999;
  return sprite;
}