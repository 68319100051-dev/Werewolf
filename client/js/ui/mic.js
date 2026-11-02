// ปุ่มไมค์: เปิด/ปิดระบบเสียง + ปุ่มกดค้างเพื่อพูด
import { voice } from '../voice.js';
import { net } from '../net.js';
import { sfx } from '../sfx.js';
import { Button, txt, toast, COLORS } from './widgets.js';

export class MicControl {
  constructor(scene, { x, y, holdX, holdY, holdW = 112, depth = 0 }) {
    this.scene = scene;
    this.toggle = new Button(scene, x, y, '', { w: 26, h: 24, icon: 'i_mic', color: 'btn_dark', onClick: () => this.onToggle() }).setDepth(depth);
    this.dot = scene.add.circle(x + 9, y - 7, 3, 0x6a6478).setDepth(depth + 1);
    this.slash = scene.add.rectangle(x, y, 18, 2, 0xe0565e).setAngle(-45).setDepth(depth + 1);

    this.hold = new Button(scene, holdX, holdY, 'กดค้างพูด (V)', { w: holdW, h: 24, size: 11, color: 'btn_green', icon: 'i_mic' }).setDepth(depth);
    this.hold.on('pointerdown', () => voice.setHolding(true));
    this.hold.on('pointerup', () => voice.setHolding(false));
    this.hold.on('pointerout', () => voice.setHolding(false));
    this.status = txt(scene, holdX, holdY, '', { size: 10, color: COLORS.dim }).setDepth(depth);

    this.onChange = () => this.refresh();
    voice.events.on('change', this.onChange);
    // ต่อเสียงกับใครไม่ติดจริง ๆ (ลองใหม่ครบแล้ว) บอกชื่อให้รู้ จะได้ไม่งงว่าทำไมไม่ได้ยิน
    this.onFail = (id) => {
      const name = net.room?.players.find((p) => p.id === id)?.name || 'เพื่อน';
      toast(scene, `ต่อเสียงกับ ${name} ไม่ติด (เน็ตอาจบล็อก) ใช้แชทแทนก่อนนะ`, 'error');
    };
    voice.events.on('linkfail', this.onFail);
    scene.events.once('shutdown', () => {
      voice.events.off('change', this.onChange);
      voice.events.off('linkfail', this.onFail);
      voice.setHolding(false);
    });
    this.refresh();
  }

  async onToggle() {
    if (voice.joined) {
      voice.leave();
      toast(this.scene, 'ปิดเสียงแล้ว');
      return;
    }
    if (voice.state.off) {
      sfx.error();
      return toast(this.scene, 'ห้องนี้ตั้งเป็นพิมพ์อย่างเดียว', 'error');
    }
    const res = await voice.join();
    if (!res.ok) {
      sfx.error();
      return toast(this.scene, res.error || 'เปิดเสียงไม่ได้', 'error');
    }
    if (res.listenOnly) toast(this.scene, 'ใช้ไมค์ไม่ได้ (ยังไม่อนุญาต) ฟังได้อย่างเดียว', 'error');
    else toast(this.scene, voice.pushToTalk ? 'เปิดเสียงแล้ว กดค้างปุ่ม V เพื่อพูด' : 'เปิดเสียงแล้ว (ไมค์เปิดตลอด)', 'success');
  }

  refresh() {
    if (!this.toggle.active) return;
    const j = voice.joined;
    const canSpeak = j && voice.state.canSpeak && !voice.listenOnly;
    // จุดสีส้ม = มีบางคนต่อเสียงไม่ติด
    const failed = j && voice.failedLinks.length > 0;
    this.dot.setFillStyle(!j ? 0x6a6478 : failed ? 0xe07a3a : canSpeak ? 0x7ac870 : 0xe8b84a);
    this.slash.setVisible(!j || voice.state.off);
    const showHold = canSpeak && voice.pushToTalk;
    this.hold.setVisible(showHold);
    if (showHold) {
      this.hold.setLabel(voice.holding ? 'กำลังพูด...' : 'กดค้างพูด (V)');
      this.hold.content.setScale(voice.holding ? 1.08 : 1);
    }
    let note = '';
    if (j && !showHold) {
      if (voice.listenOnly) note = 'ฟังอย่างเดียว';
      else if (!voice.state.canSpeak) note = 'ตอนนี้ยังพูดไม่ได้';
      else note = 'ไมค์เปิดอยู่';
    }
    this.status.setText(note);
  }
}
