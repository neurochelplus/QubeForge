import { BLOCK } from "../constants/Blocks";

/**
 * Determines if a block should drop and what item it drops
 */
export class BlockDropHandler {
  /**
   * Check if block should drop based on tool used
   * @returns { shouldDrop: boolean, dropId: number }
   */
  static getDropInfo(blockId: number, toolId: number): { shouldDrop: boolean; dropId: number } {
    let shouldDrop = true;
    let dropId = blockId;

    if (blockId === BLOCK.STONE) {
      // Stone: Only drops with Pickaxes
      if (
        toolId !== BLOCK.WOODEN_PICKAXE &&
        toolId !== BLOCK.STONE_PICKAXE &&
        toolId !== BLOCK.IRON_PICKAXE
      ) {
        shouldDrop = false;
      }
    } else if (blockId === BLOCK.IRON_ORE) {
      // Iron Ore: Only drops with Stone Pickaxe (or better)
      if (toolId !== BLOCK.STONE_PICKAXE && toolId !== BLOCK.IRON_PICKAXE) {
        shouldDrop = false;
      }
    } else if (blockId === BLOCK.COAL_ORE) {
      // Coal Ore: Drops with any Pickaxe
      if (
        toolId !== BLOCK.WOODEN_PICKAXE &&
        toolId !== BLOCK.STONE_PICKAXE &&
        toolId !== BLOCK.IRON_PICKAXE
      ) {
        shouldDrop = false;
      } else {
        dropId = BLOCK.COAL; // Drop Coal item instead of ore
      }
    } else if (blockId === BLOCK.FURNACE) {
      if (
        toolId !== BLOCK.WOODEN_PICKAXE &&
        toolId !== BLOCK.STONE_PICKAXE &&
        toolId !== BLOCK.IRON_PICKAXE
      ) {
        shouldDrop = false;
      }
    }

    return { shouldDrop, dropId };
  }
}
