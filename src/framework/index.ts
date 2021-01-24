import Keyboard from "./keyboard";
import Renderer from "./renderer";
import TouchControls from "./touch-controls";
import { palette as palette_ } from "./sprites";

// grab fps label

const fpsDiv = document.querySelector<HTMLDivElement>("#fps");
fpsDiv.style.visibility = "hidden";

// grab palette label

const paletteDiv = document.querySelector<HTMLDivElement>("#palette");
paletteDiv.style.visibility = "hidden";

if (paletteDiv) {
  const ul = paletteDiv.appendChild(document.createElement("ul"));
  ul.className = "palette-list";

  for (const colorName in palette_) {
    const [r, g, b] = palette_[colorName];

    const li = ul.appendChild(document.createElement("li"));
    li.className = "palette-list_item";

    const label = li.appendChild(document.createElement("div"));
    label.className = "palette-list_item_label";
    label.textContent = colorName;

    const swatch = li.appendChild(document.createElement("div"));
    swatch.className = "palette-list_item_swatch";
    swatch.style.background = `rgb(${r},${g},${b})`;
  }
}

// setup canvas

const canvas = document.querySelector<HTMLCanvasElement>("#app");
const context = canvas.getContext("2d");

// globals

declare global {
  var renderer: Renderer;
  var keyboard: Keyboard;
  var touchControls: TouchControls;
  var palette: typeof palette_;
  var width: number;
  var height: number;
  var deltaTime: number;
  var elapsed: number;
  var pixels: number;
  function resize(): void;
  function showPalette(value: boolean): void;
  function showFps(value: boolean): void;
}

(window as any).renderer = new Renderer(context);
(window as any).keyboard = new Keyboard();
(window as any).touchControls = new TouchControls();
(window as any).palette = palette_;
(window as any).width = 0;
(window as any).height = 0;
(window as any).deltaTime = 0;
(window as any).elapsed = 0;
(window as any).pixels = 256; // minimum screen width/height in pixels

(window as any).showPalette = function (value: boolean) {
  paletteDiv.style.visibility = value ? "initial" : "hidden";
};

(window as any).showFps = function (value: boolean) {
  fpsDiv.style.visibility = value ? "initial" : "hidden";
};

// calculate canvas size

(window as any).resize = function resize() {
  const scale = Math.min(
    Math.floor(window.innerHeight / pixels),
    Math.floor(window.innerWidth / pixels)
  );

  canvas.width = window.innerWidth / scale;
  canvas.height = window.innerHeight / scale;

  width = canvas.width;
  height = canvas.height;

  renderer.resize();
};

resize();
window.addEventListener("resize", resize);

// main loop

export default function loop(update: () => void) {
  let t = performance.now();
  function loop() {
    const now = performance.now();
    deltaTime = (now - t) * 0.001;
    elapsed += deltaTime;
    t = now;

    const fps = 1 / deltaTime;
    fpsDiv.textContent = "fps: " + fps.toFixed(0);
    fpsDiv.style.color = fps > 30 ? "white" : "red";

    update();
    renderer.update();

    window.requestAnimationFrame(loop);
  }

  window.requestAnimationFrame(loop);
}
