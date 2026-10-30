// ระบบเสียง: เซิร์ฟเวอร์แค่ส่งสัญญาณเชื่อมต่อ (WebRTC) เสียงจริงวิ่งตรงระหว่างผู้เล่น
// ไฟล์นี้คำนวณว่าแต่ละคน "พูดได้ไหม" และ "ได้ยินใครบ้าง" ตามสถานะห้องและเฟสของเกม

/**
 * คืนค่า Map: playerId -> { canSpeak, hear: [playerId], channel }
 * - ห้องรอ: ทุกคนพูดและได้ยินกันหมด
 * - ในเกม: ใช้ช่องเดียวกับแชท (ประชุม / ห้องผี / สอบปากคำ) ใครอยู่ในกลุ่มที่ได้รับข้อความของผู้พูด คนนั้นได้ยิน
 * - ห้องตั้งเป็น "พิมพ์อย่างเดียว": ปิดเสียงทั้งหมด
 */
function voicePlan(room) {
  const plan = new Map();
  const members = [...(room.voice || [])];
  if (room.settings.voiceMode === 'text') {
    members.forEach((id) => plan.set(id, { canSpeak: false, hear: [], channel: null, off: true }));
    return plan;
  }
  const game = room.game;
  if (!game) {
    members.forEach((id) => plan.set(id, { canSpeak: true, hear: members.filter((x) => x !== id), channel: 'lobby' }));
    return plan;
  }
  const channel = new Map();
  for (const id of members) {
    const gp = game.players.get(id);
    channel.set(id, gp ? game.chatChannel(gp) : null);
  }
  for (const id of members) {
    const hear = members.filter((other) => {
      if (other === id) return false;
      const ch = channel.get(other);
      if (!ch) return false;
      return game.chatTargets(game.players.get(other), ch).some((t) => t.id === id);
    });
    plan.set(id, { canSpeak: !!channel.get(id), hear, channel: channel.get(id) });
  }
  return plan;
}

module.exports = { voicePlan };
