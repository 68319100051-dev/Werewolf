// มินิเกมเพิ่มเติม (สถานที่ละ 2 แบบ) + มินิเกมฆ่าเวลาตอนกลางคืน
import { canvas, rect, dot, addTexture, addSheet, outline } from '../art/pixel.js';
import { sfx } from '../sfx.js';
import { COLORS } from './widgets.js';
import { MiniGame, PW, tex, registerGames, ensureTextures } from './minigames.js';

const R = (a, b) => Phaser.Math.Between(a, b);

function sheet(scene, key, frames, w, h) {
  if (scene.textures.exists(key)) return;
  const cs = frames.map((draw) => {
    const { c, ctx } = canvas(w, h);
    draw(ctx);
    outline(ctx, w, h, '#120e18');
    return c;
  });
  addSheet(scene, key, cs, w, h);
}

function ensureMoreTextures(scene) {
  if (scene.textures.exists('mg2_ready')) return;
  ensureTextures(scene);
  tex(scene, 'mg_mush', 12, 12, (ctx) => {
    rect(ctx, 1, 2, 10, 5, '#a86a3a');
    rect(ctx, 2, 1, 8, 1, '#c88a52');
    rect(ctx, 3, 2, 3, 1, '#e0a870');
    rect(ctx, 4, 7, 4, 5, '#efe6d0');
    rect(ctx, 7, 7, 1, 5, '#c8bca0');
  });
  tex(scene, 'mg_mush_bad', 12, 12, (ctx) => {
    rect(ctx, 1, 2, 10, 5, '#c8343a');
    rect(ctx, 2, 1, 8, 1, '#e05058');
    dot(ctx, 3, 3, '#ffffff');
    dot(ctx, 7, 2, '#ffffff');
    dot(ctx, 8, 5, '#ffffff');
    dot(ctx, 4, 5, '#ffffff');
    rect(ctx, 4, 7, 4, 5, '#d8d0e8');
    rect(ctx, 7, 7, 1, 5, '#a8a0b8');
  });
  sheet(scene, 'mg_rabbit', [0, 1].map((f) => (ctx) => {
    rect(ctx, 3, 5 - f, 8, 5, '#d8d0c8');
    rect(ctx, 9, 3 - f, 4, 4, '#e8e0d8');
    rect(ctx, 10, 0 - f + 1, 1, 3, '#e8e0d8');
    rect(ctx, 12, 0 - f + 1, 1, 3, '#e8e0d8');
    dot(ctx, 12, 4 - f, '#1a1420');
    rect(ctx, 1, 6 - f, 2, 2, '#ffffff');
    rect(ctx, 4, 10 - f, 2, f ? 2 : 1, '#b8b0a8');
    rect(ctx, 9, 10 - f, 2, f ? 2 : 1, '#b8b0a8');
  }), 14, 12);
  tex(scene, 'mg_fish', 16, 8, (ctx) => {
    rect(ctx, 3, 2, 9, 4, '#5a8ad0');
    rect(ctx, 4, 2, 7, 1, '#a8c8ff');
    rect(ctx, 0, 1, 3, 2, '#3a6ab0');
    rect(ctx, 0, 5, 3, 2, '#3a6ab0');
    rect(ctx, 12, 3, 3, 2, '#5a8ad0');
    dot(ctx, 11, 3, '#1a1420');
  });
  tex(scene, 'mg_shirt', 26, 22, (ctx) => {
    rect(ctx, 6, 2, 14, 20, '#e8e4dc');
    rect(ctx, 0, 2, 7, 7, '#e8e4dc');
    rect(ctx, 19, 2, 7, 7, '#e8e4dc');
    rect(ctx, 10, 2, 6, 2, '#c8c4bc');
    rect(ctx, 6, 18, 14, 4, '#d0ccc4');
  });
  sheet(scene, 'mg_crow', [0, 1].map((f) => (ctx) => {
    rect(ctx, 4, 4, 8, 6, '#1a1824');
    rect(ctx, 10, 2, 4, 4, '#1a1824');
    rect(ctx, 14, 3, 2, 1, '#e8b84a');
    dot(ctx, 12, 3, '#e8e8f0');
    if (f) {
      rect(ctx, 2, 0, 6, 4, '#2a2834');
    } else {
      rect(ctx, 1, 6, 6, 2, '#2a2834');
    }
    rect(ctx, 6, 10, 1, 2, '#e8b84a');
    rect(ctx, 9, 10, 1, 2, '#e8b84a');
  }), 16, 12);
  tex(scene, 'mg_cow', 40, 28, (ctx) => {
    rect(ctx, 4, 6, 26, 14, '#f0ece4');
    rect(ctx, 8, 8, 6, 5, '#2a2430');
    rect(ctx, 20, 12, 7, 6, '#2a2430');
    rect(ctx, 28, 2, 10, 10, '#f0ece4');
    rect(ctx, 33, 8, 5, 4, '#f0a0a8');
    dot(ctx, 31, 5, '#1a1420');
    rect(ctx, 28, 0, 2, 3, '#c8b890');
    rect(ctx, 35, 0, 2, 3, '#c8b890');
    rect(ctx, 6, 20, 3, 8, '#e0dcd4');
    rect(ctx, 25, 20, 3, 8, '#e0dcd4');
    rect(ctx, 14, 20, 6, 3, '#f0a0a8');
    rect(ctx, 0, 8, 4, 1, '#c8c4bc');
  });
  tex(scene, 'mg_plate', 30, 12, (ctx) => {
    rect(ctx, 2, 2, 26, 8, '#e8eef4');
    rect(ctx, 0, 4, 30, 4, '#e8eef4');
    rect(ctx, 6, 4, 18, 4, '#d0dae4');
    rect(ctx, 2, 9, 26, 1, '#a8b4c0');
  });
  sheet(scene, 'mg_sheep', [0, 1].map((f) => (ctx) => {
    rect(ctx, 2, 3 - f, 14, 8, '#f4f2ee');
    rect(ctx, 3, 2 - f, 4, 1, '#ffffff');
    rect(ctx, 14, 4 - f, 5, 5, '#2a2430');
    dot(ctx, 17, 5 - f, '#f4f2ee');
    rect(ctx, 4, 11 - f, 2, f ? 3 : 2, '#2a2430');
    rect(ctx, 12, 11 - f, 2, f ? 3 : 2, '#2a2430');
  }), 20, 14);
  tex(scene, 'mg_fence', 30, 18, (ctx) => {
    rect(ctx, 2, 0, 3, 18, '#8a6a4a');
    rect(ctx, 25, 0, 3, 18, '#8a6a4a');
    rect(ctx, 0, 4, 30, 3, '#a8885e');
    rect(ctx, 0, 11, 30, 3, '#a8885e');
  });
  sheet(scene, 'mg_mosquito', [0, 1].map((f) => (ctx) => {
    rect(ctx, 3, 4, 5, 2, '#3a3040');
    rect(ctx, 7, 3, 2, 2, '#3a3040');
    rect(ctx, 9, 4, 2, 1, '#2a2030');
    rect(ctx, f ? 2 : 4, f ? 0 : 1, 3, 2, '#c8d8ff');
    rect(ctx, 3, 6, 1, 2, '#3a3040');
    rect(ctx, 6, 6, 1, 2, '#3a3040');
  }), 12, 9);
  // ห้องนอนตอนกลางคืน (พื้นหลังมินิเกมกลางคืน)
  {
    const { c, ctx } = canvas(140, 70);
    rect(ctx, 0, 0, 140, 70, '#1a1a30');
    for (let x = 0; x < 140; x += 8) rect(ctx, x, 0, 1, 52, '#14142a');
    rect(ctx, 0, 52, 140, 18, '#2a2030');
    for (let x = 0; x < 140; x += 14) rect(ctx, x, 52, 1, 18, '#221a28');
    rect(ctx, 96, 34, 40, 18, '#3a3a6a');
    rect(ctx, 96, 30, 40, 6, '#e8e4f0');
    rect(ctx, 98, 31, 10, 4, '#ffffff');
    rect(ctx, 96, 50, 40, 4, '#4a3a2a');
    rect(ctx, 6, 40, 10, 12, '#4a3a2a');
    rect(ctx, 9, 34, 4, 6, '#efe6d0');
    dot(ctx, 10, 32, '#ffd070');
    addTexture(scene, 'scene_bedroom', c);
  }
  {
    const { c, ctx } = canvas(24, 26);
    rect(ctx, 0, 0, 24, 26, '#4a3a2a');
    rect(ctx, 2, 2, 20, 22, '#0e1230');
    for (let i = 0; i < 6; i++) dot(ctx, 3 + ((i * 7) % 18), 3 + ((i * 5) % 18), '#a8b0e0');
    rect(ctx, 11, 2, 2, 22, '#4a3a2a');
    rect(ctx, 2, 12, 20, 2, '#4a3a2a');
    addTexture(scene, 'mg_window_frame', c);
  }
  tex(scene, 'mg_shutter', 10, 22, (ctx) => {
    rect(ctx, 0, 0, 10, 22, '#7a5230');
    for (let y = 2; y < 22; y += 4) rect(ctx, 1, y, 8, 1, '#5a3a22');
    rect(ctx, 0, 0, 1, 22, '#a3733f');
  });
  addTexture(scene, 'mg2_ready', canvas(1, 1).c);
}

// ---------- ป่าลึก: เก็บเห็ด ----------
class Mushroom extends MiniGame {
  build() {
    const s = this.scene;
    this.frame('เก็บเห็ดในป่าลึก', 'คลิกเห็ดสีน้ำตาล ห้ามเก็บเห็ดพิษสีแดง!', 'forest');
    this.spots = [];
    for (let i = 0; i < 9; i++) this.spots.push({ x: -170 + (i % 5) * 85 + (i > 4 ? 42 : 0), y: 48 + (i > 4 ? 40 : 0), m: null });
    this.got = 0;
    this.bad = 0;
    this.target = 10;
    this.spawnIn = 300;
    this.setScoreText(`เห็ด 0/${this.target}`);
    this.countdown();
  }

  tick(dt) {
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      const free = this.spots.filter((p) => !p.m);
      if (free.length) this.spawn(Phaser.Utils.Array.GetRandom(free));
      this.spawnIn = 520 - Math.min(200, this.got * 20);
    }
    for (const p of this.spots) {
      if (!p.m) continue;
      p.m.life -= dt;
      if (p.m.life <= 0) this.remove(p, false);
    }
  }

  spawn(p) {
    const s = this.scene;
    const bad = Math.random() < 0.28;
    const m = this.add(s.add.image(p.x, p.y, bad ? 'mg_mush_bad' : 'mg_mush').setScale(0).setOrigin(0.5, 1).setInteractive({ useHandCursor: true }));
    m.bad = bad;
    m.life = 1400;
    p.m = m;
    s.tweens.add({ targets: m, scale: 3, duration: 180, ease: 'Back.Out' });
    m.on('pointerdown', () => {
      if (!this.running) return;
      if (m.bad) {
        this.bad++;
        sfx.error();
        s.cameras.main.shake(120, 0.006);
        this.popText('เห็ดพิษ!', COLORS.red, p.x, p.y - 40);
      } else {
        this.got++;
        sfx.pop();
        this.popText('+1', COLORS.gold, p.x, p.y - 40);
        this.setScoreText(`เห็ด ${this.got}/${this.target}`);
        if (this.got >= this.target) this.finish();
      }
      this.remove(p, true);
    });
  }

  remove(p, picked) {
    const m = p.m;
    p.m = null;
    if (!m) return;
    m.disableInteractive();
    this.scene.tweens.add({ targets: m, scale: 0, y: picked ? m.y - 20 : m.y, duration: 150, onComplete: () => m.destroy() });
  }

  score() {
    return Math.max(0, this.got - this.bad) / this.target;
  }
}

// ---------- ป่าลึก: จับกระต่าย ----------
class Rabbit extends MiniGame {
  build() {
    this.frame('ไล่จับกระต่ายป่า', 'คลิกกระต่ายที่วิ่งผ่านไปให้ทัน!', 'forest');
    if (!this.scene.anims.exists('mg_rabbit_hop')) {
      this.scene.anims.create({ key: 'mg_rabbit_hop', frames: this.scene.anims.generateFrameNumbers('mg_rabbit', { start: 0, end: 1 }), frameRate: 8, repeat: -1 });
    }
    this.rabbits = [];
    this.caught = 0;
    this.target = 7;
    this.spawnIn = 400;
    this.setScoreText(`กระต่าย 0/${this.target}`);
    this.countdown();
  }

  tick(dt) {
    const s = this.scene;
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      const fromLeft = Math.random() < 0.5;
      const r = this.add(s.add.sprite(fromLeft ? -PW / 2 - 20 : PW / 2 + 20, R(10, 90), 'mg_rabbit').setScale(3).play('mg_rabbit_hop'));
      r.setFlipX(!fromLeft);
      r.vx = (fromLeft ? 1 : -1) * (140 + this.caught * 18 + R(0, 60));
      r.setInteractive({ useHandCursor: true });
      r.on('pointerdown', () => this.catch(r));
      this.rabbits.push(r);
      this.spawnIn = R(500, 900);
    }
    for (const r of [...this.rabbits]) {
      r.x += (r.vx * dt) / 1000;
      if (Math.abs(r.x) > PW / 2 + 40) this.drop(r);
    }
  }

  catch(r) {
    if (!this.running) return;
    this.caught++;
    sfx.pop();
    this.popText('จับได้!', COLORS.gold, r.x, r.y - 20);
    this.drop(r);
    this.setScoreText(`กระต่าย ${this.caught}/${this.target}`);
    if (this.caught >= this.target) this.finish();
  }

  drop(r) {
    this.rabbits = this.rabbits.filter((x) => x !== r);
    r.destroy();
  }

  score() {
    return this.caught / this.target;
  }
}

// ---------- บ่อน้ำ: ตกปลา ----------
class Fishing extends MiniGame {
  build() {
    const s = this.scene;
    this.frame('ตกปลาข้างบ่อน้ำ', 'รอให้ทุ่นจมแล้วคลิกทันที! คลิกก่อนปลาจะหนี', 'well');
    this.add(s.add.ellipse(0, 50, 300, 70, 0x2a5a90));
    this.add(s.add.ellipse(0, 46, 280, 56, 0x3a6aa8));
    this.line = this.add(s.add.rectangle(-150, -60, 2, 10, 0xd8c8a0).setOrigin(0.5, 0));
    this.bobber = this.add(s.add.container(R(-80, 80), 44));
    this.bobber.add([s.add.circle(0, 0, 5, 0xe0565e), s.add.rectangle(0, 3, 10, 3, 0xffffff)]);
    this.fish = 0;
    this.target = 4;
    this.state = 'wait';
    this.waitFor = R(900, 2200);
    this.hit.on('pointerdown', () => this.click());
    this.setScoreText(`ปลา 0/${this.target}`);
    this.countdown();
  }

  tick(dt) {
    const s = this.scene;
    this.line.setPosition(this.bobber.x - 120, -60);
    this.line.setAngle(Phaser.Math.RadToDeg(Math.atan2(this.bobber.y + 60, 120)) - 90);
    this.line.height = Phaser.Math.Distance.Between(this.line.x, -60, this.bobber.x, this.bobber.y);
    this.waitFor -= dt;
    if (this.state === 'wait') {
      this.bobber.y = 44 + Math.sin(this.elapsed / 300) * 1.5;
      if (this.waitFor <= 0) {
        this.state = 'bite';
        this.waitFor = 650;
        s.tweens.add({ targets: this.bobber, y: 54, duration: 120, yoyo: true, repeat: 2 });
        const ring = this.add(s.add.circle(this.bobber.x, 48, 6, 0xffffff, 0).setStrokeStyle(2, 0xffffff));
        s.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
        sfx.splash();
      }
    } else if (this.state === 'bite' && this.waitFor <= 0) {
      this.popText('ปลาหนีไปแล้ว...', COLORS.dim, this.bobber.x, 10);
      this.reset();
    }
  }

  click() {
    if (!this.running) return;
    if (this.state === 'bite') {
      this.fish++;
      sfx.success();
      const f = this.add(this.scene.add.image(this.bobber.x, 40, 'mg_fish').setScale(3));
      this.scene.tweens.add({ targets: f, y: -60, angle: 360, alpha: 0, duration: 700, onComplete: () => f.destroy() });
      this.setScoreText(`ปลา ${this.fish}/${this.target}`);
      if (this.fish >= this.target) return this.finish();
      this.reset();
    } else {
      sfx.thud();
      this.popText('เร็วไป!', COLORS.red, this.bobber.x, 10);
      this.reset();
    }
  }

  reset() {
    this.state = 'wait';
    this.waitFor = R(900, 2200);
    this.bobber.x = R(-90, 90);
  }

  score() {
    return this.fish / this.target;
  }
}

// ---------- บ่อน้ำ: ซักผ้า ----------
class Laundry extends MiniGame {
  build() {
    const s = this.scene;
    this.frame('ซักผ้าข้างบ่อน้ำ', 'คลิกคราบสกปรกบนเสื้อให้หมด แล้วตากผ้า!', 'well');
    this.add(s.add.rectangle(-170, -60, 4, 70, 0x5a3a22).setOrigin(0.5, 0));
    this.add(s.add.rectangle(170, -60, 4, 70, 0x5a3a22).setOrigin(0.5, 0));
    this.add(s.add.rectangle(0, -58, 344, 2, 0xd8c8a0));
    this.add(s.add.rectangle(0, 52, 140, 80, 0x8a5a32));
    for (let y = 18; y < 92; y += 6) this.add(s.add.rectangle(0, y, 130, 2, 0x6a4226));
    this.done = 0;
    this.partial = 0;
    this.target = 3;
    this.newShirt();
    this.setScoreText(`เสื้อ 0/${this.target}`);
    this.countdown();
  }

  newShirt() {
    const s = this.scene;
    this.shirt = this.add(s.add.image(0, 50, 'mg_shirt').setScale(4));
    this.dirt = [];
    for (let i = 0; i < 6; i++) {
      const d = this.add(s.add.circle(R(-36, 36), R(20, 86), R(6, 9), 0x6a4a2a, 0.9).setInteractive({ useHandCursor: true }));
      d.hp = 2;
      d.on('pointerdown', () => this.scrub(d));
      this.dirt.push(d);
    }
  }

  scrub(d) {
    if (!this.running || !d.active) return;
    d.hp--;
    sfx.pull();
    const bub = this.add(this.scene.add.circle(d.x + R(-6, 6), d.y, 3, 0xffffff, 0.8));
    this.scene.tweens.add({ targets: bub, y: d.y - 20, alpha: 0, duration: 400, onComplete: () => bub.destroy() });
    d.setAlpha(d.hp ? 0.45 : 0);
    if (d.hp > 0) return;
    d.destroy();
    this.dirt = this.dirt.filter((x) => x !== d);
    this.partial = (6 - this.dirt.length) / 6;
    if (this.dirt.length) return;
    // ตากผ้า แล้วเอาตัวใหม่มา
    this.done++;
    this.partial = 0;
    sfx.success();
    const sh = this.shirt;
    this.scene.tweens.add({ targets: sh, x: -120 + this.done * 70, y: -40, scale: 2, duration: 350 });
    this.setScoreText(`เสื้อ ${this.done}/${this.target}`);
    if (this.done >= this.target) return this.finish();
    this.newShirt();
  }

  score() {
    return (this.done + this.partial) / this.target;
  }
}

// ---------- ทุ่งนา: ไล่กา ----------
class Crows extends MiniGame {
  build() {
    this.frame('ไล่กาที่ทุ่งนา', 'คลิกไล่กาก่อนมันจะจิกกินข้าว!', 'farm');
    if (!this.scene.anims.exists('mg_crow_flap')) {
      this.scene.anims.create({ key: 'mg_crow_flap', frames: this.scene.anims.generateFrameNumbers('mg_crow', { start: 0, end: 1 }), frameRate: 10, repeat: -1 });
    }
    this.crows = [];
    this.shooed = 0;
    this.eaten = 0;
    this.spawnIn = 300;
    this.setScoreText('ไล่ได้ 0');
    this.countdown();
  }

  tick(dt) {
    const s = this.scene;
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      const x = R(-170, 170);
      const y = R(20, 90);
      const c = this.add(s.add.sprite(x + R(-200, 200), -110, 'mg_crow').setScale(3).play('mg_crow_flap'));
      c.life = 1800;
      c.landed = false;
      s.tweens.add({ targets: c, x, y, duration: 450, ease: 'Quad.Out', onComplete: () => {
        if (!c.active) return; // มินิเกมถูกปิดไปก่อนกาจะลงพื้น
        c.landed = true;
        c.stop();
        c.setFrame(0);
      } });
      c.setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => this.shoo(c));
      this.crows.push(c);
      this.spawnIn = R(380, 700);
    }
    for (const c of [...this.crows]) {
      if (!c.landed) continue;
      c.life -= dt;
      c.y += Math.sin(this.elapsed / 80) * 0.3;
      if (c.life <= 0) {
        this.eaten++;
        this.popText('กากินข้าว!', COLORS.red, c.x, c.y - 20);
        this.flyAway(c);
      }
    }
  }

  shoo(c) {
    if (!this.running || !c.active) return;
    this.shooed++;
    sfx.pop();
    this.setScoreText(`ไล่ได้ ${this.shooed}`);
    this.flyAway(c);
  }

  flyAway(c) {
    this.crows = this.crows.filter((x) => x !== c);
    c.disableInteractive();
    c.play('mg_crow_flap');
    this.scene.tweens.add({ targets: c, y: -140, x: c.x + R(-80, 80), alpha: 0, duration: 500, onComplete: () => c.destroy() });
  }

  score() {
    return this.shooed / Math.max(10, this.shooed + this.eaten);
  }
}

// ---------- ทุ่งนา: รีดนมวัว (กดตามจังหวะ) ----------
class Milk extends MiniGame {
  build() {
    const s = this.scene;
    this.frame('รีดนมวัวที่ทุ่งนา', 'คลิกตอนวงกลมวิ่งมาทับวงเป้าหมายพอดี!', 'farm');
    this.add(s.add.image(-110, 56, 'mg_cow').setScale(3));
    this.bucket = this.add(s.add.rectangle(-60, 92, 34, 28, 0x9a9aaa));
    this.milk = this.add(s.add.rectangle(-60, 104, 30, 0, 0xffffff).setOrigin(0.5, 1));
    this.add(s.add.rectangle(60, -40, 300, 26, 0x0b0a1a, 0.6));
    this.targetX = -60;
    this.add(s.add.circle(this.targetX, -40, 13, 0x000000, 0).setStrokeStyle(3, 0xffe08a));
    this.notes = [];
    this.hits = 0;
    this.total = 0;
    this.maxNotes = 14;
    this.spawnIn = 200;
    this.hit.on('pointerdown', () => this.press());
    this.setScoreText('นม 0');
    this.countdown();
  }

  tick(dt) {
    const s = this.scene;
    this.spawnIn -= dt;
    if (this.spawnIn <= 0 && this.total < this.maxNotes) {
      this.total++;
      this.notes.push(this.add(s.add.circle(210, -40, 10, 0xffffff)));
      this.spawnIn = R(550, 850);
    }
    for (const n of [...this.notes]) {
      n.x -= (170 * dt) / 1000;
      if (n.x < this.targetX - 24) {
        this.popText('พลาด', COLORS.dim, this.targetX, -70);
        this.removeNote(n);
      }
    }
    if (this.total >= this.maxNotes && !this.notes.length) this.finish();
  }

  press() {
    if (!this.running) return;
    const n = this.notes.find((x) => Math.abs(x.x - this.targetX) < 20);
    if (!n) return sfx.thud();
    this.hits++;
    sfx.pop();
    this.removeNote(n);
    this.milk.height = Math.min(26, this.hits * 2.2);
    const d = this.add(this.scene.add.rectangle(-80, 70, 3, 8, 0xffffff));
    this.scene.tweens.add({ targets: d, x: -60, y: 90, alpha: 0, duration: 200, onComplete: () => d.destroy() });
    this.setScoreText(`นม ${this.hits}`);
  }

  removeNote(n) {
    this.notes = this.notes.filter((x) => x !== n);
    n.destroy();
  }

  score() {
    return this.hits / 11;
  }
}

// ---------- โบสถ์: จุดเทียน ----------
class Candles extends MiniGame {
  build() {
    const s = this.scene;
    this.frame('จุดเทียนในโบสถ์', 'ลมพัดเทียนดับ! คลิกจุดเทียนให้ติดไว้ให้มากที่สุด', 'church');
    this.candles = [];
    for (let i = 0; i < 6; i++) {
      const x = -150 + i * 60;
      this.add(s.add.rectangle(x, 92, 30, 6, 0x6a5a4a));
      const body = this.add(s.add.image(x, 90, 'candle').setOrigin(0.5, 1).setScale(2.4));
      const glow = this.add(s.add.image(x, 30, 'glow').setScale(1.2).setBlendMode('ADD'));
      const flame = this.add(s.add.image(x, 30, 'flame').setScale(2.4));
      s.tweens.add({ targets: flame, scaleY: 2.9, duration: 160, yoyo: true, repeat: -1 });
      const hit = this.add(s.add.zone(x, 50, 40, 90).setInteractive({ useHandCursor: true }));
      const c = { lit: true, flame, glow, body };
      hit.on('pointerdown', () => this.light(c));
      this.candles.push(c);
    }
    this.litTime = 0;
    this.sumTime = 0;
    this.blowIn = 600;
    this.setScoreText('เทียนติด 6/6');
    this.countdown();
  }

  tick(dt) {
    this.blowIn -= dt;
    if (this.blowIn <= 0) {
      const lit = this.candles.filter((c) => c.lit);
      if (lit.length) {
        const c = Phaser.Utils.Array.GetRandom(lit);
        c.lit = false;
        c.flame.setVisible(false);
        c.glow.setVisible(false);
        sfx.whoosh();
      }
      this.blowIn = Math.max(260, 650 - this.elapsed / 30);
    }
    const n = this.candles.filter((c) => c.lit).length;
    this.litTime += (n / 6) * dt;
    this.sumTime += dt;
    this.setScoreText(`เทียนติด ${n}/6`);
  }

  light(c) {
    if (!this.running || c.lit) return;
    c.lit = true;
    c.flame.setVisible(true).setScale(0.5);
    c.glow.setVisible(true);
    this.scene.tweens.add({ targets: c.flame, scale: 2.4, duration: 150 });
    sfx.pop();
  }

  score() {
    const avg = this.litTime / Math.max(1, this.sumTime);
    return (avg - 0.35) / 0.6;
  }
}

// ---------- โบสถ์: เช็ดกระจกสี ----------
class Glass extends MiniGame {
  build() {
    const s = this.scene;
    this.frame('เช็ดกระจกสีในโบสถ์', 'กดค้างแล้วลากถูฝุ่นบนกระจกให้สะอาด!', 'church');
    const colors = [0xd0434a, 0x5a8ad0, 0xe8b84a, 0x5aa060, 0xa060c0];
    this.tiles = [];
    const cols = 10;
    const rowsN = 6;
    const size = 24;
    const ox = -((cols - 1) * size) / 2;
    const oy = -60;
    this.add(s.add.rectangle(0, oy + ((rowsN - 1) * size) / 2, cols * size + 12, rowsN * size + 12, 0x2a2a3a));
    for (let r = 0; r < rowsN; r++) {
      for (let c = 0; c < cols; c++) {
        const x = ox + c * size;
        const y = oy + r * size;
        this.add(s.add.rectangle(x, y, size - 2, size - 2, colors[(r + c * 2) % colors.length]));
        const dust = this.add(s.add.rectangle(x, y, size - 2, size - 2, 0x8a8478, 0.92));
        dust.dirt = 1;
        this.tiles.push(dust);
      }
    }
    this.down = false;
    this.hit.on('pointerdown', (p) => {
      this.down = true;
      this.wipe(p);
    });
    this.hit.on('pointermove', (p) => this.down && this.wipe(p));
    this.hit.on('pointerup', () => (this.down = false));
    this.hit.on('pointerout', () => (this.down = false));
    this.setScoreText('สะอาด 0%');
    this.countdown();
  }

  wipe(pointer) {
    if (!this.running) return;
    const lx = (pointer.x - this.root.x) / this.root.scaleX;
    const ly = (pointer.y - this.root.y) / this.root.scaleY;
    let changed = false;
    for (const t of this.tiles) {
      if (t.dirt <= 0) continue;
      if (Math.abs(t.x - lx) < 20 && Math.abs(t.y - ly) < 20) {
        t.dirt = Math.max(0, t.dirt - 0.34);
        t.setAlpha(t.dirt * 0.92);
        changed = true;
        if (t.dirt <= 0 && Math.random() < 0.3) {
          const sp = this.add(this.scene.add.image(t.x, t.y, 'spark').setBlendMode('ADD'));
          this.scene.tweens.add({ targets: sp, scale: 2, alpha: 0, duration: 300, onComplete: () => sp.destroy() });
        }
      }
    }
    if (changed && Math.random() < 0.3) sfx.pull();
    const pct = Math.round(this.clean() * 100);
    this.setScoreText(`สะอาด ${pct}%`);
    if (pct >= 100) this.finish();
  }

  clean() {
    return this.tiles.reduce((s, t) => s + (1 - t.dirt), 0) / this.tiles.length;
  }

  score() {
    return this.clean();
  }
}

// ---------- โรงเตี๊ยม: รินเบียร์ ----------
class Pour extends MiniGame {
  build() {
    const s = this.scene;
    this.frame('รินเบียร์ที่โรงเตี๊ยม', 'กดค้างเพื่อริน ปล่อยให้เบียร์พอดีขีดสีเหลือง!', 'tavern');
    this.add(s.add.rectangle(0, -96, 20, 30, 0x8a5a32));
    this.add(s.add.rectangle(0, -78, 8, 10, 0x6a6a78));
    this.stream = this.add(s.add.rectangle(0, -72, 4, 0, 0xf0b040).setOrigin(0.5, 0));
    this.mugX = 0;
    this.mug = this.add(s.add.rectangle(0, 50, 64, 80, 0x2a2026, 0.6).setStrokeStyle(4, 0xc8a060));
    this.handle = this.add(s.add.rectangle(40, 50, 12, 40, 0x000000, 0).setStrokeStyle(4, 0xc8a060));
    this.beer = this.add(s.add.rectangle(0, 88, 56, 0, 0xf0b040).setOrigin(0.5, 1));
    this.foam = this.add(s.add.rectangle(0, 88, 56, 0, 0xffffff).setOrigin(0.5, 1));
    this.line = this.add(s.add.rectangle(0, 0, 70, 3, 0xffe08a));
    this.fill = 0;
    this.pouring = false;
    this.results = [];
    this.mugs = 4;
    this.newMug();
    this.hit.on('pointerdown', () => this.running && !this.locked && (this.pouring = true));
    this.hit.on('pointerup', () => this.release());
    this.hit.on('pointerout', () => this.release());
    this.setScoreText(`แก้ว 0/${this.mugs}`);
    this.countdown();
  }

  newMug() {
    this.fill = 0;
    this.locked = false;
    this.goal = Phaser.Math.FloatBetween(0.55, 0.88);
    this.line.y = 88 - this.goal * 72;
    this.redraw();
  }

  redraw() {
    const h = Math.min(1.15, this.fill) * 72;
    this.beer.height = Math.min(72, h);
    this.foam.height = Math.min(6, h * 0.1);
    this.foam.y = 88 - Math.min(72, h) + this.foam.height;
  }

  tick(dt) {
    if (this.pouring) {
      this.fill += dt / 1700;
      this.stream.height = 150 - Math.min(72, this.fill * 72);
      this.redraw();
      if (this.fill > 1.05) {
        sfx.crash();
        this.popText('ล้นแก้ว!', COLORS.red, 0, -20);
        this.release();
      }
    } else {
      this.stream.height = 0;
    }
  }

  release() {
    if (!this.pouring) return;
    this.pouring = false;
    this.locked = true;
    const acc = this.fill > 1.05 ? 0 : Math.max(0, 1 - Math.abs(this.fill - this.goal) * 5);
    this.results.push(acc);
    this.popText(acc > 0.85 ? 'พอดีเป๊ะ!' : acc > 0.5 ? 'ดีมาก' : 'เกือบ...', acc > 0.5 ? COLORS.gold : COLORS.dim, 0, -40);
    (acc > 0.5 ? sfx.clink : sfx.thud)();
    this.setScoreText(`แก้ว ${this.results.length}/${this.mugs}`);
    if (this.results.length >= this.mugs) return this.finish();
    this.scene.time.delayedCall(500, () => !this.finished && this.newMug());
  }

  score() {
    return this.results.reduce((a, b) => a + b, 0) / this.mugs;
  }
}

// ---------- โรงเตี๊ยม: ล้างจาน ----------
class Dishes extends MiniGame {
  build() {
    const s = this.scene;
    this.frame('ล้างจานที่โรงเตี๊ยม', 'คลิกรัว ๆ ขัดจานให้สะอาด แล้วจานใบถัดไปจะมา!', 'tavern');
    this.add(s.add.rectangle(-40, 66, 180, 50, 0x6a6a78));
    this.add(s.add.rectangle(-40, 62, 164, 36, 0x5a8ad0, 0.8));
    this.add(s.add.rectangle(140, 40, 80, 70, 0x5a3a22));
    this.done = 0;
    this.target = 8;
    this.newPlate();
    this.hit.on('pointerdown', () => this.scrub());
    this.setScoreText(`จาน 0/${this.target}`);
    this.countdown();
  }

  newPlate() {
    const s = this.scene;
    this.plate = this.add(s.add.container(-40, 30));
    this.plate.add(s.add.image(0, 0, 'mg_plate').setScale(4));
    this.stains = [];
    for (let i = 0; i < 3; i++) {
      const st = s.add.circle(R(-30, 30), R(-6, 6), R(5, 8), 0x8a6a3a, 0.9);
      this.stains.push(st);
      this.plate.add(st);
    }
    this.hp = 5;
  }

  scrub() {
    if (!this.running || !this.plate) return;
    this.hp--;
    sfx.pull();
    this.stains.forEach((st) => st.setAlpha(Math.max(0, this.hp / 5) * 0.9));
    const bub = this.add(this.scene.add.circle(-40 + R(-40, 40), 30, R(2, 4), 0xffffff, 0.9));
    this.scene.tweens.add({ targets: bub, y: -10, alpha: 0, duration: 400, onComplete: () => bub.destroy() });
    this.scene.tweens.add({ targets: this.plate, angle: R(-8, 8), duration: 50, yoyo: true });
    if (this.hp > 0) return;
    this.done++;
    sfx.clink();
    const p = this.plate;
    this.plate = null;
    this.scene.tweens.add({ targets: p, x: 140, y: 60 - this.done * 5, scale: 0.6, duration: 250 });
    this.setScoreText(`จาน ${this.done}/${this.target}`);
    if (this.done >= this.target) return this.finish();
    this.scene.time.delayedCall(150, () => !this.finished && this.newPlate());
  }

  score() {
    return this.done / this.target;
  }
}

registerGames({
  forest: [Mushroom, Rabbit],
  well: [Fishing, Laundry],
  farm: [Crows, Milk],
  church: [Candles, Glass],
  tavern: [Pour, Dishes],
}, ensureMoreTextures);

// ======================= มินิเกมกลางคืน (เล่นฆ่าเวลา ไม่มีผลกับเกม) =======================

class NightGame extends MiniGame {
  constructor(scene, root, opts) {
    super(scene, root, { ...opts, duration: opts.duration || 22000 });
  }

  score() {
    return this.count / this.goal;
  }
}

// นับแกะ
class Sheep extends NightGame {
  build() {
    const s = this.scene;
    this.frame('นับแกะให้หลับ...', 'คลิกตอนแกะกระโดดข้ามรั้วพอดี', 'bedroom');
    if (!s.anims.exists('mg_sheep_run')) {
      s.anims.create({ key: 'mg_sheep_run', frames: s.anims.generateFrameNumbers('mg_sheep', { start: 0, end: 1 }), frameRate: 8, repeat: -1 });
    }
    this.add(s.add.rectangle(0, 80, PW, 40, 0x2a4a2a));
    this.add(s.add.image(0, 70, 'mg_fence').setScale(3));
    this.sheep = [];
    this.count = 0;
    this.goal = 12;
    this.spawnIn = 300;
    this.hit.on('pointerdown', () => this.click());
    this.setScoreText('แกะ 0 ตัว');
    this.countdown();
  }

  tick(dt) {
    const s = this.scene;
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      const sh = this.add(s.add.sprite(-PW / 2 - 20, 70, 'mg_sheep').setScale(2.6).play('mg_sheep_run'));
      sh.vx = 130 + R(0, 50);
      this.sheep.push(sh);
      this.spawnIn = R(900, 1500);
    }
    for (const sh of [...this.sheep]) {
      sh.x += (sh.vx * dt) / 1000;
      const d = Math.abs(sh.x);
      sh.y = d < 50 ? 70 - Math.cos((sh.x / 50) * (Math.PI / 2)) * 46 : 70;
      if (sh.x > PW / 2 + 30) {
        this.sheep = this.sheep.filter((x) => x !== sh);
        sh.destroy();
      }
    }
  }

  click() {
    if (!this.running) return;
    const sh = this.sheep.find((x) => Math.abs(x.x) < 22 && !x.counted);
    if (!sh) return sfx.thud();
    sh.counted = true;
    this.count++;
    sfx.pop();
    this.popText(`${this.count}...`, '#c8d8ff', sh.x, sh.y - 30);
    this.setScoreText(`แกะ ${this.count} ตัว`);
  }
}

// ปิดหน้าต่างกันลม
class Shutters extends NightGame {
  build() {
    const s = this.scene;
    this.frame('ลมแรง! ปิดหน้าต่างหน่อย', 'คลิกหน้าต่างที่ลมพัดเปิด ให้ปิดสนิท', 'bedroom');
    this.wins = [];
    for (let i = 0; i < 4; i++) {
      const x = -150 + i * 100;
      const y = 0;
      this.add(s.add.image(x, y, 'mg_window_frame').setScale(3));
      const l = this.add(s.add.image(x - 18, y, 'mg_shutter').setScale(3, 3.2));
      const r = this.add(s.add.image(x + 18, y, 'mg_shutter').setScale(3, 3.2).setFlipX(true));
      const hit = this.add(s.add.zone(x, y, 80, 90).setInteractive({ useHandCursor: true }));
      const w = { x, l, r, open: false };
      hit.on('pointerdown', () => this.close(w));
      this.wins.push(w);
    }
    this.count = 0;
    this.goal = 10;
    this.gustIn = 800;
    this.setScoreText('ปิดได้ 0 ครั้ง');
    this.countdown();
  }

  tick(dt) {
    this.gustIn -= dt;
    if (this.gustIn <= 0) {
      const closed = this.wins.filter((w) => !w.open);
      if (closed.length) {
        const w = Phaser.Utils.Array.GetRandom(closed);
        w.open = true;
        sfx.whoosh();
        this.scene.tweens.add({ targets: w.l, scaleX: 0.6, x: w.x - 40, duration: 200 });
        this.scene.tweens.add({ targets: w.r, scaleX: 0.6, x: w.x + 40, duration: 200 });
      }
      this.gustIn = R(600, 1300);
    }
  }

  close(w) {
    if (!this.running || !w.open) return;
    w.open = false;
    this.count++;
    sfx.thud();
    this.scene.tweens.add({ targets: w.l, scaleX: 3, x: w.x - 18, duration: 120 });
    this.scene.tweens.add({ targets: w.r, scaleX: 3, x: w.x + 18, duration: 120 });
    this.setScoreText(`ปิดได้ ${this.count} ครั้ง`);
  }
}

// ไล่ยุง
class Mosquito extends NightGame {
  build() {
    this.frame('ยุงกวนนอนไม่หลับ!', 'คลิกตบยุงที่บินวนอยู่', 'bedroom');
    if (!this.scene.anims.exists('mg_mosquito_fly')) {
      this.scene.anims.create({ key: 'mg_mosquito_fly', frames: this.scene.anims.generateFrameNumbers('mg_mosquito', { start: 0, end: 1 }), frameRate: 20, repeat: -1 });
    }
    this.bugs = [];
    this.count = 0;
    this.goal = 10;
    this.spawnIn = 300;
    this.setScoreText('ตบได้ 0 ตัว');
    this.countdown();
  }

  tick(dt) {
    const s = this.scene;
    this.spawnIn -= dt;
    if (this.spawnIn <= 0 && this.bugs.length < 4) {
      const b = this.add(s.add.sprite(R(-150, 150), R(-60, 80), 'mg_mosquito').setScale(3).play('mg_mosquito_fly'));
      b.t = Math.random() * 10;
      b.cx = b.x;
      b.cy = b.y;
      b.setInteractive({ useHandCursor: true });
      b.on('pointerdown', () => this.swat(b));
      this.bugs.push(b);
      this.spawnIn = R(500, 1000);
    }
    for (const b of this.bugs) {
      b.t += dt / 1000;
      b.x = b.cx + Math.sin(b.t * 2.3) * 60;
      b.y = b.cy + Math.sin(b.t * 3.7) * 30;
      b.cx = Phaser.Math.Clamp(b.cx + Math.sin(b.t) * 0.5, -140, 140);
    }
  }

  swat(b) {
    if (!this.running || !b.active) return;
    this.count++;
    sfx.slash();
    this.popText('แปะ!', COLORS.text, b.x, b.y - 10);
    this.bugs = this.bugs.filter((x) => x !== b);
    b.destroy();
    this.setScoreText(`ตบได้ ${this.count} ตัว`);
  }
}

const NIGHT_GAMES = [Sheep, Shutters, Mosquito];

/** เริ่มมินิเกมกลางคืนแบบสุ่ม (เล่นเพลิน ๆ ระหว่างรอเช้า) */
export function startNightGame(scene, { x = 320, y = 196, layer, onDone }) {
  ensureMoreTextures(scene);
  const root = scene.add.container(x, y);
  layer?.add(root);
  const Game = NIGHT_GAMES[Math.floor(Math.random() * NIGHT_GAMES.length)];
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

export { ensureMoreTextures };
