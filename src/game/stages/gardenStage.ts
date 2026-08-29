import * as THREE from 'three';
import type { PuzzleState } from '../../types.ts';

export interface StageBuildResult {
  rootGroup: THREE.Group;
  colliders: THREE.Box3[];
  interactiveObjects: InteractiveObject[];
  update: (dt: number, state: PuzzleState) => void;
  dispose: () => void;
  spawnPoint: [number, number, number];
  checkpoints: { id: number; pos: [number, number, number]; active: boolean; mesh: THREE.Object3D }[];
}

export interface InteractiveObject {
  id: string;
  type: 'pressure_plate' | 'lever' | 'heavy_block' | 'bridge_switch' | 'portal_pad';
  mesh: THREE.Object3D;
  bounds: THREE.Box3;
  targetRole?: 'explorer' | 'guardian' | 'both';
  prompt: string;
  onInteract?: () => void;
}

/**
 * Stage 1: First Co-op (اولین همکاری)
 * Designed with a charming wooden garden aesthetic suited for the wooden doll puppets (Hasan & Niwsha).
 * Airtight collision boundaries, single clear co-op puzzle with button occupancy and permanent lever unlock.
 */
export function buildGardenStage(): StageBuildResult {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'stage_1_first_coop_garden';

  const colliders: THREE.Box3[] = [];
  const interactiveObjects: InteractiveObject[] = [];

  // --- Materials ---
  // Warm wooden floorboards & garden pathways
  const woodenFloorMat = new THREE.MeshStandardMaterial({
    color: 0x854d0e,
    roughness: 0.65,
    metalness: 0.05,
  });

  const mossyStoneMat = new THREE.MeshStandardMaterial({
    color: 0x3f6212,
    roughness: 0.85,
    metalness: 0.05,
  });

  const boundaryWallMat = new THREE.MeshStandardMaterial({
    color: 0x292524,
    roughness: 0.9,
    metalness: 0.1,
  });

  const carvedWoodMat = new THREE.MeshStandardMaterial({
    color: 0x713f12,
    roughness: 0.55,
    metalness: 0.15,
  });

  const brassTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.35,
    metalness: 0.8,
  });

  const gateWoodMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.6,
    metalness: 0.2,
  });

  const plateBaseMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.7,
    metalness: 0.3,
  });

  const plateActiveMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.35,
    roughness: 0.3,
  });

  const leverCrystalMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.4,
    roughness: 0.2,
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

  // --- Helper Functions ---
  function addPlatform(x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material = woodenFloorMat) {
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

  function addWall(x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material = boundaryWallMat) {
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

  function addWoodenPillar(x: number, z: number, height = 5) {
    const pillarGeo = new THREE.CylinderGeometry(0.45, 0.55, height, 8);
    const pillarMesh = new THREE.Mesh(pillarGeo, carvedWoodMat);
    pillarMesh.position.set(x, height / 2, z);
    pillarMesh.castShadow = true;
    pillarMesh.receiveShadow = true;
    rootGroup.add(pillarMesh);

    // Brass collar rings
    const ringGeo = new THREE.TorusGeometry(0.55, 0.08, 6, 16);
    const ring1 = new THREE.Mesh(ringGeo, brassTrimMat);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.set(x, 0.8, z);
    rootGroup.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo, brassTrimMat);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.set(x, height - 0.8, z);
    rootGroup.add(ring2);

    colliders.push(new THREE.Box3().setFromObject(pillarMesh));
  }

  function addDecorativePlant(x: number, z: number, scale = 1) {
    const potGeo = new THREE.CylinderGeometry(0.5 * scale, 0.35 * scale, 0.6 * scale, 8);
    const pot = new THREE.Mesh(potGeo, carvedWoodMat);
    pot.position.set(x, 0.3 * scale, z);
    pot.castShadow = true;
    rootGroup.add(pot);

    const foliageGeo = new THREE.SphereGeometry(0.8 * scale, 8, 8);
    const foliage = new THREE.Mesh(foliageGeo, mossyStoneMat);
    foliage.position.set(x, 0.9 * scale, z);
    foliage.castShadow = true;
    rootGroup.add(foliage);
  }

  // ==========================================
  // 1. ENVIRONMENT ARCHITECTURE
  // ==========================================

  // --- Area 1: Start Courtyard (z: -4 to 16, width 14) ---
  addPlatform(0, 0, 6, 14, 2, 20, woodenFloorMat);

  // Decorative border grass/moss trim
  addPlatform(-6, 0.05, 6, 1.8, 1.9, 20, mossyStoneMat);
  addPlatform(6, 0.05, 6, 1.8, 1.9, 20, mossyStoneMat);

  // Decorative pillars and planters in Start Area
  addWoodenPillar(-5, -2, 5);
  addWoodenPillar(5, -2, 5);
  addWoodenPillar(-5, 8, 5);
  addWoodenPillar(5, 8, 5);

  addDecorativePlant(-4, 0, 1.1);
  addDecorativePlant(4, 0, 1.1);
  addDecorativePlant(-4, 6, 0.9);
  addDecorativePlant(4, 6, 0.9);

  // --- Ancient Lore Tablet (Guide & Intro) ---
  const tabletGeo = new THREE.BoxGeometry(1.2, 1.6, 0.2);
  const tabletMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.3,
    roughness: 0.4,
  });
  const tabletMesh = new THREE.Mesh(tabletGeo, tabletMat);
  tabletMesh.position.set(-3.5, 0.9, 4);
  rootGroup.add(tabletMesh);

  interactiveObjects.push({
    id: 'story_tablet_stage1',
    type: 'lever',
    mesh: tabletMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(-3.5, 0.9, 4),
      new THREE.Vector3(2.5, 2, 2.5)
    ),
    prompt: 'خواندن کتیبه اولین همکاری (کلید E)',
  });

  // ==========================================
  // 2. PUZZLE: PRESSURE BUTTON & LARGE GATE
  // ==========================================

  // --- Large Pressure Button (Placed at x: -3.5, z: 12) ---
  const plateBaseGeo = new THREE.CylinderGeometry(1.6, 1.7, 0.2, 24);
  const plateBaseMesh = new THREE.Mesh(plateBaseGeo, plateBaseMat);
  plateBaseMesh.position.set(-3.5, 0.1, 12);
  plateBaseMesh.receiveShadow = true;
  rootGroup.add(plateBaseMesh);

  const plateCapGeo = new THREE.CylinderGeometry(1.4, 1.45, 0.18, 24);
  const plateCapMesh = new THREE.Mesh(plateCapGeo, plateActiveMat);
  plateCapMesh.position.set(-3.5, 0.18, 12);
  plateCapMesh.receiveShadow = true;
  rootGroup.add(plateCapMesh);

  // Glowing brass rune ring around the button
  const plateRingGeo = new THREE.TorusGeometry(1.5, 0.05, 8, 24);
  const plateRing = new THREE.Mesh(plateRingGeo, brassTrimMat);
  plateRing.rotation.x = Math.PI / 2;
  plateRing.position.set(-3.5, 0.22, 12);
  rootGroup.add(plateRing);

  interactiveObjects.push({
    id: 'plate_gate_1',
    type: 'pressure_plate',
    mesh: plateCapMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(-3.5, 0.5, 12),
      new THREE.Vector3(3.2, 1.8, 3.2)
    ),
    prompt: 'روی دکمه فشاری بایستید تا دروازه باز بماند',
  });

  // --- Large Wooden Gate Architecture (At z: 16) ---
  const gateFrameLeft = addWall(-3.7, 3, 16, 1.2, 6, 1.4, carvedWoodMat);
  const gateFrameRight = addWall(3.7, 3, 16, 1.2, 6, 1.4, carvedWoodMat);
  const gateArchTop = addWall(0, 5.5, 16, 8.6, 1.2, 1.6, carvedWoodMat);

  // Side airtight barrier walls flanking the gate (prevent walking around the gate)
  const leftBarrier = addWall(-5.8, 3, 16, 3.0, 6, 1.2, boundaryWallMat);
  const rightBarrier = addWall(5.8, 3, 16, 3.0, 6, 1.2, boundaryWallMat);

  // The Sliding Gate Portcullis Mesh
  const gateGroup = new THREE.Group();
  gateGroup.position.set(0, 0, 16);
  rootGroup.add(gateGroup);

  const gateMesh = new THREE.Mesh(new THREE.BoxGeometry(6.2, 4.8, 0.7), gateWoodMat);
  gateMesh.position.y = 2.4;
  gateMesh.castShadow = true;
  gateGroup.add(gateMesh);

  // Brass vertical reinforcing bars on the gate
  for (let bx = -2.4; bx <= 2.4; bx += 0.8) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 4.6, 8), brassTrimMat);
    bar.position.set(bx, 2.4, 0.38);
    gateGroup.add(bar);
  }

  // Dynamic Gate Box3 Collider index
  const gateColliderIndex = colliders.length;
  const gateBox = new THREE.Box3().setFromObject(gateMesh);
  colliders.push(gateBox);

  // ==========================================
  // 3. AREA 2: INNER SANCTUM & LEVER
  // ==========================================

  // --- Area 2: Inner Sanctum Path (z: 16 to 40, width 14) ---
  addPlatform(0, 0, 28, 14, 2, 24, woodenFloorMat);
  addPlatform(-6, 0.05, 28, 1.8, 1.9, 24, mossyStoneMat);
  addPlatform(6, 0.05, 28, 1.8, 1.9, 24, mossyStoneMat);

  // Inner pillars
  addWoodenPillar(-5, 22, 5);
  addWoodenPillar(5, 22, 5);
  addWoodenPillar(-5, 30, 5);
  addWoodenPillar(5, 30, 5);

  addDecorativePlant(-4, 20, 1.0);
  addDecorativePlant(4, 20, 1.0);
  addDecorativePlant(-4, 28, 0.9);
  addDecorativePlant(4, 28, 0.9);

  // --- The Permanent Unlock Lever (At x: 4, z: 22 behind gate) ---
  const leverPedestal = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 1.0), carvedWoodMat);
  leverPedestal.position.set(4, 0.35, 22);
  leverPedestal.castShadow = true;
  rootGroup.add(leverPedestal);

  const leverPlate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.8), brassTrimMat);
  leverPlate.position.set(4, 0.72, 22);
  rootGroup.add(leverPlate);

  const leverPivotGroup = new THREE.Group();
  leverPivotGroup.position.set(4, 0.75, 22);
  rootGroup.add(leverPivotGroup);

  const leverStick = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 8), brassTrimMat);
  leverStick.position.set(0, 0.55, 0);
  leverStick.castShadow = true;
  leverPivotGroup.add(leverStick);

  const leverHandle = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), leverCrystalMat);
  leverHandle.position.set(0, 1.1, 0);
  leverPivotGroup.add(leverHandle);

  // Initial tilt forward
  leverPivotGroup.rotation.z = 0.55;

  interactiveObjects.push({
    id: 'lever_1',
    type: 'lever',
    mesh: leverStick,
    bounds: new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(4, 0.9, 22),
      new THREE.Vector3(3.0, 2.5, 3.0)
    ),
    prompt: 'کشیدن اهرم برای باز شدن دائمی دروازه (کلید E)',
  });

  // ==========================================
  // 4. EXIT PORTAL & TWIN EXIT PADS
  // ==========================================

  // Ornate Wooden Archway at Exit (At z: 37)
  const exitArchLeft = addWall(-3.5, 3, 37, 1.0, 6, 1.2, carvedWoodMat);
  const exitArchRight = addWall(3.5, 3, 37, 1.0, 6, 1.2, carvedWoodMat);
  const exitArchTop = addWall(0, 5.6, 37, 8.0, 1.2, 1.4, carvedWoodMat);

  // Glowing Golden Portal Ring
  const portalRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.0, 0.35, 12, 32),
    brassTrimMat
  );
  portalRing.position.set(0, 4.5, 38.5);
  rootGroup.add(portalRing);

  const portalVortex = new THREE.Mesh(
    new THREE.CircleGeometry(2.8, 24),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    })
  );
  portalVortex.position.set(0, 4.5, 38.4);
  rootGroup.add(portalVortex);

  // --- Twin Exit Pads (Hasan & Niwsha must both stand here simultaneously) ---
  // Pad 1 (Left - Explorer / Niwsha)
  const p1Base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.15, 24), plateBaseMat);
  p1Base.position.set(-2.6, 0.08, 35.5);
  rootGroup.add(p1Base);

  const p1Pad = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.25, 0.15, 24), exitPadP1Mat);
  p1Pad.position.set(-2.6, 0.16, 35.5);
  rootGroup.add(p1Pad);

  // Pad 2 (Right - Guardian / Hasan)
  const p2Base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.15, 24), plateBaseMat);
  p2Base.position.set(2.6, 0.08, 35.5);
  rootGroup.add(p2Base);

  const p2Pad = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.25, 0.15, 24), exitPadP2Mat);
  p2Pad.position.set(2.6, 0.16, 35.5);
  rootGroup.add(p2Pad);

  interactiveObjects.push(
    {
      id: 'stage1_exit_p1',
      type: 'portal_pad',
      mesh: p1Pad,
      bounds: new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(-2.6, 0.5, 35.5),
        new THREE.Vector3(2.8, 2.0, 2.8)
      ),
      prompt: 'نیوشا (کاوشگر): روی سکوی خروج پورتال بایستید',
    },
    {
      id: 'stage1_exit_p2',
      type: 'portal_pad',
      mesh: p2Pad,
      bounds: new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(2.6, 0.5, 35.5),
        new THREE.Vector3(2.8, 2.0, 2.8)
      ),
      prompt: 'حسن (نگهبان): روی سکوی خروج پورتال بایستید',
    }
  );

  // ==========================================
  // 5. AIRTIGHT BOUNDARY WALLS (NO CLIPPING/BYPASSING)
  // ==========================================

  // North (Back) Wall at Exit
  addWall(0, 4, 39.5, 16, 8, 1.5, boundaryWallMat);

  // South (Front) Wall at Start
  addWall(0, 4, -4.5, 16, 8, 1.5, boundaryWallMat);

  // West (Left) Wall entire length
  addWall(-7.5, 4, 17.5, 1.5, 8, 45, boundaryWallMat);

  // East (Right) Wall entire length
  addWall(7.5, 4, 17.5, 1.5, 8, 45, boundaryWallMat);

  // ==========================================
  // 6. CHECKPOINT & SPAWN
  // ==========================================
  const cpMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 1.8, 8), exitPadP1Mat);
  cpMesh.position.set(0, 0.9, -1);
  rootGroup.add(cpMesh);

  const checkpoints = [
    { id: 0, pos: [0, 1.2, 0] as [number, number, number], active: true, mesh: cpMesh },
  ];

  // ==========================================
  // 7. DYNAMIC UPDATE LOOP & STATE MACHINE
  // ==========================================
  function update(dt: number, state: PuzzleState) {
    // 1. State Machine: LOCKED -> BUTTON_ACTIVE -> PERMANENTLY_UNLOCKED
    const isPermanentlyUnlocked = !!state.lever1Activated;
    const isButtonActive = !!state.gate1Open;
    const shouldDoorBeOpen = isPermanentlyUnlocked || isButtonActive;

    // Smooth Gate Translation
    const targetGateY = shouldDoorBeOpen ? -3.8 : 2.4;
    gateMesh.position.y += (targetGateY - gateMesh.position.y) * Math.min(1, dt * 6.5);

    // Collision Synchronization:
    // If gate is moving down and clear enough (below y: 0.2), disable collider completely
    if (gateMesh.position.y < 0.2) {
      colliders[gateColliderIndex].setFromCenterAndSize(
        new THREE.Vector3(0, -999, 0),
        new THREE.Vector3(0, 0, 0)
      );
    } else {
      colliders[gateColliderIndex].setFromObject(gateMesh);
    }

    // 2. Pressure Button Depression & Glow
    // If button is physically occupied, depress it; otherwise raise it
    const targetPlateY = isButtonActive ? 0.05 : 0.18;
    plateCapMesh.position.y += (targetPlateY - plateCapMesh.position.y) * Math.min(1, dt * 12);
    plateActiveMat.emissiveIntensity = isButtonActive ? 1.0 : 0.25;

    // 3. Lever Rotation Animation
    const targetLeverRot = isPermanentlyUnlocked ? -0.55 : 0.55;
    leverPivotGroup.rotation.z += (targetLeverRot - leverPivotGroup.rotation.z) * Math.min(1, dt * 8);
    leverCrystalMat.emissiveIntensity = isPermanentlyUnlocked ? 1.0 : 0.35;

    // 4. Exit Pads Glow when occupied
    const isP1Ready = !!state.stage1ExitP1Ready || !!(state.customData && state.customData.stage1ExitP1Ready);
    const isP2Ready = !!state.stage1ExitP2Ready || !!(state.customData && state.customData.stage1ExitP2Ready);

    exitPadP1Mat.emissiveIntensity = isP1Ready ? 1.2 : 0.35;
    exitPadP2Mat.emissiveIntensity = isP2Ready ? 1.2 : 0.35;

    // 5. Exit Vortex Subtle Swirl
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
