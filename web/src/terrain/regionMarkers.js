import * as THREE from 'three';

/**
 * RegionMarkers — Penanda visual 6 wilayah geologi di dalam simulasi 3D.
 *
 * Setiap wilayah ditempatkan di posisi berbeda pada terrain Jezero Crater
 * dan memiliki fitur 3D prosedural (kawah, kerucut vulkanik, pegunungan)
 * plus beacon tiang cahaya + label nama wilayah.
 *
 * Saat robot mendekat (< proximityRadius), tampilkan popup singkat.
 */

// 6 wilayah geologi yang ditempatkan di berbagai posisi terrain Jezero
const REGIONS = [
  {
    id: 'acidalia',
    name: 'Acidalia Planitia',
    desc: 'Dataran rendah utara — endapan sedimen & jejak air purba',
    color: 0x4fc3f7,
    // Offset dari pusat terrain (dalam projected meters)
    offsetX: -8000,
    offsetY: 6000,
    feature: 'crater', // fitur 3D prosedural
  },
  {
    id: 'arabia',
    name: 'Arabia Terra',
    desc: 'Dataran tinggi tua — kawah tumbukan & erosi permukaan',
    color: 0xffb74d,
    offsetX: 6000,
    offsetY: 8000,
    feature: 'craters', // banyak kawah kecil
  },
  {
    id: 'isidis',
    name: 'Isidis Planitia',
    desc: 'Cekungan tumbukan raksasa — material ejecta asteroid',
    color: 0xef5350,
    offsetX: 10000,
    offsetY: -2000,
    feature: 'basin', // cekungan besar
  },
  {
    id: 'syrtis',
    name: 'Syrtis Major Planum',
    desc: 'Perisai vulkanik — jejak aliran lava basaltik',
    color: 0xab47bc,
    offsetX: -6000,
    offsetY: -7000,
    feature: 'volcano', // kerucut vulkanik
  },
  {
    id: 'elysium',
    name: 'Elysium',
    desc: 'Provinsi vulkanik — dataran lava & gunung api raksasa',
    color: 0xff7043,
    offsetX: -12000,
    offsetY: -1000,
    feature: 'volcano_large',
  },
  {
    id: 'hesperia',
    name: 'Hesperia Planum',
    desc: 'Dataran berpematang — transisi geologi Hesperian',
    color: 0x66bb6a,
    offsetX: 3000,
    offsetY: -10000,
    feature: 'ridges', // pematang/ridge
  },
];

export class RegionMarkers {
  /**
   * @param {THREE.Scene} scene
   * @param {import('../terrain/heightfield.js').Heightfield} hf
   * @param {import('../geo/coords.js').GeoFrame} frame
   */
  constructor(scene, hf, frame) {
    this.scene = scene;
    this.hf = hf;
    this.frame = frame;
    this.markers = [];
    this.proximityRadius = 3000; // meters — jarak untuk trigger popup
    this.activePopup = null;

    this.#createPopupDOM();
    this.#buildMarkers();
  }

  #createPopupDOM() {
    this.popupEl = document.createElement('div');
    this.popupEl.id = 'regionPopup';
    this.popupEl.className = 'region-popup';
    this.popupEl.style.display = 'none';
    document.body.appendChild(this.popupEl);
  }

  #buildMarkers() {
    // Titik pusat terrain (projected coordinates)
    const centerX = (this.hf.left + this.hf.left + this.hf.cols * this.hf.cell) / 2;
    const centerY = (this.hf.top + this.hf.top - this.hf.rows * this.hf.cell) / 2;

    for (const region of REGIONS) {
      const projX = centerX + region.offsetX;
      const projY = centerY + region.offsetY;

      // Clamp ke dalam batas terrain
      const clampedX = Math.max(this.hf.minX + 500, Math.min(this.hf.maxX - 500, projX));
      const clampedY = Math.max(this.hf.minY + 500, Math.min(this.hf.maxY - 500, projY));

      const elev = this.hf.sample(clampedX, clampedY);
      const world = this.frame.toWorld(clampedX, clampedY, elev);

      const group = new THREE.Group();
      group.position.set(world.x, world.y, world.z);

      // 1) Beacon tiang cahaya
      this.#addBeacon(group, region.color);

      // 2) Fitur 3D prosedural berdasarkan tipe wilayah
      this.#addFeature(group, region.feature, region.color);

      // 3) Label nama wilayah (canvas sprite)
      this.#addLabel(group, region.name, region.color);

      // 4) Lingkaran zona di tanah
      this.#addZoneCircle(group, region.color);

      this.scene.add(group);

      this.markers.push({
        id: region.id,
        name: region.name,
        desc: region.desc,
        color: region.color,
        projX: clampedX,
        projY: clampedY,
        group,
      });
    }
  }

  #addBeacon(group, color) {
    // Tiang vertikal berpendar
    const pillarGeom = new THREE.CylinderGeometry(8, 8, 600, 8);
    const pillarMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.4,
    });
    const pillar = new THREE.Mesh(pillarGeom, pillarMat);
    pillar.position.y = 300;
    group.add(pillar);

    // Bola di puncak
    const sphereGeom = new THREE.SphereGeometry(25, 12, 12);
    const sphereMat = new THREE.MeshBasicMaterial({ color });
    const sphere = new THREE.Mesh(sphereGeom, sphereMat);
    sphere.position.y = 620;
    group.add(sphere);

    // Point light kecil
    const light = new THREE.PointLight(color, 0.8, 2000);
    light.position.y = 630;
    group.add(light);
  }

  #addFeature(group, featureType, color) {
    const darkColor = new THREE.Color(color).multiplyScalar(0.5);

    switch (featureType) {
      case 'crater': {
        // Satu kawah besar — torus ring
        const torusGeom = new THREE.TorusGeometry(350, 60, 12, 24);
        const torusMat = new THREE.MeshStandardMaterial({
          color: darkColor,
          roughness: 0.9,
          metalness: 0.1,
        });
        const torus = new THREE.Mesh(torusGeom, torusMat);
        torus.rotation.x = -Math.PI / 2;
        torus.position.y = 20;
        group.add(torus);
        break;
      }

      case 'craters': {
        // Beberapa kawah kecil
        const positions = [
          [0, 0, 200], [-250, 0, -180], [200, 0, 100], [100, 0, -250],
        ];
        for (const [x, y, z] of positions) {
          const r = 80 + Math.random() * 120;
          const torusGeom = new THREE.TorusGeometry(r, 20, 8, 16);
          const torusMat = new THREE.MeshStandardMaterial({
            color: darkColor,
            roughness: 0.9,
          });
          const torus = new THREE.Mesh(torusGeom, torusMat);
          torus.rotation.x = -Math.PI / 2;
          torus.position.set(x, y + 15, z);
          group.add(torus);
        }
        break;
      }

      case 'basin': {
        // Cekungan tumbukan — ring besar + kerucut tengah
        const ringGeom = new THREE.TorusGeometry(500, 80, 12, 32);
        const ringMat = new THREE.MeshStandardMaterial({
          color: darkColor,
          roughness: 0.85,
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 30;
        group.add(ring);

        // Central peak
        const peakGeom = new THREE.ConeGeometry(100, 200, 12);
        const peakMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(color).multiplyScalar(0.7),
          roughness: 0.7,
        });
        const peak = new THREE.Mesh(peakGeom, peakMat);
        peak.position.y = 100;
        group.add(peak);
        break;
      }

      case 'volcano': {
        // Kerucut vulkanik
        const coneGeom = new THREE.ConeGeometry(300, 500, 16);
        const coneMat = new THREE.MeshStandardMaterial({
          color: darkColor,
          roughness: 0.8,
        });
        const cone = new THREE.Mesh(coneGeom, coneMat);
        cone.position.y = 250;
        group.add(cone);

        // Kaldera di puncak (torus kecil)
        const calderaGeom = new THREE.TorusGeometry(80, 25, 8, 12);
        const calderaMat = new THREE.MeshStandardMaterial({
          color: 0xff4500,
          emissive: 0xff2200,
          emissiveIntensity: 0.3,
          roughness: 0.6,
        });
        const caldera = new THREE.Mesh(calderaGeom, calderaMat);
        caldera.rotation.x = -Math.PI / 2;
        caldera.position.y = 500;
        group.add(caldera);
        break;
      }

      case 'volcano_large': {
        // Gunung api besar
        const coneGeom = new THREE.ConeGeometry(500, 800, 20);
        const coneMat = new THREE.MeshStandardMaterial({
          color: darkColor,
          roughness: 0.75,
        });
        const cone = new THREE.Mesh(coneGeom, coneMat);
        cone.position.y = 400;
        group.add(cone);

        // Kaldera
        const calderaGeom = new THREE.TorusGeometry(130, 35, 8, 16);
        const calderaMat = new THREE.MeshStandardMaterial({
          color: 0xff6600,
          emissive: 0xff3300,
          emissiveIntensity: 0.4,
          roughness: 0.5,
        });
        const caldera = new THREE.Mesh(calderaGeom, calderaMat);
        caldera.rotation.x = -Math.PI / 2;
        caldera.position.y = 800;
        group.add(caldera);

        // Aliran lava (beberapa box panjang dari base)
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2;
          const flowGeom = new THREE.BoxGeometry(60, 20, 400);
          const flowMat = new THREE.MeshStandardMaterial({
            color: 0x8b1a1a,
            roughness: 0.9,
          });
          const flow = new THREE.Mesh(flowGeom, flowMat);
          flow.position.set(
            Math.cos(angle) * 450,
            10,
            Math.sin(angle) * 450
          );
          flow.rotation.y = angle;
          group.add(flow);
        }
        break;
      }

      case 'ridges': {
        // Pematang / wrinkle ridges — beberapa box panjang paralel
        for (let i = -2; i <= 2; i++) {
          const ridgeGeom = new THREE.BoxGeometry(40, 80 + Math.random() * 60, 600);
          const ridgeMat = new THREE.MeshStandardMaterial({
            color: darkColor,
            roughness: 0.85,
          });
          const ridge = new THREE.Mesh(ridgeGeom, ridgeMat);
          ridge.position.set(i * 150, 40 + Math.random() * 30, 0);
          ridge.rotation.y = 0.15 * i; // sedikit variasi sudut
          group.add(ridge);
        }
        break;
      }
    }
  }

  #addLabel(group, name, color) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;

    // Background semi-transparan
    ctx.fillStyle = 'rgba(15, 10, 8, 0.85)';
    const r = 12;
    const w = 512, h = 128;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(w - r, 0);
    ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h - r);
    ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r, h);
    ctx.quadraticCurveTo(0, h, 0, h - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.fill();

    // Border
    const hexColor = '#' + new THREE.Color(color).getHexString();
    ctx.strokeStyle = hexColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Teks nama wilayah
    ctx.fillStyle = hexColor;
    ctx.font = 'bold 38px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 256, 50);

    // Ikon marker kecil
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px system-ui';
    ctx.fillText('📍 Wilayah Eksplorasi', 256, 95);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(800, 200, 1);
    sprite.position.y = 750;
    group.add(sprite);
  }

  #addZoneCircle(group, color) {
    const circleGeom = new THREE.RingGeometry(900, 950, 48);
    const circleMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const circle = new THREE.Mesh(circleGeom, circleMat);
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 5;
    group.add(circle);

    // Inner filled disc (very transparent)
    const discGeom = new THREE.CircleGeometry(900, 48);
    const discMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
    });
    const disc = new THREE.Mesh(discGeom, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 3;
    group.add(disc);
  }

  /**
   * Dipanggil setiap frame dari main.js animation loop.
   * Cek proximity robot aktif ke setiap marker.
   * @param {number} roverProjX — posisi projected X robot aktif
   * @param {number} roverProjY — posisi projected Y robot aktif
   */
  update(roverProjX, roverProjY) {
    let closest = null;
    let closestDist = Infinity;

    for (const m of this.markers) {
      const dx = roverProjX - m.projX;
      const dy = roverProjY - m.projY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Animasi beacon: rotasi perlahan
      m.group.children[0].rotation.y += 0.005; // pillar rotates slightly

      if (dist < this.proximityRadius && dist < closestDist) {
        closest = m;
        closestDist = dist;
      }
    }

    if (closest && closest.id !== this.activePopup) {
      this.activePopup = closest.id;
      this.#showPopup(closest);
    } else if (!closest && this.activePopup) {
      this.activePopup = null;
      this.#hidePopup();
    }
  }

  #showPopup(marker) {
    const hexColor = '#' + new THREE.Color(marker.color).getHexString();
    this.popupEl.innerHTML = `
      <div class="popup-dot" style="background:${hexColor}"></div>
      <div class="popup-text">
        <div class="popup-name" style="color:${hexColor}">${marker.name}</div>
        <div class="popup-desc">${marker.desc}</div>
      </div>
    `;
    this.popupEl.style.borderColor = hexColor;
    this.popupEl.style.display = 'flex';
  }

  #hidePopup() {
    this.popupEl.style.display = 'none';
  }
}
