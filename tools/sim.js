// จำลองเกมเต็ม ๆ ด้วยบอทหลายรอบ เพื่อหาบั๊กและดูสมดุล
// ใช้: node tools/sim.js [จำนวนเกม] [จำนวนผู้เล่น]
// จะเปิดเซิร์ฟเวอร์แยกที่พอร์ต 3999 แบบเร่งเวลา แล้วปิดเองเมื่อจบ
const { spawn } = require('child_process');
const path = require('path');
const { io } = require('socket.io-client');
const { think } = require('../server/brain');

const GAMES = Number(process.argv[2] || 20);
const SIZES = process.argv[3] ? [Number(process.argv[3])] : [4, 5, 6, 8, 10, 12];
const PORT = Number(process.env.SIM_PORT || 3999);
const URL = `http://localhost:${PORT}`;

const server = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
  env: { ...process.env, PORT, GAME_SPEED: '40' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverErrors = '';
server.stderr.on('data', (d) => (serverErrors += d));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const stats = { games: 0, winners: {}, days: [], problems: [] };

function bot(i, gameNo) {
  const s = io(URL, { forceNew: true, transports: ['websocket'] });
  s.pid = `sim${gameNo}_${i}`;
  s.state = null;
  s.call = (ev, data) => new Promise((res) => (data === undefined ? s.emit(ev, res) : s.emit(ev, data, res)));
  s.act = (type, target) => s.emit('game:action', { type, target });
  s.on('game:chase', (c) => (s.chase = c));
  s.on('game:state', (v) => {
    if (v.phase !== 'chase') s.chase = null;
    const prev = s.state;
    s.state = v;
    if (prev?.phase === v.phase && prev?.day === v.day) return;
    setTimeout(() => think(s, v), 5 + Math.random() * 30);
  });
  return s;
}

const mismatchStreak = {};
function checkInvariants(views, gameNo) {
  const v = views[0];
  if (!v) return;
  const aliveIds = v.players.filter((p) => p.alive).map((p) => p.id).sort().join();
  // ข้อความถึงแต่ละคนอาจมาไม่พร้อมกันนิดหน่อย จึงนับว่าผิดเมื่อไม่ตรงกันต่อเนื่องหลายรอบเท่านั้น
  const mismatch = views.some((o) => o.players.filter((p) => p.alive).map((p) => p.id).sort().join() !== aliveIds);
  mismatchStreak[gameNo] = mismatch ? (mismatchStreak[gameNo] || 0) + 1 : 0;
  if (mismatchStreak[gameNo] >= 5) stats.problems.push(`เกม ${gameNo}: ผู้เล่นแต่ละคนเห็นคนรอดไม่ตรงกัน`);
  for (const o of views) {
    if (o.phase !== 'ended') {
      const leaked = o.players.filter((p) => p.alive && p.role && p.id !== o.me.id && !o.me.knownWolves.includes(p.id));
      if (leaked.length) stats.problems.push(`เกม ${gameNo}: อาชีพของคนที่ยังรอดรั่ว (${o.phase})`);
    }
  }
}

async function playGame(gameNo, n) {
  const bots = Array.from({ length: n }, (_, i) => bot(i, gameNo));
  await Promise.all(bots.map((b, i) => b.call('hello', {
    playerId: b.pid,
    name: 'บอท' + i,
    outfit: { hat: (i * 3) % 8, hair: (i * 5) % 8, shirt: (i * 7) % 8, item: (i * 3 + 1) % 8, face: i % 5, skin: i % 5 },
  })));
  const created = await bots[0].call('room:create', { name: 'sim', settings: { maxPlayers: 12, meetingTime: 60, cardTime: 20 } });
  for (const b of bots.slice(1)) await b.call('room:join', { code: created.code });
  bots.slice(1).forEach((b) => b.emit('room:ready', true));
  await wait(50);
  const started = await bots[0].call('room:start');
  if (!started.ok) {
    stats.problems.push(`เกม ${gameNo}: เริ่มไม่ได้ ${started.error}`);
    bots.forEach((b) => b.close());
    return;
  }
  // ให้บอทหนึ่งตัวหลุดแล้วกลับมากลางเกมบ้าง
  if (gameNo % 4 === 1) {
    setTimeout(async () => {
      const b = bots[n - 1];
      b.disconnect();
      await wait(100);
      b.connect();
      await b.call('hello', { playerId: b.pid, name: 'บอทกลับมา', outfit: {} });
    }, 300);
  }
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    await wait(100);
    checkInvariants(bots.map((b) => b.state).filter(Boolean), gameNo);
    const v = bots[0].state;
    if (v?.phase === 'ended') {
      stats.games++;
      stats.winners[v.winner] = (stats.winners[v.winner] || 0) + 1;
      stats.days.push(v.day);
      const bySize = ((stats.bySize ||= {})[n] ||= { wolf: 0, village: 0, jester: 0, days: 0 });
      bySize[v.winner]++;
      bySize.days += v.day;
      (stats.reasons ||= {})[v.winReason] = ((stats.reasons ||= {})[v.winReason] || 0) + 1;
      for (const l of v.log || []) if (l.text.startsWith('สถานการณ์วันนี้')) (stats.events ||= {})[l.text.slice(17)] = ((stats.events ||= {})[l.text.slice(17)] || 0) + 1;
      for (const kw of ['ชุบชีวิต', 'ตรอมใจ', 'ทหารยาม', 'ขึ้นเป็นจ่าฝูง', 'นายพรานยิง', 'หนีรอดจากจ่าฝูง', 'ถูกจ่าฝูงทำร้าย', 'ถูกฝูงหมาป่ารุม', 'ใส่ร้าย']) {
        const n = (v.log || []).filter((l) => l.text.includes(kw)).length;
        if (n) (stats.kw ||= {})[kw] = ((stats.kw ||= {})[kw] || 0) + n;
      }
      for (const p of v.players) (stats.roles ||= {})[p.role] = ((stats.roles ||= {})[p.role] || 0) + 1;
      stats.outfitChanges = (stats.outfitChanges || 0) + (v.log || []).filter((l) => l.text.includes(' เปลี่ยน')).length;
      if (v.players.filter((p) => p.alive && p.role === 'alpha').length > 1) stats.problems.push(`เกม ${gameNo}: จ่าฝูงที่ยังรอดมากกว่า 1`);
      break;
    }
  }
  if (bots[0].state?.phase !== 'ended') stats.problems.push(`เกม ${gameNo}: ค้าง (เฟส ${bots[0].state?.phase} วัน ${bots[0].state?.day})`);
  // ทดสอบกลับห้องรอ
  bots[0].emit('game:lobby');
  await wait(80);
  bots.forEach((b) => b.close());
}

(async () => {
  await wait(800);
  for (let g = 0; g < GAMES; g++) {
    const n = SIZES[g % SIZES.length];
    await playGame(g, n);
    process.stdout.write('.');
  }
  console.log('\nจำนวนเกมที่จบ:', stats.games, '/', GAMES);
  console.log('ผู้ชนะ:', stats.winners);
  const avg = stats.days.reduce((a, b) => a + b, 0) / (stats.days.length || 1);
  console.log('จำนวนครั้งที่เปลี่ยนชุด:', stats.outfitChanges || 0);
  console.log('ความสามารถที่เกิดขึ้น:', JSON.stringify(stats.kw || {}));
  console.log('อาชีพที่สุ่มได้:', JSON.stringify(stats.roles || {}));
  console.log('สถานการณ์ที่สุ่มออก:', JSON.stringify(stats.events || {}));
  console.log('เหตุที่จบเกม:', JSON.stringify(stats.reasons || {}));
  for (const [n, b] of Object.entries(stats.bySize || {})) {
    const total = b.wolf + b.village + b.jester;
    console.log(`  ${n} คน: หมาป่า ${b.wolf} ชาวบ้าน ${b.village} คนบ้า ${b.jester}  เฉลี่ย ${(b.days / total).toFixed(1)} วัน`);
  }
  console.log('จำนวนวันเฉลี่ย:', avg.toFixed(1), ' ต่ำสุด', Math.min(...stats.days), ' สูงสุด', Math.max(...stats.days));
  const uniq = [...new Set(stats.problems)];
  console.log(uniq.length ? 'ปัญหา:\n' + uniq.slice(0, 20).join('\n') : 'ไม่พบปัญหา');
  if (serverErrors) console.log('ข้อผิดพลาดจากเซิร์ฟเวอร์:\n' + serverErrors.slice(0, 3000));
  server.kill();
  process.exit(uniq.length || serverErrors ? 1 : 0);
})();
