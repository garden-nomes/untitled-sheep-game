import * as fs from "fs";
import { PNG } from "pngjs";

const gridSize = [7, 9];

const data = fs.readFileSync("./assets/font/font.png");
const png = PNG.sync.read(data);
const gridWidth = Math.floor(png.width / gridSize[0]);
const gridHeight = Math.floor(png.height / gridSize[1]);
const characterCount = gridWidth * gridHeight;

const characters: { [char: string]: [number, number, number, number] } = {};

for (let i = 0; i < characterCount; i++) {
  let width = 0;

  let gridX = i % gridWidth;
  let gridY = Math.floor(i / gridWidth);

  for (let x = gridX * gridSize[0]; x < (gridX + 1) * gridSize[0]; x++) {
    for (let y = gridY * gridSize[1]; y < (gridY + 1) * gridSize[1]; y++) {
      const idx = (y * png.width + x) * 4;

      if (png.data[idx + 3] > 0) {
        width++;
        break;
      }
    }
  }

  if (width > 0) {
    characters[String.fromCharCode(i)] = [
      gridX * gridSize[0],
      gridY * gridSize[1],
      width,
      gridSize[1]
    ];
  }
}

fs.writeFileSync("./assets/font/font.json", JSON.stringify({ characters }));
