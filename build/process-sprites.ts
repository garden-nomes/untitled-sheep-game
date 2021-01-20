import * as fs from "fs";
import * as spriteData from "../assets/sprites/sprites.json";
import * as colorNamer from "color-namer";
import { PNG } from "pngjs";
import { camelCase } from "change-case";

const nameRegex = /^(.*)\.aseprite$/;
const nameNumberRegex = /^(.*) (\d+).aseprite$/;

const sprites: { [name: string]: any[] } = {};

function buildPalette() {
  if (!spriteData.frames["palette.aseprite"]) {
    return null;
  }

  const { frame } = spriteData.frames["palette.aseprite"];
  const data = fs.readFileSync("./assets/sprites/sprites.png");
  const png = PNG.sync.read(data);

  const paletteList: {
    [name: string]: {
      color: [number, number, number, number];
      names: colorNamer.Color[];
    }[];
  } = {};

  for (let y = frame.y; y < frame.y + frame.h; y++) {
    for (let x = frame.x; x < frame.x + frame.w; x++) {
      const i = (y * png.width + x) * 4;

      if (png.data[i + 3] > 0) {
        const r = png.data[i];
        const g = png.data[i + 1];
        const b = png.data[i + 2];
        const color = `rgb(${r},${g},${b})`;
        const names = colorNamer(color);
        const name = names.pantone[0].name;

        if (typeof paletteList[name] === "undefined") {
          paletteList[name] = [];
        }

        paletteList[name].push({
          color: [r, g, b, 255],
          names: names.pantone
        });
      }
    }
  }

  const palette: { [name: string]: [number, number, number, number] } = {};

  for (const colorName in paletteList) {
    if (paletteList[colorName].length === 1) {
      palette[camelCase(colorName)] = paletteList[colorName][0].color;
    } else {
      const remaining = paletteList[colorName];

      while (remaining.length > 0) {
        const options = remaining.map(({ color, names }, index) => {
          const { name, distance } = names.find(
            ({ name }) => typeof palette[camelCase(name)] === "undefined"
          );

          return { color, name, distance, index };
        });

        options.sort((a, b) => a.distance - b.distance);
        palette[camelCase(options[0].name)] = options[0].color;
        remaining.splice(options[0].index, 1);
      }
    }
  }

  return palette;
}

for (const filename in spriteData.frames) {
  const nameNumberResult = filename.match(nameNumberRegex);
  const nameResult = filename.match(nameRegex);

  if (filename === "palette.aseprite") {
    continue;
  }

  if (nameNumberResult) {
    const [_, name, frameStr] = nameNumberResult;
    const frame = Number.parseInt(frameStr);

    if (typeof sprites[name] === "undefined") {
      sprites[name] = [];
    }

    sprites[name].splice(frame, 0, filename);
  } else if (nameResult) {
    const name = nameResult[1];
    sprites[name] = [filename];
  } else {
    console.error("unable to parse filename: " + filename);
  }
}

const palette = buildPalette();
if (palette) {
  (spriteData as any).palette = palette;
}

(spriteData as any).sprites = sprites;
fs.writeFileSync("./assets/sprites/sprites.json", JSON.stringify(spriteData, null, "  "));
