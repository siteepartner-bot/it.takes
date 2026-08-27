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

export function createCharacterMesh(role: PlayerRole): CharacterControllerMesh {
  const group = new THREE.Group();
  group.name = `character_${role}`;

  const isExplorer = role === 'explorer';

  // --- Color Palettes ---
  const bodyColor = isExplorer ? 0x0ea5e9 : 0x059669;      // Cyan vs Emerald
  const accentColor = isExplorer ? 0xf59e0b : 0xd97706;    // Amber vs Bronze
  const darkCloth = isExplorer ? 0x1e293b : 0x0f172a;      // Dark slate vs Obsidian
  const glowColor = isExplorer ? 0x38bdf8 : 0x34d399;      // Light cyan vs Mint glow

  // Shared stylized materials
  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.35,
    metalness: 0.25,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.3,
    metalness: 0.4,
  });

  const darkMat = new THREE.MeshStandardMaterial({
    color: darkCloth,
    roughness: 0.6,
    metalness: 0.1,
  });

  const glowMat = new THREE.MeshStandardMaterial({
    color: glowColor,
    emissive: glowColor,
    emissiveIntensity: 0.8,
    roughness: 0.1,
  });

  const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // Root Hips
  const hips = new THREE.Group();
  hips.position.y = 0.9;
  group.add(hips);

  // Torso
  const torsoWidth = isExplorer ? 0.55 : 0.78;
  const torsoHeight = isExplorer ? 0.65 : 0.8;
  const torsoDepth = isExplorer ? 0.35 : 0.55;

  const torsoGeo = new THREE.BoxGeometry(torsoWidth, torsoHeight, torsoDepth);
  const torsoMesh = new THREE.Mesh(torsoGeo, bodyMat);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  torsoMesh.position.y = 0.35;
  hips.add(torsoMesh);

  // Character-specific Chest Details
  if (isExplorer) {
    // Utility belt & diagonal strap
    const strapGeo = new THREE.BoxGeometry(0.12, 0.7, 0.38);
    const strapMesh = new THREE.Mesh(strapGeo, accentMat);
    strapMesh.position.set(0.08, 0.35, 0);
    strapMesh.rotation.z = -0.25;
    hips.add(strapMesh);

    // Explorer Tech Backpack with dual antenna
    const packGeo = new THREE.BoxGeometry(0.4, 0.45, 0.25);
    const packMesh = new THREE.Mesh(packGeo, darkMat);
    packMesh.position.set(0, 0.4, -0.28);
    packMesh.castShadow = true;
    hips.add(packMesh);

    const antGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.35);
    const ant1 = new THREE.Mesh(antGeo, accentMat);
    ant1.position.set(0.12, 0.65, -0.28);
    ant1.rotation.z = -0.15;
    hips.add(ant1);

    const ant2 = new THREE.Mesh(antGeo, accentMat);
    ant2.position.set(-0.12, 0.65, -0.28);
    ant2.rotation.z = 0.15;
    hips.add(ant2);
  } else {
    // Guardian Chest Energy Core (Runic Hexagon)
    const coreGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.1, 6);
    coreGeo.rotateX(Math.PI / 2);
    const coreMesh = new THREE.Mesh(coreGeo, glowMat);
    coreMesh.position.set(0, 0.42, 0.26);
    hips.add(coreMesh);

    // Heavy shoulder armor pauldrons
    const pauldronGeo = new THREE.BoxGeometry(0.3, 0.2, 0.35);
    const leftPad = new THREE.Mesh(pauldronGeo, accentMat);
    leftPad.position.set(-0.52, 0.65, 0);
    leftPad.castShadow = true;
    hips.add(leftPad);

    const rightPad = new THREE.Mesh(pauldronGeo, accentMat);
    rightPad.position.set(0.52, 0.65, 0);
    rightPad.castShadow = true;
    hips.add(rightPad);
  }

  // Head
  const headGroup = new THREE.Group();
  headGroup.position.y = torsoHeight + 0.35;
  hips.add(headGroup);

  const headSize = isExplorer ? 0.38 : 0.46;
  const headGeo = new THREE.BoxGeometry(headSize, headSize, headSize);
  const headMesh = new THREE.Mesh(headGeo, isExplorer ? bodyMat : darkMat);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  if (isExplorer) {
    // Glowing Visor Goggles
    const visorGeo = new THREE.BoxGeometry(0.34, 0.12, 0.1);
    const visorMesh = new THREE.Mesh(visorGeo, glowMat);
    visorMesh.position.set(0, 0.04, headSize / 2 + 0.04);
    headGroup.add(visorMesh);

    // Adventurer cap / hair
    const capGeo = new THREE.BoxGeometry(headSize + 0.04, 0.14, headSize + 0.04);
    const capMesh = new THREE.Mesh(capGeo, accentMat);
    capMesh.position.set(0, headSize / 2 - 0.02, 0);
    headGroup.add(capMesh);
  } else {
    // Guardian Horns / Brow Crest
    const browGeo = new THREE.BoxGeometry(headSize + 0.08, 0.12, 0.2);
    const browMesh = new THREE.Mesh(browGeo, accentMat);
    browMesh.position.set(0, 0.12, headSize / 2 - 0.02);
    headGroup.add(browMesh);

    // Glowing Eye Slits
    const eyeGeo = new THREE.BoxGeometry(0.09, 0.04, 0.05);
    const leftEye = new THREE.Mesh(eyeGeo, glowMat);
    leftEye.position.set(-0.1, 0.02, headSize / 2 + 0.01);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, glowMat);
    rightEye.position.set(0.1, 0.02, headSize / 2 + 0.01);
    headGroup.add(rightEye);
  }

  // --- Limbs Rigging ---
  // Arms
  const armWidth = isExplorer ? 0.14 : 0.22;
  const armLength = isExplorer ? 0.65 : 0.75;
  const armXOffset = isExplorer ? 0.36 : 0.52;

  // Left Arm
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-armXOffset, 0.6, 0);
  hips.add(leftArmGroup);

  const leftArmGeo = new THREE.BoxGeometry(armWidth, armLength, armWidth);
  leftArmGeo.translate(0, -armLength / 2, 0);
  const leftArmMesh = new THREE.Mesh(leftArmGeo, darkMat);
  leftArmMesh.castShadow = true;
  leftArmGroup.add(leftArmMesh);

  // Right Arm (With Ability Gauntlet)
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(armXOffset, 0.6, 0);
  hips.add(rightArmGroup);

  const rightArmGeo = new THREE.BoxGeometry(armWidth, armLength, armWidth);
  rightArmGeo.translate(0, -armLength / 2, 0);
  const rightArmMesh = new THREE.Mesh(rightArmGeo, darkMat);
  rightArmMesh.castShadow = true;
  rightArmGroup.add(rightArmMesh);

  // Gauntlet Mesh on right hand
  const gauntletGeo = new THREE.BoxGeometry(armWidth * 1.35, armLength * 0.45, armWidth * 1.35);
  const gauntletMesh = new THREE.Mesh(gauntletGeo, glowMat);
  gauntletMesh.position.set(0, -armLength * 0.75, 0);
  rightArmGroup.add(gauntletMesh);

  // Legs
  const legWidth = isExplorer ? 0.16 : 0.24;
  const legLength = 0.85;
  const legXOffset = isExplorer ? 0.16 : 0.26;

  // Left Leg
  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(-legXOffset, 0, 0);
  hips.add(leftLegGroup);

  const leftLegGeo = new THREE.BoxGeometry(legWidth, legLength, legWidth);
  leftLegGeo.translate(0, -legLength / 2, 0);
  const leftLegMesh = new THREE.Mesh(leftLegGeo, darkMat);
  leftLegMesh.castShadow = true;
  leftLegGroup.add(leftLegMesh);

  const leftFootGeo = new THREE.BoxGeometry(legWidth * 1.1, 0.12, legWidth * 1.5);
  const leftFoot = new THREE.Mesh(leftFootGeo, accentMat);
  leftFoot.position.set(0, -legLength + 0.06, 0.05);
  leftLegGroup.add(leftFoot);

  // Right Leg
  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(legXOffset, 0, 0);
  hips.add(rightLegGroup);

  const rightLegGeo = new THREE.BoxGeometry(legWidth, legLength, legWidth);
  rightLegGeo.translate(0, -legLength / 2, 0);
  const rightLegMesh = new THREE.Mesh(rightLegGeo, darkMat);
  rightLegMesh.castShadow = true;
  rightLegGroup.add(rightLegMesh);

  const rightFootGeo = new THREE.BoxGeometry(legWidth * 1.1, 0.12, legWidth * 1.5);
  const rightFoot = new THREE.Mesh(rightFootGeo, accentMat);
  rightFoot.position.set(0, -legLength + 0.06, 0.05);
  rightLegGroup.add(rightFoot);

  // --- Overhead Floating UI & Emote Billboard ---
  const uiAnchor = new THREE.Group();
  uiAnchor.position.y = 2.4;
  group.add(uiAnchor);

  // Canvas-rendered crisp nametag
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;

  function drawNametag(text: string, roleTitle: string, colorHex: string) {
    ctx.clearRect(0, 0, 384, 96);

    // Pill background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(12, 12, 360, 72, 36);
    ctx.fill();

    // Border
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${text}`, 192, 38);

    // Subtitle / role
    ctx.fillStyle = colorHex;
    ctx.font = '600 18px sans-serif';
    ctx.fillText(roleTitle, 192, 65);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const nameSprite = new THREE.Sprite(spriteMat);
  nameSprite.scale.set(1.8, 0.45, 1);
  nameSprite.renderOrder = 999;
  uiAnchor.add(nameSprite);

  // Floating Emote Bubble
  const emoteCanvas = document.createElement('canvas');
  emoteCanvas.width = 128;
  emoteCanvas.height = 128;
  const emoteCtx = emoteCanvas.getContext('2d')!;
  const emoteTexture = new THREE.CanvasTexture(emoteCanvas);
  emoteTexture.minFilter = THREE.LinearFilter;
  const emoteSpriteMat = new THREE.SpriteMaterial({ map: emoteTexture, transparent: true, depthTest: false });
  const emoteSprite = new THREE.Sprite(emoteSpriteMat);
  emoteSprite.scale.set(0.9, 0.9, 1);
  emoteSprite.position.set(0, 0.85, 0);
  emoteSprite.visible = false;
  emoteSprite.renderOrder = 1000;
  uiAnchor.add(emoteSprite);

  let emoteTimer: number | null = null;
  const emoteEmojis: Record<EmoteType, string> = {
    wave: '👋',
    cheer: '🎉',
    point: '👉',
    heart: '💖',
    think: '🤔',
  };

  // --- Ability Effects Attachment ---
  const abilityGroup = new THREE.Group();
  abilityGroup.visible = false;
  group.add(abilityGroup);

  if (isExplorer) {
    // Spark Tether Beam / Electric conduit line
    const beamGeo = new THREE.CylinderGeometry(0.04, 0.04, 5, 8);
    beamGeo.rotateX(Math.PI / 2);
    beamGeo.translate(0, 0, 2.5);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.set(0.35, 1.2, 0);
    abilityGroup.add(beamMesh);

    // Spark light ring
    const ringGeo = new THREE.RingGeometry(0.3, 0.5, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9, side: THREE.DoubleSide });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(0.35, 1.2, 5);
    abilityGroup.add(ringMesh);
  } else {
    // Guardian Aegis Shield (Hexagonal translucent glowing energy barrier)
    const shieldGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.08, 6);
    shieldGeo.rotateX(Math.PI / 2);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x34d399,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.65,
      roughness: 0.2,
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.position.set(0, 1.2, 1.3);
    abilityGroup.add(shieldMesh);
  }

  // --- Animation State Variables ---
  let animTime = 0;

  function updateAnimation(state: AnimState, dt: number, speedRatio: number, abilityActive: boolean) {
    animTime += dt * 6.5 * Math.max(0.6, speedRatio);

    // Visibility of ability mesh
    abilityGroup.visible = abilityActive;
    if (abilityActive) {
      if (isExplorer) {
        // Pulse spark beam
        abilityGroup.scale.set(
          1 + Math.sin(animTime * 4) * 0.15,
          1 + Math.cos(animTime * 4) * 0.15,
          1
        );
      } else {
        // Pulse guardian shield
        abilityGroup.rotation.z = Math.sin(animTime * 2) * 0.05;
        (abilityGroup.children[0] as any).material.opacity = 0.6 + Math.sin(animTime * 5) * 0.2;
      }
    }

    if (state === 'run' || state === 'sprint') {
      const stride = state === 'sprint' ? 1.35 : 0.95;
      const swing = Math.sin(animTime) * stride;

      // Legs swing opposite
      leftLegGroup.rotation.x = swing;
      rightLegGroup.rotation.x = -swing;

      // Arms swing opposite to legs
      leftArmGroup.rotation.x = -swing * 0.8;
      rightArmGroup.rotation.x = abilityActive ? -Math.PI / 2.5 : swing * 0.8;

      // Subtle torso tilt & bounce
      torsoMesh.position.y = 0.35 + Math.abs(Math.sin(animTime * 2)) * 0.06;
      group.rotation.z = Math.sin(animTime) * 0.03;
    } else if (state === 'jump') {
      // Jump pose: legs tucked back, arms raised
      leftLegGroup.rotation.x = -0.5;
      rightLegGroup.rotation.x = -0.4;
      leftArmGroup.rotation.x = -1.2;
      rightArmGroup.rotation.x = abilityActive ? -Math.PI / 2.2 : -1.2;
      torsoMesh.position.y = 0.38;
      group.rotation.z = 0;
    } else if (state === 'fall') {
      // Falling pose
      leftLegGroup.rotation.x = 0.3;
      rightLegGroup.rotation.x = -0.2;
      leftArmGroup.rotation.z = -0.6;
      rightArmGroup.rotation.z = 0.6;
      torsoMesh.position.y = 0.35;
    } else {
      // Idle pose: gentle breathing
      const breath = Math.sin(animTime * 0.4);
      torsoMesh.position.y = 0.35 + breath * 0.02;
      headGroup.position.y = torsoHeight + 0.35 + breath * 0.015;

      leftLegGroup.rotation.x = 0;
      rightLegGroup.rotation.x = 0;
      leftArmGroup.rotation.x = breath * 0.05;
      rightArmGroup.rotation.x = abilityActive ? -Math.PI / 2.3 : -breath * 0.05;
      leftArmGroup.rotation.z = 0;
      rightArmGroup.rotation.z = 0;
      group.rotation.z = 0;
    }
  }

  function showEmote(emote: EmoteType) {
    const symbol = emoteEmojis[emote] || '💬';
    emoteCtx.clearRect(0, 0, 128, 128);

    // White circle bubble with shadow
    emoteCtx.fillStyle = '#ffffff';
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
    const roleTitle = isExplorer ? '⚡ SPARK EXPLORER' : '🛡️ STONE GUARDIAN';
    const colorHex = isExplorer ? '#38bdf8' : '#34d399';
    drawNametag(isSelf ? `${name} (You)` : name, roleTitle, colorHex);
    texture.needsUpdate = true;
  }

  function dispose() {
    texture.dispose();
    emoteTexture.dispose();
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
