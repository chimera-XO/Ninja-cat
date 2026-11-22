import * as Phaser from "phaser";

export function registerCharacterAnimations(scene: Phaser.Scene) {
  if (!scene.anims.exists("cat-sleep")) {
    scene.anims.create({
      key: "cat-sleep",
      frames: scene.anims.generateFrameNumbers("ninja-cat-sleep", { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
    });
  }
  if (!scene.anims.exists("cat-idle")) {
    scene.anims.create({
      key: "cat-idle",
      frames: scene.anims.generateFrameNumbers("ninja-cat", { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1,
    });
  }
  if (!scene.anims.exists("cat-run")) {
    scene.anims.create({
      key: "cat-run",
      frames: scene.anims.generateFrameNumbers("ninja-cat", { start: 4, end: 9 }),
      frameRate: 14,
      repeat: -1,
    });
  }
  if (!scene.anims.exists("cat-jump")) {
    scene.anims.create({
      key: "cat-jump",
      frames: scene.anims.generateFrameNumbers("ninja-cat", { start: 10, end: 11 }),
      frameRate: 10,
      repeat: 0,
    });
  }
  if (!scene.anims.exists("cat-fall")) {
    scene.anims.create({
      key: "cat-fall",
      frames: scene.anims.generateFrameNumbers("ninja-cat", { start: 12, end: 13 }),
      frameRate: 10,
      repeat: -1,
    });
  }
  if (!scene.anims.exists("cat-land")) {
    scene.anims.create({
      key: "cat-land",
      frames: scene.anims.generateFrameNumbers("ninja-cat", { start: 14, end: 15 }),
      frameRate: 16,
      repeat: 0,
    });
  }
  if (!scene.anims.exists("cat-hurt")) {
    scene.anims.create({
      key: "cat-hurt",
      frames: scene.anims.generateFrameNumbers("ninja-cat", { start: 16, end: 17 }),
      frameRate: 12,
      repeat: 0,
    });
  }
  if (!scene.anims.exists("cat-death")) {
    scene.anims.create({
      key: "cat-death",
      frames: scene.anims.generateFrameNumbers("ninja-cat", { start: 18, end: 20 }),
      frameRate: 8,
      repeat: 0,
    });
  }
  if (!scene.anims.exists("cat-coin")) {
    scene.anims.create({
      key: "cat-coin",
      frames: scene.anims.generateFrameNumbers("ninja-cat", { start: 21, end: 23 }),
      frameRate: 14,
      repeat: 0,
    });
  }
  if (!scene.anims.exists("coin-spin")) {
    scene.anims.create({
      key: "coin-spin",
      frames: scene.anims.generateFrameNumbers("gold-coin", { start: 0, end: 5 }),
      frameRate: 12,
      repeat: -1,
    });
  }
  if (!scene.anims.exists("shuriken-spin")) {
    scene.anims.create({
      key: "shuriken-spin",
      frames: scene.anims.generateFrameNumbers("shuriken", { start: 0, end: 3 }),
      frameRate: 18,
      repeat: -1,
    });
  }
  if (!scene.anims.exists("sparkle-burst")) {
    scene.anims.create({
      key: "sparkle-burst",
      frames: scene.anims.generateFrameNumbers("sparkle", { start: 0, end: 3 }),
      frameRate: 16,
      repeat: 0,
    });
  }
}
