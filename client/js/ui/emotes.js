// อีโมต: ปุ่มเปิดแถบท่าทาง แล้วตัวละครของเราทำท่าให้ทุกคนเห็น
import { canvas, rows, outline, addTexture } from '../art/pixel.js';
import { net } from '../net.js';
import { sfx } from '../sfx.js';
import { iconButton, panel } from './widgets.js';

export const EMOTE_LIST = ['wave', 'laugh', 'angry', 'what', 'cry', 'shock'];

const FACES = {
  wave: ['..y.y.y..', '.yyyyyyy.', '.yyyyyyy.', '.yyyyyyy.', '..yyyyy..', '..yyyyy..', '...yyy...'],
  laugh: ['..yyyyy..', '.yyyyyyy.', 'yydyyydyy', 'yyyyyyyyy', 'ydddddddy', '.yddrddy.', '..yyyyy..'],
  angry: ['..rrrrr..', '.rdrrrdr.', 'rrrdrdrrr', 'rrdrrrdrr', 'rrrrrrrrr', '.rrdddrr.', '..rrrrr..'],
  what: ['..www..', '.w...w.', '.....w.', '....w..', '...w...', '.......', '...w...'],
  cry: ['..yyyyy..', '.yyyyyyy.', 'yydyyydyy', 'ybyyyyyby', 'ybyddyyby', '.byyyyyb.', '..yyyyy..'],
  shock: ['...r...', '...r...', '...r...', '...r...', '...r...', '.......', '...r...'],
};

export function ensureEmoteTextures(scene) {
  if (scene.textures.exists('em_wave')) return;
  for (const [key, lines] of Object.entries(FACES)) {
    const w = lines[0].length + 2;
    const h = lines.length + 2;
    const { c, ctx } = canvas(w, h);
    rows(ctx, lines, { y: '#ffd84a', d: '#3a2418', r: '#e0565e', w: '#ffffff', b: '#7ab8ff' }, 1, 1);
    outline(ctx, w, h, '#120e18');
    addTexture(scene, 'em_' + key, c);
  }
  // ไอคอนปุ่มอีโมต
  const { c, ctx } = canvas(11, 11);
  rows(ctx, ['..yyyyy..', '.yyyyyyy.', 'yydyyydyy', 'yyyyyyyyy', 'ydyyyyydy', '.yddddy..', '..yyyyy..'], { y: '#ffd84a', d: '#3a2418' }, 1, 2);
  outline(ctx, 11, 11, '#120e18');
  addTexture(scene, 'i_emote', c);
}

/** ปุ่มอีโมต + แถบเลือกท่าทาง */
export class EmoteBar {
  constructor(scene, { x, y, depth = 0, extra = [] }) {
    ensureEmoteTextures(scene);
    this.scene = scene;
    this.btn = iconButton(scene, x, y, 'i_emote', () => this.toggle()).setDepth(depth);
    const keys = [...EMOTE_LIST, ...extra];
    const w = keys.length * 26 + 10;
    this.bar = scene.add.container(x - w / 2 + 14, y + 28).setDepth(depth + 5).setVisible(false);
    this.bar.add(panel(scene, 0, 0, w, 30, 'panel_dark'));
    keys.forEach((k, i) => {
      const icon = scene.add.image(-w / 2 + 18 + i * 26, 0, k === 'fire' ? 'i_fire_emote' : 'em_' + k).setScale(k === 'fire' ? 1.4 : 1.6).setInteractive({ useHandCursor: true });
      icon.on('pointerover', () => icon.setScale(icon.scale * 1.15));
      icon.on('pointerout', () => icon.setScale(k === 'fire' ? 1.4 : 1.6));
      icon.on('pointerup', () => {
        net.socket.emit('room:emote', k);
        sfx.pop();
        this.toggle(false);
      });
      this.bar.add(icon);
    });
  }

  toggle(on = !this.bar.visible) {
    this.bar.setVisible(on);
    if (on) {
      this.bar.setScale(0.6);
      this.scene.tweens.add({ targets: this.bar, scale: 1, duration: 150, ease: 'Back.Out' });
    }
  }

  setVisible(on) {
    this.btn.setVisible(on);
    if (!on) this.bar.setVisible(false);
  }
}
