// ทดสอบความสามารถของอาชีพใหม่แบบจัดสถานการณ์เอง: node tools/test-roles.js
const { Game } = require('../server/game');

let passed = 0;
let failed = 0;
const check = (name, cond, extra = '') => {
  cond ? passed++ : failed++;
  console.log(`${cond ? 'ผ่าน' : 'ไม่ผ่าน'}  ${name}${extra ? '  ' + extra : ''}`);
};

// สร้างเกมที่กำหนดอาชีพเองได้ (ไม่ตั้งเวลา ไม่ส่งข้อมูลออก)
function makeGame(roles, settings = {}) {
  const order = Object.keys(roles);
  const members = new Map(order.map((id) => [id, { name: id, outfit: { hat: 0, hair: 0, shirt: 0, item: 0, skin: 0 }, connected: true }]));
  const room = {
    order,
    members,
    settings: { cardTime: 20, meetingTime: 60, barLength: 'normal', revealRoleOnDeath: true, ghostChat: true, outfitChange: true, roles: {}, ...settings },
  };
  const g = new Game(room, { send() {}, onEnd() {} });
  for (const [id, role] of Object.entries(roles)) g.players.get(id).role = role;
  // ไม่ให้เกมเดินเฟสเอง ทดสอบจะเรียกขั้นตอนเองทีละขั้น
  g.setPhase = function (phase) {
    this.phase = phase;
    this.next = null;
  };
  return g;
}
const P = (g, id) => g.players.get(id);
// จบการไล่ล่าทันที (ทดสอบผลของการซุ่มแบบเดิม)
const catchNow = (g) => {
  if (g.phase !== 'chase') return;
  g.chaseResult('caught', 'test');
  g.endChase();
};
const journal = (g, id) => P(g, id).journal.map((j) => j.text).join(' | ');

// ทหารยามในป่า = ซุ่มไม่สำเร็จ
{
  const g = makeGame({ a: 'alpha', gd: 'guard', v: 'villager', x: 'villager' });
  g.day = 1;
  ['a', 'gd', 'v'].forEach((id) => (P(g, id).pick = 'forest'));
  P(g, 'x').pick = 'well';
  g.resolveAmbush('v');
  check('ทหารยาม: ขวางการซุ่มได้', P(g, 'v').hp === 2 && g.dayResults.v.ambush.outcome === 'blocked');
}
// คนตัดไม้หลบได้ครั้งแรก
{
  const g = makeGame({ a: 'alpha', w: 'woodcutter', x: 'villager', y: 'villager' });
  g.day = 1;
  ['a', 'w'].forEach((id) => (P(g, id).pick = 'forest'));
  g.resolveAmbush('w');
  const first = P(g, 'w').hp;
  ['a', 'w'].forEach((id) => (P(g, id).pick = 'forest'));
  g.resolveAmbush('w');
  catchNow(g);
  check('คนตัดไม้: หลบครั้งแรก โดนครั้งที่สอง', first === 2 && P(g, 'w').hp === 1);
}
// หมาป่าเงา: หมอดูเห็นเป็นคน
{
  const g = makeGame({ a: 'alpha', sh: 'shadow', s: 'seer', v: 'villager', x: 'villager' });
  g.day = 1;
  g.startNight();
  g.phase = 'night';
  g.nightAction(P(g, 's'), 'sh');
  g.resolveNight();
  check('หมาป่าเงา: หมอดูเห็นว่าไม่ใช่หมาป่า', journal(g, 's').includes('ไม่ใช่หมาป่า'));
  check('หมาป่าเงา: นับเป็นหมาป่าตอนตัดสินชนะ', g.isWolf(P(g, 'sh')));
}
// คนทรยศ: ไม่ใช่หมาป่า แต่ชนะกับหมาป่า
{
  const g = makeGame({ a: 'alpha', t: 'traitor', v: 'villager', x: 'villager' });
  check('คนทรยศ: ไม่นับเป็นหมาป่า', !g.isWolf(P(g, 't')));
  P(g, 'v').alive = false;
  P(g, 'x').alive = false;
  g.hooks.onEnd = () => {};
  g.checkWin();
  check('คนทรยศ: หมาป่า 1 กับคนทรยศ 1 = หมาป่าชนะ', g.winner === 'wolf');
}
// กามเทพ: คู่รักตายตามกัน
{
  const g = makeGame({ a: 'alpha', c: 'cupid', l1: 'villager', l2: 'villager', x: 'villager' });
  g.day = 2;
  g.startNight();
  g.phase = 'night';
  g.nightAction(P(g, 'c'), ['l1', 'l2']);
  g.nightAction(P(g, 'a'), 'l1');
  g.resolveNight();
  check('กามเทพ: คนหนึ่งถูกฆ่า อีกคนตายตาม', !P(g, 'l1').alive && !P(g, 'l2').alive);
  check('กามเทพ: รายชื่อคนตายเมื่อคืนมีทั้งคู่', g.lastEvents.nightDeaths.length === 2);
}
// นักบวช: ชุบชีวิตคนตาย
{
  const g = makeGame({ a: 'alpha', pr: 'priest', d: 'villager', x: 'villager', y: 'villager' });
  g.day = 2;
  g.kill(P(g, 'd'), 'ทดสอบ');
  g.startNight();
  g.phase = 'night';
  check('นักบวช: เป็นผู้ใช้พลังกลางคืนเมื่อมีคนตาย', g.nightActors().some((p) => p.id === 'pr'));
  g.nightAction(P(g, 'pr'), 'd');
  g.resolveNight();
  check('นักบวช: ชุบชีวิตได้ เหลือ 1 ชีวิต', P(g, 'd').alive && P(g, 'd').hp === 1 && g.lastEvents.revived === 'd');
  g.startNight();
  check('นักบวช: ใช้ได้ครั้งเดียว', !g.nightActors().some((p) => p.id === 'pr'));
}
// คนเฝ้ายาม: เห็นจ่าฝูงแวะมา
{
  const g = makeGame({ a: 'alpha', w: 'watchman', v: 'villager', x: 'villager' });
  g.day = 2;
  g.startNight();
  g.phase = 'night';
  g.nightAction(P(g, 'w'), 'v');
  g.nightAction(P(g, 'a'), 'v');
  g.resolveNight();
  check('คนเฝ้ายาม: เห็นว่าจ่าฝูงแวะมา', journal(g, 'w').includes('a'));
}
// สัปเหร่อ: รู้อาชีพคนตาย
{
  const g = makeGame({ a: 'alpha', gd: 'gravedigger', s: 'seer', x: 'villager' });
  g.kill(P(g, 's'), 'ทดสอบ');
  check('สัปเหร่อ: รู้อาชีพจริงของคนตาย', journal(g, 'gd').includes('หมอดู'));
}
// ชาวนา / คนตัดไม้: แต้มพิเศษ
{
  const g = makeGame({ a: 'alpha', f: 'farmer', v: 'villager', w: 'woodcutter' });
  g.day = 1;
  g.event = 'normal';
  P(g, 'f').pick = 'farm';
  P(g, 'f').workScore = 0.5;
  P(g, 'v').pick = 'farm';
  P(g, 'v').workScore = 0.5;
  P(g, 'w').pick = 'forest';
  P(g, 'w').workScore = 0.5;
  P(g, 'a').pick = 'well';
  g.finishDay(null);
  check('ชาวนา: ทุ่งนาได้แต้มสองเท่า', g.dayResults.f.points === 4, `ได้ ${g.dayResults.f.points}`);
  check('คนตัดไม้: ป่าลึกได้แต้มเพิ่ม', g.dayResults.w.points === 5, `ได้ ${g.dayResults.w.points}`);
}
// นักบวชชุบจ่าฝูงเก่า ขณะมีจ่าฝูงใหม่แล้ว
{
  const g = makeGame({ a: 'alpha', w: 'wolf', pr: 'priest', x: 'villager', y: 'villager' });
  g.day = 2;
  g.kill(P(g, 'a'), 'ทดสอบ');
  g.startNight();
  g.phase = 'night';
  g.nightAction(P(g, 'pr'), 'a');
  g.resolveNight();
  const alphas = [...g.players.values()].filter((p) => p.alive && p.role === 'alpha').length;
  check('ชุบจ่าฝูงเก่า: ยังมีจ่าฝูงแค่ตัวเดียว', alphas === 1);
}

// ซุ่มนอกป่า: พยานได้เบาะแส / ในป่า: พยานไม่ได้
{
  const g = makeGame({ a: 'alpha', v: 'villager', w: 'villager', x: 'villager' });
  g.day = 1;
  g.event = 'normal';
  ['a', 'v', 'w'].forEach((id) => (P(g, id).pick = 'well'));
  P(g, 'x').pick = 'farm';
  g.resolveAmbush('v');
  catchNow(g);
  check('ซุ่มที่บ่อน้ำ: เหยื่อบาดเจ็บ', P(g, 'v').hp === 1);
  check('ซุ่มที่บ่อน้ำ: พยานได้เบาะแส', !!g.dayResults.w.ambush?.clue && journal(g, 'w').includes('เบาะแส'));
  check('ซุ่มที่บ่อน้ำ: คนที่อื่นได้ยินเสียงกรีดร้องจากบ่อน้ำ', g.dayResults.x.heardScream === 'well');
}
{
  const g = makeGame({ a: 'alpha', v: 'villager', w: 'villager', x: 'villager' });
  g.day = 1;
  ['a', 'v', 'w'].forEach((id) => (P(g, id).pick = 'forest'));
  P(g, 'x').pick = 'farm';
  g.resolveAmbush('v');
  catchNow(g);
  check('ซุ่มในป่า: พยานไม่ได้เบาะแส', !g.dayResults.w.ambush?.clue);
}
// ทหารยามคุ้มกันได้ทุกที่ / ฝนตกห้ามซุ่มเฉพาะในป่า
{
  const g = makeGame({ a: 'alpha', gd: 'guard', v: 'villager', x: 'villager' });
  g.day = 1;
  ['a', 'gd', 'v'].forEach((id) => (P(g, id).pick = 'church'));
  P(g, 'x').pick = 'farm';
  g.resolveAmbush('v');
  check('ทหารยามที่โบสถ์: ขวางการซุ่มได้', P(g, 'v').hp === 2 && g.dayResults.v.ambush.outcome === 'blocked');
}
{
  const g = makeGame({ a: 'alpha', v: 'villager', w: 'villager', x: 'villager' });
  g.day = 1;
  g.event = 'rain';
  for (const id of ['a', 'v', 'w', 'x']) P(g, id).hand = ['farm'];
  ['a', 'v'].forEach((id) => (P(g, id).pick = 'farm'));
  ['w', 'x'].forEach((id) => (P(g, id).pick = 'well'));
  g.startWork();
  check('ฝนตก: ซุ่มนอกป่ายังทำได้', g.ambushTargets.includes('v'));
  for (const id of ['a', 'v']) P(g, id).pick = 'forest';
  g.startWork();
  check('ฝนตก: ซุ่มในป่าไม่ได้', g.ambushTargets.length === 0);
}

// คืนแรกหมาป่ายังไม่ล่า
{
  const g = makeGame({ a: 'alpha', s: 'seer', v: 'villager', x: 'villager' });
  g.day = 1;
  g.startNight();
  check('คืนแรก: จ่าฝูงยังไม่ออกล่า แต่หมอดูใช้พลังได้', !g.nightActors().some((p) => p.id === 'a') && g.nightActors().some((p) => p.id === 's'));
  g.day = 2;
  check('คืนที่ 2: จ่าฝูงออกล่าได้', g.nightActors().some((p) => p.id === 'a'));
}
// ไล่ล่าสด
function chaseGame() {
  const g = makeGame({ a: 'alpha', v: 'villager', w: 'villager', k: 'wolf', x: 'villager' });
  g.day = 1;
  g.event = 'normal';
  ['a', 'v', 'w'].forEach((id) => (P(g, id).pick = 'well'));
  P(g, 'k').pick = 'farm';
  P(g, 'x').pick = 'farm';
  g.resolveAmbush('v');
  g.chase.startAt = Date.now() - 1;
  return g;
}
const tap = (g, id, kind) => {
  g.chase.lastTap = {};
  g.chase.lastHelp = {};
  g.chase.stunUntil = 0;
  g.chaseAction(P(g, id), kind);
};
{
  const g = chaseGame();
  check('ไล่ล่า: ซุ่มคนธรรมดาแล้วเข้าสู่การไล่ล่า', g.phase === 'chase' && g.chase.dist === 40);
  check('ไล่ล่า: แต่ละคนเห็นบทบาทถูก คนที่อื่นไม่รู้ว่าใครโดน',
    g.chaseView('v').role === 'victim' && g.chaseView('a').role === 'hunter' && g.chaseView('w').role === 'helper' && g.chaseView('x').role === 'watch' && g.chaseView('x').victim === null);
  const d0 = g.chase.dist;
  tap(g, 'v', 'run');
  const d1 = g.chase.dist;
  tap(g, 'a', 'hunt');
  tap(g, 'x', 'run');
  check('ไล่ล่า: เหยื่อวิ่งเพิ่มระยะ จ่าฝูงไล่ลดระยะ คนอื่นกดวิ่งแทนไม่ได้', d1 > d0 && g.chase.dist === d0);
  tap(g, 'w', 'help');
  check('ไล่ล่า: พยานปาหินช่วยเพิ่มระยะ', g.chase.dist > d0 + 5);
  const d2 = g.chase.dist;
  tap(g, 'a', 'pounce');
  check('ไล่ล่า: ตะครุบตอนอยู่ไกล = เสียหลัก ระยะเพิ่ม', g.chase.dist > d2 && g.chase.pounced && !g.chase.result);
  g.chase.obstacles = [{ at: Date.now() - 1000, done: false, cleared: false }];
  const d3 = g.chase.dist;
  g.tickChase();
  check('ไล่ล่า: ไม่กระโดดข้ามท่อนไม้ = สะดุด ระยะลด', g.chase.dist < d3);
  g.chase.runEnd = Date.now() - 1;
  g.tickChase();
  g.endChase();
  check('ไล่ล่า: หมดเวลาแล้วอยู่นอกเขตแดง = หนีรอด ไม่เสียชีวิต', P(g, 'v').hp === 2 && g.dayResults.v.ambush.outcome === 'escaped');
  check('ไล่ล่า: หนีรอดได้เบาะแส และยังได้แต้มเควส', !!g.dayResults.v.ambush.clue && g.dayResults.v.points > 0);
  check('ไล่ล่า: หนีรอดแล้วคนที่อื่นไม่ได้ยินเสียงกรีดร้อง', !g.dayResults.x.heardScream);
}
{
  const g = chaseGame();
  g.chase.obstacles = [{ at: Date.now(), done: false, cleared: false }];
  tap(g, 'v', 'jump');
  const d = g.chase.dist;
  g.chase.obstacles[0].at = Date.now() - 1000;
  g.tickChase();
  check('ไล่ล่า: กระโดดทันเวลา = ไม่สะดุด', g.chase.dist === d && g.chase.obstacles[0].cleared);
  catchNow(g);
}
{
  const g = chaseGame();
  g.chase.dist = 15;
  tap(g, 'a', 'pounce');
  g.endChase();
  check('ไล่ล่า: ตะครุบในระยะ = จับได้ เหยื่อบาดเจ็บ', g.chase === null && P(g, 'v').hp === 1 && g.dayResults.v.ambush.outcome === 'wounded');
}
{
  // หมาป่าลูกฝูงอยู่ด้วย: ขวางทางได้ และถ้าจับได้ = รุมตาย
  const g = chaseGame();
  P(g, 'k').pick = 'well';
  const d0 = g.chase.dist;
  tap(g, 'k', 'help');
  check('ไล่ล่า: หมาป่าลูกฝูงแอบขวางทาง ระยะลด', g.chase.dist < d0 && g.chaseView('k').pack === true);
  g.chase.dist = 1;
  tap(g, 'a', 'hunt');
  g.endChase();
  check('ไล่ล่า: จับได้ตอนมีลูกฝูงอยู่ด้วย = ถูกรุมตาย', !P(g, 'v').alive);
}
{
  const g = chaseGame();
  for (let i = 0; i < 60 && !g.chase.result; i++) tap(g, 'v', 'run');
  check('ไล่ล่า: วิ่งถึงหมู่บ้าน = หนีรอดทันที', g.chase.result === 'escaped' && g.chase.how === 'home');
  g.endChase();
}
{
  const g = chaseGame();
  g.chase.runEnd = Date.now() - 1;
  g.chase.dist = 20;
  g.tickChase();
  g.endChase();
  check('ไล่ล่า: หมดเวลาแล้วยังอยู่ในเขตแดง = ถูกจับ', P(g, 'v').hp === 1);
}
{
  const g = chaseGame();
  g.playerLeft('a');
  check('ไล่ล่า: จ่าฝูงออกจากเกมกลางคัน = เหยื่อหนีรอด', g.chase?.result === 'escaped');
  g.endChase();
}

// ตายแล้วรู้ว่าตายเพราะอะไร (ใช้เลือกคัตซีน)
{
  const g = makeGame({ a: 'alpha', v: 'villager', x: 'villager', y: 'villager' });
  g.day = 2;
  g.startNight();
  g.phase = 'night';
  g.nightAction(P(g, 'a'), 'v');
  g.resolveNight();
  const d = g.view('v').me.death;
  check('คัตซีนตาย: ถูกหมาป่าฆ่ากลางคืน', d?.kind === 'wolf' && d.night === true);
  check('คัตซีนตาย: คนเป็นไม่เห็นข้อมูลการตาย', g.view('x').me.death === undefined);
}
{
  const g = makeGame({ a: 'alpha', v: 'villager', x: 'villager', y: 'villager' });
  g.day = 1;
  P(g, 'v').hp = 1;
  ['a', 'v'].forEach((id) => (P(g, id).pick = 'farm'));
  g.resolveAmbush('v');
  catchNow(g);
  const d = g.view('v').me.death;
  check('คัตซีนตาย: ถูกไล่ทันกลางวัน รู้สถานที่', d?.kind === 'wolf' && d.night === false && d.loc === 'farm');
}
// ผีติดตามดูผู้เล่น
{
  const sent = [];
  const g = makeGame({ a: 'alpha', s: 'seer', g: 'villager', x: 'villager' });
  g.hooks.send = (id, ev, v) => sent.push([id, ev, v]);
  g.day = 1;
  g.kill(P(g, 'g'), 'ทดสอบ', 'vote');
  g.phase = 'night';
  g.night = { kill: null, protect: null, see: null, interrogate: null, done: new Set() };
  g.handle('g', 'watch', 's');
  check('ผี: ติดตามแล้วได้มุมมองทันที', sent.some(([id, , v]) => id === 'g' && v.spectate?.id === 's'));
  g.nightAction(P(g, 's'), 'a');
  const sp = g.view('g').spectate;
  check('ผี: เห็นอาชีพและเป้าหมายกลางคืนของคนที่ดู', sp.role === 'seer' && sp.night.done && sp.night.target === 'a');
  g.handle('x', 'watch', 's');
  check('ผี: คนเป็นใช้ติดตามไม่ได้', !P(g, 'x').watching && !g.view('x').spectate);
  g.handle('g', 'watch', null);
  check('ผี: เลิกดูได้', !g.view('g').spectate);
}
// จ่าฝูงไม่ทำเควส: เลือกซุ่ม (หรือไม่มีใครมา) = ทำงานเสร็จ
{
  const g = makeGame({ a: 'alpha', v: 'villager', x: 'villager', y: 'villager' });
  g.day = 1;
  P(g, 'a').pick = 'farm';
  P(g, 'v').pick = 'farm';
  P(g, 'x').pick = 'well';
  P(g, 'y').pick = 'well';
  g.startWork();
  const w = g.view('a').me.work;
  check('จ่าฝูง: มีฉากซุ่ม เห็นเหยื่อที่มา', w.lurk && w.targets.join() === 'v' && !w.done);
  g.chooseAmbush(P(g, 'a'), null);
  const w2 = g.view('a').me.work;
  check('จ่าฝูง: เลือกแล้วนับว่าทำงานเสร็จ', w2.done && w2.ambushed === null);
  const g2 = makeGame({ a: 'alpha', v: 'villager', x: 'villager', y: 'villager' });
  g2.day = 1;
  P(g2, 'a').pick = 'church';
  ['v', 'x', 'y'].forEach((id) => (P(g2, id).pick = 'well'));
  g2.startWork();
  check('จ่าฝูง: ไม่มีใครมา = เสร็จทันที', P(g2, 'a').workScore !== null && !g2.view('v').me.work.lurk);
}
// จ่าฝูงซ่อนตัว: คนที่อยู่ที่เดียวกันไม่เห็นว่าจ่าฝูงอยู่ด้วย แต่จ่าฝูงเห็นทุกคน
{
  const g = makeGame({ a: 'alpha', v: 'villager', x: 'villager', y: 'villager' });
  g.day = 1;
  ['a', 'v', 'x'].forEach((id) => (P(g, id).pick = 'farm'));
  P(g, 'y').pick = 'well';
  g.startWork();
  g.resolveAmbush(null);
  const r = g.dayResults;
  check('จ่าฝูง: ซ่อนตัว ไม่อยู่ในรายชื่อ "อยู่ด้วยกัน"', !r.v.with.includes('a') && r.v.with.includes('x'));
  check('จ่าฝูง: เห็นทุกคนที่มาที่ซุ่ม', r.a.with.includes('v') && r.a.with.includes('x'));
}
// จ่าฝูงเลือกทำงานปกติ: มีพยานเห็น ต้องเล่นมินิเกม ซุ่มไม่ได้
{
  const g = makeGame({ a: 'alpha', v: 'villager', x: 'villager', y: 'villager' });
  g.day = 1;
  g.phase = 'day';
  g.next = null;
  let advanced = false;
  g.advance = () => (advanced = true);
  for (const p of g.players.values()) p.hand = ['farm', 'well', 'church'];
  ['v', 'x', 'y'].forEach((id) => g.pickCard(P(g, id), 'farm'));
  g.pickCard(P(g, 'a'), 'farm');
  check('จ่าฝูง: เลือกสถานที่แล้วยังต้องเลือกวิธี', !advanced && g.view('a').me.lurk === null && !g.view('v').players.find((p) => p.id === 'a').picked);
  g.chooseMode(P(g, 'a'), 'work');
  check('จ่าฝูง: เลือกวิธีแล้วไปต่อได้', advanced);
  g.startWork();
  const w = g.view('a').me.work;
  check('จ่าฝูง: ทำงานปกติ = ไม่มีฉากซุ่ม ไม่มีเหยื่อ ต้องทำมินิเกม', !w.lurk && !w.targets && !w.done && g.ambushChoice === null);
  g.submitWork(P(g, 'a'), 0.8);
  g.resolveAmbush(null);
  check('จ่าฝูง: ทำงานปกติ = คนอื่นเห็นว่าอยู่ด้วย', g.dayResults.v.with.includes('a'));
}
// ลูกฝูงใส่ร้าย: ชาวบ้านได้ข่าวลือที่ตรงกับชุดของคนที่ถูกใส่ร้าย คนเฝ้ายามเห็นตัวหมาป่า
{
  const g = makeGame({ a: 'alpha', w: 'wolf', t: 'villager', m: 'watchman', x: 'villager', y: 'villager' });
  P(g, 't').outfit = { hat: 5, hair: 6, shirt: 7, item: 4, face: 2, skin: 0 };
  g.day = 1;
  g.startNight();
  g.phase = 'night';
  check('ลูกฝูง: มีพลังกลางคืน (คืนแรกก็ได้)', !!g.view('w').me.nightAction);
  g.nightAction(P(g, 'w'), 't');
  g.nightAction(P(g, 'm'), 't');
  g.resolveNight();
  const rumors = ['x', 'y', 'm'].flatMap((id) => P(g, id).journal.filter((j) => j.kind === 'rumor' && j.text.includes('ด้อม ๆ')));
  const fits = rumors.every((j) => j.clue.values.includes(P(g, 't').outfit[j.clue.part] ?? 0));
  check('ลูกฝูง: ใส่ร้ายแล้วชาวบ้าน 2 คนได้ข่าวลือที่ตรงกับชุดเหยื่อ', rumors.length === 2 && fits, `${rumors.length} ข่าว`);
  check('ลูกฝูง: คนเฝ้ายามเห็นหมาป่าที่มาใส่ร้าย', journal(g, 'm').includes('แวะมาบ้าน t: w'));
}
{
  const g = makeGame({ a: 'alpha', w: 'wolf', x: 'villager', y: 'villager' });
  g.day = 2;
  g.startNight();
  g.phase = 'night';
  g.nightAction(P(g, 'w'), 'skip');
  check('ลูกฝูง: เลือกไม่ออกไปได้', g.night.done.has('w') && !g.night.frames);
}
// ลูกฝูงป่วนงาน: หลอดพิธีขับไล่ลดตามฝีมือมินิเกม
{
  const g = makeGame({ a: 'alpha', w: 'wolf', x: 'villager', y: 'villager' });
  g.day = 1;
  g.bar.value = 10;
  P(g, 'w').pick = 'well';
  P(g, 'w').workScore = 1;
  g.finishDay(null);
  check('ลูกฝูง: ป่วนงานเต็มที่ หลอดลด 3', g.bar.value === 7 && g.dayResults.w.sabotage === 3, `หลอด ${g.bar.value}`);
}

console.log(`\nรวม: ผ่าน ${passed}  ไม่ผ่าน ${failed}`);
process.exit(failed ? 1 : 0);
