// บอทที่เจ้าของห้องเพิ่มเข้ามาได้: อยู่ในเซิร์ฟเวอร์เลย ไม่ต้องเชื่อมต่อจากภายนอก
// รับมุมมองเกมเหมือนผู้เล่นคนหนึ่ง แล้วใช้สมองบอท (brain.js) ตัดสินใจ
const { think } = require('./brain');

const NAMES = ['สมชาย', 'มะลิ', 'ต้นกล้า', 'ใบเตย', 'ก้อง', 'ฟ้าใส', 'บอส', 'น้ำหวาน', 'ปลาทอง', 'ภูผา', 'แพรวา', 'ข้าวปั้น', 'โกโก้', 'ส้มโอ'];
const GREET = ['สวัสดีทุกคน', 'มาแล้ว ๆ', 'พร้อมล่าหมาป่า!', 'หวัดดี ฝากตัวด้วยนะ'];
const rnd = (n) => Math.floor(Math.random() * n);

class Bot {
  /**
   * api: { act(id, type, target), chat(id, text), emote(id, key) }
   */
  constructor(id, api) {
    this.id = id;
    this.api = api;
    this.lastKey = '';
    this.timers = new Set();
    // หน้าตาเหมือน socket ของผู้เล่น เพื่อใช้สมองบอทตัวเดียวกับเครื่องมือทดสอบ
    this.sock = {
      act: (type, target) => this.alive && api.act(id, type, target),
      emit: (event, data) => {
        if (!this.alive) return;
        if (event === 'room:chat') api.chat(id, data);
        if (event === 'room:emote') api.emote(id, data);
      },
    };
    this.alive = true;
  }

  receive(event, data) {
    if (!this.alive) return;
    if (event === 'game:chase') this.sock.chase = data;
    if (event !== 'game:state') return;
    if (data.phase !== 'chase') this.sock.chase = null;
    this.sock.state = data;
    const key = `${data.phase}:${data.day}:${data.hunter?.id || ''}:${data.me?.interrogation || ''}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    think(this.sock, data, { slow: true });
  }

  greet() {
    const t = setTimeout(() => this.sock.emit('room:chat', GREET[rnd(GREET.length)]), 800 + rnd(1500));
    this.timers.add(t);
  }

  stop() {
    this.alive = false;
    this.timers.forEach(clearTimeout);
  }
}

function botProfile(takenNames) {
  const free = NAMES.filter((n) => !takenNames.has(n + ' (บอท)'));
  const base = free.length ? free[rnd(free.length)] : 'บอท' + (takenNames.size + 1);
  return {
    name: base + ' (บอท)',
    outfit: { hat: rnd(8), hair: rnd(8), shirt: rnd(8), item: rnd(8), face: rnd(5), skin: rnd(5) },
  };
}

module.exports = { Bot, botProfile };
