import * as Phaser from "phaser";

export class NinjaCat extends Phaser.Physics.Arcade.Sprite {
  private jumpCount = 0;
  private readonly maxJumps = 2;
  private wasOnGround = false;
  private isDead = false;
  private animOverrideTimer = 0;
  private stepTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "ninja-cat", 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(1.65);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(24, 42);
    body.setOffset(20, 17);
    body.setCollideWorldBounds(false);

    this.play("cat-idle");
  }

  public resetForRun(x: number, y: number) {
    this.isDead = false;
    this.jumpCount = 0;
    this.wasOnGround = false;
    this.animOverrideTimer = 0;
    this.setPosition(x, y);
    this.setVelocity(0, 0);
    this.setAlpha(1);
    this.play("cat-run", true);
  }

  public tryJump(playSfx: () => void): boolean {
    if (this.isDead) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const onFloor = body.blocked.down || body.touching.down;

    if (onFloor) {
      this.jumpCount = 0;
    }

    if (this.jumpCount < this.maxJumps) {
      const velocityY = this.jumpCount === 0 ? -740 : -650;
      this.setVelocityY(velocityY);
      this.jumpCount += 1;
      this.animOverrideTimer = 0;
      this.play("cat-jump", true);
      playSfx();
      return true;
    }
    return false;
  }

  public triggerCoinCollect() {
    if (this.isDead) return;
    this.animOverrideTimer = 220;
    this.play("cat-coin", true);
  }

  public triggerDeath(playHitSfx: () => void) {
    if (this.isDead) return;
    this.isDead = true;
    this.setVelocity(-120, -320);
    this.play("cat-hurt", true);
    playHitSfx();
    this.scene.time.delayedCall(220, () => {
      this.play("cat-death", true);
    });
  }

  public updateState(delta: number, isRunning: boolean, playStepSfx: () => void) {
    if (this.isDead) return;
    if (!isRunning) {
      if (this.anims.currentAnim?.key !== "cat-idle") {
        this.play("cat-idle", true);
      }
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const onGround = body.blocked.down || body.touching.down;

    if (onGround) {
      this.jumpCount = 0;
      if (!this.wasOnGround) {
        this.animOverrideTimer = 130;
        this.play("cat-land", true);
      }
      this.stepTimer += delta;
      if (this.stepTimer >= 230) {
        this.stepTimer = 0;
        playStepSfx();
      }
    }

    this.wasOnGround = onGround;

    if (this.animOverrideTimer > 0) {
      this.animOverrideTimer -= delta;
      return;
    }

    if (!onGround) {
      if (body.velocity.y < -40) {
        if (this.anims.currentAnim?.key !== "cat-jump") this.play("cat-jump", true);
      } else {
        if (this.anims.currentAnim?.key !== "cat-fall") this.play("cat-fall", true);
      }
    } else if (this.anims.currentAnim?.key !== "cat-run") {
      this.play("cat-run", true);
    }
  }
}
