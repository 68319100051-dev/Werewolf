// ทดสอบบอทในห้อง: node tools/test-bots.js (เปิดเซิร์ฟเวอร์ทดสอบเองที่พอร์ต 3997 แบบเร่งเวลา)
const { spawn } = require('child_process');
const path = require('path');
const { io } = require('socket.io-client');

const PORT = 3997;
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

function client(id) {
  const s = io(URL, { forceNew: true, transports: ['websocket'] });
  s.call = (ev, data) => new Promise((res) => (data === undefined ? s.emit(ev, res) : s.emit(ev, data, res)));
  s.on('room:state', (r) => (s.room = r));
  s.on('game:state', (v) => (s.game = v));
  s.on('wallet', (w) => (s.wallet = w));
  s.chat = [];
  s.on('room:chat', (m) => s.chat.push(m));
  s.on('game:chat', (m) => s.chat.push(m));
  s.pid = id;
  return s;
}

(async () => {
  await wait(800);
  const host = client('h1');
  const guest = client('g1');
  await host.call('hello', { playerId: 'h1', name: 'เจ้าของ', outfit: {} });
  await guest.call('hello', { playerId: 'g1', name: 'แขก', outfit: {} });
  const room = await host.call('room:create', { name: 'bots', settings: { maxPlayers: 5 } });
  await guest.call('room:join', { code: room.code });
  check('แขกเพิ่มบอทไม่ได้', !(await guest.call('room:addBot')).ok);
  guest.emit('room:leave');
  for (let i = 0; i < 4; i++) await host.call('room:addBot');
  await wait(200);
  const bots = host.room.players.filter((p) => p.isBot);
  check('เพิ่มบอทได้ 4 ตัว (เต็มห้อง 5 คน)', bots.length === 4);
  check('ห้องเต็มแล้วเพิ่มบอทไม่ได้', !(await host.call('room:addBot')).ok);
  check('บอทกดพร้อมเอง', bots.every((b) => b.ready));
  check('ชื่อบอทไม่ซ้ำและมีป้าย (บอท)', new Set(bots.map((b) => b.name)).size === 4 && bots.every((b) => b.name.endsWith('(บอท)')));
  await wait(2500);
  check('บอททักทายในแชท', host.chat.some((m) => m.from?.startsWith('bot_')));

  host.emit('room:transfer', bots[0].id);
  await wait(100);
  check('โอนเจ้าของห้องให้บอทไม่ได้', host.room.hostId === 'h1');
  host.emit('room:kick', bots[3].id);
  await wait(100);
  check('เอาบอทออกได้', host.room.players.filter((p) => p.isBot).length === 3);

  check('เริ่มเกมกับบอทได้', (await host.call('room:start')).ok);
  // คนเล่นเฉย ๆ ให้บอทเล่นไป (ตั้งเวลาเร่ง 25 เท่า)
  const t0 = Date.now();
  while (Date.now() - t0 < 90000 && host.game?.phase !== 'ended') await wait(200);
  check('เล่นกับบอทจนจบเกม', host.game?.phase === 'ended', `วันที่ ${host.game?.day} ผู้ชนะ ${host.game?.winner}`);
  const botActs = host.game?.log?.length || 0;
  check('มีเหตุการณ์ในเกม', botActs > 2, `${botActs} รายการ`);

  // คะแนนสะสม + เล่นต่อจากหน้าจบเกม
  await wait(300);
  const st1 = host.room?.stats;
  check('จบเกมแล้วห้องบันทึกคะแนน', st1?.games === 1 && Object.values(st1.players).every((p) => p.games === 1), JSON.stringify(st1?.players?.h1 || {}));
  check('จบเกมแล้วได้เหรียญรางวัล (ตาแรกของวันได้โบนัส)', host.wallet?.reward?.total >= 60 && host.wallet.coins >= 360, `+${host.wallet?.reward?.total} รวม ${host.wallet?.coins}`);
  check('จบเกมแล้วคนต้องกดเล่นต่อใหม่ บอทพร้อมเอง', !host.room.players.find((p) => p.id === 'h1').ready && host.room.players.filter((p) => p.isBot).every((b) => b.ready));
  host.emit('game:again');
  await wait(150);
  check('ทุกคนกดเล่นต่อครบ เริ่มนับถอยหลัง', !!host.room.rematchAt);
  const t2 = Date.now();
  while (Date.now() - t2 < 5000 && host.game?.phase === 'ended') await wait(100);
  check('นับถอยหลังจบ เริ่มตาใหม่เองโดยไม่ต้องกลับห้องรอ', host.game?.phase !== 'ended' && host.room.status === 'playing');
  while (Date.now() - t2 < 90000 && host.game?.phase !== 'ended') await wait(200);
  await wait(300);
  check('ตาที่สองจบ คะแนนสะสมเป็น 2 ตา', host.room?.stats?.games === 2);
  host.emit('game:again');
  await wait(50);
  host.emit('game:again', false);
  await wait(400);
  check('กดยกเลิกเล่นต่อ หยุดนับถอยหลัง', !host.room.rematchAt && host.game?.phase === 'ended');

  host.emit('game:lobby');
  await wait(300);
  check('กลับห้องรอแล้วบอทยังพร้อมอยู่', host.room?.status === 'lobby' && host.room.players.filter((p) => p.isBot).every((b) => b.ready));
  const again = await host.call('room:start');
  check('กลับห้องรอแล้วเริ่มเกมรอบสองได้', again?.ok, again?.error || '');
  check('กดเริ่มซ้ำตอนเกมเริ่มแล้ว ไม่สร้างเกมซ้อน', !(await host.call('room:start')).ok);
  await wait(1500);
  check('เกมรอบสองเริ่มจริง', host.game && host.game.phase !== 'ended', host.game?.phase);
  const t1 = Date.now();
  while (Date.now() - t1 < 90000 && host.game?.phase !== 'ended') await wait(200);
  host.emit('game:lobby');
  await wait(300);

  // คนสุดท้ายออก ห้องต้องหายไป (ไม่ค้างแต่บอท)
  const watcher = client('w1');
  await watcher.call('hello', { playerId: 'w1', name: 'คนดู', outfit: {} });
  host.emit('room:leave');
  await wait(300);
  const list = await watcher.call('rooms:watch');
  check('เหลือแต่บอท ห้องถูกลบ', !list.some((r) => r.code === room.code));

  console.log(`\nรวม: ผ่าน ${passed}  ไม่ผ่าน ${failed}`);
  if (serverErr) console.log('ข้อผิดพลาดจากเซิร์ฟเวอร์:\n' + serverErr.slice(0, 2000));
  server.kill();
  process.exit(failed || serverErr ? 1 : 0);
})();
