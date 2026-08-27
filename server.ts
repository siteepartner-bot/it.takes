import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import type { ClientMessage, ServerMessage, RoomData, PlayerRole, PuzzleState, PlayerNetState } from './src/types.js';

const app = express();
const PORT = 3000;
const server = http.createServer(app);

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
