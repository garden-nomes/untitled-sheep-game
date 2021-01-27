import { state } from "./main";

export default class GrassState {
  private trampled = {};
  private munched = {};

  update() {
    for (const id in this.trampled) {
      this.trampled[id] -= deltaTime;

      if (this.trampled[id] <= 0) {
        delete this.trampled[id];
      }
    }
  }

  trample(id: number) {
    this.trampled[id] = Math.random() * 4 + 2;
  }

  isTrampled(id: number) {
    return !!this.trampled[id];
  }

  munch(x: number, y: number) {
    const [gx, gy] = [x, y].map(x => ~~(x / 8));
    const { map } = state;
    const id = map.getSeed(gx, gy);

    if (typeof this.munched[id] === "undefined") {
      this.munched[id] = 0;
    }

    this.munched[id] += deltaTime * Math.random();
  }

  isMunched(x: number, y: number) {
    const [gx, gy] = [x, y].map(x => ~~(x / 8));
    const { map } = state;
    const id = map.getSeed(gx, gy);
    return this.munched[id] > 1;
  }

  munchedAmount(x: number, y: number) {
    const [gx, gy] = [x, y].map(x => ~~(x / 8));
    const { map } = state;
    const id = map.getSeed(gx, gy);
    return this.munched[id] || 0;
  }
}
