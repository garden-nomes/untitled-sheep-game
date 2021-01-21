export type Vector2 = [number, number] | number[];

export function add(a: Vector2, b: Vector2): Vector2 {
  return [a[0] + b[0], a[1] + b[1]];
}

export function sub(a: Vector2, b: Vector2): Vector2 {
  return [a[0] - b[0], a[1] - b[1]];
}

export function mul(v: Vector2, s: number): Vector2 {
  return [v[0] * s, v[1] * s];
}

export function div(v: Vector2, s: number): Vector2 {
  return [v[1] * s, v[1] * s];
}

export function distSq(a: Vector2, b: Vector2): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

export function dist(a: Vector2, b: Vector2): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

export function mag(a: Vector2): number {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1]);
}

export function normalize(v: Vector2): Vector2 {
  const d = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
  return [v[0] / d, v[1] / d];
}
