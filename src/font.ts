import * as fontData from "../assets/font/font.json";
import fontSheetUrl from "../assets/font/font.png";

(window as any).fontData = fontData;

class FontSheet {
  img: HTMLImageElement;
  data: ImageData;
  loaded = false;

  spaceWidth = 4;
  lineHeight = 9;

  constructor() {
    this.img = document.createElement("img");
    this.img.src = fontSheetUrl;
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

  getCharacterFrame(character: string): null | [number, number, number, number] {
    return typeof fontData.characters[character] === "undefined"
      ? null
      : fontData.characters[character];
  }
}

export default new FontSheet();
