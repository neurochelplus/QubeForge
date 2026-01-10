import {
  CT_TOP_PATTERN,
  CT_SIDE_PATTERN,
  ORE_PATTERN,
  FURNACE_FRONT_PATTERN,
  FURNACE_TOP_PATTERN,
} from "./textures/BlockPatterns";

export const BLOCK_COLORS = {
  WOOD_PRIMARY: "#B47850", // Light Brown (180, 120, 80)
  WOOD_SECONDARY: "#50321E", // Dark Brown (80, 50, 30)
  COAL_BLACK: "#2A2A2A", // Dark Grey/Black
  IRON_BEIGE: "#E6C8A0", // Beige/Light Orange
  STONE_GREY: "#7D7D7D", // Standard Stone
  FURNACE_DARK: "#404040",
};

export interface BlockTextureDef {
  pattern?: string[];
  colors?: { primary: string; secondary: string };
}

export const BLOCK_DEFS: Record<string, BlockTextureDef> = {
  CRAFTING_TABLE_TOP: {
    pattern: CT_TOP_PATTERN,
    colors: {
      primary: BLOCK_COLORS.WOOD_PRIMARY,
      secondary: BLOCK_COLORS.WOOD_SECONDARY,
    },
  },
  CRAFTING_TABLE_SIDE: {
    pattern: CT_SIDE_PATTERN,
    colors: {
      primary: BLOCK_COLORS.WOOD_PRIMARY,
      secondary: BLOCK_COLORS.WOOD_SECONDARY,
    },
  },
  COAL_ORE: {
    pattern: ORE_PATTERN,
    colors: {
      primary: BLOCK_COLORS.COAL_BLACK,
      secondary: BLOCK_COLORS.STONE_GREY,
    },
  },
  IRON_ORE: {
    pattern: ORE_PATTERN,
    colors: {
      primary: BLOCK_COLORS.IRON_BEIGE,
      secondary: BLOCK_COLORS.STONE_GREY,
    },
  },
  FURNACE_FRONT: {
    pattern: FURNACE_FRONT_PATTERN,
    colors: {
      primary: BLOCK_COLORS.FURNACE_DARK,
      secondary: BLOCK_COLORS.STONE_GREY,
    },
  },
  FURNACE_SIDE: {
    pattern: CT_SIDE_PATTERN,
    colors: {
      primary: BLOCK_COLORS.FURNACE_DARK,
      secondary: BLOCK_COLORS.STONE_GREY,
    },
  },
  FURNACE_TOP: {
    pattern: FURNACE_TOP_PATTERN,
    colors: {
      primary: BLOCK_COLORS.FURNACE_DARK,
      secondary: BLOCK_COLORS.STONE_GREY,
    },
  },
};

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}
