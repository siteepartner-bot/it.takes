/**
 * Types for Aether Duo: 3D Co-op Adventure
 */

export type PlayerRole = 'explorer' | 'guardian';

export type AnimState = 'idle' | 'run' | 'sprint' | 'jump' | 'fall' | 'ability' | 'emote';

export type EmoteType = 'wave' | 'cheer' | 'point' | 'heart' | 'think';

export interface PlayerNetState {
  id: string;
  name: string;
  role: PlayerRole;
  x: number;
  y: number;
  z: number;
  rotY: number;
  anim: AnimState;
  abilityActive: boolean;
  isGrounded: boolean;
  timestamp: number;
}

export interface PingData {
  id: string;
  x: number;
  y: number;
  z: number;
  senderRole: PlayerRole;
  senderName: string;
  timestamp: number;
}

export interface EmoteData {
  role: PlayerRole;
  emote: EmoteType;
  timestamp: number;
}

export interface PuzzleState {
  stageId: number;
  checkpointId: number;
  // Stage 1 puzzles
  gate1Open: boolean;
  lever1Activated: boolean;
  heavyBlockPos: [number, number, number];
  heavyBlockPlaced: boolean;
  aqueductElevatorHeight: number;
  lightBridgeActive: boolean;
  bridgePedestalRotated: boolean;
  stage1ExitP1Ready: boolean;
  stage1ExitP2Ready: boolean;
  
  // Stage 2 puzzles
  floatingIslandBridgeActive: boolean;
  turretShieldDeflected: boolean;
  laserTurretDisabled: boolean;
  vortexActivated: boolean;
  stage2ExitP1Ready: boolean;
  stage2ExitP2Ready: boolean;

  // Stage 3 puzzles
  crusherJammed: boolean;
  boilerValve1: boolean;
  boilerValve2: boolean;
  boilerSequenceSuccess: boolean;
  grandClockworkEngaged: boolean;
  stage3ExitP1Ready: boolean;
  stage3ExitP2Ready: boolean;

  // Custom key-value store for extensible mechanics
  customData: Record<string, any>;
}

export function createDefaultPuzzleState(stageId = 1): PuzzleState {
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

export interface RoomData {
  code: string;
  stageId: number;
  checkpointId: number;
  players: Partial<Record<PlayerRole, {
    id: string;
    name: string;
    ready: boolean;
    connected: boolean;
    pingMs: number;
  }>>;
  puzzleState: PuzzleState;
  status: 'waiting' | 'ready' | 'playing' | 'stage_completed';
}

export type ClientMessage =
  | { type: 'join_room'; code: string; playerName: string; preferredRole?: PlayerRole }
  | { type: 'create_room'; playerName: string; preferredRole?: PlayerRole }
  | { type: 'player_update'; state: Omit<PlayerNetState, 'id' | 'role' | 'name'> }
  | { type: 'puzzle_trigger'; action: string; key: string; value: any }
  | { type: 'emote'; emote: EmoteType }
  | { type: 'ping'; x: number; y: number; z: number }
  | { type: 'checkpoint_reach'; checkpointId: number }
  | { type: 'stage_advance'; nextStageId: number }
  | { type: 'respawn' }
  | { type: 'ping_server'; clientTime: number }
  | { type: 'leave_room' };

export type ServerMessage =
  | { type: 'room_joined'; room: RoomData; assignedRole: PlayerRole; yourId: string }
  | { type: 'player_joined'; role: PlayerRole; name: string }
  | { type: 'player_left'; role: PlayerRole }
  | { type: 'player_disconnected'; role: PlayerRole }
  | { type: 'player_reconnected'; role: PlayerRole }
  | { type: 'partner_update'; state: PlayerNetState }
  | { type: 'puzzle_synced'; puzzleState: PuzzleState }
  | { type: 'emote_triggered'; data: EmoteData }
  | { type: 'ping_triggered'; data: PingData }
  | { type: 'checkpoint_updated'; checkpointId: number; respawnPos: [number, number, number] }
  | { type: 'stage_changed'; stageId: number }
  | { type: 'stage_cleared'; stageId: number }
  | { type: 'pong'; clientTime: number; serverTime: number }
  | { type: 'error'; message: string };

export interface GraphicsSettings {
  quality: 'low' | 'medium' | 'high';
  shadows: boolean;
  bloom: boolean;
  pixelRatio: number;
  particles: boolean;
}

export interface AudioSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
}

export type ControlMode = 'windows' | 'mobile';
