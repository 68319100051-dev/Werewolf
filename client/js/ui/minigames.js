// มินิเกมตอนทำเควส: ผ่าฟืน / ตักน้ำ / เก็บเกี่ยว / ตีระฆัง / รับเหยือก
// แต่ละเกมยาวประมาณ 12 วินาที คืนคะแนน 0..1 (ยิ่งเก่งยิ่งได้แต้มเควสมาก)
import { canvas, rect, dot, rows, outline, addTexture } from '../art/pixel.js';
import { sfx } from '../sfx.js';
import { txt, panel, COLORS } from './widgets.js';

const LINE = '#120e18';
export const PW = 420; // ขนาดพื้นที่เล่น
export const PH = 210;

export function tex(scene, key, w, h, draw, line = true) {
  if (scene.textures.exists(key)) return;
  const { c, ctx } = canvas(w, h);
  draw(ctx);
  if (line) outline(ctx, w, h, LINE);
  addTexture(scene, key, c);
}

export function ensureTextures(scene) {
  tex(scene, 'mg_log', 30, 16, (ctx) => {
    rect(ctx, 1, 2, 24, 12, '#7a4e2a');
    rect(ctx, 1, 2, 24, 2, '#a3733f');
    rect(ctx, 1, 5, 24, 1, '#8a5a32');
    rect(ctx, 1, 9, 24, 1, '#6a4224');
    rect(ctx, 1, 12, 24, 2, '#4a2e18');
    for (let x = 3; x < 24; x += 5) dot(ctx, x, 7, '#5a3a20');
    // หน้าตัดวงปี
    rect(ctx, 24, 2, 5, 12, '#e8c888');
    rect(ctx, 25, 4, 3, 8, '#c8a060');
    rect(ctx, 26, 6, 1, 4, '#a07a40');
    dot(ctx, 24, 2, '#a3733f');
  });
  tex(scene, 'mg_stump', 44, 22, (ctx) => {
    rect(ctx, 3, 5, 38, 15, '#6a4426');
    rect(ctx, 3, 5, 4, 15, '#8a5a32');
    rect(ctx, 34, 5, 7, 15, '#4a2e18');
    for (let x = 9; x < 34; x += 6) rect(ctx, x, 8, 1, 10, '#5a3a20');
    rect(ctx, 3, 2, 38, 5, '#e0c080');
    rect(ctx, 8, 3, 28, 3, '#c8a060');
    rect(ctx, 14, 4, 16, 1, '#a07a40');
    rect(ctx, 0, 19, 44, 3, '#3a2414');
    rect(ctx, 0, 18, 6, 2, '#4a2e18');
    rect(ctx, 38, 18, 6, 2, '#4a2e18');
    dot(ctx, 5, 12, '#5a8a4a');
    dot(ctx, 6, 11, '#5a8a4a');
  });
  tex(scene, 'mg_axe', 26, 32, (ctx) => {
    rect(ctx, 11, 6, 3, 26, '#8a5a32');
    rect(ctx, 11, 6, 1, 26, '#b07a45');
    rect(ctx, 13, 6, 1, 26, '#5a3a22');
    rect(ctx, 11, 26, 3, 2, '#3a2418');
    rect(ctx, 1, 1, 13, 11, '#9a9aac');
    rect(ctx, 1, 1, 3, 11, '#e8e8f2');
    rect(ctx, 4, 1, 2, 11, '#c8c8d4');
    rect(ctx, 1, 11, 13, 1, '#6a6a78');
    rect(ctx, 14, 3, 4, 6, '#6a6a78');
    dot(ctx, 2, 2, '#ffffff');
  });
  tex(scene, 'mg_wellbody', 44, 58, (ctx) => {
    // เสาและหลังคา
    rect(ctx, 4, 2, 3, 22, '#5a3a22');
    rect(ctx, 37, 2, 3, 22, '#5a3a22');
    rect(ctx, 4, 2, 1, 22, '#8a5a32');
    rect(ctx, 1, 0, 42, 4, '#8a3b2e');
    rect(ctx, 1, 0, 42, 1, '#b85a48');
    rect(ctx, 6, 5, 32, 3, '#6b4226');
    rect(ctx, 6, 5, 32, 1, '#8a5a32');
    // ปล่องด้านใน
    rect(ctx, 8, 22, 28, 34, '#121a2a');
    for (let y = 24; y < 50; y += 3) rect(ctx, 8, y, 28, 1, '#18223a');
    rect(ctx, 8, 49, 28, 7, '#2a5a90');
    rect(ctx, 8, 49, 28, 1, '#6aa0e0');
    // ผนังหินสองข้าง
    [[1, 7], [36, 7]].forEach(([x, w]) => {
      rect(ctx, x, 20, w, 38, '#7a7a88');
      for (let y = 20; y < 58; y += 4) {
        rect(ctx, x, y, w, 1, '#5a5a68');
        rect(ctx, x + ((y / 4) % 2 ? 3 : 1), y + 1, 1, 3, '#5a5a68');
      }
      rect(ctx, x, 20, w, 1, '#a8a8b8');
    });
    rect(ctx, 1, 20, 42, 2, '#9a9aa8');
    dot(ctx, 3, 30, '#5a8a4a');
    dot(ctx, 40, 44, '#5a8a4a');
  });
  tex(scene, 'mg_crank', 10, 10, (ctx) => {
    rect(ctx, 4, 0, 2, 10, '#3a2c24');
    rect(ctx, 0, 4, 10, 2, '#3a2c24');
    rect(ctx, 3, 3, 4, 4, '#6b4226');
  });
  tex(scene, 'mg_tub', 30, 16, (ctx) => {
    rect(ctx, 1, 2, 28, 14, '#7a5230');
    for (let x = 4; x < 28; x += 5) rect(ctx, x, 3, 1, 13, '#5a3a22');
    rect(ctx, 1, 5, 28, 1, '#4a4a58');
    rect(ctx, 1, 12, 28, 1, '#4a4a58');
    rect(ctx, 0, 0, 30, 3, '#a3733f');
    rect(ctx, 3, 1, 24, 1, '#2a1c18');
  });
  tex(scene, 'mg_chip', 4, 3, (ctx) => rect(ctx, 0, 0, 4, 3, '#d8b070'), false);
  tex(scene, 'mg_bucket', 20, 18, (ctx) => {
    rect(ctx, 3, 5, 14, 12, '#8a5a32');
    rect(ctx, 3, 8, 14, 2, '#5a5a68');
    rect(ctx, 3, 13, 14, 2, '#5a5a68');
    rect(ctx, 4, 5, 12, 3, '#5a8ad0');
    rect(ctx, 2, 0, 1, 6, '#3a2c24');
    rect(ctx, 17, 0, 1, 6, '#3a2c24');
    rect(ctx, 2, 0, 16, 1, '#3a2c24');
  });
  tex(scene, 'mg_drop', 3, 4, (ctx) => {
    rect(ctx, 1, 0, 1, 1, '#a8d0ff');
    rect(ctx, 0, 1, 3, 3, '#5a8ad0');
  }, false);
  const wheat = (key, stalk, head, dark) =>
    tex(scene, key, 18, 30, (ctx) => {
      [3, 8, 13].forEach((x, i) => {
        rect(ctx, x + 1, 10 + i, 1, 20 - i, stalk);
        rect(ctx, x, 2 + i * 2, 3, 9, head);
        rect(ctx, x + 2, 4 + i * 2, 1, 6, dark);
      });
    });
  wheat('mg_wheat_green', '#3a7a3a', '#5aa050', '#3a7a3a');
  wheat('mg_wheat_gold', '#a07a2a', '#f0cc50', '#c09a30');
  wheat('mg_wheat_dead', '#5a4a2a', '#7a6a4a', '#5a4a2a');
  tex(scene, 'mg_soil', 26, 8, (ctx) => {
    rect(ctx, 0, 0, 26, 8, '#5a3a22');
    rect(ctx, 0, 0, 26, 2, '#7a5230');
    dot(ctx, 5, 4, '#3a2418');
    dot(ctx, 15, 5, '#3a2418');
  });
  tex(scene, 'mg_bell_old', 22, 24, (ctx) => {
    rows(ctx, [
      '.........ww.........',
      '........wwww........',
      '.......xxxxxx.......',
      '......xxxxxxxx......',
      '.....xxxxxxxxxx.....',
      '.....xxxxxxxxxx.....',
      '....xxxxxxxxxxxx....',
      '....xxxxxxxxxxxx....',
      '....xxxxxxxxxxxx....',
      '...xxxxxxxxxxxxxx...',
      '...xxxxxxxxxxxxxx...',
      '..xxxxxxxxxxxxxxxx..',
      '.xxxxxxxxxxxxxxxxxx.',
      'xxxxxxxxxxxxxxxxxxxx',
      '.........ww.........',
      '........wwww........',
    ], { x: '#ffffff', w: '#c8c8d0' }, 1, 4);
    rect(ctx, 8, 7, 2, 9, 'rgba(255,255,255,0.0)');
  });
  tex(scene, 'mg_bell', 22, 22, (ctx) => {
    const widths = [2, 4, 6, 8, 10, 10, 12, 12, 12, 14, 14, 16, 18, 20];
    widths.forEach((w, i) => {
      const x0 = 11 - w / 2;
      for (let k = 0; k < w; k++) {
        const t = k / w;
        const col = t < 0.2 ? '#ffffff' : t < 0.55 ? '#d8d8d8' : t < 0.8 ? '#a8a8a8' : '#787878';
        dot(ctx, x0 + k, 2 + i, col);
      }
    });
    rect(ctx, 1, 15, 20, 2, '#909090');
    rect(ctx, 1, 15, 20, 1, '#e8e8e8');
    rect(ctx, 9, 0, 4, 2, '#606060');
    rect(ctx, 10, 17, 2, 3, '#505050');
    rect(ctx, 9, 20, 4, 2, '#606060');
  });
  tex(scene, 'mg_mug', 14, 16, (ctx) => {
    rect(ctx, 1, 4, 10, 12, '#c8a060');
    rect(ctx, 1, 4, 10, 2, '#e8c880');
    rect(ctx, 11, 7, 3, 2, '#c8a060');
    rect(ctx, 12, 7, 2, 6, '#c8a060');
    rect(ctx, 11, 11, 3, 2, '#c8a060');
    rect(ctx, 0, 0, 12, 5, '#ffffff');
    rect(ctx, 2, 0, 3, 2, '#f0f0f0');
    rect(ctx, 3, 8, 1, 6, '#a07a40');
    rect(ctx, 7, 8, 1, 6, '#a07a40');
  });
  tex(scene, 'mg_bottle', 8, 16, (ctx) => {
    rect(ctx, 3, 0, 2, 5, '#3a6a3a');
    rect(ctx, 1, 5, 6, 11, '#3a6a3a');
    rect(ctx, 2, 6, 1, 8, '#6aa06a');
    rect(ctx, 1, 9, 6, 3, '#d0434a');
  });
  tex(scene, 'mg_tray', 48, 8, (ctx) => {
    // ถาดดีบุกเงา ให้ตัดกับเคาน์เตอร์ไม้
    rect(ctx, 0, 2, 48, 6, '#9a9aaa');
    rect(ctx, 2, 2, 44, 2, '#e0e0ea');
    rect(ctx, 0, 6, 48, 2, '#6a6a78');
    rect(ctx, 6, 3, 10, 1, '#ffffff');
    rect(ctx, 0, 0, 3, 4, '#7a7a88');
    rect(ctx, 45, 0, 3, 4, '#7a7a88');
  });
  tex(scene, 'mg_star', 11, 10, (ctx) => {
    rows(ctx, ['.....y.....', '....yyy....', 'yyyyyyyyyyy', '.yyyyyyyyy.', '..yyyyyyy..', '..yyyyyyy..', '.yyy...yyy.', 'yy.......yy'], { y: '#ffd84a' });
  });
  tex(scene, 'mg_star_off', 11, 10, (ctx) => {
    rows(ctx, ['.....y.....', '....yyy....', 'yyyyyyyyyyy', '.yyyyyyyyy.', '..yyyyyyy..', '..yyyyyyy..', '.yyy...yyy.', 'yy.......yy'], { y: '#4a4458' });
  });
}

export class MiniGame {
  constructor(scene, root, { duration = 12000, onDone }) {
    this.scene = scene;
    this.root = root; // container กลางจอ (0,0 คือกึ่งกลางพื้นที่เล่น)
    this.duration = duration;
    this.onDone = onDone;
    this.elapsed = 0;
    this.running = false;
    this.finished = false;
    this.objs = [];
  }

  add(o) {
    this.root.add(o);
    return o;
  }

  setScoreText(s) {
    this.scoreText?.setText(s);
  }

  // ใส่กรอบ ชื่อเกม วิธีเล่น หลอดเวลา แล้วนับถอยหลังก่อนเริ่ม
  frame(title, howto, loc) {
    const s = this.scene;
    this.add(panel(s, 0, 0, PW + 20, PH + 64));
    this.bg = this.add(s.add.image(0, 8, 'scene_' + loc).setScale(3));
    // ขอบมืดรอบภาพ ให้สายตาโฟกัสตรงกลาง
    this.add(s.add.rectangle(0, 8 - PH / 2 + 3, PW, 6, 0x000000, 0.25));
    this.add(s.add.rectangle(0, 8 + PH / 2 - 3, PW, 6, 0x000000, 0.25));
    this.add(txt(s, 0, -PH / 2 - 14, title, { size: 15, color: COLORS.gold }));
    this.howto = this.add(txt(s, 0, PH / 2 + 22, howto, { size: 11, color: COLORS.dim }));
    this.scoreText = this.add(txt(s, PW / 2 - 6, -PH / 2 - 14, '', { size: 13, origin: [1, 0.5] }));
    this.add(s.add.rectangle(-PW / 2, PH / 2 + 10, PW, 4, 0x15111d).setOrigin(0, 0.5));
    this.timeBar = this.add(s.add.rectangle(-PW / 2, PH / 2 + 10, PW, 4, 0xe8b84a).setOrigin(0, 0.5));
    // พื้นที่รับการคลิก/แตะ
    this.hit = this.add(s.add.zone(0, 8, PW, PH).setInteractive({ useHandCursor: true }));
  }

  countdown() {
    const s = this.scene;
    const t = this.add(txt(s, 0, 8, 'พร้อม...', { size: 30, color: COLORS.gold, bold: true }));
    t.setScale(0);
    s.tweens.add({ targets: t, scale: 1, duration: 250, ease: 'Back.Out' });
    s.time.delayedCall(800, () => {
      if (this.finished) return;
      t.setText('เริ่ม!');
      sfx.go();
      t.setScale(1.4);
      s.tweens.add({ targets: t, scale: 1, alpha: 0, duration: 450, onComplete: () => t.destroy() });
      this.running = true;
      this.begin();
    });
  }

  begin() {}
  tick() {}

  // ข้อความลอยขึ้นแล้วจางหาย เช่น "เยี่ยม!" "พลาด!"
  popText(str, color, x = Phaser.Math.Between(-60, 60), y = -20) {
    const s = this.scene;
    const t = this.add(txt(s, x, y, str, { size: 16, color, bold: true }));
    s.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 600, onComplete: () => t.destroy() });
  }

  update(dt) {
    if (!this.running || this.finished) return;
    this.elapsed += dt;
    this.timeBar.width = PW * Math.max(0, 1 - this.elapsed / this.duration);
    this.tick(dt);
    if (this.elapsed >= this.duration) this.finish();
  }

  score() {
    return 0;
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.running = false;
    this.hit.disableInteractive();
    const s = this.scene;
    const score = Math.max(0, Math.min(1, this.score()));
    const stars = score >= 0.85 ? 3 : score >= 0.5 ? 2 : score >= 0.2 ? 1 : 0;
    const shade = this.add(s.add.rectangle(0, 8, PW, PH, 0x0b0a1a, 0.7));
    shade.alpha = 0;
    s.tweens.add({ targets: shade, alpha: 1, duration: 250 });
    const word = ['ไม่เป็นไรนะ...', 'พอใช้ได้', 'เก่งมาก!', 'สุดยอด!'][stars];
    const w = this.add(txt(s, 0, -20, word, { size: 22, color: COLORS.gold, bold: true }));
    w.setScale(0);
    s.tweens.add({ targets: w, scale: 1, duration: 300, ease: 'Back.Out' });
    for (let i = 0; i < 3; i++) {
      const st = this.add(s.add.image((i - 1) * 34, 22, i < stars ? 'mg_star' : 'mg_star_off').setScale(2.6));
      st.setScale(0);
      s.tweens.add({
        targets: st, scale: 2.6, duration: 260, delay: 250 + i * 180, ease: 'Back.Out',
        onStart: () => i < stars && sfx.pop(),
      });
    }
    (stars >= 2 ? sfx.win : sfx.success)();
    this.onDone?.(score);
  }

  destroy() {
    this.finished = true;
    this.running = false;
  }
}

// ---------- ป่าลึก: ผ่าฟืน ----------
class Chop extends MiniGame {
  build() {
    const s = this.scene;
    this.frame('ผ่าฟืนในป่าลึก', 'คลิกตอนเข็มอยู่ในโซนสีเขียว!', 'forest');
    this.add(s.add.image(0, 70, 'mg_stump').setScale(3));
    this.log = this.add(s.add.image(0, 38, 'mg_log').setScale(3).setAngle(90));
    this.axe = this.add(s.add.image(70, 10, 'mg_axe').setScale(3).setOrigin(0.5, 0.9).setAngle(30));
    this.barX = -150;
    this.barW = 300;
    this.add(s.add.nineslice(0, -70, 'slot', undefined, this.barW + 10, 26, 4, 4, 4, 4));
    this.add(s.add.rectangle(0, -70, this.barW, 16, 0x5a2a2a));
    this.zone = this.add(s.add.rectangle(0, -70, 70, 16, 0x5aa050));
    this.zoneHot = this.add(s.add.rectangle(0, -70, 18, 16, 0x9ae070));
    this.needle = this.add(s.add.rectangle(this.barX, -70, 4, 26, 0xffffff));
    this.chips = s.add.particles(0, 0, 'mg_chip', {
      speed: { min: 60, max: 180 }, angle: { min: 200, max: 340 }, gravityY: 300,
      lifespan: 700, scale: 2.5, rotate: { min: 0, max: 360 }, emitting: false,
    });
    this.add(this.chips);
    this.t = 0;
    this.speed = 1.6;
    this.hits = 0;
    this.points = 0;
    this.target = 6;
    this.placeZone();
    this.hit.on('pointerdown', () => this.swing());
    this.setScoreText(`ฟืน 0/${this.target}`);
    this.countdown();
  }

  placeZone() {
    const w = Math.max(28, 80 - this.hits * 9);
    this.zone.width = w;
    this.zone.x = Phaser.Math.Between(this.barX + w / 2 + 10, this.barX + this.barW - w / 2 - 10);
    this.zoneHot.x = this.zone.x;
    this.zone.setOrigin(0.5);
  }

  tick(dt) {
    this.t += (dt / 1000) * this.speed;
    const p = (Math.sin(this.t * Math.PI) + 1) / 2;
    this.needle.x = this.barX + p * this.barW;
  }

  swing() {
    if (!this.running) return;
    const s = this.scene;
    s.tweens.killTweensOf(this.axe);
    this.axe.setAngle(30);
    s.tweens.add({ targets: this.axe, angle: -70, x: 30, duration: 80, yoyo: true, ease: 'Quad.In' });
    const d = Math.abs(this.needle.x - this.zone.x);
    if (d <= this.zone.width / 2) {
      const perfect = d <= 9;
      this.hits++;
      this.points += perfect ? 1.15 : 1;
      sfx.chop();
      this.chips.explode(perfect ? 18 : 10, 0, 30);
      const half = (dir) => {
        const h = this.add(s.add.image(0, 38, 'mg_log').setScale(3, 1.5).setAngle(90));
        s.tweens.add({ targets: h, x: dir * 110, y: 70, angle: 90 + dir * 120, alpha: 0, duration: 500, onComplete: () => h.destroy() });
      };
      half(-1);
      half(1);
      this.log.setScale(0);
      s.tweens.add({ targets: this.log, scale: 3, duration: 200, delay: 150 });
      if (perfect) this.popText('เยี่ยม!', COLORS.gold);
      this.speed += 0.22;
      this.placeZone();
      this.setScoreText(`ฟืน ${this.hits}/${this.target}`);
      if (this.hits >= this.target) this.finish();
    } else {
      sfx.thud();
      this.popText('พลาด!', COLORS.red);
      s.cameras.main.shake(80, 0.004);
    }
  }

  score() {
    return this.points / this.target;
  }
}

// ---------- บ่อน้ำ: ตักน้ำ ----------
class Well extends MiniGame {
  build() {
    const s = this.scene;
    this.frame('ตักน้ำที่บ่อ', 'คลิกรัว ๆ ดึงถังขึ้นมา! ถ้าหยุดถังจะไหลลง', 'well');
    // ตัวบ่อแบบผ่าครึ่ง เห็นปล่องและน้ำข้างใน
    this.add(s.add.image(-60, 8, 'mg_wellbody').setScale(3));
    this.crank = this.add(s.add.image(-60 + 20 * 3, 8 - 29 * 3 + 9 * 3, 'mg_crank').setScale(3));
    this.rope = this.add(s.add.rectangle(-61, -49, 2, 10, 0xd8c8a0).setOrigin(0.5, 0));
    this.bucket = this.add(s.add.image(-61, 0, 'mg_bucket').setScale(2.4).setOrigin(0.5, 0));
    // ถังรองน้ำด้านขวา
    this.add(s.add.image(120, 80, 'mg_tub').setScale(3));
    this.tubWater = this.add(s.add.rectangle(120, 91, 78, 0, 0x5a8ad0).setOrigin(0.5, 1));
    this.drops = s.add.particles(0, 0, 'mg_drop', { speed: { min: 40, max: 120 }, angle: { min: 200, max: 340 }, gravityY: 400, lifespan: 600, scale: 2, emitting: false });
    this.add(this.drops);
    this.depth = 1; // 1 = ก้นบ่อ, 0 = ปากบ่อ
    this.buckets = 0;
    this.target = 3;
    this.carrying = false;
    this.hit.on('pointerdown', () => this.pull());
    this.setScoreText(`น้ำ 0/${this.target} ถัง`);
    this.layout();
    this.countdown();
  }

  layout() {
    const y = -40 + this.depth * 82;
    this.bucket.y = y;
    this.rope.height = y + 49;
  }

  pull() {
    if (!this.running || this.carrying) return;
    this.depth = Math.max(0, this.depth - 0.075);
    sfx.pull();
    this.crank.angle += 40;
    if (this.depth <= 0) this.deliver();
    this.layout();
  }

  deliver() {
    const s = this.scene;
    this.carrying = true;
    this.buckets++;
    sfx.splash();
    this.drops.explode(20, 80, 60);
    s.tweens.add({ targets: this.tubWater, height: Math.min(44, this.buckets * 15), duration: 300 });
    this.setScoreText(`น้ำ ${this.buckets}/${this.target} ถัง`);
    if (this.buckets >= this.target) return this.finish();
    s.time.delayedCall(350, () => {
      this.depth = 1;
      this.carrying = false;
      this.layout();
    });
  }

  tick(dt) {
    if (this.carrying) return;
    this.depth = Math.min(1, this.depth + (dt / 1000) * 0.22);
    this.layout();
  }

  score() {
    return (this.buckets + (this.carrying ? 0 : (1 - this.depth) * 0.6)) / this.target;
  }
}

// ---------- ทุ่งนา: เก็บเกี่ยว ----------
class Farm extends MiniGame {
  build() {
    const s = this.scene;
    this.frame('เก็บเกี่ยวที่ทุ่งนา', 'คลิกรวงข้าวสีทองก่อนมันจะเหี่ยว!', 'farm');
    this.plots = [];
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 5; c++) {
        const x = -160 + c * 80;
        const y = -10 + r * 74;
        this.add(s.add.image(x, y + 28, 'mg_soil').setScale(2.2));
        const w = this.add(s.add.image(x, y + 26, 'mg_wheat_green').setScale(2.2).setOrigin(0.5, 1));
        const plot = { x, y, w, state: 'green', timer: 0 };
        w.setInteractive({ useHandCursor: true, pixelPerfect: false });
        w.on('pointerdown', () => this.click(plot));
        this.plots.push(plot);
      }
    }
    this.spark = s.add.particles(0, 0, 'spark', { speed: { min: 40, max: 120 }, lifespan: 400, scale: { start: 1.2, end: 0 }, emitting: false, blendMode: 'ADD' });
    this.add(this.spark);
    this.harvested = 0;
    this.target = 8;
    this.spawnIn = 400;
    this.setScoreText(`ข้าว 0/${this.target}`);
    this.countdown();
  }

  setState(p, state) {
    p.state = state;
    p.timer = { gold: 1500 - Math.min(600, this.harvested * 60), dead: 700 }[state] || 0;
    p.w.setTexture('mg_wheat_' + state);
    p.mark?.destroy();
    p.mark = null;
    if (state === 'gold') {
      // ประกายเหนือรวงที่สุก ให้เห็นชัดบนทุ่งสีทอง
      p.mark = this.add(this.scene.add.image(p.x, p.y - 42, 'spark').setScale(2).setBlendMode('ADD'));
      this.scene.tweens.add({ targets: p.mark, scale: 3, alpha: 0.5, angle: 90, duration: 300, yoyo: true, repeat: -1 });
      p.w.setTint(0xfff0a0);
    } else {
      p.w.clearTint();
    }
    if (state === 'gold') {
      p.w.setScale(2.2, 0.4);
      this.scene.tweens.add({ targets: p.w, scaleY: 2.2, duration: 160, ease: 'Back.Out' });
    }
  }

  tick(dt) {
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      const free = this.plots.filter((p) => p.state === 'green');
      if (free.length) this.setState(Phaser.Utils.Array.GetRandom(free), 'gold');
      this.spawnIn = 520 - Math.min(250, this.harvested * 25);
    }
    for (const p of this.plots) {
      if (p.state === 'green') continue;
      p.timer -= dt;
      if (p.timer <= 0) this.setState(p, p.state === 'gold' ? 'dead' : 'green');
    }
  }

  click(p) {
    if (!this.running || p.state !== 'gold') {
      if (this.running && p.state === 'green') sfx.thud();
      return;
    }
    this.harvested++;
    sfx.pop();
    this.spark.explode(10, p.x, p.y + 10);
    this.setState(p, 'green');
    p.w.setScale(2.2, 0.2);
    this.scene.tweens.add({ targets: p.w, scaleY: 2.2, duration: 400, delay: 200 });
    this.setScoreText(`ข้าว ${this.harvested}/${this.target}`);
    if (this.harvested >= this.target) this.finish();
  }

  score() {
    return this.harvested / this.target;
  }
}

// ---------- โบสถ์: ตีระฆังตามลำดับ ----------
const BELL_COLORS = [0xe8b84a, 0xc8c8d8, 0xd0434a, 0x5a8ad0];
const BELL_NOTES = [523, 659, 784, 1046];

class Church extends MiniGame {
  build() {
    const s = this.scene;
    this.frame('ตีระฆังที่โบสถ์', 'จำลำดับเสียงระฆัง แล้วกดตามให้ถูก', 'church');
    this.bells = BELL_COLORS.map((col, i) => {
      const x = -150 + i * 100;
      this.add(s.add.rectangle(x, -74, 3, 24, 0xc8a878).setOrigin(0.5, 0));
      const b = this.add(s.add.image(x, -52, 'mg_bell').setScale(3).setTint(col).setOrigin(0.5, 0.05));
      b.setInteractive({ useHandCursor: true });
      b.on('pointerdown', () => this.press(i));
      return b;
    });
    this.status = this.add(txt(s, 0, 72, '', { size: 14 }));
    this.round = 0;
    this.rounds = [3, 4, 5];
    this.done = 0;
    this.partial = 0;
    this.listening = false;
    this.setScoreText('รอบ 1/3');
    this.countdown();
  }

  begin() {
    this.nextRound();
  }

  nextRound() {
    if (this.round >= this.rounds.length) return this.finish();
    this.seq = Array.from({ length: this.rounds[this.round] }, () => Phaser.Math.Between(0, 3));
    this.input = [];
    this.listening = false;
    this.status.setText('ฟังให้ดี...').setColor(COLORS.text);
    this.setScoreText(`รอบ ${this.round + 1}/3`);
    this.seq.forEach((b, i) => this.scene.time.delayedCall(500 + i * 480, () => !this.finished && this.ring(b)));
    this.scene.time.delayedCall(500 + this.seq.length * 480, () => {
      if (this.finished) return;
      this.listening = true;
      this.status.setText('ถึงตาคุณแล้ว!').setColor(COLORS.gold);
    });
  }

  ring(i) {
    const b = this.bells[i];
    sfx.bellNote(BELL_NOTES[i]);
    this.scene.tweens.killTweensOf(b);
    b.setAngle(0);
    this.scene.tweens.add({ targets: b, angle: 22, duration: 90, yoyo: true, repeat: 1, ease: 'Sine.InOut' });
    const ring = this.add(this.scene.add.circle(b.x, b.y + 30, 16, BELL_COLORS[i], 0.5));
    this.scene.tweens.add({ targets: ring, scale: 2.5, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
  }

  press(i) {
    if (!this.running || !this.listening) return;
    this.ring(i);
    const k = this.input.length;
    this.input.push(i);
    if (this.seq[k] !== i) {
      this.listening = false;
      sfx.error();
      this.partial += k / this.seq.length / 3;
      this.status.setText('ผิดลำดับ!').setColor(COLORS.red);
      this.round++;
      this.scene.time.delayedCall(700, () => !this.finished && this.nextRound());
      return;
    }
    if (this.input.length === this.seq.length) {
      this.listening = false;
      this.done++;
      sfx.success();
      this.status.setText('ถูกต้อง!').setColor(COLORS.green);
      this.round++;
      this.scene.time.delayedCall(700, () => !this.finished && this.nextRound());
    }
  }

  score() {
    return this.done / this.rounds.length + this.partial;
  }
}

// ---------- โรงเตี๊ยม: รับเหยือก ----------
class Tavern extends MiniGame {
  build() {
    const s = this.scene;
    this.frame('เสิร์ฟเบียร์ที่โรงเตี๊ยม', 'เลื่อนเมาส์รับเหยือกเบียร์ อย่ารับขวดเสีย!', 'tavern');
    this.tray = this.add(s.add.image(0, 86, 'mg_tray').setScale(2));
    this.items = [];
    this.caught = 0;
    this.missed = 0;
    this.target = 10;
    this.spawnIn = 300;
    this.hit.on('pointermove', (p) => this.follow(p));
    this.hit.on('pointerdown', (p) => this.follow(p));
    this.setScoreText(`รับได้ 0`);
    this.countdown();
  }

  follow(pointer) {
    const lx = pointer.x - this.root.x;
    this.tray.x = Phaser.Math.Clamp(lx, -PW / 2 + 48, PW / 2 - 48);
  }

  tick(dt) {
    const s = this.scene;
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      const bad = Math.random() < 0.22;
      const it = this.add(s.add.image(Phaser.Math.Between(-PW / 2 + 30, PW / 2 - 30), -PH / 2 + 10, bad ? 'mg_bottle' : 'mg_mug').setScale(2));
      it.bad = bad;
      it.vy = 90 + this.elapsed / 60;
      this.items.push(it);
      this.spawnIn = Math.max(380, 820 - this.elapsed / 20);
    }
    for (const it of [...this.items]) {
      it.y += (it.vy * dt) / 1000;
      it.angle += dt * 0.05;
      if (it.y >= 76 && it.y <= 92 && Math.abs(it.x - this.tray.x) < 52) {
        this.remove(it);
        if (it.bad) {
          this.caught = Math.max(0, this.caught - 1);
          sfx.crash();
          s.cameras.main.shake(100, 0.005);
          this.tray.setTint(0xff6060);
          s.time.delayedCall(200, () => this.tray.clearTint());
        } else {
          this.caught++;
          sfx.clink();
          this.tray.y = 90;
          s.tweens.add({ targets: this.tray, y: 86, duration: 120 });
        }
        this.setScoreText(`รับได้ ${this.caught}`);
      } else if (it.y > 110) {
        this.remove(it);
        if (!it.bad) {
          this.missed++;
          sfx.crash();
        }
      }
    }
  }

  remove(it) {
    this.items = this.items.filter((x) => x !== it);
    it.destroy();
  }

  score() {
    return this.caught / this.target;
  }
}

// แต่ละสถานที่มีหลายเกม สุ่มเล่นทุกครั้ง (ไฟล์ minigames2.js เพิ่มเกมเข้ามาผ่าน registerGames)
const GAMES = { forest: [Chop], well: [Well], farm: [Farm], church: [Church], tavern: [Tavern] };
const EXTRA_TEXTURES = [];
export function registerGames(map, ensure) {
  for (const [loc, list] of Object.entries(map)) GAMES[loc].push(...list);
  if (ensure) EXTRA_TEXTURES.push(ensure);
}

/**
 * เริ่มมินิเกมของสถานที่ คืนค่า object ที่มี update(dt) และ destroy()
 */
export function startMinigame(scene, loc, { x = 320, y = 190, layer, onDone }) {
  ensureTextures(scene);
  EXTRA_TEXTURES.forEach((fn) => fn(scene));
  const root = scene.add.container(x, y);
  layer?.add(root);
  const list = GAMES[loc] || GAMES.forest;
  const Game = list[Math.floor(Math.random() * list.length)];
  const g = new Game(scene, root, { onDone });
  g.build();
  root.setScale(0.8).setAlpha(0);
  scene.tweens.add({ targets: root, scale: 1, alpha: 1, duration: 300, ease: 'Back.Out' });
  const destroy = g.destroy.bind(g);
  g.destroy = () => {
    destroy();
    scene.tweens.killTweensOf(root);
    root.destroy();
  };
  return g;
}
