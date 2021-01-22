import "./style.css";
import loop from "./framework";
import generateMap from "./generate-map";
import { Tile } from "./map";
import { palette } from "./sprites";
import { TextAlign } from "./renderer";
import sheepNames from "./sheep-names";
import { add, dist, distSq, mag, mul, normalize } from "./vector";

const mapColors = {
  [Tile.Ground]: palette.timberwolf,
  [Tile.Path]: palette.gray,
  [Tile.Wall]: palette.black,
  [Tile.Pasture]: palette.asparagus,
  [Tile.Tree]: palette.chestnut,
  [Tile.Water]: palette.wildBlueYonder,
  [Tile.Bridge]: palette.shadow
};

showFps(true);

let wind = 0;

class FootstepTrail {
  width = 4;
  stride = 4;
  max = 128;
  footsteps = [];
  footstepAlt = false;
  color = palette.gray;
  private distanceToNextFootstep = 0;

  constructor(private x: number, private y: number) {}

  move(x: number, y: number) {
    if (x !== this.x || y !== this.y) {
      this.distanceToNextFootstep -= dist([this.x, this.y], [x, y]);

      if (this.distanceToNextFootstep <= 0) {
        const [vx, vy] = normalize([x - this.x, y - this.y]);

        const [ox, oy] = this.footstepAlt ? [vy, -vx] : [-vy, vx];
        this.footstepAlt = !this.footstepAlt;

        const fx = this.x + ox * this.width * 0.5;
        const fy = this.y - 1 + oy * this.width * 0.5;

        this.footsteps.push([fx, fy]);

        if (this.footsteps.length > this.max) {
          this.footsteps.splice(0, 1);
        }

        this.distanceToNextFootstep = this.stride;
      }
    }

    this.x = x;
    this.y = y;
  }

  draw() {
    for (const [x, y] of this.footsteps) {
      renderer.set(~~x, ~~y, this.color, y);
    }
  }
}

class Player {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  speed = 64;
  reverse = false;
  animtimer = 0;
  footsteps = new FootstepTrail(this.x, this.y);

  update() {
    this.animtimer += deltaTime;

    // create (x, y) input vector
    let moveX = 0;
    let moveY = 0;
    if (keyboard.isDown("left")) moveX--;
    if (keyboard.isDown("right")) moveX++;
    if (keyboard.isDown("up")) moveY--;
    if (keyboard.isDown("down")) moveY++;

    // normalize diagonal movement
    if (moveX !== 0 && moveY !== 0) {
      moveX /= Math.SQRT2;
      moveY /= Math.SQRT2;
    }

    // update player facing position
    if (moveX < 0) this.reverse = true;
    else if (moveX > 0) this.reverse = false;

    // scale by speed
    this.vx = moveX * this.speed;
    this.vy = moveY * this.speed;

    // update position
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;

    this.footsteps.move(this.x, this.y);
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
      }
    }
  }

  get isMoving() {
    return this.vx !== 0 || this.vy !== 0;
  }

  get frame() {
    if (this.isMoving) {
      const frame = Math.floor(this.animtimer * 6) % 2;
      return this.reverse ? 4 + frame : 1 + frame;
    } else {
      return this.reverse ? 3 : 0;
    }
  }

  draw() {
    renderer.spr("player", this.x - 8, this.y - 16, this.frame, false, this.y);
    this.footsteps.draw();
  }
}

class Bug {
  depth: number;
  lifespan: number;
  z = 0;

  constructor(private x: number, private y: number) {
    this.depth = this.y;
    this.lifespan = 20;
    this.z = 0;
  }

  update() {
    this.x += (Math.random() * 2 - 1) * deltaTime * 100;
    this.y += (Math.random() * 2 - 1) * deltaTime * 100;
    this.z += (Math.random() - (this.lifespan < 3 ? 0.75 : 0.25)) * deltaTime * 100;
    if (this.z < 0) this.z = 0;
    if (this.z > 16) this.z = 16;

    this.lifespan -= deltaTime;
    if (this.lifespan <= 0) {
      bugs.splice(bugs.indexOf(this), 1);
    }
  }

  draw() {
    renderer.set(~~this.x, ~~(this.y - this.z), palette.violetPurple, this.y);
  }
}

enum BirbState {
  Standing,
  Hopping,
  Flying
}

class Birb {
  state = BirbState.Standing;
  animtimer = 0;
  z = 0;
  flightDirection: number;
  lifetimer = 20;
  reverse = false;
  hops = 1;
  hopStartX: number;
  hopTimer: number;

  constructor(public x: number, public y: number) {
    this.flightDirection = (Math.random() * Math.PI) / 2 + Math.PI / 4;
  }

  update() {
    if (
      this.state !== BirbState.Flying &&
      distSq([this.x, this.y], [player.x, player.y]) < 48 * 48
    ) {
      this.state = BirbState.Flying;
      this.reverse = this.flightDirection < Math.PI / 2;
    }

    if (this.state === BirbState.Standing) {
      if (Math.random() < deltaTime / 4) {
        this.state = BirbState.Hopping;
        this.reverse = Math.random() < 0.5;
        this.hops = Math.floor(Math.random() * 3) + 1;
        this.hopStartX = this.x;
        this.hopTimer = this.hops / 4;
      }
    }

    if (this.state === BirbState.Flying) {
      this.x += Math.cos(this.flightDirection) * 96 * deltaTime;
      this.z += Math.sin(this.flightDirection) * 96 * deltaTime;

      this.animtimer += deltaTime;
      this.lifetimer -= deltaTime;

      if (this.lifetimer <= 0) {
        birbs.splice(birbs.indexOf(this), 1);
      }
    }

    if (this.state === BirbState.Hopping) {
      this.hopTimer -= deltaTime;

      if (this.hopTimer <= 0) {
        this.x = this.hopStartX + this.hops * 4 * (this.reverse ? 1 : -1);
        this.z = 0;
        this.state = BirbState.Standing;
      } else {
        this.x =
          this.hopStartX +
          (1 - this.hopTimer / (this.hops / 4)) * this.hops * 4 * (this.reverse ? 1 : -1);

        this.z =
          Math.max(
            Math.sin(this.hopTimer * 4 * Math.PI),
            Math.sin((this.hopTimer * 4 + 1) * Math.PI)
          ) * 2;
      }
    }
  }

  get frame() {
    if (this.state === BirbState.Flying) {
      return (Math.floor(this.animtimer * 8) % 3) + 1;
    } else {
      return 0;
    }
  }

  draw() {
    renderer.spr(
      "birb",
      this.x - 1,
      this.y - this.z - 3,
      this.frame,
      this.reverse,
      this.y
    );
  }
}

enum SheepState {
  Standing,
  Walking,
  Running
}

class Sheep {
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
    for (const other of sheep.active) {
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

class ActiveFilteredList<T extends { x: number; y: number }> {
  items: T[] = [];
  active: T[] = [];

  add(item: T) {
    this.items.push(item);
  }

  remove(item: T) {
    this.items.splice(this.items.indexOf(item), 1);
  }

  updateActive(cx: number, cy: number, w: number, h: number) {
    const w2 = w / 2;
    const h2 = h / 2;

    this.active = this.items.filter(
      ({ x, y }) => x > cx - w2 && x < cx + w2 && y > cy - h2 && y < cy + h2
    );
  }
}

const map = generateMap(256, 256);

const player = new Player();
player.x = map.start[0];
player.y = map.start[1];

const sheep = new ActiveFilteredList<Sheep>();
for (let i = 0; i < (map.width * map.height) / (32 * 32); i++) {
  const x = Math.random() * map.width * 8;
  const y = Math.random() * map.height * 8;
  sheep.add(new Sheep(x, y));
}

const birbs: Birb[] = [];
for (let i = 0; i < (map.width * map.height) / (16 * 16); i++) {
  const x = Math.random() * map.width * 8;
  const y = Math.random() * map.height * 8;
  birbs.push(new Birb(x, y));
}

renderer.clearColor = mapColors[Tile.Ground];
pixels = 196;
resize();

const bugs: Bug[] = [];

loop(() => {
  renderer.clear();

  wind = Math.sin(Date.now() / 2000);

  for (const id in steppedOnStalkTimers) {
    steppedOnStalkTimers[id] -= deltaTime;

    if (steppedOnStalkTimers[id] <= 0) {
      delete steppedOnStalkTimers[id];
    }
  }

  player.update();

  sheep.updateActive(player.x, player.y, width * 1.5, height * 1.5);

  bugs.forEach(bug => bug.update());
  birbs.forEach(birb => birb.update());
  sheep.active.forEach(sheep => sheep.update());
  addBugs();
  collideMap();

  const cameraX = Math.min(Math.max(player.x, width / 2), map.width * 8 - width / 2);
  const cameraY = Math.min(Math.max(player.y, height / 2), map.height * 8 - height / 2);
  renderer.camera(cameraX, cameraY);

  bugs.forEach(bug => bug.draw());
  birbs.forEach(birb => birb.draw());
  sheep.active.forEach(sheep => sheep.draw());
  player.draw();
  drawMap();
});

function addBugs() {
  if (
    (player.vx !== 0 || player.vy !== 0) &&
    map.getWorld(player.x, player.y) === Tile.Pasture &&
    Math.random() < deltaTime * 0.25
  ) {
    const count = Math.random() * 5 + 1;
    for (let i = 0; i < count; i++) {
      bugs.push(new Bug(player.x, player.y));
    }
  }
}

function collideMap() {
  const cameraLeft = renderer.cameraX;
  const cameraRight = renderer.cameraX + width;
  const cameraTop = renderer.cameraY;
  const cameraBottom = renderer.cameraY + height;

  const left = Math.max(Math.floor(cameraLeft / 8) - 1, 0);
  const right = Math.min(Math.ceil(cameraRight / 8) + 1, map.width - 1);
  const top = Math.max(Math.floor(cameraTop / 8) - 1, 0);
  const bottom = Math.min(Math.ceil(cameraBottom / 8) + 1, map.height - 1);

  for (let mapX = left; mapX <= right; mapX++) {
    for (let mapY = top; mapY <= bottom; mapY++) {
      const tile = map.get(mapX, mapY);
      if (tile === Tile.Wall || tile === Tile.Water) {
        const x = mapX * 8;
        const y = mapY * 8;

        player.resolveAabbCollision(x, y, 8, 8);
        sheep.active.forEach(sheep => sheep.resolveAabbCollision(x, y, 8, 8));
      }
      // else if (map.get(mapX, mapY) === Tile.Tree) {
      //    player.resolveAabbCollision(
      //      mapX * 8,
      //      (mapY + 1) * 8 - 6,
      //      8,
      //      6
      //    );
      // }
    }
  }
}

function drawMap() {
  const cameraLeft = renderer.cameraX;
  const cameraRight = renderer.cameraX + width;
  const cameraTop = renderer.cameraY;
  const cameraBottom = renderer.cameraY + height;

  const left = Math.max(Math.floor(cameraLeft / 8) - 2, 0);
  const right = Math.min(Math.ceil(cameraRight / 8) + 1, map.width - 1);
  const top = Math.max(Math.floor(cameraTop / 8) - 1, 0);
  const bottom = Math.min(Math.ceil(cameraBottom / 8) + 4, map.height - 1);

  for (let mapX = left; mapX <= right; mapX++) {
    for (let mapY = top; mapY <= bottom; mapY++) {
      drawTile(mapX, mapY);
    }
  }
}

function drawTile(mapX: number, mapY: number) {
  const tile = map.get(mapX, mapY);
  const random = map.getRandom(mapX, mapY);
  const color = mapColors[tile];
  const x = mapX * 8;
  const y = mapY * 8;

  if (tile === Tile.Pasture) {
    drawGrass(x, y, 8, 8, 12, random);
  } else if (tile === Tile.Water) {
    drawWater(x, y, 8, 8, random);
  } else if (tile === Tile.Wall) {
    drawWall(mapX, mapY);
  } else if (tile === Tile.Tree) {
    // drawTree(x, y);
  } else if (tile === Tile.Path) {
    // drawPath(x, y, random);
  } else if (tile === Tile.Ground) {
    drawGround(x, y, 8, 8, random);
  } else if (tile === Tile.Bridge) {
    drawPath(x, y, random);
  } else {
    renderer.rectfill(x, y, 8, 8, color, Number.NEGATIVE_INFINITY);
  }
}

function drawGrass(
  x: number,
  y: number,
  w: number,
  h: number,
  stalkHeight: number,
  random: () => number
) {
  const density = 0.25;
  const stalks = w * h * density;

  for (let i = 0; i < stalks; i++) {
    const id = random();

    const sx = x + random() * w;
    const sy = y + random() * h;

    if (checkIfGrassTrampled(sx, sy)) {
      steppedOnStalkTimers[id] = Math.random() * 4 + 2;
    }

    const sh = steppedOnStalkTimers[id] ? 1 : random() * stalkHeight;
    const r = random();
    const c =
      r < 0.5 ? palette.forestGreen : r < 0.75 ? palette.pineGreen : palette.outerSpace;
    const wi = wind * random();

    renderer.line(sx, sy, sx + wi, sy - sh, c, sy);

    if (random() < 0.1) {
      renderer.set(~~(sx + wi), ~~(sy - sh - 1), palette.tumbleweed, sy);
    }
  }
}

const steppedOnStalkTimers: Record<number, number> = {};

function drawGround(x: number, y: number, w: number, h: number, random: () => number) {
  const stalks = Math.floor(w * h * random() * 0.018);

  for (let i = 0; i < stalks; i++) {
    const id = random();

    const sx = x + random() * w;
    const sy = y + random() * h;

    const toPlayerX = sx - player.x;
    const toPlayerY = sy - player.y;
    const toPlayer = toPlayerX * toPlayerX + toPlayerY * toPlayerY;

    if (checkIfGrassTrampled(sx, sy)) {
      steppedOnStalkTimers[id] = Math.random() * 2 + 1;
    }

    sheep.active.forEach(sheep => {
      const toSheepX = sx - sheep.x;
      const toSheepY = sy - sheep.y;
      const toSheepSq = toSheepX * toSheepX + toSheepY * toSheepY;

      if (toSheepSq <= 16) {
        steppedOnStalkTimers[id] = Math.random() * 4 + 2;
      }
    });

    let sh = steppedOnStalkTimers[id] ? 1 : random() * 3 + 1;
    const wi = random() * wind;

    renderer.line(sx, sy, sx + wi, sy - sh, mapColors[Tile.Pasture], -1001);
  }
}

function drawWater(x: number, y: number, w: number, h: number, random: () => number) {
  const density = 1 / 16;
  const puddles = w * h * density;

  for (let i = 0; i < puddles; i++) {
    const sx = x + 2 + random() * (w - 4);
    const sy = y + 2 + random() * (h - 4);
    const r = 6;

    renderer.circfill(sx, sy, r, mapColors[Tile.Water], -1000);
  }
}

function drawWall(mapX: number, mapY: number) {
  const x = mapX * 8;
  const y = mapY * 8;
  const frame = map.get(mapX, mapY + 1) === Tile.Wall ? 1 : 0;
  renderer.spr("wall", x, y, frame, false, y + 8);
}

function drawPath(x: number, y: number, random: () => number) {
  const frame = ~~(random() * 3);
  renderer.spr("path", x, y, frame, false, -999);
}

function drawTree(x: number, y: number) {
  renderer.spr("tree", x + 8 / 2 - 16, y + 8 - 48, 0, false, y + 8 - 0.1);
}

function checkIfGrassTrampled(x: number, y: number) {
  const toPlayerX = x - player.x;
  const toPlayerY = y - player.y;
  const toPlayer = toPlayerX * toPlayerX + toPlayerY * toPlayerY;

  if (toPlayer <= 16) {
    return true;
  }

  return sheep.active.some(sheep => {
    const toSheepX = x - sheep.x;
    const toSheepY = y - sheep.y;
    const toSheepSq = toSheepX * toSheepX + toSheepY * toSheepY;

    if (toSheepSq <= 16) {
      return true;
    }
  });
}
