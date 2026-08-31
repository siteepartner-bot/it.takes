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
 * 1. Open Watchtower observation deck with top-down visual cues
 * 2. Unobstructed canyon view and bridge maze with glowing rune pillars on safe paths
 * 3. Smooth unobstructed staircase to Watchtower deck
 * 4. Bright, rich lighting throughout the stage
 * 5. Reverse cooperation drawbridge lever & triple controlled platforms with safety grace period
 */
export function buildLostBridgesStage(): StageBuildResult {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'stage_lost_bridges';

  const colliders: THREE.Box3[] = [];
  const interactiveObjects: InteractiveObject[] = [];

  // =========================================================================
  // LIGHTING SYSTEM (Bright, rich illumination)
  // =========================================================================
  const ambLight = new THREE.AmbientLight(0xffffff, 1.2);
  rootGroup.add(ambLight);

  const dirLight = new THREE.DirectionalLight(0xfffaed, 0.8);
  dirLight.position.set(10, 30, 20);
  rootGroup.add(dirLight);

  // Helper for adding ambient stage lights
  function addStageLight(pos: [number, number, number], color: number, intensity: number, distance: number): THREE.PointLight {
    const light = new THREE.PointLight(color, intensity, distance);
    light.position.set(...pos);
    rootGroup.add(light);
    return light;
  }

  addStageLight([0, 6, 4], 0xf59e0b, 2.0, 25); // Entrance Light
  addStageLight([-12, 10, 32], 0x38bdf8, 2.5, 30); // Watchtower Deck Light
  addStageLight([5, 4, 42], 0xf59e0b, 1.5, 25); // Central Bridges Light
  addStageLight([-5, 5, 72], 0xf59e0b, 2.0, 25); // Control Station Light
  addStageLight([0, 6, 128], 0x38bdf8, 2.5, 30); // Exit Sanctuary Light

  // --- Materials ---
  const woodenPlankMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.6,
    metalness: 0.1,
  });

  const watchtowerWoodMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.7,
    metalness: 0.1,
  });

  const carvedRockMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.8,
    metalness: 0.1,
  });

  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.8,
    roughness: 0.2,
  });

  const runeMatA = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 1.2,
    metalness: 0.3,
    roughness: 0.1,
  });

  const runeMatB = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 1.2,
    metalness: 0.3,
    roughness: 0.1,
  });

  const lanternGlassMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.5,
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
  const cpGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.02, 24);
  const cpMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0369a1,
    emissiveIntensity: 0.8,
  });

  function createCheckpoint(id: number, pos: [number, number, number]): CheckpointItem {
    const mesh = new THREE.Mesh(cpGeo, cpMat);
    mesh.position.set(pos[0], pos[1] - 1.18, pos[2]);
    if (id === 0) {
      mesh.visible = false; // Hide CP 0 mesh at spawn so no big blue circle wraps around character
    }
    rootGroup.add(mesh);
    const bounds = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(...pos),
      new THREE.Vector3(4, 3, 4)
    );
    return { id, pos, active: id === 0, mesh, bounds };
  }

  // CP 0: Entrance Plaza
  checkpoints.push(createCheckpoint(0, [0, 1.2, 3]));
  // CP 1: Watchtower Observation Deck
  checkpoints.push(createCheckpoint(1, [-12, 16.2, 32]));
  // CP 2: Far Side Plaza (After bridge maze)
  checkpoints.push(createCheckpoint(2, [0, 1.2, 68]));
  // CP 3: Final Exit Sanctuary
  checkpoints.push(createCheckpoint(3, [0, 1.2, 120]));

  // Orange floor material for the watchtower & stairs corridor side
  const orangeFloorMat = new THREE.MeshStandardMaterial({
    color: 0xea580c, // Rich orange color
    roughness: 0.7,
    metalness: 0.1,
  });

  // =========================================================================
  // 1. SECTION 1: CANYON ENTRANCE & OPEN PLAZA (z: 0 to 28)
  // =========================================================================
  // Main Entrance Floor (Canyon side: x: -2 to 14, center x = 6.0)
  helperAddBox([16, 1, 28], [6.0, -0.5, 14], woodenPlankMat);

  // Watchtower & Stairs Corridor Orange Floor (x: -18 to -2, center x = -10.0, stops exactly at dividing wall!)
  helperAddBox([16, 1, 28], [-10.0, -0.5, 14], orangeFloorMat);

  // Outer Right Wall only (x = 13)
  helperAddBox([1.2, 12, 28], [13.0, 6, 14], carvedRockMat);

  // Outer Left Boundary Wall (x = -18)
  helperAddBox([1.2, 12, 28], [-18.0, 6, 14], carvedRockMat);

  // Decorative Entry Arch & Lanterns
  helperAddBox([24, 1.5, 1.2], [-3, 7.5, 1], carvedRockMat);
  const lanternL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.6), lanternGlassMat);
  lanternL.position.set(-8, 5.0, 1.5);
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

  // =========================================================================
  // SMOOTH UNOBSTRUCTED STAIRCASE TO HIGH WATCHTOWER OBSERVATION DECK
  // =========================================================================
  // Neat, perfectly walkable staircase at x: -12 from z: 4.0 to z: 28.0 (y: 0.0 to 15.0)
  // 40 steps, step height = 0.375m, step depth = 0.6m.
  // Each step is a solid column down to y=0 with NO overlapping blocking ramp box!
  const stairCount = 40;
  const startZ = 4.0;
  const endZ = 28.0;
  const startY = 0.0;
  const endY = 15.0;

  for (let i = 0; i < stairCount; i++) {
    const progress = (i + 1) / stairCount;
    const curY = startY + progress * (endY - startY); // top surface of step
    const curZ = startZ + i * ((endZ - startZ) / stairCount) + 0.3;
    // Solid step pillar from ground y=0 up to curY
    helperAddBox([4.5, curY, 0.65], [-12.0, curY / 2, curZ], watchtowerWoodMat, true);
  }

  // Staircase Guard Railing (Left outer wall x: -14.8)
  helperAddBox([0.4, 6.0, endZ - startZ + 2.0], [-14.8, 8.0, (startZ + endZ) / 2], carvedRockMat);

  // =========================================================================
  // 2. SECTION 2: TALL WATCHTOWER STRUCTURE (x: -16 to -8, z: 27 to 37, y: 0 to 20)
  // =========================================================================
  // Watchtower 4 Corner Pillars
  const pillarGeo = new THREE.CylinderGeometry(0.5, 0.6, 18, 12);
  const p1 = new THREE.Mesh(pillarGeo, watchtowerWoodMat); p1.position.set(-16, 9, 27); rootGroup.add(p1);
  const p2 = new THREE.Mesh(pillarGeo, watchtowerWoodMat); p2.position.set(-8, 9, 27); rootGroup.add(p2);
  const p3 = new THREE.Mesh(pillarGeo, watchtowerWoodMat); p3.position.set(-16, 9, 37); rootGroup.add(p3);
  const p4 = new THREE.Mesh(pillarGeo, watchtowerWoodMat); p4.position.set(-8, 9, 37); rootGroup.add(p4);

  // Observation Deck Floor at y: 15.0
  helperAddBox([9, 0.8, 11], [-12, 15.0, 32], watchtowerWoodMat);

  // Decorative safety railing around observation deck (height 1.0)
  helperAddBox([0.3, 1.2, 11], [-16.3, 16.0, 32], watchtowerWoodMat); // Back railing
  helperAddBox([9.0, 1.2, 0.3], [-12, 16.0, 37.3], watchtowerWoodMat); // Outer railing

  // Decorative Roof Canopy at y: 19.5
  helperAddBox([10, 0.6, 12], [-12, 19.5, 32], carvedRockMat, false);
  const topBeacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 2), lanternGlassMat);
  topBeacon.position.set(-12, 20.7, 32);
  rootGroup.add(topBeacon);

  // Watchtower Map Tablet on High Observation Deck
  const towerMapMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.8), goldTrimMat);
  towerMapMesh.position.set(-12, 15.8, 30);
  rootGroup.add(towerMapMesh);

  interactiveObjects.push({
    id: 'tablet_watchtower',
    type: 'lore_tablet',
    mesh: towerMapMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(towerMapMesh.position, new THREE.Vector3(2.5, 2, 2.5)),
    prompt: 'دیدن راهنمای دیده‌بانی برج (کلید E)',
  });

  // =========================================================================
  // 3. SECTION 3: CANYON & BRIDGE MAZE WITH HIGH ROOF CANOPY & SHIELD WALLS
  // =========================================================================
  // Deep Canyon Chasm Floor (Far below y = -12 for visuals)
  const canyonBottomMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 1.0 });
  helperAddBox([30, 1, 50], [0, -12, 45], canyonBottomMat, false);

  // Far Right Canyon Wall (x = 13.0)
  helperAddBox([1.2, 18, 42], [13.0, 5, 43], carvedRockMat);

  // Left Dividing Wall between Watchtower/Stairs corridor and Bridge Canyon (x = -2.0)
  // Height is exactly 8.5m (from ground y=-0.5 up to roof slab y=8.0), seamlessly meeting the roof!
  helperAddBox([1.2, 8.5, 32], [-2.0, 3.75, 42], carvedRockMat);

  // Watchtower Corridor Orange Floor (x: -18 to -2, center x = -10.0, z: 28 to 60, stops exactly at dividing wall!)
  helperAddBox([16, 1, 32], [-10.0, -0.5, 44], orangeFloorMat);

  // Watchtower Exit Gate (Blocking exit at z: 60, x: -10 until bridges are completed!)
  const watchtowerGateMesh = new THREE.Mesh(new THREE.BoxGeometry(16.0, 9.5, 1.2), carvedRockMat);
  watchtowerGateMesh.position.set(-10.0, 4.25, 60.0);
  watchtowerGateMesh.castShadow = true;
  rootGroup.add(watchtowerGateMesh);
  const watchtowerGateCollider = new THREE.Box3().setFromObject(watchtowerGateMesh);
  colliders.push(watchtowerGateCollider);

  // --- ELEVATED CANOPY ROOF OVER BRIDGES (y = 8.0) WITH HIGH SHIELD WALLS ---
  // Thick Solid Roof Slab at y: 7.5 (thickness 1.5m, from y=6.75 to y=8.25)
  helperAddBox([18, 1.5, 32], [6, 7.5, 42], carvedRockMat, false);

  // Parapet Shield Walls ON TOP of the roof (y: 8.25 to 10.75, height 2.5m)
  // These walls completely block ground-level players (y=0) from seeing inside the roof basin!
  helperAddBox([18, 2.5, 0.8], [6, 9.5, 26.5], carvedRockMat, false); // Front Shield Wall
  helperAddBox([18, 2.5, 0.8], [6, 9.5, 57.5], carvedRockMat, false); // Back Shield Wall
  helperAddBox([0.8, 2.5, 32], [14.0, 9.5, 42.0], carvedRockMat, false); // Right Shield Wall
  helperAddBox([0.8, 2.5, 32], [-2.0, 9.5, 42.0], carvedRockMat, false); // Left Shield Wall

  // Helper for Roof Basin Beacons (Sitting inside the roof tray at y = 8.5)
  // Uses UPWARD SpotLight pointing into the sky so 0% light reaches below!
  // Visible ONLY from the high Watchtower deck at y = 15.0 looking down!
  function createTopRoofBeacon(safeX: number, z: number, runeMat: THREE.Material): THREE.Group {
    const group = new THREE.Group();
    group.position.set(safeX, 8.25, z);

    // Stone Pedestal inside roof basin
    const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.5, 12), goldTrimMat);
    baseMesh.position.set(0, 0.25, 0);
    group.add(baseMesh);

    // Glowing Octahedron Rune
    const runeMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 2), runeMat);
    runeMesh.position.set(0, 0.8, 0);
    group.add(runeMesh);

    // Upward SpotLight pointing straight UP into the sky / Watchtower deck direction
    const spotLight = new THREE.SpotLight(
      runeMat === runeMatA ? 0x06b6d4 : 0x10b981,
      6.0,
      25,
      Math.PI / 3,
      0.3
    );
    spotLight.position.set(0, 1.0, 0);
    spotLight.target.position.set(0, 15.0, 0); // Points straight UP
    group.add(spotLight);
    group.add(spotLight.target);

    rootGroup.add(group);
    return group;
  }

  // --- Row 1 (z = 32) ---
  // Left Bridge 1 (x: 3) -> TRAP Bridge (Identical plank look, NO collider)
  helperAddBox([3.5, 0.5, 6], [3, -0.2, 32], woodenPlankMat, false);
  // Right Bridge 1 (x: 9) -> SAFE Static Bridge (Solid collider)
  helperAddBox([3.5, 0.5, 6], [9, -0.2, 32], woodenPlankMat, true);
  // Top Roof Beacon for Row 1 (Right x: 9, sitting inside roof basin at y: 8.5)
  createTopRoofBeacon(9, 32, runeMatA);

  // --- Row 2 (z = 42) ---
  // Left Bridge 2 (x: 3) -> SAFE Oscillating Moving Bridge (Solid moving collider)
  const safeBridge2Mesh = helperAddBox([3.5, 0.5, 6], [3, -0.2, 42], woodenPlankMat, false);
  const safeBridge2Collider = new THREE.Box3().setFromObject(safeBridge2Mesh);
  colliders.push(safeBridge2Collider);
  // Top Roof Beacon for Row 2 (Moves horizontally inside roof basin along with oscillating bridge!)
  const beacon2Group = createTopRoofBeacon(3, 42, runeMatB);

  // Right Bridge 2 (x: 9) -> TRAP Bridge (Identical plank look, NO collider)
  helperAddBox([3.5, 0.5, 6], [9, -0.2, 42], woodenPlankMat, false);

  // --- Row 3 (z = 52) ---
  // Left Bridge 3 (x: 3) -> TRAP Bridge (Identical plank look, NO collider)
  helperAddBox([3.5, 0.5, 6], [3, -0.2, 52], woodenPlankMat, false);
  // Right Bridge 3 (x: 9) -> TRAP Bridge (Identical plank look, NO collider)
  helperAddBox([3.5, 0.5, 6], [9, -0.2, 52], woodenPlankMat, false);
  // Middle Bridge 3 (x: 6) -> SAFE Static Bridge (Solid collider)
  helperAddBox([3.5, 0.5, 6], [6, -0.2, 52], woodenPlankMat, true);
  // Top Roof Beacon for Row 3 (Middle x: 6, sitting inside roof basin at y: 8.5)
  createTopRoofBeacon(6, 52, runeMatA);

  // --- Far Side Plaza (z: 62 to 70) ---
  helperAddBox([22, 1, 12], [0, -0.5, 66], woodenPlankMat);

  // --- REVERSE DRAWBRIDGE 1 (From Watchtower Deck x: -12 to Far Side Plaza x: 0, z: 66) ---
  const drawbridge1Group = new THREE.Group();
  drawbridge1Group.position.set(-12, 15.0, 32);
  
  const drawbridge1Planks = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.4, 38.0), woodenPlankMat);
  drawbridge1Planks.position.set(6.0, 0, 19.0); // Extending down towards (0, 0, 68)
  drawbridge1Planks.castShadow = true;
  drawbridge1Group.add(drawbridge1Planks);
  rootGroup.add(drawbridge1Group);

  const statefulDrawbridge1 = new StatefulBridge(drawbridge1Group, -Math.PI / 2.3, 0.35);

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
  // 4. SECTION 4: TRIPLE CONTROLLED PLATFORMS & CHASM (z: 60 to 120)
  // =========================================================================
  // Deep Pit Bottom Slab
  helperAddBox([34, 1, 60], [0, -12, 90], canyonBottomMat, false);

  // Enclosing Outer Side Walls (From z: 60 to 120, rising from y: -0.5 up to y: 9.0 matching roof height!)
  helperAddBox([1.2, 9.5, 60], [-13.5, 4.25, 90], carvedRockMat);
  helperAddBox([1.2, 9.5, 60], [13.5, 4.25, 90], carvedRockMat);

  // Roof / Ceiling Slab over Section 4 at y: 8.6 (Connecting Section 3 canopy to Section 5 ceiling)
  helperAddBox([28, 0.8, 60], [0, 8.6, 90], carvedRockMat, false);

  // Near Side Control Station Plaza Floor Slab (z: 60 to 78) - Chasm pit spans full width from z: 78 to 112!
  helperAddBox([28, 1, 18], [0, -0.5, 69], woodenPlankMat);

  // Control Station Desk & 3 Control Levers
  helperAddBox([6, 1.0, 1.2], [-6, 0.5, 72], watchtowerWoodMat);

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
  helperAddBox([28, 1, 10], [0, -0.5, 116], woodenPlankMat);

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
  helperAddBox([28, 1, 18], [0, -0.5, 129], woodenPlankMat);
  helperAddBox([28, 1, 18], [0, 8.6, 129], ceilingMat);
  helperAddBox([1.2, 9.5, 18], [-13.5, 4.25, 129], carvedRockMat);
  helperAddBox([1.2, 9.5, 18], [13.5, 4.25, 129], carvedRockMat);
  helperAddBox([28, 9.5, 1.2], [0, 4.25, 138], carvedRockMat); // Far Back Wall

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
      beacon2Group.position.x = oscX;
      safeBridge2Collider.setFromObject(safeBridge2Mesh);

      // 2. Update Section 3 Drawbridge 1 & Watchtower Exit Gate
      const isDrawbridge1Lowered = !!customData.stage5WatchtowerBridgeLowered;
      statefulDrawbridge1.setTarget(isDrawbridge1Lowered);
      statefulDrawbridge1.update(dt);

      const gateTargetY = isDrawbridge1Lowered ? -10.0 : 4.25;
      if (Math.abs(watchtowerGateMesh.position.y - gateTargetY) > 0.01) {
        watchtowerGateMesh.position.y += Math.sign(gateTargetY - watchtowerGateMesh.position.y) * dt * 4.0;
        watchtowerGateCollider.setFromObject(watchtowerGateMesh);
      }

      // 3. Update Section 4 Controlled Platforms (Independent Platform Toggles)
      const p1Active = !!customData.stage5P1Active;
      const p2Active = !!customData.stage5P2Active;
      const p3Active = !!customData.stage5P3Active;

      p1TargetY = p1Active ? -0.4 : -6.0;
      p2TargetY = p2Active ? -0.4 : -6.0;
      p3TargetY = p3Active ? -0.4 : -6.0;

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
