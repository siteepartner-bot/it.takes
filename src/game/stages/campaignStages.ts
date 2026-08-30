import * as THREE from 'three';
import type { PuzzleState } from '../../types.ts';
import type { StageBuildResult, InteractiveObject } from './gardenStage.ts';
import { buildGardenStage } from './gardenStage.ts';
import { buildFloatingIslandsStage } from './floatingIslandsStage.ts';
import { buildClockworkStage } from './clockworkStage.ts';
import { buildMirrorChambersStage } from './mirrorChambersStage.ts';
import { buildHarmonyHallStage } from './harmonyHallStage.ts';
import { buildPrismTempleStage } from './prismTempleStage.ts';
import { buildGravityLabyrinthStage } from './gravityLabyrinthStage.ts';
import { buildCitadelStage } from './citadelStage.ts';
import { buildTowerOfBalanceStage } from './towerOfBalanceStage.ts';
import { buildDualPathsTempleStage } from './dualPathsTempleStage.ts';
import { buildFourChambersStage } from './fourChambersStage.ts';
import { buildOurLastPathStage } from './ourLastPathStage.ts';

/**
 * Universal Occupancy Set helper to track player IDs on buttons/plates.
 * Guarantees button is Pressed iff playersOnButton.size > 0
 * and Released ONLY when playersOnButton.size === 0.
 */
export class ButtonOccupancyTracker {
  private playersOnButton = new Set<string>();

  public onEnter(playerId: string): boolean {
    const wasEmpty = this.playersOnButton.size === 0;
    this.playersOnButton.add(playerId);
    return wasEmpty;
  }

  public onExit(playerId: string): boolean {
    this.playersOnButton.delete(playerId);
    return this.playersOnButton.size === 0;
  }

  public clear() {
    this.playersOnButton.clear();
  }

  public isPressed(): boolean {
    return this.playersOnButton.size > 0;
  }

  public getCount(): number {
    return this.playersOnButton.size;
  }
}

/**
 * Stateful Door Machine: Closed | Opening | Open | Closing
 */
export class StatefulDoor {
  public state: 'Closed' | 'Opening' | 'Open' | 'Closing' = 'Closed';
  public currentY: number;
  public closedY: number;
  public openY: number;
  public speed: number;
  public mesh: THREE.Object3D;

  constructor(mesh: THREE.Object3D, closedY: number, openY: number, speed = 6.0) {
    this.mesh = mesh;
    this.closedY = closedY;
    this.openY = openY;
    this.currentY = closedY;
    this.speed = speed;
    this.mesh.position.y = closedY;
  }

  public setTarget(wantOpen: boolean) {
    if (wantOpen) {
      if (this.state === 'Closed' || this.state === 'Closing') {
        this.state = 'Opening';
      }
    } else {
      if (this.state === 'Open' || this.state === 'Opening') {
        this.state = 'Closing';
      }
    }
  }

  public update(dt: number) {
    const targetY = (this.state === 'Opening' || this.state === 'Open') ? this.openY : this.closedY;
    const diff = targetY - this.currentY;
    if (Math.abs(diff) < 0.05) {
      this.currentY = targetY;
      this.state = targetY === this.openY ? 'Open' : 'Closed';
    } else {
      this.currentY += Math.sign(diff) * Math.min(Math.abs(diff), this.speed * dt);
    }
    this.mesh.position.y = this.currentY;
  }
}

/**
 * Master Campaign Stage Builder (Supports Stages 1 through 20)
 */
export function buildCampaignStage(stageId: number): StageBuildResult {
  // Delegate existing handcrafted stages 1-6 for backwards compatibility with enhanced features
  if (stageId === 1) return buildGardenStage();
  if (stageId === 2) return buildFloatingIslandsStage();
  if (stageId === 3) return buildMirrorChambersStage();
  if (stageId === 4) return buildHarmonyHallStage();
  if (stageId === 5) return buildGravityLabyrinthStage();
  if (stageId === 6) return buildDualPathsTempleStage();
  if (stageId === 7) return buildFourChambersStage();
  if (stageId === 8) return buildOurLastPathStage();

  // For stages 7 through 20, construct custom themed co-op stages
  const rootGroup = new THREE.Group();
  rootGroup.name = `stage_campaign_${stageId}`;

  const colliders: THREE.Box3[] = [];
  const interactiveObjects: InteractiveObject[] = [];

  // Theme Color Configurations per stage
  const themeColors: Record<number, { bg: number; floor: number; wall: number; accent: number; fog: number }> = {
    7: { bg: 0x0c4a6e, floor: 0x0284c7, wall: 0x0369a1, accent: 0x38bdf8, fog: 0x075985 }, // Flood
    8: { bg: 0x0f172a, floor: 0x334155, wall: 0x475569, accent: 0x38bdf8, fog: 0x1e293b }, // Floating
    9: { bg: 0x1e1b4b, floor: 0x4338ca, wall: 0x3730a3, accent: 0xa855f7, fog: 0x312e81 }, // Mirrors
    10: { bg: 0x292524, floor: 0x57534e, wall: 0x44403c, accent: 0xf59e0b, fog: 0x1c1917 }, // Train
    11: { bg: 0x14532d, floor: 0x16a34a, wall: 0x15803d, accent: 0x4ade80, fog: 0x166534 }, // Time
    12: { bg: 0x451a03, floor: 0x78350f, wall: 0x92400e, accent: 0xfbbf24, fog: 0x292524 }, // Library
    13: { bg: 0x022c22, floor: 0x065f46, wall: 0x047857, accent: 0x34d399, fog: 0x064e3b }, // Tunnels
    14: { bg: 0x030712, floor: 0x1f2937, wall: 0x111827, accent: 0x06b6d4, fog: 0x0b1329 }, // Silent City
    15: { bg: 0x2e1065, floor: 0x581c87, wall: 0x6b21a8, accent: 0xc084fc, fog: 0x3b0764 }, // Inverted
    16: { bg: 0x0f172a, floor: 0x334155, wall: 0x1e293b, accent: 0x60a5fa, fog: 0x0284c7 }, // Storm
    17: { bg: 0x312e81, floor: 0x4338ca, wall: 0x3730a3, accent: 0xf43f5e, fog: 0x1e1b4b }, // Choices
    18: { bg: 0x451a03, floor: 0x78350f, wall: 0xb45309, accent: 0xf59e0b, fog: 0x292524 }, // Boss
    19: { bg: 0x09090b, floor: 0x27272a, wall: 0x18181b, accent: 0xa855f7, fog: 0x000000 }, // Gauntlet
    20: { bg: 0x022c22, floor: 0x0f766e, wall: 0x115e59, accent: 0xfacc15, fog: 0x042f2e }, // Exit
  };

  const theme = themeColors[stageId] || themeColors[7];

  const floorMat = new THREE.MeshStandardMaterial({ color: theme.floor, roughness: 0.7, metalness: 0.2 });
  const wallMat = new THREE.MeshStandardMaterial({ color: theme.wall, roughness: 0.8, metalness: 0.3 });
  const accentMat = new THREE.MeshStandardMaterial({ color: theme.accent, emissive: theme.accent, emissiveIntensity: 0.5 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xeab308, emissiveIntensity: 0.6, metalness: 0.8 });

  // Main Base Ground
  const groundGeo = new THREE.BoxGeometry(36, 1, 60);
  const groundMesh = new THREE.Mesh(groundGeo, floorMat);
  groundMesh.position.set(0, -0.5, 25);
  groundMesh.receiveShadow = true;
  rootGroup.add(groundMesh);
  colliders.push(new THREE.Box3().setFromObject(groundMesh));

  // Boundary Walls
  const wallLeftGeo = new THREE.BoxGeometry(1, 8, 60);
  const wallLeft = new THREE.Mesh(wallLeftGeo, wallMat);
  wallLeft.position.set(-18, 4, 25);
  rootGroup.add(wallLeft);
  colliders.push(new THREE.Box3().setFromObject(wallLeft));

  const wallRight = new THREE.Mesh(wallLeftGeo, wallMat);
  wallRight.position.set(18, 4, 25);
  rootGroup.add(wallRight);
  colliders.push(new THREE.Box3().setFromObject(wallRight));

  // Stage Lore Tablet at Entrance
  const tabletGeo = new THREE.BoxGeometry(1.2, 1.8, 0.2);
  const tabletMesh = new THREE.Mesh(tabletGeo, accentMat);
  tabletMesh.position.set(-6, 1, 2);
  rootGroup.add(tabletMesh);

  interactiveObjects.push({
    id: `story_tablet_stage${stageId}`,
    type: 'lever',
    mesh: tabletMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-6, 1, 2), new THREE.Vector3(2.5, 2, 2.5)),
    prompt: `خواندن کتیبه راز مرحله ${stageId} (کلید E)`,
  });

  // Co-op Door & Gate Barrier System (Airtight wall spanning full 36m width)
  const wallDoorLeft = new THREE.Mesh(new THREE.BoxGeometry(13, 8, 1.2), wallMat);
  wallDoorLeft.position.set(-11.5, 4, 20);
  rootGroup.add(wallDoorLeft);
  colliders.push(new THREE.Box3().setFromObject(wallDoorLeft));

  const wallDoorRight = new THREE.Mesh(new THREE.BoxGeometry(13, 8, 1.2), wallMat);
  wallDoorRight.position.set(11.5, 4, 20);
  rootGroup.add(wallDoorRight);
  colliders.push(new THREE.Box3().setFromObject(wallDoorRight));

  const wallDoorTop = new THREE.Mesh(new THREE.BoxGeometry(36, 2.5, 1.4), wallMat);
  wallDoorTop.position.set(0, 7.0, 20);
  rootGroup.add(wallDoorTop);
  colliders.push(new THREE.Box3().setFromObject(wallDoorTop));

  const doorGeo = new THREE.BoxGeometry(10.4, 6, 0.8);
  const doorMesh = new THREE.Mesh(doorGeo, accentMat);
  doorMesh.position.set(0, 3, 20);
  doorMesh.castShadow = true;
  rootGroup.add(doorMesh);

  const doorColliderIndex = colliders.length;
  const doorCollider = new THREE.Box3().setFromObject(doorMesh);
  colliders.push(doorCollider);

  const statefulDoor = new StatefulDoor(doorMesh, 3, -3, 5.0);

  // Pressure Plate 1 (Requires occupancy tracking)
  const plateGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.2, 16);
  const plateMesh = new THREE.Mesh(plateGeo, accentMat);
  plateMesh.position.set(-6, 0.1, 10);
  rootGroup.add(plateMesh);

  const plateBounds = new THREE.Box3().setFromCenterAndSize(plateMesh.position, new THREE.Vector3(2.5, 1.5, 2.5));

  interactiveObjects.push({
    id: `pressure_plate_stage${stageId}`,
    type: 'pressure_plate',
    mesh: plateMesh,
    bounds: plateBounds,
    prompt: `ایستادن روی دکمه فشار برای باز کردن در (همکاری با هم‌تیمی)`,
  });

  // Co-op Switch / Lever 2 on partner side
  const leverBaseGeo = new THREE.BoxGeometry(0.8, 1.2, 0.8);
  const leverMesh = new THREE.Mesh(leverBaseGeo, goldMat);
  leverMesh.position.set(6, 0.6, 30);
  rootGroup.add(leverMesh);

  interactiveObjects.push({
    id: `lever_stage${stageId}`,
    type: 'lever',
    mesh: leverMesh,
    bounds: new THREE.Box3().setFromCenterAndSize(leverMesh.position, new THREE.Vector3(2.5, 2, 2.5)),
    prompt: `فعال‌سازی اهرم مکانیزم مرحله ${stageId} (کلید E)`,
  });

  // Exit Portal Pad
  const portalGeo = new THREE.CylinderGeometry(2.5, 2.8, 0.3, 24);
  const portalMesh = new THREE.Mesh(portalGeo, goldMat);
  portalMesh.position.set(0, 0.15, 50);
  rootGroup.add(portalMesh);

  const portalP1Mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.2, 16), accentMat);
  portalP1Mesh.position.set(-1.8, 0.25, 50);
  rootGroup.add(portalP1Mesh);

  const portalP2Mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.2, 16), accentMat);
  portalP2Mesh.position.set(1.8, 0.25, 50);
  rootGroup.add(portalP2Mesh);

  interactiveObjects.push({
    id: `portal_p1_stage${stageId}`,
    type: 'portal_pad',
    mesh: portalP1Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(portalP1Mesh.position, new THREE.Vector3(2, 2, 2)),
    prompt: `ایستادن رو سکوی خروج نیوشا`,
  });

  interactiveObjects.push({
    id: `portal_p2_stage${stageId}`,
    type: 'portal_pad',
    mesh: portalP2Mesh,
    bounds: new THREE.Box3().setFromCenterAndSize(portalP2Mesh.position, new THREE.Vector3(2, 2, 2)),
    prompt: `ایستادن روی سکوی خروج حسن`,
  });

  const checkpoints = [
    { id: 0, pos: [0, 1, 3] as [number, number, number], active: true, mesh: tabletMesh },
    { id: 1, pos: [0, 1, 28] as [number, number, number], active: false, mesh: leverMesh },
  ];

  return {
    rootGroup,
    colliders,
    interactiveObjects,
    spawnPoint: [0, 1, 3],
    checkpoints,
    update: (dt: number, state: PuzzleState) => {
      // Co-op Door state logic
      const plateActive = !!(state.customData && state.customData[`platePressed_${stageId}`]);
      const leverActive = !!(state.customData && state.customData[`leverActivated_${stageId}`]);

      // Pressure plate Y animation & emissive glow
      const targetPlateY = plateActive ? 0.02 : 0.1;
      plateMesh.position.y += (targetPlateY - plateMesh.position.y) * Math.min(1, dt * 10);
      (plateMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = plateActive ? 1.0 : 0.3;

      // Lever rotation & glow
      leverMesh.rotation.z += ((leverActive ? -0.5 : 0.5) - leverMesh.rotation.z) * Math.min(1, dt * 8);

      statefulDoor.setTarget(plateActive || leverActive);
      statefulDoor.update(dt);
      
      if (plateActive || leverActive || statefulDoor.state === 'Open') {
        colliders[doorColliderIndex].setFromCenterAndSize(new THREE.Vector3(0, -999, 0), new THREE.Vector3(0, 0, 0));
      } else {
        colliders[doorColliderIndex].setFromObject(doorMesh);
      }

      // Portal emissive feedback
      const p1Ready = !!(state.customData && state.customData[`stage${stageId}ExitP1Ready`]);
      const p2Ready = !!(state.customData && state.customData[`stage${stageId}ExitP2Ready`]);

      (portalP1Mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = p1Ready ? 1.0 : 0.2;
      (portalP2Mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = p2Ready ? 1.0 : 0.2;
    },
    dispose: () => {
      rootGroup.clear();
    },
  };
}
