// ระบบห้อง: สร้าง / เข้า / ออก / ตั้งค่า / แชท / หลุดแล้วกลับเข้า / เริ่มเกม
const { Game, roleSetting } = require('./game');
const { voicePlan } = require('./voice');
const { Bot, botProfile } = require('./bots');
const RECONNECT_GRACE_MS = 60_000;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const DEFAULT_SETTINGS = {
  maxPlayers: 8,
  meetingTime: 120,
  cardTime: 30,
  revealRoleOnDeath: true,
  ghostChat: true,
  outfitChange: true,
  barLength: 'normal',
  voiceMode: 'both',
  wolves: 'auto',
  // ทุกอาชีพ: 'random' = อาจสุ่มได้, 0 = ปิด, 1-3 = มีแน่ ๆ
  roles: Object.fromEntries(['seer', 'doctor', 'hunter', 'detective', 'jester', 'watchman', 'guard', 'priest',
    'gravedigger', 'farmer', 'woodcutter', 'cupid', 'wolf', 'shadow', 'traitor'].map((k) => [k, 'random'])),
};

const OUTFIT_LIMITS = { hat: 8, hair: 8, shirt: 8, item: 8, face: 5, skin: 5 };

const rooms = new Map();    // code -> room
const players = new Map();  // playerId -> { socketId, name, outfit, roomCode }

function makeCode() {
  let code;
  do {
    code = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function cleanText(str, max) {
  return String(str ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, max);
}

function cleanOutfit(o) {
  const out = {};
  for (const [k, n] of Object.entries(OUTFIT_LIMITS)) {
    const v = Number(o?.[k]);
    out[k] = Number.isInteger(v) && v >= 0 && v < n ? v : 0;
  }
  return out;
}

function cleanSettings(s, base = DEFAULT_SETTINGS) {
  const pick = (v, allowed, d) => (allowed.includes(v) ? v : d);
  const roles = {};
  for (const k of Object.keys(DEFAULT_SETTINGS.roles)) {
    roles[k] = s?.roles?.[k] === undefined ? roleSetting(base.roles, k) : roleSetting(s.roles, k);
  }
  return {
    maxPlayers: pick(Number(s?.maxPlayers), [4, 5, 6, 7, 8, 9, 10, 11, 12], base.maxPlayers),
    meetingTime: pick(Number(s?.meetingTime), [60, 120, 180], base.meetingTime),
    cardTime: pick(Number(s?.cardTime), [20, 30, 45], base.cardTime),
    revealRoleOnDeath: typeof s?.revealRoleOnDeath === 'boolean' ? s.revealRoleOnDeath : base.revealRoleOnDeath,
    ghostChat: typeof s?.ghostChat === 'boolean' ? s.ghostChat : base.ghostChat,
    outfitChange: typeof s?.outfitChange === 'boolean' ? s.outfitChange : base.outfitChange,
    barLength: pick(s?.barLength, ['short', 'normal', 'long'], base.barLength),
    voiceMode: pick(s?.voiceMode, ['both', 'text', 'voice'], base.voiceMode),
    wolves: pick(s?.wolves, ['auto', 1, 2, 3, 4, 5], base.wolves ?? 'auto'),
    roles,
  };
}

function publicRoom(room) {
  return {
    code: room.code,
    name: room.name,
    hostId: room.hostId,
    hasPassword: !!room.password,
    isPublic: room.isPublic,
    status: room.status,
    settings: room.settings,
    players: room.order.map((id) => {
      const p = room.members.get(id);
      return { id, name: p.name, outfit: p.outfit, ready: p.ready, connected: p.connected, isBot: !!p.isBot };
    }),
    chat: room.chat.slice(-50),
  };
}

function listEntry(room) {
  return {
    code: room.code,
    name: room.name,
    count: room.order.length,
    max: room.settings.maxPlayers,
    hasPassword: !!room.password,
    status: room.status,
  };
}

function attach(io) {
  const broadcastRoom = (room) => {
    io.to('room:' + room.code).emit('room:state', publicRoom(room));
    syncVoice(room);
  };

  // บอกแต่ละคนว่าตอนนี้พูดได้ไหม และได้ยินใครบ้าง
  function syncVoice(room) {
    if (!room.voice?.size) return;
    for (const [id, state] of voicePlan(room)) sendTo(id, 'voice:state', state);
  }

  function leaveVoice(room, playerId) {
    if (!room?.voice?.delete(playerId)) return;
    for (const id of room.voice) sendTo(id, 'voice:peer-left', { id: playerId });
    syncVoice(room);
  }
  const broadcastList = () => io.to('browser').emit('rooms:list', publicList());
  const publicList = () => [...rooms.values()].filter((r) => r.isPublic).map(listEntry);

  function sendTo(playerId, event, data) {
    const info = players.get(playerId);
    if (info?.bot) return info.bot.receive(event, data);
    if (info?.socketId) io.to(info.socketId).emit(event, data);
  }

  // แชท (ใช้ร่วมกันทั้งคนและบอท)
  function postChat(room, playerId, msg) {
    const m = room.members.get(playerId);
    if (!m) return;
    const now = Date.now();
    if (room.game) {
      const gp = room.game.players.get(playerId);
      const channel = gp && room.game.chatChannel(gp);
      if (!channel) return;
      const out = { id: room.nextMsg++, from: playerId, name: m.name, text: msg, at: now, channel };
      for (const t of room.game.chatTargets(gp, channel)) sendTo(t.id, 'game:chat', out);
      return;
    }
    room.chat.push({ id: room.nextMsg++, from: playerId, name: m.name, text: msg, at: now });
    if (room.chat.length > 200) room.chat.splice(0, room.chat.length - 200);
    io.to('room:' + room.code).emit('room:chat', room.chat[room.chat.length - 1]);
  }

  // อีโมต: ทำได้ในห้องรอ หรือในเกมช่วงที่คุยกันได้ทั้งหมู่บ้าน (ประชุม/โหวต/จบเกม)
  const EMOTES = ['wave', 'laugh', 'angry', 'what', 'cry', 'shock', 'fire'];
  const lastEmote = new Map();
  function emote(room, playerId, key) {
    if (!room || !EMOTES.includes(key)) return;
    const now = Date.now();
    if (now - (lastEmote.get(playerId) || 0) < 700) return;
    if (key === 'fire' && room.game) return;
    if (room.game) {
      const gp = room.game.players.get(playerId);
      if (!gp || room.game.chatChannel(gp) !== 'all') return;
    }
    lastEmote.set(playerId, now);
    io.to('room:' + room.code).emit('room:emote', { id: playerId, key });
  }

  const humans = (room) => room.order.filter((id) => !room.members.get(id)?.isBot);

  // ลบห้องทิ้ง พร้อมหยุดบอททุกตัว
  function closeRoom(room) {
    room.game?.destroy();
    for (const id of room.order) {
      const info = players.get(id);
      if (info?.bot) {
        info.bot.stop();
        players.delete(id);
      }
    }
    rooms.delete(room.code);
  }

  function systemMessage(room, text) {
    const msg = { id: room.nextMsg++, system: true, text, at: Date.now() };
    room.chat.push(msg);
    if (room.chat.length > 200) room.chat.splice(0, room.chat.length - 200);
    io.to('room:' + room.code).emit('room:chat', msg);
  }

  function removeFromRoom(playerId, reason) {
    const info = players.get(playerId);
    if (!info?.roomCode) return;
    const room = rooms.get(info.roomCode);
    info.roomCode = null;
    if (!room) return;
    const member = room.members.get(playerId);
    clearTimeout(member?.dropTimer);
    room.members.delete(playerId);
    room.order = room.order.filter((id) => id !== playerId);
    const sock = io.sockets.sockets.get(info.socketId);
    sock?.leave('room:' + room.code);

    if (info.bot) {
      info.bot.stop();
      players.delete(playerId);
    }
    room.game?.playerLeft(playerId);
    leaveVoice(room, playerId);
    // เหลือแต่บอท (หรือว่าง) = ปิดห้อง
    if (humans(room).length === 0) {
      closeRoom(room);
    } else {
      if (room.hostId === playerId) {
        const hs = humans(room);
        room.hostId = hs.find((id) => room.members.get(id).connected) || hs[0];
        systemMessage(room, `${room.members.get(room.hostId).name} เป็นเจ้าของห้องคนใหม่`);
      }
      systemMessage(room, reason === 'kick' ? `${member.name} ถูกเชิญออกจากห้อง` : `${member.name} ออกจากห้อง`);
      broadcastRoom(room);
    }
    broadcastList();
  }

  function joinRoom(socket, room, playerId) {
    const info = players.get(playerId);
    info.roomCode = room.code;
    room.members.set(playerId, { name: info.name, outfit: info.outfit, ready: false, connected: true, dropTimer: null });
    room.order.push(playerId);
    socket.join('room:' + room.code);
    socket.leave('browser');
    systemMessage(room, `${info.name} เข้ามาในห้อง`);
    broadcastRoom(room);
    broadcastList();
  }

  io.on('connection', (socket) => {
    let playerId = null;
    let lastChat = 0;

    const myRoom = () => {
      const code = players.get(playerId)?.roomCode;
      return code ? rooms.get(code) : null;
    };
    const isHost = (room) => room && room.hostId === playerId;

    socket.on('hello', (data, ack) => {
      const id = cleanText(data?.playerId, 64);
      const name = cleanText(data?.name, 16);
      if (!id || !name) return ack?.({ ok: false, error: 'ชื่อไม่ถูกต้อง' });
      playerId = id;
      const prev = players.get(id);
      const info = { socketId: socket.id, name, outfit: cleanOutfit(data?.outfit), roomCode: prev?.roomCode || null };
      players.set(id, info);

      // กลับเข้าห้องเดิมหลังหลุด
      const room = info.roomCode && rooms.get(info.roomCode);
      if (room && room.members.has(id)) {
        const m = room.members.get(id);
        clearTimeout(m.dropTimer);
        m.connected = true;
        m.name = name;
        m.outfit = info.outfit;
        socket.join('room:' + room.code);
        broadcastRoom(room);
        ack?.({ ok: true, rejoined: room.code, playing: room.status === 'playing' });
        room.game?.sync();
        return;
      }
      info.roomCode = null;
      ack?.({ ok: true });
    });

    socket.on('profile', (data) => {
      const info = players.get(playerId);
      if (!info) return;
      info.name = cleanText(data?.name, 16) || info.name;
      info.outfit = cleanOutfit(data?.outfit);
      const room = myRoom();
      if (room && room.status === 'lobby') {
        const m = room.members.get(playerId);
        m.name = info.name;
        m.outfit = info.outfit;
        broadcastRoom(room);
      }
    });

    socket.on('rooms:watch', (ack) => {
      socket.join('browser');
      ack?.(publicList());
    });
    socket.on('rooms:unwatch', () => socket.leave('browser'));

    socket.on('room:create', (data, ack) => {
      if (!playerId) return ack?.({ ok: false, error: 'ยังไม่ได้ล็อกอิน' });
      if (myRoom()) removeFromRoom(playerId);
      const info = players.get(playerId);
      const room = {
        code: makeCode(),
        name: cleanText(data?.name, 24) || `ห้องของ ${info.name}`,
        password: cleanText(data?.password, 16),
        isPublic: data?.isPublic !== false,
        hostId: playerId,
        status: 'lobby',
        settings: cleanSettings(data?.settings),
        members: new Map(),
        order: [],
        voice: new Set(),
        chat: [],
        nextMsg: 1,
      };
      rooms.set(room.code, room);
      joinRoom(socket, room, playerId);
      ack?.({ ok: true, code: room.code });
    });

    socket.on('room:join', (data, ack) => {
      if (!playerId) return ack?.({ ok: false, error: 'ยังไม่ได้ล็อกอิน' });
      const code = cleanText(data?.code, 8).toUpperCase();
      const room = rooms.get(code);
      if (!room) return ack?.({ ok: false, error: 'ไม่พบห้องนี้' });
      if (room.members.has(playerId)) return ack?.({ ok: true, code });
      if (room.status !== 'lobby') return ack?.({ ok: false, error: 'ห้องนี้กำลังเล่นอยู่' });
      if (room.order.length >= room.settings.maxPlayers) return ack?.({ ok: false, error: 'ห้องเต็มแล้ว' });
      if (room.password && cleanText(data?.password, 16) !== room.password) {
        return ack?.({ ok: false, error: 'รหัสผ่านไม่ถูกต้อง', needPassword: true });
      }
      if (myRoom()) removeFromRoom(playerId);
      joinRoom(socket, room, playerId);
      ack?.({ ok: true, code });
    });

    socket.on('room:leave', () => removeFromRoom(playerId));

    socket.on('room:ready', (ready) => {
      const room = myRoom();
      if (!room || room.status !== 'lobby') return;
      room.members.get(playerId).ready = !!ready;
      broadcastRoom(room);
    });

    socket.on('room:chat', (text) => {
      const room = myRoom();
      const now = Date.now();
      const msg = cleanText(text, 200);
      if (!room || !msg || now - lastChat < 400) return;
      lastChat = now;
      postChat(room, playerId, msg);
    });

    socket.on('room:emote', (key) => emote(myRoom(), playerId, key));

    // ผีหลอก: คนตายทำให้ตะเกียงกะพริบ / ลมหวิว ได้ทุก 12 วินาที (ทุกคนเห็น แต่ไม่รู้ว่าใครทำ)
    let lastHaunt = 0;
    socket.on('ghost:haunt', () => {
      const room = myRoom();
      const gp = room?.game?.players.get(playerId);
      const now = Date.now();
      if (!gp || gp.alive || room.game.phase === 'ended' || now - lastHaunt < 12000) return;
      lastHaunt = now;
      const kind = ['lamp', 'wind', 'chill'][Math.floor(Math.random() * 3)];
      io.to('room:' + room.code).emit('ghost:haunt', { kind });
    });

    // เจ้าของห้องเพิ่มบอท (บอทกดพร้อมเอง และเล่นเกมเอง)
    socket.on('room:addBot', (ack) => {
      const room = myRoom();
      if (!isHost(room)) return ack?.({ ok: false, error: 'เฉพาะเจ้าของห้อง' });
      if (room.status !== 'lobby') return ack?.({ ok: false, error: 'เพิ่มบอทได้เฉพาะในห้องรอ' });
      if (room.order.length >= room.settings.maxPlayers) return ack?.({ ok: false, error: 'ห้องเต็มแล้ว' });
      const id = 'bot_' + Math.random().toString(36).slice(2, 10);
      const profile = botProfile(new Set([...room.members.values()].map((m) => m.name)));
      const bot = new Bot(id, {
        act: (bid, type, target) => rooms.get(room.code)?.game?.handle(bid, type, target),
        chat: (bid, text) => rooms.has(room.code) && postChat(room, bid, cleanText(text, 200)),
        emote: (bid, key) => rooms.has(room.code) && emote(room, bid, key),
      });
      players.set(id, { socketId: null, name: profile.name, outfit: profile.outfit, roomCode: room.code, bot });
      room.members.set(id, { name: profile.name, outfit: profile.outfit, ready: true, connected: true, isBot: true, dropTimer: null });
      room.order.push(id);
      systemMessage(room, `${profile.name} เข้ามาในห้อง`);
      broadcastRoom(room);
      broadcastList();
      bot.greet();
      ack?.({ ok: true, id });
    });

    socket.on('room:settings', (data) => {
      const room = myRoom();
      if (!isHost(room) || room.status !== 'lobby') return;
      if (data?.name !== undefined) room.name = cleanText(data.name, 24) || room.name;
      if (data?.password !== undefined) room.password = cleanText(data.password, 16);
      if (data?.isPublic !== undefined) room.isPublic = !!data.isPublic;
      if (data?.settings) {
        room.settings = cleanSettings(data.settings, room.settings);
        if (room.settings.maxPlayers < room.order.length) {
          room.settings.maxPlayers = Math.max(4, room.order.length);
        }
      }
      systemMessage(room, 'เจ้าของห้องแก้ไขการตั้งค่า');
      broadcastRoom(room);
      broadcastList();
    });

    socket.on('room:kick', (targetId) => {
      const room = myRoom();
      if (!isHost(room) || targetId === playerId || !room.members.has(targetId)) return;
      const target = players.get(targetId);
      const sock = target && io.sockets.sockets.get(target.socketId);
      removeFromRoom(targetId, 'kick');
      sock?.emit('room:kicked');
    });

    socket.on('room:transfer', (targetId) => {
      const room = myRoom();
      if (room?.members.get(targetId)?.isBot) return;
      if (!isHost(room) || !room.members.has(targetId)) return;
      room.hostId = targetId;
      systemMessage(room, `${room.members.get(targetId).name} เป็นเจ้าของห้องคนใหม่`);
      broadcastRoom(room);
    });

    socket.on('room:start', (ack) => {
      const room = myRoom();
      if (!isHost(room)) return ack?.({ ok: false, error: 'เฉพาะเจ้าของห้อง' });
      // กดเริ่มซ้ำ (ดับเบิลคลิก) ตอนเกมเริ่มไปแล้ว ห้ามสร้างเกมซ้อน
      if (room.status !== 'lobby' || room.game) return ack?.({ ok: false, error: 'เกมเริ่มไปแล้ว' });
      if (room.order.length < 4) return ack?.({ ok: false, error: 'ต้องมีผู้เล่นอย่างน้อย 4 คน' });
      const notReady = room.order.filter((id) => id !== room.hostId && !room.members.get(id).ready);
      if (notReady.length) return ack?.({ ok: false, error: 'ยังมีคนที่ไม่กดพร้อม' });
      if (room.order.some((id) => !room.members.get(id).connected)) {
        return ack?.({ ok: false, error: 'มีผู้เล่นหลุดอยู่ รอให้กลับมาก่อน' });
      }
      room.status = 'playing';
      room.game = new Game(room, {
        send: sendTo,
        onEnd: () => broadcastList(),
        onSync: () => syncVoice(room),
      });
      broadcastRoom(room);
      broadcastList();
      room.game.start();
      ack?.({ ok: true });
    });

    // ---------- เสียง ----------
    socket.on('voice:join', (ack) => {
      const room = myRoom();
      if (!room) return ack?.({ ok: false, error: 'ยังไม่ได้อยู่ในห้อง' });
      if (room.settings.voiceMode === 'text') return ack?.({ ok: false, error: 'ห้องนี้ตั้งเป็นพิมพ์อย่างเดียว' });
      const others = [...room.voice].filter((id) => id !== playerId);
      room.voice.add(playerId);
      for (const id of others) sendTo(id, 'voice:peer-joined', { id: playerId });
      ack?.({ ok: true, members: others });
      syncVoice(room);
    });

    socket.on('voice:leave', () => leaveVoice(myRoom(), playerId));

    // ส่งต่อข้อมูลการเชื่อมต่อ (offer / answer / ice) ระหว่างสองคนในห้องเดียวกัน
    socket.on('voice:signal', (msg) => {
      const room = myRoom();
      if (!room?.voice?.has(playerId) || !room.voice.has(msg?.to)) return;
      if (JSON.stringify(msg.data || '').length > 20000) return;
      sendTo(msg.to, 'voice:signal', { from: playerId, data: msg.data });
    });

    socket.on('game:action', (data) => {
      const room = myRoom();
      if (!room?.game || typeof data?.type !== 'string') return;
      room.game.handle(playerId, data.type, data.target);
    });

    // จบเกมแล้ว เจ้าของห้องพาทุกคนกลับห้องรอ
    socket.on('game:lobby', () => {
      const room = myRoom();
      if (!isHost(room) || room.game?.phase !== 'ended') return;
      room.game.destroy();
      room.game = null;
      room.status = 'lobby';
      for (const m of room.members.values()) m.ready = !!m.isBot;
      systemMessage(room, 'กลับมาที่ห้องรอแล้ว พร้อมเล่นอีกรอบไหม?');
      broadcastRoom(room);
      broadcastList();
    });

    socket.on('disconnect', () => {
      const info = players.get(playerId);
      if (!info || info.socketId !== socket.id) return;
      const room = myRoom();
      if (!room) return;
      leaveVoice(room, playerId);
      const m = room.members.get(playerId);
      m.connected = false;
      broadcastRoom(room);
      const id = playerId;
      m.dropTimer = setTimeout(() => removeFromRoom(id), room.status === 'playing' ? RECONNECT_GRACE_MS * 3 : RECONNECT_GRACE_MS);
    });
  });
}

module.exports = { attach };
