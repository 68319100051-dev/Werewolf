// ไล่ล่าสด: ตอนจ่าฝูงซุ่มโจมตี เหยื่อต้องวิ่งหนี จ่าฝูงไล่ตาม คนที่อยู่ตรงนั้นปาหินช่วยได้
// ทุกคนในห้องเห็นการไล่ล่านี้พร้อมกัน (คนที่อยู่ที่อื่นเห็นเหยื่อเป็นเงาดำ)
import { canvas, rect, dot, rows, outline, addTexture, addSheet } from '../art/pixel.js';
import { addCharacter, outfitKey, DEFAULT_OUTFIT } from '../art/character.js';
import { LOCATIONS } from '../data.js';
import { sfx } from '../sfx.js';
import { net } from '../net.js';
import { txt, panel, COLORS } from './widgets.js';

const W = 420;
const H = 210;
const X0 = -W / 2 + 40; // ตำแหน่งของระยะ 0 (ปากหมาป่า)
const SPAN = W - 84; // ระยะ 0..100
const GROUND = H / 2 - 16;
const LOG_SPEED = 0.11; // ท่อนไม้เลื่อนเข้าหาเหยื่อ (px ต่อ ms)
const xOf = (d) => X0 + (d / 100) * SPAN;

export function ensureChaseTextures(scene) {
  if (scene.textures.exists('ch_wolf')) return;
  const body = [
    '...........................x.x......',
    '..........................xxxx......',
    '.........................xxxxxx.....',
    '....xxxxxxxxxxxxxxxxxxxxxxxxxRxx....',
    '..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx..',
    '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
    'xxx.xxxxxxxxxxxxxxxxxxxxxxxxxxw.....',
    'xx...xxxxxxxxxxxxxxxxxxxxxxxxw......',
    'x.....xxxxxxxxxxxxxxxxxxxxxx........',
    '.......xxxxxxxxxxxxxxxxxxxxx........',
  ];
  const legsA = [
    '.......xxxx.........xxxxx...........',
    '......xxx.............xxxx..........',
    '.....xxx................xxx.........',
    '....xxx..................xxx........',
    '...xxx....................xxx.......',
    '..xx........................xx......',
  ];
  const legsB = [
    '........xxxx......xxxx..............',
    '.........xxx.....xxxx...............',
    '..........xxx...xxx.................',
    '...........xxx.xxx..................',
    '...........xx..xx...................',
    '..........xx..xx....................',
  ];
  const frame = (legs) => {
    const { c, ctx } = canvas(38, 18);
    rows(ctx, [...body, ...legs], { x: '#0c0a14', R: '#ff3a3a', w: '#e8e8f0' }, 1, 1);
    // ขนหลังเหลือบม่วงนิด ๆ ให้เห็นรูปร่างในที่มืด
    for (let x = 6; x < 28; x += 2) dot(ctx, x, 4, '#2a2240');
    outline(ctx, 38, 18, '#3a2e52');
    return c;
  };
  addSheet(scene, 'ch_wolf', [frame(legsA), frame(legsB)], 38, 18);
  scene.anims.create({ key: 'ch_wolf_run', frames: scene.anims.generateFrameNumbers('ch_wolf', { start: 0, end: 1 }), frameRate: 10, repeat: -1 });

  const stone = canvas(6, 5);
  rect(stone.ctx, 1, 0, 4, 5, '#8a8a98');
  rect(stone.ctx, 0, 1, 6, 3, '#8a8a98');
  rect(stone.ctx, 1, 1, 2, 1, '#c8c8d4');
  rect(stone.ctx, 1, 4, 4, 1, '#5a5a68');
  addTexture(scene, 'ch_stone', stone.c);

  // ตะเกียงหน้าหมู่บ้าน = เส้นชัย
  const gate = canvas(14, 36);
  rect(gate.ctx, 6, 8, 3, 28, '#5a3a22');
  rect(gate.ctx, 6, 8, 1, 28, '#8a5a32');
  rect(gate.ctx, 2, 8, 11, 2, '#5a3a22');
  rect(gate.ctx, 3, 0, 9, 9, '#3a2c24');
  rect(gate.ctx, 4, 1, 7, 7, '#ffd84a');
  rect(gate.ctx, 5, 2, 3, 3, '#fff6c0');
  rect(gate.ctx, 3, 4, 9, 1, '#3a2c24');
  rect(gate.ctx, 7, 1, 1, 7, '#3a2c24');
  outline(gate.ctx, 14, 36, '#120e18');
  addTexture(scene, 'ch_gate', gate.c);

  const tuft = canvas(7, 5);
  rect(tuft.ctx, 0, 4, 7, 1, '#2a4a2a');
  [[1, 1], [3, 0], [5, 2]].forEach(([x, y]) => rect(tuft.ctx, x, y, 1, 5 - y, '#4a7a3a'));
  addTexture(scene, 'ch_tuft', tuft.c);

  const dust = canvas(3, 3);
  rect(dust.ctx, 0, 1, 3, 1, '#c8b890');
  rect(dust.ctx, 1, 0, 1, 3, '#c8b890');
  addTexture(scene, 'ch_dust', dust.c);

  // เงาดำที่พุ่งออกมาขวางทาง (หมาป่าลูกฝูงช่วยจ่าฝูง)
  const shade = canvas(12, 26);
  rows(shade.ctx, [
    '....xxxx....', '...xxxxxx...', '...xRxxRx...', '...xxxxxx...', '....xxxx....',
    '..xxxxxxxx..', '.xxxxxxxxxx.', 'xxxxxxxxxxxx', 'xxxxxxxxxxxx', 'xx.xxxxxx.xx',
    'x..xxxxxx..x', '...xxxxxx...', '...xxxxxx...', '...xxx.xxx..', '..xxx...xxx.',
    '..xx.....xx.', '.xx.......xx',
  ], { x: '#0c0a14', R: '#ff3a3a' }, 0, 8);
  addTexture(scene, 'ch_shade', shade.c);
}

const TITLES = {
  victim: 'เงาดำพุ่งเข้ามา! วิ่งหนีเร็ว!',
  hunter: 'ไล่ล่าเหยื่อ!',
  helper: (name) => `${name} ถูกไล่ล่า! ช่วยเขาเร็ว!`,
  helperPack: (name) => `${name} ถูกจ่าฝูงไล่ล่า... แอบขวางทางได้`,
  watch: (loc) => `ได้ยินเสียงไล่ล่าดังมาจาก${loc}!`,
};
const HOWTO = {
  victim: 'กด ซ้าย-ขวา สลับกันเพื่อวิ่ง (A / D) · กระโดดข้ามท่อนไม้ (Space)',
  hunter: 'กด ซ้าย-ขวา สลับกันเพื่อไล่ (A / D) · เข้าใกล้แล้วตะครุบ (Space) ได้ครั้งเดียว พลาดจะเสียหลัก',
  helper: 'ปาหินใส่เงาดำ ให้เหยื่อมีเวลาหนี (Space)',
  helperPack: 'แอบขวางทางเหยื่อ ไม่มีใครรู้ว่าเป็นคุณ (Space)',
  watch: 'หมดเวลาแล้วเหยื่อยังอยู่นอกเขตแดง = หนีรอด',
};

export class Chase {
  constructor(scene, c, players, { layer, x = 320, y = 182 }) {
    this.scene = scene;
    this.c = c;
    this.players = players;
    this.role = c.role;
    this.offset = c.serverNow - Date.now();
    this.shown = c.dist;
    this.lastFoot = null;
    this.done = false;
    this.logs = new Map();
    this.helpReadyAt = 0;
    this.nextBeat = 0;
    this.nextWarn = 0;
    ensureChaseTextures(scene);
    this.root = scene.add.container(x, y);
    layer.add(this.root);
    this.build();
    this.bindKeys();
    this.root.setScale(0.85).setAlpha(0);
    scene.tweens.add({ targets: this.root, scale: 1, alpha: 1, duration: 300, ease: 'Back.Out' });
    sfx.growl();
  }

  now() {
    return Date.now() + this.offset;
  }

  add(o) {
    this.root.add(o);
    return o;
  }

  build() {
    const s = this.scene;
    const c = this.c;
    this.add(panel(s, 0, 0, W + 20, H + 60));
    this.add(s.add.image(0, 6, 'scene_' + c.loc).setScale(3));
    this.add(s.add.rectangle(0, 6, W, H, 0x05040c, c.loc === 'forest' ? 0.45 : 0.25));

    // หญ้าและเส้นความเร็ว เลื่อนไปทางซ้ายตอนวิ่ง (ให้รู้สึกว่ากำลังวิ่งอยู่)
    this.tufts = Array.from({ length: 10 }, () =>
      this.add(s.add.image(Phaser.Math.Between(-W / 2, W / 2), GROUND + Phaser.Math.Between(3, 12), 'ch_tuft').setScale(2)));
    this.streaks = Array.from({ length: 7 }, () =>
      this.add(s.add.rectangle(Phaser.Math.Between(-W / 2, W / 2), Phaser.Math.Between(-60, GROUND - 30), Phaser.Math.Between(16, 40), 1, 0xffffff, 0.18)));

    // เขตอันตราย (ถ้าหมดเวลาแล้วอยู่ตรงนี้ = ถูกจับ)
    const zx = xOf(0) - 24;
    const zw = xOf(c.safe) - zx;
    this.zone = this.add(s.add.rectangle(zx, GROUND + 2, zw, 8, 0xe0565e, 0.35).setOrigin(0, 0.5));
    this.add(txt(s, zx + zw / 2, GROUND + 16, 'เขตอันตราย', { size: 9, color: COLORS.red }));
    if (this.role === 'hunter') {
      this.reachLine = this.add(s.add.rectangle(xOf(c.reach), GROUND - 20, 2, 44, 0xff3a3a, 0.5));
    }
    this.add(s.add.image(xOf(100) + 18, GROUND + 4, 'ch_gate').setOrigin(0.5, 1).setScale(2));
    this.add(txt(s, xOf(100) + 18, GROUND + 14, 'หมู่บ้าน', { size: 9, color: COLORS.gold }));

    const victim = this.players.find((p) => p.id === c.victim);
    this.runner = this.add(addCharacter(s, xOf(c.dist), GROUND + 2, victim?.outfit || DEFAULT_OUTFIT, 2));
    this.runner.play(outfitKey(victim?.outfit || DEFAULT_OUTFIT) + '_walk');
    this.runner.anims.timeScale = 2.2;
    if (!victim) this.runner.setTintFill(0x16121f);
    const label = this.role === 'victim' ? 'คุณ' : victim ? victim.name : '???';
    this.runnerName = this.add(txt(s, this.runner.x, GROUND - 70, label, { size: 10, color: this.role === 'victim' ? COLORS.gold : COLORS.text }));

    this.wolf = this.add(s.add.sprite(xOf(0) - 16, GROUND + 3, 'ch_wolf').setOrigin(0.5, 1).setScale(2.2));
    this.wolf.play('ch_wolf_run');
    if (this.role === 'hunter') this.add(txt(s, this.wolf.x, GROUND - 48, 'คุณ', { size: 10, color: COLORS.red }));

    this.dust = s.add.particles(0, 0, 'ch_dust', {
      speedX: { min: -90, max: -30 }, speedY: { min: -30, max: 0 }, lifespan: 380, scale: { start: 2, end: 0 }, emitting: false,
    });
    this.add(this.dust);

    const loc = LOCATIONS[c.loc]?.name || '';
    const title = {
      victim: TITLES.victim,
      hunter: TITLES.hunter,
      helper: (c.pack ? TITLES.helperPack : TITLES.helper)(victim?.name || 'เพื่อน'),
      watch: TITLES.watch(loc),
    }[this.role];
    this.add(txt(s, 0, -H / 2 - 16, title, { size: 15, color: this.role === 'hunter' ? COLORS.red : COLORS.gold, bold: true }));
    this.add(txt(s, 0, H / 2 + 20, c.pack && this.role === 'helper' ? HOWTO.helperPack : HOWTO[this.role], { size: 10, color: COLORS.dim }));
    this.add(s.add.rectangle(-W / 2, -H / 2 + 2, W, 4, 0x15111d).setOrigin(0, 0.5));
    this.timeBar = this.add(s.add.rectangle(-W / 2, -H / 2 + 2, W, 4, 0xe8b84a).setOrigin(0, 0.5));
    this.big = this.add(txt(s, 0, -10, '', { size: 34, color: COLORS.gold, bold: true }));
    this.prompt = this.add(txt(s, 0, -54, '', { size: 18, color: COLORS.gold, bold: true }));

    this.pads = [];
    const padY = H / 2 + 44;
    if (this.role === 'victim' || this.role === 'hunter') {
      this.pads.push(this.pad(-140, 'ซ้าย', () => this.foot('L')));
      this.special = this.pad(0, this.role === 'victim' ? 'กระโดด' : 'ตะครุบ!', () => this.action(), this.role === 'hunter' ? 'btn_red' : 'btn');
      this.pads.push(this.special);
      this.pads.push(this.pad(140, 'ขวา', () => this.foot('R')));
    } else if (this.role === 'helper') {
      this.special = this.pad(0, c.pack ? 'ขวางทาง' : 'ปาหิน', () => this.action(), c.pack ? 'btn_red' : 'btn');
      this.pads.push(this.special);
    }
    this.pads.forEach((p) => (p.y = padY));
  }

  // ปุ่มแตะที่ตอบสนองตอนกดลงทันที (เหมาะกับการกดรัว ๆ และจอมือถือ)
  pad(x, label, fn, tex = 'btn') {
    const s = this.scene;
    const key = tex;
    const c = s.add.container(x, 0);
    const up = s.add.nineslice(0, 0, key, undefined, 120, 30, 5, 5, 5, 6);
    const down = s.add.nineslice(0, 0, key + '_down', undefined, 120, 30, 5, 5, 5, 6).setVisible(false);
    const t = txt(s, 0, -1, label, { size: 14, bold: true });
    c.add([up, down, t]);
    c.setSize(120, 30).setInteractive({ useHandCursor: true });
    c.press = () => {
      up.setVisible(false);
      down.setVisible(true);
      t.y = 1;
      s.time.delayedCall(90, () => {
        up.setVisible(true);
        down.setVisible(false);
        t.y = -1;
      });
    };
    c.on('pointerdown', () => {
      c.press();
      fn();
    });
    c.label = t;
    this.add(c);
    return c;
  }

  bindKeys() {
    this.onKey = (e) => {
      if (e.repeat || this.done) return;
      const k = e.code;
      if (k === 'KeyA' || k === 'ArrowLeft') this.foot('L', true);
      else if (k === 'KeyD' || k === 'ArrowRight') this.foot('R', true);
      else if (k === 'Space' || k === 'KeyW' || k === 'ArrowUp') {
        this.special?.press();
        this.action();
      }
    };
    window.addEventListener('keydown', this.onKey);
  }

  running() {
    const t = this.now();
    return !this.done && t >= this.c.startAt && !this.c.result;
  }

  foot(f, fromKey) {
    if (!this.running() || (this.role !== 'victim' && this.role !== 'hunter')) return;
    if (fromKey) this.pads[f === 'L' ? 0 : 2]?.press();
    if (f === this.lastFoot) {
      if (Date.now() > this.nextWarn) {
        this.nextWarn = Date.now() + 700;
        this.pop('สลับซ้าย-ขวา!', COLORS.dim);
      }
      return;
    }
    this.lastFoot = f;
    if (this.role === 'victim') {
      this.shown += 0.6;
      net.act('chase', 'run');
      this.dust.emitParticleAt(this.runner.x - 6, GROUND);
    } else {
      net.act('chase', 'hunt');
      this.shown -= 0.6;
      this.dust.emitParticleAt(this.wolf.x - 20, GROUND);
    }
    sfx.tick();
  }

  action() {
    if (!this.running()) return;
    const s = this.scene;
    if (this.role === 'victim') {
      if (this.jumping) return;
      net.act('chase', 'jump');
      this.jump();
    } else if (this.role === 'hunter') {
      if (this.c.pounced || this.pounceSent) return;
      this.pounceSent = true;
      net.act('chase', 'pounce');
      sfx.growl();
      s.tweens.add({ targets: this.wolf, y: GROUND - 18, duration: 160, yoyo: true, ease: 'Quad.Out' });
      this.special.setAlpha(0.4);
    } else if (this.role === 'helper') {
      if (Date.now() < this.helpReadyAt) return;
      this.helpReadyAt = Date.now() + 1400;
      net.act('chase', 'help');
      this.special.setAlpha(0.4);
      s.time.delayedCall(1400, () => this.special?.active && this.special.setAlpha(1));
    }
  }

  jump() {
    if (this.jumping) return;
    this.jumping = true;
    sfx.whoosh();
    this.scene.tweens.add({
      targets: this.runner, y: GROUND - 30, duration: 200, yoyo: true, ease: 'Quad.Out',
      onComplete: () => (this.jumping = false),
    });
  }

  restoreRunner() {
    if (!this.runner.active) return;
    if (this.c.victim) this.runner.clearTint();
    else this.runner.setTintFill(0x16121f);
  }

  pop(str, color, x = this.runner.x, y = GROUND - 84) {
    const s = this.scene;
    const t = this.add(txt(s, x, y, str, { size: 13, color, bold: true }));
    s.tweens.add({ targets: t, y: y - 22, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }

  throwStone() {
    const s = this.scene;
    const st = this.add(s.add.image(W / 2 - 20, -60, 'ch_stone').setScale(2));
    s.tweens.add({ targets: st, x: this.wolf.x, duration: 360, ease: 'Linear' });
    s.tweens.add({
      targets: st, y: GROUND - 20, angle: 540, duration: 360, ease: 'Quad.In',
      onComplete: () => {
        st.destroy();
        sfx.thud();
        this.wolf.setTintFill(0xffffff);
        s.time.delayedCall(80, () => this.wolf.active && this.wolf.clearTint());
        this.pop('โป๊ก!', COLORS.green, this.wolf.x, GROUND - 52);
      },
    });
  }

  blockShade() {
    const s = this.scene;
    const sh = this.add(s.add.image(this.runner.x + 50, GROUND + 2, 'ch_shade').setOrigin(0.5, 1).setScale(2).setAlpha(0));
    s.tweens.add({ targets: sh, alpha: 1, x: this.runner.x + 20, duration: 160, yoyo: true, hold: 200, onComplete: () => sh.destroy() });
    this.pop('มีเงาขวางทาง!', COLORS.red);
  }

  // สถานะใหม่จากเซิร์ฟเวอร์
  update(c) {
    if (!c || this.done) return;
    this.c = c;
    this.offset = c.serverNow - Date.now();
    for (const fx of c.fx || []) {
      if (fx === 'stone') this.throwStone();
      else if (fx === 'block') this.blockShade();
      else if (fx === 'jump' && this.role !== 'victim') this.jump();
      else if (fx === 'trip') {
        sfx.thud();
        this.scene.cameras.main.shake(160, 0.006);
        this.runner.setTint(0xff6060);
        this.scene.time.delayedCall(220, () => this.restoreRunner());
        this.pop('สะดุด!', COLORS.red);
      } else if (fx === 'miss') {
        this.pop('ตะครุบพลาด!', COLORS.green, this.wolf.x + 30, GROUND - 52);
        sfx.whoosh();
      }
    }
    if (c.result) this.showResult(c);
  }

  tick(dt) {
    if (!this.root.active) return;
    const c = this.c;
    const t = this.now();
    const run = this.running();
    if (!this.done) {
      if (t < c.startAt) {
        const n = Math.ceil((c.startAt - t) / 1000);
        if (this.big.text !== String(n)) {
          this.big.setText(String(n)).setScale(1.5);
          this.scene.tweens.add({ targets: this.big, scale: 1, duration: 250 });
          sfx.tick();
        }
      } else if (this.big.text && this.big.text !== 'วิ่ง!' && !this.goShown) {
        this.goShown = true;
        this.big.setText(this.role === 'hunter' ? 'ไล่!' : 'วิ่ง!');
        sfx.go();
        this.scene.tweens.add({ targets: this.big, alpha: 0, scale: 1.4, duration: 500, onComplete: () => this.big.setText('').setAlpha(1).setScale(1) });
      }
      this.timeBar.width = W * Phaser.Math.Clamp((c.runEnd - t) / (c.runEnd - c.startAt), 0, 1);
    }
    this.shown = Phaser.Math.Clamp(this.shown + (c.dist - this.shown) * Math.min(1, dt / 90), 0, 100);
    if (!this.done) {
      this.runner.x = xOf(this.shown);
      this.wolf.x = xOf(0) - 16 + Math.sin(t / 90) * 2;
    }
    this.runnerName.x = this.runner.x;
    this.runnerName.y = this.runner.y - 64;
    const danger = this.shown < c.safe;
    this.zone.fillAlpha = danger ? 0.45 + Math.sin(t / 80) * 0.15 : 0.3;
    if (run && danger && this.role === 'victim' && Date.now() > this.nextBeat) {
      this.nextBeat = Date.now() + 520;
      sfx.heartbeat();
    }
    if (this.role === 'hunter' && this.special && !c.pounced && !this.pounceSent) {
      const can = this.shown <= c.reach;
      this.special.label.setColor(can ? COLORS.gold : COLORS.text);
      this.special.setScale(can ? 1 + Math.sin(t / 70) * 0.05 : 1);
      if (this.reachLine) this.reachLine.fillAlpha = can ? 0.9 : 0.4;
    }
    if (c.stunned && run) this.wolf.alpha = 0.6 + Math.sin(t / 40) * 0.3;
    else this.wolf.alpha = 1;

    // ฉากเลื่อน
    if (run) {
      const move = dt * 0.25;
      for (const g of this.tufts) {
        g.x -= move;
        if (g.x < -W / 2 + 4) g.x += W - 8;
      }
      for (const r of this.streaks) {
        r.x -= move * 2.4;
        if (r.x < -W / 2 + r.width / 2) r.x += W - r.width;
      }
    }

    // ท่อนไม้ขวางทาง
    let warn = '';
    for (const [i, o] of c.obstacles.entries()) {
      let log = this.logs.get(i);
      const ahead = (o.at - t) * LOG_SPEED * (c.speed || 1);
      const x = this.runner.x + ahead;
      if (!log) {
        log = this.add(this.scene.add.image(x, GROUND + 1, 'mg_log').setOrigin(0.5, 1).setScale(1.6));
        this.logs.set(i, log);
      }
      log.x = x;
      log.setVisible(x > -W / 2 + 10 && x < W / 2 - 10);
      if (o.done && !o.cleared && !log.broken) {
        log.broken = true;
        log.setAngle(25).setTint(0x8a6a5a);
      }
      if (!o.done && ahead > 0 && ahead < 70) warn = 'กระโดด!';
    }
    if (this.role === 'victim' && !this.done) {
      this.prompt.setText(warn);
      if (warn) this.prompt.setScale(1 + Math.sin(t / 50) * 0.08);
    }
  }

  showResult(c) {
    if (this.done) return;
    this.done = true;
    this.prompt.setText('');
    this.big.setText('').setAlpha(1).setScale(1);
    this.pads.forEach((p) => p.disableInteractive().setAlpha(0.35));
    const s = this.scene;
    const victim = this.players.find((p) => p.id === c.victim);
    const name = victim?.name;
    let text;
    let color;
    if (c.result === 'caught') {
      text = { victim: 'ถูกจับได้!', hunter: 'จับได้แล้ว!' }[this.role] || (name ? `${name} ถูกจับได้!` : 'มีคนถูกจับได้!');
      color = this.role === 'hunter' ? COLORS.gold : COLORS.red;
      s.tweens.add({ targets: this.wolf, x: this.runner.x - 10, y: GROUND - 14, duration: 220, ease: 'Quad.Out' });
      s.time.delayedCall(220, () => {
        sfx.slash();
        s.cameras.main.flash(220, 200, 20, 20);
        s.cameras.main.shake(300, 0.012);
        this.runner.anims.stop();
        this.runner.setTint(0xff5050);
        s.tweens.add({ targets: this.runner, angle: -80, duration: 300 });
      });
    } else {
      text = { victim: 'หนีรอด!', hunter: 'เหยื่อหนีไปได้...' }[this.role] || (name ? `${name} หนีรอด!` : 'มีคนหนีรอดไปได้!');
      color = this.role === 'hunter' ? COLORS.red : COLORS.green;
      s.tweens.add({ targets: [this.runner, this.runnerName], x: W / 2 - 10, alpha: 0, duration: 700, ease: 'Quad.In' });
      this.wolf.anims.stop();
      s.tweens.add({ targets: this.wolf, alpha: 0, x: this.wolf.x - 30, duration: 700 });
      (this.role === 'hunter' ? sfx.lose : sfx.win)();
    }
    this.big.setText(text).setColor(color).setScale(0);
    s.tweens.add({ targets: this.big, scale: 1, duration: 300, ease: 'Back.Out' });
  }

  destroy() {
    this.done = true;
    window.removeEventListener('keydown', this.onKey);
  }
}
