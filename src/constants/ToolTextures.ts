import { BLOCK } from "./Blocks";
import { BlockRegistry } from "../registry/BlockRegistry";
import { TextureGenerator } from "./textures/TextureGenerator";
import type { GeneratedTexture } from "./textures/TextureGenerator";
import {
  SWORD_PATTERN,
  PICKAXE_PATTERN,
  AXE_PATTERN,
  SHOVEL_PATTERN,
  STICK_PATTERN,
  COMPASS_PATTERN,
  COAL_PATTERN,
  INGOT_PATTERN,
  MEAT_PATTERN,
  TOOL_COLORS,
} from "./textures/ToolPatterns";

export const TOOL_DEFS = {
  STICK: { pattern: STICK_PATTERN, color: TOOL_COLORS.HANDLE },
  WOODEN_SWORD: { pattern: SWORD_PATTERN, color: TOOL_COLORS.WOOD },
  STONE_SWORD: { pattern: SWORD_PATTERN, color: TOOL_COLORS.STONE },
  WOODEN_PICKAXE: { pattern: PICKAXE_PATTERN, color: TOOL_COLORS.WOOD },
  STONE_PICKAXE: { pattern: PICKAXE_PATTERN, color: TOOL_COLORS.STONE },
  WOODEN_AXE: { pattern: AXE_PATTERN, color: TOOL_COLORS.WOOD },
  STONE_AXE: { pattern: AXE_PATTERN, color: TOOL_COLORS.STONE },
  WOODEN_SHOVEL: { pattern: SHOVEL_PATTERN, color: TOOL_COLORS.WOOD },
  STONE_SHOVEL: { pattern: SHOVEL_PATTERN, color: TOOL_COLORS.STONE },
  IRON_SWORD: { pattern: SWORD_PATTERN, color: TOOL_COLORS.IRON_TOOL },
  IRON_PICKAXE: { pattern: PICKAXE_PATTERN, color: TOOL_COLORS.IRON_TOOL },
  IRON_AXE: { pattern: AXE_PATTERN, color: TOOL_COLORS.IRON_TOOL },
  IRON_SHOVEL: { pattern: SHOVEL_PATTERN, color: TOOL_COLORS.IRON_TOOL },
  BROKEN_COMPASS: { pattern: COMPASS_PATTERN, color: TOOL_COLORS.SILVER },
  COAL: { pattern: COAL_PATTERN, color: TOOL_COLORS.COAL },
  IRON_INGOT: { pattern: INGOT_PATTERN, color: TOOL_COLORS.IRON },
  RAW_MEAT: { pattern: MEAT_PATTERN, color: TOOL_COLORS.RAW_MEAT },
  COOKED_MEAT: { pattern: MEAT_PATTERN, color: TOOL_COLORS.COOKED_MEAT },
};

export const TOOL_TEXTURES: Record<number, GeneratedTexture> = {};

export function initToolTextures() {
  try {
    if (!BLOCK) {
      console.error("BLOCK is undefined! World module failed to load?");
      return;
    }

    console.log("Generating tool textures...");

    // Generate tool textures
    TOOL_TEXTURES[BLOCK.STICK] = TextureGenerator.generateToolTexture(
      TOOL_DEFS.STICK.pattern,
      TOOL_DEFS.STICK.color,
    );

    TOOL_TEXTURES[BLOCK.WOODEN_SWORD] = TextureGenerator.generateToolTexture(
      TOOL_DEFS.WOODEN_SWORD.pattern,
      TOOL_DEFS.WOODEN_SWORD.color,
    );
    TOOL_TEXTURES[BLOCK.STONE_SWORD] = TextureGenerator.generateToolTexture(
      TOOL_DEFS.STONE_SWORD.pattern,
      TOOL_DEFS.STONE_SWORD.color,
    );

    TOOL_TEXTURES[BLOCK.WOODEN_PICKAXE] = TextureGenerator.generateToolTexture(
      TOOL_DEFS.WOODEN_PICKAXE.pattern,
      TOOL_DEFS.WOODEN_PICKAXE.color,
    );
    TOOL_TEXTURES[BLOCK.STONE_PICKAXE] = TextureGenerator.generateToolTexture(
      TOOL_DEFS.STONE_PICKAXE.pattern,
      TOOL_DEFS.STONE_PICKAXE.color,
    );

    TOOL_TEXTURES[BLOCK.WOODEN_AXE] = TextureGenerator.generateToolTexture(
      TOOL_DEFS.WOODEN_AXE.pattern,
      TOOL_DEFS.WOODEN_AXE.color,
    );
    TOOL_TEXTURES[BLOCK.STONE_AXE] = TextureGenerator.generateToolTexture(
      TOOL_DEFS.STONE_AXE.pattern,
      TOOL_DEFS.STONE_AXE.color,
    );

    TOOL_TEXTURES[BLOCK.WOODEN_SHOVEL] = TextureGenerator.generateToolTexture(
      TOOL_DEFS.WOODEN_SHOVEL.pattern,
      TOOL_DEFS.WOODEN_SHOVEL.color,
    );
    TOOL_TEXTURES[BLOCK.STONE_SHOVEL] = TextureGenerator.generateToolTexture(
      TOOL_DEFS.STONE_SHOVEL.pattern,
      TOOL_DEFS.STONE_SHOVEL.color,
    );

    TOOL_TEXTURES[BLOCK.IRON_SWORD] = TextureGenerator.generateToolTexture(
      TOOL_DEFS.IRON_SWORD.pattern,
      TOOL_DEFS.IRON_SWORD.color,
    );
    TOOL_TEXTURES[BLOCK.IRON_PICKAXE] = TextureGenerator.generateToolTexture(
      TOOL_DEFS.IRON_PICKAXE.pattern,
      TOOL_DEFS.IRON_PICKAXE.color,
    );
    TOOL_TEXTURES[BLOCK.IRON_AXE] = TextureGenerator.generateToolTexture(
      TOOL_DEFS.IRON_AXE.pattern,
      TOOL_DEFS.IRON_AXE.color,
    );
    TOOL_TEXTURES[BLOCK.IRON_SHOVEL] = TextureGenerator.generateToolTexture(
      TOOL_DEFS.IRON_SHOVEL.pattern,
      TOOL_DEFS.IRON_SHOVEL.color,
    );

    TOOL_TEXTURES[BLOCK.BROKEN_COMPASS] = TextureGenerator.generateToolTexture(
      TOOL_DEFS.BROKEN_COMPASS.pattern,
      TOOL_DEFS.BROKEN_COMPASS.color,
    );

    TOOL_TEXTURES[BLOCK.COAL] = TextureGenerator.generateToolTexture(
      TOOL_DEFS.COAL.pattern,
      TOOL_DEFS.COAL.color,
    );

    TOOL_TEXTURES[BLOCK.IRON_INGOT] = TextureGenerator.generateToolTexture(
      TOOL_DEFS.IRON_INGOT.pattern,
      TOOL_DEFS.IRON_INGOT.color,
    );

    TOOL_TEXTURES[BLOCK.RAW_MEAT] = TextureGenerator.generateToolTexture(
      TOOL_DEFS.RAW_MEAT.pattern,
      TOOL_DEFS.RAW_MEAT.color,
    );

    TOOL_TEXTURES[BLOCK.COOKED_MEAT] = TextureGenerator.generateToolTexture(
      TOOL_DEFS.COOKED_MEAT.pattern,
      TOOL_DEFS.COOKED_MEAT.color,
    );

    // Generate block icons from registry (автоматически для всех блоков с текстурами)
    const allBlocks = BlockRegistry.getAll();
    for (const block of allBlocks) {
      if (block.textures?.top) {
        TOOL_TEXTURES[block.numericId] = TextureGenerator.generateBlockIcon(
          block.textures.top.pattern,
          block.textures.top.colors,
        );
        console.log(`Generated icon for block "${block.id}" (${block.numericId})`);
      }
    }

    console.log("Tool textures generated.");
  } catch (e) {
    console.error("Failed to generate tool textures:", e);
  }
}
