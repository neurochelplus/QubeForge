/**
 * Типы для системы крафтинга
 */

export interface RecipeIngredient {
  id: number;
  count: number;
}

export interface CraftingRecipe {
  result: number;
  count: number;
  ingredients?: RecipeIngredient[];
  pattern?: (number | null)[][];
}

export interface SmeltingRecipe {
  input: number;
  output: number;
  count: number;
}

export interface FuelItem {
  id: number;
  burnTime: number;
}
