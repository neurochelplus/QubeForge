import * as THREE from "three";
import { BLOCK } from "../constants/Blocks";
import { BLOCK_DEFS } from "./BlockTextures";

// 0: Transparent
// 1: Handle (Stick)
// 2: Material (Head)

const SWORD_PATTERN = [
  "0000000000000222",
  "0000000000002222",
  "0000000000022222",
  "0000000000222220",
  "0000000002222200",
  "0000000022222000",
  "0011000222220000",
  "0012102222200000",
  "0001212222000000",
  "0000111220000000",
  "0000111100000000",
  "0001111210000000",
  "0011100121000000",
  "2211000011000000",
  "2120000000000000",
  "2220000000000000",
];

const PICKAXE_PATTERN = [
  "0000022222222000",
  "0000002222222220",
  "0000000222222220",
  "0000000000212222",
  "0000000000111222",
  "0000000001112222",
  "0000000011100222",
  "0000000111000222",
  "0000001110000222",
  "0000011100000022",
  "0000111000000002",
  "0001110000000000",
  "0011100000000000",
  "0111000000000000",
  "1110000000000000",
  "1100000000000000",
];

const AXE_PATTERN = [
  "0000000000000000",
  "0000000000000000",
  "0000000000000000",
  "0000000000210000",
  "0000000002221000",
  "0000000022222220",
  "0000000012222222",
  "0000000111222220",
  "0000001110222200",
  "0000011100222000",
  "0000111000020000",
  "0001110000000000",
  "0011100000000000",
  "0111000000000000",
  "1110000000000000",
  "1100000000000000",
];

const SHOVEL_PATTERN = [
  "0000000000022222",
  "0000000000222222",
  "0000000002222222",
  "0000000002222222",
  "0000000000112222",
  "0000000001112220",
  "0000000011102200",
  "0000000111000000",
  "0000001110000000",
  "0000011100000000",
  "0000111000000000",
  "0001110000000000",
  "0011100000000000",
  "0111000000000000",
  "2210000000000000",
  "2200000000000000",
];

const STICK_PATTERN = [
  "0000000000000000",
  "0000000000000110",
  "0000000000001110",
  "0000000000011100",
  "0000000000111000",
  "0000000001110000",
  "0000000011100000",
  "0000000111000000",
  "0000001110000000",
  "0000011100000000",
  "0000111000000000",
  "0001110000000000",
  "0011100000000000",
  "0111000000000000",
  "0110000000000000",
  "0000000000000000",
];

const COMPASS_PATTERN = [
  "0000004444000000",
  "0000442222440000",
  "0004222222224000",
  "0042222332222400",
  "0422223333222240",
  "0422222332222240",
  "4222222332222224",
  "4222222332222224",
  "4222222332222224",
  "4222222332222224",
  "0422222332222240",
  "0422222332222240",
  "0042222222222400",
  "0004222222224000",
  "0000442222440000",
  "0000004444000000",
];

const COAL_PATTERN = [
  "0000000000000000",
  "0000000000000000",
  "0000000222200000",
  "0000002222220000",
  "0000022222222000",
  "0000022222222000",
  "0000222222222000",
  "0000222222222200",
  "0000022222222200",
  "0000002222222000",
  "0000000222220000",
  "0000000022200000",
  "0000000000000000",
  "0000000000000000",
  "0000000000000000",
  "0000000000000000",
];

const INGOT_PATTERN = [
  "0000000000000000",
  "0000000000000000",
  "0000000000000000",
  "0000000222222000",
  "0000002222222200",
  "0000022222222220",
  "0000022222222220",
  "0000022222222220",
  "0000002222222200",
  "0000000222222000",
  "0000000000000000",
  "0000000000000000",
  "0000000000000000",
  "0000000000000000",
  "0000000000000000",
  "0000000000000000",
];

// Colors
const COLORS = {
  HANDLE: "#5C4033", // Dark Brown
  WOOD: "#8B5A2B", // Wood Planks Color
  STONE: "#7d7d7d", // Stone Color
  SILVER: "#C0C0C0", // Compass Case & Iron
  RED: "#FF0000", // Needle
  BLACK: "#000000", // Border
  COAL: "#2A2A2A", // Coal Color
  IRON: "#E6E6E6", // Iron Ingot Color (Lighter than Silver)
};

export interface GeneratedTexture {
  texture: THREE.CanvasTexture;
  dataUrl: string;
}

export function generateToolTexture(
  pattern: string[],
  materialColor: string,
): GeneratedTexture {
  const size = 16; // internal resolution
  const scale = 1; // can be 1, we let CSS scale it up

  const canvas = document.createElement("canvas");
  canvas.width = size * scale;
  canvas.height = size * scale;
  const ctx = canvas.getContext("2d")!;

  // Disable smoothing for pixel art
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < size; y++) {
    const row = pattern[y];
    for (let x = 0; x < size; x++) {
      const pixel = row[x];
      if (pixel === "0") continue;

      if (pixel === "1") {
        ctx.fillStyle = COLORS.HANDLE;
      } else if (pixel === "2") {
        ctx.fillStyle = materialColor;
      } else if (pixel === "3") {
        ctx.fillStyle = COLORS.RED;
      } else if (pixel === "4") {
        ctx.fillStyle = COLORS.BLACK;
      }

      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }

  // Border/Outline logic (Optional: adds a faint shadow for better visibility)
  // For now, raw pixel art is fine.

  // 1. Create Three.js Texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  // 2. Create DataURL
  const dataUrl = canvas.toDataURL();

  return { texture, dataUrl };
}

export function generateBlockIcon(
  pattern: string[],
  colors: { primary: string; secondary: string },
): GeneratedTexture {
  const size = 16;
  const scale = 1;

  const canvas = document.createElement("canvas");
  canvas.width = size * scale;
  canvas.height = size * scale;
  const ctx = canvas.getContext("2d")!;

  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < size; y++) {
    const row = pattern[y];
    for (let x = 0; x < size; x++) {
      const pixel = row[x];
      // 1: Primary, 2: Secondary
      if (pixel === "1") {
        ctx.fillStyle = colors.primary;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      } else if (pixel === "2") {
        ctx.fillStyle = colors.secondary;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const dataUrl = canvas.toDataURL();

  return { texture, dataUrl };
}

// Pre-generate definitions
export const TOOL_DEFS = {
  STICK: { pattern: STICK_PATTERN, color: COLORS.HANDLE }, // Stick is handle material
  WOODEN_SWORD: { pattern: SWORD_PATTERN, color: COLORS.WOOD },
  STONE_SWORD: { pattern: SWORD_PATTERN, color: COLORS.STONE },
  WOODEN_PICKAXE: { pattern: PICKAXE_PATTERN, color: COLORS.WOOD },
  STONE_PICKAXE: { pattern: PICKAXE_PATTERN, color: COLORS.STONE },
  WOODEN_AXE: { pattern: AXE_PATTERN, color: COLORS.WOOD },
  STONE_AXE: { pattern: AXE_PATTERN, color: COLORS.STONE },
  WOODEN_SHOVEL: { pattern: SHOVEL_PATTERN, color: COLORS.WOOD },
  STONE_SHOVEL: { pattern: SHOVEL_PATTERN, color: COLORS.STONE },
  BROKEN_COMPASS: { pattern: COMPASS_PATTERN, color: COLORS.SILVER },
  COAL: { pattern: COAL_PATTERN, color: COLORS.COAL },
  IRON_INGOT: { pattern: INGOT_PATTERN, color: COLORS.IRON },
};

// Tool Textures Registry
export const TOOL_TEXTURES: Record<number, GeneratedTexture> = {};

export function initToolTextures() {
  try {
    if (!BLOCK) {
      console.error("BLOCK is undefined! World module failed to load?");
      return;
    }

    console.log("Generating tool textures...");

    TOOL_TEXTURES[BLOCK.STICK] = generateToolTexture(
      TOOL_DEFS.STICK.pattern,
      TOOL_DEFS.STICK.color,
    );

    TOOL_TEXTURES[BLOCK.WOODEN_SWORD] = generateToolTexture(
      TOOL_DEFS.WOODEN_SWORD.pattern,
      TOOL_DEFS.WOODEN_SWORD.color,
    );
    TOOL_TEXTURES[BLOCK.STONE_SWORD] = generateToolTexture(
      TOOL_DEFS.STONE_SWORD.pattern,
      TOOL_DEFS.STONE_SWORD.color,
    );

    TOOL_TEXTURES[BLOCK.WOODEN_PICKAXE] = generateToolTexture(
      TOOL_DEFS.WOODEN_PICKAXE.pattern,
      TOOL_DEFS.WOODEN_PICKAXE.color,
    );
    TOOL_TEXTURES[BLOCK.STONE_PICKAXE] = generateToolTexture(
      TOOL_DEFS.STONE_PICKAXE.pattern,
      TOOL_DEFS.STONE_PICKAXE.color,
    );

    TOOL_TEXTURES[BLOCK.WOODEN_AXE] = generateToolTexture(
      TOOL_DEFS.WOODEN_AXE.pattern,
      TOOL_DEFS.WOODEN_AXE.color,
    );
    TOOL_TEXTURES[BLOCK.STONE_AXE] = generateToolTexture(
      TOOL_DEFS.STONE_AXE.pattern,
      TOOL_DEFS.STONE_AXE.color,
    );

    TOOL_TEXTURES[BLOCK.WOODEN_SHOVEL] = generateToolTexture(
      TOOL_DEFS.WOODEN_SHOVEL.pattern,
      TOOL_DEFS.WOODEN_SHOVEL.color,
    );
    TOOL_TEXTURES[BLOCK.STONE_SHOVEL] = generateToolTexture(
      TOOL_DEFS.STONE_SHOVEL.pattern,
      TOOL_DEFS.STONE_SHOVEL.color,
    );

    TOOL_TEXTURES[BLOCK.BROKEN_COMPASS] = generateToolTexture(
      TOOL_DEFS.BROKEN_COMPASS.pattern,
      TOOL_DEFS.BROKEN_COMPASS.color,
    );

    TOOL_TEXTURES[BLOCK.COAL] = generateToolTexture(
      TOOL_DEFS.COAL.pattern,
      TOOL_DEFS.COAL.color,
    );

    TOOL_TEXTURES[BLOCK.IRON_INGOT] = generateToolTexture(
      TOOL_DEFS.IRON_INGOT.pattern,
      TOOL_DEFS.IRON_INGOT.color,
    );

    // Generate Crafting Table Icon
    if (
      BLOCK_DEFS.CRAFTING_TABLE_TOP &&
      BLOCK_DEFS.CRAFTING_TABLE_TOP.pattern &&
      BLOCK_DEFS.CRAFTING_TABLE_TOP.colors
    ) {
      TOOL_TEXTURES[BLOCK.CRAFTING_TABLE] = generateBlockIcon(
        BLOCK_DEFS.CRAFTING_TABLE_TOP.pattern,
        BLOCK_DEFS.CRAFTING_TABLE_TOP.colors,
      );
    }

    // Generate Ore Icons
    if (BLOCK_DEFS.COAL_ORE) {
      TOOL_TEXTURES[BLOCK.COAL_ORE] = generateBlockIcon(
        BLOCK_DEFS.COAL_ORE.pattern,
        BLOCK_DEFS.COAL_ORE.colors,
      );
    }
    if (BLOCK_DEFS.IRON_ORE) {
      TOOL_TEXTURES[BLOCK.IRON_ORE] = generateBlockIcon(
        BLOCK_DEFS.IRON_ORE.pattern,
        BLOCK_DEFS.IRON_ORE.colors,
      );
    }

    // Generate Furnace Icon
    if (BLOCK_DEFS.FURNACE_FRONT) {
      TOOL_TEXTURES[BLOCK.FURNACE] = generateBlockIcon(
        BLOCK_DEFS.FURNACE_FRONT.pattern,
        BLOCK_DEFS.FURNACE_FRONT.colors,
      );
    }

    console.log("Tool textures generated.");
  } catch (e) {
    console.error("Failed to generate tool textures:", e);
  }
}
