// เครื่องมือวาดพิกเซลลงแคนวาส แล้วแปลงเป็นเท็กซ์เจอร์ของ Phaser

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

export function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

export function dot(ctx, x, y, color) {
  rect(ctx, x, y, 1, 1, color);
}

// วงกลมแบบพิกเซล (เติมเต็ม)
export function disc(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y) + 0.3);
    ctx.fillRect(cx - half, cy + y, half * 2 + 1, 1);
  }
}

// เติมสีแบบลายตารางหมากรุก ใช้ทำเงา/ไล่สีแบบพิกเซล
export function dither(ctx, x, y, w, h, color, phase = 0) {
  ctx.fillStyle = color;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if ((i + j + phase) % 2 === 0) ctx.fillRect(x + i, y + j, 1, 1);
    }
  }
}

// วาดจากแถวตัวอักษร เช่น ['..aa..', '.abba.'] โดยแต่ละตัวอักษรแทนสี
export function rows(ctx, lines, palette, ox = 0, oy = 0) {
  lines.forEach((line, y) => {
    [...line].forEach((ch, x) => {
      const col = palette[ch];
      if (col) dot(ctx, ox + x, oy + y, col);
    });
  });
}

// ใส่เส้นขอบรอบรูปทรงทึบ ให้ดูเป็นพิกเซลอาร์ต
export function outline(ctx, w, h, color) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  const marks = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) {
        marks.push([x, y]);
      }
    }
  }
  ctx.fillStyle = color;
  marks.forEach(([x, y]) => ctx.fillRect(x, y, 1, 1));
}

export function addTexture(scene, key, c) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  return scene.textures.addCanvas(key, c);
}

// รวมเฟรมหลายอันเป็นสไปรต์ชีตแนวนอน
export function addSheet(scene, key, frames, fw, fh) {
  const { c, ctx } = canvas(fw * frames.length, fh);
  frames.forEach((f, i) => ctx.drawImage(f, i * fw, 0));
  const tex = addTexture(scene, key, c);
  frames.forEach((_, i) => tex.add(i, 0, i * fw, 0, fw, fh));
  return tex;
}

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
