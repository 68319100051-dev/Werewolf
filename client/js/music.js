// เพลงประกอบแบบชิปทูน สังเคราะห์สด ๆ ในเบราว์เซอร์ (ไม่ต้องใช้ไฟล์เพลง)
// แต่ละเพลงเขียนเป็นโน้ตทีละ 1/8 จังหวะ: "C5" = โน้ต, "." = ลากเสียงต่อ/เงียบ, "|" = แบ่งห้อง (ไว้อ่านง่าย)
// กลอง: k = กระเดื่อง, s = สแนร์, h = ไฮแฮต
import { audio } from './sfx.js';
import { prefs } from './prefs.js';

const SEMI = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const hz = (n) => {
  const m = /^([A-G][#b]?)(\d)$/.exec(n);
  return 440 * 2 ** ((SEMI[m[1]] + (Number(m[2]) + 1) * 12 - 69) / 12);
};
const parse = (s) => s.split(/\s+/).filter((t) => t && t !== '|');

const TRACKS = {
  // หมู่บ้านอบอุ่น (หน้าเมนู / ห้องรอ)
  menu: {
    bpm: 96,
    lead: { wave: 'triangle', vol: 0.09, notes: 'E5 . G5 . A5 G5 E5 . | D5 . E5 . C5 . . . | E5 . G5 . A5 . C6 . | B5 A5 G5 . E5 . . . | F5 . A5 . C6 . A5 . | G5 . E5 . C5 . D5 . | E5 . D5 . C5 . A4 . | C5 . . . . . . .' },
    bass: { wave: 'square', vol: 0.035, notes: 'C3 . G3 . C3 . G3 . | G2 . D3 . G2 . D3 . | A2 . E3 . A2 . E3 . | E2 . B2 . E2 . B2 . | F2 . C3 . F2 . C3 . | C3 . G3 . C3 . G3 . | F2 . C3 . G2 . D3 . | C3 . G3 . C3 . . .' },
    drums: 'k . h . s . h . | k . h . s . h h',
  },
  // กลางวันสดใส (จั่วการ์ด / ทำงาน)
  day: {
    bpm: 108,
    lead: { wave: 'square', vol: 0.045, notes: 'D5 . G5 A5 B5 . A5 G5 | E5 . . D5 E5 . G5 . | D5 . G5 A5 B5 . D6 . | C6 B5 A5 . G5 . . . | E5 . G5 . C6 . B5 A5 | B5 . G5 . D5 . . . | C5 . E5 . A5 G5 F#5 . | G5 . . . . . . .' },
    bass: { wave: 'triangle', vol: 0.12, notes: 'G2 . D3 . G2 . D3 . | C3 . G3 . C3 . G3 . | G2 . D3 . G2 . D3 . | D3 . A3 . D3 . A3 . | C3 . G3 . C3 . G3 . | G2 . D3 . G2 . D3 . | A2 . E3 . D3 . A3 . | G2 . D3 . G2 . . .' },
    drums: 'k h h h s h h h | k h k h s h h h',
  },
  // กลางคืนหลอน ๆ: ระฆังห่าง ๆ บนเสียงทุ้มยาว
  night: {
    bpm: 66,
    lead: { wave: 'sine', vol: 0.08, pluck: true, notes: 'A5 . . . . . E5 . | . . . . C6 . . . | B5 . . . . . G5 . | . . . . . . . . | F5 . . . . . A5 . | . . . . E5 . . . | D5 . . . C5 . B4 . | . . . . . . . .' },
    bass: { wave: 'sawtooth', vol: 0.03, filter: 500, notes: 'A2 . . . . . . . | F2 . . . . . . . | G2 . . . . . . . | E2 . . . . . . . | D2 . . . . . . . | A2 . . . . . . . | F2 . . . E2 . . . | A2 . . . . . . .' },
    drums: 'k . . . . . . . | . . . . . . . .',
  },
  // ประชุม: ชวนคิด ไม่เร่งเกินไป
  meeting: {
    bpm: 92,
    lead: { wave: 'triangle', vol: 0.08, notes: 'D5 . F5 . A5 . G5 F5 | E5 . . . C5 . . . | D5 . F5 . A5 . C6 . | B5 A5 G5 . A5 . . . | Bb5 . A5 . G5 . F5 . | G5 . E5 . C5 . . . | D5 . E5 . F5 . E5 . | D5 . . . . . . .' },
    bass: { wave: 'square', vol: 0.03, notes: 'D3 . A3 . D3 . A3 . | C3 . G3 . C3 . G3 . | Bb2 . F3 . Bb2 . F3 . | A2 . E3 . A2 . E3 . | G2 . D3 . G2 . D3 . | C3 . G3 . C3 . G3 . | Bb2 . F3 . A2 . E3 . | D3 . A3 . D3 . . .' },
    drums: 'k . h . s . h h',
  },
  // กดดัน: โหวต / ไล่ล่า / นายพราน
  tension: {
    bpm: 140,
    lead: { wave: 'square', vol: 0.04, notes: 'E5 . E5 G5 . E5 F#5 . | E5 . E5 B5 . A5 G5 . | E5 . E5 G5 . E5 F#5 . | D5 . D5 F#5 . E5 D5 .' },
    bass: { wave: 'triangle', vol: 0.13, notes: 'E2 E2 E3 E2 E2 E3 E2 E3 | C2 C2 C3 C2 C2 C3 C2 C3 | E2 E2 E3 E2 E2 E3 E2 E3 | D2 D2 D3 D2 B1 B1 B2 B1' },
    drums: 'k h s h k k s h',
  },
};

const JINGLES = {
  win: { bpm: 150, wave: 'square', notes: 'C5 E5 G5 C6 . G5 C6 . . . . .' },
  lose: { bpm: 90, wave: 'triangle', notes: 'A4 . G4 . F4 . E4 . . . . .' },
};

let bus = null; // ตัวปรับเสียงรวมของเพลง
let current = null; // { name, gain, timer }

function out() {
  const ac = audio();
  if (!bus) {
    bus = ac.createGain();
    bus.connect(ac.destination);
  }
  bus.gain.value = prefs.get('musicVolume', 0.5);
  return ac;
}

function note(ac, dest, { wave, vol, freq, t, dur, pluck, filter }) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = wave;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  if (pluck) g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.3, dur));
  else {
    g.gain.setValueAtTime(vol, t + Math.max(0.02, dur - 0.04));
    g.gain.linearRampToValueAtTime(0, t + dur);
  }
  let node = o;
  if (filter) {
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filter;
    node = o.connect(f);
  }
  node.connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + (pluck ? 0.4 : 0.05));
}

function drum(ac, dest, kind, t) {
  if (kind === 'k') {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.15);
    return;
  }
  const len = Math.floor(ac.sampleRate * (kind === 's' ? 0.12 : 0.04));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = kind === 's' ? 'bandpass' : 'highpass';
  f.frequency.value = kind === 's' ? 1800 : 7000;
  const g = ac.createGain();
  g.gain.setValueAtTime(kind === 's' ? 0.07 : 0.025, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len / ac.sampleRate);
  src.connect(f).connect(g).connect(dest);
  src.start(t);
}

// โน้ตแต่ละตัวยาวกี่ช่อง (นับ "." ที่ตามหลัง)
function voice(def) {
  const tokens = parse(def.notes);
  return tokens.map((tok, i) => {
    if (tok === '.') return null;
    let len = 1;
    while (tokens[(i + len) % tokens.length] === '.' && len < tokens.length) len++;
    return { freq: hz(tok), len };
  });
}

function start(name) {
  const tr = TRACKS[name];
  const ac = out();
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0, ac.currentTime);
  gain.gain.linearRampToValueAtTime(1, ac.currentTime + 1.2);
  gain.connect(bus);
  const step = 60 / tr.bpm / 2;
  const lead = voice(tr.lead);
  const bass = voice(tr.bass);
  const drums = parse(tr.drums);
  let i = 0;
  let next = ac.currentTime + 0.1;
  const play = { name, gain };
  const tick = () => {
    while (next < ac.currentTime + 0.25) {
      const l = lead[i % lead.length];
      if (l) note(ac, gain, { ...tr.lead, freq: l.freq, t: next, dur: l.len * step * 0.95 });
      const b = bass[i % bass.length];
      if (b) note(ac, gain, { ...tr.bass, freq: b.freq, t: next, dur: b.len * step * 0.9 });
      const d = drums[i % drums.length];
      if (d && d !== '.') drum(ac, gain, d, next);
      next += step;
      i++;
    }
  };
  tick();
  play.timer = setInterval(tick, 60);
  return play;
}

function fadeOut(play, sec = 0.8) {
  if (!play) return;
  const ac = audio();
  clearInterval(play.timer);
  play.gain.gain.cancelScheduledValues(ac.currentTime);
  play.gain.gain.setValueAtTime(play.gain.gain.value, ac.currentTime);
  play.gain.gain.linearRampToValueAtTime(0, ac.currentTime + sec);
  setTimeout(() => play.gain.disconnect(), sec * 1000 + 300);
}

export const music = {
  // เปลี่ยนเพลง (ถ้าเป็นเพลงเดิมอยู่แล้วก็เล่นต่อ ไม่เริ่มใหม่)
  play(name) {
    if (current?.name === name) return;
    try {
      fadeOut(current);
      current = name && TRACKS[name] ? start(name) : null;
    } catch (e) {
      console.warn('เล่นเพลงไม่ได้', e);
      current = null;
    }
  },

  stop() {
    this.play(null);
  },

  jingle(name) {
    this.stop();
    try {
      const j = JINGLES[name];
      const ac = out();
      const step = 60 / j.bpm / 2;
      voice(j).forEach((n, i) => n && note(ac, bus, { wave: j.wave, vol: 0.1, freq: n.freq, t: ac.currentTime + 0.05 + i * step, dur: n.len * step }));
    } catch {
      // ไม่เป็นไร
    }
  },

  setVolume(v) {
    prefs.set('musicVolume', v);
    if (bus) bus.gain.value = v;
  },
};
