import * as THREE from 'three';

let cachedWormTexture = null;
let cachedMeatballTexture = null;
let cachedContainerPanelTexture = null;

/**
 * Draws the official United States Flag in high precision vector style.
 */
function drawUSFlag(ctx, x, y, w, h) {
  ctx.save();
  // Outer subtle gold/silver border
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);

  // 13 Stripes (7 red, 6 white)
  const stripeH = h / 13;
  for (let i = 0; i < 13; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#B31942' : '#FFFFFF';
    ctx.fillRect(x, y + i * stripeH, w, stripeH + 0.3);
  }

  // Blue Canton
  const cantonW = w * 0.42;
  const cantonH = stripeH * 7;
  ctx.fillStyle = '#0A3161';
  ctx.fillRect(x, y, cantonW, cantonH);

  // White Stars
  ctx.fillStyle = '#FFFFFF';
  const rows = 5;
  const cols = 6;
  const starDx = cantonW / (cols + 1);
  const starDy = cantonH / (rows + 1);

  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const sx = x + c * starDx;
      const sy = y + r * starDy;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Draws the Danne & Blackburn NASA Worm logo with mathematical precision
 * on a modular grid (H = 4 * sw, letterW = 3 * sw, gap = 1 * sw).
 */
function drawNasaWormLogo(ctx, startX, baseY, sw, color = '#E03C31') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = sw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const h = 4 * sw;
  const letterW = 3 * sw;
  const gap = sw;
  const R = (letterW - sw) / 2;

  // 1. Letter 'N'
  // Continuous stroke: bottom-left -> top-left -> bottom-right -> top-right
  let curX = startX;
  const nLeft = curX + sw / 2;
  const nRight = curX + letterW - sw / 2;

  ctx.beginPath();
  ctx.moveTo(nLeft, baseY + h);
  ctx.lineTo(nLeft, baseY);
  ctx.lineTo(nRight, baseY + h);
  ctx.lineTo(nRight, baseY);
  ctx.stroke();

  // 2. Letter 'A' (First)
  // Left stem -> apex arch (semicircle) -> right stem
  curX += letterW + gap;
  const a1Left = curX + sw / 2;
  const a1Right = curX + letterW - sw / 2;
  const a1Center = curX + letterW / 2;

  ctx.beginPath();
  ctx.moveTo(a1Left, baseY + h);
  ctx.lineTo(a1Left, baseY + R);
  ctx.arc(a1Center, baseY + R, R, Math.PI, 0, false);
  ctx.lineTo(a1Right, baseY + h);
  ctx.stroke();

  // 3. Letter 'S' (Iconic continuous serpentine curve)
  curX += letterW + gap;
  const sCenter = curX + letterW / 2;
  const sLeft = curX + sw / 2;
  const sRight = curX + letterW - sw / 2;
  const cyTop = baseY + R;
  const cyBottom = baseY + h - R;
  const dy = (cyBottom - cyTop) * 0.52;

  ctx.beginPath();
  // Start at top-right terminal
  ctx.moveTo(sRight, cyTop);
  // Curve up and left across top arch
  ctx.arc(sCenter, cyTop, R, 0, -Math.PI, true);
  // Smooth cubic bezier crossing through the middle diagonally
  ctx.bezierCurveTo(sLeft, cyTop + dy, sRight, cyBottom - dy, sRight, cyBottom);
  // Curve under and left across bottom arch
  ctx.arc(sCenter, cyBottom, R, 0, Math.PI, false);
  ctx.stroke();

  // 4. Letter 'A' (Second, identical)
  curX += letterW + gap;
  const a2Left = curX + sw / 2;
  const a2Right = curX + letterW - sw / 2;
  const a2Center = curX + letterW / 2;

  ctx.beginPath();
  ctx.moveTo(a2Left, baseY + h);
  ctx.lineTo(a2Left, baseY + R);
  ctx.arc(a2Center, baseY + R, R, Math.PI, 0, false);
  ctx.lineTo(a2Right, baseY + h);
  ctx.stroke();

  ctx.restore();
}

/**
 * Creates the ultra-high-resolution (2048 x 512) official NASA Mars Rover Plaque texture.
 * Features:
 * - Aerospace ceramic-white composite placard finish
 * - Authentic Danne & Blackburn NASA Worm logo in vermilion red
 * - Crisp United States Flag
 * - Titanium mounting hex bolts with realistic metallic highlights
 * - Official mission typography
 */
export function getNasaWormTexture() {
  if (cachedWormTexture) return cachedWormTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 1. Aerospace Ceramic-White Thermal Composite Placard Base
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.5, '#f8fafc');
  grad.addColorStop(1, '#edf2f7');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2048, 512);

  // 2. Precision Beveled Titanium Outer Frame
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 2028, 492);

  ctx.strokeStyle = '#0ea5e9';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, 2008, 472);

  // 3. Four Corner Titanium Mounting Hex Fasteners
  const hexRadius = 16;
  const cornerCoords = [
    [54, 54],
    [1994, 54],
    [54, 458],
    [1994, 458],
  ];

  cornerCoords.forEach(([hx, hy]) => {
    // Washer
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(hx, hy, hexRadius + 4, 0, Math.PI * 2);
    ctx.fill();

    // Hex bolt head
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    for (let a = 0; a < 6; a++) {
      const ang = (a * Math.PI) / 3;
      const bx = hx + hexRadius * Math.cos(ang);
      const by = hy + hexRadius * Math.sin(ang);
      if (a === 0) ctx.moveTo(bx, by);
      else ctx.lineTo(bx, by);
    }
    ctx.closePath();
    ctx.fill();

    // Center socket depression
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(hx, hy, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // 4. United States Flag (Left Section)
  const flagW = 280;
  const flagH = 150;
  const flagX = 120;
  const flagY = 160;
  drawUSFlag(ctx, flagX, flagY, flagW, flagH);

  // Text under flag
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('UNITED STATES', flagX + flagW / 2, flagY + flagH + 42);

  // Vertical divider bar
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(460, 60);
  ctx.lineTo(460, 452);
  ctx.stroke();

  // 5. Official NASA Worm Logotype (Center Section)
  const sw = 56;
  const wormStartX = 550;
  const wormBaseY = 130;
  drawNasaWormLogo(ctx, wormStartX, wormBaseY, sw, '#E03C31');

  // Subtitle typography under NASA logo
  ctx.fillStyle = '#334155';
  ctx.font = '700 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('NATIONAL AERONAUTICS AND SPACE ADMINISTRATION', wormStartX + 10, wormBaseY + 4 * sw + 54);

  // 6. Right Mission Insignia Stamp
  const stampX = 1640;
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.strokeRect(stampX, 100, 270, 260);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MARS 2020', stampX + 135, 145);

  ctx.fillStyle = '#E03C31';
  ctx.font = '900 28px monospace';
  ctx.fillText('JEZERO EXPEDITION', stampX + 135, 195);

  ctx.fillStyle = '#64748b';
  ctx.font = '18px monospace';
  ctx.fillText('SWARM SURFACE ASSET', stampX + 135, 245);
  ctx.fillText('JPL / CALTECH', stampX + 135, 290);
  ctx.fillText('USGS ASTROGEOLOGY', stampX + 135, 325);

  // Bottom technical datum line
  ctx.fillStyle = '#64748b';
  ctx.font = '16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('FLIGHT HARDWARE IDENTIFIER · CHASSIS INTEGRATION SPECIFICATION NASA-STD-8739', 1024, 480);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  cachedWormTexture = texture;
  return texture;
}

/**
 * Creates the ultra-high-resolution (1024 x 1024) NASA "Meatball" Insignia.
 */
export function getNasaMeatballTexture() {
  if (cachedMeatballTexture) return cachedMeatballTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  const cx = 512, cy = 512, r = 440;

  // Outer dark aerospace mounting bezel
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(cx, cy, r + 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 8;
  ctx.stroke();

  // Deep NASA Blue circular planetary body with rich radial sphere gradient
  const sphereGrad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
  sphereGrad.addColorStop(0, '#1a54b8');
  sphereGrad.addColorStop(0.7, '#0B3D91');
  sphereGrad.addColorStop(1, '#062359');
  ctx.fillStyle = sphereGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Field of white stars with varying magnitude & glints
  ctx.fillStyle = '#ffffff';
  const stars = [
    [210, 270, 4.5], [310, 190, 3.5], [410, 290, 5], [620, 210, 4], [760, 270, 4.5],
    [190, 620, 4], [330, 720, 5], [670, 680, 4.5], [780, 590, 3.5], [512, 170, 6],
    [250, 460, 3.5], [740, 430, 4], [570, 770, 5], [430, 650, 3.5], [320, 380, 4],
    [690, 330, 4], [480, 270, 3.5], [540, 640, 4]
  ];
  stars.forEach(([sx, sy, sr]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();

    // 4-point cross glint on brightest stars
    if (sr >= 5) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx - sr * 2.5, sy); ctx.lineTo(sx + sr * 2.5, sy);
      ctx.moveTo(sx, sy - sr * 2.5); ctx.lineTo(sx, sy + sr * 2.5);
      ctx.stroke();
    }
  });

  // White Orbital Spacecraft Ellipse Track (back half)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 410, 150, -Math.PI / 5.2, Math.PI * 0.9, Math.PI * 2.05);
  ctx.stroke();

  // Red Supersonic Aerodynamic Wing / Chevron
  ctx.strokeStyle = '#E03C31';
  ctx.fillStyle = '#E03C31';
  ctx.lineWidth = 52;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(130, 680);
  ctx.lineTo(512, 250);
  ctx.lineTo(894, 680);
  ctx.stroke();

  // White Orbital Spacecraft Ellipse Track (front half crossing chevron)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 410, 150, -Math.PI / 5.2, 0, Math.PI * 0.9);
  ctx.stroke();

  // Bold White NASA Lettering (Official heavy sans-serif typography)
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 170px -apple-system, "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '6px';
  ctx.fillText('NASA', cx, cy + 24);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  cachedMeatballTexture = texture;
  return texture;
}

/**
 * Creates high-resolution (2048 x 512) cargo container branding for Hermes Transport.
 */
export function getNasaContainerTexture() {
  if (cachedContainerPanelTexture) return cachedContainerPanelTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Industrial ceramic-titanium composite background
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, 2048, 512);

  // Outer framing
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 12;
  ctx.strokeRect(10, 10, 2028, 492);

  // Top header banner
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(10, 10, 2028, 88);

  ctx.fillStyle = '#00e5ff';
  ctx.font = 'bold 42px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('NASA / JPL · MARS SCIENCE LOGISTICS MODULE', 48, 70);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('SPECIMEN CARRIER // UNIT-03', 1996, 70);

  // US Flag on left of container
  drawUSFlag(ctx, 60, 150, 280, 150);

  // NASA Worm Logo in Center
  const sw = 56;
  drawNasaWormLogo(ctx, 420, 150, sw, '#E03C31');

  // Right Side Specs Box
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 3;
  ctx.strokeRect(1540, 130, 450, 260);

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('HERMES TRANSPORT SYSTEM', 1565, 175);

  ctx.fillStyle = '#475569';
  ctx.font = '22px monospace';
  ctx.fillText('PAYLOAD: GEOLOGICAL SAMPLES', 1565, 225);
  ctx.fillText('CAPACITY: 4 × HERMETIC SEALS', 1565, 270);
  ctx.fillText('DESTINATION: LAB STATION', 1565, 315);
  ctx.fillText('SAFETY CLASS: BIO-CONTAINMENT', 1565, 360);

  // Bottom hazard warning diagonal safety chevrons
  const stripeW = 40;
  for (let x = 10; x < 2038; x += stripeW * 2) {
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(x, 460);
    ctx.lineTo(x + stripeW, 460);
    ctx.lineTo(x + stripeW - 20, 498);
    ctx.lineTo(x - 20, 498);
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(x + stripeW, 460);
    ctx.lineTo(x + stripeW * 2, 460);
    ctx.lineTo(x + stripeW * 2 - 20, 498);
    ctx.lineTo(x + stripeW - 20, 498);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  cachedContainerPanelTexture = texture;
  return texture;
}
