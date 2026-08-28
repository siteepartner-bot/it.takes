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

export function buildGardenStage(): StageBuildResult {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'stage_forgotten_garden';

  const colliders: THREE.Box3[] = [];
  const interactiveObjects: InteractiveObject[] = [];

  // --- Materials ---
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x526b58, // Mossy stone
    roughness: 0.8,
    metalness: 0.1,
  });

  const pathMat = new THREE.MeshStandardMaterial({
    color: 0x8a9a86,
    roughness: 0.9,
  });

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.7,
  });

  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.6,
    roughness: 0.2,
  });

  const mushroomMat = new THREE.MeshStandardMaterial({
    color: 0xec4899,
    emissive: 0xdb2777,
    emissiveIntensity: 0.4,
    roughness: 0.3,
  });

  const gateMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.8,
    roughness: 0.3,
  });

  // Helper to add platform with physics collider
  function addPlatform(x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material = stoneMat) {
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

  // --- Stage Architecture ---
  // Area 1: Start Courtyard
  addPlatform(0, 0, 0, 16, 2, 16, pathMat);
  addPlatform(0, 0, 12, 12, 2, 10, stoneMat);

  // Decorative Columns & Giant Luminescent Mushrooms
  function addColumn(x: number, z: number, height = 4) {
    const colGeo = new THREE.CylinderGeometry(0.5, 0.6, height, 8);
    const colMesh = new THREE.Mesh(colGeo, stoneMat);
    colMesh.position.set(x, height / 2, z);
    colMesh.castShadow = true;
    colMesh.receiveShadow = true;
    rootGroup.add(colMesh);
    colliders.push(new THREE.Box3().setFromObject(colMesh));
  }

  function addMushroom(x: number, z: number, scale = 1) {
    const stemGeo = new THREE.CylinderGeometry(0.2 * scale, 0.35 * scale, 2 * scale, 8);
    const stem = new THREE.Mesh(stemGeo, stoneMat);
    stem.position.set(x, scale, z);

    const capGeo = new THREE.SphereGeometry(1.2 * scale, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const cap = new THREE.Mesh(capGeo, mushroomMat);
    cap.position.set(0, scale, 0);
    stem.add(cap);
    rootGroup.add(stem);
  }

  addColumn(-6, -6, 5);
  addColumn(6, -6, 5);
  addColumn(-6, 6, 4);
  addColumn(6, 6, 4);
  addMushroom(-7, 2, 1.4);
  addMushroom(7, -2, 1.2);
  addMushroom(-4, 15, 0.9);

  // --- Puzzle 1-A: Pressure Plate & Runic Gate ---
  // Pressure plate on left side
  const plateGeo = new THREE.CylinderGeometry(1.2, 1.3, 0.15, 16);
  const plateMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.3,
  });
  const plateMesh = new THREE.Mesh(plateGeo, plateMat);
  plateMesh.position.set(-4, 0.08, 12);
  plateMesh.receiveShadow = true;
  rootGroup.add(plateMesh);

  interactiveObjects.push({
    id: 'plate_gate_1',
    type: 'pressure_plate',
    mesh: plateMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(-4, 0.5, 12),
      new THREE.Vector3(2.5, 1.5, 2.5)
    ),
    prompt: 'روی صفحه فشاری بایستید تا دروازه کهن باز بماند',
  });

  // Runic Gate
  const gateGroup = new THREE.Group();
  gateGroup.position.set(0, 0, 16);
  rootGroup.add(gateGroup);

  const gateMesh = new THREE.Mesh(new THREE.BoxGeometry(7, 4.5, 0.6), gateMat);
  gateMesh.position.y = 2.25;
  gateMesh.castShadow = true;
  gateGroup.add(gateMesh);

  // Gate side archways
  addColumn(-3.8, 16, 5);
  addColumn(3.8, 16, 5);
  const gateTop = new THREE.Mesh(new THREE.BoxGeometry(8.5, 1, 1), stoneMat);
  gateTop.position.set(0, 5, 16);
  rootGroup.add(gateTop);

  // Dynamic gate collider index
  const gateColliderIndex = colliders.length;
  colliders.push(new THREE.Box3().setFromObject(gateMesh));

  // Area 2: The Inner Sanctum (Past Gate 1)
  addPlatform(0, 0, 24, 16, 2, 14, pathMat);

  // Lever 1 (Inside Area 2, on right wall)
  const leverBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.8), stoneMat);
  leverBase.position.set(4, 0.2, 22);
  rootGroup.add(leverBase);

  const leverStick = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2), crystalMat);
  leverStick.position.set(4, 0.8, 22);
  leverStick.rotation.z = 0.5;
  rootGroup.add(leverStick);

  interactiveObjects.push({
    id: 'lever_1',
    type: 'lever',
    mesh: leverStick,
    bounds: new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(4, 0.8, 22),
      new THREE.Vector3(2.5, 2, 2.5)
    ),
    prompt: 'تغییر وضعیت اهرم (کلید E - قابل بازگردانی)',
  });

  // Ancient Lore Tablet 1
  const tabletGeo = new THREE.BoxGeometry(1.2, 1.8, 0.2);
  const tabletMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.4,
    metalness: 0.5,
  });
  const tablet1 = new THREE.Mesh(tabletGeo, tabletMat);
  tablet1.position.set(-6, 1, 4);
  rootGroup.add(tablet1);

  interactiveObjects.push({
    id: 'story_tablet_stage1',
    type: 'lever',
    mesh: tablet1,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-6, 1, 4), new THREE.Vector3(2.5, 2, 2.5)),
    prompt: 'خواندن کتیبه راز باغ کهن ساعت‌ساز (کلید E)',
  });

  // --- Puzzle 1-B: Heavy Conductive Block & Rising Elevator ---
  // Heavy magnetic block that Hassan (Guardian) can push/carry and jump on top of
  const blockGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
  const blockMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.4,
    metalness: 0.6,
    emissive: 0x78350f,
    emissiveIntensity: 0.3,
  });
  const heavyBlockMesh = new THREE.Mesh(blockGeo, blockMat);
  heavyBlockMesh.position.set(6, 0.8, 25);
  heavyBlockMesh.castShadow = true;
  rootGroup.add(heavyBlockMesh);

  // Add solid physical Box3 collider for heavy block so player CANNOT walk through it
  const heavyBlockColliderIndex = colliders.length;
  const heavyBlockBox = new THREE.Box3().setFromObject(heavyBlockMesh);
  colliders.push(heavyBlockBox);

  interactiveObjects.push({
    id: 'heavy_block_1',
    type: 'heavy_block',
    mesh: heavyBlockMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(heavyBlockMesh.position, new THREE.Vector3(3, 3, 3)),
    prompt: 'هل دادن / قرار دادن مکعب سنگین رسانا روی پدستال (کلید E)',
  });

  // Conduit Pedestal with glowing socket ring & energy line
  const pedestalGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.5, 8);
  const pedestalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.2,
    roughness: 0.4,
  });
  const pedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
  pedestalMesh.position.set(6, 0.25, 29);
  rootGroup.add(pedestalMesh);

  // Floating Hologram Target Ring above Pedestal
  const pedestalRingGeo = new THREE.TorusGeometry(1.4, 0.08, 8, 24);
  const pedestalRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7 });
  const pedestalRing = new THREE.Mesh(pedestalRingGeo, pedestalRingMat);
  pedestalRing.rotation.x = Math.PI / 2;
  pedestalRing.position.set(6, 0.52, 29);
  rootGroup.add(pedestalRing);

  // Glowing Energy Line connecting Pedestal to Elevator
  const lineGeo = new THREE.BoxGeometry(0.3, 0.05, 7);
  const lineMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.2,
  });
  const conduitLine = new THREE.Mesh(lineGeo, lineMat);
  conduitLine.position.set(3, 0.05, 31);
  conduitLine.rotation.y = Math.atan2(-6, 4);
  rootGroup.add(conduitLine);

  // Rising Water Elevator Platform
  const elevatorPlatform = new THREE.Mesh(new THREE.BoxGeometry(5, 0.6, 5), stoneMat);
  elevatorPlatform.position.set(0, 0.3, 33);
  elevatorPlatform.castShadow = true;
  elevatorPlatform.receiveShadow = true;
  rootGroup.add(elevatorPlatform);

  const elevatorColliderIndex = colliders.length;
  colliders.push(new THREE.Box3().setFromObject(elevatorPlatform));

  // Upper Terrace (Height y: 5.5)
  addPlatform(0, 5.5, 43, 18, 2, 14, pathMat);
  addMushroom(-6, 42, 1.6);
  addMushroom(6, 45, 1.1);

  // Checkpoint 1 (On Upper Terrace)
  const cpMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 2.5, 6), crystalMat);
  cpMesh.position.set(-6, 6.75, 39);
  rootGroup.add(cpMesh);

  const checkpoints = [
    { id: 0, pos: [0, 1.2, 0] as [number, number, number], active: true, mesh: plateMesh },
    { id: 1, pos: [0, 6.7, 41] as [number, number, number], active: false, mesh: cpMesh },
  ];

  // --- Puzzle 1-C: The Broken Chasm & Kinetic Light Bridge ---
  // Abyss gap between z: 50 and z: 66
  addPlatform(0, -6, 58, 26, 4, 18, new THREE.MeshBasicMaterial({ color: 0x0f172a })); // Dark bottom

  // Light Bridge mesh (activated by Guardian's shield / kinetic power)
  const lightBridgeGeo = new THREE.BoxGeometry(4, 0.3, 14);
  const lightBridgeMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.2,
  });
  const lightBridgeMesh = new THREE.Mesh(lightBridgeGeo, lightBridgeMat);
  lightBridgeMesh.position.set(0, 5.5, 57);
  rootGroup.add(lightBridgeMesh);

  const bridgeColliderIndex = colliders.length;
  const bridgeCollider = new THREE.Box3().setFromObject(lightBridgeMesh);
  // Default disabled collider
  bridgeCollider.min.y = -999;
  bridgeCollider.max.y = -998;
  colliders.push(bridgeCollider);

  interactiveObjects.push({
    id: 'guardian_bridge_trigger',
    type: 'bridge_switch',
    mesh: lightBridgeMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(0, 6, 49),
      new THREE.Vector3(5, 3, 3)
    ),
    targetRole: 'guardian',
    prompt: 'بِرام: با سپر محافظ (F) پل نوری را پایدار نگه دارید',
  });

  // Far Portal Island (Height y: 5.5)
  addPlatform(0, 5.5, 74, 20, 2, 16, pathMat);

  // Rotating stone lever on far side (Explorer pulls to permanently anchor the bridge)
  const anchorLever = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2), crystalMat);
  anchorLever.position.set(3, 6.6, 68);
  rootGroup.add(anchorLever);

  interactiveObjects.push({
    id: 'explorer_bridge_anchor',
    type: 'lever',
    mesh: anchorLever,
    bounds: new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(3, 6.6, 68),
      new THREE.Vector3(3, 2.5, 3)
    ),
    targetRole: 'explorer',
    prompt: 'کایلِن: اهرم را بکشید تا پل سنگی مستقر شود',
  });

  // Permanent stone bridge that drops into place
  const stoneBridge = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.8, 14), stoneMat);
  stoneBridge.position.set(0, 15, 57); // Starts high in air
  stoneBridge.castShadow = true;
  rootGroup.add(stoneBridge);
  const stoneBridgeColliderIndex = colliders.length;
  colliders.push(new THREE.Box3().setFromObject(stoneBridge));

  // --- Stage Exit Portal (Twin Glowing Circles) ---
  const portalArch = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.45, 12, 32), stoneMat);
  portalArch.position.set(0, 9, 80);
  rootGroup.add(portalArch);

  const portalVortex = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 24),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
  );
  portalVortex.position.set(0, 9, 80);
  rootGroup.add(portalVortex);

  // Twin Exit Pads
  const p1Pad = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.2, 16), plateMat);
  p1Pad.position.set(-3, 5.6, 77);
  rootGroup.add(p1Pad);

  const p2Pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.3, 0.2, 16),
    new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x059669, emissiveIntensity: 0.4 })
  );
  p2Pad.position.set(3, 5.6, 77);
  rootGroup.add(p2Pad);

  interactiveObjects.push(
    {
      id: 'stage1_exit_p1',
      type: 'portal_pad',
      mesh: p1Pad,
      bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-3, 6, 77), new THREE.Vector3(2.5, 2, 2.5)),
      prompt: 'کایلِن: روی سکوی پورتال کاوشگر بایستید',
    },
    {
      id: 'stage1_exit_p2',
      type: 'portal_pad',
      mesh: p2Pad,
      bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(3, 6, 77), new THREE.Vector3(2.5, 2, 2.5)),
      prompt: 'بِرام: روی سکوی پورتال نگهبان بایستید',
    }
  );

  // Boundaries & invisible walls to prevent straying off limits
  function addBoundary(x: number, y: number, z: number, w: number, h: number, d: number) {
    const box = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(w, h, d)
    );
    colliders.push(box);
  }

  addBoundary(-9, 5, 12, 1, 10, 30);
  addBoundary(9, 5, 12, 1, 10, 30);
  addBoundary(0, 5, -8, 20, 10, 1);
  addBoundary(-10, 8, 43, 1, 10, 20);
  addBoundary(10, 8, 43, 1, 10, 20);
  addBoundary(-11, 8, 74, 1, 10, 20);
  addBoundary(11, 8, 74, 1, 10, 20);
  addBoundary(0, 8, 83, 22, 10, 1);

  // Dynamic animation/update loop
  function update(dt: number, state: PuzzleState) {
    // 1. Gate 1 Logic: open if plate is stood on OR lever is activated
    const targetGateY = state.gate1Open || state.lever1Activated ? -3.5 : 2.25;
    gateMesh.position.y += (targetGateY - gateMesh.position.y) * Math.min(1, dt * 5);
    colliders[gateColliderIndex].setFromObject(gateMesh);

    // Pressure plate Y animation & glow
    const targetPlateY = state.gate1Open ? 0.02 : 0.08;
    plateMesh.position.y += (targetPlateY - plateMesh.position.y) * Math.min(1, dt * 10);
    plateMat.emissiveIntensity = state.gate1Open ? 1.0 : 0.3;

    // Lever animation
    leverStick.rotation.z += ((state.lever1Activated ? -0.5 : 0.5) - leverStick.rotation.z) * Math.min(1, dt * 8);

    // 2. Heavy Block Placement & Elevator with smooth lerp
    const targetBlockPos = state.heavyBlockPlaced ? new THREE.Vector3(6, 1.25, 29) : new THREE.Vector3(6, 0.8, 25);
    heavyBlockMesh.position.lerp(targetBlockPos, Math.min(1, dt * 6));
    colliders[heavyBlockColliderIndex].setFromObject(heavyBlockMesh);

    // Dynamic pedestal ring spin & conduit glow
    pedestalRing.rotation.z += dt * 2.0;
    pedestalMat.emissiveIntensity = state.heavyBlockPlaced ? 1.0 : 0.2;
    lineMat.emissiveIntensity = state.heavyBlockPlaced ? 1.0 : 0.2;

    // Raise elevator smoothly when block is placed
    const targetElevatorY = state.heavyBlockPlaced ? 5.2 : 0.3;
    elevatorPlatform.position.y += (targetElevatorY - elevatorPlatform.position.y) * Math.min(1, dt * 3);
    colliders[elevatorColliderIndex].setFromObject(elevatorPlatform);

    // 3. Light Bridge & Stone Bridge
    const bridgeActive = state.lightBridgeActive || state.bridgePedestalRotated;
    lightBridgeMat.opacity += ((bridgeActive ? 0.75 : 0.15) - lightBridgeMat.opacity) * Math.min(1, dt * 6);
    if (bridgeActive) {
      colliders[bridgeColliderIndex].setFromObject(lightBridgeMesh);
    } else {
      colliders[bridgeColliderIndex].min.y = -999;
      colliders[bridgeColliderIndex].max.y = -998;
    }

    // Anchor lever
    anchorLever.rotation.z += ((state.bridgePedestalRotated ? -0.6 : 0.6) - anchorLever.rotation.z) * Math.min(1, dt * 8);
    if (state.bridgePedestalRotated) {
      stoneBridge.position.y += (5.5 - stoneBridge.position.y) * Math.min(1, dt * 4);
      colliders[stoneBridgeColliderIndex].setFromObject(stoneBridge);
    }

    // Vortex spin
    portalVortex.rotation.z += dt * 1.5;
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
