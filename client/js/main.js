import { Boot, Backdrop, Fx } from './scenes/core.js';
import { Title, Login, Menu, Wardrobe, HowTo, Settings } from './scenes/menus.js';
import { RoomList, CreateRoom, Lobby } from './scenes/rooms.js';
import { Game } from './scenes/game.js';
import { Gacha } from './scenes/gacha.js';

window.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 640,
  height: 360,
  backgroundColor: '#0b0a1a',
  pixelArt: true,
  roundPixels: true,
  dom: { createContainer: true },
  // แตะได้หลายนิ้วพร้อมกัน (เช่น ไล่ล่าสด กดซ้าย-ขวาสองนิ้ว)
  input: { activePointers: 3 },
  // เต็มจอทั้งหน้า ไม่ใช่แค่แคนวาส: ช่องพิมพ์/แชท (HTML ที่ลอยทับเกม) จะได้ไม่หายตอนเต็มจอบนมือถือ
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, fullscreenTarget: document.body },
  scene: [Boot, Backdrop, Title, Login, Menu, Wardrobe, HowTo, Settings, RoomList, CreateRoom, Lobby, Game, Gacha, Fx],
});

// ปรับขนาดเกมให้พอดีจอทุกครั้งที่หน้าต่างเปลี่ยนขนาด (รวมถึงหมุนมือถือ)
new ResizeObserver(() => requestAnimationFrame(() => window.game.scale.refresh())).observe(document.getElementById('game'));
