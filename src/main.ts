import "./style.css";
import loop from "./framework";
import generateMap from "./generate-map";
import { Tile } from "./map";
import Player from "./player";
import Bug from "./bug";
import Birb from "./birb";
import Sheep from "./sheep";
import OnscreenFilteredList from "./onscreen-filtered-list";

// @ts-ignore
showFps(import.meta.env.DEV);

const mapColors = {
  [Tile.Ground]: palette.timberwolf,
  [Tile.Path]: palette.gray,
  [Tile.Wall]: palette.black,
  [Tile.Grass]: palette.asparagus,
  [Tile.Tree]: palette.chestnut,
  [Tile.Water]: palette.wildBlueYonder,
  [Tile.Crossing]: palette.aquamarine
};

export const state = setup();

function setup() {
  renderer.clearColor = mapColors[Tile.Ground];
  pixels = 256;
  resize();

  const map = generateMap(512, 512);

  const player = new Player();
  player.x = map.start[0] * 8;
  player.y = map.start[1] * 8;

  const sheep = new OnscreenFilteredList<Sheep>();
  for (const [mapX, mapY] of map.sheepStart) {
    sheep.add(new Sheep(mapX * 8, mapY * 8));
  }

  const birbs: Birb[] = [];
  for (let i = 0; i < (map.width * map.height) / (16 * 16); i++) {
    const x = Math.random() * map.width * 8;
    const y = Math.random() * map.height * 8;
    birbs.push(new Birb(x, y));
  }

  const bugs: Bug[] = [];

  // shared game state
  return {
    wind: 0,
    player,
    sheep,
    birbs,
    map,
    bugs
  };
}

const { player, sheep, birbs, bugs, map } = state;

loop(() => {
  renderer.clear();

  state.wind = Math.sin(Date.now() / 2000);

  for (const id in steppedOnStalkTimers) {
    steppedOnStalkTimers[id] -= deltaTime;

    if (steppedOnStalkTimers[id] <= 0) {
      delete steppedOnStalkTimers[id];
    }
  }

  player.update();
  bugs.forEach(bug => bug.update());
  birbs.forEach(birb => birb.update());
  addBugs();
  collideMap();

  const cameraX = Math.min(Math.max(player.x, width / 2), map.width * 8 - width / 2);
  const cameraY = Math.min(Math.max(player.y, height / 2), map.height * 8 - height / 2);
  renderer.camera(Math.round(cameraX), Math.round(cameraY));

  sheep.update();
  sheep.onscreen.forEach(sheep => sheep.update());

  bugs.forEach(bug => bug.draw());
  birbs.forEach(birb => birb.draw());
  sheep.onscreen.forEach(sheep => sheep.draw());
  player.draw();
  drawMap();
  touchControls.draw();
});

function addBugs() {
  if (
    (player.vx !== 0 || player.vy !== 0) &&
    map.getWorld(player.x, player.y) === Tile.Grass &&
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
        sheep.onscreen.forEach(sheep => sheep.resolveAabbCollision(x, y, 8, 8));
      } else if (map.get(mapX, mapY) === Tile.Tree) {
        player.resolveAabbCollision(mapX * 8 + 2, (mapY + 1) * 8 - 4, 4, 4);
      }
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

  if (tile === Tile.Grass) {
    drawGrass(x, y, 8, 8, 12, random);
    //   } else if (tile === Tile.Water) {
    //     drawWater(x, y, 8, 8, random);
  } else if (tile === Tile.Wall) {
    drawWall(mapX, mapY);
  } else if (tile === Tile.Tree) {
    drawTree(x, y, random);
  } else if (tile === Tile.Path) {
    // drawPath(x, y, random);
  } else if (tile === Tile.Ground) {
    drawGround(x, y, 8, 8, random);
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
  const density = 0.1;
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
    const wi = state.wind * random();

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

    sheep.onscreen.forEach(sheep => {
      const toSheepX = sx - sheep.x;
      const toSheepY = sy - sheep.y;
      const toSheepSq = toSheepX * toSheepX + toSheepY * toSheepY;

      if (toSheepSq <= 16) {
        steppedOnStalkTimers[id] = Math.random() * 4 + 2;
      }
    });

    let sh = steppedOnStalkTimers[id] ? 1 : random() * 3 + 1;
    const wi = random() * state.wind;

    renderer.line(sx, sy, sx + wi, sy - sh, mapColors[Tile.Grass], -1001);
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

function drawTree(x: number, y: number, random: () => number) {
  const trunkHeight = random() * 32 + 8;
  const height = random() * 32 + 8;
  const width = random() * 48 + 8;
  renderer.rectfill(
    x + 2,
    y + 8 - ~~trunkHeight,
    4,
    ~~trunkHeight,
    palette.beaver,
    y + 8
  );

  let altColor = false;
  for (let yy = y + 8 - trunkHeight + 1; yy > y + 8 - trunkHeight - height; yy--) {
    const xx = (random() - 0.5) * width + x + 4;
    const r = random() * 4 + 4;
    const c = altColor ? palette.forestGreen : palette.outerSpace;
    altColor = !altColor;
    renderer.circfill(xx, yy, r, c, y + 8);
  }
}

function checkIfGrassTrampled(x: number, y: number) {
  const toPlayerX = x - player.x;
  const toPlayerY = y - player.y;
  const toPlayer = toPlayerX * toPlayerX + toPlayerY * toPlayerY;

  if (toPlayer <= 16) {
    return true;
  }

  return sheep.onscreen.some(sheep => {
    const toSheepX = x - sheep.x;
    const toSheepY = y - sheep.y;
    const toSheepSq = toSheepX * toSheepX + toSheepY * toSheepY;

    if (toSheepSq <= 16) {
      return true;
    }
  });
}
