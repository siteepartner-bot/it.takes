import * as THREE from 'three';
import type { PuzzleState } from '../../types.ts';
import type { StageBuildResult, InteractiveObject } from './gardenStage.ts';

/**
 * Stage 6: معبد دو مسیر (Temple of Two Paths)
 * 
 * Clean Co-Op Puzzle Stage based strictly on Buttons, Doors, Levers, Shared State & Information Exchange.
 * 
 * Flow:
 * 1. Path Division: Players enter and get assigned Path A (Left) or Path B (Right).
 * 2. Information Puzzle: 
 *    - Path A has Symbol Buttons (Sun, Moon, Star). The correct order is written on Path B's wall.
 *    - Path B has Symbol Buttons (Leaf, Drop, Flame). The correct order is written on Path A's wall.
 * 3. Cross-Lever Unlocks:
 *    - Solving Puzzle A unlocks Lever A, which opens Door B.
 *    - Solving Puzzle B unlocks Lever B, which opens Door A.
 * 4. Final Rejoined Sanctuary:
 *    - Players rejoin in the main hall.
 *    - Dual Pressure Buttons permanently unlock the Final Gate.
 *    - Exit Portal Pads complete Stage 6.
 */
export function buildTowerOfBalanceStage(): StageBuildResult {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'stage_temple_of_two_paths';

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

  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.9,
    metalness: 0.1,
  });

  const orangePlankMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    roughness: 0.6,
    metalness: 0.2,
  });

  const cyanRuneMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.6,
    roughness: 0.3,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xca8a04,
    emissiveIntensity: 0.5,
    metalness: 0.8,
    roughness: 0.3,
  });

  const rubyMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 0.5,
    roughness: 0.3,
  });

  const emeraldMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.5,
    roughness: 0.3,
  });

  const amberMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.5,
    roughness: 0.3,
  });

  // --- Helper Functions ---
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
  // SECTION 1: ENTRANCE HALL & BOUNDARY WALLS (z: 0 to 18)
  // =========================================================================
  // Grand Base Floor (z: -5 to 100, y: -0.5)
  addBox([40, 1, 110], [0, -0.5, 50], darkStoneMat);

  // Temple Outer Walls
  addBox([1.5, 12, 110], [-19.5, 5.5, 50], stoneMat);
  addBox([1.5, 12, 110], [19.5, 5.5, 50], stoneMat);
  addBox([40, 12, 1.5], [0, 5.5, -4.5], stoneMat);
  addBox([40, 12, 1.5], [0, 5.5, 99.5], stoneMat);

  // Entrance Room Floor (z: -4 to 15)
  addBox([38, 1, 20], [0, -0.5, 6], woodMat);

  // Central Dividing Wall separating Entrance from Corridors (z: 15.0)
  addBox([14, 10, 1.5], [0, 4.5, 15.0], stoneMat); // Center divider
  addBox([10, 10, 1.5], [-14.5, 4.5, 15.0], stoneMat); // Far left wall
  addBox([10, 10, 1.5], [14.5, 4.5, 15.0], stoneMat); // Far right wall

  // Entrance Archway Doors (Door Path A at x: -8.0, Door Path B at x: +8.0)
  const doorAEnterMesh = addBox([5.0, 8.0, 1.0], [-8.0, 3.5, 15.0], orangePlankMat, true);
  const doorAEnterColliderIndex = colliders.length - 1;

  const doorBEnterMesh = addBox([5.0, 8.0, 1.0], [8.0, 3.5, 15.0], orangePlankMat, true);
  const doorBEnterColliderIndex = colliders.length - 1;

  // Story Lore Tablet at Entrance
  const tabletMesh = addBox([1.2, 2.0, 0.3], [0, 1.0, 2.0], cyanRuneMat, false);
  interactiveObjects.push({
    id: 'story_tablet_stage6',
    type: 'lever',
    mesh: tabletMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, 1.0, 2.0), new THREE.Vector3(2.5, 2.0, 2.5)),
    prompt: 'خواندن کتیبه معبد دو مسیر (کلید E)',
  });

  // =========================================================================
  // SECTION 2: SEPARATED CORRIDORS & INFORMATION PUZZLE (z: 18 to 60)
  // =========================================================================
  // Divider Wall between Path A and Path B (x: 0, z: 15 to 62)
  addBox([1.5, 10, 47], [0, 4.5, 38.5], stoneMat);

  // --- PATH A (LEFT CORRIDOR, x = -8.0) ---
  addBox([16, 1, 45], [-8.0, -0.5, 38.5], woodMat);

  // Scroll Inscription Wall A (Displays answer for Path B!)
  const scrollAMesh = addBox([0.3, 2.5, 4.0], [-18.5, 3.0, 36.0], goldMat, false);
  interactiveObjects.push({
    id: 'tablet_hint_pathB',
    type: 'lever',
    mesh: scrollAMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-18.0, 3.0, 36.0), new THREE.Vector3(3.0, 3.0, 3.0)),
    prompt: 'خواندن کتیبه راهنمای مسیر هم‌تیمی (راست) [کلید E]',
  });

  // Path A Symbol Buttons:
  // 1. Sun Button (☀️) at z = 30.0
  const btnASunMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 0.3, 16), amberMat);
  btnASunMesh.position.set(-8.0, 0.15, 30.0);
  rootGroup.add(btnASunMesh);
  interactiveObjects.push({
    id: 'btn_stage6_symbolA_sun',
    type: 'lever',
    mesh: btnASunMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(btnASunMesh.position, new THREE.Vector3(2.2, 2.0, 2.2)),
    prompt: 'فشار دادن نماد خورشید ☀️ (مسیر چپ)',
  });

  // 2. Moon Button (🌙) at z = 38.0
  const btnAMoonMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 0.3, 16), cyanRuneMat);
  btnAMoonMesh.position.set(-8.0, 0.15, 38.0);
  rootGroup.add(btnAMoonMesh);
  interactiveObjects.push({
    id: 'btn_stage6_symbolA_moon',
    type: 'lever',
    mesh: btnAMoonMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(btnAMoonMesh.position, new THREE.Vector3(2.2, 2.0, 2.2)),
    prompt: 'فشار دادن نماد ماه 🌙 (مسیر چپ)',
  });

  // 3. Star Button (⭐) at z = 46.0
  const btnAStarMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 0.3, 16), goldMat);
  btnAStarMesh.position.set(-8.0, 0.15, 46.0);
  rootGroup.add(btnAStarMesh);
  interactiveObjects.push({
    id: 'btn_stage6_symbolA_star',
    type: 'lever',
    mesh: btnAStarMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(btnAStarMesh.position, new THREE.Vector3(2.2, 2.0, 2.2)),
    prompt: 'فشار دادن نماد ستاره ⭐ (مسیر چپ)',
  });

  // Lever A at z = 54.0 (Unlocked after Puzzle A solved, opens Door B Exit!)
  const leverAMesh = addBox([0.8, 1.6, 0.8], [-8.0, 0.8, 54.0], goldMat, false);
  interactiveObjects.push({
    id: 'lever_stage6_pathA',
    type: 'lever',
    mesh: leverAMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(leverAMesh.position, new THREE.Vector3(2.5, 2.0, 2.5)),
    prompt: 'فعال‌سازی اهرم آزادسازی مسیر هم‌تیمی (راست)',
  });

  // --- PATH B (RIGHT CORRIDOR, x = +8.0) ---
  addBox([16, 1, 45], [8.0, -0.5, 38.5], woodMat);

  // Scroll Inscription Wall B (Displays answer for Path A!)
  const scrollBMesh = addBox([0.3, 2.5, 4.0], [18.5, 3.0, 36.0], goldMat, false);
  interactiveObjects.push({
    id: 'tablet_hint_pathA',
    type: 'lever',
    mesh: scrollBMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(18.0, 3.0, 36.0), new THREE.Vector3(3.0, 3.0, 3.0)),
    prompt: 'خواندن کتیبه راهنمای مسیر هم‌تیمی (چپ) [کلید E]',
  });

  // Path B Symbol Buttons:
  // 1. Leaf Button (🍃) at z = 30.0
  const btnBLeafMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 0.3, 16), emeraldMat);
  btnBLeafMesh.position.set(8.0, 0.15, 30.0);
  rootGroup.add(btnBLeafMesh);
  interactiveObjects.push({
    id: 'btn_stage6_symbolB_leaf',
    type: 'lever',
    mesh: btnBLeafMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(btnBLeafMesh.position, new THREE.Vector3(2.2, 2.0, 2.2)),
    prompt: 'فشار دادن نماد برگ 🍃 (مسیر راست)',
  });

  // 2. Drop Button (💧) at z = 38.0
  const btnBDropMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 0.3, 16), cyanRuneMat);
  btnBDropMesh.position.set(8.0, 0.15, 38.0);
  rootGroup.add(btnBDropMesh);
  interactiveObjects.push({
    id: 'btn_stage6_symbolB_drop',
    type: 'lever',
    mesh: btnBDropMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(btnBDropMesh.position, new THREE.Vector3(2.2, 2.0, 2.2)),
    prompt: 'فشار دادن نماد قطره 💧 (مسیر راست)',
  });

  // 3. Flame Button (🔥) at z = 46.0
  const btnBFlameMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 0.3, 16), rubyMat);
  btnBFlameMesh.position.set(8.0, 0.15, 46.0);
  rootGroup.add(btnBFlameMesh);
  interactiveObjects.push({
    id: 'btn_stage6_symbolB_flame',
    type: 'lever',
    mesh: btnBFlameMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(btnBFlameMesh.position, new THREE.Vector3(2.2, 2.0, 2.2)),
    prompt: 'فشار دادن نماد شعله 🔥 (مسیر راست)',
  });

  // Lever B at z = 54.0 (Unlocked after Puzzle B solved, opens Door A Exit!)
  const leverBMesh = addBox([0.8, 1.6, 0.8], [8.0, 0.8, 54.0], goldMat, false);
  interactiveObjects.push({
    id: 'lever_stage6_pathB',
    type: 'lever',
    mesh: leverBMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(leverBMesh.position, new THREE.Vector3(2.5, 2.0, 2.5)),
    prompt: 'فعال‌سازی اهرم آزادسازی مسیر هم‌تیمی (چپ)',
  });

  // =========================================================================
  // SECTION 3: CROSS-LEVER EXIT DOORS (z = 62.0)
  // =========================================================================
  // Dividing Wall at z = 62.0 with Door Openings
  addBox([12, 10, 1.5], [-13.5, 4.5, 62.0], stoneMat);
  addBox([12, 10, 1.5], [13.5, 4.5, 62.0], stoneMat);
  addBox([4, 10, 1.5], [0, 4.5, 62.0], stoneMat);

  // Door A Exit (Opens when Puzzle B solved AND Lever B activated!)
  const doorAExitMesh = addBox([5.0, 8.0, 1.0], [-8.0, 3.5, 62.0], orangePlankMat, true);
  const doorAExitColliderIndex = colliders.length - 1;

  // Door B Exit (Opens when Puzzle A solved AND Lever A activated!)
  const doorBExitMesh = addBox([5.0, 8.0, 1.0], [8.0, 3.5, 62.0], orangePlankMat, true);
  const doorBExitColliderIndex = colliders.length - 1;

  // Checkpoint 3 Tablet at z = 64
  const cp3Mesh = addBox([1.0, 1.8, 0.3], [0, 1.0, 64.0], cyanRuneMat, false);

  // =========================================================================
  // SECTION 4: FINAL REJOINED SANCTUARY (z: 64 to 98)
  // =========================================================================
  // Rejoined Grand Hall Floor (z: 62 to 98)
  addBox([38, 1, 36], [0, -0.5, 80.0], darkStoneMat);

  // Final Dual Pressure Buttons (x: -5.0 & x: +5.0, z = 74.0)
  const plateFinalAMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 0.2, 16), cyanRuneMat);
  plateFinalAMesh.position.set(-5.0, 0.1, 74.0);
  rootGroup.add(plateFinalAMesh);
  interactiveObjects.push({
    id: 'plate_stage6_finalA',
    type: 'pressure_plate',
    mesh: plateFinalAMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(plateFinalAMesh.position, new THREE.Vector3(2.8, 1.5, 2.8)),
    prompt: 'ایستادن روی دکمه نهایی چپ',
  });

  const plateFinalBMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 0.2, 16), cyanRuneMat);
  plateFinalBMesh.position.set(5.0, 0.1, 74.0);
  rootGroup.add(plateFinalBMesh);
  interactiveObjects.push({
    id: 'plate_stage6_finalB',
    type: 'pressure_plate',
    mesh: plateFinalBMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(plateFinalBMesh.position, new THREE.Vector3(2.8, 1.5, 2.8)),
    prompt: 'ایستادن روی دکمه نهایی راست',
  });

  // Final Exit Gate Wall (z = 82.0)
  addBox([14, 10, 1.5], [-12.0, 4.5, 82.0], stoneMat);
  addBox([14, 10, 1.5], [12.0, 4.5, 82.0], stoneMat);

  // Final Exit Door Mesh
  const finalDoorMesh = addBox([10.0, 8.0, 1.2], [0, 3.5, 82.0], goldMat, true);
  const finalDoorColliderIndex = colliders.length - 1;

  // Portal Base Ring
  const portalBaseGeo = new THREE.CylinderGeometry(2.8, 3.2, 0.4, 24);
  const portalBaseMesh = new THREE.Mesh(portalBaseGeo, goldMat);
  portalBaseMesh.position.set(0, 0.2, 90.0);
  rootGroup.add(portalBaseMesh);

  // Niwsha Exit Portal Pad
  const portalP1Mesh = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.2, 16), cyanRuneMat);
  portalP1Mesh.position.set(-2.5, 0.4, 90.0);
  rootGroup.add(portalP1Mesh);
  interactiveObjects.push({
    id: 'portal_p1_stage6',
    type: 'portal_pad',
    mesh: portalP1Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(portalP1Mesh.position, new THREE.Vector3(2.2, 2.0, 2.2)),
    prompt: 'ایستادن روی سکوی خروج نیوشا',
  });

  // Hasan Exit Portal Pad
  const portalP2Mesh = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.2, 16), cyanRuneMat);
  portalP2Mesh.position.set(2.5, 0.4, 90.0);
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
    { id: 1, pos: [0, 1.0, 20.0] as [number, number, number], active: false, mesh: cp3Mesh },
    { id: 2, pos: [0, 1.0, 64.0] as [number, number, number], active: false, mesh: cp3Mesh },
  ];

  // Door Position Interpolation Variables
  let doorAEnterY = 3.5;
  let doorBEnterY = 3.5;
  let doorAExitY = 3.5;
  let doorBExitY = 3.5;
  let finalDoorY = 3.5;

  return {
    rootGroup,
    colliders,
    interactiveObjects,
    spawnPoint: [0, 1.0, 3.0],
    checkpoints,
    update: (dt: number, state: PuzzleState) => {
      const customData = state.customData || {};

      // 1. Entrance Doors (Open when assigned or lock released)
      const assignmentLocked = !!customData.stage6AssignmentLocked;
      const targetEnterY = assignmentLocked ? -6.0 : 3.5;

      doorAEnterY += (targetEnterY - doorAEnterY) * Math.min(1, dt * 4.0);
      doorBEnterY += (targetEnterY - doorBEnterY) * Math.min(1, dt * 4.0);

      doorAEnterMesh.position.y = doorAEnterY;
      doorBEnterMesh.position.y = doorBEnterY;

      if (assignmentLocked || doorAEnterY < 0) {
        colliders[doorAEnterColliderIndex].setFromCenterAndSize(new THREE.Vector3(0, -999, 0), new THREE.Vector3(0, 0, 0));
        colliders[doorBEnterColliderIndex].setFromCenterAndSize(new THREE.Vector3(0, -999, 0), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[doorAEnterColliderIndex].setFromObject(doorAEnterMesh);
        colliders[doorBEnterColliderIndex].setFromObject(doorBEnterMesh);
      }

      // 2. Exit Doors (Cross-dependence)
      // Door A Exit opens when Puzzle B is solved AND Lever B is activated!
      const doorAExitOpen = !!(customData.stage6PuzzleBSolved && customData.stage6LeverBActive);
      const targetDoorAExitY = doorAExitOpen ? -6.0 : 3.5;

      // Door B Exit opens when Puzzle A is solved AND Lever A is activated!
      const doorBExitOpen = !!(customData.stage6PuzzleASolved && customData.stage6LeverAActive);
      const targetDoorBExitY = doorBExitOpen ? -6.0 : 3.5;

      doorAExitY += (targetDoorAExitY - doorAExitY) * Math.min(1, dt * 4.0);
      doorBExitY += (targetDoorBExitY - doorBExitY) * Math.min(1, dt * 4.0);

      doorAExitMesh.position.y = doorAExitY;
      doorBExitMesh.position.y = doorBExitY;

      if (doorAExitOpen || doorAExitY < 0) {
        colliders[doorAExitColliderIndex].setFromCenterAndSize(new THREE.Vector3(0, -999, 0), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[doorAExitColliderIndex].setFromObject(doorAExitMesh);
      }

      if (doorBExitOpen || doorBExitY < 0) {
        colliders[doorBExitColliderIndex].setFromCenterAndSize(new THREE.Vector3(0, -999, 0), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[doorBExitColliderIndex].setFromObject(doorBExitMesh);
      }

      // 3. Final Exit Door (Permanent Unlock when both buttons pressed)
      const finalDoorUnlocked = !!customData.stage6FinalDoorUnlocked;
      const targetFinalDoorY = finalDoorUnlocked ? -6.0 : 3.5;

      finalDoorY += (targetFinalDoorY - finalDoorY) * Math.min(1, dt * 4.0);
      finalDoorMesh.position.y = finalDoorY;

      if (finalDoorUnlocked || finalDoorY < 0) {
        colliders[finalDoorColliderIndex].setFromCenterAndSize(new THREE.Vector3(0, -999, 0), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[finalDoorColliderIndex].setFromObject(finalDoorMesh);
      }

      // Visual Glow Updates
      const puzzleASolved = !!customData.stage6PuzzleASolved;
      const puzzleBSolved = !!customData.stage6PuzzleBSolved;
      (leverAMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = puzzleASolved ? 1.0 : 0.2;
      (leverBMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = puzzleBSolved ? 1.0 : 0.2;

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
