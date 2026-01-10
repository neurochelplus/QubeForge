import { BLOCK } from "../constants/Blocks";

// Интерфейс рецепта крафта
export interface Recipe {
  result: { id: number; count: number };
  // Pattern: array of rows. Characters map to keys.
  pattern?: string[];
  keys?: Record<string, number>;
  // Shapeless: just list of ingredients
  ingredients?: { id: number; count: number }[];
}

// Интерфейс рецепта плавки (для печи)
export interface SmeltingRecipe {
  input: number; // ID входного предмета
  output: { id: number; count: number }; // Результат плавки
  cookTime: number; // Время приготовления в секундах
}

// Интерфейс топлива для печи
export interface FuelItem {
  id: number; // ID предмета-топлива
  burnTime: number; // Время горения в секундах
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
  // --- TOOLS (Iron) ---
  {
    result: { id: BLOCK.IRON_PICKAXE, count: 1 },
    pattern: ["III", " S ", " S "],
    keys: { I: BLOCK.IRON_INGOT, S: BLOCK.STICK },
  },
  {
    result: { id: BLOCK.IRON_AXE, count: 1 },
    pattern: ["II", "IS", " S"],
    keys: { I: BLOCK.IRON_INGOT, S: BLOCK.STICK },
  },
  {
    result: { id: BLOCK.IRON_AXE, count: 1 },
    pattern: ["II", "SI", "S "],
    keys: { I: BLOCK.IRON_INGOT, S: BLOCK.STICK },
  },
  {
    result: { id: BLOCK.IRON_SWORD, count: 1 },
    pattern: ["I", "I", "S"],
    keys: { I: BLOCK.IRON_INGOT, S: BLOCK.STICK },
  },
  {
    result: { id: BLOCK.IRON_SHOVEL, count: 1 },
    pattern: ["I", "S", "S"],
    keys: { I: BLOCK.IRON_INGOT, S: BLOCK.STICK },
  },
  // --- RESOURCES ---
  {
    result: { id: BLOCK.FURNACE, count: 1 },
    pattern: ["CCC", "C C", "CCC"],
    keys: { C: BLOCK.STONE },
  },
];

// ============================================
// РЕЦЕПТЫ ПЛАВКИ (ПЕЧЬ)
// ============================================
// Определяют, какие предметы можно переплавить в печи
// и что из них получается
export const SMELTING_RECIPES: SmeltingRecipe[] = [
  {
    input: BLOCK.IRON_ORE, // Железная руда
    output: { id: BLOCK.IRON_INGOT, count: 1 }, // → Железный слиток
    cookTime: 10, // 10 секунд на переплавку
  },
  {
    input: BLOCK.RAW_MEAT, // Сырое мясо
    output: { id: BLOCK.COOKED_MEAT, count: 1 }, // → Жареное мясо
    cookTime: 10, // 10 секунд на приготовление
  },
];

// ============================================
// ТОПЛИВО ДЛЯ ПЕЧИ
// ============================================
// Определяет, какие предметы можно использовать как топливо
// и как долго они горят
export const FUEL_ITEMS: FuelItem[] = [
  { id: BLOCK.COAL, burnTime: 80 }, // Уголь - самое эффективное топливо
  { id: BLOCK.WOOD, burnTime: 15 }, // Дерево
  { id: BLOCK.PLANKS, burnTime: 15 }, // Доски
  { id: BLOCK.STICK, burnTime: 5 }, // Палка - слабое топливо
  { id: BLOCK.CRAFTING_TABLE, burnTime: 15 }, // Верстак (можно сжечь)
];
