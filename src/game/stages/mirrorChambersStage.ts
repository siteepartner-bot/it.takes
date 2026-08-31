import * as THREE from 'three';
import type { PuzzleState, PlayerRole } from '../../types.ts';
import type { StageBuildResult, InteractiveObject } from './gardenStage.ts';
import { StatefulDoor } from './campaignStages.ts';

/**
 * 4 Sacred Elements & Symbols for Stage 3: Mirror Chambers (اتاق‌های آینه‌ای)
 * 0: ☀️ Sun (خورشید - Sol)
 * 1: 🌙 Moon (ماه - Luna)
 * 2: ⭐ Star (ستاره - Stella)
 * 3: 🌊 Wave (موج - Aqua)
 */
export interface SacredSymbolDef {
  id: number;
  name: string;
  persianName: string;
  icon: string;
  color: number;
  hex: string;
  emissiveColor: number;
}

export const SACRED_SYMBOLS: SacredSymbolDef[] = [
  { id: 0, name: 'Sun', persianName: 'خورشید', icon: '☀️', color: 0xf59e0b, hex: '#f59e0b', emissiveColor: 0xd97706 },
  { id: 1, name: 'Moon', persianName: 'ماه', icon: '🌙', color: 0x38bdf8, hex: '#38bdf8', emissiveColor: 0x0284c7 },
  { id: 2, name: 'Star', persianName: 'ستاره', icon: '⭐', color: 0xe879f9, hex: '#e879f9', emissiveColor: 0xc026d3 },
  { id: 3, name: 'Wave', persianName: 'موج', icon: '🌊', color: 0x2dd4bf, hex: '#2dd4bf', emissiveColor: 0x0d9488 },
];

/**
 * Deterministic Sequence Generator for Stage 3 based on Shared Seed
 */
export function getStage3Sequences(seed = 77): { sequenceTargetA: number[]; sequenceTargetB: number[] } {
  // All 24 distinct permutations of [0, 1, 2, 3]
  const allPerms: number[][] = [
    [0, 1, 2, 3], [0, 1, 3, 2], [0, 2, 1, 3], [0, 2, 3, 1], [0, 3, 1, 2], [0, 3, 2, 1],
    [1, 0, 2, 3], [1, 0, 3, 2], [1, 2, 0, 3], [1, 2, 3, 0], [1, 3, 0, 2], [1, 3, 2, 0],
    [2, 0, 1, 3], [2, 0, 3, 1], [2, 1, 0, 3], [2, 1, 3, 0], [2, 3, 0, 1], [2, 3, 1, 0],
    [3, 0, 1, 2], [3, 0, 2, 1], [3, 1, 0, 2], [3, 1, 2, 0], [3, 2, 0, 1], [3, 2, 1, 0]
  ];

  const cleanSeed = Math.abs(typeof seed === 'number' && !isNaN(seed) ? seed : 77);
  const indexA = cleanSeed % allPerms.length;
  let indexB = (cleanSeed * 7 + 13) % allPerms.length;
  if (indexB === indexA) {
    indexB = (indexB + 1) % allPerms.length;
  }

  return {
    sequenceTargetA: allPerms[indexA], // Room A target (Visible on Room B Mirror!)
    sequenceTargetB: allPerms[indexB], // Room B target (Visible on Room A Mirror!)
  };
}

/**
 * Helper to build 3D geometry symbol emblem
 */
function createSymbolMesh(symbolId: number, color: number): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.6,
  });

  if (symbolId === 0) {
    // Sun: Center disc + 4 cross diamond rays (lightweight & crisp)
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 12), mat);
    core.rotation.x = Math.PI / 2;
    group.add(core);

    const rayCross1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.1), mat);
    group.add(rayCross1);
    const rayCross2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.2, 0.1), mat);
    group.add(rayCross2);
    const rayDiag1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.1), mat);
    rayDiag1.rotation.z = Math.PI / 4;
    group.add(rayDiag1);
    const rayDiag2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.1), mat);
    rayDiag2.rotation.z = -Math.PI / 4;
    group.add(rayDiag2);
  } else if (symbolId === 1) {
    // Moon: Crescent torus / cylinder arc
    const moon = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.12, 8, 16, Math.PI * 1.3), mat);
    moon.rotation.z = Math.PI * 0.35;
    group.add(moon);
  } else if (symbolId === 2) {
    // Star: 4-pointed diamond star
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), mat);
    star.scale.set(1.4, 1.4, 0.45);
    group.add(star);
  } else {
    // Wave: Triple sine wave crests
    for (let w = -1; w <= 1; w++) {
      const waveMesh = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.08, 6, 12, Math.PI), mat);
      waveMesh.position.set(w * 0.28, (w % 2 === 0 ? 0.08 : -0.08), 0);
      waveMesh.rotation.z = Math.PI;
      group.add(waveMesh);
    }
  }

  return group;
}

/**
 * Stage 3: Mirror Chambers (اتاق‌های آینه‌ای)
 * Co-op puzzle based on pure communication and asymmetric information.
 */
export function buildMirrorChambersStage(): StageBuildResult {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'stage_3_mirror_chambers';

  const colliders: THREE.Box3[] = [];
  const interactiveObjects: InteractiveObject[] = [];

  // --- Materials ---
  const templeWoodFloorMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.65,
    metalness: 0.1,
  });

  const carvedStoneWallMat = new THREE.MeshStandardMaterial({
    color: 0x292524,
    roughness: 0.85,
    metalness: 0.15,
  });

  const acousticLatticeMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.5,
    metalness: 0.25,
  });

  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.3,
    metalness: 0.85,
  });

  const mirrorGlassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: 0x1e293b,
    emissiveIntensity: 0.4,
    roughness: 0.1,
    metalness: 0.9,
  });

  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x3b1d11,
    roughness: 0.5,
    metalness: 0.3,
  });

  const helperAddBox = (
    size: [number, number, number],
    pos: [number, number, number],
    mat: THREE.Material,
    addCollider = true,
    receiveShadow = true
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
    mesh.position.set(...pos);
    mesh.castShadow = true;
    mesh.receiveShadow = receiveShadow;
    rootGroup.add(mesh);

    if (addCollider) {
      const box = new THREE.Box3().setFromCenterAndSize(
        mesh.position,
        new THREE.Vector3(...size)
      );
      colliders.push(box);
    }
    return mesh;
  };

  // =========================================================================
  // 1. FLOOR PLAN (Full Coverage)
  // =========================================================================
  // Central Entrance Hall (z: -3 to 16, x: -17 to 17)
  helperAddBox([34, 1, 19], [0, -0.5, 6.5], templeWoodFloorMat);

  // Room A (Left Chamber: x: -17 to -1, z: 16 to 48)
  helperAddBox([16, 1, 32], [-9, -0.5, 32], templeWoodFloorMat);

  // Room B (Right Chamber: x: 1 to 17, z: 16 to 48)
  helperAddBox([16, 1, 32], [9, -0.5, 32], templeWoodFloorMat);

  // Grand Exit Sanctuary (z: 48 to 66, x: -17 to 17)
  helperAddBox([34, 1, 18], [0, -0.5, 57], templeWoodFloorMat);

  // =========================================================================
  // 2. BOUNDARY & ARCHITECTURAL WALLS (Height: 8m, Thickness: 1.2m)
  // =========================================================================
  // Entrance Back Wall (z: -3, x: -17 to 17)
  helperAddBox([34, 8, 1.2], [0, 4, -2.4], carvedStoneWallMat);

  // Entrance Side Walls (x: -17 and +17, z: -3 to 16)
  helperAddBox([1.2, 8, 19], [-16.4, 4, 6.5], carvedStoneWallMat);
  helperAddBox([1.2, 8, 19], [16.4, 4, 6.5], carvedStoneWallMat);

  // --- Front Partition Wall (z: 16, separating Entrance Hall from Rooms) ---
  // Center solid wall between Door A and Door B (x: -6.0 to +6.0)
  helperAddBox([12, 8, 1.2], [0, 4, 16], carvedStoneWallMat);
  // Outer left wall (x: -17.0 to -11.0)
  helperAddBox([6, 8, 1.2], [-14, 4, 16], carvedStoneWallMat);
  // Outer right wall (x: 11.0 to 17.0)
  helperAddBox([6, 8, 1.2], [14, 4, 16], carvedStoneWallMat);
  // Upper lintels above Door A & Door B (y: 5.0 to 8.0) - no physics collider needed up high
  helperAddBox([5.2, 3.2, 1.4], [-8.5, 6.4, 16], carvedStoneWallMat, false);
  helperAddBox([5.2, 3.2, 1.4], [8.5, 6.4, 16], carvedStoneWallMat, false);

  // Ornate Gold & Stone Gateframes for Entrance Doors
  const frameMat = goldTrimMat;
  // Frame A (Left)
  helperAddBox([0.6, 5.2, 1.5], [-11.1, 2.6, 16], frameMat, false);
  helperAddBox([0.6, 5.2, 1.5], [-5.9, 2.6, 16], frameMat, false);
  helperAddBox([5.8, 0.6, 1.5], [-8.5, 5.1, 16], frameMat, false);
  // Frame B (Right)
  helperAddBox([0.6, 5.2, 1.5], [5.9, 2.6, 16], frameMat, false);
  helperAddBox([0.6, 5.2, 1.5], [11.1, 2.6, 16], frameMat, false);
  helperAddBox([5.8, 0.6, 1.5], [8.5, 5.1, 16], frameMat, false);

  // --- Room Outer Side Walls (z: 16 to 48) ---
  // Left outer wall (x: -17)
  helperAddBox([1.2, 8, 32], [-16.4, 4, 32], carvedStoneWallMat);
  // Right outer wall (x: +17)
  helperAddBox([1.2, 8, 32], [16.4, 4, 32], carvedStoneWallMat);

  // 100% Solid Central Dividing Stone Wall (x: 0, z: 16 to 48)
  // Completely opaque with no see-through gaps, separating Room A and Room B
  helperAddBox([2.4, 8, 32], [0, 4, 32], carvedStoneWallMat);

  // Decorative stone pilasters along the dividing wall
  for (let z = 20; z <= 44; z += 8) {
    const pilasterA = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7.8, 1.2), goldTrimMat);
    pilasterA.position.set(-1.25, 3.9, z);
    rootGroup.add(pilasterA);

    const pilasterB = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7.8, 1.2), goldTrimMat);
    pilasterB.position.set(1.25, 3.9, z);
    rootGroup.add(pilasterB);
  }

  // --- Back Partition Wall (z: 48, separating Rooms from Exit Sanctuary) ---
  // Center solid wall between Exit Door A and Exit Door B (x: -6.0 to +6.0)
  helperAddBox([12, 8, 1.2], [0, 4, 48], carvedStoneWallMat);
  // Outer left wall (x: -17.0 to -11.0)
  helperAddBox([6, 8, 1.2], [-14, 4, 48], carvedStoneWallMat);
  // Outer right wall (x: 11.0 to 17.0)
  helperAddBox([6, 8, 1.2], [14, 4, 48], carvedStoneWallMat);
  // Upper lintels above Exit Door A & Exit Door B (y: 5.0 to 8.0)
  helperAddBox([5.2, 3.2, 1.4], [-8.5, 6.4, 48], carvedStoneWallMat, false);
  helperAddBox([5.2, 3.2, 1.4], [8.5, 6.4, 48], carvedStoneWallMat, false);

  // Ornate Gateframes for Exit Doors
  // Exit Frame A (Left)
  helperAddBox([0.6, 5.2, 1.5], [-11.1, 2.6, 48], frameMat, false);
  helperAddBox([0.6, 5.2, 1.5], [-5.9, 2.6, 48], frameMat, false);
  helperAddBox([5.8, 0.6, 1.5], [-8.5, 5.1, 48], frameMat, false);
  // Exit Frame B (Right)
  helperAddBox([0.6, 5.2, 1.5], [5.9, 2.6, 48], frameMat, false);
  helperAddBox([0.6, 5.2, 1.5], [11.1, 2.6, 48], frameMat, false);
  helperAddBox([5.8, 0.6, 1.5], [8.5, 5.1, 48], frameMat, false);

  // --- Grand Exit Sanctuary Walls (z: 48 to 66) ---
  helperAddBox([1.2, 8, 18], [-16.4, 4, 57], carvedStoneWallMat);
  helperAddBox([1.2, 8, 18], [16.4, 4, 57], carvedStoneWallMat);
  helperAddBox([34, 8, 1.2], [0, 4, 65.4], carvedStoneWallMat); // Grand Sanctuary Far Wall

  // =========================================================================
  // 2.1 FULL SOLID CEILINGS / ROOFS (100% Enclosure, lightweight, no colliders)
  // =========================================================================
  const carvedStoneCeilingMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.9,
    metalness: 0.1,
  });

  // Ceilings don't need physics colliders or heavy shadows
  helperAddBox([34, 1.2, 20], [0, 8.2, 6.5], carvedStoneCeilingMat, false, false);
  helperAddBox([16.5, 1.2, 33], [-8.8, 8.2, 32], carvedStoneCeilingMat, false, false);
  helperAddBox([16.5, 1.2, 33], [8.8, 8.2, 32], carvedStoneCeilingMat, false, false);
  helperAddBox([34, 1.2, 19], [0, 8.2, 57], carvedStoneCeilingMat, false, false);

  // Ceiling decorative transverse beams
  for (let z = 20; z <= 44; z += 6) {
    const beamA = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.6, 0.8), goldTrimMat);
    beamA.position.set(-8.8, 7.6, z);
    rootGroup.add(beamA);

    const beamB = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.6, 0.8), goldTrimMat);
    beamB.position.set(8.8, 7.6, z);
    rootGroup.add(beamB);
  }

  // =========================================================================
  // 3. DOORS SYSTEM & ENTRY RUNES (Solid Vault Gates)
  // =========================================================================
  // Entrance Floor Runes / Proximity Markers
  const entryRuneMatA = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.45,
    roughness: 0.3,
  });
  const entryRuneMeshA = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.12, 16), entryRuneMatA);
  entryRuneMeshA.position.set(-8.5, 0.06, 13.5);
  rootGroup.add(entryRuneMeshA);

  const entryRuneMatB = new THREE.MeshStandardMaterial({
    color: 0xc026d3,
    emissive: 0xe879f9,
    emissiveIntensity: 0.45,
    roughness: 0.3,
  });
  const entryRuneMeshB = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.12, 16), entryRuneMatB);
  entryRuneMeshB.position.set(8.5, 0.06, 13.5);
  rootGroup.add(entryRuneMeshB);

  // Helper to create a massive ornate Persian Temple Vault Door
  const createVaultDoorMesh = (accentColor: number): THREE.Group => {
    const group = new THREE.Group();

    // Main heavy slab (width: 5.0m, height: 5.0m, thickness: 0.7m)
    const slabMesh = new THREE.Mesh(new THREE.BoxGeometry(5.0, 5.0, 0.7), doorMat);
    slabMesh.castShadow = true;
    group.add(slabMesh);

    // Golden cross framing
    const horizBeam = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.4, 0.76), goldTrimMat);
    group.add(horizBeam);
    const vertBeam = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.8, 0.76), goldTrimMat);
    group.add(vertBeam);

    // Heavy iron perimeter banding
    const topBand = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.3, 0.74), carvedStoneWallMat);
    topBand.position.y = 2.35;
    group.add(topBand);
    const btmBand = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.3, 0.74), carvedStoneWallMat);
    btmBand.position.y = -2.35;
    group.add(btmBand);

    // Central Glowing Sacred Seal
    const sealMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    const sealMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.82, 16), sealMat);
    sealMesh.rotation.x = Math.PI / 2;
    group.add(sealMesh);

    return group;
  };

  // Entrance Door A (Left Entrance at x: -8.5, z: 16)
  const doorEnterAMesh = createVaultDoorMesh(0x38bdf8);
  doorEnterAMesh.position.set(-8.5, 2.5, 16);
  rootGroup.add(doorEnterAMesh);
  const doorEnterA = new StatefulDoor(doorEnterAMesh, 2.5, 7.6, 5.0);
  doorEnterA.setTarget(false); // Closed initially until approached by 1 player

  // Entrance Door B (Right Entrance at x: 8.5, z: 16)
  const doorEnterBMesh = createVaultDoorMesh(0xe879f9);
  doorEnterBMesh.position.set(8.5, 2.5, 16);
  rootGroup.add(doorEnterBMesh);
  const doorEnterB = new StatefulDoor(doorEnterBMesh, 2.5, 7.6, 5.0);
  doorEnterB.setTarget(false); // Closed initially until approached by 1 player

  // Exit Door A (Left Exit at x: -8.5, z: 48)
  const doorExitAMesh = createVaultDoorMesh(0x38bdf8);
  doorExitAMesh.position.set(-8.5, 2.5, 48);
  rootGroup.add(doorExitAMesh);
  const doorExitA = new StatefulDoor(doorExitAMesh, 2.5, 7.6, 5.0);
  doorExitA.setTarget(false); // Closed initially, opens ONLY when both rooms are solved

  // Exit Door B (Right Exit at x: 8.5, z: 48)
  const doorExitBMesh = createVaultDoorMesh(0xe879f9);
  doorExitBMesh.position.set(8.5, 2.5, 48);
  rootGroup.add(doorExitBMesh);
  const doorExitB = new StatefulDoor(doorExitBMesh, 2.5, 7.6, 5.0);
  doorExitB.setTarget(false); // Closed initially, opens ONLY when both rooms are solved

  // Door Collider boxes that update in loop
  const doorEnterACollider = new THREE.Box3();
  const doorEnterBCollider = new THREE.Box3();
  const doorExitACollider = new THREE.Box3();
  const doorExitBCollider = new THREE.Box3();
  colliders.push(doorEnterACollider, doorEnterBCollider, doorExitACollider, doorExitBCollider);

  // =========================================================================
  // 4. CLUE MIRRORS / TABLETS ON CENTRAL DIVIDE
  // =========================================================================
  // Clue Mirror in Room A (displays Sequence for Room B)
  // Placed on left side of center divide facing Room A: x: -1.2, z: 32, y: 3.5
  const mirrorGroupA = new THREE.Group();
  mirrorGroupA.position.set(-1.1, 3.5, 32);

  const mirrorBackA = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.5, 9.5), carvedStoneWallMat);
  mirrorBackA.castShadow = true;
  mirrorGroupA.add(mirrorBackA);

  const mirrorFrameA = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.2, 9.2), goldTrimMat);
  mirrorGroupA.add(mirrorFrameA);

  const mirrorSurfaceA = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.8, 8.8), mirrorGlassMat);
  mirrorGroupA.add(mirrorSurfaceA);

  // Clue Plates for Room B sequence
  const cluePlatesB: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const plateGroup = new THREE.Group();
    plateGroup.position.set(-0.25, 0, (i - 1.5) * 2.0);

    // Number pedestal box
    const numPlate = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.4), goldTrimMat);
    numPlate.position.set(0, -1.2, 0);
    plateGroup.add(numPlate);

    mirrorGroupA.add(plateGroup);
    cluePlatesB.push(plateGroup);
  }
  rootGroup.add(mirrorGroupA);

  // Clue Mirror in Room B (displays Sequence for Room A)
  // Placed on right side of center divide facing Room B: x: +1.1, z: 32, y: 3.5
  const mirrorGroupB = new THREE.Group();
  mirrorGroupB.position.set(1.1, 3.5, 32);

  const mirrorBackB = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.5, 9.5), carvedStoneWallMat);
  mirrorBackB.castShadow = true;
  mirrorGroupB.add(mirrorBackB);

  const mirrorFrameB = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.2, 9.2), goldTrimMat);
  mirrorGroupB.add(mirrorFrameB);

  const mirrorSurfaceB = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.8, 8.8), mirrorGlassMat);
  mirrorGroupB.add(mirrorSurfaceB);

  // Clue Plates for Room A sequence
  const cluePlatesA: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const plateGroup = new THREE.Group();
    plateGroup.position.set(0.25, 0, (i - 1.5) * 2.0);

    // Number pedestal box
    const numPlate = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.4), goldTrimMat);
    numPlate.position.set(0, -1.2, 0);
    plateGroup.add(numPlate);

    mirrorGroupB.add(plateGroup);
    cluePlatesA.push(plateGroup);
  }
  rootGroup.add(mirrorGroupB);

  // =========================================================================
  // 5. INTERACTIVE SYMBOL PEDESTALS IN ROOM A & ROOM B
  // =========================================================================
  // Room A Pedestal Positions (along Room A: x: -12 to -5, z: 23 to 41)
  const roomAPedestalCoords: [number, number][] = [
    [-11.5, 24], // Symbol 0: Sun (خورشید)
    [-6.5, 24],  // Symbol 1: Moon (ماه)
    [-11.5, 40], // Symbol 2: Star (ستاره)
    [-6.5, 40],  // Symbol 3: Wave (موج)
  ];

  // Room B Pedestal Positions (along Room B: x: 5 to 12, z: 23 to 41)
  const roomBPedestalCoords: [number, number][] = [
    [6.5, 24],   // Symbol 0: Sun (خورشید)
    [11.5, 24],  // Symbol 1: Moon (ماه)
    [6.5, 40],   // Symbol 2: Star (ستاره)
    [11.5, 40],  // Symbol 3: Wave (موج)
  ];

  const pedestalsA: { mesh: THREE.Group; symbolId: number; glowMesh: THREE.Mesh }[] = [];
  const pedestalsB: { mesh: THREE.Group; symbolId: number; glowMesh: THREE.Mesh }[] = [];

  // Build Room A Pedestals
  SACRED_SYMBOLS.forEach((sym) => {
    const [px, pz] = roomAPedestalCoords[sym.id];
    const group = new THREE.Group();
    group.position.set(px, 0, pz);

    // Stone base
    const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 1.2, 16), carvedStoneWallMat);
    baseMesh.position.y = 0.6;
    baseMesh.castShadow = true;
    group.add(baseMesh);

    // Brass rim
    const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.08, 12, 24), goldTrimMat);
    rimMesh.position.y = 1.2;
    rimMesh.rotation.x = Math.PI / 2;
    group.add(rimMesh);

    // Glowing active ring
    const glowRingMat = new THREE.MeshStandardMaterial({
      color: sym.color,
      emissive: sym.color,
      emissiveIntensity: 0.2,
      roughness: 0.1,
      metalness: 0.5,
    });
    const glowMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.15, 16), glowRingMat);
    glowMesh.position.y = 1.26;
    group.add(glowMesh);

    // 3D Symbol floating emblem
    const symbolMesh = createSymbolMesh(sym.id, sym.color);
    symbolMesh.position.set(0, 1.8, 0);
    group.add(symbolMesh);

    rootGroup.add(group);

    // Collider for pedestal pillar
    const box = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(px, 0.7, pz),
      new THREE.Vector3(2.0, 1.4, 2.0)
    );
    colliders.push(box);

    // Interactive Trigger
    interactiveObjects.push({
      id: `stage3_roomA_symbol_${sym.id}`,
      type: 'lever',
      mesh: group,
      bounds: new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(px, 1.2, pz),
        new THREE.Vector3(3.2, 3.0, 3.2)
      ),
      prompt: `فعال‌سازی نماد ${sym.icon} ${sym.persianName} [اتاق A]`,
    });

    pedestalsA.push({ mesh: group, symbolId: sym.id, glowMesh });
  });

  // Build Room B Pedestals
  SACRED_SYMBOLS.forEach((sym) => {
    const [px, pz] = roomBPedestalCoords[sym.id];
    const group = new THREE.Group();
    group.position.set(px, 0, pz);

    // Stone base
    const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 1.2, 16), carvedStoneWallMat);
    baseMesh.position.y = 0.6;
    baseMesh.castShadow = true;
    group.add(baseMesh);

    // Brass rim
    const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.08, 12, 24), goldTrimMat);
    rimMesh.position.y = 1.2;
    rimMesh.rotation.x = Math.PI / 2;
    group.add(rimMesh);

    // Glowing active ring
    const glowRingMat = new THREE.MeshStandardMaterial({
      color: sym.color,
      emissive: sym.color,
      emissiveIntensity: 0.2,
      roughness: 0.1,
      metalness: 0.5,
    });
    const glowMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.15, 16), glowRingMat);
    glowMesh.position.y = 1.26;
    group.add(glowMesh);

    // 3D Symbol floating emblem
    const symbolMesh = createSymbolMesh(sym.id, sym.color);
    symbolMesh.position.set(0, 1.8, 0);
    group.add(symbolMesh);

    rootGroup.add(group);

    // Collider for pedestal pillar
    const box = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(px, 0.7, pz),
      new THREE.Vector3(2.0, 1.4, 2.0)
    );
    colliders.push(box);

    // Interactive Trigger
    interactiveObjects.push({
      id: `stage3_roomB_symbol_${sym.id}`,
      type: 'lever',
      mesh: group,
      bounds: new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(px, 1.2, pz),
        new THREE.Vector3(3.2, 3.0, 3.2)
      ),
      prompt: `فعال‌سازی نماد ${sym.icon} ${sym.persianName} [اتاق B]`,
    });

    pedestalsB.push({ mesh: group, symbolId: sym.id, glowMesh });
  });

  // =========================================================================
  // 6. PROGRESS CRYSTAL INDICATORS OVER EXIT DOORS
  // =========================================================================
  const indicatorsA: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const indMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24, 0),
      new THREE.MeshStandardMaterial({
        color: 0x475569,
        emissive: 0x0f172a,
        emissiveIntensity: 0.1,
        roughness: 0.2,
      })
    );
    indMesh.position.set(-10.0 + i * 1.0, 4.8, 47.4);
    rootGroup.add(indMesh);
    indicatorsA.push(indMesh);
  }

  const indicatorsB: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const indMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24, 0),
      new THREE.MeshStandardMaterial({
        color: 0x475569,
        emissive: 0x0f172a,
        emissiveIntensity: 0.1,
        roughness: 0.2,
      })
    );
    indMesh.position.set(7.0 + i * 1.0, 4.8, 47.4);
    rootGroup.add(indMesh);
    indicatorsB.push(indMesh);
  }

  // =========================================================================
  // 7. LORE TABLET & ATMOSPHERE LANTERNS
  // =========================================================================
  const tabletGroup = new THREE.Group();
  tabletGroup.position.set(-4, 0, 6);
  const tabBase = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 1.0, 8), carvedStoneWallMat);
  tabBase.position.y = 0.5;
  tabletGroup.add(tabBase);
  const tabSlab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 0.2), goldTrimMat);
  tabSlab.position.set(0, 1.2, 0);
  tabSlab.rotation.x = -Math.PI / 6;
  tabletGroup.add(tabSlab);
  rootGroup.add(tabletGroup);

  colliders.push(new THREE.Box3().setFromCenterAndSize(tabletGroup.position, new THREE.Vector3(1.5, 2, 1.5)));

  interactiveObjects.push({
    id: 'story_tablet_stage3',
    type: 'lever',
    mesh: tabletGroup,
    bounds: new THREE.Box3().setFromCenterAndSize(tabletGroup.position, new THREE.Vector3(3.2, 3.2, 3.2)),
    prompt: '📜 خواندن کتیبه اتاق‌های آینه‌ای',
  });

  // Hanging Temple Lanterns
  const lanternLight1 = new THREE.PointLight(0xf59e0b, 1.2, 16);
  lanternLight1.position.set(0, 5.5, 7);
  rootGroup.add(lanternLight1);

  const lanternLight2 = new THREE.PointLight(0x38bdf8, 1.2, 16);
  lanternLight2.position.set(-9, 5.5, 32);
  rootGroup.add(lanternLight2);

  const lanternLight3 = new THREE.PointLight(0xe879f9, 1.2, 16);
  lanternLight3.position.set(9, 5.5, 32);
  rootGroup.add(lanternLight3);

  const lanternLight4 = new THREE.PointLight(0x2dd4bf, 1.5, 20);
  lanternLight4.position.set(0, 5.5, 57);
  rootGroup.add(lanternLight4);

  // =========================================================================
  // 8. GRAND CENTRAL EXIT PORTAL
  // =========================================================================
  // Exit Portal Arch
  const portalArch = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.45, 16, 32, Math.PI), goldTrimMat);
  portalArch.position.set(0, 3.2, 64);
  rootGroup.add(portalArch);

  // Dual Exit Pressure Pads in Grand Sanctuary
  const exitPadMat = new THREE.MeshStandardMaterial({
    color: 0x065f46,
    emissive: 0x10b981,
    emissiveIntensity: 0.45,
    roughness: 0.3,
  });

  const exitPadP1 = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.25, 24), exitPadMat);
  exitPadP1.position.set(-3.2, 0.12, 60);
  rootGroup.add(exitPadP1);

  interactiveObjects.push({
    id: 'stage3_exit_p1',
    type: 'portal_pad',
    mesh: exitPadP1,
    bounds: new THREE.Box3().setFromCenterAndSize(exitPadP1.position, new THREE.Vector3(3.4, 1.5, 3.4)),
    prompt: '⚡ سکوی خروج نیوشا (کاوشگر)',
  });

  const exitPadP2 = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.25, 24), exitPadMat);
  exitPadP2.position.set(3.2, 0.12, 60);
  rootGroup.add(exitPadP2);

  interactiveObjects.push({
    id: 'stage3_exit_p2',
    type: 'portal_pad',
    mesh: exitPadP2,
    bounds: new THREE.Box3().setFromCenterAndSize(exitPadP2.position, new THREE.Vector3(3.4, 1.5, 3.4)),
    prompt: '⚡ سکوی خروج حسن (نگهبان)',
  });

  // =========================================================================
  // 9. CHECKPOINTS & SPAWN
  // =========================================================================
  const checkpoints = [
    {
      id: 0,
      pos: [0, 1.2, 2] as [number, number, number],
      active: true,
      mesh: new THREE.Group(),
    },
    {
      id: 1,
      pos: [0, 1.2, 12] as [number, number, number],
      active: false,
      mesh: new THREE.Group(),
    },
    {
      id: 2,
      pos: [0, 1.2, 22] as [number, number, number], // Room interior checkpoint
      active: false,
      mesh: new THREE.Group(),
    },
    {
      id: 3,
      pos: [0, 1.2, 54] as [number, number, number], // Sanctuary Exit checkpoint
      active: false,
      mesh: new THREE.Group(),
    },
  ];

  // Visual checkpoint pillars
  checkpoints.forEach((cp, idx) => {
    if (idx > 0) {
      const cpMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.45, 1.8, 8),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.5 })
      );
      cpMesh.position.set(cp.pos[0], 0.9, cp.pos[2]);
      rootGroup.add(cpMesh);
    }
  });

  // Track cached seed to avoid rebuilding clue plates every frame
  let cachedSeed: number | null = null;
  let animTime = 0;

  // =========================================================================
  // 10. REAL-TIME UPDATE LOOP
  // =========================================================================
  const update = (dt: number, state: PuzzleState) => {
    animTime += dt;

    // 1. Synchronize seed & build 3D clue mirror symbols once seed is known
    const currentSeed = (state.customData && typeof state.customData.stage3Seed === 'number')
      ? state.customData.stage3Seed
      : 77;

    if (cachedSeed !== currentSeed) {
      cachedSeed = currentSeed;
      const { sequenceTargetA, sequenceTargetB } = getStage3Sequences(currentSeed);

      // Populate Clue Mirror A (showing Room B sequence)
      cluePlatesB.forEach((plateGroup, i) => {
        // Clear previous symbol mesh (keep index 0 which is numPlate)
        while (plateGroup.children.length > 1) {
          plateGroup.remove(plateGroup.children[plateGroup.children.length - 1]);
        }
        const symId = sequenceTargetB[i];
        const symDef = SACRED_SYMBOLS[symId];
        if (symDef) {
          const symMesh = createSymbolMesh(symId, symDef.color);
          symMesh.position.set(-0.15, 0.2, 0);
          symMesh.scale.set(0.75, 0.75, 0.75);
          symMesh.rotation.y = -Math.PI / 2; // Facing Room A
          plateGroup.add(symMesh);
        }
      });

      // Populate Clue Mirror B (showing Room A sequence)
      cluePlatesA.forEach((plateGroup, i) => {
        while (plateGroup.children.length > 1) {
          plateGroup.remove(plateGroup.children[plateGroup.children.length - 1]);
        }
        const symId = sequenceTargetA[i];
        const symDef = SACRED_SYMBOLS[symId];
        if (symDef) {
          const symMesh = createSymbolMesh(symId, symDef.color);
          symMesh.position.set(0.15, 0.2, 0);
          symMesh.scale.set(0.75, 0.75, 0.75);
          symMesh.rotation.y = Math.PI / 2; // Facing Room B
          plateGroup.add(symMesh);
        }
      });
    }

    // 2. Door state handling
    const isLocked = !!(state.customData && state.customData.stage3Locked);
    const lockedA = !!(state.customData && state.customData.stage3LockedA) || isLocked;
    const lockedB = !!(state.customData && state.customData.stage3LockedB) || isLocked;
    const doorAOpen = !!(state.customData && state.customData.stage3DoorAOpen) && !lockedA;
    const doorBOpen = !!(state.customData && state.customData.stage3DoorBOpen) && !lockedB;

    const solvedA = !!(state.customData && state.customData.stage3SolvedA);
    const solvedB = !!(state.customData && state.customData.stage3SolvedB);
    const exitUnlocked = !!(state.customData && state.customData.stage3ExitUnlocked) || (solvedA && solvedB);

    // Entrance doors open ONLY when an authorized single player approaches and room is empty;
    // As soon as that player is inside, it closes and locks completely!
    doorEnterA.setTarget(doorAOpen && !lockedA);
    doorEnterB.setTarget(doorBOpen && !lockedB);

    // Exit doors open ONLY when BOTH Room A and Room B puzzles have been solved!
    doorExitA.setTarget(exitUnlocked);
    doorExitB.setTarget(exitUnlocked);

    doorEnterA.update(dt);
    doorEnterB.update(dt);
    doorExitA.update(dt);
    doorExitB.update(dt);

    // Entry Runes Visual Pulsing
    if (!lockedA) {
      entryRuneMatA.emissiveIntensity = 0.4 + Math.sin(animTime * 4) * 0.3;
    } else {
      entryRuneMatA.emissiveIntensity = 0.05;
    }
    if (!lockedB) {
      entryRuneMatB.emissiveIntensity = 0.4 + Math.sin(animTime * 4) * 0.3;
    } else {
      entryRuneMatB.emissiveIntensity = 0.05;
    }

    // Update dynamic colliders for doors (closed = solid wall, open = passable)
    if (doorEnterA.state !== 'Open') {
      doorEnterACollider.setFromCenterAndSize(doorEnterAMesh.position, new THREE.Vector3(5.4, 5.4, 1.2));
    } else {
      doorEnterACollider.makeEmpty();
    }

    if (doorEnterB.state !== 'Open') {
      doorEnterBCollider.setFromCenterAndSize(doorEnterBMesh.position, new THREE.Vector3(5.4, 5.4, 1.2));
    } else {
      doorEnterBCollider.makeEmpty();
    }

    if (doorExitA.state !== 'Open') {
      doorExitACollider.setFromCenterAndSize(doorExitAMesh.position, new THREE.Vector3(5.4, 5.4, 1.2));
    } else {
      doorExitACollider.makeEmpty();
    }

    if (doorExitB.state !== 'Open') {
      doorExitBCollider.setFromCenterAndSize(doorExitBMesh.position, new THREE.Vector3(5.4, 5.4, 1.2));
    } else {
      doorExitBCollider.makeEmpty();
    }

    // 3. Pedestal dynamic animations and glow states
    const seqA = (state.customData && Array.isArray(state.customData.stage3SeqA)) ? state.customData.stage3SeqA : [];
    const seqB = (state.customData && Array.isArray(state.customData.stage3SeqB)) ? state.customData.stage3SeqB : [];

    pedestalsA.forEach((p) => {
      const isSelected = seqA.includes(p.symbolId) || solvedA;
      const mat = p.glowMesh.material as THREE.MeshStandardMaterial;
      if (solvedA) {
        mat.emissiveIntensity = 0.9 + Math.sin(animTime * 4) * 0.2;
      } else if (isSelected) {
        mat.emissiveIntensity = 0.75;
      } else {
        mat.emissiveIntensity = 0.15;
      }

      // Gentle floating animation on symbol emblem
      if (p.mesh.children[3]) {
        p.mesh.children[3].rotation.y = animTime * 0.8 + p.symbolId;
        p.mesh.children[3].position.y = 1.8 + Math.sin(animTime * 2 + p.symbolId) * 0.08;
      }
    });

    pedestalsB.forEach((p) => {
      const isSelected = seqB.includes(p.symbolId) || solvedB;
      const mat = p.glowMesh.material as THREE.MeshStandardMaterial;
      if (solvedB) {
        mat.emissiveIntensity = 0.9 + Math.sin(animTime * 4) * 0.2;
      } else if (isSelected) {
        mat.emissiveIntensity = 0.75;
      } else {
        mat.emissiveIntensity = 0.15;
      }

      if (p.mesh.children[3]) {
        p.mesh.children[3].rotation.y = animTime * 0.8 + p.symbolId;
        p.mesh.children[3].position.y = 1.8 + Math.sin(animTime * 2 + p.symbolId) * 0.08;
      }
    });

    // 4. Update Exit Door Progress Crystals
    indicatorsA.forEach((ind, idx) => {
      const isActive = idx < seqA.length || solvedA;
      const indMat = ind.material as THREE.MeshStandardMaterial;
      if (isActive) {
        indMat.color.setHex(0x38bdf8);
        indMat.emissive.setHex(0x0284c7);
        indMat.emissiveIntensity = 0.9;
        ind.rotation.y = animTime * 3;
      } else {
        indMat.color.setHex(0x475569);
        indMat.emissive.setHex(0x0f172a);
        indMat.emissiveIntensity = 0.1;
      }
    });

    indicatorsB.forEach((ind, idx) => {
      const isActive = idx < seqB.length || solvedB;
      const indMat = ind.material as THREE.MeshStandardMaterial;
      if (isActive) {
        indMat.color.setHex(0xe879f9);
        indMat.emissive.setHex(0xc026d3);
        indMat.emissiveIntensity = 0.9;
        ind.rotation.y = animTime * 3;
      } else {
        indMat.color.setHex(0x475569);
        indMat.emissive.setHex(0x0f172a);
        indMat.emissiveIntensity = 0.1;
      }
    });

    // 5. Exit Pad Pulsing
    if (exitUnlocked) {
      exitPadMat.emissiveIntensity = 0.6 + Math.sin(animTime * 3) * 0.25;
      portalArch.rotation.z = Math.sin(animTime * 0.5) * 0.02;
    }
  };

  const dispose = () => {
    rootGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  };

  return {
    rootGroup,
    colliders,
    interactiveObjects,
    update,
    dispose,
    spawnPoint: [0, 1.2, 2],
    checkpoints,
  };
}
