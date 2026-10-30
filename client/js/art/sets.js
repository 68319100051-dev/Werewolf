// ฉากเฉพาะของแต่ละช่วงเกม: ลานหมู่บ้าน (กลางวัน/กลางคืน) และโต๊ะจั่วการ์ด
import { canvas, rect, dot, dither, outline, addTexture, rng } from './pixel.js';

const W = 640;
const LINE = '#120e18';
export const HORIZON = 150;

// พื้นลานหินแบบมีระยะใกล้-ไกล: แถวหินด้านหลังเล็ก ด้านหน้าใหญ่
function makeSquareGround(scene, key, pal) {
  const h = 360 - HORIZON;
  const { c, ctx } = canvas(W, h);
  rect(ctx, 0, 0, W, h, pal.base);
  const r = rng(21);
  let y = 0;
  let row = 0;
  while (y < h) {
    const rh = Math.round(4 + (y / h) * 12);
    const bw = Math.round(10 + (y / h) * 30);
    const off = row % 2 ? bw / 2 : 0;
    for (let x = -bw + off; x < W; x += bw) {
      const tone = r() < 0.5 ? pal.stone : pal.stone2;
      rect(ctx, Math.round(x) + 1, y + 1, bw - 1, rh - 1, tone);
      rect(ctx, Math.round(x) + 1, y + 1, bw - 1, 1, pal.light);
      if (r() < 0.08) dot(ctx, Math.round(x) + 3, y + rh - 2, pal.moss);
    }
    rect(ctx, 0, y, W, 1, pal.gap);
    y += rh;
    row++;
  }
  // ขอบหญ้าซ้าย/ขวา ไล่ตามระยะ
  for (let yy = 0; yy < h; yy++) {
    const g = Math.round(6 + (yy / h) * 30);
    rect(ctx, 0, yy, g, 1, pal.grass);
    rect(ctx, W - g, yy, g, 1, pal.grass);
  }
  dither(ctx, 0, 0, W, 3, pal.grass);
  // วงหินรอบกองไฟ (ที่ x=200, ห่างขอบฟ้า 72)
  const fx = 200;
  const fy = 72;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const sx = Math.round(fx + Math.cos(a) * 30);
    const sy = Math.round(fy + Math.sin(a) * 9);
    rect(ctx, sx - 3, sy - 2, 6, 4, pal.ring);
    rect(ctx, sx - 3, sy - 2, 6, 1, pal.light);
  }
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    dot(ctx, Math.round(fx + Math.cos(a) * 20), Math.round(fy + Math.sin(a) * 5), pal.ash);
  }
  addTexture(scene, key, c);
}

function makeProps(scene) {
  // เสาตะเกียง
  {
    const { c, ctx } = canvas(10, 44);
    rect(ctx, 4, 10, 2, 34, '#3a2c24');
    rect(ctx, 2, 41, 6, 3, '#3a2c24');
    rect(ctx, 1, 2, 8, 9, '#2a2030');
    rect(ctx, 2, 3, 6, 7, '#f0b85a');
    rect(ctx, 3, 4, 2, 2, '#fff0b0');
    rect(ctx, 3, 0, 4, 2, '#2a2030');
    outline(ctx, 10, 44, LINE);
    addTexture(scene, 'lamp', c);
  }
  // ถังไม้
  {
    const { c, ctx } = canvas(14, 16);
    rect(ctx, 1, 1, 12, 15, '#7a5230');
    rect(ctx, 1, 1, 12, 2, '#a3733f');
    rect(ctx, 1, 5, 12, 1, '#4a4a58');
    rect(ctx, 1, 11, 12, 1, '#4a4a58');
    rect(ctx, 10, 1, 3, 15, '#5a3a22');
    outline(ctx, 14, 16, LINE);
    addTexture(scene, 'barrel', c);
  }
  // ป้ายประกาศ
  {
    const { c, ctx } = canvas(26, 30);
    rect(ctx, 3, 12, 2, 18, '#3a2c24');
    rect(ctx, 21, 12, 2, 18, '#3a2c24');
    rect(ctx, 0, 0, 26, 16, '#7a5230');
    rect(ctx, 0, 0, 26, 2, '#a3733f');
    rect(ctx, 3, 3, 8, 9, '#e8d5a8');
    rect(ctx, 14, 4, 9, 7, '#e8d5a8');
    rect(ctx, 4, 5, 6, 1, '#8a6a3a');
    rect(ctx, 4, 8, 5, 1, '#8a6a3a');
    rect(ctx, 15, 6, 6, 1, '#8a6a3a');
    dot(ctx, 7, 3, '#d0434a');
    outline(ctx, 26, 30, LINE);
    addTexture(scene, 'board', c);
  }
}

// โต๊ะไม้ในบ้าน สำหรับจั่วการ์ดตอนเช้า
function makeTable(scene) {
  const { c, ctx } = canvas(W, 360);
  // ผนังไม้
  rect(ctx, 0, 0, W, 130, '#3a2a22');
  for (let x = 0; x < W; x += 24) {
    rect(ctx, x, 0, 1, 130, '#2a1c18');
    rect(ctx, x + 1, 0, 1, 130, '#4a362a');
  }
  // หน้าต่าง
  rect(ctx, 70, 22, 132, 88, '#2a1c18');
  rect(ctx, 76, 28, 120, 76, '#8abaea');
  rect(ctx, 76, 74, 120, 30, '#6aa060');
  rect(ctx, 76, 70, 120, 4, '#5a8a6a');
  [[90, 60], [120, 52], [150, 58], [178, 62]].forEach(([x, y]) => {
    rect(ctx, x, y, 8, 14, '#3a6a4a');
    rect(ctx, x + 2, y - 4, 4, 4, '#3a6a4a');
  });
  rect(ctx, 150, 36, 22, 6, '#ffffff');
  rect(ctx, 156, 32, 12, 4, '#ffffff');
  rect(ctx, 134, 28, 4, 76, '#5a3a22');
  rect(ctx, 76, 64, 120, 4, '#5a3a22');
  rect(ctx, 64, 108, 144, 6, '#5a3a22');
  rect(ctx, 64, 108, 144, 1, '#7a5230');
  // ชั้นวางของ
  rect(ctx, 420, 60, 150, 6, '#5a3a22');
  rect(ctx, 432, 40, 12, 20, '#a8323e');
  rect(ctx, 446, 44, 10, 16, '#33508c');
  rect(ctx, 470, 46, 20, 14, '#e8d5a8');
  rect(ctx, 520, 38, 14, 22, '#3f7a45');
  rect(ctx, 520, 38, 14, 3, '#5aa060');
  // ขอบโต๊ะ
  rect(ctx, 0, 130, W, 6, '#2a1c18');
  // พื้นโต๊ะ (ไม้แนวนอน ยิ่งใกล้ยิ่งกว้าง)
  let y = 136;
  let i = 0;
  const r = rng(4);
  while (y < 360) {
    const ph = Math.round(10 + (y - 136) * 0.12);
    rect(ctx, 0, y, W, ph, i % 2 ? '#7a5230' : '#83592f');
    rect(ctx, 0, y, W, 1, '#a3733f');
    rect(ctx, 0, y + ph - 1, W, 1, '#4a321c');
    for (let k = 0; k < 6; k++) {
      const gx = Math.floor(r() * W);
      rect(ctx, gx, y + 3 + Math.floor(r() * (ph - 5)), 16 + Math.floor(r() * 30), 1, '#6a4626');
    }
    y += ph;
    i++;
  }
  dither(ctx, 0, 136, W, 4, '#2a1c18');
  addTexture(scene, 'table', c);

  // เทียน
  const cd = canvas(12, 28);
  rect(cd.ctx, 3, 10, 6, 16, '#efe6d0');
  rect(cd.ctx, 3, 10, 2, 16, '#ffffff');
  rect(cd.ctx, 1, 24, 10, 4, '#8a6a3a');
  rect(cd.ctx, 5, 7, 2, 3, '#2a1c18');
  outline(cd.ctx, 12, 28, LINE);
  addTexture(scene, 'candle', cd.c);
  const fl = canvas(6, 8);
  rect(fl.ctx, 2, 0, 2, 2, '#ffe08a');
  rect(fl.ctx, 1, 2, 4, 4, '#f08a3a');
  rect(fl.ctx, 2, 3, 2, 3, '#ffe08a');
  addTexture(scene, 'flame', fl.c);
}

export function buildSetTextures(scene) {
  makeSquareGround(scene, 'square_night', {
    base: '#1a1820', stone: '#2c2a36', stone2: '#26242f', light: '#383646', gap: '#15131a',
    moss: '#2a3a2a', grass: '#17201c', ring: '#4a4a58', ash: '#3a3238',
  });
  makeSquareGround(scene, 'square_day', {
    base: '#8a8478', stone: '#b0a898', stone2: '#a49c8c', light: '#c8c0b0', gap: '#6a6458',
    moss: '#6a8a4a', grass: '#5a9048', ring: '#7a7a88', ash: '#5a5048',
  });
  makeProps(scene);
  makeTable(scene);
}

/**
 * สร้างลานหมู่บ้าน (กองไฟอยู่ที่ x=200) คืนค่า container ที่เฟดสลับกลางวัน/กลางคืนได้
 * night: true = กลางคืน
 */
export function buildSquare(scene, night) {
  const k = night ? '' : '_day';
  const c = scene.add.container(0, 0);
  c.add(scene.add.image(0, 0, 'sky' + k).setOrigin(0));
  if (night) {
    c.add(scene.add.image(500, 60, 'moon_glow'));
    c.add(scene.add.image(500, 60, 'moon'));
  } else {
    c.add(scene.add.image(110, 56, 'sun'));
  }
  c.add(scene.add.image(0, 40, 'hills_far' + k).setOrigin(0).setScale(1, 0.9));
  for (let x = -10; x < 660; x += 15) {
    c.add(scene.add.image(x, HORIZON + 4 + Math.sin(x * 0.11) * 3, 'pine_far' + k).setOrigin(0.5, 1).setScale(0.7 + Math.sin(x * 1.3) * 0.1));
  }
  // แถวบ้านรอบลาน
  [[34, 1.2], [104, 1.35], [300, 1.3], [380, 1.2], [470, 1.4], [560, 1.3], [630, 1.2]].forEach(([x, s], i) => {
    c.add(scene.add.image(x, HORIZON + 10, 'house').setOrigin(0.5, 1).setScale(s).setFlipX(i % 2 === 1));
    if (night) {
      const wx = x + (i % 2 ? 9 : -9) * s;
      c.add(scene.add.image(wx, HORIZON + 10 - 8 * s, 'glow').setScale(0.6).setBlendMode('ADD'));
    }
  });
  c.add(scene.add.image(0, HORIZON, 'square' + (night ? '_night' : '_day')).setOrigin(0));
  // ของประกอบฉาก
  c.add(scene.add.image(470, 196, 'board').setOrigin(0.5, 1).setScale(1.5));
  c.add(scene.add.image(540, 236, 'barrel').setOrigin(0.5, 1).setScale(1.8));
  c.add(scene.add.image(560, 244, 'barrel').setOrigin(0.5, 1).setScale(1.8));
  [[14, 196], [398, 196]].forEach(([x, y]) => {
    if (night) c.add(scene.add.image(x, y - 62, 'glow').setScale(1.2).setBlendMode('ADD'));
    c.add(scene.add.image(x, y, 'lamp').setOrigin(0.5, 1).setScale(1.6));
  });
  return c;
}

// กองไฟกลางลาน (แยกจากฉาก เพื่อเรียงความลึกกับตัวละคร)
export function buildFire(scene, depthY = 222) {
  const glow = scene.add.image(200, depthY - 10, 'glow').setScale(3.4).setBlendMode('ADD').setDepth(depthY - 1);
  scene.tweens.add({ targets: glow, scale: 3.8, duration: 200, yoyo: true, repeat: -1, repeatDelay: 80 });
  const logs = scene.add.image(200, depthY + 2, 'logs').setOrigin(0.5, 1).setScale(2.2).setDepth(depthY);
  const fire = scene.add.sprite(200, depthY - 4, 'fire').setOrigin(0.5, 1).setScale(2.2).setDepth(depthY).play('fire_burn');
  const embers = scene.add.particles(200, depthY - 36, 'ember', {
    speedY: { min: -40, max: -20 }, speedX: { min: -10, max: 10 }, lifespan: 1300,
    scale: { start: 0.6, end: 0 }, alpha: { start: 1, end: 0 }, frequency: 150, blendMode: 'ADD',
  }).setDepth(depthY);
  return { glow, logs, fire, embers, all: [glow, logs, fire, embers] };
}

// ที่ยืนรอบกองไฟ: แถวหน้า -> แถวกลาง -> แถวหลัง (ห่างกันพอให้ป้ายชื่อใต้เท้าไม่ทับใคร)
export const SEATS = [
  [150, 304], [250, 304], [70, 304], [330, 304],
  [110, 258], [290, 258], [30, 258], [370, 258],
  [130, 212], [270, 212], [60, 212], [340, 212],
];
