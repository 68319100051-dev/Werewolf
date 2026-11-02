// ป้ายชื่อจากตู้กาชา: สีพื้น ขอบ สีชื่อ และลายประดับเล็ก ๆ ที่ปลายป้าย
import { CATALOG } from '/catalog.js';

const hex = (c) => Phaser.Display.Color.HexStringToColor(c).color;

export function plateStyle(key) {
  return (key && CATALOG.find((it) => it.kind === 'plate' && it.key === key)) || null;
}

// วางพื้นป้าย + ลายประดับ ลงในคอนเทนเนอร์ (w = ความกว้างป้าย, h = ความสูง) คืนรายการของที่สร้าง (ไว้ลบตอนเปลี่ยนป้าย)
export function plateDeco(scene, parent, style, w, h) {
  const made = [];
  if (!style?.deco) return made;
  const add = (o) => {
    parent.add(o);
    made.push(o);
    return o;
  };
  const L = -w / 2;
  const R = w / 2;
  const line = hex(style.line);
  if (style.deco === 'leaf') {
    [[L - 2, -2, -30], [R + 2, -2, 30]].forEach(([x, y, a]) => add(scene.add.ellipse(x, y, 6, 3, 0x6ab85a).setAngle(a)));
  } else if (style.deco === 'heart') {
    [L - 1, R + 1].forEach((x) => {
      add(scene.add.rectangle(x - 1, -1, 2, 2, 0xff8ab8));
      add(scene.add.rectangle(x + 1, -1, 2, 2, 0xff8ab8));
      add(scene.add.rectangle(x, 1, 2, 2, 0xff8ab8));
    });
  } else if (style.deco === 'star') {
    [[L + 3, -h / 2 + 1], [R - 4, h / 2 - 2], [0, -h / 2]].forEach(([x, y], i) => {
      const s = add(scene.add.rectangle(x, y, 1, 1, 0xfff6c0));
      scene.tweens.add({ targets: s, alpha: 0.2, duration: 500 + i * 230, yoyo: true, repeat: -1 });
    });
  } else if (style.deco === 'drip') {
    [[L + 5, 3], [R - 7, 4], [2, 2]].forEach(([x, len]) => add(scene.add.rectangle(x, h / 2 + len / 2, 1, len, line)));
  } else if (style.deco === 'paw') {
    [L - 3, R + 3].forEach((x) => {
      add(scene.add.rectangle(x, 1, 3, 3, line));
      [-2, 0, 2].forEach((dx) => add(scene.add.rectangle(x + dx, -2, 1, 1, line)));
    });
  } else if (style.deco === 'shine') {
    const s = add(scene.add.rectangle(L + 2, 0, 2, h - 2, 0xffffff, 0.7).setAngle(20));
    scene.tweens.add({ targets: s, x: R - 2, duration: 900, repeat: -1, repeatDelay: 1600 });
  } else if (style.deco === 'flame') {
    [L + 3, L + 9, R - 9, R - 3].forEach((x, i) => {
      const f = add(scene.add.triangle(x, -h / 2 - 2, 0, 4, 4, 4, 2, 0, i % 2 ? 0xffd040 : 0xf06a20).setOrigin(0.5, 1));
      scene.tweens.add({ targets: f, scaleY: 1.6, duration: 160 + i * 40, yoyo: true, repeat: -1 });
    });
  }
  return made;
}

// พื้นป้าย: ธรรมดา = พื้นมืดโปร่ง
export function paintPlate(bg, style) {
  if (style) {
    bg.setFillStyle(hex(style.fill), 0.95);
    bg.setStrokeStyle(1, hex(style.line));
  } else {
    bg.setFillStyle(0x0b0a1a, 0.62);
    bg.setStrokeStyle();
  }
}
