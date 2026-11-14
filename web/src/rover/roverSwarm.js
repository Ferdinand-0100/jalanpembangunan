import * as THREE from 'three';
import { createRoverModel } from './roverModel.js';
import { RoverPhysics } from './roverPhysics.js';
import { SwarmFollowerAgent, SwarmPatrolAgent, ROVER_ROLES } from '../ai/agentInterface.js';

export const SWARM_CONFIG = [
  {
    id: 'perseverance',
    callsign: '01',
    name: 'Perseverance',
    role: ROVER_ROLES.LEAD,
    accent: 0x00e5ff, // Cyan
    accentHex: '#00e5ff',
    formationOffset: [0, 0], // Leader position
    description: 'Mission Lead · Robotic Arm & Coring Drill',
  },
  {
    id: 'ares-scout',
    callsign: '02',
    name: 'Ares Scout',
    role: ROVER_ROLES.SURFACE_MAPPING,
    accent: 0xffaa00, // Amber / Orange
    accentHex: '#ffaa00',
    formationOffset: [-35, -25], // 35 m left, 25 m behind
    description: 'Surface Mapper · Radar Dome & Solar Wings',
  },
  {
    id: 'curiosity-2',
    callsign: '03',
    name: 'Curiosity-II',
    role: ROVER_ROLES.GEOLOGICAL_INVESTIGATION,
    accent: 0xff385c, // Crimson
    accentHex: '#ff385c',
    formationOffset: [35, -25], // 35 m right, 25 m behind
    description: 'Geo Lab · Heavy Rock Drill & Sample Drum',
  },
  {
    id: 'hermes-hauler',
    callsign: '04',
    name: 'Hermes',
    role: ROVER_ROLES.TRANSPORT_SUPPORT,
    accent: 0x00ff88, // Emerald Green
    accentHex: '#00ff88',
    formationOffset: [0, -55], // 55 m behind leader
    description: 'Transport & Cache · Sample Canisters Rack',
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
    this.swarmMode = 'formation'; // 'formation' | 'patrol' | 'hold'

    // Math helpers for orientation
    this._up = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._m4 = new THREE.Matrix4();

    this.#initRovers();
  }

  #initRovers() {
    for (let i = 0; i < SWARM_CONFIG.length; i++) {
      const cfg = SWARM_CONFIG[i];

      // 3D Model
      const mesh = createRoverModel({
        role: cfg.role,
        accent: cfg.accent,
        name: cfg.name,
        callsign: cfg.callsign,
      });
      mesh.scale.setScalar(this.visualScale);
      this.scene.add(mesh);

      // Physics
      const physics = new RoverPhysics(this.hf, this.roverOpts);

      // Autonomous Agents
      const follower = new SwarmFollowerAgent(this.hf, { maxSlopeDeg: this.roverOpts.maxSlopeDeg });
      const patrol = new SwarmPatrolAgent(this.hf, { x: 0, y: 0 }, 300);

      this.rovers.push({
        ...cfg,
        index: i,
        mesh,
        physics,
        follower,
        patrol,
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
      const [offX, offY] = r.formationOffset;

      const cosH = Math.cos(heading);
      const sinH = Math.sin(heading);
      // Transform local formation offset to projected coordinates
      const posX = startX + sinH * offY + cosH * offX;
      const posY = startY + cosH * offY - sinH * offX;

      r.physics.setPosition(posX, posY, heading);
      r.patrol.base = { x: posX, y: posY };

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

  cycleActiveRover() {
    this.activeIndex = (this.activeIndex + 1) % this.rovers.length;
    return this.getActiveRover();
  }

  setSwarmMode(mode) {
    if (['formation', 'patrol', 'hold'].includes(mode)) {
      this.swarmMode = mode;
    }
  }

  update(dt, playerInput) {
    const leader = this.getActiveRover();

    // 1. Step the active rover driven by the player
    leader.physics.step(dt, playerInput);
    this.#updatePose(leader);

    // 2. Step companion rovers with autonomous AI
    for (let i = 0; i < this.rovers.length; i++) {
      if (i === this.activeIndex) continue;
      const companion = this.rovers[i];

      let input = { throttle: 0, steer: 0 };

      if (this.swarmMode === 'formation') {
        // Calculate formation slot behind/beside the leader
        const [offX, offY] = companion.formationOffset;
        const cosH = Math.cos(leader.physics.heading);
        const sinH = Math.sin(leader.physics.heading);
        const targetX = leader.physics.X + sinH * offY + cosH * offX;
        const targetY = leader.physics.Y + cosH * offY - sinH * offX;

        companion.follower.setTarget(targetX, targetY);
        input = companion.follower.act(companion.physics);
      } else if (this.swarmMode === 'patrol') {
        input = companion.patrol.act(companion.physics, dt);
      } else if (this.swarmMode === 'hold') {
        input = { throttle: 0, steer: 0 };
      }

      companion.physics.step(dt, input);
      this.#updatePose(companion);
    }
  }

  #updatePose(rover) {
    const p = rover.physics;
    const w = this.frame.toWorld(p.X, p.Y, p.elevation);
    const [gx, gy] = p.grad;
    const e = this.frame.exag;

    // Orient mesh to terrain normal
    this._up.set(-e * gx, 1, e * gy).normalize();
    this._fwd.set(Math.sin(p.heading), 0, -Math.cos(p.heading));
    this._fwd.addScaledVector(this._up, -this._fwd.dot(this._up)).normalize();
    this._right.crossVectors(this._fwd, this._up).normalize();

    this._m4.makeBasis(this._right, this._up, this._fwd.clone().negate());
    rover.mesh.quaternion.setFromRotationMatrix(this._m4);
    rover.mesh.position.set(w.x, w.y, w.z);
  }
}
