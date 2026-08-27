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

  public connect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        resolve();
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

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
