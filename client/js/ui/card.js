// การ์ดสถานที่ และอนิเมชั่นจั่วการ์ด / พลิก / เลือก
import { CARD_W, CARD_H } from '../art/textures.js';
import { canvas, rect, addSheet } from '../art/pixel.js';
import { LOCATIONS } from '../data.js';
import { sfx } from '../sfx.js';
import { txt, COLORS } from './widgets.js';

const SHINE_FRAMES = 10;

function ensureShine(scene) {
  if (scene.textures.exists('card_shine')) return;
  const frames = [];
  for (let f = 0; f < SHINE_FRAMES; f++) {
    const { c, ctx } = canvas(CARD_W, CARD_H);
    const off = -40 + f * ((CARD_W + 80) / (SHINE_FRAMES - 1));
    for (let y = 2; y < CARD_H - 2; y++) {
      const x = Math.floor(off + y * 0.5);
      rect(ctx, Math.max(2, x), y, Math.max(0, Math.min(6, CARD_W - 2 - x)), 1, 'rgba(255,255,255,0.55)');
      rect(ctx, Math.max(2, x + 8), y, Math.max(0, Math.min(2, CARD_W - 2 - x - 8)), 1, 'rgba(255,255,255,0.35)');
    }
    frames.push(c);
  }
  addSheet(scene, 'card_shine', frames, CARD_W, CARD_H);
  scene.anims.create({
    key: 'card_shine_play',
    frames: scene.anims.generateFrameNumbers('card_shine', { start: 0, end: SHINE_FRAMES - 1 }),
    frameRate: 30,
  });
}

export class Card extends Phaser.GameObjects.Container {
  // lair = การ์ดที่ซุ่มของจ่าฝูง (ภาพมืด ตาแดง แทนแต้มเควส)
  constructor(scene, x, y, locKey, { lair = false } = {}) {
    super(scene, x, y);
    ensureShine(scene);
    this.locKey = locKey;
    this.faceUp = false;
    const loc = LOCATIONS[locKey];

    this.shadow = scene.add.image(3, 5, 'card_back').setTint(0x000000).setAlpha(0.35);
    this.body = scene.add.container(0, 0);
    this.glow = scene.add.image(0, 0, 'card_glow').setAlpha(0);
    this.back = scene.add.image(0, 0, 'card_back');
    this.front = scene.add.container(0, 0).setVisible(false);
    const fx = -CARD_W / 2;
    const fy = -CARD_H / 2;
    this.front.add(scene.add.image(0, 0, 'card_front'));
    const art = scene.add.image(0, fy + 24, 'loc_' + locKey).setDisplaySize(CARD_W - 8, 40);
    this.front.add(art);
    if (lair) {
      art.setTint(0x6a5a90);
      this.front.add(scene.add.rectangle(0, fy + 24, CARD_W - 8, 40, 0x0b0a1a, 0.35));
      this.front.add([scene.add.rectangle(-5, fy + 30, 4, 2, 0xff3030), scene.add.rectangle(5, fy + 30, 4, 2, 0xff3030)]);
      this.front.add(txt(scene, 0, fy + 50, loc.name, { size: 12, color: '#8a2a2e', shadow: false, bold: true }));
      this.front.add(txt(scene, 0, fy + 66, 'ที่ซุ่ม', { size: 10, color: COLORS.ink, shadow: false }));
    } else {
      this.front.add(txt(scene, 0, fy + 52, loc.name, { size: 12, color: COLORS.ink, shadow: false, bold: true }));
      const pips = scene.add.container(0, fy + 68);
      for (let i = 0; i < loc.points; i++) pips.add(scene.add.image((i - (loc.points - 1) / 2) * 9, 0, 'i_pip'));
      this.front.add(pips);
      if (loc.danger) this.front.add(scene.add.image(fx + CARD_W - 9, fy + 9, 'i_danger'));
    }
    this.shine = scene.add.sprite(0, 0, 'card_shine', 0).setVisible(false);
    this.body.add([this.glow, this.back, this.front, this.shine]);
    this.add([this.shadow, this.body]);
    this.setSize(CARD_W, CARD_H);
    scene.add.existing(this);
  }

  flip(toFace = true, dur = 300) {
    return new Promise((resolve) => {
      sfx.flip();
      this.scene.tweens.add({
        targets: this.body,
        scaleX: 0,
        scaleY: 1.08,
        y: this.body.y - 6,
        duration: dur / 2,
        ease: 'Quad.In',
        onComplete: () => {
          this.faceUp = toFace;
          this.front.setVisible(toFace);
          this.back.setVisible(!toFace);
          this.scene.tweens.add({
            targets: this.body,
            scaleX: 1,
            scaleY: 1,
            y: this.body.y + 6,
            duration: dur / 2,
            ease: 'Back.Out',
            onComplete: () => {
              if (toFace) this.playShine();
              resolve();
            },
          });
        },
      });
      this.scene.tweens.add({ targets: this.shadow, scaleX: 0, duration: dur / 2, yoyo: true, ease: 'Quad.In' });
    });
  }

  playShine() {
    this.shine.setVisible(true).play('card_shine_play');
    this.shine.once('animationcomplete', () => this.shine.setVisible(false));
  }

  hover(on) {
    const s = this.scene;
    s.tweens.killTweensOf(this.glow);
    s.tweens.add({ targets: this.body, y: on ? -10 : 0, duration: 160, ease: 'Back.Out' });
    s.tweens.add({ targets: this.shadow, y: on ? 10 : 5, alpha: on ? 0.22 : 0.35, duration: 160 });
    if (on) {
      this.glow.setAlpha(0.9);
      s.tweens.add({ targets: this.glow, alpha: 0.35, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    } else {
      s.tweens.add({ targets: this.glow, alpha: 0, duration: 120 });
    }
  }
}

function sparks(scene) {
  return scene.add.particles(0, 0, 'spark', {
    speed: { min: 60, max: 160 },
    lifespan: { min: 300, max: 650 },
    scale: { start: 1.2, end: 0 },
    rotate: { min: 0, max: 360 },
    gravityY: 120,
    emitting: false,
    blendMode: 'ADD',
  }).setDepth(150);
}

function dust(scene) {
  return scene.add.particles(0, 0, 'px2', {
    speed: { min: 15, max: 45 },
    angle: { min: 180, max: 360 },
    lifespan: 380,
    alpha: { start: 0.5, end: 0 },
    tint: 0xd8c8b0,
    emitting: false,
  }).setDepth(140);
}

// สำรับการ์ดวางซ้อนกัน มีอนิเมชั่นลอยเบา ๆ
export function makeDeck(scene, x, y) {
  const deck = scene.add.container(x, y);
  for (let i = 4; i >= 0; i--) {
    deck.add(scene.add.image(-i * 1.5, -i * 1.5, 'card_back').setTint(i ? 0xb0a8c0 : 0xffffff));
  }
  scene.tweens.add({ targets: deck, y: y - 3, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  return deck;
}

/**
 * จั่วการ์ดจากสำรับไปวางบนมือ แล้วพลิกทีละใบ ให้ผู้เล่นชี้และเลือก
 * คืนค่า Promise ที่จะได้ key ของสถานที่ที่เลือก (มี .cancel() ไว้ยกเลิกกลางคัน เช่น หมดเวลา)
 * onPick ถูกเรียกทันทีที่ผู้เล่นกดเลือก ก่อนอนิเมชั่นจบ
 */
export function dealHand(scene, { from, slots, locs, pickY = 150, size = 1.5, onPick = null, lair = false }) {
  const sp = sparks(scene);
  const du = dust(scene);
  const cards = [];
  const paths = [];
  let cancelled = false;

  const promise = new Promise((resolve) => {
    let landed = 0;
    locs.forEach((loc, i) => {
      const card = new Card(scene, from.x, from.y, loc, { lair }).setDepth(110 + i);
      cards.push(card);
      const target = slots[i];
      const tilt = (i - (locs.length - 1) / 2) * 0.07;
      const ctrl = { x: (from.x + target.x) / 2, y: Math.min(from.y, target.y) - 120 };
      const path = { t: 0 };
      paths.push(path);
      card.setScale(0.6 * size);
      scene.time.delayedCall(i * 170, () => !cancelled && sfx.deal());
      scene.tweens.add({
        targets: path,
        t: 1,
        delay: i * 170,
        duration: 560,
        ease: 'Cubic.Out',
        onUpdate: () => {
          const t = path.t;
          const u = 1 - t;
          card.x = u * u * from.x + 2 * u * t * ctrl.x + t * t * target.x;
          card.y = u * u * from.y + 2 * u * t * ctrl.y + t * t * target.y;
          card.rotation = -Math.PI * 2 * u + tilt;
          card.setScale((0.6 + 0.4 * t) * size);
        },
        onComplete: () => {
          if (cancelled) return;
          du.explode(8, card.x, card.y + 40 * size);
          scene.tweens.add({ targets: card, scaleY: 0.92 * size, scaleX: 1.06 * size, duration: 70, yoyo: true });
          card.homeY = card.y;
          landed++;
          if (landed === locs.length) revealAll();
        },
      });
    });

    async function revealAll() {
      for (const c of cards) {
        if (cancelled) return;
        await c.flip(true);
        if (cancelled) return;
        sp.explode(6, c.x, c.y - 20);
        await new Promise((r) => scene.time.delayedCall(70, r));
      }
      sfx.shine();
      cards.forEach((c, i) => {
        c.bob = scene.tweens.add({ targets: c, y: c.homeY - 3, duration: 1100 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        c.setInteractive({ useHandCursor: true });
        c.on('pointerover', () => {
          c.hover(true);
          sfx.hover();
          cards.forEach((o) => o !== c && scene.tweens.add({ targets: o, alpha: 0.75, duration: 120 }));
        });
        c.on('pointerout', () => {
          c.hover(false);
          cards.forEach((o) => scene.tweens.add({ targets: o, alpha: 1, duration: 120 }));
        });
        c.on('pointerup', () => pick(c));
      });
    }

    function pick(chosen) {
      if (cancelled) return;
      onPick?.(chosen.locKey);
      cards.forEach((c) => {
        c.disableInteractive();
        c.bob?.stop();
      });
      sfx.select();
      cards.forEach((c, i) => {
        if (c === chosen) return;
        scene.tweens.add({
          targets: c,
          y: c.y + 200,
          x: c.x + (i - 1) * 30,
          rotation: c.rotation + (c.x < chosen.x ? -0.8 : 0.8),
          alpha: 0,
          duration: 420,
          ease: 'Back.In',
          onComplete: () => c.destroy(),
        });
      });
      chosen.hover(false);
      chosen.setDepth(130);
      scene.tweens.add({
        targets: chosen,
        x: 320,
        y: pickY,
        rotation: 0,
        scale: 1.3 * size,
        duration: 480,
        ease: 'Back.Out',
        onComplete: () => {
          if (cancelled) return;
          scene.cameras.main.shake(90, 0.003);
          sp.explode(26, chosen.x, chosen.y);
          chosen.playShine();
          sfx.shine();
          scene.time.delayedCall(650, async () => {
            if (cancelled) return;
            await chosen.flip(false, 360);
            if (cancelled) return;
            scene.tweens.add({
              targets: chosen,
              scale: 0.75 * size,
              y: pickY + 40,
              duration: 320,
              ease: 'Quad.InOut',
              onComplete: () => resolve({ loc: chosen.locKey, card: chosen }),
            });
          });
        },
      });
    }
  });

  promise.cancel = () => {
    cancelled = true;
    scene.tweens.killTweensOf(paths);
    cards.forEach((c) => {
      if (!c.active) return;
      scene.tweens.killTweensOf([c, c.body, c.shadow, c.glow]);
      c.destroy();
    });
    sp.destroy();
    du.destroy();
  };
  return promise;
}
