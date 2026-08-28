import * as THREE from 'three';
import type { PuzzleState } from '../../types.ts';
import type { StageBuildResult, InteractiveObject } from './gardenStage.ts';

export function buildFloatingIslandsStage(): StageBuildResult {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'stage_floating_islands';

  const colliders: THREE.Box3[] = [];
  const interactiveObjects: InteractiveObject[] = [];

  // --- Materials ---
  const islandMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    roughness: 0.7,
  });

  const pathMat = new THREE.MeshStandardMaterial({
    color: 0xe0e7ff,
    roughness: 0.5,
  });

  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.7,
  });

  const turretMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xb91c1c,
    emissiveIntensity: 0.4,
    metalness: 0.8,
  });

  const laserMat = new THREE.MeshBasicMaterial({
    color: 0xff0055,
    transparent: true,
    opacity: 0.8,
  });

  // Helper to create floating island with inverted cone base
  function addIsland(x: number, y: number, z: number, radius: number, depth = 6) {
    const topGeo = new THREE.CylinderGeometry(radius, radius * 0.9, 1.5, 12);
    const topMesh = new THREE.Mesh(topGeo, pathMat);
    topMesh.position.set(x, y - 0.75, z);
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;
    rootGroup.add(topMesh);

    const baseGeo = new THREE.ConeGeometry(radius * 0.9, depth, 12);
    baseGeo.rotateX(Math.PI);
    const baseMesh = new THREE.Mesh(baseGeo, islandMat);
    baseMesh.position.set(x, y - 1.5 - depth / 2, z);
    rootGroup.add(baseMesh);

    const box = new THREE.Box3().setFromObject(topMesh);
    colliders.push(box);
    return topMesh;
  }

  // Island 1: Start Island (x: 0, y: 0, z: 0)
  addIsland(0, 0, 0, 7);

  // Floating ambient crystals
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const crystalGeo = new THREE.OctahedronGeometry(0.6 + Math.random() * 0.4, 0);
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.set(Math.cos(angle) * 11, Math.sin(angle * 2) * 2 + 2, Math.sin(angle) * 11);
    rootGroup.add(crystal);
  }

  // --- Puzzle 2-A: Oscillating Co-op Sky Platform ---
  const movingPlatform = new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 4), pathMat);
  movingPlatform.position.set(0, 0, 14);
  movingPlatform.castShadow = true;
  rootGroup.add(movingPlatform);

  const platformColliderIndex = colliders.length;
  colliders.push(new THREE.Box3().setFromObject(movingPlatform));

  // Console to guide the platform
  const crankMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xb45309, emissiveIntensity: 0.3 });
  const crankBase = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1, 8), crankMat);
  crankBase.position.set(3, 0.5, 5);
  rootGroup.add(crankBase);

  interactiveObjects.push({
    id: 'crank_island_bridge',
    type: 'bridge_switch',
    mesh: crankBase,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(3, 1, 5), new THREE.Vector3(2.5, 2, 2.5)),
    prompt: 'تغییر وضعیت اهرم سکوی پرنده آسمانی (کلید E - قابل بازگردانی)',
  });

  // Ancient Lore Tablet 2
  const tabletGeo2 = new THREE.BoxGeometry(1.2, 1.8, 0.2);
  const tabletMat2 = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.5 });
  const tablet2 = new THREE.Mesh(tabletGeo2, tabletMat2);
  tablet2.position.set(-4, 1, 2);
  rootGroup.add(tablet2);

  interactiveObjects.push({
    id: 'story_tablet_stage2',
    type: 'lever',
    mesh: tablet2,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-4, 1, 2), new THREE.Vector3(2.5, 2, 2.5)),
    prompt: 'خواندن کتیبه راز جزایر معلق و برجک‌های نگهبان (کلید E)',
  });

  // Island 2: The Sentinel Trial (x: 0, y: 2, z: 28)
  addIsland(0, 2, 28, 8);

  // Checkpoint 1
  const cpMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.2, 6), crystalMat);
  cpMesh.position.set(-4, 3.1, 24);
  rootGroup.add(cpMesh);

  const checkpoints = [
    { id: 0, pos: [0, 1.2, 0] as [number, number, number], active: true, mesh: crankBase },
    { id: 1, pos: [0, 3.2, 26] as [number, number, number], active: false, mesh: cpMesh },
  ];

  // --- Puzzle 2-B: Sentinel Turret & Guardian Aegis Deflection ---
  const turretGroup = new THREE.Group();
  turretGroup.position.set(0, 5, 38);
  rootGroup.add(turretGroup);

  const turretOrb = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), turretMat);
  turretGroup.add(turretOrb);

  const eyeLens = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.6, 12), laserMat);
  eyeLens.rotation.x = Math.PI / 2;
  eyeLens.position.set(0, 0, -1);
  turretGroup.add(eyeLens);

  // Continuous laser beam blocking corridor
  const laserBeamGeo = new THREE.CylinderGeometry(0.12, 0.12, 14, 8);
  laserBeamGeo.rotateX(Math.PI / 2);
  laserBeamGeo.translate(0, 0, -7);
  const laserBeamMesh = new THREE.Mesh(laserBeamGeo, laserMat);
  laserBeamMesh.position.set(0, 0, 0);
  turretGroup.add(laserBeamMesh);

  // Disruptor terminal behind turret (Explorer dashes to deactivate)
  const terminalMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1.4, 0.8), crystalMat);
  terminalMesh.position.set(4, 2.7, 36);
  rootGroup.add(terminalMesh);

  interactiveObjects.push({
    id: 'disrupt_laser_turret',
    type: 'lever',
    mesh: terminalMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(4, 3, 36), new THREE.Vector3(2.5, 2.5, 2.5)),
    targetRole: 'explorer',
    prompt: 'کایلِن: هسته انرژی نگهبان لیزری را غیرفعال کنید',
  });

  // Island 3: The Ascendant Summit (x: 0, y: 7, z: 52)
  addIsland(0, 7, 52, 9);

  // Anti-gravity wind vortex column
  const vortexRings: THREE.Mesh[] = [];
  for (let r = 0; r < 5; r++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2, 0.15, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 3 + r * 1.2, 42);
    rootGroup.add(ring);
    vortexRings.push(ring);
  }

  // Stage 2 Exit Portal
  const portalArch = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.45, 12, 32), pathMat);
  portalArch.position.set(0, 10.5, 57);
  rootGroup.add(portalArch);

  const portalVortex = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 24),
    new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
  );
  portalVortex.position.set(0, 10.5, 57);
  rootGroup.add(portalVortex);

  const p1Pad = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.2, 16), crystalMat);
  p1Pad.position.set(-3, 7.1, 54);
  rootGroup.add(p1Pad);

  const p2Pad = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.2, 16), crystalMat);
  p2Pad.position.set(3, 7.1, 54);
  rootGroup.add(p2Pad);

  interactiveObjects.push(
    {
      id: 'stage2_exit_p1',
      type: 'portal_pad',
      mesh: p1Pad,
      bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-3, 7.5, 54), new THREE.Vector3(2.5, 2, 2.5)),
      prompt: 'کایلِن: روی سکوی پورتال کاوشگر بایستید',
    },
    {
      id: 'stage2_exit_p2',
      type: 'portal_pad',
      mesh: p2Pad,
      bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(3, 7.5, 54), new THREE.Vector3(2.5, 2, 2.5)),
      prompt: 'بِرام: روی سکوی پورتال نگهبان بایستید',
    }
  );

  let platformTime = 0;
  function update(dt: number, state: PuzzleState) {
    // Platform oscillates smoothly between z: 7 and z: 21
    if (state.floatingIslandBridgeActive) {
      platformTime += dt * 1.5;
      const targetZ = 14 + Math.sin(platformTime) * 7;
      movingPlatform.position.z = targetZ;
      colliders[platformColliderIndex].setFromObject(movingPlatform);
    }

    // Laser Turret
    if (state.laserTurretDisabled) {
      laserBeamMesh.visible = false;
      turretMat.emissive.setHex(0x22c55e); // Turn green deactivated
    } else {
      laserBeamMesh.visible = true;
      laserBeamMesh.scale.x = 1 + Math.sin(performance.now() * 0.01) * 0.1;
    }

    // Vortex animation
    vortexRings.forEach((r, idx) => {
      r.rotation.z += dt * (2 + idx * 0.5);
      r.position.y = 3 + ((performance.now() * 0.002 + idx * 0.8) % 5);
    });

    portalVortex.rotation.z += dt * 1.2;
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
