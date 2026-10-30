// บอทจำลองผู้เล่น สำหรับทดสอบห้อง
// ใช้: node tools/bots.js <รหัสห้อง> [จำนวน] [รหัสผ่าน]
const { io } = require('socket.io-client');
const { think } = require('../server/brain');

const [code, countArg = '3', password = ''] = process.argv.slice(2);
if (!code) {
  console.log('ใช้: node tools/bots.js <รหัสห้อง> [จำนวน] [รหัสผ่าน]');
  process.exit(1);
}
const URL = process.env.URL || 'http://localhost:3000';
const NAMES = ['สมชาย', 'มะลิ', 'ต้นกล้า', 'ใบเตย', 'ก้อง', 'ฟ้าใส', 'บอส', 'น้ำหวาน', 'ปลาทอง', 'ภูผา', 'แพรวา'];
const LINES = ['สวัสดีทุกคน', 'ใครเป็นหมาป่าบอกมาซะดี ๆ', 'พร้อมแล้วนะ', 'ชุดนี้เท่ไหม', 'ฮู้ดนี่น่าสงสัยนะ 555'];
const rnd = (n) => Math.floor(Math.random() * n);

for (let i = 0; i < Number(countArg); i++) {
  const s = io(URL, { forceNew: true });
  const name = NAMES[i % NAMES.length];
  const profile = {
    playerId: `bot_${i}_${Date.now()}`,
    name,
    outfit: { hat: rnd(8), hair: rnd(8), shirt: rnd(8), item: rnd(8), face: rnd(5), skin: rnd(5) },
  };
  s.on('connect', () => {
    s.emit('hello', profile, () => {
      setTimeout(() => {
        s.emit('room:join', { code, password }, (res) => {
          console.log(`${name}: ${res.ok ? 'เข้าห้องแล้ว' : res.error}`);
          if (!res.ok) return;
          setTimeout(() => s.emit('room:chat', LINES[rnd(LINES.length)]), 1500 + i * 900);
          setTimeout(() => s.emit('room:ready', true), 3000 + i * 700);
        });
      }, i * 600);
    });
  });
  // เล่นเกมเองเมื่อเกมเริ่ม
  s.act = (type, target) => s.emit('game:action', { type, target });
  let last = '';
  s.on('game:chase', (c) => (s.chase = c));
  s.on('game:state', (v) => {
    if (v.phase !== 'chase') s.chase = null;
    s.state = v;
    const key = v.phase + v.day + (v.hunter?.id || '') + (v.me?.interrogation || '');
    if (key === last) return;
    last = key;
    think(s, v, { slow: true });
  });
  // กลับห้องรอหลังจบเกม ให้กดพร้อมใหม่
  s.on('room:state', (room) => {
    const me = room.players.find((p) => p.id === profile.playerId);
    if (room.status === 'lobby' && me && !me.ready && room.hostId !== profile.playerId) {
      setTimeout(() => s.emit('room:ready', true), 1500);
    }
  });
  s.on('room:kicked', () => {
    console.log(`${name}: ถูกเตะ`);
    s.close();
  });
}
