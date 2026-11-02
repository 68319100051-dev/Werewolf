// การเชื่อมต่อกับเซิร์ฟเวอร์ และข้อมูลผู้เล่นของเรา
import { prefs } from './prefs.js';
import { DEFAULT_OUTFIT } from './art/character.js';
import { wallet } from './wallet.js';

// รหัสผู้เล่นแยกตามแท็บ: รีเฟรชแล้วยังเป็นคนเดิม (กลับเข้าห้องได้) แต่เปิดหลายแท็บก็เป็นคนละคน
function tabPlayerId() {
  let id = null;
  try {
    id = sessionStorage.getItem('pw_playerId');
  } catch {
    // ใช้รหัสใหม่ไปก่อน
  }
  if (!id) {
    id = 'p_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    try {
      sessionStorage.setItem('pw_playerId', id);
    } catch {
      // ไม่เป็นไร
    }
  }
  return id;
}

const events = new Phaser.Events.EventEmitter();
const socket = io({ autoConnect: true });

export const net = {
  socket,
  events,
  room: null,
  loggedIn: false,
  profile: {
    playerId: tabPlayerId(),
    name: prefs.get('name', ''),
    outfit: prefs.get('outfit', { ...DEFAULT_OUTFIT }),
    plate: prefs.get('plate', null),
  },

  saveProfile() {
    prefs.set('name', this.profile.name);
    prefs.set('outfit', this.profile.outfit);
    prefs.set('plate', this.profile.plate);
    if (this.loggedIn) socket.emit('profile', { name: this.profile.name, outfit: this.profile.outfit, plate: this.profile.plate });
  },

  call(event, data) {
    return new Promise((resolve) => {
      const done = (res) => resolve(res ?? { ok: false, error: 'ไม่มีการตอบกลับ' });
      if (data === undefined) socket.timeout(5000).emit(event, (err, res) => done(err ? null : res));
      else socket.timeout(5000).emit(event, data, (err, res) => done(err ? null : res));
    });
  },

  async login(name) {
    this.profile.name = name;
    this.saveProfile();
    const res = await this.call('hello', { ...this.profile, wallet: wallet.token });
    this.loggedIn = !!res.ok;
    wallet.set(res.wallet);
    return res;
  },

  get me() {
    return this.profile.playerId;
  },

  get isHost() {
    return this.room?.hostId === this.profile.playerId;
  },

  game: null,
  clockOffset: 0,

  act(type, target) {
    socket.emit('game:action', { type, target });
  },

  // เวลาที่เหลือของเฟสปัจจุบัน (มิลลิวินาที) เทียบกับนาฬิกาเซิร์ฟเวอร์
  timeLeft() {
    if (!this.game?.endsAt) return 0;
    return Math.max(0, this.game.endsAt - (Date.now() + this.clockOffset));
  },
};

socket.on('game:state', (v) => {
  net.clockOffset = v.serverNow - Date.now();
  net.game = v;
  events.emit('game', v);
});
socket.on('game:chase', (c) => events.emit('chase', c));
socket.on('wallet', (w) => wallet.set(w));
socket.on('game:chat', (msg) => events.emit('gchat', msg));
socket.on('room:emote', (m) => events.emit('emote', m));
socket.on('ghost:haunt', (m) => events.emit('haunt', m));

socket.on('room:state', (room) => {
  net.room = room;
  events.emit('room', room);
});
socket.on('room:chat', (msg) => events.emit('chat', msg));
socket.on('room:kicked', () => {
  net.room = null;
  events.emit('kicked');
});
socket.on('rooms:list', (list) => events.emit('rooms', list));
socket.on('disconnect', () => events.emit('connection', false));
socket.on('connect', async () => {
  events.emit('connection', true);
  // เน็ตหลุดแล้วกลับมา: ล็อกอินซ้ำเพื่อกลับเข้าห้องเดิม
  if (net.loggedIn) {
    const res = await net.call('hello', { ...net.profile, wallet: wallet.token });
    wallet.set(res.wallet);
    if (!res.rejoined && net.room) {
      net.room = null;
      events.emit('kicked');
    }
  }
});
