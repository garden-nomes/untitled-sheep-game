import { palette } from "./sprites";
import sheepNames from "./sheep-names";
import { distSq, mag, mul, normalize } from "./vector";
import FootstepTrail from "./footstep-trail";
import { state } from "./main";

const { player, sheep } = state;

export enum SheepState {
  Standing,
  Walking,
  Running
}

export default class Sheep {
  animtimer = 0;
  state = SheepState.Standing;
  walkDirection = 0;
  walkTimer = 0;
  reverse = false;
  isMoving = false;
  switchDirectionCooldown = 0;
  name = "Baba";
  footsteps = new FootstepTrail(this.x, this.y);

  constructor(public x: number, public y: number) {
    this.name = sheepNames[Math.floor(Math.random() * sheepNames.length)];

    this.footsteps.stride = 3;
    this.footsteps.width = 3;
    this.footsteps.color = palette.manatee;
  }

  update() {
    if (
      this.state !== SheepState.Running &&
      distSq([this.x, this.y], [player.x, player.y]) < 32 * 32
    ) {
      this.state = SheepState.Running;
    }

    const px = this.x;
    const py = this.y;

    if (this.state === SheepState.Standing) {
      this.animtimer = 0;

      if (Math.random() < deltaTime / 5) {
        this.walkDirection = Math.random() * Math.PI * 2;
        this.walkTimer = 2;
        this.state = SheepState.Walking;
      }
    } else if (this.state === SheepState.Walking) {
      this.x += Math.cos(this.walkDirection) * 32 * deltaTime;
      this.y += Math.sin(this.walkDirection) * 32 * deltaTime;

      this.walkTimer -= deltaTime;
      if (this.walkTimer <= 0) {
        this.state = SheepState.Standing;
      }
    } else if (this.state === SheepState.Running) {
      this.run();
    }

    this.switchDirectionCooldown -= deltaTime;
    if (this.x !== px || this.y !== py) {
      if (this.switchDirectionCooldown <= 0) {
        if (this.x < px) {
          this.reverse = false;
          this.switchDirectionCooldown = 0.5;
        }

        if (this.x > px) {
          this.reverse = true;
          this.switchDirectionCooldown = 0.5;
        }
      }
      this.isMoving = true;
      this.animtimer += deltaTime;
    }

    this.footsteps.move(this.x, this.y);
  }

  run() {
    if (distSq([this.x, this.y], [player.x, player.y]) > 96 * 96) {
      this.state = SheepState.Standing;
    }

    // flocking behaviors
    let steeringX = 0;
    let steeringY = 0;

    // escape player
    let fromPlayer = [this.x - player.x, this.y - player.y];
    let fromPlayerDist = mag(fromPlayer);
    fromPlayer = mul(normalize(fromPlayer), Math.max(128 - fromPlayerDist, 0));

    steeringX += fromPlayer[0];
    steeringY += fromPlayer[1];

    // cohere to and seperate from neighbors
    let [centerX, centerY] = [0, 0];
    let neighborCount = 0;
    for (const other of sheep.onscreen) {
      if (other === this || other.state !== SheepState.Running) continue;
      if (distSq([other.x, other.y], [this.x, this.y]) > 96 * 96) continue;

      // seperation
      let fromOther = [this.x - other.x, this.y - other.y];
      let fromOtherDist = mag(fromOther);
      fromOther = mul(
        normalize(fromOther),
        Math.max(16 * 16 - fromOtherDist * fromOtherDist, 0) * 2
      );
      steeringX += fromOther[0];
      steeringY += fromOther[1];

      centerX += other.x;
      centerY += other.y;
      neighborCount++;
    }

    // cohere
    if (neighborCount > 0) {
      centerX /= neighborCount;
      centerY /= neighborCount;

      const toCenterNorm = normalize([centerX - this.x, centerY - this.y]);
      steeringX += toCenterNorm[0] * 64;
      steeringY += toCenterNorm[1] * 64;
    }

    [steeringX, steeringY] = normalize([steeringX, steeringY]);

    this.x += steeringX * 40 * deltaTime;
    this.y += steeringY * 40 * deltaTime;
  }

  showForceDebug([x, y]: number[], color = palette.tumbleweed) {
    renderer.line(
      this.x,
      this.y,
      this.x + x * 0.2,
      this.y + y * 0.2,
      color,
      Number.POSITIVE_INFINITY
    );
  }

  onCollide() {
    this.state = SheepState.Standing;
  }

  resolveAabbCollision(ox: number, oy: number, ow: number, oh: number) {
    const [x, y, w, h] = [this.x - 4, this.y - 4, 8, 4];

    const dx = x + w / 2 - ox - ow / 2;
    const px = ow / 2 + w / 2 - Math.abs(dx);
    if (px > 0) {
      const dy = y + h / 2 - oy - oh / 2;
      const py = oh / 2 + h / 2 - Math.abs(dy);
      if (py > 0) {
        if (px < py) {
          this.x += px * (Math.abs(dx) / dx);
        } else {
          this.y += py * (Math.abs(dy) / dy);
        }

        this.onCollide();
      }
    }
  }

  get frame() {
    if (this.isMoving) {
      return 2 + (Math.floor(this.animtimer * 8) % 4);
    }

    return 0;
  }

  draw() {
    renderer.spr("sheep", this.x - 8, this.y - 16, this.frame, this.reverse, this.y);
    this.footsteps.draw();

    // if (distSq(this.x, this.y, player.x, player.y) < 16 * 16) {
    //   renderer.text(
    //     this.name,
    //     this.x,
    //     this.y - 20 + Math.sin(elapsed * 3),
    //     TextAlign.Center,
    //     palette.black,
    //     palette.timberwolf
    //   );
    // }
  }
}
