import Map, { Tile } from "./map";
import { Delaunay } from "d3-delaunay";
import { line, mod } from "./utils";

function* findPath(
  delaunay: Delaunay<Delaunay.Point>,
  start: number,
  end: number,
  map: Map
) {
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

      for (const [x, y] of line([x0, y0], [x1, y1])) {
        if (map.get(x, y) === Tile.Water) {
          d += 100;
        }
      }

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

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];

    const p0 = [delaunay.points[a * 2], delaunay.points[a * 2 + 1]];
    const p1 = [delaunay.points[b * 2], delaunay.points[b * 2 + 1]];

    yield [p0, p1] as [[number, number], [number, number]];
  }
}

export default function generateMap(width: number, height: number) {
  const map = new Map(width, height);

  for (let i = 0; i < 50; i++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    map.set(x, y, Tile.Tree);
  }

  for (let i = 0; i < 4; i++) {
    const speed = 5;
    const wander = 0.01;
    let x = Math.random() * width;
    let y = Math.random() * height;
    let vx = 0;
    let vy = 0;

    for (let j = 0; j < 6000; j++) {
      const x0 = Math.round(x);
      const y0 = Math.round(y);
      const x1 = Math.round(x + vx);
      const y1 = Math.round(y + vy);
      if (x0 < 0 || x0 >= width || y0 < 0 || y0 >= height) break;

      map.setLine([x0, y0], [x1, y1], Tile.Water);
      map.setLine([x0 + 1, y0], [x1 + 1, y1], Tile.Water);
      map.setLine([x0 + 1, y0 + 1], [x1 + 1, y1 + 1], Tile.Water);
      map.setLine([x0, y0 + 1], [x1, y1 + 1], Tile.Water);

      x += vx;
      y += vy;

      vx += (Math.random() - 0.5) * speed * wander;
      vy += (Math.random() - 0.5) * speed * wander;
      vx *= 1 - wander;
      vy *= 1 - wander;
    }
  }

  const foci: [number, number][] = [];
  for (let i = 0; i < 100; i++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);

    if (map.get(x, y) !== Tile.Water) {
      foci.push([x, y]);
    }
  }

  map.start = foci[0];

  const delaunay = Delaunay.from(foci);
  const voronoi = delaunay.voronoi([0, 0, width, height]);

  for (const polygon of voronoi.cellPolygons()) {
    let i = Math.floor(Math.random() * polygon.length);
    const j = Math.floor(Math.random() * polygon.length);

    for (; i < j; i++) {
      const p0 = polygon[i].map(Math.floor);
      const p1 = polygon[i + 1].map(Math.floor);

      if (Math.random() < 0.5) {
        for (const [x, y] of line(p0, p1)) {
          if (map.get(x, y) !== Tile.Water && Math.random() < 0.8) {
            map.set(x, y, Tile.Wall);
          }
        }
      }
    }
  }

  for (let i = 0; i < 10; i++) {
    const start = Math.floor(Math.random() * foci.length);
    const end = Math.floor(Math.random() * foci.length);
    if (start === end) continue;

    for (const [p0, p1] of findPath(delaunay, start, end, map)) {
      for (const [x, y] of line(p0, p1)) {
        if (map.get(x, y) !== Tile.Water) {
          map.set(x, y, Tile.Path);
        } else {
          map.set(x, y, Tile.Bridge);
        }
      }
    }
  }

  for (const [x, y] of foci.slice(0, 20)) {
    map.set(x, y, Tile.Pasture);
    map.start = [x * map.tileSize, y * map.tileSize];
  }

  for (let i = 0; i < 10; i++) {
    const newPastures = [];

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (
          map.get(x, y) !== Tile.Wall &&
          map.get(x, y) !== Tile.Tree &&
          map.get(x, y) !== Tile.Water
        ) {
          const pastureNeighbors =
            (x > 0 && map.get(x - 1, y) === Tile.Pasture ? 1 : 0) +
            (x < width - 1 && map.get(x + 1, y) === Tile.Pasture ? 1 : 0) +
            (y > 0 && map.get(x, y - 1) === Tile.Pasture ? 1 : 0) +
            (y < height - 1 && map.get(x, y + 1) === Tile.Pasture ? 1 : 0) +
            (x > 0 && y > 0 && map.get(x - 1, y - 1) === Tile.Pasture ? 1 : 0) +
            (x < width - 1 && y > 0 && map.get(x + 1, y - 1) === Tile.Pasture ? 1 : 0) +
            (x < width - 1 && y < height - 1 && map.get(x + 1, y + 1) === Tile.Pasture
              ? 1
              : 0) +
            (x > 0 && y < height - 1 && map.get(x - 1, y + 1) === Tile.Pasture ? 1 : 0);

          if (Math.random() < pastureNeighbors * 0.5) {
            newPastures.push([x, y]);
          }
        }
      }
    }

    for (const [x, y] of newPastures) {
      map.set(x, y, Tile.Pasture);
    }
  }

  return map;
}
