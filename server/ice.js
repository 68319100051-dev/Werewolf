// เซิร์ฟเวอร์ช่วยต่อเสียง (STUN/TURN) ให้ไมค์ต่อติดแม้ผู้เล่นอยู่คนละเน็ต (เน็ตมือถือ / หอพัก / ออฟฟิศ)
// ตั้งค่าผ่าน environment ของเซิร์ฟเวอร์ (ห้ามใส่คีย์ในโค้ดฝั่งเบราว์เซอร์):
//   CF_TURN_KEY_ID + CF_TURN_KEY_TOKEN  = Cloudflare Realtime TURN (ฟรี 1,000 GB/เดือน) ขอรหัสชั่วคราวให้เอง
//   TURN_URLS (คั่นด้วย ,) + TURN_USERNAME + TURN_CREDENTIAL = TURN เจ้าอื่นแบบรหัสคงที่
// ไม่ตั้งอะไรเลย = ใช้ STUN อย่างเดียว (คนอยู่เน็ตเดียวกันหรือเน็ตบ้านทั่วไปต่อติด แต่บางเน็ตจะต่อไม่ติด)
const STUN = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }];
const TTL = 24 * 3600; // อายุรหัส TURN (วินาที)
const REUSE_MS = 6 * 3600 * 1000; // ใช้รหัสเดิมซ้ำได้ 6 ชั่วโมง (เหลืออายุพอสำหรับเกมยาว ๆ)
const RETRY_MS = 10 * 60 * 1000; // ขอ TURN ไม่สำเร็จ: ลองใหม่ทุก 10 นาที

let cache = null;

async function cloudflare(id, token) {
  const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(id)}/credentials/generate-ice-servers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttl: TTL }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Cloudflare TURN ตอบ ${res.status}`);
  const body = await res.json();
  // เบราว์เซอร์บล็อกพอร์ต 53 ตัดทิ้งไปเลย จะได้ไม่ต้องรอหมดเวลา
  return (body.iceServers || [])
    .filter((s) => s.username && s.credential)
    .map((s) => ({ ...s, urls: [].concat(s.urls).filter((u) => !/:53(\?|$)/.test(u)) }))
    .filter((s) => s.urls.length);
}

function staticTurn(env) {
  const urls = env.TURN_URLS.split(',').map((u) => u.trim()).filter(Boolean);
  return urls.length ? [{ urls, username: env.TURN_USERNAME || '', credential: env.TURN_CREDENTIAL || '' }] : [];
}

async function iceServers(env = process.env) {
  if (cache && cache.until > Date.now()) return cache.value;
  let turn = [];
  try {
    if (env.CF_TURN_KEY_ID && env.CF_TURN_KEY_TOKEN) turn = await cloudflare(env.CF_TURN_KEY_ID, env.CF_TURN_KEY_TOKEN);
    else if (env.TURN_URLS) turn = staticTurn(env);
  } catch (err) {
    console.error('ขอเซิร์ฟเวอร์ TURN ไม่ได้ (ใช้ STUN อย่างเดียวไปก่อน):', err.message);
  }
  const value = { iceServers: [...STUN, ...turn], relay: turn.length > 0 };
  cache = { value, until: Date.now() + (turn.length ? REUSE_MS : RETRY_MS) };
  return value;
}

function resetIceCache() {
  cache = null;
}

module.exports = { iceServers, resetIceCache, STUN };
