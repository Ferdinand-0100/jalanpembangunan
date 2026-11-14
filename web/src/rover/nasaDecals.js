import * as THREE from 'three';

let cachedWormTexture = null;
let cachedMeatballTexture = null;
let cachedContainerPanelTexture = null;

/**
 * Creates the iconic official NASA "Worm" logotype texture
 * on an aerospace composite panel with corner rivets.
 */
export function getNasaWormTexture() {
  if (cachedWormTexture) return cachedWormTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  // Aerospace composite plate background
  ctx.fillStyle = '#f0eee9';
  ctx.fillRect(0, 0, 512, 160);

  // Outer precision bezel
  ctx.strokeStyle = '#a3a099';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 152);

  // Four corner mounting titanium rivets
  ctx.fillStyle = '#3a3a3c';
  const rivetR = 5;
  [[16, 16], [496, 16], [16, 144], [496, 144]].forEach(([rx, ry]) => {
    ctx.beginPath();
    ctx.arc(rx, ry, rivetR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6b6a66';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // Draw NASA Worm Vector Logo (1975 Danne & Blackburn Design)
  // Vermilion NASA Red
  const red = '#E03C31';
  ctx.strokeStyle = red;
  ctx.fillStyle = red;
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const baseY = 32;
  const h = 72;

  // Letter 'N'
  ctx.beginPath();
  ctx.moveTo(70, baseY + h);
  ctx.lineTo(70, baseY);
  ctx.lineTo(135, baseY + h);
  ctx.lineTo(135, baseY);
  ctx.stroke();

  // Letter 'A' (No crossbar, rounded apex)
  ctx.beginPath();
  ctx.moveTo(175, baseY + h);
  ctx.lineTo(175, baseY + 18);
  ctx.quadraticCurveTo(175, baseY, 205, baseY);
  ctx.quadraticCurveTo(235, baseY, 235, baseY + 18);
  ctx.lineTo(235, baseY + h);
  ctx.stroke();

  // Letter 'S' (Continuous serpentine stroke)
  ctx.beginPath();
  ctx.moveTo(330, baseY + 16);
  ctx.quadraticCurveTo(330, baseY, 295, baseY);
  ctx.quadraticCurveTo(265, baseY, 265, baseY + 36);
  ctx.quadraticCurveTo(265, baseY + 50, 295, baseY + 54);
  ctx.quadraticCurveTo(330, baseY + 58, 330, baseY + 72);
  ctx.quadraticCurveTo(330, baseY + h, 295, baseY + h);
  ctx.quadraticCurveTo(265, baseY + h, 265, baseY + h - 16);
  ctx.stroke();

  // Letter 'A' (Identical)
  ctx.beginPath();
  ctx.moveTo(365, baseY + h);
  ctx.lineTo(365, baseY + 18);
  ctx.quadraticCurveTo(365, baseY, 395, baseY);
  ctx.quadraticCurveTo(425, baseY, 425, baseY + 18);
  ctx.lineTo(425, baseY + h);
  ctx.stroke();

  // Subtitle typography
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '1px';
  ctx.fillText('NATIONAL AERONAUTICS AND SPACE ADMINISTRATION', 256, 134);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  cachedWormTexture = texture;
  return texture;
}

/**
 * Creates the classic NASA "Meatball" insignia texture.
 */
export function getNasaMeatballTexture() {
  if (cachedMeatballTexture) return cachedMeatballTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const cx = 128, cy = 128, r = 112;

  // Outer dark mounting bezel
  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
  ctx.fill();

  // Deep NASA Blue circular sphere
  ctx.fillStyle = '#0B3D91';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Scattered white stars
  ctx.fillStyle = '#ffffff';
  const stars = [
    [55, 70], [80, 50], [105, 75], [160, 55], [195, 70],
    [50, 160], [85, 185], [170, 175], [200, 150], [128, 45],
    [65, 120], [190, 110], [145, 195], [110, 165],
  ];
  stars.forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
    ctx.fill();
  });

  // White Orbital Spacecraft Ellipse Track
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 105, 38, -Math.PI / 5.5, 0, Math.PI * 2);
  ctx.stroke();

  // Red Aerodynamic Supersonic Wing / Chevron
  ctx.strokeStyle = '#E03C31';
  ctx.fillStyle = '#E03C31';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(35, 175);
  ctx.lineTo(128, 65);
  ctx.lineTo(220, 175);
  ctx.stroke();

  // Bold White NASA Lettering
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 48px -apple-system, "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NASA', cx, cy + 8);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  cachedMeatballTexture = texture;
  return texture;
}

/**
 * Creates large container branding texture for Hermes Transport.
 */
export function getNasaContainerTexture() {
  if (cachedContainerPanelTexture) return cachedContainerPanelTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Industrial ceramic composite background
  ctx.fillStyle = '#eae7df';
  ctx.fillRect(0, 0, 1024, 256);

  // Border & technical framing
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 1008, 240);

  // Top header bar
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(8, 8, 1008, 44);

  ctx.fillStyle = '#00e5ff';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('NASA / JPL · MARS SCIENCE LOGISTICS MODULE', 28, 38);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('SPECIMEN CARRIER // UNIT-03', 996, 38);

  // Red NASA Worm Logo in center
  ctx.strokeStyle = '#E03C31';
  ctx.lineWidth = 26;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const baseY = 80;
  const h = 100;
  const startX = 260;

  // N
  ctx.beginPath();
  ctx.moveTo(startX, baseY + h);
  ctx.lineTo(startX, baseY);
  ctx.lineTo(startX + 90, baseY + h);
  ctx.lineTo(startX + 90, baseY);
  ctx.stroke();

  // A
  ctx.beginPath();
  ctx.moveTo(startX + 140, baseY + h);
  ctx.lineTo(startX + 140, baseY + 25);
  ctx.quadraticCurveTo(startX + 140, baseY, startX + 180, baseY);
  ctx.quadraticCurveTo(startX + 220, baseY, startX + 220, baseY + 25);
  ctx.lineTo(startX + 220, baseY + h);
  ctx.stroke();

  // S
  ctx.beginPath();
  ctx.moveTo(startX + 345, baseY + 22);
  ctx.quadraticCurveTo(startX + 345, baseY, startX + 300, baseY);
  ctx.quadraticCurveTo(startX + 260, baseY, startX + 260, baseY + 48);
  ctx.quadraticCurveTo(startX + 260, baseY + 68, startX + 300, baseY + 74);
  ctx.quadraticCurveTo(startX + 345, baseY + 80, startX + 345, baseY + 100);
  ctx.quadraticCurveTo(startX + 345, baseY + h, startX + 300, baseY + h);
  ctx.quadraticCurveTo(startX + 260, baseY + h, startX + 260, baseY + h - 22);
  ctx.stroke();

  // A
  ctx.beginPath();
  ctx.moveTo(startX + 390, baseY + h);
  ctx.lineTo(startX + 390, baseY + 25);
  ctx.quadraticCurveTo(startX + 390, baseY, startX + 430, baseY);
  ctx.quadraticCurveTo(startX + 470, baseY, startX + 470, baseY + 25);
  ctx.lineTo(startX + 470, baseY + h);
  ctx.stroke();

  // Bottom Subtext
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('UNITED STATES · JEZERO CRATER EXPEDITION · HERMES FREIGHT SYSTEM', 512, 225);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  cachedContainerPanelTexture = texture;
  return texture;
}
