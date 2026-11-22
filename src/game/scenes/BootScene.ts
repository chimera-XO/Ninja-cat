import * as Phaser from "phaser";
import { registerCharacterAnimations } from "../animations/characterAnimations";

export class BootScene extends Phaser.Scene {
  private failedFiles: string[] = [];

  constructor() {
    super("BootScene");
  }

  preload() {
    this.failedFiles = [];

    this.load.on("progress", (value: number) => {
      this.game.events.emit("load-progress", Math.round(value * 100));
    });

    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      this.failedFiles.push(file.key);
    });

    this.load.spritesheet("ninja-cat-sleep", "/assets/characters/ninja-cat-sleep.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet("ninja-cat", "/assets/characters/ninja-cat-spritesheet.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet("gold-coin", "/assets/collectibles/gold_coin_sheet.png", {
      frameWidth: 24,
      frameHeight: 24,
    });
    this.load.spritesheet("shuriken", "/assets/obstacles/shuriken_sheet.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("sparkle", "/assets/effects/sparkle_sheet.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    for (const biome of ["moonlit_temple", "sakura_dawn", "emerald_bamboo"]) {
      this.load.image(`${biome}_sky`, `/assets/backgrounds/${biome}_sky.png`);
      this.load.image(`${biome}_mountains`, `/assets/backgrounds/${biome}_mountains.png`);
      this.load.image(`${biome}_temples`, `/assets/backgrounds/${biome}_temples.png`);
      this.load.image(`${biome}_lanterns`, `/assets/backgrounds/${biome}_lanterns.png`);
    }

    this.load.image("stone_platform", "/assets/platforms/stone_platform.png");
    this.load.image("rooftop_platform", "/assets/platforms/rooftop_platform.png");
    this.load.image("wooden_bridge", "/assets/platforms/wooden_bridge.png");
    this.load.image("floating_platform", "/assets/platforms/floating_platform.png");

    this.load.image("spikes", "/assets/obstacles/spikes.png");
    this.load.image("wooden_barrier", "/assets/obstacles/wooden_barrier.png");
    this.load.image("falling_fireball", "/assets/obstacles/falling_fireball.png");

    this.load.audio("bgm", "/assets/audio/bgm_ninja_run.wav");
    this.load.audio("sfx_jump", "/assets/audio/jump.wav");
    this.load.audio("sfx_coin", "/assets/audio/coin.wav");
    this.load.audio("sfx_hit", "/assets/audio/hit.wav");
    this.load.audio("sfx_gameover", "/assets/audio/gameover.wav");
    this.load.audio("sfx_step", "/assets/audio/step.wav");
    this.load.audio("sfx_click", "/assets/audio/ui_click.wav");
  }

  create() {
    registerCharacterAnimations(this);
    if (this.failedFiles.length > 0) {
      this.game.events.emit(
        "load-warning",
        `Some assets had load issues (${this.failedFiles.join(", ")}), continuing with fallbacks.`
      );
    }
    this.scene.start("RunnerScene");
  }
}
