// ตู้กาชาแต่งตัว (นอกเกม): ใช้เหรียญที่ได้จากการเล่น หมุนได้ของแต่งตัวพิเศษ
// ของทุกชิ้นใส่แล้วเป็นเบาะแสในเกมได้ ไม่ได้ทำให้เก่งขึ้น
import { net } from '../net.js';
import { sfx } from '../sfx.js';
import { wallet } from '../wallet.js';
import { CATALOG, RARITY, BOXES } from '/catalog.js';
import { addCharacter } from '../art/character.js';
import { Button, txt, fitText, panel, modal, go, toast, COLORS } from '../ui/widgets.js';
import { ensureEmoteTextures } from '../ui/emotes.js';
import { plateStyle, plateDeco, paintPlate } from '../ui/plates.js';
import { prefs } from '../prefs.js';

const CAPSULE_COLORS = [0xe0565e, 0x5a9ae0, 0x7ac870, 0xe8b84a, 0xc080f0, 0xf08ac0];
const hex = (c) => Phaser.Display.Color.HexStringToColor(c).color;
const RANK = { rare: 0, epic: 1, legendary: 2 };

export class Gacha extends Phaser.Scene {
  constructor() {
    super('Gacha');
  }

  create() {
    this.busy = false;
    ensureEmoteTextures(this);
    this.box = prefs.get('gachaBox', 'outfit');
    if (!BOXES[this.box]) this.box = 'outfit';
    txt(this, 320, 22, 'ตู้กาชา', { size: 20, color: COLORS.gold });
    // เลือกตู้ (ใช้เหรียญกองเดียวกัน)
    this.tabs = Object.entries(BOXES).map(([key, b], i) => {
      const btn = new Button(this, 176 + i * 96, 52, b.name, { w: 90, h: 22, size: 12, color: 'btn_dark', onClick: () => this.setBox(key) });
      btn.key = key;
      return btn;
    });
    this.buildMachine(180, 206);
    this.buildPanel(452, 186);

    const back = new Button(this, 580, 330, 'กลับ', { w: 80, color: 'btn_dark', onClick: () => !this.busy && go(this, 'Menu') });
    const dress = new Button(this, 474, 330, 'ไปแต่งตัว', { w: 116, icon: 'i_shirt', onClick: () => !this.busy && go(this, 'Wardrobe', { back: 'Gacha' }) });
    this.add.existing(back);
    this.add.existing(dress);

    this.onWallet = () => this.refresh();
    wallet.events.on('change', this.onWallet);
    this.events.once('shutdown', () => wallet.events.off('change', this.onWallet));
    this.setBox(this.box, true);
  }

  setBox(key, first = false) {
    if (this.busy) return;
    this.box = key;
    prefs.set('gachaBox', key);
    this.tabs.forEach((t) => t.setAlpha(t.key === key ? 1 : 0.5));
    const color = Phaser.Display.Color.HexStringToColor(BOXES[key].color).color;
    this.body.setFillStyle(color);
    if (!first) {
      sfx.click();
      this.tweens.add({ targets: this.machine, scaleY: 0.94, duration: 80, yoyo: true });
    }
    this.boxTitle.setText(`ตู้${BOXES[key].name}`);
    this.refresh();
  }

  // ---------- ตู้ ----------
  buildMachine(x, y) {
    const m = this.add.container(x, y);
    this.machine = m;
    // ฐานและตัวตู้
    m.add(this.add.rectangle(0, 92, 150, 12, 0x000000, 0.3));
    this.body = this.add.rectangle(0, 40, 128, 100, 0xa82a34).setStrokeStyle(3, 0x120e18);
    m.add(this.body);
    m.add(this.add.rectangle(-54, 40, 12, 96, 0xd04a52));
    m.add(this.add.rectangle(54, 40, 12, 96, 0x7a1a24));
    m.add(this.add.rectangle(0, 2, 128, 8, 0xe8b84a).setStrokeStyle(2, 0x120e18));
    // ช่องปล่อยแคปซูล
    m.add(this.add.rectangle(0, 66, 46, 26, 0x1a1420).setStrokeStyle(2, 0x120e18));
    m.add(this.add.rectangle(0, 56, 46, 6, 0x3a2e44));
    // ช่องหยอดเหรียญ
    m.add(this.add.rectangle(36, 24, 14, 20, 0x3a2e44).setStrokeStyle(2, 0x120e18));
    m.add(this.add.rectangle(36, 24, 3, 12, 0x0b0a1a));
    // โดมแก้วกับแคปซูลข้างใน
    m.add(this.add.circle(0, -50, 62, 0x9ad0ff, 0.18).setStrokeStyle(3, 0xd8f0ff, 0.8));
    this.caps = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + Math.random();
      const r = 12 + Math.random() * 38;
      const cx = Math.cos(a) * r;
      const cy = -40 + Math.min(18, Math.sin(a) * r * 0.7 + 8);
      const cap = this.capsule(cx, cy, CAPSULE_COLORS[i % CAPSULE_COLORS.length], 0.9);
      m.add(cap);
      this.caps.push(cap);
    }
    m.add(this.add.ellipse(-24, -78, 26, 12, 0xffffff, 0.35).setAngle(-25));
    // ก้านหมุน
    this.crank = this.add.container(-30, 24);
    this.crank.add(this.add.circle(0, 0, 13, 0xe8b84a).setStrokeStyle(2, 0x120e18));
    this.crank.add(this.add.rectangle(0, 0, 22, 5, 0x8a6a20));
    this.crank.add(this.add.circle(9, 0, 3, 0xf2efe8));
    m.add(this.crank);
    // ป้ายชื่อตู้
    this.boxTitle = txt(this, 0, 45, '', { size: 12, color: '#fff0c0', bold: true });
    m.add(this.boxTitle);
    m.add(txt(this, 0, 104, 'หยอดเหรียญ หมุน รับของ!', { size: 10, color: COLORS.dim }));
  }

  capsule(x, y, color, scale = 1) {
    const c = this.add.container(x, y).setScale(scale);
    c.top = this.add.arc(0, 0, 10, 180, 360, false, color).setStrokeStyle(2, 0x120e18);
    c.bottom = this.add.arc(0, 0, 10, 0, 180, false, 0xf2efe8).setStrokeStyle(2, 0x120e18);
    c.add([c.bottom, c.top, this.add.rectangle(-3, -5, 4, 2, 0xffffff, 0.6)]);
    return c;
  }

  // ---------- แผงขวา ----------
  buildPanel(x, y) {
    const p = this.add.container(x, y);
    p.add(panel(this, 0, 0, 300, 236));
    p.add(this.add.image(-30, -98, 'i_coin').setScale(2));
    this.coinText = txt(this, -14, -98, '', { size: 18, color: COLORS.gold, bold: true, origin: [0, 0.5] });
    p.add(this.coinText);
    this.one = new Button(this, -72, -58, 'หมุน 1 ครั้ง · 100', { w: 136, h: 28, size: 12, color: 'btn_green', onClick: () => this.pull(1) });
    this.ten = new Button(this, 72, -58, 'หมุน 10 ครั้ง · 900', { w: 136, h: 28, size: 12, color: 'btn', onClick: () => this.pull(10) });
    p.add([this.one, this.ten]);
    const rates = Object.values(RARITY).map((r) => `${r.name} ${r.weight}%`).join(' · ');
    p.add(txt(this, 0, -26, rates, { size: 11 }));
    p.add(txt(this, 0, -8, 'หมุน 10 ครั้ง ได้ระดับล้ำค่าขึ้นไปแน่นอน 1 ชิ้น', { size: 10, color: COLORS.dim }));
    this.pityText = txt(this, 0, 10, '', { size: 11, color: RARITY.legendary.color });
    p.add(this.pityText);
    p.add(txt(this, 0, 28, 'ได้ของซ้ำ = คืนเหรียญ', { size: 10, color: COLORS.dim }));
    this.ownText = txt(this, -132, 56, '', { size: 12, origin: [0, 0.5] });
    p.add(this.ownText);
    p.add(new Button(this, 82, 56, 'ของสะสม', { w: 100, h: 24, size: 11, color: 'btn_dark', icon: 'i_book', onClick: () => !this.busy && this.collection() }));
    p.add(txt(this, 0, 96, 'ได้เหรียญทุกครั้งที่เล่นจบ 1 ตา\nชนะ / รอดถึงจบ / ตาแรกของวัน ได้เพิ่ม', { size: 10, color: COLORS.dim, wrap: 280 }));
  }

  refresh() {
    if (!this.coinText?.active) return;
    this.coinText.setText(`${wallet.coins} เหรียญ`);
    const pity = wallet.pity?.[this.box] || 0;
    const items = this.boxItems();
    this.pityText.setText(`การันตีระดับตำนาน: อีก ${Math.max(1, wallet.pityMax - pity)} ครั้ง`);
    this.ownText.setText(`สะสมแล้ว ${items.filter((it) => wallet.items.includes(it.id)).length}/${items.length} ชิ้น`);
    this.one.setEnabled(!this.busy && wallet.coins >= 100);
    this.ten.setEnabled(!this.busy && wallet.coins >= 900);
  }

  boxItems() {
    return CATALOG.filter((it) => it.box === this.box);
  }

  // ---------- หมุน ----------
  async pull(n) {
    if (this.busy) return;
    if (!net.loggedIn) return toast(this, 'ต้องล็อกอินก่อน', 'error');
    this.busy = true;
    this.refresh();
    const res = await net.call('gacha:roll', { box: this.box, count: n });
    if (!res.ok) {
      this.busy = false;
      sfx.error();
      toast(this, res.error || 'หมุนไม่ได้', 'error');
      return this.refresh();
    }
    // อัปเดตเหรียญหลังโชว์ของ (ไม่ให้ตัวเลขเด้งก่อนลุ้น)
    const best = res.results.reduce((b, r) => (RANK[r.rarity] > RANK[b] ? r.rarity : b), 'rare');
    await this.spin(best);
    wallet.set(res.wallet);
    if (n === 1) this.revealOne(res.results[0]);
    else this.revealMany(res.results);
  }

  spin(best) {
    return new Promise((resolve) => {
      sfx.coin();
      this.time.delayedCall(250, () => sfx.wind());
      this.tweens.add({ targets: this.crank, angle: '+=360', duration: 700, ease: 'Cubic.InOut' });
      this.tweens.add({ targets: this.machine, x: this.machine.x + 3, duration: 50, yoyo: true, repeat: 8, delay: 150 });
      this.caps.forEach((c, i) => this.tweens.add({ targets: c, y: c.y - 6 - Math.random() * 8, duration: 120, yoyo: true, repeat: 2, delay: 150 + i * 15 }));
      // แคปซูลหล่นออกจากช่อง สีตามของที่ดีที่สุด
      this.time.delayedCall(800, () => {
        const color = hex(RARITY[best].color);
        const cap = this.capsule(this.machine.x, this.machine.y + 60, color, 1.2);
        cap.setDepth(20);
        sfx.thud();
        this.tweens.add({
          targets: cap, y: this.machine.y + 118, duration: 420, ease: 'Bounce.Out',
          onComplete: () => {
            if (best === 'legendary') {
              sfx.drumroll();
              this.cameras.main.shake(300, 0.008);
              this.cameras.main.flash(250, 255, 220, 120);
            } else if (best === 'epic') sfx.shine();
            this.tweens.add({ targets: cap, scale: 1.6, alpha: 0, duration: 260, delay: best === 'legendary' ? 500 : 150, onComplete: () => {
              cap.destroy();
              resolve();
            } });
          },
        });
      });
    });
  }

  // การ์ดโชว์ของ 1 ชิ้น: ตัวละครของเราใส่ของชิ้นนั้น + ชื่อ + ระดับ
  itemCard(x, y, r, scale = 1) {
    const it = CATALOG.find((c) => c.id === r.id);
    const rar = RARITY[r.rarity];
    const c = this.add.container(x, y).setScale(scale);
    if (r.rarity !== 'rare') {
      const rays = this.add.star(0, -12, 12, 30, 92, hex(rar.color), 0.25);
      c.add(rays);
      this.tweens.add({ targets: rays, angle: 360, duration: 6000, repeat: -1 });
    }
    c.add(panel(this, 0, 0, 150, 176, 'panel_dark'));
    c.add(this.add.rectangle(0, -84, 146, 4, hex(rar.color)));
    c.add(txt(this, 0, -68, rar.name, { size: 12, color: rar.color, bold: true }));
    this.preview(c, it, 0, 46, 3);
    c.add(fitText(txt(this, 0, 62, it.name, { size: 13, color: COLORS.text, bold: true }), 140));
    if (r.dup) c.add(txt(this, 0, 79, `ซ้ำ! คืน +${r.refund} เหรียญ`, { size: 10, color: COLORS.dim }));
    else c.add(txt(this, 0, 79, 'ของใหม่!', { size: 10, color: COLORS.green }));
    return c;
  }

  // ภาพของแต่ละชนิด: ชุด = ตัวละครเราใส่ / อีโมต = ไอคอนลอยเหนือหัว / ป้ายชื่อ = ป้ายชื่อเราแบบนั้น
  preview(c, it, x, y, s) {
    const out = [];
    const add = (o) => {
      c.add(o);
      out.push(o);
      return o;
    };
    if (it.kind === 'outfit') {
      add(this.add.ellipse(x, y, 23 * s, 3.4 * s, 0x000000, 0.35));
      add(addCharacter(this, x, y, { ...net.profile.outfit, [it.part]: it.value }, s));
    } else if (it.kind === 'emote') {
      add(addCharacter(this, x, y, net.profile.outfit, s * 0.75));
      const icon = add(this.add.image(x, y - 30 * s, 'em_' + it.key).setScale(s * 1.2));
      this.tweens.add({ targets: icon, y: icon.y - 4, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    } else {
      // ป้ายชื่อใต้เท้าตัวละคร (ยกขึ้นไม่ให้ทับชื่อของชิ้นนี้ด้านล่าง)
      add(addCharacter(this, x, y - 12 * s, net.profile.outfit, s * 0.75));
      const plate = add(this.add.container(x, y - 3 * s).setScale(s * 0.6));
      const name = txt(this, 0, 0, net.profile.name, { size: 10 });
      const w = name.width + 8;
      const bg = this.add.rectangle(0, 0, w, 13);
      const style = plateStyle(it.key);
      paintPlate(bg, style);
      name.setColor(style.text);
      plate.add([bg, name]);
      plateDeco(this, plate, style, w, 13);
    }
    return out;
  }

  overlay() {
    const o = this.add.container(0, 0).setDepth(500);
    o.add(this.add.rectangle(320, 180, 640, 360, 0x07060c, 0.8).setInteractive());
    return o;
  }

  sparkle(x, y, color) {
    const p = this.add.particles(x, y, 'spark', {
      speed: { min: 60, max: 180 }, lifespan: 900, scale: { start: 1.4, end: 0 }, tint: hex(color), blendMode: 'ADD', emitting: false,
    }).setDepth(520);
    p.explode(30);
    this.time.delayedCall(1200, () => p.destroy());
  }

  close(o) {
    this.tweens.add({ targets: o, alpha: 0, duration: 200, onComplete: () => o.destroy() });
    this.busy = false;
    this.refresh();
  }

  revealOne(r) {
    const o = this.overlay();
    const card = this.itemCard(320, 160, r);
    o.add(card);
    card.setScale(0.2).setAlpha(0);
    this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 380, ease: 'Back.Out' });
    (r.rarity === 'legendary' ? sfx.win : r.dup ? sfx.coin : sfx.success)();
    this.sparkle(320, 150, RARITY[r.rarity].color);
    const it = CATALOG.find((c) => c.id === r.id);
    if (it.kind === 'emote') sfx.emote(it.key);
    // ชุด/ป้ายชื่อ ใส่ได้ทันที · อีโมตกดใช้ได้เลยในห้องรอและตอนประชุม
    const label = it.kind === 'emote' ? 'ใช้ได้เลยในแถบอีโมต' : null;
    if (label) o.add(txt(this, 320, 262, label, { size: 11, color: COLORS.dim }));
    else {
      o.add(new Button(this, 260, 278, 'ใส่เลย', { w: 100, color: 'btn_green', icon: 'i_shirt', onClick: () => {
        if (it.kind === 'plate') net.profile.plate = it.key;
        else net.profile.outfit = { ...net.profile.outfit, [it.part]: it.value };
        net.saveProfile();
        sfx.cloth();
        toast(this, `ใส่ ${it.name} แล้ว!`, 'success');
        this.close(o);
      } }));
    }
    o.add(new Button(this, label ? 320 : 380, 278 + (label ? 6 : 0), 'ตกลง', { w: 100, color: 'btn_dark', onClick: () => this.close(o) }));
  }

  revealMany(results) {
    const o = this.overlay();
    o.add(txt(this, 320, 26, 'ผลการหมุน 10 ครั้ง', { size: 16, color: COLORS.gold }));
    results.forEach((r, i) => {
      const x = 80 + (i % 5) * 120;
      const y = 112 + Math.floor(i / 5) * 132;
      const card = this.itemCard(x, y, r, 0.72);
      o.add(card);
      card.setAlpha(0).setScale(0.3);
      this.time.delayedCall(i * 140, () => {
        this.tweens.add({ targets: card, alpha: 1, scale: 0.72, duration: 260, ease: 'Back.Out' });
        (r.rarity === 'legendary' ? sfx.win : r.rarity === 'epic' ? sfx.shine : sfx.pop)();
        if (r.rarity !== 'rare') this.sparkle(x, y, RARITY[r.rarity].color);
      });
    });
    const fresh = results.filter((r) => !r.dup).length;
    const refund = results.reduce((s, r) => s + r.refund, 0);
    this.time.delayedCall(results.length * 140 + 200, () => {
      o.add(txt(this, 320, 318, `ของใหม่ ${fresh} ชิ้น${refund ? ` · ของซ้ำคืน ${refund} เหรียญ` : ''}`, { size: 12, color: COLORS.text }));
      o.add(new Button(this, 320, 342, 'ตกลง', { w: 100, h: 24, color: 'btn_dark', onClick: () => this.close(o) }));
    });
  }

  // ของสะสม: ที่มีแล้วเห็นเต็ม ๆ ที่ยังไม่มีเป็นเงาดำ
  collection() {
    const items = this.boxItems();
    modal(this, {
      title: `ของสะสม ตู้${BOXES[this.box].name} ${items.filter((it) => wallet.items.includes(it.id)).length}/${items.length}`,
      w: 560,
      h: 320,
      build: (m) => {
        m.box.setDepth(950);
        items.forEach((it, i) => {
          const x = -237 + (i % 7) * 79;
          const y = -92 + Math.floor(i / 7) * 86;
          const own = wallet.items.includes(it.id);
          const rar = RARITY[it.rarity];
          m.box.add(this.add.nineslice(x, y, 'slot', undefined, 72, 80, 4, 4, 4, 4));
          m.box.add(this.add.rectangle(x, y - 37, 66, 3, hex(rar.color), own ? 1 : 0.35));
          const shown = this.preview(m.box, it, x, y + 18, 1.6);
          if (!own) shown.forEach((o) => (o.setTint ? o.setTint(0x000000) : null, o.setAlpha(0.45)));
          m.box.add(fitText(txt(this, x, y + 30, own ? it.name : '???', { size: 9, color: own ? rar.color : COLORS.dim }), 68));
        });
        m.box.add(new Button(this, 0, 140, 'ปิด', { w: 80, h: 22, size: 11, color: 'btn_dark', onClick: () => m.close() }));
      },
    });
  }
}
