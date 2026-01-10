import * as THREE from "three";
import { TOOL_COLORS } from "./ToolPatterns";

export interface GeneratedTexture {
  texture: THREE.CanvasTexture;
  dataUrl: string;
}

export class TextureGenerator {
  private static readonly SIZE = 16;
  private static readonly SCALE = 1;

  public static generateToolTexture(
    pattern: string[],
    materialColor: string,
  ): GeneratedTexture {
    const canvas = this.createCanvas();
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    for (let y = 0; y < this.SIZE; y++) {
      const row = pattern[y];
      for (let x = 0; x < this.SIZE; x++) {
        const pixel = row[x];
        if (pixel === "0") continue;

        ctx.fillStyle = this.getPixelColor(pixel, materialColor);
        ctx.fillRect(x * this.SCALE, y * this.SCALE, this.SCALE, this.SCALE);
      }
    }

    return this.createTextureFromCanvas(canvas);
  }

  public static generateBlockIcon(
    pattern: string[],
    colors: { primary: string; secondary: string },
  ): GeneratedTexture {
    const canvas = this.createCanvas();
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    for (let y = 0; y < this.SIZE; y++) {
      const row = pattern[y];
      for (let x = 0; x < this.SIZE; x++) {
        const pixel = row[x];
        if (pixel === "1") {
          ctx.fillStyle = colors.primary;
          ctx.fillRect(x * this.SCALE, y * this.SCALE, this.SCALE, this.SCALE);
        } else if (pixel === "2") {
          ctx.fillStyle = colors.secondary;
          ctx.fillRect(x * this.SCALE, y * this.SCALE, this.SCALE, this.SCALE);
        }
      }
    }

    return this.createTextureFromCanvas(canvas);
  }

  private static createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = this.SIZE * this.SCALE;
    canvas.height = this.SIZE * this.SCALE;
    return canvas;
  }

  private static getPixelColor(pixel: string, materialColor: string): string {
    if (pixel === "1") return TOOL_COLORS.HANDLE;
    if (pixel === "2") return materialColor;
    if (pixel === "3") return TOOL_COLORS.RED;
    if (pixel === "4") return TOOL_COLORS.BLACK;
    return "#000000";
  }

  private static createTextureFromCanvas(canvas: HTMLCanvasElement): GeneratedTexture {
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    const dataUrl = canvas.toDataURL();

    return { texture, dataUrl };
  }
}
