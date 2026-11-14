import * as THREE from 'three';

/**
 * MissionSystem — Mengelola alur kerja misi:
 * 1. Setiap wilayah geologi memiliki Benda Unik 3D (Unique Artifact / Specimen) di tanah.
 * 2. Radar Hermes Transport secara otomatis mendeteksi benda unik dalam jangkauan.
 * 3. Benda unik otomatis diambil dan dimasukkan ke dalam Kontainer Kargo Hermes.
 * 4. Hermes melaju kencang mengantar kargo ke Stasiun Lab Sains buatan GeoLab untuk diteliti.
 * 5. Checklist pencapaian riset & skor sains bertambah.
 */

export const REGION_SCIENCE_DATA = {
  elysium: {
    id: 'elysium',
    name: 'Elysium',
    artifactName: 'Kristal Inti Magma (Magma Core Crystal)',
    rockType: 'Lava Basaltik & Kaldera Vulkanik',
    mineral: 'Olivin Basaltik & Silikat Magmatik',
    color: 0xff5500,
    offsetX: -8000,
    offsetY: 6000,
    significance: 'Bukti aktivitas vulkanisme termuda di Mars.',
    analysisResult: 'Komposisi: 52% Basalt, 28% Piroksen, 14% Olivin, 6% Magnetit. Suhu pendinginan magma terkonfirmasi!',
  },
  syrtis: {
    id: 'syrtis',
    name: 'Syrtis Major Planum',
    artifactName: 'Permata Mantel Olivin (Mantle Peridotite Gem)',
    rockType: 'Perisai Lava Basalt Gelap',
    mineral: 'Plagioklas Kalsik & Piroksen Besi',
    color: 0x00ff88,
    offsetX: -6000,
    offsetY: -7000,
    significance: 'Stratigrafi evolusi mantel purba Mars.',
    analysisResult: 'Komposisi: 60% Plagioklas, 24% Klinopiroksen, 11% Ilmenit. Albedo gelap berasal dari kristalisasi lava murni!',
  },
  acidalia: {
    id: 'acidalia',
    name: 'Acidalia Planitia',
    artifactName: 'Inti Es Hidrotermal Purba (Hydrothermal Ice Core)',
    rockType: 'Sedimen Danau & Lempung Hidrat',
    mineral: 'Smektit, Sulfat & Jejak Air Purba',
    color: 0x00d4ff,
    offsetX: -8000,
    offsetY: 6000,
    significance: 'Indikasi danau luas dan interaksi air-batuan masa lampau.',
    analysisResult: 'Komposisi: 42% Mineral Lempung, 31% Sulfat Hidrat, 18% Pasir Kuarsa-Besi. Jejak retensi air purba terdeteksi!',
  },
  arabia: {
    id: 'arabia',
    name: 'Arabia Terra',
    artifactName: 'Meteorit Logam Chondrite (Metallic Chondrite)',
    rockType: 'Breksia Kawah Tumbukan Kuno',
    mineral: 'Kerak Noachian Primitif & Logam Asteroid',
    color: 0xffb74d,
    offsetX: 6000,
    offsetY: 8000,
    significance: 'Lapisan kerak tertua Mars berusia > 4,1 miliar tahun.',
    analysisResult: 'Komposisi: 68% Breksia Impak, 19% Felsik, 10% Zirkon, 3% Nikel Murni. Berusia 4,12 miliar tahun!',
  },
  isidis: {
    id: 'isidis',
    name: 'Isidis Planitia',
    artifactName: 'Kaca Benturan Kosmik (Impactite Tektite Glass)',
    rockType: 'Ejecta Tumbukan Asteroid Raksasa',
    mineral: 'Impactite & Magnesit Karbonat',
    color: 0xef5350,
    offsetX: 10000,
    offsetY: -2000,
    significance: 'Material lontaran mantel dalam akibat benturan kosmik.',
    analysisResult: 'Komposisi: 48% Karbonat Magnesit, 35% Shocked Quartz, 12% Nikel-Besi. Terbentuk dari impak asteroid 1.500 km!',
  },
  hesperia: {
    id: 'hesperia',
    name: 'Hesperia Planum',
    artifactName: 'Monolit Pematang Tektonik (Tectonic Ridge Monolith)',
    rockType: 'Pematang Kerut Lava (*Wrinkle Ridges*)',
    mineral: 'Lava Transisi Hesperian',
    color: 0x66bb6a,
    offsetX: 3000,
    offsetY: -10000,
    significance: 'Penanda batas geokronologi transisi iklim Mars.',
    analysisResult: 'Komposisi: 55% Basalt Terkompresi, 25% Hematit, 15% Zeolit Tektonik. Menunjukkan gaya kompresi tektonik global!',
  },
};

export class MissionSystem {
  /**
   * @param {THREE.Scene} scene
   * @param {import('../geo/coords.js').GeoFrame} frame
   * @param {import('../terrain/heightfield.js').Heightfield} hf
   * @param {Function} getReliefAt
   */
  constructor(scene, frame, hf, getReliefAt) {
    this.scene = scene;
    this.frame = frame;
    this.hf = hf;
    this.getReliefAt = getReliefAt;

    // State Alur Misi
    this.activeWaypoint = null;    // Waypoint yang ditandai Ares Mapper
    this.labStation = null;        // Stasiun Lab Sains buatan GeoLab
    this.transportCargo = null;    // Muatan kontainer Hermes: { name, mineral, regionId, ... }
    this.transportState = 'idle';  // 'idle' | 'moving_to_target' | 'loading' | 'carrying_to_lab' | 'delivered'

    // Radar Scanning System
    this.radarRadius = 140; // meter (jangkauan deteksi radar Hermes)
    this.radarMesh = null;
    this._radarTime = 0;

    // Koleksi Benda Unik 3D di Medan
    this.artifacts = [];

    // Statistik & Poin Sains
    this.researchScore = 0;
    this.samplesAnalyzedCount = 0;

    // Quest Checklist
    this.quests = [
      { id: 'build_lab', title: 'Bangun Stasiun Lab Sains (GeoLab)', completed: false },
      { id: 'radar_pickup', title: 'Radar Hermes Deteksi & Ambil Benda Unik', completed: false },
      { id: 'deliver_lab', title: 'Hermes Kirim Kontainer ke Stasiun Lab', completed: false },
      { id: 'elysium_sample', title: 'Riset Kristal Magma Elysium', completed: false },
      { id: 'acidalia_sample', title: 'Riset Es Hidrotermal Acidalia', completed: false },
      { id: 'arabia_sample', title: 'Riset Meteorit Logam Arabia', completed: false },
      { id: 'isidis_sample', title: 'Riset Kaca Tektite Isidis', completed: false },
    ];

    // Notification callbacks
    this.onNotify = () => {};
    this.onStateChange = () => {};

    this.#initUniqueArtifacts();
    this.#initTransportRadar();
  }

  getElevation(X, Y) {
    let el = this.hf.sample(X, Y);
    if (this.getReliefAt) el += this.getReliefAt(X, Y);
    return el;
  }

  /* ---------------------------------------------------------
   * 1. MEMBUAT BENDA UNIK 3D DI SETIAP TITIK WILAYAH GEOLOGI
   * --------------------------------------------------------- */
  #initUniqueArtifacts() {
    const centerX = (this.hf.left + this.hf.left + this.hf.cols * this.hf.cell) / 2;
    const centerY = (this.hf.top + this.hf.top - this.hf.rows * this.hf.cell) / 2;

    for (const key of Object.keys(REGION_SCIENCE_DATA)) {
      const data = REGION_SCIENCE_DATA[key];
      const projX = Math.max(this.hf.minX + 800, Math.min(this.hf.maxX - 800, centerX + data.offsetX));
      const projY = Math.max(this.hf.minY + 800, Math.min(this.hf.maxY - 800, centerY + data.offsetY));
      const elev = this.getElevation(projX, projY);
      const w = this.frame.toWorld(projX, projY, elev);

      const group = new THREE.Group();
      group.position.set(w.x, w.y, w.z);

      // Model 3D Khusus untuk Benda Unik berdasarkan jenisnya
      const artifactMesh = this.#createArtifactMesh(data.id, data.color);
      artifactMesh.position.y = 15;
      group.add(artifactMesh);

      // Cincin pendar dasar di tanah
      const ringMat = new THREE.MeshBasicMaterial({ color: data.color, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
      const ring = new THREE.Mesh(new THREE.RingGeometry(18, 22, 24), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 1.5;
      group.add(ring);

      // Suar pilar cahaya vertikal lembut
      const beamMat = new THREE.MeshBasicMaterial({ color: data.color, transparent: true, opacity: 0.35 });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 3, 180, 8), beamMat);
      beam.position.y = 90;
      group.add(beam);

      // Label Billboard Melayang
      const label = this.#createFloatingLabel(`💎 ${data.artifactName}`, '#' + new THREE.Color(data.color).getHexString());
      label.position.y = 195;
      group.add(label);

      this.scene.add(group);

      this.artifacts.push({
        id: data.id,
        name: data.artifactName,
        regionName: data.name,
        mineral: data.mineral,
        rockType: data.rockType,
        color: data.color,
        analysisResult: data.analysisResult,
        X: projX,
        Y: projY,
        group,
        artifactMesh,
        collected: false,
      });
    }
  }

  #createArtifactMesh(regionId, color) {
    const hexColor = new THREE.Color(color);

    if (regionId === 'elysium') {
      // Kristal Inti Magma (Octahedron kristal obsidian menyala lava)
      const geo = new THREE.OctahedronGeometry(14, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x220500,
        emissive: 0xff3300,
        emissiveIntensity: 2.2,
        roughness: 0.2,
        metalness: 0.9,
      });
      return new THREE.Mesh(geo, mat);
    } else if (regionId === 'acidalia') {
      // Inti Es Hidrotermal (Icosahedron es kristal cyan transparan)
      const geo = new THREE.IcosahedronGeometry(15, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x88eeff,
        emissive: 0x00d4ff,
        emissiveIntensity: 1.5,
        roughness: 0.1,
        metalness: 0.8,
        transparent: true,
        opacity: 0.88,
      });
      return new THREE.Mesh(geo, mat);
    } else if (regionId === 'arabia') {
      // Fragmen Meteorit Logam (Dodecahedron kromium gelap berkilau)
      const geo = new THREE.DodecahedronGeometry(13, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x3d3a44,
        emissive: 0xffb74d,
        emissiveIntensity: 0.8,
        roughness: 0.25,
        metalness: 0.95,
      });
      return new THREE.Mesh(geo, mat);
    } else if (regionId === 'isidis') {
      // Kaca Tektite Kosmik (TorusKnot emas-merah)
      const geo = new THREE.TorusKnotGeometry(9, 3, 48, 8);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xff4422,
        emissive: 0xff8800,
        emissiveIntensity: 1.8,
        roughness: 0.2,
        metalness: 0.7,
      });
      return new THREE.Mesh(geo, mat);
    } else if (regionId === 'syrtis') {
      // Permata Mantel Olivin (Octahedron zamrud hijau berkilau)
      const geo = new THREE.OctahedronGeometry(14, 1);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x00aa55,
        emissive: 0x00ff88,
        emissiveIntensity: 2.0,
        roughness: 0.15,
        metalness: 0.85,
      });
      return new THREE.Mesh(geo, mat);
    } else {
      // Monolit Tektonik Hesperia
      const geo = new THREE.BoxGeometry(10, 24, 10);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x55aa44,
        emissive: 0x88ff66,
        emissiveIntensity: 1.2,
        roughness: 0.3,
        metalness: 0.75,
      });
      return new THREE.Mesh(geo, mat);
    }
  }

  /* ---------------------------------------------------------
   * 2. VISUAL RADAR RANGE PADA HERMES TRANSPORT
   * --------------------------------------------------------- */
  #initTransportRadar() {
    // Visual Cincin Gelombang Radar Scanner di sekeliling Hermes
    const radarGeo = new THREE.RingGeometry(this.radarRadius * 0.92, this.radarRadius, 48);
    const radarMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.radarMesh = new THREE.Mesh(radarGeo, radarMat);
    this.radarMesh.rotation.x = -Math.PI / 2;
    this.radarMesh.position.y = 2;
    this.radarMesh.visible = true;
    this.scene.add(this.radarMesh);
  }

  /* ---------------------------------------------------------
   * 3. ARES MAPPER: TANDAI WAYPOINT SAMPEL
   * --------------------------------------------------------- */
  markSampleWaypoint(roverPhysics, currentRegionId = null) {
    if (this.activeWaypoint && this.activeWaypoint.mesh) {
      this.scene.remove(this.activeWaypoint.mesh);
    }

    const X = roverPhysics.X;
    const Y = roverPhysics.Y;
    const elev = this.getElevation(X, Y);
    const w = this.frame.toWorld(X, Y, elev);

    const regionInfo = REGION_SCIENCE_DATA[currentRegionId] || {
      name: 'Jezero Western Delta',
      mineral: 'Lempung Smektit Delta & Karbonat',
      artifactName: 'Batuan Sedimen Karbonat Delta',
      analysisResult: 'Kaya akan lempung smektit berpotensi mengawetkan biosignature purba!',
      color: 0x00d4ff,
    };

    const group = new THREE.Group();
    group.position.set(w.x, w.y, w.z);

    // Model Peti Kontainer Waypoint
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x0066aa, emissiveIntensity: 1.0, roughness: 0.3, metalness: 0.8 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(16, 12, 22), boxMat);
    box.position.y = 8;
    group.add(box);

    const poleMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.5 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 160, 8), poleMat);
    pole.position.y = 80;
    group.add(pole);

    const label = this.#createFloatingLabel(`📦 WAYPOINT: ${regionInfo.mineral}`, '#00d4ff');
    label.position.y = 180;
    group.add(label);

    this.scene.add(group);

    this.activeWaypoint = {
      X,
      Y,
      worldPos: w,
      mesh: group,
      regionId: currentRegionId,
      regionName: regionInfo.name,
      artifactName: regionInfo.artifactName,
      mineral: regionInfo.mineral,
      analysisResult: regionInfo.analysisResult,
      isWaypoint: true,
    };

    this.onNotify(`[Ares Mapper] Waypoint Sampel ditandai di ${regionInfo.name}! Siap dipanggil.`);
    this.onStateChange();
    return this.activeWaypoint;
  }

  /* ---------------------------------------------------------
   * 4. PANGGIL HERMES TRANSPORT MENUJU TARGET TERDEKAT
   * Mendukung Pendorong Supersonik (atau Sub-Orbital Drop bila jarak > 10 km)
   * --------------------------------------------------------- */
  callTransportToWaypoint(instantDrop = false) {
    if (this.activeWaypoint) {
      if (instantDrop && this.rovers?.[2]) {
        this.rovers[2].physics.setPosition(this.activeWaypoint.X - 35, this.activeWaypoint.Y - 35);
        this.onNotify(`🚀 [Sub-Orbital Drop] Hermes Container mendarat tepat di samping Waypoint!`);
      }
      this.transportState = 'moving_to_target';
      this.targetDestination = { X: this.activeWaypoint.X, Y: this.activeWaypoint.Y, type: 'waypoint' };
      this.onNotify(`🚀 [Hermes Transport] Pendorong Roket Menyala! Meluncur supersonik menuju waypoint...`);
      this.onStateChange();
      return true;
    }

    // Jika belum ada waypoint, cari Benda Unik terdekat yang belum diambil
    const uncollected = this.artifacts.filter(a => !a.collected);
    if (uncollected.length > 0) {
      const target = uncollected[0];
      if (instantDrop && this.rovers?.[2]) {
        this.rovers[2].physics.setPosition(target.X - 35, target.Y - 35);
        this.onNotify(`🚀 [Sub-Orbital Drop] Hermes Container mendarat tepat di dekat ${target.name}!`);
      }
      this.transportState = 'moving_to_target';
      this.targetDestination = { X: target.X, Y: target.Y, type: 'artifact', artifact: target };
      this.onNotify(`🚀 [Hermes Transport] Pendorong Roket Menyala! Mengunci ${target.name}...`);
      this.onStateChange();
      return true;
    }

    this.onNotify(`[Info] Semua benda unik sudah diambil atau tandai waypoint baru dengan Ares Mapper!`);
    return false;
  }

  /* ---------------------------------------------------------
   * 5. CURIOSITY GEOLAB: MEMBANGUN STASIUN LAB SAINS 3D
   * --------------------------------------------------------- */
  buildScienceLab(roverPhysics) {
    if (this.labStation) {
      this.onNotify(`[GeoLab] Stasiun Lab Sains sudah aktif berdiri!`);
      return this.labStation;
    }

    const X = roverPhysics.X;
    const Y = roverPhysics.Y;
    const elev = this.getElevation(X, Y);
    const w = this.frame.toWorld(X, Y, elev);

    const labGroup = new THREE.Group();
    labGroup.position.set(w.x, w.y, w.z);

    // 1. Kubah Bio-Dome Riset Sains
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0xeeece6,
      emissive: 0x112233,
      emissiveIntensity: 0.5,
      roughness: 0.25,
      metalness: 0.6,
      transparent: true,
      opacity: 0.94,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(65, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    labGroup.add(dome);

    // Kaca Cincin Heksagonal
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x00aacc, emissiveIntensity: 1.4 });
    const winRing = new THREE.Mesh(new THREE.TorusGeometry(52, 4, 8, 24), glassMat);
    winRing.rotation.x = -Math.PI / 2;
    winRing.position.y = 35;
    labGroup.add(winRing);

    // Modul Airlock Masuk
    const airlockMat = new THREE.MeshStandardMaterial({ color: 0x33333b, roughness: 0.5, metalness: 0.8 });
    const airlock = new THREE.Mesh(new THREE.BoxGeometry(35, 25, 45), airlockMat);
    airlock.position.set(0, 12, 60);
    labGroup.add(airlock);

    // 2. Docking Cargo Pad (Platform Pembongkaran Kargo Hermes)
    const padMat = new THREE.MeshStandardMaterial({ color: 0x242428, roughness: 0.8, metalness: 0.5 });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(42, 44, 6, 24), padMat);
    pad.position.set(75, 3, 20);
    labGroup.add(pad);

    const padRingMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, side: THREE.DoubleSide });
    const padRing = new THREE.Mesh(new THREE.RingGeometry(32, 36, 24), padRingMat);
    padRing.rotation.x = -Math.PI / 2;
    padRing.position.set(75, 6.2, 20);
    labGroup.add(padRing);

    // Menara Pemancar Komunikasi
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(2, 4, 140, 8), airlockMat);
    mast.position.set(-45, 70, -35);
    labGroup.add(mast);

    const beaconLight = new THREE.PointLight(0x00d4ff, 4, 800);
    beaconLight.position.set(0, 100, 0);
    labGroup.add(beaconLight);

    const labLabel = this.#createFloatingLabel('🔬 MARS SCIENCE LAB ALPHA (READY)', '#00ff88');
    labLabel.position.y = 135;
    labGroup.add(labLabel);

    this.scene.add(labGroup);

    this.labStation = {
      X,
      Y,
      worldPos: w,
      mesh: labGroup,
      name: 'Mars Science Lab Alpha',
      dockX: X + 75,
      dockY: Y + 20,
    };

    this.completeQuest('build_lab');
    this.onNotify(`🎉 [GeoLab] Stasiun Lab Sains Alpha berhasil didirikan! Siap meneliti spesimen.`);
    this.onStateChange();

    // Jika Hermes sudah memegang kargo di kontainernya, langsung perintahkan Hermes ke Lab!
    if (this.transportCargo) {
      this.transportState = 'carrying_to_lab';
      this.onNotify(`[Hermes Transport] Stasiun Lab terdeteksi! Meluncur kencang mengantar kargo ke Lab...`);
    }

    return this.labStation;
  }

  /* ---------------------------------------------------------
   * 6. UPDATE SIMULASI RADAR & ALUR KERJA (DIPANGGIL TIAP FRAME)
   * --------------------------------------------------------- */
  update(dt, rovers) {
    this._radarTime += dt;
    const transportRover = rovers[2]; // Hermes Transport
    if (!transportRover) return;

    const tPhys = transportRover.physics;
    const hooks = transportRover.mesh?.userData?.roleHooks;

    // A. Update Visual Cincin Radar di sekeliling Hermes
    if (this.radarMesh) {
      const w = this.frame.toWorld(tPhys.X, tPhys.Y, tPhys.elevation);
      this.radarMesh.position.set(w.x, w.y + 3, w.z);
      // Denyut radar berirama
      const scalePulse = 1.0 + 0.12 * Math.sin(this._radarTime * 3.5);
      this.radarMesh.scale.set(scalePulse, scalePulse, scalePulse);
      this.radarMesh.material.opacity = 0.25 + 0.15 * Math.sin(this._radarTime * 3.5);
    }

    // B. Animasi Benda Unik di Tanah (Berputar & Melayang)
    for (const art of this.artifacts) {
      if (!art.collected && art.artifactMesh) {
        art.artifactMesh.rotation.y += dt * 1.5;
        art.artifactMesh.rotation.x = Math.sin(this._radarTime * 2.0) * 0.2;
        art.artifactMesh.position.y = 15 + Math.sin(this._radarTime * 2.5 + art.color) * 5;
      }
    }

    // C. RADAR SCANNING OTOMATIS: Deteksi Benda Unik di Dekat Hermes
    if (!this.transportCargo) {
      for (const art of this.artifacts) {
        if (art.collected) continue;

        const dist = Math.hypot(tPhys.X - art.X, tPhys.Y - art.Y);
        // Jika terpantau dalam jangkauan radar Hermes (< radarRadius)
        if (dist < this.radarRadius) {
          // KUNCI TARGET & AMBIL KE DALAM KONTAINER!
          art.collected = true;
          this.scene.remove(art.group);

          this.transportCargo = {
            id: art.id,
            name: art.name,
            regionName: art.regionName,
            mineral: art.mineral,
            rockType: art.rockType,
            analysisResult: art.analysisResult,
          };

          // Nyalakan visual kargo di dalam kontainer Hermes
          if (hooks && hooks.cargoSpecimen) {
            hooks.cargoSpecimen.visible = true;
          }

          this.completeQuest('radar_pickup');
          this.onNotify(`🎯 [RADAR LOCK] ${art.name} Terdeteksi & Dimasukkan ke Kontainer Hermes!`);

          // SETELAH DIAMBIL -> LANGSUNG KIRIM KE LAB!
          if (this.labStation) {
            this.transportState = 'carrying_to_lab';
            this.onNotify(`🚀 [Hermes Container] Membawa spesimen! Melaju kencang langsung ke Stasiun Lab Sains...`);
          } else {
            this.transportState = 'idle';
            this.onNotify(`⚠️ [Perhatian] Benda Unik ada di Kontainer! Gunakan Robot 02 (GeoLab) tekan B untuk membangun Lab Sains!`);
          }

          this.onStateChange();
          break;
        }
      }

      // Deteksi Waypoint Ares Mapper jika didekati
      if (this.activeWaypoint && !this.transportCargo) {
        const distW = Math.hypot(tPhys.X - this.activeWaypoint.X, tPhys.Y - this.activeWaypoint.Y);
        if (distW < 45.0) {
          this.transportCargo = {
            id: this.activeWaypoint.regionId || 'waypoint',
            name: this.activeWaypoint.artifactName,
            regionName: this.activeWaypoint.regionName,
            mineral: this.activeWaypoint.mineral,
            analysisResult: this.activeWaypoint.analysisResult,
          };
          if (this.activeWaypoint.mesh) this.scene.remove(this.activeWaypoint.mesh);
          this.activeWaypoint = null;

          if (hooks && hooks.cargoSpecimen) hooks.cargoSpecimen.visible = true;

          this.completeQuest('radar_pickup');
          this.onNotify(`📦 [Hermes Container] Kontainer sampel berhasil dimuat! Meluncur ke Stasiun Lab...`);

          if (this.labStation) {
            this.transportState = 'carrying_to_lab';
          } else {
            this.transportState = 'idle';
          }
          this.onStateChange();
        }
      }
    }

    // D. NAVIGASI OTOMATIS SUPER-CEPAT HERMES: MENUJU TARGET (Bila sedang dipanggil)
    if (this.transportState === 'moving_to_target' && this.targetDestination) {
      const dx = this.targetDestination.X - tPhys.X;
      const dy = this.targetDestination.Y - tPhys.Y;
      const dist = Math.hypot(dx, dy);

      // Kemudikan Hermes melaju hiper-cepat dengan pendorong roket kargo
      this.#driveHermesFast(tPhys, this.targetDestination.X, this.targetDestination.Y, dt);

      if (dist < 40.0) {
        this.targetDestination = null;
      }
    }

    // E. NAVIGASI OTOMATIS SUPER-CEPAT HERMES: MENGANTAR KE STASIUN LAB
    else if (this.transportState === 'carrying_to_lab') {
      if (!this.labStation) {
        tPhys.speed *= Math.exp(-3 * dt);
        return;
      }

      const dx = this.labStation.dockX - tPhys.X;
      const dy = this.labStation.dockY - tPhys.Y;
      const dist = Math.hypot(dx, dy);

      // Kemudikan Hermes melaju hiper-cepat ke Docking Pad Lab
      this.#driveHermesFast(tPhys, this.labStation.dockX, this.labStation.dockY, dt);

      // Begitu sampai di Docking Pad Lab (< 42m)
      if (dist < 42.0) {
        tPhys.speed = 0;
        this.#deliverCargoToLab(hooks);
      }
    }
  }

  /* ---------------------------------------------------------
   * 7. LOGIKA KEMUDI SUPERSONIK & GESIT UNTUK HERMES TRANSPORT
   * Menggunakan pendorong jet roket adaptif:
   * Jarak jauh (> 1500m): melesat hingga 500-600 m/s (~1.800 km/jam)
   * Jarak menengah (400-1500m): 320 m/s
   * Jarak dekat (80-400m): 160 m/s
   * Jarak docking (< 80m): 55 m/s
   * --------------------------------------------------------- */
  #driveHermesFast(physics, targetX, targetY, dt) {
    const dx = targetX - physics.X;
    const dy = targetY - physics.Y;
    const dist = Math.hypot(dx, dy);

    const desiredHeading = Math.atan2(dx, dy);
    let diff = desiredHeading - physics.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    // Arah kemudi terkunci presisi tanpa goyang
    physics.heading += diff * Math.min(1.0, 7.5 * dt);

    // Kecepatan adaptif supersonik
    let targetSpeed = 55;
    if (dist > 2500) targetSpeed = 580;
    else if (dist > 1000) targetSpeed = 420;
    else if (dist > 350) targetSpeed = 240;
    else if (dist > 80) targetSpeed = 120;

    // Tarikan akselerasi pendorong roket kontainer super cepat (260 m/s²)
    const accelRate = 260;
    const dv = Math.sign(targetSpeed - physics.speed) * Math.min(Math.abs(targetSpeed - physics.speed), accelRate * dt);
    physics.speed += dv;

    // Perbarui koordinat seketika mengikuti kecepatan tinggi
    const s = Math.sin(physics.heading), c = Math.cos(physics.heading);
    physics.X += s * physics.speed * dt;
    physics.Y += c * physics.speed * dt;
    physics.elevation = this.getElevation(physics.X, physics.Y);
    physics.status = `🚀 HYPER-DRIVE (${physics.speed.toFixed(0)} m/s)`;
  }

  /* ---------------------------------------------------------
   * 8. PENYERAHAN & ANALISIS SPESIMEN DI STASIUN LAB
   * --------------------------------------------------------- */
  #deliverCargoToLab(hooks) {
    const cargo = this.transportCargo;
    if (!cargo) return;

    this.samplesAnalyzedCount++;
    this.researchScore += 350;

    this.completeQuest('deliver_lab');
    if (cargo.id === 'elysium') this.completeQuest('elysium_sample');
    if (cargo.id === 'acidalia') this.completeQuest('acidalia_sample');
    if (cargo.id === 'arabia') this.completeQuest('arabia_sample');
    if (cargo.id === 'isidis') this.completeQuest('isidis_sample');

    // Kosongkan kargo di kontainer Hermes
    this.transportCargo = null;
    this.transportState = 'delivered';
    if (hooks && hooks.cargoSpecimen) {
      hooks.cargoSpecimen.visible = false;
    }

    this.onNotify(`🔬 [ANALISIS LAB SELESAI] ${cargo.name} diteliti! ${cargo.analysisResult} (+350 Poin Sains)`);
    this.onStateChange();

    setTimeout(() => {
      this.transportState = 'idle';
      this.onStateChange();
    }, 4500);
  }

  completeQuest(questId) {
    const q = this.quests.find(item => item.id === questId);
    if (q && !q.completed) {
      q.completed = true;
      this.researchScore += 150;
      this.onNotify(`✓ TARGET TERCAPAI: ${q.title} (+150 Poin)`);
      this.onStateChange();
    }
  }

  #createFloatingLabel(text, colorHex = '#00d4ff') {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(15, 10, 8, 0.90)';
    const r = 24, w = 1024, h = 192;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.lineTo(w - r, 0); ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h - r); ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r, h); ctx.quadraticCurveTo(0, h, 0, h - r);
    ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.fill();

    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = colorHex;
    ctx.font = 'bold 52px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sprite.scale.set(160, 30, 1);
    return sprite;
  }
}
