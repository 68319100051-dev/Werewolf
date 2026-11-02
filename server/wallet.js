// กระเป๋าเงิน + ตู้กาชา (นอกเกม)
// ไม่มีฐานข้อมูล: กระเป๋าเก็บในเบราว์เซอร์ของผู้เล่น แต่เซิร์ฟเวอร์ลงลายเซ็น (HMAC) ไว้ แก้ตัวเลขเองไม่ได้
// เซิร์ฟเวอร์จำฉบับล่าสุดของแต่ละกระเป๋าไว้ในหน่วยความจำ กันการเอาฉบับเก่า (เหรียญเยอะกว่า) กลับมาใช้
const crypto = require('crypto');
const { BASE_SIZE, RARITY, BOXES, CATALOG, BY_ID, itemAt, BASE_EMOTES } = require('./catalog');

const SECRET = process.env.WALLET_SECRET || 'pixel-werewolf-dev-secret';
const START_COINS = Number(process.env.START_COINS || 300); // ปรับได้ตอนทดสอบ (เปิดเซิร์ฟเวอร์ทดสอบด้วย START_COINS=...)
const PRICE = { 1: 100, 10: 900 };
const PITY = 40; // หมุนครบเท่านี้ยังไม่ได้ระดับตำนาน = การันตีครั้งถัดไป
const REWARD = { play: 10, win: 15, survive: 5, daily: 50 };

const live = new Map(); // uid -> กระเป๋าฉบับล่าสุดที่เซิร์ฟเวอร์รู้

const emptyPity = () => Object.fromEntries(Object.keys(BOXES).map((b) => [b, 0]));

function today() {
  // วันที่ตามเวลาไทย (โบนัสเล่นตาแรกของวัน)
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function sign(w) {
  const body = Buffer.from(JSON.stringify(w)).toString('base64url');
  return body + '.' + crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
}

function valid(w) {
  return (
    w && w.v === 1 && typeof w.uid === 'string' && w.uid.length <= 64 &&
    Number.isInteger(w.coins) && w.coins >= 0 && w.pity && Object.keys(BOXES).every((b) => Number.isInteger(w.pity[b]) && w.pity[b] >= 0) &&
    Number.isInteger(w.n) && w.n >= 0 && typeof w.daily === 'string' &&
    Array.isArray(w.items) && w.items.every((id) => BY_ID[id])
  );
}

function open(token) {
  if (typeof token !== 'string' || token.length > 4000) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const good = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try {
    const w = JSON.parse(Buffer.from(body, 'base64url').toString());
    return valid(w) ? w : null;
  } catch {
    return null;
  }
}

// โหลดกระเป๋าจากโทเคนที่เบราว์เซอร์ส่งมา (ไม่มี/ปลอม = เปิดกระเป๋าใหม่)
// หลายแท็บที่ใช้กระเป๋าใบเดียวกันจะได้ออบเจกต์เดียวกัน เหรียญจะได้ไม่แยกกัน
function load(token) {
  const w = open(token);
  if (w) {
    const known = live.get(w.uid);
    if (known && known.n >= w.n) return known;
    live.set(w.uid, w);
    return w;
  }
  const fresh = { v: 1, uid: crypto.randomUUID(), coins: START_COINS, items: [], pity: emptyPity(), n: 0, daily: '' };
  live.set(fresh.uid, fresh);
  return fresh;
}

function view(w, extra = {}) {
  return { coins: w.coins, items: [...w.items], pity: { ...w.pity }, pityMax: PITY, daily: w.daily === today(), token: sign(w), ...extra };
}

// อีโมต/ป้ายชื่อจากตู้กาชา (อีโมตพื้นฐาน + ป้ายธรรมดาใช้ได้ทุกคน)
function ownsEmote(w, key) {
  if (BASE_EMOTES.includes(key)) return true;
  const it = CATALOG.find((x) => x.kind === 'emote' && x.key === key);
  return !!(w && it && w.items.includes(it.id));
}

function ownsPlate(w, key) {
  if (!key) return true;
  const it = CATALOG.find((x) => x.kind === 'plate' && x.key === key);
  return !!(w && it && w.items.includes(it.id));
}

function owns(w, part, value) {
  if (value < (BASE_SIZE[part] ?? 0)) return true;
  const it = itemAt(part, value);
  return !!(w && it && w.items.includes(it.id));
}

// รางวัลหลังจบเกม 1 ตา
function reward(w, { won, alive }) {
  const parts = [['เล่นจบ 1 ตา', REWARD.play]];
  if (won) parts.push(['ชนะ', REWARD.win]);
  if (alive) parts.push(['รอดถึงจบ', REWARD.survive]);
  if (w.daily !== today()) {
    parts.push(['ตาแรกของวัน', REWARD.daily]);
    w.daily = today();
  }
  const total = parts.reduce((s, [, n]) => s + n, 0);
  w.coins += total;
  w.n++;
  return { total, parts };
}

function pickRarity(rnd) {
  let r = rnd() * Object.values(RARITY).reduce((s, x) => s + x.weight, 0);
  for (const [k, x] of Object.entries(RARITY)) {
    r -= x.weight;
    if (r < 0) return k;
  }
  return 'rare';
}

// หมุนกาชาตู้ box 1 หรือ 10 ครั้ง (10 ครั้งการันตีระดับล้ำค่าขึ้นไปอย่างน้อย 1 ชิ้น)
function roll(w, box, count, rnd = Math.random) {
  if (!BOXES[box]) return { ok: false, error: 'ไม่มีตู้นี้' };
  if (!PRICE[count]) return { ok: false, error: 'หมุนได้ครั้งละ 1 หรือ 10' };
  if (w.coins < PRICE[count]) return { ok: false, error: 'เหรียญไม่พอ' };
  w.coins -= PRICE[count];
  const results = [];
  for (let i = 0; i < count; i++) {
    w.pity[box]++;
    let rarity = pickRarity(rnd);
    if (w.pity[box] >= PITY) rarity = 'legendary';
    if (count === 10 && i === 9 && rarity === 'rare' && results.every((r) => r.rarity === 'rare')) rarity = 'epic';
    if (rarity === 'legendary') w.pity[box] = 0;
    // ในระดับเดียวกัน ของที่ยังไม่มีออกง่ายกว่า (ไม่ต้องหมุนซ้ำ ๆ นานเกินไป)
    const pool = CATALOG.filter((it) => it.box === box && it.rarity === rarity);
    const fresh = pool.filter((it) => !w.items.includes(it.id));
    const from = fresh.length && rnd() < 0.7 ? fresh : pool;
    const it = from[Math.floor(rnd() * from.length)];
    const dup = w.items.includes(it.id);
    const refund = dup ? RARITY[rarity].refund : 0;
    if (dup) w.coins += refund;
    else w.items.push(it.id);
    results.push({ id: it.id, rarity, dup, refund });
  }
  w.n++;
  return { ok: true, results };
}

module.exports = { load, open, sign, view, owns, ownsEmote, ownsPlate, reward, roll, today, PRICE, PITY, START_COINS, REWARD, _live: live };
