import * as THREE from 'three';
import type { PuzzleState } from '../../types.ts';
import type { StageBuildResult, InteractiveObject } from './gardenStage.ts';

/**
 * Stage 6: معبد دو مسیر (Temple of Dual Paths)
 * 
 * A pure co-op puzzle stage featuring:
 * 1. Path Split & Assignment (Path A & Path B)
 * 2. Cross-Information Symbol Puzzles (Path A solution on Path B wall, and vice versa)
 * 3. Reciprocal Lever Doors (Lever A opens Door B, Lever B opens Door A)
 * 4. Rejoined Final Hall & Permanent Unlock Exit Door
 */
export function buildDualPathsTempleStage(): StageBuildResult {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'stage_dual_paths_temple';

  const colliders: THREE.Box3[] = [];
  const interactiveObjects: InteractiveObject[] = [];

  // --- Materials ---
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.7,
    metalness: 0.2,
  });

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.8,
    metalness: 0.3,
  });

  const darkRockMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.9,
    metalness: 0.1,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xca8a04,
    emissiveIntensity: 0.5,
    metalness: 0.8,
    roughness: 0.3,
  });

  const cyanRuneMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.6,
    roughness: 0.3,
  });

  const redRuneMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xb91c1c,
    emissiveIntensity: 0.6,
    roughness: 0.3,
  });

  const greenRuneMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x15803d,
    emissiveIntensity: 0.6,
    roughness: 0.3,
  });

  // --- Helper Function ---
  function addBox(
    size: [number, number, number],
    pos: [number, number, number],
    mat: THREE.Material,
    addCollider = true
  ): THREE.Mesh {
    const geo = new THREE.BoxGeometry(...size);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rootGroup.add(mesh);

    if (addCollider) {
      const box = new THREE.Box3().setFromObject(mesh);
      colliders.push(box);
    }
    return mesh;
  }

  // =========================================================================
  // SECTION 1: ENTRANCE HALL & PATH SPLIT (z: 0 to 24)
  // =========================================================================
  // Central Entrance Floor (z: 0 to 22)
  addBox([30, 1, 22], [0, -0.5, 11], woodMat);

  // Outer Sanctuary Walls
  addBox([1.5, 12, 110], [-15.0, 5.5, 55], stoneMat);
  addBox([1.5, 12, 110], [15.0, 5.5, 55], stoneMat);
  addBox([30, 12, 1.5], [0, 5.5, 0], stoneMat); // Back entrance wall

  // Central Dividing Pillar Wall between Path A & B (z: 22 to 80)
  addBox([3.0, 12, 58], [0, 5.5, 51], stoneMat);

  // Lore Tablet at Entrance
  const tabletMesh = addBox([1.2, 2.0, 0.3], [-4, 1.0, 2.0], cyanRuneMat, false);
  interactiveObjects.push({
    id: 'story_tablet_stage6',
    type: 'lever',
    mesh: tabletMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-4, 1.0, 2.0), new THREE.Vector3(2.5, 2.0, 2.5)),
    prompt: 'خواندن کتیبه راز معبد دو مسیر (کلید E)',
  });

  // Path A Entrance Archway & Gate (x = -7.5, z = 22)
  const assignGateAMesh = addBox([14, 8, 1.2], [-7.5, 3.5, 22.0], stoneMat, true);
  const assignGateAColliderIndex = colliders.length - 1;

  // Path B Entrance Archway & Gate (x = +7.5, z = 22)
  const assignGateBMesh = addBox([14, 8, 1.2], [7.5, 3.5, 22.0], stoneMat, true);
  const assignGateBColliderIndex = colliders.length - 1;

  // Trigger Plates for Path Assignment
  const triggerAMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.2, 16), cyanRuneMat);
  triggerAMesh.position.set(-7.5, 0.1, 20.0);
  rootGroup.add(triggerAMesh);
  interactiveObjects.push({
    id: 'plate_stage6_trigger_a',
    type: 'pressure_plate',
    mesh: triggerAMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(triggerAMesh.position, new THREE.Vector3(2.5, 1.5, 2.5)),
    prompt: 'ورود به مسیر الف (Path A)',
  });

  const triggerBMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.2, 16), greenRuneMat);
  triggerBMesh.position.set(7.5, 0.1, 20.0);
  rootGroup.add(triggerBMesh);
  interactiveObjects.push({
    id: 'plate_stage6_trigger_b',
    type: 'pressure_plate',
    mesh: triggerBMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(triggerBMesh.position, new THREE.Vector3(2.5, 1.5, 2.5)),
    prompt: 'ورود به مسیر ب (Path B)',
  });

  // Checkpoint 2 Tablet at z: 25
  const cp2Mesh = addBox([1.0, 1.8, 0.3], [0, 1.0, 25], cyanRuneMat, false);

  // =========================================================================
  // SECTION 2 & 3: PATH A (x: -13.5 to -1.5, z: 22 to 80)
  // =========================================================================
  // Path A Floor
  addBox([14, 1, 58], [-7.5, -0.5, 51], woodMat);

  // CLUE BANNER ON PATH A WALL (Displaying Path B's Solution: 🍃 برگ -> ⭐ ستاره/🔥 شعله -> 💧 قطره)
  // Target B: ["leaf", "flame", "drop"]
  const clueB1Mesh = addBox([0.2, 1.8, 1.8], [-13.2, 3.5, 30.0], greenRuneMat, false); // Leaf icon
  const clueB2Mesh = addBox([0.2, 1.8, 1.8], [-13.2, 3.5, 33.0], redRuneMat, false);   // Flame icon
  const clueB3Mesh = addBox([0.2, 1.8, 1.8], [-13.2, 3.5, 36.0], cyanRuneMat, false);  // Drop icon

  // PATH A SYMBOL BUTTONS (Sun ☀️, Moon 🌙, Star ⭐)
  // Button 1: Sun
  const btnASunMesh = addBox([1.2, 0.4, 1.2], [-7.5, 0.2, 42.0], goldMat, false);
  interactiveObjects.push({
    id: 'btn_stage6_a_sun',
    type: 'lever',
    mesh: btnASunMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(btnASunMesh.position, new THREE.Vector3(2.0, 1.5, 2.0)),
    prompt: 'فشار دادن نماد خورشید (☀️)',
  });

  // Button 2: Moon
  const btnAMoonMesh = addBox([1.2, 0.4, 1.2], [-7.5, 0.2, 48.0], cyanRuneMat, false);
  interactiveObjects.push({
    id: 'btn_stage6_a_moon',
    type: 'lever',
    mesh: btnAMoonMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(btnAMoonMesh.position, new THREE.Vector3(2.0, 1.5, 2.0)),
    prompt: 'فشار دادن نماد ماه (🌙)',
  });

  // Button 3: Star
  const btnAStarMesh = addBox([1.2, 0.4, 1.2], [-7.5, 0.2, 54.0], greenRuneMat, false);
  interactiveObjects.push({
    id: 'btn_stage6_a_star',
    type: 'lever',
    mesh: btnAStarMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(btnAStarMesh.position, new THREE.Vector3(2.0, 1.5, 2.0)),
    prompt: 'فشار دادن نماد ستاره (⭐)',
  });

  // Lever A in Path A (Unlocks when Puzzle A is solved)
  const leverAMesh = addBox([0.8, 1.6, 0.8], [-7.5, 0.8, 66.0], goldMat, false);
  interactiveObjects.push({
    id: 'lever_stage6_a',
    type: 'lever',
    mesh: leverAMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(leverAMesh.position, new THREE.Vector3(2.2, 2.0, 2.2)),
    prompt: 'کشیدن اهرم A برای باز کردن مسیر B (کلید E)',
  });

  // Exit Gate for Path A (Opened by Lever B in Path B!)
  const exitGateAMesh = addBox([14, 8, 1.2], [-7.5, 3.5, 78.0], stoneMat, true);
  const exitGateAColliderIndex = colliders.length - 1;

  // =========================================================================
  // SECTION 2 & 3: PATH B (x: +1.5 to +13.5, z: 22 to 80)
  // =========================================================================
  // Path B Floor
  addBox([14, 1, 58], [7.5, -0.5, 51], woodMat);

  // CLUE BANNER ON PATH B WALL (Displaying Path A's Solution: ☀️ خورشید -> ⭐ ستاره -> 🌙 ماه)
  // Target A: ["sun", "star", "moon"]
  const clueA1Mesh = addBox([0.2, 1.8, 1.8], [13.2, 3.5, 30.0], goldMat, false);      // Sun icon
  const clueA2Mesh = addBox([0.2, 1.8, 1.8], [13.2, 3.5, 33.0], greenRuneMat, false);  // Star icon
  const clueA3Mesh = addBox([0.2, 1.8, 1.8], [13.2, 3.5, 36.0], cyanRuneMat, false);   // Moon icon

  // PATH B SYMBOL BUTTONS (Leaf 🍃, Drop 💧, Flame 🔥)
  // Button 1: Leaf
  const btnBLeafMesh = addBox([1.2, 0.4, 1.2], [7.5, 0.2, 42.0], greenRuneMat, false);
  interactiveObjects.push({
    id: 'btn_stage6_b_leaf',
    type: 'lever',
    mesh: btnBLeafMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(btnBLeafMesh.position, new THREE.Vector3(2.0, 1.5, 2.0)),
    prompt: 'فشار دادن نماد برگ (🍃)',
  });

  // Button 2: Drop
  const btnBDropMesh = addBox([1.2, 0.4, 1.2], [7.5, 0.2, 48.0], cyanRuneMat, false);
  interactiveObjects.push({
    id: 'btn_stage6_b_drop',
    type: 'lever',
    mesh: btnBDropMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(btnBDropMesh.position, new THREE.Vector3(2.0, 1.5, 2.0)),
    prompt: 'فشار دادن نماد قطره (💧)',
  });

  // Button 3: Flame
  const btnBFlameMesh = addBox([1.2, 0.4, 1.2], [7.5, 0.2, 54.0], redRuneMat, false);
  interactiveObjects.push({
    id: 'btn_stage6_b_flame',
    type: 'lever',
    mesh: btnBFlameMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(btnBFlameMesh.position, new THREE.Vector3(2.0, 1.5, 2.0)),
    prompt: 'فشار دادن نماد شعله (🔥)',
  });

  // Lever B in Path B (Unlocks when Puzzle B is solved)
  const leverBMesh = addBox([0.8, 1.6, 0.8], [7.5, 0.8, 66.0], goldMat, false);
  interactiveObjects.push({
    id: 'lever_stage6_b',
    type: 'lever',
    mesh: leverBMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(leverBMesh.position, new THREE.Vector3(2.2, 2.0, 2.2)),
    prompt: 'کشیدن اهرم B برای باز کردن مسیر A (کلید E)',
  });

  // Exit Gate for Path B (Opened by Lever A in Path A!)
  const exitGateBMesh = addBox([14, 8, 1.2], [7.5, 3.5, 78.0], stoneMat, true);
  const exitGateBColliderIndex = colliders.length - 1;

  // =========================================================================
  // SECTION 4: REJOINED FINAL HALL & EXIT (z: 80 to 110)
  // =========================================================================
  // Final Hall Floor
  addBox([30, 1, 30], [0, -0.5, 95], darkRockMat);

  // Checkpoint 3 Tablet at z: 82
  const cp3Mesh = addBox([1.0, 1.8, 0.3], [0, 1.0, 82], cyanRuneMat, false);

  // Final Co-op Buttons (Button A & Button B)
  const finalBtnAMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.2, 16), cyanRuneMat);
  finalBtnAMesh.position.set(-6.0, 0.1, 90.0);
  rootGroup.add(finalBtnAMesh);
  interactiveObjects.push({
    id: 'plate_stage6_final_a',
    type: 'pressure_plate',
    mesh: finalBtnAMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(finalBtnAMesh.position, new THREE.Vector3(2.5, 1.5, 2.5)),
    prompt: 'ایستادن روی دکمه خروج نهایی (چپ)',
  });

  const finalBtnBMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.2, 16), greenRuneMat);
  finalBtnBMesh.position.set(6.0, 0.1, 90.0);
  rootGroup.add(finalBtnBMesh);
  interactiveObjects.push({
    id: 'plate_stage6_final_b',
    type: 'pressure_plate',
    mesh: finalBtnBMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(finalBtnBMesh.position, new THREE.Vector3(2.5, 1.5, 2.5)),
    prompt: 'ایستادن روی دکمه خروج نهایی (راست)',
  });

  // Final Exit Sanctuary Gate (z = 98)
  const finalExitGateMesh = addBox([30, 8, 1.2], [0, 3.5, 98.0], stoneMat, true);
  const finalExitGateColliderIndex = colliders.length - 1;

  // Portal Base Ring
  const portalBaseGeo = new THREE.CylinderGeometry(2.8, 3.2, 0.4, 24);
  const portalBaseMesh = new THREE.Mesh(portalBaseGeo, goldMat);
  portalBaseMesh.position.set(0, 0.2, 105);
  rootGroup.add(portalBaseMesh);

  // Niwsha Exit Portal Pad
  const portalP1Mesh = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.2, 16), cyanRuneMat);
  portalP1Mesh.position.set(-2.5, 0.4, 105);
  rootGroup.add(portalP1Mesh);
  interactiveObjects.push({
    id: 'portal_p1_stage6',
    type: 'portal_pad',
    mesh: portalP1Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(portalP1Mesh.position, new THREE.Vector3(2.2, 2.0, 2.2)),
    prompt: 'ایستادن روی سکوی خروج نیوشا',
  });

  // Hasan Exit Portal Pad
  const portalP2Mesh = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.2, 16), greenRuneMat);
  portalP2Mesh.position.set(2.5, 0.4, 105);
  rootGroup.add(portalP2Mesh);
  interactiveObjects.push({
    id: 'portal_p2_stage6',
    type: 'portal_pad',
    mesh: portalP2Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(portalP2Mesh.position, new THREE.Vector3(2.2, 2.0, 2.2)),
    prompt: 'ایستادن روی سکوی خروج حسن',
  });

  // Checkpoints Definitions
  const checkpoints = [
    { id: 0, pos: [0, 1.0, 3.0] as [number, number, number], active: true, mesh: tabletMesh },
    { id: 1, pos: [0, 1.0, 25.0] as [number, number, number], active: false, mesh: cp2Mesh },
    { id: 2, pos: [0, 1.0, 82.0] as [number, number, number], active: false, mesh: cp3Mesh },
  ];

  // Animated Gate Y Heights
  let assignGateAY = 3.5;
  let assignGateBY = 3.5;
  let exitGateAY = 3.5;
  let exitGateBY = 3.5;
  let finalExitGateY = 3.5;

  return {
    rootGroup,
    colliders,
    interactiveObjects,
    spawnPoint: [0, 1.0, 3.0],
    checkpoints,
    update: (dt: number, state: PuzzleState) => {
      const customData = state.customData || {};

      // 1. Assignment Entrance Gates
      const isAssignedA = !!customData.stage6AssignedA;
      const isAssignedB = !!customData.stage6AssignedB;

      // Lower entrance gates once assigned to lock players into their respective paths
      const targetAssignAY = isAssignedA ? -6.0 : 3.5;
      const targetAssignBY = isAssignedB ? -6.0 : 3.5;

      assignGateAY += (targetAssignAY - assignGateAY) * Math.min(1, dt * 5.0);
      assignGateBY += (targetAssignBY - assignGateBY) * Math.min(1, dt * 5.0);

      assignGateAMesh.position.y = assignGateAY;
      assignGateBMesh.position.y = assignGateBY;

      if (assignGateAY < 0.0) {
        colliders[assignGateAColliderIndex].setFromCenterAndSize(new THREE.Vector3(0, -999, 0), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[assignGateAColliderIndex].setFromObject(assignGateAMesh);
      }

      if (assignGateBY < 0.0) {
        colliders[assignGateBColliderIndex].setFromCenterAndSize(new THREE.Vector3(0, -999, 0), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[assignGateBColliderIndex].setFromObject(assignGateBMesh);
      }

      // 2. Reciprocal Exit Gates
      // Exit Gate A is opened by Lever B!
      const leverBPulled = !!customData.stage6LeverB;
      const targetExitAY = leverBPulled ? -6.0 : 3.5;
      exitGateAY += (targetExitAY - exitGateAY) * Math.min(1, dt * 5.0);
      exitGateAMesh.position.y = exitGateAY;

      if (exitGateAY < 0.0) {
        colliders[exitGateAColliderIndex].setFromCenterAndSize(new THREE.Vector3(0, -999, 0), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[exitGateAColliderIndex].setFromObject(exitGateAMesh);
      }

      // Exit Gate B is opened by Lever A!
      const leverAPulled = !!customData.stage6LeverA;
      const targetExitBY = leverAPulled ? -6.0 : 3.5;
      exitGateBY += (targetExitBY - exitGateBY) * Math.min(1, dt * 5.0);
      exitGateBMesh.position.y = exitGateBY;

      if (exitGateBY < 0.0) {
        colliders[exitGateBColliderIndex].setFromCenterAndSize(new THREE.Vector3(0, -999, 0), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[exitGateBColliderIndex].setFromObject(exitGateBMesh);
      }

      // 3. Final Exit Gate (Permanently unlocked when final buttons pressed together)
      const finalUnlocked = !!customData.stage6FinalUnlocked;
      const targetFinalGateY = finalUnlocked ? -6.0 : 3.5;
      finalExitGateY += (targetFinalGateY - finalExitGateY) * Math.min(1, dt * 5.0);
      finalExitGateMesh.position.y = finalExitGateY;

      if (finalExitGateY < 0.0) {
        colliders[finalExitGateColliderIndex].setFromCenterAndSize(new THREE.Vector3(0, -999, 0), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[finalExitGateColliderIndex].setFromObject(finalExitGateMesh);
      }

      // 4. Visual Glow Feedback for Levers & Symbol Puzzles
      const puzzleASolved = !!customData.stage6PuzzleASolved;
      const puzzleBSolved = !!customData.stage6PuzzleBSolved;

      (leverAMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = puzzleASolved ? 0.8 : 0.1;
      (leverBMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = puzzleBSolved ? 0.8 : 0.1;

      // Portal Pads feedback
      const p1Ready = !!customData.stage6ExitP1Ready;
      const p2Ready = !!customData.stage6ExitP2Ready;

      (portalP1Mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = p1Ready ? 1.0 : 0.2;
      (portalP2Mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = p2Ready ? 1.0 : 0.2;
    },
    dispose: () => {
      rootGroup.clear();
    },
  };
}
