// อีโมต: ปุ่มเปิดแถบท่าทาง แล้วตัวละครของเราทำท่าให้ทุกคนเห็น
import { canvas, rows, outline, addTexture } from '../art/pixel.js';
import { net } from '../net.js';
import { sfx } from '../sfx.js';
import { iconButton, panel } from './widgets.js';
import { wallet } from '../wallet.js';
import { CATALOG } from '/catalog.js';

export const EMOTE_LIST = ['wave', 'laugh', 'angry', 'what', 'cry', 'shock'];

const FACES = {
  wave: ['..y.y.y..', '.yyyyyyy.', '.yyyyyyy.', '.yyyyyyy.', '..yyyyy..', '..yyyyy..', '...yyy...'],
  laugh: ['..yyyyy..', '.yyyyyyy.', 'yydyyydyy', 'yyyyyyyyy', 'ydddddddy', '.yddrddy.', '..yyyyy..'],
  angry: ['..rrrrr..', '.rdrrrdr.', 'rrrdrdrrr', 'rrdrrrdrr', 'rrrrrrrrr', '.rrdddrr.', '..rrrrr..'],
  what: ['..www..', '.w...w.', '.....w.', '....w..', '...w...', '.......', '...w...'],
  cry: ['..yyyyy..', '.yyyyyyy.', 'yydyyydyy', 'ybyyyyyby', 'ybyddyyby', '.byyyyyb.', '..yyyyy..'],
  shock: ['...r...', '...r...', '...r...', '...r...', '...r...', '.......', '...r...'],
  // ของจากตู้อีโมต
  love: ['..yyyyy..', '.yyyyyyy.', 'yrryyyrry', 'rrrryrrrr', 'yrryyyrry', '.yydddyy.', '..yyyyy..'],
  zzz: ['....wwww', '.......w', '..www.w.', '....ww..', '.www....', '...w....', '.wwwww..'],
  sus: ['..yyyyy..', '.yyyyyyy.', 'yywdyywdy', 'yyyyyyyyy', 'yyyyyyyyy', '.yyyddyy.', '..yyyyy..'],
  sweat: ['..yyyyy.b', '.yyyyyyyb', 'yydyyydyy', 'yyyyyyyyy', 'yyyyyyyyy', '.ydddddy.', '..yyyyy..'],
  cool: ['..yyyyy..', '.yyyyyyy.', 'kkkkkkkkk', 'ykkkykkky', 'yyyyyyyyy', '.yydddyy.', '..yyyyy..'],
  popcorn: ['.wywywy.', 'wywywywy', '.rwrwrwr.', '.rwrwrwr.', '.rwrwrwr.', '.rwrwrwr.', '..rrrrr..'],
  party: ['....y....', '...yry...', '..ybyby..', '..yryry..', '.ybybyby.', '.yryryry.', 'ybybybyby'],
  skull: ['..wwwww..', '.wwwwwww.', 'wkkwwwkkw', 'wkkwwwkkw', 'wwwwkwwww', '.wwwwwww.', '..wkwkw..'],
  firework: ['r...y...b', '.r..y..b.', '..r.y.b..', 'yyyywyyyy', '..b.y.r..', '.b..y..r.', 'b...y...r'],
  howl: ['......kk.', '.....kkkk', '....kkkkk', '...kkkk..', '..kkkkk..', '.kkkkkk..', 'kkkkkkk..'],
};

export function ensureEmoteTextures(scene) {
  if (scene.textures.exists('em_wave')) return;
  for (const [key, lines] of Object.entries(FACES)) {
    const w = lines[0].length + 2;
    const h = lines.length + 2;
    const { c, ctx } = canvas(w, h);
    rows(ctx, lines, { y: '#ffd84a', d: '#3a2418', r: '#e0565e', w: '#ffffff', b: '#7ab8ff', k: '#1a1420' }, 1, 1);
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
    // อีโมตพื้นฐาน + ที่ได้จากตู้อีโมต (แถวละ 8 อัน)
    const owned = CATALOG.filter((it) => it.kind === 'emote' && wallet.items.includes(it.id)).map((it) => it.key);
    const keys = [...EMOTE_LIST, ...owned, ...extra];
    const cols = Math.min(8, keys.length);
    const rowsN = Math.ceil(keys.length / cols);
    const w = cols * 26 + 10;
    const h = rowsN * 26 + 4;
    // ขอบขวาของแถบต้องไม่เลยเข้าไปใต้กล่องแชท (แชทเป็น HTML ทับแคนวาสตั้งแต่ x = 409)
    const right = Math.min(x + 14, 404);
    this.bar = scene.add.container(right - w / 2, y + 15 + h / 2).setDepth(depth + 5).setVisible(false);
    this.bar.add(panel(scene, 0, 0, w, h, 'panel_dark'));
    keys.forEach((k, i) => {
      const ix = -w / 2 + 18 + (i % cols) * 26;
      const iy = -h / 2 + 15 + Math.floor(i / cols) * 26;
      const icon = scene.add.image(ix, iy, k === 'fire' ? 'i_fire_emote' : 'em_' + k).setScale(k === 'fire' ? 1.4 : 1.6).setInteractive({ useHandCursor: true });
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
