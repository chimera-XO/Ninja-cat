import test from "node:test";
import assert from "node:assert/strict";

function computeGroundedObstacleY(surfaceTopY, spriteDisplayHeight, originY = 0.5) {
  return surfaceTopY - (1 - originY) * spriteDisplayHeight;
}

function overlapsAnyPlatform(x, y, halfW, halfH, surfaces, clearanceAboveSurface = 2) {
  const boxLeft = x - halfW;
  const boxRight = x + halfW;
  const boxTop = y - halfH;
  const boxBottom = y + halfH;
  return surfaces.some(
    (s) =>
      boxRight > s.left + 2 &&
      boxLeft < s.right - 2 &&
      boxBottom > s.topY - clearanceAboveSurface &&
      boxTop < s.bottomY
  );
}

test("grounded spike center aligns bottom flush with platform top surface", () => {
  const surfaceTopY = 444;
  const spikeHeight = 32;
  const spikeCenterY = computeGroundedObstacleY(surfaceTopY, spikeHeight, 0.5);
  assert.equal(spikeCenterY, 428);
  assert.equal(spikeCenterY + spikeHeight / 2, surfaceTopY);
});

test("coin above platform surface does not report platform overlap", () => {
  const surfaces = [{ left: 100, right: 500, topY: 444, bottomY: 572 }];
  const coinRadius = 16;
  const coinY = 444 - coinRadius - 28;
  assert.equal(overlapsAnyPlatform(250, coinY, coinRadius, coinRadius, surfaces, 8), false);
});

test("coin inside platform body is detected as overlapping", () => {
  const surfaces = [{ left: 100, right: 500, topY: 444, bottomY: 572 }];
  assert.equal(overlapsAnyPlatform(250, 452, 16, 16, surfaces, 8), true);
});
