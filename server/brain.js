// สมองบอท: เล่นตามกติกา ใช้เบาะแสในสมุดบันทึกจับผิด หมาป่าบอทไม่หักหลังพวกเดียวกัน
// ใช้ทั้งบอทในห้อง (server/bots.js) และเครื่องมือทดสอบ
// s.state คือสถานะล่าสุด (ใช้ตอนตัดสินใจทีหลัง เช่น ตอนโหวตจะได้เห็นว่าคนอื่นโหวตใครไปแล้ว)
const rand = (a) => a[Math.floor(Math.random() * a.length)];
const WOLF_TEAM = ['alpha', 'wolf', 'shadow', 'traitor'];
const TALK = ['{x} ไปไหนมาเมื่อวาน?', 'ใครโดนทำร้ายบ้าง', 'อย่าเพิ่งรีบโหวตนะ', 'ฉันเป็นชาวบ้านธรรมดา!', 'มีใครเห็นอะไรแปลก ๆ ไหม'];
const BLUFF = ['ฉันว่า {x} น่าสงสัยนะ', 'เมื่อวาน {x} ทำตัวแปลก ๆ', 'ฉันอยู่ทุ่งนาทั้งวัน ไม่เห็นอะไรเลย', 'โหวต {x} ไหม?'];

// คะแนนความน่าสงสัยของแต่ละคน จากเบาะแสชุด ข่าวลือ และผลส่องของหมอดู
function suspicion(v) {
  const me = v.me;
  const others = v.players.filter((p) => p.alive && p.id !== me.id);
  const score = Object.fromEntries(others.map((p) => [p.id, 0]));
  for (const j of me.journal) {
    if (j.clue && (j.kind === 'clue' || j.kind === 'rumor')) {
      const match = others.filter((p) => j.clue.values.includes(p.outfit[j.clue.part]));
      // เบาะแสที่ตรงกับทุกคนไม่ได้บอกอะไร
      if (match.length && match.length < others.length) {
        const w = (j.kind === 'clue' ? 2 : 1) / match.length;
        match.forEach((p) => (score[p.id] += w));
      }
    }
    if (j.who && score[j.who] !== undefined && me.role === 'seer') score[j.who] += j.kind === 'danger' ? 10 : -10;
  }
  return score;
}

function topSuspect(v) {
  const score = suspicion(v);
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= 0.9 ? { id: best[0], score: best[1] } : null;
}

// เสียงที่โหวตไปแล้วมากที่สุด (ไว้ตามน้ำ)
function leader(v, allowed) {
  const tally = {};
  for (const t of Object.values(v.votes || {})) if (t !== 'skip' && allowed(t)) tally[t] = (tally[t] || 0) + 1;
  const best = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= 2 ? best[0] : null;
}

function chooseVote(v) {
  const me = v.me;
  const others = v.players.filter((p) => p.alive && p.id !== me.id);
  if (!others.length) return 'skip';
  const known = new Set(me.knownWolves || []);
  if (me.role === 'jester') return rand(others).id;
  if (WOLF_TEAM.includes(me.role)) {
    // ทำตามเสียงหอนของจ่าฝูงวันนี้
    const howl = [...me.journal].reverse().find((j) => j.kind === 'wolf' && j.who && j.day === v.day);
    if (howl && others.some((p) => p.id === howl.who)) return howl.who;
    const safe = others.filter((p) => !known.has(p.id));
    if (!safe.length) return 'skip';
    const lead = leader(v, (id) => safe.some((p) => p.id === id));
    if (lead && Math.random() < 0.7) return lead;
    return rand(safe).id;
  }
  const top = topSuspect(v);
  if (top) return top.id;
  const lead = leader(v, (id) => id !== me.id);
  if (lead && Math.random() < 0.6) return lead;
  return Math.random() < 0.45 ? 'skip' : rand(others).id;
}

// สิ่งที่บอทจะพูดตอนประชุม
function meetingLines(v) {
  const me = v.me;
  const others = v.players.filter((p) => p.alive && p.id !== me.id);
  const name = (id) => v.players.find((p) => p.id === id)?.name;
  const lines = [];
  if (WOLF_TEAM.includes(me.role)) {
    const known = new Set(me.knownWolves || []);
    const target = rand(others.filter((p) => !known.has(p.id)));
    if (target) lines.push(rand(BLUFF).replace('{x}', target.name));
    return lines;
  }
  const seen = [...me.journal].reverse().find((j) => me.role === 'seer' && j.who && j.kind === 'danger' && others.some((p) => p.id === j.who));
  if (seen) lines.push(`ลูกแก้วบอกว่า ${name(seen.who)} เป็นหมาป่า! โหวตเขาเลย`);
  const clue = [...me.journal].reverse().find((j) => j.kind === 'clue' && j.clue && j.day >= v.day - 1);
  if (clue) {
    const i = clue.text.lastIndexOf(': ');
    lines.push('ฉันเห็นมากับตา: ' + (i >= 0 ? clue.text.slice(i + 2) : clue.text));
  }
  const top = topSuspect(v);
  if (top) lines.push(`ชุดของ ${name(top.id)} ตรงกับเบาะแสเลยนะ`);
  if (!lines.length && others.length) lines.push(rand(TALK).replace('{x}', rand(others).name));
  return lines;
}

function think(s, v, { slow = false } = {}) {
  const me = v.me;
  if (!me) return;
  const wait = (ms, fn) => setTimeout(fn, slow ? ms : 5 + Math.random() * 30);
  const now = () => (s.state?.phase === v.phase && s.state?.day === v.day ? s.state : v);
  const alive = v.players.filter((p) => p.alive);
  const others = alive.filter((p) => p.id !== me.id);
  const known = new Set(me.knownWolves || []);
  if (v.phase === 'day' && me.alive && me.hand) {
    const forest = me.role === 'alpha' ? 0.5 : 0.3;
    wait(2500 + Math.random() * 5000, () => {
      s.act('pick', Math.random() < forest && me.hand.includes('forest') ? 'forest' : rand(me.hand));
      // จ่าฝูงบอทส่วนใหญ่ซุ่ม บางวันทำงานปกติเพื่อสร้างพยาน
      if (me.role === 'alpha') s.act('mode', Math.random() < 0.75 ? 'lurk' : 'work');
    });
  } else if (v.phase === 'work' && me.work && !me.work.done) {
    if (v.ambush?.targets) {
      const pool = v.ambush.targets.filter((id) => !known.has(id));
      wait(2000, () => s.act('ambush', pool.length && Math.random() < 0.85 ? rand(pool) : null));
    }
    wait(4000 + Math.random() * 9000, () => {
      // บอทเล่นมินิเกมได้พอใช้ (ไม่ได้ห่วยหรือเก่งเกินไป)
      if (!me.work.lurk) s.act('work', 0.35 + Math.random() * 0.6);
      if (me.work.needOutfit) {
        // หมาป่าเปลี่ยนชุดหนีเบาะแสบ่อยกว่า
        const p = WOLF_TEAM.includes(me.role) ? 0.7 : 0.3;
        const part = rand(['hat', 'hair', 'shirt', 'item', 'face']);
        const change = Math.random() < p ? { part, value: Math.floor(Math.random() * (part === 'face' ? 5 : 8)) } : null;
        s.act('outfit', change);
      }
    });
  } else if (v.phase === 'chase' && v.chase && v.chase.role !== 'watch') {
    chase(s, v.chase, slow);
  } else if (v.phase === 'night' && me.nightAction && !me.nightAction.done) {
    const dead = v.players.filter((p) => !p.alive);
    const blocked = me.nightAction.blocked;
    let pick = null;
    if (me.role === 'priest') {
      wait(3000, () => s.act('night', dead.length && Math.random() < 0.5 ? rand(dead).id : 'skip'));
      return;
    } else if (me.role === 'cupid') {
      const two = [...alive].sort(() => Math.random() - 0.5).slice(0, 2).map((p) => p.id);
      wait(3000, () => two.length === 2 && s.act('night', two));
      return;
    } else if (me.role === 'alpha') {
      pick = rand(others.filter((p) => !known.has(p.id)));
    } else if (me.role === 'wolf' || me.role === 'shadow') {
      // ลูกฝูงใส่ร้ายคนที่ไม่ใช่พวกเดียวกัน บางคืนไม่ออกไป
      if (Math.random() < 0.2) return wait(3000, () => s.act('night', 'skip'));
      pick = rand(others.filter((p) => !known.has(p.id)));
    } else if (me.role === 'seer') {
      // ไม่ส่องคนที่เคยส่องแล้ว
      const checked = new Set(me.journal.filter((j) => j.who).map((j) => j.who));
      pick = rand(others.filter((p) => !checked.has(p.id))) || rand(others);
    } else if (me.role === 'doctor') {
      pick = Math.random() < 0.35 && blocked !== me.id ? alive.find((p) => p.id === me.id) : rand(alive.filter((p) => p.id !== blocked));
    } else {
      const top = topSuspect(v);
      pick = (top && top.id !== blocked && others.find((p) => p.id === top.id)) || rand(others.filter((p) => p.id !== blocked));
    }
    wait(3000 + Math.random() * 4000, () => pick && s.act('night', pick.id));
  } else if (v.phase === 'night' && me.interrogation) {
    wait(1500, () => s.emit('room:chat', 'ฉันบริสุทธิ์นะ ไม่ได้ทำอะไรเลย'));
  } else if (v.phase === 'hunter' && v.hunter?.id === me.id) {
    const top = topSuspect(v);
    wait(3000, () => others.length && s.act('hunter', top?.id || rand(others).id));
  } else if (v.phase === 'meeting' && me.alive) {
    meetingLines(v).forEach((line, i) => wait(1500 + i * 3500 + Math.random() * 3000, () => s.emit('room:chat', line)));
    if (Math.random() < 0.5) wait(3000 + Math.random() * 6000, () => s.emit('room:emote', rand(['laugh', 'angry', 'what', 'shock', 'wave'])));
    wait(9000 + Math.random() * 8000, () => s.act('readyVote'));
  } else if (v.phase === 'vote' && me.alive) {
    // ลูกฝูงรอฟังเสียงหอนของจ่าฝูงก่อน
    const delay = me.role === 'alpha' ? 1500 + Math.random() * 3000 : 4000 + Math.random() * 9000;
    wait(delay, () => s.act('vote', chooseVote(now())));
  }
}

// ไล่ล่าสด: กดวิ่งเป็นจังหวะ กระโดดข้ามท่อนไม้ จ่าฝูงตะครุบเมื่อเข้าใกล้ คนรอบข้างปาหินช่วย
// s.chase คือสถานะล่าสุดจากเซิร์ฟเวอร์ (game:chase)
function chase(s, c, slow) {
  const off = c.serverNow - Date.now();
  const local = (t) => t - off;
  const end = local(c.runEnd) + 300;
  const scale = c.speed || 1;
  const gap = slow ? 105 + Math.random() * 60 : 70 / scale;
  const startIn = Math.max(0, local(c.startAt) - Date.now());
  const live = () => s.chase || c;
  if (c.role === 'victim') {
    for (const o of c.obstacles) {
      if (Math.random() < 0.72) setTimeout(() => s.act('chase', 'jump'), Math.max(0, local(o.at) - Date.now() - (slow ? 120 + Math.random() * 200 : 0)));
    }
  }
  setTimeout(() => {
    const iv = setInterval(() => {
      const now = live();
      if (Date.now() > end || now.result) return clearInterval(iv);
      if (c.role === 'victim') s.act('chase', 'run');
      else if (c.role === 'hunter') {
        if (!now.pounced && now.dist <= now.reach - 3 && Math.random() < 0.3) s.act('chase', 'pounce');
        else s.act('chase', 'hunt');
      } else if (c.role === 'helper' && Math.random() < (slow ? 0.1 : 0.5)) s.act('chase', 'help');
    }, gap);
  }, startIn);
}

module.exports = { think, suspicion, chooseVote };
