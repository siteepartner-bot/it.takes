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

type MessageHandler<T> = (data: T) => void;

class NetworkClient {
  private ws: WebSocket | null = null;
  private roomCode: string | null = null;
  private myRole: PlayerRole | null = null;
  private myId: string | null = null;
  private myName: string = 'Player';
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private pingInterval: number | null = null;
  public latencyMs: number = 0;

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

  private pendingAction: (() => void) | null = null;

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
    return { url: this.getEffectiveWsUrl(), isCustom: false };
  }

  public setWorkerConfig(url: string | null): void {
    if (typeof localStorage === 'undefined') return;
    if (url && url.trim()) {
      localStorage.setItem('aether_cf_worker_url', url.trim());
    } else {
      localStorage.removeItem('aether_cf_worker_url');
    }
    // Reconnect on next action
    if (this.ws) {
      this.disconnect();
    }
  }

  public connect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        resolve();
        return;
      }

      const wsUrl = this.getEffectiveWsUrl();

      try {
        this.ws = new WebSocket(wsUrl);
      } catch (err) {
        console.error('WebSocket instantiate error:', err);
        resolve();
        return;
      }

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startPingLoop();
        this.onConnectionChange?.(true, this.latencyMs);

        if (this.pendingAction) {
          this.pendingAction();
          this.pendingAction = null;
        }
        resolve();
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
        this.isConnected = false;
        this.stopPingLoop();
        this.onConnectionChange?.(false, 0);

        // Attempt reconnection if in room
        if (this.roomCode && this.reconnectAttempts < 5) {
          this.reconnectAttempts++;
          setTimeout(() => {
            this.connect().then(() => {
              if (this.roomCode) {
                this.joinRoom(this.roomCode, this.myName, this.myRole || undefined);
              }
            });
          }, 1500 * Math.min(this.reconnectAttempts, 4));
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket error encountered:', err);
      };
    });
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
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public async createRoom(playerName: string, preferredRole?: PlayerRole) {
    this.myName = playerName;
    await this.connect();
    this.send({
      type: 'create_room',
      playerName,
      preferredRole,
    });
  }

  public async joinRoom(code: string, playerName: string, preferredRole?: PlayerRole) {
    this.myName = playerName;
    await this.connect();
    this.send({
      type: 'join_room',
      code: code.trim().toUpperCase(),
      playerName,
      preferredRole,
    });
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
    this.roomCode = null;
    this.myRole = null;
    this.myId = null;
    this.stopPingLoop();
  }

  public disconnect(): void {
    this.stopPingLoop();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.isConnected = false;
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
