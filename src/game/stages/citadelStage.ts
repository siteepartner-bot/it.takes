import * as THREE from 'three';
import type { PuzzleState } from '../../types.ts';
import type { StageBuildResult, InteractiveObject } from './gardenStage.ts';

export function buildCitadelStage(): StageBuildResult {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'stage_citadel_eternity';

  const colliders: THREE.Box3[] = [];
  const interactiveObjects: InteractiveObject[] = [];

  // --- Materials ---
  const obsidianMat = new THREE.MeshStandardMaterial({
    color: 0x09090b,
    metalness: 0.9,
    roughness: 0.15,
  });

  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.85,
    roughness: 0.25,
    emissive: 0xd97706,
    emissiveIntensity: 0.3,
  });

  const coreAetherMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.2,
    roughness: 0.1,
  });

  const monolithMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.7,
    roughness: 0.3,
  });

  function addPlatform(x: number, y: number, z: number, w: number, h: number, d: number, mat = obsidianMat) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y - h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rootGroup.add(mesh);
    colliders.push(new THREE.Box3().setFromObject(mesh));
    return mesh;
  }

  // --- Central Boss Arena ---
  addPlatform(0, 0, 0, 36, 2, 36, obsidianMat);

  // Giant Golden Citadel Rim
  const rimGeo = new THREE.TorusGeometry(17, 0.6, 16, 64);
  const rimMesh = new THREE.Mesh(rimGeo, goldTrimMat);
  rimMesh.rotation.x = Math.PI / 2;
  rimMesh.position.set(0, 0.3, 0);
  rootGroup.add(rimMesh);

  // Ancient Lore Tablet 6
  const tabletGeo6 = new THREE.BoxGeometry(1.2, 1.8, 0.2);
  const tabletMat6 = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.6 });
  const tablet6 = new THREE.Mesh(tabletGeo6, tabletMat6);
  tablet6.position.set(0, 1, -12);
  rootGroup.add(tablet6);

  interactiveObjects.push({
    id: 'story_tablet_stage6',
    type: 'lever',
    mesh: tablet6,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, 1, -12), new THREE.Vector3(2.5, 2, 2.5)),
    prompt: 'خواندن کتیبه راز نهایی دژ ابدیت و نجات بلور اِیتِر (کلید E)',
  });
  const coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(2.5, 2), coreAetherMat);
  coreMesh.position.set(0, 5, 0);
  rootGroup.add(coreMesh);

  // 4 Elemental Monoliths surrounding the arena
  const monolithPositions = [
    { x: -10, z: -10, name: 'آتش (Fire)', id: 'monolith_fire' },
    { x: 10, z: -10, name: 'آب (Water)', id: 'monolith_water' },
    { x: -10, z: 10, name: 'باد (Air)', id: 'monolith_air' },
    { x: 10, z: 10, name: 'خاک (Earth)', id: 'monolith_earth' },
  ];

  monolithPositions.forEach((m) => {
    const monoGroup = new THREE.Group();
    monoGroup.position.set(m.x, 0, m.z);
    rootGroup.add(monoGroup);

    const pillar = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 2), monolithMat);
    pillar.position.y = 3;
    pillar.castShadow = true;
    monoGroup.add(pillar);
    colliders.push(new THREE.Box3().setFromObject(pillar));

    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0), goldTrimMat);
    crystal.position.y = 7;
    monoGroup.add(crystal);

    interactiveObjects.push({
      id: m.id,
      type: 'lever',
      mesh: pillar,
      bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(m.x, 2, m.z), new THREE.Vector3(3.5, 3, 3.5)),
      prompt: `فعال‌سازی ستون باستانی عنصر ${m.name} (کلید E)`,
    });
  });

  // Checkpoints
  const checkpoints = [
    {
      id: 0,
      pos: [0, 1.2, -14] as [number, number, number],
      active: true,
      mesh: new THREE.Mesh(new THREE.RingGeometry(1, 1.3, 16), new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })),
    },
  ];

  checkpoints[0].mesh.rotateX(-Math.PI / 2);
  checkpoints[0].mesh.position.set(0, 0.05, -14);
  rootGroup.add(checkpoints[0].mesh);

  // Final Victory Altar Pads
  const padMat1 = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2, emissiveIntensity: 0.8 });
  const padMat2 = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.8 });

  const exitPad1 = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2, 0.3, 16), padMat1);
  exitPad1.position.set(-3.5, 0.15, 0);
  rootGroup.add(exitPad1);

  const exitPad2 = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2, 0.3, 16), padMat2);
  exitPad2.position.set(3.5, 0.15, 0);
  rootGroup.add(exitPad2);

  interactiveObjects.push({
    id: 'stage6_exit_p1',
    type: 'portal_pad',
    mesh: exitPad1,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-3.5, 1, 0), new THREE.Vector3(3, 2, 3)),
    targetRole: 'explorer',
    prompt: 'تثبیت نهایی هسته ابدیت (کاوشگر)',
  });

  interactiveObjects.push({
    id: 'stage6_exit_p2',
    type: 'portal_pad',
    mesh: exitPad2,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(3.5, 1, 0), new THREE.Vector3(3, 2, 3)),
    targetRole: 'guardian',
    prompt: 'تثبیت نهایی هسته ابدیت (نگهبان)',
  });

  return {
    rootGroup,
    colliders,
    interactiveObjects,
    spawnPoint: [0, 1.2, -14],
    checkpoints,
    update: (dt: number, state: PuzzleState) => {
      // Rotate central core
      coreMesh.rotation.y += dt * 0.8;
      coreMesh.rotation.x += dt * 0.4;
      coreMesh.position.y = 5 + Math.sin(performance.now() * 0.002) * 0.5;
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
