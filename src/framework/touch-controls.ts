import { add, distSq, mul, normalize, sub } from "../vector";

export default class TouchControls {
  touchId: number | null = null;
  touchPos: [number, number] | null = null;
  startPos: [number, number] | null = null;

  constructor() {
    window.addEventListener("touchstart", this.touchStart.bind(this));
    window.addEventListener("touchend", this.touchEnd.bind(this));
    window.addEventListener("touchmove", this.touchMove.bind(this));
  }

  touchStart(event: TouchEvent) {
    if (this.touchId === null) {
      const touch = event.changedTouches[0];
      this.touchId = touch.identifier;

      const pos = renderer.clientToGameCoordinates(touch.clientX, touch.clientY);
      this.startPos = pos;
      this.touchPos = pos;
    }
  }

  touchEnd(event: TouchEvent) {
    for (const touch of event.changedTouches) {
      if (touch.identifier === this.touchId) {
        this.touchId = null;
        this.startPos = null;
        this.touchPos = null;
      }
    }
  }

  touchMove(event: TouchEvent) {
    for (const touch of event.changedTouches) {
      if (touch.identifier === this.touchId) {
        const touch = event.changedTouches[0];
        const pos = renderer.clientToGameCoordinates(touch.clientX, touch.clientY);
        this.touchPos = pos;

        const d = 48;
        if (distSq(this.touchPos, this.startPos) > d * d) {
          this.startPos = add(
            this.touchPos,
            mul(normalize(sub(this.startPos, this.touchPos)), d)
          ) as any;
        }
      }
    }
  }

  draw() {
    if (this.touchId === null) return;

    renderer.line(
      renderer.cameraX + this.startPos[0],
      renderer.cameraY + this.startPos[1],
      renderer.cameraX + this.touchPos[0],
      renderer.cameraY + this.touchPos[1],
      palette.gray,
      Number.POSITIVE_INFINITY
    );

    renderer.circfill(
      renderer.cameraX + this.startPos[0],
      renderer.cameraY + this.startPos[1],
      8,
      palette.gray,
      Number.POSITIVE_INFINITY
    );

    renderer.circfill(
      renderer.cameraX + this.touchPos[0],
      renderer.cameraY + this.touchPos[1],
      8,
      palette.chestnut,
      Number.POSITIVE_INFINITY
    );
  }

  get direction(): [number, number] {
    if (this.touchId === null) {
      return [0, 0];
    } else {
      const [x0, y0] = this.startPos;
      const [x1, y1] = this.touchPos;

      if (x0 === x1 && y0 === y1) {
        return [0, 0];
      }

      return normalize([x1 - x0, y1 - y0]) as [number, number];
    }
  }
}
