import { frames, sprites, palette as paletteRaw } from "../assets/sprites/sprites.json";
import spriteSheetUrl from "../assets/sprites/sprites.png";
import { Color } from "./renderer";

export const palette = (paletteRaw as unknown) as Record<keyof typeof paletteRaw, Color>;
export type SpriteName = keyof typeof sprites;

class SpriteSheet {
  img: HTMLImageElement;
  data: ImageData;
  loaded = false;

  constructor() {
    this.img = document.createElement("img");
    this.img.src = spriteSheetUrl;
    this.img.onload = () => {
      this.loaded = true;

      const canvas = document.createElement("canvas");
      canvas.width = this.img.naturalWidth;
      canvas.height = this.img.naturalHeight;

      const context = canvas.getContext("2d");
      context.drawImage(this.img, 0, 0);
      this.data = context.getImageData(0, 0, canvas.width, canvas.height);
    };
  }

  spriteFrame(
    name: keyof typeof sprites,
    frame = 0
  ): { x: number; y: number; w: number; h: number } {
    if (!sprites[name][frame]) {
      throw new Error(`Couldn't find frame ${frame} of sprite '${name}'`);
    }

    return frames[sprites[name][frame]].frame;
  }
}

export default new SpriteSheet();
