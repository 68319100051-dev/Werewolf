// หน้าจอเกมหลัก: แสดงทุกเฟสตามข้อมูลที่เซิร์ฟเวอร์ส่งมา พร้อมอนิเมชั่นและคัตซีน
import { net } from '../net.js';
import { sfx } from '../sfx.js';
import { LOCATIONS, ROLES, TEAM_COLOR, EVENTS } from '../data.js';
import { addCharacter, outfitKey, setCharacterOutfit, OUTFIT_PARTS, PART_LABELS, BASE_SIZE } from '../art/character.js';
import { buildSquare, buildFire, SEATS } from '../art/sets.js';
import { Actor } from '../ui/actors.js';
import { Button, Cycler, txt, fitText, stackBubble, panel, domInput, modal, go, toast, iconButton, COLORS } from '../ui/widgets.js';
import { dealHand, makeDeck, Card } from '../ui/card.js';
import { startMinigame, ensureTextures as ensureMinigameTextures } from '../ui/minigames.js';
import { startNightGame } from '../ui/minigames2.js';
import { prefs } from '../prefs.js';
import { MicControl } from '../ui/mic.js';
import { EmoteBar, ensureEmoteTextures } from '../ui/emotes.js';
import { voice } from '../voice.js';
import { Chase, ensureChaseTextures } from '../ui/chase.js';
import { music } from '../music.js';
import { openGuide, possibleRoles } from '../ui/guide.js';
import { scoreBoard } from '../ui/scores.js';
import { wallet } from '../wallet.js';
import { playDeath } from '../ui/death.js';

const PHASE_NAME = {
  intro: 'เริ่มเกม', day: 'กลางวัน', work: 'ทำงาน', chase: 'ไล่ล่า', dayResult: 'กลางวัน', night: 'กลางคืน',
  dawn: 'รุ่งเช้า', hunter: 'รุ่งเช้า', meeting: 'ประชุม', vote: 'โหวต', voteResult: 'ผลโหวต', ended: 'จบเกม',
};
const PHASE_SET = {
  intro: ['village', true], day: ['table', false], work: ['village', false], chase: ['village', false], dayResult: ['village', false],
  night: ['village', true], dawn: ['square', true], hunter: ['square', false], meeting: ['square', false],
  vote: ['square', false], voteResult: ['square', false], ended: ['square', (v) => v.winner === 'wolf'],
};
const PHASE_MUSIC = {
  intro: 'night', day: 'day', work: 'day', chase: 'tension', dayResult: 'day', night: 'night', dawn: 'night',
  hunter: 'tension', meeting: 'meeting', vote: 'tension', voteResult: 'tension',
};
const FRAMERS = ['wolf', 'shadow']; // ลูกฝูง: ป่วนงานกลางวัน ใส่ร้ายกลางคืน
const CHANNEL_NAME = { all: 'ห้องประชุม', ghost: 'ห้องผี (คนตายคุยกัน)', interrogate: 'สอบปากคำลับ' };

function killDeep(scene, obj) {
  scene.tweens.killTweensOf(obj);
  obj.list?.forEach((c) => killDeep(scene, c));
}

export class Game extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.scene.sleep('Backdrop');
    ensureMinigameTextures(this);
    ensureEmoteTextures(this);
    ensureChaseTextures(this);
    this.actors = new Map();
    this.state = null;
    this.phaseKey = null;
    this.timers = [];
    this.journalSeen = net.game?.me?.journal.length ?? 0;
    this.shownBar = null;
    // Phaser ใช้ซีนเดิมซ้ำทุกเกม: ล้างค่าที่ค้างจากเกมก่อน (ไม่งั้นเกมรอบสองจะไม่กลับห้องรอ / ไม่เด้งเตือน)
    this.leaving = false;
    this.cinema = false;
    this.deathFx = null;
    this.meAlive = undefined;
    this.shotSeen = undefined;
    this.lastJournal = undefined;
    this.lastChannel = undefined;
    this.weatherKey = null;
    this.minigame = null;
    this.chaseUI = null;
    this.hand = null;
    this.ui = {};
    this.modalsOpen = 0;
    this.onModalClosed = () => this.state && this.updateChat(this.state);

    this.buildWorld();
    this.actorLayer = this.add.container(0, 0).setDepth(30).setVisible(false);
    this.topLayer = this.add.container(0, 0).setDepth(32).setVisible(false);
    this.actorLayer.add(buildFire(this).all);
    this.shade = this.add.rectangle(320, 180, 640, 360, 0x05040c, 0).setDepth(60);
    this.phaseLayer = this.add.container(0, 0).setDepth(100);
    this.buildHud();
    this.buildChat();

    const onGame = (v) => this.onState(v);
    const onChat = (m) => this.addChat(m);
    const onRoom = (room) => {
      if (room.status === 'lobby' && !this.leaving) {
        this.leaving = true;
        go(this, 'Lobby');
      } else this.refreshEnded(room);
    };
    const onKicked = () => {
      if (this.leaving) return;
      this.leaving = true;
      toast(this, 'คุณออกจากห้องแล้ว', 'error');
      go(this, 'Menu');
    };
    net.events.on('game', onGame);
    net.events.on('gchat', onChat);
    net.events.on('room', onRoom);
    net.events.on('kicked', onKicked);
    const onTalk = (id, on) => this.actors.get(id)?.setTalking(on && this.actorLayer.visible);
    voice.events.on('talking', onTalk);
    const onEmote = ({ id, key }) => this.actorLayer.visible && this.actors.get(id)?.emote(key);
    const onHaunt = ({ kind }) => this.haunt(kind);
    const onChase = (c) => this.chaseUI?.update(c);
    // เหรียญรางวัลหลังจบเกม (อาจมาถึงก่อนหรือหลังหน้าจบเกม)
    const onWallet = (d) => d?.reward && this.state?.phase === 'ended' && this.showReward(d.reward);
    wallet.events.on('change', onWallet);
    net.events.on('chase', onChase);
    net.events.on('emote', onEmote);
    net.events.on('haunt', onHaunt);
    this.events.once('shutdown', () => {
      net.events.off('chase', onChase);
      wallet.events.off('change', onWallet);
      net.events.off('emote', onEmote);
      net.events.off('haunt', onHaunt);
      voice.events.off('talking', onTalk);
      net.events.off('game', onGame);
      net.events.off('gchat', onChat);
      net.events.off('room', onRoom);
      net.events.off('kicked', onKicked);
      this.hand?.cancel();
      this.scene.wake('Backdrop');
    });
    if (net.game) this.onState(net.game);
  }

  // ---------- ฉากเฉพาะของแต่ละช่วง ----------
  // village = หมู่บ้านมุมกว้าง, square = ลานหมู่บ้าน, table = โต๊ะจั่วการ์ด
  buildWorld() {
    const village = (k) => {
      const layer = this.add.container(0, 0);
      layer.add(this.add.image(0, 0, 'sky' + k).setOrigin(0));
      if (k) layer.add(this.add.image(110, 70, 'sun'));
      else {
        layer.add(this.add.image(500, 72, 'moon_glow'));
        layer.add(this.add.image(500, 72, 'moon'));
      }
      layer.add(this.add.image(0, 150, 'hills_far' + k).setOrigin(0));
      for (let x = -10; x < 660; x += 17) {
        layer.add(this.add.image(x, 232 + Math.sin(x * 0.07) * 6, 'pine_far' + k).setOrigin(0.5, 1).setScale(0.8 + Math.sin(x) * 0.15));
      }
      layer.add(this.add.image(0, 230, 'hills_near' + k).setOrigin(0));
      [[80, 292], [190, 288], [455, 288], [570, 294]].forEach(([hx, hy]) => {
        layer.add(this.add.image(hx, hy, 'house').setOrigin(0.5, 1));
        if (!k) {
          [[11, 35], [35, 35]].forEach(([wx, wy]) => {
            layer.add(this.add.image(hx - 26 + wx + 3, hy - 46 + wy + 2, 'glow').setScale(0.7).setBlendMode('ADD'));
            layer.add(this.add.image(hx - 26 + wx, hy - 46 + wy, 'window').setOrigin(0));
          });
        }
      });
      [[18, 300, 1.5], [48, 296, 1.2], [128, 294, 0.9], [520, 294, 1], [604, 298, 1.3], [632, 302, 1.6]].forEach(([x, y, sc]) =>
        layer.add(this.add.image(x, y, 'pine' + k).setOrigin(0.5, 1).setScale(sc)),
      );
      layer.add(this.add.image(0, 280, 'ground' + k).setOrigin(0));
      return layer;
    };
    const pair = (day, night) => {
      const c = this.add.container(0, 0).setAlpha(0);
      c.add([day, night]);
      c.night = night;
      return c;
    };
    const table = this.add.container(0, 0).setAlpha(0);
    table.add(this.add.image(0, 0, 'table').setOrigin(0));
    table.add(this.add.image(600, 170, 'glow').setScale(1.6).setBlendMode('ADD'));
    table.add(this.add.image(600, 196, 'candle').setOrigin(0.5, 1).setScale(2.2));
    const flame = this.add.image(600, 144, 'flame').setScale(2.2);
    table.add(flame);
    this.tweens.add({ targets: flame, scaleY: 2.6, scaleX: 2, duration: 180, yoyo: true, repeat: -1 });
    this.sets = {
      village: pair(village('_day'), village('')),
      square: pair(buildSquare(this, false), buildSquare(this, true)),
      table,
    };
    Object.values(this.sets).forEach((c) => c.setDepth(0));
    this.currentSet = null;
  }

  // สลับฉาก (เฟดข้ามกัน) และเวลากลางวัน/กลางคืน
  showSet(name, night, dur = 700) {
    for (const [k, c] of Object.entries(this.sets)) {
      this.tweens.killTweensOf(c);
      this.tweens.add({ targets: c, alpha: k === name ? 1 : 0, duration: this.currentSet ? dur : 0 });
    }
    const set = this.sets[name];
    if (set.night) {
      this.tweens.killTweensOf(set.night);
      if (this.currentSet !== name) set.night.setAlpha(night ? 1 : 0);
      else this.tweens.add({ targets: set.night, alpha: night ? 1 : 0, duration: dur * 2, ease: 'Sine.InOut' });
    }
    this.currentSet = name;
    const square = name === 'square';
    this.actorLayer.setVisible(square);
    this.topLayer.setVisible(square);
  }

  // ---------- แถบบน ----------
  buildHud() {
    const d = 200;
    this.add.existing(panel(this, 320, 18, 632, 32, 'panel_dark')).setDepth(d);
    this.phaseIcon = this.add.image(16, 18, 'i_sun').setDepth(d);
    this.dayText = txt(this, 28, 18, '', { size: 13, origin: [0, 0.5], color: COLORS.gold }).setDepth(d);
    this.eventIcon = this.add.image(150, 18, 'e_sunny').setDepth(d).setVisible(false).setInteractive({ useHandCursor: true });
    this.eventIcon.on('pointerup', () => {
      const e = EVENTS[this.state?.event];
      if (e) toast(this, `${e.name}: ${e.desc}`);
    });

    txt(this, 220, 18, 'พิธีขับไล่', { size: 11, origin: [1, 0.5], color: COLORS.dim }).setDepth(d);
    this.add.nineslice(300, 18, 'slot', undefined, 150, 14, 4, 4, 4, 4).setDepth(d);
    this.barFill = this.add.rectangle(227, 18, 146, 8, 0xe8b84a).setOrigin(0, 0.5).setDepth(d);
    this.barShine = this.add.rectangle(227, 15, 146, 1, 0xfff0b0).setOrigin(0, 0.5).setDepth(d);
    this.barText = txt(this, 300, 18, '', { size: 10 }).setDepth(d);

    this.hearts = [0, 1].map((i) => this.add.image(392 + i * 11, 18, 'i_heart').setDepth(d));
    this.timerText = txt(this, 440, 18, '', { size: 14, origin: [0, 0.5] }).setDepth(d);

    this.roleBtn = new Button(this, 512, 18, '', { w: 78, h: 22, size: 10, color: 'btn_dark', onClick: () => this.showRole() }).setDepth(d);
    this.mic = new MicControl(this, { x: 563, y: 18, holdX: 520, holdY: 342, holdW: 120, depth: d });
    this.journalBtn = iconButton(this, 590, 18, 'i_book', () => this.showJournal()).setDepth(d);
    this.badge = this.add.circle(600, 9, 5, 0xd0434a).setDepth(d + 1).setVisible(false);
    iconButton(this, 620, 18, 'i_door', () => this.confirmLeave()).setDepth(d);
    this.timeBar = this.add.rectangle(4, 35, 632, 2, 0xe8b84a).setOrigin(0, 0.5).setDepth(d);
    // คนตายหลอกหลอนได้
    this.hauntBtn = new Button(this, 70, 342, 'หลอกหลอน', { w: 116, h: 24, size: 11, color: 'btn_dark', icon: 'i_skull', onClick: () => this.doHaunt() }).setDepth(d).setVisible(false);
    // คนตายเลือกติดตามดูผู้เล่นคนอื่นได้
    this.watchBtn = new Button(this, 192, 342, 'ติดตามดู', { w: 112, h: 24, size: 11, color: 'btn_dark', icon: 'i_eye', onClick: () => this.pickWatch() }).setDepth(d).setVisible(false);
    this.specBar = this.buildSpecBar(d);
  }

  doHaunt() {
    net.socket.emit('ghost:haunt');
    sfx.wind();
    this.hauntBtn.setEnabled(false);
    let left = 12;
    this.hauntBtn.setLabel(`รอ ${left} วิ`);
    const t = this.time.addEvent({ delay: 1000, repeat: 11, callback: () => {
      left--;
      if (left > 0) this.hauntBtn.setLabel(`รอ ${left} วิ`);
      else {
        this.hauntBtn.setLabel('หลอกหลอน').setEnabled(true);
        t.remove();
      }
    } });
  }

  // ผีหลอก: ตะเกียงกะพริบ / ลมหวิว / เย็นวาบ (ทุกคนเห็น แต่ไม่รู้ว่าใครทำ)
  haunt(kind) {
    const cam = this.cameras.main;
    sfx.ghost();
    if (kind === 'lamp') {
      sfx.tick();
      const dark = this.add.rectangle(320, 180, 640, 360, 0x000000, 0).setDepth(190);
      this.tweens.add({ targets: dark, fillAlpha: 0.7, duration: 60, yoyo: true, repeat: 4, onComplete: () => dark.destroy() });
    } else if (kind === 'wind') {
      sfx.wind();
      cam.shake(600, 0.003);
      const leaves = this.add.particles(-10, 0, 'px2', {
        y: { min: 60, max: 320 }, speedX: { min: 220, max: 380 }, speedY: { min: -20, max: 40 },
        lifespan: 2600, tint: [0x8a6a3a, 0xa8883e, 0x5a8a4a], scale: 2, frequency: 40, rotate: { min: 0, max: 360 },
      }).setDepth(190);
      this.time.delayedCall(900, () => leaves.stop());
      this.time.delayedCall(3600, () => leaves.destroy());
    } else {
      sfx.heartbeat();
      cam.flash(400, 120, 160, 255);
    }
    if (Math.random() < 0.6) toast(this, ['มีบางอย่างแปลก ๆ...', 'รู้สึกเย็นวาบที่ต้นคอ...', 'ใครกระซิบหรือเปล่านะ?'][Math.floor(Math.random() * 3)]);
  }

  updateHud(v) {
    const ghost = !!v.me && !v.me.alive && v.phase !== 'ended';
    this.hauntBtn?.setVisible(ghost);
    this.watchBtn?.setVisible(ghost && !v.spectate);
    this.updateSpecBar(v, ghost);
    const night = v.phase === 'night';
    this.phaseIcon.setTexture(night ? 'i_moon' : 'i_sun');
    // หลังกลางคืน (รุ่งเช้า ประชุม โหวต) นับเป็นวันใหม่แล้ว
    const day = v.day + (['dawn', 'hunter', 'meeting', 'vote', 'voteResult'].includes(v.phase) ? 1 : 0);
    this.dayText.setText(v.day ? `วันที่ ${day} · ${PHASE_NAME[v.phase] || ''}` : PHASE_NAME[v.phase] || '');
    // ไอคอนสถานการณ์วันนี้ (แตะดูรายละเอียด)
    const evOn = v.event && v.event !== 'normal' && v.phase !== 'ended' && v.phase !== 'intro';
    this.eventIcon.setVisible(evOn);
    if (evOn) this.eventIcon.setTexture(EVENTS[v.event].icon).setX(this.dayText.x + this.dayText.width + 10);
    this.setWeather(v);
    const me = v.me;
    if (me) {
      const role = ROLES[me.role];
      this.roleBtn.setLabel(role.name);
      this.hearts.forEach((h, i) => h.setTexture(i < me.hp ? 'i_heart' : 'i_heart_empty'));
      const total = me.journal.length;
      this.badge.setVisible(total > this.journalSeen);
      if (total > (this.lastJournal ?? total)) {
        me.journal.slice(this.lastJournal).forEach((j) => {
          if (v.phase !== 'dayResult' || j.kind === 'wolf') toast(this, j.text, j.kind === 'danger' ? 'error' : 'info');
        });
        sfx.chat();
      }
      this.lastJournal = total;
    }
    // หลอดเควสค่อย ๆ เพิ่ม
    const ratio = Math.min(1, v.bar.value / v.bar.target);
    this.barText.setText(`${v.bar.value}/${v.bar.target}`);
    if (this.shownBar === null) {
      this.shownBar = ratio;
      this.barFill.width = 146 * ratio;
    } else if (ratio !== this.shownBar) {
      this.shownBar = ratio;
      this.tweens.add({ targets: [this.barFill, this.barShine], width: 146 * ratio, duration: 900, delay: 600, ease: 'Cubic.Out' });
      this.time.delayedCall(700, () => sfx.success());
    }
    this.barShine.width = this.barFill.width;
  }

  update(_, dt) {
    this.minigame?.update(dt);
    this.chaseUI?.tick(dt);
    // ใกล้หมดเวลาเฟสทำงาน: ส่งคะแนนเท่าที่ทำได้ก่อน จะได้ไม่เสียแต้ม
    if (this.minigame && !this.minigame.practice && !this.minigame.finished && this.state?.phase === 'work' && net.timeLeft() < 700) this.minigame.finish();
    if (this.ui?.outfitBox && this.state?.phase === 'work' && net.timeLeft() < 500) this.ui.outfitBox.finish(null);
    const v = this.state;
    if (!v) return;
    const left = net.timeLeft();
    if (!v.endsAt) {
      this.timerText.setText('');
      this.timeBar.width = 0;
      return;
    }
    const secs = Math.ceil(left / 1000);
    const label = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    if (this.timerText.text !== label) {
      this.timerText.setText(label);
      if (secs <= 5 && secs > 0 && ['day', 'night', 'vote', 'meeting', 'hunter'].includes(v.phase)) (secs <= 3 ? sfx.tickHi : sfx.tick)();
    }
    this.timerText.setColor(secs <= 5 ? COLORS.red : COLORS.text);
    this.timeBar.width = 632 * (left / Math.max(1, v.duration));
  }

  // ---------- แชท ----------
  buildChat() {
    this.chatBox = this.add.container(0, 0).setDepth(150);
    this.chatBox.add(panel(this, 520, 182, 222, 270));
    this.chatTitle = txt(this, 520, 60, '', { size: 12, color: COLORS.gold });
    this.chatBox.add(this.chatTitle);
    const log = document.createElement('div');
    log.className = 'px-chat';
    log.style.height = '196px';
    this.chatLog = log;
    this.chatDom = this.add.dom(520, 174, log).setDepth(150);
    const { el, dom } = domInput(this, 494, 296, 160, { placeholder: 'พิมพ์ข้อความ...', maxLength: 200, onEnter: () => send() });
    this.chatInput = el;
    this.chatInputDom = dom;
    const send = () => {
      const t = el.value.trim();
      if (!t) return;
      net.socket.emit('room:chat', t);
      el.value = '';
    };
    this.chatSend = iconButton(this, 598, 296, 'i_chat', send).setDepth(151);
    this.emotes = new EmoteBar(this, { x: 436, y: 60, depth: 152 });
    this.setChatVisible(false);
  }

  setChatVisible(on, canType = true) {
    // แชทเป็น HTML ลอยทับจอ ต้องซ่อนตอนเล่นคัตซีนเต็มจอ และตอนมีป๊อปอัปเปิดอยู่ (เช่น สมุดบันทึก)
    if (this.cinema || this.modalsOpen > 0) on = false;
    this.chatBox.setVisible(on);
    this.chatDom.setVisible(on);
    this.chatInputDom.setVisible(on && canType);
    this.chatSend.setVisible(on && canType);
    this.emotes?.setVisible(on && this.state?.me?.chat === 'all');
  }

  updateChat(v) {
    const channel = v.me?.chat;
    const inSquare = ['meeting', 'vote', 'voteResult', 'ended'].includes(v.phase);
    const show = !!channel || inSquare;
    this.setChatVisible(show, !!channel);
    let title = CHANNEL_NAME[channel] || 'ห้องประชุม (ฟังอย่างเดียว)';
    if (channel === 'interrogate') {
      const other = v.players.find((p) => p.id === v.me.interrogation);
      title = `สอบปากคำลับกับ ${other?.name || ''}`;
    }
    if (v.phase === 'ended') title = 'คุยกันหลังจบเกม';
    this.chatTitle.setText(title);
    if (channel === 'interrogate' && this.lastChannel !== 'interrogate') {
      // แชทลับเปิดทีหลัง: ขยับตารางเลือกเป้าหมายไปทางซ้ายให้พ้นแชท
      const pk = this.ui?.picker;
      if (pk?.active && pk.x > 200) this.tweens.add({ targets: pk, x: 200, scale: Math.min(1, 380 / pk.list[0].width), duration: 300 });
      sfx.bell();
      this.chatSys('— ห้องสอบปากคำลับ คุยกันได้สองคนเท่านั้น —');
    }
    this.lastChannel = channel;
  }

  chatSys(text) {
    const line = document.createElement('div');
    line.className = 'sys';
    line.textContent = text;
    this.chatLog.appendChild(line);
    this.chatLog.scrollTop = this.chatLog.scrollHeight;
  }

  addChat(m) {
    const line = document.createElement('div');
    line.className = (m.from === net.me ? 'me ' : '') + (m.channel !== 'all' ? 'ch-' + m.channel : '');
    const b = document.createElement('b');
    b.textContent = (m.channel === 'ghost' ? '[ผี] ' : '') + m.name + ': ';
    line.append(b, document.createTextNode(m.text));
    this.chatLog.appendChild(line);
    this.chatLog.scrollTop = this.chatLog.scrollHeight;
    sfx.chat();
    if (m.channel === 'all') this.bubble(m.from, m.text);
  }

  bubble(id, text) {
    const a = this.actors.get(id);
    if (!a || !this.actorLayer.visible) return;
    a.bubble?.destroy();
    const short = text.length > 26 ? text.slice(0, 25) + '…' : text;
    const t = txt(this, 0, 0, short, { size: 11, color: COLORS.ink, shadow: false });
    const w = Math.max(30, t.width + 14);
    // ไม่ให้ล้นจอ และไม่ให้มุดใต้กล่องแชท (แชทเป็น HTML ทับแคนวาสอยู่ทางขวา)
    const right = this.chatBox.visible ? 404 : 636;
    const cx = Phaser.Math.Clamp(a.x, w / 2 + 4, right - w / 2);
    const c = this.add.container(cx, a.y - 78).setDepth(140);
    c.add([this.add.nineslice(0, 0, 'panel_paper', undefined, w, 22, 8, 8, 8, 8), this.add.triangle(a.x - cx, 12, -4, 0, 4, 0, 0, 5, 0xe8d5a8), t]);
    stackBubble(c, w, [...this.actors.values()].map((o) => o.bubble));
    a.bubble = c;
    c.setScale(0);
    this.tweens.add({ targets: c, scale: 1, duration: 200, ease: 'Back.Out' });
    this.time.delayedCall(3200, () => {
      if (a.bubble !== c) return;
      this.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: () => c.destroy() });
    });
  }

  // ---------- ตัวละครในลานหมู่บ้าน ----------
  buildActors(v) {
    v.players.forEach((p, i) => {
      const [x, y] = SEATS[i % SEATS.length];
      const a = new Actor(this, p, x, y, { layer: this.actorLayer, top: this.topLayer, isMe: p.id === net.me });
      a.faceFire();
      a.hp = -1;
      a.sprite.on('pointerup', () => this.onActorClick(p.id));
      a.sprite.on('pointerover', () => this.actorHover(a, true));
      a.sprite.on('pointerout', () => this.actorHover(a, false));
      this.actors.set(p.id, a);
    });
    this.actorLayer.sort('depth');
  }

  updateActors(v) {
    if (!this.actors.size) this.buildActors(v);
    for (const p of v.players) {
      const a = this.actors.get(p.id);
      if (!a) continue;
      if (a.alive && !p.alive) a.die(this.actorLayer.visible);
      else if (p.alive && a.hp !== p.hp) a.setHearts(p.hp);
      a.hp = p.hp;
      a.setConnected(p.connected);
      a.setOutfit(p.outfit);
      a.setPlate(p.plate);
      a.setRole(p.role ? ROLES[p.role].icon : null);
      a.setCheck(
        (v.phase === 'meeting' && (v.meetingReady || []).includes(p.id)) ||
          (v.phase === 'ended' && !!net.room?.players.find((x) => x.id === p.id)?.ready),
      );
      a.setMark(v.me?.lover && (p.id === v.me.lover || p.id === net.me) ? 'i_heart' : null);
      if (p.alive && !a.alive) a.revive();
    }
    // ป้ายโหวต
    const tally = {};
    for (const t of Object.values(v.votes || {})) tally[t] = (tally[t] || 0) + 1;
    for (const a of this.actors.values()) {
      a.setBadge(v.phase === 'vote' || v.phase === 'voteResult' ? tally[a.id] || 0 : 0);
      a.setMine(v.phase === 'vote' && v.votes?.[net.me] === a.id);
    }
  }

  actorHover(a, on) {
    const v = this.state;
    if (!a.alive || v?.phase !== 'vote' || !v.me?.alive || a.id === net.me) return;
    if (on) a.sprite.setTint(0xffd0d0);
    else a.sprite.clearTint();
  }

  onActorClick(id) {
    const v = this.state;
    if (v?.phase === 'vote' && v.me?.alive && id !== net.me && this.actors.get(id)?.alive) {
      net.act('vote', id);
      sfx.select();
    }
  }

  // ---------- ตัวจัดการเฟส ----------
  onState(v) {
    // เล่นต่อจากหน้าจบเกม: ตาใหม่เริ่มแล้ว เปิดหน้าเกมใหม่ทั้งหน้า (ตัวละคร บทบาท ล้างของตาก่อน)
    if (this.state?.phase === 'ended' && v.phase !== 'ended') {
      if (!this.leaving) {
        this.leaving = true;
        go(this, 'Game');
      }
      return;
    }
    this.state = v;
    if (v.shot && v.shot.at !== this.shotSeen) {
      const first = this.shotSeen === undefined && v.phase !== 'hunter' && this.phaseKey === null;
      this.shotSeen = v.shot.at;
      if (!first) this.later(300, () => this.hunterShotFx(v));
    }
    this.updateHud(v);
    this.updateActors(v);
    this.updateChat(v);
    if (v.me) {
      if (this.meAlive === true && !v.me.alive && v.phase !== 'ended') this.deathScene(v);
      this.meAlive = v.me.alive;
    }
    const key = `${v.phase}:${v.day}:${v.hunter?.id || ''}`;
    if (key !== this.phaseKey) {
      this.phaseKey = key;
      this.clearPhase();
      // ทุกเฟสมีฉากของตัวเอง (กันกรณีเข้าเกมกลางคัน)
      const [setName, night] = PHASE_SET[v.phase] || ['village', true];
      this.showSet(setName, typeof night === 'function' ? night(v) : night);
      if (PHASE_MUSIC[v.phase]) music.play(PHASE_MUSIC[v.phase]);
      this['enter_' + v.phase]?.(v);
    } else {
      this['refresh_' + v.phase]?.(v);
    }
    this.renderSpectate(v);
  }

  clearPhase() {
    this.minigame?.destroy();
    this.minigame = null;
    this.chaseUI?.destroy();
    this.chaseUI = null;
    this.hand?.cancel();
    this.hand = null;
    this.timers.forEach((t) => t.remove());
    this.timers = [];
    killDeep(this, this.phaseLayer);
    this.phaseLayer.removeAll(true);
    this.phaseDoms?.forEach((d) => d.destroy());
    this.phaseDoms = [];
    this.tweens.killTweensOf(this.shade);
    this.ui = {};
  }

  later(ms, fn) {
    this.timers.push(this.time.delayedCall(ms, fn));
  }

  setShade(alpha, dur = 400) {
    this.tweens.killTweensOf(this.shade);
    this.tweens.add({ targets: this.shade, fillAlpha: alpha, duration: dur });
  }

  // กึ่งกลางพื้นที่ว่าง (ถ้าแชทเปิดอยู่ทางขวา ให้ขยับมาทางซ้าย)
  get cx() {
    return this.chatBox.visible ? 200 : 320;
  }

  banner(title, sub, color = COLORS.gold, y = 84, hold = 2200) {
    const c = this.add.container(this.cx, y);
    const t = txt(this, 0, 0, title, { size: 28, color, bold: true });
    const w = Math.max(220, t.width + 60);
    c.add(this.add.rectangle(0, 0, w, 44, 0x0b0a1a, 0.85));
    c.add(this.add.rectangle(0, -22, w, 2, Phaser.Display.Color.HexStringToColor(color).color));
    c.add(this.add.rectangle(0, 22, w, 2, Phaser.Display.Color.HexStringToColor(color).color));
    c.add(t);
    if (sub) c.add(txt(this, 0, 36, sub, { size: 13 }));
    this.phaseLayer.add(c);
    c.setScale(1.6, 0).setAlpha(0);
    this.tweens.add({ targets: c, scaleX: 1, scaleY: 1, alpha: 1, duration: 380, ease: 'Back.Out' });
    if (hold) this.later(hold, () => this.tweens.add({ targets: c, alpha: 0, y: y - 16, duration: 400 }));
    return c;
  }

  note(text, y = 330, color = COLORS.text, size = 14) {
    const t = txt(this, this.cx, y, text, { size, color, wrap: this.chatBox.visible ? 380 : 520 });
    // แถบพื้นหลังเข้ม ให้อ่านออกทุกฉาก (บนโต๊ะไม้ ภาพสถานที่ ท้องฟ้า)
    const bg = this.add.rectangle(t.x, t.y, t.width + 18, t.height + 2, 0x0b0a1a, text ? 0.6 : 0);
    this.phaseLayer.add([bg, t]);
    t.bg = bg;
    const setText = t.setText.bind(t);
    t.setText = (s) => {
      setText(s);
      bg.setSize(t.width + 18, t.height + 2).setFillStyle(0x0b0a1a, s ? 0.6 : 0);
      return t;
    };
    const setX = t.setX.bind(t);
    t.setX = (x) => {
      setX(x);
      bg.setX(x);
      return t;
    };
    t.alpha = 0;
    bg.alpha = 0;
    this.tweens.add({ targets: [t, bg], alpha: 1, duration: 300 });
    return t;
  }

  // ตารางเลือกผู้เล่น (ใช้กับกลางคืน / ซุ่ม / นายพราน)
  picker(title, candidates, onPick, { skip = null, blocked = null, marks = {}, multi = 1 } = {}) {
    const chosen = [];
    const box = this.add.container(this.cx, 196);
    const cols = Math.min(this.chatBox.visible ? 4 : 6, candidates.length + (skip ? 1 : 0));
    const rowsN = Math.ceil((candidates.length + (skip ? 1 : 0)) / cols);
    const W = cols * 74 + 30;
    const H = rowsN * 84 + 60;
    box.add(panel(this, 0, 0, W, H));
    box.add(txt(this, 0, -H / 2 + 20, title, { size: 15, color: COLORS.gold }));
    const cells = [];
    const all = [...candidates, ...(skip ? [{ id: null, name: skip, skip: true }] : [])];
    all.forEach((p, i) => {
      const cx = -W / 2 + 52 + (i % cols) * 74;
      const cy = -H / 2 + 80 + Math.floor(i / cols) * 84;
      const cell = this.add.container(cx, cy);
      const bg = this.add.nineslice(0, 0, 'slot', undefined, 66, 78, 4, 4, 4, 4);
      cell.add(bg);
      if (p.skip) cell.add(this.add.image(0, -8, 'i_skip').setScale(2.5));
      else cell.add(addCharacter(this, 0, 22, p.outfit, 2));
      cell.add(txt(this, 0, 30, p.name, { size: 10 }));
      if (marks[p.id]) cell.add(this.add.image(24, -30, marks[p.id]));
      const disabled = blocked != null && blocked === p.id;
      if (disabled) {
        cell.setAlpha(0.35);
        cell.add(txt(this, 0, -30, 'คืนก่อน', { size: 9, color: COLORS.red }));
      }
      const hit = this.add.zone(0, 0, 66, 78).setInteractive({ useHandCursor: !disabled });
      cell.add(hit);
      hit.on('pointerover', () => {
        if (box.locked || disabled) return;
        bg.setTexture('slot_on');
        sfx.hover();
        this.tweens.add({ targets: cell, y: cy - 3, duration: 100 });
      });
      hit.on('pointerout', () => {
        if (box.locked || cell.chosen) return;
        bg.setTexture('slot');
        this.tweens.add({ targets: cell, y: cy, duration: 100 });
      });
      hit.on('pointerup', () => {
        if (box.locked || disabled) return;
        if (multi > 1 && !p.skip) {
          // เลือกหลายคน: กดซ้ำเพื่อยกเลิก ครบจำนวนแล้วส่งทันที
          cell.chosen = !cell.chosen;
          bg.setTexture(cell.chosen ? 'slot_on' : 'slot');
          sfx.select();
          if (cell.chosen) chosen.push(p.id);
          else chosen.splice(chosen.indexOf(p.id), 1);
          if (chosen.length < multi) return;
          box.locked = true;
          cells.forEach((c) => !c.chosen && this.tweens.add({ targets: c, alpha: 0.3, duration: 200 }));
          return onPick([...chosen]);
        }
        box.locked = true;
        cell.chosen = true;
        bg.setTexture('slot_on');
        sfx.select();
        cells.forEach((c) => c !== cell && this.tweens.add({ targets: c, alpha: 0.3, duration: 200 }));
        this.tweens.add({ targets: cell, scale: 1.12, duration: 180, yoyo: true });
        onPick(p.id);
      });
      cells.push(cell);
      box.add(cell);
    });
    this.phaseLayer.add(box);
    box.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 300, ease: 'Back.Out' });
    this.ui.picker = box;
    return box;
  }

  others(v, includeSelf = false) {
    return v.players.filter((p) => p.alive && (includeSelf || p.id !== net.me));
  }

  // ----- บทบาท -----
  enter_intro(v) {
    this.setShade(0.75, 0);
    const role = ROLES[v.me.role];
    this.ui.introHead = this.note('บทบาทของคุณคือ...', 54, COLORS.dim, 14);
    const card = this.add.container(320, 180);
    const back = this.add.image(0, 0, 'card_back').setScale(2.4);
    const front = this.add.container(0, 0).setVisible(false);
    front.add(this.add.nineslice(0, 0, 'panel', undefined, 150, 206, 8, 8, 8, 8));
    front.add(this.add.image(0, -42, role.icon).setScale(5));
    front.add(txt(this, 0, 22, role.name, { size: 18, color: TEAM_COLOR[role.team], bold: true }));
    const team = { wolf: 'ฝ่ายหมาป่า', village: 'ฝ่ายชาวบ้าน', neutral: 'ฝ่ายอิสระ' }[role.team];
    front.add(txt(this, 0, 44, team, { size: 11, color: COLORS.dim }));
    front.add(txt(this, 0, 74, role.goal, { size: 10, wrap: 130 }));
    card.add([back, front]);
    this.phaseLayer.add(card);
    card.y = -120;
    this.tweens.add({ targets: card, y: 180, duration: 700, ease: 'Back.Out' });
    this.later(1300, () => {
      sfx.flip();
      this.tweens.add({
        targets: card,
        scaleX: 0,
        duration: 180,
        yoyo: true,
        onYoyo: () => {
          back.setVisible(false);
          front.setVisible(true);
          if (role.team === 'wolf') {
            sfx.howl();
            this.cameras.main.flash(300, 120, 0, 0);
          } else sfx.shine();
        },
      });
    });
    this.later(2400, () => this.note(role.desc, 316, COLORS.text, 12));
    this.later(3400, () => this.rolesStrip());
  }

  // แถบไอคอนอาชีพที่อาจมีในเกมนี้ (กดเพื่อเปิดสมุดอาชีพ)
  rolesStrip() {
    const list = this.gameRoles();
    const head = this.ui.introHead;
    if (head) this.tweens.add({ targets: [head, head.bg], alpha: 0, duration: 250 });
    const c = this.add.container(320, 54);
    const w = list.length * 22 + 96;
    c.add(this.add.rectangle(0, 0, w, 26, 0x0b0a1a, 0.7));
    c.add(txt(this, -w / 2 + 8, 0, 'เกมนี้อาจมี:', { size: 10, color: COLORS.dim, origin: [0, 0.5] }));
    list.forEach((key, i) => {
      const ic = this.add.image(-w / 2 + 84 + i * 22, 0, ROLES[key].icon).setScale(1.6);
      c.add(ic);
      ic.alpha = 0;
      this.tweens.add({ targets: ic, alpha: 1, duration: 200, delay: i * 50 });
    });
    c.setSize(w, 26).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => this.openGuide());
    this.phaseLayer.add(c);
  }

  // ----- กลางวัน: จั่วการ์ด -----
  enter_day(v) {
    this.setShade(0.1);
    sfx.bell();
    this.later(1500, () => sfx.birds());
    const special = v.event && v.event !== 'normal';
    if (special) this.eventCard(v.event);
    const me = v.me;
    const alpha = me.role === 'alpha' && me.alive;
    if (!special) this.banner(`วันที่ ${v.day}`, alpha ? 'เลือกสถานที่ แล้วเลือกว่าจะซ่อนตัวซุ่มหรือทำงานปกติ' : 'เลือกสถานที่ที่จะไปทำงานวันนี้', alpha ? COLORS.red : COLORS.gold, 80, 1800);
    if (!me.alive) {
      this.ui.ghostNote = this.note('คุณเป็นวิญญาณ... ได้แต่เฝ้ามองชาวบ้านทำงาน', 200, COLORS.dim);
      return;
    }
    if (alpha && me.pick && me.lurk === null) return this.modeChoice(me.pick);
    if (me.pick || !me.hand) {
      this.waitingNote(v);
      return;
    }
    const deck = makeDeck(this, 584, 90);
    this.phaseLayer.add(deck);
    this.later(special ? 2800 : 900, () => {
      this.hand = dealHand(this, {
        from: { x: 584, y: 90 },
        slots: [{ x: 196, y: 220 }, { x: 320, y: 228 }, { x: 444, y: 220 }],
        locs: me.hand,
        pickY: 170,
        onPick: (loc) => net.act('pick', loc),
      });
      this.hand.then(({ card }) => {
        this.phaseLayer.add(card);
        if (!alpha) return this.waitingNote(this.state);
        this.tweens.add({ targets: card, alpha: 0, scale: card.scale * 0.8, duration: 250, onComplete: () => card.destroy() });
        this.modeChoice(card.locKey);
      });
    });
  }

  // จ่าฝูง: วันนี้จะซ่อนตัวซุ่ม (ไม่มีใครเห็น โจมตีได้) หรือทำงานปกติ (มีพยาน ไม่โจมตี)
  modeChoice(locKey) {
    const loc = LOCATIONS[locKey];
    const box = this.add.container(320, 196);
    box.add(panel(this, 0, 0, 380, 224));
    box.add(txt(this, 0, -94, `วันนี้จะทำอะไรที่${loc.name}?`, { size: 15, color: COLORS.gold }));
    const opts = [
      { mode: 'lurk', x: -92, lair: true, label: 'ซ่อนตัวซุ่ม', sub: 'ไม่มีใครเห็นคุณ · ซุ่มโจมตีได้', color: COLORS.red },
      { mode: 'work', x: 92, lair: false, label: 'ทำงานปกติ', sub: 'มีคนเห็นเป็นพยาน · ไม่ซุ่มวันนี้', color: COLORS.text },
    ];
    const cells = opts.map((o) => {
      const cell = this.add.container(o.x, 0);
      const card = new Card(this, 0, -22, locKey, { lair: o.lair });
      card.back.setVisible(false);
      card.front.setVisible(true);
      card.faceUp = true;
      card.setScale(1.25);
      cell.add([card, txt(this, 0, 52, o.label, { size: 14, color: o.color, bold: true }), txt(this, 0, 70, o.sub, { size: 9, color: COLORS.dim })]);
      const hit = this.add.zone(0, 10, 170, 170).setInteractive({ useHandCursor: true });
      cell.add(hit);
      hit.on('pointerover', () => {
        if (box.locked) return;
        sfx.hover();
        card.glow.setAlpha(1);
        this.tweens.add({ targets: card, y: -28, duration: 100 });
      });
      hit.on('pointerout', () => {
        if (box.locked) return;
        card.glow.setAlpha(0);
        this.tweens.add({ targets: card, y: -22, duration: 100 });
      });
      hit.on('pointerup', () => {
        if (box.locked) return;
        box.locked = true;
        net.act('mode', o.mode);
        (o.mode === 'lurk' ? sfx.growl : sfx.select)();
        cells.forEach((c) => c !== cell && this.tweens.add({ targets: c, alpha: 0.25, duration: 200 }));
        this.tweens.add({ targets: cell, scale: 1.08, duration: 180, yoyo: true });
        this.later(700, () => {
          this.tweens.add({ targets: box, alpha: 0, scale: 0.9, duration: 220, onComplete: () => box.destroy() });
          this.waitingNote(this.state);
        });
      });
      box.add(cell);
      return cell;
    });
    this.phaseLayer.add(box);
    box.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 280, ease: 'Back.Out' });
  }

  // การ์ดประกาศสถานการณ์ประจำวัน
  eventCard(key) {
    const e = EVENTS[key];
    const c = this.add.container(320, 150);
    c.add(panel(this, 0, 0, 300, 150, 'panel_paper'));
    c.add(txt(this, 0, -54, `เช้าวันนี้...`, { size: 11, color: '#8a6a3a', shadow: false }));
    c.add(this.add.image(0, -18, e.icon).setScale(4));
    c.add(txt(this, 0, 22, e.name, { size: 20, color: '#8a3b2e', shadow: false, bold: true }));
    c.add(txt(this, 0, 48, e.desc, { size: 11, color: COLORS.ink, shadow: false, wrap: 270 }));
    this.phaseLayer.add(c);
    c.setScale(0.2).setAngle(-12).setAlpha(0);
    sfx.whoosh();
    this.tweens.add({ targets: c, scale: 1, angle: 0, alpha: 1, duration: 450, ease: 'Back.Out' });
    this.later(500, () => sfx.shine());
    this.later(2300, () => this.tweens.add({ targets: c, y: -120, alpha: 0, duration: 400, ease: 'Quad.In' }));
  }

  // สภาพอากาศตามสถานการณ์: ฝน / หมอก / พระจันทร์แดง / ธงเทศกาล
  setWeather(v) {
    let key = v.phase === 'ended' || v.phase === 'intro' ? 'normal' : v.event || 'normal';
    // ตอนจั่วการ์ดอยู่ในบ้าน ไม่ต้องมีฝน/หมอก
    if (v.phase === 'day' && (key === 'rain' || key === 'fog')) key = 'normal';
    const night = v.phase === 'night';
    const want = `${key}:${night}`;
    if (this.weatherKey === want) return;
    this.weatherKey = want;
    this.weather?.destroy();
    this.weatherTimer?.remove();
    this.weather = this.add.container(0, 0).setDepth(55);
    const w = this.weather;
    if (key === 'rain') {
      w.add(this.add.rectangle(320, 180, 640, 360, 0x203048, 0.25));
      w.add(this.add.particles(0, -10, 'px2', {
        x: { min: -40, max: 660 }, speedY: { min: 380, max: 460 }, speedX: -60, lifespan: 1000,
        scaleY: 3, scaleX: 0.5, alpha: 0.55, tint: 0xa8c8ff, frequency: 8, quantity: 2,
      }));
      this.weatherTimer = this.time.addEvent({ delay: 6000, loop: true, callback: () => Math.random() < 0.5 && this.cameras.main.flash(120, 200, 210, 255) });
    } else if (key === 'fog') {
      for (let i = 0; i < 6; i++) {
        const f = this.add.image(Phaser.Math.Between(0, 640), 120 + i * 40, 'fog').setScale(4, 3).setAlpha(0.9);
        w.add(f);
        this.tweens.add({ targets: f, x: f.x + 140, duration: 9000 + i * 1500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
      w.add(this.add.rectangle(320, 180, 640, 360, 0xc8c0d8, 0.12));
    } else if (key === 'fullmoon' && night) {
      w.add(this.add.rectangle(320, 180, 640, 360, 0x6a0a14, 0.22));
      const m = this.add.image(500, 72, 'moon').setScale(1.6).setTint(0xff6a5a);
      w.add(m);
      this.tweens.add({ targets: m, scale: 1.7, duration: 1500, yoyo: true, repeat: -1 });
    } else if (key === 'festival' && !night) {
      const cols = [0xd0434a, 0xe8b84a, 0x5a8ad0, 0x6ab85a];
      for (let x = 0; x < 640; x += 16) {
        const y = 44 + Math.sin(x / 60) * 6;
        w.add(this.add.triangle(x, y, 0, 0, 12, 0, 6, 10, cols[(x / 16) % 4]).setOrigin(0));
      }
      w.add(this.add.rectangle(320, 44, 640, 1, 0x3a2418));
    } else if (key === 'sunny' && !night) {
      w.add(this.add.rectangle(320, 180, 640, 360, 0xffe8a0, 0.08));
    } else if (key === 'drought' && !night) {
      w.add(this.add.rectangle(320, 180, 640, 360, 0xc87a3a, 0.1));
    }
  }

  waitingNote(v) {
    const alive = v.players.filter((p) => p.alive);
    const done = alive.filter((p) => p.picked).length;
    if (!this.ui.wait) this.ui.wait = this.note('', 316, COLORS.dim, 13);
    this.ui.wait.setText(`รอเพื่อน ๆ เลือกสถานที่... (${done}/${alive.length})`);
  }

  refresh_day(v) {
    if (this.ui.wait) this.waitingNote(v);
  }

  // ----- ทำงาน: เดินไปสถานที่ แล้วเล่นมินิเกม -----
  enter_work(v) {
    this.setShade(0);
    const me = v.me;
    const meP = v.players.find((p) => p.id === net.me);
    if (!me.alive || !me.work) {
      this.ui.ghostNote = this.note('ชาวบ้านแยกย้ายกันไปทำงาน...', 200, COLORS.dim);
      return;
    }
    if (me.work.lurk) return this.lurkScene(v);
    if (me.work.done) return this.waitWork(v);
    const loc = LOCATIONS[me.work.loc];
    const skip = prefs.get('skipCutscenes', false);
    if (!skip) {
      this.banner(`ไป${loc.name}`, loc.desc, COLORS.gold, 80, 1500);
      if (FRAMERS.includes(me.role)) this.later(1600, () => this.note('แอบป่วนงาน: ยิ่งเล่นเก่ง หลอดพิธีขับไล่ยิ่งลด', 52, COLORS.red, 12));
      const s = addCharacter(this, -20, 304, meP.outfit, 3);
      s.play(outfitKey(meP.outfit) + '_walk');
      this.phaseLayer.add(s);
      this.tweens.add({ targets: s, x: 330, duration: 1900 });
      sfx.steps(8, 0.22);
      this.later(1900, () => this.tweens.add({ targets: s, alpha: 0, duration: 300 }));
    }
    this.later(skip ? 100 : 2000, () => {
      this.playMinigame(me.work.loc);
    });
  }

  // ----- จ่าฝูง: ไม่ทำงาน หมอบซุ่มหลังพุ่มไม้ ดูเหยื่อเดินเข้ามา แล้วเลือกจะโจมตีใคร -----
  lurkScene(v) {
    const me = v.me;
    const locKey = me.work.loc || 'forest';
    const loc = LOCATIONS[locKey];
    const sc = 3;
    const c = this.add.container(320, 190);
    c.add(panel(this, 0, 0, 436, 226));
    c.add(this.add.image(0, 0, 'scene_' + locKey).setScale(sc));
    c.add(this.add.rectangle(0, 0, 420, 210, 0x0b0a2a, 0.35));
    const floor = 35 * sc - 4;
    this.phaseLayer.add(c);
    this.ui.lurk = c;
    // เหยื่อที่เดินมาทำงานที่นี่
    const ids = me.work.targets || [];
    const figs = ids.map((id, i) => {
      const p = v.players.find((x) => x.id === id);
      const x = 30 + i * Math.min(56, 160 / Math.max(1, ids.length));
      const s = addCharacter(this, 240, floor, p.outfit, 3);
      s.play(outfitKey(p.outfit) + '_walk');
      const n = txt(this, x, floor + 9, p.name, { size: 10 }).setAlpha(0);
      c.add([s, n]);
      this.tweens.add({ targets: s, x, duration: 1500, delay: 700 + i * 450, onComplete: () => {
        s.play(outfitKey(p.outfit) + '_idle');
        this.tweens.add({ targets: n, alpha: 1, duration: 200 });
      } });
      return s;
    });
    // หมาป่าหมอบหลังพุ่มไม้ (พุ่มไม้วาดทับ เห็นแค่หลังกับหัว)
    const wolf = this.add.sprite(-150, floor + 6, 'ch_wolf', 0).setOrigin(0.5, 1).setScale(3);
    c.add(wolf);
    this.tweens.add({ targets: wolf, scaleY: 3.12, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    [[-176, 6, 46], [-140, 2, 54], [-104, 8, 40], [-196, 12, 30]].forEach(([x, y, r]) => {
      c.add(this.add.ellipse(x, floor + y - 6, r * 1.6, r, 0x1e3a24));
      c.add(this.add.ellipse(x - 4, floor + y - 10, r * 1.2, r * 0.6, 0x2a4e2e));
    });
    const eyes = [this.add.rectangle(-119, floor - 38, 5, 3, 0xff3030), this.add.rectangle(-111, floor - 38, 5, 3, 0xff3030)];
    c.add(eyes);
    this.tweens.add({ targets: eyes, alpha: 0.1, duration: 140, yoyo: true, repeat: -1, repeatDelay: 2200 });
    c.setScale(0.7).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 400, ease: 'Back.Out' });
    this.banner(`ซุ่มที่${loc.name}`, 'ซ่อนตัวอยู่ ไม่มีใครเห็นคุณ... หมอบรอเหยื่อเดินเข้ามา', COLORS.red, 52, 2200);
    this.later(500, () => sfx.growl());
    this.later(900, () => ids.length && sfx.steps(6, 0.2));

    const after = () => {
      if (this.state?.me?.work?.needOutfit) this.outfitPanel();
      else this.waitWork(this.state);
    };
    if (me.work.ambushed !== undefined && ids.length) return this.lurkResult(me.work.ambushed, figs, ids, eyes, after);
    this.later(ids.length ? 2600 : 1600, () => {
      if (!ids.length) {
        const why = locKey === 'forest' && v.event === 'rain' ? 'ฝนตกหนัก ป่าลื่นเกินกว่าจะซุ่ม...' : 'ไม่มีใครเดินมาที่นี่เลย... ซุ่มรอเก้อ';
        this.note(why, 56, COLORS.red, 13);
        return after();
      }
      const targets = v.players.filter((p) => ids.includes(p.id));
      const marks = Object.fromEntries((me.knownWolves || []).map((id) => [id, 'r_wolf']));
      const where = locKey === 'forest' ? ' (ในป่ามืด ไม่มีใครเห็น)' : ' (พยานจะเห็นคุณ!)';
      const box = this.picker(`จะกระโจนใส่ใคร?${where}`, targets, (id) => {
        net.act('ambush', id);
        this.later(500, () => {
          this.tweens.add({ targets: box, alpha: 0, duration: 250, onComplete: () => box.destroy() });
          this.lurkResult(id, figs, ids, eyes, after);
        });
      }, { skip: 'ปล่อยไป', marks });
      box.y = 150;
    });
  }

  // เลือกแล้ว: จ้องเหยื่อรอจังหวะ (ไล่ล่าเริ่มตอนหมดเวลาทำงาน)
  lurkResult(id, figs, ids, eyes, after) {
    const i = ids.indexOf(id);
    if (i >= 0) {
      sfx.growl();
      this.cameras.main.shake(200, 0.004);
      eyes.forEach((e) => e.setScale(1.5));
      const fig = figs[i];
      fig.setTint(0xffb0b0);
      const mark = this.add.image(fig.x, fig.y - 104, 'i_wolf').setScale(1.5);
      this.ui.lurk?.add(mark);
      this.tweens.add({ targets: mark, y: mark.y - 6, duration: 500, yoyo: true, repeat: -1 });
      this.note('จ้องเหยื่อไว้... พอทุกคนทำงานเสร็จจะพุ่งเข้าไป!', 56, COLORS.red, 13);
    } else if (ids.length) {
      this.note('ปล่อยไปก่อน... แสร้งทำเป็นชาวบ้านต่อไป', 56, COLORS.dim, 13);
    }
    this.later(900, after);
  }

  playMinigame(loc) {
    this.setShade(0.45);
    this.minigame = startMinigame(this, loc, {
      x: 320,
      y: 196,
      layer: this.phaseLayer,
      onDone: (score) => {
        net.act('work', score);
        this.later(2300, () => {
          if (!this.minigame) return;
          const mg = this.minigame;
          this.minigame = null;
          this.tweens.add({ targets: mg.root, alpha: 0, scale: 0.9, duration: 250, onComplete: () => mg.destroy() });
          if (this.state?.me?.work?.needOutfit) this.outfitPanel();
          else this.waitWork(this.state);
        });
      },
    });
  }

  // ห้องแต่งตัวในโรงเตี๊ยม: เปลี่ยนได้ 1 ส่วน
  outfitPanel() {
    const meP = this.state.players.find((p) => p.id === net.me);
    const orig = { ...meP.outfit };
    const outfit = { ...orig };
    const box = this.add.container(320, 190);
    box.add(panel(this, 0, 0, 400, 236));
    box.add(txt(this, 0, -100, 'เปลี่ยนชุดที่โรงเตี๊ยม?', { size: 16, color: COLORS.gold }));
    const limit = this.state.me.work?.outfitLimit || 1;
    box.add(txt(this, 0, -80, `เปลี่ยนได้ ${limit} ส่วน · คนในโรงเตี๊ยมจะเห็น และนักสืบจะรู้เสมอ`, { size: 10, color: COLORS.dim }));
    box.add(this.add.nineslice(-128, 16, 'panel_dark', undefined, 110, 150, 8, 8, 8, 8));
    const hero = addCharacter(this, -128, 82, outfit, 4);
    box.add(hero);
    const parts = ['hat', 'hair', 'shirt', 'item', 'face'];
    let changed = []; // ส่วนที่เปลี่ยน เรียงจากเก่าไปใหม่
    const cyclers = parts.map((part, i) => {
      const opts = OUTFIT_PARTS[part].map((label, value) => ({ value, label })).filter((o) => o.value < BASE_SIZE[part] || o.value === orig[part]);
      const c = new Cycler(this, -60, -52 + i * 26, PART_LABELS[part], opts, outfit[part] ?? 0, (v) => {
        outfit[part] = v;
        changed = changed.filter((q) => q !== part);
        if (v !== orig[part]) changed.push(part);
        // เกินจำนวนที่เปลี่ยนได้ = คืนส่วนที่เปลี่ยนไว้นานสุดกลับเป็นของเดิม
        while (changed.length > limit) {
          const q = changed.shift();
          const k = parts.indexOf(q);
          outfit[q] = orig[q];
          cyclers[k].index = orig[q];
          cyclers[k].refresh();
        }
        setCharacterOutfit(hero, outfit);
        this.tweens.add({ targets: hero, scaleX: 4.4, scaleY: 3.6, duration: 80, yoyo: true });
        sfx.cloth();
        okBtn.setEnabled(changed.length > 0);
      }, 250);
      box.add(c);
      return c;
    });
    const finish = (change) => {
      if (box.done) return;
      box.done = true;
      net.act('outfit', change);
      if (change) {
        sfx.success();
        toast(this, 'เปลี่ยนชุดแล้ว!', 'success');
      }
      this.tweens.add({ targets: box, alpha: 0, scale: 0.9, duration: 200, onComplete: () => box.destroy() });
      this.ui.outfitBox = null;
      this.waitWork(this.state);
    };
    const okBtn = new Button(this, 40, 92, 'เปลี่ยนชุดนี้', { w: 130, color: 'btn_green', icon: 'i_shirt', onClick: () => finish(changed.length ? { parts: changed.map((q) => ({ part: q, value: outfit[q] })) } : null) }).setEnabled(false);
    box.add(okBtn);
    box.add(new Button(this, 154, 92, 'ไม่เปลี่ยน', { w: 90, color: 'btn_dark', onClick: () => finish(null) }));
    box.finish = finish;
    this.ui.outfitBox = box;
    this.phaseLayer.add(box);
    box.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 280, ease: 'Back.Out' });
  }

  waitWork(v) {
    const alive = v.players.filter((p) => p.alive);
    const done = alive.filter((p) => p.worked).length;
    const lurk = v.me?.work?.lurk;
    if (!this.ui.wait) this.ui.wait = this.note('', lurk ? 318 : 200, COLORS.dim, 13);
    this.ui.wait.setText(`${lurk ? 'รอชาวบ้านทำงานเสร็จ' : 'ทำงานเสร็จแล้ว! รอเพื่อน ๆ'}... (${done}/${alive.length})`);
    if (!this.ui.replay && v.me?.work?.loc && !lurk) {
      this.ui.replay = new Button(this, 320, 236, 'เล่นอีกรอบ (ไม่นับแต้ม)', { w: 190, icon: 'i_play', onClick: () => this.practice(v.me.work.loc) });
      this.phaseLayer.add(this.ui.replay);
    }
  }

  // เล่นมินิเกมซ้ำระหว่างรอคนอื่น แข่งกับคะแนนดีที่สุดของตัวเอง
  practice(loc) {
    if (this.minigame) return;
    this.ui.replay?.setVisible(false);
    this.ui.wait?.setVisible(false);
    this.ui.wait?.bg?.setVisible(false);
    this.minigame = startMinigame(this, loc, {
      x: 320,
      y: 196,
      layer: this.phaseLayer,
      onDone: (score) => {
        const best = prefs.get('best_' + loc, 0);
        if (score > best) {
          prefs.set('best_' + loc, score);
          toast(this, 'สถิติใหม่ของคุณ!', 'success');
        }
        this.later(1800, () => {
          const mg = this.minigame;
          this.minigame = null;
          mg?.destroy();
          this.ui.replay?.setVisible(true);
          this.ui.wait?.setVisible(true);
          this.ui.wait?.bg?.setVisible(true);
        });
      },
    });
    this.minigame.practice = true;
  }

  refresh_work(v) {
    if (this.ui.wait) this.waitWork(v);
  }

  // ----- ไล่ล่าสด (จ่าฝูงซุ่มโจมตี) -----
  enter_chase(v) {
    this.setShade(0.6, 200);
    this.cameras.main.shake(250, 0.008);
    if (v.chase) this.chaseUI = new Chase(this, v.chase, v.players, { layer: this.phaseLayer });
  }

  refresh_chase(v) {
    if (v.chase) this.chaseUI?.update(v.chase);
  }

  // ----- ผลกลางวัน -----
  enter_dayResult(v) {
    const r = v.me?.dayResult;
    if (!r) {
      this.setShade(0.45);
      this.ui.ghostNote = this.note('ชาวบ้านกำลังทำงานกันอย่างขยันขันแข็ง...', 180, COLORS.text);
      if (v.events?.ambushHappened) this.later(1800, () => this.scream(v.events.ambushLoc));
      return;
    }
    this.setShade(0.7, 300);
    const loc = LOCATIONS[r.loc];
    const view = this.add.container(320, 172);
    view.add(panel(this, 0, 0, 436, 226));
    const art = this.add.image(0, 0, 'scene_' + r.loc).setScale(3);
    view.add(art);
    const dark = this.add.rectangle(0, 0, 420, 210, 0x000000, 0);
    view.add(dark);
    this.phaseLayer.add(view);
    view.setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: view, scale: 1, alpha: 1, duration: 450, ease: 'Back.Out' });
    this.phaseLayer.add(this.banner(loc.name, null, COLORS.gold, 46, 0));

    // ตัวละครที่อยู่ในสถานที่นี้
    const ids = [net.me, ...r.with];
    const figs = {};
    ids.forEach((id, i) => {
      const p = v.players.find((x) => x.id === id);
      const gap = Math.min(48, 380 / ids.length);
      const x = 320 + (i - (ids.length - 1) / 2) * gap;
      const s = addCharacter(this, x, 266, p.outfit, 3);
      const n = fitText(txt(this, x, 276, p.name, { size: 10, color: id === net.me ? COLORS.gold : COLORS.text }), Math.max(gap, 46));
      this.phaseLayer.add([s, n]);
      s.alpha = 0;
      s.x -= 30;
      this.tweens.add({ targets: s, alpha: 1, x, duration: 400, delay: 300 + i * 120 });
      figs[id] = s;
    });
    const who = r.with.length
      ? 'อยู่ด้วยกัน: ' + r.with.map((id) => v.players.find((p) => p.id === id).name).join(', ')
      : 'คุณอยู่ที่นี่คนเดียว';
    this.later(700, () => this.note(who, 318, COLORS.dim, 12));

    if (r.sabotage) this.later(1000, () => this.floatSabotage(r.sabotage));
    else if (!r.ambush) {
      this.later(1000, () => this.floatPoints(r.points));
    }
    // ดาวผลงานจากมินิเกม
    const stars = r.score >= 0.85 ? 3 : r.score >= 0.5 ? 2 : r.score >= 0.2 ? 1 : 0;
    for (let i = 0; i < 3; i++) {
      const st = this.add.image(126 + i * 24, 76, i < stars ? 'mg_star' : 'mg_star_off').setScale(2).setAlpha(0);
      this.phaseLayer.add(st);
      this.tweens.add({ targets: st, alpha: 1, duration: 200, delay: 500 + i * 120 });
    }
    if (r.rumor) this.later(1800, () => this.paperNote('ข่าวลือ', r.rumor, 120));
    if (r.changes?.length) {
      const lines = r.changes.map((c) => (c.id === net.me ? 'คุณ' + c.text.slice(c.text.indexOf(' เปลี่ยน') + 1) : c.text));
      this.later(2400, () => this.paperNote('เห็นกับตา', lines.join('\n'), 214));
    }
    if (r.heardScream) this.later(2600, () => this.scream(r.heardScream));
    if (r.ambush) this.later(1300, () => this.ambushCutscene(v, r, figs, dark));
  }

  floatPoints(n) {
    const t = txt(this, 320, 200, `+${n}`, { size: 26, color: COLORS.gold, bold: true });
    this.phaseLayer.add(t);
    t.setScale(0);
    this.tweens.add({ targets: t, scale: 1, duration: 300, ease: 'Back.Out' });
    this.tweens.add({ targets: t, x: 300, y: 18, scale: 0.5, alpha: 0, duration: 800, delay: 700, ease: 'Cubic.In' });
    sfx.coin();
    this.later(1450, () => sfx.coin());
  }

  floatSabotage(n) {
    const t = txt(this, 320, 200, `-${n}`, { size: 26, color: COLORS.red, bold: true });
    this.phaseLayer.add(t);
    t.setScale(0);
    sfx.crash();
    this.tweens.add({ targets: t, scale: 1, duration: 300, ease: 'Back.Out' });
    this.tweens.add({ targets: t, x: 300, y: 18, scale: 0.5, alpha: 0, duration: 800, delay: 700, ease: 'Cubic.In' });
    this.later(300, () => this.note(`คุณแอบป่วนงาน หลอดพิธีขับไล่ลดลง ${n}`, 236, COLORS.red, 12));
  }

  paperNote(title, text, y) {
    const c = this.add.container(720, y);
    const body = txt(this, 0, 8, text, { size: 11, color: COLORS.ink, shadow: false, wrap: 150 });
    const h = body.height + 34;
    c.add([this.add.nineslice(0, 0, 'panel_paper', undefined, 170, h, 8, 8, 8, 8), txt(this, 0, -h / 2 + 12, title, { size: 12, color: '#8a3b2e', shadow: false, bold: true }), body]);
    c.add(this.add.image(-74, -h / 2 + 12, 'i_note'));
    this.phaseLayer.add(c);
    sfx.whoosh();
    this.tweens.add({ targets: c, x: 548, angle: 3, duration: 450, ease: 'Back.Out' });
  }

  scream(loc = 'forest') {
    sfx.slash();
    this.cameras.main.shake(300, 0.006);
    this.cameras.main.flash(200, 140, 0, 0);
    const name = LOCATIONS[loc]?.name || 'ป่าลึก';
    const t = this.note(`ได้ยินเสียงกรีดร้องดังมาจาก${name}!`, 100, COLORS.red, 16);
    this.tweens.add({ targets: t, x: 323, duration: 50, yoyo: true, repeat: 5 });
  }

  ambushCutscene(v, r, figs, dark) {
    const a = r.ambush;
    const victim = v.players.find((p) => p.id === a.victim);
    const fig = figs[a.victim];
    sfx.growl();
    this.tweens.add({ targets: dark, fillAlpha: 0.55, duration: 600 });
    const eyes = this.add.container(320 + Phaser.Math.Between(-80, 80), 130);
    eyes.add([this.add.rectangle(-8, 0, 6, 3, 0xff2020), this.add.rectangle(8, 0, 6, 3, 0xff2020)]);
    this.phaseLayer.add(eyes);
    eyes.setAlpha(0);
    this.tweens.add({ targets: eyes, alpha: 1, duration: 300, yoyo: true, repeat: 2 });
    this.later(1300, () => {
      if (a.outcome === 'escaped') return;
      sfx.slash();
      this.cameras.main.flash(250, 200, 20, 20);
      this.cameras.main.shake(350, 0.012);
      if (fig) {
        fig.setTint(0xff6060);
        this.tweens.add({ targets: fig, x: fig.x + 6, duration: 40, yoyo: true, repeat: 5, onComplete: () => fig.clearTint() });
      }
      const slash = this.add.rectangle(fig?.x || 320, (fig?.y || 286) - 40, 80, 4, 0xffffff).setAngle(-35);
      this.phaseLayer.add(slash);
      this.tweens.add({ targets: slash, scaleX: 0, alpha: 0, duration: 300 });
    });
    this.later(2200, () => {
      const isMe = a.victim === net.me;
      let text;
      let color = COLORS.red;
      if (a.byMe) {
        text = {
          wounded: `คุณทำร้าย ${victim.name} สำเร็จ`,
          killed: `${victim.name} ล้มลงไม่ลุกขึ้นอีก`,
          repelled: `${victim.name} สู้กลับ! คุณบาดเจ็บต้องหนีไป`,
          packmate: `${victim.name} คือหมาป่าพวกเดียวกัน!`,
          blocked: 'ทหารยามอยู่แถวนี้! คุณต้องถอยกลับไป',
          dodged: `${victim.name} หลบได้อย่างคล่องแคล่ว!`,
          escaped: `${victim.name} วิ่งหนีไปได้!`,
        }[a.outcome];
      } else if (a.outcome === 'escaped') {
        text = isMe ? 'คุณวิ่งหนีรอดมาได้!' : `${victim.name} วิ่งหนีรอดจากเงาดำ!`;
        color = COLORS.green;
      } else if (a.outcome === 'blocked') {
        text = 'ทหารยามตะโกนไล่ เงาดำหนีหายไปในป่า!';
        color = COLORS.green;
      } else if (a.outcome === 'dodged') {
        text = isMe ? 'คุณกระโดดหลบได้ทันอย่างฉิวเฉียด!' : `${victim.name} หลบเงาดำได้อย่างฉิวเฉียด!`;
        color = COLORS.green;
      } else if (a.outcome === 'repelled') {
        text = isMe ? 'คุณสู้กลับ! เงาดำนั้นหนีไปพร้อมบาดแผล' : `${victim.name} สู้กลับ! เงาดำหนีไปพร้อมบาดแผล`;
        color = COLORS.green;
      } else if (a.outcome === 'killed') {
        text = isMe ? 'คุณถูกฆ่าตาย...' : `${victim.name} ถูกฆ่าตาย!`;
        if (fig) this.tweens.add({ targets: fig, angle: 90, alpha: 0.3, y: fig.y - 4, duration: 600 });
      } else {
        text = isMe ? 'คุณถูกทำร้าย! เหลือชีวิตน้อยลง' : `${victim.name} ถูกทำร้าย!`;
      }
      this.note(text, 106, color, 16);
      if (a.clue) this.later(900, () => this.paperNote(isMe ? 'เบาะแสของคุณ' : 'สิ่งที่คุณเห็น', a.clue, 150));
    });
  }

  // ----- กลางคืน -----
  enter_night(v) {
    this.showSet('village', true, 900);
    this.setShade(0.4, 1500);
    sfx.howl();
    this.banner(`คืนที่ ${v.day}`, 'หมู่บ้านเข้าสู่ความมืด...', '#a8c8ff', 80, 1800);
    this.later(3400, () => sfx.owl());
    if (!prefs.get('skipCutscenes', false)) {
      const wolf = this.add.image(560, 262, 'howl_wolf').setOrigin(0.5, 1).setScale(1.6).setAlpha(0);
      this.phaseLayer.add(wolf);
      wolf.y += 20;
      this.tweens.add({ targets: wolf, alpha: 1, y: 236, duration: 700, ease: 'Quad.Out' });
      this.tweens.add({ targets: wolf, scaleY: 1.7, duration: 400, delay: 700, yoyo: true, repeat: 1 });
      this.later(2600, () => this.tweens.add({ targets: wolf, alpha: 0, y: 250, duration: 600 }));
    }
    const me = v.me;
    const na = me.nightAction;
    if (!me.alive) {
      this.ui.ghostNote = this.note('วิญญาณของคุณล่องลอยอยู่ในความมืด...', 316, COLORS.dim);
      return;
    }
    if (!na) {
      this.sleepScene(me);
      return;
    }
    if (na.done) {
      this.note('คุณทำหน้าที่คืนนี้เรียบร้อยแล้ว รอรุ่งเช้า...', 316, COLORS.dim);
      return;
    }
    const marks = Object.fromEntries((me.knownWolves || []).map((id) => [id, 'r_wolf']));
    const prompts = {
      alpha: ['คืนนี้จะล่าใคร?', this.others(v)],
      seer: ['ส่องลูกแก้วดูใคร?', this.others(v)],
      doctor: ['ปกป้องใครคืนนี้?', this.others(v, true)],
      detective: ['เรียกใครมาสอบปากคำ?', this.others(v)],
      watchman: ['เฝ้าบ้านใครคืนนี้?', this.others(v)],
      priest: ['ชุบชีวิตใคร? (ใช้ได้ครั้งเดียว)', v.players.filter((p) => !p.alive), { skip: 'ยังไม่ใช้' }],
      cupid: ['เลือกคู่รัก 2 คน', this.others(v, true), { multi: 2 }],
      wolf: ['คืนนี้จะแอบไปใส่ร้ายใคร?', this.others(v), { skip: 'ไม่ออกไป' }],
      shadow: ['คืนนี้จะแอบไปใส่ร้ายใคร?', this.others(v), { skip: 'ไม่ออกไป' }],
    };
    if (na.mode === 'sniff') {
      prompts.alpha = ['ดมกลิ่นหาพวก: แอบไปดมใคร?', this.others(v)];
      this.later(1700, () => this.note('คืนแรกฝูงยังไม่ออกล่า: แอบดมกลิ่น 1 คน จะรู้ว่าเป็นหมาป่าพวกเดียวกันไหม (ระวังคนเฝ้ายาม)', 52, COLORS.red, 13));
    }
    const [title, list, extra = {}] = prompts[na.role];
    this.later(1600, () => {
      const box = this.picker(title, list, (id) => {
        net.act('night', id === null ? 'skip' : id);
        if (FRAMERS.includes(na.role)) {
          this.later(450, () => {
            this.tweens.add({ targets: box, alpha: 0, duration: 250, onComplete: () => box.destroy() });
            if (id === null) this.note('คืนนี้อยู่เงียบ ๆ ไม่ออกไปไหน...', 316, COLORS.dim);
            else this.frameFx(v.players.find((p) => p.id === id));
          });
          return;
        }
        if (id !== null) ({ seer: sfx.orb, doctor: sfx.heal, detective: sfx.knock, cupid: sfx.arrow, priest: sfx.revive, alpha: sfx.growl, watchman: sfx.step })[na.role]?.();
        const msg = na.mode === 'sniff' ? 'แอบไปดมกลิ่นแล้ว... เช้านี้จะรู้ว่าเป็นพวกเดียวกันไหม' : { detective: 'คุยกับเขาในแชทด้านขวาได้เลย', cupid: 'ลูกศรรักถูกยิงออกไปแล้ว...' }[na.role] || 'เรียบร้อย... รอรุ่งเช้า';
        this.later(500, () => this.note(msg, 330, COLORS.dim));
      }, { blocked: na.blocked, marks, ...extra });
    });
  }

  // ลูกฝูงย่องไปข่วนประตูบ้านคนที่ใส่ร้าย ทิ้งขนกับรอยเล็บไว้
  frameFx(target) {
    const c = this.add.container(this.cx, 190);
    c.add(panel(this, 0, 0, 300, 170, 'panel_dark'));
    c.add(this.add.rectangle(0, 6, 280, 120, 0x2a1e2a));
    for (let x = -130; x < 140; x += 20) c.add(this.add.rectangle(x, 6, 1, 120, 0x1e1520));
    c.add(this.add.rectangle(0, 72, 280, 12, 0x3a2818));
    const door = this.add.rectangle(40, 22, 54, 88, 0x6a4428).setStrokeStyle(2, 0x4a2c18);
    c.add([door, this.add.rectangle(58, 26, 4, 4, 0xc8a040)]);
    c.add(txt(this, 0, -66, `บ้านของ ${target?.name || ''}`, { size: 12, color: COLORS.dim }));
    const wolf = this.add.sprite(-170, 66, 'ch_wolf', 0).setOrigin(0.5, 1).setScale(2.4).play('ch_wolf_run');
    c.add(wolf);
    const mask = this.make.graphics({ add: false });
    mask.fillRect(this.cx - 140, 190 - 54, 280, 120);
    wolf.setMask(mask.createGeometryMask());
    this.phaseLayer.add(c);
    sfx.steps(5, 0.16);
    this.tweens.add({ targets: wolf, x: -10, duration: 1100, ease: 'Sine.Out', onComplete: () => {
      wolf.anims.stop();
      wolf.setFrame(0);
      // ยืนสองขาข่วนประตู
      this.tweens.add({ targets: wolf, angle: -40, y: 58, duration: 160 });
      for (let i = 0; i < 3; i++) {
        this.later(250 + i * 220, () => {
          sfx.slash();
          const m = this.add.rectangle(30 + i * 9, 4 + i * 5, 4, 34, 0xe8e0d0).setAngle(18).setScale(1, 0);
          c.add(m);
          this.tweens.add({ targets: m, scaleY: 1, duration: 90 });
          this.tweens.add({ targets: wolf, x: wolf.x + 3, duration: 60, yoyo: true });
        });
      }
      this.later(1100, () => {
        const fur = this.add.rectangle(30, 62, 6, 3, 0x5a5468);
        c.add(fur);
        this.tweens.add({ targets: fur, y: 70, angle: 40, duration: 500, ease: 'Bounce.Out' });
        this.tweens.add({ targets: wolf, angle: 0, y: 66, duration: 150 });
        wolf.setFlipX(true).play('ch_wolf_run');
        this.tweens.add({ targets: wolf, x: -190, duration: 800, delay: 150, ease: 'Quad.In' });
      });
      this.later(1700, () => this.note('ทิ้งรอยไว้แล้ว... เช้านี้ข่าวลือจะชี้ไปที่เขา (ระวังคนเฝ้ายาม)', 300, COLORS.red, 12));
    } });
  }

  sleepScene(me) {
    const z = this.add.image(320, 200, 'i_zzz').setScale(3);
    this.phaseLayer.add(z);
    this.tweens.add({ targets: z, y: 180, alpha: 0.4, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const n = this.note(me.role === 'wolf' ? 'คุณนอนกระสับกระส่าย... หูได้ยินเสียงหอนแว่วมา' : 'คุณหลับอยู่... หวังว่าพรุ่งนี้จะได้ตื่นขึ้นมา', 260, COLORS.dim);
    // ระหว่างรอเช้า มีมินิเกมเล็ก ๆ ให้เล่นฆ่าเวลา (ไม่มีผลกับเกม)
    this.later(2400, () => {
      if (this.state?.phase !== 'night') return;
      this.tweens.add({ targets: [z, n, n.bg], alpha: 0, duration: 300 });
      this.minigame = startNightGame(this, { layer: this.phaseLayer, onDone: () => {} });
    });
  }

  // ----- รุ่งเช้า -----
  enter_dawn(v) {
    const deathsNow = (v.events?.nightDeaths || []).length;
    const clawFirst = deathsNow && !prefs.get('skipCutscenes', false);
    if (clawFirst) this.clawMarks();
    this.later(clawFirst ? 1500 : 60, () => this.showSet('square', false, 1300));
    this.setShade(0.15, 1500);
    sfx.bell();
    this.later(clawFirst ? 1700 : 400, () => sfx.rooster());
    this.later(2600, () => sfx.birds());
    this.banner(`เช้าวันที่ ${v.day + 1}`, null, COLORS.gold, 70, 2000);
    const ev = v.events || {};
    const deaths = ev.nightDeaths || [];
    this.later(1800, () => {
      const names = (ids) => ids.map((id) => {
        const p = v.players.find((x) => x.id === id);
        return p.name + (p.role ? ` (${ROLES[p.role].name})` : '');
      }).join(', ');
      if (deaths.length) {
        sfx.lose();
        this.note(`เมื่อคืน ${names(deaths)} เสียชีวิต`, 112, COLORS.red, 16);
      } else {
        sfx.success();
        this.note(ev.saved ? 'เมื่อคืนมีคนรอดจากเขี้ยวหมาป่าอย่างหวุดหวิด!' : 'เมื่อคืนไม่มีใครตาย', 112, COLORS.green, 16);
      }
      if (ev.dayDeaths?.length) this.note(`${names(ev.dayDeaths)} ถูกพบเป็นศพ`, 136, COLORS.red, 13);
      if (ev.revived) {
        const p = v.players.find((x) => x.id === ev.revived);
        this.later(900, () => {
          sfx.win();
          this.note(`ปาฏิหาริย์! ${p.name} ฟื้นคืนชีพ`, 160, COLORS.gold, 15);
        });
      }
    });
  }

  hunterShotFx(v) {
    const by = v.players.find((p) => p.id === v.shot.by);
    const t = v.players.find((p) => p.id === v.shot.target);
    sfx.gunshot();
    this.cameras.main.flash(120, 255, 240, 200);
    this.cameras.main.shake(300, 0.012);
    const n = this.note(`ปัง! นายพราน ${by?.name || ''} ยิง ${t?.name || ''} ล้มลง`, 150, COLORS.red, 16);
    this.time.delayedCall(3500, () => n.active && this.tweens.add({ targets: [n, n.bg], alpha: 0, duration: 400 }));
  }

  clawMarks() {
    this.setShade(0.6, 100);
    sfx.slash();
    this.cameras.main.flash(200, 160, 0, 0);
    this.cameras.main.shake(250, 0.008);
    for (let i = 0; i < 3; i++) {
      const m = this.add.rectangle(290 + i * 22, 150 + i * 6, 130, 5, 0xe8e0f0).setAngle(-58).setScale(0, 1);
      this.phaseLayer.add(m);
      this.tweens.add({ targets: m, scaleX: 1, duration: 120, delay: i * 70, ease: 'Quad.Out' });
      this.tweens.add({ targets: m, alpha: 0, duration: 500, delay: 900 });
    }
    this.later(1200, () => this.setShade(0.15, 600));
  }

  // ----- นายพราน -----
  enter_hunter(v) {
    const hunter = v.players.find((p) => p.id === v.hunter?.id);
    if (v.hunter?.id === net.me) {
      this.setShade(0.5);
      this.picker('คุณกำลังจะตาย... ยิงใครไปด้วย?', this.others(v), (id) => net.act('hunter', id));
    } else {
      this.banner('ปัง!?', `นายพราน ${hunter?.name || ''} กำลังเล็งปืนก่อนสิ้นใจ...`, COLORS.red, 80, 0);
    }
  }

  // ----- ประชุม -----
  enter_meeting(v) {
    this.setShade(0, 600);
    this.banner('ประชุมหมู่บ้าน', 'คุยกันในแชท แล้วหาตัวหมาป่า', COLORS.gold, 70, 2200);
    sfx.murmur();
    if (v.me.alive) {
      this.ui.ready = new Button(this, 200, 334, 'พร้อมโหวต', {
        w: 160, color: 'btn_green', icon: 'i_vote', onClick: () => {
          net.act('readyVote');
          sfx.ready();
          this.ui.ready.setEnabled(false);
        },
      });
      this.phaseLayer.add(this.ui.ready);
    } else {
      this.note('คุณตายแล้ว ฟังได้อย่างเดียว', 334, COLORS.dim, 12).setX(200);
    }
    this.refresh_meeting(v);
  }

  refresh_meeting(v) {
    const alive = v.players.filter((p) => p.alive).length;
    const ready = (v.meetingReady || []).length;
    if (this.ui.ready) {
      this.ui.ready.setLabel(`พร้อมโหวต (${ready}/${alive})`);
      if ((v.meetingReady || []).includes(net.me)) this.ui.ready.setEnabled(false);
    }
  }

  // ----- โหวต -----
  enter_vote(v) {
    sfx.bell();
    this.banner('โหวต!', v.me.alive ? 'คลิกที่ตัวละครที่คิดว่าเป็นหมาป่า' : 'คนตายโหวตไม่ได้', COLORS.red, 70, 1800);
    if (v.me.alive) {
      this.ui.skip = new Button(this, 200, 334, 'งดออกเสียง', { w: 140, color: 'btn_dark', icon: 'i_skip', onClick: () => net.act('vote', 'skip') });
      this.phaseLayer.add(this.ui.skip);
    }
    this.refresh_vote(v);
  }

  refresh_vote(v) {
    const n = Object.keys(v.votes || {}).length;
    if (n > (this.ui.votesHeard ?? n)) sfx.stamp();
    this.ui.votesHeard = n;
    const alive = v.players.filter((p) => p.alive).length;
    if (!this.ui.count) this.ui.count = this.note('', 128, COLORS.dim, 11).setX(200);
    const skips = Object.values(v.votes || {}).filter((t) => t === 'skip').length;
    this.ui.count.setText(`โหวตแล้ว ${n}/${alive} คน${skips ? ` · งดออกเสียง ${skips}` : ''}`);
    if (this.ui.skip) this.ui.skip.setAlpha(v.votes?.[net.me] === 'skip' ? 0.6 : 1);
  }

  // ----- ผลโหวต -----
  enter_voteResult(v) {
    const res = v.voteResult || {};
    if (!res.hanged) {
      this.note('ไม่มีใครถูกแขวนคอ (เสียงไม่ชนะขาด)', 90, COLORS.text, 16);
      return;
    }
    const a = this.actors.get(res.hanged);
    const p = v.players.find((x) => x.id === res.hanged);
    this.setShade(0.55, 600);
    const spot = this.add.ellipse(a.x, a.y - 10, 70, 110, 0xfff0c0, 0.18).setBlendMode('ADD');
    this.phaseLayer.add(spot);
    this.actorLayer.setDepth(70);
    this.topLayer.setDepth(72);
    sfx.drumroll();
    this.later(1800, () => {
      sfx.hang();
      this.later(500, () => sfx.gasp());
      this.cameras.main.shake(200, 0.004);
      const role = p.role ? ROLES[p.role] : null;
      this.note(`${p.name} ถูกแขวนคอ`, 86, COLORS.red, 18);
      for (const other of this.actors.values()) if (other.id !== res.hanged) other.react('gasp');
      if (role) this.later(900, () => this.note(`เขาคือ ${role.name}`, 112, TEAM_COLOR[role.team], 16));
      if (res.jester) this.later(1600, () => this.note('ฮ่า ๆ ๆ! คนบ้าหลอกทุกคนได้!', 140, TEAM_COLOR.neutral, 16));
    });
    this.later(4000, () => {
      this.actorLayer.setDepth(30);
      this.topLayer.setDepth(32);
    });
  }

  // ----- จบเกม -----
  enter_ended(v) {
    this.setShade(0.35);
    const myTeam = ROLES[v.me.role].team;
    const iWon = v.winner === myTeam || (v.winner === 'jester' && v.me.role === 'jester');
    const title = { village: 'ชาวบ้านชนะ!', wolf: 'หมาป่าชนะ!', jester: 'คนบ้าชนะ!' }[v.winner];
    const color = TEAM_COLOR[v.winner === 'jester' ? 'neutral' : v.winner];
    this.banner(title, v.winReason, color, 70, 0);
    (iWon ? sfx.win : sfx.lose)();
    if (iWon) this.later(600, () => sfx.cheer());
    music.jingle(iWon ? 'win' : 'lose');
    this.later(4500, () => music.play('menu'));
    for (const p of v.players) {
      const a = this.actors.get(p.id);
      if (!a || !p.role) continue;
      const team = ROLES[p.role].team;
      const won = v.winner === 'jester' ? p.role === 'jester' : team === v.winner;
      a.react(won ? 'cheer' : 'sad');
    }
    this.note(iWon ? 'คุณชนะ!' : 'คุณแพ้...', 128, iWon ? COLORS.gold : COLORS.dim, 18).setX(200);
    if (iWon) {
      const confetti = this.add.particles(0, -10, 'spark', {
        x: { min: 0, max: 640 }, speedY: { min: 40, max: 120 }, speedX: { min: -20, max: 20 },
        lifespan: 4000, scale: { start: 1.2, end: 0.6 }, rotate: { min: 0, max: 360 },
        tint: [0xffe08a, 0x7ac870, 0xe0565e, 0x8ab0ff], frequency: 60, quantity: 2,
      });
      this.phaseLayer.add(confetti);
      this.later(3500, () => confetti.stop());
    }
    // ลำดับเหตุการณ์ทั้งเกม
    this.chatSys('— สรุปเหตุการณ์ —');
    (v.log || []).forEach((l) => this.chatSys(`วันที่ ${l.day}: ${l.text}`));
    // เล่นต่อ: ทุกคนกดพร้อมครบ เซิร์ฟเวอร์นับถอยหลังแล้วเริ่มตาใหม่เอง ไม่ต้องกลับห้องรอ
    this.ui.again = new Button(this, 74, 334, 'เล่นต่อ', { w: 124, color: 'btn_green', icon: 'i_play', onClick: () => {
      const me = net.room?.players.find((p) => p.id === net.me);
      net.socket.emit('game:again', !me?.ready);
    } });
    this.phaseLayer.add(this.ui.again);
    if (net.isHost) this.phaseLayer.add(new Button(this, 204, 334, 'กลับห้องรอ', { w: 124, color: 'btn_dark', onClick: () => net.socket.emit('game:lobby') }));
    this.phaseLayer.add(new Button(this, net.isHost ? 320 : 204, 334, 'ออก', { w: 96, color: 'btn_red', icon: 'i_door', onClick: () => this.leave() }));
    this.ui.againNote = this.note('', 306, COLORS.dim, 12);
    this.later(2600, () => {
      if (!net.room?.stats) return;
      this.ui.scores = scoreBoard(this, this.cx, 214, net.room.stats, net.me);
      this.phaseLayer.add(this.ui.scores);
      this.ui.scores.setAlpha(0);
      this.tweens.add({ targets: this.ui.scores, alpha: 1, duration: 300 });
    });
    this.refreshEnded(net.room);
    const r = wallet.lastReward;
    if (r && Date.now() - r.at < 15000) this.later(1500, () => this.showReward(r));
  }

  // +เหรียญ ที่ได้จากตานี้ (เอาไปหมุนตู้กาชาที่เมนู)
  showReward(r) {
    if (this.ui.rewardShown || !this.ui.again) return;
    this.ui.rewardShown = true;
    const c = this.add.container(this.cx, 156);
    const detail = r.parts.map(([label, n]) => `${label} +${n}`).join(' · ');
    const t = txt(this, 8, -6, `+${r.total} เหรียญ`, { size: 16, color: COLORS.gold, bold: true });
    const d = txt(this, 0, 12, detail, { size: 10, color: COLORS.dim });
    const w = Math.max(t.width + 40, d.width + 20);
    c.add([this.add.rectangle(0, 3, w, 40, 0x0b0a1a, 0.75), this.add.image(-t.width / 2 - 8, -6, 'i_coin').setScale(1.5), t, d]);
    this.phaseLayer.add(c);
    c.setScale(0);
    this.tweens.add({ targets: c, scale: 1, duration: 300, ease: 'Back.Out' });
    sfx.coin();
    this.later(200, () => sfx.coin());
  }

  // หน้าจบเกม: เครื่องหมายถูกเหนือคนที่กดเล่นต่อ ปุ่ม และนับถอยหลัง
  refreshEnded(room) {
    if (!room || this.state?.phase !== 'ended' || !this.ui.again) return;
    const ready = new Set(room.players.filter((p) => p.ready).map((p) => p.id));
    for (const a of this.actors.values()) a.setCheck(ready.has(a.id));
    const humans = room.players.filter((p) => !p.isBot);
    const n = humans.filter((p) => p.ready).length;
    const mine = ready.has(net.me);
    this.ui.again.setLabel(mine ? `ยกเลิก (${n}/${humans.length})` : `เล่นต่อ (${n}/${humans.length})`);
    this.ui.countdown?.remove();
    if (room.rematchAt) {
      const tick = () => {
        const s = Math.max(0, Math.ceil((room.rematchAt - Date.now() - net.clockOffset) / 1000));
        this.ui.againNote.setText(`ทุกคนพร้อมแล้ว! เริ่มตาใหม่ใน ${s} วินาที...`).setColor(COLORS.gold);
      };
      tick();
      sfx.ready();
      this.ui.countdown = this.time.addEvent({ delay: 250, loop: true, callback: tick });
    } else {
      this.ui.againNote.setText(mine ? 'รอเพื่อน ๆ กดเล่นต่อ...' : room.players.length < 4 ? 'คนไม่ครบ 4 คน ต้องกลับห้องรอ' : '').setColor(COLORS.dim);
    }
  }

  // ---------- ตายแล้ว: คัตซีนของเรา + ผีติดตามดูผู้เล่น ----------
  deathScene(v) {
    const d = v.me.death || {};
    // รอให้ฉากส่วนรวม (แขวนคอ / ยิง / รอยข่วน) เล่นก่อน แล้วค่อยตัดเข้าคัตซีนของเรา
    const delay = { vote: 4300, hunter: 1400, heart: 2200 }[d.kind] ?? (v.phase === 'dawn' ? 0 : 1200);
    this.time.delayedCall(delay, () => {
      if (this.deathFx || this.leaving || !this.state || this.state.phase === 'ended') return;
      const p = this.state.players.find((x) => x.id === net.me);
      this.cinema = true;
      this.setChatVisible(false);
      this.deathFx = playDeath(this, {
        outfit: p.outfit,
        death: d,
        short: prefs.get('skipCutscenes', false),
        onDone: () => {
          this.deathFx = null;
          this.cinema = false;
          if (this.state) this.updateChat(this.state);
          this.spectateHint();
        },
      });
    });
  }

  spectateHint() {
    if (!this.watchBtn?.visible) return;
    toast(this, 'กด "ติดตามดู" เพื่อดูว่าผู้เล่นคนอื่นกำลังทำอะไร');
    this.tweens.add({ targets: this.watchBtn, scale: 1.15, duration: 260, yoyo: true, repeat: 3 });
  }

  watchList(v) {
    return v.players.filter((p) => p.alive && p.id !== net.me);
  }

  pickWatch() {
    const v = this.state;
    if (!v?.me || v.me.alive) return;
    if (this.ui.watchPicker?.active) this.ui.watchPicker.destroy();
    const list = this.watchList(v);
    if (!list.length) return toast(this, 'ไม่มีใครเหลือให้ติดตามแล้ว');
    const marks = v.spectate ? { [v.spectate.id]: 'i_eye' } : {};
    const box = this.picker('ติดตามดูใคร?', list, (id) => {
      net.act('watch', id);
      this.time.delayedCall(250, () => box.active && box.destroy());
    }, { skip: v.spectate ? 'เลิกดู' : 'ปิด', marks });
    this.ui.watchPicker = box;
  }

  cycleWatch(dir) {
    const v = this.state;
    const list = v ? this.watchList(v) : [];
    if (!list.length) return;
    const i = list.findIndex((p) => p.id === v.spectate?.id);
    const next = list[(Math.max(0, i) + dir + list.length) % list.length];
    net.act('watch', next.id);
    sfx.select();
  }

  // แถบล่างซ้าย: กำลังดูใคร อาชีพอะไร ทำอะไรอยู่
  buildSpecBar(d) {
    const c = this.add.container(136, 342).setDepth(d).setVisible(false);
    c.add(panel(this, 132, 0, 264, 30, 'panel_dark'));
    const hit = this.add.zone(90, 0, 180, 30).setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => this.pickWatch());
    c.add(hit);
    c.nameT = txt(this, 30, -7, '', { size: 11, color: COLORS.gold, origin: [0, 0.5] });
    c.roleT = txt(this, 30, -7, '', { size: 10, origin: [0, 0.5] });
    c.statusT = txt(this, 30, 7, '', { size: 9, color: COLORS.dim, origin: [0, 0.5] });
    c.add([c.nameT, c.roleT, c.statusT]);
    c.add(iconButton(this, 196, 0, 'i_left', () => this.cycleWatch(-1)));
    c.add(iconButton(this, 222, 0, 'i_right', () => this.cycleWatch(1)));
    c.add(iconButton(this, 248, 0, 'i_book', () => this.state?.spectate && this.showJournal(this.state.spectate)));
    return c;
  }

  updateSpecBar(v, ghost) {
    const bar = this.specBar;
    const s = ghost ? v.spectate : null;
    bar.setVisible(!!s);
    if (!s) return;
    const p = v.players.find((x) => x.id === s.id);
    const key = outfitKey(p.outfit);
    if (bar.whoKey !== key) {
      bar.who?.destroy();
      bar.who = addCharacter(this, 14, 14, p.outfit, 1);
      bar.add(bar.who);
      bar.whoKey = key;
    }
    if (s.alive) bar.who.clearTint();
    else bar.who.setTint(0x8090b0);
    const nm = s.name.length > 10 ? s.name.slice(0, 9) + '…' : s.name;
    bar.nameT.setText(nm);
    bar.roleT.setText(s.roleName + (s.lover ? ' · มีคู่รัก' : '')).setColor(TEAM_COLOR[s.team]).setX(30 + bar.nameT.width + 4);
    let st = this.specStatus(v, s);
    if (st.length > 36) st = st.slice(0, 35) + '…';
    bar.statusT.setText(st);
  }

  specStatus(v, s) {
    const name = (id) => v.players.find((p) => p.id === id)?.name || '?';
    const where = (loc) => (LOCATIONS[loc] ? 'ที่' + LOCATIONS[loc].name : '');
    if (!s.alive) return 'ตายแล้ว เป็นวิญญาณเหมือนคุณ';
    const ph = v.phase;
    if (ph === 'intro') return 'กำลังดูบทบาทของตัวเอง';
    if (ph === 'day') return s.pick ? `เลือกไป${LOCATIONS[s.pick].name}` : 'กำลังเลือกสถานที่...';
    if (ph === 'work' || ph === 'chase') {
      const w = s.work || {};
      if (w.ambush === 'choosing') return `กำลังเลือกเหยื่อจะซุ่ม${where(w.loc)}`;
      if (w.ambush && w.ambush !== 'none') return `ซุ่มโจมตี ${name(w.ambush)}`;
      return w.done ? `ทำงานเสร็จแล้ว${where(w.loc)}` : `กำลังทำงาน${where(w.loc)}...`;
    }
    if (ph === 'dayResult') return s.dayResult ? `กลับจาก${LOCATIONS[s.dayResult.loc]?.name || 'ทำงาน'} (+${s.dayResult.points} แต้ม)` : 'กลับจากทำงาน';
    if (ph === 'night') {
      const n = s.night || {};
      if (n.interrogate) return `สอบปากคำลับกับ ${name(n.interrogate)}`;
      if (!n.acts) return 'นอนหลับอยู่...';
      if (!n.done) return 'กำลังคิดว่าคืนนี้จะทำอะไร...';
      return this.nightVerb(n.mode === 'sniff' ? 'sniff' : s.role, n.target, name);
    }
    if (ph === 'vote' || ph === 'voteResult') return s.vote ? (s.vote === 'skip' ? 'งดออกเสียง' : `โหวต ${name(s.vote)}`) : 'ยังไม่โหวต';
    if (ph === 'meeting') return 'อยู่ในที่ประชุม';
    return 'อยู่ที่ลานหมู่บ้าน';
  }

  nightVerb(role, target, name) {
    if (target == null || target === 'skip') return 'ไม่ใช้พลังคืนนี้';
    const who = Array.isArray(target) ? target.map(name).join(' กับ ') : name(target);
    const verb = { alpha: 'คืนนี้จะล่า', seer: 'ส่องลูกแก้วดู', doctor: 'ปกป้อง', detective: 'เรียกสอบปากคำ', watchman: 'เฝ้าบ้าน', priest: 'ชุบชีวิต', cupid: 'ผูกคู่รัก', wolf: 'แอบไปใส่ร้าย', shadow: 'แอบไปใส่ร้าย', sniff: 'แอบดมกลิ่น' }[role] || 'เลือก';
    return `${verb} ${who}`;
  }

  // กลางจอ: เห็นสิ่งที่คนที่ติดตามกำลังเห็น (การ์ดในมือ / สถานที่ทำงาน / ผลกลางวัน / กลางคืน)
  renderSpectate(v) {
    const s = v.me && !v.me.alive && v.phase !== 'ended' ? v.spectate : null;
    const show = !!s && s.alive && ['day', 'work', 'dayResult', 'night'].includes(v.phase);
    const { journal, ...rest } = s || {};
    const sig = show ? JSON.stringify([v.phase, v.day, rest, this.chatBox.visible]) : '';
    if (sig === (this.ui.specSig ?? '')) return;
    this.ui.specSig = sig;
    if (this.ui.spec) {
      killDeep(this, this.ui.spec);
      this.ui.spec.destroy();
      this.ui.spec = null;
    }
    const note = this.ui.ghostNote;
    if (note?.active) {
      note.setVisible(!show);
      note.bg.setVisible(!show);
    }
    if (!show) return;
    const c = this.add.container(this.cx, 200);
    this.phaseLayer.add(c);
    this.ui.spec = c;
    const p = v.players.find((x) => x.id === s.id);
    const status = this.specStatus(v, s);
    const head = (y) => c.add(txt(this, 0, y, `${s.name} · ${status}`, { size: 13, color: '#9ad0ff', wrap: 360 }));
    const sc = this.chatBox.visible ? 2.5 : 3;
    const stars = (score, x, y) => {
      const n = score >= 0.85 ? 3 : score >= 0.5 ? 2 : score >= 0.2 ? 1 : 0;
      for (let i = 0; i < 3; i++) c.add(this.add.image(x + i * 20, y, i < n ? 'mg_star' : 'mg_star_off').setScale(1.6));
    };
    if (v.phase === 'day') {
      (s.hand || []).forEach((loc, i) => {
        const card = new Card(this, (i - 1) * 92, 20, loc);
        card.back.setVisible(false);
        card.front.setVisible(true);
        card.faceUp = true;
        card.setScale(1.3);
        if (s.pick) {
          if (loc === s.pick) {
            card.y -= 14;
            card.glow.setAlpha(1);
          } else card.setAlpha(0.4);
        }
        c.add(card);
      });
      head(-82);
    } else if (v.phase === 'work') {
      const w = s.work || {};
      if (!w.loc) return head(0);
      c.add(this.add.image(0, 0, 'scene_' + w.loc).setScale(sc));
      const ch = addCharacter(this, 0, 35 * sc - 3, p.outfit, 3);
      if (!w.done) ch.play(outfitKey(p.outfit) + '_walk');
      c.add(ch);
      if (w.done) stars(w.score ?? 0, -35 * sc * 2 + 20, -35 * sc + 14);
      head(-35 * sc - 14);
    } else if (v.phase === 'dayResult') {
      const r = s.dayResult;
      if (!r) return head(0);
      c.add(this.add.image(0, 0, 'scene_' + r.loc).setScale(sc));
      const ids = [s.id, ...r.with];
      ids.forEach((id, i) => {
        const q = v.players.find((x) => x.id === id);
        const x = (i - (ids.length - 1) / 2) * Math.min(44, 260 / ids.length);
        c.add(addCharacter(this, x, 35 * sc - 3, q.outfit, 2.5));
        c.add(txt(this, x, 35 * sc + 8, q.name, { size: 9, color: id === s.id ? '#9ad0ff' : COLORS.text }));
      });
      stars(r.score ?? 0, -35 * sc * 2 + 20, -35 * sc + 14);
      head(-35 * sc - 14);
      if (r.ambush) {
        const victim = name(r.ambush.victim);
        const line = r.ambush.byMe ? `ซุ่มโจมตี ${victim}` : r.ambush.victim === s.id ? 'ถูกเงาดำซุ่มโจมตี!' : `เห็น ${victim} ถูกซุ่มโจมตี`;
        c.add(txt(this, 0, -12, line, { size: 13, color: COLORS.red, bold: true }));
        if (r.ambush.clue) c.add(txt(this, 0, 8, 'เบาะแส: ' + r.ambush.clue, { size: 10, color: COLORS.text, wrap: 300 }));
      }
    } else if (v.phase === 'night') {
      const n = s.night || {};
      c.add(panel(this, 0, 0, 320, 160, 'panel_dark'));
      const ch = addCharacter(this, -96, 58, p.outfit, 3);
      c.add(ch);
      if (!n.acts && !n.interrogate) {
        ch.setAngle(-90).setPosition(-60, 30);
        ch.anims.pause();
        const z = this.add.image(-30, -30, 'i_zzz').setScale(2.5);
        c.add(z);
        this.tweens.add({ targets: z, y: -44, alpha: 0.4, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      } else {
        c.add(this.add.image(-96, -44, ROLES[s.role].icon).setScale(2.5));
        const t = n.done && n.target && n.target !== 'skip' && !Array.isArray(n.target) ? v.players.find((x) => x.id === n.target) : null;
        if (t) c.add(addCharacter(this, 90, 58, t.outfit, 2.5).setTint(0xb0b8e0));
        if (t) c.add(txt(this, 90, 68, t.name, { size: 10 }));
      }
      c.add(txt(this, 20, -50, s.roleName, { size: 14, color: TEAM_COLOR[s.team], bold: true }));
      c.add(txt(this, 20, -22, status, { size: 12, color: '#9ad0ff', wrap: 190 }));
    }
    if (this.ui.watchPicker?.active) this.phaseLayer.bringToTop(this.ui.watchPicker);
  }

  // ---------- หน้าต่างข้อมูล ----------
  showRole() {
    const me = this.state?.me;
    if (!me) return;
    const role = ROLES[me.role];
    // วัดความสูงข้อความก่อน แล้วขยายป๊อปอัปให้พอดี (คำอธิบายบางอาชีพยาวหลายบรรทัด)
    const desc = txt(this, 0, 0, role.desc, { size: 11, wrap: 196, origin: [0, 0], align: 'left' });
    const goal = txt(this, 0, 0, 'เป้าหมาย: ' + role.goal, { size: 11, color: COLORS.gold, wrap: 280 });
    const descH = Math.max(desc.height, 56);
    const h = Math.max(200, 64 + descH + 8 + goal.height + 44);
    const top = -h / 2;
    modal(this, {
      title: 'บทบาทของคุณ',
      w: 320,
      h,
      build: (m) => {
        m.box.setDepth(950);
        m.box.add(this.add.image(-118, top + 78, role.icon).setScale(4));
        m.box.add(txt(this, -82, top + 50, role.name, { size: 18, color: TEAM_COLOR[role.team], bold: true, origin: [0, 0.5] }));
        desc.setPosition(-82, top + 64);
        goal.setPosition(0, top + 64 + descH + 8).setOrigin(0.5, 0);
        m.box.add([desc, goal]);
        m.box.add(new Button(this, -50, h / 2 - 20, 'อาชีพทั้งหมด', { w: 110, h: 22, size: 11, color: 'btn', onClick: () => {
          m.close();
          this.openGuide();
        } }));
        m.box.add(new Button(this, 60, h / 2 - 20, 'ปิด', { w: 80, h: 22, size: 11, color: 'btn_dark', onClick: () => m.close() }));
      },
    });
  }

  gameRoles() {
    const s = net.room?.settings || {};
    return possibleRoles(this.state?.players.length || 0, s.roles || {}, s.wolves);
  }

  openGuide() {
    openGuide(this, { possible: this.gameRoles(), focus: this.state?.me?.role });
  }

  // target = ผู้เล่นที่ผีกำลังติดตาม (ไม่ใส่ = สมุดของเราเอง)
  showJournal(target = null) {
    const me = target || this.state?.me;
    if (!me) return;
    if (!target) {
      this.journalSeen = me.journal.length;
      this.badge.setVisible(false);
    }
    modal(this, {
      title: target ? `สมุดบันทึกของ ${target.name}` : 'สมุดบันทึกของคุณ',
      w: 380,
      h: 260,
      build: (m) => {
        const list = document.createElement('div');
        list.className = 'px-chat px-journal';
        if (!me.journal.length) list.textContent = target ? 'สมุดของเขายังว่างอยู่' : 'ยังไม่มีอะไรน่าสนใจ... ลองไปโรงเตี๊ยมหรือสังเกตเพื่อน ๆ ดูสิ';
        me.journal.forEach((j) => {
          const line = document.createElement('div');
          line.className = 'j-' + j.kind;
          line.textContent = `วันที่ ${j.day || 1}: ${j.text}`;
          if (j.clue) {
            const match = this.state.players.filter((p) => p.alive && j.clue.values.includes(p.outfit[j.clue.part]));
            const m2 = document.createElement('div');
            m2.className = 'j-match';
            m2.textContent = match.length
              ? '→ ชุดตอนนี้ที่ตรงกัน: ' + match.map((p) => (p.id === net.me ? 'คุณ' : p.name)).join(', ')
              : '→ ตอนนี้ไม่มีใครใส่ชุดแบบนี้ (มีคนเปลี่ยนชุดหรือเปล่านะ?)';
            line.appendChild(m2);
          }
          list.appendChild(line);
        });
        m.addDom(this.add.dom(320, 176, list));
        m.box.add(new Button(this, 0, 110, 'ปิด', { w: 80, h: 22, size: 11, color: 'btn_dark', onClick: () => m.close() }));
      },
    });
  }

  confirmLeave() {
    modal(this, {
      title: 'ออกจากเกม?',
      w: 260,
      h: 120,
      build: (m) => {
        m.box.add(txt(this, 0, -8, this.state?.phase === 'ended' ? 'กลับไปหน้าเมนู' : 'ถ้าออกตอนนี้ ตัวละครของคุณจะตายทันที', { size: 11, wrap: 230 }));
        m.box.add(new Button(this, -56, 34, 'ออก', { w: 96, color: 'btn_red', onClick: () => this.leave() }));
        m.box.add(new Button(this, 56, 34, 'อยู่ต่อ', { w: 96, color: 'btn_dark', onClick: () => m.close() }));
      },
    });
  }

  leave() {
    voice.leave();
    this.leaving = true;
    net.socket.emit('room:leave');
    net.room = null;
    net.game = null;
    go(this, 'Menu');
  }
}
