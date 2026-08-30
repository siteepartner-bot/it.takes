import * as THREE from 'three';
import type { PuzzleState } from '../../types.ts';
import type { StageBuildResult, InteractiveObject } from './gardenStage.ts';
import { StatefulDoor } from './campaignStages.ts';

/**
 * Stage 7: معمای چهار اتاق (Four Chambers Puzzle)
 * 
 * A high-craft 4-chamber co-op puzzle featuring:
 * - Pure co-op puzzle logic using Buttons, Levers, Doors & Shared State.
 * - Zero custom physics, zero lag-sensitive mechanics.
 * - Room 1 & Room 2 reciprocal clue sharing (A sees clue for B, B sees clue for A).
 * - Reciprocal lever door unlocks into Room 3.
 * - Room 3 code translation (Number-to-Element sequence).
 * - Rejoined Final Sanctuary with combined 4-symbol sequence puzzle.
 * - Permanent door unlocks, bulletproof state sync, multi-checkpoint recovery.
 */
export function buildFourChambersStage(): StageBuildResult {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'stage_four_chambers';

  const colliders: THREE.Box3[] = [];
  const interactiveObjects: InteractiveObject[] = [];

  // --- Materials ---
  const darkWoodMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.7,
    metalness: 0.2,
  });

  const lightWoodMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.6,
    metalness: 0.1,
  });

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.8,
    metalness: 0.3,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xca8a04,
    emissiveIntensity: 0.5,
    metalness: 0.8,
    roughness: 0.3,
  });

  const sunRuneMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.7,
    roughness: 0.3,
  });

  const moonRuneMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.7,
    roughness: 0.3,
  });

  const starRuneMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    emissive: 0xca8a04,
    emissiveIntensity: 0.7,
    roughness: 0.3,
  });

  const heartRuneMat = new THREE.MeshStandardMaterial({
    color: 0xec4899,
    emissive: 0xbe185d,
    emissiveIntensity: 0.7,
    roughness: 0.3,
  });

  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x15803d,
    emissiveIntensity: 0.6,
  });

  const fireMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xb91c1c,
    emissiveIntensity: 0.6,
  });

  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.6,
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
      colliders.push(new THREE.Box3().setFromObject(mesh));
    }
    return mesh;
  }

  // Helper to create visual symbol plaques
  function addSymbolPlaque(pos: [number, number, number], runeMat: THREE.Material, label: string) {
    const frameGeo = new THREE.BoxGeometry(1.6, 1.6, 0.15);
    const frameMesh = new THREE.Mesh(frameGeo, darkWoodMat);
    frameMesh.position.set(...pos);
    rootGroup.add(frameMesh);

    const runeGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 16);
    const runeMesh = new THREE.Mesh(runeGeo, runeMat);
    runeMesh.rotation.x = Math.PI / 2;
    runeMesh.position.set(pos[0], pos[1], pos[2] + 0.1);
    rootGroup.add(runeMesh);
  }

  // Helper to create visual clue banner
  function addClueBanner(pos: [number, number, number], rotY: number, runes: THREE.Material[]) {
    const bannerGroup = new THREE.Group();
    bannerGroup.position.set(...pos);
    bannerGroup.rotation.y = rotY;

    const backGeo = new THREE.BoxGeometry(6.0, 2.2, 0.2);
    const backMesh = new THREE.Mesh(backGeo, darkWoodMat);
    backMesh.castShadow = true;
    bannerGroup.add(backMesh);

    runes.forEach((mat, idx) => {
      const runeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.2, 16), mat);
      runeMesh.rotation.x = Math.PI / 2;
      runeMesh.position.set(-1.8 + idx * 1.8, 0, 0.15);
      bannerGroup.add(runeMesh);
    });

    rootGroup.add(bannerGroup);
  }

  // =========================================================================
  // 1. CENTRAL ENTRANCE HALL (z: 0 to 22)
  // =========================================================================
  // Entrance Floor
  addBox([30, 1, 22], [0, -0.5, 11], lightWoodMat);

  // Outer Walls
  addBox([1, 8, 22], [-15, 3.5, 11], darkWoodMat);
  addBox([1, 8, 22], [15, 3.5, 11], darkWoodMat);

  // Entrance Story Tablet
  const tabletMesh = addBox([1.4, 2.0, 0.3], [-6, 1.0, 2], goldMat, false);
  interactiveObjects.push({
    id: 'story_tablet_stage7',
    type: 'lever',
    mesh: tabletMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(tabletMesh.position, new THREE.Vector3(2.5, 2.5, 2.5)),
    prompt: 'خواندن کتیبه راز معمای چهار اتاق (کلید E)',
  });

  // Door 1 Left (Path A Entrance to Room 1, x = -8.5, z = 22)
  const assignGateAMesh = addBox([14, 8, 1.2], [-7.5, 3.5, 22.0], stoneMat, true);
  const assignGateAColliderIndex = colliders.length - 1;

  // Door 1 Right (Path B Entrance to Room 2, x = +8.5, z = 22)
  const assignGateBMesh = addBox([14, 8, 1.2], [7.5, 3.5, 22.0], stoneMat, true);
  const assignGateBColliderIndex = colliders.length - 1;

  // Room 1 Entrance Symbol Above Archway (Moon 🌙)
  addSymbolPlaque([-7.5, 7.0, 21.3], moonRuneMat, 'Moon');
  // Room 2 Entrance Symbol Above Archway (Heart ❤️)
  addSymbolPlaque([7.5, 7.0, 21.3], heartRuneMat, 'Heart');

  // Trigger Plates for Path Assignment (z = 18)
  const triggerMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.5,
  });

  const plateA = addBox([2.2, 0.2, 2.2], [-7.5, 0.1, 18.0], triggerMat, false);
  interactiveObjects.push({
    id: 'plate_stage7_trigger_a',
    type: 'pressure_plate',
    mesh: plateA,
    bounds: new THREE.Box3().setFromCenterAndSize(plateA.position, new THREE.Vector3(3, 2, 3)),
    prompt: 'ایستادن برای باز کردن در ورودی اتاق ۲ هم‌تیمی (اتاق بغلی)',
  });

  const plateB = addBox([2.2, 0.2, 2.2], [7.5, 0.1, 18.0], triggerMat, false);
  interactiveObjects.push({
    id: 'plate_stage7_trigger_b',
    type: 'pressure_plate',
    mesh: plateB,
    bounds: new THREE.Box3().setFromCenterAndSize(plateB.position, new THREE.Vector3(3, 2, 3)),
    prompt: 'ایستادن برای باز کردن در ورودی اتاق ۱ هم‌تیمی (اتاق بغلی)',
  });

  // Stateful Doors for Assignment Gates
  const assignDoorA = new StatefulDoor(assignGateAMesh, 3.5, -4.5, 6.0);
  const assignDoorB = new StatefulDoor(assignGateBMesh, 3.5, -4.5, 6.0);

  // =========================================================================
  // 2. ROOM 1 (Left Side, x: -15 to -0.5, z: 22 to 70)
  // =========================================================================
  addBox([14.5, 1, 48], [-7.75, -0.5, 46], lightWoodMat);
  // Outer Left Wall
  addBox([1, 8, 48], [-15, 3.5, 46], darkWoodMat);
  // Central Divider Wall between Room 1 & Room 2
  addBox([1, 8, 48], [-0.5, 3.5, 46], darkWoodMat);

  // CLUE BANNER ON ROOM 1 WALL (Clue for Room 2: Moon 🌙 -> Heart ❤️ -> Star ⭐)
  addClueBanner([-14.2, 4.0, 32.0], Math.PI / 2, [moonRuneMat, heartRuneMat, starRuneMat]);

  // Clue Tablet Room 1
  const clue1Mesh = addBox([0.4, 1.8, 1.2], [-14.2, 1.5, 36.0], goldMat, false);
  interactiveObjects.push({
    id: 'tablet_stage7_clue1',
    type: 'lever',
    mesh: clue1Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(clue1Mesh.position, new THREE.Vector3(2.5, 2.5, 2.5)),
    prompt: 'خواندن کتیبه دیوار اتاق ۱ (راهنمای پازل اتاق ۲ هم‌تیمی) (E)',
  });

  // 3 Symbol Buttons for Room 1 (Target from Room 2: Heart ❤️ -> Sun ☀️ -> Moon 🌙)
  const createSymbolButton = (id: string, label: string, pos: [number, number, number], runeMat: THREE.Material) => {
    const baseMesh = addBox([1.6, 0.4, 1.6], pos, darkWoodMat, false);
    const topMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.3, 16), runeMat);
    topMesh.position.set(pos[0], pos[1] + 0.25, pos[2]);
    rootGroup.add(topMesh);

    interactiveObjects.push({
      id,
      type: 'lever',
      mesh: topMesh,
      bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(...pos), new THREE.Vector3(2.2, 2.0, 2.2)),
      prompt: `فشردن نماد ${label} (کلید E)`,
    });
    return topMesh;
  };

  const btnR1Heart = createSymbolButton('btn_stage7_r1_heart', 'قلب ❤️', [-11.5, 0.2, 48.0], heartRuneMat);
  const btnR1Sun = createSymbolButton('btn_stage7_r1_sun', 'خورشید ☀️', [-7.75, 0.2, 48.0], sunRuneMat);
  const btnR1Moon = createSymbolButton('btn_stage7_r1_moon', 'ماه 🌙', [-4.0, 0.2, 48.0], moonRuneMat);

  // Room 1 Reciprocal Lever (Unlocked when Room 1 Solved; opens Door for Room 3 Right for Player B)
  const lever1Mesh = addBox([0.8, 1.4, 0.8], [-7.75, 0.7, 62.0], goldMat, false);
  interactiveObjects.push({
    id: 'lever_stage7_room1',
    type: 'lever',
    mesh: lever1Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(lever1Mesh.position, new THREE.Vector3(2.5, 2.5, 2.5)),
    prompt: 'کشیدن اهرم اتاق ۱ (فقط باز کردن در خروج اتاق ۲ هم‌تیمی) (E)',
  });

  // Exit Gate for Room 1 (Opened by Lever Room 2 in Room 2!)
  const exitGateAMesh = addBox([14.5, 8, 1.2], [-7.75, 3.5, 70.0], stoneMat, true);
  const exitGateAColliderIndex = colliders.length - 1;
  const exitDoorA = new StatefulDoor(exitGateAMesh, 3.5, -4.5, 6.0);

  // =========================================================================
  // 3. ROOM 2 (Right Side, x: +0.5 to +15, z: 22 to 70)
  // =========================================================================
  addBox([14.5, 1, 48], [7.75, -0.5, 46], lightWoodMat);
  // Outer Right Wall
  addBox([1, 8, 48], [15, 3.5, 46], darkWoodMat);
  // Central Divider Wall (Shared with Room 1 at x = -0.5, but added visually)
  addBox([1, 8, 48], [0.5, 3.5, 46], darkWoodMat);

  // CLUE BANNER ON ROOM 2 WALL (Clue for Room 1: Heart ❤️ -> Sun ☀️ -> Moon 🌙)
  addClueBanner([14.2, 4.0, 32.0], -Math.PI / 2, [heartRuneMat, sunRuneMat, moonRuneMat]);

  // Clue Tablet Room 2
  const clue2Mesh = addBox([0.4, 1.8, 1.2], [14.2, 1.5, 36.0], goldMat, false);
  interactiveObjects.push({
    id: 'tablet_stage7_clue2',
    type: 'lever',
    mesh: clue2Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(clue2Mesh.position, new THREE.Vector3(2.5, 2.5, 2.5)),
    prompt: 'خواندن کتیبه دیوار اتاق ۲ (راهنمای پازل اتاق ۱ هم‌تیمی) (E)',
  });

  // 3 Symbol Buttons for Room 2 (Target from Room 1: Moon 🌙 -> Heart ❤️ -> Star ⭐)
  const btnR2Moon = createSymbolButton('btn_stage7_r2_moon', 'ماه 🌙', [4.0, 0.2, 48.0], moonRuneMat);
  const btnR2Heart = createSymbolButton('btn_stage7_r2_heart', 'قلب ❤️', [7.75, 0.2, 48.0], heartRuneMat);
  const btnR2Star = createSymbolButton('btn_stage7_r2_star', 'ستاره ⭐', [11.5, 0.2, 48.0], starRuneMat);

  // Room 2 Reciprocal Lever (Unlocked when Room 2 Solved; opens Door for Room 3 Left for Player A)
  const lever2Mesh = addBox([0.8, 1.4, 0.8], [7.75, 0.7, 62.0], goldMat, false);
  interactiveObjects.push({
    id: 'lever_stage7_room2',
    type: 'lever',
    mesh: lever2Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(lever2Mesh.position, new THREE.Vector3(2.5, 2.5, 2.5)),
    prompt: 'کشیدن اهرم اتاق ۲ (فقط باز کردن در خروج اتاق ۱ هم‌تیمی) (E)',
  });

  // Exit Gate for Room 2 (Opened by Lever Room 1 in Room 1!)
  const exitGateBMesh = addBox([14.5, 8, 1.2], [7.75, 3.5, 70.0], stoneMat, true);
  const exitGateBColliderIndex = colliders.length - 1;
  const exitDoorB = new StatefulDoor(exitGateBMesh, 3.5, -4.5, 6.0);

  // =========================================================================
  // 4. ROOM 3 (z: 70 to 120, x: -15 to +15)
  // =========================================================================
  // Room 3 Floor
  addBox([30, 1, 50], [0, -0.5, 95], lightWoodMat);
  // Outer Walls
  addBox([1, 8, 50], [-15, 3.5, 95], darkWoodMat);
  addBox([1, 8, 50], [15, 3.5, 95], darkWoodMat);

  // Room 3 Entrance Symbol Above Archway (Star ⭐)
  addSymbolPlaque([0, 7.0, 70.3], starRuneMat, 'Star');

  // Central Divider Lattice Wall separating Player A & Player B in Room 3
  const room3CenterWallMesh = addBox([0.8, 8, 48], [0, 3.5, 94], stoneMat, true);
  const room3CenterWallColliderIndex = colliders.length - 1;
  const room3CenterDoor = new StatefulDoor(room3CenterWallMesh, 3.5, -4.5, 6.0);

  // --- Player A's Side of Room 3 (x: -15 to -0.5) ---
  // Visual Clue Banner on Player A's Wall (Clue for Room 3 B)
  addClueBanner([-14.2, 4.0, 85.0], Math.PI / 2, [waterMat, leafMat, fireMat]);

  // Clue Tablet Room 3
  const clue3Mesh = addBox([0.4, 1.8, 1.2], [-14.2, 1.5, 85.0], goldMat, false);
  interactiveObjects.push({
    id: 'tablet_stage7_clue3',
    type: 'lever',
    mesh: clue3Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(clue3Mesh.position, new THREE.Vector3(2.5, 2.5, 2.5)),
    prompt: 'خواندن کتیبه راهنمای اهرم‌های عناصر (E)',
  });

  // 3 Element Levers for Player A (Target: Water 💧 -> Leaf 🍃 -> Fire 🔥)
  const leverR3WaterA = addBox([0.8, 1.4, 0.8], [-11.5, 0.7, 95.0], waterMat, false);
  interactiveObjects.push({
    id: 'lever_stage7_r3_a_water',
    type: 'lever',
    mesh: leverR3WaterA,
    bounds: new THREE.Box3().setFromCenterAndSize(leverR3WaterA.position, new THREE.Vector3(2.5, 2.5, 2.5)),
    prompt: 'کشیدن اهرم عنصر قطره آب 💧 (اتاق ۳ الف) (E)',
  });

  const leverR3LeafA = addBox([0.8, 1.4, 0.8], [-7.75, 0.7, 95.0], leafMat, false);
  interactiveObjects.push({
    id: 'lever_stage7_r3_a_leaf',
    type: 'lever',
    mesh: leverR3LeafA,
    bounds: new THREE.Box3().setFromCenterAndSize(leverR3LeafA.position, new THREE.Vector3(2.5, 2.5, 2.5)),
    prompt: 'کشیدن اهرم عنصر برگ 🍃 (اتاق ۳ الف) (E)',
  });

  const leverR3FireA = addBox([0.8, 1.4, 0.8], [-4.0, 0.7, 95.0], fireMat, false);
  interactiveObjects.push({
    id: 'lever_stage7_r3_a_fire',
    type: 'lever',
    mesh: leverR3FireA,
    bounds: new THREE.Box3().setFromCenterAndSize(leverR3FireA.position, new THREE.Vector3(2.5, 2.5, 2.5)),
    prompt: 'کشیدن اهرم عنصر شعله 🔥 (اتاق ۳ الف) (E)',
  });

  // --- Player B's Side of Room 3 (x: +0.5 to +15) ---
  // Visual Clue Banner on Player B's Wall (Clue for Room 3 A)
  addClueBanner([14.2, 4.0, 85.0], -Math.PI / 2, [waterMat, leafMat, fireMat]);

  // 3 Element Levers for Player B (Target: Water 💧 -> Leaf 🍃 -> Fire 🔥)
  const leverR3WaterB = addBox([0.8, 1.4, 0.8], [4.0, 0.7, 95.0], waterMat, false);
  interactiveObjects.push({
    id: 'lever_stage7_r3_b_water',
    type: 'lever',
    mesh: leverR3WaterB,
    bounds: new THREE.Box3().setFromCenterAndSize(leverR3WaterB.position, new THREE.Vector3(2.5, 2.5, 2.5)),
    prompt: 'کشیدن اهرم عنصر قطره آب 💧 (اتاق ۳ ب) (E)',
  });

  const leverR3LeafB = addBox([0.8, 1.4, 0.8], [7.75, 0.7, 95.0], leafMat, false);
  interactiveObjects.push({
    id: 'lever_stage7_r3_b_leaf',
    type: 'lever',
    mesh: leverR3LeafB,
    bounds: new THREE.Box3().setFromCenterAndSize(leverR3LeafB.position, new THREE.Vector3(2.5, 2.5, 2.5)),
    prompt: 'کشیدن اهرم عنصر برگ 🍃 (اتاق ۳ ب) (E)',
  });

  const leverR3FireB = addBox([0.8, 1.4, 0.8], [11.5, 0.7, 95.0], fireMat, false);
  interactiveObjects.push({
    id: 'lever_stage7_r3_b_fire',
    type: 'lever',
    mesh: leverR3FireB,
    bounds: new THREE.Box3().setFromCenterAndSize(leverR3FireB.position, new THREE.Vector3(2.5, 2.5, 2.5)),
    prompt: 'کشیدن اهرم عنصر شعله 🔥 (اتاق ۳ ب) (E)',
  });

  // Gate to Final Sanctuary (z = 120)
  const finalGateMesh = addBox([30, 8, 1.2], [0, 3.5, 120.0], stoneMat, true);
  const finalGateColliderIndex = colliders.length - 1;
  const finalGateDoor = new StatefulDoor(finalGateMesh, 3.5, -4.5, 6.0);

  // =========================================================================
  // 5. FINAL SANCTUARY (ROOM 4) (z: 120 to 170)
  // =========================================================================
  // Floor
  addBox([30, 1, 50], [0, -0.5, 145], lightWoodMat);
  // Outer Walls
  addBox([1, 8, 50], [-15, 3.5, 145], darkWoodMat);
  addBox([1, 8, 50], [15, 3.5, 145], darkWoodMat);

  // Symbol Above Entrance (Sun ☀️)
  addSymbolPlaque([0, 7.0, 120.3], sunRuneMat, 'Sun');

  // Visual Clue Banner for Final Sanctuary (Sun ☀️ -> Moon 🌙 -> Star ⭐ -> Heart ❤️)
  addClueBanner([0, 4.0, 126.0], 0, [sunRuneMat, moonRuneMat, starRuneMat, heartRuneMat]);

  // Final Hint Tablet
  const finalHintMesh = addBox([1.4, 2.0, 0.3], [0, 1.0, 126], goldMat, false);
  interactiveObjects.push({
    id: 'tablet_stage7_final_hint',
    type: 'lever',
    mesh: finalHintMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(finalHintMesh.position, new THREE.Vector3(2.5, 2.5, 2.5)),
    prompt: 'خواندن راهنمای معما نهایی تالار (E)',
  });

  // 4 Final Symbol Buttons (Target: Sun ☀️ -> Moon 🌙 -> Star ⭐ -> Heart ❤️)
  const btnFinalSun = createSymbolButton('btn_stage7_final_sun', 'خورشید ☀️', [-10.5, 0.2, 142.0], sunRuneMat);
  const btnFinalMoon = createSymbolButton('btn_stage7_final_moon', 'ماه 🌙', [-3.5, 0.2, 142.0], moonRuneMat);
  const btnFinalStar = createSymbolButton('btn_stage7_final_star', 'ستاره ⭐', [3.5, 0.2, 142.0], starRuneMat);
  const btnFinalHeart = createSymbolButton('btn_stage7_final_heart', 'قلب ❤️', [10.5, 0.2, 142.0], heartRuneMat);

  // Final Exit Gate (z = 160)
  const exitGateMesh = addBox([30, 8, 1.2], [0, 3.5, 160.0], stoneMat, true);
  const exitGateColliderIndex = colliders.length - 1;
  const exitGateDoor = new StatefulDoor(exitGateMesh, 3.5, -4.5, 6.0);

  // Exit Portal Base Ring & Pads (z = 166)
  const portalRingMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(3.0, 3.3, 0.3, 24),
    goldMat
  );
  portalRingMesh.position.set(0, 0.15, 166.0);
  rootGroup.add(portalRingMesh);

  const portalP1Mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.0, 0.2, 16),
    moonRuneMat
  );
  portalP1Mesh.position.set(-2.2, 0.25, 166.0);
  rootGroup.add(portalP1Mesh);

  const portalP2Mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.0, 0.2, 16),
    sunRuneMat
  );
  portalP2Mesh.position.set(2.2, 0.25, 166.0);
  rootGroup.add(portalP2Mesh);

  interactiveObjects.push({
    id: 'portal_p1_stage7',
    type: 'portal_pad',
    mesh: portalP1Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(portalP1Mesh.position, new THREE.Vector3(2, 2, 2)),
    prompt: 'ایستادن روی سکوی خروج نیوشا',
  });

  interactiveObjects.push({
    id: 'portal_p2_stage7',
    type: 'portal_pad',
    mesh: portalP2Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(portalP2Mesh.position, new THREE.Vector3(2, 2, 2)),
    prompt: 'ایستادن روی سکوی خروج حسن',
  });

  // Checkpoint Definitions
  const checkpoints = [
    { id: 0, pos: [0, 1, 3] as [number, number, number], active: true, mesh: tabletMesh },
    { id: 1, pos: [0, 1, 74] as [number, number, number], active: false, mesh: clue3Mesh },
    { id: 2, pos: [0, 1, 125] as [number, number, number], active: false, mesh: finalHintMesh },
  ];

  return {
    rootGroup,
    colliders,
    interactiveObjects,
    spawnPoint: [0, 1, 3],
    checkpoints,
    update: (dt: number, state: PuzzleState) => {
      const data = state.customData || {};

      // 1. Assignment Gates
      const assignA = !!data.stage7AssignedA;
      const assignB = !!data.stage7AssignedB;
      assignDoorA.setTarget(assignA);
      assignDoorB.setTarget(assignB);
      assignDoorA.update(dt);
      assignDoorB.update(dt);

      if (assignDoorA.state === 'Open') {
        colliders[assignGateAColliderIndex].setFromCenterAndSize(new THREE.Vector3(-7.5, -999, 0), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[assignGateAColliderIndex].setFromObject(assignGateAMesh);
      }

      if (assignDoorB.state === 'Open') {
        colliders[assignGateBColliderIndex].setFromCenterAndSize(new THREE.Vector3(7.5, -999, 0), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[assignGateBColliderIndex].setFromObject(assignGateBMesh);
      }

      // 2. Room 1 & 2 Reciprocal Exit Doors (Unlocked by opposing Levers)
      const door3AUnlocked = !!data.stage7Door3AUnlocked;
      const door3BUnlocked = !!data.stage7Door3BUnlocked;

      exitDoorA.setTarget(door3AUnlocked);
      exitDoorB.setTarget(door3BUnlocked);
      exitDoorA.update(dt);
      exitDoorB.update(dt);

      if (exitDoorA.state === 'Open') {
        colliders[exitGateAColliderIndex].setFromCenterAndSize(new THREE.Vector3(-7.75, -999, 0), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[exitGateAColliderIndex].setFromObject(exitGateAMesh);
      }

      if (exitDoorB.state === 'Open') {
        colliders[exitGateBColliderIndex].setFromCenterAndSize(new THREE.Vector3(7.75, -999, 0), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[exitGateBColliderIndex].setFromObject(exitGateBMesh);
      }

      // 3. Room 3 Center Lattice & Gate to Final Sanctuary
      const room3Solved = !!data.stage7Room3Solved;
      const doorFinalUnlocked = !!data.stage7DoorFinalUnlocked || room3Solved;

      room3CenterDoor.setTarget(room3Solved);
      room3CenterDoor.update(dt);
      if (room3CenterDoor.state === 'Open') {
        colliders[room3CenterWallColliderIndex].setFromCenterAndSize(new THREE.Vector3(0, -999, 0), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[room3CenterWallColliderIndex].setFromObject(room3CenterWallMesh);
      }

      finalGateDoor.setTarget(doorFinalUnlocked);
      finalGateDoor.update(dt);
      if (finalGateDoor.state === 'Open') {
        colliders[finalGateColliderIndex].setFromCenterAndSize(new THREE.Vector3(0, -999, 0), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[finalGateColliderIndex].setFromObject(finalGateMesh);
      }

      // 4. Final Exit Gate
      const finalSolved = !!data.stage7FinalSolved;
      const exitDoorUnlocked = !!data.stage7ExitDoorUnlocked || finalSolved;

      exitGateDoor.setTarget(exitDoorUnlocked);
      exitGateDoor.update(dt);
      if (exitGateDoor.state === 'Open') {
        colliders[exitGateColliderIndex].setFromCenterAndSize(new THREE.Vector3(0, -999, 0), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[exitGateColliderIndex].setFromObject(exitGateMesh);
      }

      // Visual Lever Animations & Button Glows
      const lever1Active = !!data.stage7Lever1Active;
      const lever2Active = !!data.stage7Lever2Active;
      lever1Mesh.rotation.z += ((lever1Active ? -0.5 : 0.5) - lever1Mesh.rotation.z) * Math.min(1, dt * 8);
      lever2Mesh.rotation.z += ((lever2Active ? -0.5 : 0.5) - lever2Mesh.rotation.z) * Math.min(1, dt * 8);

      // Portal Pads Glow
      const p1Ready = !!data.stage7ExitP1Ready;
      const p2Ready = !!data.stage7ExitP2Ready;
      (portalP1Mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = p1Ready ? 1.0 : 0.2;
      (portalP2Mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = p2Ready ? 1.0 : 0.2;
    },
    dispose: () => {
      rootGroup.clear();
    },
  };
}
