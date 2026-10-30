// ฉากพื้นฐาน: โหลด / ฉากหลังหมู่บ้าน / เอฟเฟกต์เปลี่ยนหน้าและข้อความแจ้งเตือน
import { buildAllTextures, W, H } from '../art/textures.js';
import { panel, txt, COLORS } from '../ui/widgets.js';
import { net } from '../net.js';
import { music } from '../music.js';

export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    buildAllTextures(this);
    this.scene.launch('Backdrop');
    this.scene.launch('Fx');
    this.scene.bringToTop('Fx');
    this.scene.start('Title');
  }
}

export class Backdrop extends Phaser.Scene {
  constructor() {
    super('Backdrop');
  }

  create() {
    // เพลงหมู่บ้านในหน้าเมนูทั้งหมด (ฉากหลังนี้หลับตอนเล่นเกม แล้วตื่นเมื่อกลับมา)
    music.play('menu');
    this.events.on('wake', () => music.play('menu'));
    this.add.image(0, 0, 'sky').setOrigin(0);

    // ดาวกระพริบ
    for (let i = 0; i < 40; i++) {
      const s = this.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(0, 200), 'px2')
        .setScale(Math.random() > 0.8 ? 1 : 0.5)
        .setTint(Math.random() > 0.5 ? 0xffffff : 0xc8c0ff);
      this.tweens.add({
        targets: s,
        alpha: { from: 0.15, to: 1 },
        duration: Phaser.Math.Between(700, 2200),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      });
    }

    const glow = this.add.image(500, 72, 'moon_glow');
    this.tweens.add({ targets: glow, scale: 1.08, alpha: 0.8, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.moon = this.add.image(500, 72, 'moon');

    this.add.image(0, 150, 'hills_far').setOrigin(0);
    for (let x = -10; x < W + 20; x += 17) {
      this.add.image(x, 232 + Math.sin(x * 0.07) * 6, 'pine_far').setOrigin(0.5, 1).setScale(0.8 + Math.sin(x) * 0.15);
    }
    this.fogs = [];
    for (let i = 0; i < 4; i++) {
      const f = this.add.image(Phaser.Math.Between(0, W), 225 + i * 14, 'fog').setScale(2, 1.5).setAlpha(0.8);
      f.speed = 4 + i * 3;
      this.fogs.push(f);
    }
    this.add.image(0, 230, 'hills_near').setOrigin(0);

    // หน้าผาและหมาป่าหอน (แสดงเฉพาะหน้าแรก) อยู่หลังแถวบ้าน ฐานจึงจมลงพื้นพอดี
    this.titleProps = this.add.container(0, 0).setAlpha(0);
    this.titleProps.add(this.add.image(330, 262, 'cliff').setOrigin(0, 1));
    [[344, 246, 0.9], [360, 232, 0.8], [376, 220, 0.7], [560, 210, 0.8], [584, 226, 0.9], [606, 240, 1]].forEach(([x, y, s]) =>
      this.titleProps.add(this.add.image(x, y, 'pine_far').setOrigin(0.5, 1).setScale(s)),
    );
    this.wolf = this.add.image(466, 114, 'howl_wolf').setOrigin(0.5, 1).setScale(2.5);
    this.wolfEye = this.add.rectangle(494, 47, 3, 2, 0xff3030).setAlpha(0);
    this.titleProps.add([this.wolf, this.wolfEye]);
    this.cloud = this.add.image(-80, 60, 'night_cloud').setScale(2);
    this.titleProps.add(this.cloud);
    this.tweens.add({ targets: this.cloud, x: 720, duration: 26000, repeat: -1 });

    // บ้านและไฟหน้าต่าง
    [[80, 292], [190, 288], [455, 288], [570, 294]].forEach(([hx, hy]) => {
      this.add.image(hx, hy, 'house').setOrigin(0.5, 1);
      [[11, 35], [35, 35]].forEach(([wx, wy]) => {
        const x = hx - 26 + wx;
        const y = hy - 46 + wy;
        const g = this.add.image(x + 3, y + 2, 'glow').setScale(0.7).setBlendMode('ADD');
        const win = this.add.image(x, y, 'window').setOrigin(0);
        this.tweens.add({
          targets: [g, win],
          alpha: { from: 1, to: 0.55 },
          duration: Phaser.Math.Between(120, 400),
          yoyo: true,
          repeat: -1,
          repeatDelay: Phaser.Math.Between(800, 4000),
        });
      });
    });
    [[18, 300, 1.5], [48, 296, 1.2], [128, 294, 0.9], [520, 294, 1], [604, 298, 1.3], [632, 302, 1.6]].forEach(([x, y, s]) =>
      this.add.image(x, y, 'pine').setOrigin(0.5, 1).setScale(s),
    );
    this.add.image(0, 280, 'ground').setOrigin(0);

    // หิ่งห้อย
    for (let i = 0; i < 14; i++) this.firefly();

    // ดาวตก
    this.time.addEvent({ delay: 7000, loop: true, callback: () => Math.random() > 0.4 && this.shootingStar() });
  }

  showTitle(on) {
    this.tweens.killTweensOf(this.titleProps);
    this.tweens.add({ targets: this.titleProps, alpha: on ? 1 : 0, duration: on ? 900 : 500 });
    this.batTimer?.remove();
    if (on) this.batTimer = this.time.addEvent({ delay: 3500, loop: true, startAt: 3000, callback: () => this.batFlock() });
  }

  // ค้างคาวบินผ่านหน้าพระจันทร์เป็นฝูงเล็ก ๆ
  batFlock() {
    const n = Phaser.Math.Between(2, 4);
    const y0 = Phaser.Math.Between(40, 100);
    for (let i = 0; i < n; i++) {
      const b = this.add.sprite(-20 - i * 18, y0 + Phaser.Math.Between(-12, 12), 'bat').setScale(2).play('bat_fly');
      this.titleProps.add(b);
      const proxy = { t: 0 };
      const amp = Phaser.Math.Between(8, 18);
      const startY = b.y;
      this.tweens.add({
        targets: proxy,
        t: 1,
        duration: Phaser.Math.Between(5000, 7000),
        delay: i * 150,
        onUpdate: () => {
          b.x = -20 - i * 18 + proxy.t * 720;
          b.y = startY + Math.sin(proxy.t * 18 + i) * amp;
        },
        onComplete: () => b.destroy(),
      });
    }
  }

  howl() {
    this.tweens.add({ targets: this.wolf, scaleY: 2.65, duration: 400, yoyo: true, repeat: 1, ease: 'Sine.InOut' });
    this.tweens.add({ targets: this.wolfEye, alpha: 1, duration: 200, yoyo: true, hold: 1100 });
  }

  firefly() {
    const f = this.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(240, 340), 'firefly').setBlendMode('ADD');
    const wander = () => {
      this.tweens.add({
        targets: f,
        x: f.x + Phaser.Math.Between(-40, 40),
        y: Phaser.Math.Clamp(f.y + Phaser.Math.Between(-25, 25), 220, 350),
        alpha: { from: 0.2, to: 1 },
        duration: Phaser.Math.Between(1800, 3500),
        yoyo: false,
        ease: 'Sine.InOut',
        onComplete: wander,
      });
    };
    wander();
  }

  shootingStar() {
    const x = Phaser.Math.Between(60, 400);
    const y = Phaser.Math.Between(20, 90);
    const trail = this.add.particles(0, 0, 'px2', { lifespan: 400, alpha: { start: 0.8, end: 0 }, scale: { start: 1, end: 0.3 }, frequency: 12 });
    const head = { x, y };
    trail.startFollow(head);
    this.tweens.add({ targets: head, x: x + 140, y: y + 50, duration: 700, ease: 'Quad.In', onComplete: () => { trail.stop(); this.time.delayedCall(500, () => trail.destroy()); } });
  }

  update(_, dt) {
    for (const f of this.fogs) {
      f.x += (f.speed * dt) / 1000;
      if (f.x > W + 200) f.x = -200;
    }
  }
}

export class Fx extends Phaser.Scene {
  constructor() {
    super('Fx');
  }

  create() {
    this.busy = false;
    this.tiles = [];
    const size = 32;
    for (let y = 0; y < H / size + 1; y++) {
      for (let x = 0; x < W / size + 1; x++) {
        const t = this.add.rectangle(x * size + size / 2, y * size + size / 2, size, size, 0x0b0a1a).setScale(0).setDepth(1000);
        t.order = x + y;
        this.tiles.push(t);
      }
    }
    this.toasts = [];
    this.offline = this.add.container(320, 346).setDepth(1100).setVisible(false);
    this.offline.add(panel(this, 0, 0, 260, 22, 'panel_dark'));
    this.offline.add(txt(this, 0, 0, 'การเชื่อมต่อหลุด กำลังเชื่อมต่อใหม่...', { size: 12, color: COLORS.red }));
    net.events.on('connection', (ok) => this.offline.setVisible(!ok));
  }

  transition(midway) {
    // ถ้ากำลังเปลี่ยนหน้าอยู่ ให้รอคิวไว้ก่อน (เช่น เข้าห้องอัตโนมัติจากลิงก์เชิญ)
    if (this.busy) {
      this.pending = midway;
      return;
    }
    this.busy = true;
    // ช่องพิมพ์ (HTML) อยู่เหนือแคนวาสเสมอ ต้องซ่อนเองระหว่างเปลี่ยนหน้า
    const dom = this.game.domContainer;
    dom.style.transition = 'opacity 0.15s';
    dom.style.opacity = '0';
    this.tiles.forEach((t) => {
      this.tweens.add({ targets: t, scale: 1.05, duration: 160, delay: t.order * 18, ease: 'Quad.In' });
    });
    const maxDelay = Math.max(...this.tiles.map((t) => t.order)) * 18 + 170;
    this.time.delayedCall(maxDelay, () => {
      try {
        midway();
      } catch (e) {
        console.error(e);
      }
      this.scene.bringToTop();
      this.time.delayedCall(60, () => {
        this.tiles.forEach((t) => {
          this.tweens.add({ targets: t, scale: 0, duration: 160, delay: t.order * 18, ease: 'Quad.Out' });
        });
        this.time.delayedCall(maxDelay * 0.6, () => (dom.style.opacity = '1'));
        this.time.delayedCall(maxDelay, () => {
          this.busy = false;
          const next = this.pending;
          this.pending = null;
          if (next) this.transition(next);
        });
      });
    });
  }

  toast(msg, kind = 'info') {
    const color = { info: COLORS.text, error: COLORS.red, success: COLORS.green }[kind] || COLORS.text;
    const t = txt(this, 0, 0, msg, { size: 13, color });
    const box = this.add.container(320, -20).setDepth(1200);
    box.add([panel(this, 0, 0, Math.max(160, t.width + 30), 26, 'panel_dark'), t]);
    this.toasts.push(box);
    const y = 58 + (this.toasts.length - 1) * 30;
    this.tweens.add({ targets: box, y, duration: 300, ease: 'Back.Out' });
    this.time.delayedCall(2600, () => {
      this.tweens.add({
        targets: box,
        y: -30,
        alpha: 0,
        duration: 250,
        ease: 'Quad.In',
        onComplete: () => {
          box.destroy();
          this.toasts = this.toasts.filter((b) => b !== box);
        },
      });
    });
  }
}
