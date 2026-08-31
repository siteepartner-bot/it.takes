import * as THREE from 'three';
import type { PuzzleState } from '../../types.ts';
import type { StageBuildResult, InteractiveObject } from './gardenStage.ts';
import { StatefulDoor } from './campaignStages.ts';

/**
 * Stage 8: آخرین مسیر ما (Our Last Path) - Grand Finale of Hasan & Niwsha
 *
 * 5-Section Architecture:
 * 1. Shared Starting Path & Inscribed Entrance Door («Only together / تنها با یکدیگر»)
 * 2. The Last Separation (Independent Path Assignment, Reciprocal Information Puzzles, Reciprocal Levers)
 * 3. Final Information Puzzle (Chamber A Number Sequence + Chamber B Cipher Translation)
 * 4. Reuniting on the Celestial Bridge & Sanctuary Co-op Plates
 * 5. Grand Finale: Sanctuary of Eternity, Hasan ❤️ Niwsha Final Pedestals, Emotional Story Ending
 */
export function buildOurLastPathStage(): StageBuildResult {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'stage_our_last_path';

  const colliders: THREE.Box3[] = [];
  const interactiveObjects: InteractiveObject[] = [];

  // Lighting optimization for Stage 8: Ambient + key stage fill lights
  const ambLight = new THREE.AmbientLight(0xfffbeb, 1.2);
  rootGroup.add(ambLight);

  const dirLight = new THREE.DirectionalLight(0xfffaed, 0.8);
  dirLight.position.set(15, 35, 30);
  rootGroup.add(dirLight);

  // Key atmospheric stage lights (3 well-placed point lights instead of 25+)
  const pLight1 = new THREE.PointLight(0xf59e0b, 1.8, 30);
  pLight1.position.set(0, 5, 12);
  rootGroup.add(pLight1);

  const pLight2 = new THREE.PointLight(0x38bdf8, 1.8, 35);
  pLight2.position.set(0, 5, 68);
  rootGroup.add(pLight2);

  const pLight3 = new THREE.PointLight(0xf43f5e, 2.0, 35);
  pLight3.position.set(0, 5, 122);
  rootGroup.add(pLight3);

  // --- Materials with Celestial & Warm Temple Aesthetics ---
  const nightWoodMat = new THREE.MeshStandardMaterial({
    color: 0x3b1e08,
    roughness: 0.7,
    metalness: 0.1,
  });

  const bridgeWoodMat = new THREE.MeshStandardMaterial({
    color: 0x5c2b0e,
    roughness: 0.6,
    metalness: 0.1,
  });

  const celestialStoneMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.8,
    metalness: 0.4,
  });

  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xca8a04,
    emissiveIntensity: 0.6,
    metalness: 0.8,
    roughness: 0.2,
  });

  const warmLanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.2,
    roughness: 0.1,
  });

  const starRuneMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xeab308,
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });

  const moonRuneMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });

  const heartRuneMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xe11d48,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });

  const sunRuneMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });

  const flowerRuneMat = new THREE.MeshStandardMaterial({
    color: 0xec4899,
    emissive: 0xdb2777,
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });

  const flameRuneMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });

  const p1CyanMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.8,
    roughness: 0.3,
  });

  const p2EmeraldMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.8,
    roughness: 0.3,
  });

  // Helper function to create solid platform with collider
  const createPlatform = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material = nightWoodMat
  ) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rootGroup.add(mesh);

    const box = new THREE.Box3().setFromObject(mesh);
    colliders.push(box);
    return mesh;
  };

  // Helper function to create decorative warm lantern post (lightweight & beautiful)
  const createLantern = (x: number, y: number, z: number, scale = 1.0, hasLight = false) => {
    const postGeo = new THREE.CylinderGeometry(0.08 * scale, 0.1 * scale, 2.5 * scale, 8);
    const post = new THREE.Mesh(postGeo, goldTrimMat);
    post.position.set(x, y + 1.25 * scale, z);
    rootGroup.add(post);

    const lanternGeo = new THREE.BoxGeometry(0.4 * scale, 0.6 * scale, 0.4 * scale);
    const lantern = new THREE.Mesh(lanternGeo, warmLanternMat);
    lantern.position.set(x, y + 2.5 * scale, z);
    rootGroup.add(lantern);

    if (hasLight) {
      const pointLight = new THREE.PointLight(0xf59e0b, 1.5, 18 * scale);
      pointLight.position.set(x, y + 2.5 * scale, z);
      rootGroup.add(pointLight);
    }
  };

  // Helper to create glowing relic pedestals for previous stages
  const createRelicDisplay = (x: number, y: number, z: number, color: number, label: string) => {
    const baseGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.8, 16);
    const baseMesh = new THREE.Mesh(baseGeo, celestialStoneMat);
    baseMesh.position.set(x, y + 0.4, z);
    rootGroup.add(baseMesh);
    colliders.push(new THREE.Box3().setFromObject(baseMesh));

    const crystalMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.3,
    });
    const crystalGeo = new THREE.OctahedronGeometry(0.3, 0);
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.set(x, y + 1.1, z);
    crystal.rotation.y = Math.PI / 4;
    rootGroup.add(crystal);
  };

  // ==========================================
  // SECTION 1: SHARED STARTING PATH (Z: -2 to 24)
  // ==========================================
  // Main starting platform
  createPlatform(16, 1, 26, 0, 0, 11, bridgeWoodMat);

  // Side Railings for Section 1
  createPlatform(0.6, 1.2, 26, -8.1, 0.5, 11, celestialStoneMat);
  createPlatform(0.6, 1.2, 26, 8.1, 0.5, 11, celestialStoneMat);
  createPlatform(16, 1.2, 0.6, 0, 0.5, -2.1, celestialStoneMat);

  // Decorative Lanterns along starting path
  createLantern(-7.5, 1, 2);
  createLantern(7.5, 1, 2);
  createLantern(-7.5, 1, 12);
  createLantern(7.5, 1, 12);
  createLantern(-7.5, 1, 22);
  createLantern(7.5, 1, 22);

  // Nostalgic Stage Relics on starting walkway sides
  createRelicDisplay(-6.5, 1, 6, 0x10b981, 'باغ اسرارآمیز'); // Stage 1 Garden Green
  createRelicDisplay(6.5, 1, 6, 0x06b6d4, 'پل‌های آسمانی'); // Stage 2 Cyan
  createRelicDisplay(-6.5, 1, 16, 0xa855f7, 'اتاق‌های آینه‌ای'); // Stage 3 Mirror Violet
  createRelicDisplay(6.5, 1, 16, 0xf59e0b, 'تالار هماهنگی'); // Stage 4 Amber Gold

  // Start Welcome Lore Tablet
  const startTabletGeo = new THREE.BoxGeometry(1.2, 1.8, 0.4);
  const startTabletMesh = new THREE.Mesh(startTabletGeo, celestialStoneMat);
  startTabletMesh.position.set(0, 1.5, 3);
  rootGroup.add(startTabletMesh);
  colliders.push(new THREE.Box3().setFromObject(startTabletMesh));

  interactiveObjects.push({
    id: 'story_tablet_stage8_start',
    type: 'button',
    mesh: startTabletMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(startTabletMesh.position, new THREE.Vector3(2.5, 2.5, 2.5)),
    prompt: 'خواندن کتیبه آغازین فینال (کلید E)',
  });

  // Section 1 Entrance Archway at Z = 24 (Full Width Stone Wall spanning from X = -14 to +14)
  const archLeft = createPlatform(10.0, 8.0, 1.8, -9.0, 0, 24, celestialStoneMat);
  const archRight = createPlatform(10.0, 8.0, 1.8, 9.0, 0, 24, celestialStoneMat);
  const archTop = createPlatform(28.0, 2.5, 2.2, 0, 6.75, 24, celestialStoneMat);

  // Inscription Plaque: «Only together / تنها با یکدیگر»
  const plaqueGeo = new THREE.BoxGeometry(6, 1.2, 0.5);
  const plaqueMesh = new THREE.Mesh(plaqueGeo, goldTrimMat);
  plaqueMesh.position.set(0, 6.5, 22.8);
  rootGroup.add(plaqueMesh);

  // Section 1 Entry Door (Sliding Upwards, seamlessly fills the 8.0m doorway opening)
  const entryDoorGeo = new THREE.BoxGeometry(8.6, 6.5, 1.0);
  const entryDoorMesh = new THREE.Mesh(entryDoorGeo, nightWoodMat);
  entryDoorMesh.position.set(0, 3.25, 24);
  rootGroup.add(entryDoorMesh);

  const entryDoorColliderIndex = colliders.length;
  colliders.push(new THREE.Box3().setFromObject(entryDoorMesh));
  const entryStatefulDoor = new StatefulDoor(entryDoorMesh, 3.25, 10.5, 5.0);

  // 2 Entry Pressure Plates (Left & Right)
  const plateEntryAGeo = new THREE.CylinderGeometry(1.2, 1.3, 0.15, 24);
  const plateEntryAMesh = new THREE.Mesh(plateEntryAGeo, p1CyanMat);
  plateEntryAMesh.position.set(-3.2, 1.08, 21);
  rootGroup.add(plateEntryAMesh);

  interactiveObjects.push({
    id: 'plate_stage8_entry_a',
    type: 'pressure_plate',
    mesh: plateEntryAMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(plateEntryAMesh.position, new THREE.Vector3(2.4, 1.5, 2.4)),
    prompt: 'صفحه ورودی معبد (سمت راست - نیوشا)',
  });

  const plateEntryBGeo = new THREE.CylinderGeometry(1.2, 1.3, 0.15, 24);
  const plateEntryBMesh = new THREE.Mesh(plateEntryBGeo, p2EmeraldMat);
  plateEntryBMesh.position.set(3.2, 1.08, 21);
  rootGroup.add(plateEntryBMesh);

  interactiveObjects.push({
    id: 'plate_stage8_entry_b',
    type: 'pressure_plate',
    mesh: plateEntryBMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(plateEntryBMesh.position, new THREE.Vector3(2.4, 1.5, 2.4)),
    prompt: 'صفحه ورودی معبد (سمت چپ - حسن)',
  });

  // ==========================================
  // SECTION 2: THE LAST SEPARATION (Z: 25 to 54)
  // ==========================================
  // Floor for Chamber 1 (Path A & Path B)
  createPlatform(24, 1, 30, 0, 0, 39, nightWoodMat);

  // Outer Walls for Section 2
  createPlatform(1, 6, 30, -12, 0.5, 39, celestialStoneMat);
  createPlatform(1, 6, 30, 12, 0.5, 39, celestialStoneMat);

  // Central Dividing Wall (X = 0, Z = 25 to 54)
  createPlatform(1.2, 6, 30, 0, 0.5, 39, celestialStoneMat);

  // Wall Lanterns along dividing wall
  createLantern(-1.2, 2, 32, 0.8);
  createLantern(1.2, 2, 32, 0.8);
  createLantern(-1.2, 2, 42, 0.8);
  createLantern(1.2, 2, 42, 0.8);

  // Assignment Trigger Plates at entrance of Path A & Path B
  const plateAssignAGeo = new THREE.CylinderGeometry(1.0, 1.1, 0.12, 16);
  const plateAssignAMesh = new THREE.Mesh(plateAssignAGeo, goldTrimMat);
  plateAssignAMesh.position.set(-6, 1.06, 28);
  rootGroup.add(plateAssignAMesh);

  interactiveObjects.push({
    id: 'plate_stage8_assign_a',
    type: 'pressure_plate',
    mesh: plateAssignAMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(plateAssignAMesh.position, new THREE.Vector3(2.2, 1.5, 2.2)),
    prompt: 'ورود به مسیر A',
  });

  const plateAssignBGeo = new THREE.CylinderGeometry(1.0, 1.1, 0.12, 16);
  const plateAssignBMesh = new THREE.Mesh(plateAssignBGeo, goldTrimMat);
  plateAssignBMesh.position.set(6, 1.06, 28);
  rootGroup.add(plateAssignBMesh);

  interactiveObjects.push({
    id: 'plate_stage8_assign_b',
    type: 'pressure_plate',
    mesh: plateAssignBMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(plateAssignBMesh.position, new THREE.Vector3(2.2, 1.5, 2.2)),
    prompt: 'ورود به مسیر B',
  });

  // --- Path A (Left, X = -6 to -11): Wall Clue for Path B ---
  const tabletClueBGeo = new THREE.BoxGeometry(0.3, 2.2, 3.5);
  const tabletClueBMesh = new THREE.Mesh(tabletClueBGeo, celestialStoneMat);
  tabletClueBMesh.position.set(-1.0, 3.0, 38);
  rootGroup.add(tabletClueBMesh);

  interactiveObjects.push({
    id: 'tablet_stage8_clue_for_b',
    type: 'button',
    mesh: tabletClueBMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-3.5, 2.5, 38), new THREE.Vector3(4, 3, 4)),
    prompt: '📜 کتیبه دیوار A: راهنمای مسیر B هم‌تیمی (کلید E)',
  });

  // Path A Interactive Buttons (Target: Star ⭐ -> Moon 🌙 -> Heart ❤️)
  const createSymbolButton = (
    id: string,
    prompt: string,
    x: number,
    y: number,
    z: number,
    runeMat: THREE.Material
  ) => {
    const pedGeo = new THREE.CylinderGeometry(0.45, 0.55, 0.9, 16);
    const pedMesh = new THREE.Mesh(pedGeo, celestialStoneMat);
    pedMesh.position.set(x, y + 0.45, z);
    rootGroup.add(pedMesh);
    colliders.push(new THREE.Box3().setFromObject(pedMesh));

    const btnGeo = new THREE.BoxGeometry(0.6, 0.3, 0.6);
    const btnMesh = new THREE.Mesh(btnGeo, runeMat);
    btnMesh.position.set(x, y + 0.95, z);
    rootGroup.add(btnMesh);

    interactiveObjects.push({
      id,
      type: 'button',
      mesh: btnMesh,
      bounds: new THREE.Box3().setFromCenterAndSize(btnMesh.position, new THREE.Vector3(2.2, 2.2, 2.2)),
      prompt,
    });
    return btnMesh;
  };

  const btnAStar = createSymbolButton('btn_stage8_a_star', '⭐ فشردن نماد ستاره (مسیر A)', -9, 1, 36, starRuneMat);
  const btnAMoon = createSymbolButton('btn_stage8_a_moon', '🌙 فشردن نماد ماه (مسیر A)', -6, 1, 40, moonRuneMat);
  const btnAHeart = createSymbolButton('btn_stage8_a_heart', '❤️ فشردن نماد قلب (مسیر A)', -9, 1, 44, heartRuneMat);

  // Path A Exit Lever (Unlocks Door B for partner)
  const leverBaseAGeo = new THREE.BoxGeometry(0.8, 1.2, 0.8);
  const leverAMesh = new THREE.Mesh(leverBaseAGeo, goldTrimMat);
  leverAMesh.position.set(-6, 1.6, 48);
  rootGroup.add(leverAMesh);

  interactiveObjects.push({
    id: 'lever_stage8_a',
    type: 'lever',
    mesh: leverAMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(leverAMesh.position, new THREE.Vector3(2.5, 2.5, 2.5)),
    prompt: '⚙️ کشیدن اهرم مسیر A (باز کردن در هم‌تیمی)',
  });

  // --- Path B (Right, X = 6 to 11): Wall Clue for Path A ---
  const tabletClueAGeo = new THREE.BoxGeometry(0.3, 2.2, 3.5);
  const tabletClueAMesh = new THREE.Mesh(tabletClueAGeo, celestialStoneMat);
  tabletClueAMesh.position.set(1.0, 3.0, 38);
  rootGroup.add(tabletClueAMesh);

  interactiveObjects.push({
    id: 'tablet_stage8_clue_for_a',
    type: 'button',
    mesh: tabletClueAMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(3.5, 2.5, 38), new THREE.Vector3(4, 3, 4)),
    prompt: '📜 کتیبه دیوار B: راهنمای مسیر A هم‌تیمی (کلید E)',
  });

  // Path B Interactive Buttons (Target: Sun ☀️ -> Flower 🌸 -> Flame 🔥)
  const btnBSun = createSymbolButton('btn_stage8_b_sun', '☀️ فشردن نماد خورشید (مسیر B)', 9, 1, 36, sunRuneMat);
  const btnBFlower = createSymbolButton('btn_stage8_b_flower', '🌸 فشردن نماد گل (مسیر B)', 6, 1, 40, flowerRuneMat);
  const btnBFlame = createSymbolButton('btn_stage8_b_flame', '🔥 فشردن نماد شعله (مسیر B)', 9, 1, 44, flameRuneMat);

  // Path B Exit Lever (Unlocks Door A for partner)
  const leverBaseBGeo = new THREE.BoxGeometry(0.8, 1.2, 0.8);
  const leverBMesh = new THREE.Mesh(leverBaseBGeo, goldTrimMat);
  leverBMesh.position.set(6, 1.6, 48);
  rootGroup.add(leverBMesh);

  interactiveObjects.push({
    id: 'lever_stage8_b',
    type: 'lever',
    mesh: leverBMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(leverBMesh.position, new THREE.Vector3(2.5, 2.5, 2.5)),
    prompt: '⚙️ کشیدن اهرم مسیر B (باز کردن در هم‌تیمی)',
  });

  // Section 2 Exit Doorways at Z = 53.5 (Full airtight wall coverage across all 24m)
  // Left Chamber (Path A: X = -12 to 0)
  createPlatform(4.2, 7.5, 1.6, -9.9, 0.5, 53.5, celestialStoneMat);
  createPlatform(4.2, 7.5, 1.6, -2.1, 0.5, 53.5, celestialStoneMat);
  createPlatform(12.0, 2.5, 2.0, -6.0, 6.25, 53.5, celestialStoneMat);

  const doorAGeo = new THREE.BoxGeometry(4.0, 5.5, 1.0);
  const doorAMesh = new THREE.Mesh(doorAGeo, nightWoodMat);
  doorAMesh.position.set(-6, 3.25, 53.5);
  rootGroup.add(doorAMesh);

  const doorAColliderIndex = colliders.length;
  colliders.push(new THREE.Box3().setFromObject(doorAMesh));
  const statefulDoorA = new StatefulDoor(doorAMesh, 3.25, 9.5, 5.0);

  // Right Chamber (Path B: X = 0 to 12)
  createPlatform(4.2, 7.5, 1.6, 2.1, 0.5, 53.5, celestialStoneMat);
  createPlatform(4.2, 7.5, 1.6, 9.9, 0.5, 53.5, celestialStoneMat);
  createPlatform(12.0, 2.5, 2.0, 6.0, 6.25, 53.5, celestialStoneMat);

  const doorBGeo = new THREE.BoxGeometry(4.0, 5.5, 1.0);
  const doorBMesh = new THREE.Mesh(doorBGeo, nightWoodMat);
  doorBMesh.position.set(6, 3.25, 53.5);
  rootGroup.add(doorBMesh);

  const doorBColliderIndex = colliders.length;
  colliders.push(new THREE.Box3().setFromObject(doorBMesh));
  const statefulDoorB = new StatefulDoor(doorBMesh, 3.25, 9.5, 5.0);

  // ==========================================
  // SECTION 3: RECIPROCAL CIPHER CHAMBERS (Z: 55 to 80)
  // ==========================================
  // Floor for Chamber 2
  createPlatform(24, 1, 26, 0, 0, 67, bridgeWoodMat);

  // Outer Walls for Section 3
  createPlatform(1, 6, 26, -12, 0.5, 67, celestialStoneMat);
  createPlatform(1, 6, 26, 12, 0.5, 67, celestialStoneMat);

  // Full Mid Dividing Wall separating Chamber A and Chamber B (Z: 54 to 80)
  createPlatform(1.2, 6, 26, 0, 0.5, 67, celestialStoneMat);

  // --- Chamber A (Left side: X = -12 to 0) ---
  // Chamber A Wall Inscription: Shows Clue for Chamber B (Moon -> Heart -> Sun -> Star)
  const tabletChamberAGeo = new THREE.BoxGeometry(0.3, 2.4, 3.5);
  const tabletChamberAMesh = new THREE.Mesh(tabletChamberAGeo, celestialStoneMat);
  tabletChamberAMesh.position.set(-11.4, 3.0, 62);
  rootGroup.add(tabletChamberAMesh);

  interactiveObjects.push({
    id: 'tablet_stage8_chamber_a_hint',
    type: 'button',
    mesh: tabletChamberAMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-9, 2.5, 62), new THREE.Vector3(4, 3, 4)),
    prompt: '📜 کتیبه اتاق A: توالی نهایی نمادهای اتاق B: ماه 🌙 ← قلب ❤️ ← خورشید ☀️ ← ستاره ⭐ (کلید E)',
  });

  // 4 Symbol Buttons in Chamber A (Flame 🔥, Flower 🌸, Star ⭐, Sun ☀️)
  // Target Sequence for Chamber A (from Tablet B): Flame 🔥 -> Flower 🌸 -> Star ⭐ -> Sun ☀️
  const btnC3AFlame = createSymbolButton('btn_stage8_c3_a_flame', '🔥 فشردن نماد شعله (اتاق A)', -8, 1, 68, flameRuneMat);
  const btnC3AFlower = createSymbolButton('btn_stage8_c3_a_flower', '🌸 فشردن نماد گل (اتاق A)', -5, 1, 68, flowerRuneMat);
  const btnC3AStar = createSymbolButton('btn_stage8_c3_a_star', '⭐ فشردن نماد ستاره (اتاق A)', -8, 1, 74, starRuneMat);
  const btnC3ASun = createSymbolButton('btn_stage8_c3_a_sun', '☀️ فشردن نماد خورشید (اتاق A)', -5, 1, 74, sunRuneMat);

  // Chamber A Exit Lever (Unlocks Door 3B for partner in Chamber B)
  const leverC3AGeo = new THREE.BoxGeometry(0.8, 1.2, 0.8);
  const leverC3AMesh = new THREE.Mesh(leverC3AGeo, goldTrimMat);
  leverC3AMesh.position.set(-6, 1.6, 77);
  rootGroup.add(leverC3AMesh);

  interactiveObjects.push({
    id: 'lever_stage8_c3_a',
    type: 'lever',
    mesh: leverC3AMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(leverC3AMesh.position, new THREE.Vector3(2.5, 2.5, 2.5)),
    prompt: '⚙️ کشیدن اهرم اتاق ۳ الف (فقط باز کردن در خروج هم‌تیمی در اتاق ۳ ب)',
  });

  // --- Chamber B (Right side: X = 0 to 12) ---
  // Chamber B Wall Inscription: Shows Clue for Chamber A (Flame -> Flower -> Star -> Sun)
  const tabletChamberBGeo = new THREE.BoxGeometry(0.3, 2.4, 3.5);
  const tabletChamberBMesh = new THREE.Mesh(tabletChamberBGeo, celestialStoneMat);
  tabletChamberBMesh.position.set(11.4, 3.0, 62);
  rootGroup.add(tabletChamberBMesh);

  interactiveObjects.push({
    id: 'tablet_stage8_chamber_b_hint',
    type: 'button',
    mesh: tabletChamberBMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(9, 2.5, 62), new THREE.Vector3(4, 3, 4)),
    prompt: '📜 کتیبه اتاق B: توالی نهایی نمادهای اتاق A: شعله 🔥 ← گل 🌸 ← ستاره ⭐ ← خورشید ☀️ (کلید E)',
  });

  // 4 Symbol Buttons in Chamber B (Moon 🌙, Heart ❤️, Sun ☀️, Star ⭐)
  // Target Sequence for Chamber B (from Tablet A): Moon 🌙 -> Heart ❤️ -> Sun ☀️ -> Star ⭐
  const btnC3BMoon = createSymbolButton('btn_stage8_c3_b_moon', '🌙 فشردن نماد ماه (اتاق B)', 5, 1, 68, moonRuneMat);
  const btnC3BHeart = createSymbolButton('btn_stage8_c3_b_heart', '❤️ فشردن نماد قلب (اتاق B)', 8, 1, 68, heartRuneMat);
  const btnC3BSun = createSymbolButton('btn_stage8_c3_b_sun', '☀️ فشردن نماد خورشید (اتاق B)', 5, 1, 74, sunRuneMat);
  const btnC3BStar = createSymbolButton('btn_stage8_c3_b_star', '⭐ فشردن نماد ستاره (اتاق B)', 8, 1, 74, starRuneMat);

  // Chamber B Exit Lever (Unlocks Door 3A for partner in Chamber A)
  const leverC3BGeo = new THREE.BoxGeometry(0.8, 1.2, 0.8);
  const leverC3BMesh = new THREE.Mesh(leverC3BGeo, goldTrimMat);
  leverC3BMesh.position.set(6, 1.6, 77);
  rootGroup.add(leverC3BMesh);

  interactiveObjects.push({
    id: 'lever_stage8_c3_b',
    type: 'lever',
    mesh: leverC3BMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(leverC3BMesh.position, new THREE.Vector3(2.5, 2.5, 2.5)),
    prompt: '⚙️ کشیدن اهرم اتاق ۳ ب (فقط باز کردن در خروج هم‌تیمی در اتاق ۳ الف)',
  });

  // --- Two Separate Exit Doors at Z = 80 (Full airtight wall coverage across all 24m) ---
  // Chamber A Exit Wall & Door (X = -12 to 0)
  createPlatform(4.2, 7.5, 1.6, -9.9, 0.5, 80, celestialStoneMat);
  createPlatform(4.2, 7.5, 1.6, -2.1, 0.5, 80, celestialStoneMat);
  createPlatform(12.0, 2.5, 2.0, -6.0, 6.25, 80, celestialStoneMat);

  const door3AGeo = new THREE.BoxGeometry(4.0, 5.5, 1.0);
  const door3AMesh = new THREE.Mesh(door3AGeo, nightWoodMat);
  door3AMesh.position.set(-6, 3.25, 80);
  rootGroup.add(door3AMesh);

  const door3AColliderIndex = colliders.length;
  colliders.push(new THREE.Box3().setFromObject(door3AMesh));
  const statefulDoor3A = new StatefulDoor(door3AMesh, 3.25, 9.5, 5.0);

  // Chamber B Exit Wall & Door (X = 0 to 12)
  createPlatform(4.2, 7.5, 1.6, 2.1, 0.5, 80, celestialStoneMat);
  createPlatform(4.2, 7.5, 1.6, 9.9, 0.5, 80, celestialStoneMat);
  createPlatform(12.0, 2.5, 2.0, 6.0, 6.25, 80, celestialStoneMat);

  const door3BGeo = new THREE.BoxGeometry(4.0, 5.5, 1.0);
  const door3BMesh = new THREE.Mesh(door3BGeo, nightWoodMat);
  door3BMesh.position.set(6, 3.25, 80);
  rootGroup.add(door3BMesh);

  const door3BColliderIndex = colliders.length;
  colliders.push(new THREE.Box3().setFromObject(door3BMesh));
  const statefulDoor3B = new StatefulDoor(door3BMesh, 3.25, 9.5, 5.0);

  // ==========================================
  // SECTION 4: REUNITING ON CELESTIAL BRIDGE (Z: 81 to 108)
  // ==========================================
  // Celestial Walkway Platform
  createPlatform(10, 1, 28, 0, 0, 94, bridgeWoodMat);

  // Side Railings
  createPlatform(0.5, 1.2, 28, -5.1, 0.5, 94, celestialStoneMat);
  createPlatform(0.5, 1.2, 28, 5.1, 0.5, 94, celestialStoneMat);

  // Floating Lanterns along Celestial Walkway
  createLantern(-4.5, 1, 86);
  createLantern(4.5, 1, 86);
  createLantern(-4.5, 1, 96);
  createLantern(4.5, 1, 96);
  createLantern(-4.5, 1, 104);
  createLantern(4.5, 1, 104);

  // Sanctuary Co-op Plates (Left & Right) before Final Sanctuary
  const plateSancAGeo = new THREE.CylinderGeometry(1.2, 1.3, 0.15, 24);
  const plateSancAMesh = new THREE.Mesh(plateSancAGeo, p1CyanMat);
  plateSancAMesh.position.set(-2.5, 1.08, 102);
  rootGroup.add(plateSancAMesh);

  interactiveObjects.push({
    id: 'plate_stage8_sanctuary_a',
    type: 'pressure_plate',
    mesh: plateSancAMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(plateSancAMesh.position, new THREE.Vector3(2.4, 1.5, 2.4)),
    prompt: 'صفحه پایانی پیوند (نیوشا)',
  });

  const plateSancBGeo = new THREE.CylinderGeometry(1.2, 1.3, 0.15, 24);
  const plateSancBMesh = new THREE.Mesh(plateSancBGeo, p2EmeraldMat);
  plateSancBMesh.position.set(2.5, 1.08, 102);
  rootGroup.add(plateSancBMesh);

  interactiveObjects.push({
    id: 'plate_stage8_sanctuary_b',
    type: 'pressure_plate',
    mesh: plateSancBMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(plateSancBMesh.position, new THREE.Vector3(2.4, 1.5, 2.4)),
    prompt: 'صفحه پایانی پیوند (حسن)',
  });

  // Sanctuary Arch & Final Gate at Z = 106 (Full width airtight wall spanning from X = -10.5 to +10.5)
  createPlatform(8.0, 8.0, 2.0, -6.5, 0, 106, celestialStoneMat);
  createPlatform(8.0, 8.0, 2.0, 6.5, 0, 106, celestialStoneMat);
  createPlatform(21.0, 2.5, 2.2, 0, 6.75, 106, celestialStoneMat);

  const sancDoorGeo = new THREE.BoxGeometry(5.4, 5.5, 1.0);
  const sancDoorMesh = new THREE.Mesh(sancDoorGeo, nightWoodMat);
  sancDoorMesh.position.set(0, 2.75, 106);
  rootGroup.add(sancDoorMesh);

  const sancDoorColliderIndex = colliders.length;
  colliders.push(new THREE.Box3().setFromObject(sancDoorMesh));
  const statefulSancDoor = new StatefulDoor(sancDoorMesh, 2.75, 9.0, 5.0);

  // ==========================================
  // SECTION 5: SANCTUARY OF ETERNITY & FINALE (Z: 108 to 136)
  // ==========================================
  // Grand Circular Pavilion Base
  const pavilionGeo = new THREE.CylinderGeometry(12, 13, 1, 32);
  const pavilionMesh = new THREE.Mesh(pavilionGeo, celestialStoneMat);
  pavilionMesh.position.set(0, 0.5, 122);
  rootGroup.add(pavilionMesh);
  colliders.push(new THREE.Box3().setFromObject(pavilionMesh));

  // Golden Inner Circle
  const innerCircleGeo = new THREE.CylinderGeometry(8, 8.2, 0.2, 32);
  const innerCircleMesh = new THREE.Mesh(innerCircleGeo, goldTrimMat);
  innerCircleMesh.position.set(0, 1.1, 122);
  rootGroup.add(innerCircleMesh);

  // Surrounding Celestial Pillars with warm fire torches
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
    const px = Math.cos(angle) * 10.5;
    const pz = 122 + Math.sin(angle) * 10.5;
    createLantern(px, 1, pz, 1.2);
  }

  // Two Final Marked Spots for Hasan & Niwsha at Z = 122
  const portalP1Geo = new THREE.CylinderGeometry(1.4, 1.5, 0.25, 24);
  const portalP1Mesh = new THREE.Mesh(portalP1Geo, p1CyanMat);
  portalP1Mesh.position.set(-2.6, 1.22, 122);
  rootGroup.add(portalP1Mesh);

  const portalP2Geo = new THREE.CylinderGeometry(1.4, 1.5, 0.25, 24);
  const portalP2Mesh = new THREE.Mesh(portalP2Geo, p2EmeraldMat);
  portalP2Mesh.position.set(2.6, 1.22, 122);
  rootGroup.add(portalP2Mesh);

  // Final Zone / Portal Pads
  interactiveObjects.push({
    id: 'portal_p1_stage8',
    type: 'portal_pad',
    mesh: portalP1Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(portalP1Mesh.position, new THREE.Vector3(2.8, 2.0, 2.8)),
    prompt: 'ایستادن در جایگاه پایانی نیوشا',
  });

  interactiveObjects.push({
    id: 'portal_p2_stage8',
    type: 'portal_pad',
    mesh: portalP2Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(portalP2Mesh.position, new THREE.Vector3(2.8, 2.0, 2.8)),
    prompt: 'ایستادن در جایگاه پایانی حسن',
  });

  // Glowing Heart Inscription Sculpture in Center
  const heartGeo = new THREE.SphereGeometry(0.8, 16, 16);
  const heartMesh = new THREE.Mesh(heartGeo, heartRuneMat);
  heartMesh.position.set(0, 2.5, 122);
  rootGroup.add(heartMesh);

  // 3 Strategic Checkpoints
  const checkpoints = [
    { id: 0, pos: [0, 1, 1] as [number, number, number], active: true, mesh: startTabletMesh },
    { id: 1, pos: [0, 1, 56] as [number, number, number], active: false, mesh: tabletChamberAMesh },
    { id: 2, pos: [0, 1, 82] as [number, number, number], active: false, mesh: door3AMesh },
  ];

  return {
    rootGroup,
    colliders,
    interactiveObjects,
    spawnPoint: [0, 1, 1],
    checkpoints,
    update: (dt: number, state: PuzzleState) => {
      const customData = state.customData || {};

      // 1. Entrance Door (Permanent Unlock)
      const entryUnlocked = !!customData.stage8EntryUnlocked;
      entryStatefulDoor.setTarget(entryUnlocked);
      entryStatefulDoor.update(dt);
      if (entryUnlocked || entryStatefulDoor.state === 'Open') {
        colliders[entryDoorColliderIndex].setFromCenterAndSize(new THREE.Vector3(0, -999, 0), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[entryDoorColliderIndex].setFromObject(entryDoorMesh);
      }

      // 2. Door A & Door B (Reciprocal Levers Section 2, Permanent Unlock)
      const doorAUnlocked = !!customData.stage8DoorAUnlocked;
      statefulDoorA.setTarget(doorAUnlocked);
      statefulDoorA.update(dt);
      if (doorAUnlocked || statefulDoorA.state === 'Open') {
        colliders[doorAColliderIndex].setFromCenterAndSize(new THREE.Vector3(-6, -999, 53.5), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[doorAColliderIndex].setFromObject(doorAMesh);
      }

      const doorBUnlocked = !!customData.stage8DoorBUnlocked;
      statefulDoorB.setTarget(doorBUnlocked);
      statefulDoorB.update(dt);
      if (doorBUnlocked || statefulDoorB.state === 'Open') {
        colliders[doorBColliderIndex].setFromCenterAndSize(new THREE.Vector3(6, -999, 53.5), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[doorBColliderIndex].setFromObject(doorBMesh);
      }

      // 3. Section 3 Reciprocal Doors: Door 3A (for Chamber A) & Door 3B (for Chamber B)
      // Door 3A is unlocked ONLY when partner in Chamber B solves and pulls Lever 3B!
      const door3AUnlocked = !!customData.stage8Door3AUnlocked;
      statefulDoor3A.setTarget(door3AUnlocked);
      statefulDoor3A.update(dt);
      if (door3AUnlocked || statefulDoor3A.state === 'Open') {
        colliders[door3AColliderIndex].setFromCenterAndSize(new THREE.Vector3(-6, -999, 80), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[door3AColliderIndex].setFromObject(door3AMesh);
      }

      // Door 3B is unlocked ONLY when partner in Chamber A solves and pulls Lever 3A!
      const door3BUnlocked = !!customData.stage8Door3BUnlocked;
      statefulDoor3B.setTarget(door3BUnlocked);
      statefulDoor3B.update(dt);
      if (door3BUnlocked || statefulDoor3B.state === 'Open') {
        colliders[door3BColliderIndex].setFromCenterAndSize(new THREE.Vector3(6, -999, 80), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[door3BColliderIndex].setFromObject(door3BMesh);
      }

      // 4. Sanctuary Gate (Co-op Plates, Permanent Unlock)
      const sanctuaryUnlocked = !!customData.stage8SanctuaryUnlocked;
      statefulSancDoor.setTarget(sanctuaryUnlocked);
      statefulSancDoor.update(dt);
      if (sanctuaryUnlocked || statefulSancDoor.state === 'Open') {
        colliders[sancDoorColliderIndex].setFromCenterAndSize(new THREE.Vector3(0, -999, 106), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[sancDoorColliderIndex].setFromObject(sancDoorMesh);
      }

      // Heart pulsation animation in final sanctuary
      const t = performance.now() * 0.003;
      const pulseScale = 1.0 + Math.sin(t) * 0.08;
      heartMesh.scale.set(pulseScale, pulseScale, pulseScale);
      heartMesh.rotation.y += dt * 0.5;

      // Exit Pad Emissives
      const p1Ready = !!customData.stage8ExitP1Ready;
      const p2Ready = !!customData.stage8ExitP2Ready;
      (portalP1Mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = p1Ready ? 1.5 : 0.4;
      (portalP2Mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = p2Ready ? 1.5 : 0.4;
    },
    dispose: () => {
      rootGroup.clear();
    },
  };
}
