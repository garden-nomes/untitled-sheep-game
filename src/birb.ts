import { distSq } from "./vector";
import { state } from "./main";

const { player, birbs } = state;

enum BirbState {
  Standing,
  Hopping,
  Flying
}

export default class Birb {
  state = BirbState.Standing;
  animtimer = 0;
  z = 0;
  flightDirection: number;
  lifetimer = 20;
  reverse = false;
  hops = 1;
  hopStartX: number;
  hopTimer: number;

  constructor(public x: number, public y: number) {
    this.flightDirection = (Math.random() * Math.PI) / 2 + Math.PI / 4;
  }

  update() {
    if (
      this.state !== BirbState.Flying &&
      distSq([this.x, this.y], [player.x, player.y]) < 48 * 48
    ) {
      this.state = BirbState.Flying;
      this.reverse = this.flightDirection < Math.PI / 2;
    }

    if (this.state === BirbState.Standing) {
      if (Math.random() < deltaTime / 4) {
        this.state = BirbState.Hopping;
        this.reverse = Math.random() < 0.5;
        this.hops = Math.floor(Math.random() * 3) + 1;
        this.hopStartX = this.x;
        this.hopTimer = this.hops / 4;
      }
    }

    if (this.state === BirbState.Flying) {
      this.x += Math.cos(this.flightDirection) * 96 * deltaTime;
      this.z += Math.sin(this.flightDirection) * 96 * deltaTime;

      this.animtimer += deltaTime;
      this.lifetimer -= deltaTime;

      if (this.lifetimer <= 0) {
        birbs.splice(birbs.indexOf(this), 1);
      }
    }

    if (this.state === BirbState.Hopping) {
      this.hopTimer -= deltaTime;

      if (this.hopTimer <= 0) {
        this.x = this.hopStartX + this.hops * 4 * (this.reverse ? 1 : -1);
        this.z = 0;
        this.state = BirbState.Standing;
      } else {
        this.x =
          this.hopStartX +
          (1 - this.hopTimer / (this.hops / 4)) * this.hops * 4 * (this.reverse ? 1 : -1);

        this.z =
          Math.max(
            Math.sin(this.hopTimer * 4 * Math.PI),
            Math.sin((this.hopTimer * 4 + 1) * Math.PI)
          ) * 2;
      }
    }
  }

  get frame() {
    if (this.state === BirbState.Flying) {
      return (Math.floor(this.animtimer * 8) % 3) + 1;
    } else {
      return 0;
    }
  }

  draw() {
    renderer.spr(
      "birb",
      this.x - 1,
      this.y - this.z - 3,
      this.frame,
      this.reverse,
      this.y
    );
  }
}
