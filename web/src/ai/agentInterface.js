// Autonomous Rover Swarm Agent Interface & Behaviors
import { RoverPhysics } from '../rover/roverPhysics.js';

export const ROVER_ROLES = Object.freeze({
  LEAD: 'lead',
  SURFACE_MAPPING: 'surface-mapping',
  GEOLOGICAL_INVESTIGATION: 'geological-investigation',
  TRANSPORT_SUPPORT: 'transport-support',
});

/**
 * Builds an observation from the terrain heightfield and rover state.
 */
export function observe(physics, hf, { radius = 400, n = 9 } = {}) {
  const patch = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const dx = (i / (n - 1) - 0.5) * 2 * radius;
      const dy = (0.5 - j / (n - 1)) * 2 * radius;
      patch.push(hf.sample(physics.X + dx, physics.Y + dy) - physics.elevation);
    }
  }
  return {
    X: physics.X,
    Y: physics.Y,
    heading: physics.heading,
    elevation: physics.elevation,
    slopeDeg: physics.slopeDeg,
    speed: physics.speed,
    patch,
    patchSize: n,
    patchRadius: radius,
  };
}

/**
 * Helper to normalize angle to [-PI, PI]
 */
function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Autonomous Swarm Follower Agent.
 * Navigates towards a dynamic target position while respecting slope limits.
 */
export class SwarmFollowerAgent {
  constructor(hf, opts = {}) {
    this.hf = hf;
    this.maxSlopeDeg = opts.maxSlopeDeg || 22;
    this.target = { x: 0, y: 0 };
    this.state = 'following';
  }

  setTarget(x, y) {
    this.target.x = x;
    this.target.y = y;
  }

  act(physics) {
    const dx = this.target.x - physics.X;
    const dy = this.target.y - physics.Y;
    const dist = Math.hypot(dx, dy);

    // Close enough to formation target
    if (dist < 4.5) {
      this.state = 'in-position';
      return { throttle: 0, steer: 0 };
    }

    this.state = 'moving';
    // Angle to target (heading is clockwise from North: east = +sin, north = +cos)
    const desiredHeading = Math.atan2(dx, dy);
    let headingDiff = normalizeAngle(desiredHeading - physics.heading);

    // Lookahead obstacle / steep slope avoidance
    const lookahead = Math.min(15, Math.max(5, physics.speed * 0.5));
    const probeX = physics.X + Math.sin(physics.heading) * lookahead;
    const probeY = physics.Y + Math.cos(physics.heading) * lookahead;

    if (this.hf.inBounds(probeX, probeY)) {
      const [gx, gy] = this.hf.gradient(probeX, probeY);
      const aheadSlope = Math.atan(Math.hypot(gx, gy)) * 180 / Math.PI;
      if (aheadSlope > this.maxSlopeDeg) {
        // Steer away from steep slope
        headingDiff += (headingDiff >= 0 ? 0.8 : -0.8);
      }
    }

    let steer = Math.max(-1, Math.min(1, headingDiff * 2.0));
    let throttle = 0;

    // If facing away from target, turn first with low speed
    if (Math.abs(headingDiff) > 1.2) {
      throttle = 0.2;
    } else {
      throttle = Math.min(1.0, Math.max(0.3, dist / 22));
    }

    return { throttle, steer };
  }
}

/**
 * Autonomous Patrol Agent.
 * Explores points of interest in the vicinity.
 */
export class SwarmPatrolAgent {
  constructor(hf, basePos, radius = 250) {
    this.hf = hf;
    this.base = { x: basePos.x, y: basePos.y };
    this.radius = radius;
    this.target = { x: basePos.x, y: basePos.y };
    this.waitTime = 0;
    this.pickNextWaypoint();
  }

  pickNextWaypoint() {
    const angle = Math.random() * Math.PI * 2;
    const r = (0.3 + 0.7 * Math.random()) * this.radius;
    const tx = this.base.x + Math.sin(angle) * r;
    const ty = this.base.y + Math.cos(angle) * r;
    if (this.hf.inBounds(tx, ty)) {
      this.target.x = tx;
      this.target.y = ty;
    }
    this.waitTime = 2.0 + Math.random() * 3.0; // sample & analyze pause
  }

  act(physics, dt) {
    const dx = this.target.x - physics.X;
    const dy = this.target.y - physics.Y;
    const dist = Math.hypot(dx, dy);

    if (dist < 6.0) {
      this.waitTime -= dt;
      if (this.waitTime <= 0) {
        this.pickNextWaypoint();
      }
      return { throttle: 0, steer: 0 };
    }

    const desiredHeading = Math.atan2(dx, dy);
    const headingDiff = normalizeAngle(desiredHeading - physics.heading);

    const steer = Math.max(-1, Math.min(1, headingDiff * 1.8));
    const throttle = Math.abs(headingDiff) > 1.0 ? 0.25 : 0.75;
    return { throttle, steer };
  }
}
