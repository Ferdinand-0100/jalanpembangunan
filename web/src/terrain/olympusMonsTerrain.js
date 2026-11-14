let cachedOlympusHeights = null;

export function getOlympusMonsCalderaHeights(meta) {
  if (cachedOlympusHeights) {
    return cachedOlympusHeights;
  }

  const cols = meta.grid.cols;
  const rows = meta.grid.rows;
  const cellSize = meta.grid.cell_size_m || 40.0;
  const width = cols * cellSize;
  const height = rows * cellSize;
  const cx = width * 0.5;
  const cy = height * 0.5;

  const heights = new Float32Array(cols * rows);

  const calderas = [
    // Caldera 1: Central main collapse basin (oldest, expansive)
    { ox: -2200, oy: 1200, rx: 24500, ry: 19500, angle: 0.22, floor: 18350, depth: 2800, scarpW: 1300 },
    // Caldera 2: Southern major nested collapse (deep basin)
    { ox: 3500, oy: -7800, rx: 17800, ry: 16200, angle: -0.18, floor: 18050, depth: 3100, scarpW: 1200 },
    // Caldera 3: Eastern structural collapse terrace (stepped bench)
    { ox: 13800, oy: 2200, rx: 14200, ry: 14800, angle: 0.12, floor: 19350, depth: 1850, scarpW: 1100 },
    // Caldera 4: Western deep floor depression (deepest abyss)
    { ox: -11800, oy: -3800, rx: 12800, ry: 11200, angle: 0.32, floor: 17650, depth: 3250, scarpW: 950 },
    // Caldera 5: Northern subsidence shelf
    { ox: -1200, oy: 15800, rx: 13800, ry: 11800, angle: 0.08, floor: 19750, depth: 1550, scarpW: 900 },
    // Caldera 6: Central young pit crater / vent
    { ox: 1200, oy: -1400, rx: 6800, ry: 5800, angle: -0.22, floor: 17750, depth: 650, scarpW: 550 },
  ];

  for (let j = 0; j < rows; j++) {
    const y = height - j * cellSize - cy;
    const rowOffset = j * cols;

    for (let i = 0; i < cols; i++) {
      const x = i * cellSize - cx;
      const rDist = Math.hypot(x, y);

      // 1. Base Summit Shield Volcanic Dome (Peak Rim at +21,287 m)
      const nwBias = (-x * 0.25 + y * 0.35) / 25000;
      let elev = 21287 + nwBias * 120;

      // Outer shield slope: 3°-5° grade descending away from caldera rim (~26 km radius)
      if (rDist > 25500) {
        const outerD = (rDist - 25500) / 24000;
        elev -= Math.pow(outerD, 1.35) * 3600;
      }

      // 2. Nested Caldera Subsidence & Ring-Fault Scarps
      let inCalderaFloor = false;
      let minFloor = 99999;

      for (let c = 0; c < calderas.length; c++) {
        const cd = calderas[c];
        const dx = x - cd.ox;
        const dy = y - cd.oy;
        const cosA = Math.cos(cd.angle);
        const sinA = Math.sin(cd.angle);
        const nx = (dx * cosA + dy * sinA) / cd.rx;
        const ny = (-dx * sinA + dy * cosA) / cd.ry;
        const ed = Math.hypot(nx, ny);

        if (ed < 1.0) {
          inCalderaFloor = true;
          // Distance from scarp wall inward
          const wallDist = (1.0 - ed) * cd.rx;
          const t = Math.min(1.0, wallDist / cd.scarpW);
          // Cubic Hermite smoothstep for sheer cliff profile
          const wallProfile = t * t * (3 - 2 * t);
          const scarpDrop = cd.depth * wallProfile;
          const targetElev = Math.max(cd.floor, elev - scarpDrop);
          if (targetElev < minFloor) minFloor = targetElev;
        }
      }

      if (inCalderaFloor) {
        elev = Math.min(elev, minFloor);

        // 3. Caldera Floor Wrinkle Ridges & Lava Lake Features
        const ridge1 = Math.sin(x * 0.00045 + y * 0.00025) * Math.cos(x * 0.00015);
        if (ridge1 > 0.6) {
          elev += Math.pow((ridge1 - 0.6) / 0.4, 2.0) * 85;
        }

        const ridge2 = Math.sin(x * 0.0003 - y * 0.0004) * Math.sin(y * 0.0002);
        if (ridge2 > 0.65) {
          elev += Math.pow((ridge2 - 0.65) / 0.35, 2.0) * 60;
        }

        // Micro-relief: pooled effusive basalt lava sheets
        const micro = Math.sin(x * 0.002) * Math.cos(y * 0.002) * 8;
        elev += micro;
      } else {
        // 4. Outer Shield Radiating Lava Channels & Levees
        const angle = Math.atan2(y, x);
        const flowRay = Math.sin(angle * 16 + Math.sin(rDist * 0.0005) * 2);
        if (flowRay > 0.7 && rDist > 26000) {
          elev += (flowRay - 0.7) * 45;
        }
      }

      heights[rowOffset + i] = elev;
    }
  }

  cachedOlympusHeights = heights;
  return heights;
}
