// สมุดอาชีพ: ดูอาชีพทุกตัวและสถานการณ์ประจำวันได้ทุกเมื่อ (เมนูหลัก / ในเกม)
import { ROLES, EVENTS, TEAM_COLOR } from '../data.js';
import { sfx } from '../sfx.js';
import { Button, txt, modal, COLORS } from './widgets.js';

const GROUPS = [
  ['ฝ่ายหมาป่า', ['alpha', 'wolf', 'shadow', 'traitor']],
  ['ฝ่ายชาวบ้าน', ['villager', 'seer', 'doctor', 'hunter', 'detective', 'watchman', 'guard', 'priest', 'gravedigger', 'farmer', 'woodcutter', 'cupid']],
  ['ฝ่ายอิสระ', ['jester']],
];
const TEAM_NAME = { wolf: 'ฝ่ายหมาป่า', village: 'ฝ่ายชาวบ้าน', neutral: 'ฝ่ายอิสระ' };
const SPECIAL = ['seer', 'doctor', 'hunter', 'detective', 'jester', 'watchman', 'guard', 'priest', 'gravedigger', 'farmer', 'woodcutter', 'cupid', 'traitor'];

// อาชีพที่มีพลังกลางคืนมีได้ไม่เกิน 1 คน (ตรงกับเซิร์ฟเวอร์)
const ROLE_MAX = { seer: 1, doctor: 1, detective: 1, watchman: 1, priest: 1, cupid: 1 };
export const roleMax = (k) => ROLE_MAX[k] || 3;

// ค่าตั้งของอาชีพ: 'random' = อาจสุ่มได้, 0 = ปิด, 1-3 = มีแน่ ๆ (รองรับค่าเก่า true/false)
export function roleSetting(roles, k) {
  const v = roles?.[k];
  if (v === undefined || v === true || v === 'random') return 'random';
  if (v === false) return 0;
  const n = Number(v);
  return Number.isInteger(n) ? Math.max(0, Math.min(roleMax(k), n)) : 'random';
}

// จำนวนหมาป่าจริงในเกม (ตรงกับ wolfCount ของเซิร์ฟเวอร์)
export function wolfCount(n, setting = 'auto', roles = {}) {
  const cap = Math.max(1, Math.floor((n - 1) / 2));
  const fixed = ['wolf', 'shadow'].reduce((sum, k) => sum + (typeof roleSetting(roles, k) === 'number' ? roleSetting(roles, k) : 0), 0);
  if (!['wolf', 'shadow'].some((k) => roleSetting(roles, k) !== 0)) return 1;
  const auto = n >= 10 ? 3 : n >= 7 ? 2 : 1;
  const want = setting === 'auto' ? auto : Number(setting) || auto;
  return Math.min(cap, Math.max(want, 1 + fixed));
}

// อาชีพที่อาจมีในเกมนี้ (ตามจำนวนคนและการตั้งค่าห้อง)
export function possibleRoles(n, roles = {}, wolves = 'auto') {
  const list = ['alpha'];
  if (wolfCount(n, wolves, roles) >= 2) list.push(...['wolf', 'shadow'].filter((k) => roleSetting(roles, k) !== 0));
  list.push(...SPECIAL.filter((k) => {
    const v = roleSetting(roles, k);
    return v === 'random' ? !(k === 'traitor' && n < 6) : v > 0;
  }));
  list.push('villager');
  return list;
}

/**
 * เปิดสมุดอาชีพ
 * @param possible รายชื่ออาชีพที่มีในเกมนี้ (ไม่ส่ง = แสดงทุกอาชีพเท่ากัน)
 * @param focus อาชีพที่จะเลือกไว้ก่อน
 */
export function openGuide(scene, { possible = null, focus = 'alpha' } = {}) {
  modal(scene, {
    title: 'สมุดอาชีพ',
    w: 580,
    h: 320,
    build: (m) => {
      m.box.setDepth(950);
      const page = scene.add.container(0, 0);
      m.box.add(page);
      const tabs = [];
      const show = (which) => {
        page.removeAll(true);
        tabs.forEach((t) => t.setAlpha(t.which === which ? 1 : 0.55));
        if (which === 'roles') rolesPage(scene, page, possible, focus);
        else eventsPage(scene, page);
      };
      [['roles', 'อาชีพ'], ['events', 'สถานการณ์ประจำวัน']].forEach(([which, label], i) => {
        const b = new Button(scene, -200 + i * 130, -116, label, { w: i ? 140 : 90, h: 22, size: 11, color: 'btn_dark', onClick: () => show(which) });
        b.which = which;
        tabs.push(b);
        m.box.add(b);
      });
      m.box.add(new Button(scene, 236, -116, 'ปิด', { w: 70, h: 22, size: 11, color: 'btn_dark', onClick: () => m.close() }));
      show('roles');
    },
  });
}

function rolesPage(scene, page, possible, focus) {
  const detail = scene.add.container(150, 18);
  page.add(detail);
  const cells = [];
  const select = (key) => {
    detail.removeAll(true);
    const r = ROLES[key];
    const off = possible && !possible.includes(key);
    detail.add(scene.add.nineslice(0, 0, 'panel_dark', undefined, 250, 236, 8, 8, 8, 8));
    detail.add(scene.add.image(-80, -72, r.icon).setScale(5).setAlpha(off ? 0.45 : 1));
    detail.add(txt(scene, 20, -86, r.name, { size: 17, color: TEAM_COLOR[r.team], bold: true, origin: [0, 0.5] }));
    detail.add(txt(scene, 20, -62, TEAM_NAME[r.team], { size: 11, color: COLORS.dim, origin: [0, 0.5] }));
    if (off) detail.add(txt(scene, 20, -42, 'ไม่มีในเกมนี้', { size: 10, color: COLORS.red, origin: [0, 0.5] }));
    // เป้าหมายต่อท้ายคำอธิบายเสมอ ถ้ายาวเกินกรอบให้ตัวอักษรเล็กลง
    for (let size = 11; size >= 9; size--) {
      const d = txt(scene, -112, -20, r.desc, { size, wrap: 224, origin: [0, 0], align: 'left' });
      const g = txt(scene, -112, 0, 'เป้าหมาย: ' + r.goal, { size, wrap: 224, color: COLORS.gold, origin: [0, 0], align: 'left' });
      g.y = Math.max(d.y + d.height + 4, 40);
      if (g.y + g.height <= 114 || size === 9) {
        detail.add([d, g]);
        break;
      }
      d.destroy();
      g.destroy();
    }
    cells.forEach((c) => c.ring.setVisible(c.key === key));
  };
  let y = -90;
  for (const [label, keys] of GROUPS) {
    const color = TEAM_COLOR[ROLES[keys[0]].team];
    page.add(txt(scene, -270, y, label, { size: 11, color, origin: [0, 0.5] }));
    y += 24;
    keys.forEach((key, i) => {
      const x = -254 + (i % 6) * 44;
      const cy = y + Math.floor(i / 6) * 40;
      const off = possible && !possible.includes(key);
      const c = scene.add.container(x, cy);
      const ring = scene.add.rectangle(0, 0, 36, 34, 0xe8b84a, 0).setStrokeStyle(2, 0xe8b84a).setVisible(false);
      const bg = scene.add.rectangle(0, 0, 34, 32, 0x0b0a1a, 0.6);
      const icon = scene.add.image(0, 0, ROLES[key].icon).setScale(2.4).setAlpha(off ? 0.3 : 1);
      c.add([bg, ring, icon]);
      c.setSize(36, 34).setInteractive({ useHandCursor: true });
      c.on('pointerover', () => icon.setScale(2.8));
      c.on('pointerout', () => icon.setScale(2.4));
      c.on('pointerup', () => {
        sfx.click();
        select(key);
      });
      c.key = key;
      c.ring = ring;
      cells.push(c);
      page.add(c);
    });
    y += Math.ceil(keys.length / 6) * 40 + 4;
  }
  if (possible) page.add(txt(scene, -270, 142, 'ไอคอนจาง = ไม่มีในเกมนี้', { size: 10, color: COLORS.dim, origin: [0, 0.5] }));
  select(ROLES[focus] ? focus : 'alpha');
}

function eventsPage(scene, page) {
  const keys = Object.keys(EVENTS).filter((k) => k !== 'normal');
  page.add(txt(scene, 0, -90, 'ทุกเช้าจะสุ่มสถานการณ์ 1 อย่าง ปรับกติกานิดเดียวเฉพาะวันนั้น', { size: 11, color: COLORS.dim }));
  keys.forEach((k, i) => {
    const e = EVENTS[k];
    const x = i % 2 ? 14 : -270;
    const y = -66 + Math.floor(i / 2) * 44;
    page.add(scene.add.image(x + 14, y + 12, e.icon).setScale(2));
    page.add(txt(scene, x + 34, y + 2, e.name, { size: 12, color: COLORS.gold, origin: [0, 0.5] }));
    page.add(txt(scene, x + 34, y + 20, e.desc, { size: 10, wrap: 222, origin: [0, 0.5], align: 'left' }));
  });
}
