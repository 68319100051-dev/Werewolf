// ทดสอบกระเป๋าเงิน + ตู้กาชา + ของกาชาเป็นเบาะแส: node tools/test-wallet.js
const wallet = require('../server/wallet');
const { CATALOG, RARITY } = require('../server/catalog');
const { makeClue } = require('../server/game');

let passed = 0;
let failed = 0;
const check = (name, cond, extra = '') => {
  cond ? passed++ : failed++;
  console.log(`${cond ? 'ผ่าน' : 'ไม่ผ่าน'}  ${name}${extra ? '  ' + extra : ''}`);
};
// สุ่มแบบกำหนดได้ (ทดสอบซ้ำได้ผลเดิม)
const seeded = (seed) => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

// กระเป๋าใหม่
const w = wallet.load(null);
check('กระเป๋าใหม่ได้เหรียญเริ่มต้น', w.coins === wallet.START_COINS && w.items.length === 0);
const v = wallet.view(w);
check('ส่งโทเคนที่ลงลายเซ็นให้เบราว์เซอร์', typeof v.token === 'string' && v.token.includes('.'));

// แก้ตัวเลขเอง = ใช้ไม่ได้
const [body, sig] = v.token.split('.');
const hacked = JSON.parse(Buffer.from(body, 'base64url').toString());
hacked.coins = 999999;
const fake = Buffer.from(JSON.stringify(hacked)).toString('base64url') + '.' + sig;
check('แก้เหรียญเองในเครื่อง = ลายเซ็นไม่ตรง ใช้ไม่ได้', wallet.open(fake) === null);
check('โทเคนมั่ว = เปิดกระเป๋าใหม่', wallet.load('xxx.yyy').uid !== w.uid);

// รางวัลหลังเกม
const r1 = wallet.reward(w, { won: true, alive: true });
check('ตาแรกของวันได้โบนัส', r1.parts.some(([l]) => l === 'ตาแรกของวัน') && r1.total === 10 + 15 + 5 + 50);
const r2 = wallet.reward(w, { won: false, alive: false });
check('ตาต่อไปไม่ได้โบนัสซ้ำ แพ้ได้ค่าเล่นอย่างเดียว', r2.total === 10);

// ย้อนกลับไปใช้กระเป๋าฉบับเก่า (เหรียญเยอะกว่า) ไม่ได้
const old = v.token;
const spent = wallet.roll(w, 'outfit', 1, seeded(1));
check('หมุน 1 ครั้งหัก 100 เหรียญ', spent.ok && spent.results.length === 1);
const again = wallet.load(old);
check('เอาโทเคนเก่ามาใช้ = ได้ฉบับล่าสุดแทน', again === w && again.n > 0);
const fromNew = wallet.load(wallet.view(w).token);
check('โหลดฉบับล่าสุดได้กระเป๋าเดิม (หลายแท็บใช้ร่วมกัน)', fromNew === w);

// เหรียญไม่พอ
const poor = wallet.load(null);
poor.coins = 50;
check('เหรียญไม่พอหมุนไม่ได้', !wallet.roll(poor, 'outfit', 1).ok && poor.coins === 50);
check('หมุนจำนวนแปลก ๆ ไม่ได้', !wallet.roll(w, 'outfit', 3).ok);

// หมุน 10 ครั้ง: การันตีล้ำค่า
let ok10 = true;
for (let s = 1; s <= 200; s++) {
  const t = wallet.load(null);
  t.coins = 900;
  const r = wallet.roll(t, 'outfit', 10, seeded(s));
  if (!r.ok || r.results.length !== 10 || r.results.every((x) => x.rarity === 'rare') || t.coins < 0) ok10 = false;
}
check('หมุน 10 ครั้ง ได้ล้ำค่าขึ้นไปอย่างน้อย 1 ชิ้นทุกครั้ง (ลอง 200 รอบ)', ok10);

// การันตีตำนาน
const p = wallet.load(null);
p.coins = 100000;
let gotLegend = false;
for (let i = 0; i < wallet.PITY; i++) {
  const r = wallet.roll(p, 'outfit', 1, () => 0.01); // สุ่มได้แต่ระดับหายากตลอด
  if (r.results[0].rarity === 'legendary') gotLegend = i + 1;
}
check(`หมุนครบ ${wallet.PITY} ครั้งได้ตำนานแน่นอน`, gotLegend === wallet.PITY, `ได้ครั้งที่ ${gotLegend}`);

// ของซ้ำคืนเหรียญ
const d = wallet.load(null);
d.items = CATALOG.filter((it) => it.box === 'outfit' && it.rarity === 'rare').map((it) => it.id);
d.coins = 100;
const dr = wallet.roll(d, 'outfit', 1, () => 0.01);
check('ได้ของซ้ำ คืนเหรียญตามระดับ', dr.results[0].dup && d.coins === RARITY.rare.refund);

// สุ่มเยอะ ๆ อัตราใกล้ค่าที่ประกาศ
const big = wallet.load(null);
big.coins = 10 ** 9;
const count = { rare: 0, epic: 0, legendary: 0 };
const rnd = seeded(42);
for (let i = 0; i < 2000; i++) wallet.roll(big, 'outfit', 10, rnd).results.forEach((x) => count[x.rarity]++);
for (const b of ['meme', 'emote', 'plate']) for (let i = 0; i < 300; i++) wallet.roll(big, b, 10, rnd);
const pct = (k) => (count[k] / 200).toFixed(1);
check('อัตราออกจริงใกล้ที่ประกาศ', Math.abs(count.legendary / 20000 - 0.04) < 0.02 && Math.abs(count.epic / 20000 - 0.21) < 0.04, `หายาก ${pct('rare')}% ล้ำค่า ${pct('epic')}% ตำนาน ${pct('legendary')}%`);
check('หมุนพอแล้วได้ครบทุกชิ้น', big.items.length === CATALOG.length);

// ใส่ของที่มีเท่านั้น
check('ชุดฟรีใส่ได้เสมอ', wallet.owns(null, 'hat', 7));
check('ของกาชาที่ไม่มีใส่ไม่ได้', !wallet.owns(poor, 'hat', 12));
check('ของกาชาที่มีใส่ได้', wallet.owns(big, 'hat', 12));

// ของกาชาเป็นเบาะแสได้
const crownClues = new Set();
for (let i = 0; i < 400; i++) {
  const c = makeClue({ hat: 12, hair: 11, shirt: 11, item: 11, face: 7, skin: 0 }, false);
  crownClues.add(c.text);
}
const all = [...crownClues].join(' | ');
check('ของกาชามีข้อความเบาะแสครบทุกส่วน', ['มงกุฎทองคำ', 'ม่วงประกายดาว', 'แดงขลิบทอง', 'แมวดำ', 'แว่นดำ'].every((k) => all.includes(k)) && !all.includes('undefined'), `${crownClues.size} แบบ`);

// แยกตู้: ได้ของเฉพาะตู้นั้น การันตีนับแยก
const m = wallet.load(null);
m.coins = 900;
const mr = wallet.roll(m, 'emote', 10, seeded(7));
check('ตู้อีโมตได้แต่อีโมต', mr.ok && mr.results.every((r) => CATALOG.find((it) => it.id === r.id).kind === 'emote'));
check('การันตีนับแยกตู้', m.pity.emote > 0 && m.pity.outfit === 0 && m.pity.meme === 0 && m.pity.plate === 0);
check('ตู้ที่ไม่มีจริงหมุนไม่ได้', !wallet.roll(m, 'nope', 1).ok);

// อีโมต/ป้ายชื่อ ต้องมีถึงใช้ได้
check('อีโมตพื้นฐานใช้ได้ทุกคน', wallet.ownsEmote(null, 'laugh'));
check('อีโมตกาชาที่ไม่มีใช้ไม่ได้', !wallet.ownsEmote(poor, 'howl'));
check('อีโมตกาชาที่มีใช้ได้', wallet.ownsEmote(big, 'howl'));
check('ป้ายธรรมดาใช้ได้ทุกคน / ป้ายกาชาต้องมี', wallet.ownsPlate(null, null) && !wallet.ownsPlate(poor, 'gold') && wallet.ownsPlate(big, 'gold'));
check('หมุนทุกตู้พอแล้วได้ครบทุกชิ้นทุกตู้', big.items.length === CATALOG.length, `${big.items.length}/${CATALOG.length}`);

// ชุดฮาเป็นเบาะแสได้
const memeClues = new Set();
for (let i = 0; i < 400; i++) memeClues.add(makeClue({ hat: 17, hair: 0, shirt: 13, item: 14, face: 9, skin: 0 }, false).text);
const mall = [...memeClues].join(' | ');
check('ชุดฮามีข้อความเบาะแส', ['หมาป่าปลอม', 'เหลืองขนฟู', 'ฉันไม่ใช่หมาป่า', 'จมูกแดง'].every((k) => mall.includes(k)) && !mall.includes('undefined'));

console.log(`\nรวม: ผ่าน ${passed}  ไม่ผ่าน ${failed}`);
process.exit(failed ? 1 : 0);
