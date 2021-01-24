const keyMap = {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight"
};

export default class Keyboard {
  private keys: Record<string, boolean>;

  constructor() {
    this.keys = {};

    window.addEventListener("keydown", e => {
      this.keys[e.key] = true;
    });

    window.addEventListener("keyup", e => {
      this.keys[e.key] = false;
    });
  }

  isDown(key: keyof typeof keyMap) {
    return this.keys[keyMap[key]];
  }
}
