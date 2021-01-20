import { randomLcg } from "d3-random";
import random from "./random";
import { line, mod } from "./utils";

export enum Tile {
  Ground = 1,
  Pasture,
  Path,
  Wall,
  Tree,
  Water,
  Bridge
}

export default class Map {
  grid: Int8Array;
  start: [number, number];
  tileSize = 8;
  seeds: Float32Array;

  constructor(public width: number, public height: number) {
    this.grid = new Int8Array(width * height).fill(Tile.Ground);

    this.start = [
      Math.floor(width / 2) * this.tileSize,
      Math.floor(height / 2) * this.tileSize
    ];

    this.seeds = new Float32Array(this.grid.length);
    for (let i = 0; i < this.grid.length; i++) {
      this.seeds[i] = random();
    }
  }

  set(gridX: number, gridY: number, tile: Tile) {
    if (gridX < 0 || gridX >= this.width || gridY < 0 || gridY >= this.height) {
      console.warn(`Grid coordinates out of bounds: (${gridX}, ${gridY})`);
      return;
    }

    const index = gridY * this.width + gridX;
    this.grid[index] = tile;
  }

  setLine(p0: number[], p1: number[], tile: Tile) {
    for (const [x, y] of line(p0, p1)) {
      this.set(x, y, tile);
    }
  }

  get(gridX: number, gridY: number): Tile {
    if (gridX < 0 || gridX >= this.width || gridY < 0 || gridY >= this.height) {
      return Tile.Ground;
    }

    const index = gridY * this.width + gridX;
    return this.grid[index];
  }

  getRandom(gridX: number, gridY: number) {
    if (gridX < 0 || gridX >= this.width || gridY < 0 || gridY >= this.height) {
      throw new Error(`Grid coordinates out of bounds: (${gridX}, ${gridY})`);
    }

    const index = gridY * this.width + gridX;
    return randomLcg(this.seeds[index]);
  }

  getWorld(x: number, y: number) {
    const gridX = mod(Math.floor(x / this.tileSize), this.width),
      gridY = mod(Math.floor(y / this.tileSize), this.height);

    return this.get(gridX, gridY);
  }
}
