// ชิ้นส่วน UI พิกเซล: ข้อความ ปุ่ม แผง สวิตช์ ตัวเลือก ช่องพิมพ์ หน้าต่างป๊อปอัป
import { FONT } from '../data.js';
import { sfx } from '../sfx.js';

export const COLORS = {
  text: '#f2efe8',
  dim: '#a89fb8',
  gold: '#e8b84a',
  red: '#e0565e',
  green: '#7ac870',
  ink: '#2a1c18',
  shadow: '#120e18',
};

export function txt(scene, x, y, str, opts = {}) {
  const { size = 14, color = COLORS.text, origin = 0.5, align = 'center', wrap = 0, shadow = true, bold = false } = opts;
  const t = scene.add.text(x, y, str, {
    fontFamily: FONT,
    fontSize: size + 'px',
    fontStyle: bold ? 'bold' : 'normal',
    color,
    align,
    padding: { top: 4, bottom: 3, left: 1, right: 2 },
    wordWrap: wrap ? { width: wrap, useAdvancedWrap: true } : undefined,
  });
  if (shadow) t.setShadow(1, 1, opts.shadowColor || COLORS.shadow, 0, false, true);
  if (Array.isArray(origin)) t.setOrigin(origin[0], origin[1]);
  else t.setOrigin(origin);
  return t;
}

// ตัดข้อความบรรทัดเดียวให้กว้างไม่เกิน maxW (ต่อท้ายด้วย …) เช่น ชื่อยาว ๆ ใต้ตัวละคร
export function fitText(t, maxW) {
  const full = t.text;
  let n = full.length;
  while (t.width > maxW && n > 2) t.setText(full.slice(0, --n) + '…');
  return t;
}

// กล่องคำพูดเหนือหัว: ถ้าทับกล่องของคนข้าง ๆ ให้ดันขึ้นไปเรื่อย ๆ
export function stackBubble(c, w, others) {
  c.bw = w;
  for (let k = 0; k < 5; k++) {
    const hit = others.some((o) => o !== c && o?.active && Math.abs(o.x - c.x) < (w + o.bw) / 2 + 2 && Math.abs(o.y - c.y) < 24);
    if (!hit) break;
    c.y -= 24;
  }
}

export function panel(scene, x, y, w, h, tex = 'panel') {
  return scene.add.nineslice(x, y, tex, undefined, w, h, 8, 8, 8, 8);
}

export class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, label, opts = {}) {
    super(scene, x, y);
    const { w = 140, h = 28, icon = null, color = 'btn', size = 14, onClick = null } = opts;
    this.w = w;
    this.h = h;
    this.onClick = onClick;
    this.enabled = true;
    this.slices = ['', '_hover', '_down'].map((s) => scene.add.nineslice(0, 0, color + s, undefined, w, h, 5, 5, 5, 6));
    this.slices[1].setVisible(false);
    this.slices[2].setVisible(false);
    this.content = scene.add.container(0, -1);
    this.label = txt(scene, 0, 0, label, { size });
    if (icon) {
      this.icon = scene.add.image(0, 0, icon);
      this.content.add(this.icon);
    }
    this.content.add(this.label);
    this.layoutContent();
    this.add([...this.slices, this.content]);
    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });

    this.on('pointerover', () => {
      if (!this.enabled) return;
      this.look('_hover');
      sfx.hover();
      scene.tweens.add({ targets: this, scale: 1.04, duration: 90, ease: 'Quad.Out' });
    });
    this.on('pointerout', () => {
      this.look('');
      scene.tweens.add({ targets: this, scale: 1, duration: 90 });
    });
    this.on('pointerdown', () => {
      if (!this.enabled) return;
      this.look('_down');
      this.content.y = 1;
    });
    this.on('pointerup', () => {
      if (!this.enabled) return;
      this.look('_hover');
      this.content.y = -1;
      sfx.click();
      scene.tweens.add({ targets: this, scaleX: 1.1, scaleY: 0.9, duration: 60, yoyo: true, ease: 'Quad.Out' });
      this.onClick?.();
    });
    scene.add.existing(this);
  }

  layoutContent() {
    if (this.icon) {
      const total = this.icon.width + 5 + this.label.width;
      this.icon.x = -total / 2 + this.icon.width / 2;
      this.label.x = this.icon.x + this.icon.width / 2 + 5 + this.label.width / 2;
    } else {
      this.label.x = 0;
    }
  }

  look(suffix) {
    this.slices.forEach((s, i) => s.setVisible(['', '_hover', '_down'][i] === suffix));
  }

  setLabel(str) {
    this.label.setText(str);
    this.layoutContent();
    return this;
  }

  setEnabled(on) {
    this.enabled = on;
    this.setAlpha(on ? 1 : 0.45);
    if (!on) this.look('');
    return this;
  }
}

export function iconButton(scene, x, y, icon, onClick, color = 'btn_dark') {
  return new Button(scene, x, y, '', { w: 26, h: 24, icon, color, onClick });
}

export class Toggle extends Phaser.GameObjects.Container {
  constructor(scene, x, y, label, value, onChange, width = 200) {
    super(scene, x, y);
    this.value = value;
    this.onChange = onChange;
    this.box = scene.add.nineslice(0, 0, 'slot', undefined, 16, 16, 4, 4, 4, 4).setOrigin(0, 0.5);
    this.check = scene.add.image(8, 0, 'i_check');
    this.text = txt(scene, 24, 0, label, { size: 13, origin: [0, 0.5] });
    // พื้นที่กดครอบทั้งช่องและข้อความ (โซนลูก จะได้ไม่เพี้ยนตามจุดกึ่งกลางของคอนเทนเนอร์)
    const hit = scene.add.zone(width / 2, 0, width, 20).setInteractive({ useHandCursor: true });
    this.add([this.box, this.check, this.text, hit]);
    hit.on('pointerover', () => this.text.setColor(COLORS.gold));
    hit.on('pointerout', () => this.text.setColor(COLORS.text));
    hit.on('pointerup', () => {
      this.set(!this.value);
      sfx.click();
      this.onChange?.(this.value);
    });
    this.set(value, true);
    scene.add.existing(this);
  }

  set(v, silent) {
    this.value = v;
    this.box.setTexture(v ? 'slot_on' : 'slot');
    this.check.setVisible(v);
    if (v && !silent) {
      this.check.setScale(0);
      this.scene.tweens.add({ targets: this.check, scale: 1, duration: 200, ease: 'Back.Out' });
    }
  }
}

export class Cycler extends Phaser.GameObjects.Container {
  constructor(scene, x, y, label, options, value, onChange, width = 260) {
    super(scene, x, y);
    this.options = options;
    this.index = Math.max(0, options.findIndex((o) => o.value === value));
    this.onChange = onChange;
    this.text = txt(scene, 0, 0, label, { size: 13, origin: [0, 0.5] });
    const vx = width - 70;
    this.valueBg = scene.add.nineslice(vx, 0, 'slot', undefined, 96, 20, 4, 4, 4, 4);
    this.valueText = txt(scene, vx, 0, '', { size: 13, color: COLORS.gold });
    const arrow = (dx, dir, key) => {
      const a = scene.add.image(vx + dx, 0, key).setInteractive({ useHandCursor: true });
      a.on('pointerup', () => this.step(dir));
      a.on('pointerover', () => a.setTint(0xffe08a));
      a.on('pointerout', () => a.clearTint());
      return a;
    };
    this.add([this.text, this.valueBg, this.valueText, arrow(-58, -1, 'i_left'), arrow(58, 1, 'i_right')]);
    this.refresh();
    scene.add.existing(this);
  }

  step(dir) {
    this.index = (this.index + dir + this.options.length) % this.options.length;
    sfx.click();
    this.refresh();
    this.valueText.y = dir * -4;
    this.valueText.alpha = 0;
    this.scene.tweens.add({ targets: this.valueText, y: 0, alpha: 1, duration: 140, ease: 'Quad.Out' });
    this.onChange?.(this.value);
  }

  get value() {
    return this.options[this.index].value;
  }

  refresh() {
    this.valueText.setText(this.options[this.index].label);
  }
}

export function domInput(scene, x, y, width, opts = {}) {
  const el = document.createElement('input');
  el.className = 'px-input';
  el.type = opts.type || 'text';
  el.maxLength = opts.maxLength || 16;
  el.placeholder = opts.placeholder || '';
  el.value = opts.value || '';
  el.autocomplete = 'off';
  el.spellcheck = false;
  el.style.width = width + 'px';
  if (opts.upper) el.style.textTransform = 'uppercase';
  el.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') opts.onEnter?.(el.value);
  });
  const dom = scene.add.dom(x, y, el);
  return { el, dom };
}

// หน้าต่างป๊อปอัปกลางจอ
export function modal(scene, { title, w = 280, h = 150, build }) {
  const overlay = scene.add.rectangle(320, 180, 640, 360, 0x07060c, 0.65).setInteractive().setDepth(900);
  const box = scene.add.container(320, 180).setDepth(901);
  box.add(panel(scene, 0, 0, w, h));
  if (title) box.add(txt(scene, 0, -h / 2 + 18, title, { size: 16, color: COLORS.gold }));
  const doms = [];
  // ซ่อนช่องพิมพ์/แชทของหน้าเดิมไว้ เพราะ HTML จะลอยทับป๊อปอัปเสมอ
  const hidden = scene.children.list.filter((o) => o instanceof Phaser.GameObjects.DOMElement && o.visible);
  hidden.forEach((d) => d.setVisible(false));
  // นับป๊อปอัปที่เปิดอยู่ ให้หน้าที่เปิดแชทเองตามเฟส (หน้าเกม) รู้ว่าต้องรอก่อน
  scene.modalsOpen = (scene.modalsOpen || 0) + 1;
  const api = {
    box,
    addDom(d) {
      doms.push(d);
      d.setDepth(902);
      return d;
    },
    close() {
      sfx.back();
      doms.forEach((d) => d.destroy());
      scene.modalsOpen = Math.max(0, scene.modalsOpen - 1);
      hidden.forEach((d) => d.active && d.setVisible(true));
      scene.onModalClosed?.();
      scene.tweens.add({ targets: box, scale: 0.85, alpha: 0, duration: 120, onComplete: () => box.destroy() });
      scene.tweens.add({ targets: overlay, alpha: 0, duration: 140, onComplete: () => overlay.destroy() });
    },
  };
  build?.(api);
  overlay.alpha = 0;
  box.setScale(0.7);
  box.alpha = 0;
  scene.tweens.add({ targets: overlay, alpha: 1, duration: 150 });
  scene.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 220, ease: 'Back.Out' });
  return api;
}

// ปุ่มต่าง ๆ บินเข้ามาทีละอัน
export function staggerIn(scene, items, { dx = 0, dy = 20, delay = 60, start = 0 } = {}) {
  items.forEach((it, i) => {
    const tx = it.x;
    const ty = it.y;
    it.x += dx;
    it.y += dy;
    it.alpha = 0;
    scene.tweens.add({ targets: it, x: tx, y: ty, alpha: 1, duration: 320, delay: start + i * delay, ease: 'Back.Out' });
  });
}

export function go(scene, key, data) {
  const fx = scene.scene.get('Fx');
  // ฉากเอฟเฟกต์ยังโหลดไม่เสร็จ: เปลี่ยนหน้าตรง ๆ ไปก่อน
  if (!fx?.tiles) return scene.scene.start(key, data);
  fx.transition(() => scene.scene.start(key, data));
}

export function toast(scene, msg, kind = 'info') {
  const fx = scene.scene.get('Fx');
  if (fx?.toasts) fx.toast(msg, kind);
}
