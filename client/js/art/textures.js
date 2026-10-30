// สร้างภาพพิกเซลทั้งหมดของเกมด้วยโค้ด (ฉาก, UI, ไอคอน, การ์ด)
import { canvas, rect, dot, disc, dither, rows, outline, addTexture, addSheet, rng } from './pixel.js';
import { buildSetTextures } from './sets.js';
import { buildLocationScenes } from './locations.js';

export const W = 640;
export const H = 360;
const LINE = '#120e18';

// เติมรูปหลายเหลี่ยม แล้วตัดขอบให้คมเป็นพิกเซล
function poly(ctx, w, h, pts, color) {
  const { c: tmp, ctx: t } = canvas(w, h);
  t.fillStyle = color;
  t.beginPath();
  pts.forEach(([x, y], i) => (i ? t.lineTo(x, y) : t.moveTo(x, y)));
  t.closePath();
  t.fill();
  const img = t.getImageData(0, 0, w, h);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] > 110 ? 255 : 0;
  t.putImageData(img, 0, 0);
  ctx.drawImage(tmp, 0, 0);
}

function icon(scene, key, lines, pal) {
  const w = lines[0].length + 2;
  const h = lines.length + 2;
  const { c, ctx } = canvas(w, h);
  rows(ctx, lines, pal, 1, 1);
  outline(ctx, w, h, LINE);
  addTexture(scene, key, c);
}

const IP = {
  g: '#e8b84a', G: '#b0802a', w: '#f2efe8', s: '#b8b8c8', S: '#6a6478', r: '#d0434a',
  n: '#6ab85a', b: '#5a8ad0', k: '#8a5a32', K: '#5a3a22', d: '#120e18', y: '#ffe08a',
};

function makeIcons(scene) {
  icon(scene, 'i_lock', [
    '..sss..', '.s...s.', '.s...s.', 'ggggggg', 'ggGGGgg', 'gggGggg', 'gggGggg', 'ggggggg',
  ], IP);
  icon(scene, 'i_crown', ['g...g...g', 'gg.ggg.gg', 'ggggggggg', 'grggrggrg', 'GGGGGGGGG'], IP);
  icon(scene, 'i_check', ['.......n', '......nn', 'n....nn.', 'nn..nn..', '.nnnn...', '..nn....'], IP);
  icon(scene, 'i_heart', ['.rr.rr.', 'rwrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], IP);
  icon(scene, 'i_user', ['..www..', '.wwwww.', '.wwwww.', '..www..', '.......', '.wwwww.', 'wwwwwww', 'wwwwwww'], IP);
  icon(scene, 'i_left', ['...ww', '..ww.', '.ww..', 'ww...', '.ww..', '..ww.', '...ww'], IP);
  icon(scene, 'i_right', ['ww...', '.ww..', '..ww.', '...ww', '..ww.', '.ww..', 'ww...'], IP);
  icon(scene, 'i_mic', ['..sss..', '.sssss.', '.swsss.', '.sssss.', '.sssss.', 's.sss.s', '.s...s.', '..sss..', '...s...'], IP);
  icon(scene, 'i_gear', [
    '..s.s.s..', '.sssssss.', 'ssss.ssss', '.ss...ss.', 'sss...sss', '.ss...ss.', 'ssss.ssss', '.sssssss.', '..s.s.s..',
  ], IP);
  icon(scene, 'i_dice', ['wwwwwwww', 'wddwwwww', 'wddwwwww', 'wwwddwww', 'wwwddwww', 'wwwwwddw', 'wwwwwddw', 'wwwwwwww'], IP);
  icon(scene, 'i_door', ['.kkkkk.', 'kkkkkkk', 'kkkKkkk', 'kkkKkkk', 'kkkKkgk', 'kkkKkkk', 'kkkKkkk', 'kkkKkkk', 'kkkkkkk'], IP);
  icon(scene, 'i_copy', ['wwwww...', 'w...w...', 'w.wwwww.', 'w.w...w.', 'www...w.', '..w...w.', '..w...w.', '..wwwww.'], IP);
  icon(scene, 'i_chat', ['wwwwwwwww', 'wwwwwwwww', 'wdwwdwwdw', 'wwwwwwwww', '.wwwwwwww', '..ww.....', '.w.......'], IP);
  icon(scene, 'i_sun', [
    '....g....', '.g.....g.', '...ggg...', '..ggggg..', 'g.ggggg.g', '..ggggg..', '...ggg...', '.g.....g.', '....g....',
  ], IP);
  icon(scene, 'i_moon', ['..www...', '.ww.....', 'ww......', 'ww......', 'ww......', 'ww.....w', '.ww...ww', '..wwww..'], IP);
  icon(scene, 'i_wolf', ['S.......S', 'SS.....SS', 'SSSSSSSSS', 'SrSSSSSrS', 'SSSSSSSSS', '.SSSSSSS.', '..SwSwS..', '...SSS...'], IP);
  icon(scene, 'i_play', ['ww....', 'wwww..', 'wwwwww', 'wwwwww', 'wwww..', 'ww....'], IP);
  icon(scene, 'i_plus', ['..ww..', '..ww..', 'wwwwww', 'wwwwww', '..ww..', '..ww..'], IP);
  icon(scene, 'i_shirt', ['bb...bb', 'bbbbbbb', '.bbbbb.', '.bbbbb.', '.bbbbb.', '.bbbbb.'], IP);
  icon(scene, 'i_book', ['kkkkkkk', 'kwwwwwk', 'kwKKKwk', 'kwwwwwk', 'kwKKwwk', 'kwwwwwk', 'kkkkkkk'], IP);
  icon(scene, 'i_refresh', ['..www..', '.w...ww', 'w....ww', 'w......', 'w.....w', '.w...w.', '..www..'], IP);
  icon(scene, 'i_danger', ['...r...', '..rrr..', '..rwr..', '.rrwrr.', '.rrrrr.', 'rrrwrrr', 'rrrrrrr'], IP);
  icon(scene, 'i_pip', ['.yy.', 'yggy', 'ygGy', '.yy.'], IP);
  icon(scene, 'i_card', ['bbbbb', 'bwwwb', 'bwgwb', 'bwwwb', 'bwgwb', 'bwwwb', 'bbbbb'], IP);
  icon(scene, 'i_key', ['.ggg....', 'g...g...', 'g...gggg', 'g...g.g.', '.ggg..g.'], IP);
  icon(scene, 'i_wave', ['....w', '..w.w', 'w.w.w', 'w.w.w', '..w.w', '....w'], { ...IP, w: '#7ac870' });

  // อนุภาคประกาย
  const sp = canvas(5, 5);
  rows(sp.ctx, ['..w..', '..y..', 'wyyyw', '..y..', '..w..'], { w: '#ffffff', y: '#ffe08a' });
  addTexture(scene, 'spark', sp.c);
  const dt = canvas(2, 2);
  rect(dt.ctx, 0, 0, 2, 2, '#ffffff');
  addTexture(scene, 'px2', dt.c);
  const ff = canvas(3, 3);
  rows(ff.ctx, ['.y.', 'yYy', '.y.'], { y: 'rgba(255,224,120,0.6)', Y: '#fff2b0' });
  addTexture(scene, 'firefly', ff.c);
}

// กรอบ 9 ช่อง (nine-slice) สำหรับแผงและปุ่ม
// กรอบ 9 ช่อง: ขอบไม้หนา 4 พิกเซล มีลายไม้ เงาด้านใน และหมุดทองที่มุม
function makeFrame(scene, key, size, { line = LINE, border, light, dark, fill, shadow, rivet = null }) {
  const { c, ctx } = canvas(size, size);
  const e = size - 1;
  rect(ctx, 1, 0, size - 2, size, line);
  rect(ctx, 0, 1, size, size - 2, line);
  // ขอบ 4 ชั้น: สว่าง > กลาง > กลาง > มืด
  const ring = (i, col) => {
    rect(ctx, 1 + i, 1 + i, size - 2 - 2 * i, 1, col);
    rect(ctx, 1 + i, e - 1 - i, size - 2 - 2 * i, 1, col);
    rect(ctx, 1 + i, 1 + i, 1, size - 2 - 2 * i, col);
    rect(ctx, e - 1 - i, 1 + i, 1, size - 2 - 2 * i, col);
  };
  ring(0, light);
  ring(1, border);
  ring(2, border);
  ring(3, dark || border);
  // ลายไม้ตามแนวขอบ (ยืดตามแนวเส้นได้โดยไม่เพี้ยน)
  if (dark) {
    rect(ctx, 8, 2, size - 16, 1, dark);
    rect(ctx, 8, e - 3, size - 16, 1, light);
    rect(ctx, 2, 8, 1, size - 16, dark);
    rect(ctx, e - 3, 8, 1, size - 16, dark);
  }
  rect(ctx, 5, 5, size - 10, size - 10, fill);
  if (shadow) {
    rect(ctx, 5, 5, size - 10, 1, shadow);
    rect(ctx, 5, 5, 1, size - 10, shadow);
  }
  if (rivet) {
    [[2, 2], [e - 3, 2], [2, e - 3], [e - 3, e - 3]].forEach(([x, y]) => {
      rect(ctx, x, y, 2, 2, rivet);
      dot(ctx, x, y, '#fff4c8');
      dot(ctx, x + 1, y + 1, '#8a6a2a');
    });
  }
  addTexture(scene, key, c);
}

function makeButton(scene, key, base, light, dark) {
  const s = 16;
  const states = {
    '': { top: light, fill: base, bottom: dark, off: 0 },
    _hover: { top: '#ffffff66', fill: light, bottom: base, off: 0 },
    _down: { top: dark, fill: base, bottom: base, off: 1 },
  };
  for (const [suf, st] of Object.entries(states)) {
    const { c, ctx } = canvas(s, s);
    rect(ctx, 1, 0, s - 2, s, LINE);
    rect(ctx, 0, 1, s, s - 2, LINE);
    rect(ctx, 1, 1, s - 2, s - 2, st.fill);
    rect(ctx, 1, 1, s - 2, 2, st.top);
    rect(ctx, 1, 3, 1, s - 7, st.top);
    if (!st.off) {
      rect(ctx, 1, s - 5, s - 2, 1, dark);
      rect(ctx, 1, s - 4, s - 2, 3, st.bottom);
      rect(ctx, s - 2, 3, 1, s - 7, st.bottom);
    } else {
      rect(ctx, 1, s - 2, s - 2, 1, dark);
    }
    addTexture(scene, key + suf, c);
  }
}

function makeUI(scene) {
  makeFrame(scene, 'panel', 24, { border: '#6b4226', light: '#a3733f', dark: '#4a2c18', fill: '#221a2c', shadow: '#140f1a', rivet: '#e8b84a' });
  makeFrame(scene, 'panel_dark', 24, { border: '#3a2f4a', light: '#5a4a70', dark: '#2a2236', fill: '#15111d', shadow: '#0b0910' });
  makeFrame(scene, 'panel_paper', 24, { border: '#8a6a3a', light: '#b08a52', dark: '#6a4e28', fill: '#e8d5a8', shadow: '#cdb684' });
  makeFrame(scene, 'slot', 12, { border: '#3a2f4a', light: '#4a3e5c', fill: '#0f0c15' });
  makeFrame(scene, 'slot_on', 12, { border: '#c9a245', light: '#f0d070', fill: '#2a2236' });
  makeButton(scene, 'btn', '#8a5a32', '#b07a45', '#5a3a22');
  makeButton(scene, 'btn_red', '#a8323e', '#d0505a', '#6e1f2a');
  makeButton(scene, 'btn_green', '#3f7a45', '#5aa060', '#285030');
  makeButton(scene, 'btn_dark', '#3a2f4a', '#55466a', '#221a2c');
}

// ---------- ฉากหลังหมู่บ้านกลางคืน ----------
function makeSky(scene, key = 'sky', bands = ['#0b0a1a', '#100e24', '#16132f', '#1d183b', '#251e48', '#2f2556', '#3b2d62', '#4a376e', '#5a4276'], stars = true) {
  const { c, ctx } = canvas(W, H);
  const bh = [40, 38, 36, 34, 32, 30, 30, 30, 90];
  let y = 0;
  bands.forEach((col, i) => {
    rect(ctx, 0, y, W, bh[i], col);
    if (i > 0) dither(ctx, 0, y, W, 3, bands[i - 1]);
    if (i > 0) dither(ctx, 0, y + 3, W, 1, bands[i - 1], 1);
    y += bh[i];
  });
  const r = rng(7);
  for (let i = 0; stars && i < 160; i++) {
    const sx = Math.floor(r() * W);
    const sy = Math.floor(r() * 220);
    dot(ctx, sx, sy, r() > 0.8 ? '#d8d0ff' : '#8a80b8');
  }
  if (!stars) {
    // ก้อนเมฆพิกเซล
    [[80, 50, 1], [300, 34, 1.3], [520, 70, 0.9], [420, 120, 0.7]].forEach(([x, y, s]) => {
      const w = Math.round(60 * s);
      rect(ctx, x, y, w, 8, '#ffffff');
      rect(ctx, x + 8, y - 6, w - 24, 6, '#ffffff');
      rect(ctx, x + 18, y - 11, w - 46, 5, '#ffffff');
      rect(ctx, x, y + 8, w, 2, '#d8e8f5');
    });
  }
  addTexture(scene, key, c);
}

function makeSun(scene) {
  const R = 22;
  const { c, ctx } = canvas(R * 2 + 4, R * 2 + 4);
  disc(ctx, R + 2, R + 2, R, '#ffe7a0');
  disc(ctx, R + 2, R + 2, R - 4, '#fff4c8');
  addTexture(scene, 'sun', c);
}

// ฉากหมู่บ้านตอนกลางวัน (ใช้ร่วมกับฉากกลางคืนแล้วค่อย ๆ เฟดสลับกัน)
function makeDayLayers(scene) {
  makeSky(scene, 'sky_day', ['#4a8ad8', '#5a96de', '#6aa2e2', '#7aaee6', '#8abaea', '#9ac4ec', '#acd0ef', '#bed9f0', '#d2e4f0'], false);
  makeSun(scene);
  hillLayer(scene, 'hills_far_day', '#6a9a8a', '#80b09a', 3, 30, 120);
  hillLayer(scene, 'hills_near_day', '#4a7a52', '#5a9060', 9, 22, 90);
  makePine(scene, 'pine_day', '#2a5a3a', '#3a7a4a', '#5aa06a', '#5a3a22');
  makePine(scene, 'pine_far_day', '#4a7a6a', '#5a8a78', '#6aa088', '#3a4a40');
  makeGround(scene, 'ground_day', ['#4a7a3a', '#5a9048', '#4e823e', '#558a44', '#6aa055', '#8a7a5a']);
}

function makeRoleIcons(scene) {
  const P = { ...IP, c: '#9ad0ff', p: '#b070d0' };
  icon(scene, 'r_alpha', ['.g.g.g...', '.ggggg...', 'S.......S', 'SS.....SS', 'SSSSSSSSS', 'SrSSSSSrS', 'SSSSSSSSS', '.SSSSSSS.', '..SwSwS..', '...SSS...'], P);
  icon(scene, 'r_wolf', ['S.......S', 'SS.....SS', 'SSSSSSSSS', 'SrSSSSSrS', 'SSSSSSSSS', '.SSSSSSS.', '..SwSwS..', '...SSS...'], P);
  icon(scene, 'r_seer', ['..ccc..', '.cwccc.', '.ccccc.', '.ccpcc.', '..ccc..', '.kkkkk.', 'kkkkkkk'], P);
  icon(scene, 'r_doctor', ['..ss..', '..ss..', '.wwww.', 'wrrrrw', 'wrwrrw', 'wrrrrw', '.wwww.'], P);
  icon(scene, 'r_hunter', ['..kk....', '.k..w...', 'k....w..', 'k.wwwwwg', 'k....w..', '.k..w...', '..kk....'], P);
  icon(scene, 'r_detective', ['.sss...', 's...s..', 's.w.s..', 's...s..', '.sss...', '....kk.', '.....kk'], P);
  icon(scene, 'r_jester', ['r.....p', 'rr...pp', '.rrgpp.', '.wwwww.', '.wdwdw.', '.wwwww.', '..wrw..'], P);
  icon(scene, 'r_villager', ['s.s.s', 's.s.s', 'sssss', '..k..', '..k..', '..k..', '..k..'], P);
  icon(scene, 'r_watchman', ['..kkk..', '.kyyyk.', '.kygyk.', '.kyyyk.', '..kkk..', '...k...', '..kkk..'], P);
  icon(scene, 'r_guard', ['sssssss', 'sbbbbbs', 'sbwbbbs', 'sbbbbbs', '.sbbbs.', '..sbs..', '...s...'], P);
  icon(scene, 'r_priest', ['...g...', '...g...', 'ggggggg', '...g...', '...g...', '...g...', '..ggg..'], P);
  icon(scene, 'r_gravedigger', ['...k...', '...k...', '...k...', '..sss..', '.sssss.', '.sssss.', '..sss..'], P);
  icon(scene, 'r_farmer', ['.g.g.g.', 'ggggggg', '.g.g.g.', 'ggggggg', '...k...', '...k...', '...k...'], P);
  icon(scene, 'r_woodcutter', ['ss.....', 'sss....', 'sssk...', '.s..k..', '.....k.', '......k'], P);
  icon(scene, 'r_cupid', ['.rr.rr.', 'rrrrrrr', 'rrwrrrr', '.rrrrr.', '..rrr..', '...r...'], P);
  icon(scene, 'r_shadow', ['p.......p', 'pp.....pp', 'ppppppppp', 'prppppprp', 'ppppppppp', '.ppppppp.', '..pwpwp..', '...ppp...'], { ...P, p: '#4a3a6a' });
  icon(scene, 'r_traitor', ['.....s', '....ss', '...ss.', '..ss..', 'gkg...', '.k....', 'k.....'], P);
  icon(scene, 'e_sunny', ['....g....', '.g.....g.', '...ggg...', '..ggggg..', 'g.ggggg.g', '..ggggg..', '...ggg...', '.g.....g.', '....g....'], P);
  icon(scene, 'e_rain', ['..www....', '.wwwwww..', 'wwwwwwww.', '.wwwwww..', '.c..c..c.', 'c..c..c..', '.c..c..c.'], P);
  icon(scene, 'e_fog', ['.wwwwww..', '.........', '..wwwwwww', '.........', 'wwwwww...', '.........', '...wwwwww'], P);
  icon(scene, 'e_festival', ['k........', 'krrrr....', 'krrr.....', 'kr.......', 'k..ggg...', 'k..gg....', 'k..g.....', 'k........'], P);
  icon(scene, 'e_drought', ['kkkkkkkkk', 'kK.kkkK.k', 'kk.KkKkkk', 'kKkk.kkKk', 'kkKkK.kkk', 'k.kkkkK.k'], P);
  icon(scene, 'e_harvest', ['.g.g.g.', 'ggggggg', '.g.g.g.', 'ggggggg', '...k...', '...k...', '...k...'], P);
  icon(scene, 'e_bell', ['...g...', '..ggg..', '.ggggg.', '.ggggg.', 'ggggggg', '...k...'], P);
  icon(scene, 'e_fullmoon', ['..rrr..', '.rrrrr.', 'rrRrrrr', 'rrrrRrr', 'rrrrrrr', '.rrrrr.', '..rrr..'], { ...P, R: '#9a2a30' });
  icon(scene, 'e_merchant', ['.rrrrr..', 'rrrrrrr.', 'kkkkkkkk', 'kgkgkgkk', 'kkkkkkkk', '.s....s.'], P);
  icon(scene, 'i_heart_empty', ['.SS.SS.', 'S..S..S', 'S.....S', '.S...S.', '..S.S..', '...S...'], P);
  icon(scene, 'i_skull', ['.wwwww.', 'wwwwwww', 'wdwwwdw', 'wdwwwdw', 'wwwdwww', '.wwwww.', '.w.w.w.'], P);
  icon(scene, 'i_eye', ['..www..', '.wwwww.', 'wwrdrww', '.wwwww.', '..www..'], P);
  icon(scene, 'i_vote', ['...w...', '..www..', '.wwwww.', '...w...', '...w...', '...w...'], P);
  icon(scene, 'i_skip', ['.sssss.', 's.....s', 's.s...s', 's..s..s', 's...s.s', 's.....s', '.sssss.'], P);
  icon(scene, 'i_note', ['wwwwww', 'wsssww', 'wwwwww', 'wssssw', 'wwwwww', 'wsssww', 'wwwwww'], P);
  icon(scene, 'i_zzz', ['wwww.....', '..w......', '.w..www..', 'wwww..w..', '.....w...', '....www..'], P);

  // ป้ายหลุมศพ
  const { c, ctx } = canvas(18, 20);
  rect(ctx, 3, 4, 12, 16, '#7a7a88');
  rect(ctx, 5, 2, 8, 2, '#7a7a88');
  rect(ctx, 6, 1, 6, 1, '#7a7a88');
  rect(ctx, 4, 4, 2, 16, '#9a9aa8');
  rect(ctx, 8, 6, 2, 8, '#4a4a58');
  rect(ctx, 6, 8, 6, 2, '#4a4a58');
  rect(ctx, 1, 18, 16, 2, '#3a5a3a');
  outline(ctx, 18, 20, LINE);
  addTexture(scene, 'tomb', c);
}

function makeMoon(scene) {
  const R = 30;
  const { c, ctx } = canvas(R * 2 + 4, R * 2 + 4);
  const cx = R + 2;
  disc(ctx, cx, cx, R, '#f3ead2');
  disc(ctx, cx + 6, cx + 4, R - 4, '#f3ead2');
  const sh = canvas(R * 2 + 4, R * 2 + 4);
  disc(sh.ctx, cx, cx, R, '#d9cba8');
  sh.ctx.globalCompositeOperation = 'destination-out';
  disc(sh.ctx, cx - 5, cx - 4, R, '#000');
  ctx.drawImage(sh.c, 0, 0);
  disc(ctx, cx - 10, cx - 6, 5, '#ddd0ad');
  disc(ctx, cx + 8, cx + 10, 4, '#ddd0ad');
  disc(ctx, cx + 2, cx - 14, 3, '#e4d8b6');
  disc(ctx, cx - 4, cx + 14, 2, '#ddd0ad');
  addTexture(scene, 'moon', c);

  const G = 90;
  const g = canvas(G * 2, G * 2);
  [[G, 'rgba(240,220,180,0.05)'], [G * 0.75, 'rgba(240,220,180,0.06)'], [G * 0.55, 'rgba(250,230,190,0.08)']].forEach(
    ([rr, col]) => disc(g.ctx, G, G, Math.floor(rr), col),
  );
  addTexture(scene, 'moon_glow', g.c);
}

function hillLayer(scene, key, base, top, seed, amp, h) {
  const { c, ctx } = canvas(W, h);
  const r = rng(seed);
  const p1 = r() * 6;
  const p2 = r() * 6;
  for (let x = 0; x < W; x++) {
    const y = Math.floor(amp + Math.sin(x / 70 + p1) * amp * 0.6 + Math.sin(x / 23 + p2) * amp * 0.2);
    rect(ctx, x, y, 1, h - y, base);
    dot(ctx, x, y, top);
  }
  addTexture(scene, key, c);
}

function makePine(scene, key, dark, mid, light, trunk) {
  const w = 26;
  const h = 46;
  const { c, ctx } = canvas(w, h);
  rect(ctx, 11, 36, 4, 10, trunk);
  rect(ctx, 11, 36, 1, 10, light);
  rect(ctx, 14, 36, 1, 10, '#120e0c');
  const tiers = [[0, 16, 6], [9, 27, 9], [18, 39, 12]];
  tiers.forEach(([top, bottom, half]) => {
    poly(ctx, w, h, [[13, top], [13 + half, bottom], [13 - half, bottom]], mid);
    poly(ctx, w, h, [[13, top], [13 + half, bottom], [14, bottom]], dark);
    // ปลายกิ่งด้านล่างหยัก ๆ
    for (let x = 13 - half; x <= 13 + half; x += 3) dot(ctx, x, bottom, x < 13 ? mid : dark);
    // ไฮไลต์ซ้ายบนของแต่ละชั้น
    for (let i = 2; i < bottom - top - 2; i += 3) dot(ctx, 13 - Math.floor((i * half) / (bottom - top)), top + i, light);
    dot(ctx, 12, top + 2, light);
  });
  const r = rng(key.length * 7);
  for (let i = 0; i < 30; i++) {
    const x = 4 + Math.floor(r() * 18);
    const y = 4 + Math.floor(r() * 34);
    const img = ctx.getImageData(x, y, 1, 1).data;
    if (img[3]) dot(ctx, x, y, r() < 0.5 ? dark : light);
  }
  outline(ctx, w, h, LINE);
  addTexture(scene, key, c);
}

function makeHouse(scene) {
  const w = 52;
  const h = 46;
  const { c, ctx } = canvas(w, h);
  // ปล่องไฟอิฐ
  rect(ctx, 36, 3, 7, 13, '#6a4a44');
  for (let y = 4; y < 16; y += 3) rect(ctx, 36 + (y % 2) * 2, y, 3, 1, '#4a3230');
  rect(ctx, 35, 2, 9, 2, '#7a5a54');
  // หลังคา 3 เฉด + สันหลังคา
  poly(ctx, w, h, [[26, 2], [50, 22], [2, 22]], '#6a2e38');
  poly(ctx, w, h, [[26, 2], [50, 22], [27, 22]], '#4e2028');
  for (let y = 6; y < 22; y += 3) {
    for (let x = 0; x < w; x += 4) {
      const xx = x + ((y / 3) % 2) * 2;
      dot(ctx, xx, y, xx < 26 ? '#8a3e48' : '#5e2830');
      dot(ctx, xx + 1, y + 1, '#3e1820');
    }
  }
  for (let i = 0; i < 22; i++) dot(ctx, 26 - Math.round(i * 1.1), 2 + i, '#a85060');
  rect(ctx, 2, 21, 48, 2, '#2e1218');
  // ผนังปูน + โครงไม้
  rect(ctx, 6, 23, 40, 19, '#c8b090');
  dither(ctx, 6, 36, 40, 6, '#b09878');
  dither(ctx, 30, 23, 16, 19, '#b09878', 1);
  [[6, 23, 2, 19], [44, 23, 2, 19], [6, 30, 40, 2], [25, 23, 2, 7]].forEach(([x, y, ww, hh]) => rect(ctx, x, y, ww, hh, '#4a3226'));
  for (let i = 0; i < 6; i++) {
    dot(ctx, 9 + i * 2, 24 + i, '#4a3226');
    dot(ctx, 42 - i * 2, 24 + i, '#4a3226');
  }
  // ฐานหิน
  rect(ctx, 5, 42, 42, 4, '#6a6a78');
  for (let x = 5; x < 47; x += 5) rect(ctx, x, 42, 1, 4, '#4a4a58');
  rect(ctx, 5, 42, 42, 1, '#8a8a98');
  // ประตูโค้ง
  rect(ctx, 21, 33, 10, 9, '#2a1810');
  rect(ctx, 22, 34, 8, 8, '#6a4226');
  rect(ctx, 23, 32, 6, 2, '#2a1810');
  rect(ctx, 24, 33, 4, 1, '#6a4226');
  rect(ctx, 25, 34, 1, 8, '#4a2c18');
  dot(ctx, 28, 38, '#e8b84a');
  // หน้าต่าง (ช่องว่างไว้ให้แสงไฟวาด) + ขอบ + กระถางดอกไม้
  [10, 34].forEach((x) => {
    rect(ctx, x - 1, 33, 10, 9, '#4a3226');
    rect(ctx, x, 34, 8, 7, '#2a1c18');
    rect(ctx, x - 1, 41, 10, 2, '#6b4226');
    dot(ctx, x + 1, 40, '#e05060');
    dot(ctx, x + 4, 40, '#f0d050');
    dot(ctx, x + 7, 40, '#e05060');
    dot(ctx, x + 2, 40, '#4a8a3a');
    dot(ctx, x + 5, 40, '#4a8a3a');
  });
  outline(ctx, w, h, LINE);
  addTexture(scene, 'house', c);

  const win = canvas(6, 5);
  rect(win.ctx, 0, 0, 6, 5, '#f0b85a');
  rect(win.ctx, 0, 0, 6, 1, '#ffe0a0');
  rect(win.ctx, 0, 0, 1, 5, '#ffd080');
  rect(win.ctx, 2, 0, 1, 5, '#2a1c18');
  rect(win.ctx, 0, 2, 6, 1, '#2a1c18');
  addTexture(scene, 'window', win.c);

  // แสงไฟนุ่ม ๆ (ใช้ไล่สีแบบวงกลม ไม่เป็นพิกเซล เพื่อให้แสงดูกลมกลืน)
  const G = 32;
  const g = canvas(G * 2, G * 2);
  const grad = g.ctx.createRadialGradient(G, G, 0, G, G, G);
  grad.addColorStop(0, 'rgba(255,190,100,0.28)');
  grad.addColorStop(0.45, 'rgba(255,170,80,0.10)');
  grad.addColorStop(1, 'rgba(255,150,60,0)');
  g.ctx.fillStyle = grad;
  g.ctx.fillRect(0, 0, G * 2, G * 2);
  addTexture(scene, 'glow', g.c);
}

function makeGround(scene, key = 'ground', pal = ['#17201c', '#26362c', '#22302a', '#1c2822', '#2f4436', '#2a2622']) {
  const [base, edge, d1, d2, tuft, path] = pal;
  const h = 80;
  const { c, ctx } = canvas(W, h);
  rect(ctx, 0, 0, W, h, base);
  rect(ctx, 0, 0, W, 3, edge);
  dither(ctx, 0, 3, W, 2, edge);
  const r = rng(11);
  for (let i = 0; i < 220; i++) {
    const x = Math.floor(r() * W);
    const y = 4 + Math.floor(r() * (h - 6));
    dot(ctx, x, y, r() > 0.5 ? d1 : d2);
    if (r() > 0.85) {
      dot(ctx, x, y - 1, tuft);
      dot(ctx, x + 1, y - 2, tuft);
    }
  }
  // หญ้ายาวเป็นกอ ๆ
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(r() * W);
    const y = 6 + Math.floor(r() * (h - 8));
    rect(ctx, x, y - 2, 1, 3, tuft);
    dot(ctx, x - 1, y - 1, tuft);
    dot(ctx, x + 1, y - 3, d1);
  }
  // ดอกไม้และก้อนหินเล็ก ๆ
  const flowers = key.includes('day') ? ['#f0a0c0', '#ffe070', '#ffffff', '#c0a0ff'] : ['#7a6a9a', '#8a8aa8', '#6a5a7a'];
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(r() * W);
    const y = 8 + Math.floor(r() * (h - 10));
    dot(ctx, x, y, flowers[i % flowers.length]);
  }
  for (let i = 0; i < 24; i++) {
    const x = Math.floor(r() * W);
    const y = 10 + Math.floor(r() * (h - 12));
    rect(ctx, x, y, 3, 2, d2);
    dot(ctx, x, y, tuft);
  }
  // ทางเดินดิน มีขอบ ร่องล้อ และก้อนหิน
  for (let y = 10; y < h; y++) {
    const half = 30 + (y - 10) * 1.6;
    rect(ctx, W / 2 - half, y, half * 2, 1, path);
    dot(ctx, Math.round(W / 2 - half), y, d2);
    dot(ctx, Math.round(W / 2 + half), y, d2);
    dot(ctx, Math.round(W / 2 - half * 0.45), y, d2);
    dot(ctx, Math.round(W / 2 + half * 0.45), y, d2);
  }
  for (let i = 0; i < 30; i++) {
    const y = 14 + Math.floor(r() * (h - 16));
    const half = 30 + (y - 10) * 1.6;
    const x = Math.round(W / 2 + (r() * 2 - 1) * half * 0.9);
    rect(ctx, x, y, 2, 1, tuft);
  }
  dither(ctx, W / 2 - 60, 10, 120, 6, base);
  addTexture(scene, key, c);
}

function makeFire(scene) {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const { c, ctx } = canvas(16, 22);
    const sway = [0, 1, 0, -1][f];
    const tall = [0, 2, 1, 3][f];
    poly(ctx, 16, 22, [[8 + sway, 2 + tall], [14, 18], [8, 21], [2, 18]], '#d0433a');
    poly(ctx, 16, 22, [[8 - sway, 7 + tall], [12, 18], [8, 20], [4, 18]], '#f08a3a');
    poly(ctx, 16, 22, [[8 + sway, 12 + tall / 2], [10, 18], [8, 20], [6, 18]], '#ffe08a');
    if (f % 2) dot(ctx, 4 + f, 4, '#f08a3a');
    else dot(ctx, 11 - f, 6, '#ffe08a');
    frames.push(c);
  }
  addSheet(scene, 'fire', frames, 16, 22);
  scene.anims.create({ key: 'fire_burn', frames: scene.anims.generateFrameNumbers('fire', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });

  const { c, ctx } = canvas(24, 8);
  rect(ctx, 1, 3, 22, 3, '#5a3a22');
  rect(ctx, 3, 1, 18, 3, '#7a5230');
  rect(ctx, 1, 6, 8, 2, '#3a2418');
  rect(ctx, 15, 6, 8, 2, '#3a2418');
  dot(ctx, 6, 2, '#a3733f');
  dot(ctx, 16, 2, '#a3733f');
  outline(ctx, 24, 8, LINE);
  addTexture(scene, 'logs', c);

  const s = canvas(4, 4);
  rect(s.ctx, 0, 0, 4, 4, '#ffb050');
  addTexture(scene, 'ember', s.c);
}

function makeFog(scene) {
  const w = 180;
  const h = 34;
  const { c, ctx } = canvas(w, h);
  for (let i = 0; i < 3; i++) {
    const a = 0.05 + i * 0.03;
    ctx.fillStyle = `rgba(200,190,230,${a})`;
    const rx = w / 2 - i * 22;
    const ry = h / 2 - i * 4;
    for (let y = -ry; y <= ry; y++) {
      const half = Math.floor(rx * Math.sqrt(1 - (y * y) / (ry * ry)));
      ctx.fillRect(w / 2 - half, h / 2 + y, half * 2, 1);
    }
  }
  addTexture(scene, 'fog', c);
}

// หน้าผาหินสำหรับหน้าแรก (ฐานจะซ่อนอยู่หลังแถวบ้าน)
function makeCliff(scene) {
  const w = 310;
  const h = 190;
  const { c, ctx } = canvas(w, h);
  poly(ctx, w, h, [
    [0, 190], [10, 172], [24, 160], [36, 148], [50, 122], [62, 108], [74, 92], [88, 70], [100, 56],
    [112, 44], [130, 40], [150, 41], [164, 46], [180, 64], [198, 86], [220, 104], [248, 126], [276, 150], [300, 176], [310, 190],
  ], '#15121f');
  const img = ctx.getImageData(0, 0, w, h);
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && img.data[(y * w + x) * 4 + 3] > 0;
  const r = rng(13);
  // ชั้นหิน
  for (let y = 50; y < h; y += 9 + Math.floor(r() * 5)) {
    let x = 0;
    while (x < w) {
      const len = 8 + Math.floor(r() * 26);
      for (let i = 0; i < len; i++) if (solid(x + i, y)) dot(ctx, x + i, y, '#1e1a2b');
      for (let i = 2; i < len - 2; i++) if (solid(x + i, y + 1)) dot(ctx, x + i, y + 1, '#100e18');
      x += len + 4 + Math.floor(r() * 12);
    }
  }
  // จุดหินเล็ก ๆ
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(r() * w);
    const y = Math.floor(r() * h);
    if (solid(x, y)) dot(ctx, x, y, r() < 0.5 ? '#1b1727' : '#110f19');
  }
  // แสงจันทร์ตกกระทบขอบซ้ายและด้านบน
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!solid(x, y)) continue;
      if (!solid(x - 1, y)) {
        dot(ctx, x, y, '#3a3352');
        if (solid(x + 1, y)) dot(ctx, x + 1, y, '#2a2540');
      }
      if (!solid(x, y - 1)) {
        dot(ctx, x, y, '#4a4266');
        if (solid(x, y + 1)) dot(ctx, x, y + 1, '#2e2844');
      }
      if (!solid(x, y - 1) && x > 100 && x < 172 && r() < 0.35) {
        dot(ctx, x, y - 1, '#1a2a26');
        if (r() < 0.4) dot(ctx, x, y - 2, '#22362f');
      }
    }
  }
  addTexture(scene, 'cliff', c);
}

// หมาป่านั่งเงยหน้าหอน มีขอบแสงจันทร์
function makeHowlWolf(scene) {
  const ww = 42;
  const wh = 36;
  const { c, ctx } = canvas(ww, wh);
  rows(ctx, [
    '......................................xx',
    '.....................................xxx',
    '....................................xxx.',
    '...................................xxxx.',
    '..................................xxxx..',
    '..........................x......xxxxx..',
    '..........................xx....xxxxx...',
    '..........................xxx..xxxxxx...',
    '..........................xxxxxxxxxx....',
    '.........................xxxxxxxxxxx....',
    '.........................xxxxxxxxxx.....',
    '........................xxxxxxxxxx......',
    '........................xxxxxxxxx.......',
    '.......................xxxxxxxxxx.......',
    '......................xxxxxxxxxxx.......',
    '.....................xxxxxxxxxxxx.......',
    '...................xxxxxxxxxxxxxx.......',
    '.................xxxxxxxxxxxxxxxx.......',
    '...............xxxxxxxxxxxxxxxxx........',
    '.............xxxxxxxxxxxxxxxxxxx........',
    '............xxxxxxxxxxxxxxxxxxxx........',
    '...........xxxxxxxxxxxxxxxxxxxxx........',
    '..........xxxxxxxxxxxxxxxxxxxxxx........',
    '.........xxxxxxxxxxxxxxxxxxxxxxx........',
    '.........xxxxxxxxxxxxxxx.xxxxxxx........',
    '........xxxxxxxxxxxxxxx...xxxxx.........',
    '........xxxxxxxxxxxxxxx...xxxxx.........',
    '........xxxxxxxxxxxxxx....xxxx..........',
    '........xxxxxxxxxxxxxx....xxxx..........',
    '.........xxxxxxxxxxxx.....xxxx..........',
    '..........xxxxxxxxxxx.....xxxx..........',
    '..xxxx......xxxxxxxxx.....xxxx..........',
    '.xxxxxxxx..xxxxxxxxxx.....xxxx..........',
    'xxxxxxxxxxxxxxxxxxxxxx...xxxxxx.........',
  ], { x: '#09080f' }, 0, 1);
  // ขอบแสงจันทร์ด้านบนและด้านขวา (พระจันทร์อยู่ด้านหน้าหมาป่า)
  const id = ctx.getImageData(0, 0, ww, wh);
  const on = (x, y) => x >= 0 && y >= 0 && x < ww && y < wh && id.data[(y * ww + x) * 4 + 3] > 0;
  for (let y = 0; y < wh; y++) {
    for (let x = 0; x < ww; x++) {
      if (on(x, y) && (!on(x, y - 1) || !on(x + 1, y))) dot(ctx, x, y, '#4a4466');
    }
  }
  dot(ctx, 34, 8, '#09080f');
  addTexture(scene, 'howl_wolf', c);

  // ค้างคาว 2 เฟรม
  const bat = (up) => {
    const b = canvas(11, 6);
    rows(b.ctx, up
      ? ['x.........x', 'xx.......xx', '.xxx.x.xxx.', '..xxxxxxx..', '....xxx....', '...........']
      : ['...........', '....x.x....', '..xxxxxxx..', '.xxxxxxxxx.', 'xx...x...xx', 'x.........x'], { x: '#0a0912' });
    return b.c;
  };
  addSheet(scene, 'bat', [bat(true), bat(false)], 11, 6);
  scene.anims.create({ key: 'bat_fly', frames: scene.anims.generateFrameNumbers('bat', { start: 0, end: 1 }), frameRate: 8, repeat: -1 });

  // เมฆบาง ๆ ลอยผ่านพระจันทร์
  const cl = canvas(70, 12);
  rect(cl.ctx, 6, 4, 58, 5, 'rgba(60,52,90,0.85)');
  rect(cl.ctx, 16, 1, 30, 4, 'rgba(60,52,90,0.85)');
  rect(cl.ctx, 0, 7, 70, 3, 'rgba(48,42,76,0.85)');
  addTexture(scene, 'night_cloud', cl.c);
}

function makeWolf(scene) {
  const w = 44;
  const h = 34;
  const { c, ctx } = canvas(w, h);
  const col = '#0a0912';
  poly(ctx, w, h, [
    [2, 33], [4, 27], [9, 26], [12, 22], [15, 15], [19, 10], [21, 5], [24, 1], [29, 0], [30, 2],
    [27, 5], [28, 7], [25, 9], [24, 13], [26, 20], [28, 33], [24, 33], [23, 26], [20, 33], [8, 33],
  ], col);
  poly(ctx, w, h, [[20, 5], [19, 0], [23, 3]], col);
  // หิน
  poly(ctx, w, h, [[0, 34], [6, 30], [30, 29], [40, 31], [44, 34]], '#14121c');
  addTexture(scene, 'wolf_howl', c);
}

// ---------- การ์ด ----------
export const CARD_W = 60;
export const CARD_H = 84;

function makeCards(scene) {
  // หลังการ์ด
  {
    const { c, ctx } = canvas(CARD_W, CARD_H);
    rect(ctx, 1, 0, CARD_W - 2, CARD_H, LINE);
    rect(ctx, 0, 1, CARD_W, CARD_H - 2, LINE);
    rect(ctx, 1, 1, CARD_W - 2, CARD_H - 2, '#c9a245');
    rect(ctx, 3, 3, CARD_W - 6, CARD_H - 6, '#2a2040');
    rect(ctx, 5, 5, CARD_W - 10, CARD_H - 10, '#c9a245');
    rect(ctx, 6, 6, CARD_W - 12, CARD_H - 12, '#2a2040');
    for (let y = 8; y < CARD_H - 8; y += 4) {
      for (let x = 8; x < CARD_W - 8; x += 4) dot(ctx, x + ((y / 4) % 2) * 2, y, '#3d2f5a');
    }
    const cx = CARD_W / 2;
    const cy = CARD_H / 2;
    disc(ctx, cx, cy, 13, '#1a1430');
    disc(ctx, cx, cy, 11, '#f3ead2');
    disc(ctx, cx + 5, cy - 3, 10, '#1a1430');
    rect(ctx, cx - 1, 9, 2, 6, '#c9a245');
    rect(ctx, cx - 1, CARD_H - 15, 2, 6, '#c9a245');
    dot(ctx, cx - 7, cy + 5, '#d0433a');
    dot(ctx, cx - 3, cy + 5, '#d0433a');
    addTexture(scene, 'card_back', c);
  }
  // หน้าการ์ด
  {
    const { c, ctx } = canvas(CARD_W, CARD_H);
    rect(ctx, 1, 0, CARD_W - 2, CARD_H, LINE);
    rect(ctx, 0, 1, CARD_W, CARD_H - 2, LINE);
    rect(ctx, 1, 1, CARD_W - 2, CARD_H - 2, '#8a6a3a');
    rect(ctx, 2, 2, CARD_W - 4, CARD_H - 4, '#e8d5a8');
    rect(ctx, 2, 2, CARD_W - 4, 1, '#f5e6c0');
    dither(ctx, 2, CARD_H - 10, CARD_W - 4, 8, '#d8c290');
    rect(ctx, 4, 4, CARD_W - 8, 40, LINE);
    addTexture(scene, 'card_front', c);
  }
  // กรอบเรืองแสงตอนชี้
  {
    const { c, ctx } = canvas(CARD_W + 6, CARD_H + 6);
    rect(ctx, 1, 0, CARD_W + 4, CARD_H + 6, '#ffe08a');
    rect(ctx, 0, 1, CARD_W + 6, CARD_H + 4, '#ffe08a');
    ctx.clearRect(3, 3, CARD_W, CARD_H);
    addTexture(scene, 'card_glow', c);
  }
}

const ART_W = 52;
const ART_H = 38;

function art(scene, key, draw) {
  const { c, ctx } = canvas(ART_W, ART_H);
  draw(ctx);
  addTexture(scene, 'loc_' + key, c);
}

function makeLocationArt(scene) {
  art(scene, 'forest', (ctx) => {
    rect(ctx, 0, 0, ART_W, ART_H, '#0f1d1c');
    dither(ctx, 0, 0, ART_W, 12, '#16282a');
    const tree = (x, y, s, col) => poly(ctx, ART_W, ART_H, [[x, y], [x + s, y + s * 2.6], [x - s, y + s * 2.6]], col);
    [[6, 6, 7], [20, 2, 9], [38, 5, 8], [48, 10, 6]].forEach(([x, y, s]) => tree(x, y, s, '#1d3a33'));
    [[12, 12, 8], [30, 10, 9], [44, 16, 7]].forEach(([x, y, s]) => tree(x, y, s, '#244a40'));
    rect(ctx, 0, 30, ART_W, 8, '#14231e');
    dither(ctx, 0, 27, ART_W, 4, 'rgba(200,190,230,0.25)');
    rect(ctx, 22, 22, 2, 1, '#ff3a3a');
    rect(ctx, 26, 22, 2, 1, '#ff3a3a');
  });
  art(scene, 'well', (ctx) => {
    rect(ctx, 0, 0, ART_W, ART_H, '#5a7ab0');
    dither(ctx, 0, 14, ART_W, 4, '#7a9ac8');
    rect(ctx, 0, 18, ART_W, 20, '#7a9ac8');
    rect(ctx, 0, 26, ART_W, 12, '#4a7a3f');
    dither(ctx, 0, 24, ART_W, 2, '#4a7a3f');
    rect(ctx, 15, 8, 2, 16, '#5a3a22');
    rect(ctx, 35, 8, 2, 16, '#5a3a22');
    poly(ctx, ART_W, ART_H, [[26, 1], [41, 10], [11, 10]], '#8a3b2e');
    rect(ctx, 16, 12, 20, 1, '#3a2418');
    rect(ctx, 25, 13, 1, 5, '#3a2418');
    rect(ctx, 23, 18, 5, 4, '#8a5a32');
    rect(ctx, 13, 22, 26, 10, '#8a8a98');
    for (let y = 22; y < 32; y += 3) for (let x = 13 + ((y / 3) % 2) * 3; x < 39; x += 6) rect(ctx, x, y, 1, 3, '#5a5a68');
    rect(ctx, 13, 22, 26, 1, '#b0b0c0');
    rect(ctx, 13, 29, 26, 3, '#6a6a78');
  });
  art(scene, 'farm', (ctx) => {
    rect(ctx, 0, 0, ART_W, ART_H, '#f0a860');
    dither(ctx, 0, 8, ART_W, 3, '#f5c878');
    rect(ctx, 0, 11, ART_W, 8, '#f5c878');
    disc(ctx, 38, 13, 6, '#fff0b0');
    rect(ctx, 0, 18, ART_W, 20, '#c9962a');
    for (let y = 19; y < ART_H; y += 3) {
      for (let x = (y % 2) * 2; x < ART_W; x += 4) {
        dot(ctx, x, y, '#f0cc50');
        dot(ctx, x, y - 1, '#e0b840');
      }
    }
    rect(ctx, 0, 30, ART_W, 1, '#6b4226');
    for (let x = 2; x < ART_W; x += 8) rect(ctx, x, 27, 2, 8, '#6b4226');
  });
  art(scene, 'church', (ctx) => {
    rect(ctx, 0, 0, ART_W, ART_H, '#2a3460');
    dither(ctx, 0, 20, ART_W, 3, '#3a4478');
    rect(ctx, 0, 23, ART_W, 15, '#3a4478');
    rect(ctx, 0, 32, ART_W, 6, '#2d3f33');
    rect(ctx, 14, 16, 24, 17, '#b0a8a8');
    rect(ctx, 34, 16, 4, 17, '#8a8288');
    poly(ctx, ART_W, ART_H, [[26, 4], [40, 17], [12, 17]], '#5a2c34');
    rect(ctx, 25, 0, 2, 7, '#e8b84a');
    rect(ctx, 23, 2, 6, 2, '#e8b84a');
    rect(ctx, 23, 20, 6, 7, '#2a1c18');
    rect(ctx, 24, 21, 2, 3, '#5a8ad0');
    rect(ctx, 26, 21, 2, 3, '#d0434a');
    rect(ctx, 24, 24, 4, 3, '#e8b84a');
    rect(ctx, 16, 27, 5, 6, '#3a2418');
    rect(ctx, 31, 27, 5, 6, '#3a2418');
  });
  art(scene, 'tavern', (ctx) => {
    rect(ctx, 0, 0, ART_W, ART_H, '#1e1a3a');
    for (let i = 0; i < 8; i++) dot(ctx, (i * 13) % ART_W, (i * 7) % 12, '#8a80b8');
    rect(ctx, 0, 32, ART_W, 6, '#2a2622');
    poly(ctx, ART_W, ART_H, [[24, 3], [46, 15], [2, 15]], '#5a2c34');
    rect(ctx, 6, 15, 36, 18, '#7a6654');
    rect(ctx, 6, 15, 36, 1, '#3a2c24');
    rect(ctx, 6, 22, 36, 1, '#3a2c24');
    rect(ctx, 10, 17, 7, 4, '#f0b85a');
    rect(ctx, 30, 17, 7, 4, '#f0b85a');
    rect(ctx, 20, 24, 8, 9, '#3a2418');
    rect(ctx, 21, 25, 6, 8, '#f0a040');
    rect(ctx, 42, 16, 7, 1, '#3a2418');
    rect(ctx, 43, 17, 1, 2, '#3a2418');
    rect(ctx, 47, 17, 1, 2, '#3a2418');
    rect(ctx, 42, 19, 7, 7, '#8a5a32');
    rect(ctx, 44, 21, 3, 3, '#e8b84a');
    dot(ctx, 47, 22, '#e8b84a');
    rect(ctx, 44, 21, 3, 1, '#ffffff');
  });
}

export function buildAllTextures(scene) {
  makeIcons(scene);
  makeUI(scene);
  makeSky(scene);
  makeMoon(scene);
  hillLayer(scene, 'hills_far', '#241c3e', '#2f2650', 3, 30, 120);
  hillLayer(scene, 'hills_near', '#191428', '#231c36', 9, 22, 90);
  makePine(scene, 'pine', '#14261f', '#1d3a30', '#2f5544', '#2a1c18');
  makePine(scene, 'pine_far', '#141a2a', '#1a2236', '#232d44', '#121620');
  makeHouse(scene);
  makeGround(scene);
  makeFire(scene);
  makeFog(scene);
  makeWolf(scene);
  makeCliff(scene);
  makeHowlWolf(scene);
  makeCards(scene);
  makeLocationArt(scene);
  makeDayLayers(scene);
  makeRoleIcons(scene);
  buildSetTextures(scene);
  buildLocationScenes(scene);
}
