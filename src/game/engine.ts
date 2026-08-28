import * as THREE from 'three';
import { networkClient } from '../multiplayer/networkClient.ts';
import { soundManager } from '../audio/soundManager.ts';
import { createCharacterMesh, type CharacterControllerMesh } from './characterModel.ts';
import { buildCampaignStage } from './stages/campaignStages.ts';
import { buildGardenStage, type StageBuildResult, type InteractiveObject } from './stages/gardenStage.ts';
import { buildFloatingIslandsStage } from './stages/floatingIslandsStage.ts';
import { buildClockworkStage } from './stages/clockworkStage.ts';
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

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Lighting
    this.ambientLight = new THREE.HemisphereLight(0xe0e7ff, 0x1e293b, 0.9);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.8);
    this.sunLight.position.set(25, 45, 20);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
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
    } else if (stageId === 2 || stageId === 8) {
      this.scene.background = new THREE.Color(0x0284c7);
      this.scene.fog = new THREE.FogExp2(0x38bdf8, 0.012);
      this.sunLight.color.setHex(0xffffff);
      this.ambientLight.color.setHex(0xe0f2fe);
    } else if (stageId === 3 || stageId === 10 || stageId === 11) {
      this.scene.background = new THREE.Color(0x1c1917);
      this.scene.fog = new THREE.FogExp2(0x292524, 0.022);
      this.sunLight.color.setHex(0xfbbf24);
      this.ambientLight.color.setHex(0xfef3c7);
    } else if (stageId === 4 || stageId === 9 || stageId === 17) {
      this.scene.background = new THREE.Color(0x1e1b4b);
      this.scene.fog = new THREE.FogExp2(0x312e81, 0.015);
      this.sunLight.color.setHex(0xfde047);
      this.ambientLight.color.setHex(0xfae8ff);
    } else if (stageId === 5 || stageId === 15) {
      this.scene.background = new THREE.Color(0x030712);
      this.scene.fog = new THREE.FogExp2(0x1e1b4b, 0.012);
      this.sunLight.color.setHex(0x38bdf8);
      this.ambientLight.color.setHex(0xd8b4fe);
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
      prism2Aligned: false,
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
    this.localRole = local;
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

    // Initial offset for remote
    this.remotePlayerMesh.group.position.set(this.playerPos.x + 2, this.playerPos.y, this.playerPos.z);
  }

  public updatePartnerState(state: PlayerNetState) {
    this.partnerNetState = state;
  }

  public updatePuzzleState(state: PuzzleState) {
    this.puzzleState = state;
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

    // Touch orbit on canvas
    dom.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length > 0) {
          const touch = e.touches[0];
          // Only right half of screen orbits camera
          if (touch.clientX > window.innerWidth / 2) {
            const dx = touch.clientX - (this.lastMouseX || touch.clientX);
            const dy = touch.clientY - (this.lastMouseY || touch.clientY);
            this.lastMouseX = touch.clientX;
            this.lastMouseY = touch.clientY;

            this.cameraYaw -= dx * 0.006;
            this.cameraPitch = Math.max(-0.25, Math.min(1.1, this.cameraPitch + dy * 0.006));
          }
        }
      },
      { passive: true }
    );

    dom.addEventListener('touchstart', (e) => {
      soundManager.userInteracted();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        if (touch.clientX > window.innerWidth / 2) {
          this.lastMouseX = touch.clientX;
          this.lastMouseY = touch.clientY;
        }
      }
    });
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
        // Landing on top
        if (this.playerPos.y >= maxY - 0.1 && nextPos.y <= maxY + 0.1 && this.playerVel.y <= 0) {
          nextPos.y = maxY;
          this.playerVel.y = 0;
          groundedThisFrame = true;
        } else if (nextPos.y < maxY && nextPos.y + playerHeight > minY) {
          // Horizontal wall pushback
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

    // Landing sound
    if (!this.isGrounded && groundedThisFrame) {
      soundManager.playLand();
    }
    this.isGrounded = groundedThisFrame;
    this.playerPos.copy(nextPos);

    // Abyss Fall Hazard Respawn
    const killY = this.currentStageId === 2 ? -6 : -12;
    if (this.playerPos.y < killY) {
      this.respawnAtCheckpoint();
    }

    // 3. Ability Trigger (F or Q or Touch Ability)
    const wantsAbility = this.keys['KeyF'] || this.keys['KeyQ'] || this.touchAbility;
    if (wantsAbility && this.abilityCooldown <= 0) {
      this.abilityActive = true;
      this.abilityCooldown = 0.5;
      soundManager.playAbility(this.localRole);

      // Character Ability Effects
      if (this.localRole === 'guardian') {
        // Shield projects solid bridge or deflects turret
        if (this.currentStageId === 1) {
          networkClient.triggerPuzzle('lightBridgeActive', true);
        } else if (this.currentStageId === 2) {
          networkClient.triggerPuzzle('turretShieldDeflected', true);
        }
      } else {
        // Explorer Spark Tether activates distant conduit
        if (this.currentStageId === 1 && this.puzzleState.heavyBlockPlaced) {
          networkClient.triggerPuzzle('aqueductElevatorHeight', 5.5);
        }
      }
    } else {
      if (this.abilityCooldown > 0) this.abilityCooldown -= dt;
      if (!wantsAbility) {
        this.abilityActive = false;
        if (this.localRole === 'guardian' && this.currentStageId === 1 && !this.puzzleState.bridgePedestalRotated) {
          networkClient.triggerPuzzle('lightBridgeActive', false);
        }
      }
    }

    // 4. Interactive Object Distance & Triggers
    this.checkInteractions();

    // 5. Update Animations
    const horizSpeed = Math.sqrt(this.playerVel.x * this.playerVel.x + this.playerVel.z * this.playerVel.z);
    if (!this.isGrounded) {
      this.currentAnim = this.playerVel.y > 0 ? 'jump' : 'fall';
    } else if (horizSpeed > 0.4) {
      this.currentAnim = isSprinting ? 'sprint' : 'run';
    } else if (this.abilityActive) {
      this.currentAnim = 'ability';
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

    // 6. Remote Player Smooth Interpolation
    if (this.remotePlayerMesh && this.partnerNetState) {
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

    // 7. Stage Update (Puzzles, animated meshes)
    this.currentStage.update(dt, this.puzzleState);

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

    // 1. Dynamic bounds update for moving interactive meshes
    for (const obj of this.currentStage.interactiveObjects) {
      if (obj.mesh) {
        obj.bounds.setFromCenterAndSize(
          obj.mesh.position,
          obj.type === 'heavy_block' ? new THREE.Vector3(3.2, 3.2, 3.2) :
          obj.type === 'pressure_plate' ? new THREE.Vector3(2.8, 2, 2.8) :
          new THREE.Vector3(2.8, 2.8, 2.8)
        );
      }
    }

    // 2. Strict Occupancy-based Pressure Plate Evaluation (Runs every frame)
    const remotePos = this.partnerNetState ? new THREE.Vector3(this.partnerNetState.x, this.partnerNetState.y, this.partnerNetState.z) : null;

    for (const obj of this.currentStage.interactiveObjects) {
      if (obj.type === 'pressure_plate') {
        const localDist = obj.bounds.distanceToPoint(this.playerPos);
        const localStanding = localDist < 1.6 || obj.bounds.containsPoint(this.playerPos);
        const remoteStanding = remotePos ? (obj.bounds.distanceToPoint(remotePos) < 1.6 || obj.bounds.containsPoint(remotePos)) : false;

        const isOccupied = localStanding || remoteStanding;

        // Stage 1 Gate Pressure Plate
        if (obj.id === 'plate_gate_1') {
          if (isOccupied !== !!this.puzzleState.gate1Open) {
            networkClient.triggerPuzzle('gate1Open', isOccupied);
            soundManager.playPressurePlate(isOccupied);
            this.callbacks.onCheckpointMessage(
              isOccupied ? '🟢 دکمه فشاری فعال شد (دروازه باز شد)' : '🔴 دکمه فشاری رها شد (دروازه بسته شد)'
            );
          }
        }

        // Campaign Stages Generic Pressure Plates
        if (obj.id.startsWith('pressure_plate_stage')) {
          const stageNum = this.currentStageId;
          const key = `platePressed_${stageNum}`;
          const currentVal = !!(this.puzzleState.customData && this.puzzleState.customData[key]);
          if (isOccupied !== currentVal) {
            networkClient.triggerPuzzle('customData', { ...this.puzzleState.customData, [key]: isOccupied });
            soundManager.playPressurePlate(isOccupied);
            this.callbacks.onCheckpointMessage(
              isOccupied ? `🟢 دکمه فشاری مرحله ${stageNum} فعال شد!` : `🔴 دکمه فشاری مرحله ${stageNum} آزاد شد.`
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
      }
    }

    // 3. Prompting & E-key Interaction Handling
    let nearestPrompt: string | null = null;
    let minPromptDist = 999;
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
        }

        // Discrete E-key interactions with debounced cooldown & bidirectional toggle
        if (wantsInteract && this.interactCooldown <= 0) {
          // Ancient Story Lore Tablets
          if (obj.id.startsWith('story_tablet_')) {
            soundManager.playCheckpoint();
            const loreTexts: Record<string, string> = {
              story_tablet_stage1: '📜 کتیبه باغ کهن: این باغ توسط الیاس ساخته شد. مکعب رسانا سنگ محکی از تیتان است؛ آن را روی پدستال بگذارید تا بالابر آبی فعال گردد.',
              story_tablet_stage2: '📜 کتیبه جزایر معلق: فقط سپر صیقلی حسن می‌تواند پرتو لیزر را منحرف کند تا نیوشا مدار را قطع نماید.',
              story_tablet_stage3: '📜 کتیبه کوره زمان: پیستون‌های کوبنده، ضربان قلب ساعت کیهان هستند. جعبه برنجی را زیر پیستون بگذارید تا مهار شود.',
              story_tablet_stage4: '📜 کتیبه معبد خورشید: منشورهای کریستال نوری انعکاسی از پیوند نیوشا و حسن هستند.',
              story_tablet_stage5: '📜 کتیبه هزارتوی گرانش: هر دو قهرمان باید روی مدارهای ضدجاذبه قرار گیرند تا پل نوری اثیری شکل گیرد.',
              story_tablet_stage6: '📜 کتیبه دژ ابدیت: هسته بلورین اِیتِر نیازمند تعادل عناصر است.',
            };
            this.callbacks.onCheckpointMessage(loreTexts[obj.id] || `📜 کتیبه راز باستانی مرحله ${this.currentStageId}`);
            this.interactCooldown = 0.5;
          }

          // Lever 1 Toggle
          if (obj.id === 'lever_1') {
            const nextVal = !this.puzzleState.lever1Activated;
            networkClient.triggerPuzzle('lever1Activated', nextVal);
            soundManager.playInteract();
            this.callbacks.onCheckpointMessage(nextVal ? '⚙️ اهرم کشیده شد (دروازه باز شد)' : '⚙️ اهرم بازگردانده شد (دروازه بسته شد)');
            this.interactCooldown = 0.35;
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

          // Permanent Bridge Anchor Toggle
          if (obj.id === 'explorer_bridge_anchor') {
            const nextVal = !this.puzzleState.bridgePedestalRotated;
            networkClient.triggerPuzzle('bridgePedestalRotated', nextVal);
            soundManager.playGateMove();
            this.callbacks.onCheckpointMessage(nextVal ? 'پل سنگی باستانی مستقر شد!' : 'پل سنگی جمع شد.');
            this.interactCooldown = 0.35;
          }

          // Stage 2 Moving Platform Crank Toggle
          if (obj.id === 'crank_island_bridge') {
            const nextVal = !this.puzzleState.floatingIslandBridgeActive;
            networkClient.triggerPuzzle('floatingIslandBridgeActive', nextVal);
            soundManager.playInteract();
            this.callbacks.onCheckpointMessage(nextVal ? 'اهرم سکوی پرنده فعال شد' : 'اهرم سکوی پرنده متوقف گردید');
            this.interactCooldown = 0.35;
          }

          // Stage 2 Sentinel Disruptor Toggle
          if (obj.id === 'disrupt_laser_turret') {
            const nextVal = !this.puzzleState.laserTurretDisabled;
            networkClient.triggerPuzzle('laserTurretDisabled', nextVal);
            soundManager.playInteract();
            this.callbacks.onCheckpointMessage(nextVal ? 'برجک لیزری غیرفعال شد!' : 'برجک لیزری مجدداً فعال شد!');
            this.interactCooldown = 0.35;
          }

          // Stage 3 Jamming Crate Toggle
          if (obj.id === 'clockwork_jam_crate' || obj.id === 'heavy_block') {
            const nextVal = !this.puzzleState.crusherJammed;
            networkClient.triggerPuzzle('crusherJammed', nextVal);
            soundManager.playInteract();
            this.callbacks.onCheckpointMessage(nextVal ? 'پیستون کوبنده مهار و متوقف شد!' : 'پیستون آزادسازی شد!');
            this.interactCooldown = 0.35;
          }

          // Stage 3 Synchronized Valves Toggle
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

          // Stage 4 Prisms Toggle
          if (obj.id === 'prism_pedestal_1') {
            const curr = !!(this.puzzleState.customData && this.puzzleState.customData.prism1Aligned);
            networkClient.triggerPuzzle('customData', { ...this.puzzleState.customData, prism1Aligned: !curr });
            soundManager.playInteract();
            this.callbacks.onCheckpointMessage(!curr ? 'منشور نوری ۱ با کانون خورشیدی تنظیم شد!' : 'منشور نوری ۱ به حالت اول بازگشت.');
            this.interactCooldown = 0.35;
          }
          if (obj.id === 'prism_pedestal_2') {
            const curr = !!(this.puzzleState.customData && this.puzzleState.customData.prism2Aligned);
            networkClient.triggerPuzzle('customData', { ...this.puzzleState.customData, prism2Aligned: !curr });
            soundManager.playInteract();
            this.callbacks.onCheckpointMessage(!curr ? 'منشور نوری ۲ تنظیم شد! دروازه خورشیدی باز شد.' : 'منشور نوری ۲ غیرفعال شد.');
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

        // Stage Exit Pads
        if (obj.type === 'portal_pad') {
          const isP1Pad = obj.id.includes('p1');
          const isP2Pad = obj.id.includes('p2');
          const isSolo = !networkClient.getRoomCode();

          if (isP1Pad && (this.localRole === 'explorer' || isSolo)) {
            const key = `stage${this.currentStageId}ExitP1Ready`;
            if (!(this.puzzleState as any)[key] && !(this.puzzleState.customData && this.puzzleState.customData[key])) {
              networkClient.triggerPuzzle(key, true);
              networkClient.triggerPuzzle('customData', { ...this.puzzleState.customData, [key]: true });
              soundManager.playPressurePlate(true);
              this.checkPortalWarp();
            }
          }
          if (isP2Pad && (this.localRole === 'guardian' || isSolo)) {
            const key = `stage${this.currentStageId}ExitP2Ready`;
            if (!(this.puzzleState as any)[key] && !(this.puzzleState.customData && this.puzzleState.customData[key])) {
              networkClient.triggerPuzzle(key, true);
              networkClient.triggerPuzzle('customData', { ...this.puzzleState.customData, [key]: true });
              soundManager.playPressurePlate(true);
              this.checkPortalWarp();
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

    this.callbacks.onInteractionPrompt(nearestPrompt);
  }

  private checkSynchronizedValves() {
    if (this.puzzleState.boilerValve1 && this.puzzleState.boilerValve2) {
      soundManager.playStageClear();
      this.callbacks.onCheckpointMessage('شیرهای بخار هماهنگ شدند! دروازه پورتال گشوده شد!');
    }
  }

  private checkPortalWarp() {
    const key1 = `stage${this.currentStageId}ExitP1Ready`;
    const key2 = `stage${this.currentStageId}ExitP2Ready`;

    const customP1 = !!(this.puzzleState.customData && this.puzzleState.customData[key1]);
    const customP2 = !!(this.puzzleState.customData && this.puzzleState.customData[key2]);

    const p1Ready = !!(this.puzzleState as any)[key1] || customP1;
    const p2Ready = !!(this.puzzleState as any)[key2] || customP2;

    // In solo practice mode, stepping on either pad or both triggers progress safely
    const isSolo = !networkClient.getRoomCode();

    if ((p1Ready && p2Ready) || (isSolo && (p1Ready || p2Ready))) {
      soundManager.playStageClear();
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
    // Calculate desired camera target position behind player
    const offset = new THREE.Vector3(
      Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance,
      Math.sin(this.cameraPitch) * this.cameraDistance + 1.6,
      Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance
    );

    const targetCamPos = this.playerPos.clone().add(offset);
    const lookAtPos = this.playerPos.clone().add(new THREE.Vector3(0, 1.4, 0));

    // Smooth spring follow
    this.camera.position.lerp(targetCamPos, Math.min(1, dt * 10));
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
