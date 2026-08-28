import { Peer, type DataConnection } from 'peerjs';
import { FirebaseSync } from './firebaseSync.ts';
import type {
  ClientMessage,
  ServerMessage,
  PlayerRole,
  RoomData,
  PlayerNetState,
  PuzzleState,
  EmoteData,
  PingData,
  EmoteType,
} from '../types.ts';
import { createDefaultPuzzleState } from '../types.ts';

type MessageHandler<T> = (data: T) => void;
export type NetworkMode = 'auto' | 'firebase' | 'p2p' | 'websocket';

const WORDS = ['AURA', 'NOVA', 'LUNA', 'SOL', 'ECHO', 'ZEST', 'PEAK', 'IRIS', 'VALE', 'FLUX'];
function generateP2PRoomCode(): string {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${word}${num}`;
}

const PEER_ID_PREFIX = 'aether-duo-v1-';

export class NetworkClient {
  // Firebase Cloud State
  private firebaseSync: FirebaseSync;
  private currentPuzzleState: PuzzleState = createDefaultPuzzleState(1);

  // WebSocket state
  private ws: WebSocket | null = null;
  private wsConnected: boolean = false;
  private reconnectAttempts: number = 0;

  // PeerJS (P2P) state
  private peer: Peer | null = null;
  private p2pConn: DataConnection | null = null;
  private isP2PHost: boolean = false;
  private hostRoomData: RoomData | null = null;

  // Common room state
  private activeTransport: 'firebase' | 'ws' | 'p2p' = 'firebase';
  private roomCode: string | null = null;
  private myRole: PlayerRole | null = null;
  private myId: string | null = null;
  private myName: string = 'ماجراجو';
  private isConnected: boolean = false;
  private pingInterval: number | null = null;
  public latencyMs: number = 0;

  // Configuration
  private networkMode: NetworkMode = 'auto';

  // Handlers
  public onRoomJoined: MessageHandler<{ room: RoomData; assignedRole: PlayerRole; yourId: string }> | null = null;
  public onPlayerJoined: MessageHandler<{ role: PlayerRole; name: string }> | null = null;
  public onPlayerDisconnected: MessageHandler<{ role: PlayerRole }> | null = null;
  public onPlayerReconnected: MessageHandler<{ role: PlayerRole }> | null = null;
  public onPartnerUpdate: MessageHandler<PlayerNetState> | null = null;
  public onPuzzleSynced: MessageHandler<PuzzleState> | null = null;
  public onEmote: MessageHandler<EmoteData> | null = null;
  public onPing: MessageHandler<PingData> | null = null;
  public onCheckpointUpdated: MessageHandler<{ checkpointId: number; respawnPos: [number, number, number] }> | null = null;
  public onStageChanged: MessageHandler<number> | null = null;
  public onError: MessageHandler<string> | null = null;
  public onConnectionChange: ((connected: boolean, pingMs: number) => void) | null = null;

  constructor() {
    this.firebaseSync = new FirebaseSync({
      onRoomJoined: (data) => {
        this.roomCode = data.room.code;
        this.myRole = data.assignedRole;
        this.myId = data.yourId;
        this.isConnected = true;
        this.onRoomJoined?.(data);
      },
      onPlayerJoined: (data) => {
        this.onPlayerJoined?.(data);
      },
      onPlayerDisconnected: (data) => {
        this.onPlayerDisconnected?.(data);
      },
      onPlayerReconnected: (data) => {
        this.onPlayerReconnected?.(data);
      },
      onPartnerUpdate: (state) => {
        this.onPartnerUpdate?.(state);
      },
      onPuzzleSynced: (puzzleState) => {
        this.currentPuzzleState = puzzleState;
        this.onPuzzleSynced?.(puzzleState);
      },
      onEmote: (data) => {
        this.onEmote?.(data);
      },
      onPing: (data) => {
        this.onPing?.(data);
      },
      onCheckpointUpdated: (data) => {
        this.onCheckpointUpdated?.(data);
      },
      onStageChanged: (stageId) => {
        this.onStageChanged?.(stageId);
      },
      onConnectionChange: (connected, pingMs) => {
        this.latencyMs = pingMs;
        this.onConnectionChange?.(connected, pingMs);
      },
      onError: (msg) => {
        this.onError?.(msg);
      },
    });

    if (typeof localStorage !== 'undefined') {
      const savedMode = localStorage.getItem('aether_network_mode') as NetworkMode;
      if (savedMode && ['auto', 'firebase', 'p2p', 'websocket'].includes(savedMode)) {
        this.networkMode = savedMode;
      }
      // Purge any stale broken worker references
      const storedWorker = localStorage.getItem('aether_cf_worker_url');
      if (storedWorker && (storedWorker.includes('dry-snow-f534') || storedWorker.includes('workers.dev'))) {
        localStorage.removeItem('aether_cf_worker_url');
      }
    }
  }

  public getNetworkMode(): NetworkMode {
    return this.networkMode;
  }

  public setNetworkMode(mode: NetworkMode): void {
    this.networkMode = mode;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('aether_network_mode', mode);
    }
    this.disconnect();
  }

  public getActiveTransport(): 'firebase' | 'ws' | 'p2p' {
    return this.activeTransport;
  }

  public isCloudflareStaticHost(): boolean {
    if (typeof window === 'undefined') return false;
    const h = window.location.hostname;
    return h.includes('pages.dev') || h.includes('github.io');
  }

  public getEffectiveWsUrl(): string {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const paramWorker = params?.get('worker');
    const storedWorker = typeof localStorage !== 'undefined' ? localStorage.getItem('aether_cf_worker_url') : null;
    const envWorker = (import.meta as any).env?.VITE_CF_WORKER_URL;

    let target = (paramWorker || storedWorker || envWorker || '').trim();

    if (target) {
      if (target.startsWith('http://')) target = 'ws://' + target.substring(7);
      else if (target.startsWith('https://')) target = 'wss://' + target.substring(8);
      else if (!target.startsWith('ws://') && !target.startsWith('wss://')) {
        const proto = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        target = `${proto}${target}`;
      }
      target = target.replace(/\/+$/, '');
      if (!target.endsWith('/ws') && !target.endsWith('/api/ws')) {
        target = `${target}/ws`;
      }
      return target;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }

  public getWorkerConfig(): { url: string; isCustom: boolean } {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('aether_cf_worker_url') : null;
    if (stored && stored.trim()) {
      return { url: stored.trim(), isCustom: true };
    }
    return { url: '', isCustom: false };
  }

  public setWorkerConfig(url: string | null): void {
    if (typeof localStorage === 'undefined') return;
    if (url && url.trim()) {
      localStorage.setItem('aether_cf_worker_url', url.trim());
    } else {
      localStorage.removeItem('aether_cf_worker_url');
    }
    this.disconnect();
  }

  // Determine whether to attempt WebSocket first or go straight to P2P
  private shouldUseP2PFirst(): boolean {
    if (this.networkMode === 'p2p') return true;
    if (this.networkMode === 'websocket') return false;

    // Auto mode
    const hasCustomWorker = typeof localStorage !== 'undefined' && !!localStorage.getItem('aether_cf_worker_url');
    if (hasCustomWorker) return false;

    return this.isCloudflareStaticHost();
  }

  // --- WebSocket Connection with strict timeout ---
  public connectWs(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN)) {
        resolve(true);
        return;
      }

      if (this.ws) {
        try { this.ws.close(); } catch { /* ignore */ }
        this.ws = null;
      }

      const wsUrl = this.getEffectiveWsUrl();
      let isResolved = false;

      const finish = (success: boolean) => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(timeoutId);
        resolve(success);
      };

      const timeoutId = window.setTimeout(() => {
        if (!isResolved) {
          console.warn('WebSocket connection timed out on:', wsUrl);
          try { this.ws?.close(); } catch { /* ignore */ }
          this.ws = null;
          finish(false);
        }
      }, 3000);

      try {
        this.ws = new WebSocket(wsUrl);
      } catch (err) {
        console.warn('WebSocket init exception:', err);
        finish(false);
        return;
      }

      this.ws.onopen = () => {
        this.wsConnected = true;
        if (this.activeTransport !== 'firebase') {
          this.isConnected = true;
          this.activeTransport = 'ws';
          this.reconnectAttempts = 0;
          this.startPingLoop();
          this.onConnectionChange?.(true, this.latencyMs);
        }
        finish(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: ServerMessage = JSON.parse(event.data);
          this.handleServerMessage(msg);
        } catch (e) {
          console.error('Failed to parse server message:', e);
        }
      };

      this.ws.onclose = () => {
        this.wsConnected = false;
        if (this.activeTransport === 'ws') {
          this.isConnected = false;
          this.stopPingLoop();
          this.onConnectionChange?.(false, 0);
        }
        finish(false);
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket error encountered:', err);
        finish(false);
      };
    });
  }

  // --- PeerJS (P2P) Engine for Serverless Multiplayer ---
  private initPeer(customId?: string): Promise<Peer> {
    return new Promise((resolve, reject) => {
      if (this.peer && !this.peer.destroyed) {
        if (!customId || this.peer.id === customId) {
          resolve(this.peer);
          return;
        }
        try { this.peer.destroy(); } catch { /* ignore */ }
        this.peer = null;
      }

      const peerOptions = {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun.cloudflare.com:3478' },
            { urls: 'stun:global.stun.twilio.com:3478' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
          ],
        },
      };

      const p = customId ? new Peer(customId, peerOptions) : new Peer(peerOptions);

      let opened = false;
      const timeoutId = window.setTimeout(() => {
        if (!opened) {
          reject(new Error('اتصال به شبکه همتا‌به‌همتا (P2P) به دلیل کندی شبکه برقرار نشد.'));
        }
      }, 7000);

      p.on('open', (id) => {
        opened = true;
        clearTimeout(timeoutId);
        this.peer = p;
        resolve(p);
      });

      p.on('error', (err: any) => {
        clearTimeout(timeoutId);
        console.warn('PeerJS error:', err?.type, err);
        if (err?.type === 'unavailable-id') {
          reject(new Error('شناسه اتاق تکراری است. لطفاً مجدداً امتحان کنید.'));
        } else if (err?.type === 'peer-unavailable') {
          reject(new Error('اتاقی با این کد یافت نشد. لطفاً کد اتاق را بررسی کنید یا مطمئن شوید سازنده اتاق آنلاین است.'));
        } else {
          reject(new Error(`خطای ارتباط P2P: ${err?.message || err?.type || 'مشکل در شبکه'}`));
        }
      });
    });
  }

  // --- P2P Host Room Creation ---
  private async createRoomP2P(playerName: string, preferredRole: PlayerRole = 'explorer'): Promise<void> {
    const code = generateP2PRoomCode();
    const peerId = `${PEER_ID_PREFIX}${code.toLowerCase()}`;

    const hostPeer = await this.initPeer(peerId);

    this.isP2PHost = true;
    this.roomCode = code;
    this.myRole = preferredRole;
    this.myId = hostPeer.id;
    this.myName = playerName;
    this.activeTransport = 'p2p';
    this.isConnected = true;

    // Create fresh authoritative room state
    const puzzleState = createDefaultPuzzleState(1);
    this.hostRoomData = {
      code,
      stageId: 1,
      checkpointId: 0,
      players: {
        [preferredRole]: {
          id: hostPeer.id,
          name: playerName,
          ready: true,
          connected: true,
          pingMs: 1,
        },
      },
      puzzleState,
      status: 'waiting',
    };

    // Listen for connecting guest
    hostPeer.on('connection', (conn) => {
      this.p2pConn = conn;

      conn.on('open', () => {
        // Setup data channel listeners
      });

      conn.on('data', (raw: any) => {
        this.handleP2PMessage(raw);
      });

      conn.on('close', () => {
        if (this.hostRoomData) {
          const guestRole: PlayerRole = this.myRole === 'explorer' ? 'guardian' : 'explorer';
          if (this.hostRoomData.players[guestRole]) {
            this.hostRoomData.players[guestRole]!.connected = false;
          }
          this.hostRoomData.status = 'waiting';
          this.onPlayerDisconnected?.({ role: guestRole });
          this.onConnectionChange?.(true, 0);
        }
      });

      conn.on('error', (err) => {
        console.warn('P2P connection error:', err);
      });
    });

    // Inform local UI that room is created and joined
    this.onRoomJoined?.({
      room: this.hostRoomData,
      assignedRole: preferredRole,
      yourId: hostPeer.id,
    });
    this.onConnectionChange?.(true, 1);
  }

  // --- P2P Guest Join Room ---
  private async joinRoomP2P(code: string, playerName: string, preferredRole?: PlayerRole): Promise<void> {
    const cleanCode = code.trim().toUpperCase();
    const targetPeerId = `${PEER_ID_PREFIX}${cleanCode.toLowerCase()}`;

    const guestPeer = await this.initPeer();
    this.isP2PHost = false;
    this.roomCode = cleanCode;
    this.myName = playerName;
    this.myId = guestPeer.id;
    this.activeTransport = 'p2p';

    return new Promise((resolve, reject) => {
      const conn = guestPeer.connect(targetPeerId, {
        reliable: true,
      });

      let opened = false;
      const timeoutId = window.setTimeout(() => {
        if (!opened) {
          try { conn.close(); } catch { /* ignore */ }
          reject(new Error('اتاقی با این کد پیدا نشد. مطمئن شوید دوستتان اتاق را ساخته و در انتظار شماست.'));
        }
      }, 7000);

      conn.on('open', () => {
        opened = true;
        clearTimeout(timeoutId);
        this.p2pConn = conn;
        this.isConnected = true;

        // Send join request to host
        conn.send({
          type: 'p2p_join',
          code: cleanCode,
          playerName,
          preferredRole,
          peerId: guestPeer.id,
        });

        this.startP2PPingLoop();
        resolve();
      });

      conn.on('data', (raw: any) => {
        this.handleP2PMessage(raw);
      });

      conn.on('close', () => {
        this.isConnected = false;
        this.stopPingLoop();
        this.onConnectionChange?.(false, 0);
        const partnerRole: PlayerRole = this.myRole === 'explorer' ? 'guardian' : 'explorer';
        this.onPlayerDisconnected?.({ role: partnerRole });
      });

      conn.on('error', (err) => {
        clearTimeout(timeoutId);
        console.warn('P2P Conn error:', err);
        reject(new Error('خطا در اتصال مستقیم به هم‌تیمی.'));
      });
    });
  }

  // Handle incoming P2P data
  private handleP2PMessage(msg: any) {
    if (!msg || !msg.type) return;

    if (this.isP2PHost) {
      // Host side handling
      if (msg.type === 'p2p_join') {
        const guestPreferred: PlayerRole = msg.preferredRole || (this.myRole === 'explorer' ? 'guardian' : 'explorer');
        const guestRole: PlayerRole = guestPreferred === this.myRole ? (this.myRole === 'explorer' ? 'guardian' : 'explorer') : guestPreferred;

        if (this.hostRoomData) {
          this.hostRoomData.players[guestRole] = {
            id: msg.peerId,
            name: msg.playerName,
            ready: true,
            connected: true,
            pingMs: 15,
          };
          this.hostRoomData.status = 'ready';

          // Reply to guest with initial room state
          this.p2pConn?.send({
            type: 'p2p_welcome',
            room: this.hostRoomData,
            assignedRole: guestRole,
            yourId: msg.peerId,
          });

          // Inform host UI that partner joined
          this.onPlayerJoined?.({
            role: guestRole,
            name: msg.playerName,
          });

          this.startP2PPingLoop();
        }
        return;
      }
    }

    // Guest receives welcome
    if (msg.type === 'p2p_welcome') {
      this.myRole = msg.assignedRole;
      this.onRoomJoined?.({
        room: msg.room,
        assignedRole: msg.assignedRole,
        yourId: msg.yourId,
      });
      this.onConnectionChange?.(true, this.latencyMs || 20);
      return;
    }

    // P2P Ping/Pong
    if (msg.type === 'p2p_ping') {
      this.p2pConn?.send({ type: 'p2p_pong', clientTime: msg.clientTime });
      return;
    }
    if (msg.type === 'p2p_pong') {
      this.latencyMs = Math.max(1, Math.round(Date.now() - msg.clientTime));
      this.onConnectionChange?.(true, this.latencyMs);
      return;
    }

    // Puzzle sync: Host updates authoritative state and syncs
    if (msg.type === 'puzzle_trigger' && this.isP2PHost && this.hostRoomData) {
      const ps = this.hostRoomData.puzzleState;
      if (msg.key in ps) {
        (ps as any)[msg.key] = msg.value;
      } else {
        ps.customData[msg.key] = msg.value;
      }
      this.p2pConn?.send({ type: 'puzzle_synced', puzzleState: ps });
      this.onPuzzleSynced?.(ps);
      return;
    }

    // Regular ServerMessage translation
    this.handleServerMessage(msg as ServerMessage);
  }

  private startP2PPingLoop() {
    this.stopPingLoop();
    this.pingInterval = window.setInterval(() => {
      if (this.isConnected && this.p2pConn?.open) {
        this.p2pConn.send({ type: 'p2p_ping', clientTime: Date.now() });
      }
    }, 2500);
  }

  // --- Public API for Room Lifecycle ---
  public async createRoom(playerName: string, preferredRole?: PlayerRole): Promise<void> {
    this.myName = playerName;
    const role = preferredRole || 'explorer';

    // 1. If explicit WebSocket or Auto mode on full-stack server: Try high-speed WebSocket first
    if (this.networkMode === 'websocket' || (!this.shouldUseP2PFirst() && this.networkMode === 'auto')) {
      const wsSuccess = await this.connectWs();
      if (wsSuccess && this.ws?.readyState === WebSocket.OPEN) {
        this.activeTransport = 'ws';
        this.ws.send(JSON.stringify({
          type: 'create_room',
          playerName,
          preferredRole: role,
        }));
        return;
      }
    }

    // 2. Firebase Firestore (if not quota exhausted)
    if (!FirebaseSync.isQuotaExhausted && (this.networkMode === 'firebase' || this.networkMode === 'auto')) {
      try {
        const code = generateP2PRoomCode();
        await this.firebaseSync.createRoom(code, playerName, role, 1);
        this.activeTransport = 'firebase';
        this.roomCode = code;
        this.myRole = role;
        this.isConnected = true;
        return;
      } catch (fbErr: any) {
        console.warn('Firebase room creation failed, falling back to other transports:', fbErr?.message || fbErr);
        if (this.networkMode === 'firebase' && !FirebaseSync.isQuotaExhausted) {
          const msg = fbErr?.message || 'خطا در ثبت اتاق در سرور ابری فایربیس.';
          this.onError?.(msg);
          throw new Error(msg);
        }
      }
    }

    // 3. P2P WebRTC Fallback (Zero server load, zero database quota)
    try {
      await this.createRoomP2P(playerName, role);
      return;
    } catch (p2pErr: any) {
      console.warn('P2P creation failed, attempting final fallback to WebSocket:', p2pErr);
    }

    // Final attempt WebSocket if not tried
    const wsSuccess = await this.connectWs();
    if (wsSuccess && this.ws?.readyState === WebSocket.OPEN) {
      this.activeTransport = 'ws';
      this.ws.send(JSON.stringify({
        type: 'create_room',
        playerName,
        preferredRole: role,
      }));
      return;
    }

    throw new Error('امکان ساخت اتاق با پروتکل‌های موجود فراهم نشد. اتصال اینترنت خود را بررسی کنید.');
  }

  public async joinRoom(code: string, playerName: string, preferredRole?: PlayerRole): Promise<void> {
    this.myName = playerName;
    const cleanCode = code.trim().toUpperCase();

    // 1. If explicit WebSocket or Auto mode on full-stack server: Try high-speed WebSocket first
    if (this.networkMode === 'websocket' || (!this.shouldUseP2PFirst() && this.networkMode === 'auto')) {
      const wsSuccess = await this.connectWs();
      if (wsSuccess && this.ws?.readyState === WebSocket.OPEN) {
        this.activeTransport = 'ws';
        this.ws.send(JSON.stringify({
          type: 'join_room',
          code: cleanCode,
          playerName,
          preferredRole,
        }));
        return;
      }
    }

    // 2. Firebase Firestore (if not quota exhausted)
    if (!FirebaseSync.isQuotaExhausted && (this.networkMode === 'firebase' || this.networkMode === 'auto')) {
      try {
        const res = await this.firebaseSync.joinRoom(cleanCode, playerName, preferredRole);
        this.activeTransport = 'firebase';
        this.roomCode = cleanCode;
        this.myRole = res.assignedRole;
        this.isConnected = true;
        return;
      } catch (fbErr: any) {
        console.warn('Firebase join failed, checking fallback transports:', fbErr?.message || fbErr);
        if (this.networkMode === 'firebase' && !FirebaseSync.isQuotaExhausted) {
          throw fbErr;
        }
      }
    }

    // 3. P2P WebRTC Fallback
    try {
      await this.joinRoomP2P(cleanCode, playerName, preferredRole);
      return;
    } catch (p2pErr: any) {
      console.warn('P2P join failed:', p2pErr);
    }

    // Final attempt WebSocket
    const wsSuccess = await this.connectWs();
    if (wsSuccess && this.ws?.readyState === WebSocket.OPEN) {
      this.activeTransport = 'ws';
      this.ws.send(JSON.stringify({
        type: 'join_room',
        code: cleanCode,
        playerName,
        preferredRole,
      }));
      return;
    }

    throw new Error('اتصال به اتاق ناموفق بود. مطمئن شوید دوستتان اتاق را ساخته و کد صحیح است.');
  }

  private handleServerMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'room_joined':
        this.roomCode = msg.room.code;
        this.myRole = msg.assignedRole;
        this.myId = msg.yourId;
        this.onRoomJoined?.(msg);
        break;

      case 'player_joined':
        this.onPlayerJoined?.(msg);
        break;

      case 'player_disconnected':
        this.onPlayerDisconnected?.(msg);
        break;

      case 'player_reconnected':
        this.onPlayerReconnected?.(msg);
        break;

      case 'partner_update':
        this.onPartnerUpdate?.(msg.state);
        break;

      case 'puzzle_synced':
        this.onPuzzleSynced?.(msg.puzzleState);
        break;

      case 'emote_triggered':
        this.onEmote?.(msg.data);
        break;

      case 'ping_triggered':
        this.onPing?.(msg.data);
        break;

      case 'checkpoint_updated':
        this.onCheckpointUpdated?.(msg);
        break;

      case 'stage_changed':
        this.onStageChanged?.(msg.stageId);
        break;

      case 'pong':
        this.latencyMs = Math.max(1, Math.round(Date.now() - msg.clientTime));
        this.onConnectionChange?.(this.isConnected, this.latencyMs);
        break;

      case 'error':
        this.onError?.(msg.message);
        break;
    }
  }

  private startPingLoop() {
    this.stopPingLoop();
    this.pingInterval = window.setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping_server', clientTime: Date.now() });
      }
    }, 3000);
  }

  private stopPingLoop() {
    if (this.pingInterval) {
      window.clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public send(msg: ClientMessage) {
    // 1. Send via Firebase Cloud Database if active
    if (this.activeTransport === 'firebase') {
      if (msg.type === 'player_update') {
        this.firebaseSync.sendPlayerUpdate(msg.state);
      } else if (msg.type === 'puzzle_trigger') {
        this.firebaseSync.sendPuzzleTrigger(msg.key, msg.value, this.currentPuzzleState);
      } else if (msg.type === 'emote') {
        this.firebaseSync.sendEmote(msg.emote);
      } else if (msg.type === 'ping') {
        this.firebaseSync.sendPing(msg.x, msg.y, msg.z);
      } else if (msg.type === 'checkpoint_reach') {
        this.firebaseSync.sendCheckpoint(msg.checkpointId);
      } else if (msg.type === 'stage_advance') {
        this.firebaseSync.sendStageAdvance(msg.nextStageId);
      } else if (msg.type === 'leave_room') {
        this.firebaseSync.leaveRoom();
      }
      return;
    }

    // 2. Send via WebSocket if active
    if (this.activeTransport === 'ws' && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
      return;
    }

    // 2. Send via P2P DataConnection if active
    if (this.activeTransport === 'p2p' && this.p2pConn?.open) {
      if (msg.type === 'player_update') {
        this.p2pConn.send({
          type: 'partner_update',
          state: {
            ...msg.state,
            id: this.myId || 'self',
            name: this.myName,
            role: this.myRole || 'explorer',
            timestamp: Date.now(),
          },
        });
      } else if (msg.type === 'puzzle_trigger') {
        if (this.isP2PHost && this.hostRoomData) {
          const ps = this.hostRoomData.puzzleState;
          if (msg.key in ps) {
            (ps as any)[msg.key] = msg.value;
          } else {
            ps.customData[msg.key] = msg.value;
          }
          this.p2pConn.send({ type: 'puzzle_synced', puzzleState: ps });
          this.onPuzzleSynced?.(ps);
        } else {
          this.p2pConn.send(msg);
        }
      } else if (msg.type === 'emote') {
        this.p2pConn.send({
          type: 'emote_triggered',
          data: {
            role: this.myRole || 'explorer',
            emote: msg.emote,
            timestamp: Date.now(),
          },
        });
      } else if (msg.type === 'ping') {
        this.p2pConn.send({
          type: 'ping_triggered',
          data: {
            id: Math.random().toString(36).slice(2),
            x: msg.x,
            y: msg.y,
            z: msg.z,
            senderRole: this.myRole || 'explorer',
            senderName: this.myName,
            timestamp: Date.now(),
          },
        });
      } else if (msg.type === 'checkpoint_reach') {
        this.p2pConn.send({
          type: 'checkpoint_updated',
          checkpointId: msg.checkpointId,
          respawnPos: [0, 1, 0],
        });
      } else if (msg.type === 'stage_advance') {
        this.p2pConn.send({
          type: 'stage_changed',
          stageId: msg.nextStageId,
        });
      } else if (msg.type === 'leave_room') {
        this.p2pConn.send({
          type: 'player_disconnected',
          role: this.myRole || 'explorer',
        });
      }
    }
  }

  public sendPlayerUpdate(state: Omit<PlayerNetState, 'id' | 'role' | 'name' | 'timestamp'>) {
    this.send({
      type: 'player_update',
      state: {
        ...state,
        timestamp: Date.now(),
      } as any,
    });
  }

  public triggerPuzzle(key: string, value: any, action = 'update') {
    this.send({
      type: 'puzzle_trigger',
      action,
      key,
      value,
    });
  }

  public sendEmote(emote: EmoteType) {
    this.send({
      type: 'emote',
      emote,
    });
  }

  public sendPing(x: number, y: number, z: number) {
    this.send({
      type: 'ping',
      x,
      y,
      z,
    });
  }

  public reachCheckpoint(checkpointId: number) {
    this.send({
      type: 'checkpoint_reach',
      checkpointId,
    });
  }

  public advanceStage(nextStageId: number) {
    this.send({
      type: 'stage_advance',
      nextStageId,
    });
  }

  public leaveRoom() {
    this.send({ type: 'leave_room' });
    this.disconnect();
  }

  public disconnect(): void {
    this.stopPingLoop();
    this.firebaseSync.cleanup();

    if (this.ws) {
      try { this.ws.close(); } catch { /* ignore */ }
      this.ws = null;
    }

    if (this.p2pConn) {
      try { this.p2pConn.close(); } catch { /* ignore */ }
      this.p2pConn = null;
    }

    if (this.peer) {
      try { this.peer.destroy(); } catch { /* ignore */ }
      this.peer = null;
    }

    this.roomCode = null;
    this.myRole = null;
    this.myId = null;
    this.isConnected = false;
    this.wsConnected = false;
    this.isP2PHost = false;
    this.hostRoomData = null;
  }

  public getRole(): PlayerRole | null {
    return this.myRole;
  }

  public getRoomCode(): string | null {
    return this.roomCode;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const networkClient = new NetworkClient();
