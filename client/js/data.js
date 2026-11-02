export const LOCATIONS = {
  forest: { name: 'ป่าลึก', points: 3, danger: true, desc: 'แต้มสูง แต่มืด จ่าฝูงชอบซุ่มที่นี่' },
  well: { name: 'บ่อน้ำ', points: 2, desc: 'ตักน้ำให้หมู่บ้าน' },
  farm: { name: 'ทุ่งนา', points: 2, desc: 'เก็บเกี่ยวข้าว' },
  church: { name: 'โบสถ์', points: 1, desc: 'สวดภาวนาขับไล่ความชั่วร้าย' },
  tavern: { name: 'โรงเตี๊ยม', points: 1, desc: 'ฟังข่าวลือ และเปลี่ยนชุดได้' },
};

export const ROLE_OPTIONS = [
  { key: 'seer', name: 'หมอดู' },
  { key: 'doctor', name: 'หมอ' },
  { key: 'hunter', name: 'นายพราน' },
  { key: 'detective', name: 'นักสืบ' },
  { key: 'jester', name: 'คนบ้า' },
];

export const ROLES = {
  alpha: {
    name: 'จ่าฝูงหมาป่า', team: 'wolf', icon: 'r_alpha',
    desc: 'กลางวันเลือกซ่อนตัวซุ่ม (ไม่มีใครเห็น ไล่ล่าคนที่มาได้ 1 คน) หรือทำงานปกติให้มีพยาน คืนแรกแอบดมกลิ่นหาพวก คืนต่อไปเลือกเหยื่อ 1 คน',
    goal: 'กำจัดชาวบ้านจนหมาป่ามีจำนวนเท่ากับคนที่เหลือ',
  },
  wolf: {
    name: 'หมาป่า', team: 'wolf', icon: 'r_wolf',
    desc: 'กลางวันแอบป่วนงาน (เล่นเก่ง = หลอดพิธีลด) กลางคืนแอบใส่ร้ายคนอื่น ให้มีข่าวลือชี้ไปที่ชุดของเขา (ระวังคนเฝ้ายาม)',
    goal: 'ช่วยจ่าฝูงกำจัดชาวบ้าน โดยไม่ให้ใครจับได้',
  },
  seer: {
    name: 'หมอดู', team: 'village', icon: 'r_seer',
    desc: 'กลางคืนส่องลูกแก้วดู 1 คน ว่าเป็นหมาป่าหรือไม่',
    goal: 'หาตัวหมาป่าแล้วโน้มน้าวให้ทุกคนโหวต',
  },
  doctor: {
    name: 'หมอ', team: 'village', icon: 'r_doctor',
    desc: 'กลางคืนปกป้อง 1 คนจากหมาป่า (และรักษาแผลให้) ห้ามคนเดิมสองคืนติด',
    goal: 'ช่วยชีวิตชาวบ้าน แล้วจับหมาป่าให้ได้',
  },
  hunter: {
    name: 'นายพราน', team: 'village', icon: 'r_hunter',
    desc: 'ถ้าจ่าฝูงซุ่มทำร้ายคุณ คุณจะสู้กลับ และถ้าคุณตาย คุณยิงคนอื่นตายตามไปได้ 1 คน',
    goal: 'ปกป้องหมู่บ้านและกำจัดหมาป่า',
  },
  detective: {
    name: 'นักสืบ', team: 'village', icon: 'r_detective',
    desc: 'กลางคืนเรียก 1 คนมาสอบปากคำลับ คุยกันได้สองต่อสอง (ห้ามคนเดิมสองคืนติด)',
    goal: 'จับพิรุธคนโกหกและหาตัวหมาป่า',
  },
  jester: {
    name: 'คนบ้า', team: 'neutral', icon: 'r_jester',
    desc: 'ไม่มีพลังพิเศษ แต่คุณชนะคนเดียวทันทีถ้าโดนโหวตแขวนคอ',
    goal: 'ทำตัวให้น่าสงสัยจนทุกคนโหวตแขวนคุณ',
  },
  villager: {
    name: 'ชาวบ้าน', team: 'village', icon: 'r_villager',
    desc: 'ไม่มีพลังพิเศษ แต่ทำเควสได้แต้มมากกว่าคนอื่น +1',
    goal: 'ทำเควสให้หลอดเต็ม และช่วยกันจับหมาป่า',
  },
};

Object.assign(ROLES, {
  watchman: {
    name: 'คนเฝ้ายาม', team: 'village', icon: 'r_watchman',
    desc: 'กลางคืนเฝ้าบ้าน 1 หลัง แล้วจะเห็นว่าใครแวะมาบ้านนั้นบ้าง',
    goal: 'จับตาดูว่าใครออกไปข้างนอกตอนกลางคืน',
  },
  guard: {
    name: 'ทหารยาม', team: 'village', icon: 'r_guard',
    desc: 'ถ้าคุณอยู่ที่เดียวกับจ่าฝูง จ่าฝูงจะซุ่มทำร้ายใครไม่ได้เลย',
    goal: 'คุ้มกันคนที่ไปทำงานในป่า แล้วช่วยจับหมาป่า',
  },
  priest: {
    name: 'นักบวช', team: 'village', icon: 'r_priest',
    desc: 'กลางคืนชุบชีวิตคนที่ตายแล้วได้ 1 ครั้งต่อเกม (ฟื้นมาพร้อม 1 ชีวิต)',
    goal: 'เลือกจังหวะชุบชีวิตคนสำคัญของหมู่บ้าน',
  },
  gravedigger: {
    name: 'สัปเหร่อ', team: 'village', icon: 'r_gravedigger',
    desc: 'รู้อาชีพจริงของทุกคนที่ตาย แม้ห้องจะไม่เปิดเผยอาชีพคนตาย',
    goal: 'ใช้ความรู้เรื่องคนตายช่วยไขปริศนา',
  },
  farmer: {
    name: 'ชาวนา', team: 'village', icon: 'r_farmer',
    desc: 'ทำงานที่ทุ่งนาได้แต้มเควสสองเท่า',
    goal: 'เร่งเติมหลอดพิธีขับไล่ให้เต็ม',
  },
  woodcutter: {
    name: 'คนตัดไม้', team: 'village', icon: 'r_woodcutter',
    desc: 'ป่าลึกได้แต้มเพิ่ม +2 และหลบการซุ่มในป่าได้ 1 ครั้ง',
    goal: 'ทำงานในป่าอย่างกล้าหาญ และจับหมาป่า',
  },
  cupid: {
    name: 'กามเทพ', team: 'village', icon: 'r_cupid',
    desc: 'คืนแรกเลือกคู่รัก 2 คน (เลือกตัวเองได้) ถ้าคนหนึ่งตาย อีกคนตรอมใจตายตาม',
    goal: 'จับคู่ให้ดี แล้วช่วยหมู่บ้านจับหมาป่า',
  },
  shadow: {
    name: 'หมาป่าเงา', team: 'wolf', icon: 'r_shadow',
    desc: 'เหมือนหมาป่าทั่วไป (ป่วนงานกลางวัน ใส่ร้ายคนอื่นกลางคืน) แต่หมอดูส่องแล้วจะเห็นเป็นคนธรรมดา',
    goal: 'ซ่อนตัวให้แนบเนียนและช่วยฝูงกำจัดชาวบ้าน',
  },
  traitor: {
    name: 'คนทรยศ', team: 'wolf', icon: 'r_traitor',
    desc: 'คุณเป็นคน แต่อยู่ฝ่ายหมาป่า ไม่รู้ว่าใครเป็นหมาป่า หมอดูเห็นเป็นคนธรรมดา',
    goal: 'ปั่นหมู่บ้านให้โหวตผิดคน ช่วยหมาป่าชนะ',
  },
});

ROLE_OPTIONS.push(
  { key: 'watchman', name: 'คนเฝ้ายาม' },
  { key: 'guard', name: 'ทหารยาม' },
  { key: 'priest', name: 'นักบวช' },
  { key: 'gravedigger', name: 'สัปเหร่อ' },
  { key: 'farmer', name: 'ชาวนา' },
  { key: 'woodcutter', name: 'คนตัดไม้' },
  { key: 'cupid', name: 'กามเทพ' },
  { key: 'wolf', name: 'หมาป่า' },
  { key: 'shadow', name: 'หมาป่าเงา' },
  { key: 'traitor', name: 'คนทรยศ' },
);

// สถานการณ์ประจำวัน
export const EVENTS = {
  normal: { name: 'วันปกติ', desc: '', icon: null },
  sunny: { name: 'ฟ้าใส', desc: 'อากาศดี ทำงานที่ไหนก็ได้แต้มเควส +1', icon: 'e_sunny' },
  rain: { name: 'ฝนตก', desc: 'จ่าฝูงซุ่มในป่าไม่ได้ แต่ป่าลึกได้แต้มน้อยลง', icon: 'e_rain' },
  fog: { name: 'หมอกลง', desc: 'มองไม่เห็นว่าใครไปทำงานที่เดียวกับเรา', icon: 'e_fog' },
  festival: { name: 'เทศกาลหมู่บ้าน', desc: 'ข่าวลือที่โรงเตี๊ยมวันนี้เป็นเรื่องจริงแน่นอน', icon: 'e_festival' },
  drought: { name: 'บ่อน้ำแห้ง', desc: 'บ่อน้ำได้แต้มเควสแค่ครึ่งเดียว', icon: 'e_drought' },
  harvest: { name: 'ข้าวสุกเต็มทุ่ง', desc: 'ทุ่งนาได้แต้มเควสสองเท่า', icon: 'e_harvest' },
  bell: { name: 'ระฆังร้าว', desc: 'เสียงระฆังเพี้ยน เวลาประชุมเพิ่ม 30 วินาที', icon: 'e_bell' },
  fullmoon: { name: 'พระจันทร์เต็มดวง', desc: 'คืนนี้หมอปกป้องใครไม่ได้เลย', icon: 'e_fullmoon' },
  merchant: { name: 'พ่อค้าเร่มาเยือน', desc: 'ที่โรงเตี๊ยมเปลี่ยนชุดได้ 2 ส่วน', icon: 'e_merchant' },
};

export const TEAM_COLOR = { wolf: '#e0565e', village: '#7ac870', neutral: '#c890f0' };

export const FONT = '"Leelawadee UI", "Tahoma", "Noto Sans Thai", sans-serif';
