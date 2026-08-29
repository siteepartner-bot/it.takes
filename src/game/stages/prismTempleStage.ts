import * as THREE from 'three';
import type { PuzzleState } from '../../types.ts';
import type { StageBuildResult, InteractiveObject } from './gardenStage.ts';

export function buildPrismTempleStage(): StageBuildResult {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'stage_prism_temple';

  const colliders: THREE.Box3[] = [];
  const interactiveObjects: InteractiveObject[] = [];

  // --- Premium Materials ---
  const goldSandstoneMat = new THREE.MeshStandardMaterial({
    color: 0xdfad48,
    roughness: 0.45,
    metalness: 0.35,
  });

  const darkObsidianMat = new THREE.MeshStandardMaterial({
    color: 0x18142e,
    roughness: 0.5,
    metalness: 0.4,
  });

  const mirrorCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    metalness: 0.95,
    roughness: 0.05,
    emissive: 0x0284c7,
    emissiveIntensity: 0.4,
  });

  const solarBeamMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.85,
  });

  const cyanBeamMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.9,
  });

  const laserHazardMat = new THREE.MeshBasicMaterial({
    color: 0xff1e56,
    transparent: true,
    opacity: 0.8,
  });

  const sunCoreMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.9,
    roughness: 0.1,
    metalness: 0.8,
  });

  const glowingCyanConduitMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });

  const lightBridgeMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.75,
    roughness: 0.1,
    metalness: 0.2,
  });

  function addPlatform(x: number, y: number, z: number, w: number, h: number, d: number, mat = darkObsidianMat) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y - h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rootGroup.add(mesh);
    colliders.push(new THREE.Box3().setFromObject(mesh));
    return mesh;
  }

  function addPillar(x: number, y: number, z: number, height = 7, radius = 0.7) {
    const geo = new THREE.CylinderGeometry(radius * 0.8, radius, height, 10);
    const mesh = new THREE.Mesh(geo, goldSandstoneMat);
    mesh.position.set(x, y + height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rootGroup.add(mesh);

    // Glowing capital rune
    const ringGeo = new THREE.TorusGeometry(radius * 1.15, 0.1, 8, 16);
    const ring = new THREE.Mesh(ringGeo, glowingCyanConduitMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y + height - 0.5, z);
    rootGroup.add(ring);

    colliders.push(new THREE.Box3().setFromObject(mesh));
    return mesh;
  }

  // ==========================================
  // ZONE 1: THE SUN PORTAL ENTRANCE (z: -6 to 10)
  // ==========================================
  addPlatform(0, 0, 2, 20, 2.5, 20, darkObsidianMat);

  // Pillars framing the entrance
  addPillar(-8, 0, -6);
  addPillar(8, 0, -6);
  addPillar(-8, 0, 8);
  addPillar(8, 0, 8);

  // Solar Core Generator Emitter at South entrance
  const emitterGroup = new THREE.Group();
  emitterGroup.position.set(0, 0, -6);
  rootGroup.add(emitterGroup);

  const emitterBase = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 1.6, 8), goldSandstoneMat);
  emitterBase.position.y = 0.8;
  emitterGroup.add(emitterBase);

  const emitterCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.0, 0), sunCoreMat);
  emitterCrystal.position.y = 2.4;
  emitterGroup.add(emitterCrystal);

  // Lore Story Tablet 4
  const tabletGeo4 = new THREE.BoxGeometry(1.4, 2.0, 0.25);
  const tabletMat4 = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xeab308, emissiveIntensity: 0.6 });
  const tablet4 = new THREE.Mesh(tabletGeo4, tabletMat4);
  tablet4.position.set(-6, 1.2, -3);
  rootGroup.add(tablet4);

  interactiveObjects.push({
    id: 'story_tablet_stage4',
    type: 'lever',
    mesh: tablet4,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-6, 1.2, -3), new THREE.Vector3(2.5, 2.5, 2.5)),
    prompt: '📜 خواندن کتیبه باستانی معبد خورشید و منشورهای نور (کلید E)',
  });

  // --- Hazard: Sweeping Rotating Solar Defense Lasers ---
  const hazardGroup = new THREE.Group();
  hazardGroup.position.set(0, 0.5, 2);
  rootGroup.add(hazardGroup);

  const laserBarGeo = new THREE.CylinderGeometry(0.08, 0.08, 14, 8);
  laserBarGeo.rotateZ(Math.PI / 2);
  const sweepingLaser1 = new THREE.Mesh(laserBarGeo, laserHazardMat);
  hazardGroup.add(sweepingLaser1);

  const sweepingLaser2 = new THREE.Mesh(laserBarGeo, laserHazardMat);
  sweepingLaser2.rotation.y = Math.PI / 2;
  hazardGroup.add(sweepingLaser2);

  // Central hub for sweeping lasers
  const laserHub = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.6, 8), goldSandstoneMat);
  laserHub.position.y = 0;
  hazardGroup.add(laserHub);

  // --- Puzzle 4-A: Prism 1 Pedestal (Left Wing - Kaelyn's Side) ---
  const prism1Group = new THREE.Group();
  prism1Group.position.set(-6, 0, 4);
  rootGroup.add(prism1Group);

  const pedestal1 = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 1.2, 8), goldSandstoneMat);
  pedestal1.position.y = 0.6;
  pedestal1.castShadow = true;
  prism1Group.add(pedestal1);

  const mirror1Holder = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.0, 0.25), mirrorCrystalMat);
  mirror1Holder.position.y = 1.8;
  prism1Group.add(mirror1Holder);

  const prism1Indicator = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), glowingCyanConduitMat);
  prism1Indicator.position.set(0, 2.9, 0);
  prism1Group.add(prism1Indicator);

  interactiveObjects.push({
    id: 'prism_pedestal_1',
    type: 'bridge_switch',
    mesh: pedestal1,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-6, 1.2, 4), new THREE.Vector3(2.8, 2.5, 2.8)),
    prompt: '✨ چرخاندن و تنظیم منشور نوری ۱ (کلید E)',
  });

  // Light Beams for Zone 1
  // Beam from Emitter -> Prism 1
  const beamFromEmitterGeo = new THREE.CylinderGeometry(0.08, 0.08, 12, 8);
  beamFromEmitterGeo.rotateX(Math.PI / 2);
  const beamEmitterToPrism1 = new THREE.Mesh(beamFromEmitterGeo, solarBeamMat);
  beamEmitterToPrism1.position.set(-3, 2.4, -1);
  beamEmitterToPrism1.lookAt(new THREE.Vector3(-6, 1.8, 4));
  rootGroup.add(beamEmitterToPrism1);

  // Beam from Prism 1 across abyss to Zone 2
  const beamPrism1ToZone2Geo = new THREE.CylinderGeometry(0.09, 0.09, 24, 8);
  beamPrism1ToZone2Geo.rotateX(Math.PI / 2);
  const beamPrism1ToZone2 = new THREE.Mesh(beamPrism1ToZone2Geo, cyanBeamMat);
  beamPrism1ToZone2.position.set(0, 1.8, 16);
  beamPrism1ToZone2.lookAt(new THREE.Vector3(6, 2.8, 28));
  beamPrism1ToZone2.visible = false;
  rootGroup.add(beamPrism1ToZone2);

  // --- Light Bridge 1 (Activated by Prism 1) ---
  const lightBridge1Mesh = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 12), lightBridgeMat);
  lightBridge1Mesh.position.set(0, 0.3, 16);
  lightBridge1Mesh.visible = false;
  rootGroup.add(lightBridge1Mesh);

  const lightBridge1Collider = new THREE.Box3();
  const lightBridge1ColliderIndex = colliders.length;
  colliders.push(lightBridge1Collider); // initially empty/below world

  // ==========================================
  // ZONE 2: HALL OF CONDUITS & PRISM 2 (z: 22 to 36)
  // ==========================================
  addPlatform(0, 1.2, 28, 22, 2.5, 18, darkObsidianMat);

  // Surrounding pillars
  addPillar(-9, 1.2, 22);
  addPillar(9, 1.2, 22);
  addPillar(-9, 1.2, 34);
  addPillar(9, 1.2, 34);

  // Solar Energy Conduit Plate (Target Socket for Crate or Player)
  const conduitPlateMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.8, 0.25, 16),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xeab308, emissiveIntensity: 0.6 })
  );
  conduitPlateMesh.position.set(-5, 1.35, 28);
  rootGroup.add(conduitPlateMesh);

  interactiveObjects.push({
    id: 'solar_conduit_plate',
    type: 'pressure_plate',
    mesh: conduitPlateMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-5, 1.5, 28), new THREE.Vector3(3.2, 2, 3.2)),
    prompt: '⚡ هادی انرژی خورشید (مستقر کردن مکعب یا ایستادن روی آن)',
  });

  // Heavy Solar Crystal Crate
  const solarBoxGeo = new THREE.BoxGeometry(1.8, 1.8, 1.8);
  const solarCrateMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.7,
    roughness: 0.3,
    emissive: 0xd97706,
    emissiveIntensity: 0.4,
  });
  const solarCrateMesh = new THREE.Mesh(solarBoxGeo, solarCrateMat);
  solarCrateMesh.position.set(4, 2.1, 24);
  solarCrateMesh.castShadow = true;
  rootGroup.add(solarCrateMesh);

  const solarCrateColliderIndex = colliders.length;
  colliders.push(new THREE.Box3().setFromObject(solarCrateMesh));

  interactiveObjects.push({
    id: 'solar_push_crate',
    type: 'heavy_block',
    mesh: solarCrateMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(4, 2.1, 24), new THREE.Vector3(3.2, 3.2, 3.2)),
    prompt: '📦 جابجایی مکعب بلورین خورشید روی هادی انرژی (کلید E)',
  });

  // --- Prism 2 Pedestal (Right Wing - Bram's Side) ---
  const prism2TowerGroup = new THREE.Group();
  prism2TowerGroup.position.set(6, 1.2, 28);
  rootGroup.add(prism2TowerGroup);

  const pedestal2 = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 1.6, 8), goldSandstoneMat);
  pedestal2.position.y = 0.8;
  prism2TowerGroup.add(pedestal2);

  const mirror2Holder = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.0, 0.25), mirrorCrystalMat);
  mirror2Holder.position.y = 2.0;
  prism2TowerGroup.add(mirror2Holder);

  const prism2Indicator = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), glowingCyanConduitMat);
  prism2Indicator.position.set(0, 3.1, 0);
  prism2TowerGroup.add(prism2Indicator);

  interactiveObjects.push({
    id: 'prism_pedestal_2',
    type: 'bridge_switch',
    mesh: pedestal2,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(6, 2.0, 28), new THREE.Vector3(2.8, 2.8, 2.8)),
    prompt: '🌟 چرخاندن منشور نوری ۲ به سمت هسته اعظم خورشید (کلید E)',
  });

  // Beam from Prism 2 -> Central Grand Solar Core
  const beamPrism2ToCoreGeo = new THREE.CylinderGeometry(0.1, 0.1, 18, 8);
  beamPrism2ToCoreGeo.rotateX(Math.PI / 2);
  const beamPrism2ToCore = new THREE.Mesh(beamPrism2ToCoreGeo, solarBeamMat);
  beamPrism2ToCore.position.set(3, 3.5, 35);
  beamPrism2ToCore.lookAt(new THREE.Vector3(0, 5.0, 42));
  beamPrism2ToCore.visible = false;
  rootGroup.add(beamPrism2ToCore);

  // ==========================================
  // ZONE 3: THE GRAND SOLAR CORE & FLOATING DISCS PARKOUR (z: 37 to 47)
  // ==========================================
  const centralSunCoreGroup = new THREE.Group();
  centralSunCoreGroup.position.set(0, 5.0, 42);
  rootGroup.add(centralSunCoreGroup);

  const centralSunCore = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), sunCoreMat);
  centralSunCoreGroup.add(centralSunCore);

  // Sun halo ring
  const sunHalo = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.15, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.8 })
  );
  centralSunCoreGroup.add(sunHalo);

  // Twin Oscillating Floating Solar Discs (Dynamic Parkour across the 14-unit chasm)
  const discMat = new THREE.MeshStandardMaterial({
    color: 0xdfad48,
    emissive: 0xb45309,
    emissiveIntensity: 0.5,
    roughness: 0.3,
    metalness: 0.6,
  });

  const disc1Mesh = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.8, 16), discMat);
  disc1Mesh.position.set(-3, 2.2, 38);
  disc1Mesh.castShadow = true;
  disc1Mesh.receiveShadow = true;
  rootGroup.add(disc1Mesh);

  const disc1ColliderIndex = colliders.length;
  colliders.push(new THREE.Box3().setFromObject(disc1Mesh));

  const disc2Mesh = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.8, 16), discMat);
  disc2Mesh.position.set(3, 3.0, 44);
  disc2Mesh.castShadow = true;
  disc2Mesh.receiveShadow = true;
  rootGroup.add(disc2Mesh);

  const disc2ColliderIndex = colliders.length;
  colliders.push(new THREE.Box3().setFromObject(disc2Mesh));

  // ==========================================
  // ZONE 4: THE APEX SANCTUARY & DUAL RESONATORS (z: 48 to 68)
  // ==========================================
  addPlatform(0, 3.8, 58, 24, 2.5, 20, darkObsidianMat);

  addPillar(-10, 3.8, 50);
  addPillar(10, 3.8, 50);
  addPillar(-10, 3.8, 64);
  addPillar(10, 3.8, 64);

  // --- Dual Solar Resonator Pillars ---
  // Resonator 1 (Left - Kaelyn)
  const res1Group = new THREE.Group();
  res1Group.position.set(-5, 3.8, 53);
  rootGroup.add(res1Group);

  const res1Pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 1.8, 8), goldSandstoneMat);
  res1Pillar.position.y = 0.9;
  res1Group.add(res1Pillar);

  const res1Crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.6, 0),
    new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2, emissiveIntensity: 0.3 })
  );
  res1Crystal.position.y = 2.0;
  res1Group.add(res1Crystal);

  interactiveObjects.push({
    id: 'solar_resonator_1',
    type: 'lever',
    mesh: res1Pillar,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-5, 4.8, 53), new THREE.Vector3(2.5, 2.5, 2.5)),
    prompt: '🔹 فعال‌سازی رزوناتور خورشیدی ۱ (کاوشگر - کلید E)',
  });

  // Resonator 2 (Right - Bram)
  const res2Group = new THREE.Group();
  res2Group.position.set(5, 3.8, 53);
  rootGroup.add(res2Group);

  const res2Pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 1.8, 8), goldSandstoneMat);
  res2Pillar.position.y = 0.9;
  res2Group.add(res2Pillar);

  const res2Crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.6, 0),
    new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.3 })
  );
  res2Crystal.position.y = 2.0;
  res2Group.add(res2Crystal);

  interactiveObjects.push({
    id: 'solar_resonator_2',
    type: 'lever',
    mesh: res2Pillar,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(5, 4.8, 53), new THREE.Vector3(2.5, 2.5, 2.5)),
    prompt: '🔸 فعال‌سازی رزوناتور خورشیدی ۲ (نگهبان - کلید E)',
  });

  // The Massive Sun Gate (Descends when both resonators are touched)
  const gateGroup = new THREE.Group();
  gateGroup.position.set(0, 3.8, 58);
  rootGroup.add(gateGroup);

  const gateDoor = new THREE.Mesh(new THREE.BoxGeometry(12, 7, 1.2), goldSandstoneMat);
  gateDoor.position.y = 3.5;
  gateDoor.castShadow = true;
  gateGroup.add(gateDoor);

  const gateDoorRune = new THREE.Mesh(
    new THREE.RingGeometry(1.6, 2.2, 16),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xeab308, emissiveIntensity: 0.7 })
  );
  gateDoorRune.position.set(0, 3.5, 0.65);
  gateGroup.add(gateDoorRune);

  const gateColliderIndex = colliders.length;
  colliders.push(new THREE.Box3().setFromObject(gateDoor));

  // --- Checkpoints ---
  const checkpoints = [
    {
      id: 0,
      pos: [0, 1.2, 0] as [number, number, number],
      active: true,
      mesh: new THREE.Mesh(new THREE.RingGeometry(1.2, 1.6, 16), new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })),
    },
    {
      id: 1,
      pos: [0, 2.4, 24] as [number, number, number],
      active: false,
      mesh: new THREE.Mesh(new THREE.RingGeometry(1.2, 1.6, 16), new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })),
    },
    {
      id: 2,
      pos: [0, 5.0, 50] as [number, number, number],
      active: false,
      mesh: new THREE.Mesh(new THREE.RingGeometry(1.2, 1.6, 16), new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })),
    },
  ];

  checkpoints[0].mesh.rotateX(-Math.PI / 2);
  checkpoints[0].mesh.position.set(0, 0.05, 0);
  rootGroup.add(checkpoints[0].mesh);

  checkpoints[1].mesh.rotateX(-Math.PI / 2);
  checkpoints[1].mesh.position.set(0, 1.25, 24);
  rootGroup.add(checkpoints[1].mesh);

  checkpoints[2].mesh.rotateX(-Math.PI / 2);
  checkpoints[2].mesh.position.set(0, 3.85, 50);
  rootGroup.add(checkpoints[2].mesh);

  // --- Twin Exit Portal Pads ---
  const padMat1 = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2, emissiveIntensity: 0.8 });
  const padMat2 = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.8 });

  const exitPad1 = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 0.3, 16), padMat1);
  exitPad1.position.set(-4, 3.95, 64);
  rootGroup.add(exitPad1);

  const exitPad2 = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 0.3, 16), padMat2);
  exitPad2.position.set(4, 3.95, 64);
  rootGroup.add(exitPad2);

  // Portal Arch & Swirling Core
  const portalArch = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.4, 8, 24), goldSandstoneMat);
  portalArch.position.set(0, 7.2, 65);
  rootGroup.add(portalArch);

  const portalCore = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 24),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
  );
  portalCore.position.set(0, 7.2, 65);
  portalCore.visible = false;
  rootGroup.add(portalCore);

  interactiveObjects.push({
    id: 'stage4_exit_p1',
    type: 'portal_pad',
    mesh: exitPad1,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-4, 4.5, 64), new THREE.Vector3(2.8, 2.5, 2.8)),
    targetRole: 'explorer',
    prompt: 'ایستادن روی درگاه خورشیدی (کاوشگر)',
  });

  interactiveObjects.push({
    id: 'stage4_exit_p2',
    type: 'portal_pad',
    mesh: exitPad2,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(4, 4.5, 64), new THREE.Vector3(2.8, 2.5, 2.8)),
    targetRole: 'guardian',
    prompt: 'ایستادن روی درگاه خورشیدی (نگهبان)',
  });

  let animT = 0;
  let prism1Rot = 0;
  let prism2Rot = 0;

  return {
    rootGroup,
    colliders,
    interactiveObjects,
    spawnPoint: [0, 1.2, 0],
    checkpoints,
    update: (dt: number, state: PuzzleState) => {
      animT += dt;

      // 1. Rotating sweeping laser hazard in Area 1
      hazardGroup.rotation.y += dt * 0.9;

      // 2. Solar Generator crystal floating animation
      emitterCrystal.rotation.y += dt * 1.5;
      emitterCrystal.rotation.x = Math.sin(animT * 2) * 0.2;

      // 3. Prism 1 Alignment & Light Bridge 1
      const isPrism1Active = !!state.prism1Aligned || !!state.customData?.prism1Aligned;
      const targetP1Rot = isPrism1Active ? Math.PI / 4 : 0;
      prism1Rot = THREE.MathUtils.lerp(prism1Rot, targetP1Rot, dt * 4);
      prism1Group.rotation.y = prism1Rot;

      beamPrism1ToZone2.visible = isPrism1Active;
      lightBridge1Mesh.visible = isPrism1Active;
      if (isPrism1Active) {
        lightBridge1Collider.setFromObject(lightBridge1Mesh);
      } else {
        lightBridge1Collider.makeEmpty();
      }

      // 4. Solar Crate placement on conduit
      const isConduitActive = !!state.solarConduitActive || !!state.customData?.solarConduitActive;
      if (isConduitActive) {
        solarCrateMesh.position.set(-5, 2.2, 28);
      } else {
        solarCrateMesh.position.set(4, 2.1, 24);
      }
      solarCrateMesh.updateMatrixWorld(true);
      colliders[solarCrateColliderIndex].setFromObject(solarCrateMesh);

      // 5. Prism 2 Alignment & Central Sun Core Activation
      const isPrism2Active = !!state.prism2Aligned || !!state.customData?.prism2Aligned;
      const targetP2Rot = isPrism2Active ? -Math.PI / 4 : 0;
      prism2Rot = THREE.MathUtils.lerp(prism2Rot, targetP2Rot, dt * 4);
      prism2TowerGroup.rotation.y = prism2Rot;

      beamPrism2ToCore.visible = isPrism2Active && isConduitActive;

      // 6. Central Sun Core Animation
      const isCoreAwake = isPrism1Active && isConduitActive && isPrism2Active;
      if (isCoreAwake) {
        centralSunCore.rotation.y += dt * 3.0;
        centralSunCore.rotation.z += dt * 2.0;
        sunHalo.rotation.z += dt * 2.5;
        const scale = 1.0 + Math.sin(animT * 4) * 0.15;
        centralSunCore.scale.set(scale, scale, scale);
      }

      // 7. Dynamic Oscillating Solar Discs (Hover Parkour)
      if (isCoreAwake) {
        // Disc 1 sweeps horizontally (x: -5 to +1) and forward/backward
        const disc1X = -2 + Math.sin(animT * 1.8) * 3.5;
        const disc1Z = 38 + Math.cos(animT * 1.8) * 1.5;
        disc1Mesh.position.set(disc1X, 2.2, disc1Z);
        disc1Mesh.updateMatrixWorld(true);
        colliders[disc1ColliderIndex].setFromObject(disc1Mesh);

        // Disc 2 sweeps horizontally (x: -1 to +5) and forward/backward oppositely
        const disc2X = 2 - Math.sin(animT * 1.8) * 3.5;
        const disc2Z = 44 - Math.cos(animT * 1.8) * 1.5;
        disc2Mesh.position.set(disc2X, 3.0, disc2Z);
        disc2Mesh.updateMatrixWorld(true);
        colliders[disc2ColliderIndex].setFromObject(disc2Mesh);
      } else {
        // Parked in default resting position
        disc1Mesh.position.set(-3, 2.2, 38);
        disc2Mesh.position.set(3, 3.0, 44);
        disc1Mesh.updateMatrixWorld(true);
        disc2Mesh.updateMatrixWorld(true);
        colliders[disc1ColliderIndex].setFromObject(disc1Mesh);
        colliders[disc2ColliderIndex].setFromObject(disc2Mesh);
      }

      // 8. Dual Resonator Crystals Glow
      const isRes1Active = !!state.solarResonator1 || !!state.customData?.solarResonator1;
      const isRes2Active = !!state.solarResonator2 || !!state.customData?.solarResonator2;
      (res1Crystal.material as THREE.MeshStandardMaterial).emissiveIntensity = isRes1Active ? 1.0 : 0.2;
      (res2Crystal.material as THREE.MeshStandardMaterial).emissiveIntensity = isRes2Active ? 1.0 : 0.2;

      // 9. Sun Gate Opening
      const isGateOpen = isRes1Active && isRes2Active;
      if (isGateOpen) {
        gateDoor.position.y = THREE.MathUtils.lerp(gateDoor.position.y, -4.0, dt * 2.5);
        portalCore.visible = true;
        portalCore.rotation.z += dt * 1.2;
      } else {
        gateDoor.position.y = THREE.MathUtils.lerp(gateDoor.position.y, 3.5, dt * 2.5);
        portalCore.visible = false;
      }
      gateDoor.updateMatrixWorld(true);
      colliders[gateColliderIndex].setFromObject(gateDoor);
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
