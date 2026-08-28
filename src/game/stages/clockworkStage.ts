import * as THREE from 'three';
import type { PuzzleState } from '../../types.ts';
import type { StageBuildResult, InteractiveObject } from './gardenStage.ts';

export function buildClockworkStage(): StageBuildResult {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'stage_clockwork_factory';

  const colliders: THREE.Box3[] = [];
  const interactiveObjects: InteractiveObject[] = [];

  // --- Materials ---
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.8,
    roughness: 0.25,
  });

  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    metalness: 0.85,
    roughness: 0.3,
  });

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.5,
    roughness: 0.6,
  });

  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.8,
  });

  function addPlatform(x: number, y: number, z: number, w: number, h: number, d: number, mat = floorMat) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y - h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rootGroup.add(mesh);
    colliders.push(new THREE.Box3().setFromObject(mesh));
    return mesh;
  }

  // Helper to build a mechanical gear
  function addGear(radius: number, teethCount = 12, thickness = 0.4): THREE.Group {
    const gear = new THREE.Group();
    const diskGeo = new THREE.CylinderGeometry(radius, radius, thickness, 24);
    const disk = new THREE.Mesh(diskGeo, brassMat);
    gear.add(disk);

    for (let i = 0; i < teethCount; i++) {
      const angle = (i / teethCount) * Math.PI * 2;
      const toothGeo = new THREE.BoxGeometry(radius * 0.25, thickness, radius * 0.3);
      const tooth = new THREE.Mesh(toothGeo, brassMat);
      tooth.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      tooth.rotation.y = -angle;
      gear.add(tooth);
    }
    return gear;
  }

  // Main Floor Chamber
  addPlatform(0, 0, 0, 18, 2, 18);
  addPlatform(0, 0, 20, 20, 2, 18);
  addPlatform(0, 4, 44, 24, 2, 22);

  // Massive Background Cogs
  const gear1 = addGear(4.5, 16, 0.6);
  gear1.rotation.x = Math.PI / 2;
  gear1.position.set(-8, 7, 18);
  rootGroup.add(gear1);

  const gear2 = addGear(3.2, 12, 0.6);
  gear2.rotation.x = Math.PI / 2;
  gear2.position.set(-2, 10, 18);
  rootGroup.add(gear2);

  const gear3 = addGear(5.5, 20, 0.8);
  gear3.rotation.x = Math.PI / 2;
  gear3.position.set(8, 7, 24);
  rootGroup.add(gear3);

  // --- Puzzle 3-A: Crusher Piston & Heavy Jamming Block ---
  const pistonGroup = new THREE.Group();
  pistonGroup.position.set(0, 4.5, 10);
  rootGroup.add(pistonGroup);

  const pistonMesh = new THREE.Mesh(new THREE.BoxGeometry(6, 2.5, 3), copperMat);
  pistonMesh.position.y = 0;
  pistonMesh.castShadow = true;
  pistonGroup.add(pistonMesh);

  const pistonColliderIndex = colliders.length;
  colliders.push(new THREE.Box3().setFromObject(pistonMesh));

  // Jamming Crate that Hassan (Guardian) can push/position and jump on top of
  const jamCrate = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.8), copperMat);
  jamCrate.position.set(4, 0.9, 5);
  jamCrate.castShadow = true;
  rootGroup.add(jamCrate);

  // Add solid physical Box3 collider so player CANNOT walk through jam crate
  const jamCrateColliderIndex = colliders.length;
  const jamCrateBox = new THREE.Box3().setFromObject(jamCrate);
  colliders.push(jamCrateBox);

  interactiveObjects.push({
    id: 'clockwork_jam_crate',
    type: 'heavy_block',
    mesh: jamCrate,
    bounds: new THREE.Box3().setFromCenterAndSize(jamCrate.position, new THREE.Vector3(2.5, 2.5, 2.5)),
    prompt: 'هل دادن / مهار پیستون با جعبه برنجی (کلید E)',
  });

  // Ancient Lore Tablet 3
  const tabletGeo3 = new THREE.BoxGeometry(1.2, 1.8, 0.2);
  const tabletMat3 = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.5 });
  const tablet3 = new THREE.Mesh(tabletGeo3, tabletMat3);
  tablet3.position.set(-5, 1, 2);
  rootGroup.add(tablet3);

  interactiveObjects.push({
    id: 'story_tablet_stage3',
    type: 'lever',
    mesh: tablet3,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-5, 1, 2), new THREE.Vector3(2.5, 2, 2.5)),
    prompt: 'خواندن کتیبه راز کوره زمان و چرخ‌دنده‌ها (کلید E)',
  });

  // Checkpoint 1
  const cpMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.5, 6), glowMat);
  cpMesh.position.set(-6, 5.25, 36);
  rootGroup.add(cpMesh);

  const checkpoints = [
    { id: 0, pos: [0, 1.2, 0] as [number, number, number], active: true, mesh: jamCrate },
    { id: 1, pos: [0, 5.2, 38] as [number, number, number], active: false, mesh: cpMesh },
  ];

  // --- Puzzle 3-B: Synchronized Dual Steam Valves ---
  // Valve 1 (Left side, Explorer)
  const valve1Base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1, 12), brassMat);
  valve1Base.position.set(-7, 4.5, 42);
  rootGroup.add(valve1Base);

  const valve1Wheel = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 8, 16), glowMat);
  valve1Wheel.position.set(-7, 5.2, 42);
  valve1Wheel.rotation.x = Math.PI / 2;
  rootGroup.add(valve1Wheel);

  interactiveObjects.push({
    id: 'boiler_valve_1',
    type: 'lever',
    mesh: valve1Wheel,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-7, 5, 42), new THREE.Vector3(2.5, 2.5, 2.5)),
    targetRole: 'explorer',
    prompt: 'کایلِن: شیر بخار ۱ را بچرخانید (هماهنگ با هم‌تیمی!)',
  });

  // Valve 2 (Right side, Guardian)
  const valve2Base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1, 12), brassMat);
  valve2Base.position.set(7, 4.5, 42);
  rootGroup.add(valve2Base);

  const valve2Wheel = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 8, 16), glowMat);
  valve2Wheel.position.set(7, 5.2, 42);
  valve2Wheel.rotation.x = Math.PI / 2;
  rootGroup.add(valve2Wheel);

  interactiveObjects.push({
    id: 'boiler_valve_2',
    type: 'lever',
    mesh: valve2Wheel,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(7, 5, 42), new THREE.Vector3(2.5, 2.5, 2.5)),
    targetRole: 'guardian',
    prompt: 'بِرام: شیر بخار ۲ را بچرخانید (هماهنگ با هم‌تیمی!)',
  });

  // --- Puzzle 3-C: The Grand Clockwork Gateway ---
  const grandGate = new THREE.Group();
  grandGate.position.set(0, 9, 53);
  rootGroup.add(grandGate);

  const archMesh = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.5, 12, 32), brassMat);
  grandGate.add(archMesh);

  const portalCore = new THREE.Mesh(
    new THREE.CircleGeometry(3.8, 32),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  grandGate.add(portalCore);

  const p1Pad = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.2, 16), glowMat);
  p1Pad.position.set(-3, 4.1, 49);
  rootGroup.add(p1Pad);

  const p2Pad = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.2, 16), glowMat);
  p2Pad.position.set(3, 4.1, 49);
  rootGroup.add(p2Pad);

  interactiveObjects.push(
    {
      id: 'stage3_exit_p1',
      type: 'portal_pad',
      mesh: p1Pad,
      bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-3, 4.5, 49), new THREE.Vector3(2.5, 2, 2.5)),
      prompt: 'کایلِن: روی سکوی پیروزی بایستید',
    },
    {
      id: 'stage3_exit_p2',
      type: 'portal_pad',
      mesh: p2Pad,
      bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(3, 4.5, 49), new THREE.Vector3(2.5, 2, 2.5)),
      prompt: 'بِرام: روی سکوی پیروزی بایستید',
    }
  );

  let animT = 0;
  function update(dt: number, state: PuzzleState) {
    animT += dt;

    // Rotate massive cogs
    gear1.rotation.y = animT * 0.4;
    gear2.rotation.y = -animT * 0.6;
    gear3.rotation.y = animT * 0.3;

    // Piston cycle (unless jammed)
    if (!state.crusherJammed) {
      const pistonY = 3.5 + Math.sin(animT * 3) * 2;
      pistonMesh.position.y = pistonY;
      colliders[pistonColliderIndex].setFromObject(pistonMesh);
    } else {
      // Stopped raised
      pistonMesh.position.y = 5.2;
      colliders[pistonColliderIndex].setFromObject(pistonMesh);
    }

    // Jam crate position & collider update
    if (state.crusherJammed) {
      jamCrate.position.set(0, 0.9, 10);
    }
    colliders[jamCrateColliderIndex].setFromObject(jamCrate);

    // Valves spin when turned
    if (state.boilerValve1) valve1Wheel.rotation.z += dt * 3;
    if (state.boilerValve2) valve2Wheel.rotation.z -= dt * 3;

    portalCore.rotation.z += dt * 1.5;
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
