import font from "./font";
import sprites, { SpriteName } from "./sprites";

export type Color = [number, number, number, number];

(window as any).font = font;

export enum TextAlign {
  Left,
  Right,
  Center
}

export default class Renderer {
  width: number;
  height: number;
  depthBuffer: Float32Array;
  pixels: ImageData;
  clearColor: Color = [0, 0, 0, 255];
  cameraX = 0;
  cameraY = 0;

  constructor(private context: CanvasRenderingContext2D) {
    this.width = context.canvas.width;
    this.height = context.canvas.height;
    this.depthBuffer = new Float32Array(this.width * this.height);
    this.pixels = context.createImageData(this.width, this.height);
    this.clear();
  }

  clientToGameCoordinates(clientX: number, clientY: number): [number, number] {
    const { left, top, width, height } = this.context.canvas.getBoundingClientRect();

    return [
      (clientX - left) * (this.width / width),
      (clientY - top) * (this.height / height)
    ];
  }

  resize() {
    this.width = this.context.canvas.width;
    this.height = this.context.canvas.height;
    this.depthBuffer = new Float32Array(this.width * this.height);
    this.pixels = this.context.createImageData(this.width, this.height);
    this.clear();
  }

  clear() {
    this.depthBuffer.fill(Number.NEGATIVE_INFINITY);
    for (let i = 0; i < this.pixels.data.length; i += 4) {
      this.pixels.data[i] = this.clearColor[0];
      this.pixels.data[i + 1] = this.clearColor[1];
      this.pixels.data[i + 2] = this.clearColor[2];
      this.pixels.data[i + 3] = this.clearColor[3];
    }
  }

  update() {
    this.context.putImageData(this.pixels, 0, 0);
  }

  set(x: number, y: number, color: Color, depth = Number.NEGATIVE_INFINITY) {
    x = x - this.cameraX;
    y = y - this.cameraY;

    if (x < 0 || x > this.width - 1 || y < 0 || y > this.height - 1) return;

    const i = y * this.width + x;

    if (this.depthBuffer[i] <= depth) {
      this.depthBuffer[i] = depth;
      this.pixels.data[i * 4] = color[0];
      this.pixels.data[i * 4 + 1] = color[1];
      this.pixels.data[i * 4 + 2] = color[2];
      this.pixels.data[i * 4 + 3] = color[3];
    }
  }

  camera(x: number, y: number) {
    this.cameraX = ~~x - ~~(width / 2);
    this.cameraY = ~~y - ~~(height / 2);
  }

  drawImage(
    data: ImageData,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    flipX = false,
    depth = Number.NEGATIVE_INFINITY,
    color?: Color
  ) {
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const i = ((sy + y) * data.width + (sx + x)) * 4;

        if (data.data[i + 3] > 0) {
          const c = color
            ? color
            : ([
                data.data[i],
                data.data[i + 1],
                data.data[i + 2],
                data.data[i + 3]
              ] as Color);

          this.set(flipX ? dx + sw - x : dx + x, dy + y, c, depth);
        }
      }
    }
  }

  text(
    text: string,
    x: number,
    y: number,
    align = TextAlign.Left,
    color = palette.black,
    shadowColor?: Color
  ) {
    if (!font.loaded) return;

    x = ~~x;
    y = ~~y;

    if (align === TextAlign.Right) {
      x -= this.textWidth(text);
    } else if (align === TextAlign.Center) {
      x -= Math.floor(this.textWidth(text) / 2);
    }

    for (const character of text) {
      if (character === " ") {
        x += font.spaceWidth;
      } else if (font.getCharacterFrame(character) !== null) {
        const [sx, sy, sw, sh] = font.getCharacterFrame(character);

        if (shadowColor) {
          this.drawImage(font.data, sx, sy, sw, sh, x, y + 1, false, 10_000, shadowColor);

          this.drawImage(
            font.data,
            sx,
            sy,
            sw,
            sh,
            x + 1,
            y + 1,
            false,
            10_000,
            shadowColor
          );
        }

        this.drawImage(font.data, sx, sy, sw, sh, x, y, false, 10_000, color);

        x += sw + 1;
      }
    }
  }

  textWidth(text: string) {
    let width = 0;

    for (const character of text) {
      if (character === " ") {
        width += font.spaceWidth;
      } else if (font.getCharacterFrame(character) !== null) {
        const characterWidth = font.getCharacterFrame(character)[2];
        width += characterWidth + 1;
      }
    }

    return width;
  }

  spr(
    name: SpriteName,
    dx: number,
    dy: number,
    frame = 0,
    flipX = false,
    depth = Number.NEGATIVE_INFINITY
  ) {
    if (!sprites.loaded) return;

    dx = ~~dx;
    dy = ~~dy;

    const { x: sx, y: sy, w, h } = sprites.spriteFrame(name, frame);
    this.drawImage(sprites.data, sx, sy, w, h, dx, dy, flipX, depth);
  }

  line(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: Color,
    depth = Number.NEGATIVE_INFINITY
  ) {
    // Bresenham's line algorithm, implementation from https://stackoverflow.com/a/55666538/7351962
    x0 = ~~x0;
    y0 = ~~y0;
    x1 = ~~x1;
    y1 = ~~y1;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;

    let err = dx - dy;
    while (x0 !== x1 || y0 !== y1) {
      const e2 = err << 1;

      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }

      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }

      this.set(x0, y0, color, depth);
    }
  }

  rectfill(
    x: number,
    y: number,
    w: number,
    h: number,
    color: Color,
    depth = Number.NEGATIVE_INFINITY
  ) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        this.set(xx, yy, color, depth);
      }
    }
  }

  circfill(
    x: number,
    y: number,
    r: number,
    color: Color,
    depth = Number.NEGATIVE_INFINITY
  ) {
    x = ~~x;
    y = ~~y;
    r = ~~r;

    let [cx, cy] = [r, 0];
    let f = 1 - r;
    let ddfX = r * -2;
    let ddfY = 1;

    this.set(x, y + r, color, depth);
    this.set(x, y - r, color, depth);
    for (let rx = -r; rx <= r; rx++) {
      this.set(x + rx, y, color, depth);
    }

    while (cy < cx) {
      if (f >= 0) {
        cx--;
        ddfX += 2;
        f += ddfX;
      }

      cy++;
      ddfY += 2;
      f += ddfY;

      for (let rx = -cx; rx <= cx; rx++) {
        this.set(x + rx, y + cy, color, depth);
        this.set(x + rx, y - cy, color, depth);
      }

      for (let rx = -cy; rx <= cy; rx++) {
        this.set(x + rx, y + cx, color, depth);
        this.set(x + rx, y - cx, color, depth);
      }
    }
  }
}
