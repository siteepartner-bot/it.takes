import * as THREE from 'three';
import { networkClient } from '../multiplayer/networkClient.ts';
import { soundManager } from '../audio/soundManager.ts';
import { createCharacterMesh, type CharacterControllerMesh } from './characterModel.ts';
import { buildGardenStage, type StageBuildResult, type InteractiveObject } from './stages/gardenStage.ts';
import { buildFloatingIslandsStage } from './stages/floatingIslandsStage.ts';
import { buildClockworkStage } from './stages/clockworkStage.ts';
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

    if (stageId === 1) {
      this.currentStage = buildGardenStage();
      this.scene.background = new THREE.Color(0x13271a);
      this.scene.fog = new THREE.FogExp2(0x13271a, 0.018);
      this.sunLight.color.setHex(0xfef08a);
      this.ambientLight.color.setHex(0xdcfce7);
    } else if (stageId === 2) {
      this.currentStage = buildFloatingIslandsStage();
      this.scene.background = new THREE.Color(0x0284c7);
      this.scene.fog = new THREE.FogExp2(0x38bdf8, 0.012);
      this.sunLight.color.setHex(0xffffff);
      this.ambientLight.color.setHex(0xe0f2fe);
    } else {
      this.currentStage = buildClockworkStage();
      this.scene.background = new THREE.Color(0x1c1917);
      this.scene.fog = new THREE.FogExp2(0x292524, 0.022);
      this.sunLight.color.setHex(0xfbbf24);
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
    this.localPlayerMesh.setNametag(this.localRole === 'explorer' ? 'Kaelen' : 'Bram', true);
    this.scene.add(this.localPlayerMesh.group);

    this.remotePlayerMesh = createCharacterMesh(remoteRole);
    this.remotePlayerMesh.setNametag(remoteRole === 'explorer' ? 'Kaelen' : 'Bram', false);
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
        this.callbacks.onCheckpointMessage(`تعویض به: ${this.localRole === 'explorer' ? 'کاوشگر (کایلِن)' : 'نگهبان (بِرام)'}`);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Mouse camera orbit
    const dom = this.renderer.domElement;
    dom.addEventListener('mousedown', (e) => {
      soundManager.userInteracted();
      this.isMouseDown = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
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

    let nearestPrompt: string | null = null;
    const wantsInteract = this.keys['KeyE'] || this.touchInteract;

    for (const obj of this.currentStage.interactiveObjects) {
      const dist = obj.bounds.distanceToPoint(this.playerPos);

      if (dist < 2.4) {
        // Filter by role if specific
        if (obj.targetRole && obj.targetRole !== 'both' && obj.targetRole !== this.localRole) {
          continue;
        }

        nearestPrompt = obj.prompt;

        // Continuous pressure plate detection
        if (obj.type === 'pressure_plate') {
          if (obj.id === 'plate_gate_1' && !this.puzzleState.gate1Open) {
            networkClient.triggerPuzzle('gate1Open', true);
            soundManager.playPressurePlate(true);
          }
        }

        // Discrete E-key interactions
        if (wantsInteract) {
          // Lever 1
          if (obj.id === 'lever_1' && !this.puzzleState.lever1Activated) {
            networkClient.triggerPuzzle('lever1Activated', true);
            soundManager.playInteract();
            this.callbacks.onCheckpointMessage('دروازه کهن برای همیشه قفل‌گشایی شد!');
          }

          // Heavy Block
          if (obj.id === 'heavy_block_1' && this.localRole === 'guardian' && !this.puzzleState.heavyBlockPlaced) {
            networkClient.triggerPuzzle('heavyBlockPlaced', true);
            soundManager.playInteract();
            this.callbacks.onCheckpointMessage('بلوک سنگین رسانا مستقر شد! بالابر فعال گردید.');
          }

          // Permanent Bridge Anchor
          if (obj.id === 'explorer_bridge_anchor' && this.localRole === 'explorer' && !this.puzzleState.bridgePedestalRotated) {
            networkClient.triggerPuzzle('bridgePedestalRotated', true);
            soundManager.playGateMove();
            this.callbacks.onCheckpointMessage('پل سنگی باستانی مستقر و فرود آمد!');
          }

          // Stage 2 Moving Platform Crank
          if (obj.id === 'crank_island_bridge') {
            networkClient.triggerPuzzle('floatingIslandBridgeActive', true);
            soundManager.playInteract();
          }

          // Stage 2 Sentinel Disruptor
          if (obj.id === 'disrupt_laser_turret' && this.localRole === 'explorer') {
            networkClient.triggerPuzzle('laserTurretDisabled', true);
            soundManager.playInteract();
            this.callbacks.onCheckpointMessage('برجک لیزری نگهبان غیرفعال شد!');
          }

          // Stage 3 Jamming Crate
          if (obj.id === 'clockwork_jam_crate' && this.localRole === 'guardian' && !this.puzzleState.crusherJammed) {
            networkClient.triggerPuzzle('crusherJammed', true);
            soundManager.playInteract();
            this.callbacks.onCheckpointMessage('پیستون کوبنده مهار و متوقف شد!');
          }

          // Stage 3 Synchronized Valves
          if (obj.id === 'boiler_valve_1') {
            networkClient.triggerPuzzle('boilerValve1', true);
            soundManager.playInteract();
            this.checkSynchronizedValves();
          }
          if (obj.id === 'boiler_valve_2') {
            networkClient.triggerPuzzle('boilerValve2', true);
            soundManager.playInteract();
            this.checkSynchronizedValves();
          }
        }

        // Stage Exit Pads
        if (obj.type === 'portal_pad') {
          const isP1Pad = obj.id.includes('p1');
          const isP2Pad = obj.id.includes('p2');

          if (isP1Pad && this.localRole === 'explorer') {
            const key = `stage${this.currentStageId}ExitP1Ready`;
            if (!(this.puzzleState as any)[key]) {
              networkClient.triggerPuzzle(key, true);
              soundManager.playPressurePlate(true);
              this.checkPortalWarp();
            }
          }
          if (isP2Pad && this.localRole === 'guardian') {
            const key = `stage${this.currentStageId}ExitP2Ready`;
            if (!(this.puzzleState as any)[key]) {
              networkClient.triggerPuzzle(key, true);
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

    // If both ready (or in solo mode if player steps on pad)
    if ((this.puzzleState as any)[key1] && (this.puzzleState as any)[key2]) {
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

  public destroy() {
    this.stop();
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
