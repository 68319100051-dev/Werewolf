// เก็บค่าของผู้เล่นในเครื่อง (ถ้าเบราว์เซอร์ไม่อนุญาต ก็ใช้ค่าในหน่วยความจำแทน)
const KEY = 'pw_prefs';
let cache = {};
try {
  cache = JSON.parse(localStorage.getItem(KEY) || '{}');
} catch {
  cache = {};
}

export const prefs = {
  get(k, d) {
    return cache[k] ?? d;
  },
  set(k, v) {
    cache[k] = v;
    try {
      localStorage.setItem(KEY, JSON.stringify(cache));
    } catch {
      // ไม่เป็นไร ใช้ค่าในหน่วยความจำไปก่อน
    }
  },
};
