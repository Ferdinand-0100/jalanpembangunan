import * as THREE from 'three';
import { createRoverModel } from './roverModel.js';
import { RoverPhysics } from './roverPhysics.js';
import {
  SurfaceMappingAgent,
  GeologicalInvestigationAgent,
  TransportSupportAgent,
  ROVER_ROLES,
} from '../ai/agentInterface.js';

export const SWARM_ROBOTS = [
  {
    id: 'mapper',
    callsign: '01',
    name: 'Ares Mapper',
    role: ROVER_ROLES.SURFACE_MAPPING,
    missionTitle: 'Surface Mapping & Exploration',
    icon: '🗺️',
    accent: 0x00d4ff, // Cyan
    accentHex: '#00d4ff',
    startOffset: [0, 0],
    description: 'Eksplorasi awal, pemetaan topografi medan, pencarian wilayah baru & rute aman.',
    equipment: 'LiDAR 360°, Phased Radar, Solar Arrays',
  },
  {
    id: 'geologist',
    callsign: '02',
    name: 'Curiosity GeoLab',
    role: ROVER_ROLES.GEOLOGICAL_INVESTIGATION,
    missionTitle: 'Geological Investigation',
    icon: '🔬',
    accent: 0xff3b5c, // Crimson
    accentHex: '#ff3b5c',
    startOffset: [32, -22],
    description: 'Investigasi geologi, analisis mineral batuan, pengeboran sampel inti & laser Raman.',
    equipment: 'Heavy Core Drill, SuperCam Raman Laser, Sample Drum',
  },
  {
    id: 'transport',
    callsign: '03',
    name: 'Hermes Transport',
    role: ROVER_ROLES.TRANSPORT_SUPPORT,
    missionTitle: 'Mission Transport & Support',
    icon: '🚛',
    accent: 0x00ff88, // Emerald Green
    accentHex: '#00ff88',
    startOffset: [-32, -32],
    description: 'Spesialis transportasi misi, penampungan tabung sampel (caching) & relay komunikasi orbiter.',
    equipment: '10-Slot Cache Rack, Orbital High-Gain Relay, Heavy Chassis',
  },
];

export class RoverSwarm {
  constructor(scene, hf, frame, roverOpts, visualScale = 15) {
    this.scene = scene;
    this.hf = hf;
    this.frame = frame;
    this.roverOpts = roverOpts;
    this.visualScale = visualScale;

    this.rovers = [];
    this.activeIndex = 0;
    this.swarmMode = 'autonomous'; // 'autonomous' | 'formation' | 'hold'

    // Notification callback for HUD toasts
    this.onMissionLog = () => {};

    // Internal math helpers
    this._up = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._m4 = new THREE.Matrix4();
    this._animTime = 0;

    this.#initRobots();
  }

  #initRobots() {
    for (let i = 0; i < SWARM_ROBOTS.length; i++) {
      const cfg = SWARM_ROBOTS[i];

      const mesh = createRoverModel({
        role: cfg.role,
        accent: cfg.accent,
        name: cfg.name,
        callsign: cfg.callsign,
        missionTitle: cfg.missionTitle,
      });
      mesh.scale.setScalar(this.visualScale);
      this.scene.add(mesh);

      const physics = new RoverPhysics(this.hf, this.roverOpts);

      let agent;
      if (cfg.role === ROVER_ROLES.SURFACE_MAPPING) {
        agent = new SurfaceMappingAgent(this.hf, { x: 0, y: 0 });
      } else if (cfg.role === ROVER_ROLES.GEOLOGICAL_INVESTIGATION) {
        agent = new GeologicalInvestigationAgent(this.hf, { x: 0, y: 0 });
      } else {
        agent = new TransportSupportAgent(this.hf);
      }

      this.rovers.push({
        ...cfg,
        index: i,
        mesh,
        physics,
        agent,
      });
    }
  }

  setVisualScale(scale) {
    this.visualScale = scale;
    for (const r of this.rovers) {
      r.mesh.scale.setScalar(scale);
    }
  }

  spawnAt(startX, startY, heading = 0) {
    for (let i = 0; i < this.rovers.length; i++) {
      const r = this.rovers[i];
      const [offX, offY] = r.startOffset;

      const cosH = Math.cos(heading);
      const sinH = Math.sin(heading);
      const posX = startX + sinH * offY + cosH * offX;
      const posY = startY + cosH * offY - sinH * offX;

      r.physics.setPosition(posX, posY, heading);
      if (r.agent.base) r.agent.base = { x: posX, y: posY };
      this.#updatePose(r);
    }
  }

  getActiveRover() {
    return this.rovers[this.activeIndex];
  }

  setActiveRover(index) {
    if (index >= 0 && index < this.rovers.length) {
      this.activeIndex = index;
    }
    return this.getActiveRover();
  }

  setSwarmMode(mode) {
    if (['autonomous', 'formation', 'hold'].includes(mode)) {
      this.swarmMode = mode;
      this.onMissionLog(`Mode Swarm diubah ke: ${mode.toUpperCase()}`);
    }
  }

  /**
   * Triggers the active rover's specialized mission task manually.
   */
  triggerActiveTask() {
    const active = this.getActiveRover();
    if (active.role === ROVER_ROLES.SURFACE_MAPPING) {
      active.agent.mappedKm2 += 0.25;
      active.agent.waypointsFound++;
      this.onMissionLog(`[Ares Mapper] Memetakan sektor: ${active.agent.targetFeature} (+0.25 km²)!`);
    } else if (active.role === ROVER_ROLES.GEOLOGICAL_INVESTIGATION) {
      active.agent.startManualDrill();
      this.onMissionLog(`[GeoLab] Pengeboran dimulai pada: ${active.agent.currentRock.name} (Laser Raman aktif)`);
    } else if (active.role === ROVER_ROLES.TRANSPORT_SUPPORT) {
      const geoRover = this.rovers[1];
      if (geoRover && geoRover.agent.samplesSealed > active.agent.tubesCached) {
        active.agent.cacheSample();
        this.#updateTubeVisuals();
        this.onMissionLog(`[Hermes Transport] Sampel baru berhasil diambil & disimpan! Slot: ${active.agent.tubesCached}/10`);
      } else {
        active.agent.cacheSample();
        this.#updateTubeVisuals();
        this.onMissionLog(`[Hermes Transport] Menyimpan tabung cadangan ke rak logistik! Slot: ${active.agent.tubesCached}/10`);
      }
    }
  }

  #updateTubeVisuals() {
    const transportRover = this.rovers[2];
    if (!transportRover) return;
    const hooks = transportRover.mesh.userData.roleHooks;
    if (hooks && hooks.sampleTubes) {
      const stored = transportRover.agent.tubesCached;
      for (let i = 0; i < hooks.sampleTubes.length; i++) {
        hooks.sampleTubes[i].material = i < stored ? hooks.tubeActiveMat : hooks.tubeEmptyMat;
      }
    }
  }

  update(dt, playerInput) {
    this._animTime += dt;
    const leader = this.getActiveRover();

    // 1. Process active rover (Player controlled if input active, else autonomous)
    const isPlayerDriving = Math.abs(playerInput.throttle) > 0.01 || Math.abs(playerInput.steer) > 0.01;
    if (isPlayerDriving) {
      leader.physics.step(dt, playerInput);
      if (leader.role === ROVER_ROLES.SURFACE_MAPPING) {
        leader.agent.mappedKm2 += (Math.abs(leader.physics.speed) * dt * 0.1) / 1000;
      }
    } else {
      // If idle and mode is autonomous, let it run its role task!
      if (this.swarmMode === 'autonomous') {
        const step = this.#stepAgent(leader, dt);
        leader.physics.step(dt, step);
      } else {
        leader.physics.step(dt, { throttle: 0, steer: 0 });
      }
    }
    this.#updatePose(leader);

    // 2. Process companion rovers
    for (let i = 0; i < this.rovers.length; i++) {
      if (i === this.activeIndex) continue;
      const companion = this.rovers[i];

      let input = { throttle: 0, steer: 0 };
      if (this.swarmMode === 'autonomous') {
        input = this.#stepAgent(companion, dt);
      } else if (this.swarmMode === 'formation') {
        // Delta formation following leader
        const [offX, offY] = companion.startOffset;
        const cosH = Math.cos(leader.physics.heading);
        const sinH = Math.sin(leader.physics.heading);
        const targetX = leader.physics.X + sinH * offY + cosH * offX;
        const targetY = leader.physics.Y + cosH * offY - sinH * offX;

        const dx = targetX - companion.physics.X;
        const dy = targetY - companion.physics.Y;
        const dist = Math.hypot(dx, dy);

        if (dist > 4.5) {
          const desiredHeading = Math.atan2(dx, dy);
          let diff = desiredHeading - companion.physics.heading;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          input = {
            steer: Math.max(-1, Math.min(1, diff * 1.8)),
            throttle: Math.abs(diff) > 1.2 ? 0.2 : Math.min(1.0, Math.max(0.3, dist / 22)),
          };
        }
      }
      companion.physics.step(dt, input);
      this.#updatePose(companion);
    }

    // 3. Update dynamic visual animations
    this.#animateEffects(dt);
  }

  #stepAgent(rover, dt) {
    if (rover.role === ROVER_ROLES.SURFACE_MAPPING) {
      return rover.agent.act(rover.physics, dt);
    } else if (rover.role === ROVER_ROLES.GEOLOGICAL_INVESTIGATION) {
      return rover.agent.act(rover.physics, dt);
    } else if (rover.role === ROVER_ROLES.TRANSPORT_SUPPORT) {
      // Hermes transport follows GeoLab (rover 1)
      const geoRover = this.rovers[1] || this.rovers[0];
      return rover.agent.act(rover.physics, geoRover.physics, dt);
    }
    return { throttle: 0, steer: 0 };
  }

  #animateEffects(dt) {
    // 1. Mapper: Rotate LiDAR dome & pulse scanning ring
    const mapper = this.rovers[0];
    if (mapper && mapper.mesh.userData.roleHooks) {
      const h = mapper.mesh.userData.roleHooks;
      if (h.lidarDome) h.lidarDome.rotation.y += dt * 3.5;
      if (h.scanRing) {
        const s = 1.0 + Math.sin(this._animTime * 4) * 0.15;
        h.scanRing.scale.set(s, s, s);
        h.scanRing.material.opacity = 0.4 + Math.sin(this._animTime * 4) * 0.2;
      }
    }

    // 2. GeoLab: Laser beam visibility & drill pulsation
    const geo = this.rovers[1];
    if (geo && geo.mesh.userData.roleHooks) {
      const h = geo.mesh.userData.roleHooks;
      const isDrilling = geo.agent.state === 'drilling' || geo.agent.state === 'analyzing';
      if (h.laserBeam) {
        h.laserBeam.visible = isDrilling;
        if (isDrilling) {
          h.laserBeam.material.opacity = 0.6 + Math.random() * 0.4;
        }
      }
      if (h.drillBit && isDrilling) {
        h.drillBit.rotation.y += dt * 25.0;
      }
    }

    // 3. Transport: Relay dish tracking animation & tube sync
    const transport = this.rovers[2];
    if (transport && transport.mesh.userData.roleHooks) {
      const h = transport.mesh.userData.roleHooks;
      if (h.relayGroup) {
        h.relayGroup.rotation.y = 0.6 + Math.sin(this._animTime * 0.4) * 0.15;
      }
      // Auto cache when GeoLab seals a new sample
      if (geo && geo.agent.samplesSealed > transport.agent.tubesCached) {
        transport.agent.cacheSample();
        this.#updateTubeVisuals();
        this.onMissionLog(`[Auto-Logistics] Hermes mengambil sampel #${transport.agent.tubesCached} dari GeoLab`);
      }
    }
  }

  #updatePose(rover) {
    const p = rover.physics;
    const w = this.frame.toWorld(p.X, p.Y, p.elevation);
    const [gx, gy] = p.grad;
    const e = this.frame.exag;

    this._up.set(-e * gx, 1, e * gy).normalize();
    this._fwd.set(Math.sin(p.heading), 0, -Math.cos(p.heading));
    this._fwd.addScaledVector(this._up, -this._fwd.dot(this._up)).normalize();
    this._right.crossVectors(this._fwd, this._up).normalize();

    this._m4.makeBasis(this._right, this._up, this._fwd.clone().negate());
    rover.mesh.quaternion.setFromRotationMatrix(this._m4);
    rover.mesh.position.set(w.x, w.y, w.z);
  }
}
