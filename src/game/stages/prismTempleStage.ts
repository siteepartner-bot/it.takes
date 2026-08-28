import * as THREE from 'three';
import type { PuzzleState } from '../../types.ts';
import type { StageBuildResult, InteractiveObject } from './gardenStage.ts';

export function buildPrismTempleStage(): StageBuildResult {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'stage_prism_temple';

  const colliders: THREE.Box3[] = [];
  const interactiveObjects: InteractiveObject[] = [];

  // --- Materials ---
  const goldSandstoneMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.5,
    metalness: 0.3,
  });

  const templeFloorMat = new THREE.MeshStandardMaterial({
    color: 0x1e1b4b,
    roughness: 0.6,
    metalness: 0.2,
  });

  const mirrorMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    metalness: 0.95,
    roughness: 0.05,
    emissive: 0x0284c7,
    emissiveIntensity: 0.2,
  });

  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.85,
  });

  const crystalCoreMat = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    emissive: 0x9333ea,
    emissiveIntensity: 0.8,
    roughness: 0.1,
  });

  function addPlatform(x: number, y: number, z: number, w: number, h: number, d: number, mat = templeFloorMat) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y - h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rootGroup.add(mesh);
    colliders.push(new THREE.Box3().setFromObject(mesh));
    return mesh;
  }

  function addPillar(x: number, z: number, height = 6) {
    const geo = new THREE.CylinderGeometry(0.6, 0.8, height, 8);
    const mesh = new THREE.Mesh(geo, goldSandstoneMat);
    mesh.position.set(x, height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rootGroup.add(mesh);
    colliders.push(new THREE.Box3().setFromObject(mesh));
  }

  // --- Area 1: Sun Portal Entrance ---
  addPlatform(0, 0, 0, 20, 2, 20, templeFloorMat);
  addPillar(-8, -6);
  addPillar(8, -6);
  addPillar(-8, 6);
  addPillar(8, 6);

  // Floating solar crystals
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), crystalCoreMat);
    crystal.position.set(Math.cos(ang) * 9, 3.5 + Math.sin(i) * 0.5, Math.sin(ang) * 9);
    rootGroup.add(crystal);
  }

  // --- Puzzle 4-A: Rotating Light Prism 1 ---
  const prism1Group = new THREE.Group();
  prism1Group.position.set(-4, 0.5, 5);
  rootGroup.add(prism1Group);

  const pedestal1 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 1, 8), goldSandstoneMat);
  prism1Group.add(pedestal1);
  const mirror1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 0.2), mirrorMat);
  mirror1.position.y = 1.2;
  prism1Group.add(mirror1);

  interactiveObjects.push({
    id: 'prism_pedestal_1',
    type: 'bridge_switch',
    mesh: pedestal1,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-4, 1, 5), new THREE.Vector3(2.5, 2, 2.5)),
    prompt: 'چرخاندن منشور نوری ۱ (کلید E)',
  });

  // Light Beam 1
  const beam1Geo = new THREE.CylinderGeometry(0.06, 0.06, 18, 8);
  beam1Geo.rotateZ(Math.PI / 2);
  const beam1 = new THREE.Mesh(beam1Geo, beamMat);
  beam1.position.set(5, 1.7, 5);
  rootGroup.add(beam1);

  // --- Area 2: Hall of Prisms & Reflectors ---
  addPlatform(0, 1, 24, 22, 2, 20, templeFloorMat);

  const prism2Group = new THREE.Group();
  prism2Group.position.set(5, 1.5, 22);
  rootGroup.add(prism2Group);

  const pedestal2 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 1, 8), goldSandstoneMat);
  prism2Group.add(pedestal2);
  const mirror2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 0.2), mirrorMat);
  mirror2.position.y = 1.2;
  prism2Group.add(mirror2);

  interactiveObjects.push({
    id: 'prism_pedestal_2',
    type: 'bridge_switch',
    mesh: pedestal2,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(5, 2, 22), new THREE.Vector3(2.5, 2, 2.5)),
    prompt: 'چرخاندن منشور نوری ۲ (کلید E)',
  });

  // Solar Gate
  const gateGroup = new THREE.Group();
  gateGroup.position.set(0, 2, 34);
  rootGroup.add(gateGroup);

  const gateDoor = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 0.8), goldSandstoneMat);
  gateDoor.position.y = 3;
  gateDoor.castShadow = true;
  gateGroup.add(gateDoor);

  const gateColliderIndex = colliders.length;
  colliders.push(new THREE.Box3().setFromObject(gateDoor));

  // --- Area 3: Sun Sanctuary Apex & Dual Portal ---
  addPlatform(0, 3, 50, 24, 2, 24, templeFloorMat);

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
      pos: [0, 2.2, 24] as [number, number, number],
      active: false,
      mesh: new THREE.Mesh(new THREE.RingGeometry(1, 1.3, 16), new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })),
    },
  ];

  checkpoints[0].mesh.rotateX(-Math.PI / 2);
  checkpoints[0].mesh.position.set(0, 0.05, 0);
  rootGroup.add(checkpoints[0].mesh);

  checkpoints[1].mesh.rotateX(-Math.PI / 2);
  checkpoints[1].mesh.position.set(0, 1.05, 24);
  rootGroup.add(checkpoints[1].mesh);

  // Dual Exit Portal Pads
  const padMat1 = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2, emissiveIntensity: 0.5 });
  const padMat2 = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.5 });

  const exitPad1 = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.25, 16), padMat1);
  exitPad1.position.set(-4, 3.15, 52);
  rootGroup.add(exitPad1);

  const exitPad2 = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.25, 16), padMat2);
  exitPad2.position.set(4, 3.15, 52);
  rootGroup.add(exitPad2);

  interactiveObjects.push({
    id: 'stage4_exit_p1',
    type: 'portal_pad',
    mesh: exitPad1,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-4, 3.5, 52), new THREE.Vector3(2.5, 2, 2.5)),
    targetRole: 'explorer',
    prompt: 'ایستادن روی درگاه خورشیدی (کاوشگر)',
  });

  interactiveObjects.push({
    id: 'stage4_exit_p2',
    type: 'portal_pad',
    mesh: exitPad2,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(4, 3.5, 52), new THREE.Vector3(2.5, 2, 2.5)),
    targetRole: 'guardian',
    prompt: 'ایستادن روی درگاه خورشیدی (نگهبان)',
  });

  let prism1Rot = 0;
  let prism2Rot = 0;

  return {
    rootGroup,
    colliders,
    interactiveObjects,
    spawnPoint: [0, 1.2, 0],
    checkpoints,
    update: (dt: number, state: PuzzleState) => {
      // Dynamic prism animation
      if (state.customData?.prism1Aligned) {
        prism1Rot = THREE.MathUtils.lerp(prism1Rot, Math.PI / 4, dt * 3);
        beam1.visible = true;
      }
      if (state.customData?.prism2Aligned) {
        prism2Rot = THREE.MathUtils.lerp(prism2Rot, -Math.PI / 4, dt * 3);
      }
      prism1Group.rotation.y = prism1Rot;
      prism2Group.rotation.y = prism2Rot;

      // Gate opening
      const gateOpen = state.customData?.prism1Aligned && state.customData?.prism2Aligned;
      if (gateOpen) {
        gateDoor.position.y = THREE.MathUtils.lerp(gateDoor.position.y, 8, dt * 2.5);
        colliders[gateColliderIndex].setFromObject(gateDoor);
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
