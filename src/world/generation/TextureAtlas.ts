import * as THREE from "three";
import { BLOCK_DEFS, hexToRgb } from "../../constants/BlockTextures";

export class TextureAtlas {
  private static readonly ATLAS_WIDTH = 192; // 12 slots * 16px
  private static readonly ATLAS_HEIGHT = 16;
  private static readonly SLOT_COUNT = 12;

  public static createNoiseTexture(): THREE.DataTexture {
    const width = this.ATLAS_WIDTH;
    const height = this.ATLAS_HEIGHT;
    const data = new Uint8Array(width * height * 4); // RGBA

    for (let i = 0; i < width * height; i++) {
      const stride = i * 4;
      const x = i % width;
      const y = Math.floor(i / width);

      const v = Math.floor(Math.random() * (255 - 150) + 150); // 150-255
      data[stride] = v; // R
      data[stride + 1] = v; // G
      data[stride + 2] = v; // B
      data[stride + 3] = 255; // Default Alpha

      // Slot 0: Noise (default)
      // Slot 1: Leaves (16-32)
      if (x >= 16 && x < 32) {
        if (Math.random() < 0.4) {
          data[stride + 3] = 0; // Transparent
        }
      }
      // Slot 2: Planks (32-48)
      else if (x >= 32 && x < 48) {
        const woodGrain = 230 + Math.random() * 20;
        data[stride] = woodGrain;
        data[stride + 1] = woodGrain;
        data[stride + 2] = woodGrain;
        if (y % 4 === 0) {
          data[stride] = 100;
          data[stride + 1] = 100;
          data[stride + 2] = 100;
        }
      }
      // Slots 3-5: Crafting Table (48-96)
      else if (x >= 48 && x < 96) {
        this.applyCraftingTableTexture(data, stride, x, y);
      }
      // Slots 6-7: Ores (96-128)
      else if (x >= 96 && x < 128) {
        this.applyOreTexture(data, stride, x, y);
      }
      // Slots 8-10: Furnace (128-176)
      else if (x >= 128 && x < 176) {
        this.applyFurnaceTexture(data, stride, x, y);
      }
    }

    const texture = new THREE.DataTexture(
      data,
      width,
      height,
      THREE.RGBAFormat,
    );
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    return texture;
  }

  private static applyCraftingTableTexture(
    data: Uint8Array,
    stride: number,
    x: number,
    y: number,
  ) {
    const localX = x % 16;
    let def = null;

    // Slot 3: Top (48-64)
    if (x >= 48 && x < 64) {
      def = BLOCK_DEFS.CRAFTING_TABLE_TOP;
    }
    // Slot 4: Side (64-80)
    else if (x >= 64 && x < 80) {
      def = BLOCK_DEFS.CRAFTING_TABLE_SIDE;
    }
    // Slot 5: Bottom (80-96)
    else {
      const woodGrain = 150 + Math.random() * 20;
      data[stride] = woodGrain;
      data[stride + 1] = woodGrain;
      data[stride + 2] = woodGrain;
      if (y % 4 === 0) {
        data[stride] = 80;
        data[stride + 1] = 80;
        data[stride + 2] = 80;
      }
      return;
    }

    if (def?.pattern && def.colors) {
      const char = def.pattern[y][localX];
      const colorHex =
        char === "2" ? def.colors.secondary : def.colors.primary;
      const rgb = hexToRgb(colorHex);
      data[stride] = rgb.r;
      data[stride + 1] = rgb.g;
      data[stride + 2] = rgb.b;
    }
  }

  private static applyOreTexture(
    data: Uint8Array,
    stride: number,
    x: number,
    y: number,
  ) {
    const localX = x % 16;
    // Slot 6: Coal (96-112), Slot 7: Iron (112-128)
    const def = x < 112 ? BLOCK_DEFS.COAL_ORE : BLOCK_DEFS.IRON_ORE;

    if (def?.pattern && def.colors) {
      const char = def.pattern[y][localX];

      if (char === "2") {
        // Secondary (stone base)
        const noiseV = Math.floor(Math.random() * (255 - 150) + 150);
        const stoneV = Math.floor(noiseV * 0.5);
        data[stride] = stoneV;
        data[stride + 1] = stoneV;
        data[stride + 2] = stoneV;
      } else {
        // Primary (ore)
        const rgb = hexToRgb(def.colors.primary);
        data[stride] = rgb.r;
        data[stride + 1] = rgb.g;
        data[stride + 2] = rgb.b;
      }
    }
  }

  private static applyFurnaceTexture(
    data: Uint8Array,
    stride: number,
    x: number,
    y: number,
  ) {
    const localX = x % 16;
    let def = null;

    // Slot 8: Front (128-144)
    if (x < 144) {
      def = BLOCK_DEFS.FURNACE_FRONT;
    }
    // Slot 9: Side (144-160)
    else if (x < 160) {
      def = BLOCK_DEFS.FURNACE_SIDE;
    }
    // Slot 10: Top (160-176)
    else if (x < 176) {
      def = BLOCK_DEFS.FURNACE_TOP;
    }

    if (def?.pattern && def.colors) {
      const char = def.pattern[y][localX];
      const colorHex =
        char === "2" ? def.colors.secondary : def.colors.primary;
      const rgb = hexToRgb(colorHex);

      const noise = Math.random() * 0.1 - 0.05; // +/- 5%
      const r = Math.min(255, Math.max(0, rgb.r + noise * 255));
      const g = Math.min(255, Math.max(0, rgb.g + noise * 255));
      const b = Math.min(255, Math.max(0, rgb.b + noise * 255));

      data[stride] = r;
      data[stride + 1] = g;
      data[stride + 2] = b;
    }
  }

  public static getUVStep(): number {
    return 1.0 / this.SLOT_COUNT;
  }
}
