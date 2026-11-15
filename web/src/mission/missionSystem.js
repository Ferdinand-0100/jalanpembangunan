import * as THREE from 'three';

/**
 * MissionSystem — Mengelola alur kerja misi:
 * 1. Setiap wilayah geologi memiliki Benda Unik 3D (Unique Artifact / Specimen) di tanah.
 * 2. Radar Hermes Transport secara otomatis mendeteksi benda unik dalam jangkauan.
 * 3. Benda unik otomatis diambil dan dimasukkan ke dalam Kontainer Kargo Hermes.
 * 4. Hermes melaju kencang mengantar kargo ke Stasiun Lab Sains buatan GeoLab untuk diteliti.
 * 5. Checklist pencapaian riset & skor sains bertambah.
 */

/**
 * Forces all sprites (labels/billboards) inside a group to always render on top
 * of terrain and other opaque geometry, regardless of depth.
 */
function forceSpritesOnTop(group, renderOrder = 999) {
  group.traverse(obj => {
    if (obj.isSprite) {
      obj.renderOrder = renderOrder;
      if (obj.material) {
        obj.material.depthTest = false;
        obj.material.depthWrite = false;
      }
    }
  });
}

export const REGION_SCIENCE_DATA = {
  elysium: {
    id: 'elysium',
    name: 'Elysium',
    stateOfMatter: 'solid',
    artifactName: 'Magma Core Crystal',
    rockType: 'Basaltic Lava & Volcanic Caldera',
    mineral: 'Basaltic Olivine & Magmatic Silicates',
    color: 0xff5500,
    offsetX: -8000,
    offsetY: 6000,
    significance: 'Evidence of the youngest volcanism on Mars.',
    analysisResult: 'Composition: 52% Basalt, 28% Pyroxene, 14% Olivine, 6% Magnetite. Magma cooling temperature confirmed!',
  },
  syrtis: {
    id: 'syrtis',
    name: 'Syrtis Major Planum',
    stateOfMatter: 'solid',
    artifactName: 'Mantle Peridotite Gem',
    rockType: 'Dark Basaltic Lava Shield',
    mineral: 'Calcic Plagioclase & Iron Pyroxene',
    color: 0x00ff88,
    offsetX: -6000,
    offsetY: -7000,
    significance: 'Stratigraphy of ancient Martian mantle evolution.',
    analysisResult: 'Composition: 60% Plagioclase, 24% Clinopyroxene, 11% Ilmenite. Dark albedo originates from pure crystalline lava!',
  },
  acidalia: {
    id: 'acidalia',
    name: 'Acidalia Planitia',
    stateOfMatter: 'liquid',
    artifactName: 'Hydrothermal Brine Liquid',
    rockType: 'Lacustrine Fluid Reservoir & Hydrothermal Springs',
    mineral: 'Sulfate Salt Solution, Smectite & Ancient Water',
    color: 0x00d4ff,
    offsetX: -8000,
    offsetY: 6000,
    significance: 'Evidence of past subsurface hydrothermal fluid circulation.',
    analysisResult: 'Composition: 74% Dissolved Mg-Sulfate Brine, 18% Dissolved Silicic Acid, 8% Chlorides. Ancient liquid fluid proven!',
  },
  arabia: {
    id: 'arabia',
    name: 'Arabia Terra',
    stateOfMatter: 'solid',
    artifactName: 'Metallic Chondrite Meteorite',
    rockType: 'Ancient Impact Crater Breccia',
    mineral: 'Primitive Noachian Crust & Asteroidal Metals',
    color: 0xffb74d,
    offsetX: 6000,
    offsetY: 8000,
    significance: 'Oldest Martian crustal layer dating back > 4.1 billion years.',
    analysisResult: 'Composition: 68% Impact Breccia, 19% Felsic, 10% Zircon, 3% Pure Nickel. Dated at 4.12 billion years!',
  },
  isidis: {
    id: 'isidis',
    name: 'Isidis Planitia',
    stateOfMatter: 'solid',
    artifactName: 'Impactite Tektite Glass',
    rockType: 'Giant Asteroid Impact Ejecta',
    mineral: 'Impactite & Magnesite Carbonate',
    color: 0xef5350,
    offsetX: 10000,
    offsetY: -2000,
    significance: 'Deep mantle ejecta excavated by cosmic impact.',
    analysisResult: 'Composition: 48% Magnesite Carbonate, 35% Shocked Quartz, 12% Nickel-Iron. Formed by 1,500 km asteroid impact!',
  },
  hesperia: {
    id: 'hesperia',
    name: 'Hesperia Planum',
    stateOfMatter: 'liquid',
    artifactName: 'Wrinkle Ridge Geothermal Brine',
    rockType: 'Tectonic Ridge Thermal Fluid Pool',
    mineral: 'Iron-Rich Fluid, Dissolved Sulfides & Zeolites',
    color: 0x66bb6a,
    offsetX: 3000,
    offsetY: -10000,
    significance: 'Marker of post-compression global tectonic geothermal fluid circulation.',
    analysisResult: 'Composition: 62% Iron-Sulfate Solution, 22% Colloidal Zeolites, 16% Carbonates. Active geothermal source!',
  },
};

export const OLYMPUS_SCIENCE_DATA = {
  zeus_patera: {
    id: 'zeus_patera',
    name: 'Zeus Patera',
    stateOfMatter: 'solid',
    artifactName: 'Graben Fault Breccia',
    rockType: 'Tholeiitic Basalt & Caldera Extensional Faults',
    mineral: 'Diallage Plagioclase, Pyroxene & Iron Oxides',
    color: 0xffb74d,
    offsetX: -2000,
    offsetY: 4000,
    significance: 'Evidence of extensional tectonic rifting on the oldest caldera floor of Olympus Mons.',
    analysisResult: 'Composition: 58% Tholeiitic Basalt, 26% Diallage Plagioclase, 16% Iron Oxides. NW-SE trending graben fault confirmed!',
  },
  hera_patera: {
    id: 'hera_patera',
    name: 'Hera Patera',
    stateOfMatter: 'solid',
    artifactName: 'Arcuate Scarp Basalt Fragment',
    rockType: 'Western Caldera Normal Fault Scarp Wall',
    mineral: 'Calcic Pyroxene, Ancient Olivine & Ilmenite',
    color: 0xff7043,
    offsetX: -17500,
    offsetY: 1500,
    significance: 'Evidence of stepwise 2.7 km collapse episodes on the western caldera wall.',
    analysisResult: 'Composition: 64% Pyroxene, 22% Ancient Olivine, 14% Ilmenite. Normal fault shear slickensides verified!',
  },
  hermes_patera: {
    id: 'hermes_patera',
    name: 'Hermes Patera',
    stateOfMatter: 'solid',
    artifactName: 'Ridge Arch Pahoehoe Crust',
    rockType: 'Tectonically Deformed Curved Lava Crust',
    mineral: 'Glassy Basalt, Anorthite & Magnetite',
    color: 0xab47bc,
    offsetX: 4000,
    offsetY: -6000,
    significance: 'Ridge arch and wrinkle ridge morphology from lava deformation beneath frozen crust.',
    analysisResult: 'Composition: 48% Glassy Basalt, 34% Anorthite, 18% Vesicular Magnetite. Compressional deformation in lava lake proven!',
  },
  dionysus_patera: {
    id: 'dionysus_patera',
    name: 'Dionysus Patera',
    stateOfMatter: 'liquid',
    artifactName: 'Fumarolic Sulfur Condensate Brine',
    rockType: 'Hydrothermal Fluid & Volcanic Sulfur Sublimates',
    mineral: 'Sulfur-Chloride Solution & Dissolved Iron Sulfate',
    color: 0x4fc3f7,
    offsetX: -3500,
    offsetY: -9000,
    significance: 'Residual fumarolic gas activity at the base of Dionysus basin connected to Hermes.',
    analysisResult: 'Composition: 68% Sulfur-Chloride Solution, 20% Dilute Sulfuric Acid, 12% Colloidal Silica. Residual volatile activity detected!',
  },
  athena_patera: {
    id: 'athena_patera',
    name: 'Athena Patera',
    stateOfMatter: 'solid',
    artifactName: 'Picritic Basalt of Circular Caldera',
    rockType: 'Primitive Basaltic Lava of Circular Caldera',
    mineral: 'Forsteritic Olivine, Diopside & Chromite',
    color: 0x66bb6a,
    offsetX: 14500,
    offsetY: 12500,
    significance: 'Primary deep-mantle lava from an independent northeast magma chamber eruption.',
    analysisResult: 'Composition: 54% Forsteritic Olivine, 32% Diopside, 14% Chromite. Primitive undifferentiated magma!',
  },
  apollo_patera: {
    id: 'apollo_patera',
    name: 'Apollo Patera',
    stateOfMatter: 'solid',
    artifactName: 'Apollo Chilled Vitrophyre',
    rockType: 'Rapidly Quenched Volcanic Glass',
    mineral: 'Amorphous Silicate Glass, Microcrystalline Feldspar',
    color: 0xef5350,
    offsetX: -14000,
    offsetY: -12500,
    significance: 'Volcanic glass rock prior to burial under Pangboche crater ejecta blanket.',
    analysisResult: 'Composition: 72% Amorphous Silicate Glass, 18% Microcrystalline Feldspar, 10% Iron Oxide. Extreme cooling rate!',
  },
  pangboche_crater: {
    id: 'pangboche_crater',
    name: 'Pangboche Crater',
    stateOfMatter: 'solid',
    artifactName: 'Pangboche Impactite Ejecta Glass',
    rockType: '10.4 km Asteroid Impact Ejecta & Shocked Minerals',
    mineral: 'Shocked Quartz, Shocked Plagioclase, Nickel-Iridium',
    color: 0xffffff,
    offsetX: -9500,
    offsetY: -11500,
    significance: 'Ejecta blanket from youngest 10.4 km crater covering Apollo & Dionysus, proving relative age sequence.',
    analysisResult: 'Composition: 45% Shocked Quartz & Plagioclase, 38% Impact Melt Glass, 17% Asteroidal Nickel-Iridium. Post-caldera cosmic impact confirmed!',
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

    this.activeMapId = 'usgs-i-1802-a';
    this.artifacts = [];

    // Statistik & Poin Sains
    this.researchScore = 0;
    this.samplesAnalyzedCount = 0;

    // Quest Checklist
    this.quests = [
      { id: 'build_lab', title: 'Build Science Lab Station (GeoLab)', completed: false },
      { id: 'radar_pickup', title: 'Hermes Radar Detects & Picks Up Unique Object', completed: false },
      { id: 'deliver_lab', title: 'Hermes Delivers Container to Lab Station', completed: false },
      { id: 'elysium_sample', title: 'Research Elysium Magma Crystal', completed: false },
      { id: 'acidalia_sample', title: 'Research Acidalia Hydrothermal Ice', completed: false },
      { id: 'arabia_sample', title: 'Research Arabia Metal Meteorite', completed: false },
      { id: 'isidis_sample', title: 'Research Isidis Tektite Glass', completed: false },
    ];

    // Notification callbacks
    this.onNotify = () => {};
    this.onStateChange = () => {};
    this.onTaskComplete = () => {};

    this.#initUniqueArtifacts();
    this.#initTransportRadar();
  }

  setMapMode(mapId) {
    this.activeMapId = mapId;
    for (const a of this.artifacts) {
      if (a.mesh) this.scene.remove(a.mesh);
    }
    this.artifacts = [];
    if (mapId === 'usgs-sim-3470') {
      this.quests = [
        { id: 'build_lab', title: 'Build Science Lab Station (GeoLab)', completed: false },
        { id: 'radar_pickup', title: 'Hermes Radar Detects & Picks Up Unique Object', completed: false },
        { id: 'deliver_lab', title: 'Hermes Delivers Container to Lab Station', completed: false },
        { id: 'zeus_sample', title: 'Research Zeus Patera Graben Fault Breccia', completed: false },
        { id: 'pangboche_sample', title: 'Research Pangboche Crater Ejecta Impactite', completed: false },
        { id: 'dionysus_sample', title: 'Research Dionysus Fumarolic Sulfur Fluid', completed: false },
        { id: 'athena_sample', title: 'Research Athena Circular Caldera Picritic Basalt', completed: false },
      ];
    } else {
      this.quests = [
        { id: 'build_lab', title: 'Build Science Lab Station (GeoLab)', completed: false },
        { id: 'radar_pickup', title: 'Hermes Radar Detects & Picks Up Unique Object', completed: false },
        { id: 'deliver_lab', title: 'Hermes Delivers Container to Lab Station', completed: false },
        { id: 'elysium_sample', title: 'Research Elysium Magma Crystal', completed: false },
        { id: 'acidalia_sample', title: 'Research Acidalia Hydrothermal Ice', completed: false },
        { id: 'arabia_sample', title: 'Research Arabia Metal Meteorite', completed: false },
        { id: 'isidis_sample', title: 'Research Isidis Tektite Glass', completed: false },
      ];
    }
    this.#initUniqueArtifacts();
    this.onStateChange();
  }

  getScienceDataDict() {
    return (this.activeMapId === 'usgs-sim-3470') ? OLYMPUS_SCIENCE_DATA : REGION_SCIENCE_DATA;
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
    const dict = this.getScienceDataDict();
    const centerX = (this.hf.left + this.hf.left + this.hf.cols * this.hf.cell) / 2;
    const centerY = (this.hf.top + this.hf.top - this.hf.rows * this.hf.cell) / 2;

    for (const key of Object.keys(dict)) {
      const data = dict[key];
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
      const matterTag = data.stateOfMatter === 'solid' ? '[SOLID]' : '[LIQUID]';
      const label = this.#createFloatingLabel(`${matterTag} ${data.artifactName}`, '#' + new THREE.Color(data.color).getHexString());
      label.position.y = 195;
      group.add(label);

      forceSpritesOnTop(group);
      this.scene.add(group);

      this.artifacts.push({
        id: data.id,
        name: data.artifactName,
        regionName: data.name,
        stateOfMatter: data.stateOfMatter || 'solid', // 'solid' | 'liquid'
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
      // PADAT: Kristal Inti Magma (Octahedron kristal obsidian menyala lava)
      const group = new THREE.Group();
      const geo = new THREE.OctahedronGeometry(15, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x220500,
        emissive: 0xff3300,
        emissiveIntensity: 2.2,
        roughness: 0.2,
        metalness: 0.9,
      });
      group.add(new THREE.Mesh(geo, mat));
      // Kerikil kristal basal padat di sekelilingnya
      for (let i = 0; i < 4; i++) {
        const mini = new THREE.Mesh(new THREE.DodecahedronGeometry(4, 0), mat);
        mini.position.set(Math.sin(i * 1.57) * 12, -4, Math.cos(i * 1.57) * 12);
        group.add(mini);
      }
      return group;
    } else if (regionId === 'acidalia') {
      // CAIR: Akuifer Fluida Hidrotermal (Kolam Fluida Danau Berpendar Cyan Bergelombang)
      const group = new THREE.Group();
      // Bak/kawah penampung fluida purba
      const basinMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8, metalness: 0.2 });
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(18, 14, 6, 24), basinMat);
      basin.position.y = -3;
      group.add(basin);

      // Permukaan fluida cair cyan bergelombang (rippling brine pool)
      const fluidMat = new THREE.MeshStandardMaterial({
        color: 0x00d4ff,
        emissive: 0x0088cc,
        emissiveIntensity: 1.6,
        roughness: 0.05,
        metalness: 0.9,
        transparent: true,
        opacity: 0.88,
      });
      const fluidSurface = new THREE.Mesh(new THREE.CylinderGeometry(16.5, 16.5, 1.2, 24), fluidMat);
      fluidSurface.position.y = 0.5;
      group.add(fluidSurface);

      // Gelembung fluida hidrotermal meletup ke atas
      for (let i = 0; i < 3; i++) {
        const bubble = new THREE.Mesh(
          new THREE.SphereGeometry(2.5, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0x88eeff, transparent: true, opacity: 0.75 })
        );
        bubble.position.set((i - 1) * 6, 4 + i * 2, (i % 2 === 0 ? 3 : -3));
        group.add(bubble);
      }
      return group;
    } else if (regionId === 'arabia') {
      // PADAT: Fragmen Meteorit Logam (Dodecahedron kromium gelap berkilau)
      const geo = new THREE.DodecahedronGeometry(14, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x3d3a44,
        emissive: 0xffb74d,
        emissiveIntensity: 0.8,
        roughness: 0.25,
        metalness: 0.95,
      });
      return new THREE.Mesh(geo, mat);
    } else if (regionId === 'isidis') {
      // PADAT: Kaca Tektite Kosmik (TorusKnot emas-merah)
      const geo = new THREE.TorusKnotGeometry(10, 3.2, 48, 8);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xff4422,
        emissive: 0xff8800,
        emissiveIntensity: 1.8,
        roughness: 0.2,
        metalness: 0.7,
      });
      return new THREE.Mesh(geo, mat);
    } else if (regionId === 'syrtis') {
      // PADAT: Permata Mantel Olivin (Octahedron zamrud hijau berkilau)
      const geo = new THREE.OctahedronGeometry(15, 1);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x00aa55,
        emissive: 0x00ff88,
        emissiveIntensity: 2.0,
        roughness: 0.15,
        metalness: 0.85,
      });
      return new THREE.Mesh(geo, mat);
    } else if (regionId === 'zeus_patera') {
      // PADAT: Breksia Sesar Graben Zeus
      const group = new THREE.Group();
      const boxGeo = new THREE.BoxGeometry(16, 12, 14);
      const boxMat = new THREE.MeshStandardMaterial({ color: 0x2b2416, roughness: 0.8, metalness: 0.3 });
      group.add(new THREE.Mesh(boxGeo, boxMat));
      const veinGeo = new THREE.BoxGeometry(16.4, 2.5, 4);
      const veinMat = new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0xff8800,
        emissiveIntensity: 2.0,
        metalness: 0.8,
        roughness: 0.2,
      });
      group.add(new THREE.Mesh(veinGeo, veinMat));
      return group;
    } else if (regionId === 'hera_patera') {
      // PADAT: Fragmen Basal Tebing Busur Hera
      const geo = new THREE.CylinderGeometry(14, 18, 10, 6);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x3d2015,
        emissive: 0xff5522,
        emissiveIntensity: 1.2,
        roughness: 0.5,
        metalness: 0.6,
      });
      return new THREE.Mesh(geo, mat);
    } else if (regionId === 'hermes_patera') {
      // PADAT: Pahoehoe Pematang Busur Hermes
      const geo = new THREE.TorusKnotGeometry(11, 3.2, 48, 8);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x3b1540,
        emissive: 0xab47bc,
        emissiveIntensity: 1.8,
        roughness: 0.2,
        metalness: 0.7,
      });
      return new THREE.Mesh(geo, mat);
    } else if (regionId === 'dionysus_patera') {
      // CAIR: Kondensat Gas Fumarol Dionysus
      const group = new THREE.Group();
      const basinMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 });
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(18, 14, 6, 24), basinMat);
      basin.position.y = -3;
      group.add(basin);
      const fluidMat = new THREE.MeshStandardMaterial({
        color: 0x00e5ff,
        emissive: 0x00aacc,
        emissiveIntensity: 1.8,
        roughness: 0.05,
        metalness: 0.9,
        transparent: true,
        opacity: 0.88,
      });
      const fluid = new THREE.Mesh(new THREE.CylinderGeometry(16.5, 16.5, 1.2, 24), fluidMat);
      fluid.position.y = 0.5;
      group.add(fluid);
      return group;
    } else if (regionId === 'athena_patera') {
      // PADAT: Basal Pikrit Kaldera Bulat Athena
      const geo = new THREE.OctahedronGeometry(15, 1);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x0a3318,
        emissive: 0x38ef7d,
        emissiveIntensity: 2.2,
        roughness: 0.15,
        metalness: 0.85,
      });
      return new THREE.Mesh(geo, mat);
    } else if (regionId === 'apollo_patera') {
      // PADAT: Vitrofir Obsidian Danau Lava Apollo
      const geo = new THREE.DodecahedronGeometry(14, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x330509,
        emissive: 0xef4444,
        emissiveIntensity: 1.8,
        roughness: 0.08,
        metalness: 0.9,
      });
      return new THREE.Mesh(geo, mat);
    } else if (regionId === 'pangboche_crater') {
      // PADAT: Kaca Impak Ejecta Pangboche
      const group = new THREE.Group();
      const coreGeo = new THREE.IcosahedronGeometry(13, 0);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x222630,
        emissive: 0xffffff,
        emissiveIntensity: 2.4,
        roughness: 0.12,
        metalness: 0.95,
      });
      group.add(new THREE.Mesh(coreGeo, coreMat));
      const flangeGeo = new THREE.TorusGeometry(14, 2.2, 16, 32);
      const flangeMat = new THREE.MeshStandardMaterial({
        color: 0x556677,
        emissive: 0x88ccff,
        emissiveIntensity: 1.5,
        roughness: 0.2,
        metalness: 0.9,
      });
      const flange = new THREE.Mesh(flangeGeo, flangeMat);
      flange.rotation.x = Math.PI / 3;
      group.add(flange);
      return group;
    } else {
      // CAIR: Kolam Fluida Geotermal Celah Pematang Hesperia
      const group = new THREE.Group();
      const basinMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.7 });
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(17, 13, 5, 20), basinMat);
      basin.position.y = -2.5;
      group.add(basin);

      const fluidMat = new THREE.MeshStandardMaterial({
        color: 0x66bb6a,
        emissive: 0x33aa44,
        emissiveIntensity: 1.5,
        roughness: 0.1,
        metalness: 0.8,
        transparent: true,
        opacity: 0.85,
      });
      const fluid = new THREE.Mesh(new THREE.CylinderGeometry(15.5, 15.5, 1.0, 20), fluidMat);
      fluid.position.y = 0.2;
      group.add(fluid);
      return group;
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
   * 3. ARES MAPPER: TANDAI WAYPOINT SAMPEL (BENDA BATUAN MENONJOL)
   * --------------------------------------------------------- */
  markSampleWaypoint(roverPhysics, currentRegionId = null) {
    if (this.activeWaypoint && this.activeWaypoint.mesh) {
      this.scene.remove(this.activeWaypoint.mesh);
    }

    // Tempatkan benda menonjol sedikit di depan haluan Mapper agar langsung terlihat
    const forwardDist = 32;
    const X = roverPhysics.X + Math.sin(roverPhysics.heading) * forwardDist;
    const Y = roverPhysics.Y + Math.cos(roverPhysics.heading) * forwardDist;
    const elev = this.getElevation(X, Y);
    const w = this.frame.toWorld(X, Y, elev);

    const regionInfo = REGION_SCIENCE_DATA[currentRegionId] || {
      name: 'Jezero Crater Outcrop',
      mineral: 'Carbonate Sedimentary Rock & Smectite Clay',
      artifactName: 'Delta Carbonate Sedimentary Rock (Prominent Outcrop)',
      analysisResult: 'Rich in smectite clays with high potential to preserve ancient Martian biosignatures!',
      color: 0x00d4ff,
    };

    const group = new THREE.Group();
    group.position.set(w.x, w.y, w.z);

    // 1. PROMINENT OUTCROP ROCKS ON GROUND
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x3d271d,
      roughness: 0.9,
      metalness: 0.1,
    });
    // Base outcrop rock
    const baseRock = new THREE.Mesh(new THREE.DodecahedronGeometry(12, 1), rockMat);
    baseRock.scale.set(1.4, 0.8, 1.2);
    baseRock.position.y = 4;
    group.add(baseRock);

    // 2. PROMINENT SPECIMEN READY FOR HERMES PICKUP
    const crystalGeo = new THREE.OctahedronGeometry(9, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x00aacc,
      emissive: 0x00e5ff,
      emissiveIntensity: 2.2,
      roughness: 0.15,
      metalness: 0.85,
    });
    const prominentRock = new THREE.Mesh(crystalGeo, crystalMat);
    prominentRock.position.set(0, 14, 0);
    group.add(prominentRock);

    // 3. Ground Indicator Glow Ring
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide, transparent: true, opacity: 0.65 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(18, 22, 24), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 1.5;
    group.add(ring);

    // 4. Vertical Light Pillar Beacon
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.45 });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 3, 220, 8), beamMat);
    beam.position.y = 110;
    group.add(beam);

    // 5. Floating Billboard Label
    const label = this.#createFloatingLabel(`💎 PROMINENT ROCK: ${regionInfo.artifactName}`, '#00e5ff');
    label.position.y = 230;
    group.add(label);

    forceSpritesOnTop(group);
    this.scene.add(group);

    this.activeWaypoint = {
      id: currentRegionId || 'jezero_waypoint',
      X,
      Y,
      worldPos: w,
      mesh: group,
      prominentRock,
      regionId: currentRegionId || 'jezero_delta',
      regionName: regionInfo.name,
      artifactName: regionInfo.artifactName,
      stateOfMatter: 'solid',
      mineral: regionInfo.mineral,
      analysisResult: regionInfo.analysisResult,
      isWaypoint: true,
    };

    this.onNotify(`💎 [Ares Mapper] Prominent rock outcrop found in ${regionInfo.name}! Ready for Hermes pickup.`);
    this.onStateChange();

    // Visual Perception Documentation (Snapshot & Depth Camera) for Ares Mapper
    if (typeof this.onTaskComplete === 'function') {
      this.onTaskComplete({
        taskId: `MAP-WP-${Date.now()}`,
        roverId: '01',
        roverName: 'Ares Mapper',
        roverRole: 'surface-mapping',
        description: `Mapping & Discovery of Prominent Rock Outcrop: ${regionInfo.artifactName}`,
        regionId: currentRegionId || 'jezero_delta',
        regionName: regionInfo.name,
        roverPhysics: { ...roverPhysics },
        mineral: regionInfo.mineral,
        analysisResult: regionInfo.analysisResult,
      });
    }

    return this.activeWaypoint;
  }

  /* ---------------------------------------------------------
   * 4. CALL HERMES TRANSPORT TO NEAREST TARGET
   * Supports Supersonic Thrusters (or Sub-Orbital Drop if distance > 10 km)
   * --------------------------------------------------------- */
  callTransportToWaypoint(instantDrop = false) {
    if (this.activeWaypoint) {
      if (instantDrop && this.rovers?.[2]) {
        this.rovers[2].physics.setPosition(this.activeWaypoint.X - 35, this.activeWaypoint.Y - 35);
        this.onNotify(`🚀 [Sub-Orbital Drop] Hermes Container landed right next to Waypoint!`);
      }
      this.transportState = 'moving_to_target';
      this.targetDestination = { X: this.activeWaypoint.X, Y: this.activeWaypoint.Y, type: 'waypoint' };
      this.onNotify(`🚀 [Hermes Transport] Rocket thrusters engaged! Cruising supersonically to waypoint...`);
      this.onStateChange();
      return true;
    }

    // If no waypoint yet, find the closest uncollected unique artifact
    const uncollected = this.artifacts.filter(a => !a.collected);
    if (uncollected.length > 0) {
      const target = uncollected[0];
      if (instantDrop && this.rovers?.[2]) {
        this.rovers[2].physics.setPosition(target.X - 35, target.Y - 35);
        this.onNotify(`🚀 [Sub-Orbital Drop] Hermes Container landed right near ${target.name}!`);
      }
      this.transportState = 'moving_to_target';
      this.targetDestination = { X: target.X, Y: target.Y, type: 'artifact', artifact: target };
      this.onNotify(`🚀 [Hermes Transport] Rocket thrusters engaged! Locking on ${target.name}...`);
      this.onStateChange();
      return true;
    }

    this.onNotify(`[Info] All unique specimens collected, or mark a new waypoint with Ares Mapper!`);
    return false;
  }

  /* ---------------------------------------------------------
   * 5. CURIOSITY GEOLAB: MEMBANGUN STASIUN LAB SAINS 3D
   * --------------------------------------------------------- */
  buildScienceLab(roverPhysics) {
    if (this.labStation) {
      this.onNotify(`[GeoLab] Science Lab Station is already established and active!`);
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

    forceSpritesOnTop(labGroup);
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
    this.onNotify(`🎉 [GeoLab] Mars Science Lab Alpha successfully established! Ready to examine specimens.`);
    this.onStateChange();

    // Visual Perception Documentation (Snapshot & Depth Camera) for Lab Station Construction by GeoLab
    if (typeof this.onTaskComplete === 'function') {
      this.onTaskComplete({
        taskId: `BUILD-LAB-${Date.now()}`,
        roverId: '02',
        roverName: 'Curiosity GeoLab',
        roverRole: 'geological-investigation',
        description: `Construction of Field Science Lab Station on Mars`,
        regionId: 'science-base',
        regionName: 'Science Lab Station Alpha',
        roverPhysics: { ...roverPhysics },
        mineral: 'Modular Composite Structure & RTG Nuclear Reactor',
        analysisResult: 'Science Laboratory fully operational with rock incubators & laser spectrometer!',
      });
    }

    // If Hermes is already holding cargo in its container, command Hermes directly to Lab!
    if (this.transportCargo) {
      this.transportState = 'carrying_to_lab';
      this.onNotify(`[Hermes Transport] Lab Station detected! Speeding to deliver cargo to Lab...`);
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

    // C. PROSES SAMPLING OTOMATIS: Capit (Benda Padat) atau Serok (Benda Cair)
    if (this.samplingProcess) {
      this.samplingProcess.timer += dt;
      const art = this.samplingProcess.artifact;
      const isSolid = art.stateOfMatter === 'solid';
      const progress = Math.min(1.0, this.samplingProcess.timer / this.samplingProcess.duration);

      // Kemudikan haluan Hermes menghadap tepat ke benda yang diambil
      if (art) {
        const dx = art.X - tPhys.X;
        const dy = art.Y - tPhys.Y;
        const targetHeading = Math.atan2(dx, dy);
        let diff = targetHeading - tPhys.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        tPhys.heading += diff * Math.min(1.0, 6 * dt);
      }

      // Rem halus Hermes selama mengambil sampel
      tPhys.speed *= Math.exp(-5 * dt);

      if (hooks) {
        hooks.samplingMode = isSolid ? 'claw' : 'scoop';
        hooks.samplingProgress = progress;
      }

      // Animasi getar/angkat objek saat dicapit/diserok
      if (art.artifactMesh) {
        if (progress > 0.45 && progress < 0.85) {
          art.artifactMesh.position.y = 15 + (progress - 0.45) * 55;
        }
      } else if (art.prominentRock) {
        if (progress > 0.45 && progress < 0.85) {
          art.prominentRock.position.y = 14 + (progress - 0.45) * 55;
        }
      }

      if (this.samplingProcess.timer >= this.samplingProcess.duration) {
        // PROSES PENGAMBILAN SELESAI -> Masuk ke kontainer!
        if (art.collected !== undefined) art.collected = true;
        if (art.group) this.scene.remove(art.group);
        if (art.mesh) this.scene.remove(art.mesh);
        if (this.activeWaypoint && this.activeWaypoint === art) {
          this.activeWaypoint = null;
        }

        this.transportCargo = {
          id: art.id || 'jezero_delta',
          name: art.artifactName || art.name,
          stateOfMatter: art.stateOfMatter || 'solid',
          regionName: art.regionName,
          mineral: art.mineral,
          rockType: art.rockType || 'Delta Sedimentary Rock',
          analysisResult: art.analysisResult,
        };

        if (hooks) {
          hooks.samplingMode = 'idle';
          hooks.samplingProgress = 0;
          if (hooks.cargoSpecimen) hooks.cargoSpecimen.visible = true;
        }

        this.completeQuest('radar_pickup');

        const actionText = isSolid ? 'GRIPPED PROMINENT ROCK' : 'SCOOPED LIQUID MATTER';
        this.onNotify(`🦾 [${actionText} SUCCESS] ${art.artifactName || art.name} loaded into Hermes Container!`);

        // Visual Perception Documentation (Snapshot & Depth Camera) for Retrieval
        if (typeof this.onTaskComplete === 'function') {
          this.onTaskComplete({
            taskId: `SAMPLE-${(art.id || 'SP').toUpperCase()}-${Date.now()}`,
            roverId: '03',
            roverName: 'Hermes Transport',
            roverRole: 'transport-support',
            description: isSolid
              ? `Retrieval of Prominent Rock via Hydraulic Claw: ${art.artifactName || art.name}`
              : `Retrieval of Liquid Matter via Suction Scoop: ${art.name}`,
            regionId: art.id || 'jezero_delta',
            regionName: art.regionName,
            roverPhysics: { ...tPhys },
            mineral: art.mineral,
            analysisResult: art.analysisResult,
          });
        }

        this.samplingProcess = null;

        // AFTER RETRIEVAL -> CRUISE TO SCIENCE LAB STATION!
        if (this.labStation) {
          this.transportState = 'carrying_to_lab';
          this.onNotify(`🚀 [Hermes Container] Transporting specimen to Lab! Press B on GeoLab if no Lab yet.`);
        } else {
          this.transportState = 'idle';
          this.onNotify(`⚠️ [Attention] Specimen safe in Container! Use Rover 02 (GeoLab) and press B to establish Science Lab.`);
        }
        this.onStateChange();
      }
    } else if (!this.transportCargo) {
      // 1. Detect Ares Mapper Prominent Rock Waypoint if approached
      if (this.activeWaypoint && !this.samplingProcess) {
        const distW = Math.hypot(tPhys.X - this.activeWaypoint.X, tPhys.Y - this.activeWaypoint.Y);
        if (distW < 75.0) {
          // START PROMINENT ROCK CLAW GRIP ANIMATION AT WAYPOINT
          this.samplingProcess = {
            artifact: this.activeWaypoint,
            timer: 0,
            duration: 2.2,
          };

          if (hooks) {
            hooks.samplingMode = 'claw';
            hooks.samplingProgress = 0;
          }

          this.onNotify(`🦾 [ROBOTIC CLAW] Locking on Prominent Rock! Hermes robotic claw extending to grip...`);
        }
      }

      // 2. Detect Regional Unique Artifact if approached
      if (!this.samplingProcess) {
        for (const art of this.artifacts) {
          if (art.collected) continue;

          const dist = Math.hypot(tPhys.X - art.X, tPhys.Y - art.Y);
          if (dist < 75.0) {
            const isSolid = art.stateOfMatter === 'solid';
            this.samplingProcess = {
              artifact: art,
              timer: 0,
              duration: 2.2,
            };

            if (hooks) {
              hooks.samplingMode = isSolid ? 'claw' : 'scoop';
              hooks.samplingProgress = 0;
            }

            if (isSolid) {
              this.onNotify(`🦾 [ROBOTIC CLAW] Locking on ${art.name} (Solid Object)! Hydraulic arm extending to grip...`);
            } else {
              this.onNotify(`🥄 [SUCTION SCOOP] Locking on ${art.name} (Liquid Matter)! Suction scoop arm extending to collect fluid...`);
            }
            break;
          }
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
    physics.status = `RAPID TRANSIT (${physics.speed.toFixed(0)} m/s)`;
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

    // Fire Visual Perception task-complete event BEFORE clearing cargo
    this.onTaskComplete({
      taskId: `TASK-${Date.now()}-${(cargo.id || 'UNK').toUpperCase()}`,
      roverId: '03',
      roverName: 'Hermes Transport',
      roverRole: 'transport-support',
      description: `Cargo Delivered: ${cargo.name} to ${this.labStation?.name || 'Science Lab'}`,
      regionId: cargo.id || 'unknown',
      regionName: cargo.regionName || cargo.name || 'Unknown',
      roverPhysics: this.rovers?.[2]?.physics || {},
      mineral: cargo.mineral || '—',
      analysisResult: cargo.analysisResult || '—',
    });

    // Kosongkan kargo di kontainer Hermes
    this.transportCargo = null;
    this.transportState = 'delivered';
    if (hooks && hooks.cargoSpecimen) {
      hooks.cargoSpecimen.visible = false;
    }

    this.onNotify(`[LAB ANALYSIS COMPLETE] ${cargo.name} examined! ${cargo.analysisResult} (+350 Science Points)`);
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
      this.onNotify(`OBJECTIVE COMPLETED: ${q.title} (+150 Points)`);
      this.onStateChange();
    }
  }

  #createFloatingLabel(text, colorHex = '#00d4ff') {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(7, 11, 18, 0.92)';
    const r = 24, w = 1024, h = 192;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.lineTo(w - r, 0); ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h - r); ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r, h); ctx.quadraticCurveTo(0, h, 0, h - r);
    ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.fill();

    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = colorHex;
    ctx.font = '700 48px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false }));
    sprite.renderOrder = 999;
    sprite.scale.set(160, 30, 1);
    return sprite;
  }
}
