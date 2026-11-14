// Autonomous Behaviors for the 3 Specialized Mars Rovers
import { RoverPhysics } from '../rover/roverPhysics.js';

export const ROVER_ROLES = Object.freeze({
  SURFACE_MAPPING: 'surface-mapping',
  GEOLOGICAL_INVESTIGATION: 'geological-investigation',
  TRANSPORT_SUPPORT: 'transport-support',
});

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * 1. Surface Mapping Agent
 * Explores uncharted terrain, performs LiDAR sweeps, and catalogs geographic features.
 */
export class SurfaceMappingAgent {
  constructor(hf, basePos, radius = 450) {
    this.hf = hf;
    this.base = { x: basePos.x, y: basePos.y };
    this.radius = radius;
    this.target = { x: basePos.x, y: basePos.y };
    this.mappedKm2 = 0;
    this.waypointsFound = 0;
    this.scanCooldown = 0;
    this.targetFeature = 'Jezero Western Fan Delta';

    this.features = [
      'Jezero Western Delta Fan',
      'Belva Crater Rim Slopes',
      'Kodiak Butte Stratified Outlier',
      'Neretva Vallis Inflow Channel',
      'Séítah Inter-dune Corridor',
      'Crater Floor Carbonate Unit',
    ];
    this.pickNextSurveyWaypoint();
  }

  pickNextSurveyWaypoint() {
    const angle = Math.random() * Math.PI * 2;
    const r = (0.25 + 0.75 * Math.random()) * this.radius;
    const tx = this.base.x + Math.sin(angle) * r;
    const ty = this.base.y + Math.cos(angle) * r;
    if (this.hf.inBounds(tx, ty)) {
      this.target.x = tx;
      this.target.y = ty;
      this.targetFeature = this.features[Math.floor(Math.random() * this.features.length)];
    }
  }

  act(physics, dt) {
    // Accumulate area mapped based on movement
    if (Math.abs(physics.speed) > 0.5) {
      this.mappedKm2 += (Math.abs(physics.speed) * dt * 0.08) / 1000;
    }

    const dx = this.target.x - physics.X;
    const dy = this.target.y - physics.Y;
    const dist = Math.hypot(dx, dy);

    if (dist < 8.0) {
      this.scanCooldown -= dt;
      if (this.scanCooldown <= 0) {
        this.waypointsFound++;
        this.mappedKm2 += 0.05;
        this.scanCooldown = 3.5;
        this.pickNextSurveyWaypoint();
      }
      return { throttle: 0, steer: 0, scanning: true };
    }

    const desiredHeading = Math.atan2(dx, dy);
    let headingDiff = normalizeAngle(desiredHeading - physics.heading);

    // Lookahead obstacle check
    const lookahead = Math.min(18, Math.max(6, physics.speed * 0.6));
    const probeX = physics.X + Math.sin(physics.heading) * lookahead;
    const probeY = physics.Y + Math.cos(physics.heading) * lookahead;
    if (this.hf.inBounds(probeX, probeY)) {
      const [gx, gy] = this.hf.gradient(probeX, probeY);
      const slope = Math.atan(Math.hypot(gx, gy)) * 180 / Math.PI;
      if (slope > 20) {
        headingDiff += (headingDiff >= 0 ? 0.9 : -0.9);
      }
    }

    const steer = Math.max(-1, Math.min(1, headingDiff * 2.0));
    const throttle = Math.abs(headingDiff) > 1.2 ? 0.25 : Math.min(1.0, Math.max(0.35, dist / 30));
    return { throttle, steer, scanning: false };
  }
}

/**
 * 2. Geological Investigation Agent
 * Locates rock outcrops, fires Raman laser spectrometer, and performs core sample drilling.
 */
export class GeologicalInvestigationAgent {
  constructor(hf, basePos) {
    this.hf = hf;
    this.target = { x: basePos.x, y: basePos.y };
    this.state = 'cruising'; // 'cruising' | 'analyzing' | 'drilling'
    this.drillTimer = 0;
    this.samplesSealed = 0;
    this.currentMineral = 'Smectite Clay & Carbonates';
    this.rockTargets = [
      { name: 'Delta Sandstone Outcrop', mineral: 'Smectite Clay & Carbonates (Biosignature Potential)' },
      { name: 'Crater Floor Igneous Unit', mineral: 'Olivine-rich Basalt (Volcanic Chronology)' },
      { name: 'Neretva Lacustrine Mudstone', mineral: 'Hydrated Silica & Fine Silts' },
      { name: 'Belva Ejecta Boulder', mineral: 'Brecciated Sulfates & Impactite' },
    ];
    this.currentRock = this.rockTargets[0];
    this.pickNextRock();
  }

  pickNextRock() {
    const angle = Math.random() * Math.PI * 2;
    const r = 60 + Math.random() * 180;
    this.target.x += Math.sin(angle) * r;
    this.target.y += Math.cos(angle) * r;
    this.currentRock = this.rockTargets[Math.floor(Math.random() * this.rockTargets.length)];
    this.currentMineral = this.currentRock.mineral;
    this.state = 'cruising';
  }

  startManualDrill() {
    this.state = 'drilling';
    this.drillTimer = 4.0;
  }

  act(physics, dt) {
    if (this.state === 'drilling' || this.state === 'analyzing') {
      this.drillTimer -= dt;
      if (this.drillTimer <= 0) {
        this.samplesSealed++;
        this.pickNextRock();
      }
      return { throttle: 0, steer: 0, laser: true, drilling: true };
    }

    const dx = this.target.x - physics.X;
    const dy = this.target.y - physics.Y;
    const dist = Math.hypot(dx, dy);

    if (dist < 6.0) {
      // Arrived at rock outcrop -> start automated analysis & core drill
      this.state = 'drilling';
      this.drillTimer = 4.5;
      return { throttle: 0, steer: 0, laser: true, drilling: true };
    }

    const desiredHeading = Math.atan2(dx, dy);
    const headingDiff = normalizeAngle(desiredHeading - physics.heading);

    const steer = Math.max(-1, Math.min(1, headingDiff * 1.8));
    const throttle = Math.abs(headingDiff) > 1.0 ? 0.25 : Math.min(0.85, Math.max(0.3, dist / 25));
    return { throttle, steer, laser: false, drilling: false };
  }
}

/**
 * 3. Mission Transport & Support Agent
 * Follows the geological investigation rover, retrieves sealed sample tubes,
 * and maintains continuous high-gain orbital communication relay.
 */
export class TransportSupportAgent {
  constructor(hf) {
    this.hf = hf;
    this.tubesCached = 0;
    this.maxTubes = 10;
    this.relaySignal = '98% (MRO Orbiter Linked)';
    this.target = { x: 0, y: 0 };
  }

  cacheSample() {
    if (this.tubesCached < this.maxTubes) {
      this.tubesCached++;
      return true;
    }
    return false;
  }

  act(physics, leaderPhysics, dt) {
    // Escort position: stays ~25m behind and 20m to the right of the leader
    const cosH = Math.cos(leaderPhysics.heading);
    const sinH = Math.sin(leaderPhysics.heading);
    const escortX = leaderPhysics.X + sinH * -28 + cosH * 22;
    const escortY = leaderPhysics.Y + cosH * -28 - sinH * 22;

    const dx = escortX - physics.X;
    const dy = escortY - physics.Y;
    const dist = Math.hypot(dx, dy);

    if (dist < 5.0) {
      return { throttle: 0, steer: 0 };
    }

    const desiredHeading = Math.atan2(dx, dy);
    const headingDiff = normalizeAngle(desiredHeading - physics.heading);

    const steer = Math.max(-1, Math.min(1, headingDiff * 2.0));
    const throttle = Math.abs(headingDiff) > 1.2 ? 0.2 : Math.min(1.0, Math.max(0.3, dist / 22));
    return { throttle, steer };
  }
}
