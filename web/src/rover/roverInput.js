// Keyboard -> { throttle, steer }. Arrow keys always drive; WASD drive unless camera is in fly mode.
export class RoverInput {
  constructor(getMode) { this.keys = new Set(); this.getMode = getMode;
    addEventListener('keydown', e => { this.keys.add(e.code); });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear()); }
  read() {
    const k = this.keys, wasd = this.getMode() !== 'fly';
    const f = (k.has('ArrowUp') || (wasd && k.has('KeyW')) ? 1 : 0) - (k.has('ArrowDown') || (wasd && k.has('KeyS')) ? 1 : 0);
    const r = (k.has('ArrowRight') || (wasd && k.has('KeyD')) ? 1 : 0) - (k.has('ArrowLeft') || (wasd && k.has('KeyA')) ? 1 : 0);
    return { throttle: f, steer: r };
  }
}
