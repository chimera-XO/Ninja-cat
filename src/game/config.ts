import * as Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { RunnerScene } from "./scenes/RunnerScene";

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export function createPhaserConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: "#0e112a",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 1850 },
        debug: false,
      },
    },
    scene: [BootScene, RunnerScene],
  };
}
