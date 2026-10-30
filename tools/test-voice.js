// ทดสอบสิทธิ์เสียง: ใครพูดได้ / ได้ยินใคร ในแต่ละเฟส และการส่งต่อสัญญาณ WebRTC
// ใช้: node tools/test-voice.js (เปิดเซิร์ฟเวอร์ทดสอบเองที่พอร์ต 3998 แบบเร่งเวลา)
const { spawn } = require('child_process');
const path = require('path');
const { io } = require('socket.io-client');
const { think } = require('../server/brain');

const PORT = 3998;
const URL = `http://localhost:${PORT}`;
const server = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
  env: { ...process.env, PORT, GAME_SPEED: '25' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverErr = '';
server.stderr.on('data', (d) => (serverErr += d));

let passed = 0;
let failed = 0;
const check = (name, cond, extra = '') => {
  cond ? passed++ : failed++;
  console.log(`${cond ? 'ผ่าน' : 'ไม่ผ่าน'}  ${name}${extra ? '  ' + extra : ''}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function client(i) {
  const s = io(URL, { forceNew: true, transports: ['websocket'] });
  s.pid = `v${i}`;
  s.voice = null;
  s.signals = [];
  s.peerEvents = [];
  s.call = (ev, data) => new Promise((res) => (data === undefined ? s.emit(ev, res) : s.emit(ev, data, res)));
  s.act = (type, target) => s.emit('game:action', { type, target });
  s.on('voice:state', (v) => (s.voice = v));
  s.on('voice:signal', (m) => s.signals.push(m));
  s.on('voice:peer-joined', (m) => s.peerEvents.push(['joined', m.id]));
  s.on('voice:peer-left', (m) => s.peerEvents.push(['left', m.id]));
  let last = '';
  s.on('game:state', (v) => {
    s.state = v;
    const key = v.phase + v.day + (v.hunter?.id || '');
    if (key !== last) {
      last = key;
      setTimeout(() => think(s, v), 10);
    }
  });
  return s;
}

(async () => {
  await wait(800);
  const c = Array.from({ length: 5 }, (_, i) => client(i));
  await Promise.all(c.map((s, i) => s.call('hello', { playerId: s.pid, name: 'เสียง' + i, outfit: {} })));
  const room = await c[0].call('room:create', { name: 'voice', settings: { meetingTime: 60, cardTime: 20 } });
  for (const s of c.slice(1)) await s.call('room:join', { code: room.code });

  check('เข้าระบบเสียงไม่ได้ถ้ายังไม่อยู่ในห้อง', !(await client(9).call('voice:join')).ok);
  const j0 = await c[0].call('voice:join');
  const j1 = await c[1].call('voice:join');
  check('คนแรกเข้าเสียง ยังไม่มีคนอื่น', j0.ok && j0.members.length === 0);
  check('คนที่สองได้รายชื่อคนที่อยู่ก่อน', j1.ok && j1.members.includes('v0'));
  for (const s of c.slice(2)) await s.call('voice:join');
  await wait(150);
  check('คนเก่าได้รับแจ้งเมื่อมีคนเข้าเสียง', c[0].peerEvents.filter((e) => e[0] === 'joined').length === 4);
  check('ห้องรอ: ทุกคนพูดได้และได้ยินกันครบ', c.every((s) => s.voice?.canSpeak && s.voice.hear.length === 4));

  // ส่งต่อสัญญาณ
  c[0].emit('voice:signal', { to: 'v1', data: { sdp: 'test-offer' } });
  c[0].emit('voice:signal', { to: 'nobody', data: { sdp: 'x' } });
  await wait(150);
  check('ส่งต่อสัญญาณถึงผู้รับถูกคน พร้อมบอกผู้ส่ง', c[1].signals.some((m) => m.from === 'v0' && m.data.sdp === 'test-offer'));
  check('สัญญาณถึงคนนอกระบบเสียงถูกทิ้ง', c.every((s) => !s.signals.some((m) => m.data.sdp === 'x')));

  // ออกจากเสียงแล้วกลับเข้า
  c[4].emit('voice:leave');
  await wait(150);
  check('คนอื่นได้รับแจ้งเมื่อมีคนออกจากเสียง', c[0].peerEvents.some((e) => e[0] === 'left' && e[1] === 'v4'));
  check('ไม่มีใครได้ยินคนที่ออกไปแล้ว', c.slice(0, 4).every((s) => !s.voice.hear.includes('v4')));
  await c[4].call('voice:join');

  // เริ่มเกม แล้วตรวจสิทธิ์ตามเฟส
  c.slice(1).forEach((s) => s.emit('room:ready', true));
  await wait(100);
  check('เริ่มเกมได้', (await c[0].call('room:start')).ok);
  const seen = {};
  const problems = new Set();
  // ข้อความ game:state กับ voice:state มาติดกันแต่ไม่พร้อมกันเป๊ะ จึงนับว่าผิดเมื่อเห็นซ้ำหลายรอบติดกัน
  const streak = {};
  const flag = (key, bad) => {
    streak[key] = bad ? (streak[key] || 0) + 1 : 0;
    if (streak[key] >= 3) problems.add(key.split('#')[0]);
  };
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    await wait(60);
    const v = c[0].state;
    if (!v) continue;
    const phase = v.phase;
    for (const s of c) {
      const st = s.state;
      if (!st || st.phase !== phase || !s.voice) continue;
      const me = st.players.find((p) => p.id === s.pid);
      seen[phase] = true;
      const k = '#' + s.pid;
      flag(`${phase}: คนเป็นพูดได้ทั้งที่ไม่ควร` + k, ['day', 'work', 'dayResult', 'dawn'].includes(phase) && me.alive && s.voice.canSpeak);
      flag('night: คนเป็นพูดได้ทั้งที่ไม่ได้สอบปากคำ' + k, phase === 'night' && me.alive && s.voice.canSpeak && !st.me.interrogation);
      flag(`${phase}: คนเป็นพูดไม่ได้` + k, ['meeting', 'vote'].includes(phase) && me.alive && !s.voice.canSpeak);
      flag(`${phase}: คนตายพูดในห้องประชุมได้` + k, ['meeting', 'vote'].includes(phase) && !me.alive && s.voice.channel === 'all');
      // ระหว่างเกม คนเป็นต้องไม่ได้ยินคนตาย (จบเกมแล้วคุยกันได้หมด)
      const deadHeard = phase !== 'ended' && me.alive && s.voice.hear.some((id) => !st.players.find((p) => p.id === id).alive);
      flag(`${phase}: คนเป็นได้ยินเสียงผี` + k, deadHeard);
      // คนตายได้ยินที่ประชุม
      const aliveIds = st.players.filter((p) => p.alive && p.id !== s.pid).map((p) => p.id);
      flag('vote: คนตายไม่ได้ยินการประชุม' + k, !me.alive && phase === 'vote' && !aliveIds.every((id) => s.voice.hear.includes(id)));
    }
    if (v.phase === 'ended') break;
  }
  check('เกมจบ', c[0].state?.phase === 'ended');
  check('ผ่านเฟสประชุม/โหวตและกลางคืน', (seen.vote || seen.meeting) && seen.night, Object.keys(seen).join(','));
  check('สิทธิ์เสียงถูกต้องทุกเฟส', problems.size === 0, [...problems].slice(0, 5).join(' | '));
  await wait(300);
  check('จบเกมแล้วทุกคนพูดได้อีก', c.every((s) => s.voice?.canSpeak));

  // ห้องพิมพ์อย่างเดียว
  c[0].emit('game:lobby');
  await wait(200);
  c[0].emit('room:settings', { settings: { voiceMode: 'text' } });
  await wait(200);
  check('ตั้งห้องเป็นพิมพ์อย่างเดียว: ปิดเสียงทุกคน', c.every((s) => s.voice && !s.voice.canSpeak && s.voice.hear.length === 0));
  check('ห้องพิมพ์อย่างเดียว: เข้าเสียงใหม่ไม่ได้', !(await c[1].call('voice:join')).ok);

  console.log(`\nรวม: ผ่าน ${passed}  ไม่ผ่าน ${failed}`);
  if (serverErr) console.log('ข้อผิดพลาดจากเซิร์ฟเวอร์:\n' + serverErr.slice(0, 2000));
  server.kill();
  process.exit(failed || serverErr ? 1 : 0);
})();
