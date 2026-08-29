import { buildLostBridgesStage } from './lostBridgesStage.ts';
import type { StageBuildResult } from './gardenStage.ts';

export function buildGravityLabyrinthStage(): StageBuildResult {
  return buildLostBridgesStage();
}
