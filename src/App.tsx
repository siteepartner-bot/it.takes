import React, { useEffect, useRef, useState, useCallback } from 'react';
import { networkClient } from './multiplayer/networkClient.ts';
import { soundManager } from './audio/soundManager.ts';
import { GameEngine } from './game/engine.ts';
import { LobbyScreen } from './components/LobbyScreen.tsx';
import { GameHUD } from './components/GameHUD.tsx';
import { TouchControls } from './components/TouchControls.tsx';
import { PauseMenu } from './components/PauseMenu.tsx';
import { StageClearModal } from './components/StageClearModal.tsx';
import { StoryModal } from './components/StoryModal.tsx';
import { GeminiVoiceCallModal } from './components/GeminiVoiceCallModal.tsx';
import { InGameMasterVoice } from './components/InGameMasterVoice.tsx';
import { createDefaultPuzzleState } from './types.ts';
import { proximityVoiceManager } from './audio/proximityVoice.ts';
import type {
  PlayerRole,
  RoomData,
  PlayerNetState,
  EmoteType,
  GraphicsSettings,
  AudioSettings,
} from './types.ts';

export default function App() {
  const [gameState, setGameState] = useState<'lobby' | 'playing'>('lobby');
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [myRole, setMyRole] = useState<PlayerRole>('explorer');
  const [myName, setMyName] = useState(
    () => (typeof localStorage !== 'undefined' && localStorage.getItem('aether_player_name')) || 'قهرمان ۱'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // In-Game state
  const [currentStageId, setCurrentStageId] = useState(1);
  const [partnerConnected, setPartnerConnected] = useState(false);
  const [partnerDistance, setPartnerDistance] = useState(0);
  const [latencyMs, setLatencyMs] = useState(0);
  const [interactionPrompt, setInteractionPrompt] = useState<string | null>(null);
  const [checkpointMessage, setCheckpointMessage] = useState<string | null>(null);
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [isStageClearOpen, setIsStageClearOpen] = useState(false);
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [isGeminiCallOpen, setIsGeminiCallOpen] = useState(false);
  const [soloMode, setSoloMode] = useState(false);

  // Control Mode: 'windows' (mouse-look + WASD) vs 'mobile' (touch joystick + buttons)
  const [controlMode, setControlMode] = useState<'windows' | 'mobile'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aether_control_mode') as 'windows' | 'mobile';
      if (saved === 'windows' || saved === 'mobile') return saved;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;
      return isTouch ? 'mobile' : 'windows';
    }
    return 'windows';
  });

  const [isPointerLocked, setIsPointerLocked] = useState(false);

  // Smart Wake-Word Test Mode: automatic response when saying "استاد" without opening a modal
  // User can revert to classic modal view anytime in 1 click!
  const [ambientWakeWordEnabled, setAmbientWakeWordEnabled] = useState(true);
  const [triggerGuidanceKey, setTriggerGuidanceKey] = useState(0);

  // Settings
  const [graphics, setGraphics] = useState<GraphicsSettings>({
    quality: 'medium',
    shadows: true,
    bloom: true,
    pixelRatio: 1.25,
    particles: true,
  });

  const [audio, setAudio] = useState<AudioSettings>({
    masterVolume: 0.8,
    sfxVolume: 0.8,
    musicVolume: 0.35,
    muted: false,
  });

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const handleSetControlMode = (mode: 'windows' | 'mobile') => {
    setControlMode(mode);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('aether_control_mode', mode);
    }
    if (engineRef.current) {
      engineRef.current.setControlMode(mode);
    }
  };

  // Initialize Network Client Handlers
  useEffect(() => {
    networkClient.onRoomJoined = ({ room, assignedRole }) => {
      setRoomData(room);
      setMyRole(assignedRole);
      setIsConnecting(false);
      setErrorMessage(null);
      setCurrentStageId(room.stageId || 1);

      const partnerRole = assignedRole === 'explorer' ? 'guardian' : 'explorer';
      setPartnerConnected(!!room.players[partnerRole]?.connected);
    };

    networkClient.onPlayerJoined = ({ role, name }) => {
      setRoomData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          players: {
            ...prev.players,
            [role]: {
              id: 'joined',
              name,
              ready: true,
              connected: true,
              pingMs: 0,
            },
          },
          status: 'ready',
        };
      });
      setPartnerConnected(true);
      showCheckpointToast(`${name} به ماجراجویی پیوست!`);
    };

    networkClient.onPlayerDisconnected = () => {
      setPartnerConnected(false);
      setRoomData((prev) => {
        if (!prev) return null;
        return { ...prev, status: 'waiting' };
      });
      showCheckpointToast('هم‌تیمی موقتاً قطع شد...');
    };

    networkClient.onPlayerReconnected = () => {
      setPartnerConnected(true);
      showCheckpointToast('هم‌تیمی مجدداً متصل گردید!');
    };

    networkClient.onPartnerUpdate = (state: PlayerNetState) => {
      if (engineRef.current) {
        engineRef.current.updatePartnerState(state);
      }
    };

    networkClient.onPuzzleSynced = (puzzleState) => {
      if (engineRef.current) {
        engineRef.current.updatePuzzleState(puzzleState);
      }
    };

    networkClient.onEmote = (data) => {
      if (engineRef.current) {
        engineRef.current.triggerEmote(data.role, data.emote);
      }
    };

    networkClient.onPing = (data) => {
      if (engineRef.current) {
        engineRef.current.triggerPing(data);
      }
    };

    networkClient.onCheckpointUpdated = ({ checkpointId }) => {
      showCheckpointToast(`چک‌پوینت شماره ${checkpointId + 1} فعال شد!`);
    };

    networkClient.onStageChanged = (nextStage) => {
      setCurrentStageId(nextStage);
      setIsStageClearOpen(false);
      if (engineRef.current) {
        engineRef.current.loadStage(nextStage, myRole);
      }
      showCheckpointToast(`انتقال به مرحله ${nextStage}!`);
    };

    networkClient.onError = (err) => {
      setErrorMessage(err);
      setIsConnecting(false);
    };

    networkClient.onConnectionChange = (connected, ping) => {
      setLatencyMs(ping);
      if (!connected && gameState === 'playing' && !soloMode) {
        setErrorMessage('ارتباط موقتاً قطع شد. در حال تلاش برای اتصال مجدد...');
      }
    };
  }, [myRole, gameState, soloMode]);

  // Global Hotkeys for In-Game Modals (V for Master Radio, Escape for Pause Menu)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'Escape') {
        if (isGeminiCallOpen) {
          setIsGeminiCallOpen(false);
        } else if (isStoryOpen) {
          setIsStoryOpen(false);
        } else if (gameState === 'playing') {
          setIsPauseOpen((prev) => !prev);
        }
      }

      // V or G triggers Master Radio Guidance
      if ((e.key === 'v' || e.key === 'V' || e.key === 'g' || e.key === 'G') && gameState === 'playing') {
        e.preventDefault();
        handleTriggerGeminiCall();
      }

      // M toggles Proximity Voice Chat Microphone
      if ((e.key === 'm' || e.key === 'M') && gameState === 'playing') {
        e.preventDefault();
        proximityVoiceManager.toggleMicrophone();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isGeminiCallOpen, isStoryOpen, ambientWakeWordEnabled]);

  // Audio settings sync
  useEffect(() => {
    soundManager.setMute(audio.muted);
    soundManager.setVolume(audio.masterVolume, audio.sfxVolume, audio.musicVolume);
  }, [audio]);

  // Toast message helper
  const toastTimeoutRef = useRef<number | null>(null);
  const showCheckpointToast = (msg: string) => {
    setCheckpointMessage(msg);
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => {
      setCheckpointMessage(null);
      toastTimeoutRef.current = null;
    }, 4000);
  };

  // Start 3D Game Engine when game starts
  useEffect(() => {
    if (gameState === 'playing' && canvasContainerRef.current && !engineRef.current) {
      const engine = new GameEngine(canvasContainerRef.current, {
        onInteractionPrompt: (prompt) => setInteractionPrompt(prompt),
        onPartnerDistance: (dist) => setPartnerDistance(dist),
        onCheckpointMessage: (text) => showCheckpointToast(text),
        onStageClear: () => {
          setIsStageClearOpen(true);
        },
        onPointerLockChange: (isLocked) => setIsPointerLocked(isLocked),
      });

      engine.setControlMode(controlMode);
      engine.soloDuoMode = soloMode;
      engine.setGraphics(graphics);
      engine.loadStage(currentStageId, myRole, roomData?.puzzleState);
      engine.start();

      engineRef.current = engine;
    }

    return () => {
      if (gameState !== 'playing' && engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [gameState, currentStageId, myRole, soloMode, graphics, roomData?.puzzleState, controlMode]);

  // Lobby actions
  const handleCreateRoom = async (name: string, role: PlayerRole) => {
    setIsConnecting(true);
    setErrorMessage(null);
    setMyName(name);
    setMyRole(role);
    try {
      await networkClient.createRoom(name, role);
    } catch (err: any) {
      setErrorMessage(err?.message || 'خطا در برقراری ارتباط و ساخت اتاق.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleJoinRoom = async (code: string, name: string, role: PlayerRole) => {
    setIsConnecting(true);
    setErrorMessage(null);
    setMyName(name);
    setMyRole(role);
    try {
      await networkClient.joinRoom(code, name, role);
    } catch (err: any) {
      setErrorMessage(err?.message || 'خطا در ورود به اتاق. لطفاً کد را بررسی کنید.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleStartGame = () => {
    setSoloMode(false);
    setGameState('playing');
  };

  const handleStartSoloPractice = () => {
    setSoloMode(true);
    setMyRole('explorer');
    setPartnerConnected(true);
    setGameState('playing');
  };

  const handleLeaveGame = () => {
    networkClient.leaveRoom();
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
    setGameState('lobby');
    setRoomData(null);
    setIsPauseOpen(false);
    setIsStageClearOpen(false);
    setIsPointerLocked(false);
  };

  const handleNextStage = () => {
    const next = currentStageId + 1;
    if (next <= 3) {
      networkClient.advanceStage(next);
      setCurrentStageId(next);
      setIsStageClearOpen(false);
      if (engineRef.current) {
        engineRef.current.loadStage(next, myRole);
      }
    } else {
      handleLeaveGame();
    }
  };

  const handleSendEmote = (emote: EmoteType) => {
    networkClient.sendEmote(emote);
    if (engineRef.current) {
      engineRef.current.triggerEmote(myRole, emote);
    }
  };

  const handleSendPing = () => {
    if (engineRef.current) {
      const pos = engineRef.current.playerPos;
      networkClient.sendPing(pos.x, pos.y, pos.z);
      engineRef.current.triggerPing({
        id: `ping_${Date.now()}`,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        senderRole: myRole,
        senderName: myName,
        timestamp: Date.now(),
      });
    }
  };

  const handleToggleSoloHero = () => {
    if (engineRef.current && soloMode) {
      const nextRole: PlayerRole = myRole === 'explorer' ? 'guardian' : 'explorer';
      setMyRole(nextRole);
      engineRef.current.setRoles(nextRole);
      showCheckpointToast(
        `تعویض کنترل به: ${nextRole === 'explorer' ? 'نیوشا (دختر چوبی)' : 'حسن (پسر چوبی)'}`
      );
    }
  };

  const handleTouchInput = useCallback(
    (input: {
      moveVector: { x: number; y: number };
      jump: boolean;
      interact: boolean;
      ability: boolean;
      sprint: boolean;
    }) => {
      if (engineRef.current) {
        engineRef.current.setTouchControls(input);
      }
    },
    []
  );

  // Trigger Master Elias Radio (In-game ambient or classic modal)
  const handleTriggerGeminiCall = () => {
    if (ambientWakeWordEnabled) {
      setTriggerGuidanceKey((prev) => prev + 1);
    } else {
      setIsGeminiCallOpen(true);
    }
  };

  const partnerDisplayName = soloMode
    ? myRole === 'explorer'
      ? 'حسن (پسر چوبی)'
      : 'نیوشا (دختر چوبی)'
    : roomData?.players[myRole === 'explorer' ? 'guardian' : 'explorer']?.name || 'هم‌تیمی';

  return (
    <main className="w-full h-full min-h-[100dvh] max-h-[100dvh] overflow-hidden bg-slate-950 text-slate-100 relative select-none">
      {/* 3D WebGL Canvas Viewport */}
      <div
        id="game_canvas_container"
        ref={canvasContainerRef}
        className={`w-full h-full ${gameState === 'playing' ? 'block' : 'hidden'}`}
      />

      {/* Main Lobby Screen */}
      {gameState === 'lobby' && (
        <LobbyScreen
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          roomData={roomData}
          assignedRole={myRole}
          onStartGame={handleStartGame}
          onStartSoloPractice={handleStartSoloPractice}
          errorMessage={errorMessage}
          isConnecting={isConnecting}
        />
      )}

      {/* In-Game Active UI Overlays */}
      {gameState === 'playing' && (
        <>
          <GameHUD
            roomCode={roomData?.code || (soloMode ? 'PRACTICE' : null)}
            stageId={currentStageId}
            myRole={myRole}
            myName={myName}
            partnerName={partnerDisplayName}
            partnerRole={myRole === 'explorer' ? 'guardian' : 'explorer'}
            partnerConnected={partnerConnected}
            partnerDistance={partnerDistance}
            latencyMs={latencyMs}
            interactionPrompt={interactionPrompt}
            checkpointMessage={checkpointMessage}
            onSendEmote={handleSendEmote}
            onSendPing={handleSendPing}
            onOpenPause={() => setIsPauseOpen(true)}
            onOpenGeminiCall={handleTriggerGeminiCall}
            soloMode={soloMode}
            onToggleSoloHero={handleToggleSoloHero}
            controlMode={controlMode}
            onToggleControlMode={() =>
              handleSetControlMode(controlMode === 'windows' ? 'mobile' : 'windows')
            }
            isPointerLocked={isPointerLocked}
            onTogglePointerLock={() => {
              if (engineRef.current) {
                if (isPointerLocked) {
                  engineRef.current.exitPointerLock();
                } else {
                  engineRef.current.requestPointerLock();
                }
              }
            }}
          />

          {/* Touch Controls for Mobile & Tablets (rendered when mobile mode is active) */}
          <TouchControls
            visible={controlMode === 'mobile'}
            myRole={myRole}
            onUpdateInput={handleTouchInput}
            onSendEmote={handleSendEmote}
            onSendPing={handleSendPing}
            onOpenGeminiCall={handleTriggerGeminiCall}
          />

          {/* Ambient In-Game Master Voice (Auto-detects when saying "استاد", or on V key/button) */}
          <InGameMasterVoice
            enabled={ambientWakeWordEnabled}
            stageId={currentStageId}
            myRole={myRole}
            myName={myName}
            partnerName={partnerDisplayName}
            puzzleState={
              engineRef.current
                ? engineRef.current.getPuzzleState()
                : createDefaultPuzzleState(currentStageId)
            }
            partnerDistance={partnerDistance}
            onOpenClassicModal={() => setIsGeminiCallOpen(true)}
            triggerGuidanceKey={triggerGuidanceKey}
          />

          {/* Pause Menu Modal */}
          <PauseMenu
            isOpen={isPauseOpen}
            onClose={() => setIsPauseOpen(false)}
            onLeaveGame={handleLeaveGame}
            onRespawnCheckpoint={() => {
              if (engineRef.current) engineRef.current.respawnAtCheckpoint();
            }}
            roomCode={roomData?.code || null}
            graphics={graphics}
            onChangeGraphics={(newGfx) => {
              setGraphics(newGfx);
              if (engineRef.current) engineRef.current.setGraphics(newGfx);
            }}
            audio={audio}
            onChangeAudio={setAudio}
            soloMode={soloMode}
            onToggleSoloHero={handleToggleSoloHero}
            onOpenStory={() => setIsStoryOpen(true)}
            onOpenGeminiCall={() => setIsGeminiCallOpen(true)}
            controlMode={controlMode}
            onChangeControlMode={handleSetControlMode}
            ambientWakeWordEnabled={ambientWakeWordEnabled}
            onToggleAmbientWakeWord={setAmbientWakeWordEnabled}
          />

          {/* In-Game Story & Lore Modal */}
          <StoryModal isOpen={isStoryOpen} onClose={() => setIsStoryOpen(false)} />

          {/* Classic Dedicated Voice Guidance Modal (accessible anytime via button/toggle) */}
          <GeminiVoiceCallModal
            isOpen={isGeminiCallOpen}
            onClose={() => setIsGeminiCallOpen(false)}
            stageId={currentStageId}
            myRole={myRole}
            myName={myName}
            partnerName={partnerDisplayName}
            puzzleState={
              engineRef.current
                ? engineRef.current.getPuzzleState()
                : createDefaultPuzzleState(currentStageId)
            }
            partnerDistance={partnerDistance}
          />

          {/* Stage Cleared Celebration Modal */}
          {isStageClearOpen && (
            <StageClearModal
              stageId={currentStageId}
              onNextStage={handleNextStage}
              onReturnLobby={handleLeaveGame}
            />
          )}
        </>
      )}
    </main>
  );
}
