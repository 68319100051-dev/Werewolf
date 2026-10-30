// ฉากละเอียดของแต่ละสถานที่ 140x70 (ขยาย 3 เท่า = 420x210)
// ใช้เป็นพื้นหลังมินิเกม และฉากตอนดูผลกลางวัน
import { canvas, rect, dot, dither, disc, addTexture, rng } from './pixel.js';

export const SCENE_W = 140;
export const SCENE_H = 70;
const W = SCENE_W;
const H = SCENE_H;

function poly(ctx, pts, color) {
  const { c: tmp, ctx: t } = canvas(W, H);
  t.fillStyle = color;
  t.beginPath();
  pts.forEach(([x, y], i) => (i ? t.lineTo(x, y) : t.moveTo(x, y)));
  t.closePath();
  t.fill();
  const img = t.getImageData(0, 0, W, H);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] > 110 ? 255 : 0;
  t.putImageData(img, 0, 0);
  ctx.drawImage(tmp, 0, 0);
}

function gradient(ctx, y0, y1, colors) {
  const step = (y1 - y0) / colors.length;
  colors.forEach((col, i) => {
    const y = Math.round(y0 + i * step);
    rect(ctx, 0, y, W, Math.ceil(step) + 1, col);
    if (i) dither(ctx, 0, y, W, 2, colors[i - 1]);
  });
}

function pine(ctx, x, base, h, dark, mid, light) {
  const w = Math.round(h * 0.42);
  for (let i = 0; i < 3; i++) {
    const top = base - h + i * (h / 4);
    const bot = base - h / 3 + i * (h / 6);
    const ww = w * (0.55 + i * 0.25);
    poly(ctx, [[x, top], [x + ww, bot], [x - ww, bot]], mid);
    poly(ctx, [[x, top], [x + ww, bot], [x + 1, bot]], dark);
    dot(ctx, Math.round(x - 1), Math.round(top + 3), light);
  }
  rect(ctx, Math.round(x) - 1, Math.round(base - h / 3 + 2 * (h / 6)), 2, 4, '#2a1c14');
}

function forest(scene) {
  const { c, ctx } = canvas(W, H);
  gradient(ctx, 0, 30, ['#14302e', '#1a3a36', '#22463e', '#2a5246']);
  const r = rng(31);
  // ต้นสนไกล
  for (let x = -4; x < W + 6; x += 9) pine(ctx, x + r() * 4, 40 + r() * 4, 22 + r() * 10, '#1a3430', '#1f3e38', '#2a4e44');
  // แสงลอดต้นไม้
  ctx.fillStyle = 'rgba(255,240,180,0.07)';
  [[30, 0], [70, 0], [104, 0]].forEach(([x]) => {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 10, 0);
    ctx.lineTo(x + 34, 60);
    ctx.lineTo(x + 18, 60);
    ctx.fill();
  });
  // ต้นสนใกล้
  for (let x = 10; x < W; x += 26) pine(ctx, x + r() * 6, 50, 34 + r() * 8, '#16302a', '#22483c', '#3a6a54');
  // หมอก
  ctx.fillStyle = 'rgba(200,225,215,0.18)';
  for (let x = 0; x < W; x++) if ((x + 1) % 2) ctx.fillRect(x, 44 + Math.round(Math.sin(x / 9) * 1.5), 1, 3);
  // พื้นป่า
  rect(ctx, 0, 48, W, 22, '#2a3a24');
  dither(ctx, 0, 48, W, 2, '#22301e');
  for (let i = 0; i < 160; i++) {
    const x = Math.floor(r() * W);
    const y = 50 + Math.floor(r() * 20);
    dot(ctx, x, y, ['#3a5a2e', '#324e28', '#8a5a2a', '#6a4a24'][Math.floor(r() * 4)]);
  }
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(r() * W);
    const y = 52 + Math.floor(r() * 17);
    dot(ctx, x, y, '#4a7a3a');
    dot(ctx, x + 1, y - 1, '#5a8a44');
    dot(ctx, x - 1, y - 1, '#4a7a3a');
  }
  // ลำต้นใหญ่ขอบซ้าย-ขวา
  [[0, 12], [W - 13, 13]].forEach(([x, w]) => {
    rect(ctx, x, 0, w, 62, '#3a2a20');
    for (let y = 2; y < 62; y += 5) rect(ctx, x + 2 + (y % 3), y, 2, 3, '#2a1c14');
    rect(ctx, x + (x ? 1 : w - 3), 0, 2, 62, '#4e3a2c');
    rect(ctx, x, 40, w, 3, '#3a6a3a');
    dot(ctx, x + 3, 39, '#5a8a4a');
  });
  // เห็ด
  [[22, 60], [116, 63], [30, 64]].forEach(([x, y]) => {
    rect(ctx, x, y, 1, 3, '#e8dcc0');
    rect(ctx, x - 2, y - 2, 5, 2, '#c8343a');
    dot(ctx, x - 1, y - 2, '#ffffff');
  });
  // ตาแดงในพุ่มไม้ไกล ๆ
  dot(ctx, 92, 41, '#ff3a3a');
  dot(ctx, 95, 41, '#ff3a3a');
  addTexture(scene, 'scene_forest', c);
}

function house(ctx, x, y, w, roof, wall) {
  poly(ctx, [[x + w / 2, y - 10], [x + w + 2, y], [x - 2, y]], roof);
  rect(ctx, x, y, w, 10, wall);
  rect(ctx, x + 3, y + 3, 3, 3, '#3a2a20');
  rect(ctx, x + w - 6, y + 3, 3, 3, '#3a2a20');
  rect(ctx, x + w / 2 - 1, y + 4, 3, 6, '#5a3a22');
}

function well(scene) {
  const { c, ctx } = canvas(W, H);
  gradient(ctx, 0, 34, ['#5a8ad8', '#6a98de', '#7aa6e4', '#8ab4ea', '#9cc2ee', '#b0d0f0']);
  [[14, 8, 22], [70, 5, 28], [110, 12, 18]].forEach(([x, y, w]) => {
    rect(ctx, x, y, w, 4, '#ffffff');
    rect(ctx, x + 4, y - 3, w - 10, 3, '#ffffff');
    rect(ctx, x, y + 4, w, 1, '#dce8f5');
  });
  // บ้านไกล ๆ
  house(ctx, 6, 26, 18, '#a8483e', '#d8c8a8');
  house(ctx, 36, 28, 14, '#5a6a9a', '#c8b898');
  house(ctx, 96, 25, 20, '#8a5a3a', '#e0d0b0');
  house(ctx, 122, 28, 14, '#a8483e', '#d0c0a0');
  // พุ่มไม้
  for (let x = -4; x < W; x += 8) {
    disc(ctx, x, 38, 5, '#3a7a3a');
    dot(ctx, x - 1, 34, '#5aa050');
    dot(ctx, x + 2, 35, '#5aa050');
  }
  rect(ctx, 0, 38, W, 32, '#5a9a48');
  const r = rng(41);
  for (let i = 0; i < 180; i++) dot(ctx, Math.floor(r() * W), 40 + Math.floor(r() * 30), r() < 0.5 ? '#4e8a40' : '#68aa54');
  // ดอกไม้
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(r() * W);
    const y = 42 + Math.floor(r() * 26);
    const col = ['#f0a0c0', '#ffe070', '#ffffff', '#c0a0ff'][Math.floor(r() * 4)];
    dot(ctx, x, y, col);
    dot(ctx, x, y + 1, '#3a7a3a');
  }
  // ทางหิน
  for (let i = 0; i < 9; i++) {
    const x = 60 + i * 4 - (i % 2) * 2;
    const y = 50 + i * 2;
    rect(ctx, x, y, 6, 3, '#b0a898');
    rect(ctx, x, y, 6, 1, '#d0c8b8');
  }
  // รั้วขวา
  for (let x = 104; x < W; x += 6) {
    rect(ctx, x, 40, 2, 10, '#8a6a4a');
    dot(ctx, x, 39, '#a88a62');
  }
  rect(ctx, 104, 43, 36, 1, '#8a6a4a');
  rect(ctx, 104, 47, 36, 1, '#7a5a3a');
  addTexture(scene, 'scene_well', c);
}

function farm(scene) {
  const { c, ctx } = canvas(W, H);
  gradient(ctx, 0, 34, ['#3a2a5a', '#6a3a6a', '#a8506a', '#d87060', '#f09a60', '#f8c070']);
  disc(ctx, 104, 30, 9, '#ffe6a0');
  disc(ctx, 104, 30, 7, '#fff4c8');
  // นก
  [[30, 10], [36, 13], [42, 9]].forEach(([x, y]) => {
    dot(ctx, x, y, '#2a1a2a');
    dot(ctx, x - 1, y - 1, '#2a1a2a');
    dot(ctx, x + 1, y - 1, '#2a1a2a');
  });
  // เนินไกล
  for (let x = 0; x < W; x++) {
    const y = Math.round(32 + Math.sin(x / 14) * 2 + Math.sin(x / 5) * 0.6);
    rect(ctx, x, y, 1, 40, '#7a4a6a');
  }
  // กังหันลม
  rect(ctx, 18, 20, 5, 16, '#4a2a3a');
  poly(ctx, [[20, 16], [24, 21], [17, 21]], '#5a3040');
  ctx.fillStyle = '#4a2a3a';
  [[20, 18, 11, -9], [20, 18, -11, 9], [20, 18, 9, 11], [20, 18, -9, -11]].forEach(([x, y, dx, dy]) => {
    for (let t = 0; t <= 1; t += 0.05) ctx.fillRect(Math.round(x + dx * t), Math.round(y + dy * t), 2, 1);
  });
  // ทุ่งข้าว
  rect(ctx, 0, 36, W, 34, '#c9962a');
  const r = rng(51);
  for (let y = 36; y < H; y += 3) {
    rect(ctx, 0, y + 2, W, 1, '#a8781e');
    for (let x = (y % 2) * 2; x < W; x += 3 + Math.floor(r() * 2)) {
      dot(ctx, x, y, '#f0cc50');
      if (r() < 0.5) dot(ctx, x, y - 1, '#ffe080');
    }
  }
  dither(ctx, 0, 36, W, 3, '#d8a840');
  // หุ่นไล่กา
  rect(ctx, 122, 26, 1, 14, '#5a3a22');
  rect(ctx, 117, 30, 11, 1, '#5a3a22');
  rect(ctx, 119, 30, 7, 6, '#4a6aa0');
  disc(ctx, 122, 25, 2, '#e8c880');
  rect(ctx, 119, 22, 7, 2, '#c8a040');
  // รั้วหน้า
  for (let x = 2; x < W; x += 12) {
    rect(ctx, x, 58, 2, 12, '#6b4226');
    dot(ctx, x, 57, '#8a5a32');
  }
  rect(ctx, 0, 61, W, 2, '#6b4226');
  rect(ctx, 0, 61, W, 1, '#8a5a32');
  addTexture(scene, 'scene_farm', c);
}

function church(scene) {
  const { c, ctx } = canvas(W, H);
  // กำแพงหิน
  rect(ctx, 0, 0, W, H, '#3a3a4e');
  for (let y = 0; y < 58; y += 5) {
    for (let x = -((y / 5) % 2) * 6; x < W; x += 12) {
      rect(ctx, x + 1, y + 1, 11, 4, (x + y) % 3 ? '#4a4a60' : '#46465c');
      rect(ctx, x + 1, y + 1, 11, 1, '#56566e');
    }
  }
  // คานไม้แขวนระฆัง
  rect(ctx, 0, 6, W, 4, '#5a3a22');
  rect(ctx, 0, 6, W, 1, '#7a5230');
  rect(ctx, 0, 9, W, 1, '#3a2418');
  // หน้าต่างกระจกสี
  const glass = ['#d0434a', '#5a8ad0', '#e8b84a', '#5aa060', '#a060c0'];
  [[18, 14], [106, 14]].forEach(([x, y], k) => {
    rect(ctx, x - 1, y - 1, 18, 34, '#2a2a3a');
    disc(ctx, x + 8, y + 7, 9, '#2a2a3a');
    for (let gy = 0; gy < 30; gy += 4) {
      for (let gx = 0; gx < 16; gx += 4) {
        rect(ctx, x + gx, y + gy + 2, 3, 3, glass[(gx / 4 + gy / 4 + k) % glass.length]);
      }
    }
    disc(ctx, x + 8, y + 6, 6, glass[(k + 2) % 5]);
    disc(ctx, x + 8, y + 6, 3, '#fff0b0');
    // ลำแสง
    ctx.fillStyle = 'rgba(255,230,170,0.08)';
    ctx.beginPath();
    ctx.moveTo(x, y + 30);
    ctx.lineTo(x + 16, y + 30);
    ctx.lineTo(x + (k ? -10 : 40), 70);
    ctx.lineTo(x + (k ? -30 : 20), 70);
    ctx.fill();
  });
  // ไม้กางเขนกลาง
  rect(ctx, 68, 16, 4, 20, '#e8b84a');
  rect(ctx, 62, 21, 16, 4, '#e8b84a');
  rect(ctx, 68, 16, 1, 20, '#fff0b0');
  // พื้นกระเบื้อง
  for (let y = 56; y < H; y += 4) {
    for (let x = 0; x < W; x += 8) rect(ctx, x + ((y / 4) % 2) * 4, y, 4, 4, '#5a5068');
  }
  rect(ctx, 0, 56, W, 1, '#2a2a3a');
  // ม้านั่ง
  [[10, 58], [96, 58]].forEach(([x, y]) => {
    rect(ctx, x, y, 34, 3, '#6b4226');
    rect(ctx, x, y, 34, 1, '#8a5a32');
    rect(ctx, x + 2, y + 3, 2, 6, '#4a2e1a');
    rect(ctx, x + 30, y + 3, 2, 6, '#4a2e1a');
  });
  // เทียน
  [[50, 46], [90, 46]].forEach(([x, y]) => {
    rect(ctx, x, y, 2, 10, '#5a4a3a');
    rect(ctx, x - 1, y - 4, 4, 4, '#efe6d0');
    dot(ctx, x, y - 6, '#ffe08a');
    dot(ctx, x, y - 5, '#f08a3a');
  });
  addTexture(scene, 'scene_church', c);
}

function tavern(scene) {
  const { c, ctx } = canvas(W, H);
  // ผนังไม้
  for (let x = 0; x < W; x += 7) {
    rect(ctx, x, 0, 7, H, x % 14 ? '#5a3a22' : '#62402a');
    rect(ctx, x, 0, 1, H, '#3a2418');
  }
  const r = rng(61);
  for (let i = 0; i < 60; i++) rect(ctx, Math.floor(r() * W), Math.floor(r() * 50), 1, 3 + Math.floor(r() * 5), '#4a2e1a');
  // ชั้นวางขวด
  [[8, 12], [8, 26]].forEach(([x, y]) => {
    rect(ctx, x, y, 44, 2, '#8a5a32');
    rect(ctx, x, y + 2, 44, 1, '#3a2418');
    for (let k = 0; k < 7; k++) {
      const col = ['#3a6a3a', '#7a2a2a', '#4a4a8a', '#8a6a2a'][(k + y) % 4];
      rect(ctx, x + 2 + k * 6, y - 7, 3, 7, col);
      rect(ctx, x + 3 + k * 6, y - 9, 1, 2, col);
      dot(ctx, x + 2 + k * 6, y - 6, '#ffffff');
    }
  });
  // เตาผิงขวา
  rect(ctx, 96, 18, 36, 36, '#6a6070');
  for (let y = 18; y < 54; y += 4) for (let x = 96 + ((y / 4) % 2) * 3; x < 132; x += 6) rect(ctx, x, y, 5, 3, '#7a7080');
  rect(ctx, 102, 30, 24, 24, '#1a1218');
  poly(ctx, [[114, 34], [122, 54], [106, 54]], '#d0433a');
  poly(ctx, [[114, 40], [119, 54], [109, 54]], '#f08a3a');
  poly(ctx, [[114, 46], [116, 54], [112, 54]], '#ffe08a');
  rect(ctx, 94, 16, 40, 3, '#8a5a32');
  // ตะเกียงแขวน
  [[64, 0], [82, 0]].forEach(([x]) => {
    rect(ctx, x, 0, 1, 10, '#2a2030');
    rect(ctx, x - 2, 10, 5, 6, '#2a2030');
    rect(ctx, x - 1, 11, 3, 4, '#ffd070');
    ctx.fillStyle = 'rgba(255,200,100,0.10)';
    ctx.beginPath();
    ctx.arc(x, 13, 14, 0, Math.PI * 2);
    ctx.fill();
  });
  // ถังไม้
  [[56, 38], [70, 42]].forEach(([x, y]) => {
    rect(ctx, x, y, 12, 14, '#7a5230');
    rect(ctx, x, y + 3, 12, 1, '#4a4a58');
    rect(ctx, x, y + 10, 12, 1, '#4a4a58');
    rect(ctx, x, y, 12, 1, '#a3733f');
    rect(ctx, x + 9, y, 3, 14, '#5a3a22');
  });
  // เคาน์เตอร์บาร์
  rect(ctx, 0, 56, W, 14, '#6b4226');
  rect(ctx, 0, 56, W, 2, '#a3733f');
  rect(ctx, 0, 58, W, 1, '#3a2418');
  for (let x = 0; x < W; x += 20) rect(ctx, x, 59, 1, 11, '#4a2e1a');
  addTexture(scene, 'scene_tavern', c);
}

export function buildLocationScenes(scene) {
  forest(scene);
  well(scene);
  farm(scene);
  church(scene);
  tavern(scene);
}

