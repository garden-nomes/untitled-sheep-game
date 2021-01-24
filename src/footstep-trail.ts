import { palette } from "./sprites";
import { dist, normalize } from "./vector";

export default class FootstepTrail {
  width = 4;
  stride = 4;
  max = 128;
  footsteps = [];
  footstepAlt = false;
  color = palette.gray;
  private distanceToNextFootstep = 0;

  constructor(private x: number, private y: number) {}

  move(x: number, y: number) {
    if (x !== this.x || y !== this.y) {
      this.distanceToNextFootstep -= dist([this.x, this.y], [x, y]);

      if (this.distanceToNextFootstep <= 0) {
        const [vx, vy] = normalize([x - this.x, y - this.y]);

        const [ox, oy] = this.footstepAlt ? [vy, -vx] : [-vy, vx];
        this.footstepAlt = !this.footstepAlt;

        const fx = this.x + ox * this.width * 0.5;
        const fy = this.y - 1 + oy * this.width * 0.5;

        this.footsteps.push([fx, fy]);

        if (this.footsteps.length > this.max) {
          this.footsteps.splice(0, 1);
        }

        this.distanceToNextFootstep = this.stride;
      }
    }

    this.x = x;
    this.y = y;
  }

  draw() {
    for (const [x, y] of this.footsteps) {
      renderer.set(~~x, ~~y, this.color, y);
    }
  }
}
