export default class OnscreenFilteredList<T extends { x: number; y: number }> {
  items: T[] = [];
  onscreen: T[] = [];
  margin = 32;

  add(item: T) {
    this.items.push(item);
  }

  remove(item: T) {
    this.items.splice(this.items.indexOf(item), 1);
  }

  update() {
    const left = renderer.cameraX - this.margin;
    const right = renderer.cameraX + width + this.margin;
    const top = renderer.cameraY - this.margin;
    const bottom = renderer.cameraY + height + this.margin;

    this.onscreen = this.items.filter(
      ({ x, y }) => x > left && x < right && y > top && y < bottom
    );
  }
}
