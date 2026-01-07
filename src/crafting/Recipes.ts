import { BLOCK } from "../world/World";

export interface Recipe {
  result: { id: number; count: number };
  // Pattern: array of rows. Characters map to keys.
  pattern?: string[];
  keys?: Record<string, number>;
  // Shapeless: just list of ingredients
  ingredients?: { id: number; count: number }[];
}

export const RECIPES: Recipe[] = [
  // 1. Planks from Wood (Shapeless)
  {
    result: { id: BLOCK.PLANKS, count: 4 },
    ingredients: [{ id: BLOCK.WOOD, count: 1 }],
  },
  // 2. Sticks from Planks (Shaped 2 vertical)
  {
    result: { id: BLOCK.STICK, count: 4 },
    pattern: ["P", "P"],
    keys: { P: BLOCK.PLANKS },
  },
  // 3. Crafting Table from Planks (2x2)
  {
    result: { id: BLOCK.CRAFTING_TABLE, count: 1 },
    pattern: ["PP", "PP"],
    keys: { P: BLOCK.PLANKS },
  },
  // --- TOOLS (Wooden) ---
  {
    result: { id: BLOCK.WOODEN_PICKAXE, count: 1 },
    pattern: ["PPP", " S ", " S "],
    keys: { P: BLOCK.PLANKS, S: BLOCK.STICK },
  },
  {
    result: { id: BLOCK.WOODEN_AXE, count: 1 },
    pattern: ["PP", "PS", " S"],
    keys: { P: BLOCK.PLANKS, S: BLOCK.STICK },
  },
  {
    result: { id: BLOCK.WOODEN_AXE, count: 1 },
    pattern: ["PP", "SP", "S "],
    keys: { P: BLOCK.PLANKS, S: BLOCK.STICK },
  },
  {
    result: { id: BLOCK.WOODEN_SWORD, count: 1 },
    pattern: ["P", "P", "S"],
    keys: { P: BLOCK.PLANKS, S: BLOCK.STICK },
  },
  {
    result: { id: BLOCK.WOODEN_SHOVEL, count: 1 },
    pattern: ["P", "S", "S"],
    keys: { P: BLOCK.PLANKS, S: BLOCK.STICK },
  },
  // --- TOOLS (Stone) ---
  {
    result: { id: BLOCK.STONE_PICKAXE, count: 1 },
    pattern: ["CCC", " S ", " S "],
    keys: { C: BLOCK.STONE, S: BLOCK.STICK }, // Using Stone (ID 3), Cobblestone usually but we have Stone
  },
  {
    result: { id: BLOCK.STONE_AXE, count: 1 },
    pattern: ["CC", "CS", " S"],
    keys: { C: BLOCK.STONE, S: BLOCK.STICK },
  },
  {
    result: { id: BLOCK.STONE_AXE, count: 1 },
    pattern: ["CC", "SC", "S "],
    keys: { C: BLOCK.STONE, S: BLOCK.STICK },
  },
  {
    result: { id: BLOCK.STONE_SWORD, count: 1 },
    pattern: ["C", "C", "S"],
    keys: { C: BLOCK.STONE, S: BLOCK.STICK },
  },
  {
    result: { id: BLOCK.STONE_SHOVEL, count: 1 },
    pattern: ["C", "S", "S"],
    keys: { C: BLOCK.STONE, S: BLOCK.STICK },
  },
];
