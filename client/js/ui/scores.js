// ตารางคะแนนสะสมของห้อง (ชนะ +3 รอดถึงจบ +1) ใช้ทั้งหน้าจบเกมและห้องรอ
import { txt, fitText, panel, modal, Button, COLORS } from './widgets.js';

export function scoreRows(stats) {
  return Object.entries(stats?.players || {})
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name));
}

// แผงตารางคะแนน: แสดง max แถวแรก และแถวของเราเสมอ
export function scoreBoard(scene, x, y, stats, me, { max = 6, w = 300 } = {}) {
  const rows = scoreRows(stats);
  let shown = rows.slice(0, max);
  const mine = rows.findIndex((r) => r.id === me);
  if (mine >= max) shown = [...rows.slice(0, max - 1), rows[mine]];
  const h = 38 + shown.length * 17;
  const c = scene.add.container(x, y);
  c.add(panel(scene, 0, 0, w, h, 'panel_dark'));
  c.add(txt(scene, 0, -h / 2 + 14, `คะแนนสะสม · เล่นไปแล้ว ${stats?.games || 0} ตา`, { size: 12, color: COLORS.gold }));
  const left = -w / 2 + 14;
  shown.forEach((r, i) => {
    const rank = rows.indexOf(r) + 1;
    const y0 = -h / 2 + 34 + i * 17;
    const color = r.id === me ? COLORS.gold : COLORS.text;
    if (rank === 1 && r.points > 0) c.add(scene.add.image(left + 6, y0, 'i_crown'));
    else c.add(txt(scene, left + 6, y0, String(rank), { size: 11, color: COLORS.dim }));
    c.add(fitText(txt(scene, left + 20, y0, r.name, { size: 11, color, origin: [0, 0.5] }), w - 150));
    c.add(txt(scene, w / 2 - 70, y0, `ชนะ ${r.wins}/${r.games}`, { size: 10, color: COLORS.dim }));
    c.add(txt(scene, w / 2 - 14, y0, `${r.points} แต้ม`, { size: 11, color, origin: [1, 0.5] }));
  });
  return c;
}

export function openScores(scene, stats, me) {
  const n = Math.min(12, scoreRows(stats).length);
  const h = 38 + n * 17;
  modal(scene, {
    title: null,
    w: 330,
    h: h + 50,
    build: (m) => {
      m.box.setDepth(950);
      m.box.add(scoreBoard(scene, 0, -18, stats, me, { max: 12, w: 316 }));
      m.box.add(txt(scene, 0, h / 2 - 8, 'ชนะ +3 แต้ม · รอดถึงจบ +1 แต้ม', { size: 10, color: COLORS.dim }));
      m.box.add(new Button(scene, 0, h / 2 + 12, 'ปิด', { w: 80, h: 22, size: 11, color: 'btn_dark', onClick: () => m.close() }));
    },
  });
}
