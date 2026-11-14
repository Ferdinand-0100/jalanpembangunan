import * as THREE from 'three';

/**
 * Format seconds into HH:MM:SS string
 */
function formatElapsed(sec) {
  const s = Math.floor(sec) % 60;
  const m = Math.floor(sec / 60) % 60;
  const h = Math.floor(sec / 3600);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * HistoryTracker
 * Records and renders authentic, continuous telemetry breadcrumbs & 3D trail lines
 * for the Mars rovers across the Jezero Crater landscape.
 */
export class HistoryTracker {
  /**
   * @param {THREE.Scene} scene
   * @param {import('../geo/coords.js').GeoFrame} frame
   * @param {Function} sampleElevation
   */
  constructor(scene, frame, sampleElevation) {
    this.scene = scene;
    this.frame = frame;
    this.sampleElevation = sampleElevation;

    this.showHistory = true; // State of SHOW HISTORY TRACK toggle (default ON)

    // Master 3D Group containing all visual history trails and waypoint markers
    this.group = new THREE.Group();
    this.group.name = 'RoverHistoryTrackGroup';
    this.scene.add(this.group);

    // Rover tracks metadata (0: Ares Mapper, 1: GeoLab, 2: Hermes Transport)
    this.tracks = [
      {
        id: '01',
        name: 'Ares Mapper',
        color: 0x00e5ff, // Cyan
        hexStr: '#00e5ff',
        startTime: Date.now(),
        totalDistance: 0,
        waypoints: [],
        lastPos: null,
        lineObj: null,
        positions: [], // flat Float32 array buffer for 3D line
        nodesGroup: new THREE.Group(),
      },
      {
        id: '02',
        name: 'Curiosity GeoLab',
        color: 0xff3b5c, // Crimson
        hexStr: '#ff3b5c',
        startTime: Date.now(),
        totalDistance: 0,
        waypoints: [],
        lastPos: null,
        lineObj: null,
        positions: [],
        nodesGroup: new THREE.Group(),
      },
      {
        id: '03',
        name: 'Hermes Transport',
        color: 0x00ff88, // Emerald Green
        hexStr: '#00ff88',
        startTime: Date.now(),
        totalDistance: 0,
        waypoints: [],
        lastPos: null,
        lineObj: null,
        positions: [],
        nodesGroup: new THREE.Group(),
      },
    ];

    // Build 3D objects for each track
    for (let i = 0; i < this.tracks.length; i++) {
      const t = this.tracks[i];
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([], 3));

      const mat = new THREE.LineBasicMaterial({
        color: t.color,
        linewidth: 2.5,
        transparent: true,
        opacity: 0.92,
      });

      t.lineObj = new THREE.Line(geo, mat);
      t.lineObj.frustumCulled = false;
      this.group.add(t.lineObj);
      this.group.add(t.nodesGroup);
    }

    // Shared geometry for waypoint marker nodes
    this.nodeGeo = new THREE.SphereGeometry(1.4, 8, 8);
    this.startRingGeo = new THREE.RingGeometry(3.5, 5.0, 16);
    this.startRingGeo.rotateX(-Math.PI / 2);
  }

  /**
   * Toggles visibility of the 3D history track without losing recorded telemetry.
   * @param {boolean} visible
   */
  setShowHistory(visible) {
    this.showHistory = !!visible;
    this.group.visible = this.showHistory;
  }

  /**
   * Main telemetry recording step called during the physics/animation loop.
   * @param {number} activeIndex
   * @param {Array} rovers
   */
  update(activeIndex, rovers) {
    if (!rovers || !rovers.length) return;

    for (let i = 0; i < rovers.length; i++) {
      const rover = rovers[i];
      const phys = rover.physics;
      const track = this.tracks[i];
      if (!phys || !track) continue;

      const curX = phys.X;
      const curY = phys.Y;

      // 1. Initial spawn recording
      if (!track.lastPos) {
        this.#recordWaypoint(i, phys, true);
        continue;
      }

      // 2. Measure Euclidean distance from last recorded waypoint
      const dx = curX - track.lastPos.X;
      const dy = curY - track.lastPos.Y;
      const dist = Math.hypot(dx, dy);

      // Record a new breadcrumb waypoint every 15 meters of movement
      if (dist >= 15.0) {
        track.totalDistance += dist;
        this.#recordWaypoint(i, phys, false);
      }
    }
  }

  /**
   * Records a true breadcrumb waypoint and appends it to the 3D line.
   */
  #recordWaypoint(roverIndex, phys, isInitial = false) {
    const track = this.tracks[roverIndex];
    const now = Date.now();
    const elapsedSec = (now - track.startTime) / 1000;
    const [lon, lat] = this.frame.projToLonLat(phys.X, phys.Y);
    const elev = this.sampleElevation(phys.X, phys.Y);

    const wp = {
      index: track.waypoints.length + 1,
      timestamp: now,
      elapsedSec,
      timeStr: formatElapsed(elapsedSec),
      clockStr: new Date(now).toLocaleTimeString('en-US', { hour12: false }),
      X: phys.X,
      Y: phys.Y,
      elevation: elev,
      lon,
      lat,
      speed: phys.speed,
      heading: phys.heading,
      totalDistanceSoFar: track.totalDistance,
      isInitial,
    };

    track.waypoints.push(wp);
    track.lastPos = { X: phys.X, Y: phys.Y };

    // Convert to world coordinate for 3D visualization
    // Add small Y offset (+1.2m) above terrain to prevent ground clipping
    const w = this.frame.toWorld(phys.X, phys.Y, elev);
    const worldY = w.y + 1.2;

    track.positions.push(w.x, worldY, w.z);

    // Update line buffer geometry
    const lineGeo = track.lineObj.geometry;
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(track.positions, 3));
    lineGeo.attributes.position.needsUpdate = true;

    // Create 3D marker node at this waypoint
    if (isInitial) {
      // Distinct START / LANDING SITE Ring Marker
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(this.startRingGeo, ringMat);
      ringMesh.position.set(w.x, worldY + 0.3, w.z);
      track.nodesGroup.add(ringMesh);
    } else {
      // Intermediate Breadcrumb Node Sphere
      const nodeMat = new THREE.MeshBasicMaterial({
        color: track.color,
        transparent: true,
        opacity: 0.85,
      });
      const nodeMesh = new THREE.Mesh(this.nodeGeo, nodeMat);
      nodeMesh.position.set(w.x, worldY, w.z);
      track.nodesGroup.add(nodeMesh);
    }
  }

  /**
   * Retrieves full telemetry statistics for the active rover track.
   * @param {number} roverIndex
   */
  getTrackStats(roverIndex) {
    const track = this.tracks[roverIndex] || this.tracks[0];
    const totalDist = track.totalDistance;
    const elapsedSec = (Date.now() - track.startTime) / 1000;

    const startWp = track.waypoints[0] || null;
    const latestWp = track.waypoints[track.waypoints.length - 1] || null;

    let distFormatted;
    if (totalDist >= 1000) {
      distFormatted = `${(totalDist / 1000).toFixed(2)} km`;
    } else {
      distFormatted = `${totalDist.toFixed(1)} m`;
    }

    return {
      roverId: track.id,
      roverName: track.name,
      totalDistanceMeters: totalDist,
      totalDistanceFormatted: distFormatted,
      elapsedSeconds: elapsedSec,
      elapsedFormatted: formatElapsed(elapsedSec),
      startPoint: startWp
        ? {
            lon: startWp.lon.toFixed(5),
            lat: startWp.lat.toFixed(5),
            elevation: startWp.elevation.toFixed(1),
            time: startWp.clockStr,
          }
        : null,
      currentPoint: latestWp
        ? {
            lon: latestWp.lon.toFixed(5),
            lat: latestWp.lat.toFixed(5),
            elevation: latestWp.elevation.toFixed(1),
            time: latestWp.clockStr,
          }
        : null,
      waypointCount: track.waypoints.length,
      waypoints: track.waypoints,
      showHistory: this.showHistory,
    };
  }

  /**
   * Receives external movement history data (e.g. from backend API).
   * @param {number} roverIndex
   * @param {Array} rawWaypoints
   */
  importExternalHistory(roverIndex, rawWaypoints) {
    if (!Array.isArray(rawWaypoints)) return;
    const track = this.tracks[roverIndex];
    if (!track) return;

    for (const raw of rawWaypoints) {
      const phys = {
        X: raw.X || 0,
        Y: raw.Y || 0,
        elevation: raw.elevation || this.sampleElevation(raw.X || 0, raw.Y || 0),
        speed: raw.speed || 0,
        heading: raw.heading || 0,
      };
      this.#recordWaypoint(roverIndex, phys, track.waypoints.length === 0);
    }
  }
}
