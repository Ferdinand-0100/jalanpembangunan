import * as THREE from 'three';

/**
 * Creates a detailed, realistic NASA Mars Rover 3D model (~3 m scale).
 * Forward direction is -Z.
 * Features:
 * - Detailed Warm Electronics Box (WEB) chassis with gold foil MLI deck & undercarriage armor
 * - Rocker-bogie suspension system with pivot joints and steering knuckles
 * - 6 machined wheels with chevron cleats and recessed titanium hubs
 * - Articulated Remote Sensing Mast (RSM) with Mastcam-Z stereo lenses & SuperCam laser
 * - Multi-Mission Radioisotope Thermoelectric Generator (MMRTG) with cooling fins
 * - Steerable High-Gain Antenna (HGA) dish & Low-Gain Antenna rod
 * - Articulated 5-DoF robotic arm with coring drill & spectrometer turret
 * - Front/rear Hazcams and glowing LED headlights
 * - Role-specific specialized scientific equipment and holographic identity billboard
 *
 * @param {Object} opts
 * @param {'lead'|'surface-mapping'|'geological-investigation'|'transport-support'} [opts.role='lead']
 * @param {number} [opts.accent=0x00e5ff] Hex color for the beacon, sensor glow & UI tag
 * @param {string} [opts.name='Perseverance']
 * @param {string} [opts.callsign='01']
 */
export function createRoverModel(opts = {}) {
  const {
    role = 'lead',
    accent = 0x00e5ff,
    name = 'Perseverance',
    callsign = '01',
  } = opts;

  const group = new THREE.Group();
  group.name = `Rover_${callsign}_${role}`;

  // Shared / Role-specific Materials
  const bodyWhite = new THREE.MeshStandardMaterial({
    color: 0xeeeeec,
    roughness: 0.35,
    metalness: 0.2,
  });

  const goldFoil = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.25,
    metalness: 0.85,
  });

  const darkTitanium = new THREE.MeshStandardMaterial({
    color: 0x242428,
    roughness: 0.65,
    metalness: 0.6,
  });

  const chromeStrut = new THREE.MeshStandardMaterial({
    color: 0xd0d0d8,
    roughness: 0.2,
    metalness: 0.9,
  });

  const tireDark = new THREE.MeshStandardMaterial({
    color: 0x1b1b1e,
    roughness: 0.8,
    metalness: 0.35,
  });

  const wheelRim = new THREE.MeshStandardMaterial({
    color: 0x4a4a52,
    roughness: 0.3,
    metalness: 0.75,
  });

  const lensGlass = new THREE.MeshStandardMaterial({
    color: 0x07111e,
    roughness: 0.1,
    metalness: 0.95,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 1.8,
    roughness: 0.2,
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfff4d0,
    emissiveIntensity: 1.4,
  });

  const solarMat = new THREE.MeshStandardMaterial({
    color: 0x12203a,
    roughness: 0.15,
    metalness: 0.85,
  });

  // Helper to quickly create and position a mesh
  const addMesh = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, parent = group) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rx || ry || rz) m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  /* ---------------------------------------------------------
   * 1. CHASSIS / WARM ELECTRONICS BOX (WEB)
   * --------------------------------------------------------- */
  // Main chassis central hull
  addMesh(new THREE.BoxGeometry(1.6, 0.55, 2.3), bodyWhite, 0, 0.88, 0);

  // Undercarriage skid plate (tapered bottom protector)
  addMesh(new THREE.BoxGeometry(1.3, 0.15, 2.1), darkTitanium, 0, 0.56, 0);

  // Front wedge / tapered nose bumper
  addMesh(new THREE.BoxGeometry(1.5, 0.45, 0.4), darkTitanium, 0, 0.85, -1.25);

  // Rear equipment deck step
  addMesh(new THREE.BoxGeometry(1.4, 0.3, 0.5), darkTitanium, 0, 0.95, 1.25);

  // Top Equipment Deck with Gold MLI Insulation
  addMesh(new THREE.BoxGeometry(1.45, 0.05, 1.9), goldFoil, 0, 1.18, -0.05);

  // Avionics / Electronics Bay Panels on top deck
  addMesh(new THREE.BoxGeometry(0.5, 0.12, 0.7), darkTitanium, -0.35, 1.25, 0.2);
  addMesh(new THREE.BoxGeometry(0.4, 0.1, 0.5), bodyWhite, 0.4, 1.24, 0.35);

  // Front Hazard Avoidance Cameras (Hazcams) - Left and Right stereo pairs
  for (const side of [-0.55, 0.55]) {
    addMesh(new THREE.BoxGeometry(0.2, 0.14, 0.14), darkTitanium, side, 0.8, -1.46);
    addMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 12), lensGlass, side - 0.05, 0.8, -1.54, Math.PI / 2);
    addMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 12), lensGlass, side + 0.05, 0.8, -1.54, Math.PI / 2);
    // Front LED Headlights
    addMesh(new THREE.BoxGeometry(0.08, 0.06, 0.04), headlightMat, side, 0.92, -1.48);
  }

  // Rear Hazcams
  for (const side of [-0.45, 0.45]) {
    addMesh(new THREE.BoxGeometry(0.16, 0.12, 0.1), darkTitanium, side, 0.85, 1.52);
    addMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 8), lensGlass, side, 0.85, 1.58, Math.PI / 2);
  }

  /* ---------------------------------------------------------
   * 2. ROCKER-BOGIE SUSPENSION SYSTEM
   * --------------------------------------------------------- */
  const suspensionGroup = new THREE.Group();
  group.add(suspensionGroup);

  // Differential pivot bar across top of chassis
  addMesh(new THREE.CylinderGeometry(0.04, 0.04, 1.7, 12), darkTitanium, 0, 1.1, 0, 0, 0, Math.PI / 2, suspensionGroup);

  // Left & Right Rocker-Bogie Linkage Arms
  for (const sign of [-1, 1]) {
    // Rocker arm - front segment
    addMesh(new THREE.CylinderGeometry(0.035, 0.035, 1.45, 8), darkTitanium, sign * 1.05, 0.72, -0.65, 0.45, 0, sign * 0.25, suspensionGroup);

    // Rocker arm - rear segment
    addMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 8), darkTitanium, sign * 1.05, 0.8, 0.4, -0.35, 0, sign * -0.2, suspensionGroup);

    // Bogie pivot hinge joint
    addMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), chromeStrut, sign * 1.12, 0.68, 0.68, 0, 0, Math.PI / 2, suspensionGroup);

    // Bogie arm
    addMesh(new THREE.CylinderGeometry(0.035, 0.035, 1.4, 8), darkTitanium, sign * 1.15, 0.58, 0.7, 0.05, 0, 0, suspensionGroup);

    // Wheel upright steering forks for 4 corner wheels
    for (const zCorner of [-1.25, 1.35]) {
      addMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.35, 8), chromeStrut, sign * 1.25, 0.48, zCorner, 0, 0, 0, suspensionGroup);
    }
  }

  /* ---------------------------------------------------------
   * 3. SIX MACHINED WHEELS WITH CHEVRON CLEATS & HUBS
   * --------------------------------------------------------- */
  const wheelPositions = [
    { x: -1.25, z: -1.25 }, // Front Left
    { x: 1.25, z: -1.25 },  // Front Right
    { x: -1.35, z: 0.1 },   // Mid Left
    { x: 1.35, z: 0.1 },    // Mid Right
    { x: -1.25, z: 1.35 },  // Rear Left
    { x: 1.25, z: 1.35 },   // Rear Right
  ];

  for (let i = 0; i < wheelPositions.length; i++) {
    const { x, z } = wheelPositions[i];
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(x, 0.4, z);

    // Main wheel cylindrical tire
    addMesh(new THREE.CylinderGeometry(0.4, 0.4, 0.38, 20), tireDark, 0, 0, 0, 0, 0, Math.PI / 2, wheelGroup);

    // Machined alloy inner rim / hubcap
    addMesh(new THREE.CylinderGeometry(0.28, 0.28, 0.39, 16), wheelRim, 0, 0, 0, 0, 0, Math.PI / 2, wheelGroup);

    // Titanium center axle nut
    addMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.44, 12), chromeStrut, 0, 0, 0, 0, 0, Math.PI / 2, wheelGroup);

    // Chevron traction cleats
    for (let c = 0; c < 8; c++) {
      const angle = (c / 8) * Math.PI * 2;
      addMesh(
        new THREE.BoxGeometry(0.36, 0.035, 0.08),
        darkTitanium,
        0,
        Math.cos(angle) * 0.4,
        Math.sin(angle) * 0.4,
        angle,
        0,
        0,
        wheelGroup
      );
    }

    group.add(wheelGroup);
  }

  /* ---------------------------------------------------------
   * 4. REMOTE SENSING MAST (RSM) - MASTCAM-Z & SUPERCAM
   * --------------------------------------------------------- */
  const mastGroup = new THREE.Group();
  mastGroup.position.set(0.5, 1.15, -0.9);

  // Mast base joint bracket
  addMesh(new THREE.BoxGeometry(0.25, 0.12, 0.25), darkTitanium, 0, 0.06, 0, 0, 0, 0, mastGroup);

  // Lower mast vertical strut
  addMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 10), bodyWhite, 0, 0.45, 0, 0, 0, 0, mastGroup);

  // Mid-mast articulation collar
  addMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 10), chromeStrut, 0, 0.82, 0, 0, 0, 0, mastGroup);

  // Upper mast segment
  addMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.65, 10), bodyWhite, 0, 1.18, 0, 0, 0, 0, mastGroup);

  // Pan & Tilt sensor platform
  const sensorHead = new THREE.Group();
  sensorHead.position.set(0, 1.55, 0);

  // Camera housing bar
  addMesh(new THREE.BoxGeometry(0.55, 0.22, 0.25), bodyWhite, 0, 0, 0, 0, 0, 0, sensorHead);
  addMesh(new THREE.BoxGeometry(0.57, 0.06, 0.27), darkTitanium, 0, 0.08, 0, 0, 0, 0, sensorHead);

  // Left & Right Stereo Mastcam-Z lenses
  for (const xOff of [-0.18, 0.18]) {
    addMesh(new THREE.CylinderGeometry(0.065, 0.065, 0.16, 16), darkTitanium, xOff, 0, -0.16, Math.PI / 2, 0, 0, sensorHead);
    addMesh(new THREE.CylinderGeometry(0.048, 0.048, 0.04, 16), lensGlass, xOff, 0, -0.24, Math.PI / 2, 0, 0, sensorHead);
  }

  // Central SuperCam laser aperture optic
  addMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 12), chromeStrut, 0, 0.02, -0.16, Math.PI / 2, 0, 0, sensorHead);
  addMesh(new THREE.CylinderGeometry(0.028, 0.028, 0.03, 12), accentMat, 0, 0.02, -0.25, Math.PI / 2, 0, 0, sensorHead);

  // MEDA weather environmental sensor booms
  addMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.35, 6), chromeStrut, -0.38, 0, 0, 0, 0, Math.PI / 2, sensorHead);
  addMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.35, 6), chromeStrut, 0.38, 0, 0, 0, 0, Math.PI / 2, sensorHead);

  mastGroup.add(sensorHead);
  group.add(mastGroup);

  /* ---------------------------------------------------------
   * 5. MMRTG POWER SYSTEM (Nuclear Generator at Rear)
   * --------------------------------------------------------- */
  const mmrtgGroup = new THREE.Group();
  mmrtgGroup.position.set(0, 1.15, 1.25);
  mmrtgGroup.rotation.x = 0.45;

  // Main cylindrical core
  addMesh(new THREE.CylinderGeometry(0.22, 0.22, 0.7, 16), darkTitanium, 0, 0.35, 0, 0, 0, 0, mmrtgGroup);

  // Radial heat dissipation cooling fins
  for (let f = 0; f < 8; f++) {
    const finAngle = (f / 8) * Math.PI;
    addMesh(new THREE.BoxGeometry(0.02, 0.6, 0.65), darkTitanium, 0, 0.35, 0, 0, finAngle, 0, mmrtgGroup);
  }
  // Core heat cap
  addMesh(new THREE.CylinderGeometry(0.18, 0.22, 0.08, 16), chromeStrut, 0, 0.72, 0, 0, 0, 0, mmrtgGroup);

  group.add(mmrtgGroup);

  /* ---------------------------------------------------------
   * 6. HIGH-GAIN ANTENNA (HGA) & LOW-GAIN ANTENNA (LGA)
   * --------------------------------------------------------- */
  const hgaGroup = new THREE.Group();
  hgaGroup.position.set(-0.5, 1.2, 0.55);
  hgaGroup.rotation.x = -0.35;
  hgaGroup.rotation.y = 0.5;

  addMesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8), chromeStrut, 0, 0.12, 0, 0, 0, 0, hgaGroup);
  addMesh(new THREE.CylinderGeometry(0.32, 0.15, 0.1, 16), bodyWhite, 0, 0.26, 0, 0, 0, 0, hgaGroup);
  addMesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8), darkTitanium, 0, 0.36, 0, 0, 0, 0, hgaGroup);

  group.add(hgaGroup);

  // LGA Omnidirectional Antenna mast
  addMesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 8), darkTitanium, -0.65, 1.6, -0.3);
  addMesh(new THREE.SphereGeometry(0.035, 8, 8), chromeStrut, -0.65, 2.05, -0.3);

  /* ---------------------------------------------------------
   * 7. ROLE-SPECIFIC CUSTOM EQUIPMENT
   * --------------------------------------------------------- */
  if (role === 'lead') {
    // Lead Rover: Articulated 5-DoF Robotic Arm + Coring Drill
    const armGroup = new THREE.Group();
    armGroup.position.set(-0.65, 0.95, -1.05);

    addMesh(new THREE.BoxGeometry(0.2, 0.22, 0.2), darkTitanium, 0, 0, 0, 0, 0, 0, armGroup);
    addMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.65, 8), bodyWhite, 0, 0.25, -0.22, -0.7, 0, 0, armGroup);
    addMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 10), chromeStrut, 0, 0.48, -0.45, 0, 0, Math.PI / 2, armGroup);
    addMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.6, 8), bodyWhite, 0, 0.28, -0.65, 0.6, 0, 0, armGroup);
    addMesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 12), darkTitanium, 0, 0.12, -0.85, Math.PI / 2, 0, 0, armGroup);
    addMesh(new THREE.CylinderGeometry(0.02, 0.04, 0.25, 8), chromeStrut, 0, 0.12, -1.0, Math.PI / 2, 0, 0, armGroup);

    group.add(armGroup);

  } else if (role === 'surface-mapping') {
    // Scout / Mapper: Dual Solar Wing Panels + Top Radar Scanner Dome
    addMesh(new THREE.BoxGeometry(0.9, 0.04, 1.4), solarMat, -1.15, 1.25, 0, 0, 0, 0.15);
    addMesh(new THREE.BoxGeometry(0.9, 0.04, 1.4), solarMat, 1.15, 1.25, 0, 0, 0, -0.15);

    addMesh(new THREE.SphereGeometry(0.18, 16, 12), darkTitanium, 0.5, 2.9, -0.9);
    addMesh(new THREE.TorusGeometry(0.24, 0.025, 8, 20), accentMat, 0.5, 2.9, -0.9, Math.PI / 2);

    addMesh(new THREE.BoxGeometry(0.7, 0.08, 0.12), darkTitanium, 0, 1.15, -1.45);
    addMesh(new THREE.BoxGeometry(0.6, 0.03, 0.05), accentMat, 0, 1.15, -1.52);

  } else if (role === 'geological-investigation') {
    // Geo Lab: Heavy-Duty Core Drill + Sample Analysis Revolving Drum
    addMesh(new THREE.CylinderGeometry(0.3, 0.3, 0.35, 16), chromeStrut, 0.85, 0.95, -0.2, 0, 0, Math.PI / 2);
    for (let s = 0; s < 6; s++) {
      const a = (s / 6) * Math.PI * 2;
      addMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.36, 8), darkTitanium, 0.85, 0.95 + Math.cos(a) * 0.2, -0.2 + Math.sin(a) * 0.2, 0, 0, Math.PI / 2);
    }

    addMesh(new THREE.CylinderGeometry(0.06, 0.08, 0.9, 12), darkTitanium, -0.65, 0.7, -1.2, 0.5, 0, 0);
    addMesh(new THREE.ConeGeometry(0.08, 0.25, 12), chromeStrut, -0.65, 0.35, -1.45, 0.5, 0, 0);

    addMesh(new THREE.BoxGeometry(0.35, 0.2, 0.3), bodyWhite, -0.25, 1.25, -0.7);
    addMesh(new THREE.SphereGeometry(0.06, 10, 10), accentMat, -0.25, 1.25, -0.85);

  } else if (role === 'transport-support') {
    // Hauler / Transport: Rear Sample Canister Caching Rack with Glowing Tubes
    addMesh(new THREE.BoxGeometry(1.2, 0.2, 0.9), darkTitanium, 0, 1.28, 0.5);

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const cx = (col - 1.5) * 0.24;
        const cz = 0.35 + row * 0.3;
        addMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 12), chromeStrut, cx, 1.45, cz);
        addMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 12), accentMat, cx, 1.48, cz);
      }
    }

    addMesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8), chromeStrut, 0, 0.95, -1.48, 0, 0, Math.PI / 2);
    addMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), darkTitanium, -0.7, 0.75, -1.45, 0.4, 0, 0);
    addMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), darkTitanium, 0.7, 0.75, -1.45, 0.4, 0, 0);
  }

  /* ---------------------------------------------------------
   * 8. ROLE BEACON & SWARM NAVIGATION LIGHTS
   * --------------------------------------------------------- */
  addMesh(new THREE.SphereGeometry(0.12, 12, 8), accentMat, -0.4, 1.45, 0.9);
  addMesh(new THREE.SphereGeometry(0.04, 8, 8), accentMat, -0.75, 1.15, -1.15);
  addMesh(new THREE.SphereGeometry(0.04, 8, 8), accentMat, 0.75, 1.15, -1.15);

  /* ---------------------------------------------------------
   * 9. 3D FLOATING IDENTIFIER TAG (CANVAS SPRITE)
   * --------------------------------------------------------- */
  const sprite = createRoverTag(callsign, name, role, accent);
  sprite.position.set(0, 3.8, 0);
  sprite.scale.set(7.5, 3.2, 1);
  group.add(sprite);

  // Ground offset calibration: lowest wheel edge sits at y = 0
  group.userData.groundOffset = 0;
  group.userData.role = role;
  group.userData.name = name;
  group.userData.callsign = callsign;
  group.userData.tagSprite = sprite;

  return group;
}

/**
 * Creates an attractive billboard label showing the rover's callsign, name, and role.
 */
function createRoverTag(callsign, name, role, accentColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 220;
  const ctx = canvas.getContext('2d');

  const hex = '#' + accentColor.toString(16).padStart(6, '0');

  // Background rounded rectangle
  ctx.fillStyle = 'rgba(15, 12, 10, 0.88)';
  ctx.strokeStyle = hex;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 170, 24);
  ctx.fill();
  ctx.stroke();

  // Accent header bar
  ctx.fillStyle = hex;
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 42, [24, 24, 0, 0]);
  ctx.fill();

  // Callsign badge text
  ctx.fillStyle = '#0f0c0a';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`ROVER ${callsign} · ${role.toUpperCase().replace('-', ' ')}`, 256, 40);

  // Rover Name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText(name, 256, 115);

  // Subtitle / Telemetry tag
  ctx.fillStyle = hex;
  ctx.font = '22px monospace';
  ctx.fillText('ONLINE · SWARM LINK ACTIVE', 256, 155);

  // Downward pointer arrow
  ctx.fillStyle = hex;
  ctx.beginPath();
  ctx.moveTo(236, 180);
  ctx.lineTo(276, 180);
  ctx.lineTo(256, 212);
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  return new THREE.Sprite(mat);
}
