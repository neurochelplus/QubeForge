import { BLOCK } from "./Blocks";
import { BlockRegistry } from "../registry/BlockRegistry";

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export class BlockColors {
  // Кэш цветов для производительности
  private static readonly COLORS: Map<number, { top: RGB; side: RGB }> = new Map([
    [BLOCK.GRASS, {
      top: { r: 0.33, g: 0.6, b: 0.33 },
      side: { r: 0.54, g: 0.27, b: 0.07 },
    }],
    [BLOCK.DIRT, {
      top: { r: 0.54, g: 0.27, b: 0.07 },
      side: { r: 0.54, g: 0.27, b: 0.07 },
    }],
    [BLOCK.STONE, {
      top: { r: 0.5, g: 0.5, b: 0.5 },
      side: { r: 0.5, g: 0.5, b: 0.5 },
    }],
    [BLOCK.BEDROCK, {
      top: { r: 0.05, g: 0.05, b: 0.05 },
      side: { r: 0.05, g: 0.05, b: 0.05 },
    }],
    [BLOCK.WOOD, {
      top: { r: 0.4, g: 0.2, b: 0.0 },
      side: { r: 0.4, g: 0.2, b: 0.0 },
    }],
    [BLOCK.STICK, {
      top: { r: 0.4, g: 0.2, b: 0.0 },
      side: { r: 0.4, g: 0.2, b: 0.0 },
    }],
    // Textured blocks use white (texture provides color)
    [BLOCK.LEAVES, {
      top: { r: 1.0, g: 1.0, b: 1.0 },
      side: { r: 1.0, g: 1.0, b: 1.0 },
    }],
    [BLOCK.PLANKS, {
      top: { r: 1.0, g: 1.0, b: 1.0 },
      side: { r: 1.0, g: 1.0, b: 1.0 },
    }],
    [BLOCK.CRAFTING_TABLE, {
      top: { r: 1.0, g: 1.0, b: 1.0 },
      side: { r: 1.0, g: 1.0, b: 1.0 },
    }],
    [BLOCK.COAL_ORE, {
      top: { r: 1.0, g: 1.0, b: 1.0 },
      side: { r: 1.0, g: 1.0, b: 1.0 },
    }],
    [BLOCK.IRON_ORE, {
      top: { r: 1.0, g: 1.0, b: 1.0 },
      side: { r: 1.0, g: 1.0, b: 1.0 },
    }],
    [BLOCK.FURNACE, {
      top: { r: 1.0, g: 1.0, b: 1.0 },
      side: { r: 1.0, g: 1.0, b: 1.0 },
    }],
  ]);

  public static getColor(blockType: number, side: "top" | "side" = "top"): RGB {
    // Сначала проверить кэш (для производительности)
    const cached = this.COLORS.get(blockType);
    if (cached) {
      return cached[side];
    }

    // Попробовать получить из реестра
    const blockDef = BlockRegistry.getByNumericId(blockType);
    if (blockDef?.colors) {
      const color = side === "top" ? blockDef.colors.top : blockDef.colors.side;
      return color;
    }

    // Default color
    return { r: 1.0, g: 1.0, b: 1.0 };
  }

  public static getColorForFace(blockType: number, face: string): RGB {
    const sideType = face === "top" ? "top" : "side";
    return this.getColor(blockType, sideType);
  }
}
