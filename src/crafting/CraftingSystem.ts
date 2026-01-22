import { RECIPES } from "./Recipes";

import type { InventorySlot } from "../inventory/Inventory";

export type CraftingSlot = InventorySlot;

export class CraftingSystem {
  public craftingSlots: CraftingSlot[];
  public craftingResult: CraftingSlot;
  public isCraftingTable: boolean = false;

  constructor() {
    this.craftingSlots = Array.from({ length: 9 }, () => ({ id: 0, count: 0 }));
    this.craftingResult = { id: 0, count: 0 };
  }

  public setCraftingTable(isTable: boolean) {
    this.isCraftingTable = isTable;
    // Clear slots if switching down? Or keep?
    // Usually in MC, items drop if you close, but here we might just keep them for now or logic handles return.
    // Logic in main.ts returns items on close.
  }

  public checkRecipes() {
    // Convert current grid to a standardized "shape"
    // 1. Find bounds
    const size = this.isCraftingTable ? 3 : 2;
    let minX = size,
      minY = size,
      maxX = -1,
      maxY = -1;

    // Check if empty
    let isEmpty = true;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const index = y * size + x;
        if (this.craftingSlots[index].id !== 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          isEmpty = false;
        }
      }
    }

    if (isEmpty) {
      this.craftingResult.id = 0;
      this.craftingResult.count = 0;
      return;
    }

    // 2. Extract relative pattern
    const patternWidth = maxX - minX + 1;
    const patternHeight = maxY - minY + 1;

    // Match against recipes
    for (const recipe of RECIPES) {
      // A. Shapeless (Simple ingredient count check)
      if (recipe.ingredients) {
        // Check if grid has exactly these ingredients
        // Copy ingredients to temp map
        const needed = [...recipe.ingredients];
        let match = true;

        // Count total items in grid
        // let gridItemCount = 0;
        // for (let i = 0; i < size * size; i++)
        //   if (this.craftingSlots[i].id !== 0) gridItemCount++;

        // For each item in grid, try to find in needed list
        for (let i = 0; i < size * size; i++) {
          const slot = this.craftingSlots[i];
          if (slot.id === 0) continue;

          const foundIdx = needed.findIndex(
            (n) => n.id === slot.id && n.count > 0,
          );

          if (foundIdx !== -1) {
            needed.splice(foundIdx, 1); // Remove one instance
          } else {
            match = false;
            break;
          }
        }

        if (match && needed.length === 0) {
          this.craftingResult.id = recipe.result.id;
          this.craftingResult.count = recipe.result.count;
          return;
        }
      }

      // B. Shaped
      if (recipe.pattern && recipe.keys) {
        if (
          recipe.pattern[0].length !== patternWidth ||
          recipe.pattern.length !== patternHeight
        ) {
          continue; // Size mismatch
        }

        let match = true;
        for (let y = 0; y < patternHeight; y++) {
          for (let x = 0; x < patternWidth; x++) {
            const rowStr = recipe.pattern[y];
            const keyChar = rowStr[x];
            const expectedId = keyChar === " " ? 0 : recipe.keys[keyChar];

            // Grid pos
            const gx = minX + x;
            const gy = minY + y;
            const gIndex = gy * size + gx;

            if (this.craftingSlots[gIndex].id !== expectedId) {
              match = false;
              break;
            }
          }
          if (!match) break;
        }

        if (match) {
          this.craftingResult.id = recipe.result.id;
          this.craftingResult.count = recipe.result.count;
          return;
        }
      }
    }

    // No match
    this.craftingResult.id = 0;
    this.craftingResult.count = 0;
  }

  public consumeIngredients() {
    const size = this.isCraftingTable ? 3 : 2;
    for (let i = 0; i < size * size; i++) {
      if (this.craftingSlots[i].id !== 0) {
        this.craftingSlots[i].count--;
        if (this.craftingSlots[i].count <= 0) {
          this.craftingSlots[i].id = 0;
          this.craftingSlots[i].count = 0;
        }
      }
    }
    this.checkRecipes();
  }
}
