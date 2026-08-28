import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import type { ClientMessage, ServerMessage, RoomData, PlayerRole, PuzzleState, PlayerNetState } from './src/types.js';

const app = express();
const PORT = 3000;
const server = http.createServer(app);

// Initialize Gemini SDK with User-Agent header and lazy client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Trust Cloudflare proxy headers (CF-Connecting-IP, X-Forwarded-For, X-Forwarded-Proto)
app.set('trust proxy', true);
app.use(express.json());

// In-memory room store
interface ConnectedClient {
  ws: WebSocket;
  id: string;
  name: string;
  role: PlayerRole;
  roomCode: string;
  lastSeen: number;
}

interface RoomRecord {
  data: RoomData;
  clients: Map<PlayerRole, ConnectedClient>;
  lastActive: number;
}

const rooms = new Map<string, RoomRecord>();

// Helper to create fresh default puzzle state
function createDefaultPuzzleState(stageId = 1): PuzzleState {
  return {
    stageId,
    checkpointId: 0,
    gate1Open: false,
    lever1Activated: false,
    heavyBlockPos: [12, 1, 4],
    heavyBlockPlaced: false,
    aqueductElevatorHeight: 0,
    lightBridgeActive: false,
    bridgePedestalRotated: false,
    stage1ExitP1Ready: false,
    stage1ExitP2Ready: false,

    floatingIslandBridgeActive: false,
    turretShieldDeflected: false,
    laserTurretDisabled: false,
    vortexActivated: false,
    stage2ExitP1Ready: false,
    stage2ExitP2Ready: false,

    crusherJammed: false,
    boilerValve1: false,
    boilerValve2: false,
    boilerSequenceSuccess: false,
    grandClockworkEngaged: false,
    stage3ExitP1Ready: false,
    stage3ExitP2Ready: false,

    customData: {},
  };
}

// Generate human-friendly 5-character room code (e.g. SKY42, ECHO7)
const WORDS = ['AURA', 'NOVA', 'LUNA', 'SOL', 'ECHO', 'ZEST', 'PEAK', 'IRIS', 'VALE', 'FLUX'];
function generateRoomCode(): string {
  for (let i = 0; i < 20; i++) {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    const num = Math.floor(10 + Math.random() * 90);
    const code = `${word}${num}`;
    if (!rooms.has(code)) return code;
  }
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

// REST API endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    roomsActive: rooms.size,
    timestamp: Date.now(),
  });
});

app.get('/api/room/:code', (req, res) => {
  const code = req.params.code.toUpperCase().trim();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({
    code: room.data.code,
    stageId: room.data.stageId,
    status: room.data.status,
    explorerJoined: !!room.data.players.explorer?.connected,
    guardianJoined: !!room.data.players.guardian?.connected,
  });
});

// Gemini AI Status Check
app.get('/api/gemini/status', (req, res) => {
  const isAvailable = !!getGeminiClient();
  res.json({
    available: isAvailable,
    model: 'gemini-3.5-flash-lite',
    host: 'node-express',
    message: isAvailable
      ? 'جمینای به صورت بلادرنگ و فعال روی سرور متصل است.'
      : 'کلید GEMINI_API_KEY تنظیم نشده است یا در حالت آفلاین/لوکال اجرا می‌شود.',
  });
});

// Gemini In-Game Voice Guidance Endpoint
const STAGE_CONTEXT_DATA: Record<number, { name: string; keyObjectives: string }> = {
  1: {
    name: 'باغ فراموش‌شده و قنات باستانی',
    keyObjectives:
      '۱. باز کردن دروازه رونیک با اهرم اول. ۲. هل دادن مکعب سنگین سنگی توسط برسام روی پد فشاری قنات برای بالا آمدن آسانسور آبی. ۳. هدایت نورا به بلندی و شلیک صاعقه [F] به پدستال آینه‌ای برای گسترش پل نوری. ۴. عبور هر دو از پل و قرار گرفتن روی پدهای خروجی دروازه اِیتِر.',
  },
  2: {
    name: 'جزایر معلق آسمانی و برجک لیزری کهن',
    keyObjectives:
      '۱. عبور از پل معلق ابرها با هماهنگی گام‌ها. ۲. برخورد با پرتو مرگبار لیزر دفاعی: برسام باید فورا با کلید [F] سپر تایتان را فعال کند و پرتو را به سمت بازتاب‌دهنده انرژی برگرداند تا برجک از کار بیفتد. ۳. نورا از صاعقه [F] برای شارژ توربین باد و ایجاد جریان بالابرنده استفاده کند. ۴. رسیدن همزمان هر دو به پورتال ابری.',
  },
  3: {
    name: 'کارخانه مکانیکی، پیستون‌های غول‌آسا و چرخ‌دنده اعظم',
    keyObjectives:
      '۱. متوقف کردن پیستون کوبنده مکانیکی توسط استقامت برسام یا قرار دادن بلوک فلزی زیر آن. ۲. چرخاندن همزمان شیر فلکه‌های بخار شماره ۱ و ۲ توسط نورا و برسام در فاصله کمتر از ۳ ثانیه. ۳. شلیک جهش صاعقه نورا به هسته ژنراتور اصلی برای درگیر کردن چرخ‌دنده اعظم ساعت و باز شدن خروجی نهایی.',
  },
};

app.post('/api/gemini/guidance', async (req, res) => {
  try {
    const { stageId = 1, role = 'explorer', puzzleState, query, playerName } = req.body || {};
    const stageInfo = STAGE_CONTEXT_DATA[stageId] || STAGE_CONTEXT_DATA[1];
    const isNora = role === 'explorer';
    const characterName = isNora ? 'نورا (دختر چوبی / کاوشگر صاعقه)' : 'برسام (پسر چوبی / نگهبان تایتان)';

    const pState = puzzleState || {};
    const stateSummary = [
      `مرحله: ${stageId} (${stageInfo.name})`,
      `شخصیت تماس‌گیرنده: ${characterName} (نام بازیکن: ${playerName || 'ماجراجو'})`,
      `وضعیت دروازه اول: ${pState.gate1Open ? 'باز شده' : 'بسته'}`,
      `وضعیت اهرم اول: ${pState.lever1Activated ? 'کشیده شده' : 'هنوز فعال نشده'}`,
      `مکعب سنگین: ${pState.heavyBlockPlaced ? 'روی پد فشاری قرار گرفته' : 'هنوز سر جای خود قرار نگرفته'}`,
      `ارتفاع آسانسور قنات: ${pState.aqueductElevatorHeight > 0 ? 'بالا رفته' : 'پایین'}`,
      `پل نوری: ${pState.lightBridgeActive ? 'روشن و فعال است' : 'خاموش است'}`,
      `برجک لیزری مرحله ۲: ${pState.laserTurretDisabled ? 'غیرفعال شده' : 'هنوز شلیک می‌کند'}`,
      `شیرهای بخار مرحله ۳: ۱=${pState.boilerValve1 ? 'باز' : 'بسته'}، ۲=${pState.boilerValve2 ? 'باز' : 'بسته'}`,
      `چرخ‌دنده ساعت: ${pState.grandClockworkEngaged ? 'به کار افتاده' : 'متوقف است'}`,
    ].join('\n');

    const promptText = `
اطلاعات زنده بازی:
${stateSummary}

اهداف کلی این مرحله:
${stageInfo.keyObjectives}

پرسش یا درخواست راهنمایی بازیکن:
"${query && query.trim() ? query.trim() : 'استاد الیاس، لطفا یک راهنمایی سریع و مستقیم بده، الان باید چکار کنیم و قدم بعدیمون چیه؟'}"
`;

    const ai = getGeminiClient();
    if (ai) {
      try {
        const systemInstruction = `تو "استاد الیاس" (Master Elias) هستی، ساعت‌ساز دانای کهن که دو آدمک چوبی نورا و برسام را تراشیده است.
اکنون از طریق بیسیم اِیتِر (Voice Call) با آن‌ها صحبت می‌کنی.
- با لحنی خردمندانه، گرم، پرانرژی و به زبان فارسی پاسخ بده.
- پاسخت باید حداکثر ۲ تا ۳ جمله کوتاه، دقیق و هیجان‌انگیز باشد تا پشت بی‌سیم سریع خوانده و شنیده شود.
- مستقیما بگو بازیکن الان باید چکار کند (مثلا: استفاده از کلید F برای صاعقه نورا یا سپر برسام، کشیدن اهرم، هل دادن سنگ، یا تنظیم زمان‌بندی).
- هرگز توضیحات طولانی یا خسته‌کننده نده.`;

        let response;
        try {
          response = await ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',
            contents: promptText,
            config: {
              systemInstruction,
              temperature: 0.6,
            },
          });
        } catch (modelErr: any) {
          console.warn('Fallback to gemini-3.6-flash due to:', modelErr?.message);
          response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: promptText,
            config: {
              systemInstruction,
              temperature: 0.6,
            },
          });
        }

        const adviceText = response?.text || 'صدا قطع و وصل می‌شود، اما هماهنگی شما کلید هر در بسته‌ای است!';
        return res.json({
          success: true,
          text: adviceText.trim(),
          source: 'gemini-live',
          stageId,
        });
      } catch (geminiCallErr: any) {
        console.warn('Gemini API call failed (e.g. quota limit reached):', geminiCallErr?.message);
        // Seamlessly continue to the intelligent fallback mentor below
      }
    }

    // Fallback mentor oracle if API key is not configured or quota is exhausted
    let fallbackText = '';
    if (stageId === 1) {
      if (!pState.gate1Open) {
        fallbackText = 'نورا، برسام! ابتدا به سمت چپ تالار بروید و اهرم کریستالی را بکشید تا دروازه سنگی باز شود. برسام، آماده باش سنگ‌های سنگین را جابجا کنی!';
      } else if (!pState.heavyBlockPlaced) {
        fallbackText = 'برسام، قدرت بازوان بلوطین تو اینجاست! آن مکعب مغناطیسی سنگین را به روی کلید فشاری قنات هل بده تا جریان آب آسانسور را بالا ببرد!';
      } else if (!pState.lightBridgeActive) {
        fallbackText = 'نورا، حالا نوبت توست! با آسانسور بالا برو و با دستکش اِیتِر [کلید F] به پدستال آینه‌ای شلیک کن تا پل نوری سراسر پرتگاه را روشن کند!';
      } else {
        fallbackText = 'عالی بود بچه‌ها! هر دو با هم از روی پل نورانی رد شوید و همزمان روی پدهای خروجی انتهای باغ بایستید تا دروازه آسمان باز شود!';
      }
    } else if (stageId === 2) {
      if (!pState.laserTurretDisabled) {
        fallbackText = 'مواظب باشید! برجک نگهبان لیزری فعال است! برسام، فورا کلید [F] را بزن و سپر تایتان را بالا بیاور تا پرتو مرگبار به خود برجک بازتاب کند و خاموش شود!';
      } else {
        fallbackText = 'برجک خاموش شد! حالا نورا، با شلیک صاعقه [F] به توربین باد، جریان بالابرنده ابرها را فعال کن تا به سکوی خروج برسید!';
      }
    } else {
      if (!pState.grandClockworkEngaged) {
        fallbackText = 'اینجا قلب ساعت اعظم است! باید هر دو نفر همزمان شیرهای بخار ۱ و ۲ را بچرخانید، سپس نورا به ژنراتور اصلی صاعقه بزند تا چرخ‌دنده‌ها بچرخند!';
      } else {
        fallbackText = 'چرخ‌دنده‌ها به کار افتادند! مسیر آزادی هموار شد، به سمت پورتال مرکزی بشتابید!';
      }
    }

    return res.json({
      success: true,
      text: fallbackText,
      source: 'offline-oracle',
      stageId,
      note: 'جهت ارتباط هوش مصنوعی مستقیم جمینای، متغیر GEMINI_API_KEY را تنظیم کنید.',
    });
  } catch (err: any) {
    console.error('Error generating Gemini guidance:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'خطا در ارتباط با بلور جمینای',
      text: 'امواج اِیتِر دچار اختلال موقت شدند فرزندانم! حواستان به توانایی‌های مکمل هم باشد، نورا با صاعقه و برسام با سپر!',
    });
  }
});

// WebSocket Server (supports /ws, /api/ws, and root / for Cloudflare Worker reverse proxies)
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const url = request.url || '';
  const pathname = url.split('?')[0];

  if (pathname === '/ws' || pathname === '/api/ws' || pathname === '/') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcastToRoom(room: RoomRecord, msg: ServerMessage, excludeRole?: PlayerRole) {
  room.clients.forEach((client, role) => {
    if (role !== excludeRole && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(msg));
    }
  });
}

wss.on('connection', (ws: WebSocket) => {
  let currentClient: ConnectedClient | null = null;

  ws.on('message', (rawData) => {
    try {
      const msg: ClientMessage = JSON.parse(rawData.toString());

      if (msg.type === 'ping_server') {
        send(ws, {
          type: 'pong',
          clientTime: msg.clientTime,
          serverTime: Date.now(),
        });
        return;
      }

      if (msg.type === 'create_room') {
        const code = generateRoomCode();
        const role: PlayerRole = msg.preferredRole || 'explorer';
        const clientId = `p_${Math.random().toString(36).substring(2, 9)}`;

        const roomData: RoomData = {
          code,
          stageId: 1,
          checkpointId: 0,
          players: {
            [role]: {
              id: clientId,
              name: msg.playerName || (role === 'explorer' ? 'Explorer' : 'Guardian'),
              ready: true,
              connected: true,
              pingMs: 0,
            },
          },
          puzzleState: createDefaultPuzzleState(1),
          status: 'waiting',
        };

        const roomRecord: RoomRecord = {
          data: roomData,
          clients: new Map(),
          lastActive: Date.now(),
        };

        currentClient = {
          ws,
          id: clientId,
          name: roomData.players[role]!.name,
          role,
          roomCode: code,
          lastSeen: Date.now(),
        };

        roomRecord.clients.set(role, currentClient);
        rooms.set(code, roomRecord);

        send(ws, {
          type: 'room_joined',
          room: roomData,
          assignedRole: role,
          yourId: clientId,
        });
        return;
      }

      if (msg.type === 'join_room') {
        const code = msg.code.toUpperCase().trim();
        const room = rooms.get(code);

        if (!room) {
          send(ws, { type: 'error', message: `Room ${code} not found. Check code or create a new room.` });
          return;
        }

        // Determine available role
        const preferred = msg.preferredRole;
        let assignedRole: PlayerRole;

        const explorerConnected = room.data.players.explorer?.connected;
        const guardianConnected = room.data.players.guardian?.connected;

        if (preferred && !room.data.players[preferred]?.connected) {
          assignedRole = preferred;
        } else if (!explorerConnected) {
          assignedRole = 'explorer';
        } else if (!guardianConnected) {
          assignedRole = 'guardian';
        } else {
          send(ws, { type: 'error', message: `Room ${code} is full (2/2 players connected).` });
          return;
        }

        const clientId = `p_${Math.random().toString(36).substring(2, 9)}`;
        const playerName = msg.playerName || (assignedRole === 'explorer' ? 'Explorer' : 'Guardian');

        room.data.players[assignedRole] = {
          id: clientId,
          name: playerName,
          ready: true,
          connected: true,
          pingMs: 0,
        };

        const bothConnected = !!(room.data.players.explorer?.connected && room.data.players.guardian?.connected);
        room.data.status = bothConnected ? 'ready' : 'waiting';
        room.lastActive = Date.now();

        currentClient = {
          ws,
          id: clientId,
          name: playerName,
          role: assignedRole,
          roomCode: code,
          lastSeen: Date.now(),
        };

        room.clients.set(assignedRole, currentClient);

        // Send room state to joining player
        send(ws, {
          type: 'room_joined',
          room: room.data,
          assignedRole,
          yourId: clientId,
        });

        // Notify other player
        broadcastToRoom(room, {
          type: 'player_joined',
          role: assignedRole,
          name: playerName,
        }, assignedRole);
        return;
      }

      // Beyond join/create, client must be in a room
      if (!currentClient) return;
      const room = rooms.get(currentClient.roomCode);
      if (!room) return;
      room.lastActive = Date.now();

      if (msg.type === 'player_update') {
        const fullState: PlayerNetState = {
          id: currentClient.id,
          name: currentClient.name,
          role: currentClient.role,
          x: msg.state.x,
          y: msg.state.y,
          z: msg.state.z,
          rotY: msg.state.rotY,
          anim: msg.state.anim,
          abilityActive: msg.state.abilityActive,
          isGrounded: msg.state.isGrounded,
          timestamp: Date.now(),
        };

        // Forward to partner immediately for 60Hz real-time sync
        broadcastToRoom(room, {
          type: 'partner_update',
          state: fullState,
        }, currentClient.role);
        return;
      }

      if (msg.type === 'puzzle_trigger') {
        // Authoritative update of puzzle state
        const { key, value } = msg;
        if (key in room.data.puzzleState) {
          (room.data.puzzleState as any)[key] = value;
        } else {
          room.data.puzzleState.customData[key] = value;
        }

        // Broadcast to all clients in the room
        broadcastToRoom(room, {
          type: 'puzzle_synced',
          puzzleState: room.data.puzzleState,
        });
        return;
      }

      if (msg.type === 'emote') {
        broadcastToRoom(room, {
          type: 'emote_triggered',
          data: {
            role: currentClient.role,
            emote: msg.emote,
            timestamp: Date.now(),
          },
        });
        return;
      }

      if (msg.type === 'ping') {
        broadcastToRoom(room, {
          type: 'ping_triggered',
          data: {
            id: `ping_${Date.now()}`,
            x: msg.x,
            y: msg.y,
            z: msg.z,
            senderRole: currentClient.role,
            senderName: currentClient.name,
            timestamp: Date.now(),
          },
        });
        return;
      }

      if (msg.type === 'checkpoint_reach') {
        if (msg.checkpointId > room.data.checkpointId) {
          room.data.checkpointId = msg.checkpointId;
          room.data.puzzleState.checkpointId = msg.checkpointId;
          broadcastToRoom(room, {
            type: 'checkpoint_updated',
            checkpointId: msg.checkpointId,
            respawnPos: [0, 1, 0],
          });
        }
        return;
      }

      if (msg.type === 'stage_advance') {
        room.data.stageId = msg.nextStageId;
        room.data.checkpointId = 0;
        room.data.puzzleState = createDefaultPuzzleState(msg.nextStageId);
        room.data.status = 'playing';
        broadcastToRoom(room, {
          type: 'stage_changed',
          stageId: msg.nextStageId,
        });
        return;
      }

      if (msg.type === 'leave_room') {
        handleClientDisconnect(currentClient);
        currentClient = null;
        return;
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  function handleClientDisconnect(client: ConnectedClient) {
    const room = rooms.get(client.roomCode);
    if (!room) return;

    room.clients.delete(client.role);
    if (room.data.players[client.role]) {
      room.data.players[client.role]!.connected = false;
    }
    room.data.status = 'waiting';

    broadcastToRoom(room, {
      type: 'player_disconnected',
      role: client.role,
    });

    // If both disconnected, clean up room after 10 minutes
    const anyConnected = Array.from(room.clients.values()).length > 0;
    if (!anyConnected) {
      setTimeout(() => {
        const checkRoom = rooms.get(client.roomCode);
        if (checkRoom && checkRoom.clients.size === 0) {
          rooms.delete(client.roomCode);
        }
      }, 10 * 60 * 1000);
    }
  }

  ws.on('close', () => {
    if (currentClient) {
      handleClientDisconnect(currentClient);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket connection error:', err);
  });
});

// Periodic room cleanup (empty rooms older than 30 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (room.clients.size === 0 && now - room.lastActive > 30 * 60 * 1000) {
      rooms.delete(code);
    }
  }
}, 5 * 60 * 1000);

// Setup Vite middleware for development or serve dist static in production
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Aether Duo Game Server running on port ${PORT}`);
  });
}

start();
