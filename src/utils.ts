import { Color } from "./renderer";

export function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

export function hashSeed(n: number) {
  let sum = 0,
    mul = 9;

  while (n > 0) {
    n >>= 1;
    sum += n * mul;
    mul--;
  }

  return sum;
}

export function* line([x0, y0]: number[], [x1, y1]: number[]) {
  // Bresenham's line algorithm, implementation from https://stackoverflow.com/a/55666538/7351962

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;

  let err = dx - dy;
  while (x0 !== x1 || y0 !== y1) {
    const e2 = err << 1;

    if (e2 > -dy) {
      err -= dy;
      x0 += sx;

      if (e2 < dx) {
        yield [x0, y0];
      }
    }

    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }

    yield [x0, y0];
  }
}

export function* circfill(x: number, y: number, r: number) {
  let [cx, cy] = [r, 0];
  let f = 1 - r;
  let ddfX = r * -2;
  let ddfY = 1;

  yield [x, y + r];
  yield [x, y - r];
  for (let rx = -r; rx <= r; rx++) {
    yield [x + rx, y];
  }

  while (cy < cx) {
    if (f >= 0) {
      cx--;
      ddfX += 2;
      f += ddfX;
    }

    cy++;
    ddfY += 2;
    f += ddfY;

    for (let rx = -cx; rx <= cx; rx++) {
      yield [x + rx, y + cy];
      yield [x + rx, y - cy];
    }

    for (let rx = -cy; rx <= cy; rx++) {
      yield [x + rx, y + cx];
      yield [x + rx, y - cx];
    }
  }
}

export function hexToRgb(hex: string): Color {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  if (!result) {
    throw new Error("Not a hex string: " + hex);
  }

  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16), 255];
}

export function distSq(x0: number, y0: number, x1: number, y1: number) {
  const dx = x0 - x1;
  const dy = y0 - y1;
  return dx * dx + dy * dy;
}

export function dist(x0: number, y0: number, x1: number, y1: number) {
  const dx = x0 - x1;
  const dy = y0 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}
