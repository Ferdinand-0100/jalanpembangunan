import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';

/**
 * VisualPerceptionSystem
 * ─────────────────────────────────────────────────────────────────────────────
 * SIMULATION MODE: Captures snapshots directly from the Three.js WebGL renderer.
 * This is architecturally correct — the main renderer IS the Rover's "eyes".
 * Depth maps are synthesised from the terrain heightfield (depth = elevation delta
 * relative to the rover position, mapped through a colour palette).
 * Point-cloud is reconstructed from depth samples around the rover.
 *
 * All documentation is persisted in localStorage so it survives a page refresh.
 * No dummy images are used; every visual is derived from actual simulation state.
 *
 * REAL ROVER MODE: If a backend WebSocket/HTTP endpoint supplies camera frames,
 * connect via connectRealCamera(url). The UI clearly labels the source.
 */

const DB_KEY = 'vpms_mission_docs_v3';
const MAX_STORED_DOCS = 40; // keep last 40 docs to avoid quota issues

// NASA depth‑map colour ramp: near (red‑warm) → mid (green) → far (blue‑cool)
const DEPTH_RAMP = [
  [0.0,  [220, 50,  40]],
  [0.15, [235, 130, 40]],
  [0.35, [240, 220, 50]],
  [0.55, [80,  200, 60]],
  [0.75, [30,  160, 220]],
  [1.0,  [30,  60,  200]],
];

function depthRampColor(t) {
  const c = Math.max(0, Math.min(1, t));
  for (let i = 1; i < DEPTH_RAMP.length; i++) {
    const [t0, rgb0] = DEPTH_RAMP[i - 1];
    const [t1, rgb1] = DEPTH_RAMP[i];
    if (c <= t1) {
      const f = (c - t0) / (t1 - t0);
      return rgb0.map((v, j) => Math.round(v + f * (rgb1[j] - v)));
    }
  }
  return DEPTH_RAMP[DEPTH_RAMP.length - 1][1];
}

function isoNow() {
  return new Date().toISOString();
}

function shortTs() {
  const d = new Date();
  return `${d.toLocaleDateString('en-US', { month:'short', day:'2-digit' })} ${d.toLocaleTimeString('en-US', { hour12: false })}`;
}

export class VisualPerceptionSystem {
  /**
   * @param {THREE.WebGLRenderer} mainRenderer  – the scene renderer (read-only capture)
   * @param {THREE.Scene}         scene
   * @param {THREE.Camera}        mainCamera
   * @param {import('../geo/coords.js').GeoFrame} frame
   * @param {import('../terrain/heightfield.js').Heightfield} hf
   * @param {Function} getElevation  – (X,Y) → elevation including region relief
   */
  constructor(mainRenderer, scene, mainCamera, frame, hf, getElevation) {
    this.renderer   = mainRenderer;
    this.scene      = scene;
    this.mainCam    = mainCamera;
    this.frame      = frame;
    this.hf         = hf;
    this.getElevation = getElevation;

    this.mode = 'SIMULATION';    // 'SIMULATION' | 'REAL_ROVER'
    this.realCameraWs = null;    // WebSocket for real rover camera stream

    // Dedicated Front Camera for Rovers (NavCam / HazCam front view)
    this.frontCam = new THREE.PerspectiveCamera(65, 16 / 9, 1.0, 80000);

    // Task completion dedup: set of taskIds already snapshotted this session
    this._capturedTaskIds = new Set();

    // In-memory session docs (also persisted to localStorage)
    this.docs = this.#loadDocs();

    // Active gallery filter state
    this.galleryFilter = { roverId: 'ALL', regionId: 'ALL' };

    // Callbacks
    this.onDocAdded = () => {};  // called after a new doc is stored
  }

  /* ──────────────────────────────────────────────────────────────────────────
     PUBLIC API
     ────────────────────────────────────────────────────────────────────────── */

  /**
   * Called from MissionSystem when a task completes.
   * Deduplicates by taskId so repeated TASK_COMPLETED events don't multi-capture.
   *
   * @param {Object} taskMeta
   * @param {string} taskMeta.taskId
   * @param {string} taskMeta.roverId        e.g. '01', '02', '03'
   * @param {string} taskMeta.roverName
   * @param {string} taskMeta.roverRole
   * @param {string} taskMeta.description    human readable task description
   * @param {string} taskMeta.regionId
   * @param {string} taskMeta.regionName
   * @param {Object} taskMeta.roverPhysics   { X, Y, elevation, heading, speed }
   * @param {string} taskMeta.mineral
   * @param {string} taskMeta.analysisResult
   */
  captureOnTaskComplete(taskMeta) {
    const tid = taskMeta.taskId;
    if (this._capturedTaskIds.has(tid)) return;
    this._capturedTaskIds.add(tid);

    // Allow one frame to fully render before capturing
    requestAnimationFrame(() => {
      try {
        this.#captureAndStore(taskMeta);
      } catch (err) {
        console.warn('[VPMS] Capture failed, task still marked complete:', err);
      }
    });
  }

  /**
   * Manually trigger a snapshot for the active rover (Camera button in UI).
   * Returns the doc or null.
   */
  captureManual(rovers, activeIndex) {
    const rover = rovers?.[activeIndex];
    if (!rover) return null;

    const manualTaskId = `MANUAL-${Date.now()}`;
    const meta = {
      taskId: manualTaskId,
      roverId: rover.callsign,
      roverName: rover.name,
      roverRole: rover.role,
      description: 'Manual Snapshot — Operator Request',
      regionId: 'manual',
      regionName: 'Field Observation',
      roverPhysics: { ...rover.physics },
      mineral: '—',
      analysisResult: '—',
    };
    return this.#captureAndStore(meta);
  }

  /**
   * Connect to a real rover camera endpoint.
   * @param {string} url  ws:// or http:// image endpoint
   */
  connectRealCamera(url) {
    this.mode = 'REAL_ROVER';
    // WebSocket stream: each message is a base64 JPEG frame
    try {
      const ws = new WebSocket(url);
      ws.binaryType = 'blob';
      ws.onmessage = (ev) => {
        this._latestRealFrame = URL.createObjectURL(ev.data);
      };
      ws.onerror = () => { this.mode = 'SIMULATION'; };
      ws.onclose = () => { this.mode = 'SIMULATION'; };
      this.realCameraWs = ws;
    } catch {
      this.mode = 'SIMULATION';
    }
  }

  /**
   * Returns all stored docs, optionally filtered.
   */
  getDocs(filter = {}) {
    let result = [...this.docs];
    if (filter.roverId && filter.roverId !== 'ALL') {
      result = result.filter(d => d.roverId === filter.roverId);
    }
    if (filter.regionId && filter.regionId !== 'ALL') {
      result = result.filter(d => d.regionId === filter.regionId);
    }
    return result.reverse(); // newest first
  }

  getDocById(docId) {
    return this.docs.find(d => d.docId === docId) || null;
  }

  /* ──────────────────────────────────────────────────────────────────────────
     INTERNAL CAPTURE PIPELINE
     ────────────────────────────────────────────────────────────────────────── */

  #captureAndStore(taskMeta) {
    const docId = `DOC-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // 1. RGB snapshot from rover's dedicated front-facing camera (looking at object in front)
    const rgbDataUrl = this.#captureRGB(taskMeta);

    // 2. Depth map synthesized from terrain heightfield around rover position
    const depthDataUrl = this.#synthesizeDepthMap(taskMeta.roverPhysics, 320, 180);

    // 3. Point cloud data (sampled depth grid around rover)
    const pointCloudData = this.#buildPointCloudData(taskMeta.roverPhysics, 24, 24);

    // 4. Coordinate information
    const [lon, lat] = this.frame.projToLonLat(
      taskMeta.roverPhysics.X || 0,
      taskMeta.roverPhysics.Y || 0,
    );

    const doc = {
      docId,
      taskId: taskMeta.taskId,
      roverId: taskMeta.roverId,
      roverName: taskMeta.roverName,
      roverRole: taskMeta.roverRole,
      description: taskMeta.description,
      regionId: taskMeta.regionId || 'unknown',
      regionName: taskMeta.regionName || 'Unknown Region',
      mineral: taskMeta.mineral || '—',
      analysisResult: taskMeta.analysisResult || '—',
      captureTimestamp: isoNow(),
      shortTimestamp: shortTs(),
      status: 'COMPLETED',
      cameraId: this.mode === 'REAL_ROVER' ? 'FRONT_CAMERA_REAL' : 'FRONT_CAMERA_SIM',
      captureMode: this.mode,
      roverPosition: { lon: lon.toFixed(5), lat: lat.toFixed(5) },
      roverElevation: (taskMeta.roverPhysics.elevation || 0).toFixed(1),
      roverHeading: (((taskMeta.roverPhysics.heading || 0) * 180 / Math.PI) % 360 + 360) % 360 | 0,
      rgbDataUrl,                 // base64 PNG from WebGL
      depthDataUrl,               // base64 PNG depth map
      pointCloudData,             // array of {x,y,z,color} points for 3D viewer
      rgbStatus: rgbDataUrl ? 'OK' : 'CAMERA_UNAVAILABLE',
      depthStatus: depthDataUrl ? 'OK' : 'DEPTH_FAILED',
      pointCloudStatus: pointCloudData.length > 0 ? 'OK' : 'INSUFFICIENT_DATA',
    };

    this.docs.push(doc);
    if (this.docs.length > MAX_STORED_DOCS) {
      this.docs.shift(); // drop oldest
    }
    this.#saveDocs();
    this.onDocAdded(doc);
    return doc;
  }

  /**
   * Reads front-facing camera view looking directly at object/terrain in front of rover.
   * Returns a base64 PNG data URL, or null if capture fails.
   */
  #captureRGB(taskMeta = null) {
    if (this.mode === 'REAL_ROVER' && this._latestRealFrame) {
      return this._latestRealFrame;
    }

    try {
      // If we have rover position and heading, render from the Rover's front HazCam/NavCam
      if (taskMeta && taskMeta.roverPhysics && this.frame) {
        const p = taskMeta.roverPhysics;
        const elev = p.elevation || (this.getElevation ? this.getElevation(p.X, p.Y) : 0);
        const w = this.frame.toWorld(p.X || 0, p.Y || 0, elev);
        const heading = p.heading || 0;

        // Front MastCam position: slightly forward and ~25m up (accounting for rover visual scale)
        const camX = w.x + Math.sin(heading) * 15;
        const camZ = w.z + Math.cos(heading) * 15;
        const camY = w.y + 24;

        // Target look-at point: in front of the rover where the specimen/lab/rock target is located
        const targetDist = 90;
        const lookX = camX + Math.sin(heading) * targetDist;
        const lookZ = camZ + Math.cos(heading) * targetDist;
        const lookY = camY - 14; // slight downward angle to capture terrain & object

        this.frontCam.aspect = this.renderer.domElement.width / this.renderer.domElement.height;
        this.frontCam.updateProjectionMatrix();
        this.frontCam.position.set(camX, camY, camZ);
        this.frontCam.lookAt(lookX, lookY, lookZ);

        // Render front camera snapshot
        this.renderer.render(this.scene, this.frontCam);
        const frontSnap = this.renderer.domElement.toDataURL('image/jpeg', 0.88);

        // Restore main camera view immediately
        if (this.mainCam) {
          this.renderer.render(this.scene, this.mainCam);
        }

        return frontSnap;
      }

      // Fallback to active viewport render
      const canvas = this.renderer.domElement;
      return canvas.toDataURL('image/jpeg', 0.88);
    } catch (err) {
      console.warn('[VPMS] Front camera RGB capture failed, falling back:', err);
      try {
        return this.renderer.domElement.toDataURL('image/jpeg', 0.82);
      } catch {
        return null;
      }
    }
  }

  /**
   * Synthesizes a depth map image from terrain elevation samples
   * centered on the rover, projected in front of the rover's heading.
   *
   * The depth value at each pixel represents the terrain elevation
   * delta relative to the rover's current elevation, NOT an absolute
   * metric depth (monocular estimation from heightfield projection).
   *
   * @param {Object} physics
   * @param {number} width   output canvas width px
   * @param {number} height  output canvas height px
   */
  #synthesizeDepthMap(physics, width, height) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      const img = ctx.createImageData(width, height);

      const rX = physics.X || 0;
      const rY = physics.Y || 0;
      const rElev = physics.elevation || 0;
      const heading = physics.heading || 0;

      // Scan a 90°-wide cone in front of the rover up to 2500 m depth
      const maxDist = 2500;
      const fovH = Math.PI * 0.6; // 108° horizontal
      const fovV = Math.PI * 0.4; // 72° vertical tilt range

      // Collect raw depth samples to normalize
      const rawDepths = new Float32Array(width * height);
      let dMin = Infinity, dMax = -Infinity;

      for (let py = 0; py < height; py++) {
        const tiltAngle = fovV * (1 - py / height) - fovV * 0.1; // slight down tilt
        const scanDist = maxDist * (0.3 + 0.7 * (1 - py / height));

        for (let px = 0; px < width; px++) {
          const azOffset = fovH * (px / width - 0.5);
          const scanAngle = heading + azOffset;
          const sX = rX + Math.sin(scanAngle) * scanDist;
          const sY = rY + Math.cos(scanAngle) * scanDist;

          let elev = rElev;
          try {
            if (this.hf.inBounds(sX, sY)) {
              elev = this.getElevation(sX, sY);
            }
          } catch { /* out of bounds: use rover elev */ }

          const elevDelta = elev - rElev;
          const dist3d = Math.sqrt(scanDist * scanDist + elevDelta * elevDelta);
          rawDepths[py * width + px] = dist3d;
          if (dist3d < dMin) dMin = dist3d;
          if (dist3d > dMax) dMax = dist3d;
        }
      }

      const range = dMax - dMin || 1;
      for (let i = 0; i < width * height; i++) {
        const t = (rawDepths[i] - dMin) / range;
        const [r, g, b] = depthRampColor(t);
        const idx = i * 4;
        img.data[idx]     = r;
        img.data[idx + 1] = g;
        img.data[idx + 2] = b;
        img.data[idx + 3] = 255;
      }

      ctx.putImageData(img, 0, 0);

      // Overlay technical labels
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, height - 22, width, 22);
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`DEPTH MAP  · NEAR: ${dMin.toFixed(0)}m  FAR: ${dMax.toFixed(0)}m  · RELATIVE ESTIMATION`, 6, height - 7);

      // Colour legend bar along bottom-left
      for (let lx = 0; lx < 100; lx++) {
        const [lr, lg, lb] = depthRampColor(lx / 100);
        ctx.fillStyle = `rgb(${lr},${lg},${lb})`;
        ctx.fillRect(lx + 2, height - 20, 1, 8);
      }
      ctx.fillStyle = '#94a3b8';
      ctx.font = '8px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('Near', 2, height - 22);
      ctx.textAlign = 'right';
      ctx.fillText('Far', 103, height - 22);

      return canvas.toDataURL('image/png', 0.85);
    } catch (err) {
      console.warn('[VPMS] Depth synthesis failed:', err);
      return null;
    }
  }

  /**
   * Samples a grid of elevation points around the rover and returns
   * an array of {x, y, z, color} objects for Three.js point-cloud rendering.
   *
   * @param {Object} physics
   * @param {number} cols
   * @param {number} rows
   */
  #buildPointCloudData(physics, cols, rows) {
    const pts = [];
    const rX = physics.X || 0;
    const rY = physics.Y || 0;
    const rElev = physics.elevation || 0;
    const spread = 2200; // metres radius sampled

    let dMin = Infinity, dMax = -Infinity;
    const rawPts = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const sX = rX + (col / (cols - 1) - 0.5) * spread * 2;
        const sY = rY + (row / (rows - 1) - 0.5) * spread * 2;

        let elev = rElev;
        try {
          if (this.hf.inBounds(sX, sY)) {
            elev = this.getElevation(sX, sY);
          }
        } catch {}

        const dElev = elev - rElev;
        if (dElev < dMin) dMin = dElev;
        if (dElev > dMax) dMax = dElev;

        rawPts.push({ sX, sY, elev, dElev });
      }
    }

    const range = dMax - dMin || 1;
    for (const p of rawPts) {
      const t = (p.dElev - dMin) / range;
      const [r, g, b] = depthRampColor(t);
      pts.push({
        x: (p.sX - rX) / 1000,          // scale to ~km for viewer
        y: (p.elev - rElev) / 1000,
        z: (p.sY - rY) / 1000,
        color: (r << 16) | (g << 8) | b,
      });
    }
    return pts;
  }

  /* ──────────────────────────────────────────────────────────────────────────
     PERSISTENCE
     ────────────────────────────────────────────────────────────────────────── */

  #saveDocs() {
    try {
      // Strip large base64 images for older docs to stay within quota
      const slim = this.docs.map((d, i) => {
        if (i < this.docs.length - 10) {
          // Keep metadata but strip pixel data for older docs
          return { ...d, rgbDataUrl: null, depthDataUrl: null, pointCloudData: [] };
        }
        return d;
      });
      localStorage.setItem(DB_KEY, JSON.stringify(slim));
    } catch (err) {
      // Quota exceeded — drop oldest docs
      this.docs.shift();
      try {
        localStorage.setItem(DB_KEY, JSON.stringify(this.docs.slice(-5)));
      } catch {}
    }
  }

  #loadDocs() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
