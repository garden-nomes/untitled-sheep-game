import sheepNames from "./sheep-names";
import { dist, distSq, mag, mul, normalize } from "./vector";
import FootstepTrail from "./footstep-trail";
import { state } from "./main";
import { Tile } from "./map";

export enum SheepState {
  Idle,
  Walking,
  Running
}

export default class Sheep {
  animtimer = 0;
  state = SheepState.Idle;
  walkDirection = 0;
  walkTimer = 0;
  reverse = false;
  isMoving = false;
  switchDirectionCooldown = 0;
  name: string;
  footsteps = new FootstepTrail(this.x, this.y);

  constructor(public x: number, public y: number) {
    this.name = sheepNames[Math.floor(Math.random() * sheepNames.length)];

    this.footsteps.stride = 3;
    this.footsteps.width = 3;
    this.footsteps.color = palette.manatee;
  }

  update() {
    const { player } = state;

    if (
      this.state !== SheepState.Running &&
      distSq([this.x, this.y], [player.x, player.y]) < 32 * 32
    ) {
      this.state = SheepState.Running;
    }

    const px = this.x;
    const py = this.y;

    if (this.state === SheepState.Idle) {
      this.idle();
    } else if (this.state === SheepState.Walking) {
      this.walk();
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
    } else {
      this.isMoving = false;
    }

    this.footsteps.move(this.x, this.y);
  }

  idle() {
    const { grassState } = state;
    this.animtimer = 0;

    if (!this.isOnGrass && Math.random() < deltaTime * 4) {
      this.startWalking();
    } else if (this.isOnGrass) {
      grassState.munch(this.x, this.y);
    }
  }

  walk() {
    this.x += Math.cos(this.walkDirection) * 32 * deltaTime;
    this.y += Math.sin(this.walkDirection) * 32 * deltaTime;

    this.walkTimer -= deltaTime;
    if (this.walkTimer <= 0) {
      this.state = SheepState.Idle;
    }
  }

  run() {
    const { player, sheep } = state;

    if (distSq([this.x, this.y], [player.x, player.y]) > 96 * 96) {
      this.state = SheepState.Idle;
    }

    // flocking behaviors
    let steeringX = 0;
    let steeringY = 0;

    // escape player
    let fromPlayer = [this.x - player.x, this.y - player.y];
    let fromPlayerDist = mag(fromPlayer);
    if (fromPlayerDist > 0) {
      fromPlayer = mul(normalize(fromPlayer), Math.max(128 - fromPlayerDist, 0));

      steeringX += fromPlayer[0];
      steeringY += fromPlayer[1];
    }

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

    if (steeringX !== 0 || steeringY !== 0) {
      [steeringX, steeringY] = normalize([steeringX, steeringY]);
    }

    this.x += steeringX * 40 * deltaTime;
    this.y += steeringY * 40 * deltaTime;
  }

  onCollide() {
    this.state = SheepState.Idle;
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

  startWalking() {
    const grass = this.findGrassNearby();

    if (grass === null) {
      this.walkDirection = Math.random() * Math.PI * 2;
      this.walkTimer = 2;
    } else {
      const [grassX, grassY] = grass.map(x => x * 8 + 4);
      this.walkDirection = Math.atan2(grassY - this.y, grassX - this.x);
      this.walkTimer = dist([this.x, this.y], [grassX, grassY]) / 32;
    }

    this.state = SheepState.Walking;
  }

  findGrassNearby(): [number, number] | null {
    const { map, grassState } = state;
    const r = 6;
    const [gx, gy] = [Math.floor(this.x / 8), Math.floor(this.y / 8)];

    let closest: [number, number][] | null = null;

    for (let x0 = gx - r; x0 < gx + r; x0++) {
      for (let y0 = gy - r; y0 < gy + r; y0++) {
        const d2 = distSq([gx, gy], [x0, y0]);

        if (
          d2 < r * r &&
          map.get(x0, y0) === Tile.Grass &&
          !grassState.isMunched(x0 * 8, y0 * 8)
        ) {
          if (closest === null || d2 < distSq([gx, gy], closest[0])) {
            closest = [[x0, y0]];
          } else if (closest !== null && d2 === distSq([gx, gy], closest[0]))
            closest.push([x0, y0]);
        }
      }
    }

    return closest === null ? null : closest[~~(Math.random() * closest.length)];
  }

  get frame() {
    if (this.isMoving) {
      return 2 + (Math.floor(this.animtimer * 8) % 4);
    }

    return this.isOnGrass ? 1 : 0;
  }

  get isOnGrass() {
    const { map, grassState } = state;
    return (
      map.getWorld(this.x, this.y) === Tile.Grass && !grassState.isMunched(this.x, this.y)
    );
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
