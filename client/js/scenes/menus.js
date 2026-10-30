// หน้าแรก / ล็อกอิน / เมนูหลัก / แต่งตัว / วิธีเล่น / ตั้งค่า
import { net } from '../net.js';
import { sfx } from '../sfx.js';
import { prefs } from '../prefs.js';
import { music } from '../music.js';
import { openGuide } from '../ui/guide.js';
import { LOCATIONS } from '../data.js';
import { addCharacter, setCharacterOutfit, OUTFIT_PARTS, PART_LABELS, randomOutfit, SKIN_ORDER } from '../art/character.js';
import { Button, Cycler, Toggle, txt, panel, domInput, staggerIn, go, toast, COLORS } from '../ui/widgets.js';
import { dealHand, makeDeck } from '../ui/card.js';
import { startMinigame } from '../ui/minigames.js';
import '../ui/minigames2.js';

function campfire(scene, x, y, scale = 2) {
  const glow = scene.add.image(x, y - 10, 'glow').setScale(scale * 1.6).setBlendMode('ADD');
  scene.tweens.add({ targets: glow, scale: scale * 1.8, alpha: 0.75, duration: 180, yoyo: true, repeat: -1, repeatDelay: 60 });
  scene.add.image(x, y, 'logs').setOrigin(0.5, 1).setScale(scale);
  scene.add.sprite(x, y - 3 * scale, 'fire').setOrigin(0.5, 1).setScale(scale).play('fire_burn');
  scene.add.particles(x, y - 16 * scale, 'ember', {
    speedY: { min: -40, max: -20 },
    speedX: { min: -10, max: 10 },
    lifespan: 1200,
    scale: { start: 0.6, end: 0 },
    alpha: { start: 1, end: 0 },
    frequency: 180,
    blendMode: 'ADD',
  });
}

export class Title extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const backdrop = this.scene.get('Backdrop');
    backdrop.showTitle(true);
    this.events.once('shutdown', () => backdrop.showTitle(false));

    const logoShadow = txt(this, 182, 112, 'หมู่บ้านหมาป่า', { size: 46, color: '#6e1f2a', shadow: false, bold: true });
    const logo = txt(this, 180, 110, 'หมู่บ้านหมาป่า', { size: 46, color: '#f3ead2', bold: true });
    const sub = txt(this, 180, 152, 'P I X E L   W E R E W O L F', { size: 13, color: COLORS.gold });
    [logo, logoShadow].forEach((t) => {
      t.y -= 120;
      this.tweens.add({ targets: t, y: t.y + 120, duration: 900, ease: 'Bounce.Out', delay: 200 });
    });
    sub.alpha = 0;
    this.tweens.add({ targets: sub, alpha: 1, delay: 1000, duration: 600 });
    this.time.delayedCall(1200, () => {
      this.tweens.add({ targets: [logo, logoShadow], y: '-=3', duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    });

    const press = txt(this, 180, 200, 'คลิกเพื่อเริ่ม', { size: 16 });
    press.alpha = 0;
    this.time.delayedCall(1300, () => this.tweens.add({ targets: press, alpha: { from: 0.2, to: 1 }, duration: 700, yoyo: true, repeat: -1 }));
    txt(this, 320, 350, 'v0.2 ต้นแบบ', { size: 10, color: COLORS.dim });

    let started = false;
    this.input.once('pointerup', () => {
      if (started) return;
      started = true;
      if (this.sys.game.device.input.touch && !this.scale.isFullscreen) {
        try {
          this.scale.startFullscreen();
          screen.orientation?.lock?.('landscape').catch(() => {});
        } catch {
          // บางเบราว์เซอร์ไม่รองรับเต็มจอ เล่นต่อได้ตามปกติ
        }
      }
      sfx.howl();
      backdrop.howl();
      this.cameras.main.shake(600, 0.002);
      this.time.delayedCall(1500, () => go(this, 'Login'));
    });
  }
}

export class Login extends Phaser.Scene {
  constructor() {
    super('Login');
  }

  create() {
    const box = this.add.container(320, 180);
    box.add(panel(this, 0, 0, 300, 210));
    box.add(txt(this, 0, -84, 'เข้าสู่หมู่บ้าน', { size: 20, color: COLORS.gold }));
    box.add(txt(this, 0, -58, 'ตั้งชื่อเล่นที่เพื่อนจะเห็นในเกม', { size: 12, color: COLORS.dim }));
    const { el, dom } = domInput(this, 320, 152, 220, {
      placeholder: 'ชื่อเล่น',
      maxLength: 16,
      value: net.profile.name,
      onEnter: () => submit(),
    });
    const enter = new Button(this, 0, 2, 'เข้าเล่น', { w: 220, color: 'btn_green', icon: 'i_play', onClick: () => submit() });
    box.add(enter);
    box.add(txt(this, 0, 30, '— หรือ —', { size: 11, color: COLORS.dim }));
    const google = new Button(this, -56, 58, 'Google', { w: 106, color: 'btn_dark', size: 12 }).setEnabled(false);
    const discord = new Button(this, 56, 58, 'Discord', { w: 106, color: 'btn_dark', size: 12 }).setEnabled(false);
    box.add([google, discord]);
    box.add(txt(this, 0, 82, 'ล็อกอินด้วยบัญชี เร็ว ๆ นี้', { size: 10, color: COLORS.dim }));

    box.setScale(0.8).setAlpha(0);
    dom.setAlpha(0);
    this.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 350, ease: 'Back.Out' });
    this.tweens.add({ targets: dom, alpha: 1, duration: 350, delay: 150, onComplete: () => el.focus() });

    let busy = false;
    const submit = async () => {
      const name = el.value.trim();
      if (busy) return;
      if (!name) {
        sfx.error();
        this.tweens.add({ targets: dom, x: dom.x + 6, duration: 50, yoyo: true, repeat: 3 });
        return toast(this, 'กรุณาใส่ชื่อเล่น', 'error');
      }
      busy = true;
      enter.setLabel('กำลังเข้า...');
      const res = await net.login(name);
      busy = false;
      enter.setLabel('เข้าเล่น');
      if (!res.ok) return toast(this, res.error || 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'error');
      sfx.success();
      if (res.rejoined) return go(this, res.playing ? 'Game' : 'Lobby');
      const code = new URLSearchParams(location.search).get('room');
      if (code) return go(this, 'RoomList', { autoJoin: code });
      go(this, 'Menu');
    };
  }
}

export class Menu extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    txt(this, 170, 40, 'หมู่บ้านหมาป่า', { size: 28, color: '#f3ead2', bold: true });
    const plate = this.add.container(170, 74);
    plate.add(panel(this, 0, 0, 180, 24, 'panel_dark'));
    plate.add(this.add.image(-76, 0, 'i_user'));
    plate.add(txt(this, 0, 0, net.profile.name, { size: 13, color: COLORS.gold }));

    this.add.ellipse(170, 300, 160, 22, 0x000000, 0.3);
    const hero = addCharacter(this, 140, 302, net.profile.outfit, 4);
    campfire(this, 214, 304, 2);
    hero.y += 40;
    this.tweens.add({ targets: hero, y: 302, duration: 500, ease: 'Back.Out' });

    const items = [
      ['เล่นออนไลน์', 'i_play', 'btn_green', () => go(this, 'RoomList')],
      ['สร้างห้อง', 'i_plus', 'btn', () => go(this, 'CreateRoom')],
      ['แต่งตัว', 'i_shirt', 'btn', () => go(this, 'Wardrobe')],
      ['วิธีเล่น', 'i_book', 'btn', () => go(this, 'HowTo')],
      ['สมุดอาชีพ', 'i_user', 'btn', () => openGuide(this)],
      ['ตั้งค่า', 'i_gear', 'btn', () => go(this, 'Settings')],
      ['ออก', 'i_door', 'btn_dark', () => go(this, 'Title')],
    ];
    const buttons = items.map(([label, icon, color, onClick], i) =>
      new Button(this, 480, 80 + i * 34, label, { w: 180, h: 28, icon, color, onClick }),
    );
    staggerIn(this, buttons, { dx: 80, dy: 0, delay: 70 });
    // มือถือ: ปุ่มสลับเต็มจอ (ถ้าเคยออกจากเต็มจอไปแล้ว)
    if (this.sys.game.device.input.touch) {
      new Button(this, 596, 20, 'เต็มจอ', { w: 70, h: 22, size: 11, color: 'btn_dark', onClick: () => this.scale.toggleFullscreen() });
    }
  }
}

export class Wardrobe extends Phaser.Scene {
  constructor() {
    super('Wardrobe');
  }

  create(data) {
    this.back = data?.back || 'Menu';
    this.outfit = { ...net.profile.outfit };
    txt(this, 320, 24, 'ห้องแต่งตัว', { size: 20, color: COLORS.gold });

    const stage = this.add.container(170, 200);
    stage.add(panel(this, 0, 10, 200, 230, 'panel_dark'));
    const light = this.add.ellipse(170, 290, 120, 18, 0xffe0a0, 0.15);
    this.tweens.add({ targets: light, alpha: 0.3, duration: 1200, yoyo: true, repeat: -1 });
    this.hero = addCharacter(this, 170, 294, this.outfit, 6);
    this.puff = this.add.particles(0, 0, 'spark', {
      speed: { min: 40, max: 120 },
      lifespan: 400,
      scale: { start: 1, end: 0 },
      emitting: false,
      blendMode: 'ADD',
    });

    const right = this.add.container(450, 160);
    right.add(panel(this, 0, 0, 300, 240));
    right.add(txt(this, 0, -104, 'เลือกชุดของคุณ', { size: 14 }));
    this.cyclers = Object.keys(OUTFIT_PARTS).map((part, i) => {
      // สีผิวเรียงจากสว่างไปเข้ม
      const order = part === 'skin' ? SKIN_ORDER : OUTFIT_PARTS[part].map((_, v) => v);
      const opts = order.map((value) => ({ value, label: OUTFIT_PARTS[part][value] }));
      const c = new Cycler(this, -130, -76 + i * 28, PART_LABELS[part], opts, this.outfit[part] ?? 0, (v) => this.change(part, v), 260);
      right.add(c);
      return c;
    });
    right.add(txt(this, 0, 98, 'ชุดของคุณคือเบาะแส! คนที่โดนทำร้ายอาจเห็นชุดของคนร้าย', {
      size: 10, color: COLORS.dim, wrap: 270,
    }));

    const dice = new Button(this, 370, 300, 'สุ่ม', { w: 100, icon: 'i_dice', onClick: () => this.randomize() });
    const save = new Button(this, 480, 300, 'บันทึก', { w: 110, color: 'btn_green', icon: 'i_check', onClick: () => this.save() });
    const back = new Button(this, 580, 300, 'กลับ', { w: 80, color: 'btn_dark', onClick: () => go(this, this.back) });
    staggerIn(this, [dice, save, back], { dy: 30 });
  }

  change(part, v) {
    this.outfit[part] = v;
    sfx.cloth();
    this.refreshHero();
  }

  refreshHero() {
    setCharacterOutfit(this.hero, this.outfit);
    this.puff.explode(14, this.hero.x, this.hero.y - 90);
    this.tweens.killTweensOf(this.hero);
    this.hero.setScale(6);
    this.tweens.add({ targets: this.hero, scaleX: 6.5, scaleY: 5.5, duration: 80, yoyo: true, ease: 'Quad.Out' });
  }

  randomize() {
    this.outfit = randomOutfit();
    sfx.sparkle();
    this.cyclers.forEach((c, i) => {
      const part = Object.keys(OUTFIT_PARTS)[i];
      c.index = Math.max(0, c.options.findIndex((o) => o.value === this.outfit[part]));
      c.refresh();
    });
    this.tweens.killTweensOf(this.hero);
    this.tweens.add({
      targets: this.hero,
      scaleX: 0,
      duration: 120,
      ease: 'Quad.In',
      onComplete: () => this.refreshHero(),
    });
  }

  save() {
    net.profile.outfit = { ...this.outfit };
    net.saveProfile();
    sfx.success();
    toast(this, 'บันทึกชุดแล้ว', 'success');
    go(this, this.back);
  }
}

const HOWTO_PAGES = [
  {
    icon: 'i_wolf',
    title: 'เป้าหมาย',
    body: 'ในหมู่บ้านมีจ่าฝูงหมาป่าซ่อนตัวอยู่ 1 ตัว\nชาวบ้านต้องช่วยกันหาตัวและโหวตแขวนคอ หรือทำเควสจนหลอดเต็มเพื่อขับไล่หมาป่า\nส่วนหมาป่าต้องกำจัดชาวบ้านจนเหลือ 2 คน',
  },
  {
    icon: 'i_card',
    title: 'กลางวัน: จั่วการ์ด',
    body: 'ทุกคนจั่วการ์ดสถานที่ 3 ใบ แล้วเลือก 1 ใบ\nเดินไปที่นั่นแล้วเล่นมินิเกม ยิ่งเก่งยิ่งได้แต้มเควสเยอะ\nและจะเห็นว่าใครไปที่เดียวกับเรา',
    demo: true,
  },
  {
    icon: 'i_heart',
    title: 'การซุ่มโจมตี',
    body: 'จ่าฝูงซุ่มได้ทุกที่ที่มันไป แล้วเกิดการไล่ล่าสดที่ทุกคนได้ดู!\nเหยื่อกด ซ้าย-ขวา สลับกันวิ่งหนี กระโดดข้ามท่อนไม้ · คนที่อยู่ตรงนั้นปาหินช่วยได้\nหนีรอด = ไม่เสียชีวิตและเห็นคนร้าย · ถูกจับ = เสีย 1 ชีวิต (มี 2 ชีวิต)',
  },
  {
    icon: 'i_moon',
    title: 'กลางคืน',
    body: 'จ่าฝูงเลือกเหยื่อ 1 คน (คืนแรกฝูงหมาป่ายังไม่ออกล่า)\nหมอดูส่องหาหมาป่า หมอปกป้องคน และนักสืบเรียกคนมาสอบปากคำลับ',
  },
  {
    icon: 'i_sun',
    title: 'เช้า: ประชุม',
    body: 'ดูว่าเมื่อคืนใครตาย แล้วพิมพ์หรือเปิดไมค์คุยกัน\nเอาเบาะแสมาเถียง จับคำโกหก แล้วโหวตแขวนคอ 1 คน',
  },
];

export class HowTo extends Phaser.Scene {
  constructor() {
    super('HowTo');
  }

  create() {
    this.page = 0;
    this.animating = false;
    this.demoRunning = false;
    this.holder = this.add.container(0, 0);
    this.dots = HOWTO_PAGES.map((_, i) => this.add.rectangle(296 + i * 12, 318, 6, 6, 0x55466a));
    new Button(this, 40, 318, '', { w: 30, icon: 'i_left', color: 'btn_dark', onClick: () => this.show(this.page - 1, -1) });
    new Button(this, 600, 318, '', { w: 30, icon: 'i_right', color: 'btn_dark', onClick: () => this.show(this.page + 1, 1) });
    new Button(this, 590, 20, 'กลับ', { w: 70, h: 24, size: 12, color: 'btn_dark', onClick: () => go(this, 'Menu') }).setDepth(10);
    this.show(0, 0);
  }

  show(i, dir) {
    if (i < 0 || i >= HOWTO_PAGES.length || this.animating) return;
    this.animating = true;
    const old = this.holder;
    this.tweens.add({ targets: old, x: -dir * 640, alpha: 0, duration: 260, ease: 'Quad.In', onComplete: () => old.destroy() });
    this.page = i;
    this.dots.forEach((d, j) => d.setFillStyle(j === i ? 0xe8b84a : 0x55466a));
    const p = HOWTO_PAGES[i];
    const c = (this.holder = this.add.container(dir * 640, 0));
    c.add(panel(this, 320, 160, 560, 260));
    c.add(this.add.image(320, 56, p.icon).setScale(3));
    c.add(txt(this, 320, 86, p.title, { size: 20, color: COLORS.gold }));
    const bodyY = p.demo ? 120 : 160;
    c.add(txt(this, 320, bodyY, p.body, { size: 13, wrap: 480 }));
    if (p.demo) {
      c.add(new Button(this, 240, 268, 'ลองจั่วการ์ด', { w: 150, color: 'btn_green', icon: 'i_card', onClick: () => this.demo() }));
      c.add(new Button(this, 400, 268, 'ลองมินิเกม', { w: 150, color: 'btn', icon: 'i_play', onClick: () => this.tryMinigame() }));
    }
    this.tweens.add({ targets: c, x: 0, duration: dir ? 300 : 0, ease: 'Quad.Out', onComplete: () => (this.animating = false) });
  }

  update(_, dt) {
    this.mg?.update(dt);
  }

  tryMinigame(loc) {
    if (this.demoRunning) return;
    this.demoRunning = true;
    const shade = this.add.rectangle(320, 180, 640, 360, 0x07060c, 0.8).setDepth(5).setInteractive();
    const layer = this.add.container(0, 0).setDepth(6);
    const key = loc || Phaser.Utils.Array.GetRandom(Object.keys(LOCATIONS));
    const mg = startMinigame(this, key, {
      layer,
      onDone: () => {
        this.time.delayedCall(2200, () => {
          mg.destroy();
          shade.destroy();
          layer.destroy();
          if (this.mg === mg) {
            this.mg = null;
            this.demoRunning = false;
          }
        });
      },
    });
    this.mg = mg;
  }

  async demo() {
    if (this.demoRunning) return;
    this.demoRunning = true;
    const shade = this.add.rectangle(320, 180, 640, 360, 0x07060c, 0).setDepth(5).setInteractive();
    this.tweens.add({ targets: shade, fillAlpha: 0.88, duration: 250 });
    const deck = makeDeck(this, 560, 90).setDepth(6);
    const all = Object.keys(LOCATIONS);
    const locs = Phaser.Utils.Array.Shuffle([...all]).slice(0, 3);
    const label = txt(this, 320, 30, 'เลือกสถานที่ที่จะไปวันนี้', { size: 16, color: COLORS.gold }).setDepth(60).setAlpha(0);
    this.tweens.add({ targets: label, alpha: 1, delay: 1400, duration: 300 });
    const { loc, card } = await dealHand(this, {
      from: { x: 560, y: 90 },
      slots: [{ x: 196, y: 214 }, { x: 320, y: 222 }, { x: 444, y: 214 }],
      locs,
      pickY: 150,
    });
    label.setText(`คุณเลือกไป ${LOCATIONS[loc].name}  รอผู้เล่นคนอื่น...`);
    this.time.delayedCall(1600, () => {
      this.tweens.add({
        targets: [shade, deck, card, label],
        alpha: 0,
        duration: 300,
        onComplete: () => {
          [shade, deck, card, label].forEach((o) => o.destroy());
          this.demoRunning = false;
        },
      });
    });
  }
}

export class Settings extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create() {
    const box = this.add.container(320, 168);
    box.add(panel(this, 0, 0, 340, 230));
    box.add(txt(this, 0, -92, 'ตั้งค่า', { size: 20, color: COLORS.gold }));
    const vol = [0, 0.25, 0.5, 0.75, 1].map((v) => ({ value: v, label: Math.round(v * 100) + '%' }));
    box.add(new Cycler(this, -140, -56, 'เพลง', vol, Math.round(prefs.get('musicVolume', 0.5) * 4) / 4, (v) => music.setVolume(v), 280));
    box.add(new Cycler(this, -140, -26, 'เสียงเอฟเฟกต์', vol, Math.round(prefs.get('sfxVolume', 0.6) * 4) / 4, (v) => {
      prefs.set('sfxVolume', v);
      sfx.click();
    }, 280));
    box.add(new Toggle(this, -140, 4, 'ข้ามคัตซีน', prefs.get('skipCutscenes', false), (v) => prefs.set('skipCutscenes', v), 280));
    box.add(new Toggle(this, -140, 32, 'ไมค์แบบกดค้างเพื่อพูด', prefs.get('pushToTalk', true), (v) => prefs.set('pushToTalk', v), 280));
    box.add(new Cycler(this, -140, 62, 'ภาษา', [{ value: 'th', label: 'ไทย' }], 'th', null, 280));
    const back = new Button(this, 320, 314, 'กลับ', { w: 120, color: 'btn_dark', onClick: () => go(this, 'Menu') });
    staggerIn(this, [box, back], { dy: 20 });
  }
}
