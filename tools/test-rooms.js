// ทดสอบระบบห้องอัตโนมัติ: node tools/test-rooms.js (ต้องเปิดเซิร์ฟเวอร์ไว้ก่อน)
const { io } = require('socket.io-client');

const URL = process.env.URL || 'http://localhost:3000';
let passed = 0;
let failed = 0;

function check(name, cond, extra = '') {
  if (cond) passed++;
  else failed++;
  console.log(`${cond ? 'ผ่าน' : 'ไม่ผ่าน'}  ${name}${extra ? '  ' + extra : ''}`);
}

function client(name, id = `t_${name}_${Math.random().toString(36).slice(2)}`) {
  const s = io(URL, { forceNew: true });
  s.lastRoom = null;
  s.chat = [];
  s.on('room:state', (r) => (s.lastRoom = r));
  s.on('room:chat', (m) => s.chat.push(m));
  s.kicked = false;
  s.on('room:kicked', () => (s.kicked = true));
  s.call = (ev, data) => new Promise((res) => (data === undefined ? s.emit(ev, res) : s.emit(ev, data, res)));
  s.hello = () => s.call('hello', { playerId: id, name, outfit: { hat: 1, hair: 2, shirt: 0, item: 3, skin: 1 } });
  s.pid = id;
  return s;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const host = client('โฮสต์');
  await host.hello();
  check('ล็อกอินชื่อว่างไม่ได้', !(await client('').call('hello', { playerId: 'x', name: '  ' })).ok);

  const created = await host.call('room:create', { name: 'ห้องทดสอบ', password: 'abc', isPublic: true, settings: { maxPlayers: 5 } });
  check('สร้างห้องได้', created.ok && /^[A-Z0-9]{5}$/.test(created.code), created.code);
  const code = created.code;
  await wait(100);
  check('ผู้สร้างเป็นเจ้าของห้อง', host.lastRoom?.hostId === host.pid);
  check('ไม่ส่งรหัสผ่านออกไปให้ผู้เล่น', host.lastRoom && !('password' in host.lastRoom));

  const watcher = client('คนดู');
  await watcher.hello();
  const list = await watcher.call('rooms:watch');
  const entry = list.find((r) => r.code === code);
  check('ห้องแสดงในรายการ พร้อมไอคอนล็อก', entry && entry.hasPassword && entry.count === 1);

  const p = [];
  for (let i = 0; i < 4; i++) {
    p[i] = client('ผู้เล่น' + i);
    await p[i].hello();
  }
  check('รหัสผ่านผิดเข้าไม่ได้', (await p[0].call('room:join', { code, password: 'zzz' })).needPassword);
  check('ไม่ใส่รหัสผ่านเข้าไม่ได้', !(await p[0].call('room:join', { code })).ok);
  check('รหัสห้องผิดเข้าไม่ได้', !(await p[0].call('room:join', { code: 'QQQQQ', password: 'abc' })).ok);
  for (let i = 0; i < 4; i++) await p[i].call('room:join', { code: code.toLowerCase(), password: 'abc' });
  await wait(100);
  check('เข้าห้องได้ 5 คน (พิมพ์รหัสตัวเล็กก็ได้)', host.lastRoom.players.length === 5);

  const extra = client('คนเกิน');
  await extra.hello();
  const full = await extra.call('room:join', { code, password: 'abc' });
  check('ห้องเต็มเข้าไม่ได้', !full.ok, full.error);

  check('เริ่มเกมไม่ได้ถ้ายังไม่พร้อม', !(await host.call('room:start')).ok);
  check('คนที่ไม่ใช่เจ้าของห้องเริ่มเกมไม่ได้', (await p[0].call('room:start')).error === 'เฉพาะเจ้าของห้อง');

  p[0].emit('room:chat', 'สวัสดี');
  await wait(150);
  check('แชทส่งถึงทุกคน', host.chat.some((m) => m.text === 'สวัสดี') && p[3].chat.some((m) => m.text === 'สวัสดี'));
  await wait(400);
  p[0].emit('room:chat', 'x'.repeat(500));
  await wait(500);
  const long = host.chat.find((m) => m.text?.startsWith('xxx'));
  check('ข้อความยาวถูกตัดเหลือ 200 ตัว', long && long.text.length === 200);

  p[1].emit('room:settings', { name: 'แฮก' });
  await wait(100);
  check('คนที่ไม่ใช่เจ้าของห้องแก้ตั้งค่าไม่ได้', host.lastRoom.name === 'ห้องทดสอบ');
  host.emit('room:settings', { settings: { maxPlayers: 4, meetingTime: 999 } });
  await wait(100);
  check('ลดจำนวนคนต่ำกว่าคนในห้องไม่ได้', host.lastRoom.settings.maxPlayers === 5);
  check('ค่าตั้งค่าแปลก ๆ ถูกปัดเป็นค่าเดิม', host.lastRoom.settings.meetingTime === 120);

  host.emit('room:kick', p[3].pid);
  await wait(150);
  check('เจ้าของห้องเตะผู้เล่นได้', p[3].kicked && host.lastRoom.players.length === 4);
  check('มีข้อความระบบแจ้งการเตะ', host.chat.some((m) => m.system && m.text.includes('เชิญออก')));

  host.emit('room:transfer', p[0].pid);
  await wait(100);
  check('โอนเจ้าของห้องได้', host.lastRoom.hostId === p[0].pid);
  host.emit('room:kick', p[1].pid);
  await wait(100);
  check('เจ้าของเก่าเตะคนไม่ได้แล้ว', host.lastRoom.players.length === 4);

  // หลุดแล้วกลับเข้า
  p[2].close();
  await wait(200);
  const dropped = host.lastRoom.players.find((x) => x.id === p[2].pid);
  check('คนหลุดยังอยู่ในห้อง (สถานะหลุด)', dropped && !dropped.connected);
  const back = client('ผู้เล่น2', p[2].pid);
  const re = await back.hello();
  await wait(100);
  check('กลับเข้าห้องเดิมได้หลังหลุด', re.rejoined === code && host.lastRoom.players.find((x) => x.id === p[2].pid)?.connected);

  // เจ้าของห้องออก ต้องมีเจ้าของใหม่
  p[0].emit('room:leave');
  await wait(150);
  check('เจ้าของห้องออก มีคนรับต่ออัตโนมัติ', host.lastRoom.hostId && host.lastRoom.hostId !== p[0].pid);

  // ทุกคนออก ห้องหายจากรายการ
  [host, p[1], back].forEach((s) => s.emit('room:leave'));
  await wait(200);
  const after = await watcher.call('rooms:watch');
  check('ห้องว่างถูกลบจากรายการ', !after.some((r) => r.code === code));

  // ห้องซ่อน
  const hidden = await host.call('room:create', { name: 'ซ่อน', isPublic: false });
  const l2 = await watcher.call('rooms:watch');
  check('ห้องซ่อนไม่แสดงในรายการ', !l2.some((r) => r.code === hidden.code));
  check('ห้องซ่อนเข้าด้วยรหัสได้', (await watcher.call('room:join', { code: hidden.code })).ok);

  console.log(`\nรวม: ผ่าน ${passed}  ไม่ผ่าน ${failed}`);
  process.exit(failed ? 1 : 0);
})();
