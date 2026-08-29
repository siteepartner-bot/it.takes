import * as THREE from 'three';
import type { PuzzleState } from '../../types.ts';
import type { StageBuildResult, InteractiveObject } from './gardenStage.ts';

export interface CheckpointItem {
  id: number;
  pos: [number, number, number];
  active: boolean;
  mesh: THREE.Object3D;
  bounds: THREE.Box3;
}

/**
 * Helper to construct a Stateful Door / Drawbridge in 3D
 */
class StatefulBridge {
  public mesh: THREE.Object3D;
  public startRotX: number;
  public targetRotX: number;
  public currentRotX: number;

  constructor(mesh: THREE.Object3D, closedRotX: number, openRotX: number) {
    this.mesh = mesh;
    this.startRotX = closedRotX;
    this.targetRotX = closedRotX;
    this.currentRotX = closedRotX;
    this.mesh.rotation.x = closedRotX;
  }

  public setTarget(open: boolean, openAngle?: number) {
    this.targetRotX = open ? (openAngle ?? this.startRotX - Math.PI / 2) : this.startRotX;
  }

  public update(dt: number) {
    if (Math.abs(this.currentRotX - this.targetRotX) > 0.005) {
      const step = Math.sign(this.targetRotX - this.currentRotX) * dt * 1.5;
      this.currentRotX += step;
      if (
        (step > 0 && this.currentRotX > this.targetRotX) ||
        (step < 0 && this.currentRotX < this.targetRotX)
      ) {
        this.currentRotX = this.targetRotX;
      }
      this.mesh.rotation.x = this.currentRotX;
    }
  }
}

/**
 * STAGE 5: LOST BRIDGES (پل‌های گم‌شده)
 * Handcrafted Co-op Stage featuring:
 * 1. Watchtower observation deck with top-down visual cues
 * 2. Bridge maze with safe vs trap pathways
 * 3. Reverse cooperation drawbridge lever
 * 4. Triple controlled platforms with safety grace period and deadlock prevention
 * 5. Reverse cooperation main bridge lever
 * 6. Dual exit portal pads
 */
export function buildLostBridgesStage(): StageBuildResult {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'stage_lost_bridges';

  const colliders: THREE.Box3[] = [];
  const interactiveObjects: InteractiveObject[] = [];

  // --- Materials ---
  const woodenPlankMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.7,
    metalness: 0.1,
  });

  const watchtowerWoodMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.8,
    metalness: 0.1,
  });

  const carvedRockMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.9,
    metalness: 0.1,
  });

  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.8,
    roughness: 0.2,
  });

  const brassGearMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    metalness: 0.8,
    roughness: 0.3,
  });

  const runeMatA = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.8,
    metalness: 0.3,
    roughness: 0.2,
  });

  const runeMatB = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.8,
    metalness: 0.3,
    roughness: 0.2,
  });

  const lanternGlassMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.2,
  });

  const trapWoodMat = new THREE.MeshStandardMaterial({
    color: 0x57534e,
    roughness: 0.9,
    wireframe: false,
  });

  const ceilingMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.9,
  });

  // Helper box creator
  function helperAddBox(
    size: [number, number, number],
    pos: [number, number, number],
    mat: THREE.Material,
    addCollider = true
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
    mesh.position.set(...pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rootGroup.add(mesh);
    if (addCollider) {
      colliders.push(new THREE.Box3().setFromObject(mesh));
    }
    return mesh;
  }

  // Checkpoints List
  const checkpoints: CheckpointItem[] = [];
  const cpGeo = new THREE.CylinderGeometry(1.8, 2.0, 0.2, 16);
  const cpMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0369a1,
    emissiveIntensity: 0.5,
  });

  function createCheckpoint(id: number, pos: [number, number, number]): CheckpointItem {
    const mesh = new THREE.Mesh(cpGeo, cpMat);
    mesh.position.set(pos[0], pos[1] - 0.1, pos[2]);
    rootGroup.add(mesh);
    const bounds = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(...pos),
      new THREE.Vector3(4, 3, 4)
    );
    return { id, pos, active: id === 0, mesh, bounds };
  }

  // CP 0: Entrance Plaza
  checkpoints.push(createCheckpoint(0, [0, 1.2, 3]));
  // CP 1: Watchtower Observation Deck / Canyon Entrance
  checkpoints.push(createCheckpoint(1, [-12, 10.8, 32]));
  // CP 2: Far Side Plaza (After bridge maze)
  checkpoints.push(createCheckpoint(2, [0, 1.2, 68]));
  // CP 3: Final Exit Sanctuary
  checkpoints.push(createCheckpoint(3, [0, 1.2, 120]));

  // =========================================================================
  // 1. SECTION 1: CANYON ENTRANCE & PATH SPLIT (z: 0 to 22)
  // =========================================================================
  helperAddBox([20, 1, 22], [0, -0.5, 11], woodenPlankMat);
  helperAddBox([1.2, 8, 22], [-10.0, 4, 11], carvedRockMat);
  helperAddBox([1.2, 8, 22], [10.0, 4, 11], carvedRockMat);

  // Decorative Entry Arch & Lanterns
  const entryArch = helperAddBox([18, 1.5, 1.2], [0, 7.5, 1], carvedRockMat);
  const lanternL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.6), lanternGlassMat);
  lanternL.position.set(-6, 5.0, 1.5);
  rootGroup.add(lanternL);

  const lanternR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.6), lanternGlassMat);
  lanternR.position.set(6, 5.0, 1.5);
  rootGroup.add(lanternR);

  // Story Tablet
  const tabletGeo = new THREE.CylinderGeometry(0.5, 0.6, 1.2, 12);
  const tabletMesh = new THREE.Mesh(tabletGeo, goldTrimMat);
  tabletMesh.position.set(0, 0.6, 6);
  rootGroup.add(tabletMesh);

  interactiveObjects.push({
    id: 'story_tablet_stage5',
    type: 'lore_tablet',
    mesh: tabletMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(tabletMesh.position, new THREE.Vector3(2.5, 2, 2.5)),
    prompt: 'خواندن کتیبه پل‌های گم‌شده (کلید E)',
  });

  // Stairs up Left to Watchtower Base
  for (let i = 0; i < 8; i++) {
    helperAddBox([3.0, 0.4, 1.2], [-6 - i * 0.75, 0.2 + i * 0.4, 16 + i * 0.8], watchtowerWoodMat);
  }

  // =========================================================================
  // 2. SECTION 2: WATCHTOWER STRUCTURE (x: -15 to -9, z: 24 to 40, y: 0 to 14)
  // =========================================================================
  // Watchtower 4 Corner Pillars
  const pillarGeo = new THREE.CylinderGeometry(0.4, 0.5, 12, 12);
  const p1 = new THREE.Mesh(pillarGeo, watchtowerWoodMat); p1.position.set(-15, 6, 26); rootGroup.add(p1);
  const p2 = new THREE.Mesh(pillarGeo, watchtowerWoodMat); p2.position.set(-9, 6, 26); rootGroup.add(p2);
  const p3 = new THREE.Mesh(pillarGeo, watchtowerWoodMat); p3.position.set(-15, 6, 38); rootGroup.add(p3);
  const p4 = new THREE.Mesh(pillarGeo, watchtowerWoodMat); p4.position.set(-9, 6, 38); rootGroup.add(p4);

  // Observation Deck Floor at y: 10.0
  const deckMesh = helperAddBox([8, 0.8, 14], [-12, 9.6, 32], watchtowerWoodMat);

  // Decorative Roof Canopy
  const roofMesh = helperAddBox([9, 0.6, 15], [-12, 14.0, 32], carvedRockMat, false);
  const topBeacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 2), lanternGlassMat);
  topBeacon.position.set(-12, 15.2, 32);
  rootGroup.add(topBeacon);

  // Watchtower Map Tablet on Observation Deck
  const towerMapMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.8), goldTrimMat);
  towerMapMesh.position.set(-12, 10.4, 30);
  rootGroup.add(towerMapMesh);

  interactiveObjects.push({
    id: 'tablet_watchtower',
    type: 'lore_tablet',
    mesh: towerMapMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(towerMapMesh.position, new THREE.Vector3(2.5, 2, 2.5)),
    prompt: 'دیدن راهنمای دیده‌بانی برج (کلید E)',
  });

  // =========================================================================
  // 3. SECTION 3: CANYON & BRIDGE MAZE (x: 0 to 12, z: 24 to 62)
  // =========================================================================
  // Deep Canyon Chasm Floor (Far below y = -10 for visuals)
  const canyonBottomMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 1.0 });
  helperAddBox([30, 1, 50], [0, -12, 45], canyonBottomMat, false);

  // Canyon Side Cliff Walls
  helperAddBox([1.2, 14, 42], [-1.0, 3, 43], carvedRockMat);
  helperAddBox([1.2, 14, 42], [13.0, 3, 43], carvedRockMat);

  // --- Row 1 (z = 32) ---
  // Left Bridge 1 (x: 3) -> TRAP Bridge
  const trap1 = helperAddBox([3.2, 0.4, 6], [3, -0.2, 32], trapWoodMat, false);
  // Right Bridge 1 (x: 9) -> SAFE Static Bridge
  const safeBridge1 = helperAddBox([3.5, 0.5, 6], [9, -0.2, 32], woodenPlankMat);
  
  // High Pillar with Safe Rune 1 (Visible ONLY from Watchtower deck y = 10)
  const pillar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 3.5, 12), carvedRockMat);
  pillar1.position.set(9, -2.0, 32);
  rootGroup.add(pillar1);
  const rune1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 2), runeMatA);
  rune1.position.set(9, 0.4, 32); // Recessed in niche
  rootGroup.add(rune1);

  // --- Row 2 (z = 42) ---
  // Left Bridge 2 (x: 3) -> SAFE Oscillating Moving Bridge
  const safeBridge2Mesh = helperAddBox([3.5, 0.5, 6], [3, -0.2, 42], woodenPlankMat, false);
  const safeBridge2Collider = new THREE.Box3().setFromObject(safeBridge2Mesh);
  colliders.push(safeBridge2Collider);

  const rune2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 2), runeMatB);
  rune2.position.set(3, 0.4, 42);
  rootGroup.add(rune2);

  // Right Bridge 2 (x: 9) -> TRAP Bridge
  helperAddBox([3.2, 0.4, 6], [9, -0.2, 42], trapWoodMat, false);

  // --- Row 3 (z = 52) ---
  // Left Bridge 3 (x: 3) -> TRAP
  helperAddBox([3.2, 0.4, 6], [3, -0.2, 52], trapWoodMat, false);

  // Middle Bridge 3 (x: 6) -> SAFE Timed Pulsing Platform
  const safeBridge3Mesh = helperAddBox([3.5, 0.5, 6], [6, -0.2, 52], woodenPlankMat);
  const rune3 = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 2), runeMatA);
  rune3.position.set(6, 0.4, 52);
  rootGroup.add(rune3);

  // --- Far Side Plaza (z: 62 to 70) ---
  helperAddBox([22, 1, 12], [0, -0.5, 66], woodenPlankMat);

  // --- REVERSE DRAWBRIDGE 1 (From Watchtower Deck to Far Side Plaza) ---
  const drawbridge1Group = new THREE.Group();
  drawbridge1Group.position.set(-12, 9.6, 32);
  
  const drawbridge1Planks = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.4, 36.0), woodenPlankMat);
  drawbridge1Planks.position.set(6.0, 0, 18.0); // Extending down towards (0, 0, 68)
  drawbridge1Planks.castShadow = true;
  drawbridge1Group.add(drawbridge1Planks);
  rootGroup.add(drawbridge1Group);

  const statefulDrawbridge1 = new StatefulBridge(drawbridge1Group, -Math.PI / 2.5, 0.22);

  // Reverse Lever 1 (on Far Side Plaza at x: 6, z: 64)
  const lever1BaseGeo = new THREE.CylinderGeometry(0.6, 0.8, 0.8, 16);
  const lever1Mesh = new THREE.Mesh(lever1BaseGeo, goldTrimMat);
  lever1Mesh.position.set(6, 0.4, 64);
  rootGroup.add(lever1Mesh);

  interactiveObjects.push({
    id: 'lever_stage5_reverse1',
    type: 'lever',
    mesh: lever1Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(lever1Mesh.position, new THREE.Vector3(2.5, 2, 2.5)),
    prompt: 'پایین آوردن پل برج دیده‌بانی برای هم‌تیمی (کلید E)',
  });

  // =========================================================================
  // 4. SECTION 4: TRIPLE CONTROLLED PLATFORMS & CHASM (z: 70 to 118)
  // =========================================================================
  // Chasm Side Walls & Deep Pit
  helperAddBox([32, 1, 48], [0, -12, 94], canyonBottomMat, false);
  helperAddBox([1.2, 14, 48], [-11.0, 3, 94], carvedRockMat);
  helperAddBox([1.2, 14, 48], [11.0, 3, 94], carvedRockMat);

  // Near Side Control Station Plaza (z: 70 to 76)
  helperAddBox([22, 1, 8], [0, -0.5, 72], woodenPlankMat);

  // Control Station Desk & 3 Control Levers
  const deskMesh = helperAddBox([6, 1.0, 1.2], [-6, 0.5, 72], watchtowerWoodMat);

  const ctrl1Mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.8, 12), runeMatA);
  ctrl1Mesh.position.set(-8, 1.2, 72); rootGroup.add(ctrl1Mesh);
  interactiveObjects.push({
    id: 'lever_stage5_ctrl1',
    type: 'lever',
    mesh: ctrl1Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(ctrl1Mesh.position, new THREE.Vector3(2.0, 2, 2.0)),
    prompt: 'فعال‌سازی سکوی ۱ (کلید E)',
  });

  const ctrl2Mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.8, 12), goldTrimMat);
  ctrl2Mesh.position.set(-6, 1.2, 72); rootGroup.add(ctrl2Mesh);
  interactiveObjects.push({
    id: 'lever_stage5_ctrl2',
    type: 'lever',
    mesh: ctrl2Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(ctrl2Mesh.position, new THREE.Vector3(2.0, 2, 2.0)),
    prompt: 'فعال‌سازی سکوی ۲ (کلید E)',
  });

  const ctrl3Mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.8, 12), runeMatB);
  ctrl3Mesh.position.set(-4, 1.2, 72); rootGroup.add(ctrl3Mesh);
  interactiveObjects.push({
    id: 'lever_stage5_ctrl3',
    type: 'lever',
    mesh: ctrl3Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(ctrl3Mesh.position, new THREE.Vector3(2.0, 2, 2.0)),
    prompt: 'فعال‌سازی سکوی ۳ (کلید E)',
  });

  // --- 3 CONTROLLED PLATFORMS ---
  // Platform 1: x: -5, z: 82
  const p1Mesh = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.8, 5.0), woodenPlankMat);
  p1Mesh.position.set(-5, -6.0, 82); // Initial retracted y position
  p1Mesh.castShadow = true; p1Mesh.receiveShadow = true;
  rootGroup.add(p1Mesh);
  const p1Collider = new THREE.Box3().setFromObject(p1Mesh);
  colliders.push(p1Collider);

  // Platform 2: x: 0, z: 92
  const p2Mesh = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.8, 5.0), woodenPlankMat);
  p2Mesh.position.set(0, -6.0, 92);
  p2Mesh.castShadow = true; p2Mesh.receiveShadow = true;
  rootGroup.add(p2Mesh);
  const p2Collider = new THREE.Box3().setFromObject(p2Mesh);
  colliders.push(p2Collider);

  // Platform 3: x: 5, z: 102
  const p3Mesh = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.8, 5.0), woodenPlankMat);
  p3Mesh.position.set(5, -6.0, 102);
  p3Mesh.castShadow = true; p3Mesh.receiveShadow = true;
  rootGroup.add(p3Mesh);
  const p3Collider = new THREE.Box3().setFromObject(p3Mesh);
  colliders.push(p3Collider);

  // Destination Plaza (z: 112 to 120)
  helperAddBox([22, 1, 10], [0, -0.5, 116], woodenPlankMat);

  // --- REVERSE MAIN BRIDGE (Across Chasm z: 74 to 114) ---
  const mainBridgeMesh = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.6, 40.0), woodenPlankMat);
  mainBridgeMesh.position.set(0, -8.0, 94); // Hidden below initially
  mainBridgeMesh.castShadow = true;
  rootGroup.add(mainBridgeMesh);
  const mainBridgeCollider = new THREE.Box3().setFromObject(mainBridgeMesh);
  colliders.push(mainBridgeCollider);

  // Reverse Lever 2 (on Destination Plaza at x: 5, z: 116)
  const lever2Mesh = new THREE.Mesh(lever1BaseGeo, goldTrimMat);
  lever2Mesh.position.set(5, 0.4, 116);
  rootGroup.add(lever2Mesh);

  interactiveObjects.push({
    id: 'lever_stage5_reverse2',
    type: 'lever',
    mesh: lever2Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(lever2Mesh.position, new THREE.Vector3(2.5, 2, 2.5)),
    prompt: 'پایین آوردن پل اصلی برای هم‌تیمی (کلید E)',
  });

  // =========================================================================
  // 5. SECTION 5: SHARED EXIT SANCTUARY & PORTALS (z: 120 to 138)
  // =========================================================================
  helperAddBox([22, 1, 18], [0, -0.5, 129], woodenPlankMat);
  helperAddBox([22, 1, 18], [0, 8.2, 129], ceilingMat);
  helperAddBox([1.2, 8, 18], [-11.0, 4, 129], carvedRockMat);
  helperAddBox([1.2, 8, 18], [11.0, 4, 129], carvedRockMat);
  helperAddBox([22, 8, 1.2], [0, 4, 138], carvedRockMat); // Far Back Wall

  // Exit Portal Base Pad
  const portalBaseGeo = new THREE.CylinderGeometry(2.5, 2.8, 0.3, 24);
  const portalBaseMesh = new THREE.Mesh(portalBaseGeo, goldTrimMat);
  portalBaseMesh.position.set(0, 0.15, 130);
  rootGroup.add(portalBaseMesh);

  const exitPad1 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.2, 16), runeMatA);
  exitPad1.position.set(-1.8, 0.25, 130);
  rootGroup.add(exitPad1);

  const exitPad2 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.2, 16), runeMatB);
  exitPad2.position.set(1.8, 0.25, 130);
  rootGroup.add(exitPad2);

  interactiveObjects.push({
    id: 'portal_p1_stage5',
    type: 'portal_pad',
    mesh: exitPad1,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-1.8, 0.5, 130), new THREE.Vector3(2.2, 2, 2.2)),
    targetRole: 'explorer',
    prompt: 'ایستادن روی پورتال خروج نیوشا',
  });

  interactiveObjects.push({
    id: 'portal_p2_stage5',
    type: 'portal_pad',
    mesh: exitPad2,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(1.8, 0.5, 130), new THREE.Vector3(2.2, 2, 2.2)),
    targetRole: 'guardian',
    prompt: 'ایستادن روی پورتال خروج حسن',
  });

  // --- Runtime Internal State variables for Grace Period & Platform Heights ---
  let p1TargetY = -6.0;
  let p2TargetY = -6.0;
  let p3TargetY = -6.0;

  let p1GraceTimer = 0;
  let p2GraceTimer = 0;
  let p3GraceTimer = 0;

  let bridgeOscillateTime = 0;

  return {
    rootGroup,
    colliders,
    interactiveObjects,
    spawnPoint: [0, 1.2, 3],
    checkpoints,
    update: (dt: number, state: PuzzleState) => {
      const customData = state.customData || {};

      // 1. Update Section 3 Oscillating Safe Bridge 2
      bridgeOscillateTime += dt * 1.5;
      const oscX = 3.0 + Math.sin(bridgeOscillateTime) * 2.2;
      safeBridge2Mesh.position.x = oscX;
      rune2.position.x = oscX;
      safeBridge2Collider.setFromObject(safeBridge2Mesh);

      // 2. Update Section 3 Drawbridge 1
      const isDrawbridge1Lowered = !!customData.stage5WatchtowerBridgeLowered;
      statefulDrawbridge1.setTarget(isDrawbridge1Lowered);
      statefulDrawbridge1.update(dt);

      // 3. Update Section 4 Controlled Platforms & Safety Engine
      const activeCtrlTarget = typeof customData.stage5ControlTarget === 'number' ? customData.stage5ControlTarget : 0;

      // Decrement Grace timers
      if (p1GraceTimer > 0) p1GraceTimer -= dt;
      if (p2GraceTimer > 0) p2GraceTimer -= dt;
      if (p3GraceTimer > 0) p3GraceTimer -= dt;

      // Platform 1 Target Y Logic
      if (activeCtrlTarget === 1 || p1GraceTimer > 0) {
        p1TargetY = -0.4; // Extended active level
      } else {
        p1TargetY = -6.0; // Retracted
      }

      // Platform 2 Target Y Logic
      if (activeCtrlTarget === 2 || p2GraceTimer > 0) {
        p2TargetY = -0.4;
      } else {
        p2TargetY = -6.0;
      }

      // Platform 3 Target Y Logic
      if (activeCtrlTarget === 3 || p3GraceTimer > 0) {
        p3TargetY = -0.4;
      } else {
        p3TargetY = -6.0;
      }

      // Smooth interpolations for Platform 1
      if (Math.abs(p1Mesh.position.y - p1TargetY) > 0.01) {
        p1Mesh.position.y += Math.sign(p1TargetY - p1Mesh.position.y) * dt * 4.0;
        p1Collider.setFromObject(p1Mesh);
      }

      // Smooth interpolations for Platform 2
      if (Math.abs(p2Mesh.position.y - p2TargetY) > 0.01) {
        p2Mesh.position.y += Math.sign(p2TargetY - p2Mesh.position.y) * dt * 4.0;
        p2Collider.setFromObject(p2Mesh);
      }

      // Smooth interpolations for Platform 3
      if (Math.abs(p3Mesh.position.y - p3TargetY) > 0.01) {
        p3Mesh.position.y += Math.sign(p3TargetY - p3Mesh.position.y) * dt * 4.0;
        p3Collider.setFromObject(p3Mesh);
      }

      // 4. Update Section 4 Main Bridge (When Reverse Lever 2 is activated)
      const isMainBridgeUnlocked = !!customData.stage5MainBridgeUnlocked;
      const mainTargetY = isMainBridgeUnlocked ? -0.3 : -8.0;
      if (Math.abs(mainBridgeMesh.position.y - mainTargetY) > 0.01) {
        mainBridgeMesh.position.y += Math.sign(mainTargetY - mainBridgeMesh.position.y) * dt * 3.0;
        mainBridgeCollider.setFromObject(mainBridgeMesh);
      }
    },
    dispose: () => {
      rootGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });
    },
  };
}
