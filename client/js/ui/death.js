// คัตซีนตอนตัวละครของเราตาย: ถูกหมาป่าฆ่า (กลางคืนในบ้าน / กลางวันที่สถานที่ทำงาน)
// แล้ววิญญาณลอยขึ้นจากร่าง ส่วนการตายแบบอื่น (โหวต ปืน ตรอมใจ) เป็นฉากสั้น ๆ
import { canvas, rect, dot, dither, addTexture } from '../art/pixel.js';
import { ensureCharacter } from '../art/character.js';
import { ensureChaseTextures } from './chase.js';
import { LOCATIONS } from '../data.js';
import { sfx } from '../sfx.js';
import { txt, COLORS } from './widgets.js';

const S = 4; // ขยายฉาก 140x70 เป็น 560x280
const BAR = 40; // แถบดำบน-ล่างแบบหนัง
const sx = (x) => 320 - 70 * S + x * S;
const sy = (y) => 180 - 35 * S + y * S;

function ensureDeathTextures(scene) {
  ensureChaseTextures(scene);
  if (scene.textures.exists('dc_room')) return;
  const { c, ctx } = canvas(140, 70);
  // ผนังไม้ตอนกลางคืน
  rect(ctx, 0, 0, 140, 56, '#2a1e2a');
  for (let x = 0; x < 140; x += 10) {
    rect(ctx, x, 0, 1, 56, '#1e1520');
    rect(ctx, x + 1, 0, 1, 56, '#33243a');
  }
  rect(ctx, 0, 6, 140, 1, '#1e1520');
  rect(ctx, 0, 52, 140, 4, '#3a2618');
  // พื้น
  rect(ctx, 0, 56, 140, 14, '#3a2818');
  for (let y = 59; y < 70; y += 4) rect(ctx, 0, y, 140, 1, '#2c1e12');
  rect(ctx, 52, 62, 40, 6, '#5a2226');
  dither(ctx, 52, 62, 40, 6, '#6a2a2e');
  // แสงจันทร์จากหน้าต่างตกลงพื้น
  dither(ctx, 56, 57, 34, 12, '#4a3a58');
  // ประตู (ช่องมืดหลังบานประตู)
  rect(ctx, 7, 19, 24, 38, '#4a3020');
  rect(ctx, 8, 20, 22, 36, '#07060c');
  // หน้าต่าง
  rect(ctx, 57, 13, 26, 24, '#4a3020');
  rect(ctx, 58, 14, 24, 22, '#16244e');
  dither(ctx, 58, 28, 24, 8, '#1e3060');
  for (let i = 0; i < 4; i++) dot(ctx, 61 + i * 5, 17 + (i % 2) * 6, '#c8d0f0');
  rect(ctx, 73, 17, 5, 5, '#f0e8c0');
  rect(ctx, 72, 18, 7, 3, '#f0e8c0');
  rect(ctx, 74, 18, 2, 1, '#fffbe0');
  rect(ctx, 69, 14, 2, 22, '#4a3020');
  rect(ctx, 58, 24, 24, 2, '#4a3020');
  rect(ctx, 55, 37, 30, 2, '#5a3a22');
  // เตียง
  rect(ctx, 96, 44, 40, 12, '#5a3a22');
  rect(ctx, 96, 38, 3, 18, '#5a3a22');
  rect(ctx, 133, 34, 4, 22, '#5a3a22');
  rect(ctx, 98, 41, 35, 4, '#c8b8a0');
  rect(ctx, 122, 38, 10, 4, '#e8e0d0');
  rect(ctx, 98, 42, 24, 6, '#4a5a90');
  dither(ctx, 98, 42, 24, 6, '#5a6aa0');
  rect(ctx, 96, 54, 40, 2, '#3a2414');
  // โต๊ะเล็กกับเทียนที่ดับแล้ว
  rect(ctx, 38, 44, 12, 2, '#5a3a22');
  rect(ctx, 40, 46, 2, 10, '#4a3020');
  rect(ctx, 46, 46, 2, 10, '#4a3020');
  rect(ctx, 43, 40, 2, 4, '#d8d0b8');
  addTexture(scene, 'dc_room', c);

  const door = canvas(22, 36);
  rect(door.ctx, 0, 0, 22, 36, '#6a4428');
  for (let x = 0; x < 22; x += 5) rect(door.ctx, x, 0, 1, 36, '#4a2c18');
  rect(door.ctx, 0, 6, 22, 2, '#4a2c18');
  rect(door.ctx, 0, 28, 22, 2, '#4a2c18');
  rect(door.ctx, 18, 17, 2, 2, '#c8a040');
  addTexture(scene, 'dc_door', door.c);
}

const SHORT_TITLE = {
  vote: 'คุณถูกแขวนคอ...',
  hunter: 'คุณถูกนายพรานยิง...',
  heart: 'คุณตรอมใจตายตามคนรัก...',
  wolf: 'คุณถูกหมาป่าฆ่าตาย...',
  left: 'คุณหนีออกจากหมู่บ้าน...',
};

// เล่นคัตซีน แล้วเรียก onDone เมื่อจบ (แตะเพื่อข้ามได้)
export function playDeath(scene, { outfit, death, short = false, onDone = () => {} }) {
  ensureDeathTextures(scene);
  const root = scene.add.container(0, 0).setDepth(260);
  const timers = [];
  let ended = false;
  const at = (ms, fn) => timers.push(scene.time.delayedCall(ms, () => !ended && fn()));
  const tw = (cfg) => scene.tweens.add(cfg);

  const black = scene.add.rectangle(320, 180, 640, 360, 0x000000, 0).setInteractive();
  root.add(black);
  tw({ targets: black, fillAlpha: 1, duration: 300 });
  const stage = scene.add.container(0, 0).setAlpha(0);
  root.add(stage);
  const bars = [scene.add.rectangle(320, BAR / 2, 640, BAR, 0x000000), scene.add.rectangle(320, 360 - BAR / 2, 640, BAR, 0x000000)];
  root.add(bars);
  const skipHint = txt(scene, 624, 360 - BAR / 2, 'แตะเพื่อข้าม', { size: 10, color: COLORS.dim, origin: [1, 0.5] }).setAlpha(0);
  root.add(skipHint);
  at(900, () => tw({ targets: skipHint, alpha: 0.8, duration: 300 }));

  const key = ensureCharacter(scene, outfit);
  const me = scene.add.sprite(0, 0, key, 0).setOrigin(0.5, 1).setScale(3);
  me.play(key + '_idle');

  const finish = () => {
    if (ended) return;
    ended = true;
    timers.forEach((t) => t.remove());
    tw({
      targets: root,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        root.list.forEach((o) => scene.tweens.killTweensOf(o));
        stage.list.forEach((o) => scene.tweens.killTweensOf(o));
        root.destroy();
        onDone();
      },
    });
  };
  black.on('pointerup', () => scene.time.now - startAt > 800 && finish());
  const startAt = scene.time.now;

  const wolfKind = death?.kind === 'wolf' && !short;
  let ghostAt;
  if (wolfKind) ghostAt = wolfScene();
  else ghostAt = shortScene();
  at(ghostAt, rise);
  at(ghostAt + 3600, finish);
  return { skip: finish };

  // ---------- ฉากถูกหมาป่าฆ่า ----------
  function wolfScene() {
    const night = death.night || !death.loc;
    const bg = scene.add.image(320, 180, night ? 'dc_room' : 'scene_' + death.loc).setScale(S);
    stage.add(bg);
    if (!night) stage.add(scene.add.rectangle(320, 180, 560, 280, 0x2a0a18, 0.25));
    tw({ targets: stage, alpha: 1, duration: 600, delay: 250 });
    const place = night ? 'คืนนั้น ในบ้านของคุณ...' : `ที่${LOCATIONS[death.loc]?.name || 'ป่าลึก'}...`;
    const cap = txt(scene, 18, BAR / 2, place, { size: 12, color: COLORS.dim, origin: [0, 0.5] }).setAlpha(0);
    root.add(cap);
    tw({ targets: cap, alpha: 1, duration: 500, delay: 400 });

    const groundY = night ? sy(62) : sy(68);
    const meX = night ? sx(88) : 420;
    const wolf = scene.add.sprite(-80, groundY, 'ch_wolf', 0).setOrigin(0.5, 1).setScale(3);
    let door = null;
    if (night) {
      // นอนหลับอยู่บนเตียง
      me.setPosition(sx(116), sy(43)).setOrigin(0.5, 0.5).setAngle(-90);
      me.anims.pause();
      const zzz = scene.add.image(sx(124), sy(30), 'i_zzz').setScale(2.5);
      door = scene.add.image(sx(8), sy(20), 'dc_door').setOrigin(0, 0).setScale(S);
      stage.add([me, zzz, door]);
      tw({ targets: zzz, y: zzz.y - 14, alpha: 0.3, duration: 1100, yoyo: true, repeat: 2, ease: 'Sine.InOut' });
      // เงาหมาป่าวิ่งผ่านหน้าต่าง
      const mask = scene.make.graphics({ add: false });
      mask.fillRect(sx(58), sy(14), 24 * S, 22 * S);
      const pass = scene.add.sprite(sx(48), sy(32), 'ch_wolf', 0).setOrigin(0.5, 1).setScale(2).setTint(0x000000);
      pass.setMask(mask.createGeometryMask());
      stage.add(pass);
      at(1500, () => {
        pass.play('ch_wolf_run');
        sfx.growl();
        tw({ targets: pass, x: sx(96), duration: 650, onComplete: () => pass.destroy() });
      });
      at(2400, () => {
        // สะดุ้งตื่น ลุกจากเตียง
        zzz.destroy();
        sfx.gasp();
        sfx.heartbeat();
        me.setOrigin(0.5, 1).setAngle(0).setPosition(meX, groundY);
        me.anims.resume();
        me.y -= 20;
        tw({ targets: me, y: groundY, duration: 260, ease: 'Bounce.Out' });
        alarm(me);
      });
      at(3200, () => {
        // ประตูถูกพังเข้ามา ตาแดงในความมืด
        sfx.crash();
        scene.cameras.main.shake(260, 0.01);
        tw({ targets: door, scaleX: 0.6, duration: 120, ease: 'Quad.Out' });
        const eyes = [scene.add.rectangle(sx(20) - 8, sy(32), 7, 4, 0xff2a2a), scene.add.rectangle(sx(20) + 10, sy(32), 7, 4, 0xff2a2a)];
        stage.add(eyes);
        tw({ targets: eyes, alpha: 0.2, duration: 120, yoyo: true, repeat: 2, onComplete: () => eyes.forEach((e) => e.destroy()) });
        sfx.growl();
      });
      at(4000, () => {
        wolf.setPosition(sx(20), groundY);
        stage.add(wolf);
        wolf.play('ch_wolf_run');
        pounce(wolf, meX);
      });
      return 7800;
    }
    // กลางวัน: ยืนหอบหลังวิ่งหนี แล้วหมาป่าวิ่งไล่มาถึงตัว
    me.setPosition(meX, groundY);
    stage.add([me, wolf]);
    tw({ targets: me, scaleY: 2.85, duration: 220, yoyo: true, repeat: 5 });
    at(900, () => {
      sfx.growl();
      sfx.heartbeat();
      alarm(me);
    });
    at(1500, () => {
      wolf.play('ch_wolf_run');
      sfx.steps(4, 0.12);
      tw({ targets: wolf, x: meX - 170, duration: 900, ease: 'Quad.In', onComplete: () => pounce(wolf, meX) });
    });
    return 6300;
  }

  function alarm(target) {
    const mark = txt(scene, target.x, target.y - 104, '!', { size: 30, color: COLORS.red, bold: true });
    stage.add(mark);
    mark.setScale(0);
    tw({ targets: mark, scale: 1, duration: 200, ease: 'Back.Out' });
    tw({ targets: mark, alpha: 0, duration: 300, delay: 1000, onComplete: () => mark.destroy() });
  }

  // หมาป่ากระโจนใส่ ข่วน ร่างล้มลง หมาป่าหอนแล้ววิ่งหนีไป
  function pounce(wolf, meX) {
    const groundY = wolf.y;
    const fromX = wolf.x;
    sfx.whoosh();
    tw({ targets: wolf, x: meX - 34, duration: 380, ease: 'Sine.Out' });
    tw({ targets: wolf, y: groundY - 70, angle: -12, duration: 190, yoyo: true, ease: 'Quad.Out' });
    at(380, () => {
      wolf.setAngle(0);
      wolf.anims.stop();
      wolf.setFrame(0);
      sfx.slash();
      at(130, () => sfx.slash());
      sfx.gasp();
      const cam = scene.cameras.main;
      cam.flash(260, 200, 20, 20);
      cam.shake(420, 0.016);
      claws(meX, groundY - 50);
      me.anims.stop();
      me.setTint(0xff5050);
      // ล้มลงไปด้านหลัง
      tw({ targets: me, x: meX + 18, y: groundY - 30, angle: 90, duration: 520, delay: 160, ease: 'Bounce.Out', onComplete: () => sfx.thud() });
      const pool = scene.add.ellipse(meX + 40, groundY - 2, 120, 16, 0x6a0a14).setScale(0, 1);
      stage.addAt(pool, stage.getIndex(me));
      tw({ targets: pool, scaleX: 1, duration: 1400, delay: 500, ease: 'Quad.Out' });
      at(1300, () => me.setTint(0x806070));
    });
    at(1500, () => {
      // หอนเหนือร่าง
      wolf.setTexture('howl_wolf').setScale(2.6);
      sfx.howl();
      tw({ targets: wolf, scaleY: 2.75, duration: 400, yoyo: true, repeat: 1 });
    });
    at(3000, () => {
      wolf.setTexture('ch_wolf', 0).setScale(3).setFlipX(true);
      wolf.play('ch_wolf_run');
      tw({ targets: wolf, x: Math.min(fromX, -100), duration: 900, ease: 'Quad.In' });
    });
    at(3500, () => {
      const red = scene.add.rectangle(320, 180, 560, 280, 0x200008, 0);
      stage.add(red);
      tw({ targets: red, fillAlpha: 0.55, duration: 600 });
      title(SHORT_TITLE.wolf);
    });
  }

  function claws(x, y) {
    for (let i = 0; i < 3; i++) {
      const m = scene.add.rectangle(x - 22 + i * 22, y + i * 8, 150, 6, 0xf0e8f0).setAngle(-58).setScale(0, 1);
      root.add(m);
      tw({ targets: m, scaleX: 1, duration: 110, delay: i * 60, ease: 'Quad.Out' });
      tw({ targets: m, alpha: 0, duration: 500, delay: 700, onComplete: () => m.destroy() });
    }
  }

  function title(text) {
    const t = txt(scene, 320, 86, text, { size: 26, color: COLORS.red, bold: true });
    root.add(t);
    t.setScale(1.8).setAlpha(0);
    tw({ targets: t, scale: 1, alpha: 1, duration: 420, ease: 'Back.Out' });
    tw({ targets: t, x: 323, duration: 50, yoyo: true, repeat: 4, delay: 420 });
    sfx.die();
  }

  // ---------- ฉากสั้น: ร่างล้มอยู่กลางความมืด ----------
  function shortScene() {
    tw({ targets: stage, alpha: 1, duration: 400 });
    stage.add(scene.add.ellipse(330, 290, 150, 18, 0x1a1428));
    me.setPosition(280, 262).setAngle(90).setTint(0x806070);
    me.anims.stop();
    stage.add(me);
    at(250, () => title(SHORT_TITLE[death?.kind] || 'คุณเสียชีวิต...'));
    return 1500;
  }

  // ---------- วิญญาณลอยขึ้นจากร่าง ----------
  function rise() {
    // ร่างที่นอนราบ (หมุน 90 องศารอบปลายเท้า) กลางตัวอยู่ทางขวาของจุดหมุน
    const lying = Math.abs(me.angle) > 45;
    const baseX = lying ? me.x + 45 : me.x;
    const baseY = lying ? me.y + 30 : me.y;
    const ghost = scene.add.sprite(baseX, baseY, key, 0).setOrigin(0.5, 1).setScale(3).setTint(0x9ad0ff).setAlpha(0).setBlendMode('ADD');
    stage.add(ghost);
    sfx.ghost();
    tw({ targets: ghost, alpha: 0.75, duration: 700 });
    tw({ targets: ghost, y: baseY - 96, duration: 2600, ease: 'Sine.Out' });
    tw({ targets: ghost, x: baseX + 8, duration: 650, yoyo: true, repeat: 3, ease: 'Sine.InOut' });
    const motes = scene.add.particles(baseX, baseY - 40, 'spark', {
      x: { min: -26, max: 26 }, speedY: { min: -60, max: -20 }, lifespan: 1400, alpha: { start: 0.8, end: 0 },
      scale: { start: 1, end: 0.3 }, tint: 0x9ad0ff, frequency: 70, blendMode: 'ADD',
    });
    stage.add(motes);
    at(1800, () => motes.stop());
    const t1 = txt(scene, 320, 120, 'คุณกลายเป็นวิญญาณ', { size: 18, color: '#9ad0ff', bold: true }).setAlpha(0);
    const t2 = txt(scene, 320, 144, 'คุยกับคนตายในห้องผี · หลอกหลอนคนเป็น · กด "ติดตามดู" เพื่อดูผู้เล่นคนอื่น', { size: 11, color: COLORS.text, wrap: 520 }).setAlpha(0);
    root.add([t1, t2]);
    tw({ targets: t1, alpha: 1, duration: 500, delay: 800 });
    tw({ targets: t2, alpha: 1, duration: 500, delay: 1400 });
  }
}
