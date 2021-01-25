import FootstepTrail from "./footstep-trail";

export default class Player {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  speed = 64;
  reverse = false;
  animtimer = 0;
  footsteps = new FootstepTrail(this.x, this.y);

  update() {
    this.animtimer += deltaTime;

    // create (x, y) input vector
    let moveX = 0;
    let moveY = 0;
    if (keyboard.isDown("left")) moveX--;
    if (keyboard.isDown("right")) moveX++;
    if (keyboard.isDown("up")) moveY--;
    if (keyboard.isDown("down")) moveY++;

    // normalize diagonal movement
    if (moveX !== 0 && moveY !== 0) {
      moveX /= Math.SQRT2;
      moveY /= Math.SQRT2;
    }

    if (moveX === 0 && moveY === 0) {
      [moveX, moveY] = touchControls.direction;
    }

    // update player facing position
    if (moveX < 0) this.reverse = true;
    else if (moveX > 0) this.reverse = false;

    // scale by speed
    this.vx = moveX * this.speed;
    this.vy = moveY * this.speed;

    // update position
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;

    this.footsteps.move(this.x, this.y);
  }

  resolveAabbCollision(ox: number, oy: number, ow: number, oh: number) {
    const [x, y, w, h] = [this.x - 4, this.y - 4, 8, 4];

    const dx = x + w / 2 - ox - ow / 2;
    const px = ow / 2 + w / 2 - Math.abs(dx);
    if (px > 0) {
      const dy = y + h / 2 - oy - oh / 2;
      const py = oh / 2 + h / 2 - Math.abs(dy);
      if (py > 0) {
        if (px < py) {
          this.x += px * (Math.abs(dx) / dx);
        } else {
          this.y += py * (Math.abs(dy) / dy);
        }
      }
    }
  }

  get isMoving() {
    return this.vx !== 0 || this.vy !== 0;
  }

  get frame() {
    if (this.isMoving) {
      const frame = Math.floor(this.animtimer * 6) % 2;
      return this.reverse ? 4 + frame : 1 + frame;
    } else {
      return this.reverse ? 3 : 0;
    }
  }

  draw() {
    renderer.spr(
      "player",
      Math.floor(this.x) - 8,
      Math.floor(this.y) - 16,
      this.frame,
      false,
      this.y
    );
    this.footsteps.draw();
  }
}
