import * as THREE from 'three';
import type { PuzzleState } from '../../types.ts';
import type { StageBuildResult, InteractiveObject } from './gardenStage.ts';

/**
 * Stage 2: Moving Bridge (پل متحرک — دره و چرخ‌دنده‌های چوبی)
 * Reciprocal Co-op (همکاری رفت و برگشتی):
 * 1. Part 1: Start Checkpoint 1 -> Moving Platform 1 across the first gorge (controlled by Lever 1).
 * 2. Part 2: Plateau Checkpoint 2 -> Fork into Path A & Path B:
 *    - Player in Path A pulls Lever A -> Ascending Platform 2 moves to pick up & lift Player in Path B.
 *    - Player in Path B rides Platform 2 to the upper tower and pulls Lever B.
 *    - Lever B unlocks and lowers the drawbridge for Player in Path A.
 *    - Player in Path A crosses to reunite with Player in Path B at the upper plateau.
 * 3. Part 3: Scenic reunion bridge -> Twin Exit Pads -> Stage Complete.
 */
export function buildFloatingIslandsStage(): StageBuildResult {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'stage_2_moving_bridge_chasm';

  const colliders: THREE.Box3[] = [];
  const interactiveObjects: InteractiveObject[] = [];

  // --- Materials ---
  const rusticWoodFloorMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.65,
    metalness: 0.1,
  });

  const darkTimberMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.75,
    metalness: 0.15,
  });

  const stonePillarMat = new THREE.MeshStandardMaterial({
    color: 0x44403c,
    roughness: 0.85,
    metalness: 0.1,
  });

  const brassGearMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.35,
    metalness: 0.85,
  });

  const ropeMat = new THREE.MeshStandardMaterial({
    color: 0xa16207,
    roughness: 0.9,
  });

  const boundaryChasmWallMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.95,
    metalness: 0.05,
  });

  const platformWoodMat = new THREE.MeshStandardMaterial({
    color: 0x92400e,
    roughness: 0.55,
    metalness: 0.2,
  });

  const leverActiveMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x16a34a,
    emissiveIntensity: 0.5,
    roughness: 0.2,
  });

  const leverInactiveMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.4,
    roughness: 0.3,
  });

  const exitPadP1Mat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.4,
    roughness: 0.3,
  });

  const exitPadP2Mat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x059669,
    emissiveIntensity: 0.4,
    roughness: 0.3,
  });

  const plateBaseMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.7,
    metalness: 0.3,
  });

  // --- Helper Functions ---
  function addPlatform(x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material = rusticWoodFloorMat) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y - h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rootGroup.add(mesh);

    const box = new THREE.Box3().setFromObject(mesh);
    colliders.push(box);
    return mesh;
  }

  function addWall(x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material = boundaryChasmWallMat) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rootGroup.add(mesh);

    const box = new THREE.Box3().setFromObject(mesh);
    colliders.push(box);
    return mesh;
  }

  function addWoodenPillar(x: number, y: number, z: number, height = 6) {
    const pillarGeo = new THREE.CylinderGeometry(0.4, 0.5, height, 8);
    const pillarMesh = new THREE.Mesh(pillarGeo, darkTimberMat);
    pillarMesh.position.set(x, y + height / 2, z);
    pillarMesh.castShadow = true;
    pillarMesh.receiveShadow = true;
    rootGroup.add(pillarMesh);

    // Decorative brass gear on pillar
    const gearGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.12, 12);
    const gearMesh = new THREE.Mesh(gearGeo, brassGearMat);
    gearMesh.rotation.x = Math.PI / 2;
    gearMesh.position.set(x, y + height * 0.7, z + 0.35);
    rootGroup.add(gearMesh);

    colliders.push(new THREE.Box3().setFromObject(pillarMesh));
  }

  function addRailing(x: number, y: number, z: number, length: number, isAlongZ: boolean) {
    const w = isAlongZ ? 0.2 : length;
    const d = isAlongZ ? length : 0.2;
    const railMesh = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, d), darkTimberMat);
    railMesh.position.set(x, y + 0.55, z);
    railMesh.castShadow = true;
    rootGroup.add(railMesh);
    colliders.push(new THREE.Box3().setFromObject(railMesh));
  }

  // ==========================================
  // 1. SECTION 1: START AREA & MOVING PLATFORM 1
  // ==========================================

  // Start Platform (z: -4 to 8, y: 0)
  addPlatform(0, 0, 2, 12, 2, 12, rusticWoodFloorMat);
  addRailing(-5.9, 0, 2, 12, true);
  addRailing(5.9, 0, 2, 12, true);
  addRailing(0, 0, -3.9, 12, false);

  addWoodenPillar(-5, 0, -2, 5);
  addWoodenPillar(5, 0, -2, 5);
  addWoodenPillar(-5, 0, 6, 5);
  addWoodenPillar(5, 0, 6, 5);

  // Ancient Lore Tablet 2
  const tabletGeo = new THREE.BoxGeometry(1.2, 1.6, 0.2);
  const tabletMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
  const tabletMesh = new THREE.Mesh(tabletGeo, tabletMat);
  tabletMesh.position.set(-3.5, 0.9, 2);
  rootGroup.add(tabletMesh);

  interactiveObjects.push({
    id: 'story_tablet_stage2',
    type: 'lever',
    mesh: tabletMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(-3.5, 0.9, 2),
      new THREE.Vector3(2.5, 2, 2.5)
    ),
    prompt: 'خواندن کتیبه دره و پل متحرک (کلید E)',
  });

  // --- Lever 1 at Start Platform Edge (x: 3.5, z: 6) ---
  const lever1Pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.8), darkTimberMat);
  lever1Pedestal.position.set(3.5, 0.35, 6);
  rootGroup.add(lever1Pedestal);

  const lever1Pivot = new THREE.Group();
  lever1Pivot.position.set(3.5, 0.75, 6);
  rootGroup.add(lever1Pivot);

  const lever1Stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8), brassGearMat);
  lever1Stick.position.set(0, 0.5, 0);
  lever1Pivot.add(lever1Stick);

  const lever1Handle = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), leverInactiveMat);
  lever1Handle.position.set(0, 1.0, 0);
  lever1Pivot.add(lever1Handle);
  lever1Pivot.rotation.z = 0.45;

  interactiveObjects.push({
    id: 'lever_stage2_platform1',
    type: 'lever',
    mesh: lever1Stick,
    bounds: new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(3.5, 0.9, 6),
      new THREE.Vector3(2.6, 2.2, 2.6)
    ),
    prompt: 'حرکت دادن سکوی متحرک اول (کلید E)',
  });

  // --- Moving Platform 1 (Spans Gorge 1 from z: 7.5 to z: 22.5) ---
  const movingPlatform1Group = new THREE.Group();
  movingPlatform1Group.position.set(0, 0, 7.5); // Initial position at start side
  rootGroup.add(movingPlatform1Group);

  const platform1Mesh = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.7, 5.0), platformWoodMat);
  platform1Mesh.position.set(0, -0.35, 0);
  platform1Mesh.castShadow = true;
  platform1Mesh.receiveShadow = true;
  movingPlatform1Group.add(platform1Mesh);

  // Glowing Standing Deck & Target Spot on Platform 1
  const p1GlowingDeck = new THREE.Mesh(
    new THREE.BoxGeometry(4.8, 0.1, 4.4),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.6, roughness: 0.3 })
  );
  p1GlowingDeck.position.set(0, 0.05, 0);
  movingPlatform1Group.add(p1GlowingDeck);

  const p1StandCenter = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 0.15, 24),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.8 })
  );
  p1StandCenter.position.set(0, 0.1, 0);
  movingPlatform1Group.add(p1StandCenter);

  // Safety railings on left and right sides of Moving Platform 1
  const railP1Left = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 4.8), darkTimberMat);
  railP1Left.position.set(-2.6, 0.4, 0);
  movingPlatform1Group.add(railP1Left);

  const railP1Right = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 4.8), darkTimberMat);
  railP1Right.position.set(2.6, 0.4, 0);
  movingPlatform1Group.add(railP1Right);

  // Decorative brass gears rotating underneath
  const gearP1 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.15, 12), brassGearMat);
  gearP1.rotation.x = Math.PI / 2;
  gearP1.position.set(0, -0.75, 0);
  movingPlatform1Group.add(gearP1);

  // Moving Platform 1 Collider
  const platform1ColliderIndex = colliders.length;
  const platform1Box = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(0, -0.35, 7.5),
    new THREE.Vector3(5.4, 0.7, 5.0)
  );
  colliders.push(platform1Box);

  // ==========================================
  // 2. SECTION 2: MIDDLE PLATEAU & PATH A / PATH B FORK
  // ==========================================

  // Middle Plateau (z: 22 to 34, y: 0)
  addPlatform(0, 0, 28, 16, 2, 12, rusticWoodFloorMat);
  addWoodenPillar(-7, 0, 24, 5);
  addWoodenPillar(7, 0, 24, 5);
  addWoodenPillar(-7, 0, 32, 5);
  addWoodenPillar(7, 0, 32, 5);

  // Return Lever for Platform 1 at Middle Plateau Edge (x: 3.5, z: 23)
  const returnLever1Pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.8), darkTimberMat);
  returnLever1Pedestal.position.set(3.5, 0.35, 23);
  rootGroup.add(returnLever1Pedestal);

  const returnLever1Pivot = new THREE.Group();
  returnLever1Pivot.position.set(3.5, 0.75, 23);
  rootGroup.add(returnLever1Pivot);

  const returnLever1Stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8), brassGearMat);
  returnLever1Stick.position.set(0, 0.5, 0);
  returnLever1Pivot.add(returnLever1Stick);
  returnLever1Pivot.rotation.z = -0.45;

  interactiveObjects.push({
    id: 'lever_stage2_platform1_return',
    type: 'lever',
    mesh: returnLever1Stick,
    bounds: new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(3.5, 0.9, 23),
      new THREE.Vector3(2.6, 2.2, 2.6)
    ),
    prompt: 'فراخوانی / بازگرداندن سکوی متحرک اول (کلید E)',
  });

  // Central Divide Barrier on Middle Plateau (Guides into Path A or Path B)
  addWall(0, 2.5, 34, 1.2, 5, 8, darkTimberMat);

  // --- PATH A: WEST FORK (Left, x: -7, z: 34 to 52, y: 0) ---
  addPlatform(-7, 0, 43, 6, 2, 18, rusticWoodFloorMat);
  addRailing(-9.9, 0, 43, 18, true); // Outer wall railing
  addRailing(-4.1, 0, 43, 18, true); // Inner divide railing

  // Lever A on Path A (At x: -7, z: 50)
  const leverAPedestal = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), darkTimberMat);
  leverAPedestal.position.set(-7, 0.35, 50);
  rootGroup.add(leverAPedestal);

  const leverAPivot = new THREE.Group();
  leverAPivot.position.set(-7, 0.75, 50);
  rootGroup.add(leverAPivot);

  const leverAStick = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8), brassGearMat);
  leverAStick.position.set(0, 0.5, 0);
  leverAPivot.add(leverAStick);

  const leverAHandle = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), leverInactiveMat);
  leverAHandle.position.set(0, 1.0, 0);
  leverAPivot.add(leverAHandle);
  leverAPivot.rotation.z = 0.5;

  interactiveObjects.push({
    id: 'lever_stage2_pathA',
    type: 'lever',
    mesh: leverAStick,
    bounds: new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(-7, 0.9, 50),
      new THREE.Vector3(2.8, 2.4, 2.8)
    ),
    prompt: 'کشیدن اهرم مسیر A برای ارسال بالابر به مسیر B (کلید E)',
  });

  // Path A Drawbridge (At x: -7, y: 0, z: 56, length: 8)
  const drawbridgeAGroup = new THREE.Group();
  drawbridgeAGroup.position.set(-7, 0, 52); // Pivot at start of gap
  rootGroup.add(drawbridgeAGroup);

  const drawbridgeMesh = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.5, 8.0), platformWoodMat);
  drawbridgeMesh.position.set(0, -0.25, 4.0); // Extending along Z
  drawbridgeMesh.castShadow = true;
  drawbridgeAGroup.add(drawbridgeMesh);

  // Initial drawbridge state: Raised upright (rotX = -Math.PI / 2.2) blocking path
  drawbridgeAGroup.rotation.x = -Math.PI / 2.15;

  const drawbridgeColliderIndex = colliders.length;
  const drawbridgeBox = new THREE.Box3().setFromObject(drawbridgeAGroup);
  colliders.push(drawbridgeBox);

  // Walkable Ascending Grand Staircase / Ramp from Drawbridge A up to Upper Plateau (x: -7, z: 60 to 66.5, y: 0 to 5.5)
  const stepCount = 14;
  for (let i = 0; i < stepCount; i++) {
    const stepProgress = (i + 1) / stepCount;
    const stepZ = 60 + (i + 0.5) * (6.5 / stepCount);
    const stepY = stepProgress * 5.5;
    const stepDepth = (6.5 / stepCount) + 0.08;
    addPlatform(-7, stepY, stepZ, 5.4, stepY + 1.5, stepDepth, rusticWoodFloorMat);
  }
  // Railings on staircase
  addRailing(-9.6, 2.75, 63.25, 6.8, true);
  addRailing(-4.4, 2.75, 63.25, 6.8, true);

  // --- PATH B: EAST FORK (Right, x: +7, z: 34 to 48, y: 0) ---
  addPlatform(7, 0, 41, 6, 2, 14, rusticWoodFloorMat);
  addRailing(9.9, 0, 41, 14, true);  // Outer railing
  addRailing(4.1, 0, 41, 14, true);  // Inner divide railing

  // --- Moving Platform 2: Ascending Lift on Path B (At x: 7, z: 50, travels Y from 0 to 5.5) ---
  const movingPlatform2Group = new THREE.Group();
  movingPlatform2Group.position.set(7, 0, 50); // Initial position at y: 0
  rootGroup.add(movingPlatform2Group);

  const platform2Mesh = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.7, 5.0), platformWoodMat);
  platform2Mesh.position.set(0, -0.35, 0);
  platform2Mesh.castShadow = true;
  platform2Mesh.receiveShadow = true;
  movingPlatform2Group.add(platform2Mesh);

  // Safety railings on platform 2
  const railP2Left = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 4.8), darkTimberMat);
  railP2Left.position.set(-2.5, 0.4, 0);
  movingPlatform2Group.add(railP2Left);

  const railP2Right = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 4.8), darkTimberMat);
  railP2Right.position.set(2.5, 0.4, 0);
  movingPlatform2Group.add(railP2Right);

  const gearP2 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.15, 12), brassGearMat);
  gearP2.rotation.x = Math.PI / 2;
  gearP2.position.set(0, -0.75, 0);
  movingPlatform2Group.add(gearP2);

  const platform2ColliderIndex = colliders.length;
  const platform2Box = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(7, -0.35, 50),
    new THREE.Vector3(5.2, 0.7, 5.0)
  );
  colliders.push(platform2Box);

  // --- Upper Tower on Path B (x: 7, y: 5.5, z: 54 to 62) ---
  addPlatform(7, 5.5, 58, 6, 5.5, 8, rusticWoodFloorMat);
  addWoodenPillar(9.5, 5.5, 55, 4);
  addWoodenPillar(9.5, 5.5, 61, 4);

  // Connecting Walkway from Path B Upper Tower to Reunion Plateau (z: 62 to 66)
  addPlatform(7, 5.5, 64, 6, 5.5, 4, rusticWoodFloorMat);
  addRailing(9.9, 5.5, 64, 4, true);
  addRailing(4.1, 5.5, 64, 4, true);

  // Lever B on Path B Upper Tower (At x: 6.5, y: 5.5, z: 56)
  const leverBPedestal = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), darkTimberMat);
  leverBPedestal.position.set(6.5, 5.85, 56);
  rootGroup.add(leverBPedestal);

  const leverBPivot = new THREE.Group();
  leverBPivot.position.set(6.5, 6.25, 56);
  rootGroup.add(leverBPivot);

  const leverBStick = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8), brassGearMat);
  leverBStick.position.set(0, 0.5, 0);
  leverBPivot.add(leverBStick);

  const leverBHandle = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), leverInactiveMat);
  leverBHandle.position.set(0, 1.0, 0);
  leverBPivot.add(leverBHandle);
  leverBPivot.rotation.z = 0.5;

  interactiveObjects.push({
    id: 'lever_stage2_pathB',
    type: 'lever',
    mesh: leverBStick,
    bounds: new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(6.5, 6.4, 56),
      new THREE.Vector3(2.8, 2.4, 2.8)
    ),
    prompt: 'کشیدن اهرم برج B برای باز کردن پل مسیر A (کلید E)',
  });

  // ==========================================
  // 3. SECTION 3: REUNION UPPER PLATEAU & EXIT PORTAL
  // ==========================================

  // Upper Reunion Plateau (x: -9 to 9, y: 5.5, z: 66 to 82)
  addPlatform(0, 5.5, 74, 18, 5.5, 16, rusticWoodFloorMat);
  addRailing(-8.9, 5.5, 74, 16, true);
  addRailing(8.9, 5.5, 74, 16, true);

  addWoodenPillar(-7, 5.5, 68, 5);
  addWoodenPillar(7, 5.5, 68, 5);
  addWoodenPillar(-7, 5.5, 78, 5);
  addWoodenPillar(7, 5.5, 78, 5);

  // Ornate Wooden Exit Archway
  const exitArchLeft = addWall(-3.8, 8.5, 80, 1.0, 6, 1.2, darkTimberMat);
  const exitArchRight = addWall(3.8, 8.5, 80, 1.0, 6, 1.2, darkTimberMat);
  const exitArchTop = addWall(0, 11.2, 80, 8.6, 1.2, 1.4, darkTimberMat);

  // Golden Swirling Exit Vortex
  const portalRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.0, 0.35, 12, 32),
    brassGearMat
  );
  portalRing.position.set(0, 10.0, 81.2);
  rootGroup.add(portalRing);

  const portalVortex = new THREE.Mesh(
    new THREE.CircleGeometry(2.8, 24),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    })
  );
  portalVortex.position.set(0, 10.0, 81.1);
  rootGroup.add(portalVortex);

  // Twin Exit Pads on Upper Reunion Plateau
  const p1Base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.15, 24), plateBaseMat);
  p1Base.position.set(-2.6, 5.58, 77.5);
  rootGroup.add(p1Base);

  const p1Pad = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.25, 0.15, 24), exitPadP1Mat);
  p1Pad.position.set(-2.6, 5.66, 77.5);
  rootGroup.add(p1Pad);

  const p2Base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.15, 24), plateBaseMat);
  p2Base.position.set(2.6, 5.58, 77.5);
  rootGroup.add(p2Base);

  const p2Pad = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.25, 0.15, 24), exitPadP2Mat);
  p2Pad.position.set(2.6, 5.66, 77.5);
  rootGroup.add(p2Pad);

  interactiveObjects.push(
    {
      id: 'stage2_exit_p1',
      type: 'portal_pad',
      mesh: p1Pad,
      bounds: new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(-2.6, 6.0, 77.5),
        new THREE.Vector3(2.8, 2.0, 2.8)
      ),
      prompt: 'نیوشا: روی سکوی خروج پورتال بایستید',
    },
    {
      id: 'stage2_exit_p2',
      type: 'portal_pad',
      mesh: p2Pad,
      bounds: new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(2.6, 6.0, 77.5),
        new THREE.Vector3(2.8, 2.0, 2.8)
      ),
      prompt: 'حسن: روی سکوی خروج پورتال بایستید',
    }
  );

  // ==========================================
  // 4. AIRTIGHT BOUNDARY WALLS (NO ESCAPING / BYPASSING)
  // ==========================================

  // Front Wall (Start)
  addWall(0, 4, -4.5, 24, 10, 1.5, boundaryChasmWallMat);
  // Back Wall (Exit)
  addWall(0, 9, 82.5, 24, 12, 1.5, boundaryChasmWallMat);
  // West Boundary Wall
  addWall(-10.5, 6, 38, 1.5, 16, 90, boundaryChasmWallMat);
  // East Boundary Wall
  addWall(10.5, 6, 38, 1.5, 16, 90, boundaryChasmWallMat);

  // ==========================================
  // 5. CHECKPOINTS
  // ==========================================
  const cp1Mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 1.8, 8), exitPadP1Mat);
  cp1Mesh.position.set(0, 0.9, 0);
  rootGroup.add(cp1Mesh);

  const cp2Mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 1.8, 8), exitPadP2Mat);
  cp2Mesh.position.set(0, 0.9, 28);
  rootGroup.add(cp2Mesh);

  const checkpoints = [
    { id: 0, pos: [0, 1.2, 0] as [number, number, number], active: true, mesh: cp1Mesh },
    { id: 1, pos: [0, 1.2, 28] as [number, number, number], active: false, mesh: cp2Mesh },
  ];

  // ==========================================
  // 6. DYNAMIC UPDATE LOOP & PLATFORM SYNCHRONIZATION
  // ==========================================
  function update(dt: number, state: PuzzleState) {
    // 1. Moving Platform 1 Animation & Dynamic Collider Update
    // Target Z: 22.5 when Lever 1 is active, 7.5 when inactive
    const isPlatform1Active = !!state.floatingIslandBridgeActive || !!(state.customData && state.customData.stage2Platform1Active);
    const targetP1Z = isPlatform1Active ? 22.5 : 7.5;
    const diffP1Z = targetP1Z - movingPlatform1Group.position.z;
    if (Math.abs(diffP1Z) > 0.02) {
      movingPlatform1Group.position.z += Math.sign(diffP1Z) * Math.min(Math.abs(diffP1Z), dt * 4.5);
      gearP1.rotation.z += dt * 4.0;
    } else {
      movingPlatform1Group.position.z = targetP1Z;
    }
    colliders[platform1ColliderIndex].setFromCenterAndSize(
      new THREE.Vector3(movingPlatform1Group.position.x, movingPlatform1Group.position.y - 0.35, movingPlatform1Group.position.z),
      new THREE.Vector3(5.4, 0.7, 5.0)
    );

    // Lever 1 Rotation
    const targetLever1Rot = isPlatform1Active ? -0.45 : 0.45;
    lever1Pivot.rotation.z += (targetLever1Rot - lever1Pivot.rotation.z) * Math.min(1, dt * 8);
    returnLever1Pivot.rotation.z += (-targetLever1Rot - returnLever1Pivot.rotation.z) * Math.min(1, dt * 8);
    lever1Handle.material = isPlatform1Active ? leverActiveMat : leverInactiveMat;

    // 2. Moving Platform 2 (Ascending Lift on Path B)
    // Target Y: 5.5 when Lever A is active, 0.0 when inactive
    const isLeverAActive = !!state.laserTurretDisabled || !!(state.customData && state.customData.stage2LeverA);
    const targetP2Y = isLeverAActive ? 5.5 : 0.0;
    const diffP2Y = targetP2Y - movingPlatform2Group.position.y;
    if (Math.abs(diffP2Y) > 0.02) {
      movingPlatform2Group.position.y += Math.sign(diffP2Y) * Math.min(Math.abs(diffP2Y), dt * 3.5);
      gearP2.rotation.z += dt * 4.0;
    } else {
      movingPlatform2Group.position.y = targetP2Y;
    }
    colliders[platform2ColliderIndex].setFromCenterAndSize(
      new THREE.Vector3(movingPlatform2Group.position.x, movingPlatform2Group.position.y - 0.35, movingPlatform2Group.position.z),
      new THREE.Vector3(5.2, 0.7, 5.0)
    );

    // Lever A Rotation
    const targetLeverARot = isLeverAActive ? -0.5 : 0.5;
    leverAPivot.rotation.z += (targetLeverARot - leverAPivot.rotation.z) * Math.min(1, dt * 8);
    leverAHandle.material = isLeverAActive ? leverActiveMat : leverInactiveMat;

    // 3. Drawbridge A Animation (Controlled by Lever B on Upper Tower)
    // When Lever B is pulled, drawbridge rotates down to 0 (horizontal bridge)
    const isLeverBActive = !!state.vortexActivated || !!(state.customData && state.customData.stage2LeverB);
    const targetDrawbridgeRotX = isLeverBActive ? 0.0 : -Math.PI / 2.15;
    drawbridgeAGroup.rotation.x += (targetDrawbridgeRotX - drawbridgeAGroup.rotation.x) * Math.min(1, dt * 4.0);
    colliders[drawbridgeColliderIndex].setFromObject(drawbridgeAGroup);

    // Lever B Rotation
    const targetLeverBRot = isLeverBActive ? -0.5 : 0.5;
    leverBPivot.rotation.z += (targetLeverBRot - leverBPivot.rotation.z) * Math.min(1, dt * 8);
    leverBHandle.material = isLeverBActive ? leverActiveMat : leverInactiveMat;

    // 4. Exit Pads Glow
    const isP1Ready = !!state.stage2ExitP1Ready || !!(state.customData && state.customData.stage2ExitP1Ready);
    const isP2Ready = !!state.stage2ExitP2Ready || !!(state.customData && state.customData.stage2ExitP2Ready);

    exitPadP1Mat.emissiveIntensity = isP1Ready ? 1.2 : 0.35;
    exitPadP2Mat.emissiveIntensity = isP2Ready ? 1.2 : 0.35;

    // 5. Exit Vortex Spin
    portalVortex.rotation.z += dt * 1.8;
  }

  function dispose() {
    rootGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
  }

  return {
    rootGroup,
    colliders,
    interactiveObjects,
    update,
    dispose,
    spawnPoint: [0, 1.2, 0],
    checkpoints,
  };
}
