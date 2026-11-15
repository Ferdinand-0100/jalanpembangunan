import * as THREE from 'three';
import { getNasaWormTexture, getNasaMeatballTexture, getNasaContainerTexture } from './nasaDecals.js';

/**
 * Creates a specialized NASA Mars Rover 3D model for one of 3 distinct mission roles:
 * 1. Surface Mapping & Early Exploration ('surface-mapping')
 * 2. Geological Investigation & Sample Drilling ('geological-investigation')
 * 3. Mission Transport & Logistics Support ('transport-support')
 *
 * @param {Object} opts
 * @param {'surface-mapping'|'geological-investigation'|'transport-support'} opts.role
 * @param {number} opts.accent Hex color for the beacon, sensor glow & UI tag
 * @param {string} opts.name Rover Name
 * @param {string} opts.callsign Callsign number (e.g. '01', '02', '03')
 * @param {string} opts.missionTitle Role title for display
 */
export function createRoverModel(opts = {}) {
  const {
    role = 'surface-mapping',
    accent = 0x00d4ff,
    name = 'Ares Mapper',
    callsign = '01',
    missionTitle = 'Surface Mapping & Exploration',
  } = opts;

  const group = new THREE.Group();
  group.name = `Rover_${callsign}_${role}`;

  // Shared / Role-specific Materials
  const bodyWhite = new THREE.MeshStandardMaterial({
    color: 0xeeece6,
    roughness: 0.35,
    metalness: 0.2,
  });

  const goldFoil = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.25,
    metalness: 0.85,
  });

  const darkTitanium = new THREE.MeshStandardMaterial({
    color: 0x222226,
    roughness: 0.65,
    metalness: 0.65,
  });

  const chromeStrut = new THREE.MeshStandardMaterial({
    color: 0xd5d5de,
    roughness: 0.2,
    metalness: 0.9,
  });

  const tireDark = new THREE.MeshStandardMaterial({
    color: 0x1b1b1e,
    roughness: 0.8,
    metalness: 0.35,
  });

  const wheelRim = new THREE.MeshStandardMaterial({
    color: 0x484852,
    roughness: 0.3,
    metalness: 0.8,
  });

  const lensGlass = new THREE.MeshStandardMaterial({
    color: 0x06101c,
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
    emissiveIntensity: 1.5,
  });

  const solarMat = new THREE.MeshStandardMaterial({
    color: 0x101f38,
    roughness: 0.15,
    metalness: 0.85,
  });

  const tubeActiveMat = new THREE.MeshStandardMaterial({
    color: 0x00ff88,
    emissive: 0x00ff88,
    emissiveIntensity: 2.2,
  });

  const tubeEmptyMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.7,
    metalness: 0.5,
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
  // Main hull central structure
  addMesh(new THREE.BoxGeometry(1.6, 0.55, 2.3), bodyWhite, 0, 0.88, 0);

  // Official NASA Insignia Plaques on Warm Electronics Box (WEB)
  const nasaWormMat = new THREE.MeshStandardMaterial({
    map: getNasaWormTexture(),
    roughness: 0.3,
    metalness: 0.15,
  });
  const nasaMeatballMat = new THREE.MeshStandardMaterial({
    map: getNasaMeatballTexture(),
    transparent: true,
    roughness: 0.3,
    metalness: 0.1,
  });

  // Left & Right Chassis Side Panels (NASA Worm Logo)
  addMesh(new THREE.PlaneGeometry(0.72, 0.22), nasaWormMat, -0.806, 0.9, -0.1, 0, -Math.PI / 2, 0);
  addMesh(new THREE.PlaneGeometry(0.72, 0.22), nasaWormMat, 0.806, 0.9, -0.1, 0, Math.PI / 2, 0);

  // Front Chassis Bumper Badge (NASA Meatball Insignia)
  addMesh(new THREE.PlaneGeometry(0.28, 0.28), nasaMeatballMat, 0, 0.88, -1.455, 0, Math.PI, 0);

  // Undercarriage skid plate (tapered bottom armor)
  addMesh(new THREE.BoxGeometry(1.3, 0.15, 2.1), darkTitanium, 0, 0.56, 0);

  // Front bumper
  addMesh(new THREE.BoxGeometry(1.5, 0.45, 0.4), darkTitanium, 0, 0.85, -1.25);

  // Rear equipment deck step
  addMesh(new THREE.BoxGeometry(1.4, 0.3, 0.5), darkTitanium, 0, 0.95, 1.25);

  // Top Equipment Deck with Gold MLI Insulation
  addMesh(new THREE.BoxGeometry(1.45, 0.05, 1.9), goldFoil, 0, 1.18, -0.05);

  // Avionics / Electronics Bay Panels
  addMesh(new THREE.BoxGeometry(0.5, 0.12, 0.7), darkTitanium, -0.35, 1.25, 0.2);
  addMesh(new THREE.BoxGeometry(0.4, 0.1, 0.5), bodyWhite, 0.4, 1.24, 0.35);

  // Front Hazard Avoidance Cameras (Hazcams) - Stereo pairs
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

  // Differential pivot bar across top
  addMesh(new THREE.CylinderGeometry(0.04, 0.04, 1.7, 12), darkTitanium, 0, 1.1, 0, 0, 0, Math.PI / 2, suspensionGroup);

  // Left & Right Rocker-Bogie Linkage Arms
  for (const sign of [-1, 1]) {
    addMesh(new THREE.CylinderGeometry(0.035, 0.035, 1.45, 8), darkTitanium, sign * 1.05, 0.72, -0.65, 0.45, 0, sign * 0.25, suspensionGroup);
    addMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 8), darkTitanium, sign * 1.05, 0.8, 0.4, -0.35, 0, sign * -0.2, suspensionGroup);
    addMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), chromeStrut, sign * 1.12, 0.68, 0.68, 0, 0, Math.PI / 2, suspensionGroup);
    addMesh(new THREE.CylinderGeometry(0.035, 0.035, 1.4, 8), darkTitanium, sign * 1.15, 0.58, 0.7, 0.05, 0, 0, suspensionGroup);

    for (const zCorner of [-1.25, 1.35]) {
      addMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.35, 8), chromeStrut, sign * 1.25, 0.48, zCorner, 0, 0, 0, suspensionGroup);
    }
  }

  /* ---------------------------------------------------------
   * 3. SIX MACHINED WHEELS WITH CHEVRON CLEATS & HUBS
   * --------------------------------------------------------- */
  const wheelPositions = [
    { x: -1.25, z: -1.25 },
    { x: 1.25, z: -1.25 },
    { x: -1.35, z: 0.1 },
    { x: 1.35, z: 0.1 },
    { x: -1.25, z: 1.35 },
    { x: 1.25, z: 1.35 },
  ];

  const wheelGroups = [];

  for (let i = 0; i < wheelPositions.length; i++) {
    const { x, z } = wheelPositions[i];
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(x, 0.4, z);

    addMesh(new THREE.CylinderGeometry(0.4, 0.4, 0.38, 20), tireDark, 0, 0, 0, 0, 0, Math.PI / 2, wheelGroup);
    addMesh(new THREE.CylinderGeometry(0.28, 0.28, 0.39, 16), wheelRim, 0, 0, 0, 0, 0, Math.PI / 2, wheelGroup);
    addMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.44, 12), chromeStrut, 0, 0, 0, 0, 0, Math.PI / 2, wheelGroup);

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
    wheelGroups.push(wheelGroup);
  }

  /* ---------------------------------------------------------
   * 4. REMOTE SENSING MAST (RSM)
   * --------------------------------------------------------- */
  const mastGroup = new THREE.Group();
  mastGroup.position.set(0.5, 1.15, -0.9);

  addMesh(new THREE.BoxGeometry(0.25, 0.12, 0.25), darkTitanium, 0, 0.06, 0, 0, 0, 0, mastGroup);
  addMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 10), bodyWhite, 0, 0.45, 0, 0, 0, 0, mastGroup);
  addMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 10), chromeStrut, 0, 0.82, 0, 0, 0, 0, mastGroup);
  addMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.65, 10), bodyWhite, 0, 1.18, 0, 0, 0, 0, mastGroup);

  const sensorHead = new THREE.Group();
  sensorHead.position.set(0, 1.55, 0);

  addMesh(new THREE.BoxGeometry(0.55, 0.22, 0.25), bodyWhite, 0, 0, 0, 0, 0, 0, sensorHead);
  addMesh(new THREE.BoxGeometry(0.57, 0.06, 0.27), darkTitanium, 0, 0.08, 0, 0, 0, 0, sensorHead);

  // Stereo Mastcam lenses
  for (const xOff of [-0.18, 0.18]) {
    addMesh(new THREE.CylinderGeometry(0.065, 0.065, 0.16, 16), darkTitanium, xOff, 0, -0.16, Math.PI / 2, 0, 0, sensorHead);
    addMesh(new THREE.CylinderGeometry(0.048, 0.048, 0.04, 16), lensGlass, xOff, 0, -0.24, Math.PI / 2, 0, 0, sensorHead);
  }

  // Central Laser Aperture
  addMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 12), chromeStrut, 0, 0.02, -0.16, Math.PI / 2, 0, 0, sensorHead);
  addMesh(new THREE.CylinderGeometry(0.028, 0.028, 0.03, 12), accentMat, 0, 0.02, -0.25, Math.PI / 2, 0, 0, sensorHead);

  // MEDA weather environmental sensor booms
  addMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.35, 6), chromeStrut, -0.38, 0, 0, 0, 0, Math.PI / 2, sensorHead);
  addMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.35, 6), chromeStrut, 0.38, 0, 0, 0, 0, Math.PI / 2, sensorHead);

  mastGroup.add(sensorHead);
  group.add(mastGroup);

  /* ---------------------------------------------------------
   * 5. MMRTG POWER SYSTEM
   * --------------------------------------------------------- */
  const mmrtgGroup = new THREE.Group();
  mmrtgGroup.position.set(0, 1.15, 1.25);
  mmrtgGroup.rotation.x = 0.45;

  addMesh(new THREE.CylinderGeometry(0.22, 0.22, 0.7, 16), darkTitanium, 0, 0.35, 0, 0, 0, 0, mmrtgGroup);
  for (let f = 0; f < 8; f++) {
    const finAngle = (f / 8) * Math.PI;
    addMesh(new THREE.BoxGeometry(0.02, 0.6, 0.65), darkTitanium, 0, 0.35, 0, 0, finAngle, 0, mmrtgGroup);
  }
  addMesh(new THREE.CylinderGeometry(0.18, 0.22, 0.08, 16), chromeStrut, 0, 0.72, 0, 0, 0, 0, mmrtgGroup);
  group.add(mmrtgGroup);

  /* ---------------------------------------------------------
   * 6. DISTINCT MISSION ROLE EQUIPMENT
   * --------------------------------------------------------- */
  const roleHooks = {};

  if (role === 'surface-mapping') {
    /* ---------------------------------------------------------
     * ROLE 1: SURFACE MAPPING & EXPLORATION
     * Features: Dual solar arrays, rotating LiDAR dome, terrain sweep cone
     * --------------------------------------------------------- */
    // Dual high-efficiency solar wing panels
    addMesh(new THREE.BoxGeometry(1.0, 0.04, 1.5), solarMat, -1.2, 1.25, 0, 0, 0, 0.15);
    addMesh(new THREE.BoxGeometry(1.0, 0.04, 1.5), solarMat, 1.2, 1.25, 0, 0, 0, -0.15);

    // Top rotating 360-degree LiDAR dome
    const lidarDome = addMesh(new THREE.SphereGeometry(0.2, 16, 12), darkTitanium, 0.5, 2.9, -0.9);
    const lidarRing = addMesh(new THREE.TorusGeometry(0.26, 0.03, 8, 24), accentMat, 0.5, 2.9, -0.9, Math.PI / 2);

    // Forward Terrain Lidar Array & Antenna
    addMesh(new THREE.BoxGeometry(0.8, 0.08, 0.12), darkTitanium, 0, 1.15, -1.45);
    addMesh(new THREE.BoxGeometry(0.7, 0.03, 0.05), accentMat, 0, 1.15, -1.52);

    // Ground Scanning Radar Projection Effect (pulsing cone/ring on ground)
    const scanRingGeo = new THREE.RingGeometry(1.5, 3.2, 32);
    const scanRingMat = new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const scanRing = new THREE.Mesh(scanRingGeo, scanRingMat);
    scanRing.rotation.x = Math.PI / 2;
    scanRing.position.set(0, 0.05, -1.5);
    group.add(scanRing);

    roleHooks.scanRing = scanRing;
    roleHooks.lidarDome = lidarDome;
    roleHooks.lidarRing = lidarRing;

  } else if (role === 'geological-investigation') {
    /* ---------------------------------------------------------
     * ROLE 2: GEOLOGICAL INVESTIGATION & CORE DRILLING
     * Features: Heavy core drill arm, rock carousel, Raman laser beam
     * --------------------------------------------------------- */
    // Rotary Sample Carousel on right side
    const drum = addMesh(new THREE.CylinderGeometry(0.32, 0.32, 0.38, 16), chromeStrut, 0.85, 0.95, -0.2, 0, 0, Math.PI / 2);
    for (let s = 0; s < 6; s++) {
      const a = (s / 6) * Math.PI * 2;
      addMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.39, 8), darkTitanium, 0.85, 0.95 + Math.cos(a) * 0.22, -0.2 + Math.sin(a) * 0.22, 0, 0, Math.PI / 2);
    }

    // Heavy-Duty Articulated Coring Drill Arm
    const armGroup = new THREE.Group();
    armGroup.position.set(-0.65, 0.95, -1.05);

    addMesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), darkTitanium, 0, 0, 0, 0, 0, 0, armGroup);
    addMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 8), bodyWhite, 0, 0.28, -0.25, -0.65, 0, 0, armGroup);
    addMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 10), chromeStrut, 0, 0.55, -0.5, 0, 0, Math.PI / 2, armGroup);
    addMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.7, 8), bodyWhite, 0, 0.32, -0.75, 0.55, 0, 0, armGroup);

    // Rotary Coring Drill Turret
    const drillTurret = addMesh(new THREE.CylinderGeometry(0.14, 0.14, 0.28, 12), darkTitanium, 0, 0.12, -1.0, Math.PI / 2, 0, 0, armGroup);
    // Diamond-tipped Coring Drill Bit
    const drillBit = addMesh(new THREE.CylinderGeometry(0.025, 0.05, 0.32, 8), chromeStrut, 0, 0.12, -1.18, Math.PI / 2, 0, 0, armGroup);
    group.add(armGroup);

    // Spectrometer laser beam visual effect (from mastcam to ground)
    const laserGeo = new THREE.CylinderGeometry(0.02, 0.02, 3.0, 8);
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0xff1144,
      transparent: true,
      opacity: 0.85,
    });
    const laserBeam = new THREE.Mesh(laserGeo, laserMat);
    laserBeam.position.set(0.5, 1.4, -2.4);
    laserBeam.rotation.x = Math.PI / 3;
    laserBeam.visible = false;
    group.add(laserBeam);

    roleHooks.laserBeam = laserBeam;
    roleHooks.armGroup = armGroup;
    roleHooks.drillBit = drillBit;

  } else if (role === 'transport-support') {
    /* ---------------------------------------------------------
     * ROLE 3: HEAVY CARGO CONTAINER TRANSPORT (HERMES)
     * Desain: Struktur kontainer kargo futuristik berpelindung baja,
     * kubah radar scanning berputar di atas kabin, dan lampu status muatan.
     * --------------------------------------------------------- */
    // 1. MODULAR FREIGHT CONTAINER BODY (Struktur Bodi Kontainer)
    const containerMat = new THREE.MeshStandardMaterial({
      color: 0x2e353b, // Industrial Dark Slate
      roughness: 0.4,
      metalness: 0.8,
    });
    const containerPanelMat = new THREE.MeshStandardMaterial({
      color: 0xeeece6, // White Ceramic Shield Panels
      roughness: 0.3,
      metalness: 0.5,
    });
    const hazardMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0x885500,
      emissiveIntensity: 0.4,
      roughness: 0.4,
    });
    const containerGlowMat = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    });

    const nasaContainerMat = new THREE.MeshStandardMaterial({
      map: getNasaContainerTexture(),
      roughness: 0.35,
      metalness: 0.2,
    });

    // Kontainer Utama (Panjang 2.4m, Lebar 1.8m, Tinggi 1.1m)
    addMesh(new THREE.BoxGeometry(1.75, 1.05, 2.3), containerMat, 0, 1.4, 0.2);

    // Panel Samping Kontainer Bergaris Industri & NASA Logistics Livery
    for (const sign of [-1, 1]) {
      addMesh(new THREE.BoxGeometry(0.08, 0.85, 2.1), containerPanelMat, sign * 0.9, 1.4, 0.2);
      // Strip Garis Peringatan Hazard Kuning
      addMesh(new THREE.BoxGeometry(0.09, 0.12, 2.1), hazardMat, sign * 0.91, 1.65, 0.2);
      // Strip Lampu LED Status Kargo
      addMesh(new THREE.BoxGeometry(0.09, 0.06, 1.9), containerGlowMat, sign * 0.91, 1.1, 0.2);
      // NASA Logistics Specimen Carrier Banner on Container Flanks
      addMesh(new THREE.PlaneGeometry(1.6, 0.42), nasaContainerMat, sign * 0.946, 1.38, 0.2, 0, (sign === -1 ? -Math.PI / 2 : Math.PI / 2), 0);
    }

    // Pintu Kargo Belakang Berengsel Hidrolik
    addMesh(new THREE.BoxGeometry(1.6, 0.9, 0.1), darkTitanium, 0, 1.4, 1.36);
    addMesh(new THREE.BoxGeometry(1.4, 0.15, 0.14), chromeStrut, 0, 1.4, 1.38); // Palang Kunci Kontainer
    addMesh(new THREE.SphereGeometry(0.08, 8, 8), containerGlowMat, -0.6, 1.7, 1.4); // Lampu Indikator Kunci

    // 2. KABIN DEPAN & RADAR SCANNER 360° BERPUTAR
    // Kabin Pengemudi / Unit Komputasi Logistik
    addMesh(new THREE.BoxGeometry(1.5, 0.65, 0.8), darkTitanium, 0, 1.25, -1.15);
    addMesh(new THREE.BoxGeometry(1.2, 0.4, 0.2), lensGlass, 0, 1.35, -1.56); // Kaca Visor Kabin Depan

    // Dudukan Tiang Radar di Atap Kabin
    const radarGroup = new THREE.Group();
    radarGroup.position.set(0, 1.65, -1.1);

    addMesh(new THREE.CylinderGeometry(0.12, 0.16, 0.2, 12), darkTitanium, 0, 0.1, 0, 0, 0, 0, radarGroup);
    // Piringan Radar Scanner Berputar
    const radarDish = new THREE.Group();
    radarDish.position.set(0, 0.25, 0);
    addMesh(new THREE.CylinderGeometry(0.42, 0.18, 0.12, 20), bodyWhite, 0, 0.06, 0, 0, 0, 0, radarDish);
    addMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8), chromeStrut, 0, 0.22, 0, 0, 0, 0, radarDish);
    addMesh(new THREE.SphereGeometry(0.08, 8, 8), accentMat, 0, 0.4, 0, 0, 0, 0, radarDish);
    radarGroup.add(radarDish);
    group.add(radarGroup);

    // 3. OBJEK MUATAN SPESIMEN DI DALAM KONTAINER (Visible saat muatan terisi)
    const cargoSpecimen = new THREE.Group();
    cargoSpecimen.position.set(0, 1.4, 0.2);
    // Kapsul Tabung Spesimen Beriluminasi
    addMesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 16), containerGlowMat, 0, 0, 0, Math.PI / 2, 0, 0, cargoSpecimen);
    addMesh(new THREE.TorusGeometry(0.32, 0.05, 8, 16), chromeStrut, 0, 0, 0, 0, 0, 0, cargoSpecimen);
    cargoSpecimen.visible = false;
    group.add(cargoSpecimen);

    // 4. TWIN ROCKET BOOSTER THRUSTERS (Pendorong Roket di Belakang Kontainer)
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.85,
    });
    const boosterFlames = [];
    for (const sx of [-0.48, 0.48]) {
      addMesh(new THREE.CylinderGeometry(0.14, 0.18, 0.22, 12), darkTitanium, sx, 1.1, 1.42, Math.PI / 2);
      const flame = addMesh(new THREE.ConeGeometry(0.12, 0.8, 12), flameMat, sx, 1.1, 1.9, -Math.PI / 2);
      flame.visible = false;
      boosterFlames.push(flame);
    }

    // Rollcage Pelindung Depan Tebal (Heavy Bullbar)
    addMesh(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 10), chromeStrut, 0, 0.75, -1.55, 0, 0, Math.PI / 2);
    addMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), darkTitanium, -0.75, 0.6, -1.5, 0.3, 0, 0);
    addMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), darkTitanium, 0.75, 0.6, -1.5, 0.3, 0, 0);

    /* ---------------------------------------------------------
     * 5. ARTICULATED ROBOTIC SAMPLING ARM (DUAL TOOL: CLAW & SCOOP)
     * - Mengambil benda padat dengan MENCAPIT (Hydraulic Claw Gripper)
     * - Mengambil benda cair dengan MENYEROK (Suction Dipper Scoop)
     * --------------------------------------------------------- */
    const samplingArmGroup = new THREE.Group();
    samplingArmGroup.position.set(0.68, 0.95, -1.35); // Depan kanan kabin

    // Sendi Bahu Lengan (Turret Base)
    addMesh(new THREE.CylinderGeometry(0.12, 0.14, 0.2, 12), darkTitanium, 0, 0.05, 0, 0, 0, 0, samplingArmGroup);
    addMesh(new THREE.SphereGeometry(0.1, 10, 10), chromeStrut, 0, 0.16, 0, 0, 0, 0, samplingArmGroup);

    // Lengan Atas (Upper Arm)
    const upperArm = new THREE.Group();
    upperArm.position.set(0, 0.16, 0);
    addMesh(new THREE.CylinderGeometry(0.05, 0.06, 0.9, 10), bodyWhite, 0, 0.42, 0, 0, 0, 0, upperArm);
    addMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8), chromeStrut, 0.06, 0.42, 0.04, 0, 0, 0, upperArm); // Silinder hidrolik
    upperArm.rotation.x = -0.4; // Posisi standby melipat ke belakang
    samplingArmGroup.add(upperArm);

    // Sendi Siku & Lengan Bawah (Forearm)
    const forearmGroup = new THREE.Group();
    forearmGroup.position.set(0, 0.85, 0);
    addMesh(new THREE.SphereGeometry(0.08, 10, 10), darkTitanium, 0, 0, 0, 0, 0, 0, forearmGroup);
    addMesh(new THREE.CylinderGeometry(0.04, 0.045, 0.75, 10), darkTitanium, 0, 0.38, 0, 0, 0, 0, forearmGroup);
    upperArm.add(forearmGroup);

    // Kepala Ujung Alat Ganda (Dual-End Effector Head)
    const toolHead = new THREE.Group();
    toolHead.position.set(0, 0.75, 0);
    addMesh(new THREE.BoxGeometry(0.18, 0.12, 0.16), darkTitanium, 0, 0.06, 0, 0, 0, 0, toolHead);
    addMesh(new THREE.SphereGeometry(0.04, 8, 8), containerGlowMat, 0, 0.14, 0, 0, 0, 0, toolHead); // Status LED alat
    forearmGroup.add(toolHead);

    // A. MODUL CAPIT BENDA PADAT (Hydraulic Robotic Claw Gripper)
    const clawGroup = new THREE.Group();
    clawGroup.position.set(0, 0.12, 0);

    const clawLeft = new THREE.Group();
    clawLeft.position.set(-0.07, 0, 0);
    addMesh(new THREE.BoxGeometry(0.03, 0.22, 0.06), chromeStrut, 0, 0.1, 0, 0, 0, -0.2, clawLeft);
    addMesh(new THREE.ConeGeometry(0.035, 0.1, 4), accentMat, 0.02, 0.24, 0, 0, 0, Math.PI / 1.5, clawLeft); // Ujung cakar
    clawGroup.add(clawLeft);

    const clawRight = new THREE.Group();
    clawRight.position.set(0.07, 0, 0);
    addMesh(new THREE.BoxGeometry(0.03, 0.22, 0.06), chromeStrut, 0, 0.1, 0, 0, 0, 0.2, clawRight);
    addMesh(new THREE.ConeGeometry(0.035, 0.1, 4), accentMat, -0.02, 0.24, 0, 0, 0, -Math.PI / 1.5, clawRight); // Ujung cakar
    clawGroup.add(clawRight);
    toolHead.add(clawGroup);

    // B. MODUL SEROK BENDA CAIR (Suction Dipper Scoop)
    const scoopGroup = new THREE.Group();
    scoopGroup.position.set(0, 0.1, 0.12);
    // Sendok mangkuk serokan fluida
    const scoopBowl = addMesh(new THREE.CylinderGeometry(0.12, 0.06, 0.16, 16, 1, false, 0, Math.PI), chromeStrut, 0, 0.08, 0, -Math.PI / 2, 0, 0, scoopGroup);
    // Selang hisap fluida ke kontainer
    addMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8), containerGlowMat, 0, -0.08, -0.06, 0.4, 0, 0, scoopGroup);
    toolHead.add(scoopGroup);

    group.add(samplingArmGroup);

    roleHooks.radarDish = radarDish;
    roleHooks.containerGlow = containerGlowMat;
    roleHooks.cargoSpecimen = cargoSpecimen;
    roleHooks.boosterFlames = boosterFlames;

    // Hooks Animasi Lengan Sampling Hermes
    roleHooks.samplingArmGroup = samplingArmGroup;
    roleHooks.upperArm = upperArm;
    roleHooks.forearmGroup = forearmGroup;
    roleHooks.toolHead = toolHead;
    roleHooks.clawGroup = clawGroup;
    roleHooks.clawLeft = clawLeft;
    roleHooks.clawRight = clawRight;
    roleHooks.scoopGroup = scoopGroup;
    roleHooks.samplingMode = 'idle'; // 'idle' | 'claw' | 'scoop'
    roleHooks.samplingProgress = 0;
  }

  /* ---------------------------------------------------------
   * 7. ROLE BEACON & NAV LIGHTS
   * --------------------------------------------------------- */
  addMesh(new THREE.SphereGeometry(0.13, 12, 8), accentMat, -0.4, 1.45, 0.9);
  addMesh(new THREE.SphereGeometry(0.045, 8, 8), accentMat, -0.75, 1.15, -1.15);
  addMesh(new THREE.SphereGeometry(0.045, 8, 8), accentMat, 0.75, 1.15, -1.15);

  /* ---------------------------------------------------------
   * 8. HOLOGRAPHIC 3D IDENTIFIER TAG
   * --------------------------------------------------------- */
  const sprite = createRoverTag(callsign, name, missionTitle, accent);
  sprite.position.set(0, 5.5, 0);
  sprite.scale.set(8.0, 3.4, 1);
  sprite.renderOrder = 999;
  group.add(sprite);

  group.userData = {
    groundOffset: 0,
    role,
    name,
    callsign,
    missionTitle,
    tagSprite: sprite,
    roleHooks,
    wheelGroups,
  };

  return group;
}

/**
 * Creates a clean HUD canvas sprite billboard above each robot.
 */
function createRoverTag(callsign, name, missionTitle, accentColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 220;
  const ctx = canvas.getContext('2d');

  const hex = '#' + accentColor.toString(16).padStart(6, '0');

  // Box background
  ctx.fillStyle = 'rgba(14, 10, 8, 0.90)';
  ctx.strokeStyle = hex;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 170, 24);
  ctx.fill();
  ctx.stroke();

  // Top header bar
  ctx.fillStyle = hex;
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 42, [24, 24, 0, 0]);
  ctx.fill();

  // Badge callsign
  ctx.fillStyle = '#0f0c0a';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`ROBOT ${callsign} · ${missionTitle.toUpperCase()}`, 256, 40);

  // Robot Name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px system-ui, sans-serif';
  ctx.fillText(name, 256, 115);

  // Status subtitle
  ctx.fillStyle = hex;
  ctx.font = '22px monospace';
  ctx.fillText('MISSION ACTIVE · AUTONOMOUS SYSTEM', 256, 155);

  // Pointer
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
