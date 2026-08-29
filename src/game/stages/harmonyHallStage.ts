import * as THREE from 'three';
import type { PuzzleState } from '../../types.ts';
import type { StageBuildResult, InteractiveObject } from './gardenStage.ts';
import { StatefulDoor } from './campaignStages.ts';

/**
 * Stage 4: Hall of Harmony (تالار هماهنگی)
 * 
 * Features & Fixes:
 * 1. Part 1: Synchronized Button Teaching (2 buttons 15m apart, 2.5s time window required)
 * 2. Part 2: Dual Paths (Co-op cross help with timed doors)
 *    - Full solid floor from z: 18 to 56 so opening Door 1 NEVER drops player into a hole.
 *    - Full-wall grand door structures (5.2m x 5.4m doors, 8.2m high solid wall headers) that completely seal doorways when closed.
 *    - Exit Door 3 is 100% closed and sealed at start until main harmony puzzle is solved.
 * 3. Part 3: Main Harmony Puzzle & Floating Energy Platforms
 *    - High-contrast, glowing crystal energy platforms across the chasm (Cyan for Nyusha, Emerald for Hassan).
 *    - Prominent, glowing 3D standing pads with rings and beacon posts so players clearly know where to stand.
 * 4. Part 4: Shared Exit Zone with Portal Pad
 */
export function buildHarmonyHallStage(): StageBuildResult {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'stage_4_hall_of_harmony';

  const colliders: THREE.Box3[] = [];
  const interactiveObjects: InteractiveObject[] = [];

  // --- Materials ---
  const templeStoneMat = new THREE.MeshStandardMaterial({
    color: 0x292524,
    roughness: 0.85,
    metalness: 0.15,
  });

  const woodenPlankMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.6,
    metalness: 0.1,
  });

  const carvedWallMat = new THREE.MeshStandardMaterial({
    color: 0x44403c,
    roughness: 0.8,
    metalness: 0.2,
  });

  const brassGearMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.35,
    metalness: 0.85,
  });

  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xca8a04,
    emissiveIntensity: 0.4,
    roughness: 0.3,
    metalness: 0.8,
  });

  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x311303,
    roughness: 0.5,
    metalness: 0.4,
  });

  const doorFrameMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.4,
    metalness: 0.8,
  });

  // High-Contrast Cyan Energy Material (Nyusha / Platform A)
  const runeMatA = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });

  // High-Contrast Emerald Energy Material (Hassan / Platform B)
  const runeMatB = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });

  const ceilingMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.9,
    metalness: 0.1,
  });

  // Status Gem Materials (Red = Locked, Green = Unlocked)
  const gemLockedMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xd97706,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });

  const gemUnlockedMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x15803d,
    emissiveIntensity: 1.0,
    roughness: 0.2,
  });

  // Helper function to build solid boxes and register colliders
  const helperAddBox = (size: [number, number, number], pos: [number, number, number], mat: THREE.Material): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
    mesh.position.set(...pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rootGroup.add(mesh);
    colliders.push(new THREE.Box3().setFromObject(mesh));
    return mesh;
  };

  // Decorative gear generator
  const gearsList: THREE.Mesh[] = [];
  const createGear = (radius: number, thickness: number, pos: [number, number, number], rotX = 0, rotZ = 0) => {
    const gearGroup = new THREE.Group();
    gearGroup.position.set(...pos);
    gearGroup.rotation.x = rotX;
    gearGroup.rotation.z = rotZ;

    const mainDisc = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, thickness, 16), brassGearMat);
    gearGroup.add(mainDisc);

    const teethCount = 8;
    for (let i = 0; i < teethCount; i++) {
      const angle = (i / teethCount) * Math.PI * 2;
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.4, thickness * 1.1, radius * 0.4), goldTrimMat);
      tooth.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      tooth.rotation.y = -angle;
      gearGroup.add(tooth);
    }

    rootGroup.add(gearGroup);
    gearsList.push(mainDisc);
    return gearGroup;
  };

  // Decorative wall gears
  createGear(2.5, 0.4, [-10.4, 4, 8], 0, Math.PI / 2);
  createGear(2.5, 0.4, [10.4, 4, 8], 0, Math.PI / 2);
  createGear(3.0, 0.5, [-11.8, 3, 65], 0, Math.PI / 2);
  createGear(3.0, 0.5, [11.8, 3, 65], 0, Math.PI / 2);

  /**
   * Full-Coverage Grand Archway Helper
   * Builds a full-height (8.2m) wall with a precise 4.8m wide x 5.0m high doorway cutout.
   * Solid stone upper header (y: 5.0 to 8.2) ensures ZERO open gap above the door!
   */
  const createFullWallArchway = (
    centerX: number,
    centerZ: number,
    openingWidth: number = 4.8,
    openingHeight: number = 5.0,
    wallWidth: number = 22.0
  ) => {
    const wallThickness = 1.4;
    const wallHeight = 8.2;
    const sideWallWidth = (wallWidth - openingWidth) / 2;

    // Left wall section (from edge to door opening)
    helperAddBox(
      [sideWallWidth, wallHeight, wallThickness],
      [centerX - openingWidth / 2 - sideWallWidth / 2, wallHeight / 2, centerZ],
      carvedWallMat
    );

    // Right wall section (from door opening to edge)
    helperAddBox(
      [sideWallWidth, wallHeight, wallThickness],
      [centerX + openingWidth / 2 + sideWallWidth / 2, wallHeight / 2, centerZ],
      carvedWallMat
    );

    // Solid upper header stone wall above doorway (y: 5.0 to 8.2) - COMPLETELY SEALS ROOM TOP!
    const headerHeight = wallHeight - openingHeight;
    helperAddBox(
      [openingWidth + 0.8, headerHeight, wallThickness],
      [centerX, openingHeight + headerHeight / 2, centerZ],
      carvedWallMat
    );

    // Heavy framing pillars on doorway sides
    const pillarLeft = new THREE.Mesh(new THREE.BoxGeometry(0.7, wallHeight, wallThickness + 0.5), doorFrameMat);
    pillarLeft.position.set(centerX - openingWidth / 2 - 0.35, wallHeight / 2, centerZ);
    rootGroup.add(pillarLeft);

    const pillarRight = new THREE.Mesh(new THREE.BoxGeometry(0.7, wallHeight, wallThickness + 0.5), doorFrameMat);
    pillarRight.position.set(centerX + openingWidth / 2 + 0.35, wallHeight / 2, centerZ);
    rootGroup.add(pillarRight);

    // Decorative Gold Lintel Arch
    const lintelBeam = new THREE.Mesh(new THREE.BoxGeometry(openingWidth + 1.2, 0.4, wallThickness + 0.6), goldTrimMat);
    lintelBeam.position.set(centerX, openingHeight + 0.2, centerZ);
    rootGroup.add(lintelBeam);

    // Status Gem above doorway
    const gemGeo = new THREE.SphereGeometry(0.45, 16, 16);
    const gemMesh = new THREE.Mesh(gemGeo, gemLockedMat);
    gemMesh.position.set(centerX, openingHeight + 0.8, centerZ + wallThickness / 2 + 0.1);
    rootGroup.add(gemMesh);

    return { gemMesh };
  };

  // =========================================================================
  // 1. PART 1: ENTRANCE HALL & SYNCHRONIZED BUTTON TEACHING (z: -3 to 18)
  // =========================================================================
  // Floor (covers z: -3 to 18)
  helperAddBox([22, 1, 21], [0, -0.5, 7.5], woodenPlankMat);
  // Ceiling
  helperAddBox([22, 1, 21], [0, 8.2, 7.5], ceilingMat);
  // Outer Back & Side Walls
  helperAddBox([22, 8, 1.2], [0, 4, -2.4], carvedWallMat);
  helperAddBox([1.2, 8, 21], [-10.4, 4, 7.5], carvedWallMat);
  helperAddBox([1.2, 8, 21], [10.4, 4, 7.5], carvedWallMat);

  // Story Lore Tablet
  const tabletGeo = new THREE.BoxGeometry(1.2, 1.8, 0.2);
  const tabletMesh = new THREE.Mesh(tabletGeo, goldTrimMat);
  tabletMesh.position.set(-6, 1.2, 2);
  rootGroup.add(tabletMesh);

  interactiveObjects.push({
    id: 'story_tablet_stage4',
    type: 'lever',
    mesh: tabletMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-6, 1.2, 2), new THREE.Vector3(2.5, 2, 2.5)),
    prompt: 'خواندن کتیبه تالار هماهنگی (کلید E)',
  });

  // Part 1 Sync Buttons (15 meters apart)
  const syncBtnGeo = new THREE.CylinderGeometry(1.4, 1.6, 0.25, 16);
  
  // Button A (Nyusha - Cyan)
  const syncBtnAMesh = new THREE.Mesh(syncBtnGeo, runeMatA);
  syncBtnAMesh.position.set(-7.5, 0.125, 10);
  rootGroup.add(syncBtnAMesh);
  interactiveObjects.push({
    id: 'button_sync_1a',
    type: 'pressure_plate',
    mesh: syncBtnAMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(syncBtnAMesh.position, new THREE.Vector3(2.5, 1.5, 2.5)),
    prompt: 'ایستادن روی دکمه هماهنگی نیوشا (همزمان با هم‌تیمی)',
  });

  // Button B (Hassan - Emerald)
  const syncBtnBMesh = new THREE.Mesh(syncBtnGeo, runeMatB);
  syncBtnBMesh.position.set(7.5, 0.125, 10);
  rootGroup.add(syncBtnBMesh);
  interactiveObjects.push({
    id: 'button_sync_1b',
    type: 'pressure_plate',
    mesh: syncBtnBMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(syncBtnBMesh.position, new THREE.Vector3(2.5, 1.5, 2.5)),
    prompt: 'ایستادن روی دکمه هماهنگی حسن (همزمان با هم‌تیمی)',
  });

  // --- Door 1 Archway & Full Coverage Vault Gate at z: 18 ---
  const arch1 = createFullWallArchway(0, 18, 4.8, 5.0, 22.0);

  // Door 1 Mesh (5.2m wide x 5.4m tall x 1.0m thick -> COMPLETELY SEALS ARCHWAY WHEN CLOSED)
  const door1Mesh = new THREE.Mesh(new THREE.BoxGeometry(5.2, 5.4, 1.0), doorMat);
  door1Mesh.position.set(0, 2.7, 18);
  door1Mesh.castShadow = true;
  rootGroup.add(door1Mesh);

  // Door 1 Bronze Reinforcement Trim & Medallion
  const door1Trim = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.4, 1.1), goldTrimMat);
  door1Trim.position.set(0, 0, 0);
  door1Mesh.add(door1Trim);

  const door1CenterRune = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.2, 16), brassGearMat);
  door1CenterRune.rotation.x = Math.PI / 2;
  door1CenterRune.position.set(0, 0, 0);
  door1Mesh.add(door1CenterRune);

  const door1ColliderIndex = colliders.length;
  const door1Collider = new THREE.Box3().setFromObject(door1Mesh);
  colliders.push(door1Collider);

  const statefulDoor1 = new StatefulDoor(door1Mesh, 2.7, 8.2, 5.0);

  // =========================================================================
  // 2. PART 2: VESTIBULE & DUAL PATHS (z: 18 to 48)
  // =========================================================================
  // 100% SOLID UNIFIED FLOOR from z: 18 to z: 56 across full width!
  // PREVENTS ANY HOLE OR FALLING WHEN OPENING DOOR 1!
  helperAddBox([22, 1, 38], [0, -0.5, 37], woodenPlankMat);

  // Ceiling over Part 2 & 3 (z: 18 to 90)
  helperAddBox([22, 1, 72], [0, 8.2, 54], ceilingMat);

  // Central Solid Dividing Wall (z: 26 to 48)
  helperAddBox([1.5, 8, 22], [0, 4, 37], carvedWallMat);
  // Outer Side Walls
  helperAddBox([1.2, 8, 30], [-11.0, 4, 33], carvedWallMat);
  helperAddBox([1.2, 8, 30], [11.0, 4, 33], carvedWallMat);

  // Path A Lever A1 (at x: -5.875, z: 28) - Opens Timed Door B
  const leverBaseGeo = new THREE.BoxGeometry(0.8, 1.2, 0.8);
  const leverA1Mesh = new THREE.Mesh(leverBaseGeo, runeMatA);
  leverA1Mesh.position.set(-5.875, 0.6, 28);
  rootGroup.add(leverA1Mesh);
  interactiveObjects.push({
    id: 'lever_dual_a',
    type: 'lever',
    mesh: leverA1Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(leverA1Mesh.position, new THREE.Vector3(2.5, 2, 2.5)),
    prompt: 'فعال‌سازی اهرم زمان‌دار برای گشودن دروازه هم‌تیمی (کلید E)',
  });

  // Path B Lever B1 (at x: 5.875, z: 42) - Opens Timed Door A
  const leverB1Mesh = new THREE.Mesh(leverBaseGeo, runeMatB);
  leverB1Mesh.position.set(5.875, 0.6, 42);
  rootGroup.add(leverB1Mesh);
  interactiveObjects.push({
    id: 'lever_dual_b',
    type: 'lever',
    mesh: leverB1Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(leverB1Mesh.position, new THREE.Vector3(2.5, 2, 2.5)),
    prompt: 'فعال‌سازی اهرم زمان‌دار برای گشودن دروازه هم‌تیمی (کلید E)',
  });

  // Timed Door Partition Walls & Archways at z: 38
  // Path A Timed Door (5.2m wide x 5.4m tall door in a 10m wall segment)
  const archA = createFullWallArchway(-5.875, 38, 4.4, 5.0, 10.2);
  const doorAMesh = new THREE.Mesh(new THREE.BoxGeometry(4.8, 5.4, 1.0), doorMat);
  doorAMesh.position.set(-5.875, 2.7, 38);
  doorAMesh.castShadow = true;
  rootGroup.add(doorAMesh);

  const doorAColliderIndex = colliders.length;
  const doorACollider = new THREE.Box3().setFromObject(doorAMesh);
  colliders.push(doorACollider);

  const statefulDoorA = new StatefulDoor(doorAMesh, 2.7, 8.2, 5.0);

  // Path B Timed Door
  const archB = createFullWallArchway(5.875, 38, 4.4, 5.0, 10.2);
  const doorBMesh = new THREE.Mesh(new THREE.BoxGeometry(4.8, 5.4, 1.0), doorMat);
  doorBMesh.position.set(5.875, 2.7, 38);
  doorBMesh.castShadow = true;
  rootGroup.add(doorBMesh);

  const doorBColliderIndex = colliders.length;
  const doorBCollider = new THREE.Box3().setFromObject(doorBMesh);
  colliders.push(doorBCollider);

  const statefulDoorB = new StatefulDoor(doorBMesh, 2.7, 8.2, 5.0);

  // =========================================================================
  // 3. PART 3: GRAND HARMONY PUZZLE & HIGH-CONTRAST FLOATING BRIDGES (z: 48 to 90)
  // =========================================================================
  // Chasm Pit (z: 56 to 78, depth y: -9.5)
  helperAddBox([26, 1, 22], [0, -9.5, 67], templeStoneMat);
  createGear(4.0, 0.6, [-5, -3, 67], Math.PI / 2, 0);
  createGear(4.0, 0.6, [5, -3, 67], Math.PI / 2, 0);

  // --- CLEAR STANDING INDICATOR PEDESTALS & DOCKING PADS AT CHASM EDGE ---
  // Entrance Docking Pads (z: 55.5) - Prominent, elevated 3D Standing Pedestals
  const createDockingPedestal = (x: number, z: number, colorMat: THREE.MeshStandardMaterial, labelText: string) => {
    const group = new THREE.Group();
    group.position.set(x, 0.05, z);

    // Raised Base Pedestal
    const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.15, 32), goldTrimMat);
    group.add(baseMesh);

    // Glowing Inner Ring
    const innerRing = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.18, 32), colorMat);
    group.add(innerRing);

    // Standing Spot Footprint Target Center
    const centerSpot = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.22, 16), brassGearMat);
    group.add(centerSpot);

    // Corner Light Posts so player sees docking spot clearly from afar
    const postGeo = new THREE.CylinderGeometry(0.1, 0.12, 1.0, 12);
    const postMat = doorFrameMat;
    const offsets = [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]];

    for (const [ox, oz] of offsets) {
      const p = new THREE.Mesh(postGeo, postMat);
      p.position.set(ox, 0.5, oz);
      group.add(p);

      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), colorMat);
      orb.position.set(ox, 1.0, oz);
      group.add(orb);
    }

    rootGroup.add(group);
  };

  // Docking Pedestals at Entrance (z: 55.5)
  createDockingPedestal(-5.875, 55.5, runeMatA, 'محل ایستادن نیوشا');
  createDockingPedestal(5.875, 55.5, runeMatB, 'محل ایستادن حسن');

  // Docking Pedestals at Destination (z: 78.5)
  createDockingPedestal(-5.875, 78.5, runeMatA, 'مقصد نیوشا');
  createDockingPedestal(5.875, 78.5, runeMatB, 'مقصد حسن');

  // --- HIGH-CONTRAST FLOATING ENERGY BRIDGES / MOVING PLATFORMS ---
  const createFloatingBridgePlatform = (colorMat: THREE.MeshStandardMaterial, isNyusha: boolean) => {
    const platGroup = new THREE.Group();

    // Heavy Brass Foundation Frame
    const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.8, 5.6), brassGearMat);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    platGroup.add(baseMesh);

    // Glowing Energy Crystal Bridge Deck (VIBRANT HIGH-CONTRAST SURFACE)
    const crystalDeck = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.2, 5.0), colorMat);
    crystalDeck.position.y = 0.45;
    platGroup.add(crystalDeck);

    // Gold Trim Outer Edge
    const goldRim = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.3, 5.8), goldTrimMat);
    goldRim.position.y = 0.2;
    platGroup.add(goldRim);

    // Prominent "STAND HERE" Center Pad on Platform
    const standHerePad = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.28, 24), colorMat);
    standHerePad.position.y = 0.55;
    platGroup.add(standHerePad);

    const standHereCore = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.32, 16), goldTrimMat);
    standHereCore.position.y = 0.58;
    platGroup.add(standHereCore);

    // 4 Corner Glowing Beacon Lanterns
    const cornerOffsets = [
      [-2.5, -2.5],
      [2.5, -2.5],
      [-2.5, 2.5],
      [2.5, 2.5],
    ];

    for (const [cx, cz] of cornerOffsets) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.4, 12), doorFrameMat);
      post.position.set(cx, 1.0, cz);
      platGroup.add(post);

      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), colorMat);
      lamp.position.set(cx, 1.8, cz);
      platGroup.add(lamp);
    }

    return { platGroup, baseMesh };
  };

  // Moving Platform A (Nyusha - Cyan Crystal Platform, Left: x: -5.875)
  const platformA = createFloatingBridgePlatform(runeMatA, true);
  platformA.platGroup.position.set(-5.875, -0.4, 56);
  rootGroup.add(platformA.platGroup);

  const platformAColliderIndex = colliders.length;
  const platformACollider = new THREE.Box3().setFromObject(platformA.baseMesh);
  colliders.push(platformACollider);

  // Moving Platform B (Hassan - Emerald Crystal Platform, Right: x: 5.875)
  const platformB = createFloatingBridgePlatform(runeMatB, false);
  platformB.platGroup.position.set(5.875, -0.4, 56);
  rootGroup.add(platformB.platGroup);

  const platformBColliderIndex = colliders.length;
  const platformBCollider = new THREE.Box3().setFromObject(platformB.baseMesh);
  colliders.push(platformBCollider);

  // Far Side Destination Floor (z: 78 to 104) - EXTENDED 26m SPACIOUS PLAZA!
  helperAddBox([22, 1, 26], [0, -0.5, 91], woodenPlankMat);

  // Side Walls over Chasm & Far Side Plaza
  helperAddBox([1.2, 8, 56], [-11.0, 4, 76], carvedWallMat);
  helperAddBox([1.2, 8, 56], [11.0, 4, 76], carvedWallMat);

  // Main Puzzle Control Levers
  // Lever 3A at Entrance (at x: -5.875, z: 53.5) -> Activates Platform B
  const lever3AMesh = new THREE.Mesh(leverBaseGeo, runeMatA);
  lever3AMesh.position.set(-5.875, 0.6, 53.5);
  rootGroup.add(lever3AMesh);
  interactiveObjects.push({
    id: 'lever_main_a',
    type: 'lever',
    mesh: lever3AMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(lever3AMesh.position, new THREE.Vector3(2.5, 2, 2.5)),
    prompt: 'حرکت دادن سکوی هم‌تیمی (کلید E)',
  });

  // Lever 3B on Far Side (at x: 5.875, z: 82) -> Activates Platform A
  const lever3BMesh = new THREE.Mesh(leverBaseGeo, runeMatB);
  lever3BMesh.position.set(5.875, 0.6, 82);
  rootGroup.add(lever3BMesh);
  interactiveObjects.push({
    id: 'lever_main_b',
    type: 'lever',
    mesh: lever3BMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(lever3BMesh.position, new THREE.Vector3(2.5, 2, 2.5)),
    prompt: 'حرکت دادن سکوی هم‌تیمی (کلید E)',
  });

  // --- CENTRAL SOLAR RESONATOR CORE (محراب رزوناتور خورشیدی) ---
  const solarResonatorGroup = new THREE.Group();
  solarResonatorGroup.position.set(0, 0, 92);

  // Pedestal Base (Golden Carved Sun Altar)
  const altarBase = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 0.8, 24), goldTrimMat);
  altarBase.position.y = 0.4;
  altarBase.castShadow = true;
  altarBase.receiveShadow = true;
  solarResonatorGroup.add(altarBase);

  const altarMiddle = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 1.2, 16), doorFrameMat);
  altarMiddle.position.y = 1.4;
  solarResonatorGroup.add(altarMiddle);

  // Rotating Solar Ring 1 (Horizontal)
  const solarRing1 = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.15, 12, 32), brassGearMat);
  solarRing1.position.y = 2.4;
  solarRing1.rotation.x = Math.PI / 2;
  solarResonatorGroup.add(solarRing1);

  // Rotating Solar Ring 2 (Vertical/Diagonal)
  const solarRing2 = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.12, 12, 32), goldTrimMat);
  solarRing2.position.y = 2.4;
  solarRing2.rotation.y = Math.PI / 4;
  solarResonatorGroup.add(solarRing2);

  // Central Radiant Solar Resonator Crystal Orb (گوی رزوناتور خورشیدی)
  const solarCrystalMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.9,
    roughness: 0.1,
    metalness: 0.2,
  });
  const solarCrystalOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 2), solarCrystalMat);
  solarCrystalOrb.position.y = 2.4;
  solarResonatorGroup.add(solarCrystalOrb);

  // Glowing Energy Lines / Conduits linking Solar Resonator to Sync Buttons & Exit Door
  const conduitA = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.08, 0.4), runeMatA);
  conduitA.position.set(-3.0, 0.04, 92);
  rootGroup.add(conduitA);

  const conduitB = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.08, 0.4), runeMatB);
  conduitB.position.set(3.0, 0.04, 92);
  rootGroup.add(conduitB);

  const conduitDoor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 12.0), goldTrimMat);
  conduitDoor.position.set(0, 0.04, 98);
  rootGroup.add(conduitDoor);

  rootGroup.add(solarResonatorGroup);

  // Final Harmony Sync Buttons flanking the Solar Resonator (at x: +-5.875, z: 92)
  const finalBtnAMesh = new THREE.Mesh(syncBtnGeo, runeMatA);
  finalBtnAMesh.position.set(-5.875, 0.125, 92);
  rootGroup.add(finalBtnAMesh);
  interactiveObjects.push({
    id: 'button_final_a',
    type: 'pressure_plate',
    mesh: finalBtnAMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(finalBtnAMesh.position, new THREE.Vector3(2.5, 1.5, 2.5)),
    prompt: 'فعال‌سازی رزوناتور خورشیدی نیوشا (همزمان با هم‌تیمی)',
  });

  const finalBtnBMesh = new THREE.Mesh(syncBtnGeo, runeMatB);
  finalBtnBMesh.position.set(5.875, 0.125, 92);
  rootGroup.add(finalBtnBMesh);
  interactiveObjects.push({
    id: 'button_final_b',
    type: 'pressure_plate',
    mesh: finalBtnBMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(finalBtnBMesh.position, new THREE.Vector3(2.5, 1.5, 2.5)),
    prompt: 'فعال‌سازی رزوناتور خورشیدی حسن (همزمان با هم‌تیمی)',
  });

  // --- Partition Wall at z: 104 with Central Exit Door 3 ---
  // FULL-HEIGHT WALL (y: 0 to 8.2) MOVED FURTHER BACK AT Z: 104!
  const arch3 = createFullWallArchway(0, 104, 4.8, 5.0, 22.0);

  // Door 3 Mesh (5.2m wide x 5.4m tall x 1.0m thick -> COMPLETELY SEALS EXIT ROOM AT START)
  const door3Mesh = new THREE.Mesh(new THREE.BoxGeometry(5.2, 5.4, 1.0), doorMat);
  door3Mesh.position.set(0, 2.7, 104);
  door3Mesh.castShadow = true;
  rootGroup.add(door3Mesh);

  // Door 3 Gold Trim & Center Crest
  const door3Trim = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.4, 1.1), goldTrimMat);
  door3Trim.position.set(0, 0, 0);
  door3Mesh.add(door3Trim);

  const door3Crest = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.2, 16), brassGearMat);
  door3Crest.rotation.x = Math.PI / 2;
  door3Crest.position.set(0, 0, 0);
  door3Mesh.add(door3Crest);

  const door3ColliderIndex = colliders.length;
  const door3Collider = new THREE.Box3().setFromObject(door3Mesh);
  colliders.push(door3Collider);

  const statefulDoor3 = new StatefulDoor(door3Mesh, 2.7, 8.2, 5.0);

  // =========================================================================
  // 4. PART 4: SHARED EXIT SANCTUARY & PORTAL PAD (z: 104 to 122)
  // =========================================================================
  helperAddBox([22, 1, 18], [0, -0.5, 113], woodenPlankMat);
  helperAddBox([22, 1, 18], [0, 8.2, 113], ceilingMat);
  helperAddBox([1.2, 8, 18], [-11.0, 4, 113], carvedWallMat);
  helperAddBox([1.2, 8, 18], [11.0, 4, 113], carvedWallMat);
  helperAddBox([22, 8, 1.2], [0, 4, 122], carvedWallMat); // Far Back Wall

  // Exit Portal Pad
  const portalGeo = new THREE.CylinderGeometry(2.5, 2.8, 0.3, 24);
  const portalMesh = new THREE.Mesh(portalGeo, goldTrimMat);
  portalMesh.position.set(0, 0.15, 114);
  rootGroup.add(portalMesh);

  const portalP1Mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.2, 16), runeMatA);
  portalP1Mesh.position.set(-1.8, 0.25, 114);
  rootGroup.add(portalP1Mesh);

  const portalP2Mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.2, 16), runeMatB);
  portalP2Mesh.position.set(1.8, 0.25, 114);
  rootGroup.add(portalP2Mesh);

  interactiveObjects.push({
    id: 'portal_p1_stage4',
    type: 'portal_pad',
    mesh: portalP1Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(portalP1Mesh.position, new THREE.Vector3(2, 2, 2)),
    prompt: 'ایستادن روی سکوی خروج نیوشا',
  });

  interactiveObjects.push({
    id: 'portal_p2_stage4',
    type: 'portal_pad',
    mesh: portalP2Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(portalP2Mesh.position, new THREE.Vector3(2, 2, 2)),
    prompt: 'ایستادن روی سکوی خروج حسن',
  });

  // Checkpoints
  const checkpoints = [
    { id: 0, pos: [0, 1.2, 3] as [number, number, number], active: true, mesh: tabletMesh },
    { id: 1, pos: [0, 1.2, 22] as [number, number, number], active: false, mesh: leverA1Mesh },
    { id: 2, pos: [0, 1.2, 52] as [number, number, number], active: false, mesh: lever3AMesh },
  ];

  // Current platform Z positions for smooth lerp update
  let currentPlatformAZ = 56;
  let currentPlatformBZ = 56;

  return {
    rootGroup,
    colliders,
    interactiveObjects,
    spawnPoint: [0, 1.2, 3],
    checkpoints,
    update: (dt: number, state: PuzzleState) => {
      // 1. Rotate decorative gears & Solar Resonator rings
      for (const gear of gearsList) {
        gear.rotation.y += dt * 1.2;
      }

      solarRing1.rotation.z += dt * 1.5;
      solarRing2.rotation.x += dt * 2.0;
      solarCrystalOrb.rotation.y += dt * 1.0;

      const customData = state.customData || {};

      // --- Part 1: Synchronized Button Teaching ---
      const part1Solved = !!customData.stage4Part1Solved;
      statefulDoor1.setTarget(part1Solved);
      statefulDoor1.update(dt);

      arch1.gemMesh.material = part1Solved ? gemUnlockedMat : gemLockedMat;

      if (statefulDoor1.state === 'Open') {
        colliders[door1ColliderIndex].setFromCenterAndSize(new THREE.Vector3(0, -999, 0), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[door1ColliderIndex].setFromObject(door1Mesh);
      }

      // --- Part 2: Dual Paths Timed Doors ---
      const timerA = typeof customData.stage4TimedDoorATimer === 'number' ? customData.stage4TimedDoorATimer : 0;
      const timerB = typeof customData.stage4TimedDoorBTimer === 'number' ? customData.stage4TimedDoorBTimer : 0;

      const wantOpenA = timerA > 0;
      const wantOpenB = timerB > 0;

      statefulDoorA.setTarget(wantOpenA);
      statefulDoorB.setTarget(wantOpenB);

      statefulDoorA.update(dt);
      statefulDoorB.update(dt);

      archA.gemMesh.material = wantOpenA ? gemUnlockedMat : gemLockedMat;
      archB.gemMesh.material = wantOpenB ? gemUnlockedMat : gemLockedMat;

      if (statefulDoorA.state === 'Open' || wantOpenA) {
        colliders[doorAColliderIndex].setFromCenterAndSize(new THREE.Vector3(-5.875, -999, 38), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[doorAColliderIndex].setFromObject(doorAMesh);
      }

      if (statefulDoorB.state === 'Open' || wantOpenB) {
        colliders[doorBColliderIndex].setFromCenterAndSize(new THREE.Vector3(5.875, -999, 38), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[doorBColliderIndex].setFromObject(doorBMesh);
      }

      // --- Part 3: Main Harmony Sequence & Platform Movement ---
      const mainState: string = customData.stage4MainState || 'WAITING';

      // Target Z positions for Platform A and B based on state
      let targetPlatformAZ = 56;
      let targetPlatformBZ = 56;

      if (mainState === 'A_HELPING_B' || mainState === 'B_CROSSED') {
        targetPlatformBZ = 78;
        targetPlatformAZ = 56;
      } else if (mainState === 'B_HELPING_A' || mainState === 'A_CROSSED' || mainState === 'WAITING_FOR_FINAL_SYNC' || mainState === 'SOLVED') {
        targetPlatformBZ = 78;
        targetPlatformAZ = 78;
      }

      // Lerp platform positions smoothly
      const moveSpeed = dt * 5.0;
      currentPlatformAZ += (targetPlatformAZ - currentPlatformAZ) * Math.min(1, moveSpeed);
      currentPlatformBZ += (targetPlatformBZ - currentPlatformBZ) * Math.min(1, moveSpeed);

      platformA.platGroup.position.z = currentPlatformAZ;
      platformB.platGroup.position.z = currentPlatformBZ;

      // Update colliders for moving platforms
      colliders[platformAColliderIndex].setFromObject(platformA.baseMesh);
      colliders[platformBColliderIndex].setFromObject(platformB.baseMesh);

      // --- Exit Door 3 (Central Gate) ---
      // Strictly closed unless main harmony puzzle is SOLVED!
      const part3Solved = mainState === 'SOLVED';
      solarCrystalMat.emissiveIntensity = part3Solved ? 1.8 : 0.9;
      solarCrystalMat.color.setHex(part3Solved ? 0xfef08a : 0xfbbf24);

      statefulDoor3.setTarget(part3Solved);
      statefulDoor3.update(dt);

      arch3.gemMesh.material = part3Solved ? gemUnlockedMat : gemLockedMat;

      if (statefulDoor3.state === 'Open') {
        colliders[door3ColliderIndex].setFromCenterAndSize(new THREE.Vector3(0, -999, 0), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[door3ColliderIndex].setFromObject(door3Mesh);
      }

      // Portal emissive feedback
      const p1Ready = !!customData[`stage4ExitP1Ready`];
      const p2Ready = !!customData[`stage4ExitP2Ready`];

      (portalP1Mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = p1Ready ? 1.0 : 0.2;
      (portalP2Mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = p2Ready ? 1.0 : 0.2;
    },
    dispose: () => {
      rootGroup.clear();
      gearsList.length = 0;
    },
  };
}
