// คุยด้วยเสียงแบบต่อตรงระหว่างผู้เล่น (WebRTC) เซิร์ฟเวอร์แค่ส่งสัญญาณเชื่อมต่อ
// เซิร์ฟเวอร์บอกว่าเราพูดได้ไหม (canSpeak) และได้ยินใครบ้าง (hear) ตามเฟสของเกม
import { net } from './net.js';
import { prefs } from './prefs.js';

// ค่าเริ่มต้นถ้าเซิร์ฟเวอร์ไม่ได้ส่งมา (เซิร์ฟเวอร์จะส่ง TURN มาด้วยถ้าตั้งค่าไว้ ต่อข้ามเน็ตได้)
const ICE = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }];
// ทดสอบว่า TURN ใช้ได้จริง: เปิดเว็บด้วย ?relay=1 จะบังคับส่งเสียงผ่าน TURN อย่างเดียว
const FORCE_RELAY = new URLSearchParams(location.search).has('relay');
const MAX_RETRY = 2;
// ต่อไม่ติดบางแบบเบราว์เซอร์ค้างอยู่ที่ "กำลังเชื่อมต่อ" ไม่ยอมบอกว่าล้มเหลว: เกินเวลานี้ถือว่าไม่ติด
const CONNECT_TIMEOUT = 10000;
const TALK_LEVEL = 0.035;
const events = new Phaser.Events.EventEmitter();

let audioCtx = null;
function ac() {
  audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function makeAnalyser(stream) {
  const a = ac().createAnalyser();
  a.fftSize = 512;
  ac().createMediaStreamSource(stream).connect(a);
  return { a, buf: new Float32Array(a.fftSize) };
}

function level({ a, buf }) {
  a.getFloatTimeDomainData(buf);
  let sum = 0;
  for (const v of buf) sum += v * v;
  return Math.sqrt(sum / buf.length);
}

// ไมค์ปลอม (เสียงสัญญาณ) ไว้ทดสอบโดยไม่ต้องใช้ไมค์จริง: เปิดเว็บด้วย ?fakeMic=1
function fakeMicStream() {
  const ctx = ac();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 330;
  gain.gain.value = 0.2;
  const dest = ctx.createMediaStreamDestination();
  osc.connect(gain).connect(dest);
  osc.start();
  return dest.stream;
}

export const voice = {
  events,
  joined: false,
  joining: false,
  listenOnly: false,
  stream: null,
  local: null,
  peers: new Map(),
  ice: ICE,
  relay: false,
  // สถานะการต่อเสียงกับแต่ละคน: connecting / ok / failed (ลองใหม่ครบแล้วยังไม่ติด)
  links: new Map(),
  retries: new Map(),
  state: { canSpeak: false, hear: [], off: false },
  holding: false,
  talking: new Map(),

  get pushToTalk() {
    return prefs.get('pushToTalk', true);
  },

  get transmitting() {
    return this.joined && !this.listenOnly && this.state.canSpeak && (!this.pushToTalk || this.holding);
  },

  async join() {
    if (this.joined || this.joining) return { ok: true };
    this.joining = true;
    try {
      if (!this.stream) {
        if (new URLSearchParams(location.search).has('fakeMic')) {
          this.stream = fakeMicStream();
        } else if (navigator.mediaDevices?.getUserMedia) {
          try {
            this.stream = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
          } catch {
            this.stream = null;
          }
        }
      }
      this.listenOnly = !this.stream;
      if (this.stream && !this.local) this.local = makeAnalyser(this.stream);
      const res = await net.call('voice:join');
      if (!res.ok) return res;
      this.ice = res.iceServers?.length ? res.iceServers : ICE;
      this.relay = !!res.relay;
      this.joined = true;
      this.applyTrack();
      // คนที่เข้ามาใหม่เป็นฝ่ายเริ่มเชื่อมต่อกับทุกคนที่อยู่ก่อน (กันชนกันสองฝั่ง)
      for (const id of res.members) this.connect(id, true);
      events.emit('change');
      return { ok: true, listenOnly: this.listenOnly };
    } finally {
      this.joining = false;
    }
  },

  leave() {
    if (!this.joined) return;
    net.socket.emit('voice:leave');
    this.closeAll();
    this.joined = false;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.local = null;
    events.emit('change');
  },

  closeAll() {
    for (const id of [...this.peers.keys()]) this.drop(id);
    this.links.clear();
    this.retries.clear();
  },

  drop(id) {
    const p = this.peers.get(id);
    if (!p) return;
    clearTimeout(p.timer);
    p.pc.close();
    p.audio?.remove();
    this.peers.delete(id);
    this.setTalking(id, false);
  },

  connect(id, initiator) {
    this.drop(id);
    const pc = new RTCPeerConnection({ iceServers: this.ice, iceTransportPolicy: FORCE_RELAY ? 'relay' : 'all' });
    const peer = { pc, audio: null, analyser: null, pending: [] };
    this.peers.set(id, peer);
    this.setLink(id, 'connecting');
    peer.timer = setTimeout(() => {
      if (this.peers.get(id)?.pc === pc && pc.connectionState !== 'connected') this.retry(id);
    }, CONNECT_TIMEOUT);
    if (this.stream) this.stream.getTracks().forEach((t) => pc.addTrack(t, this.stream));
    else pc.addTransceiver('audio', { direction: 'recvonly' });
    pc.onicecandidate = (e) => e.candidate && net.socket.emit('voice:signal', { to: id, data: { candidate: e.candidate } });
    pc.ontrack = (e) => {
      const audio = document.createElement('audio');
      audio.autoplay = true;
      audio.srcObject = e.streams[0];
      audio.muted = !this.state.hear.includes(id);
      document.body.appendChild(audio);
      audio.play().catch(() => {});
      peer.audio = audio;
      peer.analyser = makeAnalyser(e.streams[0]);
    };
    pc.onconnectionstatechange = () => {
      if (this.peers.get(id)?.pc !== pc) return;
      if (pc.connectionState === 'connected') {
        this.retries.delete(id);
        this.setLink(id, 'ok');
      } else if (pc.connectionState === 'failed') this.retry(id);
    };
    if (initiator) {
      (async () => {
        await pc.setLocalDescription(await pc.createOffer());
        net.socket.emit('voice:signal', { to: id, data: { sdp: pc.localDescription } });
      })().catch(() => this.drop(id));
    }
    return peer;
  },

  // ต่อไม่ติด: ลองใหม่ไม่เกิน MAX_RETRY ครั้ง ให้ฝั่งที่ไอดีน้อยกว่าเป็นคนเริ่ม (อีกฝั่งรอรับ กันชนกัน)
  retry(id) {
    this.drop(id);
    const n = (this.retries.get(id) || 0) + 1;
    this.retries.set(id, n);
    if (n > MAX_RETRY) {
      this.setLink(id, 'failed');
      events.emit('linkfail', id);
      return;
    }
    this.setLink(id, 'connecting');
    if (String(net.me) < String(id)) setTimeout(() => this.joined && !this.peers.has(id) && this.connect(id, true), 800 * n);
  },

  setLink(id, s) {
    if (this.links.get(id) === s) return;
    this.links.set(id, s);
    events.emit('change');
  },

  get failedLinks() {
    return [...this.links].filter(([, s]) => s === 'failed').map(([id]) => id);
  },

  async onSignal({ from, data }) {
    if (!this.joined) return;
    let peer = this.peers.get(from);
    try {
      if (data.sdp) {
        if (data.sdp.type === 'offer') peer = this.connect(from, false);
        if (!peer) return;
        await peer.pc.setRemoteDescription(data.sdp);
        for (const c of peer.pending) await peer.pc.addIceCandidate(c);
        peer.pending = [];
        if (data.sdp.type === 'offer') {
          await peer.pc.setLocalDescription(await peer.pc.createAnswer());
          net.socket.emit('voice:signal', { to: from, data: { sdp: peer.pc.localDescription } });
        }
      } else if (data.candidate && peer) {
        if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(data.candidate);
        else peer.pending.push(data.candidate);
      }
    } catch {
      // สัญญาณเสีย ปล่อยให้อีกฝั่งลองใหม่
    }
  },

  onState(state) {
    this.state = state;
    for (const [id, p] of this.peers) if (p.audio) p.audio.muted = !state.hear.includes(id);
    this.applyTrack();
    events.emit('change');
  },

  setHolding(on) {
    if (this.holding === on) return;
    this.holding = on;
    this.applyTrack();
    events.emit('change');
  },

  applyTrack() {
    const on = this.transmitting;
    this.stream?.getAudioTracks().forEach((t) => (t.enabled = on));
  },

  setTalking(id, on) {
    if ((this.talking.get(id) || false) === on) return;
    this.talking.set(id, on);
    events.emit('talking', id, on);
  },

  // ตรวจว่าใครกำลังพูด (วัดความดังเสียงทุก ๆ 120 มิลลิวินาที)
  tick() {
    if (!this.joined) return;
    if (this.local) this.setTalking(net.me, this.transmitting && level(this.local) > TALK_LEVEL);
    for (const [id, p] of this.peers) {
      const audible = p.analyser && this.state.hear.includes(id);
      this.setTalking(id, !!audible && level(p.analyser) > TALK_LEVEL);
    }
  },
};

net.socket.on('voice:signal', (m) => voice.onSignal(m));
net.socket.on('voice:state', (s) => voice.onState(s));
net.socket.on('voice:peer-joined', () => events.emit('change'));
net.socket.on('voice:peer-left', ({ id }) => {
  voice.drop(id);
  voice.links.delete(id);
  voice.retries.delete(id);
  events.emit('change');
});
net.events.on('kicked', () => voice.leave());
// เน็ตหลุดแล้วกลับมา: เข้าระบบเสียงใหม่อัตโนมัติ
net.events.on('connection', (ok) => {
  if (!ok && voice.joined) {
    voice.closeAll();
    voice.joined = false;
    voice.rejoin = true;
  }
});
net.events.on('room', () => {
  if (voice.rejoin && net.room) {
    voice.rejoin = false;
    voice.join();
  }
});
setInterval(() => voice.tick(), 120);

// ปุ่ม V = กดค้างเพื่อพูด (ไม่นับตอนกำลังพิมพ์ในช่องข้อความ)
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyV' && !e.repeat && !(e.target instanceof HTMLInputElement)) voice.setHolding(true);
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyV') voice.setHolding(false);
});
window.addEventListener('blur', () => voice.setHolding(false));
