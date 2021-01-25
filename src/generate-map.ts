import { distSq } from "./vector";
import { Delaunay } from "d3-delaunay";
import Map, { Tile } from "./map";
import { line } from "./utils";

function routeTo(delaunay: Delaunay<Delaunay.Point>, start: number, end: number) {
  const pointCount = delaunay.points.length / 2;

  const unvisited = new Array(pointCount).fill(null).map((_, i) => i);
  const dist: number[] = new Array(pointCount).fill(Number.POSITIVE_INFINITY);
  const prev: number[] = new Array(pointCount).fill(null);

  dist[start] = 0;

  while (unvisited.length) {
    let from = unvisited[0];

    // pick vertex with min dist
    for (let i = 1; i < unvisited.length; i++) {
      if (dist[unvisited[i]] < dist[from]) {
        from = unvisited[i];
      }
    }

    unvisited.splice(unvisited.indexOf(from), 1);

    for (const to of delaunay.neighbors(from)) {
      const [x0, y0] = [delaunay.points[from * 2], delaunay.points[from * 2 + 1]];
      const [x1, y1] = [delaunay.points[to * 2], delaunay.points[to * 2 + 1]];
      const [dx, dy] = [x1 - x0, y1 - y0];
      let d = dist[from] + Math.sqrt(dx * dx + dy * dy);

      if (d < dist[to]) {
        dist[to] = d;
        prev[to] = from;
      }
    }
  }

  const path: number[] = [];
  let current = end;

  if (prev[current] !== null || current === start) {
    while (current !== null) {
      path.push(current);
      current = prev[current];
    }
  }

  path.reverse();
  return path;
}

class MapBuilder {
  map: Map;

  constructor(w: number, h: number) {
    this.map = new Map(w, h);
  }

  addWall(x0: number, y0: number, x1: number, y1: number, gapChance?: number) {
    [x0, y0, x1, y1] = [x0, y0, x1, y1].map(Math.round);

    for (const [x, y] of line([x0, y0], [x1, y1])) {
      if (gapChance && Math.random() < gapChance) continue;
      this.map.set(x, y, Tile.Wall);
    }
  }

  addStream(x0: number, y0: number, x1: number, y1: number, brushSize = 2) {
    [x0, y0, x1, y1] = [x0, y0, x1, y1].map(Math.round);
    const bs2 = ~~(brushSize / 2);

    for (const [x, y] of line([x0, y0], [x1, y1])) {
      for (let bx = 0; bx < brushSize; bx++) {
        for (let by = 0; by < brushSize; by++) {
          this.map.set(x + bx - bs2, y + by - bs2, Tile.Water);
        }
      }
    }
  }

  addCrossing(x: number, y: number, brushSize = 2) {
    [x, y] = [x, y].map(Math.round);
    const bs2 = ~~(brushSize / 2);

    for (let bx = -1; bx < brushSize + 1; bx++) {
      for (let by = -1; by < brushSize + 1; by++) {
        if (this.map.get(x + bx - bs2, y + by - bs2) === Tile.Water) {
          this.map.set(x + bx - bs2, y + by - bs2, Tile.Crossing);
        }
      }
    }
  }

  plantGrass(x: number, y: number) {
    [x, y] = [x, y].map(Math.round);
    this.map.set(x, y, Tile.Grass);
  }

  iterateGrass() {
    const addedGrasses = [];

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const t = this.map.get(x, y);
        if (t === Tile.Ground) {
          const pastureNeighbors =
            (x > 0 && this.map.get(x - 1, y) === Tile.Grass ? 1 : 0) +
            (x < width - 1 && this.map.get(x + 1, y) === Tile.Grass ? 1 : 0) +
            (y > 0 && this.map.get(x, y - 1) === Tile.Grass ? 1 : 0) +
            (y < height - 1 && this.map.get(x, y + 1) === Tile.Grass ? 1 : 0) +
            (x > 0 && y > 0 && this.map.get(x - 1, y - 1) === Tile.Grass ? 1 : 0) +
            (x < width - 1 && y > 0 && this.map.get(x + 1, y - 1) === Tile.Grass
              ? 1
              : 0) +
            (x < width - 1 && y < height - 1 && this.map.get(x + 1, y + 1) === Tile.Grass
              ? 1
              : 0) +
            (x > 0 && y < height - 1 && this.map.get(x - 1, y + 1) === Tile.Grass
              ? 1
              : 0);

          if (Math.random() < pastureNeighbors * 0.5) {
            addedGrasses.push([x, y]);
          }
        }
      }
    }

    for (const [x, y] of addedGrasses) {
      this.map.set(x, y, Tile.Grass);
    }
  }
}

export default function generateMap(w: number, h: number) {
  const mapBuilder = new MapBuilder(w, h);

  const cellSize = 4;

  pixels = 256;
  resize();
  renderer.clearColor = palette.timberwolf;

  const points: [number, number][] = [];
  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;

    if (!points.some(p => distSq(p, [x, y]) < cellSize * cellSize)) {
      points.push([x, y]);
    }
  }

  const triangulation = Delaunay.from(points);

  const interior: number[] = [];

  const sorted = points
    .slice()
    .sort((p0, p1) => distSq(p0, [w / 2, h / 2]) - distSq(p1, [w / 2, h / 2]));

  for (let i = 0; i < points.length / 2; i++) {
    interior.push(points.indexOf(sorted[i]));
  }

  const interiorTriangulation = Delaunay.from(interior.map(i => points[i]));

  const border = interiorTriangulation.hullPolygon();
  for (let i = 0; i < border.length; i++) {
    const [x0, y0] = border[i];
    const [x1, y1] = border[(i + 1) % border.length];

    mapBuilder.addWall(x0, y0, x1, y1);
  }

  const usedPoints: number[] = Array.from(
    interiorTriangulation.hull.map(i => interior[i])
  );

  let waterPath = [];

  if (Math.random() > 0.25) {
    const hl = triangulation.hull.length;
    const hi0 = ~~(Math.random() * hl);
    const hi1 = (hi0 + ~~(hl / 2 + (Math.random() - 0.5) * 0.25 * hl)) % hl;
    const waterStart = triangulation.hull[hi0];
    const waterEnd = triangulation.hull[hi1];
    waterPath = routeTo(triangulation, waterStart, waterEnd);
  }

  const { halfedges, triangles } = interiorTriangulation;
  const wallDensity = Math.random() * 0.1 + 0.1;
  for (let i = 0; i < halfedges.length; i++) {
    if (Math.random() > wallDensity) continue;

    const j = halfedges[i];
    if (j < i) continue;

    const p0 = interior[triangles[i]];
    const p1 = interior[triangles[j]];

    if (waterPath.includes(p0) && waterPath.includes(p1)) continue;

    usedPoints.push(p0);
    usedPoints.push(p1);

    const [x0, y0] = points[p0];
    const [x1, y1] = points[p1];

    mapBuilder.addWall(x0, y0, x1, y1, Math.random());
  }

  for (let i = 0; i < waterPath.length - 1; i++) {
    const [x0, y0] = points[waterPath[i]];
    const [x1, y1] = points[waterPath[i + 1]];
    mapBuilder.addStream(x0, y0, x1, y1);
  }

  const crossings = [];
  for (let i = 0; i < waterPath.length - 1; i++) {
    if (interior.includes(waterPath[i]) && !usedPoints.includes(waterPath[i])) {
      crossings.push(waterPath[i]);
      usedPoints.push(waterPath[i]);
    }
  }

  for (let i = 0; i < crossings.length; i++) {
    const [x, y] = points[crossings[i]];
    mapBuilder.addCrossing(x, y);
    usedPoints.push(crossings[i]);
    crossings.splice(i, 1);
  }

  const start = interior.find(i => !usedPoints.includes(i));
  mapBuilder.map.start = points[start].map(Math.round) as [number, number];
  usedPoints.push(start);

  const grassDensity = Math.random() * 0.5 + 0.25;
  for (let i = 0; i < interior.length; i++) {
    const j = interior[i];

    if (!usedPoints.includes(j) && Math.random() < grassDensity) {
      const [x, y] = points[j];
      mapBuilder.plantGrass(x, y);
    }
  }

  for (let i = 0; i < 6; i++) {
    mapBuilder.iterateGrass();
  }

  const openPoints = interior.filter(i => !usedPoints.includes(i));
  const sheepCount = 8;

  while (openPoints.length > 0 && mapBuilder.map.sheepStart.length < sheepCount) {
    const j = ~~(Math.random() * openPoints.length);
    mapBuilder.map.sheepStart.push(points[openPoints[j]]);
    openPoints.splice(j, 0);
  }

  return mapBuilder.map;
}

export function previewMap(map: Map) {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (map.get(x, y) === Tile.Wall) {
        renderer.set(x, y, palette.chestnut);
      } else if (map.get(x, y) === Tile.Grass) {
        renderer.set(x, y, palette.forestGreen);
      } else if (map.get(x, y) === Tile.Water) {
        renderer.set(x, y, palette.midnightBlue);
      } else if (map.get(x, y) === Tile.Crossing) {
        renderer.set(x, y, palette.aquamarine);
      }
    }
  }
}
