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

  // Stage 4 puzzles
  prism1Aligned: boolean;
  solarConduitActive: boolean;
  prism2Aligned: boolean;
  sunCoreAwakened: boolean;
  solarResonator1: boolean;
  solarResonator2: boolean;
  stage4ExitP1Ready: boolean;
  stage4ExitP2Ready: boolean;

  // Stage 5 puzzles
  gravityBridgeActive: boolean;
  stage5ExitP1Ready: boolean;
  stage5ExitP2Ready: boolean;

  // Stage 6 puzzles
  monolithFireActive: boolean;
  monolithWaterActive: boolean;
  monolithAirActive: boolean;
  monolithEarthActive: boolean;
  stage6ExitP1Ready: boolean;
  stage6ExitP2Ready: boolean;

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

    prism1Aligned: false,
    solarConduitActive: false,
    prism2Aligned: false,
    sunCoreAwakened: false,
    solarResonator1: false,
    solarResonator2: false,
    stage4ExitP1Ready: false,
    stage4ExitP2Ready: false,

    gravityBridgeActive: false,
    stage5ExitP1Ready: false,
    stage5ExitP2Ready: false,

    monolithFireActive: false,
    monolithWaterActive: false,
    monolithAirActive: false,
    monolithEarthActive: false,
    stage6ExitP1Ready: false,
    stage6ExitP2Ready: false,

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

export interface RoomParticipant {
  id: string;
  name: string;
  role?: PlayerRole;
  avatar?: string;
  isSpeaking?: boolean;
  isMuted?: boolean;
}

export type VoiceSignalMessage =
  | { type: 'voice:join' }
  | { type: 'voice:leave' }
  | { type: 'voice:speaking'; isSpeaking: boolean }
  | { type: 'voice:mute'; isMuted: boolean }
  | { type: 'voice:signal'; to?: string; signal: any; signalType?: string }
  | { type: 'voice:userJoined'; userId: string; name?: string; role?: PlayerRole }
  | { type: 'voice:userLeft'; userId: string }
  | { type: 'voice:existingMembers'; members: RoomParticipant[] };

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
  | { type: 'leave_room' }
  | { type: 'voice_join' }
  | { type: 'voice_leave' }
  | { type: 'voice_signal'; to?: string; signal: any; signalType?: string }
  | { type: 'voice_speaking'; isSpeaking: boolean }
  | { type: 'voice_mute'; isMuted: boolean };

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
  | { type: 'voice_user_joined'; userId: string; name?: string; role?: PlayerRole }
  | { type: 'voice_user_left'; userId: string }
  | { type: 'voice_existing_members'; members: RoomParticipant[] }
  | { type: 'voice_signal'; from: string; signal: any; signalType?: string }
  | { type: 'voice_speaking'; userId: string; isSpeaking: boolean }
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
