// เสียงเอฟเฟกต์สังเคราะห์ (ไม่ต้องใช้ไฟล์เสียง)
import { prefs } from './prefs.js';

let ac = null;
let master = null;

function ctx() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  master.gain.value = prefs.get('sfxVolume', 0.6);
  return ac;
}

// ให้เพลงประกอบใช้ระบบเสียงเดียวกัน
export const audio = ctx;

// เบราว์เซอร์อนุญาตให้เล่นเสียงหลังผู้เล่นแตะจอครั้งแรก
window.addEventListener('pointerdown', () => {
  try {
    ctx();
  } catch {
    // ไม่เป็นไร
  }
}, { once: true });

function tone({ freq = 440, to = null, dur = 0.1, type = 'square', vol = 0.15, delay = 0, attack = 0.005 }) {
  const a = ctx();
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise({ dur = 0.15, vol = 0.12, from = 2000, to = 600, delay = 0, q = 1 }) {
  const a = ctx();
  const t = a.currentTime + delay;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

function safe(fn) {
  return (...args) => {
    if (prefs.get('sfxVolume', 0.6) <= 0) return;
    try {
      fn(...args);
    } catch {
      // เบราว์เซอร์อาจยังไม่อนุญาตให้เล่นเสียง
    }
  };
}

export const sfx = {
  hover: safe(() => tone({ freq: 880, dur: 0.03, vol: 0.04 })),
  click: safe(() => {
    tone({ freq: 520, to: 780, dur: 0.07, vol: 0.12 });
  }),
  back: safe(() => tone({ freq: 500, to: 300, dur: 0.08, vol: 0.1 })),
  error: safe(() => {
    tone({ freq: 220, dur: 0.1, vol: 0.12, type: 'sawtooth' });
    tone({ freq: 160, dur: 0.15, vol: 0.12, type: 'sawtooth', delay: 0.1 });
  }),
  success: safe(() => {
    [523, 659, 784].forEach((f, i) => tone({ freq: f, dur: 0.12, vol: 0.1, delay: i * 0.07 }));
  }),
  whoosh: safe(() => noise({ dur: 0.22, vol: 0.08, from: 600, to: 3000, q: 0.7 })),
  flip: safe(() => {
    noise({ dur: 0.06, vol: 0.14, from: 4000, to: 1500, q: 2 });
    tone({ freq: 1200, to: 1800, dur: 0.05, vol: 0.04, delay: 0.03 });
  }),
  deal: safe(() => noise({ dur: 0.09, vol: 0.1, from: 3000, to: 800, q: 1.5 })),
  shine: safe(() => {
    [1318, 1568, 2093].forEach((f, i) => tone({ freq: f, dur: 0.18, vol: 0.05, type: 'triangle', delay: i * 0.05 }));
  }),
  select: safe(() => {
    tone({ freq: 392, dur: 0.1, vol: 0.1, type: 'triangle' });
    tone({ freq: 587, dur: 0.25, vol: 0.1, type: 'triangle', delay: 0.08 });
  }),
  chat: safe(() => tone({ freq: 1000, to: 1300, dur: 0.05, vol: 0.05, type: 'triangle' })),
  join: safe(() => {
    tone({ freq: 440, dur: 0.08, vol: 0.08, type: 'triangle' });
    tone({ freq: 660, dur: 0.12, vol: 0.08, type: 'triangle', delay: 0.07 });
  }),
  slash: safe(() => {
    noise({ dur: 0.18, vol: 0.2, from: 5000, to: 400, q: 0.8 });
    tone({ freq: 140, to: 50, dur: 0.25, vol: 0.18, type: 'sawtooth', delay: 0.04 });
  }),
  growl: safe(() => {
    tone({ freq: 70, to: 55, dur: 0.9, vol: 0.14, type: 'sawtooth', attack: 0.15 });
    tone({ freq: 74, to: 60, dur: 0.9, vol: 0.1, type: 'square', attack: 0.2 });
  }),
  bell: safe(() => {
    [0, 0.9].forEach((d) => {
      tone({ freq: 660, dur: 1.4, vol: 0.09, type: 'triangle', delay: d, attack: 0.002 });
      tone({ freq: 1320, dur: 0.8, vol: 0.03, type: 'sine', delay: d, attack: 0.002 });
    });
  }),
  heartbeat: safe(() => {
    tone({ freq: 60, to: 40, dur: 0.12, vol: 0.2, type: 'sine' });
    tone({ freq: 55, to: 38, dur: 0.12, vol: 0.16, type: 'sine', delay: 0.18 });
  }),
  tick: safe(() => tone({ freq: 1200, dur: 0.03, vol: 0.05, type: 'square' })),
  crackle: safe(() => {
    for (let i = 0; i < 6; i++) noise({ dur: 0.04, vol: 0.12, from: 3000, to: 1200, q: 3, delay: i * 0.07 + Math.random() * 0.05 });
    noise({ dur: 0.5, vol: 0.06, from: 600, to: 200, q: 0.5 });
  }),
  wind: safe(() => {
    noise({ dur: 1.4, vol: 0.09, from: 300, to: 900, q: 4 });
    noise({ dur: 1.2, vol: 0.06, from: 900, to: 400, q: 6, delay: 0.3 });
  }),
  chop: safe(() => {
    noise({ dur: 0.08, vol: 0.18, from: 1800, to: 300, q: 1.2 });
    tone({ freq: 180, to: 90, dur: 0.12, vol: 0.15, type: 'square' });
  }),
  thud: safe(() => tone({ freq: 90, to: 60, dur: 0.15, vol: 0.15, type: 'triangle' })),
  pull: safe(() => tone({ freq: 300 + Math.random() * 80, to: 420, dur: 0.05, vol: 0.06, type: 'square' })),
  splash: safe(() => {
    noise({ dur: 0.35, vol: 0.16, from: 3000, to: 500, q: 0.6 });
    tone({ freq: 700, to: 1100, dur: 0.12, vol: 0.05, type: 'sine', delay: 0.05 });
  }),
  pop: safe(() => tone({ freq: 600, to: 1200, dur: 0.07, vol: 0.09, type: 'square' })),
  bellNote: (freq) => safe(() => {
    tone({ freq, dur: 0.6, vol: 0.1, type: 'triangle', attack: 0.002 });
    tone({ freq: freq * 2, dur: 0.3, vol: 0.03, type: 'sine', attack: 0.002 });
  })(),
  clink: safe(() => {
    tone({ freq: 1500, dur: 0.06, vol: 0.07, type: 'triangle' });
    tone({ freq: 2100, dur: 0.08, vol: 0.05, type: 'triangle', delay: 0.04 });
  }),
  crash: safe(() => noise({ dur: 0.25, vol: 0.16, from: 6000, to: 1500, q: 0.5 })),
  go: safe(() => {
    tone({ freq: 523, dur: 0.1, vol: 0.1 });
    tone({ freq: 1046, dur: 0.18, vol: 0.1, delay: 0.1 });
  }),
  win: safe(() => {
    [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, dur: 0.3, vol: 0.1, type: 'triangle', delay: i * 0.12 }));
  }),
  lose: safe(() => {
    [392, 330, 262, 196].forEach((f, i) => tone({ freq: f, dur: 0.35, vol: 0.1, type: 'triangle', delay: i * 0.16 }));
  }),
  howl: safe(() => {
    const a = ctx();
    const t = a.currentTime;
    const o = a.createOscillator();
    const lfo = a.createOscillator();
    const lfoG = a.createGain();
    const f = a.createBiquadFilter();
    const g = a.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(320, t);
    o.frequency.linearRampToValueAtTime(620, t + 0.6);
    o.frequency.linearRampToValueAtTime(560, t + 1.6);
    o.frequency.linearRampToValueAtTime(380, t + 2.4);
    lfo.frequency.value = 5;
    lfoG.gain.value = 8;
    lfo.connect(lfoG).connect(o.frequency);
    f.type = 'lowpass';
    f.frequency.value = 1100;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.08, t + 0.4);
    g.gain.linearRampToValueAtTime(0.06, t + 1.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    o.connect(f).connect(g).connect(master);
    o.start(t);
    lfo.start(t);
    o.stop(t + 2.7);
    lfo.stop(t + 2.7);
  }),
};

// เสียงการกระทำเพิ่มเติม: โหวต แขวนคอ ปืน พลังกลางคืน เช้า/ค่ำ แต่งตัว อีโมต
function wobble({ freq, to, dur, vol = 0.08, type = 'sine', rate = 6, depth = 20, delay = 0 }) {
  const a = ctx();
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const lfo = a.createOscillator();
  const lg = a.createGain();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  lfo.frequency.value = rate;
  lg.gain.value = depth;
  lfo.connect(lg).connect(o.frequency);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + Math.min(0.15, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  lfo.start(t);
  o.stop(t + dur + 0.05);
  lfo.stop(t + dur + 0.05);
}

const EMOTE_SOUND = {
  wave: () => [1320, 1760].forEach((f, i) => tone({ freq: f, dur: 0.08, vol: 0.06, type: 'triangle', delay: i * 0.08 })),
  laugh: () => [0, 1, 2, 3].forEach((i) => tone({ freq: 700 - i * 40, to: 600 - i * 40, dur: 0.07, vol: 0.07, delay: i * 0.1 })),
  angry: () => tone({ freq: 110, to: 90, dur: 0.4, vol: 0.1, type: 'sawtooth' }),
  what: () => tone({ freq: 400, to: 800, dur: 0.25, vol: 0.07, type: 'triangle' }),
  cry: () => wobble({ freq: 700, to: 380, dur: 0.6, vol: 0.06, rate: 9, depth: 30 }),
  shock: () => tone({ freq: 500, to: 1500, dur: 0.12, vol: 0.08 }),
  fire: () => {
    for (let i = 0; i < 4; i++) noise({ dur: 0.04, vol: 0.1, from: 3000, to: 1200, q: 3, delay: i * 0.06 });
  },
  // อีโมตจากตู้กาชา
  love: () => [880, 1175].forEach((f, i) => tone({ freq: f, dur: 0.14, vol: 0.06, type: 'triangle', delay: i * 0.12 })),
  zzz: () => wobble({ freq: 180, to: 140, dur: 0.9, vol: 0.05, rate: 3, depth: 12 }),
  sus: () => tone({ freq: 700, to: 420, dur: 0.35, vol: 0.07, type: 'square' }),
  sweat: () => tone({ freq: 1400, to: 600, dur: 0.12, vol: 0.06, type: 'sine' }),
  cool: () => [523, 659, 784].forEach((f) => tone({ freq: f, dur: 0.3, vol: 0.04, type: 'triangle' })),
  popcorn: () => {
    for (let i = 0; i < 5; i++) noise({ dur: 0.03, vol: 0.09, from: 2500, to: 2000, q: 4, delay: i * 0.09 + Math.random() * 0.05 });
  },
  party: () => [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, dur: 0.1, vol: 0.06, type: 'square', delay: i * 0.08 })),
  skull: () => {
    tone({ freq: 120, to: 60, dur: 0.3, vol: 0.12, type: 'triangle' });
    wobble({ freq: 300, to: 200, dur: 0.6, vol: 0.04, rate: 6, depth: 20, delay: 0.25 });
  },
  firework: () => {
    tone({ freq: 400, to: 1600, dur: 0.35, vol: 0.05, type: 'sine' });
    for (let i = 0; i < 6; i++) noise({ dur: 0.08, vol: 0.08, from: 4000, to: 800, q: 1, delay: 0.38 + i * 0.05 });
  },
  howl: () => wobble({ freq: 420, to: 680, dur: 1.2, vol: 0.06, rate: 5, depth: 18 }),
};

Object.assign(sfx, {
  step: safe(() => noise({ dur: 0.05, vol: 0.06, from: 500, to: 200, q: 1.5 })),
  steps: (n = 4, gap = 0.22) => safe(() => {
    for (let i = 0; i < n; i++) noise({ dur: 0.05, vol: 0.06, from: 500, to: 200, q: 1.5, delay: i * gap });
  })(),
  coin: safe(() => {
    tone({ freq: 988, dur: 0.07, vol: 0.08 });
    tone({ freq: 1319, dur: 0.18, vol: 0.08, delay: 0.07 });
  }),
  stamp: safe(() => {
    tone({ freq: 120, to: 70, dur: 0.1, vol: 0.14, type: 'triangle' });
    noise({ dur: 0.05, vol: 0.12, from: 2500, to: 900, q: 1 });
  }),
  drumroll: safe(() => {
    for (let i = 0; i < 18; i++) noise({ dur: 0.05, vol: 0.05 + i * 0.004, from: 900, to: 300, q: 1.2, delay: i * 0.085 });
  }),
  hang: safe(() => {
    tone({ freq: 220, to: 160, dur: 0.5, vol: 0.05, type: 'sawtooth', attack: 0.1 });
    noise({ dur: 0.18, vol: 0.18, from: 1200, to: 200, q: 0.8, delay: 0.45 });
    tone({ freq: 80, to: 45, dur: 0.3, vol: 0.18, type: 'triangle', delay: 0.45 });
  }),
  gunshot: safe(() => {
    noise({ dur: 0.35, vol: 0.3, from: 4000, to: 300, q: 0.4 });
    tone({ freq: 90, to: 35, dur: 0.4, vol: 0.22, type: 'triangle' });
  }),
  orb: safe(() => {
    [784, 988, 1175, 1568].forEach((f, i) => wobble({ freq: f, dur: 0.5, vol: 0.04, rate: 7, depth: 8, delay: i * 0.09 }));
  }),
  heal: safe(() => {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ freq: f, dur: 0.2, vol: 0.05, type: 'triangle', delay: i * 0.05 }));
  }),
  arrow: safe(() => {
    tone({ freq: 220, to: 110, dur: 0.15, vol: 0.12, type: 'triangle' });
    noise({ dur: 0.2, vol: 0.06, from: 800, to: 4000, q: 0.7, delay: 0.05 });
    tone({ freq: 1568, dur: 0.25, vol: 0.04, type: 'sine', delay: 0.25 });
  }),
  revive: safe(() => {
    [392, 494, 587, 784].forEach((f) => tone({ freq: f, dur: 1.4, vol: 0.05, type: 'sine', attack: 0.4 }));
    tone({ freq: 1568, dur: 0.6, vol: 0.03, type: 'triangle', delay: 0.6 });
  }),
  ghost: safe(() => wobble({ freq: 520, to: 260, dur: 1.6, vol: 0.06, rate: 4, depth: 25 })),
  rooster: safe(() => {
    [[600, 700, 0.12], [700, 900, 0.12], [900, 1100, 0.35], [1000, 700, 0.3]].forEach(([f, to, d], i, arr) => {
      const delay = arr.slice(0, i).reduce((s, x) => s + x[2], 0);
      tone({ freq: f, to, dur: d, vol: 0.05, type: 'square', delay });
    });
  }),
  birds: safe(() => {
    for (let i = 0; i < 5; i++) tone({ freq: 2400 + Math.random() * 800, to: 3200 + Math.random() * 600, dur: 0.06, vol: 0.03, type: 'sine', delay: i * 0.13 + (i > 2 ? 0.4 : 0) });
  }),
  owl: safe(() => {
    tone({ freq: 380, to: 340, dur: 0.35, vol: 0.06, type: 'sine', attack: 0.05 });
    tone({ freq: 360, to: 320, dur: 0.6, vol: 0.06, type: 'sine', attack: 0.08, delay: 0.5 });
  }),
  tickHi: safe(() => tone({ freq: 1800, dur: 0.05, vol: 0.09, type: 'square' })),
  cloth: safe(() => noise({ dur: 0.18, vol: 0.07, from: 1500, to: 4000, q: 0.6 })),
  sparkle: safe(() => {
    [1568, 2093, 2637, 3136].forEach((f, i) => tone({ freq: f, dur: 0.12, vol: 0.04, type: 'triangle', delay: i * 0.05 }));
  }),
  knock: safe(() => {
    [0, 0.16].forEach((d) => tone({ freq: 160, to: 110, dur: 0.08, vol: 0.16, type: 'triangle', delay: d }));
  }),
  die: safe(() => [440, 370, 311, 220].forEach((f, i) => tone({ freq: f, dur: 0.18, vol: 0.07, type: 'square', delay: i * 0.12 }))),
  gasp: safe(() => noise({ dur: 0.3, vol: 0.1, from: 1800, to: 900, q: 1.5 })),
  cheer: safe(() => {
    noise({ dur: 1.2, vol: 0.06, from: 1200, to: 2000, q: 0.8 });
    [523, 659, 784].forEach((f, i) => tone({ freq: f, dur: 0.2, vol: 0.05, type: 'triangle', delay: 0.1 + i * 0.1 }));
  }),
  murmur: safe(() => {
    for (let i = 0; i < 6; i++) noise({ dur: 0.25, vol: 0.035, from: 500 + Math.random() * 400, to: 300, q: 4, delay: i * 0.18 });
  }),
  ready: safe(() => {
    tone({ freq: 784, dur: 0.08, vol: 0.07, type: 'triangle' });
    tone({ freq: 1175, dur: 0.15, vol: 0.07, type: 'triangle', delay: 0.08 });
  }),
  emote: (key) => safe(() => EMOTE_SOUND[key]?.())(),
});
