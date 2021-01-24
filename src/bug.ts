import { state } from "./main";

export default class Bug {
  depth: number;
  lifespan: number;
  z = 0;

  constructor(private x: number, private y: number) {
    this.depth = this.y;
    this.lifespan = 20;
    this.z = 0;
  }

  update() {
    const { bugs } = state;

    this.x += (Math.random() * 2 - 1) * deltaTime * 100;
    this.y += (Math.random() * 2 - 1) * deltaTime * 100;
    this.z += (Math.random() - (this.lifespan < 3 ? 0.75 : 0.25)) * deltaTime * 100;
    if (this.z < 0) this.z = 0;
    if (this.z > 16) this.z = 16;

    this.lifespan -= deltaTime;
    if (this.lifespan <= 0) {
      bugs.splice(bugs.indexOf(this), 1);
    }
  }

  draw() {
    renderer.set(~~this.x, ~~(this.y - this.z), palette.violetPurple, this.y);
  }
}
