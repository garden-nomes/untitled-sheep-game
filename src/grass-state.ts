export default class GrassState {
  private trampled = {};

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
}
