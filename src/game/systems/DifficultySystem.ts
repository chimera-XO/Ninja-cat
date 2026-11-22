export interface DifficultyParams {
  speed: number;
  gapMin: number;
  gapMax: number;
  obstacleChance: number;
  biomeIndex: number;
}

export function computeDifficulty(distancePx: number, baseSpeed = 340): DifficultyParams {
  const level = Math.min(1, distancePx / 35000);
  return {
    speed: Math.min(760, baseSpeed + distancePx * 0.0085),
    gapMin: Math.floor(115 + level * 25),
    gapMax: Math.floor(175 + level * 95),
    obstacleChance: Math.min(0.88, 0.52 + level * 0.34),
    biomeIndex: Math.floor(distancePx / 14000) % 3,
  };
}
