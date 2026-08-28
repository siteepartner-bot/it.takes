import * as THREE from 'three';
import type { PlayerRole, AnimState, EmoteType } from '../types.ts';

export interface CharacterControllerMesh {
  group: THREE.Group;
  role: PlayerRole;
  updateAnimation: (state: AnimState, dt: number, speedRatio: number, abilityActive: boolean) => void;
  showEmote: (emote: EmoteType) => void;
  setNametag: (name: string, isSelf: boolean) => void;
  dispose: () => void;
  getAbilityMesh: () => THREE.Object3D;
}

/**
 * Creates an artisan procedural wood grain texture for the wooden mannequins.
 */
function createProceduralWoodTexture(type: 'birch' | 'oak'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const isBirch = type === 'birch';

  // Base wood background
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  if (isBirch) {
    // Nora's Birch/Aspen wood (warm golden blonde wood tones)
    grad.addColorStop(0, '#e8be89');
    grad.addColorStop(0.5, '#d9a66c');
    grad.addColorStop(1, '#c99153');
  } else {
    // Barsam's Aged Mountain Oak (deep rich chestnut/walnut wood tones)
    grad.addColorStop(0, '#784421');
    grad.addColorStop(0.5, '#5e3215');
    grad.addColorStop(1, '#45220c');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Growth Rings & Wood Fibers
  ctx.lineWidth = 2.5;
  const ringCount = isBirch ? 22 : 30;
  const centerX = isBirch ? 200 : 256;
  const centerY = isBirch ? -80 : -100;

  for (let i = 0; i < ringCount; i++) {
    const r = i * (512 / ringCount) + Math.sin(i * 1.5) * 8;
    ctx.strokeStyle = isBirch
      ? i % 2 === 0 ? 'rgba(168, 114, 58, 0.35)' : 'rgba(255, 235, 195, 0.25)'
      : i % 2 === 0 ? 'rgba(40, 18, 5, 0.45)' : 'rgba(175, 105, 55, 0.2)';

    ctx.beginPath();
    ctx.ellipse(centerX, centerY, r * 1.6, r, Math.PI / 12, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Vertical wood fiber grain streaks
  for (let x = 0; x < 512; x += 6) {
    ctx.strokeStyle = isBirch ? 'rgba(140, 85, 40, 0.08)' : 'rgba(20, 10, 5, 0.15)';
    ctx.lineWidth = 1 + (x % 3);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(
      x + Math.sin(x) * 12,
      170,
      x - Math.cos(x) * 12,
      340,
      x + Math.sin(x * 0.5) * 8,
      512
    );
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createCharacterMesh(role: PlayerRole): CharacterControllerMesh {
  const group = new THREE.Group();
  group.name = `wooden_mannequin_${role}`;

  const isExplorer = role === 'explorer'; // explorer = Nora (Girl), guardian = Barsam (Boy)

  // --- Procedural Textures & Materials ---
  const woodTexture = createProceduralWoodTexture(isExplorer ? 'birch' : 'oak');

  // Main Carved Wood Material
  const mainWoodMat = new THREE.MeshStandardMaterial({
    map: woodTexture,
    roughness: isExplorer ? 0.35 : 0.45,
    metalness: 0.05,
  });

  // Secondary Accent Wood Material (Darker Walnut/Polished Cedar)
  const accentWoodMat = new THREE.MeshStandardMaterial({
    color: isExplorer ? 0x92400e : 0x3f1f0a,
    roughness: 0.3,
    metalness: 0.1,
  });

  // Brass/Bronze Metallic Pins & Hinges for Marionette Joints
  const brassJointMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.25,
    metalness: 0.85,
  });

  // Runic Glowing Elements (Cyan for Nora, Emerald for Barsam)
  const glowColor = isExplorer ? 0x38bdf8 : 0x34d399;
  const runeGlowMat = new THREE.MeshStandardMaterial({
    color: glowColor,
    emissive: glowColor,
    emissiveIntensity: 1.2,
    roughness: 0.1,
  });

  // Linen/Cloth sash or vest
  const clothMat = new THREE.MeshStandardMaterial({
    color: isExplorer ? 0x0284c7 : 0x064e3b, // Turquoise cyan vs Deep emerald
    roughness: 0.8,
    metalness: 0.0,
  });

  // Eye and facial feature material
  const paintedFaceMat = new THREE.MeshBasicMaterial({ color: 0x1e1510 });

  // -------------------------------------------------------------
  // ROOT HIPS & CARVED WOODEN PELVIS
  // -------------------------------------------------------------
  const hips = new THREE.Group();
  hips.position.y = 0.9;
  group.add(hips);

  // Pelvic ball/block joint
  const pelvisWidth = isExplorer ? 0.46 : 0.62;
  const pelvisGeo = new THREE.CylinderGeometry(pelvisWidth * 0.48, pelvisWidth * 0.4, 0.24, 12);
  const pelvisMesh = new THREE.Mesh(pelvisGeo, accentWoodMat);
  pelvisMesh.position.y = 0.12;
  pelvisMesh.castShadow = true;
  hips.add(pelvisMesh);

  // -------------------------------------------------------------
  // ARTICULATED WOODEN TORSO
  // -------------------------------------------------------------
  const torsoWidth = isExplorer ? 0.52 : 0.74;
  const torsoHeight = isExplorer ? 0.65 : 0.8;
  const torsoDepth = isExplorer ? 0.34 : 0.52;

  const torsoMeshGroup = new THREE.Group();
  torsoMeshGroup.position.y = 0.24;
  hips.add(torsoMeshGroup);

  // Lower abdomen sphere joint (classic wooden mannequin ball joint)
  const waistBallGeo = new THREE.SphereGeometry(isExplorer ? 0.2 : 0.26, 12, 12);
  const waistBall = new THREE.Mesh(waistBallGeo, accentWoodMat);
  waistBall.position.y = 0.08;
  waistBall.castShadow = true;
  torsoMeshGroup.add(waistBall);

  // Upper carved wooden chest block
  const chestGeo = new THREE.BoxGeometry(torsoWidth, torsoHeight * 0.75, torsoDepth);
  const chestMesh = new THREE.Mesh(chestGeo, mainWoodMat);
  chestMesh.position.y = torsoHeight * 0.45;
  chestMesh.castShadow = true;
  chestMesh.receiveShadow = true;
  torsoMeshGroup.add(chestMesh);

  // --- Character-Specific Chest & Lore Details ---
  if (isExplorer) {
    // Nora (Girl Mannequin): Hand-stitched woven turquoise linen sash & leaf brooch
    const sashGeo = new THREE.BoxGeometry(0.14, 0.65, torsoDepth + 0.04);
    const sash = new THREE.Mesh(sashGeo, clothMat);
    sash.position.set(0.06, torsoHeight * 0.45, 0);
    sash.rotation.z = -0.22;
    torsoMeshGroup.add(sash);

    // Carved wooden leaf brooch with tiny cyan Aether jewel
    const broochGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 6);
    broochGeo.rotateX(Math.PI / 2);
    const brooch = new THREE.Mesh(broochGeo, runeGlowMat);
    brooch.position.set(0.08, torsoHeight * 0.55, torsoDepth / 2 + 0.03);
    torsoMeshGroup.add(brooch);

    // Explorer utility pouch on wooden hip
    const pouchGeo = new THREE.BoxGeometry(0.18, 0.22, 0.14);
    const pouch = new THREE.Mesh(pouchGeo, accentWoodMat);
    pouch.position.set(-pelvisWidth * 0.52, 0.08, 0);
    hips.add(pouch);
  } else {
    // Barsam (Boy Mannequin): Open-work wooden lattice housing glowing emerald heart
    const heartFrameGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 6);
    heartFrameGeo.rotateX(Math.PI / 2);
    const heartFrame = new THREE.Mesh(heartFrameGeo, accentWoodMat);
    heartFrame.position.set(0, torsoHeight * 0.46, torsoDepth / 2 + 0.02);
    torsoMeshGroup.add(heartFrame);

    // Glowing pulsating Aether Emerald Heart
    const heartCoreGeo = new THREE.OctahedronGeometry(0.12, 0);
    const heartCore = new THREE.Mesh(heartCoreGeo, runeGlowMat);
    heartCore.position.set(0, torsoHeight * 0.46, torsoDepth / 2 + 0.04);
    torsoMeshGroup.add(heartCore);

    // Heavy reinforced wooden pauldrons on shoulders
    const pauldronGeo = new THREE.BoxGeometry(0.28, 0.18, 0.36);
    const leftPauldron = new THREE.Mesh(pauldronGeo, accentWoodMat);
    leftPauldron.position.set(-torsoWidth * 0.58, torsoHeight * 0.72, 0);
    leftPauldron.castShadow = true;
    torsoMeshGroup.add(leftPauldron);

    const rightPauldron = new THREE.Mesh(pauldronGeo, accentWoodMat);
    rightPauldron.position.set(torsoWidth * 0.58, torsoHeight * 0.72, 0);
    rightPauldron.castShadow = true;
    torsoMeshGroup.add(rightPauldron);
  }

  // -------------------------------------------------------------
  // HEAD & CARVED WOODEN FEATURES
  // -------------------------------------------------------------
  const headGroup = new THREE.Group();
  headGroup.position.y = torsoHeight + 0.28;
  hips.add(headGroup);

  // Neck wooden cylinder joint
  const neckGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.16, 12);
  const neckMesh = new THREE.Mesh(neckGeo, accentWoodMat);
  neckMesh.position.y = -0.06;
  headGroup.add(neckMesh);

  const headSize = isExplorer ? 0.36 : 0.44;
  const headGeo = new THREE.BoxGeometry(headSize, headSize * 1.1, headSize * 0.95);
  const headMesh = new THREE.Mesh(headGeo, mainWoodMat);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Wooden Carved Eyes (Almond eyes painted on wood)
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.04, 0.02);
  const leftEye = new THREE.Mesh(eyeGeo, paintedFaceMat);
  leftEye.position.set(-0.09, 0.04, headSize * 0.95 / 2 + 0.01);
  headGroup.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, paintedFaceMat);
  rightEye.position.set(0.09, 0.04, headSize * 0.95 / 2 + 0.01);
  headGroup.add(rightEye);

  // Nose: Tiny carved wooden pyramid
  const noseGeo = new THREE.ConeGeometry(0.035, 0.07, 4);
  noseGeo.rotateX(Math.PI / 2);
  const noseMesh = new THREE.Mesh(noseGeo, accentWoodMat);
  noseMesh.position.set(0, -0.01, headSize * 0.95 / 2 + 0.03);
  headGroup.add(noseMesh);

  if (isExplorer) {
    // Nora: Carved wooden ponytail / braided cedar locks
    const hairBraidGeo = new THREE.CylinderGeometry(0.06, 0.1, 0.45, 8);
    const hairBraid = new THREE.Mesh(hairBraidGeo, accentWoodMat);
    hairBraid.position.set(0, 0.05, -headSize * 0.95 / 2 - 0.12);
    hairBraid.rotation.x = -0.55;
    hairBraid.castShadow = true;
    headGroup.add(hairBraid);

    // Carved flower / leaf hairpin in hair
    const pinGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 5);
    pinGeo.rotateZ(Math.PI / 2);
    const pinMesh = new THREE.Mesh(pinGeo, runeGlowMat);
    pinMesh.position.set(0.12, 0.14, -headSize * 0.95 / 2 - 0.04);
    headGroup.add(pinMesh);

    // Delicate carved wooden headband
    const bandGeo = new THREE.BoxGeometry(headSize + 0.03, 0.06, headSize * 0.95 + 0.03);
    const bandMesh = new THREE.Mesh(bandGeo, clothMat);
    bandMesh.position.set(0, 0.12, 0);
    headGroup.add(bandMesh);
  } else {
    // Barsam: Carved wooden cap / helm with geometric grain ridges
    const capGeo = new THREE.BoxGeometry(headSize + 0.06, 0.16, headSize * 0.95 + 0.06);
    const capMesh = new THREE.Mesh(capGeo, accentWoodMat);
    capMesh.position.set(0, headSize * 0.45, 0);
    capMesh.castShadow = true;
    headGroup.add(capMesh);

    // Brass brow rivet on wooden cap
    const rivetGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.04, 8);
    rivetGeo.rotateX(Math.PI / 2);
    const rivet = new THREE.Mesh(rivetGeo, brassJointMat);
    rivet.position.set(0, headSize * 0.45, headSize * 0.95 / 2 + 0.04);
    headGroup.add(rivet);
  }

  // -------------------------------------------------------------
  // LIMBS: BALL-AND-SOCKET JOINTS & CARVED WOODEN SEGMENTS
  // -------------------------------------------------------------
  const armWidth = isExplorer ? 0.13 : 0.2;
  const armLength = isExplorer ? 0.65 : 0.75;
  const armXOffset = isExplorer ? torsoWidth * 0.54 : torsoWidth * 0.58;

  // Function to create an articulated wooden limb with brass pins
  function createBallJoint(radius: number) {
    const jointGroup = new THREE.Group();
    const sphereGeo = new THREE.SphereGeometry(radius, 12, 12);
    const sphere = new THREE.Mesh(sphereGeo, accentWoodMat);
    jointGroup.add(sphere);

    // Brass axle pin through center
    const pinGeo = new THREE.CylinderGeometry(radius * 0.25, radius * 0.25, radius * 2.3, 8);
    pinGeo.rotateZ(Math.PI / 2);
    const pin = new THREE.Mesh(pinGeo, brassJointMat);
    jointGroup.add(pin);

    return jointGroup;
  }

  // Left Arm Group
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-armXOffset, torsoHeight * 0.65 + 0.24, 0);
  hips.add(leftArmGroup);

  const leftShoulderJoint = createBallJoint(armWidth * 0.75);
  leftArmGroup.add(leftShoulderJoint);

  const leftArmSegmentGeo = new THREE.BoxGeometry(armWidth, armLength * 0.5, armWidth);
  leftArmSegmentGeo.translate(0, -armLength * 0.25, 0);
  const leftUpperArm = new THREE.Mesh(leftArmSegmentGeo, mainWoodMat);
  leftUpperArm.castShadow = true;
  leftArmGroup.add(leftUpperArm);

  const leftElbowJoint = createBallJoint(armWidth * 0.65);
  leftElbowJoint.position.set(0, -armLength * 0.5, 0);
  leftArmGroup.add(leftElbowJoint);

  const leftForearmGeo = new THREE.BoxGeometry(armWidth * 0.9, armLength * 0.45, armWidth * 0.9);
  leftForearmGeo.translate(0, -armLength * 0.75, 0);
  const leftForearm = new THREE.Mesh(leftForearmGeo, mainWoodMat);
  leftForearm.castShadow = true;
  leftArmGroup.add(leftForearm);

  // Right Arm Group (Housing Unique Abilities)
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(armXOffset, torsoHeight * 0.65 + 0.24, 0);
  hips.add(rightArmGroup);

  const rightShoulderJoint = createBallJoint(armWidth * 0.75);
  rightArmGroup.add(rightShoulderJoint);

  const rightArmSegmentGeo = new THREE.BoxGeometry(armWidth, armLength * 0.5, armWidth);
  rightArmSegmentGeo.translate(0, -armLength * 0.25, 0);
  const rightUpperArm = new THREE.Mesh(rightArmSegmentGeo, mainWoodMat);
  rightUpperArm.castShadow = true;
  rightArmGroup.add(rightUpperArm);

  const rightElbowJoint = createBallJoint(armWidth * 0.65);
  rightElbowJoint.position.set(0, -armLength * 0.5, 0);
  rightArmGroup.add(rightElbowJoint);

  // Right Gauntlet (Nora's Spark Gauntlet vs Barsam's Aegis Bracer)
  const gauntletGeo = new THREE.BoxGeometry(armWidth * 1.4, armLength * 0.5, armWidth * 1.4);
  gauntletGeo.translate(0, -armLength * 0.75, 0);
  const gauntletMesh = new THREE.Mesh(gauntletGeo, runeGlowMat);
  gauntletMesh.castShadow = true;
  rightArmGroup.add(gauntletMesh);

  // Ability Effect Group (Lightning Tether vs Aegis Shield)
  const abilityGroup = new THREE.Group();
  abilityGroup.position.set(0, -armLength * 0.75, 0);
  rightArmGroup.add(abilityGroup);

  if (isExplorer) {
    // Nora's Spark Beam: Lightning spark rings and electrical conduit
    const beamGeo = new THREE.CylinderGeometry(0.04, 0.12, 2.5, 8);
    beamGeo.rotateX(Math.PI / 2);
    beamGeo.translate(0, 0, 1.25);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    abilityGroup.add(beam);

    const sparkRingGeo = new THREE.TorusGeometry(0.3, 0.04, 8, 16);
    sparkRingGeo.rotateY(Math.PI / 2);
    sparkRingGeo.translate(0, 0, 0.8);
    const sparkRing = new THREE.Mesh(sparkRingGeo, runeGlowMat);
    abilityGroup.add(sparkRing);
  } else {
    // Barsam's Titan Shield: Hexagonal energy barrier
    const shieldGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.08, 6);
    shieldGeo.rotateX(Math.PI / 2);
    shieldGeo.translate(0, 0, 0.75);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    abilityGroup.add(shield);
  }
  abilityGroup.visible = false;

  // Legs Rigging with Ball-and-Socket Joints
  const legWidth = isExplorer ? 0.16 : 0.23;
  const legLength = 0.85;
  const legXOffset = isExplorer ? pelvisWidth * 0.38 : pelvisWidth * 0.42;

  // Left Leg
  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(-legXOffset, 0, 0);
  hips.add(leftLegGroup);

  const leftHipJoint = createBallJoint(legWidth * 0.75);
  leftLegGroup.add(leftHipJoint);

  const leftThighGeo = new THREE.BoxGeometry(legWidth, legLength * 0.5, legWidth);
  leftThighGeo.translate(0, -legLength * 0.25, 0);
  const leftThigh = new THREE.Mesh(leftThighGeo, mainWoodMat);
  leftThigh.castShadow = true;
  leftLegGroup.add(leftThigh);

  const leftKneeJoint = createBallJoint(legWidth * 0.7);
  leftKneeJoint.position.set(0, -legLength * 0.5, 0);
  leftLegGroup.add(leftKneeJoint);

  const leftShinGeo = new THREE.BoxGeometry(legWidth * 0.9, legLength * 0.5, legWidth * 0.9);
  leftShinGeo.translate(0, -legLength * 0.75, 0);
  const leftShin = new THREE.Mesh(leftShinGeo, mainWoodMat);
  leftShin.castShadow = true;
  leftLegGroup.add(leftShin);

  // Carved wooden foot/shoe
  const leftFootGeo = new THREE.BoxGeometry(legWidth * 1.15, 0.12, legWidth * 1.55);
  const leftFoot = new THREE.Mesh(leftFootGeo, accentWoodMat);
  leftFoot.position.set(0, -legLength + 0.06, 0.06);
  leftLegGroup.add(leftFoot);

  // Right Leg
  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(legXOffset, 0, 0);
  hips.add(rightLegGroup);

  const rightHipJoint = createBallJoint(legWidth * 0.75);
  rightLegGroup.add(rightHipJoint);

  const rightThighGeo = new THREE.BoxGeometry(legWidth, legLength * 0.5, legWidth);
  rightThighGeo.translate(0, -legLength * 0.25, 0);
  const rightThigh = new THREE.Mesh(rightThighGeo, mainWoodMat);
  rightThigh.castShadow = true;
  rightLegGroup.add(rightThigh);

  const rightKneeJoint = createBallJoint(legWidth * 0.7);
  rightKneeJoint.position.set(0, -legLength * 0.5, 0);
  rightLegGroup.add(rightKneeJoint);

  const rightShinGeo = new THREE.BoxGeometry(legWidth * 0.9, legLength * 0.5, legWidth * 0.9);
  rightShinGeo.translate(0, -legLength * 0.75, 0);
  const rightShin = new THREE.Mesh(rightShinGeo, mainWoodMat);
  rightShin.castShadow = true;
  rightLegGroup.add(rightShin);

  const rightFootGeo = new THREE.BoxGeometry(legWidth * 1.15, 0.12, legWidth * 1.55);
  const rightFoot = new THREE.Mesh(rightFootGeo, accentWoodMat);
  rightFoot.position.set(0, -legLength + 0.06, 0.06);
  rightLegGroup.add(rightFoot);

  // -------------------------------------------------------------
  // FLOATING BILLBOARD NAMETAG & EMOTE CHAT BUBBLE
  // -------------------------------------------------------------
  const uiAnchor = new THREE.Group();
  uiAnchor.position.y = 2.45;
  group.add(uiAnchor);

  // Canvas-rendered crisp nametag
  const canvas = document.createElement('canvas');
  canvas.width = 440;
  canvas.height = 110;
  const ctx = canvas.getContext('2d')!;

  function drawNametag(text: string, roleTitle: string, colorHex: string) {
    ctx.clearRect(0, 0, 440, 110);

    // Carved wood rounded plaque background
    ctx.fillStyle = 'rgba(23, 15, 10, 0.92)';
    ctx.beginPath();
    ctx.roundRect(14, 12, 412, 86, 24);
    ctx.fill();

    // Wooden border with gold accent
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner subtle gold filigree line
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(22, 20, 396, 70);

    // Player Name
    ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 220, 45);

    // Role & Wood Title
    ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = colorHex;
    ctx.fillText(roleTitle, 220, 75);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const nametagSprite = new THREE.Sprite(spriteMat);
  nametagSprite.scale.set(3.4, 0.85, 1);
  uiAnchor.add(nametagSprite);

  // Floating Emote Bubble
  const emoteCanvas = document.createElement('canvas');
  emoteCanvas.width = 128;
  emoteCanvas.height = 128;
  const emoteCtx = emoteCanvas.getContext('2d')!;

  const emoteTexture = new THREE.CanvasTexture(emoteCanvas);
  const emoteSpriteMat = new THREE.SpriteMaterial({ map: emoteTexture, transparent: true });
  const emoteSprite = new THREE.Sprite(emoteSpriteMat);
  emoteSprite.scale.set(1.4, 1.4, 1);
  emoteSprite.position.y = 1.0;
  emoteSprite.visible = false;
  uiAnchor.add(emoteSprite);

  let emoteTimer: number | null = null;
  const emoteEmojis: Record<EmoteType, string> = {
    wave: '👋',
    cheer: '🎉',
    point: '👉',
    heart: '💖',
    think: '🤔',
  };

  // -------------------------------------------------------------
  // PROCEDURAL ANIMATION CONTROLLER (WOODEN MARIONETTE FEEL)
  // -------------------------------------------------------------
  let animTime = 0;

  function updateAnimation(state: AnimState, dt: number, speedRatio: number, abilityActive: boolean) {
    animTime += dt * (state === 'run' ? 9 * speedRatio : state === 'sprint' ? 14 * speedRatio : 3);

    abilityGroup.visible = abilityActive;

    if (abilityActive) {
      if (isExplorer) {
        // Nora's electric spark beam animation
        abilityGroup.scale.set(
          1 + Math.sin(animTime * 6) * 0.15,
          1 + Math.cos(animTime * 6) * 0.15,
          1
        );
      } else {
        // Barsam's shield pulse animation
        abilityGroup.rotation.z = Math.sin(animTime * 3) * 0.08;
      }
    }

    if (state === 'run' || state === 'sprint') {
      const stride = state === 'sprint' ? 1.4 : 0.95;
      const swing = Math.sin(animTime) * stride;

      // Marionette limbs swing with subtle articulated wooden click
      leftLegGroup.rotation.x = swing;
      rightLegGroup.rotation.x = -swing;

      leftArmGroup.rotation.x = -swing * 0.85;
      rightArmGroup.rotation.x = abilityActive ? -Math.PI / 2.4 : swing * 0.85;

      // Subtle wooden bobbing
      torsoMeshGroup.position.y = 0.24 + Math.abs(Math.sin(animTime * 2)) * 0.05;
      group.rotation.z = Math.sin(animTime) * 0.025;
    } else if (state === 'jump') {
      leftLegGroup.rotation.x = -0.55;
      rightLegGroup.rotation.x = -0.45;
      leftArmGroup.rotation.x = -1.2;
      rightArmGroup.rotation.x = abilityActive ? -Math.PI / 2.3 : -1.2;
      torsoMeshGroup.position.y = 0.28;
      group.rotation.z = 0;
    } else if (state === 'fall') {
      leftLegGroup.rotation.x = 0.35;
      rightLegGroup.rotation.x = -0.25;
      leftArmGroup.rotation.z = -0.55;
      rightArmGroup.rotation.z = 0.55;
      torsoMeshGroup.position.y = 0.24;
    } else {
      // Idle: Wooden breathing rhythm
      const breath = Math.sin(animTime * 0.5);
      torsoMeshGroup.position.y = 0.24 + breath * 0.02;
      headGroup.position.y = torsoHeight + 0.28 + breath * 0.012;

      leftLegGroup.rotation.x = 0;
      rightLegGroup.rotation.x = 0;
      leftArmGroup.rotation.x = breath * 0.04;
      rightArmGroup.rotation.x = abilityActive ? -Math.PI / 2.3 : -breath * 0.04;
      leftArmGroup.rotation.z = 0;
      rightArmGroup.rotation.z = 0;
      group.rotation.z = 0;
    }
  }

  function showEmote(emote: EmoteType) {
    const symbol = emoteEmojis[emote] || '💬';
    emoteCtx.clearRect(0, 0, 128, 128);

    // Carved wooden bubble circle
    emoteCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    emoteCtx.beginPath();
    emoteCtx.arc(64, 60, 52, 0, Math.PI * 2);
    emoteCtx.fill();

    emoteCtx.strokeStyle = isExplorer ? '#0ea5e9' : '#059669';
    emoteCtx.lineWidth = 5;
    emoteCtx.stroke();

    // Emoji icon
    emoteCtx.font = '52px sans-serif';
    emoteCtx.textAlign = 'center';
    emoteCtx.textBaseline = 'middle';
    emoteCtx.fillText(symbol, 64, 62);

    emoteTexture.needsUpdate = true;
    emoteSprite.visible = true;

    if (emoteTimer) window.clearTimeout(emoteTimer);
    emoteTimer = window.setTimeout(() => {
      emoteSprite.visible = false;
      emoteTimer = null;
    }, 3500);
  }

  function setNametag(name: string, isSelf: boolean) {
    const roleTitle = isExplorer ? '⚡ نورا (دختر چوبی) • Aether Spark' : '🛡️ برسام (پسر چوبی) • Oak Guardian';
    const colorHex = isExplorer ? '#38bdf8' : '#34d399';
    drawNametag(isSelf ? `${name} (شما)` : name, roleTitle, colorHex);
    texture.needsUpdate = true;
  }

  function dispose() {
    texture.dispose();
    emoteTexture.dispose();
    woodTexture.dispose();
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
  }

  return {
    group,
    role,
    updateAnimation,
    showEmote,
    setNametag,
    dispose,
    getAbilityMesh: () => abilityGroup,
  };
}
