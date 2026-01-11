import { CraftingSystem } from "./CraftingSystem";
import { Inventory } from "../inventory/Inventory";
import { InventoryUI } from "../inventory/InventoryUI";
import { TOOL_TEXTURES } from "../constants/ToolTextures";
import { getBlockColor } from "../utils/BlockColors";
import { RECIPES } from "./Recipes";

export class MobileCraftingList {
  private craftingSystem: CraftingSystem;
  private inventory: Inventory;
  private inventoryUI: InventoryUI;
  private mobileCraftingList: HTMLElement;
  private onUpdate: () => void;

  constructor(
    craftingSystem: CraftingSystem,
    inventory: Inventory,
    inventoryUI: InventoryUI,
    onUpdate: () => void,
  ) {
    this.craftingSystem = craftingSystem;
    this.inventory = inventory;
    this.inventoryUI = inventoryUI;
    this.onUpdate = onUpdate;

    this.mobileCraftingList = document.createElement("div");
    this.mobileCraftingList.id = "mobile-crafting-list";
    document.body.appendChild(this.mobileCraftingList);

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.mobileCraftingList.addEventListener(
      "touchmove",
      (e) => e.stopPropagation(),
      { passive: false },
    );

    this.mobileCraftingList.addEventListener(
      "touchstart",
      (e) => e.stopPropagation(),
      { passive: false },
    );
  }

  public updateVisuals() {
    this.mobileCraftingList.innerHTML = "";
    const invMap = this.getInventoryMap();

    RECIPES.forEach((recipe) => {
      if (!this.shouldShowRecipe(recipe)) return;

      const reqMap = this.getRecipeRequirements(recipe);
      if (!this.canCraftRecipe(reqMap, invMap)) return;

      const btn = this.createRecipeButton(recipe, reqMap);
      this.mobileCraftingList.appendChild(btn);
    });
  }

  private getInventoryMap(): Map<number, number> {
    const map = new Map<number, number>();
    const currentSlots = this.inventory.getSlots();
    currentSlots.forEach((s) => {
      if (s.id !== 0) map.set(s.id, (map.get(s.id) || 0) + s.count);
    });
    return map;
  }

  private shouldShowRecipe(recipe: any): boolean {
    if (this.craftingSystem.isCraftingTable) return true;

    let needs3x3 = false;
    if (recipe.pattern) {
      if (recipe.pattern.length > 2 || recipe.pattern[0].length > 2) {
        needs3x3 = true;
      }
    } else if (recipe.ingredients) {
      let totalIngredients = 0;
      recipe.ingredients.forEach((i: any) => (totalIngredients += i.count));
      if (totalIngredients > 4) needs3x3 = true;
    }

    return !needs3x3;
  }

  private getRecipeRequirements(recipe: any): Map<number, number> {
    const reqMap = new Map<number, number>();

    if (recipe.ingredients) {
      recipe.ingredients.forEach((i: any) =>
        reqMap.set(i.id, (reqMap.get(i.id) || 0) + i.count),
      );
    } else if (recipe.pattern && recipe.keys) {
      for (const row of recipe.pattern) {
        for (const char of row) {
          if (char !== " ") {
            const id = recipe.keys[char];
            reqMap.set(id, (reqMap.get(id) || 0) + 1);
          }
        }
      }
    }

    return reqMap;
  }

  private canCraftRecipe(
    reqMap: Map<number, number>,
    invMap: Map<number, number>,
  ): boolean {
    for (const [reqId, reqCount] of reqMap) {
      const has = invMap.get(reqId) || 0;
      if (has < reqCount) return false;
    }
    return true;
  }

  private createRecipeButton(
    recipe: any,
    reqMap: Map<number, number>,
  ): HTMLElement {
    const btn = document.createElement("div");
    btn.className = "craft-btn";

    const ingContainer = this.createIngredientsContainer(reqMap);
    btn.appendChild(ingContainer);

    const arrow = document.createElement("div");
    arrow.className = "craft-arrow";
    arrow.innerText = "→";
    btn.appendChild(arrow);

    const resultIcon = this.createResultIcon(recipe);
    btn.appendChild(resultIcon);

    btn.onclick = () => this.handleCraft(recipe, reqMap);

    return btn;
  }

  private createIngredientsContainer(
    reqMap: Map<number, number>,
  ): HTMLElement {
    const container = document.createElement("div");
    container.className = "craft-ingredients";

    let ingCount = 0;
    for (const [reqId] of reqMap) {
      if (ingCount >= 3) break;

      const ingIcon = document.createElement("div");
      ingIcon.className = "block-icon";
      this.applyIconStyle(ingIcon, reqId);
      container.appendChild(ingIcon);
      ingCount++;
    }

    return container;
  }

  private createResultIcon(recipe: any): HTMLElement {
    const icon = document.createElement("div");
    icon.className = "block-icon";
    this.applyIconStyle(icon, recipe.result.id);

    if (recipe.result.count > 1) {
      const countDiv = document.createElement("div");
      countDiv.className = "slot-count";
      countDiv.innerText = recipe.result.count.toString();
      icon.appendChild(countDiv);
    }

    return icon;
  }

  private applyIconStyle(icon: HTMLElement, itemId: number) {
    if (TOOL_TEXTURES[itemId]) {
      icon.classList.add("item-tool");
      icon.style.backgroundImage = `url(${TOOL_TEXTURES[itemId].dataUrl})`;
    } else if (itemId === 7) {
      icon.classList.add("item-planks");
      icon.style.backgroundColor = getBlockColor(itemId);
    } else if (itemId === 9) {
      icon.style.backgroundColor = getBlockColor(itemId);
    } else {
      icon.style.backgroundColor = getBlockColor(itemId);
      icon.style.backgroundImage = "var(--noise-url)";
    }
  }

  private handleCraft(recipe: any, reqMap: Map<number, number>) {
    const currentInvMap = this.getInventoryMap();
    if (!this.canCraftRecipe(reqMap, currentInvMap)) return;

    for (const [reqId, reqCount] of reqMap) {
      this.inventory.removeItem(reqId, reqCount);
    }

    this.inventory.addItem(recipe.result.id, recipe.result.count);
    this.inventoryUI.refresh();
    this.onUpdate();

    if (this.inventoryUI.onInventoryChange) {
      this.inventoryUI.onInventoryChange();
    }
  }

  public setVisible(visible: boolean) {
    this.mobileCraftingList.style.display = visible ? "flex" : "none";
  }
}
