// ตัวละครพิกเซล 20x30 ประกอบจากชิ้นส่วนชุด (ลงเงา 3 ระดับ)
import { canvas, rect, dot, outline, addSheet } from './pixel.js';
import { CATALOG, BASE_SIZE } from '/catalog.js';

export const CHAR_W = 20;
export const CHAR_H = 30;

export const OUTFIT_PARTS = {
  hat: ['ไม่มี', 'หมวกฟาง', 'ฮู้ด', 'ผ้าโพก', 'หมวกไหมพรม', 'มงกุฎดอกไม้', 'หมวกขนนก', 'หมวกปีกกว้าง'],
  hair: ['ดำ', 'น้ำตาล', 'แดง', 'ขาว', 'ทอง', 'ม่วง', 'ชมพู', 'ฟ้า'],
  shirt: ['แดง', 'น้ำเงิน', 'เขียว', 'น้ำตาล', 'ม่วง', 'เหลือง', 'ดำ', 'ขาว'],
  item: ['ไม่มี', 'กระเป๋า', 'ผ้าพันคอ', 'ไม้เท้า', 'ตะเกียง', 'ผ้าคลุม', 'ตะกร้า', 'สร้อยเขี้ยว'],
  face: ['ไม่มี', 'แว่นตา', 'ผ้าปิดตา', 'หนวด', 'ผ้าปิดปาก'],
  skin: ['อ่อน', 'กลาง', 'เข้ม', 'ขาว', 'เข้มมาก'], // ตามหมายเลขสี (ห้องแต่งตัวเรียงใหม่ด้วย SKIN_ORDER)
};

// ของจากตู้กาชาต่อท้ายรายชื่อ (ใส่ได้เฉพาะคนที่มี)
for (const it of CATALOG) if (it.kind === 'outfit') OUTFIT_PARTS[it.part][it.value] = it.name;
export { BASE_SIZE };

export const PART_LABELS = { hat: 'หมวก', hair: 'สีผม', shirt: 'สีเสื้อ', item: 'ของติดตัว', face: 'ใบหน้า', skin: 'สีผิว' };

// ลำดับเดิม (อ่อน กลาง เข้ม = 0 1 2) คงไว้ ชุดที่บันทึกไว้แล้วจะได้ไม่เปลี่ยน
const SKIN = [
  { hi: '#ffe0c0', base: '#f2c9a0', sh: '#d9a27a', blush: '#f0a090' },
  { hi: '#e8b488', base: '#d39a6a', sh: '#b07850', blush: '#d07a60' },
  { hi: '#a8704c', base: '#8d5a3b', sh: '#6e4229', blush: '#a85a40' },
  { hi: '#fff0e4', base: '#f8dccb', sh: '#e2b8a0', blush: '#f8a8a0' },
  { hi: '#7a4a30', base: '#5e3a24', sh: '#42261a', blush: '#7a3a28' },
];
// เรียงสีผิวจากสว่างไปเข้มในห้องแต่งตัว
export const SKIN_ORDER = [3, 0, 1, 2, 4];
const HAIR = [
  { hi: '#5a4a68', base: '#2b2233', sh: '#1a141f' },
  { hi: '#a8703f', base: '#6b4226', sh: '#4a2c18' },
  { hi: '#ef8a50', base: '#b5452f', sh: '#82301f' },
  { hi: '#ffffff', base: '#cfcac0', sh: '#9a948a' },
  { hi: '#fff0a0', base: '#e8c040', sh: '#b08a20' },
  { hi: '#c090e8', base: '#7a4aa8', sh: '#523070' },
  { hi: '#ffc0d8', base: '#e870a0', sh: '#b04a78' },
  { hi: '#b0e8ff', base: '#4aa0d8', sh: '#2a6a98' },
  // ของกาชา: เงิน / เขียวมรกต / เปลวไฟ / กาแล็กซี
  { hi: '#ffffff', base: '#b8c0d0', sh: '#7a8498' },
  { hi: '#7af0b0', base: '#2aa070', sh: '#1a6a4a' },
  { hi: '#ffe070', base: '#f06a20', sh: '#b03010' },
  { hi: '#a080ff', base: '#3a2a78', sh: '#1e1448' },
];
const SHIRT = [
  { hi: '#d0505a', base: '#a8323e', sh: '#7a2230', dk: '#521620' },
  { hi: '#5a78b8', base: '#33508c', sh: '#233864', dk: '#162444' },
  { hi: '#5aa060', base: '#3f7a45', sh: '#2a5531', dk: '#1a3a20' },
  { hi: '#a07a50', base: '#7a5a3a', sh: '#57402a', dk: '#3a2a1a' },
  { hi: '#9a6ac8', base: '#6a3e98', sh: '#4a2a6e', dk: '#301a48' },
  { hi: '#f8e070', base: '#d8b030', sh: '#a88020', dk: '#705410' },
  { hi: '#4a4458', base: '#2a2632', sh: '#1a1720', dk: '#0e0c12' },
  { hi: '#ffffff', base: '#dcd8d0', sh: '#a8a49c', dk: '#7a766e' },
  // ของกาชา: ชมพูพาสเทล / เขียวมรกต / เกราะอัศวิน / ชุดคลุมราชา (กระดุมทอง)
  { hi: '#ffe0ec', base: '#f4a8c4', sh: '#d07a9a', dk: '#a85a78' },
  { hi: '#5ac890', base: '#1e8a5a', sh: '#14603e', dk: '#0a3a24' },
  { hi: '#eef2f8', base: '#a8b0c0', sh: '#707888', dk: '#4a5060' },
  { hi: '#e04a5a', base: '#9a1a2a', sh: '#6a1020', dk: '#e8c040' },
  // ชุดฮา: เสื้อลายดอก / ชุดตัวไก่
  { hi: '#8ad8f8', base: '#3aa0d8', sh: '#2a70a8', dk: '#1a4a78' },
  { hi: '#fff4a0', base: '#f8d840', sh: '#d0a820', dk: '#e86a20' },
];
const PANTS = { hi: '#54443c', base: '#3b2f2a', sh: '#2a201c' };
const BOOT = { hi: '#4a3a32', base: '#2a1e1a' };
const BELT = '#4a2e1a';
const BUCKLE = '#e8c060';
const EYE = '#1a1420';
const LINE = '#120e18';

export const DEFAULT_OUTFIT = { hat: 0, hair: 1, shirt: 1, item: 0, face: 0, skin: 0 };

// สุ่มเฉพาะชุดฟรี (ของกาชาต้องเลือกเองในห้องแต่งตัว)
export function randomOutfit() {
  const o = {};
  for (const k of Object.keys(OUTFIT_PARTS)) o[k] = Math.floor(Math.random() * BASE_SIZE[k]);
  return o;
}

// คั่นด้วย _ เพราะของกาชามีเลขสองหลัก (ไม่งั้น 1,12 กับ 11,2 จะได้ชื่อซ้ำกัน)
export function outfitKey(o) {
  return `char_${o.skin}_${o.hair}_${o.hat}_${o.shirt}_${o.item}_${o.face || 0}`;
}

// frame: 0 = ปกติ, 1 = หายใจ (ตัวยุบลง), 2 = กระพริบตา, 3-4 = เดิน
function drawFrame(o, frame) {
  const { c, ctx } = canvas(CHAR_W, CHAR_H);
  const S = SKIN[o.skin];
  const H = HAIR[o.hair];
  const C = SHIRT[o.shirt];
  const dy = frame === 1 ? 1 : 0;
  const hy = 3 + dy; // บนสุดของหัว
  const ty = 15 + dy; // บนสุดของลำตัว
  const walk = frame === 3 ? 1 : frame === 4 ? -1 : 0;
  const liftL = Math.max(0, walk);
  const liftR = Math.max(0, -walk);

  // ขา + รองเท้า (ขาข้างที่ก้าวจะยกขึ้น 1 พิกเซล)
  rect(ctx, 5, 23, 10, 1, PANTS.base);
  rect(ctx, 5, 23, 4, 4 - liftL, PANTS.base);
  rect(ctx, 11, 23, 4, 4 - liftR, PANTS.base);
  rect(ctx, 5, 23, 1, 3 - liftL, PANTS.hi);
  rect(ctx, 8, 24, 1, 3 - liftL, PANTS.sh);
  rect(ctx, 14, 24, 1, 3 - liftR, PANTS.sh);
  rect(ctx, 4, 27 - liftL, 5, 3, BOOT.base);
  rect(ctx, 11, 27 - liftR, 5, 3, BOOT.base);
  rect(ctx, 4, 27 - liftL, 5, 1, BOOT.hi);
  rect(ctx, 11, 27 - liftR, 5, 1, BOOT.hi);

  // ลำตัว (เสื้อ 3 เฉด)
  rect(ctx, 4, ty, 12, 23 - ty, C.base);
  rect(ctx, 4, ty, 2, 23 - ty, C.hi);
  rect(ctx, 13, ty, 3, 23 - ty, C.sh);
  rect(ctx, 9, ty + 1, 1, 22 - ty - 1, C.sh);
  dot(ctx, 10, ty + 3, C.dk);
  dot(ctx, 10, ty + 5, C.dk);
  // คอเสื้อรูปตัว V
  rect(ctx, 8, ty, 4, 1, S.base);
  rect(ctx, 9, ty + 1, 2, 1, S.sh);
  dot(ctx, 7, ty, C.hi);
  dot(ctx, 12, ty, C.hi);
  if (o.shirt === 12) {
    [[5, ty + 2, '#f8e070'], [11, ty + 3, '#f06a8a'], [7, ty + 6, '#ffffff'], [13, ty + 5, '#f8e070'], [6, ty + 9, '#f06a8a'], [12, ty + 8, '#ffffff']].forEach(([x, y, col]) => {
      dot(ctx, x, y, col);
      dot(ctx, x + 1, y, col);
    });
  } else if (o.shirt === 13) {
    // ชุดตัวไก่: ขนฟูที่อกกับปีกเล็ก ๆ
    rect(ctx, 7, ty + 2, 6, 4, '#fffbe0');
    [[6, ty + 3], [13, ty + 4], [8, ty + 7], [11, ty + 7]].forEach(([x, y]) => dot(ctx, x, y, '#fffbe0'));
    rect(ctx, 0, ty + 3, 2, 4, '#f8d840');
    rect(ctx, 18, ty + 3, 2, 4, '#d0a820');
  } else if (o.shirt === 10) {
    rect(ctx, 4, ty + 3, 12, 1, C.sh);
    [[5, ty + 2], [14, ty + 2], [5, ty + 5], [14, ty + 5]].forEach(([x, y]) => dot(ctx, x, y, C.hi));
  } else if (o.shirt === 11) {
    rect(ctx, 4, 21, 12, 1, '#e8c040');
    rect(ctx, 6, ty, 1, 6, '#f2efe8');
    rect(ctx, 13, ty, 1, 6, '#f2efe8');
    dot(ctx, 6, ty + 2, '#1a1420');
    dot(ctx, 13, ty + 4, '#1a1420');
  }
  // เข็มขัด
  rect(ctx, 4, 22, 12, 1, BELT);
  rect(ctx, 9, 22, 2, 1, BUCKLE);
  // แขน
  const armL = 6 - dy + walk;
  const armR = 6 - dy - walk;
  rect(ctx, 2, ty + 1, 2, armL, C.sh);
  rect(ctx, 2, ty + 1, 1, armL, C.base);
  rect(ctx, 16, ty + 1, 2, armR, C.dk);
  rect(ctx, 2, ty + 1 + armL, 2, 1, C.hi);
  rect(ctx, 16, ty + 1 + armR, 2, 1, C.sh);
  rect(ctx, 2, ty + 2 + armL, 2, 2, S.base);
  rect(ctx, 16, ty + 2 + armR, 2, 2, S.sh);

  // คอ
  rect(ctx, 8, hy + 10, 4, 2, S.sh);

  // หัว
  rect(ctx, 5, hy + 1, 10, 10, S.base);
  rect(ctx, 6, hy, 8, 1, S.base);
  rect(ctx, 5, hy + 2, 1, 7, S.hi);
  rect(ctx, 13, hy + 2, 2, 8, S.sh);
  rect(ctx, 6, hy + 10, 8, 1, S.sh);
  dot(ctx, 4, hy + 6, S.base);
  dot(ctx, 15, hy + 6, S.sh);

  // ผม
  if (o.hat !== 2) {
    rect(ctx, 5, hy - 1, 10, 4, H.base);
    rect(ctx, 6, hy - 2, 8, 1, H.base);
    rect(ctx, 4, hy, 1, 6, H.base);
    rect(ctx, 15, hy, 1, 6, H.sh);
    rect(ctx, 14, hy + 1, 1, 4, H.sh);
    rect(ctx, 5, hy + 3, 2, 1, H.base);
    dot(ctx, 5, hy + 4, H.base);
    dot(ctx, 9, hy + 3, H.base);
    rect(ctx, 12, hy + 3, 2, 1, H.sh);
    rect(ctx, 7, hy - 1, 3, 1, H.hi);
    dot(ctx, 6, hy, H.hi);
    dot(ctx, 11, hy, H.hi);
    // คิ้ว
    dot(ctx, 7, hy + 4, H.sh);
    dot(ctx, 12, hy + 4, H.sh);
    if (o.hair === 11) [[6, hy - 1], [10, hy - 2], [13, hy], [4, hy + 2], [15, hy + 3]].forEach(([x, y]) => dot(ctx, x, y, '#fff6c0'));
    if (o.hair === 10) [[7, hy - 3], [11, hy - 3], [13, hy - 2]].forEach(([x, y]) => dot(ctx, x, y, '#ffb020'));
  }

  // ตา แก้ม ปาก
  if (frame === 2) {
    rect(ctx, 7, hy + 6, 2, 1, EYE);
    rect(ctx, 11, hy + 6, 2, 1, EYE);
  } else {
    rect(ctx, 7, hy + 5, 1, 2, EYE);
    rect(ctx, 11, hy + 5, 1, 2, EYE);
    dot(ctx, 8, hy + 5, '#ffffff');
    dot(ctx, 12, hy + 5, '#ffffff');
  }
  dot(ctx, 6, hy + 7, S.blush);
  dot(ctx, 13, hy + 7, S.blush);
  dot(ctx, 10, hy + 7, S.sh);
  rect(ctx, 9, hy + 8, 2, 1, '#8a4a3a');

  // หมวก
  if (o.hat === 1) {
    const straw = { hi: '#fae8a0', base: '#e3c165', sh: '#b8953e' };
    rect(ctx, 6, hy - 4, 8, 4, straw.base);
    rect(ctx, 7, hy - 5, 6, 1, straw.base);
    rect(ctx, 7, hy - 4, 3, 1, straw.hi);
    rect(ctx, 12, hy - 4, 2, 4, straw.sh);
    rect(ctx, 6, hy - 1, 8, 1, '#a83a2e');
    rect(ctx, 1, hy, 18, 1, straw.base);
    rect(ctx, 2, hy + 1, 16, 1, straw.sh);
    rect(ctx, 3, hy, 4, 1, straw.hi);
  } else if (o.hat === 2) {
    const hood = { hi: '#6a6280', base: '#4a4458', sh: '#332e40', dk: '#221e2c' };
    rect(ctx, 5, hy - 2, 10, 4, hood.base);
    rect(ctx, 6, hy - 3, 8, 1, hood.base);
    rect(ctx, 4, hy, 2, 11, hood.base);
    rect(ctx, 14, hy, 2, 11, hood.sh);
    rect(ctx, 6, hy + 2, 8, 1, hood.dk);
    rect(ctx, 7, hy - 2, 4, 1, hood.hi);
    rect(ctx, 4, hy, 1, 9, hood.hi);
    rect(ctx, 3, ty, 14, 3, hood.base);
    rect(ctx, 3, ty, 14, 1, hood.hi);
    rect(ctx, 13, ty, 4, 3, hood.sh);
    dot(ctx, 7, hy + 4, hood.dk);
    dot(ctx, 12, hy + 4, hood.dk);
  } else if (o.hat === 3) {
    rect(ctx, 4, hy + 1, 12, 3, '#b33a3a');
    rect(ctx, 5, hy + 1, 6, 1, '#e06050');
    rect(ctx, 4, hy + 3, 12, 1, '#7a2020');
    dot(ctx, 7, hy + 2, '#f0d0a0');
    dot(ctx, 11, hy + 2, '#f0d0a0');
    rect(ctx, 16, hy + 2, 2, 2, '#b33a3a');
    rect(ctx, 17, hy + 4, 2, 3, '#8a2828');
  } else if (o.hat === 4) {
    // หมวกไหมพรมมีพู่
    const k = { hi: '#6aaae0', base: '#3a7ab8', sh: '#2a5a8a' };
    rect(ctx, 5, hy - 3, 10, 4, k.base);
    rect(ctx, 6, hy - 4, 8, 1, k.base);
    rect(ctx, 6, hy - 3, 3, 1, k.hi);
    rect(ctx, 13, hy - 3, 2, 4, k.sh);
    rect(ctx, 4, hy, 12, 2, k.sh);
    for (let x = 5; x < 16; x += 2) dot(ctx, x, hy, k.hi);
    rect(ctx, 9, hy - 6, 2, 2, '#f2efe8');
  } else if (o.hat === 5) {
    // มงกุฎดอกไม้
    rect(ctx, 5, hy - 1, 10, 1, '#4a8a3a');
    [[5, '#f080a8'], [8, '#ffe070'], [11, '#ffffff'], [14, '#f080a8']].forEach(([x, col]) => {
      rect(ctx, x - 1, hy - 3, 2, 2, col);
      dot(ctx, x, hy - 2, '#e8a030');
    });
    dot(ctx, 6, hy - 2, '#5aa050');
    dot(ctx, 12, hy - 2, '#5aa050');
  } else if (o.hat === 6) {
    // หมวกนายพรานปีกแหลม + ขนนกแดง
    const f = { hi: '#6a9a5a', base: '#4a7a3a', sh: '#30562a' };
    rect(ctx, 5, hy - 3, 10, 3, f.base);
    rect(ctx, 6, hy - 4, 7, 1, f.base);
    rect(ctx, 6, hy - 3, 3, 1, f.hi);
    rect(ctx, 3, hy - 1, 13, 1, f.sh);
    rect(ctx, 14, hy - 2, 3, 1, f.base);
    for (let i = 0; i < 5; i++) dot(ctx, 11 + i, hy - 4 - i, i % 2 ? '#f06060' : '#c03030');
  } else if (o.hat === 7) {
    // หมวกปีกกว้างสีดำ
    rect(ctx, 6, hy - 6, 8, 6, '#2a2632');
    rect(ctx, 6, hy - 6, 2, 6, '#4a4458');
    rect(ctx, 6, hy - 2, 8, 1, '#8a2a3a');
    rect(ctx, 1, hy - 1, 18, 2, '#1e1b24');
    rect(ctx, 2, hy - 1, 6, 1, '#4a4458');
  } else if (o.hat === 8) {
    // หมวกแม่มดปลายแหลมงอ
    const w = { hi: '#6a4a98', base: '#3a2a5a', sh: '#24183c' };
    rect(ctx, 1, hy - 1, 18, 2, w.sh);
    rect(ctx, 2, hy - 1, 7, 1, w.base);
    rect(ctx, 5, hy - 4, 10, 3, w.base);
    rect(ctx, 6, hy - 6, 8, 2, w.base);
    rect(ctx, 7, hy - 8, 6, 2, w.base);
    rect(ctx, 9, hy - 10, 4, 2, w.base);
    rect(ctx, 12, hy - 11, 3, 2, w.base);
    rect(ctx, 15, hy - 11, 2, 1, w.sh);
    rect(ctx, 6, hy - 6, 2, 4, w.hi);
    rect(ctx, 5, hy - 2, 10, 1, '#e8c040');
    dot(ctx, 10, hy - 2, '#fff0a0');
  } else if (o.hat === 9) {
    // หูกระต่าย
    rect(ctx, 6, hy - 8, 3, 7, '#f2efe8');
    rect(ctx, 11, hy - 9, 3, 8, '#f2efe8');
    rect(ctx, 7, hy - 7, 1, 5, '#f0a0b8');
    rect(ctx, 12, hy - 8, 1, 6, '#f0a0b8');
    rect(ctx, 5, hy - 1, 10, 1, '#f2efe8');
  } else if (o.hat === 10) {
    // หัวฟักทองแกะสลัก (ครอบทั้งหัว)
    const p = { hi: '#ffb050', base: '#e8801a', sh: '#a84a10' };
    rect(ctx, 4, hy - 1, 12, 12, p.base);
    rect(ctx, 5, hy - 2, 10, 1, p.base);
    rect(ctx, 5, hy, 2, 10, p.hi);
    rect(ctx, 13, hy, 3, 10, p.sh);
    rect(ctx, 9, hy - 1, 1, 12, p.sh);
    rect(ctx, 9, hy - 4, 2, 3, '#3a7a2a');
    rect(ctx, 6, hy + 3, 3, 2, '#1a0a00');
    rect(ctx, 11, hy + 3, 3, 2, '#1a0a00');
    dot(ctx, 7, hy + 3, '#ffd040');
    dot(ctx, 12, hy + 3, '#ffd040');
    rect(ctx, 6, hy + 7, 8, 2, '#1a0a00');
    dot(ctx, 8, hy + 7, p.base);
    dot(ctx, 11, hy + 8, p.base);
  } else if (o.hat === 11) {
    // หูหมาป่าขนฟู
    const g = { hi: '#a8a4b8', base: '#6a6478', sh: '#46404e' };
    rect(ctx, 4, hy - 3, 4, 4, g.base);
    rect(ctx, 5, hy - 5, 2, 2, g.base);
    rect(ctx, 12, hy - 3, 4, 4, g.sh);
    rect(ctx, 13, hy - 5, 2, 2, g.sh);
    rect(ctx, 5, hy - 2, 2, 2, '#e8a0b0');
    rect(ctx, 13, hy - 2, 2, 2, '#c88090');
    dot(ctx, 4, hy - 3, g.hi);
  } else if (o.hat === 12) {
    // มงกุฎทองคำประดับอัญมณี
    const gold = { hi: '#fff0a0', base: '#f0c030', sh: '#b08010' };
    rect(ctx, 5, hy - 3, 10, 3, gold.base);
    rect(ctx, 5, hy - 3, 10, 1, gold.hi);
    rect(ctx, 13, hy - 2, 2, 2, gold.sh);
    [5, 9, 10, 14].forEach((x) => dot(ctx, x, hy - 4, gold.base));
    dot(ctx, 9, hy - 5, gold.hi);
    dot(ctx, 7, hy - 2, '#e03040');
    dot(ctx, 10, hy - 2, '#3a8af0');
    dot(ctx, 12, hy - 2, '#40c070');
  } else if (o.hat === 13) {
    // หัวไก่: หงอนแดง จะงอยปากส้ม เหนียง
    rect(ctx, 5, hy - 2, 10, 5, '#fffbe0');
    rect(ctx, 6, hy - 3, 8, 1, '#fffbe0');
    rect(ctx, 13, hy - 2, 2, 5, '#e8e0c0');
    rect(ctx, 7, hy - 6, 2, 3, '#e03040');
    rect(ctx, 9, hy - 7, 2, 4, '#e03040');
    rect(ctx, 11, hy - 5, 2, 2, '#e03040');
    rect(ctx, 9, hy + 6, 3, 2, '#f0a020');
    rect(ctx, 10, hy + 8, 1, 2, '#e03040');
  } else if (o.hat === 14) {
    // ถุงกระดาษคลุมหัว (เจาะรูตา)
    const bag = { hi: '#e8d0a0', base: '#c8a870', sh: '#a08050' };
    rect(ctx, 4, hy - 2, 12, 13, bag.base);
    rect(ctx, 4, hy - 2, 2, 13, bag.hi);
    rect(ctx, 14, hy - 2, 2, 13, bag.sh);
    rect(ctx, 4, hy - 2, 12, 1, bag.sh);
    for (let x = 5; x < 15; x += 2) dot(ctx, x, hy - 3, bag.base);
    rect(ctx, 7, hy + 4, 2, 2, '#1a1420');
    rect(ctx, 11, hy + 4, 2, 2, '#1a1420');
    rect(ctx, 8, hy + 8, 4, 1, '#6a5030');
  } else if (o.hat === 15) {
    // ฮู้ดไดโนเสาร์ มีหนามบนหัว
    const d = { hi: '#8ad870', base: '#4aa040', sh: '#2a7028' };
    rect(ctx, 5, hy - 2, 10, 4, d.base);
    rect(ctx, 4, hy, 2, 11, d.base);
    rect(ctx, 14, hy, 2, 11, d.sh);
    rect(ctx, 6, hy - 2, 4, 1, d.hi);
    [[6, hy - 4], [9, hy - 5], [12, hy - 4]].forEach(([x, y]) => {
      rect(ctx, x, y, 2, 2, '#f8e070');
      dot(ctx, x, y + 2, '#f8e070');
    });
    [[6, hy + 2], [8, hy + 2], [11, hy + 2], [13, hy + 2]].forEach(([x, y]) => dot(ctx, x, y, '#ffffff'));
  } else if (o.hat === 16) {
    // กรวยจราจร
    rect(ctx, 3, hy, 14, 2, '#e85a10');
    rect(ctx, 6, hy - 3, 8, 3, '#f07a20');
    rect(ctx, 7, hy - 6, 6, 3, '#f07a20');
    rect(ctx, 8, hy - 9, 4, 3, '#f07a20');
    rect(ctx, 6, hy - 4, 8, 1, '#ffffff');
    rect(ctx, 8, hy - 7, 4, 1, '#ffffff');
    rect(ctx, 6, hy - 3, 1, 3, '#ffb070');
  } else if (o.hat === 17) {
    // หัวหมาป่าปลอมครอบทั้งหัว (ตาโปน ฟันยิ้มแหยะ)
    const g = { hi: '#a8a4b8', base: '#6a6478', sh: '#46404e' };
    rect(ctx, 4, hy - 2, 12, 13, g.base);
    rect(ctx, 4, hy - 2, 2, 13, g.hi);
    rect(ctx, 14, hy - 2, 2, 13, g.sh);
    rect(ctx, 4, hy - 5, 3, 3, g.base);
    rect(ctx, 13, hy - 5, 3, 3, g.sh);
    rect(ctx, 6, hy + 2, 3, 3, '#ffffff');
    rect(ctx, 11, hy + 2, 3, 3, '#ffffff');
    dot(ctx, 7, hy + 3, '#1a1420');
    dot(ctx, 12, hy + 4, '#1a1420');
    rect(ctx, 7, hy + 6, 6, 3, '#d8d0e0');
    rect(ctx, 9, hy + 6, 2, 1, '#1a1420');
    [[7, hy + 9], [9, hy + 9], [11, hy + 9]].forEach(([x, y]) => dot(ctx, x, y, '#ffffff'));
  }

  // ของติดตัว
  if (o.item === 1) {
    for (let i = 0; i < 7; i++) dot(ctx, 5 + i, ty + i, '#5a3a22');
    rect(ctx, 14, ty + 4, 5, 6, '#8a5a2b');
    rect(ctx, 14, ty + 4, 5, 2, '#b07a40');
    dot(ctx, 17, ty + 6, BUCKLE);
    rect(ctx, 18, ty + 5, 1, 5, '#5a3a1a');
  } else if (o.item === 2) {
    rect(ctx, 5, ty - 1, 10, 3, '#d9b23a');
    rect(ctx, 5, ty - 1, 10, 1, '#f5d870');
    rect(ctx, 12, ty + 2, 3, 5, '#b8932a');
    rect(ctx, 12, ty + 6, 3, 1, '#8a6a1a');
    dot(ctx, 7, ty, '#b8932a');
  } else if (o.item === 3) {
    rect(ctx, 18, 14, 1, 16, '#7a5230');
    rect(ctx, 19, 14, 1, 16, '#5a3a22');
    rect(ctx, 17, 13, 3, 2, '#a3733f');
    dot(ctx, 17, 13, '#d0a060');
  } else if (o.item === 4) {
    // ตะเกียงในมือขวา
    rect(ctx, 17, ty + 7, 1, 2, '#3a2c24');
    rect(ctx, 16, ty + 9, 4, 5, '#3a2c24');
    rect(ctx, 17, ty + 10, 2, 3, '#ffd84a');
    dot(ctx, 17, ty + 10, '#fff6c0');
  } else if (o.item === 5) {
    // ผ้าคลุมไหล่
    rect(ctx, 3, ty, 14, 2, '#7a2a3a');
    rect(ctx, 3, ty, 14, 1, '#a84a5a');
    rect(ctx, 1, ty + 1, 2, 9, '#7a2a3a');
    rect(ctx, 17, ty + 1, 2, 9, '#521a28');
    dot(ctx, 10, ty + 1, BUCKLE);
  } else if (o.item === 6) {
    // ตะกร้าสานถือมือซ้าย
    rect(ctx, 0, ty + 9, 5, 4, '#b08a50');
    rect(ctx, 0, ty + 9, 5, 1, '#d0aa6a');
    dot(ctx, 1, ty + 11, '#8a6a3a');
    dot(ctx, 3, ty + 11, '#8a6a3a');
    rect(ctx, 1, ty + 7, 1, 2, '#8a6a3a');
    rect(ctx, 3, ty + 7, 1, 2, '#8a6a3a');
    dot(ctx, 2, ty + 8, '#e05050');
  } else if (o.item === 7) {
    // สร้อยคอเขี้ยวหมาป่า
    [[6, 0], [7, 1], [8, 2], [12, 2], [13, 1], [14, 0]].forEach(([x, y]) => dot(ctx, x, ty + y, '#c8a060'));
    rect(ctx, 9, ty + 3, 3, 1, '#c8a060');
    rect(ctx, 10, ty + 4, 1, 2, '#f2efe8');
  } else if (o.item === 8) {
    // ดาบอัศวินในมือขวา
    rect(ctx, 18, ty - 4, 1, 13, '#d8e0ec');
    rect(ctx, 19, ty - 3, 1, 12, '#8a92a4');
    dot(ctx, 18, ty - 5, '#ffffff');
    rect(ctx, 16, ty + 9, 4, 1, '#c8962a');
    rect(ctx, 18, ty + 10, 1, 3, '#5a3a22');
    dot(ctx, 18, ty + 13, '#c8962a');
  } else if (o.item === 9) {
    // พิณสะพายหลัง
    rect(ctx, 0, ty + 4, 4, 5, '#a8682a');
    rect(ctx, 0, ty + 4, 4, 1, '#d0904a');
    dot(ctx, 1, ty + 6, '#3a2010');
    rect(ctx, 2, ty - 3, 1, 7, '#6a4020');
    rect(ctx, 1, ty - 4, 3, 1, '#4a2a10');
    [[1, ty + 5], [3, ty + 7]].forEach(([x, y]) => dot(ctx, x, y, '#f2efe8'));
  } else if (o.item === 10) {
    // ไม้กายสิทธิ์ปลายดาว
    rect(ctx, 18, ty + 4, 1, 8, '#5a3a22');
    rect(ctx, 17, ty + 2, 3, 1, '#ffe060');
    rect(ctx, 18, ty + 1, 1, 3, '#ffe060');
    dot(ctx, 18, ty + 2, '#ffffff');
    dot(ctx, 16, ty, '#a0e0ff');
    dot(ctx, 19, ty - 1, '#ffc0f0');
  } else if (o.item === 11) {
    // แมวดำเกาะไหล่ซ้าย
    const cat = '#1a1420';
    rect(ctx, 0, ty - 4, 6, 4, cat);
    dot(ctx, 0, ty - 5, cat);
    dot(ctx, 3, ty - 5, cat);
    dot(ctx, 1, ty - 3, '#f0e040');
    dot(ctx, 3, ty - 3, '#f0e040');
    rect(ctx, 0, ty, 1, 5, cat);
    dot(ctx, 5, ty - 1, '#3a3044');
  } else if (o.item === 12) {
    // ไก่ยางในมือขวา
    rect(ctx, 16, ty + 9, 3, 6, '#f8d840');
    rect(ctx, 16, ty + 7, 3, 2, '#f8d840');
    dot(ctx, 19, ty + 8, '#f07a20');
    dot(ctx, 17, ty + 6, '#e03040');
    dot(ctx, 17, ty + 8, '#1a1420');
    rect(ctx, 16, ty + 15, 1, 2, '#f07a20');
  } else if (o.item === 13) {
    // ปลาเค็มถือหาง
    rect(ctx, 16, ty + 8, 2, 8, '#a8b0c0');
    rect(ctx, 16, ty + 8, 1, 8, '#d8e0ec');
    rect(ctx, 15, ty + 16, 4, 2, '#7a8498');
    dot(ctx, 17, ty + 9, '#1a1420');
    rect(ctx, 15, ty + 6, 4, 2, '#7a8498');
  } else if (o.item === 14) {
    // ป้าย "ฉันไม่ใช่หมาป่า" ชูเหนือหัว
    rect(ctx, 17, ty - 8, 1, 16, '#6a4428');
    rect(ctx, 11, ty - 15, 9, 7, '#f2efe8');
    rect(ctx, 11, ty - 15, 9, 1, '#c8c0b0');
    rect(ctx, 12, ty - 13, 6, 1, '#1a1420');
    rect(ctx, 12, ty - 11, 4, 1, '#e03040');
    dot(ctx, 17, ty - 11, '#1a1420');
  }

  // ใบหน้า
  if (o.face === 1) {
    rect(ctx, 6, hy + 4, 3, 4, '#3a3040');
    rect(ctx, 10, hy + 4, 3, 4, '#3a3040');
    rect(ctx, 7, hy + 5, 1, 2, '#a8d0f0');
    rect(ctx, 11, hy + 5, 1, 2, '#a8d0f0');
    dot(ctx, 7, hy + 6, EYE);
    dot(ctx, 11, hy + 6, EYE);
    dot(ctx, 9, hy + 5, '#3a3040');
  } else if (o.face === 2) {
    rect(ctx, 5, hy + 3, 10, 1, '#1a1420');
    rect(ctx, 10, hy + 4, 3, 3, '#1a1420');
  } else if (o.face === 3) {
    rect(ctx, 7, hy + 8, 6, 1, H.base);
    dot(ctx, 7, hy + 9, H.base);
    dot(ctx, 12, hy + 9, H.base);
    rect(ctx, 8, hy + 8, 4, 1, H.sh);
  } else if (o.face === 4) {
    rect(ctx, 5, hy + 7, 10, 4, '#5a6a7a');
    rect(ctx, 5, hy + 7, 10, 1, '#7a8a9a');
    rect(ctx, 13, hy + 8, 2, 3, '#44525e');
  } else if (o.face === 5) {
    // หน้ากากงานเต้นรำ (ยังเห็นดวงตา)
    rect(ctx, 5, hy + 4, 10, 3, '#7a3aa8');
    rect(ctx, 5, hy + 4, 10, 1, '#e8c040');
    rect(ctx, 7, hy + 5, 1, 2, EYE);
    rect(ctx, 11, hy + 5, 1, 2, EYE);
    dot(ctx, 4, hy + 5, '#e8c040');
    dot(ctx, 15, hy + 5, '#e8c040');
  } else if (o.face === 6) {
    // แผลเป็นยาวที่แก้มขวา
    [[12, hy + 5], [13, hy + 6], [12, hy + 7], [13, hy + 8]].forEach(([x, y]) => dot(ctx, x, y, '#a83a3a'));
  } else if (o.face === 7) {
    // แว่นดำ
    rect(ctx, 6, hy + 5, 3, 2, '#14101a');
    rect(ctx, 10, hy + 5, 3, 2, '#14101a');
    rect(ctx, 9, hy + 5, 1, 1, '#14101a');
    rect(ctx, 5, hy + 5, 1, 1, '#14101a');
    rect(ctx, 13, hy + 5, 2, 1, '#14101a');
    dot(ctx, 7, hy + 5, '#8a8aa0');
    dot(ctx, 11, hy + 5, '#8a8aa0');
  } else if (o.face === 8) {
    // หน้าเหวอ: ตาโตคนละขนาด แลบลิ้น
    rect(ctx, 6, hy + 4, 3, 3, '#ffffff');
    rect(ctx, 11, hy + 5, 2, 2, '#ffffff');
    dot(ctx, 7, hy + 5, EYE);
    dot(ctx, 12, hy + 6, EYE);
    rect(ctx, 9, hy + 8, 3, 1, '#5a2a2a');
    rect(ctx, 10, hy + 9, 2, 1, '#f07a8a');
  } else if (o.face === 9) {
    // จมูกแดงกลมแบบตัวตลก
    rect(ctx, 9, hy + 6, 3, 3, '#e03040');
    dot(ctx, 9, hy + 6, '#ff8a8a');
    rect(ctx, 6, hy + 9, 8, 1, '#e03040');
  }

  outline(ctx, CHAR_W, CHAR_H, LINE);
  return c;
}

// สร้างเท็กซ์เจอร์และอนิเมชั่นของชุดนี้ (สร้างครั้งเดียว ใช้ซ้ำได้)
export function ensureCharacter(scene, outfit) {
  const key = outfitKey(outfit);
  if (!scene.textures.exists(key)) {
    addSheet(scene, key, [0, 1, 2, 3, 4].map((f) => drawFrame(outfit, f)), CHAR_W, CHAR_H);
  }
  const anims = scene.anims;
  if (!anims.exists(key + '_idle')) {
    anims.create({
      key: key + '_idle',
      frames: [
        { key, frame: 0, duration: 700 },
        { key, frame: 1, duration: 500 },
        { key, frame: 0, duration: 900 },
        { key, frame: 2, duration: 120 },
        { key, frame: 0, duration: 600 },
        { key, frame: 1, duration: 500 },
      ],
      repeat: -1,
    });
    anims.create({
      key: key + '_walk',
      frames: [
        { key, frame: 3, duration: 160 },
        { key, frame: 0, duration: 120 },
        { key, frame: 4, duration: 160 },
        { key, frame: 0, duration: 120 },
      ],
      repeat: -1,
    });
  }
  return key;
}

export function addCharacter(scene, x, y, outfit, scale = 2) {
  const key = ensureCharacter(scene, outfit);
  const s = scene.add.sprite(x, y, key, 0).setOrigin(0.5, 1).setScale(scale);
  s.play({ key: key + '_idle', startFrame: Math.floor(Math.random() * 4) });
  return s;
}

export function setCharacterOutfit(sprite, outfit) {
  const key = ensureCharacter(sprite.scene, outfit);
  sprite.setTexture(key, 0);
  sprite.play(key + '_idle');
}
