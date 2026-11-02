// ทดสอบการเลือกเซิร์ฟเวอร์ช่วยต่อเสียง (STUN/TURN): node tools/test-ice.js (จำลองคำตอบของ Cloudflare ไม่ต้องมีคีย์จริง)
const { iceServers, resetIceCache } = require('../server/ice');

let passed = 0;
let failed = 0;
const check = (name, cond, extra = '') => {
  cond ? passed++ : failed++;
  console.log(`${cond ? 'ผ่าน' : 'ไม่ผ่าน'}  ${name}${extra ? '  ' + extra : ''}`);
};
const realFetch = global.fetch;
const turnUrls = (r) => r.iceServers.filter((s) => s.username).flatMap((s) => [].concat(s.urls));

(async () => {
  resetIceCache();
  let r = await iceServers({});
  check('ไม่ตั้งค่า = STUN อย่างเดียว', !r.relay && r.iceServers.length === 1 && !r.iceServers[0].username);

  resetIceCache();
  r = await iceServers({ TURN_URLS: 'turn:a.example:3478, turns:a.example:443', TURN_USERNAME: 'u', TURN_CREDENTIAL: 'p' });
  check('TURN แบบรหัสคงที่', r.relay && turnUrls(r).length === 2 && r.iceServers[1].credential === 'p');

  let asked = null;
  global.fetch = async (url, opts) => {
    asked = { url, opts };
    return {
      ok: true,
      status: 201,
      json: async () => ({
        iceServers: [
          { urls: ['stun:stun.cloudflare.com:3478'] },
          { urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turn:turn.cloudflare.com:53?transport=udp', 'turns:turn.cloudflare.com:443?transport=tcp'], username: 'cfu', credential: 'cfp' },
        ],
      }),
    };
  };
  resetIceCache();
  r = await iceServers({ CF_TURN_KEY_ID: 'kid', CF_TURN_KEY_TOKEN: 'secret' });
  check('Cloudflare: เรียก API ถูกที่ พร้อมคีย์', asked.url.endsWith('/v1/turn/keys/kid/credentials/generate-ice-servers') && asked.opts.headers.Authorization === 'Bearer secret' && JSON.parse(asked.opts.body).ttl > 3600);
  check('Cloudflare: ได้ TURN และตัดพอร์ต 53 ทิ้ง', r.relay && turnUrls(r).length === 2 && !turnUrls(r).some((u) => u.includes(':53')));
  check('ไม่ส่งคีย์ลับไปให้เบราว์เซอร์', !JSON.stringify(r).includes('secret'));

  let calls = 0;
  global.fetch = async () => {
    calls++;
    return { ok: true, json: async () => ({ iceServers: [] }) };
  };
  await iceServers({ CF_TURN_KEY_ID: 'kid', CF_TURN_KEY_TOKEN: 'secret' });
  check('ใช้รหัสเดิมซ้ำ ไม่ขอ Cloudflare ทุกครั้ง', calls === 0);

  global.fetch = async () => ({ ok: false, status: 401, json: async () => ({}) });
  resetIceCache();
  r = await iceServers({ CF_TURN_KEY_ID: 'kid', CF_TURN_KEY_TOKEN: 'wrong' });
  check('คีย์ผิด / Cloudflare ล่ม = ยังเล่นได้ด้วย STUN', !r.relay && r.iceServers.length === 1);

  global.fetch = realFetch;
  console.log(`\nรวม: ผ่าน ${passed}  ไม่ผ่าน ${failed}`);
  process.exit(failed ? 1 : 0);
})();
