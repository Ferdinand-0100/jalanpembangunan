// Central tunables. Nothing here is NASA data; these are viewer/simulation settings.
export const CONFIG = {
  dataPath: './data/',
  meshStride: 4,                // 1 = every DEM cell (40 m). 4 -> 160 m mesh (~350k vertices)
  verticalExaggeration: 1.0,    // 1 = true scale
  roverVisualScale: 15,         // rover is ~3 m; scaled up so it is visible on a 90 km scene
  rover: {
    maxSpeed: 40,               // m/s (simulation speed, NOT real rover speed ~0.04 m/s)
    acceleration: 25,
    turnRate: 1.2,              // rad/s
    maxSlopeDeg: 25,            // slopes steeper than this (along travel direction) block movement
  },
  // Start near the publicly documented Mars 2020 landing site (approx.). Used only as a start position.
  startLonLat: [77.4509, 18.4446],
  sun: { azimuthDeg: 135, elevationDeg: 40 },
};
