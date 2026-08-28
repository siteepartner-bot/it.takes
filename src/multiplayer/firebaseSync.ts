import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase.ts';
import type {
  PlayerRole,
  RoomData,
  PlayerNetState,
  PuzzleState,
  EmoteData,
  PingData,
  EmoteType,
} from '../types.ts';
import { createDefaultPuzzleState } from '../types.ts';

export interface FirebaseSyncCallbacks {
  onRoomJoined?: (data: { room: RoomData; assignedRole: PlayerRole; yourId: string }) => void;
  onPlayerJoined?: (data: { role: PlayerRole; name: string }) => void;
  onPlayerDisconnected?: (data: { role: PlayerRole }) => void;
  onPlayerReconnected?: (data: { role: PlayerRole }) => void;
  onPartnerUpdate?: (state: PlayerNetState) => void;
  onPuzzleSynced?: (puzzleState: PuzzleState) => void;
  onEmote?: (data: EmoteData) => void;
  onPing?: (data: PingData) => void;
  onCheckpointUpdated?: (data: { checkpointId: number; respawnPos: [number, number, number] }) => void;
  onStageChanged?: (stageId: number) => void;
  onConnectionChange?: (connected: boolean, pingMs: number) => void;
  onError?: (msg: string) => void;
}

function withTimeout<T>(promise: Promise<T>, ms = 2000, errorMsg = 'Firestore request timed out'): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), ms);
  });
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    timeoutPromise,
  ]);
}

export class FirebaseSync {
  public static isQuotaExhausted: boolean = false;

  private activeRoomCode: string | null = null;
  private myRole: PlayerRole | null = null;
  private myId: string | null = null;
  private myName: string = 'قهرمان';
  private callbacks: FirebaseSyncCallbacks = {};
  private unsubscribers: Unsubscribe[] = [];

  // Throttling for live movement updates
  private lastMoveWriteTime: number = 0;
  private lastSentState: {
    x: number;
    y: number;
    z: number;
    rotationY: number;
    animation: string;
    abilityActive: boolean;
  } | null = null;
  private pendingMoveUpdate: Omit<PlayerNetState, 'id' | 'role' | 'name' | 'timestamp'> | null = null;
  private moveTimer: number | null = null;

  // Heartbeat & ping
  private heartbeatInterval: number | null = null;
  private lastPingMs: number = 28;

  constructor(callbacks?: FirebaseSyncCallbacks) {
    if (callbacks) this.callbacks = callbacks;
  }

  private static isQuotaError(err: any): boolean {
    if (!err) return false;
    const code = err?.code;
    const msg = String(err?.message || '');
    return (
      code === 'resource-exhausted' ||
      code === 8 ||
      msg.includes('Quota') ||
      msg.includes('quota') ||
      msg.includes('resource-exhausted') ||
      msg.includes('limit exceeded')
    );
  }

  private handleQuotaExceeded(err?: any) {
    console.warn('Firestore write warning:', err?.message || err);
  }

  public setCallbacks(callbacks: FirebaseSyncCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public getRoomCode(): string | null {
    return this.activeRoomCode;
  }

  public getMyRole(): PlayerRole | null {
    return this.myRole;
  }

  public isConnected(): boolean {
    return !!this.activeRoomCode && !!this.myRole;
  }

  // --- Create Room in Firebase ---
  public async createRoom(
    code: string,
    playerName: string,
    preferredRole: PlayerRole = 'explorer',
    stageId: number = 1
  ): Promise<RoomData> {
    this.cleanup();

    const cleanCode = code.toUpperCase().trim();
    this.activeRoomCode = cleanCode;
    this.myRole = preferredRole;
    this.myName = playerName;
    this.myId = `p_fb_${Math.random().toString(36).substring(2, 9)}`;

    const roomRef = doc(db, 'rooms', cleanCode);
    const initialPuzzleState = createDefaultPuzzleState(stageId);

    const roomData: RoomData = {
      code: cleanCode,
      stageId,
      checkpointId: 0,
      players: {
        [preferredRole]: {
          id: this.myId,
          name: playerName,
          ready: true,
          connected: true,
          pingMs: 25,
        },
      },
      puzzleState: initialPuzzleState,
      status: 'waiting',
    };

    try {
      await withTimeout(
        setDoc(roomRef, {
          code: cleanCode,
          stageId,
          checkpointId: 0,
          status: 'waiting',
          hostRole: preferredRole,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          players: {
            [preferredRole]: {
              id: this.myId,
              name: playerName,
              ready: true,
              connected: true,
              lastSeen: Date.now(),
            },
          },
          puzzleState: initialPuzzleState,
        }),
        2500,
        'ثبت اتاق در سرور فایربیس بیش از حد طول کشید.'
      );

      this.subscribeToRoom(cleanCode, preferredRole);
      this.startHeartbeat();

      this.callbacks.onRoomJoined?.({
        room: roomData,
        assignedRole: preferredRole,
        yourId: this.myId,
      });
      this.callbacks.onConnectionChange?.(true, this.lastPingMs);

      return roomData;
    } catch (err: any) {
      if (FirebaseSync.isQuotaError(err)) {
        this.handleQuotaExceeded(err);
      } else {
        console.warn('Firebase createRoom note:', err?.message || err);
      }
      const msg = err?.message || 'خطا در ثبت اتاق در سرور ابری فایربیس.';
      throw new Error(msg);
    }
  }

  // --- Join Room in Firebase ---
  public async joinRoom(
    code: string,
    playerName: string,
    preferredRole?: PlayerRole
  ): Promise<{ room: RoomData; assignedRole: PlayerRole; yourId: string }> {
    this.cleanup();

    const cleanCode = code.toUpperCase().trim();
    const roomRef = doc(db, 'rooms', cleanCode);

    try {
      const snap = await withTimeout(getDoc(roomRef), 2500, 'جستجوی اتاق در فایربیس بیش از حد طول کشید.');
      if (!snap.exists()) {
        const errorMsg = `اتاقی با کد «${cleanCode}» در سرورهای ابری پیدا نشد. لطفاً کد را با دقت بررسی کنید یا اتاق جدیدی بسازید.`;
        throw new Error(errorMsg);
      }

      const data = snap.data();
      const currentPlayers = data.players || {};

      // Determine available role
      let assignedRole: PlayerRole;
      const explorerJoined = !!currentPlayers.explorer?.connected;
      const guardianJoined = !!currentPlayers.guardian?.connected;

      if (preferredRole && !currentPlayers[preferredRole]?.connected) {
        assignedRole = preferredRole;
      } else if (!explorerJoined) {
        assignedRole = 'explorer';
      } else if (!guardianJoined) {
        assignedRole = 'guardian';
      } else {
        const fullMsg = `اتاق «${cleanCode}» در حال حاضر پر است (هر ۲ بازیکن حضور دارند).`;
        throw new Error(fullMsg);
      }

      this.activeRoomCode = cleanCode;
      this.myRole = assignedRole;
      this.myName = playerName;
      this.myId = `p_fb_${Math.random().toString(36).substring(2, 9)}`;

      // Update room in Firestore
      await withTimeout(
        updateDoc(roomRef, {
          [`players.${assignedRole}`]: {
            id: this.myId,
            name: playerName,
            ready: true,
            connected: true,
            lastSeen: Date.now(),
          },
          status: 'ready',
          updatedAt: Date.now(),
        }),
        2500,
        'پیوستن به اتاق در فایربیس زمان‌بر شد.'
      );

      const updatedPlayers = {
        ...currentPlayers,
        [assignedRole]: {
          id: this.myId,
          name: playerName,
          ready: true,
          connected: true,
          pingMs: 30,
        },
      };

      const roomData: RoomData = {
        code: cleanCode,
        stageId: data.stageId || 1,
        checkpointId: data.checkpointId || 0,
        status: 'ready',
        players: updatedPlayers,
        puzzleState: data.puzzleState || createDefaultPuzzleState(data.stageId || 1),
      };

      this.subscribeToRoom(cleanCode, assignedRole);
      this.startHeartbeat();

      this.callbacks.onRoomJoined?.({
        room: roomData,
        assignedRole,
        yourId: this.myId,
      });
      this.callbacks.onConnectionChange?.(true, this.lastPingMs);

      return {
        room: roomData,
        assignedRole,
        yourId: this.myId,
      };
    } catch (err: any) {
      if (FirebaseSync.isQuotaError(err)) {
        this.handleQuotaExceeded(err);
      } else {
        console.warn('Firebase joinRoom note:', err?.message || err);
      }
      const msg = err?.message || 'خطا در پیوستن به اتاق در سرور ابری.';
      throw new Error(msg);
    }
  }

  // --- Real-time Listeners ---
  private subscribeToRoom(code: string, myRole: PlayerRole) {
    const partnerRole: PlayerRole = myRole === 'explorer' ? 'guardian' : 'explorer';
    const roomRef = doc(db, 'rooms', code);
    const partnerLiveRef = doc(db, 'rooms', code, 'live', partnerRole);
    const eventRef = doc(db, 'rooms', code, 'events', 'latest');

    let prevPartnerConnected = false;
    let prevStageId = 1;
    let prevCheckpointId = 0;

    // 1. Room Document Listener (Players, Puzzle State, Stage, Checkpoint)
    const unsubRoom = onSnapshot(
      roomRef,
      (snap) => {
        if (!snap.exists()) {
          this.callbacks.onPlayerDisconnected?.({ role: partnerRole });
          return;
        }

        const data = snap.data();
        const players = data.players || {};
        const partner = players[partnerRole];

        // Partner connection state change
        if (partner?.connected && !prevPartnerConnected) {
          prevPartnerConnected = true;
          this.callbacks.onPlayerJoined?.({
            role: partnerRole,
            name: partner.name || (partnerRole === 'explorer' ? 'نیوشا' : 'حسن'),
          });
        } else if (!partner?.connected && prevPartnerConnected) {
          prevPartnerConnected = false;
          this.callbacks.onPlayerDisconnected?.({ role: partnerRole });
        }

        // Puzzle state sync
        if (data.puzzleState) {
          this.callbacks.onPuzzleSynced?.(data.puzzleState);
        }

        // Stage change sync
        if (data.stageId && data.stageId !== prevStageId) {
          prevStageId = data.stageId;
          this.callbacks.onStageChanged?.(data.stageId);
        }

        // Checkpoint sync
        if (typeof data.checkpointId === 'number' && data.checkpointId !== prevCheckpointId) {
          prevCheckpointId = data.checkpointId;
          this.callbacks.onCheckpointUpdated?.({
            checkpointId: data.checkpointId,
            respawnPos: [0, 1, 0],
          });
        }
      },
      (err) => {
        if (FirebaseSync.isQuotaError(err)) {
          this.handleQuotaExceeded(err);
        } else {
          console.warn('Firestore room snapshot warning:', err?.message || err);
        }
      }
    );
    this.unsubscribers.push(unsubRoom);

    // 2. Partner Live Movement Listener (x, y, z, rotY, anim)
    const unsubPartnerLive = onSnapshot(
      partnerLiveRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data && typeof data.x === 'number') {
          this.callbacks.onPartnerUpdate?.({
            id: 'partner',
            name: partnerRole === 'explorer' ? 'نیوشا' : 'حسن',
            role: partnerRole,
            x: data.x,
            y: data.y,
            z: data.z,
            rotY: data.rotY ?? 0,
            anim: data.anim ?? 'idle',
            abilityActive: !!data.abilityActive,
            isGrounded: data.isGrounded !== false,
            timestamp: data.timestamp || Date.now(),
          });
        }
      },
      (err) => {
        if (FirebaseSync.isQuotaError(err)) {
          this.handleQuotaExceeded(err);
        } else {
          console.warn('Firestore partner live snapshot warning:', err?.message || err);
        }
      }
    );
    this.unsubscribers.push(unsubPartnerLive);

    // 3. Realtime Events Listener (Emotes, Pings)
    let lastEventTimestamp = Date.now();
    const unsubEvents = onSnapshot(
      eventRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (!data || !data.timestamp || data.timestamp <= lastEventTimestamp) return;
        lastEventTimestamp = data.timestamp;

        // Skip events sent by myself
        if (data.senderRole === myRole || data.role === myRole) return;

        if (data.type === 'emote') {
          this.callbacks.onEmote?.({
            role: data.role,
            emote: data.emote,
            timestamp: data.timestamp,
          });
        } else if (data.type === 'ping') {
          this.callbacks.onPing?.({
            id: data.id,
            x: data.x,
            y: data.y,
            z: data.z,
            senderRole: data.senderRole,
            senderName: data.senderName,
            timestamp: data.timestamp,
          });
        }
      },
      (err) => {
        if (FirebaseSync.isQuotaError(err)) {
          this.handleQuotaExceeded(err);
        } else {
          console.warn('Firestore events snapshot warning:', err?.message || err);
        }
      }
    );
    this.unsubscribers.push(unsubEvents);
  }

  // --- Real-time Player Movement Sync (Delta Throttled ~100ms) ---
  public sendPlayerUpdate(state: Omit<PlayerNetState, 'id' | 'role' | 'name' | 'timestamp'>) {
    if (FirebaseSync.isQuotaExhausted || !this.activeRoomCode || !this.myRole) return;
    this.pendingMoveUpdate = state;

    const now = Date.now();
    const elapsed = now - this.lastMoveWriteTime;

    if (elapsed >= 100) {
      this.flushMoveUpdate();
    } else if (!this.moveTimer) {
      this.moveTimer = window.setTimeout(() => {
        this.flushMoveUpdate();
      }, 100 - elapsed);
    }
  }

  private flushMoveUpdate() {
    if (this.moveTimer) {
      window.clearTimeout(this.moveTimer);
      this.moveTimer = null;
    }
    if (FirebaseSync.isQuotaExhausted || !this.pendingMoveUpdate || !this.activeRoomCode || !this.myRole) return;

    const current = this.pendingMoveUpdate;
    this.pendingMoveUpdate = null;
    const now = Date.now();

    // Check if player actually moved or changed animation/state
    if (this.lastSentState) {
      const dx = Math.abs(current.x - this.lastSentState.x);
      const dy = Math.abs(current.y - this.lastSentState.y);
      const dz = Math.abs(current.z - this.lastSentState.z);
      const dr = Math.abs(current.rotY - this.lastSentState.rotationY);
      const animChanged = current.anim !== this.lastSentState.animation;
      const abilityChanged = !!current.abilityActive !== this.lastSentState.abilityActive;

      const hasMoved = dx > 0.03 || dy > 0.03 || dz > 0.03 || dr > 0.04 || animChanged || abilityChanged;
      const timeSinceLastWrite = now - this.lastMoveWriteTime;

      // If standing still and written recently (< 3.5s), skip write to protect Firestore quota & eliminate lag
      if (!hasMoved && timeSinceLastWrite < 3500) {
        return;
      }
    }

    this.lastSentState = {
      x: current.x,
      y: current.y,
      z: current.z,
      rotationY: current.rotY,
      animation: current.anim,
      abilityActive: !!current.abilityActive,
    };
    this.lastMoveWriteTime = now;

    const payload = {
      ...current,
      role: this.myRole,
      timestamp: now,
    };

    const myLiveRef = doc(db, 'rooms', this.activeRoomCode, 'live', this.myRole);
    setDoc(myLiveRef, payload).catch((err) => {
      if (FirebaseSync.isQuotaError(err)) {
        this.handleQuotaExceeded(err);
      } else {
        console.warn('Failed to sync live position to Firebase:', err?.message || err);
      }
    });
  }

  // --- Puzzle State Sync ---
  public sendPuzzleTrigger(key: string, value: any, currentPuzzleState: PuzzleState) {
    if (FirebaseSync.isQuotaExhausted || !this.activeRoomCode) return;

    const updatedState = { ...currentPuzzleState };
    if (key in updatedState) {
      (updatedState as any)[key] = value;
    } else {
      updatedState.customData = { ...updatedState.customData, [key]: value };
    }

    const roomRef = doc(db, 'rooms', this.activeRoomCode);
    updateDoc(roomRef, {
      puzzleState: updatedState,
      updatedAt: Date.now(),
    }).catch((err) => {
      if (FirebaseSync.isQuotaError(err)) {
        this.handleQuotaExceeded(err);
      } else {
        console.warn('Failed to sync puzzle state to Firebase:', err?.message || err);
      }
    });
  }

  // --- Emotes & Pings ---
  public sendEmote(emote: EmoteType) {
    if (FirebaseSync.isQuotaExhausted || !this.activeRoomCode || !this.myRole) return;
    const eventRef = doc(db, 'rooms', this.activeRoomCode, 'events', 'latest');
    setDoc(eventRef, {
      type: 'emote',
      emote,
      role: this.myRole,
      timestamp: Date.now(),
    }).catch((err) => {
      if (FirebaseSync.isQuotaError(err)) this.handleQuotaExceeded(err);
    });
  }

  public sendPing(x: number, y: number, z: number) {
    if (FirebaseSync.isQuotaExhausted || !this.activeRoomCode || !this.myRole) return;
    const eventRef = doc(db, 'rooms', this.activeRoomCode, 'events', 'latest');
    setDoc(eventRef, {
      type: 'ping',
      id: `ping_${Date.now()}`,
      x,
      y,
      z,
      senderRole: this.myRole,
      senderName: this.myName,
      timestamp: Date.now(),
    }).catch((err) => {
      if (FirebaseSync.isQuotaError(err)) this.handleQuotaExceeded(err);
    });
  }

  // --- Checkpoint & Stage Advance ---
  public sendCheckpoint(checkpointId: number) {
    if (FirebaseSync.isQuotaExhausted || !this.activeRoomCode) return;
    const roomRef = doc(db, 'rooms', this.activeRoomCode);
    updateDoc(roomRef, {
      checkpointId,
      updatedAt: Date.now(),
    }).catch((err) => {
      if (FirebaseSync.isQuotaError(err)) this.handleQuotaExceeded(err);
    });
  }

  public sendStageAdvance(nextStageId: number) {
    if (FirebaseSync.isQuotaExhausted || !this.activeRoomCode) return;
    const roomRef = doc(db, 'rooms', this.activeRoomCode);
    updateDoc(roomRef, {
      stageId: nextStageId,
      checkpointId: 0,
      puzzleState: createDefaultPuzzleState(nextStageId),
      updatedAt: Date.now(),
    }).catch((err) => {
      if (FirebaseSync.isQuotaError(err)) this.handleQuotaExceeded(err);
    });
  }

  // --- Heartbeat Loop ---
  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = window.setInterval(async () => {
      if (FirebaseSync.isQuotaExhausted || !this.activeRoomCode || !this.myRole) return;
      const start = Date.now();
      try {
        const roomRef = doc(db, 'rooms', this.activeRoomCode);
        await updateDoc(roomRef, {
          [`players.${this.myRole}.lastSeen`]: Date.now(),
        });
        const measured = Math.min(120, Math.max(15, Date.now() - start));
        this.lastPingMs = Math.round(0.7 * this.lastPingMs + 0.3 * measured);
        this.callbacks.onConnectionChange?.(true, this.lastPingMs);
      } catch (err) {
        if (FirebaseSync.isQuotaError(err)) {
          this.handleQuotaExceeded(err);
        }
      }
    }, 20000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      window.clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // --- Leave / Cleanup ---
  public leaveRoom() {
    if (!FirebaseSync.isQuotaExhausted && this.activeRoomCode && this.myRole) {
      const roomRef = doc(db, 'rooms', this.activeRoomCode);
      updateDoc(roomRef, {
        [`players.${this.myRole}.connected`]: false,
        updatedAt: Date.now(),
      }).catch(() => {});
    }
    this.cleanup();
  }

  public cleanup() {
    this.stopHeartbeat();
    if (this.moveTimer) {
      window.clearTimeout(this.moveTimer);
      this.moveTimer = null;
    }
    this.unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    this.unsubscribers = [];
    this.activeRoomCode = null;
    this.myRole = null;
    this.myId = null;
  }
}
