// กระเป๋าเงินฝั่งเบราว์เซอร์: เก็บโทเคนที่เซิร์ฟเวอร์ลงลายเซ็นไว้ (แก้เองไม่ได้) ส่งกลับไปทุกครั้งที่ล็อกอิน
import { prefs } from './prefs.js';
import { CATALOG, BASE_SIZE } from '/catalog.js';

const events = new Phaser.Events.EventEmitter();

export const wallet = {
  events,
  coins: 0,
  items: [],
  pity: 0,
  pityMax: 40,
  lastReward: null,

  get token() {
    return prefs.get('wallet', null);
  },

  set(data) {
    if (!data?.token) return;
    this.coins = data.coins;
    this.items = data.items;
    this.pity = data.pity;
    this.pityMax = data.pityMax;
    prefs.set('wallet', data.token);
    if (data.reward) this.lastReward = { ...data.reward, at: Date.now() };
    events.emit('change', data);
  },

  owns(part, value) {
    if (value < BASE_SIZE[part]) return true;
    const it = CATALOG.find((x) => x.part === part && x.value === value);
    return !!it && this.items.includes(it.id);
  },
};
