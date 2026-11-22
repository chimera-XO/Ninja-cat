import * as Phaser from "phaser";
import { NinjaCat } from "../entities/NinjaCat";
import { GAME_HEIGHT, GAME_WIDTH } from "../config";
import { computeDifficulty } from "../systems/DifficultySystem";
import {
  computeGroundedObstacleY,
  getPlatformBoundsX,
  getPlatformSurfaceTopY,
  overlapsAnyPlatform,
  overlapsExistingEntity,
  PlatformKind,
  PlatformSurfaceRect,
  SpawnedPlacement,
} from "../systems/SpawnSystem";
import { GameHudState, RunTelemetry } from "@/types/game";

type BiomeKey = "moonlit_temple" | "sakura_dawn" | "emerald_bamboo";
const BIOMES: BiomeKey[] = ["moonlit_temple", "sakura_dawn", "emerald_bamboo"];

export class RunnerScene extends Phaser.Scene {
  private cat!: NinjaCat;
  private skyLayer!: Phaser.GameObjects.TileSprite;
  private mountainLayer!: Phaser.GameObjects.TileSprite;
  private templeLayer!: Phaser.GameObjects.TileSprite;
  private lanternLayer!: Phaser.GameObjects.TileSprite;

  private platforms!: Phaser.Physics.Arcade.Group;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private coins!: Phaser.Physics.Arcade.Group;

  private mode: "menu" | "playing" | "paused" | "gameover" = "menu";
  private muted = false;
  private bgm?: Phaser.Sound.BaseSound;

  private baseSpeed = 340;
  private currentSpeed = 340;
  private distancePx = 0;
  private coinsCollected = 0;
  private runStartTime = 0;
  private nextSpawnX = 0;
  private biomeIndex = 0;
  private lastObstacleX = -9999;

  constructor() {
    super("RunnerScene");
  }

  create() {
    this.skyLayer = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "moonlit_temple_sky")
      .setOrigin(0, 0)
      .setTileScale(2, 2.11);
    this.mountainLayer = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "moonlit_temple_mountains")
      .setOrigin(0, 0)
      .setTileScale(2, 2.11);
    this.templeLayer = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "moonlit_temple_temples")
      .setOrigin(0, 0)
      .setTileScale(2, 2.11);
    this.lanternLayer = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "moonlit_temple_lanterns")
      .setOrigin(0, 0)
      .setTileScale(2, 2.11);

    this.platforms = this.physics.add.group({ allowGravity: false, immovable: true });
    this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true });
    this.coins = this.physics.add.group({ allowGravity: false, immovable: true });

    this.cat = new NinjaCat(this, 180, 320);

    this.physics.add.collider(this.cat, this.platforms);
    this.physics.add.overlap(this.cat, this.coins, (_cat, coinObj) => {
      const coin = coinObj as Phaser.Physics.Arcade.Sprite;
      const burst = this.add.sprite(coin.x, coin.y, "sparkle", 0).setScale(1.5);
      burst.play("sparkle-burst");
      burst.once("animationcomplete", () => burst.destroy());
      coin.destroy();
      this.coinsCollected += 1;
      this.cat.triggerCoinCollect();
      this.playSfx("sfx_coin", 0.55);
      this.emitHud();
    });

    this.physics.add.overlap(this.cat, this.obstacles, () => {
      if (this.mode === "playing") {
        this.handleGameOver();
      }
    });

    this.input.on("pointerdown", () => {
      if (this.mode === "playing") {
        this.cat.tryJump(() => this.playSfx("sfx_jump", 0.45));
      }
    });

    this.input.keyboard?.on("keydown-SPACE", () => {
      if (this.mode === "playing") {
        this.cat.tryJump(() => this.playSfx("sfx_jump", 0.45));
      }
    });
    this.input.keyboard?.on("keydown-UP", () => {
      if (this.mode === "playing") {
        this.cat.tryJump(() => this.playSfx("sfx_jump", 0.45));
      }
    });

    this.spawnInitialRunway();
    this.emitHud();
    this.game.events.emit("load-complete");
  }

  public startNewRun() {
    this.playSfx("sfx_click", 0.5);
    this.platforms.clear(true, true);
    this.obstacles.clear(true, true);
    this.coins.clear(true, true);

    this.distancePx = 0;
    this.coinsCollected = 0;
    this.currentSpeed = this.baseSpeed;
    this.biomeIndex = 0;
    this.lastObstacleX = -9999;
    this.applyBiome("moonlit_temple");
    this.runStartTime = performance.now();
    this.mode = "playing";
    this.physics.resume();

    this.spawnInitialRunway();
    this.cat.resetForRun(180, 310);

    if (this.cache.audio.exists("bgm")) {
      if (!this.bgm) {
        this.bgm = this.sound.add("bgm", { loop: true, volume: 0.28 });
      }
      if (!this.muted && !this.bgm.isPlaying) {
        this.bgm.play();
      }
    }
    this.emitHud();
  }

  public setPaused(paused: boolean) {
    if (paused && this.mode === "playing") {
      this.mode = "paused";
      this.physics.pause();
      this.bgm?.pause();
    } else if (!paused && this.mode === "paused") {
      this.mode = "playing";
      this.physics.resume();
      if (!this.muted) this.bgm?.resume();
    }
    this.emitHud();
  }

  public returnToMenu() {
    this.playSfx("sfx_click", 0.5);
    this.mode = "menu";
    this.physics.resume();
    this.bgm?.stop();
    this.platforms.clear(true, true);
    this.obstacles.clear(true, true);
    this.coins.clear(true, true);
    this.spawnInitialRunway();
    this.cat.resetForRun(180, 310);
    this.emitHud();
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    this.sound.mute = muted;
  }

  private playSfx(key: string, volume = 0.5) {
    if (!this.muted && this.cache.audio.exists(key)) {
      try {
        this.sound.play(key, { volume });
      } catch (error) {
        console.warn(`[Audio] Could not play "${key}":`, error);
      }
    }
  }

  private applyBiome(biome: BiomeKey) {
    this.skyLayer.setTexture(`${biome}_sky`);
    this.mountainLayer.setTexture(`${biome}_mountains`);
    this.templeLayer.setTexture(`${biome}_temples`);
    this.lanternLayer.setTexture(`${biome}_lanterns`);
  }

  private createPlatformTile(
    x: number,
    y: number,
    kind: PlatformKind,
    surfaces: PlatformSurfaceRect[]
  ): Phaser.Physics.Arcade.Sprite {
    const tile = this.platforms.create(x, y, kind) as Phaser.Physics.Arcade.Sprite;
    tile.setOrigin(0.5, 0.5);
    if (kind === "stone_platform") {
      tile.setScale(1, 2);
    }
    tile.refreshBody();

    const bounds = getPlatformBoundsX(tile);
    const topY = getPlatformSurfaceTopY(tile);
    surfaces.push({
      left: bounds.left,
      right: bounds.right,
      topY,
      bottomY: topY + tile.displayHeight,
      kind,
    });
    return tile;
  }

  private spawnInitialRunway() {
    const surfaces: PlatformSurfaceRect[] = [];
    for (let x = 0; x < 1152; x += 64) {
      this.createPlatformTile(x + 32, 476, "stone_platform", surfaces);
    }
    this.nextSpawnX = 1152;
  }

  private collectActiveSurfaces(): PlatformSurfaceRect[] {
    const list: PlatformSurfaceRect[] = [];
    this.platforms.children.each((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) return true;
      const bounds = getPlatformBoundsX(sprite);
      const topY = getPlatformSurfaceTopY(sprite);
      list.push({
        left: bounds.left,
        right: bounds.right,
        topY,
        bottomY: topY + sprite.displayHeight,
        kind: (sprite.texture.key as PlatformKind) || "stone_platform",
      });
      return true;
    });
    return list;
  }

  private spawnChunk() {
    const diff = computeDifficulty(this.distancePx, this.baseSpeed);
    const gapWidth = Phaser.Math.Between(diff.gapMin, diff.gapMax);
    const startX = this.nextSpawnX + gapWidth;
    const tileCount = Phaser.Math.Between(6, 11);
    const platformWidth = tileCount * 64;

    const isElevated = Math.random() > 0.62;
    const y = isElevated ? Phaser.Math.Between(355, 410) : 476;
    const textureKey: PlatformKind = isElevated
      ? Math.random() > 0.5
        ? "rooftop_platform"
        : "wooden_bridge"
      : "stone_platform";

    const chunkSurfaces: PlatformSurfaceRect[] = [];
    for (let i = 0; i < tileCount; i++) {
      this.createPlatformTile(startX + i * 64 + 32, y, textureKey, chunkSurfaces);
    }

    const surfaceTopY = chunkSurfaces[0].topY;
    const platformLeft = startX;
    const platformRight = startX + platformWidth;
    const placements: SpawnedPlacement[] = [];

    // 1. Place grounded or airborne obstacles with strict spacing & surface alignment
    const minObstacleSpacing = Math.max(240, Math.floor(diff.speed * 0.62));
    if (
      tileCount >= 6 &&
      startX - this.lastObstacleX >= minObstacleSpacing &&
      Math.random() < diff.obstacleChance
    ) {
      const safeMinX = platformLeft + 130;
      const safeMaxX = platformRight - 110;
      if (safeMaxX > safeMinX) {
        const obsX = Phaser.Math.Between(safeMinX, safeMaxX);
        const obsRoll = Math.random();

        if (obsRoll < 0.42) {
          // Spikes: sit flush on surfaceTopY (32px tall sprite, base at y=26..31)
          const spikes = this.obstacles.create(obsX, 0, "spikes") as Phaser.Physics.Arcade.Sprite;
          spikes.setOrigin(0.5, 0.5);
          const spikeY = computeGroundedObstacleY(surfaceTopY, spikes.displayHeight, 0.5);
          spikes.setPosition(obsX, spikeY);
          const body = spikes.body as Phaser.Physics.Arcade.Body;
          body.setSize(36, 20);
          body.setOffset(6, 8);
          placements.push({ x: obsX, y: spikeY, halfW: 24, halfH: 16 });
          this.lastObstacleX = obsX;
        } else if (obsRoll < 0.76) {
          // Wooden barrier: sit flush on surfaceTopY (48px tall sprite)
          const barrier = this.obstacles.create(obsX, 0, "wooden_barrier") as Phaser.Physics.Arcade.Sprite;
          barrier.setOrigin(0.5, 0.5);
          const barrierY = computeGroundedObstacleY(surfaceTopY, barrier.displayHeight, 0.5);
          barrier.setPosition(obsX, barrierY);
          const body = barrier.body as Phaser.Physics.Arcade.Body;
          body.setSize(26, 38);
          body.setOffset(5, 6);
          placements.push({ x: obsX, y: barrierY, halfW: 18, halfH: 24 });
          this.lastObstacleX = obsX;
        } else {
          // Spinning shuriken above jump arc
          const shurikenY = surfaceTopY - 86;
          const shuriken = this.obstacles.create(obsX, shurikenY, "shuriken", 0) as Phaser.Physics.Arcade.Sprite;
          shuriken.setScale(1.2);
          shuriken.play("shuriken-spin");
          shuriken.setData("vxExtra", -95);
          placements.push({ x: obsX, y: shurikenY, halfW: 20, halfH: 20 });
          this.lastObstacleX = obsX;
        }
      }
    }

    // 2. Optional upper floating platform with validated surface & coin arc
    if (tileCount >= 8 && Math.random() > 0.52) {
      const floatX = platformLeft + 150;
      const floatY = Math.max(220, surfaceTopY - 128);
      for (let f = 0; f < 3; f++) {
        const fp = this.createPlatformTile(
          floatX + f * 64,
          floatY,
          "floating_platform",
          chunkSurfaces
        );
        const fpTopY = getPlatformSurfaceTopY(fp);
        const coinScale = 1.35;
        const coinRadius = (24 * coinScale) / 2;
        // Coin sits cleanly above floating platform surface
        const fcY = fpTopY - coinRadius - 14;
        const fcX = fp.x;
        if (
          !overlapsAnyPlatform(fcX, fcY, coinRadius, coinRadius, chunkSurfaces, 6) &&
          !overlapsExistingEntity(fcX, fcY, coinRadius, coinRadius, placements)
        ) {
          const fc = this.coins.create(fcX, fcY, "gold-coin", 0) as Phaser.Physics.Arcade.Sprite;
          fc.setScale(coinScale);
          fc.play("coin-spin");
          placements.push({ x: fcX, y: fcY, halfW: coinRadius, halfH: coinRadius });
        }
      }
    }

    // 3. Spawn intentional coin arc above the main platform surface, never inside platforms or obstacles
    const allSurfaces = [...this.collectActiveSurfaces(), ...chunkSurfaces];
    const coinScale = 1.35;
    const coinRadius = (24 * coinScale) / 2;
    const coinCount = Phaser.Math.Between(3, 5);
    const arcSpan = Math.min(220, platformWidth - 140);
    const arcStartX = platformLeft + 75;

    for (let c = 0; c < coinCount; c++) {
      const t = coinCount > 1 ? c / (coinCount - 1) : 0.5;
      const cx = arcStartX + t * arcSpan;
      const arcLift = Math.sin(t * Math.PI) * 44;
      // Guaranteed above surfaceTopY by at least 26px + coinRadius
      const cy = surfaceTopY - coinRadius - 26 - arcLift;

      if (
        !overlapsAnyPlatform(cx, cy, coinRadius, coinRadius, allSurfaces, 8) &&
        !overlapsExistingEntity(cx, cy, coinRadius, coinRadius, placements)
      ) {
        const coin = this.coins.create(cx, cy, "gold-coin", 0) as Phaser.Physics.Arcade.Sprite;
        coin.setScale(coinScale);
        coin.play("coin-spin");
        placements.push({ x: cx, y: cy, halfW: coinRadius, halfH: coinRadius });
      }
    }

    this.nextSpawnX = platformRight;
  }

  private handleGameOver() {
    this.mode = "gameover";
    this.bgm?.stop();
    this.cat.triggerDeath(() => this.playSfx("sfx_hit", 0.65));
    this.time.delayedCall(350, () => this.playSfx("sfx_gameover", 0.55));

    const distanceMeters = Math.floor(this.distancePx / 40);
    const finalScore = distanceMeters * 10 + this.coinsCollected * 25;
    const telemetry: RunTelemetry = {
      score: finalScore,
      distance: distanceMeters,
      coinsCollected: this.coinsCollected,
      durationMs: Math.max(500, Math.round(performance.now() - this.runStartTime)),
      runNonce: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    };

    this.game.events.emit("run-gameover", telemetry);
    this.emitHud();
  }

  private emitHud() {
    const distanceMeters = Math.floor(this.distancePx / 40);
    const score = distanceMeters * 10 + this.coinsCollected * 25;
    const state: GameHudState = {
      status: this.mode,
      score,
      distance: distanceMeters,
      coins: this.coinsCollected,
      biome: BIOMES[this.biomeIndex],
      isNewRecord: false,
    };
    this.game.events.emit("hud-update", state);
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;

    if (this.mode === "menu") {
      this.skyLayer.tilePositionX += 6 * dt;
      this.mountainLayer.tilePositionX += 16 * dt;
      this.templeLayer.tilePositionX += 32 * dt;
      this.lanternLayer.tilePositionX += 52 * dt;
      this.cat.updateState(delta, false, () => {});
      return;
    }

    if (this.mode !== "playing") return;

    const diff = computeDifficulty(this.distancePx, this.baseSpeed);
    this.currentSpeed = diff.speed;
    const dx = this.currentSpeed * dt;
    this.distancePx += dx;
    this.nextSpawnX -= dx;
    this.lastObstacleX -= dx;

    if (diff.biomeIndex !== this.biomeIndex) {
      this.biomeIndex = diff.biomeIndex;
      this.applyBiome(BIOMES[this.biomeIndex]);
    }

    this.skyLayer.tilePositionX += dx * 0.04;
    this.mountainLayer.tilePositionX += dx * 0.12;
    this.templeLayer.tilePositionX += dx * 0.28;
    this.lanternLayer.tilePositionX += dx * 0.48;

    while (this.nextSpawnX < GAME_WIDTH + 320) {
      this.spawnChunk();
    }

    const moveAndCull = (group: Phaser.Physics.Arcade.Group) => {
      group.children.each((child) => {
        const sprite = child as Phaser.Physics.Arcade.Sprite;
        const extraX = (sprite.getData("vxExtra") as number) || 0;
        const extraY = (sprite.getData("vyExtra") as number) || 0;
        sprite.x -= dx - extraX * dt;
        sprite.y += extraY * dt;
        if (sprite.body && "updateFromGameObject" in sprite.body) {
          (sprite.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
        }
        if (sprite.x < -160 || sprite.y > GAME_HEIGHT + 120) {
          sprite.destroy();
        }
        return true;
      });
    };

    moveAndCull(this.platforms);
    moveAndCull(this.obstacles);
    moveAndCull(this.coins);

    this.cat.x = 180;
    this.cat.updateState(delta, true, () => this.playSfx("sfx_step", 0.2));

    if (this.cat.y > GAME_HEIGHT + 40) {
      this.handleGameOver();
      return;
    }

    this.emitHud();
  }
}
