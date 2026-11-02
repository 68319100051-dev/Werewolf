// รายการห้อง / สร้างและตั้งค่าห้อง / ห้องรอผู้เล่น
import { net } from '../net.js';
import { sfx } from '../sfx.js';
import { ROLE_OPTIONS } from '../data.js';
import { buildSquare, buildFire, SEATS } from '../art/sets.js';
import { Actor } from '../ui/actors.js';
import { MicControl } from '../ui/mic.js';
import { EmoteBar } from '../ui/emotes.js';
import { voice } from '../voice.js';
import { wolfCount, roleSetting, roleMax } from '../ui/guide.js';
import { Button, Cycler, Toggle, txt, stackBubble, panel, domInput, modal, staggerIn, go, toast, iconButton, COLORS } from '../ui/widgets.js';

async function joinRoom(scene, code, password) {
  const res = await net.call('room:join', { code, password });
  if (res.ok) {
    sfx.join();
    return go(scene, 'Lobby');
  }
  if (res.needPassword && password === undefined) return askPassword(scene, code);
  sfx.error();
  toast(scene, res.error || 'เข้าห้องไม่ได้', 'error');
  if (res.needPassword) askPassword(scene, code);
}

function askPassword(scene, code) {
  modal(scene, {
    title: 'ห้องนี้ล็อกรหัสผ่าน',
    w: 260,
    h: 130,
    build(m) {
      m.box.add(scene.add.image(0, -36, 'i_lock').setScale(2).setVisible(false));
      const { el, dom } = domInput(scene, 320, 176, 180, {
        placeholder: 'รหัสผ่าน',
        type: 'password',
        onEnter: () => ok(),
      });
      m.addDom(dom);
      const ok = () => {
        m.close();
        joinRoom(scene, code, el.value);
      };
      m.box.add(new Button(scene, -56, 40, 'เข้าห้อง', { w: 100, color: 'btn_green', onClick: ok }));
      m.box.add(new Button(scene, 56, 40, 'ยกเลิก', { w: 100, color: 'btn_dark', onClick: () => m.close() }));
      setTimeout(() => el.focus(), 50);
    },
  });
}

export class RoomList extends Phaser.Scene {
  constructor() {
    super('RoomList');
  }

  async create(data) {
    this.add.existing(panel(this, 320, 150, 580, 250));
    txt(this, 60, 40, 'ห้องทั้งหมด', { size: 18, color: COLORS.gold, origin: [0, 0.5] });
    iconButton(this, 580, 40, 'i_refresh', () => this.refresh(true));
    this.listBox = this.add.container(0, 0);
    this.scroll = 0;
    this.rooms = [];

    const mask = this.make.graphics().fillRect(40, 58, 560, 214);
    this.listBox.setMask(mask.createGeometryMask());
    this.input.on('wheel', (_p, _o, _dx, dy) => {
      const max = Math.max(0, this.rooms.length * 36 - 210);
      this.scroll = Phaser.Math.Clamp(this.scroll + dy * 0.3, 0, max);
      this.listBox.y = -this.scroll;
    });

    const { el } = domInput(this, 128, 310, 120, { placeholder: 'รหัสห้อง', maxLength: 5, upper: true, onEnter: () => byCode() });
    const byCode = () => {
      const code = el.value.trim().toUpperCase();
      if (code.length < 5) {
        sfx.error();
        return toast(this, 'รหัสห้องมี 5 ตัวอักษร', 'error');
      }
      joinRoom(this, code);
    };
    const b1 = new Button(this, 252, 310, 'เข้าด้วยรหัส', { w: 110, icon: 'i_key', onClick: byCode });
    const b2 = new Button(this, 374, 310, 'ห้องสุ่ม', { w: 100, icon: 'i_dice', onClick: () => this.random() });
    const b3 = new Button(this, 488, 310, 'สร้างห้อง', { w: 104, color: 'btn_green', icon: 'i_plus', onClick: () => go(this, 'CreateRoom') });
    const b4 = new Button(this, 584, 310, 'กลับ', { w: 72, color: 'btn_dark', onClick: () => go(this, 'Menu') });
    staggerIn(this, [b1, b2, b3, b4], { dy: 24, delay: 50 });

    const onList = (list) => this.render(list);
    net.events.on('rooms', onList);
    this.events.once('shutdown', () => {
      net.events.off('rooms', onList);
      net.socket.emit('rooms:unwatch');
    });
    this.render(await net.call('rooms:watch'), true);

    if (data?.autoJoin) joinRoom(this, data.autoJoin.toUpperCase());
  }

  async refresh(anim) {
    this.render(await net.call('rooms:watch'), anim);
  }

  random() {
    const open = this.rooms.filter((r) => r.status === 'lobby' && !r.hasPassword && r.count < r.max);
    if (!open.length) {
      sfx.error();
      return toast(this, 'ไม่มีห้องว่างตอนนี้ ลองสร้างห้องเองดูสิ', 'error');
    }
    joinRoom(this, Phaser.Utils.Array.GetRandom(open).code);
  }

  render(list, anim) {
    this.rooms = Array.isArray(list) ? list : [];
    this.listBox.removeAll(true);
    if (!this.rooms.length) {
      const empty = this.add.container(320, 160);
      empty.add(this.add.image(0, -24, 'i_moon').setScale(3));
      empty.add(txt(this, 0, 14, 'ยังไม่มีห้องเลย', { size: 15 }));
      empty.add(txt(this, 0, 34, 'สร้างห้องใหม่แล้วชวนเพื่อนมาเล่นกัน', { size: 12, color: COLORS.dim }));
      this.listBox.add(empty);
      this.tweens.add({ targets: empty, y: 156, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      return;
    }
    const rows = this.rooms.map((r, i) => {
      const row = this.add.container(320, 78 + i * 36);
      row.add(this.add.nineslice(0, 0, 'panel_dark', undefined, 556, 32, 8, 8, 8, 8));
      if (r.hasPassword) row.add(this.add.image(-262, 0, 'i_lock'));
      row.add(txt(this, -246, 0, r.name, { size: 13, origin: [0, 0.5] }));
      row.add(txt(this, -246 + 240, 0, r.code, { size: 11, color: COLORS.dim, origin: [0, 0.5] }));
      row.add(this.add.image(80, 0, 'i_user'));
      row.add(txt(this, 92, 0, `${r.count}/${r.max}`, { size: 13, origin: [0, 0.5], color: r.count >= r.max ? COLORS.red : COLORS.text }));
      const playing = r.status !== 'lobby';
      row.add(txt(this, 170, 0, playing ? 'กำลังเล่น' : 'รอผู้เล่น', { size: 11, color: playing ? COLORS.red : COLORS.green }));
      const btn = new Button(this, 238, 0, 'เข้า', { w: 64, h: 24, color: 'btn_green', size: 12, onClick: () => joinRoom(this, r.code) });
      btn.setEnabled(!playing && r.count < r.max);
      row.add(btn);
      return row;
    });
    this.listBox.add(rows);
    if (anim) staggerIn(this, rows, { dx: 40, dy: 0, delay: 40 });
  }
}

const SECS = (s) => (s < 60 ? `${s} วิ` : `${s / 60} นาที`);

export class CreateRoom extends Phaser.Scene {
  constructor() {
    super('CreateRoom');
  }

  create(data) {
    this.edit = !!data?.edit;
    this.clearPass = false;
    if (this.edit && !net.room) return go(this, 'Menu');
    const room = this.edit ? net.room : null;
    const s = room
      ? JSON.parse(JSON.stringify(room.settings))
      : {
          maxPlayers: 8, meetingTime: 120, cardTime: 30, revealRoleOnDeath: true, ghostChat: true,
          outfitChange: true, barLength: 'normal', voiceMode: 'both', wolves: 'auto',
          roles: {},
        };
    this.settings = s;
    this.isPublic = room ? room.isPublic : true;

    this.add.existing(panel(this, 320, 162, 440, 270));
    txt(this, 320, 40, this.edit ? 'ตั้งค่าห้อง' : 'สร้างห้องใหม่', { size: 18, color: COLORS.gold });

    // แท็บ
    this.tabs = [this.add.container(0, 0), this.add.container(0, 0), this.add.container(0, 0)];
    const tabBtns = ['ทั่วไป', 'กติกา', 'อาชีพ'].map((label, i) =>
      new Button(this, 220 + i * 100, 68, label, { w: 92, h: 22, size: 12, color: 'btn_dark', onClick: () => this.showTab(i) }),
    );
    this.tabBtns = tabBtns;

    // ทั่วไป
    const g = this.tabs[0];
    const L = 130;
    g.add(txt(this, L, 100, 'ชื่อห้อง', { size: 13, origin: [0, 0.5] }));
    this.nameIn = domInput(this, 400, 100, 180, { placeholder: `ห้องของ ${net.profile.name}`, maxLength: 24, value: room?.name || '' });
    g.add(txt(this, L, 130, 'รหัสผ่าน', { size: 13, origin: [0, 0.5] }));
    this.passIn = domInput(this, 400, 130, 180, { placeholder: 'เว้นว่าง = ไม่ล็อก', maxLength: 16 });
    g.add(txt(this, L, 150, this.edit && room.hasPassword ? 'ห้องนี้มีรหัสอยู่แล้ว ใส่ใหม่เพื่อเปลี่ยน' : '', { size: 10, color: COLORS.dim, origin: [0, 0.5] }));
    g.add(new Toggle(this, L, 172, 'แสดงห้องในรายการ (ปิด = เข้าได้ด้วยรหัสห้องเท่านั้น)', this.isPublic, (v) => (this.isPublic = v), 380));
    const nums = [4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => ({ value: n, label: `${n} คน` }));
    g.add(new Cycler(this, L, 202, 'ผู้เล่นสูงสุด', nums, s.maxPlayers, (v) => {
      s.maxPlayers = v;
      this.roleWarning();
    }, 380));
    const voice = [
      { value: 'both', label: 'ไมค์ + พิมพ์' },
      { value: 'text', label: 'พิมพ์อย่างเดียว' },
      { value: 'voice', label: 'ไมค์อย่างเดียว' },
    ];
    g.add(new Cycler(this, L, 232, 'การคุยตอนประชุม', voice, s.voiceMode, (v) => (s.voiceMode = v), 380));
    if (this.edit && room.hasPassword) {
      g.add(new Toggle(this, L, 260, 'ลบรหัสผ่านออก', false, (v) => (this.clearPass = v), 380));
    }

    // กติกา
    const r = this.tabs[1];
    const t = (arr) => arr.map((v) => ({ value: v, label: SECS(v) }));
    r.add(new Cycler(this, L, 100, 'เวลาประชุม', t([60, 120, 180]), s.meetingTime, (v) => (s.meetingTime = v), 380));
    r.add(new Cycler(this, L, 126, 'เวลาเลือกการ์ด', t([20, 30, 45]), s.cardTime, (v) => (s.cardTime = v), 380));
    const bars = [{ value: 'short', label: 'สั้น' }, { value: 'normal', label: 'ปกติ' }, { value: 'long', label: 'ยาว' }];
    r.add(new Cycler(this, L, 152, 'ความยาวหลอดเควส', bars, s.barLength, (v) => (s.barLength = v), 380));
    r.add(new Toggle(this, L, 178, 'เปิดเผยอาชีพคนตาย', s.revealRoleOnDeath, (v) => (s.revealRoleOnDeath = v), 190));
    r.add(new Toggle(this, L + 200, 178, 'คนตายคุยกันได้', s.ghostChat, (v) => (s.ghostChat = v), 180));
    r.add(new Toggle(this, L, 202, 'เปลี่ยนชุดกลางเกม', s.outfitChange, (v) => (s.outfitChange = v), 190));

    // อาชีพ
    const ro = this.tabs[2];
    ro.add(txt(this, L, 94, 'กดที่ค่าเพื่อเปลี่ยน: ปิด / สุ่ม (โอกาสเท่ากัน ไม่ซ้ำ) / จำนวนที่มีแน่ ๆ', { size: 11, color: COLORS.dim, origin: [0, 0.5] }));
    ROLE_OPTIONS.forEach((opt, i) => {
      s.roles[opt.key] = roleSetting(s.roles, opt.key);
      ro.add(this.roleChip(L + (i % 3) * 130, 116 + Math.floor(i / 3) * 24, opt));
    });
    if (s.wolves === undefined) s.wolves = 'auto';
    const wolves = [
      { value: 'auto', label: 'อัตโนมัติ' },
      { value: 1, label: '1 ตัว' },
      { value: 2, label: '2 ตัว' },
      { value: 3, label: '3 ตัว' },
    ];
    wolves.push({ value: 4, label: '4 ตัว' }, { value: 5, label: '5 ตัว' });
    ro.add(new Cycler(this, L, 248, 'จำนวนหมาป่า (รวมจ่าฝูง)', wolves, s.wolves, (v) => {
      s.wolves = v;
      this.roleWarning();
    }, 380));
    this.warnText = txt(this, L, 274, '', { size: 10, color: COLORS.gold, origin: [0, 0.5] });
    ro.add(this.warnText);
    this.roleWarning();

    const ok = new Button(this, 260, 322, this.edit ? 'บันทึก' : 'สร้างห้อง', { w: 140, color: 'btn_green', icon: 'i_check', onClick: () => this.submit() });
    const cancel = new Button(this, 400, 322, 'ยกเลิก', { w: 110, color: 'btn_dark', onClick: () => go(this, this.edit ? 'Lobby' : 'Menu') });
    staggerIn(this, [ok, cancel], { dy: 24 });
    this.showTab(0);
  }

  // ช่องเลือกจำนวนของอาชีพหนึ่ง: กดวนค่า ปิด -> สุ่ม -> 1 -> 2 -> 3
  roleChip(x, y, opt) {
    const s = this.settings;
    const values = [0, 'random', ...Array.from({ length: roleMax(opt.key) }, (_, i) => i + 1)];
    const c = this.add.container(x, y);
    const name = txt(this, 0, 0, opt.name, { size: 12, origin: [0, 0.5] });
    const box = this.add.nineslice(98, 0, 'slot', undefined, 40, 18, 4, 4, 4, 4);
    const val = txt(this, 98, 0, '', { size: 11, bold: true });
    const draw = () => {
      const v = s.roles[opt.key];
      val.setText(v === 'random' ? 'สุ่ม' : v === 0 ? 'ปิด' : `${v} คน`);
      val.setColor(v === 'random' ? COLORS.gold : v === 0 ? COLORS.dim : COLORS.green);
      name.setColor(v === 0 ? COLORS.dim : COLORS.text);
    };
    const hit = this.add.zone(60, 0, 124, 20).setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => {
      const i = values.indexOf(s.roles[opt.key]);
      s.roles[opt.key] = values[(i + 1) % values.length];
      sfx.click();
      draw();
      val.setScale(1.3);
      this.tweens.add({ targets: val, scale: 1, duration: 120 });
      this.roleWarning();
    });
    hit.on('pointerover', () => name.setColor(COLORS.gold));
    hit.on('pointerout', draw);
    c.add([name, box, val, hit]);
    draw();
    return c;
  }

  // สรุปว่าเต็มห้องแล้วจะมีหมาป่ากี่ตัว อาชีพที่กำหนดไว้กี่คน และเตือนถ้าเกินหรือไม่พอ
  roleWarning() {
    const s = this.settings;
    const n = s.maxPlayers;
    const w = wolfCount(n, s.wolves, s.roles);
    const keys = ROLE_OPTIONS.map((o) => o.key).filter((k) => k !== 'wolf' && k !== 'shadow');
    const fixed = keys.reduce((sum, k) => sum + (typeof roleSetting(s.roles, k) === 'number' ? roleSetting(s.roles, k) : 0), 0);
    const fixedWolves = ['wolf', 'shadow'].reduce((sum, k) => sum + (typeof roleSetting(s.roles, k) === 'number' ? roleSetting(s.roles, k) : 0), 0);
    const random = keys.filter((k) => roleSetting(s.roles, k) === 'random' && !(k === 'traitor' && n < 6)).length;
    const seats = n - w;
    let msg = `ห้อง ${n} คน: หมาป่า ${w} ตัว · กำหนดไว้ ${fixed} คน · สุ่ม ${Math.max(0, seats - fixed)} คน`;
    let color = COLORS.gold;
    if (1 + fixedWolves > w || (s.wolves !== 'auto' && Number(s.wolves) > w)) {
      msg += ' · หมาป่าต้องน้อยกว่าครึ่ง จึงลดลง';
      color = COLORS.red;
    }
    if (fixed > seats) {
      msg += ` · กำหนดเกินที่นั่ง ${fixed - seats} คน (บางอาชีพจะไม่ได้ลง)`;
      color = COLORS.red;
    } else if (seats - fixed > random + 1) msg += ` · อาชีพสุ่มไม่พอ จะมีชาวบ้านเพิ่ม`;
    this.warnText?.setText(msg).setColor(color);
  }

  showTab(i) {
    this.tabs.forEach((t, j) => t.setVisible(i === j));
    this.tabBtns.forEach((b, j) => b.setAlpha(i === j ? 1 : 0.55));
    [this.nameIn, this.passIn].forEach((d) => d.dom.setVisible(i === 0));
  }

  async submit() {
    const name = this.nameIn.el.value.trim();
    const pass = this.passIn.el.value.trim();
    if (this.edit) {
      const data = { name, isPublic: this.isPublic, settings: this.settings };
      if (pass) data.password = pass;
      else if (this.clearPass) data.password = '';
      net.socket.emit('room:settings', data);
      sfx.success();
      return go(this, 'Lobby');
    }
    const res = await net.call('room:create', { name, password: pass, isPublic: this.isPublic, settings: this.settings });
    if (!res.ok) {
      sfx.error();
      return toast(this, res.error || 'สร้างห้องไม่ได้', 'error');
    }
    sfx.success();
    go(this, 'Lobby');
  }
}

function seat(i) {
  const [x, y] = SEATS[i % SEATS.length];
  return { x, y };
}

export class Lobby extends Phaser.Scene {
  constructor() {
    super('Lobby');
  }

  create() {
    // ซีนถูกใช้ซ้ำ: ต้องล้างค่าจากรอบก่อน ไม่งั้นเกมรอบสองจะไม่พาเข้าหน้าเกม
    this.leaving = false;
    this.startPulse = null;
    if (!net.room) return go(this, 'RoomList');
    this.actors = new Map();

    // แถบบน
    this.add.existing(panel(this, 320, 22, 628, 36, 'panel_dark'));
    this.lock = this.add.image(18, 22, 'i_lock');
    this.title = txt(this, 30, 22, '', { size: 15, origin: [0, 0.5], color: COLORS.gold });
    this.codeText = txt(this, 470, 22, '', { size: 14, origin: [1, 0.5] });
    iconButton(this, 492, 22, 'i_copy', () => this.copyInvite());
    this.countText = txt(this, 520, 22, '', { size: 13, origin: [0, 0.5] });
    this.summary = txt(this, 166, 50, '', { size: 11, color: COLORS.dim });
    this.botBtn = new Button(this, 362, 50, 'เพิ่มบอท', { w: 80, h: 22, size: 11, icon: 'i_plus', onClick: () => this.addBot() });

    // ลานหมู่บ้านกลางคืน กองไฟอยู่ตรงกลาง
    buildSquare(this, true).setDepth(-10);
    this.actorLayer = this.add.container(0, 0).setDepth(-5);
    this.topLayer = this.add.container(0, 0).setDepth(-4);
    this.fireFx = buildFire(this);
    this.actorLayer.add(this.fireFx.all);
    this.buildToys();

    // แชท
    this.add.existing(panel(this, 520, 178, 222, 262));
    txt(this, 520, 60, 'แชท', { size: 13, color: COLORS.gold });
    const log = document.createElement('div');
    log.className = 'px-chat';
    this.chatLog = log;
    this.add.dom(520, 172, log);
    const { el } = domInput(this, 494, 290, 160, { placeholder: 'พิมพ์ข้อความ...', maxLength: 200, onEnter: () => send() });
    const send = () => {
      const v = el.value.trim();
      if (!v) return;
      net.socket.emit('room:chat', v);
      el.value = '';
    };
    iconButton(this, 598, 290, 'i_chat', send);
    this.mic = new MicControl(this, { x: 604, y: 60, holdX: 590, holdY: 334, holdW: 96 });
    this.emotes = new EmoteBar(this, { x: 436, y: 60, depth: 10 });

    // ปุ่มด้านล่าง
    this.leaveBtn = new Button(this, 60, 334, 'ออก', { w: 96, color: 'btn_red', icon: 'i_door', onClick: () => this.leave() });
    this.readyBtn = new Button(this, 180, 334, 'พร้อม', { w: 126, color: 'btn_green', icon: 'i_check', onClick: () => this.toggleReady() });
    this.startBtn = new Button(this, 180, 334, 'เริ่มเกม', { w: 126, color: 'btn_green', icon: 'i_play', onClick: () => this.start() });
    this.settingsBtn = new Button(this, 314, 334, 'ตั้งค่าห้อง', { w: 126, icon: 'i_gear', onClick: () => go(this, 'CreateRoom', { edit: true }) });
    this.wardrobeBtn = new Button(this, 448, 334, 'แต่งตัว', { w: 120, icon: 'i_shirt', onClick: () => go(this, 'Wardrobe', { back: 'Lobby' }) });

    const onRoom = (room) => this.sync(room);
    const onChat = (msg) => this.addChat(msg, true);
    const onKicked = () => {
      sfx.error();
      toast(this, 'คุณถูกเชิญออกจากห้อง', 'error');
      go(this, 'RoomList');
    };
    net.events.on('room', onRoom);
    net.events.on('chat', onChat);
    net.events.on('kicked', onKicked);
    const onTalk = (id, on) => this.actors.get(id)?.setTalking(on);
    voice.events.on('talking', onTalk);
    const onEmote = ({ id, key }) => (key === 'fire' ? this.fireFlare() : this.actors.get(id)?.emote(key));
    net.events.on('emote', onEmote);
    this.events.once('shutdown', () => {
      net.events.off('emote', onEmote);
      voice.events.off('talking', onTalk);
      net.events.off('room', onRoom);
      net.events.off('chat', onChat);
      net.events.off('kicked', onKicked);
    });

    net.room.chat.forEach((m) => this.addChat(m, false));
    this.sync(net.room, true);
  }

  sync(room, first) {
    if (!room) return;
    if (room.status === 'playing') {
      if (!this.leaving) {
        this.leaving = true;
        sfx.howl();
        go(this, 'Game');
      }
      return;
    }
    const s = room.settings;
    this.lock.setVisible(room.hasPassword);
    this.title.setX(room.hasPassword ? 30 : 12).setText(room.name);
    this.codeText.setText('รหัสห้อง: ' + room.code);
    this.countText.setText(`${room.players.length}/${s.maxPlayers} คน`);
    const voice = { both: 'ไมค์ + พิมพ์', text: 'พิมพ์อย่างเดียว', voice: 'ไมค์อย่างเดียว' }[s.voiceMode];
    const wolves = wolfCount(Math.max(4, room.players.length), s.wolves, s.roles);
    this.summary.setText(`หมาป่า ${wolves} ตัว · ประชุม ${SECS(s.meetingTime)} · ${voice}${room.isPublic ? '' : ' · ห้องซ่อน'}`);

    const host = net.isHost;
    this.readyBtn.setVisible(!host);
    this.startBtn.setVisible(host);
    this.settingsBtn.setVisible(host);
    this.botBtn.setVisible(host).setEnabled(room.players.length < s.maxPlayers);
    this.wardrobeBtn.x = host ? 448 : 314;
    const me = room.players.find((p) => p.id === net.me);
    if (me) this.readyBtn.setLabel(me.ready ? 'ยกเลิกพร้อม' : 'พร้อม');
    const everyoneReady = room.players.every((p) => p.id === room.hostId || p.ready);
    const canStart = room.players.length >= 4 && everyoneReady;
    this.startBtn.setAlpha(canStart ? 1 : 0.6);
    // ทุกคนพร้อมแล้ว ให้ปุ่มเริ่มเกมเต้นเรียกความสนใจเจ้าของห้อง
    if (canStart && host && !this.startPulse) {
      sfx.success();
      this.startPulse = this.tweens.add({ targets: this.startBtn.content, scale: 1.12, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    } else if (!(canStart && host) && this.startPulse) {
      this.startPulse.stop();
      this.startPulse = null;
      this.startBtn.content.setScale(1);
    }

    // ตัวละคร: เพิ่ม / ลบ / ย้ายที่
    const ids = new Set(room.players.map((p) => p.id));
    for (const [id, a] of this.actors) {
      if (!ids.has(id)) {
        this.actors.delete(id);
        a.destroy(true);
      }
    }
    // ที่นั่งคงที่: คนเดิมไม่ต้องย้ายเมื่อมีคนออก คนใหม่ได้ที่ว่างแรก
    const used = new Set([...this.actors.values()].map((a) => a.seat));
    room.players.forEach((p) => {
      let a = this.actors.get(p.id);
      let seatIdx = a?.seat;
      if (seatIdx === undefined) {
        seatIdx = 0;
        while (used.has(seatIdx)) seatIdx++;
        used.add(seatIdx);
      }
      const pos = seat(seatIdx);
      if (!a) {
        a = this.spawnActor(p, pos, first);
        a.seat = seatIdx;
      } else a.setOutfit(p.outfit);
      a.setName(p.name);
      a.setCrown(p.id === room.hostId);
      a.setCheck(p.ready && p.id !== room.hostId);
      a.setConnected(p.connected);
      if (!a.walking && (Math.abs(a.x - pos.x) > 1 || Math.abs(a.y - pos.y) > 1)) a.walkTo(pos.x, pos.y, () => net.room && this.sync(net.room));
    });
  }

  spawnActor(p, pos, instant) {
    const a = new Actor(this, p, pos.x, pos.y, { layer: this.actorLayer, top: this.topLayer, isMe: p.id === net.me });
    a.faceFire();
    a.sprite.on('pointerup', () => this.playerMenu(a));
    a.sprite.on('pointerover', () => a.sprite.setTint(0xfff0c0));
    a.sprite.on('pointerout', () => a.sprite.clearTint());
    this.actors.set(p.id, a);
    if (!instant) {
      // เดินเข้ามาจากขอบจอ
      a.place(pos.x < 200 ? -20 : 420, pos.y);
      a.walkTo(pos.x, pos.y);
    }
    this.actorLayer.sort('depth');
    return a;
  }

  // ของเล่นระหว่างรอ: กองฟืน (โยนเข้ากองไฟ ทุกคนเห็น) และหิ่งห้อยให้จับ
  buildToys() {
    const pile = this.add.image(262, 240, 'logs').setScale(1.4).setInteractive({ useHandCursor: true });
    this.actorLayer.add(pile);
    pile.setDepth(240);
    const tip = txt(this, 262, 254, 'โยนฟืน', { size: 9, color: COLORS.dim }).setAlpha(0);
    this.actorLayer.add(tip);
    tip.setDepth(241);
    pile.on('pointerover', () => this.tweens.add({ targets: tip, alpha: 1, duration: 150 }));
    pile.on('pointerout', () => this.tweens.add({ targets: tip, alpha: 0, duration: 150 }));
    pile.on('pointerup', () => net.socket.emit('room:emote', 'fire'));

    this.caught = 0;
    this.caughtText = txt(this, 12, 76, '', { size: 10, color: '#fff2b0', origin: [0, 0.5] });
    for (let i = 0; i < 7; i++) this.spawnFirefly();
  }

  spawnFirefly() {
    const f = this.add.image(Phaser.Math.Between(20, 390), Phaser.Math.Between(170, 300), 'firefly').setBlendMode('ADD').setScale(1.5).setDepth(5);
    f.setInteractive({ hitArea: new Phaser.Geom.Rectangle(-5, -5, 13, 13), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    const wander = () => {
      if (!f.active) return;
      this.tweens.add({
        targets: f,
        x: Phaser.Math.Clamp(f.x + Phaser.Math.Between(-50, 50), 10, 400),
        y: Phaser.Math.Clamp(f.y + Phaser.Math.Between(-30, 30), 150, 310),
        alpha: { from: 0.4, to: 1 },
        duration: Phaser.Math.Between(1400, 2600),
        ease: 'Sine.InOut',
        onComplete: wander,
      });
    };
    wander();
    f.on('pointerdown', () => {
      this.caught++;
      sfx.pop();
      this.caughtText.setText(`จับหิ่งห้อยได้ ${this.caught} ตัว`);
      const sp = this.add.image(f.x, f.y, 'spark').setBlendMode('ADD').setDepth(6);
      this.tweens.add({ targets: sp, scale: 2.5, alpha: 0, duration: 350, onComplete: () => sp.destroy() });
      this.tweens.killTweensOf(f);
      f.destroy();
      this.time.delayedCall(2500, () => this.spawnFirefly());
    });
  }

  // ไฟลุกโชนเมื่อมีคนโยนฟืน
  fireFlare() {
    const { fire, glow } = this.fireFx;
    sfx.crackle();
    this.tweens.add({ targets: fire, scaleX: 3.2, scaleY: 3.6, duration: 160, yoyo: true, hold: 500, ease: 'Quad.Out' });
    this.tweens.add({ targets: glow, alpha: 1, scale: 5.2, duration: 200, yoyo: true, hold: 500 });
    const burst = this.add.particles(200, 196, 'ember', {
      speed: { min: 40, max: 120 }, angle: { min: 230, max: 310 }, lifespan: 900,
      scale: { start: 0.9, end: 0 }, gravityY: -40, blendMode: 'ADD', emitting: false,
    }).setDepth(230);
    burst.explode(24);
    this.time.delayedCall(1200, () => burst.destroy());
  }

  async addBot() {
    const res = await net.call('room:addBot');
    if (!res.ok) {
      sfx.error();
      toast(this, res.error || 'เพิ่มบอทไม่ได้', 'error');
    }
  }

  playerMenu(a) {
    if (!net.isHost || a.id === net.me) return;
    const p = net.room.players.find((x) => x.id === a.id);
    if (!p) return;
    modal(this, {
      title: p.name,
      w: 220,
      h: 130,
      build: (m) => {
        if (!p.isBot) {
          m.box.add(new Button(this, 0, -8, 'ให้เป็นเจ้าของห้อง', { w: 180, icon: 'i_crown', onClick: () => {
            net.socket.emit('room:transfer', a.id);
            m.close();
          } }));
        }
        m.box.add(new Button(this, 0, 24, p.isBot ? 'เอาบอทออก' : 'เชิญออกจากห้อง', { w: 180, color: 'btn_red', icon: 'i_door', onClick: () => {
          net.socket.emit('room:kick', a.id);
          m.close();
        } }));
        m.box.add(new Button(this, 0, 52, 'ปิด', { w: 80, h: 20, size: 11, color: 'btn_dark', onClick: () => m.close() }));
      },
    });
  }

  addChat(msg, live) {
    const line = document.createElement('div');
    line.className = msg.system ? 'sys' : msg.from === net.me ? 'me' : '';
    if (msg.system) line.textContent = msg.text;
    else {
      const b = document.createElement('b');
      b.textContent = msg.name + ': ';
      line.append(b, document.createTextNode(msg.text));
    }
    this.chatLog.appendChild(line);
    this.chatLog.scrollTop = this.chatLog.scrollHeight;
    if (!live) return;
    if (msg.system) return;
    sfx.chat();
    const a = this.actors.get(msg.from);
    if (a) this.bubble(a, msg.text);
  }

  bubble(a, text) {
    a.bubble?.destroy();
    const short = text.length > 28 ? text.slice(0, 27) + '…' : text;
    const t = txt(this, 0, 0, short, { size: 11, color: COLORS.ink, shadow: false });
    const w = Math.max(30, t.width + 14);
    // คนที่นั่งชิดขอบจอ: เลื่อนกล่องคำพูดเข้ามา แต่หางยังชี้ที่ตัวคนพูด
    const cx = Phaser.Math.Clamp(a.x, w / 2 + 4, 640 - w / 2 - 4);
    const c = this.add.container(cx, a.y - 78).setDepth(500);
    const bg = this.add.nineslice(0, 0, 'panel_paper', undefined, w, 22, 8, 8, 8, 8);
    const tail = this.add.triangle(a.x - cx, 12, -4, 0, 4, 0, 0, 5, 0xe8d5a8);
    c.add([bg, tail, t]);
    stackBubble(c, w, [...this.actors.values()].map((o) => o.bubble));
    a.bubble = c;
    c.setScale(0);
    this.tweens.add({ targets: c, scale: 1, duration: 200, ease: 'Back.Out' });
    this.time.delayedCall(3200, () => {
      if (a.bubble !== c) return;
      this.tweens.add({ targets: c, alpha: 0, y: c.y - 8, duration: 300, onComplete: () => c.destroy() });
    });
  }

  toggleReady() {
    const me = net.room.players.find((p) => p.id === net.me);
    net.socket.emit('room:ready', !me?.ready);
  }

  async start() {
    const res = await net.call('room:start');
    if (!res.ok) {
      sfx.error();
      toast(this, res.error, 'error');
    }
  }

  async copyInvite() {
    const link = `${location.origin}/?room=${net.room.code}`;
    try {
      await navigator.clipboard.writeText(link);
      toast(this, 'คัดลอกลิงก์เชิญแล้ว', 'success');
    } catch {
      toast(this, link);
    }
  }

  leave() {
    voice.leave();
    net.socket.emit('room:leave');
    net.room = null;
    go(this, 'Menu');
  }
}
