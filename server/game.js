// เครื่องยนต์เกม: บทบาท / กลางวัน (การ์ด + ซุ่ม) / กลางคืน / ประชุม / โหวต / เงื่อนไขชนะ
// เซิร์ฟเวอร์เป็นผู้ตัดสินทุกอย่าง ผู้เล่นแต่ละคนได้เห็นเฉพาะข้อมูลที่ตัวเองควรรู้

const SPEED = Number(process.env.GAME_SPEED || 1); // ใช้เร่งเวลาตอนทดสอบ
// ตัวเลขสมดุล (ปรับผ่าน env ได้ตอนจำลองเกมด้วย tools/sim.js)
const BALANCE = {
  firstNightKill: process.env.FIRST_NIGHT_KILL === '1', // คืนแรกหมาป่ายังไม่ล่า ให้ทุกคนได้ใช้เบาะแสก่อน
  barPerHead: Number(process.env.BAR_PER_HEAD || 2.2), // แต้มเควสต่อชาวบ้าน 1 คนต่อวัน
};

const LOCATIONS = {
  forest: { name: 'ป่าลึก', points: 3 },
  well: { name: 'บ่อน้ำ', points: 2 },
  farm: { name: 'ทุ่งนา', points: 2 },
  church: { name: 'โบสถ์', points: 1 },
  tavern: { name: 'โรงเตี๊ยม', points: 1 },
};
const LOC_KEYS = Object.keys(LOCATIONS);

const ROLES = {
  alpha: { name: 'จ่าฝูงหมาป่า', team: 'wolf' },
  wolf: { name: 'หมาป่า', team: 'wolf' },
  seer: { name: 'หมอดู', team: 'village' },
  doctor: { name: 'หมอ', team: 'village' },
  hunter: { name: 'นายพราน', team: 'village' },
  detective: { name: 'นักสืบ', team: 'village' },
  jester: { name: 'คนบ้า', team: 'neutral' },
  watchman: { name: 'คนเฝ้ายาม', team: 'village' },
  guard: { name: 'ทหารยาม', team: 'village' },
  priest: { name: 'นักบวช', team: 'village' },
  gravedigger: { name: 'สัปเหร่อ', team: 'village' },
  farmer: { name: 'ชาวนา', team: 'village' },
  woodcutter: { name: 'คนตัดไม้', team: 'village' },
  cupid: { name: 'กามเทพ', team: 'village' },
  shadow: { name: 'หมาป่าเงา', team: 'wolf' },
  traitor: { name: 'คนทรยศ', team: 'wolf' },
  villager: { name: 'ชาวบ้าน', team: 'village' },
};

const HAT = ['ไม่ได้สวมอะไรบนหัว', 'สวมหมวกฟาง', 'สวมฮู้ด', 'โพกผ้าสีแดง', 'สวมหมวกไหมพรมมีพู่', 'สวมมงกุฎดอกไม้', 'สวมหมวกปักขนนกแดง', 'สวมหมวกปีกกว้างสีดำ'];
const HAIR = ['ดำ', 'น้ำตาล', 'แดง', 'ขาว', 'ทอง', 'ม่วง', 'ชมพู', 'ฟ้า'];
const SHIRT = ['แดง', 'น้ำเงิน', 'เขียว', 'น้ำตาล', 'ม่วง', 'เหลือง', 'ดำ', 'ขาว'];
const SHIRT_TONE = ['สีสด', 'สีเข้ม', 'สีสด', 'สีเข้ม', 'สีเข้ม', 'สีสด', 'สีเข้ม', 'สีสด'];
const ITEM = [
  'คนร้ายมือเปล่า ไม่มีของติดตัว',
  'ได้ยินเสียงกระเป๋ากระทบตัวคนร้าย',
  'เห็นชายผ้าพันคอสีเหลืองปลิวไหว',
  'ได้ยินเสียงไม้เท้ากระทบพื้น',
  'เห็นแสงตะเกียงแกว่งไปมาในมือคนร้าย',
  'เห็นผ้าคลุมสีแดงเข้มสะบัด',
  'เห็นตะกร้าสานหล่นอยู่ใกล้ ๆ',
  'ได้ยินเสียงสร้อยเขี้ยวกระทบกันกรุ๊งกริ๊ง',
];
const FACE = [
  'เห็นหน้าคนร้ายแวบหนึ่ง ไม่มีอะไรปิดหน้า',
  'เห็นแสงสะท้อนจากแว่นตาของคนร้าย',
  'คนร้ายมีผ้าปิดตาข้างหนึ่ง',
  'คนร้ายมีหนวดเฟิ้ม',
  'คนร้ายใช้ผ้าปิดปากไว้',
];

// สถานการณ์ประจำวัน: สุ่มทุกเช้า แต่ละอันปรับกติกานิดเดียว
const EVENTS = {
  normal: { weight: 3 },
  sunny: { weight: 1 },
  rain: { weight: 1 },
  fog: { weight: 1 },
  festival: { weight: 1 },
  drought: { weight: 1 },
  harvest: { weight: 1 },
  bell: { weight: 1 },
  fullmoon: { weight: 1, notFirstDay: true },
  merchant: { weight: 1 },
};

function rollEvent(day, last) {
  const pool = Object.entries(EVENTS).filter(([k, e]) => k !== last && !(e.notFirstDay && day === 1));
  const total = pool.reduce((sum, [, e]) => sum + e.weight, 0);
  let r = Math.random() * total;
  for (const [k, e] of pool) {
    r -= e.weight;
    if (r <= 0) return k;
  }
  return 'normal';
}

const LURK_SCORE = 0.6;
const FRAME_REACH = 2; // ข่าวลือใส่ร้ายไปถึงชาวบ้านกี่คน

const DUR = {
  intro: 8000,
  work: 22000,
  dayResult: 9000,
  ambushResultBonus: 4000,
  night: 30000,
  dawn: 7000,
  hunter: 15000,
  vote: 30000,
  voteResult: 8000,
};

// ไล่ล่าสด: เหยื่อวิ่งหนี จ่าฝูงไล่ คนที่อยู่ตรงนั้นช่วยได้
// dist = ระยะห่าง 0..100 (0 = ถูกจับ, 100 = หนีถึงหมู่บ้าน) หมดเวลาแล้วยังห่างเกิน safe = รอด
const CHASE = {
  countdown: 2500,
  run: 10000,
  linger: 1800,
  start: 40,
  safe: 30,
  step: 1.6,
  reach: 22,
  stumble: 18,
  help: 7,
  helpCooldown: 1400,
  trip: 12,
  jumpEarly: 380,
  jumpLate: 450,
  minGap: 65,
};

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PART_NAME = { hat: 'หมวก', hair: 'สีผม', shirt: 'สีเสื้อ', item: 'ของติดตัว', face: 'ใบหน้า' };
const PART_VALUE = {
  hat: ['ไม่สวมอะไร', 'หมวกฟาง', 'ฮู้ด', 'ผ้าโพก', 'หมวกไหมพรม', 'มงกุฎดอกไม้', 'หมวกขนนก', 'หมวกปีกกว้าง'],
  hair: HAIR,
  shirt: SHIRT,
  item: ['ไม่มี', 'กระเป๋า', 'ผ้าพันคอ', 'ไม้เท้า', 'ตะเกียง', 'ผ้าคลุม', 'ตะกร้า', 'สร้อยเขี้ยว'],
  face: ['ไม่มี', 'แว่นตา', 'ผ้าปิดตา', 'หนวด', 'ผ้าปิดปาก'],
};
const OUTFIT_SIZE = { hat: 8, hair: 8, shirt: 8, item: 8, face: 5 };

const EVENT_NAME = {
  normal: 'วันปกติ', sunny: 'ฟ้าใส', rain: 'ฝนตก', fog: 'หมอกลง', festival: 'เทศกาลหมู่บ้าน', drought: 'บ่อน้ำแห้ง',
  harvest: 'ข้าวสุกเต็มทุ่ง', bell: 'ระฆังร้าว', fullmoon: 'พระจันทร์เต็มดวง', merchant: 'พ่อค้าเร่มาเยือน',
};

// เบาะแสจากชุดของคนร้าย (บางครั้งคลุมเครือ บางครั้งมองไม่เห็นเลย)
// คืนค่า { text, part, values } โดย values คือค่าของชุดที่เข้าข่ายเบาะแสนี้
function makeClue(outfit, allowDark = true) {
  if (allowDark && Math.random() < 0.12) return { text: 'มืดเกินไป มองไม่เห็นคนร้ายเลย', part: null, values: [] };
  const part = rand(['hat', 'hair', 'shirt', 'item', 'face']);
  const v = outfit[part] || 0;
  if (part === 'hat') return { text: 'คนร้าย' + HAT[v], part, values: [v] };
  if (part === 'hair') return { text: `เห็นเส้นผมสี${HAIR[v]}ติดอยู่ที่แผล`, part, values: [v] };
  if (part === 'shirt') {
    if (Math.random() < 0.5) return { text: `มีเศษผ้าสี${SHIRT[v]}ขาดติดกิ่งไม้`, part, values: [v] };
    const tone = SHIRT_TONE[v];
    return { text: `คนร้ายใส่เสื้อ${tone}`, part, values: SHIRT_TONE.map((t, i) => (t === tone ? i : -1)).filter((i) => i >= 0) };
  }
  if (part === 'face') return { text: FACE[v], part, values: [v] };
  return { text: ITEM[v], part, values: [v] };
}

const SPECIAL = ['seer', 'doctor', 'hunter', 'detective', 'jester', 'watchman', 'guard', 'priest', 'gravedigger', 'farmer', 'woodcutter', 'cupid', 'traitor'];
// อาชีพที่มีพลังกลางคืนมีได้ไม่เกิน 1 คน (กลางคืนเก็บผลได้ทีละคน) อาชีพอื่นสูงสุด 3
const ROLE_MAX = { seer: 1, doctor: 1, detective: 1, watchman: 1, priest: 1, cupid: 1 };
const roleMax = (k) => ROLE_MAX[k] || 3;

// ค่าตั้งของแต่ละอาชีพ: 'random' = อาจสุ่มได้ (ไม่เกิน 1), 0 = ปิด, 1-3 = มีแน่ ๆ ตามจำนวนนี้
// (รองรับค่าเก่าแบบ true/false ด้วย)
function roleSetting(roles, k) {
  const v = roles?.[k];
  if (v === undefined || v === true || v === 'random') return 'random';
  if (v === false) return 0;
  const n = Number(v);
  return Number.isInteger(n) ? Math.max(0, Math.min(roleMax(k), n)) : 'random';
}

// จำนวนหมาป่าจริงในเกม (รวมจ่าฝูง) ต้องน้อยกว่าครึ่งเสมอ
function wolfCount(n, setting = 'auto', roles = {}) {
  const cap = Math.max(1, Math.floor((n - 1) / 2));
  const fixed = ['wolf', 'shadow'].reduce((sum, k) => sum + (typeof roleSetting(roles, k) === 'number' ? roleSetting(roles, k) : 0), 0);
  const anyKind = ['wolf', 'shadow'].some((k) => roleSetting(roles, k) !== 0);
  if (!anyKind) return 1;
  const auto = n >= 10 ? 3 : n >= 7 ? 2 : 1;
  const want = setting === 'auto' ? auto : Number(setting) || auto;
  return Math.min(cap, Math.max(want, 1 + fixed));
}

// สุ่มอาชีพ:
// 1) จ่าฝูง 1 ตัว + หมาป่าที่กำหนดจำนวนไว้ + หมาป่าสุ่มจนครบจำนวนหมาป่า
// 2) อาชีพที่กำหนดจำนวนไว้ ใส่ก่อน
// 3) ที่นั่งที่เหลือ สุ่มจากอาชีพที่ตั้ง "สุ่ม" + ชาวบ้าน โอกาสเท่ากัน ไม่ซ้ำกัน (ไม่พอ = ชาวบ้าน)
function assignRoles(ids, roles = {}, wolves = 'auto') {
  const n = ids.length;
  const cfg = (k) => roleSetting(roles, k);
  const total = wolfCount(n, wolves, roles);
  const out = ['alpha'];
  for (const k of ['wolf', 'shadow']) {
    for (let i = 0; i < (typeof cfg(k) === 'number' ? cfg(k) : 0) && out.length < total; i++) out.push(k);
  }
  const wolfPool = shuffle(['wolf', 'shadow'].filter((k) => cfg(k) === 'random'));
  const filler = cfg('wolf') !== 0 ? 'wolf' : 'shadow';
  while (out.length < total) out.push(wolfPool.pop() || filler);
  for (const k of SPECIAL) {
    for (let i = 0; i < (typeof cfg(k) === 'number' ? cfg(k) : 0) && out.length < n; i++) out.push(k);
  }
  const pool = shuffle([...SPECIAL.filter((k) => cfg(k) === 'random' && !(k === 'traitor' && n < 6)), 'villager']);
  while (out.length < n) out.push(pool.pop() || 'villager');
  const order = shuffle(ids);
  const res = {};
  order.forEach((id, i) => (res[id] = out[i]));
  return res;
}

class Game {
  /**
   * @param room ห้อง (ใช้ order, members, settings)
   * @param hooks { send(playerId, event, data), broadcast(event, data), onEnd() }
   */
  constructor(room, hooks) {
    this.room = room;
    this.hooks = hooks;
    this.settings = room.settings;
    this.day = 0;
    this.phase = 'intro';
    this.timer = null;
    this.endsAt = 0;
    this.duration = 0;
    this.log = [];
    this.winner = null;
    this.players = new Map();
    const roles = assignRoles(room.order, this.settings.roles, this.settings.wolves);
    for (const id of room.order) {
      const m = room.members.get(id);
      this.players.set(id, {
        id,
        name: m.name,
        outfit: { ...m.outfit },
        role: roles[id],
        alive: true,
        hp: 2,
        knownWolves: new Set(),
        journal: [],
        hand: null,
        pick: null,
        lastDetectiveTarget: null,
        lastProtect: null,
      });
    }
    const nonWolves = [...this.players.values()].filter((p) => !this.isWolf(p)).length;
    const days = { short: 3, normal: 4, long: 5 }[this.settings.barLength] || 4;
    this.bar = { value: 0, target: Math.max(10, Math.round(nonWolves * BALANCE.barPerHead * days)) };
    this.lastEvents = {};
    this.chatLog = [];
  }

  // ---------- เครื่องมือ ----------
  isWolf(p) {
    return p.role === 'alpha' || p.role === 'wolf' || p.role === 'shadow';
  }
  // หมาป่าลูกฝูง (ไม่ใช่จ่าฝูง)
  isPack(p) {
    return p.role === 'wolf' || p.role === 'shadow';
  }
  // หมอดูเห็นว่าเป็นหมาป่าไหม (หมาป่าเงาซ่อนตัวได้)
  looksWolf(p) {
    return this.isWolf(p) && p.role !== 'shadow';
  }
  alive() {
    return [...this.players.values()].filter((p) => p.alive);
  }
  alpha() {
    return [...this.players.values()].find((p) => p.role === 'alpha' && p.alive);
  }
  // who = รหัสผู้เล่นที่บันทึกนี้พูดถึง (ให้บอทอ่านได้โดยไม่ต้องแกะข้อความ)
  note(p, text, kind = 'info', clue = null, who = null) {
    const entry = { day: this.day, phase: this.phase, text, kind };
    if (clue?.part) entry.clue = { part: clue.part, values: clue.values };
    if (who) entry.who = who;
    p.journal.push(entry);
  }
  record(text) {
    this.log.push({ day: this.day, phase: this.phase, text });
  }

  setPhase(phase, ms, next) {
    clearTimeout(this.timer);
    this.phase = phase;
    this.duration = ms ? Math.round(ms / SPEED) : 0;
    this.endsAt = ms ? Date.now() + this.duration : 0;
    this.next = next;
    if (ms) this.timer = setTimeout(() => this.advance(), this.duration);
    this.sync();
  }

  advance() {
    clearTimeout(this.timer);
    const next = this.next;
    this.next = null;
    next?.();
  }

  destroy() {
    clearTimeout(this.timer);
    clearInterval(this.chaseTick);
    this.next = null;
    this.phase = 'over';
  }

  start() {
    this.record('เกมเริ่มต้น');
    for (const p of this.players.values()) {
      if (p.role === 'alpha') this.note(p, 'คุณคือจ่าฝูง ซุ่มทำร้ายคนในป่าลึกได้ และเลือกเหยื่อทุกคืน คุณยังไม่รู้ว่าใครเป็นหมาป่าพวกเดียวกัน', 'role');
      if (p.role === 'wolf') this.note(p, 'คุณคือหมาป่า กลางวันทำตัวเหมือนชาวบ้าน คุณยังไม่รู้ว่าใครคือจ่าฝูง', 'role');
      if (p.role === 'shadow') this.note(p, 'คุณคือหมาป่าเงา หมอดูส่องคุณแล้วจะเห็นเป็นคนธรรมดา', 'role');
      if (p.role === 'traitor') this.note(p, 'คุณคือคนทรยศ เป็นคนธรรมดาแต่อยู่ฝ่ายหมาป่า คุณไม่รู้ว่าใครเป็นหมาป่า', 'role');
    }
    this.setPhase('intro', DUR.intro, () => this.startDay());
  }

  // ---------- กลางวัน ----------
  startDay() {
    this.day++;
    this.lastEvents = {};
    this.event = rollEvent(this.day, this.event);
    if (this.event !== 'normal') this.record(`สถานการณ์วันนี้: ${EVENT_NAME[this.event]}`);
    for (const p of this.alive()) {
      p.hand = shuffle(LOC_KEYS).slice(0, 3);
      p.pick = null;
      p.lurk = null; // จ่าฝูงเลือกเองว่าวันนี้จะซ่อนตัวซุ่ม หรือทำงานปกติ
    }
    this.record(`วันที่ ${this.day} เริ่มต้น`);
    this.setPhase('day', this.settings.cardTime * 1000, () => this.startWork());
  }

  pickCard(p, loc) {
    if (this.phase !== 'day' || !p.alive || p.pick || !p.hand?.includes(loc)) return;
    p.pick = loc;
    this.sync();
    if (this.alive().every((x) => this.hasPicked(x))) this.advance();
  }

  // จ่าฝูงต้องเลือกทั้งสถานที่และวิธี (ซุ่ม / ทำงาน) ถึงนับว่าเลือกเสร็จ
  hasPicked(p) {
    return !!p.pick && (p.role !== 'alpha' || p.lurk != null);
  }

  chooseMode(p, mode) {
    if (this.phase !== 'day' || !p.alive || p.role !== 'alpha' || !p.pick || p.lurk != null) return;
    if (mode !== 'lurk' && mode !== 'work') return;
    p.lurk = mode === 'lurk';
    this.sync();
    if (this.alive().every((x) => this.hasPicked(x))) this.advance();
  }

  // ทุกคนเดินไปสถานที่ของตัวเองแล้วเล่นมินิเกม (จ่าฝูงในป่าเลือกเหยื่อได้ระหว่างนี้)
  startWork() {
    for (const p of this.alive()) {
      if (!p.pick) p.pick = rand(p.hand);
      if (p.role === 'alpha' && p.lurk == null) p.lurk = true;
      p.workScore = null;
      // คนที่อยู่โรงเตี๊ยมต้องตัดสินใจก่อนว่าจะเปลี่ยนชุดหรือไม่ (ถ้าห้องเปิดให้เปลี่ยน)
      p.outfitPending = p.pick === 'tavern' && this.settings.outfitChange;
    }
    this.outfitChanges = [];
    const a = this.alpha();
    const canAmbush = a && a.lurk && !(a.pick === 'forest' && this.event === 'rain');
    const others = canAmbush ? this.alive().filter((p) => p !== a && p.pick === a.pick) : [];
    this.ambushTargets = others.map((p) => p.id);
    this.ambushChoice = others.length ? undefined : null;
    // จ่าฝูงไม่ทำเควส: ซุ่มอย่างเดียว ไม่มีใครมา = เสร็จทันที (แต้มปลอมคิดจากค่ากลาง ๆ)
    if (a?.lurk && this.ambushChoice === null) a.workScore = LURK_SCORE;
    this.setPhase('work', DUR.work, () => this.resolveAmbush(this.ambushChoice ?? null));
  }

  submitWork(p, score) {
    if (this.phase !== 'work' || !p.alive || p.workScore !== null) return;
    const n = Number(score);
    p.workScore = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
    this.sync();
    this.maybeEndWork();
  }

  chooseAmbush(p, targetId) {
    if (this.phase !== 'work' || p.role !== 'alpha' || this.ambushChoice !== undefined) return;
    if (targetId !== null && !this.ambushTargets.includes(targetId)) return;
    this.ambushChoice = targetId;
    if (p.workScore === null) p.workScore = LURK_SCORE;
    this.sync();
    this.maybeEndWork();
  }

  maybeEndWork() {
    const done = (x) => x.workScore !== null && !x.outfitPending;
    if (this.alive().every(done) && this.ambushChoice !== undefined) this.advance();
  }

  // เปลี่ยนชุดได้ 1 ส่วน (ส่ง null = ไม่เปลี่ยน)
  changeOutfit(p, data) {
    if (this.phase !== 'work' || !p.alive || !p.outfitPending) return;
    p.outfitPending = false;
    const limit = this.event === 'merchant' ? 2 : 1;
    const list = (Array.isArray(data?.parts) ? data.parts : data ? [data] : []).slice(0, limit);
    const used = new Set();
    for (const item of list) this.applyOutfitChange(p, item, used);
    this.sync();
    this.maybeEndWork();
  }

  applyOutfitChange(p, item, used) {
    const part = item?.part;
    const value = Number(item?.value);
    if (used.has(part)) return;
    used.add(part);
    if (part && OUTFIT_SIZE[part] && Number.isInteger(value) && value >= 0 && value < OUTFIT_SIZE[part] && value !== p.outfit[part]) {
      const from = p.outfit[part];
      p.outfit = { ...p.outfit, [part]: value };
      const change = { id: p.id, part, from, to: value };
      this.outfitChanges.push(change);
      const text = `${p.name} เปลี่ยน${PART_NAME[part]}จาก${PART_VALUE[part][from]}เป็น${PART_VALUE[part][value]}`;
      this.record(text);
      // นักสืบรู้ทุกครั้งที่มีคนเปลี่ยนชุด ไม่ว่าจะอยู่ที่ไหน
      for (const d of this.alive().filter((x) => x.role === 'detective' && x !== p)) this.note(d, 'ตาเฉียบคม: ' + text, 'detective');
    }
  }

  resolveAmbush(targetId) {
    const a = this.alpha();
    if (!targetId || !a) return this.finishDay(null);
    const t = this.players.get(targetId);
    const loc = a.pick;
    const where = loc === 'forest' ? 'ในป่าลึก' : 'ที่' + LOCATIONS[loc].name;
    const ev = { victim: t.id, outcome: 'wounded', clue: null, loc, witnessClues: {} };
    this.aliveBefore = new Set(this.alive().map((x) => x.id));
    const guard = this.alive().find((x) => x.role === 'guard' && x.pick === loc);
    if (guard) {
      ev.outcome = 'blocked';
      this.note(a, `ทหารยาม ${guard.name} อยู่${where}ด้วย คุณทำร้ายใครไม่ได้`, 'danger');
      this.note(guard, `คุณไล่เงาดำที่จะทำร้าย ${t.name} ออกไปได้!`, 'info');
      this.record(`ทหารยาม ${guard.name} ขวางจ่าฝูงไว้${where}`);
      return this.finishDay(ev);
    }
    if (t.role === 'woodcutter' && !t.dodged && loc === 'forest') {
      t.dodged = true;
      ev.outcome = 'dodged';
      this.note(t, 'มีเงาพุ่งเข้ามา แต่คุณหลบได้ทันด้วยความชำนาญในป่า (หลบได้ครั้งเดียว)', 'danger');
      this.note(a, `${t.name} หลบการซุ่มของคุณได้อย่างคล่องแคล่ว`, 'danger');
      return this.finishDay(ev);
    }
    if (t.role === 'hunter') {
      ev.outcome = 'repelled';
      a.hp--;
      this.note(a, `${t.name} สู้กลับ! คุณบาดเจ็บ (เขาคือนายพราน)`, 'danger');
      this.note(t, `มีบางอย่างพุ่งเข้ามา${where} คุณสู้กลับจนมันหนีไปได้ มันบาดเจ็บ!`, 'danger');
      this.record(`${t.name} (นายพราน) สู้กับจ่าฝูง ${a.name}${where} จ่าฝูงบาดเจ็บ`);
      if (a.hp <= 0) this.kill(a, 'นายพรานสู้กลับ', 'hunter');
    } else if (this.isWolf(t)) {
      ev.outcome = 'packmate';
      t.hp--;
      t.knownWolves.add(a.id);
      a.knownWolves.add(t.id);
      this.note(a, `คุณกัด ${t.name} แต่ได้กลิ่นพวกเดียวกัน! ${t.name} คือหมาป่า`, 'wolf');
      this.note(t, `จ่าฝูงกัดคุณโดยไม่รู้ตัว ตอนนี้คุณรู้แล้วว่าจ่าฝูงคือ ${a.name}`, 'wolf');
      this.record(`จ่าฝูง ${a.name} กัดโดน ${t.name} ซึ่งเป็นหมาป่าพวกเดียวกัน`);
      if (t.hp <= 0) this.kill(t, 'ถูกจ่าฝูงกัด', 'wolf');
    } else {
      // คนธรรมดา: ไล่ล่าสดก่อน แล้วค่อยรู้ผล
      return this.startChase(a, t, loc, ev);
    }
    this.finishDay(ev);
  }

  // พยานที่อยู่ตรงนั้น (ซุ่มนอกป่า) ได้เบาะแสทุกคน
  witnessClues(a, t, loc, ev, verb) {
    if (loc === 'forest') return;
    const where = 'ที่' + LOCATIONS[loc].name;
    for (const w of this.alive().filter((x) => x.pick === loc && x !== a && x !== t && !this.isPack(x))) {
      const c = makeClue(a.outfit, false);
      ev.witnessClues[w.id] = c;
      this.note(w, `คุณเห็นเงาดำ${verb} ${t.name}${where}! เบาะแส: ${c.text}`, 'clue', c);
    }
  }

  woundVictim(a, t, loc, ev) {
    const where = loc === 'forest' ? 'ในป่าลึก' : 'ที่' + LOCATIONS[loc].name;
    const packmates = this.alive().filter((p) => this.isPack(p) && p.pick === loc);
    // ในป่ามืด อาจมองไม่เห็นอะไร ที่อื่นโล่ง เห็นคนร้ายชัดกว่า
    ev.clue = makeClue(a.outfit, loc === 'forest');
    this.witnessClues(a, t, loc, ev, 'ทำร้าย');
    if (packmates.length) {
      ev.outcome = 'killed';
      this.kill(t, `ถูกฝูงหมาป่ารุม${where}`, 'wolf');
      packmates.forEach((w) => {
        w.knownWolves.add(a.id);
        a.knownWolves.add(w.id);
        this.note(w, `คุณได้กลิ่นเลือด และรู้ตัวว่าร่วมรุม ${t.name} กับจ่าฝูง ${a.name}`, 'wolf');
        this.note(a, `${w.name} ร่วมรุมกับคุณ ${w.name} คือหมาป่าพวกเดียวกัน`, 'wolf');
      });
      this.record(`${t.name} ถูกฝูงหมาป่ารุมจนตาย${where}`);
    } else {
      t.hp--;
      this.note(t, `คุณถูกทำร้าย${where}! เบาะแส: ${ev.clue.text}`, 'clue', ev.clue);
      this.record(`${t.name} ถูกจ่าฝูงทำร้าย${where} (เบาะแส: ${ev.clue.text})`);
      if (t.hp <= 0) {
        ev.outcome = 'killed';
        this.kill(t, `บาดเจ็บสาหัส${where}`, 'wolf');
      }
    }
  }

  // ---------- ไล่ล่าสด ----------
  startChase(a, t, loc, ev) {
    const sc = (ms) => ms / SPEED;
    const startAt = Date.now() + sc(CHASE.countdown);
    const obstacles = [];
    for (let at = 1600 + Math.random() * 900; at < CHASE.run - 1200; at += 2200 + Math.random() * 1300) {
      obstacles.push({ at: startAt + sc(at), done: false, cleared: false });
    }
    this.chase = {
      a: a.id, victim: t.id, loc, ev, dist: CHASE.start, startAt, runEnd: startAt + sc(CHASE.run),
      obstacles, lastTap: {}, lastHelp: {}, stunUntil: 0, pounced: false, result: null, how: null, fx: [], dirty: false,
    };
    clearInterval(this.chaseTick);
    this.chaseTick = setInterval(() => this.tickChase(), 100);
    this.setPhase('chase', CHASE.countdown + CHASE.run + 400, () => this.endChase());
  }

  isChaseHelper(p, c = this.chase) {
    return p.alive && p.pick === c.loc && p.id !== c.a && p.id !== c.victim;
  }

  chaseAction(p, kind) {
    const c = this.chase;
    if (this.phase !== 'chase' || !c || c.result) return;
    const now = Date.now();
    if (now < c.startAt) return;
    const gapOk = () => {
      if (now - (c.lastTap[p.id] || 0) < CHASE.minGap / SPEED) return false;
      c.lastTap[p.id] = now;
      return true;
    };
    if (kind === 'run' && p.id === c.victim) {
      if (!gapOk()) return;
      c.dist += CHASE.step;
    } else if (kind === 'hunt' && p.id === c.a) {
      if (now < c.stunUntil || !gapOk()) return;
      c.dist -= CHASE.step;
    } else if (kind === 'pounce' && p.id === c.a) {
      if (c.pounced || now < c.stunUntil) return;
      c.pounced = true;
      if (c.dist <= CHASE.reach) return this.chaseResult('caught', 'pounce');
      c.dist += CHASE.stumble;
      c.stunUntil = now + 1000 / SPEED;
      c.fx.push('miss');
    } else if (kind === 'jump' && p.id === c.victim) {
      const o = c.obstacles.find((x) => !x.done && now >= x.at - CHASE.jumpEarly / SPEED && now <= x.at + CHASE.jumpLate / SPEED);
      c.fx.push('jump');
      if (o) o.done = o.cleared = true;
    } else if (kind === 'help' && this.isChaseHelper(p)) {
      if (now - (c.lastHelp[p.id] || 0) < CHASE.helpCooldown / SPEED) return;
      c.lastHelp[p.id] = now;
      if (this.isPack(p)) {
        c.dist -= CHASE.help;
        c.fx.push('block');
      } else {
        c.dist += CHASE.help;
        c.stunUntil = Math.max(c.stunUntil, now + 500 / SPEED);
        c.fx.push('stone');
      }
    } else return;
    c.dirty = true;
    this.checkChaseBounds();
  }

  checkChaseBounds() {
    const c = this.chase;
    if (!c || c.result) return;
    c.dist = Math.max(0, Math.min(100, c.dist));
    if (c.dist <= 0) this.chaseResult('caught', 'reach');
    else if (c.dist >= 100) this.chaseResult('escaped', 'home');
  }

  tickChase() {
    const c = this.chase;
    if (!c || c.result) return;
    const now = Date.now();
    for (const o of c.obstacles) {
      if (!o.done && now > o.at + CHASE.jumpLate / SPEED) {
        o.done = true;
        c.dist -= CHASE.trip;
        c.fx.push('trip');
        c.dirty = true;
      }
    }
    this.checkChaseBounds();
    if (!c.result && now >= c.runEnd) this.chaseResult(c.dist >= CHASE.safe ? 'escaped' : 'caught', 'time');
    if (c.dirty && !c.result) this.sendChase();
  }

  chaseResult(result, how) {
    const c = this.chase;
    if (!c || c.result) return;
    c.result = result;
    c.how = how;
    clearInterval(this.chaseTick);
    this.sendChase();
    this.setPhase('chase', CHASE.linger, () => this.endChase());
  }

  endChase() {
    clearInterval(this.chaseTick);
    const c = this.chase;
    if (!c) return;
    if (!c.result) c.result = c.dist >= CHASE.safe ? 'escaped' : 'caught';
    this.chase = null;
    const a = this.players.get(c.a);
    const t = this.players.get(c.victim);
    const ev = c.ev;
    const where = c.loc === 'forest' ? 'ในป่าลึก' : 'ที่' + LOCATIONS[c.loc].name;
    if (c.result === 'caught' && a.alive && t.alive) {
      this.woundVictim(a, t, c.loc, ev);
    } else {
      ev.outcome = 'escaped';
      // วิ่งหนีมาได้ ระหว่างนั้นหันไปเห็นคนร้ายชัด ๆ
      ev.clue = makeClue(a.outfit, false);
      this.witnessClues(a, t, c.loc, ev, 'ไล่ล่า');
      if (t.alive) this.note(t, `คุณหนีรอดจากเงาดำ${where}! ระหว่างวิ่งหันไปเห็น: ${ev.clue.text}`, 'clue', ev.clue);
      this.note(a, `${t.name} วิ่งหนีรอดไปได้`, 'danger');
      this.record(`${t.name} หนีรอดจากจ่าฝูง${where} (เบาะแส: ${ev.clue.text})`);
    }
    this.finishDay(ev);
  }

  chaseView(id) {
    const c = this.chase;
    if (!c) return null;
    const me = this.players.get(id);
    const role = id === c.victim ? 'victim' : id === c.a ? 'hunter' : me && this.isChaseHelper(me, c) ? 'helper' : 'watch';
    const knows = role !== 'watch' || !me?.alive;
    return {
      role,
      pack: role === 'helper' && this.isPack(me),
      loc: c.loc,
      victim: knows ? c.victim : null,
      dist: Math.round(c.dist * 10) / 10,
      startAt: c.startAt,
      runEnd: c.runEnd,
      safe: CHASE.safe,
      reach: CHASE.reach,
      speed: SPEED,
      obstacles: c.obstacles.map((o) => ({ at: o.at, done: o.done, cleared: o.cleared })),
      stunned: Date.now() < c.stunUntil,
      pounced: c.pounced,
      result: c.result,
      how: c.how,
      fx: c.fx,
      serverNow: Date.now(),
    };
  }

  sendChase() {
    const c = this.chase;
    if (!c) return;
    for (const id of this.players.keys()) this.hooks.send(id, 'game:chase', this.chaseView(id));
    c.fx = [];
    c.dirty = false;
  }

  finishDay(ambush) {
    const byLoc = {};
    for (const p of this.alive().concat(ambush ? [this.players.get(ambush.victim)] : [])) {
      if (!p.pick) continue;
      (byLoc[p.pick] ||= new Set()).add(p.id);
    }
    let gained = 0;
    this.dayResults = {};
    for (const p of this.players.values()) {
      if (!p.pick) continue;
      // ผลงานมินิเกม: เล่นเก่งได้ 1.5 เท่า ไม่ได้เล่นเลยได้ราวครึ่งเดียว
      const score = p.workScore ?? 0.2;
      let base = this.locPoints(p.pick);
      if (p.role === 'farmer' && p.pick === 'farm') base *= 2;
      if (p.role === 'woodcutter' && p.pick === 'forest') base += 2;
      const earned = Math.max(1, Math.round(base * (0.5 + score))) + (p.role === 'villager' ? 1 : 0) + (this.event === 'sunny' ? 1 : 0);
      let pts = this.isWolf(p) ? 0 : earned;
      if (ambush && ambush.victim === p.id && ambush.outcome !== 'escaped') pts = 0;
      // ลูกฝูงแอบป่วนงาน: เล่นมินิเกมเก่ง = หลอดพิธีขับไล่ลดมาก
      const sabotage = this.isPack(p) && p.alive ? 1 + Math.round(score * 2) : 0;
      gained += pts - sabotage;
      const res = {
        loc: p.pick,
        score,
        // หมอกลง: มองไม่เห็นว่าใครอยู่ด้วย · จ่าฝูงซ่อนตัวอยู่ ไม่มีใครเห็นว่าอยู่ที่นั่น
        with: this.event === 'fog' ? [] : [...byLoc[p.pick]].filter((id) => id !== p.id && !(this.players.get(id).role === 'alpha' && this.players.get(id).lurk)),
        fog: this.event === 'fog',
        points: this.isWolf(p) ? earned : pts, // หมาป่าเห็นแต้มปลอมเหมือนทำจริง
        ambush: null,
        heardScream: false,
      };
      if (sabotage) res.sabotage = sabotage;
      if (ambush) {
        if (p.pick === ambush.loc) {
          res.ambush = { victim: ambush.victim, outcome: ambush.outcome, loc: ambush.loc };
          const clue = ambush.victim === p.id ? ambush.clue : ambush.witnessClues?.[p.id];
          if (clue) res.ambush.clue = clue.text;
          if (p.role === 'alpha') res.ambush.byMe = true;
        } else if (ambush.outcome !== 'escaped') {
          res.heardScream = ambush.loc;
        }
      }
      if (p.pick === 'tavern') {
        res.changes = (this.outfitChanges || []).map((c) => ({
          id: c.id,
          text: `${this.players.get(c.id).name} เปลี่ยน${PART_NAME[c.part]}จาก${PART_VALUE[c.part][c.from]}เป็น${PART_VALUE[c.part][c.to]}`,
        }));
        res.changes.filter((c) => c.id !== p.id).forEach((c) => this.note(p, 'เห็นกับตา: ' + c.text, 'detective'));
      }
      if (p.pick === 'tavern' && p.alive) {
        const rumor = this.makeRumor();
        if (rumor) {
          res.rumor = rumor.text;
          this.note(p, 'ข่าวลือจากโรงเตี๊ยม: ' + rumor.text, 'rumor', rumor.clue);
        }
      }
      this.dayResults[p.id] = res;
    }
    this.bar.value = Math.max(0, Math.min(this.bar.target, this.bar.value + gained));
    const dayDeaths = this.aliveBefore ? [...this.aliveBefore].filter((id) => !this.players.get(id).alive) : [];
    this.aliveBefore = null;
    this.lastEvents = { ambushHappened: !!ambush, ambushLoc: ambush?.loc || null, dayDeaths };
    for (const p of this.players.values()) {
      p.pick = null;
      p.workScore = null;
      p.outfitPending = false;
    }
    const ms = DUR.dayResult + (ambush ? DUR.ambushResultBonus : 0);
    this.setPhase('dayResult', ms, () => this.afterDeaths(() => this.checkWin() || this.startNight()));
  }

  locPoints(key) {
    const base = LOCATIONS[key].points;
    if (key === 'forest' && this.event === 'rain') return 2;
    if (key === 'well' && this.event === 'drought') return 1;
    if (key === 'farm' && this.event === 'harvest') return base * 2;
    return base;
  }

  makeRumor() {
    const wolves = this.alive().filter((p) => this.isWolf(p));
    const others = this.alive().filter((p) => !this.isWolf(p));
    if (!wolves.length) return null;
    const truthful = this.event === 'festival' || Math.random() < 0.5 || !others.length;
    const source = truthful ? rand(wolves) : rand(others);
    const clue = makeClue(source.outfit);
    if (!clue.part) return { text: 'วันนี้ไม่มีใครพูดถึงหมาป่าเลย', clue: null };
    return { text: 'มีคนเล่าว่า ' + clue.text, clue };
  }

  // ---------- กลางคืน ----------
  startNight() {
    this.night = { kill: null, protect: null, see: null, interrogate: null, done: new Set() };
    this.setPhase('night', DUR.night, () => this.resolveNight());
  }

  nightActors() {
    const anyDead = [...this.players.values()].some((x) => !x.alive);
    return this.alive().filter((p) => {
      if (p.role === 'alpha') return true; // คืนแรกดมกลิ่นหาพวก คืนต่อไปล่า
      if (['seer', 'doctor', 'detective', 'watchman'].includes(p.role)) return true;
      if (p.role === 'priest') return !p.priestUsed && anyDead;
      if (p.role === 'cupid') return !this.lovers;
      if (this.isPack(p)) return true; // ลูกฝูงแอบไปใส่ร้ายคนอื่น
      return false;
    });
  }

  // คืนแรกจ่าฝูงยังไม่ล่า: ดมกลิ่นหาลูกฝูงแทน
  alphaSniffs() {
    return this.day <= 1 && !BALANCE.firstNightKill;
  }

  nightAction(p, data) {
    if (this.phase !== 'night' || !p.alive || this.night.done.has(p.id)) return;
    if (!this.nightActors().includes(p)) return;
    if (p.role === 'cupid') {
      const ids = Array.isArray(data) ? [...new Set(data)] : [];
      if (ids.length !== 2 || !ids.every((id) => this.players.get(id)?.alive)) return;
      this.night.lovers = ids;
    } else if ((p.role === 'priest' || this.isPack(p)) && data === 'skip') {
      // นักบวช / ลูกฝูง เลือกไม่ทำอะไรคืนนี้
    } else {
      const t = this.players.get(data);
      if (!t) return;
      if (p.role === 'priest') {
        if (t.alive) return;
        this.night.revive = t.id;
        p.priestUsed = true;
      } else {
        if (!t.alive) return;
        if (p.role === 'alpha' && this.alphaSniffs()) {
          if (t === p) return;
          this.night.sniff = t.id;
        } else if (p.role === 'alpha') {
          if (t === p) return;
          this.night.kill = t.id;
          for (const w of this.alive().filter((x) => this.isPack(x))) {
            this.note(w, `เสียงหอนของจ่าฝูงบอกว่า เหยื่อคืนนี้คือ ${t.name}`, 'wolf');
          }
        } else if (p.role === 'seer') {
          if (t === p) return;
          this.night.see = t.id;
        } else if (p.role === 'doctor') {
          if (p.lastProtect === t.id) return; // ปกป้องคนเดิมสองคืนติดไม่ได้
          this.night.protect = t.id;
          p.lastProtect = t.id;
        } else if (p.role === 'detective') {
          if (t === p || p.lastDetectiveTarget === t.id) return;
          this.night.interrogate = [p.id, t.id];
          p.lastDetectiveTarget = t.id;
          this.note(t, `นักสืบ ${p.name} เรียกคุณไปสอบปากคำลับ`, 'detective');
          this.note(p, `คุณเรียก ${t.name} มาสอบปากคำ`, 'detective');
        } else if (p.role === 'watchman') {
          if (t === p) return;
          this.night.watch = t.id;
        } else if (this.isPack(p)) {
          if (t === p) return;
          (this.night.frames ||= []).push({ by: p.id, target: t.id });
        }
      }
    }
    this.night.done.add(p.id);
    this.sync();
    const allDone = this.nightActors().every((x) => this.night.done.has(x.id));
    if (allDone && !this.night.interrogate) this.advance();
  }

  resolveNight() {
    const n = this.night;
    const aliveBefore = new Set(this.alive().map((x) => x.id));
    // กามเทพจับคู่รัก
    const cupid = this.alive().find((x) => x.role === 'cupid');
    if (n.lovers) {
      this.lovers = n.lovers;
      const [a1, b1] = n.lovers.map((id) => this.players.get(id));
      this.note(a1, `ลูกศรกามเทพปักใจ! คุณกับ ${b1.name} เป็นคู่รักกัน ถ้าคนหนึ่งตาย อีกคนจะตรอมใจตายตาม`, 'info');
      this.note(b1, `ลูกศรกามเทพปักใจ! คุณกับ ${a1.name} เป็นคู่รักกัน ถ้าคนหนึ่งตาย อีกคนจะตรอมใจตายตาม`, 'info');
      if (cupid && !n.lovers.includes(cupid.id)) this.note(cupid, `คุณจับคู่ ${a1.name} กับ ${b1.name} แล้ว`, 'info');
    }
    // คนเฝ้ายาม: เห็นใครแวะมาบ้านที่เฝ้า
    const watchman = this.alive().find((x) => x.role === 'watchman');
    if (watchman && n.watch) {
      const t = this.players.get(n.watch);
      const visitors = [];
      const alphaNow = this.alpha();
      if ((n.kill === n.watch || n.sniff === n.watch) && alphaNow) visitors.push(alphaNow);
      if (n.protect === n.watch) visitors.push(this.alive().find((x) => x.role === 'doctor'));
      if (n.see === n.watch) visitors.push(this.alive().find((x) => x.role === 'seer'));
      if (n.interrogate?.[1] === n.watch) visitors.push(this.players.get(n.interrogate[0]));
      // ลูกฝูงที่มาทิ้งรอยใส่ร้าย ถูกคนเฝ้ายามเห็นตัว
      for (const f of n.frames || []) if (f.target === n.watch) visitors.push(this.players.get(f.by));
      const names = visitors.filter(Boolean).map((x) => x.name);
      this.note(watchman, names.length ? `คืนนี้มีคนแวะมาบ้าน ${t.name}: ${names.join(', ')}` : `คืนนี้ไม่มีใครแวะมาบ้าน ${t.name} เลย`, names.length ? 'clue' : 'info');
    }
    const seer = this.alive().find((p) => p.role === 'seer');
    if (seer && n.see) {
      const t = this.players.get(n.see);
      this.note(seer, `ลูกแก้วบอกว่า ${t.name} ${this.looksWolf(t) ? 'เป็นหมาป่า!' : 'ไม่ใช่หมาป่า'}`, this.looksWolf(t) ? 'danger' : 'info', null, t.id);
    }
    const doctor = this.alive().find((p) => p.role === 'doctor');
    if (n.protect) {
      const t = this.players.get(n.protect);
      if (t.hp < 2) {
        t.hp++;
        this.note(t, 'มีคนแอบมารักษาแผลให้คุณตอนกลางคืน', 'info');
      }
    }
    const a = this.alpha();
    // จ่าฝูงดมกลิ่น: รู้ฝ่ายเดียวว่าเป็นลูกฝูงไหม (ลูกฝูงไม่รู้ตัว ถ้ารู้ทั้งคู่ฝูงจะแรงเกินไป)
    if (a && n.sniff) {
      const t = this.players.get(n.sniff);
      if (this.isPack(t)) {
        a.knownWolves.add(t.id);
        this.note(a, `คุณแอบดมกลิ่น ${t.name} ได้กลิ่นพวกเดียวกัน! ${t.name} คือหมาป่า (เขายังไม่รู้ว่าคุณคือจ่าฝูง)`, 'wolf');
        this.record(`จ่าฝูง ${a.name} ดมกลิ่นเจอลูกฝูง ${t.name}`);
      } else {
        this.note(a, `คุณแอบดมกลิ่น ${t.name} ไม่ใช่กลิ่นพวกเดียวกัน`, 'info');
      }
    }
    if (a && n.kill) {
      const t = this.players.get(n.kill);
      if (this.isWolf(t)) {
        t.knownWolves.add(a.id);
        a.knownWolves.add(t.id);
        this.note(a, `คุณบุกบ้าน ${t.name} แต่เขาเป็นหมาป่าพวกเดียวกัน!`, 'wolf');
        this.note(t, `จ่าฝูง ${a.name} บุกมาหาคุณเมื่อคืน ตอนนี้คุณรู้จักกันแล้ว`, 'wolf');
      } else if (n.protect === t.id && this.event !== 'fullmoon') {
        if (doctor) this.note(doctor, `คุณช่วยชีวิต ${t.name} ไว้ได้เมื่อคืน!`, 'info');
        this.record(`หมอช่วย ${t.name} ไว้จากหมาป่า`);
        this.lastEvents.saved = true;
      } else {
        this.kill(t, 'ถูกหมาป่าฆ่าตอนกลางคืน', 'wolf');
      }
    }
    // ลูกฝูงใส่ร้าย: เช้ามามีข่าวลือที่ตรงกับชุดของคนที่ถูกใส่ร้าย
    for (const f of n.frames || []) {
      const w = this.players.get(f.by);
      const t = this.players.get(f.target);
      if (!w.alive || !t.alive) continue;
      const clue = makeClue(t.outfit, false);
      if (!clue.part) continue;
      const pool = this.alive().filter((x) => x !== t && x !== w && !this.isWolf(x));
      for (const r of shuffle(pool).slice(0, FRAME_REACH)) this.note(r, `ข่าวลือตอนเช้า: มีคนเห็นเงาดำด้อม ๆ มองแถวบ้านเมื่อคืน ${clue.text}`, 'rumor', clue);
      this.note(w, `คุณทิ้งรอยไว้ที่บ้าน ${t.name} ข่าวลือแพร่ออกไปแล้ว (${clue.text})`, 'wolf');
      this.record(`${w.name} (หมาป่า) ใส่ร้าย ${t.name}`);
    }
    const deaths = [...aliveBefore].filter((id) => !this.players.get(id).alive);
    // นักบวชชุบชีวิต (หลังจากหมาป่าล่าแล้ว)
    let revived = null;
    if (n.revive) {
      const t = this.players.get(n.revive);
      if (!t.alive) {
        // ถ้ามีจ่าฝูงคนใหม่แล้ว จ่าฝูงเก่าที่ฟื้นกลับมาเป็นหมาป่าธรรมดา
        if (t.role === 'alpha' && this.alpha()) t.role = 'wolf';
        t.alive = true;
        t.hp = 1;
        t.cause = null;
        t.death = null;
        t.watching = null;
        revived = t.id;
        this.record(`นักบวชชุบชีวิต ${t.name}`);
        this.note(t, 'นักบวชสวดอ้อนวอนจนคุณฟื้นคืนชีพ! (เหลือ 1 ชีวิต)', 'info');
      }
    }
    this.night = null;
    this.lastEvents = { ...this.lastEvents, nightDeaths: deaths, revived };
    this.setPhase('dawn', DUR.dawn, () => this.afterDeaths(() => this.checkWin() || this.startMeeting()));
  }

  // ---------- ความตาย / นายพราน ----------
  kill(p, cause, kind = 'other') {
    if (!p.alive) return;
    p.alive = false;
    p.hp = 0;
    p.cause = cause;
    p.death = { cause, kind, night: this.phase === 'night', loc: this.phase === 'night' ? null : p.pick || null, day: this.day };
    this.record(`${p.name} ตาย (${cause})`);
    for (const g of this.alive().filter((x) => x.role === 'gravedigger')) {
      this.note(g, `สัปเหร่อรู้: ${p.name} คือ ${ROLES[p.role].name}`, 'clue');
    }
    if (this.lovers?.includes(p.id)) {
      const other = this.players.get(this.lovers.find((id) => id !== p.id));
      if (other?.alive) this.kill(other, 'ตรอมใจตายตามคนรัก', 'heart');
    }
    if (p.role === 'hunter') (this.pendingHunters ||= []).push(p.id);
    if (p.role === 'alpha') {
      const heir = rand(this.alive().filter((x) => this.isPack(x)));
      if (heir) {
        heir.role = 'alpha';
        this.note(heir, 'จ่าฝูงตายแล้ว คุณกลายเป็นจ่าฝูงคนใหม่! ซุ่มในป่าและเลือกเหยื่อได้แล้ว', 'wolf');
        this.record(`${heir.name} ขึ้นเป็นจ่าฝูงคนใหม่`);
      }
    }
  }

  afterDeaths(then) {
    const id = this.pendingHunters?.shift();
    if (!id) return then();
    this.hunterId = id;
    this.setPhase('hunter', DUR.hunter, () => this.hunterShoot(null, then));
    this.hunterThen = then;
  }

  hunterShoot(targetId, then = this.hunterThen) {
    if (targetId) {
      const t = this.players.get(targetId);
      if (t?.alive) {
        this.kill(t, 'ถูกนายพรานยิง', 'hunter');
        this.lastEvents = { ...this.lastEvents, hunterShot: t.id };
        this.lastShot = { by: this.hunterId, target: t.id, at: Date.now() };
        this.record(`นายพรานยิง ${t.name} ก่อนตาย`);
      }
    }
    this.hunterId = null;
    this.afterDeaths(then);
  }

  chooseHunterTarget(p, targetId) {
    if (this.phase !== 'hunter' || p.id !== this.hunterId) return;
    const t = this.players.get(targetId);
    if (!t?.alive) return;
    this.next = null;
    clearTimeout(this.timer);
    this.hunterShoot(targetId);
  }

  // ---------- ประชุม / โหวต ----------
  startMeeting() {
    this.meetingReady = new Set();
    const extra = this.event === 'bell' ? 30000 : 0;
    this.setPhase('meeting', this.settings.meetingTime * 1000 + extra, () => this.startVote());
  }

  readyToVote(p) {
    if (this.phase !== 'meeting' || !p.alive) return;
    this.meetingReady.add(p.id);
    this.sync();
    if (this.alive().every((x) => this.meetingReady.has(x.id))) this.advance();
  }

  startVote() {
    this.votes = new Map();
    this.setPhase('vote', DUR.vote, () => this.resolveVote());
  }

  castVote(p, targetId) {
    if (this.phase !== 'vote' || !p.alive) return;
    if (targetId !== 'skip') {
      const t = this.players.get(targetId);
      if (!t?.alive) return;
    }
    this.votes.set(p.id, targetId);
    if (p.role === 'alpha' && targetId !== 'skip') {
      for (const w of this.alive().filter((x) => this.isPack(x))) {
        this.note(w, `เสียงหอนสั่งให้โหวต ${this.players.get(targetId).name}`, 'wolf', null, targetId);
      }
    }
    this.sync();
    if (this.alive().every((x) => this.votes.has(x.id))) this.advance();
  }

  resolveVote() {
    const tally = {};
    for (const t of this.votes.values()) tally[t] = (tally[t] || 0) + 1;
    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    let hanged = null;
    if (sorted.length && sorted[0][0] !== 'skip' && (sorted.length === 1 || sorted[0][1] > sorted[1][1])) {
      hanged = sorted[0][0];
    }
    this.voteResult = { hanged, tally };
    if (hanged) {
      const t = this.players.get(hanged);
      this.kill(t, 'ถูกชาวบ้านโหวตแขวนคอ', 'vote');
      if (t.role === 'jester') {
        this.voteResult.jester = true;
        return this.setPhase('voteResult', DUR.voteResult, () => this.end('jester'));
      }
    } else {
      this.record('ไม่มีใครถูกแขวนคอ');
    }
    this.setPhase('voteResult', DUR.voteResult, () => this.afterDeaths(() => this.checkWin() || this.startDay()));
  }

  // ---------- ชนะ / จบเกม ----------
  checkWin() {
    const alive = this.alive();
    const wolves = alive.filter((p) => this.isWolf(p)).length;
    if (wolves === 0) return this.end('village', 'กำจัดหมาป่าได้หมดแล้ว');
    if (this.bar.value >= this.bar.target) return this.end('village', 'ทำเควสจนครบ ทำพิธีขับไล่หมาป่าสำเร็จ');
    if (wolves >= alive.length - wolves) return this.end('wolf', 'หมาป่ามีจำนวนเท่ากับชาวบ้านแล้ว');
    return false;
  }

  end(winner, reason = 'คนบ้าหลอกให้ทุกคนแขวนคอตัวเองได้สำเร็จ') {
    this.winner = winner;
    this.winReason = reason;
    this.record('จบเกม: ' + reason);
    this.setPhase('ended', 0, null);
    this.hooks.onEnd?.();
    return true;
  }

  // ---------- แชทในเกม ----------
  chatChannel(p) {
    if (this.phase === 'ended') return 'all';
    if (!p.alive) return this.settings.ghostChat ? 'ghost' : null;
    if (['meeting', 'vote', 'voteResult'].includes(this.phase)) return 'all';
    if (this.phase === 'night' && this.night?.interrogate?.includes(p.id)) return 'interrogate';
    return null;
  }

  chatTargets(p, channel) {
    const all = [...this.players.values()];
    if (channel === 'all') return all;
    if (channel === 'ghost') return all.filter((x) => !x.alive);
    if (channel === 'interrogate') return this.night.interrogate.map((id) => this.players.get(id));
    return [];
  }

  // ---------- มุมมองของผู้เล่นแต่ละคน ----------
  view(id) {
    const me = this.players.get(id);
    const ended = this.phase === 'ended';
    const showRole = (p) =>
      ended || p.id === id || (!p.alive && this.settings.revealRoleOnDeath) || me?.knownWolves.has(p.id);
    const v = {
      phase: this.phase,
      day: this.day,
      endsAt: this.endsAt,
      duration: this.duration,
      serverNow: Date.now(),
      bar: this.bar,
      settings: { voiceMode: this.settings.voiceMode, ghostChat: this.settings.ghostChat, outfitChange: this.settings.outfitChange },
      players: [...this.players.values()].map((p) => ({
        id: p.id,
        name: p.name,
        outfit: p.outfit,
        alive: p.alive,
        hp: p.hp,
        connected: this.room.members.get(p.id)?.connected ?? false,
        role: showRole(p) ? p.role : null,
        picked: this.phase === 'day' ? this.hasPicked(p) : undefined,
        worked: this.phase === 'work' ? p.workScore !== null && !p.outfitPending : undefined,
      })),
      events: this.lastEvents,
      event: this.event || 'normal',
    };
    if (me) {
      v.me = {
        id,
        role: me.role,
        roleName: ROLES[me.role].name,
        team: ROLES[me.role].team,
        alive: me.alive,
        hp: me.hp,
        knownWolves: [...me.knownWolves],
        journal: me.journal,
        chat: this.chatChannel(me),
      };
      if (this.phase === 'day' && me.alive) v.me.hand = me.hand;
      if (this.phase === 'day') {
        v.me.pick = me.pick;
        if (me.role === 'alpha') v.me.lurk = me.lurk ?? null;
      }
      if (this.phase === 'work' && me.alive) {
        v.me.work = { loc: me.pick, done: me.workScore !== null, needOutfit: !!me.outfitPending, outfitLimit: this.event === 'merchant' ? 2 : 1, lurk: me.role === 'alpha' && !!me.lurk };
        if (v.me.work.lurk) v.me.work.targets = this.ambushTargets;
        if (v.me.work.lurk && this.ambushChoice !== undefined) v.me.work.ambushed = this.ambushChoice;
        if (me.role === 'alpha' && this.ambushChoice === undefined) v.ambush = { targets: this.ambushTargets };
      }
      if (this.phase === 'dayResult') v.me.dayResult = this.dayResults?.[id] || null;
      if (this.lovers?.includes(id)) v.me.lover = this.lovers.find((x) => x !== id);
      if (this.phase === 'night' && me.alive && this.nightActors().includes(me)) {
        v.me.nightAction = {
          role: me.role,
          mode: me.role === 'alpha' && this.alphaSniffs() ? 'sniff' : undefined,
          done: this.night.done.has(id),
          blocked: me.role === 'doctor' ? me.lastProtect : me.role === 'detective' ? me.lastDetectiveTarget : null,
        };
      }
      // ทั้งนักสืบและคนที่ถูกเรียก (อาชีพอะไรก็ได้) ต้องรู้ว่ากำลังคุยกับใคร
      if (this.phase === 'night' && me.alive && this.night.interrogate?.includes(id)) {
        v.me.interrogation = this.night.interrogate.find((x) => x !== id);
      }
      if (this.phase === 'hunter') v.hunter = { id: this.hunterId };
      if (this.phase === 'chase') v.chase = this.chaseView(id);
      if (!me.alive) {
        v.me.death = me.death || null;
        if (me.watching && !ended) v.spectate = this.spectateView(me.watching);
      }
    }
    if (this.phase === 'meeting') v.meetingReady = [...this.meetingReady];
    if (this.phase === 'vote' || this.phase === 'voteResult') v.votes = Object.fromEntries(this.votes);
    if (this.phase === 'voteResult') v.voteResult = this.voteResult;
    if (this.lastShot) v.shot = this.lastShot;
    if (ended) {
      v.winner = this.winner;
      v.winReason = this.winReason;
      v.log = this.log;
    }
    return v;
  }

  // สิ่งที่ผีเห็นเมื่อติดตามผู้เล่นคนหนึ่ง: อาชีพ สิ่งที่กำลังทำ และสมุดบันทึกของเขา
  spectateView(tid) {
    const t = this.players.get(tid);
    if (!t) return null;
    const s = {
      id: t.id,
      name: t.name,
      role: t.role,
      roleName: ROLES[t.role].name,
      team: ROLES[t.role].team,
      alive: t.alive,
      hp: t.hp,
      knownWolves: [...t.knownWolves],
      journal: t.journal.slice(-14),
      lover: this.lovers?.includes(tid) ? this.lovers.find((x) => x !== tid) : null,
    };
    if (!t.alive) return s;
    if (this.phase === 'day') {
      s.hand = t.hand || null;
      s.pick = t.pick || null;
    }
    if (this.phase === 'work' || this.phase === 'chase') {
      s.work = { loc: t.pick, done: t.workScore !== null, score: t.workScore };
      if (t.role === 'alpha' && t.lurk) s.work.ambush = this.ambushChoice === undefined ? 'choosing' : this.ambushChoice || 'none';
    }
    if (this.phase === 'dayResult') s.dayResult = this.dayResults?.[tid] || null;
    if (this.phase === 'night' && this.night) {
      const n = this.night;
      const acts = this.nightActors().includes(t);
      const frame = n.frames?.find((f) => f.by === tid)?.target;
      const target = { alpha: n.kill, seer: n.see, doctor: n.protect, watchman: n.watch, priest: n.revive, detective: n.interrogate?.[1], cupid: n.lovers, wolf: frame, shadow: frame }[t.role];
      s.night = { acts, done: n.done.has(tid), target: acts && n.done.has(tid) ? target ?? n.sniff ?? 'skip' : null };
      if (t.role === 'alpha' && this.alphaSniffs()) s.night.mode = 'sniff';
      if (n.interrogate?.includes(tid)) s.night.interrogate = n.interrogate.find((x) => x !== tid);
    }
    if (this.phase === 'vote' || this.phase === 'voteResult') s.vote = this.votes.get(tid) || null;
    return s;
  }

  watch(p, target) {
    if (p.alive || this.phase === 'ended') return;
    p.watching = target && target !== p.id && this.players.has(target) ? target : null;
    this.hooks.send(p.id, 'game:state', this.view(p.id));
  }

  sync() {
    for (const id of this.players.keys()) this.hooks.send(id, 'game:state', this.view(id));
    this.hooks.onSync?.();
  }

  // ---------- คำสั่งจากผู้เล่น ----------
  handle(id, action, data) {
    const p = this.players.get(id);
    if (!p) return;
    if (action === 'pick') this.pickCard(p, data);
    else if (action === 'mode') this.chooseMode(p, data);
    else if (action === 'ambush') this.chooseAmbush(p, data ?? null);
    else if (action === 'work') this.submitWork(p, data);
    else if (action === 'outfit') this.changeOutfit(p, data);
    else if (action === 'night') this.nightAction(p, data);
    else if (action === 'hunter') this.chooseHunterTarget(p, data);
    else if (action === 'readyVote') this.readyToVote(p);
    else if (action === 'vote') this.castVote(p, data);
    else if (action === 'chase') this.chaseAction(p, data);
    else if (action === 'watch') this.watch(p, data);
  }

  playerLeft(id) {
    const p = this.players.get(id);
    if (!p?.alive || this.phase === 'ended') return;
    this.kill(p, 'หนีออกจากหมู่บ้าน', 'left');
    if (this.hunterId === id) this.hunterShoot(null);
    if (this.phase === 'work' && p.role === 'alpha' && this.ambushChoice === undefined) this.ambushChoice = null;
    if (this.phase === 'chase' && this.chase && !this.chase.result && (id === this.chase.a || id === this.chase.victim)) {
      this.chaseResult(id === this.chase.a ? 'escaped' : 'caught', 'left');
    }
    if (!this.checkWin()) this.sync();
  }
}

module.exports = { Game, ROLES, LOCATIONS, CHASE, makeClue, assignRoles, wolfCount, roleSetting, roleMax };
