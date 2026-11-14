// Rover kinematics on the real heightfield. Independent of three.js rendering.
// heading: radians clockwise from north (east = sin, north = cos).
export class RoverPhysics {
  constructor(heightfield, opts) {
    this.hf = heightfield; this.opts = opts;
    this.X = 0; this.Y = 0; this.heading = 0; this.speed = 0;
    this.elevation = 0; this.slopeDeg = 0; this.grad = [0, 0]; this.status = 'idle';
  }
  setPosition(X, Y, heading = this.heading) {
    this.X = X; this.Y = Y; this.heading = heading; this.speed = 0; this.#sense(); this.status = 'idle';
  }
  #sense() {
    this.elevation = this.hf.sample(this.X, this.Y);
    this.grad = this.hf.gradient(this.X, this.Y);
    this.slopeDeg = Math.atan(Math.hypot(...this.grad)) * 180 / Math.PI;
  }
  /** input: { throttle: -1..1, steer: -1..1 (+ = turn right) } */
  step(dt, { throttle = 0, steer = 0 } = {}) {
    const o = this.opts;
    const target = throttle * o.maxSpeed;
    const dv = Math.max(-o.acceleration * dt, Math.min(o.acceleration * dt, target - this.speed));
    this.speed += dv;
    if (throttle === 0) this.speed *= Math.exp(-3 * dt);
    if (Math.abs(this.speed) < 0.01 && throttle === 0) this.speed = 0;
    this.heading += steer * o.turnRate * dt;

    let blocked = null;
    if (this.speed !== 0) {
      const s = Math.sin(this.heading), c = Math.cos(this.heading);
      const nx = this.X + s * this.speed * dt, ny = this.Y + c * this.speed * dt;
      if (!this.hf.inBounds(nx, ny)) { blocked = 'map edge'; }
      else {
        const [gx, gy] = this.hf.gradient(nx, ny);
        const along = Math.atan(gx * s + gy * c) * 180 / Math.PI * Math.sign(this.speed);
        if (Math.abs(along) > o.maxSlopeDeg) blocked = `slope ${Math.abs(along).toFixed(0)}° > ${o.maxSlopeDeg}° limit`;
        else { this.X = nx; this.Y = ny; }
      }
      if (blocked) this.speed = 0;
    }
    this.#sense();
    this.status = blocked ? `blocked: ${blocked}` : (Math.abs(this.speed) > 0.05 ? 'driving' : 'idle');
  }
}
