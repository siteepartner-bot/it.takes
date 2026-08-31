import * as THREE from 'three';
import { networkClient } from '../multiplayer/networkClient.ts';
import { soundManager } from '../audio/soundManager.ts';
import { createCharacterMesh, type CharacterControllerMesh } from './characterModel.ts';
import { buildCampaignStage } from './stages/campaignStages.ts';
import { buildGardenStage, type StageBuildResult, type InteractiveObject } from './stages/gardenStage.ts';
import { buildFloatingIslandsStage } from './stages/floatingIslandsStage.ts';
import { buildClockworkStage } from './stages/clockworkStage.ts';
import { buildMirrorChambersStage, SACRED_SYMBOLS, getStage3Sequences } from './stages/mirrorChambersStage.ts';
import { buildPrismTempleStage } from './stages/prismTempleStage.ts';
import { buildGravityLabyrinthStage } from './stages/gravityLabyrinthStage.ts';
import { buildCitadelStage } from './stages/citadelStage.ts';
import type {
  PlayerRole,
  AnimState,
  PuzzleState,
  PlayerNetState,
  GraphicsSettings,
  EmoteType,
  PingData,
} from '../types.ts';

export interface GameEngineCallbacks {
  onInteractionPrompt: (prompt: string | null) => void;
  onPartnerDistance: (dist: number) => void;
  onCheckpointMessage: (text: string) => void;
  onStageClear: (stageId: number) => void;
  onPointerLockChange?: (isLocked: boolean) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private callbacks: GameEngineCallbacks;

  // Three.js
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private sunLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.HemisphereLight;
  private resizeObserver!: ResizeObserver;

  // Control Mode & Pointer Lock (Windows / Mobile)
  private controlMode: 'windows' | 'mobile' = 'windows';
  private isPointerLocked = false;
  private boundPointerLockHandler: (() => void) | null = null;

  // Stage & Environment
  private currentStageId: number = 1;
  private currentStage: StageBuildResult | null = null;
  private puzzleState!: PuzzleState;

  // Characters
  private localRole: PlayerRole = 'explorer';
  private localPlayerMesh: CharacterControllerMesh | null = null;
  private remotePlayerMesh: CharacterControllerMesh | null = null;
  private partnerNetState: PlayerNetState | null = null;

  // Local Player Physics & Control
  public playerPos = new THREE.Vector3(0, 1.2, 0);
  public playerVel = new THREE.Vector3(0, 0, 0);
  public playerRotY = 0;
  private isGrounded = true;
  private standingOnCollider: THREE.Box3 | null = null;
  private standingOnLastMaxY = 0;
  private standingOnLastCenterX = 0;
  private standingOnLastCenterZ = 0;
  private currentAnim: AnimState = 'idle';
  private abilityActive = false;
  private abilityCooldown = 0;
  private carryingBlock = false;

  // Camera Orbit
  private cameraYaw = 0;
  private cameraPitch = 0.25;
  private cameraDistance = 6.5;
  private isMouseDown = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  // Stage Clear One-shot Guard
  private stageCompleted = false;

  // Active Inputs
  private keys: Record<string, boolean> = {};
  private touchMoveVector = { x: 0, y: 0 };
  private touchJump = false;
  private touchInteract = false;
  private touchAbility = false;
  private touchSprint = false;

  // Checkpoints
  private currentCheckpointId = 0;
  private respawnPos = new THREE.Vector3(0, 1.2, 0);

  // Ping Beacon System
  private activePingMesh: THREE.Group | null = null;
  private pingTime = 0;

  // Interaction Debounce Cooldown
  private interactCooldown = 0;

  // Solo Testing Dual-Control Mode
  public soloDuoMode = false;
  private soloSwapped = false;

  // Solo Mode Offline Physics & Position Tracking for Inactive Hero
  private soloPositions: Record<PlayerRole, THREE.Vector3> = {
    explorer: new THREE.Vector3(0, 1.2, 0),
    guardian: new THREE.Vector3(1.5, 1.2, 0),
  };
  private soloYVels: Record<PlayerRole, number> = {
    explorer: 0,
    guardian: 0,
  };
  private soloGrounded: Record<PlayerRole, boolean> = {
    explorer: true,
    guardian: true,
  };
  private soloStandingOnCollider: Record<PlayerRole, THREE.Box3 | null> = {
    explorer: null,
    guardian: null,
  };
  private soloStandingOnLastMaxY: Record<PlayerRole, number> = {
    explorer: 0,
    guardian: 0,
  };
  private soloStandingOnLastCenterX: Record<PlayerRole, number> = {
    explorer: 0,
    guardian: 0,
  };
  private soloStandingOnLastCenterZ: Record<PlayerRole, number> = {
    explorer: 0,
    guardian: 0,
  };

  // Animation & Loop
  private reqId: number | null = null;
  private lastFrameTime = performance.now();
  private networkSyncTimer = 0;
  private isRunning = false;

  constructor(container: HTMLElement, callbacks: GameEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.initThree();
    this.setupInputs();
  }

  private initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.015);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 300);

    const isMobile = typeof navigator !== 'undefined' && (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      ('ontouchstart' in window && window.innerWidth < 1024)
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: !isMobile, // Disable expensive MSAA on mobile for massive FPS boost
      powerPreference: 'high-performance',
      precision: isMobile ? 'mediump' : 'highp',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = isMobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Lighting
    this.ambientLight = new THREE.HemisphereLight(0xe0e7ff, 0x1e293b, 0.9);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.8);
    this.sunLight.position.set(25, 45, 20);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = isMobile ? 512 : 1024;
    this.sunLight.shadow.mapSize.height = isMobile ? 512 : 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 120;
    const d = 35;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    // ResizeObserver
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          this.camera.aspect = w / h;
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(w, h);
        }
      }
    });
    this.resizeObserver.observe(this.container);
  }

  public setGraphics(settings: GraphicsSettings) {
    this.renderer.shadowMap.enabled = settings.shadows;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.pixelRatio));
  }

  // --- Stage Loading ---
  public loadStage(stageId: number, startRole: PlayerRole, initialPuzzleState?: PuzzleState) {
    this.currentStageId = stageId;
    this.localRole = startRole;
    this.stageCompleted = false;

    if (this.currentStage) {
      this.scene.remove(this.currentStage.rootGroup);
      this.currentStage.dispose();
    }

    this.currentStage = buildCampaignStage(stageId);

    // Set stage atmosphere lighting based on stageId
    if (stageId === 1) {
      this.scene.background = new THREE.Color(0x13271a);
      this.scene.fog = new THREE.FogExp2(0x13271a, 0.018);
      this.sunLight.color.setHex(0xfef08a);
      this.ambientLight.color.setHex(0xdcfce7);
    } else if (stageId === 2) {
      this.scene.background = new THREE.Color(0x292524);
      this.scene.fog = new THREE.FogExp2(0x1c1917, 0.016);
      this.sunLight.color.setHex(0xfef08a);
      this.ambientLight.color.setHex(0xfef3c7);
    } else if (stageId === 8) {
      this.scene.background = new THREE.Color(0x0284c7);
      this.scene.fog = new THREE.FogExp2(0x38bdf8, 0.012);
      this.sunLight.color.setHex(0xffffff);
      this.ambientLight.color.setHex(0xe0f2fe);
    } else if (stageId === 3 || stageId === 10 || stageId === 11) {
      this.scene.background = new THREE.Color(0x1c1917);
      this.scene.fog = new THREE.FogExp2(0x292524, 0.022);
      this.sunLight.color.setHex(0xfbbf24);
      this.ambientLight.color.setHex(0xfef3c7);
    } else if (stageId === 4) {
      this.scene.background = new THREE.Color(0x292524);
      this.scene.fog = new THREE.FogExp2(0x1c1917, 0.016);
      this.sunLight.color.setHex(0xfacc15);
      this.ambientLight.color.setHex(0xfef3c7);
    } else if (stageId === 9 || stageId === 17) {
    } else if (stageId === 5 || stageId === 15) {
      this.scene.background = new THREE.Color(0x030712);
      this.scene.fog = new THREE.FogExp2(0x1e1b4b, 0.012);
      this.sunLight.color.setHex(0x38bdf8);
      this.ambientLight.color.setHex(0xd8b4fe);
    } else if (stageId === 6) {
      this.scene.background = new THREE.Color(0x1e1b18);
      this.scene.fog = new THREE.FogExp2(0x181412, 0.012);
      this.sunLight.color.setHex(0xfbbf24);
      this.ambientLight.color.setHex(0xfed7aa);
    } else if (stageId === 7) {
      this.scene.background = new THREE.Color(0x0c4a6e);
      this.scene.fog = new THREE.FogExp2(0x075985, 0.015);
      this.sunLight.color.setHex(0x38bdf8);
      this.ambientLight.color.setHex(0xbae6fd);
    } else if (stageId === 14) {
      this.scene.background = new THREE.Color(0x030712);
      this.scene.fog = new THREE.FogExp2(0x0b1329, 0.016);
      this.sunLight.color.setHex(0x06b6d4);
      this.ambientLight.color.setHex(0xcffaff);
    } else if (stageId === 20) {
      this.scene.background = new THREE.Color(0x022c22);
      this.scene.fog = new THREE.FogExp2(0x042f2e, 0.012);
      this.sunLight.color.setHex(0xfacc15);
      this.ambientLight.color.setHex(0xfef08a);
    } else {
      this.scene.background = new THREE.Color(0x09090b);
      this.scene.fog = new THREE.FogExp2(0x18181b, 0.016);
      this.sunLight.color.setHex(0xf59e0b);
      this.ambientLight.color.setHex(0xfef3c7);
    }

    this.scene.add(this.currentStage.rootGroup);

    // Reset player to spawn point or checkpoint
    const sp = this.currentStage.spawnPoint;
    this.playerPos.set(sp[0], sp[1], sp[2]);
    this.respawnPos.copy(this.playerPos);
    this.playerVel.set(0, 0, 0);

    // Initialize/Reset solo mode states
    this.soloPositions = {
      explorer: new THREE.Vector3(sp[0], sp[1], sp[2]),
      guardian: new THREE.Vector3(sp[0] + 1.5, sp[1], sp[2]),
    };
    this.soloYVels = {
      explorer: 0,
      guardian: 0,
    };
    this.soloGrounded = {
      explorer: true,
      guardian: true,
    };
    this.soloStandingOnCollider = {
      explorer: null,
      guardian: null,
    };
    this.soloStandingOnLastMaxY = {
      explorer: 0,
      guardian: 0,
    };
    this.soloStandingOnLastCenterX = {
      explorer: 0,
      guardian: 0,
    };
    this.soloStandingOnLastCenterZ = {
      explorer: 0,
      guardian: 0,
    };

    // Default puzzle state
    this.puzzleState = initialPuzzleState || {
      stageId,
      checkpointId: 0,
      gate1Open: false,
      lever1Activated: false,
      heavyBlockPos: [6, 0.8, 25],
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

    // Rebuild character meshes
    this.spawnCharacters();
    soundManager.startAmbientMusic(stageId);
  }

  public setRoles(local: PlayerRole) {
    if (this.soloDuoMode) {
      // Save old active character's state before switching
      const prevRole = this.localRole;
      if (prevRole) {
        this.soloPositions[prevRole].copy(this.playerPos);
        this.soloYVels[prevRole] = this.playerVel.y;
        this.soloGrounded[prevRole] = this.isGrounded;
        this.soloStandingOnCollider[prevRole] = this.standingOnCollider;
        this.soloStandingOnLastMaxY[prevRole] = this.standingOnLastMaxY;
        this.soloStandingOnLastCenterX[prevRole] = this.standingOnLastCenterX;
        this.soloStandingOnLastCenterZ[prevRole] = this.standingOnLastCenterZ;
      }

      this.localRole = local;

      // Load new active character's state
      this.playerPos.copy(this.soloPositions[local]);
      this.playerVel.set(0, this.soloYVels[local] || 0, 0);
      this.isGrounded = this.soloGrounded[local] ?? true;
      this.standingOnCollider = this.soloStandingOnCollider[local] ?? null;
      this.standingOnLastMaxY = this.soloStandingOnLastMaxY[local] ?? 0;
      this.standingOnLastCenterX = this.soloStandingOnLastCenterX[local] ?? 0;
      this.standingOnLastCenterZ = this.soloStandingOnLastCenterZ[local] ?? 0;
    } else {
      this.localRole = local;
    }
    this.spawnCharacters();
  }

  private spawnCharacters() {
    if (this.localPlayerMesh) {
      this.scene.remove(this.localPlayerMesh.group);
      this.localPlayerMesh.dispose();
    }
    if (this.remotePlayerMesh) {
      this.scene.remove(this.remotePlayerMesh.group);
      this.remotePlayerMesh.dispose();
    }

    const remoteRole: PlayerRole = this.localRole === 'explorer' ? 'guardian' : 'explorer';

    this.localPlayerMesh = createCharacterMesh(this.localRole);
    this.localPlayerMesh.setNametag(this.localRole === 'explorer' ? 'نیوشا (دختر چوبی)' : 'حسن (پسر چوبی)', true);
    this.scene.add(this.localPlayerMesh.group);

    this.remotePlayerMesh = createCharacterMesh(remoteRole);
    this.remotePlayerMesh.setNametag(remoteRole === 'explorer' ? 'نیوشا (دختر چوبی)' : 'حسن (پسر چوبی)', false);
    this.scene.add(this.remotePlayerMesh.group);

    if (this.soloDuoMode && this.soloPositions[remoteRole]) {
      this.remotePlayerMesh.group.position.copy(this.soloPositions[remoteRole]);
    } else {
      // Initial offset for remote
      this.remotePlayerMesh.group.position.set(this.playerPos.x + 2, this.playerPos.y, this.playerPos.z);
    }
  }

  public updatePartnerState(state: PlayerNetState) {
    this.partnerNetState = state;
  }

  public updatePuzzleState(state: PuzzleState) {
    this.puzzleState = state;
    this.checkPortalWarp();
  }

  public triggerEmote(role: PlayerRole, emote: EmoteType) {
    soundManager.playEmote();
    if (role === this.localRole && this.localPlayerMesh) {
      this.localPlayerMesh.showEmote(emote);
    } else if (this.remotePlayerMesh) {
      this.remotePlayerMesh.showEmote(emote);
    }
  }

  public triggerPing(data: PingData) {
    soundManager.playPing();
    this.createPingBeacon(data.x, data.y, data.z);
  }

  private createPingBeacon(x: number, y: number, z: number) {
    if (this.activePingMesh) {
      this.scene.remove(this.activePingMesh);
    }

    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Vertical beacon light beam
    const beamGeo = new THREE.CylinderGeometry(0.08, 0.15, 8, 12);
    beamGeo.translate(0, 4, 0);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    group.add(beam);

    // Expanding ripple ring
    const ringGeo = new THREE.RingGeometry(0.3, 0.5, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    group.add(ring);

    this.scene.add(group);
    this.activePingMesh = group;
    this.pingTime = 0;
  }

  // --- Input Handling ---
  private setupInputs() {
    window.addEventListener('keydown', (e) => {
      soundManager.userInteracted();
      this.keys[e.code] = true;

      // Quick Emotes 1-5
      if (e.key === '1') networkClient.sendEmote('wave');
      if (e.key === '2') networkClient.sendEmote('cheer');
      if (e.key === '3') networkClient.sendEmote('point');
      if (e.key === '4') networkClient.sendEmote('heart');
      if (e.key === '5') networkClient.sendEmote('think');

      // Alt key or Escape to release mouse cursor
      if (e.code === 'AltLeft' || e.code === 'AltRight' || e.code === 'Escape') {
        if (this.isPointerLocked) {
          this.exitPointerLock();
        }
      }

      // Ping beacon on 'T'
      if (e.code === 'KeyT') {
        const pingPos = this.playerPos.clone().add(new THREE.Vector3(0, 0.1, 0));
        networkClient.sendPing(pingPos.x, pingPos.y, pingPos.z);
      }

      // Solo duo swap on TAB key for effortless solo testing
      if (e.code === 'Tab' && this.soloDuoMode) {
        e.preventDefault();
        this.soloSwapped = !this.soloSwapped;
        this.setRoles(this.soloSwapped ? 'guardian' : 'explorer');
        this.callbacks.onCheckpointMessage(`تعویض به: ${this.localRole === 'explorer' ? 'نیوشا (دختر چوبی)' : 'حسن (پسر چوبی)'}`);
      }

      // Ghost Mode hint
      if (e.code === 'KeyG' && !e.repeat) {
        this.callbacks.onCheckpointMessage('👻 حالت عبور شبح‌وار فعال شد! برای رد شدن از دیوارها و شیشه‌ها، کلید G را نگه دارید.');
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Pointer Lock state listener
    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === this.renderer.domElement;
      this.isPointerLocked = isLocked;
      this.callbacks.onPointerLockChange?.(isLocked);
    };
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    this.boundPointerLockHandler = handlePointerLockChange;

    // Mouse click & lock
    const dom = this.renderer.domElement;
    dom.addEventListener('click', () => {
      soundManager.userInteracted();
      if (this.controlMode === 'windows' && !this.isPointerLocked) {
        try {
          dom.requestPointerLock();
        } catch {
          // pointer lock failed or blocked by browser
        }
      }
    });

    // Mouse camera orbit (with Pointer Lock support for Windows)
    dom.addEventListener('mousedown', (e) => {
      soundManager.userInteracted();
      this.isMouseDown = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      // Windows mode with pointer lock: mouse movement directly rotates camera 360°!
      if (this.isPointerLocked) {
        const movementX = e.movementX ?? (e as any).mozMovementX ?? 0;
        const movementY = e.movementY ?? (e as any).mozMovementY ?? 0;
        this.cameraYaw -= movementX * 0.0032;
        this.cameraPitch = Math.max(-0.25, Math.min(1.1, this.cameraPitch + movementY * 0.0032));
        return;
      }

      // Drag mode (unlocked or touch)
      if (!this.isMouseDown) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      this.cameraYaw -= dx * 0.005;
      this.cameraPitch = Math.max(-0.25, Math.min(1.1, this.cameraPitch + dy * 0.005));
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    // Touch camera rotation with multi-touch tracking
    let activeCameraTouchId: number | null = null;
    let lastTouchLookX = 0;
    let lastTouchLookY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      soundManager.userInteracted();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (activeCameraTouchId === null) {
          // Check if touch is NOT on virtual joystick area (bottom-left)
          const isJoystickArea = touch.clientX < 170 && touch.clientY > window.innerHeight - 170;
          if (!isJoystickArea) {
            activeCameraTouchId = touch.identifier;
            lastTouchLookX = touch.clientX;
            lastTouchLookY = touch.clientY;
            break;
          }
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (activeCameraTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === activeCameraTouchId) {
          const dx = touch.clientX - lastTouchLookX;
          const dy = touch.clientY - lastTouchLookY;
          lastTouchLookX = touch.clientX;
          lastTouchLookY = touch.clientY;

          this.cameraYaw -= dx * 0.0065;
          this.cameraPitch = Math.max(-0.25, Math.min(1.15, this.cameraPitch + dy * 0.0065));
          break;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (activeCameraTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === activeCameraTouchId) {
          activeCameraTouchId = null;
          break;
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });
  }

  // Control Mode & Pointer Lock Controls
  public setControlMode(mode: 'windows' | 'mobile') {
    this.controlMode = mode;
    if (mode === 'mobile' && this.isPointerLocked) {
      this.exitPointerLock();
    }
  }

  public getControlMode(): 'windows' | 'mobile' {
    return this.controlMode;
  }

  public requestPointerLock(): void {
    if (this.renderer?.domElement) {
      try {
        this.renderer.domElement.requestPointerLock();
      } catch (err) {
        console.warn('Pointer lock request error:', err);
      }
    }
  }

  public exitPointerLock(): void {
    if (typeof document !== 'undefined' && document.pointerLockElement === this.renderer.domElement) {
      try {
        document.exitPointerLock();
      } catch (err) {
        console.warn('Exit pointer lock error:', err);
      }
    }
  }

  public isPointerLockedActive(): boolean {
    return this.isPointerLocked;
  }

  public setTouchControls(input: {
    moveVector: { x: number; y: number };
    jump: boolean;
    interact: boolean;
    ability: boolean;
    sprint: boolean;
  }) {
    this.touchMoveVector = input.moveVector;
    this.touchJump = input.jump;
    this.touchInteract = input.interact;
    this.touchAbility = input.ability;
    this.touchSprint = input.sprint;
  }

  // --- Main Game Loop ---
  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - this.lastFrameTime) / 1000);
      this.lastFrameTime = now;

      this.update(dt);
      this.render();

      if (this.isRunning) {
        this.reqId = requestAnimationFrame(loop);
      }
    };

    this.reqId = requestAnimationFrame(loop);
  }

  public stop() {
    this.isRunning = false;
    if (this.reqId) {
      cancelAnimationFrame(this.reqId);
      this.reqId = null;
    }
  }

  private update(dt: number) {
    if (!this.currentStage) return;

    // 1. Stage Update (Puzzles, animated meshes, moving platforms) - Run first so colliders and player delta are perfectly in sync
    this.currentStage.update(dt, this.puzzleState);

    // Apply moving platform delta to player if grounded
    if (this.isGrounded && this.standingOnCollider) {
      const deltaY = this.standingOnCollider.max.y - this.standingOnLastMaxY;
      const centerX = (this.standingOnCollider.min.x + this.standingOnCollider.max.x) / 2;
      const deltaX = centerX - this.standingOnLastCenterX;
      const centerZ = (this.standingOnCollider.min.z + this.standingOnCollider.max.z) / 2;
      const deltaZ = centerZ - this.standingOnLastCenterZ;

      if (Math.abs(deltaY) > 0.0001 && Math.abs(deltaY) < 1.5) {
        this.playerPos.y += deltaY;
        this.playerVel.y = 0;
      }
      if (Math.abs(deltaX) > 0.0001 && Math.abs(deltaX) < 1.5) {
        this.playerPos.x += deltaX;
      }
      if (Math.abs(deltaZ) > 0.0001 && Math.abs(deltaZ) < 1.5) {
        this.playerPos.z += deltaZ;
      }

      // Track consumed values
      this.standingOnLastMaxY = this.standingOnCollider.max.y;
      this.standingOnLastCenterX = centerX;
      this.standingOnLastCenterZ = centerZ;
    }

    // 1. Process Movement Inputs
    let moveX = 0;
    let moveZ = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

    // Touch joystick
    if (Math.abs(this.touchMoveVector.x) > 0.1 || Math.abs(this.touchMoveVector.y) > 0.1) {
      moveX = this.touchMoveVector.x;
      moveZ = -this.touchMoveVector.y;
    }

    const isSprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.touchSprint;
    const baseSpeed = this.localRole === 'explorer' ? 8.5 : 6.8;
    const maxSpeed = isSprinting ? baseSpeed * 1.45 : baseSpeed;

    // Transform input relative to Camera Yaw
    const inputVec = new THREE.Vector3(moveX, 0, moveZ);
    const hasMoveInput = inputVec.lengthSq() > 0.02;

    if (hasMoveInput) {
      inputVec.normalize();
      inputVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);

      // Smooth turn character facing direction
      const targetRotY = Math.atan2(inputVec.x, inputVec.z);
      let diff = targetRotY - this.playerRotY;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.playerRotY += diff * Math.min(1, dt * 14);

      // Accelerate horizontal velocity
      this.playerVel.x += inputVec.x * maxSpeed * dt * 10;
      this.playerVel.z += inputVec.z * maxSpeed * dt * 10;

      soundManager.playFootstep();
    }

    // Decrement interact cooldown
    if (this.interactCooldown > 0) {
      this.interactCooldown -= dt;
    }

    // Horizontal friction
    const friction = this.isGrounded ? 8.5 : 2.5;
    this.playerVel.x -= this.playerVel.x * friction * dt;
    this.playerVel.z -= this.playerVel.z * friction * dt;

    // Jump
    const wantsJump = this.keys['Space'] || this.touchJump;
    if (wantsJump && this.isGrounded) {
      this.playerVel.y = 11.2;
      this.isGrounded = false;
      soundManager.playJump();
    }

    // Gravity
    this.playerVel.y -= 25.0 * dt;

    // 2. Physics & Collision Handling
    const nextPos = this.playerPos.clone().addScaledVector(this.playerVel, dt);

    // Collide with colliders
    const playerRadius = 0.45;
    const playerHeight = 1.8;
    let groundedThisFrame = false;
    let standingBox: THREE.Box3 | null = null;

    for (const box of this.currentStage.colliders) {
      // Check if intersecting bounding box
      const minX = box.min.x - playerRadius;
      const maxX = box.max.x + playerRadius;
      const minZ = box.min.z - playerRadius;
      const maxZ = box.max.z + playerRadius;
      const minY = box.min.y;
      const maxY = box.max.y;

      if (
        nextPos.x > minX &&
        nextPos.x < maxX &&
        nextPos.z > minZ &&
        nextPos.z < maxZ
      ) {
        // Landing on top or stepping up small steps (up to 0.55m)
        const isAlreadyStanding = (this.standingOnCollider === box);
        const verticalCheck = isAlreadyStanding || (this.playerPos.y >= maxY - 0.55);
        if (verticalCheck && nextPos.y <= maxY + 0.35 && this.playerVel.y <= 0.5) {
          nextPos.y = maxY;
          this.playerVel.y = 0;
          groundedThisFrame = true;
          standingBox = box;
        } else if (nextPos.y < maxY && nextPos.y + playerHeight > minY) {
          // Horizontal wall pushback
          if (this.keys['KeyG']) {
            // Ghost Mode activated! Bypass horizontal collision pushback
          } else {
            const overlapX1 = nextPos.x - minX;
            const overlapX2 = maxX - nextPos.x;
            const overlapZ1 = nextPos.z - minZ;
            const overlapZ2 = maxZ - nextPos.z;
            const minOverlap = Math.min(overlapX1, overlapX2, overlapZ1, overlapZ2);

            if (minOverlap === overlapX1) nextPos.x = minX;
            else if (minOverlap === overlapX2) nextPos.x = maxX;
            else if (minOverlap === overlapZ1) nextPos.z = minZ;
            else if (minOverlap === overlapZ2) nextPos.z = maxZ;
          }
        }
      }
    }

    // Landing sound
    if (!this.isGrounded && groundedThisFrame) {
      soundManager.playLand();
    }
    this.isGrounded = groundedThisFrame;
    this.standingOnCollider = standingBox;
    if (standingBox) {
      this.standingOnLastMaxY = standingBox.max.y;
      this.standingOnLastCenterX = (standingBox.min.x + standingBox.max.x) / 2;
      this.standingOnLastCenterZ = (standingBox.min.z + standingBox.max.z) / 2;
    } else {
      this.standingOnLastMaxY = 0;
      this.standingOnLastCenterX = 0;
      this.standingOnLastCenterZ = 0;
    }
    this.playerPos.copy(nextPos);
    if (this.soloDuoMode && this.localRole) {
      this.soloPositions[this.localRole].copy(this.playerPos);
    }

    // Abyss Fall Hazard Respawn
    const killY = this.currentStageId === 2 ? -6 : -12;
    if (this.playerPos.y < killY) {
      this.respawnAtCheckpoint();
    }

    // Stage 2 Checkpoint 2 Progress Trigger (Middle Plateau)
    if (this.currentStageId === 2 && this.playerPos.z >= 26 && this.puzzleState.checkpointId < 1) {
      this.puzzleState.checkpointId = 1;
      this.respawnPos.set(0, 1.2, 28);
      soundManager.playCheckpoint();
      this.callbacks.onCheckpointMessage('🚩 چک‌پوینت ۲ ثبت شد: سکوی میانی دره');
    }

    // Stage 3 Room Assignment & Dynamic Lock State
    if (this.currentStageId === 3) {
      const isSolo = this.soloDuoMode || !networkClient.getRoomCode();
      const pPos = this.playerPos;

      const currentSeed = (this.puzzleState.customData && typeof this.puzzleState.customData.stage3Seed === 'number')
        ? this.puzzleState.customData.stage3Seed
        : 77;

      let roomA_player: PlayerRole | null = this.puzzleState.customData?.stage3RoomA_Player || null;
      let roomB_player: PlayerRole | null = this.puzzleState.customData?.stage3RoomB_Player || null;
      let lockedA = !!(this.puzzleState.customData?.stage3LockedA);
      let lockedB = !!(this.puzzleState.customData?.stage3LockedB);
      let doorAOpen = !!(this.puzzleState.customData?.stage3DoorAOpen);
      let doorBOpen = !!(this.puzzleState.customData?.stage3DoorBOpen);
      let isLocked = !!(this.puzzleState.customData?.stage3Locked);

      let dataChanged = false;

      // 1. Proximity & Door Opening from outside (z: 10 to 16.5)
      const nearDoorA = pPos.x < -4 && pPos.x > -13 && pPos.z >= 10 && pPos.z <= 16.5;
      const nearDoorB = pPos.x > 4 && pPos.x < 13 && pPos.z >= 10 && pPos.z <= 16.5;

      const inRoomA = pPos.x < -2 && pPos.z >= 17.5 && pPos.z <= 47.5;
      const inRoomB = pPos.x > 2 && pPos.z >= 17.5 && pPos.z <= 47.5;

      if (!isSolo) {
        // --- MULTIPLAYER MODE ---
        // Door A opens ONLY if room A is not occupied by another player
        const canOpenA = nearDoorA && (!lockedA || roomA_player === this.localRole) && (roomA_player === null || roomA_player === this.localRole);
        if (canOpenA !== doorAOpen && !lockedA) {
          doorAOpen = canOpenA;
          dataChanged = true;
        }

        // Door B opens ONLY if room B is not occupied by another player
        const canOpenB = nearDoorB && (!lockedB || roomB_player === this.localRole) && (roomB_player === null || roomB_player === this.localRole);
        if (canOpenB !== doorBOpen && !lockedB) {
          doorBOpen = canOpenB;
          dataChanged = true;
        }

        // Anti-glitch and Capacity Check for Room A (Strictly 1 Player)
        if (inRoomA) {
          if (roomA_player && roomA_player !== this.localRole) {
            // Glitch / unauthorized second player detected!
            this.playerPos.set(0, 1.2, 5);
            this.playerVel.set(0, 0, 0);
            soundManager.playPuzzleErrorBuzz();
            this.callbacks.onCheckpointMessage('⚠️ ظرفیت اتاق A تنها ۱ نفر است! شما به تالار ورودی بازگردانده شدید.');
          } else {
            if (!lockedA || roomA_player !== this.localRole) {
              roomA_player = this.localRole;
              lockedA = true;
              doorAOpen = false;
              dataChanged = true;
              soundManager.playGateMove();
              this.respawnPos.set(-8.5, 1.2, 20);
              this.callbacks.onCheckpointMessage('🔒 شما وارد اتاق A شدید و در ورودی قفل شد. به نمادهای روی آینه نگاه کنید و با هم‌تیمی‌ات صحبت کنید.');
            }
          }
        }

        // Anti-glitch and Capacity Check for Room B (Strictly 1 Player)
        if (inRoomB) {
          if (roomB_player && roomB_player !== this.localRole) {
            // Glitch / unauthorized second player detected!
            this.playerPos.set(0, 1.2, 5);
            this.playerVel.set(0, 0, 0);
            soundManager.playPuzzleErrorBuzz();
            this.callbacks.onCheckpointMessage('⚠️ ظرفیت اتاق B تنها ۱ نفر است! شما به تالار ورودی بازگردانده شدید.');
          } else {
            if (!lockedB || roomB_player !== this.localRole) {
              roomB_player = this.localRole;
              lockedB = true;
              doorBOpen = false;
              dataChanged = true;
              soundManager.playGateMove();
              this.respawnPos.set(8.5, 1.2, 20);
              this.callbacks.onCheckpointMessage('🔒 شما وارد اتاق B شدید و در ورودی قفل شد. به نمادهای روی آینه نگاه کنید و با هم‌تیمی‌ات صحبت کنید.');
            }
          }
        }

        const bothInside = !!(roomA_player && roomB_player && roomA_player !== roomB_player);
        if (bothInside && !isLocked) {
          isLocked = true;
          dataChanged = true;
          soundManager.playCheckpoint();
          this.callbacks.onCheckpointMessage('🔒 هر دو بازیکن در اتاق‌های خود مستقر شدند! برای گشودن درهای خروج، نمادهای درست را طبق آینه هم‌تیمی فعال کنید.');
        }

      } else {
        // --- SOLO MODE ---
        const expPos = this.soloPositions['explorer'];
        const grdPos = this.soloPositions['guardian'];

        const expInA = expPos.x < -2 && expPos.z >= 17.5 && expPos.z <= 47.5;
        const expInB = expPos.x > 2 && expPos.z >= 17.5 && expPos.z <= 47.5;
        const grdInA = grdPos.x < -2 && grdPos.z >= 17.5 && grdPos.z <= 47.5;
        const grdInB = grdPos.x > 2 && grdPos.z >= 17.5 && grdPos.z <= 47.5;

        // Anti-glitch: both heroes cannot be in the same chamber
        if ((expInA && grdInA) || (expInB && grdInB)) {
          this.playerPos.set(0, 1.2, 5);
          this.playerVel.set(0, 0, 0);
          this.soloPositions[this.localRole].set(0, 1.2, 5);
          soundManager.playPuzzleErrorBuzz();
          this.callbacks.onCheckpointMessage('⚠️ هر اتاق فقط ظرفیت ۱ قهرمان دارد! به تالار اصلی بازگردانده شدید.');
        } else {
          const occupantA: PlayerRole | null = expInA ? 'explorer' : (grdInA ? 'guardian' : null);
          const occupantB: PlayerRole | null = expInB ? 'explorer' : (grdInB ? 'guardian' : null);

          // Door A Open trigger in Solo
          const nearA = nearDoorA && (!occupantA || occupantA === this.localRole);
          if (nearA !== doorAOpen && !lockedA) {
            doorAOpen = nearA;
            dataChanged = true;
          }

          // Door B Open trigger in Solo
          const nearB = nearDoorB && (!occupantB || occupantB === this.localRole);
          if (nearB !== doorBOpen && !lockedB) {
            doorBOpen = nearB;
            dataChanged = true;
          }

          if (inRoomA && !lockedA) {
            lockedA = true;
            doorAOpen = false;
            roomA_player = this.localRole;
            dataChanged = true;
            soundManager.playGateMove();
            this.respawnPos.set(-8.5, 1.2, 20);
            this.callbacks.onCheckpointMessage(`🔒 ${this.localRole === 'explorer' ? 'نیوشا' : 'حسن'} وارد اتاق A شد و در قفل شد! با Tab شخصیت دیگر را وارد اتاق B کنید.`);
          }

          if (inRoomB && !lockedB) {
            lockedB = true;
            doorBOpen = false;
            roomB_player = this.localRole;
            dataChanged = true;
            soundManager.playGateMove();
            this.respawnPos.set(8.5, 1.2, 20);
            this.callbacks.onCheckpointMessage(`🔒 ${this.localRole === 'explorer' ? 'نیوشا' : 'حسن'} وارد اتاق B شد و در قفل شد! با Tab شخصیت دیگر را وارد اتاق A کنید.`);
          }

          if (occupantA && occupantB && !isLocked) {
            isLocked = true;
            lockedA = true;
            lockedB = true;
            doorAOpen = false;
            doorBOpen = false;
            roomA_player = occupantA;
            roomB_player = occupantB;
            dataChanged = true;
            soundManager.playCheckpoint();
            this.callbacks.onCheckpointMessage('🔒 هر دو قهرمان در اتاق‌ها مستقر شدند! با کلید Tab بین نیوشا و حسن سوییچ کنید و نمادها را طبق آینه‌ها فعال کنید.');
          }
        }
      }

      if (dataChanged) {
        const nextData = {
          ...this.puzzleState.customData,
          stage3Seed: currentSeed,
          stage3RoomA_Player: roomA_player,
          stage3RoomB_Player: roomB_player,
          stage3LockedA: lockedA,
          stage3LockedB: lockedB,
          stage3DoorAOpen: doorAOpen,
          stage3DoorBOpen: doorBOpen,
          stage3Locked: isLocked,
          stage3StateA: isLocked ? 'ACTIVE' : 'WAITING',
          stage3StateB: isLocked ? 'ACTIVE' : 'WAITING',
          stage3SeqA: this.puzzleState.customData?.stage3SeqA || [],
          stage3SeqB: this.puzzleState.customData?.stage3SeqB || [],
        };
        this.puzzleState.customData = nextData;
        networkClient.triggerPuzzle('customData', nextData);
      }
    }

    // Stage 4 Frame Update: Timed doors countdown, doorway safety, chasm fall check, and auto state progression
    if (this.currentStageId === 4) {
      const customData = this.puzzleState.customData || {};
      let customChanged = false;
      let timerA = typeof customData.stage4TimedDoorATimer === 'number' ? customData.stage4TimedDoorATimer : 0;
      let timerB = typeof customData.stage4TimedDoorBTimer === 'number' ? customData.stage4TimedDoorBTimer : 0;

      // Decrement Timer A if active
      if (timerA > 0) {
        timerA -= dt;
        const playerInDoorwayA = (Math.abs(this.playerPos.x - (-5.875)) < 2.5 && Math.abs(this.playerPos.z - 38) < 2.0);
        if (timerA <= 0 && playerInDoorwayA) {
          timerA = 0.2; // Keep open until player clears doorway
        }
        if (timerA < 0) timerA = 0;
        customChanged = true;
      }

      // Decrement Timer B if active
      if (timerB > 0) {
        timerB -= dt;
        const playerInDoorwayB = (Math.abs(this.playerPos.x - 5.875) < 2.5 && Math.abs(this.playerPos.z - 38) < 2.0);
        if (timerB <= 0 && playerInDoorwayB) {
          timerB = 0.2; // Keep open until player clears doorway
        }
        if (timerB < 0) timerB = 0;
        customChanged = true;
      }

      // Check Chasm Pit Fall in Part 3 (z: 56 to 78, y < -3.5)
      if (this.playerPos.y < -3.5 && this.playerPos.z >= 56 && this.playerPos.z <= 78) {
        soundManager.playPuzzleErrorBuzz();
        this.playerPos.set(0, 1.2, 52); // Checkpoint 3
        this.playerVel.set(0, 0, 0);
        this.respawnPos.set(0, 1.2, 52);
        this.callbacks.onCheckpointMessage('⚠️ به گودال چرخ‌دنده‌ها سقوط کردید! بازگشت به چک‌پوینت ۳');
      }

      // Check Automatic State Progression for Platforms in Part 3
      const mainState: string = customData.stage4MainState || 'WAITING';
      if (mainState === 'A_HELPING_B') {
        const expAcross = (this.soloPositions.explorer.z >= 76);
        const grdAcross = (this.soloPositions.guardian.z >= 76);
        const pAcross = (this.playerPos.z >= 76);
        if (expAcross || grdAcross || pAcross) {
          customData.stage4MainState = 'B_CROSSED';
          customChanged = true;
        }
      } else if (mainState === 'B_HELPING_A') {
        const expAcross = (this.soloPositions.explorer.z >= 76);
        const grdAcross = (this.soloPositions.guardian.z >= 76);
        const pAcross = (this.playerPos.z >= 76);
        if ((expAcross && grdAcross) || pAcross) {
          customData.stage4MainState = 'A_CROSSED';
          customChanged = true;
        }
      }

      if (customChanged) {
        const nextData = {
          ...customData,
          stage4TimedDoorATimer: timerA,
          stage4TimedDoorBTimer: timerB,
        };
        this.puzzleState.customData = nextData;
        networkClient.triggerPuzzle('customData', nextData);
      }
    }

    // Stage 5 Frame Update: Chasm Pit Falls & Checks
    if (this.currentStageId === 5) {
      // Check Pit Fall in Canyon 1 (z: 24 to 62, y < -3.5)
      if (this.playerPos.y < -3.5 && this.playerPos.z >= 24 && this.playerPos.z <= 62) {
        soundManager.playPuzzleErrorBuzz();
        const isWatchtowerSide = (this.playerPos.x < 0);
        if (isWatchtowerSide) {
          this.playerPos.set(-12, 10.8, 32); // Checkpoint 1 (Watchtower)
          this.respawnPos.set(-12, 10.8, 32);
        } else {
          this.playerPos.set(0, 1.2, 3); // Checkpoint 0 (Entrance)
          this.respawnPos.set(0, 1.2, 3);
        }
        this.playerVel.set(0, 0, 0);
        this.callbacks.onCheckpointMessage('⚠️ به دره بزرگ سقوط کردید! بازگشت به چک‌پوینت');
      }

      // Check Pit Fall in Chasm 2 (z: 74 to 114, y < -3.5)
      if (this.playerPos.y < -3.5 && this.playerPos.z >= 74 && this.playerPos.z <= 114) {
        soundManager.playPuzzleErrorBuzz();
        this.playerPos.set(0, 1.2, 70); // Checkpoint 2 (Control Station)
        this.playerVel.set(0, 0, 0);
        this.respawnPos.set(0, 1.2, 70);
        this.callbacks.onCheckpointMessage('⚠️ به دره دوم سقوط کردید! بازگشت به چک‌پوینت ۲');
      }
    }

    // Stage 7 Frame Update: Pit Fall Checks
    if (this.currentStageId === 7 && this.playerPos.y < -3.5) {
      soundManager.playPuzzleErrorBuzz();
      const data = this.puzzleState.customData || {};
      if (data.stage7Room3Solved || data.stage7DoorFinalUnlocked) {
        this.playerPos.set(0, 1.2, 125); // Checkpoint 2 (Final Sanctuary)
        this.respawnPos.set(0, 1.2, 125);
      } else if (data.stage7Door3AUnlocked || data.stage7Door3BUnlocked || data.stage7Room1Solved || data.stage7Room2Solved) {
        const isPathA = (this.playerPos.x < 0);
        const respX = isPathA ? -8.5 : 8.5;
        this.playerPos.set(respX, 1.2, 74); // Checkpoint 1 (Room 3 Entrance)
        this.respawnPos.set(respX, 1.2, 74);
      } else {
        this.playerPos.set(0, 1.2, 3); // Checkpoint 0 (Entrance)
        this.respawnPos.set(0, 1.2, 3);
      }
      this.playerVel.set(0, 0, 0);
      this.callbacks.onCheckpointMessage('⚠️ سقوط در معبد چهار اتاق! بازگشت به چک‌پوینت فعال');
    }

    // 3. Interactive Object Distance & Triggers
    this.checkInteractions();

    // 4. Update Animations
    const horizSpeed = Math.sqrt(this.playerVel.x * this.playerVel.x + this.playerVel.z * this.playerVel.z);
    if (!this.isGrounded) {
      this.currentAnim = this.playerVel.y > 0 ? 'jump' : 'fall';
    } else if (horizSpeed > 0.4) {
      this.currentAnim = isSprinting ? 'sprint' : 'run';
    } else {
      this.currentAnim = 'idle';
    }

    if (this.localPlayerMesh) {
      this.localPlayerMesh.group.position.copy(this.playerPos);
      this.localPlayerMesh.group.rotation.y = this.playerRotY;
      this.localPlayerMesh.updateAnimation(
        this.currentAnim,
        dt,
        horizSpeed / maxSpeed,
        this.abilityActive
      );
    }

    // 6. Remote Player Smooth Interpolation & Solo Mode Physics
    if (this.soloDuoMode) {
      // Save current active player's state
      this.soloPositions[this.localRole].copy(this.playerPos);
      this.soloGrounded[this.localRole] = this.isGrounded;
      this.soloStandingOnCollider[this.localRole] = this.standingOnCollider;
      this.soloStandingOnLastMaxY[this.localRole] = this.standingOnLastMaxY;
      this.soloStandingOnLastCenterX[this.localRole] = this.standingOnLastCenterX;
      this.soloStandingOnLastCenterZ[this.localRole] = this.standingOnLastCenterZ;

      // Update offline physics for inactive partner player
      const remoteRole = this.localRole === 'explorer' ? 'guardian' : 'explorer';
      const rPos = this.soloPositions[remoteRole];

      // Platform Riding for Inactive Player
      const rCollider = this.soloStandingOnCollider[remoteRole];
      if (this.soloGrounded[remoteRole] && rCollider) {
        const deltaY = rCollider.max.y - this.soloStandingOnLastMaxY[remoteRole];
        const centerX = (rCollider.min.x + rCollider.max.x) / 2;
        const deltaX = centerX - this.soloStandingOnLastCenterX[remoteRole];
        const centerZ = (rCollider.min.z + rCollider.max.z) / 2;
        const deltaZ = centerZ - this.soloStandingOnLastCenterZ[remoteRole];

        if (Math.abs(deltaY) > 0.0001) {
          rPos.y += deltaY;
        }
        if (Math.abs(deltaX) > 0.0001) {
          rPos.x += deltaX;
        }
        if (Math.abs(deltaZ) > 0.0001) {
          rPos.z += deltaZ;
        }
      }

      // Gravity update
      if (!this.soloGrounded[remoteRole]) {
        this.soloYVels[remoteRole] -= 22 * dt;
        rPos.y += this.soloYVels[remoteRole] * dt;
      } else {
        this.soloYVels[remoteRole] = 0;
      }

      // Simple grounded & collision check
      let rGroundedThisFrame = false;
      let rStandingBox: THREE.Box3 | null = null;
      const playerRadius = 0.45;

      if (this.currentStage) {
        for (const box of this.currentStage.colliders) {
          const minX = box.min.x - playerRadius;
          const maxX = box.max.x + playerRadius;
          const minZ = box.min.z - playerRadius;
          const maxZ = box.max.z + playerRadius;
          const maxY = box.max.y;

          if (rPos.x > minX && rPos.x < maxX && rPos.z > minZ && rPos.z < maxZ) {
            if (this.soloYVels[remoteRole] <= 0 && rPos.y >= maxY - 0.25 && rPos.y <= maxY + 0.15) {
              rPos.y = maxY;
              this.soloYVels[remoteRole] = 0;
              rGroundedThisFrame = true;
              rStandingBox = box;
            }
          }
        }
      }

      this.soloGrounded[remoteRole] = rGroundedThisFrame;
      this.soloStandingOnCollider[remoteRole] = rStandingBox;
      if (rStandingBox) {
        this.soloStandingOnLastMaxY[remoteRole] = rStandingBox.max.y;
        this.soloStandingOnLastCenterX[remoteRole] = (rStandingBox.min.x + rStandingBox.max.x) / 2;
        this.soloStandingOnLastCenterZ[remoteRole] = (rStandingBox.min.z + rStandingBox.max.z) / 2;
      } else {
        this.soloStandingOnLastMaxY[remoteRole] = 0;
        this.soloStandingOnLastCenterX[remoteRole] = 0;
        this.soloStandingOnLastCenterZ[remoteRole] = 0;
      }

      // Render the remote player mesh
      if (this.remotePlayerMesh) {
        this.remotePlayerMesh.group.position.lerp(rPos, Math.min(1, dt * 16));
        this.remotePlayerMesh.updateAnimation('idle', dt, 0, false);
      }

      // HUD Distance indicator
      const dist = Math.round(this.playerPos.distanceTo(rPos));
      this.callbacks.onPartnerDistance(dist);

    } else if (this.remotePlayerMesh && this.partnerNetState) {
      // Normal multiplayer path
      const targetPos = new THREE.Vector3(
        this.partnerNetState.x,
        this.partnerNetState.y,
        this.partnerNetState.z
      );

      // Smooth lerp (no jitter)
      this.remotePlayerMesh.group.position.lerp(targetPos, Math.min(1, dt * 16));

      // Angle lerp
      let angleDiff = this.partnerNetState.rotY - this.remotePlayerMesh.group.rotation.y;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      this.remotePlayerMesh.group.rotation.y += angleDiff * Math.min(1, dt * 14);

      this.remotePlayerMesh.updateAnimation(
        this.partnerNetState.anim,
        dt,
        1,
        this.partnerNetState.abilityActive
      );

      // Distance calculation
      const dist = Math.round(this.playerPos.distanceTo(targetPos));
      this.callbacks.onPartnerDistance(dist);
    }

    // 7. Stage 1 Glass/Light Bridge Auto-trigger if Guardian is standing on the switch
    if (this.currentStageId === 1 && !this.puzzleState.bridgePedestalRotated) {
      const isSolo = !networkClient.getRoomCode();
      const guardianPos = isSolo 
        ? this.soloPositions['guardian'] 
        : (this.localRole === 'guardian' 
            ? this.playerPos 
            : (this.partnerNetState ? new THREE.Vector3(this.partnerNetState.x, this.partnerNetState.y, this.partnerNetState.z) : null)
          );
      
      if (guardianPos) {
        const isGuardianNearBridgeTrigger = guardianPos.distanceTo(new THREE.Vector3(0, 5.5, 49)) < 4.0;
        const wantBridgeActive = isGuardianNearBridgeTrigger;
        if (wantBridgeActive !== !!this.puzzleState.lightBridgeActive) {
          networkClient.triggerPuzzle('lightBridgeActive', wantBridgeActive);
        }
      }
    }

    // 8. Ping Beacon Animation
    if (this.activePingMesh) {
      this.pingTime += dt;
      const ring = this.activePingMesh.children[1] as THREE.Mesh;
      if (ring) {
        ring.scale.set(1 + this.pingTime * 3, 1 + this.pingTime * 3, 1);
        (ring.material as THREE.Material).opacity = Math.max(0, 1 - this.pingTime / 4);
      }
      if (this.pingTime > 4.5) {
        this.scene.remove(this.activePingMesh);
        this.activePingMesh = null;
      }
    }

    // 9. Periodic Network State Broadcast (45 FPS)
    this.networkSyncTimer += dt;
    if (this.networkSyncTimer >= 0.022) {
      this.networkSyncTimer = 0;
      networkClient.sendPlayerUpdate({
        x: Math.round(this.playerPos.x * 100) / 100,
        y: Math.round(this.playerPos.y * 100) / 100,
        z: Math.round(this.playerPos.z * 100) / 100,
        rotY: Math.round(this.playerRotY * 100) / 100,
        anim: this.currentAnim,
        abilityActive: this.abilityActive,
        isGrounded: this.isGrounded,
      });
    }

    // 10. Smooth Camera Follow
    this.updateCamera(dt);
  }

  private checkInteractions() {
    if (!this.currentStage) return;

    // 1. Dynamic bounds update only for moving blocks
    for (const obj of this.currentStage.interactiveObjects) {
      if (obj.mesh && obj.type === 'heavy_block') {
        obj.bounds.setFromCenterAndSize(
          obj.mesh.position,
          new THREE.Vector3(3.2, 3.2, 3.2)
        );
      }
    }

    // 2. Strict Occupancy-based Pressure Plate Evaluation
    const isSolo = !networkClient.getRoomCode();
    const explorerPos = isSolo 
      ? this.soloPositions['explorer'] 
      : (this.localRole === 'explorer' 
          ? this.playerPos 
          : (this.partnerNetState ? new THREE.Vector3(this.partnerNetState.x, this.partnerNetState.y, this.partnerNetState.z) : null)
        );
    const guardianPos = isSolo 
      ? this.soloPositions['guardian'] 
      : (this.localRole === 'guardian' 
          ? this.playerPos 
          : (this.partnerNetState ? new THREE.Vector3(this.partnerNetState.x, this.partnerNetState.y, this.partnerNetState.z) : null)
        );

    // --- Stage 6 & 7: Path Assignment & Entrance Door Evaluation ---
    if (this.currentStageId === 6 || this.currentStageId === 7) {
      const activePositions: THREE.Vector3[] = [];
      if (explorerPos) activePositions.push(explorerPos);
      if (guardianPos) activePositions.push(guardianPos);

      const currentData = this.puzzleState.customData || {};
      let needsUpdate = false;
      const nextData = { ...currentData };
      const assignAKey = this.currentStageId === 6 ? 'stage6AssignedA' : 'stage7AssignedA';
      const assignBKey = this.currentStageId === 6 ? 'stage6AssignedB' : 'stage7AssignedB';

      // Check if players enter Path A or Path B triggering zones
      for (const pos of activePositions) {
        if (pos.z >= 16 && pos.z <= 26) {
          if (pos.x <= -2 && !currentData[assignAKey]) {
            nextData[assignAKey] = true;
            needsUpdate = true;
          }
          if (pos.x >= 2 && !currentData[assignBKey]) {
            nextData[assignBKey] = true;
            needsUpdate = true;
          }
        }
      }

      if (needsUpdate) {
        this.puzzleState.customData = nextData;
        networkClient.triggerPuzzle('customData', nextData);
      }
    }

    for (const obj of this.currentStage.interactiveObjects) {
      if (obj.type === 'pressure_plate') {
        const playersOnPlate = new Set<string>();
        if (explorerPos && (obj.bounds.distanceToPoint(explorerPos) < 2.0 || obj.bounds.containsPoint(explorerPos))) {
          playersOnPlate.add('explorer');
        }
        if (guardianPos && (obj.bounds.distanceToPoint(guardianPos) < 2.0 || obj.bounds.containsPoint(guardianPos))) {
          playersOnPlate.add('guardian');
        }

        const isOccupied = playersOnPlate.size > 0;

        // Stage 1 Gate Pressure Plate (State Machine: LOCKED -> BUTTON_ACTIVE -> PERMANENTLY_UNLOCKED)
        if (obj.id === 'plate_gate_1') {
          const wantOpen = isOccupied;
          if (wantOpen !== !!this.puzzleState.gate1Open) {
            networkClient.triggerPuzzle('gate1Open', wantOpen);
            soundManager.playPressurePlate(wantOpen);
            if (wantOpen) {
              this.callbacks.onCheckpointMessage('🟢 دکمه فشاری فشرده شد (دروازه باز شد)');
            } else {
              if (!this.puzzleState.lever1Activated) {
                this.callbacks.onCheckpointMessage('🔴 دکمه فشاری رها شد (دروازه بسته شد)');
              }
            }
          }
        }

        // Campaign Stages Generic Pressure Plates
        if (obj.id.startsWith('pressure_plate_stage')) {
          const stageNum = this.currentStageId;
          const key = `platePressed_${stageNum}`;
          const currentVal = !!(this.puzzleState.customData && this.puzzleState.customData[key]);
          const wantOpen = isOccupied;
          if (wantOpen !== currentVal) {
            networkClient.triggerPuzzle('customData', { ...this.puzzleState.customData, [key]: wantOpen });
            soundManager.playPressurePlate(wantOpen);
            this.callbacks.onCheckpointMessage(
              wantOpen ? `🟢 دکمه فشاری مرحله ${stageNum} فعال شد!` : `🔴 دکمه فشاری مرحله ${stageNum} آزاد شد.`
            );
          }
        }

        // Stage 5 Anti-gravity Switches
        if (obj.id === 'gravity_switch_1' || obj.id === 'gravity_switch_2') {
          const currentVal = !!(this.puzzleState.customData && this.puzzleState.customData[obj.id]);
          if (isOccupied !== currentVal) {
            networkClient.triggerPuzzle('customData', { ...this.puzzleState.customData, [obj.id]: isOccupied });
            soundManager.playPressurePlate(isOccupied);
          }
        }

        // Stage 4 Part 1 Sync Buttons
        if (obj.id === 'button_sync_1a' || obj.id === 'button_sync_1b') {
          const isA = obj.id === 'button_sync_1a';
          const timeKey = isA ? 'stage4Btn1ATime' : 'stage4Btn1BTime';
          const otherTimeKey = isA ? 'stage4Btn1BTime' : 'stage4Btn1ATime';
          const currentData = this.puzzleState.customData || {};

          if (isOccupied) {
            const nowTime = Date.now();
            const lastTime = currentData[timeKey] || 0;
            if (nowTime - lastTime > 800) {
              soundManager.playPressurePlate(true);
              const otherTime = currentData[otherTimeKey] || 0;
              const isPart1Solved = !!currentData.stage4Part1Solved;
              const isSolo = !networkClient.getRoomCode();
              const allowedWindow = isSolo ? 15000 : 4000;

              let nextPart1Solved = isPart1Solved;
              let msg = isA ? '🟢 دکمه نیوشا فعال شد.' : '🟢 دکمه حسن فعال شد.';

              if (!isPart1Solved && otherTime > 0 && Math.abs(nowTime - otherTime) <= allowedWindow) {
                nextPart1Solved = true;
                soundManager.playCheckpoint();
                msg = '🎉 هماهنگی عالی! هر دو دکمه با موفقیت همزمان فشرده شدند. دروازه اول باز شد!';
              } else if (!isPart1Solved && otherTime > 0 && Math.abs(nowTime - otherTime) > allowedWindow) {
                soundManager.playPuzzleErrorBuzz();
                msg = '⚠️ زمان‌بندی هماهنگ نبود! هر دو دکمه باید با هم‌تیمی فشرده شوند.';
              }

              const nextData = {
                ...currentData,
                [timeKey]: nowTime,
                stage4Part1Solved: nextPart1Solved,
              };
              this.puzzleState.customData = nextData;
              networkClient.triggerPuzzle('customData', nextData);
              this.callbacks.onCheckpointMessage(msg);
            }
          }
        }

        // Stage 4 Part 3 Final Sync Buttons
        if (obj.id === 'button_final_a' || obj.id === 'button_final_b') {
          const isA = obj.id === 'button_final_a';
          const timeKey = isA ? 'stage4FinalBtnATime' : 'stage4FinalBtnBTime';
          const otherTimeKey = isA ? 'stage4FinalBtnBTime' : 'stage4FinalBtnATime';
          const currentData = this.puzzleState.customData || {};
          const currentState = currentData.stage4MainState || 'WAITING';

          if (isOccupied && currentState !== 'SOLVED') {
            const nowTime = Date.now();
            const lastTime = currentData[timeKey] || 0;
            if (nowTime - lastTime > 800) {
              soundManager.playPressurePlate(true);
              const otherTime = currentData[otherTimeKey] || 0;
              const isSolo = !networkClient.getRoomCode();
              const allowedWindow = isSolo ? 15000 : 4000;

              let nextState = currentState;
              let msg = isA ? '🟢 رزوناتور خورشیدی نیوشا فعال شد.' : '🟢 رزوناتور خورشیدی حسن فعال شد.';

              if (otherTime > 0 && Math.abs(nowTime - otherTime) <= allowedWindow) {
                nextState = 'SOLVED';
                soundManager.playPuzzleSuccessChime();
                msg = '☀️ هماهنگی نهایی کامل شد! رزوناتور خورشیدی رخ داد و دروازه خروج باز شد!';
              } else if (otherTime > 0 && Math.abs(nowTime - otherTime) > allowedWindow) {
                soundManager.playPuzzleErrorBuzz();
                msg = '⚠️ هماهنگی نهایی ناموفق! هر دو کلید رزوناتور خورشیدی باید هماهنگ فشرده شوند.';
              }

              const isSolvedNow = nextState === 'SOLVED';
              const nextData = {
                ...currentData,
                [timeKey]: nowTime,
                stage4MainState: nextState,
                ...(isSolvedNow ? { solarResonator1: true, solarResonator2: true } : {}),
              };

              if (isSolvedNow) {
                this.puzzleState.solarResonator1 = true;
                this.puzzleState.solarResonator2 = true;
                networkClient.triggerPuzzle('solarResonator1', true);
                networkClient.triggerPuzzle('solarResonator2', true);
              }

              this.puzzleState.customData = nextData;
              networkClient.triggerPuzzle('customData', nextData);
              this.callbacks.onCheckpointMessage(msg);
            }
          }
        }

        // Stage 4 Exit Portal Pads
        if (obj.id === 'portal_p1_stage4' || obj.id === 'portal_p2_stage4') {
          const isP1 = obj.id === 'portal_p1_stage4';
          const readyKey = isP1 ? 'stage4ExitP1Ready' : 'stage4ExitP2Ready';
          const otherReadyKey = isP1 ? 'stage4ExitP2Ready' : 'stage4ExitP1Ready';
          const currentData = this.puzzleState.customData || {};
          const currentReady = !!currentData[readyKey];

          if (isOccupied !== currentReady) {
            const otherReady = !!currentData[otherReadyKey];
            const nextData = {
              ...currentData,
              [readyKey]: isOccupied,
            };
            this.puzzleState.customData = nextData;
            networkClient.triggerPuzzle('customData', nextData);

            if (isOccupied) {
              soundManager.playPressurePlate(true);
              if (otherReady || isSolo) {
                soundManager.playStageClear();
                this.callbacks.onStageClear(this.currentStageId);
                this.callbacks.onCheckpointMessage('🏆 تبریک! مرحله ۴ (تالار هماهنگی) با موفقیت به پایان رسید!');
              } else {
                this.callbacks.onCheckpointMessage(`✨ ${isP1 ? 'نیوشا' : 'حسن'} روی سکوی خروج مستقر شد. منتظر هم‌تیمی باشید...`);
              }
            }
          }
        }

        // Stage 5 Exit Portal Pads
        if (obj.id === 'portal_p1_stage5' || obj.id === 'portal_p2_stage5') {
          const isP1 = obj.id === 'portal_p1_stage5';
          const readyKey = isP1 ? 'stage5ExitP1Ready' : 'stage5ExitP2Ready';
          const otherReadyKey = isP1 ? 'stage5ExitP2Ready' : 'stage5ExitP1Ready';
          const currentData = this.puzzleState.customData || {};
          const currentReady = !!currentData[readyKey];

          if (isOccupied !== currentReady) {
            const otherReady = !!currentData[otherReadyKey];
            const nextData = {
              ...currentData,
              [readyKey]: isOccupied,
            };
            this.puzzleState.customData = nextData;
            networkClient.triggerPuzzle('customData', nextData);

            if (isOccupied) {
              soundManager.playPressurePlate(true);
              if (otherReady || isSolo) {
                soundManager.playStageClear();
                this.callbacks.onStageClear(this.currentStageId);
                this.callbacks.onCheckpointMessage('🏆 تبریک! مرحله ۵ (پل‌های گم‌شده) با موفقیت به پایان رسید!');
              } else {
                this.callbacks.onCheckpointMessage(`✨ ${isP1 ? 'نیوشا' : 'حسن'} روی سکوی خروج مستقر شد. منتظر هم‌تیمی باشید...`);
              }
            }
          }
        }

        // Stage 6 Final Hall Buttons (Permanent Unlock when both pressed)
        if (obj.id === 'plate_stage6_final_a' || obj.id === 'plate_stage6_final_b') {
          const isA = obj.id === 'plate_stage6_final_a';
          const key = isA ? 'stage6FinalAOccupied' : 'stage6FinalBOccupied';
          const otherKey = isA ? 'stage6FinalBOccupied' : 'stage6FinalAOccupied';
          const currentData = this.puzzleState.customData || {};
          const currentOccupied = !!currentData[key];

          if (isOccupied !== currentOccupied) {
            const otherOccupied = !!currentData[otherKey];
            const isAlreadyUnlocked = !!currentData.stage6FinalUnlocked;
            const willUnlock = !isAlreadyUnlocked && (isOccupied && (otherOccupied || isSolo));

            const nextData = {
              ...currentData,
              [key]: isOccupied,
              stage6FinalUnlocked: isAlreadyUnlocked || willUnlock,
            };
            this.puzzleState.customData = nextData;
            networkClient.triggerPuzzle('customData', nextData);

            if (isOccupied) {
              soundManager.playPressurePlate(true);
              if (willUnlock) {
                soundManager.playGateMove();
                soundManager.playPuzzleSuccessChime();
                this.callbacks.onCheckpointMessage('🎉 هر دو دکمه نهایی هم‌زمان فعال شدند! دروازه خروج معبد برای همیشه باز گردید.');
              } else if (!isAlreadyUnlocked) {
                this.callbacks.onCheckpointMessage('✨ دکمه نهایی فعال شد. هم‌تیمی شما باید دکمه سمت دیگر را بفشارد...');
              }
            }
          }
        }

        // Stage 6 Path Assignment Trigger Plates
        if (obj.id === 'plate_stage6_trigger_a' || obj.id === 'plate_stage6_trigger_b') {
          const isPathA = obj.id === 'plate_stage6_trigger_a';
          const assignKey = isPathA ? 'stage6AssignedA' : 'stage6AssignedB';
          const currentData = this.puzzleState.customData || {};

          if (isOccupied && !currentData[assignKey]) {
            soundManager.playPressurePlate(true);
            const nextData = {
              ...currentData,
              [assignKey]: true,
            };
            this.puzzleState.customData = nextData;
            networkClient.triggerPuzzle('customData', nextData);
            this.callbacks.onCheckpointMessage(
              isPathA
                ? '📍 مسیر A (Path A) انتخاب شد. هم‌تیمی شما باید وارد مسیر B شود.'
                : '📍 مسیر B (Path B) انتخاب شد. هم‌تیمی شما باید وارد مسیر A شود.'
            );
          }
        }

        // Stage 6 Exit Portal Pads
        if (obj.id === 'portal_p1_stage6' || obj.id === 'portal_p2_stage6') {
          const isP1 = obj.id === 'portal_p1_stage6';
          const readyKey = isP1 ? 'stage6ExitP1Ready' : 'stage6ExitP2Ready';
          const otherReadyKey = isP1 ? 'stage6ExitP2Ready' : 'stage6ExitP1Ready';
          const currentData = this.puzzleState.customData || {};
          const currentReady = !!currentData[readyKey];

          if (isOccupied !== currentReady) {
            const otherReady = !!currentData[otherReadyKey];
            const nextData = {
              ...currentData,
              [readyKey]: isOccupied,
            };
            this.puzzleState.customData = nextData;
            networkClient.triggerPuzzle('customData', nextData);

            if (isOccupied) {
              soundManager.playPressurePlate(true);
              if (otherReady || isSolo) {
                soundManager.playStageClear();
                this.callbacks.onStageClear(this.currentStageId);
                this.callbacks.onCheckpointMessage('🏆 تبریک! مرحله ۶ (معبد دو مسیر) با موفقیت به پایان رسید!');
              } else {
                this.callbacks.onCheckpointMessage(`✨ ${isP1 ? 'نیوشا' : 'حسن'} روی سکوی خروج معبد دو مسیر مستقر شد. منتظر هم‌تیمی باشید...`);
              }
            }
          }
        }

        // Stage 7 Path Assignment Trigger Plates
        if (obj.id === 'plate_stage7_trigger_a' || obj.id === 'plate_stage7_trigger_b') {
          const isPathA = obj.id === 'plate_stage7_trigger_a';
          // Stepping on Plate A opens Gate B (neighboring room for teammate), stepping on Plate B opens Gate A
          const assignKey = isPathA ? 'stage7AssignedB' : 'stage7AssignedA';
          const currentData = this.puzzleState.customData || {};

          if (isOccupied && !currentData[assignKey]) {
            soundManager.playPressurePlate(true);
            const nextData = {
              ...currentData,
              [assignKey]: true,
            };
            this.puzzleState.customData = nextData;
            networkClient.triggerPuzzle('customData', nextData);
            this.callbacks.onCheckpointMessage(
              isPathA
                ? '🚪 صفحه ورودی ۱ فشرده شد! درگاه ورودی اتاق ۲ (اتاق بغلی هم‌تیمی) باز گردید.'
                : '🚪 صفحه ورودی ۲ فشرده شد! درگاه ورودی اتاق ۱ (اتاق بغلی هم‌تیمی) باز گردید.'
            );
          }
        }

        // Stage 7 Exit Portal Pads
        if (obj.id === 'portal_p1_stage7' || obj.id === 'portal_p2_stage7') {
          const isP1 = obj.id === 'portal_p1_stage7';
          const readyKey = isP1 ? 'stage7ExitP1Ready' : 'stage7ExitP2Ready';
          const otherReadyKey = isP1 ? 'stage7ExitP2Ready' : 'stage7ExitP1Ready';
          const currentData = this.puzzleState.customData || {};
          const currentReady = !!currentData[readyKey];

          if (isOccupied !== currentReady) {
            const otherReady = !!currentData[otherReadyKey];
            const nextData = {
              ...currentData,
              [readyKey]: isOccupied,
            };
            this.puzzleState.customData = nextData;
            networkClient.triggerPuzzle('customData', nextData);

            if (isOccupied) {
              soundManager.playPressurePlate(true);
              if (otherReady || isSolo) {
                soundManager.playStageClear();
                this.callbacks.onStageClear(this.currentStageId);
                this.callbacks.onCheckpointMessage('🏆 تبریک! مرحله ۷ (معمای چهار اتاق) با موفقیت به پایان رسید!');
              } else {
                this.callbacks.onCheckpointMessage(`✨ ${isP1 ? 'نیوشا' : 'حسن'} روی سکوی خروج معمای چهار اتاق مستقر شد. منتظر هم‌تیمی باشید...`);
              }
            }
          }
        }

        // Stage 8 Section 1 Entry Plates (Co-op Open)
        if (obj.id === 'plate_stage8_entry_a' || obj.id === 'plate_stage8_entry_b') {
          const isPlateA = obj.id === 'plate_stage8_entry_a';
          const key = isPlateA ? 'stage8EntryA' : 'stage8EntryB';
          const otherKey = isPlateA ? 'stage8EntryB' : 'stage8EntryA';
          const currentData = this.puzzleState.customData || {};

          if (!currentData.stage8EntryUnlocked && isOccupied !== !!currentData[key]) {
            const otherPressed = !!currentData[otherKey];
            const shouldUnlock = isOccupied && (otherPressed || isSolo);
            const nextData = {
              ...currentData,
              [key]: isOccupied,
              ...(shouldUnlock ? { stage8EntryUnlocked: true } : {}),
            };
            this.puzzleState.customData = nextData;
            networkClient.triggerPuzzle('customData', nextData);

            if (isOccupied) {
              soundManager.playPressurePlate(true);
              if (shouldUnlock) {
                soundManager.playGateMove();
                soundManager.playPuzzleSuccessChime();
                this.callbacks.onCheckpointMessage('🎉 دروازه باستانی ورودی فینال گشوده شد! هر دو قهرمان می‌توانید وارد شوید.');
              } else {
                this.callbacks.onCheckpointMessage(`🟢 ${isPlateA ? 'نیوشا' : 'حسن'} روی صفحه ورودی ایستاد. هم‌تیمی باید روی صفحه دیگر بایستد...`);
              }
            }
          }
        }

        // Stage 8 Section 2 Path Assignment Trigger Plates
        if (obj.id === 'plate_stage8_assign_a' || obj.id === 'plate_stage8_assign_b') {
          const isPathA = obj.id === 'plate_stage8_assign_a';
          const assignKey = isPathA ? 'stage8AssignedA' : 'stage8AssignedB';
          const currentData = this.puzzleState.customData || {};

          if (isOccupied && !currentData[assignKey]) {
            soundManager.playPressurePlate(true);
            const nextData = {
              ...currentData,
              [assignKey]: true,
            };
            this.puzzleState.customData = nextData;
            networkClient.triggerPuzzle('customData', nextData);
            this.callbacks.onCheckpointMessage(
              isPathA
                ? '📍 وارد مسیر A شدید. کتیبه این دیوار راهنمای مسیر B هم‌تیمی شماست!'
                : '📍 وارد مسیر B شدید. کتیبه این دیوار راهنمای مسیر A هم‌تیمی شماست!'
            );
          }
        }

        // Stage 8 Section 4 Sanctuary Co-op Plates
        if (obj.id === 'plate_stage8_sanctuary_a' || obj.id === 'plate_stage8_sanctuary_b') {
          const isPlateA = obj.id === 'plate_stage8_sanctuary_a';
          const key = isPlateA ? 'stage8SancA' : 'stage8SancB';
          const otherKey = isPlateA ? 'stage8SancB' : 'stage8SancA';
          const currentData = this.puzzleState.customData || {};

          if (!currentData.stage8SanctuaryUnlocked && isOccupied !== !!currentData[key]) {
            const otherPressed = !!currentData[otherKey];
            const shouldUnlock = isOccupied && (otherPressed || isSolo);
            const nextData = {
              ...currentData,
              [key]: isOccupied,
              ...(shouldUnlock ? { stage8SanctuaryUnlocked: true } : {}),
            };
            this.puzzleState.customData = nextData;
            networkClient.triggerPuzzle('customData', nextData);

            if (isOccupied) {
              soundManager.playPressurePlate(true);
              if (shouldUnlock) {
                soundManager.playGateMove();
                soundManager.playPuzzleSuccessChime();
                this.callbacks.onCheckpointMessage('✨ دروازه محراب ابدیت برای همیشه گشوده شد! به سوی جایگاه نهایی قدم بردارید.');
              } else {
                this.callbacks.onCheckpointMessage(`🟢 ${isPlateA ? 'نیوشا' : 'حسن'} روی صفحه پیوند محراب ایستاد. منتظر هم‌تیمی...`);
              }
            }
          }
        }

        // Stage 8 Section 5 Exit / Finale Zone Pads
        if (obj.id === 'portal_p1_stage8' || obj.id === 'portal_p2_stage8') {
          const isP1 = obj.id === 'portal_p1_stage8';
          const readyKey = isP1 ? 'stage8ExitP1Ready' : 'stage8ExitP2Ready';
          const otherReadyKey = isP1 ? 'stage8ExitP2Ready' : 'stage8ExitP1Ready';
          const currentData = this.puzzleState.customData || {};
          const currentReady = !!currentData[readyKey];

          if (isOccupied !== currentReady) {
            const otherReady = !!currentData[otherReadyKey];
            const nextData = {
              ...currentData,
              [readyKey]: isOccupied,
            };
            this.puzzleState.customData = nextData;
            networkClient.triggerPuzzle('customData', nextData);

            if (isOccupied) {
              soundManager.playPressurePlate(true);
              if (otherReady || isSolo) {
                soundManager.playStageClear();
                this.callbacks.onStageClear(this.currentStageId);
                this.callbacks.onCheckpointMessage('❤️ تبریک بی‌کران! داستان حسن و نیوشا به سرانجام رسید — محراب ابدیت فتح شد!');
              } else {
                this.callbacks.onCheckpointMessage(`💖 ${isP1 ? 'نیوشا' : 'حسن'} در جایگاه پایانی محراب قرار گرفت. منتظر هم‌تیمی...`);
              }
            }
          }
        }
      }
    }

    // 3. Prompting & E-key Interaction Handling
    let nearestPrompt: string | null = null;
    let minPromptDist = 999;
    let closestInteractiveObj: InteractiveObject | null = null;
    const wantsInteract = this.keys['KeyE'] || this.touchInteract;

    for (const obj of this.currentStage.interactiveObjects) {
      const dist = obj.bounds.distanceToPoint(this.playerPos);

      if (dist < 3.2) {
        // Role filter
        if (obj.targetRole && obj.targetRole !== 'both' && obj.targetRole !== this.localRole) {
          continue;
        }

        if (dist < minPromptDist) {
          minPromptDist = dist;
          nearestPrompt = obj.prompt;
          closestInteractiveObj = obj;
        }
      }
    }

    // Discrete E-key interaction on the SINGLE CLOSEST object
    if (wantsInteract && this.interactCooldown <= 0 && closestInteractiveObj) {
      const obj = closestInteractiveObj;
      // Ancient Story Lore Tablets
      if (obj.id.startsWith('story_tablet_') || obj.id.startsWith('tablet_')) {
        soundManager.playCheckpoint();
        const loreTexts: Record<string, string> = {
          story_tablet_stage1: '📜 کتیبه اولین همکاری: «یکی روی دکمه فشاری بایستد تا دروازه باز شود، نفر دوم از دروازه عبور کند و اهرم پشت دروازه را بکشد تا مسیر برای همیشه باز بماند.»',
          story_tablet_stage2: '📜 کتیبه دره و پل متحرک: «همکاری رفت و برگشتی! ابتدا با اهرم اول، سکوی معلق را برای عبور به کار بیندازید. سپس یکی وارد مسیر A و دیگری مسیر B شود؛ بازیکن مسیر A بالابر را برای بازیکن B می‌فرستد و بازیکن B از بالای برج، پل مسیر A را می‌گشاید.»',
          story_tablet_stage3: '📜 کتیبه اتاق‌های آینه‌ای: «هر بازیکن فقط ترتیب نمادهای اتاق دیگر را در آینه خود می‌بیند. تنها با گفت‌وگو، راهنمایی کلامی و فعال‌سازی نوبتی نمادهای خورشید، ماه، ستاره و موج می‌توانید دروازه خروج را بگشایید.»',
          story_tablet_stage4: '📜 کتیبه تالار هماهنگی: «اهرم‌ها و چرخ‌دنده‌ها تنها با همیاری دو قهرمان به حرکت درمی‌آیند. در بخش اول، دکمه‌ها را هم‌زمان بفشارید. در بخش دوم، راه‌ها را متقابلاً بگشایید و در آزمون نهایی، سکوها را برای یکدیگر به حرکت درآورید.»',
          story_tablet_stage5: '📜 کتیبه پل‌های گم‌شده: «از فراز برج دیده‌بانی، فانوس‌های باستانی مسیر امن را بر سکوهای دره روشن می‌سازند. با راهنمایی از بالای برج، از پل‌های ناپایدار گذشته و اهرم‌های دوطرفه را برای پیوستن دوباره بگشایید.»',
          tablet_watchtower: '🔎 راهنمای برج دیده‌بانی: فانوس‌های آبی و نمادهای درخشان فقط از این بالا دیده می‌شوند! پل اول: سمت راست | پل دوم: سمت چپ (متحرک) | پل سوم: وسط (زمان‌دار)',
          story_tablet_stage6: '📜 کتیبه معبد دو مسیر: «راه شما دو شاخه می‌شود. ترتیب نمادهای هر مسیر بر دیوار مسیر مقابل حک شده است. با گفت‌وگو رمز هم‌تیمی را بگوئید تا اهرم‌های متقابل فعال شوند و راه خروج باز شود.»',
          story_tablet_stage7: '📜 کتیبه معمای چهار اتاق: «در این معبد چوبی، کلیدهای هر اتاق بر دیوارهای اتاق مقابل حک شده است. با گفت‌وگو راز هم‌تیمی را بازگو کرده و مسیرهای یکدیگر را هموار سازید.»',
          tablet_stage7_clue1: '📜 کتیبه دیوار اتاق ۱: «راهنمای پازل اتاق ۲ (هم‌تیمی شما): ۱. ماه 🌙 ← ۲. قلب ❤️ ← ۳. ستاره ⭐»',
          tablet_stage7_clue2: '📜 کتیبه دیوار اتاق ۲: «راهنمای پازل اتاق ۱ (هم‌تیمی شما): ۱. قلب ❤️ ← ۲. خورشید ☀️ ← ۳. ماه 🌙»',
          tablet_stage7_clue3: '📜 کتیبه دیوار اتاق ۳: «ترتیب اهرم‌های عناصر: ۱. قطره آب 💧 ← ۲. برگ 🍃 ← ۳. شعله آتش 🔥»',
          tablet_stage7_final_hint: '📜 راهنمای تالار نهایی: «ترتیب دکمه‌های نهایی: ۱. خورشید ☀️ ← ۲. ماه 🌙 ← ۳. ستاره ⭐ ← ۴. قلب ❤️»',
          story_tablet_stage8_start: '📜 کتیبه آغازین فینال: «این آخرین آزمون ماست. ما همه‌ی مسیر رو کنار هم نیومدیم، اما در این معبد باستانی، تنها با کمک یکدیگر می‌توانیم به محراب ابدیت برسیم.»',
          tablet_stage8_clue_for_b: '📜 کتیبه دیوار مسیر A: «راهنمای پازل مسیر B (هم‌تیمی شما): ۱. خورشید ☀️ ← ۲. گل سرخ 🌸 ← ۳. شعله آتش 🔥»',
          tablet_stage8_clue_for_a: '📜 کتیبه دیوار مسیر B: «راهنمای پازل مسیر A (هم‌تیمی شما): ۱. ستاره ⭐ ← ۲. ماه 🌙 ← ۳. قلب ❤️»',
          tablet_stage8_chamber_a_hint: '📜 کتیبه باستانی اتاق A: «ترتیب نهایی رمزگشایی: ۳ ← ۱ ← ۴ ← ۲ (نماد مربوط به کد ۳، سپس ۱، سپس ۴ و در نهایت ۲)»',
          tablet_stage8_chamber_b_hint: '📜 کتیبه رمزگشای اتاق B: «۱ = قلب ❤️ | ۲ = ستاره ⭐ | ۳ = ماه 🌙 | ۴ = خورشید ☀️»',
        };
            this.callbacks.onCheckpointMessage(loreTexts[obj.id] || `📜 کتیبه راز باستانی مرحله ${this.currentStageId}`);
            this.interactCooldown = 0.5;
          }

          // Lever 1 (Stage 1 Permanent Unlock)
          if (obj.id === 'lever_1') {
            if (!this.puzzleState.lever1Activated) {
              networkClient.triggerPuzzle('lever1Activated', true);
              soundManager.playGateMove();
              soundManager.playInteract();
              this.callbacks.onCheckpointMessage('🎉 اهرم با موفقیت کشیده شد! دروازه برای همیشه باز شد. اکنون هر دو نفر می‌توانید عبور کنید.');
            } else {
              this.callbacks.onCheckpointMessage('دروازه قبلاً برای همیشه باز شده است.');
            }
            this.interactCooldown = 0.5;
          }

          // Heavy Block Placement / Toggle
          if (obj.id === 'heavy_block_1') {
            const nextVal = !this.puzzleState.heavyBlockPlaced;
            networkClient.triggerPuzzle('heavyBlockPlaced', nextVal);
            soundManager.playInteract();
            if (nextVal) soundManager.playPressurePlate(true);
            this.callbacks.onCheckpointMessage(nextVal ? '⚡ مکعب رسانا روی پدستال مستقر شد! بالابر آبی فعال گردید.' : 'مکعب از روی پدستال آزاد شد.');
            this.interactCooldown = 0.35;
          }

          // Elevator Call Buttons
          if (obj.id === 'elevator_call_bottom' || obj.id === 'elevator_call_top') {
            soundManager.playInteract();
            const isStandingOnElevator = Math.abs(this.playerPos.x) < 2.5 && Math.abs(this.playerPos.z - 33) < 2.5;

            if (obj.id === 'elevator_call_bottom') {
              if (!this.puzzleState.heavyBlockPlaced) {
                if (isStandingOnElevator) {
                  this.callbacks.onCheckpointMessage('❌ شما روی بالابر ایستاده‌اید! نمی‌توانید خودتان را با دکمه همکف بالا بفرستید.');
                } else {
                  // If not on it, allow sending it up to someone on top
                  networkClient.triggerPuzzle('heavyBlockPlaced', true);
                  soundManager.playPressurePlate(true);
                  this.callbacks.onCheckpointMessage('⚡ بالابر به طبقه بالا فرستاده شد.');
                }
              } else {
                // Elevator is at the top. Bring it down!
                networkClient.triggerPuzzle('heavyBlockPlaced', false);
                this.callbacks.onCheckpointMessage('⚡ بالابر به طبقه پایین فراخوانده شد.');
              }
            } else { // elevator_call_top
              if (!this.puzzleState.heavyBlockPlaced) {
                // Elevator is at the bottom. Bring it up!
                networkClient.triggerPuzzle('heavyBlockPlaced', true);
                soundManager.playPressurePlate(true);
                this.callbacks.onCheckpointMessage('⚡ بالابر به طبقه بالا فراخوانده شد.');
              } else {
                // Elevator is at the top. Send it down!
                networkClient.triggerPuzzle('heavyBlockPlaced', false);
                this.callbacks.onCheckpointMessage('⚡ بالابر به طبقه پایین فرستاده شد.');
              }
            }
            this.interactCooldown = 0.35;
          }

          // Permanent Bridge Anchor Toggle
          if (obj.id === 'explorer_bridge_anchor') {
            const nextVal = !this.puzzleState.bridgePedestalRotated;
            networkClient.triggerPuzzle('bridgePedestalRotated', nextVal);
            soundManager.playGateMove();
            this.callbacks.onCheckpointMessage(nextVal ? 'پل سنگی باستانی مستقر شد!' : 'پل سنگی جمع شد.');
            this.interactCooldown = 0.35;
          }

          // Stage 2 Lever 1 (Moving Platform 1 Across First Gorge)
          if (obj.id === 'lever_stage2_platform1' || obj.id === 'lever_stage2_platform1_return' || obj.id === 'crank_island_bridge') {
            const curr = !!(this.puzzleState.floatingIslandBridgeActive || (this.puzzleState.customData && this.puzzleState.customData.stage2Platform1Active));
            const nextVal = !curr;
            networkClient.triggerPuzzle('floatingIslandBridgeActive', nextVal);
            networkClient.triggerPuzzle('customData', { ...this.puzzleState.customData, stage2Platform1Active: nextVal });
            soundManager.playGateMove();
            soundManager.playInteract();
            this.callbacks.onCheckpointMessage(nextVal ? '⚙️ سکوی متحرک اول به سمت سکوی میانی حرکت کرد.' : '⚙️ سکوی متحرک اول به سمت نقطه شروع بازگشت.');
            this.interactCooldown = 0.5;
          }

          // Stage 2 Lever A (Path A -> Ascends Platform 2 for Path B)
          if (obj.id === 'lever_stage2_pathA') {
            const curr = !!(this.puzzleState.laserTurretDisabled || (this.puzzleState.customData && this.puzzleState.customData.stage2LeverA));
            const nextVal = !curr;
            networkClient.triggerPuzzle('laserTurretDisabled', nextVal);
            networkClient.triggerPuzzle('customData', { ...this.puzzleState.customData, stage2LeverA: nextVal });
            soundManager.playGateMove();
            soundManager.playInteract();
            this.callbacks.onCheckpointMessage(nextVal ? '⚙️ اهرم مسیر A فعال شد! بالابر عمودی به سمت مسیر B حرکت کرد.' : 'اهرم مسیر A به حالت اولیه بازگشت.');
            this.interactCooldown = 0.5;
          }

          // Stage 2 Lever B (Path B Upper Tower -> Lowers Drawbridge A)
          if (obj.id === 'lever_stage2_pathB') {
            const curr = !!(this.puzzleState.vortexActivated || (this.puzzleState.customData && this.puzzleState.customData.stage2LeverB));
            const nextVal = !curr;
            networkClient.triggerPuzzle('vortexActivated', nextVal);
            networkClient.triggerPuzzle('customData', { ...this.puzzleState.customData, stage2LeverB: nextVal });
            soundManager.playGateMove();
            soundManager.playInteract();
            this.callbacks.onCheckpointMessage(nextVal ? '🎉 اهرم برج B کشیده شد! پل چوبی مسیر A پایین آمد و مسیر باز شد.' : 'پل چوبی مسیر A بالا رفت.');
            this.interactCooldown = 0.5;
          }

          // Stage 3 Mirror Chambers: Symbol Pedestals (Room A & Room B)
          if (obj.id.startsWith('stage3_roomA_symbol_') || obj.id.startsWith('stage3_roomB_symbol_')) {
            const isRoomA = obj.id.startsWith('stage3_roomA_symbol_');
            const symbolId = parseInt(obj.id.split('_').pop() || '0', 10);
            const symDef = SACRED_SYMBOLS[symbolId] || SACRED_SYMBOLS[0];

            const seed = (this.puzzleState.customData && typeof this.puzzleState.customData.stage3Seed === 'number')
              ? this.puzzleState.customData.stage3Seed
              : 77;
            const { sequenceTargetA, sequenceTargetB } = getStage3Sequences(seed);

            const isLocked = !!(this.puzzleState.customData && this.puzzleState.customData.stage3Locked);
            const isSolo = this.soloDuoMode || !networkClient.getRoomCode();

            // Guard: Must have both players in rooms (or in solo mode, allow solving directly)
            if (!isLocked && !isSolo) {
              this.callbacks.onCheckpointMessage('⚠️ ابتدا باید هر دو بازیکن وارد اتاق‌های A و B شوند تا پازل فعال گردد.');
              this.interactCooldown = 0.5;
            } else {
              const solvedKey = isRoomA ? 'stage3SolvedA' : 'stage3SolvedB';
              const seqKey = isRoomA ? 'stage3SeqA' : 'stage3SeqB';
              const targetSeq = isRoomA ? sequenceTargetA : sequenceTargetB;
              const roomName = isRoomA ? 'A' : 'B';
              const otherRoomName = isRoomA ? 'B' : 'A';

              const isAlreadySolved = !!(this.puzzleState.customData && this.puzzleState.customData[solvedKey]);
              if (isAlreadySolved) {
                this.callbacks.onCheckpointMessage(`✨ پازل اتاق ${roomName} قبلاً با موفقیت حل شده است.`);
                this.interactCooldown = 0.35;
              } else {
                const currentSeq: number[] = (this.puzzleState.customData && Array.isArray(this.puzzleState.customData[seqKey]))
                  ? [...this.puzzleState.customData[seqKey]]
                  : [];

                if (currentSeq.includes(symbolId)) {
                  this.callbacks.onCheckpointMessage(`نماد ${symDef.icon} ${symDef.persianName} قبلاً در این دور فشرده شده است.`);
                  this.interactCooldown = 0.35;
                } else {
                  const expectedSymbol = targetSeq[currentSeq.length];

                  if (symbolId === expectedSymbol) {
                    // Correct step!
                    const newSeq = [...currentSeq, symbolId];
                    soundManager.playSymbolChime(currentSeq.length);

                    if (newSeq.length === 4) {
                      // Solved this room!
                      soundManager.playPuzzleSuccessChime();
                      const otherSolved = isRoomA
                        ? !!(this.puzzleState.customData && this.puzzleState.customData.stage3SolvedB)
                        : !!(this.puzzleState.customData && this.puzzleState.customData.stage3SolvedA);
                      const exitUnlocked = otherSolved;

                      const nextCustom = {
                        ...this.puzzleState.customData,
                        [seqKey]: newSeq,
                        [solvedKey]: true,
                        stage3ExitUnlocked: exitUnlocked,
                      };
                      this.puzzleState.customData = nextCustom;
                      networkClient.triggerPuzzle('customData', nextCustom);

                      if (exitUnlocked) {
                        soundManager.playGateMove();
                        this.callbacks.onCheckpointMessage(`🎉 هر دو اتاق آینه‌ای کامل شدند! دروازه‌های خروج به تالار اعظم گشوده شدند!`);
                      } else {
                        this.callbacks.onCheckpointMessage(`✨ پازل اتاق ${roomName} با موفقیت حل شد! منتظر حل اتاق ${otherRoomName} باشید...`);
                      }
                    } else {
                      const nextCustom = {
                        ...this.puzzleState.customData,
                        [seqKey]: newSeq,
                      };
                      this.puzzleState.customData = nextCustom;
                      networkClient.triggerPuzzle('customData', nextCustom);
                      this.callbacks.onCheckpointMessage(`✨ نماد ${symDef.icon} ${symDef.persianName} درست بود! (${newSeq.length}/4)`);
                    }
                    this.interactCooldown = 0.4;
                  } else {
                    // Wrong step! Reset this room sequence
                    soundManager.playPuzzleErrorBuzz();
                    const nextCustom = {
                      ...this.puzzleState.customData,
                      [seqKey]: [],
                    };
                    this.puzzleState.customData = nextCustom;
                    networkClient.triggerPuzzle('customData', nextCustom);
                    this.callbacks.onCheckpointMessage(`❌ نماد اشتباه! ترتیب اتاق ${roomName} ریست شد. به راهنمای روی آینه اتاق ${otherRoomName} گوش بده!`);
                    this.interactCooldown = 0.5;
                  }
                }
              }
            }
          }

          // Stage 4 Dual Path Levers (Part 2)
          if (obj.id === 'lever_dual_a') {
            soundManager.playGateMove();
            soundManager.playInteract();
            const nextCustom = {
              ...this.puzzleState.customData,
              stage4TimedDoorBTimer: 7.0,
            };
            this.puzzleState.customData = nextCustom;
            networkClient.triggerPuzzle('customData', nextCustom);
            this.callbacks.onCheckpointMessage('⏱️ اهرم مسیر A کشیده شد! دروازه زمان‌دار مسیر B به مدت ۷ ثانیه باز شد.');
            this.interactCooldown = 0.5;
          }

          if (obj.id === 'lever_dual_b') {
            soundManager.playGateMove();
            soundManager.playInteract();
            const nextCustom = {
              ...this.puzzleState.customData,
              stage4TimedDoorATimer: 7.0,
            };
            this.puzzleState.customData = nextCustom;
            networkClient.triggerPuzzle('customData', nextCustom);
            this.callbacks.onCheckpointMessage('⏱️ اهرم مسیر B کشیده شد! دروازه زمان‌دار مسیر A به مدت ۷ ثانیه باز شد.');
            this.interactCooldown = 0.5;
          }

          // Stage 4 Main Harmony Levers (Part 3)
          if (obj.id === 'lever_main_a') {
            const currentState = this.puzzleState.customData?.stage4MainState || 'WAITING';
            if (currentState === 'WAITING') {
              soundManager.playGateMove();
              soundManager.playInteract();
              const nextCustom = {
                ...this.puzzleState.customData,
                stage4MainState: 'A_HELPING_B',
              };
              this.puzzleState.customData = nextCustom;
              networkClient.triggerPuzzle('customData', nextCustom);
              this.callbacks.onCheckpointMessage('⚙️ اهرم سمت چپ کشیده شد! سکوی متحرک سمت راست برای انتقال هم‌تیمی حرکت کرد.');
            } else {
              this.callbacks.onCheckpointMessage('سکوی هم‌تیمی قبلاً جابه‌جا شده است.');
            }
            this.interactCooldown = 0.5;
          }

          if (obj.id === 'lever_main_b') {
            const currentState = this.puzzleState.customData?.stage4MainState || 'WAITING';
            if (currentState === 'A_HELPING_B' || currentState === 'B_CROSSED') {
              soundManager.playGateMove();
              soundManager.playInteract();
              const nextCustom = {
                ...this.puzzleState.customData,
                stage4MainState: 'B_HELPING_A',
              };
              this.puzzleState.customData = nextCustom;
              networkClient.triggerPuzzle('customData', nextCustom);
              this.callbacks.onCheckpointMessage('⚙️ اهرم سمت راست کشیده شد! سکوی متحرک سمت چپ برای انتقال هم‌تیمی حرکت کرد.');
            } else if (currentState === 'WAITING') {
              this.callbacks.onCheckpointMessage('⚠️ ابتدا هم‌تیمی شما باید اهرم اول را بکشد تا شما به این سکو برسید!');
            } else {
              this.callbacks.onCheckpointMessage('سکوی سمت چپ قبلاً جابه‌جا شده است.');
            }
            this.interactCooldown = 0.5;
          }

          // Stage 5 Reverse Lever 1 (Watchtower Drawbridge & Exit Gate)
          if (obj.id === 'lever_stage5_reverse1') {
            soundManager.playGateMove();
            soundManager.playInteract();
            const nextData = {
              ...this.puzzleState.customData,
              stage5WatchtowerBridgeLowered: true,
            };
            this.puzzleState.customData = nextData;
            networkClient.triggerPuzzle('customData', nextData);
            this.callbacks.onCheckpointMessage('🔓 اهرم کشیده شد! پل معلق و دیواره خروجی برج باستانی باز گردید. اکنون بازیکن برج می‌تواند خارج شود.');
            this.interactCooldown = 0.5;
          }

          // Stage 5 Controlled Platform Levers (Independent Platform Toggles)
          if (obj.id === 'lever_stage5_ctrl1' || obj.id === 'lever_stage5_ctrl2' || obj.id === 'lever_stage5_ctrl3') {
            soundManager.playInteract();
            soundManager.playGateMove();
            const targetNum = obj.id === 'lever_stage5_ctrl1' ? 1 : obj.id === 'lever_stage5_ctrl2' ? 2 : 3;
            const key = `stage5P${targetNum}Active`;
            const currentData = this.puzzleState.customData || {};
            const nextVal = !currentData[key];
            const nextData = {
              ...currentData,
              [key]: nextVal,
            };
            this.puzzleState.customData = nextData;
            networkClient.triggerPuzzle('customData', nextData);
            this.callbacks.onCheckpointMessage(
              nextVal
                ? `⚙️ اهرم ${targetNum} فعال شد! سکوی ${targetNum} بالا آمد.`
                : `⚙️ اهرم ${targetNum} غیرفعال شد! سکوی ${targetNum} پایین رفت.`
            );
            this.interactCooldown = 0.5;
          }

          // Stage 5 Reverse Lever 2 (Main Canyon Bridge)
          if (obj.id === 'lever_stage5_reverse2') {
            soundManager.playGateMove();
            soundManager.playInteract();
            const nextData = {
              ...this.puzzleState.customData,
              stage5MainBridgeUnlocked: true,
            };
            this.puzzleState.customData = nextData;
            networkClient.triggerPuzzle('customData', nextData);
            this.callbacks.onCheckpointMessage('✨ اهرم نهایی کشیده شد! پل اصلی دره بزرگ باز شد. هم‌تیمی شما اکنون می‌تواند عبور کند.');
            this.interactCooldown = 0.5;
          }

          // Stage 6 Inscription Tablets
          if (obj.id === 'tablet_hint_pathB') {
            soundManager.playInteract();
            this.callbacks.onCheckpointMessage('📜 کتیبه دیوار مسیر چپ: «راهنمای مسیر راست (هم‌تیمی): ۱. برگ 🍃 ← ۲. شعله 🔥 ← ۳. قطره 💧»');
            this.interactCooldown = 0.5;
          }
          if (obj.id === 'tablet_hint_pathA') {
            soundManager.playInteract();
            this.callbacks.onCheckpointMessage('📜 کتیبه دیوار مسیر راست: «راهنمای مسیر چپ (هم‌تیمی): ۱. خورشید ☀️ ← ۲. ستاره ⭐ ← ۳. ماه 🌙»');
            this.interactCooldown = 0.5;
          }

          // Stage 6 Path A Symbol Buttons (Sun, Moon, Star)
          if (obj.id.startsWith('btn_stage6_a_')) {
            soundManager.playInteract();
            const currentData = this.puzzleState.customData || {};
            if (currentData.stage6PuzzleASolved) {
              this.callbacks.onCheckpointMessage('✨ پازل نمادهای مسیر A قبلاً با موفقیت حل شده است.');
            } else {
              const symbolMap: Record<string, { id: string; label: string }> = {
                btn_stage6_a_sun: { id: 'sun', label: 'خورشید ☀️' },
                btn_stage6_a_moon: { id: 'moon', label: 'ماه 🌙' },
                btn_stage6_a_star: { id: 'star', label: 'ستاره ⭐' },
              };
              const symInfo = symbolMap[obj.id];
              if (symInfo) {
                const targetSeqA = ['sun', 'star', 'moon'];
                const currSeqA: string[] = currentData.stage6SequenceA || [];
                const nextSeqA = [...currSeqA, symInfo.id];

                const isMatchSoFar = nextSeqA.every((val, idx) => val === targetSeqA[idx]);

                if (isMatchSoFar) {
                  if (nextSeqA.length === 3) {
                    soundManager.playPuzzleSuccessChime();
                    soundManager.playGateMove();
                    const nextData = {
                      ...currentData,
                      stage6SequenceA: nextSeqA,
                      stage6PuzzleASolved: true,
                    };
                    this.puzzleState.customData = nextData;
                    networkClient.triggerPuzzle('customData', nextData);
                    this.callbacks.onCheckpointMessage('🎉 ترتیبی عالی! پازل نمادهای مسیر A با موفقیت حل شد. اهرم این مسیر آزاد گردید.');
                  } else {
                    const nextData = { ...currentData, stage6SequenceA: nextSeqA };
                    this.puzzleState.customData = nextData;
                    networkClient.triggerPuzzle('customData', nextData);
                    this.callbacks.onCheckpointMessage(`✅ نماد ${symInfo.label} ثبت شد (${nextSeqA.length}/3). بعدی را بزنید...`);
                  }
                } else {
                  soundManager.playPuzzleErrorBuzz();
                  const nextData = { ...currentData, stage6SequenceA: [] };
                  this.puzzleState.customData = nextData;
                  networkClient.triggerPuzzle('customData', nextData);
                  this.callbacks.onCheckpointMessage('❌ ترتیب نمادهای مسیر A اشتباه بود! راهنمای این مسیر بر روی دیوار مسیر B (هم‌تیمی شما) قرار دارد.');
                }
              }
            }
            this.interactCooldown = 0.4;
          }

          // Stage 6 Path B Symbol Buttons (Leaf, Drop, Flame)
          if (obj.id.startsWith('btn_stage6_b_')) {
            soundManager.playInteract();
            const currentData = this.puzzleState.customData || {};
            if (currentData.stage6PuzzleBSolved) {
              this.callbacks.onCheckpointMessage('✨ پازل نمادهای مسیر B قبلاً با موفقیت حل شده است.');
            } else {
              const symbolMap: Record<string, { id: string; label: string }> = {
                btn_stage6_b_leaf: { id: 'leaf', label: 'برگ 🍃' },
                btn_stage6_b_flame: { id: 'flame', label: 'شعله 🔥' },
                btn_stage6_b_drop: { id: 'drop', label: 'قطره 💧' },
              };
              const symInfo = symbolMap[obj.id];
              if (symInfo) {
                const targetSeqB = ['leaf', 'flame', 'drop'];
                const currSeqB: string[] = currentData.stage6SequenceB || [];
                const nextSeqB = [...currSeqB, symInfo.id];

                const isMatchSoFar = nextSeqB.every((val, idx) => val === targetSeqB[idx]);

                if (isMatchSoFar) {
                  if (nextSeqB.length === 3) {
                    soundManager.playPuzzleSuccessChime();
                    soundManager.playGateMove();
                    const nextData = {
                      ...currentData,
                      stage6SequenceB: nextSeqB,
                      stage6PuzzleBSolved: true,
                    };
                    this.puzzleState.customData = nextData;
                    networkClient.triggerPuzzle('customData', nextData);
                    this.callbacks.onCheckpointMessage('🎉 ترتیبی عالی! پازل نمادهای مسیر B با موفقیت حل شد. اهرم این مسیر آزاد گردید.');
                  } else {
                    const nextData = { ...currentData, stage6SequenceB: nextSeqB };
                    this.puzzleState.customData = nextData;
                    networkClient.triggerPuzzle('customData', nextData);
                    this.callbacks.onCheckpointMessage(`✅ نماد ${symInfo.label} ثبت شد (${nextSeqB.length}/3). بعدی را بزنید...`);
                  }
                } else {
                  soundManager.playPuzzleErrorBuzz();
                  const nextData = { ...currentData, stage6SequenceB: [] };
                  this.puzzleState.customData = nextData;
                  networkClient.triggerPuzzle('customData', nextData);
                  this.callbacks.onCheckpointMessage('❌ ترتیب نمادهای مسیر B اشتباه بود! راهنمای این مسیر بر روی دیوار مسیر A (هم‌تیمی شما) قرار دارد.');
                }
              }
            }
            this.interactCooldown = 0.4;
          }

          // Stage 6 Cross Levers
          if (obj.id === 'lever_stage6_a') {
            soundManager.playInteract();
            const currentData = this.puzzleState.customData || {};
            if (!currentData.stage6PuzzleASolved) {
              soundManager.playPuzzleErrorBuzz();
              this.callbacks.onCheckpointMessage('⚠️ این اهرم قفل است! ابتدا باید پازل نمادهای مسیر A را حل کنید.');
            } else if (currentData.stage6LeverA) {
              this.callbacks.onCheckpointMessage('✨ این اهرم قبلاً فعال شده و فقط درگاه خروج مسیر مقابل (B) را باز کرده است.');
            } else {
              soundManager.playGateMove();
              soundManager.playPuzzleSuccessChime();
              const nextData = {
                ...currentData,
                stage6LeverA: true,
              };
              this.puzzleState.customData = nextData;
              networkClient.triggerPuzzle('customData', nextData);
              this.callbacks.onCheckpointMessage('⚙️ اهرم مسیر A کشیده شد! فقط دروازه خروج مسیر مقابل (مسیر B هم‌تیمی) باز گردید.');
            }
            this.interactCooldown = 0.4;
          }

          if (obj.id === 'lever_stage6_b') {
            soundManager.playInteract();
            const currentData = this.puzzleState.customData || {};
            if (!currentData.stage6PuzzleBSolved) {
              soundManager.playPuzzleErrorBuzz();
              this.callbacks.onCheckpointMessage('⚠️ این اهرم قفل است! ابتدا باید پازل نمادهای مسیر B را حل کنید.');
            } else if (currentData.stage6LeverB) {
              this.callbacks.onCheckpointMessage('✨ این اهرم قبلاً فعال شده و فقط درگاه خروج مسیر مقابل (A) را باز کرده است.');
            } else {
              soundManager.playGateMove();
              soundManager.playPuzzleSuccessChime();
              const nextData = {
                ...currentData,
                stage6LeverB: true,
              };
              this.puzzleState.customData = nextData;
              networkClient.triggerPuzzle('customData', nextData);
              this.callbacks.onCheckpointMessage('⚙️ اهرم مسیر B کشیده شد! فقط دروازه خروج مسیر مقابل (مسیر A هم‌تیمی) باز گردید.');
            }
            this.interactCooldown = 0.4;
          }

          // =========================================================================
          // Stage 7: معمای چهار اتاق Interactive Triggers
          // =========================================================================

          // Stage 7 Tablets & Hints
          if (obj.id === 'story_tablet_stage7') {
            soundManager.playInteract();
            this.callbacks.onCheckpointMessage('📜 کتیبه معمای چهار اتاق: «در این معبد چوبی، کلیدهای هر اتاق بر دیوارهای اتاق مقابل (هم‌تیمی) حک شده است. با گفت‌وگو راز هم‌تیمی را بازگو کرده و مسیرهای یکدیگر را هموار سازید.»');
            this.interactCooldown = 0.5;
          }
          if (obj.id === 'tablet_stage7_clue1') {
            soundManager.playInteract();
            this.callbacks.onCheckpointMessage('📜 کتیبه دیوار اتاق ۱: «راهنمای پازل اتاق ۲ (هم‌تیمی شما): ۱. ماه 🌙 ← ۲. قلب ❤️ ← ۳. ستاره ⭐»');
            this.interactCooldown = 0.5;
          }
          if (obj.id === 'tablet_stage7_clue2') {
            soundManager.playInteract();
            this.callbacks.onCheckpointMessage('📜 کتیبه دیوار اتاق ۲: «راهنمای پازل اتاق ۱ (هم‌تیمی شما): ۱. قلب ❤️ ← ۲. خورشید ☀️ ← ۳. ماه 🌙»');
            this.interactCooldown = 0.5;
          }
          if (obj.id === 'tablet_stage7_clue3') {
            soundManager.playInteract();
            this.callbacks.onCheckpointMessage('📜 کتیبه دیوار اتاق ۳: «ترتیب اهرم‌های عناصر: ۱. قطره آب 💧 ← ۲. برگ 🍃 ← ۳. شعله آتش 🔥»');
            this.interactCooldown = 0.5;
          }
          if (obj.id === 'tablet_stage7_final_hint') {
            soundManager.playInteract();
            this.callbacks.onCheckpointMessage('📜 راهنمای تالار نهایی: «ترتیب دکمه‌های نهایی: ۱. خورشید ☀️ ← ۲. ماه 🌙 ← ۳. ستاره ⭐ ← ۴. قلب ❤️»');
            this.interactCooldown = 0.5;
          }

          // Stage 7 Room 1 Symbol Buttons (Target: Heart ❤️ -> Sun ☀️ -> Moon 🌙)
          if (obj.id.startsWith('btn_stage7_r1_')) {
            soundManager.playInteract();
            const currentData = this.puzzleState.customData || {};
            if (currentData.stage7Room1Solved) {
              this.callbacks.onCheckpointMessage('✨ پازل اتاق ۱ قبلاً با موفقیت حل شده است.');
            } else {
              const symbolMap: Record<string, { id: string; label: string }> = {
                btn_stage7_r1_heart: { id: 'heart', label: 'قلب ❤️' },
                btn_stage7_r1_sun: { id: 'sun', label: 'خورشید ☀️' },
                btn_stage7_r1_moon: { id: 'moon', label: 'ماه 🌙' },
              };
              const symInfo = symbolMap[obj.id];
              if (symInfo) {
                const targetSeqR1 = ['heart', 'sun', 'moon'];
                const currSeqR1: string[] = currentData.stage7SeqR1 || [];
                const nextSeqR1 = [...currSeqR1, symInfo.id];
                const isMatchSoFar = nextSeqR1.every((val, idx) => val === targetSeqR1[idx]);

                if (isMatchSoFar) {
                  if (nextSeqR1.length === 3) {
                    soundManager.playPuzzleSuccessChime();
                    soundManager.playGateMove();
                    const nextData = {
                      ...currentData,
                      stage7SeqR1: nextSeqR1,
                      stage7Room1Solved: true,
                    };
                    this.puzzleState.customData = nextData;
                    networkClient.triggerPuzzle('customData', nextData);
                    this.callbacks.onCheckpointMessage('🎉 پازل اتاق ۱ با موفقیت حل شد! اهرم این اتاق برای باز کردن مسیر هم‌تیمی آزاد گردید.');
                  } else {
                    const nextData = { ...currentData, stage7SeqR1: nextSeqR1 };
                    this.puzzleState.customData = nextData;
                    networkClient.triggerPuzzle('customData', nextData);
                    this.callbacks.onCheckpointMessage(`✅ نماد ${symInfo.label} ثبت شد (${nextSeqR1.length}/3). بعدی را بزنید...`);
                  }
                } else {
                  soundManager.playPuzzleErrorBuzz();
                  const nextData = { ...currentData, stage7SeqR1: [] };
                  this.puzzleState.customData = nextData;
                  networkClient.triggerPuzzle('customData', nextData);
                  this.callbacks.onCheckpointMessage('❌ ترتیب نمادهای اتاق ۱ اشتباه بود! راهنمای این پازل بر روی دیوار اتاق ۲ (هم‌تیمی شما) قرار دارد.');
                }
              }
            }
            this.interactCooldown = 0.4;
          }

          // Stage 7 Room 2 Symbol Buttons (Target: Moon 🌙 -> Heart ❤️ -> Star ⭐)
          if (obj.id.startsWith('btn_stage7_r2_')) {
            soundManager.playInteract();
            const currentData = this.puzzleState.customData || {};
            if (currentData.stage7Room2Solved) {
              this.callbacks.onCheckpointMessage('✨ پازل اتاق ۲ قبلاً با موفقیت حل شده است.');
            } else {
              const symbolMap: Record<string, { id: string; label: string }> = {
                btn_stage7_r2_moon: { id: 'moon', label: 'ماه 🌙' },
                btn_stage7_r2_heart: { id: 'heart', label: 'قلب ❤️' },
                btn_stage7_r2_star: { id: 'star', label: 'ستاره ⭐' },
              };
              const symInfo = symbolMap[obj.id];
              if (symInfo) {
                const targetSeqR2 = ['moon', 'heart', 'star'];
                const currSeqR2: string[] = currentData.stage7SeqR2 || [];
                const nextSeqR2 = [...currSeqR2, symInfo.id];
                const isMatchSoFar = nextSeqR2.every((val, idx) => val === targetSeqR2[idx]);

                if (isMatchSoFar) {
                  if (nextSeqR2.length === 3) {
                    soundManager.playPuzzleSuccessChime();
                    soundManager.playGateMove();
                    const nextData = {
                      ...currentData,
                      stage7SeqR2: nextSeqR2,
                      stage7Room2Solved: true,
                    };
                    this.puzzleState.customData = nextData;
                    networkClient.triggerPuzzle('customData', nextData);
                    this.callbacks.onCheckpointMessage('🎉 پازل اتاق ۲ با موفقیت حل شد! اهرم این اتاق برای باز کردن مسیر هم‌تیمی آزاد گردید.');
                  } else {
                    const nextData = { ...currentData, stage7SeqR2: nextSeqR2 };
                    this.puzzleState.customData = nextData;
                    networkClient.triggerPuzzle('customData', nextData);
                    this.callbacks.onCheckpointMessage(`✅ نماد ${symInfo.label} ثبت شد (${nextSeqR2.length}/3). بعدی را بزنید...`);
                  }
                } else {
                  soundManager.playPuzzleErrorBuzz();
                  const nextData = { ...currentData, stage7SeqR2: [] };
                  this.puzzleState.customData = nextData;
                  networkClient.triggerPuzzle('customData', nextData);
                  this.callbacks.onCheckpointMessage('❌ ترتیب نمادهای اتاق ۲ اشتباه بود! راهنمای این پازل بر روی دیوار اتاق ۱ (هم‌تیمی شما) قرار دارد.');
                }
              }
            }
            this.interactCooldown = 0.4;
          }

          // Stage 7 Reciprocal Levers
          if (obj.id === 'lever_stage7_room1') {
            soundManager.playInteract();
            const currentData = this.puzzleState.customData || {};
            if (!currentData.stage7Room1Solved) {
              soundManager.playPuzzleErrorBuzz();
              this.callbacks.onCheckpointMessage('⚠️ اهرم اتاق ۱ قفل است! ابتدا باید پازل نمادهای این اتاق را حل کنید.');
            } else if (currentData.stage7Lever1Active) {
              this.callbacks.onCheckpointMessage('✨ این اهرم قبلاً کشیده شده و درگاه اتاق ۳ را فقط برای اتاق ۲ (هم‌تیمی) باز کرده است.');
            } else {
              soundManager.playGateMove();
              soundManager.playPuzzleSuccessChime();
              const nextData = {
                ...currentData,
                stage7Lever1Active: true,
                stage7Door3BUnlocked: true,
              };
              this.puzzleState.customData = nextData;
              networkClient.triggerPuzzle('customData', nextData);
              this.callbacks.onCheckpointMessage('⚙️ اهرم اتاق ۱ کشیده شد! فقط درگاه خروج اتاق ۲ هم‌تیمی (اتاق بغلی) باز گردید.');
            }
            this.interactCooldown = 0.4;
          }

          if (obj.id === 'lever_stage7_room2') {
            soundManager.playInteract();
            const currentData = this.puzzleState.customData || {};
            if (!currentData.stage7Room2Solved) {
              soundManager.playPuzzleErrorBuzz();
              this.callbacks.onCheckpointMessage('⚠️ اهرم اتاق ۲ قفل است! ابتدا باید پازل نمادهای این اتاق را حل کنید.');
            } else if (currentData.stage7Lever2Active) {
              this.callbacks.onCheckpointMessage('✨ این اهرم قبلاً کشیده شده و درگاه اتاق ۳ را فقط برای اتاق ۱ (هم‌تیمی) باز کرده است.');
            } else {
              soundManager.playGateMove();
              soundManager.playPuzzleSuccessChime();
              const nextData = {
                ...currentData,
                stage7Lever2Active: true,
                stage7Door3AUnlocked: true,
              };
              this.puzzleState.customData = nextData;
              networkClient.triggerPuzzle('customData', nextData);
              this.callbacks.onCheckpointMessage('⚙️ اهرم اتاق ۲ کشیده شد! فقط درگاه خروج اتاق ۱ هم‌تیمی (اتاق بغلی) باز گردید.');
            }
            this.interactCooldown = 0.4;
          }

          // Stage 7 Room 3 Element Levers (Target for both: Water 💧 -> Leaf 🍃 -> Fire 🔥)
          if (obj.id.startsWith('lever_stage7_r3_a_') || obj.id.startsWith('lever_stage7_r3_b_')) {
            soundManager.playInteract();
            const isSideA = obj.id.startsWith('lever_stage7_r3_a_');
            const sideName = isSideA ? '۳ الف' : '۳ ب';
            const otherSideName = isSideA ? '۳ ب' : '۳ الف';
            const solvedKey = isSideA ? 'stage7Room3ASolved' : 'stage7Room3BSolved';
            const otherSolvedKey = isSideA ? 'stage7Room3BSolved' : 'stage7Room3ASolved';
            const seqKey = isSideA ? 'stage7SeqR3A' : 'stage7SeqR3B';
            const currentData = this.puzzleState.customData || {};

            if (currentData[solvedKey]) {
              this.callbacks.onCheckpointMessage(`✨ اهرم‌های اتاق ${sideName} قبلاً با موفقیت حل شده است.`);
            } else {
              const leverType = obj.id.split('_').pop() || '';
              const leverMap: Record<string, { id: string; label: string }> = {
                water: { id: 'water', label: 'قطره آب 💧' },
                leaf: { id: 'leaf', label: 'برگ 🍃' },
                fire: { id: 'fire', label: 'شعله 🔥' },
              };
              const levInfo = leverMap[leverType];
              if (levInfo) {
                const targetSeqR3 = ['water', 'leaf', 'fire'];
                const currSeqR3: string[] = currentData[seqKey] || [];
                const nextSeqR3 = [...currSeqR3, levInfo.id];
                const isMatchSoFar = nextSeqR3.every((val, idx) => val === targetSeqR3[idx]);

                if (isMatchSoFar) {
                  if (nextSeqR3.length === 3) {
                    soundManager.playPuzzleSuccessChime();
                    const otherSolved = !!currentData[otherSolvedKey] || this.soloDuoMode;
                    const nextData = {
                      ...currentData,
                      [seqKey]: nextSeqR3,
                      [solvedKey]: true,
                      stage7Room3Solved: otherSolved,
                      stage7DoorFinalUnlocked: otherSolved,
                    };
                    this.puzzleState.customData = nextData;
                    networkClient.triggerPuzzle('customData', nextData);

                    if (otherSolved) {
                      soundManager.playGateMove();
                      this.callbacks.onCheckpointMessage('🎉 هر دو اتاق ۳ حل شدند! دیوار میان دو بازیکن برداشته شد و درگاه تالار نهایی باز گردید.');
                    } else {
                      this.callbacks.onCheckpointMessage(`✨ اهرم‌های اتاق ${sideName} حل شد! منتظر حل اهرم‌های هم‌تیمی در اتاق ${otherSideName} باشید...`);
                    }
                  } else {
                    const nextData = { ...currentData, [seqKey]: nextSeqR3 };
                    this.puzzleState.customData = nextData;
                    networkClient.triggerPuzzle('customData', nextData);
                    this.callbacks.onCheckpointMessage(`✅ اهرم ${levInfo.label} در اتاق ${sideName} ثبت شد (${nextSeqR3.length}/3)...`);
                  }
                } else {
                  soundManager.playPuzzleErrorBuzz();
                  const nextData = { ...currentData, [seqKey]: [] };
                  this.puzzleState.customData = nextData;
                  networkClient.triggerPuzzle('customData', nextData);
                  this.callbacks.onCheckpointMessage(`❌ ترتیب اهرم‌های اتاق ${sideName} اشتباه بود! راهنمای این پازل روی دیوار اتاق ${otherSideName} است.`);
                }
              }
            }
            this.interactCooldown = 0.4;
          }

          // Stage 7 Final Sanctuary Buttons (Target: Sun ☀️ -> Moon 🌙 -> Star ⭐ -> Heart ❤️)
          if (obj.id.startsWith('btn_stage7_final_')) {
            soundManager.playInteract();
            const currentData = this.puzzleState.customData || {};
            if (currentData.stage7FinalSolved) {
              this.callbacks.onCheckpointMessage('✨ پازل نهایی تالار قبلاً حل شده و دروازه خروج باز است.');
            } else {
              const symbolMap: Record<string, { id: string; label: string }> = {
                btn_stage7_final_sun: { id: 'sun', label: 'خورشید ☀️' },
                btn_stage7_final_moon: { id: 'moon', label: 'ماه 🌙' },
                btn_stage7_final_star: { id: 'star', label: 'ستاره ⭐' },
                btn_stage7_final_heart: { id: 'heart', label: 'قلب ❤️' },
              };
              const symInfo = symbolMap[obj.id];
              if (symInfo) {
                const targetSeqFinal = ['sun', 'moon', 'star', 'heart'];
                const currSeqFinal: string[] = currentData.stage7SeqFinal || [];
                const nextSeqFinal = [...currSeqFinal, symInfo.id];
                const isMatchSoFar = nextSeqFinal.every((val, idx) => val === targetSeqFinal[idx]);

                if (isMatchSoFar) {
                  if (nextSeqFinal.length === 4) {
                    soundManager.playPuzzleSuccessChime();
                    soundManager.playGateMove();
                    const nextData = {
                      ...currentData,
                      stage7SeqFinal: nextSeqFinal,
                      stage7FinalSolved: true,
                      stage7ExitDoorUnlocked: true,
                    };
                    this.puzzleState.customData = nextData;
                    networkClient.triggerPuzzle('customData', nextData);
                    this.callbacks.onCheckpointMessage('🎉 پازل نهایی تالار با موفقیت حل شد! دروازه اصلی خروج معبد چهار اتاق برای همیشه باز گردید.');
                  } else {
                    const nextData = { ...currentData, stage7SeqFinal: nextSeqFinal };
                    this.puzzleState.customData = nextData;
                    networkClient.triggerPuzzle('customData', nextData);
                    this.callbacks.onCheckpointMessage(`✅ نماد نهایی ${symInfo.label} ثبت شد (${nextSeqFinal.length}/4)...`);
                  }
                } else {
                  soundManager.playPuzzleErrorBuzz();
                  const nextData = { ...currentData, stage7SeqFinal: [] };
                  this.puzzleState.customData = nextData;
                  networkClient.triggerPuzzle('customData', nextData);
                  this.callbacks.onCheckpointMessage('❌ ترتیب نمادهای پازل نهایی اشتباه بود! راهنمای درست: ۱. خورشید ☀️ ← ۲. ماه 🌙 ← ۳. ستاره ⭐ ← ۴. قلب ❤️');
                }
              }
            }
            this.interactCooldown = 0.4;
          }

          // ==========================================
          // STAGE 8 INTERACTION LOGIC
          // ==========================================
          // Stage 8 Path A Symbol Buttons (Target: Star ⭐ -> Moon 🌙 -> Heart ❤️)
          if (obj.id.startsWith('btn_stage8_a_')) {
            soundManager.playInteract();
            const currentData = this.puzzleState.customData || {};
            if (currentData.stage8PuzzleASolved) {
              this.callbacks.onCheckpointMessage('✨ پازل نمادهای مسیر A قبلاً حل شده و اهرم آماده است.');
            } else {
              const symbolMap: Record<string, { id: string; label: string }> = {
                btn_stage8_a_star: { id: 'star', label: 'ستاره ⭐' },
                btn_stage8_a_moon: { id: 'moon', label: 'ماه 🌙' },
                btn_stage8_a_heart: { id: 'heart', label: 'قلب ❤️' },
              };
              const symInfo = symbolMap[obj.id];
              if (symInfo) {
                const targetSeqA = ['star', 'moon', 'heart'];
                const currSeqA: string[] = currentData.stage8SeqA || [];
                const nextSeqA = [...currSeqA, symInfo.id];
                const isMatchSoFar = nextSeqA.every((val, idx) => val === targetSeqA[idx]);

                if (isMatchSoFar) {
                  if (nextSeqA.length === 3) {
                    soundManager.playPuzzleSuccessChime();
                    const nextData = {
                      ...currentData,
                      stage8SeqA: nextSeqA,
                      stage8PuzzleASolved: true,
                    };
                    this.puzzleState.customData = nextData;
                    networkClient.triggerPuzzle('customData', nextData);
                    this.callbacks.onCheckpointMessage('🎉 پازل مسیر A با موفقیت حل شد! اهرم این مسیر برای باز کردن در هم‌تیمی فعال گردید.');
                  } else {
                    const nextData = { ...currentData, stage8SeqA: nextSeqA };
                    this.puzzleState.customData = nextData;
                    networkClient.triggerPuzzle('customData', nextData);
                    this.callbacks.onCheckpointMessage(`✅ نماد ${symInfo.label} ثبت شد (${nextSeqA.length}/3). نماد بعدی را بزنید...`);
                  }
                } else {
                  soundManager.playPuzzleErrorBuzz();
                  const nextData = { ...currentData, stage8SeqA: [] };
                  this.puzzleState.customData = nextData;
                  networkClient.triggerPuzzle('customData', nextData);
                  this.callbacks.onCheckpointMessage('❌ ترتیب نمادهای مسیر A اشتباه بود! راهنمای این پازل روی دیوار مسیر B (هم‌تیمی) قرار دارد.');
                }
              }
            }
            this.interactCooldown = 0.4;
          }

          // Stage 8 Path B Symbol Buttons (Target: Sun ☀️ -> Flower 🌸 -> Flame 🔥)
          if (obj.id.startsWith('btn_stage8_b_')) {
            soundManager.playInteract();
            const currentData = this.puzzleState.customData || {};
            if (currentData.stage8PuzzleBSolved) {
              this.callbacks.onCheckpointMessage('✨ پازل نمادهای مسیر B قبلاً حل شده و اهرم آماده است.');
            } else {
              const symbolMap: Record<string, { id: string; label: string }> = {
                btn_stage8_b_sun: { id: 'sun', label: 'خورشید ☀️' },
                btn_stage8_b_flower: { id: 'flower', label: 'گل 🌸' },
                btn_stage8_b_flame: { id: 'flame', label: 'شعله 🔥' },
              };
              const symInfo = symbolMap[obj.id];
              if (symInfo) {
                const targetSeqB = ['sun', 'flower', 'flame'];
                const currSeqB: string[] = currentData.stage8SeqB || [];
                const nextSeqB = [...currSeqB, symInfo.id];
                const isMatchSoFar = nextSeqB.every((val, idx) => val === targetSeqB[idx]);

                if (isMatchSoFar) {
                  if (nextSeqB.length === 3) {
                    soundManager.playPuzzleSuccessChime();
                    const nextData = {
                      ...currentData,
                      stage8SeqB: nextSeqB,
                      stage8PuzzleBSolved: true,
                    };
                    this.puzzleState.customData = nextData;
                    networkClient.triggerPuzzle('customData', nextData);
                    this.callbacks.onCheckpointMessage('🎉 پازل مسیر B با موفقیت حل شد! اهرم این مسیر برای باز کردن در هم‌تیمی فعال گردید.');
                  } else {
                    const nextData = { ...currentData, stage8SeqB: nextSeqB };
                    this.puzzleState.customData = nextData;
                    networkClient.triggerPuzzle('customData', nextData);
                    this.callbacks.onCheckpointMessage(`✅ نماد ${symInfo.label} ثبت شد (${nextSeqB.length}/3). نماد بعدی را بزنید...`);
                  }
                } else {
                  soundManager.playPuzzleErrorBuzz();
                  const nextData = { ...currentData, stage8SeqB: [] };
                  this.puzzleState.customData = nextData;
                  networkClient.triggerPuzzle('customData', nextData);
                  this.callbacks.onCheckpointMessage('❌ ترتیب نمادهای مسیر B اشتباه بود! راهنمای این پازل روی دیوار مسیر A (هم‌تیمی) قرار دارد.');
                }
              }
            }
            this.interactCooldown = 0.4;
          }

          // Stage 8 Reciprocal Levers
          if (obj.id === 'lever_stage8_a') {
            soundManager.playInteract();
            const currentData = this.puzzleState.customData || {};
            if (!currentData.stage8PuzzleASolved) {
              soundManager.playPuzzleErrorBuzz();
              this.callbacks.onCheckpointMessage('⚠️ اهرم مسیر A قفل است! ابتدا باید پازل نمادهای این مسیر را حل کنید.');
            } else if (currentData.stage8DoorBUnlocked) {
              this.callbacks.onCheckpointMessage('✨ این اهرم قبلاً کشیده شده و درگاه مسیر B هم‌تیمی باز است.');
            } else {
              soundManager.playGateMove();
              soundManager.playPuzzleSuccessChime();
              const nextData = {
                ...currentData,
                stage8LeverAActive: true,
                stage8DoorBUnlocked: true,
              };
              this.puzzleState.customData = nextData;
              networkClient.triggerPuzzle('customData', nextData);
              this.callbacks.onCheckpointMessage('⚙️ اهرم مسیر A کشیده شد! در خروج مسیر B هم‌تیمی شما باز گردید.');
            }
            this.interactCooldown = 0.4;
          }

          if (obj.id === 'lever_stage8_b') {
            soundManager.playInteract();
            const currentData = this.puzzleState.customData || {};
            if (!currentData.stage8PuzzleBSolved) {
              soundManager.playPuzzleErrorBuzz();
              this.callbacks.onCheckpointMessage('⚠️ اهرم مسیر B قفل است! ابتدا باید پازل نمادهای این مسیر را حل کنید.');
            } else if (currentData.stage8DoorAUnlocked) {
              this.callbacks.onCheckpointMessage('✨ این اهرم قبلاً کشیده شده و درگاه مسیر A هم‌تیمی باز است.');
            } else {
              soundManager.playGateMove();
              soundManager.playPuzzleSuccessChime();
              const nextData = {
                ...currentData,
                stage8LeverBActive: true,
                stage8DoorAUnlocked: true,
              };
              this.puzzleState.customData = nextData;
              networkClient.triggerPuzzle('customData', nextData);
              this.callbacks.onCheckpointMessage('⚙️ اهرم مسیر B کشیده شد! در خروج مسیر A هم‌تیمی شما باز گردید.');
            }
            this.interactCooldown = 0.4;
          }

          // Stage 8 Section 3 Chamber A Symbol Buttons (Target: Flame 🔥 -> Flower 🌸 -> Star ⭐ -> Sun ☀️)
          if (obj.id.startsWith('btn_stage8_c3_a_')) {
            soundManager.playInteract();
            const currentData = this.puzzleState.customData || {};
            if (currentData.stage8PuzzleC3ASolved) {
              this.callbacks.onCheckpointMessage('✨ پازل نمادهای اتاق ۳ الف قبلاً حل شده و اهرم آماده است.');
            } else {
              const symbolMap: Record<string, { id: string; label: string }> = {
                btn_stage8_c3_a_flame: { id: 'flame', label: 'شعله 🔥' },
                btn_stage8_c3_a_flower: { id: 'flower', label: 'گل 🌸' },
                btn_stage8_c3_a_star: { id: 'star', label: 'ستاره ⭐' },
                btn_stage8_c3_a_sun: { id: 'sun', label: 'خورشید ☀️' },
              };
              const symInfo = symbolMap[obj.id];
              if (symInfo) {
                const targetSeqC3A = ['flame', 'flower', 'star', 'sun'];
                const currSeqC3A: string[] = currentData.stage8SeqC3A || [];
                const nextSeqC3A = [...currSeqC3A, symInfo.id];
                const isMatchSoFar = nextSeqC3A.every((val, idx) => val === targetSeqC3A[idx]);

                if (isMatchSoFar) {
                  if (nextSeqC3A.length === 4) {
                    soundManager.playPuzzleSuccessChime();
                    const nextData = {
                      ...currentData,
                      stage8SeqC3A: nextSeqC3A,
                      stage8PuzzleC3ASolved: true,
                    };
                    this.puzzleState.customData = nextData;
                    networkClient.triggerPuzzle('customData', nextData);
                    this.callbacks.onCheckpointMessage('🎉 پازل اتاق ۳ الف حل شد! اهرم این اتاق برای باز کردن در هم‌تیمی فعال شد.');
                  } else {
                    const nextData = { ...currentData, stage8SeqC3A: nextSeqC3A };
                    this.puzzleState.customData = nextData;
                    networkClient.triggerPuzzle('customData', nextData);
                    this.callbacks.onCheckpointMessage(`✅ نماد ${symInfo.label} ثبت شد (${nextSeqC3A.length}/4)...`);
                  }
                } else {
                  soundManager.playPuzzleErrorBuzz();
                  const nextData = { ...currentData, stage8SeqC3A: [] };
                  this.puzzleState.customData = nextData;
                  networkClient.triggerPuzzle('customData', nextData);
                  this.callbacks.onCheckpointMessage('❌ ترتیب نمادهای اتاق ۳ الف اشتباه بود! راهنمای این پازل روی کتیبه اتاق ۳ ب (هم‌تیمی شما) است.');
                }
              }
            }
            this.interactCooldown = 0.4;
          }

          // Stage 8 Section 3 Chamber B Symbol Buttons (Target: Moon 🌙 -> Heart ❤️ -> Sun ☀️ -> Star ⭐)
          if (obj.id.startsWith('btn_stage8_c3_b_')) {
            soundManager.playInteract();
            const currentData = this.puzzleState.customData || {};
            if (currentData.stage8PuzzleC3BSolved) {
              this.callbacks.onCheckpointMessage('✨ پازل نمادهای اتاق ۳ ب قبلاً حل شده و اهرم آماده است.');
            } else {
              const symbolMap: Record<string, { id: string; label: string }> = {
                btn_stage8_c3_b_moon: { id: 'moon', label: 'ماه 🌙' },
                btn_stage8_c3_b_heart: { id: 'heart', label: 'قلب ❤️' },
                btn_stage8_c3_b_sun: { id: 'sun', label: 'خورشید ☀️' },
                btn_stage8_c3_b_star: { id: 'star', label: 'ستاره ⭐' },
              };
              const symInfo = symbolMap[obj.id];
              if (symInfo) {
                const targetSeqC3B = ['moon', 'heart', 'sun', 'star'];
                const currSeqC3B: string[] = currentData.stage8SeqC3B || [];
                const nextSeqC3B = [...currSeqC3B, symInfo.id];
                const isMatchSoFar = nextSeqC3B.every((val, idx) => val === targetSeqC3B[idx]);

                if (isMatchSoFar) {
                  if (nextSeqC3B.length === 4) {
                    soundManager.playPuzzleSuccessChime();
                    const nextData = {
                      ...currentData,
                      stage8SeqC3B: nextSeqC3B,
                      stage8PuzzleC3BSolved: true,
                    };
                    this.puzzleState.customData = nextData;
                    networkClient.triggerPuzzle('customData', nextData);
                    this.callbacks.onCheckpointMessage('🎉 پازل اتاق ۳ ب حل شد! اهرم این اتاق برای باز کردن در هم‌تیمی فعال شد.');
                  } else {
                    const nextData = { ...currentData, stage8SeqC3B: nextSeqC3B };
                    this.puzzleState.customData = nextData;
                    networkClient.triggerPuzzle('customData', nextData);
                    this.callbacks.onCheckpointMessage(`✅ نماد ${symInfo.label} ثبت شد (${nextSeqC3B.length}/4)...`);
                  }
                } else {
                  soundManager.playPuzzleErrorBuzz();
                  const nextData = { ...currentData, stage8SeqC3B: [] };
                  this.puzzleState.customData = nextData;
                  networkClient.triggerPuzzle('customData', nextData);
                  this.callbacks.onCheckpointMessage('❌ ترتیب نمادهای اتاق ۳ ب اشتباه بود! راهنمای این پازل روی کتیبه اتاق ۳ الف (هم‌تیمی شما) است.');
                }
              }
            }
            this.interactCooldown = 0.4;
          }

          // Stage 8 Section 3 Reciprocal Levers
          if (obj.id === 'lever_stage8_c3_a') {
            soundManager.playInteract();
            const currentData = this.puzzleState.customData || {};
            if (!currentData.stage8PuzzleC3ASolved) {
              soundManager.playPuzzleErrorBuzz();
              this.callbacks.onCheckpointMessage('⚠️ اهرم اتاق ۳ الف قفل است! ابتدا باید پازل نمادهای این اتاق را حل کنید.');
            } else if (currentData.stage8Door3BUnlocked) {
              this.callbacks.onCheckpointMessage('✨ این اهرم قبلاً کشیده شده و درگاه خروج اتاق ۳ ب هم‌تیمی باز است.');
            } else {
              soundManager.playGateMove();
              soundManager.playPuzzleSuccessChime();
              const nextData = {
                ...currentData,
                stage8LeverC3AActive: true,
                stage8Door3BUnlocked: true,
              };
              this.puzzleState.customData = nextData;
              networkClient.triggerPuzzle('customData', nextData);
              this.callbacks.onCheckpointMessage('⚙️ اهرم اتاق ۳ الف کشیده شد! فقط درگاه خروج اتاق ۳ ب هم‌تیمی شما باز گردید.');
            }
            this.interactCooldown = 0.4;
          }

          if (obj.id === 'lever_stage8_c3_b') {
            soundManager.playInteract();
            const currentData = this.puzzleState.customData || {};
            if (!currentData.stage8PuzzleC3BSolved) {
              soundManager.playPuzzleErrorBuzz();
              this.callbacks.onCheckpointMessage('⚠️ اهرم اتاق ۳ ب قفل است! ابتدا باید پازل نمادهای این اتاق را حل کنید.');
            } else if (currentData.stage8Door3AUnlocked) {
              this.callbacks.onCheckpointMessage('✨ این اهرم قبلاً کشیده شده و درگاه خروج اتاق ۳ الف هم‌تیمی باز است.');
            } else {
              soundManager.playGateMove();
              soundManager.playPuzzleSuccessChime();
              const nextData = {
                ...currentData,
                stage8LeverC3BActive: true,
                stage8Door3AUnlocked: true,
              };
              this.puzzleState.customData = nextData;
              networkClient.triggerPuzzle('customData', nextData);
              this.callbacks.onCheckpointMessage('⚙️ اهرم اتاق ۳ ب کشیده شد! فقط درگاه خروج اتاق ۳ الف هم‌تیمی شما باز گردید.');
            }
            this.interactCooldown = 0.4;
          }

          // Stage 3 Jamming Crate Toggle (Fallback for legacy)
          if (obj.id === 'clockwork_jam_crate' || obj.id === 'heavy_block') {
            const nextVal = !this.puzzleState.crusherJammed;
            networkClient.triggerPuzzle('crusherJammed', nextVal);
            soundManager.playInteract();
            this.callbacks.onCheckpointMessage(nextVal ? 'پیستون کوبنده مهار و متوقف شد!' : 'پیستون آزادسازی شد!');
            this.interactCooldown = 0.35;
          }

          // Stage 3 Synchronized Valves Toggle (Fallback for legacy)
          if (obj.id === 'boiler_valve_1') {
            const nextVal = !this.puzzleState.boilerValve1;
            networkClient.triggerPuzzle('boilerValve1', nextVal);
            soundManager.playInteract();
            this.checkSynchronizedValves();
            this.interactCooldown = 0.35;
          }
          if (obj.id === 'boiler_valve_2') {
            const nextVal = !this.puzzleState.boilerValve2;
            networkClient.triggerPuzzle('boilerValve2', nextVal);
            soundManager.playInteract();
            this.checkSynchronizedValves();
            this.interactCooldown = 0.35;
          }

          // Stage 4 Lore Tablet
          if (obj.id === 'story_tablet_stage4') {
            soundManager.playInteract();
            this.callbacks.onCheckpointMessage('📜 کتیبه باستانی معبد: «نور را با منشورها هدایت کنید، مکعب بلورین را روی هادی انرژی بگذارید و با سکوهای رقصان خورشید از ورطه گذشته، قفل دوگانه رزوناتورها را هم‌زمان بگشایید.»');
            this.interactCooldown = 0.5;
          }

          // Stage 4 Prisms & Solar Conduits
          if (obj.id === 'prism_pedestal_1') {
            const curr = !!(this.puzzleState.prism1Aligned || (this.puzzleState.customData && this.puzzleState.customData.prism1Aligned));
            const nextVal = !curr;
            networkClient.triggerPuzzle('prism1Aligned', nextVal);
            networkClient.triggerPuzzle('customData', { ...this.puzzleState.customData, prism1Aligned: nextVal });
            soundManager.playInteract();
            if (nextVal) soundManager.playPressurePlate(true);
            this.callbacks.onCheckpointMessage(nextVal ? '✨ منشور نوری ۱ با کانون معبد تنظیم شد! پل نوری خورشید گسترش یافت.' : 'منشور نوری ۱ از کانون خارج شد.');
            this.interactCooldown = 0.35;
          }

          if (obj.id === 'solar_push_crate' || obj.id === 'solar_conduit_plate') {
            const curr = !!(this.puzzleState.solarConduitActive || (this.puzzleState.customData && this.puzzleState.customData.solarConduitActive));
            const nextVal = !curr;
            networkClient.triggerPuzzle('solarConduitActive', nextVal);
            networkClient.triggerPuzzle('customData', { ...this.puzzleState.customData, solarConduitActive: nextVal });
            soundManager.playInteract();
            if (nextVal) soundManager.playPressurePlate(true);
            this.callbacks.onCheckpointMessage(nextVal ? '⚡ مکعب خورشید روی هادی انرژی مستقر شد! برج منشور ۲ با انرژی خورشیدی شارژ گردید.' : 'مکعب از روی هادی انرژی برداشته شد.');
            this.interactCooldown = 0.35;
          }

          if (obj.id === 'prism_pedestal_2') {
            const isConduitReady = !!(this.puzzleState.solarConduitActive || (this.puzzleState.customData && this.puzzleState.customData.solarConduitActive));
            if (!isConduitReady) {
              soundManager.playInteract();
              this.callbacks.onCheckpointMessage('⚠️ برج منشور ۲ انرژی ندارد! ابتدا باید مکعب خورشید را روی هادی انرژی (صفحه زرد) قرار دهید.');
              this.interactCooldown = 0.5;
            } else {
              const curr = !!(this.puzzleState.prism2Aligned || (this.puzzleState.customData && this.puzzleState.customData.prism2Aligned));
              const nextVal = !curr;
              networkClient.triggerPuzzle('prism2Aligned', nextVal);
              networkClient.triggerPuzzle('customData', { ...this.puzzleState.customData, prism2Aligned: nextVal, sunCoreAwakened: nextVal });
              soundManager.playInteract();
              if (nextVal) soundManager.playPressurePlate(true);
              this.callbacks.onCheckpointMessage(nextVal ? '🌟 منشور نوری ۲ پرتو را به هسته خورشید تابانید! هسته اعظم بیدار شد و سکوهای پرنده به حرکت درآمدند.' : 'منشور نوری ۲ غیرفعال شد.');
              this.interactCooldown = 0.35;
            }
          }

          // Stage 4 Dual Resonators
          if (obj.id === 'solar_resonator_1') {
            const curr = !!(this.puzzleState.solarResonator1 || (this.puzzleState.customData && this.puzzleState.customData.solarResonator1));
            const nextVal = !curr;
            networkClient.triggerPuzzle('solarResonator1', nextVal);
            networkClient.triggerPuzzle('customData', { ...this.puzzleState.customData, solarResonator1: nextVal });
            soundManager.playInteract();
            const partnerActive = !!(this.puzzleState.solarResonator2 || (this.puzzleState.customData && this.puzzleState.customData.solarResonator2));
            if (nextVal && partnerActive) {
              this.callbacks.onCheckpointMessage('☀️ قفل دوگانه رزوناتورها باز شد! دروازه خورشید گشوده شد.');
            } else {
              this.callbacks.onCheckpointMessage(nextVal ? '🔹 رزوناتور خورشیدی ۱ توسط کاوشگر فعال شد!' : 'رزوناتور ۱ غیرفعال شد.');
            }
            this.interactCooldown = 0.35;
          }

          if (obj.id === 'solar_resonator_2') {
            const curr = !!(this.puzzleState.solarResonator2 || (this.puzzleState.customData && this.puzzleState.customData.solarResonator2));
            const nextVal = !curr;
            networkClient.triggerPuzzle('solarResonator2', nextVal);
            networkClient.triggerPuzzle('customData', { ...this.puzzleState.customData, solarResonator2: nextVal });
            soundManager.playInteract();
            const partnerActive = !!(this.puzzleState.solarResonator1 || (this.puzzleState.customData && this.puzzleState.customData.solarResonator1));
            if (nextVal && partnerActive) {
              this.callbacks.onCheckpointMessage('☀️ قفل دوگانه رزوناتورها باز شد! دروازه خورشید گشوده شد.');
            } else {
              this.callbacks.onCheckpointMessage(nextVal ? '🔸 رزوناتور خورشیدی ۲ توسط نگهبان فعال شد!' : 'رزوناتور ۲ غیرفعال شد.');
            }
            this.interactCooldown = 0.35;
          }

          // Generic Campaign Stage Levers
          if (obj.id.startsWith('lever_stage')) {
            const stageNum = this.currentStageId;
            const key = `leverActivated_${stageNum}`;
            const curr = !!(this.puzzleState.customData && this.puzzleState.customData[key]);
            networkClient.triggerPuzzle('customData', { ...this.puzzleState.customData, [key]: !curr });
            soundManager.playInteract();
            this.callbacks.onCheckpointMessage(!curr ? `⚙️ اهرم مرحله ${stageNum} فعال گردید!` : `⚙️ اهرم مرحله ${stageNum} غیرفعال شد.`);
            this.interactCooldown = 0.35;
          }
        }

    // Stage Exit Pads Real-time Occupancy
    let p1PadObj: typeof this.currentStage.interactiveObjects[0] | null = null;
    let p2PadObj: typeof this.currentStage.interactiveObjects[0] | null = null;

    for (const obj of this.currentStage.interactiveObjects) {
      if (obj.type === 'portal_pad') {
        if (obj.id.includes('p1')) p1PadObj = obj;
        if (obj.id.includes('p2')) p2PadObj = obj;
      }
    }

    if (p1PadObj && p2PadObj) {
      const isSolo = this.soloDuoMode || !networkClient.getRoomCode();

      const explorerPos = isSolo 
        ? this.soloPositions['explorer'] 
        : (this.localRole === 'explorer' 
            ? this.playerPos 
            : (this.partnerNetState ? new THREE.Vector3(this.partnerNetState.x, this.partnerNetState.y, this.partnerNetState.z) : null)
          );
      const guardianPos = isSolo 
        ? this.soloPositions['guardian'] 
        : (this.localRole === 'guardian' 
            ? this.playerPos 
            : (this.partnerNetState ? new THREE.Vector3(this.partnerNetState.x, this.partnerNetState.y, this.partnerNetState.z) : null)
          );

      // Validation Guard for Stage 3: Both Mirror Chambers must be solved!
      const isStage3Solved = !!(
        (this.puzzleState.customData?.stage3ExitUnlocked) ||
        (this.puzzleState.customData?.stage3SolvedA && this.puzzleState.customData?.stage3SolvedB)
      );

      // Validation Guard for Stage 4: Dual Solar Resonators / Harmony Puzzle must be solved!
      const isStage4Solved = !!(
        (this.puzzleState.customData?.stage4MainState === 'SOLVED') ||
        (this.puzzleState.solarResonator1 && this.puzzleState.solarResonator2) ||
        (this.puzzleState.customData?.solarResonator1 && this.puzzleState.customData?.solarResonator2)
      );

      const canExit = (this.currentStageId !== 3 || isStage3Solved) && (this.currentStageId !== 4 || isStage4Solved);

      if (!canExit) {
        const isNearExit = (explorerPos && (p1PadObj.bounds.distanceToPoint(explorerPos) < 2.5 || p2PadObj.bounds.distanceToPoint(explorerPos) < 2.5)) ||
                           (guardianPos && (p1PadObj.bounds.distanceToPoint(guardianPos) < 2.5 || p2PadObj.bounds.distanceToPoint(guardianPos) < 2.5));
        if (isNearExit && this.interactCooldown <= 0) {
          if (this.currentStageId === 3) {
            this.callbacks.onCheckpointMessage('⚠️ دروازه خروج قفل است! ابتدا باید پازل نمادهای هر دو اتاق A و B با همکاری حل شوند.');
          } else if (this.currentStageId === 4) {
            this.callbacks.onCheckpointMessage('⚠️ دروازه خورشید قفل است! ابتدا باید با کلیدهای دو طرف رزوناتور خورشیدی، هماهنگی را فعال کنید.');
          }
          this.interactCooldown = 1.5;
        }
      } else {
        const key1 = `stage${this.currentStageId}ExitP1Ready`;
        const key2 = `stage${this.currentStageId}ExitP2Ready`;

        const isLocalNearP1 = p1PadObj.bounds.distanceToPoint(this.playerPos) < 2.5 || p1PadObj.bounds.containsPoint(this.playerPos);
        const isLocalNearP2 = p2PadObj.bounds.distanceToPoint(this.playerPos) < 2.5 || p2PadObj.bounds.containsPoint(this.playerPos);

        if (isSolo) {
          const expOnP1 = explorerPos && (p1PadObj.bounds.distanceToPoint(explorerPos) < 2.5 || p1PadObj.bounds.containsPoint(explorerPos));
          const expOnP2 = explorerPos && (p2PadObj.bounds.distanceToPoint(explorerPos) < 2.5 || p2PadObj.bounds.containsPoint(explorerPos));
          const grdOnP1 = guardianPos && (p1PadObj.bounds.distanceToPoint(guardianPos) < 2.5 || p1PadObj.bounds.containsPoint(guardianPos));
          const grdOnP2 = guardianPos && (p2PadObj.bounds.distanceToPoint(guardianPos) < 2.5 || p2PadObj.bounds.containsPoint(guardianPos));

          const p1Ready = !!(expOnP1 || grdOnP1);
          const p2Ready = !!(expOnP2 || grdOnP2);

          const isCurrentlyP1Ready = !!(this.puzzleState as any)[key1] || !!(this.puzzleState.customData && this.puzzleState.customData[key1]);
          const isCurrentlyP2Ready = !!(this.puzzleState as any)[key2] || !!(this.puzzleState.customData && this.puzzleState.customData[key2]);

          if (p1Ready !== isCurrentlyP1Ready || p2Ready !== isCurrentlyP2Ready) {
            networkClient.triggerPuzzle(key1, p1Ready);
            networkClient.triggerPuzzle(key2, p2Ready);
            networkClient.triggerPuzzle('customData', { ...this.puzzleState.customData, [key1]: p1Ready, [key2]: p2Ready });
            if (p1Ready || p2Ready) soundManager.playPressurePlate(true);
          }
        } else {
          // In multiplayer: Local player can occupy either pad
          const isLocalReady = isLocalNearP1 || isLocalNearP2;
          const myTargetKey = isLocalNearP1 ? key1 : (isLocalNearP2 ? key2 : (this.localRole === 'explorer' ? key1 : key2));
          const isCurrentlyMyReady = !!(this.puzzleState as any)[myTargetKey] || !!(this.puzzleState.customData && this.puzzleState.customData[myTargetKey]);

          if (isLocalReady !== isCurrentlyMyReady) {
            networkClient.triggerPuzzle(myTargetKey, isLocalReady);
            networkClient.triggerPuzzle('customData', { ...this.puzzleState.customData, [myTargetKey]: isLocalReady });
            soundManager.playPressurePlate(isLocalReady);
            const myName = this.localRole === 'explorer' ? 'نیوشا' : 'حسن';
            const partnerName = this.localRole === 'explorer' ? 'حسن' : 'نیوشا';
            if (isLocalReady) {
              this.callbacks.onCheckpointMessage(`🟢 ${myName} روی سکوی خروج ایستاد. منتظر ${partnerName}...`);
            } else {
              this.callbacks.onCheckpointMessage(`🔴 ${myName} از روی سکوی خروج خارج شد.`);
            }
          }
        }
      }
    }

    // Checkpoint Activation
    for (const cp of this.currentStage.checkpoints) {
      if (this.playerPos.distanceTo(new THREE.Vector3(cp.pos[0], cp.pos[1], cp.pos[2])) < 3.5) {
        if (cp.id > this.currentCheckpointId) {
          this.currentCheckpointId = cp.id;
          this.respawnPos.set(cp.pos[0], cp.pos[1], cp.pos[2]);
          networkClient.reachCheckpoint(cp.id);
          soundManager.playCheckpoint();
          this.callbacks.onCheckpointMessage(`چک‌پوینت شماره ${cp.id + 1} فعال شد!`);
        }
      }
    }

    this.checkPortalWarp();
    this.callbacks.onInteractionPrompt(nearestPrompt);
  }

  private checkSynchronizedValves() {
    if (this.puzzleState.boilerValve1 && this.puzzleState.boilerValve2) {
      soundManager.playStageClear();
      this.callbacks.onCheckpointMessage('شیرهای بخار هماهنگ شدند! دروازه پورتال گشوده شد!');
    }
  }

  private checkPortalWarp() {
    if (this.stageCompleted) return;

    const key1 = `stage${this.currentStageId}ExitP1Ready`;
    const key2 = `stage${this.currentStageId}ExitP2Ready`;

    const customP1 = !!(this.puzzleState.customData && this.puzzleState.customData[key1]);
    const customP2 = !!(this.puzzleState.customData && this.puzzleState.customData[key2]);

    const p1Ready = !!(this.puzzleState as any)[key1] || customP1;
    const p2Ready = !!(this.puzzleState as any)[key2] || customP2;

    if (p1Ready && p2Ready) {
      this.stageCompleted = true;
      soundManager.playStageClear();
      this.callbacks.onCheckpointMessage(`🏆 مرحله ${this.currentStageId} کامل شد — هر دو بازیکن به نقطه پایان رسیدند!`);
      this.callbacks.onStageClear(this.currentStageId);
    }
  }

  public respawnAtCheckpoint() {
    soundManager.playLand();
    this.playerPos.copy(this.respawnPos);
    this.playerVel.set(0, 0, 0);
    this.callbacks.onCheckpointMessage('بازگشت به چک‌پوینت انجام شد');
  }

  private updateCamera(dt: number) {
    // Look-at point on player (head/chest level)
    const lookAtPos = this.playerPos.clone().add(new THREE.Vector3(0, 1.4, 0));

    // Calculate desired camera target position behind player
    const offset = new THREE.Vector3(
      Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance,
      Math.sin(this.cameraPitch) * this.cameraDistance + 1.6,
      Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance
    );

    const desiredCamPos = this.playerPos.clone().add(offset);
    const camDir = desiredCamPos.clone().sub(lookAtPos);
    const maxDist = camDir.length();
    camDir.normalize();

    // Camera Collision & Occlusion Prevention:
    // Cast ray from player lookAt point towards desired camera position to avoid clipping into walls/geometry
    let hitDistance = maxDist;
    if (this.currentStage && this.currentStage.colliders.length > 0) {
      const ray = new THREE.Ray(lookAtPos, camDir);
      const hitPoint = new THREE.Vector3();
      for (const box of this.currentStage.colliders) {
        // Skip box if the player's lookAt is inside or below floor
        if (ray.intersectBox(box, hitPoint)) {
          const d = lookAtPos.distanceTo(hitPoint);
          if (d > 0.4 && d < hitDistance) {
            hitDistance = d;
          }
        }
      }
    }

    // Safety margin from wall: 0.35m clearance, minimum camera distance 1.2m from player
    const finalDist = Math.max(1.2, hitDistance - 0.35);
    const targetCamPos = lookAtPos.clone().addScaledVector(camDir, finalDist);

    // Smooth spring follow
    this.camera.position.lerp(targetCamPos, Math.min(1, dt * 14));
    this.camera.lookAt(lookAtPos);

    // Keep sun light centered near player for dynamic shadows
    this.sunLight.position.set(this.playerPos.x + 20, 35, this.playerPos.z + 15);
    this.sunLight.target.position.copy(this.playerPos);
    this.sunLight.target.updateMatrixWorld();
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  public getPuzzleState(): PuzzleState {
    return { ...this.puzzleState };
  }

  public destroy() {
    this.stop();
    this.exitPointerLock();
    if (this.boundPointerLockHandler) {
      document.removeEventListener('pointerlockchange', this.boundPointerLockHandler);
      this.boundPointerLockHandler = null;
    }
    this.resizeObserver.disconnect();
    if (this.currentStage) this.currentStage.dispose();
    if (this.localPlayerMesh) this.localPlayerMesh.dispose();
    if (this.remotePlayerMesh) this.remotePlayerMesh.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
