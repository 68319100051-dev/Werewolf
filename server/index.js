const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const rooms = require('./rooms');

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ให้เบราว์เซอร์เช็กไฟล์ใหม่ทุกครั้ง จะได้ไม่ค้างโค้ดเก่าหลังอัปเดตเกม
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache');
  next();
});
// ให้เว็บตรวจสถานะ (Render / UptimeRobot) เรียกเช็กว่าเซิร์ฟเวอร์ยังทำงาน และกันเซิร์ฟเวอร์ฟรีหลับ
app.get('/health', (req, res) => res.type('text').send('ok'));
app.use(express.static(path.join(__dirname, '..', 'client')));
app.use('/lib/phaser', express.static(path.join(__dirname, '..', 'node_modules', 'phaser', 'dist')));

rooms.attach(io);

// บั๊กในห้องใดห้องหนึ่งไม่ควรทำให้เซิร์ฟเวอร์ล่มทั้งหมด: บันทึกไว้แล้วทำงานต่อ
process.on('uncaughtException', (err) => console.error('ข้อผิดพลาดที่ไม่ได้ดักไว้:', err));
process.on('unhandledRejection', (err) => console.error('ข้อผิดพลาดที่ไม่ได้ดักไว้ (promise):', err));

server.listen(PORT, () => {
  console.log(`Pixel Werewolf กำลังทำงานที่ http://localhost:${PORT}`);
});
