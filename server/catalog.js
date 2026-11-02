// ของแต่งตัวจากตู้กาชา: ต่อท้ายชุดพื้นฐาน (เลขลำดับถัดจากชุดฟรี) ใส่แล้วเป็นเบาะแสในเกมได้เหมือนชุดปกติ
// ไฟล์นี้เป็นต้นฉบับเดียว เบราว์เซอร์โหลดผ่าน /catalog.js (server/index.js แปลงเป็นโมดูลให้)

// จำนวนชุดฟรีของแต่ละส่วน (ค่า 0..ขนาด-1 ใช้ได้ทุกคน ที่เกินจากนี้ต้องได้จากกาชา)
const BASE_SIZE = { hat: 8, hair: 8, shirt: 8, item: 8, face: 5, skin: 5 };

const RARITY = {
  rare: { name: 'หายาก', weight: 75, refund: 20, color: '#6ab0f0' },
  epic: { name: 'ล้ำค่า', weight: 21, refund: 50, color: '#c080f0' },
  legendary: { name: 'ตำนาน', weight: 4, refund: 150, color: '#f0c040' },
};

// clue = ข้อความเบาะแสตอนคนเห็นคนร้าย (หมวก/ของ/หน้า) · color = ชื่อสี (ผม/เสื้อ) · tone = เสื้อสีสด/สีเข้ม
const OUTFIT_ITEMS = [
  { id: 'hat_witch', part: 'hat', value: 8, name: 'หมวกแม่มด', rarity: 'rare', clue: 'สวมหมวกแม่มดปลายแหลม' },
  { id: 'hat_bunny', part: 'hat', value: 9, name: 'หูกระต่าย', rarity: 'rare', clue: 'มีหูกระต่ายตั้งชันอยู่บนหัว' },
  { id: 'hat_pumpkin', part: 'hat', value: 10, name: 'หัวฟักทอง', rarity: 'epic', clue: 'สวมหัวฟักทองแกะสลัก' },
  { id: 'hat_wolf', part: 'hat', value: 11, name: 'หูหมาป่า', rarity: 'epic', clue: 'มีหูหมาป่าขนฟูอยู่บนหัว' },
  { id: 'hat_crown', part: 'hat', value: 12, name: 'มงกุฎทองคำ', rarity: 'legendary', clue: 'สวมมงกุฎทองคำแวววาว' },
  { id: 'hair_silver', part: 'hair', value: 8, name: 'ผมเงิน', rarity: 'rare', color: 'เงินยวง' },
  { id: 'hair_emerald', part: 'hair', value: 9, name: 'ผมเขียวมรกต', rarity: 'rare', color: 'เขียวมรกต' },
  { id: 'hair_fire', part: 'hair', value: 10, name: 'ผมเปลวไฟ', rarity: 'epic', color: 'ส้มเปลวไฟ' },
  { id: 'hair_galaxy', part: 'hair', value: 11, name: 'ผมกาแล็กซี', rarity: 'legendary', color: 'ม่วงประกายดาว' },
  { id: 'shirt_pink', part: 'shirt', value: 8, name: 'เสื้อชมพูพาสเทล', rarity: 'rare', color: 'ชมพูอ่อน', tone: 'สีสด' },
  { id: 'shirt_emerald', part: 'shirt', value: 9, name: 'เสื้อเขียวมรกต', rarity: 'rare', color: 'เขียวมรกต', tone: 'สีเข้ม' },
  { id: 'shirt_armor', part: 'shirt', value: 10, name: 'ชุดเกราะอัศวิน', rarity: 'epic', color: 'เงินวาวของเกราะ', tone: 'สีสด' },
  { id: 'shirt_royal', part: 'shirt', value: 11, name: 'ชุดคลุมราชา', rarity: 'legendary', color: 'แดงขลิบทอง', tone: 'สีสด' },
  { id: 'item_sword', part: 'item', value: 8, name: 'ดาบอัศวิน', rarity: 'rare', clue: 'เห็นประกายดาบวาบในมือคนร้าย' },
  { id: 'item_lute', part: 'item', value: 9, name: 'พิณนักเดินทาง', rarity: 'epic', clue: 'ได้ยินเสียงสายพิณดังแว่ว ๆ' },
  { id: 'item_wand', part: 'item', value: 10, name: 'ไม้กายสิทธิ์', rarity: 'epic', clue: 'เห็นแสงวิบวับจากไม้กายสิทธิ์' },
  { id: 'item_cat', part: 'item', value: 11, name: 'แมวดำบนไหล่', rarity: 'legendary', clue: 'มีแมวดำเกาะอยู่บนไหล่คนร้าย' },
  { id: 'face_mask', part: 'face', value: 5, name: 'หน้ากากงานเต้นรำ', rarity: 'rare', clue: 'คนร้ายสวมหน้ากากปิดรอบดวงตา' },
  { id: 'face_scar', part: 'face', value: 6, name: 'แผลเป็นที่แก้ม', rarity: 'rare', clue: 'คนร้ายมีแผลเป็นยาวที่แก้ม' },
  { id: 'face_shades', part: 'face', value: 7, name: 'แว่นดำ', rarity: 'epic', clue: 'คนร้ายใส่แว่นดำมืดทึบ' },
];

// ตู้ชุดฮา: ชุดตลก ๆ ใส่แล้วเป็นเบาะแสได้เหมือนกัน (ยิ่งฮายิ่งเด่น)
const MEME_ITEMS = [
  { id: 'hat_chicken', part: 'hat', value: 13, name: 'หัวไก่', rarity: 'epic', clue: 'สวมหัวไก่มีหงอนแดง' },
  { id: 'hat_bag', part: 'hat', value: 14, name: 'ถุงกระดาษคลุมหัว', rarity: 'rare', clue: 'เอาถุงกระดาษคลุมหัวไว้' },
  { id: 'hat_dino', part: 'hat', value: 15, name: 'ฮู้ดไดโนเสาร์', rarity: 'epic', clue: 'สวมฮู้ดไดโนเสาร์สีเขียว' },
  { id: 'hat_cone', part: 'hat', value: 16, name: 'กรวยจราจร', rarity: 'rare', clue: 'มีกรวยจราจรสีส้มครอบหัว' },
  { id: 'hat_wolfmask', part: 'hat', value: 17, name: 'หัวหมาป่าปลอม', rarity: 'legendary', clue: 'สวมหัวหมาป่าปลอมทั้งหัว' },
  { id: 'shirt_flower', part: 'shirt', value: 12, name: 'เสื้อลายดอก', rarity: 'rare', color: 'ฟ้าลายดอกไม้', tone: 'สีสด' },
  { id: 'shirt_chicken', part: 'shirt', value: 13, name: 'ชุดตัวไก่', rarity: 'epic', color: 'เหลืองขนฟู', tone: 'สีสด' },
  { id: 'item_rubberchicken', part: 'item', value: 12, name: 'ไก่ยาง', rarity: 'rare', clue: 'ได้ยินเสียงไก่ยางร้องแอ๊ด' },
  { id: 'item_fish', part: 'item', value: 13, name: 'ปลาเค็มในมือ', rarity: 'rare', clue: 'ได้กลิ่นปลาเค็มติดตัวคนร้าย' },
  { id: 'item_sign', part: 'item', value: 14, name: 'ป้ายฉันไม่ใช่หมาป่า', rarity: 'legendary', clue: 'คนร้ายถือป้ายเขียนว่า "ฉันไม่ใช่หมาป่า"' },
  { id: 'face_derp', part: 'face', value: 8, name: 'หน้าเหวอ', rarity: 'rare', clue: 'คนร้ายทำหน้าเหวอตาโต' },
  { id: 'face_clown', part: 'face', value: 9, name: 'จมูกตัวตลก', rarity: 'epic', clue: 'คนร้ายมีจมูกแดงกลมแบบตัวตลก' },
];

// ตู้อีโมต: ท่าทางเพิ่ม (กดใช้ได้เลยเมื่อได้มา)
const EMOTE_ITEMS = [
  { id: 'em_love', key: 'love', name: 'ตาหัวใจ', rarity: 'rare' },
  { id: 'em_zzz', key: 'zzz', name: 'ง่วง', rarity: 'rare' },
  { id: 'em_sus', key: 'sus', name: 'ตาเหล่สงสัย', rarity: 'rare' },
  { id: 'em_sweat', key: 'sweat', name: 'เหงื่อตก', rarity: 'rare' },
  { id: 'em_cool', key: 'cool', name: 'แว่นเท่', rarity: 'epic' },
  { id: 'em_popcorn', key: 'popcorn', name: 'กินป๊อปคอร์นดูดราม่า', rarity: 'epic' },
  { id: 'em_party', key: 'party', name: 'ปาร์ตี้', rarity: 'epic' },
  { id: 'em_skull', key: 'skull', name: 'ตายแล้ว', rarity: 'epic' },
  { id: 'em_firework', key: 'firework', name: 'พลุ', rarity: 'legendary' },
  { id: 'em_howl', key: 'howl', name: 'หอนใส่พระจันทร์', rarity: 'legendary' },
];

// ตู้ป้ายชื่อ: กรอบป้ายชื่อใต้ตัวละคร (fill = พื้น · line = ขอบ · text = สีชื่อ · deco = ลายประดับ)
const PLATE_ITEMS = [
  { id: 'plate_wood', key: 'wood', name: 'ป้ายไม้', rarity: 'rare', fill: '#6a4428', line: '#a8783a', text: '#f3ead2' },
  { id: 'plate_leaf', key: 'leaf', name: 'ป้ายใบไม้', rarity: 'rare', fill: '#2a5a30', line: '#6ab85a', text: '#e8f8d8', deco: 'leaf' },
  { id: 'plate_sky', key: 'sky', name: 'ป้ายฟ้าใส', rarity: 'rare', fill: '#2a5a98', line: '#8ac8f0', text: '#ffffff' },
  { id: 'plate_candy', key: 'candy', name: 'ป้ายลูกกวาด', rarity: 'rare', fill: '#b04a78', line: '#ffc0d8', text: '#ffffff', deco: 'heart' },
  { id: 'plate_night', key: 'night', name: 'ป้ายคืนดาว', rarity: 'epic', fill: '#141038', line: '#7a6ad8', text: '#d8d0ff', deco: 'star' },
  { id: 'plate_blood', key: 'blood', name: 'ป้ายรอยเลือด', rarity: 'epic', fill: '#3a0a10', line: '#c0303a', text: '#ffb0b0', deco: 'drip' },
  { id: 'plate_paw', key: 'paw', name: 'ป้ายรอยเท้าหมาป่า', rarity: 'epic', fill: '#2a2632', line: '#a8a4b8', text: '#f2efe8', deco: 'paw' },
  { id: 'plate_gold', key: 'gold', name: 'ป้ายทองคำ', rarity: 'legendary', fill: '#5a3a08', line: '#f0c040', text: '#fff0a0', deco: 'shine' },
  { id: 'plate_fire', key: 'fire', name: 'ป้ายเปลวไฟ', rarity: 'legendary', fill: '#3a0e04', line: '#f06a20', text: '#ffe070', deco: 'flame' },
];

// ตู้ทั้ง 4 ใช้เหรียญกองเดียวกัน แต่นับการันตีแยกกัน
const BOXES = {
  outfit: { name: 'ชุดแต่งตัว', color: '#a82a34' },
  meme: { name: 'ชุดฮา', color: '#d08a20' },
  emote: { name: 'อีโมต', color: '#3a7ab8' },
  plate: { name: 'ป้ายชื่อ', color: '#6a3e98' },
};

const CATALOG = [
  ...OUTFIT_ITEMS.map((it) => ({ ...it, box: 'outfit', kind: 'outfit' })),
  ...MEME_ITEMS.map((it) => ({ ...it, box: 'meme', kind: 'outfit' })),
  ...EMOTE_ITEMS.map((it) => ({ ...it, box: 'emote', kind: 'emote' })),
  ...PLATE_ITEMS.map((it) => ({ ...it, box: 'plate', kind: 'plate' })),
];

const BY_ID = Object.fromEntries(CATALOG.map((it) => [it.id, it]));
const itemAt = (part, value) => CATALOG.find((it) => it.kind === 'outfit' && it.part === part && it.value === value) || null;
const BASE_EMOTES = ['wave', 'laugh', 'angry', 'what', 'cry', 'shock'];

module.exports = { BASE_SIZE, RARITY, BOXES, CATALOG, BY_ID, itemAt, BASE_EMOTES };
