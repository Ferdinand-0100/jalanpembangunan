// PLACEHOLDER for the future autonomous rover swarm. Intentionally NOT implemented yet.
// The environment already exposes everything an agent needs through plain data: the Heightfield
// (elevation/slope queries) and RoverPhysics (pose + step input). A future agent only has to
// produce { throttle, steer } each tick from an observation.
export const ROVER_ROLES = Object.freeze({
  TEST: 'test',
  SURFACE_MAPPING: 'surface-mapping',
  GEOLOGICAL_INVESTIGATION: 'geological-investigation',
  TRANSPORT_SUPPORT: 'transport-support',
});

/** Observation an agent may build from the world (no hidden/privileged information). */
export function observe(physics, hf, { radius = 400, n = 9 } = {}) {
  const patch = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const dx = (i / (n - 1) - 0.5) * 2 * radius, dy = (0.5 - j / (n - 1)) * 2 * radius;
    patch.push(hf.sample(physics.X + dx, physics.Y + dy) - physics.elevation); // relative heights, N x N
  }
  return { role: ROVER_ROLES.TEST, X: physics.X, Y: physics.Y, heading: physics.heading,
           elevation: physics.elevation, slopeDeg: physics.slopeDeg, speed: physics.speed, patch, patchSize: n, patchRadius: radius };
}
/** An agent is any object with: act(observation) -> { throttle, steer } */
export class AgentRegistry {
  constructor() { this.agents = new Map(); }
  register(id, role, agent) { this.agents.set(id, { role, agent }); }
}
