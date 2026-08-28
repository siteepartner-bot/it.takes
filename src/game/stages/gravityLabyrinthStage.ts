import * as THREE from 'three';
import type { PuzzleState } from '../../types.ts';
import type { StageBuildResult, InteractiveObject } from './gardenStage.ts';

export function buildGravityLabyrinthStage(): StageBuildResult {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'stage_gravity_labyrinth';

  const colliders: THREE.Box3[] = [];
  const interactiveObjects: InteractiveObject[] = [];

  // --- Materials ---
  const cosmicFloorMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.8,
    roughness: 0.2,
  });

  const neonCyanMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.6,
    metalness: 0.5,
    roughness: 0.2,
  });

  const neonPurpleMat = new THREE.MeshStandardMaterial({
    color: 0xc084fc,
    emissive: 0x9333ea,
    emissiveIntensity: 0.7,
  });

  const forcefieldMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.4,
    wireframe: true,
  });

  function addPlatform(x: number, y: number, z: number, w: number, h: number, d: number, mat = cosmicFloorMat) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y - h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rootGroup.add(mesh);
    colliders.push(new THREE.Box3().setFromObject(mesh));
    return mesh;
  }

  // --- Chamber 1: The Void Atrium ---
  addPlatform(0, 0, 0, 18, 2, 18, cosmicFloorMat);
  addPlatform(0, 0, 18, 8, 2, 16, cosmicFloorMat);

  // Floating gravity rings
  for (let i = 0; i < 5; i++) {
    const ringGeo = new THREE.TorusGeometry(3 + i * 0.8, 0.15, 12, 32);
    const ringMesh = new THREE.Mesh(ringGeo, neonPurpleMat);
    ringMesh.position.set(0, 4 + i * 1.5, 0);
    ringMesh.rotation.x = Math.PI / 2 + i * 0.2;
    rootGroup.add(ringMesh);
  }

  // --- Puzzle 5-A: Dual Inverted Gravity Switch ---
  const switch1Mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.4, 16), neonCyanMat);
  switch1Mesh.position.set(-3, 0.2, 16);
  rootGroup.add(switch1Mesh);

  interactiveObjects.push({
    id: 'gravity_switch_1',
    type: 'pressure_plate',
    mesh: switch1Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-3, 0.5, 16), new THREE.Vector3(2, 1.5, 2)),
    prompt: 'فعال‌سازی مدار ضدجاذبه (کاوشگر)',
    targetRole: 'explorer',
  });

  const switch2Mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.4, 16), neonPurpleMat);
  switch2Mesh.position.set(3, 0.2, 16);
  rootGroup.add(switch2Mesh);

  interactiveObjects.push({
    id: 'gravity_switch_2',
    type: 'pressure_plate',
    mesh: switch2Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(3, 0.5, 16), new THREE.Vector3(2, 1.5, 2)),
    prompt: 'فعال‌سازی مدار ضدجاذبه (نگهبان)',
    targetRole: 'guardian',
  });

  // Levitating Light Bridge
  const bridgeGeo = new THREE.BoxGeometry(6, 0.4, 16);
  const bridgeMesh = new THREE.Mesh(bridgeGeo, forcefieldMat);
  bridgeMesh.position.set(0, 0, 32);
  bridgeMesh.visible = false;
  rootGroup.add(bridgeMesh);

  const bridgeColliderIndex = colliders.length;
  colliders.push(new THREE.Box3().setFromObject(bridgeMesh));

  // --- Chamber 2: The Astral Sanctuary & Boss Gate ---
  addPlatform(0, 2, 48, 26, 2, 22, cosmicFloorMat);

  // Checkpoints
  const checkpoints = [
    {
      id: 0,
      pos: [0, 1.2, 0] as [number, number, number],
      active: true,
      mesh: new THREE.Mesh(new THREE.RingGeometry(1, 1.3, 16), new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })),
    },
    {
      id: 1,
      pos: [0, 3.2, 44] as [number, number, number],
      active: false,
      mesh: new THREE.Mesh(new THREE.RingGeometry(1, 1.3, 16), new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })),
    },
  ];

  checkpoints[0].mesh.rotateX(-Math.PI / 2);
  checkpoints[0].mesh.position.set(0, 0.05, 0);
  rootGroup.add(checkpoints[0].mesh);

  checkpoints[1].mesh.rotateX(-Math.PI / 2);
  checkpoints[1].mesh.position.set(0, 2.05, 44);
  rootGroup.add(checkpoints[1].mesh);

  // Exit Dual Pads
  const padMat1 = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2, emissiveIntensity: 0.5 });
  const padMat2 = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.5 });

  const exitPad1 = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.25, 16), padMat1);
  exitPad1.position.set(-5, 2.15, 52);
  rootGroup.add(exitPad1);

  const exitPad2 = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.25, 16), padMat2);
  exitPad2.position.set(5, 2.15, 52);
  rootGroup.add(exitPad2);

  interactiveObjects.push({
    id: 'stage5_exit_p1',
    type: 'portal_pad',
    mesh: exitPad1,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-5, 2.5, 52), new THREE.Vector3(2.5, 2, 2.5)),
    targetRole: 'explorer',
    prompt: 'ایستادن روی سکوی عبور (کاوشگر)',
  });

  interactiveObjects.push({
    id: 'stage5_exit_p2',
    type: 'portal_pad',
    mesh: exitPad2,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(5, 2.5, 52), new THREE.Vector3(2.5, 2, 2.5)),
    targetRole: 'guardian',
    prompt: 'ایستادن روی سکوی عبور (نگهبان)',
  });

  return {
    rootGroup,
    colliders,
    interactiveObjects,
    spawnPoint: [0, 1.2, 0],
    checkpoints,
    update: (dt: number, state: PuzzleState) => {
      const bridgeActive = state.customData?.gravityBridgeActive || (state.customData?.switch1 && state.customData?.switch2);
      if (bridgeActive) {
        bridgeMesh.visible = true;
        colliders[bridgeColliderIndex].setFromObject(bridgeMesh);
      } else {
        bridgeMesh.visible = false;
        colliders[bridgeColliderIndex].makeEmpty();
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
