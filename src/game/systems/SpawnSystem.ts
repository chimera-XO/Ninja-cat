import * as Phaser from "phaser";

export type PlatformKind =
  | "stone_platform"
  | "rooftop_platform"
  | "wooden_bridge"
  | "floating_platform";

export interface PlatformSurfaceRect {
  left: number;
  right: number;
  topY: number;
  bottomY: number;
  kind: PlatformKind;
}

export interface SpawnedPlacement {
  x: number;
  y: number;
  halfW: number;
  halfH: number;
}

/**
 * Computes the exact world top-surface Y coordinate of a platform sprite
 * taking into account origin (default 0.5), scaleY, and texture height.
 */
export function getPlatformSurfaceTopY(platform: Phaser.GameObjects.Sprite): number {
  const height = platform.displayHeight || platform.height;
  return platform.y - height * platform.originY;
}

/**
 * Computes the exact world horizontal bounds of a platform sprite.
 */
export function getPlatformBoundsX(platform: Phaser.GameObjects.Sprite): {
  left: number;
  right: number;
} {
  const width = platform.displayWidth || platform.width;
  const left = platform.x - width * platform.originX;
  return { left, right: left + width };
}

/**
 * Checks whether an axis-aligned box [x - halfW, x + halfW] x [y - halfH, y + halfH]
 * overlaps any platform surface or body (with optional vertical margin above topY).
 */
export function overlapsAnyPlatform(
  x: number,
  y: number,
  halfW: number,
  halfH: number,
  surfaces: PlatformSurfaceRect[],
  clearanceAboveSurface = 2
): boolean {
  const boxLeft = x - halfW;
  const boxRight = x + halfW;
  const boxTop = y - halfH;
  const boxBottom = y + halfH;

  for (const s of surfaces) {
    const horizOverlap = boxRight > s.left + 2 && boxLeft < s.right - 2;
    const vertOverlap = boxBottom > s.topY - clearanceAboveSurface && boxTop < s.bottomY;
    if (horizOverlap && vertOverlap) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether two placed entities (coins or obstacles) overlap within a safety margin.
 */
export function overlapsExistingEntity(
  x: number,
  y: number,
  halfW: number,
  halfH: number,
  existing: SpawnedPlacement[],
  padX = 16,
  padY = 14
): boolean {
  for (const item of existing) {
    const dx = Math.abs(x - item.x);
    const dy = Math.abs(y - item.y);
    if (dx < halfW + item.halfW + padX && dy < halfH + item.halfH + padY) {
      return true;
    }
  }
  return false;
}

/**
 * Computes the exact center Y for a ground/platform-resting obstacle (like spikes or barrier)
 * so its visual bottom sits flush on `surfaceTopY` and its physics body aligns with the visible art.
 */
export function computeGroundedObstacleY(
  surfaceTopY: number,
  spriteDisplayHeight: number,
  originY = 0.5
): number {
  // bottom = y + (1 - originY) * displayHeight === surfaceTopY
  return surfaceTopY - (1 - originY) * spriteDisplayHeight;
}
