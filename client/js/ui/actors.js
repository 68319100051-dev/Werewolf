// ตัวละครในลานหมู่บ้าน + ป้ายชื่อใต้เท้า (ไอคอนอาชีพ ชื่อ หัวใจ อยู่แถวเดียวกัน ไม่ทับหัวใคร)
import { addCharacter, ensureCharacter, outfitKey } from '../art/character.js';
import { txt, fitText, COLORS } from './widgets.js';
import { sfx } from '../sfx.js';

export class Actor {
  /**
   * layer: container ของตัวละคร (เรียงความลึกตามแกน y)
   * top: container ที่อยู่ชั้นบนสุด (ป้ายชื่อ ป้ายโหวต) เพื่อไม่ให้ตัวละครแถวหน้าบัง
   */
  constructor(scene, p, x, y, { layer, top, isMe = false }) {
    this.scene = scene;
    this.id = p.id;
    this.x = x;
    this.y = y;
    this.outfitKey = outfitKey(p.outfit);
    this.alive = true;
    this.sprite = addCharacter(scene, x, y, p.outfit, 2).setInteractive({ useHandCursor: true });
    this.tomb = scene.add.image(x, y, 'tomb').setOrigin(0.5, 1).setScale(2).setVisible(false);
    layer.add([this.tomb, this.sprite]);
    this.layer = layer;

    this.plate = scene.add.container(x, y + 9);
    this.plateBg = scene.add.rectangle(0, 0, 10, 13, 0x0b0a1a, 0.62);
    this.roleIcon = scene.add.image(0, 0, 'r_villager').setVisible(false);
    this.crown = scene.add.image(0, 0, 'i_crown').setVisible(false);
    this.name = fitText(txt(scene, 0, 0, p.name, { size: 10, color: isMe ? COLORS.gold : COLORS.text }), 70);
    this.fullName = p.name;
    this.hearts = [0, 1].map(() => scene.add.image(0, 0, 'i_heart').setScale(0.75).setVisible(false));
    this.check = scene.add.image(0, 0, 'i_check').setVisible(false);
    this.plate.add([this.plateBg, this.roleIcon, this.crown, this.name, ...this.hearts, this.check]);

    this.badge = scene.add.container(x, y - 70).setVisible(false);
    this.badge.add([
      scene.add.nineslice(0, 0, 'panel_paper', undefined, 30, 18, 6, 6, 6, 6),
      scene.add.image(-7, 0, 'i_vote').setTint(0x2a1c18),
    ]);
    this.badgeCount = txt(scene, 6, 0, '0', { size: 11, color: COLORS.ink, shadow: false });
    this.badge.add(this.badgeCount);
    this.mine = scene.add.image(x, y - 90, 'i_vote').setScale(1.5).setTint(0xffe08a).setVisible(false);
    scene.tweens.add({ targets: this.mine, y: y - 86, duration: 400, yoyo: true, repeat: -1 });
    top.add([this.plate, this.badge, this.mine]);
    this.parts = [this.tomb, this.sprite, this.plate, this.badge, this.mine];
    this.setDepthY(y);
    this.layout();
  }

  setDepthY(y) {
    this.tomb.setDepth(y);
    this.sprite.setDepth(y);
  }

  // จัดเรียงของในป้ายชื่อ: [ไอคอน] ชื่อ [หัวใจ][เครื่องหมายถูก]
  layout() {
    const items = [];
    if (this.crown.visible) items.push([this.crown, 9]);
    if (this.roleIcon.visible) items.push([this.roleIcon, 11]);
    items.push([this.name, this.name.width - 3]);
    this.hearts.forEach((h) => h.visible && items.push([h, 7]));
    if (this.check.visible) items.push([this.check, 10]);
    const gap = 3;
    const total = items.reduce((s, [, w]) => s + w, 0) + gap * (items.length - 1);
    let x = -total / 2;
    for (const [o, w] of items) {
      o.x = x + w / 2;
      x += w + gap;
    }
    this.plateBg.width = total + 8;
    this.fitPlate();
  }

  // ป้ายชื่อของคนที่นั่งชิดขอบจอ: เลื่อนเข้ามาไม่ให้ล้นจอ
  fitPlate() {
    const half = this.plateBg.width / 2 + 2;
    this.plate.x = Phaser.Math.Clamp(this.x ?? this.plate.x, half, 640 - half);
  }

  setName(name) {
    if (this.fullName !== name) {
      this.fullName = name;
      // ชื่อยาวมาก ๆ ตัดให้ป้ายไม่ชนป้ายของคนข้าง ๆ
      fitText(this.name.setText(name), 70);
      this.layout();
    }
  }

  // แสดงหัวใจเฉพาะคนที่บาดเจ็บ (เลือดเต็มไม่ต้องโชว์ ป้ายชื่อจะได้ไม่รก)
  setHearts(hp) {
    const show = hp !== null && hp < 2;
    this.hearts.forEach((h, i) => h.setVisible(show).setTexture(i < hp ? 'i_heart' : 'i_heart_empty'));
    this.layout();
    if (show) {
      this.plate.setScale(1.3);
      this.scene.tweens.add({ targets: this.plate, scale: 1, duration: 300, ease: 'Back.Out' });
    }
  }

  setRole(icon) {
    const on = !!icon;
    if (on) this.roleIcon.setTexture(icon);
    if (this.roleIcon.visible !== on) {
      this.roleIcon.setVisible(on);
      this.layout();
    }
  }

  setCrown(on) {
    if (this.crown.visible !== on) {
      this.crown.setVisible(on);
      this.layout();
    }
  }

  // เครื่องหมายหน้าชื่อ (เช่น หัวใจของคู่รัก) ใช้ช่องเดียวกับมงกุฎ
  setMark(texture) {
    const on = !!texture;
    if (on) this.crown.setTexture(texture);
    if (this.crown.visible !== on) {
      this.crown.setVisible(on);
      this.layout();
    }
  }

  // ฟื้นคืนชีพ (นักบวช)
  revive() {
    this.alive = true;
    sfx.revive();
    const s = this.scene;
    s.tweens.killTweensOf([this.sprite, this.tomb]);
    this.tomb.setVisible(false);
    this.sprite.setVisible(true).setAlpha(0).setY(this.y + 10);
    this.name.setAlpha(1);
    s.tweens.add({ targets: this.sprite, alpha: 1, y: this.y, duration: 800, ease: 'Back.Out' });
    const glow = s.add.image(this.x, this.y - 30, 'glow').setScale(2).setBlendMode('ADD').setDepth(this.y + 1);
    this.layer.add(glow);
    s.tweens.add({ targets: glow, alpha: 0, scale: 3, duration: 1200, onComplete: () => glow.destroy() });
  }

  setCheck(on) {
    if (this.check.visible !== on) {
      this.check.setVisible(on);
      this.layout();
      if (on) {
        this.check.setScale(0);
        this.scene.tweens.add({ targets: this.check, scale: 1, duration: 200, ease: 'Back.Out' });
      }
    }
  }

  setBadge(n) {
    this.badge.setVisible(n > 0);
    if (n > 0 && this.badgeCount.text !== String(n)) {
      this.badgeCount.setText(String(n));
      this.badge.setScale(1.4);
      this.scene.tweens.add({ targets: this.badge, scale: 1, duration: 200, ease: 'Back.Out' });
    }
  }

  setMine(on) {
    this.mine.setVisible(on);
  }

  setConnected(on) {
    this.sprite.setAlpha(on ? 1 : 0.45);
    this.name.setAlpha(on ? 1 : 0.6);
  }

  setOutfit(outfit) {
    const key = outfitKey(outfit);
    if (key === this.outfitKey) return;
    ensureCharacter(this.scene, outfit);
    this.outfitKey = key;
    this.sprite.play(key + '_idle');
  }

  faceFire(fireX = 200) {
    this.sprite.setFlipX(this.x > fireX);
  }

  place(x, y) {
    this.x = x;
    this.y = y;
    this.sprite.setPosition(x, y);
    this.tomb.setPosition(x, y);
    this.plate.setPosition(x, y + 9);
    this.fitPlate();
    this.badge.setPosition(x, y - 70);
    this.mine.setPosition(x, y - 90);
    this.setDepthY(y);
    this.layer.sort('depth');
  }

  walkTo(x, y, done) {
    this.walking = true;
    this.sprite.play(this.outfitKey + '_walk');
    this.sprite.setFlipX(x < this.x);
    const proxy = { x: this.x, y: this.y };
    const dist = Phaser.Math.Distance.Between(this.x, this.y, x, y);
    this.scene.tweens.add({
      targets: proxy,
      x,
      y,
      duration: Math.max(300, dist * 9),
      onUpdate: () => this.place(proxy.x, proxy.y),
      onComplete: () => {
        this.walking = false;
        this.sprite.play(this.outfitKey + '_idle');
        this.faceFire();
        done?.();
      },
    });
  }

  // คลื่นเสียงข้างหัวตอนกำลังพูดผ่านไมค์
  setTalking(on) {
    if (!this.wave) {
      this.wave = this.scene.add.image(this.x + 16, this.y - 56, 'i_wave').setVisible(false);
      this.plate.parentContainer?.add(this.wave);
      this.parts.push(this.wave);
    }
    this.wave.setPosition(this.x + 16, this.y - 56);
    this.scene.tweens.killTweensOf(this.wave);
    this.wave.setVisible(on).setAlpha(1).setScale(1);
    if (on) this.scene.tweens.add({ targets: this.wave, scaleX: 1.3, alpha: 0.6, duration: 180, yoyo: true, repeat: -1 });
    this.sprite.setTint(on ? 0xfff6d8 : 0xffffff);
    if (!on) this.sprite.clearTint();
  }

  // อีโมต: ไอคอนเด้งเหนือหัว + ท่าทางของตัวละคร
  emote(key) {
    const s = this.scene;
    if (!this.sprite.visible) return;
    sfx.emote(key);
    this.emoteIcon?.destroy();
    const icon = s.add.image(this.x, this.y - 72, 'em_' + key).setScale(0).setDepth(9999);
    this.plate.parentContainer?.add(icon);
    this.emoteIcon = icon;
    s.tweens.add({ targets: icon, scale: 2.2, duration: 200, ease: 'Back.Out' });
    s.tweens.add({ targets: icon, y: icon.y - 8, alpha: 0, delay: 1600, duration: 400, onComplete: () => icon.destroy() });
    const sp = this.sprite;
    s.tweens.killTweensOf(sp);
    sp.setAngle(0).setY(this.y);
    if (key === 'wave') s.tweens.add({ targets: sp, angle: 8, duration: 120, yoyo: true, repeat: 3 });
    else if (key === 'laugh') s.tweens.add({ targets: sp, y: this.y - 6, duration: 110, yoyo: true, repeat: 3 });
    else if (key === 'angry') {
      sp.setTint(0xff9090);
      s.tweens.add({ targets: sp, x: this.x + 3, duration: 50, yoyo: true, repeat: 5, onComplete: () => sp.clearTint() });
    } else if (key === 'shock') s.tweens.add({ targets: sp, y: this.y - 14, duration: 140, yoyo: true, ease: 'Quad.Out' });
    else if (key === 'cry') {
      for (let i = 0; i < 4; i++) {
        const t = s.add.rectangle(this.x + (i % 2 ? 6 : -6), this.y - 44, 2, 3, 0x7ab8ff).setDepth(9999);
        this.plate.parentContainer?.add(t);
        s.tweens.add({ targets: t, y: t.y + 16, alpha: 0, delay: i * 200, duration: 500, onComplete: () => t.destroy() });
      }
    } else if (key === 'what') s.tweens.add({ targets: sp, angle: -10, duration: 200, yoyo: true, hold: 500 });
  }

  // ท่าทางในคัตซีน: ตกใจ / ดีใจ / เสียใจ
  react(kind) {
    const s = this.scene;
    if (!this.alive) return;
    if (kind === 'gasp') {
      const t = txt(s, this.x, this.y - 66, '!', { size: 18, color: COLORS.red, bold: true }).setDepth(this.y + 1);
      this.layer.add(t);
      t.setScale(0);
      s.tweens.add({ targets: t, scale: 1, duration: 180, ease: 'Back.Out' });
      s.tweens.add({ targets: t, alpha: 0, y: t.y - 8, delay: 1400, duration: 300, onComplete: () => t.destroy() });
      s.tweens.add({ targets: this.sprite, y: this.y - 4, duration: 90, yoyo: true });
    } else if (kind === 'cheer') {
      s.tweens.add({ targets: this.sprite, y: this.y - 10, duration: 260, yoyo: true, repeat: 5, delay: Math.random() * 300, ease: 'Quad.Out' });
    } else if (kind === 'sad') {
      this.sprite.setTint(0x8a8aa0);
    }
  }

  die(animate) {
    this.alive = false;
    this.setHearts(null);
    this.name.setAlpha(0.6);
    if (!animate) {
      this.sprite.setVisible(false);
      this.tomb.setVisible(true);
      return;
    }
    const s = this.scene;
    sfx.die();
    s.time.delayedCall(1150, () => sfx.thud());
    s.tweens.add({ targets: this.sprite, alpha: 0, y: this.y - 30, duration: 900, ease: 'Quad.In', onComplete: () => this.sprite.setVisible(false) });
    this.tomb.setVisible(true).setY(this.y - 160).setAlpha(0);
    s.tweens.add({ targets: this.tomb, y: this.y, alpha: 1, duration: 700, delay: 700, ease: 'Bounce.Out' });
  }

  destroy(animate) {
    const kill = () => this.parts.forEach((o) => o.destroy());
    if (!animate) return kill();
    this.scene.tweens.add({ targets: this.parts, alpha: 0, duration: 300, onComplete: kill });
  }
}
